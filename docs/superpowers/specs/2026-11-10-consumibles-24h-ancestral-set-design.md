# Spec de diseno: consumibles de bono global 24 h (+%) y set de coleccion Ancestral 4/4

- **Version:** **v2 (2026-11-10)** - aplica los **8 puntos** de la revision de `@architect-review` (SOLICITA CAMBIOS) y las **4 respuestas del operador**. Cambios de v1 a v2, en una linea cada uno: (1) los 3 SKU de volumen **conservan su precio** de 058 y 064 solo les escribe `otorga_carta`; (2) rarezas fijadas (base `dorado`, 750 ml `epico`, 375 ml `raro`, 50 ml `comun`) y `nivel_gate` NULL en las 4; (3) marca por **igualdad exacta `'ANCESTRAL'`** con fallo explicito, cero `ILIKE`; (4) **lista negra explicita por `accion`** con default-deny y las **48** llamadas clasificadas una a una; (5) filtro de misiones **antes** de `entregarCatalogo` + gate en `evaluarMisiones`; (6) **cero `BEGIN`/`COMMIT`** en 064/065; (7) **atomicidad en el WHERE** (flag de set en el cobro, ventana en la activacion), 0 filas = 409, sin pre-checks como unica defensa; (8) premio 4/4 en **una sola sentencia CTE** con `RETURNING` y abono condicionado.
- **Fecha:** 2026-11-10
- **Autor:** @architect (Chief Architect)
- **Estado:** v2 APLICADA A REVISION - pendiente de implementacion (@backend-dev + @sql-security + @admin-dev + @frontend-tpl) y de pase documental (@docs-keeper)
- **ADR:** **ADR-120** (texto completo en la seccion 7). Numeracion verificada: `Select-String -Path "exploraco desarrollo/DECISIONS.md" -Pattern "^## ADR-"` devuelve como ultimo **ADR-119** (linea 13144); ADR-116 ya existe (linea 12752, `cartas_jugables`). **ADR-120 es el siguiente libre.**
- **Migraciones:** `064_consumibles_bono_global_pct.sql` y `065_cartas_set_ancestral_premio.sql` (la ultima aplicada es la 063).
- **Reglas respetadas:** ADR-001 (vanilla), ADR-002 (ASCII-safe en `api/*.js` y SQL), ADR-003 (cero borrado logico: todo es MERGE JSONB y `activo=false`, nunca DELETE de IDs), ADR-004 (silo CSS), ADR-006 (baseline = archivo real), ADR-008 (idempotencia + Silent Fallback), presupuesto Vercel 8/8 (cero endpoints nuevos: todo va por `tipo2` existente).
- **Prohibido en este entregable:** escribir en `exploraco desarrollo/*.md` (R2). El texto del ADR se entrega listo para que @docs-keeper lo publique en el pase de cierre.
- **Verificacion de esta spec:** `node --check` **no aplica** (el entregable es un `.md`): la verificacion es la matriz S-1..S-17 de la seccion 5 + las consultas post-aplicacion de la seccion 4. Los `node --check` de S-1 aplican al codigo que implemente, no a este documento.

Todo lo marcado como **HECHO MEDIDO** fue leido en el archivo real de este repo. Todo lo marcado como **DECISION DEL OPERADOR** esta cerrado y no se reabre. En v2 no queda ningun valor **PROPUESTO** bloqueante: los unicos datos que el operador no fijo (umbral de misiones y `grupo`) viajan como decision declarada y reversible por dato.

**Correccion de baseline respecto de v1 (ADR-006):** v1 afirmaba `registrarXpLedger` con **49** llamadas en `api/interacciones.js` y **1** en `api/admin.js`. Medido en el archivo real con un barrido de las 50 coincidencias (49 lineas de llamada, una es la definicion): son **48 llamadas** en `api/interacciones.js`, **0** en `api/admin.js` y **0** en `api/usuarios.js`. La clasificacion de v2 es sobre las 48 reales.


---

## 0. Alcance y hechos medidos que condicionan el diseno

| # | Hecho medido | Archivo:lineas |
|---|---|---|
| H1 | Catalogo unico de bases de XP (`XP_BASES`) | `api/interacciones.js:563-590` |
| H2 | Motor de multiplicadores: `calcularXpFinal` (caps 5.0/10.0) y envoltorio `calcularXpAcreditado` | `api/interacciones.js:1869-1975` |
| H3 | Escritura del ledger de XP: `registrarXpLedger` (una sola definicion, **48** puntos de llamada medidos; 0 en `api/admin.js` y 0 en `api/usuarios.js`; **21** con `es_exento:true` literal y **27** sin `es_exento`, es decir `false` por omision). Ademas hay **2 INSERT directos** a `xp_ledger` que NO pasan por el ledger | `api/interacciones.js:2009-2033` (el INSERT queda ~2040); INSERT directos en `:15651-15660` (`carta_venta_debito/credito`, `es_exento=true`) |
| H4 | Estado del efecto de faccion: UN objeto `capacidades.consumible_efecto`; predicados `efectoFaccionVigente` / `ventanaFaccionAbierta` | `api/interacciones.js:4849-4879` |
| H5 | `consumirBonoFaccion`: bono PLANO, 1 carga por accion, asiento propio `bono_faccion_era1` con `es_exento:true` | `api/interacciones.js:4891-4951` |
| H6 | 5 puntos de consumo del bono plano | `api/interacciones.js:12510, 13265, 18714, 18846, 19101` |
| H7 | `evaluarMisiones`: `ctx` se construye con 6 campos; no existe ningun `requiere_carta/flag/item` | `api/interacciones.js:5591-5610` |
| H8 | `entregarCatalogo` (shape de fila de mision) | `api/interacciones.js:5841-5861` |
| H9 | GET `?tipo=misiones` devuelve el catalogo COMPLETO a todos | `api/interacciones.js:7378-7406` |
| H10 | GET `?tipo=consumibles`: SELECT + escalera de degradacion de 3 intentos | `api/interacciones.js:9833-9875` |
| H11 | `comprar_consumible`: gates, descuento de Arbol, `ccStockTope = 30` (constante de codigo) y predicado `$4` en el WHERE | `api/interacciones.js:14012-14199` (`ccStockTope` en `:14130`) |
| H12 | `usar_consumible`: rama `categoria='faccion'` atomica que sella `consumible_efecto` | `api/interacciones.js:14203-14309` |
| H13 | `carta_intercambiar` ya lee el catalogo (3 columnas) y bloquea cartas de gate | `api/interacciones.js:15368-15400` (SELECT en `:15389-15397`) |
| H14 | `carta_fusionar` rechaza `fusionable=false` con motivo | `api/interacciones.js:15913-15937` |
| H15 | `consumible_entregar` (mostrador): exige `c.clave=$3 AND c.marca_id=$4`, cierra premios con `origen='premio_semanal'` | `api/interacciones.js:16726-16760` y `:16840-16895` |
| H16 | Otorgar premio semanal: idempotencia por `canjes_tienda.clave_idempotencia` | `api/interacciones.js:16988-17010` |
| H17 | GET `cartas_mias`: SELECT de 16 columnas + `cmReq` que SOLO entiende `nivel_gate IN (10,14,20,25)` | `api/usuarios.js:996-1033`, mapeo `:1076-1112` |
| H18 | `museo_cartas` (publico) lee 9 columnas; no necesita cambios | `api/usuarios.js:1165-1174` |
| H19 | `cartas_catalogo` sin CHECK en `nivel_gate` (NULL permitido); `chk_cartas_catalogo_fusionable` prohibe fusionable con `emisor_tipo='marca'` | `db/migrations/040:104`; `db/migrations/060:265-281` |
| H20 | `canjes_tienda`: `marca_id NOT NULL`, CHECK de origen cerrado a `('mostrador','premio_semanal')`, `UNIQUE (clave_idempotencia)` | `db/migrations/058:306-339` |
| H21 | `consumibles`: 32+ filas previas; `marca_id` (027), `categoria` (018), `precio_xp_base`/`bono_*`/`cargas` (057), `premio_semanal`/`precio_cop` (058) | `010:...`; `027:262`; `018:58`; `057:132-141`; `058:254-257` |
| H22 | `gamificacion_config.valor` es `numeric(12,4)`: **no puede guardar la clave de un SKU** | `db/migrations/058:348-352` (comentario explicito) |
| H23 | La vista `consumibles_precio` solo usa `precio_xp_base`, `stock_total`, `stock_usado`: columnas nuevas no la alteran | `db/migrations/027:283-303` |
| H24 | `npm run test` es una cadena de 30 smokes; los nuevos se anaden ahi | `package.json:7` |
| H25 | El runner de SQL **no tiene transaccion**: divide por `;` (respetando dollar-quote) y ejecuta sentencia a sentencia con el driver **HTTP** de Neon, cortando al primer error | `scripts/apply_sql_file.js:11`, `:155`, `:349-359` (bucle de apply), `:651` (`dividirSentencias`), `:755-763` (`neon(url)`, sin cliente de transaccion) |
| H26 | Patron real de OTORGAR UN PREMIO en **una sola sentencia**: CTE `ins` (INSERT ... `ON CONFLICT` ... `RETURNING`) y CTE `d`/`ab` que solo escribe `WHERE EXISTS (SELECT 1 FROM ins)` | `api/interacciones.js:16874-16904` (comentario en `:16993-16994`: "la acreditacion cuelga del INSERT (CTE ins): si el premio no se inserto, no se acredita nada") |
| H27 | **Precio y moneda de los 3 SKU de volumen**: `ancestral_pocima_50ml` 1166.67 / 14000, `ancestral_media_375ml` 3416.67 / 41000, `ancestral_botella_750ml` 6333.33 / 76000, `tipo_canje='tienda'`, `premio_semanal=true` | `db/migrations/058:382-395` |
| H28 | El nombre de la marca es **exacto** `'ANCESTRAL'` (constante del seed de vinculo, no un patron) | `db/seeds/001_marca_ancestral_vinculo.js:48` |
| H29 | `consumibles.categoria` es `varchar(30) NOT NULL DEFAULT 'general'`; las 3 filas de 058 **no** declaran categoria, luego son `'general'` (no `'faccion'`): no entran en la rama de faccion ni en el tope de stock | `db/migrations/057:44` (contrato de 017/018), `db/migrations/058:382-395` |
| H30 | El CHECK de `rareza` de `cartas_catalogo` admite `('comun','raro','epico','dorado')`; el UNIQUE de idempotencia se llama `uq_canjes_tienda_idem` y `chk_canjes_tienda_precios` exige `>= 0` (precio 0 es legal) | `db/migrations/040:101-103`; `db/migrations/058:334-338` |

**Consecuencia de H22 (desviacion declarada, no silenciosa):** el premio 4/4 **no** puede vivir en `gamificacion_config`. Se implementa con una columna booleana `consumibles.premio_set`, espejo exacto del patron ya medido `premio_semanal` (058). Mismo caracter data-driven, mismo `ON CONFLICT`, mismo lector (`consumibles_precio`). Ver ADR-120 D8.

---

## 1. Modelo de datos

### 1.1 Columnas nuevas en `consumibles` (6, todas aditivas)

| Columna | Tipo | NULL | DEFAULT | Por que ese tipo / default |
|---|---|---|---|---|
| `bono_pct` | `smallint` | NOT NULL | `0` | Porcentaje entero 0..100. `smallint` es el tipo ya usado por `cargas`, `duracion_horas`, `limite_diario`, `nivel_requerido` (057). `DEFAULT 0` = **las 32+ filas existentes no se tocan y siguen inertes** (0 % = rama antigua). |
| `bono_tope_xp` | `numeric(12,2)` | NOT NULL | `0` | Mismo tipo que `bono_xp_fijo` (057) y que `xp_total`: la moneda del sistema es XP decimal. `DEFAULT 0` = sin tope activo. |
| `es_permanente` | `boolean` | NOT NULL | `false` | Declara que `usar_consumible` NO debe consumirlo (la carta base Ancestral). `false` por defecto = las filas existentes conservan su comportamiento consumible. |
| `otorga_carta` | `varchar(40)` | NULL |  -  | `cartas_catalogo.id` que se entrega al comprar/entregar. `varchar(40)` porque los ids de carta son texto corto (`cta_ancestral_01`). **Sin FK a proposito**: 064 se aplica ANTES de 065 (que siembra las cartas) y una FK obligaria a invertir el orden o a fallar. La verificacion S-9 compara por JOIN. |
| `desbloquea_set` | `varchar(40)` | NULL |  -  | `set_slug` que la carta base abre (acceso permanente). NULL = no abre set. |
| `premio_set` | `boolean` | NOT NULL | `false` | Marca la fila que es EL premio del set 4/4. Espejo de `premio_semanal` (058). `false` por defecto = ninguna fila existente cambia. |

**CHECKs (3, todos con guarda `pg_constraint` como 055/057/058, porque Postgres no tiene `ADD CONSTRAINT IF NOT EXISTS`):**

- `chk_consumibles_bono_pct`: `bono_pct BETWEEN 0 AND 100`
- `chk_consumibles_bono_tope`: `bono_tope_xp >= 0`
- `chk_consumibles_bono_coherente`: `(bono_pct = 0 AND bono_tope_xp = 0) OR (bono_pct > 0 AND bono_tope_xp > 0)`  -  un porcentaje sin tope es un faucet sin freno y un tope sin porcentaje es un tope muerto: ninguna de las dos formas puede existir.
- `chk_consumibles_permanente_coherente`: `es_permanente = false OR desbloquea_set IS NOT NULL`  -  un item permanente tiene que declarar QUE abre; si no, es un sumidero de XP que no entrega nada.

**Validacion contra filas existentes:** las 32+ filas tienen `bono_pct=0`, `bono_tope_xp=0`, `es_permanente=false` por DEFAULT => los 4 CHECKs pasan sin backfill (no hace falta el `UPDATE` previo que si necesito la 060 para `fusionable`).

### 1.2 Estado del efecto en `usuarios.capacidades` (JSONB, sin DDL)

**Mapa nuevo, por clave** (`consumible_efectos`, plural):

```json
{
  "consumible_pluma_creador": {
    "clave": "consumible_pluma_creador",
    "activo_desde": "2026-11-10T14:02:11.000Z",
    "expira_en":    "2026-11-11T14:02:11.000Z",
    "bono_pct": 25,
    "bono_tope_xp": 700,
    "bono_acumulado_xp": 0,
    "origen": "compra"
  }
}
```

**Clave antigua** (`consumible_efecto`, singular): **NO se toca, NO se migra, NO se lee desde el motor nuevo.** Sigue gobernada por `consumirBonoFaccion` (`:4891-4951`). Asi un efecto sellado antes del despliegue se agota por su via y ningun jugador pierde lo pagado. Coste: las 4 filas recalibradas escriben `bono_accion=NULL`/`bono_xp_fijo=0` en 064, de modo que un efecto viejo de esas cartas paga 0 y no hay doble cobro (riesgo R1).

**Predicados (funciones puras, `api/interacciones.js`):**

```js
// A: VIGENTE para ACUMULAR bono. expira_en futuro Y acumulado < tope.
function efectoBonoVigente(ef) { ... }

// B: VENTANA ABIERTA para el COOLDOWN POR CARTA. Solo expira_en futuro
//    (ignora el acumulado, igual que ventanaFaccionAbierta y por la misma
//    razon: si no, agotar el tope reabriria la ventana y se licuaria el stock).
function ventanaBonoAbierta(ef) { ... }

// C: GANADOR (no apilamiento). Entre todos los efectos VIGENTES, el de mayor
//    bono_pct; empate -> el de expira_en mas lejano; empate -> clave ASC
//    (determinismo, sin depender del orden del JSONB).
function efectoBonoGanador(caps) { ... }
```

**Reglas cerradas:**
- **No apilamiento:** se acredita UN solo bono por accion, el del ganador, con **el tope de ese ganador** (`D1`).
- **Cooldown por clave:** `ventanaBonoAbierta(caps.consumible_efectos[clave])` => 409; otra clave distinta puede activarse aunque haya una ventana abierta (`D1`).
- **Acumulado por ventana:** `bono_acumulado_xp` vive en la entrada de la carta, se reinicia a 0 al re-sellar (nueva activacion) y **no** lo hereda el ganador siguiente.
- El mapa es **acumulativo**: activar no borra las otras entradas (ADR-003), solo anade/reemplaza SU clave con `||`.

### 1.3 Semillas: las 4 cartas consumibles existentes (recalibracion)

`UPDATE` acotado por clave; `precio_xp` y `precio_xp_base` **en el MISMO valor** (H23: la vista `consumibles_precio` deriva de `precio_xp_base` y la compra de `precio_xp`; si divergen, el precio mostrado y el cobrado derivan).

| clave | bono_pct | bono_tope_xp | precio (x2) | nivel | `bono_accion` | `bono_xp_fijo` |
|---|---|---|---|---|---|---|
| `consumible_catalejo_explorador` | 10 | 250 | 160 | 4 | `NULL` | 0 |
| `consumible_lupa_curador` | 15 | 400 | 260 | 4 | `NULL` | 0 |
| `consumible_lente_artista` | 20 | 550 | 360 | 4 | `NULL` | 0 |
| `consumible_pluma_creador` | 25 | 700 | 450 | 4 | `NULL` | 0 |

**Nota aritmetica (honestidad, no reapertura):** el "65 % del tope" declarado por el operador cuadra exacto solo en la Lupa (400 x 0.65 = 260). En las otras tres el porcentaje real es 64.0 % (160/250), 65.45 % (360/550) y 64.29 % (450/700), es decir 65 % redondeado. **Los numeros literales son la autoridad**; el "65 %" es la regla de redondeo, no una formula que deba re-derivarse. El smoke S-4 fija los literales, no el porcentaje.

`categoria` se queda en `'faccion'` (no se toca): solo afecta al descuento del Arbol de Clases (`:3444-3455`) y al gate de stock que se retira. `faccion_requerida` sigue `NULL` (062). `limite_diario` sigue `1` **y sigue sin aplicarse** en codigo, por lo que "compras sin limite" ya se cumple una vez retirado `ccStockTope`.

**Alcance del UPDATE de 064 (fijado por la revision, punto 1):** el `UPDATE` de recalibracion toca **solo estas 4 claves**. Las 3 filas `ancestral_*` de volumen **no aparecen en ese `UPDATE` ni en ningun otro que escriba `precio_xp`/`precio_xp_base`**: su precio es el de 058 (H27) y se conserva. Un solo `UPDATE` acotado les escribe `otorga_carta` (1.4). En 064, la unica palabra `precio_xp` aparece en el `UPDATE` de las 4 cartas de bono y en el `INSERT` de `ancestral_base`; el resto de sentencias no la mencionan.

### 1.4 Semillas: el set Ancestral (3 filas YA EXISTEN + 2 filas nuevas)

**Estado real medido (ADR-006): las 3 filas de volumen no se siembran, ya existen** desde 058 (`:382-395`) con `precio_xp` 1166.67 / 3416.67 / 6333.33, `precio_cop` 14000 / 41000 / 76000, `tipo_canje='tienda'`, `premio_semanal=true`, `activo=true`, `categoria='general'` (H27, H29) y `marca_id` puesto por el seed de vinculo (H28). Cualquier `INSERT ... ON CONFLICT DO UPDATE` sobre esas claves **pisaria el precio** y esta prohibido. 064 hace sobre ellas **una sola cosa**: `UPDATE consumibles SET otorga_carta = ...` por clave (el vinculo SKU -> carta del set).

| clave | estado en 064 | `precio_xp` | `precio_cop` | `categoria` | `es_permanente` | `otorga_carta` | `desbloquea_set` | `premio_set` | `marca_id` |
|---|---|---|---|---|---|---|---|---|---|
| `ancestral_pocima_50ml` | **UPDATE** (solo `otorga_carta`) | **1166.67 (058, intocable)** | **14000** | `general` (058) | `false` (default) | `cta_ancestral_02` | NULL | `false` | ya existe (seed 001) |
| `ancestral_media_375ml` | **UPDATE** (solo `otorga_carta`) | **3416.67 (058, intocable)** | **41000** | `general` (058) | `false` | `cta_ancestral_03` | NULL | `false` | ya existe |
| `ancestral_botella_750ml` | **UPDATE** (solo `otorga_carta`) | **6333.33 (058, intocable)** | **76000** | `general` (058) | `false` | `cta_ancestral_04` | NULL | `false` | ya existe |
| `ancestral_base` | **INSERT** (`ON CONFLICT` acotado) | **400** | 0 (sin precio en pesos) | `general` | **`true`** | `cta_ancestral_01` | `ancestral_esencia` | `false` | `'ANCESTRAL'` (exacta) |
| `ancestral_premio_set` | **INSERT** (`ON CONFLICT` acotado) | **0** (fila tecnica: es un puntero) | 0 | `general` | `false` | NULL | NULL | **`true`** | `'ANCESTRAL'` (exacta) |

- **`categoria='general'`, no `'ancestral'`:** las 3 filas de 058 ya son `general` y 064 **no puede** re-categorizarlas (el `UPDATE` acotado solo escribe `otorga_carta`); declarar `'ancestral'` en las 2 nuevas crearia dos categorias para el mismo set y romperia la agrupacion del catalogo/admin. El set se identifica por `desbloquea_set` / `premio_set` / `otorga_carta`, que son los campos que el codigo lee. No se inventa un vocabulario nuevo.
- **`precio_xp=400` de la base:** decision del operador (v1 lo tenia como propuesto; v2 lo fija). El gate es el XP, por eso `nivel_requerido=NULL`.
- **`precio_xp=0` del premio:** decision del operador (respuesta (a)): **es la clave del SKU fisico que se entrega por `canjes_tienda` al completar 4/4**; la fila de precio 0 es **solo el puntero** que hace que `consumible_entregar` pueda cerrar el canje (`:16846` exige `c.clave=$3 AND c.marca_id=$4`; `:16871-16872` exige stock en la billetera). **No otorga carta**: `otorga_carta=NULL`.
- **`marca_id` por igualdad estricta, con fallo explicito** (punto 3): `SELECT id FROM marcas WHERE nombre = 'ANCESTRAL'` (H28) dentro de un bloque `DO`; si no devuelve fila -> `RAISE EXCEPTION` y la migracion queda `fallida` en el ledger del runner. **Cero `ILIKE`, cero `ORDER BY ... LIMIT 1`**: elegir "la primera que se parezca" era un fallo silencioso que S-14 no distinguia.
- `cargas=0`, `duracion_horas=24`, `bono_pct=0`, `bono_tope_xp=0`, `nivel_requerido=NULL`, `limite_diario=0`, `faccion_requerida=NULL`.
- **Sin `precio_cop` en las 2 nuevas:** `precio_cop=0` es el centinela documentado de "sin precio en pesos" (`058:86`).

### 1.5 `cartas_catalogo`: 1 columna nueva y 4 filas

| Columna | Tipo | NULL | DEFAULT | Por que |
|---|---|---|---|---|
| `set_coleccion` | `boolean` | NOT NULL | `false` | Declara "esta carta pertenece a un set de COLECCION con progreso propio": (a) entra en `cmReq` aunque no tenga `nivel_gate`, (b) **no se puede intercambiar** (si se pudiera, el 4/4 se rompe para siempre). `false` = las 21+ cartas actuales no cambian de comportamiento. |

4 filas (`ON CONFLICT (id) DO UPDATE` acotado):

| id | nombre | set_slug | rareza (**DECISION DEL OPERADOR**) | nivel_gate | emisor_tipo | fusionable | es_canjeable_qr | set_coleccion | imagen_url |
|---|---|---|---|---|---|---|---|---|---|
| `cta_ancestral_01` | Esencia Ancestral | `ancestral_esencia` | **`dorado`** | **NULL** | `marca` | **false** | false | **true** | `assets/cartas/marca_ancestral.png` |
| `cta_ancestral_02` | Pocima Ancestral 50 ml | `ancestral_esencia` | **`comun`** | **NULL** | `marca` | false | false | true | idem |
| `cta_ancestral_03` | Media Ancestral 375 ml | `ancestral_esencia` | **`raro`** | **NULL** | `marca` | false | false | true | idem |
| `cta_ancestral_04` | Botella Ancestral 750 ml | `ancestral_esencia` | **`epico`** | **NULL** | `marca` | false | false | true | idem |

- **Rarezas cerradas (punto 2): la base es la mas alta (`dorado`) y el escalonado de volumen queda 50 `comun` < 375 `raro` < 750 `epico`.** Los 4 valores existen en el CHECK `chk_cartas_catalogo_rareza` (H30). No se reabre.
- **`nivel_gate=NULL` en las 4 (punto 2):** el progreso del set se sostiene con `set_coleccion`, no con un nivel inventado. Es legal porque el CHECK `(10,14,20,25)` vive en `cartas_gates`, **no** en `cartas_catalogo` (H19).
- `fusionable=false` es **obligatorio** por `chk_cartas_catalogo_fusionable` (060) al ser `emisor_tipo='marca'`; no es preferencia.
- `stats_json` (obligatorio el objeto plano): `{"sku": "<clave del consumible>", "volumen_ml": 0|50|375|750, "set_slug": "ancestral_esencia", "premio_set": "ancestral_premio_set"}`. Es el vinculo carta <-> SKU que hace auditable el set sin tocar codigo (S-9 lo verifica por JOIN).
- La carta base reutiliza `assets/cartas/marca_ancestral.png` (ya en uso): `cartas-arte.js` no necesita entrada y degrada a la ficha de texto (ADR-008) si el manifiesto no la conoce.

### 1.6 `canjes_tienda`: tercer origen

`CHECK (origen IN ('mostrador','premio_semanal','premio_set'))` (ALTER en 065). `marca_id` **sigue NOT NULL**: el premio 4/4 se entrega como fila con `marca_id` = la marca del SKU premio (`ancestral_premio_set`), que por 1.4 siempre tiene marca. **No hace falta tocar el NOT NULL**, y no se toca.

---

## 2. Contrato de API (todo por ramas existentes: 8/8 funciones agotadas)

### 2.1. `GET /api/interacciones?tipo=consumibles`

- SELECT principal (`:9833-9839`) pasa a: `clave, nombre, descripcion, precio_xp, categoria, era_exclusiva, faccion_requerida, nivel_requerido, cargas, duracion_horas, bono_accion, bono_xp_fijo, limite_diario, icono, bono_pct, bono_tope_xp, es_permanente, otorga_carta, desbloquea_set`.
- **Degradacion intacta:** pre-064 el intento 1 falla (42703) y cae al intento 2 (contrato 057) y luego al 3. El cliente debe tolerar `null`/ausente en los 5 campos nuevos (fail-open visual, ADR-008).
- Campos **aditivos** por fila (solo con sesion): `bono_efecto` = entrada vigente del usuario para esa clave (`{expira_en, bono_acumulado_xp, bono_tope_xp}` | null) y `bloqueado='YA_POSEES'` cuando la fila declara `desbloquea_set` y el usuario ya tiene el acceso. Sin sesion, ambos `null`.
- Errores: los mismos de hoy (503 si no existe ni la tabla).

### 2.2. `POST /api/interacciones?tipo=comprar_consumible`

Orden de gates (se conserva, se anaden dos NEW y se retira uno):

1. sesion firmada -> `responderSesion` (heredado, `:14017-14021`)
2. `clave` -> 400
3. catalogo -> 503 `Consumibles no disponibles`
4. faccion -> 403 `FACCION_INSUFICIENTE`
5. nivel -> 403 `NIVEL_INSUFICIENTE`
6. era -> 403 `ERA_INSUFICIENTE`
7. XP disponible -> 409 `XP insuficiente` (heredado; es lectura, no defensa: la defensa es el WHERE de 9)
8. amuleto -> 409 (heredado)
9. **RETIRADO** stock 30: se elimina `ccStockTope` (`:14130`), el pre-chequeo `STOCK_LLENO` (`:14135-14139`) y el predicado `$4::int` del WHERE (`:14161-14162`). El tope solo aplicaba a `'faccion'`, y las filas del set son `'general'` (H29): nadie pierde nada.
10. **NEW (punto 7): cobro + flag del set en UNA SOLA sentencia, con las dos condiciones de carrera en el WHERE.** **No hay pre-chequeo `YA_POSEES` bloqueante** (seria TOCTOU): el `YA_POSEES` sale del **0 filas**, igual que `SIN_STOCK` sale del 0 filas en `:14291-14298`.

```sql
WITH g AS (SELECT gen_random_uuid() AS cid)          -- id de la compra, conocido antes del INSERT
, cobro AS (
    UPDATE usuarios u SET
      xp_total = u.xp_total - $1,
      capacidades = COALESCE(u.capacidades,'{}'::jsonb)
        || jsonb_build_object('consumibles',
             COALESCE(u.capacidades->'consumibles','{}'::jsonb)
             || jsonb_build_object($2::text,
                  COALESCE((u.capacidades->'consumibles'->>$2::text)::int, 0) + 1))
        || CASE WHEN $4::text IS NULL THEN '{}'::jsonb
                ELSE jsonb_build_object('sets_acceso',
                     COALESCE(u.capacidades->'sets_acceso','{}'::jsonb)
                     || jsonb_build_object($4::text, jsonb_build_object(
                          'desde', $5::text, 'origen', 'compra',
                          'compra_id', g.cid, 'consumible', $2::text,
                          'xp_pagado', $1)))
           END
      FROM g
     WHERE u.id = $3
       AND u.xp_total >= $1
       AND GREATEST(u.xp_total - COALESCE(u.xp_gastado_sinks, 0), 0) >= $1
       -- (a) carrera del flag: la base NO se recompra (respuesta (b) del operador)
       AND ($4::text IS NULL
            OR NOT (COALESCE(u.capacidades->'sets_acceso','{}'::jsonb) ? $4::text))
    RETURNING u.xp_total, u.capacidades, g.cid
), ins AS (
    INSERT INTO compra_consumibles (id, usuario_id, consumible_id, xp_pagado)
    SELECT cobro.cid, $3, $6::uuid, $1 FROM cobro
    RETURNING id
)
SELECT (SELECT count(*) FROM cobro)::int            AS cobrado,
       (SELECT cid::text FROM cobro LIMIT 1)        AS compra_id,
       (SELECT xp_total FROM cobro LIMIT 1)         AS xp_total;
```

- Placeholders: `$1` precio, `$2` clave, `$3` usuario, `$4` `desbloquea_set`|null, `$5` `desde` ISO|null, `$6` `consumible_id` uuid. **6, no 4**: se retira el `$4` del tope de stock y entran los tres del set/compra. **Ningun placeholder cambia de sitio**: `$1`/`$2`/`$3` conservan su orden historico y `$4` sigue siendo el ultimo del WHERE.
- `ins` **cuelga de `cobro`** (patron H26): si el cobro no escribe, no hay fila en `compra_consumibles`. Se acaba el par cobro/ledger en dos pasos.
- `compra_id` es real porque el `id` de `compra_consumibles` es `uuid DEFAULT gen_random_uuid()` (`010:31`) y se genera en `g`: **no hace falta `RETURNING id` ni un segundo UPDATE**. Es lo que permite cumplir "mismo UPDATE" sin perder trazabilidad.
- **0 filas (`cobrado = 0`) -> 409.** El texto se elige con un `SELECT capacidades` **posterior y solo diagnostico** (no defensa): si `capacidades->'sets_acceso'` tiene el set -> `409 {ok:false, error:'YA_POSEES', desbloquea_set:set}`; si no -> `409 {ok:false, error:'XP insuficiente para la compra'}` (texto historico intacto). Ese SELECT nunca decide si se cobra.
- La fila de `capacidades.consumibles` se incrementa igual que hoy (es el stock que consume `consumible_entregar`, `:16871-16872`), tambien para la base.
- **Efectos posteriores al cobro, tolerantes a fallo (nunca revierten la compra ya cobrada):**
  1. `otorga_carta` -> `INSERT INTO usuarios_cartas ... ON CONFLICT (usuario_id, carta_id, variante) DO UPDATE SET cantidad = cantidad + 1, activo = true` (idempotente; S-15 lo repara si falla).
  2. si `desbloquea_set` y el cobro escribio -> **no hay nada mas que hacer aqui**: el flag ya esta en `capacidades` (paso 10). **Es el unico sitio donde se escribe `sets_acceso`.**
  3. si el set queda 4/4 -> `otorgarPremioSetSiCompleto(...)` (2.9), idempotente por `clave_idempotencia`.
- Respuesta 200: **los 7 campos actuales intactos** + `otorga_carta`, `desbloquea_set`, `carta_otorgada` (bool), `acceso_set` (string|null), `premio_set` (`{clave, estado:'pendiente'}`|null).
- **Si un fallo post-cobro dejara el flag sin escribir** (imposible por construccion: va en el mismo UPDATE, pero se declara el plan): se corrige con **backfill desde `compra_consumibles`** (nunca borrando), documentado en 6.2. La compra existe, el flag se deriva de ella.

### 2.3. `POST /api/interacciones?tipo=usar_consumible`

1. `clave` -> 400; catalogo -> 404 `Consumible no existe` (heredado)
2. **NEW** `SELECT es_permanente, bono_pct, bono_tope_xp, duracion_horas` en **su propia consulta con `try/catch`** (mismo patron que el SELECT de faccion `:14221-14231`): si falta 064, `ucNew = null` y todo sigue como hoy.
3. **NEW** `es_permanente === true` -> **409 `{ok:false, error:'CONSUMIBLE_PERMANENTE', clave}`**. Va ANTES de cualquier rama: es el candado que impide consumir la base Ancestral (un flag en JSONB no puede frenar el descuento de stock; el candado tiene que estar en el dato del catalogo, que es lo que la rama lee).
4. **NEW** rama `bono_pct > 0` (preferente sobre `categoria='faccion'`), **atomica de una sola sentencia (punto 7)**:
   - `INSERT consumo_consumibles` NO va antes; el sello y el descuento de stock van en el **mismo UPDATE**, y el ledger append-only va **despues**, condicionado a que el UPDATE haya escrito.
   - **La ventana del cooldown va en el WHERE, no en un pre-chequeo**: `COALESCE(capacidades->'consumible_efectos'->$2->>'expira_en','') <= $3::text`. **0 filas = 409**, igual que `:14291-14298`.
   - Forma:

```sql
UPDATE usuarios SET capacidades = COALESCE(capacidades,'{}'::jsonb)
  || jsonb_build_object('consumibles',
       COALESCE(capacidades->'consumibles','{}'::jsonb)
       || jsonb_build_object($2::text,
            COALESCE((capacidades->'consumibles'->>$2::text)::int, 0) - 1))
  || jsonb_build_object('consumible_efectos',
       COALESCE(capacidades->'consumible_efectos','{}'::jsonb)
       || jsonb_build_object($2::text, $4::jsonb))
 WHERE id = $1
   AND COALESCE((capacidades->'consumibles'->>$2::text)::int, 0) >= 1              -- stock
   AND COALESCE(capacidades->'consumible_efectos'->$2::text->>'expira_en','') <= $3::text  -- ventana
 RETURNING capacidades;
```

   - `$4::jsonb` es la entrada ya construida en JS: `{clave, activo_desde, expira_en, bono_pct, bono_tope_xp, bono_acumulado_xp:0}`. **No se toca `bono_acumulado_xp` de otras claves** (el mapa es aditivo, ADR-003).
   - **Invariante de comparacion:** todos los `expira_en` de este mapa los escribe este mismo codigo con `new Date(ms).toISOString()` (24 caracteres, UTC, mismo formato), luego la comparacion lexicografica de texto es exacta. Un `expira_en` ausente o vacio -> `''` <= `$3` -> ventana libre. Es el mismo criterio de texto que ya usa `consumirBonoFaccion`.
   - **0 filas -> 409**, y el texto se elige con un `SELECT capacidades` **posterior y solo diagnostico**: si `consumible_efectos[clave].expira_en > ahora` -> `409 {ok:false, error:'EFECTO_YA_ACTIVO', efecto:{clave, expira_en}}`; si no -> `409 SIN_STOCK`. **Ningun pre-chequeo es la defensa.**
   - Despues: `INSERT consumo_consumibles` (append-only, `efecto_detalle` = la entrada sellada) **condicionado a las filas devueltas**.
   - 200 `{ok:true, efecto:{clave, activo_desde, expira_en, bono_pct, bono_tope_xp, bono_acumulado_xp:0}}`
5. Rama `categoria='faccion'` **sin cambios** (solo alcanzable con `bono_pct = 0`): es la via de rollback y de efectos legacy. **No se reescribe** (respuesta (d): lo que se autoriza es `consumirBonoFaccion`, no esta rama).
6. Resto de claves clasicas: intactas.

### 2.4. Acreditacion del bono (no es rama publica: es el hook)

**Punto de enganche unico elegido: `registrarXpLedger`** (`:2009`), no `calcularXpAcreditado` (`:1936-1969`) ni los 5 sitios del bono plano.

- Motivo: `registrarXpLedger` es el punto que **toda** acreditacion por codigo atraviesa (48 llamadas, H3), ya es `async`, ya recibe `sql`, y ya sabe `accion`, `xp_base`, `xp_final` y `es_exento`. `calcularXpAcreditado` es una funcion de CALCULO: si acreditara dinero, cobraria aunque el caller luego no persista la accion.
- **Fuera del hook, por construccion:** los 2 `INSERT` directos a `xp_ledger` de `:15651-15660` (`carta_venta_debito/credito`) no pasan por `registrarXpLedger` y ademas son `es_exento=true`. No hay que hacer nada con ellos, y no pueden recibir bono.

#### Predicado en TRES capas, con default NEGAR (punto 4)

```js
// Capa 2: allowlist MEDIDA. Solo lo que aparece aqui puede cobrar bono.
var BONO_APLICA = {
  voto_media: true, chat_comentario: true, ao_proponer: true, ao_votar: true,
  ao_checkin: true, plan_crear: true, plan_unirse: true, foto_viajero: true,
  album_foto: true, album_crear: true, album_foto_autor: true,
  album_guardado: true, album_guardado_autor: true, compartir: true,
  spot_atributos: true, publicar_lugar: true, resena_corta: true,
  resena_larga: true, guardado: true, visita: true, rating: true
};

// Capa 3: lista negra EXPLICITA por accion (documenta la semantica y frena
// un alta accidental en BONO_APLICA). Sin prefijos dinamicos: nombres exactos
// + las 3 familias que el sistema nombra con prefijo.
var BONO_EXCLUIDAS = {
  mision: true, logro: true, referido: true, referidos_directos: true,
  admin_xp: true, ajuste_xp: true, ajuste_admin: true, compra_consumible: true,
  bono_faccion_era1: true, bono_consumible_24h: true,
  dm_nuevo: true, tithe_parche: true, pandilla_reto: true,
  carta_evento: true, carta_fusion: true, carta_venta_debito: true,
  carta_venta_credito: true, orden_compra_escrow: true, orden_match_venta: true,
  mercado_compra: true, mercado_venta: true, mercado_producir: true,
  contrato_escrow: true, contrato_pago: true, contrato_devolucion: true,
  reclamar_regalias: true, spot_dividendo_debito: true,
  spot_dividendo_credito: true, spot_dividendo_manual: true
};

function accionConBono(accion) {
  var a = String(accion || '');
  if (!a) return false;
  if (BONO_EXCLUIDAS[a] === true) return false;        // capa 3
  return BONO_APLICA[a] === true;                      // capa 2: desconocida -> NO
}
```

Predicado final (las 3 capas juntas): **`d.es_exento !== true && xp_final > 0 && accionConBono(d.accion)`**. **Una accion no clasificada NO cobra bono**: el silencio del default es negar, no conceder. Es el cambio de v1 (alli el default era "aplicar" y una accion de sistema sin `es_exento` heredaba faucet).

#### Clasificacion de las 48 llamadas, una a una (H3)

**A) COBRAN BONO: 27 llamadas / 21 acciones distintas (todas con `es_exento` omitido, es decir `false`)**

| `accion` | Lineas | N. |
|---|---|---|
| `voto_media` | 6244 | 1 |
| `chat_comentario` | 6510, 11818, 12206 | 3 |
| `ao_proponer` | 11320, 11327 | 2 |
| `ao_votar` | 11432 | 1 |
| `ao_checkin` | 11548 | 1 |
| `plan_crear` | 12025, 12032 | 2 |
| `plan_unirse` | 12103, 12110 | 2 |
| `foto_viajero` | 12503 | 1 |
| `album_crear` | 13033 | 1 |
| `album_foto` | 12763, 13152 | 2 |
| `album_foto_autor` | 13185 | 1 |
| `album_guardado` | 13463 | 1 |
| `album_guardado_autor` | 13478 | 1 |
| `compartir` | 15007 | 1 |
| `spot_atributos` | 15103 | 1 |
| `publicar_lugar` | 18254, 18503 | 2 |
| `resena_corta` / `resena_larga` | 18703 (un solo sitio, ternario) | 1 |
| `guardado` | 18839 | 1 |
| `visita` | 19092 | 1 |
| `rating` | 19235 | 1 |

Suma: **27**. No hay ninguna accion de sistema en este grupo: la revision fue negativa, no correctiva.

**B) NO COBRAN BONO: 21 llamadas, todas con `es_exento:true` literal**

| `accion` | Lineas | Motivo |
|---|---|---|
| `spot_dividendo_debito` / `spot_dividendo_credito` | 1487, 1495 | transferencia interna entre usuarios |
| `bono_faccion_era1` | 4938 | asiento del bono plano (anti-doble-pago) |
| `tithe_parche` | 5161 | traspaso a pandilla |
| `pandilla_reto` | 5217 | reparto interno |
| `mision` | 5646 | misiones ya pagan su XP; no se bonifica el pago |
| `logro` | 5816 | idem logros |
| `dm_nuevo` | 12333 | apertura de DM (resta auditada) |
| `admin_xp` | 13683 | ajuste de administrador |
| `compra_consumible` | 14184 | compra (resta) |
| `reclamar_regalias` | 14642 | liquidacion de regalias |
| `carta_evento` | 15351 | marca de evento, `xp_base=0` |
| `carta_fusion` | 16022 | fusion (resta) |
| `orden_compra_escrow` / `orden_match_venta` | 16266, 16380 | escrow del mercado de cartas |
| `mercado_compra` / `mercado_venta` / `mercado_producir` | 17677, 17683, 17814 | mercado (restas y abonos internos) |
| `contrato_escrow` / `contrato_pago` / `contrato_devolucion` | 17897, 18012, 18076 | contratos |
| **Total** | **21** | |

**C) `referidos`.** No existe ninguna llamada con `accion` de referidos en `registrarXpLedger` (solo la clave de tope `referidos_directos` en `:10667`). Se declara igualmente en `BONO_EXCLUIDAS` (`referido`, `referidos_directos`) porque el operador la nombro y porque, si se anade una llamada con ese nombre, **la capa 2 ya la negaria** (no esta en `BONO_APLICA`) y la capa 3 la documenta.

**D) Clasificacion incompleta = NO.** El riesgo R4 de 6 deja de ser "acciones mal marcadas que heredan bono" y pasa a ser "accion nueva que no se clasifica y **no cobra**": un bono que falta se detecta (queja del jugador), un faucet silencioso no.

#### Calculo y credito

- `bono = red2(min(xp_base * pct / 100, tope - acumulado))`, con `xp_base` **del ledger** (base pura: el bono no entra en `calcularXpFinal`, no toca `mult_nivel`/`mult_stack`, no sufre los caps 5.0/10.0).
- **Un solo UPDATE condicionado** (espejo de `consumirBonoFaccion:4915-4932`): sube `xp_total` **y** `bono_acumulado_xp` en la MISMA sentencia, con `WHERE ... expira_en = <texto leido> AND bono_acumulado_xp < bono_tope_xp`. 0 filas = nada se acredita (jamas se duplica). Se condiciona por `expira_en` **textual** y no por clave para que un re-sello (nueva activacion) invalide el credito en vuelo.
- Asiento propio: `accion='bono_consumible_24h'`, `xp_base: 0`, mults 1, `bonos_planos: bono`, `xp_final: bono`, `es_exento: true`, `bono_de: <clave>`, `contexto: {consumible_clave, accion_origen, bono_pct, bono_acumulado_xp}`.
- Guardas duras: `if (d.bono_de) return` (anti-recursion; el asiento hijo ademas cae en `BONO_EXCLUIDAS` y en `es_exento:true`) y `try/catch` completo (el bono nunca puede tumbar el ledger).
- **`consumirBonoFaccion` (autorizado por el operador, respuesta (d)):** se le anade **una sola guarda** al principio, antes de leer/normalizar el efecto: `if (caps && caps.consumible_efectos && caps.consumible_efectos[clave]) return null;` con su comentario `// ADR-120: la clave vive en el mapa nuevo -> el pago lo hace acreditarBonoGlobal (anti-doble-pago)`. Razon: un efecto legacy sellado antes de 064 sobre una de las 4 claves podria seguir vivo; su `bono_xp_fijo` ya es 0 tras 064, pero la guarda lo hace **imposible por construccion** en vez de depender del dato. **Cero cambios en su SQL de consumo** y cero cambios en su firma; si `!caps` no hay guarda y todo sigue como hoy.

### 2.5. `POST ?tipo=consumible_entregar` (mostrador)

- SELECT del catalogo (`:16841-16845`) gana `c.otorga_carta` (en su propio intento, con degradacion a la version actual si 42703: la rama no puede romperse antes de aplicar 064).
- `pick` (`:16850-16858`) pasa de `ct.origen = 'premio_semanal'` a **`ct.origen IN ('premio_semanal','premio_set')`**. Sin este cambio, un premio de set queda `pendiente` para siempre.
- El resto de la sentencia **no se toca**: sigue siendo una sola sentencia con `pick`/`upd`/`ins`/`d` (H26), con el cierre fail-closed por stock de billetera (`:16871-16872`) y el descuento unico (`:16891-16904`).
- Tras el exito (hook **post-commit, tolerante a fallo**, nunca dentro de la sentencia):
  - `otorga_carta` -> upsert en `usuarios_cartas` (idempotente por PK de 3 columnas);
  - si el set queda 4/4 -> `otorgarPremioSetSiCompleto` (2.9).
- Errores: los actuales (400/403/409/503). Nuevo unico: si el `UPDATE` de la carta falla **no** se devuelve error (la entrega fisica ya ocurrio): 200 con `carta_otorgada:false` y `warn`. La carta se recupera con el backfill de S-15 (idempotente, `ON CONFLICT`).

### 2.6. `GET /api/interacciones?tipo=misiones`

**Cambio de v1 a v2 (punto 5):** v1 filtraba `resMisiones.data` **despues** de `entregarCatalogo`, que **whitelistea campos y descarta `requiere_set`** (H8, `:5847-5855`): el filtro no podia ver el campo y las 4 misiones habrian viajado a todos. v2 filtra **el catalogo** antes de entregar.

- **Filtro previo a `entregarCatalogo` (`:7396`):**
  `var accesoSet = tieneAccesoSet(caps, 'ancestral_esencia');`
  `var catalogoVis = MISIONES.filter(function(m){ return !m.requiere_set || tieneAccesoSet(caps, m.requiere_set); });`
  `var resMisiones = entregarCatalogo(catalogoVis, progresoMisiones, meta);`
- **`total` pasa a `resMisiones.data.length`** (hoy `MISIONES.length`, `:7405`). Con esto, **el payload de quien NO tiene acceso es byte-identico al de hoy**: mismas misiones, mismo `total`, mismo `desbloqueadas`, cero campos nuevos (no se anade `requiere_set` al payload). Es la lectura literal de "el contrato no cambia para quien no tiene acceso".
- **Gate real en `evaluarMisiones` (no cosmetico):** antes de evaluar los checks de cada mision, `if (m.requiere_set && !tieneAccesoSet(ctx.caps, m.requiere_set)) continue;`. Sin esto, un jugador sin acceso podria **completar** una mision oculta (su check `totalGuardados` no depende del set) y cobrar sus 50/60/80/100 XP por `mision` (asiento exento, pero XP real). El filtro del GET es de presentacion; **este es el de seguridad**.
- `ctx` gana **un** campo: `accesoAncestral` (derivado de `capacidades.sets_acceso.ancestral_esencia`), leido en el `SELECT` de `evaluarMisiones` (`:5594-5597`) que gana la columna `capacidades`. Compat: si `sets_acceso` no existe -> `false` -> las 4 no se evaluan y no se sirven.
- Las 4 misiones nuevas: `grupo:'general'` (evita un acordeon huerfano en `mi-perfil.html`), `requiere: []`, sin `rama` ni `puntos_rama`, **`requiere_set:'ancestral_esencia'`**:

| id | nombre | xp | check |
|---|---|---|---|
| `mis_ancestral_acceso` | Acceso a la Casa Ancestral | 50 | `ctx.accesoAncestral === true` |
| `mis_ancestral_guarda` | Guarda un destino con la Casa Ancestral | 60 | `ctx.totalGuardados >= 1` |
| `mis_ancestral_resena` | Resena desde la Casa Ancestral | 80 | `EXISTS interacciones tipo='resena' activo` |
| `mis_ancestral_canje` | Canjea un volumen del set | 100 | `EXISTS canjes_tienda estado='entregado' AND consumible_clave IN (3 volumen)` |

### 2.7. `GET /api/usuarios?tipo=cartas` (`cartas_mias`)

- SELECT (`:997-1013`) gana `c.set_coleccion`, **en dos niveles**: intento 1 con la columna; ante 42703 se reintenta con el SELECT actual y `set_coleccion=false` en el mapeo. (No se puede permitir que un despliegue de codigo previo a 065 tumbe `cartas_mias` a 503: hoy ya degradaria por `responderSchemaPendiente`.)
- `cmReq` (`:1024-1033`) pasa a:

```sql
SELECT c.set_slug, c.nivel_gate, COUNT(DISTINCT c.id)::int AS total,
       COUNT(DISTINCT c.id) FILTER (WHERE uc.activo = true
                                    AND uc.cantidad >= 1)::int AS obtenidas
  FROM cartas_catalogo c
  LEFT JOIN usuarios_cartas uc ON uc.carta_id = c.id AND uc.usuario_id = $1
 WHERE c.activo = true
   AND (c.nivel_gate IN (10,14,20,25) OR c.set_coleccion = true)
 GROUP BY c.set_slug, c.nivel_gate
 ORDER BY c.nivel_gate ASC NULLS LAST, c.set_slug ASC
```

  (misma degradacion en dos niveles; sin `set_coleccion` se usa la query literal de hoy).
- `requisitos[]` puede traer ahora `nivel_gate: null` + `set_slug`. Eso es el **progreso 4/4 sin gate**: no se inventa un nivel, se emite el set. El cliente que no conozca el caso mostrara "Nivel null"; por eso el cambio de cliente es obligatorio (seccion 3).
- `cartas[]` gana `set_coleccion` (bool) para que el cliente no ofrezca intercambio.
- `museo_cartas` (`api/usuarios.js:1165-1174`): **sin cambios**.

### 2.8. `POST ?tipo=carta_intercambiar` (guard del set)

- El SELECT del catalogo (`:15389-15397`) gana `set_coleccion` con `try/catch` propio; si es `true` -> **400 `{ok:false, error:'CARTA_DE_SET_NO_INTERCAMBIABLE', carta_id}`**. Sin este guard, un jugador puede regalar la 750 ml y el 4/4 se pierde para siempre (no hay recompra de esa carta: solo se obtiene canjeando el SKU).

---

### 2.9. Premio 4/4: `otorgarPremioSetSiCompleto` en **una sola sentencia** (punto 8)

**Cambio de v1 a v2:** v1 hacia `INSERT` del canje **y luego** el abono de la unidad en dos pasos (dos `await sql`), que es justo el patron prohibido. v2 usa **un unico statement con CTE** (H26): el abono **cuelga del `RETURNING` del `INSERT`**, igual que `:16993-16994`.

```sql
WITH cuenta AS (
  SELECT COUNT(DISTINCT uc.carta_id)::int AS n
    FROM usuarios_cartas uc
    JOIN cartas_catalogo c ON c.id = uc.carta_id
   WHERE uc.usuario_id = $1::uuid
     AND c.set_slug = $2::text
     AND c.activo = true
     AND uc.activo = true
     AND uc.cantidad >= 1
), prem AS (
  SELECT k.id, k.clave, k.marca_id
    FROM consumibles k
   WHERE k.premio_set = true AND k.activo = true
   ORDER BY k.clave ASC LIMIT 1
), ins AS (
  INSERT INTO canjes_tienda (usuario_id, marca_id, billetera_id,
         codigo_publico_snapshot, consumible_id, consumible_clave,
         cantidad, precio_xp_unitario, xp_total,
         origen, estado, contexto, clave_idempotencia)
  SELECT $1::uuid, p.marca_id, w.id, COALESCE(w.codigo_publico, ''),
         p.id, p.clave, 1, 0, 0,
         'premio_set', 'pendiente',
         jsonb_build_object('set_slug', $2::text, 'premio_set', p.clave),
         'premio_set:' || $2::text || ':' || $1::text
    FROM prem p CROSS JOIN cuenta c
    LEFT JOIN billeteras w ON w.usuario_id = $1::uuid      -- mismo patron que :17218
   WHERE c.n >= $3::int          -- $3 = 4 (cartas exigidas por el set)
     AND p.marca_id IS NOT NULL
  ON CONFLICT (clave_idempotencia) DO NOTHING
  RETURNING consumible_clave, cantidad
), ab AS (
  UPDATE usuarios u SET capacidades =
         COALESCE(u.capacidades,'{}'::jsonb)
      || jsonb_build_object('consumibles',
           COALESCE(u.capacidades->'consumibles','{}'::jsonb)
           || jsonb_build_object((SELECT consumible_clave FROM ins),
                COALESCE((u.capacidades->'consumibles'->>(SELECT consumible_clave FROM ins))::int, 0)
                + (SELECT cantidad FROM ins)))
   WHERE u.id = $1::uuid
     AND EXISTS (SELECT 1 FROM ins)     -- abono CONDICIONADO al RETURNING del INSERT
  RETURNING u.xp_total
)
SELECT (SELECT count(*) FROM ins)::int AS premio_insertado,
       (SELECT count(*) FROM ab)::int  AS abonado;
```

- **Idempotencia doble:** el `UNIQUE uq_canjes_tienda_idem` (H30) frena el replay; como `ins` vuelve vacio, `ab` **no escribe** -> 0/0. Ni premio duplicado ni saldo duplicado.
- **Por que hay abono (respuesta (a) del operador):** el premio real es la **fila de `canjes_tienda`**, que es la orden de entrega del SKU fisico (`premio_set=true`, `precio 0`, `otorga_carta=NULL`: **no entrega carta extra**). La unidad en `capacidades.consumibles` es **obligatoria** porque `consumible_entregar` cierra el canje **fail-closed** contra el stock de la billetera (`:16871-16872`): sin ese +1, el premio quedaria `pendiente` para siempre.
- `marca_id` se toma de la **propia fila del SKU** (que lo tiene por construccion, 1.4): no se resuelve marca por nombre en tiempo de ejecucion.
- Llamado **solo** desde 2.2 (compra) y 2.5 (entrega), siempre `try/catch`: no puede tumbar la compra ni la entrega.
- Si `cuenta.n < 4`, el `INSERT` no selecciona filas: la sentencia termina en 0/0 sin error. No hay pre-chequeo separado.

---

## 3. Cambios por archivo (rangos verificados)

### `api/interacciones.js` (el grueso)

| # | Zona | Que se hace |
|---|---|---|
| 1 | `:4849-4879` | Se conservan `efectoFaccionVigente` y `ventanaFaccionAbierta` **sin tocar**. Se anaden debajo los 3 predicados nuevos (`efectoBonoVigente`, `ventanaBonoAbierta`, `efectoBonoGanador`), puras, sin `sql`. |
| 2 | `:4891-4951` | `consumirBonoFaccion` **intacta salvo la guarda anti-doble-pago** de 2.4 (1 linea al principio + comentario): si la clave del efecto vive en `consumible_efectos`, devuelve `null`. Autorizado por el operador (respuesta (d)). |
| 3 | `:2009-2033` | `registrarXpLedger`: al final del cuerpo (despues del INSERT y dentro del mismo `try`), hook `await acreditarBonoGlobal(sql, d)`. Guardas `d.bono_de`, `d.es_exento`, `d.xp_final > 0` y **`accionConBono(d.accion)` (default NEGAR)**. El asiento del bono se escribe con `registrarXpLedger` recursivo controlado por `bono_de`. **Nunca propaga excepcion.** |
| 4 | nuevo, junto a `:4951` | `acreditarBonoGlobal(sql, d)` + `BONO_APLICA` / `BONO_EXCLUIDAS` / `accionConBono()` (2.4): leer `capacidades` (1 SELECT, criterio de `leerCapacidades:4805`), elegir ganador, calcular, UPDATE condicionado por `expira_en` textual y tope, asiento propio. |
| 5 | `:5591-5610` | `evaluarMisiones`: el SELECT gana `capacidades`; `ctx.accesoAncestral`; helper `tieneAccesoSet(caps, set)`; **gate `if (m.requiere_set && !tieneAccesoSet(...)) continue;` antes de los checks** (2.6). |
| 6 | `:3878-...` | 4 misiones nuevas en `MISIONES` con `requiere_set` (bloque propio al final del array, ids de 2.6). |
| 7 | `:7378-7406` | **Filtro del catalogo ANTES de `entregarCatalogo`** (`:7396`) + `total = data.length` (2.6). **No se anade `requiere_set` al payload**: el contrato de quien no tiene acceso no cambia. |
| 8 | `:9833-9875` | SELECT del catalogo de consumibles con los 5 campos nuevos (ladder intacta) + `bono_efecto`/`YA_POSEES` por fila (solo lectura, cosmetico). |
| 9 | `:14012-14199` | Retirada de `ccStockTope` (`:14130`), del pre-chequeo `STOCK_LLENO` (`:14135-14139`) y del `$4` del WHERE (`:14161-14162`); **cobro + flag en un solo statement CTE** (2.2, `cobro` + `ins`), 6 placeholders; 0 filas = 409 con diagnostico posterior; post-efectos (carta + premio) tolerantes. |
| 10 | `:14203-14309` | `es_permanente` -> 409; rama `bono_pct > 0` con **stock y ventana en el WHERE** del unico UPDATE (2.3), 0 filas = 409 con diagnostico posterior; rama faccion intacta. El SELECT de catalogo nuevo va en su propio `try`. |
| 11 | `:15389-15397` | Guard `set_coleccion` -> 400 `CARTA_DE_SET_NO_INTERCAMBIABLE`. |
| 12 | `:16841-16845` | `c.otorga_carta` (degradable). |
| 13 | `:16850-16858` | `origen IN ('premio_semanal','premio_set')`. |
| 14 | nuevo, tras `:16910` | `otorgarPremioSetSiCompleto(sql, usuarioId, setSlug, 4)`: **una sola sentencia CTE** de 2.9 (`ins` + `ab` condicionado). Prohibido partirla en dos `await sql`. |

**Nota de alcance:** ningun cambio de este listado escribe `precio_xp` de las 3 filas `ancestral_*` de volumen. El unico sitio que menciona precios es el `UPDATE` de las 4 cartas de bono (064) y el `INSERT` de `ancestral_base`. Si una propuesta de implementacion toca `precio_xp` de las 3 claves, esta fuera de spec.

### `api/usuarios.js`

| # | Zona | Que se hace |
|---|---|---|
| 1 | `:997-1013` | `c.set_coleccion` en el SELECT, con reintento degradado. |
| 2 | `:1024-1033` | `cmReq` con la rama `set_coleccion` (2.7), con reintento degradado. |
| 3 | `:1076-1112` | Mapeo: `set_coleccion: c.set_coleccion === true`. `requisitos` ya devuelve `set_slug` y `nivel_gate` tal cual: no hay que anadir campo. |

### `admin.html`

| # | Zona | Que se hace |
|---|---|---|
| 1 | `:10210-10330` | Formulario de consumible (payload crear/editar + `loadForm`): **5 campos nuevos** (`bono_pct`, `bono_tope_xp`, `es_permanente`, `desbloquea_set`, `otorga_carta`) con valores por defecto 0/0/false/null/null. `premio_set` **no se expone** en el formulario: es un flag de sistema (1 fila, la siembra 064). Solo admin (ADR-028: el catalogo es administrable). |

### `mi-perfil.html`

| # | Zona | Que se hace |
|---|---|---|
| 1 | `:7422-7450` | Render de `requisitos`: si `r.nivel_gate == null` -> etiqueta `Set <set_slug>` (o "Set Ancestral" via `stats_json`/`set_slug`), progreso `obtenidas/total`, **sin** boton "Activar gate". |
| 2 | `:7461-7470` | No ofrecer "Intercambiar" cuando `c.set_coleccion === true`. |

### `scripts/` y `package.json`

| # | Archivo | Que se hace |
|---|---|---|
| 1 | `scripts/smoke_064_bono_global_pct.js` (**nuevo**) | Harness `vm` + fake SQL, patron `scripts/smoke_057_consumibles_faccion.js`. Bloques S-4 y S-5. |
| 2 | `scripts/smoke_065_set_ancestral.js` (**nuevo**) | Mismo harness. Bloques S-6, S-7, S-8. |
| 3 | `package.json:7` | Anadir los 2 smokes a `test` (despues de `smoke_057_consumibles_faccion.js`) y 2 alias en `scripts`. |

---

## 4. Migraciones

### 4.1. `db/migrations/064_consumibles_bono_global_pct.sql`

ASCII puro, idempotente, cero DELETE/DROP de datos, cabecera espejo de 057/058 (proposito, precondiciones, idempotencia, atomicidad, orden de despliegue, verificacion, rollback).

**Punto 6 de la revision: CERO `BEGIN` / `COMMIT` ejecutables.** El runner divide por `;` y ejecuta sentencia a sentencia con el driver **HTTP** de Neon (`scripts/apply_sql_file.js:11`, `:155`, `:349-359`, `:651`, `:755-763`, H25): **no hay transaccion**. Un `BEGIN;` no envuelve nada, y si una sentencia posterior falla el runner corta (`:357`) **dejando la transaccion abierta**; un `COMMIT;` final seria ademas un statement suelto. Por eso la atomicidad se resuelve **sentencia a sentencia**: cada `ALTER`, cada `DO` y cada `UPDATE`/`INSERT` es atomico por si mismo, y las que deben ir juntas van **dentro del mismo `DO`**. **Ningun `BEGIN`/`COMMIT`, ni siquiera comentado como parte del script.**

```sql
-- ============================================================================
-- Migration 064: consumibles - BONO GLOBAL +% durante 24 h (cartas de bono)
--   y SET ANCESTRAL (2 filas nuevas + vinculo de las 3 filas de 058).
-- Fecha: 2026-11-10   (v2: revisada por @architect-review)
-- Referencias: ADR-120 (D1..D5, D9, D12), ADR-002 (ASCII-safe), ADR-003 (cero
--   borrado logico: MERGE por clave, ningun DELETE), ADR-006 (baseline = fila
--   real leida antes de reescribir), ADR-008 (idempotencia), ADR-118.
-- Requiere: 010 (consumibles), 017/018/027 (categoria, marca_id, stock),
--   057 (columnas de efecto), 058 (premio_semanal + los 3 SKU ancestral),
--   062 (faccion NULL), db/seeds/001_marca_ancestral_vinculo.js (marca).
--
-- QUE HACE
--   1. 6 columnas nuevas en consumibles (5 de bono/carta + premio_set).
--   2. 4 CHECKs guardados por pg_constraint.
--   3. UPDATE acotado a las 4 claves de la 057: precios nuevos,
--      bono_pct/bono_tope_xp, y bono_accion = NULL con bono_xp_fijo = 0
--      (SIN esto el bono plano y el bono % pagarian dos veces la misma
--      accion: riesgo R1 del ADR-120).
--   4. Un DO que exige la marca 'ANCESTRAL' (igualdad exacta) y las 3 filas
--      de 058, escribe otorga_carta en esas 3 y siembra las 2 filas nuevas.
--
-- PRECIOS: 160/260/360/450 (4 cartas de bono) = decision del operador.
--   ancestral_base = 400 XP. ancestral_premio_set = 0 (fila tecnica).
--   LOS 3 SKU DE VOLUMEN CONSERVAN EL PRECIO DE 058 (1166.67/3416.67/6333.33
--   y 14000/41000/76000): esta migracion JAMAS escribe su precio_xp ni su
--   precio_cop. Solo les anade otorga_carta. Prohibido cualquier upsert
--   que los incluya en un VALUES con precio.
--
-- NO TOCA: nombre, activo, categoria, era_exclusiva, faccion_requerida,
--   cargas, limite_diario, icono, premio_semanal, precio_cop de las 3 filas
--   de 058, ni el precio_xp de las 3 filas de 058.
--
-- ATOMICIDAD: el runner NO abre transaccion (driver HTTP de Neon, divide por
--   ';' y corta al primer error). Cada sentencia es atomica por si misma y
--   lo que debe ir junto va en el MISMO DO. NO se escriben BEGIN/COMMIT.
--
-- ORDEN: 064 ANTES de 065. La 057 (si se re-ejecuta) RESTAURA bono_accion /
--   bono_xp_fijo viejos: tras re-ejecutarla hay que re-aplicar esta 064.
-- ============================================================================

-- 1. COLUMNAS -----------------------------------------------------------------
ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS bono_pct       smallint      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bono_tope_xp   numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS es_permanente  boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS otorga_carta   varchar(40)   NULL,
  ADD COLUMN IF NOT EXISTS desbloquea_set varchar(40)   NULL,
  ADD COLUMN IF NOT EXISTS premio_set     boolean       NOT NULL DEFAULT false;

-- 2. CHECKS -------------------------------------------------------------------
DO $mig064ck$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.consumibles'::regclass
                    AND conname  = 'chk_consumibles_bono_pct') THEN
    ALTER TABLE public.consumibles ADD CONSTRAINT chk_consumibles_bono_pct
      CHECK (bono_pct BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.consumibles'::regclass
                    AND conname  = 'chk_consumibles_bono_tope') THEN
    ALTER TABLE public.consumibles ADD CONSTRAINT chk_consumibles_bono_tope
      CHECK (bono_tope_xp >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.consumibles'::regclass
                    AND conname  = 'chk_consumibles_bono_coherente') THEN
    ALTER TABLE public.consumibles ADD CONSTRAINT chk_consumibles_bono_coherente
      CHECK ((bono_pct = 0 AND bono_tope_xp = 0)
          OR (bono_pct > 0 AND bono_tope_xp > 0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.consumibles'::regclass
                    AND conname  = 'chk_consumibles_permanente_coherente') THEN
    ALTER TABLE public.consumibles ADD CONSTRAINT chk_consumibles_permanente_coherente
      CHECK (es_permanente = false OR desbloquea_set IS NOT NULL);
  END IF;
END
$mig064ck$;

-- 3. RECALIBRACION DE LAS 4 CARTAS DE BONO ------------------------------------
--    Solo estas 4 claves. Descripciones ASCII, sin tildes. No prometen bono
--    por familia de accion (lo contrario seria mentir tras el cambio).
UPDATE consumibles AS c SET
  bono_pct       = v.pct,
  bono_tope_xp   = v.tope,
  precio_xp      = v.precio,
  precio_xp_base = v.precio,
  bono_accion    = NULL,
  bono_xp_fijo   = 0,
  nivel_requerido = 4,
  descripcion    = v.descr
FROM (VALUES
  ('consumible_catalejo_explorador', 160, 10, 250,
   'Todas las facciones. +10% de XP en TODAS las acciones durante 24 h, con tope de 250 XP de bono por ventana. No se acumula con otra carta: cuenta el bono mayor. Coste 160 XP.'),
  ('consumible_lupa_curador', 260, 15, 400,
   'Todas las facciones. +15% de XP en TODAS las acciones durante 24 h, con tope de 400 XP de bono por ventana. No se acumula con otra carta: cuenta el bono mayor. Coste 260 XP.'),
  ('consumible_lente_artista', 360, 20, 550,
   'Todas las facciones. +20% de XP en TODAS las acciones durante 24 h, con tope de 550 XP de bono por ventana. No se acumula con otra carta: cuenta el bono mayor. Coste 360 XP.'),
  ('consumible_pluma_creador', 450, 25, 700,
   'Todas las facciones. +25% de XP en TODAS las acciones durante 24 h, con tope de 700 XP de bono por ventana. No se acumula con otra carta: cuenta el bono mayor. Coste 450 XP.')
) AS v(clave, precio, pct, tope, descr)
WHERE c.clave = v.clave;

-- 4. SET ANCESTRAL: vinculo de las 3 filas de 058 + 2 filas nuevas ------------
--    Todo en UN bloque DO por dos razones:
--      (a) fallo EXPLICITO si la marca no existe (igualdad estricta, no ILIKE)
--          o si faltan las 3 filas de 058: la migracion queda 'fallida' en el
--          ledger del runner en vez de escribir un set a medias;
--      (b) marca_id se resuelve UNA vez y se usa en las 2 filas nuevas.
--    Prohibido escribir precio_xp / precio_cop de las 3 filas de 058: su
--    precio es el de 058 y el operador lo conserva.
DO $mig064set$
DECLARE
  v_marca uuid;
  v_filas int;
BEGIN
  SELECT id INTO v_marca FROM public.marcas WHERE nombre = 'ANCESTRAL';
  IF v_marca IS NULL THEN
    RAISE EXCEPTION 'MIG064: no existe la marca con nombre exacto ANCESTRAL';
  END IF;

  SELECT count(*) INTO v_filas FROM public.consumibles
   WHERE clave IN ('ancestral_pocima_50ml',
                   'ancestral_media_375ml',
                   'ancestral_botella_750ml');
  IF v_filas <> 3 THEN
    RAISE EXCEPTION 'MIG064: se esperaban 3 SKU de volumen de la 058 y hay %', v_filas;
  END IF;

  -- 4a. Vinculo SKU -> carta del set (UNICO campo que se escribe en las 3)
  UPDATE public.consumibles c
     SET otorga_carta = v.carta
    FROM (VALUES
      ('ancestral_pocima_50ml',  'cta_ancestral_02'),
      ('ancestral_media_375ml',  'cta_ancestral_03'),
      ('ancestral_botella_750ml','cta_ancestral_04')
    ) AS v(clave, carta)
   WHERE c.clave = v.clave
     AND c.otorga_carta IS DISTINCT FROM v.carta;

  -- 4b. Las 2 filas nuevas (la base permanente y el premio tecnico)
  INSERT INTO public.consumibles
    (clave, nombre, descripcion, precio_xp, precio_xp_base, precio_cop, activo,
     categoria, era_exclusiva, marca_id, faccion_requerida, nivel_requerido,
     cargas, duracion_horas, bono_accion, bono_xp_fijo, limite_diario, icono,
     bono_pct, bono_tope_xp, es_permanente, otorga_carta, desbloquea_set,
     premio_set)
  VALUES
    ('ancestral_base', 'Esencia Ancestral (base)',
     'Compra unica y permanente. Abre el set Ancestral: sus cartas, sus misiones y su premio. No se consume nunca.',
     400, 400, 0, true, 'general', NULL, v_marca, NULL, NULL,
     0, 24, NULL, 0, 0, '&#127807;',
     0, 0, true, 'cta_ancestral_01', 'ancestral_esencia', false),
    ('ancestral_premio_set', 'Premio Set Ancestral 4/4',
     'Puntero del premio del set: se entrega una sola vez al completar las 4 cartas y se reclama en mostrador.',
     0, 0, 0, true, 'general', NULL, v_marca, NULL, NULL,
     0, 24, NULL, 0, 0, '&#127873;',
     0, 0, false, NULL, NULL, true)
  ON CONFLICT (clave) DO UPDATE SET
    nombre          = EXCLUDED.nombre,
    descripcion     = EXCLUDED.descripcion,
    activo          = EXCLUDED.activo,
    categoria       = EXCLUDED.categoria,
    marca_id        = COALESCE(EXCLUDED.marca_id, consumibles.marca_id),
    nivel_requerido = EXCLUDED.nivel_requerido,
    cargas          = EXCLUDED.cargas,
    duracion_horas  = EXCLUDED.duracion_horas,
    limite_diario   = EXCLUDED.limite_diario,
    icono           = EXCLUDED.icono,
    bono_pct        = EXCLUDED.bono_pct,
    bono_tope_xp    = EXCLUDED.bono_tope_xp,
    es_permanente   = EXCLUDED.es_permanente,
    otorga_carta    = EXCLUDED.otorga_carta,
    desbloquea_set  = EXCLUDED.desbloquea_set,
    premio_set      = EXCLUDED.premio_set;
    -- OJO: el DO UPDATE NO reescribe precio_xp / precio_xp_base / precio_cop.
    -- El precio se escribe SOLO en el INSERT (400 y 0); una re-ejecucion
    -- respeta el precio que el admin haya fijado despues. Mismo criterio que
    -- protege a las 3 filas de 058.
END
$mig064set$;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta aqui)
-- ============================================================================
-- (a) 6 columnas (esperado 6):
-- SELECT column_name, data_type, column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name IN ('bono_pct','bono_tope_xp','es_permanente',
--                         'otorga_carta','desbloquea_set','premio_set');
-- (b) 4 CHECKs (esperado 4):
-- SELECT conname FROM pg_constraint
--   WHERE conrelid='public.consumibles'::regclass
--     AND conname IN ('chk_consumibles_bono_pct','chk_consumibles_bono_tope',
--                     'chk_consumibles_bono_coherente',
--                     'chk_consumibles_permanente_coherente');
-- (c) Las 4 cartas recalibradas (esperado 4 filas, bono_accion NULL):
-- SELECT clave, precio_xp, precio_xp_base, bono_pct, bono_tope_xp,
--        bono_accion, bono_xp_fijo
--   FROM consumibles
--  WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                  'consumible_lente_artista','consumible_pluma_creador')
--  ORDER BY bono_pct;
-- (d) PRECIOS DE 058 INTACTOS (esperado 3 filas, cada una con su precio):
-- SELECT clave, precio_xp, precio_cop FROM consumibles
--  WHERE clave IN ('ancestral_pocima_50ml','ancestral_media_375ml',
--                  'ancestral_botella_750ml') ORDER BY clave;
--   esperado: 1166.67/14000, 3416.67/41000, 6333.33/76000. Si alguno cambio,
--   la migracion se aplico con la version v1 y hay que restaurarlo a mano.
-- (e) 5 filas del set con marca (esperado 5, con_marca = true en las 5):
-- SELECT clave, precio_xp, precio_cop, es_permanente, otorga_carta,
--        desbloquea_set, premio_set, (marca_id IS NOT NULL) AS con_marca,
--        (marca_id = (SELECT id FROM marcas WHERE nombre='ANCESTRAL')) AS marca_ok
--   FROM consumibles
--  WHERE clave IN ('ancestral_base','ancestral_pocima_50ml',
--                  'ancestral_media_375ml','ancestral_botella_750ml',
--                  'ancestral_premio_set') ORDER BY clave;
--
-- ROLLBACK
--   (r1) Restaurar el contrato 057 de las 4 cartas (valores historicos
--        literales de la 057), en UNA sentencia por clave:
--     UPDATE consumibles SET bono_pct=0, bono_tope_xp=0,
--       precio_xp=20, precio_xp_base=20, bono_accion='guardado,visita',
--       bono_xp_fijo=15.00
--      WHERE clave='consumible_catalejo_explorador';
--     (idem lupa 10/10 'media_voto' 3.00, pluma 20/20 'resena' 30.00,
--      lente 20/20 'foto' 10.00)
--   (r2) Retirar del catalogo las 2 filas nuevas: UPDATE consumibles
--        SET activo=false WHERE clave IN ('ancestral_base',
--        'ancestral_premio_set');   (PROHIBIDO DELETE: ADR-003)
--   (r3) Desvincular las cartas sin tocar precios: UPDATE consumibles
--        SET otorga_carta=NULL WHERE clave IN ('ancestral_pocima_50ml',
--        'ancestral_media_375ml','ancestral_botella_750ml');
--   (r4) Las columnas nuevas NO se dropean (el codigo viejo las ignora:
--        bono_pct=0 activa la rama historica).
--   (r5) Si por error se hubiera pisado el precio de 058, restaurarlo con el
--        literal de 058:382-395 (1166.67/3416.67/6333.33 y 14000/41000/76000)
--        y anotar el incidente; NUNCA borrar la fila.
```

### 4.2. `db/migrations/065_cartas_set_ancestral_premio.sql`

```sql
-- ============================================================================
-- Migration 065: cartas - SET DE COLECCION ANCESTRAL (4 cartas) y tercer
--   origen de canje para el premio del set.
-- Fecha: 2026-11-10   (v2: revisada por @architect-review)
-- Referencias: ADR-120 (D6, D7, D8, D12), ADR-002, ADR-003, ADR-006, ADR-008.
-- Requiere: 040 (cartas_catalogo, usuarios_cartas), 058 (canjes_tienda),
--   060 (emisor_tipo/marca_id/fusionable/es_canjeable_qr/stats_json),
--   061 (PK de 3 columnas), 064 (el SKU premio existe y lleva premio_set).
--
-- QUE HACE
--   1. cartas_catalogo.set_coleccion (boolean, default false): el set tiene
--      progreso propio sin nivel_gate y sus cartas NO son intercambiables.
--   2. 4 filas del set 'ancestral_esencia' en cartas_catalogo (ON CONFLICT),
--      con rareza cerrada: base 'dorado', 750 'epico', 375 'raro', 50 'comun'
--      y nivel_gate NULL en las 4.
--   3. Tercer valor del CHECK de origen de canjes_tienda: 'premio_set'.
--
-- MARCA: igualdad ESTRICTA sobre el nombre exacto 'ANCESTRAL'
--   (db/seeds/001_marca_ancestral_vinculo.js:48). Cero ILIKE, cero
--   'ORDER BY ... LIMIT 1'. Si no hay fila, RAISE EXCEPTION: la migracion
--   queda 'fallida' y el set no se siembra a medias.
--
-- POR QUE nivel_gate = NULL ES LEGAL
--   El CHECK nivel_gate IN (10,14,20,25) vive en cartas_gates (040:170-172),
--   NO en cartas_catalogo (040:101-103). Verificado en el archivo real.
--
-- POR QUE fusionable = false
--   chk_cartas_catalogo_fusionable (060) lo EXIGE con emisor_tipo='marca'.
--   Ademas un set de coleccion no debe poder convertirse en shiny.
--
-- ATOMICIDAD: el runner NO abre transaccion (driver HTTP de Neon, divide por
--   ';' y corta al primer error: scripts/apply_sql_file.js:155, :349-359,
--   :651, :755-763). El DROP+ADD del CHECK van DENTRO del mismo DO porque
--   partir el ALTER dejaria la tabla sin CHECK entre sentencias. NO se
--   escriben BEGIN/COMMIT ejecutables.
--
-- ORDEN: despues de 064.
-- ============================================================================

-- 1. COLUMNA ------------------------------------------------------------------
ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS set_coleccion boolean NOT NULL DEFAULT false;

-- 2. LAS 4 CARTAS DEL SET (+ la marca, resuelta UNA vez y con fallo explicito)
DO $mig065set$
DECLARE
  v_marca uuid;
  v_n int;
BEGIN
  SELECT id INTO v_marca FROM public.marcas WHERE nombre = 'ANCESTRAL';
  IF v_marca IS NULL THEN
    RAISE EXCEPTION 'MIG065: no existe la marca con nombre exacto ANCESTRAL';
  END IF;

  INSERT INTO public.cartas_catalogo
    (id, nombre, set_slug, rareza, nivel_gate, es_evento, imagen_url, activo,
     emisor_tipo, marca_id, descripcion, stats_json, es_canjeable_qr,
     fusionable, set_coleccion)
  VALUES
    ('cta_ancestral_01', 'Esencia Ancestral', 'ancestral_esencia', 'dorado',
     NULL, false, 'assets/cartas/marca_ancestral.png', true, 'marca', v_marca,
     'Carta base del set Ancestral. Se compra con XP y es permanente: abre el set, sus misiones y su premio.',
     '{"sku":"ancestral_base","volumen_ml":0,"set_slug":"ancestral_esencia","premio_set":"ancestral_premio_set"}'::jsonb, false, false, true),
    ('cta_ancestral_02', 'Pocima Ancestral 50 ml', 'ancestral_esencia', 'comun',
     NULL, false, 'assets/cartas/marca_ancestral.png', true, 'marca', v_marca,
     'Primer volumen del set Ancestral. Se obtiene al canjear la pocima de 50 ml.',
     '{"sku":"ancestral_pocima_50ml","volumen_ml":50,"set_slug":"ancestral_esencia","premio_set":"ancestral_premio_set"}'::jsonb, false, false, true),
    ('cta_ancestral_03', 'Media Ancestral 375 ml', 'ancestral_esencia', 'raro',
     NULL, false, 'assets/cartas/marca_ancestral.png', true, 'marca', v_marca,
     'Segundo volumen del set Ancestral. Se obtiene al canjear la media de 375 ml.',
     '{"sku":"ancestral_media_375ml","volumen_ml":375,"set_slug":"ancestral_esencia","premio_set":"ancestral_premio_set"}'::jsonb, false, false, true),
    ('cta_ancestral_04', 'Botella Ancestral 750 ml', 'ancestral_esencia', 'epico',
     NULL, false, 'assets/cartas/marca_ancestral.png', true, 'marca', v_marca,
     'Tercer volumen del set Ancestral. Se obtiene al canjear la botella de 750 ml.',
     '{"sku":"ancestral_botella_750ml","volumen_ml":750,"set_slug":"ancestral_esencia","premio_set":"ancestral_premio_set"}'::jsonb, false, false, true)
  ON CONFLICT (id) DO UPDATE SET
    nombre          = EXCLUDED.nombre,
    set_slug        = EXCLUDED.set_slug,
    rareza          = EXCLUDED.rareza,
    nivel_gate      = NULL,
    es_evento       = false,
    imagen_url      = EXCLUDED.imagen_url,
    activo          = true,
    emisor_tipo     = 'marca',
    marca_id        = COALESCE(EXCLUDED.marca_id, cartas_catalogo.marca_id),
    descripcion     = EXCLUDED.descripcion,
    stats_json      = EXCLUDED.stats_json,
    es_canjeable_qr = false,
    fusionable      = false,
    set_coleccion   = true;

  SELECT count(*) INTO v_n FROM public.cartas_catalogo
   WHERE set_slug = 'ancestral_esencia';
  IF v_n <> 4 THEN
    RAISE EXCEPTION 'MIG065: se esperaban 4 cartas del set y hay %', v_n;
  END IF;
END
$mig065set$;

-- 3. ORIGEN 'premio_set' EN canjes_tienda -------------------------------------
DO $mig065c$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.canjes_tienda'::regclass
       AND conname  = 'chk_canjes_tienda_origen'
       AND pg_get_constraintdef(oid) LIKE '%premio_set%'
  ) THEN
    ALTER TABLE public.canjes_tienda
      DROP CONSTRAINT IF EXISTS chk_canjes_tienda_origen;
    ALTER TABLE public.canjes_tienda
      ADD CONSTRAINT chk_canjes_tienda_origen
      CHECK (origen IN ('mostrador', 'premio_semanal', 'premio_set'));
  END IF;
END
$mig065c$;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura)
-- ============================================================================
-- (a) columna (esperado 1 fila, default false):
-- SELECT column_name, column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='cartas_catalogo'
--     AND column_name='set_coleccion';
-- (b) 4 cartas, rarezas y gate (esperado 4 filas: dorado/epico/raro/comun,
--     nivel_gate NULL en las 4, set_coleccion y fusionable true/false):
-- SELECT id, rareza, nivel_gate, set_coleccion, fusionable, emisor_tipo,
--        marca_id IS NOT NULL AS con_marca
--   FROM cartas_catalogo WHERE set_slug='ancestral_esencia' ORDER BY id;
-- (c) vinculo carta <-> SKU (esperado 4, cero huerfanas):
-- SELECT c.id, c.stats_json->>'sku' AS sku, (k.clave IS NOT NULL) AS sku_existe
--   FROM cartas_catalogo c
--   LEFT JOIN consumibles k ON k.clave = c.stats_json->>'sku'
--  WHERE c.set_slug='ancestral_esencia' ORDER BY c.id;
-- (d) CHECK de origen (esperado 1 fila con premio_set):
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname='chk_canjes_tienda_origen';
--
-- ROLLBACK
--   (r1) Origen: re-crear el CHECK de 058 (IN ('mostrador','premio_semanal'))
--        DESPUES de cerrar/anular las filas 'premio_set' (si no, el ADD
--        CONSTRAINT falla con 23514).
--   (r2) Cartas: UPDATE cartas_catalogo SET activo=false
--        WHERE set_slug='ancestral_esencia'; (PROHIBIDO DELETE: ADR-003)
--   (r3) set_coleccion puede quedar: el codigo viejo la ignora.
```

---

## 5. Matriz de verificacion

| ID | Que prueba | Comando / metodo | PASS |
|---|---|---|---|
| S-1 | Sintaxis de los 3 handlers | `node --check api/interacciones.js && node --check api/usuarios.js && node --check api/admin.js` | exit 0 |
| S-2 | ASCII-safe (ADR-002) + **cero `BEGIN`/`COMMIT`** en las migraciones | scan de bytes > 127 en `api/*.js`, `admin.html`, `mi-perfil.html`, `064*.sql`, `065*.sql`; y `Select-String -Path 064*.sql,065*.sql -Pattern "^\s*(BEGIN\|COMMIT)\s*;"` | 0 hits en ambos |
| S-3 | Balance de divs / Escudo GOLD | skill `gold-shield` sobre `admin.html` y `mi-perfil.html` | balance 0 |
| S-4 | Matematica del bono (sin BD) | `node scripts/smoke_064_bono_global_pct.js` bloque A: 10/15/20/25 % sobre `xp_base`; topes 250/400/550/700; **corte exacto en el tope** (nunca lo supera); `red2` | 100 % aserciones |
| S-5 | **No apilamiento** + ganador + tope del ganador | bloque B: dos efectos vigentes -> gana el de mayor `bono_pct`; empate -> `expira_en` mas lejano; empate -> clave ASC; **el tope aplicado es el del ganador**, no el minimo | pass |
| S-6 | **Compatibilidad del objeto antiguo** (legacy) + anti-doble-pago | bloque C: (i) un `consumible_efecto` singular **no** produce bono nuevo; (ii) `consumirBonoFaccion` sigue pagando el plano con `bono_xp_fijo>0` (fixture); (iii) **con la misma clave presente en `consumible_efectos`, devuelve `null`** (guarda de 2.4) -> contador de creditos = 1, no 2 | pass |
| S-7 | **Clasificacion y default seguro** | bloque D: (i) las 21 acciones de `BONO_APLICA` cobran; (ii) una accion **no clasificada** (`inventada_x`) cobra **0**; (iii) `es_exento:true` y `xp_final<=0` -> 0 bonos; (iv) `bono_de` presente -> 0 recursion (contador de UPDATEs = 1); (v) tabla de 48 entradas recorre el codigo y no encuentra ninguna `accion` sin clasificar (asercion sobre el fuente) | pass |
| S-8 | Compra sin tope + **recompra de base** + **doble cobro** | `node scripts/smoke_065_set_ancestral.js` bloque A: (i) 31 compras seguidas de la misma clave -> 31 x 200 (cero `STOCK_LLENO`); (ii) comprar `ancestral_base` dos veces -> 2a con la fila ya marcada -> **0 filas del UPDATE -> 409 `YA_POSEES`** y **cero** filas nuevas en `compra_consumibles` y en `xp_ledger`; (iii) **dos compras concurrentes** de la base (fake SQL que devuelve 0 filas la segunda) -> un solo flags y un solo cobro | pass |
| S-9 | Cooldown POR CARTA + **licuacion de stock** + permanente | bloque B: (i) activar catalejo y en la misma ventana activar lupa -> 200; (ii) reactivar catalejo -> **0 filas -> 409 `EFECTO_YA_ACTIVO`** y stock **descuenta 1 vez**; (iii) **agotar el tope (`bono_acumulado_xp = bono_tope_xp`) y reintentar activar -> 409** (la ventana NO se reabre: `expira_en` sigue en el futuro); (iv) `usar_consumible` sobre `ancestral_base` -> 409 `CONSUMIBLE_PERMANENTE` | pass |
| S-10 | Set 4/4 y **doble premio** | bloque C: 3 cartas -> 0 filas de premio; 4a carta -> **1 fila** `canjes_tienda` `origen='premio_set'` `estado='pendiente'` **+1 unidad** de `ancestral_premio_set` en billetera, **en la misma sentencia**; repetir la 4a entrega -> `ins` vacio -> **sigue 1 fila y el abono NO se repite** (0/0); y `premio_insertado=1, abonado=1` en la primera | pass |
| S-11 | Misiones filtradas + no completables sin acceso | bloque D: (i) sin acceso -> payload **identico al de hoy** (mismas misiones, mismo `total`, mismo `desbloqueadas`, sin campo nuevo); (ii) con acceso -> las 4 aparecen con 50/60/80/100; (iii) **sin acceso, un jugador con 5 guardados NO completa `mis_ancestral_guarda`** (gate de `evaluarMisiones`, no solo filtro de presentacion) | pass |
| S-12 | Progreso 4/4 sin gate | bloque E: `cmReq` devuelve `{set_slug:'ancestral_esencia', nivel_gate:null, total:4, obtenidas:0..4}` y `completo` se calcula igual | pass |
| S-13 | Intercambio bloqueado | bloque F: `carta_intercambiar` de `cta_ancestral_02` -> 400 `CARTA_DE_SET_NO_INTERCAMBIABLE` | pass |
| S-14 | SQL aplicado **y precios de 058 intactos** | las 5 consultas de 4.1 (a-e) y las 4 de 4.2 (a-d), en el editor de Neon: 6 columnas / 4 CHECKs / 4 cartas / **3 filas con 1166.67-14000, 3416.67-41000, 6333.33-76000** / 5 filas con `con_marca` y `marca_ok` true | 6/4/4/3/5 y **cero diferencias de precio** |
| S-15 | Backfill de cartas **y del flag de set** | (i) cartas: `consumibles.otorga_carta` vs `usuarios_cartas` para `canjes_tienda.estado='entregado'` -> re-ejecutar los upserts `ON CONFLICT`; (ii) flag: `SELECT usuario_id, consumible_id FROM compra_consumibles` vs `capacidades->'sets_acceso'` de los SKU con `desbloquea_set` -> re-derivar el flag ausente con un UPDATE (nunca borrando). Ambas re-ejecutables | 0 diferencias |
| S-16 | Suite completa | `npm run test` | verde (30 + 2 smokes) |
| S-17 | Economia (control de faucet) | `S-4` + `S-8`: el neto maximo por ventana es `tope - precio` (90 / 140 / 190 / 250 XP) y **requiere** acciones reales; el bono nunca supera el tope ni se acumula entre cartas; el premio 4/4 se entrega **una vez por usuario y set** | pass |

---

## 6. Riesgos y rollback

| ID | Riesgo | Prob. | Impacto | Mitigacion |
|---|---|---|---|---|
| R1 | **Doble pago**: el bono plano de la 057 y el nuevo +% pagarian la misma accion | alta si 064 no limpia | faucet duplicado | 064 pone `bono_accion=NULL` y `bono_xp_fijo=0`; el codigo nuevo solo lee `bono_pct`; **guarda en `consumirBonoFaccion`** (2.4) para efectos legacy del mapa nuevo; S-6 lo prueba; S-14(c) lo verifica en dato |
| R2 | **Hook en `registrarXpLedger`**: +1 SELECT y +1 UPDATE por accion acreditada | media | latencia | Solo se ejecuta el UPDATE si hay ganador; el SELECT es el patron de `consumirBonoFaccion`; fallo del SELECT -> sin bono (`catch`) |
| R3 | **Recursion** del asiento del bono | baja | bucle infinito | `d.bono_de` + `es_exento:true` + `bono_consumible_24h` en `BONO_EXCLUIDAS`; S-7 cuenta UPDATEs |
| **R4** | **Clasificacion de las 48 llamadas** (riesgo declarado en el ADR): una accion de sistema mal clasificada como elegible acreditaria bono sobre dinero que se mueve, no que se gana | **media** | faucet silencioso | **Default NEGAR** (2.4): solo las 21 acciones medidas de `BONO_APLICA` cobran; cualquier accion nueva **no cobra** hasta que se clasifique. Re-auditoria obligatoria del listado en cada PR que anada una llamada a `registrarXpLedger` (la asercion (v) de S-7 falla si aparece una accion sin clasificar). El residuo real es **un bono que falta** (detectable por queja), no un faucet |
| R5 | **Despliegue de codigo antes de 064/065** | alta (siempre) | `cartas_mias` 503 / compra rota | Todo SELECT nuevo con columna nueva va en su propio intento degradado (patron 057/058): 1 en `?tipo=consumibles`, 1 en `usar_consumible`, 2 en `cartas_mias`, 1 en `carta_intercambiar`, 1 en `consumible_entregar`, 1 en `evaluarMisiones` |
| R6 | **Marca Ancestral ausente o duplicada** | media | set muerto o set con la marca equivocada | `SELECT ... WHERE nombre='ANCESTRAL'` (exacta) con `RAISE EXCEPTION` si no hay fila: **fallo explicito**, no 0 filas silenciosas. Si hubiera dos filas con ese nombre exacto, `SELECT INTO` falla con 21000 y la migracion queda `fallida`: tambien explicito |
| R7 | **`canjes_tienda.marca_id NOT NULL`** con un premio sin marca | baja | premio no entregable | El SKU premio se siembra con marca (1.4) y 2.9 toma `marca_id` de su propia fila. No se toca el NOT NULL |
| R8 | **Regalar una carta del set** rompe el 4/4 para siempre | media | perdida irreversible | `set_coleccion` bloquea intercambio (2.8) y la UI no ofrece el boton |
| R9 | **Efecto de 24 h sin gastar el tope** | alta | XP pagada y no cobrada | Modelo pedido (tope + ventana). El texto de la carta avisa; `bono_acumulado_xp` se muestra en el mercado (`bono_efecto`) |
| R10 | **Precio de la base mal calibrado** (400 XP) | media | economia | 1 `UPDATE` idempotente. Los precios de los 3 volumen **no son riesgo**: son los de 058 y no se escriben |
| R11 | **`admin.html` sin los campos** -> columnas solo editables por SQL | baja | operacion | Seccion 3 lo incluye; si se recorta, queda como deuda documentada |
| R12 | **`gamificacion_config`** no puede guardar el SKU premio (H22) | cierta | diseno | `consumibles.premio_set` (D8). Declarado en el ADR |
| **R13** | **Doble cobro de la base** (recompra o dos requests concurrentes) | baja | sumidero / doble flag | El flag va **en el mismo UPDATE** y la recompra se corta en el `WHERE` (`NOT (... ? $4)`); 0 filas = 409. **No hay pre-chequeo como defensa** (2.2). S-8 (ii)/(iii) |
| **R14** | **Premio duplicado** por replay de la 4a entrega | baja | item extra | `ON CONFLICT (clave_idempotencia) DO NOTHING` + abono condicionado a `EXISTS (SELECT 1 FROM ins)` en la MISMA sentencia (2.9). S-10 |

### 6.2. Backfill (reparacion, nunca borrado)

Dos backfills idempotentes, ambos **derivan de un hecho ya persistido** y ninguno escribe precios:

1. **Cartas no otorgadas** (si el upsert post-entrega fallo): por cada `consumibles.otorga_carta` con `canjes_tienda.estado='entregado'` del usuario, re-ejecutar el upsert `INSERT ... ON CONFLICT (usuario_id, carta_id, variante) DO UPDATE SET cantidad = cantidad + 1, activo = true`. **No cambia precios ni flags.**
2. **Flag `sets_acceso` ausente** (respuesta (b) del operador: "si un fallo post-cobro dejara el flag sin escribir, se corrige con backfill desde `compra_consumibles`"): para cada `compra_consumibles` del usuario cuyo consumible tenga `desbloquea_set`, escribir el flag con `desde = compra.creado_en`, `origen='compra'`, `compra_id = compra.id`, `consumible = clave` **solo si la clave no existe** (`||` con la entrada); el merge no borra nada (ADR-003). Re-ejecutable: el mismo UPDATE deja el mismo JSON.

**Por que el flag no puede quedar sin escribir en el flujo normal:** va en el mismo UPDATE que cobra (2.2). El backfill cubre el caso de una migracion intermedia o de un dato historico, no un camino del codigo.

### 6.3. Rollback por capas (en este orden)

1. **Codigo:** revertir el PR. Los `SELECT` degradados siguen funcionando; las 4 cartas vuelven a la rama `categoria='faccion'` con `bono_accion=NULL` -> efecto inerte y stock consumido. **Por eso el paso 1 y 2 van juntos.**
2. **Dato (4.1 r1):** restaurar `bono_accion`/`bono_xp_fijo`/precios historicos de la 057 (una sentencia por clave).
3. **Catalogo (4.1 r2 / 4.2 r2):** `activo=false` para las 2 filas nuevas y las 4 cartas; `otorga_carta=NULL` en las 3 de 058 (4.1 r3). **Prohibido DELETE** (ADR-003).
4. **Flags y cartas ya entregados:** `capacidades.sets_acceso` y `usuarios_cartas` **no se revierten** (son propiedad del jugador). Con `activo=false` dejan de mostrarse y de dar misiones; el premio pendiente se cierra desde el mostrador o se anula (`estado='anulado'`, camino previsto por 058).
5. **Migraciones:** las columnas nuevas **no se dropean** (el codigo viejo las ignora). 064/065 son aditivas y reversibles en dato, **sin `BEGIN`/`COMMIT`** (punto 6): el rollback tambien se aplica sentencia a sentencia y es idempotente.

---

## 7. ADR-120 (texto listo para publicar en `DECISIONS.md`)

> **Numero verificado:** el ultimo es ADR-119 (`DECISIONS.md:13144`); ADR-116 ya esta ocupado (`:12752`). Se publica como **ADR-120**.

---

## ADR-120: El bono de los consumibles pasa a ser **+% de XP global durante 24 h con tope por ventana** (estado en un MAPA por clave), el tope de compra de 30 se retira, y el set Ancestral entra como **set de coleccion 4/4** con acceso permanente por compra, misiones filtradas y premio entregado por `canjes_tienda` con un tercer origen [**acota** ADR-106 (gate de nivel 4 y bono plano por familia) y ADR-110 R2 (contrato de compra); **no deroga** ninguna premisa de ADR-118 (retirada de topes de compra) ni de ADR-108 (emisor de cartas)]

**Fecha:** 2026-11-10
**Autor:** @architect
**Estado:** APROBADO (v2: decision de producto cerrada por el operador + **8 cambios** de la revision de `@architect-review` incorporados)

**Resoluciones del operador incorporadas (v2, no se reabren):**

- **(a) `premio_set` no entrega carta extra.** Es la clave del SKU fisico que se entrega por `canjes_tienda` al completar 4/4; la fila de precio 0 es solo el puntero. `otorga_carta=NULL`.
- **(b) La base no se recompra.** Si existe `sets_acceso`, 409. Compra y flag van en el **mismo UPDATE**; si un fallo post-cobro dejara el flag sin escribir, se corrige con **backfill desde `compra_consumibles`, nunca borrando** (6.2).
- **(c) La lista negra es por `accion`**, no por `contexto.origen`.
- **(d) Autorizado tocar `consumirBonoFaccion`** con la guarda anti-doble-pago.

**Los 8 cambios de la revision, uno a uno:**

1. **Precios:** los 3 SKU `ancestral_*` de volumen **conservan** 1166.67/3416.67/6333.33 XP y 14000/41000/76000 COP (`058:382-395`). Prohibido escribir su `precio_xp`; 064 solo les pone `otorga_carta`. `INSERT` limitado a `ancestral_base` (400) y a la fila tecnica (0).
2. **Rarezas:** base `dorado`, 750 `epico`, 375 `raro`, 50 `comun`; `nivel_gate=NULL` en las 4.
3. **Marca:** igualdad exacta `'ANCESTRAL'` (`seeds/001:48`) con fallo explicito; cero `ILIKE` y cero busqueda por patron.
4. **Lista negra del bono por `accion`** + `es_exento:true`, con las **48 llamadas clasificadas** y **default NEGAR**.
5. **Filtro de misiones antes de `entregarCatalogo`** (que whitelistea campos y omite `requiere_set`) + gate en `evaluarMisiones`; el payload de quien no tiene acceso no cambia.
6. **Cero `BEGIN`/`COMMIT`** en 064 y 065 (el runner no tiene transaccion; al fallo quedaria un `BEGIN` abierto).
7. **Atomicidad en el WHERE:** flag de set en el cobro y ventana `expira_en <= ahora` en la activacion; 0 filas = 409; los pre-chequeos quedan solo como diagnostico.
8. **Premio 4/4 en una sola sentencia CTE** con `RETURNING` y abono condicionado; prohibido `INSERT` + abono en dos pasos.

### Problema

ADR-106 fijo los consumibles de faccion como filas del catalogo con un efecto de **bono PLANO por familia de accion** (`bono_accion` CSV + `bono_xp_fijo`) guardado en **UN solo objeto** `capacidades.consumible_efecto`, con un gate de reuso **global** (una activacion por ventana de 24 h para cualquier carta). Tres consecuencias no queridas, medidas en el archivo real:

1. El jugador solo cobra si realiza exactamente la familia declarada (`guardado,visita` en el Catalejo, `media_voto` en la Lupa...). Un dia sin esa accion = carta pagada y perdida.
2. Con un objeto unico no puede haber dos cartas con ventanas propias: el gate es global (`ventanaFaccionAbierta`, `api/interacciones.js:4866-4879`).
3. La compra arrastra un tope de **stock 30** por clave en la **constante de codigo** `ccStockTope` (`:14130`), que contradice el espiritu de ADR-118 (los topes de compra se retiran, no se mantienen por conveniencia).

En paralelo, la Casa Ancestral necesita un **set de 4 cartas** (base + 50 ml + 375 ml + 750 ml) donde la base se **compra con XP y es permanente**, las tres de volumen se obtienen **canjeando su SKU**, y el 4/4 entrega un premio. El sistema actual no lo permite sin tocar codigo en tres sitios: `cartas_mias` solo da progreso a sets con `nivel_gate IN (10,14,20,25)`; `?tipo=misiones` sirve el catalogo **completo a todos** y no existe ningun check que exija item o flag (0 hits de `requiere_carta`/`requiere_flag`/`requiere_item`); y `canjes_tienda` tiene el CHECK de `origen` cerrado a dos valores (`058:323-324`).

### Opciones evaluadas

**D1 - Donde engancha el bono global +%.**
- (a) Duplicar el hook en los 5 puntos de `consumirBonoFaccion` (`:12510, :13265, :18714, :18846, :19101`): cubre 5 acciones, no todas. Descartada por el propio requisito.
- (b) Dentro de `calcularXpAcreditado` (`:1936-1969`): es una funcion de **calculo**; acreditaria dinero antes de saber si el caller persiste la accion (hay UPDATEs que pueden afectar 0 filas) y filtraria XP. Descartada.
- (c) **Dentro de `registrarXpLedger` (`:2009`)** con un helper `acreditarBonoGlobal`: es el **unico** punto que toda acreditacion por codigo atraviesa (**48** llamadas medidas; los 2 `INSERT` directos de `:15651-15660` quedan fuera por construccion y son `es_exento=true`), ya es `async`, ya recibe `sql` y ya conoce `accion`, `xp_base`, `xp_final` y `es_exento`. **ELEGIDA.**

**D2 - Predicado del bono: lista negra explicita + default NEGAR (v2).** Se acredita si `es_exento !== true AND xp_final > 0 AND accionConBono(accion)`, donde `accionConBono` = (allowlist `BONO_APLICA` con las **21 acciones medidas** que si son de jugador) y (lista negra `BONO_EXCLUIDAS`: `mision`, `logro`, `referido*`, `admin_xp`, `ajuste*`, `compra_consumible`, los 12 sinks y los 2 bonos). **Una accion no clasificada NO cobra bono.** La v1 usaba `es_exento !== true AND xp_final > 0` con default "aplicar": se retiro porque una accion de sistema nueva heredaba faucet en silencio. Ahora el fallo por defecto es que **falte** un bono (se ve en una queja), no que sobre (no se ve nunca). Guarda anti-recursion por `d.bono_de`.

**D3 - Modelo del estado: MAPA por clave con lectura compatible.**
- (a) Migrar `consumible_efecto` al mapa: rompe un efecto ya pagado a mitad de vuelo. Descartada.
- (b) **Mapa nuevo `capacidades.consumible_efectos` indexado por clave** con `{activo_desde, expira_en, bono_pct, bono_tope_xp, bono_acumulado_xp}` y **convivencia** con el objeto singular, que sigue gobernado por `consumirBonoFaccion` sin una linea de cambio. **ELEGIDA.**
- Dos predicados, no uno (leccion de ADR-106): `efectoBonoVigente` (expira_en futuro **Y** acumulado < tope) para **acumular**, y `ventanaBonoAbierta` (solo expira_en futuro) para el **cooldown por clave**. Si el cooldown usara el predicado estricto, agotar el tope reabriria la ventana y se licuaria el stock  -  el mismo bug que la 057 cerro en la rama de faccion.

**D4 - No apilamiento.** Se acredita **un** bono por accion: el del efecto vigente de mayor `bono_pct` (empate: `expira_en` mas lejano; empate: clave ASC), con **el tope de ese ganador**. Alternativa (sumar todos los % con el tope minimo) descartada: hace que comprar 4 cartas baratas supere a la cara y rompe el escalonado 10/15/20/25.

**D5 - Columnas, precios y retirada del tope de compra.** `consumibles` gana `bono_pct smallint NOT NULL DEFAULT 0`, `bono_tope_xp numeric(12,2) NOT NULL DEFAULT 0`, `es_permanente boolean NOT NULL DEFAULT false`, `otorga_carta varchar(40)`, `desbloquea_set varchar(40)` y `premio_set boolean NOT NULL DEFAULT false`. Los DEFAULT dejan **inertes las 32+ filas existentes** (0 % = rama historica) sin backfill. El tope de 30 **se retira por CODIGO** (se borra `ccStockTope`, el pre-chequeo y el predicado `$4` del WHERE), **no por dato**: crear una columna de tope para dejar el valor 30 o un centinela infinito es un knob que nadie pidio; ningun otro consumible pierde nada porque el tope solo aplicaba a `categoria='faccion'`.
**Precios (v2):** 064 escribe `precio_xp` **solo** en las 4 cartas de bono (160/260/360/450, decision del operador) y en el `INSERT` de `ancestral_base` (400). **Los 3 SKU de volumen conservan 1166.67 / 3416.67 / 6333.33 XP y 14000 / 41000 / 76000 COP de la 058** (`058:382-395`): 064 solo les anade `otorga_carta`, y el `DO UPDATE` de las 2 filas nuevas no reescribe precios. Sanity check obligatorio en S-14(d) y en el rollback (r5).

**D6 - Progreso y no-intercambio, con rarezas cerradas (v2).** `cartas_catalogo` gana `set_coleccion boolean NOT NULL DEFAULT false`: (i) mete el set en `cmReq` **sin inventarle un `nivel_gate`** (el CHECK 10/14/20/25 vive en `cartas_gates`, no en `cartas_catalogo`), y (ii) bloquea el intercambio de estas cartas. Sin (ii), regalar la 750 ml destruye el 4/4 **para siempre**, porque esa carta no se recompra: solo se obtiene canjeando su SKU. **Rarezas (decision del operador):** base `dorado` (la mas alta), 750 ml `epico`, 375 ml `raro`, 50 ml `comun`; `nivel_gate = NULL` en las 4. El escalonado premia la carta permanente sobre el volumen y ordena los 3 volumen por tamano.

**D7 - Acceso Ancestral: flag permanente, atomico con el cobro (v2).** `capacidades.sets_acceso[set] = {desde, origen:'compra', compra_id, consumible, xp_pagado}`, escrito **en el mismo UPDATE que cobra** (respuesta (b) del operador: la base no se recompra y el flag no puede quedar a medias), con la condicion de carrera en el WHERE: `AND ($4::text IS NULL OR NOT (COALESCE(capacidades->'sets_acceso','{}'::jsonb) ? $4::text))`; **0 filas = 409** (`YA_POSEES` o `XP insuficiente`, segun el diagnostico posterior). El `id` de la compra se conoce **antes** del INSERT porque `compra_consumibles.id` es `uuid DEFAULT gen_random_uuid()` (`010:31`) y se genera en un CTE: por eso no hay `RETURNING id` ni segundo UPDATE y la trazabilidad se conserva. Se lee en 3 sitios: progreso de cartas, filtro de misiones y elegibilidad del premio. El candado contra el consumo es `consumibles.es_permanente` -> **409 `CONSUMIBLE_PERMANENTE`** en `usar_consumible`, ANTES de cualquier rama. **Backfill** desde `compra_consumibles` si un dato historico no lo tiene (6.2), nunca borrando.

**D8 - Premio 4/4 data-driven, entregado en UNA sentencia (v2).** Se entrega por `canjes_tienda` con `origen='premio_set'` (ALTER del CHECK, porque `ADD CONSTRAINT` no admite `IF NOT EXISTS` y partir el ALTER dejaria la tabla sin CHECK), `estado='pendiente'` y `clave_idempotencia='premio_set:<set>:<usuario>'` reusando el `UNIQUE` de la 058. **(a) del operador:** la fila de `premio_set` **no entrega carta** (`otorga_carta=NULL`): es **la clave del SKU fisico** que se entrega por `canjes_tienda` al completar el 4/4 y la fila de precio 0 es solo su puntero; la unidad abonada en la billetera es la que `consumible_entregar` descuenta de forma **fail-closed** (`:16871-16872`), por eso el abono es obligatorio aunque el premio sea fisico. **Una sola sentencia con CTE** (`ins` + `ab` condicionado a `EXISTS (SELECT 1 FROM ins)`, patron `:16874-16904` / comentario `:16993-16994`): el replay no inserta y por tanto **no abona**. **Desviacion declarada:** el SKU premio NO se guarda en `gamificacion_config` porque su `valor` es `numeric(12,4)` (`058:348-352`): un SKU no cabe. Se usa `consumibles.premio_set boolean`, espejo exacto del `premio_semanal` de 058. `marca_id` sigue `NOT NULL`: el SKU premio pertenece a la marca Ancestral.

**D9 - Verificacion.** Dos smokes nuevos con el harness `vm` + SQL falso de `smoke_057_consumibles_faccion.js` (sin BD), 17 comprobaciones (S-1..S-17), las 9 consultas de verificacion post-aplicacion (5 de 064 + 4 de 065) y `npm run test` en verde. Todo SELECT que dependa de una columna nueva va en **su propio intento degradado**: desplegar codigo antes de 064/065 no puede tumbar `cartas_mias` ni la compra.

**D10 - La marca se resuelve por igualdad exacta, con fallo explicito.** `SELECT id FROM marcas WHERE nombre = 'ANCESTRAL'` (H28), dentro de un `DO` con `RAISE EXCEPTION` si no hay fila; **cero `ILIKE`, cero `ORDER BY ... LIMIT 1`**. Motivo: `ILIKE '%ancestral%'` habria aceptado cualquier fila que contuviera el texto y, con dos coincidencias, habria elegido una arbitraria dejando `con_marca=true` en la verificacion: un fallo **silencioso** que el dato no delataba. Un set sin marca no falla a medias: **no se siembra**.

**D11 - Las migraciones no abren transaccion porque el runner no la tiene.** El aplicador divide por `;` respetando dollar-quote y ejecuta cada sentencia con el driver **HTTP** de Neon, cortando al primer error (`apply_sql_file.js:155`, `:349-359`, `:651`, `:755-763`, H25). Un `BEGIN` no envuelve nada y, tras un fallo, queda abierto; un `COMMIT` es un statement suelto. **064 y 065 no contienen `BEGIN` ni `COMMIT`**: la atomicidad se garantiza por sentencia y lo que debe ir junto va **dentro del mismo `DO`**.

**D12 - Clasificacion como riesgo declarado (R4).** Las 48 llamadas a `registrarXpLedger` se clasificaron una a una (21 exentas literales, 27 con `es_exento` omitido, de las cuales **27 son de jugador**). El diseno asume que **esa clasificacion puede envejecer**: por eso el default niega y por eso S-7 (v) falla si aparece una `accion` sin clasificar. El riesgo R4 queda escrito en 6 y en esta ADR, no heredado como deuda tacita.

### Decision

Se implementa D1..D12: bono **+% global** (10/15/20/25 %) con **tope por ventana** (250/400/550/700 XP) y precio 160/260/360/450 XP en las 4 cartas de la 057; estado en `capacidades.consumible_efectos` (mapa por clave) con convivencia **sin migrar** del objeto singular; acreditacion centralizada en `registrarXpLedger` con **lista negra por `accion` y default NEGAR** (21 acciones elegibles medidas) y asiento propio `bono_consumible_24h`; retirada del tope de compra de 30 **por codigo**; set Ancestral de 4 cartas con `set_coleccion` y rarezas cerradas (`dorado`/`epico`/`raro`/`comun`, `nivel_gate` NULL), acceso permanente en `capacidades.sets_acceso` escrito **en el mismo UPDATE del cobro**, 4 misiones filtradas **antes** de `entregarCatalogo` con gate en la evaluacion, y premio `premio_set` en `canjes_tienda` entregado **en una sola sentencia CTE** con abono condicionado. Los 3 SKU de volumen **conservan el precio de 058**; solo la base (400 XP) y la fila tecnica (0) son nuevas. Migraciones **064** (consumibles) y **065** (cartas + origen), aditivas, idempotentes, **sin `BEGIN`/`COMMIT`**, sin DELETE ni DROP de datos.

### Justificacion

- **Un solo punto de enganche** (D1c) es la unica forma de cubrir "todas las acciones" sin 5 hooks que se desincronicen; elegir el **ledger** y no el motor evita acreditar antes de persistir la accion.
- **El default niega** (D2) convierte un faucet silencioso en un bono que falta: el error barato es el reclamable. La lista negra explicita documenta la semantica y protege la allowlist de un alta accidental.
- **El mapa por clave** (D3) resuelve los tres defectos medidos (familia fija, gate global, objeto unico) **sin migrar** lo ya pagado, que es el cero borrado logico aplicado a estado de jugador.
- **Dos predicados** (D3) es una leccion **pagada** en la 057: si el cooldown usara el predicado estricto, agotar el tope reabriria la ventana y se licuaria el stock.
- **Retirar el tope por codigo** (D5) es coherente con ADR-118 y no crea deuda de datos.
- **No reescribir precios** (D5) es la unica forma de que 064 sea aditiva de verdad: un catalogo con precio de tienda (`precio_cop`) no se "recalibra" con un `ON CONFLICT`.
- **`set_coleccion`** (D6) resuelve progreso y no-intercambio con **una** columna sin tocar el CHECK de `cartas_gates`.
- **Atomicidad en el WHERE** (D7) es el patron que el repo ya paga bien (`:14291-14298`): leer, decidir y escribir en JS es una ventana de carrera, no un control.
- **Una sola sentencia para el premio** (D8) es el unico modo de que "no premio" y "no abono" sean el mismo hecho.
- **Fallo explicito de la marca** (D10) prefiere una migracion `fallida` y visible a un set sembrado con la marca equivocada.

### Impacto

- **BD:** 1 migracion de `consumibles` (6 columnas, 4 CHECKs, 4 UPDATE, 2 INSERT, 1 UPDATE de vinculo), 1 de `cartas_catalogo` (1 columna y 4 filas) + `canjes_tienda` (1 CHECK). Cero endpoints nuevos (8/8 Vercel intacto).
- **Codigo:** `api/interacciones.js` (14 zonas, incluida la guarda en `consumirBonoFaccion`), `api/usuarios.js` (3 zonas), `admin.html` (1 zona), `mi-perfil.html` (2 zonas), 2 smokes nuevos, `package.json`.
- **Economia:** el bono maximo por ventana es `tope - precio` (90/140/190/250 XP) y **exige acciones reales**; sin tope de compra, el freno pasa a ser el **cooldown por carta** mas el tope de ventana. Los SKU de volumen mantienen su precio de tienda, luego el XP no es la via de compra de los 3 volumenes: se obtienen canjeando su SKU.
- **Jugador:** las 4 cartas de la 057 dejan de exigir una familia de accion; el set Ancestral abre misiones y un premio fisico.
- **Riesgo principal declarado:** **R4, la clasificacion de las 48 llamadas** (mitigado con default negar y asercion de cobertura). Secundarios: R1 (doble pago legacy, mitigado con la guarda en `consumirBonoFaccion`) y R13/R14 (doble cobro y doble premio, mitigados en el WHERE y en el CTE).

### Verificacion

S-1..S-17 de la spec `docs/superpowers/specs/2026-11-10-consumibles-24h-ancestral-set-design.md`, seccion 5. En particular: S-4/S-5 (matematica y no apilamiento), S-6 (**compatibilidad del objeto antiguo** y anti-doble-pago), S-7 (**clasificacion y default seguro**), S-8 (**recompra de base y doble cobro**), S-9 (**licuacion de stock**), S-10 (**doble premio**), S-11 (misiones filtradas y no completables), S-14 (**precios de 058 intactos**) y S-16 (`npm run test`). `node --check` aplica al codigo (S-1), no a esta spec.

---

## 8. Preguntas: cerradas en v2 y abiertas

### 8.1. Cerradas por el operador (no se reabren)

| # | Pregunta de v1 | Resolucion |
|---|---|---|
| 1 | Precios de los SKU | **Cerrada.** Los 3 volumen **conservan** 1166.67/3416.67/6333.33 XP y 14000/41000/76000 COP (058). `ancestral_base` 400 XP; fila tecnica del premio 0. |
| 2 | Rarezas del set | **Cerrada.** Base `dorado`, 750 ml `epico`, 375 ml `raro`, 50 ml `comun`. |
| 3 | Gate de nivel de la base | **Cerrada en NULL:** el gate es el XP (400). |
| 4 | Se permite recomprar la base? | **No.** 409 `YA_POSEES`, resuelto en el WHERE del mismo UPDATE que cobra. Backfill documentado en 6.2. |
| 7 | Que SKU es el premio y cuantas veces | **`ancestral_premio_set`, una vez por usuario y set.** No entrega carta; es la clave del SKU fisico. |
| 8 | Nombre exacto de la marca | **`'ANCESTRAL'`** (`db/seeds/001_marca_ancestral_vinculo.js:48`), igualdad estricta con fallo explicito. |
| 9 | Quien audita las llamadas del ledger | **Cerrada como regla de proceso:** la clasificacion de las 48 esta en 2.4; **toda llamada nueva a `registrarXpLedger` exige clasificar su `accion` en el mismo PR** (el default niega, y S-7 (v) falla si falta). R4 queda declarado en 6 y en el ADR. |

### 8.2. Abiertas (son DATOS, no bloquean la implementacion; se cambian con un `UPDATE` idempotente)

1. **Grupo de las 4 misiones Ancestral.** Se propone `grupo:'general'` (cero cambios de cliente). La alternativa `grupo:'ancestral'` exige anadir su titulo en el mapa de grupos de `mi-perfil.html`. Se implementa `'general'` salvo indicacion contraria.
2. **Umbral de las misiones `guarda` y `resena`.** Se propone **1** accion y retroactiva (cuenta lo ya hecho). Si se quiere 3 guardados o "solo acciones posteriores a la compra", es un cambio de 2 lineas en el check y **no toca esquema**.
3. **`admin.html` en este pase o como deuda.** Se recomienda incluirlo (ADR-028: catalogo administrable); si se recorta, las 5 columnas quedan editables solo por SQL y se documenta como deuda (R11).

**Ninguna de las 3 abiertas cambia el modelo de datos, la seguridad ni el contrato de API.** Si el operador no responde, se implementan los valores propuestos.
