Importar e exportar
===================

Formato do projeto
------------------

Um projeto em pasta é ``project.json`` (camadas, transformações,
travas, células, animações) mais uma textura PNG ou WebP/JXL por
célula em ``cells/``. Aberturas nativas nunca alteram as texturas
guardadas; um pacote ``.gpp`` sobe o mesmo conteúdo para o
armazenamento do navegador.

Quadros e folhas
----------------

Exportar grava PNG, JPEG, WebP e spritesheets (linhas/colunas,
pintura por quadro). Marque **Exportar fundo** para assar um fundo
sob a imagem (igual ao projeto, cor sólida ou quadriculado
personalizado); desmarcado mantém a transparência onde o formato
suporta. As animações do spritesheet são escolhidas numa lista de
seleção múltipla (mais um checkbox de todos os quadros e listas
extras de quadros); o layout packed segue a configuração
"Pacotes largos de spritesheet" (colunas arredondadas para cima em
pacotes largos, para baixo nos altos). Marque **Exportar dados de
animação** (marcado por padrão, oculto em quadros individuais) para
salvar um JSON auxiliar junto da folha: após informar o nome do
arquivo (padrão é o nome do projeto) e escolher um diretório, a
textura da folha e um ``.json`` de mesmo nome com o tamanho da
textura, os retângulos dos quadros e a ordem dos quadros mais os
segundos por quadro das animações selecionadas são gravados nesse
diretório. As ações em massa de ajustar/cortar normalizam
antes; recarregar texturas restaura edições externas, pulando
texturas novas (desfazível).

Arquivos animados
-----------------

JXL, WebP, APNG (sem perda, o primeiro quadro serve também como imagem
estática) e GIF respeitam as durações dos quadros; o diálogo de
duração total divide igualmente pelo intervalo. WebM e MKV exportam
vídeo VP9 e MP4 exporta vídeo H.264 (todos pelo codificador da
plataforma, com o controle de qualidade definindo a taxa de bits);
opções cujo codec o navegador não codifica ficam desativadas com o
motivo. Todo vídeo termina com uma cópia invisível de 1 ms
do último quadro para o VLC exibir o verdadeiro último quadro.

Vetores, 3D e azulejos
----------------------

SVG importa renderizado na camada atual (recursos inválidos avisam;
``.svgz`` funciona). Modelos 3D (``.blend``/``.glb`` com texturas)
viram camadas com iluminação orbital. Qualquer textura vira tileset
para o pincel de azulejo; tilemaps ficam inline no ``project.json``.

Projetos de terceiros
---------------------

**Arquivo > Importar** lê Aseprite (tags viram animações nomeadas),
PSD/XCF em camadas (mesclagens preservadas) e Kra/GIF, com
tratamento de ocupação, corrupção e cancelamento — importação falha
nunca toca o projeto atual. Soltar um arquivo de imagem raster em
qualquer lugar do app importa ele como textura da célula atual (uma
célula ocupada mostra um erro pedindo uma célula vazia em vez de
criar camada). Soltar um arquivo de vetor (.svg/.svgz), modelo 3D
(qualquer formato carregável incluindo .blend) ou texto rico
(.html/.htm) importa ele como conteúdo de vetor, modelo ou texto da
célula atual, somente se ela estiver vazia. Soltar um arquivo de
projeto (.psd/.xcf/.kra/.krz/.ase/.aseprite) abre uma confirmação:
cancelar não faz nada, importar descarta o projeto atual e carrega o
arquivo.
