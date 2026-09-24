# ExploraCO — Sistema de Gamificación v5.0
## Documento Maestro Técnico + Hoja de Ruta (estado real consolidado: v4 + Entrega 016 "Gaming v5.0")

---

## 0. Nota sobre este documento, supuestos y leyenda de estados

Este documento es la versión **v5** del Plan Maestro. **NO modifica ni sustituye al v4**: `ExploraCO_Gamificacion_v4_Plan_Maestro.md` (531 líneas) queda como **documento histórico**. El v4 se escribió *antes* de implementar la gamificación v4 (ADR-018) y por tanto describe cosas "Propuestas" que hoy ya están construidas, y otras que a la fecha seguían solo en el diseño. El v5 consolida **el sistema COMPLETO y REAL** contra el código del repositorio (ADR-006: el archivo real es la única fuente de verdad; el historial de chat nunca lo es).

Cada afirmación técnica de este documento cita `archivo:línea` del repositorio. Cuando un dato proviene de un ADR en vez del código, se indica el ADR. No se inventan cifras.

### Leyenda de estados de implementación

| Estado | Significado |
|---|---|
| **IMPLEMENTADO** | Existe en el código del repo y su mecánica es verificable (backend y/o frontend). |
| **SOLO BACKEND** | El handler/consulta existe en `/api`, pero no hay UI conectada. |
| **SOLO DOCUMENTADO** | Está descrito en un ADR o en el Plan Maestro, pero no hay código que lo ejecute. |
| **ROTO** | El código existe pero no funciona end-to-end (falta una pieza, una variable o una página). |

### Supuestos de trabajo y alcance

1. **Presupuesto serverless 8/8 (cerrado):** Vercel Hobby permite 8 funciones. El tope está consumido; **cero archivos nuevos en `api/`** (BLUEPRINT.md:28-41). Toda mecánica nueva entra como rama `tipo=` (GET) o `tipo2=` (POST) dentro de los endpoints existentes.
2. **Formato:** markdown UTF-8 normal, español con tildes. Los `.js` de `/api` siguen siendo 100% ASCII-safe (ADR-002); este documento no.
3. **Siguen abiertas las 3 preguntas de negocio del v4** (sección 14): estado real de patrocinios, tamaño de la base de usuarios activos y orden de prioridad de las referencias de juego.
4. La Entrega 016 ("ExploraCO Gaming v5.0") está **implementada y verificada en working tree**, con la migración 016 **pendiente de aplicar en Neon** y pendientes de variables de entorno y deploy (PROJECT.md:70-78, TASK-101 en TASKS.md:2489-2520, `docs/DEPLOY_016.md`).

---

## 1. Resumen Ejecutivo

ExploraCO tiene hoy un motor de gamificación **completo y en producción lógica** (working tree): progresión de 20 niveles derivada de `xp_total`, economía de consumo con de-nivel, cromos coleccionables, Parches (clanes) con retos, misiones y logros server-side, y una capa v5.0 de referidos multinivel, crowdsourcing geoespacial (Wayfarer "Activo Oculto"), facciones y vocaciones artísticas.

**Qué estaba en el v4 y hoy está IMPLEMENTADO:**

- **20 niveles / 4 eras / badge** derivados de `xp_total`, nunca persistidos (api/usuarios.js:14-60).
- **Economía de XP** con 13 consumibles comprables y usables, con de-nivel real (ADR-018; migración 010 + 015).
- **Cromos** (drop probabilístico 15%, rareza por roll, garantía con imán) y **Parches** (fundación nivel 14, máx. 10 miembros, fama 10%, retos con ventana).
- **Misiones (28)** y **Logros (30)** como catálogos en código con evaluación DAG server-side.

**Qué añadió la v5.0 (ADR-025/026/027) y su estado:**

- **Referidos de 5 niveles** con reparto 10/5/3/2/1 % FLOOR: backend IMPLEMENTADO; registro por `?ref=` **ROTO** en frontend (no existe `registro.html`).
- **Wayfarer / Activo Oculto** (proponer / votar / checkin / moderar): backend IMPLEMENTADO (checkin SOLO BACKEND); UI de proponer/votar/ranking en comunidad.html.
- **4 Facciones** con primera elección gratis y cambio por 500 XP + cooldown 15 días: IMPLEMENTADO; afinidad de Parche y control territorial SOLO DOCUMENTADO.
- **Vocaciones / Mundo Artistas** (4, nivel 5, acumulables): IMPLEMENTADO.
- **Sesión firmada JWT + nonce + device_hashes + email verificado** (anti-Sybil): IMPLEMENTADO en el backend; aplicado solo a `visita`, `activo_oculto_votar` y `activo_oculto_checkin`.
- **Presencia física** en `visita` (Haversine, radios adaptativos, bono rural): backend IMPLEMENTADO; frontend **ROTO** (`marcarVisitado` no envía JWT ni nonce).

**Qué sigue conceptual (SOLO DOCUMENTADO):** patrocinios (sponsors/canjes), ligas/temporadas, afinidad y territorio de facción, e intercambio de cromos con UI.

---

## 2. Arquitectura Técnica Vigente

### 2.1 Infraestructura serverless y Escudo GOLD

- **Vercel Hobby:** tope duro de **8 funciones serverless**, consumido al 100 % (BLUEPRINT.md:28-41).
- **Escudo GOLD:** todo despliegue pasa por `node --check` + ASCII-safety (0 bytes > 127 y 0 backticks en `api/*.js`) + balance de `div` en HTML.
- **DB driver:** `@neondatabase/serverless` con `neon()` (nunca `pg`); CommonJS estricto.
- **Patrón de operación:** GET con `?tipo=<valor>`; POST con `body.tipo` (en `interacciones.js` el POST lo asigna a la variable local `tipo2`, api/interacciones.js:2668).

### 2.2 Endpoints vigentes (8/8)

| Endpoint | Versión / foco | Mecánica gaming |
|---|---|---|
| `api/destinos.js` | listado público | expone destinos/ratings que alimentan la gamificación (BLUEPRINT.md:32) |
| `api/usuarios.js` | **v9** (api/usuarios.js:1-2) | perfil, leaderboard, upsert, referidos, facciones, email, JWT |
| `api/interacciones.js` | **v13** (api/interacciones.js:1) | reseñas/guardados/visitas/ratings, misiones, logros, albumes, cromos, Parches, Wayfarer |
| `api/admin-destinos.js` | v2 | CRUD de destinos |
| `api/publicar-lugar.js` | — | formulario público (draft) |
| `api/pagina-destino.js` | v9 (BLUEPRINT.md:37) | render HTML por slug, botón de visita |
| `api/admin.js` | — | moderación, consumibles, activos ocultos |
| `api/utilidades.js` | — | sitemap, visitas, fotos, diagnóstico |

Citas de versión: BLUEPRINT.md:30-39; PROJECT.md:66,78.

### 2.3 Persistencia híbrida — Regla de Merge JSONB (ADR-003)

Toda actualización de un campo JSONB (`progreso_misiones`, `progreso_logros`, `progreso_social`, `progreso_album`, `capacidades`, `vocaciones`, `device_hashes`) usa **merge** (`||`) sobre `COALESCE`, nunca reemplazo total. Ejemplo del inventario de consumibles (api/interacciones.js:4114-4120):

```sql
UPDATE usuarios SET
  xp_total = xp_total - $1,
  capacidades = COALESCE(capacidades,'{}'::jsonb)
    || jsonb_build_object('consumibles', COALESCE(capacidades->'consumibles','{}'::jsonb)
      || jsonb_build_object($2, COALESCE((capacidades->'consumibles'->>$2)::int, 0) + 1))
WHERE id=$3 AND xp_total >= $1
RETURNING xp_total;
```

**Cero Borrado Lógico:** `quitar_guardado` / `quitar_visita` hacen `activo=false` (api/interacciones.js:4714-4718, 4942-4946); `pandilla_salir` desactiva la membresía (api/interacciones.js:4434-4442); la moderación de Activo Oculto cambia estado, nunca borra (api/admin.js:430-456). Excepción histórica autorizada: la purga única de visitas de la migración 014.

### 2.4 Tabla consolidada de migraciones (003 → 016)

Todas viven en `db/migrations/` y son **acumulativas e idempotentes** (ADR-008). "Aporta" = objetos que crea la migración.

| # | Archivo | Aporta (objetos reales) | Estado de aplicación |
|---|---|---|---|
| 003 | `003_interacciones_dims_traveller.sql` | `interacciones.dims` jsonb, `interacciones.traveller_type` | Aplicada |
| 004 | `004_usuarios_blog_autor.sql` | `usuarios.foto_url`, `usuarios.ciudad_base` | Aplicada |
| 005 | `005_usuarios_progreso_logros.sql` | `usuarios.progreso_logros` jsonb | Aplicada |
| 006 | `006_mapas.sql` | tablas `mapas`, `mapa_destinos` | Aplicada |
| 007 | `007_milestones_v2.sql` | `interacciones.votos_utiles`, tabla `resena_votos`, `usuarios.patrocinios` jsonb | Aplicada |
| 008 | `008_comunidad_social.sql` | tablas `chat_salas`, `chat_mensajes`, `planes_viaje`, `planes_miembros`; `usuarios.progreso_social` | Aplicada |
| 009 | `009_albumes.sql` | tablas `albumes`, `album_fotos`, `album_votos`; `usuarios.progreso_album`; índice `idx_album_fotos_dedup` | Aplicada |
| 010 | `010_gamificacion_v4.sql` | tablas `consumibles`, `compra_consumibles`, `consumo_consumibles`, `cromos_catalogo`, `usuarios_cromos`, `pandillas`, `pandillas_miembros`, `pandilla_retos`, `cromo_intercambios`; `usuarios.capacidades`; seed de **10 consumibles** | Aplicada |
| 011 | `011_ficha_direccion_destinos.sql` | `destinos.address` | Aplicada (2026-09-13) |
| 012 | `012_interacciones_dedup_resena_rating.sql` | índice único parcial `idx_interacciones_dedup_resena_rating` (solo `resena`/`rating`) | Aplicada |
| 013 | `013_album_comentarios.sql` | tablas `album_comentarios`, `album_comentario_votos` | Aplicada |
| 014 | `014_reset_visitas_presencia_fisica.sql` | purga única + respaldo `interacciones_visitas_reset_backup`; índice `idx_interacciones_visita_unica` | Aplicada |
| 015 | `015_epic_prompt.sql` | `usuarios.vocaciones` jsonb; `planes_viaje.sala_id`; limpieza de salas de sistema; **3 consumibles** de perfil | Aplicada (verificar en Neon; ver Nota) |
| 016 | `016_multinivel_crowdsourcing.sql` | **10 columnas** en `usuarios` + **4 tablas** (`activos_ocultos`, `activos_ocultos_votos`, `activos_ocultos_checkins`, `geo_nonces`) + **8 índices** | **PENDIENTE de aplicar en Neon (BLOQUEANTE)** |

Fuente de objetos: los propios archivos `db/migrations/*.sql`. Estado 011-014: NEXT.md:295, 391, 458-459. Estado 016: TASKS.md:2514-2518, `docs/DEPLOY_016.md:42-61`.

> **Nota de trazabilidad (015):** `docs/DEPLOY_016.md:61` declara como prerrequisito "migraciones 010 a 015 ya aplicadas", pero NEXT.md:110-112 registra que la 015 figuraba como pendiente en la sesión TSK-100 y que **ADR-006 exige confirmarla en Neon** antes de asumirla. El v5 la marca como "Aplicada (verificar)" en vez de afirmarlo como hecho.

### 2.5 Modelo de datos gaming (extracto)

```sql
-- usuarios (migraciones 010, 015, 016)
xp_total                     integer NOT NULL DEFAULT 0,
capacidades                  jsonb NOT NULL DEFAULT '{}'::jsonb,   -- 010: inventario consumibles
vocaciones                   jsonb NOT NULL DEFAULT '{}'::jsonb,   -- 015
referido_por                 uuid REFERENCES usuarios(id),         -- 016
codigo_referido              varchar(20),                          -- 016 (índice único parcial)
xp_ref_total                 int DEFAULT 0,                        -- 016 (campo de apoyo)
referidos_directos_contados  int DEFAULT 0,                        -- 016
faccion                      varchar(20) CHECK (faccion IS NULL OR faccion IN
                             ('exploradores','curadores','creadores','artistas')), -- 016
faccion_elegida_en           timestamptz,                          -- 016
email_verificado             boolean DEFAULT false,                -- 016
email_token / email_token_expira / device_hashes jsonb             -- 016

-- Wayfarer (016)
activos_ocultos(id, propuesto_por, nombre, descripcion, lat, lng, foto_url,
  categoria, ciudad, estado CHECK('pendiente','aprobado','rechazado'),
  votos_favor>=0, votos_contra>=0, activo, creado_en, resuelto_en)
activos_ocultos_votos(activo_id, usuario_id, voto CHECK('favor','contra'),
  PK(activo_id, usuario_id))
activos_ocultos_checkins(id, activo_id, usuario_id, lat, lng, accuracy, activo,
  UNIQUE(activo_id, usuario_id) WHERE activo=true)
geo_nonces(id, usuario_id, nonce UNIQUE, proposito, usado,
  expira_en DEFAULT now() + interval '2 minutes')
```

Citas: `db/migrations/016_multinivel_crowdsourcing.sql:53-184`; `db/migrations/010_gamificacion_v4.sql:16-207`; `db/migrations/015_epic_prompt.sql:46-57`.

---

## 3. Progresión del Jugador — 20 Niveles en 4 Eras

### 3.1 Tabla maestra de niveles

Umbrales exactos (api/usuarios.js:14-35; espejo en api/interacciones.js:151-153 y usuario-session.js:22-25). El nivel, la era y el badge se **derivan** en cada lectura desde `xp_total` y **nunca se persisten** (api/usuarios.js:6-13, 53-60).

| Nivel | Badge | Era | Umbral XP |
|---|---|---|---|
| 1 | Caminante Novato | Mundana | 0 |
| 2 | Rastreador Local | Mundana | 100 |
| 3 | Explorador Urbano | Mundana | 250 |
| 4 | Aventurero Regional | Mundana | 450 |
| 5 | Vanguardia Territorial | Mundana | 700 |
| 6 | Embajador de Zona | Patrocinada | 1.000 |
| 7 | Fotógrafo de Ruta | Patrocinada | 1.400 |
| 8 | Cronista de Historias | Patrocinada | 1.900 |
| 9 | Buscador de Leyendas | Patrocinada | 2.500 |
| 10 | Guía de Fronteras | Patrocinada | 3.200 |
| 11 | Estratéga Comunitario | Organizador | 4.000 |
| 12 | Documentalista Visual | Organizador | 5.200 |
| 13 | Señor del Spot | Organizador | 6.800 |
| 14 | Cartógrafo de Cine | Organizador | 8.500 |
| 15 | Protector del Patrimonio | Organizador | 10.500 |
| 16 | Curador de Colombia | Leyenda | 13.000 |
| 17 | Mariscal de Parche | Leyenda | 16.000 |
| 18 | Cineasta de Territorio | Leyenda | 19.500 |
| 19 | Inmortal del Mapa | Leyenda | 24.000 |
| 20 | Gran Maestro ExploraCO | Leyenda | 30.000+ |

**Eras** (api/usuarios.js:46-51; api/interacciones.js:163-168): Mundana ≤ 5 · Patrocinada ≤ 10 · Organizador ≤ 15 · Leyenda > 15.

### 3.2 Derivación dinámica y de-nivel

- `calcularNivel()` recorre el arreglo de umbrales y devuelve `{nivel, badge_actual}` (api/usuarios.js:37-44).
- `conNivel()` inyecta `nivel`, `badge_actual` y `era` en cada fila leída (api/usuarios.js:53-60).
- **De-nivel real (ADR-018):** como el nivel se deriva de `xp_total`, comprar consumibles puede **bajar de nivel** y revocar capacidades. `comprar_consumible` devuelve `nivel_anterior`, `nivel_nuevo` y `bajo_nivel` (api/interacciones.js:4111-4137).

### 3.3 Capacidades desbloqueadas por nivel (UI)

Mapa en `usuario-session.js:45-55` (una capacidad está activa si `nivelActual >= umbral`):

| Nivel | Capacidad |
|---|---|
| 6 | `crear_planes` |
| 7 | `emojis_premium` |
| 10 | `sello_sala` |
| 11 | `organizar_actividad` |
| 14 | `fundar_pandilla` |
| 15 | `moderar_galerias` |
| 16 | `cromo_dorado` |
| 17 | `mariscal_parche` |
| 19 | `inmortal` |

Capacidades de misión (se traducen a `usuario.capacidades`): `organizar_actividad`, `subir_fotos`, `chat`, `moderador_chat`, `crear_chat` (api/usuarios.js:67-73, 81-93).

---

## 4. Senderos de Especialización

`GET /api/interacciones?tipo=tabla_destino&usuario_id=...` devuelve 5 senderos con fama por sendero y un tier común `FAMA_TIERS` = Semilla 0 / Aprendiz 100 / Practicante 250 / Especialista 450 / Maestro 700 (api/interacciones.js:1939-2081).

| Sendero | Fama (cálculo real) | Cita |
|---|---|---|
| **Explorador** | `SUM(xp_ganado)` de visitas + guardados activos; cuenta guardados/visitas | api/interacciones.js:1947-1954 |
| **Crítico** | `SUM(xp_ganado)` de `resena`+`rating`; cuenta reseñas/votos | api/interacciones.js:1955-1962 |
| **Organizador** | `n_mapas*40 + n_destinos*5` | api/interacciones.js:1963-1972, 2030 |
| **Audiovisual** | `SUM(xp_ganado)` de `foto` + `n_albumes_geo*30 + n_videos*35` | api/interacciones.js:1977-1989, 2033 |
| **Parche** | `pandillas.fama_total` de la pandilla activa; sin Parche → nivel 0 "Sin Parche" | api/interacciones.js:1990-1997, 2063-2072 |

**Relabel Pandilla → Parche:** es **solo texto visible en la UI**. La API y el esquema siguen usando `pandillas*`, `pandilla_crear`, `pandilla_reto`, etc. (NEXT.md:121-122; comunidad.html:301, 400, 1427).

**Referencias cruzadas v5.0:** el sendero Parche se cruza con **Facciones** (sección 8.3) y con las **Vocaciones** (sección 8.4). La **afinidad de Parche a facción (x1.3/x1.15/x1.0)** y el **control territorial por ciudad** están SOLO DOCUMENTADOS (ADR-027; 0 coincidencias de "afinidad" en el código).

---

## 4-bis. Casas (cofre + nivelacion) y Clases Rising Star (TSK-112 / ADR-038)

Capa de progresion posterior al v5.0, implementada en working tree (2026-09-18) y documentada en ADR-038 + ENMIENDA 1. No crea endpoints (8/8) ni reemplaza el Arbol de 16 ramas (ADR-028): las Clases y el cofre de Casa son capas nuevas.

- **Casas (reuso, sin `casa_id`):** se reusa `usuarios.casa` (`condor|jaguar|delfin`); la migracion 024 crea `casas_cofre` (cofre por Casa: `xp_cofre_total`, `poblacion_activa`, `factor_conversion`, `actualizado_en`) con seed idempotente y sin FK en v1.
- **Factor de nivelacion por poblacion dominante (runtime):** tag `dominante` (>45% -> x0.85), `equilibrada` (25%-45% -> x1.00) o `rezagada` (<25% -> x1.30). Se aplica UNA vez en `calcularXpFinal`; `arancel_inter_casa`/`fee_mercado_interno` se exponen pero no se cobran en v1.
- **Tributacion del 10% al cofre:** sobre el `xp_final` post-factor, best-effort via `acreditarClaseYCofre` (literal `0.10`, sin endpoint `casa_tributar`).
- **Helper unico de XP:** triada `contextoXpE` / `calcularXpFinal` / `calcularNivelClase` + `acreditarClaseYCofre` en `api/interacciones.js` v21, sobre 14 acciones de la whitelist (excluidos cobros y bonos a terceros); los `UPDATE usuarios SET xp_total` siguen inline para preservar contadores.
- **Clases Rising Star (curva `XP_NIVEL_CLASE`):** `BONUS_CLASE` = cartografo 0.08 / cronista 0.10 / explorador 0.07; `XP_NIVEL_CLASE` = 11 umbrales `[0,100,250,500,900,1400,2100,3000,4200,5700,7500]`; `xp_clase` incrementa el **50% del `xp_final`**. `clase_elegir` (`api/usuarios.js` v16): primera eleccion gratis y recambio con 300 XP + cooldown de 30 dias, sin gate de nivel (ENMIENDA 1).
- **Estado:** verificado con Escudo GOLD y `smoke_038_casas_clases` 76/76 PASS; pendiente aplicar la migracion 024 en Neon + deploy. Detalle en `TASKS.md` TSK-112, `NEXT.md` y ADR-038.

---

## 5. Misiones (28) y Logros (30)

### 5.1 Misiones — catálogo en código, DAG server-side

`MISIONES` vive en api/interacciones.js:214-548 (28 objetos). Cada misión declara `requiere[]` (prerrequisitos, DAG), `check(ctx)` (evaluación server-side) y `xp`. El progreso por usuario vive en `usuarios.progreso_misiones` (merge JSONB, ADR-003). `GET ?tipo=misiones` ejecuta backfill y devuelve catálogo + estado (api/interacciones.js:1683).

| Grupo | Nº | IDs |
|---|---|---|
| `general` | 11 | `mis_primer_guardado`, `mis_primera_resena`, `mis_primera_visita`, `mis_gran_arquitecto`, `mis_fotografo`, `mis_chat_mensajero`, `mis_chat_moderador`, `mis_chat_creador`, `mis_chat_activo`, `mis_plan_creador`, `mis_plan_unido` |
| `ciudad` | 3 | `mis_explorador_bogota`, `mis_organizador_bogota`, `mis_own_spot_bogota` |
| `categoria` | 2 | `mis_nomada_digital`, `mis_itinerario_perfeccion` |
| `fotos` | 6 | `mis_primera_foto_social`, `mis_creador_album`, `mis_album_curador`, `mis_fotografo_social`, `mis_cazador_recompensas`, `mis_favorito_del_pueblo` |
| `artista` | 6 | `mis_primera_vocacion_artista`, `mis_camino_musica`, `mis_camino_cine`, `mis_camino_arte`, `mis_camino_escritor`, `mis_poliglota_artista` |

**Corrección al v4:** el v4 (sección 5.3) proponía un grupo de "Misiones de Pandilla" (`mis_fundar_parche`, `mis_primer_reto_parche`, `mis_territorio_parche`). **Esas misiones no existen en el código**: no hay grupos `pandilla` ni `social`. El juego colectivo se canaliza vía **retos de Parche** (`pandilla_retos`, sección 8.6) y el **sendero Parche**.

### 5.2 Logros — 30, con tier y rareza global

`LOGROS` en api/interacciones.js:579-864 (30 objetos: 19 base + 5 de ciudad + 3 Milestones v2 + 3 sociales). Tier `bronce/plata/oro/platino` y `xp` de recompensa. `GET ?tipo=logros` devuelve el catálogo con estado/fecha/tier y la **rareza global %** calculada con `jsonb_object_keys` sobre usuarios activos (api/interacciones.js:1639; fórmula en el header v5, api/interacciones.js:56-64). Grupos: `general`, `coleccion`, `fotos`, `ciudad`.

| Grupo | Nº | IDs |
|---|---|---|
| `general` | 12 | `logr_primer_voto`, `logr_critico_10`, `logr_critico_25`, `logr_opinion_blog`, `logr_votos_blog_5`, `logr_votos_blog_10`, `logr_spot_domado`, `logr_especialista_gastro`, `logr_cazador_rarezas`, `logr_social_chat`, `logr_social_plan`, `logr_anfitrion` |
| `coleccion` | 6 | `logr_coleccionista_10`, `logr_coleccionista_50`, `logr_ciudades_5`, `logr_visitas_5`, `logr_visitas_20`, `logr_pionero` |
| `fotos` | 7 | `logr_albumero`, `logr_coleccionista_visual`, `logr_maestro_fotografo`, `logr_favorito_comunidad`, `logr_estrella_del_mapa`, `logr_guardian_historias`, `logr_viajero_multimedia` |
| `ciudad` | 5 | `logr_alcalde_bogota`, `logr_conquistador_cartagena`, `logr_conquistador_medellin`, `logr_senor_santa_marta`, `logr_cali_es_colombia` |

Composición: 19 base + 5 de ciudad + 3 de Milestones v2 (`logr_spot_domado`, `logr_especialista_gastro`, `logr_cazador_rarezas`) + 3 sociales (`logr_social_chat`, `logr_social_plan`, `logr_anfitrion`) = **30**.

Milestones v2 (api/interacciones.js:759-864): `logr_spot_domado` (oro), `logr_especialista_gastro` (plata), `logr_cazador_rarezas` (platino), `logr_social_chat`, `logr_social_plan`, `logr_anfitrion`.

**Corrección al v4:** el v4 (sección 6) listaba solo 16 logros y decía "Catálogo de Logros y Rareza Global". El catálogo real es de 30 (ADR-024 añadió `logr_pionero`).

---

## 6. Economía de XP

### 6.1 Matriz completa de fuentes de XP

Todas las constantes citadas salen de `api/interacciones.js`.

| Acción (handler) | XP base | Topes / reglas anti-farming | Cita |
|---|---|---|---|
| Reseña corta (≤50 chars) | 10 | 1 por usuario+destino (409) | api/interacciones.js:4543-4544, 4507-4521 |
| Reseña larga (>50 chars) | 25 | idem | api/interacciones.js:4543-4544 |
| Visita confirmada | 20 (+20 rural plano) | geocerca + dedup + cooldown 90 s + tope 30/24 h | api/interacciones.js:4880, 4863, 4895 |
| Rating rápido | 10 | 1 por usuario+destino (409) | api/interacciones.js:4976, 4960-4972 |
| Guardado | 5 | primera vez; reactivar = 0 XP | api/interacciones.js:4672, 4660-4670 |
| Foto a destino | 15 | capacidad `mis_fotografo` | api/interacciones.js:3401-3409 |
| Voto de foto (`foto_voto`) | 5 | 1 por usuario+foto (409); no auto-voto | api/interacciones.js:3441-3449 |
| Album crear | 20 | máx. 5 álbumes/mes | api/interacciones.js:3502-3505, 3482-3486 |
| Album agregar foto | 15 agregador / 10 autor original | máx. 10 fotos/día; el autor original topa 10 XP/día | api/interacciones.js:3552-3571 |
| Album votar (`album_voto`) | 5 | máx. 20 votos/día; dedup PK (409) | api/interacciones.js:3601-3613 |
| Comentario de media | 2 | tope 20 XP/día (10 comentarios); rate-limit 30/día | api/interacciones.js:3908-3924 |
| Mensaje de chat | 2 | tope 20 XP/día (10 mensajes) | api/interacciones.js:3097-3108 |
| Mensaje de chat de plan | 2 | mismo tope de chat | api/interacciones.js:3297-3307 |
| Voto Wayfarer (Activo Oculto) | 5 | tope 30 XP/día (≈6 votos con XP); 1 voto por usuario | api/interacciones.js:2773-2791 |
| Checkin Activo Oculto | 15 | dedup por UNIQUE parcial; cooldown 90 s | api/interacciones.js:2887-2891 |
| `admin_xp` (admin) | variable | `delta_xp` o `nivel` 1-20; **no degrada** (`Math.max`) | api/interacciones.js:3733-3795 |
| `comprar_consumible` | **resta** (precio) | máx. 5 compras/día; `xp_total >= precio` | api/interacciones.js:4081-4137 |

Los **14 puntos de XP real** que reparten a la pirámide de referidos (excluyen `admin_xp`, `comprar_consumible`, `album_voto`, `review_voto` y `usuario`):

`5` (voto Wayfarer), `15` (checkin), `xpChat`, `xpPcm`, `15` (foto), `5` (foto_voto), `20` (album_crear), `15` (album_agregar_foto), `10` (autor original), `cfcXp` (comentario), `xpResenaEntregado`, `xpGuardadoFinal`, `xpTotalVisita`, `xpRatingFinal` → api/interacciones.js:2788, 2891, 3108, 3307, 3409, 3449, 3505, 3560, 3569, 3920, 4604, 4698, 4908, 5010.

> **Discrepancia detectada:** `album_voto` (+5, L3607) **no** llama a `repartirXpReferidos` ni a `intentarObtenerCromo`/`aplicarFamaPandilla`; es la única fuente de XP relevante que queda fuera de esos tres sistemas. Se documenta tal cual (no se corrige, fuera del alcance).

### 6.2 Multiplicadores

| Mecanismo | Efecto | Cita |
|---|---|---|
| Líder de spot | `x1.1` (ROUND) si el usuario es autor de la reseña más votada de la ciudad del destino | api/interacciones.js:891-901 |
| Amuleto de Doble XP | `x2` sobre 5 acciones (`multiplicador_x2_usos`) | api/interacciones.js:942-950; uso en 4218-4220 |
| Fama de Parche | `+10 %` (ROUND) del XP entregado a `pandillas.fama_total`; `trompeta_fama` lo duplica 24 h | api/interacciones.js:1007-1028 |
| Cromo | 15 % de drop; rareza por roll | api/interacciones.js:958-1002 |
| Reparto de referidos | 10/5/3/2/1 % FLOOR (5 niveles) | api/interacciones.js:1136-1155 |

### 6.3 Consumibles (13)

Catálogo en tabla `consumibles`, precios editables desde admin (`consumibles_lista/crear/editar/toggle`, api/admin.js). 10 de la migración 010 + 3 de perfil de la 015.

| Clave | Nombre | Precio XP | Fuente |
|---|---|---|---|
| `pluma_inspirada` | Pluma Inspirada | 600 | 010:160 |
| `cuaderno_expedicion` | Cuaderno de Expedición | 450 | 010:161 |
| `pergamino_mapa` | Pergamino del Cartógrafo | 500 | 010:162 |
| `sala_efimera` | Sala Efímera | 800 | 010:163 |
| `amuleto_x2` | Amuleto de Doble XP | 350 | 010:164 |
| `imantador_cromos` | Imán de Cromos | 400 | 010:165 |
| `trompeta_fama` | Trompeta de la Fama | 500 | 010:166 |
| `vitrina_estelar` | Vitrina Estelar | 300 | 010:167 |
| `pin_cromado` | Pin Cromado | 250 | 010:168 |
| `pase_vip` | Pase VIP Leyenda | 1.500 | 010:169 |
| `perfil_marco_dorado` | Marco Dorado | 700 | 015:100 |
| `perfil_tema_oscuro` | Tema Galería Oscura | 500 | 015:101 |
| `perfil_banda_artista` | Banda de Artista | 900 | 015:102 |

Rango de precios: **250–1.500 XP** (cumple el hecho canónico). Efectos al usar (`usar_consumible`, api/interacciones.js:4141-4248): `permiso_arte`, `albums_extra`, `mapas_extra`, `salas_efimeras`, `multiplicador_x2_usos`, `cromo_garantia`, `fama_x2_hasta`, `vitrina_estelar_hasta`, `pin_mapa_hasta`, `vip_hasta`. Los 3 `perfil_*` son permanentes.

**Tablas de ledger:** `consumibles`, `compra_consumibles`, `consumo_consumibles` (append-only), `cromo_intercambios` (migración 010:16-207).

### 6.4 Multiplicador de Origen por lejanía (ADR-058 / TSK-155, migración 038)

Capa nueva de la economía de XP (2026-09-24): el XP por acciones físicas crece con la **distancia real (haversine)** del usuario al punto geográfico de la acción, con curva escalonada por perfil de viajero. Decision: **ADR-058** en DECISIONS.md; migración **038 APLICADA en Neon el 2026-09-24** + seed geo cargado (1.122 ciudades / 245 países). NO crea endpoints (**8/8 INTACTO**). Detalle en `api/interacciones.js` v29/v30, `api/usuarios.js` v22 y `api/admin.js` v6.

- **Curva (canónica en JS `calcularFactorOrigen`, con espejo SQL validado por `smoke_origen_factor_parity.js` 111/111):**
  - **Local** (ciudad_base en Colombia, distancia ≤ `origen_km_local` 25 km): **x1.00** (piso, nunca castiga).
  - **Nomada** (con ciudad/pais en Colombia pero lejos, con `origen_declarado_en ≥ 7 días`): `1.00 + 0.20·min(km/1000, 1)` → tope **x1.20 a 1000 km**.
  - **Extranjero** (pais_base ≠ CO; exige email verificado + cuenta ≥ 7 días + origen declarado ≥ 7 días): `1.20 + 0.20·min(km/3000, 1)` → tope **x1.40 a 3000 km**.
  - **Sin tier elegible o sin punto geográfico resoluble:** **x1.00** (degradación implícita).
- **Motor de XP (v29):** `xp_final = base · min( min(M_nivel·mult_clase·factor_casa, cap_progresion) · mult_origen · stack_temp, cap_global )` — `mult_origen` es **hermano de `stack_temp`** (se multiplica fuera del cap de progresión pero dentro del cap global). **ELIMINA el bono plano x1.2 del ADR-028/WP-5.**
- **Arbol de Clases unificado (v30):** cada rama evalúa su propio punto con `sqlFactorFila` (espejo PER-ROW); **nerf M-4:** usuarios sin ciudad_base/punto pasan de x1.2 a x1.00 (aceptado).
- **Anti-teleport (v22):** cambiar `ciudad_base`/`pais_base` fija `origen_declarado_en=NOW()`; elegibilidad con antigüedad (7 días) + email verificado para extranjeros.
- **Datos (038):** `geo_ciudades` (1.122 filas DIVIPOLA, PK `cod_mpio`, `es_capital` para desempatar homónimos), `geo_paises` (245, centroides ISO-3166-1), `usuarios.origen_declarado_en`, `xp_ledger.mult_origen numeric(10,6)` + `origen_tier`, 7 claves en `gamificacion_config` (curva parametrizable sin deploy).
- **Monitoreo:** `salud_red` (v6) agrega `distribucion_origen`/`mult_origen_stats`/`config_origen`/`alertas_origen` (cuentas extranjeras nuevas con factor alto = revisión manual).
- **Smokes:** `smoke_058_origen_clasificador` **90/90** (sin BD, en `npm test`) + `smoke_origen_factor_parity` **111/111** (Neon, gate `npm run smoke:origen`).
- **Riesgos / deuda:** cap_global puede absorber el premio en stacks altos; curva duplicada JS/SQL (parity = red de seguridad); sin verificación documental de nacionalidad (monitoreo en `alertas_origen`); seed DIVIPOLA sin auto-update; drift heredado 20→40 niveles (ADR-053).

---

## 7. Coleccionables (Cromos) y Vitrina

### 7.1 Cromos

- **Drop:** 15 % por acción (`Math.random() >= 0.15` → sin cromo) — api/interacciones.js:960.
- **Rareza por roll:** `dorado < 0.07`, `epico < 0.25`, `raro < 0.55`, resto `comun` (api/interacciones.js:963-975).
- **Garantía épica:** con `capacidades.cromo_garantia = 'epico'` (`imantador_cromos`), fuerza épico o dorado y consume la garantía (api/interacciones.js:965-977).
- **UPSERT** en `usuarios_cromos` con `cantidad + 1` (api/interacciones.js:993-996).
- **Tablas:** `cromos_catalogo`, `usuarios_cromos`, `cromo_intercambios` (migración 010:61-87, 195-207).
- **Intercambio** (`cromo_intercambio`): requiere ≥2 copias, debita emisor, acredita receptor, ledger append-only, máx. 3/día (api/interacciones.js:4261-4329). **SOLO BACKEND** (sin UI; 0 coincidencias en HTML).
- **Disparo manual** `cromo_obtener` (api/interacciones.js:4251-4257).

### 7.2 Vitrina de perfil

`mi-perfil.html` implementa la vitrina: Tienda de Consumibles (L298-301), Mi Inventario (L303-305) y Mis Cromos (L307-310, carga vía `?tipo=mis_cromos`). El consumible `vitrina_estelar` destaca el perfil 7 días (api/interacciones.js:4228-4231). La **vitrina pública extendida** (perfil visible por terceros con insignias elegidas) descrita en el v4 sección 10.3 sigue **SOLO DOCUMENTADO**.

---

## 8. Sistemas v5.0 (Entrega 016)

### 8.1 Referidos — pirámide multinivel

- **Columnas:** `referido_por` (self-FK), `codigo_referido` (único parcial), `xp_ref_total`, `referidos_directos_contados` (migración 016:53-72).
- **Código:** 6 caracteres, alfabeto sin ambiguos `abcdefghjkmnpqrstuvwxyz23456789` (api/usuarios.js:129-136); se genera y persiste al primer pedido, hasta 6 reintentos (api/usuarios.js:223-277).
- **Reparto:** CTE recursiva de máx. 5 niveles; `FLOOR` de 0.10/0.05/0.03/0.02/0.01 sobre `xp_ref_total`; tope por ancestro `referidos_directos_contados < 500` (api/interacciones.js:1136-1155).
- **Registro con `?ref=`:** solo el brazo INSERT completa el árbol (ON CONFLICT DO UPDATE no toca `referido_por`); topes 500 directos y 20/día; auto-referido → 400 (api/usuarios.js:457-519).
- **Lectura:** `GET tipo=referido_codigo` (api/usuarios.js:223-277) y `GET tipo=referido_red` (CTE 5 niveles agregada por nivel, api/usuarios.js:281-308).
- **UI:** sección "Mi Red de Referidos" con QR en `mi-perfil.html:468, 1783-1843` (QR vía `api.qrserver.com`, L1801).
- **Estado: ROTO en el flujo de captura.** El enlace que se comparte apunta a `/registro.html?ref=<codigo>` (`mi-perfil.html:1800`), pero **`registro.html` NO existe** en el repositorio (verificado con `Test-Path`) y **ningún archivo captura `?ref=`** para inyectarlo en el upsert. El backend soporta `req.query.ref` (api/usuarios.js:461) pero el frontend nunca lo envía. Backend IMPLEMENTADO; captura en registro ROTO.

### 8.2 Wayfarer / Activo Oculto

Crowdsourcing geoespacial peer-to-peer (migración 016:90-184). Estados: `pendiente / aprobado / rechazado`.

| Operación | Gate | XP | Cita |
|---|---|---|---|
| `GET tipo=geo_nonce_solicitar` | usuario_id | — | api/interacciones.js:1462-1472 |
| `GET tipo=activos_ocultos_pendientes` | usuario_id o admin | — (excluye propias; estado `rechazado` derivado si >30 días sin votos) | api/interacciones.js:1479-1505 |
| `POST tipo=activo_oculto_proponer` | email verificado (sin gate de nivel) | 0 al proponer | api/interacciones.js:2679-2711 |
| `POST tipo=activo_oculto_votar` | JWT + email verificado + nivel 5 + no auto-voto + 1 voto | +5 (tope 30/día) | api/interacciones.js:2717-2798 |
| `POST tipo=activo_oculto_checkin` | JWT + nonce + `device_hash` registrado + geocerca + cooldown 90 s + tope 30/24 h | +15 | api/interacciones.js:2804-2894 |
| `POST admin` `recurso=activos_ocultos&tipo=activo_oculto_moderar` | Bearer admin | +50 al proponente al aprobar (con reparto); rechazar 0 | api/admin.js:412-467 |

- **Quórum ±3:** el estado se recalcula server-side en la misma sentencia del voto (api/interacciones.js:2756-2772).
- **UI:** proponer y votar en `comunidad.html:2050, 2131` (sección Activo Oculto, L1868-1880) y moderación en `admin.html` (recurso `activos_ocultos`, comentario L6770). **`activo_oculto_checkin` es SOLO BACKEND** (sin llamada desde HTML).
- **Tablas:** `activos_ocultos`, `activos_ocultos_votos`, `activos_ocultos_checkins`, `geo_nonces` (migración 016:90-184).

### 8.3 Facciones

- **4 facciones:** `exploradores`, `curadores`, `creadores`, `artistas` — CHECK en `usuarios.faccion` (migración 016:58-60; api/usuarios.js:140).
- **Primera elección gratis:** `UPDATE ... WHERE faccion IS NULL` (api/usuarios.js:366-376).
- **Cambio:** cuesta **500 `xp_total`** + **cooldown 15 días** (`faccion_elegida_en`); 429 `COOLDOWN_FACCION` o 402 `PUNTOS_INSUFICIENTES` (api/usuarios.js:378-396). Requiere email verificado (api/usuarios.js:364-365).
- **Ranking:** `GET tipo=faccion_ranking` (agregado por facción + top 3 por facción con ROW_NUMBER, api/usuarios.js:311-324). UI "Control Territorial por Facción" en `comunidad.html:2153-2201`.
- **SOLO DOCUMENTADO:** afinidad de Parche x1.3/x1.15/x1.0 y el control territorial por ciudad (facción con más Activos aprobados + checkins en 30 días). ADR-027 los declara cálculo en consulta, pero no existe código; la UI actual solo muestra el ranking por XP agregado.

### 8.4 Vocaciones / Mundo Artistas

- **4 vocaciones acumulables, TODAS a nivel 5:** `musico`, `cine`, `artista_grafico`, `escritor` (api/interacciones.js:194-203; usuario-session.js:63-92).
- **Catálogo en código** (patrón LOGROS); `usuarios.vocaciones` solo guarda claves activadas (api/interacciones.js:187-193).
- **Toggle** `POST tipo=vocacion_activar`, gate de nivel server-side (403) (api/interacciones.js:3802-3833).
- **6 misiones de artista** (`grupo: 'artista'`, api/interacciones.js:479-547).
- **Actualización 015:** `usuarios.vocaciones` jsonb (migración 015:46-47).
- **API de lectura:** `GET tipo=vocaciones_catalogo` y `GET tipo=vocaciones_usuario` (api/interacciones.js:1914-1938). **UI:** panel de vocaciones en `mi-perfil.html` (~L1075-1102).

> **Discrepancia ADR-026:** el cuerpo de ADR-026 (DECISIONS.md:635) describía 3 rutas con niveles distintos (`musico@5, cine@8, artista_grafico@11`). La Entrega 016 (v13) las unificó a **4 rutas en bloque a nivel 5** (api/interacciones.js:192-203; ADR-027/TSK-101). El v5 documenta el estado del código, no el del ADR-026 original.

### 8.5 Sesión firmada y anti-Sybil (ADR-025)

- **JWT HMAC SHA-256:** `firmarSesion` en api/usuarios.js:115-125; `validarSesion` en api/interacciones.js:1086-1111 con `crypto.timingSafeEqual`. Payload `{sub, iat, exp}`, duración 7 días. Secreto `SESSION_JWT_SECRET` (**obligatorio en producción**; fallback `dev_secret` inseguro).
- **Rutas protegidas (3):** `visita`, `activo_oculto_votar`, `activo_oculto_checkin` (api/interacciones.js:4734, 2720, 2807).
- **Nonce de un solo uso:** `geo_nonces`, TTL 2 min; consumo atómico (`usado=true`) en `consumirNonce` (api/interacciones.js:1122-1128); se emite con `geo_nonce_solicitar` (L1462).
- **`device_hashes`:** jsonb con máx. 5 huellas (api/usuarios.js:521-540); el checkin exige `device_hash` registrado (api/interacciones.js:2823-2830).
- **Email verificado (Resend):** `email_verificar_solicitar` y `email_verificar_confirmar` (api/usuarios.js:404-445, 164-180); token 32 bytes/24 h. Gate para referidos, proponer/votar Activos y fundar Parche. `RESEND_API_KEY` **obligatoria**.
- **Cliente JWT:** `usuario-session.js:147-195, 241-242` guarda y adjunta el token; `comunidad.html` renueva en 401.

### 8.6 Presencia física (ADR-024)

`POST tipo=visita` exige presencia física server-side (api/interacciones.js:4721-4931):

- **Haversine** puro, radio terrestre 6.371.008,8 m (api/interacciones.js:95, 116).
- **Radios adaptativos:** default/urbano 100 m; `naturaleza`/`aventura`/keyword rural 250 m; `parque`/`evento` 150 m; `festival`/`deporte` 200 m; `blog` rechazado (api/interacciones.js:96-114).
- **Zona rural** por subcategoría, keyword (L105-107) o densidad (≤3 vecinos en bbox 0.02°) (api/interacciones.js:4840-4863).
- **Anti-spoofing:** `accuracy ≤ 150 m`, cooldown 90 s, velocidad ≤ 69.4 m/s, tope 30/24 h, rechazo de `(0,0)` (api/interacciones.js:108-111, 4776-4834).
- **Bono rural plano +20** (suma al XP total, sin multiplicador ni amuleto ni fama) (api/interacciones.js:4863, 4895).
- **Dedup-first + índice único parcial** `idx_interacciones_visita_unica`; reactivar = 0 XP (api/interacciones.js:4743-4752; migración 014).
- **Evidencia** en `interacciones.dims.geo` (api/interacciones.js:4866-4877). Logro `logr_pionero` (api/interacciones.js:648-657).
- **Estado frontend: ROTO.** `window.ExploraCO.marcarVisitado` (usuario-session.js:587-640) envía `tipo/lat/lng/accuracy/ts` pero **NO envía `Authorization: Bearer <jwt>` ni `nonce`** (usuario-session.js:598-609). Como el backend v13 exige ambos (api/interacciones.js:4734-4741), la visita falla con 401/400 desde la UI. Backend IMPLEMENTADO; flujo de usuario ROTO.

---

## 9. Apartado Social (resumen)

El sistema social (chat comunitario, planes de viaje colectivos, albumes, comentarios tipo Facebook y mapa audiovisual) se construyó en las migraciones 008/009/013 y en los ADR-014/015/017/023. En gaming aporta: chat con topes diarios (`chatXpDisponible`/`registrarChatXp`), chat privado por plan (`plan_chat_msg`), comentarios con XP +2, misiones sociales y logros `logr_social_*`.

**Documento hermano (apartado social):** `ExploraCO_Sistema_Social_v5.md`, en `exploraco desarrollo/ampliacion desarrollo/`. **Creado el 2026-09-14** (documentado en esta misma sesion): consolida el apartado social verificando `archivo:linea` (ADR-006) y registra sus propios gaps (G-01..G-23) y discrepancias (D-01..D-15). Enlace reciproco verificado: ese documento apunta de vuelta a este Plan Maestro v5 como su documento complementario.

Detalle operativo: BLUEPRINT.md sección 3 y DECISIONS.md ADR-015/023.

---

## 10. Patrocinios (conceptual — sin cambios de fondo desde el v4)

El módulo de patrocinios **sigue siendo conceptual**. No existe migración de `sponsors` / `sponsor_canjes` (0 archivos en `db/migrations`, 0 coincidencias en `api/*.js`). El diseño del v4 (secciones 8.1–8.6: descuentos escalonados por nivel estilo SKATE, código de un solo uso, capa 1 relacional y capa 2 ACP/UCP) se conserva como **SOLO DOCUMENTADO**.

Único rastro de código: la columna `usuarios.patrocinios jsonb` (migración 007:22) y el campo `patrocinios: []` en la respuesta de `tabla_destino` (api/interacciones.js:2079), ambos vacíos de lógica. Las **3 preguntas de negocio del v4 siguen abiertas** (sección 14).

---

## 11. Hoja de Ruta por Fases (actualizada)

### Fase 0/v4 — CONSTRUIDA (IMPLEMENTADO en working tree)

20 niveles/4 eras derivados; economía de consumo con de-nivel; 13 consumibles; cromos; Parches con fama y retos; 28 misiones; 30 logros; 5 senderos. Migración 010. Spec ADR-018.

### Fase 1 (v5.0) — CONSTRUIDA (IMPLEMENTADO en working tree; pendiente operativo)

Referidos multinivel, Wayfarer Activo Oculto, 4 facciones, vocaciones, sesión firmada/anti-Sybil. Migración 016 + variables + deploy. Spec ADR-025/026/027.

### Fase 2 — PENDIENTES INMEDIATOS (bloqueantes de producción)

1. **Aplicar `db/migrations/016_multinivel_crowdsourcing.sql` en Neon** (TASKS.md:2514-2515).
2. **Configurar** `SESSION_JWT_SECRET`, `RESEND_API_KEY` y `SITE_URL` en Vercel; no configurar `DEV_EMAIL_ECHO` en producción (`docs/DEPLOY_016.md:63-87`).
3. **Deploy en un solo release** de `usuarios.js` v9 + `interacciones.js` v13 + `admin.js` (mismo secreto) y verificación en vivo.
4. **Arreglar los 2 flujos ROTOS de UI:** (a) `registro.html` + captura de `?ref=`; (b) `marcarVisitado` con `Authorization` + `nonce`.

### Fase 3 — CORTO PLAZO (v5.x)

- UI de **intercambio de cromos** (`cromo_intercambio`).
- UI de **checkin de Activo Oculto** (`activo_oculto_checkin`).
- Cerrar el drift del apartado social (`ExploraCO_Sistema_Social_v5.md`).

### Fase 4 — MEDIANO PLAZO

- **Afinidad de Parche a facción** (x1.3/x1.15/x1.0) y **control territorial por ciudad** (hoy SOLO DOCUMENTADO).
- **Ligas/temporadas** (Path of Exile) y **vitrina pública extendida** (hoy SOLO DOCUMENTADO).

### Fase 5 — EXPLORATORIA (sin fecha)

- Patrocinios Capa 1 (tablas `sponsors`/`sponsor_canjes`) y, con volumen real, Capa 2 (ACP/UCP).
- Capa cripto (Camino A ledger interno → Camino B Hive).

---

## 12. Estado de Implementación y Gaps (con evidencia)

| Sistema | Estado | Evidencia |
|---|---|---|
| 20 niveles / eras / badges derivados | IMPLEMENTADO | api/usuarios.js:14-60; usuario-session.js:22-25 |
| Economía de XP y de-nivel | IMPLEMENTADO | api/interacciones.js:4081-4137 |
| 13 consumibles (10+3) | IMPLEMENTADO | migración 010:159-170; 015:99-103 |
| Misiones (28) | IMPLEMENTADO | api/interacciones.js:214-548 |
| Logros (30) + rareza global | IMPLEMENTADO | api/interacciones.js:579-864, 1639 |
| 5 senderos `tabla_destino` | IMPLEMENTADO | api/interacciones.js:1939-2081 |
| Cromos (drop/rareza/garantía) | IMPLEMENTADO | api/interacciones.js:958-1002 |
| Intercambio de cromos | SOLO BACKEND | api/interacciones.js:4261-4329 (0 UI) |
| Parches (fama/retos) | IMPLEMENTADO | api/interacciones.js:1007-1076, 4332-4481 |
| Referidos (reparto/red/código) | IMPLEMENTADO (backend) | api/usuarios.js:223-308; api/interacciones.js:1136-1155 |
| Captura de `?ref=` en registro | **ROTO** | `mi-perfil.html:1800` enlaza `/registro.html?ref=`; `registro.html` no existe; nadie captura `?ref=` |
| Wayfarer proponer/votar | IMPLEMENTADO | api/interacciones.js:2679-2798; comunidad.html:2050, 2131 |
| Wayfarer checkin | SOLO BACKEND | api/interacciones.js:2804-2894 (0 UI) |
| Wayfarer moderación admin | IMPLEMENTADO | api/admin.js:412-467; admin.html:6770 |
| Facciones (elección/cambio/ranking) | IMPLEMENTADO | api/usuarios.js:311-396 |
| Afinidad de Parche / control territorial por ciudad | SOLO DOCUMENTADO | ADR-027; 0 coincidencias de "afinidad" en código |
| Vocaciones (4 @ nivel 5) | IMPLEMENTADO | api/interacciones.js:194-203, 3802-3833; mi-perfil.html:1075-1102 |
| Sesión JWT + nonce + device_hash | IMPLEMENTADO | api/usuarios.js:115-125; api/interacciones.js:1086-1128 |
| Email verificado (Resend) | IMPLEMENTADO (requiere `RESEND_API_KEY`) | api/usuarios.js:142-180, 404-445 |
| Presencia física (`visita`) backend | IMPLEMENTADO | api/interacciones.js:4721-4931 |
| Presencia física desde la UI | **ROTO** | usuario-session.js:598-609 (sin JWT ni nonce) |
| Patrocinios (sponsors/canjes) | SOLO DOCUMENTADO | 0 migraciones, 0 handlers |
| Ligas/temporadas | SOLO DOCUMENTADO | 0 código; v4 sección 10.2 |
| Vitrina pública extendida | SOLO DOCUMENTADO | v4 sección 10.3 |
| Migración 016 aplicada en Neon | PENDIENTE (BLOQUEANTE) | TASKS.md:2514-2515 |

---

## 13. Riesgos a Vigilar

1. **Migración 016 no aplicada:** sin ella, referidos, facciones, Activo Oculto y `geo_nonces` fallan (columnas/tablas inexistentes) y la sesión firmada degrada (NEXT.md:107-109).
2. **`SESSION_JWT_SECRET` ausente o distinta entre funciones:** tokens falsificables (fallback `dev_secret`) o 401 cruzados (NEXT.md:113-116; `docs/DEPLOY_016.md:94-100`).
3. **`RESEND_API_KEY` pendiente:** la verificación de email devuelve 503 y el gating por `email_verificado` no se puede completar (NEXT.md:117-120).
4. **Flujos ROTOS de frontend (visita y referidos):** bloquean la experiencia real aunque el backend esté listo (sección 12).
5. **Prerrequisito 015 no confirmado en Neon:** ADR-006 exige verificarlo antes de asumir la 016 (NEXT.md:110-112).
6. **Anti-farming:** el mercado de cromos, el reparto de referidos y el crowdsourcing son terreno de cuentas coordinadas. Las reglas (topes, dedup, quorum, email verificado, JWT, nonce) están implementadas; deben monitorearse con volumen real (v4 sección 12).
7. **Escala prematura:** ligas, territorio y duelo de Parches solo se sienten justos con suficiente comunidad (v4 sección 12).
8. **Riesgo regulatorio:** la capa cripto (Camino B, Hive) requiere revisión legal en Colombia antes de anunciarse (v4 sección 12).

---

## 14. Preguntas Pendientes de Decisión (sin responder aún)

Conservadas textualmente del v4 (sección 13):

1. ¿El módulo de patrocinios tiene ya marcas reales interesadas o firmadas, o sigue siendo 100% conceptual?
2. ¿Cuántos usuarios activos tiene hoy la plataforma aproximadamente?
3. ¿Confirmas el orden de prioridad propuesto (Steam → social/clanes → SKATE → Path of Exile → Upland/cripto)?

---
---

## 15. Glosario (ampliado con v5)

- **DAG:** Grafo Acíclico Dirigido — misiones/logros que se desbloquean solo tras cumplir prerrequisitos (`requiere[]`), sin ciclos.
- **JSONB flexible:** campo de base de datos que guarda información variable sin columna fija; se actualiza con merge `||` (ADR-003).
- **Cero Borrado Lógico:** nunca eliminar físicamente, solo cambiar el estado (`activo=false`).
- **De-nivel:** pérdida de nivel por gastar `xp_total` en consumibles; se revoca la capacidad superior (ADR-018).
- **Fama de Parche (Pandilla):** contador colectivo propio del grupo (`pandillas.fama_total`), independiente del XP individual; recibe 10 % del XP de los miembros.
- **Sendero:** una de las 5 rutas de especialización (Explorador, Crítico, Organizador, Audiovisual, Parche) con su propia "fama" y tiers Semilla→Maestro.
- **Wayfarer / Activo Oculto:** propuesta peer-to-peer de un punto de interés secreto, validada por votos (quórum ±3) y checkin geolocalizado.
- **Quórum ±3:** diferencia neta de votos (favor − contra) que aprueba o rechaza un Activo Oculto server-side.
- **Facción:** uno de los 4 grupos (`exploradores`, `curadores`, `creadores`, `artistas`); primera elección gratis, cambio por 500 XP + cooldown 15 días.
- **Vocación:** ruta artística acumulable (`musico`, `cine`, `artista_grafico`, `escritor`), desbloqueada en bloque al nivel 5.
- **Nonce geoespacial:** token de un solo uso (TTL 2 min) que evita el replay de un payload `lat/lng` capturado (ADR-025).
- **Device hash:** fingerprint ligero de dispositivo (`usuarios.device_hashes`, máx. 5) como señal anti-Sybil.
- **Sesión firmada:** JWT HMAC SHA-256 emitido por `usuarios.js` y validado por `interacciones.js` solo en rutas sensibles.
- **Nivel/era/badge derivados:** nunca persistidos; se calculan desde `xp_total` en cada lectura.
- **ACP / UCP:** Agentic Commerce Protocol (OpenAI + Stripe) y Universal Commerce Protocol (Google) — estándares reales 2025-2026 de compras hechas por agentes de IA.
- **MCP:** Model Context Protocol (Anthropic) — estándar de conexión entre IA y datos/herramientas externas.
- **Liga/Temporada:** periodo competitivo con ranking propio que se reinicia, dejando el progreso previo como prestigio permanente (SOLO DOCUMENTADO hoy).

---

## Apéndice A — Mapa completo de endpoints de gamificación

### A.1 `api/interacciones.js` v13 — GET (`?tipo=`)

Listado literal de handlers (api/interacciones.js:1454-2665): `geo_nonce_solicitar`, `activos_ocultos_pendientes`, `resenas`, `dims_avg`, `fotos`, `guardados`, `is_guardado`, `mapa`, `mi_rating`, `logros`, `misiones`, `mapas_mios`, `mapas_publicos`, `mapa_detalle`, `chat_salas`, `chat_mensajes`, `planes`, `planes_mios`, `plan_chat`, `vocaciones_catalogo`, `vocaciones_usuario`, `tabla_destino`, `albumes`, `album_detalle`, `galeria_destino`, `comentarios_recientes`, `multimedia_mapa`, `mi_feed_fotos`, `fotos_top`, `comentarios_foto`, `consumibles`, `inventario`, `mis_cromos`, `pandilla_detalle`, `pandilla_reto`.

### A.2 `api/interacciones.js` v13 — POST (`body.tipo` → `tipo2`)

Listado literal (api/interacciones.js:2666-5031): `activo_oculto_proponer`, `activo_oculto_votar`, `activo_oculto_checkin`, `mapa_crear`, `mapa_editar`, `mapa_eliminar`, `mapa_agregar_destino`, `mapa_quitar_destino`, `chat_sala`, `chat_msg`, `chat_mod`, `plan_crear`, `plan_unirse`, `plan_salir`, `plan_chat_msg`, `review_voto`, `foto`, `foto_voto`, `album_crear`, `album_agregar_foto`, `album_voto`, `album_quitar_foto`, `album_editar`, `album_eliminar`, `admin_foto_top`, `admin_moderar_foto_album`, `admin_xp`, `vocacion_activar`, `comentario_foto`, `comentario_eliminar`, `comentario_voto`, `comprar_consumible`, `usar_consumible`, `cromo_obtener`, `cromo_intercambio`, `pandilla_crear`, `pandilla_unirse`, `pandilla_salir`, `pandilla_reto`, `resena`, `guardado`, `quitar_guardado`, `visita`, `quitar_visita`, `rating`.

### A.3 `api/usuarios.js` v9

- **GET:** `tipo=leaderboard`, `tipo=buscar` (o `?buscar=`), `tipo=referido_codigo`, `tipo=referido_red`, `tipo=faccion_ranking`, `tipo=email_verificar_confirmar`, `?id=<uuid>` (api/usuarios.js:193-341).
- **POST (`body.tipo`):** `faccion_elegir`, `email_verificar_solicitar`, `email_verificar_confirmar`, upsert de registro con `?ref=` (api/usuarios.js:343-549).

### A.4 `api/admin.js`

- **`recurso=consumibles`:** `tipo=consumibles_lista`, `consumibles_crear`, `consumibles_editar`, `consumibles_toggle`.
- **`recurso=activos_ocultos`:** `tipo=activo_oculto_moderar` (Bearer admin).
- Otros recursos históricos: `solicitudes`, `resenas`, `destacado`, `notificaciones` (api/admin.js:8-12, 398-470).

---

## Apéndice B — Tabla de migraciones (resumen)

| # | Aporta | Estado |
|---|---|---|
| 003 | dims/traveller_type | Aplicada |
| 004 | usuarios.foto_url/ciudad_base | Aplicada |
| 005 | usuarios.progreso_logros | Aplicada |
| 006 | mapas/mapa_destinos | Aplicada |
| 007 | votos_utiles/resena_votos/patrocinios | Aplicada |
| 008 | chat_salas/chat_mensajes/planes*/progreso_social | Aplicada |
| 009 | albumes/album_fotos/album_votos/progreso_album | Aplicada |
| 010 | consumibles/cromos/pandillas + capacidades | Aplicada |
| 011 | destinos.address | Aplicada |
| 012 | idx dedup resena/rating | Aplicada |
| 013 | album_comentarios/votos | Aplicada |
| 014 | reset visitas + idx visita única | Aplicada |
| 015 | vocaciones/sala_id/limpieza/3 consumibles | Aplicada (verificar) |
| 016 | 10 columnas + 4 tablas + 8 índices | **PENDIENTE** |

---

## Apéndice C — Trazabilidad documental

- **Base conceptual:** `ExploraCO_Gamificacion_v4_Plan_Maestro.md` (histórico; NO modificado).
- **Documento hermano (apartado social):** `ExploraCO_Sistema_Social_v5.md` (mapa consolidado del sistema social; enlace reciproco con este Plan Maestro v5).
- **Decisiones:** DECISIONS.md ADR-018 (gamificación v4), ADR-024 (presencia física), ADR-025 (sesión firmada/anti-Sybil), ADR-026 (vocaciones/chat/perfil/XP admin), ADR-027 (referidos/crowdsourcing/facciones).
- **Tarea de la Entrega 016:** TASKS.md TSK-101 (L2489-2522); relevo en NEXT.md (L21-127).
- **Checklist de deploy:** `docs/DEPLOY_016.md`.
- **Smoke:** `scripts/smoke_016_multinivel_crowdsourcing.js` (39/39 PASS).
- **Regla de verdad:** ADR-006 — este documento cita el archivo real; los conteos son verificables y no se copian de otros documentos (Reglas de Oro v5, punto 8).
