import { useMemo, useState } from "react";
import { CAMADAS, corDe, graus, inteiro } from "./escalas";
import { BarrasClasses, type Classe, Dispersao, Percentil } from "./Graficos";
import type { Camada, Celula, Dados, Selecao } from "./tipos";

// ---------------------------------------------------------------- A sua zona

function frasePercentil(pct: number) {
  if (pct >= 90) return "Está entre os 10 % de zonas mais quentes da Amadora.";
  if (pct >= 70) return `Mais quente do que ${pct} % da Amadora.`;
  if (pct > 30) return "Perto do típico da Amadora.";
  if (pct > 10) return `Mais fresca do que ${100 - pct} % da Amadora.`;
  return "Está entre os 10 % de zonas mais frescas da Amadora.";
}

export function Ficha({ dados, c, aoVerQuente, aoFreguesia }: {
  dados: Dados; c: Celula | null; aoVerQuente: () => void; aoFreguesia: (cod: string) => void;
}) {
  const [extra, setExtra] = useState(20);
  const { resumo } = dados;
  if (!c) {
    const q = resumo.freguesias[0], f = resumo.freguesias[resumo.freguesias.length - 1];
    return (
      <div className="seccao">
        <p className="chamada">Clique num quadrado do mapa para ver como é o calor nessa zona e porquê.</p>
        <div className="numeros">
          <div><strong>{graus(q.anomalia_c - f.anomalia_c, false)}</strong>
            <span>de diferença entre a freguesia mais quente e a mais fresca</span></div>
          <div><strong>{graus(resumo.regressao.declive_por_pct * 10)}</strong>
            <span>por cada +10 % de área verde num quadrado</span></div>
        </div>
        <button className="botao" onClick={aoVerQuente}>Mostrar a zona mais quente</button>
        <h3>Ir para uma freguesia</h3>
        <div className="lista-botoes">
          {resumo.freguesias.map((r) => (
            <button key={r.dtmnfr} onClick={() => aoFreguesia(r.dtmnfr)}>{r.freguesia}</button>
          ))}
        </div>
      </div>
    );
  }
  const freg = resumo.freguesias.find((r) => r.dtmnfr === c.freg)!;
  const max = Math.max(0, 100 - c.verde);
  const add = Math.min(extra, max);
  const ganho = resumo.regressao.declive_por_pct * add;
  return (
    <div className="seccao">
      <p className="mudo">Quadrado de 90 × 90 m · {freg.freguesia} · {c.cos}</p>
      <div className="destaque">
        <span className="pastilha" style={{ background: corDe("calor", c.an) }} />
        <strong>{graus(c.an)}</strong>
        <span>face ao típico da Amadora, ao meio-dia de verão</span>
      </div>
      <p>{frasePercentil(c.pct)}</p>
      <Percentil pct={c.pct} />
      <dl className="valores">
        <dt>Temperatura do chão e telhados</dt><dd>{graus(c.lst, false)} <small>(média de {resumo.cenas} dias)</small></dd>
        <dt>Área verde no verão</dt><dd>{inteiro(c.verde)} %</dd>
        <dt>Espaço verde ≥ 1 ha mais próximo</dt><dd>{c.dist === 0 ? "aqui mesmo" : `${inteiro(c.dist)} m`}</dd>
        <dt>Média da freguesia</dt><dd>{graus(freg.anomalia_c)} · {inteiro(freg.verde_pct)} % verde</dd>
        {c.pri !== undefined && (<>
          <dt>Prioridade para refúgios</dt>
          <dd>{inteiro(c.pri)} em 100{c.prio ? " · prioritário (quartil de cima)" : ""}</dd>
          <dt>A pé até um jardim ≥ 0,5 ha</dt><dd>{inteiro(c.dj ?? 0)} m (~{inteiro((c.dj ?? 0) / 67)} min)</dd>
          <dt>A pé até uma biblioteca</dt><dd>{inteiro(c.db ?? 0)} m</dd>
          <dt>Residentes (Censos 2021)</dt><dd>~{inteiro(c.res ?? 0)}</dd>
          {c.ido !== undefined && (<><dt>Com 65 anos ou mais</dt><dd>{inteiro(c.ido)} %</dd></>)}
        </>)}
        {c.pq && (() => {
          const p = resumo.prioridade?.pontos_quentes?.find((z) => z.letra === c.pq);
          return p && (<>
            <dt>Ponto quente {p.letra}</dt>
            <dd>{p.lugar} ({p.freguesia}) · {graus(p.calor_c)} em média · sobretudo {p.uso.replace(/ \(.*/, "").toLowerCase()}</dd>
          </>);
        })()}
      </dl>
      {max > 0 && (
        <div className="simulador">
          <h3>E se houvesse mais verde aqui?</h3>
          <label>
            Mais <strong>{add} %</strong> do quadrado com árvores ou vegetação regada
            <input type="range" min={5} max={Math.max(5, max)} step={5} value={add}
              onChange={(e) => setExtra(+e.target.value)} />
          </label>
          <p>A superfície ficaria, em média, <strong>{graus(ganho, false).replace("−", "")} mais fresca</strong>{" "}
            (de {graus(c.an)} para cerca de {graus(c.an + ganho)}).</p>
          <p className="nota">Estimativa estatística a partir de todos os quadrados da Amadora (zonas com mais verde são
            mais frescas), não uma simulação. Mede o chão, não a temperatura do ar nem o conforto de quem passa.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Freguesias

export function Freguesias({ dados, foco, aoEscolher }: { dados: Dados; foco: string | null; aoEscolher: (cod: string) => void }) {
  const lista = dados.resumo.freguesias;
  const max = Math.max(...lista.map((f) => Math.abs(f.anomalia_c)));
  return (
    <div className="seccao">
      <p className="chamada">As freguesias com menos verde são as mais quentes.</p>
      <table className="tabela">
        <thead>
          <tr><th>Freguesia</th><th>Calor</th><th>Verde</th><th title="Parte da freguesia entre os 10 % de quadrados mais quentes da Amadora">Zonas muito quentes</th></tr>
        </thead>
        <tbody>
          {lista.map((f) => (
            <tr key={f.dtmnfr} className={foco === f.dtmnfr ? "ativa" : ""} onClick={() => aoEscolher(f.dtmnfr)}>
              <td><button className="ligacao">{f.freguesia}</button></td>
              <td>
                <span className="mini-barra">
                  <span style={{
                    background: corDe("calor", f.anomalia_c * 3),
                    left: f.anomalia_c < 0 ? `${50 - (Math.abs(f.anomalia_c) / max) * 50}%` : "50%",
                    width: `${(Math.abs(f.anomalia_c) / max) * 50}%`,
                  }} />
                </span>
                {graus(f.anomalia_c)}
              </td>
              <td>{inteiro(f.verde_pct)} %</td>
              <td>{inteiro(f.celulas_quentes_pct)} %</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="nota">Calor: média dos quadrados da freguesia face ao típico da Amadora. Verde: média da área com
        vegetação verde no verão. Clique numa freguesia para a ver no mapa.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Calor × verde

export function Relacao({ dados, selecao, selecionada, realce, aoSelecionar, aoClicar }: {
  dados: Dados; selecao: Selecao | null; selecionada: number | null; realce: number | null;
  aoSelecionar: (s: Selecao | null) => void; aoClicar: (id: number) => void;
}) {
  const { resumo, porId } = dados;
  const limites = [[0, 5], [5, 15], [15, 30], [30, 50], [50, 101]];
  const classesVerde: Classe[] = resumo.por_fracao_verde.map((l, i) => ({
    rotulo: `${l.verde} verde`, media: l.mean, n: l.count,
    filtro: (c) => (i === 0 ? c.verde <= 5 : c.verde > limites[i][0] && c.verde <= limites[i][1]),
  }));
  const dist = [[-1, 50], [50, 100], [100, 200], [200, 300], [300, 500], [500, 1e9]];
  const classesDist: Classe[] = resumo.arrefecimento.map((l, i) => ({
    rotulo: `a ${l.dist_verde}`, media: l.mean, n: l.count,
    filtro: (c) => c.verde < 15 && c.dist > dist[i][0] && c.dist <= dist[i][1],
  }));
  const classesCos: Classe[] = resumo.cos.filter((l) => l.celulas >= 50).map((l) => ({
    rotulo: l.cos, media: l.anomalia_c, n: l.celulas, filtro: (c) => c.cos === l.cos,
  }));
  const escolher = (c: Classe) => aoSelecionar({
    ids: new Set(porId.filter(c.filtro).map((x) => x.id)), descricao: c.rotulo,
  });
  const resumoSel = useMemo(() => {
    if (!selecao) return null;
    const cs = [...selecao.ids].map((i) => porId[i]);
    const media = (f: (c: Celula) => number) => cs.reduce((s, c) => s + f(c), 0) / cs.length;
    return { n: cs.length, an: media((c) => c.an), verde: media((c) => c.verde) };
  }, [selecao, porId]);

  return (
    <div className="seccao">
      <p className="chamada">Mais verde, chão mais fresco: cada +10 % de área verde num quadrado corresponde, em média,
        a <strong>{graus(resumo.regressao.declive_por_pct * 10)}</strong>.</p>
      <p className="mudo">Cada ponto é um quadrado de 90 m ({inteiro(resumo.celulas)} no total). Arraste sobre o gráfico
        para escolher pontos e vê-los no mapa.</p>
      <Dispersao celulas={porId} resumo={resumo} selecao={selecao} selecionada={selecionada} realce={realce}
        aoSelecionar={aoSelecionar} aoClicar={aoClicar} />
      {resumoSel && (
        <div className="selecao">
          <div><strong>{inteiro(resumoSel.n)} quadrados</strong> · {selecao!.descricao}</div>
          <div>Em média {graus(resumoSel.an)} e {inteiro(resumoSel.verde)} % de verde</div>
          <button className="ligacao" onClick={() => aoSelecionar(null)}>Limpar seleção</button>
        </div>
      )}
      <p className="nota">Correlação forte (r = {String(resumo.regressao.r).replace(".", ",")}), mas não prova que o verde
        sozinho explica tudo: onde há verde também há menos edifícios e asfalto.</p>

      <h3>Calor médio por quantidade de verde</h3>
      <BarrasClasses classes={classesVerde} ativa={selecao?.descricao ?? null} aoEscolher={escolher} />

      <h3>Os espaços verdes arrefecem à volta</h3>
      <p className="mudo">Zonas construídas (menos de 15 % de verde), pela distância ao espaço verde ≥ 1 ha mais próximo.
        O efeito desaparece a partir de ~200 m.</p>
      <BarrasClasses classes={classesDist} ativa={selecao?.descricao ?? null} aoEscolher={escolher} />

      <h3>Calor médio por uso do solo</h3>
      <BarrasClasses classes={classesCos} ativa={selecao?.descricao ?? null} aoEscolher={escolher} />
      <p className="nota">Os "espaços verdes urbanos" só arrefecem 0,5 °C: no verão, muita relva está seca e aquece
        quase como o resto. Uso do solo: COS 2025 (DGT).</p>
    </div>
  );
}

// ---------------------------------------------------------------- Como foi feito

export function Metodo({ dados }: { dados: Dados }) {
  return (
    <div className="seccao texto">
      <h3>O que o mapa mostra</h3>
      <p>A <strong>temperatura da superfície</strong>: quanto aquecem o chão, os telhados e a vegetação, medida por
        satélite (Landsat 8 e 9) em {dados.resumo.cenas} dias limpos de verão entre 2023 e 2025, por volta do meio-dia.
        Em cada dia comparamos cada sítio com o valor típico (mediana) da Amadora nesse dia, e fazemos a média.</p>
      <p>Não é a temperatura do ar nem o calor que se sente na rua. Um telhado escuro pode estar a 50 °C com o ar a 33 °C.
        Mas as zonas com a superfície mais quente são, em geral, as que aquecem mais o ar à volta e as que custam mais
        a arrefecer à noite.</p>
      <h3>Vegetação</h3>
      <p>Satélite Sentinel-2 (10 m), mediana dos verões 2023–2025. Conta como verde o que tem NDVI acima de 0,4 — árvores,
        mato e relva regada. Relva seca não conta: no verão quase não arrefece.</p>
      <h3>Quadrados de 90 m</h3>
      <p>O sensor térmico do satélite vê pormenores de ~100 m; por isso juntamos tudo em quadrados de 90 m. Uma árvore
        de rua isolada não aparece — para isso vem aí a análise ao nível da rua (1–2 m) em Alfornelos.</p>
      <h3>Prioridade para refúgios</h3>
      <p>Como no estudo de Lisboa de Manuel Banza (2023), com um sexto fator, a parte de idosos: calor da superfície
        (30 %), distância a pé ao jardim ≥ 0,5 ha mais próximo (25 %), residentes dos Censos 2021 (15 %), falta de
        vegetação no verão (10 %), distância a pé à biblioteca mais próxima (10 %) e parte de residentes com 65 anos ou
        mais (10 %). As bibliotecas das juntas (José Régio, Luís de Camões e Artur Martinho Simões) foram juntadas à
        mão, porque não estão no OpenStreetMap. Cada fator vai de 0 a 1 e a pontuação de 0 a 100; o quartil
        de cima é prioritário. Distâncias pela rede de ruas e caminhos do OpenStreetMap. Diferença para Lisboa: aqui o
        calor é o da superfície ao meio-dia, não o do ar ao entardecer.</p>
      <p>Os pontos quentes (contorno laranja) são grupos de quadrados entre os 10 % mais quentes, com ou sem residentes.
        Muitos são comércio, indústria e vias, como em Alfragide e junto à CRIL: quem lá trabalha ou passa de dia não
        entra nos Censos, por isso a pontuação pode deixá-los atrás dos bairros habitados.</p>
      <h3>Limitações</h3>
      <ul>
        <li>Correlação não é causa: onde há verde também há menos edifícios e asfalto.</li>
        <li>Só imagens do fim da manhã: não mostra o calor da noite.</li>
        <li>A estimativa "e se houvesse mais verde" é estatística, não uma simulação física.</li>
      </ul>
      <h3>Fontes</h3>
      <p className="mudo">Landsat Collection 2 nível 2 (USGS) e Sentinel-2 L2A (ESA), via Microsoft Planetary Computer;
        CAOP 2025 e COS 2025 (DGT); Censos 2021, BGRI (INE); refúgios e rede pedonal © OpenStreetMap; mapa de fundo
        OpenFreeMap / © OpenStreetMap.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Legenda

export function Legenda({ camada, limiar }: { camada: Camada; limiar?: number }) {
  const c = CAMADAS[camada];
  const grad = `linear-gradient(to right, ${c.cores.map((cor, i) => `${cor} ${(i / (c.cores.length - 1)) * 100}%`).join(", ")})`;
  const extremos: Record<Camada, [string, string, string]> = {
    calor: ["mais fresco", "típico", "mais quente"],
    verde: ["sem verde", "", "muito verde"],
    dist: ["perto", "", "longe"],
    prioridade: ["menos urgente", "", "mais urgente"],
  };
  const [a, m, b] = extremos[camada];
  const p = c.paragens;
  return (
    <div className="legenda">
      <div className="legenda-titulo">{c.nome} <span className="info" title={c.explica}>ⓘ</span></div>
      <div className="legenda-barra" style={{ background: grad }} />
      <div className="legenda-eixo">
        <span>{camada === "calor" ? `≤ −6 °C` : `${p[0]} ${c.unidade}`}</span>
        {m && <span>0 °C</span>}
        <span>{camada === "calor" ? "≥ +6 °C" : `${p[p.length - 1]}+ ${c.unidade}`}</span>
      </div>
      <div className="legenda-eixo mudo"><span>{a}</span>{m && <span>{m}</span>}<span>{b}</span></div>
      {camada === "prioridade" && <div className="legenda-eixo mudo"><span>contorno escuro: quartil de cima{limiar !== undefined && ` (≥ ${Math.round(limiar)})`}</span></div>}
      {camada === "prioridade" && <div className="legenda-eixo mudo"><span>contorno laranja: pontos quentes (10 % mais quentes, com ou sem residentes)</span></div>}
    </div>
  );
}
