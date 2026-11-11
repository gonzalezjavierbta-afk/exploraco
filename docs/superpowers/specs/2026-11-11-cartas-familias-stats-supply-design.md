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
| **Juego** | `personaje` | Persona real, de ficcion o de folclor | `historico`, `ficcion`, `folclor` | Tirada, UGC aprobada | **Si** | **Si** | **Si** |
| **Juego** | `artista` | Autor creativo (una carta por obra) | `musica`, `cine`, `grafica`, `literatura` (espeja las vocaciones de `api/interacciones.js:2450-2453`) | UGC aprobada | **Si** | **Si** | **Si** |
| **Juego** | `marca` | Marca aliada; puede gatear set y premio | `licor`, `gastronomia`, `artesania`, `otra` | SKU (`es_canjeable_qr`) o acunacion XP | **Si** | **No** (lo exige `chk_cartas_catalogo_fusionable`, `060:352-355`) | **Si** |
| **Economia** | `producto` | Recibo coleccionable de un SKU fisico | `fisico`, `digital` | `canjes_tienda` con `origen='premio_set'` o mostrador | **No (sin predicado hoy: D-15)** | **No** | **No** |
| **Economia** | `consumible` | Recibo de un consumible/entrada con efectos | `entrada_evento`, `bono`, `servicio` | `consumibles.clave` (`010:16-24`) | **No (sin predicado hoy: D-15)** | **No** | **No** |
| **Estatus** | `cosmetica` | Pieza de vitrina: marco, fondo, insignia | `marco`, `fondo`, `insignia` | Acunacion XP, drops cosmeticos | **Si** | **No** | **Si** |

**Reglas duras de la taxonomia (todas verificables por CHECK en 066):**

1. `familia` es dominio cerrado de 7 valores. `subtipo` es dominio cerrado **por familia** (no hay subtipo valido en dos familias).
2. **`producto` y `consumible` no tienen `precio_xp`**: se pagan por su SKU (`consumibles.clave` + `consumibles.precio_xp`, `010:16-24`) o en COP en el mostrador. `marca` **si** puede tener `precio_xp` porque la acunacion de una carta de marca es un sumidero de XP (y su entrega por QR sigue existiendo).
3. **`producto` y `consumible` no aportan puntos a ningun eje.** Un vector vacio garantiza que una carta de SKU **no da poder de juego**; **no** garantiza que no se pueda comerciar: hoy `carta_publicar` solo exige `activo=true` (`api/interacciones.js:16200-16209`), asi que **una carta de producto se puede listar y vender por XP**. El predicado de familia es **contrato de fase 2** (dueno `@backend-dev`, gate SI) y queda registrado como **D-15**. Mientras D-15 no exista, esta spec **no afirma** que el SKU no compre juego: afirma que no compra **poder**.
4. `marca` no es fusionable (CHECK ya vigente) y `cosmetica` no es fusionable (regla nueva, en el CHECK de 066).
5. Extension de subtipos = **DROP + ADD del CHECK en una sola sentencia** dentro de un bloque `DO` (precedente literal: `065:115-127`). Anadir un subtipo nunca requiere columna nueva.
6. `capa` **no se persiste.** Se deriva de `familia` en una sola funcion del render/API.
7. **Vinculo carta <-> SKU por convencion ya existente:** `stats_json.sku` (precedente literal en `065:78-90`). Es la unica llave carta->SKU; no se crea columna `sku` (segunda autoridad). 066 lo valida como **CHECK en `producto`** (las 4 cartas actuales ya lo cumplen, 4/4) y como **verificacion** en `consumible`, donde **no** se puede poner CHECK sin inventar datos: las 3 `ce_evento_*` son legacy y **ninguna tiene `sku`** (baseline declarado, 8 V19). Las cartas `consumible` nuevas quedan obligadas por contrato de handler (fase 2) + verificacion.

### 2.2. Mapeo de las 31 cartas actuales

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

**Disponibilidad por ejes (hecho medido, correccion 10):** las 31 cartas actuales son **24 `lugar` + 3 `consumible` + 4 `producto`**. Por familia (3.2) eso significa que **solo `alcance` y `fortuna` tienen cartas que los aporten hoy**; `oficio` y `rendimiento` valen **0** en el catalogo actual y no se pueden subir con nada. Por eso **v1 expone unicamente las `expedicion_rama` de `alcance` y `fortuna`**; `obra` y `economia` se habilitan **despues del seed de `personaje`/`marca`/`artista` (fase 4)**. Un eje a 0 con una rama publicada seria una mision imposible, no una stat muerta: la distincion importa.

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

- **Publicar exige ACCIONES REALES, no un eje vacio:** `n_resenas_largas >= 3` **o** `media propia aprobada >= 1`. **No** se usa `oficio >= 8` en v1: `oficio` vale 0 hoy porque ninguna de las 31 cartas lo aporta (3.1) y el gate bloquearia toda la UGC hasta la fase 4. Cuando existan cartas de `personaje`/`artista`, el gate puede endurecerse a `oficio >= 8` **como condicion adicional** (fase 4), nunca como sustituto.
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
