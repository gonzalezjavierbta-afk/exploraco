# ExploraCO — Sistema de Gamificación, Economía y Arquitectura Gaming
## Documento Maestro Consolidado v6.2
### Estado Real del Sistema + Especificación Extendida (Hoja de Ruta Unificada)

> **Estado del Sistema:** Producción Lógica consolidada (v5.0) + Especificación formal v6.1 extendida.  
> **Patrón Arquitectónico:** Serverless REST / Base de Datos Híbrida (Relacional + JSONB) / A2A AI Agent Layer (Spec).  
> **Regla de Verdad:** ADR-006 — las citas `archivo:línea` son verificables contra el repositorio. El historial de chat nunca es fuente de verdad.

---

## 0. Leyenda de Estados, Supuestos y Reglas de Oro

### 0.1 Leyenda de Estados de Implementación

| Estado | Significado Técnico |
|---|---|
| **IMPLEMENTADO** | Existe en el repositorio y su mecánica es ejecutable (backend y/o frontend). |
| **SOLO BACKEND** | El handler/consulta existe en `/api`, pero no hay UI conectada. |
| **SOLO DOCUMENTADO** | Especificación formal (ADR o Plan Maestro) pendiente de migración SQL o código. |
| **ROTO** | El código existe pero presenta un bloqueo end-to-end (falta JWT, nonce o plantilla UI). |
| **SPEC v6.1** | Especificación formal de nueva generación, sin migración ni código aún. |

### 0.2 Supuestos de Trabajo y Restricciones Operativas

1. **Presupuesto serverless 8/8 (cerrado):** Vercel Hobby permite 8 funciones. El tope está consumido; **cero archivos nuevos en `api/`**. Toda mecánica nueva entra como rama `tipo=` (GET) o `tipo2=` (POST) dentro de los endpoints existentes (BLUEPRINT.md:28-41).
2. **Formato:** Markdown UTF-8. Los `.js` de `/api` siguen siendo 100% ASCII-safe (ADR-002).
3. **Regla de Merge JSONB (ADR-003):** Toda actualización sobre campos JSONB (`progreso_misiones`, `progreso_logros`, `capacidades`, `vocaciones`, `device_hashes`) usa merge (`||`) sobre `COALESCE`, nunca reemplazo total.
4. **Regla de Cero Borrado Lógico:** Ningún registro se elimina físicamente. Toda baja usa `activo = false` (`quitar_guardado`, `quitar_visita`, desaprobación de activos ocultos).
5. Las **3 preguntas de negocio del v4** (sección 14) siguen abiertas.
6. La Entrega 016 está **verificada en working tree**, con la migración 016 **pendiente de aplicar en Neon** (BLOQUEANTE).

### 0.3 Reglas de Oro v6 (AI-DOS — Gobernanza Arquitectónica)

1. **ASCII-Safe Riguroso:** Todo archivo en `/api/` debe ser 100% ASCII-safe (0 bytes >127 y 0 backticks).
2. **Cero Catch Silenciosos:** Todo `try/catch` registra el error y responde con estructura estándar `{ success: false, error: string, code: string }`.
3. **Prohibición de Redefinición de Endpoints:** El sistema se mantiene en 8 funciones serverless; toda mecánica nueva se integra en el ruteador transaccional.
4. **Verificación de Wiring en Runtime:** Los componentes de UI validan la existencia de sus manejadores (`window.ExploraCO`) antes de invocar red.
5. **Ruteo Eficiente de IA (Cost Optimization):**
   - *Rutas FREE (Big-Pickle / LlamaParse):* Procesamiento rutinario de documentos y extracción de texto.
   - *Modelos Flash (DeepSeek-v4.1-flash — $0.0015/call):* Moderación de contenido, quórum Wayfarer y etiquetado contextual.
   - *Modelos Premium (Minimax-m3 — $0.0218/call):* Orquestación A2A Agent Card y generación de layouts adaptativos por RL.
6. **Escudo GOLD en todo despliegue:** `node --check` + ASCII-safety + balance de `div` en HTML.
7. **Regla de verdad del repositorio:** Este documento cita `archivo:línea`; los conteos son verificables y no se copian de otros documentos.

---

## 1. Arquitectura Técnica Vigente

### 1.1 Infraestructura Serverless

- **Vercel Hobby:** tope duro de **8 funciones serverless**, consumido al 100% (BLUEPRINT.md:28-41).
- **DB driver:** `@neondatabase/serverless` con `neon()` (nunca `pg`); CommonJS estricto.
- **Indexación GIN:** Índices GIN sobre campos JSONB para tiempo de respuesta de orden O(1) en consultas de progreso.
- **Patrón de operación:** GET con `?tipo=<valor>`; POST con `body.tipo` (en `interacciones.js` el POST lo asigna a la variable local `tipo2`, api/interacciones.js:2668).

### 1.2 Endpoints Vigentes (8/8)

```
/api
 ├── destinos.js          # Listado público y catálogo de spots
 ├── usuarios.js          # Perfil, leaderboard, referidos, facciones, JWT (v9)
 ├── interacciones.js     # Engine core de gaming, misiones, logros, Parches, Wayfarer (v13)
 ├── admin-destinos.js    # CRUD de destinos
 ├── publicar-lugar.js    # Ingesta pública de borrador (Draft)
 ├── pagina-destino.js    # SSR HTML por slug y registro de visitas (v9)
 ├── admin.js             # Moderación, tienda consumibles, auditoría Wayfarer
 └── utilidades.js        # Sitemap, analítica de visitas, diagnóstico
```

Citas de versión: BLUEPRINT.md:30-39; PROJECT.md:66,78.

### 1.3 Persistencia Híbrida — Regla de Merge JSONB (ADR-003)

Toda actualización de un campo JSONB usa **merge** (`||`) sobre `COALESCE`, nunca reemplazo total. Ejemplo del inventario de consumibles (api/interacciones.js:4114-4120):

```sql
UPDATE usuarios SET
  xp_total = xp_total - $1,
  capacidades = COALESCE(capacidades,'{}'::jsonb)
    || jsonb_build_object('consumibles', COALESCE(capacidades->'consumibles','{}'::jsonb)
      || jsonb_build_object($2, COALESCE((capacidades->'consumibles'->>$2)::int, 0) + 1))
WHERE id=$3 AND xp_total >= $1
RETURNING xp_total;
```

**Cero Borrado Lógico:** `quitar_guardado` / `quitar_visita` hacen `activo=false`; `pandilla_salir` desactiva la membresía; la moderación de Activo Oculto cambia estado, nunca borra. Excepción histórica autorizada: purga única de la migración 014.

---

## 2. Tabla Consolidada de Migraciones (003 → 016)

Todas viven en `db/migrations/` y son acumulativas e idempotentes (ADR-008).

| # | Archivo | Aporta (objetos reales) | Estado |
|---|---|---|---|
| 003 | `003_interacciones_dims_traveller.sql` | `interacciones.dims` jsonb, `interacciones.traveller_type` | Aplicada |
| 004 | `004_usuarios_blog_autor.sql` | `usuarios.foto_url`, `usuarios.ciudad_base` | Aplicada |
| 005 | `005_usuarios_progreso_logros.sql` | `usuarios.progreso_logros` jsonb | Aplicada |
| 006 | `006_mapas.sql` | tablas `mapas`, `mapa_destinos` | Aplicada |
| 007 | `007_milestones_v2.sql` | `interacciones.votos_utiles`, `resena_votos`, `usuarios.patrocinios` jsonb | Aplicada |
| 008 | `008_comunidad_social.sql` | `chat_salas`, `chat_mensajes`, `planes_viaje`, `planes_miembros`, `usuarios.progreso_social` | Aplicada |
| 009 | `009_albumes.sql` | `albumes`, `album_fotos`, `album_votos`, `usuarios.progreso_album`, `idx_album_fotos_dedup` | Aplicada |
| 010 | `010_gamificacion_v4.sql` | `consumibles`, `compra_consumibles`, `consumo_consumibles`, `cromos_catalogo`, `usuarios_cromos`, `pandillas`, `pandillas_miembros`, `pandilla_retos`, `cromo_intercambios`, `usuarios.capacidades`, seed 10 consumibles | Aplicada |
| 011 | `011_ficha_direccion_destinos.sql` | `destinos.address` | Aplicada (2026-09-13) |
| 012 | `012_interacciones_dedup_resena_rating.sql` | índice único parcial `idx_interacciones_dedup_resena_rating` | Aplicada |
| 013 | `013_album_comentarios.sql` | `album_comentarios`, `album_comentario_votos` | Aplicada |
| 014 | `014_reset_visitas_presencia_fisica.sql` | purga única + respaldo + `idx_interacciones_visita_unica` | Aplicada |
| 015 | `015_epic_prompt.sql` | `usuarios.vocaciones` jsonb, `planes_viaje.sala_id`, limpieza salas, 3 consumibles de perfil | Aplicada *(verificar en Neon — ADR-006)* |
| 016 | `016_multinivel_crowdsourcing.sql` | 10 columnas en `usuarios` + 4 tablas (`activos_ocultos`, `activos_ocultos_votos`, `activos_ocultos_checkins`, `geo_nonces`) + 8 índices | **PENDIENTE — BLOQUEANTE** |
| 024 | `024_casas_clases.sql` | `casas_cofre` (cofre por Casa: `xp_cofre_total`, `poblacion_activa`, `factor_conversion`) | **PENDIENTE — BLOQUEANTE** |
| 038 | `038_origen_lejanía.sql` | `geo_ciudades` (1.122 filas DIVIPOLA), `geo_paises` (245 ISO-3166-1), `usuarios.origen_declarado_en`, `xp_ledger.mult_origen`, 7 claves `gamificacion_config` | Aplicada en Neon (2026-09-24) |

> **Nota (015):** `docs/DEPLOY_016.md:61` la declara prerrequisito, pero NEXT.md:110-112 registra que figuraba como pendiente en TSK-100. El v6.2 la marca como "Aplicada (verificar)" — ADR-006 exige confirmación en Neon.

---

## 3. Progresión del Jugador

### 3.1 Sistema Actual: 20 Niveles en 4 Eras (IMPLEMENTADO)

El nivel, la era y el badge se **derivan** en cada lectura desde `xp_total` y **nunca se persisten** (api/usuarios.js:6-60).

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

**Eras** (api/usuarios.js:46-51): Mundana ≤ 5 · Patrocinada ≤ 10 · Organizador ≤ 15 · Leyenda > 15.

- `calcularNivel()` recorre el arreglo de umbrales y devuelve `{nivel, badge_actual}` (api/usuarios.js:37-44).
- `conNivel()` inyecta `nivel`, `badge_actual` y `era` en cada fila leída (api/usuarios.js:53-60).
- **De-nivel real (ADR-018):** como el nivel se deriva de `xp_total`, comprar consumibles puede **bajar de nivel** y revocar capacidades. `comprar_consumible` devuelve `nivel_anterior`, `nivel_nuevo` y `bajo_nivel` (api/interacciones.js:4111-4137).

### 3.2 Capacidades Desbloqueadas por Nivel (UI)

Mapa en `usuario-session.js:45-55` (activa si `nivelActual >= umbral`):

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

Capacidades de misión traducidas a `usuario.capacidades`: `organizar_actividad`, `subir_fotos`, `chat`, `moderador_chat`, `crear_chat` (api/usuarios.js:67-93).

### 3.3 Especificación de Extensión: 40 Niveles en 5 Eras (SPEC v6.1)

La hoja de ruta v6.1 escala la estructura a **40 Niveles / 5 Eras** derivados dinámicamente desde `xp_total`:

```
N33-N40 [ERA MITO]       ──> Gobernanza & A2A Agent Card
N25-N32 [ERA LEYENDA]    ──> Soberanía, Parches & P2P
N17-N24 [ERA CRONISTA]   ──> Moderación & Curaduría Video
N9-N16  [ERA PATROCINADA] ──> Micro-curaduría & Planes
N1-N8   [ERA MUNDANA]    ──> Onboarding & Quick Ratings
```

| Nivel | Badge / Rango | Era | Umbral XP | Capacidades / Gates |
|---|---|---|---|---|
| 1 | Caminante Novato | Mundana | 0 | Quick Ratings, Guardado de Spots |
| 3 | Explorador Urbano | Mundana | 250 | Reseñas extendidas, Fotos |
| 5 | Vanguardia Territorial | Mundana | 700 | **Desbloqueo Vocaciones Artísticas** |
| 8 | Cronista de Historias | Mundana | 1.900 | Colecciones y listas públicas |
| 9 | Buscador de Leyendas | Patrocinada | 2.500 | Micro-Curadurías localizadas |
| 11 | Estratega Comunitario | Patrocinada | 4.000 | `#btn-organizar`, Planes de Viaje |
| 14 | Cartógrafo de Cine | Patrocinada | 8.500 | **Fundar Parche (Clan)** |
| 16 | Curador de Colombia | Patrocinada | 13.000 | Cromos Dorados, Filtros Avanzados |
| 17 | Mariscal de Parche | Cronista | 16.000 | Emisión de Retos Colectivos |
| 20 | Gran Maestro ExploraCO | Cronista | 30.000 | Moderación blanda de Activos Ocultos |
| 25 | Dominador de Spots | Leyenda | 55.000 | **Mecánica 'Own the Spot'**, Contratos P2P |
| 30 | Soberano de Zona | Leyenda | 95.000 | Control Banderas y Upgrades de Parche |
| 33 | Mito Urbano | Mito | 135.000 | Gobernanza del Ecosistema, Voto de Servidor |
| 40 | Ente Ancestral | Mito | 250.000 | **A2A Agent Card & LangChain** |

> **Nota de deuda técnica (ADR-053):** Drift heredado 20→40 niveles en distintos módulos; la paridad de curvas es red de seguridad para el rollout.

---

## 4. Ciclo de Vida del Jugador

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CICLO DE VIDA DEL JUGADOR                            │
├───────────────────┬───────────────────┬───────────────────┬──────────────────────┤
│ EARLY GAME        │ MIDDLE GAME       │ LATE GAME         │ END GAME             │
│ (Niveles 1-8)     │ (Niveles 9-16)    │ (Niveles 17-32)   │ (Niveles 33-40)      │
├───────────────────┼───────────────────┼───────────────────┼──────────────────────┤
│ - Quick-Ratings   │ - #btn-organizar  │ - Own the Spot    │ - A2A Agent Card     │
│ - Reseñas d2/d3   │ - Planes de viaje │ - Director Spot   │ - LangChain Orq.     │
│ - XP Base         │ - Fundar Parche   │ - Contratos P2P   │ - RL UI Layout       │
│ - Primeras Fotos  │ - Activos Ocultos │ - Tithe de Clan   │ - Gobernanza Ecosist │
└───────────────────┴───────────────────┴───────────────────┴──────────────────────┘
```

- **Early Game (N1–N8):** Interacciones de baja fricción (ratings, guardados). La primera reseña activa el pipeline anti-Sybil.
- **Middle Game (N9–N16):** Motor colectivo activo. Activar `#btn-organizar`, salas efímeras, fundar Parches (nivel 14), proponer Activos Ocultos.
- **Late Game (N17–N32 — SPEC v6.1):** "Own the Spot" / Director del Spot; dividendo del **10% de XP sobre todas las interacciones ajenas** en ese lugar. Contratos P2P y Soberanía Territorial.
- **End Game (N33–N40 — SPEC v6.1):** A2A Agent Card desbloqueada; agentes externos (LangChain/AutoGen) consumen la API a nombre del usuario. Optimización adaptativa de interfaz por RL (métricas CTR y RR).

---

## 5. Senderos de Especialización

`GET /api/interacciones?tipo=tabla_destino&usuario_id=...` devuelve 5 senderos con fama por sendero y un tier común `FAMA_TIERS` = Semilla 0 / Aprendiz 100 / Practicante 250 / Especialista 450 / Maestro 700 (api/interacciones.js:1939-2081).

| Sendero | Fama (cálculo real) | Cita |
|---|---|---|
| **Explorador** | `SUM(xp_ganado)` de visitas + guardados activos | api/interacciones.js:1947-1954 |
| **Crítico** | `SUM(xp_ganado)` de `resena`+`rating`; cuenta reseñas/votos | api/interacciones.js:1955-1962 |
| **Organizador** | `n_mapas*40 + n_destinos*5` | api/interacciones.js:1963-1972, 2030 |
| **Audiovisual** | `SUM(xp_ganado)` de `foto` + `n_albumes_geo*30 + n_videos*35` | api/interacciones.js:1977-1989, 2033 |
| **Parche** | `pandillas.fama_total` de la pandilla activa; sin Parche → nivel 0 | api/interacciones.js:1990-1997, 2063-2072 |

**Relabel Pandilla → Parche:** es **solo texto visible en la UI**. La API y el esquema siguen usando `pandillas*`, `pandilla_crear`, `pandilla_reto`, etc. (NEXT.md:121-122).

---

## 6. Misiones (28) y Logros (30)

### 6.1 Misiones — Catálogo en Código, DAG Server-Side

`MISIONES` vive en api/interacciones.js:214-548 (28 objetos). Cada misión declara `requiere[]` (prerrequisitos, DAG), `check(ctx)` (evaluación server-side) y `xp`. El progreso vive en `usuarios.progreso_misiones` (merge JSONB). `GET ?tipo=misiones` ejecuta backfill y devuelve catálogo + estado (api/interacciones.js:1683).

Ejemplo de DAG:
```
[mis_primer_guardado] ──> [mis_primera_resena] ──> [mis_own_spot_bogota]
                                  │
                                  └──> [mis_primera_foto_social] ──> [mis_creador_album]
```

| Grupo | Nº | IDs |
|---|---|---|
| `general` | 11 | `mis_primer_guardado`, `mis_primera_resena`, `mis_primera_visita`, `mis_gran_arquitecto`, `mis_fotografo`, `mis_chat_mensajero`, `mis_chat_moderador`, `mis_chat_creador`, `mis_chat_activo`, `mis_plan_creador`, `mis_plan_unido` |
| `ciudad` | 3 | `mis_explorador_bogota`, `mis_organizador_bogota`, `mis_own_spot_bogota` |
| `categoria` | 2 | `mis_nomada_digital`, `mis_itinerario_perfeccion` |
| `fotos` | 6 | `mis_primera_foto_social`, `mis_creador_album`, `mis_album_curador`, `mis_fotografo_social`, `mis_cazador_recompensas`, `mis_favorito_del_pueblo` |
| `artista` | 6 | `mis_primera_vocacion_artista`, `mis_camino_musica`, `mis_camino_cine`, `mis_camino_arte`, `mis_camino_escritor`, `mis_poliglota_artista` |

> **Corrección (v4):** las "Misiones de Pandilla" propuestas en el v4 (`mis_fundar_parche`, etc.) **no existen en el código**. El juego colectivo se canaliza vía retos de Parche (`pandilla_retos`) y el sendero Parche.

### 6.2 Logros — 30, con Tier y Rareza Global

`LOGROS` en api/interacciones.js:579-864 (30 objetos: 19 base + 5 de ciudad + 3 Milestones v2 + 3 sociales). Tier `bronce/plata/oro/platino` y `xp` de recompensa. `GET ?tipo=logros` devuelve catálogo con rareza global % (api/interacciones.js:1639).

**Rareza global (fórmula en tiempo de ejecución):**

$$\text{Rareza \%} = \left(\frac{\text{Usuarios con Logro ID}}{\text{Total Usuarios Activos}}\right) \times 100$$

| Tier | Rango |
|---|---|
| **Común** | > 50% |
| **Raro** | 20.1% – 50% |
| **Épico** | 5.1% – 20% |
| **Legendario / Platino** | ≤ 5.0% |

| Grupo | Nº | IDs |
|---|---|---|
| `general` | 12 | `logr_primer_voto`, `logr_critico_10`, `logr_critico_25`, `logr_opinion_blog`, `logr_votos_blog_5`, `logr_votos_blog_10`, `logr_spot_domado`, `logr_especialista_gastro`, `logr_cazador_rarezas`, `logr_social_chat`, `logr_social_plan`, `logr_anfitrion` |
| `coleccion` | 6 | `logr_coleccionista_10`, `logr_coleccionista_50`, `logr_ciudades_5`, `logr_visitas_5`, `logr_visitas_20`, `logr_pionero` |
| `fotos` | 7 | `logr_albumero`, `logr_coleccionista_visual`, `logr_maestro_fotografo`, `logr_favorito_comunidad`, `logr_estrella_del_mapa`, `logr_guardian_historias`, `logr_viajero_multimedia` |
| `ciudad` | 5 | `logr_alcalde_bogota`, `logr_conquistador_cartagena`, `logr_conquistador_medellin`, `logr_senor_santa_marta`, `logr_cali_es_colombia` |

---

## 7. Economía de XP

### 7.1 Modelo Matemático de Multiplicadores y Caps

$$\text{XP}_{\text{Entregado}} = \text{Base}_{\text{Acción}} \times \min\!\left(M_{\text{nivel}} \times M_{\text{clase}} \times M_{\text{origen}},\; 5.0\right) \times M_{\text{temp}} \le \text{Cap Global (10.0×)}$$

1. **Cap de Progresión Estructural:** La combinación de multiplicadores pasivos ($M_{\text{nivel}} \times M_{\text{clase}} \times M_{\text{origen}}$) no puede superar **5.0×**.
2. **Cap Global de Sesión:** Ningún evento, incluyendo temporales, amuletos o buffs de clan, puede exceder **10.0×**.
3. `mult_origen` es **hermano de `stack_temp`** — se multiplica fuera del cap de progresión pero dentro del cap global.

Motor de XP v29 (con factor de origen y factor de casa integrados):
```
xp_final = base · min( min(M_nivel·mult_clase·factor_casa, cap_progresion) · mult_origen · stack_temp, cap_global )
```

### 7.2 Matriz Completa de Fuentes de XP

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
| Album agregar foto | 15 agregador / 10 autor original | máx. 10 fotos/día; autor topa 10 XP/día | api/interacciones.js:3552-3571 |
| Album votar (`album_voto`) | 5 | máx. 20 votos/día; dedup PK (409) | api/interacciones.js:3601-3613 |
| Comentario de media | 2 | tope 20 XP/día (10 comentarios); rate-limit 30/día | api/interacciones.js:3908-3924 |
| Mensaje de chat | 2 | tope 20 XP/día (10 mensajes) | api/interacciones.js:3097-3108 |
| Mensaje de chat de plan | 2 | mismo tope de chat | api/interacciones.js:3297-3307 |
| Voto Wayfarer (Activo Oculto) | 5 | tope 30 XP/día (≈6 votos con XP); 1 voto por usuario | api/interacciones.js:2773-2791 |
| Checkin Activo Oculto | 15 | dedup por UNIQUE parcial; cooldown 90 s | api/interacciones.js:2887-2891 |
| `admin_xp` (admin) | variable | `delta_xp` o `nivel` 1-20; **no degrada** (`Math.max`) | api/interacciones.js:3733-3795 |
| `comprar_consumible` | **resta** (precio) | máx. 5 compras/día; `xp_total >= precio` | api/interacciones.js:4081-4137 |

> **Discrepancia detectada:** `album_voto` (+5, L3607) **no** llama a `repartirXpReferidos` ni a `intentarObtenerCromo`/`aplicarFamaPandilla`; es la única fuente de XP relevante fuera de esos tres sistemas. Se documenta tal cual.

### 7.3 Multiplicadores

| Mecanismo | Efecto | Cita |
|---|---|---|
| Líder de spot | `x1.1` (ROUND) si es autor de la reseña más votada de la ciudad del destino | api/interacciones.js:891-901 |
| Amuleto de Doble XP | `x2` sobre 5 acciones (`multiplicador_x2_usos`) | api/interacciones.js:942-950; 4218-4220 |
| Fama de Parche | `+10 %` (ROUND) del XP entregado a `pandillas.fama_total`; `trompeta_fama` lo duplica 24 h | api/interacciones.js:1007-1028 |
| Cromo | 15 % de drop; rareza por roll | api/interacciones.js:958-1002 |
| Reparto de referidos | 10/5/3/2/1 % FLOOR (5 niveles) | api/interacciones.js:1136-1155 |

### 7.4 Consumibles (13)

Catálogo en tabla `consumibles`, precios editables desde admin. 10 de la migración 010 + 3 de perfil de la 015.

| Clave | Nombre Público | Precio XP | Efecto Mecánico |
|---|---|---|---|
| `pin_cromado` | Pin Cromado | 250 | Personalización de marcador en mapa (7 días) |
| `vitrina_estelar` | Vitrina Estelar | 300 | Destaca el perfil en leaderboard global (7 días) |
| `amuleto_x2` | Amuleto de Doble XP | 350 | 2.0× XP en las siguientes 5 acciones |
| `imantador_cromos` | Imán de Cromos | 400 | Garantiza drop Épico/Dorado en el siguiente roll |
| `cuaderno_expedicion` | Cuaderno de Expedición | 450 | Expande límite de destinos guardados |
| `pergamino_mapa` | Pergamino del Cartógrafo | 500 | Desbloquea capacidad de crear mapas privados extra |
| `trompeta_fama` | Trompeta de la Fama | 500 | Duplica la Fama aportada al Parche por 24 horas |
| `perfil_tema_oscuro` | Tema Galería Oscura | 500 | Skin de perfil persistente |
| `pluma_inspirada` | Pluma Inspirada | 600 | Habilita formato enriquecido en reseñas de blog |
| `perfil_marco_dorado` | Marco Dorado | 700 | Marco cosmético permanente sobre la insignia de Era |
| `sala_efimera` | Sala Efímera | 800 | Habilita creación de sala de chat temporal |
| `perfil_banda_artista` | Banda de Artista | 900 | Cosmético de perfil para Vocaciones Artísticas |
| `pase_vip` | Pase VIP Leyenda | 1.500 | Acceso anticipado a misiones de evento y badges |

Efectos al usar (`usar_consumible`, api/interacciones.js:4141-4248): `permiso_arte`, `albums_extra`, `mapas_extra`, `salas_efimeras`, `multiplicador_x2_usos`, `cromo_garantia`, `fama_x2_hasta`, `vitrina_estelar_hasta`, `pin_mapa_hasta`, `vip_hasta`. Los 3 `perfil_*` son permanentes.

**Tablas de ledger:** `consumibles`, `compra_consumibles`, `consumo_consumibles` (append-only), `cromo_intercambios` (migración 010:16-207).

### 7.5 Multiplicador de Origen por Lejanía (ADR-058 / TSK-155, migración 038 — IMPLEMENTADO)

Capa de la economía de XP activa desde 2026-09-24. El XP por acciones físicas crece con la **distancia real (haversine)** con curva escalonada por perfil de viajero. Migración 038 **APLICADA en Neon** (1.122 ciudades / 245 países). No crea endpoints (8/8 intacto).

**Curva canónica (función `calcularFactorOrigen`, espejo SQL validado por `smoke_origen_factor_parity.js` 111/111):**

$$d = 2R \arcsin\!\left(\sqrt{\sin^2\!\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\!\left(\frac{\Delta\lambda}{2}\right)}\right)$$

| Tier | Condición | Factor |
|---|---|---|
| **Local** | `ciudad_base` en Colombia, distancia ≤ 25 km | **×1.00** (piso, nunca castiga) |
| **Nómada** | Ciudad/país en Colombia pero lejos, `origen_declarado_en ≥ 7 días` | `1.00 + 0.20·min(km/1000, 1)` → tope **×1.20 a 1000 km** |
| **Extranjero** | `pais_base ≠ CO`; exige email verificado + cuenta ≥ 7 días + origen declarado ≥ 7 días | `1.20 + 0.20·min(km/3000, 1)` → tope **×1.40 a 3000 km** |
| **Sin tier elegible** | Sin punto geográfico resoluble | **×1.00** (degradación implícita) |

- **Anti-teleport (v22):** cambiar `ciudad_base`/`pais_base` fija `origen_declarado_en=NOW()`; elegibilidad con antigüedad (7 días) + email verificado para extranjeros.
- **Datos (038):** `geo_ciudades` (1.122 filas DIVIPOLA), `geo_paises` (245 centroides ISO-3166-1), `xp_ledger.mult_origen numeric(10,6)` + `origen_tier`.
- **Monitoreo:** `salud_red` (v6) agrega `distribucion_origen`/`mult_origen_stats`/`alertas_origen` (cuentas extranjeras nuevas con factor alto = revisión manual).
- **Smokes:** `smoke_058_origen_clasificador` **90/90** (sin BD) + `smoke_origen_factor_parity` **111/111** (Neon).
- **ELIMINA** el bono plano ×1.2 del ADR-028/WP-5.

---

## 8. Casas y Clases Rising Star (ADR-038 / TSK-112 — IMPLEMENTADO en working tree)

Capa de progresión posterior al v5.0, verificada con Escudo GOLD y `smoke_038_casas_clases` 76/76 PASS. Pendiente aplicar migración 024 en Neon + deploy.

- **Casas:** Se reutiliza `usuarios.casa` (`condor|jaguar|delfin`); la migración 024 crea `casas_cofre` (cofre por Casa: `xp_cofre_total`, `poblacion_activa`, `factor_conversion`, `actualizado_en`) con seed idempotente y sin FK en v1.
- **Factor de nivelación por población dominante (runtime):** tag `dominante` (>45% → ×0.85), `equilibrada` (25%-45% → ×1.00) o `rezagada` (<25% → ×1.30). Se aplica UNA vez en `calcularXpFinal`.
- **Tributación del 10% al cofre:** sobre el `xp_final` post-factor, best-effort via `acreditarClaseYCofre` (literal `0.10`, sin endpoint `casa_tributar`).
- **Helper único de XP:** triada `contextoXpE` / `calcularXpFinal` / `calcularNivelClase` + `acreditarClaseYCofre` en `api/interacciones.js` v21, sobre 14 acciones de la whitelist.
- **Clases Rising Star (curva `XP_NIVEL_CLASE`):** `BONUS_CLASE` = cartógrafo 0.08 / cronista 0.10 / explorador 0.07; `XP_NIVEL_CLASE` = 11 umbrales `[0,100,250,500,900,1400,2100,3000,4200,5700,7500]`; `xp_clase` incrementa el **50% del `xp_final`**. `clase_elegir` (`api/usuarios.js` v16): primera elección gratis y recambio con 300 XP + cooldown de 30 días, sin gate de nivel (ENMIENDA 1).

---

## 9. Coleccionables (Cromos) y Vitrina

### 9.1 Cromos (IMPLEMENTADO)

- **Drop:** 15% por acción (`Math.random() >= 0.15` → sin cromo) — api/interacciones.js:960.
- **Rareza por roll:** `dorado < 0.07`, `epico < 0.25`, `raro < 0.55`, resto `comun` (api/interacciones.js:963-975).
- **Garantía épica:** con `capacidades.cromo_garantia = 'epico'` (`imantador_cromos`), fuerza épico o dorado y consume la garantía (api/interacciones.js:965-977).
- **UPSERT** en `usuarios_cromos` con `cantidad + 1` (api/interacciones.js:993-996).
- **Tablas:** `cromos_catalogo`, `usuarios_cromos`, `cromo_intercambios` (migración 010:61-87, 195-207).
- **Intercambio** (`cromo_intercambio`): requiere ≥2 copias, debita emisor, acredita receptor, ledger append-only, máx. 3/día (api/interacciones.js:4261-4329). **SOLO BACKEND** (0 UI en HTML).
- **Disparo manual** `cromo_obtener` (api/interacciones.js:4251-4257).

### 9.2 Vitrina de Perfil

`mi-perfil.html` implementa la vitrina: Tienda de Consumibles (L298-301), Mi Inventario (L303-305) y Mis Cromos (L307-310, carga vía `?tipo=mis_cromos`). El consumible `vitrina_estelar` destaca el perfil 7 días (api/interacciones.js:4228-4231). La **vitrina pública extendida** sigue **SOLO DOCUMENTADO**.

---

## 10. Sistemas v5.0 (Entrega 016)

### 10.1 Referidos — Pirámide Multinivel (IMPLEMENTADO backend / ROTO captura)

- **Columnas:** `referido_por` (self-FK), `codigo_referido` (único parcial), `xp_ref_total`, `referidos_directos_contados` (migración 016:53-72).
- **Código:** 6 caracteres, alfabeto sin ambiguos `abcdefghjkmnpqrstuvwxyz23456789` (api/usuarios.js:129-136); se genera y persiste al primer pedido, hasta 6 reintentos (api/usuarios.js:223-277).
- **Reparto:** CTE recursiva de máx. 5 niveles; `FLOOR` de 10/5/3/2/1% sobre `xp_ref_total`; tope por ancestro `referidos_directos_contados < 500` (api/interacciones.js:1136-1155).
- **Registro con `?ref=`:** topes 500 directos y 20/día; auto-referido → 400; ON CONFLICT DO UPDATE no toca `referido_por` (api/usuarios.js:457-519).
- **Lectura:** `GET tipo=referido_codigo` y `GET tipo=referido_red` (CTE 5 niveles por nivel, api/usuarios.js:281-308).
- **UI:** sección "Mi Red de Referidos" con QR en `mi-perfil.html:468, 1783-1843` (QR vía `api.qrserver.com`, L1801).
- **Estado: ROTO en flujo de captura.** El enlace apunta a `/registro.html?ref=<codigo>` (mi-perfil.html:1800) pero **`registro.html` NO existe** y **ningún archivo captura `?ref=`** para inyectarlo en el upsert.

### 10.2 Wayfarer / Activo Oculto (IMPLEMENTADO proponer/votar — SOLO BACKEND checkin)

Crowdsourcing geoespacial peer-to-peer (migración 016:90-184). Estados: `pendiente / aprobado / rechazado`.

| Operación | Gate | XP | Cita |
|---|---|---|---|
| `GET tipo=geo_nonce_solicitar` | usuario_id | — | api/interacciones.js:1462-1472 |
| `GET tipo=activos_ocultos_pendientes` | usuario_id o admin | — (excluye propias; estado `rechazado` derivado si >30 días sin votos) | api/interacciones.js:1479-1505 |
| `POST tipo=activo_oculto_proponer` | email verificado | 0 al proponer | api/interacciones.js:2679-2711 |
| `POST tipo=activo_oculto_votar` | JWT + email verificado + nivel 5 + no auto-voto + 1 voto | +5 (tope 30/día) | api/interacciones.js:2717-2798 |
| `POST tipo=activo_oculto_checkin` | JWT + nonce + `device_hash` registrado + geocerca + cooldown 90 s | +15 | api/interacciones.js:2804-2894 |
| `POST admin activo_oculto_moderar` | Bearer admin | +50 al proponente al aprobar | api/admin.js:412-467 |

- **Quórum ±3:** diferencia neta de votos (favor − contra) que aprueba o rechaza server-side (api/interacciones.js:2756-2772).
- **UI:** proponer y votar en `comunidad.html:2050, 2131`; moderación en `admin.html:6770`. **Checkin es SOLO BACKEND**.
- **Tablas:** `activos_ocultos`, `activos_ocultos_votos`, `activos_ocultos_checkins`, `geo_nonces` (migración 016:90-184).

### 10.3 Facciones (IMPLEMENTADO — afinidad territorial SOLO DOCUMENTADO)

- **4 facciones:** `exploradores`, `curadores`, `creadores`, `artistas` — CHECK en `usuarios.faccion` (migración 016:58-60).
- **Primera elección gratis:** `UPDATE ... WHERE faccion IS NULL` (api/usuarios.js:366-376).
- **Cambio:** cuesta **500 `xp_total`** + **cooldown 15 días**; requiere email verificado (api/usuarios.js:364-396).
- **Ranking:** `GET tipo=faccion_ranking` (agregado por facción + top 3 por facción con ROW_NUMBER, api/usuarios.js:311-324). UI en `comunidad.html:2153-2201`.
- **SOLO DOCUMENTADO:** afinidad de Parche ×1.3/×1.15/×1.0 y control territorial por ciudad (ADR-027; 0 coincidencias de "afinidad" en código).

### 10.4 Vocaciones / Mundo Artistas (IMPLEMENTADO)

- **4 vocaciones acumulables, TODAS a nivel 5:** `musico`, `cine`, `artista_grafico`, `escritor` (api/interacciones.js:194-203).
- **Catálogo en código** (patrón LOGROS); `usuarios.vocaciones` solo guarda claves activadas.
- **Toggle** `POST tipo=vocacion_activar`, gate de nivel server-side (403) (api/interacciones.js:3802-3833).
- **6 misiones de artista** (`grupo: 'artista'`, api/interacciones.js:479-547).
- **API de lectura:** `GET tipo=vocaciones_catalogo` y `GET tipo=vocaciones_usuario`. **UI:** panel en `mi-perfil.html:1075-1102`.

> **Discrepancia ADR-026:** el cuerpo original describía 3 rutas con niveles distintos (`musico@5, cine@8, artista_grafico@11`). La Entrega 016 las unificó a 4 rutas en bloque a nivel 5 (api/interacciones.js:192-203; ADR-027). El v6.2 documenta el estado del código, no el del ADR-026 original.

### 10.5 Sesión Firmada y Anti-Sybil (ADR-025 — IMPLEMENTADO)

- **JWT HMAC SHA-256:** `firmarSesion` api/usuarios.js:115-125; `validarSesion` api/interacciones.js:1086-1111 con `crypto.timingSafeEqual`. Payload `{sub, iat, exp}`, duración 7 días. Secreto `SESSION_JWT_SECRET` (fallback `dev_secret` inseguro).
- **Rutas protegidas (3):** `visita`, `activo_oculto_votar`, `activo_oculto_checkin` (api/interacciones.js:4734, 2720, 2807).
- **Nonce de un solo uso:** `geo_nonces`, TTL 2 min; consumo atómico en `consumirNonce` (api/interacciones.js:1122-1128).
- **`device_hashes`:** jsonb con máx. 5 huellas (api/usuarios.js:521-540); checkin exige `device_hash` registrado (api/interacciones.js:2823-2830).
- **Email verificado (Resend):** `email_verificar_solicitar` y `email_verificar_confirmar` (api/usuarios.js:404-445, 164-180); token 32 bytes/24 h. Gate para referidos, proponer/votar Activos y fundar Parche. `RESEND_API_KEY` **obligatoria**.
- **Cliente JWT:** `usuario-session.js:147-242` guarda y adjunta el token; `comunidad.html` renueva en 401.

### 10.6 Presencia Física (ADR-024 — backend IMPLEMENTADO / frontend ROTO)

`POST tipo=visita` exige presencia física server-side (api/interacciones.js:4721-4931):

**Fórmula Haversine (radio terrestre R = 6.371.008,8 m):**
$$d = 2R \arcsin\!\left(\sqrt{\sin^2\!\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\!\left(\frac{\Delta\lambda}{2}\right)}\right)$$

- **Radios adaptativos:** default/urbano 100 m; `naturaleza`/`aventura`/keyword rural 250 m; `parque`/`evento` 150 m; `festival`/`deporte` 200 m; `blog` rechazado.
- **Zona rural** por subcategoría, keyword o densidad (≤3 vecinos en bbox 0.02°).
- **Anti-spoofing:** `accuracy ≤ 150 m`, cooldown 90 s, velocidad ≤ 69.4 m/s, tope 30/24 h, rechazo de `(0,0)`.
- **Bono rural plano +20** (suma al XP total, sin multiplicador ni amuleto ni fama).
- **Dedup-first + índice único parcial** `idx_interacciones_visita_unica`; reactivar = 0 XP.
- **Estado frontend: ROTO.** `window.ExploraCO.marcarVisitado` (usuario-session.js:587-640) envía `tipo/lat/lng/accuracy/ts` pero **NO envía `Authorization: Bearer <jwt>` ni `nonce`** (usuario-session.js:598-609). Backend IMPLEMENTADO; flujo de usuario ROTO.

---

## 11. Economía Avanzada y Soberanía Territorial (SPEC v6.1)

### 11.1 Gig Economy Turística — Contratos P2P

Los usuarios de nivel avanzado (N25+) pueden crear asignaciones inmovilizando puntos de su balance:

```sql
CREATE TABLE IF NOT EXISTS contratos_p2p (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleador_id UUID NOT NULL REFERENCES usuarios(id),
    contratado_id UUID REFERENCES usuarios(id),
    destino_id UUID REFERENCES destinos(id),
    tipo_encargo VARCHAR(50) NOT NULL CHECK (tipo_encargo IN ('auditoria_wayfarer', 'curaduria_multimedia', 'resena_zona')),
    recompensa_puntos INT NOT NULL CHECK (recompensa_puntos > 0),
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_proceso', 'completado', 'cancelado', 'disputa')),
    expira_en TIMESTAMPTZ NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contratos_p2p_empleador ON contratos_p2p(empleador_id);
CREATE INDEX IF NOT EXISTS idx_contratos_p2p_estado ON contratos_p2p(estado) WHERE estado = 'abierto';
```

Tipos de encargo:
1. **Auditoría Wayfarer:** Verificación presencial con geocerca estricta de un Activo Oculto cuestionado.
2. **Curaduría Audiovisual:** Fotografías HDR o videos 4K para destinos con baja cobertura visual.
3. **Reseñas de Zona:** Inspección detallada sobre criterios de seguridad, conectividad y accesibilidad.

### 11.2 Soberanía Territorial y Upgrades de Parche

Los Parches compiten por el control geográfico de ciudades. La facción o Parche con mayor volumen de checkins y contenidos validados en una zona obtiene el **Control Territorial**:

```sql
CREATE TABLE IF NOT EXISTS parche_upgrades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parche_id UUID NOT NULL REFERENCES pandillas(id),
    ciudad_slug VARCHAR(100) NOT NULL,
    tipo_upgrade VARCHAR(50) NOT NULL CHECK (tipo_upgrade IN ('buff_xp_zona', 'descuento_comercial', 'aura_neon', 'escudo_territorial')),
    puntos_invertidos INT NOT NULL CHECK (puntos_invertidos > 0),
    activo_hasta TIMESTAMPTZ NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parche_upgrades_ciudad ON parche_upgrades(ciudad_slug, activo_hasta);
```

- **Buff de Zona:** +10% de XP acumulable para todos los miembros del Parche dentro de la ciudad dominada.
- **Aura Neón:** Los marcadores del mapa público para los destinos bajo control del Parche adoptan la identidad visual (colores y emblema) de la agrupación.
- **Cofre Colectivo:** `parche_upgrades` registra los fondos aportados por los miembros para comprar escudos o potenciar auras de zona.

### 11.3 Sistema de Impuesto de Clan (Tithe / Diezmo)

Toda transacción de XP generada por un miembro perteneciente a un Parche está sujeta a un **Tithe automático parametrizable (1% al 10%)**:

$$\text{XP}_{\text{Miembro}} = \text{XP}_{\text{Bruto}} \times (1 - \text{Tithe})$$
$$\text{Fama}_{\text{Parche}} = \text{Fama}_{\text{Parche}} + (\text{XP}_{\text{Bruto}} \times \text{Tithe})$$

Este flujo alimenta automáticamente la tesorería del Parche para financiar disputas territoriales y compras en la tienda colectiva.

### 11.4 Mecánica "Own the Spot" / Director del Spot

El usuario con la reseña/contenido más votado en un destino se convierte en el **"Director del Spot"**, recibiendo un dividendo del **10% de XP sobre todas las interacciones ajenas** dentro de ese lugar. Se activa desde el nivel 25 (Era Leyenda).

---

## 12. Apartado Social (resumen)

El sistema social (chat comunitario, planes de viaje colectivos, álbumes, comentarios y mapa audiovisual) se construyó en las migraciones 008/009/013 y ADR-014/015/017/023. En gaming aporta: chat con topes diarios, chat por plan, comentarios con XP +2, misiones sociales y logros `logr_social_*`.

**Documento hermano:** `ExploraCO_Sistema_Social_v5.md` (en `exploraco desarrollo/ampliacion desarrollo/`). Creado el 2026-09-14. Consolida el apartado social verificando `archivo:línea` (ADR-006), con sus propios gaps (G-01..G-23) y discrepancias (D-01..D-15). Enlace recíproco verificado. Detalle operativo: BLUEPRINT.md sección 3 y DECISIONS.md ADR-015/023.

---

## 13. Patrocinios (SOLO DOCUMENTADO — conceptual sin cambios desde v4)

El módulo de patrocinios **sigue siendo conceptual**. No existe migración de `sponsors` / `sponsor_canjes` ni handlers en `api/*.js`. El diseño del v4 (descuentos escalonados por nivel estilo SKATE, código de un solo uso, capa 1 relacional y capa 2 ACP/UCP) se conserva como **SOLO DOCUMENTADO**.

Único rastro de código: `usuarios.patrocinios jsonb` (migración 007:22) y `patrocinios: []` en la respuesta de `tabla_destino` (api/interacciones.js:2079), ambos vacíos de lógica.

---

## 14. Hoja de Ruta por Fases

### Fase 0 / v4 — CONSTRUIDA
20 niveles/4 eras derivados; economía de consumo con de-nivel; 13 consumibles; cromos; Parches con fama y retos; 28 misiones; 30 logros; 5 senderos. Migración 010. Spec ADR-018.

### Fase 1 (v5.0) — CONSTRUIDA (pendiente operativo)
Referidos multinivel, Wayfarer Activo Oculto, 4 facciones, vocaciones, sesión firmada/anti-Sybil, Casas + Clases Rising Star, Multiplicador de Origen (ADR-058). Migración 016 + 024 + 038 + variables + deploy.

### Fase 2 — PENDIENTES INMEDIATOS (bloqueantes de producción)
- [ ] Aplicar `db/migrations/016_multinivel_crowdsourcing.sql` en Neon (TASKS.md:2514-2515).
- [ ] Aplicar `db/migrations/024_casas_clases.sql` en Neon.
- [ ] Configurar `SESSION_JWT_SECRET`, `RESEND_API_KEY` y `SITE_URL` en Vercel (no configurar `DEV_EMAIL_ECHO` en producción).
- [ ] Deploy sincronizado de `usuarios.js` v9 + `interacciones.js` v13 + `admin.js` y verificación en vivo.
- [ ] **Arreglar flujo ROTO (referidos):** crear `registro.html` + captura de `?ref=` e inyección en upsert.
- [ ] **Arreglar flujo ROTO (visita):** actualizar `marcarVisitado` en `usuario-session.js` para solicitar el geo-nonce previo e incluir `Authorization: Bearer <jwt>`.

### Fase 3 — CORTO PLAZO (v5.x)
- [ ] UI de intercambio de cromos (`cromo_intercambio`, SOLO BACKEND).
- [ ] UI de checkin de Activo Oculto (`activo_oculto_checkin`, SOLO BACKEND).
- [ ] Cerrar el drift del apartado social (`ExploraCO_Sistema_Social_v5.md`).

### Fase 4 — MEDIANO PLAZO
- [ ] Afinidad de Parche a facción (×1.3/×1.15/×1.0) y control territorial por ciudad (SOLO DOCUMENTADO → implementar).
- [ ] Ligas/temporadas (Path of Exile) y vitrina pública extendida (SOLO DOCUMENTADO).

### Fase 5 — v6.1 (Gig Economy & Soberanía)
- [ ] Desplegar migración SQL para `contratos_p2p` y `parche_upgrades`.
- [ ] Conectar UI en `comunidad.html` para Contratos P2P (crear, aceptar, liquidar).
- [ ] Habilitar módulo de gestión de tesorería de Parche (Tithe) e inversión en auras de zona.
- [ ] Implementar mecánica "Own the Spot" / Director del Spot desde N25.

### Fase 6 — EXPLORATORIA (sin fecha)
- [ ] Desplegar JSON-Schema para **A2A Agent Card** (agentes externos consumiendo la API de ExploraCO de forma segura).
- [ ] Motor de optimización de interfaz basado en RL para perfiles en Era Mito (métricas CTR y RR).
- [ ] Patrocinios Capa 1 (`sponsors`/`sponsor_canjes`) y, con volumen real, Capa 2 (ACP/UCP).
- [ ] Capa cripto (Camino A: ledger interno → Camino B: Hive). *Requiere revisión legal en Colombia antes de anunciarse.*

---

## 15. Estado de Implementación y Gaps (con Evidencia)

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
| Casas + Clases Rising Star | IMPLEMENTADO (working tree) | api/interacciones.js v21; smoke 76/76 PASS; migración 024 PENDIENTE Neon |
| Multiplicador Origen (ADR-058) | IMPLEMENTADO | migración 038 aplicada; smoke 90/90 + 111/111 PASS |
| Referidos (reparto/red/código) | IMPLEMENTADO (backend) | api/usuarios.js:223-308; api/interacciones.js:1136-1155 |
| Captura de `?ref=` en registro | **ROTO** | `mi-perfil.html:1800` enlaza `/registro.html?ref=`; `registro.html` no existe |
| Wayfarer proponer/votar | IMPLEMENTADO | api/interacciones.js:2679-2798; comunidad.html:2050, 2131 |
| Wayfarer checkin | SOLO BACKEND | api/interacciones.js:2804-2894 (0 UI) |
| Wayfarer moderación admin | IMPLEMENTADO | api/admin.js:412-467; admin.html:6770 |
| Facciones (elección/cambio/ranking) | IMPLEMENTADO | api/usuarios.js:311-396 |
| Afinidad de Parche / control territorial | SOLO DOCUMENTADO | ADR-027; 0 coincidencias de "afinidad" en código |
| Vocaciones (4 @ nivel 5) | IMPLEMENTADO | api/interacciones.js:194-203, 3802-3833; mi-perfil.html:1075-1102 |
| Sesión JWT + nonce + device_hash | IMPLEMENTADO | api/usuarios.js:115-125; api/interacciones.js:1086-1128 |
| Email verificado (Resend) | IMPLEMENTADO (requiere `RESEND_API_KEY`) | api/usuarios.js:142-180, 404-445 |
| Presencia física (`visita`) backend | IMPLEMENTADO | api/interacciones.js:4721-4931 |
| Presencia física desde la UI | **ROTO** | usuario-session.js:598-609 (sin JWT ni nonce) |
| Contratos P2P / Gig Economy | SPEC v6.1 | Tablas SQL especificadas en sección 11.1 |
| Soberanía Territorial / Parche Upgrades | SPEC v6.1 | Tablas SQL especificadas en sección 11.2 |
| Tithe / Diezmo de Clan | SPEC v6.1 | Fórmula en sección 11.3 |
| Own the Spot / Director del Spot | SPEC v6.1 | Sección 11.4 |
| 40 niveles / 5 eras (extensión) | SPEC v6.1 | Sección 3.3 |
| A2A Agent Card + LangChain | SPEC v6.1 | Sección 4 (End Game) |
| RL UI adaptativo (Era Mito) | SPEC v6.1 | Sección 4 (End Game) |
| Patrocinios (sponsors/canjes) | SOLO DOCUMENTADO | 0 migraciones, 0 handlers |
| Ligas/temporadas | SOLO DOCUMENTADO | 0 código; v4 sección 10.2 |
| Vitrina pública extendida | SOLO DOCUMENTADO | v4 sección 10.3 |
| Migración 016 aplicada en Neon | PENDIENTE (BLOQUEANTE) | TASKS.md:2514-2515 |
| Migración 024 aplicada en Neon | PENDIENTE (BLOQUEANTE) | TASKS.md TSK-112 |

---

## 16. Matriz de Referentes de la Industria

| Plataforma | Mecánica Clave | Implementación en ExploraCO |
|---|---|---|
| **Steam** | Sistema de Logros | Rareza global en tiempo de ejecución calculada mediante agregaciones JSONB |
| **Upland** | Propiedad de Bienes Raíces | "Own the Spot" obtenida por mérito de curaduría y votos, no por especulación financiera (SPEC v6.1) |
| **Pokémon GO** | Geolocalización & Puntos | Validación presencial por Haversine con radios adaptativos, geocercas rurales y geononces anti-spoofing |
| **EVE Online** | Economía Dirigida & Clanes | Gig Economy P2P mediante contratos remunerados, Soberanía Territorial y sistema de Tithe automático de Parche (SPEC v6.1) |
| **Path of Exile** | Ligas / Temporadas | Periodos competitivos con ranking propio que se reinicia (SOLO DOCUMENTADO) |
| **iGaming** | Retención y Multiplicadores | Bucles de recompensa con drops probabilísticos de Cromos (15%), rareza variable y multiplicadores dinámicos sin riesgo económico real |

---

## 17. Riesgos a Vigilar

1. **Migración 016 no aplicada:** sin ella, referidos, facciones, Activo Oculto y `geo_nonces` fallan (columnas/tablas inexistentes) y la sesión firmada degrada.
2. **`SESSION_JWT_SECRET` ausente o distinta entre funciones:** tokens falsificables (fallback `dev_secret`) o 401 cruzados.
3. **`RESEND_API_KEY` pendiente:** la verificación de email devuelve 503 y el gating por `email_verificado` no se puede completar.
4. **Flujos ROTOS de frontend (visita y referidos):** bloquean la experiencia real aunque el backend esté listo.
5. **Prerrequisito 015 no confirmado en Neon:** ADR-006 exige verificarlo antes de asumir la 016.
6. **Anti-farming en v6.1:** el mercado de cromos, el reparto de referidos, los contratos P2P y el crowdsourcing son terreno de cuentas coordinadas. Las reglas (topes, dedup, quórum, email verificado, JWT, nonce, Tithe) deben monitorearse con volumen real.
7. **Cap global vs stacks altos:** `cap_global` puede absorber el premio en stacks combinados altos; requiere monitoreo en `salud_red`.
8. **Curva duplicada JS/SQL (parity como red de seguridad):** drift entre `calcularFactorOrigen` JS y su espejo SQL.
9. **Sin verificación documental de nacionalidad:** el tier Extranjero se basa en `ciudad_base`/`pais_base`; monitoreo via `alertas_origen`.
10. **Escala prematura:** ligas, territorio y duelo de Parches solo se sienten justos con suficiente comunidad activa.
11. **Riesgo regulatorio:** la capa cripto (Camino B, Hive) requiere revisión legal en Colombia antes de anunciarse.

---

## 18. Preguntas Pendientes de Decisión

1. ¿El módulo de patrocinios tiene ya marcas reales interesadas o firmadas, o sigue siendo 100% conceptual?
2. ¿Cuántos usuarios activos tiene hoy la plataforma aproximadamente?
3. ¿Confirmas el orden de prioridad propuesto (Steam → social/clanes → SKATE → Path of Exile → Upland/cripto → v6.1)?

---

## 19. Glosario

- **DAG (Directed Acyclic Graph):** Grafo Acíclico Dirigido — misiones/logros que se desbloquean solo tras cumplir prerrequisitos (`requiere[]`), sin ciclos.
- **JSONB flexible:** campo de base de datos que guarda información variable sin columna fija; se actualiza con merge `||` (ADR-003).
- **Cero Borrado Lógico:** nunca eliminar físicamente, solo cambiar el estado (`activo=false`).
- **De-nivel:** pérdida de nivel por gastar `xp_total` en consumibles; se revoca la capacidad superior (ADR-018).
- **Fama de Parche (Pandilla):** contador colectivo propio del grupo (`pandillas.fama_total`), independiente del XP individual; recibe 10% del XP de los miembros.
- **Sendero:** una de las 5 rutas de especialización (Explorador, Crítico, Organizador, Audiovisual, Parche) con su propia "fama" y tiers Semilla→Maestro.
- **Wayfarer / Activo Oculto:** propuesta peer-to-peer de un punto de interés secreto, validada por votos (quórum ±3) y checkin geolocalizado.
- **Quórum ±3:** diferencia neta de votos (favor − contra) que aprueba o rechaza un Activo Oculto server-side.
- **Facción:** uno de los 4 grupos (`exploradores`, `curadores`, `creadores`, `artistas`); primera elección gratis, cambio por 500 XP + cooldown 15 días.
- **Vocación:** ruta artística acumulable (`musico`, `cine`, `artista_grafico`, `escritor`), desbloqueada en bloque al nivel 5.
- **Nonce geoespacial:** token de un solo uso (TTL 2 min) que evita el replay de un payload `lat/lng` capturado (ADR-025).
- **Device hash:** fingerprint ligero de dispositivo (`usuarios.device_hashes`, máx. 5) como señal anti-Sybil.
- **Sesión firmada:** JWT HMAC SHA-256 emitido por `usuarios.js` y validado por `interacciones.js` solo en rutas sensibles.
- **Nivel/era/badge derivados:** nunca persistidos; se calculan desde `xp_total` en cada lectura.
- **Tithe / Diezmo:** impuesto automático parametrizable (1-10%) sobre XP de miembros de un Parche; alimenta la tesorería colectiva (SPEC v6.1).
- **Director del Spot / Own the Spot:** mecánica por la cual el usuario con el contenido más votado en un destino recibe un dividendo del 10% de XP de interacciones ajenas (SPEC v6.1).
- **A2A Agent Card:** credencial que permite a agentes externos de IA (LangChain/AutoGen) operar en la plataforma a nombre del usuario (SPEC v6.1, End Game N33+).
- **RL UI Layout:** optimización adaptativa de la interfaz mediante Reinforcement Learning (métricas CTR/RR) para perfiles en Era Mito (SPEC v6.1).
- **ACP / UCP:** Agentic Commerce Protocol (OpenAI + Stripe) y Universal Commerce Protocol (Google) — estándares 2025-2026 de compras hechas por agentes de IA.
- **MCP:** Model Context Protocol (Anthropic) — estándar de conexión entre IA y datos/herramientas externas.
- **Liga/Temporada:** periodo competitivo con ranking propio que se reinicia, dejando el progreso previo como prestigio permanente (SOLO DOCUMENTADO).
- **GIN Index:** tipo de índice PostgreSQL optimizado para campos JSONB; garantiza O(1) en consultas sobre arreglos y mapas de progreso.
- **Cap de Progresión (5×):** techo para la combinación de multiplicadores pasivos ($M_{\text{nivel}} \times M_{\text{clase}} \times M_{\text{origen}}$).
- **Cap Global (10×):** techo absoluto para cualquier evento de XP incluyendo temporales y buffs de clan.

---

## Apéndice A — Mapa Completo de Endpoints de Gamificación

### A.1 `api/interacciones.js` v13 — GET (`?tipo=`)

`geo_nonce_solicitar`, `activos_ocultos_pendientes`, `resenas`, `dims_avg`, `fotos`, `guardados`, `is_guardado`, `mapa`, `mi_rating`, `logros`, `misiones`, `mapas_mios`, `mapas_publicos`, `mapa_detalle`, `chat_salas`, `chat_mensajes`, `planes`, `planes_mios`, `plan_chat`, `vocaciones_catalogo`, `vocaciones_usuario`, `tabla_destino`, `albumes`, `album_detalle`, `galeria_destino`, `comentarios_recientes`, `multimedia_mapa`, `mi_feed_fotos`, `fotos_top`, `comentarios_foto`, `consumibles`, `inventario`, `mis_cromos`, `pandilla_detalle`, `pandilla_reto`.

Fuente: api/interacciones.js:1454-2665.

### A.2 `api/interacciones.js` v13 — POST (`body.tipo` → `tipo2`)

`activo_oculto_proponer`, `activo_oculto_votar`, `activo_oculto_checkin`, `mapa_crear`, `mapa_editar`, `mapa_eliminar`, `mapa_agregar_destino`, `mapa_quitar_destino`, `chat_sala`, `chat_msg`, `chat_mod`, `plan_crear`, `plan_unirse`, `plan_salir`, `plan_chat_msg`, `review_voto`, `foto`, `foto_voto`, `album_crear`, `album_agregar_foto`, `album_voto`, `album_quitar_foto`, `album_editar`, `album_eliminar`, `admin_foto_top`, `admin_moderar_foto_album`, `admin_xp`, `vocacion_activar`, `comentario_foto`, `comentario_eliminar`, `comentario_voto`, `comprar_consumible`, `usar_consumible`, `cromo_obtener`, `cromo_intercambio`, `pandilla_crear`, `pandilla_unirse`, `pandilla_salir`, `pandilla_reto`, `resena`, `guardado`, `quitar_guardado`, `visita`, `quitar_visita`, `rating`.

Fuente: api/interacciones.js:2666-5031.

### A.3 `api/usuarios.js` v9

- **GET:** `tipo=leaderboard`, `tipo=buscar` (o `?buscar=`), `tipo=referido_codigo`, `tipo=referido_red`, `tipo=faccion_ranking`, `tipo=email_verificar_confirmar`, `?id=<uuid>` (api/usuarios.js:193-341).
- **POST (`body.tipo`):** `faccion_elegir`, `email_verificar_solicitar`, `email_verificar_confirmar`, upsert de registro con `?ref=` (api/usuarios.js:343-549).

### A.4 `api/admin.js`

- **`recurso=consumibles`:** `tipo=consumibles_lista`, `consumibles_crear`, `consumibles_editar`, `consumibles_toggle`.
- **`recurso=activos_ocultos`:** `tipo=activo_oculto_moderar` (Bearer admin).
- Otros recursos históricos: `solicitudes`, `resenas`, `destacado`, `notificaciones` (api/admin.js:8-12, 398-470).

---

## Apéndice B — Modelo de Datos Gaming (Extracto)

```sql
-- usuarios (migraciones 010, 015, 016, 038)
xp_total                     integer NOT NULL DEFAULT 0,
capacidades                  jsonb NOT NULL DEFAULT '{}'::jsonb,   -- 010: inventario consumibles
vocaciones                   jsonb NOT NULL DEFAULT '{}'::jsonb,   -- 015
referido_por                 uuid REFERENCES usuarios(id),         -- 016
codigo_referido              varchar(20),                          -- 016 (índice único parcial)
xp_ref_total                 int DEFAULT 0,                        -- 016
referidos_directos_contados  int DEFAULT 0,                        -- 016
faccion                      varchar(20) CHECK (faccion IS NULL OR faccion IN
                             ('exploradores','curadores','creadores','artistas')), -- 016
faccion_elegida_en           timestamptz,                          -- 016
email_verificado             boolean DEFAULT false,                -- 016
email_token / email_token_expira / device_hashes jsonb,           -- 016
origen_declarado_en          timestamptz,                          -- 038
-- xp_ledger.mult_origen numeric(10,6), origen_tier               -- 038

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

-- Geo (038)
geo_ciudades(cod_mpio PK, nombre, lat, lng, es_capital)  -- 1.122 filas DIVIPOLA
geo_paises(iso2 PK, nombre, lat, lng)                     -- 245 filas ISO-3166-1

-- Casas (024 — PENDIENTE Neon)
casas_cofre(casa PRIMARY KEY, xp_cofre_total, poblacion_activa, factor_conversion, actualizado_en)

-- SPEC v6.1 (aún sin migración)
contratos_p2p(...)    -- ver sección 11.1
parche_upgrades(...)  -- ver sección 11.2
```

---

## Apéndice C — Trazabilidad Documental

- **Base conceptual:** `ExploraCO_Gamificacion_v4_Plan_Maestro.md` (histórico; NO modificado).
- **Versión anterior:** `ExploraCO_Gamificacion_v5_Plan_Maestro.md` (estado real consolidado v4 + Entrega 016).
- **Spec extendida fuente:** `documento_maestro_gamificacion_v6_1.md` (economía avanzada, 40 niveles, A2A).
- **Documento hermano (apartado social):** `ExploraCO_Sistema_Social_v5.md` (enlace recíproco verificado).
- **Decisiones clave:** ADR-003 (JSONB merge), ADR-006 (repo = verdad), ADR-018 (gamificación v4), ADR-024 (presencia física), ADR-025 (sesión firmada/anti-Sybil), ADR-026 (vocaciones/chat/perfil/XP admin), ADR-027 (referidos/crowdsourcing/facciones), ADR-038 (Casas + Clases), ADR-053 (drift niveles), ADR-058 (Multiplicador Origen).
- **Tarea principal:** TASKS.md TSK-101 (L2489-2522); TSK-112 (Casas + Clases); TSK-155 (ADR-058).
- **Checklist de deploy:** `docs/DEPLOY_016.md`.
- **Smokes verificados:** `smoke_016_multinivel_crowdsourcing.js` (39/39 PASS); `smoke_038_casas_clases` (76/76 PASS); `smoke_058_origen_clasificador` (90/90 PASS); `smoke_origen_factor_parity` (111/111 PASS).

---

## Apéndice D — Comando de Validación de Integridad

```bash
# Verificación completa de consistencia de la arquitectura v6.2
RUN verify-system-v6.2 --all-nodes --check-persistence --ascii-safe

# Smokes disponibles
npm test                    # smoke_058_origen_clasificador (90/90, sin BD)
npm run smoke:origen        # smoke_origen_factor_parity (111/111, Neon)
node scripts/smoke_016_multinivel_crowdsourcing.js  # (39/39)
node scripts/smoke_038_casas_clases.js              # (76/76)
```
