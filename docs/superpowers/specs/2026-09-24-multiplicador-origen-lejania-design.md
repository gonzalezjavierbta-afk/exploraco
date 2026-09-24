# Multiplicador de Origen por lejania (Local / Nomada / Extranjero) -- Revision 2

- **Fecha:** 2026-09-24 (Revision 2, tras la revision de arquitectura)
- **ADR:** ADR-058 (`exploraco desarrollo/DECISIONS.md`); ultimo ADR del repo verificado = ADR-057 -> el siguiente libre es **058**.
- **Estado:** Diseno de Fase 1 (SOLO documentacion). **Revision 1 RECHAZADA** por la revision de arquitectura (bloqueantes B-1..B-4 + mayores M-1..M-7). Esta Revision 2 aplica todas las resoluciones del orquestador. Implementacion PENDIENTE.
- **Presupuesto endpoints:** 8/8 intacto (ADR-001/ADR-010). Cero endpoints nuevos; todo entra por las ramas `?tipo=` ya existentes de `api/interacciones.js`.
- **ASCII-safe (ADR-002):** este documento usa solo ASCII (0 bytes > 127, 0 backticks).
- **Migracion:** `db/migrations/038_origen_lejania.sql` (la 037 es la ultima ocupada). El seed de referencia geo **YA EXISTE** versionado en `db/seeds/` (B-3); falta el loader `scripts/seed_geo.js`.
- **Regla de No-Duplicidad:** UNA sola funcion canonica de normalizacion geo (`normGeo`) y UNA sola resolucion de origen server-side. Se elimina el `BONO_ORIGEN = 1.2` plano del Arbol (ADR-028).

> Fuente de verdad: el archivo real del repositorio (ADR-006). Verificado el 2026-09-24
> con `api/interacciones.js` v28, `api/usuarios.js` v21,
> `db/migrations/033_expand_niveles_40.sql`, `db/migrations/031_gamificacion_v6_nivel_scaling.sql`,
> `db/seeds/README_GEO.md` + los 7 archivos de `db/seeds/`, y el directorio `scripts/`.

---

## 0. Registro de revisiones

### Revision 2 (2026-09-24) - resoluciones de la revision de arquitectura

| ID | Resolucion aplicada |
|---|---|
| B-1 | `normGeo(s)` = NFD + strip diacriticos + lowercase + `[^a-z0-9 ]`->espacio + colapsar + trim, como UNICA funcion canonica para geo (seed, `ciudad_base`->`geo_ciudades`, texto `ciudad` sin coords->`geo_ciudades`). `sqlNormCiudad` queda SOLO como legado del Arbol de destinos. Smoke de match con fixture de ~20 ciudades + alias. |
| B-2 | `geo_ciudades`/`geo_paises` con EXACTAMENTE las columnas del seed real (se eliminan `poblacion`/`prioridad`; se agregan `cod_mpio` PK, `cod_dpto`, `tipo`, `departamento_normalizado`, `es_capital`, `activo`, `creado_en`). Desempate `ORDER BY es_capital DESC, cod_mpio ASC`. |
| B-3 | Seed versionado `db/seeds/geo_ciudades_seed.json` + `geo_paises_seed.json` (+ raw) y loader `scripts/seed_geo.js` idempotente con `--dry` (no `.sql`). |
| B-4 | El factor de origen SOLO aplica a acciones con PUNTO geografico resoluble; sin punto -> NEUTRO 1.00. Extranjero exige ademas `origen_declarado_en` >= 7 dias. Verificacion por IP/geo del dispositivo DESCARTADA (no prueba nacionalidad); se documenta como riesgo residual con monitoreo en admin. |
| M-1 | Enmienda explicita a ADR-053: `mult_stack` deja de ser "todo el stack excepto M_nivel"; el producto crudo pasa a ser `m_nivel * mult_stack * mult_origen`. Se reescribe la promesa "ledger reconstruible": con el esquema real solo vale `xp_final = ROUND(xp_base*mult_final,2)+bonos_planos`. |
| M-2 | Tier y coords PER-ROW del Arbol: fila con lat/lng -> haversine directo; fila solo con texto `ciudad` -> lookup `geo_ciudades` via `normGeo`; fila sin punto resoluble -> factor NEUTRO 1.00. Ramas afectadas listadas. |
| M-3 | El smoke de paridad JS/SQL cubre la integracion per-row (local, nacional con/sin coords, extranjero) comparando D_R JS vs SQL, no solo la curva. |
| M-4 | Documentado el nerf del Arbol: usuarios sin `ciudad_base`/punto que hoy reciben x1.2 en el Arbol pasan a 1.00. |
| M-5 | UNIQUE/PK `cod_mpio` para idempotencia (cubierto en B-2). |
| M-6 | Conteos reales corregidos: **24** usos de `calcularXpAcreditado`, **37** de `registrarXpLedger`, **12** de `sqlBonoFila` + **3** usos JS. |
| M-7 | La clasificacion es POR CALL-SITE ("pasa punto o no"), no por tipo de accion. `compartir` con `destino_id` recibe factor; sin punto -> 1.00. |
| 40 niveles | Corregidas TODAS las referencias a 20 niveles: el motor real usa **40 niveles** (migracion 033); `M_nivel` se mantiene en 1.0..3.0. |
| Q4 | Exenciones ampliadas: `dm_enviar`, `comprar_consumible`, `reclamar_regalias`, misiones, logros, referidos y `admin_xp` -> factor 1.00. |

---

## 1. Motivacion y objetivo

El motor de XP v6/v7 (ADR-053, 40 niveles por la migracion 033) premia el
progreso (M_nivel 1.0..3.0, Clase, Casa) y el stack temporal (amuleto, lider de
ciudad), pero **castiga implicitamente al viajero lejano**: los usuarios de
ciudades con poca oferta de destinos generan menos XP porque tienen menos lugares
donde interactuar. El unico gesto hacia el origen hoy es un bono **plano x1.2**
aplicado a los puntos derivados del Arbol de Clases (ADR-027/ADR-028, WP-5
TSK-103), que:

1. NO toca la cadena principal de XP (solo el Arbol).
2. Es binario (local o no) y no distingue "viajero nacional de otra ciudad" de
   "viajero extranjero".
3. No reconoce la lejania real: alguien a 40 km y alguien a 3.000 km cobran lo mismo.

**Objetivo:** introducir un **factor multiplicador de origen** que premie la
lejania real de quien interactua con un destino colombiano, en toda accion que
otorgue XP **y referencie un punto geografico resoluble**, con tres categorias y
una curva suave:

- **Local** x1.00 (sin premio).
- **Nomada** x1.00 .. x1.20 (tope a ~1000 km).
- **Extranjero** x1.20 .. x1.40 (tope a ~3000 km).

Y **unificar** el origen: una sola fuente de verdad; el `BONO_ORIGEN` plano del
Arbol se elimina y pasa a usar el MISMO factor escalonado, evaluado **por fila**.

Fuera de objetivo: tocar `destinos.tags` o el motor `CATEGORY_TAG_FIELDS`/
`CATEGORY_TAG_LISTS` (BLUEPRINT seccion 6), el modelo de Casas/Clases/Facciones,
o los caps vigentes.

---

## 2. Evidencia verificada (archivo:linea, ADR-006)

### 2.1 Cadena congelada de XP (baseline real)

| Elemento | Evidencia real | Nota |
|---|---|---|
| `haversineMetros(lat1,lng1,lat2,lng2)` | `api/interacciones.js:279-287` | helper existente; reutilizable |
| `red2` / `numXp` | `:321-322` | helpers unicos de redondeo (ADR-035) |
| `BONUS_CLASE` / `XP_NIVEL_CLASE` | `:329-330` | catalogo de clase |
| `XP_BASES` (catalogo de acciones) | `:338-365` | base de cada accion |
| `REGALIA_PCT = 0.20` | `:371` | regalias pasivas (migracion 037) |
| `obtenerMultiplicadorNivel` | `:384-391` | `M_nivel` sobre **40 niveles** (`(N-1)/39*2`, rango 1.0..3.0) |
| `leerConfigGamificacion(sql)` | `:408-430` | 1 SELECT a `gamificacion_config` + fallback |
| `calcularXpFinal(xp_base,nivel_clase,clase_id,casa_tag,ctx)` | `:450-491` | **UNICO calculo** (cadena congelada) |
| `calcularXpAcreditado(sql,...)` | `:496-503` | **UNICO punto async** |
| `armarXpDetalle(base,res,...)` | `:509-528` | shape del toast/`xp_detalle` |
| `registrarXpLedger(sql,datos)` | `:536-569` | ledger best-effort + `nivel_max` monotono |
| `sqlNormCiudad` | `:1453-1456` | **legado** (TRANSLATE); solo Arbol de destinos |
| `sqlOrigenLocal` / `sqlOrigenNacional` / `sqlOrigenLocalPropio` | `:1458-1476` | origen derivado por fila (ADR-028) |
| `BONO_ORIGEN = 1.2` + `sqlBonoFila` | `:1480-1484` | **a ELIMINAR** por esta entrega |
| `calcularDerivadosArbol` / `derivadosArbolConOrigen` | `:1490-1724` | Arbol: usos reales de `sqlBonoFila` |

### 2.2 Puntos de acreditacion (conteos reales corregidos, M-6)

- **`calcularXpAcreditado`: 24 usos** en `api/interacciones.js`.
- **`registrarXpLedger`: 37 usos** en `api/interacciones.js`.
- **`sqlBonoFila`: 12 usos SQL + 3 usos JS** (total 15 invocaciones; 1 es la
  definicion). `BONO_ORIGEN` aparece 5 veces (1 definicion + 4 usos).
- El Arbol usa `sqlBonoFila` en `:1528`, `:1534`, `:1553`, `:1556`, `:1571`,
  `:1581`, `:1611`, `:1614`, `:1618`, `:1635`, `:1637`, `:1640` (12 SQL) y
  `BONO_ORIGEN` directo en `:1600-1601`, `:1719` (3 JS).

### 2.3 Datos de origen y geografia (ESTADO REAL)

- `usuarios.pais_base` ISO-2 (mayusculas, validado) y `usuarios.ciudad_base`
  (texto libre 1..80): `api/usuarios.js:1168-1190`.
- `usuarios.email_verificado boolean` **existe** (`:391`, `:536`, `:878`, `:943`, `:1051`).
- `usuarios.creado_en timestamptz` **existe** (`:567`, `:1434`).
- `destinos` tiene `lat`, `lng`, `ciudad`, `region`, `zona`
  (`api/interacciones.js:3123-3128`, `:4377`); `zona` via migracion 028.
- **NO existen** `geo_ciudades`, `geo_paises`, `xp_ledger.mult_origen`,
  `xp_ledger.origen_tier`, `usuarios.origen_declarado_en` (0 resultados en `db/migrations`).
- **El seed de referencia geo YA EXISTE versionado** en `db/seeds/` (B-3):
  `geo_ciudades_seed.json` (1.122 filas), `geo_paises_seed.json` (245),
  `geo_ciudades_raw.csv`, `geo_paises_raw.csv`, `geo_paises_raw.json`,
  `geo_ciudades_dane_divipola_2025.xlsx` y `README_GEO.md` (trazabilidad, fuentes
  DANE DIVIPOLA + komsitr/country-centroid; licencias y verificaciones de 2026-09-24).
- **NO existe** `scripts/seed_geo.js` (el cargador del seed geo); los demas
  `scripts/seed-*.js` siguen el patron `DATABASE_URL=... node scripts/seed-X.js [--dry]`.

---

## 3. Decisiones CERRADAS por el operador (no se reabren)

1. Valores ancla: **Local x1.00, Nomada x1.20, Extranjero x1.40**.
2. El factor aplica a toda accion que otorgue XP **y referencie un punto
   geografico resoluble** (B-4/M-7); sin punto -> NEUTRO 1.00.
3. **Unificar:** eliminar el `BONO_ORIGEN = 1.2` plano del Arbol y reemplazarlo
   por el mismo factor escalonado (una sola fuente de verdad del origen). El local
   deja de cobrar 1.2 y pasa a 1.00.
4. Lejania: **distancia real en km** (no categorica), con `geo_ciudades` y `geo_paises`.
5. **Anti-gaming:** paquete combinado (seccion 7).
6. **Elegibilidad:** solo cuentas con `ciudad_base` + `pais_base` declarados. Sin
   datos -> 1.00 (sin premio ni castigo).
7. **Local x1.00** sin premio.
8. **Extranjero** exige `email_verificado` + `pais_base != 'CO'` + cuenta >= 7 dias
   + `origen_declarado_en` >= 7 dias (B-4). Nomada exige 7 dias de cuenta.
9. **Regalias pasivas** (`REGALIA_PCT = 0.20`) NO reciben factor de origen (no son
   accion del usuario).
10. Umbrales de curva: Nomada tope x1.20 a **~1000 km**; Extranjero tope x1.40 a
    **~3000 km**.

---

## 4. Modelo matematico (formula exacta aprobada)

### 4.1 Ubicacion en la cadena (hermano de `stack_temp`)

    m_nivel           = M_nivel(nivel_usuario)                        # 1.0 .. 3.0
    mult_clase        = 1 + nivel_clase * BONUS_CLASE[clase_id]       # 1.0 .. 2.0
    factor_casa       = 1.30 rezagada | 1.00 equilibrada | 0.85 dominante

    mult_progresion   = m_nivel * mult_clase * factor_casa
    mult_progresion_c = min(mult_progresion, cap_progresion)          # 5.0

    stack_temp        = (amuleto ? 2.0 : 1.0) * (lider_ciudad ? 1.1 : 1.0)
    mult_origen       = (punto resoluble) ? curva(tier, dist_km) : 1.00   # 1.00 .. 1.40

    mult_global       = mult_progresion_c * mult_origen * stack_temp
    mult_global_c     = min(mult_global, cap_global)                  # 10.0

    xp_final          = red2(xp_base * mult_global_c)
    xp_acreditable    = red2(xp_final + bonos_planos)                 # bonos planos POST-cap

**Por que AQUI y no dentro de `mult_progresion`:** si el factor entrara en
`mult_progresion`, el cap 5.0 lo absorbe en cuanto `m_nivel * mult_clase *
factor_casa` se acerca a 5.0 (niveles medios/altos) y el premio desaparece
justo para los usuarios que mas lo merecen. Como hermano de `stack_temp` se aplica
DESPUES del cap de progresion y solo lo acota `cap_global` (10.0), el techo duro
global ya vigente.

**Enmienda explicita a ADR-053 (M-1):**
- `mult_stack` **deja de ser** "el producto de TODO el stack EXCEPTO M_nivel"
  (semantica de la Enmienda 1 de ADR-053). Su formula no cambia
  (`mult_clase * factor_casa * stack_temp`) pero su definicion pasa a ser
  "el producto de todo el stack EXCEPTO `M_nivel` y el factor de origen".
- El producto CRUDO deja de ser `m_nivel * mult_stack` y pasa a ser
  **`m_nivel * mult_stack * mult_origen`**.
- **Reescritura de la promesa "ledger reconstruible"** (m-1): con el esquema real
  de la tabla 031 (que NO guarda `mult_clase`, `factor_casa`,
  `mult_progresion_c` ni `stack_temp`), la UNICA igualdad verificable es
  `xp_final = ROUND(xp_base * mult_final, 2) + bonos_planos` (para acciones sin
  cap en XP). NO se puede descomponer el crudo en sus factores desde el ledger;
  `mult_final` = `mult_global_c` y `mult_stack`/`mult_origen`/`mult_nivel` son
  datos de reporte parciales. Se documenta como deuda (m-1).

### 4.2 Curva (una sola funcion canonica en JS)

    mult_origen(tier, dist_km, cfg):
      D = max(0, dist_km)
      if tier == 'local':      return cfg.factor_origen_local                              # 1.00 fijo
      if tier == 'nomada':     return cfg.factor_origen_local
                                 + (cfg.factor_origen_nomada_max - cfg.factor_origen_local)
                                 * min(D / cfg.origen_km_nomada, 1)                      # 1.00 .. 1.20
      if tier == 'extranjero': return cfg.factor_origen_nomada_max
                                 + (cfg.factor_origen_extranjero_max - cfg.factor_origen_nomada_max)
                                 * min(D / cfg.origen_km_extranjero, 1)                  # 1.20 .. 1.40
      return 1.00   # tier null / sin punto: neutro

La curva es **continua**: `nomada(km_nomada) = factor_origen_nomada_max =
extranjero(0)`. Usa solo claves de config (nunca literales).

**Tabla de la curva (defaults):**

| tier | 0 km | 250 km | 500 km | 1000 km | 1500 km | 3000 km | 9999 km |
|---|---|---|---|---|---|---|---|
| Local | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Nomada | 1.00 | 1.05 | 1.10 | **1.20** | 1.20 | 1.20 | 1.20 |
| Extranjero | 1.20 | 1.20 | 1.20 | 1.20 | 1.30 | **1.40** | 1.40 |
| Sin punto | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

Distancia = `haversineMetros(coords_origen, coords_punto) / 1000`, usando el
`haversineMetros` existente.

### 4.3 Determinacion del tier (SOLO con punto resoluble, B-4)

    tier(punto):
      if punto no resoluble:                                     return null   # 1.00
      if !pais_base declarado:                                   return null   # 1.00
      if pais_base != 'CO':
         if email_verificado AND dias_cuenta >= 7
            AND dias_desde_origen_declarado >= 7:                return 'extranjero'
         return null                                                            # 1.00
      # residencia colombiana
      if !ciudad_base declarado OR coords_origen no resueltas:   return null   # 1.00
      if dias_cuenta < 7:                                        return null   # 1.00
      if normGeo(punto.ciudad) == normGeo(ciudad_base):          return 'local'
      if !punto.ciudad AND D <= cfg.origen_km_local:             return 'local'
      return 'nomada'

- `normGeo` (B-1) es la UNICA funcion canonica de normalizacion geo:
  NFD + strip diacriticos + lowercase + `[^a-z0-9 ]`->espacio + colapsar espacios
  + trim. El seed ya trae `nombre_normalizado`/`departamento_normalizado` con esa
  misma normalizacion.
- Un extranjero NO elegible (sin email verificado, cuenta < 7 dias u
  `origen_declarado_en` < 7 dias) -> tier `null` -> 1.00 (no se "cuela" por la
  curva Nomada).
- Sin `origen_declarado_en` (NULL) -> NO es elegible a Extranjero (B-4).

### 4.4 Punto geografico de la accion (`ctx.punto`)

El factor se decide **POR CALL-SITE** (M-7): cada call-site indica si aporta punto
o no. No hay clasificacion por "tipo de accion" (ej. `compartir` con `destino_id`
recibe factor; `compartir` sin punto -> 1.00). Precedencia de resolucion:

1. `ctx.punto = {lat, lng, ciudad?}` ya conocido por el caller.
2. `ctx.destino_id` presente: el motor resuelve `destinos.lat/lng/ciudad`.
3. `ctx.ciudad_punto` (texto, accion anclada a ciudad sin destino): resolver via
   `geo_ciudades` con `normGeo` (B-1).
4. Sin punto: **NEUTRO 1.00** (B-4). Elimina el farming por declarar pais.

Una fila `destinos.lat/lng` NULL con `ciudad` presente cae al paso 3 (lookup
`geo_ciudades` por texto normalizado).

---

## 5. Categorias de origen (definicion cerrada)

| Categoria | Definicion | Factor | Requisitos |
|---|---|---|---|
| **Local** | Residente colombiano cuya `ciudad_base` normalizada coincide con la ciudad del punto (o `D <= origen_km_local` si el punto no trae ciudad) | **1.00** fijo | `pais_base='CO'` + `ciudad_base` + coords resueltas + 7 dias |
| **Nomada** | Residente colombiano de OTRA ciudad/departamento; el premio crece con la lejania real | 1.00 .. **1.20** | idem Local + ciudad distinta |
| **Extranjero** | `pais_base != 'CO'` con email verificado y declaracion estable | **1.20 .. 1.40** | + `email_verificado` + 7 dias de cuenta + `origen_declarado_en` >= 7 dias |
| **Sin datos / no elegible / sin punto** | Falta `ciudad_base`/`pais_base`, no hay match geo, extranjero no elegible, cuenta < 7 dias o accion SIN punto geografico | **1.00** | - |

---

## 6. Modelo de datos (migracion 038)

Migracion `db/migrations/038_origen_lejania.sql`. **Aditiva, idempotente (ADR-008),
ASCII-safe (ADR-002).** Patron de la 031 (guards `information_schema`/
`pg_constraint`, `ON CONFLICT DO NOTHING`; sin DROP/DELETE de datos de usuario).

### 6.1 `geo_ciudades` (B-2: columnas EXACTAS del seed real)

| columna | tipo | nota |
|---|---|---|
| `cod_mpio` | `char(5) PRIMARY KEY` | codigo DIVIPOLA municipal (PK natural; idempotencia del seed) |
| `nombre` | `text NOT NULL` | nombre oficial legible (ej. `BOGOTA, D.C.`) |
| `nombre_normalizado` | `text NOT NULL` | `normGeo(nombre)` (viene del seed) |
| `departamento` | `text` | nombre oficial del departamento |
| `departamento_normalizado` | `text` | `normGeo(departamento)` |
| `cod_dpto` | `char(2)` | codigo DIVIPOLA departamental |
| `tipo` | `text` | `Municipio` / `Isla` / `Area no municipalizada` |
| `lat` | `double precision NOT NULL` | latitud |
| `lng` | `double precision NOT NULL` | longitud |
| `pais_iso2` | `char(2) NOT NULL DEFAULT 'CO'` | constante `CO` |
| `es_capital` | `boolean NOT NULL DEFAULT false` | derivado: `cod_mpio` termina en `001` |
| `activo` | `boolean NOT NULL DEFAULT true` | - |
| `creado_en` | `timestamptz NOT NULL DEFAULT NOW()` | - |

- Indice: `idx_geo_ciudades_norm (nombre_normalizado)`.
- Desempate de homonimos (66 nombres duplicados, README_GEO seccion 4):
  `ORDER BY es_capital DESC, cod_mpio ASC LIMIT 1`.
- El seed trae 1.122 filas (1.103 Municipio + 18 Area no municipalizada + 1 Isla).

### 6.2 `geo_paises` (B-2)

| columna | tipo | nota |
|---|---|---|
| `iso2` | `char(2) PRIMARY KEY` | ISO-3166-1 alfa-2 (mayusculas, como `pais_base`) |
| `nombre` | `text NOT NULL` | nombre del pais |
| `nombre_normalizado` | `text NOT NULL` | `normGeo(nombre)` |
| `lat` | `double precision NOT NULL` | centroide |
| `lng` | `double precision NOT NULL` | centroide |
| `activo` | `boolean NOT NULL DEFAULT true` | - |
| `creado_en` | `timestamptz NOT NULL DEFAULT NOW()` | - |

Nota: el seed trae ademas `iso3`; la resolucion B-2 NO lo lista, por lo que NO se
persiste (puede agregarse despues sin romper). El seed trae 245 paises/territorios.

### 6.3 `usuarios.origen_declarado_en` (anti-teleport; B-4)

| columna | tipo | nota |
|---|---|---|
| `origen_declarado_en` | `timestamptz` | se fija cuando `ciudad_base`/`pais_base` cambian (via `api/usuarios.js` perfil). NULL = sin declaracion (NO elegible a Extranjero) |

Idempotencia: `ADD COLUMN IF NOT EXISTS` + siembra unica
`UPDATE usuarios SET origen_declarado_en = creado_en WHERE origen_declarado_en IS NULL`.

### 6.4 `gamificacion_config` (nuevas claves)

Reusa la tabla de la 031. Seed idempotente `ON CONFLICT (clave) DO NOTHING`:

| clave | valor default | descripcion |
|---|---|---|
| `factor_origen_local` | `1.0000` | factor base (Local, sin premio) |
| `factor_origen_nomada_max` | `1.2000` | tope Nomada (a `origen_km_nomada`) |
| `factor_origen_extranjero_max` | `1.4000` | tope Extranjero (a `origen_km_extranjero`) |
| `origen_km_nomada` | `1000.0000` | km de saturacion Nomada |
| `origen_km_extranjero` | `3000.0000` | km de saturacion Extranjero |
| `origen_km_local` | `25.0000` | radio de "misma ciudad" cuando el punto no trae etiqueta de ciudad |
| `origen_min_dias_cuenta` | `7.0000` | antiguedad minima de cuenta y de declaracion (Nomada/Extranjero) |

Fallback en codigo (constantes junto al motor): a `leerConfigGamificacion` se le
agregan `factorOrigenLocal`, `factorOrigenNomadaMax`, `factorOrigenExtranjeroMax`,
`origenKmNomada`, `origenKmExtranjero`, `origenKmLocal`, `origenMinDiasCuenta`.

### 6.5 `xp_ledger` (columnas nuevas)

| columna | tipo | nota |
|---|---|---|
| `mult_origen` | `numeric(10,6) NOT NULL DEFAULT 1` | factor de origen efectivo (1.00 .. 1.40; 1.00 sin punto) |
| `origen_tier` | `text NULL` | `CHECK (origen_tier IS NULL OR origen_tier IN ('local','nomada','extranjero'))` |

Detalle en `contexto` JSONB (sin columnas extra):
`contexto.origen = { tier, dist_km, fuente, punto }`, donde `fuente` es
`'destino' | 'ciudad' | 'geo_ciudades' | 'geo_paises' | 'sin_punto'`.

CHECK nuevo con el patron `DO $$ ... pg_constraint ...` de la 031 (idempotente).

### 6.6 Seed y loader (B-3)

- **Ya versionados** en `db/seeds/`: `geo_ciudades_seed.json`,
  `geo_paises_seed.json`, `geo_ciudades_raw.csv`, `geo_paises_raw.csv`,
  `geo_paises_raw.json`, `geo_ciudades_dane_divipola_2025.xlsx`, `README_GEO.md`.
- **Falta** `scripts/seed_geo.js`: loader idempotente con `--dry`, patron de
  `scripts/seed-*.js` (`DATABASE_URL=... node scripts/seed_geo.js [--dry]`),
  `INSERT ... ON CONFLICT (cod_mpio)` para ciudades y `ON CONFLICT (iso2)` para
  paises. Deriva `es_capital` (`cod_mpio` termina en `001`) si el seed no la trae.
- Esquema de la 038 = columnas del seed real; la 038 crea tablas + config, el
  loader puebla los datos. Mientras el loader no corra, el motor degrada a 1.00.

---

## 7. Elegibilidad y anti-gaming (paquete combinado)

1. **Factor SOLO con punto geografico resoluble (B-4):** acciones sin punto ->
   NEUTRO 1.00. Elimina el farming del "piso" por declarar pais.
2. **Resolucion server-side (nunca input del cliente):** las coords de origen
   salen SIEMPRE de `geo_ciudades`/`geo_paises` por match `normGeo`. El cliente no
   puede enviar lat/lng ni tier.
3. **Extranjero** exige `email_verificado = true` + `pais_base != 'CO'` + cuenta
   >= 7 dias + `origen_declarado_en` >= 7 dias.
4. **Nomada** exige cuenta >= 7 dias.
5. **Local sin premio:** x1.00 elimina el incentivo de falsificar "misma ciudad".
6. **Cota dura:** factor en `[1.00, 1.40]`; solo multiplica XP positivo; participa
   del `cap_global`.
7. **Auditoria:** cada acreditacion persiste `mult_origen` + `origen_tier` +
   `dist_km` en el ledger.
8. **Regalias exentas** (decision 9).
9. **No-duplicidad:** una sola `normGeo`, una sola resolucion de origen, una sola curva.
10. **IP/geo del dispositivo DESCARTADA (B-4):** no prueba nacionalidad (un turista
    extranjero en Colombia tiene IP/geo de Colombia). Se documenta como riesgo
    residual y se mitiga con **MONITOREO en admin** (distribucion de XP por origen
    + alerta de outliers). Deuda: verificacion documental opcional a futuro.

---

## 8. Alcance: acciones con factor, exenciones y unificacion del Arbol

### 8.1 Clasificacion POR CALL-SITE (M-7)

El factor se decide por call-site segun "pasa punto o no". Regla: si el call-site
aporta `ctx.punto`/`ctx.destino_id`/`ctx.ciudad_punto` resoluble -> curva; si no ->
1.00. Ejemplo explicito: `compartir` con `destino_id` -> factor; `compartir` sin
punto -> 1.00. Los 24 call-sites de `calcularXpAcreditado` se revisan uno por uno
en la fase de backend.

### 8.2 Exenciones (Q4 ampliado)

Factor 1.00 (exentas):
- **Regalias pasivas** (`REGALIA_PCT`; no son accion del usuario).
- **`dm_enviar`** (mensajes directos).
- **`comprar_consumible`** (salida de XP, no acreditacion).
- **`reclamar_regalias`** (no es accion geografica).
- **Misiones y logros** (ADR-053 los exime de `M_nivel`).
- **Referidos** (`repartirXpReferidos`).
- **`admin_xp`** (Bearer ADMIN_SECRET; entrega exacta del `delta_xp`).

### 8.3 Unificacion del Arbol: elimina `BONO_ORIGEN` (M-2)

Se **elimina** `BONO_ORIGEN = 1.2` y `sqlBonoFila` (`:1480-1484`). Los 12 usos SQL
y los 3 usos JS del Arbol pasan a usar el MISMO factor escalonado, evaluado
**PER-ROW**:

1. Fila con `lat`/`lng` -> haversine directo origen<->punto.
2. Fila solo con texto `ciudad` -> lookup `geo_ciudades` via `normGeo` para obtener
   coords del punto y, si falta, del origen.
3. Fila sin punto resoluble -> factor NEUTRO 1.00.

**Ramas del Arbol afectadas (M-2):**

| Rama (funcion) | Punto de la fila | Resolucion |
|---|---|---|
| `exp_rutas`, `exp_ciudades`, `cur_critico` | `destinos.lat/lng` (o `destinos.ciudad`) | geo directo / lookup |
| `exp_ocultos` (aprobados/pendientes) | `activos_ocultos.ciudad` (texto) | lookup `geo_ciudades` |
| `qDatos` `n_review_voto` | `destinos.ciudad` via `interacciones` | lookup `geo_ciudades` |
| `qDatos` `n_comentarios` | `albumes.ciudad` (texto) | lookup `geo_ciudades` |
| `qDatos` `n_votos_activo` | `activos_ocultos.ciudad` (texto) | lookup `geo_ciudades` |
| `mapas` (`n_mapas_publicos`) | sin punto (uso propio) | NEUTRO 1.00 |
| `planes_miembros` (`n_planes`) | sin punto | NEUTRO 1.00 |
| `cromos` (`cur_colecciones`) | sin punto | NEUTRO 1.00 |
| `art_literatura` | sin punto | NEUTRO 1.00 |

Ademas, las subconsultas con `destinos` (`exp_rutas` nacional, `exp_ciudades`,
`cur_critico`) usan `destinos.lat/lng`/`ciudad` (geo directo o lookup).

Como el Arbol agrega en SQL y el motor de XP vive en JS, el factor se expresa en
dos runtimes. Para respetar la **Regla de No-Duplicidad**:
- **Fuente canonica:** la funcion JS `mult_origen(tier, dist_km, cfg)` (seccion 4.2).
- **Espejo SQL obligatorio:** `sqlFactorOrigen(...)` que replica la curva con la
  MISMA config y un `sqlHaversineKm(...)` espejo de `haversineMetros`.
- **Gate de paridad (M-3):** `scripts/smoke_origen_factor_parity.js` cubre la
  **integracion PER-ROW** (fixtures: local, nacional con coords, nacional solo con
  texto, nacional sin punto, extranjero) comparando el **D_R resultante JS vs SQL**,
  no solo la curva pura. Falla si difieren en > 1e-6.
- **Deuda:** colapsar el Arbol a computo JS (una sola runtime) en una entrega
  posterior (seccion 14).

### 8.4 Nerf documentado del Arbol (M-4)

Hoy, las ramas del Arbol que bonifican por el flag extranjero (`$3::boolean`) o por
`localPropio` benefician a usuarios **sin `ciudad_base` ni punto resoluble**,
otorgandoles x1.2. Con el factor por distancia, esos usuarios pasan a **1.00**
(nerf). Es un cambio de valor esperado y documentado: el origen solo premia cuando
hay un punto geografico real con el que medir distancia.

### 8.5 Impacto en el segundo ledger derivado

`interacciones.xp_ganado` guarda la BASE y alimenta Origen/fama/vocaciones/
`art_literatura` (`:1107`, `:531`). El factor de origen NO cambia `xp_ganado`; si
cambia el D_R del Arbol (por reemplazar el x1.2 plano), lo cual MUEVE el nivel de
nodo del Arbol para algunos usuarios. Efecto esperado y documentado.

---

## 9. Degradacion / fallback

| Escenario | Comportamiento |
|---|---|
| Tablas `geo_*` ausentes (`42P01`/`42703`) | factor = 1.00; `console.warn` (sin catch vacio) |
| `geo_ciudades` sin match de `ciudad_base` | factor = 1.00, tier = null |
| `geo_paises` sin match de `pais_base` | factor = 1.00, tier = null |
| `ciudad_base`/`pais_base` no declarados | factor = 1.00, tier = null |
| Extranjero sin `email_verificado`, cuenta < 7 dias u `origen_declarado_en` < 7 dias | factor = 1.00, tier = null |
| Accion sin punto geografico | factor = 1.00, tier = null, `fuente='sin_punto'` |
| `xp_ledger` sin `mult_origen`/`origen_tier` | XP se acredita igual; fila no registrada (best-effort, `console.warn`) |
| `gamificacion_config` ausente o sin claves nuevas | constantes en codigo |
| `destinos.lat/lng` NULL | lookup `geo_ciudades` por `destinos.ciudad`; si no, NEUTRO 1.00 |

Regla invariante: **el XP SIEMPRE se entrega** (patron BUG-021 / AGENTS.md 2.2);
el factor degrada a 1.00 y nunca lanza.

---

## 10. Contrato de API / UI

### 10.1 `xp_detalle` (aditivo)

Se agregan claves a `armarXpDetalle` (`:509-528`):

    xp_detalle: {
      ... (campos actuales) ...,
      mult_origen: number,          // 1.00 .. 1.40 (1.00 sin punto)
      origen_tier: 'local'|'nomada'|'extranjero'|null,
      origen_dist_km: number|null
    }

Compatibilidad: los campos actuales se conservan; los nuevos son aditivos.

### 10.2 Toast / perfil

El toast de XP puede mostrar el origen (`x1.30 Extranjero - 1.850 km`) bajo el silo
de la pagina (ADR-004). La UI SOLO informa; la verdad la aplica el backend.

### 10.3 Admin (sin endpoint nuevo)

La rama existente `?recurso=salud_red` (ADR-053) agrupa por `origen_tier` y
`mult_origen` desde `xp_ledger`, e incluye la **alertas de outliers** de origen
(B-4): usuarios con `mult_origen` alto junto a patrones anomalos (p. ej. cambio de
`origen_declarado_en` reciente) para revision manual.

---

## 11. Plan de fases y agentes

| Fase | Entregable | Agente | Gate |
|---|---|---|---|
| 0 | Este diseno + ADR-058 | @architect / @architect-review | aprobacion del operador |
| 1 | `038_origen_lejania.sql` (geo_* + config + ledger + `origen_declarado_en`) | @sql-security | idempotencia (2 corridas), ASCII, `information_schema` post |
| 2 | `scripts/seed_geo.js` (loader idempotente `--dry`) + correr el seed | @sql-security + datos | smoke de cobertura (1.122 / 245) |
| 3 | Backend: `normGeo` + `mult_origen` + resolucion de origen/punto + ledger + exenciones | @backend-dev | `node --check`, smokes de formula/curva/match |
| 4 | Unificacion del Arbol (eliminar `BONO_ORIGEN`) + `sqlFactorOrigen`/`sqlHaversineKm` | @backend-dev | `smoke_origen_factor_parity.js` (per-row) |
| 5 | `api/usuarios.js`: fijar `origen_declarado_en` al cambiar ciudad/pais | @backend-dev | smoke de reinicio |
| 6 | UI: `xp_detalle` + monitor admin de outliers | @frontend-tpl + @js-silo-dev | balance de divs + silo CSS |
| 7 | Escudo GOLD + QA end-to-end | @qa-auditor | 5 latidos + smokes |
| 8 | Docs: ADR-058, README de specs, TASKS/NEXT | @docs-keeper | indices sincronizados |

---

## 12. Plan de verificacion (Escudo GOLD + smokes)

1. `node --check` de `api/interacciones.js` y `api/usuarios.js`.
2. ASCII-safety (0 bytes > 127, 0 backticks) en los `api/*.js` tocados y en la 038.
3. Balance de `<div>` y cierre de comentarios en las paginas tocadas.
4. **Curva:** `local=1.00`; `nomada(0)=1.00`, `nomada(500)=1.10`, `nomada(1000)=1.20`,
   `nomada(5000)=1.20`; `extranjero(0)=1.20`, `extranjero(1500)=1.30`,
   `extranjero(3000)=1.40`, `extranjero(9999)=1.40`; monotona y en `[1.00,1.40]`;
   sin punto = 1.00.
5. **Cadena:** el factor es hermano de `stack_temp`; sobrevive al cap de progresion
   (caso `mult_progresion=5.5` -> sigue 5.0) y respeta `cap_global` (techo 10.0).
6. **Fallback/elegibilidad:** sin `ciudad_base`/`pais_base` -> 1.00; sin match geo
   -> 1.00; extranjero sin `email_verificado`, cuenta < 7 dias u
   `origen_declarado_en` < 7 dias -> 1.00; accion sin punto -> 1.00.
7. **Match `normGeo` (B-1):** fixture de ~20 ciudades + alias (`b/quilla`,
   `sta marta`, `cucuta`, `cali`, `cartagena`, `bogota d c`) -> `cod_mpio` esperado.
8. **Anti-gaming:** parametros del cliente (lat/lng/tier) IGNORADOS; origen solo
   desde `geo_*`; IP/geo del dispositivo NO se usa.
9. **Ledger:** `mult_origen`/`origen_tier` persistidos; invariante
   `xp_final = ROUND(xp_base * mult_final, 2) + bonos_planos` (con `mult_final`
   incluyendo `mult_origen`).
10. **No-duplicidad:** `grep BONO_ORIGEN` = 0 en `api/*.js`; el Arbol usa el factor
    escalonado.
11. **Paridad SQL/JS per-row (M-3):** `smoke_origen_factor_parity.js` compara el
    D_R resultante (local, nacional con coords, nacional solo texto, nacional sin
    punto, extranjero), tolerancia 1e-6.
12. **Degradacion:** sin `geo_*` ni columnas nuevas, el XP se entrega igual y el
    ledger no rompe (`console.warn`).
13. **Cobertura geo:** `COUNT(geo_ciudades)=1122`, `COUNT(geo_paises)=245`,
    0 `nombre_normalizado` vacios, 0 coords fuera de rango.

---

## 13. Riesgos

| # | Riesgo | Severidad | Mitigacion |
|---|---|---|---|
| R-1 | `cap_global` (10.0) absorbe el premio en stacks altos | MEDIA | Aceptar (cap es cap); explicar `cap_aplicado` en el toast |
| R-2 | Homonimos en `geo_ciudades` (66 nombres duplicados) | MEDIA | Desempate `es_capital DESC, cod_mpio ASC`; `departamento_normalizado`; fallback 1.00 |
| R-3 | Cobertura/calidad del seed | BAJA | Seed real versionado (DANE DIVIPOLA + centroides) + smoke de cobertura |
| R-4 | Curva duplicada SQL/JS (Arbol) | MEDIA | `sqlFactorOrigen` espejo + smoke de paridad per-row; deuda de colapso |
| R-5 | Latencia: +1..3 SELECT por acreditacion (config ya suma 1) | BAJA | Resolucion en 1 consulta CTE; volumen actual despreciable |
| R-6 | Gaming del origen auto-declarado (residual, B-4) | MEDIA | `origen_declarado_en` >= 7 dias + Local x1.00 + **monitoreo admin de outliers**; IP/geo descartado a proposito |
| R-7 | Orden migracion/deploy (columnas nuevas) | ALTA | Patron BUG-021/BUG-060: migracion completa ANTES del deploy; degradacion escalonada |
| R-8 | `destinos.lat/lng` NULL -> lookup por texto | MEDIA | Fallback `geo_ciudades`; documentar destinos sin coord |
| R-9 | El Arbol cambia de valor (incluye el nerf M-4) | BAJA | Esperado; sin recomputo historico (ADR-003) |
| R-10 | Extranjero declara pais sin viajar realmente | MEDIA | Residual aceptado (B-4); monitoreo de outliers; verificacion documental futura |

---

## 14. Deuda registrada

| Deuda | Evidencia | Impacto |
|---|---|---|
| Curva en JS y SQL (espejo) | seccion 8.3 | riesgo de desfase; mitigado por smoke per-row |
| `ledger reconstruible` es parcial (m-1): la 031 no guarda clase/casa/stack_temp | seccion 4.1 | solo `xp_final = ROUND(xp_base*mult_final,2)+bonos_planos` |
| Seed geo sin automatizacion de actualizacion | seccion 6.6 | municipios nuevos/renombrados requieren re-seed |
| Verificacion documental de nacionalidad ausente | seccion 7.10 | residual; monitoreo + deuda futura |
| M-4 (nerf del Arbol para usuarios sin ciudad_base) | seccion 8.4 | cambio de valor esperado, documentado |

---

## 15. Fuera de alcance

- Tocar `destinos.tags` o el motor `CATEGORY_TAG_FIELDS`/`CATEGORY_TAG_LISTS`
  (BLUEPRINT seccion 6): esta feature no crea categorias ni campos de `tags`.
- Nuevos endpoints (8/8, ADR-001/ADR-010).
- Recomputar XP o reconstruir `xp_ledger` hacia atras (ADR-003).
- Persistir `usuarios.nivel`/`badge_actual`.
- Cambiar los caps vigentes (`cap_progresion`, `cap_global`) o `M_nivel`.
- PostGIS: la distancia usa la haversine existente.
- Verificacion por IP/geo del dispositivo (descartada, B-4).

---

## 16. Preguntas abiertas para el operador

1. **Cooldown de cambio de origen:** ademas de `origen_declarado_en` >= 7 dias, se
   agrega un cooldown (p. ej. 30 dias) al cambio de `ciudad_base`/`pais_base`?
2. **`origen_declarado_en`:** confirmar que se implementa en esta entrega (columna
   + `api/usuarios.js`), dado que B-4 lo exige para Extranjero.
3. **Semilla geo:** confirmar que el seed real versionado (`db/seeds/*_seed.json`)
   es el definitivo y que `scripts/seed_geo.js` es el unico loader.
4. **Redondeo:** `mult_origen` a 6 decimales con redondeo solo del XP final
   (propuesto, coherente con ADR-053) o fijo a 2?
5. **UI:** el tier/distancia se muestra en el toast/perfil, o el factor va oculto
   (solo visible en el panel admin "Salud de la Red")?
6. **Verificacion documental de nacionalidad:** se agenda como ADR futuro o queda
   solo como deuda?

---

hacer las preguntas necesarias para completar la tarea de la mejor forma posible.
