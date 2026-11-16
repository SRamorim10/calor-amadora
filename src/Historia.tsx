import { graus, inteiro } from "./escalas";
import type { Camada, Celula, Dados } from "./tipos";

export interface Passo {
  titulo: string;
  texto: string;
  camada: Camada;
  /** Código da freguesia a enquadrar (null = concelho). */
  freguesia: string | null;
  /** Células a destacar no mapa. */
  filtro?: (c: Celula) => boolean;
}

export function passos(d: Dados): Passo[] {
  const r = d.resumo;
  const quente = r.freguesias[0], fresca = r.freguesias[r.freguesias.length - 1];
  const foco = r.freguesias.find((f) => f.dtmnfr === "111514")!;
  return [
    {
      titulo: "No verão, a Amadora não aquece toda por igual",
      texto: `Ao meio-dia de verão o chão e os telhados chegam a ${inteiro(r.lst_mediana_c)} °C no sítio típico da Amadora. ` +
        "A vermelho, as zonas mais quentes do que isso; a azul, as mais frescas. Há mais de 10 °C de diferença entre os extremos.",
      camada: "calor", freguesia: null,
    },
    {
      titulo: "Onde há verde, o chão está mais fresco",
      texto: `Só uma pequena parte do concelho se mantém verde no verão. Cada +10 % de área verde num quadrado ` +
        `corresponde, em média, a ${graus(r.regressao.declive_por_pct * 10)}. Nos quadrados com mais de metade verde, ` +
        `${graus(r.por_fracao_verde[4].mean)}.`,
      camada: "verde", freguesia: null,
    },
    {
      titulo: "Os espaços verdes arrefecem à sua volta",
      texto: `Nas zonas construídas a menos de 50 m de um espaço verde grande, o chão está ${graus(r.arrefecimento[0].mean)}. ` +
        "O efeito vai diminuindo e desaparece a partir de uns 200 m. Destacadas: zonas construídas a mais de 300 m de um espaço verde.",
      camada: "dist", freguesia: null, filtro: (c) => c.verde < 15 && c.dist > 300,
    },
    {
      titulo: `${quente.freguesia} e ${foco.freguesia} são as mais quentes`,
      texto: `Têm ${graus(quente.anomalia_c)} e ${graus(foco.anomalia_c)} face ao típico e só ~2 % de verde. ` +
        `Em ${foco.freguesia} (Alfornelos e Brandoa), ${inteiro(foco.celulas_quentes_pct)} % do território está entre ` +
        `as zonas mais quentes da Amadora. ${fresca.freguesia}, com ${inteiro(fresca.verde_pct)} % de verde, é a mais fresca.`,
      camada: "calor", freguesia: "111514", filtro: (c) => c.an >= r.limiar_quente,
    },
    {
      titulo: "Agora explore a sua zona",
      texto: "Clique em qualquer quadrado do mapa para ver o calor nessa zona, quanto verde tem e o que mudaria com mais " +
        "árvores. No separador \"Calor × verde\" pode escolher grupos de quadrados no gráfico e vê-los no mapa.",
      camada: "calor", freguesia: null,
    },
  ];
}

export function Historia({ lista, i, aoMudar, aoFechar }: {
  lista: Passo[]; i: number; aoMudar: (i: number) => void; aoFechar: () => void;
}) {
  const p = lista[i];
  const ultimo = i === lista.length - 1;
  return (
    <div className="historia" role="dialog" aria-label="História guiada">
      <div className="historia-topo">
        <span className="mudo">{i + 1} de {lista.length}</span>
        <button className="ligacao" onClick={aoFechar}>Saltar</button>
      </div>
      <h2>{p.titulo}</h2>
      <p>{p.texto}</p>
      <div className="historia-pontos">
        {lista.map((_, k) => (
          <button key={k} className={k === i ? "ativo" : ""} aria-label={`Passo ${k + 1}`} onClick={() => aoMudar(k)} />
        ))}
      </div>
      <div className="historia-botoes">
        {i > 0 && <button className="botao secundario" onClick={() => aoMudar(i - 1)}>Anterior</button>}
        <button className="botao" onClick={() => (ultimo ? aoFechar() : aoMudar(i + 1))}>
          {ultimo ? "Explorar o mapa" : "Seguinte"}
        </button>
      </div>
    </div>
  );
}
