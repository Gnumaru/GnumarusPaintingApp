Seleções
========

Ferramentas
-----------

Cinco ferramentas dividem a gaveta: **retangular** e **elíptica**
(arraste; ``Shift`` soma, ``Ctrl+Shift`` intersecta, ``Alt+Shift``
subtrai, formas pendentes mostram alças), **laço**, **laço poligonal**
e **seleção por cor** (limiar mais contíguo). ``R``/``V`` pulam para
as ferramentas de seleção.

Seleção flutuante
-----------------

Pintar dentro de uma seleção, ou movê-la, eleva o conteúdo para uma
*seleção flutuante*: a textura original fica preservada embaixo até
confirmar (``Enter``) ou cancelar (``Esc``, restaurando). Cada traço
sobre ela é uma entrada de desfazer. Sem seleção flutuante, não há
seleção.

Área de transferência
---------------------

* ``Ctrl+C`` copia a seleção flutuante (pixels + máscara).
* ``Ctrl+Shift+C`` copia o composto visível.
* ``Ctrl+X`` recorta, ``Ctrl+V`` cola de volta como flutuante. Colar
  mescla o alfa sobre a camada.

Operações booleanas
-------------------

Somar, intersectar e subtrair combinam a forma pendente com a seleção
atual; **suavizar borda** amacia a margem, **expandir/encolher** cresce
ou contrai a área em pixels, e inverter troca tudo.

Transformando seleções
-----------------------

Com conteúdo flutuante, arraste âncoras para mover, redimensionar,
girar, inclinar e espelhar; a alça central redefine. O mesmo gizmo
move as ferramentas não destrutivas de célula (mais variante de
rotação 3D), e segurar ``Alt`` proporcionaliza. **Cortar para o
canvas** apara a textura nos limites.
