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

---

## ADR-014: Milestones v2 -- Plan Maestro de Gaming (Steam + SKATE + Albion)

**ID:** ADR-014
**Fecha:** Septiembre 2026
**Autor:** Chief Architect (AI-DOS) con decisiones de producto confirmadas por Javier (spec/prompt `prompt gsming.txt`)
**Nota de numeracion:** el codigo de esta entrega referencia "ADR-013" en comentarios (ej. `api/interacciones.js` "Milestones v2 / ADR-013"), pero ese numero ya estaba asignado a la web oficial en el hero (ADR-013 de Agosto 2026, TSK-075). Por ADR-006 (baseline = archivo real) y Cero Borrado Logico, esta decision se registra como **ADR-014**; los comentarios del codigo quedan como estan (referencia interna del feature, no del documento).

**Problema:** La gamificacion de ExploraCO (XP, misiones, logros, 6 niveles) no tenia: (1) progresion de especializacion por micro-acciones estilo Albion (fama por sendero, no solo XP global); (2) mecanica "Own the Spot" estilo SKATE (lider de destino coronado por su resena mas votada, con multiplicador de XP); (3) patrocinios estilo SKATE (beneficios por hitos territoriales, hoy inexistentes); (4) una curva de niveles que se estancaba rapido (6 niveles). El prompt `prompt gsming.txt` planteo el Plan Maestro y cerro con 3 preguntas de calibracion: como calcular el Own the Spot (bajo demanda vs tarea programada), como visualizar la Tabla de Destino (mapa de nodos SVG vs grilla por especialidades) y que beneficios activar para los patrocinios.

**Opciones evaluadas:**
1. **Own the Spot bajo demanda (elegida por Javier):** calcular el lider con un SELECT+COUNT (MAX de `votos_utiles` por destino) al cargar la pagina del destino. Alternativa descartada: pre-calcular en tarea programada (agrega infraestructura y latencia de frescura; el proyecto no tiene scheduler).
2. **Tabla de Destino como mapa de nodos SVG (elegida por Javier):** seccion en mi-perfil.html con arbol SVG ligero de 3 senderos. Alternativa descartada: grilla tradicional agrupada por especialidades (menos distintiva y no refleja el arbol de Albion).
3. **Patrocinios con opcion abierta (elegida por Javier):** solo diseno (columna `usuarios.patrocinios` jsonb + `patrocinios: []` en el GET), sin activacion de beneficios. Alternativa descartada: activar descuentos dinamicos o acceso a moderacion ahora mismo (amplia la superficie de QA y depende de features no construidas).
4. **Niveles 6 -> 15 en 3 Eras:** umbrales 0/100/250/450/700/1000/1400/1900/2500/3200/4000/5000/6500/8500/11000, sincronizados en `api/usuarios.js` y los 3 HTML.
5. **Multiplicador x1.1 en la ciudad del lider:** aplicado sobre la XP base en cada POST (resena/guardado/visita/rating) via `xpConMultiplicador`, con degradacion segura (catch -> XP base) si la migracion 007 no corrio.
6. **Merge JSONB `||` respetado (ADR-003):** el progreso de misiones/logros sigue fusionandose, nunca reemplazandose.
7. **Presupuesto de 8 endpoints intacto:** todo vive en `interacciones.js`/`usuarios.js`/`pagina-destino.js`; la unica alteracion de esquema es la migracion `db/migrations/007_milestones_v2.sql` versionada (ADR-008).

**Decision tomada:** Se adopta la combinacion: (a) Own the Spot BAJO DEMANDA (SELECT+COUNT en pagina-destino.js y en `esLiderDeCiudad` de interacciones.js, ambos con try/catch que degradan sin romper); (b) Tabla de Destino como mapa de nodos SVG en mi-perfil.html alimentada por GET `tipo=tabla_destino` (3 senderos Explorador/Critico/Organizador con fama derivada de `xp_ganado` + mapas tematicos, niveles por lectura FAMA_TIERS nunca persistidos); (c) patrocinios SOLO diseno (`patrocinios: []`); (d) NIVELES 15 en 3 Eras sincronizados; (e) multiplicador x1.1 sobre XP base en los 4 POST cuando el usuario es lider en la ciudad del destino; (f) 3 misiones nuevas (mis_own_spot_bogota +75, mis_gran_arquitecto +50, mis_itinerario_perfeccion +60 con condicion pragmatica: >=4 visitas a destinos con tags.itinerario) y 3 logros nuevos (logr_spot_domado +50, logr_especialista_gastro +40, logr_cazador_rarezas +100 con rareza global <5%) -> catalogo LOGROS 19; (g) nuevo POST `tipo=review_voto` (upvote util a resena, dedup PK usuario_id+resena_id -> 409, 403 self-vote, 503 si la migracion 007 no corrio -- escritura nunca silenciosa).

**Justificacion:** Las 3 respuestas de Javier definen el alcance: el calculo bajo demanda evita infraestructura extra y siempre refleja el estado real de Neon; el mapa de nodos SVG hace visible la especializacion (filosofia Albion) sin costo de render alto en el perfil; dejar los patrocinios como opcion abierta pospone beneficios virtuales hasta que existan features reales que los justifiquen (widget "Quien va este mes", moderacion), evitando UI muerta. El multiplicador x1.1 premia el liderazgo de spot sin romper el balance de XP (Math.round sobre la base). La revision de 6 a 15 niveles desestanca la progresion y divide la curva en 3 Eras comunicables. El POST review_voto cierra el vector de "self-vote" (H-1 del QA) y la escritura silenciosa (H-2: sin migracion 007 responde 503, no 200 falso) -- coherente con la Regla de Oro de no capturar excepciones genericas que silencien fallos.

**Impacto:** `api/interacciones.js` (v6: helpers esLiderDeCiudad/xpConMultiplicador, MISIONES +3, LOGROS +3, GET tabla_destino, POST review_voto); `api/usuarios.js` (NIVELES 15); `api/pagina-destino.js` (query spotLider bajo demanda + bloque "Lider del spot" en secResenas, 8vo parametro opcional de buildHTML); `index.html`/`mi-perfil.html`/`comunidad.html` (XP_LEVELS 15, XP_BADGES sin los 5 muertos, seccion Tabla de Destino SVG en mi-perfil, correccion rareza_pct y contador desbloqueados/total); `db/migrations/007_milestones_v2.sql` (nuevo, idempotente, ADR-008). NO se crearon funciones serverless (presupuesto 8/8 intacto). Pendiente BLOQUEANTE: aplicar la migracion 007 en Neon antes del deploy (sin ella: review_voto 503, spotLider null, x1.1 inactivo). Verificacion: smoke dedicado 28/28 PASS + test_logros_catalogo 12/12 PASS + Escudo GOLD (node --check 5/5, ASCII 0 bytes >127, divs 95/95).

**Estado:** Aprobada y vigente (pendiente migracion 007 en Neon + deploy).

## ADR-015: Comunidad social real -- chat y planes con gaming completo

**ID:** ADR-015
**Fecha:** Septiembre 2026
**Autor:** Chief Architect (AI-DOS) con decisiones de producto confirmadas por Javier (respuestas a 3 preguntas de calibracion)

**Problema:** El hub social (`comunidad.html`) tenia chat y planes como **demo 100% local** (MOCK_MESSAGES/PLANES_DATA en memoria, sin backend, sin persistencia, sin XP) -- decision D7 de la spec de comunidad unificada 2026-09-07. Ademas acumulaba riesgos de seguridad (XSS en `renderChatMessages`/`renderPlanes` al inyectar texto de usuario con `innerHTML`), bugs de UX (`spots` que nunca decian cuantos cupos quedaban, el creador podia unirse a su propio plan, `modDelMsg` inefectivo en rooms mock) y un desajuste de producto: las capacidades `chat`/`moderador_chat`/`crear_chat` ya existian en backend (misiones umbral 250/450/700 XP) pero solo abrian una UI falsa. Se pidio un rediseno completo conectado al backend real que cumpliera con todas las opciones del gaming.

**Opciones evaluadas (calibradas con Javier):**
1. **XP de chat con tope diario (elegida):** +2 XP por mensaje con maximo 20 XP/dia (10 mensajes), contador en `usuarios.progreso_social` (`{chat_dia, chat_n}`) para anti-farming. Alternativa descartada: XP ilimitado por mensaje (farming trivial) o solo misiones de hitos (menos recompensa por la accion mas frecuente de la comunidad).
2. **Crear planes gateado por avance (elegida):** el alta de un plan requiere el chat desbloqueado (`mis_chat_mensajero`, nivel 3 / 250 XP); unirse a planes es libre para registrados. Alternativa descartada: libre para todos (devaluaba la progresion) o exigir `organizar_actividad` (mis_organizador_bogota: gate muy alto para una feature social de alta friccion).
3. **Sin sesion = todo bloqueado (elegida):** chat y planes muestran CTA de login y se elimina el fallback demo local para ambos tabs (el Ranking conserva su fallback actual). Alternativa descartada: mantener demo local sin sesion (contradice "conectado al backend real" y perpetua el contenido falso).

**Decision tomada:** Se implementan chat y planes **reales sobre Neon** dentro de `api/interacciones.js` (presupuesto 8/8 intacto, ADR-010): GET `chat_salas`, `chat_mensajes`, `planes`, `planes_mios`; POST `chat_sala`, `chat_msg`, `chat_mod`, `plan_crear`, `plan_unirse`, `plan_salir`. Gates server-side via `misionCompletada()` (mismo patron que la foto). XP de chat +2 con tope diario 20 XP (anti-farming en `usuarios.progreso_social`). Gaming nuevo: 3 misiones (mis_chat_activo +20, mis_plan_creador +25, mis_plan_unido +15) y 3 logros (logr_social_chat +30 plata, logr_social_plan +35 oro, logr_anfitrion +50 oro) -> LOGROS 22. Esquema: migracion `db/migrations/008_comunidad_social.sql` (chat_salas, chat_mensajes, planes_viaje, planes_miembros, `usuarios.progreso_social`, seed de 6 salas del sistema, idempotente ADR-008, ASCII-safe con emojis `E'\U...'` segun BUG-026). Frontend `comunidad.html`: tabs Chat/Planes consumen la API con polling cada 5s (sin websockets en Vercel Hobby), enlaces a moderacion fijar/eliminar, formulario de plan (no `prompt`), XP toasts al ganar XP, y **todo texto de usuario se escapa** (fix XSS del demo).

**Justificacion:** Conecta las capacidades que ya existian en backend a features reales, cierra el vector XSS del demo, elimina contenido falso de produccion, y hace que las acciones sociales alimenten el motor gaming existente (evaluarMisiones/evaluarLogros) sin crear endpoints nuevos. El tope diario de chat evita farming sin castigar el uso normal (10 mensajes/dia es generoso). El gate de "crear plan" con el nivel 3 da una curva natural: primero se conversa, luego se organizan viajes. La persistencia en tablas dedicadas (no en `interacciones`) mantiene limpio el modelo de datos de destinos.

**Impacto:** `db/migrations/008_comunidad_social.sql` (nuevo); `api/interacciones.js` (helpers misionCompletada/chatXpDisponible/registrarChatXp, MISIONES +3, LOGROS +3, 4 GET + 6 POST nuevos); `comunidad.html` (tabs Chat/Planes reales, fix XSS, polling, formulario de plan, sin demo); `scripts/test_logros_catalogo.js` (19 -> 22); `scripts/smoke_test_comunidad.js` (nuevo, 30/30 PASS). NO se crearon funciones serverless (presupuesto 8/8 intacto). Pendiente BLOQUEANTE: aplicar la migracion 008 en Neon antes del deploy (sin ella: los GET de chat/planes y los POST devuelven error SQL y las misiones/logros nuevos degradan a no-completadas). Verificacion: node --check api/interacciones.js OK + ASCII 0 bytes >127 + divs comunidad 86/86 + test_logros_catalogo 12/12 PASS + smoke_test_comunidad 30/30 PASS.

**Estado:** Aprobada y vigente (pendiente migracion 008 en Neon + deploy).

## ADR-016: Subcategorias controladas en `tags.subcategoria` para sitio, comida y evento

**ID:** ADR-016
**Fecha:** Septiembre 2026
**Autor:** Chief Architect (AI-DOS) con aprobacion de architect-review (veredicto APRUEBA 2026-09-09) y decisiones de producto confirmadas por Javier

**Problema:** La categoria `sitio` es un cajon de sastre: bares, museos, teatros, parques, espacios publicos y naturales se fuerzan al esquema turismo/naturaleza (dificultad, fauna_flora, itinerario, tours, temporada). El renderer muestra las 8 secciones de sitio a cualquier sitio sin importar el tipo, generando modulos no funcionales (un bar no tiene itinerario ni fauna). Ademas el campo `tipo_actividad` es texto libre sin vocabulario controlado, imposible de filtrar con consistencia.

**Opciones consideradas:**
1. **Columna SQL nueva por subcategoria (rechazada):** migracion de esquema innecesaria, escala a sql-security, costosa y rompe el patron Cero Borrado Logico vigente.
2. **Convertir `tipo_actividad` en campo controlado (rechazada):** es texto descriptivo legacy con ~46 valores reales divergentes ("Salsa bar", "Museo de arqueologia"); forzarlo a lista cerrada perderia informacion de los existentes.
3. **Campo controlado `tags.subcategoria` slug ASCII en JSONB (elegida):** sin columna nueva ni endpoint nuevo; vive 100% en el MERGE JSONB (ADR-003) y en el motor generico de tags (TSK-012).

**Decision tomada:** Introducir `tags.subcategoria` (slug ASCII controlado, lista cerrada) para sitio, comida y evento. Se SINCRONIZA con el renderer como fuente de verdad de la matriz modulo-por-subcategoria; `tipo_actividad` queda como texto descriptivo legacy libre. Fallback: ausencia de `subcategoria` = comportamiento actual intacto (cero regresion). Taxonomia: **sitio** → [naturaleza, museo, cultura, bar, parque, espacio-publico, sitio-historico, religioso, aventura]; **comida** → [restaurante, cafe, gastrobar, comida-rapida, dulces]; **evento** → [concierto, festival, teatro, exposicion, deporte, cine, fiesta]. Campos nuevos de tags (solo sitio): subcategoria, colecciones[], recorridos[], accesibilidad[], programacion[], musica_vivo{}, cover{}, codigo_vestimenta, happy_hour, atracciones[], horarios_zona[], actividades_gratis[], que_ver[], contexto. Nota de no-duplicidad (leccion BUG-019): `boletas` fue ELIMINADA por solape con `entradas[]`; `edad_minima` reusa la clave de Hostal; `reservas` reusa la clave de Comida; `accesibilidad` es una clave compartida museo/espacio-publico; `precio_desde`/`capacidad` reusan columnas genericas — nunca se duplican dentro de `tags`. `cover` es objeto `{valor, nota}` solo para cover condicional nocturno.

**Justificacion:** La subcategoria permite que admin.html muestre solo los modulos funcionales del tipo real de lugar y que pagina-destino.js gatee secciones por subcategoria (degradacion condicional ya probada), sin migrar esquema ni gastar el presupuesto de endpoints (8/8 intacto). El fallback por ausencia garantiza cero regresion para los ~46 seeds legacy hasta su reclasificacion. Los slugs ASCII cumplen ADR-002. La lista cerrada + reglas de inferencia keyword→subcategoria (prioridad tipo_actividad > nombre > lead, orden especifico→generico) hacen la migracion determinista y auditable.

**Impacto:** `admin.html` (campo `f-subcategoria` como `<select>` de lista cerrada registrado en `CATEGORY_TAG_FIELDS.<cat>`/`CATEGORY_TAG_LISTS.<cat>` del motor TSK-012, sin tocar `collectPlace()`/`_placeToAPI()`; visibilidad condicional de sub-tabs `especifico-sitio` por subcategoria); `publicar.html` (select de subcategoria); `api/pagina-destino.js` (gateo de secciones de sitio por `tags.subcategoria` + secciones nuevas condicionales + chip de subcategoria en hero con CSS scoped ADR-004 y escapes \uXXXX ADR-002); `scripts/validate_ficha.js` (acepta subcategoria en categorias sitio/comida/evento); `scripts/reclasificar-subcategorias.js` (script idempotente versionado en `scripts/`, log slug→subcategoria para revision de Javier antes de produccion, inferencia tipo_actividad/nombre/lead); BLUEPRINT.md seccion 4 y TASKS.md (post-implementacion con docs-keeper). NO se crean funciones serverless ni migraciones de esquema. Criterios de cierre: Escudo GOLD + smoke test de buildHTML() de las 3 categorias afectadas con y sin subcategoria.

**Estado:** Aprobada - implementacion Fase 1-3 completada en working tree (pendiente commit/deploy y reclasificacion en produccion).

---

## ADR-017: Albums Fotograficos, Gamificacion y Mapa Audiovisual

**ID:** ADR-017
**Fecha:** 2026-09-09
**Estado:** Aprobado e implementado (pendiente migracion 009 en Neon + deploy, segun header de api/interacciones.js v8)
**Autor:** AI-DOS Core

**Problema:** ExploraCO necesita un sistema de albumes fotograficos libres (no vinculados a destinos), gamificacion extendida para fotos/videos/audio, y un mapa audiovisual en comunidad.html.

**Decision:**
- Albumes libres con ubicacion manual (lat/lng/ciudad), no vinculados a destinos del directorio
- Modelo Pinterest: fotos de otros usuarios con XP al due\u00f1o original (+10 XP, tope 10/dia)
- Todo en los 8 endpoints existentes (Vercel Hobby 8/8 agotado)
- URLs externas con validacion HEAD diferida (sin upload real)
- Mapa audiovisual via UNION SQL de albumes + destinos_fotos en comunidad.html
- Gamificacion: +6 misiones (total 18-20) + +7 logros (total 29)
- Nivel minimo: 2 para albumes y repins
- Anti-spam: 10 fotos/dia, 5 albumes/mes, 20 votos/dia
- Contadores derivados por COUNT (sin columnas, sin race condition)
- Curacion manual: admin selecciona foto top para directorios

**Tablas nuevas:** albumes, album_fotos, album_votos (migracion 009)
**Extension:** usuarios.progreso_album (jsonb)
**Endpoint:** api/interacciones.js v8 (+5 GET, +8 POST)
**Frontend:** comunidad.html (tab Mapa), mi-perfil.html (Mis Albumes), admin.html (Foto Top)

**ADR previos relacionados:** ADR-010 (presupuesto endpoints), ADR-012 (gamificacion), ADR-014 (Milestones v2), ADR-015 (Comunidad social)