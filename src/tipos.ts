import type { Feature, FeatureCollection, Geometry } from "geojson";

/** Uma célula de 90 m (ver analise/exportar_web.py). */
export interface Celula {
  id: number;
  /** Anomalia da temperatura da superfície, °C face à mediana do concelho no mesmo dia. */
  an: number;
  /** Temperatura média da superfície no verão (~12 h), °C. */
  lst: number;
  /** Área com vegetação que se mantém verde no verão (NDVI > 0,4), %. */
  verde: number;
  ndvi: number;
  /** Distância ao espaço verde ≥ 1 ha mais próximo, m. */
  dist: number;
  cos: string;
  freg: string;
  /** Percentil de calor no concelho (100 = a mais quente). */
  pct: number;
  /** Prioridade para refúgios climáticos (analise/prioridade.py): pontuação 0–100 e 1 = quartil de cima. */
  pri?: number;
  prio?: number;
  /** Distância a pé ao jardim ≥ 0,5 ha e à biblioteca mais próximos, m; residentes (Censos 2021). */
  dj?: number;
  db?: number;
  res?: number;
  /** Letra do ponto quente (analise/prioridade.py) a que o quadrado pertence, se pertencer. */
  pq?: string;
}

export type Camada = "calor" | "verde" | "dist" | "prioridade";
export type Separador = "zona" | "freguesias" | "relacao" | "metodo";

export interface LinhaClasse { mean: number; count: number; verde?: string; dist_verde?: string }

export interface Freguesia {
  dtmnfr: string;
  freguesia: string;
  lst_media_c: number;
  anomalia_c: number;
  verde_pct: number;
  celulas_quentes_pct: number;
  celulas: number;
}

export interface Resumo {
  celulas: number;
  regressao: { declive_por_pct: number; ordenada: number; r: number };
  limiar_quente: number;
  por_fracao_verde: LinhaClasse[];
  arrefecimento: LinhaClasse[];
  freguesias: Freguesia[];
  cos: { cos: string; anomalia_c: number; verde_pct: number; celulas: number }[];
  lst_mediana_c: number;
  imagens: { lst: [number, number][]; ndvi: [number, number][] };
  cenas: number;
  prioridade?: {
    pesos: Record<string, number>;
    limiar_prioritario: number;
    residentes_em_prioritarias_pct: number;
    pesos_iguais_mesmas_prioritarias_pct: number;
    zonas: { n: number; lugar: string; freguesia: string; residentes: number }[];
    /** Pontos quentes: grupos de quadrados no décimo mais quente, com ou sem residentes (letras A, B, …). */
    pontos_quentes?: { letra: string; lugar: string; freguesia: string; calor_c: number; residentes: number; uso: string }[];
  };
}

/** Refúgios climáticos (ver analise/exportar_web.py, refugios()): os que existem (OSM), os interiores confirmados
 *  no terreno e as propostas do estudo. */
export type TipoRefugio =
  | "jardim" | "biblioteca" | "bebedouro" | "fonte" | "agua" | "piscina" | "interior"
  | "proposta_refugio" | "proposta_arvores";
export interface Refugio { tipo: TipoRefugio; nome: string | null; nota: string | null }

export interface Dados {
  celulas: FeatureCollection<Geometry, Celula>;
  refugios: FeatureCollection<Geometry, Refugio>;
  porId: Celula[];
  freguesias: FeatureCollection<Geometry, { dtmnfr: string; freguesia: string }>;
  concelho: FeatureCollection;
  resumo: Resumo;
  nomeFreguesia: Record<string, string>;
}

/** Seleção feita no gráfico ou num atalho: conjunto de ids de células e a descrição. */
export interface Selecao { ids: Set<number>; descricao: string }

export type FeatureCelula = Feature<Geometry, Celula>;
