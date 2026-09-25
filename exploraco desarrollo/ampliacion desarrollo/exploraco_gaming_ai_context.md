# ExploraCO Gaming — AI Coding Context Brief
> Documento de contexto compacto para agentes/modelos que van a programar sobre el sistema de gamificación de ExploraCO. Lee esto completo antes de escribir una sola línea de código.

---

## REGLAS DURAS — NUNCA VIOLAR

1. **8 endpoints serverless, tope consumido al 100%.** CERO archivos nuevos en `/api/`. Toda lógica nueva va como rama `tipo=` (GET) o `tipo2=` (POST) dentro de los archivos existentes.
2. **Driver de BD:** `@neondatabase/serverless` con `neon()`. NUNCA `pg`, NUNCA `Pool`.
3. **CommonJS estricto.** Sin `import`/`export`. Todo es `require`/`module.exports`.
4. **ASCII-safe absoluto en `/api/*.js`:** 0 bytes > 127, 0 backticks, 0 tildes, 0 caracteres especiales. Los comentarios también.
5. **JSONB = merge, nunca reemplazo.** Siempre `COALESCE(campo, '{}'::jsonb) || jsonb_build_object(...)`. Jamás `SET campo = $1` sobre un campo JSONB complejo.
6. **Cero borrado físico.** Siempre `activo = false`. La única excepción histórica fue la migración 014.
7. **Todo `try/catch` debe loggear y responder** `{ success: false, error: string, code: string }`. Nunca catch silencioso.
8. **Migraciones:** acumulativas e idempotentes (`IF NOT EXISTS`, `IF column NOT EXISTS`). Viven en `db/migrations/NNN_nombre.sql`.
9. **Validar `window.ExploraCO` antes de invocar** cualquier función de red desde el frontend.
10. **Escudo GOLD antes de cada deploy:** `node --check api/archivo.js` + verificar ASCII-safety + balance de `<div>` en HTML.

---

## STACK Y ENTORNO

```
Runtime:    Vercel Serverless (Hobby — 8 funciones, tope consumido)
BD:         Neon PostgreSQL (driver: @neondatabase/serverless)
Frontend:   HTML/CSS/JS vanilla — sin framework
Auth:       JWT HMAC SHA-256 casero (sin librería externa de JWT)
Email:      Resend API (RESEND_API_KEY env var)
Idioma API: español en nombres de campos, tipos, handlers y errores
```

### Variables de entorno requeridas
```
DATABASE_URL          # Neon connection string
SESSION_JWT_SECRET    # OBLIGATORIO en prod; sin esto los tokens son falsificables
RESEND_API_KEY        # Para email de verificación
SITE_URL              # URL base del sitio
```

---

## MAPA DE ENDPOINTS (8/8 — INMUTABLE)

| Archivo | Versión | Responsabilidad gaming |
|---|---|---|
| `api/usuarios.js` | v9 | Perfil, upsert/registro, leaderboard, referidos, facciones, JWT, email-verify |
| `api/interacciones.js` | v13 | Engine core: XP, misiones, logros, cromos, Parches, Wayfarer, consumibles, álbumes, chat |
| `api/admin.js` | v6 | Moderación, tienda consumibles, auditoría Activos Ocultos, salud_red |
| `api/destinos.js` | — | Catálogo público de spots |
| `api/pagina-destino.js` | v9 | SSR por slug + botón visita |
| `api/admin-destinos.js` | v2 | CRUD destinos |
| `api/publicar-lugar.js` | — | Draft público |
| `api/utilidades.js` | — | Sitemap, analítica |

### Patrón de ruteo

```js
// GET — api/interacciones.js
const tipo = req.query.tipo;
if (tipo === 'mi_handler') { ... }

// POST — api/interacciones.js (variable local tipo2)
const tipo2 = req.body.tipo;  // línea 2668
if (tipo2 === 'mi_handler') { ... }

// GET — api/usuarios.js
const tipo = req.query.tipo;

// POST — api/usuarios.js
const { tipo } = req.body;
```

---

## MODELO DE DATOS — CAMPOS GAMING EN `usuarios`

```sql
-- Campos existentes (ya en Neon)
xp_total                    integer NOT NULL DEFAULT 0
capacidades                 jsonb NOT NULL DEFAULT '{}'::jsonb   -- consumibles, permisos
vocaciones                  jsonb NOT NULL DEFAULT '{}'::jsonb   -- musico|cine|artista_grafico|escritor
progreso_misiones           jsonb
progreso_logros             jsonb
progreso_social             jsonb
progreso_album              jsonb
ciudad_base                 text
foto_url                    text
patrocinios                 jsonb   -- vacío, sin lógica aún

-- Columnas migración 016 (PENDIENTE aplicar en Neon — BLOQUEANTE)
referido_por                uuid REFERENCES usuarios(id)
codigo_referido             varchar(20)  -- índice único parcial
xp_ref_total                int DEFAULT 0
referidos_directos_contados int DEFAULT 0
faccion                     varchar(20) CHECK (faccion IS NULL OR faccion IN ('exploradores','curadores','creadores','artistas'))
faccion_elegida_en          timestamptz
email_verificado            boolean DEFAULT false
email_token                 text
email_token_expira          timestamptz
device_hashes               jsonb   -- máx. 5 fingerprints

-- Columnas migración 038 (APLICADA en Neon 2026-09-24)
origen_declarado_en         timestamptz
-- xp_ledger.mult_origen numeric(10,6), origen_tier (tabla xp_ledger)

-- Columnas migración 024 (PENDIENTE — Casas/Clases)
-- casa varchar CHECK ('condor'|'jaguar'|'delfin')
-- tabla casas_cofre: casa PK, xp_cofre_total, poblacion_activa, factor_conversion
```

---

## TABLAS GAMING EXISTENTES

```sql
-- Gamificación v4 (migración 010 — APLICADA)
consumibles(id, clave, nombre, precio_xp, efecto, activo)
compra_consumibles(id, usuario_id, consumible_id, precio_pagado, creado_en)
consumo_consumibles(id, usuario_id, consumible_id, efecto_aplicado, creado_en)
cromos_catalogo(id, nombre, descripcion, rareza, imagen_url)
usuarios_cromos(usuario_id, cromo_id, cantidad, PK(usuario_id,cromo_id))
cromo_intercambios(id, emisor_id, receptor_id, cromo_id, creado_en)
pandillas(id, nombre, fundador_id, fama_total, creado_en)
pandillas_miembros(pandilla_id, usuario_id, rol, activo, unido_en)
pandilla_retos(id, pandilla_id, descripcion, xp_objetivo, xp_actual, ventana_horas, creado_en)

-- Wayfarer (migración 016 — PENDIENTE en Neon)
activos_ocultos(id, propuesto_por, nombre, descripcion, lat, lng, foto_url,
  categoria, ciudad, estado CHECK('pendiente','aprobado','rechazado'),
  votos_favor int>=0, votos_contra int>=0, activo bool, creado_en, resuelto_en)
activos_ocultos_votos(activo_id, usuario_id, voto CHECK('favor','contra'), PK compuesto)
activos_ocultos_checkins(id, activo_id, usuario_id, lat, lng, accuracy, activo,
  UNIQUE(activo_id, usuario_id) WHERE activo=true)
geo_nonces(id, usuario_id, nonce UNIQUE, proposito, usado bool, expira_en DEFAULT now()+interval'2 minutes')

-- Geo (migración 038 — APLICADA)
geo_ciudades(cod_mpio PK, nombre, lat, lng, es_capital)   -- 1.122 filas DIVIPOLA
geo_paises(iso2 PK, nombre, lat, lng)                      -- 245 filas ISO-3166-1

-- Social (migraciones 008, 009, 013)
chat_salas, chat_mensajes, planes_viaje, planes_miembros
albumes, album_fotos, album_votos, album_comentarios, album_comentario_votos
resena_votos, interacciones (tabla principal de acciones)
```

---

## PROGRESIÓN DE NIVELES

### Sistema actual (IMPLEMENTADO) — 20 niveles / 4 eras
El nivel, era y badge se **derivan siempre en runtime** desde `xp_total`. **Nunca se persisten.**

```js
// api/usuarios.js:14-60 (patrón exacto)
const NIVELES = [
  { nivel:1,  badge:'Caminante Novato',        era:'Mundana',     umbral:0 },
  { nivel:2,  badge:'Rastreador Local',         era:'Mundana',     umbral:100 },
  { nivel:3,  badge:'Explorador Urbano',        era:'Mundana',     umbral:250 },
  { nivel:4,  badge:'Aventurero Regional',      era:'Mundana',     umbral:450 },
  { nivel:5,  badge:'Vanguardia Territorial',   era:'Mundana',     umbral:700 },
  { nivel:6,  badge:'Embajador de Zona',        era:'Patrocinada', umbral:1000 },
  { nivel:7,  badge:'Fotografo de Ruta',        era:'Patrocinada', umbral:1400 },
  { nivel:8,  badge:'Cronista de Historias',    era:'Patrocinada', umbral:1900 },
  { nivel:9,  badge:'Buscador de Leyendas',     era:'Patrocinada', umbral:2500 },
  { nivel:10, badge:'Guia de Fronteras',        era:'Patrocinada', umbral:3200 },
  { nivel:11, badge:'Estratega Comunitario',    era:'Organizador', umbral:4000 },
  { nivel:12, badge:'Documentalista Visual',    era:'Organizador', umbral:5200 },
  { nivel:13, badge:'Senor del Spot',           era:'Organizador', umbral:6800 },
  { nivel:14, badge:'Cartografo de Cine',       era:'Organizador', umbral:8500 },
  { nivel:15, badge:'Protector del Patrimonio', era:'Organizador', umbral:10500 },
  { nivel:16, badge:'Curador de Colombia',      era:'Leyenda',     umbral:13000 },
  { nivel:17, badge:'Mariscal de Parche',       era:'Leyenda',     umbral:16000 },
  { nivel:18, badge:'Cineasta de Territorio',   era:'Leyenda',     umbral:19500 },
  { nivel:19, badge:'Inmortal del Mapa',        era:'Leyenda',     umbral:24000 },
  { nivel:20, badge:'Gran Maestro ExploraCO',   era:'Leyenda',     umbral:30000 },
];

function calcularNivel(xp_total) {
  let resultado = NIVELES[0];
  for (const n of NIVELES) {
    if (xp_total >= n.umbral) resultado = n;
    else break;
  }
  return resultado; // { nivel, badge_actual, era }
}
```

**De-nivel real:** si el usuario gasta XP en consumibles y cae por debajo de un umbral, pierde el nivel y sus capacidades asociadas. `comprar_consumible` devuelve `nivel_anterior`, `nivel_nuevo`, `bajo_nivel`.

### Capacidades desbloqueadas por nivel (usuario-session.js:45-55)
```js
const CAPACIDADES_NIVEL = {
  crear_planes:       6,
  emojis_premium:     7,
  sello_sala:        10,
  organizar_actividad: 11,
  fundar_pandilla:   14,
  moderar_galerias:  15,
  cromo_dorado:      16,
  mariscal_parche:   17,
  inmortal:          19,
};
// Activa si nivelActual >= umbral
```

### Extensión SPEC v6.1 — 40 niveles / 5 eras (sin código aún)
Curva extendida hasta N40 / 250.000 XP con Era Mito (N33-N40) que desbloquea A2A Agent Card.

---

## ECONOMÍA DE XP

### Fórmula maestra de XP
```
xp_final = base · min( min(M_nivel · mult_clase · factor_casa, 5.0) · mult_origen · stack_temp, 10.0 )
```
- **Cap de progresión:** multiplicadores pasivos combinados ≤ 5×
- **Cap global:** cualquier evento incluyendo temporales ≤ 10×
- `mult_origen` se aplica FUERA del cap de progresión pero DENTRO del cap global

### Fuentes de XP y topes
| Acción | XP base | Tope / regla |
|---|---|---|
| Reseña corta (≤50 chars) | 10 | 1/usuario/destino |
| Reseña larga (>50 chars) | 25 | 1/usuario/destino |
| Visita confirmada | 20 (+20 rural) | geocerca + cooldown 90s + máx 30/día |
| Rating rápido | 10 | 1/usuario/destino |
| Guardado | 5 | primera vez; reactivar = 0 XP |
| Foto a destino | 15 | requiere capacidad `mis_fotografo` |
| Voto de foto | 5 | 1/usuario/foto; no auto-voto |
| Album crear | 20 | máx 5/mes |
| Album agregar foto | 15 (agregador) / 10 (autor) | máx 10 fotos/día |
| Album votar | 5 | máx 20 votos/día |
| Comentario media | 2 | máx 20 XP/día (10 comentarios) |
| Mensaje chat | 2 | máx 20 XP/día (10 mensajes) |
| Voto Wayfarer | 5 | máx 30 XP/día; 1 voto/usuario/activo |
| Checkin Activo Oculto | 15 | dedup UNIQUE parcial + cooldown 90s |
| admin_xp | variable | no degrada (Math.max) |
| comprar_consumible | **resta** precio | máx 5 compras/día; xp_total >= precio |

> ⚠️ `album_voto` (+5) NO llama a `repartirXpReferidos` ni a `intentarObtenerCromo`/`aplicarFamaPandilla`. Es la única fuente de XP fuera de esos tres sistemas.

### Multiplicadores activos
| Mecanismo | Efecto |
|---|---|
| Líder de spot | ×1.1 (ROUND) si es autor de la reseña más votada de la ciudad del destino |
| Amuleto Doble XP | ×2 sobre las siguientes 5 acciones (`multiplicador_x2_usos`) |
| Fama de Parche | +10% (ROUND) del XP entregado a `pandillas.fama_total`; `trompeta_fama` lo duplica 24h |

### Multiplicador de Origen por Lejanía (ADR-058 — IMPLEMENTADO, migración 038 aplicada)
```js
// Función calcularFactorOrigen(distancia_km, tier)
// Tier se determina por ciudad_base/pais_base + origen_declarado_en + email_verificado
//
// LOCAL    (ciudad_base en CO, dist ≤ 25km):         factor = 1.00
// NOMADA   (en CO pero lejos, origen_declarado >= 7d): factor = 1.00 + 0.20 * min(km/1000, 1)  => max 1.20
// EXTRANJERO (pais_base != CO, email verificado,       factor = 1.20 + 0.20 * min(km/3000, 1) => max 1.40
//            cuenta >= 7d, origen_declarado >= 7d):
// SIN TIER ELEGIBLE:                                   factor = 1.00

// Anti-teleport: cambiar ciudad_base/pais_base fija origen_declarado_en = NOW()
// Elegibilidad de tier extranjero exige antigüedad (7 días) + email_verificado
```
Elimina el bono plano ×1.2 anterior (ADR-028/WP-5).

---

## SISTEMA JWT (ADR-025)

### Emisión (api/usuarios.js:115-125)
```js
const crypto = require('crypto');
const SECRET = process.env.SESSION_JWT_SECRET || 'dev_secret'; // NUNCA usar dev_secret en prod

function firmarSesion(usuario_id) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: usuario_id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}
```

### Validación (api/interacciones.js:1086-1111)
```js
function validarSesion(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) throw { status: 401, code: 'NO_TOKEN' };
  const [header, payload, sig] = authHeader.slice(7).split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw { status: 401, code: 'TOKEN_INVALIDO' };
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (data.exp < Math.floor(Date.now() / 1000)) throw { status: 401, code: 'TOKEN_EXPIRADO' };
  return data; // { sub: usuario_id, iat, exp }
}
```

**Rutas que exigen JWT:** `visita`, `activo_oculto_votar`, `activo_oculto_checkin`.

### Geo-Nonces (TTL 2 min — tabla `geo_nonces`)
```js
// Solicitar: GET ?tipo=geo_nonce_solicitar&usuario_id=UUID
// Consumir atómicamente en la transacción del checkin:
// UPDATE geo_nonces SET usado=true WHERE nonce=$1 AND usado=false AND expira_en > NOW()
// RETURNING id  --> si 0 filas devueltas, nonce inválido/expirado
```

### Device Hashes (`usuarios.device_hashes` — jsonb, máx. 5)
```js
// El checkin exige que device_hash ya esté registrado en el array del usuario
// Se registra en el upsert/login: COALESCE merge del array
// Si device_hash no está registrado -> 403 FORBIDDEN
```

---

## PRESENCIA FÍSICA — HAVERSINE (ADR-024)

```js
// Radio terrestre exacto usado en el código:
const R = 6371008.8; // metros

function haversine(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Radios adaptativos por tipo de destino:
// naturaleza / aventura / keyword rural: 250m
// parque / evento:                       150m
// festival / deporte:                    200m
// urbano general / default:             100m
// blog:                                 RECHAZADO (no aplica)

// Zona rural: por subcategoría, keyword O densidad (≤3 vecinos en bbox 0.02°)
// Bono rural: +20 XP PLANO (suma al total, SIN multiplicador ni amuleto ni fama)
```

### Anti-spoofing (todos deben cumplirse)
```
accuracy <= 150m
velocidad entre checkins consecutivos <= 69.4 m/s (250 km/h)
cooldown entre visitas: 90 segundos
tope diario: 30 visitas/24h
coordenadas (0, 0): RECHAZADAS
```

---

## REFERIDOS MULTINIVEL (5 niveles)

```js
// Reparto sobre xp ganado en la acción (no sobre xp_total)
// Porcentajes: L1=10%, L2=5%, L3=3%, L4=2%, L5=1% — todos con FLOOR
// Tope por ancestro: referidos_directos_contados < 500
// CTE recursiva de máx. 5 niveles sobre la columna referido_por

// Código de referido: 6 chars del alfabeto 'abcdefghjkmnpqrstuvwxyz23456789'
// (sin ambiguos: 0/O, 1/l/I removidos)
// Se genera al primer pedido; hasta 6 reintentos por colisión
// ON CONFLICT DO UPDATE: NO toca referido_por (para no sobreescribir árbol)
// Auto-referido -> 400

// Estado actual: backend IMPLEMENTADO; captura de ?ref= en registro ROTA
// (registro.html no existe, nadie captura ?ref= en el frontend)

// 14 acciones que disparan repartirXpReferidos:
// voto_wayfarer, checkin, chatXp, pcmXp, foto, foto_voto,
// album_crear, album_agregar_foto, autor_original, comentario,
// resena, guardado, visita, rating
```

---

## CROMOS (Coleccionables)

```js
// Drop: 15% de probabilidad por acción que reparte XP
// if (Math.random() >= 0.15) { /* sin cromo */ }

// Rareza por roll:
// dorado:  random < 0.07
// epico:   random < 0.25
// raro:    random < 0.55
// comun:   resto

// Garantía épica: capacidades.cromo_garantia === 'epico'
// -> fuerza épico o dorado y consume el flag

// Persistencia: UPSERT en usuarios_cromos con cantidad + 1
// Tablas: cromos_catalogo, usuarios_cromos, cromo_intercambios

// Intercambio (cromo_intercambio):
// - requiere >= 2 copias del cromo
// - debita emisor, acredita receptor
// - máx 3/día
// - SOLO BACKEND (sin UI)
```

---

## MISIONES (28) — DAG server-side

Catálogo en `api/interacciones.js:214-548`. Cada misión tiene:
```js
{
  id: 'mis_primer_guardado',
  grupo: 'general',         // general | ciudad | categoria | fotos | artista
  nombre: '...',
  requiere: [],             // IDs de misiones prerrequisito (DAG)
  xp: 50,
  check: (ctx) => boolean  // evaluación server-side con datos del usuario
}
```

**Grupos y conteos:**
- `general`: 11 misiones
- `ciudad`: 3 misiones
- `categoria`: 2 misiones
- `fotos`: 6 misiones
- `artista`: 6 misiones

**NO existen** misiones de tipo `pandilla` en el código. El juego colectivo va por retos de Parche.

---

## LOGROS (30) — con rareza global runtime

Catálogo en `api/interacciones.js:579-864`. Cada logro tiene:
```js
{
  id: 'logr_critico_10',
  grupo: 'general',          // general | coleccion | fotos | ciudad
  tier: 'bronce',            // bronce | plata | oro | platino
  xp: 100,
  nombre: '...',
  check: (ctx) => boolean
}
```

**Rareza global** se calcula en runtime con `jsonb_object_keys` sobre usuarios activos (api/interacciones.js:1639).

**Grupos y conteos:** general 12, coleccion 6, fotos 7, ciudad 5 = 30 total.

---

## FACCIONES

```js
// 4 opciones: 'exploradores' | 'curadores' | 'creadores' | 'artistas'
// CHECK constraint en usuarios.faccion

// Primera elección: UPDATE WHERE faccion IS NULL (gratis)
// Cambio: 500 XP + cooldown 15 días (faccion_elegida_en)
//         requiere email_verificado = true
// 429 COOLDOWN_FACCION | 402 PUNTOS_INSUFICIENTES

// Ranking: GET tipo=faccion_ranking
// -> agregado por facción + top 3 por facción con ROW_NUMBER

// SOLO DOCUMENTADO: afinidad de Parche (x1.3/x1.15/x1.0) y control territorial por ciudad
// 0 coincidencias de "afinidad" en el código actual
```

---

## VOCACIONES (Mundo Artistas)

```js
// 4 vocaciones acumulables, TODAS se desbloquean al nivel 5
// 'musico' | 'cine' | 'artista_grafico' | 'escritor'

// Persistencia: usuarios.vocaciones jsonb (solo guarda claves activadas)
// Toggle: POST tipo=vocacion_activar
// Gate de nivel: 403 si nivelActual < 5
// 6 misiones del grupo 'artista' asociadas
```

---

## PARCHES (PANDILLAS) — Clanes de usuarios

```js
// Nombre visible en UI: "Parches"
// Nombre en API/BD: pandillas / pandilla_* (NO cambiar)

// Fundar: nivel >= 14 + email_verificado
// Máximo: 10 miembros activos por Parche
// Fama: pandillas.fama_total += ROUND(xp_ganado * 0.10) por cada acción de miembro
// trompeta_fama: duplica la fama por 24h (capacidades.fama_x2_hasta)

// Retos: pandilla_retos(descripcion, xp_objetivo, xp_actual, ventana_horas)
// Moderación de miembros: pandilla_salir -> activo=false (no DELETE)
```

---

## WAYFARER / ACTIVOS OCULTOS

```js
// Flujo completo:
// 1. Solicitar nonce: GET ?tipo=geo_nonce_solicitar
// 2. Proponer: POST tipo=activo_oculto_proponer (requiere email_verificado, sin gate de nivel)
// 3. Votar: POST tipo=activo_oculto_votar (requiere JWT + email_verificado + nivel >= 5 + 1 voto/activo)
//    -> XP: +5 (tope 30 XP/día)
//    -> Quórum ±3: votos_favor - votos_contra >= 3 -> aprobado; <= -3 -> rechazado
//    -> Estado se recalcula en la misma sentencia SQL del voto
// 4. Checkin: POST tipo=activo_oculto_checkin (requiere JWT + nonce + device_hash + geocerca + cooldown 90s)
//    -> XP: +15
//    -> SOLO BACKEND (sin UI actualmente)
// 5. Moderar (admin): POST admin recurso=activos_ocultos tipo=activo_oculto_moderar
//    -> +50 XP al proponente al aprobar (con reparto a referidos)
//    -> rechazar: 0 XP

// Estado rechazado derivado: activo_oculto con >30 días sin votos suficientes
```

---

## CONSUMIBLES (13) — Tienda

| Clave | Precio XP | Efecto en capacidades |
|---|---|---|
| `pin_cromado` | 250 | `pin_mapa_hasta` (timestamp) |
| `vitrina_estelar` | 300 | `vitrina_estelar_hasta` (timestamp) |
| `amuleto_x2` | 350 | `multiplicador_x2_usos` += 5 |
| `imantador_cromos` | 400 | `cromo_garantia = 'epico'` |
| `cuaderno_expedicion` | 450 | `albums_extra` += N |
| `pergamino_mapa` | 500 | `mapas_extra` += N |
| `trompeta_fama` | 500 | `fama_x2_hasta` (timestamp) |
| `perfil_tema_oscuro` | 500 | permanente (perfil cosmético) |
| `pluma_inspirada` | 600 | `permiso_arte` = true |
| `perfil_marco_dorado` | 700 | permanente |
| `sala_efimera` | 800 | `salas_efimeras` += 1 |
| `perfil_banda_artista` | 900 | permanente |
| `pase_vip` | 1500 | `vip_hasta` (timestamp) |

```js
// comprar_consumible:
// - gate: xp_total >= precio
// - máx 5 compras/día
// - ledger en compra_consumibles (append-only)
// - devuelve nivel_anterior, nivel_nuevo, bajo_nivel

// usar_consumible:
// - ledger en consumo_consumibles (append-only)
// - efectos en capacidades via merge JSONB
// - los 3 perfil_* son permanentes (no tienen timestamp)
```

---

## SENDEROS DE ESPECIALIZACIÓN (5)

Calculados en runtime por `GET ?tipo=tabla_destino`. FAMA_TIERS: Semilla 0 / Aprendiz 100 / Practicante 250 / Especialista 450 / Maestro 700.

| Sendero | Cálculo de fama |
|---|---|
| Explorador | SUM(xp_ganado) de visitas + guardados activos |
| Crítico | SUM(xp_ganado) de resena + rating |
| Organizador | n_mapas×40 + n_destinos×5 |
| Audiovisual | SUM(xp_ganado) de foto + n_albumes_geo×30 + n_videos×35 |
| Parche | pandillas.fama_total de la pandilla activa (sin Parche → nivel 0) |

---

## CASAS Y CLASES RISING STAR (ADR-038 — working tree, migración 024 pendiente Neon)

```js
// Casas: condor | jaguar | delfin (campo usuarios.casa existente)
// Factor por población dominante en la Casa (runtime):
//   dominante  (>45% de la Casa):  xp × 0.85
//   equilibrada (25-45%):          xp × 1.00
//   rezagada   (<25%):             xp × 1.30
// Tributación al cofre: 10% del xp_final -> casas_cofre.xp_cofre_total (best-effort)

// Clases Rising Star: cartografo | cronista | explorador
// BONUS_CLASE: cartografo=0.08 / cronista=0.10 / explorador=0.07
// XP_NIVEL_CLASE: [0,100,250,500,900,1400,2100,3000,4200,5700,7500] (11 umbrales)
// xp_clase += xp_final * 0.50 (50% del xp_final va a la clase)

// clase_elegir: primera elección gratis; cambio = 300 XP + cooldown 30 días; sin gate de nivel

// Helper único: contextoXpE / calcularXpFinal / calcularNivelClase + acreditarClaseYCofre
// Se aplica en 14 acciones de la whitelist (excluidos cobros y bonos a terceros)
// Los UPDATE xp_total siguen inline para preservar contadores
```

---

## ESTADOS DE IMPLEMENTACIÓN — RESUMEN PARA PROGRAMAR

### ✅ IMPLEMENTADO (código en producción lógica / working tree)
- 20 niveles / 4 eras derivados
- Economía de XP con de-nivel
- 13 consumibles + tienda
- 28 misiones + 30 logros
- 5 senderos
- Cromos (drop/rareza/garantía)
- Parches (fama + retos)
- Sesión JWT + nonce + device_hash
- Email verificado (Resend)
- Presencia física Haversine (backend)
- Referidos multinivel (backend)
- Wayfarer proponer/votar
- Wayfarer moderación admin
- Facciones (elección/cambio/ranking)
- Vocaciones (4 @ nivel 5)
- Multiplicador de Origen ADR-058
- Casas + Clases Rising Star (working tree)

### ⚠️ ROTO (código existe pero flujo end-to-end falla)
- **Presencia física desde UI:** `marcarVisitado` en `usuario-session.js:598-609` NO envía `Authorization: Bearer <jwt>` ni `nonce`. Fix: solicitar geo-nonce previo + header JWT.
- **Captura de referidos:** `registro.html` NO existe; nadie captura `?ref=` del query string. Fix: crear `registro.html` + inyectar `?ref=` en el upsert de usuario.

### 🔒 SOLO BACKEND (sin UI)
- Intercambio de cromos (`cromo_intercambio`)
- Checkin de Activo Oculto (`activo_oculto_checkin`)

### 📋 SOLO DOCUMENTADO (sin código)
- Afinidad de Parche a facción (×1.3/×1.15/×1.0)
- Control territorial por ciudad
- Ligas/temporadas
- Vitrina pública extendida
- Patrocinios (sponsors/canjes)

### 🔮 SPEC v6.1 (especificación formal, sin migración)
- 40 niveles / 5 eras (extensión)
- Contratos P2P (`contratos_p2p`)
- Soberanía Territorial + Upgrades de Parche (`parche_upgrades`)
- Tithe/Diezmo de Clan (1-10%)
- "Own the Spot" / Director del Spot (dividendo 10% XP)
- A2A Agent Card + LangChain (End Game N33+)
- RL UI Layout adaptativo (Era Mito)

### 🚫 PENDIENTE BLOQUEANTE (no deployar sin esto)
- Migración 016 en Neon (`activos_ocultos`, `geo_nonces`, columnas de referidos/facciones en `usuarios`)
- Migración 024 en Neon (Casas/Clases: `casas_cofre`)
- Variables de entorno: `SESSION_JWT_SECRET`, `RESEND_API_KEY`, `SITE_URL`

---

## PATRONES DE CÓDIGO FRECUENTES

### Patrón estándar de un handler GET en interacciones.js
```js
if (tipo === 'mi_nuevo_handler') {
  const { usuario_id } = req.query;
  if (!usuario_id) return res.status(400).json({ success: false, error: 'Falta usuario_id', code: 'MISSING_PARAM' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT campo FROM tabla WHERE usuario_id = ${usuario_id} AND activo = true
    `;
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[mi_nuevo_handler]', err.message);
    return res.status(500).json({ success: false, error: err.message, code: 'DB_ERROR' });
  }
}
```

### Patrón estándar de un handler POST (tipo2) en interacciones.js
```js
if (tipo2 === 'mi_nueva_accion') {
  const { usuario_id, campo1, campo2 } = req.body;
  if (!usuario_id || !campo1) return res.status(400).json({ success: false, error: 'Parametros requeridos', code: 'MISSING_PARAM' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    // Validaciones de negocio primero (sin tocar BD si hay error)
    const [usuario] = await sql`SELECT xp_total, nivel FROM usuarios WHERE id = ${usuario_id}`;
    if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado', code: 'NOT_FOUND' });
    // Transacción principal
    const [result] = await sql`
      UPDATE usuarios SET xp_total = xp_total + ${XP_ACCION}
      WHERE id = ${usuario_id}
      RETURNING xp_total
    `;
    return res.json({ success: true, xp_ganado: XP_ACCION, xp_total: result.xp_total });
  } catch (err) {
    console.error('[mi_nueva_accion]', err.message);
    return res.status(500).json({ success: false, error: err.message, code: 'DB_ERROR' });
  }
}
```

### Merge JSONB (patrón obligatorio para campos JSONB)
```js
// Correcto:
await sql`
  UPDATE usuarios SET
    capacidades = COALESCE(capacidades, '{}'::jsonb)
      || jsonb_build_object('mi_campo', ${valor})
  WHERE id = ${usuario_id}
`;

// INCORRECTO (nunca hacer esto):
await sql`UPDATE usuarios SET capacidades = ${jsonString} WHERE id = ${usuario_id}`;
```

### Verificar gate de nivel
```js
const [u] = await sql`SELECT xp_total FROM usuarios WHERE id = ${usuario_id}`;
const { nivel } = calcularNivel(u.xp_total);
if (nivel < NIVEL_REQUERIDO) {
  return res.status(403).json({ success: false, error: 'Nivel insuficiente', code: 'NIVEL_INSUFICIENTE' });
}
```

---

## CÓDIGOS DE ERROR ESTÁNDAR

```
MISSING_PARAM          # Parámetro requerido faltante
NOT_FOUND              # Recurso no existe
FORBIDDEN              # Sin permisos (device_hash no registrado, etc.)
NIVEL_INSUFICIENTE     # Nivel mínimo no alcanzado
EMAIL_NO_VERIFICADO    # Requiere email_verificado = true
PUNTOS_INSUFICIENTES   # XP insuficiente para la acción
COOLDOWN_FACCION       # 15 días entre cambios de facción
COOLDOWN_VISITA        # 90 segundos entre visitas
LIMITE_DIARIO          # Tope diario alcanzado
FUERA_DE_RANGO         # Fuera de geocerca
PRECISION_INSUFICIENTE # accuracy > 150m
VELOCIDAD_EXCESIVA     # > 69.4 m/s entre checkins
TOKEN_INVALIDO         # JWT inválido
TOKEN_EXPIRADO         # JWT expirado
NO_TOKEN               # Header Authorization ausente
NONCE_INVALIDO         # Nonce inválido, usado o expirado
DUPLICATE              # Acción ya realizada (409)
DB_ERROR               # Error de base de datos (500)
```

---

## MIGRACIONES — PLANTILLA

```sql
-- NNN_nombre_descriptivo.sql
-- Acumulativa e idempotente (ADR-008)

BEGIN;

-- Nuevas columnas (siempre IF NOT EXISTS o DO $$ BLOCK)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'mi_columna'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN mi_columna tipo DEFAULT valor;
  END IF;
END $$;

-- Nuevas tablas
CREATE TABLE IF NOT EXISTS mi_tabla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  campo VARCHAR(50) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mi_tabla_usuario ON mi_tabla(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mi_tabla_activo ON mi_tabla(activo) WHERE activo = true;

COMMIT;
```

---

## CONTEXTO DE NEGOCIO (para entender prioridades)

- **Usuario objetivo:** turista/viajero colombiano que descubre destinos en Colombia; gamificación incentiva la visita física y la creación de contenido de calidad.
- **Mecánica core:** ganar XP → subir nivel → desbloquear capacidades → comprar consumibles (gasto de XP) → posible de-nivel.
- **Anti-farming:** todo está protegido con topes diarios, dedup por PK, cooldowns, quórum y verificación de presencia física. No asumir buena fe del cliente.
- **Arquitectura de bajo costo:** serverless con 0 costo base hasta cierto volumen; el límite de 8 funciones es inamovible hasta migrar a un plan de pago.
- **Prioridades actuales:** (1) aplicar migración 016 en Neon, (2) corregir los dos flujos ROTOS, (3) conectar UI de checkin y cromo_intercambio, (4) features de SPEC v6.1.
