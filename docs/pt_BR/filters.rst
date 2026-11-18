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

**Filtros** agrupa os 65 por tema; cada um também é uma ação
``filter-<id>`` na paleta. Com seleção flutuante ativa, só o conteúdo
mascarado é filtrado.

Desfoque (8)
------------

* **Desfoque gaussiano** (raio), **Desfoque de movimento** (ângulo,
  tamanho), **Pixelizar** (tamanho), **Desfoque de caixa** (raio),
  **Movimento circular** (ângulo), **Movimento de zoom**
  (intensidade), **Desfoque seletivo** (raio, delta máximo),
  **Desfoque de lente** (raio, lados).

Realce (7)
----------

* **Máscara de nitidez** (raio, intensidade, limiar), **Nitidez**,
  **Remover manchas** (raio, mediana), **Média SNN** (raio),
  **Passa-alta** (raio, contraste), **Serrilhado suavizado**,
  **Propagar valor** (modo, raio; dilatar/erodir).

Artístico (7)
-------------

* **Pintura a óleo** (tamanho, níveis), **Relevo** (profundidade,
  azimute), **Cartoon** (intensidade), **Fotocópia** (raio, viés),
  **Brilho suave** (raio, brilho, nitidez), **Meio-tom** (tamanho),
  **Mosaico** (largura/altura do azulejo).

Detectar bordas (7)
-------------------

* **Bordas Sobel** (direção), **Bordas neon** (raio, intensidade),
  **Bordas Laplace**, **Diferença de gaussianas** (raios),
  **Relevo fixo** (direção), **Altura para normal** (força, canal),
  **Gradiente da imagem** (Sobel colorido por canal).

Ruído (5)
---------

* **Ruído RGB**, **Arremessar**, **Espalhar**, **Ruído HSV**, **Ruído
  LCh** — granulação determinística (mesma semente repete).

Cores (23)
----------

* **Posterizar**, **Limiar**, **Inverter**, **Dessaturar**,
  **Cor para alfa**, **Balanço de cor**, **Misturador de canais**,
  **Colorir**, **Sépia**, **Exposição**, **Saturação**,
  **Clarear/Escurecer**, **Contraste automático**,
  **Inclinação/Deslocamento/Potência** (ASC-CDL por canal),
  **Misturador mono**, **Maximizar/Minimizar canal**,
  **Normalizar**, **Níveis** (canal, baixo, alto, gama),
  **Ajuste HSV**, **Paletizar**, **Mapa de gradiente**,
  **Propagar cores** (distância; alfa intacto).

Decoração (2)
-------------

* **Cantos arredondados** (raio), **Degradação de vídeo** (padrão,
  força: scanlines, quadriculado ou linhas deslocadas).

Distorção (6)
-------------

* **Ondas**, **Vento**, **Redemoinho**, **Coordenadas polares**,
  **Distorção de lente**, **Deslocar** (com repetição nas bordas).
