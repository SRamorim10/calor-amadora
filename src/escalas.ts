import type { ExpressionSpecification } from "maplibre-gl";
import type { Camada } from "./tipos";

// Mesmas cores que analise/exportar_web.py usa nas imagens.
// Divergente azul ↔ vermelho com ponto médio cinzento (0 °C = mediana do concelho), passos iguais em cada braço.
export const DIVERGENTE = ["#184f95", "#3987e5", "#9ec5f4", "#f0efec", "#f4b4ad", "#e34948", "#9b1c1c"];
export const PARAGENS_CALOR = [-6, -4, -2, 0, 2, 4, 6];
// Sequencial de um só tom (verde), claro → escuro.
export const VERDES = ["#f0efec", "#cfe8c4", "#9fd08f", "#5fae55", "#2b8a2e", "#0f5e17"];
export const PARAGENS_VERDE = [0, 5, 15, 30, 50, 80];
// Distância ao verde: sequencial azul (perto = claro, longe = escuro).
export const AZUIS = ["#f0efec", "#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"];
export const PARAGENS_DIST = [0, 100, 200, 300, 500, 1000];
// Prioridade para refúgios: sequencial roxo (distinto do calor e do verde); 49 ≈ início do quartil de cima.
export const ROXOS = ["#f0efec", "#e3cde6", "#c79ccf", "#a0619f", "#6f2a7a", "#3d0b4a"];
export const PARAGENS_PRI = [20, 33, 40, 45, 49, 60];

export const CAMADAS: Record<Camada, {
  nome: string; curto: string; campo: string; cores: string[]; paragens: number[]; unidade: string; explica: string;
}> = {
  calor: {
    nome: "Calor da superfície", curto: "Calor", campo: "an", cores: DIVERGENTE, paragens: PARAGENS_CALOR,
    unidade: "°C", explica: "Quanto o chão e os telhados aquecem ao meio-dia de verão, acima (vermelho) ou abaixo (azul) " +
      "do valor típico da Amadora. Satélite Landsat, 22 dias de verão 2023–2025.",
  },
  verde: {
    nome: "Vegetação no verão", curto: "Verde", campo: "verde", cores: VERDES, paragens: PARAGENS_VERDE, unidade: "%",
    explica: "Parte de cada quadrado de 90 m com vegetação que se mantém verde no verão (árvores, mato, relva regada). " +
      "Relva seca não conta. Satélite Sentinel-2, 2023–2025.",
  },
  dist: {
    nome: "Distância ao espaço verde", curto: "Distância ao verde", campo: "dist", cores: AZUIS, paragens: PARAGENS_DIST,
    unidade: "m", explica: "Distância até ao espaço verde mais próximo com pelo menos 1 hectare (um campo de futebol e meio).",
  },
  prioridade: {
    nome: "Prioridade para refúgios", curto: "Prioridade", campo: "pri", cores: ROXOS, paragens: PARAGENS_PRI,
    unidade: "", explica: "Onde é mais urgente criar um refúgio climático, como no estudo de Lisboa de Manuel Banza (2023): " +
      "calor da superfície 30 %, distância a pé a um jardim ≥ 0,5 ha 25 %, residentes (Censos 2021) 20 %, falta de vegetação " +
      "15 % e distância a pé a uma biblioteca 10 %. Pontuação de 0 a 100; o quartil de cima (≥ 49) é prioritário.",
  },
};

export function corPara(camada: Camada): ExpressionSpecification {
  const c = CAMADAS[camada];
  const e: unknown[] = ["interpolate", ["linear"], ["get", c.campo]];
  c.paragens.forEach((p, i) => e.push(p, c.cores[i]));
  return e as ExpressionSpecification;
}

/** Cor de um valor (para legendas e gráficos fora do mapa). */
export function corDe(camada: Camada, v: number): string {
  const { paragens, cores } = CAMADAS[camada];
  if (v <= paragens[0]) return cores[0];
  for (let i = 1; i < paragens.length; i++) {
    if (v <= paragens[i]) {
      const t = (v - paragens[i - 1]) / (paragens[i] - paragens[i - 1]);
      return misturar(cores[i - 1], cores[i], t);
    }
  }
  return cores[cores.length - 1];
}

function misturar(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
}

const fmt1 = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const fmt0 = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 });
export const graus = (v: number, sinal = true) => `${sinal && v > 0 ? "+" : v < 0 ? "−" : ""}${fmt1.format(Math.abs(v))} °C`;
export const inteiro = (v: number) => fmt0.format(v);
export const decimal = (v: number) => fmt1.format(v);
