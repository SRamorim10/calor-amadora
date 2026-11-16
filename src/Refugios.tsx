import { useState } from "react";
import type { Dados, TipoRefugio } from "./tipos";

/** Camadas de refúgios climáticos, como no mapa de refúgios locais de Lisboa (Manuel Banza, 2023): o que já existe
 *  (OSM), os interiores confirmados no terreno e as propostas deste estudo. As cores evitam o vermelho e o azul
 *  claro da escala do calor; os pontos têm contorno branco para se lerem por cima das células. */
export const TIPOS_REFUGIO: Record<TipoRefugio, { nome: string; um: string; cor: string; area: boolean; explica: string }> = {
  jardim: { um: "Jardim ou parque", nome: "Jardins e parques", cor: "#2e7d32", area: true,
    explica: "Jardins e parques públicos do OpenStreetMap (≥ 500 m²). Sombra e verde; nem todos têm bancos ou água." },
  agua: { um: "Lago", nome: "Lagos e espelhos de água", cor: "#1565c0", area: true, explica: "Água à superfície (OpenStreetMap)." },
  biblioteca: { um: "Biblioteca", nome: "Bibliotecas", cor: "#6a1b9a", area: false,
    explica: "Bibliotecas do OpenStreetMap. Ar condicionado e horário por confirmar em cada uma." },
  interior: { um: "Refúgio interior", nome: "Interiores confirmados", cor: "#ad1457", area: false,
    explica: "Confirmados no terreno (novembro de 2026): ar condicionado, água gratuita e entrada livre." },
  bebedouro: { um: "Bebedouro", nome: "Bebedouros", cor: "#0277bd", area: false,
    explica: "Bebedouros do OpenStreetMap. O mapa pode ter falhas: os que não estão mapeados não aparecem." },
  fonte: { um: "Fonte", nome: "Fontes", cor: "#00838f", area: false,
    explica: "Fontes do OpenStreetMap. Refrescam o ar à volta; a água não é para beber." },
  piscina: { um: "Piscina", nome: "Piscinas", cor: "#78909c", area: false,
    explica: "Piscinas do OpenStreetMap. Têm água mas o ar das cobertas é quente e húmido e a entrada é paga: não contam como refúgio." },
  proposta_refugio: { um: "Refúgio proposto", nome: "Refúgios propostos", cor: "#e65100", area: true,
    explica: "Refúgios climáticos propostos neste estudo: árvores, zona de estar à sombra e água." },
  proposta_arvores: { um: "Árvores propostas", nome: "Árvores propostas", cor: "#f57c00", area: true,
    explica: "Ruas, praças, parques de estacionamento e jardins onde o estudo propõe árvores (sombra no caminho)." },
};

export const ORDEM_REFUGIOS = Object.keys(TIPOS_REFUGIO) as TipoRefugio[];
export const REFUGIOS_INICIAIS = new Set<TipoRefugio>(ORDEM_REFUGIOS.filter((t) => t !== "piscina"));

interface Props {
  dados: Dados;
  ver: Set<TipoRefugio>;
  aoMudar: (v: Set<TipoRefugio>) => void;
}

export function CamadasRefugios({ dados, ver, aoMudar, fechado = false }: Props & { fechado?: boolean }) {
  // No telemóvel (e quando pedido, ex.: mapa embutido no artigo) começa fechado: aberto, tapa muito do mapa
  const [aberto] = useState(() => !fechado && (typeof window === "undefined" || window.innerWidth > 860));
  const n: Partial<Record<TipoRefugio, number>> = {};
  for (const f of dados.refugios.features) n[f.properties.tipo] = (n[f.properties.tipo] ?? 0) + 1;
  const tipos = ORDEM_REFUGIOS.filter((t) => n[t]);
  const alternar = (t: TipoRefugio) => {
    const novo = new Set(ver);
    if (novo.has(t)) novo.delete(t); else novo.add(t);
    aoMudar(novo);
  };
  return (
    <details className="refugios" open={aberto}>
      <summary>Refúgios climáticos</summary>
      <ul>
        {tipos.map((t) => {
          const c = TIPOS_REFUGIO[t];
          return (
            <li key={t}>
              <label title={c.explica}>
                <input type="checkbox" checked={ver.has(t)} onChange={() => alternar(t)} />
                <span className={c.area ? "amostra area" : "amostra"}
                  style={{ background: c.area ? `${c.cor}66` : c.cor, borderColor: c.cor }} />
                {c.nome} <span className="mudo">{n[t]}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mudo pequeno">Passe por cima de um refúgio para ver o nome. Fonte: OpenStreetMap e este estudo.</div>
    </details>
  );
}
