Filtros
=======

Todo filtro é destrutivo: reescreve a célula atual (ou a seleção
flutuante) e registra uma entrada de desfazer.

O diálogo genérico
------------------

Qualquer filtro abre o mesmo diálogo flutuante: parâmetros nomeados
com controles mais campos numéricos exatos, seta de redefinição por
parâmetro, prévia ao vivo ao soltar, e três saídas — **OK** confirma
e fecha, **Aplicar** confirma sem fechar (rebasando o Cancelar),
**Cancelar** (ou ``Esc``) reverte para antes do diálogo — ou do
último Aplicar. Pintar no canvas consolida a prévia antes.

Menu Filtros
------------

**Filtros** agrupa os 65 pelo visual que produzem; cada um também é
uma ação ``filter-<id>`` na paleta. Com seleção flutuante ativa, só
o conteúdo mascarado é filtrado.

Desfoque (8)
------------

* **Desfoque gaussiano** (raio) — deixa a imagem macia e fora de
  foco, derretendo detalhes pequenos.
* **Desfoque de movimento** (ângulo, tamanho) — borra como se a
  câmera tivesse se movido na hora da foto.
* **Pixelizar** (tamanho) — transforma a imagem em quadrados grandes
  e chapados.
* **Desfoque de caixa** (raio) — deixa borrado com aspecto mais
  áspero e duro.
* **Movimento circular** (ângulo) — borra em círculos ao redor do
  centro, como foto girando.
* **Movimento de zoom** (intensidade) — risca a luz para fora do
  centro, como avançar em velocidade.
* **Desfoque seletivo** (raio, delta máximo) — suaviza áreas lisas
  mantendo bordas fortes nítidas.
* **Desfoque de lente** (raio, lados) — desfoque de foto com pontos
  de luz em forma.

Realce (7)
----------

* **Máscara de nitidez** (raio, intensidade, limiar) — deixa bordas
  e detalhes mais nítidos.
* **Nitidez** — deixa a imagem toda mais nítida e definida.
* **Remover manchas** (raio) — apaga pontinhos de granulação sem
  borrar as bordas.
* **Média SNN** (raio) — suaviza o ruído mantendo as bordas.
* **Passa-alta** (raio, contraste) — guarda só os detalhes finos
  sobre cinza, para misturar nitidez.
* **Serrilhado suavizado** — amacia bordas serrilhadas em degraus.
* **Propagar valor** (modo, raio) — espalha as áreas claras para fora
  (ou as escuras para dentro).

Artístico (7)
-------------

* **Pintura a óleo** (tamanho, níveis) — faz a foto parecer pintura
  a óleo com pinceladas visíveis.
* **Relevo** (profundidade, azimute) — faz parecer esculpido em
  relevo, iluminado de um lado.
* **Cartoon** (intensidade) — escurece os contornos e a imagem
  parece desenhada à mão.
* **Fotocópia** (raio, viés) — vira cópia de máquina em preto e
  branco.
* **Brilho suave** (raio, brilho, nitidez) — deita um brilho de sonho
  sobre as áreas claras.
* **Meio-tom** (tamanho) — imprime a imagem como pontinhos de jornal.
* **Mosaico** (largura/altura do azulejo) — reconstrói a imagem com
  azulejos retangulares chapados.

Detectar bordas (7)
-------------------

* **Bordas Sobel** (direção) — guarda só os contornos, como linhas
  claras no escuro.
* **Bordas neon** (raio, intensidade) — desenha contornos coloridos
  brilhantes sobre a imagem.
* **Bordas Laplace** — guarda contornos finos no escuro.
* **Diferença de gaussianas** (raios) — mostra detalhes finos como
  linhas escuras no cinza.
* **Relevo fixo** (direção) — relevo esculpido com luz de direção
  fixa.
* **Altura para normal** (força, canal) — repinta o brilho como
  sombreamento 3D colorido.
* **Gradiente da imagem** — mostra as bordas de cor como linhas
  coloridas brilhantes.

Ruído (5)
---------

* **Ruído RGB** (intensidade, mono, semente) — salpica granulação
  colorida aleatória.
* **Arremessar** (modo, intensidade, semente) — espalha pixels
  coloridos aleatórios.
* **Espalhar** (intensidade, semente) — embaralha os pixels como TV
  fora do ar.
* **Ruído HSV** (intensidade, semente) — salpica granulação bem
  colorida.
* **Ruído LCh** (intensidade, semente) — salpica granulação de
  aspecto natural.
* Todo granulado repete igual com a mesma semente.

Cores (23)
----------

* **Posterizar** (níveis) — achata a imagem em poucas faixas de cor
  chapadas.
* **Limiar** (limiar, canal) — força tudo a preto puro ou branco
  puro.
* **Inverter** — vira negativo de foto (o alfa fica).
* **Dessaturar** (modo) — drena toda a cor, deixando cinza.
* **Cor para alfa** (cor, limiar) — apaga uma cor escolhida,
  tornando-a transparente.
* **Balanço de cor** (faixa, ciano/vermelho, magenta/verde,
  amarelo/azul, preservar) — empurra o tom geral para mais
  quente/frio ou verde/magenta.
* **Misturador de canais** (pesos 3x3, preservar) — recolore a imagem
  misturando os canais vermelho, verde e azul entre si.
* **Colorir** (matiz, saturação, luminosidade) — repinta tudo numa
  família de cor escolhida.
* **Sépia** (escala) — dá o marrom envelhecido de foto antiga.
* **Exposição** (preto, exposição) — clareia ou escurece como mudar
  a exposição da câmera.
* **Saturação** (escala) — aviva as cores ou as apaga até o cinza.
* **Clarear/Escurecer** (modo, tipo, exposição) — clareia ou
  escurece como retoque de laboratório.
* **Contraste automático** — estica os tons para os escuros
  escurecerem e os claros clarearem.
* **Inclinação/Deslocamento/Potência** (controles por canal) —
  correção de cor precisa para sombras, meios-tons e luzes.
* **Misturador mono** (vermelho, verde, azul, preservar) —
  preto-e-branco com controle de como cada cor vira cinza.
* **Maximizar canal** — empurra cada pixel para cores vívidas de
  cartaz.
* **Minimizar canal** — empurra cada pixel para tons bem escuros.
* **Normalizar** — estica os tons para a imagem ir do preto total ao
  branco total.
* **Níveis** (canal, baixo, alto, gama) — remapeia o brilho com
  controles de preto/branco e meios-tons.
* **Ajuste HSV** (matiz, saturação, valor, colorir) — muda de uma vez
  o matiz, a vivacidade e o brilho de todas as cores.
* **Paletizar** (cores, dithering) — reduz a imagem a uma lista de
  cores escolhida, com cara retrô.
* **Mapa de gradiente** (cores, dithering) — repinta o brilho como
  gradiente de cor (o escuro vira uma cor, o claro outra).
* **Propagar cores** (distância) — espalha as cores das bordas para
  o transparente ao redor, limpando halos de recortes; os pixels
  existentes não se movem.

Decoração (2)
-------------

* **Cantos arredondados** (raio) — corta os cantos redondos e
  transparentes.
* **Degradação de vídeo** (padrão, força) — adiciona defeitos
  retrô de VHS.

Distorção (6)
-------------

* **Ondas** (amplitude, período, direção) — ondula a imagem como
  água.
* **Vento** (direção, força, semente) — risca os pixels de lado como
  vento forte.
* **Redemoinho** (giro, aperto, raio) — torce a imagem em espiral ao
  redor do centro.
* **Coordenadas polares** (modo, rotação) — enrola a imagem em
  círculo, ou a desenrola de volta.
* **Distorção de lente** (principal, borda, zoom) — abaúla ou
  aperta como lente barata.
* **Deslocar** (direção, intensidade, semente) — desliza linhas ou
  colunas com repetição nas bordas.
