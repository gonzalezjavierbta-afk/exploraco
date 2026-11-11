# Spec de diseno: familias de carta, vector de stats, valor y tirada (LATAWEL)

- **Fecha:** 2026-11-11 (v3: aplica auditoria `@sql-security`, 0 ALTOS / 4 MEDIOS; ver 11.5)
- **Autor:** @architect
- **Estado:** Fase 0 v3. NO implementa codigo. 066 y 067 **aplicadas**; enmiendas de esquema en **068** (contrato en 11.5).
- **Alcance de la tanda:** este documento + contrato de 066/067 (ya aplicadas) + **068** (enmienda 2). **No se toca `api/admin.js` ni `api/interacciones.js` ni las migraciones aplicadas**: todo lo que requiera codigo queda como **contrato de fase 2 con duenno y gate** (tabla en 10).
- **Normativa:** ADR-001 (8/8 funciones), ADR-002 (ASCII-safe), ADR-003 (cero borrado logico), ADR-006 (baseline = archivo real), ADR-008 (idempotencia), ADR-018 (sinks no tocan `xp_total`), ADR-084 D5 (lectura por rango), ADR-108 (cartas unificadas), ADR-117 (jugable = tiene diseno), ADR-120 (consumibles 24 h y set Ancestral).

---

## 0. Alcance y hechos medidos (archivo:linea)

Todo lo que sigue se verifico en el archivo real del repositorio el 2026-11-11 (ADR-006). No se cita TASKS.md ni NEXT.md como prueba de estado, solo como registro de deuda.

### 0.1. Esquema de cartas

| Hecho | Fuente |
|---|---|
| `cartas_catalogo`: `id text PK`, `nombre`, `set_slug`, `rareza varchar(20)` con CHECK `('comun','raro','epico','dorado')`, `nivel_gate smallint NULL`, `es_evento bool`, `imagen_url`, `activo`, `creado_en` | `db/migrations/040_gobernanza_cartas_moneda.sql:97-109` |
| Indice `idx_cartas_catalogo_set (set_slug, activo)` | `040:111-112` |
| 21 cartas sembradas: 18 de gate (`ct_mundana_01..03`, `ct_explorador_01..04`, `ct_cronista_01..05`, `ct_leyenda_01..06`) + 3 de evento (`ce_evento_01..03`) | `040:118-140` |
| `usuarios_cartas` nace con PK `(usuario_id, carta_id)` y `cantidad int >= 0` | `040:155-163` |
| `cartas_gates`: CHECK `nivel_gate IN (10,14,20,25)` (vive AQUI, no en el catalogo) | `040:168-176` |
| `cartas_intercambios` (ledger append-only de intercambios) | `040:181-194` |
| `cartas_catalogo`: `emisor_tipo varchar(10) NOT NULL DEFAULT 'sistema'`, `emisor_id uuid` (SIN FK a proposito), `marca_id uuid` (FK RESTRICT), `descripcion`, `stats_json jsonb NOT NULL DEFAULT '{}'`, `es_canjeable_qr bool`, `fusionable bool` | `060:236-261` |
| CHECKs de catalogo: `chk_cartas_catalogo_emisor_tipo` (sistema/ugc/marca), `fk_cartas_catalogo_marca_id`, `chk_cartas_catalogo_stats` (objeto plano + `bonus_xp_pct` numerico 0..100), `chk_cartas_catalogo_fusionable`, `chk_cartas_catalogo_emisor_coherente` | `060:296-369` |
| `usuarios_cartas`: `variante varchar(10) NOT NULL DEFAULT 'base'`, `en_museo`, `orden_museo`; `chk_usuarios_cartas_variante`; `uq_usuarios_cartas_variante`; `chk_usuarios_cartas_museo`; indice unico parcial del museo | `060:175-228` |
| Mercado: `cartas_ofertas.variante` y `cartas_ventas.variante` con su CHECK | `060:393-421` |
| 6 cartas de sistema fusionables `ct_comun_01..06` en `territorio_comun` (4 comun, 2 raro) | `060:442-448` |
| PK de `usuarios_cartas` promovida a `(usuario_id, carta_id, variante)` en UNA sentencia atomica; `uq_usuarios_cartas_variante` se conserva | `db/migrations/061_cartas_pk_variante.sql:29-51` |
| `usuarios_cartas` baseline medido el 2026-10-27: 0 filas / SUM(cantidad) 0; `cartas_catalogo` 27 filas | `061:72-73` |
| `cartas_catalogo.set_coleccion bool NOT NULL DEFAULT false` | `db/migrations/065_cartas_set_ancestral_premio.sql:56-57` |
| 4 cartas `cta_ancestral_01..04` (`emisor_tipo='marca'`, `marca_id` ANCESTRAL, `fusionable=false`, `set_coleccion=true`, `stats_json` con `sku`/`volumen_ml`/`set_slug`/`premio_set`) | `065:70-105` |
| `canjes_tienda.origen` admite un tercer valor `'premio_set'` (superconjunto, nunca estrecha) | `065:115-127` |
| Constantes unicas: `CARTA_FUSION_XP=200`, `MUSEO_TOPE=12`, `CARTA_VARIANTES=['base','shiny']`, `CARTA_VARIANTE_DEFECTO='base'` | `lib/cartas-config.js:28-44` |

### 0.2. Economia y consumidores

| Hecho | Fuente |
|---|---|
| `consumibles`: `id uuid`, `clave varchar(50) UNIQUE`, `nombre`, `precio_xp int`, `activo` | `db/migrations/010_gamificacion_v4.sql:16-24` |
| `xp_gastado_sinks numeric(12,2) NOT NULL DEFAULT 0`: **contador de gasto, no saldo**; los sinks **NUNCA tocan `xp_total`**; `XP_DISPONIBLE = xp_total - xp_gastado_sinks` es monotono no creciente y el nivel (`calcularNivel(xp_total)`) es monotono | `db/migrations/046_market_multimoneda_sinks.sql:40-44` |
| Guardian doble vigente en el codigo: `xp_total >= $c` **y** `GREATEST(xp_total - COALESCE(xp_gastado_sinks,0),0) >= $c` | `api/interacciones.js:1448-1459` |
| `xp_ledger` (append-only): `accion`, `xp_base`, `mult_*`, `cap_aplicado`, `bonos_planos`, `xp_final`, `es_exento`, `contexto` | `db/migrations/031_gamificacion_v6_nivel_scaling.sql:225-240` |
| Lista negra de bonos: `BONO_EXCLUIDAS` incluye `mision: true`, `logro`, `carta_fusion`, `carta_evento`, `carta_venta_*`, `compra_consumible` | `api/interacciones.js:5097-5108` |
| Misiones = catalogo en codigo, DAG por `requiere[]`, check server-side sobre acciones reales (`guardado`, `resena` con `xp_ganado>=25`, `visitas`, `xpTotal`) | `api/interacciones.js:3995-4059` |
| **No existe tabla de misiones completadas**: el estado de una mision es DERIVADO de acciones reales, no persistido | busqueda en `db/migrations` de `usuario_misiones`/`misiones_completadas`/`logros`: 0 tablas |
| Vocaciones de artista: `musico`, `cine`, `artista_grafico`, `escritor` (ejes `art_*`) | `api/interacciones.js:2450-2453` |
| `canjes_tienda`: `consumible_clave`, `precio_xp_unitario`, `xp_total`, `origen`, `estado`, `contexto jsonb` | `db/migrations/058_marcas_self_service_premios_canje.sql:306-325` |
| `cartas_ofertas` (escrow P2P): `cantidad`, `cantidad_restante int >= 0`, `precio_xp`, `estado IN ('abierta','parcial','cerrada','cancelada')`, `activo` | `db/migrations/041_cartas_ofertas_tithe.sql:109-130` |
| `carta_publicar` mueve copias de `usuarios_cartas` a `cartas_ofertas.cantidad_restante`: la circulacion real no esta toda en `usuarios_cartas` | `api/interacciones.js:16206-16209`, `:16328-16332` |
| **La venta P2P de cartas NO cobra tithe:** el comprador debita y se acredita el **bruto** al `vendedor_id` | `api/interacciones.js:16334-16337` |
| El unico punto de tithe es `aplicarTitheParche` (10% de **fama de pandilla**), no el mercado de cartas | `api/interacciones.js:5430-5437` |
| `cartas_crear` inserta una **lista explicita de columnas sin `familia`/`subtipo`**: un `NOT NULL` sin DEFAULT las rompe | `api/admin.js:1438-1446` |
| `albumes` (por usuario, `ON DELETE CASCADE` desde `usuarios`) y `album_fotos` (`album_id NOT NULL REFERENCES albumes ON DELETE CASCADE`, `foto_type IN ('foto','video','audio')`) | `009_albumes.sql:25-42` (albumes) y `009_albumes.sql:46-60` (album_fotos, `foto_type` en `:52`) |

### 0.3. Deuda, presupuesto y un hueco medido

- **D-5 (deuda viva):** `stats_json.bonus_xp_pct` "sigue display-only... no altera ningun calculo de XP y no tiene consumidor" (`exploraco desarrollo/NEXT.md:65`, literal (d); riesgo repetido en `NEXT.md:67` (b)). Lectores reales hoy: `api/admin.js:593, 594, 1418, 1537` (autorizacion/edicion) y `cartas-ui.js:100, 117, 310` (display). **Cero consumidores de XP.**
- **Presupuesto serverless: 8/8 agotadas.** Esta spec no crea endpoints: todo entra por ramas `?tipo=` existentes de `api/interacciones.js`, `api/usuarios.js` y `api/admin.js`.
- **Hueco medido (importante para 066, deuda documental D-12):** `api/admin.js:1348` afirma que "la autoridad de juego es la vista `cartas_jugables` (064)", pero **ningun `.sql` del repositorio crea esa vista** (`Get-ChildItem -Recurse -Include *.sql | Select-String "cartas_jugables"` = 0 resultados; el archivo `db/migrations/064_consumibles_bono_global_pct.sql` es de consumibles). La vista solo aparece en `api/admin.js:1348`, `scripts/smoke_cartas_jugables.js` y la spec de 2026-11-10. **Consecuencia de diseno:** 066/067 **no** recrean ni asumen esa vista; se verifica su existencia y su conjunto de columnas, y ninguna rama nueva depende de ella. **No bloquea 066** (es deuda documental, 9.2).
- **Cifra de cartas:** 21 (`040:118-140`) + 6 (`060:442-447`) + 4 (`065:75-90`) = **31**.

---

## 1. Matriz del referente Rising Star

**Aviso de honestidad documental:** el repo **no** contiene ninguna fuente primaria de Rising Star. Todo lo de la columna "referente" es **NO VERIFICADO** (descripcion estructural de memoria de modelo, sin cita). Por eso **ningun numero de Rising Star entra como valor normativo en esta spec**: se copia el ESQUEMA, no las cifras. Los unicos numeros normativos son los aprobados por el operador (seccion 4) y los derivados aritmeticamente de ellos (seccion 3).

| Elemento | En Rising Star (**NO VERIFICADO**) | Se copia | Por que / donde vive en LATAWEL |
|---|---|---|---|
| **Fans** | Audiencia acumulada; desbloquea giras y patrocinios | **Si, como `alcance`** | Es el unico eje que mide "cuanta gente te ve" con acciones reales del producto (guardados, resenas, votos, media). Consumidor: umbrales de expedicion y peso de tirada. |
| **Skill** | Calidad tecnica; sube con practica | **Si, como `oficio`** | Ya existe la materia prima: resenas con `xp_ganado>=25` (`api/interacciones.js:4009`), `n_resenas_largas` (`:2453`), media propia (`:2450-2452`). |
| **Luck** | RNG de eventos y oportunidades | **Si, como `fortuna`, pero ACOTADO** | Entra solo como modificador **de pesos de tirada con techo +20%** y como umbral de expedicion. Nunca como multiplicador de XP. |
| **IM (industry modifier)** | Bonus por industria/red | **Si, como `rendimiento`** | Absorbe la intencion de `bonus_xp_pct` (deuda D-5) pero **por umbrales y caps por tipo de accion**, jamas como % global. |
| **Energia** | Recurso que se gasta por accion y se regenera con tiempo | **NO** | Decision cerrada 2: el juego va por **acciones reales**. Un loop de energia sin consumidor seria una stat muerta y un incentivo a esperar en vez de explorar. Nombre `energia` queda **RESERVADO** (seccion 3.6). |
| **Ego** | Estado que puede arruinar la carrera (castigo RNG) | **NO** | Castigo aleatorio sobre progreso ya ganado = friccion gratuita y riesgo de soporte. Nuestro equivalente es **degradacion de valor por supply**, no perdida de progreso. |
| **Tirada de cartas por packs** | Packs con probabilidades por rareza | **Si, con pesos fijos** | Pesos 5000/1000/250/50 aprobados; denominador = suma de pesos elegibles, con renormalizacion al agotarse una rareza. |
| **Mercado P2P de cartas** | Compraventa entre jugadores con moneda del juego | **Si, ya existe (sin impuesto)** | `cartas_ofertas`/`cartas_ventas` (`041:109-130`) existen y el comprador paga en XP, pero la venta **acredita el bruto** al vendedor (`api/interacciones.js:16334-16337`): **no hay tithe de cartas hoy**. Royalty y tithe de cartas son **contrato de fase 2** (6.4), no un hecho. |
| **Misiones por acciones** | Objetivos con recompensa y desbloqueo | **Si, extendiendo el DAG** | `MISIONES` (`api/interacciones.js:3995`) ya evalua acciones reales; se le anade el requisito de vector. |
| **Multiplicador global de XP por stats** | (No es de Rising Star; es la tentacion obvia) | **NO** | Decision cerrada 3: **ninguna stat multiplica el XP global**. El XP lo gobiernan `xp_ledger` + `BONO_EXCLUIDAS` (`api/interacciones.js:5097-5108`). |

**Lo que se copia en una frase:** cuatro ejes con techo, tirada por pesos, mercado con impuesto, misiones por acciones reales. **Lo que no:** energia, castigo RNG, y cualquier stat que multiplique el XP.

---

## 2. Taxonomia de 7 familias en 3 capas

### 2.1. Capas, familias y subtipos

La **capa** es una funcion pura de la familia (no se persiste: dos autoridades sobre el mismo hecho derivan en silencio).

| Capa | Familia | Que es | Subtipos (dominio cerrado) | Fuente de la carta | Comerciable en XP | Fusionable | Museable |
|---|---|---|---|---|---|---|---|
| **Juego** | `lugar` | Destino, territorio o patrimonio de Colombia | `territorio`, `patrimonio`, `natural` | Drop por gate (`cartas_gates`), tirada, canje | **Si** | **Si** | **Si** |
| **Juego** | `personaje` | Persona real, de ficcion o de folclor | `historico`, `ficcion`, `folclor` | Tirada, UGC aprobada | **Si** | **No** (fusion v1: exige `nivel_gate IS NULL`; ver nota D-21) | **Si** |
| **Juego** | `artista` | Autor creativo (una carta por obra) | `musica`, `cine`, `grafica`, `literatura` (espeja las vocaciones de `api/interacciones.js:2450-2453`) | UGC aprobada | **Si** | **Si** | **Si** |
| **Juego** | `marca` | Marca aliada; puede gatear set y premio | `licor`, `gastronomia`, `artesania`, `otra` | SKU (`es_canjeable_qr`) o acunacion XP | **Si** | **No** (fusion v1: exige `nivel_gate IS NULL`; ver nota D-21) | **Si** |
| **Economia** | `producto` | Recibo coleccionable de un SKU fisico | `fisico`, `digital` | `canjes_tienda` con `origen='premio_set'` o mostrador | **No (sin predicado hoy: D-15)** | **No** | **No** |
| **Economia** | `consumible` | Recibo de un consumible/entrada con efectos | `entrada_evento`, `bono`, `servicio` | `consumibles.clave` (`010:16-24`) | **No (sin predicado hoy: D-15)** | **No** | **No** |
| **Estatus** | `cosmetica` | Pieza de vitrina: marco, fondo, insignia | `marco`, `fondo`, `insignia` | Acunacion XP, drops cosmeticos | **Si** | **No** | **Si** |

**Fusion en v1 (contrato, D-21).** `personaje` y `marca` **NO** son fusionables en v1 mientras lleven `nivel_gate`: las **14** cartas sembradas de ambas familias (8 `personaje` + 6 `marca`) llevan gate 10/14/20/25, y `chk_cartas_catalogo_fusionable` exige `nivel_gate IS NULL` (`060:352-355`), asi que quedaron `fusionable=false`. **Manda el esquema.** La fusion de `personaje` queda como **extension** (requiere relajar el CHECK o quitar el gate), **no prometida** en este contrato. Las unicas fusionables de v1 son `lugar` (los 6 `ct_comun_*`) y `artista` (cuando exista).

**Reglas duras de la taxonomia (todas verificables por CHECK en 066):**

1. `familia` es dominio cerrado de 7 valores. `subtipo` es dominio cerrado **por familia** (no hay subtipo valido en dos familias).
2. **`producto` y `consumible` no tienen `precio_xp`**: se pagan por su SKU (`consumibles.clave` + `consumibles.precio_xp`, `010:16-24`) o en COP en el mostrador. `marca` **si** puede tener `precio_xp` porque la acunacion de una carta de marca es un sumidero de XP (y su entrega por QR sigue existiendo).
3. **`producto` y `consumible` no aportan puntos a ningun eje.** Un vector vacio garantiza que una carta de SKU **no da poder de juego**; **no** garantiza que no se pueda comerciar: hoy `carta_publicar` solo exige `activo=true` (`api/interacciones.js:16200-16209`), asi que **una carta de producto se puede listar y vender por XP**. El predicado de familia es **contrato de fase 2** (dueno `@backend-dev`, gate SI) y queda registrado como **D-15**. Mientras D-15 no exista, esta spec **no afirma** que el SKU no compre juego: afirma que no compra **poder**.
4. `marca` y `personaje` **no son fusionables en v1** mientras lleven `nivel_gate` (CHECK ya vigente: exige `nivel_gate IS NULL`; ver nota D-21 arriba), y `cosmetica` no es fusionable (regla nueva, en el CHECK de 066).
5. Extension de subtipos = **DROP + ADD del CHECK en una sola sentencia** dentro de un bloque `DO` (precedente literal: `065:115-127`). Anadir un subtipo nunca requiere columna nueva.
6. `capa` **no se persiste.** Se deriva de `familia` en una sola funcion del render/API.
7. **Vinculo carta <-> SKU por convencion ya existente:** `stats_json.sku` (precedente literal en `065:78-90`). Es la unica llave carta->SKU; no se crea columna `sku` (segunda autoridad). 066 lo valida como **CHECK en `producto`** (las 4 cartas actuales ya lo cumplen, 4/4) y como **verificacion** en `consumible`, donde **no** se puede poner CHECK sin inventar datos: las 3 `ce_evento_*` son legacy y **ninguna tiene `sku`** (baseline declarado, 8 V19). Las cartas `consumible` nuevas quedan obligadas por contrato de handler (fase 2) + verificacion.

### 2.2. Mapeo de las 31 cartas al nacimiento del diseno (HISTORICO; hoy el catalogo es de 45, ver 11.7)

| Grupo | Cartas | n | familia / subtipo destino |
|---|---|---|---|
| Set mundana | `ct_mundana_01..03` | 3 | `lugar` / `territorio` |
| Set explorador | `ct_explorador_01..04` | 4 | `lugar` / `territorio` |
| Set cronista | `ct_cronista_01..05` | 5 | `lugar` / `territorio` |
| Set leyenda | `ct_leyenda_01..06` | 6 | `lugar` / `territorio` |
| Set comun (sistema fusionable) | `ct_comun_01..06` | 6 | `lugar` / `territorio` |
| Cartas de evento | `ce_evento_01..03` | 3 | `consumible` / `entrada_evento` |
| Set Ancestral | `cta_ancestral_01..04` | 4 | `producto` / `fisico` |
| **Total** | | **31** | 24 lugar + 3 consumible + 4 producto |

Notas de mapeo:

- **Los 6 `ct_comun_*` se clasifican `territorio` y no `natural`** aunque 4 de los 6 sean parques: clasificar por naturaleza exige curaduria manual y una segunda fuente de verdad. `territorio` es el subtipo neutro; si el operador quiere `natural`, es un `UPDATE` de datos, no de esquema (fuera de 066).
- **`marca` no aparece en el mapeo** porque las unicas cartas de marca actuales (`cta_ancestral_01..04`) son productos fisicos: su valor es el SKU, y meterlas en `marca` habilitaria fusion y poder de juego sobre una botella. Se clasifican `producto`.
- **Las 4 `cta_ancestral_*` ya llevan `stats_json.sku`** (`065:78-90`): el CHECK de `producto` de 066 nace en verde (4/4). Las 3 `ce_evento_*` **no** llevan sku y no se les inventa uno.
- **`personaje`, `artista` y `cosmetica` nacen con 0 cartas**: su primer consumidor es la UGC (seccion 6) y la tirada. Esto es deuda declarada, no un olvido (seccion 9).

---

## 3. Vector de stats

### 3.1. Los 4 ejes jugables + 1 eje de estatus

| Eje | Que mide | Como lo gana el jugador (acciones reales) | Consumidor exacto (nadie mas) | Cap por usuario |
|---|---|---|---|---|
| `alcance` | Difusion: cuanta gente ve lo que haces | Guardados, resenas publicadas, votos recibidos, media publicada | (a) umbral de expediciones de `expedicion_rama='difusion'`; (b) desbloqueo de la vitrina publica del museo (orden y destacados) | 40 |
| `oficio` | Calidad tecnica | Resenas con `xp_ganado>=25`, `n_resenas_largas`, media propia aprobada | (a) umbral de `expedicion_rama='obra'` (**DIFERIDA: 0 cartas hoy, fase 4**); (b) gate de refuerzo UGC en fase 4 (6.3). **En v1 el eje existe pero no se puede subir** - declarado, no oculto. | 40 |
| `fortuna` | Suerte de exploracion | Drops de gate cobrados, hallazgos, expediciones completadas | (a) **peso de tirada** con techo +20% (4.3); (b) umbral de `expedicion_rama='hallazgo'` | 40 |
| `rendimiento` | Rendimiento economico | Misiones y expediciones cobradas, ventas en mercado, canjes atendidos | (a) umbral de `expedicion_rama='economia'` (**DIFERIDA: 0 cartas hoy, fase 4**); (b) **sin consumidor en v1** (declarado). **No** sustituye ni deroga el bono global 24 h de ADR-120 (4.7), y el cap de 5/24 h es una constante, no un derivado de este eje. | 40 |
| `presencia` | Estatus puro | Cosmetics equipadas | (a) orden del museo; (b) insignia en la ficha de carta. **Cero efecto economico: no entra en `poder`, no toca tirada, no toca XP.** | 40 (display) |

**Disponibilidad por ejes (hecho medido al disenar, correccion 10; HOY SUPERADO por 11.7: tras la 071 hay 8 `personaje` y 6 `marca`, luego `oficio` y `rendimiento` ya tienen cartas):** las 31 cartas de entonces eran **24 `lugar` + 3 `consumible` + 4 `producto`**. Por familia (3.2) eso significaba que **solo `alcance` y `fortuna` tenian cartas que los aportaran**; `oficio` y `rendimiento` valian **0** y no se podian subir con nada. Por eso **v1 expone unicamente las `expedicion_rama` de `alcance` y `fortuna`**; `obra` y `economia` se habilitan **despues del seed de `personaje`/`marca`/`artista` (fase 4)**. Un eje a 0 con una rama publicada seria una mision imposible, no una stat muerta: la distincion importa.

**Ningun eje multiplica el XP global** (decision cerrada 3). Los cuatro ejes jugables actuan por **umbral** (habilitan o no) y por **caps** (limitan cuanto).

### 3.2. Puntos por rareza y reparto primario/secundario

Presupuesto total por carta, aprobado: **comun 4 / raro 8 / epico 14 / dorado 24**. Reparto entero exacto (primario recibe el resto):

| rareza | total | primario | secundario | shiny (+primario) | poder base |
|---|---|---|---|---|---|
| `comun` | 4 | 3 | 1 | +1 | 4 |
| `raro` | 8 | 5 | 3 | +2 | 8 |
| `epico` | 14 | 9 | 5 | +3 | 14 |
| `dorado` | 24 | 14 | 10 | +6 | 24 |

- **Shiny:** `floor(total * 0.25)` con minimo 1, sumado **solo al primario**. No cambia el secundario ni la rareza (la variante no es una quinta rareza, `060:170-172`).
- **Reparto real:** el primario queda entre el 58% y el 75% del presupuesto. Se cierra con el nivel (3.4), que empuja el primario. Cero decimales, cero redondeos ocultos.

**Eje primario y secundario por familia (regla unica, sin excepciones por subtipo):**

| Familia | Primario | Secundario |
|---|---|---|
| `lugar` | `alcance` | `fortuna` |
| `personaje` | `oficio` | `rendimiento` |
| `artista` | `oficio` | `alcance` |
| `marca` | `rendimiento` | `alcance` |
| `cosmetica` | `presencia` | (ninguno: 100% a presencia) |
| `producto` | (ninguno) | (ninguno) |
| `consumible` | (ninguno) | (ninguno) |

Cobertura verificable: `alcance` es primario en `lugar` y secundario en `artista`/`marca`; `oficio` primario en `personaje`/`artista`; `fortuna` secundario en las 24 cartas de `lugar` (el eje especializado se construye con lugares); `rendimiento` primario en `marca` y secundario en `personaje`. **Ningun eje queda sin familia que lo alimente y ningun eje queda sin consumidor.**

### 3.3. Vector de la carta

`cartas_catalogo.stats_json` **ya existe** (`060:254-255`): se **reutiliza**, no se crea columna nueva. Claves del vector (todas opcionales; solo se escriben las que aplican):

```json
{"primario":"alcance","alcance":14,"oficio":0,"fortuna":10,"rendimiento":0,"presencia":0}
```

- `primario` es la unica clave **autoral**; los numeros se derivan de `rareza` + `familia` y los escribe el seed/backfill, para que el render no haga un `CASE` sobre rareza.
- **Cero Borrado Logico en JSONB (ADR-003):** todo backfill de `stats_json` es **MERGE**, nunca reemplazo:

```sql
UPDATE cartas_catalogo
   SET stats_json = COALESCE(stats_json, '{}'::jsonb) || $1::jsonb
 WHERE id = $2;
```

  Esto es obligatorio porque las 4 cartas Ancestrales ya llevan `sku`, `volumen_ml`, `set_slug` y `premio_set` en `stats_json` (`065:78-90`) y un reemplazo los borraria. **Prohibido** `stats_json = EXCLUDED.stats_json` en 066.

### 3.4. Nivel de carta por usuario (sumidero de XP, ADR-018)

El nivel pertenece al **par (usuario, carta)**, no a la variante: dos variantes de la misma carta no pueden tener dos niveles. Se guarda en **tabla nueva** `usuarios_cartas_nivel` porque `usuarios_cartas` tiene PK `(usuario_id, carta_id, variante)` y **reabrir esa PK esta prohibido** (seccion 7.1, `061:29-51`).

| Paso | Coste XP (sumidero) | Efecto | Acumulado por carta |
|---|---|---|---|
| 1 -> 2 | 150 | +1 al eje primario de la carta | 150 |
| 2 -> 3 | 400 | +1 al eje primario | 550 |
| 3 -> 4 | 900 | +1 al eje primario | 1.450 |
| 4 -> 5 | 1.800 | +1 al eje primario | 3.250 |

- **Techo del nivel: 5.** Bonus maximo por carta: +4 al primario.
- **Techo de carta:** `poder_carta <= total + shiny + 4` (comun 6 ... dorado 34). Es un invariante derivado, **no** una columna.
- **Los costes son parametros, no esquema:** viven en `lib/cartas-config.js` (junto a `CARTA_FUSION_XP`, `lib/cartas-config.js:28`) como `CARTA_NIVEL_XP = [150,400,900,1800]` y `CARTA_NIVEL_TOPE = 5`. Calibrar el sumidero **no** requiere migracion.

**Doble guard para no bajar de nivel (ADR-018 + `046:40-44`)** - la operacion de subir nivel debe ejecutarse en **una sola sentencia** con dos guardas y **sin restar de `xp_total`**:

```sql
UPDATE usuarios
   SET xp_gastado_sinks = COALESCE(xp_gastado_sinks,0) + $2::numeric
 WHERE id = $1::uuid
   AND xp_total >= $2::numeric
   AND GREATEST(xp_total - COALESCE(xp_gastado_sinks,0), 0) >= $2::numeric
RETURNING xp_total, xp_gastado_sinks;
```

- Guarda 1 (`xp_total >= coste`): el XP ganado nunca se toca.
- Guarda 2 (disponible acotado a 0): el saldo real alcanza.
- `calcularNivel(xp_total)` (`api/usuarios.js:364`) es monotono porque `xp_total` no cambia: **el nivel del usuario no puede bajar.** Cero filas devueltas = `XP_INSUFICIENTE`.
- El asiento del `xp_ledger` (`accion='carta_nivel'`) va **en el mismo CTE** que el UPDATE (no repetir el hueco de D-9, `NEXT.md:65` (e)), y `carta_nivel` debe anadirse a `BONO_EXCLUIDAS` (`api/interacciones.js:5097-5108`) para que nunca reciba bono.

### 3.5. Vector del usuario y poder derivado

```
vector_usuario[eje] = LEAST(40, SUM sobre cartas DISTINTAS poseidas de puntos_carta[eje])
poder               = alcance + oficio + fortuna + rendimiento      (presencia EXCLUIDA)
```

- **Una carta cuenta UNA vez por usuario**, sin multiplicar por `cantidad` y **sin sumar base + shiny de la misma carta**: se toma el maximo de la variante. Poseer 40 copias de la misma carta no da poder (regla anti-inflacion 1).
- `poder` y `vector_usuario` **no se persisten**: se calculan en la lectura. Un `poder` en columna seria una segunda autoridad que deriva en silencio.
- **Nada de esto modifica `xp_total` ni `interacciones.xp_ganado`.** El vector es un permiso, no un multiplicador.

### 3.6. Reglas anti-inflacion (las cinco, cerradas)

1. **La actividad no acuna puntos.** Los puntos solo vienen de `rareza` (aprobada) + `shiny` + `nivel`. Ninguna accion del usuario anade puntos permanentes a una carta.
2. **Una carta cuenta una vez** por usuario (sin apilar `cantidad` ni variantes).
3. **Caps duros:** 40 por eje, `poder` maximo 160. Se aplican en la lectura (`LEAST`), no en la escritura: cambiar el cap no requiere migracion.
4. **`producto`/`consumible` no dan PODER.** Garantizado por CHECK (vector vacio), no por conducta. **No** garantiza que no se comercien: `carta_publicar` no filtra familia (`api/interacciones.js:16200-16209`) -> **D-15**, contrato de fase 2.
5. **Ningun eje multiplica XP tipo global.** `rendimiento` solo **acota** cuando su rama existe (fase 4), nunca amplifica, y **no deroga** el bono global 24 h de consumibles (ADR-120).

**`energia` queda RESERVADA:** no se crea columna, no se escribe clave en `stats_json`, ningun lector puede inventarla. Si algun dia se implementa, sera **columna con CHECK y consumidor propio**, no una stat del vector. Reservar el nombre (y documentarlo aqui) es lo que evita que una sesion futura la meta como quinta stat sin consumidor.

---

## 4. Valor y tirada

### 4.1. Columnas de valor (contrato, no implementacion)

| Columna | Tipo | NULL/DEFAULT | Semantica |
|---|---|---|---|
| `precio_xp` | **`numeric(12,2)`** (enmendado: nacio `integer` en la 066 aplicada; la 068 lo convierte) | NULL | Precio de **acunacion** resuelto (rareza x multiplicador de familia). **Debe ser NULL en `producto`/`consumible`** (CHECK de 066: se pagan por su SKU; la 070 dejo esas 7 filas en NULL). |
| `edicion` | `varchar(10)` | `NOT NULL DEFAULT 'abierta'` | `abierta` (sin techo) / `limitada` (techo fijo) / `serial` (techo fijo + numeracion, seccion 4.4). |
| `supply_max` | `integer` | NULL | Techo de unidades. NULL solo si `edicion='abierta'`. |
| `emitidas` | `integer` | `NOT NULL DEFAULT 0` | Unidades en **circulacion medidas**: inventario propio + escrow de ofertas abiertas/parciales (4.5). Monotono no decreciente. |

### 4.2. Precio de acunacion: `base_rareza x mult_familia`

Base aprobada por rareza: **150 / 400 / 1000 / 2500**. Multiplicadores aprobados: cosmetica **0,5**; lugar **1,0**; personaje **1,2**; artista **1,2**; marca **1,5**.

| Familia (mult.) | comun | raro | epico | dorado |
|---|---|---|---|---|
| `cosmetica` (0,5) | 75 | 200 | 500 | 1.250 |
| `lugar` (1,0) | 150 | 400 | 1.000 | 2.500 |
| `personaje` (1,2) | 180 | 480 | 1.200 | 3.000 |
| `artista` (1,2) | 180 | 480 | 1.200 | 3.000 |
| `marca` (1,5) | 225 | 600 | 1.500 | 3.750 |
| `producto` | - | - | - | - (SKU) |
| `consumible` | - | - | - | - (SKU) |

- **`precio_xp` se RESUELVE al acunar y se guarda.** No se recalcula en la lectura: si manana cambia la tabla de multiplicadores, las cartas ya acunadas conservan su precio historico (y el mercado no se reprecifica solo).
- Los factores viven en `lib/cartas-config.js` (`CARTA_PRECIO_BASE_XP`, `CARTA_MULT_FAMILIA`), **una sola fuente, dos lectores** (patron `lib/cartas-config.js:10-14`).
- **Cero inflacion de precio por demanda.** El precio de acunacion es fijo por (rareza, familia). La escasez la expresa `supply_max`, no el precio.
- **`precio_xp` es `numeric(12,2)`, no `integer`** (enmienda MEDIO-2, auditoria `@sql-security` 2026-11-11). Dos razones: (1) **ADR-035** fija `numeric(12,2)` como el tipo del XP con decimales en todo el producto (`xp_ledger.xp_final`, `canjes_tienda.precio_xp_unitario`, `cartas_ofertas.precio_xp numeric(12,2)` en `041:118`); un `integer` rompe esa convencion y obliga a castear en cada lectura. (2) Los multiplicadores aprobados **no son enteros** (0,5 / 1,2 / 1,5): `2500 x 1,2 = 3000` cierra, pero `150 x 1,5 = 225` y `75 x 1,2 = 90` obligan a decidir redondeo en el handler para cualquier base futura (p. ej. una base de 350 x 1,5 = 525, o 375 x 1,2 = 450), y un redondeo dentro del handler es una **segunda autoridad** del precio. Con `numeric(12,2)` el precio se calcula una vez, se guarda exacto y el handler solo lee.
- **La 066 ya esta aplicada con `integer` y NO se edita** (deriva de checksum). El cambio de tipo va en una **migracion nueva 068** (contrato en 11.5). Mientras la 068 no corra, el tipo real es `integer` y asi se declara: no se afirma lo que la base no tiene.

### 4.3. Tirada (pesos, no porcentajes)

Pesos aprobados: **comun 5000 / raro 1000 / epico 250 / dorado 50** (denominador base 6300).

| rareza | peso | probabilidad base |
|---|---|---|
| comun | 5.000 | 79,3651% |
| raro | 1.000 | 15,8730% |
| epico | 250 | 3,9683% |
| dorado | 50 | 0,7937% |

Reglas de tirada:

1. **Denominador = suma de pesos ELEGIBLES.** Una rareza sin cartas disponibles (`activo=true`, `familia` jugable, supply agotado) sale del denominador y las demas se renormalizan solas. Cero tabla de probabilidades que mantener.
2. **`fortuna` modifica pesos, nunca XP:** los pesos de `raro`/`epico`/`dorado` se multiplican por `(1 + min(fortuna,20)/100)`. Techo **+20%** (fortuna 20). Efecto medido con fortuna 20: 5.000 / 1.200 / 300 / 60 -> 76,22% / 18,29% / 4,57% / 0,91%. Monotono, acotado y auditable.
3. **La tirada es sin estado:** no hay pity counter ni contador por jugador (eso exigiria tabla por copia, seccion 4.4). Si el operador quiere pity, es una columna nueva con consumidor propio.
4. **Agotado = 0 filas del UPDATE de emision** (4.5), no un `SELECT` previo.

### 4.4. Seriales: decision y justificacion (opcion mas adaptable)

**Decision: en v1 no hay tabla de copias por serial.** El serial se representa con `edicion='serial'` + `supply_max` + el contador `emitidas` en el catalogo. El numero de serial **no se emite ni se muestra** en v1.

Justificacion (cuatro razones medidas):

1. **La PK de `usuarios_cartas` no tiene sitio para una copia.** Es `(usuario_id, carta_id, variante)` (`061:29-51`) y reabrirla esta prohibido en esta tanda. Un serial por copia exige `(usuario_id, carta_id, variante, serial)` o una tabla aparte.
2. **`cantidad` es un AGREGADO y ya tiene 8 consumidores.** Los 5 upserts usan `ON CONFLICT (usuario_id, carta_id, variante)` y los 3 decrementos limpian museo (`061:21-27`, `NEXT.md:62`). Convertir agregados en copias obliga a reescribir esos 8 puntos y a migrar filas sin ganancia de producto.
3. **Lo unico que v1 necesita saber es "cuantas existen".** Eso se responde con `emitidas` de forma atomica (`UPDATE ... WHERE emitidas < supply_max`, 4.5), sin tabla nueva y sin condicion de carrera.
4. **El serial no tiene hoy ningun consumidor de UI.** Ninguna pantalla muestra "carta 7 de 50"; `cartas-ui.js` pinta la ficha por `(carta_id, variante)`.

**Punto de extension documentado (coste real cuando se decida):**

```sql
-- NO se ejecuta en 066/067. Contrato futuro.
CREATE TABLE cartas_serie (
  carta_id text    NOT NULL REFERENCES cartas_catalogo(id) ON DELETE RESTRICT,
  serial   integer NOT NULL,
  usuario_id uuid  NOT NULL REFERENCES usuarios(id),
  emitido_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (carta_id, serial),
  UNIQUE (carta_id, serial, usuario_id)
);
```

Backfill futuro: generar `serial = 1..N` por `carta_id` en orden de `usuarios_cartas.obtenida_en` y dejar `usuarios_cartas` como agregado (la tabla nueva seria la autoridad de "quien tiene cual", no cambia la PK existente).

### 4.5. Emision atomica y semantica honesta de `emitidas`

Forma obligatoria del acunado (una sola sentencia, sin leer-y-luego-escribir):

```sql
UPDATE cartas_catalogo
   SET emitidas = emitidas + 1
 WHERE id = $1
   AND activo = true
   AND (supply_max IS NULL OR emitidas < supply_max)
RETURNING emitidas;
```

- `0 filas` = **AGOTADA** (codigo de aplicacion, no excepcion SQL). `1 fila` = acunada.
- **`emitidas` es un CONTADOR DE CIRCULACION MEDIDA, no un total historico de acunaciones:** cuenta lo que existe hoy (propio + escrow) y crece con cada acunacion; un consumo (`activo=false`) **no decrementa** porque esa unidad ya consumio supply.
- **El inventario NO esta todo en `usuarios_cartas`:** `carta_publicar` descuenta `cantidad` de la carta y la mueve a `cartas_ofertas.cantidad_restante` con `estado` `abierta`/`parcial` (`api/interacciones.js:16206-16209`, `:16328-16332`; columnas en `041:109-130`). Por eso la circulacion se mide asi:

```sql
SELECT c.id,
       COALESCE((SELECT SUM(u.cantidad) FROM usuarios_cartas u
                  WHERE u.carta_id = c.id AND u.activo = true), 0)
     + COALESCE((SELECT SUM(o.cantidad_restante) FROM cartas_ofertas o
                  WHERE o.carta_id = c.id AND o.activo = true
                    AND o.estado IN ('abierta','parcial')), 0) AS circulacion
  FROM cartas_catalogo c;
```

- **`emitidas` nunca se rebaja**, y en el backfill se toma **`GREATEST(emitidas_actual, circulacion)`** para no perder un valor previo si la migracion se re-ejecuta tras acunaciones. Consecuencia declarada: tras consumos, `emitidas >= circulacion`; el CHECK `emitidas <= supply_max` sigue siendo el techo correcto.
- **No existe ledger de acunacion** (no hay tabla de mints): el numero se audita contra la consulta de arriba como **cota inferior** (8 V9). Deuda **D-13**.

### 4.6. Que se paga con XP y que con SKU/COP

| Familia | Precio de la carta | Efecto del SKU | Moneda |
|---|---|---|---|
| `lugar`, `personaje`, `artista` | `precio_xp` (4.2) | - | **XP** |
| `marca` | `precio_xp` (4.2) | `es_canjeable_qr=true` puede entregarla via `canjes_tienda` | **XP o SKU** |
| `cosmetica` | `precio_xp` (4.2) | - | **XP** |
| `producto` | **sin `precio_xp`** | `stats_json.sku` + `premio_set` (`065:78-90`) | **SKU / COP** |
| `consumible` | **sin `precio_xp`** | `consumibles.clave` + `consumibles.precio_xp` (`010:16-24`) | **XP del consumible** |

La regla es una: **la carta de economia no tiene precio propio; su precio es el de su SKU.** Si tuviera `precio_xp` habria dos precios para el mismo bien y una de las dos rutas quedaria sin conciliar.

### 4.7. Cierre explicito de la deuda D-5

- **`stats_json.bonus_xp_pct` se RETIRA DEL CONTRATO.** No se lee en ningun calculo (medido: solo `api/admin.js:593,594,1418,1537` para alta/edicion y `cartas-ui.js:100,117,310` para display).
- **Su funcion la asume `stats.rendimiento`, como bono NUEVO y acotado:** solo sobre **recompensa de expedicion**, con techo por evento (<= 40 XP) y **tope 24 h** (5 cobros, 200 XP/dia) medido en `xp_ledger` (5.2). **No deroga ni sustituye el bono global 24 h de consumibles de ADR-120**, que sigue vivo con su propio mapa por clave y su propia ventana: son dos mecanismos distintos, con acciones distintas (`bono_consumible_24h` vs `carta_expedicion`), y ninguno convive dentro del otro.
- **Sin borrar datos (ADR-003):** la clave puede seguir almacenada en las filas que ya la tienen. 066 **no** la elimina, **no** la reescribe y **no** anade un CHECK que la prohiba (eso obligaria a un backfill destructivo). Simplemente no tiene lector nuevo. El texto de la deuda en `NEXT.md:65` (d) se cierra en el pase documental (`@docs-keeper`, R2).
- **Guarda documental:** el ADR-121 declara la clave `deprecada e inerte`, y 066 deja el comentario en el `.sql` para que una sesion futura no la "active" sin ADR (era el riesgo literal de `NEXT.md:67` (b)).

### 4.8. Sumidero de acunacion (CONTRATO DE FASE 2, no implementado aqui)

Duenno: `@backend-dev`. Gate: **SI**. No se toca `api/interacciones.js` en esta tanda; el contrato queda escrito para que la fase 2 no lo invente.

- **Cargo real y permanente:** la acunacion cobra `precio_xp`. El cargo sube **`usuarios.xp_gastado_sinks`** y **nunca** resta de `xp_total`, que es el patron normativo de `046:40-44` (`xp_total` es el XP de nivel; `XP_DISPONIBLE = xp_total - xp_gastado_sinks`). Restar de `xp_total` haria bajar `calcularNivel(xp_total)` (`api/usuarios.js:364-371`) y violaria ADR-018.
- **Excepcion medida y NO copiada:** la fusion vigente si resta de `xp_total` (`api/interacciones.js:16657-16661`). **No es el patron a copiar** para la acunacion; se registra como deuda **D-16** sin arreglarla en esta tanda.
- **Una sola sentencia (CTE unico = atomico)**, con este contrato exacto:

```sql
WITH ok_carta AS (
  SELECT c.id, c.precio_xp FROM cartas_catalogo c
   WHERE c.id=$2 AND c.activo=true
     AND c.familia NOT IN ('producto','consumible')
     AND c.precio_xp IS NOT NULL
     AND (c.supply_max IS NULL OR c.emitidas < c.supply_max)
), ok_saldo AS (
  SELECT u.id FROM usuarios u, ok_carta k
   WHERE u.id=$1::uuid
     AND u.xp_total >= k.precio_xp
     AND GREATEST(u.xp_total - COALESCE(u.xp_gastado_sinks,0),0) >= k.precio_xp
), deb AS (
  UPDATE usuarios u SET xp_gastado_sinks = COALESCE(u.xp_gastado_sinks,0)
                        + (SELECT precio_xp FROM ok_carta)
   WHERE u.id=$1::uuid AND EXISTS (SELECT 1 FROM ok_saldo)
  RETURNING u.xp_total, u.xp_gastado_sinks
), emit AS (
  UPDATE cartas_catalogo c SET emitidas = c.emitidas + 1
   WHERE c.id=$2 AND EXISTS (SELECT 1 FROM deb)
     AND (c.supply_max IS NULL OR c.emitidas < c.supply_max)
  RETURNING c.emitidas
), inv AS (
  INSERT INTO usuarios_cartas (usuario_id, carta_id, variante, cantidad, activo, obtenida_en)
  SELECT $1::uuid, $2, $3, 1, true, now() WHERE EXISTS (SELECT 1 FROM emit)
  ON CONFLICT (usuario_id, carta_id, variante)
  DO UPDATE SET cantidad = usuarios_cartas.cantidad + 1, activo = true
  RETURNING cantidad
), led AS (
  INSERT INTO xp_ledger (usuario_id, accion, xp_base, xp_final, es_exento, contexto)
  SELECT $1::uuid, 'carta_acunar', (SELECT precio_xp FROM ok_carta), 0, true,
         jsonb_build_object('carta_id',$2,'variante',$3,'emitidas',(SELECT emitidas FROM emit))
   WHERE EXISTS (SELECT 1 FROM inv)
)
SELECT (SELECT emitidas FROM emit) AS emitidas, (SELECT cantidad FROM inv) AS cantidad;
```

- **Fail-closed:** `0 filas` = no se cobro, no se emitio y no se entrego. El codigo de aplicacion distingue por subconsulta: `CARTA_NO_ACUNABLE` (no esta en `ok_carta`), `CARTA_AGOTADA` (`supply_max` alcanzado), `XP_INSUFICIENTE` (falla `ok_saldo`).
- **`carta_acunar` va a `BONO_EXCLUIDAS`** (`api/interacciones.js:5097-5108`) con `es_exento=true`: un cobro nunca recibe bono.
- **La emision, el debito, el inventario y el asiento van en el MISMO statement** (no se repite el hueco de D-9). Si el proceso muere, no hay cobro sin carta ni carta sin asiento.

### 4.9. Subida de nivel atomica (CONTRATO DE FASE 2, no implementado aqui)

Duenno: `@backend-dev`. Gate: **SI**.

- **Cargo + incremento de nivel en la MISMA sentencia**, condicionado a `nivel < 5`, con doble guard de ADR-018:

```sql
WITH posee AS (
  SELECT 1 FROM usuarios_cartas uc
   WHERE uc.usuario_id=$1::uuid AND uc.carta_id=$2 AND uc.variante=$4
     AND uc.activo=true AND uc.cantidad >= 1
), actual AS (
  SELECT n.nivel FROM usuarios_cartas_nivel n
   WHERE n.usuario_id=$1::uuid AND n.carta_id=$2 AND n.nivel=$3::smallint AND n.nivel < 5
), cargos AS (SELECT (ARRAY[0,150,400,900,1800])[a.nivel + 1] AS coste FROM actual a),
ok_saldo AS (
  SELECT u.id FROM usuarios u, cargos c
   WHERE u.id=$1::uuid AND u.xp_total >= c.coste
     AND GREATEST(u.xp_total - COALESCE(u.xp_gastado_sinks,0),0) >= c.coste
), deb AS (
  UPDATE usuarios u SET xp_gastado_sinks = COALESCE(u.xp_gastado_sinks,0)
                        + (SELECT coste FROM cargos)
   WHERE u.id=$1::uuid AND EXISTS (SELECT 1 FROM ok_saldo) AND EXISTS (SELECT 1 FROM posee)
  RETURNING u.xp_total
), up AS (
  UPDATE usuarios_cartas_nivel n
     SET nivel = n.nivel + 1,
         xp_invertido = n.xp_invertido + (SELECT coste FROM cargos),
         actualizado_en = now()
   WHERE n.usuario_id=$1::uuid AND n.carta_id=$2 AND n.nivel=$3::smallint
     AND EXISTS (SELECT 1 FROM deb)
  RETURNING n.nivel
), led AS (
  INSERT INTO xp_ledger (usuario_id, accion, xp_base, xp_final, es_exento, contexto)
  SELECT $1::uuid, 'carta_nivel', (SELECT coste FROM cargos), 0, true,
         jsonb_build_object('carta_id',$2,'variante',$4,'nivel_nuevo',(SELECT nivel FROM up))
   WHERE EXISTS (SELECT 1 FROM up)
)
SELECT (SELECT nivel FROM up) AS nivel, (SELECT xp_total FROM deb) AS xp_total;
```

- **Idempotencia por `(usuario, carta, variante, nivel_esperado)`:** el body trae `nivel_esperado` (= `$3`) y `variante` (= `$4`); la guarda `n.nivel = $3` hace que un **doble clic** (segundo request con el nivel ya viejo) devuelva **0 filas sin cobrar**. No hay `nivel_esperado` -> `400`, nunca se asume.
- **La `variante` NO entra en la PK de `usuarios_cartas_nivel`** (`(usuario_id, carta_id)`, 7.1): incluida en la clave, la misma carta podria tener dos niveles (uno por variante) y la fusion `base -> shiny` "perderia" el nivel. Se usa como **guarda de posesion y token de idempotencia**, no como dimension de almacenamiento.
- `0 filas` = `NIVEL_DESACTUALIZADO` / `NIVEL_TOPE` / `XP_INSUFICIENTE`, segun que subconsulta fallo. `carta_nivel` va a `BONO_EXCLUIDAS`.

---

## 5. Modos

### 5.1. Coleccion (pasivo - sin umbrales)

- Fuente de cartas: drop por gate (`cartas_gates`, `040:168-176`), tirada, acunacion XP, canje de SKU.
- Recompensa: XP de primera adquisicion (por la rama existente, `accion='carta_*'`, ya exenta de bonos en `api/interacciones.js:5102`) + progreso de set (`set_coleccion`, `065:56-57`) + poder derivado.
- **No hay energia, no hay claim, no hay temporizador.** Coleccionar es pasivo por definicion.

### 5.2. Expedicion (activo - acciones reales, DAG extendido)

Todo lo de esta seccion es **CONTRATO DE FASE 2** (duenno `@backend-dev`, gate **SI**): esta tanda no toca `api/interacciones.js`.

- Se implementa **extendiendo `MISIONES`** (`api/interacciones.js:3995`), no con catalogo paralelo: dos campos nuevos por mision, `requiere_stats: {alcance: 12, fortuna: 6}` y **`expedicion_rama`**.
- **La clave se llama `expedicion_rama`, NO `rama`:** `rama` ya existe en `MISIONES` con otro dominio (`exp_*`, `cur_*`, `art_*`, ver `api/interacciones.js:4000`, `:2450-2453`). Reusar el nombre pisaria el arbol de progreso.
- **v1 solo publica `expedicion_rama` de `alcance` y `fortuna`** (`difusion` y `hallazgo`): son los unicos ejes con cartas que los aporten hoy (ver la nota de disponibilidad en 3.1). `obra` (`oficio`) y `economia` (`rendimiento`) quedan **declaradas y deshabilitadas** hasta el seed de `personaje`/`marca`/`artista` (**fase 4**). Publicarlas antes seria una mision imposible.
- **Las misiones son REPETIBLES** (decision cerrada): el mismo `id` se puede cobrar mas de una vez. El faucet no es infinito porque **el cap es diario**, no porque la mision sea unica.
- **El check sigue siendo server-side sobre acciones reales** (patron `api/interacciones.js:4008-4011`: `SELECT ... FROM interacciones WHERE usuario_id=$1 AND tipo='resena' AND xp_ganado>=25`). Nada de "reclamar" un boton: si la accion no ocurrio, la mision no esta cumplida.
- **Requisito de vector:** la mision solo se ofrece si `vector_usuario` alcanza `requiere_stats` (calculado como en 3.5). El vector habilita, **no multiplica**.
- **Recompensa capada:**
  - `xp` de la mision <= **40 XP** por cobro.
  - Maximo **5 cobros por ventana de 24 h** por usuario -> **tope duro 200 XP/dia**. Se mide con el indice existente sobre `xp_ledger (usuario_id, accion, creado_en)`, sin tabla nueva y sin estado por mision.
  - Asiento `accion='carta_expedicion'`, **anadida a `BONO_EXCLUIDAS`** (`api/interacciones.js:5097-5108`): ninguna expedicion recibe bono, jamas.
  - Patron de ventana ya vigente en el repo: "1 activacion por ventana de 24 h" (`api/interacciones.js:5053`).
- Sin estado persistido de mision (coherente con 0.2: no hay tabla de misiones completadas); el cap vive en el ledger, que **si** es append-only y auditable.

### 5.3. Temporada (diferida, con punto de extension barato)

- **No se implementa en 066.** No se anade columna `temporada`: una columna sin lector es deuda, no diseno.
- El punto de extension es **`set_slug`** (`040:100`, indexado en `040:111-112`): una temporada es un prefijo de set (`ct_t1_*`). Cuando el operador la quiera, el contrato es `ALTER TABLE cartas_catalogo ADD COLUMN temporada text` (nullable, sin backfill) + indice parcial. Coste: una migracion aditiva de 6 lineas.

---

## 6. UGC: obra -> ediciones

### 6.1. Modelo

- **`obra` = fila de `cartas_media`** (la pieza: musica, foto, video o poema). Una obra tiene UN autor, UN tipo y UN estado de moderacion.
- **`edicion` = fila de `cartas_catalogo`** con `media_id` apuntando a la obra. Varias ediciones (rareza, variante, supply) pueden compartir la misma obra.
- **Relacion 1 obra -> N ediciones:** `cartas_catalogo.media_id` **no es UNIQUE**. Se materializa "la misma cancion en comun y en dorada", "el mismo poema en dos tiradas".
- La carta sigue siendo la unidad de inventario (`usuarios_cartas`, PK intacta). Esto respeta el aislamiento con `cromos_catalogo`: **no se unifican sistemas** (seccion 9).

### 6.2. Moderacion previa obligatoria

- `cartas_media.estado_moderacion` con dominio `pendiente | aprobada | rechazada | retirada`; **default `pendiente`**.
- **Regla dura: una carta con `media_id` solo puede acunarse o entregarse si `estado_moderacion='aprobada'`.** Es regla de handler (no se puede expresar con un CHECK entre tablas); 066/067 no la fingen en el esquema y la declaran como contrato de aplicacion.
- Un `rechazada` **exige motivo** (`motivo` no vacio) por CHECK: el autor tiene que saber que corregir.
- `pendiente` **no admite** `moderado_por`/`moderado_en` (CHECK): el estado no puede mentir.
- **Derechos del autor (enmienda MEDIO-4, auditoria `@sql-security` 2026-11-11):** `cartas_media` gana `licencia text` y `licencia_aceptada_en timestamptz`, con **CHECK fail-closed**: una obra **no** puede estar `estado_moderacion='aprobada'` sin `licencia` no nula. Se elige `'aprobada'` (feminino) porque es el valor **real** del CHECK aplicado en 067:128, no el generico "aprobado". Una obra sin licencia se puede **recibir** (`pendiente`) pero **no aprobar**: el gate de derechos es previo a la moderacion, no posterior.
- **La 067 ya esta aplicada** (`db/migrations/067_cartas_media.sql:26-28` declara expresamente que **no** crea `licencia`) y **no se edita**: columnas + CHECK van en la **068 aditiva** (11.5). Deuda **D-18** hasta que la 068 corra.
- La cola de moderacion se lee por `idx_cartas_media_cola (estado_moderacion, creado_en)` dentro del panel admin existente (`api/admin.js`, rama `?recurso=`), **sin endpoint nuevo**. Es **contrato de fase 2** (duenno `@admin-dev`, gate **SI**): en esta tanda **no** se toca `admin.html` ni `api/admin.js`, asi que la tabla nace **vacia y sin escritor** - se crea con su consumidor ya especificado, no "por si acaso".

### 6.3. Limites por autor y gate de oficio

- **Publicar exige ACCIONES REALES, no un eje vacio:** `n_resenas_largas >= 3` **o** `media propia aprobada >= 1`. **No** se usa `oficio >= 8` en v1: `oficio` valia 0 al disenar porque ninguna de las 31 cartas de entonces lo aportaba (3.1) y el gate habria bloqueado toda la UGC hasta la fase 4 (**hoy ya hay 8 `personaje` y 6 `marca` que aportan `oficio`/`rendimiento`, ver 11.7**). Cuando existan cartas de `personaje`/`artista`, el gate puede endurecerse a `oficio >= 8` **como condicion adicional** (fase 4), nunca como sustituto.
- Maximo **3 obras `pendiente`** simultaneas por autor (COUNT sobre `cartas_media`; sin tabla de cuotas).
- Maximo **10 obras `aprobada` por ventana de 30 dias** por autor (COUNT con `creado_en`).
- Superar el limite -> error de aplicacion, nunca un bloqueo silencioso.

### 6.4. Royalty del artista y detraccion en la venta P2P (CONTRATO DE FASE 2)

- **Hecho medido: la venta P2P de cartas NO cobra tithe.** El `cred` de la venta acredita el **bruto** al vendedor (`api/interacciones.js:16334-16337`), y el unico punto de tithe del producto es `aplicarTitheParche` (`api/interacciones.js:5430-5437`), que grava la **fama de pandilla**, no el mercado. Esta spec **no** afirma que el tithe ya exista: lo declara **inexistente en cartas** y lo contrata.
- **Contrato de fase 2** (duenno `@backend-dev`, gate **SI**): el reparto vive **dentro del CTE de la venta** (`api/interacciones.js:16328-16346`), no en un post-proceso: entre `dec` (escrow) y `cred` (vendedor) se intercalan `roy` (10% al `emisor_id` si `emisor_tipo='ugc'`) y `tax` (tithe), ambos condicionados a `EXISTS (SELECT 1 FROM debit)` para que el reparto sea atomico con el cobro.
- **Orden de calculo y tope:** `bruto = precio_unitario x cantidad` -> `royalty = floor(bruto x 0,10)` -> `tithe = floor(bruto x t)` con `t <= 0,10` -> `neto = bruto - royalty - tithe`. **Detraccion total <= 20%.**
- **Prueba obligatoria de saldo no negativo:** el smoke debe asertar, para los tramos de tithe 1% / 4% / 7% / 10%, que `royalty + tithe + neto = bruto` y que **`neto >= 0`**; un `neto` negativo es bug de redondeo, no caso de borde.
- Asientos: `carta_royalty` y `carta_tithe`, ambos en **XP** y ambos en `BONO_EXCLUIDAS` (`api/interacciones.js:5097-5108`). El tithe va al mismo destino que `aplicarTitheParche` (fondo de parche).
- **Se paga en XP, nunca en COP ni en CDR** (ADR-061: nada de conversion a dinero real).
- Si el autor desaparecio, el royalty **no se paga a nadie** y no se acumula en escrow: se degrada con `COALESCE` (patron `060:238-242`, `emisor_id` sin FK). El tithe se aplica igual. Cero filas huerfanas.

### 6.5. Reglas de retirada (ADR-003)

- Retirar una obra = `estado_moderacion='retirada'` + `activo=false`. **Nunca `DELETE`.**
- Efectos: no se acuna mas (el handler rechaza), no se oferta en mercado, la carta **sigue existiendo** en el inventario de quien la tiene y conserva su poder (quitar poder retroactivo seria un castigo por un acto de terceros).
- El museo limpia plazas de cartas retiradas sin tocar `cantidad` (patron ya vigente para cartas ocultas, ADR-117 D11).

---

## 7. Contrato de migracion 066 y 067

Reglas comunes a las dos (no negociables):

- **Runner:** `node scripts/apply_sql_file.js <ruta.sql> [--dry-run]`. Divide por `;` y **no abre transaccion envolvente** (`065:44-49`). Por eso: cero `BEGIN`/`COMMIT` escritos, todo `ALTER` que deba ser atomico va **en un solo `DO`** o en una sola sentencia, y el DROP+ADD de un CHECK va junto.
- **Idempotencia (ADR-008):** `ADD COLUMN IF NOT EXISTS`; `CREATE TABLE/INDEX IF NOT EXISTS`; `ADD CONSTRAINT` **no** admite `IF NOT EXISTS` -> todo constraint va en `DO` con guarda en `pg_constraint`; backfill con predicado que en la segunda corrida toca 0 filas.
- **`schema_migrations` no se toca** (lo escribe el runner, contrato de la 045; `061:61-62`).
- **Prohibido:** `DROP COLUMN`, `DROP TABLE`, `DELETE`, `TRUNCATE`, `RENAME`, tocar `usuarios_cartas` (su PK es intocable), tocar `cromos_catalogo`, crear endpoints.
- **ASCII-safe (ADR-002):** cero bytes > 127, cero tildes, cero enes con tilde, cero backticks dentro del `.sql`.

### 7.1. `db/migrations/066_cartas_familias_stats_supply.sql`

**Cabecera obligatoria** (mismo formato que `065:1-53`): proposito, referencias (ADR-121, 108, 120, 002, 003, 006, 008, 018), requiere (040, 046, 060, 061, 065), que NO hace, idempotencia, atomicidad y ASCII.

**Bloque (0) - precondicion que aborta antes de escribir.**

```
DO $m066pre$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='cartas_catalogo'
                    AND column_name='set_coleccion') THEN
    RAISE EXCEPTION 'MIG066: falta 065 (cartas_catalogo.set_coleccion)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='usuarios'
                    AND column_name='xp_gastado_sinks') THEN
    RAISE EXCEPTION 'MIG066: falta 046 (usuarios.xp_gastado_sinks)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname='chk_usuarios_cartas_variante') THEN
    RAISE EXCEPTION 'MIG066: falta 060/061 (variante de usuarios_cartas)';
  END IF;
END $m066pre$;
```

**Bloque (1) - columnas nuevas de `cartas_catalogo` (todas aditivas, ninguna NOT NULL sin backfill previo).**

| Columna | Tipo | Declaracion exacta |
|---|---|---|
| `familia` | `varchar(12)` | `ADD COLUMN IF NOT EXISTS familia varchar(12)` (**nullable en 066; `NOT NULL` diferido al paso 2 de fase 2**) |
| `subtipo` | `text` | `ADD COLUMN IF NOT EXISTS subtipo text` (**idem**) |
| `precio_xp` | **`numeric(12,2)`** | `ADD COLUMN IF NOT EXISTS precio_xp numeric(12,2)` - **la 066 aplicada lo creo `integer`**; la **068** lo altera (no se edita 066) |
| `edicion` | `varchar(10)` | `ADD COLUMN IF NOT EXISTS edicion varchar(10) NOT NULL DEFAULT 'abierta'` |
| `supply_max` | `integer` | `ADD COLUMN IF NOT EXISTS supply_max integer` |
| `emitidas` | `integer` | `ADD COLUMN IF NOT EXISTS emitidas integer NOT NULL DEFAULT 0` |

**Por que `familia`/`subtipo` nacen nullables y se quedan nullables en 066 (expand/contract):**

- Un `DEFAULT 'lugar'` clasificaria en silencio cualquier carta futura como lugar y convertiria una omision en un dato falso. Por eso: `ADD` nullable -> backfill -> verificacion **31/31** -> **y ahi se para**.
- **`NOT NULL` NO se aplica en 066.** `cartas_crear` (`api/admin.js:1438-1446`) inserta una **lista explicita de columnas sin `familia`/`subtipo`**: con `NOT NULL` y sin `DEFAULT`, **todo alta de carta por admin falla con 23502**. Y esta tanda **no** toca `api/admin.js`.
- **Patron expand/contract, en dos pasos declarados:**
  1. **Paso 1 (esta tanda, 066):** columnas nullable + backfill 31/31 + CHECKs de dominio (los CHECK aceptan NULL: un NULL no viola un `CHECK` de igualdad).
  2. **Paso 2 (fase 2, migracion nueva `0NN_cartas_familia_not_null.sql`):** parchear `cartas_crear`/`cartas_editar` para escribir `familia`+`subtipo` (con `DEFAULT` explicito o validacion 400), verificar `0` NULL, y **entonces** `SET NOT NULL`. Duenno `@admin-dev`, gate **SI**.
- El contrato de la fase 2 incluye el criterio de aceptacion: `INSERT` por admin con `familia` ausente -> **400 `PARAMETROS_INVALIDOS`**, nunca 23502.

**Bloque (2) - backfill de `familia`/`subtipo` (orden cta -> ct -> ce).**

```
UPDATE cartas_catalogo SET familia='producto',   subtipo='fisico'
 WHERE familia IS NULL AND left(id, char_length('cta_ancestral_')) = 'cta_ancestral_';
UPDATE cartas_catalogo SET familia='consumible', subtipo='entrada_evento'
 WHERE familia IS NULL AND left(id, char_length('ce_evento_'))     = 'ce_evento_';
UPDATE cartas_catalogo SET familia='lugar',      subtipo='territorio'
 WHERE familia IS NULL AND left(id, char_length('ct_'))            = 'ct_';
```

- **Off-by-one corregido:** `left(id,13)='cta_ancestral_'` **no casa nunca** (`'cta_ancestral_'` mide **14**, no 13) y el backfill dejaria 4 cartas sin familia, abortando el bloque (3). Se usa `char_length(<literal>)` en los **tres** prefijos para que el numero no pueda desincronizarse del literal: `'ct_'`=3, `'ce_evento_'`=10, `'cta_ancestral_'`=14.
- **Conteo esperado (verificacion dentro del bloque 3, no supuesto):**
  `lugar/territorio = 24` (3+4+5+6 de gate y sets + 6 `ct_comun`), `consumible/entrada_evento = 3`, `producto/fisico = 4`, total **31**. Cualquier desvio aborta.
- **Trampa documentada:** `id LIKE 'ct_%'` es **incorrecto** porque `_` es comodin de un caracter y tambien casaria `cta_ancestral_01`. `left()` con longitud fija y el orden `cta` -> `ct` -> `ce` lo dejan ademas a prueba de futuro.
- Predicado `familia IS NULL`: en la segunda corrida toca **0 filas** (idempotencia medida, no declarada).

**Bloque (2b) - backfill MINIMO de `stats_json` (MERGE, nunca reemplazo).** Para las 24 `lugar`, las 0 `personaje`/`artista`/`marca`/`cosmetica` y las 4 `consumible`/`producto` restantes:

```
UPDATE cartas_catalogo
   SET stats_json = COALESCE(stats_json,'{}'::jsonb) || jsonb_build_object(
         'primario','alcance',
         'alcance', CASE rareza WHEN 'comun' THEN 3 WHEN 'raro' THEN 5
                                WHEN 'epico' THEN 9 ELSE 14 END,
         'fortuna', CASE rareza WHEN 'comun' THEN 1 WHEN 'raro' THEN 3
                                WHEN 'epico' THEN 5 ELSE 10 END)
 WHERE familia='lugar' AND (stats_json->>'primario') IS NULL;
```

- Idempotente por `(stats_json->>'primario') IS NULL`.
- Las 4 `cta_ancestral_*` **no se tocan**: conservan `sku`, `volumen_ml`, `set_slug` y `premio_set` (`065:78-90`) y su vector queda vacio (no dan poder).
- Las `ce_evento_*` reciben `{"primario":null}`? **No.** Se dejan intactas: vector vacio = ninguna clave de eje. Cero escritura innecesaria.

**Bloque (3) - verificacion + constraints (todo en un `DO` con guardas).**

**Contrato ENMENDADO (auditoria `@sql-security` 2026-11-11, MEDIO-1) y ALINEADO con la 066 aplicada.** El **fail-closed** es: **0 filas con `familia IS NULL`** + **tripwire de ejes**; el **conteo total y el reparto 24/3/4 se REPORTAN** (`RAISE NOTICE`), **no** son condicion de aborto. (El contrato anterior, "aborta si `count(*) <> 31`", quedo sustituido por instruccion del operador: el catalogo puede crecer entre la spec y la ejecucion, y un `<> 31` convertiria una carta nueva legitima en migracion fallida.)

```
IF (SELECT count(*) FROM cartas_catalogo WHERE familia IS NULL) <> 0 THEN
  RAISE EXCEPTION 'MIG066: quedan % cartas sin familia', v_nulo;
END IF;

-- Tripwire de EJES: solo aborta si falta un EJE completo (no si el reparto crece).
-- Las 24 'lugar' de la baseline son el unico eje con cartas que lo aporten (3.1);
-- si algun dia valen 0, la rama de expedicion de alcance/fortuna se queda sin
-- fuente y hay que verlo ANTES de servirla.
IF (SELECT count(*) FROM cartas_catalogo
     WHERE familia='lugar' AND subtipo='territorio') = 0 THEN
  RAISE EXCEPTION 'MIG066: tripwire, 0 cartas lugar/territorio';
END IF;
IF (SELECT count(*) FROM cartas_catalogo
     WHERE familia='lugar' AND subtipo IS NULL) <> 0 THEN
  RAISE EXCEPTION 'MIG066: quedan lugares sin subtipo';
END IF;

-- REPORTE, no condicion (se lee en el log del runner)
RAISE NOTICE 'MIG066: total=% lugar=% consumible=% producto=%',
  (SELECT count(*) FROM cartas_catalogo),
  (SELECT count(*) FROM cartas_catalogo WHERE familia='lugar'),
  (SELECT count(*) FROM cartas_catalogo WHERE familia='consumible'),
  (SELECT count(*) FROM cartas_catalogo WHERE familia='producto');
```

> Baseline medido el 2026-11-11: `total = 31`, `lugar = 24`, `consumible = 3`, `producto = 4`. **Se reporta y se verifica en la matriz (8 V4/V5); no aborta.** Si el catalogo crecio, el reparto cambia y la migracion sigue: lo unico que no puede pasar es una carta **sin familia** ni un **eje entero a 0**.

Constraints (`DO` con guarda `pg_constraint`, `ADD CONSTRAINT` no admite `IF NOT EXISTS`):

| Nombre | Definicion |
|---|---|
| `chk_cartas_catalogo_familia` | `familia IN ('lugar','personaje','artista','marca','producto','consumible','cosmetica')` |
| `chk_cartas_catalogo_subtipo` | Dominio cerrado por familia: `(familia='lugar' AND subtipo IN ('territorio','patrimonio','natural')) OR (familia='personaje' AND subtipo IN ('historico','ficcion','folclor')) OR (familia='artista' AND subtipo IN ('musica','cine','grafica','literatura')) OR (familia='marca' AND subtipo IN ('licor','gastronomia','artesania','otra')) OR (familia='producto' AND subtipo IN ('fisico','digital')) OR (familia='consumible' AND subtipo IN ('entrada_evento','bono','servicio')) OR (familia='cosmetica' AND subtipo IN ('marco','fondo','insignia'))` |
| `chk_cartas_catalogo_precio` | `(familia IN ('producto','consumible') AND precio_xp IS NULL) OR (familia NOT IN ('producto','consumible') AND (precio_xp IS NULL OR precio_xp > 0))` |
| `chk_cartas_catalogo_edicion` | `edicion IN ('abierta','limitada','serial')` |
| `chk_cartas_catalogo_supply` | `(edicion='abierta' AND supply_max IS NULL) OR (edicion IN ('limitada','serial') AND supply_max IS NOT NULL AND supply_max > 0)` |
| `chk_cartas_catalogo_emitidas` | `emitidas >= 0 AND (supply_max IS NULL OR emitidas <= supply_max)` |
| `chk_cartas_catalogo_no_fusion_cosmetica` | `fusionable=false OR familia <> 'cosmetica'` |
| `chk_cartas_catalogo_sku` | `familia <> 'producto' OR (stats_json ? 'sku')` - las 4 `cta_ancestral_*` ya cumplen (`065:78-90`): nace en verde. **No** se aplica a `consumible` (las 3 `ce_evento_*` son legacy sin sku; ver 2.1 regla 7 y 8 V19) |
| `chk_cartas_catalogo_stats` (**DROP + ADD en el mismo `DO`**) | Se **reemplaza** por una version que valida el vector y **tolera** `bonus_xp_pct` (deprecada, inerte): `jsonb_typeof(stats_json)='object' AND (NOT (stats_json ? 'alcance') OR (jsonb_typeof(stats_json->'alcance')='number' AND (stats_json->'alcance') >= '0'::jsonb AND (stats_json->'alcance') <= '40'::jsonb)) AND ... (idem oficio, fortuna, rendimiento, presencia) AND (NOT (stats_json ? 'primario') OR stats_json->>'primario' IN ('alcance','oficio','fortuna','rendimiento','presencia'))` |

Notas del CHECK de stats:

- La version vigente (`060:335-344`) **se conserva en espiritu**: objeto plano + numero en rango. Se cambia el rango de la clave deprecada por el de las 5 claves nuevas.
- **La guarda NO puede ser `IF NOT EXISTS (conname)`:** con esa guarda el CHECK viejo de 060 **nunca se sustituye** (ya existe la fila en `pg_constraint`) y el vector quedaria sin validar en silencio. La guarda correcta es por **definicion**, no por nombre (patron de `065:123-127`):

```sql
IF EXISTS (SELECT 1 FROM pg_constraint
            WHERE conname='chk_cartas_catalogo_stats'
              AND conrelid='public.cartas_catalogo'::regclass
              AND pg_get_constraintdef(oid) NOT LIKE '%alcance%') THEN
  ALTER TABLE cartas_catalogo DROP CONSTRAINT chk_cartas_catalogo_stats;
END IF;
-- ADD CONSTRAINT ... (guarda por nombre, en el mismo DO, despues del DROP)
```

- **Verificacion de la sustitucion:** `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='chk_cartas_catalogo_stats';` debe contener `alcance` **y** `oficio` **y** `fortuna`; y `SELECT count(*) ... WHERE pg_get_constraintdef(oid) NOT LIKE '%alcance%'` = **0**.
- **`bonus_xp_pct` NO se prohibe** (ADR-003: prohibirlo obligaria a borrar la clave de las filas que la tienen). Queda tolerada e inerte; el `.sql` lo dice en un comentario.
- **Se compara en `jsonb` (`>= '0'::jsonb`), nunca con cast a numeric**: es la leccion literal de `060:326-330` (un cast fallaria con 22P02 ante `"quince"` en vez de devolver 23514, porque PostgreSQL no garantiza el orden de evaluacion de un `AND`).
- Se evalua **despues** del backfill y **no** depende de `NOT NULL` (mismo motivo que `060:272-275`: un ADD CHECK valida las filas existentes en el acto).

**Bloque (4) - PASO 2 DIFERIDO: `SET NOT NULL` NO se ejecuta en 066.**

```
-- NO SE EJECUTA AQUI. Pertenece a la fase 2, migracion nueva
-- 0NN_cartas_familia_not_null.sql, DESPUES de parchear cartas_crear.
-- Paso 1 (066): columnas nullable + backfill + CHECKs de dominio.
-- Paso 2 (fase 2): admin escribe familia/subtipo -> verificar 0 NULL -> SET NOT NULL.
-- Duenno: @admin-dev. Gate: SI. Criterio: alta sin familia -> 400, nunca 23502.
```

Razon medida: `cartas_crear` (`api/admin.js:1438-1446`) inserta una lista explicita de columnas sin `familia`/`subtipo`. Aplicar `SET NOT NULL` en 066 rompe el alta de cartas del panel el mismo dia del deploy, y esta tanda **no** toca `api/admin.js`.

**Bloque (5) - backfill de `emitidas` (circulacion real = inventario + escrow).**

```
WITH circ AS (
  SELECT c.id,
         COALESCE((SELECT SUM(u.cantidad) FROM usuarios_cartas u
                    WHERE u.carta_id = c.id AND u.activo = true), 0)
       + COALESCE((SELECT SUM(o.cantidad_restante) FROM cartas_ofertas o
                    WHERE o.carta_id = c.id AND o.activo = true
                      AND o.estado IN ('abierta','parcial')), 0) AS n
    FROM cartas_catalogo c
)
UPDATE cartas_catalogo c
   SET emitidas = GREATEST(c.emitidas, circ.n)
  FROM circ
 WHERE circ.id = c.id
   AND circ.n > c.emitidas;
```

- **Por que NO basta `SUM(usuarios_cartas.cantidad)`:** `carta_publicar` descuenta de `usuarios_cartas` y mueve las copias a `cartas_ofertas.cantidad_restante` con `estado` `abierta`/`parcial` (`api/interacciones.js:16206-16209`, `:16328-16332`; columnas `041:109-130`). Contar solo el inventario **subestima** la circulacion y dejaria `emitidas` por debajo de lo que existe.
- **`GREATEST(emitidas, circulacion)`**: nunca rebaja un valor previo (la migracion se puede re-ejecutar despues de acunaciones sin perder el contador).
- Idempotente: `circ.n > c.emitidas` -> **segunda corrida toca 0 filas**. Cero escritura para cartas sin circulacion (0 -> 0).
- Semantica: `emitidas` es **circulacion medida**, no "acunadas historicas"; una carta consumida (`activo=false`) ya consumio supply y no se cuenta. El CHECK `emitidas <= supply_max` sigue siendo el techo.

**Bloque (6) - tabla `usuarios_cartas_nivel` (sumidero de nivel).**

```sql
CREATE TABLE IF NOT EXISTS usuarios_cartas_nivel (
  usuario_id      uuid     NOT NULL REFERENCES usuarios(id),
  carta_id        text     NOT NULL REFERENCES cartas_catalogo(id) ON DELETE RESTRICT,
  nivel           smallint NOT NULL DEFAULT 1,
  xp_invertido    integer  NOT NULL DEFAULT 0,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, carta_id)
);
```

+ `DO` con guardas:

| Nombre | Definicion |
|---|---|
| `chk_usuarios_cartas_nivel_rango` | `nivel BETWEEN 1 AND 5` |
| `chk_usuarios_cartas_nivel_xp` | `xp_invertido >= 0` |

+ `CREATE INDEX IF NOT EXISTS idx_usuarios_cartas_nivel_usuario ON usuarios_cartas_nivel (usuario_id, nivel DESC);`

Justificacion de la tabla (no es tabla muerta):

- **PK sin `variante`**: el nivel es propiedad de la carta poseida, no de la copia. Dos variantes no pueden divergir en nivel (si la PK incluyera `variante`, fusionar a shiny "perderia" el nivel).
- Consumidores reales: subida de nivel (handler), calculo del vector (3.5) y ficha de carta. **Dos lectores y un escritor**, como `lib/cartas-config.js:10-14` exige.
- No toca `usuarios_cartas` ni su PK: **cero riesgo sobre `061`**.

**Bloque (7) - indices.**

```
CREATE INDEX IF NOT EXISTS idx_cartas_catalogo_familia
  ON cartas_catalogo (familia, rareza, activo);

CREATE INDEX IF NOT EXISTS idx_cartas_catalogo_tirada
  ON cartas_catalogo (rareza) WHERE activo = true AND familia <> 'producto' AND familia <> 'consumible';
```

`idx_cartas_catalogo_set` (`040:111-112`) y `idx_cartas_catalogo_emisor` (`060:372-373`) se conservan sin cambios.

**Consultas de verificacion de 066** (ver seccion 8 para la matriz completa):

```sql
-- V1: clasificacion completa
SELECT count(*) AS total, count(familia) AS con_familia FROM cartas_catalogo;
-- V2: distribucion
SELECT familia, subtipo, count(*) FROM cartas_catalogo GROUP BY 1,2 ORDER BY 1,2;
-- V3: precio coherente
SELECT count(*) FROM cartas_catalogo
 WHERE familia IN ('producto','consumible') AND precio_xp IS NOT NULL;
-- V4: vector solo en familias jugables
SELECT count(*) FROM cartas_catalogo
 WHERE familia IN ('producto','consumible')
   AND (stats_json ? 'alcance' OR stats_json ? 'oficio' OR stats_json ? 'fortuna'
        OR stats_json ? 'rendimiento' OR stats_json ? 'presencia' OR stats_json ? 'primario');
-- V5: emitidas nunca por debajo de la circulacion (inventario + escrow)
SELECT count(*) FROM cartas_catalogo c
 WHERE c.emitidas <
       COALESCE((SELECT SUM(u.cantidad) FROM usuarios_cartas u
                  WHERE u.carta_id=c.id AND u.activo=true),0)
     + COALESCE((SELECT SUM(o.cantidad_restante) FROM cartas_ofertas o
                  WHERE o.carta_id=c.id AND o.activo=true
                    AND o.estado IN ('abierta','parcial')),0);
-- V6: el contador es coherente con supply
SELECT count(*) FROM cartas_catalogo
 WHERE supply_max IS NOT NULL AND emitidas > supply_max;
-- V7: el CHECK de stats es el NUEVO (definicion, no nombre)
SELECT count(*) FROM pg_constraint
 WHERE conname='chk_cartas_catalogo_stats'
   AND pg_get_constraintdef(oid) NOT LIKE '%alcance%';
-- V8: ninguna carta queda con familia nula
SELECT count(*) FROM cartas_catalogo WHERE familia IS NULL;
```

**Bloque de ROLLBACK de 066 (documentado, NO ejecutado, requiere aprobacion del operador):**

```sql
-- ADR-003: el rollback NO borra datos de usuarios. Orden inverso.
-- 1) DROP TABLE IF EXISTS usuarios_cartas_nivel;        -- 0 filas => sin perdida
-- 2) DROP INDEX IF EXISTS idx_cartas_catalogo_tirada;
-- 3) DROP INDEX IF EXISTS idx_cartas_catalogo_familia;
-- 4) ALTER TABLE cartas_catalogo DROP CONSTRAINT IF EXISTS chk_cartas_catalogo_supply;
--    (idem emitidas, edicion, precio, subtipo, familia, no_fusion_cosmetica)
-- 5) Restaurar el CHECK de stats vigente de 060:335-344 EN EL MISMO DO (DROP+ADD).
-- 6) ALTER TABLE cartas_catalogo DROP COLUMN IF EXISTS emitidas, supply_max, edicion,
--    precio_xp, subtipo, familia;   -- DESTRUCTIVO: la clasificacion es derivable del
--                                    -- prefijo del id (bloque 2), el vector de stats_json
--                                    -- NO es derivable => exportar antes.
-- 7) DELETE FROM schema_migrations WHERE numero IN (66);  -- solo si el runner no lo hace
```

**Declaracion explicita:** el paso 6 es **destructivo** y pierde el vector que no es derivable de `rareza` (el reparto primario/secundario si es derivable; `primario` por familia tambien). Se documenta para que nadie lo ejecute "por limpiar".

### 7.2. `db/migrations/067_cartas_media.sql` (APLICADA) + `db/migrations/068_cartas_enmienda_licencia_precio.sql` (NUEVA)

> **Estado real (ADR-006):** la **067 ya esta aplicada vacia** (`cartas_media` 0 filas) y **no se edita**. La enmienda MEDIO-2 (`precio_xp`) y MEDIO-4 (`licencia`) van en la **068 aditiva**, contrato exacto en **11.5**.

**Bloque (1) - tabla `cartas_media` (la obra).**

```sql
CREATE TABLE IF NOT EXISTS cartas_media (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id           uuid,
  tipo               varchar(10) NOT NULL,
  titulo             varchar(200) NOT NULL,
  media_url          text NOT NULL,
  thumb_url          text,
  texto              text,
  duracion_seg       integer,
  estado_moderacion  varchar(12) NOT NULL DEFAULT 'pendiente',
  moderado_por       uuid,
  moderado_en        timestamptz,
  motivo             text,
  activo             boolean NOT NULL DEFAULT true,
  creado_en          timestamptz NOT NULL DEFAULT now()
);
```

| Columna | Semantica | NULL/DEFAULT |
|---|---|---|
| `id` | PK de la obra | `gen_random_uuid()` |
| `autor_id` | Autor UGC. **SIN FK por diseno** (precedente `060:238-242`): el autor puede desaparecer y la lectura degrada con `COALESCE`; una FK obligaria a bloquear el borrado o a borrar la obra (ADR-003) | NULL |
| `tipo` | `musica` / `foto` / `video` / `poema` | NOT NULL |
| `titulo` | Titulo de la obra | NOT NULL |
| `media_url` | URL del binario. Para `poema` es la URL canonica de la obra (puede ser la ficha), el texto va en `texto` | NOT NULL |
| `texto` | Cuerpo del poema | NULL |
| `duracion_seg` | Duracion de audio/video | NULL |
| `estado_moderacion` | `pendiente` por defecto: **nada nace aprobado** | NOT NULL DEFAULT `pendiente` |
| `motivo` | Motivo del rechazo (obligatorio si `rechazada`) | NULL |
| `licencia` | **Enmienda 068:** texto de la licencia aceptada por el autor (obligatoria para aprobar) | NULL en 067; la 068 la anade |
| `licencia_aceptada_en` | **Enmienda 068:** momento de aceptacion | NULL |
| `activo` | Baja logica (ADR-003) | NOT NULL DEFAULT true |

Constraints (`DO` + guardas `pg_constraint`):

| Nombre | Definicion |
|---|---|
| `chk_cartas_media_tipo` | `tipo IN ('musica','foto','video','poema')` |
| `chk_cartas_media_estado` | `estado_moderacion IN ('pendiente','aprobada','rechazada','retirada')` |
| `chk_cartas_media_url` | `btrim(media_url) <> ''` |
| `chk_cartas_media_poema` | `tipo <> 'poema' OR (texto IS NOT NULL AND btrim(texto) <> '')` |
| `chk_cartas_media_duracion` | `duracion_seg IS NULL OR duracion_seg > 0` |
| `chk_cartas_media_av` | `tipo <> 'musica' OR duracion_seg IS NOT NULL` |
| `chk_cartas_media_pendiente` | `estado_moderacion <> 'pendiente' OR (moderado_por IS NULL AND moderado_en IS NULL)` |
| `chk_cartas_media_rechazo` | `estado_moderacion <> 'rechazada' OR (motivo IS NOT NULL AND btrim(motivo) <> '')` |
| `chk_cartas_media_licencia` (**068**, no 067) | `estado_moderacion <> 'aprobada' OR (licencia IS NOT NULL AND btrim(licencia) <> '')` - fail-closed de derechos: sin licencia no hay aprobacion |

Indices:

```sql
CREATE INDEX IF NOT EXISTS idx_cartas_media_cola  ON cartas_media (estado_moderacion, creado_en);
CREATE INDEX IF NOT EXISTS idx_cartas_media_autor ON cartas_media (autor_id, creado_en DESC);
```

**Bloque (2) - FK nullable desde el catalogo.**

```sql
ALTER TABLE cartas_catalogo ADD COLUMN IF NOT EXISTS media_id uuid;
```

+ `DO` con **doble guarda** (por nombre **y** por "ya existe una FK sobre `media_id`"), copiando el patron literal de `060:307-324`:

```sql
IF NOT EXISTS (SELECT 1 FROM pg_constraint
                WHERE conname='fk_cartas_catalogo_media_id'
                  AND conrelid='public.cartas_catalogo'::regclass)
   AND NOT EXISTS (SELECT 1 FROM pg_constraint c
                     JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum = ANY(c.conkey)
                    WHERE c.conrelid='public.cartas_catalogo'::regclass
                      AND c.contype='f' AND a.attname='media_id') THEN
  ALTER TABLE cartas_catalogo
    ADD CONSTRAINT fk_cartas_catalogo_media_id
    FOREIGN KEY (media_id) REFERENCES cartas_media(id) ON DELETE RESTRICT;
END IF;
```

- `ON DELETE RESTRICT` (no `SET NULL`): una carta no puede perder su obra en silencio; mismo criterio que `fk_cartas_catalogo_marca_id` (`060:320-323`).
- Indice de la FK (PostgreSQL no lo crea solo): `CREATE INDEX IF NOT EXISTS idx_cartas_catalogo_media ON cartas_catalogo (media_id) WHERE media_id IS NOT NULL;`
- **Sin backfill:** no existe ninguna obra el dia de la migracion. `cartas_catalogo.media_id` queda NULL en 31/31.

**Por que una tabla nueva y no `album_fotos` (justificacion medida):**

1. **Pertenencia distinta.** `album_fotos.album_id` es `NOT NULL REFERENCES albumes` y `albumes.usuario_id` es del dueno del album (`009_albumes.sql:25-42`, `:46`). La obra de una carta **no pertenece a ningun album** y no debe desaparecer si el autor borra su album (`albumes` se borra en cascada desde `usuarios`): reusar `album_fotos` ataria la obra de un catalogo publico al ciclo de vida de un album privado.
2. **Dominio distinto.** `album_fotos.foto_type` solo admite `('foto','video','audio')` (`009_albumes.sql:52`): **no hay `poema`** ni sitio para el texto. Meter `poema` seria otro DROP+ADD de CHECK sobre una tabla con datos de usuarios.
3. **Estado que `album_fotos` no tiene:** moderacion previa obligatoria (`estado_moderacion`, `moderado_por`, `moderado_en`, `motivo`) y limite por autor. Anadirlos a `album_fotos` impondria `pendiente` a **todas** las fotos de albumes existentes y romperia la galeria (que no pasa por moderacion).
4. **Relacion 1 obra -> N ediciones:** `media_id` **no es UNIQUE** en `cartas_catalogo`; una fila de `cartas_media` puede sostener varias cartas (comun y dorada de la misma cancion). `album_fotos` no tiene ese rol: es la foto de UN album.
5. **Cero duplicacion de `cromos_catalogo`:** la tabla nueva no toca cromos; el aislamiento de sistemas se mantiene (`040:94-95`, M-4).

**Bloque de ROLLBACK de 067 (documentado, NO ejecutado):**

```sql
-- 1) DROP TABLE IF EXISTS cartas_media;   -- solo si count(*) = 0 (no hay obra que perder)
-- 2) ALTER TABLE cartas_catalogo DROP CONSTRAINT IF EXISTS fk_cartas_catalogo_media_id;
-- 3) DROP INDEX IF EXISTS idx_cartas_catalogo_media;
-- 4) ALTER TABLE cartas_catalogo DROP COLUMN IF EXISTS media_id;  -- DESTRUCTIVO si hay filas
-- 5) DELETE FROM schema_migrations WHERE numero IN (67);          -- solo si aplica
```

### 7.3. Orden y dependencias

`065` (aplicada) -> `066` -> `067`. **067 no depende de 066** (tabla y FK independientes) pero se ejecutan en ese orden para que el rollback sea inverso y legible. Ninguna de las dos depende del codigo desplegado: son aditivas y el codigo actual las ignora (patron `060`/`061`).

---

## 8. Matriz de verificacion

Todas las consultas se ejecutan con `node scripts/neon_select.js -f <archivo.sql>` (solo lectura; `neon_select.js:7-14`). El autotest de CHECKs va en un unico `DO` (el runner no mantiene transaccion entre sentencias) y **no deja datos**.

| # | Que se prueba | Comando / consulta exacta | PASS |
|---|---|---|---|
| V0 | Sintaxis y predecesores | `node scripts/apply_sql_file.js db/migrations/066_cartas_familias_stats_supply.sql --dry-run` y lo mismo con 067 | exit 0, sin escritura |
| V1 | Aplicacion real | `node scripts/apply_sql_file.js db/migrations/066_cartas_familias_stats_supply.sql` | exit 0, `schema_migrations` max = 66 |
| V2 | Idempotencia (ADR-008) | Segunda corrida del mismo comando + `md5` del catalogo antes/despues: `SELECT md5(string_agg(id||'|'||familia||'|'||subtipo||'|'||emitidas::text, ',' ORDER BY id)) FROM cartas_catalogo;` | exit 0 y **md5 identico** = 0 cambios de dato |
| V3 | Columnas antes/despues | Snapshot de `information_schema.columns` (tabla `cartas_catalogo`, `ORDER BY ordinal_position`) antes de 066 y despues de la 2a corrida | El diff es **exactamente** `familia, subtipo, precio_xp, edicion, supply_max, emitidas, media_id`; ninguna columna previa desaparece ni cambia de tipo; **`familia` y `subtipo` siguen `is_nullable='YES'`** (el `NOT NULL` es del paso 2, no de 066) |
| V4 | 31/31 con familia | `SELECT count(*) AS total, count(familia) AS con_familia FROM cartas_catalogo;` | `total = 31` y `con_familia = 31` |
| V5 | Distribucion correcta | `SELECT familia, subtipo, count(*) FROM cartas_catalogo GROUP BY 1,2 ORDER BY 1,2;` | `lugar/territorio 24`, `consumible/entrada_evento 3`, `producto/fisico 4` |
| V6 | Cero huerfanas de media | `SELECT count(*) FROM cartas_catalogo c WHERE c.media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cartas_media m WHERE m.id=c.media_id);` **y** `SELECT count(*) FROM pg_constraint WHERE conname='fk_cartas_catalogo_media_id';` | 0 y 1 |
| V7 | `precio_xp` coherente | Consulta V3 de 7.1 | 0 |
| V8 | Vector solo en familias jugables | Consulta V4 de 7.1 | 0 |
| V9 | `emitidas` coherente | Consulta V5 de 7.1 (**inventario + escrow**) | 0 |
| V10 | `emitidas <= supply_max` | Consulta V6 de 7.1 | 0 |
| V11 | CHECKs probados (23514 esperado) | `DO` de autotest: (a) `familia='invalida'`; (b) `familia='producto'` con `precio_xp=100`; (c) `edicion='limitada'` con `supply_max=NULL`; (d) `supply_max=1` con `emitidas=2`; (e) `stats_json->'alcance' = 'quince'`; (f) `usuarios_cartas_nivel.nivel=6`; (g) `cartas_media` `rechazada` sin `motivo`; (h) `cartas_media` `pendiente` con `moderado_en`; (i) `familia='producto'` sin `stats_json.sku` | **9/9** capturados como `check_violation` (23514); el `DO` hace `RAISE NOTICE` por cada PASS y **no deja filas** |
| V12 | Idempotencia de 067 | Segunda corrida de 067 + `SELECT count(*) FROM cartas_media;` y `SELECT count(*) FROM cartas_catalogo WHERE media_id IS NOT NULL;` | exit 0, 0 y 0 |
| V13 | Vista `cartas_jugables` no se rompio | `SELECT count(*) FROM information_schema.views WHERE table_schema='public' AND table_name='cartas_jugables';` y, si = 1, comparar `information_schema.columns` de la vista vs tabla | La vista existe (=1) o no (=0); en ningun caso 067/066 la recrean y **ninguna consulta de producto la usa** |
| V14 | ASCII-safe (ADR-002) | `$t = Get-Content -Raw db/migrations/066_cartas_familias_stats_supply.sql; if ($t -match '[^\x00-\x7F]') { 'FAIL' } else { 'PASS' }` | PASS en 066, 067 y esta spec |
| V15 | Cero endpoints nuevos | `Get-ChildItem api -Filter *.js | Measure-Object` | 8 |
| V16 | Numeracion del ADR | `Select-String -Path "exploraco desarrollo/DECISIONS.md" -Pattern "^## ADR-121"` | 1 (lo verifica el pase de `@docs-keeper`) |
| V17 | Cero borrado logico | Busqueda de `DELETE|TRUNCATE|DROP COLUMN` en 066/067, excluyendo el bloque de rollback comentado | 0 sentencias ejecutables |
| V18 | El CHECK de stats es el NUEVO | Consulta V7 de 7.1 (`pg_get_constraintdef`) | 0 filas con la definicion vieja |
| V19 | Convencion `stats_json.sku` | `SELECT familia, count(*) FROM cartas_catalogo WHERE NOT (stats_json ? 'sku') GROUP BY 1;` | `producto = 0` (4/4 con sku); `consumible = 3` (**baseline legacy declarado**, no bug) y el resto sin sku |
| V20 | `familia` sigue nullable (paso 1) | `SELECT is_nullable FROM information_schema.columns WHERE table_name='cartas_catalogo' AND column_name IN ('familia','subtipo');` | **2 filas `YES`**: el `NOT NULL` es del paso 2 |

**Criterio de aceptacion de la tanda:** V0-V24 en verde (V21-V24 en 11.5.2), **2 corridas = 0 cambios de dato** (V2/V12/V24) y los **10** CHECKs devolviendo 23514 (V11 + V23). `@qa-auditor` certifica con Escudo GOLD; en esta fase **no hay `api/*.js` tocado**, asi que el Escudo se limita a ASCII + sintaxis SQL.

---

## 9. Riesgos, deuda y fuera de alcance

### 9.1. Riesgos con mitigacion

| Riesgo | Probabilidad | Impacto | Mitigacion |
|---|---|---|---|
| **Carrera en la emision** (dos acunados leen 49 y ambos escriben 50) | Media | Vender mas que `supply_max` | Prohibido leer-y-luego-escribir: el UPDATE de 4.5 es la unica via y `0 filas` = AGOTADA |
| **El operador ejecuta el bloque de rollback** de 7.1 paso 6 | Baja | Perdida del vector y de la clasificacion | Marcado DESTRUCTIVO en el `.sql`; el vector es derivable de `rareza`+`familia` salvo `primario`, que se exporta antes |
| **Una sesion futura "activa" `bonus_xp_pct`** sin ADR (riesgo literal de `NEXT.md:67` b) | Media | Bono de XP global encubierto | El ADR-121 lo declara inerte y 066 lo comenta; `BONO_EXCLUIDAS` sigue siendo la unica via de bonos |
| **La vista `cartas_jugables` no tiene DDL en el repo** (0.3) | Alta | Una migracion futura podria asumir columnas que no tiene | 066/067 no la tocan; V13 la verifica; deuda declarada abajo |
| **`emitidas` no cuadra con el inventario visible** (consumos no decrementan; el escrow saca copias de `usuarios_cartas`) | Alta | Auditoria confusa | 4.5 cuenta **inventario + escrow** (`cartas_ofertas.cantidad_restante`, `041:109-130`) y V9 exige `emitidas >= circulacion` |
| **El catalogo crece antes de aplicar 066** y el conteo 31 aborta | Media | Migracion fallida (fail-closed) | Es el comportamiento deseado: re-medir y actualizar la constante; nunca relajar a `>= 31` |
| **UGC sin moderacion efectiva** (cola vacia) | Media | Contenido indebido publicado | Estado `pendiente` por DEFAULT + gate por acciones reales (`n_resenas_largas>=3`) + 3 pendientes max + handler que exige `aprobada` (fase 2) |

### 9.2. Deuda que ESTA tanda abre o deja declarada

- **D-12 (documental, no de runtime):** **ADR-117 nombra la vista `cartas_jugables` y esa vista NO tiene DDL en `db/migrations`.** `api/admin.js:1348` la cita como autoridad y ningun `.sql` la crea. **No bloquea 066**: ninguna rama nueva depende de ella y V13 solo comprueba que no se rompa. Cierra cuando exista `db/migrations/0NN_cartas_jugables_view.sql` idempotente (duenno `@backend-dev`, operador).
- **D-13: no hay ledger de acunacion.** `emitidas` es un contador, no un libro. Si el operador quiere conciliar contra XP (patron `xp_ledger`), sera tabla nueva; hasta entonces el numero es **circulacion medida** (4.5), no un historico.
- **D-14: `personaje`, `artista` y `cosmetica` tienen 0 cartas.** Consecuencia directa: `oficio` y `rendimiento` valen 0 en el catalogo actual, y por eso **v1 solo publica `expedicion_rama` de `alcance`/`fortuna`** (5.2). Cierra con el seed de fase 4.
- **D-15 (nueva): una carta de `producto`/`consumible` se puede listar y vender por XP.** `carta_publicar` solo exige `activo=true` (`api/interacciones.js:16200-16209`) y no filtra familia; `carta_fusionar` si filtra por `fusionable`. Contrato de fase 2: predicado de familia en `carta_publicar` (400 `FAMILIA_NO_COMERCIABLE`) + smoke que impida listar `producto`/`consumible`. Duenno `@backend-dev`, gate **SI**.
- **D-16 (nueva): la acunacion y el nivel no existen como codigo en este release.** Los contratos estan escritos (4.8 y 4.9) pero no implementados. Incluye la divergencia medida: la fusion resta de `xp_total` (`api/interacciones.js:16657-16661`) contra el patron normativo de `046:40-44`; **no se repara aqui**. Duenno `@backend-dev`, gate **SI**.
- **D-17 (nueva): la venta P2P de cartas no cobra tithe ni paga royalty.** El `cred` acredita el bruto (`api/interacciones.js:16334-16337`) y `aplicarTitheParche` (`:5430-5437`) no toca el mercado de cartas. Contrato de fase 2 en 6.4 (royalty 10% + tithe <= 10%, detraccion total <= 20%, orden y prueba de `neto >= 0`). Duenno `@backend-dev`, gate **SI**.
- **D-18 (nueva, auditoria `@sql-security` 2026-11-11): la licencia UGC no existe en la base.** La 067 aplicada **no** crea `licencia` ni `licencia_aceptada_en` (`067:26-28` lo declara) y por tanto tampoco hay CHECK que impida aprobar una obra sin derechos. **Se cierra con la 068** (contrato en 11.5). Duenno `@sql-security` (esquema) + `@backend-dev` (handler que exige aceptacion). Gate **SI**.
- **D-19 (nueva): la vista `cartas_jugables` sigue sin DDL** y **D-12 se mantiene documental**, no de runtime: ADR-117 la nombra, `api/admin.js:1348` la cita y ningun `.sql` la crea, pero **ninguna rama nueva depende de ella** ni bloquea 066/067/068 (V13 solo comprueba que no se rompa). No se duplica con D-12: D-12 es el registro historico y D-19 deja constancia de que **la enmienda 068 tampoco la toca**.
- **Constancia de medicion (auditoria):** el backfill de `emitidas` **no se pudo ejercitar con datos** porque `usuarios_cartas` y `cartas_ofertas` estan a **0 filas**: la consulta de circulacion (4.5) devuelve 0 para las 31 cartas y el `UPDATE ... WHERE circ.n > c.emitidas` toca **0 filas**. La rama con datos queda **verificada por construccion, no por ejecucion**; se ejercitara en la primera acunacion real (fase 2) o en un smoke con datos sinteticos revertidos.
- **D-5 CERRADA** por el ADR-121 (4.7). El texto de `NEXT.md:65` (d) lo retira `@docs-keeper`.
- **D-2 (mercado por variante) sigue viva:** `060:390-392` la declara; esta spec no la toca.
- **D-9 (ledger de fusion fuera del CTE) sigue viva:** 4.8/4.9 exigen el patron correcto (mismo statement), pero no se repara la fusion en esta tanda.

### 9.3. Fuera de alcance (explicito)

1. **Nada de tabla de seriales en v1** (4.4): solo `edicion='serial'` + `supply_max` + `emitidas`, con el punto de extension escrito.
2. **Nada de energia:** nombre reservado (3.6), cero columnas, cero claves.
3. **Nada de endpoints** (8/8 agotadas): todo por ramas `?tipo=` existentes.
4. **Nada de unificar `cromos_catalogo` con `cartas_catalogo`** (M-4, `040:94-95`): sigue siendo el sistema paralelo.
5. **Nada de tocar la PK de `usuarios_cartas`** (`061`).
6. **Nada de tocar `exploraco desarrollo/*.md`** (R2): este documento es el unico entregable de la Fase 0; `DECISIONS.md`, `TASKS.md` y `NEXT.md` los cierra `@docs-keeper` en un pase.
7. **Nada de implementar** `lib/cartas-config.js`, handlers, UI ni seeds: 066/067 son contrato escrito.
8. **Nada de tocar `api/admin.js` ni `api/interacciones.js` en este release** (veredicto de revision): todo lo que necesita codigo es **contrato de fase 2** con duenno y gate (tabla en 10). Incluye `cartas_crear`, `carta_publicar`, la CTE de venta, el DAG `MISIONES` y la cola de moderacion.

---

## 10. ADR-121 (texto listo para publicar en `DECISIONS.md`)

> El bloque siguiente se publica **literal** en `exploraco desarrollo/DECISIONS.md` en el pase de `@docs-keeper`. ASCII-safe.

### ADR-121: Las cartas se clasifican en **7 familias de 3 capas** y su vector se fija en **4 ejes jugables mas presencia cosmetica**, con **umbrales y caps y sin multiplicar XP**; la tirada usa **pesos 5000/1000/250/50**, el valor de acunacion es **base por rareza x multiplicador de familia**, la emision se acota con **`emitidas` + `supply_max`** y `stats_json.bonus_xp_pct` **se retira del contrato** (su funcion la asume `stats.rendimiento`, como bono NUEVO solo de expedicion) [**acota** ADR-108 (taxonomia de emisor y variante) y ADR-120 solo en el **valor de canje del set Ancestral**; **no deroga** el bono global 24 h de consumibles de ADR-120, ni ADR-003 (cero borrado logico), ni ADR-018 (los sinks no tocan `xp_total`), ni ADR-117 (jugable = tiene diseno), ni el CHECK de rareza de la 040]

- **Fecha:** 2026-11-11 (v2, corrige el veredicto SOLICITA CAMBIOS de `@architect-review`)
- **Autor:** @architect
- **Estado:** Aceptado (v2 corregida; 066/067 pendientes de ejecucion)

#### Problema

El catalogo de 31 cartas tiene rareza, emisor, variante, museo, fusion y set, pero **no tiene taxonomia** (`set_slug` no dice que ES una carta), **no tiene valor** (nada dice cuanto cuesta acunar una carta), **no tiene supply** (nada limita cuantas existen) y **no tiene stats con consumidor** (`stats_json` solo lleva `bonus_xp_pct`, display-only desde ADR-108: deuda D-5). Sin eso, la tirada no se puede implementar sin inventar numeros en el handler, el mercado no puede distinguir una carta de juego de un recibo de SKU, y la UGC no tiene donde vivir. Ademas, al elegir un juego por **acciones reales** (no por energia), el eje "energia" del referente queda sin consumidor: dejarlo seria una stat muerta.

#### Opciones

- **A. Taxonomia en `tags` JSONB.** Flexible, cero migracion, pero `familia` es dimension de **filtro y de tirada** y `emitidas` es un **contador atomico**: un contador en JSONB exige `jsonb_set` con lectura previa y pierde actualizaciones bajo concurrencia. Un CHECK por clave en JSONB tampoco puede validar el dominio cerrado por familia con la claridad de un CHECK de columna. **Descartada.**
- **B. Tabla `cartas_familias` + FK.** Normaliza los 7 valores, pero crea una tabla que solo sirve para hacer `JOIN` contra 7 filas estaticas y anade una escritura administrativa para algo que no cambia en runtime. **Descartada** (tabla muerta por definicion).
- **C. Columnas en `cartas_catalogo` (`familia`, `subtipo`) + reuso de `stats_json` para el vector + `precio_xp`/`edicion`/`supply_max`/`emitidas`.** La identidad y la economia son columnas (indexables, con CHECK y con contador atomico); el vector, que es forma variable, se queda en el JSONB que **ya existe** (`060:254-255`) con MERGE (`COALESCE(stats_json,'{}') || $1`). **Elegida.**

#### Decision

1. **7 familias en 3 capas.** Juego: `lugar`, `personaje`, `artista`, `marca`. Economia: `producto`, `consumible`. Estatus: `cosmetica`. `subtipo` es dominio cerrado **por familia**. La capa **se deriva**, no se persiste. **`familia`/`subtipo` entran NULLABLE en 066** con backfill **31/31**; el `NOT NULL` es el **paso 2** de una migracion de fase 2, **despues** de parchear `cartas_crear` (`api/admin.js:1438-1446` inserta lista explicita y hoy no escribe esas columnas). Expand/contract, no big-bang.
2. **4 ejes jugables + presencia + nivel de carta.** `alcance`, `oficio`, `fortuna`, `rendimiento` actuan por **umbral** y por **caps** (40/eje, `poder` <= 160). `presencia` es **solo cosmetica** (no entra en `poder`, no toca XP ni tirada). **Ninguna stat multiplica el XP global.** `energia` queda **RESERVADA**: sin columna y sin clave. **v1 solo publica expediciones de `alcance`/`fortuna`**: son los unicos ejes con cartas que los aporten hoy (24 `lugar`); `oficio`/`rendimiento` valen 0 y sus ramas esperan al seed de fase 4.
3. **Puntos por rareza 4/8/14/24**, repartidos primario/secundario en enteros exactos (3/1, 5/3, 9/5, 14/10); **shiny** `floor(25%)` al primario; **nivel 1..5** por usuario y carta con **+1 al primario por nivel** y coste **150/400/900/1800** de XP. El cargo sube **`xp_gastado_sinks`** y **nunca** resta de `xp_total` (patron `046:40-44`), con las dos guardas de ADR-018; la subida es **una sola sentencia** condicionada a `nivel < 5` e **idempotente por `(usuario, carta, variante, nivel_esperado)`** (4.9).
4. **`producto` y `consumible` no tienen `precio_xp` ni vector.** Se pagan por su SKU (`consumibles.clave`/`precio_xp`) y **no dan PODER de juego**: eso es un CHECK, no una promesa. **La comerciabilidad NO esta cerrada:** `carta_publicar` solo exige `activo=true` (`api/interacciones.js:16200-16209`), asi que hoy una carta de producto se puede listar y vender por XP -> **D-15**, contrato de fase 2 (predicado de familia + smoke).
5. **Precio de acunacion = base_rareza (150/400/1000/2500) x multiplicador de familia (cosmetica 0,5 / lugar 1,0 / personaje 1,2 / artista 1,2 / marca 1,5).** El precio **se resuelve al acunar y se guarda**; no se recalcula en lectura. **El tipo es `numeric(12,2)` (ADR-035)**, no `integer`: los multiplicadores no son enteros y redondear en el handler seria una segunda autoridad del precio. La 066 aplicada lo creo `integer`; **la 068 lo convierte** (enmienda 2, 11.5). **El sumidero de acunacion es contrato de fase 2** (4.8): un solo CTE con cargo, emision, inventario y asiento, fail-closed.
6. **Tirada por pesos 5000/1000/250/50** con denominador = pesos elegibles (renormaliza al agotarse una rareza). `fortuna` multiplica los pesos de raro/epico/dorado con techo **+20%**. La tirada no tiene estado (sin pity).
7. **Supply y edicion:** `edicion` (`abierta`/`limitada`/`serial`), `supply_max` y `emitidas`. **En v1 no hay tabla de copias por serial**: la emision se acota con un `UPDATE ... SET emitidas = emitidas + 1 WHERE ... AND emitidas < supply_max` (0 filas = AGOTADA). `emitidas` es **circulacion medida = inventario + escrow de ofertas abiertas/parciales** (`cartas_ofertas.cantidad_restante`, `041:109-130`), y el backfill usa `GREATEST(emitidas, circulacion)`. El punto de extension (`cartas_serie`) queda documentado con su coste.
8. **Modos:** coleccion pasiva; **expedicion** como extension del DAG `MISIONES` con `requiere_stats` y **`expedicion_rama`** (clave nueva: `rama` ya existe con otro dominio), misiones **REPETIBLES**, recompensa <= 40 XP, **maximo 5 cobros por 24 h** (tope 200 XP/dia medido en `xp_ledger`) y accion exenta de bonos; **temporada diferida** (punto de extension: `set_slug`).
9. **UGC:** `obra` (`cartas_media`) -> N `ediciones` (`cartas_catalogo.media_id`, **no UNIQUE**). **Moderacion previa obligatoria** (`pendiente` por defecto; solo `aprobada` se acuna), **derechos previos**: una obra no puede estar `aprobada` sin `licencia` no nula (CHECK fail-closed, **068**), limites por autor, royalty **10% en XP** al `emisor_id` con tithe <= 10% y **detraccion total <= 20%**, retirada por estado (**nunca `DELETE`**). **El royalty y el tithe son contrato de fase 2:** hoy la venta P2P acredita el **bruto** (`api/interacciones.js:16334-16337`) y el tithe de cartas **no existe** -> **D-17**.
10. **D-5 cerrada:** `bonus_xp_pct` **sale del contrato**, no de la base. Su intencion la asume `stats.rendimiento` como **bono NUEVO, solo sobre recompensa de expedicion, capado y con tope 24 h**; **no deroga el bono global 24 h de consumibles de ADR-120**. Se tolera la clave en filas existentes (ADR-003) y **ningun lector nuevo la consume**.

#### Contratos de fase 2 (codigo NO incluido en este release)

Ninguno de estos cambios entra en la tanda de 066/067: son **contrato escrito** para que la fase 2 no los reinvente. Todos exigen **gate**.

| Contrato | Duenno | Gate | Seccion |
|---|---|---|---|
| Sumidero de acunacion (cargo + emision + inventario + ledger, un solo CTE) | `@backend-dev` | SI | 4.8 |
| Subida de nivel atomica (idempotente por `nivel_esperado`) | `@backend-dev` | SI | 4.9 |
| `expedicion_rama` + misiones repetibles con cap 5/24 h | `@backend-dev` | SI | 5.2 |
| Predicado de familia en `carta_publicar` (D-15) | `@backend-dev` | SI | 9.2 |
| Royalty 10% + tithe <= 10% (detraccion <= 20%) | `@backend-dev` | SI | 6.4 |
| Cola de moderacion y alta de obra en admin | `@admin-dev` | SI | 6.2 |
| `familia`/`subtipo` en `cartas_crear`/`cartas_editar` + `SET NOT NULL` (paso 2) | `@admin-dev` | SI | 7.1 |

#### Justificacion

- **Columnas y no JSONB** (opcion C): `familia`/`subtipo` necesitan CHECK de dominio cerrado, indice para la tirada y `emitidas` necesita un contador que no pierda actualizaciones. El vector, en cambio, es forma variable y **ya tiene** columna JSONB: crear columnas por eje seria duplicar y migrar cinco veces.
- **Por acciones reales y no por energia:** la mision ya se evalua server-side sobre acciones que ocurrieron (`api/interacciones.js:4008-4011`); una barra de energia anadiria un reloj y un incentivo a esperar. Se compensa con **caps**, no con cooldowns.
- **`rendimiento` en vez de `bonus_xp_pct`:** un porcentaje global es exactamente el incentivo invertido que ADR-082 prohibe en gates y el riesgo que `NEXT.md:67` (b) marcaba. Un eje que **habilita y acota** no puede inflarse.
- **Producto/consumible sin poder:** con SKU + vector vacio, el **poder** no se compra: es un CHECK, no una regla de conducta. **La comerciabilidad es otra cosa y no esta cerrada**: `carta_publicar` no filtra familia (`api/interacciones.js:16200-16209`), asi que el "no se vende" es **condicion de fase 2** (D-15), no un hecho del sistema.
- **Seriales como contador:** la PK `(usuario_id, carta_id, variante)` (`061`) no tiene sitio para copias, `cantidad` es agregado con 8 consumidores y ninguna pantalla muestra el numero. Un contador resuelve lo unico que v1 necesita (cuantas existen) sin reabrir la PK.
- **Tabla de media nueva:** `album_fotos` cuelga de un album privado (`ON DELETE CASCADE`), no admite `poema` y no tiene moderacion; reusarla impondria `pendiente` a todas las fotos de usuario.

#### Impacto

- **Esquema:** 6 columnas + 1 tabla en 066; 1 tabla + 1 columna con FK en 067; **068 aditiva** (tipo `precio_xp` + `licencia`/`licencia_aceptada_en` + su CHECK). **`familia`/`subtipo` quedan NULLABLE** (el `NOT NULL` es el paso 2 de fase 2, tras parchear `cartas_crear`). **Cero `DELETE`, cero `DROP COLUMN` ejecutable, cero cambio a `usuarios_cartas` ni a su PK, cero toque a `cromos_catalogo`.**
- **Backend:** **cero cambios en esta tanda** (8/8 y ni un `.js` de `api/` tocado). Lo que necesita codigo queda como **contrato de fase 2 con duenno y gate**: acunacion (4.8), nivel atomico (4.9), `expedicion_rama` (5.2), predicado de familia en `carta_publicar` (D-15), royalty+tithe (6.4) y cola de moderacion (6.2). Todos exigen `@backend-dev`/`@admin-dev` con gate **SI**.
- **Constantes:** `lib/cartas-config.js` crece con `CARTA_PRECIO_BASE_XP`, `CARTA_MULT_FAMILIA`, `CARTA_PESOS_RAREZA`, `CARTA_NIVEL_XP`, `CARTA_NIVEL_TOPE`, `CARTA_FAMILIAS`, `FAMILIAS_MUSEABLES`. Una fuente, dos lectores (patron `lib/cartas-config.js:10-14`).
- **Render:** la capa de una carta se deriva de `familia`; `poder` y `vector_usuario` se calculan en lectura, nunca se persisten. Un `<img>` dinamico nuevo mantiene `onerror` (ADR-008).
- **Datos:** 31/31 clasificadas; 24 lugar, 3 consumible, 4 producto; `emitidas` arranca como **circulacion medida** (inventario + escrow, `GREATEST`).
- **Documentacion:** retira el pendiente D-5 de `NEXT.md:65` (d) en el pase de `@docs-keeper`; abre D-12 (documental: ADR-117 nombra la vista `cartas_jugables` y no tiene DDL), D-13 (sin ledger de acunacion), D-14 (3 familias con 0 cartas), **D-15** (`producto`/`consumible` listables y vendibles por XP), **D-16** (acunacion y nivel son contrato, no codigo; fusion resta de `xp_total`) y **D-17** (la venta P2P no cobra tithe ni paga royalty).

#### Verificacion

La matriz completa es la seccion 8 de `docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md`. Los cinco criterios duros:

1. `--dry-run` exit 0 en 066 y 067; aplicacion real y **segunda corrida con md5 del catalogo identico** (0 cambios de dato).
2. **31/31 con familia** y distribucion `lugar/territorio 24`, `consumible/entrada_evento 3`, `producto/fisico 4`.
3. **9/9 CHECKs** probados devolviendo 23514 (familia invalida, producto con precio, limitada sin techo, emitidas sobre el techo, stat no numerica, nivel 6, rechazo sin motivo, pendiente con moderador, producto sin `sku`) **sin dejar filas**.
4. `emitidas >= inventario + escrow` por carta (`041:109-130`) y `emitidas <= supply_max` cuando hay techo; 0 huerfanas de `media_id`.
5. ASCII: 0 bytes > 127 en 066, 067 y la spec.

#### Deudas que cierra y deudas que abre

- **Cierra D-5** (stats sin consumidor) por la via de **retirar** la clave del contrato, no de "activarla".
- **Abre D-12** (documental: ADR-117 nombra la vista `cartas_jugables` y no tiene DDL), **D-13** (sin ledger de acunacion), **D-14** (tres familias sin cartas), **D-15** (`producto`/`consumible` listables y vendibles por XP), **D-16** (acunacion y nivel sin codigo en este release) y **D-17** (venta P2P sin royalty ni tithe).
- **No toca** D-2 (mercado por variante) ni D-9 (ledger de fusion fuera del CTE); D-16 **documenta** que la fusion resta de `xp_total` y no se repara aqui.

---

## 11. Preguntas

**Estado: CERO preguntas abiertas. Cero bloqueantes.** No hay ninguna decision pendiente que impida implementar 066/067 tal como quedan contratadas.

### 11.1. Decisiones del operador y donde quedaron normativas

| Decision cerrada | Donde vive su argumento |
|---|---|
| 1. Alcance: Fase 0 + 066/067 | Cabecera y 9.3 |
| 2. Juego por acciones reales (sin energia ni claim) | 1, 5.2, 3.6, 9.3 |
| 3. Stats = umbrales y caps; ninguna multiplica XP global | 3.1, 3.6, 5.2 |
| 4. Seriales por contador en el catalogo | 4.4, 7.1 (bloque 5), 7.3 |
| 5. Cosmetics comerciables, cero efecto economico | 2.1, 3.1, 4.2 |
| 6. UGC con moderacion previa y venta en XP | 6.2-6.5 |
| 7. Media nueva por carta (musica/foto/video/poema) | 6.1, 7.2 |
| 8. Numeros aprobados (puntos, tirada, precios, multiplicadores) | 3.2, 4.2, 4.3 |

### 11.2. Decisiones tomadas por el arquitecto dentro del margen delegado (revisables, no abiertas)

Ninguna de estas bloquea: todas son **parametros sin esquema** o **datos sin migracion**, salvo donde se indica.

| Decision | Valor | Como se cambia despues |
|---|---|---|
| Reparto entero primario/secundario | 3/1, 5/3, 9/5, 14/10 | Dato de catalogo (`stats_json`) + `CARTA_PUNTOS`; sin migracion |
| Eje primario por familia | 3.2 (tabla) | Dato de catalogo + constante; sin migracion |
| Coste de nivel | 150/400/900/1800 (max 3.250) | `CARTA_NIVEL_XP`; sin migracion |
| Techo de nivel | 5 | `CARTA_NIVEL_TOPE` + CHECK `nivel BETWEEN 1 AND 5` (**este si es esquema**) |
| Caps de eje | 40; `poder` <= 160 | `LEAST` en lectura; sin migracion |
| Efecto de `fortuna` en tirada | `(1 + min(fortuna,20)/100)` a raro/epico/dorado | `CARTA_FORTUNA_TECHO`; sin migracion |
| Recompensa de expedicion | <= 40 XP, 5 por 24 h (200 XP/dia) | Constante del DAG; sin migracion |
| Gate de publicacion UGC | **Acciones reales**: `n_resenas_largas >= 3` o `media propia aprobada >= 1` (NO `oficio>=8` en v1) | Constante del handler; pasa a `oficio>=8` como condicion adicional en fase 4 |
| Limites UGC por autor | 3 pendientes / 10 aprobadas por 30 dias | Constante del handler; sin migracion |
| Royalty UGC | 10% del bruto al `emisor_id` + tithe <= 10%, **detraccion total <= 20%** (contrato fase 2) | Constante del handler; sin migracion |
| Serial sin numero visible en v1 | 4.4 | Tabla `cartas_serie` cuando el operador lo pida (migracion nueva) |

### 11.3. Lo unico que puede exigir una decision del operador (y por que NO es una pregunta abierta)

- **El conteo 31 se re-mide al aplicar 066.** Si el catalogo crecio, la constante del bloque (3) se actualiza con el conteo medido. No es una pregunta: es un fail-closed con instruccion.
- **`ct_comun_01..06` quedan `lugar/territorio`** (decision cerrada): no se inventa `natural`; un `UPDATE` de datos puede cambiarlo despues, sin migracion.
- **El paso 2 (`SET NOT NULL`) se agenda con el parche de `cartas_crear`**, no antes. No es una pregunta: es una dependencia declarada en 7.1 y en el ADR.

### 11.4. Veredicto de `@architect-review` (SOLICITA CAMBIOS): las 13 correcciones y su estado

| # | Severidad | Correccion | Estado | Donde quedo |
|---|---|---|---|---|
| 1 | ALTO | `familia`/`subtipo` **NULLABLE** en 066; `NOT NULL` = paso 2 tras parchear `api/admin.js:1438-1446` | **APLICADA** | 7.1 (paso 2 explicito), 8 V20, ADR D1 |
| 2 | ALTO | Off-by-one `left(id,13)` -> `char_length(<literal>)`; `'cta_ancestral_'` mide **14** | **APLICADA** | 7.1 bloque (2), con conteo esperado 24/3/4 |
| 3 | ALTO | `producto`/`consumible` **se pueden listar y vender**: el ADR no puede afirmarlo como hecho | **APLICADA** | 2.1 regla 3, 3.6 regla 4, 9.2 **D-15**, ADR D4 |
| 4 | ALTO | La venta P2P **no cobra tithe** (`:16334-16337`); royalty/tithe = contrato fase 2 sobre el CTE, <= 20%, con prueba de `neto >= 0` | **APLICADA** | 6.4, 9.2 **D-17**, ADR D9 |
| 5 | MEDIO | **Sumidero de acunacion** exacto (cargo + emision + ledger, fail-closed) | **APLICADA** | 4.8 (contrato fase 2) |
| 6 | MEDIO | **Nivel atomico**: cargo + incremento en la misma sentencia, `nivel < 5`, idempotente por `(usuario,carta,variante,nivel_esperado)` | **APLICADA** | 4.9 (contrato fase 2) |
| 7 | MEDIO | `emitidas` = **inventario + escrow** (`cantidad_restante`); backfill con `GREATEST`; V5 con la misma suma | **APLICADA** | 4.1, 4.5, 7.1 bloque (5), 8 V9 |
| 8 | MEDIO | Guarda del CHECK de stats por **`pg_get_constraintdef`** (con `IF NOT EXISTS` el CHECK de 060 nunca se sustituia) | **APLICADA** | 7.1 notas + 8 V18 |
| 9 | MEDIO | `rama` colisiona: la clave de expedicion pasa a **`expedicion_rama`** | **APLICADA** | 3.1, 5.2 (y ADR D8) |
| 10 | MEDIO | `oficio`/`rendimiento` **sin cartas**: v1 solo publica ramas de `alcance`/`fortuna`; `obra`/`economia` esperan fase 4 | **APLICADA** | 3.1 nota de disponibilidad, 5.2, **D-14** |
| 11 | MEDIO | **`stats_json.sku`** como vinculo carta<->SKU, con CHECK en `producto` y verificacion en `consumible` | **APLICADA** | 2.1 regla 7, 7.1 `chk_cartas_catalogo_sku`, 8 V19 |
| 12 | MEDIO | **No hay contradiccion con ADR-120**: `rendimiento` es bono nuevo solo de expedicion, capado y 24 h; el bono global de consumibles **sigue vivo** | **APLICADA** | 4.7, 4.1, 3.6, ADR D10 |
| 13 | D-12 | Deuda **documental** (ADR-117 nombra la vista y no tiene DDL), no de runtime; **no bloquea 066** | **APLICADA** | 9.2 D-12 |

**Decisiones nuevas cerradas por esta correccion (no se preguntan):**

1. **Expedicion con misiones REPETIBLES**, cap **5/24 h** y **200 XP/dia** medido en `xp_ledger`: el faucet no es infinito porque el **cap es diario**, no porque la mision sea unica (5.2).
2. **`ct_comun_01..06` = `lugar/territorio`**; no se inventa `natural` (2.2 y 11.3).
3. **Royalty UGC 10% + tithe <= 10% con detraccion total <= 20%**, contrato de fase 2 (6.4).

**Ninguna bloqueante. La tanda puede implementarse tal cual.**

### 11.5. Enmienda 2 (auditoria `@sql-security`, 2026-11-11: 0 ALTOS, 4 MEDIOS)

**Contexto medido (ADR-006):** la **066 y la 067 ya estan aplicadas**. La 066 aplicada creo `precio_xp integer` (`066:129`) y su fail-closed es **0 NULL + reporte** (`066:194-210`); la 067 aplicada **no** crea `licencia` (`067:26-28`). **No se editan** las migraciones aplicadas (deriva de checksum): las correcciones van en la **068 aditiva**.

| # | Severidad | Hallazgo | Enmienda | Estado |
|---|---|---|---|---|
| MEDIO-1 | MEDIO | El contrato 7.1 decia "aborta si `count(*) <> 31`"; lo aplicado aborta solo con `familia IS NULL` y **reporta** el reparto | 7.1 reescrito: **fail-closed = 0 NULL + tripwire de ejes**; conteo y 24/3/4 se **REPORTAN** | **APLICADA** (texto) |
| MEDIO-2 | MEDIO | `precio_xp integer` redondearia multiplicadores 0,5/1,2/1,5 en el handler | `numeric(12,2)` (ADR-035) via **068**; 4.1, 4.2, 7.1 y ADR D5 | **APLICADA** (texto) + 068 contratada |
| MEDIO-4 | MEDIO | Una obra se puede aprobar sin derechos aceptados | `licencia` + `licencia_aceptada_en` + CHECK fail-closed via **068**; 6.2, 7.2 y ADR D9 | **APLICADA** (texto) + 068 contratada |

#### 11.5.1. Contrato exacto de `db/migrations/068_cartas_enmienda_licencia_precio.sql`

```sql
-- 068: precio_xp numeric(12,2) + licencia de obra. ADITIVA. No edita 066/067.
-- Referencias: ADR-121 (enmienda 2), ADR-035, ADR-002, ADR-003, ADR-006, ADR-008.
-- Requiere: 046 (xp_gastado_sinks), 060, 061, 065, 066 (precio_xp), 067 (cartas_media).
-- QUE NO HACE: cero DROP COLUMN, cero DELETE, cero UPDATE de datos,
--   cero toque a usuarios_cartas, cero insercion en schema_migrations.

-- (0) PRECONDICION (aborta antes de escribir)
DO $m068pre$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='cartas_catalogo'
                    AND column_name='precio_xp') THEN
    RAISE EXCEPTION 'MIG068: falta 066 (cartas_catalogo.precio_xp)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='public' AND table_name='cartas_media') THEN
    RAISE EXCEPTION 'MIG068: falta 067 (cartas_media)';
  END IF;
END $m068pre$;

-- (1) TIPO: integer -> numeric(12,2), guardado por el tipo REAL
DO $m068tipo$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='cartas_catalogo'
                AND column_name='precio_xp' AND data_type='integer') THEN
    ALTER TABLE cartas_catalogo
      ALTER COLUMN precio_xp TYPE numeric(12,2) USING precio_xp::numeric(12,2);
    RAISE NOTICE 'MIG068: precio_xp convertido a numeric(12,2)';
  END IF;
END $m068tipo$;

-- (2) LICENCIA (nullable: una obra 'pendiente' puede no tenerla todavia)
ALTER TABLE cartas_media ADD COLUMN IF NOT EXISTS licencia text;
ALTER TABLE cartas_media ADD COLUMN IF NOT EXISTS licencia_aceptada_en timestamptz;

-- (3) CHECK fail-closed, guarda por nombre en pg_constraint
DO $m068chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname='chk_cartas_media_licencia'
                    AND conrelid='public.cartas_media'::regclass) THEN
    ALTER TABLE cartas_media
      ADD CONSTRAINT chk_cartas_media_licencia CHECK (
        estado_moderacion <> 'aprobada'
        OR (licencia IS NOT NULL AND btrim(licencia) <> ''));
    RAISE NOTICE 'MIG068: chk_cartas_media_licencia creada';
  END IF;
END $m068chk$;
```

- **Idempotencia:** (0) solo lee; (1) la guarda es `data_type='integer'` (segunda corrida ve `numeric` -> no-op); (2) `IF NOT EXISTS`; (3) guarda por `pg_constraint`. **Segunda corrida = 0 cambios de dato y 0 DDL.**
- **Fail-closed sin inventar derechos:** si existiera una obra `'aprobada'` sin `licencia`, el `ADD CONSTRAINT` **aborta con 23514** y la migracion queda fallida. **Prohibido** rellenar `licencia='desconocida'` para pasar: seria fabricar un derecho (ADR-003). Hoy `cartas_media` tiene 0 filas, asi que nace en verde.
- **Rollback (documentado, NO ejecutado):** `ALTER TABLE cartas_catalogo ALTER COLUMN precio_xp TYPE integer USING round(precio_xp)` es **DESTRUCTIVO** (pierde centavos); `DROP CONSTRAINT chk_cartas_media_licencia`, `DROP COLUMN licencia*,` solo si 0 filas con dato. Requiere aprobacion del operador.

#### 11.5.2. Verificacion post-068 (se anade a la matriz de la seccion 8 como V21-V24)

| # | Consulta | PASS |
|---|---|---|
| V21 | `SELECT data_type, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_schema='public' AND table_name='cartas_catalogo' AND column_name='precio_xp';` | `numeric / 12 / 2` |
| V22 | `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='cartas_media' AND column_name IN ('licencia','licencia_aceptada_en') ORDER BY 1;` | **2 filas** (`text`/`timestamptz`, ambas `YES`) |
| V23 | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='chk_cartas_media_licencia';` + autotest `UPDATE cartas_media SET estado_moderacion='aprobada'` sin licencia | definicion contiene `aprobada` y `licencia`; el UPDATE devuelve **23514** |
| V24 | `SELECT count(*) FROM cartas_catalogo;` y `md5(string_agg(id||'|'||familia||'|'||subtipo||'|'||emitidas::text||'|'||COALESCE(precio_xp::text,'-'), ',' ORDER BY id)) FROM cartas_catalogo;` antes y despues de la 2a corrida | **31 filas intactas** y **md5 identico** = 0 cambios de dato |

**Ninguna bloqueante. La 068 puede implementarse tal como queda contratada.**

### 11.6. Enmienda 3 (fase 2 implementada y desplegada, 2026-11-11)

**Estado medido:** **069** y **070 APLICADAS** en Neon con **1 fila** de ledger cada una. Codigo desplegado en **`e9be424`** (`origin/main`) y verificado en produccion: `cartas-ui.js` sirve `fichaPoderNivel` y `admin.html` sirve `cartas-media-lista`. **El `?v=4`** de `comunidad.html`/`mi-perfil.html`/`perfil.html` y el boton **ACUNAR** estan en el **arbol de trabajo**, **no** en `origin`.

| Contrato | Estado | Evidencia / contrato final |
|---|---|---|
| 7.1 `familia`/`subtipo` NOT NULL | **APLICADA** (069) | **0 NULL**, **31/31** clasificadas; 2a corrida **no-op**; 6.396 B |
| Seed de precio/supply `lugar` | **APLICADA** (070) | **24** `edicion='limitada'`; tirada/precio por rareza real: **9** x 150/5000, **7** x 400/1000, **5** x 1000/250, **3** x 2500/50; **24/24 comprables**; 15.460 B |
| `producto`/`consumible` sin precio | **VIGENTE** | **7** filas con `precio_xp` **NULL** por el CHECK de 066 (se pagan por SKU) |
| Reclasificacion `ct_comun_01..06` | **APLICADA** | `subtipo='natural'`, `familia='lugar'` (decision del operador, 2026-11-11) |
| Idempotencia 070 | **PASS** | md5 del dato tras 2a corrida: `a3bc72bfb611ef9b9741b0f1bf42c580` (**0 cambios**) |
| Admin (familia/subtipo + economia) | **DESPLEGADO** | `FAMILIA_REQUERIDA`, `FAMILIA_INVALIDA`, `SUBTIPO_REQUERIDO`, `SUBTIPO_INVALIDO`, `SUPPLY_REQUERIDO`, `SUPPLY_INCOHERENTE`, `PRECIO_INCOHERENTE`, `SKU_REQUERIDO`, `CARTA_CON_OFERTAS`; `stats_json` con MERGE; `emitidas` nunca del body |
| 4.8 Sumidero de acunacion | **DESPLEGADO** | `carta_acunar` (la vieja `carta_comprar` era P2P y sigue siendo el mercado), asiento en el CTE; `SIN_STOCK`, `PUNTOS_INSUFICIENTES`, `CARTA_NO_COMPRABLE`, `CARTA_NO_ENCONTRADA`, `VARIANTE_INVALIDA` |
| 4.9 Subida de nivel | **DESPLEGADO** | `carta_subir_nivel` con `CARTA_NIVEL_XP=[150,400,900,1800]`, tope **5**, `vincular/crear` de `usuarios_cartas_nivel`; `NIVEL_DESACTUALIZADO`, `NIVEL_MAX` |
| D-15 comerciabilidad | **CERRADA** | `CARTA_NO_COMERCIABLE` en `carta_publicar` y `carta_comprar`; libro publico excluye `producto`/`consumible` y exige `c.activo=true`; **BUG-155 cerrado** |
| D-17 royalty + tithe | **CERRADA** | royalty **10% solo UGC**; tithe `LEAST(tithe_pct,10)%`; detraccion total **<= 20%**; `neto = bruto - royalty - tithe >= 0`; asientos `carta_royalty`/`carta_tithe`; `carta_tithe` atribuido al vendedor con `contexto.pandilla_id`; **409 `OFERTA_NO_DISPONIBLE`** si la carta esta inactiva |
| 6.2/6.3 Media UGC | **DESPLEGADO** | `carta_media_subir` cuesta **50 XP** con asiento `carta_media_envio` en el CTE y fail-closed; `cartas_media_mias`; **3 pendientes / 10 aprobadas-30d**; gate de **3 resenas con `xp_ganado>=25`**; transiciones `pendiente->aprobada|rechazada`, `aprobada->retirada`, `rechazada->pendiente`; `MOTIVO_REQUERIDO`; `LICENCIA_REQUERIDA` traducido desde 23514; **409 `MEDIA_NO_APROBADA`** en `carta_acunar`; `cartas_crear/editar` validan `media_id` aprobado y `emisor_id==autor_id` en UGC; **sin idempotencia por diseno** (2 envios = 2 obras y 2 cargos); `moderado_por` NULL (panel con `ADMIN_SECRET`, sin uuid) |
| UI y verificacion | **PASS** | `smoke_cartas_ui.js` **63/63**; `smoke_cartas_economia.js` **43/43**; `smoke_cartas_db_tx.js` **40/40**; divs admin **1405/1405**; `npm test` **exit 0** |

**Defecto documental conocido (no de dato):** el comentario `md5 POST` del header de la 070 (`f2ae6007...`) es una prediccion **FALSA**; el md5 real es `a3bc72bf...`. El operador acepta el comentario como obsoleto y **no autoriza cirugia del ledger** (su `sha256` coincide con el disco; editarlo crearia deriva permanente).

**Deudas vivas:** (a) C7 opcional del `smoke_cartas_db_tx` (**23502**, subiria a **41**); (b) politica de retirada de obra `aprobada` con cartas ya emitidas; (c) `moderado_por` sin identidad de admin; (d) md5 obsoleto del header 070; (e) assets UGC son URL/texto, sin storage ni subida binaria; (f) **0 cartas** de `personaje`/`artista`/`marca`/`cosmetica`, luego las ramas de expedicion de `oficio`/`rendimiento` siguen sin cartas que las alimenten (**D-14**). **Fuera de este release:** `expedicion_rama` + misiones repetibles (5.2) siguen como contrato pendiente; no se declaran implementadas.

### 11.7. Enmienda 4 (familias de juego y precio por familia)

**Estado medido (2026-11-11):** **071** y **072 APLICADAS** en Neon, **1 fila de ledger** cada una y **segunda corrida = 0 cambios**. El argumento vive en `DECISIONS.md` **ADR-121 Enmienda 4** (ADR-084 D1); aqui solo el **contrato efectivo** y la **tabla de precios**.

**Catalogo tras 071: 45 cartas.**

| Familia | Cartas | N | Comprables |
|---|---|---|---|
| `lugar` | `ct_*` (24) | 24 | 24 |
| `consumible` | `ce_evento_*` | 3 | 0 (SKU) |
| `producto` | `cta_ancestral_*` | 4 | 0 (SKU) |
| `personaje` | `cp_*` | **8** | **8** |
| `marca` | `cm_*` | **6** | **6** |
| **Total** | | **45** | **38** (24+8+6) |

Rarezas de las **14** nuevas: **5 comun, 4 raro, 3 epico, 2 dorado**, con **dorado en AMBAS familias**. `stats_json` lleva **solo los 4 ejes** (`alcance`, `oficio`, `fortuna`, `rendimiento`): **sin** `presencia`, **sin** `sku`, **sin** `bonus_xp_pct`. La migracion lleva **16 guardas `RAISE`**.

**Precio de acunacion efectivo (072): base por rareza x multiplicador de familia.**

La formula tiene **autoridad unica** en `lib/cartas-config.js`: `CARTA_PRECIO_BASE_XP`, `CARTA_MULT_FAMILIA` y `precioAcunacion()`. No se duplica en SQL ni en el handler de servicio.

| Familia | Mult. | comun | raro | epico | dorado |
|---|---|---|---|---|---|
| `lugar` | x1.0 | 150 | 400 | 1000 | 2500 |
| `personaje` | x1.2 | **180** | **480** | **1200** | **3000** |
| `marca` | x1.5 | **225** | **600** | **1500** | **3750** |
| `producto` / `consumible` | n/a | NULL | NULL | NULL | NULL (se pagan por SKU) |

**Regla de aplicacion:** `api/admin.js` calcula con `precioAcunacion()` **solo al crear** una carta acunable **sin `precio_xp` explicito**. **`carta_acunar` NO cambia**: sigue leyendo `precio_xp` de la base, que **es la autoridad del cobro**. Una edicion que deje `precio_xp` vacio **no recalcula** (**D-24**).

**Codigos nuevos del contrato de moderacion y de estado (`api/admin.js` + `admin.html`).**

| Codigo | Cuando | Efecto |
|---|---|---|
| `MEDIA_CON_CARTAS` | Retirar o rechazar una obra `aprobada` con cartas activas (`cartas_catalogo.media_id` y `activo=true`) | **409** con **`cartas_n`**, **dentro de transaccion** con `SELECT ... FOR UPDATE` (**sin carrera**) y **sin tocar el estado**. Salida: desactivar o desvincular las cartas |
| `MEDIA_AUTOR_INCOHERENTE` | El `emisor_id` no coincide con el `autor_id` de la obra UGC | Rechazo de la operacion (coherencia ya exigida a `cartas_crear`/`cartas_editar`) |
| `MODERADO_POR_INVALIDO` | El `moderado_por` recibido no es un uuid valido o no existe en `usuarios.id` | Rechazo del valor; la identidad valida es **`process.env.ADMIN_USER_ID`** |
| `ESTADO_INVALIDO` | Transicion de estado no permitida por la maquina (`pendiente->aprobada|rechazada`, `aprobada->retirada`, `rechazada->pendiente`) | Rechazo sin escritura |

**Identidad real de moderacion:** `process.env.ADMIN_USER_ID` (uuid validado + `EXISTS usuarios.id`). Si **falta o no existe**, `moderado_por` queda **NULL** y la moderacion **NO falla**; la respuesta trae **`identidad_admin:true|false`** y **`moderado_por_nombre`**. El panel pinta **aviso persistente** cuando `identidad_admin=false`, columna **"Moderada por"**, y el **409** con **N** y boton **"Ver cartas"** que filtra el Catalogo por `media_id`. **Precedencia pendiente (D-25):** hoy `body.moderado_por` puede pisar `ADMIN_USER_ID`.

**Deudas de esta enmienda.** **D-20** md5 obsoleto del header 070 (sin cirugia de ledger). **D-21** spec 2.1 vs `chk_cartas_catalogo_fusionable` (manda el esquema; la linea de 2.1 queda corregida en 2.1 y en **11.8**). **D-22** `historico` con **0 cartas** (sin persona historica nombrada; no se invento IP; criterio de entrada y secuencia en **11.8**). **D-23** arte provisional: las 8 `personaje` reutilizan 4 laminas de herramienta y las 6 `marca` usan `marca_ancestral.png`; `cartas-arte.js` **no se amplio** (9 claves fijadas por 2 checks del smoke; `imagen_url` gana en `arteDe()`). **D-24** precio al editar. **D-25** precedencia de `moderado_por`. **`expedicion_rama`** (`obra`/`economia`) **sigue sin implementar**: ahora hay cartas de `oficio`/`rendimiento` que podrian alimentarla, pero el contrato de 5.2 **no se declara implementado**. **`artista` no se siembra** (solo nace de UGC aprobado) y **la tienda esta diferida** hasta que exista canal de adquisicion (**secuencia y condicion revisadas en 11.8**); **no** se afirma que exista.

**Verificacion (medida):** economia **49/49** (**E14-E19** nuevos, **0 persistencia**), `smoke_cartas_db_tx.js` **41/41** con **C7** (`23502` en `familia` con la lista vieja), constantes **66/66**, **`npm test` exit 0**, divs de `admin.html` **1408/1408**. **No se editaron** las migraciones 066-072, ni `api/` mas alla de lo descrito, ni `db/`, ni `admin.html`, ni `cartas-ui.*`, ni `cartas-arte.js`.

### 11.8. Enmienda 5 (contrato v3.5)

**Estado:** decisiones del operador del 2026-11-11, ya cerradas. **Corrigen contrato, no implementacion.** Nada de esta seccion crea endpoints, migraciones ni cartas: el catalogo sigue en **45 cartas**, **38 comprables** y **5 familias con contenido** (`lugar` 24, `consumible` 3, `producto` 4, `personaje` 8, `marca` 6).

| ID | Decision (operador) | Contrato efectivo | Donde vive |
|---|---|---|---|
| **D-21** | **SI**: manda el esquema | `personaje` y `marca` **NO son fusionables en v1** mientras lleven `nivel_gate`; la fusion exige `nivel_gate IS NULL` y eso lo impone `chk_cartas_catalogo_fusionable`, luego las **14** cartas sembradas (8 `personaje` + 6 `marca`, gates 10/14/20/25) quedan `fusionable=false`. La fusion de `personaje` es **extension** (relajar el CHECK o quitar el gate), **no prometida** | **2.1** (nota "Fusion en v1") |
| **D-22** | **Tomar la mejor decision = inactivo** | `historico` (subtipo de `personaje`) queda **declarado y con 0 cartas**: **no se inventan personas historicas reales ni IP nueva**. Criterio de entrada unico: **nombre canonico ya presente en el repo** (ficha o destino); sin el, no hay carta. Impacto economico mientras no exista: **cero** (0 cartas que acunar o comprar; la tabla de precios de 11.7 es por familia, no por subtipo) | **2.1** (`historico` vacio) + esta fila |
| **Secuencia** | **Tienda/catalogo primero; expedicion despues** | **Tienda primero:** hoy solo se **acuna una carta ya poseida**; no hay **canal de adquisicion** y **38 cartas tienen precio sin comprador**. La tienda es el sumidero que convierte `precio_xp` en gasto real. **Expedicion despues:** es **faucet**, no sumidero: exige **cap diario** y **ledger** antes de existir. Esta fila **reemplaza** la clausula de 11.7 que diferia la tienda por stock: el stock ya existe (3 familias de juego con cartas), lo que falta es el canal | 11.7 (el resto se mantiene) + esta fila |

**Consecuencia para las stats: el vector sigue siendo display-only.** Los 4 ejes (`alcance`, `oficio`, `fortuna`, `rendimiento`) y el poder derivado del usuario **no tienen consumidor de juego** hasta que exista **expedicion**: hoy se pintan y se comparan, no se resuelven partidas con ellos. **Ninguna** parte de esta enmienda convierte el vector en mecanica ni adelanta `expedicion_rama` (**5.2** sigue como contrato pendiente).

**Lo que NO cambia:** las 45 cartas y sus `stats_json` (solo los 4 ejes), la tabla de precios de 11.7 (`precioAcunacion()` como autoridad unica), `chk_cartas_catalogo_fusionable` ni `carta_acunar` (sigue leyendo `precio_xp` de la base). **D-15** (una carta de `producto`/`consumible` se puede listar por XP) **se mantiene abierta**, y es justo el predicado que la tienda necesitara.

**Verificacion de esta enmienda (documental):** `personaje` y `marca` aparecen como **Fusionable = No** en 2.1; `historico` con **0 cartas**; **0 bytes > 127** en el archivo; seccion 11.8 presente al final.

---

### 11.9. Contrato de expedicion v1

**Estado:** cierra el contrato de **5.2 (483-498)**. **No crea endpoint** (presupuesto 8/8: `api/` tiene exactamente 8 archivos), **no toca `exploraco desarrollo/*.md`** (R2) y **no habilita `obra` ni `economia`**. Es fase 2: duenno `@backend-dev` (gate SI) y, solo para 11.9.9, `@sql-security` (gate SI).

**Cifras cerradas (no se reabren):** 5 expediciones por ventana de 24 h, 200 XP por ventana de 24 h, **<= 40 XP por cobro**, 6 misiones v1, solo ramas `difusion` (alcance) y `hallazgo` (fortuna). Todo lo que sigue las usa como dadas; ninguna regla las recalcula.

**Tres correcciones a 5.2, verificadas contra el archivo real** (ADR-006: el archivo manda):

| # | 5.2 dice | El archivo real dice | Contrato en 11.9 |
|---|---|---|---|
| C1 | 487: "se implementa extendiendo `MISIONES`" | `evaluarMisiones` paga todo lo que este en `MISIONES` con `accion='mision'`, exenta y sin cap (`5999-6070`) | **Las expediciones NO viven en `MISIONES`** (11.9.7). Se comparte el catalogo como fuente de ids, no el evaluador |
| C2 | 495: "indice existente sobre `xp_ledger (usuario_id, accion, creado_en)`" | Hay **dos** indices separados: `(usuario_id, creado_en DESC)` y `(accion, creado_en DESC)` (`031:296-302`) | No se crea indice nuevo: el predicado usa la columna guia `usuario_id` + rango de `creado_en` |
| C3 | 496: "`carta_expedicion`, **anadida** a `BONO_EXCLUIDAS`" | `carta_expedicion` **NO existe** en `BONO_EXCLUIDAS` (`5097-5117`) | Es una **edicion obligatoria**, no un no-op (11.9.6) |

#### 11.9.1 Superficie: dos tipos nuevos en la funcion existente

Cero endpoints nuevos. Ambos tipos se despachan dentro de `api/interacciones.js`, que ya esta desplegada:

| Metodo | Tipo | Dispatch real (archivo:linea) |
|---|---|---|
| GET | `?tipo=expediciones&usuario_id=<uuid>` | patron `tipo === 'misiones'` en `api/interacciones.js:7804` |
| POST | `?tipo=expedicion_cobrar` (o `body.tipo`) | `var tipo2 = body.tipo || req.query.tipo` en `api/interacciones.js:11595`; patron de rama en `:15614` |

#### 11.9.2 Vector del usuario: formula literal (confirma 3.5 con 3 precisiones)

3.5 (231-240) dice `LEAST(40, SUM de puntos_carta[eje])`. El termino `puntos_carta` **no esta definido alli**; se resuelve juntando 3.2 (153-179), 3.4 (200-213) y `lib/cartas-config.js` (autoridad ya escrita). Formula ejecutable, sin ambiguedad:

```
s           = statsNormalizados(stats_json)                        // lib/cartas-config.js:250-272
base        = s.alcance + s.oficio + s.fortuna + s.rendimiento     // pesos 1, presencia 0: :238-240
bono_var    = (variante === 'shiny') ? max(1, floor(base * 0.25)) : 0   // :241-242, :289-291
bono_nivel  = max(0, min(5, nivel) - 1) * 1                        // :243, :293-296
puntos[eje] = s[eje] + ((eje === s.primario) ? bono_var + bono_nivel : 0)   // :285-297
vector[eje] = min(40, SUM sobre cartas distintas de (MAX sobre variantes de puntos[eje]))   // 3.6:246
poder       = vector.alcance + vector.oficio + vector.fortuna + vector.rendimiento        // 3.5:235
```

Precisiones (las 3 que la spec no dice literal y el implementador necesita):

1. **Shiny y nivel bonifican el eje primario de la CARTA**, y la base del shiny es la suma de los **4 ejes jugables** (presencia pesa 0), no el primario. Es exactamente `poderCarta()` (`lib/cartas-config.js:278-298`), que sigue siendo la autoridad de `poder`.
2. **MAX por variante es por eje** y equivale a elegir la variante shiny cuando existe: la unica diferencia entre variantes es un bono **no negativo** en el primario (3.2:164), luego el max componente a componente no puede mezclar ejes.
3. **`LEAST(40)` se aplica a la SUMA, no a la carta:** una dorada shiny nivel 5 llega a 34 (3.4:212) y dos cartas superan 40.

Fuentes (verificadas, archivo:linea):

| Dato | Fuente real |
|---|---|
| Posesion valida | `usuarios_cartas` PK `(usuario_id, carta_id, variante)` (`061:175-178`); `cantidad >= 1` y `activo = true` (`040:155-163`; ambos en el CHECK de `060:214-217`) |
| Catalogo | `cartas_catalogo.stats_json` (`060:255`); `cartas_catalogo.activo = true` (filtro real en `api/interacciones.js:17408`, `:17433`) |
| Nivel por carta | `usuarios_cartas_nivel` PK `(usuario_id, carta_id)`, `nivel` 1..5 (`066:406-414`, CHECK `:421-423`), indice `:436-437` |
| Constantes | `CARTA_EJES_STATS` y `CARTA_STATS_TOPE = 40` (`lib/cartas-config.js:120-121`); shiny y nivel (`:241-243`); todas exportadas (`:300-336`) |

Lectura exacta (una sola consulta, reduccion en JS):

```sql
SELECT uc.carta_id, uc.variante, c.stats_json, COALESCE(n.nivel, 1)::int AS nivel
  FROM usuarios_cartas uc
  JOIN cartas_catalogo c ON c.id = uc.carta_id
  LEFT JOIN usuarios_cartas_nivel n
         ON n.usuario_id = uc.usuario_id AND n.carta_id = uc.carta_id
 WHERE uc.usuario_id = $1::uuid
   AND uc.activo = true
   AND uc.cantidad >= 1
   AND c.activo = true;
```

Reglas duras:

- **No se persiste.** Cero columna, cero cache, cero tabla (3.5:239; 3.6:246).
- **Ausente = 0.** Eje fuera de `stats_json`, `stats_json` nulo o basura -> 0, nunca NaN (`statsNormalizados`, `:250-272`).
- **Nivel ausente = 1.** Sin fila no hay bono (`LEFT JOIN` + `COALESCE`).
- **Cero constantes duplicadas en SQL.** `floor(base * 0.25)` en SQL seria una segunda autoridad del shiny: se reduce en JS con las constantes exportadas.
- **Invariante:** `poder == SUM(poderCarta(stats, nivel, variante) de la mejor variante por carta)`. Con el `LEAST`, `poder` es la suma de los 4 ejes ya capados y por tanto **<= 160**.

#### 11.9.3 `rendimiento` en v1: existe, se muestra, NO bonifica

**Decision: no se aplica.** No hay formula, no hay tope, no hay consumidor nuevo.

- 3.1:146 ya lo declara "sin consumidor en v1" y 11.8:1329 declara el vector **display-only** hasta que exista expedicion.
- Un bono de `rendimiento` sobre el XP de expedicion seria una **segunda autoridad** de pago y exigiria su propio tope para no romper `<= 40 XP/cobro`. Superficie nueva, riesgo nuevo, valor cero hoy.
- `rendimiento` sigue entrando en `poder` (3.5:235) y se muestra. `oficio` igual. Ninguno habilita mision en v1.
- Regla derivada: `requiere_stats` **no puede contener** `oficio` ni `rendimiento` en v1. Si una rama futura los necesita, es ADR + cap propio, no un parametro.

#### 11.9.4 Catalogo v1 (6 misiones)

Ids con prefijo `xpd_` para no colisionar con `rama: 'exp_*'` (`api/interacciones.js:4000`). `requiere_stats` son enteros, comparados con `>=`. `acciones_por_cobro` = N (11.9.5).

| id | `expedicion_rama` | nombre | descripcion (ASCII) | `requiere_stats` | `xp` | N |
|---|---|---|---|---|---|---|
| `xpd_dif_comparte` | `difusion` | Difunde un destino | Comparte un destino publicado con un canal valido. | `{alcance: 0}` | 15 | 1 |
| `xpd_dif_mapa` | `difusion` | Mapa que crece | Guarda 3 destinos mas en Tu Mapa. | `{alcance: 8}` | 25 | 3 |
| `xpd_dif_resena` | `difusion` | Voz que se lee | Publica 2 resenas sustanciales (25 XP de calidad o mas). | `{alcance: 20}` | 40 | 2 |
| `xpd_for_visita` | `hallazgo` | Primera incursion | Confirma una visita en un destino. | `{fortuna: 0}` | 15 | 1 |
| `xpd_for_album` | `hallazgo` | Hallazgo guardado | Guarda 2 fotos en tus albumes. | `{fortuna: 8}` | 25 | 2 |
| `xpd_for_gate` | `hallazgo` | Sobre abierto | Cobra un drop de gate (nivel 10, 14, 20 o 25). | `{fortuna: 20}` | 40 | 1 |

**Aritmetica del catalogo (verificable, no opinable):**

- **Una pasada completa = 160 XP** (15+25+40+15+25+40) **<= 200**. Nunca puede superar el cap diario por si sola.
- **Las 5 mejores de una pasada = 145 XP**, tambien por debajo de 200. El cap de 200 **solo** se alcanza repitiendo misiones (5 x 40), que es justo lo que el cap 5/24 h existe para acotar.
- **Ningun `xp` supera 40.** `min(xp) = 15` es el `EXPEDICION_XP_MIN_COBRO` del remanente (11.9.6) y se **deriva** del catalogo, no se escribe a mano.
- **Acciones reales de una pasada completa = 10** (1+3+2+1+2+1). Una pasada no se compra con clics: exige 10 acciones distintas y vigentes.

**Justificacion de umbrales 0 / 8 / 20** (20% y 50% del cap de 40, simetricos en las dos ramas para que ninguna sea mas barata):

- `0`: entrada sin cartas; la mision ensena el bucle.
- `8`: 20% del cap. Alcanzable con 3 `lugar` comunes (alcance 3 cada una = 9) o 3 raras (fortuna 3 cada una = 9).
- `20`: 50% del cap. Exige coleccionar de verdad (7 comunes, 4 epicas o 2 doradas de `lugar`).
- El cap 40 deja sitio a un cuarto tramo futuro (30) sin tocar el vector.

**Accion real que valida cada mision** (solo senales que existen; `$2` = offset de 11.9.5):

| id | `total` (COUNT) y `accion_ref` (OFFSET $2 LIMIT 1) | Evidencia |
|---|---|---|
| `xpd_dif_comparte` | `FROM media_compartidos WHERE usuario_id=$1 AND fuente='destino'`; ref `id::text`; `ORDER BY creado_en, id` | tabla `022:42-52`; escritura `15614-15645` |
| `xpd_dif_mapa` | `FROM interacciones WHERE usuario_id=$1 AND tipo='guardado' AND activo=true`; ref `id::text`; `ORDER BY creado_en, id` | `4029` (predicado identico); reactivacion sin XP `20139-20156` |
| `xpd_dif_resena` | `FROM interacciones WHERE usuario_id=$1 AND tipo='resena' AND activo=true AND xp_ganado>=25`; ref `id::text`; `ORDER BY creado_en, id` | `4008-4011`; unicidad `012:88-90` |
| `xpd_for_visita` | `FROM interacciones WHERE usuario_id=$1 AND tipo='visita' AND activo=true`; ref `id::text`; `ORDER BY creado_en, id` | `6009`; geocerca `20307-20325`; insercion y 23505 `20406-20413` |
| `xpd_for_album` | `FROM album_fotos WHERE agregador_id=$1 AND activo=true`; ref `id::text`; `ORDER BY creado_en, id` | tabla `009:46-58`; XP `13674` |
| `xpd_for_gate` | `FROM cartas_gates WHERE usuario_id=$1 AND drop_en IS NOT NULL`; ref `nivel_gate::text`; `ORDER BY drop_en, nivel_gate` | tabla `040:168-176`; columna `060:384-385`; cobro `17420-17443` |

**Anti-farm por construccion (no por promesa):** el conteo es sobre acciones **vigentes**, y las senales no se pueden inflar por toggling:

- `visita`: el indice unico **no incluye `activo`** (`014:234-236`); quitar y re-visitar la misma fila viola 23505 y devuelve `ya_visitado` (`20406-20413`). Una visita por destino, **de por vida**.
- `resena`: indice unico por `(usuario_id, destino_id)` para `resena`/`rating` (`012:88-90`). Una resena por destino.
- `guardado`: quitar y volver a guardar **reactiva la fila original sin XP** (`20147-20156`); el total activo no sube.
- `gate`: una fila por nivel y usuario (`040:168-176`, PK); maximo **4 cobros de por vida**.

Consecuencia declarada: en v1 el techo **alcanzable** en 24 h es menor que 200 para casi todos los usuarios (la oferta de acciones reales manda). El cap de 200 sigue siendo el limite **duro** y se verifica igual (A5).

#### 11.9.5 Consumo de accion: doble clic y "accion vieja" (decision de 5)

**Decision: ni cap solo, ni `run_id` del cliente. Cada cobro CONSUME una accion real distinta.** El idempotente es la accion, derivado por el servidor.

Mecanica:

1. Cada mision declara `acciones_por_cobro` N en `{1,2,3}`.
2. `total` = acciones vigentes que cumplen el predicado de 11.9.4.
3. `cobros` = filas del ledger de esa mision, **de por vida**: `accion='carta_expedicion' AND contexto->>'mision_id' = $m` (no ventana de 24 h: el consumo es historico).
4. `elegibles = floor(total / N)`. Hay cobro **solo si** `elegibles > cobros`.
5. `accion_ref` = accion en el offset 0-based `cobros * N + N - 1` (la ultima del bloque recien completado), con `ORDER BY` estable y unico.
6. Una fila por `(usuario_id, mision_id, accion_ref)`: indice unico parcial (11.9.9).
7. Si el offset no devuelve fila, o el `INSERT` choca: **200** con `{ok:true, xp:0, repetido:true}`. No se escribe ledger, no se consume cupo.

**Por que esto y no las dos opciones de 5:**

- **"Basta el cap" no basta.** Con un `EXISTS` ingenuo, UNA comparticion de hace un mes mantiene la mision "cumplida" para siempre: el cliente puede cobrar 5 veces/dia sin volver a hacer nada. Eso es el faucet que 5.2:491 prohibe ("si la accion no ocurrio, la mision no esta cumplida"): con `EXISTS` la accion ocurrio **una vez** y la mision queda cumplida **siempre**.
- **`run_id` solo protege el reintento, no la accion vieja.** El cliente podria rotar `run_id` y cobrar igual. Ademas obliga a confiar en una clave del cliente.
- **Consumo server-side cubre las dos cosas con el mismo coste:** el reintento recalcula el offset desde `cobros` (ya incrementado) y no encuentra accion nueva -> `xp: 0`; la accion vieja no se puede re-cobrar porque `cobros` ya la contabilizo. **No hay `run_id` en v1.**
- **Sin carrera relevante:** dos POST concurrentes leen el mismo `cobros` y calculan el **mismo** `accion_ref`; el indice unico deja pasar uno y el otro devuelve `xp: 0`. No se pierde cupo ni se paga dos veces.
- **Falla cerrado:** si una accion consumida deja de estar vigente (p.ej. revision moderada), `total` baja y `elegibles` puede quedar por debajo de `cobros`: el siguiente cobro se rechaza hasta que haya acciones nuevas. Nunca se paga de mas.

Regla de lectura: `elegibles` y `cobros` se **calculan**, no se guardan. Cero tabla de progreso de expedicion (coherente con 0.2 y 5.2:498).

#### 11.9.6 Cobro: orden de validacion, caps y remanente

**Ventana: 24 h RODANTES, no dia calendario**, para los dos caps. Es el patron ya vigente: `compartir` (50 XP en ventana rodante, `15690`) y `visitas` (`20356`). Formula unica:

```
usadas    = COUNT(*)            FROM xp_ledger WHERE usuario_id=$1 AND accion='carta_expedicion' AND creado_en > NOW() - INTERVAL '24 hours'
xp_dia    = COALESCE(SUM(xp_final),0)  mismo predicado
remanente = EXPEDICION_XP_DIA - xp_dia          -- EXPEDICION_XP_DIA = 200
```

**Orden de validacion (determinista, barato primero).** El primer fallo devuelve y **no escribe nada**:

| # | Condicion | Respuesta |
|---|---|---|
| 1 | sesion invalida (`validarSesion`, `15617-15618`) | **401** `{ok:false, error:<razon>, code:'SESION_REQUERIDA'}` |
| 2 | `mision_id` ausente de `EXPEDICIONES` (o rama no publicada) | **404** `{ok:false, code:'MISION_NO_ENCONTRADA', mision_id}` |
| 3 | `usadas >= 5` **o** `xp_dia >= 200` | **409** `{ok:false, code:'CAP_DIARIO', usadas, limite:5, xp_dia, limite_xp:200}` |
| 4 | `0 <= remanente < 15` | **409** `{ok:false, code:'CAP_RECOMPENSA', xp_dia, remanente_xp, min_cobro_xp:15}` |
| 5 | algun `vector[eje] < requiere_stats[eje]` | **409** `{ok:false, code:'UMBRAL_NO_ALCANZADO', faltan:{eje:int}, vector:{...}, requiere_stats:{...}}` |
| 6 | `elegibles <= cobros` | **200** `{ok:true, xp:0, repetido:true}` |
| 7 | cobra | **200** (payload en 11.9.8) |

Nota: `code:'SESION_REQUERIDA'` se **anade** al shape actual de `responderSesion` (`{ok:false, error:razon}`, `5676-5678`); `error` conserva la razon del helper (`SIN_TOKEN`, `SESION_INVALIDA`, ...).

**Politica de remanente (decision de 4): recortar al remanente y registrar el importe real.** Se rechaza con `CAP_RECOMPENSA` solo si `remanente < EXPEDICION_XP_MIN_COBRO` (15, el minimo del catalogo).

```
xp        = min(mision.xp, remanente)
recortado = xp < mision.xp
```

Justificacion:

- **Precedente identico:** `compartir` recorta al remanente y marca `cap_aplicado='accion'` (`15695-15717`). No se inventa semantica.
- **El ledger no miente:** `xp_base` = `mision.xp` (solicitado) y `xp_final` = `xp` (pagado). Auditable sin reconstruir nada.
- **Rechazar siempre** dejaria a un usuario con 199 XP y 5/5 cupos usados sin camino hasta que ruede la ventana, por 1 XP. Con 15 como suelo, el recorte nunca paga menos que la mision mas barata.
- El cobro recortado **consume accion y cupo** (fue trabajo real). No hay reembolso de slots.

**Unica escritura (CTE atomico, patron `17420-17443` y 3.4:217-224).** Insert + `UPDATE usuarios SET xp_total = xp_total + xp` en la misma sentencia; si el `INSERT` no devuelve fila, el `UPDATE` no corre.

```
accion='carta_expedicion', es_exento=true,
mult_nivel=1, mult_stack=1, mult_final=1, bonos_planos=0,
xp_base=mision.xp, xp_final=xp,
cap_aplicado = recortado ? 'accion' : 'ninguno',
contexto = { mision_id, expedicion_rama, acciones_por_cobro, accion_ref,
             cobros_previos, usadas, xp_dia_previo, recortado }
```

- **`carta_expedicion: true` DEBE anadirse a `BONO_EXCLUIDAS`** (`5097-5117`; hoy **no esta**, correccion C3). `es_exento` ya corta el bono en `5205` y `accionConBono` en `5208`, pero la lista es la documentacion ejecutable de "nunca recibe bono" y 5.2:496 la exige.
- **No se toca nada mas:** ni `total_guardados`, ni `total_visitas`, ni `progreso_misiones`, ni `progreso_arbol`, ni `acreditarClaseYCofre`, ni referidos, ni pandilla. Precedente exacto: el flujo `mision` escribe solo `xp_total` + ledger (`6052-6101`).
- El XP de expedicion **si** sube `xp_total` y por tanto el nivel (`calcularNivel`, 3.4:228). Es XP normal, solo que exento de multiplicadores y de bonos.

#### 11.9.7 REGLA DURA: una expedicion NO se auto-evalua ni se auto-paga

Esto es el punto critico del contrato. Si se olvida, es un faucet infinito.

`evaluarMisiones()` (`5999`) corre en el GET `tipo=misiones` (`7812`) y **despues de cada acreditacion de XP** (`11962`, `15736`, `20451`, ...). Itera **todas** las entradas de `MISIONES` (`6032`), marca `progreso_misiones` (`6045`) y paga con `accion='mision'` (`6065`), `es_exento=true` (`6067`) y `cap_aplicado='ninguno'` (`6066`). Ese camino **no pasa por `carta_expedicion`**, luego **no lo ven ni `usadas` ni `xp_dia`**.

Si una mision con `expedicion_rama` entra en `MISIONES`:

1. Su XP se paga **fuera** de `carta_expedicion`: los caps 5/24 h y 200/24 h quedan **bypassados por completo**.
2. `progreso_misiones` la marca `completada` para siempre: se rompe la repetibilidad (5.2:490) y el consumo de accion (11.9.5).
3. Se paga en un **GET**, sin cobro explicito y sin consumir accion; dos GET concurrentes pueden pagar antes de que se escriba el progreso.

Por tanto, reglas no negociables:

- **R1.** Las expediciones viven en un array **`EXPEDICIONES` separado**. `MISIONES` no gana ni un campo de expedicion.
- **R2.** Asercion en carga (o en test): `MISIONES.every(m => !m.expedicion_rama)` y `MISIONES.every(m => EXPEDICIONES.every(x => x.id !== m.id))`.
- **R3.** Ningun id `xpd_*` se escribe **jamas** en `progreso_misiones`.
- **R4.** La unica accion del ledger que puede pagar una expedicion es **`carta_expedicion`**. Prohibido `accion='mision'` para un `xpd_*`.
- **R5.** El GET **no usa `entregarCatalogo()`** (`6259-6277`): deriva `estado` de `progreso_misiones` y mostraria las expediciones como `pendiente` para siempre (o `completada` si alguien las guardo ahi). Mapper explicito (11.9.8).

**R1 prevalece sobre la lectura literal de 5.2:487.** Lo que se comparte con `MISIONES` es el **catalogo como fuente de ids**, no el evaluador. Es la unica forma de que los caps de 5.2:494-495 sean ciertos.

#### 11.9.8 UI minima: contrato exacto del GET y del POST

`GET /api/interacciones?tipo=expediciones&usuario_id=<uuid>` -> **200**:

```
{
  ok: true,
  vector:  { alcance: int, oficio: int, fortuna: int, rendimiento: int, presencia: int },
  poder:   int,
  cap: { usadas: int, limite: 5, xp_dia: number, limite_xp: 200,
         remanente_xp: number, min_cobro_xp: 15 },
  misiones: [
    { id: string, expedicion_rama: 'difusion'|'hallazgo',
      nombre: string, descripcion: string, xp: int,
      requiere_stats: { alcance?: int, oficio?: int, fortuna?: int, rendimiento?: int },
      stats_usuario:  { ...solo las claves de requiere_stats... },
      faltan:         { ...mismas claves; max(0, req - actual)... },
      acciones: { total: int, por_cobro: int, elegibles: int, cobros: int },
      disponible: boolean,
      bloqueo: null|'UMBRAL'|'CAP_DIARIO'|'CAP_RECOMPENSA'|'SIN_ACCION' }
  ]
}
```

- `disponible` y `bloqueo` son **pistas de presentacion**. El POST **re-valida todo**; el cliente nunca decide.
- `stats_usuario` y `faltan` llevan **exactamente** las claves de `requiere_stats` (hoy una por mision). Nada de devolver el vector entero dentro de cada mision.
- El GET **no exige sesion** (igual que `tipo=misiones`, `7804`); no expone nada que no sea del propio `usuario_id`.
- **Cero `estado: 'completada'`** en expediciones: `cobros`/`elegibles` son la verdad, y una mision repetible no tiene estado final.

`POST /api/interacciones?tipo=expedicion_cobrar` con `{ usuario_id, mision_id }` -> **200**:

```
{ ok: true, mision_id: string, xp: number, xp_solicitado: number,
  recortado: boolean, repetido: boolean, accion_ref: string|null,
  usadas: int, limite: 5, xp_dia: number, limite_xp: 200, remanente_xp: number }
```

En `repetido`: `xp: 0`, `recortado: false`, `accion_ref: null`.

#### 11.9.9 Migracion 073: idempotencia del cobro (unica pieza de esquema)

Siguiente numero libre verificado: **072 es el ultimo** (`db/migrations/072_cartas_precio_mult_familia.sql`). Fichero: `db/migrations/073_cartas_expedicion_idempotencia.sql`. Aditivo, cero filas afectadas hoy (`carta_expedicion` no existe aun), cero backfill.

```sql
-- 1) Una accion real no puede respaldar dos cobros de la misma mision.
CREATE UNIQUE INDEX IF NOT EXISTS xp_ledger_expedicion_accion_uq
  ON xp_ledger (usuario_id, (contexto->>'mision_id'), (contexto->>'accion_ref'))
  WHERE accion = 'carta_expedicion';

-- 2) Sin las dos claves el indice anterior tendria un agujero NULL.
DO $m073$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_xp_ledger_expedicion_contexto'
                    AND conrelid = 'public.xp_ledger'::regclass) THEN
    ALTER TABLE xp_ledger
      ADD CONSTRAINT chk_xp_ledger_expedicion_contexto CHECK (
        accion <> 'carta_expedicion'
        OR (contexto->>'mision_id' IS NOT NULL
            AND contexto->>'accion_ref' IS NOT NULL));
  END IF;
END
$m073$;
```

- **Por que no basta el cap:** sin el indice, dos POST concurrentes insertan dos filas para el mismo `accion_ref` y consumen dos cupos por una accion. El cap 5/24 h acota el dano, pero no cumple 11.9.5.
- **Por que no `run_id`:** el `accion_ref` es del servidor; el indice cubre reintento y carrera sin clave de cliente (11.9.5).
- **Rollback:** `DROP INDEX IF EXISTS xp_ledger_expedicion_accion_uq;` + `ALTER TABLE xp_ledger DROP CONSTRAINT IF EXISTS chk_xp_ledger_expedicion_contexto;`. Sin perdida de datos.
- Indice funcional sobre `jsonb ->> text` es inmutable y valido; el predicado parcial deja fuera el 100% de las filas actuales.

#### 11.9.10 Criterios de aceptacion (10)

Cada uno es una afirmacion que el backend puede ejecutar o un `SELECT` que se puede correr. **No hay criterio "visual".**

- [ ] **A1. Catalogo.** `EXPEDICIONES.length === 6`; 3 `difusion` + 3 `hallazgo`; 6 ids unicos; `MISIONES.filter(m => m.expedicion_rama).length === 0` (R2).
- [ ] **A2. Aritmetica.** `Math.max(...xp) === 40`; `sum(xp) === 160`; `min(xp) === 15`; `xp` en `{15,25,40}`; `requiere_stats` en `{0,8,20}` enteros; `acciones_por_cobro` en `{1,2,3}`.
- [ ] **A3. Sin bono.** `BONO_EXCLUIDAS.carta_expedicion === true`; con un `bono_consumible_24h` activo, un cobro produce `xp_final === min(xp, remanente)` y **cero** filas nuevas de `bono_consumible_24h` (guardas `5205` y `5208`).
- [ ] **A4. Cap de 5.** 6 cobros en < 24 h: el 6o devuelve **409** `CAP_DIARIO` con `usadas === 5` y `limite === 5`; `SELECT COUNT(*) FROM xp_ledger WHERE accion='carta_expedicion'` = 5.
- [ ] **A5. Cap de 200 y remanente.** Con `xp_dia = 180` y mision de 40: paga **20**, fila con `xp_final = 20` y `cap_aplicado = 'accion'`, respuesta `recortado: true`. Con `xp_dia = 195`: **409** `CAP_RECOMPENSA` y **0** filas nuevas. Con `xp_dia = 200`: **409** `CAP_DIARIO`.
- [ ] **A6. Doble clic.** Una sola accion vigente y dos POST identicos: **una** fila de ledger, `usadas` sube **1**, el segundo responde **200** `xp: 0`, `repetido: true` (no 5xx, no segundo cobro); el indice `xp_ledger_expedicion_accion_uq` existe en `pg_indexes`.
- [ ] **A7. Consumo.** `N=3` con 2 acciones: `elegibles = 0`, sin cobro. Con 3 acciones: primer cobro usa el 3er `accion_ref`. Con 4 acciones: el segundo cobro queda bloqueado (`elegibles = 1 === cobros`) hasta la 6a.
- [ ] **A8. Vector.** Fixture 2 doradas `lugar` (una shiny nivel 2, una base): `alcance = 35` (14+6+1 y 14) y `poder = suma de los 4 ejes`. Fixture 0 cartas: 5 ejes a 0, `poder = 0`, sin error. Fixture 3 doradas base: `alcance = 40` (LEAST aplicado).
- [ ] **A9. Cero auto-pago.** Tras N GET `tipo=misiones` (que disparan `evaluarMisiones`, `7812`) con acciones elegibles: **0** filas `accion='carta_expedicion'` y **0** filas `accion='mision'` cuyo `contexto->'misiones'` contenga un id `xpd_*` (R3/R4).
- [ ] **A10. Escudo.** `node --check api/interacciones.js` en verde; la seccion 11.9 con **0 bytes > 127**; `exploraco desarrollo/*.md` sin modificar (R2); `db/migrations/073_*.sql` con 0 bytes > 127, idempotente en segunda corrida.

**Lo que NO cambia:** las 45 cartas y sus `stats_json`, `precioAcunacion()`, `chk_cartas_catalogo_fusionable`, `carta_acunar`, la tirada y el supply. Esta seccion solo fija como se paga una expedicion, no cuanto vale una carta.

#### 11.9.11 Correccion D-31 (2026-11-11): `xpd_dif_comparte` cambia de senal

**Estado:** cierra **D-31**. **Cero migraciones, cero endpoints.** Reemplaza la fila `xpd_dif_comparte` de 11.9.4 (1451) y el comentario `4627-4630` del archivo real. El resto de 11.9 queda intacto.

**Lo medido en la base viva (2026-11-11, solo lectura, `@neondatabase/serverless`):**

| Comprobacion | Resultado |
|---|---|
| `SELECT to_regclass('public.media_compartidos')` | **NULL** -> la 022 nunca se aplico |
| Tablas `ILIKE '%compart%'` en `public` | **ninguna** |
| `SELECT COUNT(*) FROM xp_ledger WHERE accion='compartir'` | **0** (de 387 filas totales) |
| `SELECT COUNT(*) FROM xp_ledger WHERE accion='carta_expedicion'` | 0 (correcto: aun sin cobros) |

**Por que la senal de 11.9.4 no sirve.** El unico escritor de `media_compartidos` es el handler de compartir: `INSERT` en `16327-16343`, **sin** `conDegradacionMedia` (los `SELECT` de `16319` y `16348` si degradan; el `INSERT` no). Sin tabla, ese `INSERT` lanza `42P01`, el `catch` global responde **503 `SCHEMA_NOT_MIGRATED`** (`21677-21678`) y el flujo muere **antes** de `registrarXpLedger` (`16387-16394`). La prueba es el ledger: 0 filas `accion='compartir'`. Luego `senal_disponible: false` (`4630`) no era un fail-closed transitorio: era un **bloqueo permanente sobre una tabla inexistente**.

**Decision (a): la senal buena YA existe y es consultable.** Se cuenta el **ledger canonico**, unico libro de XP (ADR-018):

```
total_sql: SELECT COUNT(*)::int AS n FROM xp_ledger
            WHERE usuario_id = $1::uuid AND accion = 'compartir'
              AND contexto->>'fuente' = 'destino'
ref_sql:   SELECT id::text AS ref FROM xp_ledger
            WHERE usuario_id = $1::uuid AND accion = 'compartir'
              AND contexto->>'fuente' = 'destino'
            ORDER BY creado_en, id LIMIT 1 OFFSET $2
```

`contexto` ya trae `fuente`, `item_id`, `canal`, `destino_id` y `primero` (`16393`): el "canal valido" que pide la mision es el `CHECK` del handler (`16283-16284`) y `fuente='destino'` es el filtro. `accion_ref` = `xp_ledger.id`, unico por fila, con `ORDER BY creado_en, id` estable. El tope de 10 eventos/24 h del handler (`16216-16223`) acota el farm del lado de `compartir`.

**Cambio exacto en `api/interacciones.js` (3 lineas, sin migracion):** (i) borrar `senal_disponible: false` y el comentario `4627-4629`; (ii) sustituir `total_sql` y `ref_sql` por los de arriba; (iii) anadir `lista_sql` (obligatorio por el guard `4786-4787`) con `ref` = `id::text`, `fecha` = `creado_en` y `detalle` = `COALESCE(contexto->>'canal','compartir')` || ' ' || `COALESCE(contexto->>'item_id','')`. El mapper `5036-5059` pasa a `senal_disponible: true` y `motivo: null`, y la mision deja de estar bloqueada por construccion.

**Por que NO (b).** Aplicar la 022 haria funcionar la mision **solo** aplicando una migracion de otra feature (`compartir`) y, peor, dejaria el conteo leyendo `media_compartidos.xp_ganado` (`022:50`), que es un **segundo libro de XP** en paralelo al ledger: dos autoridades para el mismo hecho, justo lo que 11.9.6 evita.

**Por que NO (c).** Retirar la mision rompe las cifras cerradas de `1341` (6 misiones, suma 160) y los criterios A1/A2 ya implementados en `scripts/smoke_expedicion.js` (`115-116`, `128-129`); `difusion` quedaria con 2 misiones. No hay ganancia: mientras este en 0 no cuesta nada.

**Dependencia declarada (no de la mision, sino de la FEATURE compartir).** Mientras la 022 siga sin aplicarse **y** el handler siga insertando en ella, compartir devuelve 503 y esta mision vale **0 acciones** para todos. Bajo (a) eso es exacto y **se arregla solo** cuando compartir vuelva a escribir su fila de ledger: la expedicion no necesita una linea mas. **El backend puede implementar esta correccion sin migracion.**

**Chequeo (D31-1):** `EXPEDICIONES[0].senal_disponible === undefined`; `typeof EXPEDICIONES[0].lista_sql === 'string'`; `total_sql` contiene `xp_ledger` y `accion = 'compartir'`; `to_regclass('public.media_compartidos')` sigue NULL y la consulta nueva **no falla** porque no toca esa tabla.

---

### 11.10. Contrato de fase 5: `obra` y `economia`

**Estado:** cierra la parte de 5.2 que 11.9 dejo fuera (`1339`: "no habilita `obra` ni `economia`"). **No crea endpoint** (8/8), **no crea migracion** (073 es la ultima y **no menciona `expedicion_rama`**: `expedicion_rama` no aparece en `db/migrations/*.sql`), **no toca `exploraco desarrollo/*.md`**. Mismo array `EXPEDICIONES`, mismo GET/POST, mismos caps, mismo indice unico, misma accion `carta_expedicion`.

#### 11.10.1 Consumo de `oficio` y `rendimiento`: solo umbral, cero bono

11.9.3 (`1418`) dijo: "si una rama futura los necesita, es ADR + cap propio, no un parametro". Esta seccion **no aplica ningun bono**: `oficio` y `rendimiento` se consumen **solo como umbral** (`requiere_stats`), jamas como multiplicador de XP.

- No hay segunda autoridad de pago: el XP sale de `mision.xp` y del remanente, como en 11.9.6. Por eso **no hace falta cap nuevo**: los topes 5/24 h, 200/24 h y `<= 40 XP/cobro` son los mismos y siguen siendo la unica regla.
- `poder` (3.5:235) y `puntos[eje]` (11.9.2) **no cambian**; el bono shiny/nivel sigue siendo solo del eje primario de la carta (`lib/cartas-config.js:278-298`).
- Efecto neto: el vector deja de ser puramente display en 2 de sus 4 ejes; pasa a ser **requisito de acceso**, que es la forma mas barata de darle consumidor sin tocar la economia ni el valor de las cartas.

#### 11.10.2 El guard de carga hay que ampliarlo o el modulo no arranca

`validarCatalogosExpedicion()` (`4737-4801`) corre **en carga** (`4733-4736`) y hoy exige literalmente lo contrario de esta seccion:

| Guard | Hoy (archivo real) | Debe pasar a |
|---|---|---|
| `EXPEDICIONES.length` | `!== 6` (`4749`) | `!== 12` |
| `ramas` | `{ difusion, hallazgo }` (`4740`) | `+ obra, economia` |
| `ejesV1` | `{ alcance, fortuna }` (`4743`) | `+ oficio, rendimiento` |
| reparto por rama | `difusion === 3 && hallazgo === 3` (`4799`) | las 4 `=== 3` |

Sin este cambio el guard falla y el modulo no sirve (503 en carga). **No es migracion:** es el mismo archivo. `xpValidos {15,25,40}` (`4741`) y `reqValidos {0,8,20}` (`4742`) **no cambian**.

#### 11.10.3 Catalogo (2 ramas x 3 misiones)

`requiere_stats` conserva **un solo eje por mision** (como v1), enteros comparados con `>=`. `N` = `acciones_por_cobro`. `check()` es, en el motor real (`4610-4620`), el trio `total_sql` + `ref_sql` + `lista_sql`.

| id | `expedicion_rama` | nombre | descripcion (ASCII) | `requiere_stats` | `xp` | N | senal real (archivo:linea) y filas hoy |
|---|---|---|---|---|---|---|---|
| `xpd_obr_foto` | `obra` | Foto de autor | Sube una foto a un destino. | `{oficio: 0}` | 15 | 1 | `interacciones tipo='foto'` (`13647`), **13** |
| `xpd_obr_album` | `obra` | Curador | Crea un album propio. | `{oficio: 8}` | 25 | 1 | `xp_ledger accion='album_crear'` (`14214`), **2** |
| `xpd_obr_ugc` | `obra` | Obra aprobada | Consigue la aprobacion de una obra propia. | `{oficio: 20}` | 40 | 1 | `cartas_media estado='aprobada'` (`17931`), **0** -> `SIN_ACCION` |
| `xpd_eco_compra` | `economia` | Primera compra | Compra un consumible en la tienda. | `{rendimiento: 0}` | 15 | 1 | `compra_consumibles` (`15377`), **12** |
| `xpd_eco_oferta` | `economia` | Poner a la venta | Publica una oferta en el mercado. | `{rendimiento: 8}` | 25 | 1 | `mercado_ofertas.vendedor_id` (`19546`), **0** |
| `xpd_eco_carta` | `economia` | Trato cerrado | Compra una carta en el mercado. | `{rendimiento: 20}` | 40 | 1 | `cartas_ventas.comprador_id` (`17111-17116`), **0** -> `SIN_ACCION` |

**Predicados exactos (`$1` = usuario, `$2` = offset 0-based de 11.9.5).** Todas llevan `lista_sql` (el guard `4786-4787` lo exige) con el mismo `WHERE` y `ORDER BY` que `ref_sql`, mas `fecha` y `detalle`.

| id | `total_sql` (y `ref_sql` con `id::text AS ref ... ORDER BY creado_en, id LIMIT 1 OFFSET $2`) |
|---|---|
| `xpd_obr_foto` | `FROM interacciones WHERE usuario_id=$1::uuid AND tipo='foto' AND activo=true` |
| `xpd_obr_album` | `FROM xp_ledger WHERE usuario_id=$1::uuid AND accion='album_crear'` |
| `xpd_obr_ugc` | `FROM cartas_media WHERE autor_id=$1::uuid AND estado_moderacion='aprobada' AND activo=true` |
| `xpd_eco_compra` | `FROM compra_consumibles WHERE usuario_id=$1::uuid` |
| `xpd_eco_oferta` | `FROM mercado_ofertas WHERE vendedor_id=$1::uuid` |
| `xpd_eco_carta` | `FROM cartas_ventas WHERE comprador_id=$1::uuid` |

**Candidatas rechazadas con evidencia (no se inventan senales):**

- **`xp_ledger accion='carta_compra'` no existe.** `xp_ledger.accion` tiene **17 valores distintos** y ninguno es `carta_compra`; la compra de carta escribe la fila de dominio `cartas_ventas` (`17111-17116`) y el par contable `carta_venta_debito` / `carta_venta_credito` (`17119`, `17124`). Se usa `cartas_ventas`, que es la accion, no el asiento.
- **`album_fotos` no se reutiliza en `obra`.** Ya es la senal de `xpd_for_album` (`4695`). Dos misiones con `mision_id` distinto pagarian **dos veces la misma accion** (el indice unico es por mision). `obra` usa `interacciones tipo='foto'` y `xp_ledger accion='album_crear'`, que son acciones distintas de las de `hallazgo`.
- **`albumes` como tabla directa se descarta.** `Mi Museo` se auto-crea sin accion del usuario (`13807-13811`) y contaria como obra gratis. Por eso `xpd_obr_album` lee el ledger (`14214`), que solo existe si el usuario creo el album (`14161`).
- **`cartas_ofertas` (mercado de cartas) no se usa en la mision intermedia.** Publicar una carta exige poseerla y `usuarios_cartas` tiene **0 filas**: seria otra mision muerta. `mercado_ofertas` (bienes) si es alcanzable: 43 consumibles activos y basta nivel 2 + casa (`19491-19495`).
- **`cartas_gates`, `visita`, `resena`, `guardado` no se repiten:** ya son senal de `hallazgo`/`difusion`.

#### 11.10.4 Aritmetica exacta (declarada, no opinable)

- **12 misiones, 4 ramas x 3.** `xp` = 4 x {15, 25, 40}: **suma 320**, **max 40**, **min 15**. `EXPEDICION_XP_MIN_COBRO` sigue **15** porque se deriva del catalogo (`4728-4731`), no se escribe a mano.
- **La invariante vieja "una pasada completa <= 200" NO se mantiene, y no puede mantenerse.** Con `xp in {15,25,40}` el minimo de 6 misiones nuevas es `6 x 15 = 90`; los 160 de v1 dejan **40 XP** de margen: no existe asignacion posible. Cualquier catalogo de 4 ramas suma **>= 250**.
- **La invariante que si protege el cap es el top-5, porque solo caben 5 cobros/dia:** mejor dia posible `40+40+40+40+25 =` **185 <= 200**. El cap de 200 solo se alcanza repitiendo una mision de 40 cinco veces (`5 x 40 = 200`, exacto), que es justo lo que el cap 5/24 h acota.
- Minimo dia = `5 x 15 =` **75**. Una pasada completa exige **12 cobros**: por slots `ceil(12/5) = 3` dias; por XP `ceil(320/200) = 2`. **Manda el slot: 3 dias.**
- Acciones reales de una pasada completa = **12** (las 6 nuevas van con N=1; v1 aporta 10) = **22 acciones** distintas en las 4 ramas.
- **Consecuencia para A2:** `sum(xp) === 160` pasa a `sum(xp) === 320 && top5 === 185 && max === 40 && min === 15`. La frase "una pasada completa = 160 <= 200" (`1435`) queda **retirada para el catalogo de 4 ramas** y se sustituye por "5 cobros/dia y top-5 <= 200".

#### 11.10.5 `obra` depende de moderacion UGC: `SIN_ACCION` explicito (fail-closed)

**Premisa a corregir (ADR-006):** `cartas_media` **si tiene escritor**: `carta_media_subir` (`17839`) inserta en `17931` y deja asiento `carta_media_envio` (`17938`). Lo que no tiene es **filas**: `SELECT COUNT(*) FROM cartas_media` = **0**.

Los 3 candados reales de `xpd_obr_ugc`:

1. **Cuesta XP:** `CARTA_MEDIA_XP_COSTE` se debita en `17926-17928` (`xp_gastado_sinks`).
2. **Gate de publicacion:** exige `>= 3` resenas largas de `>= 25` XP o `>= 1` obra ya aprobada (`17915-17924`; `lib/cartas-config.js:205-210`).
3. **La aprobacion es humana:** la cola y la transicion viven en `api/admin.js:1589` (`cartas_media_moderar`). La mision no depende del codigo, depende de una cola de moderacion.

**Estado definido:** `SIN_ACCION` por la via **generica** (`5030-5031`, `5055`), **sin** `senal_disponible: false`. La tabla existe y la consulta es valida: 0 filas **es la verdad**, no un bloqueo de diseno (contraste exacto con D-31, donde la tabla no existia). El POST re-valida y devuelve **200** `{ok:true, xp:0, repetido:true}` (regla 6 de `1510`): **nunca paga de mas**. Lo mismo para `xpd_eco_carta`: `usuarios_cartas` = **0** filas, luego no hay oferta que comprar; su desbloqueo es el canal de adquisicion diferido en 11.8 (tienda), no esta fase.

#### 11.10.6 Lo que NO cambia: caps, idempotencia, ledger

- **Caps compartidos entre las 4 ramas, no por rama:** `usadas` y `xp_dia` cuentan `accion='carta_expedicion'` **sin filtrar `expedicion_rama`** (`1496-1497`). 5/24 h y 200/24 h son **globales**; 5 por rama seria un faucet x4.
- **Idempotencia heredada:** mismo indice `xp_ledger_expedicion_accion_uq` sobre `(usuario_id, contexto->>'mision_id', contexto->>'accion_ref')` (`073:125-129`) y mismo `CHECK chk_xp_ledger_expedicion_contexto` (`073:161`). **Cero migracion nueva:** `expedicion_rama` vive solo en `contexto` (JSONB), nunca en una columna con `CHECK`.
- **`<= 40 XP/cobro`** se mantiene por catalogo (max 40) y por remanente (11.9.6).
- `carta_expedicion` sigue siendo la **unica** accion que paga expediciones (R4) y ninguna mision nueva entra en `MISIONES` (R2, `4790-4798`).

#### 11.10.7 Criterios de aceptacion (A11-A20)

- [ ] **A11. Catalogo de 4 ramas.** `EXPEDICIONES.length === 12`; `obra === 3` y `economia === 3`; 12 ids unicos con prefijo `xpd_`; `MISIONES.filter(m => m.expedicion_rama).length === 0` (R2). `scripts/smoke_expedicion.js` (`115-116`, `396`) actualizado a 12.
- [ ] **A12. Aritmetica.** `sum(xp) === 320`; `Math.max(...xp) === 40`; `Math.min(...xp) === 15`; `EXPEDICION_XP_MIN_COBRO === 15`; top-5 = `185`; `xp` en `{15,25,40}` y `N` en `{1,2,3}` (`4741`, `4764`).
- [ ] **A13. Solo umbral, cero bono.** Toda clave de `requiere_stats` esta en `{alcance, oficio, fortuna, rendimiento}`; todo valor en `{0,8,20}`; `oficio` aparece **solo** en `obra` y `rendimiento` **solo** en `economia`; el XP pagado de un cobro es exactamente `min(mision.xp, remanente)` y ninguna fila de `xp_ledger` de expedicion lleva `mult_final != 1`.
- [ ] **A14. D-31.** `EXPEDICIONES[0].senal_disponible === undefined`; `typeof lista_sql === 'string'`; `total_sql` contiene `xp_ledger` y `accion = 'compartir'`; la consulta de `xpd_dif_comparte` devuelve 0 filas **sin error** mientras `to_regclass('public.media_compartidos') IS NULL`.
- [ ] **A15. Cap 5 global.** 5 cobros repartidos entre las 4 ramas: el 6o devuelve **409** `CAP_DIARIO` con `usadas === 5`; `SELECT COUNT(*) FROM xp_ledger WHERE accion='carta_expedicion'` = 5 (no hay 5 por rama).
- [ ] **A16. Cap 200 y remanente con ramas nuevas.** `xp_dia = 180` + mision de 40 -> paga **20**, `recortado: true`, `cap_aplicado = 'accion'`; `xp_dia = 195` -> **409** `CAP_RECOMPENSA` y 0 filas nuevas; `xp_dia = 200` -> **409** `CAP_DIARIO`.
- [ ] **A17. Fail-closed `obra`/UGC.** Con `cartas_media` con 0 aprobadas: GET -> `acciones.total === 0`, `disponible === false`, `bloqueo === 'SIN_ACCION'`, `senal_disponible === true`; POST -> **200** `{ok:true, xp:0, repetido:true}` y **0** filas nuevas en `xp_ledger`.
- [ ] **A18. Fail-closed `economia`/cartas.** Con `usuarios_cartas` vacia: `xpd_eco_carta` responde igual que A17. En el mismo estado, `xpd_eco_compra.acciones.total > 0` para los 2 usuarios con `compra_consumibles` (12 filas): la rama **no** esta muerta entera.
- [ ] **A19. Cero migracion e idempotencia.** Dos POST identicos del mismo `mision_id` y `accion_ref`: **una** fila de ledger y el segundo **200** `xp:0`; `xp_ledger_expedicion_accion_uq` en `pg_indexes`; `chk_xp_ledger_expedicion_contexto` en `pg_constraint`; `expedicion_rama` ausente de `db/migrations/*.sql`.
- [ ] **A20. Escudo.** `node --check api/interacciones.js` en verde; seccion 11.10 (y la nota 11.9.11) con **0 bytes > 127**; `exploraco desarrollo/*.md` sin modificar (R2); `npm test` sigue incluyendo `node scripts/smoke_expedicion.js`.

**Lo que NO cambia:** las 45 cartas y sus `stats_json`, `precioAcunacion()`, `chk_cartas_catalogo_fusionable`, `carta_acunar`, la tirada, el supply, los caps de 11.9.6 y el indice de 073. Esta seccion solo dice **que acciones reales abren las 2 ramas que faltaban**; no crea XP nuevo ni toca el valor de una carta.
