import {
  type ExpressionSpecification, Map as MapaLibre, NavigationControl, ScaleControl, setWorkerUrl,
} from "maplibre-gl";
import urlWorker from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { corPara, graus, inteiro } from "./escalas";
import { ORDEM_REFUGIOS, TIPOS_REFUGIO } from "./Refugios";
import type { Camada, Celula, Dados, Refugio, Selecao, TipoRefugio } from "./tipos";

setWorkerUrl(urlWorker);

// Mapa de fundo vetorial aberto (OpenFreeMap, sem chave): ruas e nomes para cada um se orientar.
const ESTILO = "https://tiles.openfreemap.org/styles/positron";
const MARGENS = { top: 40, right: 40, bottom: 40, left: 40 };

export type Caixa = [number, number, number, number];
export interface Enquadrar { caixa: Caixa; n: number }

interface Props {
  dados: Dados;
  camada: Camada;
  detalhe: boolean;
  selecionada: number | null;
  selecao: Selecao | null;
  fregFoco: string | null;
  enquadrar: Enquadrar | null;
  /** Com a história aberta, o cartão tapa a esquerda do mapa: enquadrar à direita dele. */
  historia: boolean;
  aoClicar: (id: number | null) => void;
  aoPassar: (id: number | null) => void;
  /** Tipos de refúgio visíveis. */
  refugios: Set<TipoRefugio>;
}

interface Dica { x: number; y: number; c?: Celula; r?: Refugio }

// Refúgios: áreas (jardins, água, propostas) e pontos; cores e nomes em Refugios.tsx
const AREAS = ORDEM_REFUGIOS.filter((t) => TIPOS_REFUGIO[t].area);
const PONTOS = ORDEM_REFUGIOS.filter((t) => !TIPOS_REFUGIO[t].area);
const PROPOSTAS: TipoRefugio[] = ["proposta_refugio", "proposta_arvores"];
const corRefugio = ["match", ["get", "tipo"], ...ORDEM_REFUGIOS.flatMap((t) => [t, TIPOS_REFUGIO[t].cor]), "#555"] as unknown as ExpressionSpecification;
const doTipo = (tipos: TipoRefugio[]): ExpressionSpecification => ["in", ["get", "tipo"], ["literal", tipos]];
const CAMADAS_REF = ["ref-area", "ref-linha", "ref-linha-prop", "ref-pontos"] as const;

export function caixaDe(geom: GeoJSON.Geometry): Caixa {
  const c: Caixa = [180, 90, -180, -90];
  const visitar = (a: unknown): void => {
    if (typeof (a as number[])[0] === "number") {
      const [x, y] = a as number[];
      c[0] = Math.min(c[0], x), c[1] = Math.min(c[1], y), c[2] = Math.max(c[2], x), c[3] = Math.max(c[3], y);
    } else (a as unknown[]).forEach(visitar);
  };
  if ("coordinates" in geom) visitar(geom.coordinates);
  return c;
}

export default function Mapa(p: Props) {
  const contentor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const [pronto, setPronto] = useState(false);
  const [dica, setDica] = useState<Dica | null>(null);
  const cb = useRef(p);
  cb.current = p;
  const dentroAnterior = useRef<Set<number>>(new Set());

  useEffect(() => {
    const { dados } = cb.current;
    const m = new MapaLibre({
      container: contentor.current!,
      style: ESTILO,
      bounds: caixaDe(dados.concelho.features[0].geometry),
      fitBoundsOptions: { padding: MARGENS },
      minZoom: 11,
      maxZoom: 18,
      attributionControl: {
        compact: true,
        customAttribution: "Landsat 8/9 (USGS), Sentinel-2 (ESA), CAOP 2025 (DGT) · Refúgios e OpenFreeMap © OpenStreetMap",
      },
    });
    m.addControl(new NavigationControl({ showCompass: false }), "top-right");
    m.addControl(new ScaleControl({ unit: "metric" }), "bottom-right");
    m.on("load", () => {
      // As camadas de dados ficam por baixo dos nomes das ruas do mapa de fundo
      const antes = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
      const { resumo } = dados;
      for (const nome of ["lst", "ndvi"] as const) {
        m.addSource(`img-${nome}`, {
          type: "image", url: new URL(`../dados/${nome}.png`, location.href).href, coordinates: resumo.imagens[nome] as never,
        });
        m.addLayer({
          id: `img-${nome}`, type: "raster", source: `img-${nome}`, layout: { visibility: "none" },
          paint: { "raster-opacity": 0.8, "raster-resampling": "nearest", "raster-fade-duration": 0 },
        }, antes);
      }
      m.addSource("celulas", { type: "geojson", data: dados.celulas, promoteId: "id" });
      m.addSource("freguesias", { type: "geojson", data: dados.freguesias, promoteId: "dtmnfr" });
      m.addSource("concelho", { type: "geojson", data: dados.concelho });
      m.addLayer({ id: "cel", type: "fill", source: "celulas", paint: { "fill-color": corPara("calor") } }, antes);
      m.addLayer({
        id: "cel-realce", type: "line", source: "celulas",
        paint: {
          "line-color": "#0b0b0b", "line-width": 1,
          "line-opacity": ["case", ["boolean", ["feature-state", "dentro"], false], 0.55, 0],
        },
      }, antes);
      m.addLayer({
        id: "cel-hover", type: "line", source: "celulas",
        paint: {
          "line-color": "#0b0b0b", "line-width": 1.5,
          "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0],
        },
      });
      // Quadrados prioritários para refúgios (quartil de cima): contorno só com a camada "prioridade"
      m.addLayer({
        id: "cel-prio", type: "line", source: "celulas", filter: ["==", ["get", "prio"], 1],
        layout: { visibility: "none" }, paint: { "line-color": "#1a0620", "line-width": 0.8, "line-opacity": 0.7 },
      }, antes);
      // Pontos quentes (décimo mais quente, com ou sem residentes): contorno laranja (a escala da prioridade é roxa),
      // só com a camada "prioridade"
      m.addLayer({
        id: "cel-pq", type: "line", source: "celulas", filter: ["has", "pq"],
        layout: { visibility: "none" }, paint: { "line-color": "#ff8f00", "line-width": 1.8 },
      }, antes);
      m.addLayer({ id: "freg-linha", type: "line", source: "freguesias", paint: { "line-color": "#3d3c39", "line-width": 1.2 } });
      m.addLayer({
        id: "freg-foco", type: "line", source: "freguesias", filter: ["==", ["get", "dtmnfr"], ""],
        paint: { "line-color": "#0b0b0b", "line-width": 3 },
      });
      m.addLayer({ id: "conc-linha", type: "line", source: "concelho", paint: { "line-color": "#0b0b0b", "line-width": 2 } });
      m.addLayer({
        id: "cel-sel", type: "line", source: "celulas", filter: ["==", ["get", "id"], -1],
        paint: { "line-color": "#0b0b0b", "line-width": 3.5 },
      });
      m.addSource("refugios", { type: "geojson", data: dados.refugios });
      m.addLayer({
        id: "ref-area", type: "fill", source: "refugios", filter: doTipo(AREAS),
        paint: {
          "fill-color": corRefugio,
          "fill-opacity": ["match", ["get", "tipo"], "jardim", 0.5, "agua", 0.65, 0.12],
        },
      });
      m.addLayer({
        id: "ref-linha", type: "line", source: "refugios", filter: doTipo(AREAS.filter((t) => !PROPOSTAS.includes(t))),
        paint: { "line-color": corRefugio, "line-width": 1 },
      });
      m.addLayer({
        id: "ref-linha-prop", type: "line", source: "refugios", filter: doTipo(PROPOSTAS),
        paint: { "line-color": corRefugio, "line-width": 2.2, "line-dasharray": [2, 1.2] },
      });
      m.addLayer({
        id: "ref-pontos", type: "circle", source: "refugios", filter: doTipo(PONTOS),
        paint: {
          "circle-color": corRefugio,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3.5, 14, 5.5, 17, 8],
          "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5,
        },
      });
      m.addLayer({
        id: "freg-nomes", type: "symbol", source: "freguesias",
        layout: {
          "text-field": ["get", "freguesia"], "text-font": ["Noto Sans Bold"], "text-size": 13,
          "symbol-placement": "point", "text-max-width": 8,
        },
        paint: { "text-color": "#0b0b0b", "text-halo-color": "rgba(255,255,255,0.9)", "text-halo-width": 2 },
      });

      let hover: number | null = null;
      const limparHover = () => {
        if (hover !== null) m.setFeatureState({ source: "celulas", id: hover }, { hover: false });
        hover = null;
      };
      // Refúgio por baixo do rato: primeiro os pontos (com 4 px de folga), depois as propostas, a água e os jardins
      const refugioEm = (pt: { x: number; y: number }): Refugio | null => {
        const visiveis = CAMADAS_REF.filter((c) => m.getLayer(c));
        const pontos = m.queryRenderedFeatures([[pt.x - 4, pt.y - 4], [pt.x + 4, pt.y + 4]], { layers: ["ref-pontos"] });
        if (pontos.length) return pontos[0].properties as Refugio;
        const areas = m.queryRenderedFeatures([pt.x, pt.y], { layers: visiveis.filter((c) => c === "ref-area") });
        const ordem = (r: Refugio) => (PROPOSTAS.includes(r.tipo) ? 0 : r.tipo === "agua" ? 1 : 2);
        const rs = areas.map((a) => a.properties as Refugio).sort((a, b) => ordem(a) - ordem(b));
        return rs[0] ?? null;
      };
      for (const camada of ["ref-pontos", "ref-area"]) {
        m.on("mousemove", camada, (e) => {
          const r = refugioEm(e.point);
          if (!r) return;
          m.getCanvas().style.cursor = "help";
          setDica({ x: e.point.x, y: e.point.y, r });
        });
        m.on("mouseleave", camada, () => {
          m.getCanvas().style.cursor = "";
          setDica((d) => (d?.r ? null : d));
        });
      }
      m.on("mousemove", "cel", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        if (refugioEm(e.point)) return;  // o refúgio tem prioridade (ver acima)
        const id = f.id as number;
        if (id !== hover) {
          limparHover();
          hover = id;
          m.setFeatureState({ source: "celulas", id }, { hover: true });
          cb.current.aoPassar(id);
        }
        m.getCanvas().style.cursor = "pointer";
        setDica({ x: e.point.x, y: e.point.y, c: cb.current.dados.porId[id] });
      });
      m.on("mouseleave", "cel", () => {
        limparHover();
        setDica((d) => (d?.r ? d : null));  // fora do concelho pode estar por cima de um refúgio: essa dica fica
        if (!m.getCanvas().style.cursor.startsWith("help")) m.getCanvas().style.cursor = "";
        cb.current.aoPassar(null);
      });
      m.on("click", (e) => {
        const f = m.queryRenderedFeatures(e.point, { layers: ["cel"] })[0];
        cb.current.aoClicar(f ? (f.id as number) : null);
      });
      setPronto(true);
    });
    mapa.current = m;
    return () => m.remove();
  }, []);

  // Camada, detalhe e seleção
  useEffect(() => {
    const m = mapa.current;
    if (!pronto || !m) return;
    const { camada, detalhe, selecao } = p;
    const imagem = camada === "calor" ? "img-lst" : camada === "verde" ? "img-ndvi" : null;
    m.setLayoutProperty("img-lst", "visibility", detalhe && imagem === "img-lst" ? "visible" : "none");
    m.setLayoutProperty("img-ndvi", "visibility", detalhe && imagem === "img-ndvi" ? "visible" : "none");
    m.setPaintProperty("cel", "fill-color", corPara(camada));
    m.setLayoutProperty("cel-prio", "visibility", camada === "prioridade" ? "visible" : "none");
    m.setLayoutProperty("cel-pq", "visibility", camada === "prioridade" ? "visible" : "none");
    const base = detalhe && imagem ? 0 : 0.78;
    const opacidade: ExpressionSpecification | number = selecao
      ? ["case", ["boolean", ["feature-state", "dentro"], false], Math.max(base, detalhe && imagem ? 0 : 0.9), detalhe && imagem ? 0 : 0.12]
      : base;
    m.setPaintProperty("cel", "fill-opacity", opacidade);

    const novo = selecao?.ids ?? new Set<number>();
    for (const id of dentroAnterior.current) if (!novo.has(id)) m.setFeatureState({ source: "celulas", id }, { dentro: false });
    for (const id of novo) if (!dentroAnterior.current.has(id)) m.setFeatureState({ source: "celulas", id }, { dentro: true });
    dentroAnterior.current = new Set(novo);
  }, [pronto, p.camada, p.detalhe, p.selecao]);

  useEffect(() => {
    if (!pronto) return;
    mapa.current!.setFilter("cel-sel", ["==", ["get", "id"], p.selecionada ?? -1]);
  }, [pronto, p.selecionada]);

  // Refúgios visíveis
  useEffect(() => {
    const m = mapa.current;
    if (!pronto || !m) return;
    const so = (tipos: TipoRefugio[]) => doTipo(tipos.filter((t) => p.refugios.has(t)));
    m.setFilter("ref-area", so(AREAS));
    m.setFilter("ref-linha", so(AREAS.filter((t) => !PROPOSTAS.includes(t))));
    m.setFilter("ref-linha-prop", so(PROPOSTAS));
    m.setFilter("ref-pontos", so(PONTOS));
  }, [pronto, p.refugios]);

  useEffect(() => {
    if (!pronto) return;
    mapa.current!.setFilter("freg-foco", ["==", ["get", "dtmnfr"], p.fregFoco ?? ""]);
  }, [pronto, p.fregFoco]);

  useEffect(() => {
    if (!pronto || !p.enquadrar) return;
    const m = mapa.current!;
    const largo = m.getContainer().clientWidth > 760;
    const padding = p.historia && largo ? { ...MARGENS, left: 420 } : MARGENS;
    m.fitBounds(p.enquadrar.caixa, { padding, duration: 900, maxZoom: 16 });
  }, [pronto, p.enquadrar]);

  return (
    <div className="mapa">
      <div ref={contentor} className="mapa-tela" />
      {dica?.r && <DicaRefugio d={dica} r={dica.r} />}
      {dica?.c && !dica.r && <DicaCelula d={dica} c={dica.c} nome={p.dados.nomeFreguesia[dica.c.freg]} />}
    </div>
  );
}

function DicaRefugio({ d, r }: { d: Dica; r: Refugio }) {
  const t = TIPOS_REFUGIO[r.tipo];
  return (
    <div className="dica" style={{ left: d.x + 14, top: d.y + 14 }}>
      <strong>{r.nome ?? `${t.um} (sem nome no OSM)`}</strong>
      <div className="mudo">{t.nome}</div>
      {r.nota && <div>{r.nota}</div>}
    </div>
  );
}

function DicaCelula({ d, c, nome }: { d: Dica; c: Celula; nome: string }) {
  return (
    <div className="dica" style={{ left: d.x + 14, top: d.y + 14 }}>
      <strong>{graus(c.an)}</strong> <span className="mudo">face ao típico da Amadora</span>
      <div>{inteiro(c.verde)} % de verde · {c.cos}</div>
      <div className="mudo">{nome} · clique para ver a ficha</div>
    </div>
  );
}
