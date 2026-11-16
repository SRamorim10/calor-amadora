import { useCallback, useEffect, useMemo, useState } from "react";
import { CAMADAS } from "./escalas";
import { Historia, passos } from "./Historia";
import Mapa, { caixaDe, type Enquadrar } from "./Mapa";
import { Ficha, Freguesias, Legenda, Metodo, Relacao } from "./Painel";
import { CamadasRefugios, REFUGIOS_INICIAIS } from "./Refugios";
import type { Camada, Celula, Dados, Resumo, Selecao, Separador, TipoRefugio } from "./tipos";

const VISTA_HISTORIA = "microclima.historia-vista";

// Endereço: ?camada=prioridade abre nessa camada; &embed=1 é a versão embutida no artigo (só o mapa, sem painel nem
// história, com ligação ao mapa completo)
const PARAMETROS = new URLSearchParams(location.search);
const EMBUTIDO = PARAMETROS.get("embed") === "1";
const CAMADA_INICIAL = ((c) => (c && c in CAMADAS ? c : "calor"))(PARAMETROS.get("camada")) as Camada;

async function carregar(): Promise<Dados> {
  // o mapa está em mapa/ e os dados em dados/, ao lado
  const j = (f: string) => fetch(new URL(`../dados/${f}`, location.href)).then((r) => r.json());
  const [celulas, freguesias, concelho, resumo, refugios] = await Promise.all([
    j("celulas.geojson"), j("freguesias.geojson"), j("concelho.geojson"), j("resumo.json") as Promise<Resumo>,
    // camada opcional: sem o ficheiro, o mapa abre na mesma, sem refúgios
    j("refugios.geojson").catch(() => ({ type: "FeatureCollection", features: [] })),
  ]);
  const porId: Celula[] = [];
  for (const f of celulas.features) porId[f.properties.id] = f.properties;
  const nomeFreguesia = Object.fromEntries(resumo.freguesias.map((f) => [f.dtmnfr, f.freguesia]));
  return { celulas, porId, freguesias, concelho, resumo, nomeFreguesia, refugios };
}

function historiaJaVista() {
  try { return localStorage.getItem(VISTA_HISTORIA) === "1"; } catch { return false; }
}

export default function App() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { carregar().then(setDados, (e) => setErro(String(e))); }, []);
  if (erro) return <div className="aviso-geral">Não foi possível carregar os dados: {erro}</div>;
  if (!dados) return <div className="aviso-geral">A carregar…</div>;
  return <Plataforma dados={dados} />;
}

function Plataforma({ dados }: { dados: Dados }) {
  const [camada, setCamada] = useState<Camada>(CAMADA_INICIAL);
  const [detalhe, setDetalhe] = useState(false);
  const [separador, setSeparador] = useState<Separador>("zona");
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [realce, setRealce] = useState<number | null>(null);
  const [fregFoco, setFregFoco] = useState<string | null>(null);
  const [enquadrar, setEnquadrar] = useState<Enquadrar | null>(null);
  const [passo, setPasso] = useState<number | null>(EMBUTIDO || historiaJaVista() ? null : 0);
  const [verRefugios, setVerRefugios] = useState<Set<TipoRefugio>>(REFUGIOS_INICIAIS);
  const lista = useMemo(() => passos(dados), [dados]);

  const caixaFreguesia = useCallback((cod: string | null) => {
    const f = cod ? dados.freguesias.features.find((x) => x.properties.dtmnfr === cod)! : dados.concelho.features[0];
    return caixaDe(f.geometry);
  }, [dados]);
  const irPara = (cod: string | null) => {
    setFregFoco(cod);
    setEnquadrar({ caixa: caixaFreguesia(cod), n: Date.now() });
  };

  // Cada passo da história define a camada, o enquadramento e o que fica destacado
  useEffect(() => {
    if (passo === null) return;
    const p = lista[passo];
    setCamada(p.camada);
    setSelecionada(null);
    setSelecao(p.filtro ? { ids: new Set(dados.porId.filter(p.filtro).map((c) => c.id)), descricao: p.titulo } : null);
    irPara(p.freguesia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo]);

  const fecharHistoria = () => {
    setPasso(null);
    setSelecao(null);
    setFregFoco(null);
    try { localStorage.setItem(VISTA_HISTORIA, "1"); } catch { /* sem armazenamento: volta a aparecer */ }
  };

  const clicar = (id: number | null) => {
    setSelecionada(id);
    if (id !== null && separador !== "relacao") setSeparador("zona");
  };
  const verQuente = () => {
    const c = dados.porId.reduce((a, b) => (b.an > a.an ? b : a));
    setSelecionada(c.id);
    const [x0, y0, x1, y1] = caixaDe(dados.celulas.features[c.id].geometry);
    const m = 0.006;
    setEnquadrar({ caixa: [x0 - m, y0 - m, x1 + m, y1 + m], n: Date.now() });
  };

  const temImagem = camada === "calor" || camada === "verde";
  const separadores: [Separador, string][] = [
    ["zona", "A sua zona"], ["freguesias", "Freguesias"], ["relacao", "Calor × verde"], ["metodo", "Como foi feito"],
  ];

  return (
    <div className={EMBUTIDO ? "app embutido" : "app"}>
      <header className="topo">
        <div className="marca">
          <h1>Calor na Amadora</h1>
          <span className="mudo">Onde o verão aquece mais e o que o verde muda</span>
        </div>
        <div className="segmentado" role="radiogroup" aria-label="Camada do mapa">
          {(Object.keys(CAMADAS) as Camada[]).map((k) => (
            <button key={k} role="radio" aria-checked={camada === k} className={camada === k ? "ativo" : ""}
              onClick={() => setCamada(k)}>{CAMADAS[k].curto}</button>
          ))}
        </div>
        <label className={`alternar ${temImagem ? "" : "inativo"}`}
          title="Mostra a imagem de satélite com mais pormenor (30 m para o calor, 10 m para a vegetação)">
          <input type="checkbox" checked={detalhe && temImagem} disabled={!temImagem}
            onChange={(e) => setDetalhe(e.target.checked)} />
          Mais pormenor
        </label>
        {EMBUTIDO
          ? <a className="botao secundario" href={`./?camada=${camada}`} target="_blank" rel="noopener">Abrir o mapa completo ↗</a>
          : <button className="botao secundario" onClick={() => setPasso(0)}>Ver a história</button>}
      </header>

      <main className="centro">
        <Mapa dados={dados} camada={camada} detalhe={detalhe && temImagem} selecionada={selecionada} selecao={selecao}
          fregFoco={fregFoco} enquadrar={enquadrar} historia={passo !== null} aoClicar={clicar} aoPassar={setRealce}
          refugios={verRefugios} />
        <Legenda camada={camada} />
        {dados.refugios.features.length > 0 && (
          <CamadasRefugios dados={dados} ver={verRefugios} aoMudar={setVerRefugios}
            fechado={EMBUTIDO && CAMADA_INICIAL !== "dist"} />
        )}
        {passo !== null && <Historia lista={lista} i={passo} aoMudar={setPasso} aoFechar={fecharHistoria} />}
      </main>

      {!EMBUTIDO && <aside className="painel">
        <nav className="separadores" role="tablist">
          {separadores.map(([k, nome]) => (
            <button key={k} role="tab" aria-selected={separador === k} className={separador === k ? "ativo" : ""}
              onClick={() => setSeparador(k)}>{nome}</button>
          ))}
        </nav>
        {separador === "zona" && (
          <Ficha dados={dados} c={selecionada === null ? null : dados.porId[selecionada]} aoVerQuente={verQuente}
            aoFreguesia={(cod) => { irPara(cod); setSeparador("freguesias"); }} />
        )}
        {separador === "freguesias" && (
          <Freguesias dados={dados} foco={fregFoco} aoEscolher={(cod) => irPara(fregFoco === cod ? null : cod)} />
        )}
        {separador === "relacao" && (
          <Relacao dados={dados} selecao={selecao} selecionada={selecionada} realce={realce}
            aoSelecionar={setSelecao} aoClicar={setSelecionada} />
        )}
        {separador === "metodo" && <Metodo dados={dados} />}
      </aside>}
    </div>
  );
}
