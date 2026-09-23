# Design: Consumibles con gate por era (banda exclusiva de compra)

**Fecha:** 2026-09-23
**Estado:** Aprobado para implementacion
**ADR relacionado:** ADR-056 (gate de consumibles por era)
**Contexto:** motor de gamificacion v7 (40 niveles / 5 eras), `consumibles` (migraciones 010/015/017/018/027/031/034).

---

## 1. Problema y objetivo

El catalogo de consumibles (17 filas en el estado real de Neon, porque la 034
no esta aplicada) es plano: cualquier usuario puede comprar
cualquier item con XP suficiente. Se quiere una **tienda por era**: cada era
desbloquea su propio set de consumibles y algunos items premium quedan
bloqueados hasta alcanzar la era correspondiente.

## 2. Decisiones de diseno (cerradas con el usuario)

| Punto | Decision |
|---|---|
| Modelo de datos | `consumibles.era_exclusiva varchar(20)`. `NULL` = tienda base (sin gate) |
| Semantica del gate | **Compra exclusiva**: se compra solo si `era_visible = era_exclusiva`. Fuera de la era -> bloqueado (futura o pasada) |
| Uso | **Permitido siempre** si el item esta en el inventario, aunque la era se haya superado. NO se aplica gate en `usar_consumible` |
| Valor de evaluacion | **Nivel ganado**: `era_visible = calcularEra(GREATEST(calcularNivel(xp_total), nivel_max))`. Nunca se pierde por gastar XP (ADR-053) |
| Efectos | Los 15 nuevos **reutilizan tipos de efecto existentes** (sin logica de efecto nueva) |
| Existentes | Se gatean los premium por era; el resto queda `NULL` (tienda base) |
| Alcance | El gate aplica uniformemente a todos los consumibles, incluidos producibles del mercado (`prod_*` quedan `NULL`) |

Las eras son las del motor actual (`usuario-session.js:232-248`,
`api/usuarios.js:102-108`): `Caminante` (1-10), `Explorador` (11-20),
`Cronista` (21-30), `Leyenda` (31-35), `Mito` (36-40).

## 3. Modelo de datos

Migracion nueva: `db/migrations/035_consumibles_era.sql`.
**Aditiva, idempotente (ADR-008), ASCII-safe (ADR-002).** No crea ni borra
tablas, no usa DELETE ni DROP.

```sql
ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS era_exclusiva varchar(20);
```

- Sin `CHECK` en DB (consistente con `categoria`, ADR-028: catalogo
  administrable). La validacion estricta vive en el backend.
- Sin indice (catalogo de decenas de filas).
- `NULL` por defecto: los items existentes quedan sin gate salvo el backfill
  de premium de la seccion 4.

Dependencia: requiere `consumibles.precio_xp_base`, creada por la 027 (la 034 la
re-provisiona). **No requiere que la 034 este aplicada.** Verificado en Neon
(2026-09-23, preflight): `precio_xp_base` existe, `era_exclusiva` no (la
migracion 035 se aplico ese mismo dia), y el catalogo previo
tiene 17 filas porque la 034 no esta aplicada (no hay `casa_ofertas` ni `prod_*`).
El INSERT de semilla incluye `precio_xp_base` para no corromper la vista
`consumibles_precio`.

## 4. Backfill de premium (definitivo)

`UPDATE` idempotente por lista literal de claves:

| era_exclusiva | Claves |
|---|---|
| `Cronista` | `pluma_inspirada`, `trompeta_fama`, `perfil_vitrina_destacada` |
| `Leyenda` | `perfil_marco_dorado`, `perfil_titulo_custom`, `sala_efimera`, `perfil_banda_artista` |
| `Mito` | `perfil_fondo_paisaje`, `pase_vip` |
| `NULL` (sin cambio) | `amuleto_x2`, `imantador_cromos`, `cuaderno_expedicion`, `pergamino_mapa`, `perfil_marco_plata`, `perfil_tema_oscuro`, `pin_cromado`, `vitrina_estelar`, `prod_artesania`, `prod_cafe`, `prod_souvenir` |

## 5. Catalogo nuevo: 15 consumibles (3 por era)

Todos reutilizan un tipo de efecto existente. Nombres en DB sin acentos
(precedente de semillas); la UI los muestra tal cual desde `nombre`.

| # | clave | nombre | era | categoria | precio XP | efecto (capacidad) |
|---|---|---|---|---|---|---|
| 1 | `brujula_aprendiz` | Brujula del Aprendiz | Caminante | impulso | 380 | `multiplicador_x2_usos = 3` |
| 2 | `cantimplora_anden` | Cantimplora del Anden | Caminante | coleccion | 420 | `mapas_extra += 1` |
| 3 | `mapa_carboncillo` | Mapa a Carboncillo | Caminante | coleccion | 460 | `albums_extra += 1` |
| 4 | `linterna_selva` | Linterna de Selva | Explorador | coleccion | 700 | `mapas_extra += 2` |
| 5 | `libreta_campo` | Libreta de Campo | Explorador | coleccion | 760 | `albums_extra += 2` |
| 6 | `brujula_ruta` | Brujula de Ruta | Explorador | impulso | 900 | `multiplicador_x2_usos = 6` |
| 7 | `tintero_cronista` | Tintero del Cronista | Cronista | general | 980 | `permiso_arte = true` |
| 8 | `camara_antigua` | Camara Antigua | Cronista | social | 1080 | `vitrina_estelar_hasta = now + 7d` |
| 9 | `sello_archivo` | Sello de Archivo | Cronista | coleccion | 1150 | `cromo_garantia = 'epico'` |
| 10 | `estandarte_leyenda` | Estandarte de Leyenda | Leyenda | social | 1500 | `fama_x2_hasta = now + 24h` |
| 11 | `capa_travesia` | Capa de Travesia | Leyenda | impulso | 1650 | `pin_mapa_hasta = now + 7d` |
| 12 | `corona_rutas` | Corona de Rutas | Leyenda | perfil | 1800 | `perfil_config.marco = 'dorado'` + flag `perfil_corona_rutas` |
| 13 | `reliquia_ancestral` | Reliquia Ancestral | Mito | perfil | 2200 | `perfil_config.tema = 'oscuro'` + flag `perfil_reliquia_ancestral` |
| 14 | `aura_mito` | Aura de Mito | Mito | social | 2400 | `vitrina_estelar_hasta = now + 7d` |
| 15 | `nombre_eterno` | Nombre Eterno | Mito | perfil | 2800 | `perfil_config.titulo = 'Mito Eterno'` + flag `perfil_nombre_eterno` |

Notas:
- Los valores de marco/tema reutilizan literales ya renderizados por el
  cliente (`dorado`, `oscuro`); NO se introducen valores visuales nuevos.
- Los items 12-15 son permanentes (flags + `mergePerfilConfig`), mismo patron
  que los `perfil_*` de la migracion 015/017.

### 5.1 Reglas de uso nuevas en `usar_consumible`
Cada clave nueva tiene su rama. Reglas adicionales:
- Anti-stacking de x2: la validacion actual de `amuleto_x2` se generaliza a
  las claves cuyo efecto es `multiplicador_x2_usos` (`brujula_aprendiz`,
  `brujula_ruta`): si `multiplicador_x2_usos > 0` -> `409`.
- `nombre_eterno`: el titulo es fijo (`'Mito Eterno'`), no requiere payload.
- `corona_rutas` / `reliquia_ancestral`: no requieren payload; el flag se
  marca con `actualizarCapacidad` y se hace `mergePerfilConfig`.

## 6. Contrato de API

### 6.1 Helper unico de era visible (`api/interacciones.js`)
```js
function calcularEraVisibleLocal(xpTotal, nivelMax) {
  var n = calcularNivelLocal(xpTotal).nivel;
  var nm = parseInt(nivelMax, 10) || 1;
  return calcularEraLocal(Math.max(n, nm));
}
```
Espejo documentado de `api/usuarios.js:160-170` (`conNivel`). Se usa en los 3
puntos de gate/lectura para no derivar la era del XP crudo.

### 6.2 `GET /api/interacciones?tipo=consumibles[&categoria=][&usuario_id=]`
- SELECT suma `era_exclusiva`.
- Si viene `usuario_id`: se lee `xp_total, nivel_max` del usuario y se calcula
  `era_usuario`; cada item devuelve `bloqueado` (`era_exclusiva` distinta de
  `era_usuario`; `NULL` -> false) junto a `era_exclusiva`.
- Si no viene `usuario_id`: `era_exclusiva` presente, `bloqueado = false`.
- **Degradacion** si 035 no corrio: catch -> reintento sin `era_exclusiva`
  (igual que el fallback de `categoria`) -> todos `era_exclusiva = null`.

### 6.3 `POST tipo=comprar_consumible`
- El SELECT de `consumibles` suma `era_exclusiva`; el de `usuarios` suma
  `nivel_max`.
- Si `era_exclusiva` no es NULL y `era_visible != era_exclusiva`:
  `403 { ok:false, error:'ERA_INSUFICIENTE', era_requerida, era_actual }`.
- El chequeo va **antes** del anti-farming y del UPDATE.
- Degradacion: si la columna no existe, `era_exclusiva` undefined -> sin gate.

### 6.4 `POST tipo=usar_consumible`
- **Sin gate de era** (el item ya esta en inventario). Se conserva el resto.

### 6.5 `GET tipo=inventario` (fix de bug)
- Hoy calcula `era` sobre el nivel derivado de XP (`interacciones.js:5895-5896`).
- Pasa a leer `nivel_max` y usar `calcularEraVisibleLocal(xp_total, nivel_max)`.
- Cada item del inventario puede incluir `era_exclusiva` (opcional, para el
  tag visual); el boton Usar nunca se bloquea por era.

### 6.6 `api/admin.js` recurso=`consumibles`
- `consumibles_lista`: agrega `era_exclusiva` al SELECT.
- `consumibles_crear`: acepta `era_exclusiva` (INSERT).
- `consumibles_editar`: acepta `era_exclusiva` (SET).
- Normalizador `normalizarEraConsumible(v)`: `''`/`null`/`'ninguna'` -> `null`;
  comparacion case-insensitive contra las 5 eras -> etiqueta canonica;
  invalido -> `null` (o error 400, a criterio: se documenta como `null`).

## 7. Admin UI (`admin.html`)
- Form nuevo (~1996-2028) y modal edicion (~2189-2229): `<select>` de era con
  opciones `Sin gate` + `Caminante|Explorador|Cronista|Leyenda|Mito`.
- `crearConsumible` / `guardarEdicionConsumible`: enviar `era_exclusiva`.
- `abrirEditarConsumible`: precargar el select.
- `renderConsumibles`: badge de era (o vacio si `NULL`).

## 8. Cliente (`mi-perfil.html`)
- `cargarTienda` (~1619-1655): si `bloqueado` -> card con candado, boton
  deshabilitado y texto `Disponible en era <era_exclusiva>`; si no, comportamiento
  actual (incluida la validacion por XP).
- `cargarInventario` (~1694-1728): tag de era; boton Usar siempre activo.
- No se agregan entradas a `PF_DATO_CONSUMIBLE` para las claves nuevas (no
  requieren input); el flujo de uso directo las cubre.

## 9. Verificacion (Escudo GOLD + smoke)
- `node --check` + ASCII-safety + balance de divs.
- Smoke (`scripts/smoke_test_consumibles_era.js`):
  1. Item de era futura -> compra `403 ERA_INSUFICIENTE`.
  2. Item de la era actual -> compra `200`.
  3. Item de era superada ya en inventario -> uso `200`.
  4. `GET consumibles` con usuario devuelve `era_exclusiva`/`bloqueado`.
  5. Degradacion: sin columna `era_exclusiva`, no rompe y no bloquea.
  6. `inventario` devuelve la era canonica (nivel ganado).

## 10. Invariantes y riesgos
- **ADR-002** ASCII-safe: escapes Unicode en JS, SQL 100% ASCII.
- **ADR-008** migracion idempotente; **APLICADA en Neon el 2026-09-23** (5
  sentencias OK; verificacion: 32 filas); el deploy del backend queda pendiente
  (BUG-021 / BUG-060).
- **ADR-053** anti-de-nivel: gate sobre `nivel_visible`.
- No duplicar la logica de eras: un helper y un espejo documentado.
- La tienda es publica (GET sin usuario): `bloqueado` solo se calcula con
  `usuario_id`; sin el, la UI muestra la era requerida sin candado duro.

## 11. Fuera de alcance
- Efectos de gameplay nuevos (solo reutilizacion).
- Gate de uso de items ya comprados.
- Gate por nivel exacto intra-era (se descarto la Opcion B/C).
