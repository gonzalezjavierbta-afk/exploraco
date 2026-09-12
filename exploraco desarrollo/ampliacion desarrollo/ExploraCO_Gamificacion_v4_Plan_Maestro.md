# ExploraCO — Sistema de Gamificación v4.0
## Documento Maestro Técnico + Hoja de Ruta de Desarrollo

---

## 0. Nota sobre este documento y supuestos de trabajo

Esta versión integra el detalle técnico completo (esquemas, JSONB, endpoints) para que sirva como documento de desarrollo, no solo de producto. Se confirmó:

- Incluir todo lo técnico (tablas, campos JSONB, sentencias de actualización).
- Mostrar solo la tabla objetivo de **20 niveles** (no la comparación con la de 15 vigente en producción).
- Desarrollar el **Sendero Pandilla** con el mismo nivel de detalle que los otros cuatro senderos, como parte de esta propuesta.

Siguen abiertas tres preguntas de negocio que no cambian el diseño técnico pero sí la prioridad de ejecución (repetidas en la sección 13):

- 🔶 Estado real del módulo de patrocinios: ¿hay marcas firmadas o sigue siendo conceptual?
- 🔶 Tamaño real de la base de usuarios activos hoy.
- 🔶 Orden de prioridad confirmado entre las referencias de juegos (se asumió: Steam → social/clanes → SKATE → Path of Exile → Upland/cripto).

Restricción técnica vigente: **Vercel Hobby, máximo 8 funciones serverless**. Todo lo nuevo debe extender los endpoints ya consolidados (`interacciones.js`, `usuarios.js`, `admin.js`, `utilidades.js`) agregando nuevos valores de `tipo=` o nuevas tablas — nunca archivos `.js` nuevos en `/api`.

---

## 1. Resumen Ejecutivo

ExploraCO ya tiene una base sólida: progresión por XP, cálculo dinámico de nivel/era/badge desde `xp_total`, un modelo de datos híbrido (relacional + JSONB) bien resuelto, un endpoint unificado que evita romper el límite de funciones, y un módulo de patrocinios conceptual inspirado en SKATE.

Este documento reorganiza todo eso, lo lleva de **15 a 20 niveles** manteniendo el mismo mecanismo (cálculo dinámico, sin migración de datos de usuarios), desarrolla por completo el **Sendero Pandilla** (antes solo esbozado), añade mecánicas de Steam (cromos coleccionables, vitrina de perfil) y Path of Exile (ligas estacionales), y entrega el esquema técnico completo del módulo de patrocinios listo para desarrollarse.

---

## 2. Arquitectura Técnica Vigente

### 2.1 Infraestructura serverless y Escudo GOLD
- **Vercel Hobby**: tope duro de 8 funciones serverless. La consolidación de endpoints es la estrategia central para no romperlo.
- **Escudo GOLD**: todo despliegue pasa por verificación de sintaxis (`node --check`) y por una regla estricta de **ASCII-safety** (sin emojis, tildes o backticks dentro de los archivos `.js` de `/api`; los emojis/acentos solo se insertan en HTML vía escapes `\uXXXX`).
- **DB driver**: `@neondatabase/serverless` con `neon()` — nunca `pg`.
- **Estilo de módulos**: CommonJS (`require` / `module.exports`).

### 2.2 Esquema Relacional — Tablas Existentes

```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  auth_id VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(100),
  xp_total INT DEFAULT 0,
  total_resenas INT DEFAULT 0,
  total_guardados INT DEFAULT 0,
  progreso_misiones JSONB DEFAULT '{}'::jsonb,
  progreso_logros JSONB DEFAULT '{}'::jsonb,
  progreso_social JSONB DEFAULT '{}'::jsonb,
  progreso_album JSONB DEFAULT '{}'::jsonb,
  capacidades JSONB DEFAULT '{}'::jsonb,
  creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE destinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  categoria_slug VARCHAR(100) NOT NULL,
  ciudad VARCHAR(100),
  descripcion TEXT,
  rating NUMERIC(3,2) DEFAULT NULL,
  total_resenas INT DEFAULT 0,
  tags JSONB DEFAULT '{}'::jsonb,
  actualizado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE interacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  destino_id UUID REFERENCES destinos(id),
  tipo VARCHAR(50) NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  texto TEXT,
  votos_utiles INT DEFAULT 0,
  xp_ganado INT DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT NOW()
);
```

### 2.3 Tablas Nuevas Propuestas (para las mecánicas de esta v4.0)

Estas tablas no consumen funciones serverless adicionales — solo se consultan/actualizan desde los mismos archivos `.js` ya existentes.

```sql
-- Sendero Pandilla (sección 4.5)
CREATE TABLE pandillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) UNIQUE NOT NULL,
  fundador_id UUID REFERENCES usuarios(id),
  fama_total INT DEFAULT 0,
  ciudad_base VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pandillas_miembros (
  pandilla_id UUID REFERENCES pandillas(id),
  usuario_id UUID REFERENCES usuarios(id),
  rol VARCHAR(20) DEFAULT 'miembro', -- fundador | oficial | miembro
  activo BOOLEAN DEFAULT TRUE,
  fecha_ingreso TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (pandilla_id, usuario_id)
);

-- Cromos coleccionables (sección 10.1)
CREATE TABLE cromos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_slug VARCHAR(100) NOT NULL,      -- ej. 'set-cartagena'
  nombre VARCHAR(150) NOT NULL,
  rareza VARCHAR(20) DEFAULT 'comun',  -- comun | raro | epico | dorado
  imagen_url TEXT
);

CREATE TABLE usuarios_cromos (
  usuario_id UUID REFERENCES usuarios(id),
  cromo_id UUID REFERENCES cromos_catalogo(id),
  cantidad INT DEFAULT 1,
  obtenido_en TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (usuario_id, cromo_id)
);

-- Módulo de patrocinios v1 pragmático (sección 8.1)
CREATE TABLE sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  categoria VARCHAR(100),
  ciudad VARCHAR(100),
  nivel_minimo INT DEFAULT 1,
  tipo_beneficio VARCHAR(30), -- porcentaje | monto_fijo | producto_gratis | vip
  valor_beneficio NUMERIC(10,2),
  tope_canjes_totales INT,
  canjes_usados INT DEFAULT 0,
  fecha_expiracion DATE,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sponsor_canjes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES sponsors(id),
  usuario_id UUID REFERENCES usuarios(id),
  codigo_canje VARCHAR(20),
  creado_en TIMESTAMP DEFAULT NOW()
);
```

### 2.4 Persistencia Híbrida — Regla de Merge JSONB

Toda actualización de un campo `JSONB` (misiones, logros, progreso social, capacidades, álbum) se hace con el operador de merge `||` sobre `COALESCE`, nunca sobrescribiendo el campo completo, para no perder datos en escrituras concurrentes:

```sql
UPDATE usuarios
SET
  xp_total = xp_total + $1,
  progreso_misiones = COALESCE(progreso_misiones, '{}'::jsonb) || $2::jsonb,
  progreso_logros   = COALESCE(progreso_logros, '{}'::jsonb) || $3::jsonb,
  progreso_social   = COALESCE(progreso_social, '{}'::jsonb) || $4::jsonb,
  progreso_album    = COALESCE(progreso_album, '{}'::jsonb) || $5::jsonb,
  capacidades       = COALESCE(capacidades, '{}'::jsonb) || $6::jsonb,
  actualizado_en    = NOW()
WHERE id = $7;
```

Recálculo atómico del rating de un destino (se ejecuta tras cada `rating` o `resena`):

```sql
UPDATE destinos SET
  rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM interacciones
            WHERE destino_id = $1 AND tipo IN ('resena','rating') AND rating IS NOT NULL),
  total_resenas = (SELECT COUNT(*) FROM interacciones
            WHERE destino_id = $1 AND tipo IN ('resena','rating')),
  actualizado_en = NOW()
WHERE id = $1;
```

**Cero Borrado Lógico**: ningún `DELETE` sobre `interacciones`; para "quitar guardado" se hace `UPDATE interacciones SET activo = false`. La misma regla aplica a `pandillas_miembros.activo` y `sponsors.activo` en las tablas nuevas.

### 2.5 Matriz de Operaciones del Endpoint Unificado `/api/interacciones.js`

| Operación (`tipo=`) | Método | Descripción | Estado |
|---|---|---|---|
| `rating` | POST | Voto rápido 1-5 estrellas. +10 XP, recalcula rating del destino | Vigente |
| `resena` | POST | Reseña con dimensiones. +10/+25 XP según longitud | Vigente |
| `guardado` | POST | Activa destino en "Mi Viaje". +5 XP la primera vez | Vigente |
| `quitar_guardado` | POST | `activo = false` (Cero Borrado Lógico) | Vigente |
| `visita` | POST | Visita confirmada. +20 XP | Vigente |
| `logros` | GET | Catálogo de trofeos + rareza global | Vigente |
| `tabla_destino` | GET | Puntos por sendero (ahora 5, ver sección 4) | Se extiende |
| `review_voto` | POST | Suma `votos_utiles`, afecta "Own the Spot" | Vigente |
| `chat_msg` | POST | +2 XP, tope diario 20 XP | Vigente |
| `plan_crear` | POST | Crea plan colectivo (requiere Nivel 6+) | Vigente |
| `plan_unirse` | POST | Inscribe usuario a plan grupal | Vigente |
| `pandilla_crear` | POST | **[NUEVO]** Funda una Pandilla (requiere Nivel 14+, mín. 3 miembros) | Propuesto |
| `pandilla_unirse` | POST | **[NUEVO]** Une un usuario a una Pandilla existente (máx. 1 activa por usuario) | Propuesto |
| `pandilla_reto` | POST/GET | **[NUEVO]** Registra avance y consulta estado de un Reto de Parche | Propuesto |
| `cromo_intercambio` | POST | **[NUEVO]** Intercambio de cromos duplicados entre dos usuarios | Propuesto |
| `sponsor_canjear` | POST | **[NUEVO]** Valida y registra el canje de un beneficio de patrocinio | Propuesto |

Todas las filas **[NUEVO]** viven dentro del mismo archivo `interacciones.js` (o `admin.js` para la gestión de sponsors), sin sumar funciones nuevas al límite de Vercel Hobby.

### 2.6 Principios Rectores
- **Cero Borrado Lógico** en toda tabla, nueva o existente.
- **Trazabilidad Absoluta**: cada evento de XP, cromo, ingreso a pandilla o canje de sponsor queda como fila permanente (append-only), habilitando auditoría y, a futuro, el "Camino A" de la capa cripto (sección 10.4).
- **Cálculo dinámico, no almacenado**: nivel, era y badge nunca se guardan como columna fija — se derivan de `xp_total` en cada consulta. Esto es lo que hace trivial pasar de 15 a 20 niveles (ver sección 3.2).

---

## 3. Progresión del Jugador — Tabla Maestra de 20 Niveles (Meta)

| Nivel | Nombre | Era | Umbral XP | Badge | Capacidades Desbloqueadas |
|---|---|---|---|---|---|
| 1 | Caminante Novato | Era 1 — Mundana | 0 XP | 🥾 Novato | Guardar destinos en "Mi Viaje"; Quick-Ratings (1-5 estrellas); lectura del catálogo global de mapas |
| 2 | Rastreador Local | Era 1 — Mundana | 100 XP | 🔍 Rastreador | Reseñas escritas simples; subir primera foto a galería (+15 XP); acceso al Chat Público |
| 3 | Explorador Urbano | Era 1 — Mundana | 250 XP | 🏙️ Explorador | Mapas Temáticos Privados; Visitas Confirmadas (+20 XP); unirse a Planes de Viaje Colectivos |
| 4 | Aventurero Regional | Era 1 — Mundana | 450 XP | 🎒 Aventurero | Re-pin de fotos (+5 XP al autor original); reseñas compuestas con dimensiones (dims) |
| 5 | Vanguardia Territorial | Era 1 — Mundana | 700 XP | 🗺️ Vanguardia | Mapas Temáticos Públicos; voto de utilidad (`votos_utiles`) para "Own the Spot" |
| 6 | Embajador de Zona | Era 2 — Patrocinada | 1,000 XP | 📜 Embajador | Crear Planes de Viaje Colectivos (`plan_crear`); acceso a descuentos/cupones (Tienda de Canje) |
| 7 | Fotógrafo de Ruta | Era 2 — Patrocinada | 1,400 XP | 📷 Fotógrafo | Álbumes Georreferenciados en el Mapa Audiovisual; fijar mensajes en salas de chat comunitarias |
| 8 | Cronista de Historias | Era 2 — Patrocinada | 1,900 XP | ✍️ Cronista | Postular artículos para el Blog Inspírate; etiquetas personalizadas en mapas temáticos |
| 9 | Buscador de Leyendas | Era 2 — Patrocinada | 2,500 XP | 🌟 Buscador | Ver Rareza Global (%) de trofeos de otros usuarios; priorización editorial en moderación |
| 10 | Guía de Fronteras | Era 2 — Patrocinada | 3,200 XP | 🏮 Guía | Hasta 50 mapas y 200 guardados; desbloqueo de Cromos/Trading Cards por ciudad |
| 11 | Estratega Comunitario | Era 3 — Organizador y Curador | 4,000 XP | 🏛️ Estratega | Inyección de `organizar_actividad` (botón `#btn-organizar`); presidir salas de chat regionales |
| 12 | Documentalista Visual | Era 3 — Organizador y Curador | 5,200 XP | 🎥 Cineasta | Vincular Video-Reels (YouTube/Vimeo) a fichas de destinos; galería destacada en portada del Blog |
| 13 | Señor del Spot | Era 3 — Organizador y Curador | 6,800 XP | 👑 Señor | Disputa avanzada por "Own the Spot"; multiplicador pasivo x1.1 XP en esa ciudad |
| 14 | Cartógrafo de Cine | Era 3 — Organizador y Curador | 8,500 XP | 🎬 Director | Mapas de Cine con video en bucle; **fundar o liderar una Pandilla** (ver sección 4.5) |
| 15 | Protector del Patrimonio | Era 3 — Organizador y Curador | 10,500 XP | 🛡️ Guardián | Moderación comunitaria en galerías y reseñas; badge estético Plata Neón |
| 16 | Curador de Colombia | Era 4 — Leyenda y Gran Creador | 13,000 XP | 💎 Curador | Cromos dorados; fabricación de Insignias Legendarias de Ciudad (+100 XP) |
| 17 | Mariscal de Parche | Era 4 — Leyenda y Gran Creador | 16,000 XP | ⚔️ Mariscal | Multiplicador x1.2 XP de Pandilla para todo el grupo; canje de pases VIP a eventos oficiales |
| 18 | Cineasta de Territorio | Era 4 — Leyenda y Gran Creador | 19,500 XP | 🎬 Gran Director | Videos cinematográficos en el Hero principal de destinos; destacado permanente en portada nacional |
| 19 | Inmortal del Mapa | Era 4 — Leyenda y Gran Creador | 24,000 XP | 🌟 Inmortal | Marco de avatar Oro Neón Fuego en chats/comentarios/leaderboards; acceso directo a funciones beta |
| 20 | Gran Maestro ExploraCO | Era 4 — Leyenda y Gran Creador | 30,000+ XP | 👑 Leyenda | Máximo prestigio, inmune a reinicios estacionales; emisión de la A2A Agent Card |

### 3.2 Nota de Migración: de 15 a 20 Niveles
Como el nivel/era/badge **se calculan dinámicamente** desde `xp_total` (sección 2.6) y nunca se guardan como columna fija en `usuarios`, migrar no requiere tocar datos de usuarios existentes. El trabajo de desarrollo es:
1. Reemplazar la tabla/función de umbrales de 15 por la de 20 niveles de arriba (un solo punto de cambio, probablemente un arreglo de umbrales en `usuario-session.js` o donde se resuelva el nivel).
2. Actualizar los assets de badges (5 badges nuevos: Documentalista Visual, Curador de Colombia, Mariscal de Parche, Cineasta de Territorio, Inmortal del Mapa — los otros 15 ya existen o cambian de umbral).
3. Los usuarios que hoy están en el antiguo "Nivel 15" (10,500+ XP antes tope, 11,000+ XP) simplemente se re-ubican en el nivel que les corresponda de la nueva tabla la próxima vez que se calcule su progreso — no hay migración de filas.
4. Revisar cualquier lógica que asuma "15 es el máximo" (ej. validaciones de tope) para que use el nuevo umbral de 30,000+ XP.

---

## 4. La Tabla de Destino — 5 Senderos de Especialización

```
                              TABLA DE DESTINO (ExploraCO v4.0)
                                               │
      ┌───────────────────┬────────────────────┼───────────────────┬──────────────────┐
      ▼                   ▼                    ▼                   ▼                  ▼
[SENDERO EXPLORADOR]  [SENDERO CRÍTICO]  [SENDERO ORGANIZADOR]  [SENDERO AUDIOVISUAL]  [SENDERO PANDILLA]
 • Guardados (+5 XP)  • Reseñas (+25 XP)  • Planes Colectivos    • Fotos Galería (+15 XP)• XP Compartida
 • Visitas (+20 XP)   • Votos (+10 XP)    • Botón Organizar      • Re-pins (+5 XP)       • Misiones Grupales
 • Rutas de Ciudad    • Dimensiones       • Own the Spot         • Álbumes + Videos      • Retos de Parche
```

### 4.1 Sendero Explorador
Guardados (+5 XP), visitas confirmadas (+20 XP), rutas de ciudad. Es el sendero de entrada — casi todo usuario nuevo empieza acumulando fama aquí.

### 4.2 Sendero Crítico
Reseñas (+10/+25 XP según longitud), votos rápidos (+10 XP), dimensiones de calidad (limpieza, servicio, ubicación). Alimenta directamente el `rating` público de cada destino.

### 4.3 Sendero Organizador
Planes de Viaje Colectivos (requiere Nivel 6+), botón de organización de actividades (`organizar_actividad`, Nivel 11+), disputa por "Own the Spot" (Nivel 5+ para votar utilidad, ventaja real desde Nivel 13 con multiplicador x1.1 XP).

### 4.4 Sendero Audiovisual
- Subir fotografía a un destino: **+15 XP**.
- Re-pin/curaduría de foto de otro viajero a álbum propio: **+5 XP** (con crédito al autor original).
- Álbum georreferenciado (5+ fotos con lat/lng en una misma ciudad): **+30 XP**.
- Video-reseña/Reel enlazado (YouTube/Vimeo) en Inspírate o en ficha de destino: **+35 XP**.

**Beneficios desbloqueables por rango:**

| Rango | Beneficio |
|---|---|
| 1-5 | Filtros de fotos en el mapa interactivo; portadas personalizadas |
| 6-10 | Destacado de fotografías en la galería principal del Blog |
| 11-15 | Marco de avatar "Lente de Cámara Neón"; prioridad en moderación de contenido visual |
| 16-20 | Publicar Mapas de Cine/Documentales con video en bucle en el Hero de los destinos |

### 4.5 Sendero Pandilla — Desarrollo Completo (nuevo en esta propuesta)

El documento original solo esbozaba este sendero ("XP Compartida", "Misiones Grupales", "Retos de Parche") y lo mencionaba de pasada en los niveles 14 y 17. Aquí queda desarrollado con el mismo nivel de detalle que el Sendero Audiovisual.

**Qué es una Pandilla (Parche)**
- Grupo de 3 a 10 usuarios. Solo puede fundarla un usuario de **Nivel 14+ (Cartógrafo de Cine)**, alineado con la capacidad ya prevista en la tabla de niveles.
- Un usuario solo puede pertenecer a **una Pandilla activa** a la vez (evita inflar el aporte colectivo perteneciendo a varias).
- Cada Pandilla acumula una **Fama de Pandilla** (contador propio, independiente del XP individual de sus miembros), guardado en `pandillas.fama_total`.

**Mecánicas y recompensas**
- **Aporte a Fama de Pandilla**: un porcentaje (sugerido 10%) de la XP que cada miembro gana individualmente se suma también a `fama_total` del grupo. Requiere que el miembro haya tenido actividad reciente (evita cuentas inactivas infladas por otros).
- **Retos de Parche**: misión colectiva con ventana de tiempo (ej. "visitar 15 destinos distintos como grupo en 30 días"). Al completarse, reparte XP de bono entre todos los miembros activos.
- **Territorio de Parche**: versión colectiva de "Own the Spot" — si el grupo acumula suficientes interacciones confirmadas en una misma ciudad, obtiene una bandera/emblema visible en el mapa de comunidad para esa zona.
- **Duelo de Pandillas** (opcional, ligado a las Ligas de la sección 10.2): ranking estacional entre Pandillas, no solo entre individuos.

**Beneficios desbloqueables por rango de Fama de Pandilla:**

| Rango (Fama de Pandilla) | Beneficio |
|---|---|
| 1-5 | Insignia de Parche visible en el perfil de cada miembro; sala de chat privada del grupo |
| 6-10 | +10% de multiplicador de XP compartida en misiones grupales; un cupo adicional de miembro (máx. 12) |
| 11-15 | Bandera/emblema personalizado visible en `comunidad.html` en las zonas de actividad del grupo; prioridad de check-in en zonas disputadas |
| 16-20 | Multiplicador x1.2 XP grupal (coincide con el desbloqueo individual del Nivel 17, "Mariscal de Parche"); acceso a Duelo de Pandillas estacional |

**Reglas anti-abuso propias del sendero**
- El aporte a `fama_total` no se duplica si un usuario cambia de Pandilla varias veces en poco tiempo (cooldown de reingreso, ej. 14 días).
- Un Reto de Parche solo cuenta interacciones de miembros con al menos una actividad esa semana, para que no lo complete un solo miembro muy activo mientras el resto está inactivo.

---

## 5. Sistema de Misiones (Grafo Acíclico Dirigido)

### 5.1 Misiones Base
```
[mis_primer_guardado] (+15 XP) ────────┐
                                        ├──► [mis_explorador_bogota] (+40 XP)
[mis_primera_resena]  (+20 XP) ────────┼────────┐
                                        │        │
[mis_primera_visita]  (+15 XP) ────────┘        ▼
                                        [mis_organizador_bogota] (+100 XP)
                                        (Desbloquea: "organizar_actividad")
```
- `mis_primer_guardado` (+15 XP): guardar 1 destino en "Mi Viaje".
- `mis_explorador_bogota` (+40 XP): requiere `mis_primer_guardado`. Guardar 5 destinos en Bogotá.
- `mis_organizador_bogota` (+100 XP): requiere `mis_explorador_bogota` + `mis_primera_resena`. Guardar 8 destinos en Bogotá y alcanzar 300 XP totales. Inyecta `organizar_actividad`.

### 5.2 Misiones Audiovisuales
```
[mis_primer_guardado] ──► [mis_fotografo_novato] (+20 XP)
                                    │
                                    ▼
                          [mis_album_territorial] (+40 XP)
                                    │
                                    ▼
                          [mis_director_bogota] (+100 XP) ──► (Desbloquea: "videos_hero")
```
- `mis_fotografo_novato` (+20 XP): requiere `mis_primer_guardado`. Subir 3 fotos originales.
- `mis_album_territorial` (+40 XP): requiere `mis_fotografo_novato`. Álbum con 5 fotos georreferenciadas en la misma ciudad.
- `mis_repin_master` (+25 XP): requiere `mis_fotografo_novato`. 5 re-pins de fotos de otros viajeros.
- `mis_director_bogota` (+100 XP): requiere `mis_album_territorial` + `mis_organizador_bogota`. Publicar 2 video-reseñas y acumular 10 fotos en Bogotá. Desbloquea `videos_hero`.

### 5.3 Misiones de Pandilla (nuevas, propuesta v4.0)
```
[mis_fundar_parche] (+50 XP fundador)
          │
          ▼
[mis_primer_reto_parche] (+80 XP grupal)
          │
          ▼
[mis_territorio_parche] (+150 XP grupal) ──► (Desbloquea: bandera de zona)
```
- `mis_fundar_parche` (+50 XP al fundador): Nivel 14+ funda una Pandilla con mínimo 3 miembros.
- `mis_primer_reto_parche` (+80 XP repartida): requiere `mis_fundar_parche`. Completar el primer Reto de Parche.
- `mis_territorio_parche` (+150 XP repartida): requiere `mis_primer_reto_parche`. 50 interacciones confirmadas del grupo en una misma ciudad. Desbloquea la bandera de zona.

---

## 6. Catálogo de Logros y Rareza Global

$$\text{Rareza Global (\%)} = \left( \frac{\text{Usuarios con el logro}}{\text{Total de usuarios activos}} \right) \times 100$$

| Logro | Nombre | Tier | XP |
|---|---|---|---|
| `logr_primer_voto` | Primera Calificación | Bronce | 10 |
| `logr_critico_10` | Crítico Comunitario (10 reseñas) | Plata | 25 |
| `logr_critico_25` | Crítico Experto (25 reseñas) | Oro | 50 |
| `logr_opinion_blog` | Lector Crítico | Bronce | 10 |
| `logr_votos_blog_5` | Bibliotecario (5 votos a artículos) | Plata | 25 |
| `logr_votos_blog_10` | Curador de Historias (10 votos) | Oro | 50 |
| `logr_coleccionista_10` | Coleccionista (10 guardados) | Bronce | 15 |
| `logr_coleccionista_50` | Magnate del Mapa (50 guardados) | Oro | 75 |
| `logr_ciudades_5` | Viajero Multiciudad (5 ciudades) | Plata | 30 |
| `logr_visitas_5` | Senderista (5 visitas) | Bronce | 15 |
| `logr_visitas_20` | Nómada Regional (20 visitas) | Oro | 50 |
| `logr_alcalde_bogota` | Alcalde de Bogotá (12 interacciones) | Platino | 100 |
| `logr_conquistador_cartagena` | Conquistador de Cartagena (8 interacciones) | Oro | 75 |
| `logr_conquistador_medellin` | Conquistador de Medellín (8 interacciones) | Oro | 75 |
| `logr_senor_santa_marta` | Señor de Santa Marta (6 interacciones) | Plata | 40 |
| `logr_cali_es_colombia` | Cali es Colombia (6 interacciones) | Plata | 40 |

---

## 7. Matriz de Recompensas XP y Reglas Anti-Farming

| Acción | XP | Regla anti-farming |
|---|---|---|
| Reseña corta (≤50 caracteres) | +10 | Dedup. simétrica con Quick-Rating. Máx. 1 por destino |
| Reseña larga (>50 caracteres) | +25 | Máx. 1 por destino |
| Guardado de destino | +5 | Solo la primera vez; desmarcar/re-activar no repite XP |
| Visita confirmada | +20 | Dedup. por par (usuario, destino) |
| Voto rápido (Quick-Rating) | +10 | Bloquea reseña escrita posterior en ese destino |
| Mensaje en chat | +2 | Tope diario +20 XP (10 mensajes) |
| Foto a galería | +15 | — |
| Re-pin de foto | +5 (al autor original) | — |
| Álbum georreferenciado | +30 | Requiere 5+ fotos con coordenadas reales |
| Video-reseña/Reel | +35 | — |
| **[NUEVO]** Aporte a Fama de Pandilla | ~10% de la XP individual | Requiere actividad reciente del miembro; sin duplicar entre pandillas; cooldown de reingreso |
| **[NUEVO]** Obtención de cromo | Probabilística, ligada a la acción que la origina | Máx. 1 cromo por acción; sin cromos por acciones ya deduplicadas |

---

## 8. Módulo de Patrocinios — Esquema Técnico Completo y Revisión

### 8.1 Modelo de Datos

**Opción JSONB (rápida, dentro de `usuarios`)** — forma ilustrativa del objeto `usuarios.patrocinios`:

```json
{
  "sponsor_id": "restaurante-la-perla",
  "nivel_minimo": 6,
  "tipo_descuento": "porcentaje",
  "valor": 10,
  "codigo_canje": "LAPERLA-10",
  "tope_canjes_totales": 500,
  "canjes_registrados": ["uuid-usuario-1", "uuid-usuario-2"]
}
```

**Opción relacional (recomendada para v1, ver 2.3)**: tablas `sponsors` y `sponsor_canjes`, que permiten reportes reales para la marca (cuántos canjes, de qué nivel, en qué fecha) sin tener que escanear JSONB de todos los usuarios.

### 8.2 Flujo de Canje Propuesto
1. Sponsor se registra (vía `admin.js`, panel de marca): nombre, categoría, ciudad, nivel mínimo, tipo y valor del beneficio, tope de canjes, fecha de expiración.
2. Usuario ve el beneficio disponible según su nivel y ubicación (check-in por proximidad, ya existente).
3. Usuario solicita canje → `interacciones.js?tipo=sponsor_canjear` valida: nivel suficiente, tope no alcanzado, no expirado, usuario no canjeó antes ese mismo sponsor.
4. Se genera un código de un solo uso que el negocio verifica físicamente (mitiga fraude de solo hacer check-in falso por GPS).
5. Se inserta fila en `sponsor_canjes` (Cero Borrado Lógico: nunca se elimina, solo se marca usado).

### 8.3 Integración con SKATE, ACP y UCP
- **SKATE**: el modelo de descuentos escalonados por nivel ya está bien planteado — es el mismo principio de "tiers" de un programa de lealtad. Se mantiene como base de la Capa 1.
- **ACP (Agentic Commerce Protocol, OpenAI + Stripe)** y **UCP (Universal Commerce Protocol, Google)**: son protocolos reales y activos desde 2025-2026, pensados para que un agente de IA compre en nombre de un usuario en miles de comercios con pagos reales de por medio. Conectar ExploraCO a ellos tiene sentido **solo cuando haya sponsors reales pagando y volumen de canjes que lo justifique** — no como parte de la Capa 1.
- **MCP**: ExploraCO ya usa el principio de campos JSONB flexibles (`tags` en destinos) de forma compatible con la filosofía de "proveedor de contexto universal" de MCP. Esto es una base útil si más adelante se quiere exponer el catálogo de destinos a agentes de IA externos.

### 8.4 Fortalezas del diseño actual
- Campo flexible para patrocinios: correcto, porque los términos de cada marca varían.
- Beneficio atado al nivel: incentivo de retención probado.
- Activación por proximidad geográfica: diferencial real frente a un cupón digital genérico.

### 8.5 Riesgos y vacíos
- Sin flujo de onboarding de marca documentado hasta ahora (se resuelve en 8.2).
- Sin verificación anti-fraude del check-in (GPS spoofing) — el código de un solo uso en 8.2 lo mitiga.
- Sin expiración ni tope de canjes en el diseño original — ya incluido en el esquema de 8.1.
- Sin métricas para el sponsor (cuántos vieron/canjearon la oferta) — la tabla relacional `sponsor_canjes` lo resuelve con una consulta simple.
- Apuntar directo a ACP/UCP sin sponsors reales es construir infraestructura para una escala que todavía no existe.

### 8.6 Recomendación en Dos Capas
- **Capa 1 (prioridad inmediata)**: tablas `sponsors` / `sponsor_canjes`, flujo de canje de 8.2, panel básico de resultados para la marca. No requiere ACP/UCP.
- **Capa 2 (fase exploratoria, 12+ meses)**: conectar con ACP/UCP cuando haya volumen real, permitiendo que un agente de IA reserve/canjee automáticamente en nombre del usuario.

---

## 9. Inspiración de Referencia — Resumen

| Juego | Qué se toma |
|---|---|
| **SKATE** | Descuentos escalonados por nivel + estatus social visible, no solo económico |
| **Path of Exile** | Ligas/temporadas: ranking que se reinicia periódicamente, con el progreso anterior quedando como prestigio permanente |
| **Upland / Rising Star (Hive)** | Propiedad persistente y escasa como motor de inversión emocional (base conceptual de "Own the Spot" y "Territorio de Parche") |
| **Steam** | Cromos coleccionables por set, vitrina pública de perfil, mercado de intercambio entre usuarios |
| **Juegos sociales/coleccionables** | Clanes con retos cooperativos y recompensas colectivas (base del Sendero Pandilla) |

---

## 10. Mecánicas Nuevas v4.0 (además del Sendero Pandilla)

### 10.1 Cromos Coleccionables (Steam) — prioridad 1
Cada acción significativa tiene probabilidad de otorgar un cromo temático (ciudad o categoría). Sets por completar otorgan insignia + XP de bono. Intercambio de duplicados entre usuarios vía `tipo=cromo_intercambio`.

### 10.2 Ligas / Temporadas (Path of Exile) — prioridad 3
Ranking estacional (sugerido trimestral) que arranca en cero; al cerrar, el resultado queda como "leyenda de temporada" visible en el perfil, y el XP se integra al total permanente sin perder el sentido competitivo para usuarios nuevos.

### 10.3 Vitrina de Perfil Pública (Steam) — prioridad 2
Perfil visible por otros usuarios mostrando nivel/era, insignias destacadas (elegidas por el usuario), colección de cromos y rareza de sus logros más raros.

### 10.4 Fase Exploratoria — Capa Cripto (Upland/Rising Star sobre Hive)
- **Camino A (recomendado primero)**: simular una economía verificable internamente, aprovechando que ya existe Cero Borrado Lógico y trazabilidad tipo libro contable — validación de bajo riesgo antes de tocar blockchain real.
- **Camino B (evaluar después)**: tokens reales en Hive para activos como "Own the Spot" evolucionado. Implica: revisión legal/regulatoria en Colombia, necesidad de wallets para usuarios no técnicos, y que Hive corre como servicio externo (no consume el límite de funciones de Vercel, pero sí es una integración nueva).

---

## 11. Hoja de Ruta por Fases

### Fase 0 — Ya construido
20 niveles diseñados (pendiente activar), 4 senderos, misiones DAG, logros con rareza, patrocinios conceptuales SKATE.

### Fase 1 — Corto plazo
- Activar la tabla de 20 niveles (cambio de umbrales, sección 3.2).
- Desplegar tablas `sponsors` / `sponsor_canjes` y el flujo de canje de la sección 8.2 (Capa 1 de patrocinios).
- Lanzar Sendero Pandilla: tablas `pandillas` / `pandillas_miembros`, operaciones `pandilla_crear` / `pandilla_unirse`, misiones de la sección 5.3.

### Fase 2 — Mediano plazo
- Cromos coleccionables (tablas `cromos_catalogo` / `usuarios_cromos`, operación `cromo_intercambio`).
- Vitrina de perfil pública.

### Fase 3 — Mediano-largo plazo
- Primera Liga/Temporada estacional.
- Evolución de "Own the Spot" y "Territorio de Parche" hacia una forma de propiedad más duradera (preparación conceptual para el Camino A de la capa cripto).

### Fase 4 — Exploratoria, sin fecha comprometida
- Validar Camino A (ledger interno) con métricas de intercambio/retención.
- Si valida interés real: evaluar Camino B (Hive) y conexión de patrocinios con ACP/UCP a escala.

---

## 12. Riesgos a Vigilar
- **Límite de funciones**: toda operación nueva debe entrar como `tipo=` dentro de los 4 archivos existentes, nunca como archivo nuevo en `/api`.
- **Farming/fraude**: el mercado de cromos y el aporte de Fama de Pandilla son terreno fértil para cuentas coordinadas — las reglas anti-farming de la sección 7 deben implementarse desde el lanzamiento, no después.
- **Escala prematura**: Ligas, Territorio de Parche y Duelo de Pandillas solo se sienten justos con suficientes usuarios compitiendo — validar tamaño de comunidad antes de la Fase 3.
- **Riesgo regulatorio**: el Camino B de la capa cripto necesita revisión legal en Colombia antes de anunciarse.

---

## 13. Preguntas Pendientes de Decisión (sin responder aún)
1. ¿El módulo de patrocinios tiene ya marcas reales interesadas o firmadas, o sigue siendo 100% conceptual?
2. ¿Cuántos usuarios activos tiene hoy la plataforma aproximadamente?
3. ¿Confirmas el orden de prioridad propuesto (Steam → social/clanes → SKATE → Path of Exile → Upland/cripto)?

---

## 14. Glosario Rápido
- **DAG**: Grafo Acíclico Dirigido — misiones que se desbloquean solo tras cumplir prerrequisitos, sin ciclos.
- **JSONB flexible**: campo de base de datos que guarda información variable sin necesitar columna fija.
- **Cero Borrado Lógico**: nunca eliminar físicamente, solo cambiar el estado (`activo`).
- **UCP / ACP**: Universal Commerce Protocol (Google) y Agentic Commerce Protocol (OpenAI + Stripe) — estándares reales de 2025-2026 para compras hechas por agentes de IA.
- **MCP**: Model Context Protocol (Anthropic) — estándar de conexión entre IA y datos/herramientas externas.
- **Liga/Temporada**: periodo competitivo con ranking propio que se reinicia, dejando el progreso previo como prestigio permanente.
- **Fama de Pandilla**: contador colectivo propio de un grupo, independiente del XP individual de sus miembros.
