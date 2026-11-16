import { useEffect, useRef, useState } from "react";
import { corDe, graus, inteiro } from "./escalas";
import type { Celula, Resumo, Selecao } from "./tipos";

const X0 = 0, X1 = 100, Y0 = -10, Y1 = 6;
const M = { t: 12, r: 14, b: 36, l: 44 };
const ALTURA = 300;

function tinta(nome: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || "#888";
}

// Muitas células têm exatamente 0 % de verde; um pequeno desvio horizontal (fixo por célula) evita que fiquem
// todas empilhadas numa linha. Só afeta o desenho, não os valores.
const desvio = (id: number) => (((id * 2654435761) % 1000) / 1000 - 0.5) * 1.6;

interface DispersaoProps {
  celulas: Celula[];
  resumo: Resumo;
  selecao: Selecao | null;
  selecionada: number | null;
  realce: number | null;
  aoSelecionar: (s: Selecao | null) => void;
  aoClicar: (id: number) => void;
}

/** Verde × calor, uma bola por célula. Arrastar seleciona células (e destaca-as no mapa). */
export function Dispersao(p: DispersaoProps) {
  const caixa = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const [largura, setLargura] = useState(320);
  const [arrasto, setArrasto] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [dica, setDica] = useState<{ x: number; y: number; c: Celula } | null>(null);
  // Início do arrasto numa ref: um arrasto rápido pode terminar antes de o estado ser atualizado
  const inicio = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(260, Math.floor(e.contentRect.width))));
    ro.observe(caixa.current!);
    return () => ro.disconnect();
  }, []);

  const w = largura - M.l - M.r, h = ALTURA - M.t - M.b;
  const sx = (v: number) => M.l + ((v - X0) / (X1 - X0)) * w;
  const sy = (v: number) => M.t + (1 - (v - Y0) / (Y1 - Y0)) * h;
  const vx = (px: number) => X0 + ((px - M.l) / w) * (X1 - X0);
  const vy = (py: number) => Y0 + (1 - (py - M.t) / h) * (Y1 - Y0);

  useEffect(() => {
    const c = tela.current!;
    const dpr = window.devicePixelRatio || 1;
    c.width = largura * dpr, c.height = ALTURA * dpr;
    c.style.width = `${largura}px`, c.style.height = `${ALTURA}px`;
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, largura, ALTURA);
    const grelha = tinta("--grelha"), mudo = tinta("--texto-3"), texto = tinta("--texto-2");
    const acento = tinta("--acento"), cinza = tinta("--ponto"), forte = tinta("--texto");

    g.font = "11px system-ui, sans-serif";
    g.lineWidth = 1;
    for (const y of [-8, -4, 0, 4]) {
      g.strokeStyle = y === 0 ? mudo : grelha;
      g.beginPath(), g.moveTo(M.l, sy(y)), g.lineTo(M.l + w, sy(y)), g.stroke();
      g.fillStyle = mudo, g.textAlign = "right", g.textBaseline = "middle";
      g.fillText(y === 0 ? "0" : `${y > 0 ? "+" : "−"}${Math.abs(y)}`, M.l - 6, sy(y));
    }
    for (const x of [0, 25, 50, 75, 100]) {
      g.fillStyle = mudo, g.textAlign = "center", g.textBaseline = "top";
      g.fillText(`${x} %`, sx(x), M.t + h + 6);
    }
    g.fillStyle = texto, g.textAlign = "center";
    g.fillText("Área verde no quadrado de 90 m", M.l + w / 2, ALTURA - 14);
    g.save(), g.translate(11, M.t + h / 2), g.rotate(-Math.PI / 2), g.textBaseline = "middle";
    g.fillText("°C face ao típico", 0, 0), g.restore();

    const sel = p.selecao?.ids;
    for (const pass of [0, 1]) {
      for (const cel of p.celulas) {
        const dentro = sel ? sel.has(cel.id) : false;
        if ((pass === 1) !== dentro) continue;
        g.globalAlpha = dentro ? 0.85 : sel ? 0.18 : 0.4;
        g.fillStyle = dentro ? acento : cinza;
        g.beginPath(), g.arc(sx(cel.verde + desvio(cel.id)), sy(cel.an), 2.2, 0, Math.PI * 2), g.fill();
      }
    }
    g.globalAlpha = 1;

    // Reta de regressão
    const { declive_por_pct: a, ordenada: b } = p.resumo.regressao;
    g.strokeStyle = forte, g.lineWidth = 2;
    g.beginPath(), g.moveTo(sx(0), sy(b)), g.lineTo(sx(100), sy(b + a * 100)), g.stroke();

    for (const [id, raio] of [[p.realce, 6], [p.selecionada, 7]] as const) {
      if (id === null) continue;
      const cel = p.celulas[id];
      g.strokeStyle = forte, g.lineWidth = 2;
      g.beginPath(), g.arc(sx(cel.verde + desvio(cel.id)), sy(cel.an), raio, 0, Math.PI * 2), g.stroke();
    }
    if (arrasto) {
      g.fillStyle = acento, g.globalAlpha = 0.12;
      const [x, y] = [Math.min(arrasto.x0, arrasto.x1), Math.min(arrasto.y0, arrasto.y1)];
      g.fillRect(x, y, Math.abs(arrasto.x1 - arrasto.x0), Math.abs(arrasto.y1 - arrasto.y0));
      g.globalAlpha = 1, g.strokeStyle = acento, g.lineWidth = 1;
      g.strokeRect(x, y, Math.abs(arrasto.x1 - arrasto.x0), Math.abs(arrasto.y1 - arrasto.y0));
    }
  }, [largura, p.celulas, p.selecao, p.selecionada, p.realce, arrasto, p.resumo]);

  const ponto = (e: React.PointerEvent) => {
    const r = tela.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const maisProxima = (x: number, y: number) => {
    let melhor: Celula | null = null, d = 64;
    for (const c of p.celulas) {
      const dd = (sx(c.verde + desvio(c.id)) - x) ** 2 + (sy(c.an) - y) ** 2;
      if (dd < d) d = dd, melhor = c;
    }
    return melhor;
  };

  return (
    <div ref={caixa} className="dispersao">
      <canvas
        ref={tela}
        role="img"
        aria-label="Gráfico de dispersão: área verde de cada quadrado contra a temperatura da superfície"
        onPointerDown={(e) => {
          const q = ponto(e);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          inicio.current = q;
          setDica(null);
          setArrasto({ x0: q.x, y0: q.y, x1: q.x, y1: q.y });
        }}
        onPointerMove={(e) => {
          const q = ponto(e);
          if (inicio.current) return setArrasto({ x0: inicio.current.x, y0: inicio.current.y, x1: q.x, y1: q.y });
          const c = maisProxima(q.x, q.y);
          setDica(c ? { x: q.x, y: q.y, c } : null);
        }}
        onPointerLeave={() => setDica(null)}
        onPointerUp={(e) => {
          if (!inicio.current) return;
          const { x: x0, y: y0 } = inicio.current;
          const { x: x1, y: y1 } = ponto(e);
          inicio.current = null;
          setArrasto(null);
          if (Math.abs(x1 - x0) < 4 && Math.abs(y1 - y0) < 4) {
            const c = maisProxima(x0, y0);
            if (c) p.aoClicar(c.id);
            else p.aoSelecionar(null);
            return;
          }
          const [va, vb] = [vx(Math.min(x0, x1)), vx(Math.max(x0, x1))];
          const [ya, yb] = [vy(Math.max(y0, y1)), vy(Math.min(y0, y1))];
          const ids = new Set(p.celulas.filter((c) => {
            const v = c.verde + desvio(c.id);
            return v >= va && v <= vb && c.an >= ya && c.an <= yb;
          }).map((c) => c.id));
          p.aoSelecionar(ids.size ? {
            ids, descricao: `${inteiro(Math.max(0, va))}–${inteiro(Math.min(100, vb))} % de verde, ${graus(ya)} a ${graus(yb)}`,
          } : null);
        }}
      />
      {dica && !arrasto && (
        <div className="dica" style={{ left: Math.min(dica.x + 12, largura - 170), top: dica.y + 12 }}>
          <strong>{graus(dica.c.an)}</strong> · {inteiro(dica.c.verde)} % verde
          <div className="mudo">{dica.c.cos}</div>
        </div>
      )}
    </div>
  );
}

export interface Classe { rotulo: string; media: number; n: number; filtro: (c: Celula) => boolean }

/** Barras horizontais a partir do 0 °C; clicar numa barra seleciona essas células no mapa. */
export function BarrasClasses({ classes, ativa, aoEscolher }: {
  classes: Classe[]; ativa: string | null; aoEscolher: (c: Classe) => void;
}) {
  const max = Math.max(...classes.map((c) => Math.abs(c.media)), 1);
  return (
    <div className="barras" role="list">
      {classes.map((c) => {
        const larg = (Math.abs(c.media) / max) * 50;
        return (
          <button
            key={c.rotulo} role="listitem" className={`barra ${ativa === c.rotulo ? "ativa" : ""}`}
            onClick={() => aoEscolher(c)} title={`${c.n} quadrados — clique para os ver no mapa`}
          >
            <span className="barra-rotulo">{c.rotulo}</span>
            <span className="barra-pista">
              <span className="barra-zero" />
              <span
                className="barra-valor"
                style={{
                  background: corDe("calor", c.media * 2),
                  left: c.media < 0 ? `${50 - larg}%` : "50%",
                  width: `${larg}%`,
                }}
              />
            </span>
            <span className="barra-num">{graus(c.media)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Barra de percentil 0–100 com a posição da célula (mais fresca ← → mais quente). */
export function Percentil({ pct }: { pct: number }) {
  return (
    <div className="percentil" aria-label={`Mais quente do que ${pct} % da Amadora`}>
      <div className="percentil-pista" />
      <div className="percentil-marca" style={{ left: `${pct}%` }} />
      <div className="percentil-eixo"><span>mais fresca</span><span>mais quente</span></div>
    </div>
  );
}
