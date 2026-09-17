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

**Nota de correccion de citas (ADR-006, 2026-09-16):** varias entradas de este documento (y de los demas documentos del AI-DOS Core) citan el presupuesto de endpoints como `ADR-010 (presupuesto 8/8)`. Esa cita es ERRONEA: el limite de 8 funciones serverless de Vercel Hobby se origina en **ADR-001** ("Prohibicion de frameworks frontend"), que lo invoca expresamente como justificacion; este ADR-010 es la decision de **multi-tema en tags JSONB** (`tags.temas[]` + `tags.tema`) y solo menciona el presupuesto agotado (8/8) de forma incidental en su opcion 3. Las citas historicas se conservan por Cero Borrado Logico (Regla de Oro 3), pero toda cita NUEVA debe referir el presupuesto 8/8 a **ADR-001** y reservar `ADR-010` para el multi-tema de tags JSONB.

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

---

## ADR-018: Gamificacion v4.0 -- Consumibles, Economia de XP, 20 Niveles, Cromos y Pandillas

**ID:** ADR-018
**Fecha:** 2026-09-10
**Estado:** Aprobado e implementado en working tree (pendiente aplicar migracion 010 en Neon + deploy)
**Autor:** AI-DOS Core
**Spec:** `docs/superpowers/specs/2026-09-10-gamificacion-v4-design.md`

**Problema:** El motor gaming (ADR-012, ADR-014, ADR-017) llegaba a 15 niveles y no tenia economia de consumo: todo el XP era acumulativo e irreversible. El producto pedia una capa de gasto (consumibles de un solo uso) que introdujera riesgo real, una vitrina de perfil completa de 20 niveles con desbloqueos visibles, y las mecanicas de cromos (Steam) y pandillas (clanes) que hasta hoy eran solo conceptuales.

**Decision:**
- **Economia de XP con de-nivel real:** los consumibles se pagan con `usuarios.xp_total`. Como el nivel se calcula DINAMICAMENTE desde `xp_total`, gastar XP puede bajar de nivel y revocar en runtime las capacidades del nivel superior perdido (revocacion dura, ya soportada por `gastarXp()` en `usuario-session.js`).
- **10 consumibles** orientados a la experiencia (albumes de fotos, escritos/publicaciones y salas de chat), con catalogo en tabla `consumibles` y **precios editables desde admin.html**.
- **20 niveles** con 4 Eras (Mundana 1-5, Patrocinada 6-10, Organizador 11-15, Leyenda 16-20) y umbrales 0..30000; nivel/era/badge nunca se persisten (se derivan de `xp_total`).
- **Inventario en JSONB** (`usuarios.capacidades`) escrito SIEMPRE con `COALESCE ||` (ADR-003, Protocolo Merge). Los ledgers de compra/uso son append-only.
- **Cromos** con probabilidad comun 0.45 / raro 0.30 / epico 0.18 / dorado 0.07, sets por ciudad, y ledger de intercambios en tabla dedicada `cromo_intercambios`.
- **Pandillas:** funda Nivel 14+, max 10 miembros, max 1 activa por usuario, cooldown de reingreso 14 dias, fama colectiva (10% de la XP individual) y retos de parche con ventana temporal que reparten `xp_bono` al completarse.
- **Cero archivos nuevos en /api** (Vercel Hobby 8/8): todas las operaciones entran como `tipo=` en `interacciones.js` (5 GET + 8 POST nuevos) o `admin.js` (CRUD consumibles).

**Tablas nuevas (migracion 010):** `consumibles`, `compra_consumibles`, `consumo_consumibles`, `cromos_catalogo`, `usuarios_cromos`, `pandillas`, `pandillas_miembros`, `pandilla_retos`, `cromo_intercambios`.
**Extension:** `usuarios.capacidades jsonb` (inventario de consumibles).
**Backend:** `api/interacciones.js` v9 (+5 GET, +8 POST, tabla_destino con 5 senderos: explorador/critico/organizador/audiovisual/pandilla) + `api/admin.js` (CRUD consumibles).
**Frontend:** `mi-perfil.html` (vitrina de 20 niveles + Tienda/Inventario/Mis Cromos), `comunidad.html` (tab Pandillas: detalle, unirse, fundar, retos), `index.html` (XP_LEVELS 20).

**Bugs bloqueantes detectados en la revision arquitectonica y corregidos:**
- BUG-1: `conMisiones()` en `api/usuarios.js` sobrescribia `capacidades` con un objeto nuevo en cada lectura; se corrigio a MERGE con `Object.assign({}, dbCap, misiones)` para no destruir el inventario.
- BUG-2: la spec referenciaba una columna inexistente para contar intercambios; se creo la tabla dedicada `cromo_intercambios` (ledger append-only + indices anti-farming).

**Verificacion:** `node --check` 4/4; ASCII-safety 0 bytes >127 en api/*.js; `smoke_test_gamificacion_v4.js` 95/95 PASS; smokes de regresion (milestones_v2, catalogo de logros, perfil_progreso) OK.

**Pendiente:** aplicar `db/migrations/010_gamificacion_v4.sql` en Neon (lo ejecuta Javier) + commit/deploy y verificacion en vivo.

**ADR previos relacionados:** ADR-003 (merge JSONB), ADR-010 (presupuesto endpoints), ADR-012 (gamificacion), ADR-014 (Milestones v2), ADR-015 (Comunidad social), ADR-017 (Albums/multimedia)

## ADR-019: Campo `verificado` como columna gestionada de destinos (control interno admin, sin insignia publica)

**ID:** ADR-019
**Fecha:** 2026-09-11
**Estado:** Aprobado e implementado en working tree (pendiente commit/deploy; sin migracion, la columna ya existia en Neon)
**Autor:** AI-DOS Core (prompt cambios.txt: "Verificado y Gestion Admin")

**Problema:** El prompt de refactor UI/UX pedia un estado "Verificado" para destinos, editable SOLO desde admin.html como checkbox de revision manual, y explicitamente SIN ninguna insignia publica en la ficha para cuentas de usuario general. Habia que decidir donde vive el dato: `tags` JSONB (camino generico TSK-012) o columna nueva/ya existente en `destinos`.

**Opciones consideradas:**
1. **Tag JSONB `tags.verificado` (rechazada):** un estado de confianza editorial no es contenido de la ficha; vivirlo en `tags` lo mezcla con el contenido curado y dificulta el gating futuro (ej. filtrar "solo verificados" en listados sin leer JSONB).
2. **Columna `destinos.verificado` (elegida):** replica el patron exacto de `destacado` (columna booleana gestionada por admin-destinos.js), ya usada por publicar-lugar.js (escribe) y destinos.js (lee en listado). No requiere migracion (la columna ya existia en Neon) ni endpoint nuevo (presupuesto 8/8 intacto).

**Decision tomada:** `verificado` es COLUMNA booleana de `destinos`, gestionada por `api/admin-destinos.js` con el patron de `destacado`: GET listado la incluye (L63); INSERT con `Boolean(b.verificado||false)` (L109/157); UPDATE con guard `b.verificado !== undefined` (L256-258) que permite persistir `false` y asi DESTILDAR un verificado ya guardado (el patron `||` de otros campos no permitiria desmarcar). En admin.html vive como checkbox `f-verificado` ("Verificacion manual admin", pestana General L795-797) con wiring completo en clearForm/loadForm/savePlace/_placeToAPI (_placeToAPI emite `verificado: p.verificado === true`)/_mergeNeonRowIntoLocal (guard `!== undefined && !== null`). El renderer pagina-destino.js NO renderiza ninguna insignia publica del campo (0 ocurrencias): el verificado es control interno, usable en el futuro para curacion editorial/filtros de admin sin exponerlo al publico.

**Justificacion:** El campo es meta-dato de curacion, no contenido de la ficha: no debe viajar en `tags` (ADR-003 merge lo preservaria contaminando fichas curadas con flags internos) ni ocupar endpoint nuevo. La columna ya existia en produccion, asi que el cambio es solo de gestion (admin + backend), con riesgo cero de regresion para los seeds (ninguno envia el campo y el guard `!== undefined` en UPDATE lo ignora). El patron identico a `destacado` da consistencia operativa: mismo flujo, misma semantica, mismo default false.

**Impacto:** `api/admin-destinos.js` (+`verificado` en GET/INSERT/UPDATE); `admin.html` (checkbox `f-verificado` + wiring, divs 716/716); `api/pagina-destino.js` SIN cambios para verificado (no se renderiza); docs TASKS/TSK-095, NEXT.md, BLUEPRINT seccion 3. Sin migracion SQL (columna preexistente). Pendiente: commit/deploy; backlog abierto: persistir `address` (mismo patron de gestion de columnas) y decidir si en el futuro se expone insignia publica condicionada a rol admin.

**ADR previos relacionados:** ADR-002 (ASCII-safe), ADR-006 (baseline de verdad), ADR-009 (rating/destacado editorial), ADR-013 (campo `web` prominente)

---

## ADR-020: La seccion "Reservar" de la ficha solo se renderiza con enlace real de Booking.com o Hostelworld

**ID:** ADR-020
**Fecha:** 2026-09-11
**Estado:** Aprobado e implementado en working tree (pendiente commit manual del usuario; sin migracion ni endpoint nuevo)
**Autor:** AI-DOS Core (decision de producto confirmada por Javier, sesion TSK-095)

**Problema:** Tras el refactor UI/UX (TSK-095) se elimino el boton "Reservar" de la franja `gstrip` (L781-782), pero la seccion `secReservar` del renderer se ensamblaba con cualquier boton de reserva disponible, de modo que los destinos de categoria `sitio` con solo WhatsApp mostraban una seccion "Reservar" sobrante: la accion prometia una reserva y entregaba un chat, no un canal de reserva real.

**Opciones evaluadas:**
1. **Gate por categoria (`cat !== 'sitio'`):** rechazada -- la categoria no es el criterio correcto; un hostal o comida sin enlace real de reserva tambien generaria la seccion sobrante.
2. **Gate por enlace real de reserva (`bookingUrl || hwUrl`) (elegida):** la seccion solo aparece cuando el destino tiene un canal real en Booking.com o Hostelworld, los dos OTAs que el motor ya resuelve (`det.booking_url || d.booking` y `det.hostelworld_url || d.hostelworld`, L722-723).
3. **Incluir Airbnb en el gate (`|| airbnbUrl`):** valorada y descartada en el alcance actual -- el tradeoff aceptado es que un destino con SOLO `airbnb_url` tampoco dispara la seccion en esta version.

**Decision tomada:** `secReservar` se ensambla unicamente cuando `(bookingUrl || hwUrl)` (api/pagina-destino.js L1747). El WhatsApp solo ya no dispara la seccion; el Airbnb solo tampoco la dispara (tradeoff aceptado: Airbnb huerfano en esta version; el gate es aditivo, se puede ampliar en un futuro sprint sin romper nada). El WhatsApp y el contacto siguen vivos via el hero y la seccion `secContact`, que no se modifican.

**Justificacion:** El criterio correcto para mostrar "Reservar" es la existencia de un enlace real de reserva en un OTA reconocido, no la categoria ni la presencia de cualquier boton en el bloque. Renderizar la seccion con solo un WhatsApp confundia al viajero y dejaba una seccion fantasma en los sitios; el gate por enlace real la limita a los casos con valor de conversion real. El tradeoff de Airbnb es aceptado porque casi no hay destinos con `airbnb` cargado en Neon y la condicion es extensible (suma aditiva) sin cambios de schema ni de backend.

**Impacto:** `api/pagina-destino.js` L1747 (gate de `secReservar`). Sin cambios en admin.html, schema ni endpoints (presupuesto 8/8 intacto). Cierra el riesgo R-2 de NEXT.md (secReservar en sitios). El subnav de la ficha refleja la ausencia (`has:!!secReservar`, L2027). Pendiente: commit manual del usuario con el resto de la sesion TSK-095.

**ADR previos relacionados:** ADR-004 (scoped CSS), ADR-013 (web oficial prominente en hero), ADR-019 (verificado como control interno admin)

---

## ADR-021: Capa audiovisual estricta (solo contenido de usuarios) y paridad de drawer en los mapas

**ID:** ADR-021
**Fecha:** 2026-09-12
**Estado:** Aprobado e implementado en working tree (pendiente commit/deploy; sin migracion de schema ni endpoint nuevo)
**Autor:** AI-DOS Core (prompt cambios.txt: "Capa audiovisual y filtros en mapa cultural")

**Problema:** El mapa cultural de index.html mezclaba en `MAPA_MEDIA[]` dos origenes de contenido: material dinamico de usuarios (albumes, `origen='album'`) y la galeria estatica seed de destinos publicados (`destinos_fotos`, `origen='destino'`), ambas unidas por el handler `tipo=multimedia_mapa`. Ademas, los pines del directorio abrian el popup compacto de Leaflet en vez del drawer lateral que ya usaba la capa audiovisual, y el filtro "Todo" no podia deseleccionarse (siempre activo), por lo que no habia forma de ocultar los pines del directorio y ver exclusivamente la capa audiovisual.

**Opciones evaluadas:**
1. **Cambiar el contrato del endpoint (backend only):** rechazada -- `comunidad.html` (L1221) consume `tipo=multimedia_mapa` sin parametros y espera ambas ramas; alterar el default habria roto esa vista.
2. **Filtrar solo en frontend:** suficiente para index.html, pero deja viajar hasta 200 filas estaticas que el mapa descarta.
3. **Query param opcional `origen` en backend + filtro defensivo en frontend (elegida):** el endpoint acepta `origen=album` (anula la rama estatica con `AND FALSE`, sin parametros SQL nuevos ni migracion); el connector de index lo solicita; y el frontend descarta igualmente `origen==='destino'` como defensa. Retrocompatible.
4. **Toggle on/off separado para la capa directorio:** descartada por decision de producto -- "deseleccionar Todo" ya oculta todos los pines del directorio sin sumar un control extra.
5. **Mantener el popup de los pines:** rechazada -- paridad estricta: el clic abre el drawer lateral.

**Decision tomada:**
- **Capa audiovisual estricta:** `GET /api/interacciones?tipo=multimedia_mapa&origen=album` anula la rama estatica reutilizando el patron `AND FALSE` existente; sin el parametro la respuesta es identica a la anterior (retrocompatible con comunidad.html). `index-api-connector.js` pide `&origen=album`; `renderMapaMedia()` y `mdMediasCercanas()` de index.html excluyen `origen === 'destino'` como red de seguridad.
- **Filtro de categoria deseleccionable:** el boton de categoria activo (incluido "Todo") se puede deseleccionar; `mapaActiveCat = 'off'` deja `mapaPlaces = []` (recluster vacia la capa y oculta todos los pines del directorio) y la lista lateral muestra un estado vacio. Sin toggle on/off adicional.
- **Paridad de drawer:** se elimina el `bindPopup` de los pines individuales del directorio y de "Mi Mapa personal" (index.html); el clic llama `setMapaActive()` -> `openMapaDrawer(place)` (hero, rating, precio/lead y CTA a `/{slug}.html`, estructura ya existente). Los clusters conservan su zoom y su popup de lista (no son pines individuales). `mapas.html` recibe un drawer propio (`.dd-wrap`, estilos acordes a esa pagina) que abre al clic en los markers del mapa de detalle.

**Justificacion:** El parametro `origen` es la solucion de menor riesgo y costo: no toca el schema, no consume endpoints nuevos (presupuesto 8/8 intacto) y respeta al consumidor legacy (comunidad.html) porque es opcional. El filtro frontend duplicado convierte la regla "solo contenido de usuarios" en invariante del render, no en una dependencia de que el llamador use el parametro. La deseleccion de "Todo" resuelve el caso de uso (ver solo la capa audiovisual) sin agregar UI; eliminar el popup y reutilizar `openMapaDrawer` no duplica codigo (reutiliza el drawer existente) y unifica la UX entre capa de directorio y capa audiovisual.

**Impacto:** `api/interacciones.js` (2 lineas, handler `multimedia_mapa`); `index-api-connector.js` (URL del fetch); `index.html` (listener de filtros, `filterMapaPins`, `renderMapaList`, `setMapaActive`, `renderMapaMedia`, `mdMediasCercanas`, `refreshMapaMarkers`, `onMapaMoved`, `updateMMMarkers`); `mapas.html` (nuevo drawer + `abrirDrawerDetalle`). Sin migracion SQL ni endpoints nuevos. `mapaPendingPopupId`/`mapaPendingClearTimer` quedan declaradas sin uso (limpieza pendiente, no bloqueante). Fuera de alcance: la capa multimedia de `comunidad.html` sigue mostrando ambas ramas (no se le agrego el parametro); candidata a unificar en una tarea futura.

**ADR previos relacionados:** ADR-002 (ASCII-safe), ADR-006 (baseline de verdad), ADR-017 (mapa audiovisual), ADR-020 (gate de reserva con criterio real)

---

## ADR-022: Reemplazo de la constraint unica compuesta `(usuario_id, destino_id, tipo)` por un indice unico parcial solo para `resena`/`rating` (fotos libres)

**ID:** ADR-022
**Fecha:** 2026-09-12
**Estado:** Aprobado e implementado en working tree (migracion `db/migrations/012` PENDIENTE de aplicar en Neon)
**Autor:** AI-DOS Core (prompt cambios.txt: fixes multimedia; sesion TSK-097)

**Problema:** la tabla `interacciones` tenia la constraint unica compuesta heredada `interacciones_usuario_id_destino_id_tipo_key` sobre `(usuario_id, destino_id, tipo)`, disenada para deduplicar resenas/rating (ADR-007). Pero el modelo de fotos (ADR-017) define las fotos como registros LIBRES: los handlers `tipo='foto'` (upload de foto de lugar) y `tipo='foto_voto'` insertan filas `tipo='foto'` para el mismo `(usuario_id, destino_id)`. La constraint compuesta chocaba con la segunda foto (y con el segundo voto de foto) del mismo usuario al mismo destino: `duplicate key value violates unique constraint` -> 500 generico. Ademas, la constraint vieja PERMITIA que un usuario tuviera a la vez una `resena` y un `rating` del mismo destino (el `tipo` los diferenciaba), lo que contradice el dedup simetrico "una calificacion por usuario y destino" del ADR-007.

**Opciones evaluadas:**
1. **Mantener la constraint compuesta y usar `ON CONFLICT DO UPDATE`/upsert en los handlers de foto:** rechazada -- convertiria la segunda foto en una sobrescritura de la primera (el usuario no podria subir varias fotos al mismo lugar) y el voto de foto repetido no debe mutar la fila previa; viola el espiritu de fotos libres del ADR-017.
2. **DROP de la constraint vieja sin reemplazo + dedup en codigo:** rechazada -- elimina la garantia a nivel de BD del dedup de resena/rating (ADR-007) y deja la integridad dependiendo solo del backend (carrera de condiciones entre POSTs simultaneos).
3. **Indice unico PARCIAL solo para `resena`/`rating` (elegida):** DROP de la constraint compuesta vieja + `CREATE UNIQUE INDEX ... ON interacciones (usuario_id, destino_id) WHERE tipo IN ('resena','rating')`. Las fotos (y cualquier tipo de registro libre futuro) quedan sin restriccion de unicidad; el dedup de calificaciones queda garantizado por la BD exactamente sobre los tipos que lo requieren. Se complementa con una limpieza defensiva de duplicados preexistentes (una `resena` + un `rating` del mismo usuario-destino: se conserva la resena con texto y, a igualdad de tipo, la fila mas reciente; se excluye `usuario_id` NULL) y con el recalculo de `destinos.rating`/`total_resenas` solo para los destinos afectados (patron identico al de `api/admin.js` y `api/interacciones.js`, ADR-007).
4. **Separar fotos en tabla propia:** descartada -- ADR-017 ya las vive en `interacciones` (contadores por COUNT, sin columnas) y migrar a tabla aparte amplia el alcance sin beneficio inmediato.

**Decision tomada:** se adopta la opcion 3. La migracion `db/migrations/012_interacciones_dedup_resena_rating.sql` (nueva, idempotente ADR-008, ASCII-safe ADR-002):
- Paso 1: `DROP CONSTRAINT IF EXISTS interacciones_usuario_id_destino_id_tipo_key`.
- Paso 2: limpieza defensiva de duplicados `resena`/`rating` por `(usuario_id, destino_id)` (conserva la resena con texto, luego la mas reciente; excluye `usuario_id` NULL) con captura previa de los destinos afectados en tabla temporal.
- Paso 3: `CREATE UNIQUE INDEX IF NOT EXISTS idx_interacciones_dedup_resena_rating ON interacciones (usuario_id, destino_id) WHERE tipo IN ('resena','rating')`.
- Paso 4: recalculo de `destinos.rating` (AVG redondeado a 2 decimales) y `destinos.total_resenas` (COUNT) sobre `resena`+`rating` solo para los destinos con duplicados eliminados.

Ademas, en `api/interacciones.js` el catch final mapea `err.code === '23505'` a 409 tipado (`{ok:false, error:'Registro duplicado', duplicado:true}`) en vez de 500 generico: un conflicto de unicidad real (resena/rating duplicado, `foto_voto` repetido) se distingue de un fallo de servidor.

**Justificacion:** el indice parcial expresa en el esquema la regla de negocio exacta: unicidad SOLO donde la hay (una calificacion por usuario y destino, ADR-007), libertad donde la hay (fotos multiples por usuario y destino, ADR-017). Es la solucion de menor riesgo: no cambia el contrato del endpoint, no crea endpoints nuevos (presupuesto 8/8 intacto), no mueve datos de tabla, y el DROP+CREATE idempotente hace la migracion re-aplicable. La limpieza defensiva realinea los datos historicos que la constraint vieja permitia (resena + rating simultaneos) sin intervencion manual. El 409 tipificado da una semantica HTTP correcta al conflicto de unicidad y es coherente con los 409 existentes del sistema (`ya_votado`, dedup de planes ADR-015).

**Impacto:** `db/migrations/012_interacciones_dedup_resena_rating.sql` (NUEVO, versionado ADR-008); `api/interacciones.js` (catch final L3451-3452 -> 409 en 23505). Sin cambios de contrato ni de frontend. **PENDIENTE BLOQUEANTE:** aplicar la migracion 012 en el editor SQL de Neon (lo ejecuta Javier; sin ella produccion sigue con la constraint vieja y la segunda foto del mismo usuario-destino sigue devolviendo 500; el catch 23505 -> 409 solo tipifica el error). Verificacion: Escudo GOLD limpio (node --check, ASCII 0 bytes >127, divs 4/4 HTML en 0), smokes OK. Detalle operativo: TASKS.md TSK-097; falla corregida: BUGS_HISTORICOS.md BUG-032.

**ADR previos relacionados:** ADR-002 (ASCII-safe), ADR-003 (merge JSONB), ADR-007 (dedup simetrico resena/rating), ADR-008 (SQL versionado), ADR-017 (albumes y fotos libres), ADR-021 (capa audiovisual estricta)

---

## ADR-023: Comentarios tipo Facebook sobre la media de albumes (anidado ilimitado en datos, indentacion visual limitada, likes y moderacion)

**ID:** ADR-023
**Fecha:** 2026-09-12
**Estado:** Implementado (2026-09-12) como 6 ramas `tipo=` en `api/interacciones.js` (GET `comentarios_foto`, POST `comentario_foto`/`comentario_eliminar`/`comentario_voto`, GET `galeria_destino`/`comentarios_recientes`); migracion `db/migrations/013_album_comentarios.sql` creada y PENDIENTE de aplicar en Neon (Javier); frontend completo (`album-comments.js`, modales de index/comunidad/mi-perfil, moderacion admin y `galeria.html`). Sin endpoint nuevo (8/8, ADR-010).
**Autor:** AI-DOS Core (Chief Architect)

**Problema:** El sistema multimedia de albumes (ADR-017) permite fotos, videos y audio (`album_fotos.foto_type`), pero no ofrece conversacion sobre una media: no hay comentarios, no hay likes sobre comentarios, no hay moderacion y no hay contador de comentarios en las superficies que listan media (`album_detalle`, `mi_feed_fotos`). El producto pide un sistema tipo Facebook: comentarios sobre cualquier media, respuestas anidadas ilimitadas en datos, "me gusta", borrado por el autor, moderacion por el admin y anti-spam. Al mismo tiempo, el presupuesto de funciones serverless de Vercel Hobby esta agotado (8/8, ADR-010) y la indentacion visual debe acotarse para no romper el layout movil.

**Opciones evaluadas:**
1. **Modelo de jerarquia.** (a) Lista de adyacencia con `parent_id` auto-referenciado (elegida): una tabla, una FK self, profundidad ilimitada, consulta plana por `foto_id` y armado de arbol server-side. (b) Materialized path (`/1/4/9/`) o closure table: permiten consultas de subarbol mas eficientes, pero agregan columnas/tabla, triggers de mantenimiento y complejidad de escritura desproporcionada para un hilo de media. (c) Hilo plano sin anidacion: incumple el requisito de respuestas anidadas.
2. **Semaforo del borrado.** (a) Soft-delete tipo *tombstone* con hijas preservadas (elegida): `activo=false` oculta el contenido y la autoria, pero el nodo se devuelve como placeholder "Comentario eliminado" mientras tenga descendencia activa; la conversacion no se rompe y respeta Cero Borrado Logico. (b) Soft-delete en cascada siempre: borra de un golpe texto que escribieron otros usuarios y destruye el contexto del hilo. (c) Borrado fisico: prohibido por Cero Borrado Logico.
3. **Like: toggle vs insert-only.** (a) Toggle explicito (`accion:'like'|'unlike'`, elegida): `like` es idempotente (`ON CONFLICT DO NOTHING`) y `unlike` elimina la fila; reproduce la UX de Facebook. (b) Insert-only con 409 al repetir (patron de `album_votos`/`resena_votos`): impide quitar un like y no es lo que pide el producto. Se descarta el auto-toggle implicito en el backend por no ser idempotente ante reintentos de red.
4. **Contador de comentarios.** (a) Subquery `COUNT` por foto en lectura (elegida): nunca se desincroniza; es el patron del proyecto (contadores derivados, sin columnas que puedan quedar obsoletas). (b) Columna persistida `comentarios_count`: exigiria mantenerla en cada alta/baja/moderacion y admite race conditions.
5. **Ubicacion del backend.** (a) Nuevos `tipo=` GET/POST dentro de `api/interacciones.js` (elegida): presupuesto 8/8 intacto (ADR-010), donde ya viven albumes y gamificacion. (b) Endpoint nuevo: inviable.
6. **Alcance del XP.** (a) +2 XP por comentario con tope diario de 20 XP (10 comentarios/dia), reutilizando el JSONB `usuarios.progreso_album` con merge `||` (elegida): coherente con el anti-farming de chat (ADR-015). Los likes NO otorgan XP (igual que `review_voto`, ADR-014), por lo que el toggle no abre vector de farming. (b) Sin XP: pierde el enganche con el motor de misiones/logros.

**Decision tomada:**
- **Migracion `db/migrations/013_album_comentarios.sql`** (NUEVA, idempotente `IF NOT EXISTS`, ASCII-safe (ADR-008/ADR-002)) con:
  - `album_comentarios` (id uuid PK `gen_random_uuid()`, `foto_id` FK a `album_fotos(id)` ON DELETE CASCADE, `usuario_id` FK a `usuarios(id)`, `parent_id` FK self a `album_comentarios(id)` ON DELETE CASCADE, `texto text NOT NULL`, `activo boolean NOT NULL DEFAULT true`, `creado_en timestamptz DEFAULT now()`).
  - `album_comentario_votos` (likes: PK compuesta `(usuario_id, comentario_id)`, FKs con ON DELETE CASCADE en el comentario, `creado_en`).
  - Indices: `(foto_id, created_en)` para el hilo, `(parent_id)` para el armado de arbol, `(usuario_id, creado_en)` para el rate-limit diario y `(comentario_id)` para el conteo de likes.
- **Jerarquia:** lista de adyacencia (`parent_id`), profundidad de datos ilimitada. El servidor arma el arbol en `GET tipo=comentarios_foto`, calcula `nivel` (0-based) y devuelve en cada nodo `respuestas[]`. La indentacion VISUAL se limita en el cliente a `MIN(nivel, 3)` (los niveles 4+ se renderizan planos, con margen fijo); el limite es de presentacion, nunca de datos.
- **Borrado:** `POST tipo=comentario_eliminar` hace soft-delete (`activo=false`). Permiten borrar el AUTOR (por `usuario_id`) o el ADMIN (Bearer `ADMIN_SECRET`). Las respuestas hijas NO se borran por defecto: el nodo pasa a ser tombstone ("Comentario eliminado") y conserva su descendencia activa; si el admin envia `cascada:true`, un CTE recursivo desactiva todo el subarbol (moderacion dura). Nunca se hace DELETE fisico. El borrado no descuenta XP ya otorgado (mismo criterio que `quitar_guardado`/`quitar_visita`).
- **Like:** `POST tipo=comentario_voto` con `accion:'like'|'unlike'` (obligatoria). `like` -> `INSERT ... ON CONFLICT DO NOTHING` (idempotente, 200); `unlike` -> `DELETE` de la fila del like. No hay self-like: si `comentario.usuario_id === usuario_id` -> 403. No otorga XP. Nunca 409: un like repetido es un no-op, no un error.
- **Validaciones / anti-spam:** solo `usuario_id` de un usuario existente (403 si no); `texto` recortado de 1 a 1000 caracteres (400); `foto_id` existente y activo (404); `parent_id` opcional debe existir, estar activo y pertenecer al MISMO `foto_id` (404/400); rate-limit diario de 30 comentarios por usuario (`COUNT` sobre el indice `(usuario_id, creado_en)` -> 429). XP +2 con tope 20/dia via `progreso_album` y evaluacion de misiones/logros.
- **Contadores:** `album_detalle` y `mi_feed_fotos` agregan `(SELECT COUNT(*)::int FROM album_comentarios ac WHERE ac.foto_id = af.id AND ac.activo = true) AS comentarios`. Contador derivado, sin columna persistida; `multimedia_mapa` y `fotos_top` pueden sumarlo despues (fuera del alcance minimo).
- **Cero endpoints nuevos:** 1 GET (`comentarios_foto`) + 3 POST (`comentario_foto`, `comentario_eliminar`, `comentario_voto`) como ramas `tipo=` de `api/interacciones.js` (8/8 intacto, ADR-010).

**Justificacion:** La lista de adyacencia resuelve la anidacion ilimitada con una sola tabla y una FK self, sin triggers ni estructura extra; el armado server-side centraliza la logica de reparentado del tombstone y expone un contrato estable al cliente. Limitar solo la indentacion visual (y no la profundidad de datos) elimina el riesgo de overflow horizontal en movil sin recortar conversacion. El tombstone preserva el trabajo de terceros y cumple Cero Borrado Logico; la cascada queda como herramienta explicita de moderacion, no como efecto colateral del borrado propio. El toggle de likes sin XP es seguro (no hay farming) y fiel a Facebook; el 409 insert-only de `album_votos` existia porque ese voto pagaba XP y el arrepentimiento permitia reciclar recompensa, condicion que aqui no aplica. Los contadores por subquery siguen la regla del proyecto de no persistir lo que se puede derivar. Todo cabe en un archivo ya desplegado, respetando el presupuesto serverless.

**Impacto:** `db/migrations/013_album_comentarios.sql` (NUEVO, lo aplica Javier en el editor SQL de Neon; BLOQUEANTE para las 6 `tipo=`, que sin la tabla degradan a 503 por el catch `42P01` ya existente). `api/interacciones.js`: `GET tipo=comentarios_foto` (arbol + `likes`/`ya_like`/`es_mio`/`nivel`/`respuestas[]`), `POST comentario_foto` (201), `comentario_eliminar` (soft-delete autor/admin + `cascada` opcional), `comentario_voto` (toggle `like`/`unlike`); subquery `comentarios` en `album_detalle` y `mi_feed_fotos`. Frontend: componente compartido `album-comments.js` (clamp de indentacion a 3 niveles, scoped CSS ADR-004) montado en los modales de album de `index.html`/`comunidad.html`/`mi-perfil.html` y en `galeria.html`; moderacion en `admin.html`. NO se crean funciones serverless (8/8). Multi-seleccion `tipo_media=foto,video,audio` en `multimedia_mapa` se valida como correcta (`af.foto_type = ANY($1)`), con mejoras recomendadas: cast explicito `::text[]`, normalizacion a minusculas y respuesta 400 ante tokens invalidos (en vez del fallback silencioso actual a "todos los tipos").

**ADR previos relacionados:** ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-004 (scoped CSS), ADR-008 (SQL versionado), ADR-010 (presupuesto 8/8), ADR-015 (anti-farming con topes), ADR-017 (albumes y media), ADR-022 (indices/constraints de multimedia)

---

## ADR-024: Presencia Fisica Obligatoria para Marcar Visitas (Gamificacion v4.0: Presencia Fisica + Presencia Espacial)

**ID:** ADR-024
**Fecha:** 2026-09-12
**Estado:** Aprobado e implementado en working tree (backend + frontend verificados 2026-09-12: `node --check` PASS, ASCII 0 bytes >127, tests de logros 30/30). ACTUALIZADO 2026-09-13: la migracion `db/migrations/014_reset_visitas_presencia_fisica.sql` YA fue aplicada por Javier en Neon PRODUCCION (junto con la 011, 012 y 013). Pendiente: aplicar la migracion 015 (epic prompt.txt, ADR-026/TSK-100) tras el commit + commit/push/deploy + verificacion en vivo de la geocerca.
**Autor:** AI-DOS Core (architect + architect-review; prompt `prompt cambios.txt`)
**Spec:** `docs/superpowers/specs/2026-09-12-presencia-fisica-gamificacion-v4-design.md`

**Problema:** El POST `tipo=visita` de `api/interacciones.js` (handler v3, L3851-3909) otorgaba +20 XP sin validar la presencia fisica del usuario: bastaba un request remoto para "marcar Estuve aqui". Ademas, `quitar_visita` hacia un `DELETE` fisico de la fila sin descontar XP, lo que permitia el ciclo visita/quitar_visita/visita para granjear XP sin limite; el dedup por `SELECT`+`INSERT` no era atomico (dos requests concurrentes podian insertar la visita dos veces, sin indice unico que lo impidiera). Por ultimo, un radio fijo de 100 m castigaba la exploracion rural (senderos, miradores, fincas), donde el GPS tiene peor precision y descubrir un lugar apartado deberia valer mas.

**Opciones consideradas:**
1. **Validar la presencia solo en el frontend:** rechazada -- un cliente siempre puede omitir o falsear la validacion; la geocerca debe correr en el servidor.
2. **Geocerca server-side con Haversine dentro de `tipo=visita` (elegida):** un helper puro calcula la distancia entre la posicion enviada y `destinos.lat/lng`; sin endpoint nuevo (presupuesto 8/8, ADR-010) ni dependencia de PostGIS.
3. **Purgar visitas con soft-delete generico (sin reset):** rechazada -- no elimina el farming historico ni deja lista la tabla para el indice unico; el producto pidio iniciar el esquema desde cero una sola vez.
4. **Reset unico de visitas gamificadas con respaldo de auditoria (elegida):** excepcion autorizada a Cero Borrado Logico (precedente: migracion 012), conservando analitica anonima y cromos.
5. **Radio fijo unico (100 m):** rechazada -- ignora la brecha urbano/rural y la precision real del GPS.
6. **Anti-spoofing con sesion firmada/atestacion desde el inicio:** descartada para este alcance por costo e infraestructura; se documenta como ADR-025 candidato (riesgo residual aceptado).

**Decision tomada:** Se adopta presencia fisica obligatoria en `tipo=visita`:
- **Geocerca Haversine server-side** en `api/interacciones.js` (helper `haversineMetros`, radio terrestre 6371008.8 m). Sin endpoint nuevo.
- **Body:** `{usuario_id, destino_id, lat, lng, accuracy, ts}`; `lat`/`lng` obligatorios, `accuracy` recomendado (si falta, se acepta con `accuracy:null`); el tiempo de referencia es del servidor (`creado_en`/`NOW()`), `ts` es solo diagnostico.
- **Codigos:** 400 (`COORDENADAS_REQUERIDAS`, `COORDENADAS_INVALIDAS`, `ACCURACY_INVALIDA`, `VISITA_NO_PERMITIDA` para blog), 404 (`DESTINO_NO_ENCONTRADO`), 422 (`PRECISION_INSUFICIENTE` >150 m, `FUERA_DE_RANGO` dist > radio+accuracy, `VELOCIDAD_IMPOSIBLE` >69.4 m/s), 429 (`RATE_LIMIT` cooldown 90 s, `LIMITE_DIARIO` >=30 en ventana movil de 24 h), 200 idempotente (`ya_visitado` / `reactivado` con xp 0).
- **Dedup-first:** se consulta cualquier fila `(usuario_id,destino_id,tipo='visita')` sin importar `activo`; la reactivacion paga 0 XP y no incrementa `total_visitas`.
- **`quitar_visita` = soft-delete** (`activo=false`), cierra el farming; Cero Borrado Logico.
- **Indice unico parcial** `idx_interacciones_visita_unica (usuario_id,destino_id) WHERE tipo='visita' AND usuario_id IS NOT NULL`: cierra la race condition; `23505` -> 200 `ya_visitado`.
- **Radios adaptativos** por orden keyword -> subcategoria -> categoria -> default: default/urbano 100 m; `naturaleza`/`aventura`/keyword rural 250 m; `parque` 150 m; categoria `evento` 150 m; `festival`/`deporte` 200 m; `blog` rechazado.
- **Anti-spoofing:** `accuracy <= 150 m` (si se envia; el frontend siempre la envia), cooldown 90 s, velocidad maxima 69.4 m/s (~250 km/h) y tope 30 visitas en ventana movil de 24 h; el tiempo es del servidor.
- **Zona rural:** subcategoria `{naturaleza,aventura,parque}` OR keyword rural OR densidad (vecinos `<= 3` en bbox de 0.02 grados, filtrando `status='published'` y coordenadas validas). `zona_motivo` = `subcategoria` | `keyword` | `densidad` (rural) o `urbano` (urbana); sin coordenadas de destino = `sin_geocerca`. Bono **plano +20 XP**, sin multiplicador x1.1, sin amuleto_x2 y sin fama, **solo en el INSERT fresco**. Logro nuevo `logr_pionero` (tier plata, 40 XP, `requiere: []`) -> catalogo LOGROS 30.
- **Destino sin coordenadas:** `modo='sin_geocerca'` (permite la visita, sin bono rural, conservando accuracy/velocidad/tope diario).
- **Evidencia en `interacciones.dims.geo`** (`{lat,lng,accuracy,dist_m,radio_m,zona,zona_motivo,modo,v_mps,ts_cliente}`), sin migracion de columnas (la columna JSONB ya existe, migracion 003).
- **Migracion `db/migrations/014_reset_visitas_presencia_fisica.sql`:** purga fisica **unica** y autorizada de las visitas gamificadas (`tipo='visita' AND usuario_id IS NOT NULL`) con tabla de respaldo `interacciones_visitas_reset_backup`; recomputa `usuarios.xp_total` (resta `SUM(xp_ganado)` y los bonos de misiones/logros de visitas), `total_visitas`, `pandillas.fama_total` y `pandilla_retos`; resetea los flags JSONB `mis_primera_visita`, `mis_itinerario_perfeccion`, `logr_visitas_5`, `logr_visitas_20` (operador `jsonb - text`, ADR-003); conserva la analitica anonima y `usuarios_cromos`; crea el indice unico de visita y un indice de apoyo.

**Justificacion:** La geocerca debe ser server-side porque la validacion en cliente es evitable; Haversine puro evita agregar PostGIS o un endpoint nuevo (8/8) y mantiene el patron serverless liviano. El dedup-first + indice unico parcial resuelve a la vez la race condition y el farming: la reactivacion no repaga y el `DELETE` de `quitar_visita` deja de ser un vector de XP. Los radios adaptativos atacan la brecha rural con una regla determinista y auditable (keyword/subcategoria/densidad) y el bono plano -sin multiplicadores ni fama- premia el descubrimiento sin amplificar el abuso. El reset con respaldo era necesario porque el historico acumulado bajo las reglas viejas no es comparable con el nuevo esquema, y se hace una sola vez, conservando analitica anonima y cromos. El riesgo de spoofing se acepta explicitamente para este alcance y se escala a un ADR futuro (sesion firmada/atestacion).

**Impacto:** `api/interacciones.js` (v11: helpers Haversine/radios/constantes, `tipo=visita` reescrito, `quitar_visita` soft-delete, logro `logr_pionero`, `dims.geo`, catch 23505); `usuario-session.js` (geolocation + `marcarVisitado` con `lat/lng/accuracy/ts` + `mensajeErrorVisita`; ya en working tree/HEAD); `api/pagina-destino.js` (boton `marcarVisitadoBtn` que llama `marcarVisitado`); `db/migrations/014_reset_visitas_presencia_fisica.sql` (NUEVA); `scripts/test_logros_catalogo.js`, `scripts/smoke_test_perfil_progreso.js`, `scripts/smoke_test_comunidad.js` y `scripts/verify_comunidad_prod.js` (LOGROS 30, PASS); `api/utilidades.js` (conteo de visitas filtra `activo=true`); `usuario-session.js` (`sincronizarGuardados` ya no migra visitas); `scripts/smoke_visita_geocerca.js` (smoke dedicado del contrato, 15/15 PASS); docs (`BLUEPRINT.md` seccion 3). **Sin endpoints nuevos** (8/8, ADR-010). **Trade-off asumido:** el contador publico de visitas de `api/utilidades.js` puede BAJAR tras el reset porque incluye las filas gamificadas purgadas. **Drift residual documentado:** el `xp_ganado` de la fila es el XP base (20); los multiplicadores/amuletos se suman aparte y no quedan en la fila, por lo que el recomputo puede dejar un remanente positivo (nunca negativo). **Riesgo residual:** `lat/lng/accuracy` son suministrados por el cliente sin sesion firmada/atestacion -> ADR-025 candidato. **Pendiente:** aplicar la migracion 014 en el editor SQL de Neon (antes del deploy) + deploy. Cobertura del contrato: `scripts/smoke_visita_geocerca.js` 15/15 PASS (ejecutado 2026-09-12).

**ADR previos relacionados:** ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-006 (baseline de verdad), ADR-008 (SQL versionado), ADR-010 (presupuesto 8/8), ADR-012 (gamificacion/logros), ADR-014 (Milestones v2), ADR-018 (Gamificacion v4.0), ADR-022 (indices/constraints de interacciones)

---

## ADR-025: Sesion Firmada (JWT HMAC SHA-256) y Anti-Sybil (nonce de un solo uso, device fingerprint, email verificado)

**ID:** ADR-025
**Fecha:** 2026-09-14
**Estado:** Aprobado e implementado (Entrega 016, working tree; pendiente aplicar migracion 016 en Neon + configurar `SESSION_JWT_SECRET` en Vercel + deploy). CONSUME y CIERRA el candidato reservado como ADR-025 desde ADR-024 (atestacion de dispositivo / anti-spoofing de GPS).
**Autor:** AI-DOS Core (prompt `promptgamming.md`, Entrega 016 "ExploraCO Gaming v5.0", aprobada por arquitectura y verificada contra el repo real)

**Problema:** ADR-024 acepto de forma explicita como riesgo residual que `lat/lng/accuracy` del POST `tipo=visita` fueran datos suministrados por el cliente, sin sesion firmada ni atestacion de dispositivo: un request remoto podia "marcar Estuve aqui" y, con la piramide de referidos y el crowdsourcing de la Entrega 016, fabricar cuentas (ataque Sybil) para auto-referirse, granjear `xp_ref_total` y votar en bloque las propuestas de Activos Ocultos. La verificacion de identidad basada solo en `usuario_id` del body (patron historico) no ofrecia ninguna barrera.

**Opciones consideradas:**
1. **Statu quo (identidad solo por `usuario_id` en el body):** rechazada -- no hay forma de probar que quien envia la peticion controla la cuenta; permite suplantacion y Sybil trivial.
2. **Sesion firmada con JWT HMAC SHA-256 emitida por `api/usuarios.js` y validada en `api/interacciones.js`, acotada SOLO a las rutas sensibles (elegida):** firma con `SESSION_JWT_SECRET` (`firmarSesion`) y validacion con comparacion en tiempo constante (`timingSafeEqual` en `validarSesion`). Se aplica unicamente a `visita`, `activo_oculto_votar` y `activo_oculto_checkin` para no romper las rutas publicas ni ampliar la superficie de cambio.
3. **Atestacion nativa de dispositivo (Play Integrity / App Attest) o servicio externo:** descartada para este alcance por costo e infraestructura (el proyecto es web Vanilla sobre Vercel Hobby, sin app nativa); queda como evolucion futura.
4. **Nonce de un solo uso persistido (`geo_nonces`, expira 2 min) (elegida):** `GET ?tipo=geo_nonce_solicitar` emite un nonce y el POST lo consume (`usado=true`); evita reproducir (replay) un payload `lat/lng/accuracy` capturado. Complementa al JWT, no lo sustituye.
5. **Device fingerprint ligero (`usuarios.device_hashes` JSONB, tope 5) (elegida):** registro pasivo de huellas de dispositivo con tope, como senal anti-Sybil de bajo costo; no bloquea por si solo.
6. **Email verificado obligatorio por accion (elegida):** `email_verificado=true` requerido para generar/usar codigo de referido, proponer/votar Activos Ocultos y fundar un Parche; eleva el costo de crear cuentas desechables.

**Decision tomada:**
- **Sesion firmada JWT (HMAC SHA-256):** `api/usuarios.js` v9 firma el token con `SESSION_JWT_SECRET` (`firmarSesion`); `api/interacciones.js` v13 lo valida (TIMING-SAFE via `timingSafeEqual`) SOLO en las 3 rutas sensibles: `visita`, `activo_oculto_votar` y `activo_oculto_checkin`. El frontend (`usuario-session.js`) adjunta el JWT y hace refresh silencioso.
- **Nonce geoespacial de un solo uso:** `geo_nonces` (migracion 016, `expira_en DEFAULT now() + interval '2 minutes'`, indice unico `idx_geo_nonce_unico`); solicitado con `?tipo=geo_nonce_solicitar` y consumido en `visita` y en el `checkin` de Activo Oculto.
- **Device fingerprint:** `usuarios.device_hashes jsonb NOT NULL DEFAULT '[]'`, con tope de 5 huellas.
- **Email verificado obligatorio (gating):** requerido para codigo de referido, proponer/votar Activos Ocultos y fundar Parche (`fundar_parche`). El envio usa Resend (`RESEND_API_KEY`).
- **Riesgo residual:** si `SESSION_JWT_SECRET` no esta configurada, el codigo cae al fallback publico `dev_secret` y los tokens son falsificables -> variable OBLIGATORIA EN PRODUCCION (ver `docs/DEPLOY_016.md` y `.env.example`).

**Justificacion:** El JWT HMAC es la solucion de sesion mas simple que cabe en el stack (sin dependencias externas, sin endpoint nuevo: el token se emite en `usuarios.js` y se valida en `interacciones.js`, presupuesto 8/8 intacto, ADR-010). Acotarlo a 3 rutas sensibles disminuye el riesgo de regresion y mantiene publicas las lecturas y las acciones no sensibles. El nonce de un solo uso con TTL corto elimina el replay del payload geoespacial sin necesidad de criptografia asimetrica. `device_hashes` y `email_verificado` suman friccion al Sybil con costo minimo (JSONB + columna booleana, sin tablas nuevas de identidad). Consumir formalmente el numero reservado como ADR-025 cierra el candidato abierto por ADR-024, manteniendo el precedente de ADR-014 (no reutilizar numeros referenciados fuera del documento).

**Impacto:** `api/usuarios.js` v9 (mantiene `firmarSesion`, `SESSION_JWT_SECRET`, verificacion de email con Resend); `api/interacciones.js` v13 (helper `validarSesion` con `timingSafeEqual`, consumo de `geo_nonces` en visita y checkin); `db/migrations/016_multinivel_crowdsourcing.sql` (columna `device_hashes`, `email_verificado`, `email_token`, `email_token_expira` y tabla `geo_nonces`); `usuario-session.js` (adjunta JWT + refresh silencioso y fingerprint de dispositivo). **Sin endpoints nuevos** (8/8, ADR-010). Variables nuevas: `SESSION_JWT_SECRET` (obligatoria), `RESEND_API_KEY` (obligatoria para email, pendiente desde TASK-006), `SITE_URL` (enlace de verificacion) y `DEV_EMAIL_ECHO` (solo desarrollo). Verificacion: smoke `scripts/smoke_016_multinivel_crowdsourcing.js` 39/39 PASS y Escudo GOLD (node --check x3, ASCII 0 bytes >127, divs balanceados). **Pendiente BLOQUEANTE:** aplicar la migracion 016 en Neon y configurar las variables en Vercel antes del deploy.

**ADR previos relacionados:** ADR-002 (ASCII-safe), ADR-008 (SQL versionado), ADR-010 (presupuesto 8/8), ADR-014 (precedente de numeracion), ADR-018 (moneda `xp_total`), ADR-024 (riesgo residual de spoofing que este ADR cierra), ADR-027 (piramide multinivel y crowdsourcing que protege)

---

## ADR-026: Epic prompt.txt -- perfil museo v1, vocaciones acumulables, chat por plan privado y XP admin

**ID:** ADR-026
**Fecha:** 2026-09-13
**Estado:** Aprobado e implementado en working tree (Escudo GOLD verde: node --check, ASCII 0 bytes >127, divs mi-perfil 195/195, comunidad 223/223, admin 786/786). PENDIENTE aplicar `db/migrations/015_epic_prompt.sql` en Neon (lo aplica Javier tras el commit) + commit/push/deploy. Las migraciones 011-014 YA fueron aplicadas por Javier en Neon PRODUCCION (2026-09-13).
**Autor:** AI-DOS Core (spec `docs/superpowers/specs/2026-09-13-epic-prompt-vocaciones-chat-perfil-design.md`; prompt `prompt.txt`)
**Nota de numeracion:** la spec y el contexto de sesion sugerian "ADR-026", y el numero siguiente al ultimo ADR registrado en este documento (ADR-024) es el 025. Sin embargo, ADR-025 ya esta reservado en NEXT.md y en ADR-024 como CANDIDATO del anti-spoofing/atestacion de dispositivo (sesion firmada, riesgo residual de ADR-024). Por precedente ADR-014 (no reutilizar numeros referenciados fuera de este documento), el epic se registra como **ADR-026**; el 025 queda disponible cuando el candidato de sesion firmada se apruebe formalmente.

**Problema:** El prompt `prompt.txt` pidio: (1) que mi-perfil.html sea una pagina-museo de presentacion del usuario (viajes, trofeos, audiovisuales, mapas) con mejoras desbloqueables por nivel y consumibles; (2) perfiles de artista desbloqueables tipo Diablo/PoE/Albion (musico, cine, artista grafico) acumulables; (3) limpiar la comunidad a solo las salas de sistema "Chat general" y "Bogota" mas las creadas por usuarios, y desbloquear mejoras de chat por nivel; (4) que cada plan tenga un chat propio con sus miembros; (5) poder asignar XP desde admin para testear los 20 niveles; (6) BUG A: `album_detalle` devolvia 503 cuando la tabla `album_comentarios` (migracion 013) no existe; (7) BUG B: los albumes de usuarios sin lat/lng nunca aparecian en `multimedia_mapa` (mapa cultural sin fotos de usuarios).

**Opciones evaluadas / Decisiones de producto (Javier, 2026-09-13):**
1. **Vocaciones acumulables (elegida):** el usuario activa TODAS las vocaciones que desbloquea (no es exclusiva de una carrera). Se modelan como claves booleanas en `usuarios.vocaciones` jsonb (columna nueva), con catalogo versionado en codigo (patron de LOGROS, ADR-012): `VOCACIONES` = musico@5, cine@8, artista_grafico@11, cada una con habilidades[] y gate de nivel server-side (403 si no alcanza).
2. **Mejoras de perfil v1 (elegida):** SOLO marco dorado (`perfil_marco_dorado` 700 XP), tema galeria oscura (`perfil_tema_oscuro` 500 XP) y banda de artista (`perfil_banda_artista` 900 XP), consumibles permanentes insertados via ON CONFLICT (clave) en la migracion 015, activados por `usar_consumible` (ADR-018). Vitrina extendida y sello verificado quedan como futuro cercano.
3. **Chat de plan PRIVADO solo miembros (elegida):** se reusa `chat_salas` con `tipo='plan'` + liga `planes_viaje.sala_id` (FK nullable, sin tabla nueva de mensajes); GET `plan_chat` gate miembro/creador (403) y POST `plan_chat_msg` gate miembro + +2 XP tope 20/dia reutilizando `chatXpDisponible`/`registrarChatXp` (ADR-015). Defensa: `chat_msg` POST rechaza salas de plan y `chat_mensajes` GET las excluye. Alternativa descartada: tabla nueva de mensajes por plan (duplicaria chat_mensajes).
4. **Limpieza de salas del sistema (elegida):** DELETE en la migracion 015 de `chat_salas WHERE creador_id IS NULL AND nombre NOT IN ('Chat general','Bogota')` (idempotente, acumulativa sobre el seed de la 008; el DELETE CASCADA de chat_mensajes limpia los mensajes de esas salas). Las salas creadas por viajeros nunca se tocan.
5. **Admin XP (elegida):** POST `admin_xp` con Bearer `ADMIN_SECRET` (`process.env.ADMIN_SECRET || 'exploraco12345'`): acepta `{usuario_id, delta_xp}` (suma/resta, Math.max(0, ...)) o `{usuario_id, nivel}` 1-20 que sube al minimo del umbral del nivel usando `Math.max(NIVELES_ADMIN[nivel-1], xp_actual)` -- **NO degrada** a un usuario que ya supero ese nivel (no se quita XP ganado legitimamente). Recalcula con `calcularNivelLocal`/`calcularEraLocal`/`BADGES_LOCAL` y actualiza `usuarios.ultimo_acceso=NOW()` (nota: se uso `ultimo_acceso`, no `actualizado_en`, porque esa columna no existe en usuarios).
6. **BUG A -- degradacion graciosa (elegida):** helper `contarComentarioSafe(sql, fotoId)` que intenta la subquery de `album_comentarios` y ante 42P01/42703 devuelve 0 comentarios en vez de 503. Aplicado en `album_detalle`, `galeria_detalle` y `mi_feed_fotos`. `comentarios_recientes` (admin) SIGUE exigiendola (503 tipificado) porque la moderacion no debe degradar silenciosamente.
7. **BUG B -- herencia de coords (elegida):** `multimedia_mapa` ya no exige lat/lng en el album: helper `coordsFallbackAutor(sql, usuarioId)` hereda lat/lng/ciudad desde la primera `visita`/`guardado` del autor hacia un destino georreferenciado; los que quedan sin coords se descartan; flag `coords_heredadas` en la respuesta. Alternativa descartada: exigir al usuario cargar coords (no resuelve los albumes historicos ni el caso reportado de hostal r10).

**Decision tomada:** Se implementa todo dentro del presupuesto 8/8 de funciones serverless (ADR-010): 6 ramas `tipo=` nuevas en `api/interacciones.js` (GET `plan_chat`, `vocaciones_catalogo`, `vocaciones_usuario`; POST `plan_chat_msg`, `admin_xp`, `vocacion_activar`) + `?buscar=` en `api/usuarios.js`, sin endpoints nuevos. La migracion `db/migrations/015_epic_prompt.sql` (nueva, idempotente ADR-008, ASCII-safe ADR-002, cero emojis) crea `usuarios.vocaciones jsonb NOT NULL DEFAULT '{}'`, `planes_viaje.sala_id uuid REFERENCES chat_salas(id)` (FK nullable sin CASCADE), la limpieza de salas de sistema y los 3 consumibles `perfil_*`. Los GET `planes`/`planes_mios` exponen `p.sala_id` y comunidad.html muestra el indicador "chat activo" + modal "Chat del plan" con polling 5 s. Frontend: mi-perfil.html (museo-line en hero: trofeos·fotos·destinos; galeria de mejoras; seccion Vocaciones con toggle/candado/403; chip "Sin mapa" en albumes sin lat/lng; CSS vitrina de trofeos), comunidad.html (filtro defensivo `tipo==='plan'`, bloque "Niveles de chat" con 5 perks incl. `emojis_premium@7` y `sello_sala@10` en `CAPACIDADES_POR_NIVEL`, refactor compartido `chatMsgsHTML`/`chatPollTick`/`enviarMensajeOpt`), admin.html (tab "Jugadores" con buscador `?buscar=` compartido (`_adminBuscarUsuarios`) y tarjeta con nivel/XP/era/logros/vocaciones).

**Justificacion:** Vocaciones en jsonb + catalogo en codigo sigue el patron probado de LOGROS/MISIONES (sin tabla nueva, sin endpoint nuevo, merge ADR-003 en las actualizaciones) y permite acumulacion natural (toggles booleanos). El chat de plan reusa la tabla de mensajes existente con un campo `tipo` en chat_salas: cero duplicacion de schema y la sala queda ligada como FK fino (`planes_viaje.sala_id`), con defensas en el flujo general de chat para que las salas de plan no se mezclen con las publicas. `contarComentarioSafe` resuelve BUG A con degradacion explicita solo donde el contador es informativo (el admin de moderacion no degrada, coherente con la Regla de Oro de no silenciar fallos). `coordsFallbackAutor` resuelve BUG B sin migrar datos (deriva en lectura, ADR-003 spirit: nunca destruir datos del usuario). `admin_xp` con `Math.max` sobre el umbral cumple "subir a nivel X exacto" SIN quitar XP ganado (no degrada), que es el requisito de producto para testear la progresion completa.

**Impacto:** `api/interacciones.js` (v12, header L75-83; helpers `contarComentarioSafe`/`coordsFallbackAutor`, `VOCACIONES`, `NIVELES_ADMIN = NIVELES_LOCAL`, ramas nuevas, sala en `plan_crear`, `sala_id` en `planes`/`planes_mios`, catch de salas de plan en `chat_msg`/`chat_mensajes`); `api/usuarios.js` (v8: `?buscar=` ILIKE 2+ chars limit 20 via conLogros/conMisiones/conNivel, `vocaciones` en SELECT *); `db/migrations/015_epic_prompt.sql` (NUEVA, 103 lineas, 4 bloques, idempotente); `mi-perfil.html` (museo-line, mejoras, vocaciones, chip "Sin mapa", divs 195/195); `comunidad.html` (filtro salas plan, modal Chat del plan, Niveles de chat, refactor compartido, divs 223/223); `admin.html` (tab Jugadores + `_adminBuscarUsuarios`, divs 786/786); `usuario-session.js` (`emojis_premium@7`, `sello_sala@10`, `window.ExploraCO.vocaciones`). +2 XP por mensaje de plan con tope 20/dia (anti-farming de ADR-015). `subirNivelTest(n)` NO se creo (no hay helpers de test previos en el proyecto). Smoke dedicado del epic ENTREGADO en `scripts/smoke_test_epic_prompt.js` (50/50 PASS, ejecutado 2026-09-13: "SMOKE EPIC PROMPT: OK"; cubre vocaciones, admin_xp, plan_chat/plan_chat_msg, contarComentarioSafe, coordsFallbackAutor, queries capturadas sala_id/tipo!=plan, divs de los 3 HTML y la migracion 015). **Sin endpoints nuevos** (8/8, ADR-010). **Pendientes:** aplicar migracion 015 en Neon (Javier, tras el commit) + commit/push/deploy + verificacion en vivo (vocaciones end-to-end, admin_xp niveles 1-20, plan_chat con no-miembro 403, mapa cultural con el caso hostal r10). Backfill opcional de `sala_id` para planes existentes (la migracion deja NULL; solo los planes nuevos creados tras el deploy obtienen sala).

**ADR previos relacionados:** ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-006 (baseline de verdad), ADR-008 (SQL versionado), ADR-010 (presupuesto 8/8), ADR-012 (logros/catalogo en codigo), ADR-014 (Milestones v2), ADR-015 (comunidad/chat/planes), ADR-018 (consumibles), ADR-022 (constraints), ADR-023 (comentarios/BUG A), ADR-024 (presencia fisica/BUG B, `dims.geo`, coords reales de visita)

---

## ADR-027: Piramide multinivel de referidos + Crowdsourcing Wayfarer (Activo Oculto) + 4 Facciones + Mundo Artistas

**ID:** ADR-027
**Fecha:** 2026-09-14
**Estado:** Aprobado e implementado (Entrega 016, working tree; pendiente aplicar `db/migrations/016_multinivel_crowdsourcing.sql` en Neon + configurar env + deploy)
**Autor:** AI-DOS Core (prompt `promptgamming.md`, Entrega 016 "ExploraCO Gaming v5.0")
**Nota de numeracion:** el numero 027 es el consecutivo real tras ADR-026 (mayor registrado en este documento). El 025 se reservo para la sesion firmada/anti-Sybil (ahora ADR-025); por eso la piramide ocupa el 027 y no reutiliza numeros referenciados fuera del documento (precedente ADR-014).

**Problema:** La gamificacion v4.0 (ADR-018) tenia economia de XP, cromos y Parches, pero carecia de: (1) un sistema de referidos que capitalizara el boca a boca sin auto-farming; (2) un mecanismo de crowdsourcing geoespacial real (tipo Wayfarer/Niantic) para descubrir "Activos Ocultos" con validacion peer-to-peer; (3) una competencia colectiva que diera sentido social a los Parches; (4) una via de especializacion artistica dentro del catalogo de vocaciones. Ademas, el reparto de XP a referentes y votantes debia usar la moneda vigente (`xp_total`, ADR-018) sin introducir una segunda moneda ni persistir calculos derivables.

**Opciones consideradas:**
1. **Referidos de un solo nivel con comision fija:** simple, pero no incentiva la construccion de red y multiplica el farming directo. Descartada.
2. **Piramide de 5 niveles con ledger de XP por nivel:** permite auditar el reparto por nivel, pero exige una tabla de ledger y una migracion de mayor alcance. Descartada en favor de la CTE recursiva (calculo en consulta).
3. **Piramide de 5 niveles con `xp_ref_total` separado y CTE recursiva (elegida):** `referido_por` self-FK + CTE recursiva sobre `usuarios` (hasta 5 niveles) y reparto porcentual FLOOR `0.10/0.05/0.03/0.02/0.01` sobre un campo de apoyo `xp_ref_total`, sin ledger ni segunda moneda.
4. **Activo Oculto con aprobacion exclusivamente admin:** control de calidad alto pero cuello de botella operativo. Descartada.
5. **Activo Oculto peer-to-peer con quorum derivado (elegida):** proponer sin nivel minimo pero con email verificado; votar desde nivel 5; quorum de +/-3 votos netos y estado derivado; moderacion admin como red de seguridad.
6. **Facciones exclusivas (una sola de por vida):** aumenta el compromiso pero castiga la exploracion. Descartada.
7. **4 facciones commutables con costo en `xp_total` + cooldown de 15 dias (elegida):** primera eleccion gratis; el cambio cuesta XP y abre una ventana de cooldown para evitar el salto de faccion para inflar rankings.
8. **Vocaciones de artista exclusivas:** obliga a elegir una carrera. Descartada en favor de desbloqueo acumulable en bloque al nivel 5 (musico/cine/artista_grafico/escritor, coherencia con ADR-026 que abrio las 3 vocaciones acumulables).

**Decision tomada:**
- **Piramide multinivel:** columnas `usuarios.referido_por` (self-FK), `codigo_referido` (unico parcial), `xp_ref_total` y `referidos_directos_contados`; red derivada via CTE recursiva de maximo 5 niveles. Reparto `0.10/0.05/0.03/0.02/0.01` con `FLOOR` sobre `xp_ref_total`, con topes anti-farming de 500 XP por referencia y 20 referidos directos contados. Helper `repartirXpReferidos` inyectado en los 14 puntos de XP real de `api/interacciones.js` (excluye `admin_xp` y `comprar_consumible`). Registro con `?ref=<codigo>` y validacion de topes. El pago de faccion y el XP de referidos usan `xp_total`/`xp_ref_total` (ADR-018: no existe `puntos_canjeables`).
- **Crowdsourcing Wayfarer (Activo Oculto):** tablas `activos_ocultos` (estado `pendiente/aprobado/rechazado` con CHECK), `activos_ocultos_votos` (PK compuesta `activo_id + usuario_id`, CHECK `favor/contra`, un voto por usuario) y `activos_ocultos_checkins` (UNIQUE parcial por activo `activo=true`). Proponer sin nivel minimo pero con `email_verificado`; votar desde nivel 5; quorum +/-3 votos netos que recalcula estado server-side; ventana de 30 dias para la resolucion derivada; XP +50 proponente aprobado / +5 votante / +15 checkin. El checkin reutiliza el motor de geocerca Haversine de ADR-024 y exige nonce (ADR-025). Moderacion admin en `api/admin.js` (`tipo=activo_oculto_moderar`, Bearer admin): aprobar otorga +50 XP al proponente, rechazar no otorga XP y el borrado es logico (`activo=false`, Regla de Oro 3 / ADR-003).
- **4 Facciones:** `usuarios.faccion` con CHECK a `('exploradores','curadores','creadores','artistas')`; primera eleccion gratis; cambio por 500 `xp_total` mas cooldown de 15 dias (`faccion_elegida_en`). Ranking de facciones derivado de `usuarios.xp_total` (indice parcial `idx_usuarios_faccion`), sin tabla de "dueno".
- **Mundo Artistas:** las 4 vocaciones artisticas (musico/cine/artista_grafico/escritor) se desbloquean en bloque al nivel 5 y suman 6 misiones de artista; `artistas` cubre el bloque de vocaciones dentro de la competencia de facciones (coherencia con ADR-026).
- **Principio de calculo dinamico (no persistido):** la afinidad de Parche a Faccion (JOIN `pandillas_miembros` + `usuarios.faccion`) y el control territorial por ciudad (faccion con mas Activos Ocultos aprobados + checkins confirmados en 30 dias) se calculan en tiempo de consulta, mismo principio que nivel/era/badge derivados de `xp_total` (ADR-018). No se persiste un estado de "dueno" que pueda desincronizarse.

**Justificacion:** La CTE recursiva evita un ledger de reparto y mantiene `xp_ref_total` como numero plano de apoyo, con lo que no se crea una segunda economia; los topes y el `FLOOR` contienen el abuso. El crowdsourcing peer-to-peer con quorum derivado traslada el filtro de calidad a la comunidad (el costo de entrada es la verificacion de email, no el nivel del proponente), y el checkin reutiliza el motor de geocerca ya probado (ADR-024) para no duplicar infraestructura. Las facciones commutables con costo y cooldown generan compromiso sin encerrar al usuario, y el ranking derivado evita tablas mutables. Mantener calculos (afinidad, territorio, ranking) fuera de persistencia sigue el patron del proyecto de no guardar lo derivable. **Cero archivos nuevos en `/api`** (presupuesto 8/8, ADR-010): todo entra como ramas `tipo=` en `interacciones.js`/`usuarios.js`/`admin.js`.

**Impacto:** `db/migrations/016_multinivel_crowdsourcing.sql` (NUEVA, 209 lineas, idempotente ADR-008, ASCII-safe ADR-002: 10 columnas en `usuarios`, 4 tablas `activos_ocultos`/`activos_ocultos_votos`/`activos_ocultos_checkins`/`geo_nonces`, 8 indices); `api/usuarios.js` v9 (registro con `?ref=`, codigo de referido, 4 facciones, verificacion de email, sesion JWT); `api/interacciones.js` v13 (helper `repartirXpReferidos` en 14 puntos de XP, Activo Oculto completo, nonce/`validarSesion`, vocaciones en bloque nivel 5, 6 misiones de artista); `api/admin.js` (rama `activo_oculto_moderar`); frontend `mi-perfil.html` (Mi Red + QR + selector de facciones + panel de vocaciones + banner de verificacion), `comunidad.html` (relabel visible Pandilla->Parche + seccion Activo Oculto + ranking de facciones), `admin.html` (panel de moderacion de Activos Ocultos), `usuario-session.js` (catalogo de vocaciones nivel 5, fingerprint de dispositivo, JWT + refresh silencioso); `.gitignore` (filtra `.env`), `.env.example` y `docs/DEPLOY_016.md` (checklist). Verificacion: smoke `scripts/smoke_016_multinivel_crowdsourcing.js` 39/39 PASS; Escudo GOLD (node --check x3 PASS, ASCII 0 bytes >127, 0 backticks, balance de divs 0, idempotencia 13/13 DDL). Pendiente BLOQUEANTE: aplicar la migracion 016 en Neon + configurar `RESEND_API_KEY` y `SESSION_JWT_SECRET` en Vercel + commit/push/deploy.

**ADR previos relacionados:** ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-008 (SQL versionado / idempotencia), ADR-010 (presupuesto 8/8), ADR-012 (catalogo en codigo / misiones), ADR-018 (moneda `xp_total`, consumibles, 20 niveles), ADR-022 (constraints e indices), ADR-024 (motor geocerca reutilizado por el checkin), ADR-025 (sesion firmada, nonce y email verificado), ADR-026 (vocaciones acumulables)

---

## ADR-028: Perfil publico tipo museo + Mensajeria Directa + Arbol de Clases de 16 ramas + Casas + categorias de consumibles

**ID:** ADR-028
**Fecha:** 2026-09-15
**Estado:** Aprobado e implementado (working tree; pendiente aplicar `db/migrations/017_perfil_publico_arbol_casas.sql` y `db/migrations/018_consumibles_categorias.sql` en Neon + commit/push/deploy). El smoke dedicado `scripts/smoke_017_perfil_arbol_casas.js` esta ENTREGADO y en verde (`node scripts/smoke_017_perfil_arbol_casas.js` -> 73/73 PASS, 2026-09-15) -- verificado contra archivo real (ADR-006): el archivo existe.
**Autor:** AI-DOS Core (Entrega TSK-103 "Perfil publico museo + DM + Arbol de 16 ramas + Casas + categorias de consumibles", WP-1..WP-7; aprobada por el dueno del repositorio)
**Nota de numeracion:** el 028 es el consecutivo real tras ADR-027 (mayor registrado en este documento); no se reutilizan numeros referenciados fuera del documento (precedente ADR-014).

**Problema:** La Entrega 016 (ADR-027) dejo el sistema social y de gamificacion con capacidades backend sin superficie publica completa. Faltaban cinco piezas de producto: (1) un **perfil publico tipo museo** del usuario (`perfil.html?id=`) que exponga sus trofeos/fotos/destinos sin filtrar PII; (2) **mensajeria directa (DM)** entre usuarios con minima friccion y sin spam; (3) un **Arbol de Clases de 16 ramas** (estilo Albion) que de sentido de progresion por faccion, con 5 nodos por rama; (4) **Casas** como capa social de pertenencia (espejo de facciones, pero con gate de nivel y sesion); (5) **categorias de consumibles** para que la tienda deje de ser una lista plana. Ademas, la propia implementacion destapo 5 regresiones funcionales (R-1..R-5) y 4 fallos adicionales de seguridad/consistencia (fuga de PII preexistente en `api/usuarios.js`, carrera del cobro del DM, `museo_publico` que tragaba el error de esquema, y conteos de Activos Ocultos sin filtrar `activo=true`).

**Opciones consideradas:**
1. **Propuesta 1 -- Arbol territorial puro (descartada):** el Arbol de Clases solo progresa en la rama de la faccion del usuario y las ramas de otras facciones quedan bloqueadas. Aumenta la identidad de faccion, pero penaliza la exploracion, obliga a un cambio de faccion (500 XP + 15 dias de cooldown, ADR-027) para tocar otra rama y contradice el principio de "calculos derivados, no persistidos" al necesitar un estado de rama activa exclusiva por usuario. Descartada por decision del dueno: se progresa en TODAS las ramas de cualquier faccion.
2. **Propuesta 2 -- Solo Casas, sin Arbol (descartada):** entregar unicamente la capa de pertenencia (Casas) y posponer el Arbol. Menor superficie y riesgo, pero no resuelve la ausencia de una progresion profunda por faccion ni aprovecha los 16 senderos ya especificados; deja la gamificacion v5 a medias. Descartada por alcance insuficiente.
3. **Arbol de Clases + Casas + perfil museo + DM + categorias (elegida):** las 5 piezas viajan en una sola entrega, todo como ramas `tipo=` sobre los endpoints existentes (presupuesto 8/8, ADR-010), con esquema aditivo e idempotente (ADR-008) y calculos derivados.
4. **Mensajeria via endpoint nuevo o tabla de mensajes aparte:** descartada -- duplicaria `chat_mensajes`; se reutiliza `chat_salas` con `tipo='dm'` + `clave_dm` (par de uuid ordenado) y la tabla de bloqueos `usuario_bloqueos`.
5. **Arbol persistido como XP de rama:** descartada -- se mantiene el principio de ADR-018 (moneda unica `xp_total`); los puntos de rama `D_R` se recalculan en cada lectura a partir de las acciones del usuario (con bonos de misiones completadas) y solo se persisten las fechas write-once de activacion de nodo (`usuarios.progreso_arbol`).

**Decision tomada:**
- **Perfil publico museo:** `perfil.html` (NUEVO, `?id=`) es la vista publica "museo" del usuario. Consume UNA sola llamada (`GET interacciones?tipo=museo_publico`) que ensambla perfil + trofeos + fotos + destinos. `api/usuarios.js` gana `GET tipo=perfil_publico` (version ligera). El perfil propio sigue en `mi-perfil.html`.
- **Mensajeria Directa (DM):** ramas `dm_enviar` / `dm_hilos` / `dm_mensajes` / `dm_bloquear` en `api/interacciones.js`, sobre `chat_salas.tipo='dm'` con `clave_dm` (par de uuid ordenado) e indice unico parcial `idx_chat_salas_dm_unica`; los bloqueos viven en la tabla NUEVA `usuario_bloqueos` (PK compuesta `bloqueador_id + bloqueado_id`, CHECK de no-auto-bloqueo). Hilo nuevo cobra 20 XP al emisor para desincentivar el spam.
- **Arbol de Clases de 16 ramas:** catalogo `RAMAS` en codigo (16 = 4 facciones x 4 ramas, 5 nodos cada una) con `RAMA_TIERS = [0, 100, 250, 450, 700]`. Los puntos derivados `D_R` se recalculan en cada lectura y los bonos por nodo provienen SOLO de misiones completadas (coherente con ADR-012). `rama_activar` exige nivel 5 y NO exige coincidencia de faccion (se progresa en todas las ramas); las ramas `art_*` delegan en `usuarios.vocaciones`. Persistencia write-once de las fechas de nodo en `usuarios.progreso_arbol` (merge JSONB, ADR-003). `museo_publico` expone el arbol en solo lectura.
- **Origen derivado (WP-5 / v15):** el Origen (`local` / `nacional` / `extranjero`) se deriva por FILA de accion comparando `usuarios.pais_base` (columna nueva) y `ciudad_base` con la ciudad del destino (normalizada con `TRANSLATE` para tolerar tildes). El bono x1.2 se aplica SOLO dentro de `D_R` (nunca sobre `xp_total` ni sobre `interacciones.xp_ganado`). 8 misiones de grupo `perfil` (`mis_perfil_*`).
- **Casas:** `POST tipo=casa_elegir` (espejo de `faccion_elegir` pero con sesion firmada y nivel 2) y `GET tipo=casa_ranking` (normalizado por numero de miembros). Columnas `usuarios.casa` (CHECK `chk_usuarios_casa`) y `usuarios.casa_elegida_en`; indices `idx_usuarios_casa`.
- **Categorias de consumibles:** `consumibles.categoria varchar(30) NOT NULL DEFAULT 'general'` (migracion 018) con 5 categorias: `perfil` (7), `impulso` (3), `social` (4), `coleccion` (2), `general` (1) = 17 filas. `GET consumibles?categoria=` filtra (degradacion si la columna no existe, ADR-008); `api/admin.js` acepta `categoria` en `consumibles_lista`/`crear`/`editar` con `normalizarCategoriaConsumible` (400 `CATEGORIA_INVALIDA`). El nodo 5 del Arbol aplica descuento a la categoria del consumible.
- **perfil_actualizar:** `POST tipo=perfil_actualizar` (alias `perfil_editar`) con SET dinamico parametrizado y sesion firmada del dueno; `pais_base` ISO-2; merge JSONB de `perfil_config`; `perfil_publico`/`dm_abierto` booleanos.
- **Blindaje PII (WP-3 / v10):** `GET usuarios?tipo=perfil_publico` y `GET ?id=` pasan a proyeccion owner-aware (subconjunto publico SIN email/tokens/device_hashes/codigo_referido; solo admin o el dueno ven el detalle completo); `?buscar=` exige admin; `?tipo=referido_codigo` exige sesion firmada JWT (ADR-025).
- **Paginas estaticas:** `api/utilidades.js` agrega `/registro.html` y `/perfil.html` a `STATIC_PAGES` (sitemap).

**Desviaciones justificadas vs el prompt de la entrega (registro obligatorio):**
- **(a)** `usuarios.bio` YA existia en Neon sin versionar; NO se re-declara en la migracion 017 (evita un `ADD COLUMN` sobre una columna presente).
- **(b)** NO se crea el indice `idx_chat_mensajes_sala_fecha` porque `idx_chat_mensajes_sala` YA existe; crearlo seria redundante.
- **(c)** SI se crea el CHECK `chk_chat_salas_tipo` (la migracion 008 no lo tenia), pese a que el prompt decia "no inventes uno": era necesario para sostener `tipo='dm'` y el ACID del tipo de sala. Se elimina primero `chat_salas_tipo_check` (nombre autogenerado legacy) para evitar constraints duplicadas.
- **(d)** Los 5 senderos de `tabla_destino` CONVIVEN en la UI (no se reemplazan por el Arbol de Clases); el Arbol es una capa nueva, no un sustituto.
- **(e)** Se progresa en TODAS las ramas de CUALQUIER faccion (decision del dueno; `rama_activar` solo exige nivel 5), en lugar de restringir a la faccion del usuario.

**Deuda detectada (patron BUG-021 -- columnas no versionadas):** durante la implementacion se confirmaron columnas que existen en Neon pero NO estan declaradas en ninguna migracion versionada: `interacciones.activo` y `usuarios.bio`/`usuarios.activo`. Se documenta como deuda tecnica; no se altera el esquema vivo (Regla de Oro 3: cero borrado logico) y no se declaran en 017 para no chocar con la realidad. Ver BUGS_HISTORICOS.md BUG-021 (patron).

**Consecuencias positivas:**
- Cinco features de producto entregadas SIN un solo archivo nuevo en `api/` (8/8 intacto, ADR-010); todo entra como ramas `tipo=`.
- Cierra la fuga de PII preexistente en `api/usuarios.js` (un `GET ?id=` publico exponia email/tokens/device_hashes) y la carrera del cobro del DM (hilo nuevo idempotente via `ON CONFLICT (clave_dm)`).
- Corrige 5 regresiones funcionales R-1..R-5 (referidos inalcanzables y visita rota se cierran en su parte de frontend) y endurece la degradacion (`museo_publico` responde 503 tipificado en vez de 404 cuando falta el esquema).
- El Arbol de 16 ramas reutiliza el patron catalogo-en-codigo + puntos derivados (ADR-012/ADR-018): sin segunda moneda, sin ledger, con persistencia minima write-once.
- Categorias de consumibles dejan de exigir migracion para agregar categorias nuevas (catalogo administrable).

**Consecuencias negativas / riesgos residuales:**
- Dos migraciones nuevas (017 y 018) cuyo orden importa: 018 presupone 017 aplicada (la 017 agrega `consumibles.categoria`; la 018 solo la reparte). Sin aplicarlas, el Arbol, las Casas, el DM y las categorias fallan por esquema inexistente.
- El smoke dedicado `scripts/smoke_017_perfil_arbol_casas.js` no existia al primer cierre de esta documentacion (en elaboracion); fue ENTREGADO despues y pasa 73/73 PASS (`node scripts/smoke_017_perfil_arbol_casas.js`, 2026-09-15), por lo que deja de ser un riesgo residual.
- El bono x1.2 y los `D_R` derivados introducen un drift potencial de XP similar al ya documentado en ADR-024/ADR-027 (sin ledger); el calculo por fila de accion mitiga, no elimina.
- Se mantiene la deuda de columnas no versionadas (patron BUG-021).

**Impacto:** `db/migrations/017_perfil_publico_arbol_casas.sql` (NUEVA, aditiva e idempotente ADR-008, ASCII-safe ADR-002: columnas en `usuarios` -- `intereses`, `pais_base`, `casa`, `casa_elegida_en`, `progreso_arbol`, `perfil_config`, `perfil_publico`, `dm_abierto` --, `consumibles.categoria`, `chat_salas.clave_dm`, CHECK `chk_chat_salas_tipo`, indices DM, tabla `usuario_bloqueos` e indices `idx_usuarios_casa`/`idx_usuarios_pais_base`/`idx_interacciones_usuario_tipo_activo`); `db/migrations/018_consumibles_categorias.sql` (NUEVA: reparte los 17 consumibles en perfil 7 / impulso 3 / social 4 / coleccion 2 / general 1); `perfil.html` (NUEVO, perfil publico museo); `registro.html` (NUEVO, alta con `?ref=`); `api/usuarios.js` v12 (perfil_publico ligero, blindaje PII owner-aware, casas, perfil_actualizar); `api/interacciones.js` v15 (museo_publico, DM, arbol, rama_activar, consumibles?categoria, Origen + 8 misiones perfil); `api/admin.js` (`categoria` en consumibles); `api/utilidades.js` (STATIC_PAGES `/registro.html` y `/perfil.html`); `mi-perfil.html` (Mi Red con QR/codigo/enlace, bandeja DM, Arbol SVG con 7 pestanas, "Completa tu perfil", selector de Casa, tienda por chips, fixes R-3/R-5); `comunidad.html` (R-4, relabel); `index.html` (R-5); `usuario-session.js` (captura `?ref=` con TTL 30d + `loginConEmail` con `codigo_referido` + JWT en refresco); `docs/DEPLOY_017.md` (NUEVO checklist); `scripts/verify_017_precheck.js` (NUEVO, read-only); `scripts/smoke_017_perfil_arbol_casas.js` (ENTREGADO, `node scripts/smoke_017_perfil_arbol_casas.js` -> 73/73 PASS). **Sin endpoints nuevos** (8/8, ADR-010). **Pendiente operativo (bloqueante):** aplicar 017 y 018 en Neon (016/015 ya aplicadas) + commit/push/deploy + verificacion en vivo (el smoke de cierre ya esta ENTREGADO y en verde).

**ADR previos relacionados:** ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-006 (baseline de verdad), ADR-008 (SQL versionado / idempotencia), ADR-010 (presupuesto 8/8), ADR-012 (catalogo en codigo / misiones), ADR-014 (precedente de numeracion), ADR-018 (moneda unica `xp_total`, consumibles), ADR-022 (constraints e indices), ADR-024 (geocerca / presencia fisica), ADR-025 (sesion firmada JWT, nonce, email verificado), ADR-026 (vocaciones acumulables, perfil museo v1, mejoras de perfil), ADR-027 (piramide, facciones, Wayfarer)

---

## ADR-029: Verificacion admin (auto-verificacion en el upsert + rama `verificar_usuario`) y dashboard real del admin (5 tarjetas + filtro de verificados)

**ID:** ADR-029
**Fecha:** 2026-09-15
**Estado:** Aprobado e implementado (working tree; pendiente aplicar `db/migrations/017_perfil_publico_arbol_casas.sql` y `018_consumibles_categorias.sql` en Neon + commit/push/deploy). Sin migracion nueva ni archivo nuevo en `api/` (8/8, ADR-010).
**Autor:** AI-DOS Core (TSK-104 "Verificacion admin forzada + dashboard con datos reales"; decisiones aprobadas por el dueno del repositorio, 2026-09-15)
**Nota de numeracion:** el 029 es el consecutivo real tras ADR-028 (mayor registrado en este documento).

**Problema:** El dashboard de `admin.html` mostraba datos falsos o incompletos: la tarjeta "Viajeros registrados" (`ds-usuarios`) renderizaba `st.destinos` (numero de destinos publicados, no usuarios), `ds-visitas` mostraba un placeholder estatico `'📊'` en vez de datos reales y no existia tarjeta de "Items verificados". Ademas, la verificacion de email (columna `usuarios.email_verificado`, migracion 016) dependia de un token enviado por Resend, y `RESEND_API_KEY` sigue pendiente de configurar en Vercel: no habia forma de desbloquear manualmente a un usuario legitimo (referidos, facciones, proponer Activos) ni de garantizar que la cuenta admin del proyecto quedara verificada. Tampoco habia superficie visual para el campo `destinos.verificado` (ADR-019), que existia en datos pero era invisible en la tabla.

**Opciones consideradas:**
1. **Reutilizar `stats.usuarios` de `api/destinos.js` (rechazada):** ese endpoint no conoce la tabla `usuarios`; el campo no existe y crearlo mezclaria responsabilidades (los destinos con la identidad de usuarios).
2. **Crear un endpoint/archivo nuevo para conteos globales (rechazada):** viola el presupuesto fijo 8/8 de Vercel Hobby (ADR-010). Todo debe entrar como rama `tipo=` en un endpoint existente.
3. **Rama `visitas_global` en `api/utilidades.js` + campo aditivo `total` en el leaderboard (elegida):** `utilidades.js` ya es el endpoint de `visitas` y estadisticas, por lo que el conteo global de visitas encaja semanticamente; `api/usuarios.js?tipo=leaderboard` es el unico punto que ya agrega sobre `usuarios`, asi que el conteo de viajeros va alli como campo ADITIVO (no rompe consumidores).
4. **A2: 403 vs 401 (elegida 401):** el prompt original pedia 403 para falta de Bearer; se implemento 401 por consistencia con `esAdminUsuario` (patron real del archivo para lecturas admin-only de PII, ADR-028/WP-3).
5. **A1: auto-verificacion del admin vs depender del token de email (elegida auto-verificacion):** mientras `RESEND_API_KEY` no este configurada, el admin queda bloqueado; se fuerza la verificacion en el upsert con una condicion explicita. Riesgo residual aceptado (ver H4).

**Decision tomada:**
- **A1 - auto-verificacion del admin en el upsert:** el INSERT de `usuarios` incluye `email_verificado` y el `ON CONFLICT (auth_id) DO UPDATE` aplica `COALESCE(usuarios.email_verificado, false) OR EXCLUDED.email_verificado` (idempotente y monotona: nunca desmarca). La condicion para auto-verificar es `email.toLowerCase() === 'brsk84@gmail.com' || nombre.toLowerCase() === 'javier'`.
- **A2 - rama POST `tipo=verificar_usuario` (admin-only):** con `esAdminUsuario(req)` (Bearer `ADMIN_SECRET` o `X-Internal-Secret`); 401 sin autorizacion, 400 si falta `usuario_id`, 404 si el usuario no existe; `UPDATE usuarios SET email_verificado=$1 WHERE id=$2 RETURNING id`; responde `{ ok, usuario_id, email_verificado }`. El valor enviado es el estado final (permite marcar y desmarcar).
- **C1 - conteo real de usuarios:** `GET ?tipo=leaderboard` devuelve `total` (`SELECT COUNT(*)::int FROM usuarios WHERE activo = true`) como campo aditivo; `admin.html` lo consume para `ds-usuarios`.
- **C2 - visitas globales:** nueva rama admin-only GET `?tipo=visitas_global` en `api/utilidades.js` -> `{ ok, total, v30, v7 }` sobre `interacciones tipo='visita' AND activo=true`; `admin.html` la consume para `ds-visitas`. No existia endpoint de visitas globales; se evitó crear uno nuevo.
- **C3/C4 - dashboard de 5 tarjetas:** la 5a tarjeta `ds-verificados` se deriva del array local `places` (`p.verificado === true`) y `.stats-grid` pasa a `repeat(5,1fr)`.
- **B - superficie de `verificado` en la tabla:** fila verde (`#f0fdf4` + borde `#22c55e`) y badge `VERIF` cuando `p.verificado`; pill de filtro "Verificados" (`data-verified`, `currentVerifiedFilter`, `setVerifiedFilter()`). El campo sigue siendo control interno: no se renderiza insignia publica (coherente con ADR-019).
- **Fix post-sync:** `syncFromNeon()` re-renderiza el dashboard si la pantalla esta activa, para que las 5 tarjetas no queden en 0 en un navegador limpio.

**Justificacion:** El dashboard es la superficie operativa del PM; mostrar destinos como "viajeros" o un placeholder de visitas es informacion enganosa (principio de no enganar al operador). La verificacion manual admin es necesaria porque `RESEND_API_KEY` sigue pendiente y porque un usuario legitimo puede quedar bloqueado por un fallo de correo; el patron `esAdminUsuario` ya existe y evita inventar un canal de autorizacion nuevo. Todo entra como ramas `tipo=` y campos aditivos, sin tocar `api/destinos.js`, sin migracion y sin archivo nuevo: riesgo de regresion minimo y presupuesto 8/8 intacto (ADR-010). La eleccion de 401 (en lugar del 403 sugerido) prioriza la consistencia con el archivo real (ADR-006), que es mas importante que seguir literalmente el prompt.

**Impacto:** `api/usuarios.js` v9 -> v13 (+45/-6: A1, A2, `total` en leaderboard; el header saltaba desde v9 aunque el changelog ya documentaba v10-v12 de TSK-103). **Nota de version (ADR-006, 2026-09-15):** el header real HOY es v14 por el hotfix de login BUG-054 (`device_hashes`, ajeno a esta decision); v13 es el estado al cierre de TSK-104; `api/utilidades.js` v2 (+24/-0: rama `visitas_global`); `admin.html` (+42/-8: fila/badge/filtro de verificados, 5a tarjeta, `total` y `visitas_global` reales, CSS `repeat(5,1fr)`, re-render post-sync). Sin migraciones nuevas, sin endpoints nuevos (8/8). **Pendiente operativo:** aplicar 017 y 018 en Neon (016/015 ya aplicadas) + commit/push/deploy + verificacion en vivo. Documentado en TASKS.md TSK-104 y NEXT.md.

**Consecuencias positivas:**
- Dashboard con datos reales (usuarios, visitas totales/30d/7d) y nueva tarjeta de verificados; se corrige un mapeo enganoso (`st.destinos` como usuarios).
- La cuenta admin puede quedar verificada sin depender de Resend, y un admin puede verificar/desverificar a cualquier usuario por UUID (desbloquea referidos/facciones/proponer Activos).
- `destinos.verificado` (ADR-019) gana superficie visual y filtro en la tabla, sin exponer insignia publica.

**Consecuencias negativas / riesgos residuales:**
- **H4 (riesgo aceptado):** cualquier usuario que se registre con nombre `javier` (o email `brsk84@gmail.com`) queda auto-verificado; es el requisito textual del prompt, pero abre un vector de integridad (un tercero podria auto-verificarse usando ese nombre). A revisar en una iteracion futura.
- **H6:** `GET ?tipo=leaderboard` es publico y ahora expone `total` (conteo de usuarios) sin Bearer; es un dato agregado de baja sensibilidad, pero cambia la superficie publica.
- **H7:** `verificar_usuario` con `usuario_id` no-UUID devuelve 500 (capturado por el try externo) en vez de 400; inconsistencia de validacion.
- **H8 (preexistente, fuera de TSK-104):** `api/utilidades.js` tiene un `.catch(function(){})` vacio en la rama `visitas` POST, un baseline no-ASCII (680 bytes >127) y 24 backticks; se documenta, no se corrige aqui. Las lineas nuevas de esta entrega estan limpias.
- Persisten como bloqueantes las migraciones 017/018 en Neon (heredado de TSK-103), ajenas al alcance de esta decision.

**ADR previos relacionados:** ADR-002 (ASCII-safe), ADR-006 (baseline = archivo real), ADR-010 (presupuesto 8/8), ADR-019 (`destinos.verificado` como control interno admin, sin insignia publica), ADR-025 (sesion firmada / email verificado), ADR-028 (blindaje PII y patron `esAdminUsuario`; `verificar_usuario` extiende la verificacion de email)

---

## ADR-030: Galeria unificada de la ficha de destino (curadas + viajeros + albumes) con MVP de voto, guardar en album y blindaje de escritura del album

**ID:** ADR-030
**Fecha:** 2026-09-16
**Estado:** Aprobado e IMPLEMENTADO (MVP) en working tree; **PENDIENTE aplicar la migracion 004 (`scripts/apply_004_foto_url.js`) y ejecutar `scripts/dedupe_destinos_fotos.js --apply` (dedupe + indice unico) en Neon + commit/push/deploy.**
**Autor:** architect (AI-DOS) con decision de producto del Chief Architect; implementado en el lote "promptarreglos" y revisado por `architect-review`
**Nota de numeracion:** el 030 es el consecutivo real tras ADR-029 (mayor registrado en este documento); el numero estaba RESERVADO por la spec `docs/superpowers/specs/2026-09-15-galeria-unificada-destino-design.md`.

**Problema:** la ficha de destino (`api/pagina-destino.js`) tenia dos modulos de fotos desconectados: `#galeria` (fotos curadas de `destinos_fotos`, sin interaccion) y `#fotos` ("Fotos de viajeros", `interacciones.tipo='foto'`, votables via `foto_voto`), lo que producia dos grillas sin unidad editorial. Un tercer origen disponible (`album_fotos` geolocalizadas, ya servido por `tipo=galeria_destino`) solo lo consumia `galeria.html`; `album_voto` existia en backend sin ningun frontend (brecha G-07/D-12); y no habia UI para guardar una foto en un album aunque `album_agregar_foto` ya existia. En paralelo, esa rama de escritura no validaba la propiedad del album (IDOR: se podia escribir en el album de otro usuario) y `album_voto` no repartia referidos (gap de ADR-027). A esto se sumo la causa raiz de los 503 `SCHEMA_NOT_MIGRATED` de museo/galeria/albumes/perfil publico: la migracion 004 (`usuarios.foto_url`) NUNCA se aplico en Neon (mismo patron que BUG-021). El presupuesto de endpoints de Vercel Hobby esta agotado (8/8; ver ADR-001), por lo que la unificacion debia lograrse extendiendo endpoints existentes y sin romper `galeria.html`.

**Opciones consideradas:**
1. **Modulo nuevo con endpoint nuevo:** descartada -- viola el limite de 8 funciones serverless de Vercel Hobby (ADR-001).
2. **Tabla unica de votos / unificar persistencia:** descartada -- exigiria migracion de datos y cambio de esquema (ADR-008) sin beneficio; `album_votos` (PK) y el mecanismo `interacciones.dims` ya funcionan y estan desplegados.
3. **Extender `tipo=galeria_destino` con `items[]` aditivo + `incluir`/`usuario_id`, y unificar la UI en `#galeria` (elegida):** cero endpoints nuevos, cero cambios a `galeria.html`, un unico modulo con boton de voto (viajeros/album) y "Guardar en album", y blindaje de la escritura del album.
4. **Reemplazar `#fotos` por `#galeria` borrando el modulo viejo:** descartada por Cero Borrado Logico -- se conserva el ancla invisible `#fotos` y los identificadores historicos (`loadFotos`/`subirFoto`/`votarFoto`).
5. **Votar las fotos curadas en esta entrega (tipo `foto_curada_voto`):** descartada (ver Decision tomada): el acoplamiento con `destinos_fotos` no es estable bajo la nueva semantica REPLACE.

**Decision tomada:**
- **Una sola seccion `#galeria`:** `secGaleria` y `secFotos` se fusionan en una unica seccion con miniaturas curadas + "Fotos de viajeros" (`#fp-grid`) + caja de subida (`#fp-upload`). Se conserva un ancla invisible `<span id="fotos">` (Cero Borrado Logico de deep-links). El modulo unificado se muestra SIEMPRE en la ficha (el smoke `scripts/smoke_auditoria_pagina_destino.js` pasa a 54 checks).
- **Contrato aditivo `tipo=galeria_destino`:** se conservan `destino[]`/`fotos[]`/`usuarios[]` para `galeria.html` (extension aditiva, regresion cero) y se agrega la clave NUEVA `items[]` normalizada (`{ origen, id_origen, tipo_voto, url, caption, votos, ya_votado, es_propia, autor_id, autor_nombre, autor_avatar, album_id, album_titulo, foto_type, media_source, creado_en }`), con dedup por URL y precedencia `curada > viajero > album`.
- **`items[]` SOLO se emite si el cliente envia `incluir`** (CSV `viajeros,albumes`). Esto protege a `galeria.html`, que sigue llamando sin `incluir` ni `usuario_id` y recibe exactamente el contrato previo mas la clave nueva; sin `incluir`, `items[]` queda vacio/no se emite.
- **`origen='album'` APAGADO por defecto:** las fotos de albumes por cercania solo aparecen cuando el cliente pide `incluir=albumes`. La ficha lo hace; `galeria.html` no.
- **MVP de voto (alcance recortado):** NO se permite votar fotos curadas en esta entrega. No se creo el tipo `foto_curada_voto`; para las tarjetas curadas `tipo_voto=null`. Se vota SOLO viajeros (`POST tipo=foto_voto`) y album (`POST tipo=album_voto`). Razon: `destinos_fotos.id` NO es un ancla estable.
- **`destinos_fotos.id` NO es estable:** la nueva semantica REPLACE de la galeria (`DELETE` + reinsert deduplicado, ver abajo y BUG-056) re-crea las filas en cada guardado, por lo que un voto persistido contra ese `id` quedaria huerfano. Consecuencia: no sirve como ancla de voto -> refuerza el recorte del MVP.
- **Guardar en album (UI nueva):** las fotos de viajeros estrenan "Guardar en album" alimentado por `GET ?tipo=albumes` + `POST tipo=album_agregar_foto`. La UI escapa todo con el helper cliente `galEsc()` (cierra un XSS preexistente en el inline de la ficha).
- **`autor_original_id` null:** `album_agregar_foto` lo normaliza con `body.autor_original_id || usuarioId2` y el dedup se hace por SELECT; no se depende del indice unico (en Postgres los NULL son distintos y desactivarian el dedup).
- **Blindaje de escritura del album (seguridad):** `album_agregar_foto` valida la PROPIEDAD del album (403 `ALBUM_AJENO`) y tipifica `23503` -> 400 `AUTOR_ORIGINAL_INVALIDO`. `album_voto` ahora llama `repartirXpReferidos` (delta real de `album_voto` = solo ese reparto; cierre del gap de ADR-027).
- **Unificacion "Como llegar" + "Ubicacion":** `secTransporteHostal` (id="como-llegar") y `secMapa` (id="mapa") se fusionan en `secComoLlegar` (id="como-llegar", transporte arriba + mapa abajo), con UNA sola entrada de subnav `como-llegar` y anclas legacy invisibles `#fotos` y `#mapa`.
- **Degradacion (nunca 503 por columna faltante):** helper `queryConAvatarFallback` en `api/interacciones.js` degrada `42703` (`usuarios.foto_url` ausente, migracion 004) reintentando con `avatar_url` en `museo_publico`, `album_detalle`, `galeria_destino` y `perfil_publico`. Es la mitigacion del BUG-060 (patron defensivo iniciado en BUG-051), no un sustituto de aplicar la migracion.
- **Semantica REPLACE de `destinos_fotos`:** PUT/POST de `api/admin-destinos.js` y POST de `api/utilidades.js` deduplican por url + DELETE + reinsert, con guard anti-perdida (lista vacia -> 400 y NO borra). `admin.html` deja de hacer la doble escritura. Detalle en BUG-056.

**Justificacion:** `items[]` aditivo da a la ficha un contrato unico sin tocar `galeria.html` ni borrar modulos previos, y mantiene el dedup por URL que la ficha ya aplicaba en `galAll`. Reutilizar `album_voto` y `album_agregar_foto` cierra la brecha G-07/D-12 y activa XP ya implementado sin endpoints nuevos (ADR-001). No persistir contadores y apoyar el voto en `interacciones`/`album_votos` respeta el patron del proyecto (nada derivable se guarda). No votar curadas en el MVP evita comprometer el contrato de voto con un `id` que la semantica REPLACE vuelve inestable; se documenta como recorte explicito, no como omision. Validar la propiedad del album y repartir referidos en `album_voto` cierra dos fallos reales de seguridad/consistencia que la nueva UI habria hecho visibles. La degradacion por query blinda las superficies contra el estado real de Neon (004 pendiente), siguiendo la leccion de BUG-021/BUG-051/BUG-060.

**Impacto:** `api/interacciones.js` (extender `tipo=galeria_destino` con `incluir`/`usuario_id`/`items[]`/dedup; helper `queryConAvatarFallback`; 403 `ALBUM_AJENO` / 400 `AUTOR_ORIGINAL_INVALIDO` en `album_agregar_foto`; `repartirXpReferidos` en `album_voto`; casts `::text` en `dm_hilos` para el 42P08 de BUG-055); `api/pagina-destino.js` (una sola `#galeria` que fusiona `secGaleria` + `secFotos` con ancla legacy `#fotos`; `secComoLlegar` que fusiona transporte + mapa con ancla legacy `#mapa`; UI "Guardar en album"; helper `galEsc()`; fix de `cerrarPopoverGuardar`); `api/admin-destinos.js` (semantica REPLACE + `normFotosGaleria` + guards 400); `api/utilidades.js` (REPLACE en POST `?tipo=fotos`); `api/usuarios.js` (fallback de avatar en `perfil_publico`); `admin.html` (elimina la doble escritura de la galeria); `usuario-session.js` (nonce + Bearer en "Estuve aqui", cierra BUG-036); `scripts/smoke_auditoria_pagina_destino.js` (54 checks); `scripts/apply_004_foto_url.js` y `scripts/dedupe_destinos_fotos.js` (NUEVOS, sin versionar hasta el commit). NO se crean funciones serverless (8/8 de ADR-001 intacto); NO se modifica `galeria.html`; NO hay migracion de esquema nueva (se requiere APLICAR la 004 y crear el indice unico via script). Nota de version (ADR-006): los comentarios nuevos de `api/interacciones.js` se rotulan `v16`, pero el header real del archivo sigue en `v14` y no se agrego el bloque de changelog `v16`; inconsistencia de version a corregir en el commit.

**Consecuencias positivas:**
- Una sola galeria en la ficha con unidad visual y editorial, sin romper `galeria.html` (extension aditiva) ni las anclas historicas (`#fotos`).
- Se activa `album_voto` y se estrena "Guardar en album" desde la ficha (cierra G-07/D-12) y se cierra un XSS preexistente del inline con `galEsc()`.
- Se cierran dos fallos reales: IDOR de escritura en albumes (BUG-059) y el 42P08 de `dm_hilos` (BUG-055); `album_voto` entra en la piramide de referidos (ADR-027).
- Las superficies de museo/galeria/albumes/perfil publico dejan de devolver 503 cuando falta `usuarios.foto_url` (BUG-060), y la galeria deja de acumular filas (BUG-056).

**Consecuencias negativas / riesgos residuales:**
- **No se puede votar fotos curadas en el MVP:** recorte explicito; candidato a una entrega futura con un ancla estable (no `destinos_fotos.id`).
- **BUG-056 NO cerrado al 100% hasta ejecutar `scripts/dedupe_destinos_fotos.js --apply`:** los datos historicos duplicados siguen en Neon y el indice unico aun no existe.
- **BUG-060 solo MITIGADO hasta aplicar la 004:** `usuarios.foto_url` sigue ausente en Neon; el avatar cae siempre a `avatar_url`.
- **Header de version de `api/interacciones.js` desalineado** (`v14` real vs `v16` en los comentarios nuevos); deuda documental menor a corregir en el commit.
- Persisten como bloqueantes heredados las migraciones 017/018 (TSK-103) y el commit/push/deploy de todo el working tree.

**ADR previos relacionados:** ADR-001 (limite de las 8 funciones serverless de Vercel Hobby / presupuesto 8/8), ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico / merge JSONB), ADR-004 (CSS scoped), ADR-006 (baseline = archivo real), ADR-008 (SQL versionado / idempotencia), ADR-017 (albumes y media), ADR-022 (constraints e indices de interacciones), ADR-023 (lectura de media), ADR-025 (sesion firmada / nonce, consumido por "Estuve aqui"), ADR-027 (piramide de referidos), ADR-028 (blindaje PII y patron `esAdminUsuario`). **Nota (ADR-006):** el presupuesto 8/8 se cita a ADR-001, NO a ADR-010 (multi-tema en tags JSONB); ver la nota de correccion de citas en la entrada ADR-010.

**Actualizacion (TSK-106 / `PROMPT_MULTIMEDIA_GALERIA.md`, 2026-09-16) -- extiende esta decision, no la reemplaza:**
- **H-1 (confirmado por el usuario): filtro `usuario_id` RESTRICTIVO, no aditivo.** En `GET ?tipo=multimedia_mapa` (`api/interacciones.js`), cuando llega `usuario_id` (validado por regex uuid; si es invalido se IGNORA), la capa se RESTRINGE a los albumes del usuario y a los destinos que guardo/voto/califico (`interacciones.activo=true`). `index-api-connector.js` envia `&usuario_id=<id>` solo con sesion y ya no manda `origen=album`; sin `usuario_id` el SQL publico queda byte-identico (regresion cero). Extiende el principio de ADR-021 (capa audiovisual estricta) al mapa cultural.
- **Re-alcance de P3:** la unificacion de la galeria del PROBLEMA 3 se aplico en `galeria.html` (modo destino, `incluir=viajeros` + `items[]`), NO en `comunidad.html`, que no tenia la seccion descrita; la galeria unificada real de la ficha sigue siendo la de esta ADR (`#galeria` en `api/pagina-destino.js`). En `galeria.html` se eliminan `gSeedCard` y `#g-dest-usuarios`.
- **PROBLEMA 4 (hero de la ficha):** el hero se eleva a 12 miniaturas (`HERO_THUMBS_MAX=12`, `slice(1, HERO_THUMBS_MAX + 1)`) y el `LIMIT` de `destinos_fotos` a 24; `.prow` pasa a grid responsivo (6 col desktop, 4 col `<=760px`). Es una extension directa de la galeria unificada de esta ADR.
- **P2 OMITIDO:** el tab audiovisual de "Mi Viaje Personal" (`index.html`) no existe y no se construye en TSK-106 (recorte explicito del usuario).
- **H-2 derivado a BUG-061 (no corregido aqui):** `POST /api/interacciones` `tipo='foto'` confia en `body.usuario_id` sin `validarSesion` (spoofing de autor); se registra en `BUGS_HISTORICOS.md` BUG-061 y se escala a `sql-security`.

**ADR relacionados de esta actualizacion:** ADR-021 (capa audiovisual estricta / paridad de drawer), ADR-025 (sesion firmada: base de la recomendacion de BUG-061), ADR-028 (blindaje de identidad/PII).

**Actualizacion (ADR-034, 2026-09-17) -- ajusta el hero de la ficha, no la decision de galeria unificada:**
- **Hero de 12 a 4 fotos:** el hero de la ficha pasa de 12 miniaturas (`HERO_THUMBS_MAX=12`, TSK-106) a **4 fotos** (1 grande `foto_hero` + `HERO_THUMBS_MAX=3`: 2a curada por orden, viajero mas votado y album mas votado). La galeria unificada `#galeria` de esta ADR NO cambia: sigue con su composicion 1 grande + 12 miniaturas (6 curadas + 6 comunidad, `GAL_THUMBS_MAX=12`). Detalle completo en ADR-034.
- **CTA "Ver galeria" retirado SOLO del hero:** se elimina el boton "Ver galeria" de la botonera del hero; el CTA homonimo de la franja `gstrip` (`.gscta`) SE CONSERVA. El boton "Ver galeria ampliada" de la seccion `#galeria` tambien se conserva.
- **Botonera del hero resultante:** `Sitio web -> Contactar (WhatsApp o mailto) -> Como llegar -> Guardar -> Estuve aqui` (sin "Ver galeria").
- **`items[]` / `incluir`:** el contrato aditivo de esta ADR se mantiene; `galeria.html` ahora lo consume con `incluir=viajeros,albumes` y suma la rama `mapas_de_destino` (ADR-034).

**ADR relacionados de esta actualizacion:** ADR-030 (esta misma), ADR-034 (hero de 4 fotos y CTA retirado).

---

## ADR-031: Capa de media del mapa cultural -- album de destino agregado y visibilidad publica por defecto

**ID:** ADR-031
**Fecha:** 2026-09-17
**Estado:** Aprobado e IMPLEMENTADO en working tree (SIN commitear). No agrega esquema propio. **PENDIENTE: commit/push/deploy y verificacion en vivo del caso `hostal-r10-bogota` (slug, coords 4.598835,-74.072662, status published).**
**Autor:** AI-DOS Core (fix del 503 de la capa de media y agrupacion del album de destino, 2026-09-17)
**Nota de numeracion:** el 031 es el consecutivo real tras ADR-030 (mayor registrado en este documento).

**Problema:** `GET ?tipo=multimedia_mapa` (`api/interacciones.js`) proyectaba el avatar con `COALESCE(u.foto_url, u.avatar_url, '')` SIN el helper `queryConAvatarFallback` que ADR-030/BUG-060 introdujo para degradar `42703`. Como la migracion 004 (`usuarios.foto_url`) sigue pendiente en Neon, el `42703` escalaba al catch global y la capa entera respondia 503 `SCHEMA_NOT_MIGRATED`; sintoma reportado por Javier: "el hostal r10 no aparece en el mapa". Ademas, la capa solo emitia las fotos individuales de la ficha (`origen='destino'`) y NO agrupaba la galeria de la ficha como album del destino, por lo que un destino con varias fotos se veia como multiples pines sueltos sin portada ni conteo. En paralelo, la decision H-1 de TSK-106/ADR-030 dejaba la capa RESTRICTIVA por sesion (con `usuario_id`, el logueado solo veia lo suyo), lo que contradice una capa cultural de proposito publico (ADR-021 estricta).

**Opciones consideradas:**
1. **Aplicar la migracion 004 y no tocar el SQL:** descartada como solucion unica -- la 004 sigue pendiente de ejecucion en Neon y la capa no puede depender de un paso operativo para no devolver 503 (patron BUG-021/BUG-060).
2. **Fila agregada `origen='destino_album'` por destino con galeria (elegida):** una fila por destino (`portada` + `fotos_count`) ADEMAS de las fotos individuales `origen='destino'`.
3. **Relajar el filtro restrictivo H-1 via `scope=mio` (elegida):** la capa publica por defecto; el filtro solo cuando el cliente pide explicitamente el scope propio.

**Decision tomada:**
- **Blindaje del 503:** la consulta de `multimedia_mapa` se envuelve en `queryConAvatarFallback(sql, ...)` (`api/interacciones.js` L3775), que ante `42703` reintenta con `avatar_url` y nunca silencia otros codigos. Es la misma mitigacion de ADR-030 aplicada ahora a la capa del mapa.
- **Album de destino agregado:** se emite UNA fila por destino con galeria (`origen='destino_album'`, `origen_id=slug`, `media_url`=portada con `ARRAY_AGG(... ORDER BY es_hero DESC NULLS LAST, orden ASC NULLS LAST)[1]`, `fotos_count`), ademas de las fotos individuales de la ficha (`origen='destino'`). Se activa cuando `origen!='album'`, no se excluye el tipo `foto` y NO es scope propio (L3835-3865).
- **Filtro restrictivo solo con `scope=mio`:** `mmScopeMio = (req.query.scope === 'mio')`; si NO viene `scope=mio`, `mmUsuarioId` se fuerza a `null` (L3745-3756) y el SQL publico queda sin restriccion. Con `scope=mio` + `usuario_id` (uuid validado por regex) se restringe a los albumes propios y a los destinos con `interacciones.activo=true` (guardado/voto/rating).
- **Frontend con toggle "Solo mio":** `index.html` (`#mm-solo-mio` -> `setMapaMediaSoloMio()`, L1234) y `index-api-connector.js` (`cargarMapaMedia()` agrega `&scope=mio&usuario_id=<id>` SOLO con el toggle activo y sesion; sin toggle, capa publica sin `usuario_id`, L350-387).

**Justificacion:** Envolver la consulta en `queryConAvatarFallback` elimina el 503 sin depender del estado de Neon (misma leccion de BUG-021/BUG-051/BUG-060). Una fila agregada por destino convierte la galeria de la ficha en un album de mapa (portada + conteo) sin duplicar datos: se deriva por consulta, no se persiste. Relajar H-1 a `scope=mio` devuelve a la capa su proposito cultural publico y mantiene el caso "ver solo lo mio" como opt-in explicito; el costo es que el default ya no filtra por sesion, coherente con ADR-021 (capa publica de usuarios).

**Impacto:** `api/interacciones.js` (+212/-14 en el working tree, compartido con ADR-032/ADR-033: `queryConAvatarFallback` en `multimedia_mapa`, fila `destino_album`, `scope=mio`); `index.html` (+89/-3: toggle "Solo mio"); `index-api-connector.js` (+57/-31: revela el wiring `scope=mio`/toggle sin `origen=album`). Sin endpoints nuevos (8/8, ADR-001); sin migracion propia. Nota de verificacion (ADR-006): el header de `api/interacciones.js` sigue en `v14` mientras los comentarios nuevos se rotulan `v17` (deuda documental de version a corregir en el commit).

**Consecuencias positivas:**
- La capa de media del mapa deja de responder 503 por `usuarios.foto_url` ausente y vuelve a mostrar destinos con galeria (incluido el caso hostal r10).
- La galeria de la ficha de un destino aparece como un album agrupado (portada + conteo) en el mapa, ademas de sus fotos individuales.
- La capa publica vuelve a ser el default; "Solo mio" queda como filtro opt-in.

**Consecuencias negativas / riesgos residuales:**
- La representacion del avatar sigue dependiendo de aplicar la migracion 004 en Neon: sin ella el avatar cae siempre a `avatar_url` (mitigado, no resuelto).
- Si el cliente no actualiza `index-api-connector.js` en el mismo release, no habra toggle y la capa quedara publica (comportamiento por defecto, sin regresion funcional).
- Verificacion en vivo pendiente (`hostal-r10-bogota`): agrupacion `destino_album`, portada y conteo.

**ADR previos relacionados:** ADR-001 (presupuesto 8/8 de Vercel Hobby), ADR-006 (baseline = archivo real / nota de version), ADR-017 (albumes y media), ADR-021 (capa audiovisual estricta -- esta ADR la relaja a `scope=mio`), ADR-023 (lectura de media), ADR-024 (geocerca/radios), ADR-030 (helper `queryConAvatarFallback` y contrato de `items[]`; H-1 restrictivo que esta ADR convierte en opt-in)

---

## ADR-032: Guardados (bookmarks) de media + area museo del perfil -- visibilidad publica vs privada

**ID:** ADR-032
**Fecha:** 2026-09-17
**Estado:** Aprobado e IMPLEMENTADO en working tree (SIN commitear). **PENDIENTE: aplicar `db/migrations/019_media_guardados_radio.sql` en Neon + commit/push/deploy.**
**Autor:** AI-DOS Core (guardados de media y area "mis fotos/mis guardados" del museo, 2026-09-17)
**Nota de numeracion:** el 032 es el consecutivo real tras ADR-031.

**Problema:** No existia forma de guardar (bookmark) fotos o albumes de terceros desde el mapa/galeria/ficha, ni un area del perfil museo para revisar "mis fotos" y "mis guardados". El presupuesto de funciones serverless de Vercel Hobby esta agotado (8/8, ADR-001), por lo que no cabia un endpoint nuevo. Ademas habia que distinguir tres conceptos que se confunden facilmente: un VOTO (`album_votos`), una COPIA ("Guardar en album", ADR-030) y una REFERENCIA personal del usuario a un item existente (bookmark).

**Opciones consideradas:**
1. **Endpoint nuevo `/api/guardados.js`:** descartada -- viola el presupuesto 8/8 (ADR-001).
2. **Tabla con FK polimorfica al item guardado:** descartada -- Postgres no admite FK polimorficas; habria que crear una tabla por tipo o un CHECK fragil.
3. **Ramas GET/POST en `api/interacciones.js` + tabla `media_guardados` con PK compuesta y sin FK polimorfica (elegida):** la integridad referencial se valida en el backend al insertar (el item debe existir y estar activo).

**Decision tomada:**
- **Tabla `media_guardados`** (migracion 019): `usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE`, `fuente varchar(20) CHECK (fuente IN ('album','album_foto','viajero_foto'))`, `item_id uuid NOT NULL`, `activo boolean NOT NULL DEFAULT true`, `creado_en timestamptz`, `PRIMARY KEY (usuario_id, fuente, item_id)`. Sin FK polimorfica: `item_id` referencia `albumes.id` (fuente `album`), `album_fotos.id` (fuente `album_foto`) o `interacciones.id` tipo `foto` (fuente `viajero_foto`), validado por SELECT en el backend.
- **Ramas nuevas en `api/interacciones.js`:** GET `mis_fotos` (fotos agregadas a albumes propios + fotos de viajero subidas por el usuario), GET `mis_guardados_media` (bookmarks activos resueltos por fuente), POST `guardar_media` / `quitar_guardado_media`. `guardar_media` valida `fuente` contra la whitelist, `item_id` por regex uuid, la EXISTENCIA del item segun la fuente (404 si no existe) y hace `INSERT ... ON CONFLICT (usuario_id,fuente,item_id) DO UPDATE SET activo=true` (soft delete/reactivacion, Cero Borrado Logico). Si la migracion 019 falta, responde 503 `SCHEMA_NOT_MIGRATED` (nunca escritura silenciosa).
- **Visibilidad (decision de producto):** las fotos subidas y los albumes creados son PUBLICOS (aparecen en el museo publico `perfil.html` via `mis_fotos`); los guardados son PRIVADOS y solo se pintan en el perfil propio (`mi-perfil.html`).
- **Sin endpoints nuevos** (8/8, ADR-001).

**Justificacion:** `media_guardados` modela una referencia personal sin duplicar el item ni pasar por el sistema de votos, y la PK compuesta mas `ON CONFLICT` hace el bookmark idempotente y reversible. Validar la existencia en el backend sustituye a la FK polimorfica inexistente en Postgres sin migrar datos. Separar publico (fotos/albumes) de privado (guardados) respeta la expectativa del usuario sobre su actividad reciente sin exponerla en el museo publico. Todo entra como ramas `tipo=`, sin tocar el contrato de otros endpoints.

**Impacto:** `db/migrations/019_media_guardados_radio.sql` (NUEVA, 65 lineas, aditiva e idempotente ADR-008, ASCII-safe ADR-002: columna `destinos.radio_m` + CHECK + tabla `media_guardados` + 2 indices); `api/interacciones.js` (GET `mis_fotos` L3899, GET `mis_guardados_media` L3929, POST `guardar_media`/`quitar_guardado_media` L5476-5533); `mi-perfil.html` (+109/-0: `#mis-fotos-grid` L553, `#mis-guardados-media-grid` L559, helper `mediaCardHTML()`, `cargarMisFotos()`, `cargarMisGuardadosMedia()`, `quitarGuardadoMedia()` L1733-1824); `perfil.html` (+60/-3: nueva "Sala V: Fotos" publica de solo lectura que consume `mis_fotos` del dueno del museo; los guardados NO se muestran ahi por ser privados); `admin.html` y `api/admin-destinos.js` (radio_m, ver ADR-033). Sin endpoints nuevos (8/8). Nota de verificacion (ADR-006): en el working tree NO se encontro NINGUN consumidor de `guardar_media` (el boton/marcador que crea el bookmark no existe aun); solo se consume `quitar_guardado_media`. Los guardados solo pueden crearse hoy por llamada directa a la API.

**Consecuencias positivas:**
- Existe un modelo de bookmark persistente, idempotente y reversible, sin endpoint nuevo ni FK polimorfica.
- El perfil propio gana "Mis fotos" y "Mis guardados"; el museo publico expone solo la sala de fotos (publica), nunca los guardados (privados).
- `mis_fotos` alimenta tanto el museo propio como el publico.

**Consecuencias negativas / riesgos residuales:**
- **Sin UI de alta de bookmark:** no se verifica un control que invoque `guardar_media`; el area de guardados del perfil solo se puede poblar por API directa hasta que se agregue el marcador (en `galeria.html`/ficha). El texto de estado vacio de `mi-perfil.html` promete "Usa el marcador en la galeria o en las fichas", que aun no existe.
- Los GET `mis_fotos`/`mis_guardados_media` validan `usuario_id` por formato uuid pero no exigen JWT (mismo patron preexistente); cualquiera con un uuid valido puede consultar las fotos publicas de ese usuario (por diseno) y la lista de guardados (a revisar con `sql-security`).
- `mis_guardados_media` degrada a lista vacia si falta la 019 (`.catch(function(){ return []; })`), por lo que un fallo de esquema se manifiesta como "sin guardados" y no como error visible.
- Migracion 019 pendiente de aplicar en Neon: sin ella, `guardar_media`/`quitar_guardado_media` responden 503 y los GET degradan.

**ADR previos relacionados:** ADR-001 (presupuesto 8/8), ADR-003 (Cero Borrado Logico / merge), ADR-006 (baseline = archivo real), ADR-008 (SQL versionado / idempotencia), ADR-017 (albumes y media), ADR-025 (sesion firmada), ADR-028 (blindaje de identidad/PII), ADR-030 (distincion voto vs guardar-en-album vs bookmark)

---

## ADR-033: Radio de verificacion por lugar y escalado de XP por amplitud para "Estuve aqui"

**ID:** ADR-033
**Fecha:** 2026-09-17
**Estado:** Aprobado e IMPLEMENTADO en working tree (SIN commitear). **PENDIENTE: aplicar `db/migrations/019_media_guardados_radio.sql` en Neon + commit/push/deploy + verificacion en vivo.**
**Autor:** AI-DOS Core (radio configurable por lugar y XP proporcional al area, 2026-09-17)
**Nota de numeracion:** el 033 es el consecutivo real tras ADR-032.

**Problema:** ADR-024 verificaba la presencia fisica con una geocerca de radios heuristicos (100/150/200/250 m segun categoria, subcategoria y keywords) sin posibilidad de ajuste por lugar. Un bar necesita exigir un punto exacto (~100 m) y una ciudad o un parque metropolitano extenso necesitan cubrir un area amplia, pero la heuristica no permitia representar esa diferencia. Ademas, la visita otorgaba XP PLANO (20 base) sin importar la amplitud del area verificada, por lo que confirmar presencia en un lugar de radio enorme rendia lo mismo que en un local puntual.

**Opciones consideradas:**
1. **Mantener solo la heuristica de ADR-024:** descartada -- no permite que un lugar puntual exija precision ni que un area extensa sea practicable.
2. **Columna escalar `destinos.radio_m` (elegida):** `NULL` = heuristica historica; un valor explicito tiene prioridad absoluta. Se agrego un CHECK de rango `25..100000` m.
3. **Escalado de XP por amplitud (elegida):** la XP base de la visita se multiplica por un factor segun el radio efectivo, en vez de ser plana.

**Decision tomada:**
- **Columna `destinos.radio_m integer`** (migracion 019): `NULL` = heuristica adaptativa de ADR-024 (100/150/200/250 m); valor explicito = radio fijado por el admin. CHECK `destinos_radio_m_check` (`radio_m IS NULL OR (radio_m >= 25 AND radio_m <= 100000)`).
- **`resolverRadioM(categoria, tags, nombre, radioExplicito)`** (`api/interacciones.js` L164): si el radio explicito es valido (25..100000) lo devuelve; si no, cae a la heuristica (keywords rurales -> subcategoria -> categoria -> default). Prioridad absoluta del valor explicito.
- **Escalado de XP por amplitud:** `factorXpPorRadio(radio)` (`L143`) devuelve `1` (radio <= 1000 m o `null`), `0.5` (radio > 1000 m) o `0` (radio > 5000 m); constantes `RADIO_XP_MEDIO_M=1000` y `RADIO_XP_CERO_M=5000` (`L141-142`). En el flujo de visita, `xpBaseVisita = Math.round(20 * factorAreaVisita)` (`L6847-6848`); el factor solo aplica en modo `geocerca` (sin coords no hay area que abusar). **La visita SIEMPRE se registra y marca el mapa; solo cambia el XP.** El response expone `factor_area` en `xp_detalle`.
- **Solo el admin define el radio:** `api/admin-destinos.js` acepta `radio_m` en POST (INSERT/upsert) y PUT (UPDATE), validando `25..100000`; `null`/vacio lo limpia a `NULL` (vuelve a la heuristica). En el panel, `admin.html` expone el campo `#f-radio-m` (number, min 25, max 100000, step 5) con presets y lo incluye en `_placeToAPI()`/`applyCategoryTagFields`/`loadForm`.

**Justificacion:** `radio_m` es una columna escalar (no un tag JSONB) porque es un parametro de verificacion territorial, no contenido editorial, y su CHECK garantiza rangos sanos. `resolverRadioM` centraliza la prioridad en un unico punto, de modo que la heuristica historica sigue vigente para los destinos sin radio. Escalar la XP por amplitud desincentiva el abuso de "confirmar" presencia en areas enormes (ciudades, parques) sin eliminar el registro de la visita: la presencia fisica se mantiene honesta y la recompensa refleja el esfuerzo real. El tope de 100 km evita valores absurdos.

**Impacto:** `db/migrations/019_media_guardados_radio.sql` (columna `destinos.radio_m` + CHECK; compartida con ADR-032); `api/interacciones.js` (+212/-14 en el working tree, compartido con las otras dos ADR: `RADIO_XP_MEDIO_M`/`RADIO_XP_CERO_M`/`factorXpPorRadio` L137-148, `resolverRadioM` L160-182, uso en `POST tipo=visita` L6795-6848, auditoria `dims.geo.radio_m` y response `radio_m` L6915/L6967); `api/admin-destinos.js` (+16/-3: `radio_m` en SELECT/INSERT/UPDATE con validacion de rango); `admin.html` (+51/-1: campo `#f-radio-m` L1713, carga/guardado L3159-3163/L3785-3822/L6006-6009/L6524-6527). Sin endpoints nuevos (8/8, ADR-001). La XP de visita incluye ademas el bono rural plano de ADR-024 (fuera de este factor). Nota de version (ADR-006): header de `api/interacciones.js` aun `v14` pese a las referencias `v17`.

**Consecuencias positivas:**
- El admin puede fijar el area de verificacion por lugar (bar puntual vs parque/ciudad extensa) sin tocar codigo.
- La XP de presencia fisica deja de ser plana y penaliza areas excesivamente amplias (50% > 1 km, 0 > 5 km) sin dejar de registrar la visita.
- La heuristica de ADR-024 sigue vigente como fallback (`radio_m = NULL`), sin regresion para los destinos existentes.

**Consecuencias negativas / riesgos residuales:**
- La visita con radio > 5 km otorga `xp_base = 0`, pero el bono rural (+20, ADR-024) es plano e independiente del factor: un destino rural con radio enorme podria aun sumar ese bono. Es un residuo a revisar.
- `radio_m` mal fijado por el admin (demasiado amplio o estrecho) altera la verificacion en vivo sin otra validacion que el rango 25..100000; no hay auditoria de cambios de radio.
- Migracion 019 pendiente en Neon: sin ella, el SELECT de visita (`radio_m` en la lista de columnas) falla y `resolverRadioM` recibe `undefined` (cae a heuristica) solo si el SQL no revienta; riesgo de 503 hasta aplicar la migracion.
- El checkin de Activos Ocultos (`activos_ocultos_checkin`) NO usa `radio_m`: sigue con su heuristica propia (150/250). Alcance explicitamente fuera de esta ADR.

**ADR previos relacionados:** ADR-001 (presupuesto 8/8), ADR-006 (baseline = archivo real / nota de version), ADR-008 (SQL versionado / idempotencia), ADR-012 (escalado de XP), ADR-018 (economia de XP), ADR-024 (presencia fisica, radios heuristicos y bono rural -- esta ADR agrega el radio configurable y el factor por amplitud), ADR-027 (reparto de XP), ADR-032 (misma migracion 019)

---

## ADR-034: Ficha de destino -- hero de 4 fotos con votos existentes, `destinos.sintro` curada, galeria 1+12 y orden de modulos por lugar (solo hostal)

**ID:** ADR-034
**Fecha:** 2026-09-17
**Estado:** Aprobado e implementado en working tree (SIN commitear). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar `db/migrations/020_destinos_sintro.sql` en Neon (archivo COMPLETO en una corrida del editor SQL, patron BUG-021) ANTES del deploy**; despues, commit/push/deploy de los 6 archivos en un solo release.
**Autor:** architect (AI-DOS) con decision de producto del Chief Architect; implementado y verificado en working tree (2026-09-17).
**Nota de numeracion:** el 034 es el consecutivo real tras ADR-033 (mayor registrado en este documento).

**Problema:** la ficha de destino tenia cuatro frentes abiertos. (1) Tras TSK-106/ADR-030 el hero mostraba 12 miniaturas: una parrilla pesada que competia con la botonera y el titulo, con un CTA "Ver galeria" que duplicaba el de la franja `gstrip`. (2) El subtitulo estilizado `.sintro` de la seccion "Sobre este lugar" se derivaba en el render (primeras 150 letras de `descripcion`, fallback `highlight`) y el admin no podia curarlo. (3) La galeria de la ficha no tenia una regla editorial de composicion (curadas vs comunidad) y `galeria.html` en modo destino mostraba una sola grilla indiferenciada, sin exponer albumes ni los mapas donde el destino esta guardado. (4) El orden de los modulos de la ficha era fijo y no servia a todos los hostales (p. ej. "Reservar" quedaba lejos de "Habitaciones/Precios" y "Contacto" lejos de "Como llegar"). Todo debia lograrse sin crear funciones serverless (presupuesto 8/8 agotado, ADR-001) y sin introducir un sistema de votacion NUEVO para las fotos curadas.

**Opciones evaluadas:**
1. **Crear votacion de fotos curadas / tabla nueva de votos:** descartada -- viola el presupuesto 8/8 (ADR-001) y `destinos_fotos.id` no es un ancla estable bajo la semantica REPLACE (recorte ya documentado en ADR-030).
2. **Mantener el hero de 12 miniaturas (statu quo TSK-106):** descartada por decision de producto -- el hero quedaba saturado y la botonera perdia protagonismo; se prefirio una composicion curada de 4 fotos.
3. **Subtitulo calculado en render vs columna persistida:** elegida la columna `destinos.sintro` (TEXT nullable) con fallback al calculo historico, para que el admin cure el texto sin perder el comportamiento previo en los destinos existentes.
4. **Orden de modulos en columna relacional nueva vs en `tags` JSONB:** elegida `tags.orden_modulos` (array de ids) -- no toca el esquema relacional, viaja por el merge JSONB (ADR-003) y queda acotada a hostal.
5. **`galeria.html` con una grilla unica vs secciones separadas:** elegidas 4 secciones (curadas / comunidad / albumes / mapas) + bloque de subida, para dar unidad editorial y exponer datos ya servidos por el backend.

**Decision tomada:**
- **Hero de 4 fotos (1 grande + 3 miniaturas).** `HERO_THUMBS_MAX=3`: imagen principal `foto_hero` y tres miniaturas compuestas por (1) la 2a foto curada por orden (sin repetir el hero), (2) la foto de viajero mas votada y (3) la foto de album mas votada; los faltantes se rellenan con las curadas restantes y, si aun faltan, con el resto de la comunidad, siempre con dedup por URL.
- **Botonera del hero:** `Sitio web -> Contactar (WhatsApp o mailto) -> Como llegar -> Guardar -> Estuve aqui`. Se ELIMINA el CTA "Ver galeria" del hero; el CTA de la franja `gstrip` se CONSERVA.
- **Sin votacion nueva:** los votos se leen de los mecanismos YA existentes (`interacciones.dims->>'voto_foto_id'` para la foto de viajero; `album_votos` para la foto de album). No se crean tablas, endpoints ni tipos de voto.
- **`destinos.sintro` (migracion 020):** columna `TEXT` nullable, editable en el admin (tab GENERAL, `#f-sintro`, max 200); el render la usa con fallback a los 150 caracteres de `descripcion` o a `highlight`. Solo no-blog.
- **Galeria de la ficha (1 grande + 12 miniaturas):** 1 foto grande aparte + 12 miniaturas = 6 curadas + 6 comunidad (merge de viajeros + albumes por votos DESC, dedup por URL); 4 columnas en escritorio, 2 en tablet y 1 en movil; si faltan de comunidad se completan con curadas. Nunca se repite la grande.
- **`galeria.html` modo destino:** 4 secciones separadas (fotos curadas / comunidad / albumes del destino / mapas donde el destino esta guardado) + bloque de subida; consume `tipo=galeria_destino&incluir=viajeros,albumes` y el nuevo endpoint-logico `mapas_de_destino`.
- **`api/interacciones.js`:** nueva rama GET `tipo=mapas_de_destino&destino_id=` (o `slug=`), con visibilidad `m.publico = true OR m.usuario_id = viewer`; el `viewer` se deriva de `validarSesion` (ADR-025) y es `null` sin sesion valida. Sin archivos nuevos en `api/` (8/8, ADR-001).
- **Orden de modulos SOLO hostal:** `tags.orden_modulos` (array de ids `descripcion, galeria, habitaciones, reservar, reglas-casa, actividades, eventos-hostal, como-llegar, contacto, faq, resenas, relacionados`); default nuevo: "Reservar" tras "Habitaciones/Precios" y "Contacto" tras "Como llegar". El admin reordena con flechas los modulos del hostal (`HOSTAL_MODULOS_ORDEN_DEFAULT`, `_renderHostalModulos`) y la lista de Actividades (el orden del array `tags.actividades` ES el orden). Un array ausente, vacio o invalido deja el orden por defecto (cero regresion); los ids no listados se agregan al final.
- **Persistencia de `sintro`:** `api/admin-destinos.js` la incluye en SELECT/INSERT/UPDATE (normalizada por `normSintro`) y `api/publicar-lugar.js` la acepta en el INSERT publico (status=draft).

**Justificacion:** reutilizar los votos existentes (`voto_foto_id`, `album_votos`) da al hero y a la galeria una senal de calidad sin crear un subsistema de votacion ni tocar el esquema (ADR-001/ADR-030). Persistir `sintro` en una columna nullable mantiene el fallback historico y no reescribe datos existentes (Regla de Oro 3: Cero Borrado Logico). El orden de modulos en `tags.orden_modulos` es configuracion editorial, no esquema: viaja por el merge JSONB (ADR-003), no exige migracion y queda acotado a hostal sin afectar a las demas categorias. Separar `galeria.html` en 4 secciones expone albumes y mapas ya servidos por `interacciones.js` (incluida la nueva rama `mapas_de_destino`) sin endpoints nuevos y con visibilidad derivada de la sesion validada (ADR-025). Componer el hero con 4 fotos curadas mejora la jerarquia visual y deja mas peso a la botonera.

**Impacto:**
- `api/pagina-destino.js` (+283/-65): `HERO_THUMBS_MAX=3` y composicion del hero (L776-805); botonera (L2269-2277); `sobreIntro` con `d.sintro` + fallback (L860-868); orden de modulos de hostal (`SEC_HOSTAL_DEFAULT`, L2173-2214); galeria 1+12 (`GAL_THUMBS_MAX=12`, `GAL_CURADAS_MAX=6`, `GAL_COMUNIDAD_MAX=6`, L1573-1608) con CSS `.gal-thumbs` responsivo 4/2/1 (L311-313).
- `api/interacciones.js` (+46/-0): rama GET `mapas_de_destino` (L2731-2767), con `destino_id`/`slug`, validacion de formato, `validarSesion` para el `viewer` y visibilidad `m.publico=true OR m.usuario_id=viewer`.
- `api/admin-destinos.js` (+19/-3): `normSintro` (L22), `sintro` en el SELECT (L111), en el INSERT (L159/L215) y en el UPDATE (L315-319).
- `api/publicar-lugar.js` (+12/-2): `normSintro` + `sintro` en el INSERT publico (status=draft).
- `admin.html` (+150/-5): campo `#f-sintro` en el tab GENERAL (L917); `HOSTAL_MODULOS_ORDEN_DEFAULT` (L3183) y reorden por flechas de los modulos hostal + la lista de Actividades (`_renderHostalModulos`, L3177-3260); lectura/escritura de `tags.orden_modulos` en el collect/apply (L3119-3165); `sintro` en `_placeToAPI`/loadForm (L3950, L6142, L2721/L3304). **La galeria `galeria.html` ahora tiene 4 secciones + bloque de subida** y el admin reordena los modulos via `tags.orden_modulos` (este es el ajuste central de impacto del panel).
- `galeria.html` (+153/-20): 4 secciones `.g-sec` ("Fotos del destino", "Fotos de la comunidad", "Albumes del destino", "Mapas con este destino", L150-205) + bloque de subida `#g-share`; consumo de `incluir=viajeros,albumes` (L627) y del nuevo `tipo=mapas_de_destino` (L676).
- `db/migrations/020_destinos_sintro.sql` (NUEVA, 16 lineas, sin versionar): `ALTER TABLE destinos ADD COLUMN IF NOT EXISTS sintro TEXT;` (nullable, sin default; idempotente ADR-008, ASCII-safe ADR-002).
- **Presupuesto de endpoints 8/8 INTACTO** (ADR-001): cero archivos nuevos en `api/`; `mapas_de_destino` es una rama `tipo=` de `api/interacciones.js`.
- **Bug derivado:** BUGS_HISTORICOS.md BUG-062 (`addPhotoFieldWithUrl` genera `photo-url-input` y `getPhotos()` recolecta `.photo-url-inp`).

**Consecuencias positivas:**
- Hero mas limpio (4 fotos) con jerarquia clara y botonera protagonista; el CTA de galeria queda solo en el `gstrip` (sin duplicar).
- El admin puede curar el texto de apertura (`sintro`) y el orden de los modulos del hostal sin tocar codigo ni esquema relacional.
- `galeria.html` gana 4 secciones con albumes y mapas del destino, y una rama `mapas_de_destino` que respeta la privacidad (`publico` o dueno con sesion validada).
- La galeria de la ficha mezcla curadas y comunidad con una regla explicita (6+6) y nunca repite la foto grande.

**Consecuencias negativas / riesgos residuales:**
- **Migracion 020 pendiente (BLOQUEANTE):** el INSERT/UPDATE de `admin-destinos.js` y `publicar-lugar.js` incluye `sintro`; hasta aplicar la 020 en Neon, persistir un destino falla por columna inexistente (patron BUG-021). El render degrada (si `d.sintro` no viene, usa el fallback), pero la escritura no.
- **Las fotos de comunidad del hero/galeria no se pueden votar desde la ficha si no existe interaccion previa:** solo reflejan votos existentes; sin votos, el orden es el de llegada.
- **BUG-062 (admin, MEDIA):** las fotos agregadas por Unsplash no se recolectan con `getPhotos()` (clase distinta); queda detectado, pendiente de correccion.
- **Nota de version (ADR-006):** `api/interacciones.js` mantiene header `v14` mientras los comentarios nuevos se rotulan `v17`; deuda documental a resolver en el commit.

**ADRs relacionados:** ADR-001 (presupuesto 8/8 de Vercel Hobby), ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-006 (baseline = archivo real), ADR-008 (SQL versionado / idempotencia), ADR-016 (subcategorias y orden condicional), ADR-021 (capa publica de media), ADR-025 (sesion firmada / `validarSesion` para el `viewer`), ADR-030 (galeria unificada y `items[]`; esta ADR ajusta su hero de 12 a 4 fotos y retira el CTA del hero), ADR-031 (visibilidad publica del mapa), ADR-033 (radio; misma familia de configuracion por lugar).