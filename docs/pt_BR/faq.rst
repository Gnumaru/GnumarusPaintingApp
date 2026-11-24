Perguntas frequentes
====================

Canvas preto / mensagem de WebGL2
---------------------------------

A GPU ou o navegador recusou o contexto WebGL2. Use Chromium com
aceleração de hardware; área remota e VMs pedem o driver 3D ligado.

Salvar pede pasta toda vez
--------------------------

Navegadores não-Chromium não retêm permissão de pasta: use **Salvar
projeto como** no armazenamento do navegador, ou use Chromium para
projetos em pasta de verdade.

O Pixel Dither pinta chapado com mouse
--------------------------------------

O mouse sempre lê pressão máxima e o padrão Bayer enche. Baixe o
**Fluxo** (visível em toda ponta): ele ralenta o dithering como a
pressão leve da caneta.

A paleta lista ferramentas e filtros também
-------------------------------------------

Sim — toda ação ``tool-<nome>`` e ``filter-<id>`` roda pelo
``Ctrl+K`` pelo nome, inclusive as exigentes de seleção
flutuante (que informam o motivo do bloqueio).

Uma importação falhou
---------------------

Arquivos corrompidos, com senha ou sem suporte abortam antes de tocar
o projeto; a barra de status dá o motivo. Teste a limpeza de
importação (nenhuma/ajustar/cortar) para texturas estranhas.

Onde estão meus arquivos?
-------------------------

Projetos em pasta guardam ``project.json`` + texturas em ``cells/``
(mais tilemaps e conteúdos inline). Projetos embutidos vivem no
navegador; exporte ``.gpp`` para trocar de máquina.
