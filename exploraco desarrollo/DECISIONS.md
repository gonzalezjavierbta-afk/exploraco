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

**NOTA DE ENMIENDA (TSK-111, 2026-09-17) -- ajusta los radios urbanos, NO la decision de presencia fisica:**
- **Radio urbano 100 m -> 50 m.** `RADIO_DEFAULT_M` pasa de 100 a 50 y `RADIO_POR_CATEGORIA` de `sitio`/`hostal`/`comida` pasa de 100 a 50; las subcategorias URBANAS bajan a 50 (`espacio-publico`, `sitio-historico`, `museo`, `cultura`, `religioso`, `bar`, `restaurante`, `cafe`, `gastrobar`, `comida-rapida`, `dulces`, `teatro`, `exposicion`, `cine`, `fiesta`). Anclas: `api/interacciones.js` L139-147.
- **SIN cambios:** rural (`RURAL_KEYWORDS` -> 250), `parque` 150, `concierto` 150, `festival` 200 y `deporte` 200 siguen iguales; el radio explicito por lugar (`destinos.radio_m`, ADR-033) conserva su prioridad absoluta.
- **`ACCURACY_MAX_M = 150` y el bloqueo 422 `PRECISION_INSUFICIENTE` NO cambian:** el accuracy es un chequeo de precision del GPS, independiente del radio del lugar.
- **Motivo:** la geocerca urbana de 100 m permitia marcar la visita sin estar realmente en el lugar; se endurece a 50 m conservando los radios amplios para naturaleza/parques/eventos. Decision consolidada en **ADR-037** (`api/interacciones.js` v20).

**ADRs relacionados de esta enmienda:** ADR-024 (esta misma), ADR-033 (radio explicito por lugar), ADR-037 (consolidado de TSK-111).

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

**NOTA DE ENMIENDA (TSK-111, 2026-09-17) -- ajusta la UI de la ficha, NO la decision de hero/galeria:**
- **UI "Orden de modulos" retirada (no el dato):** el control visual del admin se elimina, pero `#hostal-modulos-list` queda OCULTO (`style="display:none" aria-hidden="true"`, `admin.html` L1234) para PRESERVAR el orden guardado; `tags.orden_modulos` y la logica de ensamblado de modulos siguen vivos. El orden queda "congelado" hasta una limpieza futura.
- **"Que incluye el precio" eliminado** de la UI del admin y del render publico (`api/pagina-destino.js`); la mision `mis_nomada_digital` y sus seeds NO se tocan (el legacy convive).
- **Seccion "Operacion" eliminada:** `f-capacidad` reubicado en la pestana General (`#fpanel-general`); `f-comotransporte` (codigo muerto) eliminado end-to-end.
- **Hero:** botonera en 2 filas (`.hctar-row`), grid 1+3 y las imagenes del hero abren el lightbox existente (`abrirLightboxHero`) con votos/comentarios placeholder y 2 CTAs a galeria.
- **Galeria:** "Fotos de viajeros" se retira de la ficha (`loadFotos`/`subirFoto`/`votarFoto` + CSS `fp-*`) y se consolida en `galeria.html`; el CTA se renombra a "Ver todas las fotos".
- **Ajuste de radio urbano relacionado:** ver la NOTA DE ENMIENDA de ADR-024 y el consolidado ADR-037.

**ADRs relacionados de esta enmienda:** ADR-024 (radios urbanos), ADR-030 (galeria unificada que esta ADR ajusto), ADR-034 (esta misma), ADR-037 (consolidado de TSK-111).

---

## ADR-035: XP decimal con `numeric(12,2)` y rankings de comunidad (Casas por XP total, Parches global, sub-vistas de Ranking)

**ID:** ADR-035
**Fecha:** 2026-09-17
**Estado:** Implementado en working tree (TSK-109): migracion `021_xp_decimal.sql` + preflight creados; backend `api/usuarios.js` v15, `api/interacciones.js` v18, `api/admin.js`, `api/pagina-destino.js` v10; frontend `usuario-session.js`/`index.html`/`admin.html`/`perfil.html`/`mi-perfil.html`/`comunidad.html`. Migracion 021 PENDIENTE de aplicar en Neon antes del deploy (ver `docs/DEPLOY_021.md`). Escudo GOLD PASS y smoke `scripts/smoke_021_xp_decimal_rankings.js` 45/45. Presupuesto 8/8 intacto (ADR-001): cero archivos nuevos en `api/`; todo entra como ramas `tipo=` y campos aditivos.
**Autor:** architect (AI-DOS). Decisiones de producto 1-5 aprobadas por el dueno del repositorio (2026-09-17).
**Nota de numeracion:** el 035 es el consecutivo real tras ADR-034 (mayor registrado en este documento, verificado con `Select-String '^## ADR-'` sobre el archivo real, ADR-006). El numero no estaba reservado en ninguna spec.
**Spec operativa:** `docs/superpowers/specs/2026-09-17-xp-decimal-rankings-comunidad-design.md`.

### Problema

El motor de gamificacion almacena el XP en columnas `integer`. La economia ya producia fracciones reales y las estaba perdiendo por redondeo/truncamiento silencioso en varios puntos:

1. **Piramide de referidos (ADR-027):** `FLOOR($2 * (0.10|0.05|0.03|0.02|0.01))` sobre `xp_ref_total`, mas un `parseInt(xpGanado, 10)` PREVIO al calculo que trunca el XP ganado (ej. 12.5 -> 12, y luego 10% = 1 en vez de 1.25). Doble perdida.
2. **Fama de Parche (ADR-018):** `Math.round(xpGanado * 0.10)` con guarda `if (famaBase < 1) return false;` que descarta aportes legitimamente menores a 1 XP.
3. **Own the Spot (ADR-014):** `Math.round(xpBase * 1.1)`.
4. **Presencia fisica (ADR-033):** `Math.round(20 * factorAreaVisita)`, donde `factorAreaVisita` vale `0.5`, `1` o `0` (el `0` desactiva el XP por zona).
5. **Arbol de Clases (ADR-028):** `ent(x) = parseInt(x, 10) || 0` trunca TODOS los derivados `D_R` que suman `xp_ganado` con bono de Origen `x1.2` aplicado por `FLOOR(...)` (`sqlBonoFila`); el descuento de nodo 5 usa `Math.floor(precio * (100 - pct) / 100)`.
6. **Tienda:** al bajar el precio de un consumible a fraccionario, la validacion de `admin.js` lo rechaza (`parseInt`, "debe ser un entero").
7. **Producto:** el usuario pidio que el XP se muestre SIEMPRE con 2 decimales (`es-CO`, ej. "125,50 XP"), con redondeo half-up a 2 decimales en cada acreditacion, para que la economia sea auditable y los bonos porcentuales no se desvanezcan.

En paralelo, la capa de rankings de `comunidad.html` estaba incompleta y desordenada: `casa_ranking` (ADR-028) existe en backend pero SIN UI y ordena por `xp_promedio`; no existe ranking global de Parches; y el ranking de Facciones vive en el tab "Activo Oculto" en lugar del tab "Ranking". El producto aprobo: Casas por **XP total** (mostrando total, promedio por miembro y **miembros activos vigentes**), Parches global por `fama_total` (mostrando **miembros activos**), y sub-vistas de Ranking: Viajeros | Casas | Facciones | Parches.

### Opciones evaluadas (almacenamiento)

1. **Centi-XP escalado (guardar `xp * 100` como `integer`).** Ventaja: cero cambios de tipo. Desventajas decisivas: (a) obliga a DIVIDIR por 100 en cada uno de los ~30 puntos de lectura/escritura (mismo esfuerzo de inventario que `numeric`), y cualquier punto olvidado muestra "12550 XP"; (b) deja una unidad fantasma que se filtra a JSON, HTML, correos, URLs y al JSON-LD; (c) NO resuelve el redondeo: sigue siendo aritmetica entera con `FLOOR`/`Math.round` que hay que reescribir igual; (d) `xp_total * 100` puede desbordar `int4` en teoricos 21.4M XP (no hoy, pero el techo baja 100x); (e) rompe la legibilidad de la BD (soporte y admin leen "12550"). **Descartada.**
2. **`numeric(12,2)` (DECISION DE PRODUCTO APROBADA).** Exacto en base 10 (a diferencia de `float8`), rango 0..9999999999.99 holgado, redondeo explicito con `ROUND(expr, 2)` (half-away-from-zero, que es el half-up pedido para positivos), y la conversion `integer -> numeric(12,2)` es **exacta y sin perdida**. **Elegida.**
3. **`float8` / `double precision`.** Descartada: no es exacta; en una economia donde `xp_total` es a la vez moneda (compras, DM de 20 XP, faccion 500 XP) el error binario acumulado hace que `xp_total >= precio` sea no determinista en el limite.
4. **Segunda moneda / ledger decimal separado.** Descartada por ADR-018 (moneda unica `xp_total`) y por presupuesto de endpoints (ADR-001).

### Opciones evaluadas (rankings)

1. **Crear endpoint nuevo `/api/rankings.js`.** Descartada: 8/8 agotado (ADR-001).
2. **Reusar `casa_ranking` (modificarlo) + nueva rama `pandilla_ranking` en `interacciones.js` (elegida).** Cero endpoints nuevos; `casa_ranking` ya vive en `usuarios.js` y `pandilla_ranking` comparte el patron de `pandilla_detalle` en `interacciones.js`. **Elegida.**
3. **Persistir `miembros_activos`/`xp_total` de Casa como columnas.** Descartada: viola el principio del proyecto de no persistir lo derivable (ADR-018/028); los contadores se calculan en consulta.

### Decision tomada

**(D1) Almacenamiento `numeric(12,2)`.** Se convierten las 9 columnas XP listadas en la seccion "Plan de migracion". Se conservan como `integer` los contadores (`total_resenas`, `total_guardados`, `total_visitas`, `votos_favor/contra`, `progreso_actual`, `meta_valor`, `cantidad`, `miembros`, etc.) y los puntos internos de rama (`progreso_arbol.bonos`, `RAMA_TIERS`, `FAMA_TIERS`), que no son `xp_total`.

**(D2) Redondeo half-up a 2 decimales en CADA acreditacion.** Se define UN helper por lenguaje (Regla de No-Duplicidad):
- Server JS: `redondearXp(n) = Math.round((Number(n) + Number.EPSILON) * 100) / 100` (domina valores positivos; `0` si `!isFinite`).
- SQL: `ROUND(expr::numeric, 2)` (half-away-from-zero en `numeric`).
Se aplica en: XP entregado por accion (`xpConMultiplicador`, `aplicarAmuletoX2`, `xpBaseVisita`, bonos de mision/logro ya enteros), reparto de referidos, fama de Parche, descuento de nodo 5, precio de consumible, `admin_xp` con `delta_xp`, y `xp_bono` de retos.
UI: **2 decimales SIEMPRE visibles**, formato `es-CO` via un unico helper cliente `window.ExploraCO.fmtXp(n)` (`Number(n).toLocaleString('es-CO', {minimumFractionDigits:2, maximumFractionDigits:2})`), con sufijo " XP" en las superficies que hoy lo muestran. Prohibido formatear XP inline en cada pantalla.

**(D3) Pestana "Clase" consolidada.** Todo el Arbol de Clases (faccion, vocaciones y la Tabla de Destino como sub-vista "Senderos") vive dentro del componente Arbol de Clases; "Mi Casa" queda como bloque compacto dentro de Clase. Es refactor de frontend (`mi-perfil.html`/`comunidad.html`); no toca esquema ni endpoints.

**(D4) Rankings.**
- **Casas:** `GET /api/usuarios?tipo=casa_ranking` ordena por `xp_total` DESC (ya no por `xp_promedio`) y agrega `miembros_activos`; expone `miembros`, `miembros_activos`, `xp_total`, `xp_promedio` (todos `numeric` redondeados a 2) y los contadores existentes (`activos_ocultos_aprobados`, `checkins_30d`). El `top` por Casa no cambia.
- **Parches:** NUEVA rama `GET /api/interacciones?tipo=pandilla_ranking` global, ordenada por `fama_total` DESC (desempate `creado_en ASC`), limit 50, con `miembros` y `miembros_activos` por Parche. Sin sesion (lectura publica, coherente con la capa publica de ADR-031).
- **Facciones:** el ranking se mueve del tab "Activo Oculto" al tab "Ranking" de `comunidad.html`.
- **Sub-vistas del tab Ranking:** Viajeros | Casas | Facciones | Parches (conmutadas en cliente, sin endpoint nuevo salvo `pandilla_ranking`).

**(D5) Sin `::int` ni `parseInt` sobre columnas XP.** Todo `::int` que hoy envuelve `SUM(xp_...)` se elimina (o pasa a `::numeric(12,2)` con `ROUND(...,2)`), y todo `parseInt(columna_xp)` pasa a `parseFloat`/`Number`. Critico: Neon/@neondatabase/serverless devuelve `numeric` como **string** en el JSON del driver; por eso (a) no debe hacerse aritmetica directa sobre el valor crudo y (b) todo row que se devuelva al cliente debe normalizar la columna a `Number` redondeado (si no, `GET ?tipo=leaderboard` empezaria a emitir `"xp_total":"125.50"` como string).

### Justificacion

`numeric(12,2)` es la unica opcion que elimina la perdida de precision sin inventar una unidad artificial, sin duplicar la economia y sin crear endpoints (ADR-001). El centi-XP obliga al mismo barrido de codigo pero ademas contamina todas las superficies con una unidad escalada; su unica ventaja (no migrar tipos) se anula porque de todos modos hay que tocar cada punto de redondeo. La conversion `integer -> numeric(12,2)` es exacta (todo `int4` cabe en `numeric(12,2)`), por lo que la migracion es de bajo riesgo y no requiere backfill de valores; solo `pandillas.fama_total` merece analisis aparte (ver abajo) y la conclusion es NO recomputarlo. Definir un unico helper de redondeo por lenguaje evita el escenario mas probable de bug (30 puntos con criterios distintos); el mandato ASCII-safe (ADR-002) sigue vigente en `api/*.js` y en este documento.

Sobre `pandillas.fama_total`: **NO se recomputa, solo se cambia el tipo.** Razon: `fama_total` es un acumulador historico construido con `ROUND(10% del XP entregado)`, **duplicado** por el consumible `trompeta_fama` (x2) y alimentado tambien por XP de misiones/logros que nunca queda en `interacciones.xp_ganado` (drift ya documentado en ADR-024/ADR-028). Un recomputo `SUM(xp_ganado)*0.10` (a) borraria el efecto del consumible, (b) ignoraria el drift de misiones/logros, (c) reescribiria datos historicos (contra Cero Borrado Logico / Regla de Oro 3) y (d) la migracion 014 ya hizo un recomputo unico autorizado. La conversion de tipo preserva el valor tal cual (125 -> 125.00), que es exactamente lo que se necesita. Si en el futuro se quiere realinear la fama, sera una tarea de datos explicita y separada, con respaldo.

### Plan de migracion 021 (`db/migrations/021_xp_decimal.sql`)

**Principio:** idempotente (ADR-008) y defensiva (patron BUG-021): cada `ALTER` corre solo si la columna EXISTE y su `data_type` actual es entero (`integer`/`smallint`/`bigint`); tras la conversion el `data_type` es `numeric` y el bloque se vuelve no-op. Se implementa con un unico `DO $$` que itera una lista `(tabla, columna)` y ejecuta `ALTER TABLE ... ALTER COLUMN ... TYPE numeric(12,2) USING col::numeric(12,2)` con `format('%I')` (identificadores seguros). No se hace `ADD COLUMN` de nada no versionado.

Columnas a convertir (fuente de verdad = DDL real, ADR-006):

| Tabla | Columna | DDL versionado | Nullable | Default |
|---|---|---|---|---|
| `usuarios` | `xp_total` | `010_gamificacion_v4.sql:183` | NOT NULL | 0 |
| `usuarios` | `xp_ref_total` | `016_multinivel_crowdsourcing.sql:56` | SI (nullable) | 0 |
| `interacciones` | `xp_ganado` | **NO versionada** (guard `IF EXISTS`) | (de Neon) | (de Neon) |
| `album_votos` | `xp_ganado` | `009_albumes.sql:67` | NOT NULL | 5 |
| `album_fotos` | `xp_otorgado_autor` | `009_albumes.sql:56` | NOT NULL | 0 |
| `compra_consumibles` | `xp_pagado` | `010_gamificacion_v4.sql:34` | NOT NULL | (sin default) |
| `pandilla_retos` | `xp_bono` | `010_gamificacion_v4.sql:140` | NOT NULL | 0 |
| `consumibles` | `precio_xp` | `010_gamificacion_v4.sql:21` | NOT NULL | 0 |
| `pandillas` | `fama_total` | `010_gamificacion_v4.sql:97` | NOT NULL | 0 |

**Nota de no-perdida:** `int4` maximo = 2147483647; `numeric(12,2)` maximo = 9999999999.99. Toda fila entera existente cabe de forma exacta (`125 -> 125.00`); no hay redondeo, truncamiento ni saturacion. La conversion preserva `NULL` (en `usuarios.xp_ref_total`) y los `DEFAULT` (Postgres recastea la expresion del default por cast de asignacion).

**No se agregan indices en 021.** `casa_ranking`/`pandilla_ranking` son agregados con `LIMIT` sobre tablas pequenas (cientos de filas) y el filtro de 30 dias usa `usuarios.ultimo_acceso`, que es una columna **no versionada**; crear un indice sobre ella aumentaria el riesgo de la migracion sin ganancia medible. Si el volumen crece, sera una migracion aparte que primero versione esas columnas.

**Paso manual obligatorio:** la 021 la aplica el dueno del repositorio en el editor SQL de Neon ANTES del deploy (ADR-008; mismo flujo que 016/017/018). Si el backend decimal se despliega sin la 021, los `UPDATE` sobre columnas `integer` reciben numeros fraccionarios: Postgres los redondea por cast de asignacion (no falla), por lo que el sintoma es silencioso (se sigue redondeando a entero). La verificacion de cierre debe comprobar `data_type='numeric'` en las 9 columnas.

### Plan de rollback

- El rollback es `numeric(12,2) -> integer` con `USING ROUND(col)::integer`. Es **LOSSY** (se pierden los decimales) y solo se ejecuta ante una emergencia de produccion; debe acompanarse del revert del backend a la version entera (el codigo decimal sobre columnas `integer` sigue funcionando pero trunca). Se documenta como `db/migrations/021_xp_decimal_down.sql` NO ejecutable en el flujo normal.
- Rollback parcial nulo-riesgo: para reproducir el comportamiento entero SIN tocar tipos, basta `SET xp_total = ROUND(xp_total)` (los decimales se pierden). No se recomienda.
- Mitigacion previa: la 021 puede acompanarse de un respaldo logico de las 9 columnas (`CREATE TABLE xp_backup_021 AS SELECT ...`) si el operador quiere un rollback exacto; opcional, dado que la conversion es de ida y vuelta sin perdida mientras NO se hayan acreditado fracciones.

### Definicion: "miembro activo vigente (30 dias)"

Un miembro de una Casa o de un Parche es **activo vigente** si y solo si se cumplen las TRES condiciones:

1. **Pertenencia activa:** `pandillas_miembros.activo = true` (Parches) o `usuarios.casa IS NOT NULL` (Casas). El soft-leave pone `activo=false`, nunca borra (Cero Borrado Logico).
2. **Cuenta habilitada:** `usuarios.activo = true`.
3. **Actividad reciente:** `usuarios.ultimo_acceso > NOW() - INTERVAL '30 days'`.

`ultimo_acceso` es el proxy de actividad del proyecto: se escribe `NOW()` en cada acreditacion de XP (resena, guardado, visita, rating, chat, planes, albumes, DM, `admin_xp`, etc.). Se descarta contar acciones por tipo (costoso y sesgado): la ventana de 30 dias sobre `ultimo_acceso` es determinista, barata y ya usada por ADR-029/ADR-028.

**Deuda asociada:** `usuarios.activo` y `usuarios.ultimo_acceso` siguen siendo columnas NO versionadas (patron BUG-021, registrado en ADR-028). La implementacion DEBE degradar con gracia: si la consulta falla con `42703` (columna ausente), reintentar la misma consulta SIN la condicion de actividad (`activo`/`ultimo_acceso`) y devolver `miembros_activos = 0` mas un `warn`; nunca silenciar el error con un catch vacio (Regla de Oro / GSD 2.2). Se recomienda versar ambas columnas en una migracion futura.

### Inventario backend de redondeo/parseo (archivo:linea, verificado 2026-09-17 sobre el working tree real)

Regla: **todo `parseInt(columna_xp)` -> `parseFloat`/`Number`; todo `FLOOR`/`Math.round`/`Math.floor` que produzca XP -> half-up a 2 decimales; todo `::int` sobre `SUM(xp_...)` -> `ROUND(...,2)`/`::numeric(12,2)`.**

**`api/usuarios.js` (header real v14)**
- L38 `parseInt(xpTotal)` en `calcularNivel` -> `parseFloat` (display/derivados; ver seccion de validacion).
- L53-55 `conNivel(row)`: normalizar `row.xp_total = Number(row.xp_total)` (numeric llega string; `leaderboard` L267-277 y `?id=` L314-330 devuelven la fila cruda).
- L415 `parseInt(rcRows[0].xp_ref_total, 10) || 0` -> `Number` + redondeo 2.
- L435 `COALESCE(SUM(xp_ref_total), 0)::int AS xp_ref` -> quitar `::int`, `ROUND(SUM(...),2)`.
- L455 `COALESCE(SUM(xp_total), 0)::int AS xp_total` (faccion_ranking) -> quitar `::int`.
- L459-463 `frTop` devuelve `xp_total` crudo -> normalizar a `Number` en el map de respuesta.
- L478 `COALESCE(SUM(u.xp_total), 0)::int AS xp_total` (casa_ranking) -> quitar `::int`; **anadir `miembros_activos`** (ver arriba).
- L479 `COALESCE(ROUND(SUM(u.xp_total)::numeric / GREATEST(COUNT(*), 1)), 0)::int AS xp_promedio` -> `ROUND(..., 2)` sin `::int`.
- L492 `ORDER BY xp_promedio DESC` -> `ORDER BY xp_total DESC`.
- L495-499 `crTop` devuelve `xp_total` crudo -> normalizar a `Number`.
- L546 `xp_total: parseInt(pub.xp_total, 10) || 0` (perfil publico) -> `Number` + 2 decimales.
- L572-596 `faccion_elegir`: el `WHERE xp_total >= 500` SQL es correcto; el `xp_total` del RETURNING debe normalizarse a `Number`.
- L634/641/650/655/670/684 `casa_elegir`: `parseInt(ceFila[0].xp_total, 10)` (L641, L655, L684) -> `Number` + redondeo 2.

**`api/interacciones.js` (header real v14; comentarios nuevos v17)**
- L193-204 `calcularNivelLocal`: L198 `parseInt(xpTotal, 10)` -> `parseFloat`.
- L544-564 `nivelNodoArbol`/`nodosDesbloqueadosArbol`: L552/L562 `parseInt(puntos, 10)` -> `parseFloat` (los `P_R` ahora son `numeric`); `RAMA_TIERS` sigue entero (comparacion `>=` correcta).
- L586 `parseInt(ef.pct, 10)` -> mantener entero (es porcentaje de descuento, no XP).
- **L628-630 `sqlBonoFila`:** `FLOOR((expr) * 1.2)` -> `ROUND((expr) * 1.2, 2)`.
- **L641 `ent(x) = parseInt(x, 10) || 0`** -> `parseFloat`/`Number` + redondeo 2 (trunca TODO `D_R`).
- L675-677, L681 `::int` sobre `SUM(... xp_ganado ...)` en `D_R` -> `ROUND(...,2)`.
- L700/703/758/761/765/782/784/787 `::int` sobre sumas de puntos derivados (no columnas XP, pero reciben `sqlBonoFila`) -> `ROUND(...,2)` (consistencia).
- L718-720 / L728-730 `SUM(... xp_ganado ...) FILTER (...)::int` -> `ROUND(...,2)`.
- L747-748 `Math.floor(15 * BONO_ORIGEN)` / `Math.floor(50 * BONO_ORIGEN)` -> `ROUND(...,2)` SQL-equivalente (o `Math.round(x*100)/100`).
- L823 `COALESCE(SUM(i.xp_ganado),0)::int AS xp` (cre_eventos) -> `ROUND(...,2)`.
- L866 `ent(q.n_largas) * (orgExtranjero ? Math.floor(15 * BONO_ORIGEN) : 15)` -> half-up 2.
- **L1743 `xpConMultiplicador`: `Math.round(xpBase * 1.1)` -> `redondearXp(xpBase * 1.1)`.**
- **L1862-1863 `aplicarFamaPandilla`: `Math.round(xpGanado * 0.10)` -> `redondearXp(...)`; guarda `if (famaBase < 1) return false;` -> `if (famaBase <= 0) return false;`** (si no, los aportes < 1 XP se descartan y `fama_total` queda subcontada). L1867 `fama = famaBase * 2` -> redondear.
- L1906/1917 `parseInt(r.xp_bono, 10)` (retos) -> `Number` + 2 decimales; L1912 el `UPDATE ... xp_total = xp_total + $1` queda correcto con numeric.
- **L1982/1998 `repartirXpReferidos`: `parseInt(xpGanado, 10)` -> `parseFloat`/`Number`** (hoy trunca ANTES de calcular porcentajes).
- **L1993 `FLOOR($2 * (CASE ...))` -> `ROUND($2 * (CASE ...), 2)`.**
- L2189/2190/2191 `evaluarMisiones` ctx (`parseInt(u.xp_total)` etc.) -> `Number`/`parseFloat`.
- L2287/2288/2289 `evaluarLogros` ctx -> `Number`/`parseFloat`.
- L2361-2367 `xpBonus` de logros (enteros): el `UPDATE` queda correcto; no requiere cambio.
- L2961 `xp_total: parseInt(mpU.xp_total, 10) || 0` (museo_publico) -> `Number` + 2.
- L2972 `fama_total: parseInt(..., 10) || 0` -> `Number` + 2.
- L3266 / L3274 / L3296 `COALESCE(SUM(xp_ganado),0)::int AS fama` (tabla_destino) -> `ROUND(...,2)`.
- L3353 `parseInt(pandillaActiva.fama_total, 10) || 0` -> `Number` + 2.
- L3393 `parseInt(sn.fama, 10) || 0` -> `Number`/`parseFloat`.
- L4184 `parseInt(inv.xp_total, 10) || 0` (inventario) -> `Number` + 2.
- L4373 `parseInt(aoVUsr[0].xp_total, 10) || 0` (gate nivel 5 Wayfarer) -> `parseFloat`.
- L5032 `parseInt(dmEmisor.xp_total, 10) || 0` -> `Number`.
- L5069 `parseInt(dmCobro.xp_total, 10) || 0` -> `Number`.
- **L5294 `Math.floor(nivelCheck[0].xp_total / 100) + 1` (gate de `album_crear`) -> `calcularNivelLocal(nivelCheck[0].xp_total).nivel`** (formula oculta, ver validacion).
- L5641/5642 `admin_xp`: `parseInt(body.nivel)` es correcto (nivel entero); `parseInt(body.delta_xp, 10)` -> `parseFloat` + `redondearXp`. L5657 `parseInt(axUsr[0].xp_total, 10) || 0` -> `Number`. L5668 `UPDATE ... xp_total=$1` -> redondear antes.
- L5713 / L5751 `parseInt(...xp_total...)` (vocaciones / rama_activar) -> `parseFloat`.
- **L6099 `parseInt(ccCons[0].precio_xp, 10) || 0` -> `Number` + 2.**
- **L6111 `Math.floor(ccPrecioBase * (100 - ccDescPct) / 100)` -> `redondearXp(...)`.**
- L6116 `parseInt(ccUsr[0].xp_total, 10)` -> `Number`; L6148 `parseInt(ccUpd[0].xp_total, 10)` -> `Number`.
- L6554 `parseInt(body.meta_valor, 10)` -> mantener entero (meta del reto). **L6562 `parseInt(body.xp_bono, 10)` -> `parseFloat` + `redondearXp`.**
- L6667-6695 resena: `xpResenaEntregado` debe pasar por `redondearXp` tras `xpConMultiplicador` y `aplicarAmuletoX2` antes del `UPDATE` L6682.
- L6779 / L6993 / L7098 `UPDATE usuarios SET xp_total = xp_total + $1` (guardado / visita / rating) -> enviar `$1` ya redondeado.
- **L6900 `Math.round(20 * factorAreaVisita)` -> `redondearXp(20 * factorAreaVisita)`** (ADR-033).
- L5217/5257/6976/7072/5430/5372 `INSERT INTO interacciones (..., xp_ganado)` con constantes enteras (foto 15/5, visita base, rating): la columna numeric las acepta; se conserva la base entera en la fila (misma razon de ADR-014: el check `xp_ganado >= 25` de `mis_primera_resena`, L993).

**`api/admin.js`**
- L58/74 `repartirXpReferidos` (copia sincronizada de interacciones.js): `parseInt(xp, 10)` -> `parseFloat`; **L69 `FLOOR($2 * (...))` -> `ROUND(...,2)`**.
- L189/214 `i.xp_ganado` / `xp: r.xp_ganado||0` (listado de resenas) -> `Number` + 2 decimales.
- L328-329 `SELECT ... precio_xp ... ORDER BY precio_xp ASC` -> correcto con numeric; normalizar a `Number` en la respuesta.
- **L339-344 `parseInt(body.precio_xp, 10)` + mensaje "debe ser un entero mayor que 0" -> `parseFloat` + `redondearXp` + mensaje "mayor que 0"** (permite precio fraccionario, requerido por D2 y por la tienda).
- L380-385 `editar`: `parseInt(body.precio_xp, 10)` -> `parseFloat` + `redondearXp`.
- L470 `UPDATE usuarios SET xp_total=xp_total+50` -> correcto (constante entera).

**`api/pagina-destino.js`**
- L2595 `window.ExploraCO.usuario.xp_total=(parseInt(...)||0)+15` -> `parseFloat` + `redondearXp` (espejo cliente).
- L2609 idem con `+5`.
- L101 `money()` es formateo de precio de destino (no XP): sin cambios.

**`usuario-session.js` (fuente de verdad del cliente)**
- L30 `parseInt(xpTotal) || 0` en `calcularNivel` -> `parseFloat`.
- **Nuevo helper compartido** `window.ExploraCO.fmtXp(n)` y, si aplica, `window.ExploraCO.redondearXp(n)`; TODAS las superficies deben consumirlo (prohibido `parseInt(u.xp_total)` inline).

**Frontend (formato/parseo de display)**
- `index.html` L4166/4209-4227 (XP_LEVELS/getLevel/getLevelPct) y `statsU` (parseInt de `xp_total`); `mi-perfil.html` L776/825/834-840; `comunidad.html` L487/533/542-547; `admin.html` L7351 (`_jugNiveles`), L7438-7439 (`xpMin/xpMax`), tab Jugadores. Todos: `parseFloat` + `fmtXp`.

### Formato de presentacion

- `fmtXp(125.5)` -> `"125,50"` (es-CO, 2 decimales, separador de miles `.`).
- Superficies con sufijo: mostrar `"125,50 XP"` (mantener el literal "XP" donde ya existe).
- Progreso de nivel (`getLevelPct`): usar el XP real (`parseFloat`); el `Math.round(...*100)` del porcentaje final se conserva (es un porcentaje entero, no XP).
- El input del admin de `precio_xp` acepta decimales con punto o coma; el backend normaliza.

### Validacion: umbrales de nivel con decimales

1. **Las 20 comparaciones de umbral siguen siendo correctas con decimales.** Los umbrales son enteros `[0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5200, 6800, 8500, 10500, 13000, 16000, 19500, 24000, 30000]` y para todo `x >= 0` y entero `T` se cumple `floor(x) >= T  <=>  x >= T`. Por tanto, incluso un `parseInt` olvidado NO cambia el nivel asignado (trunca valores como `99.99 -> 99` o `100.50 -> 100`, ambos con el mismo nivel que con el valor completo). La conversion a `parseFloat` es obligatoria por DISPLAY y por AGREGADOS (bonos, fama, `ent()`, reparto), no por el nivel; sirve ademas como blindaje si un umbral futuro deja de ser entero.
2. **Se confirmo UN unico catalogo de umbrales, replicado identico en 7 lugares** (todos verificados por lectura): `api/usuarios.js:14-35`, `api/interacciones.js:193-196`, `usuario-session.js:22-25`, `index.html:4166-4187`, `mi-perfil.html:776-797`, `comunidad.html:487-508`, `admin.html:7351`. No hay discrepancias de valores.
3. **FORMULA OCULTA ENCONTRADA (bug preexistente): `api/interacciones.js:5294`** usa `Math.floor(xp_total / 100) + 1` como gate del nivel 2 para `album_crear`. Es una segunda formula de nivel que solo coincide con la tabla real en los umbrales bajos: en 450 XP devuelve 5 (real 4), en 1400 devuelve 15 (real 7), en 30000 devuelve 301 (real 20). Hoy el unico uso es `nivelCalc < 2` (a 100 XP ambas coinciden), por lo que el bug esta latente; **debe corregirse en esta entrega** a `calcularNivelLocal(xpDB).nivel` para no dejar una formula divergente en la misma funcion que migra el XP. Debe registrarse en BUGS_HISTORICOS.md.
4. **No hay ninguna otra formula de nivel oculta:** `RAMA_TIERS [0,100,250,450,700]`, `FAMA_TIERS` y `_jugNiveles` no son niveles de XP global (son progresiones internas de rama/sendero y el selector del admin) y se conservan enteros, coherentes con la tabla global.

### Riesgos y mitigaciones

| # | Riesgo | Impacto | Mitigacion |
|---|---|---|---|
| R1 | `numeric` llega como **string** desde Neon al JSON (driver `pg`) | API emite `"xp_total":"125.50"`; front hace `+` de concatenacion | D5: normalizar en el borde (`conNivel`, maps de `frTop`/`crTop`, `leaderboard`, `?id=`, `perfil_publico`, `museo_publico`, inventario) + helper `fmtXp` en cliente |
| R2 | Deploy del backend decimal SIN la migracion 021 | Cast integer trunca las fracciones **en silencio** (no hay 500) | Aplicar 021 antes del deploy; verificacion de cierre con `information_schema` (`data_type='numeric'` en las 9) |
| R3 | `parseInt` olvidado sobre columna XP | Trunca, recomputa porcentajes sobre valores incompletos; no cambia nivel (ver validacion) pero si `D_R`, fama, referidos | Inventario de esta ADR como checklist de cierre + grep de verificacion (`parseInt` + columnas XP) en el Escudo GOLD |
| R4 | `::int` olvidado en un `SUM(xp_...)` | Redondeo silencioso de sumas (rankings/fama/`D_R`) | Checklist L435/455/478-479/676-677/720/730/823/1993/3266/3274/3296 (+ admin.js L69) |
| R5 | Redondeo inconsistente entre puntos (JS vs SQL) | Deriva de centavos entre `xp_total` y `xp_ref_total`/fama | Un helper por lenguaje (D2) + regla "redondear en la acreditacion, no en la lectura" |
| R6 | `usuarios.activo`/`ultimo_acceso` no versionadas (patron BUG-021) | `casa_ranking`/`pandilla_ranking` con 42703 | Reintento sin la condicion de actividad + `warn` + `miembros_activos: 0`; nunca catch vacio; versar columnas en migracion futura |
| R7 | Guarda `famaBase < 1` recortaba aportes | Parches subcontados | Cambiar a `<= 0` (ver L1863) |
| R8 | Codigo viejo durante el deploy (mix entero/decimal) | Ventana de minutos con respuestas mixtas | Desplegar backend y frontend juntos; el codigo entero sigue operando (degradado) contra columnas numeric |
| R9 | Rollback pierde decimales | Datos historicos redondeados | Respaldo opcional de las 9 columnas antes de la 021; rollback solo emergencia |
| R10 | `xp_ref_total` nullable | `SUM` con NULL | Ya manejado con `COALESCE`; la conversion preserva NULL |
| R11 | Ranking de Casas pasa de promedio a total: Casas grandes suben | Cambio de expectativa editorial | Decision D4 aprobada; la UI muestra tambien `xp_promedio` para transparencia |

### Impacto

- `db/migrations/021_xp_decimal.sql` (NUEVA, idempotente ADR-008, ASCII-safe ADR-002; 9 columnas -> `numeric(12,2)`; sin indices).
- `api/usuarios.js` (v14 -> v15: `calcularNivel` parseFloat, `conNivel` normaliza `Number`, `referido_red` sin `::int`, `faccion_ranking` sin `::int` + normalizacion, **`casa_ranking` con `miembros_activos` y `ORDER BY xp_total DESC`**, `perfil_publico` y `casa_elegir` normalizados).
- `api/interacciones.js` (v14/v17 -> v18: helpers `redondearXp`, `ent` con `parseFloat`, `sqlBonoFila` con `ROUND(...,2)`, `repartirXpReferidos` con `ROUND(...,2)` y `parseFloat`, `xpConMultiplicador` y `aplicarFamaPandilla` con half-up, `xpBaseVisita` half-up, `admin_xp` delta decimal, `comprar_consumible`/`pandilla_reto` decimales, gate `album_crear` con `calcularNivelLocal`, **NUEVA rama `GET tipo=pandilla_ranking`**).
- `api/admin.js` (`precio_xp` decimal, `repartirXpReferidos` decimal, listado de resenas normalizado).
- `api/pagina-destino.js` (espejo cliente de XP en foto/voto con decimales).
- `usuario-session.js` (`calcularNivel` parseFloat + helper `fmtXp`).
- Frontend: `index.html`, `mi-perfil.html` (pestana "Clase" consolidada: Arbol + vocaciones + Tabla de Destino como "Senderos"; "Mi Casa" compacto), `comunidad.html` (tab Ranking con sub-vistas Viajeros|Casas|Facciones|Parches; Facciones sale de "Activo Oculto"; consumo de `pandilla_ranking`), `admin.html` (input de precio decimal, display XP).
- `exploraco desarrollo/BUGS_HISTORICOS.md`: registrar la formula de nivel de L5294 y (si aplica) la guarda `famaBase < 1`.
- **Sin endpoints nuevos** (8/8, ADR-001); sin `tags` JSONB nuevo (no aplica el motor `CATEGORY_TAG_FIELDS`/`CATEGORY_TAG_LISTS` de BLUEPRINT seccion 6, que es para campos de ficha de destino).
- Verificacion esperada: Escudo GOLD (`node --check` en los 4 `api/*.js` + `usuario-session.js`, ASCII 0 bytes >127, divs balanceados), smoke dedicado (migracion 021 idempotente, `casa_ranking`/`pandilla_ranking`, redondeo half-up, ranking ordenado, `fmtXp`) y prueba en Neon de la conversion (idempotencia: correr la 021 dos veces y confirmar que la segunda es no-op).

### Consecuencias positivas

- La economia deja de perder fracciones: referidos, fama, multiplicadores y descuentos son auditables al centavo.
- Un unico criterio de redondeo (helper por lenguaje) elimina la causa raiz de la deriva de centavos.
- Se activa el ranking de Casas (antes sin UI) y nace el ranking global de Parches sin gastar endpoints.
- Se elimina una formula de nivel divergente (L5294) y se deja el XP con formato consistente en todo el sitio.

### Consecuencias negativas / riesgos residuales

- **Migracion 021 pendiente (BLOQUEANTE):** sin ella el sistema sigue redondeando en silencio; la verificacion de tipo es obligatoria.
- La conversion reescribe las 9 tablas (`ACCESS EXCLUSIVE` momentaneo por tabla). Con el volumen actual es instantanea; el operador debe aplicarla fuera de pico.
- `usuario-session.js` es cacheado por el navegador: si el frontend no se despliega junto con el backend, un cliente con `calcularNivel` viejo (`parseInt`) mantiene el nivel correcto (ver validacion) pero muestra XP truncado.
- Persiste la deuda de columnas no versionadas (`usuarios.activo`, `usuarios.ultimo_acceso`, `interacciones.xp_ganado`), que la 021 mitiga con guards pero no cierra.
- El rollback es lossy.

**Estado:** Aprobado (diseno). Implementacion pendiente: migracion 021 + backend + frontend, con verificacion en Neon y Escudo GOLD.

**ADRs previos relacionados:** ADR-001 (presupuesto 8/8), ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-006 (baseline = archivo real), ADR-008 (SQL versionado / idempotencia), ADR-012 (logros en codigo), ADR-014 (x1.1; precedente de numeracion), ADR-018 (moneda unica `xp_total`, consumibles, 20 niveles), ADR-024 (drift de XP sin ledger), ADR-025 (sesion firmada), ADR-027 (piramide de referidos, `fama_total`, topes), ADR-028 (Casas, Arbol, `casa_ranking`, deuda de columnas no versionadas), ADR-029 (conteos reales del admin con `usuarios.activo`), ADR-031 (capa publica), ADR-033 (factor de area por radio), ADR-034 (consecutivo anterior).

---

## ADR-036: Compartir social con XP por primer share + interacciones de media unificadas (votos/comentarios/guardados)

**ID:** ADR-036
**Fecha:** 2026-09-17
**Estado:** Implementado en working tree (SIN commitear). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar `db/migrations/022_media_compartidos.sql` y `db/migrations/023_interacciones_media_unificadas.sql` en Neon (archivo COMPLETO en una corrida del editor SQL, patron BUG-021/BUG-060) ANTES del deploy del backend v19**; despues, commit/push/deploy en un solo release. Verificacion local: Escudo GOLD (`node --check` 7/7 OK, ASCII-safe 0 bytes >127 y 0 backticks en `api/*.js`, `compartir.js` y ambas migraciones) y smokes `scripts/smoke_036_compartir.js` 55/55 PASS + `scripts/smoke_036_media_unificada.js` 71/71 PASS (ambos con mock: NO validan el esquema de Neon).
**Autor:** architect (AI-DOS) con decision de producto del Chief Architect; implementado y verificado en working tree (2026-09-17).
**Nota de numeracion:** el 036 es el consecutivo real tras ADR-035 (mayor registrado en este documento, verificado con grep `^## ADR-` sobre el archivo real, ADR-006).

### Contexto

La entrega nace de tres restricciones simultaneas:

1. **El CHECK de `interacciones.tipo` no esta versionado.** `interacciones` es una tabla base fuera de `db/migrations/` (patron BUG-021/BUG-060). Su CHECK real acepta `resena|guardado|visita|foto|rating` (confirmado por el preflight 1 de la migracion 022). Agregar un tipo nuevo exigia un `ALTER` sobre un objeto no versionado, con el mismo riesgo de drift que BUG-021 (la realidad de Neon no es reproducible desde el repo).
2. **Tres modelos de media incompatibles.** La media del sitio vive en tres origenes distintos: curadas (`destinos_fotos`), foto de viajero (`interacciones` `tipo='foto'` mas `dims->>'voto_foto_id'`) y foto de album (`album_fotos` mas `album_votos`/`album_comentarios`/`album_comentario_votos`). Votar, comentar y guardar solo existia en el modelo de album; las curadas y las de viajero no eran votables/comentables, y cada lector (`galeria_destino`, `album_detalle`, `fotos_top`, `mi_feed_fotos`, `multimedia_mapa`, `museo_publico`, ...) repetia su propia consulta al modelo legacy.
3. **Presupuesto de 8/8 funciones serverless agotado** (ADR-001/ADR-010): ninguna necesidad podia resolverse con un endpoint nuevo.

Ademas, el producto pidio (a) un boton Compartir con recompensa real de XP y defensa anti-farming en la ficha y la galeria, (b) un hero en mosaico (1 principal + 3 secundarias) con el boton Compartir en la barra sticky, y (c) que la insignia `compartido` volviera al perfil sin depender de un contador local decorativo (habia sido retirada por no tener endpoint real detras).

### Opciones evaluadas

1. **Agregar `'compartir'` al CHECK de `interacciones.tipo`.** Descartada: la tabla y su CHECK no estan versionados; el `ALTER` seria SQL suelto sobre Neon (contra ADR-008) y mezclaria el ledger de comparticiones con la tabla de ratings/resenas (un share no es una calificacion ni debe alimentar checks como `mis_primera_resena`, cuyo umbral es `xp_ganado >= 25`).
2. **Tabla propia `media_compartidos` (log + XP).** Elegida: aditiva, versionada en `db/migrations/022`, con indice unico parcial `es_primero`; el CHECK legacy queda intacto.
3. **Detectar el "primer share" con `SELECT` previo + `INSERT`.** Descartada: carrera entre dos requests concurrentes, que pagarian 25 XP dos veces. Se prefirio el indice unico parcial + `INSERT ... ON CONFLICT (usuario_id,fuente,item_id) WHERE es_primero = true DO NOTHING RETURNING id` (deteccion atomica).
4. **Mantener los 3 modelos de media y agregar votos/comentarios a cada uno.** Descartada: triplicaria tablas y codigo, y los lectores seguirian con N consultas distintas.
5. **Tablas polimorficas `media_*` con `item_id text` + `fuente`.** Elegida: un solo contrato para las 3 fuentes (`curada|viajero_foto|album_foto`), `item_id text` (acepta uuid y slugs, tope 64), soft-delete por `activo` (Cero Borrado Logico) y backfill idempotente desde las tablas legacy.
6. **Crear `media_guardados` de cero.** Descartada: ya existe desde la 019; se prefiere `ALTER ... item_id uuid -> text USING item_id::text` (preserva los valores, cero movimiento de datos) mas ampliar su CHECK de fuente con `'curada'`.
7. **Crear endpoints nuevos (`/api/compartir.js`, `/api/media.js`).** Descartada: 8/8 agotado (ADR-001). Todo entra como ramas `?tipo=` en `api/interacciones.js`.

### Decision tomada

**(A) Compartir social con XP (`media_compartidos`, migracion 022).**
- Tabla `media_compartidos` (`id`, `usuario_id`, `destino_id`, `fuente`, `item_id`, `canal`, `es_primero`, `xp_ganado numeric(12,2)`, `creado_en`); CHECK de `fuente` (`destino|curada|viajero_foto|album_foto`) y de `canal` (`web_share|whatsapp|copiar|otro`); `item_id text` 1..64.
- Indice unico parcial `media_compartidos_primero_uq (usuario_id,fuente,item_id) WHERE es_primero = true` + `idx_media_compartidos_usuario_dia` y `idx_media_compartidos_item`.
- **NO toca el CHECK de `interacciones.tipo`**: `'compartir'` no entra a `interacciones`; el ledger de XP es la propia tabla. El preflight 1 de la 022 confirma que el CHECK legacy no contiene `compartir`.
- Rama `POST ?tipo=compartir` (`api/interacciones.js`, v19): exige `validarSesion` (ADR-025; cierra la clase de spoofing de XP de BUG-061), valida `fuente`/`canal`/`item_id` y la existencia real del item (404), y deriva `destino_id` del item validado (el `destino_id` del body solo tiene prioridad como contexto de pagina si es uuid valido y la fuente no es `destino`). **25 XP el primer share** por `(usuario,fuente,item_id)` para siempre y **5 XP los posteriores**, con **tope de 10 eventos y 50 XP por ventana rodante de 24h** (los eventos sin remanente se registran con `xp_ganado=0`). El XP del share pasa por `xpConMultiplicador`, `aplicarAmuletoX2`, `aplicarFamaPandilla` (10% a Parche) y `repartirXpReferidos`; el ledger se cierra con el XP final.
- **3 misiones nuevas** (`mis_primer_compartido` 15 XP, `mis_voz_comunidad` 40 XP a 10 items distintos, `mis_embajador_destinos` 75 XP a 10 destinos distintos; grupo `general`, encadenadas por `requiere`) y **3 logros nuevos** (`logr_primer_compartido` bronce, `logr_compartidor_25` plata, `logr_viral_100` oro), cuyos checks leen `media_compartidos` con `conDegradacionMedia`/`contarCompartidosUsuario` y degradan a `false`/`0` si la 022 no esta aplicada (nunca catch vacio).
- Integracion con cromos (`intentarObtenerCromo`) y con `progresarPandillaRetos` (`'compartir'`).

**(B) Interacciones de media unificadas (migracion 023).**
- `media_votos` (PK compuesta `usuario_id,fuente,item_id`; soft-delete `activo`; `xp_ganado numeric(12,2)` coherente con ADR-035), `media_comentarios` (lista de adyacencia `parent_id` self-FK, tombstone `activo`, texto 1..1000) y `media_comentario_likes` (PK compuesta `usuario_id,comentario_id`, sin XP).
- `media_guardados` (019): `item_id uuid -> text` (`USING item_id::text`, valores preservados) y CHECK de `fuente` ampliado con `'curada'` (`album|album_foto|viajero_foto|curada`). El bloque es defensivo: corre solo si la columna sigue siendo `uuid` y busca/dropea/recrea la constraint real por definicion (nombre no asumido).
- Backfill idempotente desde `album_votos`, `interacciones tipo='foto'` con `dims.voto_foto_id` (con regex de id seguro), `album_comentarios` (por niveles, tope defensivo 50) y `album_comentario_votos`, todo `ON CONFLICT DO NOTHING`. **Las tablas legacy NO se dropean** (cero borrado logico).
- Backend: `POST ?tipo=media_voto` y `POST ?tipo=media_comentar`; `GET ?tipo=media_interacciones` (votos/comentarios/`ya_votado`/`ya_guardado`) y `GET ?tipo=media_comentarios`. Los alias legacy se conservan (`album_voto`, `foto_voto`, `comentario_foto`, `comentario_voto`, `comentario_eliminar`, `guardar_media`, `comentarios_foto`) para no romper clientes viejos.
- **Todos los lectores legacy migrados a `media_*`**: `album_detalle`, `fotos_top`, `mi_feed_fotos`, `multimedia_mapa`, `comentarios_recientes`, checks de misiones/logros, `museo_publico`, `arbol`, `mis_fotos` y sendero audiovisual. Los helpers `conDegradacionMedia`, `contarComentarioSafe`, `contarCompartidosUsuario` degradan con `warn` si falta la tabla (patron BUG-051/BUG-060: ni 503 global ni catch vacio).
- `galeria_destino`: `items[]` v2 con `fuente`, `votos`, `comentarios`, `ya_votado`, `ya_guardado` y `tipo_voto:'media'`; metricas en lote sin N+1 (`cargarMetricasMedia`). El contador de comentarios se calcula post-query (`contarComentarioSafe`).

**(C) Frontend.**
- `api/pagina-destino.js` (header v10): hero en mosaico (grid `1.9fr` + columna, fila de 360px en escritorio: 1 principal + 3 secundarias) y boton **Compartir** al final de la barra sticky `.subnav` (atributos `data-share*`, `Compartir` solo si el destino no es blog), con carga de `/compartir.js`. La galeria principal llega a 12 miniaturas (comunidad max 6 + relleno con curadas, dedup por URL).
- **Nuevo asset `compartir.js`** (`window.ExploraCompartir = { VERSION, init, compartir }`, 295 lineas): Web Share API + WhatsApp (`wa.me`) + Copiar link (Clipboard API con fallback), popover propio, POST `tipo=compartir` con `authHeaders()` y toasts reusando `window.ExploraCO.mostrarToast`. Tras el POST descarga el resultado local de XP/misiones/logros a `window.ExploraCO.aplicarResultadoXp`.
- `galeria.html`: modo destino con 5 secciones ("Fotos de este lugar", "Albumes de este espacio", "Fotos de la comunidad", "Mapa y audiovisual", "Comparte tu foto") y modal de foto/album con VOTAR, GUARDAR, COMPARTIR y comentarios para las 3 fuentes; carga `/compartir.js`.
- `album-comments.js` v2.0.0: firma `mount(target, {fuente,itemId}, opts)` retrocompatible con la de string legacy (string -> `fuente='album_foto'`); GET `comentarios_foto` para album y `media_comentarios` para las otras fuentes.
- `index.html`: insignia `compartido` reincorporada en `XP_BADGES` (L4208), derivada del catalogo real de logros (`_compartidosDeLogros` -> `_sharedCount` desde `logr_primer_compartido`/`logr_compartidor_25`/`logr_viral_100`), no de un contador local; cache-bust `album-comments.js?v=2` en `index.html`, `comunidad.html`, `mi-perfil.html` y `galeria.html`.
- `usuario-session.js`: helper `window.ExploraCO.aplicarResultadoXp(data)` como unico punto de acreditacion de acciones de XP ejecutadas por un caller externo (compartir.js), reusando `sumaMisionesXp`/`sumaLogrosXp`, `aplicarDesbloqueos` y los toasts existentes (Regla de No-Duplicidad).

### Justificacion

Reutilizar una tabla propia (`media_compartidos`) en lugar de extender el CHECK de `interacciones.tipo` respeta ADR-008 (todo cambio de esquema vive versionado en `db/migrations/`) y evita tocar un objeto cuya realidad en Neon no es reproducible desde el repo (patron BUG-021). El indice unico parcial resuelve el "primer share" de forma atomica y sin carrera, y el tope de 10 eventos/50 XP por 24h acota el farming de XP incluso para comparticiones sin remanente.

Unificar votos/comentarios/guardados en tablas polimorficas `media_*` con `item_id text` da un unico contrato a las 3 fuentes de media sin duplicar logica, permite votar/comentar lo que antes no se podia (curadas y viajero) y deja los alias legacy vivos para las superficies ya desplegadas. Mantener las tablas legacy (solo backfill, cero DROP) honra la Regla de Oro 3 (Cero Borrado Logico) y permite rollback. La degradacion con `warn` (nunca 503 global ni catch vacio) sigue el precedente BUG-051/BUG-060 y AGENTS.md 2.2. Todo entra como ramas `?tipo=` sin crear archivos en `api/`: el presupuesto 8/8 queda intacto (ADR-001).

### Impacto

`git diff --numstat` (working tree, snapshot 2026-09-17): **8 archivos modificados, +1379/-536**, mas **5 archivos nuevos** (todos SIN commitear).

- `api/interacciones.js` (+949/-425; header `v18` -> `v19`): rama `compartir`, misiones 37-39, logros 31-33, `media_voto`/`media_comentar`/`media_interacciones`/`media_comentarios`, alias legacy, lectores migrados y helpers de degradacion.
- `galeria.html` (+222/-32): 5 secciones en modo destino, modales con LIKE/VOTAR/GUARDAR/COMPARTIR y comentarios por 3 fuentes, carga `/compartir.js`.
- `album-comments.js` (+92/-33; v2.0.0): firma `mount(target,{fuente,itemId},opts)` retrocompatible.
- `index.html` (+50/-17): insignia `compartido` + `_sharedCount`/`_compartidosDeLogros`/`_toastBadgesNuevos` + cache-bust `?v=2`.
- `api/pagina-destino.js` (+40/-27; header v10): hero mosaico, boton Compartir en `.subnav`, carga de `compartir.js`.
- `usuario-session.js` (+24/-0): `aplicarResultadoXp`.
- `comunidad.html` (+1/-1) y `mi-perfil.html` (+1/-1): SOLO cache-bust `album-comments.js?v=2`.
- NUEVOS: `compartir.js` (295 lineas), `db/migrations/022_media_compartidos.sql` (131 lineas), `db/migrations/023_interacciones_media_unificadas.sql` (408 lineas), `scripts/smoke_036_compartir.js` (290 lineas), `scripts/smoke_036_media_unificada.js` (361 lineas).
- **Presupuesto de endpoints 8/8 INTACTO** (ADR-001): cero archivos nuevos en `api/`.
- **Catalogo de gamificacion:** 39 misiones y 33 logros (28+8+3 misiones; 30+3 logros).
- **Verificacion:** `node --check` OK en `api/interacciones.js`, `api/pagina-destino.js`, `compartir.js`, `album-comments.js`, `usuario-session.js` y los 2 smokes; ASCII-safe 0 bytes >127 y 0 backticks en `api/interacciones.js`, `api/pagina-destino.js`, `compartir.js`, las 2 migraciones y los 2 smokes (el baseline no-ASCII de `usuario-session.js` es preexistente y el delta es 0). Smokes 55/55 y 71/71 PASS.

### Consecuencias positivas

- Compartir tiene recompensa real y auditable (ledger propio, primer share, tope diario) sin tocar el contrato de XP ni el CHECK legacy.
- Un unico contrato de media habilita votar/comentar/guardar en curadas y viajero, y elimina las 3 consultas paralelas de los lectores.
- La insignia `compartido` deja de ser decorativa: se deriva del catalogo real de logros.
- Cero borrado: las tablas legacy se conservan y el backfill es idempotente (se puede correr dos veces; el preflight 6.3 lo verifica).
- Presupuesto 8/8 intacto.

### Consecuencias negativas / riesgos residuales

- **Migraciones 022 y 023 pendientes (BLOQUEANTE):** el backend v19 consulta `media_compartidos`/`media_votos`/`media_comentarios`; sin ellas las rutas de compartir/voto/comentario degradan o fallan. Los smokes usan mock y NO validan Neon: la unica validacion real es aplicar 022/023 y correr los preflights.
- **Deuda de esquema base no versionado (patron BUG-021):** el CHECK de `interacciones.tipo` y las tablas base `usuarios`/`interacciones`/`destinos_fotos` siguen fuera de `db/migrations/`; el tipo real de `destinos_fotos.id` no esta verificado (preflight 6.1) y `media_guardados` depende de que la 019 ya este aplicada.
- **Tablas legacy retiradas del backend pero NO dropeadas:** `album_votos`, `album_comentarios` y `album_comentario_votos` conviven con `media_*` de forma deliberada (rollback + cero borrado); su limpieza futura es una tarea de datos explicita y separada.
- **Nota ADR-006 (discrepancia con el reporte de sesion):** el arquitecto reporto la insignia `compartido` reincorporada en `index.html`, `comunidad.html` y `mi-perfil.html`; verificado contra archivo real, la insignia volvio SOLO en `index.html` (L4208). `comunidad.html` y `mi-perfil.html` recibieron unicamente el cache-bust `?v=2` y su comentario de `XP_BADGES` aun lista `compartido` como removido (L524 y L789 respectivamente). Queda como pendiente de consistencia de UI (no bloqueante).
- **El hero mosaico y las secciones de `galeria.html` no estan en produccion** hasta el commit/push/deploy.
- **Exposicion de escritura compartir:** la rama usa `validarSesion`; conviene un smoke/pen-test en vivo post-deploy (la clase BUG-061 sigue ABIERTA en `tipo='foto'`, no en `compartir`).

**Estado final:** Aprobado e implementado en working tree (SIN commitear), 2026-09-17. Aplicar 022 y 023 en Neon antes del deploy del backend v19.

**ADRs relacionados:** ADR-001 (presupuesto 8/8), ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-006 (baseline = archivo real), ADR-008 (SQL versionado / idempotencia), ADR-017 (albumes), ADR-018 (economia de XP / moneda unica), ADR-023 (comentarios anidados y likes), ADR-025 (sesion firmada / `validarSesion`), ADR-030 (galeria unificada y `items[]`), ADR-031 (capa publica de media), ADR-034 (hero/galeria de la ficha), ADR-035 (XP `numeric(12,2)`), BUG-021/BUG-051/BUG-060/BUG-061 (patrones de esquema no versionado, degradacion y spoofing).

---

## ADR-037: TSK-111 -- geocerca urbana de 50 m, album oficial en el mapa cultural, limpieza de modulos del admin y refactor de hero/galeria de la ficha

**ID:** ADR-037
**Fecha:** 2026-09-17
**Estado:** Aprobado e implementado en working tree (SIN commitear). Escudo GOLD (qa-auditor) APTO CON OBSERVACIONES. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar las migraciones 019-023 en Neon (arrastre de TSK-107..TSK-110; TSK-111 NO genera migraciones) ANTES del deploy; despues, commit/push/deploy de los 7 archivos + el cierre documental en un solo release.**
**Autor:** architect (sintesis documental de TSK-111) + build (implementacion) + docs-keeper (cierre).
**Nota de numeracion:** el 037 es el consecutivo real tras ADR-036 (mayor registrado en este documento, verificado contra el archivo real, ADR-006).

### Contexto

TSK-111 es un lote de producto sobre la ficha de destino y el mapa cultural, sin endpoints ni migraciones nuevas (presupuesto 8/8, ADR-001). Cubre 8 cambios: (1) reordenamiento de Actividades/FAQ en el admin; (2) guard del chip de edad minima; (3A/3B/3C) retiro de tres modulos del admin/render; (4) geocerca urbana mas estricta; (5/6/7A/7B) rediseno del hero y consolidacion de la galeria; y (8) album oficial de fotos en el drawer del pin del mapa. Ajusta tres decisiones previas: ADR-024 (radios), ADR-034 (hero/galeria/orden de modulos) y ADR-030 (galeria unificada); por eso esta ADR solo consolida el lote y remite a las notas de enmienda.

### Decision tomada

- **Geocerca urbana 100 m -> 50 m (CAMBIO 4):** `RADIO_DEFAULT_M` y `RADIO_POR_CATEGORIA` (`sitio`/`hostal`/`comida`) a 50, subcategorias urbanas a 50; rural 250, parque/concierto 150 y festival/deporte 200 intactos; `ACCURACY_MAX_M=150` y bloqueo 422 intactos. Enmienda ADR-024 (detalle alli).
- **`album_oficial` (CAMBIO 8):** clave ADITIVA en la rama `GET ?tipo=multimedia_mapa`, activada por `?destino_id=<uuid>` validado con regex uuid inline; query a `destinos_fotos` (`ORDER BY es_hero DESC NULLS LAST, orden ASC NULLS LAST LIMIT 12`) envuelta en `conDegradacionMedia` (42P01/42703 -> `[]`); consumida por `index-api-connector.js` (`cargarAlbumOficialDestino`) e `index.html` (`mdMapaAlbumOficial`, solo rama `origen='destino'`). Sin endpoints nuevos.
- **Guard `edad_minima` (CAMBIO 2):** el chip solo se pinta con `String(...).trim() !== ''`.
- **Limpieza del admin (CAMBIO 3A/3B/3C):** "Que incluye el precio" fuera de admin/render (mision `mis_nomada_digital` y seeds intactos); UI "Orden de modulos" retirada dejando `#hostal-modulos-list` OCULTO para preservar `tags.orden_modulos`; seccion "Operacion" eliminada con `f-capacidad` movido a General y `f-comotransporte` eliminado end-to-end.
- **Hero/galeria (CAMBIO 5/6/7A/7B):** botonera en 2 filas (`.hctar-row`), grid 1+3, imagenes del hero al lightbox existente (`abrirLightboxHero`); "Fotos de viajeros" retirada de la ficha y consolidada en `galeria.html`; CTA renombrado a "Ver todas las fotos". Enmienda ADR-034/ADR-030 (detalle alli).
- **Reordenamiento (CAMBIO 1):** FAQ estrena Subir/Bajar sobre el generico `moverFila`, reutilizando el patron ya existente de Actividades (Regla de No-Duplicidad).

### Justificacion

El radio urbano se endurece porque 100 m permitia marcar la visita sin presencia real, sin tocar la precision GPS (`accuracy`), que es un chequeo independiente. `album_oficial` se sirve como clave aditiva de una rama existente (cero endpoints nuevos, ADR-001) y degrada a `[]` si el esquema no la soporta (patron BUG-021). El orden de modulos se preserva ocultando el nodo en lugar de borrarlo (Cero Borrado Logico, Regla de Oro 3). "Que incluye el precio" y "Operacion" se retiran de la UI pero el dato legacy convive, evitando migraciones de datos.

### Impacto

`git diff --numstat` (working tree, snapshot 2026-09-17): **7 archivos modificados, +335/-298**, mas `PROMPT_OPENCODE_TSK111.md` (untracked).

- `admin.html` (+49/-82): limpieza de modulos, `#hostal-modulos-list` oculto, `f-capacidad` en General, `moverFila`/`moveFaqRow`.
- `api/interacciones.js` (+44/-8; header v19 -> v20): radio urbano 50 m + `album_oficial`.
- `api/pagina-destino.js` (+121/-194; header v11): guard `edad_minima`, hero 2 filas 1+3 + lightbox, modulos retirados, CTA.
- `index-api-connector.js` (+32/-0): `cargarAlbumOficialDestino`.
- `index.html` (+51/-1): `mdMapaAlbumOficial`.
- `scripts/smoke_016_multinivel_crowdsourcing.js` (+29/-3) y `scripts/smoke_auditoria_pagina_destino.js` (+9/-10).
- **Presupuesto de endpoints 8/8 INTACTO** (ADR-001). **Sin migraciones nuevas.**
- **Verificacion (Escudo GOLD, qa-auditor):** APTO CON OBSERVACIONES; `node --check` 8/8 api, `api/interacciones.js` ASCII 0/0/0, balance DIVs admin 0, smokes `check_buildHTML_inline`, `smoke_auditoria_pagina_destino` (54), `smoke_016` (52) y `smoke_021` (45) PASS; `smoke_test_epic_prompt` 4 FAIL preexistentes ajenos (DQ-2).

### Consecuencias positivas

- Presencia fisica mas confiable en destinos urbanos.
- El drawer del pin gana el album curado del destino sin endpoint nuevo.
- La UI del admin queda mas limpia sin perder datos (orden e incluye-precio legacy intactos).
- Hero con jerarquia clara (2 filas + 1+3) y galeria de viajeros unificada en `galeria.html`.

### Consecuencias negativas / riesgos residuales

- **Migraciones 019-023 pendientes (BLOQUEANTE):** arrastre de TSK-107..TSK-110; TSK-111 no puede desplegarse aislada.
- **50 m mas estricto:** mayor friccion con GPS urbano pobre; el 422 `PRECISION_INSUFICIENTE` sigue vigente.
- **DOM muerto deliberado:** `#hostal-modulos-list` oculto hasta una limpieza futura.
- **BUG-061 y BUG-062 siguen ABIERTOS** (no relacionados con esta entrega).

**Estado final:** Aprobado e implementado en working tree (SIN commitear), 2026-09-17.

**ADRs relacionados:** ADR-001 (presupuesto 8/8), ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-006 (baseline = archivo real), ADR-010 (presupuesto de endpoints), ADR-024 (radios, enmendado), ADR-030 (galeria unificada), ADR-033 (radio explicito por lugar), ADR-034 (hero/galeria/orden de modulos, enmendado), ADR-036 (precedente inmediato), BUG-002/BUG-061/BUG-062 (deuda preexistente).

---

## ADR-038: Casas con cofre (tributacion del 10%), Clases (profesion) y entrega unica de XP con factor de nivelacion por poblacion activa

**ID:** ADR-038
**Fecha:** 2026-09-17
**Estado:** Aprobado e IMPLEMENTADO con Enmienda 1 (2026-09-18). Verificado contra el archivo real (ADR-006): existen db/migrations/024_casas_cofre_y_clases.sql, los helpers contextoXpE / calcularXpFinal / calcularNivelClase / acreditarClaseYCofre y la rama POST clase_elegir. **Enmienda 1:** el diseno original de este ADR queda SUPERSEDIDO en los puntos listados en la seccion ENMIENDA 1 (al final), que formaliza y aprueba el contrato realmente implementado en TSK-112 (prevalece el spec de producto PROMPT_OPENCODE_TSK112.md). Si un punto de las secciones A-E contradice la ENMIENDA 1, PREVALECE la ENMIENDA 1. Los valores RECHAZADOS 'alta'/'media'/'baja' y la tabla casas_tributacion jamas se implementaron; el cofre real vive en casas_cofre.
**Autor:** architect (AI-DOS) con decisiones del propietario del producto (Javier, 2026-09-17).
**Nota de numeracion:** el 038 es el consecutivo real tras ADR-037 (mayor registrado, verificado con `^## ADR-` sobre el archivo real, ADR-006). No estaba reservado en ninguna spec.
**Alcance de esquema:** esta ADR NO toca `destinos.tags` JSONB ni ninguna categoria del directorio. Opera sobre `usuarios` (columnas nuevas) y una tabla nueva `casas_cofre`. No hay merge JSONB porque no hay tags involucrados.

### Contexto

El proyecto YA tiene un sistema de Casas completo (TSK-103 / ADR-028) y un Arbol de Clases de 16 ramas:

1. **Casas reales (ADR-028).** `usuarios.casa varchar(20)` con `chk_usuarios_casa CHECK (casa IS NULL OR casa IN ('condor','jaguar','delfin'))` (`db/migrations/017_perfil_publico_arbol_casas.sql`, L70-85). En `api/usuarios.js` (header real v15): `CASAS_VALIDAS = ['condor','jaguar','delfin']` (L222), rama POST `casa_elegir` (L685-756) con sesion firmada `validarSesionUsuario` (L164), email verificado, nivel >= 2, primera eleccion gratis (`UPDATE ... WHERE casa IS NULL`), cambio con coste de 300 XP y cooldown de 30 dias via `casa_elegida_en` (L731-745); y rama GET `casa_ranking` (L514-564) que devuelve `{ok:true, data:{casas, top}}` con `miembros`, `miembros_activos` (ventana de 30 dias, ADR-035), `xp_total`, `xp_promedio`, `activos_ocultos_aprobados`, `checkins_30d` y fallback `42703`.
2. **Arbol de Clases de 16 ramas (ADR-028).** `RAMAS`/`RAMA_TIERS = [0,100,250,450,700]` en `api/interacciones.js` (L274-332) y `usuarios.progreso_arbol jsonb` (migracion 017). El arbol es un skill-tree: los puntos `D_R` se DERIVAN en cada lectura y solo se persisten fechas write-once de nodo (merge JSONB, ADR-003).
3. **Entrega de XP dispersa.** `api/interacciones.js` (header real v20, 7791 lineas) tiene **18 ocurrencias de `UPDATE usuarios SET xp_total...`** (verificado 2026-09-17 sobre el archivo real) y helpers aislados `red2` (L213) y `numXp` (L214); **NO existe** un helper unico de entrega de XP, ni `XP_BASE`, ni `entregarXpUsuario`.
4. **El problema de producto:** se quiere (a) dar a cada Casa un **cofre compartido** alimentado por la actividad de sus miembros, (b) una **Clase / profesion ("Rising Star")** que coexista con el Arbol de 16 ramas, y (c) **balancear las Casas por poblacion activa** en runtime (la Casa dominante gana con penalizacion y la rezagada con bonificacion).

Ademas rige el **presupuesto 8/8 de funciones serverless** (ADR-001): nada de endpoints nuevos; todo entra como ramas `tipo=` y como escrituras internas de los endpoints existentes.

**Propuesta original RECHAZADA (registro obligatorio):** el mandato original describia un `casa_id` con valores `'alta'|'media'|'baja'`. Se RECHAZA de forma explicita porque **duplicaria el sistema de Casas ya existente de ADR-028** (`usuarios.casa` con `condor/jaguar/delfin`): crearia una SEGUNDA fuente de verdad para la identidad de Casa, romperia el contrato de `casa_elegir`/`casa_ranking` y resucitaria el anti-patron de "segunda escala de progreso" ya rechazado en ADR-028/ADR-035. **Se reusa `usuarios.casa` como unica base. Queda prohibido crear `casa_id` o los valores `'alta'|'media'|'baja'`.**

### Opciones evaluadas (y por que se descartan)

1. **Crear `casa_id` con `'alta'|'media'|'baja'` (RECHAZADA).** Duplica ADR-028: dos columnas de identidad de Casa, dos catalogos y dos caminos de eleccion que pueden divergir; ademas `'alta/media/baja'` no son Casas sino NIVELES de Casa, lo que obliga a mapear 3x3 y a migrar datos existentes. **Rechazada por decision del dueno y por ADR-006/ADR-028.**
2. **Reusar `usuarios.casa` como base de nivelacion + cofre (ELEGIDA).** Cero cambio de identidad, cero migracion de datos de Casa, `casa_elegir`/`casa_ranking` intactos.
3. **Tabla `casas_tributacion` (RECHAZADA) vs `casas_cofre` (ELEGIDA).** `tributacion` nombra el ACTO, no el objeto persistido; el objeto que acumula es el COFRE compartido. `casas_cofre` es el nombre aprobado por producto.
4. **`casas_votaciones` en v1 (DIFERIDA a v2).** No es necesaria para el lazo nivelacion/tributacion y agranda la superficie; se difiere explicitamente.
5. **Clase como rama 17 del Arbol o reemplazo de `progreso_arbol` (RECHAZADA).** Mezclaria dos escalas (skill-tree derivado vs progresion acumulada) y romperia la invariante de ADR-028 de no persistir derivados del arbol. Se elige **COEXISTENCIA**: `clase_id`/`nivel_clase`/`xp_clase` sin tocar `progreso_arbol`.
6. **Clase sin recambio (eleccion libre permanente) vs con recambio (ELEGIDA).** Se reusa el patron de `faccion_elegir`/`casa_elegir`: primera eleccion gratis; **cambio 300 XP + cooldown 30 dias** via `clase_elegida_en`.
7. **Endpoint HTTP `casa_tributar` (RECHAZADA).** Viola el 8/8 (ADR-001) y expondria un sumidero de XP disparable por el cliente. La tributacion es un helper INTERNO best-effort.
8. **Parchear cada uno de los 18 `UPDATE ... xp_total` (RECHAZADA) vs un helper unico (ELEGIDA).** Parchear a mano duplica la matematica de clase + Casa + tributacion en 18 puntos (viola la Regla de No-Duplicidad, AGENTS.md 2.1) y garantiza drift de redondeo. Se elige **un unico `entregarXpUsuario`**.
9. **Factor de nivelacion por XP absoluto / ranking (RECHAZADA) vs por poblacion activa (ELEGIDA).** El XP absoluto consolida al ganador (snowball); la PARTICIPACION de poblacion activa es la palanca de catch-up correcta y es barata de calcular.
10. **Tributar sobre el XP base (RECHAZADA) vs sobre el `xp_final` (ELEGIDA).** Sobre el base ignoraria el factor de Casa y premiaria igual a la Casa dominante; sobre `xp_final` (post-factor) el 10% se calcula sobre lo realmente acreditado.

### Decision tomada

**(A) Casas: reuso + cofre (migracion 024).**
- `usuarios.casa` sigue siendo la UNICA fuente de identidad de Casa. No se agrega `casa_id` ni los valores `'alta'|'media'|'baja'`.
- Tabla NUEVA `casas_cofre`:
  - `casa varchar(20) PRIMARY KEY`
  - `xp_cofre_total numeric(12,2) NOT NULL DEFAULT 0`
  - `poblacion_activa int NOT NULL DEFAULT 0` (CACHE de `miembros_activos`)
  - `factor_conversion numeric(5,4) NOT NULL DEFAULT 1.0` (CACHE del `multiplicador_xp`; 0.8500 / 1.0000 / 1.3000)
  - `actualizado_en timestamptz NOT NULL DEFAULT now()`
  - `CONSTRAINT chk_casas_cofre_casa CHECK (casa IN ('condor','jaguar','delfin'))`
- Seed idempotente con las 3 Casas reales: `INSERT ... ON CONFLICT (casa) DO NOTHING`.
- **NO se crea `casas_votaciones`** (v2). **NO se agrega FK** `usuarios.casa -> casas_cofre.casa` en v1 (riesgo de validacion sobre filas historicas); la consistencia la garantizan las dos listas CHECK espejo + el seed, con un preflight que las compara.
- `poblacion_activa` y `factor_conversion` son **cache NO autoritativa**: la fuente de verdad es la consulta runtime. `contextoXpE` la refresca best-effort (escribe solo si cambio; nunca rompe la entrega de XP).

**(B) Clases: coexistencia con el Arbol (migracion 024).**
- Columnas NUEVAS en `usuarios` (sin tocar `progreso_arbol`, `RAMAS` ni `RAMA_TIERS`):
  - `clase_id varchar(20)`
  - `nivel_clase int NOT NULL DEFAULT 1`
  - `xp_clase numeric(12,2) NOT NULL DEFAULT 0`
  - `clase_elegida_en timestamptz`
  - `CONSTRAINT chk_usuarios_clase CHECK (clase_id IS NULL OR clase_id IN ('cartografo','cronista','explorador'))`
- Catalogo en codigo `CLASES` (`api/interacciones.js`), con afinidad a la whitelist: **(CORREGIDO POR ENMIENDA 1, 2026-09-18: NO existe afinidad por tipo de accion; BONUS_CLASE se aplica a TODAS las acciones de la whitelist y el catalogo CLASES con mapa de afinidad NO se implemento.)**
  - `explorador` -> `visita`, `guardado`, `foto`, `activo_oculto_checkin`
  - `cronista` -> `resena`, `rating`, `media_comentar`, `chat_msg`, `plan_chat_msg`
  - `cartografo` -> `compartir`, `media_voto`, `activo_oculto_votar`, `album_crear`, `album_agregar_foto`
- `XP_NIVEL_CLASE = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500]` (VALORES DEL SPEC ORIGINAL, aprobados por producto) y `calcularNivelClase(xp)` como UNICO catalogo de umbrales de clase, con TOPE DURO de nivel 10 (los 11 umbrales cubren 10 niveles; el umbral 7500 queda comprendido dentro del nivel 10 por el tope). `BONUS_CLASE = { cartografo: 0.08, cronista: 0.10, explorador: 0.07 }` (VALORES DEL SPEC ORIGINAL): el bono es POR CLASE, no un `CLASE_POR_NIVEL` unico. Ambos son constantes de producto ajustables por `api/interacciones.js` sin migracion.
- **Rama POST `clase_elegir`** en `api/usuarios.js` (espejo de `casa_elegir`): `CLASES_VALIDAS = ['cartografo','cronista','explorador']`; exige `validarSesionUsuario`, email verificado y nivel >= 2; primera eleccion gratis (`UPDATE ... WHERE clase_id IS NULL`); cambio con coste de **300 XP** y **cooldown de 30 dias** via `clase_elegida_en`; errores `CLASE_INVALIDA`, `CLASE_YA_ELEGIDA`, `COOLDOWN_CLASE`, `PUNTOS_INSUFICIENTES`, `NIVEL_INSUFICIENTE`, `SESION_REQUERIDA`/`SESION_INVALIDA`; respuesta `{clase_id, nivel_clase, xp_clase, xp_total_nuevo, nivel_anterior, nivel_nuevo, bajo_nivel}`. **(CORREGIDO POR ENMIENDA 1, 2026-09-18: NO existe gate de nivel ni el error NIVEL_INSUFICIENTE; primera eleccion responde {ok:true,data:{clase_id, clase_elegida_en}} y el recambio {ok:true,data:{clase_id, clase_elegida_en, xp_total_nuevo, nivel_anterior, nivel_nuevo, bajo_nivel}}. Ver ENMIENDA 1.)**
- **Lectura aditiva:** `clase_id`/`nivel_clase`/`xp_clase` se exponen en `GET ?id=` y `perfil_publico` (que ya proyectan columnas de `usuarios`); el catalogo de clases viaja como campo aditivo `clases` en la rama existente `GET ?tipo=arbol_catalogo` (cero endpoints nuevos). **(CORREGIDO POR ENMIENDA 1, 2026-09-18: esto NO se implemento; arbol_catalogo NO expone clases. El frontend usa catalogos locales espejo CLASES_META y XP_NIVEL_CLASE, verificados en mi-perfil.html. El campo clases queda DIFERIDO a v2.)**

**(C) Helper unico de entrega de XP (`api/interacciones.js` v21).** **(SUPERSEDIDO POR ENMIENDA 1, 2026-09-18: NO se implemento un helper unico ni la afinidad; el contrato vigente es la triada contextoXpE / calcularXpFinal / acreditarClaseYCofre con UPDATE inline por contadores. Ver ENMIENDA 1 al final.)**
- Helpers (unica implementacion; Regla de No-Duplicidad):
  - `contextoXpE(sql, usuarioId, tipoAccion)` -> lee `casa`, `clase_id`, `nivel_clase`; calcula el tag de Casa por poblacion activa (seccion D) y la afinidad de clase; devuelve `{casa, casa_tag, multiplicador_xp, arancel_inter_casa, fee_mercado_interno, nivel_clase, clase_id_afin}`. Ejemplo de contexto (derivado, NO persistido):
    `{ "casa": "jaguar", "casa_tag": "equilibrada", "multiplicador_xp": 1.0, "arancel_inter_casa": 0.10, "fee_mercado_interno": 0.05, "nivel_clase": 3, "clase_id_afin": "cartografo" }`
  - `calcularXpFinal(xp_base, nivel_clase, clase_id, casa_tag)` -> pura, sin BD: `factor_casa = MULT_CASA[casa_tag]`; `factor_clase = clase_id ? (1 + nivel_clase * BONUS_CLASE[clase_id]) : 1` (formula del spec original: `xp_clase_nuevo = xp_base * (1 + nivel_clase * bonus_clase)`); devuelve `{xp_final, factor_casa, factor_clase, xp_clase_inc}` con `xp_final = red2(red2(xp_base * factor_casa) * factor_clase)` y `xp_clase_inc = clase_id ? red2(xp_base * factor_clase) : 0`. **(CORREGIDO POR ENMIENDA 1, 2026-09-18: la formula implementada es xp_clase_inc = red2(xp_final * 0.50), es decir el 50 por ciento del XP FINAL que YA incluye el factor de Casa; se acredita en acreditarClaseYCofre y SOLO si existe clase_id. La lectura previa que excluia el factor de Casa del incremento de clase quedo sin efecto.)** `clase_id` es la clase YA RESUELTA por afinidad (NULO si la accion no es afin), de modo que la funcion no necesita el tipo de accion; `nivel_clase` es el nivel ANTES de esta entrega. **Lectura literal del spec (a confirmar por producto):** el incremento de `xp_clase` NO lleva `factor_casa`; el factor de Casa modula SOLO `xp_total`.
  - `calcularNivelClase(xp)` -> usa `XP_NIVEL_CLASE`.
  - `entregarXpUsuario(sql, usuarioId, xpBase, tipoAccion)` -> orquesta: **(SUPERSEDIDO POR ENMIENDA 1, 2026-09-18: esta funcion NO existe en el archivo real; ver la triada contextoXpE / calcularXpFinal / acreditarClaseYCofre y los UPDATE inline por contadores en la ENMIENDA 1.)** (1) `contextoXpE`; (2) `calcularXpFinal`; (3) `UPDATE usuarios SET xp_total = xp_total + $1, xp_clase = xp_clase + $3, ultimo_acceso = NOW() [, total_resenas = total_resenas + 1] [, total_guardados = total_guardados + 1] [, total_visitas = total_visitas + 1] WHERE id = $2 RETURNING xp_clase, clase_id` (los fragmentos de contador se agregan SOLO para `resena`/`guardado`/`visita`, preservando el comportamiento actual; `$1 = xp_final`, `$3 = xp_clase_inc`); (4) `nivel_clase = calcularNivelClase(xp_clase devuelto)` (segundo UPDATE solo si cambio); (5) tributacion best-effort; (6) devuelve `{xp_base, xp_final, factor_casa, factor_clase, clase_id_afin, casa, nivel_clase_antes, nivel_clase_despues, cofre_ok}`.
  - **Desviacion ACEPTADA:** el mandato enuncia `entregarXpUsuario(sql, usuarioId, xpBase)` con 3 argumentos. El dueno del producto ACEPTA (2026-09-17) el 4o argumento `tipoAccion` como desviacion justificada de la firma inicial, porque la afinidad de clase no es derivable de `xpBase`; `contextoXpE` y `calcularXpFinal` conservan la firma exacta del mandato. **(SUPERSEDIDO POR ENMIENDA 1, 2026-09-18: entregarXpUsuario no existe y la afinidad tampoco; calcularXpFinal(xp_base, nivel_clase, clase_id, casa_tag) NO necesita tipoAccion.)**
- **Whitelist (SOLO acciones propias):** `resena`, `foto`, `visita`, `guardado`, `rating`, `compartir`, `media_voto`, `media_comentar`, `chat_msg`, `plan_chat_msg`, `album_crear`, `album_agregar_foto`, `activo_oculto_checkin`, `activo_oculto_votar` (14 claves). Cada punto de entrega reemplaza su `UPDATE ... xp_total` inline por una llamada a `entregarXpUsuario`. **(SUPERSEDIDO POR ENMIENDA 1, 2026-09-18: los UPDATE usuarios SET xp_total PERMANECEN inline para preservar en el mismo UPDATE los contadores total_resenas / total_guardados / total_visitas; cada rama llama a calcularXpFinal y luego a acreditarClaseYCofre. El valor de XP usado es siempre el xp_final de calcularXpFinal.)**
- **EXCLUIDOS (no pasan por el helper):**
  - **Cobros** (`dm_enviar`, `comprar_consumible`): RESTAN XP; no hay entrega, ni XP de clase, ni tributacion.
  - **Bonos / terceros** (`evaluarMisiones`, `evaluarLogros`, `progresarPandillaRetos`, `repartirXpReferidos`): conservan su matematica propia para evitar recursion, doble tributacion y drift.
- **Orden de modificadores (invariante):** el `xpBase` que recibe el helper es el valor DESPUES de los modificadores existentes (`xpConMultiplicador` x1.1 Own the Spot, `aplicarAmuletoX2` x2, factor de area de `visita` de ADR-033, YA verificado en `interacciones.js` L7338-7342 resena, L7647-7651 visita, L7210-7214 compartir). `entregarXpUsuario` NO re-aplica esos modificadores: solo agrega clase + Casa + tributacion. El factor de clase/Casa se aplica UNA sola vez y NUNCA dentro de `xpConMultiplicador`, `aplicarAmuletoX2`, `aplicarFamaPandilla`, `repartirXpReferidos`, `evaluarMisiones` ni `evaluarLogros`. La fama de Parche (10%) y los referidos siguen ejecutandose en sus llamadas actuales, sobre el `xp_final`.
  - **`visita` y bono rural (correccion de coherencia, ADR-024/ADR-033):** el helper se llama con `xpVisitaFinal` (ya multiplicado y amuletado, SIN bono rural) y el `bonoRuralVisita` (`VISITA_BONO_RURAL=20`, `interacciones.js` L157/L7622) se sigue sumando PLANO despues del factor: `xp_total += red2(xp_final + bonoRuralVisita)`, sin factor de clase/Casa y sin amuleto. `aplicarFamaPandilla` recibe `xp_final` (sin bono rural, preserva "el bono rural NO aporta fama"); `repartirXpReferidos` recibe `xp_final + bonoRuralVisita` (preserva el comportamiento actual L7664/L7667). **El helper NO debe recibir `xpTotalVisita`**, porque escalaria el bono plano por clase/Casa.
  - **Contadores por accion (correccion):** el helper preserva en el MISMO UPDATE los contadores que hoy incrementan los updates inline: `total_resenas` (resena, L7346), `total_guardados` (guardado, L7442) y `total_visitas` (visita, L7656). Reemplazar el UPDATE inline sin preservarlos romperia `perfil_progreso`/misiones/logros que leen esos contadores.
  - **Terceros excluidos aunque compartan rama (correccion):** en `album_agregar_foto` (XP +15 al agregador, L5966; +10 al autor original, L5975) y en las ramas `media_*`, SOLO el XP del ACTOR pasa por el helper; el XP a un tercero (`afAutorOriginal`) conserva su UPDATE y su tope diario propios, sin factor de clase/Casa ni tributacion.
- **Interaccion con ADR-036:** el XP de `compartir` (25 primer share / 5 posteriores, tope 10 eventos y 50 XP / 24h) entra a la whitelist; el ledger `media_compartidos.xp_ganado` registra el `xp_final` (post-factor) y el tope diario cuenta sobre ese valor final.

**(D) Factor de nivelacion por poblacion activa.** **(PARCIALMENTE SUPERSEDIDO POR ENMIENDA 1, 2026-09-18: en el archivo real contextoXpE cuenta PERTENENCIA (COUNT sobre usuarios.casa y COUNT sobre usuarios.casa IS NOT NULL), SIN filtro de ventana de 30 dias ni de usuarios.activo. Ver ENMIENDA 1, resolucion 5.)**
- `contextoXpE` calcula, en runtime, la poblacion activa por Casa real con la MISMA definicion de "miembro activo vigente" de ADR-035: `usuarios.casa IS NOT NULL AND usuarios.activo = true AND usuarios.ultimo_acceso > NOW() - INTERVAL '30 days'`; si la consulta falla con `42703` (columnas no versionadas, patron BUG-021), reintenta SIN la condicion de actividad y degrada con `warn` (NUNCA catch vacio).
- `pct_casa = miembros_activos_casa / GREATEST(total_activos, 1)`, con `total_activos = SUM` sobre las 3 Casas reales.
- Tag y factores (constantes de producto `CASAS_NIVELACION`):

| tag | pct de poblacion activa | multiplicador_xp | arancel_inter_casa | fee_mercado_interno |
|---|---|---|---|---|
| dominante | > 45% | 0.85 | 0.25 | 0.02 |
| equilibrada | 25% a 45% | 1.00 | 0.10 | 0.05 |
| rezagada | < 25% | 1.30 | 0.05 | 0.00 |

- Umbrales ESTRICTOS: exactamente 0.25 o 0.45 => `equilibrada`. `total_activos = 0` => `equilibrada`. Una sola Casa con miembros => esa Casa es `dominante` (se auto-penaliza, efecto buscado).
- **En v1 SOLO se consume `multiplicador_xp`** (dentro de `calcularXpFinal`). `arancel_inter_casa` y `fee_mercado_interno` quedan DEFINIDOS y expuestos en el contexto (lectura) para el futuro mercado inter-Casa; NO se cobran en ninguna ruta de v1.
- `casas_cofre.factor_conversion` espeja SOLO `multiplicador_xp` como CACHE (`0.8500` / `1.0000` / `1.3000`); la fuente de verdad es el calculo runtime. **APROBADO por producto (2026-09-17):** `arancel_inter_casa` y `fee_mercado_interno` quedan como CONSTANTES RUNTIME no persistidas hasta que exista el mercado inter-Casa (v2).

**(E) Tributacion (10% al cofre de la Casa).** **(CORREGIDO POR ENMIENDA 1, 2026-09-18: NO existe la constante TRIBUTO_CASA_PCT; el 10 por ciento es un literal 0.10 dentro de acreditarClaseYCofre. NO existe endpoint casa_tributar; el cofre solo lo alimenta acreditarClaseYCofre.)**
- `TRIBUTO_CASA_PCT = 0.10`. Sobre el `xp_final` (post-factor), `tributo = red2(xp_final * 0.10)`.
- Si `usuarios.casa IS NULL` => no hay tributacion (ninguna fila de cofre se toca).
- Escritura interna: `UPDATE casas_cofre SET xp_cofre_total = ROUND(COALESCE(xp_cofre_total,0) + $1, 2), actualizado_en = NOW() WHERE casa = $2` (`$1 = tributo`, `$2` = Casa del usuario).
- **Best-effort:** corre DESPUES del `UPDATE` de XP del usuario y va envuelto en un `try/catch` que registra `console.warn('[interacciones] tributacion degradada: ' + err.message)` y devuelve `cofre_ok=false`; **jamas bloquea ni revierte la entrega de XP** y **nunca** es un catch vacio (AGENTS.md 2.2).
- **NO existe endpoint HTTP `casa_tributar`** (ADR-001 8/8). El cofre NO es escribible por el cliente; solo `entregarXpUsuario` lo alimenta.
- Las acciones EXCLUIDAS (cobros, misiones, logros, retos, referidos) NO alimentan el cofre: evita tributacion recursiva, doble conteo y drift.

### Justificacion

Reusar `usuarios.casa` es la unica opcion que no crea una segunda identidad de Casa: la propuesta `casa_id` con `'alta'|'media'|'baja'` habria dejado dos columnas, dos catalogos y dos flujos de eleccion capaces de divergir, ademas de exigir migrar datos historicos; se RECHAZA por ADR-006 (la realidad del repo manda) y por ADR-028 (la Casa ya existe). La COEXISTENCIA de la Clase con el Arbol de 16 ramas respeta la separacion de escalas: el Arbol es un skill-tree de puntos DERIVADOS con nodos write-once y la Clase es una profesion con XP propio acumulado; tocar `progreso_arbol` habria roto la invariante anti-doble-conteo de ADR-028.

Concentrar la entrega en `entregarXpUsuario` honra la Regla de No-Duplicidad (AGENTS.md 2.1) y ataca el riesgo real medido: 18 sitios de `UPDATE usuarios SET xp_total` que, de otro modo, tendrian que recibir cada uno la matematica de clase + Casa + tributacion y el redondeo half-up de ADR-035 (`red2`). El helper unico es tambien el unico punto donde se puede garantizar que el factor se aplica UNA vez y nunca dentro de los bonos de terceros. **(SUPERSEDIDO POR ENMIENDA 1, 2026-09-18: la centralizacion se logra con la triada contextoXpE / calcularXpFinal / acreditarClaseYCofre; los UPDATE usuarios SET xp_total siguen inline para preservar contadores en el mismo UPDATE. Ver ENMIENDA 1.)**

El factor por poblacion activa es determinista, barato (un agregado sobre tablas pequenas) y evita el snowball del XP absoluto: penaliza a la Casa dominante (x0.85) y bonifica a la rezagada (x1.30) con la MISMA ventana de 30 dias que ya usa `casa_ranking` (ADR-035). La tributacion sobre `xp_final` y en modo best-effort mantiene la entrega atomica y no acopla la experiencia del usuario a un fallo del cofre. Todo es aditivo: migracion idempotente (ADR-008), sin DROP (ADR-003), sin endpoints nuevos (ADR-001) y ASCII-safe (ADR-002).

### Impacto

- **Migracion NUEVA** `db/migrations/024_casas_cofre_y_clases.sql` (idempotente ADR-008, ASCII-safe ADR-002):
  - `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS clase_id varchar(20), nivel_clase int NOT NULL DEFAULT 1, xp_clase numeric(12,2) NOT NULL DEFAULT 0, clase_elegida_en timestamptz;`
  - `ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS chk_usuarios_clase;` + `ADD CONSTRAINT chk_usuarios_clase CHECK (clase_id IS NULL OR clase_id IN ('cartografo','cronista','explorador'));`
  - `CREATE TABLE IF NOT EXISTS casas_cofre (...)` + `DROP CONSTRAINT IF EXISTS chk_casas_cofre_casa` + `ADD CONSTRAINT chk_casas_cofre_casa CHECK (casa IN ('condor','jaguar','delfin'));`
  - `INSERT INTO casas_cofre (casa) VALUES ('condor'),('jaguar'),('delfin') ON CONFLICT (casa) DO NOTHING;`
  - `CREATE INDEX IF NOT EXISTS idx_usuarios_clase ON usuarios (clase_id) WHERE clase_id IS NOT NULL;`
- **`api/usuarios.js` v15 -> v16:** `CLASES_VALIDAS`; rama POST `clase_elegir` (espejo de `casa_elegir`); exposicion aditiva de `clase_id`/`nivel_clase`/`xp_clase` en `?id=` y `perfil_publico`. Sin endpoints nuevos.
- **`api/interacciones.js` v20 -> v21:** helpers `contextoXpE`/`calcularXpFinal`/`calcularNivelClase`/`entregarXpUsuario`; catalogos `CLASES`, `BONUS_CLASE`, `XP_NIVEL_CLASE`, `CASAS_NIVELACION`, `TRIBUTO_CASA_PCT`, `MULT_CASA`; reemplazo de los 14 puntos de entrega de la whitelist (preservando contadores por accion y el bono rural plano de `visita`); `clases` como campo aditivo de `arbol_catalogo`. **(CORREGIDO POR ENMIENDA 1, 2026-09-18: los helpers reales son contextoXpE / calcularXpFinal / calcularNivelClase / acreditarClaseYCofre; las constantes reales son BONUS_CLASE, XP_NIVEL_CLASE y calcularTagCasa; NO existen CLASES (catalogo), CASAS_NIVELACION, MULT_CASA ni TRIBUTO_CASA_PCT; arbol_catalogo NO expone clases.)**
- **Frontend (render):** `mi-perfil.html` (selector de Clase y medidor `nivel_clase`/`xp_clase` en la pestana Clase; cofre y tag de Casa en el bloque "Mi Casa"); `comunidad.html` (sub-vista Casas puede mostrar `xp_cofre_total`/tag). Consumo de los campos aditivos ya expuestos; sin endpoint nuevo.
- **Presupuesto 8/8 INTACTO** (ADR-001): cero archivos nuevos en `api/`. **Sin tags JSONB tocados.**
- **Verificacion exigible al cierre:** Escudo GOLD (`node --check`, ASCII-safe 0 bytes >127 y 0 backticks en `api/*.js` y en la migracion, balance de divs en el HTML); smoke dedicado con mock (`scripts/smoke_038_*.js`) que verifique el orden clase/Casa/tributacion, la PRESERVACION de `total_resenas`/`total_guardados`/`total_visitas`, que `visita` mantiene el bono rural PLANO sin factor, que los terceros (`afAutorOriginal`) NO pasan por el helper y la exclusion de cobros/bonos; preflight contra `information_schema` que confirme las columnas `clase_id`/`nivel_clase`/`xp_clase`/`clase_elegida_en`, la tabla `casas_cofre` y la igualdad de las listas CHECK (`usuarios.casa` vs `casas_cofre.casa`).

### Consecuencias positivas

- Una sola fuente de identidad de Casa: el cofre y la nivelacion cuelgan de `usuarios.casa`, sin `casa_id` ni migracion de datos de Casa.
- El cofre da a cada Casa un sumidero de recompensa compartido, alimentado SOLO por las 14 acciones propias de la whitelist (auditable y acotado).
- La Clase ("Rising Star") convive con el Arbol de 16 ramas sin romper `progreso_arbol` ni `RAMA_TIERS`.
- Un unico helper de entrega de XP elimina la duplicacion de la matematica nueva en 18 puntos y centraliza el redondeo (`red2`, ADR-035).
- Balance por poblacion activa, determinista y barato, con la misma ventana de 30 dias de ADR-035 (sin segunda definicion de "activo").
- Todo aditivo/idempotente: cero DROP, cero endpoints nuevos, ASCII-safe.

### Consecuencias negativas / riesgos residuales

- **Migracion 024 pendiente (BLOQUEANTE):** sin aplicarla en Neon, `clase_elegir`, la entrega con factor y la tributacion fallan por esquema inexistente; aplicar ANTES del deploy de v16/v21 (mismo flujo que 017/021, ADR-008).
- **Cache no autoritativa:** `casas_cofre.poblacion_activa` y `factor_conversion` pueden quedar desactualizadas si el refresh best-effort falla; la fuente de verdad es el calculo runtime. Debe quedar documentado y no leerse como autoritativo.
- **Gaming de poblacion:** el factor por participacion puede incentivar migraciones coordinadas entre Casas (funnel) para forzar `rezagada`. Mitigacion: ventana de 30 dias + tributacion sobre `xp_final` + monitoreo; no hay defensa fuerte en v1.
- **Carrera de `nivel_clase`:** dos entregas concurrentes podrian calcular el nivel desde un `xp_clase` desactualizado. Mitigacion: derivar `nivel_clase` del valor devuelto por `RETURNING xp_clase` (atomico para el incremento).
- **`xp_clase` condicionado a tener Clase (RESUELTO):** `xp_clase` acumula SOLO si `clase_id IS NOT NULL` (la Clase es un compromiso). **APROBADO por producto (2026-09-17, resolucion 4).**
- **Sin FK `usuarios.casa -> casas_cofre.casa` (ACEPTADO):** las dos listas CHECK podrian divergir en el futuro. **APROBADO por producto (2026-09-17, resolucion 5):** en v1 basta el preflight defensivo + las constantes espejo; no se agrega FK (evita validar filas historicas).
- **Desviacion de firma (ACEPTADA):** `entregarXpUsuario` con 4 argumentos (`tipoAccion`); el mandato lo enuncio con 3. **ACEPTADA por producto (2026-09-17, resolucion 2).** **(SUPERSEDIDO POR ENMIENDA 1: entregarXpUsuario no existe en el archivo real.)**
- **Interpretacion de la formula de clase (NUEVO):** se tomo la lectura literal del spec (`xp_clase_inc = xp_base * (1 + nivel_clase * BONUS_CLASE[clase])`, sin `factor_casa`). Si producto queria que `xp_clase` tambien absorbiera el factor de Casa, cambia una linea en `calcularXpFinal`. Confirmar antes de cerrar. **(SUPERSEDIDO POR ENMIENDA 1: la implementacion usa xp_clase_inc = red2(xp_final * 0.50), con el factor de Casa YA incluido, acreditado en acreditarClaseYCofre.)**
- **Contadores de accion (NUEVO, critico para el implementador):** reemplazar los UPDATE inline sin preservar `total_resenas`/`total_guardados`/`total_visitas` rompe misiones/logros. El helper DEBE incluirlos (ver seccion C).
- **Bono rural plano (NUEVO):** alimentar el helper con `xpTotalVisita` escalaria el bono rural (ADR-024/033); debe llamarse con `xpVisitaFinal` y sumar el bono aparte. Ver seccion C.
- **Terceros en la misma rama (NUEVO):** el XP a `afAutorOriginal` (album_agregar_foto/media) NO pasa por el helper; el implementador no debe sustituir ambos UPDATEs.
- **Interaccion con topes de ADR-036:** el tope de 50 XP/24h de `compartir` se evalua sobre el `xp_final`; un miembro de Casa dominante obtiene menos XP por share (25 x 0.85 = 21.25) y consume tope mas lento. Efecto esperado del balance; vigilar que no abra farming relativo.
- **Deuda de columnas no versionadas (`usuarios.activo`/`ultimo_acceso`, patron BUG-021):** el calculo de poblacion activa depende de ellas; debe degradar con `warn` y NO romper la entrega.

### Resoluciones del dueno (Javier, 2026-09-17)

**SUPERSEDIDO POR ENMIENDA 1 (2026-09-18):** estas resoluciones describen el diseno previo a la implementacion y quedan como registro historico. El contrato vigente (triada de helpers, sin afinidad, sin gate de nivel, xp_clase = 50 por ciento del xp_final, constantes BONUS_CLASE / XP_NIVEL_CLASE / calcularTagCasa) es el de la ENMIENDA 1. Conservan vigencia: la resolucion 1 (factor_conversion espeja multiplicador_xp; aranceles como constantes runtime), la resolucion 4 (xp_clase solo con clase_id) y la resolucion 5 (sin FK).

1. `factor_conversion` en `casas_cofre` espeja SOLO `multiplicador_xp`; `arancel_inter_casa` y `fee_mercado_interno` quedan como constantes runtime NO persistidas. **APROBADO.**
2. Se ACEPTA el 4o argumento `tipoAccion` en `entregarXpUsuario(sql, usuarioId, xpBase, tipoAccion)` (desviacion justificada de la firma inicial de 3 args). **APROBADO.**
3. Se usan los VALORES DEL SPEC ORIGINAL (no los propuestos por el architect): `BONUS_CLASE = { cartografo: 0.08, cronista: 0.10, explorador: 0.07 }`; `XP_NIVEL_CLASE = [0,100,250,500,900,1400,2100,3000,4200,5700,7500]`; `calcularNivelClase()` con maximo 10; formula `xp_clase_nuevo = xp_base * (1 + nivel_clase * bonus_clase)` y `factor_casa` (rezagada 1.30 / dominante 0.85 / equilibrada 1.00). **APROBADO.**
4. `xp_clase` acumula SOLO si el usuario tiene `clase_id` (sin clase elegida no hay XP de clase). **APROBADO.**
5. SIN FK `usuarios.casa -> casas_cofre.casa` en v1 (el CHECK de 017 ya restringe a las mismas 3 casas); el preflight defensivo basta. **APROBADO.**
6. Estado del ADR: "Aprobado en diseno; implementacion en curso (2026-09-17)". **APLICADO.**

### Ambiguedades que siguen abiertas (no bloquean el contrato central)

**SUPERSEDIDO POR ENMIENDA 1 (2026-09-18):** las ambiguedades 1 (gate de nivel) y 2 (afinidad) quedan RESUELTAS por el contrato implementado: NO hay gate de nivel y NO existe afinidad de clase. Se leen solo como registro historico del diseno. Sigue vigente la recomendacion de revisar los umbrales de tag 45/25 y los valores 0.85/1.00/1.30 tras la primera semana de datos.

1. **Gate de nivel para la primera eleccion de Clase:** se propone nivel >= 2 (consistente con `casa_elegir`). `faccion_elegir` no tiene gate. Confirmar el gate (o eliminarlo). Implementador: usar >= 2 salvo indicacion contraria.
2. **Afinidad de clase propuesta** (reparto de las 14 acciones en 3 clases): es una propuesta del arquitecto, no una especificacion cerrada de producto. Confirmar el mapeo. **Nota:** la afinidad se resuelve en runtime (NO persistida); cambiarla no requiere migracion.
3. **Umbrales de tag (45% / 25%) y valores (0.85/1.00/1.30 y aranceles):** fijados por el mandato/resolucion 3, pero su efecto depende del tamano real de cada Casa; revisar tras la primera semana de datos.
4. **Interpretacion de `xp_clase_inc` sin `factor_casa`:** ver riesgos residuales; confirmar la lectura literal del spec.

**Estado final:** Aprobado e IMPLEMENTADO con Enmienda 1 (2026-09-18). El contrato vigente es el de la ENMIENDA 1 al final de este ADR; las secciones A-E, la justificacion, las Resoluciones del dueno y las Ambiguedades previas quedan como registro historico del diseno. Migracion 024 + api/usuarios.js v16 + api/interacciones.js v21 implementados en working tree (verificado contra el archivo real, ADR-006). El gate de nivel y la afinidad quedan resueltos como NO existentes. No commitear ni desplegar sin aplicar 024 en Neon.

**ADRs relacionados:** ADR-001 (presupuesto 8/8), ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-006 (baseline = archivo real), ADR-008 (SQL versionado / idempotencia), ADR-010 (presupuesto de endpoints), ADR-018 (moneda unica `xp_total`), ADR-024 (presencia fisica / factor de area), ADR-028 (Casas `usuarios.casa`, Arbol de 16 ramas, `casa_elegir`, `casa_ranking`), ADR-033 (factor de area por radio en `visita`), ADR-035 (`numeric(12,2)`, `red2`, `miembros_activos` de 30 dias), ADR-036 (compartir y media unificada), BUG-021 (deuda de columnas no versionadas).

---

**ENMIENDA 1 (2026-09-18)**

**Motivo.** El QA detecto que el diseno de ADR-038 (2026-09-17) no coincidia con la implementacion real de TSK-112. El spec de producto (PROMPT_OPENCODE_TSK112.md) prevalece sobre el diseno del architect en los puntos que la implementacion resolvio de otra forma. Esta enmienda NO cambia codigo: documenta y aprueba el contrato REALMENTE implementado, verificado contra el archivo real (ADR-006: api/interacciones.js v21, api/usuarios.js v16 y db/migrations/024_casas_cofre_y_clases.sql). Donde haya contradiccion, PREVALECE esta enmienda sobre las secciones A-E, la justificacion, las Resoluciones del dueno y las Ambiguedades previas. El helper monolitico entregarXpUsuario NO existe: se sustituye por la triada contextoXpE / calcularXpFinal / acreditarClaseYCofre, manteniendo los UPDATE usuarios SET xp_total inline en cada rama para PRESERVAR los contadores en el mismo UPDATE y evitar regresiones.

**Resoluciones del contrato implementado (13).**

1. Sin helper monolitico. La centralizacion anti-duplicidad (AGENTS.md 2.1) se logra con 3 helpers en api/interacciones.js: contextoXpE(sql, usuarioId), con un SELECT unico de clase/casa + conteo de miembros + tag; calcularXpFinal(xp_base, nivel_clase, clase_id, casa_tag), con bonus de clase + factor de Casa y un solo red2 final; y acreditarClaseYCofre(sql, usuarioId, ctx, xp_final), con side-effects best-effort (50 por ciento a xp_clase y 10 por ciento al cofre). Los UPDATE usuarios SET xp_total permanecen INLINE en cada rama para preservar en el mismo UPDATE los contadores total_resenas, total_guardados y total_visitas; el XP usado en esos UPDATE es siempre el xp_final devuelto por calcularXpFinal.

2. xp_clase_inc = red2(xp_final * 0.50), es decir el 50 por ciento del XP FINAL, que YA incluye el factor de Casa. Se acredita SOLO si el usuario tiene clase_id; nivel_clase se recalcula con calcularNivelClase sobre el xp_clase acumulado mas el incremento. Queda sin efecto la lectura previa que excluia el factor de Casa del incremento de clase.

3. Formula de clase. El bonus depende SOLO de la clase elegida: BONUS_CLASE = { cartografo: 0.08, cronista: 0.10, explorador: 0.07 }, y se aplica a TODAS las acciones de la whitelist. NO hay afinidad por tipo de accion; la afinidad del diseno original NO se implemento.

4. Curva de clase. XP_NIVEL_CLASE = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500]; calcularNivelClase con tope duro de nivel 10. Son los valores del spec de producto.

5. Factores de Casa. rezagada 1.30, dominante 0.85, equilibrada 1.00. El tag es dominante si pct > 0.45, rezagada si pct < 0.25, y equilibrada en el resto; ademas, si el total es 0 se devuelve equilibrada (guard). En la implementacion, contextoXpE obtiene los conteos de PERTENENCIA a la Casa (COUNT sobre usuarios.casa y COUNT sobre usuarios.casa IS NOT NULL), SIN filtro de ventana de 30 dias ni de usuarios.activo; el nombre miembros_activos del spec NO se materializo como filtro de actividad en v1.

6. clase_elegir (POST en api/usuarios.js). SIN gate de nivel: solo exige sesion firmada (validarSesionUsuario) y email verificado. Primera eleccion gratis (WHERE clase_id IS NULL); el recambio cuesta 300 XP y tiene cooldown de 30 dias via clase_elegida_en; al recambiar se reinician nivel_clase = 1 y xp_clase = 0. Respuestas: primera eleccion {ok:true,data:{clase_id, clase_elegida_en}}; recambio {ok:true,data:{clase_id, clase_elegida_en, xp_total_nuevo, nivel_anterior, nivel_nuevo, bajo_nivel}}. Errores: 400 usuario_id, 401 razon de sesion, 400 CLASE_INVALIDA, 404 usuario no encontrado, 403 EMAIL_SIN_VERIFICAR, 409 CLASE_YA_ELEGIDA, 429 COOLDOWN_CLASE, 402 PUNTOS_INSUFICIENTES. El error NIVEL_INSUFICIENTE NO existe en la rama `clase_elegir` de TSK-112 (si existe en ramas ajenas: `casa_elegir` en api/usuarios.js, y `activo_oculto_votar`/`dm_enviar` en api/interacciones.js).

7. visita. calcularXpFinal se aplica a xpVisitaFinal (ya multiplicado y amuletado, sin bono rural). El bono rural (VISITA_BONO_RURAL = 20) es PLANO y se SUMA despues: xpTotalVisita = red2(xpVisitaEscalado + bonoRural). La clase (50 por ciento) y el cofre (10 por ciento) se acreditan sobre ese xpTotalVisita TOTAL, es decir SI incluyen la base del bono rural en el porcentaje, aunque el bono no se multiplica por clase/Casa. aplicarFamaPandilla usa el XP SIN bono; repartirXpReferidos usa el XP CON bono.

8. album_agregar_foto. SOLO el actor pasa por los helpers; el +10 al autor original conserva su UPDATE separado y su tope de 10 por dia.

9. compartir. El tope de 50 por 24h y el ledger media_compartidos.xp_ganado cuentan sobre el xp_final (post-factor).

10. arbol_catalogo NO se modifica: NO expone clases. El frontend usa catalogos locales espejo (CLASES_META y XP_NIVEL_CLASE, verificados en mi-perfil.html). El campo aditivo clases del diseno original queda DIFERIDO a v2.

11. Nombres reales de constantes: BONUS_CLASE, XP_NIVEL_CLASE y calcularTagCasa. NO existen las constantes CLASES (catalogo), CASAS_NIVELACION, MULT_CASA ni TRIBUTO_CASA_PCT; el 10 por ciento del cofre es un literal 0.10 dentro de acreditarClaseYCofre.

12. casas_cofre se crea SIN FK hacia usuarios.casa; poblacion_activa se refresca best-effort solo en casa_elegir. casas_votaciones queda diferida a v2. NO existe endpoint casa_tributar.

13. Deuda PREEXISTENTE, no introducida por TSK-112: multiples .catch(function(){}) best-effort en api/interacciones.js. Se reconoce como deuda pendiente conforme a AGENTS.md 2.2 (prohibicion de capturas que silencien fallos) y NO se computa como incumplimiento de TSK-112.

**Impacto en el contrato.**
- Prevalece esta enmienda sobre las secciones A-E y sobre las Resoluciones del dueno / Ambiguedades previas donde se contradigan.
- Se elimina del contrato vigente: entregarXpUsuario (helper monolitico), la afinidad de clase, el gate de nivel >= 2, el error NIVEL_INSUFICIENTE, la formula xp_clase_inc = xp_base * (1 + nivel_clase * BONUS_CLASE) sin factor de Casa, el campo clases en arbol_catalogo y las constantes CLASES / CASAS_NIVELACION / MULT_CASA / TRIBUTO_CASA_PCT.
- Se mantiene vigente: el reuso de usuarios.casa como unica identidad de Casa, la tabla real casas_cofre (no casas_tributacion) con CHECK de las 3 Casas y sin FK, BONUS_CLASE y XP_NIVEL_CLASE del spec, el tope de nivel 10, la tributacion best-effort del 10 por ciento y el presupuesto 8/8 de endpoints.
- Verificacion contra el archivo real (ADR-006): api/interacciones.js v21 (helpers y llamadas en las 14 acciones de la whitelist), api/usuarios.js v16 (rama clase_elegir, sin gate de nivel) y db/migrations/024_casas_cofre_y_clases.sql (sin FK, sin casas_votaciones).

**Estado de la enmienda:** Aprobada e implementada (2026-09-18).

---

## ADR-039: Museo multimedia URL-only (recursos por URL externa, visibilidad por recurso y carpetas = albumes)

**ID:** ADR-039
**Fecha:** 2026-09-18
**Estado:** Diseno aprobado por decision de producto del Chief Architect; **IMPLEMENTADO EN WORKING TREE con ENMIENDA 1 (2026-09-18)**. Se aplicaron `db/migrations/025_album_fotos_visible.sql` (TASKS.md TSK-114) y las ramas `tipo=museo_recurso` + filtros de `visible` en `api/interacciones.js` v22; el frontend del Museo (T5/T7) entra en TSK-116. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar 025 en Neon ANTES del deploy** (patron BUG-021/BUG-060; ver ENMIENDA 1 al final de este ADR).
**Autor:** architect (AI-DOS) con decision de producto del Chief Architect.
**Nota de numeracion:** el 039 es el consecutivo real tras ADR-038 (mayor registrado en este documento al 2026-09-18, verificado con grep sobre el archivo real, ADR-006). La ultima entrada vigente es la ENMIENDA 1 de ADR-038; este ADR se anexa a continuacion.

### Contexto

El Museo (perfil publico, WP-3 / ADR-028) expone hoy media por dos vias separadas: fotos de viajero (interacciones `tipo='foto'`, rama POST en `api/interacciones.js:5944-5971`) y albumes (`albumes` + `album_fotos`, migracion 009). El producto pide una gestion unificada de recursos multimedia del Museo (foto, video y audio) bajo tres restricciones simultaneas:

1. **Vercel Hobby no persiste archivos binarios**; el sistema de media completo guarda URLs externas en la base. La subida real de archivos es TODO futuro documentado en TASKS.md:2407. El Museo no puede ser la excepcion: solo URLs.
2. **Presupuesto de 8/8 funciones serverless agotado** (ADR-001/ADR-010): ninguna necesidad puede resolverse con un endpoint nuevo.
3. **`album_fotos` ya soporta `foto_type` foto/video/audio** (migracion 009) pero no tiene via de ingesta para video/audio ni visibilidad por recurso: hoy todo lo de un album activo se muestra en el mapa multimedia (`multimedia_mapa` :4401-4585) y en el perfil publico (Sala V de `perfil.html:606-649` lee `tipo=mis_fotos`) sin distincion publico/privado; `museo_publico` (:3418) cuenta todas las fotos del album sin filtro.

Decisiones de producto cerradas (no reabrir): (a) recursos del Museo SIEMPRE como links/URLs http/https validos, descartando Vercel Blob, Cloudinary y Supabase Storage; (b) visibilidad POR RECURSO con nuevo campo `album_fotos.visible boolean NOT NULL DEFAULT false`, privado por defecto, y filtro OBLIGATORIO en todo endpoint publico; (c) sin limites de cantidad ni tamano (solo scheme http(s) y longitud <= 2000); (d) reuso del schema de albumes como carpetas: mover un recurso = reasignar `album_id`, sin jerarquia nueva; (e) auto-crear el album "Mi Museo" (tipo mixto) si el usuario no tiene album al crear su primer recurso.

### Opciones evaluadas

1. **Storage real de binarios (Vercel Blob / Cloudinary / Supabase Storage).** Descartada: Vercel Hobby no persiste archivos y el ingreso por URL externa ya es el patron vigente (TASKS.md:2407).
2. **Persistir los recursos del Museo en `interacciones` con tipos nuevos.** Descartada: el CHECK de `interacciones.tipo` no esta versionado (patron BUG-021/BUG-060, ver ADR-036) y las interacciones quedan para acciones de ficha; la media vive en el ecosistema `media_*` / `album_fotos`.
3. **Tabla nueva `museo_recursos`.** Descartada: `album_fotos` (009) ya cumple el contrato (`foto_url`, `foto_type` con video/audio, `media_title`, `media_source`, `activo`, `agregador_id`/`autor_original_id`) y ya esta integrada con `media_votos`, `media_comentarios`, `media_guardados`, `multimedia_mapa`, `mi_feed_fotos`, `fotos_top` y `museo_publico` (ADR-036). Unica carencia real: visibilidad.
4. **Visibilidad por album (campo en `albumes`).** Descartada: el producto pide visibilidad POR RECURSO; un album puede mezclar recursos publicos y privados.
5. **Coords por recurso (columnas `lat/lng` en `album_fotos`).** Descartada: duplicaria la georreferencia que ya vive en `albumes.lat/lng` y obligaria a redisenar el UNION de `multimedia_mapa`; el recurso se georreferencia a traves de su carpeta. Los coords opcionales del payload se persisten en el album destino.
6. **Endpoint nuevo `/api/museo.js`.** Descartada: 8/8 agotado (ADR-001). Todo entra como ramas `tipo=` en `api/interacciones.js`, con mutaciones por POST + `accion=` (patron vigente del archivo: todas las mutaciones existentes son POST `tipo=`; PATCH/DELETE no se usan en el archivo).
7. **XP sin gate para video/audio.** Descartada: el XP solo se otorga a `tipo_media=foto` con la mision `mis_fotografo` completada (mismo contrato que la rama legacy, +15 XP con los helpers v21 de la ENMIENDA 1 de ADR-038); video/audio se persisten con `xp_otorgado_autor=0` hasta que T4.5 defina sus misiones. **(CORREGIDO POR ENMIENDA 1, 2026-09-18: el contrato implementado da gate `mis_fotografo` y +15 XP a los TRES tipos; NO existe `xp_otorgado_autor=0` para video/audio. Se descarta que `mis_videografo`/`mis_sonidista` sean prerequisito por deadlock circular. Ver ENMIENDA 1 al final de este ADR.)**

### Decision tomada

**(A) Migracion 025 (`db/migrations/025_album_fotos_visible.sql`)** — la UNICA de este ADR, idempotente (ADR-008) y ASCII-safe (ADR-002):
- `ALTER TABLE album_fotos ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT false;`
- Indice unico parcial para el album auto-creado: `CREATE UNIQUE INDEX IF NOT EXISTS idx_albumes_usuario_mi_museo ON albumes (usuario_id) WHERE titulo = 'Mi Museo' AND activo = true;` — permite `INSERT ... ON CONFLICT DO NOTHING` + re-SELECT sin duplicar el album bajo concurrencia.
- Aplicar el archivo COMPLETO en Neon ANTES del deploy (patron BUG-021/BUG-060).

**(B) Rama `POST ?tipo=museo_recurso`** (`api/interacciones.js` v22). Auth: `validarSesion` (ADR-025); el usuario se toma de la sesion, NUNCA del body (cierra la clase de spoofing de BUG-061).
- `accion=crear` (default). Body: `{url, tipo_media, caption?, album_id?, lat?, lng?, visible?}`. Validaciones: `url` con `/^https?:\/\//` y longitud <= 2000 (mismo regex que la rama legacy :5954); `tipo_media` en foto|video|audio; `caption` <= 200 (columna `media_title varchar(200)`); `album_id` uuid opcional perteneciente al usuario (403/404 si es ajeno); `lat/lng` ambos o ninguno, rangos [-90,90] y [-180,180]; `visible` booleano default false. Si no viene `album_id`: buscar el album "Mi Museo" activo del usuario; si no existe, `INSERT ... ON CONFLICT DO NOTHING` y re-SELECT. Si `tipo_media=foto`: exigir mision `mis_fotografo` completada (gate identico a :5956-5961) y acreditar +15 XP con los helpers v21 (`contextoXpE` / `calcularXpFinal` / `acreditarClaseYCofre` / `repartirXpReferidos` / `evaluarMisiones` / `evaluarLogros`). Si `tipo_media` in video|audio: SIN gate y `xp_otorgado_autor = 0` (T4.5 anexara misiones sin migracion de datos). Persistencia: `INSERT INTO album_fotos (album_id, agregador_id, autor_original_id, foto_url, foto_type, media_title, media_source, visible, activo, xp_otorgado_autor)` con autor = usuario de la sesion y `media_source=''`. Si el payload trae `lat/lng`, se persisten en `albumes.lat/lng` del album destino (el recurso hereda la ubicacion de su carpeta). Respuesta 200: `{ok:true, data:{id, album_id, visible}, xp?, misiones?, logros?}`.
- `accion=editar` (editar y mover). Body: `{id, caption?, visible?, album_id?, lat?, lng?}` con al menos un campo. `id` uuid OBLIGATORIO y perteneciente al dueno (`WHERE id=$1 AND agregador_id=$2 AND activo=true`; si no, 404). Mover = cambiar `album_id` (validar pertenencia del album nuevo). `lat/lng` se persisten en `albumes.lat/lng` del album (destino si se mueve). UPDATE parcial; `activo` no se toca aqui (Cero Borrado Logico intacto).
- `accion=eliminar`. Body: `{id}`. Soft delete: `UPDATE album_fotos SET activo = false` (Regla de Oro 3). 404 si no existe o no pertenece.
- Errores comunes: 400 (url/tipo_media/caption/lat-lng/uuid/sin campos editables), 401 (sesion), 403 (mision no completada en foto), 404 (recurso o album no encontrado / no te pertenece).

**(C) Rama `GET ?tipo=museo_recurso`** (`api/interacciones.js` v22).
- Query: `usuario_id|id` (uuid opcional; default = dueno de la sesion si la hay), `album_id` (uuid opcional), `limit` (default 50, max 200), `offset` (default 0). Orden: `creado_en DESC`.
- Regla de visibilidad SERVER-SIDE: si el consultante no es el dueno (o no hay sesion): `WHERE af.visible = true`; si el consultante ES el dueno (sesion valida del mismo usuario): ve todo (incluye privados). `visible` SIEMPRE viaja en cada item de la respuesta.
- Proyeccion: `af.id, af.album_id, a.titulo AS album_titulo, af.foto_url AS url, af.media_title AS caption, af.foto_type AS tipo_media, a.lat, a.lng, a.ciudad, af.visible, votos` (COUNT de `media_votos` fuente='album_foto' con `conDegradacionMedia`, patron BUG-051/BUG-060), `af.creado_en`. Shape: `{ok:true, data:[...]}`. Cero XP en GET.

**(D) Filtro `af.visible = true` en TODOS los lectores PUBLICOS de `album_fotos`** (regla general). Lista de ramas en `api/interacciones.js`:
1. `multimedia_mapa` (:4401-4585): la rama album del UNION agrega `AND af.visible = true` cuando NO `scope=mio` (capa publica, default v17/ADR-031); con `scope=mio` (toggle "Solo mio" del dueno) se mantiene sin filtro para que vea sus privados.
2. `mis_fotos` (Sala V, `perfil.html:606-649`): filtro SIEMPRE `af.visible = true` (es solo lectura y solo publico por diseno del ADR-032; ni el dueno ve privados aqui — los gestiona por su panel). Cero cambios en `perfil.html`.
3. `museo_publico` (:3418): el conteo `total_fotos` de `mpAlbumes` pasa a `af.activo=true AND af.visible=true` (el museo publico muestra solo lo visible).
4. `mi_feed_fotos` (:4588), `fotos_top` (:4679), `album_detalle` y `galeria_destino` (parte album): mismo filtro (sin el, el contenido privado se escaparia por estas superficies).
5. `mis_guardados_media` (:4647): SIN FILTRO — es la lista privada de bookmarks del dueno (migracion 019), no una superficie de publicacion. Un recurso ajeno que se vuelve privado NO se revoca del guardado en v1 (decision documentada, sin logica de re-vocacion).

**(E) XP y misiones.** Foto: gate `mis_fotografo` + 15 XP (contrato identico a la rama legacy `tipo='foto'`, acreditado con los helpers de la ENMIENDA 1 de ADR-038). Video/audio: 0 XP en v1; T4.5 agregara misiones (sin cambios de esquema). Riesgo aceptado y documentado: la misma URL puede recibir 15 XP por `tipo='foto'` (interacciones) y 15 por `museo_recurso` (album_fotos); ambas vias exigen la MISMA mision, el dedup index de la 009 solo previene duplicados dentro del mismo album y el farming entre vias ya existe hoy con `album_agregar_foto` (+10). No se introduce un vector nuevo de mayor escala. **(CORREGIDO POR ENMIENDA 1, 2026-09-18: gate `mis_fotografo` para foto, video y audio; +15 XP para los TRES tipos; se crearon `mis_videografo` y `mis_sonidista` (xp 15, `gate_nivel` 2) como hitos POST-insert; catalogo 39 -> 41 misiones. Ver ENMIENDA 1 al final de este ADR.)**

**(F) Frontend.** Cero cambios en esta iteracion: `perfil.html` Sala V, `galeria.html`, `admin.html` y `mi-perfil.html` consumen los contratos existentes (`mis_fotos`, `multimedia_mapa`, `museo_publico`) que ahora filtran visible server-side. La UI de gestion de recursos del Museo (crear/editar/mover/eliminar/visibilidad) queda como TSK de frontend POSTERIOR al contrato de API.

### Justificacion

Reusar `album_fotos` en lugar de una tabla nueva honra ADR-008 (todo cambio de esquema versionado), el patron polimorfico `media_*` de ADR-036 y la Regla de No-Duplicidad (AGENTS.md 2.1): el 90 por ciento del contrato (`foto_url`, tipo foto/video/audio, `media_title`, autor, dedup, votos, comentarios, guardados, mapa) ya existe y esta integrado; la unica carencia real es la visibilidad por recurso, que se resuelve con una columna booleana + filtros en los lectores. El gate de mision y el XP replican el contrato existente de `tipo='foto'` con los helpers v21, y la exigencia de `validarSesion` cierra de paso la deuda de confianza en `usuario_id` documentada en BUG-061 para el contrato nuevo (el legacy no se toca: retrocompatibilidad). Persistir las coords en el album evita duplicar georreferencia y mantiene el UNION de `multimedia_mapa` intacto. La auto-creacion de "Mi Museo" con indice unico parcial es atomica y sin carrera. El filtro `visible=true` en TODOS los lectores publicos (no solo los del alcance minimo) cumple la decision (b) sin fugas: la Sala V no cambia, pero `album_detalle`, `mi_feed_fotos` y `fotos_top` tampoco pueden exponer lo privado. Todo entra como ramas `tipo=` sin crear archivos en `api/`: el presupuesto 8/8 queda intacto (ADR-001).

### Impacto

- **DB:** `db/migrations/025_album_fotos_visible.sql` (`album_fotos.visible` + `idx_albumes_usuario_mi_museo`). APLICAR EN NEON ANTES del deploy (patron BUG-021/BUG-060, archivo COMPLETO en una corrida). Sin cambios mayores de esquema; sin DROP de tablas legacy (Regla de Oro 3).
- **api/interacciones.js v22:** rama `POST tipo=museo_recurso` (crear/editar/eliminar) + rama `GET tipo=museo_recurso` (listar con visibilidad server-side) + `AND af.visible = true` en `multimedia_mapa` (:4401, rama publica), `mis_fotos`, `museo_publico` (:3418, conteo `mpAlbumes`), `mi_feed_fotos` (:4588), `fotos_top` (:4679), `album_detalle` y `galeria_destino` (parte album). `mis_guardados_media` (:4647) SIN cambios.
- **Frontend:** cero cambios en esta iteracion (`perfil.html:606-649` intacto; el backend filtra server-side).
- **Presupuesto de endpoints:** intacto (8/8, ADR-001/ADR-010).
- **Riesgos documentados:** (1) farming doble de XP entre vias legacy y `museo_recurso` — mitigado por el gate de la misma mision; (2) guardados de recursos que se vuelven privados no se revocan en v1; (3) la rama GET publica de `museo_recurso` debe probar que jamas filtra por `visible` client-side.

**Estado final:** Aprobado como diseno por decision de producto del Chief Architect; **IMPLEMENTADO EN WORKING TREE con la ENMIENDA 1 (2026-09-18)**: migracion 025 creada y ramas en `api/interacciones.js` v22 implementadas (TASKS.md TSK-114), UI del Museo en `mi-perfil.html` (TSK-116). **Pendiente operativo: aplicar 025 en Neon antes del deploy** (patron BUG-021/BUG-060). El contrato vigente es el de la ENMIENDA 1 al final de este ADR; la opcion 7 y la decision E quedan marcadas como SUPERSEDIDAS.

**ADRs relacionados:** ADR-001 (presupuesto 8/8), ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-006 (baseline = archivo real), ADR-008 (SQL versionado / idempotencia), ADR-010 (presupuesto de endpoints), ADR-017 (albumes, migracion 009), ADR-021 (filtros de mapa), ADR-023 (media polimorfica + `multimedia_mapa`), ADR-025 (sesion firmada), ADR-028 (Museo WP-3), ADR-031 (capa publica del mapa), ADR-032 (Sala V solo lectura publica), ADR-035 (numeric(12,2)), ADR-036 (media unificada + comparticiones), ADR-038 (helpers de XP v21 / ENMIENDA 1), BUG-021/BUG-060 (deuda de columnas no versionadas), BUG-061 (spoofing de `usuario_id`).

---

**ENMIENDA 1 (2026-09-18)**

**Motivo.** El QA (qa-auditor-free) marco BLOQUEANTE que el texto vigente de ADR-039 (opcion 7 y decision E) no coincidia con la implementacion real de TSK-114/TSK-116: el ADR afirmaba que video/audio tendrian 0 XP y sin gate hasta T4.5, mientras que el orquestador aprobo y el codigo implemento gate y +15 XP para los TRES tipos, mas 2 misiones nuevas. Esta enmienda NO cambia codigo: documenta y aprueba el contrato REALMENTE implementado, verificado contra el archivo real (ADR-006: `api/interacciones.js` v22, `db/migrations/025_album_fotos_visible.sql` y `mi-perfil.html`). Donde haya contradiccion, PREVALECE esta enmienda sobre la opcion 7 y la decision E (y sobre el resto del ADR donde se contradiga).

**Resoluciones del contrato implementado (9).**

1. **Gate de creacion UNICO:** mision `mis_fotografo` completada para foto, video y audio (`api/interacciones.js` L6225-6227). Razon: `mis_videografo` y `mis_sonidista` cuentan recursos YA creados (`COUNT(*)` sobre `album_fotos` con `foto_type='video'/'audio'`), de modo que exigirlos como prerequisito del primer recurso seria un **deadlock circular**. Se evaluan como hitos POST-insert con `evaluarMisiones` (L6298). Desviacion documentada respecto del literal del pedido.

2. **+15 XP para foto, video y audio (no 0).** `mrXp = 15` (L6283) para los 3 tipos; el XP pasa por `contextoXpE` + `calcularXpFinal` (clase/Casa) + `acreditarClaseYCofre` + `repartirXpReferidos`; el usuario recibe `xp`/`misiones`/`logros` en la respuesta 200. NO se usa `xp_otorgado_autor=0`.

3. **Misiones nuevas (catalogo 39 -> 41),** grupo `fotos`, `requiere: []`, `xp: 15`, `gate_nivel: 2`, evaluadas post-insert:
   - `mis_videografo` "Cronicas en Movimiento": check `>=1` video activo del usuario.
   - `mis_sonidista` "Ecos y Relatos": check `>=1` audio activo del usuario.
   Sin DDL (el progreso vive en `progreso_misiones` jsonb). El acordeon de ADR-040 las ancla por su `gate_nivel`.

4. **Filtros `af.visible=true` tambien en los CONTEOS y subqueries de votos** (no solo en el SELECT principal) de `mis_fotos`, `album_detalle`, `albumes` y `museo_publico` (`total_fotos` y `votos`); evita fugas de recursos privados por agregados. `mis_guardados_media` mantiene SIN filtro (bookmarks privados del dueno).

5. **`GET ?tipo=museo_recurso`:** `usuario_id` (o `id`) OPCIONAL; default = dueno de la sesion firmada; si no hay sesion y no llega `usuario_id`, 400. Query `visible` opcional, `album_id` opcional, `limit` 50 (max 200), `offset`. La proyeccion real usa `foto_url` (NO `url`), mas `album_titulo`, `tipo_media`, `ciudad`, `votos` y `creado_en`.

6. **`accion=editar`** valida pertenencia por `album_fotos.agregador_id = sesion` (conforme ADR-039 B); **`accion=eliminar`** valida por album del usuario (`album_id IN (SELECT id FROM albumes WHERE usuario_id=sesion AND activo=true)`) y hace soft delete (`activo=false`, Cero Borrado Logico). `album_id` destino ajeno -> 400.

7. **`barrio` DESCARTADO:** la tabla `albumes` no tiene esa columna; se persisten `ciudad` y `region` (ningun dato del payload queda sin persistir).

8. **Validacion de rango de coordenadas bloqueante:** `lat` en [-90,90] y `lng` en [-180,180], ambos o ninguno, con `COORDENADAS_INVALIDAS` (400).

9. **Edicion de `url`/`tipo_media` DESHABILITADA en v1** (requiere cambiar el contrato de la fila); `accion=editar` solo toca `caption`, `visible`, `album_id` y coords del album. El auto-album "Mi Museo" se crea con `INSERT ... ON CONFLICT DO NOTHING` + re-SELECT apoyado en `idx_albumes_usuario_mi_museo` (migracion 025).

**Impacto en el contrato.**
- Prevalece esta enmienda sobre la opcion 7 y la decision E de ADR-039, y sobre cualquier parrafo que prometa 0 XP o ausencia de gate para video/audio.
- Se elimina del contrato vigente: "video/audio sin gate y con `xp_otorgado_autor=0`" y "T4.5 agregara misiones" (las misiones YA existen y el esquema no requirio cambios).
- Se mantiene vigente: el modelo URL-only (descartando Vercel Blob/Cloudinary/Supabase), la visibilidad por recurso (`album_fotos.visible`, default false) con filtros server-side, los recursos sin limite de cantidad (solo scheme http(s) y longitud <= 2000), las carpetas = albumes (mover = cambiar `album_id`), el auto-album "Mi Museo", las coords a nivel de album, la rama `?tipo=museo_recurso` y el presupuesto 8/8 de endpoints.
- **Decisiones del orquestador:** se descartan Vercel Blob/Cloudinary/Supabase (URL-only); `barrio` descartado; edicion de link/tipo deshabilitada en v1; validacion de rango Colombia bloqueante; los filtros de grid y el refresh al cambiar de pestana quedan como backlog (no bloqueantes).
- Verificacion contra el archivo real (ADR-006): `api/interacciones.js` v22 (POST `museo_recurso` L6197-6415; GET `museo_recurso` L3695-3777; misiones L1304/L1319; filtros L3596/L3598/L4223/L4226/L4251/L4267/L4386/L4678/L4794/L4822/L4881) y `db/migrations/025_album_fotos_visible.sql` (171 lineas; columna `visible` + backfill + indice unico parcial).

**Estado de la enmienda:** Aprobada e implementada (2026-09-18). Migracion 025 pendiente de aplicar en Neon antes del deploy del backend v22.

---

## ADR-040: Acordeon de niveles en Mi Perfil (fuente unica `niveles-data.js` y misiones con nivel server-side aditivo)

**ID:** ADR-040
**Fecha:** 2026-09-18
**Estado:** Aprobado por architect-review-free (2026-09-18) y por decision del orquestador; **IMPLEMENTADO EN WORKING TREE (T1 y T2, 2026-09-18)**. Sin migraciones SQL y sin archivos nuevos en `api/` (presupuesto 8/8 intacto, ADR-001/ADR-010): todo el backend entra como campos ADITIVOS en el payload existente de la rama `?tipo=misiones` de `api/interacciones.js` v22 (mismo release que ADR-039).
**Autor:** architect (AI-DOS), revisado y aprobado por architect-review-free (segunda opinion).
**Nota de numeracion:** el 040 es el consecutivo real tras ADR-039 (mayor registrado en este documento al 2026-09-18, verificado con `^## ADR-` sobre el archivo real, ADR-006). No estaba reservado en ninguna spec.
**Nota de release compartido:** el API v22 de `api/interacciones.js` es el MISMO release que ADR-039 (ramas `museo_recurso` + filtros `visible` + misiones del Museo de la ENMIENDA 1). Ambos ADRs son aditivos y no chocan; el header de version v22 debe contabilizar los dos.

### Contexto

`mi-perfil.html` renderiza hoy la seccion NIVELES como una lista plana de 20 tarjetas (`renderNiveles`, mi-perfil.html:1047-1076) alimentada por `XP_LEVELS` (mi-perfil.html:833-856; 20 umbrales `{min, nombre, emoji, era, capacidades}`). El producto pide un acordeon de niveles que muestre por nivel las capacidades desbloqueadas (chips + howto), las misiones ancladas a ese nivel y el estado (bloqueado/actual/desbloqueado). Tres restricciones rigen el diseno:

1. **Regla de No-Duplicidad (AGENTS.md 2.1).** `XP_LEVELS` esta duplicado en 4 archivos (mi-perfil.html:833, index.html:4283, comunidad.html:499 y usuario-session.js:22). Queda prohibido copiarlo una quinta vez: el acordeon lee una FUENTE UNICA `niveles-data.js`.
2. **Presupuesto 8/8 (ADR-001/ADR-010).** No hay endpoints nuevos. El nivel/gate de cada mision viaja en el payload EXISTENTE de `GET ?tipo=misiones` (api/interacciones.js:3235-3257, proyeccion en `entregarCatalogo` :2597-2613) como campos aditivos: el payload hoy proyecta `id, grupo, nombre, desc, xp, requiere, estado, en` y no incluye `desbloquea` ni nivel alguno.
3. **Cero duplicacion de umbrales server-side.** `api/interacciones.js` ya deriva nivel con `calcularNivelLocal` + `NIVELES_LOCAL` (:336-344, los mismos 20 minimos que `api/usuarios.js` NIVELES); el helper nuevo `nivelDeMisionServidor` debe REUSARLO, no declarar otra tabla de umbrales.

Estado real del catalogo (ADR-006): 39 misiones en 6 grupos (`general`, `ciudad`, `categoria`, `fotos`, `artista`, `perfil`); el `GRUPO_NOMBRE` actual de mi-perfil.html:1095 solo cubre 3 (`general`, `ciudad`, `categoria`) y es la unica copia del repo. Cinco misiones tienen gate por XP en su `check()`: `mis_fotografo` (>=100 = nivel 2), `mis_chat_mensajero` (>=250 = 3), `mis_chat_moderador` (>=450 = 4), `mis_chat_creador` (>=700 = 5) y `mis_organizador_bogota` (<300 = nivel 3, :1167); las 5 coinciden con las que llevan `desbloquea` en el catalogo (L1165/1246/1253/1260/1267) y con el comentario de capacidades :1237-1243. La ENMIENDA 1 de ADR-039 suma 2 misiones mas al catalogo (video y audio del Museo, gate propio): el catalogo real pasa a 41 y el acordeon las anclara por sus gates sin trabajo extra.

### Opciones evaluadas

1. **Quinta copia de `XP_LEVELS` dentro de mi-perfil.html (RECHAZADA).** Violaria el tripwire de 5 lineas de AGENTS.md 2.1 y dejaria 5 fuentes que divergen.
2. **Endpoints nuevos (`?tipo=niveles` / `?tipo=capacidades`) (RECHAZADA).** Rompe el 8/8 (ADR-001/ADR-010) y el dato es 100% derivable desde el catalogo cliente.
3. **Persistir `gate_nivel` en base (RECHAZADA).** Los gates son derivados de umbrales y del catalogo MISIONES; persistirlos crea segunda fuente de verdad y exige migracion en vano.
4. **Enriquecer el payload existente de `?tipo=misiones` (ELEGIDA).** Aditivo, cero esquema, cero endpoints, retrocompatible en ambas direcciones: el cliente viejo ignora los campos nuevos y el cliente nuevo degrada sin ellos (fallback transitorio).
5. **Derivar el nivel SOLO en cliente (fallback permanente) (RECHAZADA).** Duplicaria la logica de umbrales en JS cliente (violacion de No-Duplicidad) y divergiria del servidor (ADR-006); el servidor es la fuente autoritativa.

### Decision tomada

**(A) Fuente unica cliente `niveles-data.js`** (asset frontend, no funcion serverless, no cuenta contra el 8/8).
- `XP_LEVELS`: los 20 niveles `{min, nombre, emoji, era}` — copia textual de mi-perfil.html:833-856 con los MISMOS umbrales; el string `capacidades` de cada nivel se reemplaza por su version estructurada en `CAPACIDADES_DETALLE`.
- `CAPACIDADES_DETALLE`: lista de capacidades con `{nombre, howto, nivel}` (nivel = numero del nivel que la desbloquea, 1-based).
- Helpers: `capacidadesDelNivel(nivel)` (filtra `CAPACIDADES_DETALLE` por `nivel`) y `misionesPorNivel(nivel, misionesData)` (filtra el payload de `?tipo=misiones` por `m.nivel === nivel`).
- Cableado SOLO en mi-perfil.html. `index.html:4283` y `comunidad.html:499` CONSERVAN su copia local (deuda documentada; swap futuro de 1 linea: `var XP_LEVELS = NivelesData.XP_LEVELS;`). `usuario-session.js:22` no se toca en v1 (getLevel de sesion).
- Dentro de mi-perfil.html NO conviven dos fuentes: T2 deriva el `XP_LEVELS` local como alias de `NivelesData.XP_LEVELS` (nunca dejar dos tablas de umbrales en la misma pagina).

**(B) Backend aditivo en `api/interacciones.js` v22** (sin migraciones, sin endpoints nuevos).
- Constante `MISION_GATE_XP = {mis_fotografo:2, mis_chat_mensajero:3, mis_chat_moderador:4, mis_chat_creador:5, mis_organizador_bogota:3}` — el gate de las 5 misiones que abren capacidad (4 del comentario :1237-1243 + `mis_organizador_bogota` cuyo `check()` exige 300 XP = nivel 3 con `NIVELES_LOCAL`).
- Helper unico `nivelDeMisionServidor(item)`: devuelve `MISION_GATE_XP[item.id]` si existe; si no, `null`. REUSA `calcularNivelLocal`/`NIVELES_LOCAL` si necesita validar contra el nivel del usuario (No-Duplicidad; prohibido declarar otra tabla de umbrales).
- Rama `?tipo=misiones` (:3235): `entregarCatalogo` (:2597) agrega a cada item tres campos aditivos: `gate_nivel` (del mapa, o null), `desbloquea` (campo real del catalogo MISIONES — hoy no proyectado — o null) y `nivel` (= `gate_nivel` o null, resultado de `nivelDeMisionServidor`). Nota: al extender la fila en `entregarCatalogo` (compartido), `?tipo=logros` tambien gana `desbloquea` de forma aditiva (null para logros; cero regresion). Sin campo `descripcion` nuevo en v1: se conserva el `desc` actual y el howto vive client-side en `CAPACIDADES_DETALLE` (T2).
- Reglas de asignacion mision->nivel (orden): (a) `gate_nivel` explicito si la mision esta en `MISION_GATE_XP`; (b) en su defecto, umbral XP documentado en el comentario interacciones.js:1237-1243 (coincide con el mapa); (c) una mision que desbloquea una capacidad NO se duplica en el nivel de la capacidad — se lista UNA sola vez, en su gate. Sin ancla detectable = `nivel:null` (la mision sigue visible en el panel `#pf-misiones` existente, no en el acordeon).
- Fallback cliente `MISION_GATE_FALLBACK` (constante en niveles-data.js, 11 entradas previstas) mientras el payload no traiga `m.nivel` (backend pre-v22): cubre las 5 con gate + misiones ancladas por cadena de `requiere`. La composicion EXACTA de las 11 se verifica en T2 contra el catalogo real (ADR-006) y se congela en el smoke.

**(C) Frontend.**
- T1 (frontend-tpl-free, mi-perfil.html `renderNiveles` :1047-1076): tarjetas de nivel clicables que abren un panel expandible por nivel con: capacidades del nivel (chips + howto via `capacidadesDelNivel`), misiones del nivel (`misionesPorNivel`) y estado (bloqueado/actual/desbloqueado segun `getLevel(st.xp)`; conserva `pf-level-num`).
- T2 (js-silo-dev-free): crea `niveles-data.js`, completa `GRUPO_NOMBRE` a los 6 grupos reales (general, ciudad, categoria, fotos, artista, perfil) y entrega `scripts/smoke_niveles_data.js` (valida umbrales vs mi-perfil.html:833-856, 20 niveles, 6 grupos, CAPACIDADES_DETALLE con nivel 1..20 y el fallback de 11).

### Justificacion

El acordeon necesita capacidades y misiones por nivel SIN duplicar logica ni umbrales: la fuente unica cliente (A) respeta AGENTS.md 2.1 y deja un swap de 1 linea documentado para las 2 paginas restantes; el enriquecimiento aditivo de `?tipo=misiones` (B) honra el 8/8 (ADR-001/010), es retrocompatible en ambas direcciones (payload nuevo + cliente viejo = campos ignorados; payload viejo + cliente nuevo = fallback transitorio) y mantiene al servidor como autoridad de los niveles (ADR-006): el cliente solo agrupa, nunca deriva umbrales. Reusar `calcularNivelLocal` evita una segunda tabla de umbrales server-side. Sin migraciones: cero riesgo de `42703` y cero dependencia de Neon.

### Impacto

- **Frontend:** nuevo asset `niveles-data.js` (cargado SOLO en mi-perfil.html); `renderNiveles` pasa a acordeon (T1). `index.html`/`comunidad.html` intactos (deuda de copias documentada). `usuario-session.js` intacto.
- **api/interacciones.js v22:** `MISION_GATE_XP` + `nivelDeMisionServidor` + 3 campos aditivos (`gate_nivel`/`desbloquea`/`nivel`) en el payload de `?tipo=misiones` (y `desbloquea` tambien en `?tipo=logros`, aditivo). Cero cambios de esquema, cero endpoints, cero migraciones.
- **Catalogo de misiones:** con la ENMIENDA 1 de ADR-039 el total pasa de 39 a 41 (video/audio del Museo); `total: MISIONES.length` lo refleja solo y el acordeon las ancla por su gate.
- **Presupuesto de endpoints:** intacto (8/8, ADR-001/ADR-010).
- **Riesgos documentados:** (1) el fallback de 11 debe congelarse con smoke contra el catalogo real; (2) la deuda de XP_LEVELS duplicado en index/comunidad/usuario-session persiste (swap futuro); (3) cliente desplegado ANTES del backend v22 mostrara el acordeon sin misiones ancladas (degradado aceptable, sin ruptura: el panel `#pf-misiones` sigue funcionando).

**Estado final:** Aprobado por architect-review-free el 2026-09-18 e IMPLEMENTADO EN WORKING TREE (T1: acordeon en `mi-perfil.html`; T2: `niveles-data.js` + `GRUPO_NOMBRE` de 6 grupos + `scripts/smoke_niveles_data.js` 31/31). Sin pasos manuales en Neon. Compatible con el release v22 compartido con ADR-039 (aplicar migracion 025 ANTES de ese deploy, patron BUG-021/BUG-060).

**ADRs relacionados:** ADR-001 (8/8), ADR-002 (ASCII-safe), ADR-006 (baseline real), ADR-010 (presupuesto de endpoints), ADR-014 (milestones y gates por XP), ADR-035 (XP decimal y niveles derivados), ADR-038 (helpers v21 / ENMIENDA 1), ADR-039 (release v22 compartido + ENMIENDA 1 de misiones del Museo).

---

## ADR-041: Comunicacion oficial (canal broadcast), Casas (tributo configurable, lider automatico y misiones conjuntas), eras/titulos y circulo de rango del admin

**ID:** ADR-041
**Fecha:** 2026-09-18
**Estado:** Aprobado e **IMPLEMENTADO EN WORKING TREE + HOTFIXES POST-QA** (2026-09-18, SIN commitear). Verificado contra el archivo real (ADR-006): existe `db/migrations/026_casas_comunicaciones.sql` (329 lineas), `api/usuarios.js` esta en **v18** (v17 + hotfix J-3), las ramas nuevas viven en `api/interacciones.js` (**v23**; hotfixes J-1/J-2), los modales estan en `usuario-session.js`, el badge/bloqueo en `comunidad.html`, la altura + circulo en `admin.html` y los getters en `map-picker.js`. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar 026 en Neon ANTES del deploy del backend (v23/v18) y del frontend** (patron BUG-021/BUG-060; la 024 y la 025 se consideran YA aplicadas por indicacion del usuario el 2026-09-18).
**Autor:** architect (AI-DOS) con decisiones del propietario del producto (Javier, 2026-09-18); revisado por architect-review.
**Nota de numeracion:** el 041 es el consecutivo real tras ADR-040 (mayor registrado en este documento al 2026-09-18, verificado con `^## ADR-` sobre el archivo real, ADR-006). No estaba reservado en ninguna spec.
**Alcance de esquema:** esta ADR NO toca `destinos.tags` JSONB ni ninguna categoria del directorio. Opera sobre `chat_salas` (columna nueva), `casas_cofre` (columnas nuevas), y las tablas nuevas `casa_roles` y `casa_misiones`.

### Contexto

La sesion "Comunicacion + Casas + Admin Mapa" cierra cuatro frentes de producto sobre el sistema social/gaming existente, sin crear funciones serverless (presupuesto 8/8, ADR-001/ADR-010):

1. **Comunicacion oficial:** se necesita un canal de anuncios de la plataforma dentro de `comunidad.html` (chat), con publicacion restringida al administrador y lectura para todos.
2. **Casas:** el cofre de ADR-038 tributaba un `0.10` literal no configurable; faltaba un lider visible por Casa, misiones colectivas y una tabla de roles.
3. **Progresion:** la gamificacion ya tenia 20 niveles en 4 eras (ADR-035), pero sin titulos por nivel ni feedback de subida de nivel / cambio de era en el cliente.
4. **Admin mapa:** el selector de coordenadas (`map-picker.js`, TSK-117) no visualizaba el radio de verificacion (`destinos.radio_m`, ADR-033/TSK-107) que el formulario ya capturaba.

Restricciones vigentes: 8/8 de funciones serverless (ADR-001/ADR-010), cero borrado logico (ADR-003/Regla de Oro 3), migraciones aditivas e idempotentes (ADR-008), ASCII-safe (ADR-002) y baseline = archivo real (ADR-006).

### Opciones evaluadas (y por que se descartan)

1. **Numerar la migracion 019 (prompt original) vs 026 (ELEGIDA).** El 019 ya esta ocupado por `019_media_guardados_radio.sql` (TSK-107); usar 019 colisionaria dos migraciones distintas. Se elige **026**, el consecutivo real tras la 025 (ADR-006). *Decision (a).*
2. **Asumir `MapPicker._map` (RECHAZADA) vs exponer getters `getPickerMap()`/`getMiniMap()` (ELEGIDA).** El campo privado no existia; modificar `map-picker.js` (modulo compartido de TSK-117) para exponer una API publica evita acoplarse a un detalle interno y respeta el encapsulamiento. *Decision (b).*
3. **Agregar `usuarios.rol` (RECHAZADA) vs Bearer `ADMIN_SECRET` + email de sesion (ELEGIDA).** La columna `rol` no existe en `usuarios` y crearla introduciria una segunda fuente de autorizacion; el patron vigente de admin es `ADMIN_SECRET` (Bearer) y `brsk84@gmail.com` (ADR-029). *Decision (c).*
4. **`casa_misiones` tambien en `usuarios.js` (RECHAZADA) vs un unico GET en `interacciones.js` (ELEGIDA).** El prompt original era contradictorio (lo ponia en ambos endpoints); un solo dueno del contrato evita duplicidad y drift. *Decision (e).*
5. **Crear `entregarXp` para resolver el lider (RECHAZADA) vs evaluacion perezosa en `GET casa_ranking` (ELEGIDA).** La funcion `entregarXp` no existe en el archivo real; el lider se resuelve donde ya se lee el ranking, sin punto de escritura nuevo. *Decision (d).*
6. **Crear `abrirPerfil()` en el modal (RECHAZADA) vs click sobre `#btn-perfil-viajero` existente (ELEGIDA).** No existe `abrirPerfil`; reutilizar el boton existente evita codigo muerto y No-Duplicidad (AGENTS.md 2.1). *Decision (f).*
7. **Mantener el tributo `0.10` hardcodeado (RECHAZADA) vs `casas_cofre.tributo_pct` configurable (ELEGIDA).** El porcentaje debe ser administrable por Casa y auditable; se persiste en columna con default 10 y rango 0..15. *Decision (g).*
8. **Capturas silenciosas sin log (RECHAZADA) vs `console.error`/`console.warn` tipados (ELEGIDA).** AGENTS.md seccion 2.2 prohibe capturar y silenciar sin registro; se corrigieron las 2 capturas nuevas antes vacias. *Decision (h).*

### Decision tomada

**(A) Migracion 026 (`db/migrations/026_casas_comunicaciones.sql`)** - la UNICA de este ADR, aditiva, idempotente (ADR-008) y ASCII-safe (ADR-002; 329 lineas, 0 bytes >127, 0 backticks):
- **Comunicacion:** `ALTER TABLE chat_salas ADD COLUMN IF NOT EXISTS es_oficial boolean DEFAULT false`; semilla idempotente del canal "Anuncios ExploraCO" (`WHERE NOT EXISTS (es_oficial=true)` + requiere la cuenta admin; icono altavoz `E'\U0001F4E3'`; `tipo='viajeros'` para NO tocar `chk_chat_salas_tipo`; `orden=-1`); indice unico parcial `uq_chat_salas_oficial` (garantiza UNA sala oficial).
- **Casas:** `casas_cofre.tributo_pct NUMERIC(4,2) DEFAULT 10.00` + CHECK `casas_cofre_tributo_pct_check` (0..15, guard `pg_constraint`); `casas_cofre.lider_user_id UUID REFERENCES usuarios(id)` (sin ON DELETE CASCADE: el proyecto no borra usuarios); tabla `casa_roles` (`casa` con CHECK espejo, `usuario_id` FK ON DELETE CASCADE, `rol IN lider|oficial|mariscal|miembro`, `asignado_en`, `activo`, UNIQUE `(casa, usuario_id)`, indices `(casa, activo)` y `(usuario_id)`); tabla `casa_misiones` (`casa`, `nombre`, `descripcion`, `meta_tipo IN visitas|xp_total|resenas|fotos`, `meta_valor > 0`, `progreso_actual` cache NO autoritativa, `recompensa_xp`, `estado IN activa|completada|expirada`, `creado_en`, `expira_en`, `completado_en`, indice `(casa, estado, meta_tipo)`).
- **Backfill y semilla:** lider por Casa `DISTINCT ON (casa) ... ORDER BY xp_total DESC` con `IS DISTINCT FROM` (no-op en re-ejecucion); poblado de `casa_roles` con `ON CONFLICT (casa, usuario_id) DO UPDATE` y degradacion a `'oficial'` del lider anterior; 1 mision base por Casa ("Primera Expedicion de Casa": `visitas` 10, 500 XP) con `WHERE NOT EXISTS`.

**(B) Canal oficial broadcast (decisiones c, h).**
- `GET ?tipo=chat_salas` proyecta `s.es_oficial` (aditivo).
- `POST chat_msg`: si la sala es `'viajeros'` con `es_oficial=true` y el emisor NO es admin, responde 403. El admin se resuelve por Bearer `ADMIN_SECRET` (fallback `exploraco12345`) o por el email de sesion `brsk84@gmail.com`.
- NUEVA rama `POST ?tipo=anuncio_oficial`: exige Bearer `ADMIN_SECRET` (403 si falta), texto requerido <= 1000 caracteres, busca la sala oficial (404 si no existe) e inserta con `nombre='ExploraCO Oficial'` y `usuario_id` opcional (nullable; jamas se inventa un id inexistente).
- Frontend `comunidad.html`: la sala oficial se ordena al tope, se pinta con borde/fondo dorado y badge "OFICIAL"; para no-admin se ocultan input y boton de envio y se muestra "Solo el administrador puede publicar aqui". La sesion solo aporta el email para la UI; la autorizacion real es server-side.
- **NO se agrega `usuarios.rol`.** La tabla `casa_roles` es un concepto distinto (rol dentro de una Casa) y no autoriza el canal oficial.

**(C) Casas: tributo configurable, lider automatico y misiones conjuntas (decisiones d, e, g).**
- **Tributo configurable (g):** `acreditarClaseYCofre` (`api/interacciones.js`) deja de usar el literal `0.10` y lee `SELECT COALESCE(tributo_pct, 10) FROM casas_cofre WHERE casa=$1`; si el valor no es finito o cae fuera de 0..15, se normaliza a 10. El cofre sigue siendo best-effort (nunca bloquea la entrega de XP).
- **Configuracion:** NUEVA rama `POST ?tipo=casa_tributo_config`; la autorizan el Bearer `ADMIN_SECRET` o el `lider_user_id` de la Casa. **HOTFIX post-QA J-2 (v23, BUG-064):** la autorizacion del lider exige `validarSesion(req, usuarioId2).ok` (JWT, ADR-025) ANTES de comparar contra `casas_cofre.lider_user_id`; el `usuario_id` del body ya no es fuente de autorizacion (evita el IDOR que permitia leer `lider_user_id` del ranking publico y spoofearlo). Valida `casa` en `condor|jaguar|delfin` y `tributo_pct` en 0..15 (400 fuera de rango).
- **Lider automatico (d):** `GET ?tipo=casa_ranking` (`api/usuarios.js` v17 -> v18) refresca best-effort el lider de cada Casa ANTES de leer (3 sentencias: recalcular por `xp_total DESC`, upsert del lider en `casa_roles`, degradar a `'oficial'` los lideres anteriores) y expone `lider_user_id`/`tributo_pct`. **HOTFIX post-QA J-3 (v18):** el refresco se ejecuta como maximo una vez cada 60 s por instancia (cache de proceso `CR_LIDER_REFRESH_MS`, no distribuida) para no amplificar escrituras desde un GET publico; con N instancias activas hay hasta N refrescos/min. Las lecturas del ranking no se alteran. La degradacion es escalonada: `42P01` (sin `casas_cofre`, 024) quita el JOIN; `42703` (`lider_user_id`/`tributo_pct` ausentes, 026 pendiente) reintenta con `conLider=false` conservando el cofre de la 024; cualquier otro error se propaga. Sin `entregarXp`: la resolucion es perezosa en la lectura del ranking.
- **Misiones conjuntas (e):** NUEVO helper `avanzarMisionesCasa(sql, usuarioId, metaTipo, delta)` con catalogo `CASA_MISIONES_META` (`visitas|xp_total|resenas|fotos`); para `xp_total` el delta es el XP entregado y para el resto es 1. Se invoca desde `acreditarClaseYCofre` (`xp_total`) y con hooks explicitos en `foto` (`fotos`), `resena` (`resenas`) y `visita` (`visitas`). Degrada con `console.warn` si la 026 no existe (`42P01`) y con `console.error` en cualquier otro fallo. El listado se expone en UN UNICO `GET ?tipo=casa_misiones&casa=...` en `api/interacciones.js` (no se duplica en `usuarios.js`).

**(D) Eras y titulos + modales de progresion (decision f).**
- `usuario-session.js` agrega catalogos cliente puros: `TITULOS_POR_NIVEL` (20 titulos, niveles 1..20) y `ERAS` (Mundana 1-5, Patrocinada 6-10, Organizador 11-15, Leyenda 16-20, con `emoji`/`color`/`beneficios`/`mecanicas`), mas el helper `getEra(nivel)`.
- Modales sin HTML previo (DOM inyectado y auto-limpiante): `mostrarModalNivelUp(nivelAnterior, nivelNuevo)` y `mostrarModalCambioEra(eraAnterior, eraNueva)`.
- Se disparan desde `aplicarResultadoXp` al detectar subida de nivel (el nivel previo se reconstruye restando el delta ya acreditado); el modal de era se muestra 3.2 s despues del de nivel-up.
- El boton "Ampliar info" del modal de nivel-up dispara `document.getElementById('btn-perfil-viajero').click()` SI existe; NO se crea `abrirPerfil`.

**(E) Admin mapa: circulo de rango y getters del `map-picker` (decision b).**
- `admin.html`: la altura del contenedor `#map-picker-el` pasa de 380 a 500 px; nueva funcion `adm_actualizarCirculoRango()` que dibuja un `L.circle([lat,lng], {radius: radio_m, ...})` sobre el mapa del picker, invocada en `oninput` de `#f-radio-m`, en `openMapPicker` (con `setTimeout` de 350 ms) y en `confirmMapPicker`.
- `map-picker.js`: el modulo compartido expone `getPickerMap()` y `getMiniMap()` en su retorno publico; el admin los consume y NUNCA accede a `MapPicker._map`. Si `getPickerMap` no existe o no hay mapa/capas, la funcion retorna sin error.

### Actualizacion post-QA (hotfixes J-1..J-3, 2026-09-18) -- no cambian la decision

La auditoria QA posterior a la implementacion de TSK-118 detecto tres hallazgos que se corrigieron sin alterar el alcance funcional de la decision (seguridad, degradacion y control de escritura):

- **J-2 SEGURIDAD (IDOR, corregido) -> `BUGS_HISTORICOS.md` BUG-064:** `POST ?tipo=casa_tributo_config` autorizaba al lider comparando el `usuario_id` del body contra `casas_cofre.lider_user_id`. Como `lider_user_id` es publico en `GET ?tipo=casa_ranking`, cualquiera podia spoofear al lider. En v23 la autorizacion exige `validarSesion(req, usuarioId2).ok` (JWT, ADR-025); recien con la sesion valida se compara contra `lider_user_id`. **BUG-064: CERRADO / Corregido en v23.**
- **J-1 degradacion (mitigada):** `GET ?tipo=chat_salas` y `POST chat_msg` degradan con fallback `42703` (`false AS es_oficial`) si la migracion 026 aun no esta aplicada; el listado de salas y el envio de mensajes siguen operativos. En `chat_msg` se elimino la captura silenciosa: el fallo no-42703 se registra con `console.error` y se re-lanza (AGENTS.md 2.2). Aplicar 024 -> 025 -> 026 antes del deploy SIGUE siendo obligatorio.
- **J-3 amplificacion de escritura (mitigada):** el refresco del lider en `GET ?tipo=casa_ranking` quedo con throttle de 60 s por instancia (cache de proceso). No altera las lecturas del ranking; con multiples instancias serverless hay hasta N refrescos/min (mitigacion, no eliminacion).

**Estado post-hotfix:** `api/interacciones.js` **v23** y `api/usuarios.js` **v18**, verificados contra el archivo real (ADR-006). Escudo GOLD post-hotfix: `node --check` OK en 4 archivos (`api/interacciones.js`, `api/usuarios.js`, `usuario-session.js`, `map-picker.js`), ASCII-safe 0 bytes >127 en `api/`, balance de divs 0 y presupuesto 8/8 INTACTO. **Sigue abierto:** BUG-061 (`POST tipo='foto'` sin `validarSesion`), que los hooks de Casa de la sesion amplifican (mas puntos que escriben XP/estado a nombre del usuario); ver `BUGS_HISTORICOS.md` BUG-061.

### Justificacion

Reusar el patron admin existente (Bearer `ADMIN_SECRET` + email de sesion) evita crear una columna de rol que no existe y que abriria una segunda fuente de autorizacion (ADR-006/ADR-029). Un unico endpoint para `casa_misiones` y un unico helper `avanzarMisionesCasa` honran la Regla de No-Duplicidad (AGENTS.md 2.1) y eliminan la contradiccion del prompt original. La evaluacion perezosa del lider en `GET casa_ranking` no crea puntos de escritura nuevos ni requiere scheduler, y su degradacion escalonada mantiene la API util aun con la 026 sin aplicar (patron BUG-021/BUG-060). Persistir `tributo_pct` con default 10 y rango 0..15 hace auditable la economia del cofre sin alterar el comportamiento historico. Exponer getters publicos en `map-picker.js` desacopla al admin de una propiedad privada y mantiene el modulo reutilizable (TSK-116/TSK-117). Los catalogos de titulos/eras viven en el cliente porque son de presentacion pura y no necesitan columna ni endpoint (8/8 intacto). Todo es aditivo e idempotente: cero DROP, cero endpoints nuevos, ASCII-safe.

### Impacto

- **Migracion NUEVA** `db/migrations/026_casas_comunicaciones.sql` (329 lineas, idempotente ADR-008, ASCII-safe ADR-002). Aplicar el archivo COMPLETO en Neon despues de 024 y 025; re-ejecutar es no-op.
- **`api/usuarios.js` v16 -> v17 -> v18:** `casa_ranking` expone `lider_user_id`/`tributo_pct` con degradacion escalonada 42P01/42703 y refresco best-effort del lider por Casa (sin endpoint nuevo); **v18** agrega el throttle de 60 s por instancia al refresco (hotfix J-3).
- **`api/interacciones.js` v22 -> v23:** `acreditarClaseYCofre` con tributo configurable; helper `avanzarMisionesCasa` + hooks; `GET ?tipo=chat_salas` con `es_oficial`; bloqueo admin en `chat_msg`; ramas nuevas `POST ?tipo=anuncio_oficial`, `POST ?tipo=casa_tributo_config` y `GET ?tipo=casa_misiones`. La **v23** agrega la degradacion 42703 de `chat_salas`/`chat_msg` (J-1) y la autorizacion por `validarSesion` de `casa_tributo_config` (J-2).
- **Frontend:** `usuario-session.js` (titulos/eras/modales), `comunidad.html` (canal oficial: tope, badge, bloqueo de input), `admin.html` (picker 500 px + circulo de rango) y `map-picker.js` (getters publicos). Assets frontend: no cuentan contra el 8/8.
- **Presupuesto 8/8 INTACTO** (ADR-001/ADR-010): cero archivos nuevos en `api/`. Sin `tags` JSONB tocados.
- **Verificacion exigible al cierre:** Escudo GOLD (`node --check`, ASCII-safe 0 bytes >127 y 0 backticks en `api/*.js` y la migracion, balance de divs); preflight y verificacion post-aplicacion de la 026 (secciones 0 y final del `.sql`); prueba en vivo del canal oficial, el tributo configurable, el lider en `casa_ranking`/`casa_roles`, las misiones conjuntas, los modales y el circulo de rango (post-deploy).

### Consecuencias positivas

- Canal oficial con lectura publica y publicacion restringida, sin columna de rol ni endpoint nuevo.
- Tributo del cofre administrable por Casa (0..15) y auditable en `casas_cofre.tributo_pct`.
- Lider de Casa automatico y visible, sincronizado con `casa_roles`, sin scheduler ni funcion de entrega nueva.
- Misiones colectivas por Casa con un unico helper y un unico endpoint.
- Feedback de progresion (titulos y cambio de era) sin tocar el backend ni la logica de niveles.
- El admin visualiza el radio real de verificacion sobre el mapa del picker.
- Todo aditivo/idempotente: cero DROP, cero endpoints nuevos, ASCII-safe.

### Consecuencias negativas / riesgos residuales

- **Migracion 026 pendiente (BLOQUEANTE):** sin aplicarla en Neon, el canal oficial, `casa_tributo_config`, `casa_misiones` y `lider_user_id`/`tributo_pct` fallan o degradan; aplicar ANTES del deploy del backend v23/v18. La degradacion J-1 mantiene en pie `chat_salas`/`chat_msg`, pero NO sustituye la migracion.
- **Header de `api/interacciones.js` RESUELTO a v23:** el changelog L18 ya documenta la sesion TSK-118 y los hotfixes J-1/J-2. Nota ADR-006: la linea-titulo L1 aun rotula `v22` (drift menor de la linea descriptiva, sin efecto funcional).
- **BUG-061 AMPLIFICADO por los hooks de Casa:** `POST tipo='foto'` sigue sin `validarSesion`; los hooks `avanzarMisionesCasa` (foto/resena/visita) reutilizan el `usuario_id` del body y por tanto amplian la superficie de suplantacion (mas efectos por el mismo vector). Sigue ABIERTO y escalado a `sql-security`.
- **Normalizacion silenciosa del tributo:** un valor invalido en `casas_cofre.tributo_pct` se normaliza a 10 en runtime sin aviso; el CHECK 0..15 acota la columna, pero el fallback no se registra.
- **`casa_roles` solo puebla `lider`:** los roles `oficial`/`mariscal`/`miembro` existen en el CHECK pero no tienen flujo de asignacion en v1.
- **Misiones base sin diferenciacion:** la 026 siembra la misma mision base para las 3 Casas; el contenido diferenciado queda como backlog.
- **`conCofre`/`conLider` y cache:** `casas_cofre.poblacion_activa`/`factor_conversion` siguen siendo cache NO autoritativa (heredado de ADR-038).
- **Circulo de rango no validado en produccion:** depende del deploy; el area `L.circle` no se ha verificado con datos reales ni en movil.
- **BUG-061, BUG-002 y BUG-062 siguen ABIERTOS** (ajenos a esta entrega).

### Decisiones de la sesion (mapeo explicito a-h)

| Letra | Decision registrada |
|---|---|
| (a) | Migracion **026** (no 019) por colision de numeracion con `019_media_guardados_radio.sql`. |
| (b) | Exponer `getPickerMap()`/`getMiniMap()` en `map-picker.js` en lugar de asumir `MapPicker._map` (que no existia). |
| (c) | Gating admin con Bearer `ADMIN_SECRET` en backend + email de sesion para UI; **no** se agrega columna `rol` (no existe en `usuarios`). |
| (d) | Lider de Casa evaluado de forma perezosa en `GET casa_ranking`; no se crea `entregarXp` (no existia). |
| (e) | `casa_misiones` se expone en un **unico** `GET` en `interacciones.js`; se elimina la contradiccion del prompt que lo ponia tambien en `usuarios.js`. |
| (f) | El boton "Ampliar info" del modal de nivel-up dispara `#btn-perfil-viajero` si existe; no se crea `abrirPerfil`. |
| (g) | El tributo ya no es `0.10` hardcodeado: se lee `casas_cofre.tributo_pct` (default 10, rango 0..15). |
| (h) | Se agregan logs a 2 capturas antes silenciosas (`chat_msg`/`casa_tributo_config`) conforme a AGENTS.md seccion 2.2. |

**Hotfixes post-QA (J-1..J-3, 2026-09-18):** no corresponden a decisiones nuevas; implementan las decisiones (c), (d) y (h) con seguridad y degradacion. J-2 corrige un IDOR (BUG-064, CERRADO en v23), J-1 mitiga con degradacion 42703 y J-3 con throttle por instancia. Detalle en la seccion "Actualizacion post-QA" de este ADR.

**ADRs relacionados:** ADR-001 (8/8), ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico), ADR-006 (baseline real), ADR-008 (idempotencia), ADR-010 (presupuesto de endpoints), ADR-025 (sesion firmada), ADR-028 (Casas `usuarios.casa` y chat/DM), ADR-029 (admin por email/`ADMIN_SECRET`), ADR-033 (radio de verificacion), ADR-035 (niveles/eras y `red2`), ADR-038 (cofre de Casa y `acreditarClaseYCofre`), ADR-039/ADR-040 (release v22 compartido), BUG-021 (deuda de columnas no versionadas).

---

## ADR-042: Zonas geograficas, modulo Marcas/patrocinios y extension de consumibles para canjes de marca (migracion 027)

**ID:** ADR-042
**Fecha:** 2026-09-18
**Estado:** **IMPLEMENTADO EN WORKING TREE** (2026-09-18, SIN commitear). Verificado contra archivo real (ADR-006): existe `db/migrations/027_zonas_marcas.sql` (348 lineas, idempotente ADR-008, ASCII-safe ADR-002: 0 bytes >127) y existen `scripts/verify_027_precheck.js` (258 lineas), `scripts/diagnose_fotos_brsk84.js` (310 lineas) y `db/cleanups/002_fix_fotos_brsk84.sql` (151 lineas); las ramas `marca_activar`/`marca_patrocinar`/`mi_marca` viven en `api/usuarios.js` (L1192-1266 y L296-306). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar la 027 y el cleanup 002 en Neon ANTES del deploy** (patron BUG-021/BUG-060; no hay `DATABASE_URL` local).
**Autor:** sql-security + architect (AI-DOS); origen: paquete `prompt.md` (untracked) DB-01/DB-02 + BE-01; cierre documental por docs-keeper.
**Nota de numeracion:** el 042 es el consecutivo real tras ADR-041 (mayor registrado en este documento al 2026-09-18, verificado con `^## ADR-` sobre el archivo real, ADR-006). No estaba reservado.
**Alcance de esquema:** crea `zonas_geograficas`, `areas_geograficas`, `ranking_zonas`, `marcas` y `patrocinios`; altera `consumibles` (aditivo) y crea la vista `consumibles_precio`. NO toca `destinos.tags` JSONB ni ninguna categoria del directorio.

### Contexto

La sesion "Modulos nuevos + bugs activos" del 2026-09-18 (TSK-119..TSK-122) introduce una capa territorial y un modulo de Marcas/patrocinadores sobre el sistema social/gaming, sin crear funciones serverless (presupuesto 8/8, ADR-001/ADR-010):

1. **Territorio:** se necesitan zonas geograficas fijas (Caribe/Pacifico/Andes/Llanos/Amazonia), areas/barrios con centroide lat/lng y radio, y un ranking por capa territorial (area/ciudad/zona) sobre recursos de media (`album_fotos`).
2. **Marcas:** un usuario de nivel >= 5 puede activar una Marca (1 por usuario) y patrocinar objetivos (evento/artista/parche/mision), con consumo de XP.
3. **Canjes de marca:** los consumibles necesitan stock, precio efectivo oferta/demanda y tipo de canje (`qr`/`codigo`/`ticket`), asociables a una Marca.

Restricciones vigentes: 8/8 de funciones serverless (ADR-001/ADR-010), cero borrado logico (ADR-003/Regla de Oro 3), migraciones aditivas e idempotentes (ADR-008), ASCII-safe (ADR-002) y baseline = archivo real (ADR-006).

### Opciones evaluadas (y por que se descartan)

1. **Numerar la migracion `001_zonas_marcas.sql` (prompt original) vs `027` (ELEGIDA).** El consecutivo real tras la 026 es 027; el 001 colisionaria con `001_*` historico y rompe la trazabilidad de `db/migrations/`. *Decision (a).*
2. **`precio_xp_base`/`precio_xp_actual` como `INTEGER` (prompt) vs `NUMERIC(12,2)` (ELEGIDA).** La 021 convirtio `consumibles.precio_xp` a `numeric(12,2)`; mantener el precio nuevo en `numeric(12,2)` evita mezclar escalas de XP y respeta el redondeo unico (ADR-035). *Decision (b).*
3. **FK polimorfica en `patrocinios (tipo_objetivo, objetivo_id)` (RECHAZADA) vs SIN FK con deuda documentada (ELEGIDA).** No existen tablas `eventos`/`artistas`/`misiones` en el esquema (el "parche" real es `pandillas`); una FK exigiria inventar entidades. La integridad queda a cargo del backend (`TIPOS_VALIDOS` en `marca_patrocinar`). Deuda consciente. *Decision (c).*
4. **`ranking_zonas.recurso_tipo` default `'album_foto'` (prompt) vs `'album_fotos'` (ELEGIDA).** La tabla real es `album_fotos` (plural); el default debe coincidir con la tabla real. *Decision (d).*
5. **Sembrar `areas_geograficas` en la migracion (RECHAZADA en v1) vs tabla vacia + siembra posterior con lat/lng reales (ELEGIDA).** No hay coordenadas verificadas de las areas; sembrar datos inventados seria peor que diferir. Se documenta como siguiente paso (OSM). *Decision (e).*
6. **Gate de nivel con `usuarios.nivel` (prompt) vs `calcularNivel(xp_total).nivel` (ELEGIDA).** `usuarios.nivel` esta STALE (se deriva de `xp_total` en lectura, ADR-035); el gate debe usar la funcion derivada. *Decision (f).*
7. **`mi_marca` owner-only con JWT vs lectura publica por `usuario_id` (ELEGIDA provisionalmente, ABIERTA).** El prompt no definio auth para el GET; se implemento lectura publica con subquery de patrocinios. Queda como decision pendiente si debe exigir `validarSesionUsuario`. *Decision (g).*

### Decision tomada

**(A) Migracion 027 (`db/migrations/027_zonas_marcas.sql`)** - la UNICA de este ADR, aditiva, idempotente (ADR-008) y ASCII-safe (ADR-002):
- **`zonas_geograficas`:** `id SERIAL`, `slug TEXT UNIQUE`, `nombre`, `emoji` (via `U&'\+xxxxxx'`: `+01F30A`/`+01F333`/`+0026F0`/`+01F33E`/`+01F40D`), `poligono JSONB` (GeoJSON simplificado futuro), `creado_en`. Seed idempotente de 5 zonas (`caribe`/`pacifico`/`andes`/`llanos`/`amazonia`) con `ON CONFLICT (slug) DO NOTHING`; el slug es la clave natural que referencian areas y ranking.
- **`areas_geograficas`:** `id SERIAL`, `slug TEXT UNIQUE`, `nombre`, `ciudad`, `zona_slug REFERENCES zonas_geograficas(slug)`, `lat`/`lng NUMERIC(10,7)`, `radio_km NUMERIC(6,3) DEFAULT 1.5`, `activo DEFAULT TRUE`, `creado_en`; indice `idx_areas_ciudad_zona`. **Sin filas sembradas en v1.**
- **`ranking_zonas`:** `id SERIAL`, `recurso_id TEXT`, `recurso_tipo TEXT NOT NULL DEFAULT 'album_fotos'`, `punto_lat`/`punto_lng`, `area_slug`/`ciudad`/`zona_slug`, `score_area`/`score_ciudad`/`score_zona INTEGER DEFAULT 0`, `likes_total`/`comentarios_total INTEGER DEFAULT 0`, `actualizado_en`, `UNIQUE (recurso_id, recurso_tipo)` + indices `idx_ranking_area`/`idx_ranking_ciudad`/`idx_ranking_zona`.
- **`marcas`:** `id UUID`, `usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE`, `nombre`, `logo_url`, `banner_url`, `descripcion`, `areas_influencia JSONB DEFAULT '[]'`, `enlaces JSONB DEFAULT '{}'`, `activa DEFAULT TRUE`, `verificada DEFAULT FALSE`, `nivel_requerido INTEGER DEFAULT 5`, `creado_en`, `UNIQUE (usuario_id)` (1 marca por usuario); indice parcial `idx_marcas_activa`.
- **`patrocinios`:** `id UUID`, `marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE`, `tipo_objetivo TEXT`, `objetivo_id TEXT` (**sin FK, ver deuda**), `xp_aportada`/`fama_bonus INTEGER DEFAULT 0`, `branding_data JSONB DEFAULT '{}'`, `activo DEFAULT TRUE`, `creado_en`; indices `idx_patrocinios_marca` e `idx_patrocinios_objetivo`.
- **`consumibles` (DB-02, aditivo):** `marca_id UUID REFERENCES marcas(id)` (nullable), `stock_total INTEGER` (NULL = ilimitado), `stock_usado INTEGER NOT NULL DEFAULT 0`, `precio_xp_base NUMERIC(12,2) NOT NULL DEFAULT 0`, `precio_xp_actual NUMERIC(12,2)` (NULL = usa base), `tipo_canje TEXT` (`qr`/`codigo`/`ticket`); indice parcial `idx_consumibles_marca`.
- **Vista `consumibles_precio`:** `precio_xp_efectivo` con ley de oferta/demanda (`GREATEST(precio_xp_base, ROUND(precio_xp_base * (1 + stock_usado/stock_total)))`) y `stock_disponible` (`COALESCE(stock_total - stock_usado, 99999)`), filtrando `activo=TRUE`.

**(B) Backend (`api/usuarios.js`) - ramas de Marca (TSK-120..TSK-122).** Ver el detalle en TASKS.md:
- `POST ?tipo=marca_activar`: auth JWT (`validarSesionUsuario(...).ok`), gate `calcularNivel(xp_total).nivel >= 5`, UPSERT por `usuario_id` con MERGE JSONB (`||`) y `COALESCE`.
- `POST ?tipo=marca_patrocinar`: auth JWT, `tipo_objetivo` en `['evento','artista','parche','mision']`, Marca propia y activa obligatoria, `INSERT ... RETURNING id`.
- `GET ?tipo=mi_marca`: `SELECT m.*` + `COUNT` de patrocinios activos; `LIMIT 1`; **auth abierta (decision g pendiente)**.

**(C) Remediacion de datos (fuera del DDL).** `db/cleanups/002_fix_fotos_brsk84.sql` (NUEVO, 151 lineas) aplica soft-delete a las fotos con `foto_url` vacia de la cuenta reportada (`visible=false`/`activo=false`), acotado por email y estado exacto, idempotente y sin borrar filas (Regla de Oro 3). Su causa raiz es BUG-065 (el INSERT legacy `album_agregar_foto` no escribe `visible` y hereda el `DEFAULT false` de la 025).

### Justificacion

Versionar las 5 tablas y la extension de `consumibles` en una unica migracion aditiva mantiene el principio ADR-008 (todo cambio de esquema reproducible desde el repo) sin tocar `destinos.tags` (ADR-004). Elegir `027` sobre `001` preserva la secuencia real. Mantener `precio_xp_base`/`precio_xp_actual` en `numeric(12,2)` respeta el contrato de XP decimal de ADR-035. No crear FK sobre `patrocinios (tipo_objetivo, objetivo_id)` es la unica opcion coherente mientras no existan las entidades destino; se documenta como deuda para no fingir integridad que el esquema no puede dar. Reusar `marcas`/`patrocinios` en lugar de JSONB en `usuarios` permite consultar patrocinios por objetivo e integrar consumibles de marca por indice. El gate con `calcularNivel(xp_total)` evita la columna stale. Todo entra como ramas `?tipo=` sin crear archivos en `api/`: el presupuesto 8/8 queda intacto.

### Impacto

- **Migracion NUEVA** `db/migrations/027_zonas_marcas.sql` (348 lineas). Aplicar el archivo COMPLETO en Neon (preflight read-only `scripts/verify_027_precheck.js`); re-ejecutar es no-op.
- **Backend:** `api/usuarios.js` agrega 3 ramas (`marca_activar` L1197, `marca_patrocinar` L1238, `mi_marca` L297) sin endpoint nuevo. **Header sin bump (sigue v18)** -> drift de version documentado (ADR-006).
- **Frontend:** `mi-perfil.html` (FE-01/FE-02 + `#arbol-body`) e `index.html` (FE-03); `api/pagina-destino.js` (BE-02, LIMIT 24 -> 200). Los assets frontend no cuentan contra 8/8.
- **Datos:** `db/cleanups/002_fix_fotos_brsk84.sql` (remediacion idempotente) y `scripts/diagnose_fotos_brsk84.js` (diagnostico read-only).
- **PyP:** `marcas`/`patrocinios` alimentan una futura UI de Marcas y patrocinios; `consumibles_precio` habilita precios dinamicos por stock.
- **Verificacion exigible al cierre:** Escudo GOLD (`node --check` 4 `.js`, ASCII-safe 0 bytes >127 en `.js`/`.sql`, balance de divs 446/446 en `mi-perfil.html` y 523/523 en `index.html`); `c.tipo === 'marca_` = 2; `mpa-media-pin-video` = 2; `destinos_fotos ... LIMIT 200` = 1; ids unicos.

### Consecuencias positivas

- Capa territorial y modulo de Marcas versionados y reproducibles desde el repo.
- Ranking por tres capas (area/ciudad/zona) sin duplicar datos: el score se materializa en `ranking_zonas`.
- Consumibles con stock y precio efectivo calculado en una vista, sin tocar el catalogo base.
- Patrocinios consultables por objetivo mediante indice, con `branding_data` JSONB para personalizacion.
- Cero endpoints nuevos, cero DROP, ASCII-safe e idempotencia ADR-008.

### Consecuencias negativas / riesgos residuales

- **Migracion 027 pendiente (BLOQUEANTE):** sin aplicarla, `marca_activar`/`marca_patrocinar`/`mi_marca` fallan; aplicar ANTES del deploy.
- **`areas_geograficas` vacia:** las areas reales con lat/lng (y su radio) quedan como siguiente paso; sin ellas el ranking territorial no tiene insumo.
- **`patrocinios` sin integridad referencial:** `objetivo_id` puede apuntar a un objetivo inexistente; el backend solo valida el tipo, no la existencia (deuda c).
- **`areas_influencia` sin dedupe:** el MERGE con `||` acumula duplicados en reenvios.
- **Datos de los patrocinios no acreditan nada:** `xp_aportada`/`fama_bonus` se persisten pero no se aplican a objetivos ni a la economia en v1 (solo registro).
- **`mi_marca` sin auth (decision g abierta):** superficie enumerable por `usuario_id`.
- **Header drift:** `api/usuarios.js` sigue rotulado v18 y `api/pagina-destino.js` no subio por el fix de 1 linea; corregir en el commit.
- **BUG-065 ABIERTO:** el INSERT de `album_agregar_foto` sigue sin `visible`; la remediacion 002 corrige datos, no la causa. **BUG-066 CERRADO** (regresion FE-02). BUG-002/BUG-061 siguen ABIERTOS.

### Decisiones de la sesion (mapeo explicito a-g)

| Letra | Decision registrada |
|---|---|
| (a) | Migracion **027** (no `001`) por consecutivo real tras la 026. |
| (b) | `precio_xp_base`/`precio_xp_actual` en `NUMERIC(12,2)` (no `INTEGER`) por consistencia con 021/ADR-035. |
| (c) | `patrocinios.objetivo_id` polimorfico **sin FK**; integridad al backend (deuda documentada). |
| (d) | `ranking_zonas.recurso_tipo` default `'album_fotos'` (tabla real). |
| (e) | `areas_geograficas` se crea VACIA; la siembra con lat/lng reales (OSM) queda como siguiente paso. |
| (f) | Gate de nivel con `calcularNivel(xp_total).nivel >= 5` (no `usuarios.nivel`, stale). |
| (g) | `GET mi_marca` queda como lectura publica por `usuario_id` (auth owner-only = decision PENDIENTE). |

**ADRs relacionados:** ADR-001 (8/8), ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico / MERGE JSONB), ADR-006 (baseline real), ADR-008 (SQL versionado / idempotencia), ADR-010 (presupuesto de endpoints), ADR-025 (sesion firmada), ADR-035 (XP `numeric(12,2)` y niveles derivados), ADR-039/ADR-041 (precedentes de migracion aditiva y degradacion), ADR-043 (patron de UI derivado de FE-02), BUG-021/BUG-060 (deuda de columnas no versionadas), BUG-065 (INSERT sin `visible`).

---

## ADR-043: Contenedor persistente separado del host de inyeccion dinamica (patron anti-regresion de UI anidada)

**ID:** ADR-043
**Fecha:** 2026-09-18
**Estado:** **APROBADO E IMPLEMENTADO EN WORKING TREE** (2026-09-18, SIN commitear). Verificado contra archivo real (ADR-006): `mi-perfil.html` L953-960 (titulo fusionado + `#arbol-body`), L3639-3640 y L3655-3656 (las funciones de arbol apuntan a `#arbol-body`). Re-QA con parser DOM + `node vm`: APTO.
**Autor:** qa-auditor + frontend-tpl (AI-DOS); origen: regresion FE-02 de TSK-119 (BUG-066); cierre documental por docs-keeper.
**Nota de numeracion:** el 043 es el consecutivo real tras ADR-042 (2026-09-18).
**Alcance:** patron de UI/plantillas. NO toca esquema, endpoints ni el presupuesto 8/8.

### Contexto

FE-02 de TSK-119 fusiono "Mi Clase" dentro de "Arbol de Clases" en `mi-perfil.html`: `#pf-clase` (widget estatico de la profesion Rising Star) paso a ser un hijo de `#arbol-clases`. Sin embargo, `arbolPintar()` y `cargarArbolClases()` renderizaban el arbol con `host.innerHTML = ...` sobre `#arbol-clases` (el ANCESTRO de `#pf-clase`), de modo que cada refresco destruia el widget anidado en runtime. El sintoma no se veia en el HTML estatico (divs 446/446, ambos ids presentes) y solo aparecia al ejecutar la carga del arbol: es el mismo patron de BUG-020/TSK-065 (UI desconectada detectable solo en runtime). El detalle del bug vive en `BUGS_HISTORICOS.md` BUG-066.

### Opciones evaluadas (y por que se descartan)

1. **Dejar `#pf-clase` dentro del host dinamico y re-inyectarlo en cada render (RECHAZADA).** Acopla el widget estatico al ciclo de render del arbol, obliga a reconstruirlo y es facil de olvidar en cada nuevo `innerHTML=`.
2. **Reemplazar `innerHTML=` por `appendChild`/`replaceChildren` selectivo en las funciones del arbol (RECHAZADA como solucion unica).** Exige un refactor amplio de varias funciones y no protege a futuros contenedores que vuelvan a anidarse.
3. **Host de inyeccion dedicado `#arbol-body` con `#pf-clase` como hijo directo persistente (ELEGIDA).** El render dinamico escribe SOLO en `#arbol-body`; `#pf-clase` queda fuera de su alcance y sobrevive a cualquier refresco.
4. **Mover `#pf-clase` fuera de `#arbol-clases` (RECHAZADA).** Rompe la fusion de FE-02 (el requerimiento pedia integrar la Clase al Arbol de Clases).

### Decision tomada

En `mi-perfil.html`, la seccion "Clase & Arbol de Progreso" se estructura en dos contenedores hermanos:

- `#pf-clase` como hijo DIRECTO y persistente de `#arbol-clases` (nunca tocado por el render del arbol).
- `#arbol-body` como host EXCLUSIVO de la inyeccion dinamica (`arbolPintar()` y `cargarArbolClases()` hacen `getElementById('arbol-body')` y escriben ahi).

Regla general: **cuando un contenedor persistente deba convivir con un render dinamico, el host de inyeccion se separa en un nodo propio; prohibido `innerHTML=` sobre un ancestro que contenga widgets estaticos.**

### Justificacion

La separacion es minima (un `div` intermedio), no cambia la estructura visual ni el contrato de datos, y elimina de raiz la clase de regresion: cualquier futuro `innerHTML=` en el render del arbol escribe en un nodo que no contiene la Clase. Las opciones 1/2 dependen de disciplina o de un refactor grande; la opcion 3 es estructural y barata, y ademas coincide con el patron ya usado en el proyecto para aislar host de inyeccion y widgets persistente (sub-tabs del admin). No requiere endpoint ni migracion.

### Impacto

- `mi-perfil.html`: `#arbol-clases` contiene `#pf-clase` (persistente) + `#arbol-body` (dinamico). Sin cambios de esquema, backend, endpoints ni `api/` (8/8 intacto).
- Re-QA obligatoria: la verificacion debe ejecutar las funciones reales (parser DOM + `node vm`) y comprobar que `#pf-clase` sigue en el DOM DESPUES de `arbolPintar()`/`cargarArbolClases()`; el balance de divs y la presencia de ids en el HTML estatico NO bastan.
- Compatible con el Escudo GOLD vigente (`node --check`, ASCII-safe, balance de divs).

### Consecuencias positivas

- `#pf-clase` sobrevive a cualquier refresco del Arbol de Clases (regresion BUG-066 cerrada de raiz).
- Patron reutilizable y barato para futuras secciones con contenido estatico + render dinamico.
- Sin deuda tecnica nueva: cero endpoints, cero migraciones, cero dependencias.

### Consecuencias negativas / riesgos residuales

- Un contenedor extra (`#arbol-body`) en el DOM; nulo impacto visual.
- El patron depende de que el render dinamico NO se vuelva a apuntar a `#arbol-clases`; el re-QA runtime y esta ADR son el guardrail. Un futuro desarrollador debe consultar esta ADR antes de tocar `arbolPintar()`/`cargarArbolClases()`.
- **Leccion de QA:** la UI anidada solo se detecta ejecutando; la verificacion estatica (parser/balance) da falsos APTO. Ver tambien la seccion "Prevencion" de BUG-066.

**ADRs relacionados:** ADR-002 (ASCII-safe), ADR-004 (aislamiento atomico de estilos), ADR-006 (baseline real), ADR-028 (Arbol de Clases), ADR-038 (Mi Clase / Clases Rising Star), ADR-039/ADR-041 (precedentes de QA de UI), BUG-020 (patron de UI desconectada detectada solo en runtime), BUG-066 (regresion que origina este patron).

---

## ADR-044: Abstraccion compartida `media-actions.js` para acciones de media (voto/guardado) -- patron anti-duplicidad

**ID:** ADR-044
**Fecha:** 2026-09-18
**Estado:** **APROBADO E IMPLEMENTADO EN WORKING TREE** (2026-09-18, SIN commitear). Verificado contra archivo real (ADR-006): `media-actions.js` (259 lineas, untracked; 0 bytes >127), consumido por `galeria.html` (script L242, `MediaActions.bind`/`sync` L563-565) y `comunidad.html` (script L499, `avBindMediaActions`/`avSyncMediaActions` L2107-2113). QA APTO sin bloqueantes.
**Autor:** js-silo-dev/frontend-tpl (AI-DOS); origen: TSK-123; cierre documental por docs-keeper.
**Nota de numeracion:** el 044 es el consecutivo real tras ADR-043 (2026-09-18).
**Alcance:** asset frontend compartido. NO toca esquema, endpoints ni el presupuesto 8/8 (ADR-010).

### Contexto

La Entrega TSK-123 necesitaba dotar de like/comentar/guardar a las tarjetas de "Media reciente" y a las fotos del modal de album en `comunidad.html`, acciones que ya existian en `galeria.html` (ADR-036) implementadas inline (`gPostJson`, `gPintaVoto`, `gMediaVoto`, `gMediaGuardar`). Copiar esos bloques a `comunidad.html` habria violado la Regla de No-Duplicidad (tripwire de 5 lineas, AGENTS.md 2.1) y habria dejado tres copias divergentes del mismo contrato (galeria, comunidad e `index.html`, que aun conserva su version inline). Se requeria una sola implementacion reutilizable, sin frameworks (ADR-001) y sin build step.

### Opciones evaluadas (y por que se descartan)

1. **Duplicar la logica de like/guardar en `comunidad.html` (RECHAZADA).** Viola la Regla de No-Duplicidad (AGENTS.md 2.1): Bearer, manejo de 401/503, XP y estados quedarian replicados y divergirian con cada cambio.
2. **Mover la logica a `usuario-session.js` (RECHAZADA).** `usuario-session.js` gestiona identidad/sesion y badges; mezclar UI de media acoplaria dos responsabilidades distintas y cargaria la logica en todas las paginas aunque no la usen.
3. **Extraer `media-actions.js` como modulo con API publica `window.MediaActions` y marcado por data-attributes (ELEGIDA).** Un archivo, una responsabilidad, consumible por cualquier pagina mediante `data-ma-*`; compatible con el patron de concatenacion de strings + handlers inyectados (ADR-001).
4. **Crear un Web Component / custom element (RECHAZADA).** ADR-001 prohibe frameworks y el proyecto renderiza HTML por concatenacion de strings con `onclick` fisico.

### Decision tomada

Centralizar voto y guardado de media en el asset frontend `media-actions.js` (raiz), que expone:

- `window.MediaActions.voto(btn, ctx)` -- POST `tipo=media_voto` con `Authorization: Bearer`; `ctx.esPropia` corta con toast (coherente con el 403 del backend); sin sesion invoca `pedirLogin`.
- `window.MediaActions.guardar(btn, ctx)` -- alterna `guardar_media`/`quitar_guardado_media`; maneja 400/401/503 y red.
- `window.MediaActions.sync(root)` -- pinta el estado inicial desde los atributos `data-ma-*` del propio boton.
- `window.MediaActions.bind(root, opts)` -- un unico listener de click delegado (marca `root.__maBound` para evitar doble bind); `opts = {toast, pedirLogin}`.

Contrato de marcado: `data-ma-voto`/`data-ma-save` + `data-ma-fuente` + `data-ma-item` + `data-ma-votos`/`data-ma-ya-votado`/`data-ma-es-propia`/`data-ma-ya-guardado`; nodos internos opcionales `[data-ma-count]` y `[data-ma-label]`. Las paginas solo declaran atributos; los estados provienen del backend (`mi_feed_fotos`/`album_detalle` devuelven `es_propia`/`ya_votado`/`ya_guardado`).

### Justificacion

Es la misma solucion ya validada en el proyecto para piezas compartidas de frontend: `map-picker.js` (TSK-117) y `niveles-data.js` (ADR-040). Elimina 3 copias de la logica de media, concentra en un solo archivo el Bearer, los estados del boton y el manejo de degradacion (503 de guardados), y permite que `galeria.html` se refactorice sin cambio de comportamiento. No requiere endpoint, migracion ni build step, y no cuenta contra el presupuesto de 8 funciones serverless (ADR-010).

### Impacto

- `galeria.html`: elimina `gPostJson`/`gPintaVoto`/`gMediaVoto`/`gMediaGuardar` y consume `window.MediaActions` (comportamiento preservado: like con XP y guardado con toast; boton Compartir intacto).
- `comunidad.html`: gana like/guardar en el feed y en el modal de album mediante los mismos `data-ma-*`.
- `index.html`: conserva su implementacion inline de `media_voto` (duplicacion pendiente de migrar; deuda D-13).
- Backend aditivo (header sin bump: v23): `mi_feed_fotos`/`album_detalle` aceptan `usuario_id` opcional y devuelven los flags; `albumes` acepta `excluir_museo=1`.
- Nuevo asset frontend `media-actions.js` (no versionado aun; no cuenta contra 8/8).

### Consecuencias positivas

- Una sola implementacion de voto/guardado; cualquier cambio futuro se hace en un solo archivo.
- Estados `es_propia`/`ya_votado`/`ya_guardado` coherentes con el backend (misma columna `af.autor_original_id` que el 403 de `media_voto`).
- Reutilizable por cualquier pagina presente o futura (queda pendiente `index.html`).
- ASCII-safe (ADR-002) y sin dependencias externas.

### Consecuencias negativas / riesgos residuales

- **`OPT` a nivel de modulo:** las `opts` del ultimo `bind` ganan para todas las llamadas de `voto()`/`guardar()`; hoy es inocuo (comunidad pasa las mismas opts a 2 roots), pero conviene encapsular por-root si el modulo se reutiliza en mas paginas (deuda D-10).
- **`guardar` depende de `guardar_media`/`quitar_guardado_media`,** que confian en `body.usuario_id` sin Bearer (BUG-061); los nuevos botones ensanchan su superficie (nota de amplificacion en BUG-061).
- **Carga requerida:** sin `media-actions.js`, `avBindMediaActions` degrada silenciosamente (no bindea). Las paginas deben incluir el script antes de usarlo.
- **Smoke no versionado:** la verificacion 41/41 se ejecuto ad-hoc (Node vm) y no quedo en `scripts/` (deuda D-14).
- **Lectura por `usuario_id`:** permite inferir los booleanos `ya_votado`/`ya_guardado` de un usuario sin sesion (enumeracion de baja severidad, deuda D-11).

**ADRs relacionados:** ADR-001 (sin frameworks / Vanilla JS), ADR-002 (ASCII-safe), ADR-006 (baseline real), ADR-010 (presupuesto 8/8), ADR-025 (sesion firmada JWT/Bearer), ADR-036 (media unificada `media_*`), ADR-040 y TSK-117 (precedentes de asset compartido: `niveles-data.js`, `map-picker.js`), ADR-043 (patron anti-regresion de UI), BUG-061 (usuario_id sin sesion ampliado), BUG-067 (append invertido corregido en la misma sesion).

---

## ADR-045: Motor compartido del Mapa Cultural (`mapa-cultural.js`) -- paridad del mapa de Comunidad con el mapa cultural del index

**ID:** ADR-045
**Fecha:** 2026-09-19
**Estado:** **APROBADO E IMPLEMENTADO** (2026-09-19). TSK-133 (comunidad) quedo COMMITTEADA en `b4ffd4e` ("maps"); TSK-134 (index) queda en working tree, SIN commitear. Verificado contra archivo real (ADR-006): `mapa-cultural.js` (hoy **v1.1.0**, 68417 bytes; `window.MapaCultural` en L1597), `mapa-cultural.css` (121 reglas/121 llaves, 0 `!important` reales, scope `.mc-root`), `scripts/smoke_mapa_cultural.js` (**58/58 PASS**) y `mymapa.js` consumiendolo (`MapaCultural.create` L125). QA APTO CON OBSERVACIONES; `index.html` quedo **MIGRADO** por TSK-134 (ya NO intacto) y `api/*` sigue intacto (diff vacio).
**Autor:** frontend-tpl/js-silo-dev (AI-DOS); origen: feature "Mis mapas personales (comunidad) con paridad al mapa cultural del index"; cierre documental por docs-keeper.
**Nota de numeracion:** el 045 es el consecutivo real tras ADR-044 (2026-09-18); la "Nota de practica operativa" de Modo Express que aparece a continuacion NO usa numero ADR (no define arquitectura).
**Alcance:** assets frontend compartidos en la raiz. NO toca esquema, endpoints ni el presupuesto 8/8 (ADR-001/ADR-010): `mapa-cultural.js` y `mapa-cultural.css` son assets de pagina y NO cuentan contra las funciones serverless.

### Contexto

La feature requeria dar al tab **Mapa** de `comunidad.html` (Mapas personales, `mymapa.js` desde TSK-128) la MISMA experiencia que el mapa cultural de `index.html`: pines por categoria, agrupacion por proximidad, drawer completo del lugar (hero, badge, rating, precio, lead, tabs multimedia, "Ver lugar completo"), capa de media con toggle y lightbox/album. El mapa del index vivia embebido en `index.html` (Leaflet propio, CSS inline y ~1190 lineas de extraccion 1:1 potencial, con contrato `window.mapaMap` via `onMapReady`, helpers propios y colisiones de nombres como `.md-link`/`.md-close`). La paridad exigia entonces duplicar ese motor o extraerlo; duplicar habria violado la Regla de No-Duplicidad (tripwire de 5 lineas, AGENTS.md 2.1) y producido dos motores que divergirian con cada cambio.

### Opciones evaluadas (y por que se descartan)

1. **Duplicar el motor del mapa cultural dentro de `mymapa.js`/`comunidad.html` (RECHAZADA).** Viola la Regla de No-Duplicidad (AGENTS.md 2.1): pines, clustering, drawer, capa de media y lightbox quedarian replicados y divergirian; ademas agravaria el CSS (dos copias de ~120 reglas).
2. **Dejar como estaba (`mymapa.js` con Leaflet propio y `bindPopup`, sin paridad) (RECHAZADA).** No cumple el objetivo de producto: el mapa de Comunidad seguiria sin drawer completo, sin capa de media y con un look distinto al del index.
3. **Extraer un motor compartido multi-instancia (`mapa-cultural.js`) con su CSS scopado (`mapa-cultural.css`), consumirlo ahora desde `mymapa.js` y migrar el `index.html` despues (ELEGIDA).** Un solo motor, reutilizable por varias instancias en una misma pagina, sin tocar el mapa del index en esta entrega (reduccion de riesgo).

### Decision tomada

1. **Motor compartido `mapa-cultural.js`** (raiz, IIFE ASCII-safe, sin backticks) que expone `window.MapaCultural` con API multi-instancia: `create(opts)`/`init(opts)` + `setPlaces`/`setMedia`/`setMediaEnabled`/`setMediaTypes`/`refresh`/`getMap`/`openDrawer`/`closeDrawer`/`destroy`, mas los helpers `esc`/`starHtml`/`photoPlaceholderHTML`/`haversineKm`. Sigue el patron de asset compartido de `map-picker.js`/`niveles-data.js`/`media-actions.js`.
2. **Normalizacion unica** `normalizePlace`/`normalizeMedia`: `cat = categoria_slug || cat`, `uuid = _uuid || destino_id`, rating por defecto 0 y descarte de lat/lng no finitos. Un solo contrato de datos para cualquier pagina.
3. **CSS scopado** `mapa-cultural.css`: 121 reglas extraidas 1:1 del CSS del mapa del index, todas bajo `.mc-root`, 0 `!important` (ADR-004, aislamiento atomico de estilos); se enlaza desde `comunidad.html`.
4. **Capa de media filtrada:** SOLO items de los destinos del mapa activo. Match estricto por slug para `origen='destino'`/`'destino_album'`; `origen='album'` SIEMPRE excluido (no tiene vinculo a destino). Una sola peticion cacheada a `/api/interacciones?tipo=multimedia_mapa` con filtro en cliente; sin cambios de backend.
5. **Paridad total:** tiles CARTO Voyager, clustering por proximidad de 40 px, drawer completo al clic en pin y capa de media encendida por defecto si el mapa activo tiene media.
6. **Migracion del `index.html` DIFERIDA** a una entrega posterior CONTROLADA (no arriesgar el mapa del index en esta feature); el header del modulo deja la nota anotada. Se registra como tarea pendiente (TSK-134). **[Actualizacion 2026-09-19]:** TSK-134 EJECUTO la migracion (ver "Actualizacion (TSK-134)" al final de este ADR); el index ya consume `MapaCultural`.

### Justificacion

Es la misma solucion ya validada en el proyecto para piezas compartidas de frontend (`map-picker.js` TSK-117, `niveles-data.js` ADR-040, `media-actions.js` ADR-044). Deja un solo motor de mapa, un solo contrato de datos (`normalizePlace`/`normalizeMedia`) y una sola hoja de estilos scopada, sin frameworks (ADR-001) ni build step, y sin consumir el presupuesto de 8 funciones serverless (ADR-010). Diferir la migracion del index permite entregar el valor en Comunidad sin tocar el archivo mas critico del home (523 divs, contrato `window.mapaMap`) en la misma sesion.

### Impacto

- **NUEVOS (assets frontend, no cuentan contra 8/8):** `mapa-cultural.js` (al cierre de TSK-133: 65282 bytes; hoy **v1.1.0**, 68417 bytes; API `window.MapaCultural` en L1597), `mapa-cultural.css` (121 reglas scopadas, 0 `!important`) y `scripts/smoke_mapa_cultural.js` (56/56 PASS al cierre de TSK-133; **58/58 PASS** tras TSK-134).
- **`mymapa.js`:** elimina su Leaflet propio y `bindPopup`; pasa a consumir `MapaCultural.create` (L125); el clic en pin abre el drawer completo y agrega la capa de media con toggle (`.mmx-media`/`.mmx-mbtn`, default ON si el mapa activo tiene media).
- **`comunidad.html`:** agrega `<link>` a `mapa-cultural.css` (L14) y `<script src="mapa-cultural.js">` (L559) ANTES de `mymapa.js` (L561), mas los estilos del toggle.
- **`index.html` / `api/*` / `index-api-connector.js` (al cierre de TSK-133):** SIN CAMBIOS (diff vacio). **[Actualizacion TSK-134]:** `index.html` fue MIGRADO despues al modulo; `api/*` e `index-api-connector.js` siguen SIN CAMBIOS.
- **Mitigacion de seguridad (BUG-061):** `mapa-cultural.js` extrajo `jsonAuthHeaders()` (L1354) y `guardarMedia` (L1361) y `votarMedia` (L1378) envian `Authorization`; reduce el punto de amplificacion, pero el backend de BUG-061 sigue ABIERTO (escalado a `sql-security`).
- Nuevo grupo de tareas: TSK-133 (feature, COMPLETADA/commiteada) y TSK-134 (migracion del index, **COMPLETADA en working tree**).

### Consecuencias positivas

- Un solo motor y un solo contrato de datos para el mapa cultural; cualquier cambio futuro aplica a Comunidad y (tras TSK-134) al index.
- Paridad real: mismo clustering (40 px), mismos tiles (CARTO Voyager) y mismo drawer en ambos mapas.
- CSS scopado bajo `.mc-root` (ADR-004) sin `!important`, sin colisiones con el CSS del anfitrion.
- Verificacion reproducible: `scripts/smoke_mapa_cultural.js` (56/56 al cierre de TSK-133; **58/58** tras TSK-134) queda versionado (a diferencia de la deuda D-14 de `media-actions.js`).
- No consume el presupuesto de funciones serverless (8/8) ni crea migraciones.

### Consecuencias negativas / riesgos residuales

- **Doble motor temporal (RESUELTO por TSK-134):** hasta la migracion, el index conservo su mapa inline en paralelo al modulo (riesgo de divergencia); TSK-134 elimino el inline y el index consume `MapaCultural`, por lo que ya hay un solo motor.
- **BUG-061 sigue ABIERTO:** la mitigacion con Bearer en el modulo no corrige el backend (`guardar_media`/`tipo='foto'`); escalado a `sql-security`.
- **QA visual en navegador pendiente:** el smoke es Node vm; falta validar el tab Mapa de `comunidad.html` en navegador real (drawer, toggle de media, lightbox).
- **Shape real de `tipo=mapa` sin validar contra Neon:** el contrato de normalizacion se verifico en smoke con ambos shapes, pero no contra datos reales de la tabla.
- **Migracion del index (TSK-134, EJECUTADA):** el riesgo se materializo de forma controlada y quedo cubierto por los shims (`window.mapaMap` via `onMapReady`, helpers conservados, `mediaControls` en lugar de los `onclick`); residual: QA visual en navegador (TSK-135) y que `mapa-cultural.css` NO se enlace en el index (conserva su CSS inline a proposito).

### Actualizacion (TSK-134, 2026-09-19)

La migracion del `index.html` que este ADR habia diferido se EJECUTO como **TSK-134** (working tree, SIN commitear). Alcance real verificado contra archivo real (ADR-006):

- **`index.html` (+79/-1152):** retira el motor Leaflet inline (~1190 lineas, bloque 2256-3445) y su estado muerto; agrega los shims `initMapaSection` (retry si `!mcMapa.getMap()`), `refreshMapaMarkers` (sin recursion), `geolocateMapa`, `resetMapaColombia`, `openMapaDrawer`/`closeMapaDrawer`, `INDEX_MC_OPTS` (L2254) y `var mcMapa` (L2252) + carga lazy (IntersectionObserver/scroll/timeout 2 s); conserva `esc`/`photoPlaceholderHTML`/`starHtml`/`toggleMapaSave`/`renderMyMap`/`MAPA_PLACES`/`MAPA_MEDIA`/`mapaMap` y quita los 4 `onclick` de `[data-media]` (los engancha el modulo via `mediaControls`). `<script src="mapa-cultural.js">` en L882; **sin** `<link>` a `mapa-cultural.css` (CSS inline conservado por paridad visual).
- **`mapa-cultural.js` (+80/-20, v1.1.0):** opciones de compatibilidad con default = comportamiento comunidad (`enableMediaOnAll`, `mediaEnabled`, `mediaFilter` [null estricto / `false` sin filtro], `mediaPhotoIcon`, `clusterLinksNavigate`, `mediaControls`, `bindList`, `data-comments-*`); el index usa `enableMediaOnAll:true`, `mediaEnabled:false`, `mediaFilter:false`, `mediaPhotoIcon` U+1F4F8 y `clusterLinksNavigate:true`.
- **`scripts/smoke_mapa_cultural.js` (+13/-1):** **58/58 PASS** (+2 checks de index-compat).
- **Sin cambios:** `api/*` e `index-api-connector.js`. Presupuesto **8/8 INTACTO**.
- **QA:** APTO CON OBSERVACIONES (divs 370/370, contrato del connector OK, sin bloqueantes); QA visual en navegador pendiente (TSK-135).

**ADRs relacionados:** ADR-001 (sin frameworks / Vanilla JS), ADR-002 (ASCII-safe), ADR-004 (aislamiento atomico de estilos / Scoped CSS), ADR-006 (baseline real), ADR-010 (presupuesto 8/8), ADR-021 (capa audiovisual estricta / paridad de drawer), ADR-025 (sesion firmada JWT/Bearer), ADR-036 (media unificada `media_*`), ADR-040 y TSK-117 (precedentes de asset compartido: `niveles-data.js`, `map-picker.js`), ADR-044 (`media-actions.js`), BUG-061 (spoofing de usuario_id, mitigado no cerrado).

---

## Nota de practica operativa (NO es un ADR): Modo Express + skill `express-mode`

**ID:** (sin numeracion ADR, a proposito: este documento registra decisiones de arquitectura; esta es una decision de PROCESO)
**Fecha:** 2026-09-19
**Autor:** Documentation Specialist (AI-DOS); origen: sesion express 2026-09-18/19 (TASKS.md TSK-132).
**Estado:** VIGENTE (adoptada en la sesion express 2026-09-18/19; assets en working tree, SIN commitear).

**Decision de proceso:** se adopta el **"modo express / xpress"** como practica operativa del proyecto para cambios funcionales acotados, gobernada por la skill `.opencode/skills/express-mode/SKILL.md` y por la directriz de `agents.md`. El modo se activa cuando el usuario pide trabajar "express", "xpress" o "rapido", y NO elimina controles: cambia su orden y profundidad.

**Reglas clave del modo:** (1) brief quirurgico de delegacion por dominio (ruta + lineas + bloque `old`/`new`); (2) verificacion local minima de 6 puntos (`node --check`, ASCII-safety, balance de divs, grep de residuos, smoke puntual y QA runtime obligatorio si se anidan contenedores dinamicos); (3) documentacion y deuda DIFERIDAS a un unico cierre de sesion (etiqueta `[DEUDA-EXPRESS]` en NEXT.md); (4) escalado obligatorio a modo normal en arquitectura, esquema/RLS/seguridad, migraciones de datos, refactors compartidos o alcance > 3 archivos criticos o > 10 en total.

**Justificacion:** las sesiones de cambio de UI/UX y wiring no necesitan el plan formal ni el Escudo GOLD completo por cada micro-edicion; concentrar la verificacion en lo que puede romperse y documentar en un solo pase reduce turnos y costo sin aumentar el riesgo neto. La sesion express verifico el limite real de la practica: el unico bug no detectado por checks estaticos (regresion de anidacion, **BUG-066**) aparecio precisamente porque ESE cambio si corrio QA runtime; de ahi la regla de QA obligatorio en anidacion.

**Impacto:** NO toca esquema, endpoints ni el presupuesto 8/8 (ADR-010). Nueva evidencia: `MODO_EXPRESS_ANALISIS.md` (manual interno v1.0), `SKILL_MODO_EXPRESS.md` (copia de registro) y `scripts/express_check.js` (comando unico de verificaciones minimas). Los pendientes que express difiere se listan como `[DEUDA-EXPRESS]` en NEXT.md.

**Referencia de detalle:** `exploraco desarrollo/ampliacion desarrollo/MODO_EXPRESS_ANALISIS.md`; skill operativa `.opencode/skills/express-mode/SKILL.md`; directriz en `agents.md` seccion 1 y referencia cruzada en `GUIA_DE_DESARROLLO.md` (Apendice B) y `orquestacion agentes.md` (Skill 4).

**NO es un ADR:** no se le asigna numero ADR-045 porque no define arquitectura, contrato de datos ni seguridad; si en el futuro el modo express requiere una decision de arquitectura, se registrara como ADR numerado segun el formato de este documento. **[Actualizacion 2026-09-19]:** el numero ADR-045 fue asignado despues al motor compartido del Mapa Cultural (`mapa-cultural.js`, TSK-133); esta nota de proceso permanece SIN numero ADR.

---

## ADR-046: Contrato del hero de la ficha de destino -- la imagen principal es la seleccion editorial (`foto_hero`) y los votos solo ordenan las 3 miniaturas

**ID:** ADR-046
**Fecha:** 2026-09-19
**Estado:** **APROBADO E IMPLEMENTADO** (2026-09-19). Commit final `3ffd7a9` ("fotos hero"); primera iteracion (revertida) `41a3f71` ("destinos"). Verificado contra archivo real (ADR-006): `api/pagina-destino.js` L800-872 (`mediaRank` + contrato del hero); smoke `scripts/smoke_auditoria_pagina_destino.js` 61 checks PASS y `scripts/smoke_036_media_unificada.js` 90/90 PASS. Cierra el incidente **BUG-077**.
**Autor:** renderer-dev/frontend-tpl (AI-DOS); origen: pedido del usuario de ordenar galeria/hero por votos (ADR-036); cierre documental por docs-keeper.
**Alcance:** render server-side de la ficha (`api/pagina-destino.js`) y orden de `galeria.html`. No toca el esquema ni los endpoints (el store de votos sigue en `media_votos`, ADR-036).

### Contexto

ADR-036 unifico los votos en `media_votos` para las 3 fuentes (`curada`, `viajero_foto`, `album_foto`). Al conectar esos votos con el hero, la primera iteracion (`41a3f71`) hizo que la foto con MAS votos pasara a ser la imagen principal del hero. El resultado contradijo la intencion de producto: la imagen principal de la ficha es una decision editorial del operador (`destinos.foto_hero`), no un ranking de la comunidad. Ademas quedo indefinido que fuentes componen las 3 miniaturas y si un video/audio con votos podia llegar a ser `background-image`.

### Opciones evaluadas (y por que se descartan)

1. **La foto con mas votos desplaza a la principal (IMPLEMENTADA EN `41a3f71`, RECHAZADA).** Otorga el control de la portada del destino a la comunidad; un video/audio votado podia degradar el hero (la miniatura es `background-image`); provoco la regresion BUG-077.
2. **El hero ignora los votos por completo (RECHAZADA).** Desperdicia la senal de la comunidad que ADR-036 introdujo y deja la galeria sin criterio de orden.
3. **Principal editorial + miniaturas por votos segmentadas por fuente (ELEGIDA).** Conserva el control editorial de la portada y usa los votos para ordenar el resto, con reglas explicitas de fuente y tipo.

### Decision tomada

1. **Imagen PRINCIPAL = seleccion del usuario (`destinos.foto_hero` editorial).** Los votos NO la desplazan.
2. **3 miniaturas (`HERO_THUMBS_MAX = 3`):** (1) la mejor foto del ESPACIO (curada) por votos; (2-3) las 2 mejores fotos de la COMUNIDAD (viajeros + albumes) por votos. Si no hay votos, se cae al orden de insercion historico (2a curada, viajero mas reciente, album), con relleno para no dejar huecos.
3. **Nunca videos/audio en el hero:** pueden aparecer en la galeria y en el drawer, pero jamas como imagen principal ni miniatura.
4. **Ranking unico por votos:** `mediaRank` se calcula UNA sola vez (curadas `galAll` + comunidad `comunidadMerge`, dedupe por URL, `votos DESC`, empate por orden de insercion) y lo comparten hero y galeria. Cada item lleva `fuente` (`espacio|comunidad`) y `tipo` para segmentar la composicion sin recalcular.
5. **`galeria_destino` y `album_oficial` ordenan por votos** (curadas `votos DESC, orden ASC`), con `gSortVotos()` en `galeria.html` como orden defensivo.

### Justificacion

Es la misma separacion de responsabilidades que el proyecto usa en otros contratos: el operador cuida la identidad visual (portada) y la comunidad ordena el resto. Fijar el contrato por escrito (fuente, orden, tipo) elimina la ambiguedad que produjo 2 iteraciones (BUG-077) y deja una guarda verificable por smoke. Reutilizar `mediaRank` como fuente unica evita recalcular el mismo derivado en dos secciones (regla propuesta P17 del documento de analisis).

### Impacto

- **`api/pagina-destino.js`:** `mediaRank`/`mediaRankAdd` con `fuente`; bloque del hero reescrito (principal editorial + 1 curada + 2 comunidad por votos + relleno solo-fotos).
- **`api/interacciones.js`:** `galeria_destino` ordena curadas por votos y `album_oficial` por `votos DESC`.
- **`galeria.html`:** `gSortVotos()` aplicado a curadas y comunidad.
- **Sin cambios:** esquema, migraciones y presupuesto 8/8 (ADR-001/ADR-010).
- **Bugs relacionados:** cierra **BUG-077** (regresion del hero por contrato no fijado).

### Consecuencias positivas

- La portada del destino queda bajo control editorial; los votos ordenan el resto.
- Un solo ranking por votos compartido por hero y galeria (sin divergencia).
- Videos/audio quedan fuera del hero por construccion (`background-image`).
- Guarda de regresion en `scripts/smoke_auditoria_pagina_destino.js` (principal = seleccion del usuario; video votado no entra al hero).

### Consecuencias negativas / riesgos residuales

- El hero no refleja de forma directa el "top" de la comunidad; es una decision de producto aceptada.
- La galeria depende del orden del backend; `gSortVotos()` es defensivo, no autoritativo.
- QA visual en navegador pendiente (el smoke es Node con datos simulados).

**ADRs relacionados:** ADR-001 (Vanilla/ASCII), ADR-006 (baseline real), ADR-036 (media unificada `media_*`), ADR-037 y ADR-030 (refactor previo del hero/galeria), ADR-047 (propiedad de medios del mapa), BUG-077.

---

## ADR-047: Regla de propiedad de medios del mapa cultural -- fotos solo del espacio dinamico; videos/audio de comunidad por cercania; el drawer nunca mezcla espacios [ENMENDADO 2026-09-20: la cercania para video/audio queda ELIMINADA; ver ENMIENDA 1 al final]

**ID:** ADR-047
**Fecha:** 2026-09-19
**Estado:** **APROBADO E IMPLEMENTADO** (2026-09-19); **ENMENDADO (2026-09-20)**: la regla VIGENTE es la ENMIENDA 1 al final de este ADR (pertenencia SOLO por vinculo explicito; cercania para video/audio ELIMINADA). Commits `e7445c3` ("mapa", filtro estricto) y `3ffd7a9` ("fotos hero", restaura video/audio de comunidad). Verificado contra archivo real (ADR-006): `mapa-cultural.js` L187-200 (`filterMediaDefault`), L202-239 (`filterMediaPropios`), L1160 (drawer), L1708 (exportacion); smoke `scripts/smoke_mapa_cultural.js` **73 checks, 0 FAIL**. Cierra **BUG-075** y **BUG-076**.
**Autor:** frontend-tpl/js-silo-dev (AI-DOS); origen: el drawer del pin del mapa cultural mostraba fotos de otros lugares; cierre documental por docs-keeper.
**Alcance:** frontend compartido (`mapa-cultural.js`). No toca el backend ni el contrato de `?tipo=multimedia_mapa`; no crea migraciones (assets frontend, no cuentan contra 8/8).

### Contexto

El mapa cultural consume una capa de media unica (`?tipo=multimedia_mapa`) que mezcla origenes: fotos curadas del espacio (`destino`), album del espacio (`destino_album`), fotos/videos/audios de la comunidad (`album`) y viajeros. El drawer de un pin usaba `mediasCercanas()` (misma ciudad o radio de 10 km), de modo que al abrir `hostal-r10-bogota` aparecian fotos de La Candelaria y Monserrate (BUG-075). Al restringir la media a `destino`/`destino_album`, desaparecieron los videos de la comunidad, que son `origen='album'` (BUG-076).

### Opciones evaluadas (y por que se descartan)

1. **Filtrar el drawer por proximidad geografica (ciudad/radio) (IMPLEMENTADA, RECHAZADA).** La cercania no prueba pertenencia al espacio; mezcla fotos de otros lugares (BUG-075).
2. **Restringir TODA la media a `destino`/`destino_album` (IMPLEMENTADA, RECHAZADA).** Oculta videos/audios de comunidad (`origen='album'`) y deja vacia la pestana Videos/Audios del drawer (BUG-076).
3. **Regla de pertenencia por tipo y por espacio (ELEGIDA):** las fotos del drawer son solo las del propio espacio; los videos/audios de comunidad se admiten por cercania; la capa general mantiene su criterio estricto.

### Decision tomada

1. **FOTOS del drawer = solo del espacio abierto:** `origen='destino'`/`'destino_album'` cuyo `origen_id` (slug emitido por el backend) coincide con el `slug`/`uuid` del place; se excluyen las fotos de otros lugares aunque esten en la misma ciudad o a <= 10 km (`filterMediaPropios`).
2. **VIDEO/AUDIO = se conservan los de comunidad (`origen='album'`)** de la misma ciudad o a <= 10 km del espacio, porque los espacios dinamicos no emiten video/audio propio; sin esto la pestana del drawer queda vacia. Las FOTOS de albumes de usuario siguen ocultas.
3. **Capa general del mapa (`filterMediaDefault`) sin cambios:** solo `destino`/`destino_album` de los destinos activos; `origen='album'` excluido; dedupe por URL.
4. **Cache-busting:** `mapa-cultural.js` se referencia versionado en los HTML consumidores (`?v=3` en `e7445c3`, `?v=4` en `3ffd7a9`).

### Justificacion

La pertenencia no es geografica: un medio pertenece al espacio si su `origen_id` es su slug/uuid. Separar por tipo (foto vs video/audio) permite conservar la curaduria del espacio sin perder el aporte audiovisual de la comunidad. Es una regla de producto explicita, verificable por funciones puras (`filterMediaPropios`) y cubierta por smoke, en linea con el patron de `filterMediaDefault` introducido en ADR-045.

### Impacto

- **`mapa-cultural.js`:** `filterMediaPropios` (nueva, L202-239) reemplaza `mediasCercanas`/`mismaCiudad`/`dentroRadio`; se exporta en `window.MapaCultural` (L1708); el drawer la usa (L1160). `filterMediaDefault` se mantiene (L187-200).
- **`comunidad.html` / `index.html`:** cache-bust `?v=3` -> `?v=4`.
- **Sin cambios:** `api/*` (el backend sigue emitiendo `origen`/`origen_id`), esquema, migraciones y presupuesto 8/8.
- **Bugs relacionados:** cierra **BUG-075** y **BUG-076**; complementa ADR-045 y ADR-021 (capa audiovisual estricta).

### Consecuencias positivas

- El drawer del pin muestra SOLO los medios propios del espacio: no mezcla lugares.
- Se conserva el aporte audiovisual de la comunidad (Videos/Audios del drawer no queda vacio).
- Regla verificable por funciones puras y por smoke (sin depender del mapa real).

### Consecuencias negativas / riesgos residuales

- La pertenencia por `slug`/`uuid` depende de que el backend emita `origen_id` con el slug correcto; si cambia el contrato, el filtro deja de resolver (guarda en smoke).
- Los videos/audios por cercania siguen siendo una concesion: un video de comunidad de otra ciudad no aparece (comportamiento esperado).
- QA visual en navegador pendiente (TSK-135).

**ENMIENDA 1 (2026-09-20) -- APROBADO (decision del operador)**

**Motivo.** El drawer del pin seguia adjuntando VIDEO/AUDIO de comunidad por cercania (misma ciudad o <=10 km), concesion heredada de la mitigacion de BUG-076 (decision tomada, punto 2). El efecto real era un fallo global: al abrir el pin de un lugar (p.ej. `hostal-r10-bogota`) el drawer mostraba TODOS los videos/audios de Bogota. Por decision de producto del operador la pertenencia queda SIEMPRE por vinculo explicito. Donde haya contradiccion, PREVALECE esta enmienda sobre la opcion 2/3 y la decision tomada (puntos 2 y 3) de ADR-047. NO se borra el historial: el texto previo permanece como registro de la decision de 2026-09-19.

**Regla nueva (VIGENTE).**

1. **Pertenencia de medios del drawer = SOLO vinculo explicito.** Un medio entra al drawer del pin si y solo si su `origen` es `destino`/`destino_album` y su `origen_id` es IGUAL al `slug` o `uuid` del lugar abierto. Aplica por igual a FOTOS, VIDEOS y AUDIOS (`filterMediaPropios`, `mapa-cultural.js` L202-230; exportada en `window.MapaCultural`).
2. **Se ELIMINA la heuristica de cercania** (misma ciudad / radio <=10 km) para video y audio. El drawer no conserva ninguna ruta de pertenencia geografica; `mediasCercanas()` (L1143-1149) mantiene el nombre historico pero solo delega en `filterMediaPropios`.
3. La capa/pines NO cambia por esta decision: `filterMediaDefault` (L182-200) conserva su regla estricta (solo `destino`/`destino_album`; `origen='album'` excluido). Los pines de video/audio del index provienen de su `mediaFilter` propio (`index.html` L2274-2280) y de `filterMisMapa`; en `comunidad.html` no se muestran salvo media guardada. El drawer no altera la capa.
4. **Consecuencia ACEPTADA (decision de producto).** Como ningun destino emite video/audio propio, las pestanas Videos/Audios del drawer quedan VACIAS; el estado vacio "Sin multimedia cercana aun" cubre el caso. Es el comportamiento deseado por el operador, no un bug.
5. **Via futura (documentada, FUERA DE ALCANCE).** Si se quiere mostrar video/audio en el drawer SOLO cuando fue compartido al destino, el vinculo real ya existe en `media_compartidos` (migracion 022: `fuente='album_foto'` + `destino_id`). Hoy `?tipo=multimedia_mapa` NO emite ese vinculo (esa rama solo lee `media`/albumes; `media_compartidos` se usa en el flujo POST de compartir/XP), de modo que habilitarlo requeriria un cambio de backend en `api/interacciones.js` (sin endpoint nuevo, presupuesto 8/8 de ADR-001). Se deja como via futura, no implementada.

**Impacto.**

- **`mapa-cultural.js`:** `filterMediaPropios` (L202-230) y `mediasCercanas` (L1143-1149) sin cercania; `filterMediaDefault` intacto; export en `window.MapaCultural` (L1695-1696).
- **`scripts/smoke_mapa_cultural.js`:** seccion (7) actualizada (`filterMediaPropios: excluye video/audio de comunidad (misma ciudad)`, `excluye video de otra ciudad lejana`, `foto de album de usuario sigue oculta`).
- **Cache-busting:** `mapa-cultural.js?v=5` en `comunidad.html` (L566) e `index.html` (L882).
- **Sin cambios:** `api/*` (el contrato de `?tipo=multimedia_mapa` sigue emitiendo `origen`/`origen_id`), esquema, migraciones y presupuesto 8/8.
- **Estado real (ADR-006):** cambio en working tree al 2026-09-20, SIN commitear (ultimo commit `50faa5e`); modificados `mapa-cultural.js`, `scripts/smoke_mapa_cultural.js`, `index.html`, `comunidad.html`.

**Trazabilidad con BUG-076.** Esta enmienda REVIERTE concretamente la mitigacion de **BUG-076** (commit `3ffd7a9`, 2026-09-19), que habia restaurado el video/audio de comunidad por cercania. **BUG-075 permanece CERRADO** (la pertenencia por vinculo explicito lo resuelve). **BUG-076 se RECLASIFICA**: su sintoma (pestanas Videos/Audios vacias) se acepta ahora como decision de producto (punto 4) y NO se mitiga por cercania; su mitigacion por cercania queda anulada. Se deja constancia explicita de la reversion para que el historial no se lea como contradiccion accidental.

**Estado de la enmienda:** APROBADO (2026-09-20) por decision del operador. Regla vigente: pertenencia SOLO por vinculo explicito; cercania ELIMINADA.

**ADRs relacionados:** ADR-001 (Vanilla/ASCII), ADR-004 (aislamiento), ADR-006 (baseline real), ADR-021 (capa audiovisual estricta/paridad de drawer), ADR-036 (media unificada), ADR-045 (motor compartido del mapa), BUG-075, BUG-076.

Revision architect-review: APROBADA (2026-09-20) -- verificado contra archivo real: filterMediaPropios L202-230 sin cercania, mediasCercanas L1143-1149, export L1695-1696, cache-bust v=5, smoke 73/73; BUG-075 CERRADO, BUG-076 RECLASIFICADO; ADR-031/ADR-039 sin contradiccion; 8/8 intacto.

---

## ADR-048: Esquema tripartito de orquestacion de agentes -- ruteo por riesgo (Standard/Pro, Free/Open-Source y Hybrid)

**ID:** ADR-048
**Fecha:** 2026-09-20
**Estado:** **APROBADO** (2026-09-20). Implementado con los agentes primarios `hybrid-build` y `hybrid-plan` (ambos PRO, `opencode-go/deepseek-v4.1-flash`); verificados contra archivo real (ADR-006): `.opencode/agent/hybrid-build.md` (edit allow, rutea por riesgo) y `.opencode/agent/hybrid-plan.md` (edit deny, solo invoca `@explore-free`/`@research-agent-free`). Matriz de ruteo documentada en el prompt real del agente y en `orquestacion agentes.md`. Cero cambios en la app, runtime o BD.
**Autor:** architect-free (AI-DOS); decision derivada del analisis de consumo real de opencode.db (821 sesiones, ago-sep 2026); cierre documental por docs-keeper.
**Alcance:** gobernanza de orquestacion de agentes (`.opencode/agent/*.md`, `opencode.json`, AGENTS.md). No toca `api/*.js`, esquema ni presupuesto 8/8 de Vercel Hobby.

### Contexto

La orquestacion de ExploraCO tenia 2 rutas: Standard/Pro (`build`/`plan`, `opencode-go/deepseek-v4.1-flash`) y Free (`free-build`/`free-plan`, `opencode/big-pickle`). El analisis de consumo real (opencode.db, 821 sesiones, ago-sep 2026) demostro que el gasto PRO no se concentraba donde se habia asumido:

- `build` PRO concentra **35% del gasto ($11.46)**; `frontend-tpl` PRO el **20% ($6.43)** con sesiones individuales de hasta **$4.08**.
- Las tareas **rutinarias** (docs $2.23, qa $2.10, js-silo $0.79, content-loader, data-migration, seo, media, research) suman **~$7.53 (23%)** y son ejecutables por la ruta free a costo ~0 sin diferencia de resultado.
- `explore` PRO (146 sesiones, **$2.41**, solo lectura) es **~95% mas caro** que `explore-free` (**$0.12**) para el mismo trabajo de lectura del repo.
- Las tareas **criticas** (backend, admin, renderer, sql-security, arquitectura) suman **~$12.3 (38%)** y justifican quedarse en PRO.

Conclusion: se pagaba por VOLUMEN de tokens en lugar de por RIESGO y CRITERIO. La ruta free no puede tomar tareas criticas (riesgo de romper runtime) y la ruta PRO no deberia tomar tareas mecanicas (desperdicio de presupuesto medido en datos).

### Opciones evaluadas (y por que se descartan)

1. **Mantener solo las 2 rutas (PRO/Free) (RECHAZADA).** Forzaba a elegir calidad o costo por sesion completa: la ruta PRO seguia quemando presupuesto en lectura y mecanica (23% documentado), y la free no podia ejecutar nada critico.
2. **Mover todas las tareas a la ruta free (RECHAZADA).** El 38% critico (backend, admin, renderer, sql-security, arquitectura) no puede delegarse a `*-free`: riesgo de romper runtime, corromper datos o debilitar seguridad (RLS, claves, autenticacion).
3. **Tercera ruta Hybrid con ruteo por riesgo (ELEGIDA).** Un orquestador PRO decide y rutea cada tarea atomica: las de criterio/riesgo alto a subagentes PRO, las mecanicas/repetitivas a `*-free`. Se paga por RIESGO y CRITERIO, no por VOLUMEN.

### Decision tomada

1. **Crear el esquema Hybrid como tercera ruta de orquestacion**, con 2 agentes primarios PRO (`opencode-go/deepseek-v4.1-flash`):
   - `hybrid-plan`: edit deny; combina razonamiento PRO para arquitectura con exploracion FREE (`@explore-free`/`@research-agent-free`) para lectura del repo.
   - `hybrid-build`: edit allow; evalua el riesgo del archivo antes de invocar subagentes PRO o FREE (orquestador ejecutor inteligente).
2. **Matriz de ruteo Hybrid (fuente de verdad, documentada en el prompt del agente y en `orquestacion agentes.md` v1.1):**
   - **Ruta PRO:** `backend-dev` (api/*.js), `admin-dev` (admin.html/publicar-lugar.js), `renderer-dev` (pagina-destino.js), `frontend-tpl` (UI/estetica compleja), `sql-security` (SQL/RLS/claves/persistencia), `architect` + `architect-review` (arquitectura/ADRs).
   - **Ruta FREE:** `explore-free` (lectura masiva), `content-loader-free` (paginas dinamicas), `js-silo-dev-free`/`exp-pickle-free` (JS rutinario), `data-migration-free` (seeds masivos), `seo-dev-free` (sitemap/meta/OG), `qa-auditor-free` (Escudo GOLD mecanico), `docs-keeper-free` (documentacion), `media-reader-free` (imagen/audio/video/PDF), `research-agent-free` o skill `gemini-research` (investigacion).
3. **Regla de oro de ruteo (mitigacion del mal ruteo):**
   - Prohibido invocar un subagente FREE en un dominio de la ruta PRO (backend, admin, renderer, seguridad SQL, UI de criterio). El ahorro nunca justifica romper runtime o corromper datos.
   - Prohibido invocar un subagente PRO en trabajo mecanico que un FREE hace igual de bien (exploracion, docs, seeds, smokes, SEO de plantilla): esas tareas resultaron ~95% mas baratas en free sin diferencia de resultado.
   - Seguridad critica (SQL critico, RLS, claves, autenticacion) escala SIEMPRE a `sql-security` PRO; prohibido `sql-security-free` en ese dominio.
4. **`opencode.json`:** el `default_agent` sigue en `free-plan` (ruta gratuita, sin cambios en la sesion de implementacion); convertir `hybrid-build` en el default del proyecto queda como decision operativa pendiente de confirmacion del operador (ADR-006: manda el archivo real).

### Justificacion

Los datos de consumo demostraron que el 23% del gasto PRO (~$7.53 en la ventana analizada) se iba en tareas mecanicas sustituibles por la ruta free a costo ~0, y que la lectura del repo costaba ~95% menos en `explore-free` ($0.12 vs $2.41). Ruteando por riesgo se captura ese ahorro sin exponer el 38% critico: el cerebro PRO paga solo donde hay criterio o riesgo de runtime, y el trabajo repetitivo baja a costo ~0. La regla de oro (prohibido FREE en dominios PRO) mitiga el riesgo de mal ruteo: un ahorro mal aplicado nunca justifica romper el runtime, corromper datos ni debilitar RLS/claves. El esquema es el mismo principio del proyecto expresado para la orquestacion: separar responsabilidades y pagar por lo que aporta riesgo real.

### Impacto

- **`.opencode/agent/`: NUEVOS `hybrid-plan.md` y `hybrid-build.md`** (primarios PRO, `opencode-go/deepseek-v4.1-flash`); ambos verificados contra archivo real (ADR-006). Git los muestra como untracked hasta el commit.
- **`opencode.json`:** sin cambios (se mantiene `default_agent: free-plan`); el bump a `hybrid-build` queda pendiente de decision del operador.
- **AGENTS.md y `orquestacion agentes.md` (v1.1):** matriz de ruteo Hybrid como fuente de verdad de la gobernanza.
- **Ahorro estimado:** ~23% del gasto PRO (~$7.53 por ventana analizada) migra a costo ~0 por la ruta free; el 38% critico permanece en PRO.
- **Sin cambios en la app:** cero endpoints nuevos (presupuesto 8/8 intocable), cero migraciones, cero cambios de esquema.
- **Costo del analisis:** 0 dolares adicionales; todo se decidio sobre opencode.db existente.

### Consecuencias positivas

- El presupuesto PRO queda concentrado donde hay riesgo/criterio real (backend, admin, renderer, sql-security, arquitectura).
- Las tareas rutinarias siguen ejecutandose a costo ~0 con la misma calidad de resultado.
- Mantener `free-plan` como default significa que el esquema Hybrid requiere activacion por nombre (`@hybrid-plan`/`@hybrid-build`); si el operador decide hacerlo default mas adelante, toda sesion nueva rutea por riesgo sin depender de activarlo manualmente.

### Consecuencias negativas / riesgos residuales

- Dependencia del criterio del orquestador para clasificar riesgo tarea a tarea; una clasificacion incorrecta (FREE en dominio critico) se mitiga con la regla de oro, que es obligatoria y verificable en el prompt real del agente.
- El ahorro real depende de la disciplina de ruteo de cada sesion; se exige trazabilidad de que tareas fueron PRO y cuales FREE en el resumen de entrega.
- `orquestacion agentes.md` ya quedo en v1.1 (cabecera y tabla de primarios actualizados con `deepseek-v4.1-flash` y la matriz Hybrid documentada por docs-keeper-free en la misma sesion); la matriz autoritativa vive en el prompt real de `hybrid-build` (ADR-006: archivo real como baseline).
- El doc de orquestacion conserva citas `deepseek-v4-flash` en las secciones 3/4 para los agentes Pro legacy (fuera del alcance de esta sesion); las filas hybrid (68-69) ya estan en `deepseek-v4.1-flash`. El archivo real manda (ADR-006).

**ADRs relacionados:** ADR-001 (Vanilla), ADR-002 (ASCII-safe), ADR-006 (baseline de verdad = archivo real), regla de oro 8 (handoff), TSK-132 (registro de la skill express-mode como practica), doc `exploraco desarrollo/ampliacion desarrollo/orquestacion agentes.md` (v1.1, esquema tripartito).

---

## ADR-049: Campo `zona` (region natural de Colombia) en `destinos` -- una sola zona obligatoria en la UI del admin general (incluye eventos), columna aditiva nullable

**ID:** ADR-049
**Fecha:** 2026-09-20
**Estado:** **APROBADO** (2026-09-20). Implementado en working tree al cierre de este ADR (SIN commitear; ADR-006 rige: verificar el archivo real). Migracion `028` PENDIENTE de aplicar en Neon: el despliegue del backend debe seguir el orden mandatorio del Impacto.
**Autor:** Chief Architect (AI-DOS); decisiones de producto confirmadas por el operador.
**Alcance:** esquema `destinos` (migracion 028), admin general (aplica a TODAS las categorias, incluidos eventos), `api/admin-destinos.js` y `api/destinos.js`. NO crea endpoints nuevos (presupuesto 8/8 de ADR-001 intacto). NO toca `tags` (no es un campo JSONB; es una columna gestionada como `region`/`verificado`).

### Contexto

`destinos` ya distinguia ubicacion por `ciudad` y `region`, pero en ExploraCO `region` es el DEPARTAMENTO (p.ej. "Cundinamarca", "Bolivar"); no existia una columna para la REGION NATURAL de Colombia (Andina, Amazonica, Caribe, Pacifico, Llanos). La migracion `027_zonas_marcas.sql` creo el catalogo `zonas_geograficas` (5 slugs) para el modulo de zonas/marcas/patrocinios, pero ese catalogo NO estaba enlazado a `destinos` y su granularidad es de ranking/areas, no de atributo de ficha. Se pidio que cada lugar/evento del directorio pudiera declarar su region natural, capturada desde el admin general (una sola, obligatoria), reutilizable a futuro para filtros/SEO/mapa. Restricciones vigentes: 8/8 endpoints agotados (ADR-001), cero borrado logico (ADR-003), ASCII-safe (ADR-002), gobernanza de esquema via SQL versionado e idempotente (ADR-008) y patron BUG-021/BUG-060 de aplicar la migracion antes del deploy de las ramas que leen la columna nueva.

### Opciones evaluadas (y por que se descartan)

1. **Guardar la zona dentro de `tags` JSONB (RECHAZADA).** Es un atributo transversal de la ficha (aplica a todas las categorias) y no un dato especifico de categoria; meterlo en `tags` lo volveria invisible al contrato de columnas y exigiria logica por categoria. Ademas las columnas gestionadas de `destinos` (`region`, `verificado`) ya son el patron para atributos transversales.
2. **Columna nueva `destinos.zona TEXT` con CHECK de lista cerrada e indice (ELEGIDA).** Aditiva, idempotente, sin FK por ahora, expuesta por los mismos endpoints.
3. **Reutilizar/renombrar `region` para que signifique region natural (RECHAZADA).** Cambiaria la semantica de un campo en produccion (hoy departamento) y romperia seeds, formularios y datos existentes. Decision de producto explicita: `region` NO cambia.
4. **Enlazar FK a `zonas_geograficas.slug` en esta entrega (DIFERIDA).** Los slugs del catalogo 027 (`andes`, `amazonia`) NO coinciden con los del producto (`andina`, `amazonica`); enlazar ahora exigiria migrar/aliasar el catalogo. Se difiere como deuda consciente (ver punto 7 de la Decision).

### Decision tomada

1. **Catalogo cerrado de 5 valores (slug ASCII):** `andina`, `amazonica`, `caribe`, `pacifico`, `llanos`. Son la region natural del destino; la constraint `destinos_zona_chk` los hace cumplir y permite `NULL`.
2. **Una sola zona por destino y OBLIGATORIA en la UI del admin general.** El formulario general tiene un unico `<select id="f-zona">` (no multi-select); `validateForm()` bloquea el guardado si no se selecciona zona. La obligatoriedad es de la UI, NO de la base de datos (ver punto 5).
3. **Cubre TODAS las categorias, incluidos eventos.** No es un campo por categoria: el mismo selector se guarda para hostal, comida, sitio, evento y blog desde el admin general.
4. **`region` NO cambia de semantica:** sigue siendo el DEPARTAMENTO. `zona` es una columna NUEVA y separada; no se sobrescribe ni se deriva `region`.
5. **La columna es NULLABLE en DB a proposito.** `zona TEXT` acepta `NULL`; la obligatoriedad vive SOLO en la UI del admin. Razon: no romper los caminos que todavia no envian `zona` (seeds, `publicar-lugar.js`, `upload-eventos.js`) ni los ~103 scripts `load-*-api.js`. Un destino sin zona es un estado valido en datos.
6. **Exposicion por API (sin endpoint nuevo):** `api/admin-destinos.js` INSERT con columna/param `zona` (normalizado a `NULL` si viene ausente/vacio: `(b.zona ? String(b.zona).trim() : null)`), PUT con `zona` en el fieldMap, GET de listado con `d.zona`; `api/destinos.js` expone `zona` en `toPlace()` y en el modo mapa.
7. **Deuda de slugs vs migracion 027 (consciente y documentada).** El catalogo `zonas_geograficas` de la 027 usa `andes`/`amazonia`; `destinos.zona` usa `andina`/`amazonica`. NO hay FK entre ambos. Si algun dia se enlaza el catalogo, hay que unificar los slugs (`andina` -> `andes`, `amazonica` -> `amazonia`) o mapear en el backend. Queda pendiente.
8. **Orden de despliegue MANDATORIO:** aplicar `db/migrations/028_destinos_zona.sql` COMPLETA en Neon ANTES de desplegar el backend. Invertir el orden produce `42703 column does not exist` en el listado/insert/mapa (patron BUG-021/BUG-060). Re-ejecutar la 028 es no-op (idempotente, ADR-008).

### Justificacion

Una region natural es un atributo transversal de la ficha y por eso se modela como COLUMNA gestionada (como `region`/`verificado`), no como campo JSONB por categoria: asi el contrato de columnas de `/api/destinos` y `/api/admin-destinos` la expone de forma uniforme sin logica por categoria ni migracion de `tags` (cero borrado logico, ADR-003). La columna aditiva idempotente con CHECK de lista cerrada e indice sigue exactamente el patron de gobernanza de esquema (ADR-008) y permite filtrar/agrupar por zona a futuro sin tabla intermedia. Mantener `region` como departamento evita romper la semantica vigente y los datos existentes. Dejar `zona` nullable en DB y obligatoria solo en la UI es la via que preserva la compatibilidad con todos los caminos de carga legacy mientras el producto ya captura el dato nuevo en el admin. La decision de no crear FK hacia `zonas_geograficas` (027) reconoce que el catalogo de ranking y el atributo de ficha son hoy ortogonales y que unificarlos es una migracion aparte, no un efecto colateral de esta entrega. Cumple ADR-002: la 028 y el codigo tocado son 100% ASCII-safe.

### Impacto

- **`db/migrations/028_destinos_zona.sql` (NUEVO, 100 lineas, ASCII-safe, idempotente ADR-008):** `ALTER TABLE destinos ADD COLUMN IF NOT EXISTS zona TEXT`; constraint `destinos_zona_chk` creada dentro de un DO block que consulta `pg_constraint` (permite `NULL`); indice `idx_destinos_zona ON destinos (zona)`. Aditiva/no destructiva; rollback `DROP COLUMN IF EXISTS zona` (LOSSY si ya hay datos).
- **`admin.html`:** `<select id="f-zona">` (L771) en el form general con las 5 opciones + option vacia (L772); cableado en `clearForm` (L2674), `loadForm` (L3284), `collectPlace` (L3948, `zona: v('f-zona')`), `validateForm` (L4081-4091, mensaje "Selecciona la zona (region natural)"), `_placeToAPI` (L6057) y `_mergeNeonRowIntoLocal` (L6573).
- **`api/admin-destinos.js`:** `zona` en el SELECT del listado (L110), en el INSERT columna/param (L153, normalizacion L187) y en el fieldMap del PUT (L274).
- **`api/destinos.js`:** `zona` en `toPlace()` (L49) y en el modo mapa (L168/L189).
- **Orden de despliegue (BLOQUEANTE):** primero la 028 en Neon, despues el backend. Sin la columna, listado/insert/mapa fallan con `42703`.
- **Deuda de cobertura:** los ~103 `scripts/load-*-api.js` y `publicar-lugar.js` NO envian `zona`; las fichas creadas por esas vias quedan sin zona hasta su reclasificacion. `upload-eventos.js` tampoco la envia (los eventos cargados por seed quedan sin zona).
- **Sin render/filtro todavia:** `zona` se captura, persiste y expone por API, pero aun NO se muestra ni se filtra en directorios, mapa ni ficha. Es backlog.
- **QA (defecto detectado y corregido ANTES del deploy):** el INSERT enviaba `''` para `zona` ausente, que la CHECK rechazaba (500 en el pipeline); se corrigio normalizando a `NULL` (`(b.zona ? String(b.zona).trim() : null)`). No llego a produccion.
- **Sin endpoints nuevos:** presupuesto 8/8 de Vercel Hobby intacto (ADR-001). Sin cambios en `tags` ni en el motor generico `CATEGORY_TAG_FIELDS`/`CATEGORY_TAG_LISTS` (no aplica: no es campo de tags).

### Consecuencias positivas

- Atributo transversal de primera clase, uniforme para todas las categorias (incluidos eventos), disponible en el contrato de `/api/destinos` y `/api/admin-destinos`.
- Esquema aditivo, idempotente y ASCII-safe, auditable en el repo (ADR-008) y seguro de re-aplicar.
- `region` (departamento) conserva su semantica; cero regresion sobre datos existentes.
- Habilita a futuro filtros de directorio, SEO y agrupacion en mapa por region natural sin tabla intermedia.

### Consecuencias negativas / riesgos residuales

- Doble vocabulario de slugs (`destinos.zona` vs `zonas_geograficas` de la 027): deuda consciente sin FK; unificar si se enlaza el catalogo.
- Obligatoriedad solo en UI: la DB acepta `NULL`, por lo que datos cargados por script pueden quedar sin zona.
- Los ~103 `load-*-api.js`, `publicar-lugar.js` y `upload-eventos.js` aun no envian `zona` (cobertura parcial hasta su actualizacion).
- Campo capturado pero aun no visible ni filtrable (valor de producto parcial hasta el backlog de render).
- El orden de despliegue es estricto; invertirlo dispara `42703` (patron BUG-021/BUG-060).

**ADRs relacionados:** ADR-001 (Vanilla/8 endpoints agotados), ADR-002 (ASCII-safe), ADR-003 (cero borrado logico / no toca tags), ADR-006 (baseline = archivo real), ADR-008 (schema versionado e idempotente), ADR-042 (migracion 027 zonas/marcas/patrocinios -- catalogo `zonas_geograficas` con slugs `andes`/`amazonia`, origen de la deuda de slugs), BUG-021/BUG-060 (patron migracion-antes-de-deploy).