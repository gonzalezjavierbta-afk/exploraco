# XP decimal con numeric(12,2) y rankings de comunidad

- **Fecha:** 2026-09-17
- **ADR:** ADR-035 (`exploraco desarrollo/DECISIONS.md`)
- **Estado:** Diseno aprobado. Implementacion PENDIENTE.
- **Presupuesto endpoints:** 8/8 intacto (ADR-001). Solo ramas `tipo=` y campos aditivos.
- **ASCII-safe (ADR-002):** este documento y el SQL usan solo ASCII.

> Fuente de verdad: el archivo real del repositorio (ADR-006). Los numeros de linea
> fueron verificados sobre el working tree el 2026-09-17; si el archivo cambia, se
> reverifica antes de implementar.

---

## 1. Migracion `db/migrations/021_xp_decimal.sql`

Idempotente (ADR-008) y defensiva (patron BUG-021). La conversion
`integer -> numeric(12,2)` es exacta: `int4` max 2147483647 cabe en
`numeric(12,2)` max 9999999999.99. No hay redondeo ni saturacion.
Cada `ALTER` corre solo si la columna EXISTE y su `data_type` actual es
entero; tras convertir, el bloque es no-op al re-ejecutar.

```sql
-- Migration 021: XP decimal con numeric(12,2) + soporte de rankings
-- ASCII-safe (ADR-002): cero bytes > 127.
-- Idempotente (ADR-008): re-ejecutar es seguro (no-op tras convertir).
-- Requiere: migraciones 009, 010 y 016 aplicadas.
-- interacciones.xp_ganado y usuarios.ultimo_acceso/activo NO estan
-- versionadas: se tratan de forma defensiva (patron BUG-021).
--
-- APLICACION: correr COMPLETO en el editor SQL de Neon ANTES del deploy.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('usuarios',           'xp_total'),
      ('usuarios',           'xp_ref_total'),
      ('interacciones',      'xp_ganado'),
      ('album_votos',        'xp_ganado'),
      ('album_fotos',        'xp_otorgado_autor'),
      ('compra_consumibles', 'xp_pagado'),
      ('pandilla_retos',     'xp_bono'),
      ('consumibles',        'precio_xp'),
      ('pandillas',          'fama_total')
    ) AS t(tabla, columna)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = r.tabla
        AND c.column_name = r.columna
        AND c.data_type IN ('integer', 'smallint', 'bigint')
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE numeric(12,2) USING %I::numeric(12,2)',
        r.tabla, r.columna, r.columna
      );
      RAISE NOTICE 'migracion 021: %.% -> numeric(12,2)', r.tabla, r.columna;
    END IF;
  END LOOP;
END $$;

-- Verificacion de cierre (solo lectura; las 9 filas deben decir numeric):
-- SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND (table_name, column_name) IN (
--     ('usuarios','xp_total'), ('usuarios','xp_ref_total'),
--     ('interacciones','xp_ganado'), ('album_votos','xp_ganado'),
--     ('album_fotos','xp_otorgado_autor'), ('compra_consumibles','xp_pagado'),
--     ('pandilla_retos','xp_bono'), ('consumibles','precio_xp'),
--     ('pandillas','fama_total')
--   )
-- ORDER BY table_name, column_name;
```

**`pandillas.fama_total`: NO recomputar.** Es un acumulador historico construido
con `ROUND(10% del XP entregado)`, duplicado por `trompeta_fama` (x2) y alimentado
tambien por XP de misiones/logros que no queda en `interacciones.xp_ganado`
(drift ADR-024/ADR-028). Un recomputo `SUM(xp_ganado)*0.10` borraria el efecto del
consumible, ignoraria el drift, reescribiria datos historicos (Cero Borrado Logico)
y la migracion 014 ya hizo un recomputo unico autorizado. Solo cambia el tipo;
`125 -> 125.00` preserva el valor.

**Rollback (emergencia, LOSSY):** `ALTER COLUMN ... TYPE integer USING ROUND(col)::integer`.
Se documenta como `021_xp_decimal_down.sql` no ejecutable en el flujo normal.
Respaldo opcional previo: `CREATE TABLE xp_backup_021 AS SELECT id, xp_total, ...`.

---

## 2. Redondeo half-up a 2 decimales

**Server JS (helper unico):**

```js
function redondearXp(n) {
  var v = Number(n);
  if (!isFinite(v)) return 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
```

**SQL:** `ROUND(expr::numeric, 2)` (half-away-from-zero en `numeric`).

**Cliente (helper unico en `usuario-session.js`):**

```js
window.ExploraCO.redondearXp = function(n){ var v = Number(n); if (!isFinite(v)) return 0; return Math.round((v + Number.EPSILON) * 100) / 100; };
window.ExploraCO.fmtXp = function(n){
  var v = Number(n); if (!isFinite(v)) v = 0;
  return v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
```

Regla: **redondear en la acreditacion, no en la lectura.** Prohibido formatear XP
inline por pantalla (Regla de No-Duplicidad).

---

## 3. Rankings

### 3.1 `GET /api/usuarios?tipo=casa_ranking` (modificado)

Cambios: agregar `miembros_activos`, ordenar por `xp_total DESC`, quitar `::int`.

```sql
SELECT u.casa,
  COUNT(*)::int AS miembros,
  COUNT(*) FILTER (
    WHERE u.activo = true
      AND u.ultimo_acceso > NOW() - INTERVAL '30 days'
  )::int AS miembros_activos,
  COALESCE(ROUND(SUM(u.xp_total), 2), 0) AS xp_total,
  COALESCE(ROUND(SUM(u.xp_total) / GREATEST(COUNT(*), 1), 2), 0) AS xp_promedio,
  (SELECT COUNT(*)::int FROM activos_ocultos ao
     WHERE (ao.votos_favor - ao.votos_contra) >= 3
       AND ao.activo = true
       AND ao.propuesto_por IN (SELECT id FROM usuarios WHERE casa = u.casa)) AS activos_ocultos_aprobados,
  (SELECT COUNT(*)::int FROM activos_ocultos_checkins aoc
     JOIN usuarios u2 ON u2.id = aoc.usuario_id
     WHERE u2.casa = u.casa AND aoc.activo = true
       AND aoc.creado_en > NOW() - INTERVAL '30 days') AS checkins_30d
FROM usuarios u WHERE u.casa IS NOT NULL
GROUP BY u.casa
ORDER BY xp_total DESC
```

Defensa: si falla con `42703` (columna no versionada), reintentar la misma consulta
SIN `FILTER (WHERE u.activo ... ultimo_acceso ...)` y devolver `miembros_activos: 0`
+ `warn`. Nunca catch vacio.

### 3.2 `GET /api/interacciones?tipo=pandilla_ranking` (NUEVA rama)

Global, lectura publica, orden por `fama_total DESC`, limit 50.

```sql
SELECT p.id, p.nombre, p.fama_total, p.ciudad_base, p.creado_en,
  (SELECT COUNT(*)::int FROM pandillas_miembros pm
     WHERE pm.pandilla_id = p.id AND pm.activo = true) AS miembros,
  (SELECT COUNT(*)::int FROM pandillas_miembros pm
     JOIN usuarios u ON u.id = pm.usuario_id
     WHERE pm.pandilla_id = p.id AND pm.activo = true
       AND u.activo = true
       AND u.ultimo_acceso > NOW() - INTERVAL '30 days') AS miembros_activos
FROM pandillas p WHERE p.activo = true
ORDER BY p.fama_total DESC, p.creado_en ASC
LIMIT 50
```

### 3.3 Definicion "miembro activo vigente (30 dias)"

1. Pertenencia activa (`pandillas_miembros.activo = true` / `usuarios.casa IS NOT NULL`).
2. Cuenta habilitada (`usuarios.activo = true`).
3. Actividad reciente (`usuarios.ultimo_acceso > NOW() - INTERVAL '30 days'`).

`ultimo_acceso` se escribe en cada acreditacion de XP (resena, guardado, visita,
rating, chat, planes, albumes, DM, `admin_xp`). Se usa como proxy de actividad
(ventana determinista, barata, ya usada por ADR-028/ADR-029).

---

## 4. Checklist backend (archivo:linea)

Marcar cada punto. Regla: `parseInt(columna_xp)` -> `Number`/`parseFloat`;
`FLOOR`/`Math.round`/`Math.floor` que produzca XP -> half-up 2;
`::int` sobre `SUM(xp_...)` -> `ROUND(...,2)`.

### `api/usuarios.js`
- [ ] L38 `parseInt(xpTotal)` -> `parseFloat` (calcularNivel).
- [ ] L53-55 `conNivel`: normalizar `row.xp_total = Number(row.xp_total)`.
- [ ] L415 `parseInt(rcRows[0].xp_ref_total, 10)` -> `Number` + 2.
- [ ] L435 `COALESCE(SUM(xp_ref_total),0)::int` -> `ROUND(...,2)`.
- [ ] L455 `COALESCE(SUM(xp_total),0)::int` -> quitar `::int`.
- [ ] L459-463 `frTop` -> normalizar `xp_total` a `Number`.
- [ ] L478 `::int` -> quitar; anadir `miembros_activos`.
- [ ] L479 `ROUND(...)::int AS xp_promedio` -> `ROUND(...,2)`.
- [ ] L492 `ORDER BY xp_promedio DESC` -> `ORDER BY xp_total DESC`.
- [ ] L495-499 `crTop` -> normalizar `xp_total` a `Number`.
- [ ] L546 `parseInt(pub.xp_total, 10)` -> `Number` + 2.
- [ ] L641/L655/L684 `parseInt(...xp_total...)` (casa_elegir) -> `Number` + 2.
- [ ] RETURNING de `faccion_elegir`/`casa_elegir` normalizado.

### `api/interacciones.js`
- [ ] L198 `parseInt(xpTotal, 10)` -> `parseFloat` (calcularNivelLocal).
- [ ] L552/L562 `parseInt(puntos, 10)` -> `parseFloat`.
- [ ] L628-630 `sqlBonoFila` `FLOOR(... * 1.2)` -> `ROUND(...,2)`.
- [ ] L641 `ent(x)` -> `parseFloat` + 2.
- [ ] L675-677/L681/L700/L703/L718-720/L728-730/L758/L761/L765/L782/L784/L787/L823/L866 `::int`/`Math.floor` -> `ROUND(...,2)`.
- [ ] L747-748 `Math.floor(15 * BONO_ORIGEN)` / `Math.floor(50 * BONO_ORIGEN)` -> half-up 2.
- [ ] L1743 `Math.round(xpBase * 1.1)` -> `redondearXp`.
- [ ] L1862 `Math.round(xpGanado * 0.10)` -> `redondearXp`; L1863 `< 1` -> `<= 0`; L1867 x2 redondeado.
- [ ] L1906/L1917 `parseInt(r.xp_bono, 10)` -> `Number` + 2.
- [ ] L1982/L1998 `parseInt(xpGanado, 10)` -> `parseFloat`.
- [ ] L1993 `FLOOR($2 * (CASE ...))` -> `ROUND(...,2)`.
- [ ] L2189/L2190/L2191 ctx `evaluarMisiones` -> `Number`/`parseFloat`.
- [ ] L2287/L2288/L2289 ctx `evaluarLogros` -> `Number`/`parseFloat`.
- [ ] L2961 `parseInt(mpU.xp_total, 10)` -> `Number` + 2.
- [ ] L2972 `parseInt(fama_total, 10)` -> `Number` + 2.
- [ ] L3266/L3274/L3296 `SUM(xp_ganado)::int` -> `ROUND(...,2)`.
- [ ] L3353 `parseInt(pandillaActiva.fama_total, 10)` -> `Number` + 2.
- [ ] L3393 `parseInt(sn.fama, 10)` -> `Number`/`parseFloat`.
- [ ] L4184 `parseInt(inv.xp_total, 10)` -> `Number` + 2.
- [ ] L4373 `parseInt(...xp_total...)` -> `parseFloat`.
- [ ] L5032/L5069 `parseInt(...xp_total...)` (DM) -> `Number`.
- [ ] L5294 `Math.floor(xp_total/100)+1` -> `calcularNivelLocal(xp).nivel` (BUG: formula divergente).
- [ ] L5641 `parseInt(body.nivel)` -> mantener entero; L5642 `parseInt(body.delta_xp)` -> `parseFloat` + `redondearXp`.
- [ ] L5657 `parseInt(axUsr[0].xp_total, 10)` -> `Number`.
- [ ] L5713/L5751 `parseInt(...xp_total...)` -> `parseFloat`.
- [ ] L6099 `parseInt(ccCons[0].precio_xp, 10)` -> `Number` + 2.
- [ ] L6111 `Math.floor(ccPrecioBase * (100 - ccDescPct) / 100)` -> `redondearXp`.
- [ ] L6116/L6148 `parseInt(...xp_total...)` -> `Number`.
- [ ] L6554 `parseInt(body.meta_valor)` -> mantener entero; L6562 `parseInt(body.xp_bono)` -> `parseFloat` + `redondearXp`.
- [ ] L6667-6695 `xpResenaEntregado` redondeado antes del UPDATE L6682.
- [ ] L6779/L6993/L7098 UPDATE `xp_total = xp_total + $1` -> `$1` redondeado.
- [ ] L6900 `Math.round(20 * factorAreaVisita)` -> `redondearXp`.
- [ ] NUEVA rama `tipo=pandilla_ranking` (seccion 3.2).

### `api/admin.js`
- [ ] L58/L74 `parseInt(xp, 10)` -> `parseFloat`; L69 `FLOOR` -> `ROUND(...,2)`.
- [ ] L189/L214 `xp_ganado` -> `Number` + 2.
- [ ] L339-344 `parseInt(body.precio_xp, 10)` + mensaje "entero" -> `parseFloat` + `redondearXp` + mensaje sin "entero".
- [ ] L380-385 idem editar.

### `api/pagina-destino.js`
- [ ] L2595/L2609 espejo cliente `(parseInt(...)||0)+15/+5` -> `parseFloat` + `redondearXp`.

### `usuario-session.js`
- [ ] L30 `parseInt(xpTotal)` -> `parseFloat`.
- [ ] Nuevos helpers `redondearXp` / `fmtXp`.

### Frontend display
- [ ] `index.html` L4166/4209-4227 + `statsU`; `mi-perfil.html` L776/825/834-840;
      `comunidad.html` L487/533/542-547; `admin.html` L7351/L7438-7439/tab Jugadores.
      Todos: `parseFloat` + `fmtXp`.

---

## 5. Verificacion de cierre (Escudo GOLD + smoke)

1. `node --check` de los `api/*.js` tocados + `usuario-session.js`.
2. ASCII-safety: 0 bytes > 127 y 0 backticks en los archivos nuevos/tocados.
3. Balance de `<div>` en `index.html`, `mi-perfil.html`, `comunidad.html`, `admin.html`.
4. Smoke dedicado que cubra: (a) la 021 es idempotente (segunda corrida no-op);
   (b) `ROUND` half-up en referidos/fama/multiplicador/descuento; (c) `ent()` no
   trunca; (d) `casa_ranking` ordena por `xp_total` y trae `miembros_activos`;
   (e) `pandilla_ranking` ordena por `fama_total` y trae `miembros_activos`;
   (f) el JSON del API emite `xp_total` como numero, no como string;
   (g) `album_crear` usa `calcularNivelLocal`.
5. Prueba en Neon: correr la 021 dos veces y confirmar `data_type='numeric'` en las 9.
6. Registrar en `BUGS_HISTORICOS.md` la formula de nivel de `interacciones.js:5294`
   y la guarda `famaBase < 1` de L1863.

---

## 6. Fuera de alcance (backlog)

- Versar `usuarios.activo`, `usuarios.ultimo_acceso` e `interacciones.xp_ganado`
  (deuda patron BUG-021).
- Indices de apoyo para rankings si el volumen crece.
- Recomputo de `pandillas.fama_total` (tarea de datos separada, con respaldo).
- Actualizar `docs/superpowers/specs/README.md` con esta spec (docs-keeper).
