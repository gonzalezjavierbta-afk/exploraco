# DECISIONS.md - ExploraCO

Registro de decisiones arquitectonicas (ADR). Este documento NUNCA contiene tareas, solo decisiones (AI-DOS Cap. 9.4). Cada entrada sigue la estructura minima definida en AI-DOS Cap. 6.9: ID, Fecha, Autor, Problema, Opciones evaluadas, Decision tomada, Justificacion, Impacto, Estado.

---

## ADR-001: Prohibicion de frameworks frontend (React/Vue/etc.)

**ID:** ADR-001
**Fecha:** Julio 2026
**Autor:** Chief Architect (AI-DOS)
**Problema:** Se necesita elegir un enfoque de renderizado para las paginas publicas de ExploraCO (pagina-destino.js) y para el panel admin, considerando las restricciones de Vercel Hobby (sin build step complejo, funciones serverless livianas) y la necesidad de mantenibilidad por multiples IA a lo largo del tiempo.

**Opciones evaluadas:**
1. Usar React o Vue con build step (Next.js, Vite, etc.).
2. Usar HTML + JS Vanilla, con generacion de HTML en servidor por concatenacion de strings.

**Decision tomada:** Se prohiben los frameworks frontend (React, Vue u otros). Todo el sistema se construye en JS Vanilla estricto, con generacion de HTML server-side mediante concatenacion de strings.

**Justificacion:** Vercel Hobby impone limites estrictos de funciones serverless (8 endpoints) y de tiempos de build. Un framework con build step a\u00f1ade complejidad, tiempo de compilacion y una capa adicional de dependencias que dificulta el trabajo predecible entre multiples IA (Claude, Gemini, ChatGPT) editando el mismo codebase sin contexto compartido en tiempo real. El enfoque Vanilla JS + concatenacion es ligero, predecible y auditable directamente en texto plano por cualquier IA, sin necesidad de herramientas de build.

**Impacto:** Toda nueva funcionalidad (incluyendo las categorias Hostal, Comida y Evento) debe implementarse siguiendo el mismo patron de concatenacion de strings ya usado en pagina-destino.js v9. Prohibido introducir JSX, componentes de framework o pasos de build adicionales.

**Estado:** Aprobada y vigente.

---

## ADR-002: Mandato de Integridad ASCII-Safe en backend serverless

**ID:** ADR-002
**Fecha:** Julio 2026
**Autor:** Chief Architect (AI-DOS)
**Problema:** Los archivos api/*.js desplegados en Vercel Hobby fallaban en produccion con error FUNCTION_INVOCATION_FAILED (pagina 500 sin mensaje claro) cuando contenian caracteres no-ASCII (tildes, la letra "n" con tilde, emojis directos) o backticks.

**Opciones evaluadas:**
1. Mantener caracteres especiales directos (tildes, la letra "n" con tilde, emojis) en el codigo fuente de los endpoints.
2. Prohibir caracteres > 127 y backticks en todo archivo api/*.js, usando exclusivamente escapes Unicode simples (`\uXXXX`) para representar caracteres especiales dentro de strings JS.

**Decision tomada:** Se adopta el Mandato de Integridad ASCII-Safe: cero caracteres > 127, cero tildes, cero letra "n" con tilde directa, cero emojis directos y cero backticks en todo archivo dentro de api/*.js. Los caracteres especiales se representan exclusivamente con escapes Unicode simples (ej. `\u00f1` para la letra "n" con tilde).

**Justificacion:** La arquitectura serverless de Vercel Hobby tiene tolerancia cero a estos caracteres en el momento de invocacion de la funcion; su presencia produce errores 500 silenciosos y dificiles de depurar. El escape Unicode simple es interpretado correctamente por el motor JS en el navegador al renderizar el HTML generado, evitando el error sin sacrificar la visualizacion final del contenido para el usuario.

**Impacto:** Toda IA que edite archivos api/*.js debe verificar ASCII-safety antes de cada entrega (script de verificacion: contar bytes > 127, contar dobles escapes `\\u`, contar backticks; los tres conteos deben dar 0). El doble escape (`\\uXXXX`) queda documentado como bug conocido (ver BUGS_HISTORICOS.md BUG-002) y no como solucion valida.

**Impacto adicional:** Este mandato se extiende como practica de blindaje documental a los archivos del AI-DOS Core del proyecto (PROJECT.md, BLUEPRINT.md, DECISIONS.md, TASKS.md, NEXT.md, BUGS_HISTORICOS.md), que tambien se generan en formato 100% ASCII-safe usando escapes Unicode para cualquier caracter especial.

**Estado:** Aprobada y vigente.

---

## ADR-006: Baseline de verdad = archivo real, nunca el numero citado en un documento

**ID:** ADR-006
**Fecha:** Agosto 2026
**Autor:** Chief Architect (AI-DOS)
**Problema:** Un Context Package entregado a Claude para el Sprint 2 (Paridad Visual) citaba `admin.html` como un archivo de 4.817 lineas; el archivo real subido por Javier tenia 5.082 lineas antes de la intervencion (5.207 despues). TASKS.md tambien tenia una tarea (TSK-014) que pedia "fijar" admin.html en esa cifra exacta como metodo de verificacion de integridad.

**Opciones evaluadas:**
1. Confiar en la cifra citada en el Context Package y tratar la diferencia como un error a corregir en el archivo.
2. Verificar el archivo real primero (Reglas de Oro ExploraCO v5, punto 8) y tratar la cifra citada como informacion potencialmente desactualizada.

**Decision tomada:** Se descarta permanentemente cualquier metodo de verificacion de integridad basado en un numero de lineas fijo. El baseline de verdad es siempre el archivo que Javier entrega en el momento, nunca un numero citado en TASKS.md, NEXT.md o en un Context Package de otra sesion de IA.

**Justificacion:** Un conteo de lineas exacto es fragil por diseno: cualquier adicion legitima de funcionalidad (como los campos nuevos de este mismo sprint) lo invalida de inmediato. La verificacion real de integridad estructural ya existe y es mas robusta: balance de `<div>` por zona de categoria y `node --check` para sintaxis (ver BLUEPRINT.md, seccion 8). Ese fue el metodo usado para verificar esta entrega.

**Impacto:** TSK-014 se cierra con el alcance real ejecutado en Sprint 2 (ver TASKS.md), no con el criterio original de "4.817 lineas exactas". Toda IA que reciba un Context Package de otra sesion debe tratar cualquier cifra o "baseline de verdad" citada ahi como una hipotesis a verificar contra el archivo real, no como un hecho.

**Estado:** Aprobada y vigente.

---

## ADR-003: Protocolo de persistencia JSONB por Merge (no reemplazo total)

**ID:** ADR-003
**Fecha:** Julio 2026
**Autor:** Chief Architect (AI-DOS)
**Problema:** El campo `destinos.tags` (JSONB) almacena datos especificos por categoria. Al reescribir admin-destinos.js (v2) era necesario decidir como persistir actualizaciones parciales de este campo sin perder datos ya guardados por ediciones o categorias anteriores.

**Opciones evaluadas:**
1. Reemplazar el campo `tags` completo en cada UPDATE con el payload recibido (`SET tags = $new_tags`).
2. Fusionar (merge) el payload nuevo sobre el valor existente usando el operador JSONB `||` de PostgreSQL (`SET tags = COALESCE(tags,'{}') || $new_tags::jsonb`).

**Decision tomada:** Se adopta el Protocolo de Merge: toda actualizacion de `tags` debe fusionar datos, nunca reemplazar el objeto completo.

**Justificacion:** Un reemplazo total borraria de forma silenciosa cualquier dato de `tags` que no venga incluido en el payload de la edicion actual (por ejemplo, editar solo el tab de "Fotos" borraria los datos de "Itinerario" si el payload no los reenvia). El merge JSONB nativo de PostgreSQL resuelve esto sin logica adicional en el backend.

**Impacto:** La regla de "Cero Borrado Logico" se aplica tambien a los IDs logicos del contrato de datos v107 (ej. `#db-lineup`, `#meta-fecha`), que deben permanecer en el codigo aunque no sean visibles, para no romper el flujo del orquestador.

**Estado:** Aprobada y vigente.

---

## ADR-004: Aislamiento atomico de estilos por categoria (Scoped CSS)

**ID:** ADR-004
**Fecha:** Julio 2026
**Autor:** Chief Architect (AI-DOS)
**Problema:** Al agregar nuevas categorias (Hostal, Comida, Evento) sobre el mismo motor de renderizado (pagina-destino.js), existe riesgo de que el CSS de una categoria sobreescriba o interfiera con el de otra (ej. estilos de "Hostal" afectando el layout de "Sitio").

**Opciones evaluadas:**
1. Mantener una unica hoja de estilos global compartida entre todas las categorias.
2. Aislar el CSS de cada plantilla/categoria bajo un selector padre unico (scoped), con reset de silo al inicio de cada bloque.

**Decision tomada:** Todo CSS de una seccion o plantilla debe vivir bajo un selector padre unico (ej. `.tpl-pX`, `.cat-sitio`, `.cat-hostal`). Cada bloque de estilos debe neutralizar al inicio los margenes o posiciones que el Maestro pueda imponer por defecto (Reset de Silo).

**Justificacion:** Con 4 categorias compartiendo el mismo archivo de renderizado y evolucionando en paralelo (potencialmente por distintas IA), el aislamiento atomico es la unica forma de garantizar que agregar "Comida" no rompa visualmente "Sitio" ya en produccion.

**Impacto:** Toda entrega debe validar paridad visual de 1px entre el Silo de pruebas y el Master en produccion antes de considerarse valida (Prueba de Carga Dual, Reglas de Oro ExploraCO v5, punto 8).

**Estado:** Aprobada y vigente.

#### ADR-005: Validaci\u00f3n de Sintaxis JS Obligatoria
**Problema:** Errores de factor humano en la concatenaci\u00f3n manual de strings (comillas sin cerrar) pasan el filtro ASCII y rompen el sitio [1].
**Decisi\u00f3n:** Todo archivo entregado para la carpeta `api/` debe ser validado con `node --check` antes del deploy [1].
**Impacto:** Mitigaci\u00f3n de errores 500 por fallos de carga de m\u00f3dulo.

---

## ADR-007: Quick-Rating (voto sin texto) como calificaci\u00f3n de un solo uso por usuario

**ID:** ADR-007
**Fecha:** Agosto 2026
**Autor:** Chief Architect (AI-DOS) con decisiones de producto confirmadas por Javier

**Problema:** El site ya ten\u00eda un endpoint `POST tipo=rating` (voto de 1-5 sin texto) pero no estaba expuesto en la UI. Al exponerlo como widget r\u00e1pido en la p\u00e1gina p\u00fablica de destino surgieron 3 conflictos de dise\u00f1o: (1) el voto r\u00e1pido no deduplicaba (un usuario pod\u00eda votar infinitas veces y distorsionar el promedio); (2) `total_resenas` contaba solo rese\u00f1as con texto mientras el promedio (`rating`) mezclaba resena+rating, generando un desfase AVG/COUNT; (3) el voto r\u00e1pido permit\u00eda `usuario_id` nulo, dejando el promedio vulnerable a votos an\u00f3nimos.

**Opciones evaluadas:**
1. **Dedup sim\u00e9trico (elegida):** una sola calificaci\u00f3n por usuario y destino. El POST de voto r\u00e1pido y el de rese\u00f1a se rechazan mutuamente con 409 si el usuario ya calific\u00f3 (de cualquier tipo). Alternativa descartada: upgrade de rating a resena (convierte la fila cuando el usuario escribe texto) -- m\u00e1s amigable pero agrega l\u00f3gica de mutaci\u00f3n de tipo y riesgo de doble conteo.
2. **Voto r\u00e1pido sin sesi\u00f3n:** se descart\u00f3 crear sesi\u00f3n temporal (patr\u00f3n de publicarResena) porque un voto sin texto no justifica crear usuarios con email inventado; un toque de estrella sin sesi\u00f3n abre el modal de login.
3. **Unificar glifos:** se descart\u00f3 migrar todas las estrellas del renderer (rbstars/rvstars/etc.) de `*` a \u2605 para el alcance actual; solo el widget nuevo usa \u2605/\u2606 para minimizar superficie de QA. Queda como candidato futuro de pulido visual.
4. **Etiqueta del contador:** se mantiene "N resenas" aunque `total_resenas` ahora incluye votos sin texto (el n\u00famero es el mismo que el numerador del promedio).

**Decisi\u00f3n tomada:** El voto r\u00e1pido es una calificaci\u00f3n de un solo uso por usuario y destino (dedup sim\u00e9trico sobre `tipo IN ('resena','rating')`). Requiere sesi\u00f3n (`400 Se requiere usuario_id` si falta). Ambos rec\u00e1lculos (AVG y `total_resenas`) operan sobre resena+rating para mantener coherencia. Se agrega `GET tipo=mi_rating` para precargar el voto del usuario en el widget.

**Justificaci\u00f3n:** El dedup sim\u00e9trico es la forma m\u00e1s simple de garantizar "una calificaci\u00f3n por usuario" sin filas de doble conteo, y cierra el vector de voto an\u00f3nimo infinito que el endpoint permit\u00eda. La alineaci\u00f3n AVG/COUNT elimina el desfase hist\u00f3rico (el promedio ya mezclaba ambos tipos desde la v4). No hay migraci\u00f3n de datos: los destinos existentes convergen de forma natural en el primer POST de cualquiera de los dos tipos.

**Impacto:** `api/interacciones.js` (POST rating + dedup de resena + GET mi_rating + UPDATE de destinos alineado), `api/admin.js` (rec\u00e1lculo del DELETE sobre resena+rating; la lista del panel sigue mostrando solo rese\u00f1as con texto), `usuario-session.js` (metodos `votar`/`obtenerMiVoto`), `api/pagina-destino.js` (widget `#qr-stars` solo si `cat !== 'blog'`). Consecuencia de producto asumida: quien da voto r\u00e1pido sin texto ya no puede escribir rese\u00f1a en ese lugar (recibe 409).

**Estado:** Aprobada y vigente.

---

## ADR-008: Toda alteracion de schema/trigger debe vivir en el repo como .sql versionado (gobernanza de BD)

**ID:** ADR-008
**Fecha:** Agosto 2026
**Autor:** Chief Architect (AI-DOS) con decision de Javier

**Problema:** En produccion existia un trigger de base de datos `trg_xp_on_interaccion` con su funcion `fn_actualizar_xp()`, residuo de una sesion de IA anterior, que NO figuraba en ningun archivo del repositorio. Ese trigger insertaba en `xp_historial` con valores que violaban sus restricciones (NOT NULL/FK), por lo que los 4 POST de interaccion (`resena`, `rating`, `visita`, `guardado`) fallaban con 500 en produccion (ver BUGS_HISTORICOS.md BUG-021). Ademas, la migracion documentada en la cabecera de `api/interacciones.js` (`interacciones.activo` y `usuarios.progreso_misiones`) nunca se habia ejecutado en la base de produccion. Ambos problemas comparten la misma raiz: cambios de estado de BD aplicados como SQL suelto en la consola de Neon, sin versionamiento ni registro documental.

**Opciones evaluadas:**
1. Mantener el flujo actual: ejecutar SQL suelto en Neon cuando se necesite, registrando despues en BUGS_HISTORICOS.md.
2. Exigir que toda alteracion de schema, trigger, funcion o migracion viva en el repositorio como archivo `.sql` versionado (por ejemplo `db/migrations/`), acumulativo y re-aplicable (`IF NOT EXISTS`), y que se registre en el AI-DOS Core al crearse.

**Decision tomada:** Se adopta la opcion 2 (Gobernanza de BD). Toda alteracion de schema/trigger/funcion debe existir en el repositorio como SQL versionado antes de aplicarse a produccion; queda prohibido ejecutar SQL de estructura directamente en la consola de Neon como paso unico sin dejar el archivo en el repo. Un arreglo de emergencia en produccion (como el de BUG-021) es valido, pero inmediatamente despues debe materializarse como `.sql` en el repo y registrarse en BUGS_HISTORICOS.md/DECISIONS.md para que el estado de la BD sea reproducible y auditable por cualquier IA.

**Justificacion:** BUG-021 demostro que el estado real de la BD de produccion no se puede deducir del codigo: habia objetos (trigger/funcion) que nadie en el proyecto sabia que existian, y columnas que el codigo ya usaba y no estaban creadas. Sin versionamiento, la proxima IA que levante una base nueva no puede reproducir el estado correcto, y un problema de este tipo tarda una sesion entera en diagnosticarse. La migracion acumulativa con `IF NOT EXISTS` (patron ya usado en la cabecera de interacciones.js) es idempotente y segura de re-aplicar.

**Impacto:** A partir de esta decision, cualquier cambio de estructura de BD (CREATE/DROP/ALTER de tablas, triggers, funciones, columnas) se materializa como archivo `.sql` en el repo (carpeta `db/migrations/`) y se referencia en el AI-DOS Core. El SQL de datos (INSERT/UPDATE puntual de contenido) no requiere archivo, pero los cambios de estructura si. El fix de BUG-021 queda registrado como el caso fundacional que origina la politica.

**Estado:** Aprobada y vigente.

---

## ADR-009: Rating de destinos sin resenas = 0 (sin valores hardcodeados) + destacado por decision editorial

**ID:** ADR-009
**Fecha:** Agosto 2026
**Autor:** Chief Architect (AI-DOS) con decisiones de producto confirmadas por Javier

**Problema:** Al crear paginas dinamicas nuevas (lacandelaria.html, luego bogota.html) surgio la pregunta de como poblar el rating y el contador de resenas. Monserrate muestra 4.9/4820 porque su fila en la BD tiene esos valores seteado fuera de banda (los recalculos de `api/interacciones.js` en cada POST no los bajarian). Para destinos nuevos no existia criterio claro: hardcodear un rating alto inflaria artificialmente el destino frente a competidores con resenas reales; dejarlo en 0 mostraba "0 resenas" en el hero y en los directorios.

**Opciones evaluadas:**
1. **Hardcodear rating/contador (ej. 4.7/2500)** -- como Monserrate. Ventaja: la pagina se ve "viva" desde el dia 1. Desventaja: datos falsos; el promedio que mostraria no corresponde a resenas reales y distorsiona la comparacion con destinos legitimos.
2. **Dejar rating en 0 hasta que lleguen resenas reales (elegida)** -- la fila nueva se crea sin `rating`/`total_resenas`, el motor muestra "0 resenas" y "Se el primero en dejar una resena", y el numero sube de forma organica con cada `POST interacciones` (el recalculo AVG/COUNT ya esta alineado por ADR-007/ADR-008).
3. **Destacado como mecanismo editorial** -- `destacado=true` en la fila nueva da prioridad visual en homepage/directorios (independiente del rating), de modo que un destino nuevo sin resenas aun puede ganar visibilidad sin fabricar rating.

**Decision tomada:** Todo destino dinamico nuevo se crea con `rating`/`total_resenas` sin setear (quedan en 0) y `destacado=true` por decision editorial explicita de Javier. No se hardcodean resenas ni ratings. El hero y los directorios muestran "0 resenas"; el numerador crece solo con interacciones reales (ADR-007/008).

**Justificacion:** La opcion 2 preserva la integridad de los datos de rating (una de las metricas sociales mas valiosas del site) y evita que un destino nuevo compita con cifras falsas. El `destacado` desacopla la visibilidad del rating: permite destacar contenido nuevo curado (ej. Bogota, la capital) sin mentir sobre su calificacion. Coherente con la filosofia del proyecto (ADR-007 dedup, ADR-008 recalculo dinamico).

**Impacto:** Los seeds de destinos dinamicos (`seed-lacandelaria.js`, `seed-bogota.js`) NO escriben `rating`/`total_resenas`. El motor de `pagina-destino.js` y el listado `/api/destinos` muestran 0 hasta el primer POST de interaccion. Documenta la excepcion de Monserrate (rating/contador seteado fuera de banda en la BD, por decision historica previa).

**Estado:** Aprobada y vigente.

---

## ADR-010: Multi-tema en tags JSONB -- tags.temas[] (array) + tags.tema (primario) para compatibilidad

**ID:** ADR-010
**Fecha:** Agosto 2026
**Autor:** Chief Architect (AI-DOS) con decision de producto confirmada por Javier

**Problema:** La primera entrada real de blog (monserrate-guia-completa, TSK-043) necesitaba representar mas de un tema (cultura, naturaleza, aventura, tips, gastro) tanto para el chip del hero, el filtro de la seccion Inspirate de index.html y las keywords del JSON-LD (schemaLD) como para el formulario de admin. El modelo existente solo tenia `tags.tema` (string unico), que obligaba a elegir un solo tema y no permitia filtrar un post por varios temas ni generar keywords multiples.

**Opciones evaluadas:**
1. **Mantener un solo `tags.tema` (string)** y elegir el tema "mas importante" del post. Ventaja: cero cambios. Desventaja: un post de guia completa como Monserrate (historia + naturaleza + gastronomia + tips) queda mal representado, el filtro de Inspirate no lo encuentra por temas secundarios y el JSON-LD pierde keywords valiosas para SEO.
2. **Introducir `tags.temas[]` (array JSONB) como modelo primario, conservando `tags.tema` como derivado de compatibilidad (elegida).** El formulario de admin guarda el array; `tags.tema` (string) se deriva automaticamente como `temas[0]` para no romper ni el chip del hero existente ni ningun codigo previo que lea `tema`. Los puntos de lectura (toPlace(), Inspirate, temasBlog del renderer, schemaLD) prefieren el array y caen al string como fallback.
3. **Modelo relacional de temas (tabla aparte).** Descartado: agrega complejidad innecesaria para un modelo JSONB que ya escala por categoria (ADR-003) y el presupuesto de endpoints Vercel Hobby esta agotado (8/8).

**Decision tomada:** Todo contenido con categoria blog (y, por extension, cualquier destino futuro) puede llevar `tags.temas` (array de strings, ordenado por prioridad editorial). El primario `tags.tema` se conserva como campo de compatibilidad y se deriva de `temas[0]` cuando el origen es el formulario de admin (`_buildTagsObj()`). En los puntos de lectura se usa el patron `Array.isArray(tags.temas) && tags.temas.length ? tags.temas : [tags.tema]` para que el sistema funcione con datos nuevos (array) y viejos (solo string).

**Justificacion:** El array en JSONB no requiere migracion de esquema (vive dentro de `tags`, ya cubierto por el MERGE de ADR-003) y resuelve los 3 casos de uso reales: filtro de Inspirate por varios temas (`tArr.indexOf(filter) >= 0`), keywords del JSON-LD (`join(', ')`) y chips de tema del hero. Conservar `tags.tema` evita romper el chip existente y cualquier codigo previo que solo conozca el string. La derivacion automatica en el admin (en vez de pedirle al usuario que marque el mismo tema dos veces) reduce friccion y garantiza consistencia.

**Impacto:** `api/destinos.js` toPlace() expone `temas` (tags.temas[] o [tags.tema]) manteniendo `tema`; `index.html` (Inspirate) usa `tArr[0]` y filtra con `indexOf`; `api/pagina-destino.js` normaliza `temasBlog` para los chips del hero y agrega keywords multi-tema al schemaLD; `admin.html` convierte `f-blog-tema` en `<select multiple>` registrado en `CATEGORY_TAG_FIELDS.blog` con `multi:true`, deriva `tags.tema = p.temas[0]` en `_buildTagsObj()` y envuelve `tags.tema` en `local.temas` en `_applyTagsToLocal()`. El seed del post usa explicitamente `tema: 'cultura'` + `temas: [...]`. Pendiente: estos cambios NO estan desplegados (deploy de Vercel bloqueado, ver TASKS.md TASK-011); el post publicado funciona en produccion porque su chip "Cultura" sale de `temas[0]`/`tema` via la compatibilidad.

**Estado:** Aprobada y vigente.

## ADR-011: Variante de diseno propia para el post de blog -- moderno minimalista, distinto del render de destinos

**ID:** ADR-011
**Fecha:** Agosto 2026
**Autor:** renderer-dev con decision de producto confirmada por Javier (Fase 4)

**Problema:** El post de blog (monserrate-guia-completa) usaba el MISMO sistema de diseno que los destinos: hero negro con gradiente y grid de 3 thumbs, subnav sticky, numeracion dorada por seccion y barra de rating `.gstrip`. Visualmente un articulo no se distinguia de un lugar, diluyendo la identidad editorial de la seccion Inspirate y mezclando senales de "lugar visitable" (rating, precio, botones de contacto) en un contenido que no las necesita.

**Opciones consideradas:**
1. **Editorial clasico (casi sin cambio):** mantener el hero negro y el subnav, retocar solo la tipografia. Desventaja: sigue pareciendo un "lugar", no resuelve la distincion.
2. **Moderno minimalista (elegida):** hero de portada ancha + bloque titulo/lead/chips limpio sobre fondo crema, sin grid de thumbs, sin subnav sticky, sin numeracion dorada, sin gstrip, columna de lectura ~720px. Distingue claramente un articulo de un destino con cambios puramente CSS/render dentro de `api/pagina-destino.js`.
3. **Magazine (sidebar):** grid de lectura + sidebar con indice/autor/relacionados. Potente pero mas complejo y alejado del estilo del sitio.

**Decision tomada:** Toda pagina con `categoria_slug === 'blog'` usa una variante de diseno propia activada por la clase `<body class="blog">` mas un hero dedicado `.bhero`. Concretamente: (a) hero `.bhero` con `.bcover` (foto de portada a todo el ancho, `min(52vh,440px)`) y bloque `.bhin`/`.bhtitle`/`.bhslead`/`.bchips` (chips tema/ciudad/lectura/autor) sobre fondo `var(--warm)`; (b) sin `.prow` (grid de 3 thumbs), sin botones Contactar/Como llegar/Guardar/Estuve aqui y sin `.gstrip` (desactivada para blog); (c) sin `subnav` sticky; (d) CSS `body.blog .sin{max-width:720px}` para columna de lectura, `body.blog .stext{font-size:16px;line-height:1.8}`, `body.blog .stnum{display:none}` para ocultar la numeracion dorada (el `.stnum` sigue en el DOM, oculto por CSS). Las secciones del articulo (La historia con `.bfig`, video, FAQs, resenas, autor) se conservan intactas.

**Justificacion:** El cambio es puramente de render/CSS y no toca el modelo de datos ni el backend; se activa por `categoria_slug`, asi que los destinos de las demas categorias conservan exactamente su diseno actual. El patron "clase en body + hero dedicado" es extensible a futuras variantes por categoria sin duplicar el ensamblado. Reduce el HTML del post de 80.4KB a 61.0KB y el tiempo de lectura de ~31 a ~15 min tras el recorte editorial (Fase 5, TASK-019).

**Impacto:** `api/pagina-destino.js` (CSS nuevo `.bhero`/`.bhin`/`.bhew`/`.bhtitle`/`.bhslead`/`.bchips`/`.bcover`, `body.blog.*`, hero condicional por `cat==='blog'`, `subnav=''` y `gstrip=''` para blog, clase `blog` en `<body>`). No afecta a los 8 endpoints ni a index.html/admin.html. El seed de Monserrate se recorto de 6.278 a 3.018 palabras (script Node de reemplazo exacto, separador real `\n\n` dentro del string JS) conservando los 4 marcadores `[foto:]` y las 5 FAQs.

**Estado:** Aprobada y vigente.

## ADR-012: Sistema de logros/trofeos (estilo consola + coleccion por ciudad Upland) y voto rapido en blogs como alimentador del progreso gamer

**ID:** ADR-012
**Fecha:** Agosto 2026
**Autor:** Chief Architect (AI-DOS) con decisiones de producto confirmadas por Javier

**Problema:** La gamificacion existia fragmentada (XP por accion en `api/interacciones.js`, 6 misiones con progreso en `usuarios.progreso_misiones`, 6 niveles y 7 insignias calculados en `api/usuarios.js`/`index.html`), pero no habia un sistema de trofeos desbloqueables estilo consola (Xbox/PlayStation/Steam: tier bronce/plata/oro/platino, rareza %, fecha de desbloqueo), ni logros de coleccion por ciudad tipo Upland (juntar "propiedades" del mapa), y el voto rapido (1-5 estrellas, +10 XP) estaba suprimido en las paginas de blog (`esBlogRes ? '' : '<div id="qrwrap">'`), por lo que los articulos no recibian puntuacion y no alimentaban la progresion.

**Opciones evaluadas:**
1. **Extender MISIONES existente:** anadir mas misiones al catalogo actual sin migracion. Rapido, pero los trofeos quedarian como "misiones" sin tier/rareza/fecha y se mezclaria el concepto de progreso por tarea con el de logro por hito.
2. **Catalogo LOGROS paralelo + columna `usuarios.progreso_logros` (elegida):** mismo patron que MISIONES (codigo estatico server-side, DAG via `requiere`, evaluacion dentro de `interacciones.js`, merge `||` segun ADR-003) pero con shape de consola (`tier`, `xp`, fecha) y un GET `tipo=logros` que devuelve estado + rareza global % (Steam) con una sola query agregada (`jsonb_object_keys`). Costo: una migracion `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` versionada (ADR-008).
3. **Endpoint nuevo `/api/logros.js`:** cabe en el presupuesto (8/12 funciones), pero viola el principio vigente de no crear endpoints nuevos cuando el presupuesto mental del proyecto lo tiene agotado y se resuelve igual con un branch GET en `interacciones.js`.

**Decision tomada:** Se adopta la opcion 2. Catalogo `LOGROS` estatico en `api/interacciones.js` (16 trofeos: 6 de voto/opinion general, 5 de conteo de coleccion/visitas, 5 de coleccion por ciudad generados desde `CIUDADES_COLECCION`), progreso en `usuarios.progreso_logros` (nueva columna, migracion `db/migrations/005_usuarios_progreso_logros.sql`), evaluado por `evaluarLogros()` en cada accion de XP (resena, guardado, visita, rating) con agregados memoizados para no disparar una query por trofeo. Las respuestas de `interacciones.js` anaden `logros` (array) manteniendo `misiones` (compatible con callers previos). GET `tipo=logros&usuario_id=` devuelve el catalogo con estado/fecha/tier y rareza % calculada sobre usuarios activos. `api/usuarios.js` deriva `total_logros` del conteo de claves (como nivel/badge, nunca se guarda). Los nombres de ciudad se comparan normalizados (TRANSLATE sin tildes + LOWER) porque en Neon conviven 'Bogota' y 'Bogot\u00e1' segun el seed. El voto rapido se habilita TAMBIEN en blog (widget `#qr-stars` en todas las categorias, copy "Califica este articulo", contador "N opiniones") y las tarjetas de Inspirate/blog.html muestran el badge `[estrella] rating (N)`.

**Justificacion:** Reutiliza el patron MISIONES ya probado (evaluacion server-side, DAG, merge JSONB) sin inventar un mecanismo nuevo, anade el vocabulario de consola que pidio el producto (tier + rareza + fecha), y no consume funciones serverless nuevas. Habilitar el voto en blogs cierra el ciclo pedido: un articulo se puntua, esa puntuacion alimenta la media del destino (que ya cuenta `resena`+`rating`, ADR-007) y el voto otorga +10 XP que dispara los logros `logr_primer_voto`/`logr_votos_blog_*` y la progresion. La normalizacion de ciudad hace robustos los logros de coleccion sin depender de que los seeds futuros usen una sola grafia.

**Impacto:** `api/interacciones.js` (v5, header + migracion, catalogo LOGROS, evaluarLogros, GET tipo=logros, respuestas con `logros`); `db/migrations/005_usuarios_progreso_logros.sql` (nuevo); `api/usuarios.js` (`total_logros`); `usuario-session.js` (helpers `sumaLogrosXp`/`mostrarLogrosToast` en las 4 acciones); `api/pagina-destino.js` (voto rapido en blog); `index.html` (seccion Trofeos en perfil con barra X/Y y rareza %, badge de rating en tarjetas Inspirate); `api/utilidades.js` (blog-lista con `rating`/`total_resenas` y badge). Pendiente de ejecutar la migracion 005 en Neon antes del deploy (ADR-008: SQL versionado, no suelto).

**Estado:** Aprobada y vigente.

## ADR-013: La pagina web oficial (`destinos.web`) como informacion prominente del hero de la ficha, no solo un boton de Contacto

**ID:** ADR-013
**Fecha:** Agosto 2026
**Autor:** Chief Architect (AI-DOS) con decision de producto confirmada por Javier

**Problema:** El campo `destinos.web` (pagina web oficial de cada lugar/evento/sitio/restaurante/bar) se capturaba en el formulario publico `publicar.html` (campo `sitio_web`) y en el admin (`f-web`), se persistia en la columna `destinos.web` y viajaba en los JSON de `/api/destinos`, `/api/admin-destinos` y en los conectores frontend (`index-api-connector.js:57`, `directorio-api-connector.js:51`). Sin embargo, se publicaba en UN solo punto del sitio: como boton secundario "Sitio web" dentro de la grilla de la seccion Contacto al final del detalle (`pagina-destino.js:1554`), en igual jerarquia que WhatsApp/Llamar/Instagram/Email. No se mostraba en el home, ni en las tarjetas de los directorios, ni en la agenda, ni siquiera como texto de dominio en el hero; el schemaLD JSON-LD tampoco usaba `web`. Dado que la web oficial es el nucleo de la comunicacion oficial de un destino, quedaba subutilizada.

**Opciones evaluadas:**
1. **Solo boton de Contacto actual (sin cambio):** mantener el statu quo. Mas simple, pero dejaba la info oficial escondida al final de la pagina y ausente de las superficies de alto trafico.
2. **Elevar `web` al hero de la ficha individual (elegida):** anadir el dominio como chip-link informativo en la fila HQI del hero y un boton CTA primario "Sitio web oficial" (`hbtn`) en las acciones del hero. Acotado a la ficha, no toca index.html ni los directorios. Excluir blogs (un articulo no es un lugar con sitio oficial).
3. **Tambien en home/directorios/agenda/schemaLD:** alcance total. Mas visible aun, pero multiplica superficies de render (index.html `renderDest`/`renderAgenda`, `directorio-*.html` `renderDir` + fallback `var PLACES`, agenda `toAgendaEvent`, JSON-LD) y el fallback `var PLACES` ni siquiera contiene el campo `web`, ampliando el trabajo.

**Decision tomada:** Se adopta la opcion 2. `api/pagina-destino.js` gana un helper `dominioWeb(u)` que extrae el hostname legible (sin protocolo ni `www.`), un chip-link `.hqi.hqilink` en la fila HQI del hero que muestra el dominio como informacion visible en el detalle, y un boton CTA primario "Sitio web oficial" (`hbtn`) al inicio de las acciones del hero (`hctar`). El boton secundario "Sitio web" de la seccion Contacto se conserva (refuerza, no duplica). Ambos se emiten solo cuando `d.web` existe, con `if (d.web)` y escape `esc()`. Los blogs quedan excluidos. No se modifican home, directorios, agenda ni schemaLD en esta tarea (backlog documentado).

**Justificacion:** El hero es la superficie de mayor atencion y conversion de la ficha; colocar ahi la web oficial la posiciona como informacion institucional, no como un contacto mas al pie. Mostrar el dominio como texto (no solo un boton) la convierte en dato verificable de cara al E-E-A-T y a la confianza del viajero, sin depender de clics. Limitar a la ficha mantiene el cambio acotado, auditable y conforme al mandato ASCII-safe y al patron de concatenacion de strings.

**Impacto:** `api/pagina-destino.js` (helper `dominioWeb`, CSS `.hqi.hqilink`, chip HQI condicional `if (d.web)`, boton hero condicional). Zero cambios en los 8 endpoints, index.html, directorios, agenda publica ni JSON-LD (quedan como backlog). La verificacion del Escudo GOLD aplica igual: `node --check`, ASCII-safety (0 bytes >127, 0 backticks), smokes `buildHTML()` con y sin `web` (PASS) y los 39 smokes existentes PASS.

**Estado:** Aprobada y vigente.