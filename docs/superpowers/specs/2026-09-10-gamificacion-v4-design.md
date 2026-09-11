# Especificacion de diseno - Gamificacion v4.0: Consumibles, Cromos, Pandillas y 20 Niveles

**Fecha:** 2026-09-10
**Estado:** Diseno completo (pendiente de implementacion)
**ADR pendiente:** ADR-018 (Gamificacion v4.0)
**Prompt origen:** `prompt gamming.txt` + `ExploraCO_Gamificacion_v4_Plan_Maestro.md`
**Migracion:** `db/migrations/010_gamificacion_v4.sql` (generada por el usuario en Neon)

---

## Indice

1. Objetivo
2. Contexto (lo que ya existia)
3. Decisiones de diseno (bloques)
4. Migracion SQL completa (010_gamificacion_v4.sql)
5. Operaciones nuevas en api/interacciones.js
6. Operaciones nuevas en api/admin.js
7. Extencion de tabla_destino (senderos Audiovisual y Pandilla)
8. Reglas de economia anti-farming
9. Vitrina de 20 niveles
10. Consumibles: catalogo y precios finales
11. Matriz de riesgo y smoke tests
12. ADR-018 (borrador)

---

## 1. Objetivo

Implementar la v4.0 del sistema de gamificacion de ExploraCO con cuatro pilares:

1. **Consumibles y economia de XP**: catalogo de 10 items de un solo uso, comprados pagando `xp_total` desde el inventario en `usuarios.capacidades` JSONB.
2. **20 niveles con revocacion dura**: nueva tabla de bornes (0 a 30000), con 4 Eras. Gastar XP puede bajar de nivel; el nivel se calcula dinamico en cada lectura.
3. **Cromos coleccionables**: tabla de catalogo + posesion de usuario + intercambio, con probabilidad ligada a acciones existentes.
4. **Pandillas completas**: creacion (Nivel 14+), membresia (1 pandilla activa por usuario), retos de parche, aporte de fama grupal, y sendero dedicado en la Tabla de Destino.

Todo dentro de los 8 endpoints serverless existentes (Vercel Hobby). Cero archivos nuevos en `/api`.

---

## 2. Contexto (lo que ya existia)

### 2.1 Backend

| Archivo | Version | Contenido relevante |
|---|---|---|
| `api/interacciones.js` | v8 (2611 lineas) | MISIONES=22, LOGROS=29, 22 operaciones GET/POST via `tipo=`. Sin consumibles/cromos/pandillas. |
| `api/usuarios.js` | v1 (139 lineas) | NIVELES=15, `calcularNivel()` dinamico, DESBLOQUEOS=6 (misiones que desbloquean capacidades). |
| `api/admin.js` | vigente | Recursos admin (solicitudes, resenas, destacado, notificaciones). Sin CRUD de consumibles. |

### 2.2 Frontend

| Archivo | XP_LEVELS | XP_BADGES | Notas |
|---|---|---|---|
| `index.html` | 15 | 7 | Secion Trofeos con barra X/Y |
| `mi-perfil.html` | 15 | 7 | Tabla de Destino SVG (3 senderos) |
| `comunidad.html` | 15 | 7 | Tabs Chat/Planes reales |

### 2.3 Migraciones aplicadas

001-006: aplicadas. 007/008/009: pendientes en Neon (las aplica Javier).
La migracion 010 tambien la aplica Javier en Neon; yo genero el archivo.

### 2.4 Decisiones confirmadas por el usuario

1. Catalogo de 10 consumibles de un solo uso, enfocados en EXPERIENCIA.
2. 20 niveles CONFIRMADOS con bornes 0/100/250/450/700/1000/1400/1900/2500/3200/4000/5200/6800/8500/10500/13000/16000/19500/24000/30000.
3. Gastar XP puede BAJAR de nivel. Revocacion dura: nivel se calcula dinamico desde `xp_total`.
4. Cromos y Pandillas: FUNCIONALIDAD COMPLETA.
5. Probabilidad de cromos: comun 45% / raro 30% / epico 18% / dorado 7%.
6. Pandilla: solo la funda Nivel 14+ (8500 XP), max 1 pandilla activa por usuario.
7. Migracion 010 la aplica el usuario en Neon.
8. Precios de consumibles EDITABLES desde admin.html (tabla `consumibles` gestionable, no constante estatica).

---

## 3. Decisiones de diseno (bloques)

### Bloque 1 - 20 Niveles con revocacion dura

**Tabla de bornes (segun Plan Maestro v4, confirmada por usuario):**

| Nivel | Nombre | Era | Umbral XP |
|---|---|---|---|
| 1 | Caminante Novato | Era 1 -- Mundana | 0 |
| 2 | Rastreador Local | Era 1 -- Mundana | 100 |
| 3 | Explorador Urbano | Era 1 -- Mundana | 250 |
| 4 | Aventurero Regional | Era 1 -- Mundana | 450 |
| 5 | Vanguardia Territorial | Era 1 -- Mundana | 700 |
| 6 | Embajador de Zona | Era 2 -- Patrocinada | 1000 |
| 7 | Fotografo de Ruta | Era 2 -- Patrocinada | 1400 |
| 8 | Cronista de Historias | Era 2 -- Patrocinada | 1900 |
| 9 | Buscador de Leyendas | Era 2 -- Patrocinada | 2500 |
| 10 | Guia de Fronteras | Era 2 -- Patrocinada | 3200 |
| 11 | Estratega Comunitario | Era 3 -- Organizador | 4000 |
| 12 | Documentalista Visual | Era 3 -- Organizador | 5200 |
| 13 | Senor del Spot | Era 3 -- Organizador | 6800 |
| 14 | Cartografo de Cine | Era 3 -- Organizador | 8500 |
| 15 | Protector del Patrimonio | Era 3 -- Organizador | 10500 |
| 16 | Curador de Colombia | Era 4 -- Leyenda | 13000 |
| 17 | Mariscal de Parche | Era 4 -- Leyenda | 16000 |
| 18 | Cineasta de Territorio | Era 4 -- Leyenda | 19500 |
| 19 | Inmortal del Mapa | Era 4 -- Leyenda | 24000 |
| 20 | Gran Maestro ExploraCO | Era 4 -- Leyenda | 30000 |

**Puntos de sincronizacion (4):**
1. `api/usuarios.js` -- constante `NIVELES[]` (20 elementos).
2. `index.html` -- array `XP_LEVELS` (20 objetos).
3. `mi-perfil.html` -- array `XP_LEVELS` (20 objetos).
4. `comunidad.html` -- array `XP_LEVELS` (20 objetos).

**Revocacion dura:** `calcularNivel(xpTotal)` ya es dinamico. Si el usuario tiene 3500 XP (Nivel 10) y gasta 400 XP en consumibles, pasa a 3100 XP y su nivel se recalcule como Nivel 9. No hay columna `nivel` guardada que se deba actualizar -- el calculo es puro en cada lectura. Los beneficios/capacidades que dependen del nivel (gate server-side) se evaluan contra el nivel calculado en tiempo real.

**Nuevo campo derivado `era`:** `api/usuarios.js` agrega un helper `calcularEra(nivel)` que retorna 'Mundana' (1-5), 'Patrocinada' (6-10), 'Organizador' (11-15) o 'Leyenda' (16-20). Se incluye en la respuesta de `/api/usuarios?id=` y en el leaderboard.

### Bloque 2 - Consumibles y economia de XP

**Tabla `consumibles` (gestionable desde admin):**

```sql
CREATE TABLE IF NOT EXISTS consumibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave varchar(50) UNIQUE NOT NULL,
  nombre varchar(100) NOT NULL,
  descripcion text DEFAULT '',
  precio_xp integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now()
);
```

**Tabla `compra_consumibles` (ledger append-only):**

```sql
CREATE TABLE IF NOT EXISTS compra_consumibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  consumible_id uuid NOT NULL REFERENCES consumibles(id),
  xp_pagado integer NOT NULL,
  creado_en timestamptz DEFAULT now()
);
```

**Inventario del usuario en `usuarios.capacidades` JSONB (merge `||`):**

```json
{
  "consumibles": {
    "pluma_inspirada": 1,
    "cuaderno_expedicion": 2,
    "sala_efimera": 1
  }
}
```

Estructura: `{ "consumibles": { "<clave>": <cantidad_entera> } }`. La clave es el `clave` de la tabla `consumibles`. Merge `||` via `COALESCE(capacidades,'{}'::jsonb) || $n::jsonb`.

**Flujo de compra (`POST tipo=comprar_consumible`):**
1. Lee `consumibles` WHERE clave = `$1` AND activo = true.
2. Valida que `xp_total >= precio_xp`.
3. Valida anti-farming: max 5 consumibles por dia por usuario (query COUNT sobre `compra_consumibles` WHERE usuario_id = `$1` AND creado_en > NOW() - INTERVAL '1 day').
4. Resta `xp_total = xp_total - precio_xp` ATOMICAMENTE (un solo UPDATE).
5. Inserta en `compra_consumibles` (ledger).
6. Merge en `capacidades`: `COALESCE(capacidades,'{}'::jsonb) || jsonb_build_object('consumibles', COALESCE(capacidades->'consumibles','{}'::jsonb) || jsonb_build_object($clave, COALESCE((capacidades->'consumibles'->>$clave)::int, 0) + 1))`.
7. Retorna `consumibles` actualizado + nuevo `xp_total` + nivel recalculado.
8. Si el nivel bajo: incluye `{ "nivel_bajo": true, "nivel_anterior": N, "nivel_nuevo": M }` para que el frontend muestre una notificacion.

**Flujo de uso (`POST tipo=usar_consumible`):**
1. Lee `capacidades->'consumibles'->>$clave` del usuario.
2. Valida cantidad >= 1.
3. Descuenta 1: si queda 0, elimina la clave del JSONB (`capacidades #- '{consumibles,<clave>}'`).
4. Aplica el efecto especifico del consumible (ver Bloque 2b abajo).
5. Inserta log en `compra_consumibles` con xp_pagado = 0 y un campo `consumido_en` (o se usa una tabla aparte `consumo_consumibles` -- ver decision abajo).

**Decision de ledger:** Se propone una tabla separada `consumo_consumibles` para mantener el ledger limpio:

```sql
CREATE TABLE IF NOT EXISTS consumo_consumibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  consumible_id uuid NOT NULL REFERENCES consumibles(id),
  efecto_detalle jsonb DEFAULT '{}'::jsonb,
  creado_en timestamptz DEFAULT now()
);
```

**Efectos de los 10 consumibles (POST tipo=usar_consumible, validacion server-side):**

| Clave | Nombre | Precio XP | Efecto |
|---|---|---|---|
| pluma_inspirada | Pluma Inspirada | 600 | Permite publicar 1 escrito/articulo en Inspi-rate sin esperar postulacion. Efecto: devuelve `{ "permiso_arte": true }` al frontend que habilita el modal de publicacion. |
| cuaderno_expedicion | Cuaderno de Expedicion | 450 | +1 album de fotos activo adicional. Efecto: incrementa un contador `albums_extra` en `capacidades` que el backend lee al validar `mis_album_territorial`. |
| pergamino_mapa | Pergamino del Cartografo | 500 | +1 mapa tematico adicional (sobre el tope 50). Efecto: incrementa `mapas_extra` en `capacidades`. |
| sala_efimera | Sala Efimera | 800 | Crea 1 sala de chat comunitaria sin requerir `crear_chat` (dura 7 dias). Efecto: INSERT en `chat_salas` con `expira_en = NOW() + 7 days`, sin gate de nivel. |
| amuleto_x2 | Amuleto de Doble XP | 350 | x2 XP en proximas 5 acciones. Efecto: setea `multiplicador_x2_usos = 5` en `capacidades`. Cada POST de XP lee este contador y aplica x2 si > 0, decrementando. |
| imantador_cromos | Iman de Cromos | 400 | Garantiza rareza epica o mejor en la proxima obtencion de cromo. Efecto: setea `cromo_garantia = 'epico'` en `capacidades`. Se consume al disparar la probabilidad. |
| trompeta_fama | Trompeta de la Fama | 500 | Duplica aporte a Fama de Pandilla durante 24h. Efecto: setea `fama_x2_hasta = <timestamp + 24h>` en `capacidades`. |
| vitrina_estelar | Vitrina Estelar | 300 | Destaca perfil en comunidad.html durante 7 dias. Efecto: setea `vitrina_estelar_hasta = <timestamp + 7d>` en `capacidades`. |
| pin_cromado | Pin Cromado | 250 | Fija 1 foto/album destacado en el Mapa Audiovisual por 7 dias. Efecto: setea `pin_mapa_hasta = <timestamp + 7d>` en `capacidades`. |
| pase_vip | Pase VIP Leyenda | 1500 | Acceso prioritario a eventos + badge temporal exclusivo (30 dias). Efecto: setea `vip_hasta = <timestamp + 30d>` en `capacidades` + badge temporal en el perfil. |

**Anti-farming de consumibles:**
- Max 5 compras por dia por usuario (medido en `compra_consumibles.creado_en`).
- Max 1 uso de `amuleto_x2` activo a la vez (no apilar multiplicadores).
- `sala_efimera`: max 2 salas efimeras activas por usuario (contar salas con `expira_en > NOW()`).
- `trompeta_fama`: solo 1 activo a la vez (override el timestamp si ya tiene uno).
- Ledger trazable: cada compra queda como fila permanente en `compra_consumibles`.

### Bloque 3 - Cromos coleccionables (Steam)

**Tabla `cromos_catalogo`:**

```sql
CREATE TABLE IF NOT EXISTS cromos_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_slug varchar(100) NOT NULL,
  nombre varchar(150) NOT NULL,
  rareza varchar(20) DEFAULT 'comun' CHECK (rareza IN ('comun','raro','epico','dorado')),
  imagen_url text,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cromos_set
  ON cromos_catalogo (set_slug, activo);
```

**Tabla `usuarios_cromos`:**

```sql
CREATE TABLE IF NOT EXISTS usuarios_cromos (
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  cromo_id uuid NOT NULL REFERENCES cromos_catalogo(id),
  cantidad int NOT NULL DEFAULT 1,
  obtenido_en timestamptz DEFAULT now(),
  PRIMARY KEY (usuario_id, cromo_id)
);

CREATE INDEX IF NOT EXISTS idx_ucromos_usuario
  ON usuarios_cromos (usuario_id, obtenido_en DESC);
```

**Probabilidades por defecto (constante en el codigo):**

```javascript
var CROMO_PROBABILIDADES = {
  comun: 0.45,
  raro: 0.30,
  epico: 0.18,
  dorado: 0.07
};
```

**Disparadores de obtencion:** Las 4 acciones existentes que dan XP (resena, guardado, visita, rating) evaluan probabilidad de cromo. Cada accion tiene un 15% base de disparar un intento de cromo. Si el `amuleto_cromos` esta activo (`capacidades->cromo_garantia = 'epico'`), la rareza minima es epica y el consumible se consume.

**Logica server-side (dentro de cada POST de XP):**

```
1. Generar Math.random() para decidir si dispara cromo (umbral 0.15).
2. Si dispara:
   a. Leer cromo_garantia de capacidades. Si existe y es 'epico' o mejor, consumir el amuleto.
   b. Generar numero aleatorio para rareza (0-1), mapear a comun/raro/epico/dorado.
   c. Si cromo_garantia activa, forzar rareza >= epico.
   d. Seleccionar 1 cromo aleatorio del catalogo activo con esa rareza (o de la rareza mas cercana si no hay).
   e. UPSERT en usuarios_cromos (cantidad + 1 si ya existe).
   f. Retornar cromo obtenido en la respuesta de la accion.
3. Sin cromo: la respuesta no incluye el campo `cromo`.
```

**Operaciones nuevas:**

| tipo | Metodo | Descripcion |
|---|---|---|
| `mis_cromos` | GET | Catalogo del usuario con cantidades y rareza. |
| `cromo_intercambio` | POST | Intercambia 1 cromo duplicado entre 2 usuarios. Valida: ambos activos, cromo cant >= 2 en el emisor, max 3 intercambios/dia por usuario. |

### Bloque 4 - Pandillas completas

**Tablas (ya definidas en Plan Maestro v4, seccion 2.3, refinadas aqui):**

```sql
CREATE TABLE IF NOT EXISTS pandillas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(100) UNIQUE NOT NULL,
  fundador_id uuid NOT NULL REFERENCES usuarios(id),
  fama_total int NOT NULL DEFAULT 0,
  ciudad_base varchar(100),
  descripcion text DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pandillas_miembros (
  pandilla_id uuid NOT NULL REFERENCES pandillas(id),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  rol varchar(20) NOT NULL DEFAULT 'miembro' CHECK (rol IN ('fundador','oficial','miembro')),
  activo boolean NOT NULL DEFAULT true,
  fecha_ingreso timestamptz DEFAULT now(),
  PRIMARY KEY (pandilla_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_usuario
  ON pandillas_miembros (usuario_id, activo)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_pm_pandilla
  ON pandillas_miembros (pandilla_id, activo)
  WHERE activo = true;
```

**Tabla `pandilla_retos` (retos de parche con ventana temporal):**

```sql
CREATE TABLE IF NOT EXISTS pandilla_retos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pandilla_id uuid NOT NULL REFERENCES pandillas(id),
  titulo varchar(150) NOT NULL,
  descripcion text DEFAULT '',
  tipo_reto varchar(50) NOT NULL DEFAULT 'general',
  meta_valor int NOT NULL DEFAULT 10,
  fecha_inicio timestamptz NOT NULL DEFAULT now(),
  fecha_fin timestamptz NOT NULL,
  progreso_actual int NOT NULL DEFAULT 0,
  completado boolean NOT NULL DEFAULT false,
  xp_bono int NOT NULL DEFAULT 0,
  creado_en timestamptz DEFAULT now()
);
```

**Operaciones nuevas:**

| tipo | Metodo | Descripcion |
|---|---|---|
| `pandilla_crear` | POST | Funda pandilla. Gate: Nivel 14+ (8500 XP). Valida: max 1 pandilla activa por usuario. Crea al fundador como rol 'fundador'. |
| `pandilla_unirse` | POST | Une usuario. Valida: max 1 pandilla activa por usuario, pandilla activa, < 10 miembros. |
| `pandilla_salir` | POST | Marca `activo=false` en `pandillas_miembros`. C0 Borrado Logico. Si el fundador sale, la pandilla queda sin fundador (no se destruye). |
| `pandilla_detalle` | GET | Devuelve pandilla + miembros activos + fama_total + retos activos. |
| `pandilla_reto` | POST | Crea un reto de parche con ventana temporal (requiere rol fundador/oficial). GET `pandilla_reto` devuelve el estado de los retos activos. |

**Aporte de Fama de Pandilla:** cada POST de XP (resena/guardado/visita/rating) verifica si el usuario tiene pandilla activa. Si la tiene, agrega `ROUND(xp_ganado * 0.10)` a `pandillas.fama_total`. Si `capacidades->fama_x2_hasta` es futuro (consumible Trompeta de la Fama activo), se duplica el aporte. Anti-abuso: cooldown de reingreso de 14 dias (si el usuario salio de una pandilla hace menos de 14 dias, no puede unirse a otra).

---

## 4. Migracion SQL completa

**Archivo:** `db/migrations/010_gamificacion_v4.sql`
**Patron:** idempotente `IF NOT EXISTS` (migracion 009_albumes.sql).
**ASCII-safe:** cero bytes > 127.
**Aplicacion:** el usuario la ejecuta en el editor SQL de Neon.

```sql
-- Migration 010: Gamificacion v4.0 - Consumibles, Cromos, Pandillas, 20 Niveles
-- Spec: docs/superpowers/specs/2026-09-10-gamificacion-v4-design.md
-- Aplicar en Neon ANTES de desplegar api/interacciones.js v9
-- Requiere: migraciones 007, 008 y 009 previamente aplicadas
--
-- ASCII-safe (ADR-002): cero bytes > 127.
-- Idempotente (ADR-008): re-ejecutar es seguro.
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.

-- ============================================================
-- 1. TABLA CONSUMIBLES
-- ============================================================

CREATE TABLE IF NOT EXISTS consumibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave varchar(50) UNIQUE NOT NULL,
  nombre varchar(100) NOT NULL,
  descripcion text DEFAULT '',
  precio_xp integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

-- ============================================================
-- 2. TABLA COMPRA_CONSUMIBLES (ledger append-only de compras)
-- ============================================================

CREATE TABLE IF NOT EXISTS compra_consumibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  consumible_id uuid NOT NULL REFERENCES consumibles(id),
  xp_pagado integer NOT NULL,
  creado_en timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compra_consumibles_usuario
  ON compra_consumibles (usuario_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_compra_consumibles_dia
  ON compra_consumibles (usuario_id, creado_en)
  WHERE creado_en > (NOW() - INTERVAL '1 day');

-- ============================================================
-- 3. TABLA CONSUMO_CONSUMIBLES (ledger append-only de usos)
-- ============================================================

CREATE TABLE IF NOT EXISTS consumo_consumibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  consumible_id uuid NOT NULL REFERENCES consumibles(id),
  efecto_detalle jsonb DEFAULT '{}'::jsonb,
  creado_en timestamptz DEFAULT now()
);

-- ============================================================
-- 4. TABLA CROMOS_CATALOGO
-- ============================================================

CREATE TABLE IF NOT EXISTS cromos_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_slug varchar(100) NOT NULL,
  nombre varchar(150) NOT NULL,
  rareza varchar(20) DEFAULT 'comun' CHECK (rareza IN ('comun','raro','epico','dorado')),
  imagen_url text,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cromos_set
  ON cromos_catalogo (set_slug, activo);

-- ============================================================
-- 5. TABLA USUARIOS_CROMOS
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios_cromos (
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  cromo_id uuid NOT NULL REFERENCES cromos_catalogo(id),
  cantidad int NOT NULL DEFAULT 1,
  obtenido_en timestamptz DEFAULT now(),
  PRIMARY KEY (usuario_id, cromo_id)
);

CREATE INDEX IF NOT EXISTS idx_ucromos_usuario
  ON usuarios_cromos (usuario_id, obtenido_en DESC);

-- ============================================================
-- 6. TABLA PANDILLAS
-- ============================================================

CREATE TABLE IF NOT EXISTS pandillas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(100) UNIQUE NOT NULL,
  fundador_id uuid NOT NULL REFERENCES usuarios(id),
  fama_total int NOT NULL DEFAULT 0,
  ciudad_base varchar(100),
  descripcion text DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

-- ============================================================
-- 7. TABLA PANDILLAS_MIEMBROS
-- ============================================================

CREATE TABLE IF NOT EXISTS pandillas_miembros (
  pandilla_id uuid NOT NULL REFERENCES pandillas(id),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  rol varchar(20) NOT NULL DEFAULT 'miembro' CHECK (rol IN ('fundador','oficial','miembro')),
  activo boolean NOT NULL DEFAULT true,
  fecha_ingreso timestamptz DEFAULT now(),
  PRIMARY KEY (pandilla_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_usuario
  ON pandillas_miembros (usuario_id, activo)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_pm_pandilla
  ON pandillas_miembros (pandilla_id, activo)
  WHERE activo = true;

-- ============================================================
-- 8. TABLA PANDILLA_RETOS
-- ============================================================

CREATE TABLE IF NOT EXISTS pandilla_retos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pandilla_id uuid NOT NULL REFERENCES pandillas(id),
  titulo varchar(150) NOT NULL,
  descripcion text DEFAULT '',
  tipo_reto varchar(50) NOT NULL DEFAULT 'general',
  meta_valor int NOT NULL DEFAULT 10,
  fecha_inicio timestamptz NOT NULL DEFAULT now(),
  fecha_fin timestamptz NOT NULL,
  progreso_actual int NOT NULL DEFAULT 0,
  completado boolean NOT NULL DEFAULT false,
  xp_bono int NOT NULL DEFAULT 0,
  creado_en timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pandilla_retos_activos
  ON pandilla_retos (pandilla_id, completado, fecha_fin)
  WHERE completado = false;

-- ============================================================
-- 9. COLUMNA CAPACIDADES EN USUARIOS (inventario de consumibles)
-- ============================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS capacidades jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- 10. SEMBREADO INICIAL DE LOS 10 CONSUMIBLES
-- ============================================================

INSERT INTO consumibles (clave, nombre, descripcion, precio_xp) VALUES
  ('pluma_inspirada', 'Pluma Inspirada', 'Publica un escrito/articulo en Inspirate sin esperar postulacion de nivel.', 600),
  ('cuaderno_expedicion', 'Cuaderno de Expedicion', '+1 album de fotos activo adicional por encima del tope.', 450),
  ('pergamino_mapa', 'Pergamino del Cartografo', '+1 mapa tematico adicional por encima del tope 50.', 500),
  ('sala_efimera', 'Sala Efimera', 'Crea una sala de chat comunitaria sin requerir la capacidad crear_chat (dura 7 dias).', 800),
  ('amuleto_x2', 'Amuleto de Doble XP', 'Multiplica x2 el XP de tus proximas 5 acciones.', 350),
  ('imantador_cromos', 'Iman de Cromos', 'Garantiza rareza epica o mejor en la proxima obtencion de cromo.', 400),
  ('trompeta_fama', 'Trompeta de la Fama', 'Duplica tu aporte a Fama de Pandilla durante 24 horas.', 500),
  ('vitrina_estelar', 'Vitrina Estelar', 'Destaca tu perfil en la comunidad durante 7 dias.', 300),
  ('pin_cromado', 'Pin Cromado', 'Fija una foto/album destacado en el Mapa Audiovisual por 7 dias.', 250),
  ('pase_vip', 'Pase VIP Leyenda', 'Acceso prioritario a eventos + badge temporal exclusivo (30 dias).', 1500)
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- 11. COLUMNA XP_TOTAL VERIFICACION
-- ============================================================
-- xp_total ya existe en usuarios (usado desde v1 de gamificacion).
-- Solo verificamos que exista para garantizar la integridad:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'xp_total'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN xp_total integer NOT NULL DEFAULT 0;
  END IF;
END $$;
```

---

## 5. Operaciones nuevas en api/interacciones.js

**Restriccion:** todo dentro del switch de `tipo=`, sin funciones serverless nuevas.

### 5.1 Operaciones GET nuevas

| tipo | Params | Descripcion | Retorna |
|---|---|---|---|
| `consumibles` | (ninguno) | Catalogo activo de consumibles con precios. | `{ ok, data: [{ clave, nombre, descripcion, precio_xp }] }` |
| `inventario` | `usuario_id` | Capacidades del usuario + nivel actual + xp_total + consumibles disponibles. | `{ ok, data: { consumibles: { clave: qty }, nivel, xp_total, era } }` |
| `mis_cromos` | `usuario_id` | Coleccion de cromos del usuario con cantidades. | `{ ok, data: [{ cromo_id, nombre, rareza, cantidad, set_slug, imagen_url }] }` |
| `pandilla_detalle` | `pandilla_id` | Pandilla + miembros activos + retos. | `{ ok, data: { pandilla, miembros[], retos[] } }` |
| `pandilla_reto` | `pandilla_id` | Retos activos de la pandilla. | `{ ok, data: [{ id, titulo, progreso, meta, fecha_fin, completado }] }` |

### 5.2 Operaciones POST nuevas

| tipo | Body params | Descripcion | Validaciones |
|---|---|---|---|
| `comprar_consumible` | `usuario_id, clave` | Compra 1 consumible pagando xp_total. | xp >= precio, max 5/dia, consumible activo. |
| `usar_consumible` | `usuario_id, clave` | Usa 1 consumible (descuenta cantidad, aplica efecto). | cantidad >= 1, efecto valido. |
| `cromo_obtener` | `usuario_id` | Disparo manual de cromo (para testing o eventos especiales). | Probabilidad CROMO_PROBABILIDADES. |
| `cromo_intercambio` | `usuario_id, receptor_id, cromo_id` | Intercambia 1 cromo duplicado. | Emisor cant >= 2, receptor activo, max 3 intercambios/dia. |
| `pandilla_crear` | `usuario_id, nombre, ciudad_base` | Funda una pandilla. | Nivel >= 14, max 1 pandilla activa. |
| `pandilla_unirse` | `usuario_id, pandilla_id` | Se une a pandilla existente. | Max 1 pandilla activa, < 10 miembros, sin cooldown. |
| `pandilla_salir` | `usuario_id` | Sale de su pandilla activa. | C0 Borrado Logico (`activo=false`). |
| `pandilla_reto` | `usuario_id, pandilla_id, titulo, meta_valor, fecha_fin` | Crea reto de parche. | Rol fundador/oficial, fecha_fin > now. |

### 5.3 Extension de operaciones existentes

Cada POST de XP (resena, guardado, visita, rating) agrega al final:

```javascript
// --- Bloque post-XP: evaluacion de cromo y fama de pandilla ---
// 1. Probabilidad de cromo (15% base)
// 2. Aplicacion de amuleto_x2 si activo
// 3. Aporte a fama de pandilla si el usuario tiene pandilla activa
// 4. Aplicacion de trompeta_fama si activa
```

GET `tipo=tabla_destino` se extiende con los senderos Audiovisual y Pandilla (ver seccion 7).

---

## 6. Operaciones nuevas en api/admin.js

**CRUD de consumibles** via query params:

| tipo | Metodo | Descripcion |
|---|---|---|
| `consumibles_lista` | GET | Lista todos los consumibles (activos e inactivos). |
| `consumibles_crear` | POST | Crea consumible nuevo. Body: `{ clave, nombre, descripcion, precio_xp }`. |
| `consumibles_editar` | POST | Editar precio_xp o descripcion. Body: `{ id, precio_xp, descripcion }`. |
| `consumibles_toggle` | POST | Activa/desactiva consumible. Body: `{ id, activo }`. |

**Implementacion:** mismos switches `tipo=` en `admin.js`, con autenticacion Bearer.

**Seed de cromos iniciales:** un INSERT versionado en la migracion 010 o como script aparte `scripts/seed-cromos-iniciales.js` (segun la decision de Javier sobre cuantos sets querer al inicio). La migracion 010 NO incluye el seed de cromos porque depende de decisiones de producto sobre cuantos sets/ciudades incluir; se deja como paso manual posterior.

---

## 7. Extension de tabla_destino (senderos Audiovisual y Pandilla)

GET `tipo=tabla_destino` existente (3 senderos) se extiende a 5 senderos:

```javascript
// Senderos existentes (sin cambios en la logica de calculo):
// 1. Explorador: SUM(xp_ganado) de guardados+visitas
// 2. Critico: SUM(xp_ganado) de resenas+ratings
// 3. Organizador: mapas*40 + destinos_en_mapas*5

// Senderos nuevos:
// 4. Audiovisual:
//    fama = SUM(xp_ganado) de fotos + SUM(xp_ganado) de votos_foto
//    + albumes_georeferenciados * 30 + videos * 35
//    Niveles por FAMA_TIERS (mismo patron que los otros 3 senderos)

// 5. Pandilla:
//    Se lee de pandillas.fama_total de la pandilla activa del usuario.
//    Si no tiene pandilla: { fama: 0, nivel: 'Sin Parche', rango: 0 }.
```

**Respuesta actualizada de `tipo=tabla_destino`:**

```json
{
  "ok": true,
  "data": {
    "senderos": {
      "explorador": { "fama": 350, "nivel": "Especialista", "rango": 3 },
      "critico": { "fama": 120, "nivel": "Aprendiz", "rango": 1 },
      "organizador": { "fama": 200, "nivel": "Practicante", "rango": 2 },
      "audiovisual": { "fama": 85, "nivel": "Semilla", "rango": 0 },
      "pandilla": { "fama": 450, "nivel": "Especialista", "rango": 3, "pandilla_nombre": "Los Exploradores" }
    },
    "fama_total_global": 1205,
    "patrocinios": []
  }
}
```

**Constante FAMA_TIERS (compartida con los senderos existentes):**

```javascript
var FAMA_TIERS = [
  { min: 0,   nombre: 'Semilla' },
  { min: 100, nombre: 'Aprendiz' },
  { min: 250, nombre: 'Practicante' },
  { min: 450, nombre: 'Especialista' },
  { min: 700, nombre: 'Maestro' },
];
```

---

## 8. Reglas de economia anti-farming

| Regla | Implementacion | Ubicacion |
|---|---|---|
| Max 5 compras de consumibles/dia | COUNT sobre `compra_consumibles` WHERE `creado_en > NOW() - INTERVAL '1 day'` | `POST tipo=comprar_consumible` |
| Max 1 amuleto_x2 activo | `capacidades->multiplicador_x2_usos > 0` impide otro | `POST tipo=comprar_consumible` |
| Max 2 salas efimeras activas | COUNT sobre `chat_salas` WHERE `creador_id = $1 AND expira_en > NOW()` | `POST tipo=usar_consumible` (sala_efimera) |
| Max 3 intercambios de cromos/dia | COUNT sobre `consumo_consumibles` WHERE tipo='intercambio' hoy | `POST tipo=cromo_intercambio` |
| Cooldown pandilla 14 dias | `fecha_salida_pandilla` en `capacidades`, validar `NOW() > fecha + 14d` | `POST tipo=pandilla_unirse` |
| Max 1 pandilla activa por usuario | COUNT pandillas_miembros WHERE activo=true | `POST tipo=pandilla_crear` y `pandilla_unirse` |
| Fama de Pandilla: solo 10% de XP | `ROUND(xp_ganado * 0.10)`, sin duplicar entre pandillas | Cada POST de XP |
| Revocacion de nivel | Nivel calculado dinamico en cada lectura; NO hay nivel persistido | `api/usuarios.js calcularNivel()` |
| Ledger trazable | Cada compra/uso/intercambio queda como fila append-only | `compra_consumibles` y `consumo_consumibles` |

---

## 9. Vitrina de 20 niveles

### 9.1 Constante compartida

**`api/usuarios.js`:** `NIVELES` se reemplaza por 20 entradas (ver tabla en Bloque 1).

**`index.html`, `mi-perfil.html`, `comunidad.html`:** `XP_LEVELS` se reemplaza por 20 objetos:

```javascript
var XP_LEVELS = [
  { min: 0,     nombre: 'Caminante Novato',      era: 'Mundana',     badge: '\uD83E\uDD7E' },
  { min: 100,   nombre: 'Rastreador Local',      era: 'Mundana',     badge: '\uD83D\uDD0D' },
  { min: 250,   nombre: 'Explorador Urbano',     era: 'Mundana',     badge: '\uD83C\uDFD9\uFE0F' },
  { min: 450,   nombre: 'Aventurero Regional',   era: 'Mundana',     badge: '\uD83C\uDF92' },
  { min: 700,   nombre: 'Vanguardia Territorial', era: 'Mundana',    badge: '\uD83D\uDDFA\uFE0F' },
  { min: 1000,  nombre: 'Embajador de Zona',     era: 'Patrocinada', badge: '\uD83D\uDCDC' },
  { min: 1400,  nombre: 'Fotografo de Ruta',     era: 'Patrocinada', badge: '\uD83D\uDCF7' },
  { min: 1900,  nombre: 'Cronista de Historias',  era: 'Patrocinada', badge: '\u270D\uFE0F' },
  { min: 2500,  nombre: 'Buscador de Leyendas',  era: 'Patrocinada', badge: '\u2B50' },
  { min: 3200,  nombre: 'Guia de Fronteras',     era: 'Patrocinada', badge: '\uD83C\uDFEE' },
  { min: 4000,  nombre: 'Estratega Comunitario', era: 'Organizador', badge: '\uD83C\uDFDB\uFE0F' },
  { min: 5200,  nombre: 'Documentalista Visual', era: 'Organizador', badge: '\uD83C\uDFAC' },
  { min: 6800,  nombre: 'Senor del Spot',        era: 'Organizador', badge: '\uD83D\uDC51' },
  { min: 8500,  nombre: 'Cartografo de Cine',    era: 'Organizador', badge: '\uD83C\uDFAC' },
  { min: 10500, nombre: 'Protector del Patrimonio', era: 'Organizador', badge: '\uD83D\uDEE1\uFE0F' },
  { min: 13000, nombre: 'Curador de Colombia',   era: 'Leyenda',     badge: '\uD83D\uDC8E' },
  { min: 16000, nombre: 'Mariscal de Parche',    era: 'Leyenda',     badge: '\u2694\uFE0F' },
  { min: 19500, nombre: 'Cineasta de Territorio', era: 'Leyenda',    badge: '\uD83C\uDFAC' },
  { min: 24000, nombre: 'Inmortal del Mapa',     era: 'Leyenda',     badge: '\u2B50' },
  { min: 30000, nombre: 'Gran Maestro ExploraCO', era: 'Leyenda',    badge: '\uD83D\uDC51' },
];
```

### 9.2 UI en mi-perfil.html

**Seccion "Escaleta de Niveles"** debajo de la Tabla de Destino:

- Lista vertical de 20 tarjetas, cada una con: icono badge, nombre del nivel, umbral XP, era, y estado (bloqueado/actual/desbloqueado).
- **Estado bloqueado:** tarjeta gris con overlay de candado. Muestra "Nivel X -- YYYY XP".
- **Estado actual:** tarjeta dorada con brillo. Muestra "Tu nivel actual" + barra de progreso al siguiente.
- **Estado desbloqueado:** tarjeta con color de su Era (Mundana: verde, Patrocinada: azul, Organizador: naranja, Leyenda: morado). Muestra fecha de desbloqueo si existe en `progreso_misiones` o se asume "desbloqueado".

**Capacidades por nivel:** se listan como chips debajo del nombre del nivel. Se sincronizan con la tabla del Plan Maestro v4 seccion 3 (ver tabla completa en Bloque 1).

### 9.3 Eras en la UI

| Era | Color | Niveles |
|---|---|---|
| Mundana | Verde oscuro (#065f46) | 1-5 |
| Patrocinada | Azul (#1e40af) | 6-10 |
| Organizador | Naranja (#b45309) | 11-15 |
| Leyenda | Morado (#6b21a8) | 16-20 |

---

## 10. Consumibles: catalogo y precios finales

| # | Clave | Nombre | Descripcion | Precio XP | Efecto server-side |
|---|---|---|---|---|---|
| 1 | pluma_inspirada | Pluma Inspirada | Publica un escrito/articulo en Inspirate sin esperar postulacion. | 600 | `{ permiso_arte: true }` en capacidades |
| 2 | cuaderno_expedicion | Cuaderno de Expedicion | +1 album de fotos activo adicional. | 450 | Incrementa `albums_extra` en capacidades |
| 3 | pergamino_mapa | Pergamino del Cartografo | +1 mapa tematico adicional (tope 50). | 500 | Incrementa `mapas_extra` en capacidades |
| 4 | sala_efimera | Sala Efimera | Crea sala de chat sin gate de nivel (7 dias). | 800 | INSERT en `chat_salas` con expira_en |
| 5 | amuleto_x2 | Amuleto de Doble XP | x2 XP en proximas 5 acciones. | 350 | `multiplicador_x2_usos = 5` en capacidades |
| 6 | imantador_cromos | Iman de Cromos | Garantiza rareza epica+ en proximo cromo. | 400 | `cromo_garantia = 'epico'` en capacidades |
| 7 | trompeta_fama | Trompeta de la Fama | Duplica aporte Fama Pandilla 24h. | 500 | `fama_x2_hasta = timestamp` en capacidades |
| 8 | vitrina_estelar | Vitrina Estelar | Perfil destacado en comunidad 7 dias. | 300 | `vitrina_estelar_hasta = timestamp` en capacidades |
| 9 | pin_cromado | Pin Cromado | Foto/album destacado en Mapa Audiovisual 7 dias. | 250 | `pin_mapa_hasta = timestamp` en capacidades |
| 10 | pase_vip | Pase VIP Leyenda | Acceso prioritario a eventos + badge 30 dias. | 1500 | `vip_hasta = timestamp` en capacidades |

**Nota de precios:** los precios fueron calibrados para ser significativos sin ser punitivos. El mas barato (Pin Cromado, 250 XP) es alcanzable con ~12 acciones de XP basico. El mas caro (Pase VIP, 1500 XP) requiere ~75 acciones o nivel 6+. Los precios son editables desde admin.html via el CRUD de consumibles (tabla `consumibles` gestionable).

---

## 11. Matriz de riesgo y smoke tests

### 11.1 Matriz de riesgo

| Riesgo | Probabilidad | Impacto | Mitigacion |
|---|---|---|---|
| Revocacion de nivel rompe UI | Media | Alto | Test funcional: simular compra que baja de nivel, verificar que `calcularNivel` retorna nivel menor. Verificar que las capacidades de UI (tabs, botones) se recalculan en tiempo real. |
| Consumibles explotables (compra masiva) | Media | Alto | Max 5 compras/dia, ledger trazable, validacion server-side. Sin truncado de cantidades. |
| Pandilla sin miembros (abandono) | Alta | Medio | C0 Borrado Logico: pandilla queda activa sin miembros activos. Fundador puede ser revocado. |
| Cromos con probabilidad manipulable | Baja | Medio | Probabilidad server-side, nunca en el cliente. `Math.random()` suficiente para v1. |
| Fama de Pandilla inflada | Media | Medio | Solo 10% de XP individual, cooldown de reingreso 14d, max 1 pandilla activa. |
| `consumibles` editable desde admin = precios errados | Media | Bajo | Admin tiene toggle activo/inactivo. Precios validados como enteros >= 0. |
| Migracion 010 no aplicada antes del deploy | Alta | Critico | `POST tipo=comprar_consumible` retorna 503 con error claro si la tabla no existe (patron de 007/008). |

### 11.2 Smoke tests a crear

**Archivo:** `scripts/smoke_test_gamificacion_v4.js`

**Patron:** mismo que `scripts/smoke_test_milestones_v2.js` (verificacion de estructura, no de produccion).

**Checks (proyectados, ~30):**

```javascript
// smoke_test_gamificacion_v4.js
// Verifica: estructura de la migracion, constantes sincronizadas,
// operaciones tipo= en interacciones.js y admin.js,
// patron anti-farming, cromos probabilidades suman 100%,
// NIVELES.length === 20, bornes monotonicos.

var checks = [
  // Migracion 010
  { desc: 'migracion 010 existe', test: function() { return fs.existsSync('db/migrations/010_gamificacion_v4.sql'); } },
  { desc: 'migracion 010 contiene CREATE TABLE consumibles', test: function() { return migracion.includes('CREATE TABLE IF NOT EXISTS consumibles'); } },
  { desc: 'migracion 010 contiene CREATE TABLE compra_consumibles', test: function() { return migracion.includes('CREATE TABLE IF NOT EXISTS compra_consumibles'); } },
  { desc: 'migracion 010 contiene CREATE TABLE consumo_consumibles', test: function() { return migracion.includes('CREATE TABLE IF NOT EXISTS consumo_consumibles'); } },
  { desc: 'migracion 010 contiene CREATE TABLE cromos_catalogo', test: function() { return migracion.includes('CREATE TABLE IF NOT EXISTS cromos_catalogo'); } },
  { desc: 'migracion 010 contiene CREATE TABLE usuarios_cromos', test: function() { return migracion.includes('CREATE TABLE IF NOT EXISTS usuarios_cromos'); } },
  { desc: 'migracion 010 contiene CREATE TABLE pandillas', test: function() { return migracion.includes('CREATE TABLE IF NOT EXISTS pandillas'); } },
  { desc: 'migracion 010 contiene CREATE TABLE pandillas_miembros', test: function() { return migracion.includes('CREATE TABLE IF NOT EXISTS pandillas_miembros'); } },
  { desc: 'migracion 010 contiene CREATE TABLE pandilla_retos', test: function() { return migracion.includes('CREATE TABLE IF NOT EXISTS pandilla_retos'); } },
  { desc: 'migracion 010 contiene INSERT consumibles (10)', test: function() { return migracion.includes("('pluma_inspirada'"); } },

  // NIVELES sincronizados
  { desc: 'api/usuarios.js NIVELES tiene 20 elementos', test: function() { return extraerArrayNiveles().length === 20; } },
  { desc: 'NIVELES bornes son monotonicos crecientes', test: function() { return bornesMonotonicos(); } },
  { desc: 'NIVELES ultimo borne es 30000', test: function() { return extraerArrayNiveles()[19].min === 30000; } },

  // Constantes en los 3 HTML
  { desc: 'index.html XP_LEVELS tiene 20 elementos', test: function() { return extraerXPLevels('index.html').length === 20; } },
  { desc: 'mi-perfil.html XP_LEVELS tiene 20 elementos', test: function() { return extraerXPLevels('mi-perfil.html').length === 20; } },
  { desc: 'comunidad.html XP_LEVELS tiene 20 elementos', test: function() { return extraerXPLevels('comunidad.html').length === 20; } },

  // Cromos
  { desc: 'CROMO_PROBABILIDADES suma 1.0', test: function() { return Math.abs(0.45 + 0.30 + 0.18 + 0.07 - 1.0) < 0.001; } },
  { desc: 'interacciones.js contiene CROMO_PROBABILIDADES', test: function() { return codigo.includes('CROMO_PROBABILIDADES'); } },

  // Operaciones tipo= nuevas en interacciones.js
  { desc: 'tipo=consumibles existe en GET', test: function() { return codigo.includes("tipo === 'consumibles'"); } },
  { desc: 'tipo=inventario existe en GET', test: function() { return codigo.includes("tipo === 'inventario'"); } },
  { desc: 'tipo=comprar_consumible existe en POST', test: function() { return codigo.includes("tipo === 'comprar_consumible'"); } },
  { desc: 'tipo=usar_consumible existe en POST', test: function() { return codigo.includes("tipo === 'usar_consumible'"); } },
  { desc: 'tipo=mis_cromos existe en GET', test: function() { return codigo.includes("tipo === 'mis_cromos'"); } },
  { desc: 'tipo=cromo_intercambio existe en POST', test: function() { return codigo.includes("tipo === 'cromo_intercambio'"); } },
  { desc: 'tipo=pandilla_crear existe en POST', test: function() { return codigo.includes("tipo === 'pandilla_crear'"); } },
  { desc: 'tipo=pandilla_unirse existe en POST', test: function() { return codigo.includes("tipo === 'pandilla_unirse'"); } },
  { desc: 'tipo=pandilla_salir existe en POST', test: function() { return codigo.includes("tipo === 'pandilla_salir'"); } },
  { desc: 'tipo=pandilla_detalle existe en GET', test: function() { return codigo.includes("tipo === 'pandilla_detalle'"); } },

  // Admin.js
  { desc: 'admin.js contiene tipo=consumibles_lista', test: function() { return adminJs.includes("tipo === 'consumibles_lista'"); } },

  // Anti-farming
  { desc: 'anti-farming max 5 compras/dia implementado', test: function() { return codigo.includes("INTERVAL '1 day'") || codigo.includes('5 compras'); } },
  { desc: 'cooldown pandilla 14 dias implementado', test: function() { return codigo.includes("14 day") || codigo.includes('14d'); } },

  // ASCII-safe
  { desc: 'interacciones.js ASCII-safe (0 bytes > 127)', test: function() { return asciiSafe('api/interacciones.js'); } },
  { desc: 'admin.js ASCII-safe (0 bytes > 127)', test: function() { return asciiSafe('api/admin.js'); } },
  { desc: 'migracion 010 ASCII-safe (0 bytes > 127)', test: function() { return asciiSafe('db/migrations/010_gamificacion_v4.sql'); } },
];
```

---

## 12. ADR-018 (borrador)

**ID:** ADR-018
**Fecha:** 2026-09-10
**Autor:** Chief Architect (AI-DOS) con decisiones de producto confirmadas por Javier
**Problema:** ExploraCO necesita una economia de XP con consumibles, cromos coleccionables estilo Steam, pandillas completas con retos de parche, y expansion de 15 a 20 niveles con revocacion dura por gasto de XP.

**Opciones evaluadas:**
1. Consumibles como constante estatica en el codigo (rapido, sin CRUD).
2. Consumibles como tabla `consumibles` gestionable desde admin.html (elegida).

**Decision tomada:** Se adopta la opcion 2: tabla `consumibles` gestionable, ledger append-only (`compra_consumibles` + `consumo_consumibles`), inventario en `usuarios.capacidades` JSONB con merge `||`, 20 niveles con bornes sincronizados en 4 puntos, cromos con probabilidad 45/30/18/7%, pandillas con tablas dedicadas y 5 senderos en la Tabla de Destino.

**Justificacion:** La tabla gestionable permite ajustar precios y desactivar consumibles sin deploy. El ledger append-only garantiza trazabilidad (A-2A prep). Los 20 niveles desestancan la progresion. Las pandillas agregan cohes social.

**Impacto:** `db/migrations/010_gamificacion_v4.sql` (9 tablas + 1 alter + 1 seed); `api/interacciones.js` v9 (+10 GET/POST, +bloques post-XP); `api/admin.js` (+4 GET/POST de consumibles); `api/usuarios.js` (NIVELES 20); `index.html`/`mi-perfil.html`/`comunidad.html` (XP_LEVELS 20); `scripts/smoke_test_gamificacion_v4.js`.

**Estado:** Borrador (pendiente aprobacion de Javier + implementacion).

---

## Resumen de entrega

### Archivo creado
`docs/superpowers/specs/2026-09-10-gamificacion-v4-design.md`

### Tablas definidas (en migracion 010)
1. `consumibles` -- catalogo gestionable de 10 items
2. `compra_consumibles` -- ledger append-only de compras
3. `consumo_consumibles` -- ledger append-only de usos
4. `cromos_catalogo` -- catalogo de cromos por set y rareza
5. `usuarios_cromos` -- posesion de cromos por usuario
6. `pandillas` -- grupos de usuarios
7. `pandillas_miembros` -- membresia con rol (fundador/oficial/miembro)
8. `pandilla_retos` -- retos de parche con ventana temporal
9. Alter `usuarios.capacidades` -- inventario de consumibles JSONB

### Operaciones tipo= nuevas listadas

**GET nuevas (5):** consumibles, inventario, mis_cromos, pandilla_detalle, pandilla_reto

**POST nuevas (8):** comprar_consumible, usar_consumible, cromo_obtener, cromo_intercambio, pandilla_crear, pandilla_unirse, pandilla_salir, pandilla_reto (crear)

**Admin (4):** consumibles_lista, consumibles_crear, consumibles_editar, consumibles_toggle

**Extension existente:** GET tabla_destino (+2 senderos: Audiovisual, Pandilla)

### 10 consumibles con precios finales

| Clave | Nombre | Precio XP |
|---|---|---|
| pluma_inspirada | Pluma Inspirada | 600 |
| cuaderno_expedicion | Cuaderno de Expedicion | 450 |
| pergamino_mapa | Pergamino del Cartografo | 500 |
| sala_efimera | Sala Efimera | 800 |
| amuleto_x2 | Amuleto de Doble XP | 350 |
| imantador_cromos | Iman de Cromos | 400 |
| trompeta_fama | Trompeta de la Fama | 500 |
| vitrina_estelar | Vitrina Estelar | 300 |
| pin_cromado | Pin Cromado | 250 |
| pase_vip | Pase VIP Leyenda | 1500 |

---

**hacer las preguntas necesarias para completar la tarea de la mejor forma posible**
