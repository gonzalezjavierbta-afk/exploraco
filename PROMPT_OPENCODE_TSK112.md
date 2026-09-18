# PROMPT OPENCODE: TSK-112 — SISTEMA DE 3 CASAS, ÁRBOL DE CLASES DINÁMICO Y UI DE PROGRESIÓN (ExploraCO v5)

**Fecha de generación:** 2026-09-17
**Sesión de origen:** ExploraCO_Sistema_Social_v5.md + ExploraCO_Gamificacion_v5_Plan_Maestro.md
**ADR de referencia:** (nuevo, asignar ADR-038 al cerrar)
**Precedente inmediato:** TSK-111 / ADR-037 (api/interacciones.js v20, api/pagina-destino.js v11)
**Estado del working tree:** 7 archivos sin commitear de TSK-107..111 + 5 migraciones pendientes de aplicar en Neon (019..023). **Esta tarea NO se puede deployar hasta que esas migraciones estén aplicadas. Seguir el flujo de deploy único.**

---

## 0. CONTEXTO DE ARQUITECTURA (LEER ANTES DE TOCAR UN SOLO ARCHIVO)

### Restricciones no negociables (Reglas de Oro v5 + ADRs vigentes)

1. **ASCII-Safe obligatorio en api/*.js:** Cero caracteres >127, cero tildes directas, cero "ñ" directa, cero backticks, cero emojis directos. Usar SOLO escapes Unicode simples (\u00f1, \u00e9, etc.). El doble escape (\\uXXXX) es BUG-002.
2. **CommonJS estricto:** `require` / `module.exports`. Prohibido `import` / `export`.
3. **Sin frameworks frontend:** Vanilla JS puro. HTML generado por concatenación de strings server-side.
4. **Presupuesto de endpoints 8/8 FIJO (ADR-001/ADR-010):** NO crear archivos nuevos en api/. Toda funcionalidad nueva entra como rama query param en archivos existentes: `usuarios.js` o `interacciones.js`.
5. **Merge JSONB, nunca reemplazo (ADR-003):** Usar operador `||` en UPDATE. Cero borrado lógico de IDs.
6. **Baseline = archivo real (ADR-006):** ANTES de editar cualquier archivo, solicitarlo a Javier. No asumir número de líneas ni contenido basado en este prompt.
7. **SQL versionado e idempotente (ADR-008):** Toda migración va en `db/migrations/024_*.sql` con `IF NOT EXISTS` / `IF EXISTS`. Numeración consecutiva tras la 023.
8. **Driver Neon:** `@neondatabase/serverless`. Prohibido `pg`.
9. **Iconografía SVG íntegra:** Prohibidas fuentes de iconos externas.
10. **onclick físico en HTML:** Elementos interactivos requieren `onclick` inyectado en el HTML generado por el servidor.
11. **Entrega quirúrgica:** Indicar punto de entrada (3 líneas antes del cambio) y punto de salida (3 líneas después). Segmentos lo más completos posible.
12. **Al finalizar:** hacer las preguntas necesarias para completar la tarea de la mejor forma posible.

### Estado de versiones reales (HOY, 2026-09-17)

| Archivo | Versión header real |
|---|---|
| api/interacciones.js | v20 (TSK-111) |
| api/usuarios.js | v15 (ADR-035) |
| api/pagina-destino.js | v11 (TSK-111) |
| api/admin.js | v2 (TSK-103) |
| api/admin-destinos.js | v2 |
| api/destinos.js | — |
| api/utilidades.js | v2 |
| api/publicar-lugar.js | — |

### Columnas relevantes en `usuarios` (YA existentes, no recrear)

```
id, email, nombre, xp_total (numeric(12,2) post-021), nivel, badge_actual,
total_resenas, creado_en,
referido_por, codigo_referido, xp_ref_total, referidos_directos_contados,
faccion (CHECK: exploradores/curadores/creadores/artistas),
faccion_elegida_en, email_verificado, email_token, email_token_expira,
device_hashes (jsonb)
```

**ATENCIÓN:** La migración 021 cambia XP a `numeric(12,2)`. Usar `red2()` (helper ya definido en interacciones.js v18+) para redondear. Sin `::int` en sumas de XP.

---

## 1. ALCANCE DE ESTA TAREA (TSK-112)

### 1.1 Base de datos — `db/migrations/024_tres_casas_y_clases.sql`

Crear un único archivo SQL idempotente (ADR-008, ASCII-safe, sin caracteres >127):

```sql
-- 024_tres_casas_y_clases.sql
-- Idempotente: se puede correr N veces sin efecto secundario.

-- A. Nuevas columnas en usuarios (si no existen)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS casa_id     VARCHAR(20)
    CHECK (casa_id IN ('alta', 'media', 'baja')),
  ADD COLUMN IF NOT EXISTS clase_id    VARCHAR(20)
    CHECK (clase_id IN ('cartografo', 'cronista', 'explorador')),
  ADD COLUMN IF NOT EXISTS nivel_clase INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS xp_clase    NUMERIC(12,2) DEFAULT 0;

-- B. Tabla casas_tributacion
CREATE TABLE IF NOT EXISTS casas_tributacion (
  casa_id          VARCHAR(20) PRIMARY KEY
    CHECK (casa_id IN ('alta', 'media', 'baja')),
  xp_cofre_total   NUMERIC(12,2) NOT NULL DEFAULT 0,
  poblacion_activa INT NOT NULL DEFAULT 0,
  factor_conversion NUMERIC(5,4) NOT NULL DEFAULT 1.0
);

-- Seed inicial de las 3 casas (idempotente con ON CONFLICT)
INSERT INTO casas_tributacion (casa_id) VALUES ('alta'),('media'),('baja')
ON CONFLICT (casa_id) DO NOTHING;

-- C. Tabla casas_votaciones
CREATE TABLE IF NOT EXISTS casas_votaciones (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casa_id              VARCHAR(20) NOT NULL
    REFERENCES casas_tributacion(casa_id),
  titulo               TEXT NOT NULL,
  porcentaje_reparto   INT NOT NULL CHECK (porcentaje_reparto BETWEEN 0 AND 100),
  usuarios_beneficiados INT NOT NULL DEFAULT 0,
  completada           BOOLEAN NOT NULL DEFAULT false,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- D. Indice para ranking de casas
CREATE INDEX IF NOT EXISTS idx_usuarios_casa_id ON usuarios(casa_id)
  WHERE casa_id IS NOT NULL;
```

**Preflight antes de aplicar (ejecutar en Neon, read-only):**
```sql
SELECT column_name FROM information_schema.columns
  WHERE table_name='usuarios'
  AND column_name IN ('casa_id','clase_id','nivel_clase','xp_clase');
-- Debe retornar 0 filas (columnas aún no existen)
```

---

### 1.2 Backend — `api/usuarios.js` (bump a v16)

Añadir las siguientes ramas dentro de `api/usuarios.js`. **NO crear archivo nuevo.**
Solicitar a Javier el archivo real antes de editar.

#### Rama GET `?tipo=casa_ranking`

Ya existe en v15 pero retorna `miembros_activos` y `xp_total`. Actualizar para incluir los nuevos campos:

```javascript
// PUNTO DE ENTRADA: buscar la línea que contiene "casa_ranking" en el GET handler
// (aprox. L510-557 según ADR-035/header v15)
// CAMBIO: agregar poblacion_activa, factor_conversion y xp_cofre_total desde casas_tributacion

if (tipo === 'casa_ranking') {
  var casas = await sql(
    'SELECT u.casa_id, COUNT(*) AS miembros_activos, ' +
    'COALESCE(SUM(u.xp_total),0) AS xp_total, ' +
    'ct.xp_cofre_total, ct.factor_conversion ' +
    'FROM usuarios u ' +
    'LEFT JOIN casas_tributacion ct ON ct.casa_id = u.casa_id ' +
    'WHERE u.casa_id IS NOT NULL ' +
    'GROUP BY u.casa_id, ct.xp_cofre_total, ct.factor_conversion ' +
    'ORDER BY xp_total DESC'
  );
  // Calcular factor de nivelacion en runtime
  var total_miembros = casas.reduce(function(acc, c) {
    return acc + parseInt(c.miembros_activos || 0);
  }, 0);
  var resultado = casas.map(function(c) {
    var pct = total_miembros > 0
      ? parseInt(c.miembros_activos) / total_miembros
      : 0;
    var es_mayor = pct > 0.45;
    var es_menor = pct < 0.25;
    return {
      casa_id: c.casa_id,
      miembros_activos: parseInt(c.miembros_activos),
      xp_total: parseFloat(c.xp_total),
      xp_cofre_total: parseFloat(c.xp_cofre_total || 0),
      factor_conversion: parseFloat(c.factor_conversion || 1),
      tag: es_mayor ? 'dominante' : (es_menor ? 'rezagada' : 'equilibrada'),
      multiplicador_xp: es_menor ? 1.30 : (es_mayor ? 0.85 : 1.0),
      arancel_inter_casa: es_menor ? 0.05 : (es_mayor ? 0.25 : 0.10),
      fee_mercado_interno: es_menor ? 0.00 : (es_mayor ? 0.02 : 0.05)
    };
  });
  return res.status(200).json({ ok: true, casas: resultado });
}
```

#### Rama POST `?tipo=casa_elegir`

```javascript
// PUNTO DE ENTRADA: después del bloque POST casa_elegir existente (si ya existe en v15, REEMPLAZAR)
// Si no existe aún, agregar en el router POST antes del catch final

if (tipo === 'casa_elegir') {
  var sesion = validarSesion(req);
  if (!sesion) return res.status(401).json({ error: 'SIN_SESION' });
  var casa = (body.casa_id || '').toLowerCase();
  if (!['alta','media','baja'].includes(casa)) {
    return res.status(400).json({ error: 'CASA_INVALIDA' });
  }
  // Solo se puede elegir una vez (o cambiar pasadas 30 días — opcional v1)
  var actual = await sql(
    'SELECT casa_id FROM usuarios WHERE id=$1::uuid', [sesion.id]
  );
  if (actual.length && actual[0].casa_id) {
    return res.status(409).json({ error: 'CASA_YA_ELEGIDA', casa_actual: actual[0].casa_id });
  }
  await sql(
    'UPDATE usuarios SET casa_id=$2 WHERE id=$1::uuid', [sesion.id, casa]
  );
  // Actualizar poblacion_activa en casas_tributacion
  await sql(
    'UPDATE casas_tributacion SET poblacion_activa = ' +
    '(SELECT COUNT(*) FROM usuarios WHERE casa_id=$1) WHERE casa_id=$1',
    [casa]
  );
  return res.status(200).json({ ok: true, casa_id: casa });
}
```

#### Rama POST `?tipo=clase_elegir`

```javascript
if (tipo === 'clase_elegir') {
  var sesion = validarSesion(req);
  if (!sesion) return res.status(401).json({ error: 'SIN_SESION' });
  var clase = (body.clase_id || '').toLowerCase();
  if (!['cartografo','cronista','explorador'].includes(clase)) {
    return res.status(400).json({ error: 'CLASE_INVALIDA' });
  }
  await sql(
    'UPDATE usuarios SET clase_id=$2, nivel_clase=1, xp_clase=0 WHERE id=$1::uuid',
    [sesion.id, clase]
  );
  return res.status(200).json({ ok: true, clase_id: clase });
}
```

#### Rama POST `?tipo=casa_tributar` (llamada interna desde interacciones.js)

```javascript
// Este endpoint es llamado internamente por interacciones.js al entregar XP.
// Puede también exponerse como POST externo para futuros usos.
if (tipo === 'casa_tributar') {
  var sesion = validarSesion(req);
  if (!sesion) return res.status(401).json({ error: 'SIN_SESION' });
  var xp_accion = parseFloat(body.xp_accion || 0);
  if (xp_accion <= 0) return res.status(400).json({ error: 'XP_INVALIDA' });
  // 10% del XP generado va al cofre de la Casa
  var tributo = red2(xp_accion * 0.10);
  var usuario = await sql(
    'SELECT casa_id FROM usuarios WHERE id=$1::uuid', [sesion.id]
  );
  if (!usuario.length || !usuario[0].casa_id) {
    return res.status(200).json({ ok: true, tributo: 0, motivo: 'sin_casa' });
  }
  await sql(
    'UPDATE casas_tributacion SET xp_cofre_total = xp_cofre_total + $2 WHERE casa_id = $1',
    [usuario[0].casa_id, tributo]
  );
  return res.status(200).json({ ok: true, tributo: tributo, casa_id: usuario[0].casa_id });
}
```

**Header a actualizar (bump de v15 a v16):**
```javascript
// api/usuarios.js  v16
// TSK-112 (v16): casa_elegir, clase_elegir, casa_tributar, casa_ranking actualizado con factor nivelacion
```

---

### 1.3 Backend — `api/interacciones.js` (bump a v21)

#### A. Modificar la entrega de XP con Rising Star + factor de Casa

Localizar el helper que entrega XP (aproximadamente la función `entregarXp` o el bloque inline de UPDATE xp_total). Envolver con el multiplicador de clase y factor de Casa:

```javascript
// HELPER NUEVO: calcular XP final con clase y casa
// Colocar ANTES de la primera función que llama al UPDATE de xp_total
// (buscar "xp_ganado" o "xp_total" en el primer UPDATE de tipo=resena/foto/visita)

function calcularXpFinal(xp_base, nivel_clase, clase_id, casa_tag) {
  // Bonus por clase (Rising Star)
  var bonus_clase = { cartografo: 0.08, cronista: 0.10, explorador: 0.07 };
  var bonus = bonus_clase[clase_id] || 0;
  var xp_clase = xp_base * (1 + (nivel_clase * bonus));
  // Factor de Casa
  var factor_casa = (casa_tag === 'rezagada') ? 1.30
    : (casa_tag === 'dominante') ? 0.85 : 1.0;
  return red2(xp_clase * factor_casa);
}
```

**IMPORTANTE:** Para aplicar `calcularXpFinal`, en cada punto de entrega de XP (resena, foto, visita, activo_oculto) se debe:
1. Hacer un SELECT previo de `clase_id, nivel_clase, casa_id` del usuario.
2. Consultar `casa_ranking` para obtener el `tag` de su Casa.
3. Pasar los valores a `calcularXpFinal`.

Dado el costo de la consulta extra, usar un SELECT JOIN único:

```javascript
// SELECT de contexto de XP (usar en resena, foto, visita, activo_oculto ANTES del UPDATE)
// Sustituir el SELECT de usuario existente por este JOIN:
var ctx_xp = await sql(
  'SELECT u.clase_id, u.nivel_clase, u.casa_id, u.xp_total, ' +
  'ct.factor_conversion, ' +
  '(SELECT COUNT(*) FROM usuarios WHERE casa_id = u.casa_id) AS miembros_casa, ' +
  '(SELECT COUNT(*) FROM usuarios WHERE casa_id IS NOT NULL) AS total_miembros ' +
  'FROM usuarios u ' +
  'LEFT JOIN casas_tributacion ct ON ct.casa_id = u.casa_id ' +
  'WHERE u.id = $1::uuid',
  [usuario_id]
);
var ctx = ctx_xp[0] || {};
var pct_casa = ctx.total_miembros > 0
  ? parseInt(ctx.miembros_casa) / parseInt(ctx.total_miembros) : 0;
var casa_tag = pct_casa > 0.45 ? 'dominante' : (pct_casa < 0.25 ? 'rezagada' : 'equilibrada');
var xp_final = calcularXpFinal(XP_BASE, parseInt(ctx.nivel_clase || 1), ctx.clase_id || '', casa_tag);
```

#### B. Tributación automática al cofre de Casa

Inmediatamente después de cada `UPDATE usuarios SET xp_total = xp_total + $xp_final`, agregar:

```javascript
// Tributación: 10% al cofre de la Casa (best-effort, no bloquea el XP del usuario)
if (ctx.casa_id) {
  var tributo = red2(xp_final * 0.10);
  try {
    await sql(
      'UPDATE casas_tributacion SET xp_cofre_total = xp_cofre_total + $1 WHERE casa_id = $2',
      [tributo, ctx.casa_id]
    );
  } catch(e) {
    console.error('[casa_tributar] error best-effort:', e.message);
  }
}
```

#### C. Nivel de Clase: subida automática

Agregar lógica de subida de nivel de clase al registrar XP de clase:

```javascript
// Tabla de umbrales de XP por nivel de clase (1..10 simplificado)
var XP_NIVEL_CLASE = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500];

function calcularNivelClase(xp_clase_total) {
  var nivel = 1;
  for (var i = 1; i < XP_NIVEL_CLASE.length; i++) {
    if (xp_clase_total >= XP_NIVEL_CLASE[i]) nivel = i + 1;
    else break;
  }
  return Math.min(nivel, 10);
}

// Después de entregar XP de clase (tipo foto/resena/visita/activo_oculto con clase_id):
// var xp_de_clase = red2(xp_final * 0.5); // 50% del XP final va también a la clase
// await sql('UPDATE usuarios SET xp_clase = xp_clase + $1, nivel_clase = $2 WHERE id=$3::uuid',
//   [xp_de_clase, calcularNivelClase(parseFloat(ctx.xp_clase||0) + xp_de_clase), sesion.id]);
```

**Header a actualizar (bump de v20 a v21):**
```javascript
// api/interacciones.js  v21
// TSK-112 (v21): calcularXpFinal (Rising Star + factor Casa), tributacion automatica, nivel_clase
```

---

### 1.4 Frontend — `mi-perfil.html` (tab "Clase" existente + sección "Mi Casa")

**ANTES de editar:** solicitar `mi-perfil.html` a Javier (ADR-006).

Localizar el tab `clase` (ya existe desde TSK-109/ADR-035, aprox. L101 del mi-perfil post-v15).

#### A. Sección "Mi Casa" compacta en el tab `clase`

Añadir después del bloque de árbol de especialización:

```html
<!-- [PUNTO DE ENTRADA: dentro del tab clase, después del bloque #arbol-clase o similar] -->
<section id="sec-mi-casa" style="margin-top:1.5rem">
  <h3 style="font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;margin-bottom:.5rem">
    Mi Casa
  </h3>
  <div id="mi-casa-card" style="border:1px solid var(--border,#e2e8f0);border-radius:.75rem;padding:1rem">
    <p id="mi-casa-nombre" style="font-family:'Geist',monospace;font-size:1.1rem;font-weight:900">
      Sin Casa
    </p>
    <p id="mi-casa-tag" style="font-size:.85rem;color:var(--muted,#64748b)">—</p>
    <p id="mi-casa-multiplicador" style="font-size:.85rem">Multiplicador XP: <strong>x1.0</strong></p>
    <button onclick="window.elegirCasa && window.elegirCasa()"
      id="btn-elegir-casa"
      style="margin-top:.75rem;padding:.5rem 1rem;border-radius:.5rem;
             background:var(--accent,#6366f1);color:#fff;border:none;cursor:pointer;
             font-family:'Barlow Condensed',sans-serif">
      Elegir Casa
    </button>
  </div>
</section>
<!-- [PUNTO DE SALIDA: después de #sec-mi-casa, antes del cierre del tab clase] -->
```

#### B. Modal de selección de Casa

```html
<!-- [PUNTO DE ENTRADA: antes del cierre </body> de mi-perfil.html] -->
<div id="modal-elegir-casa" style="display:none;position:fixed;inset:0;
  background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:1rem;padding:2rem;max-width:420px;width:90%">
    <h2 style="font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;margin-bottom:1rem">
      Elige tu Casa
    </h2>
    <p style="font-size:.9rem;color:#555;margin-bottom:1.25rem">
      Tu afiliaci\u00f3n socio-pol\u00edtica en ExploraCO. No podr\u00e1s cambiarla despu\u00e9s.
    </p>
    <div style="display:grid;gap:.75rem">
      <button onclick="window.confirmarCasa('alta')"
        style="padding:.75rem;border-radius:.5rem;border:1px solid #e2e8f0;
               font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;cursor:pointer">
        🏔️ Casa Alta — Mayor influencia
      </button>
      <button onclick="window.confirmarCasa('media')"
        style="padding:.75rem;border-radius:.5rem;border:1px solid #e2e8f0;
               font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;cursor:pointer">
        ⚖️ Casa Media — Balance garantizado
      </button>
      <button onclick="window.confirmarCasa('baja')"
        style="padding:.75rem;border-radius:.5rem;border:1px solid #e2e8f0;
               font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;cursor:pointer">
        🌱 Casa Baja — Catch-Up +30% XP
      </button>
    </div>
    <button onclick="document.getElementById('modal-elegir-casa').style.display='none'"
      style="margin-top:1rem;width:100%;padding:.5rem;background:transparent;
             border:none;color:#999;cursor:pointer">Cancelar</button>
  </div>
</div>
<!-- [PUNTO DE SALIDA: antes del cierre </body>] -->
```

#### C. Lógica JS inline (al final de mi-perfil.html, dentro del bloque `<script>` existente)

```javascript
// [PUNTO DE ENTRADA: dentro del bloque <script> al final de mi-perfil.html]
// [Buscar el último bloque <script> del archivo y agregar estas funciones ANTES del cierre </script>]

window.elegirCasa = function() {
  var modal = document.getElementById('modal-elegir-casa');
  if (modal) { modal.style.display = 'flex'; }
};

window.confirmarCasa = function(casa_id) {
  var sesion = window.ExploraCO && window.ExploraCO.sesion;
  if (!sesion || !sesion.token) {
    alert('Debes iniciar sesi\u00f3n para elegir una Casa.');
    return;
  }
  fetch('/api/usuarios?tipo=casa_elegir', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sesion.token
    },
    body: JSON.stringify({ casa_id: casa_id })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.ok) {
      document.getElementById('mi-casa-nombre').textContent =
        casa_id.charAt(0).toUpperCase() + casa_id.slice(1);
      document.getElementById('btn-elegir-casa').style.display = 'none';
      document.getElementById('modal-elegir-casa').style.display = 'none';
    } else if (d.error === 'CASA_YA_ELEGIDA') {
      alert('Ya perteneces a Casa ' + d.casa_actual + '.');
      document.getElementById('modal-elegir-casa').style.display = 'none';
    } else {
      alert('Error: ' + (d.error || 'desconocido'));
    }
  })
  .catch(function(e) { console.error('[elegirCasa]', e); });
};

// Cargar el estado de Casa al iniciar el tab
function cargarEstadoCasa() {
  fetch('/api/usuarios?tipo=casa_ranking')
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (!d.casas) return;
    var sesion = window.ExploraCO && window.ExploraCO.sesion;
    if (!sesion || !sesion.casa_id) return;
    var mi_casa = d.casas.find(function(c) { return c.casa_id === sesion.casa_id; });
    if (!mi_casa) return;
    var el_nombre = document.getElementById('mi-casa-nombre');
    var el_tag = document.getElementById('mi-casa-tag');
    var el_mult = document.getElementById('mi-casa-multiplicador');
    if (el_nombre) el_nombre.textContent = 'Casa ' +
      mi_casa.casa_id.charAt(0).toUpperCase() + mi_casa.casa_id.slice(1);
    if (el_tag) el_tag.textContent = mi_casa.tag + ' · ' + mi_casa.miembros_activos + ' miembros';
    if (el_mult) el_mult.innerHTML = 'Multiplicador XP: <strong>x' +
      mi_casa.multiplicador_xp.toFixed(2) + '</strong>';
    var btn = document.getElementById('btn-elegir-casa');
    if (btn) btn.style.display = 'none';
  })
  .catch(function(e) { console.error('[cargarEstadoCasa]', e); });
}
// Llamar al cargar la página si el tab clase ya está activo
if (document.getElementById('sec-mi-casa')) { cargarEstadoCasa(); }
// [PUNTO DE SALIDA: antes del cierre </script>]
```

---

### 1.5 Frontend — `comunidad.html` (sub-vista Casas en tab Ranking)

El tab Ranking con sub-vistas Viajeros|Casas|Facciones|Parches ya existe desde TSK-109.
**Buscar** la sub-vista `Casas` (buscar `setRankingVista('casas')` o similar) y actualizar su render para mostrar los nuevos campos (`multiplicador_xp`, `xp_cofre_total`, `tag`):

```javascript
// [PUNTO DE ENTRADA: dentro de la función que renderiza la sub-vista 'casas' en comunidad.html]
// Buscar el bloque que hace fetch de /api/usuarios?tipo=casa_ranking
// y reemplazar el renderizado del card con:

function renderCasaCard(casa) {
  var etiqueta = { dominante: '⚔️ Dominante', equilibrada: '⚖️ Equilibrada', rezagada: '🌱 Catch-Up' };
  var colores = { dominante: '#ef4444', equilibrada: '#6366f1', rezagada: '#22c55e' };
  return '<div style="border:1px solid #e2e8f0;border-radius:.75rem;padding:1rem;margin-bottom:.75rem">' +
    '<div style="display:flex;justify-content:space-between;align-items:center">' +
    '<strong style="font-family:\'Barlow Condensed\',sans-serif;font-size:1.2rem">' +
    'Casa ' + casa.casa_id.charAt(0).toUpperCase() + casa.casa_id.slice(1) + '</strong>' +
    '<span style="background:' + (colores[casa.tag]||'#6366f1') + ';color:#fff;' +
    'border-radius:9999px;padding:.2rem .75rem;font-size:.8rem">' +
    (etiqueta[casa.tag]||casa.tag) + '</span></div>' +
    '<p style="font-family:\'Geist\',monospace;font-size:1.5rem;font-weight:900;margin:.5rem 0">' +
    parseFloat(casa.xp_total).toFixed(0) + ' XP</p>' +
    '<p style="font-size:.85rem;color:#64748b">' + casa.miembros_activos + ' miembros activos · ' +
    'Cofre: ' + parseFloat(casa.xp_cofre_total).toFixed(0) + ' XP · ' +
    'Mult. XP: x' + parseFloat(casa.multiplicador_xp).toFixed(2) + '</p>' +
    '</div>';
}
// [PUNTO DE SALIDA: después de la función renderCasaCard, antes del cierre del bloque de Ranking]
```

---

## 2. VERIFICACIÓN OBLIGATORIA (Escudo GOLD)

Antes de entregar, ejecutar:

```bash
# 1. Sintaxis
node --check api/usuarios.js
node --check api/interacciones.js

# 2. ASCII-Safety (deben retornar 0 resultados)
python3 -c "
import sys
files = ['api/usuarios.js', 'api/interacciones.js']
for f in files:
    with open(f,'rb') as fh:
        raw = fh.read()
    print(f, 'no-ASCII:', len([b for b in raw if b > 127]))
    print(f, 'doble-escape:', raw.count(b'\\\\\\\\u'))
    print(f, 'backticks:', raw.count(b'\`'))
"

# 3. Preflight migración 024 (Neon, read-only — lo ejecuta Javier)
# SELECT column_name FROM information_schema.columns
#   WHERE table_name='usuarios'
#   AND column_name IN ('casa_id','clase_id','nivel_clase','xp_clase');

# 4. Balance de DIVs admin.html (si se tocó)
python3 -c "
with open('admin.html','r') as f: t = f.read()
bounds = [('hostal','especifico-comida'),('comida','especifico-sitio'),('sitio','especifico-evento')]
for cat, nxt in bounds:
    z = t[t.find('id=\"especifico-'+cat+'\"'):t.find('id=\"'+nxt+'\"')]
    print(cat,'balance=',z.count('<div')-z.count('</div>'))
start = t.find('<div id=\"especifico-evento\"')
end = t.find('<!-- /especifico-evento -->') + len('<!-- /especifico-evento -->')
z = t[start:end]
print('evento balance=',z.count('<div')-z.count('</div>'))
"
```

**Criterio de aceptación:**
- `node --check` pasa limpio en los 2 archivos de api.
- ASCII check: 0 bytes >127, 0 doble-escapes, 0 backticks en api/*.js modificados.
- Balance DIVs = 0 en las 4 categorías de admin.html (si se modificó).
- La migración 024 es idempotente (se puede aplicar dos veces sin error).

---

## 3. ORDEN DE ENTREGA

1. **Primero:** `db/migrations/024_tres_casas_y_clases.sql` (solo SQL, sin tocar código).
2. **Segundo:** `api/usuarios.js` (bump v16) — solo las ramas nuevas y el `casa_ranking` actualizado.
3. **Tercero:** `api/interacciones.js` (bump v21) — solo `calcularXpFinal`, el SELECT JOIN de contexto XP y la tributación best-effort.
4. **Cuarto:** `mi-perfil.html` — sección Mi Casa + modal + JS inline.
5. **Quinto:** `comunidad.html` — `renderCasaCard` actualizado.

**Cada entrega debe indicar:**
- Número de línea aproximado de inserción (referencial, ADR-006).
- 3 líneas antes del cambio (punto de entrada).
- 3 líneas después del cambio (punto de salida).

---

## 4. FUERA DE ALCANCE DE TSK-112

- Sistema de Votación de Cofre (casas_votaciones → POST `casa_votar`): alcance v2.
- Modales de expansión de nivel (#modal-desglose-nivel, #modal-detalle-mision): tarea separada TSK-113.
- Árbol completo de nodos de clase con UI interactiva: TSK-114.
- Mercado interno de Casas con tarifas: TSK-115.
- Sistema de Parches (pandillas) inter-Casa: existe base en `api/interacciones.js v20` (`pandilla_ranking`); la afilición de Parche a Casa es TSK-116.
- Clases Rising Star completo en UI de `mi-perfil.html` tab Clase: ya existe el árbol de TSK-109; esta tarea solo extiende la lógica de XP en backend.

---

## 5. PENDIENTES OPERATIVOS PRE-DEPLOY (los ejecuta Javier)

1. Aplicar en Neon las migraciones **019, 020, 021, 022, 023** (arrastre de TSK-107..111, pendientes).
2. Aplicar `db/migrations/024_tres_casas_y_clases.sql` (esta tarea).
3. Deploy del backend (usuarios.js v16 + interacciones.js v21).
4. Deploy del frontend (mi-perfil.html + comunidad.html).
5. Verificación en vivo: elegir una Casa, verificar el multiplicador XP en el ranking, confirmar que el cofre recibe tributos.

---

**Hacer las preguntas necesarias para completar la tarea de la mejor forma posible.**
