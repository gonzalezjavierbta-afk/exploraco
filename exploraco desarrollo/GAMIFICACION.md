# GAMIFICACION.md - ExploraCO

## 1. Que es este documento

**Estado (2026-10-05):** casa unica y viva del sistema de gamificacion: XP, progresion, sumideros, rankings, ledger, migraciones y lo que queda inerte. **Todo lo que hay aqui fue MEDIDO contra el fichero real y contra Neon el 2026-10-05** (ADR-006). Ningun numero viene del historial de chat.

Este documento **NO reescribe ningun ADR** (ADR-084 D1): el argumento vive una vez, en su ADR (`DECISIONS.md` **ADR-086** y **ADR-088**). Aqui solo hay estado, cifras y rutas. Cuando una cifra y su razon se contradicen, **gana el ADR para el porque** y **este documento para el cuanto**, y la cifra se re-mide.

Alcance: lo que el usuario gana, lo que gasta, como se ordena y que parte no existe todavia. **No** es la especificacion de producto: es el estado factual.

### Como reverificar cada dato

Neon es **solo lectura**. Se usa `scripts/neon_select.js`, que rechaza cualquier sentencia que no empiece por `SELECT` o `WITH`:

```powershell
# Conteos de Neon (UNA consulta con UNION ALL; agrupar evita gastar un turno por tabla)
$env:NEON_QUERY="SELECT * FROM ( SELECT 1 o,'sink_slots' k,count(*)::text v FROM sink_slots UNION ALL SELECT 2,'xp_ledger',count(*)::text FROM xp_ledger ) t ORDER BY o"
node scripts/neon_select.js

# Tipos exactos de columna (la prueba de numeric(12,2) vs integer)
$env:NEON_QUERY="SELECT table_name,column_name,data_type,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_name IN ('usuarios','xp_ledger','xp_historial') ORDER BY table_name,ordinal_position"
node scripts/neon_select.js

# Ledger de migraciones (la columna es 'numero', NO 'version')
$env:NEON_QUERY="SELECT numero,resultado,checksum,verificada_en FROM schema_migrations ORDER BY numero"
node scripts/neon_select.js

# RLS y politicas
$env:NEON_QUERY="SELECT relname,relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'"
node scripts/neon_select.js

# Tablas que existen de verdad (NO asumir nombres: 'mercado' y 'chat_sala' NO existen)
$env:NEON_QUERY="SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
node scripts/neon_select.js
```

Codigo (PowerShell, en la raiz del repo):

```powershell
# Constantes de la curva de sumideros y la allow-list de enganche
Select-String -Path api\interacciones.js -Pattern "SINK_ALPHA|SINK_GAMMA|SINK_REF_ORIGEN|SINK_DIAS_RAMPA"

# M_nivel y su recorte
Select-String -Path api\interacciones.js -Pattern "M_NIVEL_MAX_DEFAULT|obtenerMultiplicadorNivel"

# Catalogo unico de bases de XP y costos de eleccion
Select-String -Path api\interacciones.js -Pattern "var XP_BASES = \{" -Context 0,28
Select-String -Path api\usuarios.js -Pattern "COSTO_FACCION = |COSTO_CASA = |COSTO_CLASE = "

# Formula del score y motor compartido
Select-String -Path lib\score.js -Pattern "SCORE_BETA_SALDO|SCORE_TOPE_SEMILLA|AS score_ranking|DISTINCT ON"

# Ramas ?tipo= de sumideros y los 4 rankings
Select-String -Path api\interacciones.js -Pattern "tipo === 'slot_|tipo2 === 'slot_|tipo === 'pandilla_ranking'"
Select-String -Path api\usuarios.js -Pattern "tipo === 'leaderboard'|tipo === 'faccion_ranking'|tipo === 'casa_ranking'"

# Numero de ADRs y el ultimo (ADR-084 D5: se lee la SECCION, no el fichero)
Select-String -Path "exploraco desarrollo\DECISIONS.md" -Pattern "^## ADR-0" | Select-Object -Last 3

# Escrituras de xp_total (agrupadas; el codigo tiene ~33)
Select-String -Path api\*.js,lib\*.js -Pattern "SET xp_total = xp_total" | Group-Object Path

# Tablas MUERTAS: 0 escritores en todo el repo
Select-String -Path api\*.js,lib\*.js,db\*.sql,scripts\*.js -Pattern "xp_historial|tipo_evento"
```

Smokes que ya existen y cubren este dominio: `scripts/smoke_gamificacion_v6.js`, `scripts/smoke_test_gamificacion_v4.js`, `scripts/smoke_gaming_v61.js`, `scripts/smoke_021_xp_decimal_rankings.js`.

**Regla de esta seccion:** cada seccion siguiente lleva su propia fecha y su metodo. Si un numero no se puede re-medir, **no se escribe**: se marca `NO CONFIRMADO`.

---

## 2. Estado en una linea

**Estado (2026-10-05, medido en Neon y en el repo):** el sistema de gamificacion esta **desplegado, cableado y con la aritmetica correcta**, y **hoy es integralmente inalcanzable**: 10 usuarios, 0 filas en `sink_slots`, `SUM(xp_gastado_sinks) = 0.00`, `gamma = 0.0000` y ninguna de las cuatro ramas de compra ha escrito jamas.

Lo que existe y funciona: la progresion (`M_nivel`, 40 niveles, 5 Eras), el catalogo unico `XP_BASES`, el `xp_ledger` con 160 filas reales, los 4 sumideros con su curva cuadratica y su indice unico parcial, los 4 rankings sobre un motor compartido, y 7 migraciones aplicadas. Lo que no existe: **el dato** que haria que todo eso se dispare. El codigo esta; el contenido, no.

---

## 3. XP y progresion

**Estado (2026-10-05; metodo: `information_schema.columns` + agregados sobre `usuarios`, `xp_ledger`, `xp_historial`, `gamificacion_config`):** la progresion esta cableada y es correcta, el ledger lleva 160 filas reales de 13 acciones, y existe una **tabla muerta** (`xp_historial`) que el resto del sistema ya no usa.

### 3.1 Tipos exactos (no deducir del nombre)

| Tabla | Columna | Tipo medido | Nota |
|---|---|---|---|
| `usuarios` | `xp_total` | `numeric(12,2)` | moneda unica del juego |
| `usuarios` | `xp_gastado_sinks` | `numeric(12,2)` | **NO baja `xp_total`**: el disponible es `xp_total - xp_gastado_sinks` |
| `usuarios` | `xp_clase` | `numeric(12,2)` | XP de la Clase, campo aparte |
| `usuarios` | `xp_ref_total` | `numeric(12,2)` | XP de referidos |
| `usuarios` | `nivel` | `integer` | nivel DERIVADO de `xp_total` |
| `usuarios` | `nivel_max` | `smallint` | PISO HISTORICO DE INSIGNIA (ver 3.4) |
| `xp_ledger` | `xp_base`, `xp_final`, `bonos_planos` | `numeric(12,2)` | |
| `xp_ledger` | `mult_nivel`, `mult_stack`, `mult_final`, `mult_origen` | `numeric(10,6)` | |
| `xp_historial` | `xp_delta`, `xp_total_nuevo` | `integer` | **tipo incompatible** con `xp_total` (ver 3.5) |

**`usuarios` NO tiene `xp_aportada` ni `fama_bonus`.** Confirmado contra `information_schema.columns`: no existen. La fama vive en el score, no en el usuario.

### 3.2 La curva de multiplicador

```text
M_nivel(N) = 1.0 + ((N - 1) / 39) * (m_nivel_max - 1.0)
```

- Recortada a `[1, 40]` (`api/interacciones.js:530-537`).
- `M_NIVEL_MAX_DEFAULT = 3.0` (`api/interacciones.js:512`): constante de codigo = valor semilla, nunca una segunda fuente.
- Con el valor actual, el paso es `2.0/39` y el techo se alcanza en **N40**.

Composicion (`api/interacciones.js:1383-1412`):

```text
mult_progresion = m_nivel * mult_clase * factor_casa
mult_prog_c     = LEAST(mult_progresion, cap_progresion)   -- 5.0
cap_global      = 10.0 sobre mult_progresion_c * mult_stack
```

### 3.3 Las 13 filas de `gamificacion_config`

Medido el 2026-10-05, **13 filas** (`clave text` PK, `valor numeric(12,4)`, `descripcion text`):

| `clave` | `valor` | Que hace |
|---|---|---|
| `cap_progresion` | 5.0000 | Techo de `mult_progresion` |
| `cap_global` | 10.0000 | Techo de `mult_global` |
| `m_nivel_max` | 3.0000 | Valor de `M_nivel` en N20 (seccion 9 lo desmiente) |
| `factor_origen_local` | 1.0000 | Factor de origen Local (sin premio) |
| `factor_origen_nomada_max` | 1.2000 | Tope del factor Nomada |
| `factor_origen_extranjero_max` | 1.4000 | Tope del factor Extranjero |
| `origen_km_nomada` | 1000.0000 | Km de saturacion de la curva Nomada |
| `origen_km_extranjero` | 3000.0000 | Km de saturacion de la curva Extranjero |
| `origen_km_local` | 25.0000 | Radio de misma ciudad sin etiqueta |
| `origen_min_dias_cuenta` | 7.0000 | Antiguedad minima para Nomada/Extranjero |
| `ranking_score_gamma` | **0.0000** | Peso del ranking compuesto: 0.0 = XP puro |
| `ranking_score_gamma_inicio` | **0.0000** | Dias de la rampa (0-30); lo avanza `slot_rampa_avanzar` |
| `ranking_saldo_tope` | 2000.0000 | Tope del TERMINO DE SALDO del score (NO un tope de compra) |

Las tres primeras filas degradan a constantes de codigo si la tabla no responde. Las tres `ranking*` las introduce la migracion `046`.

### 3.4 `nivel_max` NO es un tope de gasto: es un PISO HISTORICO DE INSIGNIA

Medido en codigo (`api/interacciones.js:1590` y `:12413`):

```sql
UPDATE usuarios SET nivel_max = GREATEST(COALESCE(nivel_max, 1), $2::smallint) WHERE id=$1::uuid
```

Es **mono-tono con `GREATEST`: solo sube**. Nunca baja, aunque el usuario gaste XP. El nivel que se ve es `GREATEST(nivel derivado, nivel_max)`.

Dato medido: `max(nivel_max) = 9` y los valores distintos en los 10 usuarios son **`{1, 7, 9}`**. Los tres camefrom de la insignia.

### 3.5 `xp_historial` es una tabla MUERTA

Tres pruebas independientes, las tres medidas:

1. **0 filas** en `xp_historial`.
2. **0 escritores en todo el repo**: `Select-String` de `xp_historial` sobre `api/*.js`, `lib/*.js`, `db/*.sql` y `scripts/*.js` devuelve **0 coincidencias**. Nadie la inserta, nadie la lee, ni siquiera una migracion.
3. **Sus columnas `xp_delta` y `xp_total_nuevo` son `integer`** frente al `numeric(12,2)` de `xp_total`: aunque alguien la rellenara, perderia los centimos en el camino de vuelta.

**El mapa real de XP es `xp_ledger.accion`, con 13 valores distintos.** `xp_historial` tiene 2 indices (`xp_historial_pkey` y `idx_xp_usuario`) que no sirven de nada: un indice sobre una tabla que nadie escribe.

Su columna `tipo_evento` esta muerta por la misma razon: **0 menciones** en todo el repo.

### 3.6 `xp_ledger`: 160 filas, 13 acciones, append-only, sin idempotencia

- **160 filas**, **13 acciones distintas**, rango de fechas **2026-09-21 -> 2026-10-04**.
- **Append-only por construccion**: no hay `UPDATE` ni `DELETE` sobre `xp_ledger` en el codigo.
- **SIN indice unico de idempotencia.** Medido en `pg_indexes`: solo `xp_ledger_pkey` (unico, sobre `id`), `idx_xp_ledger_usuario_creado` y `idx_xp_ledger_accion_creado`. **Ningun indice unico por `(usuario_id, accion, ...)`**, luego nada impide escribir dos veces la misma acreditacion. La idempotencia, donde existe, es **logica y porParams en cada rama**, no del esquema.

Columnas: `id bigint`, `usuario_id uuid`, `accion text`, `xp_base`, `mult_nivel`, `mult_stack`, `mult_final`, `mult_origen`, `cap_aplicado`, `bonos_planos`, `xp_final`, `es_exento`, `origen_tier`, `contexto jsonb`, `creado_en`.

### 3.7 La distribucion del XP entre usuarios

| Medida | Valor |
|---|---|
| `usuarios` | **10** |
| `min(xp_total)` | **0.00** |
| `max(xp_total)` | **4060.85** |
| `avg(xp_total)` | **634.29** |
| `sum(xp_total)` | **6342.93** |
| usuarios con `xp_total = 0` | **4 de 10** |
| XP en los 2 usuarios top | **6177.93 de 6342.93 = 97.4%** |
| `sum(xp_gastado_sinks)` | **0.00** |
| usuarios en nivel 1 | **10 de 10 (100%)** |
| `min(nivel)` = `max(nivel)` | **1 = 1** |
| `sum(xp_clase)` | **1254.07** |
| `sum(xp_ref_total)` | **0.00** |

**Lectura:** el XP esta brutalmente concentrado (**97,4% en 2 usuarios**) y la mitad de la base (**4 de 10**) no ha acreditado **nada**. Un usuario nuevo arranca en **0 XP**, luego el primer slot cuesta mas que todo su historico. La progresion de nivel esta hoy inutil: **todos estan en N1**, luego `M_nivel` vale **1.0** para todo el mundo y el multiplicador de nivel **no esta haciendo nada todavia**.

---

## 4. Los sumideros

**Estado (2026-10-05; metodo: las 4 filas enteras de `sink_acciones`, los indices de `sink_slots` en `pg_indexes`, y `api/interacciones.js:2280-2445`):** los 4 sumideros estan cableados con una curva cuadratica cuyos numeros son **constantes de codigo**, y `sink_slots` esta **vacia (0 filas)**. El argumento de por que vive en **ADR-086**; aqui solo el estado.

### 4.1 Las 4 filas enteras de `sink_acciones`

Medido el 2026-10-05. La tabla tiene 7 columnas: `clave`, `etiqueta`, `costo_base_xp`, `slot_max`, `slot_max_activos`, `activo`, `creado_en`.

| `clave` | `etiqueta` | `costo_base_xp` | `slot_max` | `slot_max_activos` | `activo` |
|---|---|---|---|---|---|
| `foto_galeria` | Foto extra en galeria publica | **320.00** | 40 | 25 | `true` |
| `destacar_evento` | Destacar evento | **560.00** | 20 | 12 | `true` |
| `album_slot` | Slot adicional de album | **640.00** | 15 | 10 | `true` |
| `portada_destino` | Portada de destino | **800.00** | 5 | 3 | `true` |

**`sink_acciones` NO tiene `soporte`, ni `alpha`, ni `gamma`, ni `ref_contrato`.** Confirmado contra `information_schema.columns`: solo las 7 de arriba. Los tres primeros viven en codigo; el cuarto se computa de los dos primeros.

- La columna se llama **`costo_base_xp`**, no `base_xp`.
- El `CHECK` que blinda las cuotas es `ck_sink_acciones_topes CHECK (slot_max_activos <= slot_max)`, creado en la migracion `046` (`:149`).

### 4.2 La curva de precios

```text
costo(k) = ROUND(costo_base_xp * POWER(1 + 0.20 * k, 2.00), 2)
```

- `SINK_ALPHA = 0.20` y `SINK_GAMMA = 2.00` son **constantes de codigo** (`api/interacciones.js:2285-2286`), **NO columnas**. Viajan como parametros de la CTE.
- El helper es `api/interacciones.js:2421`.

**Precio medido slot 0-3** (verificado en SQL con `ROUND(costo_base_xp*POWER(1+0.20*k,2.0),2)`, no de memoria):

| `clave` | k=0 | k=1 | k=2 | k=3 | **k=39** |
|---|---|---|---|---|---|
| `foto_galeria` | **320.00** | **460.80** | **627.20** | **819.20** | **24780.80** |
| `destacar_evento` | **560.00** | **806.40** | **1097.60** | **1433.60** | 43366.40 |
| `album_slot` | **640.00** | **921.60** | **1254.40** | **1638.40** | 49561.60 |
| `portada_destino` | **800.00** | **1152.00** | **1568.00** | **2048.00** | 61952.00 |

El **slot 39 de `foto_galeria` = 24780.80**, que es exactamente `slot_max = 40`: el ultimo slot posible de la clave mas barata. El cuadratico **no** es decorativo: multiplica por ~77 el precio del primero al ultimo.

### 4.3 Donde si quedan congelados alpha y gamma

**No en `sink_acciones`, sino en `sink_slots`.** Medido en `information_schema.columns`, la tabla tiene `alpha_aplicado numeric(6,4)` y `gamma_aplicado numeric(6,4)`: cada slot comprado guarda **que curva se le aplico**. Es lo que permite que un cambio de constante no reescriba el historico. Y como `sink_slots` tiene **0 filas**, hoy no hay **ni un solo par (alpha, gamma) congelado**.

**`sink_slots`: 0 filas.** `ref_id` es **`text`** y nullable (no `uuid`). Sus 3 indices, medidos en `pg_indexes`:

- `uq_sink_slots_activo`: **UNICO PARCIAL** `(usuario_id, clave_accion, ref_id) WHERE activo = true` -> **dos slots activos del mismo enganche son un doble cobro y el indice los rechaza** (`23505`); un slot dado de baja (`activo = false`) ya no ocupa plaza, luego recomprarlo es legitimo.
- `idx_sink_slots_usuario`: parcial `(usuario_id, clave_accion) WHERE activo = true`.
- `idx_sink_slots_usuario_hist`: `(usuario_id, clave_accion)`.

### 4.4 El contrato `ref_id`: allow-list en CODIGO, no desde la BD

`SINK_REF_ORIGEN` (`api/interacciones.js:2323-2354`) es el unico lugar que decide a que se engancha cada sumidero. **El nombre de tabla sale de ahi, nunca del navegador**: la clave ya esta contra `SINK_CLAVES` (`:2293`) antes de llegar, y aun asi el SQL se construye con literales, no con el valor del cliente.

| `clave` | `tabla` | `columna` | Filtro | `soporte` | `requiere_pertenencia` |
|---|---|---|---|---|---|
| `foto_galeria` | `usuario_fotos` | `id` | - | `true` | `true` |
| `album_slot` | `albumes` | `id` | - | `true` | `true` |
| `portada_destino` | `spot_duenos` | `destino_id` | ` AND tipo_medio = 'general'` | `true` | `true` |
| `destacar_evento` | `null` | `null` | - | **`false`** | `true` |

El filtro de `portada_destino` esta en el **MISMO `EXISTS`**, no en una segunda consulta: separar la comprobacion abre una carrera. Sin ese filtro, pertenecer **cualquier medio** de un destino compra la portada, que es el extremo `general`.

`destacar_evento` lleva su `motivo_soporte` **literal**, que viaja a la UI:

> `No existe tabla de eventos en el esquema: no se puede probar que un evento exista ni a quien pertenezca`

**No existe ninguna tabla de eventos en el esquema.** Por eso `soporte: false` y la compra se **RECHAZA** en vez de crear una fila huerfana por la que alguien paga 560 XP. Preferible no comprable a cobrar por nada.

### 4.5 `slot_max` frente a `slot_max_activos`

- **`slot_max`** = cuota **de por vida**. El guard es `p.k_actual < p.slot_max`, y `k_actual` es el **historico**: cuenta todas las filas, no las vivas.
- **`slot_max_activos`** = maximo **vivos** a la vez.

El `CHECK (slot_max_activos <= slot_max)` impide que la cuota de vivos sea mas alta que la de por vida. La consequence medida de que `slot_max` sea historico esta en la seccion 10 (deuda 1): comprar y cancelar **quema cuota** y no devuelve XP.

**`sINK_acciones.activo = true` en las 4 filas**, luego ninguna esta desactivada: el filtro real de compra es el pool de la seccion 9.

### 4.6 Referencia

El **argumento completo** de por que alpha/gamma son constantes, por que `ref_id` es obligatorio, por que el indice es parcial y por que el motor comparte una sola aritmetica vive en **`DECISIONS.md` ADR-086**, con las tres premisas que la seccion 4 asumio y el esquema desmiente corregidas en **`DECISIONS.md` ADR-088**. Este documento no los reescribe.

---

## 5. De donde se gana XP

**Estado (2026-10-05; metodo: `GROUP BY accion` sobre `xp_ledger`, `XP_BASES` en `api/interacciones.js:472-499`, y el recuento de `spot_dividendos` por fichero):** hay **13 acciones con filas reales** y XP mas barato que se puede obtener, pero el XP mas barato cuesta **320 XP = 107 `voto_media`**.

### 5.1 Las 13 acciones reales de `xp_ledger`

Las 13 que tienen filas, con su rango de fechas real:

| `accion` | Filas | `xp_base` (catalogo) | Rango de fechas |
|---|---|---|---|
| `voto_media` | **55** | 3 | 2026-09-21 -> 2026-10-03 |
| `album_foto` | **26** | 20 | 2026-09-21 -> 2026-09-29 |
| `guardado` | **24** | 3 | 2026-09-21 -> 2026-09-30 |
| `rating` | **17** | 5 | 2026-09-21 -> 2026-09-24 |
| `chat_comentario` | **10** | 6 | 2026-09-21 -> 2026-09-23 |
| `logro` | **8** | (misiones) | 2026-09-21 -> 2026-10-04 |
| `mision` | **7** | (misiones) | 2026-09-22 -> 2026-10-04 |
| `resena_larga` | **5** | 30 | 2026-09-21 -> 2026-09-23 |
| `album_crear` | **2** | 25 | 2026-09-23 -> 2026-09-29 |
| `resena_corta` | **2** | 10 | 2026-09-23 -> 2026-09-23 |
| `foto_viajero` | **2** | 30 | 2026-09-23 -> 2026-09-29 |
| `album_guardado` | **1** | 5 | 2026-09-23 -> 2026-09-23 |
| `album_guardado_autor` | **1** | 10 | 2026-09-23 -> 2026-09-23 |
| **TOTAL** | **160** | | **2026-09-21 -> 2026-10-04** |

**El catalogo `XP_BASES` tiene 26 claves y solo 11 tienen filas.** De las 13 acciones del ledger, dos (`mision` y `logro`) **no son claves de `XP_BASES`** (salen de las tablas de misiones y logros), luego quedan **15 claves cableadas y sin una sola fila**: `visita`, `visita_bono_rural`, `compartir`, `album_foto_autor`, `ao_votar`, `ao_proponer`, `ao_checkin`, `plan_crear`, `plan_unirse`, `spot_atributos`, `publicar_basico`, `publicar_intermedio`, `publicar_completo`, `publicar_bono_geo`, `publicar_bono_foto`. Que esten cableadas y tengan 0 filas es un hecho de trafico, no un defecto.

### 5.2 Los mecanismos de XP, cableados o no

| Mecanismo | Tabla | Filas | Cableado |
|---|---|---|---|
| Interaccion directa (voto, guardado, rating, resena, album, foto) | `xp_ledger` | 160 en total | **si** |
| Misiones y logros | `xp_ledger` (`accion` = `mision` / `logro`) | 7 + 8 | **si** |
| Regalias pasivas (`REGALIA_PCT = 0.20`) | `regalias` | 38 filas de catalogo | **si** (se mintean al reclamar) |
| Referidos multinivel | `xp_ref_total` | **0.00** acumulado | **si**, 14 puntos de escritura |
| XP de Clase | `xp_clase` | 1254.07 acumulado | **si** |
| Parches / **`Fama_Parche`** | `parche_upgrades`, `gobernanza_votos`, `pandillas` | **0 / 0 / 0** | **SQL puro, NO persistida** |
| **`spot_dividendos`** | `spot_dividendos` | **0** | **si, 12 call-sites** |
| Compra de sumidero | `xp_ledger` | **0 filas con `accion LIKE 'sink%'`** | **si** |

### 5.3 `Fama_Parche`: 3 componentes, pesos 1.0 / 2.0 / 3.0, NO persistida

```text
Fama_Parche(u) = 1.0 * (fama_total de la pandilla * factor_de_rol
                        / GREATEST(factor_conversion de la Casa, 1.0))
               + 2.0 * SUM(puntos_invertidos de upgrades VIGENTES del parche)
               + 3.0 * SUM(peso de votos en propuestas de capa 'parche' ya aprobadas)
```

Medido (`lib/score.js:58-84`):

- **NO se persiste en ninguna columna.** Se calcula entero dentro del `SELECT` del ranking, en SQL puro.
- Los **3 pesos 1.0 / 2.0 / 3.0** son literales en la cadena SQL, no datos de `gamificacion_config`.
- El termino de parche se acredita a **`pu.usuario_id`**, el usuario que **invierto** (migracion `047`), no a cada miembro de la pandilla. Sin eso, una pandilla de N miembros inflaba la misma `SUM` N veces.
- Las 3 fuentes se pre-agregan **por usuario** y despues se suman a proposito: un unico agregado conjunto haria producto cartesiano y multiplicaria los valores.
- **Medido hoy: `Fama_Parche = 0` para los 10 usuarios**, porque `pandillas` = 0, `parche_upgrades` = 0 y `gobernanza_votos` = 0.

**`rol_factor` NO existe como simbolo**: aparece una sola vez, en un comentario (`lib/score.js:36`). No es columna ni constante.

### 5.4 `spot_dividendos`: SI esta cableado; lo que falta es DATO

Medido por fichero:

| Fichero | Menciones de `spot_dividendos` |
|---|---|
| `api/interacciones.js` | **9** |
| `api/admin.js` | **1** |
| `scripts/smoke_gaming_v61.js` | **2** |
| **TOTAL en el repo** | **12** |

El motor tiene, entre otros puntos, la comprobacion de existencia (`SELECT 1 AS uno FROM spot_dividendos`, dos veces), el `INSERT` **idempotente** por `fuente_interaccion_id` (`api/interacciones.js:1175-1202`) y el `CHECK` real `monto_descontado <= xp_bruto_base * 0.50` (**tope del 50%**). Ademas degrada tipado (`warn`) si `spot_dividendos`/`spot_duenos` no existen.

**`spot_dividendos` tiene 0 filas. Lo que falta es DATO, no codigo.**

La tabla la creo la **migracion `040`** (`CREATE TABLE spot_dividendos` esta en `040_gobernanza_cartas_moneda.sql`), **no la `046`**: la `046` tiene **0 menciones** de la cadena `spot`.

### 5.5 Cuanto XP necesita un usuario nuevo para el primer slot

El usuario nuevo arranca en **0 XP**. Los `XP_BASES` mas baratos, medidos:

| Base | XP | Cuantos para 320 XP |
|---|---|---|
| `voto_media` | **3** | **107** |
| `guardado` | **3** | **107** |
| `rating` | **5** | **64** |
| `chat_comentario` | 6 | 54 |
| `album_guardado` | 5 | 64 |

**320 XP = 107 `voto_media`.** Ese es el precio real del primer slot (`foto_galeria`, k=0), y es un numero de interacciones, no de XP: la accion mas cara del catalogo (`publicar_completo`, 120) lo haria en **3**.

Los costos de eleccion de identidad tambien son mas caros que el primer slot:

| Concepto | Costo | Constante |
|---|---|---|
| `COSTO_CLASE` | **500** | `api/usuarios.js:629` |
| `COSTO_CASA` | **500** | `api/usuarios.js:628` |
| `COSTO_FACCION` | **800** | `api/usuarios.js:627` |

Los tres pagan con `xp_total` y exigen **dos invariantes** a la vez: `xp_total >= COSTO` **y** `GREATEST(xp_total - COALESCE(xp_gastado_sinks,0), 0) >= COSTO`. Un disponible acotado a 0 **no compra**. La primera eleccion es gratis; el **recambio** cuesta.

### 5.6 La calificacion de media paso de like binario a 1 a 5 estrellas (ADR-089) - 2026-10-06

**Estado (2026-10-06; metodo: `XP_BASES` y la rama `tipo=voto_media` de `api/interacciones.js` leidos contra el fichero, ledger de `schema_migrations`, y conteos en Neon):** el **valor** de `voto_media` **no cambia** (**3 XP**, con su `factorVoto`); lo que cambia es **cuando se paga**. Se documenta aqui porque **la economia de la accion mas barata del catalogo cambio de forma**, aunque su precio siga siendo el mismo.

**Los 4 cambios que afectan a la economia (y solo estos):**

1. **+3 XP SOLO en el ALTA. Cambiar de nota da 0.** Con el contrato binario, `voto_media` se pagaba **una vez por like** y el `unlike` no devolvia nada. Con calificacion, **la opinion es actualizable y definitiva** (sin `unlike`, sin 409): el alta paga, y **cambiar la nota de 1 a 5 y volver a 1 ya no paga nada**. **El bucle de farm `1 -> 5 -> 1 -> 5` esta cerrado por construccion**, no por un cooldown ni por una regla: **no hay segunda alta que lo dispare**, porque el upsert es idempotente sobre la PK `(usuario_id, fuente, item_id)`. Esto es una mejora economica real y no solo tecnica: antes el `"me gusta"` era un recurso de XP unlimited (pagaba siempre, y el `unlike` no devolvia), y ahora el recurso de XP es **la creacion de una opinion nueva**, que es finito por construccion.
2. **`VOTOS_DIA_MAX = 20` ya contaba ALTAS, y eso no cambio: por eso no habia nada que arreglar.** El cupo diario se media sobre **`creado_en`**, que es **inmutable**: en un reenvio con `DO UPDATE` la fecha **no se toca**. Luego las **20** ya eran **20 calificaciones nuevas**, no 20 peticiones, y **el rebote ya no existe comovia de bypass**. Se mantiene **intacto**: cambiarlo seria alterar el equilibrio de un valor que **no es de esta migracion** (ADR-053/079).
3. **`factorVoto` sigue aplicando, pero solo en el alta.** Se conserva el decaimiento `1 - carga/VOTO_DECAY_DIV` (`VOTO_DECAY_DIV = 20`) aplicado **al alta**, junto con su valor de `XP_BASES.voto_media`. **Consecuencia que hay que leer con el punto 1:** cambiar de nota **no recarga ni consume** la carga ponderada, luego la segunda calificacion de un autor **no se bonifica** por ser popular.
4. **`media_rep_autores` acumula CONTADORES y SUMA, y NUNCA el promedio.** Es `(autor_id PK, votos_recibidos, suma_notas)`, **sin columna `reputation`**, y su `suma_notas` es **`sum(puntuacion)` bruta**, sin centrar en 3. **Por que es la decision correcta y no una preferencia:** un promedio re-escrito es **perdible** en el momento en que se escribe (`(n*p + x)/(n+1)` pierde precision con cada lectura y **nunca se puede reconstruir bit a bit**), mientras que `suma_notas` **si se puede**: es la suma y el conteo, y de ahi el promedio sale cuando se lea, cuando haga falta. **Un agregado de reputacion que no se puede reconstruir no es un agregado: es una cache sin invalidacion.**

**Lo que NO existe todavia (y por eso este apartado tiene un "acumulado pero no mostrado"):** la escala de reputacion de autor **`(suma_notas - 3*votos) / (2*votos)`** es la **formula de lectura teorica de ADR-089 D2**, y **no esta implementada**: **no hay ninguna lectura de reputacion de autor en el backend** y la tabla **no tiene donde guardarla** (`reputation` no existe como columna). **El dato se acumula correctamente y no se muestra en ninguna parte.** Es coherente con el resto de este documento (el sistema esta cableado y la mayor parte, inerte por falta de trafico), pero conviene que quede dicho: **acumular sin leer no genera juego.**

**Lo que este apartado NO cambia:** `XP_BASES.voto_media` = **3**, `VOTOS_DIA_MAX` = **20**, `VOTO_DECAY_DIV` = **20**, el catalogo de `xp_ledger`, los sumideros, los 4 rankings y los 20/20 niveles de `XP_BASES`. **La migracion de la calificacion no es una migracion de la economia de XP**: es una migracion de **una condicion de otorgamiento**. Y las **320 XP = 107 `voto_media`** de la seccion 5.5 **siguen siendo el precio real del primer slot**, porque el valor de la accion no ha cambiado; lo que cambiara, con trafico real, es **cuantos `voto_media` caben en un dia**, y eso **hoy no se puede medir** (mediana de **~1** voto por item sobre `media_votos`).

---

## 6. Los 4 rankings

**Estado (2026-10-05; metodo: `lib/score.js` leido + los 3 call-sites en `api/usuarios.js` + `gamificacion_config` en Neon):** los 4 rankings comparten **una sola aritmetica** en `lib/score.js`, y como `gamma = 0.0000` **hoy ordenan por `xp_total` puro**. Los tres terminos que no son XP valen cero.

### 6.1 La formula real

Medida en `lib/score.js:107-123`:

```sql
score_ranking = xp_total
              + COALESCE((SELECT valor FROM gamificacion_config
                          WHERE clave = 'ranking_score_gamma'), 0.0000)
                * ( 0.50 * LEAST(GREATEST(saldo, 0),
                                 COALESCE((SELECT valor FROM gamificacion_config
                                           WHERE clave = 'ranking_saldo_tope'), 2000.0000))
                  + GREATEST(fama, 0) )
```

| Componente | Peso / valor | De donde sale |
|---|---|---|
| `xp_total` | **1.0** (implicito) | `usuarios.xp_total` |
| `saldo` | `SCORE_BETA_SALDO` = **0.50** | `GREATEST(SUM(moneda_ledger.delta), 0)` **por usuario, sin filtro de moneda** |
| `fama` | **1.0** (implicito) | `Fama_Parche` (seccion 5.3) |
| `gamma` | **`0.0000`** (medido en Neon) | `gamificacion_config.ranking_score_gamma` |

**Como `gamma = 0.0000`, `score_ranking ≡ xp_total`.** Los 4 rankings ordenan hoy por XP puro. `saldo` es 0 (`moneda_ledger` = 0 filas) y `fama` es 0 (seccion 5.3), luego incluso con gamma distinto serian 0.

Ultima red del orden (`lib/score.js:129`): `ORDER BY COALESCE(score_ranking, xp_total) DESC, xp_total DESC, id ASC`. Si el score llegara en `NULL` por cualquier causa, el orden cae a `xp_total` en vez de volverse arbitrario.

### 6.2 Tres trampas de lectura

1. **El "2.0" de ADR-086 es el PESO del componente de parche, NO el valor de `gamma`.** El `2.0` es el multiplicador de `puntos_invertidos` dentro de `Fama_Parche`. El `gamma` del ranking esta en **`0.0000`**.
2. **El techo 1.0 de `gamma` NO EXISTE ni en codigo ni en dato.** No hay ningun `clamp` de gamma a 1.0 en `lib/score.js`. La unica mencion de 1.0 es el **texto de la `descripcion`** de `ranking_score_gamma` en `gamificacion_config`, que describe la escala ("0.0 = XP puro, 1.0 = score completo"). **Es prosa, no una restriccion.**
3. **`ranking_saldo_tope` = 2000 es un tope del TERMINO DE SALDO del score, NO un tope de compra.** Los topes de compra son `slot_max`, `slot_max_activos` y `xp_gastado_sinks`, y **ninguna rama de compra consulta `ranking_saldo_tope`**. Ademas el 2000 es la **semilla de la `045`** (`SCORE_TOPE_SEMILLA`), no una constante de negocio: con la fila presente se lee el dato.

### 6.3 El motor compartido y por que vive fuera de `api/`

`lib/score.js`, **171 lineas**. Lo consumen **4 rankings**:

| Ranking | Fichero | Linea |
|---|---|---|
| `leaderboard` | `api/usuarios.js` | **1105** |
| `faccion_ranking` | `api/usuarios.js` | **1342** |
| `casa_ranking` | `api/usuarios.js` | **1400** |
| `pandilla_ranking` | `api/interacciones.js` | **8445** |

**Por que en `lib/` y no en `api/`:** los 8 ficheros de `api/` son **8/8 funciones serverless** (presupuesto Vercel Hobby agotado). Un noveno fichero en `api/` seria una novena funcion. Un modulo de `lib/` no es endpoint: Vercel lo incluye en el bundle por trazado de dependencias (nft) sin consumir funcion. **Si esta aritmetica se duplicara dentro de un `api/*.js`, los 4 rankings dejarian de ser comparables entre si** -- que es exactamente lo que ADR-086 prohibe.

### 6.4 `DISTINCT ON` y proyeccion explicita

Medido (`lib/score.js:107-116`): `SELECT DISTINCT ON (u.id) <proyeccion explicita>` con `ORDER BY u.id, u.xp_total DESC`.

- La proyeccion es **explicita, nunca `u.*`**: `u.*` arrastraria `email`, que es PII.
- `cols` **DEBE empezar por `'id'`**, que es la clave del `DISTINCT ON`.
- Dos CTE y no una: `score` garantiza **una fila por usuario**; `scored` solo anade el termino compuesto en un paso 1:1, luego no puede re-multiplicar lo que `score` ya colapso.
- El comentario del codigo admite que el `DISTINCT ON` **hoy es redundante** (los agregados llevan `GROUP BY`) y que se cablea igual por decision: el fallo que protege (un `LEFT JOIN` anidado que multiplica filas) no da error ni aviso, y sale corrupto solo en produccion, con el mismo usuario en dos puestos.

### 6.5 La ternaria real del rol

Medida (`lib/score.js:64-65`):

```sql
CASE pm.rol WHEN 'fundador' THEN 1.0 WHEN 'oficial' THEN 0.6 ELSE 0.3 END
```

Lee **`pandillas_miembros.rol`** (con alias `pm`, `WHERE pm.activo = true`). Escala: **1.0 / 0.6 / 0.3**, dividida por `GREATEST(COALESCE(cc.factor_conversion, 1.0), 1.0)`.

**NO lee `casa_roles`.** Alli `'oficial'` si se escribe, pero es **otro dominio**: el rol de una Casa no es el rol de una pandilla, y meterlo en la escala de fama seria un error de modelo. Consecuencia medida: **`pandillas_miembros` tiene 0 filas**, luego `'oficial'` es **inalcanzable** en la escala (deuda 4 de la seccion 10).

---

## 7. Mapa de codigo

**Estado (2026-10-05; metodo: `Select-String` de `tipo === '...'` y `tipo2 === '...'` sobre `api/interacciones.js` y `api/usuarios.js`):** 7 ramas de sumideros y 4 de ranking, todas en ficheros existentes, **sin endpoint nuevo** (8/8 intactos).

### 7.1 Sumideros: 4 GET que proyectan estado

| Rama | Fichero:linea | Que devuelve |
|---|---|---|
| `GET ?tipo=slot_catalogo` | `api/interacciones.js:8930` | Los 4 sumideros, su curva (`alpha`/`gamma`), `costo_base_xp`, `slot_max`/`slot_max_activos`, `puede_comprar`, `motivo_soporte`, `costo_siguiente` |
| `GET ?tipo=slot_mios` | `api/interacciones.js:9031` | Los slots del usuario con `costo_pagado`, `slot_index`, `alpha_aplicado`/`gamma_aplicado` congelados |
| `GET ?tipo=slot_refs` | `api/interacciones.js:9130` | Los `ref_id` comprables del usuario, **verbatim**, con sesion obligatoria (401 `SESION_REQUERIDA`/`SESION_INVALIDA`) y `usuario_id = $1` en la misma sentencia |
| `GET ?tipo=slot_rampa` | `api/interacciones.js:9254` | El estado de la rampa: `ranking_score_gamma`, `ranking_score_gamma_inicio`, `ranking_saldo_tope` y los dias transcurridos |

### 7.2 Sumideros: 3 POST que escriben

| Rama | Fichero:linea | Que escribe |
|---|---|---|
| `POST ?tipo=slot_comprar` | `api/interacciones.js:15463` | `sink_slots` (con `alpha_aplicado`/`gamma_aplicado`) + debito de `xp_gastado_sinks` en la misma sentencia |
| `POST ?tipo=slot_baja` | `api/interacciones.js:15694` | `sink_slots.activo = false`. **`xp_devuelto: 0`**: la cuota se quema |
| `POST ?tipo=slot_rampa_avanzar` | `api/interacciones.js:15755` | Avanza `ranking_score_gamma_inicio` (0-30). **Unico escritor de esa clave** |

El despachador de los 3 POST esta en `api/interacciones.js:14754-14756` (`slEsPostSumidero`).

### 7.3 Los 4 rankings

| Rama | Fichero:linea |
|---|---|
| `GET ?tipo=leaderboard` | `api/usuarios.js:1105` |
| `GET ?tipo=faccion_ranking` | `api/usuarios.js:1342` |
| `GET ?tipo=casa_ranking` | `api/usuarios.js:1400` |
| `GET ?tipo=pandilla_ranking` | `api/interacciones.js:8445` |

Los 4 degradan por `sqlConDegradacion` (`lib/score.js:149-157`): reintento de **esquema ausente** (`42P01`/`42703` = migracion no aplicada) y de **coste** (`57014` = timeout). Un codigo que no sea de esquema o coste **no se silencia: sube**. El `COALESCE` del multiplicador es la red para el `NULL`, y hacen falta las dos porque un fallo da `catch` y el otro no da ni error ni warning en PostgreSQL.

### 7.4 Las ~33 escrituras de `xp_total`, agrupadas por mecanismo

Medido: **32** ocurrencias de `SET xp_total = xp_total` (**29** en `api/interacciones.js`, **3** en `api/usuarios.js`) **+ 1** en `api/admin.js:1015`. No se listan una por linea porque son el mismo mecanismo repetido:

| Mecanismo | Donde | Como agrupa |
|---|---|---|
| **Acreditacion de interaccion** (voto, guardado, rating, resena, foto, album, chat, comentario) | `api/interacciones.js` (~20Update) | `UPDATE usuarios SET xp_total = xp_total + $1, ultimo_acceso = NOW() WHERE id = $2`, precedido siempre de `calcularXpAcreditado` + `registrarXpLedger` |
| **Misiones y logros** | `api/interacciones.js:12493`, `:14583`, `:14649` | `xp_total = xp_total + (SELECT recompensa_xp FROM c)` -- el recompensa vive en la CTE, no en un literal |
| **Activo Oculto (Wayfarer)** | `api/interacciones.js:9362`, `:9474`, `:9590`, `:9854`, `:10063`, `:10141`, `:10240` | mismo patron, `accion` = `ao_votar` / `ao_proponer` / `ao_checkin` / `plan_crear` / `plan_unirse` |
| **Ponderacion de rol en Pandilla** | `api/interacciones.js:13473` | `xp_total = xp_total + $4::numeric` con la ponderacion de rol |
| **Compra en mercado** | `api/interacciones.js:13754` | `xp_total = xp_total + (m.qty * m.precio)` (precio en XP) |
| **Atributos de Spot** | `api/interacciones.js:12963` | `XP_BASES.spot_atributos` |
| **Compra de spot por un tercero** | `api/interacciones.js:1213`, `:4946`, `:5117` | acreditacion al dueno del destino |
| **Alias legacy de media** | `api/interacciones.js:14881`, `:14914`, `:15040`, `:15295`, `:15429` | mismo patron, 5 puntos |
| **Eleccion de identidad (DEBITO)** | `api/usuarios.js:1686`, `:1784`, `:1881` | `xp_total = xp_total - COSTO_{FACCION,CASA,CLASE}` con los **dos** invariantes (`xp_total >=` y `disponible >=`) |
| **Administracion** | `api/admin.js:1015` | `xp_total = xp_total + 50` (ajuste manual) |

**El mismo texto SQL en 33 sitios es un riesgo declarado**, no un defecto: el motor de calculo (`calcularXpAcreditado`) es unico, lo que se repite es la forma del `UPDATE`. El clamp del disponible esta en esos mismos puntos (ver `DECISIONS.md` ADR-088).

---

## 8. Migraciones de juego + estado del ledger

**Estado (2026-10-05; metodo: `schema_migrations` completo desde Neon + cabecera de cada `.sql` en `db/migrations/`):** **7 migraciones aplicadas (`044`-`050`), 0 fallidas, 48 filas** en el ledger, de las cuales **41 son `historico_no_verificado`**.

### 8.1 Las 7 migraciones de juego, que hace cada una

| Fichero | Que hace |
|---|---|
| `044_planes_viaje_fecha_inicio.sql` | `planes_viaje.fecha_inicio date` (fecha de inicio, no timestamp) + indice parcial `idx_planes_viaje_activo_fecha WHERE activo = true` |
| `045_schema_migrations.sql` | Crea **la propia tabla `schema_migrations`**: el registro de que ficheros estan aplicados y con que grado de certeza. No modifica ninguna tabla existente |
| `046_market_multimoneda_sinks.sql` | Enmienda 3 a ADR-061 (moneda de 1 a 3) + **Capa 1 sumideros** (`sink_acciones`, `sink_slots`, `ck_sink_acciones_topes`) + **ranking compuesto** (semillas `ranking*`) + `moneda_cuentas` re-claveada. **FORWARD-ONLY**: cualquier error posterior se corrige con una `047+`, nunca con rollback |
| `047_parche_upgrades_usuario_inversor.sql` | `parche_upgrades.usuario_id`: **atribucion del inversor**, para que el termino de parche de `Fama_Parche` se acredite a quien inversio y no a cada miembro |
| `048_parche_upgrades_usuario_id_obligatorio.sql` | Cierre en **prevention** del invariante `usuario_id` obligatorio |
| `049_parche_upgrades_usuario_id_set_not_null.sql` | Impone **`NOT NULL`** de verdad, para que el catalogo (`information_schema`) deje de decir `YES` y pase a `NO` |
| `050_indice_parcial_sink_slots_activos.sql` | Sustituye la falsa unicidad `uq_sink_slot` (que incluía `creado_en`, un timestamp de transaccion) por un indice **UNICO PARCIAL** `(usuario_id, clave_accion, ref_id) WHERE activo = true` |

**Nota sobre la `048`:** su cabecera dice *"Estado en disco: REDACTADA Y SIN APLICAR. NO APLICAR TODAVIA."*, pero **el ledger dice `resultado = 'aplicada'`**. El ledger manda (es la BD real): la `048` **esta aplicada**. La cabecera es texto obsoleto. La `049` **si** esta aplicada y **si** surtio efecto: `parche_upgrades.usuario_id` mide `is_nullable = NO`.

### 8.2 El ledger

Medido con `SELECT numero, resultado, checksum, verificada_en FROM schema_migrations ORDER BY numero`:

| Medida | Valor |
|---|---|
| Filas totales | **48** |
| Rango de `numero` | **3 - 50** (001 y 002 no existen: el ledger arranca en la 003) |
| Con `resultado = 'aplicada'` | **7** (`044`, `045`, `046`, `047`, `048`, `049`, `050`) |
| Con `resultado = 'historico_no_verificado'` | **41** (`003`-`043`) |
| Con `resultado = 'fallida'` | **0** |
| Con `verificada_en` informado | **1** (solo la `044`, `2026-10-05 19:39:13`) |

**La columna del ledger es `numero`, NO `version`.** `SELECT version FROM schema_migrations` falla.

**Que significa `historico_no_verificado`:** esas 41 filas **no afirman nada** sobre Neon. Declaran "hay un checksum de un fichero en disco" sin afirmar que ese fichero se aplicara. Es una honestidad deliberada del seed, no una falta: preferible 41 filas que no afirman a 41 filas que mienten. Por eso el numero de migraciones **reales** del proyecto es mayor que 7, y **solo las 7 de la `044` en adelante estan confirmadas por el propio ledger**.

Columnas de la tabla: `nombre text`, `numero smallint`, `resultado text`, `checksum text`, `aplicada_en`, `registrada_en`, `verificada_en`, `duracion_ms integer`, `notas text`.

---

## 9. Que queda faltando (lo inerte)

**Estado (2026-10-05; metodo: `UNION ALL` de conteos sobre 40 tablas en Neon, `pg_class.relrowsecurity`, `pg_indexes` y `pg_policies`):** esta es la seccion mas importante del documento. Todo lo de las secciones 3 a 8 esta **correcto y desplegado**, y **nada de eso se puede todavia**. El sistema es una maquina perfectamente engrasada sin una gota de combustible.

### 9.1 Por dato ausente

| Tabla / campo | Filas | Que se queda en cero |
|---|---|---|
| `sink_slots` | **0** | **Ninguna compra de sumidero ha ocurrido nunca.** Es la razon de que `SUM(xp_gastado_sinks) = 0.00` |
| `xp_ledger` con `accion LIKE 'sink%'` | **0** | El ledger no registra ni un gasto de sumidero |
| `parche_upgrades` | **0** | El componente 2.0 de `Fama_Parche` |
| `gobernanza_propuestas` | **0** | La capa de propuestas |
| `gobernanza_votos` | **0** | El componente 3.0 de `Fama_Parche` |
| `pandillas` | **0** | La `fama_total` de la que sale el componente 1.0 |
| `pandillas_miembros` | **0** | **La escala de rol entera** -> **`Fama_Parche = 0` en los 10 usuarios**, y `'oficial'` inalcanzable |
| `moneda_ledger` | **0** | **`saldo = 0`** para los 10, luego el termino `0.50 * saldo` del score vale 0 |
| `spot_dividendos` | **0** | El dividendo por Own the Spot. **El codigo SI esta** (12 call-sites, idempotente): falta el dato |
| `spot_presencia` | **0** | La presencia en spot |
| `mercado_ofertas` | **0** | El mercado P2P |
| `mercado_ventas` | **0** | Las ventas del mercado |
| `moneda_mercado` | **0** | El mercado de la moneda secundaria |
| `cartas_gates` | **0** | Los gates de cartas |
| `cartas_intercambios` | **0** | Los intercambios |
| `cartas_ofertas` | **0** | Las ofertas de cartas |
| `cartas_ventas` | **0** | Las ventas de cartas |
| `usuarios_cartas` | **0** | **Ningun usuario posee una carta** |
| `usuarios_cromos` | **0** | **Ningun usuario posee un cromo** |
| `cromos_catalogo` | **0** | El catalogo de cromos esta vacio |
| `cromo_intercambios` | **0** | Los intercambios de cromos |
| `pandilla_retos` | **0** | Los retos de parche |
| `ranking_zonas` | **0** | El ranking por zonas |
| `compra_consumibles` | **0** | **Nadie ha comprado un consumible** (`consumibles` tiene 35 filas de catalogo) |

**Sobre las cartas:** `cartas_catalogo` tiene **21 filas** y es lo unico que sobrevive. **Toda la cadena transaccional esta en 0**: sin gates no hay desbloqueo, sin ofertas no hay mercado, sin ventas no hay economia. Un catalogo de 21 cartas que nadie puede tener.

**Lo que si tiene filas (para que no se lea como "todo esta vacio"):** `chat_salas` = **4** y `chat_mensajes` = **9**; `spot_duenos` = **4** (las 4 `activo = true`, **1** `usuario_id` distinto); `billeteras` = **2**; `consumibles` = **35**; `regalias` = **38**; `interacciones` = **821**; `albumes` = **11**; `usuario_fotos` = **1**; `mercado_config` = **3**.

**`chat_sala` NO esta inerte**: la tabla se llama **`chat_salas`** (plural) y **`chat_mensajes`**, y tiene **4 salas con 9 mensajes**. El nombre en singular no existe en el esquema.

### 9.2 Por codigo inalcanzable

| Codigo | Por que no se dispara |
|---|---|
| `destacar_evento` | **No comprable.** `soporte: false`: no existe tabla de eventos. El servidor **rechaza** la compra en vez de crear una fila huerfana por la que alguien pague 560 XP |
| Rol `'oficial'` | **0 filas** en `pandillas_miembros`. El `CHECK` de rol ya admite `'oficial'`, luego **el esquema no bloquea nada**: no es un escritor que falta, es una poblacion que no existe |
| Rama `nivel >= 20` del dividendo spot (`api/interacciones.js:1135`) | **Los 10 usuarios estan en nivel 1.** Nunca se cumple |
| `ranking_score_gamma_inicio` | **0 de 30.** Su unico escritor es `POST ?tipo=slot_rampa_avanzar`, y **nadie ha llamado a ese endpoint**. La rampa del gamma no ha empezado |
| `xp_historial` y `tipo_evento` | **Tabla y columna muertas**, 0 escritores en todo el repo (seccion 3.5) |
| `gamma != 0` | Con `ranking_score_gamma = 0.0000`, el termino compuesto **no puede aportar nada**: se multiplica por cero |
| `M_nivel > 1.0` | **100% de los usuarios en nivel 1** -> el multiplicador de nivel vale 1.0 para todo el mundo |
| Clamps de compra por `ranking_saldo_tope` | **No existen**: ese dato solo se lee en el score (seccion 6.2) |

### 9.3 El desfase de `gamificacion_config.m_nivel_max`

Medido, y es una discrepancia real entre dato y codigo:

| Fuente | Dice |
|---|---|
| `gamificacion_config.m_nivel_max.descripcion` | *"Valor de M_nivel en **N20** (1.0 + (N-1)/**19** * 2.0)"* |
| Codigo (`api/interacciones.js:526-536`) | `1.0 + ((n - 1) / **39**) * (tope - 1.0)`, recortada a `[1, 40]`, tope alcanzado en **N40** |

El **valor** (`3.0000`) es el mismo y la aritmetica es correcta: con `/19` el tope se alcanzaria en N20, con `/39` en N40. **Lo que esta mal es la `descripcion`**, que documenta una curva pre-reescalada. No se corrige aqui (ADR-006: el dato y el codigo son dos fuentes y el codigo es el que se ejecuta); queda registrada como desfase.

### 9.4 Por pool de oferta

Un sumidero comprable sin recursos que enganchar es un boton que no puede hacer nada. El pool real, medido en las tablas de enganche de `SINK_REF_ORIGEN`:

| `clave` | Tabla de pool | Filas | Autores | Nota |
|---|---|---|---|---|
| `foto_galeria` | `usuario_fotos` | **1** | **1** | **1 fila en todo el universo.** 1 activa |
| `album_slot` | `albumes` | **11** | **2** | De las 11, solo **5** `activo = true`, y siguen siendo de **2 autores** |
| `portada_destino` | `spot_duenos` (`tipo_medio = 'general'`) | **2** | **1 dueno** | `spot_duenos` tiene 4 filas (2 `foto` + 2 `general`), **4 `activo = true`, 1 solo `usuario_id`**: **de 1 solo dueno** puede comprar una portada hoy |
| `destacar_evento` | - | **0** | - | No hay tabla de eventos |

**Consecuencia:** "comprable" y "util para ti" **no son lo mismo**. 3 de 4 sumideros son comprables por codigo, pero **el pool que ofrecen es de 1, 11 y 2**, y el tercero **de un solo dueno**. Es **deuda de datos, no de backend**: poblarlas es trabajo de ingestion.

### 9.5 Seguridad: RLS DESACTIVADO

Medido en `pg_class.relrowsecurity` sobre las **35 tablas de juego** consultadas: **todas `false`**. Y `SELECT count(*) FROM pg_policies WHERE schemaname='public'` = **0 politicas** en todo el esquema.

Tablas de juego verificadas con RLS apagado: `xp_ledger`, `xp_historial`, `sink_acciones`, `sink_slots`, `gamificacion_config`, `spot_dividendos`, `spot_presencia`, `spot_duenos`, `parche_upgrades`, `gobernanza_propuestas`, `gobernanza_votos`, `pandillas`, `pandillas_miembros`, `pandilla_retos`, `moneda_ledger`, `mercado_config`, `mercado_ofertas`, `mercado_ventas`, `moneda_mercado`, `cartas_catalogo`, `cartas_gates`, `cartas_intercambios`, `cartas_ofertas`, `cartas_ventas`, `usuarios_cartas`, `usuarios_cromos`, `chat_salas`, `chat_mensajes`, `consumibles`, `billeteras`, `regalias`, `ranking_zonas`, `casa_roles`, `casas_cofre`, `casa_misiones`.

**Consecuencia normativa:** **todo el aislamiento depende del codigo de aplicacion.** `usuario_id = $1` en la misma sentencia es **la unica frontera** en toda lectura por usuario, no una segunda capa. No habra ninguna segunda capa que detecte un `WHERE` olvidado. Por eso `slot_refs` es **fail-closed** por diseno: si falla o da 401, los botones comprables se deshabilitan y **3 clics = 0 peticiones**.

---

## 10. Deuda abierta con decision pendiente

**Estado (2026-10-05; metodo: lectura de `TASKS.md:4546-4558`, seccion "Deuda abierta de la tanda de sumideros (9, con medicion) - TSK-192"):** **9 deudas abiertas. Se registran, NO se deciden ni se arreglan.** La mayoria son **decisiones de producto**, no codigo: cerrarlas sin que producto decida seria inventar alcance.

1. **`slot_max` es cuota de POR VIDA y `baja` NO la devuelve.** El guard es `p.k_actual < p.slot_max` y `k_actual` es el historico. Comprar y cancelar **quema cuota**: XP gastado, `xp_devuelto: 0` explicito, y la portada queda **cerrada de por vida**. **Decision de producto: historico o activos. NO lo decide la implementacion.** [@producto / `@architect`]

2. **`ref_id` es nullable** en `sink_slots` (`046`, `ref_id text`) y los `NULL` **no colisionan**, luego el indice parcial no los cubre. **Hoy es inocuo** porque el `ref_id` se valida antes del `INSERT`. Se documenta **por si el contrato del sumidero cambia** y empieza a admitirse "enganche sin recurso". [@backend-dev]

3. **El faltante del diezmo solo llega al log.** `aplicarTitheParche` es **BEST-EFFORT TOTAL** y **no tiene canal a la UI** (no recibe `res`). Hace falta **otro sumidero** para reportar el rechazo. **Decision de producto**: hoy el log es el unico canal observable y es aceptable. [@backend-dev]

4. **`'oficial'` inalcanzable en la escala de fama.** `pandillas_miembros` = **0 filas**; el `CHECK` **ya admite `'oficial'`**, luego el esquema no bloquea nada; `rol_factor` **no existe** (solo un comentario). **Decision de producto y NO un escritor que falta**: el 0.6 es correcto, pero un `'oficial'` **no pertenece al dominio de la fama de pandillas**. Si se quiere, es un **concepto nuevo**. [@architect / `@architect-review`]

5. **`portada_destino` con 1 solo usuario.** `spot_duenos` = **4 filas**, las 4 `activo = true`, **1 `usuario_id` distinto**, 2 destinos. **Deuda de DATOS**, no de codigo: poblarla es trabajo de ingestion. [@data-migration]

6. **El pool del picker es de 1.** `usuario_fotos` = **1 fila en todo el universo**; `spot_duenos general` = **2 filas / 1 dueno**. El picker es correcto y **ofrece poco**: el fallo de UX, si lo hay, es de datos. [@data-migration]

7. **`spot_duenos`: cache y bajo demanda en paralelo.** ADR-065 dice "bajo demanda" y la tabla es cache; el codigo corre **las dos vias** (resuelve bajo demanda y ademas escribe la cache). Degradacion independiente y declarada. **Riesgo de coherencia de cache, NO colision de entidades.** [vigilar]

8. **`'texto'` en el `CHECK` sin respaldo del ADR-065.** `chk_spot_duenos_tipo` acepta **6** valores (`{general,foto,video,audio,escrito,texto}`), el ADR-065 solo respalda **4 + `general`**, y `'texto'` tiene **0 filas**. **No es bug** y **no se restringe el `CHECK`**: seria una migracion para tapar un valor sin uso. [@architect]

9. **`destacar_evento` sin destino de datos.** La entidad evento **no existe en el esquema**. Ya declarado en **ADR-088 B11**; se reitera aqui para que la lista de 9 este completa. [@architect]

**El argumento de cada una vive una vez**, en `DECISIONS.md` (**ADR-088 C7** y **ADR-087 A2**). Este documento las lista; no las razona.

---

## Anexo: cifras que este documento **NO** afirma

Registro de lo que se desmintio al medir, para que nadie las reintroduzca (ADR-006). Cada una fue comprobada contra el esquema real:

| Cita falsa | Realidad medida |
|---|---|
| `usuarios` tiene `xp_aportada` y `fama_bonus` | **No existen.** No aparecen en `information_schema.columns` |
| `sink_actions` | Se llama **`sink_acciones`** |
| La columna es `base_xp` | Es **`costo_base_xp`** `numeric(12,2)` |
| `sink_acciones` tiene `soporte`, `alpha`, `gamma`, `ref_contrato` | **No tiene ninguna de las 4.** `alpha`/`gamma` son constantes de codigo; el contrato esta en `SINK_REF_ORIGEN`; `soporte` se computa de si `tabla` es `null` |
| `parche_upgrades.tithe_pct` | No esta ahi: esta en **`pandillas`**, `numeric(5,2)` |
| `parche_upgrades` tiene columna `t` | **No existe** |
| `chat_sala` esta inerte | La tabla es **`chat_salas`** (plural) y tiene **4 filas**; `chat_mensajes` tiene **9** |
| Existe una tabla `facciones` | **No existe.** El `CHECK` de `usuarios.faccion` acepta 4 valores |
| `xp_historial` es el mapa de XP | Es **`xp_ledger.accion`**, con 13 valores. `xp_historial` esta muerta |
| `xp_ledger` tiene indice unico de idempotencia | **No tiene ninguno** unico salvo el `pkey` |
| `spot_dividendo` (singular) | Es **`spot_dividendos`** |
| "ADR-3582" documenta `spot_duenos` | **No existe ningun ADR-3582**: hay **87 ADRs**, el ultimo es **ADR-088**. "3582" era un numero de linea dentro de un ADR anterior |
| La tabla de spot la creo la `046` | La creo la **`040`**. La `046` tiene **0 menciones** de `spot` |
| `sink_slots.ref_id` es `uuid` | Es **`text`**, y nullable |
| El "11 contra 14" de los clamps era conflicto | Eran **11 sentencias** en **14 lineas**: el guard se repite en el CTE de comprobacion y en el de debito |
| `ranking_score_gamma` tiene techo 1.0 | **No existe tal techo**, ni en codigo ni en dato. Solo el **texto** de la `descripcion` |
| `ranking_saldo_tope` limita las compras | **Ninguna rama de compra lo consulta.** Es un tope del termino de saldo del score |
| Existe una tabla `mercado` | **No existe.** Son **`mercado_config`** (3 filas), `mercado_ofertas` (0), `mercado_ventas` (0), `moneda_mercado` (0) |
| `sink_slots` tiene filas | **0 filas** |
| La cabecera de la `048` dice "SIN APLICAR" | El ledger dice **`resultado = 'aplicada'`**. El ledger manda |