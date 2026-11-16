# Calor na Amadora

Estudo e mapa interativo do calor de verão na Amadora: onde o chão aquece mais, onde há vegetação, que refúgios
climáticos já existem e onde fazer novos primeiro.

- **Artigo:** https://sramorim10.github.io/calor-amadora/ — o estudo contado passo a passo, com mapas embutidos.
- **Mapa interativo:** https://sramorim10.github.io/calor-amadora/mapa/

Os mapas podem abrir numa camada: `mapa/?camada=calor` (ou `verde`, `dist`, `prioridade`); com `&embed=1` aparece
só o mapa, como dentro do artigo.

## O que mostra

- **Calor:** temperatura da superfície (chão e telhados) ao meio-dia de verão, face ao típico do concelho, em
  quadrados de 90 m. É a temperatura que o satélite vê no chão, não a temperatura do ar nem o calor que se sente.
- **Verde:** parte de cada quadrado com vegetação verde no verão.
- **Distância ao verde:** distância ao espaço verde de 1 ha ou mais mais próximo.
- **Prioridade:** onde fazer refúgios climáticos primeiro, com cinco fatores como no estudo de Lisboa de Manuel Banza
  (2023): calor, distância a pé a um jardim, residentes, falta de vegetação e distância a pé a uma biblioteca. Os
  pontos quentes são os sítios mais quentes, com ou sem residentes.
- **Refúgios climáticos:** jardins, bibliotecas, bebedouros, fontes, lagos e piscinas que já existem, e as árvores e
  refúgios propostos pelo estudo em Alfornelos.

Clique num quadrado para ver os valores dessa zona. O separador "Como foi feito" explica o método e as limitações.

## Fontes dos dados

- Temperatura da superfície: Landsat 8 e 9, verões de 2023 a 2025 (USGS/NASA, via Microsoft Planetary Computer).
- Vegetação: Sentinel-2, verões de 2023 a 2025 (contém dados Copernicus Sentinel modificados).
- Limites e uso do solo: CAOP 2025 e COS 2025 (Direção-Geral do Território).
- Residentes: Censos 2021, BGRI (Instituto Nacional de Estatística).
- Ruas, jardins, bibliotecas, bebedouros e outros refúgios: © contribuidores do OpenStreetMap (ODbL).
- Mapa de fundo: OpenFreeMap, OpenMapTiles, © contribuidores do OpenStreetMap.
- Calor sentido nas propostas de árvores e refúgios: modelo SOLWEIG com LiDAR e ortofotos da DGT.

Os ficheiros em `public/dados/` e as imagens em `public/artigo/` são gerados por uma análise à parte e não devem ser
editados à mão. O artigo está em `index.html`; o mapa em `mapa/index.html` e `src/`.

## Correr no computador

Precisa do [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

O site publica-se sozinho no GitHub Pages sempre que há alterações no ramo `main`
(`.github/workflows/pages.yml`).
