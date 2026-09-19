# PROMPT MAESTRO — ExploraCO: Comunicación, Casas y Admin Mapa
## Versión: v1.0 · Migración 019 · Módulos: Comunicación + Casas + Admin

---

## PARTE A — PROMPT PARA LA GEMMA DE GEMINI (Arquitecto Orquestador)

```
================================================================================
ROL: Arquitecto de Software & Orquestador de Agentes (OpenCode Specialist)
PROYECTO: ExploraCO — Plataforma turística y de gamificación, Colombia
ARQUITECTURA: Vanilla JS · Node.js Serverless (CommonJS, ASCII-Safe estricto) · Neon PostgreSQL · Vercel Hobby
================================================================================

SESIÓN: Implementar Módulo de Comunicación v5, Mejoras Admin Mapa y Sistema de Casas Ampliado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTADO ACTUAL DEL SISTEMA (contexto crítico para no reescribir lo que existe)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SISTEMA DE NIVELES (en usuario-session.js, fuente de verdad):
- XP_LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5200, 6800, 8500, 10500, 13000, 16000, 19500, 24000, 30000]
- MAX_NIVEL = 20
- calcularNivel(xpTotal) ya existe como función pública en window.ExploraCO.calcularNivel
- CAPACIDADES_POR_NIVEL ya existe: { 6:'crear_planes', 7:'emojis_premium', 10:'sello_sala', 11:'organizar_actividad', 14:'fundar_pandilla', 15:'moderar_galerias', 16:'cromo_dorado', 17:'mariscal_parche', 19:'inmortal' }
- mostrarToast(msg, color) ya existe en window.ExploraCO.mostrarToast
- NO existe modal de nivel-up ni función getEra()

SISTEMA DE CASAS (existente):
- Casas válidas (enum en check de BD): ['condor', 'jaguar', 'delfin']
- usuarios.casa = string con el nombre de la casa
- casas_cofre: tabla con columnas xp_cofre_total, factor_conversion, poblacion_activa, actualizado_en, WHERE casa = 'condor'|'jaguar'|'delfin'
- Tributo actual: HARDCODEADO al 10% en acreditarClaseYCofre() línea 338 de interacciones.js
- NO existe: lider_user_id en casas_cofre, tributo_pct configurable, roles de Casa, misiones conjuntas

SISTEMA DE CHAT (existente en interacciones.js + comunidad.html):
- Tabla chat_salas: columnas nombre, icono, descripcion, tipo, orden, creador_id (+ clave_dm)
- Tipos existentes: 'viajeros', 'plan', 'dm'
- NO existe tipo 'oficial'
- GET tipo=chat_salas filtra tipo != 'plan' para el listado público
- POST tipo2=chat_sala crea salas tipo='viajeros'
- comunidad.html: fetch('/api/interacciones?tipo=chat_salas') → renderiza lista de salas con div.chat-room
- NO existe canal oficial broadcast ni restricción de escritura por tipo de sala

MAPA ADMIN (existente en admin.html):
- Usa Leaflet 1.9.4 (ya cargado)
- MapPicker es un módulo externo (map-picker.js, script separado)
- Modal del mapa: id="map-picker-modal", contenedor: id="map-picker-el" con height:380px
- Mini-map inline: id="esb-mini-map" con height:160px
- Radio de geocerca: input id="f-radio-m" (columna radio_m en destinos)
- NO existe: círculo vectorial L.circle sobre el mapa picker, ni aumento de altura del modal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUERIMIENTOS DE ESTA SESIÓN (4 módulos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MÓDULO 1 — MODAL DE NIVEL-UP CON DETALLE DE CAPACIDADES
Archivo: usuario-session.js (frontend, no va al backend)
Objetivo: Cuando el usuario gana XP y sube de nivel, mostrar un modal informativo rico en vez del toast simple actual.
Lógica:
  - Detectar subida de nivel DENTRO de aplicarResultadoXp(data): comparar calcularNivel(xp_anterior) vs calcularNivel(xp_nuevo)
  - Si sube de nivel → llamar mostrarModalNivelUp(nivelAnterior, nivelNuevo)
  - Modal debe mostrar: nivel alcanzado + badge/título oficial + lista de capacidades desbloqueadas en esa subida + pro-tips para el siguiente nivel
  - Botón "Ampliar Info" en el modal que cierra el modal y abre el panel de perfil/progresión
  - El modal es DOM puro inyectado por JS (no existe en HTML), debe auto-limpiarse al cerrar
  - MAPA DE TÍTULOS POR NIVEL (a crear): nivel 1=Viajero Novato, 2=Explorador, 3=Aventurero, 4=Descubridor, 5=Cartógrafo, 6=Cronista, 7=Guía Local, 8=Embajador, 9=Maestro Viajero, 10=Leyenda Urbana, etc. hasta 20
  - ASCII-Safe: el archivo usa solo escapes \uXXXX para tildes y ñ

MÓDULO 2 — SISTEMA DE ERAS (función pura, sin BD)
Archivo: usuario-session.js
Objetivo: Función getEra(nivel) que devuelve la era del usuario y modal de cambio de era.
Definición de eras:
  - Mundana: niveles 1-5
  - Patrocinada: niveles 6-10
  - Organizador: niveles 11-15
  - Leyenda: niveles 16-20
Lógica:
  - Detectar cambio de era dentro del mismo punto donde se detecta nivel-up
  - Si cambió de era → después del modal de nivel-up (con setTimeout 2500ms), mostrar mostrarModalCambioEra(eraAnterior, eraNueva)
  - Modal de era: pantalla completa semi-transparente, título de nueva era, descripción de beneficios de la era, lista de mecánicas exclusivas (datos hardcodeados por era)
  - ASCII-Safe obligatorio

MÓDULO 3 — CANAL OFICIAL BROADCAST (BD + Backend + Frontend)
Sub-módulo 3A: Migración SQL (019_casas_comunicaciones.sql)
  ALTER TABLE chat_salas ADD COLUMN IF NOT EXISTS es_oficial BOOLEAN DEFAULT false;
  INSERT INTO chat_salas (nombre, icono, descripcion, tipo, orden, es_oficial, creador_id)
  VALUES ('Anuncios ExploraCO', '\uD83D\uDCE3', 'Canal oficial de anuncios', 'viajeros', -1, true,
    (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com' LIMIT 1))
  ON CONFLICT DO NOTHING;

Sub-módulo 3B: Backend interacciones.js
  - GET tipo=chat_salas: añadir es_oficial al SELECT para que llegue al frontend
  - POST tipo2=chat_msg: si la sala es es_oficial=true, bloquear escritura SALVO si el usuario es el admin (email = 'brsk84@gmail.com' o rol = 'admin')
  - POST tipo2=anuncio_oficial (NUEVO): endpoint exclusivo para admin, inserta en chat_mensajes con una marca especial
  - ASCII-Safe obligatorio en toda la rama backend

Sub-módulo 3C: Frontend comunidad.html
  - En el renderizado de salas: si s.es_oficial = true → mostrar sala con badge visual distinto (ej: icono 📣, fondo dorado tenue, label "OFICIAL")
  - Pinear la sala oficial SIEMPRE al tope de la lista (ordenar por es_oficial DESC)
  - En openChatRoom: si sala es oficial → ocultar el input de mensaje (chat-inp) y mostrar texto "Solo el administrador puede publicar aquí"
  - Para el admin (detectar por window.ExploraCO.usuario.email === 'brsk84@gmail.com'): mostrar input de mensaje normalmente

MÓDULO 4 — CASAS: TRIBUTO CONFIGURABLE + LÍDER AUTOMÁTICO + ROLES + MISIONES CONJUNTAS
Sub-módulo 4A: Migración SQL (019_casas_comunicaciones.sql, mismo archivo)
  ALTER TABLE casas_cofre ADD COLUMN IF NOT EXISTS tributo_pct NUMERIC(4,2) DEFAULT 10.00;
  ALTER TABLE casas_cofre ADD COLUMN IF NOT EXISTS lider_user_id UUID REFERENCES usuarios(id);
  -- Nueva tabla para roles dentro de la casa
  CREATE TABLE IF NOT EXISTS casa_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    casa TEXT NOT NULL,
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    rol TEXT NOT NULL CHECK (rol IN ('lider', 'oficial', 'mariscal', 'miembro')),
    asignado_en TIMESTAMPTZ DEFAULT NOW(),
    activo BOOLEAN DEFAULT true,
    UNIQUE (casa, usuario_id)
  );
  -- Nueva tabla para misiones conjuntas de casa
  CREATE TABLE IF NOT EXISTS casa_misiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    casa TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    meta_tipo TEXT NOT NULL CHECK (meta_tipo IN ('visitas', 'xp_total', 'resenas', 'fotos')),
    meta_valor INTEGER NOT NULL,
    progreso_actual INTEGER DEFAULT 0,
    recompensa_xp NUMERIC(10,2) DEFAULT 0,
    estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'completada', 'expirada')),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    expira_en TIMESTAMPTZ,
    completado_en TIMESTAMPTZ
  );

Sub-módulo 4B: Backend usuarios.js — nuevas ramas GET
  - tipo=casa_ranking: ya existe, AÑADIR lider_user_id y tributo_pct desde casas_cofre
  - tipo=casa_misiones (NUEVO GET): SELECT * FROM casa_misiones WHERE casa=$1 AND estado='activa'

Sub-módulo 4C: Backend interacciones.js — nuevas ramas POST
  - tipo2=casa_tributo_config (NUEVO): solo admin o líder de la casa pueden cambiar tributo_pct (0-15%)
    UPDATE casas_cofre SET tributo_pct=$1, actualizado_en=NOW() WHERE casa=$2
  - tipo2=casa_lider_evaluar (NUEVO): lee el usuario con más xp_total en la casa, si es distinto al lider_user_id actual, lo actualiza
    UPDATE casas_cofre SET lider_user_id=(SELECT id FROM usuarios WHERE casa=$1 ORDER BY xp_total DESC LIMIT 1), actualizado_en=NOW() WHERE casa=$1
    También actualiza casa_roles: upsert del nuevo líder con rol='lider', degrada el anterior a rol='oficial'
  - tipo2=casa_mision_progreso (NUEVO): cuando se completa una acción de gamificación (visita, reseña, foto), incrementar progreso_actual en las misiones activas de la casa del usuario
    UPDATE casa_misiones SET progreso_actual = LEAST(progreso_actual + 1, meta_valor) WHERE casa=$1 AND estado='activa' AND meta_tipo=$2

  MODIFICAR acreditarClaseYCofre() en interacciones.js:
  - Leer tributo_pct desde casas_cofre en lugar del hardcoded 0.10
  - SELECT tributo_pct FROM casas_cofre WHERE casa=$1
  - var tributo = red2(xp_final * ((pct || 10) / 100));

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÓDULO 5 — MEJORAS MAPA ADMIN (admin.html)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Archivo: admin.html (Regla de Oro 2: editar via Python str.replace, no manual)
Cambios:
  1. Aumentar altura del modal map-picker-modal:
     - Cambiar id="map-picker-el" style="height:380px" → style="height:500px"
  2. Dibujar círculo vectorial sobre el mapa cuando se ajusta f-radio-m:
     - Añadir oninput al input f-radio-m: oninput="_syncRadioPresetChips(); actualizarCirculoRango()"
     - Añadir función actualizarCirculoRango() en el bloque de scripts del admin:
       - Leer f-radio-m y las coordenadas f-lat/f-lng actuales
       - Si MapPicker._map existe (el mapa Leaflet del picker) y hay coords → L.circle([lat,lng], {radius: radioM, color:'#E8A020', fillOpacity:0.15, weight:2})
       - Guardar referencia en window._adminRangoCircle, destruir el anterior antes de crear el nuevo
       - Si radio = 0 o vacío → remover el círculo
  Nota: map-picker.js es un módulo externo — no modificar ese archivo. La función actualizarCirculoRango() accede a MapPicker._map que es la instancia Leaflet expuesta por el módulo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS DE ORO MANDATORIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ASCII-Safe absoluto en api/*.js: cero caracteres > 127. Solo escapes \uXXXX. Cero backticks.
2. MERGE JSONB: actualizaciones de columnas JSONB con operador ||. Nunca reemplazo total.
3. Presupuesto Vercel Hobby: máximo 8 funciones en api/. TODO entra como rama tipo= en los archivos existentes.
4. No crear archivos nuevos en api/. Usar interacciones.js y usuarios.js únicamente.
5. Ediciones en admin.html (>7500 líneas): SOLO mediante Python str.replace() con contexto exacto de 3 líneas antes y 3 después del cambio.
6. Nombres de funciones prefijados para evitar colisiones: funciones nuevas en usuario-session.js con prefijo expNvl_ o expEra_. Funciones en admin.html con prefijo adm_.
7. Entregar segmentos completos de código, no fragmentos parciales que rompan lógica interna.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MATRIZ DE AGENTES PARA OPENCODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Agente              | Entregable                                         | Archivos         |
|---------------------|----------------------------------------------------|------------------|
| Agente DB           | 019_casas_comunicaciones.sql (ALTERs + CREATEs)    | Nuevo .sql       |
| Agente Backend      | POST casa_tributo_config, casa_lider_evaluar,      | interacciones.js |
|                     | anuncio_oficial, casa_mision_progreso,             |                  |
|                     | GET casa_misiones, modificar acreditarClaseYCofre  |                  |
| Agente Backend 2    | GET casa_ranking añadir lider+tributo_pct,         | usuarios.js      |
|                     | GET tipo=casa_misiones                             |                  |
| Agente Frontend UI  | Módulos 1 y 2 (modal nivel-up + eras)              | usuario-session.js|
| Agente Frontend Chat| Canal oficial: render + bloqueo input              | comunidad.html   |
| Agente Admin Map    | Altura modal + círculo vectorial rango             | admin.html (Python)|
| Agente QA           | Escudo GOLD 5 latidos, ASCII-Safe check            | Todos            |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCCIÓN PARA CLAUDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Con todo este contexto, tu tarea es generar los prompts de codificación exactos para ejecutar en OpenCode, uno por agente. Antes de escribir los prompts, haz las preguntas necesarias para aclarar cualquier ambigüedad técnica o de diseño. Cuando generes los prompts, incluye junto a cada uno la lista de archivos que OpenCode debe tener disponibles para esa tarea.

ARCHIVOS A SUBIR EN CLAUDE PARA CADA AGENTE:
- Agente DB: ninguno (genera SQL desde cero basado en el contexto)
- Agente Backend (interacciones.js): subir interacciones.js completo
- Agente Backend 2 (usuarios.js): subir usuarios.js completo
- Agente Frontend UI: subir usuario-session.js completo
- Agente Frontend Chat: subir comunidad.html completo
- Agente Admin Map: subir admin.html completo + map-picker.js si existe como archivo separado
- Agente QA: subir todos los archivos modificados tras los pasos anteriores
================================================================================
```

---

## PARTE B — PROMPTS DIRECTOS PARA OPENCODE (por agente)

---

### AGENTE 1 — DB: Migración 019

**Archivos requeridos en OpenCode:** ninguno (SQL puro)

```
TAREA: Generar archivo 019_casas_comunicaciones.sql para Neon PostgreSQL.

CAMBIOS REQUERIDOS (en orden seguro de ejecución):

-- 1. Canal oficial en chat_salas
ALTER TABLE chat_salas ADD COLUMN IF NOT EXISTS es_oficial BOOLEAN DEFAULT false;
INSERT INTO chat_salas (nombre, icono, descripcion, tipo, orden, es_oficial, creador_id)
SELECT 'Anuncios ExploraCO', '\uD83D\uDCE3', 'Canal oficial de anuncios', 'viajeros', -1, true, id
FROM usuarios WHERE email = 'brsk84@gmail.com' LIMIT 1
ON CONFLICT DO NOTHING;

-- 2. Casas: tributo configurable y líder
ALTER TABLE casas_cofre ADD COLUMN IF NOT EXISTS tributo_pct NUMERIC(4,2) DEFAULT 10.00;
ALTER TABLE casas_cofre ADD COLUMN IF NOT EXISTS lider_user_id UUID REFERENCES usuarios(id);

-- 3. Tabla de roles de Casa
CREATE TABLE IF NOT EXISTS casa_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casa TEXT NOT NULL CHECK (casa IN ('condor', 'jaguar', 'delfin')),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('lider', 'oficial', 'mariscal', 'miembro')),
  asignado_en TIMESTAMPTZ DEFAULT NOW(),
  activo BOOLEAN DEFAULT true,
  UNIQUE (casa, usuario_id)
);

-- 4. Tabla de misiones conjuntas de Casa
CREATE TABLE IF NOT EXISTS casa_misiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casa TEXT NOT NULL CHECK (casa IN ('condor', 'jaguar', 'delfin')),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  meta_tipo TEXT NOT NULL CHECK (meta_tipo IN ('visitas', 'xp_total', 'resenas', 'fotos')),
  meta_valor INTEGER NOT NULL CHECK (meta_valor > 0),
  progreso_actual INTEGER DEFAULT 0,
  recompensa_xp NUMERIC(10,2) DEFAULT 0,
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'completada', 'expirada')),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  expira_en TIMESTAMPTZ,
  completado_en TIMESTAMPTZ
);

-- 5. Poblar roles iniciales desde el estado actual (el de más XP por casa = líder)
INSERT INTO casa_roles (casa, usuario_id, rol)
SELECT casa, id, 'lider'
FROM (
  SELECT casa, id, ROW_NUMBER() OVER (PARTITION BY casa ORDER BY xp_total DESC) AS rn
  FROM usuarios WHERE casa IS NOT NULL AND activo = true
) ranked WHERE rn = 1
ON CONFLICT (casa, usuario_id) DO UPDATE SET rol = 'lider';

-- 6. Poblar lider_user_id en casas_cofre
UPDATE casas_cofre cc SET lider_user_id = (
  SELECT id FROM usuarios WHERE casa = cc.casa ORDER BY xp_total DESC LIMIT 1
);

REGLAS:
- Cero emojis directos en SQL: usar escapes Unicode \uXXXX
- Cada ALTER usa IF NOT EXISTS
- Entregar el script completo listo para ejecutar en Neon
```

---

### AGENTE 2 — Backend interacciones.js (5 cambios)

**Archivos requeridos en OpenCode:** `interacciones.js`

```
TAREA: Modificar api/interacciones.js con 5 cambios quirúrgicos.
RESTRICCIONES: ASCII-Safe absoluto. Cero caracteres >127. Solo escapes \uXXXX.
Cero backticks en el archivo. Entregar cada bloque con 3 líneas de contexto antes y después.

CAMBIO 1 — acreditarClaseYCofre(): leer tributo_pct dinámico desde casas_cofre
Ubicación aproximada: línea 338 (función acreditarClaseYCofre)
Reemplazar el bloque del tributo que dice:
  var tributo = red2(xp_final * 0.10);
  await sql('UPDATE casas_cofre SET xp_cofre_total = xp_cofre_total + $1 ...')

Por lógica que primero lee tributo_pct:
  var pctRows = await sql('SELECT COALESCE(tributo_pct, 10) AS pct FROM casas_cofre WHERE casa = $1', [c.casa]);
  var pct = parseFloat((pctRows && pctRows[0] && pctRows[0].pct) || 10);
  var tributo = red2(xp_final * (pct / 100));
  await sql('UPDATE casas_cofre SET xp_cofre_total = xp_cofre_total + $1, actualizado_en = NOW() WHERE casa = $2', [tributo, c.casa]);

CAMBIO 2 — POST tipo2=casa_tributo_config (NUEVO, añadir al bloque POST)
Solo admin (email brsk84@gmail.com) o líder de la casa pueden cambiar tributo_pct (rango 0-15).
Verificar: SELECT lider_user_id FROM casas_cofre WHERE casa=$1
Actualizar: UPDATE casas_cofre SET tributo_pct=$1, actualizado_en=NOW() WHERE casa=$2

CAMBIO 3 — POST tipo2=casa_lider_evaluar (NUEVO)
Busca el usuario con más xp_total en la casa.
Si es distinto al lider_user_id actual:
  UPDATE casas_cofre SET lider_user_id=(SELECT id FROM usuarios WHERE casa=$1 ORDER BY xp_total DESC LIMIT 1), actualizado_en=NOW() WHERE casa=$1
  INSERT INTO casa_roles (casa, usuario_id, rol) VALUES ($1, $nuevo_lider, 'lider') ON CONFLICT (casa, usuario_id) DO UPDATE SET rol='lider', activo=true, asignado_en=NOW();
  UPDATE casa_roles SET rol='oficial' WHERE casa=$1 AND usuario_id=$lider_anterior AND rol='lider';
Llamar casa_lider_evaluar automáticamente dentro de la función entregarXp() después de acreditar XP.

CAMBIO 4 — POST tipo2=anuncio_oficial (NUEVO)
Solo admin (email brsk84@gmail.com). Inserta en chat_mensajes en la sala oficial (es_oficial=true).
SELECT id FROM chat_salas WHERE es_oficial=true LIMIT 1
INSERT INTO chat_mensajes (sala_id, usuario_id, nombre, texto) VALUES ($sala, $admin_id, 'ExploraCO Oficial', $texto)

CAMBIO 5 — POST tipo2=chat_msg: bloquear escritura en sala oficial para no-admin
Antes del INSERT en chat_mensajes, verificar:
  SELECT es_oficial FROM chat_salas WHERE id=$sala_id
  Si es_oficial=true Y email del usuario != 'brsk84@gmail.com' → return 403 con error ASCII-safe.

CAMBIO 6 — GET tipo=chat_salas: añadir es_oficial al SELECT
En la query que hace el SELECT de chat_salas, añadir s.es_oficial en la lista de columnas retornadas.

CAMBIO 7 — GET tipo=casa_misiones (NUEVO)
Añadir antes del final del bloque GET:
  if (tipo === 'casa_misiones' && req.query.casa) {
    var casaMis = req.query.casa;
    var rows = await sql('SELECT * FROM casa_misiones WHERE casa=$1 AND estado=$2 ORDER BY creado_en DESC', [casaMis, 'activa']);
    return res.json({ ok: true, data: rows });
  }
```

---

### AGENTE 3 — Backend usuarios.js (1 cambio)

**Archivos requeridos en OpenCode:** `usuarios.js`

```
TAREA: Modificar api/usuarios.js — GET tipo=casa_ranking.
Añadir lider_user_id y tributo_pct al resultado que ya devuelve la función.

Ubicación: función crSql() (~línea 533). En el SELECT de la consulta principal que agrupa por u.casa,
añadir estas dos columnas al LEFT JOIN de casas_cofre que ya existe:
  COALESCE(ct.lider_user_id, NULL) AS lider_user_id,
  COALESCE(ct.tributo_pct, 10) AS tributo_pct

Y en el GROUP BY de la variante con cofre, añadir:
  ct.lider_user_id, ct.tributo_pct

En el .map() posterior que procesa crCasas (~línea 585), añadir:
  c.lider_user_id = c.lider_user_id || null;
  c.tributo_pct = parseFloat(c.tributo_pct) || 10;

ASCII-Safe obligatorio. Entregar con 3 líneas de contexto antes y después de cada cambio.
```

---

### AGENTE 4 — Frontend usuario-session.js (Módulos 1 y 2)

**Archivos requeridos en OpenCode:** `usuario-session.js`

```
TAREA: Añadir dos módulos nuevos a usuario-session.js.
RESTRICCIONES: ASCII-Safe. Cero tildes ni ñ directas: usar \uXXXX. Nombres de función prefijados con expNvl_ o expEra_.

MÓDULO 1: Sistema de Eras y mapa de títulos por nivel

Añadir inmediatamente DESPUÉS del bloque CAPACIDADES_POR_NIVEL (después de la línea que dice window.ExploraCO.CAPACIDADES_POR_NIVEL = CAPACIDADES_POR_NIVEL):

  var TITULOS_POR_NIVEL = {
    1:  'Viajero Novato', 2:  'Explorador', 3:  'Aventurero', 4:  'Descubridor',
    5:  'Cart\u00f3grafo', 6:  'Cronista', 7:  'Gu\u00eda Local', 8:  'Embajador',
    9:  'Maestro Viajero', 10: 'Leyenda Urbana', 11: 'Patriarca Cultural',
    12: 'Se\u00f1or del Territorio', 13: 'Guardián de Rutas', 14: 'Gran Explorador',
    15: 'Orquestador', 16: 'Arquitecto Cultural', 17: 'Inmortal Andino',
    18: 'Embajador Legendario', 19: 'Maestro Supremo', 20: 'Leyenda de Colombia'
  };

  var ERAS = [
    { nombre: 'Mundana',      niveles: [1,5],  emoji: '\uD83C\uDF0D', color: '#6B7280',
      beneficios: ['XP por visitas y rese\u00f1as', 'Acceso al mapa y al chat b\u00e1sico', 'Creaci\u00f3n de perfil'],
      mecanicas: ['Explorar puntos culturales', 'Registrar visitas con geocerca'] },
    { nombre: 'Patrocinada',  niveles: [6,10], emoji: '\uD83C\uDFC6', color: '#E8A020',
      beneficios: ['Crear planes de viaje', 'Emojis premium en el chat', 'Sello de sala'],
      mecanicas: ['Misiones de Casa', 'Bonos de XP por actividad grupal'] },
    { nombre: 'Organizador',  niveles: [11,15],emoji: '\uD83D\uDE80', color: '#6366F1',
      beneficios: ['Organizar actividades', 'Fundar pandillas', 'Moderar galer\u00edas'],
      mecanicas: ['Liderar Casas', 'Misiones colectivas de alto valor'] },
    { nombre: 'Leyenda',      niveles: [16,20],emoji: '\uD83D\uDC51', color: '#EC4899',
      beneficios: ['Cromo dorado', 'Mariscal de parche', 'Inmortal: XP nunca decae'],
      mecanicas: ['Recompensas exclusivas de temporada', 'Voto en decisiones de la plataforma'] }
  ];

  function expEra_getEra(nivel) {
    for (var i = 0; i < ERAS.length; i++) {
      if (nivel >= ERAS[i].niveles[0] && nivel <= ERAS[i].niveles[1]) return ERAS[i];
    }
    return ERAS[0];
  }

  window.ExploraCO.getEra = expEra_getEra;
  window.ExploraCO.TITULOS_POR_NIVEL = TITULOS_POR_NIVEL;
  window.ExploraCO.ERAS = ERAS;

MÓDULO 2: Modal de nivel-up y modal de cambio de era

Añadir después del módulo anterior:

  function expNvl_mostrarModalNivelUp(nivelAnterior, nivelNuevo) {
    // Calcular capacidades desbloqueadas en esta subida
    var nuevasCaps = [];
    var umbrales = Object.keys(CAPACIDADES_POR_NIVEL).map(Number).sort(function(a,b){return a-b;});
    for (var i = 0; i < umbrales.length; i++) {
      if (umbrales[i] > nivelAnterior && umbrales[i] <= nivelNuevo) {
        nuevasCaps.push(CAPACIDADES_POR_NIVEL[umbrales[i]]);
      }
    }
    var titulo = TITULOS_POR_NIVEL[nivelNuevo] || ('Nivel ' + nivelNuevo);
    // Pro-tip para el siguiente nivel
    var xpSig = window.ExploraCO.XP_LEVELS[nivelNuevo] || null;
    var tipTexto = xpSig
      ? 'Para el nivel ' + (nivelNuevo + 1) + ' necesitas ' + xpSig + ' XP. Visita 3 lugares nuevos esta semana.'
      : '\u00a1Has alcanzado el nivel m\u00e1ximo!';
    // Construir modal DOM
    var overlay = document.createElement('div');
    overlay.id = 'expNvl-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#1a1a2e;border:2px solid #E8A020;border-radius:16px;padding:28px 24px;max-width:420px;width:100%;text-align:center;font-family:Outfit,sans-serif;color:#fff;';
    var capsHtml = nuevasCaps.length
      ? '<ul style="text-align:left;margin:10px 0 0;padding-left:18px;font-size:12px;color:#a3e635;">'
        + nuevasCaps.map(function(c){ return '<li>' + c.replace(/_/g,' ') + '</li>'; }).join('')
        + '</ul>'
      : '';
    box.innerHTML = '<div style="font-size:36px;margin-bottom:8px">\uD83C\uDF1F</div>'
      + '<div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#E8A020;text-transform:uppercase;margin-bottom:4px">Nivel alcanzado</div>'
      + '<div style="font-size:42px;font-weight:900;color:#E8A020;line-height:1">' + nivelNuevo + '</div>'
      + '<div style="font-size:15px;font-weight:700;margin:6px 0 12px;color:#fff">' + titulo + '</div>'
      + (capsHtml ? '<div style="font-size:11px;color:#9CA3AF;margin-bottom:4px">Capacidades desbloqueadas:</div>' + capsHtml : '')
      + '<div style="margin-top:14px;font-size:11px;color:#9CA3AF;padding:8px 12px;background:rgba(255,255,255,.06);border-radius:8px">' + tipTexto + '</div>'
      + '<div style="display:flex;gap:10px;margin-top:18px;justify-content:center">'
      + '<button id="expNvl-btn-cerrar" style="padding:9px 20px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif">Cerrar</button>'
      + '<button id="expNvl-btn-perfil" style="padding:9px 20px;background:#E8A020;border:none;border-radius:8px;color:#000;font-size:12px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif">Ampliar info</button>'
      + '</div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById('expNvl-btn-cerrar').onclick = function() { expNvl_cerrarModal(); };
    document.getElementById('expNvl-btn-perfil').onclick = function() {
      expNvl_cerrarModal();
      // Abrir panel de perfil/progresión si existe
      if (window.ExploraCO && window.ExploraCO.abrirPerfil) window.ExploraCO.abrirPerfil();
    };
  }

  function expNvl_cerrarModal() {
    var el = document.getElementById('expNvl-modal-overlay');
    if (el) el.remove();
  }

  function expEra_mostrarModalCambioEra(eraAnterior, eraNueva) {
    var overlay = document.createElement('div');
    overlay.id = 'expEra-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px;';
    var box = document.createElement('div');
    var c = eraNueva.color || '#E8A020';
    box.style.cssText = 'background:#0d1117;border:2px solid ' + c + ';border-radius:20px;padding:36px 28px;max-width:440px;width:100%;text-align:center;font-family:Outfit,sans-serif;color:#fff;';
    var bensHtml = (eraNueva.beneficios || []).map(function(b){ return '<li style="font-size:12px">' + b + '</li>'; }).join('');
    var mecHtml  = (eraNueva.mecanicas  || []).map(function(m){ return '<li style="font-size:12px">' + m + '</li>'; }).join('');
    box.innerHTML = '<div style="font-size:48px;margin-bottom:10px">' + eraNueva.emoji + '</div>'
      + '<div style="font-size:10px;font-weight:800;letter-spacing:3px;color:' + c + ';text-transform:uppercase;margin-bottom:6px">\u00a1Nueva Era desbloqueada!</div>'
      + '<div style="font-size:28px;font-weight:900;color:' + c + ';margin-bottom:16px">' + eraNueva.nombre + '</div>'
      + '<div style="text-align:left;margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:' + c + ';margin-bottom:4px">Beneficios:</div><ul style="padding-left:18px;margin:0;color:#D1D5DB">' + bensHtml + '</ul></div>'
      + '<div style="text-align:left;margin-bottom:20px"><div style="font-size:11px;font-weight:700;color:' + c + ';margin-bottom:4px">Mec\u00e1nicas exclusivas:</div><ul style="padding-left:18px;margin:0;color:#D1D5DB">' + mecHtml + '</ul></div>'
      + '<button onclick="document.getElementById(\'expEra-modal-overlay\').remove()" style="padding:11px 32px;background:' + c + ';border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:Outfit,sans-serif;letter-spacing:.5px">Entendido</button>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  window.ExploraCO.mostrarModalNivelUp = expNvl_mostrarModalNivelUp;
  window.ExploraCO.mostrarModalCambioEra = expEra_mostrarModalCambioEra;

MÓDULO 3: Modificar aplicarResultadoXp() para disparar los modales
Dentro de la función aplicarResultadoXp(data) que existe (alrededor de línea 1082),
DESPUÉS de la línea:  window.ExploraCO.usuario.xp_total = redondearXp(...) + total)
y ANTES de: guardarSesion(window.ExploraCO.usuario)

Añadir:
    var nvlAnt = calcularNivel(window.ExploraCO.usuario.xp_total - total);
    var nvlNvo = calcularNivel(window.ExploraCO.usuario.xp_total);
    if (nvlNvo > nvlAnt) {
      setTimeout(function() { expNvl_mostrarModalNivelUp(nvlAnt, nvlNvo); }, 600);
      var eraAnt = expEra_getEra(nvlAnt);
      var eraNva = expEra_getEra(nvlNvo);
      if (eraNva && eraAnt && eraNva.nombre !== eraAnt.nombre) {
        setTimeout(function() { expEra_mostrarModalCambioEra(eraAnt, eraNva); }, 3200);
      }
    }

Entregar cada bloque con indicación de número de línea aproximado y 3 líneas de contexto.
```

---

### AGENTE 5 — Frontend comunidad.html (Canal Oficial)

**Archivos requeridos en OpenCode:** `comunidad.html`

```
TAREA: 3 modificaciones quirúrgicas en comunidad.html para el canal oficial broadcast.
Regla: Usar Python str.replace() con match exacto para archivos grandes.

CAMBIO 1: En el fetch de chat_salas, ordenar salas con es_oficial primero
Ubicar el .then donde se procesa res.data (~línea 773):
  var salas = ((res && res.data) || []).filter(function(s){ return s.tipo !== 'plan'; });
Añadir inmediatamente después:
  salas.sort(function(a,b){ return (b.es_oficial ? 1 : 0) - (a.es_oficial ? 1 : 0); });

CAMBIO 2: En el renderizado de cada sala (forEach ~línea 781), añadir badge visual para sala oficial
Antes de: div.onclick = (function(rid){...
Añadir:
  if (s.es_oficial) {
    div.style.borderLeft = '3px solid #E8A020';
    div.style.background = 'rgba(232,160,32,.08)';
    var badge = document.createElement('span');
    badge.textContent = 'OFICIAL';
    badge.style.cssText = 'font-size:8px;font-weight:800;background:#E8A020;color:#000;padding:1px 5px;border-radius:3px;margin-left:auto;letter-spacing:.5px;flex-shrink:0;';
    div.querySelector('.cr-info').appendChild(badge);
  }

CAMBIO 3: En openChatRoom(), bloquear input para salas oficiales (no admin)
Después de: loadChatMsgs(roomId);
Añadir:
  var chatInp = document.getElementById('chat-inp');
  var chatSend = document.getElementById('chat-send');
  var isOfi = room.es_oficial;
  var u = window.ExploraCO && window.ExploraCO.usuario;
  var isAdmin = u && u.email === 'brsk84@gmail.com';
  if (chatInp) chatInp.style.display = (isOfi && !isAdmin) ? 'none' : '';
  if (chatSend) chatSend.style.display = (isOfi && !isAdmin) ? 'none' : '';
  var readonlyHint = document.getElementById('chat-readonly-hint');
  if (!readonlyHint && isOfi && !isAdmin) {
    var hint = document.createElement('div');
    hint.id = 'chat-readonly-hint';
    hint.style.cssText = 'font-size:11px;color:rgba(255,255,255,.35);text-align:center;padding:8px;';
    hint.textContent = 'Solo el administrador puede publicar aqu\u00ed';
    var area = document.getElementById('chat-input-area') || chatInp && chatInp.parentNode;
    if (area) area.appendChild(hint);
  } else if (readonlyHint) {
    readonlyHint.remove();
  }

Entregar con 3 líneas de contexto antes y después de cada inserción.
ASCII-Safe: tildes como \uXXXX.
```

---

### AGENTE 6 — Admin Mapa (admin.html vía Python)

**Archivos requeridos en OpenCode:** `admin.html` + `map-picker.js` (si existe como archivo separado)

```
TAREA: 2 cambios en admin.html mediante script Python con str.replace() exacto.
IMPORTANTE: admin.html tiene ~7500 líneas. NUNCA editar manualmente. Siempre Python.

CAMBIO 1: Aumentar altura del modal map-picker-el de 380px a 500px
Script Python:
  with open('admin.html', 'r', encoding='utf-8') as f: content = f.read()
  old = '<div id="map-picker-el" style="height:380px">'
  new = '<div id="map-picker-el" style="height:500px">'
  assert content.count(old) == 1, "Match no unico: " + str(content.count(old))
  content = content.replace(old, new)
  with open('admin.html', 'w', encoding='utf-8') as f: f.write(content)

CAMBIO 2: Añadir función adm_actualizarCirculoRango() y vincularla al input f-radio-m
Script Python parte A — añadir el atributo oninput al input f-radio-m:
  old = 'oninput="_syncRadioPresetChips()"'
  new = 'oninput="_syncRadioPresetChips(); adm_actualizarCirculoRango()"'
  (verificar count === 1 antes de reemplazar)

Script Python parte B — añadir la función después de closeMapPicker() wrapper (~línea 4773):
  Buscar el string exacto: 'function confirmMapPicker() { MapPicker.confirmMapPicker(); }'
  Añadir después:

  function adm_actualizarCirculoRango() {
    try {
      var lat = parseFloat(document.getElementById('f-lat') && document.getElementById('f-lat').value);
      var lng = parseFloat(document.getElementById('f-lng') && document.getElementById('f-lng').value);
      var radio = parseInt(document.getElementById('f-radio-m') && document.getElementById('f-radio-m').value, 10);
      var mp = window.MapPicker;
      if (!mp || !mp._map) return;
      if (window._adminRangoCircle) { mp._map.removeLayer(window._adminRangoCircle); window._adminRangoCircle = null; }
      if (!isFinite(lat) || !isFinite(lng) || !isFinite(radio) || radio <= 0) return;
      window._adminRangoCircle = L.circle([lat, lng], {
        radius: radio,
        color: '#E8A020',
        fillColor: '#E8A020',
        fillOpacity: 0.12,
        weight: 2
      }).addTo(mp._map);
    } catch(e) { /* silencioso: no bloquear el flujo */ }
  }

Nota: Si MapPicker._map no es la propiedad correcta para acceder al mapa Leaflet interno,
revisar map-picker.js e identificar la propiedad expuesta. Ajustar el acceso en consecuencia.
Verificar que L (Leaflet) está disponible globalmente antes de usar L.circle.

Entregar los scripts Python completos, no los cambios en prosa.
```

---

### AGENTE 7 — QA / Escudo GOLD

**Archivos requeridos en OpenCode:** todos los archivos modificados

```
TAREA: Ejecutar validación post-modificación sobre todos los archivos cambiados.

1. ASCII-Safe check en api/*.js:
   python3 -c "
   import sys
   files = ['api/interacciones.js', 'api/usuarios.js']
   for f in files:
       with open(f, 'r', encoding='utf-8') as fp: content = fp.read()
       bad = [(i+1, c) for i,c in enumerate(content) if ord(c) > 127]
       if bad: print(f + ' FAIL: ' + str(len(bad)) + ' chars > 127'); sys.exit(1)
       else: print(f + ' OK')
   "

2. Balance de divs en admin.html:
   python3 -c "
   with open('admin.html','r',encoding='utf-8') as f: c = f.read()
   opens = c.count('<div'); closes = c.count('</div>')
   print('DIV balance: ' + str(opens) + ' open, ' + str(closes) + ' close')
   if abs(opens - closes) > 5: print('WARNING: desbalance significativo')
   "

3. Verificar que no existen backticks en archivos backend:
   grep -n '`' api/interacciones.js api/usuarios.js

4. Verificar presupuesto de funciones Vercel (max 8 archivos en api/):
   ls api/*.js | wc -l

5. Verificar que los nuevos tipos no colisionan con los existentes:
   grep -c "tipo2 === 'casa_tributo_config'\|tipo2 === 'casa_lider_evaluar'\|tipo2 === 'anuncio_oficial'\|tipo2 === 'casa_mision_progreso'" api/interacciones.js

6. Verificar que el SQL de migración tiene solo chars <= 127:
   python3 -c "
   with open('019_casas_comunicaciones.sql','r',encoding='utf-8') as f: c = f.read()
   bad = [(i+1,ch) for i,ch in enumerate(c) if ord(ch) > 127]
   if bad: print('SQL FAIL: chars no ASCII en lineas ' + str([b[0] for b in bad]))
   else: print('SQL ASCII-Safe OK')
   "

Reportar resultado de cada check. Si alguno falla, indicar el archivo y línea exacta.
```
