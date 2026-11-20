Primeiros passos
================

Requisitos
----------

* Um navegador baseado em Chromium (Chrome, Edge, Opera, Brave).
  Projetos em pasta usam a File System Access API, que exige Chromium.
  Abrir e salvar no armazenamento do navegador funciona em qualquer
  lugar onde o aplicativo carregue.
* Uma GPU com WebGL2. Sem ele, o aplicativo se recusa a iniciar e
  mostra uma mensagem explícita em vez de um canvas quebrado.

Interface móvel
---------------

* Em celulares (tablets mantêm a interface de desktop), o aplicativo
  abre um shell otimizado para toque: canvas em tela cheia, barra de
  ferramentas inferior (lápis, borracha, balde, conta-gotas, painel de
  cor/tamanho, desfazer, refazer) e mini-barra superior com Salvar e
  um botão de versão desktop.
* Um dedo pinta; dois dedos aproximam (pinça) e arrastam. O MVP móvel
  é de camada única, sem animação.
* **Ajuda > Versão móvel** alterna entre as interfaces de desktop e
  móvel. A escolha é lembrada; a troca nunca recarrega a página e
  nunca perde trabalho.

Sua primeira pintura
--------------------

1. Abra o aplicativo. Já há um projeto padrão, pronto para pintar.
2. Escolha o **Lápis** (``B``) e uma cor de frente nos potes de tinta.
3. Arraste no canvas. ``Ctrl+Z`` desfaz, ``Ctrl+Y`` refaz.
4. **Arquivo > Salvar projeto** (``Ctrl+S``) grava o projeto de volta
   na pasta. O primeiro salvamento pede um diretório.

Projetos
--------

* **Arquivo > Novo projeto** cria um projeto em branco (largura, altura,
  predefinições de armazenamento das texturas e um par ligado FPS /
  tempo de quadro que define a duração padrão de quadro da nova
  animação).
* **Arquivo > Abrir projeto** lê de volta uma pasta de projeto
  (``project.json`` mais um PNG por célula de camada).
* **Arquivo > Enviar projeto** importa um pacote ``.gpp`` para o
  armazenamento do navegador; projetos embutidos também podem ser
  abertos e salvos pelo mesmo menu.
* A barra de título mostra o nome do projeto mais um marcador de
  alterações não salvas.

Onde fica o quê
---------------

* Em cima: a barra de menus (**Arquivo**, **Editar**, **Ferramentas**,
  **Filtros**, **Ajuda**) e, logo abaixo, a barra de opções da
  ferramenta ativa.
* À esquerda: a barra de ferramentas (gavetas de pintura, forma,
  retoque, seleção, destrutivas, transformação e 3D) mais ferramentas
  avulsas (lupa, balde, conta-gotas, texto, pincel de azulejo) e os
  potes de cor.
* À direita: painel de camadas e, embaixo, a matriz de animação.
* Embaixo: a barra de status (ferramenta, cor, pixel do cursor,
  tamanhos do canvas e da camada, zoom, rotação, nome do projeto).

Pressione ``Ctrl+Shift+P`` em qualquer lugar para abrir a paleta de
ações: todo item de menu, ferramenta e filtro pode ser invocado pelo
nome. Veja :doc:`interface`.
