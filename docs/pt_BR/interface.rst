Interface
=========

Barra de menus
--------------

* **Arquivo**: novo/abrir/salvar/salvar-como projeto, envio e
  variantes de projeto embutido, importação de projetos inteiros
  (Aseprite, PSD, XCF, Kra, GIF, GPP), importação de SVG/modelo
  3D/imagem, gerenciador de conteúdo, exportação de
  quadros/animação/spritesheet.
* **Editar**: desfazer/refazer, recortar/copiar/colar da seleção
  flutuante, copiar fundido, criar pincel da seleção,
  configurações, ajustes de brilho/contraste e matiz/saturação,
  redefinição da transformação do canvas.
* **Ferramentas**: todas as ferramentas de pintura, forma, retoque,
  seleção, destrutivas, transformação e 3D, agrupadas em submenus de
  gaveta.
* **Filtros**: todos os filtros destrutivos agrupados por tema
  (desfoque, realce, artístico, bordas, ruído, cores, decoração,
  distorção).
* **Ajuda**: este manual, a lista de atalhos, a lista de licenças
  de terceiros, a página do código-fonte e um atalho para a versão
  pública no GitHub Pages.

Barra de opções da ferramenta
-----------------------------

Logo abaixo da barra de menus, ela segue a ferramenta ativa: o lápis
mostra tamanho, forma, tipo de ponta, dinâmicas, estabilizador e modo
de mesclagem; linha/curva/balde e as demais mostram suas próprias
configurações. Ferramentas sem nada a configurar dizem isso
explicitamente.

Barra de ferramentas
--------------------

Botões de gaveta agrupam ferramentas relacionadas (a ferramenta da
frente pinta, o botão direito abre o menu). Botões avulsos: lupa
(``Z``), balde (``F``), conta-gotas (segure ``Ctrl`` em qualquer lugar
para um temporário), texto e pincel de azulejo. Abaixo ficam os potes
de cor de frente/fundo (clique para editar, ``X`` troca) e o seletor
de cor do lápis, cujo painel lateral traz as mesmas configurações de
pincel da barra de opções.

Painel de camadas e matriz de animação
--------------------------------------

O painel direito lista as camadas (visibilidade, opacidade, modo de
mesclagem, travas de canal V/V/A/A, renomear, redimensionar,
reordenar, fundir, máscaras). Abaixo, a matriz de animação mostra
camadas contra quadros com seletores de conteúdo por célula,
cabeçalhos de quadro (renomear, duração, adicionar/remover) e os
controles de onion skin, reprodução e gerenciador de conteúdo. Clique
com o botão direito nos nomes de camada, cabeçalhos e células para
menus de contexto.

Barra de status e diálogos
--------------------------

A barra inferior informa ferramenta, cor, pixel do cursor, tamanhos do
canvas e da camada, zoom, rotação, espelhamentos e estado do projeto.
Toda operação destrutiva ou estrutural passa por diálogos com prévia
ao vivo e semântica ``OK``/``Aplicar``/``Cancelar``; controles soltos
mostram a prévia no canvas e ``Cancelar`` sempre reverte.

Paleta de ações
---------------

``Ctrl+Shift+P`` (``Cmd+Shift+P`` no macOS) abre o diálogo de ações.
Digite algumas letras — todo item de menu, ferramenta (``tool-pencil``
e outros) e filtro (``filter-levels`` e outros) aparece na lista e
executa com ``Enter``. ``0`` redefine a transformação do canvas;
``Tab`` oculta a interface.
