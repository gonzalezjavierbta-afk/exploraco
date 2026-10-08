# NEXT.md - ExploraCO

Documento de relevo tecnico (AI-DOS Cap. 9.4). Debe permitir que cualquier IA continue el proyecto sin depender del historial de chat.

**Estado del sistema de gamificacion:** `GAMIFICACION.md` (medido 2026-10-05) -- desplegado y cableado, hoy integralmente inalcanzable (`sink_slots` = 0, `SUM(xp_gastado_sinks)` = 0.00, `ranking_score_gamma` = 0.0000).

## GUIA DE LECTURA / INDICE

> Documento de relevo. Para continuar, leer PRIMERO este bloque y la seccion de la
> sesion mas reciente; el resto es historico y solo se consulta bajo demanda.

### Estado actual (resumen ejecutivo)

- **CERRADA / COMMITEADA Y PUSHEADA (2026-10-07; commits `29e2e5b` (Wave 2) + `ad83e05` (follow-ups) en `origin/main`, arbol limpio; Vercel despliega el ultimo commit).** **Sistema de busqueda, Wave 2 (ADR-090 `### Enmienda Wave 2`, TSK-199); la Wave 1 (TSK-198) NO se reabre.** La enmienda (rango real `L7525-7594`) activa **D1** (typos por trigramas), **D5** (tabla `busqueda_sinonimos`), **D6** (`parseNL` data-driven) y **D10** (modo `recomendar` personalizado con degradacion a global). **Migracion 054 APLICADA en Neon** (`schema_migrations` **max=54**): tabla `busqueda_sinonimos` (**15 filas**, **3 indices**) + **2 indices sociales parciales** en `interacciones` (`WHERE activo=true`); **054 unica, no hay 055**. **Paridad de trigramas cerrada:** `smoke_busqueda_parity` **51/51 -> 64/64** (`exploraco_trgm == trigramas()`). Archivos: `busqueda.js`, `api/destinos.js`, `api/utilidades.js`, `index.html` + los 4 `directorio-*.html`; **8/8 endpoints INTACTO**, sin endpoint nuevo; **Escudo GOLD CERTIFICA OK** (TSK-199). **Follow-ups posteriores COMMITEADOS Y PUSHEADOS (`ad83e05`):** condicion 1 de ADR-090 **CUMPLIDA** (`normGeo`/`sqlNormGeo` extraidos a `busqueda.js`; `api/interacciones.js:213-214` los consume via `require`; parity **64/64**, `smoke_058` **97/97**, `origen-factor` **111/111**); `sugerir=1` de `api/destinos.js` acepta `categoria` opcional; JS de los 4 directorios unificado en `directorio-busqueda.js` (envia `categoria` a `sugerir` y `recomendar`). **Deudas vivas (no bloquean):** baja precision de typos (`search_trgm` materializa la ficha completa via `tags_norm`; para `'medelin'` `sim>=0.34` = 111/219 = 50,7%; el GIN `idx_destinos_search_trgm` es valido pero el planner hace Seq Scan a 219 filas, `idx_scan=0`) -- se **ACEPTA v1** con sesgo a recall y la calibracion de `BUSQ_UMBRALES` + eventual acotacion de `search_trgm` quedan para un **ADR futuro con datos**; instrumentar logs de CONSULTA de busqueda (diferido); `normGeoAlias`/`ALIAS_CIUDAD` aun duplicados en `api/interacciones.js` (follow-up DRY); **BUG-118 preexistente** mantenia `npm run test` en rojo -- **ya resuelto (2026-10-07): BUG-118 CERRADO -> `npm run test` VERDE, 109/109 (TSK-200)**.
- **SESION 2026-10-05 (pase documental unico R2, 5a tanda; 9 commits `e027a5f`..`842ba9a`; docs EN WORKING TREE, sin commit). Que se estaba haciendo:** cerrar la tanda de los **sumideros** mas alla del boton: **el disponible real**, **el diezmo**, **el `ref_id`** y **la migracion `050`**. Todo lo que sigue esta **medido contra Neon, contra produccion y contra los ficheros en este mismo turno**, no heredado del chat. (1) **MIGRACIONES: 7 aplicadas (la ultima es la `050`), 0 fallidas, 48 filas en el ledger.** La **`050_indice_parcial_sink_slots_activos.sql`** sustituyo el `uq_sink_slot` de la `046` -- que includia `creado_en`, **un timestamp DE TRANSACCION**, luego **no cubria el doble cobro y si rechazaba la compra legitima** (dos insertions del mismo enganche en la misma transaccion compartian `creado_en` al segundo -> `23505`). Ahora: indice **UNICO PARCIAL** `(usuario_id, clave_accion, ref_id) WHERE activo = true`. **Parcial y no total** porque `slot_baja` **no devuelve XP** (`xp_devuelto: 0`): con unicidad total, dar de baja un recurso impediria **recomprarlo** habiendo pagado ya. Medido: `uq_sink_slot` **0** en `pg_constraint` y en `pg_indexes`, el parcial **1** con su predicado; doble slot activo -> **`23505`**; baja y recompra -> **3/3**; `sink_slots` **0 filas**, `SUM(xp_gastado_sinks)` **`0.00`**. (2) **EL HALLAZGO MAS GRAVE DE LA TANDA -- `tithe_parche`:** al poner el guard al debito del diezmo aparecio que **la acreditacion a la tesoreria de pandilla NO estaba atada al debito**: **un diezmo rechazado igual acreditaba fama**, o sea **la pandilla cobraba un diezmo que el usuario no habia pagado**. Cerrado con `EXISTS (SELECT 1 FROM d)` en la misma sentencia. Medido: disponible 4900 / monto 500 **cobra**; disponible 200 / monto 500 **rechaza**, **0 movidos**, `faltante=300` **nombrado en el log**; `xp_total=1000` con `xp_gastado_sinks=800` **rechaza** (era el caso que daba **-300**); usuario inexistente **fail-closed**. **El encargo de "avisar el faltante a la UI" era IMPOSIBLE** (la funcion es BEST-EFFORT TOTAL, **no recibe `res`**) **y no se forzo**: queda en el log. **No se toco** ni el porcentaje (`PARCHE_TITHE_MAX`) ni la semantica voluntaria: **no se capea la ofrenda, se impide que el debito exceda el disponible**. (3) **`portada_destino` era un agujero de autorizacion:** validaba `destino_id` **ignorando `tipo_medio`**, luego pertenecer **cualquier medio de un destino** compra la portada. Ahora el `EXISTS` exige `tipo_medio = 'general'` **en la misma sentencia**. (4) **EL ESLABON QUE FALTABA: `?tipo=slot_refs`,** sin fichero nuevo (**8/8 intactos**). **3 de 4 sumideros** eran comprables y **no habia forma de obtener el `ref_id`**, luego el boton no podia funcionar. Exige sesion (**401** `SESION_REQUERIDA`/`SESION_INVALIDA`, **nunca lista vacia**), filtra `usuario_id = $1` en la misma sentencia y devuelve el UUID **verbatim**. El **picker** de `mi-perfil.html` tiene **6 estados**; el que importa es el **fail-closed**: si `slot_refs` falla o da 401, los **3** botones comprables se deshabilitan y **3 clics = 0 peticiones**. (5) **RLS DESACTIVADO** (medido `relrowsecurity = false` en `usuario_fotos`, `albumes`, `spot_duenos`, `destinos`, `usuarios`): **`usuario_id = $1` es la UNICA frontera en toda lectura por usuario, no una segunda capa.** Queda como norma, no como nota. (6) **LO QUE SE DESMENTIO POR MEDIRLO:** (a) **"`ADR-3582` documenta `spot_duenos`" era una cita FABRICADA** -- **"3582" no aparece en `DECISIONS.md`** (es un **numero de linea**, dentro del **`ADR-065`**); la tabla del ledger es **`spot_dividendos`** (plural) y **`spot_dividendo` no existe**. No se escribio en ningun sitio, luego no hubo que corregirlo: quedo **desmentido y con la cita correcta** en `DECISIONS.md` **ADR-087 A1**. (b) **`spot_duenos` es UNA entidad, no dos:** `spot_dividendos` es el **ledger** y `spot_duenos` la **cache**; el "solapamiento" temido **no existe**. Lo que queda es **coherencia de cache** (bajo demanda y cache en paralelo), no colision. (c) **El "11 vs 14" era un conflicto FALSO:** los **11** son **sentencias** (`interacciones.js` = **13 lineas de guard en 8 sentencias**, porque el guard se repite en el CTE de comprobacion y en el de debito, **+ 5 lineas de exposicion** que no son guard; `usuarios.js` = **3 guards + 2 comentarios**, no "17 lineas"). (d) **`'oficial'` es INALCANZABLE** en la escala de fama: `pandillas_miembros` tiene **0 filas**, el `CASE` lee esa tabla, y el unico rol `'oficial'` que se escribe vive en **`casa_roles`** (otro dominio). **`rol_factor` no existe** como columna ni como simbolo. **NO se anadio el escritor:** la pregunta esta mal planteada, un `'oficial'` a 0.6 **no pertenece a la fama de pandillas**; el 0.6 **sigue siendo correcto** y lo que falta es una **poblacion**, o sea un concepto nuevo. (7) **TESTS:** `npm test` **109/109, FAIL 0** (corrido en este turno de cierre). (8) **Commits (9):** `e027a5f`, `c4f5a28`, `cb9accd`, `6e1944d`, `b2f9cf1`, `61cbd66`, `e9f35c6`, `72320e9`, `842ba9a`. **Docs de este pase: EN WORKING TREE, sin commit.**
- **Que sigue:** (a) **commit + push de los docs de este pase** (unico pendiente obligatorio). (b) **Las 9 deudas abiertas de TSK-192**, y **4 son decisiones de PRODUCTO, no codigo**: `slot_max` historico o por activos (comprar y cancelar **quema cuota** y deja la portada **cerrada de por vida**), el **faltante del diezmo** (hoy solo al log), el **`'oficial'`** (concepto nuevo, no escritor faltante) y `'texto'` en el `CHECK`. (c) **Poblar datos**, que es lo que hace que el picker ofrezca poco: `usuario_fotos` tiene **1 fila en todo el universo** y `spot_duenos` **1 dueno**. (d) **Vigilar la coherencia cache/bajo demanda** de `spot_duenos` (riesgo, no bug). (e) Cerrar **TSK-187** (el verificador de produccion sigue en `NO_CONFIRMADO`), **TSK-189** (`ADR-087` ya esta redactado: **esta misma sesion** le anadio el **Addendum A**) y **TSK-190**.
- **Riesgos activos:** (a) **`slot_max` es cuota de por vida** y `baja` **no la devuelve** -- el riesgo economico mas serio que queda abierto. (b) **El filtro de sesion es la unica frontera**: no hay RLS de respaldo, luego **un `WHERE` olvidado en cualquier lectura por `usuario_id` es una fuga**, y no habra ninguna segunda capa que la detecte. (c) **`slot_refs` es fail-closed por diseño**, luego un fallo suyo **vuelve a deshabilitar la compra** aunque el saldo alcance: es el comportamiento correcto, pero **se vera como una regresion funcional** si no se sabe por que. (d) **El codigo del clamp de `slot_catalogo` sigue citando `tithe_parche` como causa de saldo crudo negativo**, y esa causa **ya no existe** desde el cierre del punto 2: hoy la causa es gasto previo. Comentario obsoleto, **sin efecto funcional**. (e) `portada_destino` **sigue siendo de un solo usuario** (4 filas, **1** `usuario_id`): "comprable" y "util para ti" no son lo mismo.
- **SESION 2026-10-05 (pase documental unico R2, 4a tanda; docs EN WORKING TREE, sin commit). Que se estaba haciendo:** cerrar la tanda de los **sumideros**, y de paso **desmentir cinco premisas falsas** que venian de los briefs. Todo lo que sigue esta **medido contra Neon y contra produccion en este mismo turno**, no heredado del chat. (1) **MIGRACIONES: 6 aplicadas estrictas (044-049), 0 fallidas.** Ledger medido: `044` `6428b0706e523a37`, `045` `6f54f2fb99b36abd`, `046` `88bee5ff758b1964`, `047` `b1f484ec0b98b0ae`, `048` `48aa9505223e7521`, `049` `f59a704ec3248517`; las 6 con `resultado='aplicada'` (`048` en **282 ms**, `049` en **308 ms**). **Auditoria de deriva: 6 de 6 MATCH, 0 CRLF, 0 bytes > 127 pendientes.** (2) **CORRECCION DE MI PASEO ANTERIOR (era falso):** aquel pase afirmaba "la ultima aplicada es la `047`" y "la `048` NO esta aplicada, confirmado por el esquema: `is_nullable = YES`". **Las dos son falsas.** Hay **6** aplicadas y `parche_upgrades.usuario_id` esta **`is_nullable = NO`**. El `is_nullable = YES` que motivo la conclusion era **la `048` mal implementada** (puso un `CHECK`, no un `NOT NULL`), no una `048` ausente: ver `DECISIONS.md` ADR-088 §B12, que es la leccion. **Un `is_nullable = YES` no demuestra que la migracion no corrio; demuestra que la migracion no hizo lo que decia hacer.** (3) **NEON, conteos reales de este turno:** `sink_slots` = **0 filas**, `sink_slots` con `ref_id IS NULL` = **0**, `SUM(xp_gastado_sinks)` = **0.00**, `spot_duenos` = **4 filas** (las 4 `activo = true`, **1 `usuario_id` distinto**, **2 `destino_id`** que resuelven a `hostal-r10-bogota` y `monserrate`), `pandillas_miembros` = **0**. (4) **EL INCIDENTE QUE MAS CUESTA EN ESTA SESION: los 3 POST de sumideros estaban MUERTOS** (`slot_comprar`, `slot_baja`, `slot_rampa_avanzar`), **no a medias**: dos porteros los mataban **antes** del bloque -- uno exigia `destino_id`, que los sumideros no llevan, y otro exigia una lista de tipos validos sin los 3 nombres nuevos. **Los 0 filas de `sink_slots` NO eran "slots huerfanos"** (hipotesis que se formulo y era **falsa**): eran **la puerta mal puesta**, con `400` con sesion, saldo y `ref_id` validos. Reparado con lista cerrada; detalle y leccion en ADR-088 §B8. (5) **PRODUCCION, verificado por HTTP** contra `https://exploraco.vercel.app`: `?tipo=slot_catalogo` **200** con los **4 sumideros** y **3 de 4 comprables** -- `foto_galeria` -> `usuario_fotos`/`id`, `album_slot` -> `albumes`/`id`, `portada_destino` -> `spot_duenos`/**`destino_id`**; `destacar_evento` **no comprable** con `motivo_soporte` literal ("No existe tabla de eventos en el esquema..."). `?tipo=planes` **200**. `curva.alpha = 0.2`, `curva.gamma = 2` (el **2** es el **peso del componente** dentro de `Fama_Parche`, **no** el valor de `gamma`: el `gamma` de ranking esta en **`0.0000`** con techo **1.0**, y `ranking_saldo_tope` = **2000.0000** es **semilla de la 045**, no un tope de compra). (6) **UI de sumideros cableada y desplegada** (`mi-perfil.html`, pestana **Inventario**, `+516/-5`, **ya commiteado** en `b2f9cf1`): `#pf-xp-balance` corregido de "XP disponibles" a "**XP de reputacion**" (mentia en cada compra, porque `xp_total` **no baja al comprar`: el motor debita `xp_gastado_sinks`, ADR-018); el disponible real viene de `disponible_xp` **computado en SQL**, nunca en el cliente; `costo_siguiente` usa el **mismo helper** del motor que `costo_proximo` (**44 comparaciones medidas, 4 sumideros x k=0..10, 0 divergencias centima a centima**; base 313.25 -> k=3 **801.92**, k=4 **1014.93**), `null` cuando `k+1 > slot_max` y la UI lo pinta como "no hay proximo slot"; **0 literales de clave de sumidero** en el modulo (todo se lee de `puede_comprar`/`motivo_soporte`/`comprable`); el boton no comprable **se corta antes de cualquier `fetch`** (medido: 3 clics -> **0, 0, 0** peticiones); **no hay oraculo de enumeracion**: `ref_id` inexistente y `ref_id` de otro usuario devuelven **el mismo `404`**. **QUE SIGUE (la unica iteracion pendiente):** el **picker de recursos**. Los hooks (`pfSlotsRefs`, `pfSlotsRefs()`) **ya estan cableados**, asi que en cuanto exista el selector que alimente `pfSlotsRefs[clave]`, **el boton se habilita solo**. **El camino a compra esta cortado por diseno hasta entonces** -- y conviene entender por que: la `portada_destino` esta desbloqueada pero **es hoy un sumidero de un solo usuario** (4 filas, 1 `usuario_id`), y **poblarlo es trabajo de ingestion, no de backend** (ADR-088 §B10). (7) **TESTS:** `npm test` **109/109, FAIL 0**. El "971" que aparece en Lazy Throw es **un arnes propio, no el gate**. (8) **Commits de la sesion:** `e027a5f`, `c4f5a28`, `cb9accd`, `b2f9cf1` y `6e1944d` (`.gitattributes`). **Docs de este pase: EN WORKING TREE, sin commit.**
- **SESION 2026-10-05 (pase documental unico R2, 3a tanda; docs EN WORKING TREE, sin commit) -- [BLOQUE PARCIALMENTE SUPERADO POR EL DE ARRIBA; se conserva sin borrar, Cero Borrado Logico]. Que se estaba haciendo:** cerrar documentalmente la tanda de la **economia**: **TSK-184** (4 XP sinks + 4 rankings), **TSK-185** (clamp del XP disponible en 11 puntos de gasto), el **cuarto ranking** (`tipo=pandilla_ranking`) y la **atribucion del inversor** (migracion **`047`**). Todo **hecho y desplegado**; lo unico que queda en disco sin aplicar es la **`048`**. (1) **ESTADO REAL MEDIDO EN NEON (no supuesto):** `schema_migrations` tiene **`044`, `045`, `046` (1673 ms) y `047` (433 ms) con `resultado='aplicada'`**, y **`048` NO esta registrada**. La **048 NO esta aplicada**, confirmado por el esquema: `parche_upgrades.usuario_id` sigue **`is_nullable = YES`**, que es exactamente lo que la 048 viene a cambiar. [Verificacion de este punto: `SELECT numero, nombre, resultado FROM schema_migrations WHERE numero >= 44` + `information_schema.columns` de `parche_upgrades`.] (2) **PRODUCCION VERIFICADA POR HTTP** contra `https://exploraco.vercel.app`: `slot_catalogo` **200** con los **4 sumideros** y `curva.alpha = 0.2`, `gamma = 2`; `slot_rampa` **200**; `planes` **200**. **La `046` NO es confirmable por HTTP** y eso queda documentado como tal: sus tablas estan **vacias** (`sink_slots` = 0, `parche_upgrades` = 0) y **no existe endpoint observador** -- de ahi `NO_CONFIRMADO` en `scripts/verificar_migraciones_prod.js` (**TSK-187**, abierto). (3) **NEON, conteos reales:** `usuarios` = **10**, `sink_slots` = **0**, `usuarios` con `xp_gastado_sinks > 0` = **0**, `parche_upgrades` = **0**, `pandillas_miembros` = **0**, `sink_acciones` = **4** (catalogo), `gamificacion_config.ranking_score_gamma` = **`0.0000`** y `ranking_saldo_tope` = **`2000.0000`**. (4) **LO QUE SE CORRIGIO POR SER FALSO:** `NEXT.md` afirmaba que "la ultima aplicada es la `044`" -- **era falso, es la `047`** (mas la `048` en curso, no cerrada). Y la cabecera de la **`047`** afirmaba que `usuario_id` "NO existe todavia" -- **era cierto al escribirse y hoy es falso**: la columna **existe**, es **`uuid`**, **nullable**, con **FK a `usuarios(id)`** (`parche_upgrades_usuario_id_fkey`), y la tabla paso de **2 a 4 indices** (`idx_parche_upgrades_usuario_id`, parcial `WHERE usuario_id IS NOT NULL`, e `idx_parche_upgrades_parche_id`; los 2 previos son `parche_upgrades_pkey` e `idx_parche_upgrades_ciudad_vigencia`, este ultimo creado por la `039`). (5) **DECISION NUEVA ratificada:** **`ADR-088`**, que cierra 3 puntos: las **3 premisas que la seccion 4 del ADR-086 asumio y el esquema desmiente** (`tipo_efecto`, `alpha`/`gamma` como columnas de `sink_acciones`, y la confusion de `SALDO_TOPE` con un tope de compra), el **clamp y sus 3 trampas**, y el **motor compartido en `lib/score.js`**. La razon de que el motor viva **fuera de `api/`** es la **razon misma del limite de 8/8**: un modulo compartido **no puede ser un endpoint**, y Vercel lo empaqueta por trazado de dependencias sin gastar funcion. (6) **DEUDA ABIERTA, 3, todas deliberadamente NO cerradas:** `tithe_parche` (punto 12 que el ADR no cuenta, hunde el disponible sin guard), `rol_factor` (rol `'oficial'` huerfano, `pandillas_miembros` vacia) y el **503 que dice "039" cuando la causa real es la `047`** (**BUG-111**).
- **SESION 2026-10-05 (pase documental unico R2, 2a tanda; commit `7fe1e9f` ya pusheado; docs EN WORKING TREE). Que se estaba haciendo:** cerrar la **046 del Sistema Economico Integral**: aplicarla en produccion y desplegar los 5 parches de precondicion. (1) **`046_market_multimoneda_sinks.sql` APLICADA en Neon**: **16/16** sentencias, **exit 0**, `resultado='aplicada'`, **1673 ms**, registrada en `schema_migrations` (**3 aplicadas, 0 fallidas**). Esquema verificado tras aplicar: PK de `moneda_cuentas` = **`usuario_id+moneda`**, `sink_acciones` **4 filas**, `sink_slots` **0**, semillas `ranking%` **3**, **8** indices. (2) **B1-B5 = 5 parches, no 4** (el ADR-086 numeraba 4 porque fusionaba B1 y B2; **la tabla de §3 esta corregida** y `TASKS.md` TSK-183 era la fuente correcta): B1 `registrarMonedaLedger` (`interacciones.js:2458-2473`), B2 `ON CONFLICT (usuario_id, moneda)` (`:12948`), B3 debito con `AND moneda` (`:12720`), B4 subconsulta escalar (`usuarios.js:806`/`:875`), B5 `ledger_sum` (`usuarios.js:808`). Desplegados, `npm test` **109/109 FAIL 0** antes y despues, ASCII **0/0**, `planes` **HTTP 200**. (3) **La "ventana cero" se conserva pero por otro motivo:** el codigo es un **puente de doble camino** con `soportaMoneda()` (gatea por la **PK compuesta**), asi que con 1 moneda emite SQL **byte-identico a HEAD** y **no existe fase intermedia**; por eso **el orden dejo de importar**. Orden ejecutable: **migracion primero, redeploy despues** (fallo ruidoso sobre fallo silencioso). (4) **TTL de 60 s** en `soportaMoneda()` cacheando el **booleano resuelto** (fail-closed intacto) y **runner sin transaccion** a proposito (un aborto en 6/16 deja las 5 `ADD COLUMN`, que es el estado bueno). (5) **Defecto de la 046 corregido antes de aplicar:** se elimino la seccion `EXCEPTION` y se cerro el `IF EXISTS` con `ELSE -> RAISE EXCEPTION` (P0001): los 2 handlers eran **inalcanzables** y con el texto viejo un `23505` se tragaba el error, avisaba por `NOTICE` y **registraba la migracion como aplicada** (`42P10` permanente). **BUG-108**. (6) **Defecto del propio ADR-086 §4 corregido:** prescribia `moneda_cuentas.activo`, **columna que no existe** (confusion con `moneda_mercado.activo`); **se borra el filtro y NO se anade la columna** (seria un segundo estado durmiente y es redundante con la PK re-claveada). **BUG-109**. (7) **Canonico `delfin`, no `dlf`** (4 `CHECK` con `delfin`, 0 con `dlf`; `DLF` es etiqueta de render). (8) **El verificador de produccion NO puede confirmar la 046** ("Ningun endpoint declarado consulta esa tabla", `exit 1`) y **es correcto**: crea tablas nuevas y re-clava una tabla vacia, luego no es observable por HTTP; **no es FAIL y no se maquilla como OK**. Deuda nueva: **ventana de 60 s** por el TTL, documentada y aceptada (**BUG-110**). **Que sigue:** las ramas `tipo=slot_*` de los 4 sinks (**TSK-184**) y los **11 puntos** del clamp del XP disponible (**TSK-185**); las tablas de mercado siguen **vacias** (`moneda_cuentas=0`, `moneda_ledger=0`, `moneda_mercado=0`, `usuarios=10`). **Riesgo activo:** cambiar la PK de `moneda_cuentas` en el futuro **sin** redeploy posterior deja hasta 60 s de SQL mixto. **Argumento completo en un solo sitio:** `DECISIONS.md` **ADR-086** (tabla §3 + **addendum A**); aqui, `TASKS.md` TSK-183/TSK-188, `BUGS_HISTORICOS.md` BUG-108..110 y `BLUEPRINT.md`/`PROJECT.md` **solo apuntan**. Detalle en `TASKS.md` TSK-183 y TSK-188.

- **SESION 2026-10-05 (pase documental unico R2; commit PENDIENTE del operador). Que se estaba haciendo:** (1) **Desmentir una premisa falsa** -- se daba por hecho que `api/interacciones.js` **no estaba desplegado** y habia que desplegarlo para arreglar un `42703`. **Falso, y medido:** `GET /api/interacciones?tipo=planes` devuelve **200 con 0 filas**; en Neon hay **1 plan activo**, **0 visibles** con el filtro 044, **1 oculto** por el. Con codigo viejo desplegado devolveria **1 fila** -> **el filtro 044 ya estaba vivo en produccion**. El `42703` lo causaba **la migracion sin aplicar**; **aplicar la 044 fue lo que arreglo la funcion** y **no habia nada que desplegar** (TSK-181, BUG-107). (2) **Tabla de control de migraciones** `045_schema_migrations.sql` (**405 lineas, 6 sentencias**) **aplicada y verificada constraint por constraint** (6/6 CHECK, PK, 3/3 indices, **RLS apagado** con decision argumentada, **0 DROP/DELETE/UPDATE ejecutables**, reejecucion idempotente); validacion previa **de verdad**: dry-run de las 6 sentencias contra el motor real en transaccion con **ROLLBACK**, comprobando con `information_schema` que la tabla **no** existia tras el rollback (el autor original **no pudo verificar la sintaxis**: no hay `psql`, ni docker, ni parser). (3) Seed `005_seed_schema_migrations.js`: **43 filas honestas** -- **41** en `historico_no_verificado` (que **no afirman nada** sobre Neon, deliberado), **1** `aplicada`+verificada (la 044, ALTA), **1** `aplicada` sin verificar (la 045, MEDIA); 43/43 casan el regex; idempotencia probada. (4) `scripts/apply_sql_file.js` **reescrito como portero** (sin el, la tabla es un adorno): contrato (a)-(e) obligatorio dentro de `db/migrations/`, **predecesor por ficheros EN DISCO** (por eso 001/002 ausentes no invalidan), deriva que **nunca sobrescribe el checksum**, `notas` saneadas, fila `failida` + exit != 0; 046 ACEPTADO y 047 RECHAZADO con exit 1; deriva probada en positivo. (5) `scripts/verificar_migraciones_prod.js` **NUEVO** (386 lineas): verifica produccion solo, detecta el `42703` por sus tres firmas, distingue `SIN_VERIFICAR` de fallo real, y trata 401 de `?tipo=diagnostico` como VIVA_CON_AUTH. **Verificacion post-push:** `casa_ranking` 200, `faccion_ranking` 200, `planes` 200 `[]`, `pandilla_ranking` 400 (exige auth, **no es regresion**). **Que sigue (en orden):** (a) **CERROJO DE AUTONOMIA -- `verificar_migraciones_prod.js` sigue dando `NO_CONFIRMADO`, exit 1**, porque un 200 no prueba despliegue: es compatible con codigo nuevo + columna existente + 0 planes **y** con codigo viejo + 0 planes activos. Hoy sabemos que la 2a es falsa (hay 1 plan activo), **pero el script no lo sabe porque no consulta Neon**; hay que enseñarle a cerrar esa ambiguedad (**TSK-187**; prohibido crear endpoint, 8/8 agotadas). (b) **La 046** del Sistema Economico Integral (**TSK-188**; el 045 quedo ocupado por la tabla de control) **y los parches B1-B5** del ADR-086 (**TSK-183**) en el mismo commit, forward-only. (c) **ADR-087** del registro de migraciones, a redactar por `@architect` (**TSK-189**): sus argumentos viven hoy **solo en comentarios del `.sql`**, y ADR-084 D1 exige que el argumento **viva una vez**. (d) Deuda abierta y rutas **no verificadas en ejecucion** (**TSK-190**). **Riesgos activos:** `?tipo=diagnostico` exige `ADMIN_SECRET`, asi que **sin credencial no hay introspection** y **no existe ninguna ruta no autenticada que distinga las dos hipotesis**; el exit code **2** de `apply_sql_file.js` para "fichero no existe" es un **cambio de contrato sin ratificar** (no hay llamadas programaticas, no rompe a nadie); la `notas` de la fila 044 tiene un typo (**"APlicada"**) y **no se corrige** porque la tabla no muta filas registradas; tres rutas del runner quedan **verificadas solo por revision** (fallo a medias, los dos caminos "sin ledger", el `UPDATE` de una fila `failida`). **La economia sigue sin implementarse: 0 lineas de codigo.** Detalle en `TASKS.md` TSK-181 y TSK-186..190; bugs en **BUG-105**, **BUG-106**, **BUG-107**.

- **CERRADA / COMMITEADA Y PUSHEADA (2026-10-04; commit `8315fb0` en `main`; anterior `d9f2878`).** **TSK-177 / ADR-077 ENMIENDA 1** -- Misiones desplegables por ESTADO + galeria de perfil dentro del modal de subida + boton "+ Subir material" en "Gestion del Museo".
- **Decision y argumento:** `DECISIONS.md` **ADR-077 ENMIENDA 1** (Misiones = **5.a superficie** de `pfGruposRender()`, eje por ESTADO y no por `grupo` del payload; veto de una vez heredado de Niveles; una sola regla CSS nueva anclada por anfitrion en `:652`). **NO es un ADR nuevo.**
- **Verificacion (ADR-006):** `npm test` EXIT 0 (1 guard + 21 smokes, 0 FAIL); `smoke_grupos_perfil` 73 -> 109; `smoke_042` 30 -> 45; divs 526/526; residuos 0; ASCII 0 bytes > 127; **8/8 endpoints INTACTO**, sin endpoint nuevo ni migracion. **Que sigue:** QA runtime manual del modal. Detalle en `TASKS.md` TSK-177.


- **CERRADA / EN WORKING TREE (2026-10-04; pase documental unico R2; commit PENDIENTE):** **TSK-176 - Realineacion del hero y del posicionamiento de la HOME (`index.html`, copy + CSS, sin ADR).** (1) Eyebrow `.hsey` -> "**Plataforma de turismo interactivo**". (2) Tira `.htag` **ELIMINADA** (HTML + su regla CSS muerta). (3) Typo "Comidanomia" -> "**Comida**". (4) Las 4 pastillas `.hcat` **dejan de encenderse en `--gold`** y toman el color de su item en el directorio (Hospedajes `#3B82F6`, Comida `#EF4444`, Lugares `#22C55E`, Eventos `#A855F7`); `:hover` tambien, y el estado encendido suma fondo translucido del mismo color; regla generica unica -> **8 reglas por categoria**; `.dc-btn` ("Destacados") **se queda en gold por decision del operador**; JS de filtros sin tocar. (5) Meta/OG/Twitter y footer de la home realineados; **intactos** `canonical`, `og:url`, `og:image`, `og:type`, `og:site_name` y `<title>`. **Un solo archivo** (16 inserciones / 11 borrados); **8/8 endpoints INTACTO**; sin migraciones. Verificacion: copy nuevo **7/7**; `htag` **0**; `Comidanom` **0**; "oficial de Colombia" **0** en `index.html`; divs **368/368**; `<script>` **11/11**; cascada correcta. **Que sigue:** rebrand global (~40 paginas + `404.html` siguen con "El directorio turistico mas completo de Colombia"); eyebrow de "Destacados" (~L1153); **deuda tecnica:** los 4 hex de `.hcat` son copia manual del mapa `CATS` (~L1361) y **nada los enlaza**. Detalle en `TASKS.md` TSK-176.

- **CIERRE DOCUMENTAL / EN WORKING TREE (2026-10-04; pase documental unico R2; modo express; **SOLO** `AGENTS.md`, `.opencode/skills/cascada-tier/SKILL.md` y notas de referencia):** **TSK-175 / ADR-083 - El tier lo fija el MODELO ACTIVO de cada turno.** (1) **La premisa de ADR-082 queda derogada** ("el tier es la sesion entera, lo fija el primario invocado"); **todo lo demas de ADR-082 se conserva integro** (16 subagentes sin `model:`, herencia T2.5, allowlists, ROTOS, `verificar-herencia`, `permission.task` como control de RADIO, gates 9+7 por rol). (2) **D1 ya aplicada en codigo:** roster **20 -> 18** (borrados `free-plan.md` y `free-build.md`); los **2 primarios** `plan`/`build` **SIN `model:`** y con `coste: heredado`, distinguidos por **permiso de escritura** y no por precio; los **16 subagentes sin cambios**. (3) **D2/D5 ya aplicadas:** guard reescrito, check de unicidad de modelo **eliminado**, checks **(c)/(d) reescritos**, **(f) se mantiene**, reparto por **`message.data.modelID`** y **detector de escalada tardia**; resumen `Agentes: 18 | primarios: 2 | subagentes heredados: 16`; `--preflight` imprime modelo activo + contexto + coste estimado, con umbral como **parametro**. (4) **D3 (este pase):** `AGENTS.md` §0/§1/§2 reescritos (roster 18, columna `model:` = "sin pin (hereda el activo)", R5 como **atribucion**, aviso de que **`session.model` del header registra el ULTIMO modelo y NO debe usarse para decidir nada**, reglas 11/12/19 ajustadas) y skill **`cascada-tier` REESCRITA COMPLETA** (11 secciones); §4 deja de citarla como fuente de la regla de tier. **Gates 9+7 sin cambios: se piden SIEMPRE, por ROL, tambien desde el menu `@`.** **8/8 endpoints INTACTO**; sin migraciones; sin tocar codigo. Deuda: selector con memoria puede abrir la sesion en PAGO sin aviso; calidad del modelo de pago sin medir; `orestacion agentes.md` no existe; el mensaje del guard sigue citando ADR-082. Detalle en `TASKS.md` TSK-175 y `DECISIONS.md` ADR-083.
- **CIERRE DOCUMENTAL / EN WORKING TREE (2026-10-02; modo express; **SOLO** `exploraco desarrollo/*.md`):** **Gate permanente de `smoke_grupos_perfil.js` + apertura de TSK-173.** (1) **El gate ya existe y la cobertura de los 4 modulos agrupados de `mi-perfil.html` ya no es deuda:** `package.json` -> `scripts.test` **termina en `&& node scripts/smoke_grupos_perfil.js`** (21 pasos = 1 guard + **20 smokes**, el nuevo es el ultimo) y se anadio el alias `smoke:grupos`; `npm test` completo -> **20 suites, 0 FAIL, exit 0**. La cobertura paso de existir solo como un **arnes temporal que un agente escribio y borro** a ser **test permanente con puerta de calidad**: asercion central de **perdida de items** (un agrupamiento mal escrito se come elementos), mas balance de divs, `node --check` de los scripts inline, pertenencia unica de cada item a un grupo, cuadre de conteos por etiqueta, toggle de plegado sin duplicar DOM, auto-apertura de niveles solo en el primer render y tope de **24** de Albumes. **73 comprobaciones, 2,0 s, ASCII-safe, sin dependencias ni red.** Refuerza el precedente de **BUG-098**: el arnes **tenia un bug propio** (el `getElementById` del mini-DOM solo miraba `attrs.id`, pero `mi-perfil.html:2456` asigna `b.id = ` por propiedad, que en un DOM real si se refleja) y daba **2 falsos FAIL**; corregido con `Object.defineProperty` en `Nodo`, igual que ya se hacia con `classList`. **Producto correcto, instrumentacion incorrecta**, y el paso de `exit 1` a `exit 0` tras el fix es la prueba de que detecta fallos reales. (2) **TSK-173 ABIERTA** (tanda de inventario y plan, **sin ejecutar nada**): los **26 FAIL** de `express_check.js`, medidos corriendo el script y no heredados del chat. Detalle, timeout medido (120,92 s) y plan en TASKS.md TSK-173.

- **CERRADA / EN WORKING TREE (2026-10-02; commit PENDIENTE; requiere REINICIAR OpenCode):** **TSK-172 / ADR-078 - Permisos totales + economia de turnos + smoke permanente de los grupos de "Mi perfil".** Que se estaba haciendo: cerrar el ciclo de TSK-171 (que consumio 18.028.203 tokens) con la correccion de las dos causas que lo hicieron caro: la **friccion de permisos** y el **gasto de contexto**. (1) **Permiso total:** `opencode.json` pasa de 5 a **14 claves todas en `allow`** (`:7-22`); **causa raiz hallada: `external_directory` NO existia**, y era justo la clave que hacia que opencode pidiera autorizacion para rutas fuera del repo (donde vive el arnes de QA en `%TEMP%`); `webfetch`/`websearch` estaban en `deny`. **19 de los 20 agentes** suben `webfetch`/`websearch` a `allow` y `bash` de `ask` a `allow` (`free-plan`, `plan`); `research-agent.md` ya estaba en `allow`, por eso 19 y no 20. **Excepcion conservada a proposito:** `edit: deny` en `@explore`/`@plan`/`@free-plan` y `bash: deny` en `@explore`, porque **bloquean en vez de preguntar** y son la separacion de roles de ADR-006/ADR-074. **Friccion operativa:** opencode **carga la config una vez al arrancar y NO hace hot-reload**, asi que sin reiniciar "lo cambie y sigue pidiendo permiso". Riesgo aceptado: `bash: allow` sin patrones ejecuta cualquier comando sin confirmar. (2) **Economia de turnos:** `AGENTS.md` §3 reglas **12** (formula medida: `cache_read` = **91,7%** del gasto, salida de herramientas = **0,55%**, estimar con **~50.000 tokens x turnos**; estimar por salida de herramientas **infraestima 45-70x**), **17** (**15 turnos / 500.000 tokens por `task`**), **18** (higiene de consumo en tools) y **19** (permisos); `mi-perfil.html` corregido a **~379 KB** en la regla 10; `qa-auditor.md` gana **"Presupuesto de turnos (OBLIGATORIO)"** (`:17-31`) con 7 reglas duras y la evidencia (102 turnos x ~70k = **8,07M tokens, 45% de la tanda**), manteniendo **`edit: allow`** porque su arnes necesita escribir en `%TEMP%` (con `deny` volveria a pedir autorizacion). (3) **NUEVO `scripts/smoke_grupos_perfil.js`** (1.141 lineas): el arnes temporal de QA se vuelve **test reproducible** de los 4 modulos agrupados de `mi-perfil.html`, con asercion central de **perdida de items**; **73/73 PASS, exit 0, 2,0 s, sin dependencias ni red**. Decision: **DECISIONS.md ADR-078**. Bug: **BUGS_HISTORICOS.md BUG-098 / BUG-CONFIG-7** (el mini-DOM no reflejaba `el.id` -> 2 falsos FAIL; **instrumentacion, no producto**). Que sigue: **commit de todo el lote + REINICIAR OpenCode**; luego decidir si se abre la auditoria de fondo de `pfAplicarTab()` (ADR-017 la difiere). Riesgos activos: `bash: allow` sin patrones (riesgo aceptado por peticion explicita; la disciplina de no commit/push vive en las reglas, no en el permiso); sin hot-reload todo cambio de permisos exige reinicio; los 26 FAIL globales de `express_check` siguen rojos y su **corrida completa supera el timeout de 120 s** (usar filtrado por fichero). Verificacion: conteos reales de permisos en los 20 agentes; `git status` = 19 `.md` de agente; `smoke_grupos_perfil.js` **73/73**; `express_check mi-perfil.html` divs **563/563**. **NO toca `api/*` (8/8 INTACTO)**; sin migraciones; sin cambios en produccion. Detalle en TASKS.md TSK-172 y DECISIONS.md ADR-078.

- **CERRADA / EN WORKING TREE (2026-10-02; commit PENDIENTE; modo express):** **TSK-171 / ADR-077 - Agrupacion plegable de items en "Mi perfil" (Museo / Guardados / Niveles / Mis Albumes).** Que se estaba haciendo: eliminar el scroll eterno de las pestanas Perfil y Museo agrupando los items bajo cabeceras plegables. Un solo fichero modificado: **`mi-perfil.html`** (+307/-56). Helper generico reutilizable `pfGruposRender()` / `pfGruposToggle()` / `_pfGruposAbiertos` (`mi-perfil.html:3125-3185`): **devuelve solo el string (no toca el DOM)** y guarda el estado de plegado **FUERA del DOM** indexado `gridId|clave`, para que los re-renders conserven el grupo abierto; toda clave no prevista se agrupa al final para no perder items. 4 usos: **Museo** (`#museo-recursos-grid`, hasta 200 items; por `m.media_type || m.foto_type || m.tipo_media` normalizado a `foto|video|audio`, fallback `foto`, orden fijo), **Guardados** (`#mis-guardados-media-grid`; 4 grupos por `m.fuente` con el contrato canonico del servidor `GUARDADO_FUENTES` de `api/interacciones.js:4786`, **no modificada**), **Niveles** (`#pf-niveles`, 40; 5 eras, y `pfNivelesAutoAbrirGrupo()` abre en el PRIMER render el grupo del nivel actual sin pisar una decision posterior) y **Mis Albumes** (`#mis-albumes-grid`, hasta 50; **NO se agrupa** porque un album no tiene `media_type`: muestra 24 y oculta el resto tras boton con contador, y si hay <=24 no se pinta). CSS en silo atomico bajo `#profile` (`.pf-grupo`, `.pf-grupo-abierto`, `.pf-grupo-btn`, `.pf-grupo-flecha`, `.pf-grupo-nombre`, `.pf-grupo-count`, `.pf-grupo-body`; `:611-652`), con `--pf-grupo-col` declarado **solo bajo `#profile`** como fuente unica de verdad del ancho de tarjeta. Todo arranca **plegado** (peticion explicita del usuario) y se **replico el patron ya existente de `toggleTrofeosBloqueados()`**, sin `details/summary` ni librerias. Decision: **DECISIONS.md ADR-077** -- los wrappers plegables van **SIEMPRE dentro del grid** y **nunca llevan `data-tab`**, porque `pfAplicarTab()` cachea `_pfDisp` una sola vez (`mi-perfil.html:5463`) y un collapsible con `display:none` colgado de un bloque `data-tab` queda cacheado como `''` y reaparece al cambiar de pestana; `pfAplicarTab()`/`PF_TABS` **NO se tocaron**. Tarea: **TASKS.md TSK-171**. Incidente de proceso: **BUGS_HISTORICOS.md BUG-097 / BUG-CONFIG-6** (subagente cancelado a mitad; sus cambios **SI** estaban en disco). Que sigue: **commit + push** (unico pendiente) y **QA visual en navegador** del plegado y del cambio de pestana con un grupo abierto. Riesgos activos: ningun smoke cubre el **cambio de pestana** con un grupo plegado (el sintoma del ADR-077 es invisible a los smokes; la regla se comprueba con grep); el cache `_pfDisp` **sigue sin corregirse** (arreglo de fondo diferido). Verificacion: `express_check mi-perfil.html` PASS divs **563=563**; `smoke_016` **52/52** (D15a divs balanceados); `smoke_test_gamificacion_v4` **97/97** (40 niveles intactos); `smoke_niveles_data` **31/31**; `smoke_042` OK; auditoria `@qa-auditor` **APTO CON OBSERVACIONES**, 86 aserciones en `vm`, **sin perdida de items** (Museo 200/200, Guardados 25/25, Niveles 40/40, Albumes 25/25). ASCII: las **308 lineas anadidas** con **0 bytes > 127 y 0 backticks**. **8/8 endpoints intacto; sin migraciones; sin cambios en produccion.** Deuda `[DEUDA-EXPRESS]` **preexistente, NO de esta tanda**: 26 FAIL globales de `express_check` en `scripts/*` y `api/utilidades.js`; 4 FAIL de `smoke_test_epic_prompt.js`; CSS duplicado `.pf-museo-preview` (`:511`/`:592`) y `.trofeo-grid` (`:127`/`:174`); `.pf-album-card`/`.pf-ver-mas` con peso visual en estilos inline.

- **CERRADA / EN WORKING TREE (2026-10-01; commit PENDIENTE; requiere REINICIAR OpenCode):** **TSK-170 / ADR-076 - Roster unico de 20 agentes (sin pares espejo) + retiro de la ruta hibrida + `AGENTS.md` en la raiz.** Que se estaba haciendo: sustituir la eleccion de "~par" (`*-free` vs `*-pro`) por un **agente unico por dominio**, todo FREE, con la matriz de ruteo como flujo de delegacion. Roster **27 -> 20**: 13 `*-free` renombrados al nombre de dominio; RETIRADOS los 4 `-pro`, `hybrid-plan`/`hybrid-build` y `paid-plan`/`paid-build`; `exp-pickle-free` fusionado en `js-silo-dev`; NUEVOS `plan`/`build` (`mode: primary` sin `model:` propio); los 16 especialistas con `model: opencode/space-bunny-free` explicito. NUEVO **`AGENTS.md` en la raiz** (seccion 0 tier obligatorio con `question`, seccion 1 matriz de 16 dominios, seccion 2 capa de coste + gates de riesgo, seccion 3 16 reglas transversales, seccion 4 indice de skills). 3 skills despublicadas (`batch-create`, `gemini-research`, `ingest-eventos`; 14 -> 11) con sus prompts conservados en NUEVO `.opencode/prompts/`; 3 portadas (`anti-absorcion`, `eficiencia-recursos`, `templates`). NUEVOS `scripts/validate_ficha.js` (canonico, cierra BUG-034), `scripts/usage_report.js` (`npm run usage:tanda`), `scripts/session_close.js` (`npm run session:close`); guard reescrito para clasificar por `mode` (PRIMARIO / ESPECIALISTA / PAID / ROTO) en vez de por sufijo. `opencode.json`: `subagent_depth` 2 -> **1** y `permission.question: allow`. Umbral de lectura por rango 200 KB -> **150 KB**. `docs/orquestacion/REFERENCIA-RUTEO.md` reescrito con el roster nuevo. Que sigue: **commit de todo el lote** (los archivos NUEVOS siguen sin commitear: `AGENTS.md`, `scripts/usage_report.js`, `scripts/session_close.js`, `scripts/validate_ficha.js`, `.opencode/prompts/`, `plan.md`, `build.md`, 3 directorios de skills) y **REINICIAR OpenCode**. Riesgos activos: sin reiniciar, delegar por el nombre nuevo falla con "unknown agent type"; `AGENTS.md` y `REFERENCIA-RUTEO.md` se desincronizan si se edita solo uno (el guard verifica coste, no la matriz); `subagent_depth: 1` impide que un subagente delegue. Verificacion: `.opencode/agent/*.md` = **20**; `.opencode/skills/` = **11**; `node scripts/ejecucion/verificar-capa-gratis.js` = **`Agentes: 20 | gratis: 20 | de pago: 0`**, 4 PRIMARIO + 16 ESPECIALISTA, `RESULTADO: OK`. **8/8 endpoints INTACTO**; sin migraciones; sin cambios en produccion. Deuda `[DEUDA]`: commit pendiente; las 3 skills `agentes-roster`/`modelos-verificados`/`reglas-de-oro` NO existen (no invocarlas); TSK-166/167/168 con premisa superada por ADR-076. Detalle en TASKS.md TSK-170 y DECISIONS.md ADR-076.

- **COMPLETADA / COMMITEADA Y PUSHEADA (2026-09-30; `main` == `origin/main` = `d4ab733`; working tree LIMPIO):** **TSK-169 / ADR-075 - Control compartido de pantalla completa de mapas + limpieza CSS y reorden/responsive del home (UI/estilos).** Que se estaba haciendo: (1) NUEVO `mapa-fullscreen.js` (raiz, 271 lineas, ASCII puro, IIFE ES5, `window.MapaFullscreen` + `module.exports`) con `attach({target,mapEl,getMap,label})` idempotente, boton ARRIBA-DERECHA DENTRO del contenedor, Fullscreen API nativa + fallback CSS `.mfs-pseudo` (iPhone Safari) y `map.invalidateSize()` obligatorio al entrar/salir (el motor no observa el tamano del contenedor); enganchado en `index.html` (`initMapaFullscreen()`) y en los 2 mapas de `admin.html` (`MapPicker.getMiniMap()`/`getPickerMap()`, con el mini-mapa envuelto en un wrapper `position:relative`); (2) limpieza de CSS muerto en `admin.html` (6 reglas `.mpm-*`, `.esb-mini-map` 150->160px, `.editor-sidebar-wrap`->`.editor-sidebar`, selectores `.dashboard-`/`.ws-`, parche `[style*="flex"]`); (3) reorden del home (`#mapa-section` inmediatamente tras el hero, delta de bytes 0) + mobile con lista colapsable (`toggleMapaLista`); (4) filtros del mapa como overlay de chips DENTRO del contenedor (`left:52px;right:58px`); (5) modulo `bands` ELIMINADO (redundante; divs 388 -> 371). Que sigue: **nada obligatorio (cerrado)**; solo QA visual opcional en dispositivo (mobile del admin <=900px, arrastre del mapa bajo la franja de chips, contraste de filtros sobre tiles claros). Riesgos activos: la barra de chips captura el toque en la franja superior del mapa (~38px); en <=900px el `.editor-sidebar` del admin AHORA SI se oculta (antes la regla estaba muerta); en pantalla completa el titulo del `.mapa-topbar` NO se ve (intencional, estilo Google Maps); si se edita `mapa-fullscreen.js` hay que bumpear `?v=1` (patron BUG-073). Verificacion: `npm test` **EXIT 0** (incluye `smoke_mapa_cultural` y `smoke_mapa_tiles`); `express_check index.html` divs **371/371**; `express_check admin.html` divs **1082/1082**; `verificar-capa-gratis.js` OK; `node --check mapa-fullscreen.js` OK con 0 bytes > 127 y 0 backticks. Bugs corregidos: **BUG-095** (modal `map-picker` no abria por clase faltante) y **BUG-096** (drawer invisible en pantalla completa por ser hermano del contenedor). Commits: `cbd33e0` (mapa), `1b58f3a`, `55a2f30`, `d4ab733`. Deuda `[DEUDA-EXPRESS]`: sin smoke de `mapa-fullscreen.js`/drawer-en-fullscreen. Detalle en TASKS.md TSK-169 y DECISIONS.md ADR-075. **8/8 endpoints INTACTO; sin migraciones; `mapa-cultural.js`/`map-picker.js` NO tocados.**

- **IMPLEMENTADO EN WORKING TREE / verificado (2026-09-30; commit/deploy PENDIENTES; requiere REINICIAR OpenCode):** **TSK-165 / ADR-074 - Restauracion de la capa gratuita de agentes (modelo de 3 capas: free / hibrido / pago).** Que se estaba haciendo: tras BUG-092 los 19 agentes habian quedado en `opencode-go` (de pago) y la capa gratuita de ADR-067 estaba VACIA; se restauro con un default en `opencode/space-bunny-free` (`opencode.json` `model`/`small_model`), 17 subagentes `*-free` que ahora heredan el modelo de su primario (sin `model:` en el frontmatter), primarios `free-build`/`free-plan` y `hybrid-build`/`hybrid-plan` en `opencode/space-bunny-free`, `paid-build`/`paid-plan` y 4 pines `-pro` (`backend-dev-pro`, `architect-pro`, `renderer-dev-pro`, `data-migration-pro`) en `opencode-go/deepseek-v4.1-flash`, y un guard (`scripts/ejecucion/verificar-capa-gratis.js`) encadenado como PRIMER paso de `npm test`. Roster **19 -> 27** (21 gratis, 6 de pago). Que sigue: **REINICIAR OpenCode** (el servidor cachea agentes al arrancar, BUG-086) y hacer una **tanda real con `@free-build`/`@hybrid-build`** para medir calidad y costo; luego commit/push. Riesgos activos: los agentes/modelos NO aplican hasta reiniciar; la allowlist FREE/lista ROTOS dependen del proveedor; `big-pickle` funciona como modelo de sesion pero NUNCA como subagente. Verificacion: conteo real 27 agentes; `opencode.json` = `opencode/space-bunny-free`; `npm test` **VERDE (exit 0)** con el guard primero; `opencode run --agent hybrid-build` delego a `@exp-pickle-free` y la DB registro ambos en `opencode/space-bunny-free` con `cost=0.000000`. Bug: **BUG-094** (premisa incompleta de BUG-092; BUG-092 sigue CERRADO). Deuda `[DEUDA]`: sin medicion de calidad de los modelos free en dominios duros (TSK-166); re-verificar allowlist (TSK-167); evaluar pines `-pro` SEO/admin (TSK-168). Detalle en TASKS.md TSK-165..TSK-168 y DECISIONS.md ADR-074. **8/8 endpoints intacto; sin migraciones.**

- **IMPLEMENTADO EN WORKING TREE / verificado (2026-09-30; commit/deploy PENDIENTES):** **TSK-164 / ADR-073 - Migracion de identidad ExploraCO -> LATAWEL (marca, paleta, tipografia, activos y dominio).** Que se estaba haciendo: cambio de identidad visible sobre la estructura actual (NO se redisenaron las 20 pantallas). Marca **LATAWEL** (tagline "What to do?"; descriptor "plataforma de turismo interactivo"); dominio **https://latawel.com** VIVO (el antiguo `exploraco.co` YA NO resuelve). Paleta reemplazada en todo el sitio (`#E8A020`->`#FF4A00`, `#C8860A`->`#FFB84D`, `#FDF3E0`->`#E5E7EB`, `#ffb400`->`#FF4A00`, `rgba(232,160,32)`->`rgba(255,74,0)`, `#111`->`#0F1419`, `#0A1628`->`#0F1419`; **0 restos en produccion**); tipografia Poppins SOLO marca/tagline (se conservan Barlow Condensed + Outfit); assets en `assets/brand/`; codemod `scripts/rebrand/codemod-latawel.js` sobre **122 HTML** (118 publicos + 4 fragmentos) + auditoria `scripts/rebrand/audit-latawel.js`. Que sigue: commit + push (Vercel despliega al push) + re-scrape de OG + GSC con el sitemap nuevo + corregir `SITE_BASE_URL` en Vercel si quedo con el valor viejo + corregir `manifest.json` (BUG-093). Riesgos activos: si `SITE_BASE_URL` existe en Vercel con el valor viejo, gana sobre el fallback `latawel.com` (canonical/OG/sitemap/email podrian salir con el dominio antiguo); el logo es raster (sin SVG maestro) y a 16px el isotipo puede perder detalle. Verificacion: `npm test` = **896 PASS / 0 FAIL (exit 0)**; `node --check` OK en 24 archivos; 0 regresiones de divs en 123 HTML; balance de llaves CSS 0; **154 archivos modificados**. **8/8 endpoints intacto; 0 migraciones.** Deuda `[DEUDA]`: sin SVG maestro; acentos dorados residuales (`#FDE68A`, `#F59E0B`, etc.); filas historicas `chat_mensajes` "ExploraCO Oficial" conservadas (Cero Borrado Logico); `scripts/test-fase1.js` duplicado. Detalle en TASKS.md TSK-164, DECISIONS.md ADR-073 y `logos/ADR-LATAWEL.md`.

- **IMPLEMENTADO EN WORKING TREE / verificado (2026-09-29; commit/deploy PENDIENTES; viaja con TSK-159 y la migracion 042 aun PENDIENTE en Neon):** **TSK-163 / ADR-069 ENMIENDA 1 - Unificacion del panel de perfil: Pasaporte combinado de 10 datos.** Que se estaba haciendo: unificar en un solo panel las secciones de datos del perfil de `mi-perfil.html` (se ELIMINAN `#pf-datos`, `#pf-origen`, `#pf-completa` y el titulo "Tu Pasaporte"; queda el host unico `#pf-pasaporte`; se conservan `#pf-billetera` y `#pf-galeria`) y unificar el progreso del pasaporte en la UNION COMBINADA de los datos del pasaporte 042 + las misiones de perfil (total unico de 10). Backend `api/usuarios.js` **v25** (`calcularPasaporte` = 10 items: foto, nombre, nacimiento, ciudad, pais, bio>=40, intereses>=3, email, casa, faccion; SELECT de GET `billetera_mia` ampliado con `avatar_url`/`bio`/`intereses`/`casa`/`faccion`); `api/interacciones.js` alinea `logr_pasaporte_completo` (desc "6 datos" -> "10 datos"; `ctx.pasaporteCompleto()` con 10 criterios); `smoke_042` a v25. Que sigue: commit + push (junto a TSK-160) + aplicar la migracion 042 en Neon + QA runtime. Riesgos activos: el gate de creacion de billetera (`bmPasaporte.completo`) exige ahora los 10 datos (antes 6) -> las billeteras ya creadas PERSISTEN (`ON CONFLICT DO NOTHING`); en el perfil se oculta la tarjeta de puntaje Local/Nomada/Extranjero pero el multiplicador ADR-058 SIGUE vigente en backend. Deuda `[DEUDA-EXPRESS]`: CSS huerfano `.pf-datos`/`.pf-completa`/`.pf-origen` (~110 lineas); `pfPasItem` con `|| {}` pintaria boton "undefined" ante un id sin accion; GET `billetera_mia` sin fallback 42703/42P01; `pfPasValor` lee de localStorage (campo no hidratado puede verse vacio). Detalle en TASKS.md TSK-163 y DECISIONS.md ADR-069.

- **IMPLEMENTADO EN WORKING TREE / ESCUDO GOLD VERDE (2026-09-29; commit/deploy PENDIENTE; express ampliado; NO toca 042):** **TSK-160 / ADR-070 - Modulo unificado de subida (perfil + museo + etiqueta lugar/evento) y subir archivo en la galeria del directorio.** Que se estaba haciendo: fusionar en el tab Perfil de `mi-perfil.html` el bloque "Sube tus fotos" con la subida del Museo, ofreciendo 3 destinos (foto de perfil / recurso de Museo / etiqueta a lugar o evento) desde un solo modal con selector `#museo-f-publicar`; y permitir subir archivo (no solo link) en "Comparte tu foto" de `galeria.html?destino=<slug>`. Que sigue: QA runtime post-deploy de los 3 modos y de la subida en la galeria; commit + push (Vercel despliega al push). Archivos: `mi-perfil.html`, `galeria.html`, `api/interacciones.js` (crear/GET `museo_recurso` con `destino_id` + `galeria_destino` incluye fotos etiquetadas por `af.destino_id`, ambos con fallback 42703). Verificacion: `express_check` PASS 4/4 (divs 593/593 y 85/85); JS inline OK; smokes `smoke_042` 28/28, `smoke_036` 93/93, `smoke_032` 45/45. Riesgos activos: `editar` de `museo_recurso` no acepta `destino_id` (etiqueta fija al crear); la grilla del Museo no muestra la etiqueta; subida de galeria solo imagen; sin migracion nueva (depende de `album_fotos.destino_id` de la 042, ya cubierta por fallback). Deuda `[DEUDA-EXPRESS]` en TASKS.md TSK-160. **[NOTA ANULADA por TSK-177 (2026-10-04, commit `8315fb0`):] la retirada de `#btn-museo-subir` queda anulada por decision explicita del operador** -- la capacidad de subir material se REINTRODUCE en "Gestion del Museo" con un boton distinto (sin `id`) que abre el modal en modo `museo`; el `id` viejo no vuelve.
- **IMPLEMENTADO EN WORKING TREE / `npm test` VERDE (2026-09-29; migracion 042 PENDIENTE de aplicar en Neon; commit/deploy PENDIENTE):** **TSK-159 / ADR-069 - Bugs A1-A3 + Pasaporte/Billetera + Subida v2.** (A) Bug A1: confirmacion de subida sin URL cruda (`media-upload.js confirmacion()`; `mi-perfil.html pfDatoFoto`); A2: `estaVisitado()` normaliza `destino_id/id/slug` (**BUG-089 CERRADO**); A3: NUEVO `mapa-tiles.js` con fallback CARTO->OSM + aviso/reintento, integrado en `mapa-cultural.js` v1.1.1 / `map-picker.js` / `index.html` / `comunidad.html` (OSM directo -> CARTO) / `mapas.html`. (B) Migracion **042** (`usuarios.fecha_nacimiento`, `usuario_fotos` tope 10 atomico, `billeteras`, `album_fotos.destino_id`), `api/usuarios.js` **v24 -> v25** (perfil_actualizar + fecha editable 1 vez; foto_agregar/principal/quitar; GET `billetera_mia` agregador xp+CDR+consumibles+Pasaporte; **v25: Pasaporte combinado de 10 datos, ver TSK-163 / ADR-069 ENMIENDA 1**), logro `logr_pasaporte_completo` (plata, +200 XP via ledger canonico + `repartirXpReferidos`), UI Pasaporte/Billetera/Galeria en `mi-perfil.html`. (C) `media-upload.js` optimiza en navegador (canvas WebP q0.8, perfil 800 / resto 1600, EXIF, sin GPS, no amplia, GIF/SVG intactos); bloque de subida above-the-fold; buscador de ubicacion C4 + `album_fotos.destino_id` con fallback 42703. **8/8 endpoints intacto**; sin endpoints nuevos. Smokes NUEVOS: `smoke_mapa_tiles.js` (21/21) + `smoke_042_pasaporte_billetera.js` (28/28) encadenados a `npm test` (VERDE); `test_logros_catalogo.js` 34 (**BUG-090 CERRADO**). Deuda `[DEUDA-EXPRESS]`: canje/QR de billetera + revision legal diferidos; blob huerfano de la foto de perfil no se borra; edad 13 solo declarativa. Detalle en TASKS.md TSK-159, DECISIONS.md ADR-069 y `docs/DEPLOY_042.md`.
- **CERRADA (2026-09-28; SOLO gobernanza de orquestacion, SIN tocar `api/*` ni BD):** **Tanda ADR-067 - modelo de 3 capas con presupuesto.** Roster de agentes **40 -> 19** (21 retirados: los 4 primary `build`/`plan`/`hybrid-build`/`hybrid-plan` + 17 PRO con par `-free`; supervivientes = los 17 `*-free` + `free-build` + `free-plan`); 4 reglas de orquestacion **R1-R4**; convencion de `description:` (una linea, <=140 chars en agentes / 150 en skills, sin "GRATUITO", sin nombre de modelo, sin escapes `\u00XX`, sin block scalars); NUEVO `docs/orquestacion/REFERENCIA-RUTEO.md` (matriz de dominios, R1-R4, anclas y politica de escalada; **untracked**); 3 modos nuevos en `scripts/ejecucion/informe-cuota.js` (`--task`, `--overhead`, `--max-sessions`; el script paso de 413 a 764 lineas) y R3 forzado por `webfetch: deny` + `websearch: deny` EXPLICITOS en 18 de los 19 agentes (solo `research-agent-free` los conserva en `allow`; `opencode.json` mantiene el `deny` global como defensa en profundidad). Purga: 3 `.md` byte-identicos (25.281 B) borrados de `scripts/ejecucion/` (canonicos en `.opencode/skills/gemini-research/prompts/`). `opencode.json`: `subagent_depth: 2`, `default_agent: free-build`, `permission: {edit: allow, bash: allow, webfetch: deny, websearch: deny}`. **Ahorro medido con `--overhead` (estimacion chars/3.5):** Capa 0 12.752 -> 4.134 chars (**-67,6%**; tokens 3.643,4 -> 1.181,1) y Total 145.616 -> 85.884 chars (**-41,0%**; tokens 41.604,6 -> 24.538,3). Auditoria T6: **APTO CON OBSERVACIONES**; gaps cerrados por T9. Detalle en DECISIONS.md ADR-067 > Nota de revision R-067, TASKS.md TSK-157 y BUGS_HISTORICOS.md BUG-085..BUG-088 (BUG-CONFIG-1..4). **NO toca `api/*` (8/8 INTACTO); sin migraciones; sin ADR nuevo** (el ADR-067 lo escribio architect durante la tanda; este pase solo cierra su Nota y corrige 2 datos).
- **CERRADO / EN WORKING TREE (2026-09-29; commit/deploy PENDIENTE):** **BUG-091 / ADR-071 / TSK-161 - mapa base CARTO -> OSM con cadena de respaldo de 3 proveedores.** Causa raiz: CARTO sirve **HTTP 200 con un PNG placeholder "API KEY REQUIRED"** (2049 B identicos en z6/z10/z14 en Bogota), por lo que el fallback por `tileerror` de `mapa-tiles.js` nunca se disparaba (un 200 no es error). Fix: cadena `osm` -> `osm-hot` -> `esri-imagery` en `mapa-tiles.js` L21-25 + `mapa-cultural.js` L71/L73 + `index.html`/`mapas.html`/`comunidad.html` sin CARTO. Verificacion: `npm test` EXIT 0 (13 smokes); `smoke_mapa_tiles.js` 24/24; `smoke_mapa_cultural.js` 98/98; Escudo GOLD APROBADO (0 `cartocdn` en los archivos tocados). Que sigue: renombrar el id legado `tiles: 'carto-voyager'` (`mapa-cultural.js:359`, `mymapa.js:152`); **`map-picker.js:91` aun pasa la URL de CARTO como `custom` primero (hallazgo ADR-006: el fallback no actua ahi)**; decidir la limpieza de ~90 `.html` estaticos con `cartocdn` inline; considerar Esri o un proveedor de pago si el trafico crece. Ver TSK-161 / ADR-071 / BUG-091.
- **CERRADO (2026-09-29; requiere REINICIAR OpenCode):** **BUG-092 / BUG-CONFIG-5 / TSK-162 - los subagentes fallaban con "OpenCode's free tier can only be used from within OpenCode".** Causa: los 19 agentes de `.opencode/agent/*.md` declaraban `opencode/big-pickle` (el free tier no admite invocacion como subagente) y `opencode.json` tenia `small_model: opencode/big-pickle`. Fix: 18 agentes -> `opencode-go/deepseek-v4.1-flash`, `media-reader-free.md` -> `opencode-go/mimo-v2.6-pro` (vision) y `small_model` -> `opencode-go/deepseek-v4-flash`. Verificado tras reiniciar: los subagentes responden. Proveedores autenticados en la maquina: solo `opencode-go` y `google`.
- **IMPLEMENTADO EN WORKING TREE / QA APTO CON OBSERVACIONES (2026-09-24; commit/deploy PENDIENTE):** **Pantallas de entrada** (TSK-156, adaptacion de `prompt mensaje.txt`): overlay de bienvenida en `index.html` (Pantalla 1; flag `ec_welcome_visto` 1 sola vez, `window.ExploraCO.abrirBienvenida`, z-index 10000 < expEra 10001 < bono-ref 10002) + `registro.html` REDISEÑADO dark dorado (Pantalla 2; banner con NOMBRE del anfitrion via `ref_info`, selector `#reg-bonos` desde `GET tipo=bonus_referido`, reclamo post-alta `POST reclamar_bonus_referido`, "Continuar sin invitacion" `#reg-skip-ref`) + `api/usuarios.js` v23 (rama publica GET `?tipo=ref_info` suave sin JWT: solo `anfitrion_nombre` trim+slice(0,80), 200 `REFERIDO_INVALIDO`). `api/interacciones.js`: SOLO anotacion (premios del prompt = propuesta FUTURA; se mantiene catalogo `bienvenida_*`). ADR-006 (corregido 2026-09-24): el lote BASE + `scripts/smoke_ref_info.js` (**26/26 PASS**) + `package.json` (encadena el smoke al INICIO de `npm test`) YA esta COMMITEADO en `5181564` ("mensajes", = `origin/main`); el REFINAMIENTO 2026-09-24 (express: `index.html`, `registro.html`, `usuario-session.js` NUEVO en el lote) sigue SIN commitear; el release TSK-155/ADR-058 YA esta en `origin/main` (`e5a59f8`/`27784f8`). Escudo GOLD: sintaxis 4/4, ASCII 0 en api/*.js y JS nuevo, divs 5/5 y 390/390; smokes `smoke_regalias_bono.js` 63/63 + `smoke_016_multinivel_crowdsourcing.js` 52/52 + `smoke_ref_info.js` 26/26. **8/8 INTACTO**; sin migraciones; sin ADR nuevo (nota de producto en DECISIONS.md). Deuda etiquetada: IDOR preexistente en `reclamar_bonus_referido` (codigo 036, escalado a `sql-security`). Detalle en la sesion de "Que se estaba haciendo" y TASKS.md TSK-156.
- **REFINAMIENTO EN WORKING TREE / SIN COMMITEAR (2026-09-24, modo express; amplia TSK-156):** ajuste de UI/JS sobre el lote de Pantallas de entrada. `index.html`: descripciones `.wl-tip-desc` acortadas, **UN SOLO BOTON** (`#wl-cta` = "ENTRAR" con cierra + scroll a `#recs`; eliminado `#wl-entrar`) y NUEVO enlace `.wl-registro#wl-registro` → `/registro.html` (CSS `.wl-entrar` renombrado a `.wl-registro`). `registro.html`: dos bloques `.reg-sub` + NUEVO `.reg-sub2` (gamificacion), tag de invitacion inline y sutil (`reg-chip` + "Invitación de" + nombre del anfitrion; sin SVG `.reg-chip-ico` ni `.reg-chip-desc`) y NUEVA linea `.reg-bonos-intro` en `fieldset#reg-bonos`. `usuario-session.js` (**NUEVO en el lote de refinamiento**): `reclamarXpDemo()` (L958-969) llamada en `loginConEmail` tras `sincronizarGuardados()` (L885), limpia `localStorage.user_points` si `xp>0` + toast "Tus puntos de exploración se sumaron a tu cuenta" (cubre registro.html y modal navbar). **ADR-006: el lote BASE ya esta COMMITEADO en `5181564` (= `origin/main`); este refinamiento son 3 archivos M SIN commitear.** Escudo GOLD: `node --check` 4/4, ASCII delta 0 (23 lineas agregadas: 0 bytes>127 / 0 backticks), divs 390/390 y 4/4, residuos `wl-entrar`=0/`reg-chip-desc|ico|copy`=0; smokes `smoke_directorio_session.js` 14/14 + `smoke_ref_info.js` 26/26. 8/8 INTACTO; sin migraciones. Deuda `[DEUDA-EXPRESS]`: sin smoke de `reclamarXpDemo`/overlay; `<link>` Geist muerto; cache-bust (BUG-073). Detalle en TASKS.md TSK-156 > "Refinamiento 2026-09-24".
- **IMPLEMENTADO EN WORKING TREE / AUDITADO APTO PARA DEPLOY (2026-09-24; commit/deploy PENDIENTE):** **Multiplicador de Origen por lejania** (ADR-058 / TSK-155, migracion **038**): el XP por acciones fisicas crece con la distancia REAL (haversine) al punto de la accion segun tier de origen -- **Local x1.00**, **Nomada** `1.00 + 0.20*min(km/1000, 1)` (top 1.20 a 1000 km), **Extranjero** `1.20 + 0.20*min(km/3000, 1)` (top 1.40 a 3000 km); sin punto/tier elegible = 1.00. `mult_origen` entra como **HERMANO de `stack_temp`** dentro de `calcularXpFinal` (acotado por `cap_global`). **ELIMINA el bono plano x1.2 del ADR-028/WP-5**; el Arbol de Clases usa el MISMO factor escalonado (v30, per-row con espejo SQL `sqlFactorFila`; **nerf M-4:** sin ciudad_base/punto -> 1.00). **Migracion 038 APLICADA en Neon el 2026-09-24** (geo_ciudades **1.122** filas DIVIPOLA / geo_paises **245**; `usuarios.origen_declarado_en` + backfill; `xp_ledger.mult_origen numeric(10,6)` + `origen_tier`; 7 claves `factor_origen_*`/`origen_km_*`/`origen_min_dias_cuenta`) + seed `scripts/seed_geo.js` cargado. Archivos: `api/interacciones.js` **v29/v30**, `api/usuarios.js` **v22** (objeto `origen` + **ANTI-TELEPORT**: cambiar ciudad/pais-base fija `origen_declarado_en=NOW()`), `api/admin.js` **v6** (`salud_red`: distribucion_origen/mult_origen_stats/config_origen/alertas_origen, degrada 42703), `index.html`/`usuario-session.js` (badge origen), `mi-perfil.html` ("Tu origen"). **8/8 INTACTO** (sin endpoints nuevos). Smokes: `smoke_058_origen_clasificador` **90/90** (sin BD, ENCADENADO a `npm test`; `npm test` VERDE 14 smokes) + `smoke_origen_factor_parity` **111/111** (contra Neon REAL, gate `npm run smoke:origen`). Cierra hallazgo de gobernanza **G-1** (drift documental). Deuda `[DEUDA]`: cap_global puede absorber el premio en stacks altos; curva duplicada JS/SQL (el parity 111/111 es la red); nerf M-4; sin verificacion documental de nacionalidad (monitoreo `alertas_origen`); seed geo sin auto-update (DANE manual). Detalle en la sesion "Que se estaba haciendo", TASKS.md TSK-155, DECISIONS.md ADR-058.
- **CERRADO / DESPLEGADO (2026-09-23, commit `1302f7c`):** **Museo publico no se visualiza** (`perfil.html?id=<uuid>`) -- causa raiz DOBLE: (a) **datos:** `db/migrations/004_usuarios_blog_autor.sql` nunca se habia aplicado en Neon (`usuarios.foto_url` AUSENTE; **BUG-060**), resuelto con `node scripts/apply_004_foto_url.js` (idempotente); (b) **codigo:** la rama `museo_publico` de `api/interacciones.js` pasaba a `queryConAvatarFallback` el reemplazo `['foto_url','avatar_url AS foto_url']`, pero la plantilla YA incluye `__FOTO_URL__ AS foto_url` -> el reintento por `42703` generaba `avatar_url AS foto_url AS foto_url` -> **SQLSTATE 42601** -> **HTTP 500** (incluso para UUID inexistentes); fix `['foto_url','avatar_url']` (**BUG-084 NUEVO CERRADO**). Verificacion en vivo: `?tipo=museo_publico&id=3b78efad-...` -> **200** (antes 500) y `...&id=<uuid inexistente>` -> **404** (antes 500). Escudo GOLD **PASS**; barrido de los **9 call sites** sin otro defecto; smoke `smoke_017_perfil_arbol_casas.js` **67/73** IDENTICO al baseline. **8/8 INTACTO**; sin ADR nuevo. Detalle en TASKS.md TSK-154 y BUGS_HISTORICOS.md BUG-060/BUG-084.
- **IMPLEMENTADO EN WORKING TREE / SIN COMMITEAR (2026-09-23, sesion express):** **Guardar album + museo personal fuera del mapa publico** (ADR-057 / TSK-153): (A) `GET ?tipo=album_detalle` devuelve `ya_guardado_album` y `es_propio`; (B) guardar un album desde su visor acredita **XP dual 5 (ejecutor) / 10 (dueno)** una sola vez (reactivar no re-paga; el dueno solo cobra si es distinto del ejecutor); (C) el album auto "Mi Museo" se excluye del mapa publico (`multimedia_mapa album_grupo` + `excluir_museo`, con match **tolerante a acentos** via `translate`/NFD); (D) el album guardado sale en "Mis guardados" de `mi-perfil.html` (sin cambios: `mis_guardados_media` ya lo pinta). Archivos: `api/interacciones.js`, `galeria.html`, `comunidad.html`, `mapa-cultural.js`, `scripts/smoke_gamificacion_v6.js` (26 claves), `scripts/smoke_038_casas_clases.js` (23/22 call-sites). **SIN migracion** (`xp_ledger.accion` es `text` sin CHECK). **8/8 INTACTO**. Escudo GOLD verde (node --check OK, ASCII 0, divs 84/84 y 325/325); **`npm test` VERDE (exit 0)**. Curaduria de MODIFICACION de fichas **DIFERIDA a Fase 2** (ADR propio). Detalle en TASKS.md TSK-153.
- **IMPLEMENTADO Y MIGRACION 035 APLICADA EN NEON / SIN COMMITEAR (2026-09-23):** **Consumibles con gate por era (banda exclusiva de compra)** (ADR-056 / TSK-152): columna `consumibles.era_exclusiva` (`NULL` = tienda base); la compra se permite solo si `era_visible === era_exclusiva` (`403 ERA_INSUFICIENTE` fuera de la era); el uso se permite siempre si el item esta en inventario; evaluacion sobre el nivel ganado `GREATEST(nivel(xp_total), nivel_max)` (ADR-053) via `calcularEraVisibleLocal`; 15 consumibles nuevos (3 por era) + 9 premium backfilleados = **32 filas hoy** en Neon (17 previos + 15 nuevos; la 034 NO esta aplicada, por eso sus 3 `prod_*` no existen; 35 si la 034 se aplica). `api/interacciones.js` (gate en `consumibles`/`comprar_consumible` + fix de era en `inventario`), `api/admin.js` (`?recurso=consumibles` + `normalizarEraConsumible`), `admin.html` (`<select>` de era), `mi-perfil.html` (candado + "Disponible en era"). Migracion NUEVA **035** (aditiva/idempotente/ASCII-safe) **APLICADA en Neon el 2026-09-23** (`node scripts/apply_sql_file.js db/migrations/035_consumibles_era.sql`, 5 sentencias OK, "todas OK"; verificado: 32 filas; NULL=8, Caminante=3, Explorador=3, Cronista=6, Leyenda=7, Mito=5). **8/8 INTACTO**. **Smoke:** `scripts/smoke_test_consumibles_era.js` pasa **55/55** y AHORA SI esta encadenado a `npm test` (script `smoke:consumibles`; suite `npm test` VERDE, 0 FAIL). **Numeracion:** la spec/migracion/codigo citan **ADR-056** (alineados). Detalle en la sesion de "Que se estaba haciendo".
- **IMPLEMENTADO EN WORKING TREE / SIN COMMITEAR (2026-09-23):** **Mercado de Emprendedores** (ADR-055 / TSK-151): 3 mercados INDEPENDIENTES por Casa con normas propias (`mercado_config`; condor 2%/25%, jaguar 5%/10%, delfin 0%/5%), habilidad global "Emprendedor" sobre `usuarios.mercado_puntos` (METRICA DE PROGRESO, NO moneda; no viola ADR-018), compra atomica por CTEs con `23514`->409, produccion de consumibles y admin `?recurso=mercado`. `api/interacciones.js` v28, `api/usuarios.js` v21, `api/admin.js` v5, `mercado.js` (NUEVO, `window.Mercado`), tab Mercado en `comunidad.html`, card Emprendedor en `mi-perfil.html`, pantalla Mercado en `admin.html`. Migracion NUEVA **034** (aditiva/idempotente/ASCII-safe) **PENDIENTE de aplicar en Neon** (la 027 ya fue aplicada por el operador el 2026-09-23). `npm test` VERDE + `smoke_mercado` 38/38 (gate doble de nivel verificado: nodo efectivo = `min(puntos, nivel)`); Escudo GOLD verde; **8/8 INTACTO**. **BUG-083 CERRADO** (cabecera de la 034 inconsistente con su cuerpo). Deuda `[DEUDA-EXPRESS]`: validar `mercado_mi` con sesion real en Neon; contrato de oferta/demanda con datos reales; `mercado_puntos` sin ledger por evento. Detalle en la sesion de "Que se estaba haciendo".
- **EN CURSO / SIN COMMITEAR (2026-09-22, sesion express; punto (C) ACTUALIZADO el 2026-10-02 al cerrar ADR-079):** (A) **galeria unificada desde la ficha** -- el clic en cualquier foto de un item ya NO abre el lightbox simplificado `#lb` (ELIMINADO de `api/pagina-destino.js`, +29/-68) sino que navega directo a `/galeria.html?destino=<slug>#g-foto=<url>` (helper `irAFotoGaleria` con `GAL_FOTOS`/`HERO_FOTOS`), y `galeria.html` consume el hash con `gAutoAbrirHash()` para abrir el visor completo (voto/guardar/compartir/comentarios) SOBRE esa foto; (B) **recalibracion de `XP_BASES`** en `api/interacciones.js` (guardado 3, voto_media 3, rating 5, chat_comentario 6, visita 30, foto_viajero 30, album_crear 25, album_foto 20); (C) **v27 "Rising Star Decay" del voto de media** (autorizado por el operador; **DEROGADO PARCIALMENTE por ADR-079** el 2026-10-02, ver `DECISIONS.md` ADR-079): **solo sobrevive el DECAY** -- XP decreciente con carga ponderada por tiempo (`factor = 1 - carga/20`; se recarga a full a las 24h), que sigue determinando el VALOR del voto y queda INTACTO con su curva actual, sin recalibrar; el **cooldown creciente (`min(600, carga*30)` s, `VOTO_COOLDOWN_*`) queda ELIMINADO**: borradas `VOTO_COOLDOWN_FACTOR` y `VOTO_COOLDOWN_MAX_SEG`, retirado `MAX(creado_en) AS ult` de la consulta de carga (se conservan `n` y `carga`), borrados el calculo y la rama de bloqueo, y eliminado el 429 "Espera Ns" de `registrarVotoMedia` (`api/interacciones.js` 14468 -> 14454 lineas). **El voto ahora SIEMPRE se permite en servidor**; el tope duro 20/24h INTACTO con su 429 de `tope`. Motivo: el cooldown era un **bloqueo invisible** que hacia mentir al `200 { ok: true }` -> **CERRADO como BUG-099** (el voto no persistia y habia que refrescar la pagina). Verificacion de la correccion: `node --check` OK en ambos ficheros, ASCII-safety 0 bytes > 127, y `scripts/smoke_036_media_unificada.js` (`:136,164,174,220`) realineo sus 4 matchers de regex, que identifican consultas por texto SQL literal y quedaron desalineados al borrar `AS ult` -> **93/93** y `npm test` VERDE. Verificacion: `node --check` OK, ASCII 0, backticks 0; guard `scripts/check_buildHTML_inline.js` actualizado (`abrirLightbox` -> `irAFotoGaleria`). Deuda `[DEUDA-EXPRESS]`: la deuda **"nuevo ADR que revierta ADR-053 (Decay)" queda CERRADA** (ADR-079 escrito el 2026-10-02); siguen abiertas CSS huerfano de `#lb` en `pagina-destino.js`; `directorio-session.js:151` (+5 XP local) y >100 fichas estaticas (+25/+8) desalineadas con la nueva escala; **XP por subir lugar nuevo (`publicar_lugar`) SIN wiring** (endpoint anonimo, sin `usuario_id` en `destinos`); calibracion fina de la curva del decay; commit/deploy pendientes. Deuda abierta nueva: **deriva de calibracion de `XP_BASES.voto_media`** (documentado como 5 en `DECISIONS.md:2912`, el codigo tiene 3 en `api/interacciones.js:474`) -- registrada, NO resuelta, en `BUGS_HISTORICOS.md` > "Deuda ADR-079".
- Cierre **2026-09-22** (TSK-150, cierre documental express docs-only, ruta FREE): pagina dinamica **"El Taller de las Moscas"** (slug `taller-de-las-moscas`, categoria `sitio`/subcultura, Bogota/Chapinero) **PUBLICADA Y VERIFICADA en produccion**: https://exploraco.vercel.app/taller-de-las-moscas.html **HTTP 200 (~81KB)**, id Neon `99938930-aa6d-48d9-b353-6f2016f8e7ea` `status=published` (~/api/destinos?categoria=sitio), galeria en `destinos_fotos` (IDs 2201-2204+, fotos Wikimedia BUG-022: HOGRE street art, Melaka Art Gallery, Taller Nacional de Grafica, ZineDisplay), sitemap incluye el slug y el huerfano `taller-delas-moscas-bogota-4qfn` fue ELIMINADO (causa raiz: slug no persistido en el formulario admin + foto vacia rompiendo buildHTML -> 404). Escudo GOLD: `node --check` 3/3, ASCII 0/0/0, smoke **14/14 PASS** (divs 248/248 diff=0). Rating en **0** (ADR-009, sin resenas sembradas). 4 archivos nuevos **untracked** (`ficha/taller de las moscas.json` + 3 scripts). **8/8 INTACTO**; sin ADR nuevo ni bug nuevo (**BUG-034** sigue ABIERTO, NO se duplica). Pendiente: QA visual opcional en navegador. Deuda `[DEUDA-EXPRESS]`: 2 `catch` vacios en el seed = patron de seeds (~106), NO tocar.
- Cierre **2026-09-21** (TSK-149 + ADR-054 + BUG-082, DESPLEGADO en `b4ad861`): **guardados de media en "Mis Albumes"** -- se ELIMINA el concepto de carpetas privadas de guardados (ADR-052) y los bookmarks de `media_guardados` se organizan en `albumes` propios con PUBLICACION POR GUARDADO (visible solo en el detalle del album). Migracion NUEVA **032** (idempotente/ASCII-safe, 17152 bytes; `media_guardados.album_id` + `visible` + CHECK `media_guardados_visible_album_chk` + 2 indices; **DROP** de `guardados_carpetas` y de `carpeta_id`) **APLICADA en Neon el 2026-09-21** (idempotencia verificada por segunda corrida). Backend `api/interacciones.js` **v26** (`mis_guardados_media` EXIGE sesion y deriva el dueno del token -> `albumes[]`; `guardados_carpeta` -> `accion=album|publicar` + 410 `CARPETAS_DEPRECADAS`; `album_detalle` con `guardados[]`/`albumes_guardados[]` + invariante de no-fuga; hardening BUG-061) + `api/pagina-destino.js` fix **BUG-082** (`af.visible=true`, L2762). Frontend `mi-perfil.html` (chips/select por album + toggle "Hacer publico" + `fetchConJwt`) y `mymapa.js` (Bearer); Escudo GOLD HTML divs 419/419. Smokes: NUEVO `scripts/smoke_032_guardados_album.js` (**45**), poda de `scripts/smoke_029_030_coords_carpetas.js` (**42**) y `scripts/smoke_036_media_unificada.js` J35 (**90**); **`npm test` = 536 PASS / 0 FAIL (exit 0)**. **8/8 INTACTO.** **DESPLEGADO (2026-09-21): migracion 032 aplicada en Neon + release PUSHEADO a `origin/main` (commit `b4ad861`); Vercel despliega al push.** Deuda `[DEUDA]`: `api/utilidades.js` (24 backticks + 3 dobles escapes, preexistente), catch vacios preexistentes, alias legacy `POST tipo='foto'` (raiz de BUG-061), `albumes.fotos_count` sin guardados publicados y vocabulario "Carpeta" del Museo sin unificar.
- Cierre **2026-09-21** (TSK-148 + ADR-053 + ENMIENDA 1; backend + migracion + smokes **COMMITEADOS** en `c875675` "gamificacion v6: adr-053 + migracion 031" y `9efbfc7` "gamificacion v6 fase 3: motor xp nivel scaling x1.0-x3.0, umbrales 42000, salud_red y smokes v25" = HEAD); **frontend COMMITEADO en `d803ce7` y PUSHEADO a `origin/main`**: **Gamificacion v6** -- `M_nivel` lineal x1.0 (N1) a x3.0 (N20) con **doble cap SECUENCIAL 5.0/10.0**, 20 umbrales reescalados con **techo 42000**, **`xp_ledger`** (13 columnas, 29 call-sites instrumentados), **`gamificacion_config`** (caps ajustables sin deploy), **`usuarios.nivel_max`** (insignia, sembrado con la tabla vieja: nadie pierde insignia) vs nivel DERIVADO (economia), **repricing** ABSOLUTO de los 17 consumibles (impulso x2.0, resto x1.6) y rama admin **`GET ?recurso=salud_red`**. Migracion **031 APLICADA en Neon** (11 sentencias OK). `api/interacciones.js` **v25**, `api/usuarios.js` **v19**, `api/admin.js` **v4**; **8 espejos** de umbrales sincronizados + toast con desglose de XP y deduplicacion + barra de progreso + UI de cupo/enfriamiento + pestana admin "Salud de la Red". **`npm test` VERDE (exit 0)**: `smoke_gamificacion_v6` **30** + `smoke_niveles_espejos` **10/10** nuevos + legacy 95/78/45/55/15/31. **BUG-002 CERRADO** (backticks 0 / doble escape 0 en `api/pagina-destino.js`) y cerrado el doble toast de XP (`NEXT.md:246`). **DEPLOY HECHO (2026-09-21): `main` = `origin/main` = `d803ce7`; Vercel despliega al push y NO requiere cache-bust (`vercel.json` sirve todo `/(.*)\.js` con `Cache-Control: no-store`). Migraciones 027 y 028 siguen SIN aplicar.** Deuda nueva: `destinos.creado_por`, contrato `estado_cupo`, >100 fichas estaticas legacy, `smoke_test_epic_prompt.js` 4 FAIL preexistentes (DQ-2), R-6 y techo 42000 sin calibrar.
- Cierre **2026-09-21** (TSK-147 + ADR-051/ADR-052/ENMIENDA 2 ADR-047 + BUG-081, working tree SIN commitear): **ubicacion individual por recurso de `album_fotos`** (migracion **029**, APLICADA en Neon el 2026-09-21), **carpetas privadas de guardados de media** (migracion **030**, APLICADA en Neon) y **fix de seguridad ALTA/CRITICA** en `multimedia_mapa scope=mio` (antes: sin sesion y `mmScopeMio ? '' : ' AND af.visible=true'` -> devolvia los privados de TODOS; ahora exige sesion firmada, deriva el uuid del token e ignora el query param, clausula `mmScopeMio && mmUsuarioId`). Release `api/interacciones.js` **v24** (+313/-67). Frontend: `mi-perfil.html` (pin propio + "Quitar ubicacion" + espacio de guardados con carpetas), `mymapa.js` (merge media propia `_propia`), `map-picker.js` (pin arrastrable), `index-api-connector.js` (Bearer); cache-bust `mapa-cultural.js?v=7`, `mymapa.js?v=4`, `map-picker.js?v=2`, `index-api-connector.js?v=2`. Nuevo `scripts/apply_sql_file.js`. **8/8 INTACTO.** **PENDIENTE: deploy (commit/push + Vercel) en orden 029/030 (YA en Neon) -> backend v24 -> frontend; smokes nuevos de 029/030 en curso; fix del reset de `museoQuitarCoords`.**
- Cierre **2026-09-21** (TSK-146 + BUG-080, working tree SIN commitear): **fix de render de media del mapa cultural** (`mapa-cultural.js` re-renderiza la capa de media en `moveend`; el atajo "Todo" rellena `st.mediaTypes` via `setMediaEnabled(true)`; cache-bust `?v=7` en `index.html` L883 y `comunidad.html` L566). Diagnostico read-only contra Neon confirmo que el backend SI devolvia la media y que el video reportado "rastro mc-trampas" NO existe en la BD. Herramientas nuevas: `scripts/neon_select.js`, `scripts/load_env_local.js`, `db/queries/q1..q4_*.sql`. `api/*.js` NO se toco (**8/8 INTACTO**); sin migraciones; sin ADR. **PENDIENTE: deploy (commit/push + Vercel) + ampliar `scripts/smoke_mapa_cultural.js`.**
- Cierre documental EXPRESS **2026-09-20** (docs-only, ruta FREE): nuevo campo **`zona` (region natural)** en el admin general (todas las categorias, incl. eventos) + NUEVA migracion **028** + exposicion en API. **TSK-145 COMPLETADA** en TASKS.md, **working tree, SIN commitear** (`db/migrations/028_destinos_zona.sql` NUEVA 100 lineas aditiva/idempotente/ASCII-safe: `ADD COLUMN IF NOT EXISTS zona TEXT` + CHECK `destinos_zona_chk` NULL|andina|amazonica|caribe|pacifico|llanos + indice `idx_destinos_zona`; `admin.html` `<select id="f-zona">` L771 UNA SOLA OBLIGATORIA con `validateForm` L4081/L4089-4093, cableado L2674/L3284/L3948/L6057/L6573; `api/admin-destinos.js` INSERT `zona` normalizado a NULL L187 (fix pre-deploy del `''` que la CHECK rechazaba -> 500 en los 103 loaders) + PUT fieldMap L274 + GET `d.zona` L110; `api/destinos.js` `toPlace()` L49 y modo mapa L168/L189). `api/interacciones.js` NO se toco (**8/8 INTACTO**); sin ADR tocado por este cierre (el **ADR-049 APROBADO** lo escribio `architect` en DECISIONS.md) ni BUG nuevo (defecto corregido pre-deploy). VERIFICADO ADR-006: node --check OK x2, ASCII 0, divs admin 815/815 diff 0, INSERT 35:35:35. **PENDIENTE OPERATIVO BLOQUEANTE: aplicar la 028 en Neon ANTES del deploy (42703).**
- Cierre documental EXPRESS **2026-09-20** (docs-only, ruta FREE): **BUG-079 CERRADO** (al actualizar los datos de una entrada del directorio se perdia la puntuacion de las fotos: la semantica REPLACE de `destinos_fotos` (DELETE + re-INSERT) generaba ids nuevos y `media_votos`/`media_comentarios` de media curada, que cuelgan de `destinos_fotos.id::text`, quedaban huerfanos). Fix trabajado en sesion previa; cierre documental AHORA: `api/admin-destinos.js` **v2.2** con `normFotosGaleria()` (L38) + `reemplazarFotosGaleria()` = **MERGE transaccional por id** (L83/L168: UPDATE conservando el id, fallback por url unica no usada, INSERT si no hay match, DELETE solo de filas no usadas, coherencia `es_hero`/`foto_hero`, 400 anti-perdida solo con items sin url valida; sin fotos -> merge omitido y galeria Neon preservada); `admin.html` con `_photoToObj()` (L4656-4671), `getPhotos()` con `id_neon`/`es_hero`/`orden` (L4712-4735), `_placeToAPI()` con `fotos_galeria` completa (L6068+), `_cargarFotosDeNeon()` fusiona por URL SIEMPRE al editar entrada publicada (L6219+; **cierra BUG-062**), VERSION `admin-v9.20260920`. **ADR-050 (APROBADO)** en DECISIONS.md = addendum que enmienda la premisa del ADR-030 (L822-823: el id SI es estable mientras la fila se preserva; la inestabilidad era del REPLACE, no del esquema). Sin TSK nuevo (no habia tarea abierta de galeria/fotos) -> cierre directo del bug en TASKS.md. Smoke vm **4/4**; node --check OK x2; ASCII 0/0/0; divs 815/815. `api/interacciones.js` NO se toco (**8/8 INTACTO**), sin migraciones. **PENDIENTE OPERATIVO: correr `scripts/diagnose_fotos_huerfanas.js` (NUEVO, read-only) en Neon para medir votos huerfanos HISTORICOS y decidir re-anclaje; commit/deploy junto al resto del working tree 2026-09-20.**
- Cierre documental EXPRESS **2026-09-20** (docs-only, ruta FREE): ESTADO PERSISTENTE del usuario en las paginas del directorio y en la ficha de destino -> guardados/visitas sobreviven al reingreso y la resena usa el NOMBRE DE LA CUENTA. **TSK-144 COMPLETADA** en TASKS.md, **working tree, SIN commitear** (`usuario-session.js` +54/-10 con `estaVisitado`/`estadoDestino`, `publicarResena` exige sesion; `api/pagina-destino.js` `precargarEstado()` idempotente via `onExploraCOUpdate`; `index.html` `_hidratarGuardadosDB` -> `renderDest()`; NUEVO `directorio-session.js` 234 lineas compartido por los 5 directorios con `mmSaved` a slug + sync DB). **BUG-078 NUEVO (CERRADO)** en BUGS_HISTORICOS.md. `api/interacciones.js` NO se toco (**8/8 INTACTO**), sin migraciones; smokes 61/61 + 14/14 + 14/14 PASS; QA APTO CON OBSERVACIONES.
- Cierre documental EXPRESS **2026-09-20** (docs-only, ruta FREE): ELIMINADA la heuristica de cercania del drawer del mapa cultural -> la media del resumen de un pin queda SOLO por vinculo explicito (`origen_id === slug|uuid`), para fotos, videos y audios (**ENMIENDA 1 del ADR-047**, escrita por architect en DECISIONS.md; **BUG-076 RECLASIFICADO**: su mitigacion eliminada, su sintoma = comportamiento de producto aceptado; **BUG-075** con nota cruzada). **TSK-143 COMPLETADA** en TASKS.md, **working tree, SIN commitear** (`mapa-cultural.js` + `index.html`/`comunidad.html` con cache-bust `?v=5`; smoke **73/73 PASS**; Escudo GOLD APTO CON OBSERVACIONES).
- Cierre documental **2026-09-20** (gobernanza de orquestacion): TERCER grupo de agentes primarios `hybrid-plan`/`hybrid-build` (esquema tripartito, ruteo por riesgo) -> **TSK-HYBRID-001 COMPLETADA** en TASKS.md, **ADR-048 APROBADO** en DECISIONS.md, AGENTS.md seccion 1.2 "Ruta HYBRID" y `orquestacion agentes.md` v1.1. `opencode.json` INTACTO (`default_agent` sigue `free-plan`; el bump a `hybrid-build` queda pendiente de decision del operador).
- Cierre documental EXPRESS **2026-09-20**: NUEVA gema Gemini "ExploraCO Research" (`GEMINI_GEMA_INVESTIGACION.md`, 154 lineas, **untracked**; TSK-141 COMPLETADA en TASKS.md). GAP de infraestructura detectado: `exp-pickle-free` listado en la matriz del AGENTS.md sin archivo de agente (runtime: "unknown agent type"). [Resuelto en la sesion posterior del mismo dia: `.opencode/agent/exp-pickle-free.md` ya existe HOY; ver TSK-HYBRID-001 / ADR-048.] HEAD real HOY `15c173d` (`main` == `origin/main`; los commits de docs `dbec863` "cierre documental + indice docs core" y `15c173d` "corte NEXT historico" son posteriores al registro de la sesion 2026-09-19).
- Cierre documental EXPRESS **2026-09-20**: pagina dinamica **salto-del-tequendama** (categoria `sitio`, ciudad Soacha, region Cundinamarca) **PUBLICADA en produccion** (id Neon `8c2b48fc-c6c5-4ec4-ad42-909a73911ce0`, `status=published`) desde el archivo corrupto `hotel tequendama.txt` -> **TSK-142 COMPLETADA** en TASKS.md. Ficha saneada en `ficha/`, 5 fotos Wikimedia verificadas (BUG-022), 3 scripts, smoke 15/15 PASS. Sin ADR nuevo ni bug de ExploraCO (data corrupta = archivo fuente). Deuda `[DEUDA-EXPRESS]` (horario/contacto/itinerario/archivos en la raiz) en la sesion de relevo.
- **Sesiones registradas HOY (2026-09-24):** (1) Pantallas de entrada (TSK-156, working tree SIN commitear / QA APTO CON OBSERVACIONES) y (2) Multiplicador de Origen por lejania (ADR-058 / TSK-155, COMMITEADO y en `origin/main` `e5a59f8`/`27784f8`, deploy Vercel autogenerado al push; pendiente solo QA runtime).
- Ultima sesion documentada: **2026-09-21/22 "El Taller de las Moscas" -> TSK-150 (cierre express docs-only; pagina dinamica `taller-de-las-moscas` PUBLICADA y VERIFICADA en produccion: HTTP 200 ~81KB, id Neon `99938930-aa6d-48d9-b353-6f2016f8e7ea` published, foto huerfano -4qfn ELIMINADO, rating 0 ADR-009; sin ADR ni bug nuevo)**. Anteriores: 2026-09-21 "Guardados en Mis Albumes (ADR-054)" -> TSK-149 (migracion 032 APLICADA en Neon el 2026-09-21, idempotencia verificada; backend `api/interacciones.js` v26 + fix BUG-082 + frontend + smokes; release PUSHEADO a `origin/main` en `b4ad861`; pendiente solo QA runtime en produccion). Anteriores: 2026-09-21 "Gamificacion v6 / ADR-053" -> TSK-148 (backend + migracion 031 + smokes COMMITEADOS en `9efbfc7`; frontend/8 espejos COMMITEADOS en `d803ce7` y PUSHEADOS a `origin/main`) + **BUG-002 CERRADO** y cierre del doble toast de XP. Anteriores: 2026-09-21 "Ubicacion por recurso + carpetas de guardados + fix de seguridad del mapa (TSK-147 / ADR-051 / ADR-052 / BUG-081; migraciones 029/030 aplicadas; working tree sin commitear)", 2026-09-21 "Render de media del mapa cultural" -> BUG-080 CORREGIDO EN CODIGO + TSK-146 (fix en working tree, SIN commitear; deploy pendiente). Anteriores: 2026-09-20 "Fix de votos de fotos curadas del admin" -> BUG-079 CERRADO + ADR-050 (cierre express, docs-only; working tree sin commitear), 2026-09-20 "Campo zona (region natural) en el admin general" -> TSK-145 + migracion 028 (docs-only; working tree sin commitear), 2026-09-20 "Estado persistente del usuario en directorios + ficha (cierre express)" -> TSK-144 + BUG-078 CERRADO (cliente; working tree sin commitear), 2026-09-20 "Drawer del mapa cultural solo por vinculo explicito" -> TSK-143 + ENMIENDA 1 del ADR-047 (cliente; working tree sin commitear), 2026-09-20 "Pagina dinamica salto-del-tequendama (cierre express)" -> TSK-142 (contenido publicado), 2026-09-20 "Agentes hybrid-plan/hybrid-build (esquema tripartito de orquestacion)" -> TSK-HYBRID-001 + ADR-048 (gobernanza; archivos sin commitear) y 2026-09-20 gema Gemini (TSK-141, cierre express).
- Sesion inmediatamente anterior: 2026-09-19 "Motor compartido del Mapa Cultural" -> TSK-133 (comunidad, commit b4ffd4e) + TSK-134 (migracion del index, commit 61392c0), ADR-045.
- Que sigue (resumen ejecutivo del bloque; el detalle por release vive en su tarea de `TASKS.md`):
- **[TSK-156 / Pantallas de entrada]** (0) [HECHO, ADR-006] el lote BASE (`api/usuarios.js`, `api/interacciones.js`, `registro.html`, `index.html`, `package.json`, `scripts/smoke_ref_info.js` con gate 26/26 PASS) ya esta commiteado en `5181564` (= `origin/main`); el pendiente "incluir el smoke en el commit" quedo RESUELTO.
- **[TSK-156]** (1) commit + push del REFINAMIENTO: SOLO `git add index.html registro.html usuario-session.js` (`usuario-session.js` es NUEVO); sin migraciones; Vercel despliega al push; `vercel.json` ya sirve `/(.*)\.js` con `no-store`; evaluar cache-bust BUG-073.
- **[TSK-156]** (2) QA runtime post-deploy: overlay 1 sola vez (`ec_welcome_visto`), UN solo boton "ENTRAR", enlace de registro, banner con NOMBRE del anfitrion via `ref_info`, reclamo post-alta `reclamar_bonus_referido`, REFERIDO_INVALIDO, y limpieza de `localStorage.user_points` con su toast al crear/entrar.
- **[TSK-155 / ADR-058 Origen]** (3) NOTA DE REALIDAD (ADR-006): ya commiteado y en `origin/main` (`e5a59f8` + `27784f8`); lo vigente es QA runtime post-deploy (`npm run smoke:origen` 111/111) + FASE 2 diferida.
- **[TSK-155]** (4) Orden cumplido: migracion **038 + seed geo APLICADOS en Neon** (2026-09-24) antes del backend v29/v30 (patron BUG-021/BUG-060). QA runtime: Local cerca ~1.00, Nomada lejano ~1.20, cuenta extranjera elegible ~1.40; congelar 7 dias al cambiar `ciudad_base`; `salud_red` con sus 4 bloques.
- **[TSK-155]** (5) FASE 2 DIFERIDA: con `@architect`, la verificacion documental de nacionalidad (alternativa 2 del ADR-058) y el auto-update del seed DIVIPOLA.
- **[TSK-153 / ADR-057]** commit + push de `api/interacciones.js`, `galeria.html`, `comunidad.html`, `mapa-cultural.js` y los 2 smokes. QA runtime: guardar un album AJENO acredita +5 al ejecutor y +10 al dueno solo la primera vez, y "Mi Museo" no pincha en el mapa publico.
- **[TSK-153]** FASE 2 DIFERIDA: con `@architect`, la curaduria de MODIFICACION de fichas (patron Activos Ocultos) y decidir si hace falta el flag `albumes.personal`.
- **[TSK-150]** QA visual OPCIONAL en navegador de `taller-de-las-moscas` (ya publicada y verificada por API/sitemap/smoke) + commit de sus 4 ficheros untracked en el proximo pase de docs. NO tocar los 2 `catch` vacios del seed (patron de ~106 seeds, deuda `[DEUDA-EXPRESS]`).
- **[TSK-149 / ADR-054]** QA runtime en produccion: guardados en "Mis Albumes", toggle "Hacer publico" y fix BUG-082 (`b4ad861` en `origin/main`; migracion 032 ya aplicada).
- **[TSK-148 / ADR-053]** Gamificacion v6 DESPLEGADA (031 en Neon, backend v25/v19/v4 en `9efbfc7`, frontend/8 espejos en `d803ce7`); verificar en produccion el toast con desglose, la barra de progreso, la UI de cupo y la pestana "Salud de la Red".
- **[TSK-147 / ADR-051 + ADR-052 + BUG-081]** DEPLOY v24 en el orden 029/030 (YA APLICADAS en Neon el 2026-09-21) -> backend `api/interacciones.js` v24 -> frontend con cache-bust (`?v=7`/`?v=4`/`?v=2`) -> smokes de 029/030 + fix del reset de `museoQuitarCoords`.
- **[TSK-146 / BUG-080]** DEPLOY del fix de media del mapa cultural (`mapa-cultural.js` + cache-bust `?v=7`) para que llegue a produccion + ampliar `scripts/smoke_mapa_cultural.js` con regresion.
- **Migracion 028: APLICAR en Neon ANTES del deploy del backend (BLOQUEANTE, 42703)** y luego commit/deploy del release (`admin.html` + `api/admin-destinos.js` + `api/destinos.js` + 028), coordinado con el de BUG-079 (`admin.html` v9.20260920 + `api/admin-destinos.js` v2.2).
- **[TSK-144 / TSK-143]** QA visual en navegador del estado persistente (los 5 directorios + la ficha en una sola sesion) y del drawer (TSK-135 + TSK-143); commit/deploy con cache-bust `?v=5` + `api/pagina-destino.js`.
- **Deudas de gobernanza heredadas (1):** `publicarResena` (consumidores `.then(function(ok){...})` fuera del flujo Vercel); los 103 `load-*-api.js` + `api/publicar-lugar.js` + `scripts/upload-eventos.js` que NO envian `zona`; decision de producto sobre el video/audio de comunidad no guardado.
- **Deudas de gobernanza heredadas (2):** codigo muerto `_syncFotosGaleria` (`admin.html` L6193, 0 call-sites) + la cita desfasada de `GUIA_DE_DESARROLLO.md` L482 (doc-drift); decidir la exclusividad de `es_hero` (hoy gana la ultima si el front manda dos).
- **[BUG-079]** CERRADO, fix en working tree: correr `scripts/diagnose_fotos_huerfanas.js` (NUEVO, read-only) en Neon para medir los votos de fotos curadas ya huerfanos por el REPLACE historico y decidir re-anclaje (con backup).
- **PENDIENTE DE APROBACION del operador:** las propuestas de gobernanza; commit del doc `ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md` con su `.docx` (untracked); confirmar la migracion 023 en Neon; el resto del deploy del release.

- Riesgos activos (resumen ejecutivo del bloque; el detalle por release vive en su tarea de `TASKS.md`):
- **[TSK-156]** el lote BASE ya esta commiteado (`5181564` = `origin/main`), pero el REFINAMIENTO (`index.html`, `registro.html`, `usuario-session.js`) sigue SIN commitear -> riesgo de **deploy PARCIAL**: commitear los 3 juntos.
- **[TSK-156]** deuda IDOR preexistente en `reclamar_bonus_referido` (no exige `validarSesion`; escalada a `sql-security`); bytes > 127 preexistentes en UI visible de `registro.html` y en el motor viejo de `index.html` (heredados; ASCII 0 solo en codigo NUEVO).
- **[TSK-156]** z-index del overlay 10000 verificado (bajo bono-ref 10002 y expEra 10001, sobre login 9999); `<link>` a Geist **SIN USAR** en `registro.html:12` (carga muerta, deuda de limpieza).
- **[TSK-156]** `[DEUDA-EXPRESS]`: ningun smoke cubre `reclamarXpDemo()` ni el overlay, y falta decidir el cache-bust de `usuario-session.js` (BUG-073) si aplica al deploy.
- **[ADR-058 / TSK-155]** NOTA DE REALIDAD: ya commiteado y en `origin/main` (`e5a59f8` + `27784f8`); el estado "EN WORKING TREE" de este bloque quedo resuelto. Restan QA runtime post-deploy, el **nerf M-4 visible** (usuarios sin `ciudad_base` pasan de x1.2 a **1.00**) y la FASE 2 diferida.
- **[ADR-058 / TSK-155]** La migracion **038 + seed geo** estan APLICADOS en Neon (1.122 ciudades / 245 paises); el backend v29/v30 y el frontend del badge **NO estan desplegados** (sin ventana de 503; mientras tanto el factor queda en 1.00).
- **[ADR-058 / TSK-155]** Origen auto-declarado: mitigado con `email_verified` + antiguedad (7 dias) + anti-teleport + monitoreo en `alertas_origen`, pero **sin verificacion documental** (deuda). Homonimos de municipios: desempate por `es_capital DESC, cod_mpio ASC` (`geo_ciudades`).
- **Migraciones 027 y 028 SIN aplicar (arrastre):** `consumibles.precio_xp_base` / vista `consumibles_precio` (027) y `destinos.zona` (028) siguen sin efecto. Si la 027 se aplica DESPUES de la 031, hay que re-sembrar `precio_xp_base` desde `precio_xp` (ADR-053 Decision 12 / R-2).
- **ORDEN de deploy del v24 (029/030 ya en Neon):** desplegar el **backend v24 ANTES del frontend**; si el front va primero, `lat_propia`/`carpetas` no existen y el `scope=mio` con Bearer no tendra contraparte. Deuda: `museoQuitarCoords` sin reset al cerrar el modal.
- **FUGA BUG-081 sin desplegar (ALTA/CRITICA):** `api/interacciones.js` v24 corrige en working tree la exposicion de media privada de terceros en `multimedia_mapa scope=mio`; mientras no se despliegue, **produccion mantiene la version vulnerable**.
- **Cache `?v=7` del mapa cultural sin desplegar (BUG-080 / TSK-146):** el fix de render de media vive solo en working tree; sin commit/deploy, produccion mantiene el render congelado y el atajo "Todo" inoperante. El video reportado "rastro mc-trampas" no existe en la BD (0 filas) aunque el backend SI devuelve la media.
- **ORDEN 028 -> deploy del backend (BLOQUEANTE):** desplegar `api/admin-destinos.js` / `api/destinos.js` sin aplicar la 028 en Neon da `42703 column does not exist` (los SELECT/INSERT ya referencian `d.zona`). Deuda de zona en 103 loaders + `publicar-lugar.js` + `upload-eventos.js` (no envian `zona`).
- **Deuda de zona (sigue):** zona **NO visible ni filtrable** en directorios, mapa y ficha; slugs `andina`/`amazonica` frente a los de la 027 `andes`/`amazonia` (sin FK); etiqueta `#f-barrio` "Barrio / Zona" frente al campo nuevo "Zona".
- **Gamificacion v6 DESPLEGADA (TSK-148 / ADR-053):** backend v25/v19/v4 (`9efbfc7`) + frontend/8 espejos (`d803ce7`) en `origin/main`; sin cache-bust (`vercel.json` -> `no-store`). Pendiente verificar en produccion el toast con desglose, la barra de progreso, la UI de cupo y la pestana "Salud de la Red".
- **Gamificacion v6 - deuda abierta:** `spot_atributos` "nunca al creador" no es enforceable sin `destinos.creado_por` (se hizo dedup por `(usuario,destino)` contra `xp_ledger`); el backend **NO expone** un contrato unico `estado_cupo` (la UI solo informa 429 y `tope_diario`); >100 fichas legacy con parches inline de XP en `localStorage` (+25/+8) que no llaman a la API.
- **Gamificacion v6 - deuda abierta (2):** `gamificacion_config` NO parametriza umbrales (recalibrar la curva 42000 exige deploy); techo 42000 sin datos de calibracion (7 usuarios, max ~1630 XP); `scripts/smoke_test_epic_prompt.js` con **4 FAIL preexistentes** (DQ-2: vocaciones 3->4 y filtro de `chat_salas`); el drift ADR-053 20->40 niveles sigue siendo deuda de arrastre.
- **[ADR-054 / TSK-149 DESPLEGADO]:** migracion 032 aplicada en Neon el 2026-09-21 (idempotencia verificada) + release en `origin/main` (`b4ad861`). **El DROP es IRREVERSIBLE:** la 032 descarto la organizacion previa en carpetas (perdida aceptada; rollback lossy). **BUG-082 (ALTA) DESPLEGADO:** `api/pagina-destino.js` ya filtra `af.visible=true` (L2762); queda QA runtime.
- **BUG-002 CERRADO (2026-09-21):** backticks del comentario L1646 y doble escape `\u2605` L2473 de `api/pagina-destino.js` en 0; R3 de TSK-144 resuelto y **doble toast de XP CERRADO** (la UI suprime el toast local si el servidor ya trae `xp_detalle`).
- **Riesgos de plataforma abiertos:** `media_compartidos` (el backend NO emite por `?tipo=multimedia_mapa`; requeriria cambio para volver a mostrar video/audio de comunidad en el drawer); docstring obsoleto en `mapa-cultural.js` L31-32; cache de assets compartidos sin bump de `?v=N` (BUG-073).
- **Riesgos de plataforma abiertos (2):** documentos Core de ~1.28 MB que encarecen el contexto; BUG-061 y BUG-065 **ABIERTOS**; QA visual y shape real de `?tipo=mapa` sin validar contra Neon; dependencia de `id_neon` del frontend (clientes legacy -> fallback por url unica; sin url valida -> 400 anti-perdida).
- **[BUG-079]** el fix solo evita huerfanos **NUEVOS**: los votos de fotos curadas ya huerfanos por REPLACE previos siguen en Neon (medicion y re-anclaje pendientes). Sin via para vaciar la galeria desde el admin (el caso "sin fotos" preserva lo existente a proposito).

- Documento de analisis: exploraco desarrollo/ampliacion desarrollo/ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md (NUEVO, 285 lineas, 0 bytes >127; PENDIENTE DE APROBACION).
- Presupuesto de funciones serverless: 8/8 INTACTO (ADR-001/ADR-010); ultima sesion (TSK-149 / ADR-054): migracion NUEVA **032** (idempotente/ASCII-safe) **APLICADA en Neon el 2026-09-21** (idempotencia verificada por segunda corrida); antes (TSK-147) las migraciones 029 y 030 quedaron **APLICADAS en Neon el 2026-09-21** (idempotentes, sin backfill); sin nuevas funciones serverless.
- Historico: sesiones del 2026-09-15 y anteriores (segundo corte agresivo, 2026-09-19), incluidas las Fases 6-9 y los bloques de Sprint 2-7, viven en NEXT_ARCHIVO.md (contenido conservado completo).

### Instruccion de lectura

Para continuar, leer primero este bloque y la seccion de la sesion mas reciente ("Que se estaba haciendo"); el resto del documento es historico y solo se consulta bajo demanda. El historico movido a NEXT_ARCHIVO.md se conserva completo (Cero Borrado Logico, Regla de Oro 3).

### Indice de secciones

- [Completado reciente](#completado-reciente)
- [Que se estaba haciendo](#que-se-estaba-haciendo)
- [Sesion 2026-10-05 - Vigencia de planes de viaje + gate de pestanas por nivel (TSK-179 / ADR-085)](#vigencia-de-planes-de-viaje--gate-de-pestanas-por-nivel---relevo-2026-10-05)
- [Sesion 2026-10-04 - Gobernanza del pase documental: fuente unica, sin megalineas y brief de maquina (TSK-178 / ADR-084)](#gobernanza-del-pase-documental-fuente-unica-sin-megalineas-y-brief-de-maquina---relevo-2026-10-04)
- [Sesion 2026-10-04 - Misiones desplegables por estado + galeria en el modal + Subir material (TSK-177 / ADR-077 ENMIENDA 1)](#misiones-desplegables-por-estado--galeria-de-perfil-en-el-modal--subir-material-en-gestion-del-museo---relevo-2026-10-04)
- [Sesion 2026-10-04 - Tier por modelo activo + atribucion de coste (ADR-083 / TSK-175)](#tier-por-modelo-activo--atribucion-de-coste---relevo-2026-10-04)
- [Sesion 2026-10-02 - Gate permanente del smoke de grupos + TSK-173 inventario de los 26 FAIL](#gate-permanente-del-smoke-de-grupos--tsk-173-inventario-de-los-26-fail---relevo-2026-10-02)
- [Sesion 2026-10-02 - Permisos totales + economia de turnos + smoke de grupos (ADR-078 / TSK-172)](#permisos-totales--economia-de-turnos--smoke-permanente-de-los-grupos---relevo-2026-10-02)
- [Sesion 2026-10-02 - Agrupacion plegable de items en Mi perfil (ADR-077 / TSK-171)](#agrupacion-plegable-de-items-en-mi-perfil-museo--guardados--niveles--mis-albumes---relevo-2026-10-02)
- [Sesion 2026-10-01 - Roster unico de 20 agentes + AGENTS.md (ADR-076 / TSK-170)](#roster-unico-de-20-agentes--agentsmd---relevo-2026-10-01)
- [Sesion 2026-09-30 - Capa gratuita de agentes restaurada (3 capas de coste / TSK-165 / ADR-074)](#capa-gratuita-de-agentes-restaurada-3-capas-de-coste---relevo-2026-09-30)
- [Sesion 2026-09-30 - Migracion de identidad ExploraCO a LATAWEL (rebranding TSK-164 / ADR-073)](#migracion-de-identidad-exploraco----latawel-rebranding---relevo-2026-09-30)
- [Sesion 2026-09-29 - Mapa base CARTO a OSM + incidente de tooling de subagentes](#mapa-base-carto-a-osm-teselas-e-incidente-de-tooling-de-subagentes---relevo-2026-09-29)
- [Sesion 2026-09-28 - Tanda ADR-067 (roster 40 -> 19 / orquestacion)](#tanda-de-coste-y-orquestacion-adr-067-roster-40---19-3-capas-con-presupuesto-r1-r4-y-3-modos-nuevos-de-informe-cuota---relevo-2026-09-28)
- [Sesion 2026-09-24 - Multiplicador de Origen por lejania (ADR-058 / TSK-155)](#multiplicador-de-origen-por-lejania-local-nomada-extranjero---relevo-2026-09-24)
- [Sesion 2026-09-24 - Pantallas de entrada (welcome overlay + registro dark dorado + referido ref_info / TSK-156)](#pantallas-de-entrada-welcome-overlay--registro-dark-dorado--referido-ref_info---relevo-2026-09-24)
- [Sesion 2026-09-23 - Consumibles con gate por era (ADR-056 / TSK-152)](#consumibles-con-gate-por-era-banda-exclusiva-de-compra---relevo-2026-09-23)
- [Sesion 2026-09-23 - Mercado de Emprendedores (ADR-055 / TSK-151)](#mercado-de-emprendedores-3-mercados-por-casa---relevo-2026-09-23)
- [Sesion 2026-09-22 - Pagina dinamica El Taller de las Moscas (cierre express / TSK-150)](#pagina-dinamica-el-taller-de-las-moscas---relevo-2026-09-22-cierre-express)
- [Sesion 2026-09-21 - Guardados en Mis Albumes (ADR-054 / BUG-082 / TSK-149)](#guardados-en-mis-albumes-adr-054--bug-082---relevo-2026-09-21)
- [Sesion 2026-09-21 - Gamificacion v6 / ADR-053 (TSK-148)](#gamificacion-v6--adr-053---relevo-2026-09-21)
- [Sesion 2026-09-21 - Ubicacion por recurso + carpetas de guardados + fix de seguridad del mapa (ADR-051 / ADR-052 / BUG-081 / TSK-147)](#ubicacion-por-recurso-de-album--carpetas-de-guardados--fix-de-seguridad-scopemio---relevo-2026-09-21)
- [Sesion 2026-09-21 - Render de media del mapa cultural (BUG-080 / TSK-146)](#fix-de-render-de-media-del-mapa-cultural--diagnostico-neon-del-video-reportado---relevo-2026-09-21)
- [Sesion 2026-09-20 - Fix de votos de fotos curadas del admin (BUG-079 / ADR-050)](#fix-de-votos-de-fotos-curadas-del-admin-al-actualizar-se-perdia-la-puntuacion---relevo-2026-09-20-cierre-express)
- [Sesion 2026-09-20 - Campo zona (region natural) en el admin general + migracion 028 (TSK-145)](#campo-zona-region-natural-en-el-admin-general--migracion-028---relevo-2026-09-20-cierre-express)
- [Sesion 2026-09-20 - Estado persistente del usuario en directorios + ficha (TSK-144 / BUG-078)](#estado-persistente-del-usuario-en-paginas-del-directorio--ficha-guardadosvisitas-y-resena-con-nombre---relevo-2026-09-20-cierre-express)
- [Sesion 2026-09-20 - Drawer mapa cultural (ENMIENDA 1 del ADR-047 / TSK-143)](#drawer-del-mapa-cultural-solo-por-vinculo-explicito---cierre-documental-express-2026-09-20)
- [Sesion 2026-09-20 - Agentes hybrid (ADR-048 / TSK-HYBRID-001)](#agentes-hybrid-planhybrid-build-esquema-tripartito-de-orquestacion---relevo-2026-09-20-adr-048)
- [Sesion 2026-09-20 - Pagina salto-del-tequendama (cierre express / TSK-142)](#pagina-dinamica-salto-del-tequendama-sitio-soachacundinamarca---relevo-2026-09-20-cierre-express)
- [Sesion 2026-09-20 - Gema Gemini ExploraCO Research (cierre express)](#gema-gemini-exploraco-research---cierre-documental-express-2026-09-20)
- [Sesion 2026-09-19 - Galeria/hero + Mis mapas (ADR-046 + ADR-047 / TSK-136..TSK-140)](#galeriahero-por-votos--mis-mapas-personales--guardados-de-media--propiedad-de-medios-del-mapa-2026-09-19---adr-046--adr-047--tsk-136tsk-140)
- [Sesion 2026-09-18/19 - Express (TSK-124..TSK-132)](#sesion-express-tsk-124tsk-132-ui-de-perfilgaleriacomunidad--media--modo-express-2026-09-1819---sin-adr-nuevo-nota-de-practica)
- [Sesion 2026-09-18 - Comunidad > Audiovisual (ADR-044 / TSK-123)](#sesion-tsk-123-correccion-comunidad--audiovisual-2026-09-18---adr-044)
- [Sesion 2026-09-18 - Modulos nuevos (ADR-042 + ADR-043 / TSK-119..TSK-122)](#sesion-tsk-119tsk-122-modulos-nuevos--bugs-activos-2026-09-18---adr-042--adr-043)
- [Sesion 2026-09-18 - Comunicacion oficial + Casas (ADR-041 / TSK-118)](#sesion-tsk-118-comunicacion-oficial--casas--admin-mapa-2026-09-18---adr-041)
- [Sesion 2026-09-18 - Museo URL-only + acordeon (ADR-039 + ADR-040 / TSK-114..TSK-117)](#sesion-tsk-114tsk-117-museo-url-only--acordeon-de-niveles--localizacion-y-map-picker-2026-09-18---adr-039--adr-040--enmienda-1-de-adr-039)
- [Sesion 2026-09-18 - Sprint Multimedia/Perfil/Galeria/Mapa (TSK-113)](#sesion-tsk-113-sprint-multimedia--perfil--galeria--mapa-2026-09-18---cierre-documental)
- [Sesion 2026-09-18 - Casas + Clases Rising Star (ADR-038 / TSK-112)](#sesion-tsk-112-sistema-de-casas-cofre--nivelacion-y-clases-rising-star-2026-09-18---adr-038)
- [Sesion 2026-09-17 - Geocerca 50 m + album_oficial (ADR-037 / TSK-111)](#sesion-tsk-111-geocerca-50-m-album_oficial-en-el-mapa-limpieza-del-admin-y-refactor-de-herogaleria-2026-09-17---adr-037)
- [Sesion 2026-09-17 - Compartir social con XP (ADR-036 / TSK-110)](#sesion-tsk-110-compartir-social-con-xp--interacciones-de-media-unificadas-2026-09-17---adr-036)
- [Sesion 2026-09-17 - XP decimal + Clase + rankings (ADR-035 / TSK-109)](#sesion-tsk-109-xp-decimal-pestana-clase-y-rankings-de-comunidad-2026-09-17---adr-035)
- [Sesion 2026-09-17 - Ficha: hero, sintro, galeria y modulos (ADR-034 / TSK-108)](#sesion-tsk-108-ficha-de-destino-hero-sintro-galeria-y-orden-de-modulos-2026-09-17---adr-034)
- [Sesion 2026-09-17 - Media del mapa y guardados (ADR-031/032/033 / TSK-107)](#sesion-tsk-107-media-del-mapa-guardados-de-media-y-radio-por-lugar-2026-09-17---adr-031--adr-032--adr-033)
- [Sesion 2026-09-16 - Capa multimedia y galerias (ADR-030 / TSK-106)](#sesion-tsk-106-capa-multimedia-galeria-comunidad-y-galeria-hospedajes-2026-09-16---adr-030-actualizado)
- [Sesion 2026-09-16 - Lote promptarreglos (ADR-030 / TSK-105)](#sesion-tsk-105-lote-promptarreglos---galeria-unificada-de-destino--arreglos-de-dm-galeria-popover-visita-y-album-2026-09-16---adr-030)
- [Historico (sesiones del 2026-09-15 y anteriores; TSK-104 y previas) - ver NEXT_ARCHIVO.md](NEXT_ARCHIVO.md)

## Completado reciente
- **COMMITEADA Y PUSHEADA** **2026-10-07** (TSK-197, commit `3df9603`; pase documental único R2, 8ª tanda): **la descripción de misión ya se explica al usuario.** Se añadió el campo `desc` ("qué hacer") a las **41 misiones** del catálogo `MISIONES` de `api/interacciones.js` (+41 líneas, 1 por misión; `entregarCatalogo` ya lo enviaba). `mi-perfil.html` renderiza `m.desc` como **2ª línea** en las tarjetas (`.mis-desc`, silo `#pf-misiones`, `:1977`) y en el acordeón de Niveles (`.nivel-mis-desc`, `:1777`), **condicional** (si `desc` es null no pinta). Verificación: `node --check` PASS; ASCII **0 bytes >127**; divs **570/570**; catálogo **ids 41 / desc 41**; `smoke_niveles_data` **31/31**; `smoke_test_perfil_progreso` OK; `smoke_grupos_perfil` **64/65** al cierre -> **ya resuelto (BUG-118 CERRADO) -> 109/109**. **Sin ADR, sin migración, 8/8 Vercel INTACTO.** Detalle en `TASKS.md` TSK-197.
- Cierre documental **2026-10-07** (TSK-196, pase documental único R2; 6 ficheros en working tree sin commit): **reparado el filtro del mapa cultural.** `mapa-cultural.js` **v1.4.0 -> v1.4.1** pasa a ser la **fuente única de verdad del estado de filtros** (slider a **paso 0.2**, contrato `toggleFilter`/`isFilterOn`/`setMediaSoloMio`/`getState()` ampliado, `ratingMinPrevio`); **desacople Directorio -> Medios** (`enableMediaOnAll` queda **inerte**); **persistencia silenciosa por página** (`mapa_filtros_home_v1` / `mapa_filtros_comunidad_v1`) con **gate de sesión** en la restauración de `mediaSoloMio`; UX de **doble zona** (cuerpo alterna filtro / caret abre menú) en `index.html` y `comunidad.html`; corregido el **bug de la vista de álbumes** (D2) y la coherencia del slider/etiquetas. Verificación: `smoke_mapa_cultural` **248 PASS / 0 FAIL**; GOLD verde; divs **367/367** y **458/458**; `verificar-capa-gratis` **OK**. Coste **$0.0219** (13 sesiones, `cache_read` 95.35%). **Sin ADR nuevo.** **Residuo BAJO:** 2 shims muertos en `index-api-connector.js`. Detalle en `TASKS.md` TSK-196.
- Cierre documental **2026-10-04** (TSK-177 + **ADR-077 ENMIENDA 1**, commit **`8315fb0`** en `main`; pase documental unico R2 al cierre y **despues** del push, por indicacion del operador): **la galeria de perfil sale del cuerpo de la pagina, Misiones pasa a desplegable por ESTADO y "Gestion del Museo" recupera la subida de material.**
- **Decision:** `DECISIONS.md` **ADR-077 ENMIENDA 1** -- Misiones es la **5.a superficie** de `pfGruposRender()` y el eje pasa a ser por ESTADO; **NO es un ADR nuevo**. Reintroduce, con `id` distinto y por peticion del operador, la capacidad que TSK-160 habia retirado.
- **Verificacion (ADR-006):** `npm test` EXIT 0 (22 pasos, 0 FAIL); `smoke_grupos_perfil.js` 73 -> 109 (109/109 PASS); `smoke_042` 30 -> 45; divs 526/526; residuos = 0; ASCII 0 bytes > 127; **8/8 endpoints INTACTO**, sin endpoint nuevo ni migracion.
- **Pendiente:** QA runtime manual del modal. Detalle de ejecucion en `TASKS.md` TSK-177 y relevo en la seccion "Que se estaba haciendo".

- Cierre documental **2026-10-04** (TSK-176, pase documental unico R2, commit PENDIENTE) - **Realineacion del hero y del posicionamiento de la HOME**, un solo archivo (`index.html`, 16 inserciones / 11 borrados). (1) La eyebrow `.hsey` paso de "Directorio turistico oficial de Colombia" a "**Plataforma de turismo interactivo**" (se conservan la bandera y los `span` decorativos). (2) Se **ELIMINO** la tira de categorias `.htag` ("Hospedajes / Comida / Lugares / Eventos culturales") que estaba entre el logo y la barra de busqueda: se borro su HTML **y** su regla CSS muerta. (3) Typo corregido en la pastilla de comida: "Comidanomia" -> "**Comida**". (4) Las **4 pastillas de categoria del hero (`.hcat`) ya no se encienden en `--gold`**: cada una usa el color que su item ya tiene en el directorio (Hospedajes `#3B82F6`, Comida `#EF4444`, Lugares `#22C55E`, Eventos `#A855F7`); el `:hover` tambien toma su color de categoria y el estado encendido suma un fondo translucido del mismo color; **la regla generica unica se sustituyo por 8 reglas por categoria**. Los botones de "Destacados" (`.dc-btn`) **se dejan en gold por decision del operador** y **el JS de filtros no se toco**. (5) **Meta/OG/Twitter y footer de la HOME realineados** con el nuevo posicionamiento (`meta description`, `og:title`, `og:description`, `twitter:title`, `twitter:description` y el `.fdesc` del footer); **NO se tocaron** `canonical`, `og:url`, `og:image`, `og:type`, `og:site_name` ni el `<title>`. **Verificacion (ADR-006):** "Plataforma de turismo interactivo" **7/7**; `htag` **0**; `Comidanom` **0**; "oficial de Colombia" **0** en `index.html`; balance de divs **368/368**; bloques `<script>` **11/11** (el 12 es un comentario HTML preexistente); cascada CSS correcta porque `.hcat[data-cat="x"].on` gana a `.hcat`. **8/8 endpoints INTACTO** (ADR-010); sin migraciones; `index_pre_full.html` sin tocar (backup, **no es un bug**). **SIN ADR nuevo**: copy y CSS no son arquitectura y el encargo lo prohibia explicitamente. Detalle en `TASKS.md` TSK-176.
- Cierre **2026-09-23** (TSK-154; **BUG-060 CERRADO + BUG-084 NUEVO CERRADO**; fix DESPLEGADO en `1302f7c`) - **Museo publico no se visualiza** (`perfil.html?id=<uuid>`). Causa raiz DOBLE: (a) **datos (BUG-060):** `db/migrations/004_usuarios_blog_autor.sql` nunca se habia aplicado en Neon (`usuarios.foto_url` AUSENTE), resuelto con `node scripts/apply_004_foto_url.js` (idempotente; verificado en vivo `[1] Antes: foto_url=AUSENTE ciudad_base=EXISTE` -> "VEREDICTO: OK - esquema migrado"); (b) **codigo (BUG-084):** en `api/interacciones.js` la rama `museo_publico` pasaba a `queryConAvatarFallback` el reemplazo `['foto_url','avatar_url AS foto_url']`, pero la plantilla YA incluye `__FOTO_URL__ AS foto_url`, asi que el reintento por `42703` generaba `avatar_url AS foto_url AS foto_url` -> **SQLSTATE 42601** -> **HTTP 500** (incluso para UUID inexistentes, devolvia 500 en vez de 404). Fix: reemplazo `['foto_url','avatar_url']` (hoy L4312) + comentario explicativo (L4298-4304); commit **`1302f7c`** ("museo publico: fix fallback avatar_url AS duplicado (BUG-060)") pusheado a `origin/main` (`016d0b3..1302f7c`). **Evidencia en vivo (produccion `https://exploraco.vercel.app`):** `GET ?tipo=museo_publico&id=3b78efad-e9f6-49a7-bbd1-af836f528348` -> **HTTP 200** con payload completo (usuario, vitrina, logros, cromos, albumes, mapa, arbol, parche, stats); antes 500. `GET ...&id=<uuid inexistente>` -> **HTTP 404**; antes 500. `GET ?tipo=museo_recurso&usuario_id=...` -> 200 y `GET ?tipo=mis_fotos&usuario_id=...` -> 200 (ya funcionaban). Escudo GOLD **PASS** (`node --check` OK; ASCII bytes>127 = 0, delta 0 vs HEAD; `git diff -U0` = 2 hunks, cero cambios colaterales); barrido de los **9 call sites** de `queryConAvatarFallback` sin otro defecto; smoke `scripts/smoke_017_perfil_arbol_casas.js` **67/73 PASS** IDENTICO al baseline en HEAD (6 fallos preexistentes B5/C1a/C1b/C1c/C2a/C2b, cero regresiones nuevas). **8/8 INTACTO**; sin ADR nuevo. Deuda (fuera de alcance, NO corregido): `perfil.html:979` fetch de `museo_publico` SIN JWT (el dueno de un perfil privado veria "Museo privado"); mensajes de error del frontend genericos; **BUG-061 sigue ABIERTO**. Detalle en TASKS.md TSK-154 y BUGS_HISTORICOS.md BUG-060/BUG-084.
- Cierre documental **2026-09-23** (TSK-151 + ADR-055 + BUG-083, working tree SIN commitear) - **Mercado de Emprendedores**. (1) **Migracion 034:** `db/migrations/034_mercado_emprendedores.sql` (NUEVA, aditiva/idempotente/ASCII-safe, 360 lineas): `usuarios.mercado_puntos numeric(12,2) NOT NULL DEFAULT 0`; `mercado_config` (PK `casa` + semilla condor 2%/25%, jaguar 5%/10%, delfin 0%/5%); `mercado_ofertas`; `mercado_ventas`; **seccion 4-bis** (auto-provision idempotente de `precio_xp_base`/`precio_xp_actual`/`tipo_canje`, NO-OP si la 027 ya corrio); semilla de producibles (`prod_artesania`/`prod_cafe`/`prod_souvenir`). **PENDIENTE de aplicar en Neon.** (2) **Backend:** `api/interacciones.js` **v28** (GET `mercado_config|mercado_ofertas|mercado_mi`; POST `mercado_publicar|mercado_comprar|mercado_cancelar|mercado_producir`; `MERCADO_NODOS` 5 nodos tiers `[0,100,250,450,700]`; **gate doble de nivel APLICADO** (`nodoMercadoPorNivel`/`calcularMercadoEfectivo`: nodo efectivo = `min(puntos, nivel)`, `nivel_jugador` `[2,5,10,20,30]`; aplicado en `mercado_mi` owner-only con `nodo_por_puntos`/`nodo_por_nivel`, `mercado_publicar`, `mercado_comprar` (nodo del vendedor) y `mercado_producir`); impuesto efectivo `max(0, base - reduccion)` piso 0; compra atomica en UNA sentencia con CTEs sin `FOR UPDATE`; `23514`->409; anti-farming 20/24h, autocompra y cross-Casa prohibidos); `api/usuarios.js` **v21** (`mercado_puntos`/`mercado_nodo` en el perfil, con espejo `calcularMercadoLocal`/`MERCADO_NIVELES` que aplica el MISMO gate doble); `api/admin.js` **v5** (`?recurso=mercado`: config lista/editar + ofertas lista/moderar). (3) **Frontend:** `mercado.js` (NUEVO, `window.Mercado`), tab Mercado en `comunidad.html`, card Emprendedor en `mi-perfil.html`, pantalla Mercado en `admin.html`. (4) **Verificacion:** `npm test` **VERDE (exit 0)** + `scripts/smoke_mercado.js` **38/38 PASS** (encadenado; gate doble de nivel verificado: nodo efectivo = `min(puntos, nivel)`); Escudo GOLD verde (ASCII 0/0; divs 0 en comunidad 323/323, mi-perfil 421/421, admin 915/915). **8/8 INTACTO.** **BUG-083 NUEVO (CERRADO)** en BUGS_HISTORICOS.md. Deuda `[DEUDA-EXPRESS]`: validar `mercado_mi` con sesion real; contrato oferta/demanda con datos reales. **PENDIENTE OPERATIVO BLOQUEANTE: aplicar la 034 en Neon -> deploy backend -> frontend.**
- Cierre documental express **2026-09-22** (TSK-150, modo express docs-only, ruta FREE; sin tocar codigo) - pagina dinamica **"El Taller de las Moscas"** (slug `taller-de-las-moscas`, categoria `sitio`/subcultura, Bogota/Chapinero) **PUBLICADA y VERIFICADA en produccion** el 2026-09-21/22. URL **HTTP 200 (~81KB)** https://exploraco.vercel.app/taller-de-las-moscas.html (hero, sobre, dificultad, entradas, tours, que llevar, itinerario, FAQ, mapa, resenas, relacionados, JSON-LD); destino **id Neon `99938930-aa6d-48d9-b353-6f2016f8e7ea` `status=published`** (~/api/destinos?categoria=sitio; city Bogota, region Bogota D.C., barrio Chapinero Central); galeria en `destinos_fotos` verificada (~/api/interacciones?tipo=galeria_destino, IDs 2201-2204+, compliance BUG-022: HOGRE street art, Melaka Art Gallery, Taller Nacional de Grafica, ZineDisplay). Ficha curada `ficha/taller de las moscas.json` (Cra. 19a #61b 81, Mie-Sab 2:00 PM - 8:00 PM, entrada libre, FAQ x5, tour autoguiado). 3 scripts nuevos: `scripts/seed-taller-de-las-moscas.js` (upsert Neon), `scripts/load-taller-de-las-moscas-api.js` (loader DELETE+POST), `scripts/smoke_test_taller-de-las-moscas.js` (fake_neon + buildHTML; **14/14 PASS**, divs 248/248 diff=0). **Limpieza del huerfano `taller-delas-moscas-bogota-4qfn`** (eliminado por el DELETE previo del loader; ya NO aparece en sitemap.xml; causa raiz: slug no persistido en el formulario admin + foto vacia rompiendo `buildHTML` -> 404). Escudo GOLD: `node --check` 3/3, ASCII 0/0/0. Rating en **0** (ADR-009, sin resenas sembradas). **8/8 INTACTO**; SIN ADR nuevo ni bug nuevo (**BUG-034** sigue ABIERTO, NO se duplica; DECISIONS.md y BUGS_HISTORICOS.md NO se tocaron). 4 archivos nuevos **untracked**. Deuda `[DEUDA-EXPRESS]`: 2 `catch` vacios en el seed = patron preexistente de los ~106 seeds (NO tocar el triplete). Pendiente: QA visual opcional en navegador + commit de los 4 untracked. Detalle en "Que se estaba haciendo" y `TASKS.md` TSK-150.
- Cierre **2026-09-21** (TSK-149 + ADR-054 + BUG-082, DESPLEGADO en `b4ad861`) - **guardados de media en "Mis Albumes"**. (1) **Migracion 032:** `db/migrations/032_guardados_album.sql` (NUEVA, idempotente/ASCII-safe, 17152 bytes): `media_guardados.album_id uuid NULL REFERENCES albumes(id) ON DELETE SET NULL` + `visible boolean NOT NULL DEFAULT false` + CHECK `media_guardados_visible_album_chk (visible=false OR album_id IS NOT NULL)` + 2 indices; **DROP** de `guardados_carpetas` y de `media_guardados.carpeta_id`. **APLICADA en Neon el 2026-09-21** (idempotencia verificada por segunda corrida). (2) **Backend v26:** `mis_guardados_media` EXIGE sesion y deriva el dueno del token (ignora `usuario_id` del query), reemplaza `carpetas[]` por `albumes[]` + `mi_album_id`/`mi_album_titulo`/`visible` por item, conserva `data[]` y el 503 `SCHEMA_NOT_MIGRATED` tipado; `guardados_carpeta` -> `accion=album|publicar` (410 `CARPETAS_DEPRECADAS` para crear/renombrar/eliminar/mover; 404 `ALBUM_NO_ENCONTRADO`/`GUARDADO_NO_ENCONTRADO`; desasignar fuerza `visible=false` en la MISMA sentencia); `album_detalle` agrega `guardados[]`/`albumes_guardados[]` con invariante de no-fuga; hardening BUG-061 en `guardar_media`/`quitar_guardado_media`/`album_crear`. (3) **BUG-082 (ALTA, fix colateral):** `api/pagina-destino.js` agrega `AND af.visible=true` (L2762) a la consulta de fotos de album por cercania. (4) **Frontend:** `mi-perfil.html` (chips/select por album + toggle "Hacer publico" + `fetchConJwt`) y `mymapa.js` (Bearer); divs HTML 419/419. (5) **Verificacion:** NUEVO `scripts/smoke_032_guardados_album.js` (45), poda de `scripts/smoke_029_030_coords_carpetas.js` (42) y `scripts/smoke_036_media_unificada.js` J35 (90); **`npm test` 536 PASS / 0 FAIL (exit 0)**. **8/8 INTACTO.** **DESPLEGADO (2026-09-21): migracion 032 aplicada en Neon + push `b4ad861` a `origin/main`; Vercel despliega al push. PENDIENTE: QA runtime en produccion.** Detalle en TASKS.md TSK-149, DECISIONS.md ADR-054 y BUGS_HISTORICOS.md BUG-082.
- Cierre **2026-09-21** (TSK-148 + ADR-053 + ENMIENDA 1, backend/migracion/smokes COMMITEADOS en `c875675`/`9efbfc7` y frontend en `d803ce7`, todo PUSHEADO a `origin/main`) - **Gamificacion v6**. (1) **Diseno (Fase 1):** ADR-053 (L~2723-3083) + **Enmienda 1** de `@architect-review` (APROBADO CON CAMBIOS; 4 hallazgos ALTO: router `?recurso=` de `api/admin.js`, 7+ espejos, >=22 puntos de escritura de `xp_total`, semantica de `mult_stack`/`media_compartidos.xp_ganado`) y spec en `docs/superpowers/specs/2026-09-21-gamificacion-nivel-scaling-v6-design.md` (seccion 16 = Enmienda 1). (2) **BD (Fase 2):** `db/migrations/031_gamificacion_v6_nivel_scaling.sql` (24495 bytes) COMMITEADA (`c875675`) y **APLICADA en Neon** (11 sentencias OK): `usuarios.nivel_max smallint NOT NULL DEFAULT 1` (sembrado con la tabla vieja), `gamificacion_config` (5.0/10.0/3.0), `xp_ledger` (13 columnas, `numeric(10,6)`, CHECK `cap_aplicado IN ('ninguno','progresion','global','accion')`, 2 indices) y repricing ABSOLUTO de los 17 `consumibles.precio_xp` (impulso x2.0, resto x1.6) con guard de la 027. (3) **Backend (Fase 3):** `api/interacciones.js` **v25** (motor con doble cap secuencial 5.0/10.0, `XP_BASES` de 19 claves, 29 call-sites de `registrarXpLedger`, 20 de `calcularXpAcreditado`, rama `?tipo=spot_atributos`); `api/usuarios.js` **v19** (20 umbrales techo 42000 + `mult`, `nivel_visible` con `GREATEST`, elecciones 800/500/500); `api/admin.js` **v4** (`GET ?recurso=salud_red` + espejo `NIVEL_DERIVADO_SQL`, degradacion 42P01). (4) **Frontend (Fase 4, working tree):** 8 espejos sincronizados + 20 titulos, errata `Estrat\u00e9ga` -> `Estratega Comunitario`, toast con desglose y dedup, barra de progreso, UI de cupo (`mostrarEstadoCupo`), pestana admin "Salud de la Red". **Verificacion:** `npm test` **VERDE (exit 0)** con `smoke_gamificacion_v6.js` 30 y `smoke_niveles_espejos.js` 10/10 nuevos + legacy 95/78/45/55/15/31. **BUG-002 CERRADO** y doble toast de XP cerrado. **8/8 INTACTO.** **PENDIENTE: deploy del frontend (cache-bust); 027/028 siguen SIN aplicar.** Detalle en TASKS.md TSK-148, DECISIONS.md ADR-053, BUGS_HISTORICOS.md BUG-002/errata.
- Cierre **2026-09-21** (TSK-147 + ADR-051/ADR-052/ENMIENDA 2 ADR-047 + BUG-081, working tree SIN commitear) - **ubicacion individual por recurso de album + carpetas de guardados + fix de seguridad del mapa**. (1) **Feature A / ADR-051:** `album_fotos.lat/lng` (migracion **029**, APLICADA en Neon el 2026-09-21) permite pin propio por video/foto; `multimedia_mapa` emite `COALESCE(af.lat,a.lat)`; `GET museo_recurso` expone `lat_propia`/`lng_propia`/`coords_heredadas` + `lat/lng` efectivas; `POST museo_recurso` persiste `af.lat/lng`, acepta `album_lat/album_lng` (COALESCE al sembrar) y `quitar_coords`; fallback recurso -> album -> `coordsFallbackAutor`. (2) **Feature B / ADR-052:** tabla `guardados_carpetas` + `media_guardados.carpeta_id` (migracion **030**, APLICADA en Neon) para organizar bookmarks en carpetas privadas; `mis_guardados_media` expone `carpeta_id/carpeta_nombre` + `carpetas:[]` con 503 `SCHEMA_NOT_MIGRATED` (ya no degrada a `[]`); nueva rama `POST ?tipo=guardados_carpeta` (crear|renombrar|eliminar|mover) con `validarSesion`; eliminar = soft-delete sin borrar bookmarks (ADR-003); NO toca Museo/albumes. (3) **Fix de SEGURIDAD / BUG-081 (ALTA/CRITICA):** `multimedia_mapa scope=mio` ya no expone privados de terceros: exige sesion firmada (`400 SESION_REQUERIDA`), deriva el uuid del token, ignora el query param y usa `(mmScopeMio && mmUsuarioId ? '' : ' AND af.visible=true')`. (4) **ENMIENDA 2 ADR-047:** el mapa personal (`filterMisMapa`, `mymapa.js`) incluye la media de album PROPIA del dueno via `_propia`; `filterMediaDefault` intacto. Frontend: `mi-perfil.html`, `mymapa.js`, `map-picker.js` (pin arrastrable), `index-api-connector.js` (Bearer); cache-bust `mapa-cultural.js?v=7`, `mymapa.js?v=4`, `map-picker.js?v=2`, `index-api-connector.js?v=2`; nuevo `scripts/apply_sql_file.js`. Release `api/interacciones.js` **v24** (+313/-67). **8/8 INTACTO.** **PENDIENTE: deploy en orden 029/030 (YA en Neon) -> backend v24 -> frontend; smokes nuevos de 029/030 en curso; fix del reset de `museoQuitarCoords`.** Detalle en "Que se estaba haciendo", `BUGS_HISTORICOS.md` BUG-081 y `TASKS.md` TSK-147.
- Cierre documental **2026-09-21** (TSK-146 + BUG-080, working tree SIN commitear) - **render de media del mapa cultural**. Los videos/fotos de viajero no se pintaban como pines en `index.html` aunque el backend SI los devolvia. Causa raiz DOBLE en `mapa-cultural.js`: (1) `onMoved()` (L663-666, enganchado a `moveend` L1665) solo re-ejecutaba `recluster()`, dejando la capa de media con el viewport inicial (se descartaba en silencio por `if (!bounds.contains([lat,lng])) return;` L1040); (2) el atajo "Todo" de `filterPins()` (L941-950) encendia `st.mediaEnabled` pero no rellenaba `st.mediaTypes`, y `renderMedia` descarta todo sin tipo activo (L1039). **Fix:** `onMoved` ahora `setTimeout(function(){ recluster(); renderMedia(); }, 150)`; el atajo "Todo" delega en `setMediaEnabled(true)` (rellena los 3 tipos) o llama `renderMedia()`; cache-bust `mapa-cultural.js?v=6` -> `?v=7` en `index.html` (L883) y `comunidad.html` (L566). **Hallazgo operativo:** el video "rastro mc-trampas" reportado como subido NO EXISTE en la BD (`ILIKE '%rastro%'` en `album_fotos`/`destinos_fotos`/`interacciones` = 0 filas); los 5 videos reales de la cuenta son "Los piratas de ramirez" (activo, 2026-09-21), "Xxl" (activo, 2026-09-19), "Casa de carton" (inactivo, 2026-09-18), "Skyzo en la 26" (activo, 2026-09-18) y un "Skyzo en la 26" duplicado (inactivo, album "Bogota, capital", 2026-09-18); album "Mi Museo" activo en lat=4.584784/lng=-74.075065. Sin starvation (5 filas de album / 1147 de destinos vs 300/600, descarta BUG-069). Herramientas nuevas read-only: `scripts/neon_select.js`, `scripts/load_env_local.js` y `db/queries/q1..q4_*.sql`. Verificacion: `node --check` OK, ASCII 0, divs index 370/370 y comunidad 320/320, `scripts/smoke_mapa_cultural.js` OK. `api/*.js` NO se toco (**8/8 INTACTO**), sin migraciones, sin ADR. **PENDIENTE: deploy (commit/push + Vercel) para que el cache v7 llegue a produccion + ampliar el smoke con regresion.** Detalle en BUGS_HISTORICOS.md BUG-080, TASKS.md TSK-146 y "Que se estaba haciendo".
- Cierre documental express **2026-09-20** (TSK-145, modo express, working tree SIN commitear) - nuevo campo **`zona` (region natural)** en el admin general (todas las categorias, incl. eventos) + NUEVA migracion **028** + exposicion en API. `db/migrations/028_destinos_zona.sql` (100 lineas, aditiva/idempotente/ASCII-safe): `ADD COLUMN IF NOT EXISTS zona TEXT`, CHECK `destinos_zona_chk` (NULL o andina/amazonica/caribe/pacifico/llanos) idempotente via `pg_constraint`, indice `idx_destinos_zona`. `admin.html`: `<select id="f-zona">` L771 (UNA SOLA, OBLIGATORIA) + validacion en `validateForm()` L4081/L4089-4093 + cableado L2674/L3284/L3948/L6057/L6573. `api/admin-destinos.js`: INSERT `zona` normalizado a NULL si ausente/vacio (L187; fix pre-deploy del `''` que la CHECK rechazaba -> 500 en los 103 loaders) + PUT fieldMap L274 + GET `d.zona` L110. `api/destinos.js`: `toPlace()` L49 y modo mapa L168/L189. Decision de producto: una sola zona, obligatoria, valores Andina/Amazonica/Llanos/Caribe/Pacifico, cubre eventos; `region` sigue siendo departamento (documentada como **ADR-049 APROBADO** en DECISIONS.md, escrito por architect 2026-09-20; NO se toca en este cierre). `api/interacciones.js` NO se toco (**8/8 INTACTO**); sin BUG (defecto corregido pre-deploy). VERIFICADO ADR-006: `node --check` OK x2, ASCII 0, divs admin 815/815 diff 0, INSERT 35:35:35. **PENDIENTE OPERATIVO BLOQUEANTE: aplicar la 028 en Neon ANTES del deploy (42703).** Deuda: 103 `load-*-api.js` + `publicar-lugar.js` + `upload-eventos.js` sin `zona`; zona no visible/filtrable aun en directorios/mapa/ficha; slugs `andina`/`amazonica` vs 027; etiqueta `#f-barrio` "Barrio / Zona". Detalle en "Que se estaba haciendo" y `TASKS.md` TSK-145.
- Cierre documental express **2026-09-20** (TSK-144, modo express, working tree SIN commitear) - ESTADO PERSISTENTE del usuario en las paginas del directorio y en la ficha de destino: los guardados (corazones) y las visitas ("Estuve aqui") sobreviven al reingreso y la resena usa el **NOMBRE DE LA CUENTA** en vez del correo generico `nombre@explorador.co`. **`usuario-session.js` +54/-10:** NUEVOS `window.ExploraCO.estaVisitado(uuid)` (~L847-870; reusa GET `?tipo=mapa&usuario_id` -> `data.visitados`; sin sesion = false) y `estadoDestino(uuid)` (~L872-894; `Promise.all([estaGuardado,estaVisitado,obtenerMiVoto])` -> `{guardado,visitado,voto}`); `publicarResena` (~L719-729) AHORA EXIGE SESION (modal login + `{ok:false, requiere_login:true}`, ya NO crea `nombre@explorador.co`, POST conservado con `usuario_id` real). **`api/pagina-destino.js`:** `precargarEstado()` idempotente (~L2638-2662) enganchada en `window.onExploraCOUpdate` + respaldo DOMContentLoaded (marca `#btn-guardar`/`#btn-visitado`, pinta `#qr-stars`; corrige causa raiz de timing de sesion), `#rvn` readonly con `usuario.nombre`, `submitRv` con nombre de cuenta, callback de publicacion corregido a `if(ok===true)` (~L2511). **`index.html` (~L3535-3540):** `_hidratarGuardadosDB()` ahora llama `renderDest()` con guardados/visitas nuevos (corazones del home persistidos). **NUEVO `directorio-session.js` (234 lineas, ASCII-safe)** compartido por los 5 directorios: `mmSaved` migrado a SLUG, `tSave` persiste a BD (`guardarDestino`/`quitarGuardado`) con sesion, hidratacion DB via `cargarMiMapa()` + `renderDir()`, migracion re-ejecutable de `mm_saved` legacy numerico -> slug (catalogo embebido Y API connector); editados `directorio.html` + 4 sub-directorios (se elimina `tSave` local duplicado, Tripwire 5 lineas; `usuario-session.js` agregado a los 4 sub-directorios). **BUGS_HISTORICOS.md BUG-078 NUEVO (CERRADO)**. `api/interacciones.js` NO se toco (**8/8 INTACTO**), sin migraciones. Verificado ADR-006 (firmas reales `estaVisitado` L850, `estadoDestino` L875, `precargarEstado` L2648 + `onExploraCOUpdate` L2661, `if(ok===true)` L2511, `_hidratarGuardadosDB` L3491 -> `renderDest` L3539, `tSave(slug,btn)` L165). Smokes: `smoke_auditoria_pagina_destino.js` **61/61**, `smoke_estado_sesion_destino.js` **14/14** (NUEVO), `smoke_directorio_session.js` **14/14** (NUEVO), `check_buildHTML_inline.js` OK, `smoke_mapa_cultural.js` 58 checks OK; `node --check` OK x3; ASCII 0 bytes >127; divs diff 0 (index + 5 directorios); QA **APTO CON OBSERVACIONES**. Deuda: R2 (legacy `.then(function(ok){ if(ok) })` en `Monserrate2.html`/`lacandelaria2.html`/`gen_body7.js`/`_*.html`/`_check_monserrate2.js`/`_tmp_lac2.js`); R3 (BUG-002 ABIERTO, doble escape `\u2605` L2473 + backticks L1646); doble toast posible en directorios con sesion. Detalle en "Que se estaba haciendo" y en `TASKS.md` TSK-144.
- Cierre documental express **2026-09-20** (TSK-143, modo express, working tree SIN commitear) - eliminada la **heuristica de cercania del drawer del mapa cultural**: la media del resumen de un pin quedaba con VIDEO/AUDIO de comunidad (`origen='album'`) por misma ciudad o <= 10 km (fallo global; el pin de `hostal-r10-bogota` mostraba todos los videos/audios de Bogota). Ahora el drawer muestra SOLO media con **vinculo explicito** (`origen='destino'`/`'destino_album'` y `origen_id === slug|uuid` del lugar) para fotos, videos y audios. **ENMIENDA 1 del ADR-047** (DECISIONS.md, escrita por architect; reclasifica BUG-076: mitigacion eliminada, sintoma = producto aceptado; nota cruzada en BUG-075). `mapa-cultural.js` `filterMediaPropios` L202-230 simplificada (sin `ciudad`/`lat`/`lng`/`esVideoAudio`/`cerca`/`haversineKm <= 10`; `haversineKm` sigue viva L106); `mediasCercanas` L1143-1149 con comentario actualizado; **la CAPA del mapa NO cambia**. Cache-bust `?v=4` -> `?v=5` en `index.html` (L882) y `comunidad.html` (L566). Smoke `scripts/smoke_mapa_cultural.js` **73/73 PASS** (check L272 invertido); Escudo GOLD OK (node --check, ASCII 0 >127, divs diff 0 ambos HTML); QA **APTO CON OBSERVACIONES** (docstring L31-32 de `mapa-cultural.js` que otro agente corrige; dar superficie a video/audio no guardado en `comunidad.html` pendiente de decision de producto). Via futura: `media_compartidos` (migracion 022 `fuente='album_foto'`+`destino_id`, backend NO lo emite hoy por `?tipo=multimedia_mapa`). Detalle en "Que se estaba haciendo" y `TASKS.md` TSK-143.
- Cierre documental express **2026-09-20** (TSK-142, modo express) - pagina dinamica **`salto-del-tequendama`** (categoria `sitio`, ciudad Soacha, region Cundinamarca) **PUBLICADA en produccion** desde el archivo fuente corrupto `hotel tequendama.txt` (ficha JSON a medio generar; lineas 92-119 con texto de error de Gemini). Saneada la ficha -> `ficha/ficha-salto-del-tequendama.md` (JSON valido, FAQS x5, FOTOS_SUGERIDAS con 5 URLs reales verificadas HEAD 200, FUENTES: casamuseotequendama.org + maps); 5 fotos resueltas en Wikimedia Commons (compliance BUG-022); 3 scripts (`seed-` upsert ON CONFLICT slug con `--dry`, `load-` API DELETE+POST token default, `smoke_test_` con fake_neon + buildHTML); Escudo GOLD local (`node --check` x3, ASCII 0 bytes >127, smoke **15/15 PASS**, divs diff=0). CARGA A PRODUCCION verificada: loader OK, destino **id `8c2b48fc-c6c5-4ec4-ad42-909a73911ce0`** `status=published`; https://exploraco.vercel.app/salto-del-tequendama.html renderiza completa (hero, galeria, entradas, tours, itinerario, FAQ, mapa, JSON-LD TouristAttraction). Typo del archivo fuente corregido ("Caoda"->"Caida") en seed+ficha+clean.json. SIN ADR nuevo ni bug de ExploraCO: DECISIONS.md y BUGS_HISTORICOS.md NO se tocaron. Deuda etiquetada `[DEUDA-EXPRESS]` (horario a revalidar, contacto sin verificar, itinerario de 2 paradas, archivos fuente en la raiz). Detalle en "Que se estaba haciendo" y en `TASKS.md` TSK-142.
- Cierre documental **2026-09-20** (gobernanza de orquestacion): TERCER grupo de agentes primarios **`hybrid-plan`/`hybrid-build`** (esquema tripartito de orquestacion con ruteo por riesgo) + **ADR-048 APROBADO** + AGENTS.md seccion 1.2 + `orquestacion agentes.md` v1.1. `opencode.json` INTACTO (`default_agent: free-plan`). Tarea **TSK-HYBRID-001 COMPLETADA**. Verificado ADR-006: archivos reales de ambos agentes; 17/17 agentes citados por la matriz existen (GAP `exp-pickle-free` de TSK-141 resuelto). Sin cambios en `api/*` (8/8 INTACTO), sin migraciones. Detalle en "Que se estaba haciendo".
- Cierre documental express **2026-09-20** (TSK-141, modo express) - NUEVA gema Gemini **"ExploraCO Research"**: `.opencode/skills/gemini-research/prompts/GEMINI_GEMA_INVESTIGACION.md` (154 lineas, 12 bytes >127 = tildes/glifos propios de un prompt; NO es codigo runtime, ADR-002 aplica a `api/*.js`; **untracked**). El usuario da nombre+lugar (destinos, uno a uno) o un lote de N (eventos) y la gema ejecuta TODA la investigacion web por si misma, usando como adjuntos de referencia los 3 recursos canonicos (`GEMINI_MASTER_PROMPT.md`, `GEMINI_EVENTOS_PROMPT.md`, `ficha_template.md`) sin duplicar contenido; entrega ficha .md + bloque JSON final (esquema seccion 6 master) o array JSON de eventos, con clogs Escudo GOLD (INFO/DEBUG/LINK/TRACE/TIME) y cierre `==FIN==`; NO edita codigo (los mandatos los ejecuta el pipeline ExploraCO). Validacion downstream: `node .opencode/skills/gemini-research/scripts/validate_ficha.js` (fichas; ruta canonica, BUG-034 vigente) y `node scripts/validate_eventos.js` (eventos). GAP de infraestructura: `exp-pickle-free` en la matriz del AGENTS.md 1.1 sin archivo de agente. Detalle en `TASKS.md` TSK-141 y en "Que se estaba haciendo".
- Sesion "Galeria/hero por votos + Mis mapas personales + guardados de media + propiedad de medios del mapa" (2026-09-19) - 5 tareas TSK-136..TSK-140 + 2 ADR nuevos (**ADR-046** contrato del hero, **ADR-047** regla de propiedad de medios) + 7 BUG (BUG-071..BUG-077). **Todo COMMITEADO** en `main` (commits `6c84f9d` "videos", `600e656`/`8fe7b47`/`e7445c3` "mapa", `afb3b5d` "Update index.html", `41a3f71` "destinos", `3ffd7a9` "fotos hero"; HEAD `3ffd7a9`; `main` a la par de `origin/main`). Doc de analisis `exploraco desarrollo/ampliacion desarrollo/ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md` (NUEVO, 285 lineas, 0 bytes >127) y `AI-DOS Master Specification v1.1.docx` siguen **untracked**. Presupuesto **8/8 INTACTO**; sin migraciones. Smokes: `smoke_mapa_cultural.js` 73 checks 0 FAIL, `smoke_auditoria_pagina_destino.js` 61 checks PASS, `smoke_036_media_unificada.js` 90/90 PASS.
- Feature "Migracion de `index.html` al motor compartido del Mapa Cultural" / ADR-045 -- TSK-134 (2026-09-19, **working tree, SIN commitear**) - ELIMINA el motor Leaflet inline del `index.html` (~1190 lineas, bloque 2256-3445) y su estado muerto (12 vars + `mapaGeoRequested`); lo reemplaza por shims (`initMapaSection` con retry si `!mcMapa.getMap()`, `refreshMapaMarkers` sin recursion, `geolocateMapa`, `resetMapaColombia`, `openMapaDrawer`/`closeMapaDrawer`, `INDEX_MC_OPTS`, `var mcMapa`) + bloque lazy (IntersectionObserver/scroll/timeout 2 s); agrega `<script src="mapa-cultural.js">` (L882) ANTES del inline y del connector. CONSERVA `esc`/`photoPlaceholderHTML`/`starHtml`/`toggleMapaSave`/`renderMyMap`/Mi Mapa legacy/`MAPA_PLACES`/`MAPA_MEDIA`/`mapaMap` y el **CSS inline a proposito** (paridad visual; 0 refs a `mapa-cultural.css`). `mapa-cultural.js` SUBE a **v1.1.0** (68417 bytes) con opciones de compatibilidad: `enableMediaOnAll`/`mediaEnabled`/`mediaFilter` (`false` = capa SIN filtro)/`mediaPhotoIcon`/`clusterLinksNavigate`/`mediaControls`/`bindList`/`data-comments-*` (default = comportamiento comunidad). `git diff --numstat`: `index.html` +79/-1152, `mapa-cultural.js` +80/-20, `scripts/smoke_mapa_cultural.js` +13/-1; `api/*` e `index-api-connector.js` **INTACTOS**. Presupuesto **8/8 INTACTO**; sin migraciones. Smoke **58/58 PASS** (`SMOKE MAPA CULTURAL: OK`); Escudo GOLD y QA **APTO CON OBSERVACIONES** (divs 370/370, contrato del connector OK, sin bloqueantes). Pendiente **TSK-135** (QA visual en navegador). Detalle en `TASKS.md` TSK-134. Se apoya en TSK-133. **[Actualizacion cierre 2026-09-19]:** TSK-134 SI quedo COMMITEADA en `61392c0` "mapa" (verificado ADR-006).
- Feature "Mis mapas personales (comunidad) con paridad al mapa cultural del index" / ADR-045 -- TSK-133 (2026-09-19, **commiteada en `b4ffd4e` "maps"**, 11 archivos) - NUEVOS assets frontend `mapa-cultural.js` (motor `window.MapaCultural`, ASCII-safe, 65282 bytes al cierre, L1597) y `mapa-cultural.css` (121 reglas scopadas bajo `.mc-root`, 0 `!important`) + `scripts/smoke_mapa_cultural.js` (56/56 PASS al cierre; hoy 58/58 tras TSK-134); MODIFICADOS `mymapa.js` (+154/-46; consume `MapaCultural.create` L125, elimina Leaflet propio y `bindPopup`) y `comunidad.html` (+17/-0; `<link>` L14 y `<script>` L559 antes de `mymapa.js` L561). `index.html` intacto AL CIERRE de TSK-133; `api/*` intacto. Presupuesto **8/8 INTACTO**; sin migraciones. QA **APTO CON OBSERVACIONES**. Mitiga (no cierra) **BUG-061** con `jsonAuthHeaders()`. Se completa con la migracion del index en **TSK-134**. Detalle en `TASKS.md` TSK-133 y en la sesion de "Que se estaba haciendo".
- Sesion express TSK-124..TSK-132 (2026-09-18/19) "UI de perfil/galeria/comunidad + media + adopcion del modo express" - 9 tareas en "modo express" (skill `express-mode`): quitar "Fotos publicadas" del Museo (TSK-124), popup de "Media reciente" reusando `#av-album-modal` (TSK-125), galeria en 2 bloques sin tope de 12 (TSK-126), fusion Clase/Tabla de Destino/Vocaciones -> "Arbol de Progreso" (TSK-127), "Mi Viaje" -> NUEVO `mymapa.js` en Comunidad y retiro del `index.html` (TSK-128), visibilidad/dedup de media + diagnosticos/cleanup (TSK-129), LIMIT por rama en `multimedia_mapa` (TSK-130), votos de viajero a `media_votos` (TSK-131) y skill `express-mode` (TSK-132). **Verificado contra archivo real (ADR-006):** la mayor parte ya esta COMMITEADA en `main` (`26d2e3c`, `66db2e6`, `604fa0d`, `d309e17`, `b41e3ba`, `68e50a4`, `dfde7e7`); `main` esta **ahead 1** de `origin/main` (`dfde7e7` sin push). Solo TSK-130/TSK-131 y los assets/docs del modo express siguen sin commitear. Presupuesto **8/8 INTACTO**. Bugs nuevos: **BUG-068** (dedup 23505 de recursos ocultos), **BUG-069** (starvation del mapa), **BUG-070** (votos de viajero legacy); **BUG-066** re-confirmado como precedente. Detalle en `TASKS.md` TSK-124..TSK-132 y en la sesion de "Que se estaba haciendo".
- TSK-123 / ADR-044 "Correccion Comunidad > pestana Audiovisual -- tarjetas interactivas en Media reciente, exclusion opt-in del album Mi Museo y abstraccion compartida `media-actions.js`" (2026-09-18, IMPLEMENTADO EN WORKING TREE, SIN commitear) - `git diff --numstat`: `api/interacciones.js` +63/-4, `comunidad.html` +78/-7, `galeria.html` +17/-76; NUEVO sin versionar `media-actions.js` (259 lineas, 0 bytes >127). **Backend aditivo (header SIN bump: sigue v23):** `mi_feed_fotos` (~L4853-4912) acepta `usuario_id` opcional (ignorado si no es UUID valido) y devuelve `autor_id` (`af.autor_original_id`)/`es_propia`/`ya_votado`/`ya_guardado` (este ultimo en query separada con `conDegradacionMedia(...,'media_guardados',[])` para no tumbar el feed sin la 019); `albumes` (~L4252-4293) con opt-in `excluir_museo=1|true` (`AND LOWER(a.titulo) <> 'mi museo'`, sin el param contrato intacto); `album_detalle` (~L4296-4364) devuelve `ya_guardado`/`es_propia` por foto. **Frontend:** NUEVO `media-actions.js` (`window.MediaActions.{voto,guardar,sync,bind}` con `data-ma-*`); `galeria.html` refactorizado (elimina `gPostJson`/`gPintaVoto`/`gMediaVoto`/`gMediaGuardar`; script L242, bind/sync L563-565); `comunidad.html` con like/comentar/guardar en `feedCardAV` (L2145) y en el modal de album (L1962), `excluir_museo=1` (L2037), `usuario_id` (L1936/L2128 via `avUidActual` L565). **Fix del bug de duplicacion:** `cargarAudiovisual(reset)` -> `cargarAlbumesAV(!reset)` (L2024) -> **BUG-067 CERRADO**. **Escudo GOLD:** `node --check` OK (`api/interacciones.js`, `media-actions.js`); ASCII 0 bytes >127 en `media-actions.js`; divs `comunidad` 307/307 y `galeria` 84/84; smoke Node vm de `media-actions` 41/41 PASS (ad-hoc, NO versionado: deuda D-14); QA APTO sin bloqueantes. Presupuesto **8/8 INTACTO**. **PENDIENTE OPERATIVO: confirmar/aplicar en Neon las migraciones 019 (`media_guardados`) y 023; sin ellas el guardado real degrada a `ya_guardado=false`.** Decision en ADR-044; tarea en TASKS.md TSK-123; deuda D-10..D-14 en BUGS_HISTORICOS.md; BUG-061 amplificado (los nuevos botones Guardar confian en `body.usuario_id` sin Bearer).
- TSK-119..TSK-122 / ADR-042 + ADR-043 "Paquete 18-sep-2026: migracion 027 zonas/marcas/patrocinios, ramas marca_* en usuarios.js, fix galeria R10, FE perfil/mapa y remediacion de fotos de brsk84" (2026-09-18, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 4 archivos NUEVOS sin versionar (`db/migrations/027_zonas_marcas.sql` 348 lineas, idempotente/ASCII-safe; `scripts/verify_027_precheck.js` 258; `scripts/diagnose_fotos_brsk84.js` 310, read-only; `db/cleanups/002_fix_fotos_brsk84.sql` 151, soft-delete idempotente) + 4 modificados (`api/usuarios.js`: +3 ramas `marca_activar` L1192-1232 / `marca_patrocinar` L1234-1266 / GET `mi_marca` L296-306, **header SIN bump: sigue v18**; `api/pagina-destino.js` L2644 `LIMIT 24 -> 200` fix R10; `mi-perfil.html` FE-01 "Fotos publicadas" solo admin + FE-02 fusion "Clase & Arbol de Progreso" con `#arbol-body` L957; `index.html` FE-03 `.mpa-media-pin-video` L544/L2996). Escudo GOLD: `node --check` 4 `.js` OK; ASCII 0 bytes >127 en `.js`/`.sql`; divs `mi-perfil` 446/446 e `index` 523/523; `c.tipo === 'marca_` = 2; `mpa-media-pin-video` = 2; `destinos_fotos ... LIMIT 200` = 1; ids unicos. Presupuesto **8/8 INTACTO**. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar la migracion 027 (crea `marcas`/`patrocinios`) y el cleanup 002 en Neon; correr `node scripts/diagnose_fotos_brsk84.js` con `DATABASE_URL`.** Abre **BUG-065** (INSERT de `album_agregar_foto` sin `visible`) y **BUG-066** (regresion FE-02, CERRADA con `#arbol-body`). Decisiones en ADR-042 y ADR-043; tareas en TASKS.md TSK-119..TSK-122.
- TSK-118 / ADR-041 "Comunicacion oficial + Casas (tributo configurable/lider/misiones) + eras y titulos + admin mapa" (2026-09-18, IMPLEMENTADO EN WORKING TREE + HOTFIXES POST-QA, SIN commitear) - 6 archivos de codigo modificados (+549/-41 acumulado incl. hotfixes; `git diff --numstat` verificado) + 1 migracion nueva sin versionar: `usuario-session.js` (+245/-0; `TITULOS_POR_NIVEL` de 20 titulos L82, `ERAS` Mundana/Patrocinada/Organizador/Leyenda + `getEra` L106-113, modales `mostrarModalNivelUp`/`mostrarModalCambioEra` L116+ disparados desde `aplicarResultadoXp` al subir de nivel); `api/interacciones.js` (+173/-21 acumulado incl. hotfixes; header v22 -> **v23**: `acreditarClaseYCofre` L338-345 lee `casas_cofre.tributo_pct` (default 10, clamp 0..15), helper `avanzarMisionesCasa` L360 + `CASA_MISIONES_META`, `GET ?tipo=chat_salas` expone `es_oficial` L3518, `GET ?tipo=casa_misiones` L5270, `POST ?tipo=anuncio_oficial` L5769 (solo Bearer `ADMIN_SECRET`), `POST ?tipo=casa_tributo_config` L5824 (admin o `lider_user_id`; hotfix J-2: authz por `validarSesion` L5835), bloqueo 403 de no-admin en `chat_msg` sobre sala `es_oficial`, hooks de misiones en foto/resena/visita/xp); `api/usuarios.js` (+66/-11 acumulado incl. hotfix J-3; header v16 -> v17 -> **v18**: `casa_ranking` expone `lider_user_id`/`tributo_pct` con degradacion escalonada 42P01/42703 y refresco best-effort del lider por Casa antes de leer, ya con throttle de 60 s por instancia desde v18); `comunidad.html` (+32/-4; sala oficial al tope via `sort`, borde/fondo dorado + badge "OFICIAL", input y boton ocultos para no-admin con hint, limpieza del input en `onOk`); `admin.html` (+30/-4; `#map-picker-el` 380 -> 500 px, `adm_actualizarCirculoRango()` con `L.circle` sobre `MapPicker.getPickerMap()` y hooks en `oninput`/`openMapPicker`/`confirmMapPicker`); `map-picker.js` (+3/-1; expone `getPickerMap()`/`getMiniMap()` L267-268). NUEVO sin versionar: `db/migrations/026_casas_comunicaciones.sql` (329 lineas, idempotente ADR-008, ASCII-safe ADR-002: 0 bytes >127 y 0 backticks; `chat_salas.es_oficial` + canal "Anuncios ExploraCO" + `uq_chat_salas_oficial`; `casas_cofre.tributo_pct` + CHECK 0..15 + `lider_user_id`; tablas `casa_roles` y `casa_misiones`; backfill de lider y 1 mision base por Casa). Presupuesto **8/8 INTACTO** (ADR-001/ADR-010). Decisiones (a)-(h) en `DECISIONS.md` ADR-041; tarea en `TASKS.md` TSK-118; relevo en `docs/HANDOFF_041.md`. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar 026 en Neon (024/025 YA aplicadas por indicacion del usuario, 2026-09-18) -> deploy backend (v23/v18) -> frontend.** Deuda: misiones base no diferenciadas por Casa; `casa_roles` solo puebla `lider`; linea-titulo L1 de `interacciones.js` aun v22 (changelog ya en v23); circulo de rango sin validar en produccion.
- HOTFIX post-QA TSK-118 / ADR-041 (2026-09-18, working tree, SIN commitear): `api/interacciones.js` paso a **v23** por los hallazgos J-1 (degradacion 42703 en `GET ?tipo=chat_salas` y `POST chat_msg` si la 026 no esta aplicada; se elimino el catch silencioso de `chat_msg`, AGENTS.md 2.2) y J-2 (seguridad: `POST ?tipo=casa_tributo_config` ahora exige `validarSesion(req, usuarioId2).ok` para autorizar al lider, cerrando el IDOR registrado como `BUGS_HISTORICOS.md` **BUG-064 CERRADO**); `api/usuarios.js` paso a **v18** por J-3 (throttle de 60 s por instancia al refresco del lider en `GET ?tipo=casa_ranking`, limitando las 3 escrituras sin tocar las lecturas). Escudo GOLD post-hotfix: `node --check` OK en 4 archivos (`api/interacciones.js`, `api/usuarios.js`, `usuario-session.js`, `map-picker.js`), ASCII-safe 0 bytes >127 en `api/`, balance de divs 0 y presupuesto 8/8 INTACTO. **BUG-061 sigue ABIERTO y los hooks `avanzarMisionesCasa` lo amplifican.** Orden de release vigente: 024 -> 025 -> 026 -> backend v23/v18 -> frontend.
- TSK-114..TSK-117 / ADR-039 + ADR-040 + ENMIENDA 1 de ADR-039 "Museo multimedia URL-only + acordeon de niveles + localizacion y map-picker" (2026-09-18, IMPLEMENTADO EN WORKING TREE, SIN commitear) - `api/interacciones.js` **v22** (header real L1-17; release compartido): ramas `POST/GET ?tipo=museo_recurso` (crear/editar/eliminar/listar sobre `album_fotos` con visibilidad server-side), filtros `af.visible=true` en todos los lectores publicos (incluidos conteos y subqueries de votos), misiones `mis_videografo`/`mis_sonidista` (`xp:15`, `gate_nivel:2`; catalogo 39 -> **41**) y campos aditivos `gate_nivel`/`desbloquea`/`nivel` en `?tipo=misiones` (ADR-040, via `MISION_GATE_XP` + `nivelDeMisionServidor`). NUEVOS sin versionar: `db/migrations/025_album_fotos_visible.sql` (171 lineas; `album_fotos.visible` default false + backfill + indice unico parcial `idx_albumes_usuario_mi_museo`), `niveles-data.js` (9363 bytes, fuente unica cliente), `map-picker.js` (11188 bytes, modulo compartido; `admin.html` refactorizado), `scripts/smoke_niveles_data.js` (31/31) y `scripts/verify_025_precheck.js`. `mi-perfil.html`: tab Museo CRUD por URL + localizacion con pin (T5/T7). Gate de creacion de los 3 tipos = `mis_fotografo` (evita deadlock circular) y **+15 XP para foto, video y audio** (ENMIENDA 1 de ADR-039; el texto viejo del ADR decia 0 XP y sin gate). Escudo GOLD APROBADO tras correcciones: `node --check` OK; ASCII OK; divs 0; `smoke_niveles_data` 31/31; `gamificacion_v4` 95/95; `smoke_021` 45/45; `smoke_038` 76/76; `smoke_test_perfil_progreso`/`comunidad`/`milestones_v2`/`check_buildHTML_inline` OK. Presupuesto **8/8 INTACTO**. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar 024 y 025 en Neon y LUEGO desplegar el backend v22 + frontend (orden 024 -> 025 -> v22).** Deuda: `smoke_036_compartir.js` (espera header v19) y `test_logros_catalogo.js` (espera 30 logros, real 33) siguen en rojo preexistente; 12 `catch` vacios preexistentes en `mi-perfil.html`.
- TSK-113 / Sprint Multimedia-Pefil-Galeria-Mapa (2026-09-18, COMPLETADA en working tree, SIN commitear) - 4 archivos modificados (+249/-56; `git diff --numstat` verificado): `api/pagina-destino.js` (+6/-6; header **v12.20260917** con changelog L1-2: fix REFORZADO de BUG-057 en listener capture -- `cerrarPopoverGuardar` ignora `ev.target.id==='btn-guardar'` L2513, checkboxes Tu Mapa L2533 / mapas tematicos L2545 / boton "Nuevo mapa" L2556 con `event.stopPropagation()`; BUG-057 pasa a **CERRADO**, ver BUGS_HISTORICOS.md); `mi-perfil.html` (+82/-27; Grupo 1: `mediaCardHTML` L1832 unifica `foto_url||texto||media_url` en grid 140px con votos y empty state "Aun no tienes fotos..." L1876, guardados por fuente `album`/`album_foto`/`viajero_foto` con placeholder + enlace al destino, geo en `agregarFotoAlbum` con `#album-nueva-foto-lat/lng` L658-660 + `usarMiUbicacionAlbum` L1992 y validacion de rango Colombia, logros con `renderTrofeoCard` L1140 desbloqueados primero y boton colapsable "+N bloqueados" L1155-1192; divs 394/394, script 3/3; comentario `Rev 2026-09-18b` insertado por O1 del Escudo GOLD #92); `galeria.html` (+58/-10; paginacion 12/pagina con `G.galPagina/galPorPagina/galItems` L248, `gGalRenderPage` L882 y `gGalLoadMore` L897, consolidacion curadas->viajeros->albumes, boton `#g-more` REUTILIZADO; divs 84/84); `index.html` (+103/-13; Grupo 3+4: `#md-mapa-destino-titulo` L1245 + `mdSetDestinoTitulo` L3301-3302 en pin L3310 y album L3454, `votarMediaMapa` L3566 con `mostrarLogin` L3569 y 401 L3584, `renderLogrosGrid` L4630 solo `estado==='completada'` L4648 con `tierOrder` L4645; divs 523/523). **Desviacion de alcance O2:** `index-api-connector.js` NO se modifico (el endpoint `multimedia_mapa` filtra solo por `destino_id` y `cargarAlbumOficialDestino` ya envia `destino_id`; el titulo del drawer se resolvio en `index.html`). Escudo GOLD #92 APROBADO CON OBSERVACIONES: `node --check` PASS, ASCII 0/0/0, divs 0/0/0, `smoke_auditoria_pagina_destino` 54/54 PASS. Presupuesto 8/8 INTACTO; sin migraciones; prompt de la tarea `PROMPT_OPENCODE_MULTIMEDIA_PERFIL_GALERIA.md` (untracked). **PENDIENTE OPERATIVO: commit/push/deploy de los 4 archivos + cierre documental en un solo release; NO mezclar archivos ajenos (O3): `opencode.json` + 3 `.opencode/agent/*` modificados + 4 borrados (`PROMPT_OPENCODE_TSK111.md`, `PROMPT_OPENCODE_TSK112.md`, `PROMPT_MULTIMEDIA_GALERIA.md`, `opencode - copia.json`).** Deuda confirmada: BUG-002 sigue ABIERTO en `api/pagina-destino.js` L2431. Detalle en TASKS.md TSK-113 y docs/HANDOFF_037.md.
- TSK-111 / ADR-037 Geocerca con radio urbano 50 m + `album_oficial` en el mapa cultural + limpieza de modulos del admin + refactor de hero/galeria de la ficha (2026-09-17, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 7 archivos modificados (+335/-298) + 1 archivo nuevo sin versionar (`PROMPT_OPENCODE_TSK111.md`): `admin.html` (+49/-82; "Que incluye el precio" retirado del admin/render, UI "Orden de modulos" eliminada con `#hostal-modulos-list` OCULTO para preservar `tags.orden_modulos`, seccion "Operacion" eliminada con `f-capacidad` movido a General, `f-comotransporte` eliminado end-to-end, `moverFila`/`moveFaqRow`); `api/interacciones.js` (+44/-8; header v19 -> v20: `RADIO_DEFAULT_M`/`RADIO_POR_CATEGORIA` 100 -> 50 y subcategorias urbanas a 50, rural 250/parque-concierto 150/festival-deporte 200 intactos, `ACCURACY_MAX_M=150` y bloqueo 422 intactos, `album_oficial` en `multimedia_mapa`); `api/pagina-destino.js` (+121/-194; header v11: guard `edad_minima` con trim, hero botonera en 2 filas `.hctar-row` + grid 1+3 + `abrirLightboxHero`, "Fotos de viajeros" retirado, CTA "Ver todas las fotos"); `index-api-connector.js` (+32/-0; `cargarAlbumOficialDestino`/`window.cargarAlbumOficialDestino`); `index.html` (+51/-1; `mdMapaAlbumOficial`, solo rama `origen='destino'`); `scripts/smoke_016_multinivel_crowdsourcing.js` (+29/-3) y `scripts/smoke_auditoria_pagina_destino.js` (+9/-10) actualizados. Presupuesto 8/8 INTACTO (ADR-001); TSK-111 NO genera migraciones. Escudo GOLD (qa-auditor) APTO CON OBSERVACIONES: `node --check` 8/8 api, ASCII 0/0/0 en `api/interacciones.js`, balance DIVs admin hostal/comida/sitio/evento = 0, smokes `check_buildHTML_inline`, `smoke_auditoria_pagina_destino` (54), `smoke_016` (52) y `smoke_021` (45) PASS (`smoke_test_epic_prompt` 4 FAIL PREEXISTENTES ajenos, DQ-2). **PENDIENTE OPERATIVO: migraciones 019-023 YA APLICADAS en Neon (confirmado por Javier el 2026-09-17; ver sesion TSK-112); solo queda commit/push/deploy de los 7 archivos + este cierre documental en un solo release.**
- TSK-110 / ADR-036 Compartir social con XP (primer share 25 / posteriores 5, tope 10 eventos y 50 XP por 24h) + interacciones de media unificadas (votos/comentarios/guardados en `media_*`) (2026-09-17, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 8 archivos modificados (+1379/-536) + 5 archivos nuevos sin versionar: `api/interacciones.js` (+949/-425; header `v18` -> `v19`: rama POST `compartir` con `validarSesion` y ledger en `media_compartidos`, 3 misiones + 3 logros nuevos, `media_voto`/`media_comentar`/GET `media_interacciones`/`media_comentarios`, alias legacy conservados, TODOS los lectores migrados a `media_*`, `galeria_destino` `items[]` v2 con `fuente`/`votos`/`comentarios`/`ya_votado`/`ya_guardado`/`tipo_voto:'media'`); `galeria.html` (+222/-32; 5 secciones en modo destino + modales VOTAR/GUARDAR/COMPARTIR + comentarios por 3 fuentes); `album-comments.js` (+92/-33; v2.0.0, `mount(target,{fuente,itemId},opts)` retrocompatible); `index.html` (+50/-17; insignia `compartido` derivada del catalogo real de logros); `api/pagina-destino.js` (+40/-27; hero mosaico 1+3 y boton Compartir en `.subnav`); `usuario-session.js` (+24/-0; `aplicarResultadoXp`); `comunidad.html` y `mi-perfil.html` (+1/-1 cada uno: solo cache-bust `album-comments.js?v=2`). NUEVOS: `compartir.js` (295 lineas, `window.ExploraCompartir`), `db/migrations/022_media_compartidos.sql` (131), `db/migrations/023_interacciones_media_unificadas.sql` (408), `scripts/smoke_036_compartir.js` (290) y `scripts/smoke_036_media_unificada.js` (361). Presupuesto 8/8 INTACTO (ADR-001); catalogo real HOY 39 misiones / 33 logros. Verificacion: `node --check` 7/7 OK, ASCII-safe 0 >127 / 0 backticks en `api/*.js`, `compartir.js` y migraciones, smokes 55/55 y 71/71 PASS (mock). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar 022 y 023 en Neon ANTES del deploy del backend v19; los smokes NO validan Neon.**
- TSK-109 / ADR-035 XP decimal `numeric(12,2)` + pestana "Clase" consolidada + rankings de comunidad (Casas/Facciones/Parches) (2026-09-17, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 10 archivos de codigo modificados (+700/-282) + 1 migracion nueva + 1 preflight nuevos sin versionar (mas `DECISIONS.md` +249/-1 agregado por architect): `db/migrations/021_xp_decimal.sql` (NUEVA, 121 lineas, idempotente ADR-008, ASCII-safe ADR-002; 9 columnas XP -> `numeric(12,2)` con guard `information_schema`, sin indices) + `scripts/verify_021_precheck.js` (NUEVO, read-only, `MIN/MAX/COUNT`); `api/interacciones.js` (+185/-98; header v18: `red2`/half-up, `parseFloat`/`Number`, rama GET `pandilla_ranking` L4257-4284, gate de `album_crear` con `calcularNivelLocal` L5379, guarda de fama `<= 0` L1880-1881); `api/usuarios.js` (+102/-40; header v15: `casa_ranking` con `miembros_activos` y `ORDER BY xp_total DESC` L510-557, rankings sin `::int`); `comunidad.html` (+195/-43; tab Ranking con 4 sub-vistas Viajeros|Casas|Facciones|Parches L372-386, `setRankingVista` L1661, facciones fuera de "Activo Oculto"); `mi-perfil.html` (+101/-50; tab `clase` con arbol + sub-vista `senderos` + vocaciones inline + Mi Casa compacto); `usuario-session.js` (+39/-19; helper `window.ExploraCO.fmtXp`/`redondearXp` L46-60); `api/admin.js` (+29/-14); `admin.html` (+20/-9); `index.html` (+15/-5); `perfil.html` (+9/-1); `api/pagina-destino.js` (+5/-3; header v10). Presupuesto 8/8 INTACTO (ADR-001). BUG-042 pasa a CORREGIDO y se registra BUG-063 (guarda de fama de Parche); deuda de columnas no versionadas (`usuarios.activo`/`ultimo_acceso`/`interacciones.xp_ganado`) anotada con fallback 42703. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar la migracion 021 en Neon ANTES del deploy del backend; desplegar en 2 releases (backend + 021 primero, frontend despues). Checklist en `docs/DEPLOY_021.md`.**
- TSK-108 / ADR-034 Ficha de destino: hero de 4 fotos, `destinos.sintro` curada, galeria 1+12 y `galeria.html` con 4 secciones + orden de modulos por hostal (2026-09-17, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 6 archivos modificados (+663/-95) + 1 migracion nueva: `api/pagina-destino.js` (+283/-65: hero `HERO_THUMBS_MAX=3`, botonera sin "Ver galeria", `sintro` con fallback, galeria 1+12 con `GAL_THUMBS_MAX=12`/6+6 y `.gal-thumbs` 4/2/1, orden de modulos hostal por `tags.orden_modulos`); `api/interacciones.js` (+46/-0: GET `mapas_de_destino` con `validarSesion` para el viewer); `api/admin-destinos.js` (+19/-3: `sintro` en SELECT/INSERT/UPDATE + `normSintro`); `api/publicar-lugar.js` (+12/-2: `sintro` en el INSERT draft); `admin.html` (+150/-5: `#f-sintro`, `HOSTAL_MODULOS_ORDEN_DEFAULT`, reorden por flechas de modulos hostal + Actividades); `galeria.html` (+153/-20: 4 secciones + bloque de subida + `mapas_de_destino`); NUEVA `db/migrations/020_destinos_sintro.sql` (16 lineas, `ADD COLUMN IF NOT EXISTS sintro TEXT`, idempotente ADR-008, ASCII-safe ADR-002). Presupuesto 8/8 INTACTO (ADR-001). ADR-030 actualizado (hero 12->4, CTA "Ver galeria" retirado solo del hero). BUG-062 DETECTADO/PENDIENTE (fotos Unsplash no recolectadas por `getPhotos()`). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar migracion 020 en Neon + commit/push/deploy de los 6 archivos.**
- TSK-107 / ADR-031 + ADR-032 + ADR-033 Capa de media del mapa (album de destino + visibilidad publica), guardados de media + area museo del perfil, y radio de verificacion por lugar para "Estuve aqui" (2026-09-17, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 7 archivos modificados (+591/-53) + 1 migracion nueva: `api/interacciones.js` (+212/-14: fix 503 con `queryConAvatarFallback` en `multimedia_mapa`, fila `origen='destino_album'`, `scope=mio`, GET `mis_fotos`/`mis_guardados_media`, POST `guardar_media`/`quitar_guardado_media`, `factorXpPorRadio`/`resolverRadioM`); `index.html` (+89/-3: toggle "Solo mio"); `index-api-connector.js` (+57/-31: wiring `scope=mio`); `mi-perfil.html` (+109/-0: "Mis fotos" + "Mis guardados"); `perfil.html` (+60/-3: "Sala V: Fotos" publica, sin guardados); `admin.html` (+51/-1: campo `#f-radio-m`); `api/admin-destinos.js` (+16/-3: `radio_m` en POST/PUT); NUEVA `db/migrations/019_media_guardados_radio.sql` (65 lineas: `destinos.radio_m` + CHECK 25..100000 + tabla `media_guardados`). Presupuesto 8/8 INTACTO (ADR-001). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar migracion 019 en Neon + commit/push/deploy + verificacion en vivo de `hostal-r10-bogota`.** BUG-061 sigue ABIERTO.
- TSK-106 / ADR-030 (actualizado) Capa multimedia, galeria comunidad y galeria hospedajes (2026-09-16, IMPLEMENTADO Y VERIFICADO EN WORKING TREE, SIN commitear) - 5 archivos modificados (+243/-56): filtro opcional `usuario_id` en `GET ?tipo=multimedia_mapa` (RESTRICTIVO, validado por regex uuid) e indices capturados del UNION ALL (`api/interacciones.js` +28/-5); `index-api-connector.js` (+12/-2) sin `origen=album` + `usuario_id` si hay sesion; `index.html` (+30/-6) pines de destino (`#1f8a70` + borde punteado, dedupe por `origen_id`, tope 300); `api/pagina-destino.js` (+12/-5) hero de 12 miniaturas (`HERO_THUMBS_MAX=12`, `slice(1,13)`, `LIMIT` de `destinos_fotos` 12->24, `.prow` grid responsivo 6/4 col); `galeria.html` (+161/-38) grid unico "Fotos del destino" + aviso/input/boton de compartir (se eliminan `gSeedCard` y `#g-dest-usuarios`). P2 OMITIDO; P3 re-alcanzado a `galeria.html` (no `comunidad.html`); H-2 registrado como BUGS_HISTORICOS.md BUG-061 (spoofing de `tipo='foto'`, escalado a `sql-security`); H-3 (`smoke_auditoria_pagina_destino.js` ignora el slug). Presupuesto 8/8 INTACTO. **PENDIENTE: commit/push/deploy (sin mezclar los 3 archivos borrados ajenos a TSK-106).**
- TSK-105 / ADR-030 Lote "promptarreglos" - DM 500, galeria duplicada, popover Guardar, "Estuve aqui", unificacion Como llegar/Ubicacion, galeria unificada de destino, seguridad de album y degradacion 503 (2026-09-16, IMPLEMENTADO Y VERIFICADO EN WORKING TREE, SIN commitear) - 8 archivos modificados (+649/-167) + 2 scripts nuevos sin versionar:
  - `api/interacciones.js` (271 lineas cambiadas): casts `::text` en `dm_hilos` (`m.usuario_id::text<>$1`, `m2.usuario_id::text=$1`, `bloqueador_id::text=$1 OR bloqueado_id::text=$1`, L2937-2939/L2962) por el 42P08 (BUG-055); helper `queryConAvatarFallback` (L2114) que degrada `42703` (`usuarios.foto_url` ausente) a `avatar_url` en `museo_publico`/`album_detalle`/`galeria_destino` (BUG-060); `items[]` aditivo solo con `incluir`; 403 `ALBUM_AJENO`/400 `AUTOR_ORIGINAL_INVALIDO` en `album_agregar_foto` (BUG-059); `repartirXpReferidos` en `album_voto` (gap ADR-027).
  - `api/pagina-destino.js` (197 lineas cambiadas): `#galeria` unificada (curadas + viajeros + `#fp-upload`, ancla legacy `#fotos`), `secComoLlegar` (fusion de `secTransporteHostal` + `secMapa`, id="como-llegar", ancla legacy `#mapa`), UI "Guardar en album", helper `galEsc()` (cierra XSS del inline), fix de `cerrarPopoverGuardar` (BUG-057).
  - `api/admin-destinos.js` (71 lineas cambiadas) + `api/utilidades.js` (59): semantica REPLACE (dedupe por url + DELETE + reinsert) con guard anti-perdida (lista vacia -> 400 y NO borra) (BUG-056); `admin.html` (8 lineas) elimina la doble escritura de la galeria.
  - `api/usuarios.js` (27 lineas cambiadas): fallback de avatar en `perfil_publico` (BUG-060).
  - `usuario-session.js` (127 lineas cambiadas): "Estuve aqui" con `GET ?tipo=geo_nonce_solicitar` + `Authorization: Bearer` + `nonce`, reintento con nonce nuevo tras 401 y `obtenerUbicacion` con reintento de baja precision (cierra BUG-036).
  - `scripts/smoke_auditoria_pagina_destino.js` (56 lineas cambiadas): 54 checks (el modulo unificado se muestra SIEMPRE en la ficha).
  - NO hay migraciones nuevas ni archivos nuevos en `api/` (8/8 INTACTO, ADR-001); bugs registrados BUG-055..BUG-060; decision en ADR-030.
  - **PENDIENTE OPERATIVO (BLOQUEANTE): `node scripts/apply_004_foto_url.js` (aplica migracion 004) + `node scripts/dedupe_destinos_fotos.js --apply` (dedupe + `CREATE UNIQUE INDEX idx_destinos_fotos_destino_url`) en Neon + commit/push/deploy.** Requieren `DATABASE_URL` (no hay credenciales locales). Sin el segundo, BUG-056 no queda cerrado al 100%; sin el primero, BUG-060 queda solo mitigado.
  - **Nota de version (ADR-006):** los comentarios nuevos de `api/interacciones.js` se rotulan `v16` pero el header real sigue en `v14` (no se agrego el bloque de changelog `v16`).
- HOTFIX login 500 / BUG-054 (2026-09-15, working tree, SIN commitear) - `POST /api/usuarios` (upsert de login/registro) devolvia 500 para TODOS los logins con `device_hash`; error real de Postgres/Neon: `column "t.ord" must appear in the GROUP BY clause or be used in an aggregate function` (SQLSTATE 42803). Causa raiz: el merge de `device_hashes` en `api/usuarios.js` usaba `SELECT COALESCE(jsonb_agg(t.h), '[]'::jsonb) FROM (...) t ORDER BY t.ord LIMIT 5` (ORDER BY externo junto al agregado SIN GROUP BY = invalido en Postgres); introducido en el commit `7cc28fe` ("sistema de puntos", 2026-09-14), PREVIO a TSK-104, y expuesto al forzar el re-upsert (fix de sesion BUG-053). Fix: `api/usuarios.js` (+30/-14; header `v13` -> `v14`) con `jsonb_agg(h ORDER BY ord)` (ORDER BY dentro del agregado + subquery interna `u ORDER BY u.ord LIMIT 5`) y `try/catch` best-effort que loguea con `console.error` y NO re-lanza (el fingerprint nunca bloquea el login); QA: `node --check` OK, ASCII/backticks/doble-escape 0/0/0, simulacion runtime con mock `sql`/`neon` 15/15 PASS (200 con `device_hash`; 200 incluso si el UPDATE falla), sin regresion en A1/`verificar_usuario`/`total`, el patron invalido ya no aparece en `api/*.js`; registrado como BUGS_HISTORICOS.md BUG-054; **PENDIENTE OPERATIVO: commit/push/deploy (login roto en produccion) + login real post-deploy que envie `device_hash`.**
- Bugfix de sesion / regresion colateral de BUG-049 (2026-09-15, working tree, SIN commitear) - `refrescarSesion()` de `usuario-session.js` y `mi-perfil.html` REEMPLAZABA `window.ExploraCO.usuario` con la proyeccion publica de `GET /api/usuarios?id=` (SIN `jwt`/`auth_id`/`email`/`email_verificado`), dejando el banner "Verifica tu email" y bloqueando referidos/facciones/casa/DM de la cuenta `brsk84@gmail.com` pese a `email_verificado=TRUE` en Neon (causa: la proyeccion publica la introdujo el fix de PII de BUG-049 / ADR-028, `api/usuarios.js` L500-529); fix: FUSION (`Object.assign({}, actual, d.data)`) + conservar `jwt`/`jwt_expira_en` + detectar la proyeccion publica (respuesta sin `email`) y llamar `refreshJwt()`/`renovarJwt()` sin pisar la sesion (`usuario-session.js` +21/-4, `mi-perfil.html` +19/-4); QA: `node --check` OK, delta ASCII 0 en lo nuevo, divs 0, `smoke_017` 73/73 PASS, `smoke_016` 39/39 PASS, sin recursion; registrado como BUGS_HISTORICOS.md BUG-053; **PENDIENTE OPERATIVO: commit/push/deploy + re-login del usuario afectado si su localStorage ya perdio `auth_id`/`email`.** Nota de version (ADR-006): tras el hotfix de login BUG-054 el header real de `api/usuarios.js` es v14 (v13 al cierre de TSK-104).
- TSK-104 / ADR-029 Verificacion admin forzada + rama `verificar_usuario` + dashboard real (5 tarjetas) y filtro de verificados (2026-09-15, IMPLEMENTADO Y VERIFICADO EN WORKING TREE, Escudo GOLD PASS, sin commitear) - `api/usuarios.js` v13 en su cierre (header real HOY v14 tras el hotfix BUG-054) (+45/-6: A1 auto-verificacion del admin en el upsert con `email_verificado` y `ON CONFLICT ... COALESCE(usuarios.email_verificado,false) OR EXCLUDED.email_verificado`, condicion `email.toLowerCase()==='brsk84@gmail.com' || nombre.toLowerCase()==='javier'`; A2 rama POST `tipo=verificar_usuario` admin-only via `esAdminUsuario` con 401/400/404 y `UPDATE ... RETURNING`; C1 campo aditivo `total` (`COUNT(*) WHERE activo=true`) en GET `?tipo=leaderboard`), `api/utilidades.js` v2 (+24/-0: rama admin-only GET `?tipo=visitas_global` -> `{ok,total,v30,v7}` sobre `interacciones tipo='visita' AND activo=true`), `admin.html` (+42/-8: fila verde + badge `VERIF` para `p.verificado`, filtro `data-verified`/`currentVerifiedFilter`/`setVerifiedFilter`, `ds-usuarios` real desde leaderboard, `ds-visitas` real desde `visitas_global`, 5a tarjeta `ds-verificados`, CSS `.stats-grid` a `repeat(5,1fr)`, re-render del dashboard en `syncFromNeon()` si la pantalla esta activa); presupuesto 8/8 INTACTO; sin migraciones nuevas; **PENDIENTE OPERATIVO: aplicar 017/018 en Neon (016/015 ya aplicadas) + commit/push/deploy**; hallazgos residuales H4/H6/H7/H8 registrados como observaciones en BUGS_HISTORICOS.md
- TSK-103 / ADR-028 Perfil publico museo + DM + Arbol de Clases de 16 ramas + Casas + categorias de consumibles (2026-09-15, IMPLEMENTADO Y VERIFICADO EN WORKING TREE, sin commitear) - `perfil.html` (NUEVO, museo publico `?id=`), `registro.html` (NUEVO, alta con `?ref=`), `docs/DEPLOY_017.md` (NUEVO), `scripts/verify_017_precheck.js` (NUEVO, read-only); migraciones NUEVAS 017 (columnas de perfil/casa/`progreso_arbol`/`perfil_config`/`perfil_publico`/`dm_abierto`; `consumibles.categoria`; `chat_salas.clave_dm` + CHECK `chk_chat_salas_tipo`; tabla `usuario_bloqueos`) y 018 (categoriza 17 consumibles: perfil 7 / impulso 3 / social 4 / coleccion 2 / general 1); backend como ramas `tipo=` sin archivos nuevos (8/8) - `api/usuarios.js` v12 (`perfil_publico` ligero, blindaje PII owner-aware en `?id=`/`?buscar=`/`referido_codigo`, `casa_elegir`/`casa_ranking`, `perfil_actualizar`), `api/interacciones.js` v15 (`museo_publico`, DM `dm_enviar`/`dm_hilos`/`dm_mensajes`/`dm_bloquear`, `arbol_catalogo`/`arbol_usuario`/`rama_activar`, `consumibles?categoria=`, catalogo RAMAS 16x5 + `RAMA_TIERS [0,100,250,450,700]`, Origen derivado con bono x1.2 dentro de `D_R`, 8 misiones `perfil`), `api/admin.js` (`categoria` en consumibles) y `api/utilidades.js` (`/registro.html` y `/perfil.html` en `STATIC_PAGES`); frontend mi-perfil.html (Mi Red + DM + Arbol SVG + 7 pestanas + selector de Casa + tienda por chips), comunidad.html (R-4), index.html (R-5) y usuario-session.js (`?ref=` con TTL 30d + `codigo_referido` + JWT en refresco); fixes R-1..R-5 (registro.html faltante, `?ref=` no capturado, `mi-perfil?id=` ignorado, etiqueta "Control Territorial" enganosa, relabel Pandilla->Parche) y 4 fixes adicionales (fuga de PII preexistente, carrera del cobro del DM, `museo_publico` 404 en vez de 503, filtros `activo=true` en casa_ranking/exp_ocultos); DEUDA detectada (patron BUG-021): `interacciones.activo`, `usuarios.bio`/`usuarios.activo` no versionadas. **PENDIENTE OPERATIVO: aplicar 017 y 018 en Neon (016/015 ya aplicadas) + commit/push/deploy + verificacion en vivo. El smoke de cierre `scripts/smoke_017_perfil_arbol_casas.js` esta ENTREGADO y en verde (`node scripts/smoke_017_perfil_arbol_casas.js` -> 73/73 PASS, 2026-09-15).** ADR-028
- TSK-102 / Consolidacion documental v5 (2026-09-14, working tree, sin cambios de codigo) - creados/consolidados los dos documentos maestros vigentes en `exploraco desarrollo/ampliacion desarrollo/`: `ExploraCO_Gamificacion_v5_Plan_Maestro.md` (Plan Maestro tecnico + hoja de ruta del gaming v4 + Entrega 016, con estados reales y citas `archivo:linea`) y `ExploraCO_Sistema_Social_v5.md` (mapa del apartado social con 7 tabs, Parches, chat/planes, albumes/comentarios, referidos, facciones, Wayfarer, notificaciones; gaps G-01..G-23 y discrepancias D-01..D-15). Enlaces cruzados verificados entre ambos (Plan v5 -> Sistema Social v5 y viceversa). Spec de la Entrega 016 `docs/superpowers/specs/2026-09-14-gaming-v5-referidos-wayfarer-facciones-design.md` + indice `docs/superpowers/specs/README.md`. 9 hallazgos reales registrados en BUGS_HISTORICOS.md BUG-035..BUG-043 (referidos inalcanzables, visita rota en frontend, notificacion de resena a endpoint inexistente, conteo de miembros de Parche, relabel residual Pandilla, etiquetas de chat desfasadas, gate de voto de utilidad ausente, formula de `album_crear`, tabs de GUIA). PENDIENTE OPERATIVO intacto (ver TSK-101 y "Que sigue"): aplicar migracion 016 en Neon + `SESSION_JWT_SECRET`/`RESEND_API_KEY` en Vercel + deploy.
- TSK-101 / ADR-027 + ADR-025 Entrega 016 "ExploraCO Gaming v5.0" (2026-09-14, IMPLEMENTADO Y VERIFICADO EN WORKING TREE, sin commitear) - piramide de referidos de 5 niveles con `xp_ref_total` separado y CTE recursiva (0.10/0.05/0.03/0.02/0.01 FLOOR, topes 500/20, `?ref=` en registro), crowdsourcing Wayfarer "Activo Oculto" (proponer con email verificado, votar nivel 5, quorum +/-3, 30 dias derivado, +50/+5/+15 XP, checkin reusa geocerca ADR-024 + nonce), 4 facciones con CHECK (exploradores/curadores/creadores/artistas; primera gratis, cambio 500 xp_total + cooldown 15 dias), vocaciones de artista en bloque nivel 5 y 6 misiones de artista; backend `api/usuarios.js` v8->v9 (JWT HMAC `firmarSesion`, verificacion de email, device_hashes), `api/interacciones.js` v12->v13 (`repartirXpReferidos` en 14 puntos de XP, `validarSesion` con timingSafeEqual en visita/votar/checkin, geo_nonces), `api/admin.js` (`activo_oculto_moderar`), frontend mi-perfil/comunidad/admin/usuario-session; `.env.example` + `.gitignore` corregido; MIGRACION 016 NUEVA (209 lineas, idempotente); smoke `scripts/smoke_016_multinivel_crowdsourcing.js` 39/39 PASS; Escudo GOLD verde (node --check x3, ASCII 0 bytes >127, 0 backticks, divs 0, idempotencia 13/13); presupuesto 8/8 INTACTO; PENDIENTE OPERATIVO: aplicar migracion 016 en Neon + configurar `SESSION_JWT_SECRET`/`RESEND_API_KEY` en Vercel + commit/push/deploy (ver `docs/DEPLOY_016.md`); ADR-027 + ADR-025
- TSK-100 / ADR-026 Epic prompt.txt (2026-09-13, IMPLEMENTADO EN WORKING TREE, sin commitear) - perfil museo v1 en mi-perfil.html (museo-line trofeos·fotos·destinos, galeria de 3 mejoras perfil_*, vocaciones con toggle/candado/403, chip "Sin mapa"), vocaciones acumulables (catalogo en codigo musico@5/cine@8/artista_grafico@11 + `usuarios.vocaciones` jsonb), chat por plan PRIVADO (chat_salas tipo='plan' + `planes_viaje.sala_id`, GET plan_chat / POST plan_chat_msg con +2 XP tope 20/dia, defensas en chat_msg/chat_mensajes), limpieza de salas del sistema (solo Chat general + Bogota), XP admin (POST admin_xp Bearer: delta o nivel 1-20 sin degradar via Math.max), BUG-A contarComentarioSafe (degradacion a 0 sin migracion 013), BUG-B coordsFallbackAutor (multimedia_mapa hereda coords de la visita/guardado del autor); api/usuarios.js v8 con `?buscar=`; divs 195/195, 223/223, 786/786; MIGRACION 015 NUEVA (usuarios.vocaciones, planes_viaje.sala_id, DELETE salas sistema, 3 consumibles); migraciones 011-014 YA APLICADAS por Javier en Neon (2026-09-13); UNICO BLOQUEANTE: aplicar 015 en Neon + commit/push/deploy; ADR-026 + spec
- TSK-099 / ADR-024 Presencia Fisica + Espacial v4.0 (2026-09-12, IMPLEMENTADO EN WORKING TREE) - geocerca Haversine server-side en `POST tipo=visita` (sin endpoint nuevo, 8/8), dedup-first + indice unico parcial (cierra race `23505`), `quitar_visita` -> soft-delete (`activo=false`), radios adaptativos 100/150/200/250 m, bono rural +20 XP y logro `logr_pionero` (LOGROS = 30), evidencia `interacciones.dims.geo`, conteo de visitas de `api/utilidades.js` filtra `activo=true`; tests de logros 30/30 PASS; migracion 014 NUEVA (reset de visitas gamificadas con respaldo + indice unico); migraciones 011/012/013/014 YA APLICADAS por Javier en Neon (2026-09-13, ver TSK-100); pendiente aplicar 015 + deploy; ADR-024 + spec
- TSK-098 / Epic multimedia de usuarios (2026-09-12, working tree SIN commitear) - fix 500 albumes/mapa (COALESCE foto/avatar + catch 42P01/42703 -> 503 `SCHEMA_NOT_MIGRATED`), filtro multimedia multi-seleccion (tipo_media CSV + 400 estricto + `tipos_aplicados`), galeria ampliada (`galeria.html` global y `?destino=<slug>`, STATIC_PAGES + boton en ficha), modulo audiovisual en comunidad.html, comentarios tipo Facebook (ADR-023: migracion 013 NUEVA + 6 `tipo=` sin endpoint nuevo) y moderacion en admin; PENDIENTE BLOQUEANTE aplicar migracion 013 en Neon; hallazgo BUG-033 (canonicals cirilicos, NO bloqueante); ADR-023
- TSK-097 / Fixes multimedia + constraint unica de interacciones (2026-09-12, working tree SIN commitear) - migracion 012 (dedup resena/rating por indice parcial, fotos libres), catch 23505 -> 409 tipado, `DEST_PHOTOS` vacio + `photoPlaceholderHTML`, UI completa de albumes en mi-perfil, trazabilidad de autor/album, BUG-027 resuelto (icono Instagram), smoke_auditoria 42/42 al cierre (54/54 HOY tras TSK-105 / ADR-030, 2026-09-16); PENDIENTE BLOQUEANTE aplicar migracion 012 en Neon; ADR-022
- TSK-096 / Capa audiovisual estricta + paridad de drawer en el mapa cultural (2026-09-12, working tree SIN commitear) - deseleccion de "Todo" oculta los pines del directorio; `MAPA_MEDIA` solo albumes de usuarios (backend `?origen=album` + filtro frontend); pines del directorio/Mi Mapa abren el drawer (sin popup) y `mapas.html` estrena drawer propio; ADR-021
- BUG-031 / hotfix JS inline del popover (2026-09-11, working tree SIN commitear) - SyntaxError en el JS inline de buildHTML() (onchange de mapas tematicos L2288-2290 con comilla escapada mal formada) dejaba TODAS las paginas dinamicas sin funciones de cliente; fix con entidad HTML `&#39;` (1 linea) + guard permanente `scripts/check_buildHTML_inline.js` (vm.Script, 8 funciones + JSON-LD + divs); TSK-095 ya desplegada CON el bug -> produccion rota hasta commit+push+redeploy (ver "Que sigue", item 1)
- TSK-095 / Refactor UI/UX ficha de destino (2026-09-11) - verificado como columna admin (sin insignia publica), hero HQI con chip de direccion, popover de Guardar con mapas tematicos, galeria con lightbox; Escudo GOLD limpio (divs 716/716, smoke 28/28, flujo verificado 6/6)
- TSK-095 extension (2026-09-11) - verificacion exp-pickle 14/14 PASS: `address` PERSISTIDA en admin (INSERT/UPDATE + migracion 011 PENDIENTE de aplicar en Neon), gate secReservar = solo `bookingUrl||hwUrl` implementado (ADR-020), badge publico confirmado NO (ADR-019)
- ADR-018 / Gamificacion v4.0 (2026-09-10) - Consumibles con economia de XP y de-nivel, vitrina de 20 niveles, cromos probabilisticos y pandillas completas + migracion 010 + smoke 95/95
- TSK-093: Capa multimedia + drawer del mapa cultural (2026-09-10) - pines multimedia por tipo, drawer de destino con tabs Fotos/Videos/Audios + fix UNION BUG-030
- ADR-017: Albums Fotograficos (2026-09-09) - Sistema completo de albumes, gamificacion y mapa audiovisual

## Que se estaba haciendo

### WORKING TREE 2026-10-07 (pase documental único R2, 12ª tanda) - Cierre de BUG-118 (arnés de `smoke_grupos_perfil.js`)

**Qué se estaba haciendo:** cerrar el **único FAIL** que mantenía `npm run test` en rojo. **Causa raíz = defecto del ARNÉS, no del producto.** El detalle de ejecución vive **una sola vez** en `TASKS.md` **TSK-200** y en `BUGS_HISTORICOS.md` **BUG-118**; aquí solo hay estado y siguientes pasos.

**Lo que quedó entregado (working tree, SIN commit):**
- **FIX (solo arnés):** `scripts/smoke_grupos_perfil.js:806-809` añade `'misAlbumRatingTxt'` al array `nombres` (extraía `misAlbumesPintar` pero omitía su dependencia). Bajo el `vm` la llamada lanzaba `ReferenceError` e interrumpía `correr()`; en el navegador comparten scope global. **`mi-perfil.html` NO se tocó: producto INTACTO.** Familia **BUG-098** (*producto correcto, instrumentación incorrecta*).
- **Verificación (ADR-006):** `node scripts/smoke_grupos_perfil.js` **109/109 PASS, FAIL 0** (el `64/65` previo estaba **TRUNCADO**); `npm run test` **VERDE**; `node --check` **OK**; ASCII-safe **0 bytes >127**.

**Qué sigue:**
1. **Commit + push** del arnés y de los docs de este pase (working tree, sin commit).
2. **BUG-118 CERRADO:** `npm run test` deja de enmascarar fallos nuevos.

**Riesgos activos:** ninguno nuevo. **NO toca Vercel (8/8 INTACTO) ni migraciones.**

### WORKING TREE 2026-10-07 (pase documental único R2, 11ª tanda) - Follow-ups Wave 2 (ADR-090)

**Qué se estaba haciendo:** ejecutar los follow-ups posteriores al commit `29e2e5b` (cambios NUEVOS, aún en working tree, SIN commit; el commit NO se reabre): cerrar la **condición 1 de ADR-090**, dar scoping por categoría a `sugerir=1` y unificar el JS de los 4 directorios. El detalle de ejecución vive **una sola vez** en `TASKS.md` **TSK-199**; aquí solo hay estado y siguientes pasos.

**Lo que quedó entregado (working tree, SIN commit):**
- **Condición 1 de ADR-090 CUMPLIDA:** `normGeo`/`sqlNormGeo` **extraídos de `api/interacciones.js` a `busqueda.js`** (única definición canónica); `api/interacciones.js:213-214` los consume vía `require`. Verificado en Neon real: `smoke_busqueda_parity` **64/64**, `smoke_058_origen_clasificador` **97/97**, `smoke_origen_factor_parity` **111/111**.
- **`sugerir=1` de `api/destinos.js` acepta `categoria` OPCIONAL:** con `categoria` acota con `AND d.categoria_slug = $n`; sin ella mantiene cross-categoría (regresión cero).
- **JS de los 4 directorios unificado en `directorio-busqueda.js`** (asset estático NUEVO en la raíz): `directorio-{hostal,comida,sitio,evento}.html` lo cargan y este envía `categoria` a `sugerir` (`:80`) y a `recomendar` (`:144`).

**Qué sigue (deudas, NO bloquean; detalle en `TASKS.md` TSK-199):**
1. **DEUDA NUEVA — baja precisión de typos (aceptada v1 por decisión del operador):** `search_trgm` materializa la ficha completa vía `tags_norm` (Monserrate **7.908 chars / 1.612 trigramas**); para `'medelin'` `sim >= 0.34` = **111/219 = 50,7%** con falsos positivos. El GIN `idx_destinos_search_trgm` es válido pero el planner hace **Seq Scan** a **219 filas** (`idx_scan = 0`). Se **ACEPTA v1 con sesgo a recall**; calibración de `BUSQ_UMBRALES` + eventual acotación de `search_trgm` = **ADR futuro con datos**.
2. **Instrumentar logs de CONSULTA de búsqueda** (no de interacciones) para calibrar; **diferido** (decisión del operador).
3. **Observación menor:** `normGeoAlias`/`ALIAS_CIUDAD` aún duplicados en `api/interacciones.js` (`:338-346`) → follow-up DRY.
4. **Nota menor:** `scripts/express_check.js` barre ASCII solo `api/` y `scripts/`; los JS de raíz requieren invocación explícita.
5. **BUG-118 preexistente** sigue manteniendo `npm run test` en rojo; tanda separada. **[ACTUALIZACIÓN 2026-10-07: ya resuelto (BUG-118 CERRADO) -> 109/109; TSK-200.]**

**Riesgos activos:**
- **Baja precisión de búsqueda por typos** (v1 aceptada): el sesgo a recall puede devolver falsos positivos; sin logs de CONSULTA ni calibración, no hay datos para corregirlo (deuda 1/2).
- **`normGeoAlias`/`ALIAS_CIUDAD` duplicados** en `api/interacciones.js`: divergencia posible si un lado cambia sin el otro (follow-up DRY).
- **BUG-118 preexistente** mantiene `npm run test` en rojo: no es regresión de esta Wave, pero enmascara fallos nuevos mientras no se cierre. **[ACTUALIZACIÓN 2026-10-07: ya resuelto (BUG-118 CERRADO) -> 109/109; TSK-200.]**

### COMMITEADA Y PUSHEADA 2026-10-07 (`29e2e5b`; pase documental único R2, 10ª tanda) - Buscador unificado Wave 2 (ADR-090 Enmienda Wave 2)

**Qué se estaba haciendo:** activar los cuatro puntos que la Wave 1 (TSK-198) dejó diferidos sobre el motor `busqueda.js`: **D1** typos por trigramas, **D5** tabla `busqueda_sinonimos`, **D6** `parseNL` data-driven y **D10** modo `recomendar` personalizado con degradación; más una migración aditiva (054) y el cierre de la deuda de paridad de trigramas. El detalle de ejecución vive **una sola vez** en `TASKS.md` **TSK-199** y en `DECISIONS.md` **ADR-090 `### Enmienda Wave 2`**; aquí solo hay estado y siguientes pasos. La Wave 1 **no se reabre**.

**Lo que quedó entregado (COMMITEADA Y PUSHEADA, `29e2e5b`):**
- **Migración 054 APLICADA** en Neon (`db/migrations/054_busqueda_sinonimos.sql`): `schema_migrations` **max=54**, `aplicada`; tabla `busqueda_sinonimos` (**3 índices**, **15 filas seed** geográficas, idempotente) + **2 índices sociales parciales** en `interacciones` `WHERE activo=true`. **054 única: no hay 055.**
- **`busqueda.js`:** constantes v1 (`MIN_COOC_USER=3`, `MAX_COOC`, `REF_DECAY`, `REF_MAX_NIVEL`), `parseNL` data-driven, `sqlSimExpr` (typos+cap), expansión de sinónimos, `buildRecomendar`/`recomendarCascada` (1→2→3), `buildSugerir` con campo `via`.
- **`api/destinos.js`** (typos/sinónimos/`parseNL`; `sugerir=1` expone `via`=`normal|sinonimo|typo`; `recomendar=1` respeta `categoria`) y **`api/utilidades.js`** (`/buscar` SSR con la misma paridad). Shape `{ok,total,stats,data}` y `modo=mapa` **intactos**; **`api/*`: 8/8 INTACTO**.
- **Frontend:** `index.html` + los 4 `directorio-*.html` con dropdown etiquetado por `via` y bloque "Recomendado para ti" (oculto si vacío; los directorios envían `categoria`).
- **Paridad de trigramas cerrada:** `scripts/smoke_busqueda_parity.js` pasó de **51/51** a **64/64 PASS** (13 casos nuevos). **Escudo GOLD (@qa-auditor): CERTIFICA OK** (sintaxis 9/9, ASCII 3/3, balance divs 5/5, smoke 64/64, invariantes 4/4).

**Qué sigue:**
1. **(a) Commit + push** de la Wave 2 y de los docs de este pase: **HECHO** (`29e2e5b` en `origin/main`).
2. **(b) Deuda 1 (condición 1 de ADR-090):** extraer `normGeo`/`sqlNormGeo` de `api/interacciones.js` a `busqueda.js`.
3. **(c) Deuda 2:** calibración `EXPLAIN ANALYZE` de `BUSQ_UMBRALES` con volumetría real.
4. **(d) Opcional Deuda 3:** `sugerir=1` con scoping por categoría en directorios (hoy cross-categoría).
5. **(e) Opcional Deuda 4:** unificar el JS duplicado de los 4 directorios en `directorio-busqueda.js`.
6. **(f) Deuda 5:** `npm run test` sigue roto por **BUG-118** preexistente; se arregla en tanda separada. **[ACTUALIZACIÓN 2026-10-07: ya resuelto (BUG-118 CERRADO) -> 109/109; TSK-200.]**

**Riesgos activos:**
- **`BUSQ_UMBRALES` son constantes v1** sin calibrar contra volumetría real: el ranking y los umbrales de similitud pueden desviarse en producción (deuda 2).
- **`normGeo` sigue duplicado** en `api/interacciones.js` (deuda 1): la divergencia está acotada por el smoke 64/64, no eliminada.
- **`sugerir=1` es cross-categoría** en los directorios (deuda 3): puede ofrecer una sugerencia fuera de la categoría solicitada.
- **BUG-118 preexistente** mantiene `npm run test` en rojo: no es regresión de esta Wave, pero enmascara fallos nuevos mientras no se cierre. **[ACTUALIZACIÓN 2026-10-07: ya resuelto (BUG-118 CERRADO) -> 109/109; TSK-200.]**

### WORKING TREE 2026-10-07 (pase documental único R2, 9ª tanda) - Buscador unificado Wave 1 (ADR-090)

**Qué se estaba haciendo:** entregar la **Wave 1 del buscador unificado** (`DECISIONS.md` **ADR-090**, Estado **ACEPTADO** tras el veredicto `APRUEBA -- 2026-10-07 -- @architect-review`): normalizar la busqueda por columnas en `destinos` (migracion 053), un motor compartido `busqueda.js` y un contrato de query params sobre `api/destinos.js`/`api/utilidades.js`, **sin endpoints nuevos**. El detalle de ejecución vive **una sola vez** en `TASKS.md` **TSK-198** y en `DECISIONS.md` **ADR-090**; aquí solo hay estado y siguientes pasos.

**Lo que quedó entregado (en working tree, sin commit):**
- **Migracion 053 APLICADA** en Neon (`db/migrations/053_busqueda_normalizada.sql`): `schema_migrations` **max=53**, `aplicada`, **50 filas**; **7 columnas `*_norm`** + `search_trgm`; `exploraco_norm`/`exploraco_trgm` (**IMMUTABLE**); trigger `trg_destinos_busqueda_norm`; **6 indices**; **backfill 219 filas**; smoke de paridad **51/51**.
- **`busqueda.js`** (raiz, UMD-lite) como motor compartido; **`api/destinos.js`** (`q` normalizado con tildes/mayusculas, ranking D8, `cerca_de`+`radio_km`, `sugerir=1`); **`api/utilidades.js`** (`/buscar` SSR con el mismo orden, `orden=distancia|rating`, noindex en resultados); **`index.html`** (dropdown de sugerencias con debounce/teclado + GPS con fallback a ciudad manual); **4 `directorio-*.html`** (match normalizado multi-token + "cerca de ti").
- **Runner `apply_sql_file.js` corregido** (Addendum A de ADR-087). **052 reubicado** a `db/migrations/documental/` (0 filas para el 52, intacto). **`api/*`: 8/8 INTACTO**; sin endpoint nuevo.
- **`db/cleanups/006_rollback_053_busqueda_normalizada.sql`:** ENTREGA FORMAL de Wave 1 (evidencia del incidente del ledger y del rollback aplicado en T3b); **rollback versionado de la 053, IDEMPOTENTE**; queda en el repo y **NO debe borrarse** (Cero Borrado Logico, ADR-003).

**Qué sigue:**
1. **(a) Commit + push** de la Wave 1 y de los docs de este pase. Único pendiente obligatorio.
2. **(b) Wave 2 (NO hecha):** migracion **054** (diccionario de sinonimos), tolerancia a typos (trigramas), parsing de lenguaje natural y recomendaciones sociales (co-ocurrencia + guardados + referidos).
3. **(c) Follow-up ADR-090 (condicion 1):** extraer `normGeo` de `api/interacciones.js` a `busqueda.js`.
4. **(d) Bug separado BUG-118 (PENDIENTE, no de esta tanda):** `misAlbumRatingTxt is not defined` en el inline de `mi-perfil.html` (linea 180); preexistente (ultimo commit del inline 2026-10-04). **[ACTUALIZACIÓN 2026-10-07: ya resuelto (BUG-118 CERRADO) -> 109/109; TSK-200.]**

**Riesgos activos:**
- **La Wave 1 no cubre sinonimos ni typos:** el alcance "tipo Google" queda a medias hasta la 054; el ranking D8 y los umbrales son constantes v1 (no administrables).
- **`normGeo` sigue duplicado** en `api/interacciones.js` hasta ejecutar el follow-up (condicion 1 de ADR-090): la divergencia esta acotada por el smoke de paridad, no eliminada.
- **SEO de `/buscar`:** `noindex,follow` en resultados e `index,follow` en la landing es una decision de producto; cambiarla es gate de `@seo-dev`.

### WORKING TREE 2026-10-07 (pase documental único R2, 8ª tanda) - Descripción de misión visible en Mi Perfil (TSK-197)

**Qué se estaba haciendo:** que las tarjetas de misión del perfil expliquen **qué hacer**. Los logros ya mostraban descripción (`.bg-desc`); las misiones no. El detalle de ejecución vive **una sola vez** en `TASKS.md` **TSK-197**; aquí solo hay estado y siguientes pasos. **Sin ADR nuevo** y **`DECISIONS.md` sin tocar** (cambio aditivo de datos + render, no arquitectura).

**Lo que quedó (en working tree, sin commit):**
- **`api/interacciones.js` (+41/-0):** campo `desc` en las **41 misiones** del catálogo `MISIONES` (~L3355-3877), una línea por misión. **`entregarCatalogo` ya lo proyectaba: sin cambios.**
- **`mi-perfil.html` (+7/-1):** `misionCardHTML` pinta `m.desc` como **2ª línea** (`.mis-desc`, silo `#pf-misiones`, `:1977`); `nivelMisionesHTML` lo pinta en el acordeón de Niveles (`.nivel-mis-desc`, `:1777`). **Condicional:** `desc` null -> ni fila ni atributo. CSS con **Aislamiento Atómico** (ADR-004).

**Verificación (ADR-006):** `node --check` PASS; ASCII **0 bytes >127** y **0 backticks** en `api/interacciones.js`; divs **570/570** (diff 0); catálogo **ids 41 / desc 41**; `smoke_niveles_data` **31/31**; `smoke_test_perfil_progreso` OK; `smoke_grupos_perfil` **64/65** al cierre -> **ya resuelto (BUG-118 CERRADO) -> 109/109**. **`api/*`: 8/8 INTACTO**; sin migraciones; sin endpoint nuevo.

**Qué sigue:**
1. **(a) Commit + push** de `api/interacciones.js`, `mi-perfil.html` y los docs de este pase. Único pendiente obligatorio.
2. **(b) QA visual en navegador** de las tarjetas de misión y del acordeón de Niveles: confirmar que la 2ª línea se lee y que el truncado CSS a 2 líneas no corta la instrucción de forma confusa.
3. **(c) BUG-118 PENDIENTE (independiente, no se arregla aquí):** el único FAIL de `smoke_grupos_perfil` (`misAlbumRatingTxt is not defined`, zona "Mis Álbumes") es **pre-existente**, confirmado contra HEAD por round-trip `git stash`. **[ACTUALIZACIÓN 2026-10-07: ya resuelto (BUG-118 CERRADO) -> 109/109; TSK-200.]**

**Riesgos activos:**
- **La descripción es contenido curado a mano en el backend:** si una futura misión se añade sin `desc`, el render **degrada en silencio** (no pinta fila) — aceptable por diseño, pero el catálogo debe mantener el 100% cubierto.

### SESIÓN 2026-10-07 (pase documental único R2, 7ª tanda) - Reparación del filtro del mapa cultural (TSK-196)

**Qué se estaba haciendo:** reparar el filtro del mapa cultural. El detalle de ejecución (alcance, archivos y verificación medida) vive **una sola vez** en `TASKS.md` **TSK-196**; aquí solo hay estado y siguientes pasos. **Sin ADR nuevo** y **`DECISIONS.md` sin tocar** (corrección de comportamiento y contrato interno, no arquitectura nueva).

**Lo que quedó cerrado (ADR-006, contra el archivo real):**
- **`mapa-cultural.js` v1.4.1** (`VERSION = '1.4.1'`, `:112`) = **fuente única de verdad del estado de filtros**: slider a **paso 0.2** (`setRatingMin` con `Math.round(n*5)/5`), contrato público `toggleFilter(canal)`/`isFilterOn(canal)`/`setMediaSoloMio`/`getMediaSoloMio`/`persistKey`, `getState()` ampliado (`mediaSoloMio`, `ratingMinPrevio`).
- **Desacople Directorio -> Medios:** `enableMediaOnAll` queda **inerte** y su uso se eliminó de `index.html`; la dependencia es ahora `toggleFilter('media')`.
- **Persistencia por página + gate de sesión:** `mapa_filtros_home_v1` (`index.html:2403`) y `mapa_filtros_comunidad_v1` (`mymapa.js:72`), restauración **silenciosa**; `restoreFiltro` exige `usuarioActual()` para `mediaSoloMio` (cierra el filtro "encendido" tras cerrar sesión). Los otros 5 campos son solo preferencias de visualización.
- **Hosts sin estado paralelo:** `mymapa.js`/`index-api-connector.js` leen `window.MapaCultural.getState()`; globals `MEDIA_VISTA`/`MEDIA_USER_TOUCHED`/`MAPA_MEDIA_VISTA`/`MAPA_MEDIA_SOLO_MIO` retirados como fuente de decisión.
- **Doble zona en `index.html` y `comunidad.html`:** cuerpo (`.mf-drop-main`) alterna el filtro sin abrir menú / caret (`.mf-drop-caret`) abre el menú.
- **Bug D2 de álbumes** corregido (faltaba `&vista=albumes` en index; `sincronizarToggleMedia` leía undefined en comunidad); **`api/interacciones.js` NO se tocó** (ya soportaba `&vista=albumes`). **"Solo mío" retirado de `comunidad.html`** (era decorativo; el mapa ya pide `scope=mio` con sesión).

**Verificación (ADR-006):** `smoke_mapa_cultural` **248 PASS / 0 FAIL** (exit 0); Escudo GOLD verde (3 JS + bloques inline, ASCII 0 bytes no-ASCII); divs **index 367/367 / comunidad 458/458** (`express_check`); pares de botones `.mapa-filters` **17/17**; `verificar-capa-gratis` **RESULTADO: OK** (6/6). Coste **$0.0219** (13 sesiones, `cache_read` 95.35%). **`api/*`: 8/8 INTACTO**; sin migraciones; sin endpoint nuevo.

**Qué sigue:**
1. **(a) Commit + push de los 6 ficheros** (`mapa-cultural.js`, `mymapa.js`, `index-api-connector.js`, `index.html`, `comunidad.html`, `scripts/smoke_mapa_cultural.js`) y de los docs de este pase. Es el único pendiente obligatorio; el cache-bust `?v=15/?v=8/?v=4` ya está escrito y solo llega a producción con el push.
2. **(b) QA visual en navegador del mapa cultural** (index y comunidad): doble zona de filtros, apertura del menú por caret, encender/apagar con un clic, restauración silenciosa al recargar y el **gate de sesión de `mediaSoloMio`** (cerrar sesión y recargar no debe dejar la capa pública con el filtro "encendido").
3. **(c) Residuo BAJO (no bloqueante, no requiere acción):** los shims `window.setMapaMediaSoloMio` (`index-api-connector.js:502`) y `window.setMapaMediaVista` (`:529`) quedan sin `onclick`; son **código muerto inofensivo conservado a propósito**.

**Riesgos activos:**
- **El gate de sesión es la única frontera** de `mediaSoloMio`: es un estado de UI, no una autorización; la autorización real de `scope=mio` sigue en el backend. Un cambio futuro que relaje `usuarioActual()` en la restauración reviviría el filtro mal representado.
- **La persistencia es por página y por host:** `mapa_filtros_home_v1` y `mapa_filtros_comunidad_v1` no se comparten; un cambio de clave sin migrar el valor anterior descarta preferencias previas (aceptado: son preferencias de visualización).
- **El backend no forma parte de esta tanda:** la vista de álbumes se corrigió en el cliente; si `&vista=albumes` cambiara de contrato, el bug D2 volvería.

### SESION 2026-10-06 (pase documental unico R2, 6a tanda) - Cierre de ADR-089: calificacion de media de like binario a 1 a 5 estrellas

**Que se estaba haciendo:** cerrar documentalmente la migracion del **like binario a calificacion de 1 a 5 estrellas** (`ADR-089`). El codigo ya estaba implementado y con Escudo GOLD; lo que faltaba era el cierre. **Fuente unica del argumento: `DECISIONS.md` `## ADR-089`** -- aqui solo hay estado, no el porque.

**Lo que quedo entregado y verificado (ADR-006, contra el archivo real):**
- **051 APLICADA** en Neon: `puntuacion smallint NOT NULL DEFAULT 3 CHECK (1..5)`; `media_rep_autores(autor_id PK, votos_recibidos, suma_notas)` **sin columna `reputation`**; `media_estadisticas(fuente,item_id)` **`STABLE`** (nunca `IMMUTABLE`), con `SET search_path` y `promedio = NULL` con 0 votos. Ledger: `numero=51`, `resultado='aplicada'`, **`duracion_ms=1076`**, checksum **`3715407f...`**.
- **052 ESCRITA Y NO APLICADA** (`numero=52` con **0 filas** en el ledger, por decision del operador). **El backfill si se ejecuto**, por esa misma sentencia: **2 filas**, **36 votos** con autor resoluble, `suma_notas = 3 * votos_recibidos` en ambas, reputacion en lectura **0.0 exacta**.
- **Backend:** POST `media_voto` con `puntuacion` obligatoria 1-5, upsert idempotente por PK, **sin `unlike` ni 409**, **XP solo en el alta** (0 al cambiar nota), **15 ramas GET** migradas a `media_estadisticas`; `pagina-destino.js` con los **3** `COUNT(*)` -> `LEFT JOIN LATERAL`. **`api/`: 8/8 INTACTAS.**
- **Frontend:** `media-actions.js` **278 -> 568 lineas**, widget de 5 estrellas (`role=radiogroup`, teclado, preview en hover), `MediaActions.calificar()` + alias `voto()`, repintado optimista **con reversion**. Los **5** consumidores emiten los `data-ma-*` nuevos. Silo CSS en `galeria.html:139-219`, `comunidad.html:489-569`, `mi-perfil.html:817-898`.
- **Smokes:** `smoke_089` **30/30**. `smoke_036` **80 PASS / 13 SKIP / 0 FAIL**, skips **rotulados por ADR-089** (no silenciosos).
- **Y un bug cerrado que casi pasa:** `aplicarMediaVoto` acumulaba el delta de `suma_notas` **centrado en 3** cuando la columna es **suma bruta**, luego cada alta escapaba 3 (`-(3 x n_altas)`). **Invisible porque no habiaTodavia ni una alta**: el agregado lo habia escrito el backfill. Corregido a `dSuma = esAlta ? nota : (nota - notaPrevia)` (`api/interacciones.js:5479`). **6 escenarios: 0 diferencias con el fix, 6/6 fallos sin el.** La 051 **no se toca** (su checksum esta en `schema_migrations`); el comentario erroneo vive en ella y queda **historicamente incorrecto a proposito**, con la correccion en `DECISIONS.md`.

**Que sigue (esto es lo real, no un recordatorio):**
1. **(a) TSK-194 -- la auditoria de invariante es un RITUAL, no una tarea de una vez.** La invariante de `media_rep_autores` se sostiene hoy con **0 filas de diferencia**, pero **ya fallo en silencio una vez**: un criterio medido una vez demuestra el estado de hoy, no el mecanismo. **Trigger:** cualquier cambio en `api/interacciones.js:5442-5488` (rama `tipo=voto_media`) que toque `esAlta`, `notaPrevia`, `dVotos`, `dSuma` o el upsert. **Procedimiento:** `@backend-dev` lo avisa **en el brief**, `@sql-security` ejecuta el bloque **`(c)`** de la 052 en Neon (**gate: confirmacion del operador**) y **el numero se pega en `TASKS.md`**. **Cierre: 0 filas.** Si da > 0, lo primero es comparar el criterio con `resolverMediaItem`, **no** probar el `COALESCE` de `media_duenos` (produce **4 filas permanentes** de falso positivo).
2. **(b) M1 es INMEDIBLE hoy, y por eso la escalada a `NULL` no se puede ni decidir.** El criterio M1 (historico < 20%) se apoyaba en que el backfill no escribe `actualizado_en`. **Medido: 102 de 109 filas tienen `actualizado_en = creado_en`**, luego esa marca **no discrimina** backfill de voto real. **Haria falta una columna de marca (`nota_origen`)**, y **solo tiene sentido si antes se decide escalar a `NULL`** -- pagarla antes es una migracion sin destino. **Decision de producto pendiente, no de codigo.** Nota de baseline: el historico es hoy el **100%** de las filas y la mediana de votos por item es **~1**, luego **ni M1 ni M2 se cumplen**.
3. **(c) La reputacion de autor NO tiene lectura en la UI, y no es un olvido: es una decision de alcance.** La escala `(suma_notas - 3*votos)/(2*votos)` es la **formula de lectura teorica de D2**, y **no hay ninguna lectura en el backend**; `media_rep_autores` **no tiene columna `reputation`**. **El dato se acumula y no se muestra.** Decidir si se expone (y donde) es trabajo de producto + `@backend-dev`.
4. **(d) Ajustes CSS pendientes, reportados por los agentes:**
   - `.av-act-solo-texto` y `.av-act-rate` en `comunidad.html`.
   - `white-space: nowrap` para **"sin valorar"** en tarjetas estrechas (el texto parte y descuadra).
   - Popup del mapa: necesita su `max-width` **dentro de `.md-album-cell`** (contenedor que hoy lo limita).
5. **(e) El render de las 5 estrellas NO se ha visto en un navegador real.** **El Escudo GOLD es estatico**: comprueba sintaxis, ASCII y balance de divs, **no renderiza**. Sin QA visual quedan **sin verificar** la accesibilidad de teclado del `radiogroup`, el preview en hover y el repintado optimista **con reversion** si el POST falla. **Este es el pendiente con mas riesgo de los cinco**, porque un `radiogroup` mal construido es un fallo de accesibilidad, no unPixel.
6. **(f) Housekeeping:** commit + push de los docs de este pase (unico pendiente obligatorio del ciclo).

**Riesgos activos:**
- **[EL MAS SERIO] El anclaje no se resolvio, se documento.** El `DEFAULT 3` ancla el promedio y con **~1 voto/item** casi toda ficha queda en **"sin valorar"**. `promedio = NULL` con 0 votos (D5) es lo que hace ese estado **distinguible** de un 3.0 -- luego el render puede distinguirlo, y debe. **Mientras no haya trafico real, el numero de la base (109 filas / 107 activas / 2 autores / media 1,03 votos por item) no va a cambiar solo.**
- **`media_rep_autores` acumula pero no corrige en `activo = false`:** `unlike` ya no existe y el auto-voto sigue bloqueado, luego el camino es **practicamente inalcanzable** (deuda (b) de ADR-089). **No es cero riesgo: es riesgo con criterio de auditoria ya escrito.**
- **Borrar un usuario sigue sesgando los agregados de OTROS autores** (`ON DELETE CASCADE`): su voto contaba en el agregado de quien recibio la foto. Sin correccion; deuda (d), criterio: al primer borrado real de `usuarios` se ejecuta la auditoria completa.
- **El `DEFAULT 3` es un fallo silencioso si aparece un consumidor que no envie la nota:** todo votaria 3 y el sistema **pareceria funcionar**. Hoy no puede ocurrir (los **5** consumidores se cambiaron juntos), luego **no queda ningun consumidor viejo** dependiente del default. **Criterio: si se incorpora una superficie nueva que no envie `puntuacion`, el default deja de ser una red y pasa a ser el unico fallo silencioso posible.**
- **`mi_fotos` NO se toco, a proposito:** no se expone la nota de un tercero. Riesgo residual: es una decision de privacidad, luego revisitarla es decision de producto, no refactor.

### MIGRACION 048 EN DISCO Y SIN APLICAR -- NO APLICAR POR INERCIA: las DOS puertas antes de aplicar - 2026-10-05

**Estado critico, verificado contra el archivo real (ADR-006).** La migracion **`db/migrations/048_parche_upgrades_usuario_id_obligatorio.sql`** esta **EN DISCO, REDACTADA Y SIN APLICAR**. No esta en `schema_migrations`. **NO APLICAR TODAVIA.**
- **Que impone:** un `CHECK (usuario_id IS NOT NULL)` sobre `public.parche_upgrades`.
- **Por que NO es aplicable hoy:** la rama de escritura de las compras de parche es **`api/interacciones.js:13458-13502`**, accion **`parche_upgrade_invertir`**; su `INSERT` esta en **`:13488-13489`** y su lista de columnas es `parche_id, ciudad_slug, tipo_upgrade, puntos_invertidos, activo_hasta, creado_en` -- **NO incluye `usuario_id`**. `puiUid` ($1) se usa **solo** para el CTE `miembro` que resuelve los miembros de la pandilla; el inversor esta en scope en el backend, **todavia no se persiste**.
- **El dano de aplicarla por inercia:** **TODAS las compras de parche** empiezan a fallar en produccion con **23514 check_violation en cada intento**. No es un fallo de despliegue: es la caida de una funcion en vivo. **Por eso este bloque abre la seccion.**

**Las DOS PUERTAS que deben cumplirse ANTES de aplicar (las dos, no una):**
- **Puerta 1 -- el `INSERT` pasa `puiUid` ($1) como `usuario_id` Y esta DESPLEGADO.** La lista de columnas del `INSERT` debe incluir `usuario_id` con su valor parametrizado. **NO se puede comprobar desde SQL** (SQL no ve el codigo desplegado): se verifica sobre la **version desplegada** de `api/interacciones.js` -- grep de la lista de columnas del `INSERT` en produccion, o el valor `puiUid` apareciendo en esa lista de columnas. **Estado medido hoy: PUERTA ABIERTA.** Escrito en local no cumple la puerta; lo que se exige es **desplegado**.
- **Puerta 2 -- `node scripts/verificar_parche_upgrades_huerfanos.js` en exit 0** (0 filas con `usuario_id IS NULL`). **exit 1** = filas huerfanas, no aplicar. **exit 2** = no verificado: **NO cuenta como puerta cumplida** (fallo abierto, no puerta cerrada). **Estado medido hoy (2026-10-05, corrida real): PUERTA CUMPLIDA** -- `columna usuario_id existe: si`, **0 filas totales**, **0 huerfanas**, veredicto `OK`, **exit 0**.

**La 047 y la 048 no se contradicen: son dos pasos deliberados de la misma decision de arquitectura.** La **`047_parche_upgrades_usuario_inversor.sql`** ya esta **APLICADA** (`schema_migrations` = **47**) y declaro `usuario_id` **NULLABLE A PROPOSITO**, precisamente para que el orden migracion -> codigo fuera seguro y las dos partes independientes. La **048** es su **cierre en prevention**: convierte en garantia de esquema lo que la 047 dejo como vulnerabilidad latente. Misma decision (**ADR-086**, addendum **ADR-086-A**), dos pasos. **Leer asi, no como un error del 047.** El orden **NO es negociable**: aplicar la 048 antes de tiempo **invierte** la proteccion que la 047 concedio a proposito.
- **La cabecera de la 048 ya lleva el aviso de orden** (`:13-40`, "AVISO DE ORDEN -- LEER ANTES DE APLICAR. NO ES OPCIONAL.", con las 2 puertas enunciadas). Esta entrada es el aviso **en el relevo**; la cabecera es el aviso **en el artefacto**.

**Verificador de $0:** **`scripts/verificar_parche_upgrades_huerfanos.js`** (nuevo, **ya en disco**; solo lectura, sin dependencias ni red). Es el que cierra la Puerta 2 y el unico capaz de dar un "exit 0" con verdad. Referencia de la decision: `DECISIONS.md` **ADR-086** y su addendum **ADR-086-A** (`:6000-6043`).

**Que sigue, en este orden:** (1) anadir `usuario_id` al `INSERT` de `api/interacciones.js:13488` y **desplegarlo** (gate `@backend-dev`, paso MANUAL del operador); (2) re-ejecutar el verificador; (3) **solo entonces** aplicar la 048 (gate `@data-migration`). **Riesgo activo:** la 048 es un `.sql` mas en disco y su nombre la hace parecer la siguiente del lote; aplicada por inercia rompe produccion sin aviso. **No aplicar por inercia.**

### Sistema Economico Integral: cierre de diseno (ADR-086) + despliegue de lo pendiente - relevo 2026-10-05

**Que se estaba haciendo.** Cerrar en **UN SOLO pase documental** (R2) la sesion del **Sistema Economico Integral LATAWEL**: el diseno de la **Capa 2 ampliada** y el **NO-ADOPTION firme de la Capa 3** (tri-token web3), con **2 rondas de revision** de `@architect-review` y los **8** bloqueantes cerrados.
- Resultado de la sesion: **1 solo cambio de codigo** (`api/usuarios.js:1228-1276`) y **0 lineas de economia nueva**. Sin commits (no los pide el encargo).
- **Decision:** `DECISIONS.md` **ADR-086** (`:5121-6131`, una sola cabecera). El argumento vive alli **una sola vez** (ADR-084 D1); aqui solo estado, medidas y referencias. Detalle por tarea en `TASKS.md` **TSK-180** a **TSK-185**.

**Que sigue 1 - PRIMERO - desplegar `api/interacciones.js` (paso MANUAL del operador, TSK-181).** El filtro de vigencia de planes esta escrito desde TSK-179 y **solo ahora puede funcionar**: hasta ahora fallaba unicamente porque la columna no existia. La 044 ya esta aplicada y el backfill ya se ejecuto, asi que **la base ya esta lista**.
- **BLOQUEANTE DE HERRAMIENTAS [verificado esta sesion]:** el despliegue **NO se pudo ejecutar**: **no hay script de despliegue en `scripts/`**, **ni script de npm** (`package.json` sin entrada `deploy`) y **ni `vercel` CLI en el PATH**. Es **paso manual**. Gate de `@backend-dev`.
- **Verificar:** listado de planes **sin 42703**. **Si se ve vacio, es lo correcto**: el unico plan quedo con `fecha_inicio = 2026-09-12`, ya pasada, y debe salir. Decision consciente del operador.

**Que sigue 2 - escribir la migracion `045` (TSK-182). NO escrita, NO aplicada.** El esquema **completo y aprobado** esta en ADR-086; aqui solo el pendiente:
- `moneda_ledger` de 1 moneda a **3** (CDR/JAG/DLF); los **4 XP sinks** (`Costo_Base` 320/560/640/800, `alpha=0.20`, `gamma=2.0`, precio congelado por fila, **doble tope**).
- `xp_gastado_sinks` **distinto de `xp_total`**; `SALDO_TOPE = 2000`; multiplicador de la rampa de 30 dias.

**Que sigue 3 - cablear los parches de precondicion B1-B5 (TSK-183). 0 de 5 hechos.** Puntos **verificados contra los archivos reales** (ADR-006); cada uno leeria una moneda **arbitraria** al pasar `moneda_cuentas` a multi-moneda, y varios **fallan en silencio** devolviendo `0`:
- **B1** `api/interacciones.js:2382-2394` `registrarMonedaLedger`: el `INSERT` de `moneda_ledger` **no tiene columna `moneda`**. | **B2** `api/interacciones.js:12835` `ON CONFLICT (usuario_id)`: el upsert resuelve por `usuario_id`, que **ya no es clave** con 3 cuentas, y puede **pisar la fila de otra moneda**.
- **B3** `api/interacciones.js:12720` `UPDATE moneda_cuentas SET saldo = saldo - $2`: el debito **no fija moneda**, descontaria de la cuenta que **elija el planificador**. | **B4** `api/usuarios.js:723` y `:784`, subconsulta escalar `SELECT saldo ... WHERE usuario_id=$1`: con 3 filas devuelve **una arbitraria** y `COALESCE(..., 0)` la vuelve **saldo falso** en vez de error.
- **B5** `api/usuarios.js:724` `SUM(delta) FROM moneda_ledger WHERE usuario_id=$1`: **sin filtro de moneda**, mezcla las 3 y **degrada en silencio**. | Ademas: el **escritor de la rampa de 30 dias** quedo **promovido a script de mantenimiento**, no cableado.

**Que sigue 4 - VENTANA CERO [invariante del encargo, no negociable].** La `045` y los parches **B1-B5** van en el **mismo commit**, **forward-only, SIN rollback**. Mientras la 045 este aplicada y los parches no, el ledger y los saldos **no son interpretables**: la multi-moneda queda a medio cablear.
- La 045 se aplica por el camino canonico (`node scripts/apply_sql_file.js db/migrations/045_*.sql`). Confirmar el cambio de esquema en Neon sigue siendo del **operador humano** (gate `@data-migration`).

**NUMEROS LIBRES [CORREGIDO 2026-10-05 con medicion en Neon, no con suposicion]:** la afirmacion de que "la ultima aplicada es la `044`" era **FALSA** y se retiro. **Medido en `schema_migrations`:** `044` `aplicada`, `045` `aplicada`, `046` `aplicada` (**1673 ms**), **`047` `aplicada` (433 ms, `2026-10-05T22:36:50Z`)**, y **`048` NO aparece**. Siguiente migracion libre en disco: **`048`** (existe `db/migrations/048_parche_upgrades_usuario_id_obligatorio.sql`, 19.067 bytes, **pero NO aplicada**). Primer ADR libre: **`ADR-089`** (88 ADRs; el ultimo ratificado es el **`ADR-088`**). Primer TSK libre: **`TSK-191`** (creados del 180 al 190). Primer BUG libre: **`BUG-112`** (registrados del 102 al 111).

**Riesgo activo [medido, no supuesto]:** el riesgo de `casa_ranking` se evaluo **ALTO** y al medirlo resulto **latente, no activo**: `casa_ranking` **no hace JOIN a `moneda_cuentas`** y su unico JOIN (`casas_cofre`) es **1:1 por PK**. Corregido por el unico cambio de codigo de la sesion, **no-op numerico** (condor 4/2/2300.5, jaguar 2/1/1077.25, identico antes y despues). **BUG-104.**

**Inventario de lo que NO existe todavia [EXPLICITO, CORREGIDO 2026-10-05 contra Neon y contra produccion -- este bloque estaba Enteramente desfasado]:** ~~la `045`; las ramas de ranking compuesto y de sinks (0 lineas); la UI de sinks, el leaderboard compuesto y el gate de 20 pestanas; los 11 puntos de gasto del clamp del XP (declarados en el ADR, sin implementar, TSK-185). `api/interacciones.js` NO desplegado.~~ **Correccion, con la medida:** (a) la `045` **ESTA APLICADA**; (b) las ramas de ranking compuesto y de sinks **EXISTEN y estan desplegadas** -- `slot_catalogo`, `slot_rampa` y `planes` devuelven **HTTP 200** contra `https://exploraco.vercel.app`; (c) el **cuarto ranking** (`tipo=pandilla_ranking`) **existe** y reutiliza el motor compartido `lib/score.js`; (d) los **11 puntos de gasto del clamp** **estan implementados y desplegados** (cerrado como **TSK-185**); (e) `api/interacciones.js` **SI esta desplegado** (prueba: `GET /api/interacciones?tipo=planes` responde **200**, no 404). **Lo que sigue sin existir:** la `048` (`NOT NULL` sobre `parche_upgrades.usuario_id`) esta **escrita en disco pero NO aplicada**; la **046 no es confirmable por HTTP** (sus tablas estan vacias: `sink_slots` = 0 filas, `sink_acciones` = 4 filas de catalogo, y **no hay endpoint observador**) -- ver **TSK-187**; y la economia **sigue sin ejercitarse**: `sink_slots` = **0 filas**, `usuarios` con `xp_gastado_sinks > 0` = **0**, `parche_upgrades` = **0 filas**, `pandillas_miembros` = **0 filas**, sobre **10 usuarios**.

### Vigencia de planes de viaje + gate de pestanas por nivel - relevo 2026-10-05

**Que se estaba haciendo.** Cerrar **ADR-085** (tanda **TSK-179**): `fecha_inicio` derivada del texto libre `fechas` con filtro de vigencia en las **2** ramas de listado, y gate de pestanas por nivel en Comunidad y Mi perfil con fuente unica `niveles-data.js`. 4 superficies + 1 migracion + 1 backfill, todo **en working tree** (**commit PENDIENTE**); `api/interacciones.js` **sin desplegar**.
- **Decision:** `DECISIONS.md` **ADR-085** (`:4917-5117`, D1-D5). El argumento vive alli una sola vez (ADR-084 D1); aqui solo el relevo. El detalle por item esta en `TASKS.md` **TSK-179**.
- **Que sigue 1 - BLOQUEANTE - CUMPLIDO (2026-10-05):** `db/migrations/044_planes_viaje_fecha_inicio.sql` **YA ESTA APLICADA en Neon** y por el **camino canonico**, el runner versionado: `node scripts/apply_sql_file.js db/migrations/044_planes_viaje_fecha_inicio.sql` ("Sentencias detectadas: 2", OK en el ALTER y en el CREATE INDEX), no a mano en el editor SQL de Neon. Sonda de solo lectura posterior: `fecha_inicio` existe, tipo `date`, `is_nullable = YES`, e `idx_planes_viaje_activo_fecha` presente. Las **2** ramas de listado ya no fallan **42703**. Orden **no invertible** respected: 044 -> verificar -> dry-run -> `--apply` -> re-ejecutar no-op.
- **Que sigue 2 - backfill - CUMPLIDO (2026-10-05):** `db/cleanups/004_backfill_planes_viaje_fecha_inicio.js` **YA SE EJECUTO** con `--apply --ddmm-aaaa` (doble barrera de idempotencia, `dry` por defecto). Dry-run previo: 1 fila parseable. Resultado real: 1 fila escrita, `4fe63821-de33-4ea7-95c9-9ebc592b01c2` (`fechas="12-09-2026"`) queda con `fecha_inicio = 2026-09-12`, **ya pasado** (hoy es 2026-10-05): ese plan **dejara de mostrarse**, que era la **decision consciente** del operador y no un efecto colateral del parseo. 2a pasada identica = **no-op** (0 filas, `sin_fecha = 0`). Queda **1 sola fila en la tabla**, sin NULLs.
   Nota de instrumentacion: el campo `filas_escritas` del `--json` reporta **0** en la 1a pasada aunque la escritura SI ocurrio, porque el driver de Neon no devuelve `rowCount` en un UPDATE. La verdad es el delta de `con_fecha` (0 -> 1) medido por el propio script y confirmado por sonda. Instrumentacion, no producto.
- **Que sigue 2b - PENDIENTE DEL OPERADOR:** desplegar `api/interacciones.js`. El filtro de vigencia **ya esta escrito en el codigo y por fin va a funcionar**: hasta ahora fallaba solo porque la columna no existia. **NO** desplegado por el agente (gate @backend-dev).
- **Que sigue 3 - DESVIACION VIGENTE de ADR-002:** los 4 ficheros del encargo **no** cumplen ASCII-safety absoluto: hay bytes > 127 **legitimos** (emojis UTF-8 reales).
   Se decidio **NO normalizar** (fuera de alcance, riesgo alto) y la verificacion paso a medir **delta de codigo nuevo = 0**, no cero absoluto. Queda **escrita** aqui, no enterrada: la norma sigue vigente y estos 4 ficheros quedan **fuera** de ella.
- **Que sigue 4 - antipatron ADR-040 vivo (3 `indexOf` por identidad):** `comunidad.html:1136` (`renderChatPerks`, rotula nivel 0) y `comunidad.html:1761` (`renderPandillaCTA`, CTA de fundar **siempre bloqueado**: **bloquea visualmente la funcionalidad de nivel 14 que esta entrega habilita**); `mi-perfil.html:6138` (`cargarCasas`). Reportados por QA, **no corregidos**.
- **Que sigue 5 - higiene del gate:** limpiar los **fallbacks locales** de `cmNivelActual()` y `pfNivelActual()` ahora que el nucleo es fiable, y el **noveno espejo** de umbrales `NIVELES_LOCAL` / `calcularNivelLocal` de `api/interacciones.js:1795` (preexistente, declarado, **no introducido aqui**). El indice parcial de la 044 es apoyo **parcial**: el `OR fecha_inicio IS NULL` no es sargable.
- **Riesgo (a) - CERRADO:** el filtro de vigencia era **todo o nada**: mientras la 044 no estuviera aplicada, la funcionalidad estaba **empeorada** respecto al estado previo, no neutra. Con la 044 aplicada **y** el backfill ejecutado, la ventana `NULL` esta **cerrada** (0 filas sin `fecha_inicio`) y el filtro ya discrimina de verdad. Se mantiene el orden: `api/interacciones.js` **no** se despliega antes de tener 044 + backfill, y ambos ya estan.
- **Riesgo (b) - CERRADO en esta tanda, sigue vigente como regla:** si la 044 se aplica y el backfill **no**, la ventana `NULL` es mayoria (D2: `fechas` es texto libre y falla el parseo con frecuencia) y **no se ve ningun plan vencido**. Es el trade-off aceptado de D1, no un fallo: `NULL` significa "fecha por confirmar", no "vencido". Con el backfill aplicado, esta ventana ya no es el estado real de la tabla; **volveria** en cuanto un plan nuevo se guarde con `fecha_inicio` en NULL.
- **Riesgo (d) - nuevo, visible desde ya:** el unico plan de la tabla queda **oculto del listado** por `fecha_inicio = 2026-09-12`. No es fallo del filtro (la fecha es real y esta vencida), pero conviene que el operador lo sepa antes del despliegue: el listado de planes puede verse "vacio" y ser correcto.
- **Riesgo (c) - decisiones de producto ya tomadas, y conscientes:** 6 pestanas **abiertas sin gate** (Ranking, Audiovisual, Mercado, Marcas, Gobernanza, Contratos); solo 4 con umbral (Planes 6, Parches 14, Activo Oculto 15, Tabla de Destino 11).
   Ocultamiento **total** con `display:none`, **sin candado visible** y **nunca borrado del DOM** (ADR-003). La Tienda de Cupones QR queda **fuera de alcance** (0 coincidencias en el repo) y su hueco se deja **sin atributo**: un atributo sin nodo es un selector fantasma, que la skill `templates` prohibe.

### Misiones desplegables por estado + galeria de perfil en el modal + "Subir material" en Gestion del Museo - relevo 2026-10-04

**Que se estaba haciendo.** Cerrar tres cambios de UI del perfil ya commiteados y pusheados en `8315fb0`: la galeria de perfil pasa al modal de subida, Misiones pasa a desplegable por ESTADO y "Gestion del Museo" recupera su boton de subida. 3 ficheros; `api/*` sin tocar (**8/8 INTACTO**); sin endpoint nuevo ni migracion.
- **Decision:** `DECISIONS.md` **ADR-077 ENMIENDA 1** (no hay ADR nuevo). El argumento vive alli una sola vez (ADR-084 D1); aqui solo el relevo.
- **Que sigue 1 [PENDIENTE DEL OPERADOR]:** QA runtime manual del modal -- marcar una foto como **Principal**, **quitar** otra y comprobar que la lista **se refresca sin cerrar el modal**.
- **Que sigue 2 [PENDIENTE]:** mirar el plegado de Misiones en el navegador -- arranca plegado, auto-abre el primer grupo con items y **no reabre** tras cerrar y re-renderizar.
- **Que sigue 3:** nada de codigo pendiente; el commit esta pusheado y Vercel despliega al push.
- **Riesgo (a):** el flujo visual del modal **no tiene cobertura automatizada** (los smokes son estaticos: ids, acciones, agrupado y veto), luego un fallo de interaccion no lo detecta nada.
- **Riesgo (b) `[DEUDA-EXPRESS]`:** el `onerror` de la miniatura degrada a `opacity=.3` en vez de insertar un placeholder; cumple ADR-008, pero el usuario ve un hueco translucido.
- **Riesgo (c):** la desviacion de eje esta **acotada a Misiones** (las otras 4 superficies siguen por su taxonomia: `grupo` sigue visible pero deja de ser clave) y la nota de TSK-160 sobre `#btn-museo-subir` queda **anulada**: el `id` viejo no vuelve, la capacidad si.

### Gobernanza del pase documental: fuente unica, sin megalineas y brief de maquina - relevo 2026-10-04

**Que se estaba haciendo.** Aplicar **D1** y **D2** de `DECISIONS.md` **ADR-084** a `TASKS.md` y `NEXT.md` en un unico pase (R2): el argumento vive una sola vez en `DECISIONS.md` y ninguna linea de los dos tablero supera ya los 400 caracteres en lo reformateado. Nada de codigo pendiente.
- **Decision:** `DECISIONS.md` **ADR-084** (problema, opciones, justificacion y deuda). Este bloque es solo el relevo; si falta un argumento, el diagnostico por D1 es **falta un ADR**.
- **Que sigue 1 - Opcion 5 ABIERTA:** mover bloques a `_ARCHIVO` es la unica via para bajar **bytes**; sin ella **D1 baja el relato pero no los bytes**. Exige politica de sumidero, criterio de corte y gate propio. Los `_ARCHIVO` estan congelados desde 2026-09-19.
- **Que sigue 2 - techo de 400 caracteres:** **no se cumple todavia en el historico** de `TASKS.md` 323 lineas a **314** y de `NEXT.md` 207 a **201**. Re-formatear ~515 lineas de relato sin ADR que lo sostenga no es trabajo de este pase.
- **Que sigue 3 - hechos sin hogar:** al reducir TSK-177 a 6/8 lineas, su detalle por item queda **solo en git** (`34b46d2`). ADR-077 ENMIENDA 1 sostiene la decision y su evidencia, no esa prosa; conservarla legible exige un ADR nuevo (`DECISIONS.md` es del `@architect`).
- **Riesgo (a):** con D1, quien lea `TASKS.md` o `NEXT.md` **sin seguir el puntero no encuentra el argumento**. Es un coste consciente: el argumento estaba **duplicado**, no centralizado.
- **Riesgo (b):** `DECISIONS.md` **crece** con cada ADR y **no tiene sumidero**; su coste de lectura sube con el tiempo y la mitigacion es **D3**, no el volumen.
- **Riesgo (c):** 400 caracteres y 6/8 lineas son **umbrales, no verdades**: si la aplicacion devuelve que son cortos, se suben; lo que no se admite es "sin limite".


### Realineacion del hero y del posicionamiento de la HOME - relevo 2026-10-04

**Que se estaba haciendo.** Alinear el **copy del hero y el posicionamiento visible de la HOME** con el descriptor de marca ("Plataforma de turismo interactivo"), y corregir que las 4 pastillas de categoria del hero se encendieran todas en `--gold` cuando cada categoria ya tiene su propio color en el directorio. Tarea: **`TASKS.md` TSK-176**. Pase documental de cierre (R2) en un unico pase, **sin tocar codigo**. Implementado **todo en `index.html`** (16 inserciones / 11 borrados). **8/8 endpoints INTACTO** (ADR-010); sin migraciones; **sin ADR** (copy y CSS no son arquitectura). **Commit PENDIENTE.**

**Que quedo escrito (verificado contra el archivo real, ADR-006).**
- Eyebrow `.hsey` -> "Plataforma de turismo interactivo"; bandera y `span` decorativos conservados.
- Tira `.htag` eliminada: HTML + regla CSS muerta.
- Typo "Comidanomia" -> "Comida".
- `.hcat`: 4 pastillas con color de categoria (Hospedajes `#3B82F6`, Comida `#EF4444`, Lugares `#22C55E`, Eventos `#A855F7`), `:hover` por categoria y fondo translucido al encenderse; regla generica unica sustituida por **8 reglas por categoria**. `.dc-btn` ("Destacados") **se queda en gold por decision del operador**. JS de filtros sin tocar.
- Meta/OG/Twitter y footer de la home realineados; `canonical`, `og:url`, `og:image`, `og:type`, `og:site_name` y `<title>` **intactos**.
- Verificacion: copy nuevo **7/7**; `htag` **0**; `Comidanom` **0**; "oficial de Colombia" **0** en `index.html`; divs **368/368**; `<script>` **11/11**; cascada correcta (`.hcat[data-cat="x"].on` gana a `.hcat`).

**Que sigue (accionable):**
1. **Rebrand global [PENDIENTE POR DECISION DEL OPERADOR].** ~40 paginas mas y `404.html` siguen diciendo "El directorio turistico mas completo de Colombia". **Solo se alineo la home**, a proposito. Requiere una pasada por el resto del corpus (mismo perfil que el codemod `scripts/rebrand/` de ADR-073, si se decide reutilizar esa via).
2. **Eyebrow de "Destacados destacados" [PENDIENTE].** Cerca de la **linea 1153 de `index.html`** sigue diciendo "Directorio / 80 lugares". **Se dejo a proposito**: alinea cuando el operador decida que pasa con el bloque de destacados.
3. **DEUDA TECNICA -- desincronizacion silenciosa de los colores del hero.** Los 4 hex de `.hcat` son una **copia manual del mapa `CATS` de `index.html`** (~linea 1361). Si alguien reordena o cambia ese mapa, los colores del hero quedan desincronizados y **nada lo detecta: no hay ningun assert que los enlace**. Cerrarlo es trabajo de codigo (`@js-silo-dev` / `@qa-auditor`), no de este pase: candidato natural = un smoke que compare ambos, o una variable CSS unica como fuente de verdad.
4. **Commit pendiente** del lote (`index.html` + este cierre documental).

**Riesgos activos:**
- (a) El copy viejo sobrevive fuera de la home: un crawler o un usuario que caiga en cualquier otra pagina ve el posicionamiento anterior. Es un estado **intermedio y consciente**, no un descuido.
- (b) El mapa `CATS` y los hex de `.hcat` son **dos fuentes de verdad** del color de categoria. Hoy coinciden porque se copiaron a mano el mismo dia; no hay red que avise si dejan de coincidir.
- (c) `index_pre_full.html` conserva el texto viejo: es un **backup**, no un bug. No tratarlo como pendiente de copy.
- (d) Sin commit, la diferencia entre el estado real de `index.html` y cualquier relectura de estos documentos solo se resuelve mirando el archivo (ADR-006).

**Deuda [DEUDA]:** (a) rebrand global pendiente de decision; (b) eyebrow de "Destacados" (~L1153) pendiente; (c) hex de `.hcat` copiados a mano del mapa `CATS`, sin assert que los enlace; (d) sin commit.

### Tier por modelo activo + atribucion de coste - relevo 2026-10-04

**Que se estaba haciendo.** Cerrar documentalmente **ADR-083** (`@architect` lo escribio; `@js-silo-dev` aplico D1/D2/D5). El ADR **deroga una sola premisa** de ADR-082 -- *"el tier es la sesion entera, lo fija el primario invocado"* -- porque una sonda de carga real mostro que **la seleccion explicita de modelo PISA el pin del agente**. Este fue el **unico** pase de escritura en `exploraco desarrollo/*.md` + `AGENTS.md` (R2): alinear la gobernanza visible con el repo, sin decidir arquitectura.

**Que quedo escrito (verificado contra los archivos reales, ADR-006).**
- `AGENTS.md` §0: el tier lo fija el **modelo activo del turno**, cambiable en el selector; los 16 subagentes heredan; la seleccion explicita **pisa** el pin; **D4**: turno 2 (~$0.0015) vs turno 25 (~$0.0538) = **~35x**. §1: **18** agentes, columna `model:` = "sin pin (hereda el activo)". §2: R5 de **prohibicion a atribucion** (`reparto --sesion`, detector de **escalada tardia**, `--preflight`), **check (f) se mantiene**, y aviso de que **`session.model` registra el ULTIMO modelo y no debe usarse para decidir nada** (la fuente fiable es `message.data.modelID` por mensaje de asistente). §3: reglas 11/12/19 ajustadas; 14 y 17 sin cambios. §4: `cascada-tier` ya **no** es la fuente de la regla de tier.
- Skill `cascada-tier`: **reescrita completa** (11 secciones) -- premisa nueva, 2 primarios sin pin, herencia por turno, allowlists medidas, ROTOS, asimetria de momento, `--preflight`, escalada tardia, el menu `@` como **bypass** de `permission.task`, y la lista **9 con gate + 7 sin gate**.
- **Gates por ROL, no por tier:** los 9 se piden **SIEMPRE** (FREE o PAGO) y **tambien desde el menu `@`**; "pagar no compra saltar el freno" (ADR-082 §6).
- **Hueco declarado en §0:** con `default_agent: "build"` sin pin, si el selector **recuerda** `deepseek-v4.1-flash` la sesion abre en **PAGO sin aviso**. Se documenta, no se oculta.
- Notas de referencia: **una sola nota** anadida al bloque "Nota de cierre" de **ADR-082** (su lista T1-T7 es historica; el cuerpo **no** se reescribio). En `ANALISIS_AGENTES_Y_ECONOMIZACION.md` se corrigieron **solo** las dos notas `[OBSOLETO]`, que ademas afirmaban "Roster vigente: 20 agentes" y "`@free-build` para lo rutinario".

**Que sigue.**
- **Commit pendiente** del lote (ADR-083 + codigo de D1/D2/D5 + este cierre).
- **Deuda (d):** el mensaje del guard sigue imprimiendo `RESULTADO: OK. Cascada vigente (ADR-082).` -> una linea de `scripts/`, territorio de `@js-silo-dev`.
- **Deuda (a):** sesion abierta en PAGO por selector con memoria -> solo se detecta con `--preflight` o preguntando el modelo activo (10 s).
- **Deuda (b) / TSK-166:** calidad del modelo de pago sin medir en `backend-dev`, `sql-security`, `renderer-dev`; **mas urgente** ahora que cambiar de tier es una capacidad.
- **Supuesto S-1 (sin verificar):** si al cambiar de primario/modelo no se relee el cuerpo del agente, cambiar de tier no surte efecto y el operador cree que bajo. No automatizable (`opencode run` es no interactivo); mitigacion = preguntar el modelo activo antes/despues de Tab. **Criterio de rollback en ADR-083:** restaurar el pin fijo y el check de unicidad vuelve como **aviso**, conservando la atribucion.
- **Referencia colgante:** `ampliacion desarrollo/orestacion agentes.md` **no existe en el repo** (citado en el encargo). Confirmar si se borro o nunca existio.

### Saneado de UI del perfil y unificacion del mapa de Comunidad (6 cambios) - relevo 2026-10-02

Tanda de **6 cambios de UI** sobre `mi-perfil.html`, `comunidad.html` y `mercado.js`, decididos por el operador. Pase documental **unico (R2)**, modo express, **solo** docs de gobernanza: **NO se toco codigo en este pase**. Working tree, verificado contra los archivos reales (ADR-006); **commit PENDIENTE**. Decisiones: **DECISIONS.md ADR-080** y **ADR-081**. Tarea: **TASKS.md TSK-174**. No toca `api/*` (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones; sin cambios en produccion.

- **Que se estaba haciendo:** limpiar tres superficies del perfil que estorban (misiones infladas, Hoja de Vida redundante con el Museo, catalogo de tienda que no es inventario) y **convertir dos mapas de Comunidad en uno solo**; en el camino, unificar el render de los lugares del Museo y ampliar la vista de Comunidad del Mercado para que se vea todo el producto a la venta.
- **T1 - Cards de mision acortadas.** `#pf-misiones` renderiza una sola linea por mision con truncado y `title`; se elimino el volcado crudo de IDs de requisito que inflaba la tarjeta. Helper de render dentro de `cargarMisiones`; CSS en el silo `#pf-misiones`. Medido: `pf-misiones` = **13**.
- **T2 - Se RETIRA el modulo Hoja de Vida del Artista (`#pf-cv`, `cargarHojaDeVida`, `v61GuardarHojaDeVida`, `.pf-v61 .v61-cv-obra`) y los helpers `ExploraCO.miHojaDeVida` / `ExploraCO.guardarHojaDeVida`.** En su lugar, `pf-museo-preview` pasa de la pestana `museo` a la `perfil` (el contenedor lleva `data-tab="perfil"`). **El hallazgo que condiciona la decision:** `artista_cv` **no es una tabla**, es la **columna** `usuarios.artista_cv` (`040_gobernanza_cartas_moneda.sql:441`), y **sigue en uso por `api/usuarios.js` y `api/pagina-destino.js`**. Por eso la retirada es **solo de UI** y el backend queda intacto. Decision: **ADR-080**.
- **T3 - La pestana Mapa pasa de DOS mapas Leaflet a UNO SOLO.** `mymapa.js` crea la instancia unica `MapaCultural` sobre `#av-map-container` (`data-cm-mapa="1"`) y ya no contiene ningun `L.map` (**0 coincidencias**); desaparece `mm-personal-map`; `initAudiovisualMap` (que vive en `comunidad.html`, no en `mapa-cultural.js`) adopta la instancia viva via `window.MyMap.getMap()`. Mapas personales y media audiovisual conviven con los filtros y los chips de categoria operando sobre el conjunto. Decision: **ADR-081**.
- **T4 - Lugares del tab Museo con render canonico.** "Mis lugares guardados" y "Lugares visitados" dejan de emitir HTML crudo y pasan por el helper **NUEVO `lugarCardHTML`** enrutado por `pfGruposRender`; el CSS global `.lugar-*` se sustituye por el silo atomico `#pf-lugares` (ADR-004).
- **T5 - El tab Inventario deja de mostrar el catalogo de tienda.** Fuera el titulo de tienda, `#pf-tienda-chips`, `#pf-tienda`, `cargarTienda`, `renderTiendaChips`, `setTiendaFiltro`, `categoriaConsumible`, `PF_TIENDA_CATS`, `PF_TIENDA_CAT`, `PF_CAT_CONSUMIBLE` y el CSS `.store-*` / `.tienda-chip*` (todo con **0 coincidencias** tras el cambio). **Se conserva `cargarInventario` con su filtro `cantidad > 0`**, que ya era correcto.
- **T6 - Mercado de Comunidad: se ve todo el producto a la venta.** Las ofertas se agrupan por **TODAS** las Casas (`cargarOfertasTodas`, `_ofertasPorCasa`) en vez de solo la Casa seleccionada, mas catalogo completo con filtros "todos / Lo tienes / Disponible" y buscador. La **validacion de propiedad al publicar no se relaja**: se refuerza en cliente con `maxPublicable` / `invCant` (VER mas ya no habilita PUBLICAR mas) y **la garantia real sigue en el servidor**. Cache-busting a `mercado.js?v=2` en `comunidad.html` y `mi-perfil.html`.
- **Alcance:** **7** ficheros de codigo, los **7** en `M` sin commit (`git status --porcelain`).

**Que sigue:**
1. **Commit del lote** (7 ficheros de codigo + los 3 documentos de gobernanza). Es el pendiente que arrastra la tanda; ninguno de los 6 cambios esta commiteado.
2. **Ejecutar `npm test`** con los 7 ficheros: los smokes de `smoke_grupos_perfil.js` cubren el `pfGruposRender` que T4 reutiliza, y es la comprobacion que mas puede mover la aguja tras tocar `mi-perfil.html` a fondo.
3. **Decidir el residuo de `mymapa.js:34`** (`DEFAULTS.contenedor: 'mm-personal-map'`, elemento que ya no existe): reorientarlo a `#av-map-container` o borrarlo.
4. **Revisar si `pf-v61` (48 ocurrencias) tiene consumidor vivo** tras retirar `.v61-cv-obra` en T2.
5. **Smoke de unicidad del mapa** (deuda (b) de ADR-081): hoy nada comprueba que la pestana Mapa monte **una** instancia de Leaflet.

**Riesgos activos:**
- (a) **El invariante "un solo mapa" es convencional, no forzado:** `initAudiovisualMap` conserva una rama de respaldo que crea su propio `L.map` si `MyMap.getMap()` no responde. Es red de seguridad, pero significa que el fallo del modulo compartido degrada a dos mapas en silencio.
- (b) **`artista_cv` queda sin editor en cliente:** tras T2 el campo solo se actualiza por la via de `api/usuarios.js` / `pagina-destino.js`. Capacidad viva sin superficie; decision de producto futura.
- (c) **El refuerzo de T6 es de cortesia, no de garantia:** `maxPublicable`/`invCant` solo evitan que la UI ofrezca una accion invalida; si alguien manipula el DOM, la validacion real sigue siendo la del servidor.
- (d) **Sin commit, las dos retiradas "duenas" pueden leerse como borrado de capacidad:** quien lea el diff sin ADR-080/ADR-081 puede asumir que el dato y el mapa tambien se eliminaron. Por eso los dos ADR van en el mismo lote.

**Deuda [DEUDA]:** (a) residuo `mymapa.js:34`; (b) sin smoke de unicidad de la instancia Leaflet; (c) rama de respaldo de `initAudiovisualMap` sin cobertura; (d) `pf-v61` posiblemente huerfano; (e) `artista_cv` sin editor en cliente; (f) sin commit.

### Permisos totales + economia de turnos + smoke permanente de los grupos - relevo 2026-10-02

Tanda de **optimizacion de agentes y permisos** que cierra el ciclo de TSK-171 (18.028.203 tokens) atacando las dos causas que lo hicieron caro: la **friccion de permisos** (el operador autorizando, turno a turno, cosas de rutina) y el **gasto de contexto** (turnos multiplicando `cache_read`). Working tree, verificado contra los archivos reales (ADR-006); **commit PENDIENTE**; **REINICIAR OpenCode obligatorio**. Decision: **DECISIONS.md ADR-078**. Tarea: **TASKS.md TSK-172**. Bug: **BUGS_HISTORICOS.md BUG-098 / BUG-CONFIG-7**. No toca `api/*` (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones; sin cambios en produccion.

- **Que se estaba haciendo:** (a) eliminar la friccion de autorizacion **por configuracion**, no por disciplina; (b) poner el coste de las tareas en una formula **medida** en vez de estimada a ojo; (c) convertir la cobertura de QA que hasta ahora vivia en un arnes temporal borrado en un **script permanente y reproducible**.
- **Permisos (`opencode.json:7-22`):** el bloque `permission` pasa de **5 a 14 claves, todas en `allow`** (`read`, `edit`, `glob`, `grep`, `list`, `bash`, `task`, `external_directory`, `todowrite`, `question`, `webfetch`, `websearch`, `lsp`, `skill`). **Hallazgo de causa raiz: `external_directory` NO existia** y era exactamente la clave que hacia que opencode pidiera autorizacion para trabajar con archivos **fuera del repo** (donde vive el arnes de QA, `%TEMP%`); `webfetch` y `websearch` estaban ademas en `deny`, y los **19 de 20** agentes los declaraban asi (capa heredada de ADR-067). No era "el sistema es estricto": era un **hueco de configuracion** mas una capa de `deny` heredada.
- **Agentes (19 de 20 ficheros de `.opencode/agent/`):** `webfetch: deny` -> `allow`, `websearch: deny` -> `allow`, `bash: ask` -> `allow` (en `free-plan` y `plan`). `research-agent.md` **no se modifico**: ya estaba en `allow`, por eso 19 y no 20.
- **Excepcion deliberada (regla de ADR-078, punto 3):** se conservan **`edit: deny` en `@explore`, `@plan` y `@free-plan`** y **`bash: deny` en `@explore`**, con el criterio **"bloquea vs pregunta"**: `deny` no genera dialogo y en esos agentes la restriccion ES la separacion de roles de ADR-006/ADR-074. Verificado en el archivo real: `bash: allow` 19, `bash: deny` 1, `bash: ask` 0, `edit: deny` 3, `webfetch: deny` 0.
- **Friccion operativa que hay que conocer:** **opencode carga la configuracion una vez al arrancar y NO hace hot-reload.** Permisos y agentes modificados **no rigen hasta reiniciar**. Es el motivo mas probable del sintoma "lo cambie y sigue pidiendo permiso": el fichero esta bien y el proceso es viejo.
- **Economia de turnos:** `AGENTS.md:64` (regla 12) incorpora la **formula medida** -- en la tanda de 18M el `cache_read` fue el **91,7%** del gasto y la salida de herramientas solo el **0,55%**, luego el coste real es `turnos x contexto acumulado` y se estima con **~50.000 tokens por turno x nº de turnos**; **estimar por salida de herramientas infraestima 45-70x** (error real de TSK-171: se estimaron 250-400k y el real fue 18M). Reglas **17** (`:69`, **15 turnos / 500.000 tokens por `task`**; 1 subagente por modulo; **el brief da el resultado, no el metodo**) y **18** (`:70`, higiene de consumo: nada de `git diff` sin `--stat` en >150 KB, `-m 3` en los docs grandes, **verificar con scripts de $0 antes de delegar una auditoria**). Regla **19** (`:71`): permisos. Regla **10** (`:62`): `mi-perfil.html` corregido a **~379 KB** (medido 379,2 KB; decia ~230 KB).
- **`qa-auditor.md:17-31`:** seccion **"Presupuesto de turnos (OBLIGATORIO)"** con la evidencia medida (`:19`: 102 turnos x ~70k de contexto acumulado = **8,07M tokens = 45% de la tanda**) y **7 reglas duras**: techo **25 turnos**; nunca `git diff` de >150 KB (solo `--stat`, o `-U0` + `rg '^[+-]' -m 80`); greps con `-m 3`; **reusar scripts existentes antes de construir un harness**; si se construye, **una version y maximo 3 iteraciones**; un comando fallido **no se reintenta identico mas de 2 veces**; **recibir rangos de linea**, no "audita este archivo"; **Escudo GOLD primero**. **`edit: allow` se mantiene a proposito**: el agente escribe su arnes en `%TEMP%`, y con `deny` volveria a pedir autorizacion; la restriccion "NO corriges codigo" es de prompt, no de permiso.
- **NUEVO `scripts/smoke_grupos_perfil.js`** (1.141 lineas): el arnes temporal de la auditoria de TSK-171, que un agente escribio y borro, deja de ser memoria y pasa a ser **test reproducible** de los 4 modulos agrupados de `mi-perfil.html` (Museo, Guardados, Niveles, Albumes). **Asercion central: perdida de items** (un agrupamiento mal escrito se come elementos). Ademas: balance de divs, `node --check` de los scripts inline, que **cada item cae en exactamente un grupo**, que el conteo de cada etiqueta coincide con los items que contiene, toggle de plegado **sin duplicar DOM**, auto-apertura de niveles **solo en el primer render**, tope de **24** en Albumes, y robustez ante lista vacia / items sin clave / 1.000 items. **73/73 PASS, exit 0, ~2,0 s, ASCII-safe, sin dependencias, sin red. (4) GATE PERMANENTE (cierre del mismo dia):** `package.json` -> `scripts.test` **termina en `&& node scripts/smoke_grupos_perfil.js`** (21 pasos = 1 guard + **20 smokes**, el nuevo es el ultimo) y se anadio el alias `smoke:grupos`; `npm test` completo -> **20 suites, 0 FAIL, exit 0**. Con esto la cobertura de los 4 modulos agrupados deja de depender de que alguien la ejecute a mano: **ya no es deuda.** (5) **TSK-173 abierta** (inventario y plan, sin ejecucion): los **26 FAIL** de `express_check.js`, medidos y clasificados, con el diagnostico del timeout de 120 s -> detalle en TASKS.md TSK-173.**
- **Bug cerrado (instrumentacion, NO producto) -- BUG-098 / BUG-CONFIG-7:** el `getElementById` del mini-DOM (`:401-409`) miraba solo `attrs.id`, pero `mi-perfil.html` etiqueta el boton **por propiedad** (`b.id = 'mis-albumes-ver-mas'`); en un DOM real eso si se refleja en `getElementById`, el harness no, y daba **2 falsos FAIL**. Resuelto con un `Object.defineProperty` en `Nodo` (`:176-179`) que refleja `id` hacia `attrs.id`, igual que ya hacia `classList`. **Producto correcto, harness incorrecto.**
- **Incidente de proceso:** una tarea `@js-silo-dev` se **cancelo de nuevo** con el fichero ya escrito en disco (recurrencia de BUG-097 / BUG-CONFIG-6). Al verificarlo, los 2 FAIL no eran de `mi-perfil.html` sino del mini-DOM: el diagnostico correcto era "el arnes miente", no "el producto esta roto".

**Que sigue:**
1. **Commit de todo el lote + REINICIAR OpenCode** (unico pendiente bloqueante): `opencode.json`, 19 `.opencode/agent/*.md`, `AGENTS.md`, el NUEVO `scripts/smoke_grupos_perfil.js`, `mi-perfil.html` (de TSK-171) y los 4 documentos de gobernanza. Tras reiniciar, verificar con `npm run coste:gratis` (`20 | gratis: 20 | de pago: 0`) y confirmar que **ninguna** tarea vuelve a pedir autorizacion.
2. **Decidir si se abre la auditoria de fondo de `pfAplicarTab()`:** el cache `_pfDisp` sigue sin corregirse (deuda (a) de ADR-077) y **ADR-017 lo difiere explicitamente**. Hoy no bloquea nada porque la invariante de ADR-077 lo hace imposible; abrirlo es una decision de producto con re-auditoria de las 8 pestanas, no un pendiente tecnico suelto.
3. **Sanear los 26 FAIL globales de `express_check.js` -> YA ES TAREA PROPIA: TASKS.md TSK-173** (inventario real medido el 2026-10-02, **26 FAIL = 26 ficheros**, de los que **~7 son falso positivo o no accionable** del propio checker, notably `upload-eventos.js:41` y `api/utilidades.js:654/723`, que son los **generadores** del escape que ADR-002 exige). Solo **1** de los 26 es serverless y pasa por Escudo GOLD (`api/utilidades.js`); **ninguno** de los 26 toca la agrupacion de `mi-perfil.html`. Ademas, la corrida completa se midio en **120,92 s** (causa raiz: `express_check.js:122` lanza **un `node --check` por cada uno de los 365 ficheros JS**); la via rapida es el **filtrado por fichero** (**0,89 s** para 3 HTML). **NO entrar en `npm test`:** +120 s de gate y hoy en `exit 1`.
4. **Cerrar los seguimientos de FREE abiertos desde TSK-165**: **TSK-166** (medir calidad real del FREE en dominios duros) y **TSK-167** (re-verificar la allowlist FREE). Las 3 skills `agentes-roster`/`modelos-verificados`/`reglas-de-oro` **NO existen**: declararlas existentes es un error.

**Riesgos activos:**
- **`bash: allow` sin patrones:** cualquier comando se ejecuta sin confirmar, incluidos los destructivos. **Riesgo asumido por peticion explicita del operador.** La mitigacion es que la disciplina de no hacer commit/push sin orden explicita vive en **las reglas**, no en el permiso -- y una disciplina se puede incumplir en silencio. Si hay que endurecer, la via correcta es un **patron de `bash` restrictivo**, nunca volver a `ask` (eso devolveria la friccion que este ADR elimina).
- **Sin hot-reload, "lo cambie y sigue pidiendo permiso" es el sintoma esperable** si se edita la config sin reiniciar. No es un fallo del cambio: es el limite operativo asumido.
- **La disciplina de no commit/push no es verificable por maquina.** Si se quiere red mecanica, el sitio es un hook o un `pre-push`, no el permiso.
- **`express_check.js` no sirve de puerta rapida:** su **corrida completa supera el timeout de 120 s**. Usar **filtrado por fichero** (`node scripts/express_check.js mi-perfil.html`) cuando se necesita respuesta; y no confundir el timeout con un fallo del script.
- **La proteccion de ADR-067 sobre la web desaparece como defensa en profundidad:** `webfetch`/`websearch` en `deny` obligaban a que la investigacion la hiciera `@research-agent`; ahora la regla vive en el **prompt**. Si en una tanda se ve investigacion web dispersa por otros agentes, la correccion es de prompt, no de permiso.
- **La cobertura de la agrupacion ya es automatizada, pero la del fallo que motiva ADR-077 no:** ningun smoke cubre el **cambio de pestana con un grupo plegado** (sintoma que solo existe en UI real). La invariante se sostiene hoy en una convencion comprobable con grep: **ningun `.pf-grupo` con `data-tab` y ningun `.pf-grupo` hijo directo de `#profile`**.

**Deuda [DEUDA] (preexistente, NO de esta tanda):** (a) **`scripts/express_check.js`: 26 FAIL globales** en `scripts/*` y `api/utilidades.js` (`api/utilidades.js` -> backticks=24 en 158, 159, 204, 205, 226, 229, 233, 233; doble-escape=3 en 654, 723, 723); (b) **`scripts/express_check.js` con timeout de >120 s en corrida completa** -> usar filtrado por fichero; (c) `scripts/smoke_test_epic_prompt.js` con **4 FAIL** (VOCACIONES x3, `vocaciones_catalogo` x2, `chat_salas`) contra `api/interacciones.js`; (d) **CSS duplicado** `.pf-museo-preview` (`:511` y `:592`) y `.trofeo-grid` (`:127` y `:174`), intacto a proposito; (e) `.pf-album-card` y `.pf-ver-mas` siguen con peso visual en estilos inline; (f) residuo ASCII preexistente en `mi-perfil.html` (200 bytes > 127, 4 backticks, heredados de HEAD 446/4). Deuda propia de esta tanda: **el endurecimiento de `bash` sigue sin patron** y **no hay ninguna red mecanica** que impida un commit/push no ordenado.

### Gate permanente del smoke de grupos + TSK-173 inventario de los 26 FAIL - relevo 2026-10-02

**Que se estaba haciendo:** cerrar la pregunta que dejo abierta el pase anterior (si el smoke de los grupos de `mi-perfil.html` debia entrar o no en el gate) y convertir en tarea propia la deuda de `express_check.js`. Pase documental **unico (R2)**, modo express, **solo** docs de gobernanza: **NO se toco codigo, ni `package.json`, ni `AGENTS.md`, ni `.opencode/agent/*.md`, ni `scripts/*.js`**. Tarea nueva: **TASKS.md TSK-173**. Decisiones: **ninguna** (sin ADR nuevo). Sin migraciones; produccion intacta.

**Que se estaba haciendo (1) - el gate de `smoke_grupos_perfil.js`:**

La cobertura de los 4 modulos agrupados de `mi-perfil.html` (Museo, Guardados, Niveles, Albumes) **ya no es deuda**: paso de existir solo como un **arnes temporal que un agente escribio y borro** a ser **test permanente con puerta de calidad**. El riesgo que el pase anterior dejo abierto era concreto: sin gate, el script corria solo a mano y **podia morir en silencio**.

- **Verificado en el archivo real (ADR-006):** `package.json` -> `scripts.test` **termina en `&& node scripts/smoke_grupos_perfil.js`**; existe el alias `smoke:grupos`. Conteo de la cadena: **21 pasos = 1 guard + 20 smokes**, y el nuevo es el **ultimo** que se ejecuta.
- **Asercion central: perdida de items**, porque un agrupamiento mal escrito se come elementos. Ademas cubre balance de divs, `node --check` de los scripts inline, pertenencia unica de cada item a un grupo, cuadre de conteos por etiqueta, toggle de plegado sin duplicar DOM, auto-apertura de niveles solo en el primer render y el tope de **24** de Albumes.
- **Resultado:** **73 comprobaciones, 2,0 s, ASCII-safe, sin dependencias ni red**; `npm run smoke:grupos` -> **73/73 PASS, exit 0**; `npm test` completo -> **20 suites, 0 FAIL, exit 0**.
- **Leccion que refuerza BUG-098:** el arnes **tenia un bug propio**. El `getElementById` del mini-DOM solo miraba `attrs.id`, pero `mi-perfil.html:2456` asigna `b.id` **por propiedad**, que en un DOM real si se refleja: el boton era invisible para el arnes y daba **2 falsos FAIL**. Corregido con `Object.defineProperty` en `Nodo`, igual que ya se hacia con `classList`. **Producto correcto, instrumentacion incorrecta.** Y el hecho de que el script pasara de `exit 1` a `exit 0` tras el fix es la prueba de que **detecta fallos reales** y no solo ruido.

**Que se estaba haciendo (2) - TSK-173, inventario de los 26 FAIL:**

Deuda viva que no tenia tarea. El brief pedia **conseguir el inventario ejecutando el script, no copiar numeros**, asi que se ejecuto y se clasifico cada FAIL contra su archivo real. Resultado en **TASKS.md TSK-173**. Los 3 puntos que mas cambian la lectura de esa deuda:

- **Timeout, causa raiz medida:** la corrida completa tardo **120,92 s** (370 ficheros) y **no hay un fichero patologico**: `express_check.js:122` lanza `childProcess.execFileSync('node', ['--check', abs])`, o sea **un spawn de Node por cada uno de los 365 ficheros JS** (0,33 s cada uno). La via rapida es el **filtrado por fichero**: **0,89 s** para 3 HTML, **1,39 s** para 1 fichero, ~**86x** mas rapido. El timeout **ya costo tiempo real** en la tanda de optimizacion de agentes.
- **No todo es deuda:** de los 26 FAIL, **~7 son falso positivo o no accionable** del propio checker. El caso de fondo: `upload-eventos.js:41` y `api/utilidades.js:654`/`723` son los **generadores** del escape que ADR-002 exige (en runtime emiten `\u\u` simple); el checker mira el fuente, no el valor emitido. Y `validate_ficha.js:75` **necesita** el backtick literal para detectar el bloque *fenced* de la ficha. El precedente de como se resuelve ya existe en el repo: `String.fromCharCode`, como en `smoke_grupos_perfil.js`.
- **Criticidad y orden:** `express_check.js` **no esta en `npm test`**, luego **ninguno de los 26 bloquea el gate de despliegue**. Unico fichero serverless (Escudo GOLD): `api/utilidades.js`. Unicos bugs de **dato** real: `seed-el-gato-gris-bogota.js:27` (`versi`\u00f3n` mal escrito) y `insert-eventos-bogota.js` (mojibake: escribe `Bogot`Ã©` en Neon si se ejecuta). Y los 5 `load-*-api.js` con `bytes>127=3` son, byte a byte, un **BOM UTF-8** (`EF BB BF`).
- **Criterio de cierre propuesto (decision pendiente del operador):** corrida completa en **PASS 735, FAIL 0, exit 0 y por debajo de 120 s**. **Y `express_check` NO debe entrar en `npm test`**: sumaria **+120,92 s** a un gate de ~2 s y hoy esta en `exit 1`, luego romperia el gate de todo el producto por deuda cosmetica preexistente. Solo tendria sentido si ademas se paraleliza el `node --check`.

**Riesgos activos:** (a) el riesgo grande de TSK-173 no es sanear codigo, es **malDiagnosticar**: tratar los falsos positivos como deuda y "arreglar" instrumentacion que funciona, que es exactamente el error de BUG-098; (b) `api/utilidades.js` es serverless, asi que tocarlo cae bajo el gate de confirmacion explicita (AGENTS.md regla 8) y el presupuesto 8/8 de ADR-010.

**Que sigue:** **commit del lote + REINICIAR OpenCode** (sigue siendo el unico pendiente bloqueante de TSK-172, y este pase documental se suma a el). Y luego **TSK-173**, empezando por el bloque 1 (`api/utilidades.js`) y por la **decision de si se corrige el checker o se aceptan los falsos positivos**, porque sin esa decision el gate no converge: cada fix de instrumentacion reaparece como deuda nueva.
### Agrupacion plegable de items en Mi perfil (Museo / Guardados / Niveles / Mis Albumes) - relevo 2026-10-02

Tanda express **100% cliente** para eliminar el scroll eterno de las pestanas Perfil y Museo de `mi-perfil.html`: los items se agrupan bajo cabeceras plegables. Working tree, verificado contra los archivos reales (ADR-006); **commit PENDIENTE**. Decision: **DECISIONS.md ADR-077**. Tarea: **TASKS.md TSK-171**. Incidente de proceso: **BUGS_HISTORICOS.md BUG-097 / BUG-CONFIG-6**. Un solo fichero de codigo modificado (`mi-perfil.html`); NO toca `api/*` (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones; sin cambios en produccion.

- **Que se estaba haciendo:** 4 superficies de "Mi perfil" pintaban cientos de tarjetas en fila continua (hasta 200 recursos de Museo, hasta 50 albumes, 40 niveles, todos los guardados). Se introdujo **un helper generico reutilizable** y se aplico a las 4, sin tocar serverless ni Neon.
- **Helper generico** (`mi-perfil.html:3125-3185`): `_pfGruposAbiertos` + `pfGruposToggle()` + `pfGruposRender(gridId, items, claveDe, grupos, itemHTML)`. **Devuelve solo el string y NO toca el DOM** (sus 3 llamadores lo pintan; Guardados necesita el string para el caso vacio del filtro de chips). El estado de plegado vive **FUERA del DOM**, indexado `gridId + '|' + clave`, para que los re-renders (publicar, mover, eliminar) repinten **conservando el grupo abierto**. Solo se pintan los grupos con items y las claves no previstas se agregan al final **para no perder items**.
- **Cuatro usos:** (1) **Museo** (`#museo-recursos-grid`, hasta 200): `MUSEO_GRUPOS` / `museoGrupoClave()` (`:3298-3313`) por `m.media_type || m.foto_type || m.tipo_media` normalizado a `foto|video|audio`, fallback `foto`, orden fijo foto/video/audio. (2) **Guardados** (`#mis-guardados-media-grid`): `GUARDADOS_GRUPOS` / `guardadosGrupoClave()` (`:2801-2818`), 4 grupos por `m.fuente` con el contrato canonico del servidor `GUARDADO_FUENTES = ['album','album_foto','viajero_foto','curada']` (`api/interacciones.js:4786`, **NO modificada**); el agrupado va **despues** del filtro por chip. (3) **Niveles** (`#pf-niveles`, 40): `NIVELES_ERAS` / `nivelesGrupoClave()` (`:1582`, `:1593`) en 5 grupos (Caminante, Explorador, Cronista, Leyenda, Mito), fallback Caminante; los grupos **envuelven** el acordeon por nivel sin sustituirlo, y `pfNivelesAutoAbrirGrupo()` (`:1644-1653`) abre en el PRIMER render el grupo del nivel actual **sin sobreescribir una decision posterior** del usuario. (4) **Mis Albumes** (`#mis-albumes-grid`, hasta 50): **NO se agrupa** porque un album no tiene `media_type`; muestra 24 y oculta el resto tras boton con contador (`MIS_ALBUMES_VER_MAS`, `:2450-2511`), y si hay 24 o menos **no se pinta el boton**.
- **CSS:** silo atomico bajo `#profile` (Regla de Oro 4 / ADR-004) en `:611-652` (`.pf-grupo`, `.pf-grupo-abierto`, `.pf-grupo-btn`, `.pf-grupo-flecha`, `.pf-grupo-nombre`, `.pf-grupo-count`, `.pf-grupo-body`). `--pf-grupo-col` se declara **solo bajo `#profile`** (`:623-625` + media query `:611`) como **fuente unica de verdad** del ancho de tarjeta, heredada por `.pf-grupo-body`. **NO se declara `display` en `.pf-grupo-body`**: lo alterna inline `pfGruposToggle()` (`grid | none`).
- **Decisiones de diseno:** (a) todo **plegado al entrar**, por peticion explicita del usuario; (b) se **replico el patron ya existente de `toggleTrofeosBloqueados()`** (`:1756`) en vez de inventar uno nuevo, sin `details/summary` ni librerias; (c) `pfAplicarTab()`/`PF_TABS` **NO se tocaron** (ADR-077); (d) presupuesto Vercel Hobby 8/8 agotado (verificado: 8 ficheros en `api/`), cero endpoints nuevos; (e) ASCII-safe (ADR-002) en todo lo nuevo.

**Que sigue:**
1. **Commit + push del lote** (unico pendiente): `mi-perfil.html` + los 4 documentos de gobernanza de este pase. Vercel despliega al push; **no aplica** porque no toca `api/*`.
2. **QA visual en navegador** del comportamiento real: plegado al entrar, persistencia del grupo abierto tras un re-render (publicar/mover/eliminar en Museo), el "ver mas" de Mis Albumes y, sobre todo, **el cambio de pestana con un grupo abierto** (el sintoma que motiva ADR-077).
3. **Decidir si se abre la auditoria de fondo de `pfAplicarTab()`** (el cache `_pfDisp` sigue sin corregirse; ver la deuda (a) de ADR-077).

**Riesgos activos:**
- **El fallo que motiva ADR-077 no lo cubre ningun smoke:** cambiar de pestana con un grupo plegado NO lo detecta ni `express_check` ni la auditoria de sintaxis, porque el sintoma (un bloque que reaparece visible) solo existe en UI real. La regla se sostiene hoy en una convencion de composicion, comprobable con grep: **ningun `.pf-grupo` con `data-tab` y ningun `.pf-grupo` hijo directo de `#profile`**. Si alguien cuelga un collapsible de un bloque `data-tab`, el bug reaparece sin aviso.
- El **estado de plegado vive en memoria** (`_pfGruposAbiertos`): un re-render lo respeta, pero **recargar la pagina vuelve a todo plegado** (no se persiste; decision consciente, no un olvido).
- **`Mis Albumes` no se agrupa** (un album no tiene `media_type`): su antidistribucion es "ver mas" a partir de 24, no plegado. Si el volumen de albumes crece mucho, ese patron es el primero que se quedara corto.
- **ASCII (ADR-002) verificado por delta, no por fichero:** las 308 lineas anadidas tienen 0 bytes > 127 y 0 backticks, pero `mi-perfil.html` conserva un residuo **preexistente** de 200 bytes > 127 y 4 backticks (446/4 en HEAD). El lint global sigue rojo por eso y por la deuda (a)-(e) siguiente.

**Deuda [DEUDA-EXPRESS] (preexistente, NO de esta tanda):** (a) `express_check` con **26 FAIL globales** en `scripts/*` y `api/utilidades.js` por backticks y doble escape (`api/utilidades.js`: backticks=24, doble-escape=3); (b) `scripts/smoke_test_epic_prompt.js` con **4 FAIL** (VOCACIONES x3, `vocaciones_catalogo` x2, `chat_salas`) contra `api/interacciones.js`; (c) **CSS duplicado** `.pf-museo-preview` (`:511` y `:592`) y `.trofeo-grid` (`:127` y `:174`), dejado intacto a proposito; (d) `.pf-album-card` y `.pf-ver-mas` siguen con peso visual en estilos inline (por coherencia con el patron de Trofeos) y el silo solo aporta foco de teclado y `cursor`; (e) el residuo ASCII de (a)/(c) en `mi-perfil.html` (200 bytes > 127, 4 backticks). Deuda propia de la tanda: **sin smoke del cambio de pestana con grupo abierto** y el arreglo de fondo de `_pfDisp` diferido.

### Roster unico de 20 agentes + `AGENTS.md` - relevo 2026-10-01

Retirada del modelo de pares espejo y de la ruta hibrida que dejo ADR-074: ahora hay **un solo agente por dominio**, todo el roster es FREE y la gobernanza vive en un `AGENTS.md` NUEVO en la raiz del repo. Working tree, verificado (ADR-006); **commit PENDIENTE**; requiere REINICIAR OpenCode para que los agentes recarguen (patron BUG-086). Decision: **DECISIONS.md ADR-076**. Tarea: **TASKS.md TSK-170**. Bugs cerrados: **BUG-034** y **BUG-088**. NO toca `api/*` (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones; sin cambios en produccion.

- **Que se estaba haciendo:** sustituir la eleccion de "~par" (`*-free` vs `*-pro`) por un **agente unico por dominio**, eliminar la ruta hibrida y la ruta de pago propia, y crear el archivo de gobernanza que BUG-088 reportaba como inexistente.
- **Roster 27 -> 20:** 13 `*-free` renombrados al nombre de dominio; RETIRADOS `backend-dev-pro`, `architect-pro`, `renderer-dev-pro`, `data-migration-pro`, `hybrid-plan`, `hybrid-build`, `paid-plan`, `paid-build`; `exp-pickle-free` fusionado en `js-silo-dev`; NUEVOS `plan` y `build` (`mode: primary` sin `model:` propio). Los 16 especialistas declaran `model: opencode/space-bunny-free` explicito, asi que ya no dependen del primario que los invoque.
- **NUEVO `AGENTS.md` en la raiz:** seccion 0 (tier obligatorio con `question`, una vez por tarea, sin default silencioso), seccion 1 (matriz de 16 dominios con agente unico), seccion 2 (capa de coste + gates de riesgo: RLS/esquema, migraciones/seeds masivos, motor de render y arquitectura exigen confirmacion explicita), seccion 3 (16 reglas transversales), seccion 4 (indice de skills).
- **Skills:** despublicadas `batch-create`, `gemini-research`, `ingest-eventos` (14 -> 11); sus prompts se conservan en NUEVO `.opencode/prompts/`; portadas `anti-absorcion`, `eficiencia-recursos`, `templates`. Las 3 skills `agentes-roster`, `modelos-verificados` y `reglas-de-oro` **NO existen**: declararlas existentes es un error.
- **Scripts:** NUEVOS `scripts/validate_ficha.js` (canonico, **cierra BUG-034**), `scripts/usage_report.js` (`npm run usage:tanda`) y `scripts/session_close.js` (`npm run session:close`); el guard `verificar-capa-gratis.js` se reescribio para clasificar por `mode` (PRIMARIO / ESPECIALISTA / PAID / ROTO) en vez de por sufijo de nombre.
- **Config:** `opencode.json` con `subagent_depth` de 2 a **1** y `permission.question: allow`; `default_agent` sigue `free-build` y `model` sigue `opencode/space-bunny-free`.
- **Umbral de lectura por rango:** 200 KB -> **150 KB** (afecta a `api/interacciones.js`, `admin.html`, `mi-perfil.html`, `DECISIONS.md`, `TASKS.md`, `NEXT.md`, `BUGS_HISTORICOS.md`).

**Que sigue:**
1. **Commit de todo el lote** (esta es la unica accion bloqueante): incluye archivos NUEVOS sin commitear -> `AGENTS.md`, `scripts/usage_report.js`, `scripts/session_close.js`, `scripts/validate_ficha.js`, `.opencode/prompts/`, `.opencode/agent/plan.md`, `.opencode/agent/build.md`, `.opencode/skills/{anti-absorcion,eficiencia-recursos,templates}/`; mas las renombras/borrados de `.opencode/agent/` y las skills despublicadas. `AGENTS.md` y `docs/orquestacion/REFERENCIA-RUTEO.md` deben viajar en el MISMO commit que el roster.
2. **REINICIAR OpenCode** para que los agentes recarguen; verificar con `npm run coste:gratis` (`20 | gratis: 20 | de pago: 0`) y una tanda real con `@free-build`.

**Riesgos activos:**
- Todo el lote esta en working tree: un reinicio o un cambio de rama sin commit pierde `AGENTS.md` y los scripts portados.
- Hasta reiniciar, los agentes cacheados son los del roster viejo; delegar por el nombre nuevo (`@sql-security`, `@docs-keeper`) falla con "unknown agent type".
- `AGENTS.md` y `docs/orquestacion/REFERENCIA-RUTEO.md` se desincronizan si alguien edita solo uno (el guard verifica coste, NO la matriz de dominios).
- `subagent_depth: 1` impide que un subagente delegue: los dominios que lo necesiten deben encadenarse en dos niveles desde el orquestador.
- TSK-166/TSK-167/TSK-168 quedan con premisa SUPERADA por ADR-076 (los pines `-pro` que evaluaban ya no existen); TSK-166 (calidad del FREE en dominios duros) sigue siendo relevante como medicion.

**Deuda [DEUDA]:** commit pendiente (a); las 3 skills declaradas pendientes no existen (b); sin medicion de calidad real del FREE en dominios duros y sin re-verificar la allowlist FREE/lista ROTOS del guard, que son datos medidos del proveedor (c); la fusion de `exp-pickle-free` en `js-silo-dev` concentra ese dominio en un unico agente (d).

### Capa gratuita de agentes restaurada (3 capas de coste) - relevo 2026-09-30

Restauracion de la capa gratuita de agentes de orquestacion tras BUG-092 (que el 2026-09-29 movio los 19 agentes a `opencode-go`, de pago, dejando la capa gratuita VACIA mientras ADR-067 la declaraba vigente). Working tree, verificado (ADR-006); commit/deploy pendientes; requiere REINICIAR OpenCode. Decision: **DECISIONS.md ADR-074** (el guard y el brief lo rotulan "ADR-072"; el consecutivo real es 074 porque 072 y 073 ya existen). Tarea: **TASKS.md TSK-165** (seguimiento TSK-166/167/168). Bug de gobernanza: **BUGS_HISTORICOS.md BUG-094** (BUG-092 permanece CERRADO; su resolucion queda supersedida). NO toca `api/*` (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones.

**Que se estaba haciendo (resumen; anclas: DECISIONS.md ADR-074, TASKS.md TSK-165, BUGS_HISTORICOS.md BUG-094):**
- **Default de sesion:** `opencode.json` `model`/`small_model` -> `opencode/space-bunny-free` (el MISMO modelo que `big-pickle` -- Space Bunny -- por la via que SI soporta subagentes).
- **17 subagentes `*-free`:** se quita `model:` del frontmatter -> heredan el modelo del primario.
- **Primarios:** `free-build`/`free-plan` y `hybrid-build`/`hybrid-plan` -> `opencode/space-bunny-free`; `paid-build`/`paid-plan` -> `opencode-go/deepseek-v4.1-flash`. `hybrid-build` es el UNICO que puede proponer un `-pro` y NUNCA lo invoca sin OK explicito (bloque `ESCALADO PROPUESTO`).
- **4 pines `-pro`:** `backend-dev-pro`, `architect-pro`, `renderer-dev-pro`, `data-migration-pro` (`opencode-go/deepseek-v4.1-flash`).
- **Guard:** NUEVO `scripts/ejecucion/verificar-capa-gratis.js`, primer paso de `npm test` (y `npm run coste:gratis`); falla (exit 1) si un `*-free` queda en pago, si `opencode.json` no esta en la allowlist FREE, si un `-pro` no declara `model:`, o si alguien usa un modelo de la lista ROTOS. Nuevo `npm run cuota:tanda`.
- **Roster:** 19 -> **27** (21 gratis, 6 de pago).
- **Evidencia (ADR-006):** conteo real 27 agentes; `opencode.json` = `opencode/space-bunny-free`; `npm test` VERDE (exit 0) con el guard primero; `opencode run --agent hybrid-build` delego a `@exp-pickle-free` y `opencode.db` registro ambos en `opencode/space-bunny-free` con `cost=0.000000`; guard forzado a `seo-dev-free` en pago -> exit 1 correcto (revertido).
- **Allowlist FREE (dato medido):** `opencode/space-bunny-free`, `opencode-go/space-bunny-free`, `opencode-go/longcat-2.5-preview-free`. ROTOS (fallan como subagente): `opencode/big-pickle` (sirve como modelo de sesion, no como subagente) + `ling-3.0-flash-fin-free`, `longcat-2.5-preview-free`, `mimo-v2.6-flash-free`, `muse-spark-1.3-contributor-free`, `nemotron-3-ultra-free`, `nemotron-3.5-lightning-free`. `google/*` NO es gratuito (key con billing).

#### Que sigue

1. **REINICIAR OpenCode** para que recargue los agentes y modelos (el servidor los cachea al arrancar; ver BUG-086 / BUG-CONFIG-2); hasta reiniciar, los agentes nuevos/modelos NO aplican.
2. **Hacer una tanda real** con `@free-build` y `@hybrid-build` (que heredan `opencode/space-bunny-free`) para medir **calidad y costo** en dominios duros; baseline de economia por mensaje en ADR-074.
3. **Confirmar el guard en la rutina:** `npm test` debe seguir verde con `verificar-capa-gratis.js` como primer paso; cualquier `*-free` que vuelva a pago debe romper el test (TSK-167).
4. **Commit + push** del conjunto de orquestacion (sin deploy Vercel: no toca `api/*`).
5. **Follow-ups registrados:** TSK-166 (calidad de `space-bunny-free` tras ~2 semanas), TSK-167 (revisar allowlist FREE si aparecen modelos), TSK-168 (evaluar pines `-pro` para SEO/admin).

#### Riesgos activos

- **Cache de arranque:** los cambios de agentes/modelos NO aplican hasta REINICIAR OpenCode (BUG-086 / BUG-CONFIG-2).
- **Allowlist dependiente del proveedor:** `space-bunny-free`/`longcat-2.5-preview-free` son gratis HOY; si `opencode` cambia su free tier, hay que re-sondear (TSK-167).
- **`big-pickle` como default:** funciona como modelo de SESION pero NUNCA como subagente; si alguien lo pone de default, los subagentes que heredan fallarian (por eso el default es `space-bunny-free`, el mismo modelo por la via correcta).
- **Escalada a `-pro` sin control:** `hybrid-build` puede PROPONER un `-pro`, pero la politica de coste depende de que el operador responda al `ESCALADO PROPUESTO` (disciplina operativa, no guard).
- **Discrepancia de numeracion:** el guard y el brief citan "ADR-072"; el ADR real es 074 (072/073 ya existian). Renombrar los comentarios del guard queda pendiente.

### Migracion de identidad ExploraCO -> LATAWEL (rebranding) - relevo 2026-09-30

Migracion de identidad visible de ExploraCO a **LATAWEL** sobre la estructura actual. **Alcance: SOLO identidad; NO se redisenaron las 20 pantallas del prompt de rediseno.** Working tree, verificado (ADR-006); commit/deploy pendientes. Decision: **DECISIONS.md ADR-073** (fuente consolidada `logos/ADR-LATAWEL.md`; manual `logos/07-MANUAL.md`). Tarea: **TASKS.md TSK-164**. Bug: **BUGS_HISTORICOS.md BUG-093** (manifest). NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones.

**Que se estaba haciendo (resumen; anclas: DECISIONS.md ADR-073, TASKS.md TSK-164, BUGS_HISTORICOS.md BUG-093):**
- **Marca:** LATAWEL (mayusculas sostenidas, una palabra); tagline "What to do?"; descriptor "plataforma de turismo interactivo".
- **Dominio:** `https://latawel.com` es el dominio VIVO (resuelve y sirve el sitio en Vercel); el antiguo `exploraco.co` YA NO resuelve. En codigo `BASE = process.env.SITE_BASE_URL || 'https://latawel.com'`; canonical, `og:url`, `og:image` absoluta, `sitemap.xml` y `FROM_EMAIL` migran a `latawel.com`.
- **Paleta (todo el sitio):** `#E8A020`->`#FF4A00`, `#C8860A`->`#FFB84D`, `#FDF3E0`->`#E5E7EB`, `#ffb400`->`#FF4A00`, `rgba(232,160,32)`->`rgba(255,74,0)`, `#111`->`#0F1419`, `#0A1628`->`#0F1419`. Verificado: 0 restos en produccion.
- **Tipografia:** Poppins SOLO marca/tagline; se CONSERVAN Barlow Condensed + Outfit en texto.
- **Assets (`assets/brand/`):** `latawel-logo-horizontal.png` (240x80) + `@2x` (480x160) + `latawel-logo-horizontal-white.png` (240x80, fondo oscuro), `latawel-logo-vertical.png` (240x288) + `@2x`, `latawel-simbolo.png` (1277x1232), `latawel-lockup.png` (2172x724), `favicon/favicon-16/32/180.png` + `favicon.ico` (multi 16/32/48), `og/latawel-og-1200x630.png`. Script reproducible `scripts/assets/build-brand-assets.ps1`. **Sin SVG maestro** (solo 4 PNG en `logos/`); deuda aceptada.
- **Re-skineo masivo:** `scripts/rebrand/codemod-latawel.js` (dry-run/`--apply`) aplicado a **122 HTML de la raiz** (118 publicos + 4 fragmentos); auditoria `scripts/rebrand/audit-latawel.js`.
- **Logo por IMAGEN (no texto CSS):** header oscuro usa la variante white; footer/otros oscuros white.
- **Head:** favicons + `og:image` default `https://latawel.com/assets/brand/og/latawel-og-1200x630.png`; canonical/`og:url` a `latawel.com`; `theme-color #FF4A00`.
- **Backend:** `api/pagina-destino.js` (motor primario por rewrite), `api/utilidades.js` (sitemap/`BASE`/OG), `api/usuarios.js` (niveles "Gran Maestro LATAWEL"/"Mito Eterno LATAWEL", `FROM_EMAIL 'LATAWEL <noreply@latawel.com>'`), `api/admin.js` (`FROM_EMAIL` + `ADMIN_EMAIL` fallback `admin@latawel.com`), `api/interacciones.js`. Tambien `pagina-destino.js` legacy (codigo muerto), conectores JS (`usuario-session.js`, `compartir.js`, etc.), `_motor.css`, `_premium.css`, `mapa-cultural.css`, `manifest.json`, `robots.txt` (sitemap -> `latawel.com`).
- **PRESERVADOS intactos:** `window.ExploraCO`, `window.onExploraCOUpdate`, `'exploraco12345'`, `'exploraco-share-style'`, `exploraco.vercel.app`, nombres de archivo `.html`, endpoints `/api/*`, esquema DB y tags JSONB. **0 endpoints nuevos, 0 migraciones.**
- **Evidencia (ADR-006):** `npm test` = **896 PASS / 0 FAIL (exit 0)**; `node --check` OK en 24 archivos; 0 regresiones de balance de divs en 123 HTML; balance de llaves CSS 0; **154 archivos modificados** (git status). Verificado en archivo real: `MANIFEST`/`robots`/`head` con `latawel.com`, `BASE` con fallback, `FROM_EMAIL` LATAWEL, niveles LATAWEL; `assets/brand/` presente con las 9 rutas.

#### Que sigue

1. **Commit + push** del conjunto (Vercel despliega al push) y **QA runtime** en `https://latawel.com` (home, una ficha via `api/pagina-destino.js`, `sitemap.xml`, `blog.html`, `/buscar`).
2. **Corregir `SITE_BASE_URL` en Vercel** si existe con el valor viejo: el codigo usa fallback a `latawel.com`, pero una variable stale gana y rompe canonical/OG/sitemap/email.
3. **Re-scrape manual de OG** (Facebook/Twitter/WhatsApp) tras el deploy para refrescar la cache social de canonical/OG.
4. **Google Search Console** con el sitemap nuevo (`https://latawel.com/sitemap.xml`) y verificacion de propiedad del dominio.
5. **Reemplazar los raster por SVG maestro** cuando el proveedor de marca lo entregue (favicon/OG hoy son raster).
6. **Corregir `manifest.json` (BUG-093):** el simbolo se declara como `192x192` y `512x512` cuando el archivo real mide 1277x1232.
7. **Pulido:** limpiar acentos dorados residuales (`#FDE68A`, `#F59E0B`, `#FFD980`, `#FFD700`, etc.) y retirar `scripts/test-fase1.js` duplicado.

#### Riesgos activos

- **`SITE_BASE_URL` stale en Vercel:** si la variable existe con `https://exploraco.co`, gana sobre el fallback `latawel.com` y las superficies server-side (canonical/OG/sitemap/`FROM_EMAIL`) saldrian con el dominio antiguo (que ya no resuelve).
- **Cache social de OG/canonical antiguos:** puede requerir re-scrape manual tras el deploy.
- **Assets raster (sin SVG maestro):** el isotipo a 16px puede perder detalle; el OG y el favicon son derivados.
- **Acentos dorados funcionales fuera de la paleta** (`#FDE68A`, `#F59E0B`, `#FFD980`, `#FFD700`, etc.) en algunas paginas: deuda de pulido, no bloqueante.
- **Datos historicos con la marca antigua:** las filas de `chat_mensajes` con nombre "ExploraCO Oficial" se CONSERVAN por Cero Borrado Logico (no es un defecto).
- **Scripts fuera del codemod:** `scripts/seed-*.js` y helpers conservan la cadena `exploraco.co` (User-Agents/prints); el codemod solo cubrio HTML de la raiz.

### Unificacion del panel de perfil (Pasaporte combinado de 10 datos) - relevo 2026-09-29

Refinamiento de producto sobre TSK-159: unificar en UN SOLO PANEL las secciones de datos del perfil (`mi-perfil.html`, tab "perfil") y unificar el progreso del Pasaporte en la UNION COMBINADA de los datos del checklist 042 + las misiones de perfil, con total unico de **10**. Working tree, `npm test` verde; commit/deploy PENDIENTES y la migracion **042 aun PENDIENTE de aplicar en Neon**. Decision: **DECISIONS.md ADR-069 (ENMIENDA 1)**. Tarea: **TASKS.md TSK-163**. Bug: ninguno nuevo (los hallazgos quedan como deuda). NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010); sin migracion nueva.

**Que se estaba haciendo (resumen; anclas: DECISIONS.md ADR-069 ENMIENDA 1, TASKS.md TSK-163):**
- **`mi-perfil.html` (tab perfil):** se ELIMINAN los bloques `#pf-datos` ("Mis datos"), `#pf-origen` ("Tu origen"), `#pf-completa` ("Completa tu perfil"/"Tu pasaporte de viajero") y el titulo "Tu Pasaporte". Queda UN solo panel host id `pf-pasaporte` titulado "Tu pasaporte de viajero"; se conservan `#pf-billetera` y `#pf-galeria`.
- **JS de `mi-perfil.html`:** se ELIMINAN `renderDatosPerfil`, `pfDato`, `pfDatoFoto`, `renderOrigen`, `pfOrigenDesdeSesion`, `pfOrigenRow`, `PF_MISION_DESTINO`, `PF_MISION_ORDEN` y `cargarCompletitudPerfil`. `renderPasaporte(p)` se REESCRIBE (con `PF_PAS_ACCION`, `pfPasValor`, `pfPasItem`) para pintar las 10 filas con accion por campo. `pfEditarCampo` separa 'ciudad' (solo `ciudad_base`) y 'pais' (solo `pais_base`). Se conserva `pfOrigenMinDias` (aviso anti-teleport). Init, `pfTab('perfil')`, `pfRefrescarPerfilPaneles` y el guardado de Casa ahora llaman `cargarBilletera()`.
- **`api/usuarios.js` v25 (antes v24):** `calcularPasaporte(u, nFotos)` devuelve 10 items combinados en orden foto, nombre, nacimiento, ciudad, pais, bio (>=40), intereses (>=3), email, casa, faccion. El SELECT de GET `billetera_mia` se amplia con `avatar_url`, `bio`, `intereses`, `casa`, `faccion`.
- **`api/interacciones.js`:** el logro `logr_pasaporte_completo` se alinea a los 10 datos (desc de "6 datos" a "10 datos" y `ctx.pasaporteCompleto()` con 10 criterios). `scripts/smoke_042_pasaporte_billetera.js` actualiza su linea de version a v25.
- **Decisiones de producto del operador:** (a) el progreso del pasaporte es la UNION COMBINADA de los datos del pasaporte 042 + las misiones de perfil, con total unico de 10; (b) un solo panel; (c) ciudad y pais se muestran/editan por separado y se OMITE del perfil la visualizacion del puntaje por Local/Nomada/Extranjero (el multiplicador ADR-058 sigue vigente en backend; solo se oculto su tarjeta).
- **Consecuencia de negocio:** el gate de creacion de billetera (`bmPasaporte.completo`) ahora exige los 10 datos (antes 6). Las billeteras ya creadas PERSISTEN (`INSERT ... ON CONFLICT DO NOTHING`).
- **Verificacion (ADR-006, todo verde):** `npm test` completo OK (todos los smokes, incluidos 042 y 058); `node --check` de `api/usuarios.js` y `api/interacciones.js` OK; balance de `<div>` en `mi-perfil.html` 560/560 (diff 0); `api/*.js` ASCII-safe (0 bytes>127, 0 backticks); QA estatico (sandbox vm) confirmo mapeo 10/10, uso de `esc()` (sin XSS) y call-sites cableados. Cabecera real `api/usuarios.js` v25; `calcularPasaporte` devuelve 10 items; `logr_pasaporte_completo` desc "10 datos".

#### Que sigue

1. **Commit + push** del conjunto (junto al lote de TSK-160) y **QA runtime**: en el perfil debe verse UN solo panel "Tu pasaporte de viajero", con 10 filas y accion por campo, y la billetera debe crearse solo con los 10 datos.
2. **Aplicar la migracion 042 en Neon** (sigue PENDIENTE) antes de dar por bueno el flujo; mientras no se aplique, el pasaporte/billetera dependen del fallback/columnas existentes.
3. **Limpiar el CSS huerfano** `.pf-datos`/`.pf-completa`/`.pf-origen` (~110 lineas) y el comentario de cabecera que los menciona.
4. **Robustecer `pfPasItem`:** no caer a `PF_PAS_ACCION[id] || {}` (evitar boton "undefined" ante un id de backend sin accion).
5. **Evaluar el fallback 42703/42P01 en GET `billetera_mia`** (hoy no lo envuelve, a diferencia de las consultas vecinas).

#### Riesgos activos

- **Gate de billetera endurecido:** ahora exige 10 datos (antes 6); usuarios con solo 6 ya no crean billetera nueva. Aceptado; las ya creadas PERSISTEN.
- **Multiplicador de origen oculto solo en UI:** el puntaje Local/Nomada/Extranjero ya no se muestra en el perfil, pero **ADR-058 sigue vigente en backend**; no hay cambio de economia, solo de presentacion en `mi-perfil.html`.
- **DEUDA-EXPRESS-1:** CSS huerfano `.pf-datos`/`.pf-completa`/`.pf-origen` en `mi-perfil.html` (~110 lineas) tras eliminar sus hosts, mas el comentario de cabecera que los menciona.
- **DEUDA-EXPRESS-2:** `pfPasItem` cae a `PF_PAS_ACCION[id] || {}`; ante un id de backend sin accion pintaria un boton "undefined" (robustez defensiva pendiente).
- **DEUDA-EXPRESS-3:** GET `billetera_mia` no envuelve su SELECT en el fallback 42703/42P01 que si usan las consultas vecinas (pre-existente desde v24, agravado mientras la migracion 042 siga PENDIENTE de aplicar en Neon).
- **DEUDA-EXPRESS-4 (cosmetico):** `pfPasValor` lee nombres/valores desde la sesion (localStorage); si un campo no esta hidratado puede verse vacio aunque el servidor marque "Listo".

### Mapa base CARTO a OSM (teselas) e incidente de tooling de subagentes - relevo 2026-09-29

Cierre de dos incidentes del 2026-09-29. **(A) Mapa base sin textura:** todos los mapas Leaflet mostraban pines/clusters pero SIN capa base; causa raiz = CARTO sirve HTTP 200 con un PNG placeholder "API KEY REQUIRED" y el fallback por `tileerror` nunca se disparaba. Decision: **ADR-071** en DECISIONS.md (migracion a OSM + cadena de 3 proveedores). Tarea: **TASKS.md TSK-161 (CERRADA / working tree)**. Bug: **BUGS_HISTORICOS.md BUG-091**. **(B) Subagentes caidos:** todo subagente fallaba con "OpenCode's free tier can only be used from within OpenCode"; causa = `model: opencode/big-pickle` en los 19 agentes. Tarea: **TASKS.md TSK-162 (CERRADA)**. Bug: **BUGS_HISTORICOS.md BUG-092 / BUG-CONFIG-5**. Este es el unico pase que escribe en `exploraco desarrollo/` (R2). NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones ni API keys.

**Que se estaba haciendo (resumen; anclas: DECISIONS.md ADR-071, TASKS.md TSK-161/TSK-162, BUGS_HISTORICOS.md BUG-091/BUG-092):**
- **(A) Diagnostico ADR-006:** evidencia cuantitativa en la misma zona de Bogota 4.711,-74.072 -- CARTO voyager/light_all **2049 B identicos** en z6/z10/z14 y dark_all **2513 B identicos**; OSM (control) **24923 B** (z6), **28000 B** (z10), **40168 B** (z14) -> varia con el zoom. La captura `exploraco desarrollo/ampliacion desarrollo/mapa.jpg` (860x332) muestra el mosaico "API KEY REQUIRED"; pines y cluster (123) correctos.
- **(A) Fix:** `mapa-tiles.js` L21-25 con la cadena `osm` -> `osm-hot` -> `esri-imagery`; `UMBRAL_ERRORES` = 5; fallback por `tileerror` y aviso con boton Reintentar intactos. Limpieza de CARTO en `mapa-cultural.js` (L71/L73 y comentario L1681), `index.html` (L1732/1734/1741/2291), `mapas.html` (L301/303-306) y `comunidad.html` (L2043-2052).
- **(A) No afectado:** `api/pagina-destino.js` usa un iframe de Google Maps (L1928), no CARTO; las paginas de destino no estaban afectadas. `index.html:1746`, `comunidad.html:2330`, `map-picker.js:182`/`260` ya tenian `invalidateSize()`.
- **(A) Verificacion:** `npm run test` **EXIT CODE 0** (13 smokes OK, 0 FAILs reales); `scripts/smoke_mapa_tiles.js` **24/24 PASS**; `scripts/smoke_mapa_cultural.js` **98/98 PASS** (assert A3 obsoleto reescrito); Escudo GOLD APROBADO (divs identicos a HEAD: index 388/388, mapas 58/58, comunidad 449/449; 0 `cartocdn` en los archivos tocados).
- **(B) Fix de tooling:** 18 de los 19 agentes -> `opencode-go/deepseek-v4.1-flash`; `media-reader-free.md` -> `opencode-go/mimo-v2.6-pro` (vision); `opencode.json` `small_model` -> `opencode-go/deepseek-v4-flash`. Verificado tras reiniciar OpenCode.

#### Que sigue

1. **Renombrar el id legado `tiles: 'carto-voyager'`** en `mapa-cultural.js:359` y `mymapa.js:152` (es solo un nombre de id sin marca de URL; resuelve a `TILE_VOYAGER`, que ahora es OSM).
2. **[Hallazgo ADR-006, no citado en el brief] `map-picker.js:91`:** conserva `tileUrl` por defecto `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` y lo pasa como `{url: tileUrl}` a `MapaTiles.aplicar` (L163/L254); como MapaTiles antepone esa URL como proveedor `custom` y CARTO responde 200 con placeholder, el fallback no actua en el map-picker de `admin.html:2556` ni en `mi-perfil.html` (mini-mapa/modal). Corregir el default a OSM en una proxima sesion.
3. **Decidir si se limpian las URLs `cartocdn` de los `.html` estaticos versionados** (~90 archivos, p.ej. `casa-vieja-popayan.html`, `_lacandelaria3_body.html`, `_tmp_lac3.js`; quedaron FUERA de alcance por decision de alcance minimo).
4. **Considerar Esri o un proveedor de pago si el trafico crece** (dependencia de la tile usage policy de OSM).
5. **Commit + deploy** de los 5 archivos del fix de mapa (`mapa-tiles.js`, `mapa-cultural.js`, `index.html`, `mapas.html`, `comunidad.html`) + QA runtime en produccion (los mapas deben pintar la capa base OSM).

#### Riesgos activos

- **CARTO sigue respondiendo 200 con placeholder:** cualquier superficie que aun apunte a `cartocdn` (map-picker `admin.html`/`mi-perfil.html` por el default de `map-picker.js:91`; ~90 `.html` estaticos) mostrara el mosaico "API KEY REQUIRED" sin que el fallback se dispare.
- **Perdida del tema oscuro (`dark_all`):** consecuencia aceptada de la migracion a OSM (ADR-071); el operador prohibio proveedores de pago.
- **Dependencia de la politica de uso de OSM:** si el trafico crece o se hace scraping, el servicio puede degradarse; revisar Esri/pago (follow-up 4).
- **Incidente de tooling corregido pero con cache de arranque:** los agentes/modelos nuevos NO aplican hasta REINICIAR OpenCode (ver BUG-086 / BUG-CONFIG-2).

### Tanda de coste y orquestacion ADR-067: roster 40 -> 19, 3 capas con presupuesto, R1-R4 y 3 modos nuevos de informe-cuota - relevo 2026-09-28

SOLO gobernanza de orquestacion (`.opencode/agent/*.md`, `opencode.json`, convenciones de `description`, `scripts/ejecucion/informe-cuota.js`), verificada contra archivo real (ADR-006). NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones; sin ADR nuevo (el ADR-067 lo escribio architect durante la tanda; este pase documental cierra su Nota de revision R-067 y corrige 2 datos). Tarea de deuda: **TASKS.md TSK-157**. Bugs de configuracion: **BUGS_HISTORICOS.md BUG-085..BUG-088** (BUG-CONFIG-1..4). Esta sesion es el UNICO pase que escribe en `exploraco desarrollo/` (R2).

**Que se estaba haciendo (resumen; ancla: DECISIONS.md ADR-067):**
- **Roster 40 -> 19:** retirados 21 agentes (4 primary `build`/`plan`/`hybrid-build`/`hybrid-plan` + 17 PRO con par `-free`); supervivientes = los 17 `*-free` + `free-build` + `free-plan`.
- **4 reglas de orquestacion R1-R4:** R1 carga diferida (brief autonomo por subagente); R2 docs solo al cierre; R3 web solo por Gemini; R4 resumen de gasto obligatorio (`--task`).
- **Convencion de `description:`** en agentes y skills (una linea, espanol plano, <=140/150 chars, sin "GRATUITO", sin nombre de modelo, sin `\u00XX`, sin block scalars).
- **`docs/orquestacion/REFERENCIA-RUTEO.md` (NUEVO, untracked):** matriz de dominios, R1-R4, anclas y politica de escalada (toda tarea de RLS/claves/migracion de esquema escala al operador humano).
- **`scripts/ejecucion/informe-cuota.js`:** 413 -> 764 lineas; 9 flags originales (`--dia`, `--5h`, `--desde=`, `--hist5h=`, `--schema`, `--db=`, `--dir=`, `--out=`, `--topn=`) + 3 nuevos (`--task`, `--overhead`, `--max-sessions`). Esquema con los 5 campos de tokens (`tokens_input`/`tokens_output`/`tokens_reasoning`/`tokens_cache_read`/`tokens_cache_write`) y `message.data.tokens.{input,output,reasoning,cache.read,cache.write,total}`.
- **R3 forzado por `deny` explicito:** `webfetch: deny` + `websearch: deny` en 18 de los 19 agentes; solo `research-agent-free` los conserva en `allow`; `opencode.json` mantiene el `deny` global (defensa en profundidad).
- **Purga:** 3 `.md` byte-identicos (25.281 B) borrados de `scripts/ejecucion/`; canonicos en `.opencode/skills/gemini-research/prompts/`.
- **`opencode.json`:** `subagent_depth: 2`, `default_agent: free-build`, `permission: {edit: allow, bash: allow, webfetch: deny, websearch: deny}`.
- **Ahorro medido (`--overhead`, estimacion chars/3.5):** Capa 0 12.752 -> 4.134 chars (**-67,6%**) y Total 145.616 -> 85.884 chars (**-41,0%**). Tabla completa en la Nota de revision R-067 de DECISIONS.md.

#### Que sigue

1. **[BUG-CONFIG-2] Verificar R3 en runtime:** reiniciar opencode y lanzar un subagente (p.ej. `js-silo-dev-free`) que intente `webfetch`; debe ser DENEGADO. La config de agentes/permisos se carga al INICIAR la sesion, por lo que la sesion viva no refleja el estado final del disco.
2. **Versionar `docs/orquestacion/REFERENCIA-RUTEO.md`** (untracked).
3. **Revisar `explore-free`** (`edit: deny`, `bash: deny`; decision de menor privilegio): decidir si necesita `bash` read-only.
4. **Residual:** `scripts/informes-cuota/cuota-2026-09-11-desde-2026-09-06.md:199` cita la ruta vieja `scripts/informe-cuota.js`.
5. **Convencion ADR-067 fuera de `.opencode/`:** `.agents/skills/brainstorming/SKILL.md` tiene `description` en ingles y posiblemente >150 chars: decidir si entra en la convencion.
6. **`batch-create/SKILL.md`** contiene el nombre de modelo "DeepSeek V4 Flash": la convencion ADR-067 prohibe nombres de modelo en skills.
7. **[BUG-CONFIG-3] URLs de 800px/1200px rotas (HTTP 400)** ya sembradas en HTML/JS: barrer y regenerar desde la API (`iiurlwidth`).

#### Riesgos activos

- **R3 no verificado en runtime (BUG-CONFIG-2 / BUG-086):** hasta reiniciar opencode, la denegacion de `webfetch`/`websearch` no esta probada end-to-end; el `deny` global de `opencode.json` es la unica garantia que aplica a la sesion actual.
- **Roster 19 / `default_agent: free-build` no aplican a la sesion en curso** hasta reiniciar; un prompt no actualizado podria seguir citando un agente PRO retirado.
- **`REFERENCIA-RUTEO.md` untracked:** riesgo de perdida en un checkout limpio; versionarlo.
- **URLs de thumbnail 800px/1200px rotas (BUG-CONFIG-3 / BUG-087)** embebidas en HTML/JS: BUG-022 solo cubre el pipeline NUEVO de fichas, no el HTML/JS historico.
- **Convencion de `description` parcial:** `.agents/skills/brainstorming/SKILL.md` (fuera de `.opencode/`) y `.opencode/skills/batch-create/SKILL.md` (nombre de modelo) aun la incumplen.

### Pantallas de entrada: welcome overlay + registro dark dorado + referido `ref_info` - relevo 2026-09-24

Adaptacion de `prompt mensaje.txt` (Pantalla 1: bienvenida `/welcome`; Pantalla 2: registro/referido `/welcome-referred`) implementada en el working tree SIN commitear (2026-09-24). NO es ADR (decisiones de producto -> DECISIONS.md "Nota de producto / decision", 2026-09-24). Tarea: **TASKS.md TSK-156 (IMPLEMENTADO EN WORKING TREE / QA APTO CON OBSERVACIONES)**. NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). Sin migraciones. El release TSK-155/ADR-058 ya esta commiteado y en `origin/main` (ver "Nota de estado del repo" al final); este lote se monta encima en el working tree.

**Que se estaba haciendo (resumen; anclas: TASKS.md TSK-156 y DECISIONS.md nota de producto 2026-09-24):**
- **`api/usuarios.js` v23 (bump real v22->v23; header L16-18):** rama GET publica `?tipo=ref_info&ref=<codigo>` (~L666-680): devuelve `{ok:true, anfitrion_nombre}` (solo `usuarios.nombre` via `codigo_referido`; `trim` + `slice(0,80)`) o `{ok:false, error:'REFERIDO_INVALIDO'}` (HTTP 200 suave, SIN JWT). No expone email/avatar/XP/ids internos.
- **`api/interacciones.js` (SOLO anotacion-comentario L6627-6631, diff +6):** las opciones del prompt alternativo (10% OFF hospedaje/tour, doble XP primer mes, insignia "Pionero Explorador") quedan como propuesta opcional FUTURA y NO se aplican; se mantiene el catalogo REAL existente (`bienvenida_x2_24h`/`bienvenida_ascenso`/`bienvenida_fundador`) que alimenta `GET tipo=bonus_referido`.
- **`registro.html` REDISEÑADO (~458 lineas; antes ~271):** silo `.reg-silo` dark dorado (tipografia real Outfit/Barlow; **queda un `<link>` a Geist SIN USAR en `registro.html:12`**, carga de fuente muerta -- ver Riesgos activos), badge "Guia interactiva de turismo", banner de invitacion que consume `ref_info` mostrando el NOMBRE del anfitrion (nunca el codigo), selector `fieldset#reg-bonos` con radio-cards desde `GET tipo=bonus_referido` (etiquetas REALES del catalogo), CTA "CREAR MI CUENTA Y RECLAMAR PREMIO", reclamo post-alta `POST tipo=reclamar_bonus_referido` (solo si `perfil.bonus_referido===true` y premio elegido), aviso REFERIDO_INVALIDO con boton "Continuar sin invitacion" (`#reg-skip-ref`), conserva `loginConEmail`, redireccion index/mi-perfil y `?nombre=` personaliza el h1.
- **`index.html` (+110 lineas):** overlay de bienvenida (Pantalla 1) con CSS scoped `.wl-*` y JS IIFE en `DOMContentLoaded` (L4164); flag localStorage `ec_welcome_visto` (L4092; 1 sola vez); CTA "EXPLORAR LA WEB" (cierra + scroll a contenido) y enlace "Entrar" (modo demo sin sesion, solo cierra); `window.ExploraCO.abrirBienvenida` (L4095) expuesto para re-abrir; z-index 10000 (L897). Jerarquia verificada: welcome 10000 < expEra 10001 < bono-ref 10002 y por encima del login 9999.
- **QA / Escudo GOLD (2026-09-24):** sintaxis 4/4 PASS; ASCII 0 en `api/*.js` y bloques JS nuevos (deuda preexistente de bytes>127 en texto UI visible de `registro.html` y motor viejo de `index.html`, NO de este lote); divs `registro.html` 5/5 e `index.html` 390/390; contratos frontend<->backend coinciden; smokes `smoke_regalias_bono.js` **63/63**, `smoke_016_multinivel_crowdsourcing.js` **52/52** y gate `scripts/smoke_ref_info.js` **26/26** (re-ejecutado en este pase; reemplaza al "mini-smoke 6/6" de la corrida previa). **Veredicto: APTO CON OBSERVACIONES.**
- **Hallazgos ADR-006 (verificados y corregidos en este pase de docs):** headers reales verificados (`api/usuarios.js` v23 L16-18; rama `ref_info` L666-680). **`scripts/smoke_ref_info.js` EXISTE en el working tree** (untracked, 10.894 bytes, creado 2026-09-24 9:24:35): gate del contrato `ref_info` con **26 verificaciones** (ref valido + trim y 1 sola consulta publica sin checks de sesion, alias `?codigo=` con trim en el binding, slice(0,80), REFERIDO_INVALIDO en 4 casos, regresiones 400 de GET sin tipo/tipo desconocido, estaticos 7a-7h con ASCII-safety del propio smoke) que corren **26/26 PASS** sin BD ni red (`node scripts/smoke_ref_info.js`, re-ejecutado en este pase). **`package.json` (M, 2026-09-24 9:25:13) YA lo encadena** como PRIMER smoke del script `test`. El 'mini-smoke 6/6' reportado por QA era una ejecucion previa/parcial; el gate final cubre el contrato completo. Ambos archivos quedan SIN commitear (untracked + M) -> incluirlos en el commit del lote.
- **Nota de estado del repo (ADR-006):** `git status` muestra 4 archivos modificados (los del lote) + `.opencode/agent/*.md` (M) y `opencode.json` (untracked) que son config de opencode, NO parte del lote ni del proyecto web. El release TSK-155/ADR-058 (Origen) YA esta commiteado en `e5a59f8` + `27784f8` = `origin/main` (2026-09-24) -> el texto "IMPLEMENTADO EN WORKING TREE / commit PENDIENTE" de la sesion TSK-155 (debajo) y de TASKS.md TSK-155 quedo desactualizado (drift documental, ADR-006); lo vigente es QA runtime post-deploy + FASE 2 diferida. Queda registrado aqui y en el mega-bullet "Que sigue" (arriba).
- **Deuda etiquetada (NO es bug nuevo):** `POST tipo=reclamar_bonus_referido` (preexistente) NO exige `validarSesion` y deriva el dueno de `body.usuario_id` (IDOR preexistente, codigo 036); esta entrega no lo introduce (el reclamo UI ocurre tras login, pero el endpoint queda como estaba); escalado como nota para la futura sesion `sql-security`. NO se registra en BUGS_HISTORICOS.md como bug nuevo.

#### Refinamiento 2026-09-24 (modo express) sobre TSK-156

Ajuste de UI/JS ejecutado encima del lote base, verificado contra archivo real (ADR-006). **NO crea TSK nuevo** (amplia el alcance real de TSK-156). Sin `api/*.js` tocado (**8/8 INTACTO**), sin migraciones.
- **`index.html`:** `.wl-tip-desc` acortadas; **UN SOLO BOTON** — `#wl-cta` ahora "ENTRAR" (`cerrar(true)` = cierra + scroll a `#recs`), se ELIMINO `#wl-entrar`; NUEVO enlace `.wl-registro#wl-registro` → `/registro.html` (texto "Crea tu cuenta gratis con tu nombre y correo para comenzar"; handler `marcarVisto()`); CSS `.wl-entrar` renombrado a `.wl-registro` (+ `:focus-visible`). Residuos `wl-entrar`=0.
- **`registro.html`:** dos bloques `.reg-sub` + NUEVO `.reg-sub2` (gamificacion); tag de invitacion mas sutil e inline (`reg-chip` + `.reg-chip-txt` "Invitación de" + `.reg-chip-code` = nombre del anfitrion) — se quito el SVG (`.reg-chip-ico`) y `.reg-chip-desc` (residuos = 0); NUEVA linea `.reg-bonos-intro` dentro de `fieldset#reg-bonos`; el fieldset sigue visible SOLO con `?ref=` valido.
- **`usuario-session.js` (NUEVO archivo en el lote del refinamiento):** `reclamarXpDemo()` (L958-969) llamada dentro de `loginConEmail` tras `sincronizarGuardados()` (L885); limpia `localStorage.user_points` si `xp>0` y muestra toast "Tus puntos de exploración se sumaron a tu cuenta"; el XP real entra por el replay de guardados de `sincronizarGuardados()`; cubre AMBOS flujos (registro.html + modal navbar "Mi cuenta"). Delta ASCII 0 (23 lineas agregadas: 0 bytes>127 / 0 backticks).
- **QA (ADR-006):** `node --check` 4/4; divs `index.html` 390/390 y `registro.html` 4/4; contratos JS<->DOM intactos; `reclamarXpDemo` def 1 / call 1; smokes `smoke_directorio_session.js` 14/14 + `smoke_ref_info.js` 26/26. **Veredicto: APTO CON OBSERVACIONES** (observaciones: CTA scroll vs enlace a registro = UX acordada; sin smoke de `reclamarXpDemo`/overlay; tildes en HTML visible permitidas).
- **Deuda `[DEUDA-EXPRESS]`:** (1) sin smoke que cubra `reclamarXpDemo()`/overlay; (2) `<link>` a Geist SIN USAR en `registro.html:12`; (3) cache-bust de `usuario-session.js` (BUG-073) si aplica al deploy. Ancla: TASKS.md TSK-156 > "Refinamiento 2026-09-24"; decision de producto en DECISIONS.md "Nota de producto... puente de XP demo -> cuenta".
- **Estado del repo (ADR-006):** el lote BASE de TSK-156 quedo COMMITEADO en `5181564` ("mensajes", = `origin/main`), asi que el pendiente historico "commitear el smoke_ref_info.js" YA no aplica. El refinamiento son 3 archivos M (`index.html`, `registro.html`, `usuario-session.js`) SIN commitear.

#### Que sigue

1. **[HECHO — lote BASE YA COMMITEADO] `scripts/smoke_ref_info.js`** (26/26 PASS, ya encadenado como PRIMER smoke de `npm test`) quedo incluido junto con `api/usuarios.js`, `api/interacciones.js`, `registro.html`, `index.html` y `package.json` en el commit **`5181564`** ("mensajes", = `origin/main`, 2026-09-24). ADR-006: verificado con `git status` / `git show --stat 5181564`; el pendiente historico "falta commitear el gate" quedo RESUELTO.
2. **Commit + push del REFINAMIENTO 2026-09-24 (modo express, TSK-156):** `git add index.html registro.html usuario-session.js` + commit + push (Vercel despliega al push; sin migraciones). **`usuario-session.js` es NUEVO en este lote de refinamiento** (no estaba en `5181564`): evaluar cache-bust (BUG-073) SI aplica al deploy; no desplegar los 3 por separado.
3. **[QA runtime post-deploy]** con sesion real y codigo de referido real: el overlay aparece 1 sola vez (`ec_welcome_visto`) y no compite con el banner de bono-referido (z-index 10000 < 10002); el CTA muestra un UNICO boton **"ENTRAR"** que cierra + hace scroll a `#recs`; el enlace "Crea tu cuenta gratis con tu nombre y correo para comenzar" navega a `/registro.html`; el banner del registro muestra el NOMBRE del anfitrion; el reclamo post-alta acredita el premio elegido del catalogo; un codigo invalido muestra REFERIDO_INVALIDO y "Continuar sin invitacion" permite seguir; **al crear/entrar la cuenta se limpia `localStorage.user_points` (XP demo) y sale el toast "Tus puntos de exploración se sumaron a tu cuenta"**.
4. **[REGRESION TSK-155]** re-ejecutar `npm run smoke:origen` (111/111) con el backend v29/v30 ya desplegado (el release TSK-155 ya esta en `origin/main`).

#### Riesgos activos

- **[RESUELTO, ADR-006] TSK-156 lote BASE ya commiteado:** `scripts/smoke_ref_info.js` (26/26 PASS) + `package.json` + `api/usuarios.js` + `api/interacciones.js` + `registro.html` + `index.html` quedaron en el commit **`5181564`** (= `origin/main`); el riesgo historico "el commit OLVIDA el gate" YA no aplica. **REFINAMIENTO 2026-09-24 SIN commitear:** `index.html`, `registro.html` y `usuario-session.js` (M) en working tree; el riesgo real es un deploy PARCIAL que tome el overlay/registro nuevos sin `usuario-session.js` (o viceversa) -> commitear los 3 juntos antes de la QA runtime.
- **[DEUDA-EXPRESS] cobertura del refinamiento:** ningun smoke ejercita `reclamarXpDemo()` ni el overlay; `<link>` a Geist sin usar en `registro.html:12`; cache-bust de `usuario-session.js` (BUG-073) si aplica.
- **[DEUDA seguridad, NO bug nuevo] IDOR preexistente en `POST reclamar_bonus_referido`:** operacion preexistente que NO exige `validarSesion` y deriva el dueno desde `body.usuario_id` (codigo 036); esta entrega no lo introduce; queda escalada como nota para la futura sesion `sql-security`.
- **bytes>127 preexistentes:** texto UI visible de `registro.html` y motor viejo de `index.html` (heredados, no de este lote; se mantiene ASCII 0 en codigo NUEVO).
- **z-index resuelto (verificado):** welcome 10000 < expEra 10001 < bono-ref 10002 y sobre login 9999.
- **[DEUDA limpieza, corregida en este pase] `<link>` a Geist SIN USAR en `registro.html`:** el `<link>` de `family=Geist` SIGUE presente en `registro.html:12` (grep = 1 coincidencia) y ya NO se usa (el CSS `.reg-silo` declara `'Outfit'`/`'Barlow Condensed'`; el viejo `font-family:'Geist'` de `.reg-chip-code` se reemplazo por Barlow Condensed). Es una carga de fuente muerta -> eliminar el `<link>` en una proxima sesion. La afirmacion previa "Geist DESCARTADO (grep 0, no existe tal `<link>`/import)" era INCORRECTA (ADR-006: baseline = archivo real).
- **Drift documental TSK-155 (ADR-006):** la sesion de Origen (debajo) y TASKS.md TSK-155 dicen "commit/deploy PENDIENTE" pero el release ya esta en `origin/main` (`e5a59f8`/`27784f8`); no re-committear; solo QA runtime.

### Multiplicador de Origen por lejania (Local / Nomada / Extranjero) - relevo 2026-09-24

Entrega "Multiplicador de Origen por lejania": el XP por acciones fisicas crece con la **distancia REAL (haversine)** del usuario al punto geografico de la accion, con curva escalonada por tier de origen. Decision: **ADR-058** en DECISIONS.md (Estado IMPLEMENTADO EN WORKING TREE / AUDITADO APTO PARA DEPLOY; spec/migracion/codigo ALINEADOS). Tarea: **TASKS.md TSK-155 (IMPLEMENTADO / AUDITADO APTO PARA DEPLOY)**. NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). Migracion NUEVA **038** (aditiva/idempotente/ASCII-safe) + seed geo, **APLICADA en Neon el 2026-09-24; seed cargado (1.122 ciudades / 245 paises)**.

**Que se estaba haciendo (resumen; ancla ADR-006 en DECISIONS.md ADR-058 y TASKS.md TSK-155):**
- **Migracion 038 (APLICADA en Neon el 2026-09-24):** `db/migrations/038_origen_lejania.sql` (NUEVA, aditiva/idempotente ADR-008/ASCII-safe ADR-002, 391 lineas, PREFLIGHT read-only ADR-006 documentado en la cabecera): tablas **`geo_ciudades`** (columnas EXACTAS del seed real; **1.122 filas DIVIPOLA: 1.103 Municipio + 18 Area no municipalizada + 1 Isla**; PK `cod_mpio`; `es_capital` derivada para desempatar homonimos; indice por nombre normalizado) y **`geo_paises`** (centroides ISO-3166-1 alfa-2; **245 filas**); `usuarios.origen_declarado_en` + backfill UNICO (no sobrescribe no nulos); `xp_ledger.mult_origen numeric(10,6) NOT NULL DEFAULT 1` + `xp_ledger.origen_tier text NULL` con CHECK idempotente; 7 claves en `gamificacion_config` (`factor_origen_local=1.0`, `factor_origen_nomada_max=1.2`, `factor_origen_extranjero_max=1.4`, `origen_km_local=25`, `origen_km_nomada=1000`, `origen_km_extranjero=3000`, `origen_min_dias_cuenta=7`) con `ON CONFLICT DO NOTHING`. **El seed geo NO va en la migracion** (se carga aparte).
- **Seed geo cargado:** `scripts/seed_geo.js` (NUEVO) + `db/seeds/` (NUEVA carpeta: `geo_ciudades_raw.csv` DANE DIVIPOLA 2025 + xlsx de referencia, `geo_ciudades_seed.json` 1.122 filas, `geo_paises_seed.json`/`geo_paises_raw.csv` 245 filas, `README_GEO.md`). Cargado en Neon el 2026-09-24.
- **Curva (canonica en JS `calcularFactorOrigen`, ADR-058 N-5):** Local x1.00; Nomada `1.00 + 0.20*min(km/origen_km_nomada(1000), 1)` top **1.20**; Extranjero `1.20 + 0.20*min(km/origen_km_extranjero(3000), 1)` top **1.40**; sin tier/punto resoluble -> **1.00** (nunca castiga al Local).
- **Motor de XP (v29):** `mult_origen` como **HERMANO de `stack_temp`** dentro de `calcularXpFinal` (ambos acotados por `cap_global`): `xp_final = base * min( min(M_nivel * mult_clase * factor_casa, cap_progresion) * mult_origen * stack_temp, cap_global )`. Resolucion SERVER-SIDE una vez por request (`resolverOrigenUsuario`) via `geo_ciudades`/`geo_paises` con `normGeo` + espejo SQL `sqlNormGeo`. Ledger persiste `mult_origen`/`origen_tier`/`contexto.origen`.
- **Arbol de Clases unificado (v30, ADR-058 8.3 / M-2):** **ELIMINA `BONO_ORIGEN` x1.2** del ADR-028/WP-5; cada fila del Arbol evalua su punto con el espejo **`sqlFactorFila`** (PER-ROW, coords propias o texto ciudad via lookup). **Nerf M-4:** usuarios sin `ciudad_base`/punto pasan de x1.2 a **1.00** (aceptado).
- **Anti-teleport (`api/usuarios.js` v22):** cambiar `ciudad_base`/`pais_base` (comparacion normalizada con trim; no-op no toca) fija `origen_declarado_en=NOW()` en el MISMO UPDATE. Elegibilidad: Nomada `>= 7 dias`; Extranjero `email_verified` + cuenta `>= 7 dias` + `origen_declarado_en >= 7 dias`. Perfil expone objeto aditivo `origen` (owner-aware y publico).
- **Admin (`api/admin.js` v6 + `admin.html`):** `?recurso=salud_red` agrega 4 bloques ADITIVOS (degradan 42703 si la 038 no corrio): `distribucion_origen`, `mult_origen_stats` (+ top outliers), `config_origen` y `alertas_origen` (concentracion de XP bonificado + cuentas extranjeras nuevas con factor alto -> revision manual).
- **Frontend:** `index.html`/`usuario-session.js` (badge origen en sesion), `mi-perfil.html` (seccion "Tu origen").
- **Smokes:** `scripts/smoke_058_origen_clasificador.js` = **90/90** (sin BD; ENCADENADO a `npm test`; script `smoke:origen:sinbd`) -- **RE-EJECUTADO en este pase de docs (90/90 PASS)**: clasificacion de tiers, curva canonica, wiring, migracion, ASCII. `scripts/smoke_origen_factor_parity.js` = **111/111** contra Neon REAL (gate manual `npm run smoke:origen`; verificado por el operador a la aplicacion de la 038; NO re-ejecutable sin credenciales). `npm test` VERDE (14 smokes).
- **Hallazgos ADR-006:** headers de version REALES verificados: `api/interacciones.js` v29/v30 (L1-18), `api/usuarios.js` v22 (L8-15), `api/admin.js` v6 (L42-48); la migracion 038 y los smokes existen en el working tree (untracked); `git status` = todo el release SIN commitear. Al no tener `DATABASE_URL` no se verifica en vivo el conteo 1.122/245 ni el parity 111/111 (datos reportados por el operador).

#### Que sigue

1. **[HECHO] Migracion 038 APLICADA en Neon el 2026-09-24** + seed geo cargado (1.122 ciudades / 245 paises). **Queda pendiente el deploy del backend (v29/v30 + v22 + v6) y del frontend** (`index.html`/`usuario-session.js`/`mi-perfil.html`/`admin.html`; sin cache-bust, `vercel.json` sirve todo `/(.*)\.js` con `no-store`). Orden: **038+seed (HECHO) -> backend -> frontend** (patron BUG-021/BUG-060).
2. **Commit + push del release completo ADR-058 / TSK-155** (Vercel despliega al push).
3. **[DIFERIDO] Fase 2:** verificacion documental de nacionalidad (alternativa 2 del ADR-058) + auto-update del seed DIVIPOLA.
4. **[REGRESION post-deploy] Re-ejecutar `npm run smoke:origen` (111/111)** contra Neon con el backend v29/v30 desplegado.

#### Riesgos activos

- **Migracion 038 + seed APLICADOS (resuelto):** aplicados en Neon el 2026-09-24; el factor queda en 1.00 hasta el deploy del backend (sin ventana de 503; las columnas nuevas ya existen).
- **Nerf M-4 (aceptado):** al desplegar v29/v30, los usuarios sin `ciudad_base`/punto pasan de x1.2 a 1.00 (cambio de comportamiento visible en el desglose de XP; aprobado por el operador).
- **Origen auto-declarado:** mitigado con `email_verified` + antiguedad + anti-teleport + monitoreo `alertas_origen`; la verificacion documental queda como deuda (sin fecha).
- **Homonimos de municipios:** desempate por `es_capital DESC, cod_mpio ASC` en el lookup (geo_ciudades); sin riesgo funcional conocido.
- **Duplicidad JS/SQL de la curva:** red de seguridad = `smoke_origen_factor_parity.js` (111/111); si se toca la curva, correr el gate ANTES del deploy.
- **BUG-061 sigue ABIERTO** (ajeno); el drift ADR-053 20->40 niveles sigue como deuda de arrastre.

### Consumibles con gate por era (banda exclusiva de compra) - relevo 2026-09-23

Entrega "Consumibles con gate por era": la tienda de consumibles pasa de catalogo plano a **tienda por era** (banda exclusiva de compra). Decision: **ADR-056** en DECISIONS.md (Estado IMPLEMENTADO Y MIGRACION 035 APLICADA EN NEON; la spec, la migracion y los comentarios del codigo ya citan **ADR-056**, alineados). Tarea: **TASKS.md TSK-152 (APLICADO / VERIFICADO)**. NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). Migracion NUEVA **035**, **APLICADA en Neon el 2026-09-23** (5 sentencias OK; verificacion: 32 filas).

**Que se estaba haciendo (resumen; ancla ADR-006 en DECISIONS.md ADR-056 y TASKS.md TSK-152):**
- **Migracion 035 (APLICADA en Neon el 2026-09-23 con `node scripts/apply_sql_file.js db/migrations/035_consumibles_era.sql`; 5 sentencias OK, "todas OK"):** `db/migrations/035_consumibles_era.sql` (NUEVA, aditiva/idempotente ADR-008/ASCII-safe ADR-002): `consumibles.era_exclusiva varchar(20) NULL` (`ADD COLUMN IF NOT EXISTS`; `NULL` = tienda base; sin CHECK por ADR-028 ni indice); backfill idempotente de 9 premium (Cronista 3: `pluma_inspirada`/`trompeta_fama`/`perfil_vitrina_destacada`; Leyenda 4: `perfil_marco_dorado`/`perfil_titulo_custom`/`sala_efimera`/`perfil_banda_artista`; Mito 2: `perfil_fondo_paisaje`/`pase_vip`); semilla de 15 consumibles nuevos (3 por era) que reutilizan tipos de efecto existentes (catalogo resultante en el estado real de Neon: **32** = 17 previos + 15 nuevos; la 034 NO esta aplicada, por eso sus 3 `prod_*` no existen; 35 si la 034 se aplica).
- **Backend `api/interacciones.js`:** helper unico `calcularEraVisibleLocal(xpTotal, nivelMax)` = `calcularEraLocal(max(nivel(xp_total), nivel_max))` (espejo documentado de `conNivel`, ADR-053); `GET ?tipo=consumibles` suma `era_exclusiva` y devuelve `bloqueado` con `usuario_id` (degradacion sin la columna -> `null`); `POST ?tipo=comprar_consumible` -> `403 ERA_INSUFICIENTE` si `era_exclusiva` no coincide (chequeo antes del anti-farming y del UPDATE); `GET ?tipo=inventario` corregido para calcular la era sobre el nivel ganado (el uso NUNCA se gatea).
- **Admin `api/admin.js` (`?recurso=consumibles`):** lista/crear/editar aceptan `era_exclusiva`; normalizador `normalizarEraConsumible` ('' / null / 'ninguna' -> null; case-insensitive contra las 5 eras; invalido -> null). **UI:** `admin.html` `<select>` de era (Sin gate + Caminante/Explorador/Cronista/Leyenda/Mito); `mi-perfil.html` card con candado y "Disponible en era <era>"; el boton Usar sigue siempre activo.
- **Semantica:** compra EXCLUSIVA por banda (`era_visible === era_exclusiva`); los items de eras PASADAS no se pueden recomprar (solo usar los ya adquiridos); NO hay gate de uso.
- **Smoke:** `scripts/smoke_test_consumibles_era.js` existe (harness `vm` + fake neon, sin red ni BD) y pasa **55/55** (`node scripts/smoke_test_consumibles_era.js`): helper `calcularEraVisibleLocal`, `GET consumibles` con `era_usuario`/`bloqueado`, `403 ERA_INSUFICIENTE`, `409` por XP sin gate, uso `200` sin gate de era, checks de la migracion 035 (columna/15 claves/backfill/idempotencia/ASCII) y wiring en `api/interacciones.js`/`admin.html`/`mi-perfil.html`. **AHORA SI esta encadenado a `npm test`** (script `smoke:consumibles`; la suite `npm test` corre VERDE, 0 FAIL en toda la suite). Deuda CERRADA.
- **Hallazgos ADR-006:** los headers de version de `api/interacciones.js` (v28) y `api/admin.js` (v5) no fueron bumpeados por esta entrega; la numeracion ya esta ALINEADA: la spec/migracion/codigo citan **ADR-056** (el ADR real).

#### Que sigue

1. **[HECHO] Migracion 035 APLICADA en Neon el 2026-09-23** (`node scripts/apply_sql_file.js db/migrations/035_consumibles_era.sql`, 5 sentencias OK; verificacion: 32 filas; NULL=8, Caminante=3, Explorador=3, Cronista=6, Leyenda=7, Mito=5). **Queda pendiente el deploy del backend (gate + admin) y del frontend** (`admin.html`/`mi-perfil.html`; sin cache-bust, `vercel.json` sirve todo `/(.*)\.js` con `no-store`).
2. **[HECHO] Smoke encadenado:** `scripts/smoke_test_consumibles_era.js` pasa **55/55** y AHORA SI esta en el script `test` de `package.json` (script `smoke:consumibles`); la suite `npm test` corre VERDE (0 FAIL). Deuda ADR-006 CERRADA.
3. **[HECHO] Numeracion alineada (ADR-006):** la spec, la migracion 035 y los comentarios del codigo fueron RENOMBRADOS a **ADR-056** (el ADR real).

#### Riesgos activos

- **Migracion 035 APLICADA (resuelto):** aplicada en Neon el 2026-09-23 (32 filas verificadas); el gate queda activo en cuanto se despliegue el backend. Ya NO bloquea.
- **Items de eras pasadas no recompranables:** comportamiento de producto aceptado (banda exclusiva); un usuario que no compro en su momento queda sin acceso de compra.
- **Smoke encadenado (ADR-006):** `scripts/smoke_test_consumibles_era.js` pasa 55/55 y esta encadenado a `npm test` (script `smoke:consumibles`); el gate queda cubierto por la suite (VERDE). Resuelto.
- **Numeracion ADR-056 (resuelto):** los artefactos (spec, migracion 035 y comentarios) ya citan **ADR-056**; sin riesgo de trazabilidad.
- **BUG-061 sigue ABIERTO** (ajeno).

### Mercado de Emprendedores (3 mercados por Casa) - relevo 2026-09-23

Entrega "Mercado de Emprendedores": 3 mercados INDEPENDIENTES (uno por Casa) con normas propias, habilidad global "Emprendedor" sobre `usuarios.mercado_puntos` (METRICA DE PROGRESO, NO moneda; no viola ADR-018), compra atomica por CTEs y produccion de consumibles. Decision: **ADR-055** en DECISIONS.md (Estado IMPLEMENTADO EN WORKING TREE). Bug: **BUGS_HISTORICOS.md BUG-083** (cabecera de la 034 inconsistente con su cuerpo; CERRADO). Tarea: **TASKS.md TSK-151 (IMPLEMENTADO EN WORKING TREE)**. NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). Migracion NUEVA **034**, **PENDIENTE de aplicar en Neon** (la 027 ya fue aplicada por el operador el 2026-09-23).

**Que se estaba haciendo (resumen; ancla ADR-006 en DECISIONS.md ADR-055, BUGS_HISTORICOS.md BUG-083 y TASKS.md TSK-151):**
- **Migracion 034 (PENDIENTE de aplicar en Neon):** `db/migrations/034_mercado_emprendedores.sql` (NUEVA, aditiva/idempotente ADR-008/ASCII-safe ADR-002, 360 lineas): `usuarios.mercado_puntos numeric(12,2) NOT NULL DEFAULT 0`; `mercado_config` (PK `casa` + semilla condor 2%/25%, jaguar 5%/10%, delfin 0%/5%); `mercado_ofertas` (aisladas por `casa`); `mercado_ventas` (ledger append-only); **seccion 4-bis** (auto-provision idempotente de `precio_xp_base`/`precio_xp_actual`/`tipo_canje`; NO-OP si la 027 ya corrio); semilla de producibles (`prod_artesania`/`prod_cafe`/`prod_souvenir`).
- **Backend `api/interacciones.js` v28:** GET `mercado_config|mercado_ofertas|mercado_mi`; POST `mercado_publicar|mercado_comprar|mercado_cancelar|mercado_producir`. `MERCADO_NODOS` (5 nodos, tiers `[0,100,250,450,700]`), **gate doble de nivel APLICADO** (`nodoMercadoPorNivel`/`calcularMercadoEfectivo`: nodo efectivo = `min(puntos, nivel)`; `mercado_mi` owner-only con sesion firmada que expone `nodo_por_puntos`/`nodo_por_nivel`), impuesto efectivo `max(0, base - reduccion)` (piso 0 -> Delfin 0%), compra atomica en UNA sentencia con CTEs (sin `FOR UPDATE`) y `23514`->409. Anti-farming 20/24h, autocompra y cross-Casa prohibidos. Sesion firmada; 503 `SCHEMA_NOT_MIGRATED` sin la 034.
- **Backend `api/usuarios.js` v21:** el perfil expone `mercado_puntos`/`mercado_nodo` (aditivo), con espejo `calcularMercadoLocal(puntos, nivelJugador)`/`MERCADO_NIVELES = [2,5,10,20,30]` que aplica el MISMO gate doble en `conNivel` y en el perfil publico. **`api/admin.js` v5:** `?recurso=mercado` (config lista/editar + ofertas lista/moderar; moderar SOLO cancela).
- **Frontend:** `mercado.js` NUEVO (`window.Mercado` v1.0.0), tab Mercado en `comunidad.html`, card Emprendedor en `mi-perfil.html`, pantalla Mercado en `admin.html`.
- **Reconciliacion (ADR-055 decision 9):** `MERCADO_NODOS` es un catalogo SEPARADO de `RAMAS`; la regla dura L916-921 (los nodos de ramas no conceden capacidades ni multiplicadores de XP) NO aplica; los efectos estan acotados a la economia del mercado (slots, reduccion de impuesto, produccion), sin multiplicadores de XP ni privilegios globales.
- **Verificacion:** `npm test` **VERDE (exit 0)**; `scripts/smoke_mercado.js` **38/38 PASS** (encadenado a `npm test`; script npm `smoke:mercado`; incluye checks del nodo efectivo y de `mercado_mi` sin sesion -> 401). Escudo GOLD: `node --check` OK; ASCII 0/0; divs 0 (comunidad 323/323, mi-perfil 421/421, admin 915/915).

#### Que sigue

1. **[PENDIENTE OPERATIVO BLOQUEANTE] Aplicar la 034 en Neon** (archivo COMPLETO en una corrida; preflight read-only de la cabecera). **Orden: 034 -> deploy backend (v28/v21/v5) -> frontend** (sin cache-bust, `vercel.json` sirve todo `/(.*)\.js` con `no-store`).
2. **Validar `mercado_mi` con sesion real en Neon** (el smoke usa mock: NO valida Neon).
3. **Contrato de oferta/demanda con datos reales** (la formula `clamp(1 + (ventas_24h - ofertas_activas)*0.02, 0.5, 3.0)` del `precio_referencia` no se ha probado contra datos reales).
4. **Gate doble de nivel (YA aplicado):** el tope por `nivel_jugador` (nodos 2-5) SI se aplica: el nodo efectivo es `min(nodo por puntos, nodo por nivel)` via `nodoMercadoPorNivel`/`calcularMercadoEfectivo` (`api/interacciones.js` v28) y su espejo `calcularMercadoLocal` (`api/usuarios.js` v21). Lo que queda es validacion contra Neon (no de codigo): confirmar con datos reales que `mercado_mi`/`mercado_publicar`/`mercado_comprar`/`mercado_producir` respetan el nodo efectivo.
5. **Deuda `[DEUDA-EXPRESS]`:** (a) ADR/registro = este pase; (b) validar `mercado_mi` (y demas ramas del mercado) con sesion real en Neon; (c) contrato de oferta/demanda con datos reales. Ademas: `mercado_puntos` sin ledger por evento; BUG-061 sigue ABIERTO (ajeno).

#### Riesgos activos

- **Migracion 034 sin aplicar (BLOQUEANTE):** sin ella las ramas responden 503 `SCHEMA_NOT_MIGRATED`; el smoke usa mock y NO valida Neon.
- **Gate doble de nivel YA aplicado (sin riesgo de codigo):** el nodo efectivo = `min(puntos, nivel)` ya se aplica en el backend y en el espejo del perfil; la validacion pendiente es contra Neon (datos reales), no de codigo.
- **Aislamiento por DATOS, no RLS:** la 034 no crea policies; el aislamiento depende de la columna `casa` en las consultas del backend.
- **`mercado_puntos` sin ledger:** no auditable evento a evento (a diferencia de `xp_ledger`).
- **BUG-061 sigue ABIERTO** (ajeno); **BUG-083 CERRADO** en esta sesion.

### Pagina dinamica El Taller de las Moscas - relevo 2026-09-22 (cierre express)

Cierre documental EXPRESS (skill `express-mode`: un solo pase, docs-only, ruta FREE, sin tocar codigo) de la publicacion en **PRODUCCION** de la pagina dinamica "El Taller de las Moscas" (slug `taller-de-las-moscas`, categoria `sitio`/subcultura, Bogota/Chapinero). Tarea en `TASKS.md` **TSK-150 (COMPLETADA)**. NO nace ADR nuevo ni bug de ExploraCO (la observacion del QA sobre `validate_ficha.js` .json vs .md ya esta registrada como **BUG-034** y NO se duplica): `DECISIONS.md` y `BUGS_HISTORICOS.md` NO se tocaron. Verificado contra archivo real (ADR-006) y contra produccion el 2026-09-21/22.

**Que se estaba haciendo (resumen; ancla ADR-006 en TASKS.md TSK-150):**
- **Pagina publicada y verificada en produccion:** slug `taller-de-las-moscas` (categoria `sitio`, subcultura; ciudad Bogota, region Bogota D.C., barrio Chapinero Central), **id Neon `99938930-aa6d-48d9-b353-6f2016f8e7ea`**, `status=published` (confirmado via `/api/destinos?categoria=sitio`). https://exploraco.vercel.app/taller-de-las-moscas.html responde **HTTP 200 (~81KB)** y renderiza completa (hero, sobre, dificultad, entradas, tours, que llevar, itinerario, FAQ, mapa, resenas, relacionados, JSON-LD). Rating en **0** (ADR-009, sin resenas sembradas).
- **Ficha curada:** `ficha/taller de las moscas.json` (JSON valido, untracked; Cra. 19a #61b 81, Mie-Sab 2:00 PM - 8:00 PM, entrada libre, FAQ x5, tour autoguiado).
- **Fotos:** galeria en `destinos_fotos` verificada via `/api/interacciones?tipo=galeria_destino` (IDs 2201-2204+), fotos Wikimedia Commons (compliance BUG-022): HOGRE street art, Melaka Art Gallery, Taller Nacional de Grafica, ZineDisplay.
- **Scripts (3, untracked):** `scripts/seed-taller-de-las-moscas.js` (upsert Neon), `scripts/load-taller-de-las-moscas-api.js` (loader API DELETE+POST), `scripts/smoke_test_taller-de-las-moscas.js` (fake_neon + buildHTML).
- **Limpieza del huerfano:** `taller-delas-moscas-bogota-4qfn` ELIMINADO por el DELETE previo del loader; ya NO aparece en sitemap.xml (verificado 2026-09-22) ni en admin-destinos. **Causa raiz:** el slug no se persistia en el formulario admin + foto vacia rompia `buildHTML` -> 404.
- **Verificacion local (Escudo GOLD):** `node --check` 3/3 OK; ASCII-safety 0/0/0; smoke **14/14 PASS**; divs 248/248 diff=0.
- **Archivos nuevos (untracked):** `ficha/taller de las moscas.json`, `scripts/seed-taller-de-las-moscas.js`, `scripts/load-taller-de-las-moscas-api.js`, `scripts/smoke_test_taller-de-las-moscas.js`.

#### Que sigue

Nada bloqueante. Opcional / verificacion humana:
1. **[PENDIENTE OPCIONAL] QA visual en navegador** de https://exploraco.vercel.app/taller-de-las-moscas.html por un humano (hero, galeria, entradas, tours, itinerario, FAQ, mapa) -- la pagina ya quedo publicada y verificada por API/sitemap/smoke (HTTP 200, id Neon `99938930-...`, rating 0).
2. **[DEUDA-EXPRESS] Observacion menor del QA:** el seed (`scripts/seed-taller-de-las-moscas.js`) tiene **2 `catch` vacios** = deuda PREEXISTENTE del patron de seeds (~106 seeds); **NO tocar este triplete** para mantener paridad con los demas seeds y no romper el patron de `npm test`.
3. **Commit de los 4 archivos untracked** (`ficha/` + `scripts/`) junto al proximo pase de docs; no mezclarlos con commits de codigo.

#### Riesgos activos

- **No hay bloques activos:** publicacion verificada en produccion (HTTP 200 + sitemap + API destinos con `status=published`).
- **BUG-034 sigue ABIERTO** (drift de `scripts/validate_ficha.js` .json vs .md, preexistente; NO se duplica en este cierre).
- **Rating 0 por diseno:** la ficha muestra "0.0 (0 resenas)" hasta que lleguen resenas reales (ADR-009).

### Guardados en Mis Albumes (ADR-054) - relevo 2026-09-21

Release "Guardados de media en 'Mis Albumes'" (ADR-054): se ELIMINA el concepto de carpetas privadas de guardados (ADR-052) y los bookmarks de `media_guardados` se organizan en `albumes` propios, con PUBLICACION POR GUARDADO (visible solo en el detalle del album). Decisiones: **ADR-054 (APROBADO + revision de `@architect-review` con condiciones C1-C5)** en DECISIONS.md (Estado actualizado a IMPLEMENTADO Y DESPLEGADO). Bug registrado: **BUGS_HISTORICOS.md BUG-082** (fuga de privacidad ALTA). Tarea: **TASKS.md TSK-149 (IMPLEMENTADA Y DESPLEGADA; push `b4ad861`)**. NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). Migracion NUEVA **032**, **APLICADA en Neon el 2026-09-21**.

**Que se estaba haciendo (resumen; ancla ADR-006 en DECISIONS.md ADR-054, BUGS_HISTORICOS.md BUG-082 y TASKS.md TSK-149):**
- **Migracion 032 (APLICADA en Neon el 2026-09-21; idempotencia verificada por segunda corrida):** `db/migrations/032_guardados_album.sql` (17152 bytes, idempotente/ASCII-safe): `media_guardados.album_id uuid NULL REFERENCES albumes(id) ON DELETE SET NULL` + `visible boolean NOT NULL DEFAULT false` + CHECK `media_guardados_visible_album_chk (visible=false OR album_id IS NOT NULL)` + 2 indices; y **DROP** de `guardados_carpetas` y de `media_guardados.carpeta_id`. Verificacion post OK: FK `ON DELETE SET NULL`, CHECK, 2 indices, `COUNT(*) WHERE visible AND album_id IS NULL = 0`, y `guardados_carpetas`/`carpeta_id` eliminados. Idempotente (ADR-008); el DROP es irreversible (perdida aceptada de la organizacion previa).
- **Backend `api/interacciones.js` v26:** `mis_guardados_media` EXIGE sesion firmada, deriva el dueno del token (ignora `usuario_id` del query), devuelve `albumes[]` + `mi_album_id`/`mi_album_titulo`/`visible` por item y CONSERVA `data[]` (shape de `mymapa.js`) y el 503 `SCHEMA_NOT_MIGRATED` tipado; `POST ?tipo=guardados_carpeta` -> `accion=album|publicar` (crear/renombrar/eliminar/mover -> 410 `CARPETAS_DEPRECADAS`; album ajeno -> 404 `ALBUM_NO_ENCONTRADO`; bookmark ajeno -> 404 `GUARDADO_NO_ENCONTRADO`; desasignar fuerza `visible=false` en la MISMA sentencia); `album_detalle` agrega `guardados[]`/`albumes_guardados[]` con invariante de no-fuga; hardening **BUG-061** en `guardar_media`/`quitar_guardado_media`/`album_crear`.
- **Fix de privacidad (BUG-082, ALTA):** `api/pagina-destino.js` agrega `AND af.visible=true` (L2762) a la consulta de fotos de album por cercania; violaba ADR-039 D.1 (visibilidad por recurso).
- **Frontend:** `mi-perfil.html` (chips/select por album + toggle "Hacer publico" + `fetchConJwt`), `mymapa.js` (Bearer). Escudo GOLD HTML: divs 419/419.
- **Verificacion:** NUEVO `scripts/smoke_032_guardados_album.js` (**45 checks**, incluye C13 de no-regresion de BUG-082); poda de `scripts/smoke_029_030_coords_carpetas.js` (**42**); `scripts/smoke_036_media_unificada.js` J35 (**90**); `package.json` encadena los 3. **`npm test` 536 PASS / 0 FAIL (exit 0)**.
- **BUGS:** **BUG-082 NUEVO (CORREGIDO EN CODIGO)** en BUGS_HISTORICOS.md (fuga de privacidad ALTA; mismo release que ADR-054).

#### Que sigue

1. **[PENDIENTE OPERATIVO] QA runtime en produccion:** navegador con sesion real para validar el flujo de guardados en "Mis Albumes", el toggle "Hacer publico" y el fix BUG-082 (la migracion 032 y el release ya estan aplicados/desplegados en `b4ad861`). Sin cache-bust (`vercel.json` sirve todo `/(.*)\.js` con `no-store`).
2. **Perdida de la organizacion previa (consumada):** el DROP de `guardados_carpetas` es irreversible (rollback lossy); la salvaguarda de conteos pre-DROP se emitio solo por NOTICE y NO se capturo (no recuperable; ver deuda (f)).
3. **Deudas `[DEUDA]`:** (a) `api/utilidades.js` con 24 backticks + 3 dobles escapes (ADR-002), preexistente; (b) catch vacios preexistentes en `api/interacciones.js`/`api/pagina-destino.js`; (c) alias legacy `POST tipo='foto'` (raiz de BUG-061) sigue confiando en `usuario_id`; (d) `albumes.fotos_count` no suma guardados publicados (v1 solo detalle de album); (e) vocabulario "Carpeta" del Museo (ADR-039) sin unificar; **(f) [DEUDA] runner `scripts/apply_sql_file.js` no relaya eventos NOTICE:** usa el driver HTTP `@neondatabase/serverless` (`neon(url)`, L169/L177), que no emite NOTICE, por lo que los `RAISE NOTICE` de salvaguarda de la 032 (conteos pre-DROP) se emitieron pero no se capturaron; mejora sugerida: usar `Pool`/`Client` con `client.on('notice', ...)` para capturarlos.

#### Riesgos activos

- **Ventana de 503 del DROP: CERRADA.** La 032 se aplico en Neon y el release se pusheo (`b4ad861`), de modo que ya no hay backend viejo leyendo `guardados_carpetas`/`carpeta_id`.
- **DROP irreversible (consumado):** la 032 descarto la organizacion previa en carpetas (decision de producto aceptada; rollback lossy, ADR-054). La salvaguarda de conteos pre-DROP no se capturo (deuda (f) del runner).
- **BUG-082 (ALTA) DESPLEGADO:** `api/pagina-destino.js` ya filtra `af.visible=true` (L2762) en produccion; queda QA runtime.
- **Shape cambiado en `mis_guardados_media`:** reemplaza `carpetas[]` por `albumes[]`; clientes viejos deben leer el nuevo contrato (el `data[]` se conserva).

### Gamificacion v6 / ADR-053 - relevo 2026-09-21

Entrega "Gamificacion v6 / ADR-053" (implementacion COMPLETA y verificada): `M_nivel` lineal x1.0 (N1) a x3.0 (N20) con **doble cap SECUENCIAL 5.0/10.0**, 20 umbrales reescalados con **techo 42000**, ledger unico de XP (`xp_ledger`), config de caps sin deploy (`gamificacion_config`), insignia historica (`usuarios.nivel_max`) vs nivel derivado (economia), repricing de los 17 consumibles y rama admin `GET ?recurso=salud_red`. Decisiones: **ADR-053 (APROBADO) + ENMIENDA 1** en DECISIONS.md (Estado actualizado a **IMPLEMENTADO**). Tarea: **TASKS.md TSK-148 (COMPLETADA)**. Spec: `docs/superpowers/specs/2026-09-21-gamificacion-nivel-scaling-v6-design.md`. NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). Migracion **031 APLICADA en Neon (2026-09-21)**.

**Que se estaba haciendo (resumen; ancla ADR-006 en DECISIONS.md ADR-053, BUGS_HISTORICOS.md BUG-002/errata y TASKS.md TSK-148):**
- **Fase 1 (diseno):** `ADR-053` en DECISIONS.md con **Enmienda 1** (segunda opinion de `@architect-review`: APROBADO CON CAMBIOS). Corrige 4 hallazgos ALTO: el router real de `api/admin.js` es **`?recurso=`** (no `?tipo=`), los espejos de umbrales son **7+** (faltaba `admin.html:_jugNiveles`), los puntos de escritura de `xp_total` son **al menos 22** (no 19), y `media_compartidos.xp_ganado` guarda el XP FINAL (no la base). Congela la semantica de `mult_stack` = todo el stack EXCEPTO `M_nivel`.
- **Fase 2 (BD):** `db/migrations/031_gamificacion_v6_nivel_scaling.sql` (24495 bytes) COMMITEADA (`c875675`) y **APLICADA en Neon** (11 sentencias OK): `usuarios.nivel_max` + siembra unica con la tabla VIEJA (monotona con `GREATEST`: ningun usuario pierde insignia), `gamificacion_config` (`cap_progresion=5.0`, `cap_global=10.0`, `m_nivel_max=3.0`), `xp_ledger` (13 columnas, multiplicadores `numeric(10,6)`, CHECK `cap_aplicado IN ('ninguno','progresion','global','accion')`, 2 indices) y repricing ABSOLUTO de los 17 consumibles (impulso x2.0, resto x1.6) con guard `information_schema` para las columnas de la 027 (no aplicada).
- **Fase 3 (backend), COMMITEADA en `9efbfc7` (HEAD):** `api/interacciones.js` **v25** (`calcularXpFinal` reescrito con doble cap secuencial, `obtenerMultiplicadorNivel`/`leerConfigGamificacion`/`calcularXpAcreditado`/`armarXpDetalle`/`registrarXpLedger`/`esLiderDestino`/`completitudSpotAtributos`; catalogo unico `XP_BASES` con **19 claves**; **29 call-sites** de `registrarXpLedger` y **20** de `calcularXpAcreditado`; bases nuevas `resena_larga` 30, `foto_viajero` 20, `ao_checkin` 20, `ao_proponer` +30 (cap 3/dia), `plan_crear` +20 (cap 3/dia), `plan_unirse` +6 (cap 5/dia), `spot_atributos` +10, bono rural 25; misiones `mis_plan_creador` 25->10 y `mis_plan_unido` 15->10; rama `?tipo=spot_atributos`). `api/usuarios.js` **v19** (`NIVELES` con 20 umbrales techo 42000 + campo `mult`, `nivel_visible = GREATEST(nivel derivado, nivel_max)` + `nivel_max`, elecciones 800/500/500). `api/admin.js` **v4** (`GET ?recurso=salud_red` con por_dia/por_accion/caps/`distribucion_nivel {derivado, visible}`/exentos/`nivel_max_vs_derivado`/alertas; degradacion 42P01; espejo `NIVEL_DERIVADO_SQL`).
- **Fase 4 (frontend, working tree):** **8 espejos** de umbrales sincronizados (`api/usuarios.js` fuente, `api/interacciones.js`, `admin.html`, `usuario-session.js`, `index.html`, `comunidad.html`, `niveles-data.js`, `api/admin.js`) + los 20 titulos; **errata corregida** en la fuente (titulo 11 `Estrat\u00e9ga` -> **`Estratega Comunitario`**); toast con **desglose de XP** (`xp_detalle`) y **deduplicacion** (incluida la ficha dinamica via `usuario-session.js` y los conectores legacy); **barra de progreso** al siguiente nivel (`progresoNivel`); **UI de cupo/enfriamiento** (`mostrarEstadoCupo`); **pestana admin "Salud de la Red"** + leaderboard; textos de repricing en `mi-perfil.html`; `directorio-session.js` ya no duplica el toast de XP con sesion activa.
- **Verificacion:** `npm test` **VERDE (exit 0)**: `scripts/smoke_gamificacion_v6.js` **30** y `scripts/smoke_niveles_espejos.js` **10/10** nuevos + legacy 95/78/45/55/15/31. Nuevos scripts npm `test`/`smoke:gamificacion`/`smoke:espejos`. `api/pagina-destino.js` con **0 backticks / 0 doble escape / 0 no-ASCII** (cierra BUG-002). `scripts/smoke_test_epic_prompt.js` mantiene **4 FAIL preexistentes** (DQ-2), ajenos.
- **BUGS:** **BUG-002 CERRADO** (evidencia en BUGS_HISTORICOS.md) y cierre del **doble toast de XP** (`NEXT.md:246`). Se registra ademas la correccion de la errata `Estrat\u00e9ga` -> `Estratega` (con el arrastre de los 8 espejos) como nota, NO como bug de runtime.

#### Que sigue

1. **[PENDIENTE OPERATIVO] Deploy del FRONTEND (BLOQUEANTE):** commit/push + Vercel + cache-bust de los assets tocados (`usuario-session.js`, `niveles-data.js`, `index.html`, `comunidad.html`, `mi-perfil.html`, `admin.html`, `compartir.js`, `media-actions.js`, `pagina-connector.js`, `resenas-connector.js`, `directorio-session.js`). La migracion 031 ya esta en Neon y el backend v25/v19/v4 ya esta en `main` (`9efbfc7`).
2. **Resolver 027 y 028 (siguen SIN aplicar):** si se aplica la 027 DESPUES de la 031, re-sembrar `precio_xp_base` desde `precio_xp` (ADR-053 Decision 12 / R-2); la 028 (`destinos.zona`) es independiente pero su falta deja `zona` sin efecto.
3. **`destinos.creado_por` (deuda 1):** migracion futura para hacer enforceable el "nunca al creador" de `spot_atributos` (hoy dedup por `(usuario, destino)` contra `xp_ledger`).
4. **Contrato `estado_cupo` (deuda 2):** el backend aun no expone un campo unico de cupo/enfriamiento por accion; la UI informa solo 429/`tope_diario`. El helper `mostrarEstadoCupo` ya esta listo.
5. **Fichas estaticas legacy (deuda 3):** >100 HTML con parches inline de XP en `localStorage` (+25/+8 XP) que no llaman a la API; migrar al renderer dinamico.
6. **`smoke_test_epic_prompt.js` (deuda 4 / DQ-2):** 4 FAIL preexistentes (vocaciones 3->4 y filtro de `chat_salas`); actualizar expectativas.
7. **Calibracion (deuda 5-6 / R-6):** `gamificacion_config` no parametriza umbrales (recalibrar 42000 exige deploy); el techo 42000 no tiene datos (7 usuarios, max ~1630 XP). Revisar con poblacion.

#### Riesgos activos

- **Frontend sin desplegar (TSK-148):** los 8 espejos, el toast con desglose, la barra de progreso, la UI de cupo y el panel "Salud de la Red" viven solo en working tree; sin commit/push + cache-bust, produccion queda con umbrales viejos y sin panel.
- **Compatibilidad durante la transicion:** `M_nivel` degrada a los defaults en codigo si la 031 no estuviera aplicada (ya lo esta); el ledger se salta con `console.warn` sin romper la acreditacion (R-1 mitigado).
- **027/028 pendientes:** `precio_xp_base`/`consumibles_precio` (027) y `destinos.zona` (028) sin efecto; riesgo de orden si la 027 se aplica despues de la 031 (re-seed obligatorio).
- **Caps denominados en XP (R-12):** al subir `M_nivel`, los caps de `compartir` (50 XP/24h) y `chat` (10 XP/dia) se agotan con MENOS acciones; la UI debe explicar que el cupo es en XP.
- **Deuda de calibracion:** la curva 42000 no tiene datos de la cola alta; no se baja ni se agrega umbral ahora (Q4 del operador).

### Ubicacion por recurso de album + carpetas de guardados + fix de seguridad scope=mio - relevo 2026-09-21

Sesion con dos features y un fix de seguridad sobre el MISMO release `api/interacciones.js` **v24** (working tree, SIN commitear). Decisiones en DECISIONS.md: **ADR-051** (ubicacion individual por recurso de `album_fotos`), **ADR-052** (carpetas de guardados de media) y **ENMIENDA 2 al ADR-047** (el mapa personal incluye la media de album PROPIA del dueno; `filterMediaDefault` intacto). Bug de seguridad registrado: **BUGS_HISTORICOS.md BUG-081**. Tarea: **TASKS.md TSK-147 (COMPLETADA en codigo)**. NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). Migraciones **029 y 030 YA APLICADAS en Neon el 2026-09-21**.

**Que se estaba haciendo (resumen; ancla ADR-006 en BUGS_HISTORICOS.md BUG-081 y DECISIONS.md ADR-051/ADR-052):**
- **Migraciones aplicadas en Neon (2026-09-21):** `db/migrations/029_album_fotos_coords.sql` (`album_fotos.lat/lng DOUBLE PRECISION NULL` + CHECK `album_fotos_coords_chk` + idx `idx_album_fotos_coords`) y `db/migrations/030_guardados_carpetas.sql` (tabla `guardados_carpetas` + `media_guardados.carpeta_id` FK `ON DELETE SET NULL` + 3 indices). Idempotentes (ADR-008); sin backfill (`filas_con_coords_propias=0`). Aplicadas con el nuevo `scripts/apply_sql_file.js` (aplicador .sql ASCII-safe).
- **Feature A / ADR-051 (pin por recurso):** `multimedia_mapa` emite `COALESCE(af.lat,a.lat)` (L4810); `GET museo_recurso` expone `lat_propia`/`lng_propia`/`coords_heredadas` + `lat/lng` efectivas (L3838-3873); `POST museo_recurso` crear/editar persisten `af.lat/lng` del recurso, aceptan `album_lat/album_lng` (COALESCE al sembrar) y `quitar_coords` (L6573/L6588/L6675-6726/L6754-6759). Fallback: recurso -> album -> `coordsFallbackAutor`.
- **Feature B / ADR-052 (carpetas de guardados):** `GET mis_guardados_media` suma `carpeta_id`/`carpeta_nombre` + `carpetas:[]` y YA NO degrada a `[]` (503 `SCHEMA_NOT_MIGRATED` tipado); nueva rama `POST ?tipo=guardados_carpeta` (crear|renombrar|eliminar|mover) con `validarSesion` obligatorio; eliminar = soft-delete sin borrar bookmarks (`carpeta_id=NULL`, ADR-003). NO toca el Museo/albumes.
- **Fix de SEGURIDAD / BUG-081 (ALTA/CRITICA):** antes `multimedia_mapa scope=mio` NO autenticaba y usaba `mmScopeMio ? '' : ' AND af.visible=true'`, de modo que sin sesion (o con `usuario_id` arbitrario) devolvia los recursos privados de TODOS. Ahora `scope=mio` exige sesion firmada (`400 SESION_REQUERIDA`), deriva el uuid del token e ignora el query param; la clausula es `(mmScopeMio && mmUsuarioId ? '' : ' AND af.visible=true')` (L4824).
- **Frontend:** `mi-perfil.html` (prefill desde `lat_propia` L2479-2483, boton "Quitar ubicacion" L818/L2449-2456, espacio de guardados con ver/votar/quitar/guardar-en-carpeta + chips, reutilizando `mediaCardHTML` y `window.MediaActions`); `mymapa.js` (merge de media propia `scope=mio` con Bearer + `_propia` en `filterMisMapa`/`medirMediaActiva`, L203/L247-257/L319-330); `map-picker.js` (pin del modal arrastrable L229-230); `index-api-connector.js` (Bearer en el fetch `scope=mio` L358-361). Cache-bust: `mapa-cultural.js?v=7`, `mymapa.js?v=4`, `map-picker.js?v=2`, `index-api-connector.js?v=2`.
- **Verificacion:** `git diff --numstat` (working tree): `api/interacciones.js` +313/-67, `mi-perfil.html` +318/-17, `mymapa.js` +71/-10, `map-picker.js` +20/-10, `index-api-connector.js` +6/-1, `index.html`/`comunidad.html`/`admin.html` +1/-1 c/u. **Smokes nuevos de 029/030 EN CURSO** (resultado no documentado aun al cierre).

#### Que sigue

1. **[PENDIENTE OPERATIVO] Deploy (BLOQUEANTE para produccion):** commit/push + Vercel en orden **029/030 (YA aplicadas en Neon) -> backend `api/interacciones.js` v24 -> frontend**. Si se despliega el frontend antes del backend, `lat_propia`/`carpetas` no llegan y `scope=mio` sigue sin Bearer.
2. **Correr y documentar los smokes nuevos de 029/030** (ubicacion por recurso: fallback recurso -> album -> autor; carpetas: crear/renombrar/eliminar/mover + 503 sin migracion).
3. **Fix del reset de `museoQuitarCoords`:** si el usuario pulsa "Quitar ubicacion" y cierra el modal sin guardar, el flag puede quedar en un estado no deseado; `museoAbrirModal` lo resetea a false (L2484) pero `museoCerrarModal` (L2509) no. Revisar el reset al cerrar/cancelar.
4. **Confirmar con el usuario el mapa personal:** el cambio de `filterMisMapa` (media propia `_propia`) es la **ENMIENDA 2 del ADR-047**; `filterMediaDefault` (capa general) NO cambia.

#### Riesgos activos

- **Gate de deploy (ORDEN):** 029/030 YA estan en Neon; el riesgo restante es desplegar el frontend antes que el backend v24 (el `scope=mio` del connector manda Bearer y el backend viejo responderia distinto) o desplegar sin commitear el release. Orden obligatorio: migraciones (hecho) -> backend v24 -> frontend.
- **Fuga BUG-081:** CORREGIDA solo en working tree; mientras v24 no se despliegue, produccion mantiene la version vulnerable de `multimedia_mapa scope=mio` (media privada de terceros expuesta sin Bearer). Es el riesgo de mayor prioridad del release.
- **Doble fuente de coords (ADR-051):** recurso y carpeta pueden divergir; el recurso NUNCA debe materializar coords heredadas al editar (H-5). `quitar_coords` gana si llega junto con `lat/lng`.
- **`museoQuitarCoords` sin reset al cerrar:** deuda de UX registrada arriba.
- **Shape cambiado en `mis_guardados_media`:** pasa de degradar a `[]` (ADR-032) a 503 `SCHEMA_NOT_MIGRATED`; clientes viejos deben manejarlo.

### Fix de render de media del mapa cultural + diagnostico Neon del video reportado - relevo 2026-09-21

Reporte directo del usuario: los videos de viajero de la cuenta `gonzalezjavierbta@gmail.com` no aparecian como pines en el mapa de `index.html` ni volvian a aparecer al navegar hacia su ubicacion; ademas un supuesto 4o video "rastro mc-trampas" no aparecia ni en Museo ni en mapas. Investigacion verificada contra archivo real (ADR-006): el fallo es de FRONTEND, en el motor compartido `mapa-cultural.js`; el backend SI devolvia la media. Bug registrado: **BUGS_HISTORICOS.md BUG-080**; tarea **TASKS.md TSK-146 (COMPLETADA en codigo, working tree SIN commitear)**. NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010) ni migraciones; `api/*.js` NO se toco; sin ADR nuevo.

**Que se estaba haciendo (resumen; ancla ADR-006 en BUGS_HISTORICOS.md BUG-080):**
- **Fix (frontend):** (a) `mapa-cultural.js` `onMoved()` (L663-666; enganchado a `moveend` L1665) ahora hace `setTimeout(function () { recluster(); renderMedia(); }, 150)` -> la capa de media se recalcula con el viewport actual; antes solo `recluster()` y los pines de media quedaban congelados y se descartaban por `if (!bounds.contains([lat, lng])) return;` (L1040). (b) el atajo "Todo" de `filterPins()` (L947-950) delega en `setMediaEnabled(true)` cuando `!st.mediaEnabled || mediaTiposActivos() === 0` (rellena los 3 tipos foto/video/audio) y si no llama `renderMedia()`; sin tipos activos `renderMedia` descarta todo item (L1039). (c) cache-bust `mapa-cultural.js?v=6` -> `?v=7` en `index.html` L883 y `comunidad.html` L566.
- **Hallazgo operativo (video inexistente):** el video "rastro mc-trampas" reportado como subido **NO EXISTE** en la BD: busqueda `ILIKE '%rastro%'` en `album_fotos`, `destinos_fotos` e `interacciones` = **0 filas**. Los 5 videos reales de la cuenta: "Los piratas de ramirez" (`activo=true`, `visible=true`, album Mi Museo, 2026-09-21), "Xxl" (`true/true`, Mi Museo, 2026-09-19), "Casa de carton" (`activo=false`, `visible=true`, Mi Museo, 2026-09-18), "Skyzo en la 26" (`true/true`, Mi Museo, 2026-09-18) y un "Skyzo en la 26" duplicado (`activo=false`, album "Bogota, capital" inactivo, 2026-09-18). Album "Mi Museo" activo en lat=4.584784 / lng=-74.075065 (Bogota). Presion del LIMIT del mapa: 5 filas de album y 1147 de destinos (muy por debajo de 300/600): NO hay starvation (descarta BUG-069 en este caso).
- **Herramientas nuevas de diagnostico (read-only; working tree, SIN commitear):** `scripts/neon_select.js` (SELECT/WITH; rechaza escritura), `scripts/load_env_local.js` (carga la credencial de conexion a Neon desde `.env.local`, ignorado por git; el valor NUNCA se documenta -- politica de secretos) y `db/queries/q1_rastro_video.sql` .. `q4_rastro_busca_global.sql`.
- **Verificacion:** `node --check mapa-cultural.js` OK; ASCII 0 bytes >127; divs balanceados (index 370/370, comunidad 320/320); `scripts/smoke_mapa_cultural.js` OK. **Ampliacion del smoke con regresion EN CURSO.**
- **BUGS:** **BUG-080 NUEVO (CORREGIDO EN CODIGO)** en BUGS_HISTORICOS.md (incluye la nota operativa de "rastro"); **NO es un bug de backend**. Sin ADR nuevo.

#### Que sigue

1. **[PENDIENTE OPERATIVO] Deploy del fix:** commit/push + Vercel de `mapa-cultural.js` + `index.html` + `comunidad.html` (cache `?v=7`) para que el render de media llegue a produccion.
2. **Ampliar `scripts/smoke_mapa_cultural.js`** con casos de regresion: `moveend` re-renderiza la capa de media; el atajo "Todo" rellena los tipos y pinta los pines.
3. **Confirmar con el usuario el mapa de `comunidad.html`:** el mapa personal "Mi Viaje" excluye la media de album por diseno (ADR-047 Enmienda 1 / BUG-074).
4. **Diagnostico Neon (read-only):** repetir `scripts/neon_select.js`/`scripts/diagnose_video_mapa.js` si el usuario reporta un video nuevo; recordar que el backend devolvia los 3 videos vigentes.

#### Riesgos activos

- **Cache v7 sin desplegar:** el fix de BUG-080 vive solo en working tree; sin commit/deploy, produccion sigue con el render de media congelado y el atajo "Todo" inoperante (BUG-073, necesidad de bump de `?v=N` al desplegar assets compartidos).
- **Reporte de video inexistente:** el usuario puede seguir esperando "rastro mc-trampas"; confirmar que no existe en la BD (0 filas) y aclarar que NO era un problema del mapa.
- **Media de album desactivada:** 2 de los 5 videos de la cuenta tienen `activo=false` ("Casa de carton" y el "Skyzo en la 26" duplicado) -> no se pintan por diseno, no por el fix.

### Fix de votos de fotos curadas del admin (al actualizar se perdia la puntuacion) - relevo 2026-09-20 (cierre express)

Cierre documental EXPRESS (skill `express-mode`: un solo pase, docs-only, ruta FREE, sin tocar codigo) del fix del **BUG-079**: al actualizar los datos de una entrada del directorio desde el admin se perdia la puntuacion de las fotos. Causa raiz DOBLE: (1) `api/admin-destinos.js` hacia REPLACE total de `destinos_fotos` (DELETE + re-INSERT) generando ids nuevos -> `media_votos`/`media_comentarios` (fuente='curada'), que cuelgan de `destinos_fotos.id::text`, quedaban huerfanos (patron de tabla no versionada BUG-021); (2) `admin.html` no preservaba `id_neon`/caption y `_cargarFotosDeNeon()` solo fusionaba con registro local VACIO (tambien dejaba sin recolectar fotos Unsplash, BUG-062). NO existia tarea abierta de galeria/fotos (TSK-136..TSK-140 COMPLETADAS) -> cierre directo del bug en `TASKS.md`, sin TSK nuevo. Decision de arquitectura: **ADR-050 (APROBADO)** en DECISIONS.md (addendum que enmienda la premisa "`destinos_fotos.id` NO es ancla estable" del ADR-030, L822-823: el id SI es estable mientras la fila se preserva; la inestabilidad era del REPLACE, no del esquema). NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010) ni migraciones. Verificado contra archivo real (ADR-006).

**Que se estaba haciendo (resumen; ancla ADR-006 en BUGS_HISTORICOS.md BUG-079):**
- **`api/admin-destinos.js` v2.2:** `normFotosGaleria()` (L38; id uuid canonico o serial de 1-10 digitos, invalido -> null) y `reemplazarFotosGaleria()` (L83) = **MERGE transaccional** (`sql.transaction`, L168): match por id -> UPDATE **conservando el id**; sin id, fallback por **url unica no usada** -> UPDATE conservando el id; sin match -> INSERT; DELETE parametrizado SOLO de filas no usadas; coherencia `es_hero` con `foto_hero`; guard anti-perdida 400 SOLO cuando hay items pero ninguno con url valida. **Caso "sin fotos":** merge omitido, galeria Neon preservada, sin 400 (deuda: no hay via para vaciar la galeria desde el admin).
- **`admin.html`:** `_photoToObj()` (L4656-4671) normaliza fotos a objetos; `getPhotos()` devuelve `{url,caption,id_neon,es_hero,orden}` (L4712-4735); `_placeToAPI()` envia `fotos_galeria` con TODAS las fotos desde indice 0 (la hero viaja con su `id_neon` + `es_hero:true`; `foto_hero` string aparte) (L6068+); `_cargarFotosDeNeon()` FUSIONA por URL (local gana caption; id_neon/es_hero/orden de Neon) y corre SIEMPRE al editar una entrada publicada (L6219+) -> **cierra BUG-062**. VERSION `admin-v9.20260920`; 8 comentarios `BUG-079` (L2818/L3300/L4656/L4677/L4713/L6076/L6214/L6712) y 5 en `api/admin-destinos.js` (L8/L35/L67/L353/L485).
- **Verificacion:** smoke vm **4/4** (A: hero + galeria curadas preservan ids; B: solo hero sin 400; C: sin fotos -> galeria Neon preservada, sin 400; D: 400 solo con items invalidos). `node --check` OK x2; ASCII-safety 0/0/0; balance de divs `admin.html` 815/815 diff 0; cero 'BUG-056' residual en ambos archivos. QA (qa-auditor): **APTO**.
- **BUGS:** **BUG-079 NUEVO (CERRADO)** en BUGS_HISTORICOS.md; **BUG-062 CERRADO** (colateral). **BUG-056** sigue como precedente del REPLACE (pendiente `dedupe_destinos_fotos.js --apply` + indice unico para datos historicos). **ADR-050 (APROBADO)** en DECISIONS.md.

#### Que sigue

1. **[PENDIENTE OPERATIVO] Medir el dano historico en Neon:** correr `scripts/diagnose_fotos_huerfanas.js` (NUEVO, read-only) con `DATABASE_URL` para cuantificar los votos curados YA huerfanos por el REPLACE historico (requiere Neon/Javier; el fix solo previene huerfanos NUEVOS) y decidir remedio: re-anclar por url a la fila actual unica, con backup, tipo `db/cleanups/`.
2. **Commit/deploy del release 2026-09-20:** `admin.html` (v9.20260920) + `api/admin-destinos.js` (v2.2) junto a TSK-145 (zona + migracion 028), TSK-144 (estado persistente) y TSK-143 (drawer); respetar el orden BLOQUEANTE 028 en Neon -> deploy backend -> frontend.
3. **[DEUDA-EXPRESS] Limpiar codigo muerto `_syncFotosGaleria`** (`admin.html` L6193, 0 call-sites): el flujo real hoy es `_cargarFotosDeNeon()` (fusion) + `reemplazarFotosGaleria()` (MERGE por id); `GUIA_DE_DESARROLLO.md` L482 lo cita como "escribe destinos_fotos" (doc-drift a corregir al limpiar).
4. **[DEUDA-EXPRESS] Exclusividad de `es_hero`:** hoy si el front manda dos heroes gana la ultima; decidir el contrato (validar 1 solo hero en `normFotosGaleria`).
5. Pase de docs pendiente del 2026-09-20: commitear TSK-145/144/143 + BUG-079 + archivos de gobernanza (AGENTS.md, `orquestacion agentes.md`, doc de analisis y `.docx`); cada pase por separado.

#### Riesgos activos

- **Votos huerfanos HISTORICOS siguen en Neon:** BUG-079 solo evita huerfanos NUEVOS; los ya huerfanados por REPLACE previos no se re-anclan solos (medicion + re-anclaje = pendiente operativo).
- **Dependencia de `id_neon` del frontend:** clientes legacy que no envien `id_neon` caen al fallback por url unica; sin url valida -> 400 anti-perdida (intencional).
- **Sin via para vaciar la galeria desde el admin** (el caso "sin fotos" preserva lo existente a proposito).
- **Cache del navegador (BUG-073):** el release BUG-079 (admin.html + api/admin-destinos.js) debe desplegarse coordinado con el de 028; un despliegue intermedio mezclado puede reactivar el sintoma.
- Riesgos previos vigentes: orden 028 -> deploy (42703); BUG-002 y BUG-065 ABIERTOS; QA visual y shape real de `?tipo=mapa` sin validar contra Neon; docs Core de ~1.28 MB que encarecen el contexto.

### Campo zona (region natural) en el admin general + migracion 028 - relevo 2026-09-20 (cierre express)

Cierre documental EXPRESS (skill `express-mode`: un solo pase, docs-only, ruta FREE, sin tocar codigo) del nuevo campo **`zona` (region natural)** capturable desde el ADMIN general (todas las categorias, incl. eventos), con NUEVA migracion 028 y exposicion en la API publica. Tarea en `TASKS.md` **TSK-145 (COMPLETADA)**; working tree **SIN commitear** (verificado ADR-006: `git status` = `M admin.html`, `M api/admin-destinos.js`, `M api/destinos.js`, `?? db/migrations/028_destinos_zona.sql`). NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). Decision de arquitectura: **ADR-049 (APROBADO)** en DECISIONS.md, escrito por `architect` el 2026-09-20 (NO se toca en este cierre). `api/interacciones.js` NO se toco (**8/8 INTACTO**).

**Que se estaba haciendo (resumen; ancla ADR-006 en TASKS.md TSK-145):**
- **NUEVA `db/migrations/028_destinos_zona.sql`** (100 lineas, aditiva/idempotente/ASCII-safe): `ALTER TABLE destinos ADD COLUMN IF NOT EXISTS zona TEXT` (L51-52); CHECK `destinos_zona_chk` idempotente via `DO $$ ... pg_constraint` (patron 019/026) que permite NULL o `('andina','amazonica','caribe','pacifico','llanos')` (L59-68); indice `idx_destinos_zona` con `IF NOT EXISTS` (L74-75). Nula a proposito (la obligatoriedad se valida en UI, no en DB) para no romper seeds/loaders que aun no envian la columna.
- **`admin.html`:** `<select id="f-zona">` (L771) en el form general, UNA SOLA y OBLIGATORIA; cableado en `clearForm` (ids L2674), `loadForm` (L3284), `savePlace` (L3948), `_placeToAPI` (L6057) y `_mergeNeonRowIntoLocal` (L6573). Validacion en `validateForm()` (L4076-4096): fila `['fg-zona','f-zona','Selecciona la zona (region natural)']` (L4081) + guard dedicado que bloquea con toast (L4089-4093).
- **`api/admin-destinos.js`:** INSERT agrega columna/param `zona` normalizado a NULL si ausente/vacio (`(b.zona ? String(b.zona).trim() : null)`, L187); PUT agrega `zona` al fieldMap (L274); GET listar agrega `d.zona` (L110).
- **`api/destinos.js`:** `toPlace()` expone `zona` (L49); modo mapa: SELECT (L168) y proyeccion (L189).
- **Decision de producto:** una sola zona obligatoria, valores Andina/Amazonica/Llanos/Caribe/Pacifico, cubre eventos; `region` sigue siendo departamento (documentada como **ADR-049 APROBADO** en DECISIONS.md, escrito por architect 2026-09-20; NO se toca en este cierre).
- **Defecto QA corregido ANTES del deploy (NO es bug):** el INSERT enviaba `''` que la CHECK `destinos_zona_chk` rechazaba -> 500 en el pipeline de los 103 `load-*-api.js`; corregido a NULL (normalizacion L187). Verificado ADR-006.
- **Verificacion:** `node --check` OK en `api/admin-destinos.js` y `api/destinos.js`; ASCII 0 bytes >127 en migracion + ambos APIs; divs `admin.html` 815/815 diff 0; INSERT 35:35:35 (columnas con placeholder : placeholders : params); `validateForm` bloquea sin zona; migracion aditiva/idempotente y CHECK permite NULL.
- **BUGS:** ninguno nuevo (defecto pre-deploy, corregido). BUG-002 y BUG-065 siguen ABIERTOS (preexistentes). ADR-049 (APROBADO) en DECISIONS.md es la decision de arquitectura (escrita por architect, NO tocada en este cierre).

#### Que sigue

1. **[BLOQUEANTE] Aplicar `db/migrations/028_destinos_zona.sql` en Neon ANTES del deploy del backend** (orden 028 -> deploy): si no, `42703 column does not exist` (SELECT/INSERT ya referencian `d.zona`).
2. **Commit/deploy del release:** `admin.html` + `api/admin-destinos.js` + `api/destinos.js` + `db/migrations/028_destinos_zona.sql` (assets frontend NO cuentan contra el presupuesto 8/8; la migracion no es funcion serverless).
3. **[DEUDA] Enviar `zona` desde las vias que aun no lo hacen:** los 103 `scripts/load-*-api.js`, `api/publicar-lugar.js` (mi-lugar.html) y `scripts/upload-eventos.js` -> fichas/eventos creados por esas vias quedan SIN zona.
4. **[DEUDA] Mostrar/filtrar la zona en directorios/mapa/ficha** (hoy solo admin + API la entregan).
5. **[DEUDA] Alinear slugs de zona con la 027:** `andina`/`amazonica` (028) vs `andes`/`amazonia` (027, `zonas_geograficas`) -- sin FK por ahora; y revisar la etiqueta `#f-barrio` "Barrio / Zona" (posible confusion con el nuevo campo "Zona").

#### Riesgos activos

- **ORDEN 028 -> deploy (BLOQUEANTE):** desplegar `api/admin-destinos.js`/`api/destinos.js` antes de aplicar la 028 en Neon rompe el backend con `42703`.
- **CHECK `destinos_zona_chk` vs `''`:** cualquier cliente que envie `zona` como string vacio recibe 500 (la CHECK rechaza `''`); el backend del admin lo normaliza a NULL (L187), pero las vias legacy (loaders/publicar-lugar/upload-eventos) no envian la columna -> NULL por defecto, sin conflicto.
- **Deuda de datos:** los destinos creados por loaders/upload-eventos/publicar-lugar quedan sin `zona`; si se requiere zona en todos, habria que backfillar.
- **Cache del navegador (BUG-073)** y BUG-002/BUG-065 ABIERTOS (preexistentes); QA visual y shape real de `?tipo=mapa` sin validar contra Neon.

### Estado persistente del usuario en paginas del directorio + ficha (guardados/visitas y resena con nombre) - relevo 2026-09-20 (cierre express)

Cierre documental EXPRESS (skill `express-mode`: un solo pase, docs-only, ruta FREE, sin tocar codigo) del cambio que deja **persistente** el estado del usuario (corazones de guardado + visitas "Estuve aqui") al reingresar en las paginas del directorio y en la ficha de destino, y que hace que la resena use el **NOMBRE DE LA CUENTA** en vez del correo generico `nombre@explorador.co`. TODO en working tree, **SIN commitear**. Tarea en `TASKS.md` **TSK-144 (COMPLETADA)**; bug registrado en `BUGS_HISTORICOS.md` **BUG-078 (CERRADO, 2026-09-20)**. NO nace ADR nuevo (se reusan GET existentes: no hay endpoint nuevo); `api/interacciones.js` NO se toco (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones. Verificado contra archivo real (ADR-006).

**Que se estaba haciendo (resumen; ancla ADR-006 en TASKS.md TSK-144):**
- **`usuario-session.js` (+54/-10):** NUEVOS `window.ExploraCO.estaVisitado(uuid)` (~L847-870; reusa GET `?tipo=mapa&usuario_id` -> `data.visitados`; sin sesion = false) y `estadoDestino(uuid)` (~L872-894; `Promise.all([estaGuardado, estaVisitado, obtenerMiVoto])` -> `{guardado, visitado, voto}`). `publicarResena` (~L719-729) AHORA EXIGE SESION: abre modal de login y responde `{ok:false, requiere_login:true}`; ya NO crea `nombre@explorador.co` (el POST se conserva con `usuario_id` real).
- **`api/pagina-destino.js`:** `precargarEstado()` idempotente (~L2638-2662) enganchada en `window.onExploraCOUpdate` + respaldo DOMContentLoaded: marca `#btn-guardar` y `#btn-visitado` y pinta `#qr-stars` -> corrige la causa raiz (timing de sesion). `#rvn` queda readonly con `usuario.nombre`; `submitRv` usa el nombre de la cuenta; callback de publicacion corregido a `if(ok===true)` (~L2511).
- **`index.html` (~L3535-3540):** `_hidratarGuardadosDB()` ahora llama `renderDest()` con guardados/visitas nuevos (corazones del home persistidos al reingresar).
- **NUEVO `directorio-session.js` (234 lineas, ASCII-safe)** compartido por los 5 directorios: `mmSaved` migrado a SLUG; `tSave` persiste a BD (`guardarDestino`/`quitarGuardado`) con sesion; hidratacion DB via `cargarMiMapa()` + `renderDir()`; migracion re-ejecutable de `mm_saved` legacy numerico -> slug (catalogo embebido Y API connector). Editados `directorio.html`, `directorio-hostal.html`, `directorio-comida.html`, `directorio-sitio.html`, `directorio-evento.html` (se elimina el `tSave` local duplicado, Tripwire 5 lineas; `usuario-session.js` agregado a los 4 sub-directorios).
- **Smokes / verificacion:** `node --check` OK x3; ASCII 0 bytes >127; divs diff 0 (index + 5 directorios); `smoke_auditoria_pagina_destino.js` **61/61 PASS**; `smoke_estado_sesion_destino.js` **14/14 PASS** (NUEVO); `smoke_directorio_session.js` **14/14 PASS** (NUEVO); `check_buildHTML_inline.js` OK; `smoke_mapa_cultural.js` 58 checks OK. QA (qa-auditor): **APTO CON OBSERVACIONES**.
- **BUGS:** **BUG-078 NUEVO (CERRADO)** en BUGS_HISTORICOS.md (estado del usuario no persistente al reingresar en las paginas del directorio; causa raiz = timing de sesion + directorios sin sync DB + falta de preload de "estuve aqui"). **BUG-002 sigue ABIERTO** (R3: doble escape `\u2605` L2473 de `api/pagina-destino.js`, deuda preexistente).

#### Que sigue

1. **QA visual en navegador (una sola sesion):** los 5 directorios (corazones con sesion iniciada, persistencia al reingresar en pestana nueva) y la ficha de destino (boton "Estuve aqui", corazon de guardado y resena que muestre el nombre de la cuenta).
2. **Commit/deploy del release:** assets frontend (`usuario-session.js`, `directorio-session.js`, `index.html`, los 5 `directorio-*.html`) + `api/pagina-destino.js` (assets frontend NO cuentan contra el presupuesto 8/8).
3. **[DEUDA-EXPRESS] Legacy R2 de `publicarResena`:** consumidores con `.then(function(ok){ if(ok) })` (`Monserrate2.html`, `lacandelaria2.html`, `gen_body7.js`, `_lacandelaria2_body.html`, `_monserrate2_body.html`, `_check_monserrate2.js`, `_tmp_lac2.js`) estan fuera del flujo Vercel y confundirian un sin-sesion con exito; migrarlos o absorberlos si vuelven a usarse.
4. **Deuda GOLD preexistente (R3):** BUG-002 (doble escape `\u2605` L2473) y backticks en comentario L1646 de `api/pagina-destino.js` siguen como deuda de limpieza, ajena a esta sesion.
5. Pase de docs pendiente del 2026-09-20: commitear TSK-144 + TSK-143 + archivos de gobernanza (AGENTS.md, `orquestacion agentes.md`, doc de analisis y `.docx`); cada pase de docs por separado.

#### Riesgos activos

- **Doble toast en directorios con sesion:** al guardar un destino con sesion iniciada podria mostrarse XP local + toast del servidor (a validar en el QA visual del item 1).
- **BUG-002 ABIERTO (R3):** doble escape `\u2605` en `api/pagina-destino.js` L2473 (deuda preexistente, NO atribuible a TSK-144).
- **Timing de sesion regresivo:** cualquier pagina nueva que hidrate estado del usuario debe hacerlo DESPUES de `refrescarSesion()` o via `onExploraCOUpdate` (patron `precargarEstado`); hacerlo antes reviviria el sintoma de BUG-078.
- **Cache del navegador (BUG-073):** un fix que cambie `usuario-session.js`/`directorio-session.js` no llega al usuario si los HTML consumidores no bumpean `?v=N`.
- Riesgos previos vigentes: BUG-061 y BUG-065 ABIERTOS; QA visual del mapa cultural y shape real de `?tipo=mapa` sin validar contra Neon; docs Core de ~1.28 MB que encarecen el contexto.

### Drawer del mapa cultural solo por vinculo explicito - cierre documental express 2026-09-20

Cierre documental EXPRESS (skill `express-mode`: un solo pase, docs-only, ruta FREE, sin tocar codigo) de la eliminacion de la heuristica de cercania del drawer del mapa cultural (media de comunidad por misma ciudad o <= 10 km adjuntada a cualquier pin de la ciudad). Regla VIGENTE: el resumen de un pin muestra SOLO media con vinculo explicito - `origen='destino'`/`'destino_album'` cuyo `origen_id` coincide con el `slug`/`uuid` del lugar -, para FOTOS, VIDEOS y AUDIOS. La **ENMIENDA 1 del ADR-047** (DECISIONS.md, escrita por architect el 2026-09-20 - NO se toca en este cierre) es la decision; tarea en `TASKS.md` **TSK-143 (COMPLETADA, working tree SIN commitear)**. NO crea funciones serverless (8/8 INTACTO) ni migraciones.

**Que se estaba haciendo (resumen; ancla ADR-006 en TASKS.md TSK-143):**
- **`mapa-cultural.js` `filterMediaPropios` simplificada (L202-230, comentario L202-211):** eliminados `ciudad`/`lat`/`lng`/`esVideoAudio`/`cerca`/`haversineKm <= 10`; dedupe por URL conservado. `haversineKm` sigue viva (L106, orden por distancia al geolocalizar). Comentario de `mediasCercanas` (L1143-1149) actualizado; sigue como envoltorio de `filterMediaPropios` con tope 40.
- **La CAPA del mapa NO cambia:** `filterMediaDefault` (`mapa-cultural.js` L190-203) conserva su regla estricta (solo `origen='destino'`/`'destino_album'`; `'album'` excluido SIEMPRE). Los pines de video/audio del index provienen de su `mediaFilter` propio (`index.html` L2274-2280) y de `filterMisMapa` (`mymapa.js` L189); en `comunidad.html` no se muestran salvo media guardada.
- **Cache-busting:** `mapa-cultural.js?v=4` -> `?v=5` en `index.html` (L882) y `comunidad.html` (L566).
- **Smoke:** check L272 de `scripts/smoke_mapa_cultural.js` INVERTIDO a `'filterMediaPropios: excluye video/audio de comunidad (misma ciudad)'`; **73 checks, 0 FAIL** (`SMOKE MAPA CULTURAL: OK`).
- **Escudo GOLD (qa-auditor):** `node --check` OK; ASCII 0 bytes >127; balance de divs diff 0 en `index.html` y `comunidad.html`; veredicto **APTO CON OBSERVACIONES**.
- **BUGS:** **BUG-076 RECLASIFICADO** (su mitigacion por cercania ELIMINADA por la ENMIENDA 1 del ADR-047; su sintoma - pestanas Videos/Audios vacias - pasa a comportamiento de producto ACEPTADO) y **BUG-075** con nota cruzada (sigue CERRADO; pertenencia explicita para TODOS los media types). Historial conservado (Cero Borrado Logico).

#### Que sigue

1. **QA visual en navegador del drawer (TSK-135 + TSK-143):** verificar que el pin de `hostal-r10-bogota` ya NO muestra videos/audios de otros lugares de Bogota y que un lugar con vinculos propios muestra sus fotos/videos/audios.
2. **Commit/deploy del asset** `mapa-cultural.js` con cache-bust `?v=5` (`index.html` + `comunidad.html`); los assets frontend NO cuentan contra el presupuesto 8/8.
3. **Decision de producto sobre `comunidad.html`:** un video/audio de comunidad NO guardado en el destino ya no aparece ni en la capa ni en el drawer (consecuencia intencional de la enmienda); validar con producto si se quiere dar superficie alternativa.
4. **Docstring obsoleto de `mapa-cultural.js` L31-32:** lo corrige otro agente (no se toca en este cierre).
5. Pase de docs pendiente del 2026-09-20: commitear TSK-143 + archivos de gobernanza (AGENTS.md, `orquestacion agentes.md`, doc de analisis y `.docx`); cada pase de docs por separado.

#### Riesgos activos

- **Via futura `media_compartidos` (fuera de alcance):** volver a mostrar video/audio de comunidad EN EL DRAWER (solo los compartidos al destino) requeriria que `?tipo=multimedia_mapa` emita el join `media_compartidos` (`fuente='album_foto'` + `destino_id`, migracion 022), hoy NO emitido -> cambio de backend en `api/interacciones.js`.
- **Superficie de video/audio de comunidad no guardado:** sin drawer ni capa para ese caso en `comunidad.html` (el de la capa depende del mapa activo); pendiente de decision de producto.
- **Cache del navegador (BUG-073):** cualquier HTML nuevo que referencie `mapa-cultural.js` debe usar `?v=5` o superior.
- Riesgos previos vigentes: BUG-061 y BUG-065 ABIERTOS; QA visual del mapa cultural y shape real de `?tipo=mapa` sin validar contra Neon; docs Core de ~1.28 MB que encarecen el contexto.

### Pagina dinamica salto-del-tequendama (sitio, Soacha/Cundinamarca) - relevo 2026-09-20 (cierre express)

Cierre documental EXPRESS (skill `express-mode`: un solo pase, baja profundidad, sin tocar codigo). **Publicacion en PRODUCCION** de la pagina dinamica del destino **Salto del Tequendama** a partir del archivo fuente corrupto `hotel tequendama.txt` (ficha JSON a medio generar; lineas 92-119 eran texto de error de Gemini pegado). Tarea en `TASKS.md` **TSK-142 (COMPLETADA)**. NO nace ADR nuevo ni bug de ExploraCO (la data corrupta es del archivo fuente y se descarto): `DECISIONS.md` y `BUGS_HISTORICOS.md` NO se tocaron. Verificado contra archivo real (ADR-006): los 6 archivos citados existen en el repo.

**Que se estaba haciendo:**
- **Pagina publicada y verificada:** slug `salto-del-tequendama` (categoria `sitio`, ciudad Soacha, region Cundinamarca), **id Neon `8c2b48fc-c6c5-4ec4-ad42-909a73911ce0`**, `status=published`. https://exploraco.vercel.app/salto-del-tequendama.html renderiza completa (hero, galeria, entradas, tours, itinerario, FAQ, mapa, JSON-LD TouristAttraction) y `/api/destinos` devuelve el slug publicado.
- **Ficha saneada:** `ficha/ficha-salto-del-tequendama.md` (JSON valido, FAQS x5, FOTOS_SUGERIDAS con 5 URLs reales verificadas HEAD 200, FUENTES: casamuseotequendama.org + maps).
- **Fotos:** 5 resueltas en Wikimedia Commons (compliance BUG-022): hero profesional + 4 galeria.
- **Scripts (3):** `scripts/seed-salto-del-tequendama.js` (upsert Neon, ON CONFLICT slug, `--dry`), `scripts/load-salto-del-tequendama-api.js` (loader API DELETE+POST, token default), `scripts/smoke_test_salto-del-tequendama.js` (fake_neon + buildHTML).
- **Verificacion local (Escudo GOLD):** `node --check` OK x3; ASCII-safety 0 bytes >127; smoke **15/15 PASS**; divs diff=0. Carga a prod ejecutada y verificada (loader OK, `status=published`).
- **Typo del archivo fuente corregido:** "Caoda" -> "Caida" en seed + ficha + clean.json (`hotel tequendama.txt` original intacto). `hotel tequendama.clean.json` quedo como artifact de respaldo en la raiz.

#### Que sigue

Nada bloqueante. Opcional / verificacion humana:
1. **Verificacion visual del render** de https://exploraco.vercel.app/salto-del-tequendama.html por un humano (hero, galeria, entradas, tours, itinerario, FAQ, mapa).
2. **Revalidar el horario:** la web oficial casamuseotequendama.org publica actualmente "fines de semana y festivos 9am-4pm", mientras la ficha conserva "Mar-Dom 9:00 AM - 5:00 PM" del archivo origen (pendiente de revalidar). Ver deuda (a).

#### Riesgos activos

- No hay bloques activos (publicacion verificada en produccion). Deuda etiquetada abajo.

#### Deuda `[DEUDA-EXPRESS]`

- `[DEUDA-EXPRESS]` a) **Revalidar horario oficial del Salto del Tequendama:** la ficha dice "Mar-Dom 9:00 AM - 5:00 PM" (del archivo origen); la web oficial hoy publica "sab-dom/festivos 9am-4pm". Si procede, actualizar seed + ficha y re-cargar si cambia contenido publicado.
- `[DEUDA-EXPRESS]` b) **WhatsApp/email del archivo (573102456789 / info@casamuseotequendama.org) NO fueron verificados contra una fuente oficial:** verificar antes de dar datos de contacto a produccion si se confia en ellos.
- `[DEUDA-EXPRESS]` c) **Itinerario quedo con 2 paradas** (la 3a estaba corrupta en el archivo origen y se descarto por no inventar datos): el contrato `ficha_template` pide 3-5, evaluar si se amplia luego.
- `[DEUDA-EXPRESS]` d) **`hotel tequendama.txt` (fuente corrupta) sigue en la raiz** junto a `hotel tequendama.clean.json` (artifact): decidir si se archivan/mueven.

### Agentes hybrid-plan/hybrid-build (esquema tripartito de orquestacion) - relevo 2026-09-20 (ADR-048)

Relevo de la creacion del TERCER grupo de agentes primarios de orquestacion (esquema tripartito: Standard/Pro, Free y **Hybrid** con ruteo por riesgo). Decision en `DECISIONS.md` **ADR-048 (APROBADO, 2026-09-20)**; tarea en `TASKS.md` **TSK-HYBRID-001 (COMPLETADA)**. Verificado contra archivo real (ADR-006) el 2026-09-20. NO toca `api/*.js` (**8/8 INTACTO**, ADR-001/ADR-010), ni esquema, ni BD, ni el presupuesto de Vercel Hobby.

**Que se estaba haciendo (resumen; ancla ADR-006 en TASKS.md TSK-HYBRID-001):**
- **NUEVOS `.opencode/agent/hybrid-plan.md` y `.opencode/agent/hybrid-build.md`** (ambos `model: opencode-go/deepseek-v4.1-flash`, `mode: primary`): `hybrid-plan` = edit/bash **deny** (solo invoca `@explore-free`/`@research-agent-free`; asigna la implementacion por nombre en el plan para que la ejecute `hybrid-build` en sesion posterior); `hybrid-build` = edit/bash **allow** (orquestador ejecutor, rutea por riesgo y criterio, nunca por preferencia).
- **Matriz de ruteo:** PRO = `backend-dev`, `admin-dev`, `renderer-dev`, `frontend-tpl`, `sql-security`, `architect` + `architect-review`; FREE = `explore-free`, `content-loader-free`, `js-silo-dev-free`/`exp-pickle-free`, `data-migration-free`, `seo-dev-free`, `qa-auditor-free`, `docs-keeper-free`, `media-reader-free`, `research-agent-free`/gemini-research.
- **DECISIONS.md:** NUEVO **ADR-048** (APROBADO), derivado del analisis de consumo real de opencode.db (821 sesiones ago-sep 2026): `build` PRO = 35% del gasto, tareas rutinarias = 23% migrables a free (costo ~0), criticas = 38% permanecen PRO; `explore` PRO **$2.41/146 sesiones** vs `explore-free` **$0.12**.
- **AGENTS.md:** encabezado "tres rutas completas" + nueva subseccion **1.2 "Ruta HYBRID"**; la seccion de PAGO queda renumerada a 1.3.
- **`exploraco desarrollo/ampliacion desarrollo/orquestacion agentes.md`:** actualizado a **v1.1** (matriz hybrid exacta, nota de consumo, filas hybrid en `deepseek-v4.1-flash`).
- **`opencode.json` NO se toco:** `default_agent` sigue en `free-plan` (INTACTO, verificado en el archivo real; consciente y documentado en ADR-048 como pendiente de decision del operador).
- **QA audit:** frontmatter YAML valido, campos permitidos, modelo con prefijo valido, `mode: primary`, permisos rol-coherentes, **17/17 agentes citados por la matriz existen** (incluido `exp-pickle-free.md`, GAP de TSK-141 resuelto), `default_agent` intacto, duplicidad resuelta (F-1/F-2 corregidos; unico run restante = bloque `permission` del frontmatter, boilerplate normativo compartido por los 4 primarios -- no constitutivo).

#### Que sigue

1. **[DEUDA-EXPRESS][OPCIONAL] Activar el Hybrid como default:** si el operador lo decide, 1 cambio en `opencode.json` (`default_agent` -> `hybrid-build`) + restart, en **sesion separada**. Hoy el esquema Hybrid requiere activacion por nombre (`@hybrid-plan`/`@hybrid-build`).
2. **[DEUDA-EXPRESS][FASE 2 PROPUESTA] Evaluar la migracion de los subagentes `-free` de `opencode/big-pickle`** a `deepseek-v4-flash-free`/laguna para mayor velocidad; NO se ejecuto nada en esta sesion, queda como propuesta.
3. **Commitear los archivos sin versionar:** `.opencode/agent/hybrid-plan.md` y `.opencode/agent/hybrid-build.md` (+ AGENTS.md y `orquestacion agentes.md` actualizados) junto al proximo pase de docs; no mezclarlos con commits de codigo.
4. **Trazabilidad PRO/FREE de cada sesion Hybrid:** el resumen de entrega debe indicar que tareas fueron PRO y cuales FREE y el ahorro probable (regla de oro del ADR-048).

#### Riesgos activos

- **`default_agent` sigue `free-plan`:** el esquema Hybrid NO se activa solo; ninguna sesion nueva rutea por riesgo a menos que el operador invoque `@hybrid-plan`/`@hybrid-build` o cambie el default.
- **Activacion por nombre requerida:** mientras el default no cambie, el ahorro del ADR-048 (~23% del gasto PRO a costo ~0) solo se captura si el operador usa los agentes hybrid.
- **Doc de orquestacion con citas legacy:** `orquestacion agentes.md` conserva `deepseek-v4-flash` en las secciones 3/4 para los agentes Pro legacy (fuera del alcance de esta sesion); las filas hybrid (68-69) ya estan en `deepseek-v4.1-flash`. El archivo real manda (ADR-006).
- **Riesgo de mal ruteo:** la regla de oro del ADR-048 prohibe invocar un subagente FREE en un dominio de la ruta PRO (backend, admin, renderer, sql-security, arquitectura); es obligatoria y verificable en el prompt real de `hybrid-build`.

### Gema Gemini ExploraCO Research - cierre documental express (2026-09-20)

Cierre documental EXPRESS de la creacion de la gema Gemini **"ExploraCO Research"** (`GEMINI_GEMA_INVESTIGACION.md`, 154 lineas, **untracked**; skill `express-mode`: un solo pase de docs, sin tocar codigo). Tarea en `TASKS.md` **TSK-141 (COMPLETADA)**. NO nace ADR nuevo (configuracion de prompts, no arquitectura); `DECISIONS.md` y `BUGS_HISTORICOS.md` NO se tocaron (BUG-034 ya registrado y re-confirmado vigente contra el archivo real 2026-09-20).

**Que se estaba haciendo (resumen; ancla ADR-006 en TASKS.md TSK-141):**
- **Gema (creada, sin commitear):** el usuario da nombre+lugar (destinos, uno a uno) o lote de N (eventos); la gema ejecuta TODA la investigacion web por si misma, anexando los 3 recursos canonicos (`GEMINI_MASTER_PROMPT.md`, `GEMINI_EVENTOS_PROMPT.md`, `ficha_template.md`) SIN duplicar su contenido (Tripwire 5 lineas). Entrega ficha .md + bloque JSON final (esquema seccion 6 del master, TAGS por categoria) o array JSON de eventos, con clogs Escudo GOLD y cierre `==FIN==`. NO contiene mandatos de edicion de codigo (los ejecuta el pipeline ExploraCO). Validacion downstream: `.opencode/skills/gemini-research/scripts/validate_ficha.js` (fichas) y `scripts/validate_eventos.js` (eventos).
- **Verificado contra archivo real (ADR-006):** la gema existe (154 lineas); el validador canonico solo vive en `.opencode/skills/gemini-research/scripts/` (`scripts/validate_ficha.js` sigue inexistente -> BUG-034 vigente); `exp-pickle-free.md` NO existe en `.opencode/agent/` (solo `exp-pickle.md`).

#### Que sigue

1. **[DEUDA-EXPRESS] Probar la gema (QA manual en Gemini):** pegar el contenido de `GEMINI_GEMA_INVESTIGACION.md`, adjuntar los 3 recursos canonicos, pedir un destino (uno a uno) o un lote de N eventos, y validar la salida con `node .opencode/skills/gemini-research/scripts/validate_ficha.js` y `node scripts/validate_eventos.js`. Cuidado BUG-034: la ruta corta `scripts/validate_ficha.js` NO existe.
2. **[DEUDA-EXPRESS] Referenciar la gema en `.opencode/skills/gemini-research/SKILL.md`** si el operador decide integrarla al skill (hoy se configura directamente desde su ruta).
3. **[DEUDA-EXPRESS] Crear `.opencode/agent/exp-pickle-free.md`:** gap de infraestructura (listado en la matriz del AGENTS.md seccion 1.1, pero el runtime responde "unknown agent type").
4. **Commitear `GEMINI_GEMA_INVESTIGACION.md`** (untracked) junto al proximo pase de docs; no mezclarlo con los commits de codigo.

#### Riesgos activos

- **BUG-034 ABIERTO:** `scripts/validate_ficha.js` inexistente; el canonico vive en `.opencode/skills/gemini-research/scripts/` (drift documental en BLUEPRINT.md seccion 4, DECISIONS.md ADR-016 y 2 SKILL.md).
- **Gap `exp-pickle-free`:** nombre de agente en la matriz de routing gratuita sin archivo; cualquier ruteo a ese agente falla con "unknown agent type".
- **Gema sin QA funcional:** la salida de la gema aun no se valido contra el validador real; es un prompt (no runtime), no bloquea deploy.

### Galeria/hero por votos + Mis mapas personales + guardados de media + propiedad de medios del mapa (2026-09-19) - ADR-046 + ADR-047 / TSK-136..TSK-140

Sesion de correccion sobre la comunidad, el index y la ficha de destino. Verificado contra archivo real (ADR-006) el 2026-09-19: **todo el codigo esta COMMITEADO** (`main` == `origin/main`, HEAD `3ffd7a9` "fotos hero"); el working tree solo tiene 2 archivos **untracked** (`AI-DOS Master Specification v1.1.docx` y el doc de analisis). Decisiones en `DECISIONS.md` **ADR-046** (contrato del hero) y **ADR-047** (regla de propiedad de medios del mapa); tareas en `TASKS.md` **TSK-136..TSK-140**; 7 bugs en `BUGS_HISTORICOS.md` **BUG-071..BUG-077**. NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001/ADR-010) ni migraciones.

**Estado real verificado (ADR-006, 2026-09-19):**
- `git status -sb`: `## main...origin/main` (sin ahead/behind). `git log --oneline -10`: `3ffd7a9`, `41a3f71`, `e7445c3`, `afb3b5d`, `8fe7b47`, `600e656`, `6c84f9d`, `61392c0`, `b4ffd4e`, `f431ccc`.
- Commits de la sesion (por archivo/tema): `6c84f9d` "videos" (`api/interacciones.js`, `api/pagina-destino.js`, `galeria.html`, `mymapa.js`, `scripts/smoke_036_media_unificada.js`); `600e656`/`8fe7b47`/`e7445c3` "mapa" (`mymapa.js`, `comunidad.html`, `mapa-cultural.js`, `index.html`, `scripts/smoke_mapa_cultural.js`, `api/pagina-destino.js`); `afb3b5d` "Update index.html"; `41a3f71` "destinos" (`api/pagina-destino.js`, `scripts/smoke_auditoria_pagina_destino.js`); `3ffd7a9` "fotos hero" (`api/pagina-destino.js`, `mapa-cultural.js`, `comunidad.html`, `index.html`, ambos smokes).
- **SIN commitear (untracked):** `AI-DOS Master Specification v1.1.docx` (raiz) y `exploraco desarrollo/ampliacion desarrollo/ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md` (285 lineas, 17896 bytes, 0 bytes >127).
- Presupuesto de funciones serverless **8/8 INTACTO**; sin migraciones.

**Que se hizo (resumen; anclas ADR-006 en TASKS.md TSK-136..TSK-140):**
- **TSK-136 - Galeria/hero por votos (ADR-046):** `api/pagina-destino.js` L800-872 calcula `mediaRank` (curadas + comunidad, `votos DESC`) una sola vez; contrato final del hero: principal = `foto_hero` editorial, 3 miniaturas = 1 mejor curada + 2 mejores de comunidad por votos; videos/audio nunca al hero (commit `3ffd7a9`, tras la primera iteracion revertida de `41a3f71`). `galeria_destino` y `album_oficial` ordenan por votos (`6c84f9d`); `galeria.html` con `gSortVotos()`.
- **TSK-137 - Mis mapas personales:** barra de categorias `#mm-personal-cats` con `data-cat` (`600e656`); `mymapa.js` pasa el ELEMENTO DOM (no un string) y encuadra/re-renderiza con `invalidateSize` + `fitBounds` + `refresh` (`8fe7b47`); cache-busting `mapa-cultural.js?v=3` -> `?v=4` (`e7445c3`, `3ffd7a9`) y `mymapa.js?v=3` (`8fe7b47`).
- **TSK-138 - Guardados de media:** `mis_guardados_media` con joins `::text` (eran `uuid = text`), rama `curada`, `.catch` con `console.warn`; `multimedia_mapa` expone `media_id`/`fuente`; `mymapa.js` pinta los guardados como pines via `filterMisMapa` (`6c84f9d`). Cierra BUG-071.
- **TSK-139 - Propiedad de medios del mapa (ADR-047):** `filterMediaPropios` en `mapa-cultural.js` (fotos solo del espacio; videos/audio de comunidad por ciudad/10 km) reemplaza `mediasCercanas` (commit `e7445c3`; restaura video/audio en `3ffd7a9`). Cierra BUG-075 y BUG-076.
- **TSK-140 - Doc de analisis:** NUEVO `ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md` con incidentes I1-I8, brechas G1-G12 del AI-DOS v1.1, reglas faltantes P11-P19 de las Reglas de Oro v5 y propuestas para v1.2/v6. **PENDIENTE DE APROBACION del operador; no se toco el `.docx` ni las Reglas de Oro.**

#### Que sigue

1. **Aprobar/aplicar las propuestas de gobernanza (PENDIENTE DE APROBACION del operador):** Reglas de Oro v6 (texto propuesto P2/P5/P6/P9 reescritas + P11-P19 nuevas) y AI-DOS v1.2 (Registro de Implementacion Cap. 4.9, gate de escalamiento Cap. 6.7, presupuesto de costo Cap. 6.13, presupuesto de contexto Cap. 7.11, protocolo de fallo silencioso Cap. 8.13). NO editar los documentos maestros sin aprobacion.
2. **Commitear el documento de analisis y el `.docx`** (hoy untracked): `exploraco desarrollo/ampliacion desarrollo/ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md` y `AI-DOS Master Specification v1.1.docx`.
3. **Validar en vivo (QA visual en navegador, TSK-135 + estas tareas):** hero/galeria por votos, filtros por categoria y media de "Mis mapas personales", guardados pintados como pines, drawer del pin sin fotos ajenas, Videos/Audios del drawer con media de comunidad.
4. **Deploy del release:** `api/interacciones.js`, `api/pagina-destino.js`, `mapa-cultural.js`, `mymapa.js`, `galeria.html`, `comunidad.html`, `index.html` (assets frontend; sin migracion ni backend nuevo).
5. **Confirmar migraciones en Neon:** **023** (`media_guardados.item_id` TEXT) para que `mis_guardados_media` funcione; 019/023 ya referenciadas como pendientes de confirmar en sesiones previas.

#### Riesgos activos

- **Cache de assets:** un fix que cambia `mapa-cultural.js`/`mymapa.js` no llega al usuario si los HTML consumidores no bumpean `?v=N` (BUG-073). Todo HTML que referencie un asset compartido debe versionarlo. El index conserva su CSS inline a proposito (no enlaza `mapa-cultural.css`).
- **Documentos Core de ~1.28 MB:** `TASKS.md` 388 KB + `DECISIONS.md` 366 KB + `NEXT.md` 329 KB + `BUGS_HISTORICOS.md` 150 KB + `BLUEPRINT.md` 65 KB + `PROJECT.md` 39 KB (medido el 2026-09-19). AI-DOS pide leerlos en cada handoff, lo que encarece el contexto; propuesta: indice + tope y separar `NEXT.md` corto del historico (Cap. 7.11 propuesto).
- **Documentacion delegada a modelo pago = 49% del costo:** `informes-cuota/cuota-2026-09-14-dia.md` registra `docs-keeper` (pago) con 214 invocaciones y **$0.3743 sobre $0.7643 (49% del gasto del dia)**; la ruta gratuita (`big-pickle`) registro 13 sesiones a $0.0000. Propuesta: ruta gratuita por defecto y no delegar documentacion masiva a modelo pago (P19 / Cap. 6.13).
- **BUG-061 y BUG-065 siguen ABIERTOS** y ajenos a esta sesion; BUG-002 (doble escape) sigue como deuda preexistente.
- **QA visual y shape real de `?tipo=mapa` sin validar contra Neon** (el smoke es Node con datos simulados).



Feature **COMPLETADA en working tree para el index** (TSK-134, SIN commitear) sobre la base ya commiteada de la comunidad (TSK-133, commit `b4ffd4e` "maps"). Verificado contra archivo real (ADR-006) el 2026-09-19. Origen: pedido directo del usuario de "Mis mapas personales (comunidad) con paridad al mapa cultural del index". La decision vive en `DECISIONS.md` **ADR-045** (con enmienda TSK-134); las tareas en `TASKS.md` **TSK-133** (comunidad) y **TSK-134** (index). NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001/ADR-010) ni migraciones.

**Estado real del working tree (verificado, ADR-006, 2026-09-19):**
- `git status`: `M index.html`, `M mapa-cultural.js`, `M scripts/smoke_mapa_cultural.js` (TSK-134, sin commitear). TSK-133 ya esta en `b4ffd4e`.
- `mapa-cultural.js`: **v1.1.0** (68417 bytes), 0 bytes >127, `window.MapaCultural` L1597, API multi-instancia (`create`/`init` + `setPlaces`/`setMedia`/`setMediaEnabled`/`setMediaTypes`/`refresh`/`getMap`/`openDrawer`/`closeDrawer`/`destroy`) + helpers; `jsonAuthHeaders` L1354. Opciones nuevas v1.1.0 con default = comportamiento comunidad: `enableMediaOnAll`, `mediaEnabled`, `mediaFilter` (null = estricto; `false` = SIN filtro), `mediaPhotoIcon`, `clusterLinksNavigate`, `mediaControls`, `bindList`, `data-comments-*`.
- `mapa-cultural.css`: 16112 bytes, 121 reglas / 121 llaves, 0 `!important` reales, scope `.mc-root`. **NO se enlaza en `index.html`** (0 refs; su CSS inline se conserva a proposito).
- `scripts/smoke_mapa_cultural.js`: **58/58 PASS** (`node scripts/smoke_mapa_cultural.js` -> `SMOKE MAPA CULTURAL: OK`).
- `mymapa.js`: +154/-46 (commit); `MapaCultural.create` L125; sin `bindPopup` propio.
- `comunidad.html`: +17/-0 (commit); `<link>` L14, `<script>` L559 (antes de `mymapa.js` L561).
- `index.html`: **MIGRADO a `mapa-cultural.js`** (TSK-134, +79/-1152); `<script src="mapa-cultural.js">` L882; shims `initMapaSection` (retry), `refreshMapaMarkers` (sin recursion), `geolocateMapa`, `resetMapaColombia`, `openMapaDrawer`/`closeMapaDrawer`, `INDEX_MC_OPTS` (L2254), `var mcMapa` (L2252) + carga lazy; conserva `mapaMap` (`onMapReady`) y el CSS inline.
- `api/*` / `index-api-connector.js`: SIN CAMBIOS (diff vacio).

**Que se hizo (resumen; ver TASKS.md TSK-133/TSK-134 para anclas ADR-006):**
- **TSK-133 - Motor compartido:** pines por categoria, clustering por proximidad de 40 px, drawer completo (hero/badge/rating/precio/lead/tabs multimedia/"Ver lugar completo"), capa de media (iconos, bounds, tope 300, dedupe) y lightbox/album; normalizacion unica `normalizePlace`/`normalizeMedia`.
- **TSK-133 - Paridad:** tiles CARTO Voyager + clustering 40 px + drawer completo al clic en pin.
- **TSK-133 - Capa de media:** solo items de los destinos del mapa activo (match estricto por slug; `origen='album'` excluido), un unico fetch cacheado a `?tipo=multimedia_mapa`, default ON si el mapa activo tiene media.
- **TSK-133 - `mymapa.js`:** consume `MapaCultural`, retira su Leaflet propio y `bindPopup`.
- **TSK-134 - Migracion del index:** retira ~1190 lineas de motor inline (bloque 2256-3445) y estado muerto; deja shims que preservan los puntos de enganche (`initMapaSection`/`refreshMapaMarkers`) y el contrato `window.mapaMap` via `onMapReady`; quita los 4 `onclick` de `[data-media]` (los engancha el modulo via `mediaControls`).
- **TSK-134 - Opciones de compatibilidad v1.1.0:** `INDEX_MC_OPTS` usa `enableMediaOnAll:true`, `mediaEnabled:false`, `mediaFilter:false` (capa = toda `MAPA_MEDIA`), `mediaPhotoIcon` U+1F4F8 (camara) y `clusterLinksNavigate:true`; el default del modulo sigue siendo el de comunidad.
- **Mitigacion BUG-061:** `guardarMedia`/`votarMedia` envian `Authorization` via `jsonAuthHeaders()` (backend sigue ABIERTO), ahora tambien desde el mapa del index.

#### Que sigue
1. **QA visual en navegador (TSK-135):** validar el `index.html` migrado (clustering 40 px, popup de cluster, `flyTo`/`bounds`, lightbox/album, coexistencia del CSS `.md-*` inline con el modulo scopado bajo `.mc-root` y el doble handler de cierre inofensivo) y el tab Mapa de `comunidad.html` (drawer, toggle de media, lightbox). El smoke es Node vm (mock) y NO cubre render real.
2. **Validar el shape real de `?tipo=mapa` contra Neon** (el smoke cubre ambos shapes; falta dato real de la tabla).
3. **Commit + push + deploy** del release: `index.html`, `mapa-cultural.js` y `scripts/smoke_mapa_cultural.js` (sobre TSK-133 ya commiteada en `b4ffd4e`); assets frontend, no requieren migracion ni backend. No mezclar ajenos.
4. **Comandos de verificacion:** `node scripts/smoke_mapa_cultural.js` (58/58 PASS) y Escudo GOLD (`node --check mapa-cultural.js`, `node --check mymapa.js`, ASCII 0 bytes >127 en los 3 nuevos, divs `index.html` 370/370, divs `comunidad.html` 319/319, llaves CSS 121/121).

#### Riesgos activos
- **BUG-061 ABIERTO:** la mitigacion con Bearer no corrige el backend de `guardar_media`/`tipo='foto'`; escalado a `sql-security`.
- **QA visual en navegador pendiente (TSK-135):** el smoke es Node vm (mock); validar en real antes de dar por cerrado el release.
- **Shape de `?tipo=mapa` no validado con datos reales de Neon.**
- **Deuda cosmetica/UX aceptada en el index:** notas de geolocalizacion en ASCII sin tildes (ADR-002) y ausencia del estado transitorio "Buscando..." del boton "Cerca de mi"; el escape de texto en popup/lista es endurecimiento (no regresion).

### Sesion express TSK-124..TSK-132 "UI de perfil/galeria/comunidad + media + modo express" (2026-09-18/19) - sin ADR nuevo (nota de practica)

Sesion ejecutada en **"modo express"** con la skill `express-mode` (TSK-132): briefs quirurgicos por dominio, verificacion local proporcional al riesgo y cierre documental diferido a este unico pase. Las 9 tareas (TSK-124..TSK-132) estan registradas en `TASKS.md`. NO nace un ADR de arquitectura nuevo: el modo express se registra como **nota de practica operativa** en `DECISIONS.md` (el detalle vive en `exploraco desarrollo/ampliacion desarrollo/MODO_EXPRESS_ANALISIS.md`).

**Estado real del working tree (verificado, ADR-006, 2026-09-19):**
- `git status -sb`: `main...origin/main [ahead 1]`. El unico commit local sin push es **`dfde7e7` "media"**.
- Commits de la sesion (YA COMMITEADOS, contra lo que decia el contexto de relevo): `26d2e3c` / `66db2e6` / `604fa0d` (`mi-perfil.html`), `d309e17` (popup en `comunidad.html`), `b41e3ba` (`galeria.html` + `api/interacciones.js`), `68e50a4` (`mymapa.js` + 95 archivos), `dfde7e7` (media + diagnosticos/cleanup + smoke J21).
- **SIN commitear (working tree):** `api/interacciones.js` (LIMIT por rama de `multimedia_mapa`), `api/pagina-destino.js` (votos de viajero a `media_votos`), `agents.md`, `exploraco desarrollo/ampliacion desarrollo/GUIA_DE_DESARROLLO.md` y `.../orquestacion agentes.md`.
- **Sin versionar (untracked):** `.opencode/skills/express-mode/`, `MODO_EXPRESS_ANALISIS.md`, `SKILL_MODO_EXPRESS.md`, `scripts/diagnose_video_mapa.js` y `scripts/express_check.js`.
- Presupuesto de funciones serverless **8/8 INTACTO** (ADR-010); no hay migraciones nuevas en esta sesion.

**Que se hizo (resumen; anclas ADR-006 en TASKS.md TSK-124..TSK-132):**
- **TSK-124 (`26d2e3c`):** `mi-perfil.html` elimina "Fotos publicadas" (`#mis-fotos-title`/`#mis-fotos-grid`, `esCuentaFotosPublicadas()`, `cargarMisFotos()`).
- **TSK-125 (`d309e17`):** `comunidad.html` gana `abrirMediaModal(f)` + `avMediaHTML(item, large)`, reusando `#av-album-modal`/`#av-album-bar-title` y la barra de acciones de `media-actions.js` (feed de "Media reciente" y modal de album).
- **TSK-126 (`b41e3ba`):** `galeria.html` separa curadas (`g-sec-dest`, paginadas 12/pagina en cliente) y comunidad (`g-sec-com`); `galeria_destino` deja de truncar a 12 (`gdFotos.slice(0,12)` -> `gdFotos.forEach`).
- **TSK-127 (`66db2e6` + `604fa0d`):** nav "Clase" -> "Progreso", titulo "Arbol de Progreso"; se retiran `#pf-clase`/`#modal-clase`, Tabla de Destino (`renderTablaSVG`/pseudo-tab `senderos`) y grilla de Vocaciones; todo se absorbe en el Arbol con host `#arbol-body` (ADR-043/BUG-066).
- **TSK-128 (`68e50a4`):** NUEVO `mymapa.js` (`window.MyMap`) integrado al tab Mapa de `comunidad.html`; `index.html` retira `#mymapa-section` (-265 lineas) y ~93 HTML repuntan el ancla `index.html#mymapa-section` -> `mi-perfil.html` (95 HTML la tenian; 2 backups la conservan).
- **TSK-129 (`dfde7e7`):** `museo_recurso` POST captura `23505` y reactiva/publica la fila oculta sin XP; `album_agregar_foto` escribe `visible` default true y dedup republicable; NUEVOS `scripts/diagnose_media_oculta.js`, `db/cleanups/003_publicar_media_oculta.sql`, `scripts/diagnose_video_mapa.js`; `smoke_036_media_unificada.js` J21 con ventana 900 -> 2400.
- **TSK-130 (working tree):** `multimedia_mapa` aplica LIMIT por rama (album 300, destinos 300, global 600) para no desplazar la media de usuarios.
- **TSK-131 (working tree):** la ficha de destino cuenta votos de fotos de viajero desde `media_votos` (fuente `viajero_foto`), no del legacy `interacciones.dims->>'voto_foto_id'`.
- **TSK-132 (working tree):** NUEVA skill `.opencode/skills/express-mode/SKILL.md` + manual `MODO_EXPRESS_ANALISIS.md` + `SKILL_MODO_EXPRESS.md` + `scripts/express_check.js`; actualizados `agents.md`, `GUIA_DE_DESARROLLO.md` y `orquestacion agentes.md`.

#### Que sigue

1. **PENDIENTES OPERATIVOS (BLOQUEANTES de dato/deploy).** Requieren Neon/`DATABASE_URL` y los ejecuta Javier:
   - Aplicar `db/migrations/027_zonas_marcas.sql` (sesion previa) y los cleanups `db/cleanups/002_fix_fotos_brsk84.sql` y **`db/cleanups/003_publicar_media_oculta.sql`** (idempotentes; respaldo previo).
   - Correr `scripts/diagnose_fotos_brsk84.js`, `scripts/diagnose_media_oculta.js` y `scripts/diagnose_video_mapa.js` con `DATABASE_URL` (solo lectura).
   - Confirmar que las migraciones **019** (`media_guardados`) y **023** (`media_votos`) estan aplicadas; sin ellas el guardado y los votos degradan en silencio.
   - **Deploy** de `api/interacciones.js` y `api/pagina-destino.js`; el frontend de TSK-124..129 ya esta en los commits locales.
2. **Push de `dfde7e7`** y commit de los cambios de TSK-130/TSK-131 + assets/docs del modo express (hoy untracked).
3. **Verificacion en vivo:** media de usuario visible en el mapa cultural, votos de viajero correctos en la ficha, popup de "Media reciente", "Mi Museo" fuera de la grilla de comunidad y galeria en 2 bloques.
4. **Versionar el smoke de `media-actions.js`** (deuda D-14) y evaluar migrar `index.html` a `media-actions.js` (D-13).
5. **Resolver `[DEUDA-EXPRESS]`** (abajo) en un pase dedicado (no en express).

#### Riesgos activos

- **Migraciones 027/002/003 sin aplicar y 019/023 por confirmar:** la media puede seguir invisible o degradar de forma silenciosa (patron BUG-021/BUG-060/BUG-065).
- **BUG-065 ABIERTO:** el INSERT legacy de `album_agregar_foto` quedo corregido, pero la deuda historica de visibilidad y los conteos de mision sin `visible=true` persisten.
- **BUG-061 ABIERTO y AMPLIFICADO:** los botones de `media-actions.js` y los nuevos accesos de media siguen enviando `body.usuario_id` sin Bearer (escalar a `sql-security`).
- **BUG-002 ABIERTO (preexistente, ajeno):** `api/pagina-destino.js` ~L2431 conserva 1 doble escape real (`'\\u2605'` en `addRvOptimista`).
- **FAIL preexistente `A3d`** de `scripts/smoke_038_casas_clases.js` (ajeno a esta sesion; distinguir de regresion nueva).
- **`fotosAlbum` sin filtro `af.visible=true`** en `api/pagina-destino.js` (~L2674): leak menor de visibilidad respecto de ADR-039 (ver deuda abajo).
- **Header drift:** `api/interacciones.js` sigue rotulado v23 y `api/pagina-destino.js` `v12.20260917` (cambios aditivos sin bump; correcto, pero anotar en el commit).

#### `[DEUDA-EXPRESS]` (registrada, NO se arregla durante express)

- JS muerto `mm*` en `index.html` (`MM_PINS` L1239 y residuos de `renderMyMap`/seccion retirada).
- Anclas `mymapa-section` en backups (`index_pre_full.html`, `_lacandelaria3_body.html`).
- Boton "+ Mapa" de las tarjetas sin UI destino: migrar a `comunidad.html` (hoy sin consumidor).
- Capa "Media" del mapa cultural apagada por defecto: decidir si se enciende.
- `fotosAlbum` sin filtro `af.visible=true` (leak menor, ADR-039).
- Backfill de votos legacy de fotos de viajero si aparecen registros historicos fuera de `media_votos`.
- D-13/D-14 de ADR-044: `index.html` con `media_voto` inline y smoke de `media-actions.js` sin versionar.

### Sesion TSK-123 "Correccion Comunidad > Audiovisual" (2026-09-18) - ADR-044

Tarea TSK-123 **IMPLEMENTADA EN WORKING TREE** (SIN commitear; verificado contra archivo real, ADR-006, el 2026-09-18). Origen: reporte directo del usuario (Media reciente en modo read-only + album auto-creado "Mi Museo" en la grilla). La decision vive en `DECISIONS.md` **ADR-044** (abstraccion compartida `media-actions.js`); la tarea en `TASKS.md` TSK-123. NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001/ADR-010); SI hay 1 asset frontend nuevo sin versionar (`media-actions.js`).

**Estado real del working tree (verificado, ADR-006, 2026-09-18):**
- `git status`: `M api/interacciones.js`, `M comunidad.html`, `M galeria.html`; untracked `?? media-actions.js`.
- `media-actions.js`: 259 lineas, 11033 bytes, 0 bytes >127; expone `window.MediaActions.voto` L161 / `guardar` L194 / `sync` L224 / `bind` L236.
- `api/interacciones.js` header real **v23** SIN bump (los cambios son aditivos); anclas: `mi_feed_fotos` L4853-4912, `albumes` + `excluir_museo` L4252-4293, `album_detalle` L4296-4364.
- `comunidad.html`: `avUidActual` L565, modal de album L1929-1975, `cargarAudiovisual` L2022-2026, `cargarAlbumesAV` L2032-2058, `feedCardAV` L2145-2164; script `media-actions.js` L499; divs 307/307.
- `galeria.html`: script `media-actions.js` L242, bind/sync L563-565; divs 84/84.
- No existe script de smoke con `MediaActions`/`media-actions` en `scripts/` (deuda D-14).

**Que se hizo (resumen, ver TASKS.md TSK-123 para anclas ADR-006):**
- **Backend aditivo:** `mi_feed_fotos` acepta `usuario_id` opcional y devuelve `autor_id`/`es_propia`/`ya_votado`/`ya_guardado`; `albumes` con `excluir_museo=1` opt-in; `album_detalle` devuelve `ya_guardado`/`es_propia`.
- **`media-actions.js` (NUEVO):** abstraccion de voto/guardado extraida de `galeria.html`; contrato `data-ma-*` y API `window.MediaActions`.
- **`galeria.html`:** refactor para consumir el modulo; se eliminan las 4 funciones inline duplicadas; comportamiento preservado.
- **`comunidad.html`:** barra interactiva en el feed y en el modal de album; `excluir_museo=1`; `usuario_id` en los fetch.
- **Fix BUG-067:** `cargarAlbumesAV(!reset)` corrige la duplicacion de albumes al cambiar de orden.

#### Que sigue
1. **Confirmar/aplicar en Neon las migraciones 019 (`media_guardados`) y 023 (BLOQUEANTE).** Sin la 019 el guardado real degrada a `ya_guardado=false`; sin la 023, votos/comentarios del feed degradan. Lo ejecuta Javier (no hay `DATABASE_URL` local). La 024/025 ya se consideran aplicadas; el orden de release vigente sigue 024 -> 025 -> 026 -> 027 -> backend -> frontend.
2. **Deploy del backend + frontend en el release pendiente:** `api/interacciones.js` v23 (junto con el resto), `media-actions.js`, `comunidad.html` y `galeria.html`.
3. **Verificacion en vivo:** like/comentar/guardar en "Media reciente" y en las fotos del modal de album; confirmar que "Mi Museo" no aparece en "Albumes de la comunidad"; validar el guardado real (con 019/023) y la coherencia de `es_propia` (403 al votar lo propio).
4. **Versionar el smoke de `media-actions.js`** (`scripts/smoke_media_actions.js`) para que el Escudo GOLD lo reproduzca (D-14).
5. **Encapsular las `opts` por-root de `MediaActions`** si aparece un tercer consumidor con opts distintas (D-10).
6. **Migrar `index.html` a `media-actions.js`** cuando se toque su capa de media (D-13).
7. **Endurecer `guardar_media`/`quitar_guardado_media` y la lectura por `usuario_id`** (BUG-061 / D-11) en la tarea de seguridad.
8. **Commit + push del release** incluyendo el nuevo `media-actions.js` (hoy untracked); NO mezclar archivos ajenos del working tree.

#### Riesgos activos
- **Migraciones 019/023 sin confirmar:** el feed y el detalle degradan de forma silenciosa a `ya_guardado=false`; el guardado real no se puede validar hasta aplicarlas (patron BUG-021/BUG-060).
- **BUG-061 AMPLIFICADO:** los botones Guardar de `media-actions.js` siguen enviando `body.usuario_id` sin Bearer; mas superficie para el mismo vector de suplantacion.
- **BUG-065 ABIERTO:** la media subida por el endpoint legacy `album_agregar_foto` nace `visible=false` y NO aparece en el feed (`mi_feed_fotos` filtra `af.visible=true`), aunque la mision la cuente.
- **D-10 latente:** las `opts` de `MediaActions` son de modulo (el ultimo `bind` gana); inocuo hoy (2 roots con las mismas opts) pero fragil si crece el numero de consumidores.
- **D-14:** el smoke 41/41 no esta versionado; el Escudo GOLD no reproduce esa evidencia.
- **Header sin drift:** `api/interacciones.js` sigue rotulado v23 (correcto: los cambios son aditivos, no requerian bump).

### Sesion TSK-119..TSK-122 "Modulos nuevos + bugs activos" (2026-09-18) - ADR-042 + ADR-043

Tareas TSK-119 (paquete DB-01/DB-02 + BE-02 + FE-01/FE-02/FE-03 + remediacion de fotos), TSK-120 (`marca_activar`), TSK-121 (`marca_patrocinar`) y TSK-122 (`mi_marca`) **IMPLEMENTADAS EN WORKING TREE** (SIN commitear; verificado contra archivo real, ADR-006, el 2026-09-18). Origen: paquete `prompt.md` (untracked) "Modulos nuevos + bugs activos". Las decisiones viven en `DECISIONS.md` **ADR-042** (esquema zonas/marcas/patrocinios) y **ADR-043** (patron de UI derivado de FE-02); las tareas en `TASKS.md` TSK-119..TSK-122. NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001/ADR-010); SI hay 4 archivos nuevos sin versionar.

**Estado real del working tree (verificado, ADR-006, 2026-09-18):**
- Existen `db/migrations/027_zonas_marcas.sql` (348 lineas), `scripts/verify_027_precheck.js` (258), `scripts/diagnose_fotos_brsk84.js` (310) y `db/cleanups/002_fix_fotos_brsk84.sql` (151).
- `api/usuarios.js` (1398 lineas, header **v18 SIN bump**): `GET mi_marca` L296-306, `marca_activar` L1192-1232, `marca_patrocinar` L1234-1266; `c.tipo === 'marca_` = 2.
- `api/pagina-destino.js` L2644: `destinos_fotos ... LIMIT 200` (1 ocurrencia).
- `mi-perfil.html`: `#arbol-body` L957, `#pf-clase` L956, titulo "Clase & Arbol de Progreso" L953, `esCuentaFotosPublicadas` L2143; divs 446/446.
- `index.html`: `.mpa-media-pin-video` L544/L2996 (2 ocurrencias); divs 523/523.
- `git status`: `M api/pagina-destino.js`, `M api/usuarios.js`, `M index.html`, `M mi-perfil.html`, `D prompt_maestro_comunicacion_casas.md` (borrado AJENO); untracked `db/cleanups/002_fix_fotos_brsk84.sql`, `db/migrations/027_zonas_marcas.sql`, `prompt.md`, `scripts/diagnose_fotos_brsk84.js`, `scripts/verify_027_precheck.js`.

**Que se hizo (resumen, ver TASKS.md TSK-119..TSK-122 para anclas ADR-006):**
- DB-01/DB-02: migracion 027 (zonas/areas/ranking_zonas/marcas/patrocinios + extension `consumibles` + vista `consumibles_precio`), con `patrocinios.objetivo_id` polimorfico SIN FK (deuda) y `areas_geograficas` vacia.
- BE-01: 3 ramas en `api/usuarios.js` con JWT (`validarSesionUsuario`) y gate `calcularNivel(xp_total).nivel >= 5`; MERGE JSONB con `||`.
- BE-02: fix R10 en `api/pagina-destino.js` (`LIMIT 24 -> 200`).
- FE-01: "Fotos publicadas" conservada pero visible SOLO para `brsk84@gmail.com` (desviacion O1 del prompt, que proponia eliminar/condicionar).
- FE-02: fusion "Mi Clase" -> "Arbol de Clases" + FIX de regresion con `#arbol-body` (BUG-066).
- FE-03: `.mpa-media-pin-video` para video individual en el mapa.
- Remediacion: `db/cleanups/002` + `diagnose_fotos_brsk84.js` (BUG-065).

**Escudo GOLD (2026-09-18):** `node --check` 4 `.js` OK; ASCII 0 bytes >127 en `.js`/`.sql`; divs 446/446 (`mi-perfil`) y 523/523 (`index`); `c.tipo === 'marca_` = 2; `mpa-media-pin-video` = 2; `destinos_fotos ... LIMIT 200` = 1; ids unicos.

#### Que sigue
1. **APLICAR `db/migrations/027_zonas_marcas.sql` en Neon (BLOQUEANTE, lo ejecuta Javier).** Correr antes `node scripts/verify_027_precheck.js` (read-only) y las secciones 0/final del `.sql`; re-ejecutar es no-op. Sin la 027, `marca_activar`/`marca_patrocinar`/`mi_marca` fallan por tabla inexistente (patron BUG-021/BUG-060).
2. **APLICAR `db/cleanups/002_fix_fotos_brsk84.sql`** (respaldo previo bloque [0]; idempotente; NO borra filas).
3. **Correr `node scripts/diagnose_fotos_brsk84.js` con `DATABASE_URL`** para confirmar la causa de las 5 fotos de brsk84.
4. **Decidir auth de `GET mi_marca`:** hoy es lectura publica por `usuario_id` (ADR-042, decision g pendiente).
5. **Decidir si `marcas.nivel_requerido` gobierna el gate** (hoy hardcodeado a nivel 5 con `calcularNivel(xp_total)`).
6. **Deduplicar `areas_influencia`:** el MERGE `||` puede duplicar slugs en reenvios.
7. **Sembrar `areas_geograficas` con lat/lng reales (OSM)** y decidir el radio de asignacion automatica.
8. **BUG-065 ABIERTO:** agregar `visible` al INSERT de `album_agregar_foto` (`api/interacciones.js` ~L6663-6667) y filtrar por `visible`/`activo` en los conteos de mision.
9. **BUG-002 ABIERTO** (doble escape `\u` en `api/pagina-destino.js` L2431); **BUG-061 y BUG-062 ABIERTOS** (ajenos).
10. **Commit + push + deploy** del paquete. **Higiene de working tree:** NO mezclar el borrado ajeno `prompt_maestro_comunicacion_casas.md` ni el untracked `prompt.md`.

#### Riesgos activos
- **Migracion 027 CREADA y aun no aplicada en Neon:** desplegar las ramas `marca_*`/`mi_marca` sin la 027 da error de tabla inexistente (mismo flujo que 017/021).
- **`areas_geograficas` vacia:** el ranking territorial no tiene insumo hasta sembrar areas con lat/lng.
- **`patrocinios` sin integridad referencial:** `objetivo_id` puede quedar huerfano; el backend solo valida el tipo, no la existencia del objetivo.
- **Datos de patrocinio inertes:** `xp_aportada`/`fama_bonus` se persisten pero no se acreditan a nadie en v1.
- **Header drift (ADR-006):** `api/usuarios.js` sigue rotulado v18 y `api/pagina-destino.js` no subio por el fix de 1 linea; corregir en el commit.
- **BUG-066 CERRADO** (regresion FE-02); mismo patron de UI anidada que BUG-020/TSK-065 -> ver ADR-043 para prevencion.
- **`mi_marca` sin auth:** superficie enumerable por `usuario_id`; decision pendiente.

### Sesion TSK-118 "Comunicacion oficial + Casas + Admin Mapa" (2026-09-18) - ADR-041

Tarea TSK-118 **IMPLEMENTADA EN WORKING TREE + HOTFIXES POST-QA** (SIN commitear;
verificado contra archivo real, ADR-006, el 2026-09-18). La decision consolidada vive en
`DECISIONS.md` **ADR-041** (decisiones a-h de la sesion; la tarea en `TASKS.md`
TSK-118; el relevo corto en `docs/HANDOFF_041.md`). NO hay archivos nuevos en
`api/` (8/8 intacto, ADR-001/ADR-010); SI hay 1 migracion nueva sin versionar
(`db/migrations/026_casas_comunicaciones.sql`, 329 lineas).

**Estado real del working tree (verificado, ADR-006, 2026-09-18):**
- `db/migrations/026_casas_comunicaciones.sql`: **EXISTE** (329 lineas;
  idempotente ADR-008; ASCII-safe ADR-002: 0 bytes >127 y 0 backticks).
- Headers reales: `api/usuarios.js` **v18** (v17 + hotfix J-3);
  `api/interacciones.js` **v23** (base v22 de ADR-039/ADR-040 + hotfixes
  post-QA J-1/J-2; entrada de changelog v23 en L18, la linea-titulo L1 aun
  rotula v22).
- Anclas `api/interacciones.js`: `acreditarClaseYCofre` L338-345,
  `avanzarMisionesCasa` L360, `chat_salas` con `es_oficial` L3518,
  `casa_misiones` L5270, `anuncio_oficial` L5769, `casa_tributo_config` L5797.
  Authz J-2: `validarSesion` en L5835. Degradacion J-1: L3537-3539
  (`chat_salas`) y L5724-5729 (`chat_msg`). Ancla J-3 en `api/usuarios.js`:
  `CR_LIDER_REFRESH_MS` L241 y throttle L612-625.
- `usuario-session.js`: `TITULOS_POR_NIVEL` L82, `getEra` L106, modales L116+.
- `map-picker.js`: `getPickerMap`/`getMiniMap` L267-268; `admin.html` L1718/L2129/L4768+.
- `git status` (2026-09-18): `M api/interacciones.js`, `M api/usuarios.js`,
  `M usuario-session.js`, `M comunidad.html`, `M admin.html`, `M map-picker.js`;
  sin versionar `?? db/migrations/026_casas_comunicaciones.sql`. La migracion
  024 y la 025 se consideran **YA APLICADAS** en Neon por indicacion del usuario
  (2026-09-18).

**Que se hizo (resumen, ver TASKS.md TSK-118 para anclas ADR-006):**
- **Canal oficial (decisiones c, h):** `chat_salas.es_oficial` + canal "Anuncios
  ExploraCO" (en la 026); `GET chat_salas` expone `es_oficial` con degradacion
  42703 (hotfix J-1); `chat_msg`
  bloquea 403 a no-admin en la sala oficial (Bearer `ADMIN_SECRET` o email
  `brsk84@gmail.com`) y tambien degrada 42703; NUEVA rama `POST ?tipo=anuncio_oficial` (solo Bearer
  `ADMIN_SECRET`); `comunidad.html` con badge "OFICIAL", pin al tope y bloqueo
  de input. **NO se agrega `usuarios.rol`.**
- **Casas (decisiones d, e, g):** NUEVA rama `POST ?tipo=casa_tributo_config`
  (admin o `lider_user_id`, rango 0..15; hotfix J-2: el lider exige
  `validarSesion`); el tributo de `acreditarClaseYCofre`
  ya no es `0.10` literal sino `casas_cofre.tributo_pct` (default 10, clamp
  0..15); `GET casa_ranking` (v18) expone `lider_user_id`/`tributo_pct` con
  degradacion escalonada y refresco perezoso del lider, con throttle de 60 s
  por instancia (hotfix J-3); misiones conjuntas con
  `avanzarMisionesCasa` (hooks en foto/resena/visita/xp_total) y GET unico
  `?tipo=casa_misiones`.
- **Eras y titulos (decision f):** 20 titulos + 4 eras + `getEra` y modales de
  nivel-up/cambio de era en `usuario-session.js`; "Ampliar info" dispara
  `#btn-perfil-viajero` (NO se creo `abrirPerfil`).
- **Admin mapa (decision b):** picker a 500 px + circulo vectorial de rango via
  `MapPicker.getPickerMap()` (NO se asume `MapPicker._map`).

#### Que sigue
1. **APLICAR `db/migrations/026_casas_comunicaciones.sql` EN NEON (BLOQUEANTE,
   lo ejecuta Javier).** Correr primero el PREFLIGHT (seccion 0 del `.sql`,
   read-only) y luego el archivo COMPLETO en el editor SQL de Neon;
   re-ejecutar es no-op. La **024 y la 025 se consideran YA aplicadas** por
   indicacion del usuario (2026-09-18); su registro historico como pendientes
   (sesiones TSK-112/TSK-114) se conserva (Regla de Oro 3). **Orden obligatorio
   del release: 024 -> 025 -> 026 -> backend (interacciones.js v23 + usuarios.js
   v18) -> frontend.**
2. **Deploy del backend DESPUES de la 026:** `api/usuarios.js` **v18** +
   `api/interacciones.js` **v23** (J-1/J-2 sobre la base v22 no desplegada de
   ADR-039/ADR-040; J-3 en usuarios v18).
3. **Deploy del frontend:** `usuario-session.js`, `comunidad.html`,
   `admin.html` y `map-picker.js`.
4. **Verificacion en vivo:** publicar un anuncio oficial y confirmar que un
   tercero NO puede escribir en el canal (input oculto + 403 server-side);
   configurar `tributo_pct` como admin/lider y ver el efecto en el cofre
   (confirmar que un `usuario_id` ajeno SIN JWT recibe 403, hotfix J-2);
   confirmar `lider_user_id` en `casa_ranking` y la fila `lider` en
   `casa_roles`; avanzar una mision de Casa; ver los modales de nivel-up/era;
   ver el circulo de rango en el admin con un `radio_m` real.
5. **Commit + push del release:** incluye los pendientes de TSK-107..TSK-117 +
   esta sesion + el cierre documental (`TASKS.md`, `NEXT.md`, `DECISIONS.md`
   ADR-041, `PROJECT.md`, `BLUEPRINT.md`, `BUGS_HISTORICOS.md`,
   `docs/HANDOFF_041.md`). NO mezclar archivos ajenos/borrados del working tree.
6. **Backlog / deuda:** misiones base diferenciadas por Casa; asignacion de
   roles `oficial`/`mariscal`/`miembro`; corregir la linea-titulo L1 de
   `api/interacciones.js` (aun `v22`; el changelog ya entro a `v23`); BUG-061
   (AMPLIFICADO por los hooks de Casa), BUG-002 y BUG-062 siguen abiertos.

#### Riesgos activos
- **Migracion 026 CREADA pero aun no aplicada en Neon:** desplegar el backend
  v23/v18 sin la 026 haria fallar `anuncio_oficial`, `casa_tributo_config`,
  `casa_misiones` y las columnas `lider_user_id`/`tributo_pct` (columna
  inexistente, mismo flujo que 017/021). El hotfix J-1 evita la caida de
  `chat_salas`/`chat_msg`, pero la 026 SIGUE siendo obligatoria. El orden
  024 -> 025 -> 026 -> deploy es obligatorio.
- **Linea-titulo L1 de `interacciones.js` aun v22:** el changelog ya entro a
  v23; drift documental menor (ADR-006) a corregir en el commit.
- **J-3 mitigado, no eliminado:** el throttle del refresco del lider es por
  instancia (no distribuido); con N instancias hay hasta N refrescos/min.
- **J-1/J-2 verificados solo en working tree:** los hotfixes no se han probado
  en vivo; la authz por `validarSesion` y la degradacion 42703 deben
  confirmarse con el backend desplegado.
- **Normalizacion silenciosa del tributo:** un `tributo_pct` invalido en la
  columna se normaliza a 10 en runtime sin log; el CHECK 0..15 lo acota.
- **`casa_roles` solo puebla `lider`:** los otros roles del CHECK no tienen
  flujo de asignacion en v1 (no bloqueante).
- **Circulo de rango sin validar en produccion:** depende del deploy; validar
  en desktop y movil.
- **BUG-061 sigue ABIERTO y AMPLIFICADO:** `POST tipo='foto'` no valida sesion
  y los hooks `avanzarMisionesCasa` (foto/resena/visita) escriben a nombre del
  `usuario_id` recibido. **BUG-002 y BUG-062 siguen ABIERTOS** (ajenos a esta
  sesion).

### Sesion TSK-114..TSK-117 "Museo URL-only + acordeon de niveles + localizacion y map-picker" (2026-09-18) - ADR-039 + ADR-040 + ENMIENDA 1 de ADR-039

Tareas TSK-114 (Museo URL-only + backend v22 + migracion 025), TSK-115 (acordeon
de niveles / ADR-040), TSK-116 (UI Museo + localizacion T5/T7) y TSK-117
(`map-picker.js`) **IMPLEMENTADAS EN WORKING TREE** (SIN commitear; verificado
contra archivo real, ADR-006, el 2026-09-18). Las decisiones viven en
`DECISIONS.md` ADR-039 + **ENMIENDA 1 de ADR-039** y ADR-040; las tareas en
`TASKS.md` TSK-114..117. NO hay archivos nuevos en `api/` (8/8 intacto,
ADR-001/ADR-010); SI hay 1 migracion nueva (025), 2 assets frontend nuevos
(`niveles-data.js`, `map-picker.js`) y 2 scripts nuevos.

**Estado real del working tree (verificado, ADR-006, 2026-09-18):**
- `api/interacciones.js` **v22** (header real L1-17; release compartido ADR-039 +
  ADR-040 + T4.5). `db/migrations/025_album_fotos_visible.sql` **EXISTE** (171
  lineas). Existen `niveles-data.js` (9363 bytes), `map-picker.js` (11188),
  `scripts/smoke_niveles_data.js` y `scripts/verify_025_precheck.js`.
- Catalogo real de misiones: **41** (`id: 'mis_` x41); `mis_videografo`
  ("Cronicas en Movimiento") y `mis_sonidista` ("Ecos y Relatos") con `xp:15` y
  `gate_nivel:2`. Anclas: `api/interacciones.js` L1304/L1319 (misiones),
  L376/L387 (`MISION_GATE_XP`/`nivelDeMisionServidor`), L3695-3777 (GET
  `museo_recurso`), L6197-6415 (POST `museo_recurso`), L3596/L3598/L4223/L4226/
  L4251/L4267/L4386/L4678/L4794/L4822/L4881 (filtros `visible`).
- `git status` (2026-09-18): `M api/interacciones.js`, `M mi-perfil.html`,
  `M admin.html`, `M scripts/smoke_021_xp_decimal_rankings.js`,
  `M scripts/smoke_038_casas_clases.js`, `M scripts/smoke_test_gamificacion_v4.js`,
  `M exploraco desarrollo/DECISIONS.md`; sin versionar
  `?? db/migrations/025_album_fotos_visible.sql`, `?? niveles-data.js`,
  `?? map-picker.js`, `?? scripts/smoke_niveles_data.js`,
  `?? scripts/verify_025_precheck.js`.

**Que se hizo (resumen, ver TASKS.md TSK-114..117 para anclas ADR-006):**
- **Museo URL-only (ADR-039 + ENMIENDA 1):** recursos como URLs externas sobre
  `album_fotos`; visibilidad POR RECURSO (`album_fotos.visible`, migracion 025,
  privado por defecto) con filtro server-side en los lectores publicos
  (incluidos conteos y subqueries de votos); ramas `?tipo=museo_recurso`
  (crear/editar/eliminar/listar) con `validarSesion` y usuario tomado de la
  sesion; carpetas = albumes (mover = `album_id`); auto-album "Mi Museo";
  coords a nivel de album; `mis_guardados_media` sin filtro; `barrio`
  descartado (solo `ciudad`/`region`).
- **ENMIENDA 1 de ADR-039 (BLOQUEANTE de QA resuelto):** gate unico
  `mis_fotografo` para foto/video/audio (evita deadlock circular de
  `mis_videografo`/`mis_sonidista`), **+15 XP para los 3 tipos** y 2 misiones
  nuevas (`gate_nivel:2`). El texto viejo de ADR-039 (opcion 7 y decision E)
  prometia 0 XP y sin gate para video/audio; quedo marcado como SUPERSEDIDO y el
  contrato vigente es el de la enmienda.
- **Acordeon de niveles (ADR-040):** `niveles-data.js` como fuente unica cliente
  (`XP_LEVELS` + `CAPACIDADES_DETALLE` + `capacidadesDelNivel`/`misionesPorNivel`),
  cableada solo en `mi-perfil.html`; backend aditivo en `?tipo=misiones`
  (`gate_nivel`/`desbloquea`/`nivel`).
- **UI Museo + localizacion (T5/T7):** tab Museo de `mi-perfil.html` con CRUD por
  URL, toggle de visibilidad y selector de carpeta; localizacion con pin sobre
  `map-picker.js` (host `.pf-museo`).
- **`map-picker.js` (TSK-117):** modulo compartido del selector de coordenadas;
  `admin.html` refactorizado para consumirlo (mismos ids).

**Escudo GOLD (APROBADO tras correcciones, 2026-09-18):** `node --check` OK;
ASCII OK; balance de divs 0; `smoke_niveles_data.js` **31/31**;
`smoke_test_gamificacion_v4.js` 95/95; `smoke_021_xp_decimal_rankings.js` 45/45;
`smoke_038_casas_clases.js` 76/76; `smoke_test_perfil_progreso.js` OK (41
misiones/33 logros); `smoke_test_comunidad.js` OK;
`smoke_test_milestones_v2.js` OK; `check_buildHTML_inline.js` OK. El QA inicial
marco BLOQUEANTE SOLO por desincronizacion ADR<->codigo; se resolvio con la
ENMIENDA 1 de ADR-039.

#### Que sigue
1. **ORDEN DE DEPLOY OBLIGATORIO (BLOQUEANTE):** aplicar en Neon primero la
   migracion **024** (pendiente de TSK-112) y despues la **025**
   (`db/migrations/025_album_fotos_visible.sql`, archivo COMPLETO en una
   corrida; idempotente). Correr antes `scripts/verify_025_precheck.js`
   (read-only). Patron BUG-021/BUG-060. **(Actualizacion TSK-118, 2026-09-18:
   la migracion 026 tambien entra al release; el orden vigente es
   `024 -> 025 -> 026 -> deploy del backend`. Ver la sesion TSK-118 al inicio
   de este documento.)**
2. **Deploy del backend v22** (`api/interacciones.js`) DESPUES de 024 y 025;
   luego el frontend (`mi-perfil.html`, `admin.html`, `niveles-data.js`,
   `map-picker.js`).
3. **Verificacion en vivo:** crear foto/video/audio por URL (privado por
   defecto), activar visible, mover de carpeta y eliminar; confirmar que un
   tercero no ve privados ni en listados ni en conteos; abrir el acordeon de
   niveles y ver misiones ancladas; localizar el Museo con el pin.
4. **Commit + push del release:** incluye los pendientes de TSK-107..TSK-113 y
   este cierre documental; NO mezclar archivos ajenos/borrados del working tree.
5. **Backlog:** sanitizar `scripts/smoke_036_compartir.js` (header v19) y
   `scripts/test_logros_catalogo.js` (30 logros); limpiar los `catch` vacios de
   `mi-perfil.html`; BUG-061 y BUG-002 abiertos.

#### Riesgos activos
- **Migracion 025 CREADA pero aun no aplicada en Neon:** desplegar el backend
  v22 sin la 025 haria fallar `museo_recurso` y los filtros `visible` (columna
  inexistente, mismo flujo que 017/021). El orden 024 -> 025 -> v22 es
  obligatorio.
- **Fuga de privados si falta un filtro:** cualquier lector nuevo de
  `album_fotos` DEBE filtrar `af.visible=true` (salvo `mis_guardados_media`);
  el riesgo documentado en ADR-039 es que un lector olvide el filtro. El smoke
  de la rama GET debe garantizarlo server-side (nunca client-side).
- **Duplicados de `XP_LEVELS`:** `index.html` y `comunidad.html` conservan su
  copia local (deuda documentada; swap futuro de 1 linea).
- **Cliente antes que backend v22:** el acordeon se mostraria sin misiones
  ancladas (degradado aceptable, sin ruptura).
- **Smokes preexistentes en rojo** (`smoke_036_compartir.js`,
  `test_logros_catalogo.js`) NO son de esta entrega, pero contaminan la senal de
  QA; tratarlos como deuda.
- **BUG-061 y BUG-002 siguen ABIERTOS** (no relacionados con esta entrega).

### Sesion TSK-113 "Sprint Multimedia / Perfil / Galeria / Mapa" (2026-09-18) - cierre documental

Tarea TSK-113 **COMPLETADA EN WORKING TREE** (SIN commitear; verificado contra
archivo real, ADR-006, el 2026-09-18). Guiado por el prompt
`PROMPT_OPENCODE_MULTIMEDIA_PERFIL_GALERIA.md` (untracked). La tarea vive en
`TASKS.md` TSK-113. NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001) y **NO
genera migraciones**. `api/pagina-destino.js` queda en **v12.20260917** (header real
L1-2). **BUG-057 CERRADO** con el refuerzo v12.20260917 (ver BUGS_HISTORICOS.md).

**Que se hizo (resumen, ver TASKS.md TSK-113 para anclas ADR-006):**
- `api/pagina-destino.js` (v12.20260917, +6/-6): defensas reforzadas del popover
  Guardar en listener capture (L2513/L2533/L2545/L2556).
- `mi-perfil.html` (+82/-27; divs 394/394, script 3/3): fotos propias con
  `mediaCardHTML`, guardados por fuente, geo en `agregarFotoAlbum`, logros
  colapsables ("+N bloqueados"); comentario `Rev 2026-09-18b` insertado (O1 del
  Escudo GOLD #92).
- `galeria.html` (+58/-10; divs 84/84): paginacion 12/pagina (`gGalRenderPage`/
  `gGalLoadMore`), boton `#g-more` reutilizado.
- `index.html` (+103/-13; divs 523/523): titulo del drawer del mapa cultural
  (`mdSetDestinoTitulo`), `votarMediaMapa` (sin sesion y 401), `renderLogrosGrid`
  (solo `completada`, tierOrder platino>oro>plata>bronce).
- **O2 (desviacion de alcance):** `index-api-connector.js` NO se modifico; el
  endpoint filtra solo por `destino_id` y `cargarAlbumOficialDestino` ya envia
  `destino_id`; el titulo del drawer se resolvio en `index.html`.
- Escudo GOLD #92: `node --check` PASS, ASCII 0/0/0, divs 0/0/0,
  `smoke_auditoria_pagina_destino` 54/54 PASS. **APROBADO CON OBSERVACIONES.**

**PENDIENTE OPERATIVO de TSK-113 (lo ejecuta Javier):**
1. **Commit + push + deploy** de los 4 archivos del sprint + el cierre documental
   (`TASKS.md`, `NEXT.md`, `BUGS_HISTORICOS.md`, `docs/HANDOFF_037.md`) en un solo
   release.
2. **NO mezclar archivos ajenos (O3):** `opencode.json` y 3 `.opencode/agent/*`
   modificados; 4 borrados (`PROMPT_OPENCODE_TSK111.md`,
   `PROMPT_OPENCODE_TSK112.md`, `PROMPT_MULTIMEDIA_GALERIA.md`,
   `opencode - copia.json`); `PROMPT_OPENCODE_MULTIMEDIA_PERFIL_GALERIA.md`
   untracked.
3. **Verificacion en vivo post-deploy:** (a) drawer del mapa cultural con titulo del
   destino y voto de media (click en pin -> titulo + recursos filtrados);
   (b) paginacion de `galeria.html`; (c) fotos/guardados/geo/logros de
   `mi-perfil.html`; (d) popover Guardar estable en la ficha.
4. **Limpiar BUG-002** en `api/pagina-destino.js` L2431 (deuda preexistente
   confirmada: 1 doble-escape `'\\u2605'` en `addRvOptimista`, identico a HEAD).

**Riesgos activos de TSK-113:**
- **BUG-002 ABIERTO** (doble escape en `api/pagina-destino.js` L2431): deuda
  preexistente, NO introducida por el sprint; limpiar en una tarea de mantenimiento.
- **BUG-061 y BUG-062 siguen ABIERTOS** (ajenos a TSK-113).
- **Higiene de working tree (O3):** el release de TSK-113 NO debe mezclar los
  archivos ajenos modificados/borrados (config y prompts).
- El boton `#g-more` de `galeria.html` queda compartido por feed y modo destino;
  cualquier cambio futuro debe conservar esa reutilizacion.

### Sesion TSK-112 "Sistema de Casas (cofre + nivelacion) y Clases Rising Star" (2026-09-18) - ADR-038

Tarea TSK-112 **IMPLEMENTADA EN WORKING TREE** (SIN commitear; verificado contra
archivo real, ADR-006, el 2026-09-18). La decision consolidada vive en `DECISIONS.md`
**ADR-038 + ENMIENDA 1 (L1639-1677)**; la ENMIENDA 1 formaliza y aprueba el contrato
realmente implementado y prevalece sobre el diseno previo (manda el spec de producto
`PROMPT_OPENCODE_TSK112.md`). La tarea vive en `TASKS.md` TSK-112. NO hay archivos
nuevos en `api/` (8/8 intacto, ADR-001) y la migracion
`db/migrations/024_casas_cofre_y_clases.sql` **EXISTE** (232 lineas, idempotente,
ASCII-safe) y es la **UNICA migracion pendiente de aplicar en Neon**.

**Estado real del working tree (verificado, ADR-006, 2026-09-18):**
- `db/migrations/024_casas_cofre_y_clases.sql`: **EXISTE** (232 lineas). Agrega a
  `usuarios` `clase_id`/`nivel_clase`/`xp_clase`/`clase_elegida_en` + CHECK
  `chk_usuarios_clase`, crea `casas_cofre` (PK casa + `xp_cofre_total` +
  `poblacion_activa` + `factor_conversion` + `actualizado_en`) con seed idempotente
  e indice parcial `idx_usuarios_clase_id`. NO crea `casa_id`, NO `casas_votaciones`,
  NO FK.
- Headers reales: `api/usuarios.js` **v16** y `api/interacciones.js` **v21** (ambos
  `node --check` OK; ASCII 0/0/0). Helpers reales: `contextoXpE`, `calcularXpFinal`,
  `calcularNivelClase`, `calcularTagCasa` y `acreditarClaseYCofre`, con `BONUS_CLASE`
  y `XP_NIVEL_CLASE`; rama POST `clase_elegir` presente. **NO existe** el
  monotilitico `entregarXpUsuario`, **NO hay gate de nivel** y **NO hay afinidad por
  accion** (asi lo aprueba la ENMIENDA 1).
- Frontend: `mi-perfil.html` con `#pf-clase` + `#modal-clase` + `cargarClase`/
  `elegirClase` (divs 390/390) y `comunidad.html` con tag/mult/cofre en las cards del
  ranking (divs 304/304).
- `git status` (2026-09-18): `M api/usuarios.js`, `M api/interacciones.js`,
  `M mi-perfil.html`, `M comunidad.html`, `M exploraco desarrollo/DECISIONS.md`,
  `M TASKS.md`, `M NEXT.md`, y sin versionar
  `?? db/migrations/024_casas_cofre_y_clases.sql`,
  `?? scripts/smoke_038_casas_clases.js` y `?? PROMPT_OPENCODE_TSK112.md` (prompt de
  la tarea, no artefacto de producto).
- **La implementacion, la migracion y el QA de TSK-112 YA estan ejecutados** (Escudo
  GOLD con `smoke_038` 76/76 PASS; ver abajo).

**Contrato implementado (ENMIENDA 1 del ADR-038, prevalece sobre el diseno previo):**
- **Se REUSA `usuarios.casa`** (`condor|jaguar|delfin`, `varchar(20)`, CHECK
  `chk_usuarios_casa` e indice parcial `idx_usuarios_casa` de la migracion 017 /
  ADR-028); se RECHAZA la propuesta original de `casa_id` con valores
  `alta|media|baja` + tabla `casas_tributacion`.
- **`casas_cofre`:** cofre por Casa con seed idempotente y sin FK en v1.
  `poblacion_activa`/`factor_conversion` son **cache NO autoritativa**. La
  **tributacion del 10% del `xp_final`** es un literal `0.10` dentro de
  `acreditarClaseYCofre`, best-effort, **sin endpoint HTTP `casa_tributar`**.
- **Factor de nivelacion runtime (calcularTagCasa):** `dominante` (>45%, x0.85),
  `equilibrada` (25%-45%, x1.00) y `rezagada` (<25%, x1.30), aplicado UNA sola vez en
  `calcularXpFinal`. `arancel_inter_casa`/`fee_mercado_interno` se exponen pero NO se
  cobran en v1.
- **Clases Rising Star:** coexisten con el Arbol de 16 ramas (`progreso_arbol`,
  ADR-028; NO lo reemplazan). `BONUS_CLASE` = cartografo 0.08 / cronista 0.10 /
  explorador 0.07; `XP_NIVEL_CLASE` = 11 umbrales
  `[0,100,250,500,900,1400,2100,3000,4200,5700,7500]`; `xp_clase` incrementa el
  **50% del `xp_final`**. `clase_elegir`: primera eleccion gratis, recambio con
  **300 XP + cooldown de 30 dias**, errores `CLASE_INVALIDA`/`CLASE_YA_ELEGIDA`/
  `COOLDOWN_CLASE`/`PUNTOS_INSUFICIENTES`/`EMAIL_SIN_VERIFICAR`.
- **Whitelist de 14 acciones** con la triada de helpers (los `UPDATE usuarios SET
  xp_total` siguen inline para preservar contadores); **EXCLUIDOS** cobros
  (`dm_enviar`, `comprar_consumible`) y bonos/terceros (`evaluarMisiones`,
  `evaluarLogros`, `progresarPandillaRetos`, `repartirXpReferidos`).
- **Versionado ejecutado:** `api/usuarios.js` v15 -> **v16** y `api/interacciones.js`
  v20 -> **v21**. **`casas_votaciones` se DIFIERE a v2.**

**Ambiguedades resueltas/ajustadas por la ENMIENDA 1 (2026-09-18):** el gate de
nivel >= 2 y el mapeo de afinidad de las 14 acciones quedan **RESUELTOS como NO
existentes**; la curva real es `XP_NIVEL_CLASE` de 11 umbrales y `xp_clase = 50% del
xp_final`. Sigue vigente revisar los **umbrales de tag 45%/25% y los multiplicadores
0.85/1.00/1.30 tras la primera semana de datos**. Detalle en ADR-038, ENMIENDA 1
(DECISIONS.md L1639-1677).

**Verificacion (Escudo GOLD, 2026-09-18):** `node --check` OK; ASCII 0/0/0 en API,
migracion y smoke; balance de divs 0; smokes `017` (73/73), `021` (45/45),
`036_media_unificada` (85/85), `gamificacion_v4` (95/95) y `smoke_038_casas_clases`
**76/76 PASS**. El QA inicial dio "GOLD FAIL" SOLO por desincronizacion ADR<->codigo;
se resolvio con la ENMIENDA 1 (no hubo fallo de sintaxis, ASCII ni balance). Deuda
PREEXISTENTE (no de TSK-112): los `.catch(function(){})` best-effort de
`api/interacciones.js` (37 ocurrencias).

**Agentes:** architect/architect-review (diseno + Enmienda 1), sql-security
(migracion 024 y cofre), backend-dev x2 (`api/usuarios.js` v16,
`api/interacciones.js` v21), frontend-tpl (UI de Casas/Clases), qa-auditor (Escudo
GOLD), docs-keeper (cierre documental).

#### Que sigue
1. **Aplicar `db/migrations/024_casas_cofre_y_clases.sql` en Neon** (archivo
   COMPLETO en una corrida; idempotente). Es la **UNICA migracion pendiente de
   aplicar**: las **019-023 YA estan aplicadas en Neon** (confirmado por Javier el
   2026-09-17; se conserva su registro historico como pendientes, Regla de Oro 3).
   Correr despues el preflight del ADR contra `information_schema` (columnas
   `clase_id`/`nivel_clase`/`xp_clase`/`clase_elegida_en`, tabla `casas_cofre` e
   igualdad de las listas CHECK `usuarios.casa` vs `casas_cofre.casa`).
2. **Deploy del backend** (`api/usuarios.js` v16 + `api/interacciones.js` v21)
   despues de aplicar la 024.
3. **Deploy del frontend** de Casas/Clases (`mi-perfil.html`, `comunidad.html`).
4. **Verificacion en vivo:** elegir Clase y ver el multiplicador/`tag` de Casa en el
   ranking; confirmar el tributo del 10% en `casas_cofre.xp_cofre_total`; probar el
   recambio de Clase (300 XP + cooldown de 30 dias).
5. **Commit + push del release:** incluye los pendientes de TSK-107..TSK-111 y este
   cierre documental; NO mezclar los archivos ajenos/borrados.

#### Riesgos activos
- **Migracion 024 CREADA pero aun no aplicada en Neon:** el backend v16/v21 no puede
  desplegarse antes de aplicarla; si se desplegara, consultaria columnas y la tabla
  `casas_cofre` inexistentes (mismo flujo que 017/021, ADR-008).
- **Coexistencia de dos capas de progresion:** el Arbol de 16 ramas
  (`progreso_arbol`, ADR-028) sigue vigente en paralelo a las Clases; toda lectura
  o UI debe distinguir ambas para no mostrar ni perder progreso real.
- **Tributacion best-effort:** un fallo del cofre NO debe bloquear la entrega de XP
  del usuario (degradar con `warn`; los `.catch(function(){})` preexistentes son
  deuda a limpiar, AGENTS.md seccion 2.2).
- **Cache no autoritativa:** `casas_cofre.poblacion_activa`/`factor_conversion`
  pueden quedar desactualizadas si el refresh best-effort falla; la fuente de
  verdad es el calculo runtime (no leerlas como autoritativas).
- **Gaming de poblacion activa:** el factor por participacion puede incentivar
  migraciones coordinadas entre Casas; en v1 solo hay monitoreo (tributacion sobre
  `xp_final`), sin defensa fuerte. Revisar umbrales 45%/25% y 0.85/1.00/1.30 tras la
  primera semana de datos.
- **Deuda `usuarios.activo`/`ultimo_acceso` (patron BUG-021):** el calculo de
  poblacion activa depende de columnas no versionadas; debe degradar con `warn` y
  nunca romper la entrega de XP.
- **BUG-061 y BUG-062 siguen ABIERTOS** (no relacionados con TSK-112).

### Sesion TSK-111 "Geocerca 50 m, album_oficial en el mapa, limpieza del admin y refactor de hero/galeria" (2026-09-17) - ADR-037

Tarea TSK-111 implementada en working tree (SIN commitear). La decision consolidada
vive en `DECISIONS.md` ADR-037, con NOTA DE ENMIENDA fechada en ADR-024 (radios
urbanos) y ADR-034 (hero/galeria/orden de modulos); la tarea en `TASKS.md` TSK-111.
NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001) y **NO hay migraciones
nuevas**: TSK-111 es solo logica de aplicacion, UI y constantes.

**Cambios (verificados contra archivo real, ADR-006; `git diff --numstat` = 7
archivos modificados, +335/-298, mas 1 archivo nuevo):**
- `admin.html` (+49/-82): se retira "Que incluye el precio" de la UI; se elimina el
  control "Orden de modulos" dejando `#hostal-modulos-list` OCULTO (L1234,
  `display:none aria-hidden`) para PRESERVAR `tags.orden_modulos`; se elimina la
  seccion "Operacion" y `f-capacidad` se reubica en la pestana General
  (`#fpanel-general`, L813-818); `f-comotransporte` (codigo muerto) se elimina
  end-to-end; FAQ estrena Subir/Bajar (`moveFaqRow` L3253) sobre el generico
  `moverFila` L3234 (Actividades ya lo tenia).
- `api/interacciones.js` (+44/-8; header v19 -> v20): `RADIO_DEFAULT_M` 100 -> 50
  (L139) y `RADIO_POR_CATEGORIA` `sitio/hostal/comida` 100 -> 50 (L140; `evento` 150
  intacto); subcategorias URBANAS a 50 (L141-147); rural 250, parque 150, concierto
  150, festival 200 y deporte 200 intactos; `ACCURACY_MAX_M=150` (L151) y bloqueo 422
  intactos. `album_oficial`: la rama `multimedia_mapa` acepta `?destino_id=<uuid>`
  validado con regex uuid inline (L4324-4330) y agrega la clave aditiva con la query
  a `destinos_fotos` envuelta en `conDegradacionMedia` (L4449-4460).
- `api/pagina-destino.js` (+121/-194; header v11): guard de `edad_minima` con
  `String(...).trim() !== ''` (L1690); hero botonera en 2 filas (`.hctar-row`
  L189/L2342-2343) con grid 1+3; imagenes del hero clickeables al lightbox existente
  (`abrirLightboxHero` L2577); "Fotos de viajeros" retirado (`loadFotos`/`subirFoto`/
  `votarFoto` + CSS `fp-*`; L2079/L2600); CTA renombrado a "Ver todas las fotos"
  (L1571-1572).
- `index-api-connector.js` (+32/-0): `cargarAlbumOficialDestino` y su export
  `window.cargarAlbumOficialDestino` (L391/L412), que degrada con `console.warn` sin
  romper el mapa.
- `index.html` (+51/-1): `mdMapaAlbumOficial` (L3327) y su llamada solo en la rama
  `origen='destino'` (L3382).
- `scripts/smoke_016_multinivel_crowdsourcing.js` (+29/-3) y
  `scripts/smoke_auditoria_pagina_destino.js` (+9/-10): smokes actualizados por el
  cambio de radio y por el retiro de modulos de la ficha.

**Decisiones de producto:** el radio urbano baja a 50 m manteniendo el accuracy maximo
en 150 m (son chequeos independientes); el album oficial del pin viaja como clave
aditiva `album_oficial` de la rama existente (cero endpoints nuevos); el orden de
modulos guardado NO se pierde al retirar la UI (nodo oculto); la galeria de viajeros
se consolida en `galeria.html` (TSK-110). Detalle en ADR-037.

**Verificacion (ADR-006):** Escudo GOLD (qa-auditor) **APTO CON OBSERVACIONES**:
`node --check` 8/8 en `api/*.js`; `api/interacciones.js` ASCII 0/0/0; balance de DIVs
de `admin.html` (hostal/comida/sitio/evento) = 0; smokes `check_buildHTML_inline`,
`smoke_auditoria_pagina_destino` (54), `smoke_016` (52) y `smoke_021` (45) PASS.
`smoke_test_epic_prompt` mantiene 4 FAIL PREEXISTENTES ajenos (DQ-2). Deuda ASCII
preexistente (no de TSK-111): `api/pagina-destino.js:2431` (1 doble-escape, BUG-002)
y `api/utilidades.js` (H8).

#### Que sigue
1. **[RESUELTO - 2026-09-17] APLICAR EN NEON las migraciones 019, 020, 021, 022 y
   023 (lo ejecuto Javier).** **Javier confirmo (2026-09-17) que YA ESTAN
   APLICADAS en Neon**; el bloqueo de arrastre de TSK-107..TSK-111 queda CERRADO y
   su registro historico se conserva (Regla de Oro 3). **TSK-111 NO agrega
   migraciones**; la unica migracion pendiente de APLICAR es la 024 (TSK-112), ya
   creada (232 lineas; ver la sesion TSK-112).
2. **Deploy en orden (migraciones 019-023 ya aplicadas):** backend
   (`api/interacciones.js` v20, `api/pagina-destino.js` v10/v11) -> frontend
   (`admin.html`, `index-api-connector.js`, `index.html`) -> smokes.
3. **Commit + push en un solo release:** los 7 archivos modificados + los pendientes
   de TSK-107..TSK-110 sin commitear + este cierre documental (`TASKS.md`, `NEXT.md`,
   `DECISIONS.md`). NO mezclar los 3 archivos borrados ajenos (`PROMPT.md`,
   `prompt_exploraco_tsk104.md`, `promptarreglos.txt`).
4. **Verificacion en vivo:** "Estuve aqui" a <= 50 m en un destino urbano y rechazo
   422 fuera del radio/accuracy; `album_oficial` visible en el drawer del pin del
   mapa; chip de `edad_minima` ausente si el campo esta vacio; hero con botonera en 2
   filas, grid 1+3 y lightbox; ausencia de "Que incluye el precio", "Orden de modulos"
   y "Operacion"; FAQ reordenable con Subir/Bajar.
5. **Backlog:** resolver BUG-061 y BUG-062; decidir si el nodo `#hostal-modulos-list`
   oculto se elimina en una tarea de limpieza (hoy se conserva para preservar el
   dato); eliminar de verdad `f-comotransporte` si algun dia reaparece en un merge.

#### Riesgos activos
- **Migraciones 019-023 (RESUELTO el 2026-09-17):** Javier confirmo que ya estan
  APLICADAS en Neon. Se conserva el registro del riesgo (Regla de Oro 3): mientras
  estuvieron pendientes, el backend de TSK-110 (v19/v20) y las rutas de
  media/compartir degradaban o fallaban y TSK-111 no podia desplegarse aislada. El
  unico bloqueo de migraciones que queda es la **024** (TSK-112), ya creada pero
  pendiente de aplicar en Neon.
- **Radio urbano de 50 m mas estricto:** el GPS en interiores/canonadas puede quedar
  fuera; el frontend ya envia `accuracy` y el 422 `PRECISION_INSUFICIENTE` sigue
  vigente, pero la friccion de "Estuve aqui" sube en destinos urbanos.
- **`#hostal-modulos-list` oculto pero presente:** es deliberado (preserva
  `tags.orden_modulos`), aunque deja DOM muerto hasta una limpieza futura.
- **BUG-061 y BUG-062 siguen ABIERTOS** (no relacionados con TSK-111).

### Sesion TSK-110 "Compartir social con XP + interacciones de media unificadas" (2026-09-17) - ADR-036

Tarea TSK-110 implementada en working tree (SIN commitear). La decision vive en
`DECISIONS.md` ADR-036; la tarea en `TASKS.md` TSK-110; la deuda derivada en
`BUGS_HISTORICOS.md` seccion "Deuda ADR-036"; el relevo corto en
`docs/HANDOFF_036.md`. NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001);
SI hay 2 migraciones nuevas (`db/migrations/022_media_compartidos.sql` y
`023_interacciones_media_unificadas.sql`, sin versionar), 2 smokes nuevos y 1
asset frontend nuevo (`compartir.js`).

**Cambios (verificados contra archivo real, ADR-006; `git diff --numstat` = 8
archivos modificados, +1379/-536, mas 5 archivos nuevos):**
- `api/interacciones.js` (+949/-425; header `v18` -> `v19`): rama POST
  `compartir` (validarSesion obligatoria, item real 404, **25 XP primer share /
  5 XP posteriores**, tope **10 eventos y 50 XP / 24h**; ledger en
  `media_compartidos`, SIN tocar el CHECK de `interacciones.tipo`; L7070+);
  3 misiones nuevas (`mis_primer_compartido` L1421, `mis_voz_comunidad` L1429,
  `mis_embajador_destinos` L1439) y 3 logros nuevos (`logr_primer_compartido`
  L1774, `logr_compartidor_25` L1782, `logr_viral_100` L1790) -> catalogo real
  HOY **39 misiones / 33 logros**; media unificada (`media_voto`,
  `media_comentar`, GET `media_interacciones` L4584 y `media_comentarios`
  L4618); alias legacy conservados (`album_voto`, `foto_voto`,
  `comentario_foto`, `comentario_voto`, `comentario_eliminar`, `guardar_media`,
  `comentarios_foto`); **TODOS los lectores legacy migrados a `media_*`**
  (`album_detalle`, `fotos_top`, `mi_feed_fotos`, `multimedia_mapa`,
  `comentarios_recientes`, checks de misiones/logros, `museo_publico`, `arbol`,
  `mis_fotos` y sendero audiovisual); `galeria_destino` `items[]` v2
  (`fuente`, `votos`, `comentarios`, `ya_votado`, `ya_guardado`,
  `tipo_voto:'media'`; L4143-4231) con `cargarMetricasMedia` sin N+1; helpers
  `conDegradacionMedia` L2512 / `contarComentarioSafe` L2199 /
  `contarCompartidosUsuario` L2862 que degradan con `warn` (nunca 503 global ni
  catch vacio).
- `galeria.html` (+222/-32): modo destino con 5 secciones ("Fotos de este
  lugar", "Albumes de este espacio", "Fotos de la comunidad", "Mapa y
  audiovisual", "Comparte tu foto") y modal de foto/album con VOTAR, GUARDAR,
  COMPARTIR y comentarios para las 3 fuentes; carga `/compartir.js`.
- `album-comments.js` (+92/-33; **v2.0.0** L610): firma
  `mount(target,{fuente,itemId},opts)` retrocompatible con la de string legacy
  (`album_foto`).
- `index.html` (+50/-17): insignia `compartido` reincorporada en `XP_BADGES`
  (L4208) derivada del catalogo real de logros (`_compartidosDeLogros` ->
  `_sharedCount`), no de un contador local; `_toastBadgesNuevos` y re-render de
  insignias tras `cargarLogros`.
- `api/pagina-destino.js` (+40/-27; header v10): hero en mosaico (grid `1.9fr`
  + columna, fila 360px, L201-204) y boton **Compartir** al final del `.subnav`
  sticky (L2246-2253) con carga de `/compartir.js` (L2385).
- `usuario-session.js` (+24/-0): helper
  `window.ExploraCO.aplicarResultadoXp(data)` como unico punto de acreditacion
  de XP/misiones/logros de un caller externo (compartir.js).
- `comunidad.html` (+1/-1) y `mi-perfil.html` (+1/-1): SOLO cache-bust
  `album-comments.js?v=2`. Este ultimo tambien en `index.html` y `galeria.html`.
- NUEVOS sin versionar: `compartir.js` (295 lineas;
  `window.ExploraCompartir = { VERSION, init, compartir }`: Web Share API +
  WhatsApp + Copiar link, POST `compartir`, toasts reusando
  `window.ExploraCO.mostrarToast`), `db/migrations/022_media_compartidos.sql`
  (131; tabla + indice unico parcial `es_primero` + preflight + PLAN B),
  `db/migrations/023_interacciones_media_unificadas.sql` (408; `media_votos` +
  `media_comentarios` + `media_comentario_likes` + `ALTER media_guardados`
  `item_id uuid->text` y CHECK con `'curada'` + backfill idempotente),
  `scripts/smoke_036_compartir.js` (290) y
  `scripts/smoke_036_media_unificada.js` (361).

**Decisiones de producto:** el share no entra al CHECK de `interacciones.tipo`;
el ledger de XP tiene tabla propia (`media_compartidos`) con deteccion atomica
de primer share por indice unico parcial; votos/comentarios/guardados se
unifican en tablas polimorficas `media_*` con `item_id text`; las tablas legacy
se conservan (cero borrado) solo con backfill; el hero pasa a mosaico 1+3 y el
boton Compartir vive en el `.subnav`. Detalle en ADR-036.

**Discrepancia verificada (ADR-006):** el reporte de la sesion decia "insignia
`compartido` reincorporada en `index.html`/`comunidad.html`/`mi-perfil.html`".
Contra archivo real, la insignia volvio SOLO en `index.html`; `comunidad.html`
(L524) y `mi-perfil.html` (L789) conservan el comentario que la lista como
removida y solo recibieron el cache-bust. Queda como pendiente de consistencia
de UI, no bloqueante.

**Verificacion (ADR-006, ejecutada en esta sesion documental el 2026-09-17):**
`node --check` 7/7 OK (`api/interacciones.js`, `api/pagina-destino.js`,
`compartir.js`, `album-comments.js`, `usuario-session.js` y los 2 smokes);
ASCII-safe 0 bytes >127 y 0 backticks en `api/interacciones.js`,
`api/pagina-destino.js`, `compartir.js`, las 2 migraciones y los 2 smokes
(`usuario-session.js` mantiene su baseline no-ASCII preexistente con delta 0);
`scripts/smoke_036_compartir.js` **55/55 PASS** y
`scripts/smoke_036_media_unificada.js` **71/71 PASS**. **Ambos smokes usan mock:
NO validan el esquema de Neon.**

#### Que sigue
1. **APLICAR `db/migrations/022_media_compartidos.sql` Y
   `023_interacciones_media_unificadas.sql` EN NEON (BLOQUEANTE, lo ejecuta
   Javier, ANTES del deploy del backend v19).** Correr cada archivo COMPLETO en
   el editor SQL de Neon (idempotentes ADR-008) y ejecutar sus preflights
   read-only: en la 022 confirmar que el CHECK legacy de `interacciones` NO
   incluye `compartir`, que el indice parcial existe y que el `ON CONFLICT ...
   WHERE es_primero = true` infiere (si no, aplicar el PLAN B documentado); en
   la 023 confirmar el tipo real de `destinos_fotos.id` (6.1), que los conteos
   unificados igualan o superan a los legacy (6.2), que `media_guardados.item_id`
   es `text` y que su CHECK admite `'curada'` (6.4/6.5), y que una segunda
   corrida es no-op (6.3). **El backend v19 consulta tablas que deben existir;
   sin ellas las rutas de compartir/voto/comentario degradan o fallan.**
2. **Deploy en orden:** 022/023 en Neon -> backend v19 (`api/interacciones.js`,
   `api/pagina-destino.js`) -> frontend (`compartir.js`, `galeria.html`,
   `album-comments.js`, `index.html`, `comunidad.html`, `mi-perfil.html`,
   `usuario-session.js`).
3. **Verificacion en vivo:** compartir una foto curada (25 XP y fila en
   `media_compartidos`), repetir el mismo share (5 XP), superar 10 eventos/24h
   (tope) y comprobar `limite_diario`; votar/comentar/guardar una curada y una
   de viajero desde la ficha y `galeria.html`; ver la insignia `compartido` en
   el perfil.
4. **Consistencia de UI pendiente:** decidir si la insignia `compartido`
   tambien vuelve a `comunidad.html`/`mi-perfil.html` (hoy solo esta en
   `index.html`) o si se actualiza el comentario de `XP_BADGES` para reflejar
   que la insignia es exclusiva de index.
5. **Commit + push:** los 8 archivos modificados + los 5 nuevos + este cierre
   documental (`TASKS.md`, `NEXT.md`, `DECISIONS.md` ADR-036,
   `BUGS_HISTORICOS.md`, `PROJECT.md`, `BLUEPRINT.md`, `docs/HANDOFF_036.md`) en
   un release coherente. NO mezclar archivos borrados/ajenos.
6. **Backlog:** versar el esquema base (CHECK de `interacciones.tipo`, tablas
   `usuarios`/`interacciones`/`destinos_fotos`); eliminar las tablas legacy
   cuando ningun cliente viejo las lea; BUG-061 (`POST tipo='foto'` sin
   `validarSesion`, escalado a `sql-security`); BUG-062 (fotos Unsplash en
   `admin.html`).

#### Riesgos activos
- **Migraciones 022/023 pendientes (BLOQUEANTE):** el backend v19 consulta
  `media_*`; los smokes usan mock y NO validan Neon, por lo que la unica
  validacion real es aplicar las migraciones y correr los preflights.
- **CHECK de `interacciones.tipo` y esquema base no versionados:** la deteccion
  de primer share depende del indice unico parcial; si el planner no infiere el
  `ON CONFLICT` parcial, la 022 trae el PLAN B (`media_compartidos_unicos`) pero
  exigiria ajustar el backend (no se hace automaticamente).
- **Tablas legacy retiradas del backend pero no dropeadas:** convivencia
  deliberada; su `DROP` es una tarea de datos futura y separada.
- **Consistencia de insignias:** `compartido` solo en `index.html` (ver arriba).
- **BUG-061 sigue ABIERTO** en `tipo='foto'` (la rama `compartir` nueva si exige
  sesion).

### Sesion TSK-109 "XP decimal, pestana Clase y rankings de comunidad" (2026-09-17) - ADR-035

Tarea TSK-109 implementada en working tree (SIN commitear). La decision vive en
`DECISIONS.md` ADR-035 (redactada por architect como contrato de diseno y NO
duplicada aqui); la tarea en `TASKS.md` TSK-109; los bugs en
`BUGS_HISTORICOS.md` BUG-042 (CORREGIDO) y BUG-063 (NUEVO, CORREGIDO). NO hay
archivos nuevos en `api/` (8/8 intacto, ADR-001); SI hay una migracion nueva
(`db/migrations/021_xp_decimal.sql`, sin versionar), un preflight
(`scripts/verify_021_precheck.js`, sin versionar) y un checklist de despliegue
nuevo (`docs/DEPLOY_021.md`).

**Cambios (verificados contra archivo real, ADR-006; `git diff --numstat` = 10
archivos de codigo, +700/-282; `DECISIONS.md` +249/-1 lo agrego architect):**
- `api/interacciones.js` (+185/-98; header `v18`): helper de redondeo half-up a
  2 decimales, `parseFloat`/`Number` sobre columnas XP (sin `::int` en las
  sumas), NUEVA rama `GET tipo=pandilla_ranking` global por `fama_total DESC`
  con `miembros`/`miembros_activos` y fallback `42703` (L4257-4284); gate de
  `album_crear` con `calcularNivelLocal(...).nivel` (L5379; cierra BUG-042);
  guarda de fama `famaBase <= 0` (L1880-1881; cierra BUG-063).
- `api/usuarios.js` (+102/-40; header `v15`): `calcularNivel`/`conNivel`
  normalizan a `Number` redondeado; `casa_ranking` agrega `miembros_activos`
  (activo=true AND `ultimo_acceso > NOW() - 30 days`) y pasa a
  `ORDER BY xp_total DESC` (L510-557), con el mismo fallback `42703`; rankings
  sin `::int`.
- `comunidad.html` (+195/-43): tab Ranking con 4 sub-vistas (Viajeros | Casas |
  Facciones | Parches; `rk-chip` L372-386 y `setRankingVista` L1661); consume
  `casa_ranking` (L1579) y `pandilla_ranking` (L1613); el ranking de Facciones
  sale de "Activo Oculto" (`verRankingFacciones` L2144-2146 deja un CTA).
- `mi-perfil.html` (+101/-50): pestana "Clase" consolidada -- el Arbol de
  Clases es el componente unico (tab `clase` L463); "Tabla de Destino" pasa a
  sub-vista `senderos` (L2621-2622, L2707-2708); "Tu Faccion" pasa a cabecera
  del arbol; "Vocaciones de Artista" se integra en la sub-vista de la faccion
  `artistas` con boton inline "Activar vocacion" (L2859); "Mi Casa" queda como
  bloque compacto (L698-699). IDs/funciones conservados para no romper smokes.
- `usuario-session.js` (+39/-19): helper canonico
  `window.ExploraCO.fmtXp`/`redondearXp` (L46-60; `es-CO`, 2 decimales,
  `Number.EPSILON`) y acreditaciones en cliente normalizadas.
- `api/admin.js` (+29/-14): `precio_xp` acepta decimales (`parseFloat` +
  redondeo; ya no exige entero); listado de resenas normalizado;
  `repartirXpReferidos` sincronizado con el de `interacciones.js`.
- `admin.html` (+20/-9): display de XP con `fmtXp` y precio decimal en la
  tienda.
- `index.html` (+15/-5): `getLevel`/`statsU` con `parseFloat` + `fmtXp`
  (fallback local L4233-4234).
- `perfil.html` (+9/-1): XP del museo publico normalizado.
- `api/pagina-destino.js` (+5/-3; header `v10`): el espejo cliente de
  `xp_total` al publicar/votar foto usa `Number` (no `parseInt`).
- NUEVOS sin versionar: `db/migrations/021_xp_decimal.sql` (121 lineas,
  idempotente ADR-008, ASCII-safe ADR-002; 9 columnas XP -> `numeric(12,2)`
  con guard `information_schema`, sin indices) y
  `scripts/verify_021_precheck.js` (149 lineas, read-only).

**Decisiones de producto:** ADR-035 fija el almacenamiento `numeric(12,2)`
(no centi-XP ni `float8`), un unico helper de redondeo half-up por lenguaje,
la pestana "Clase" consolidada, los 4 rankings de comunidad y la prohibicion
de `::int`/`parseInt` sobre columnas XP. La conversion es exacta
(`int4 -> numeric(12,2)`), por lo que no hay backfill; `pandillas.fama_total`
NO se recomputa (solo cambia de tipo).

**Verificacion (ADR-006, ejecutada en esta sesion documental el 2026-09-17):**
`node --check` 6/6 OK (`api/usuarios.js`, `api/interacciones.js`,
`api/admin.js`, `api/pagina-destino.js`, `usuario-session.js`,
`scripts/verify_021_precheck.js`); ASCII-safe 0 bytes >127 y 0 backticks en
los 4 `api/*.js`, la migracion 021 y el preflight; `smoke_test_gamificacion_v4.js`
95/95 PASS; `smoke_test_comunidad.js`, `smoke_test_perfil_progreso.js`,
`smoke_test_milestones_v2.js` OK; `scripts/check_buildHTML_inline.js` TODO OK
(divs 361/361). `smoke_test_epic_prompt.js` mantiene 4 FAIL PRE-EXISTENTES
(53 checks, 49 PASS; VOCACIONES 3 vs 4 y `chat_salas` tipo plan) ajenos a esta
entrega.

#### Que sigue
1. **APLICAR `db/migrations/021_xp_decimal.sql` EN NEON (BLOQUEANTE, lo ejecuta
   Javier, ANTES del deploy del backend).** Preflight opcional read-only:
   `$env:DATABASE_URL="postgresql://..."; node scripts/verify_021_precheck.js`
   (falla si falta una columna obligatoria; `interacciones.xp_ganado` es
   opcional). Correr el archivo COMPLETO en el editor SQL de Neon y verificar
   `data_type='numeric'`, `numeric_precision=12` y `numeric_scale=2` en las 9
   columnas (bloque comentado al final del `.sql`), incluyendo `MIN`/`MAX` por
   columna para confirmar que los valores historicos se conservaron.
2. **Deploy en 2 releases, en este orden (ver `docs/DEPLOY_021.md`):**
   (a) aplicar la 021 en Neon; (b) deploy del BACKEND
   (`api/usuarios.js` v15, `api/interacciones.js` v18, `api/admin.js`,
   `api/pagina-destino.js` v10) con `usuario-session.js`; (c) smoke en vivo
   contra la API real; (d) deploy del FRONTEND (`index.html`, `admin.html`,
   `perfil.html`, `mi-perfil.html`, `comunidad.html`). Si el backend decimal
   se despliega SIN la 021, Postgres redondea por cast de asignacion en
   silencio (no hay 500): el sintoma es que el XP sigue entero.
3. **Verificacion en vivo sugerida:** elegir faccion y Casa desde
   `mi-perfil.html`; abrir el tab Ranking de `comunidad.html` y comprobar las
   4 sub-vistas (Casas con XP total, activos y promedio; Parches con
   `fama_total` y miembros activos; Facciones ya no vive en "Activo Oculto");
   provocar un XP con decimales (ej. un bono con multiplicador) y ver que se
   muestre "125,50 XP" y no "125,5" ni 125 truncado.
4. **Backlog:** indices de apoyo para los rankings; normalizar
   `api/pagina-destino.js` si quedara algun espejo de XP; fusionar
   `repartirXpReferidos` duplicado (`api/interacciones.js` y `api/admin.js`) si
   se decide; resolver el drift de `smoke_test_epic_prompt.js`; versar las
   columnas no versionadas (`usuarios.activo`, `usuarios.ultimo_acceso`,
   `interacciones.xp_ganado`).
5. **Commit + push:** los 10 archivos de codigo + `DECISIONS.md` + la migracion
   021 + el preflight + el spec
   (`docs/superpowers/specs/2026-09-17-xp-decimal-rankings-comunidad-design.md`)
   en un release coherente. NO mezclar los 3 archivos borrados ajenos
   (`PROMPT.md`, `prompt_exploraco_tsk104.md`, `promptarreglos.txt`).

#### Riesgos activos
- **Migracion 021 pendiente (BLOQUEANTE):** sin ella el backend decimal
  redondea en silencio contra columnas `integer`; no hay error visible.
- **Orden de deploy invertido:** desplegar el frontend antes que el backend deja
  una ventana con formatos mixtos; el ADR exige backend+021 primero.
- **Rollback LOSSY:** `numeric(12,2) -> integer USING ROUND(col)` es exacto
  mientras no haya decimales acumulados y pierde las centesimas despues;
  respaldo opcional de las 9 columnas antes de la 021.
- **Deuda de columnas no versionadas (patron BUG-021):** los rankings dependen
  de `usuarios.activo`/`usuarios.ultimo_acceso`; la 021 los cubre con guard y el
  fallback `42703` responde `miembros_activos=0` con `warn` (nunca catch vacio).
- **Drift de `smoke_test_epic_prompt.js` (4 FAIL pre-existentes):** deuda QA no
  atribuible a esta entrega.
- **ADR-035 declara "NO implementado aun" en su Estado:** drift documental (el
  ADR se redacto como contrato antes de implementar); HOY el estado real es
  implementado en working tree.

### Sesion TSK-108 "Ficha de destino: hero, sintro, galeria y orden de modulos" (2026-09-17) - ADR-034

Tarea TSK-108 implementada en working tree (SIN commitear). La decision vive en
`DECISIONS.md` ADR-034; la tarea en `TASKS.md` TSK-108; el bug derivado en
`BUGS_HISTORICOS.md` BUG-062. NO hay archivos nuevos en `api/` (8/8 intacto,
ADR-001); SI hay una migracion nueva (`db/migrations/020_destinos_sintro.sql`,
sin versionar). ADR-030 queda actualizado (hero de 12 a 4 fotos y CTA
"Ver galeria" retirado solo del hero).

**Cambios (verificados contra archivo real, ADR-006; `git diff --numstat` = 6
archivos, +663/-95, mas 1 migracion nueva):**
- `api/pagina-destino.js` (+283/-65): hero de 4 fotos (`HERO_THUMBS_MAX=3`:
  1 grande `foto_hero` + 2a curada + viajero mas votado + album mas votado,
  con relleno y dedup URL; L776-805); botonera `Sitio web -> Contactar ->
  Como llegar -> Guardar -> Estuve aqui` (L2269-2277); se elimina "Ver
  galeria" del hero y se CONSERVA el CTA del gstrip (L848); `sobreIntro` usa
  `d.sintro` con fallback a 150 chars de `descripcion`/`highlight` (L865);
  galeria 1+12 (`GAL_THUMBS_MAX=12`, `GAL_CURADAS_MAX=6`,
  `GAL_COMUNIDAD_MAX=6`; L1573-1608; CSS `.gal-thumbs` 4/2/1 L311-313); orden
  de modulos hostal (`SEC_HOSTAL_DEFAULT` L2179 y ensamblado L2173-2214).
- `api/interacciones.js` (+46/-0): rama GET `tipo=mapas_de_destino` con
  `destino_id` o `slug` (400/404 tipificados); visibilidad `m.publico=true OR
  m.usuario_id=viewer`, con `viewer` derivado de `validarSesion` (ADR-025) y
  `null` sin sesion valida (L2731-2767).
- `api/admin-destinos.js` (+19/-3): `normSintro` (L22), `sintro` en SELECT
  (L111), INSERT (L159/L215) y UPDATE (L315-319).
- `api/publicar-lugar.js` (+12/-2): `normSintro` (L56) + `sintro` en el INSERT
  publico (draft).
- `admin.html` (+150/-5): `#f-sintro` (L917, tab GENERAL, max 200);
  `HOSTAL_MODULOS_ORDEN_DEFAULT` (L3183) y reorden con flechas de los modulos
  hostal + la lista de Actividades (`_renderHostalModulos`, L3177-3260);
  `tags.orden_modulos` en collect/apply (L3119-3165); `sintro` en
  `_placeToAPI`/loadForm (L3950, L6142, L2721/L3304).
- `galeria.html` (+153/-20): modo destino con 4 secciones `.g-sec` ("Fotos del
  destino", "Fotos de la comunidad", "Albumes del destino", "Mapas con este
  destino"; L150-205) + bloque de subida `#g-share`; consume
  `incluir=viajeros,albumes` (L627) y `mapas_de_destino` (L676).
- `db/migrations/020_destinos_sintro.sql` (NUEVA, 16 lineas, idempotente
  ADR-008, ASCII-safe ADR-002): `ALTER TABLE destinos ADD COLUMN IF NOT EXISTS
  sintro TEXT;` (nullable, sin default; los registros existentes quedan NULL y
  el render aplica su fallback).

**Decisiones de producto:** sin votacion nueva (se reutilizan
`interacciones.dims->>'voto_foto_id'` y `album_votos`); el subtitulo se
persiste en columna con fallback; el orden de modulos vive en
`tags.orden_modulos` (solo hostal, merge JSONB ADR-003); `galeria.html` se
divide en 4 secciones + subida.

**Nota de verificacion (ADR-006):** el header de `api/interacciones.js` sigue
en `v14` mientras los comentarios nuevos citan `v17`. En esta sesion documental
NO se ejecutaron `node --check` ni smokes (no se reportan resultados de pruebas
no corridas).

#### Que sigue
1. **APLICAR `db/migrations/020_destinos_sintro.sql` EN NEON (BLOQUEANTE, lo
   ejecuta Javier; patron BUG-021).** Correr el archivo COMPLETO en el editor
   SQL de Neon y verificar que `destinos.sintro` existe antes del deploy. Sin
   ella, guardar un destino desde el admin o `publicar-lugar` falla por columna
   inexistente (el render degrada con fallback, pero la escritura no).
2. **Commit + push + deploy de los 6 archivos en un solo release** junto con
   los pendientes previos sin commitear (TSK-095..TSK-107 + migraciones
   015/016/017/018/019 + scripts de la 004). NO mezclar los 3 archivos
   borrados ajenos (`PROMPT.md`, `prompt_exploraco_tsk104.md`,
   `promptarreglos.txt`).
3. **Verificacion en vivo:** hero con 4 fotos y sin "Ver galeria" (CTA
   conservado en el gstrip); `sintro` curado visible en "Sobre este lugar";
   galeria 1+12 curadas + comunidad; `galeria.html?destino=<slug>` con las 4
   secciones (incluida "Mapas con este destino"); orden de modulos hostal
   reordenado por flechas en el admin.
4. **Corregir BUG-062 (no bloqueante, pero perdida de datos):** unificar la
   clase `photo-url-input`/`photo-url-inp` en `admin.html` para que
   `getPhotos()` recolecte las fotos agregadas por Unsplash.
5. **Bump de version:** alinear el header de `api/interacciones.js` (`v14` ->
   `v17`) con los comentarios y las migraciones en el commit (ADR-006).

#### Riesgos activos
- **Migracion 020 pendiente (BLOQUEANTE):** sin la columna `destinos.sintro`,
  el INSERT/UPDATE de `admin-destinos.js` y `publicar-lugar.js` falla (patron
  BUG-021); el render publico SI degrada con el fallback historico.
- **BUG-062 (admin, MEDIA):** fotos agregadas por Unsplash no se guardan
  (clase distinta); la vista previa las muestra, lo que oculta el fallo.
- **Deploy pendiente:** el hero de 4 fotos, `sintro`, la galeria 1+12 y las 4
  secciones de `galeria.html` no estan en produccion hasta el
  commit/push/deploy.
- **Header de version desalineado (`v14` vs `v17`):** deuda documental a
  resolver en el commit (ADR-006).

### Sesion TSK-107 "Media del mapa, guardados de media y radio por lugar" (2026-09-17) - ADR-031 + ADR-032 + ADR-033

Tarea TSK-107 implementada en working tree (SIN commitear). Las decisiones viven
en `DECISIONS.md` ADR-031/ADR-032/ADR-033; la tarea en `TASKS.md` TSK-107; el
bug abierto relacionado en `BUGS_HISTORICOS.md` BUG-061. NO hay archivos nuevos
en `api/` (8/8 intacto, ADR-001); SI hay una migracion nueva
(`db/migrations/019_media_guardados_radio.sql`, sin versionar aun).

**Cambios (verificados contra archivo real, ADR-006; `git diff --stat` = 7
archivos, +591/-53 + 1 migracion nueva):**
- `api/interacciones.js` (+212/-14): **ADR-031** -- `multimedia_mapa` envuelto en
  `queryConAvatarFallback` (fix del 503 por `usuarios.foto_url` ausente), fila
  agregada `origen='destino_album'` (portada + `fotos_count`) ademas de
  `origen='destino'`, y filtro restrictivo solo con `scope=mio` (`mmUsuarioId`
  null por defecto). **ADR-032** -- GET `mis_fotos`, GET `mis_guardados_media`,
  POST `guardar_media`/`quitar_guardado_media` (503 explicito si falta la 019).
  **ADR-033** -- `factorXpPorRadio`/`RADIO_XP_MEDIO_M`/`RADIO_XP_CERO_M`,
  `resolverRadioM` priorizando `destinos.radio_m` en `POST tipo=visita`.
- `index.html` (+89/-3): toggle "Solo mio" (`#mm-solo-mio`).
- `index-api-connector.js` (+57/-31): `cargarMapaMedia()` agrega
  `&scope=mio&usuario_id=` solo con toggle activo y sesion; sin toggle, capa
  publica.
- `mi-perfil.html` (+109/-0): "Mis fotos" (`#mis-fotos-grid`) y "Mis guardados"
  (`#mis-guardados-media-grid`) con `mediaCardHTML` y `quitarGuardadoMedia()`.
- `perfil.html` (+60/-3): "Sala V: Fotos" publica de solo lectura (consume
  `mis_fotos` del dueno del museo; NO muestra guardados, que son privados).
- `admin.html` (+51/-1): campo `#f-radio-m` (min 25, max 100000) + presets +
  carga/guardado.
- `api/admin-destinos.js` (+16/-3): `radio_m` en SELECT/INSERT/UPDATE con
  validacion de rango.
- `db/migrations/019_media_guardados_radio.sql` (NUEVA, 65 lineas, idempotente
  ADR-008, ASCII-safe ADR-002): `destinos.radio_m` + `destinos_radio_m_check`
  (25..100000) + tabla `media_guardados` + 2 indices.

**Decisiones de producto:** visibilidad publica para fotos subidas y albumes
creados, privada para guardados (ADR-032); la capa de media del mapa es publica
por defecto y "Solo mio" es opt-in (ADR-031); la visita se registra siempre y
solo cambia la XP segun la amplitud del radio (ADR-033).

**Nota de verificacion (ADR-006):** en el working tree NO se encontro consumidor
de `guardar_media` (solo de `quitar_guardado_media`), por lo que hoy no hay UI
que cree un bookmark. El header de `api/interacciones.js` sigue en `v14` pese a
que los comentarios nuevos y la migracion citan `v17`.

**Verificacion:** documental contra archivo real (existencia de la migracion,
anclas de linea en los 7 archivos). NO se ejecutaron `node --check` ni smokes en
esta sesion documental; no se reportan resultados de pruebas no corridas.

#### Que sigue
1. **APLICAR `db/migrations/019_media_guardados_radio.sql` EN NEON (BLOQUEANTE,
   lo ejecuta Javier).** Sin ella: `guardar_media`/`quitar_guardado_media`
   responden 503, los GET degradan, y el SELECT de visita que lee `radio_m`
   puede fallar.
2. **Commit + push + deploy en un solo release** con los pendientes previos sin
   commitear (TSK-095..TSK-106 + migraciones 015/016/017/018 + scripts de la
   004). NO mezclar los 3 archivos borrados ajenos (`PROMPT.md`,
   `prompt_exploraco_tsk104.md`, `promptarreglos.txt`).
3. **Verificacion en vivo:** `hostal-r10-bogota` aparece con pin de album
   (`destino_album`); capa publica por defecto y "Solo mio" con sesion;
   `mis_fotos`/`mis_guardados_media` en perfil; radio explicito de "Estuve aqui"
   (XP 50% > 1 km y 0 > 5 km).
4. **UI de alta de bookmark (`guardar_media`):** agregar el marcador en
   `galeria.html`/ficha para poblar "Mis guardados"; hoy el area existe pero no
   se puede alimentar desde la UI.
5. **Bump de version:** alinear el header de `api/interacciones.js` (`v14` ->
   `v17`) con los comentarios y la migracion en el commit (ADR-006).
6. **BUG-061 sigue ABIERTO:** `POST tipo='foto'` sin `validarSesion`; escalado a
   `sql-security`.

#### Riesgos activos
- **Migracion 019 pendiente (BLOQUEANTE):** sin ella, los guardados responden
  503, `mis_guardados_media` degrada a vacio y el `radio_m` de la visita no
  esta disponible.
- **Sin UI para crear bookmarks:** el area "Mis guardados" no se puede poblar
  desde la interfaz; solo por API directa.
- **Header de version desalineado (`v14` vs `v17`):** deuda documental a
  resolver en el commit (ADR-006).
- **Bono rural vs radio grande:** con `radio_m > 5000` la XP base es 0, pero el
  bono rural plano (+20, ADR-024) sigue sumando; residuo a revisar.
- **BUG-061 (seguridad, MEDIA):** `tipo='foto'` es suplantable; los flujos
  nuevos de media conviven con el.

### Sesion TSK-106 "Capa multimedia, galeria comunidad y galeria hospedajes" (2026-09-16) - ADR-030 actualizado

Tarea TSK-106 implementada y verificada en working tree (SIN commitear). El prompt
de origen es `PROMPT_MULTIMEDIA_GALERIA.md` (sin versionar). La decision vive en
`DECISIONS.md` ADR-030 (actualizado, no reemplazado); la tarea en `TASKS.md`
TSK-106; el bug derivado en `BUGS_HISTORICOS.md` BUG-061. NO hay migraciones
nuevas ni archivos nuevos en `api/` (8/8 intacto, ADR-001).

**Cambios (verificados contra archivo real, ADR-006; `git diff --numstat` = 5
archivos, +243/-56):**
- `api/interacciones.js` (+28/-5): `GET ?tipo=multimedia_mapa` acepta
  `usuario_id` opcional validado por regex uuid (si es invalido el filtro se
  IGNORA; nunca llega texto no-uuid a `::uuid` -> sin 22P02). Con `usuario_id`:
  rama albumes -> `a.usuario_id=$N::uuid`; rama destinos -> `d.id IN (SELECT
  i.destino_id FROM interacciones i WHERE i.usuario_id=$N::uuid AND i.tipo IN
  ('guardado','voto','rating') AND i.activo=true)`. SIN `usuario_id` el SQL
  publico es byte-identico al anterior (regresion cero). Se sustituyo el calculo
  fragil `(mmTipos?'2':'1')` por indices capturados (`mmIdxTipos`/`mmIdxCiudad`/
  `mmIdxUsuario`), con `null` cuando el opcional no viene.
- `index-api-connector.js` (+12/-2): la capa multimedia llama
  `tipo=multimedia_mapa` SIN `origen=album` y con `&usuario_id=<id>` cuando hay
  sesion (`window.ExploraCO.usuario.id`). **Decision H-1: el filtro es
  RESTRICTIVO** (el logueado ve solo lo suyo), no aditivo.
- `index.html` (+30/-6): `renderMapaMedia` y `mdMediasCercanas` ya NO descartan
  `origen==='destino'`; pins de destino con color `#1f8a70` + borde punteado
  (`.mpa-media-pin-dest`) y dedupe por `origen_id` (slug) con tope de 300
  markers; el drawer titula para ambos origenes.
- `api/pagina-destino.js` (+12/-5): PROBLEMA 4 - el hero pasa de 3 a 12
  miniaturas (`HERO_THUMBS_MAX=12`, `slice(1, HERO_THUMBS_MAX + 1)`), la query
  de `destinos_fotos` sube `LIMIT 12 -> 24` y el CSS `.prow` pasa de `flex` a
  `grid` responsivo (6 col desktop, 4 col `<=760px`), `.pth` sin `flex:1`.
- `galeria.html` (+161/-38): PROBLEMA 3 RE-ALCANZADO a este archivo (no a
  `comunidad.html`, que no tenia la seccion). Modo destino unificado: aviso
  "Tienes fotografias de tu viaje?...", `<input type="url">` + boton que hace
  `POST /api/interacciones {tipo:'foto', usuario_id, destino_id, url}`, grid
  unico "Fotos del destino" usando `incluir=viajeros` (`items[]` del endpoint,
  con fallback a `fotos[]`+`usuarios[]`). Se elimino `gSeedCard` y la seccion
  `#g-dest-usuarios`.

**Decisiones de producto (usuario, 2026-09-16):** P2 (tab audiovisual de "Mi
Viaje Personal") OMITIDO; P3 aplicado en `galeria.html`, no en `comunidad.html`;
H-1 RESTRICTIVO confirmado; H-2 registrado como BUG-061 (no corregido aqui).

**Verificacion:** `node --check` OK en `api/interacciones.js`,
`api/pagina-destino.js` e `index-api-connector.js`; ASCII-safety 0 bytes >127 en
los 3; `node scripts/smoke_auditoria_pagina_destino.js` ->
`TODOS LOS SMOKE TESTS PASARON (54 checks)`.

#### Que sigue
1. **Commit + push + deploy en un solo release** de TSK-106 junto con los
   pendientes previos sin commitear (TSK-095..TSK-105 + migraciones 015/016/017/018).
2. **NO mezclar en ese commit los 3 archivos borrados ajenos a TSK-106:**
   `PROMPT.md`, `prompt_exploraco_tsk104.md` y `promptarreglos.txt`.
3. **Corregir H-2 (BUG-061):** `POST /api/interacciones` `tipo='foto'` debe
   validar sesion (`validarSesion`/JWT) en vez de confiar en `body.usuario_id`.
   Escalado a `sql-security`.
4. **Verificacion post-deploy:** pins de album + destino en el mapa cultural
   (con y sin sesion), drawer con el material propio del usuario, galeria del
   destino con 12 miniaturas en el hero (slug con mas de 12 fotos, ej.
   hostal-r10) y compartir foto desde `galeria.html`.
5. **Posible auto-recarga de `galeria.html` al iniciar sesion:** hoy
   `G.usuarioId` se resuelve en `gInit()`; si el usuario inicia sesion despues
   de cargar la pagina, el aviso puede no habilitarse hasta recargar.
6. **Confirmar el breakpoint movil del grid del hero (`.prow`):** el corte es
   `<=760px` (6 -> 4 columnas); validar en pantallas intermedias.
7. **H-3 (no bloqueante):** `scripts/smoke_auditoria_pagina_destino.js` IGNORA
   el slug de `process.argv` (el prompt proponia correrlo con `hostal-r10`);
   candidato a aceptar el slug y validar la ficha real.

#### Riesgos activos
- **Deploy pendiente:** la capa multimedia por usuario, los 12 thumbs del hero
  y la galeria unificada de `galeria.html` no estan en produccion hasta el
  commit/push/deploy.
- **BUG-061 (seguridad, MEDIA):** `tipo='foto'` es suplantable mientras no se
  valide la sesion; la UI nueva de `galeria.html` lo expone. Escalado a
  `sql-security`.
- **H-3:** el smoke de la ficha no prueba el slug real pasado por argumento;
  cobertura efectiva menor a la que sugiere el comando del prompt.
- **P2 omitido:** el tab audiovisual de "Mi Viaje Personal" queda como deuda de
  producto (no existe); la capa multimedia por usuario se valida solo en el
  mapa cultural.

### Sesion TSK-105 "Lote promptarreglos" - galeria unificada de destino + arreglos de DM, galeria, popover, visita y album (2026-09-16) - ADR-030

Tarea TSK-105 implementada y verificada en working tree (SIN commitear), Escudo
GOLD limpio. La decision vive en `DECISIONS.md` ADR-030; la tarea en
`TASKS.md` TSK-105; los bugs en `BUGS_HISTORICOS.md` BUG-055..BUG-060. NO hay
migraciones NUEVAS ni archivos nuevos en `api/` (8/8 intacto, ADR-001). El spec
de origen vive en `docs/superpowers/specs/2026-09-15-galeria-unificada-destino-design.md`.

**Cambios (verificados contra archivo real, ADR-006):**
- `api/interacciones.js` (271 lineas cambiadas; header real sigue **v14**, los
  comentarios nuevos se rotulan `v16` sin bloque de changelog -> deuda menor):
  - **BUG-055:** `dm_hilos` castea `m.usuario_id::text<>$1`,
    `m2.usuario_id::text=$1` y `bloqueador_id::text=$1 OR bloqueado_id::text=$1`
    (L2937-2939, L2962) para resolver `SQLSTATE 42P08` (el parametro `$1` se
    comparaba contra `split_part()` text y columnas uuid a la vez).
  - **BUG-060:** helper `queryConAvatarFallback` (L2114) que ante `42703`
    (`usuarios.foto_url` ausente) reintenta con `COALESCE(u.avatar_url,'')` en
    `museo_publico` (L2760), `album_detalle` (L3382/L3394) y `galeria_destino`
    (`gdUsuarios`/`gdViajeros`, L3499/L3542). Nunca silencia: re-lanza cualquier
    otro codigo.
  - **ADR-030:** `tipo=galeria_destino` gana `incluir`/`usuario_id` e `items[]`
    aditivo (solo se emite con `incluir`); 403 `ALBUM_AJENO` (L5143) y 400
    `AUTOR_ORIGINAL_INVALIDO` (L5181) en `album_agregar_foto`; `album_voto` llama
    `repartirXpReferidos` (L5237).
- `api/pagina-destino.js` (197 lineas cambiadas): UNA sola `#galeria`
  (miniaturas curadas + "Fotos de viajeros" `#fp-grid` + `#fp-upload`, ancla
  legacy invisible `<span id="fotos">`); `secComoLlegar` (L1810) fusiona
  `secTransporteHostal` + `secMapa` (id="como-llegar", una sola entrada de
  subnav, ancla legacy `#mapa`); UI "Guardar en album" (`abrirAlbumPopover`);
  helper `galEsc()` (L2379) que escapa HTML (cierra un XSS preexistente del
  inline); fix de `cerrarPopoverGuardar` (L2298) y `toggleMapaDest` (L2347)
  (BUG-057).
- `api/admin-destinos.js` (71 lineas cambiadas) y `api/utilidades.js` (59):
  semantica REPLACE de `destinos_fotos` (dedupe por url + DELETE + reinsert,
  helper `normFotosGaleria` L43-60) con guard anti-perdida (lista vacia -> 400 y
  NO borra; BUG-056); `admin.html` (8 lineas) elimina la doble escritura de la
  galeria.
- `api/usuarios.js` (27 lineas cambiadas): fallback de avatar en
  `perfil_publico` (BUG-060).
- `usuario-session.js` (127 lineas cambiadas): "Estuve aqui" solicita
  `GET ?tipo=geo_nonce_solicitar` (L649-665), envia `Authorization: Bearer` +
  `nonce`, maneja 401 con `refreshJwt` y reintenta UNA vez con nonce nuevo
  (L698-767); `obtenerUbicacion` (L602-647) distingue codigos 1/2/3 y reintenta
  con baja precision ante 2/3. **Cierra BUG-036.**
- `scripts/smoke_auditoria_pagina_destino.js` (56 lineas cambiadas): pasa a
  **54 checks** (modulo unificado siempre visible).
- NUEVOS sin versionar: `scripts/apply_004_foto_url.js` (aplica la migracion
  004; causa raiz del 503) y `scripts/dedupe_destinos_fotos.js` (backup + borra
  duplicados + `CREATE UNIQUE INDEX idx_destinos_fotos_destino_url`).

**Decisiones de producto (revisadas por architect-review):** NO se votan fotos
curadas en este MVP (no se creo `foto_curada_voto`; `tipo_voto=null` para
curadas) porque `destinos_fotos.id` NO es estable (el REPLACE lo re-crea); se
vota solo viajeros (`foto_voto`) y album (`album_voto`). `origen='album'`
(album_fotos por cercania) queda APAGADO por defecto (solo con
`incluir=albumes`). `items[]` solo se emite si el cliente envia `incluir`
(protege a `galeria.html`). El modulo unificado se muestra SIEMPRE. El
`autor_original_id` null lo normaliza `album_agregar_foto` con `|| usuarioId2` y
el dedup se hace por SELECT.

**Verificacion:** `node scripts/smoke_auditoria_pagina_destino.js` ->
`TODOS LOS SMOKE TESTS PASARON (54 checks)`; `node --check` OK en los `api/*.js`
tocados; helper `galEsc` cierra el XSS del inline; `git diff --stat` = 8
archivos, +649/-167.

#### Que sigue
1. **APLICAR la migracion 004 en Neon (BLOQUEANTE, lo ejecuta Javier; requiere
   `DATABASE_URL`):** `node scripts/apply_004_foto_url.js` (`usuarios.foto_url` +
   `ciudad_base`; idempotente). Cierra de raiz el BUG-060.
2. **Ejecutar el dedupe + indice unico (BLOQUEANTE):** `node
   scripts/dedupe_destinos_fotos.js --apply` (backup + borra duplicados +
   `CREATE UNIQUE INDEX idx_destinos_fotos_destino_url`). Cierra al 100% el
   BUG-056.
3. **Commit + push + deploy en un solo release** (esta entrega + los pendientes
   previos sin commitear de TSK-095..TSK-104 y las migraciones 015/016/017/018).
   Incluir el bump del header `v14` -> `v16` de `api/interacciones.js` si se
   decide mantener el rotulo.
4. **Verificacion post-deploy en vivo:** `dm_hilos` 200; "Estuve aqui" completa
   con nonce + Bearer; el popover Guardar conserva los checkboxes; la galeria no
   repite fotos; voto viajeros/album y "Guardar en album" (403 `ALBUM_AJENO` con
   album ajeno); sin 503 en museo/galeria/albumes/perfil publico; "Como llegar"
   con transporte + mapa en una sola seccion.

#### Riesgos activos
- **Migracion 004 pendiente (BLOQUEANTE):** sin aplicarla, `usuarios.foto_url`
  no existe; la degradacion mantiene las rutas en 200 pero el avatar cae siempre
  a `avatar_url` y `ciudad_base`/autor de blog quedan inutilizables (BUG-060).
- **Datos duplicados de galeria pendientes (BLOQUEANTE para el cierre):** el
  codigo ya no duplica, pero las filas historicas de `destinos_fotos` siguen
  repetidas y el indice unico no existe hasta correr el script (BUG-056).
- **Header de version desalineado:** `api/interacciones.js` sigue en `v14`
  mientras los comentarios nuevos dicen `v16`; deuda documental a resolver en el
  commit (ADR-006).
- **Voto de fotos curadas fuera del MVP:** recorte explicito; requiere un ancla
  estable futura (no `destinos_fotos.id`).


## Sesion 2026-09-29 (modo express) - Subida de medios con Vercel Blob

**Que se estaba haciendo:** instalar subida real de archivos (imagenes, audio y
video) con Vercel Blob en TODAS las superficies de carga del sitio, en un solo
pase express.

**Alcance real ejecutado:**
- `package.json`: dependencia `@vercel/blob@2.8.0`.
- `api/utilidades.js`: nueva rama `?tipo=blob_upload` (client upload tokens via
  `handleUpload`), con 3 modos de autorizacion (admin/user/publico-destino),
  prefijo obligatorio de pathname y limites foto 5 / audio 15 / video 30 MB.
  **8/8 endpoints intacto** (no se creo archivo nuevo en /api; ADR-068).
- NUEVO `media-upload.js`: cliente compartido (`window.MediaUpload.subir`) que
  carga `@vercel/blob/client` desde `esm.sh@2.8.0` y valida tipo/tamano.
- Cableado de subida en: `mi-perfil.html` (Museo, +Agregar foto a album,
  portada de album crear/editar, foto de perfil), `publicar.html` (foto
  principal + galeria), `admin.html` (hero, galeria, cartas).
- `.env.example`: documenta `BLOB_READ_WRITE_TOKEN`.

**Evidencia (ADR-006):** `node --check` OK en `api/utilidades.js` y
`media-upload.js`; ASCII 0 bytes>127 en ambos; divs balanceados (mi-perfil
551/551, publicar 140/140, admin 1077/1077); bloques inline parsean (vm.Script);
prueba local del handler 7/7 (503 sin token, 401 anonimo museo/video, 200
admin y anonimo-destino, 403 pathname ajeno, 405 GET); smoke 036 media 93/93.

**Que sigue:**
1. Commit + push + deploy. En Vercel, confirmar el store Blob conectado al
   proyecto (inyecta `BLOB_READ_WRITE_TOKEN`) y para local `vercel env pull`.
2. Prueba manual end-to-end en produccion: subir foto/audio/video en cada
   superficie; verificar 401 sin sesion, rechazo por tipo/tamano y render en
   galeria/comunidad/mapa; confirmar que el archivo aparece en el dashboard de
   Blob.
3. Opcional: boton de subida para los marcadores `[foto:]/[video:]` del editor
   de blog del admin.

**Riesgos activos:**
- `[DEUDA-EXPRESS]` subida anonima (solo foto de destino) sin rate-limit
  propio; `blobVerificarJwt()` duplica el verificador de `interacciones.js`;
  dependencia de CDN `esm.sh` en runtime; marcadores de blog siguen por URL.
- El store debe permanecer **publico** (`access:'public'`): las galerias
  renderizan la URL directa del blob.

> **Historico: sesiones del 2026-09-15 y anteriores (TSK-104 y previas, mas hotfixes), incluidos los bloques 2026-09-12..15, las Fases 6-9 y los bloques de Sprint 2-7, movidas a NEXT_ARCHIVO.md.**
