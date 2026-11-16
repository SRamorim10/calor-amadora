import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Caminhos relativos: o site funciona em qualquer subpasta (ex.: GitHub Pages, https://<conta>.github.io/<repositório>/)
  base: "./",
  // Duas páginas: o artigo (index.html) e o mapa interativo (mapa/index.html)
  build: { rolldownOptions: { input: { artigo: "index.html", mapa: "mapa/index.html" } } },
  // O maplibre-gl 6 carrega o seu worker por caminho relativo ao módulo; o pré-empacotamento do Vite parte-o.
  // O URL do worker é definido em Mapa.tsx (setWorkerUrl) com um import "?worker&url".
  optimizeDeps: { exclude: ["maplibre-gl"] },
  worker: { format: "es" },
  server: {
    port: 5180,
    // Os eventos de ficheiros (fsevents) não chegam ao Vite quando corre a partir do painel de pré-visualização.
    watch: { usePolling: true, interval: 300 },
  },
});
