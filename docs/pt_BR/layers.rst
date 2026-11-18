Camadas
=======

Painel
------

Cada linha seleciona a camada e expõe: visibilidade, opacidade, modo
de mesclagem (normal, multiplicar, somar, variantes cientes de alfa
que aparecem através de texels transparentes), travas de canal
V/V/A/A, renomear, redimensionar e mover/excluir por linha. Selecione
várias com ``Ctrl``/``Shift`` para excluir em massa; arraste nomes
para aninhar sob máscaras.

Travas de canal
---------------

Qualquer combinação trava por camada e persiste no projeto. Pintura,
limpeza e Fundir abaixo escrevem só canais destravados (travar o alfa
mantém a opacidade; travar o verde torna a tinta ciano em azul).
Travas são estruturais: não entram no desfazer, mas fundir restaura as
travas da camada removida ao desfazer.

Redimensionar, ajustar e transformar
------------------------------------

Redimensionar por camada (1…1024 por lado no diálogo, maior via
expansão do canvas) preserva o canto superior esquerdo, preenche o
novo com transparência e corta o excesso — uma entrada de desfazer.
**Redimensionar para o canvas** iguala ao canvas; **Ajustar textura
ao tamanho** apara bordas transparentes (limiar + configuração).
O menu da camada também redefine a transformação.

Máscaras e fusão
----------------

A camada vira máscara de aninhamento (e volta) pelo menu de contexto;
regiões mascaradas compõem através da mãe. **Fundir abaixo** (``Ctrl+E``)
compõe sobre a camada inferior, ciente de quadros, preservando a
transformação de baixo quando possível.

Células
-------

Cada posição camada × quadro é uma célula: células vazias materializam
conteúdo (e textura, se faltar) na primeira pintura. Recortar volta a
transparente; menus desvinculam/religam conteúdos compartilhados.
