Ferramentas de pintura
======================

Lápis (B)
---------

O pincel de pixel. O tamanho é uma faixa mín–máx: a pressão da caneta
interpola entre eles pela curva de tamanho; sem resposta à pressão, o
máximo sempre pinta. Pontas: ``quadrada``, ``circular`` (teste de
disco) ou ``linha`` (traço reto estilo Aseprite girado pelo ângulo do
pincel, sempre serrilhado — feito para quem usa mouse). Círculos
ignoram o ângulo (``-180…180``).

Pressão, inclinação e velocidade
--------------------------------

Modos de resposta: ``nenhuma``, ``tamanho``, ``opacidade``,
``tamanho+opacidade`` (o mouse sempre lê pressão máxima). Curvas de
tamanho e alfa (``linear``/``suave``/``firme``) remodelam o sinal da
caneta; alargamento por inclinação e esmaecimento por velocidade
(traços rápidos perdem fluxo) modulam o ponto. O estabilizador
(``nenhum``/``corda`` com comprimento/``perseguição`` com força)
suaviza o traço com um ponto de foco.

Dinâmicas de pixel
------------------

* **Spray de pixel**: mantém uma fração determinística dos pontos.
* **Dithering** (Bayer 4x4): o pixel só pinta quando o limiar da matriz
  supera o alfa efetivo. Com caneta, pressione leve para padrões
  ralos; com mouse, baixe o **Fluxo** — ele aparece para todas as
  pontas e ralenta o padrão como a pressão faria.
* **Sombra por paleta**: avança cada pixel pintado pela paleta de
  sombreamento em vez de cor chapada.

Pontas suaves e de imagem
-------------------------

A **redonda suave** adiciona queda de dureza; pontas de **imagem**
carimbam uma máscara em tons de cinza importada como alfa tingível
(recortada, arquivada como JXL com perdas em ``brushes/`` do OPFS).
Sobre qualquer ponta: espaçamento com resto fracionário, fluxo por
ponto, granulação de papel ancorada (escala/força), jitter
determinístico, rotação da ponta (nenhuma ou seguindo o traço),
aerógrafo temporizado e esfuminho coletor (taxa + umidade).

Mesclagem, acumulação, simetria, repetição
------------------------------------------

Modos: normal, cópia, borracha (``E`` alterna a borracha, lembrando o
modo anterior). **Acumular** uniformiza pontos sobrepostos; a simetria
do canvas (esquerda-direita/cima-baixo/quatro vias, eixos
arrastáveis) espelha os traços; os modos de repetição repetem a
textura ao infinito enquanto pinta.

Linha, curva, formas, balde
---------------------------

**Linha** (largura, forma, serrilhado, segmentos de dois cliques),
**curva** (extremidades arrastadas mais dois controles Bézier),
formas de **retângulo/elipse/polígono/gradiente** e o **balde**
(opção de mesclagem, limiar, contíguo) completam a gaveta.

Resposta ao vivo
----------------

A prévia da ponta segue o mouse, as prévias de forma são pixel a pixel
iguais ao resultado, e ``Shift+arrastar`` redimensiona a ferramenta
ativa ao vivo. ``Esc`` cancela o traço ou gesto em curso.
