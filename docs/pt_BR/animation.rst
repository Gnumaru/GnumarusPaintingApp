Animação
========

A matriz
--------

Linhas são camadas (de cima para baixo, como no painel), colunas são
quadros. Cabeçalhos renomeiam inline (duplo clique, ``Enter``
confirma, ``Esc`` sai), definem duração por quadro e adicionam/removem
quadros; ``+`` anexa um quadro. Clique seleciona, ``Ctrl`` alterna
quadros descontínuos, ``Shift`` une o intervalo. Células escolhem
camada × quadro ativos; vazias materializam na primeira pintura.

Onion skin
----------

Fantasmas dos quadros vizinhos ladeiam o atual (contagem por lado,
alternância + configurações persistem) para manter os intervalos no
modelo.

Reprodução e duração
--------------------

O transporte toca do quadro atual, avançando pela duração de cada
quadro (configuração de duração padrão inclusa). Cabeçalhos mostram
em dica quais animações incluem o quadro.

Animações nomeadas
------------------

Defina strings ``nome,loop,quadros`` (loop é um de ``none``,
``forward``, ``ping-pong``, ``backward`` ou ``ping-pong-backward``;
lista + destaque + reprodução restrita, importação de tags do Aseprite)
e exclua com confirmação.
A paleta oferece menus de quadro/camada, navegação por setas e menus
de contexto para excluir em massa, duração por intervalo e duração
total (dividida igualmente).

Exportação
----------

**Arquivo > Exportar** grava quadros, arquivos animados com/sem
perdas e spritesheets (JXL, WebP, PNG, JPEG, GIF), com ações em massa
de ajustar/cortar tudo e recarregar texturas de edições externas.
