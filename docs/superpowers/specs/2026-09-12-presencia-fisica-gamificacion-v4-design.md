# Especificacion de diseno - Gamificacion v4.0: Presencia Fisica + Presencia Espacial

**Fecha:** 2026-09-12
**Estado:** Aprobado e implementado en working tree (backend + frontend verificados 2026-09-12; `node --check` PASS, ASCII 0 bytes >127, tests de logros 30/30). PENDIENTE aplicar la migracion 014 en Neon + deploy.
**ADR:** ADR-024
**Task:** TSK-099
**Prompt origen:** `prompt cambios.txt` ("Evaluacion y Propuesta de Rediseno de Gamificacion v4.0: Presencia Fisica + Presencia Espacial")
**Migracion:** `db/migrations/014_reset_visitas_presencia_fisica.sql` (NUEVA en working tree; pendiente aplicar en Neon ANTES del deploy)

> Nota ADR-006 (baseline de verdad = archivo real): el backend + frontend estan implementados y
> verificados en el working tree (`api/interacciones.js` v11 con Haversine/geocerca/anti-farming,
> `quitar_visita` soft-delete, logro `logr_pionero`, `dims.geo`; `usuario-session.js` geolocation;
> `api/utilidades.js` con conteo `activo=true`). Lo unico pendiente es aplicar la migracion 014
> en Neon + deploy; el smoke dedicado `smoke_visita_geocerca.js` ya existe y da 15/15 PASS; ver secciones 10 y 12.

---

## Indice

1. Objetivo
2. Contexto (lo que ya existia)
3. Problematica y vectores de abuso
4. Arquitectura de la solucion
5. Contrato del endpoint POST tipo=visita
6. Geocerca: radios por categoria/subcategoria
7. Anti-spoofing
8. Zona rural y logro Pionero
9. Evidencia geo (interacciones.dims.geo)
10. Migracion 014: reset de visitas
11. Impacto por archivo
12. Tests y verificacion
13. Riesgos residuales y ADR-025 candidato
14. ADR-024 (borrador)
15. Resumen de entrega

---

## 1. Objetivo

Convertir el marcado de "Estuve aqui" (POST `tipo=visita` de `api/interacciones.js`) en una
accion con **presencia fisica verificada en servidor** (geocerca Haversine), cerrar el farming
de XP del ciclo visita/quitar_visita, y premiar el descubrimiento de zonas rurales con un bono
de exploracion. Todo dentro del presupuesto fijo de 8 endpoints de Vercel Hobby (sin endpoint
nuevo) y reutilizando el modelo JSONB existente (`interacciones.dims`).

Pilares del diseno:

1. **Geocerca Haversine server-side** en el POST `tipo=visita`.
2. **Dedup-first + indice unico parcial** para cerrar la race condition y el farming.
3. **Anti-spoofing pragmatico** (accuracy, cooldown, velocidad maxima, tope diario).
4. **Zona rural** con radio extendido y bono plano + logro `logr_pionero`.
5. **Reset unico de visitas gamificadas** (migracion 014) con respaldo de auditoria.

---

## 2. Contexto (lo que ya existia)

Contexto previo al cambio (estado real antes, verificado con ADR-006); el estado final esta en la
seccion 11:

| Elemento | Estado previo | Relevancia |
|---|---|---|
| `api/interacciones.js` `tipo=visita` | Handler v3: exigia `usuario_id`, deduplicaba por `SELECT` y otorgaba +20 XP. **No validaba ubicacion.** | Objeto del rediseno; hoy reescrito (v11). |
| `api/interacciones.js` `tipo=quitar_visita` | Hacia `DELETE` fisico de la fila y **no descontaba XP** -> ciclo visita/quitar_visita/visita = farming. | Hoy es soft-delete (`activo=false`). |
| Columna `interacciones.activo` | Ya existe (v4, `boolean NOT NULL DEFAULT true`). | Habilita el soft-delete de visita sin migracion de columna. |
| Columna `interacciones.dims` | JSONB `NOT NULL DEFAULT '{}'` (migracion 003). | Almacena la evidencia `dims.geo` sin migracion de columna. |
| Constraint unica compuesta | Migracion 012 (PENDIENTE en Neon) la reemplaza por indice parcial solo `resena`/`rating`. | No hay unicidad sobre `visita`: la crea la migracion 014. |
| `api/utilidades.js` `?tipo=visitas` | Inserta filas `tipo='visita'` con `usuario_id NULL` (analitica anonima de pagina); el GET cuenta con `activo=true`. | El reset solo purga `usuario_id IS NOT NULL`. |
| `usuario-session.js` | Expone `obtenerUbicacion()`, `marcarVisitado()` (envia `lat/lng/accuracy/ts`) y `mensajeErrorVisita()`; `quitarVisita()` envia `quitar_visita`; `sincronizarGuardados()` ya no migra visitas. Trabajo commiteado en HEAD `fcd6060`. | Frontend listo para el nuevo contrato. |
| `api/pagina-destino.js` | El boton `marcarVisitadoBtn` (L2327) llama `window.ExploraCO.marcarVisitado(DID)` con estado de carga. | Sin cambio de UI, salvo los textos de error. |
| `api/interacciones.js` v11 | Define `haversineMetros`, `resolverRadioM` y las constantes de geocerca (L74-93). | Helpers base del diseno. |
| `db/migrations/014_...sql` | Creada en working tree (10 pasos sin tablas temporales, idempotente, con respaldo). | Reset autorizado. |

---

## 3. Problematica y vectores de abuso

1. **Marcado remoto de "Estuve aqui":** el servidor aceptaba la visita sin comprobar que el
   usuario estuviera en las coordenadas del destino. La metrica social perdia valor territorial.
2. **Farming de XP visita/quitar_visita:** `quitar_visita` borraba la fila y permitia volver a
   insertarla pagando XP de nuevo, sin limite.
3. **Race condition de dedup:** el `SELECT` de dedup seguido de `INSERT` no era atomico; dos
   requests concurrentes podian insertar la misma visita dos veces (sin indice unico).
4. **Brecha rural:** un radio fijo de 100 m castiga senderos, miradores y fincas donde el GPS
   tiene peor precision y donde descubrir un lugar apartado deberia valer mas.
5. **Spoofing de GPS:** el sistema no tenia ninguna verificacion de precision, velocidad ni
   frecuencia de las coordenadas enviadas por el cliente.

---

## 4. Arquitectura de la solucion

- **Un solo endpoint:** toda la logica vive en la rama `POST tipo=visita` de
  `api/interacciones.js`. Presupuesto 8/8 intacto (ADR-010).
- **Haversine server-side:** helper puro `haversineMetros(lat1,lng1,lat2,lng2)` con radio
  terrestre medio `6371008.8 m`. Compara la posicion del usuario contra `destinos.lat/lng`.
- **Dedup-first:** antes de insertar se consulta cualquier fila `(usuario_id, destino_id,
  tipo='visita')` sin importar `activo`. Si existe activa -> 200 `ya_visitado`; si existe
  inactiva -> reactivar (`activo=true`) y pagar 0 XP. El indice unico parcial cierra la race:
  un conflicto `23505` se traduce a 200 `ya_visitado`.
- **Soft-delete de `quitar_visita`:** `UPDATE ... SET activo=false` (Cero Borrado Logico),
  sin descontar XP. Un segundo marcado reactiva la fila con xp 0 y sin incrementar
  `total_visitas`.
- **Frontend geolocation:** `usuario-session.js` obtiene la posicion con
  `navigator.geolocation.getCurrentPosition` (`enableHighAccuracy`, timeout 10 s, `maximumAge 0`)
  y envia `{lat, lng, accuracy, ts}`; `mensajeErrorVisita()` traduce los codigos del backend.
- **Evidencia geo:** se persiste `dims.geo` en la fila de visita (JSONB), sin migracion de
  columnas.
- **Zona rural y bono:** radio adaptativo + bono plano de `+20 XP` solo en el INSERT fresco.

---

## 5. Contrato del endpoint POST tipo=visita

**Request:** `POST /api/interacciones`

```json
{
  "tipo": "visita",
  "usuario_id": "<uuid>",
  "destino_id": "<uuid>",
  "lat": 4.5981,
  "lng": -74.0758,
  "accuracy": 25,
  "ts": 1757600000000
}
```

`lat` y `lng` son obligatorios; `accuracy` es recomendado (si falta, la visita se acepta sin
filtro de precision y se marca `accuracy:null`); `ts` es solo diagnostico (el servidor usa su
propio tiempo `NOW()`/`creado_en`).

**Orden de validaciones (implementado en `api/interacciones.js`):**
`usuario_id` -> dedup-first -> destino (404) -> blog (400) -> coords -> accuracy -> geocerca ->
cooldown -> velocidad -> tope diario. La tabla siguiente lista los codigos resultantes.

| Codigo HTTP | `code` | Condicion |
|---|---|---|
| 400 | `COORDENADAS_REQUERIDAS` | Faltan `lat` o `lng`. |
| 400 | `COORDENADAS_INVALIDAS` | No numericas o fuera de rango (lat [-90,90], lng [-180,180]) o `0,0`. |
| 400 | `ACCURACY_INVALIDA` | `accuracy` no numerica o <= 0. |
| 400 | `VISITA_NO_PERMITIDA` | Destino de categoria `blog` (un articulo no es un lugar visitable). |
| 404 | `DESTINO_NO_ENCONTRADO` | `destino_id` inexistente. |
| 422 | `PRECISION_INSUFICIENTE` | `accuracy > 150 m`. |
| 422 | `FUERA_DE_RANGO` | `dist_m > radio_m + accuracy`. |
| 422 | `VELOCIDAD_IMPOSIBLE` | `v_mps > 69.4` (~250 km/h) respecto de la ultima visita del usuario. |
| 429 | `RATE_LIMIT` | Menos de 90 s desde la ultima visita del usuario. |
| 429 | `LIMITE_DIARIO` | Mas de 30 visitas del usuario en 24 h. |
| 200 | (sin `code`) | Idempotente: `ya_visitado:true` (fila activa) o `reactivado:true, xp:0` (fila inactiva reactivada). |
| 200 | (sin `code`) | Registro fresco: `xp` (+20 base, +20 bono rural cuando aplica). |

**Dedup e idempotencia:** el chequeo de dedup corre como primer paso de persistencia (antes del
INSERT), considerando cualquier fila activa o no. La reactivacion paga 0 XP, no incrementa
`total_visitas` y no re-evalua misiones/logros. El indice unico parcial
`idx_interacciones_visita_unica (usuario_id, destino_id) WHERE tipo='visita' AND usuario_id IS NOT NULL`
es la garantia a nivel de BD; su violacion (`23505`) responde 200 `ya_visitado` en vez de 500.

**Respuesta de exito (fresco):** ademas de `xp`/`xp_detalle`/`misiones`/`logros`/`cromo`/`amuleto_x2`/`reto_completado`
(contrato v9 existente), incluye la evidencia `dist_m`, `radio_m`, `zona`, `zona_motivo` y `modo`
para que el toast del frontend muestre "a N m, zona rural". `xp_detalle` desglosa
`{base, multiplicador, amuleto, bono_rural, total}`.

---

## 6. Geocerca: radios por categoria/subcategoria

Orden de resolucion: **keyword -> subcategoria -> categoria -> default**.

| Condicion | Radio (m) |
|---|---|
| Keyword rural en `tipo_actividad`/`tipo_alojamiento`/`tipo_comida`/`nombre` | 250 |
| Subcategoria `naturaleza` o `aventura` | 250 |
| Subcategoria `parque` | 150 |
| Subcategoria `festival` o `deporte` | 200 |
| Categoria `evento` | 150 |
| Subcategorias urbanas (`museo`, `bar`, `cafe`, `restaurante`, `teatro`, etc.) | 100 |
| Default (sin coincidencia) | 100 |
| Categoria `blog` | Rechazado (400 `VISITA_NO_PERMITIDA`) |

`RURAL_KEYWORDS`: `sendero`, `mirador`, `finca`, `cabana`, `glamping`, `rural`, `ecotur`,
`natural`, `playa`, `montana`, `refugio`, `cascada`, `reserva`, `parque nacional`, `rio`.

Constantes reales en `api/interacciones.js` (L74-93): `TIERRA_RADIO_M=6371008.8`,
`RADIO_DEFAULT_M=100`, `RADIO_POR_CATEGORIA={sitio:100,hostal:100,comida:100,evento:150}`,
`RADIO_POR_SUBCATEGORIA` (tabla completa), `ACCURACY_MAX_M=150`, `COOLDOWN_MIN_SEG=90`,
`MAX_VELOCIDAD_MPS=69.4`, `VISITAS_DIA_MAX=30`, `VECINOS_RURAL_MAX=3`,
`VECINOS_BBOX_DEG=0.02`, `VISITA_BONO_RURAL=20`.

---

## 7. Anti-spoofing

| Regla | Valor | Codigo |
|---|---|---|
| Precision GPS maxima | `accuracy <= 150 m` | 422 `PRECISION_INSUFICIENTE` |
| Cooldown entre visitas | 90 s | 429 `RATE_LIMIT` |
| Velocidad maxima implicada | 69.4 m/s (~250 km/h) | 422 `VELOCIDAD_IMPOSIBLE` |
| Tope diario | 30 visitas / 24 h | 429 `LIMITE_DIARIO` |
| Tiempo de referencia | Servidor (`creado_en`/`NOW()`) | - |
| `ts` del cliente | Solo diagnostico (se guarda en `dims.geo.ts_cliente`) | - |

**Riesgo residual (documentado):** `lat/lng/accuracy` son datos suministrados por el cliente sin
sesion firmada ni atestacion de dispositivo; un usuario con herramientas de desarrollo puede
falsear la ubicacion. Mitigaciones futuras propuestas: sesion firmada + Play Integrity / App
Attest -> **ADR-025 candidato**.

---

## 8. Zona rural y logro Pionero

Un destino se considera **rural** si cumple cualquiera de:

1. `tags.subcategoria` en `{naturaleza, aventura, parque}`.
2. Keyword rural (seccion 6) presente en `tipo_actividad`/`tipo_alojamiento`/`tipo_comida`/`nombre`.
3. **Vecinos escasos:** `COUNT` de destinos con `status='published'` y coordenadas validas dentro
   de un bounding box de `0.02` grados (`VECINOS_BBOX_DEG`) alrededor del destino es `<= 3`
   (`VECINOS_RURAL_MAX`).

Efectos:

- `zona='rural'`; `zona_motivo` registra cual regla gano (`subcategoria` | `keyword` | `densidad`).
  En zona urbana `zona='urbana'` y `zona_motivo='urbano'`; sin coordenadas de destino,
  `zona='sin_geocerca'` y `zona_motivo='sin_geocerca'`.
- **Bono plano `+20 XP`** (`VISITA_BONO_RURAL`), otorgado **solo en el INSERT fresco**.
- El bono **no** recibe multiplicador x1.1 de lider, amuleto_x2, ni aporte a fama (evita
  amplificar el anti-farming).
- Logro nuevo `logr_pionero` (tier `plata`, 40 XP, `requiere: []`) -> sube el catalogo LOGROS
  de 29 a **30**.

**Destino sin coordenadas:** se permite la visita en `modo='sin_geocerca'` (no bloquea destinos
legacy sin latin/lng), **sin** bono rural, pero conservando las validaciones de `accuracy`,
velocidad y tope diario.

---

## 9. Evidencia geo (interacciones.dims.geo)

Sin migracion de columnas (la columna `dims` JSONB ya existe). El INSERT de visita persiste:

```json
{
  "geo": {
    "lat": 4.5981,
    "lng": -74.0758,
    "accuracy": 25,
    "dist_m": 42,
    "radio_m": 100,
    "zona": "urbana",
    "zona_motivo": "urbano",
    "modo": "geocerca",
    "v_mps": 1.4,
    "ts_cliente": 1757600000000
  }
}
```

Esto da trazabilidad de auditoria para QA/reset y permite recalcular o analizar visitas sin
cambiar el esquema.

---

## 10. Migracion 014: reset de visitas

**Archivo:** `db/migrations/014_reset_visitas_presencia_fisica.sql` (NUEVA, idempotente ADR-008,
ASCII-safe ADR-002, transaccion `BEGIN/COMMIT`).

**Decision aprobada:** purga **fisica unica** de las visitas gamificadas
(`tipo='visita' AND usuario_id IS NOT NULL`) con **tabla de respaldo de auditoria**
(`interacciones_visitas_reset_backup`). Excepcion autorizada a Cero Borrado Logico; precedente:
la migracion 012 ya elimina filas de `interacciones` para deduplicar.

Pasos reales del archivo (implementado SIN tablas temporales para ser compatible con el editor
SQL de Neon, que autocommita por sentencia; cada paso usa subconsultas autocontenidas):

1. `CREATE TABLE IF NOT EXISTS interacciones_visitas_reset_backup AS SELECT * ... WHERE 1=0`
   (+ indice por `id`).
2. Respaldo idempotente de las visitas gamificadas (`WHERE NOT EXISTS` por `id`).
3. `usuarios.xp_total = GREATEST(0, xp_total - xp_base - xp_bono)` con subconsultas de agregacion:
   `xp_base = SUM(xp_ganado)` por usuario y `xp_bono` de misiones/logros dependientes de visitas
   (`mis_primera_visita` 15, `mis_itinerario_perfeccion` 60, `logr_visitas_5` 15,
   `logr_visitas_20` 50) segun presencia de la clave en el JSONB (`?`).
4. `usuarios.total_visitas = GREATEST(0, total_visitas - n)`.
5. Reset dirigido de flags JSONB con `jsonb - text` (ADR-003): quita solo
   `mis_primera_visita`, `mis_itinerario_perfeccion`, `logr_visitas_5`, `logr_visitas_20`;
   conserva el resto.
6. Recomputo de `pandillas.fama_total` restando `SUM(GREATEST(1, ROUND(xp_ganado*0.10)))`.
7. Recomputo de `pandilla_retos` (`progreso_actual` con `GREATEST(0,...)` y recalculo de
   `completado`) para retos `tipo_reto='visita'` dentro de su ventana temporal. **No** revierte
   el `xp_bono` ya repartido (fuera de alcance).
8. `DELETE` de todas las visitas gamificadas (`tipo='visita' AND usuario_id IS NOT NULL`).
9. `CREATE UNIQUE INDEX IF NOT EXISTS idx_interacciones_visita_unica ... WHERE tipo='visita'
   AND usuario_id IS NOT NULL` (cierra la race; al purgar primero, no puede fallar por duplicados).
10. Indice de apoyo `idx_interacciones_ultima_visita (usuario_id, creado_en DESC)`.

**Se preserva:** analitica anonima (`usuario_id IS NULL`), `resena_votos`,
`destinos.rating`/`total_resenas`, `usuarios_cromos` (cromos).

**Drift residual documentado:** el XP de la fila es el XP **base** (20); los multiplicadores
x1.1 y el amuleto_x2 se suman aparte a `xp_total` y no quedan en la fila. Por eso
`SUM(xp_ganado)` puede quedar por debajo del XP realmente acreditado; el recomputo puede dejar
un remanente positivo (nunca negativo por `GREATEST(0,...)`). No hay ledger de multiplicadores
que permita el ajuste exacto.

**Aplicacion:** correr el archivo COMPLETO en el editor SQL de Neon (Javier), **antes** del
deploy del backend nuevo.

---

## 11. Impacto por archivo

| Archivo | Cambio |
|---|---|
| `api/interacciones.js` | v11: helpers Haversine/radios/constantes; reescritura de `tipo=visita`; `quitar_visita` -> soft-delete; logro `logr_pionero`; escritura `dims.geo`; catch `23505` -> 200 `ya_visitado`. |
| `usuario-session.js` | `obtenerUbicacion()` + `marcarVisitado()` con `lat/lng/accuracy/ts` + `mensajeErrorVisita()` (ya en working tree/HEAD). |
| `api/pagina-destino.js` | Boton "Estuve aqui" -> `marcarVisitadoBtn` -> `marcarVisitado()` (ya presente); blogs excluidos. |
| `db/migrations/014_reset_visitas_presencia_fisica.sql` | NUEVA (reset autorizado). |
| `scripts/test_logros_catalogo.js` (+ `smoke_test_perfil_progreso.js`, `smoke_test_comunidad.js`, `verify_comunidad_prod.js`) | LOGROS 30 (+`logr_pionero`); todos PASS. |
| `scripts/smoke_visita_geocerca.js` | Smoke dedicado del contrato; 15/15 PASS (ejecutado 2026-09-12). |
| `api/utilidades.js` | Conteo de visitas filtra `activo=true`. |
| `usuario-session.js` | `sincronizarGuardados()` ya no migra visitas (solo guardados). |
| Docs | `DECISIONS.md` ADR-024, este spec, `TASKS.md` TSK-099, `NEXT.md`, `BLUEPRINT.md` seccion 3. |

**Sin endpoints nuevos** (presupuesto 8/8, ADR-010).

**Trade-off de producto:** el contador publico de visitas de `api/utilidades.js`
(`?tipo=visitas`) puede BAJAR tras el reset, porque el conteo incluye las filas gamificadas
purgadas. Es un efecto esperado y aceptado del reset unico.

---

## 12. Tests y verificacion

1. **Haversine:** distancias conocidas (p. ej. Bogota-La Candelaria ~0 m; dos puntos a ~100 m).
2. **Radios:** orden keyword -> subcategoria -> categoria -> default; `blog` rechazado.
3. **Zona rural:** regla subcategoria, keyword y densidad (vecinos en bbox); `zona_motivo` correcto (`densidad`/`urbano`).
4. **Anti-spoofing:** accuracy > 150, cooldown < 90 s, velocidad > 69.4 m/s, tope >=30 en ventana movil de 24 h, rechazo de `0,0`.
5. **Dedup/idempotencia:** `ya_visitado` con fila activa; `reactivado xp:0` con fila inactiva;
   `23505` mapeado a 200 `ya_visitado`.
6. **quitar_visita:** soft-delete (`activo=false`), sin descontar XP; reactivar no repaga.
7. **`sin_geocerca`:** destino sin `lat/lng` permite, sin bono rural.
8. **Migracion 014:** idempotencia (segunda corrida no resta), respaldo e indices; verificacion
   post-aplicacion (0 visitas gamificadas, anonimas preservadas).
9. **Escudo GOLD:** `node --check`, ASCII-safety 0 bytes > 127, balance de divs, y
   `node scripts/check_buildHTML_inline.js` (BUG-031).
10. **Tests de logros:** `scripts/test_logros_catalogo.js` en 30/30 y smokes de conteo +1.
11. **Smoke dedicado:** `node scripts/smoke_visita_geocerca.js` -> **15/15 PASS** (validaciones tempranas, dedup activa/inactiva, cooldown, tope diario, caminos felices urbano xp 20 y rural xp 40).

---

## 13. Riesgos residuales y ADR-025 candidato

| Riesgo | Mitigacion actual | Residual |
|---|---|---|
| Spoofing de GPS (devtools/mock location) | accuracy + velocidad + cooldown + tope | `lat/lng/accuracy` son client-supplied sin sesion firmada. **ADR-025 candidato**: sesion firmada + atestacion (Play Integrity / App Attest). |
| Drift de XP del reset | `GREATEST(0,...)`, respaldo de filas | Multiplicadores/amuleto no trazados en la fila; remanente positivo posible. |
| Bono rural amplifica farming | Bono plano, solo en INSERT fresco, sin multiplicador/amuleto/fama | Bajo. |
| Bbox rural (0.02 grados) sensible a latitud | Aproximacion ~2.2 km lat / ~2.2*cos(lat) km lng | Zonas densas podrian no calificar; ajustar constante si hay evidencia. |
| Reset irreversible | Tabla de respaldo de auditoria | Requiere ejecucion manual correcta (idempotente). |
| Migraciones 011/012/013 pendientes en Neon | Documentadas | La 014 debe aplicarse despues de la 012 (que quita la constraint vieja). |

---

## 14. ADR-024 (borrador)

La version canonica vive en `DECISIONS.md`. Resumen: se adopta presencia fisica obligatoria en
`tipo=visita` (Haversine server-side, sin endpoint nuevo), dedup-first + indice unico parcial,
reactivacion sin XP, soft-delete de `quitar_visita`, radios adaptativos con bono rural y logro
`logr_pionero`, y reset unico de visitas gamificadas via migracion 014 con respaldo. Pendiente:
aplicar la 014 en Neon + deploy (el handler ya esta cerrado y los tests de logros ya estan en 30/30;
`smoke_visita_geocerca.js` 15/15 PASS).

---

## 15. Resumen de entrega

- **Decision:** ADR-024 (Presencia Fisica + Presencia Espacial).
- **Backend:** `api/interacciones.js` v11 (geocerca Haversine en `tipo=visita`). Sin endpoint nuevo.
- **Frontend:** `usuario-session.js` geolocation + `api/pagina-destino.js` boton existente.
- **Base de datos:** `db/migrations/014_reset_visitas_presencia_fisica.sql` (reset con respaldo;
  indice unico parcial de visita).
- **Gamificacion:** bono rural +20 XP y logro `logr_pionero` (LOGROS 30).
- **Pendientes manuales:** aplicar migracion 014 en Neon + deploy; completar `smoke_visita_geocerca.js`.
- **Riesgo residual:** coordenadas client-supplied sin sesion firmada -> ADR-025 candidato.
