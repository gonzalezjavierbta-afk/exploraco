# PROMPT AUTOSUFICIENTE — ExploraCO TSK-104
# Para: OpenCode / VS Code (Claude en modo agente)
# Generado: 2026-09-15  |  Basado en: PROJECT.md v1.1, BLUEPRINT.md v1.0, TASKS.md, NEXT.md, admin.html real
# INSTRUCCION OBLIGATORIA: Antes de escribir codigo, lee el archivo real del repositorio.
# NO uses este prompt como fuente de verdad para el codigo existente; usalo para el CONTEXTO y las REGLAS.

---

## 0. IDENTIDAD DE ROL

Actuas como Chief Architect y Lead Developer de ExploraCO.
El proyecto es de Javier (Colombia). Javier es PM y aprueba decisiones arquitectonicas.
Toda entrega sigue el AI-DOS v1.2 y las Reglas de Oro ExploraCO v5.

---

## 1. STACK Y RESTRICCIONES ABSOLUTAS (no negociables)

| Restriccion | Valor |
|---|---|
| Hosting | Vercel Hobby — **limite fijo de 8 funciones serverless** |
| Backend | Node.js CommonJS estricto (`require`/`module.exports`). **Prohibido `import`/`export`** |
| DB driver | `@neondatabase/serverless`. **Prohibido `pg`** |
| Auth admin | Header `Authorization: Bearer <ADMIN_SECRET>` (env var `ADMIN_SECRET`; valor dev `exploraco12345`) |
| Charset backend | **ASCII-Safe estricto en `api/*.js`**: cero caracteres > 127, cero tildes/enne, cero emojis directos, **cero backticks `` ` ``**. Usar escapes Unicode simples (`\u00f1`, etc.). Doble escape `\\uXXXX` = BUG. |
| Presupuesto endpoints | **8/8 ya consumidos** — NO crear archivos nuevos en `api/`. Nuevas rutas entran como ramas `?tipo=` dentro de archivos existentes. |
| Frontend | HTML + Vanilla JS puro. **Prohibido React/Vue/cualquier framework**. Interactividad via atributo `onclick` inyectado en el HTML. |
| Iconos | SVG integro. **Prohibidas fuentes de iconos externas** (FontAwesome, etc.) |
| JSONB | Actualizaciones via MERGE (`||` en SQL). **Prohibido reemplazar el objeto entero** (perdida de datos) |
| Migraciones | Aditivas e idempotentes (`IF NOT EXISTS`, constraints con nombre). Nunca DROP en migracion. |
| Escapes HTML | Pasar siempre por `escH()` (admin.html) antes de inyectar en innerHTML. |

---

## 2. MAPA DE ENDPOINTS EXISTENTES (8/8 — no crear mas)

```
api/destinos.js          GET         Listado publico, filtros, modo=mapa, stats (s-maxage=10)
api/usuarios.js          GET/POST    v12: perfil, leaderboard, upsert, referidos, facciones,
                                     email_verificado, JWT HMAC, perfil_publico, casas,
                                     perfil_actualizar — ramas via ?tipo=
api/interacciones.js     GET/POST    v15: resenas, guardados, visitas, XP, Wayfarer, DM,
                                     arbol de clases, cromos, Parches
api/admin-destinos.js    GET/POST/PUT/DELETE  CRUD con Bearer admin
api/publicar-lugar.js    POST        Formulario publico — crea destino status=draft
api/pagina-destino.js    GET         HTML dinamico premium por slug (v9)
api/admin.js             GET/POST    Moderacion, resenas, solicitudes, consumibles, Activos Ocultos
api/utilidades.js        GET         Sitemap, visitas, fotos, diagnostico
```

**Regla**: cualquier funcionalidad nueva entra como rama `?tipo=X` o `?recurso=X` dentro de uno de estos 8 archivos. Elegir el archivo por responsabilidad semantica.

---

## 3. MODELO DE DATOS RELEVANTE PARA ESTA TAREA

### Tabla `destinos` (campos clave para esta tarea)
```sql
id            UUID  PK
slug          TEXT  UNIQUE
nombre        TEXT
categoria_slug TEXT          -- 'sitio' | 'hostal' | 'comida' | 'evento' | 'blog'
ciudad        TEXT           -- NOTA: NO usar 'city' (BUG-007)
status        TEXT           -- 'published' | 'draft' | 'archived'
destacado     BOOLEAN        -- control editorial admin
verificado    BOOLEAN        -- control interno admin (ADR-019); NO se expone en ficha publica
rating        NUMERIC
total_resenas INTEGER
tags          JSONB
creado_en     TIMESTAMPTZ
actualizado_en TIMESTAMPTZ
```

**ADR-019 (verificado en destinos):** `destinos.verificado` es columna booleana real en Neon (ya existia, sin migracion pendiente). Patron identico a `destacado`. `api/admin-destinos.js` ya la gestiona: GET la incluye, INSERT con `Boolean(b.verificado||false)`, UPDATE con guard `b.verificado !== undefined` (permite desmarcar). `api/pagina-destino.js` NO renderiza insignia publica. En `admin.html` vive como checkbox `f-verificado`.

### Tabla `usuarios` (campos relevantes, post-migracion 016)
```sql
id               UUID  PK
email            TEXT  UNIQUE
nombre           TEXT
xp_total         INTEGER
nivel            INTEGER   -- derivado, no persistido en v12
email_verificado BOOLEAN   -- NUEVA en migracion 016
email_token      TEXT
email_token_expira TIMESTAMPTZ
faccion          TEXT  CHECK('exploradores'|'curadores'|'creadores'|'artistas')
referido_por     UUID  self-FK
codigo_referido  VARCHAR(20)
device_hashes    JSONB  NOT NULL DEFAULT '[]'
total_resenas    INTEGER
creado_en        TIMESTAMPTZ
```

**ESTADO DE MIGRACIONES:**
- Migraciones 010-015: aplicadas en Neon (OK)
- Migracion 016 (`usuarios.email_verificado`, tablas Wayfarer, JWT): **PENDIENTE de aplicar en Neon**
- Migraciones 017-018 (arbol, casas, DM): **PENDIENTE de aplicar en Neon**
- Todo el codigo backend ya fue escrito para las migraciones pendientes; el deploy espera las migraciones.

### `api/destinos.js` — respuesta de stats (GET /api/destinos?limit=1)
El campo `d1.stats` retorna:
```json
{
  "ok": true,
  "stats": {
    "destinos": 107,
    "resenas": <int>,
    "rating": <float>,
    "publicados": <int>
  },
  "data": [...]
}
```
**NOTA**: `stats.usuarios` NO existe actualmente en esta respuesta. El dashboard actual (error documentado) usa `st.destinos` para el contador de "Viajeros registrados" (bug: muestra destinos, no usuarios).

### `api/usuarios.js` v12 — ramas GET existentes
```
GET ?tipo=leaderboard          -> { ok, data: [{id, nombre, xp_total, nivel, ...}], total }
GET ?buscar=TEXT&limit=N       -> busqueda admin-only (requiere Bearer)
GET ?id=UUID                   -> perfil owner-aware (PII solo para dueno/admin)
GET ?tipo=perfil_publico&id=X  -> perfil publico ligero sin PII
GET ?tipo=casa_ranking         -> ranking de casas
```

---

## 4. ESTADO ACTUAL DE `admin.html`

- **Tamano:** ~7,400 lineas (referencial, ADR-006: el numero exacto lo da el archivo real)
- **Balance de divs:** mantenido en 0 (debe permanecer asi — verificar antes de entregar)
- **Funcion de edicion:** solo via scripts Python `str.replace()` para cambios en bloques grandes. **Nunca edicion manual masiva**.

### Dashboard actual (`renderDashboard` — lineas ~2330-2455 del archivo real)
La funcion `renderDashboard()` ya hace fetch a:
- `/api/destinos?limit=1` -> `d1.stats` (resenas, rating)
- `/api/destinos?limit=200` -> todos los lugares (para top ciudades, top por resenas)
- `/api/admin?recurso=resenas&limit=5` -> resenas recientes
- `/api/admin?recurso=solicitudes&status=draft&limit=1` -> banner de pendientes

**BUG DOCUMENTADO en el Dashboard actual:**
- `ds-usuarios` (tarjeta "Viajeros registrados") muestra `st.destinos` (numero de destinos publicados), no el total real de usuarios. Es un error de mapeo en la linea `setText('ds-usuarios', st.destinos||total)`.
- `ds-visitas` muestra un placeholder estatico `'📊'` en vez de datos reales.
- NO existe tarjeta de "Items verificados" — es nueva.

### `renderTabla()` — lineas ~2467-2520 del archivo real
Genera filas `<tr>` con:
- Checkbox, nombre+slug, categoria, ciudad, status pill, rating, acciones (editar, ver, destacar, duplicar, eliminar)
- **`p.verificado` existe en el objeto `p`** (viene de Neon via `api/admin-destinos.js`) pero **NO se muestra visualmente** en la fila actual. Es el gap a corregir.

### Variables JS globales relevantes en admin.html
```javascript
var places = [];           // Array local de destinos cargados desde Neon
var ADMIN_SECRET = localStorage.getItem('admin_secret') || 'exploraco12345';
function _adminHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ADMIN_SECRET };
}
function setText(id, val) { var el=document.getElementById(id); if(el) el.textContent=val; }
function setStyle(id, prop, val) { var el=document.getElementById(id); if(el) el.style[prop]=val; }
function escH(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
```

---

## 5. TAREAS A IMPLEMENTAR (TSK-104)

### TAREA A — Verificacion automatica del usuario admin (`api/usuarios.js`)

**Contexto:**
- La cuenta `brsk84@gmail.com` (o nombre `javier`) es la cuenta admin del proyecto.
- La columna `usuarios.email_verificado` existe en codigo pero depende de la migracion 016 (pendiente en Neon).
- Mientras la migracion no se aplique, cualquier `UPDATE` sobre `email_verificado` fallara si la columna no existe.

**Implementacion requerida en `api/usuarios.js`:**

**A1 — Forzado automatico en login/upsert:**
En la rama que maneja el registro/upsert de usuario (POST sin `tipo` o POST `tipo=upsert`), agregar una condicion:
```
SI el email del usuario === 'brsk84@gmail.com' O nombre.toLowerCase() === 'javier'
  ENTONCES forzar email_verificado = true en el UPDATE de Neon
  USAR UPDATE ... SET email_verificado = true WHERE email = $1
  (no depender de la logica general de verificacion por token)
```
El guard debe estar antes del UPDATE general para que prevalezca. Usar `email.toLowerCase() === 'brsk84@gmail.com'` para evitar case sensitivity.

**A2 — Nueva rama POST `tipo=verificar_usuario` (admin-only):**
Agregar dentro de `api/usuarios.js` (bloque POST, nueva rama `tipo=verificar_usuario`):
```
Requiere: Bearer ADMIN_SECRET
Body: { tipo: 'verificar_usuario', usuario_id: UUID, email_verificado: boolean }
Accion: UPDATE usuarios SET email_verificado = $1 WHERE id = $2
Respuesta: { ok: true, usuario_id, email_verificado }
Error 404 si el usuario no existe.
Error 400 si falta usuario_id.
Error 403 si no hay Bearer valido.
```
**CRITICO ASCII-SAFE:** El texto de error para 403 debe ser `'No autorizado'` sin acento (u: `\u00f3` en el string literalmente — recuerda que no puedes usar tildes directas en el archivo .js). Alternativa: usar solo `'Forbidden'` o `'Sin autorizacion'` (sin tilde).

### TAREA B — Diferenciacion visual de destinos verificados en `renderTabla()` (`admin.html`)

**Contexto:**
- `p.verificado` ya existe en el objeto local (viene de Neon).
- La fila `<tr>` en `renderTabla()` no muestra nada visual para verificados.
- El objetivo es resaltar la fila o agregar un badge cuando `p.verificado === true`.

**Implementacion requerida en `renderTabla()` de `admin.html`:**

Localizar el bloque `tb.innerHTML = filtered.map(function(p){` (~L2497 del archivo real).

**Cambio 1 — Estilo de fila condicional:**
Cambiar `'<tr id="tr-'+p.id+'">'` por:
```javascript
'<tr id="tr-'+p.id+'"'+(p.verificado?' style="background:#f0fdf4;border-left:3px solid #22c55e"':'')+' >'
```
(Fondo verde muy suave `#f0fdf4` = verde-50 de Tailwind; borde izquierdo verde `#22c55e`)

**Cambio 2 — Badge en el nombre:**
En la celda del nombre `'<td><div class="dt-name">...'`, agregar el badge DESPUES del nombre:
```javascript
+(p.verificado ? ' <span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:9px;font-weight:700;padding:1px 6px;border-radius:10px;vertical-align:middle;letter-spacing:.3px">VERIF</span>' : '')
```

**Cambio 3 — Filtro de verificados en la barra de filtros (opcional pero recomendado):**
Si la barra de filtros de status ya existe (`sp-pub`, `sp-dft`, etc.), agregar:
```html
<button class="fpill" data-verified="true" onclick="setVerifiedFilter(this,true)">&#10003; Verificados</button>
<button class="fpill on" data-verified="all" onclick="setVerifiedFilter(this,'all')">Todos</button>
```
Y la funcion JS:
```javascript
var currentVerifiedFilter = 'all';
function setVerifiedFilter(el, v) {
  document.querySelectorAll('.fpill[data-verified]').forEach(function(b){ b.classList.remove('on'); });
  el.classList.add('on');
  currentVerifiedFilter = v;
  renderTabla();
}
```
Y agregar la condicion en el `filtered = places.filter(...)`:
```javascript
if(currentVerifiedFilter === true && !p.verificado) return false;
```

### TAREA C — Dashboard con datos reales (`renderDashboard()` en `admin.html`)

**Contexto y bugs documentados:**
- `ds-usuarios` ("Viajeros registrados") actualmente muestra `st.destinos` (INCORRECTO).
- `ds-visitas` muestra placeholder estatico (incompleto).
- No hay tarjeta de "Items Verificados".
- El Dashboard ya tiene la estructura HTML con los IDs:
  `ds-total`, `ds-resenas`, `ds-visitas`, `ds-usuarios` + sus sub-textos y barras.

**Sub-tarea C1 — Corregir tarjeta "Viajeros registrados":**
Reemplazar el bloque que usa `st.destinos` para `ds-usuarios` por una llamada real a `api/usuarios.js`:
```javascript
// AGREGAR este fetch dentro de renderDashboard(), al final del bloque try{}
var rU = await fetch('/api/usuarios?tipo=leaderboard&limit=1', { headers: _adminHeaders() });
var dU = await rU.json();
if (dU.ok && typeof dU.total === 'number') {
  setText('ds-usuarios', dU.total.toLocaleString('es-CO'));
  setText('ds-usuarios-sub', 'viajeros registrados en la plataforma');
  setStyle('ds-usr-bar', 'width', Math.min(100, Math.round(dU.total / 500 * 100)) + '%');
}
```
**NOTA:** Verificar que `GET /api/usuarios?tipo=leaderboard` retorna `{ ok, total, data }`. Si el campo `total` no existe actualmente en la respuesta, debera agregarse en `api/usuarios.js` en el SELECT COUNT(*) correspondiente.

**Sub-tarea C2 — Tarjeta "Visitas (30 dias)":**
Reemplazar el placeholder de `ds-visitas` por:
```javascript
var rV = await fetch('/api/utilidades?tipo=visitas', { headers: _adminHeaders() });
var dV = await rV.json();
if (dV.ok && typeof dV.total === 'number') {
  setText('ds-visitas', dV.total.toLocaleString('es-CO'));
  setText('ds-visitas-sub', 'visitas totales registradas');
  setStyle('ds-vis-bar', 'width', Math.min(100, Math.round(dV.total / 1000 * 100)) + '%');
}
```

**Sub-tarea C3 — Nueva tarjeta "Items Verificados":**
En el HTML del Dashboard, la cuarta tarjeta `stat-card` actualmente tiene el id `ds-usuarios` para "Viajeros". Hay 4 tarjetas en `stats-grid`. Las nuevas serian:
- Tarjeta 1: `ds-total` — Total lugares (ya existe, calculado desde `places` local)
- Tarjeta 2: `ds-resenas` — Resenas totales (ya existe, de `d1.stats`)
- Tarjeta 3: `ds-visitas` — Visitas (corregir con C2)
- Tarjeta 4: `ds-usuarios` — Viajeros registrados (corregir con C1)
- Tarjeta 5 (NUEVA): `ds-verificados` — Items Verificados

**Para agregar la quinta tarjeta**, insertar en `stats-grid` (HTML):
```html
<div class="stat-card">
  <div class="stat-num" id="ds-verificados">&#8212;</div>
  <div class="stat-label">&#205;tems verificados</div>
  <div class="stat-sub" id="ds-verificados-sub">de <span id="ds-verificados-total">0</span> destinos</div>
  <div class="stat-bar"><div class="stat-bar-fill" id="ds-ver-bar" style="width:0%;background:#22c55e"></div></div>
</div>
```
(Nota: `&#205;` = I con acento, `&#8212;` = em dash — usar entidades HTML en el HTML, no caracteres directos en el backend JS)

**JS para la tarjeta C3:**
El conteo de verificados se puede derivar del array local `places` ya cargado:
```javascript
var verificados = places.filter(function(p){ return p.verificado === true; }).length;
setText('ds-verificados', verificados);
setText('ds-verificados-total', places.length);
var pctVer = places.length ? Math.round(verificados / places.length * 100) : 0;
setStyle('ds-ver-bar', 'width', pctVer + '%');
```
Agregar este bloque al inicio de `renderDashboard()`, donde ya se calculan `pub`, `dft`, `total` desde `places`.

**Sub-tarea C4 — Actualizar stats grid CSS:**
El grid actual es `grid-template-columns:repeat(4,1fr)` (~L82 del archivo real). Con 5 tarjetas cambia a:
```css
.stats-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;padding:20px 28px 0}
```
En mobile (media query que ya existe ~L283): cambiar `1fr 1fr` a mantener `1fr 1fr` (las 5 tarjetas se apilan en 2 columnas en mobile — OK).

---

## 6. RESTRICCIONES DE IMPLEMENTACION POR TAREA

### Para `api/usuarios.js` (Tareas A1 y A2):
- **ASCII-Safe**: TODOS los strings del archivo deben ser ASCII puro. Verificar con `grep -P '[^\x00-\x7f]' api/usuarios.js` (debe devolver 0 resultados).
- **Cero backticks**: usar comillas simples o dobles. Verificar con `grep -c '\`' api/usuarios.js` (debe dar 0).
- **CommonJS**: usar `require()`/`module.exports`. El archivo ya existe como v12; agregar las ramas al final del bloque POST existente.
- **Patron de guard de autorizacion** ya existente en el archivo: `if (!auth || auth !== process.env.ADMIN_SECRET) return res.status(403).json({ok:false,error:'Forbidden'})`.

### Para `admin.html` (Tareas B y C):
- **Edicion via Python `str.replace()`**: no editar manualmente bloques grandes.
- **Balance de divs**: verificar antes y despues con el script de BLUEPRINT.md seccion 8.
- **El archivo tiene ~7,400 lineas**: usar referencias de linea aproximadas + contexto de 3 lineas antes/despues para str.replace() sin ambiguedad.
- **Punto de entrada de `renderTabla()`**: buscar `tb.innerHTML = filtered.map(function(p){` para localizar el bloque exacto.
- **Punto de entrada de `renderDashboard()`**: buscar `async function renderDashboard()` y el bloque `var pub   = places.filter`.
- **Punto de entrada de `stats-grid` HTML**: buscar `<div class="stats-grid">` (aparece 1 vez en el HTML).

---

## 7. ESCUDO GOLD — VERIFICACIONES OBLIGATORIAS ANTES DE ENTREGAR

```bash
# 1. Sintaxis del backend
node --check api/usuarios.js

# 2. ASCII-Safety
grep -P '[^\x00-\x7f]' api/usuarios.js   # debe devolver 0 lineas
grep -c '`' api/usuarios.js              # debe devolver 0

# 3. Doble escape (bug conocido)
grep -c '\\\\u' api/usuarios.js          # debe devolver 0

# 4. Balance de divs en admin.html (script Python de BLUEPRINT.md seccion 8)
python3 -c "
with open('admin.html', 'r') as f: t = f.read()
bounds = [('hostal','especifico-comida'), ('comida','especifico-sitio'), ('sitio','especifico-evento')]
for cat, next_id in bounds:
    z = t[t.find('id=\"especifico-'+cat+'\"'):t.find('id=\"'+next_id+'\"')]
    print(f'{cat}: balance={z.count(\"<div\")-z.count(\"</div>\")}')
start = t.find('<div id=\"especifico-evento\"')
end = t.find('<!-- /especifico-evento -->') + len('<!-- /especifico-evento -->')
z = t[start:end]
print(f'evento: balance={z.count(\"<div\")-z.count(\"</div>\")}')
"
# Todos deben dar 0

# 5. Verificar que el stats-grid tiene 5 tarjetas (o las que corresponda)
grep -c 'stat-card' admin.html   # contar tarjetas
```

---

## 8. PROTOCOLO DE ENTREGA (Reglas de Oro v5, punto 9)

Para cada bloque de codigo entregado:
1. **Punto de entrada**: indicar las ultimas 3 lineas del archivo ANTES del cambio.
2. **Bloque completo**: entregar el bloque de codigo mas completo posible para no romper logica interna.
3. **Punto de salida**: indicar las 3 lineas del archivo DESPUES del cambio.
4. **Linea referencial**: indicar el numero de linea aproximado para facilitar la busqueda.

---

## 9. ORDEN DE IMPLEMENTACION RECOMENDADO

1. Leer `api/usuarios.js` real del repositorio (leer L1-50 para version header, luego el bloque POST completo).
2. Implementar A1 (forzado automatico) dentro del upsert existente.
3. Implementar A2 (rama `tipo=verificar_usuario`) como nuevo `else if` en el bloque POST.
4. Verificar Escudo GOLD en `api/usuarios.js`.
5. Leer `admin.html` real — buscar y confirmar lineas de `renderTabla()` y `renderDashboard()`.
6. Implementar B (badge verificado en `renderTabla()`) via `str.replace()` Python.
7. Implementar C1+C2+C3+C4 (dashboard dinamico) via `str.replace()` Python.
8. Verificar balance de divs.
9. Entregar diff completo por archivo con puntos de entrada/salida.

---

## 10. PREGUNTAS OBLIGATORIAS AL CERRAR

Antes de entregar la implementacion final, hacer las preguntas necesarias para completar la tarea de la mejor forma posible, especialmente sobre:

- Confirmar version actual de `api/usuarios.js` (v12 segun docs): ¿el archivo real en el repo tiene el header `// api/usuarios.js v12`?
- ¿La respuesta de `GET /api/usuarios?tipo=leaderboard` ya incluye el campo `total`? Si no, hay que agregarlo en el SELECT COUNT.
- ¿`GET /api/utilidades?tipo=visitas` ya existe y retorna `{ ok, total }`? (Segun BLUEPRINT.md existe como rama de `utilidades.js`).
- ¿Las migraciones 016/017 ya estan aplicadas en Neon o aun pendientes? (Impacta si `email_verificado` existe como columna real).
- ¿Se quiere el filtro de "Verificados" en la barra de filtros del directorio (Tarea B Cambio 3) o solo el badge visual?
- ¿La quinta tarjeta de stats grid (`ds-verificados`) es deseada, o se prefiere mantener 4 tarjetas y reemplazar una existente?
