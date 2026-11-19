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
suporta. As ações em massa de ajustar/cortar normalizam
antes; recarregar texturas restaura edições externas, pulando
texturas novas (desfazível).

Arquivos animados
-----------------

JXL, WebP e GIF respeitam as durações dos quadros; o diálogo de
duração total divide igualmente pelo intervalo. WebM e MKV exportam
vídeo VP9 e MP4 exporta vídeo H.264 (todos pelo codificador da
plataforma, com o controle de qualidade definindo a taxa de bits);
opções cujo codec o navegador não codifica ficam desativadas com o
motivo.

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
nunca toca o projeto atual.
