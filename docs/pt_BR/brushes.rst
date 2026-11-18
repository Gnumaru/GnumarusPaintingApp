Pincéis e predefinições
=======================

Usando predefinições
--------------------

O seletor na barra de opções aplica uma configuração completa de uma
vez (19 embutidas: Pixel Hard, Pixel Spray, Pixel Dither, Palette
Shade, Soft Round, Chalk, Ink, Airbrush, Smudge, borrachas dura/suave,
Glaze, Dry Brush, Charcoal, Blender, Spray, Chisel Marker, Velocity
Ink, Tilt Pencil). Depois ajuste à vontade.

Botão Redefinir
---------------

O botão **Redefinir** fica logo à esquerda do seletor, tanto na barra
de opções quanto no painel lateral do seletor de cor. Ele reaplica os
padrões da predefinição selecionada, descartando ajustes posteriores —
o caminho de volta depois de experimentar.

Gerenciador
-----------

**Predefinições** abre o diálogo: escolha uma para aplicar, nomeie as
configurações atuais e **Salve** como personalizada (persistem no
localStorage), **Exclua** personalizadas, **Exporte** qualquer uma em
JSON ou **Importe** um arquivo (importar já aplica).

Pincel de seleção
-----------------

**Editar > Criar pincel da seleção** (exige seleção flutuante) captura
a seleção como pincel e troca o lápis para ele:

* **Carimbo**: a captura inteira carimba por ponto (a prévia contorna
  a caixa).
* **Origem**: a captura pinta como padrão com repetição ancorado no
  ponto de cópia — repete a seleção no lugar.
* **Destino**: o padrão se ancora no início do traço.

A ponta geométrica atual (forma/tamanho/ângulo) age como máscara do
padrão, então uma ponta linha pinta caligrafia com a textura. Travas,
mesclagem e repetição valem normalmente.

Pontas duplas e importação
--------------------------

Uma segunda máscara de imagem pode multiplicar o ponto principal
(preto bloqueia, branco passa) com força/tamanho próprios; **Limpar**
remove. **Importar** carrega um PNG como ponta (limiar de auto-ajuste,
limite de 128 px) e o arquiva para reuso.
