# ExploraCO — Sistema Social de la Gamificacion (v5)

## Estado del documento

- Version: v1.0
- Fecha: 2026-09-14
- Autor: Documentation Specialist (docs-keeper)
- Proposito: consolidar en un solo documento **todo el "apartado social"** de la gamificacion de ExploraCO, que hoy esta disperso entre `comunidad.html`, `mi-perfil.html`, `api/usuarios.js`, `api/interacciones.js`, `api/admin.js` y las migraciones 007-016.
- Metodo: cada dato fue verificado contra el **archivo real** del repositorio y se cita como `archivo:linea` (ADR-006: el baseline de verdad es el archivo real, nunca la cifra citada en un documento; Regla de Oro 8: el historial de chat no es fuente de verdad).
- Documento complementario: `ExploraCO_Gamificacion_v5_Plan_Maestro.md` (en `exploraco desarrollo/ampliacion desarrollo/`) -- Plan Maestro vigente del sistema de gamificacion; este documento desarrolla su apartado social. El Plan Maestro v4 (`ExploraCO_Gamificacion_v4_Plan_Maestro.md`) queda como historico y solo se cita como origen de propuestas que el v5 corrige.
- Este documento NO es implementacion: no introduce endpoints, tablas ni codigo nuevo. Es un mapa de lo existente y de sus brechas.

### Leyenda de estados

| Estado | Significado |
|---|---|
| IMPLEMENTADO | Existe UI en frontend y respaldo en backend, conectados extremo a extremo. |
| SOLO BACKEND | El endpoint existe y funciona, pero ningun frontend lo invoca (sin UI). |
| SOLO DOCUMENTADO | Aparece en documentacion/specs/planes, pero no existe en el codigo real. |
| ROTO | Existe en codigo pero apunta a algo inexistente o no funciona (enlace, endpoint, campo). |

### Baseline verificado (conteo de lineas referencial)

| Archivo | Lineas reales (2026-09-14) |
|---|---|
| `comunidad.html` | 2241 |
| `mi-perfil.html` | 2020 |
| `index.html` | 4982 |
| `api/interacciones.js` | 5031 |
| `api/usuarios.js` | 561 |
| `api/admin.js` | 477 |
| `api/pagina-destino.js` | 2534 |
| `usuario-session.js` | 1041 |
| `db/migrations/008_comunidad_social.sql` | 93 |
| `db/migrations/009_albumes.sql` | 102 |
| `db/migrations/010_gamificacion_v4.sql` | 207 |
| `db/migrations/013_album_comentarios.sql` | 60 |
| `db/migrations/015_epic_prompt.sql` | 103 |
| `db/migrations/016_multinivel_crowdsourcing.sql` | 209 |

---

## 0. Alcance, actores y como leer este documento

### 0.1 Que cubre el "apartado social"

Todo lo que relaciona a un viajero con **otros viajeros** dentro de la gamificacion:

- El hub `comunidad.html` (chat, planes, ranking, mapas audiovisuales, Parches, Activos Ocultos).
- Los **Parches** (ex Pandillas): grupos, fama, retos y roles.
- **Chat y planes** colectivos con XP compartida.
- **Albumes y comentarios** (media social).
- **Resenas y votos de utilidad** (Own the Spot).
- **Activo Oculto** (crowdsourcing Wayfarer).
- **Facciones** y competencia social.
- **Referidos / Mi Red** (piramide multinivel).
- **Perfiles, leaderboard y descubrimiento**.
- **Misiones y logros sociales**.
- **Notificaciones y actividad**.

### 0.2 Mapa de actores

```
                         +--------------------------------------+
                         |            USUARIO (viajero)         |
                         |  xp_total, nivel(1-20), faccion,     |
                         |  email_verificado, codigo_referido   |
                         +------------------+-------------------+
                                            |
        +----------------------+------------+-------------+----------------------+
        |                      |                          |                      |
        v                      v                          v                      v
+---------------+     +----------------+        +------------------+    +-----------------+
|   PARCHES     |     |    FACCIONES   |        |    REFERIDOS     |    |   COMUNIDAD     |
| (pandillas)   |     | (4, calculadas |        | (piramide 5 niv) |    | (chat/planes/   |
| grupos <=10   |     |  en consulta)  |        | 10/5/3/2/1%      |    |  ranking/media) |
| fama, retos   |     | ranking global |        | xp_ref_total     |    |                 |
+-------+-------+     +--------+-------+        +---------+--------+    +---------+-------+
        |                      |                          |                      |
        |  afinidad x1.3       |  control territorial     |  ?ref=               |  XP social
        |  x1.15 / x1.0        |  (por ciudad)            |                      |
        v                      v                          v                      v
     [SOLO                   [SOLO                     [ROTO en               [IMPLEMENTADO]
      DOCUMENTADO]            DOCUMENTADO]              frontend]
```

### 0.3 Nota sobre el "relabel"

El esquema y la API conservan el termino historico **`pandilla*`** (`pandillas`, `pandillas_miembros`, `pandilla_retos`, `pandilla_crear`, ...). El termino **"Parche"** es un relabel **solo de texto visible** en la UI. Ver seccion 3.5.

---

## 1. Vision general del apartado social

El apartado social nace de cuatro oleadas tecnicas documentadas en `DECISIONS.md`:

| ADR | Fecha | Aporte social | Fuente |
|---|---|---|---|
| ADR-015 | 2026-09 | Comunidad social real: chat y planes con gaming | `DECISIONS.md:300` |
| ADR-017 | 2026-09-09 | Albumes fotograficos, gamificacion y mapa audiovisual | `DECISIONS.md:344` |
| ADR-018 | 2026-09-10 | Gamificacion v4: consumibles, cromos y **Pandillas** | `DECISIONS.md:374` |
| ADR-022 | 2026-09-12 | Dedup de `resena`/`rating` (fotos libres) | `DECISIONS.md:484` |
| ADR-023 | 2026-09-12 | Comentarios estilo Facebook sobre media de albumes | `DECISIONS.md:515` |
| ADR-025 | 2026-09-14 | Sesion firmada + anti-Sybil (nonce, device, email) | `DECISIONS.md:592` |
| ADR-026 | 2026-09-13 | Chat privado por plan, vocaciones, XP admin | `DECISIONS.md:624` |
| ADR-027 | 2026-09-14 | Piramide de referidos + Wayfarer + 4 Facciones | `DECISIONS.md:653` |

El XP social no crea una segunda moneda: todo se acumula en `usuarios.xp_total` (ADR-018). La unica excepcion es `usuarios.xp_ref_total`, un **campo de apoyo** del reparto piramidal que se lee para mostrar "XP por red" (`api/usuarios.js:223-277`, `mi-perfil.html:1809`).

### 1.1 Relaciones entre subsistemas

```
   Parche ---- afinidad (x1.3/x1.15/x1.0, SOLO DOCUMENTADO) ----> Faccion
     |                                                              |
     | fama_total (10% del XP de sus miembros, IMPLEMENTADO)        | faccion_ranking
     |                                                              v
     +--------------------- XP social --------------------> xp_total / xp_ref_total
                              |                                      ^
                              |                                      |
             +----------------+----------------+                     |
             v                v                v                     |
           Chat            Planes          Albumes/Resenas      Referidos
        (+2 tope 20/d)   (via misiones)   (+15/+10/+5/+2...)   (10/5/3/2/1% FLOOR)
```

### 1.2 Que NO existe (aunque la documentacion previa lo sugiera)

- No existe **gr/afinidad de Parche a Faccion** persistida ni calculada en endpoint alguno (solo se describe en `DECISIONS.md:678`).
- No existe **control territorial por ciudad**: la UI rotula "Control Territorial" pero en realidad consulta el ranking global de facciones (seccion 8).
- No existe **mapa dedicado de Activos Ocultos**: solo hay endpoint de propuestas pendientes (seccion 7).
- No existe **perfil publico** navegable por `?id=` ni **vitrina publica** de otro usuario (seccion 10).
- No existe **notificacion in-app** (campana), solo emails al admin (seccion 12).
- No existe **registro.html** ni captura de `?ref=` en el frontend de registro (seccion 9).

---

## 2. Hub `comunidad.html` — mapa de tabs a endpoints

`comunidad.html` tiene **2241 lineas**. Los tabs viven en `comunidad.html:296-304` y el conmutador es `showCommTab()` (`comunidad.html:2204-2222`).

### 2.1 Tabs reales

| # | Tab (texto visible) | `showCommTab` | Handler de carga | Linea |
|---|---|---|---|---|
| 1 | Chat | `'chat'` | `renderChatRooms()` | `comunidad.html:297` |
| 2 | Planes | `'planes'` | `renderPlanes()` | `comunidad.html:298` |
| 3 | Mapa | `'mapa'` | `onTabMapaAV()` | `comunidad.html:299` |
| 4 | Ranking | `'ranking'` | `cargarLeaderboard()` | `comunidad.html:300` |
| 5 | Parches | `'pandillas'` | `renderPandillas()` | `comunidad.html:301` |
| 6 | Activo Oculto | `'wayfarer'` | `initActivoOculto()` | `comunidad.html:302` |
| 7 | Audiovisual | `'av'` | `initAudiovisual()` | `comunidad.html:303` |

El dispatch esta en `comunidad.html:2213-2221`; al salir de Chat se detiene el polling (`comunidad.html:2221`).

### 2.2 Tab -> endpoints

| Tab | Endpoint(s) | Linea frontend | Linea backend |
|---|---|---|---|
| Chat (salas) | GET `/api/interacciones?tipo=chat_salas` | `comunidad.html:727` | `api/interacciones.js:1782` |
| Chat (mensajes) | GET `tipo=chat_mensajes&sala_id=` (+ polling 5s) | `comunidad.html:783`, `:858` | `api/interacciones.js:1803` |
| Chat (enviar) | POST `tipo=chat_msg` | `comunidad.html:942` | `api/interacciones.js:3065` |
| Chat (crear sala) | POST `tipo=chat_sala` | `comunidad.html:888` | `api/interacciones.js:3042` |
| Chat (moderar) | POST `tipo=chat_mod` (fijar/eliminar) | `comunidad.html:874` | `api/interacciones.js:3124` |
| Planes (listar) | GET `tipo=planes&usuario_id=` | `comunidad.html:971` | `api/interacciones.js:1823` |
| Planes (crear) | POST `tipo=plan_crear` | `comunidad.html:1042` | `api/interacciones.js:3153` |
| Planes (unirse/salir) | POST `tipo=plan_unirse` / `tipo=plan_salir` | `comunidad.html:1067`, `:1079` | `api/interacciones.js:3203`, `:3238` |
| Planes (chat privado) | GET `tipo=plan_chat` / POST `tipo=plan_chat_msg` | `comunidad.html:1110`, `:1182`, `:1166` | `api/interacciones.js:1858`, `:3256` |
| Mapa | GET `tipo=multimedia_mapa` (+ `tipo_media` CSV) | `comunidad.html:1595` | `api/interacciones.js:2268` |
| Mapa (modal album) | GET `tipo=album_detalle` | `comunidad.html:1689` | `api/interacciones.js:2125` |
| Ranking | GET `/api/usuarios?tipo=leaderboard&limit=20` | `comunidad.html:1518` | `api/usuarios.js:194` |
| Parches (detalle) | GET `tipo=pandilla_detalle&usuario_id=` | `comunidad.html:1225` | `api/interacciones.js:2590` |
| Parches (unirse) | POST `tipo=pandilla_unirse` | `comunidad.html:1319` | `api/interacciones.js:4374` |
| Parches (fundar) | POST `tipo=pandilla_crear` | `comunidad.html:1427` | `api/interacciones.js:4333` |
| Parches (crear reto) | POST `tipo=pandilla_reto` | `comunidad.html:1392` | `api/interacciones.js:4446` |
| Parches (salir) | POST `tipo=pandilla_salir` | `comunidad.html:1451` | `api/interacciones.js:4431` |
| Activo Oculto (proponer) | POST `tipo=activo_oculto_proponer` | `comunidad.html:2050` | `api/interacciones.js:2679` |
| Activo Oculto (votar) | POST `tipo=activo_oculto_votar` (JWT) | `comunidad.html:2131` | `api/interacciones.js:2717` |
| Activo Oculto (pendientes) | GET `tipo=activos_ocultos_pendientes` | `comunidad.html:2083` | `api/interacciones.js:1479` |
| Activo Oculto (facciones) | GET `/api/usuarios?tipo=faccion_ranking` | `comunidad.html:2158` | `api/usuarios.js:311` |
| Audiovisual (albumes) | GET `tipo=albumes&orden=&limit=&offset=` | `comunidad.html:1785` | `api/interacciones.js:2086` |
| Audiovisual (feed) | GET `tipo=mi_feed_fotos&orden=&limit=&offset=` | `comunidad.html:1839` | `api/interacciones.js:2357` |
| Comentarios (album) | `AlbumComments` (asset `album-comments.js`) | `comunidad.html:2239` | `api/interacciones.js:2407`, `:3839` |

El JS del hub esta embebido; solo carga un asset externo de comentarios: `album-comments.js` (`comunidad.html:2239`).

### 2.3 Gating del hub

- Sin sesion: Chat y Planes muestran CTA de login (`comunidad.html:320-324`, `:706-712`, `:959-964`).
- Chat bloqueado por nivel: usa `u.capacidades.chat` como fuente de verdad (`comunidad.html:641`, `:714-720`). El desbloqueo real lo decide la mision `mis_chat_mensajero` (seccion 11).
- Aviso de "Niveles de chat" (`CHAT_PERKS`, `comunidad.html:648-654`) es **informativo** y tiene etiquetas desactualizadas (ver Discrepancias D-06).

---

## 3. Parches (ex Pandillas)

### 3.1 Esquema (migracion 010)

| Tabla | Definicion | Linea |
|---|---|---|
| `pandillas` | `id`, `nombre` UNIQUE, `fundador_id`, `fama_total`, `ciudad_base`, `descripcion`, `activo`, `creado_en` | `db/migrations/010_gamificacion_v4.sql:93-102` |
| `pandillas_miembros` | PK `(pandilla_id, usuario_id)`, `rol` CHECK `fundador/oficial/miembro`, `activo`, `fecha_ingreso` | `db/migrations/010_gamificacion_v4.sql:108-115` |
| `pandilla_retos` | `titulo`, `tipo_reto`, `meta_valor`, `fecha_inicio/fin`, `progreso_actual`, `completado`, `xp_bono` | `db/migrations/010_gamificacion_v4.sql:129-142` |

Indices parciales por miembro activo: `db/migrations/010_gamificacion_v4.sql:117-123`; retos activos: `:144-146`.

### 3.2 Endpoints

| Endpoint | Metodo | Gate / regla | Linea | Estado |
|---|---|---|---|---|
| `pandilla_detalle` | GET | `pandilla_id` o `usuario_id`. Si no tiene Parche: devuelve `pandilla:null` + `pandillas_disponibles` (activos con cupo < 10) | `api/interacciones.js:2590-2647` | IMPLEMENTADO |
| `pandilla_reto` | GET | Consulta retos activos (`completado=false AND fecha_fin > NOW()`) | `api/interacciones.js:2650-2660` | SOLO BACKEND (sin UI) |
| `pandilla_crear` | POST | Gate nivel >= 14 (8500 XP) y max 1 Parche activo | `api/interacciones.js:4333-4371` | IMPLEMENTADO |
| `pandilla_unirse` | POST | Max 1 activo, max 10 miembros, cooldown 14 dias | `api/interacciones.js:4374-4428` | IMPLEMENTADO |
| `pandilla_salir` | POST | Soft-delete (`activo=false`) + guarda `fecha_salida_pandilla` | `api/interacciones.js:4431-4443` | IMPLEMENTADO |
| `pandilla_reto` | POST | Rol `fundador` u `oficial`; `meta_valor >= 1`; `fecha_fin` futura; `xp_bono >= 0` | `api/interacciones.js:4446-4481` | IMPLEMENTADO |

Notas:
- Al fundar, el fundador entra con rol `'fundador'` (`api/interacciones.js:4366-4369`).
- Al unirse, entra con rol `'miembro'` (`api/interacciones.js:4417-4421`).
- No hay endpoint para ascender a `'oficial'` ni para expulsar miembros: los roles `oficial` solo se pueden setear por SQL directo. El CHECK del esquema lo admite (`db/migrations/010_gamificacion_v4.sql:111`), pero no hay flujo de UI/backend.

### 3.3 Fama de Parche

`aplicarFamaPandilla` (`api/interacciones.js:1007-1028`) suma a `pandillas.fama_total`:

- **10% del XP entregado**, con `Math.round` (`api/interacciones.js:1017`).
- Duplicado si el consumible `trompeta_fama` esta activo (`fama_x2_hasta` futuro, `api/interacciones.js:1021-1023`, efecto en `:4224-4227`).
- Nunca lanza: sin Parche activo no hace nada (`api/interacciones.js:1012-1015`).

Puntos donde se acredita la fama:

| Accion | Linea |
|---|---|
| Resena | `api/interacciones.js:4602` |
| Guardado | `api/interacciones.js:4696` |
| Visita | `api/interacciones.js:4905` |
| Rating | `api/interacciones.js:5008` |

El XP del **bono rural** NO aporta fama (`api/interacciones.js:4893-4895`).

### 3.4 Retos de Parche

`progresarPandillaRetos(sql, usuarioId, tipoReto)` (`api/interacciones.js:1037-1076`):

1. Busca el Parche activo del usuario.
2. `UPDATE pandilla_retos ... progreso_actual + 1` sobre retos activos del `tipo_reto` que se pasa (`api/interacciones.js:1047-1053`).
3. Si cruza `meta_valor`, marca `completado=true` y reparte `xp_bono` a **todos los miembros activos** (`api/interacciones.js:1060-1070`).
4. Devuelve `{ titulo, xp_bono }` del primer reto completado.

Tipos de reto que progresan: `'resena'`, `'guardado'`, `'visita'` (y `'rating'` cuenta como `'visita'`, `api/interacciones.js:5011-5013`). El formulario de la UI ofrece `visitas`, `resenas`, `guardados` (`comunidad.html:1366-1370`), pero el backend no valida una whitelist de `tipo_reto` (`api/interacciones.js:4470`): acepta cualquier string. Un reto de tipo desconocido nunca progresa porque no hay llamada con ese tipo.

### 3.5 Relabel Pandilla -> Parche

- **Visible (IMPLEMENTADO):** la UI dice "Parche" en tab, tarjetas, botones y toasts (`comunidad.html:301`, `:1237-1250`, `:1277-1288`, `:1322`, `:1434`, `:1450`, `:1454`).
- **API / esquema (sin cambio):** `pandilla*` en endpoint, tablas y columnas.
- **Residual ROTO:** `mi-perfil.html:514` conserva `capacidades: 'Mapas de Cine; FUNDAR PANDILLA'` en el catalogo de niveles, sin relabel. Tambien `index.html:4037` (`'Mapas de Cine; FUNDAR PANDILLA'`) y `mi-perfil.html:517` (`'x1.2 XP de Pandilla grupal'`).

### 3.6 Gaps de Parches

| Hallazgo | Evidencia | Estado |
|---|---|---|
| **Minimo 3 miembros para fundar**: el Plan Maestro lo pide, el codigo solo aplica max 10. | Documentado en `.../ExploraCO_Gamificacion_v4_Plan_Maestro.md:199,356`; el codigo no lo valida (max 10 al unirse en `api/interacciones.js:4411-4416` y creacion sin minimo en `:4333-4371`) | SOLO DOCUMENTADO |
| **Conteo de miembros no se muestra**: el backend devuelve `miembros_actuales` (`api/interacciones.js:2604`), pero el frontend lee `p.miembros_count` / `p.cantidad_miembros` (`comunidad.html:1300-1301`). | Mismatch de nombre de campo | ROTO |
| **`mis_fundar_parche` (+50 XP) y misiones de Parche**: no existen en el catalogo. | Plan Maestro `.../ExploraCO_Gamificacion_v5_Plan_Maestro.md:241` (corrige la propuesta del v4 `...:348-358`); el catalogo `MISIONES` no tiene grupo `pandilla` (`api/interacciones.js:214-556`) | SOLO DOCUMENTADO |
| **Gate de email al fundar Parche**: ADR-025 lo exige, el backend no lo valida. | Documentado en `DECISIONS.md:607,613`; `pandilla_crear` solo valida XP (`api/interacciones.js:4343-4348`) | SOLO DOCUMENTADO |
| **Sala de chat privada del grupo** (beneficio rango 1-5): no implementada. | Plan Maestro `...:304`; no hay `pandilla_sala` ni `sala_id` en `pandillas` | SOLO DOCUMENTADO |
| **`pandilla.mi_rol`**: `esLiderPandilla()` lo lee (`comunidad.html:1263`) pero `pandilla_detalle` no lo devuelve. Funciona por el fallback que revisa `miembros[]`. | `api/interacciones.js:2621-2624` vs `comunidad.html:1260-1268` | ROTO (cosmetico, con fallback) |

---

## 4. Chat y Planes

### 4.1 Esquema (migraciones 008 y 015)

| Tabla | Definicion | Linea |
|---|---|---|
| `chat_salas` | `nombre`, `icono`, `tipo` (`viajeros`/`ciudad`/`region`/`plan`), `orden`, `creador_id`, `activo` | `db/migrations/008_comunidad_social.sql:28-38` |
| `chat_mensajes` | `sala_id` FK CASCADE, `usuario_id`, `nombre`, `texto`, `fijado`, `activo` | `db/migrations/008_comunidad_social.sql:43-52` |
| `planes_viaje` | `destino`, `fechas`, `cupos`, `descripcion`, `creador_id`, `activo` | `db/migrations/008_comunidad_social.sql:57-66` |
| `planes_miembros` | PK `(plan_id, usuario_id)` | `db/migrations/008_comunidad_social.sql:71-76` |
| `usuarios.progreso_social` | JSONB para el tope diario de chat | `db/migrations/008_comunidad_social.sql:78-79` |
| `planes_viaje.sala_id` | FK opcional a `chat_salas` (chat por plan) | `db/migrations/015_epic_prompt.sql:56-57` |

La migracion 015 ademas **limpia** las salas de sistema: solo quedan `Chat general` y `Bogota` (`db/migrations/015_epic_prompt.sql:77-79`).

### 4.2 Endpoints de chat

| Endpoint | Metodo | Gate | XP | Linea |
|---|---|---|---|---|
| `chat_salas` | GET | Publico. Lista salas activas con `ultimo_texto` y `total_mensajes` | - | `api/interacciones.js:1782-1798` |
| `chat_mensajes` | GET | Publico. Ultimos 100 de una sala (excluye salas `tipo='plan'`) | - | `api/interacciones.js:1803-1818` |
| `chat_sala` | POST | `mis_chat_creador` (nivel 5, 700 XP); nombre <= 40 chars | - | `api/interacciones.js:3042-3061` |
| `chat_msg` | POST | `mis_chat_mensajero` (nivel 3, 250 XP); texto <= 500; rechaza salas `tipo='plan'` | **+2 XP**, tope 20 XP/dia | `api/interacciones.js:3065-3120`, tope en `:1161-1182` |
| `chat_mod` | POST | `mis_chat_moderador` (nivel 4, 450 XP); accion `fijar` o `eliminar` | - | `api/interacciones.js:3124-3149` |

El tope de chat se guarda en `progreso_social` como `{ chat_dia: 'YYYY-MM-DD', chat_n: N }`; 10 mensajes/dia (`api/interacciones.js:1157-1182`).

### 4.3 Endpoints de planes

| Endpoint | Metodo | Gate / regla | XP | Linea |
|---|---|---|---|---|
| `planes` | GET | Publico. `miembros_actuales` por COUNT, `unido` por EXISTS | - | `api/interacciones.js:1823-1836` |
| `planes_mios` | GET | Planes creados por el usuario | - | `api/interacciones.js:1839-1856` |
| `plan_chat` | GET | Solo creador o miembro; si no hay `sala_id` devuelve error suave | - | `api/interacciones.js:1858-1909` |
| `plan_crear` | POST | `mis_chat_mensajero` (nivel 3); `cupos` 1-50; crea **sala `tipo='plan'`** y la liga | (via `mis_plan_creador`) | `api/interacciones.js:3153-3198` |
| `plan_unirse` | POST | Libre; 403 si es el plan propio; 409 si lleno/duplicado | (via `mis_plan_unido`) | `api/interacciones.js:3203-3235` |
| `plan_salir` | POST | DELETE fisico de `planes_miembros` | - | `api/interacciones.js:3238-3249` |
| `plan_chat_msg` | POST | `mis_chat_mensajero` + membresia/creador; texto <= 500 | **+2 XP**, tope 20 XP/dia (compartido con chat) | `api/interacciones.js:3256-3320` |

Observaciones:
- `plan_salir` es el unico DELETE fisico del apartado social (`api/interacciones.js:3244-3247`). No contradice la Regla de Oro 3 porque no hay XP asociado a la fila; el XP del plan viene por mision una sola vez.
- El chat general bloquea escribir en salas `tipo='plan'` para que no se salte la privacidad (`api/interacciones.js:3085-3089`).
- `plan_crear` crea la sala despues del plan, sin transaccion explicita; si falla la sala, el plan sigue valido (`api/interacciones.js:3179-3194`).

### 4.4 XP de chat compartido

`chatXpDisponible` / `registrarChatXp` (`api/interacciones.js:1161-1182`) son reutilizados por `chat_msg` (`:3097-3108`) y `plan_chat_msg` (`:3297-3308`). El tope es **compartido** entre chat general y chat de plan: 10 mensajes/dia con XP (20 XP/dia) entre ambos.

---

## 5. Albumes y comentarios (media social)

### 5.1 Esquema (migraciones 009 y 013)

| Tabla | Definicion | Linea |
|---|---|---|
| `albumes` | `usuario_id`, `titulo`, `tipo` CHECK (`fotos/videos/audio/mixto`), `lat/lng`, `ciudad`, `region`, `portada_url`, `es_top`, `activo` | `db/migrations/009_albumes.sql:25-40` |
| `album_fotos` | `agregador_id`, `autor_original_id`, `foto_url`, `foto_type` CHECK (`foto/video/audio`), `media_title`, `xp_otorgado_autor` | `db/migrations/009_albumes.sql:46-58` |
| `album_votos` | PK `(usuario_id, foto_id)`, `xp_ganado` default 5 | `db/migrations/009_albumes.sql:64-70` |
| `usuarios.progreso_album` | JSONB (contadores anti-spam) | `db/migrations/009_albumes.sql:76-77` |
| `album_comentarios` | self-FK `parent_id`, `texto` 1-1000, `activo` (tombstone) | `db/migrations/013_album_comentarios.sql:24-33` |
| `album_comentario_votos` | PK `(usuario_id, comentario_id)` (likes, sin XP) | `db/migrations/013_album_comentarios.sql:39-44` |

Dedup natural de fotos: indice unico `(album_id, foto_url, autor_original_id)` (`db/migrations/009_albumes.sql:101-102`).

### 5.2 Endpoints

| Endpoint | Metodo | Gate / regla | XP | Linea | Estado |
|---|---|---|---|---|---|
| `albumes` | GET | Filtros `usuario_id`/`ciudad`/`album_tipo`; `orden` recientes/populares/top; limit <= 50 | - | `api/interacciones.js:2086-2122` | IMPLEMENTADO |
| `album_detalle` | GET | Album + fotos + `ya_votado` + conteo de comentarios | - | `api/interacciones.js:2125-2169` | IMPLEMENTADO |
| `galeria_destino` | GET | Fotos curadas + fotos de albumes geo-cercanos | - | `api/interacciones.js:2175-2233` | IMPLEMENTADO |
| `multimedia_mapa` | GET | UNION album_fotos + destinos_fotos; `tipo_media` CSV con 400 estricto | - | `api/interacciones.js:2268-2354` | IMPLEMENTADO |
| `mi_feed_fotos` | GET | Feed global recientes/top | - | `api/interacciones.js:2357-2380` | IMPLEMENTADO |
| `fotos_top` | GET | Cercania a destino (curaduria) | - | `api/interacciones.js:2383-2399` | IMPLEMENTADO |
| `album_crear` | POST | Nivel >= 2, max 5/mes | **+20 XP** | `api/interacciones.js:3471-3514` | IMPLEMENTADO |
| `album_agregar_foto` | POST | Max 50/album, 10/dia, dedup | **+15 XP agregador / +10 XP autor** (tope 10/dia) | `api/interacciones.js:3517-3582` | IMPLEMENTADO |
| `album_voto` | POST | Max 20/dia, no auto-voto | **+5 XP** | `api/interacciones.js:3585-3614` | SOLO BACKEND (sin UI) |
| `album_quitar_foto` | POST | Agregador o dueno del album; soft-delete | - | `api/interacciones.js:3617-3635` | IMPLEMENTADO |
| `album_editar` | POST | Solo creador | - | `api/interacciones.js:3638-3672` | IMPLEMENTADO |
| `album_eliminar` | POST | Solo creador; soft-delete | - | `api/interacciones.js:3675-3686` | IMPLEMENTADO |
| `comentario_foto` | POST | Rate-limit 30/dia; `parent_id` de la misma media | **+2 XP**, tope 20/dia | `api/interacciones.js:3839-3949` | IMPLEMENTADO |
| `comentario_eliminar` | POST | Autor, dueno del album o admin; opcion cascada solo admin | - | `api/interacciones.js:3956-4021` | IMPLEMENTADO |
| `comentario_voto` | POST | Toggle like/unlike; sin self-like | - (no XP) | `api/interacciones.js:4027-4071` | IMPLEMENTADO |
| `comentarios_foto` | GET | Arbol server-side con tombstones | - | `api/interacciones.js:2407-2509` | IMPLEMENTADO |

El tope de XP de comentarios usa `progreso_album` (no `progreso_social`): `comentarios_dia` con tope 10 comentarios/dia = 20 XP (`api/interacciones.js:3908-3924`).

### 5.3 Misiones y logros del grupo `fotos`

- **6 misiones** (`api/interacciones.js:393-478`): `mis_primera_foto_social`, `mis_creador_album`, `mis_album_curador`, `mis_fotografo_social`, `mis_cazador_recompensas`, `mis_favorito_del_pueblo`.
- **7 logros** (`api/interacciones.js:660-743`): `logr_albumero`, `logr_coleccionista_visual`, `logr_maestro_fotografo`, `logr_favorito_comunidad`, `logr_estrella_del_mapa`, `logr_guardian_historias`, `logr_viajero_multimedia`.

### 5.4 `album_voto` sin UI

`album_voto` otorga +5 XP y tiene toda la logica anti-fraude, pero **ningun frontend lo invoca** (no hay `album_voto` en `*.html`/`*.js`). La votacion de fotos de album queda inaccesible desde la web. El voto de fotos de **destino** (`tipo=foto_voto`, `api/interacciones.js:3419-3453`) si tiene logica de UI en la ficha (via `api/pagina-destino.js`).

---

## 6. Resenas y votos de utilidad

### 6.1 Resena y rating (dedup ADR-022)

- `resena` (con texto) y `rating` (voto rapido) comparten dedup: un indice unico parcial sobre `(usuario_id, destino_id)` SOLO para `tipo IN ('resena','rating')` (`db/migrations/012_interacciones_dedup_resena_rating.sql:88-90`). Las fotos quedan libres.
- El POST `resena` responde 409 `ya_reseno` si ya existe calificacion (`api/interacciones.js:4507-4521`); el POST `rating` responde 409 `ya_votado` (`api/interacciones.js:4960-4972`).
- XP base: resena corta (<= 50 chars) **+10**, resena larga **+25** (`api/interacciones.js:4543-4544`); rating **+10** (`api/interacciones.js:4974-4977`).

### 6.2 Votos de utilidad (Own the Spot / SKATE)

Esquema (migracion 007):

| Elemento | Definicion | Linea | Estado |
|---|---|---|---|
| `interacciones.votos_utiles` | Contador por resena | `db/migrations/007_milestones_v2.sql:22-27` | IMPLEMENTADO |
| `resena_votos` | PK `(usuario_id, resena_id)` (dedup del voto) | `db/migrations/007_milestones_v2.sql:29-34` | IMPLEMENTADO |
| POST `review_voto` | Inserta voto + incrementa `votos_utiles`; sin auto-voto; dedup 409; 503 si falta migracion | `api/interacciones.js:3329-3380` | SOLO BACKEND (sin boton UI) |
| GET / DERIVADO | Lider del Spot = resena con mas `votos_utiles` del destino | `api/pagina-destino.js:2447-2461`, render `:1871-1887` | IMPLEMENTADO |

Multiplicador **x1.1** de XP si el usuario es lider de algun spot en la ciudad del destino (`xpConMultiplicador`, `api/interacciones.js:891-901`; se aplica en resena/guardado/visita/rating).

No se encontro ninguna referencia a `review_voto` ni `votos_utiles` en `*.html`/`*.js`: se confirma **sin boton de UI**.

### 6.3 Gate de "voto de utilidad" nivel 5

El catalogo de niveles de `index.html:4028` (700 XP = nivel 5) lista la capacidad textual `'Mapas publicos; votos de utilidad (Own the Spot)'`. Sin embargo, el backend de `review_voto` **no valida nivel**: solo exige `usuario_id`, que no sea la propia resena y el dedup (`api/interacciones.js:3329-3380`). El gate es **solo texto**: cualquiera con sesion puede votar utilidad, sin importar su nivel.

---

## 7. Activo Oculto (crowdsourcing Wayfarer)

### 7.1 Esquema (migracion 016)

| Tabla | Definicion | Linea |
|---|---|---|
| `activos_ocultos` | `propuesto_por`, `nombre`, `lat/lng` numeric, `foto_url`, `categoria`, `ciudad`, `estado` CHECK `pendiente/aprobado/rechazado`, `votos_favor/contra >= 0`, `activo`, `resuelto_en` | `db/migrations/016_multinivel_crowdsourcing.sql:90-112` |
| `activos_ocultos_votos` | PK `(activo_id, usuario_id)`, `voto` CHECK `favor/contra` | `db/migrations/016_multinivel_crowdsourcing.sql:128-139` |
| `activos_ocultos_checkins` | `lat/lng/accuracy`, `activo`; UNIQUE parcial `(activo_id, usuario_id) WHERE activo=true` | `db/migrations/016_multinivel_crowdsourcing.sql:150-163` |
| `geo_nonces` | nonce de un solo uso, expira 2 min | `db/migrations/016_multinivel_crowdsourcing.sql:173-184` |

### 7.2 Endpoints

| Endpoint | Metodo | Gate | XP | Linea | Estado |
|---|---|---|---|---|---|
| `activo_oculto_proponer` | POST | `email_verificado=true`; coord validas; sin nivel minimo | 0 al proponer (+50 al aprobar) | `api/interacciones.js:2679-2711` | IMPLEMENTADO |
| `activos_ocultos_pendientes` | GET | Excluye las propias; estado derivado | - | `api/interacciones.js:1479-1505` | IMPLEMENTADO |
| `activo_oculto_votar` | POST | JWT + `email_verificado` + nivel >= 5 + no auto-voto + dedup PK; quorum +/-3 en la misma sentencia | **+5 XP**, tope 30 XP/dia (6 votos) | `api/interacciones.js:2717-2798` | IMPLEMENTADO |
| `activo_oculto_checkin` | POST | JWT + nonce (`geo_nonces`) + `device_hash` registrado + geocerca Haversine + cooldown 90s + tope 30/dia | **+15 XP** | `api/interacciones.js:2804-2895` | SOLO BACKEND (sin UI) |
| `activo_oculto_moderar` | POST (admin) | Bearer `ADMIN_SECRET`; aprobar (+50 XP al proponente + reparto piramidal) / rechazar | +50 proponente | `api/admin.js:403-470` | IMPLEMENTADO (UI admin `admin.html:6768-6904`) |

### 7.3 Estado derivado y quorum

- Quorum: `votos_favor - votos_contra >= 3` -> `aprobado`; `<= -3` -> `rechazado` (`api/interacciones.js:2756-2772`).
- Caducidad: sin quorum y sin votos nuevos en 30 dias, la propuesta se lee como `rechazado` en el GET (`api/interacciones.js:1488-1495`).
- El checkin reutiliza el motor de geocerca de ADR-024: radios 100/150/200/250 m, cooldown 90s, tope 30/dia (`api/interacciones.js:2838-2886`; constantes `:108-114`).

### 7.4 Gaps de Activo Oculto

| Hallazgo | Evidencia | Estado |
|---|---|---|
| **Mapa dedicado de Activos Ocultos**: no existe endpoint de mapa ni capa en `comunidad.html`. Solo hay propuestas pendientes. | No hay `activos_ocultos_mapa` en ningun archivo (grep) | SOLO DOCUMENTADO |
| **Checkin sin UI**: no hay boton/geolocalizacion para checkin de Activo Oculto en ningun frontend. | No aparece `activo_oculto_checkin` en `*.html`/`*.js` | SOLO BACKEND |
| **Verificacion de email sin UI en el hub**: `comunidad.html` muestra banner si `!email_verificado`, pero no ofrece el boton de solicitar verificacion (eso vive en `mi-perfil.html`). | `comunidad.html:1952-1955`, `:1970`; `mi-perfil.html:1730+` | ROTO/COSMETICO |

---

## 8. Facciones y competencia social

### 8.1 Esquema y reglas

`usuarios.faccion` con CHECK de 4 valores (`db/migrations/016_multinivel_crowdsourcing.sql:58-61`):

`exploradores` | `curadores` | `creadores` | `artistas`

### 8.2 Endpoints

| Endpoint | Metodo | Regla | Linea | Estado |
|---|---|---|---|---|
| `faccion_elegir` | POST `/api/usuarios` | Requiere `email_verificado`. Primera eleccion **gratis**; cambio cuesta **500 `xp_total`** + cooldown **15 dias** | `api/usuarios.js:351-397` | IMPLEMENTADO |
| `faccion_ranking` | GET `/api/usuarios` | Agregado por faccion (`miembros`, `xp_total`) + **top 3** por faccion (ROW_NUMBER) | `api/usuarios.js:311-324` | IMPLEMENTADO |

UI de eleccion/cambio: `mi-perfil.html:1857-1931` (`cargarFacciones`, `elegirFaccion`; `faccion_elegir` en `:1911`).
UI de ranking: `comunidad.html:2153-2201` (`cargarFaccionesAo`, `faccion_ranking` en `:2158`).

### 8.3 Afinidad de Parche y control territorial

Documentado en `DECISIONS.md:678` y `BLUEPRINT.md:74`:

- Afinidad de Parche a Faccion con multiplicadores **x1.3 / x1.15 / x1.0** -> **SOLO DOCUMENTADO**. No hay columna, ni consulta, ni endpoint que la calcule.
- Control territorial por ciudad (faccion con mas Activos Ocultos aprobados + checkins en 30 dias) -> **SOLO DOCUMENTADO**. No existe tabla de "dueno" ni calculo.

### 8.4 ROTO de etiqueta

La UI rotula la seccion **"Control Territorial por Facción"** (`comunidad.html:2156`, `:2164`, `:2168`, `:2198`) pero el endpoint consultado es `faccion_ranking`, que devuelve el **ranking global** por XP, no control por ciudad. La funcion muestra `facciones` y `top`, no territorios (`comunidad.html:2169-2194`). Es una **etiqueta enganosa**, no un fallo de datos.

---

## 9. Referidos / Mi Red

### 9.1 Esquema (migracion 016)

`usuarios` gana: `referido_por` (self-FK), `codigo_referido` (varchar 20, indice unico parcial), `xp_ref_total` (int), `referidos_directos_contados` (int) (`db/migrations/016_multinivel_crowdsourcing.sql:53-72`).

### 9.2 Endpoints

| Endpoint | Metodo | Regla | Linea | Estado |
|---|---|---|---|---|
| `referido_codigo` | GET `/api/usuarios` | Requiere `email_verificado`; genera codigo de 6 chars (alfabeto sin ambiguos) la primera vez | `api/usuarios.js:223-277`, alfabeto `:129-136` | IMPLEMENTADO (backend) |
| `referido_red` | GET `/api/usuarios` | CTE recursiva max 5 niveles agrupada por nivel | `api/usuarios.js:281-308` | IMPLEMENTADO (backend) |
| Registro con referido | POST `/api/usuarios` | `codigo_referido` en body o `?ref=`; solo en el brazo INSERT; topes 500 directos y 20/dia; anti-auto-referido | `api/usuarios.js:457-519` | SOLO BACKEND (no capturado por frontend) |
| Reparto | interno | FLOOR 10/5/3/2/1 % sobre `xp_ref_total`; tope `referidos_directos_contados < 500` | `api/interacciones.js:1136-1154`; copia admin `api/admin.js:44-63` | IMPLEMENTADO |

El reparto se inyecta en los **14 puntos de XP real** de `api/interacciones.js` (excluye `admin_xp` y `comprar_consumible`), segun `NEXT.md:6` y `DECISIONS.md:674`.

### 9.3 UI "Mi Red"

`mi-perfil.html:1783-1855`:

- Codigo + boton "Copiar" (`:1784-1797`).
- QR generado con `api.qrserver.com` (`:1801`, `:1806`).
- Piramide por niveles: `red.niveles` (`:1812-1824`).
- Stats: Directos, XP por red, Hoy (`:1808-1810`).
- Requiere `email_verificado`, si no muestra banner (`:1834-1839`).

### 9.4 ROTO de referidos

| Hallazgo | Evidencia |
|---|---|
| **QR apunta a `registro.html?ref=`** y `registro.html` NO existe en el repo. | `mi-perfil.html:1800`; `Test-Path registro.html` = False; no hay `scripts`/pagin. |
| **Ningun frontend captura ni envia `?ref=`**: ni `usuario-session.js` ni el login leen el parametro; el backend lo soporta pero nunca lo recibe. | grep `codigo_referido`/`?ref=` en `*.html`/`*.js` solo devuelve `mi-perfil.html:1799-1800`. |

Consecuencia: la piramide de referidos es funcional a nivel backend, pero **no hay forma de usarla desde la web** (no se puede invitar ni quedar referido). El endpoint de registro con `?ref=` es **SOLO BACKEND**.

---

## 10. Perfiles, leaderboard y descubrimiento

### 10.1 Leaderboard

- Backend: GET `/api/usuarios?tipo=leaderboard&limit=N` ordena por `xp_total DESC` (`api/usuarios.js:194-204`).
- Frontend: `cargarLeaderboard()` en `comunidad.html:1514-1526` con fallback a `MOCK_LB` (`comunidad.html:1464-1473`).
- El nivel/badge/era se derivan en lectura (`conNivel`, `api/usuarios.js:37-60`), nunca se confia en columnas persistidas.

### 10.2 Busqueda de usuarios

- Backend: GET `/api/usuarios?buscar=` o `tipo=buscar` con `ILIKE` sobre `nombre`/`email`, minimo 2 chars, limit 20 (`api/usuarios.js:205-218`).
- Frontend: **usado en admin** (`admin.html:7092-7111`). No hay buscador de usuarios en `comunidad.html`.

### 10.3 Perfil publico y vitrina publica

| Elemento | Estado |
|---|---|
| Perfil publico navegable de otro usuario (`mi-perfil.html?id=<uuid>`) | SOLO DOCUMENTADO. `mi-perfil.html` NO lee `?id=` (no hay `URLSearchParams` ni `location.search`). |
| Vitrina publica de cromos/logros de un tercero | SOLO DOCUMENTADO. |
| Vitrina de cromos propia | IMPLEMENTADO (`mi-perfil.html:1240-1267`, `tipo=mis_cromos`). |
| Museo-line (trofeos/fotos/destinos) propia | IMPLEMENTADO (`mi-perfil.html:951+`, `syncMuseoLine`; contenedor `:260`). |

**Link ROTO:** `comunidad.html:1645` enlaza el autor de un album a `/mi-perfil.html?id=<usuario_id>`, pero `mi-perfil.html` ignora el parametro y siempre muestra al usuario en sesion. El enlace no cumple su promesa.

---

## 11. Misiones y logros sociales

### 11.1 Misiones sociales (`grupo: 'general'`)

| ID | Nombre | XP | Gate / check | Linea |
|---|---|---|---|---|
| `mis_chat_mensajero` | Primer mensaje en la comunidad | 25 | `xp_total >= 250` (nivel 3); desbloquea `chat` | `api/interacciones.js:334-339` |
| `mis_chat_moderador` | Moderador de chat | 30 | `xp_total >= 450` (nivel 4); desbloquea `moderador_chat` | `api/interacciones.js:341-346` |
| `mis_chat_creador` | Creador de salas | 40 | `xp_total >= 700` (nivel 5); desbloquea `crear_chat` | `api/interacciones.js:348-353` |
| `mis_chat_activo` | Conversador activo | 20 | >= 10 mensajes en `chat_mensajes` | `api/interacciones.js:360-369` |
| `mis_plan_creador` | Creador de planes | 25 | >= 1 fila en `planes_viaje` | `api/interacciones.js:371-380` |
| `mis_plan_unido` | Viajero en grupo | 15 | >= 1 fila en `planes_miembros` | `api/interacciones.js:382-391` |

### 11.2 Logros sociales (`grupo: 'general'`)

| ID | Nombre | XP | Check | Linea |
|---|---|---|---|---|
| `logr_social_chat` | Conversador | 30 | >= 50 mensajes en `chat_mensajes` | `api/interacciones.js:824-834` |
| `logr_social_plan` | Organizador de viajes | 35 | >= 3 `planes_viaje` creados | `api/interacciones.js:836-846` |
| `logr_anfitrion` | Anfitrion de parche | 50 | un plan propio con >= 5 miembros | `api/interacciones.js:848-864` |

### 11.3 Misiones/logros de artista (relacionados a vocaciones)

Grupo `artista` (6 misiones): `mis_primera_vocacion_artista`, `mis_camino_musica`, `mis_camino_cine`, `mis_camino_arte`, `mis_camino_escritor`, `mis_poliglota_artista` (`api/interacciones.js:484-556`).

### 11.4 Ausencias confirmadas

- **No existe** grupo `'pandilla'` ni `'social'` en `MISIONES` (grep: solo `general`, `ciudad`, `categoria`, `fotos`, `artista`).
- **No existen** logros de faccion, referidos ni Activo Oculto.
- Las misiones de Parche del Plan Maestro (`mis_fundar_parche`, `mis_primer_reto_parche`, `mis_territorio_parche`) son SOLO DOCUMENTADO (`.../ExploraCO_Gamificacion_v5_Plan_Maestro.md:241`; propuesta original del v4 en `...:346-358`).

---

## 12. Notificaciones y actividad

### 12.1 Notificaciones email (admin)

- Endpoint real: POST `/api/admin?recurso=notificaciones` (`api/admin.js:281-298`), autenticado con Bearer admin o `X-Internal-Secret`.
- Tipos: `resena` y `solicitud`; envia a `ADMIN_EMAIL` via Resend (`api/admin.js:17`, `:66-100`).
- No hay UI de notificaciones: es una integracion server-to-server; la usa `api/publicar-lugar.js:212`.
- `api/admin.js:475` lista `notificaciones` entre los recursos validos.

### 12.2 ROTO: notificacion de resena

`api/interacciones.js:4618-4637` hace `fetch('/api/notificaciones')`, un endpoint que **no existe** (no hay `api/notificaciones.js`; las rutas son `/api/admin`, `/api/interacciones`, etc.; `vercel.json:5-10` no tiene rewrite a `/api/notificaciones`). El POST de resena cae en un 404 silencioso (fire & forget, `:4637`). La notificacion de resenas nuevas al admin esta **ROTA**; en cambio la de solicitudes si funciona desde `publicar-lugar.js:212`.

### 12.3 Actividad y feed

- `mi_feed_fotos`: feed multimedia global (`api/interacciones.js:2357-2380`), consumido por el tab Audiovisual (`comunidad.html:1839`).
- `comentarios_recientes`: feed de comentarios para moderacion admin (`api/interacciones.js:2238-2264`), consumido por `admin.html:6234`.
- **No existe** campana ni centro de notificaciones in-app en ningun frontend (grep `campana`/`bell`/`notificacion` en `*.html`: sin resultados relevantes).

---

## 13. Modelo de datos social (migraciones 007-016)

| Migracion | Tablas / columnas sociales | Uso |
|---|---|---|
| `007_milestones_v2.sql` | `interacciones.votos_utiles`; `resena_votos`; `usuarios.patrocinios` | Votos de utilidad (Own the Spot) |
| `008_comunidad_social.sql` | `chat_salas`, `chat_mensajes`, `planes_viaje`, `planes_miembros`; `usuarios.progreso_social` | Chat + planes + tope XP chat |
| `009_albumes.sql` | `albumes`, `album_fotos`, `album_votos`; `usuarios.progreso_album` | Media social |
| `010_gamificacion_v4.sql` | `pandillas`, `pandillas_miembros`, `pandilla_retos`; `consumibles`, `usuarios_cromos`, `cromo_intercambios` | Parches + economia |
| `012_...dedup...sql` | Indice unico parcial `idx_interacciones_dedup_resena_rating` | Dedup resena/rating |
| `013_album_comentarios.sql` | `album_comentarios`, `album_comentario_votos` | Comentarios e hilos |
| `014_reset_visitas...sql` | Purga/recalculo de visitas y `pandillas.fama_total`/`pandilla_retos` | Mantenimiento (no social puro) |
| `015_epic_prompt.sql` | `usuarios.vocaciones`; `planes_viaje.sala_id`; limpieza de salas de sistema | Chat por plan + artista |
| `016_multinivel_crowdsourcing.sql` | 10 columnas en `usuarios` (referidos, faccion, email, device); `activos_ocultos`, `activos_ocultos_votos`, `activos_ocultos_checkins`, `geo_nonces` | Referidos + Wayfarer + facciones |

Diagrama de dependencias:

```
usuarios
  |-- progreso_social   (008) --> chat_xp_dia
  |-- progreso_album    (009) --> topes albumes/votos/comentarios
  |-- capacidades       (010) --> inventario + efectos (fama_x2, etc.)
  |-- vocaciones        (015)
  |-- referido_por/codigo_referido/xp_ref_total (016)
  |-- faccion/faccion_elegida_en (016)
  |-- email_verificado/email_token (016)
  |-- device_hashes     (016)
  |
  +-- pandillas_miembros --> pandillas --> pandilla_retos
  +-- chat_salas --> chat_mensajes
  +-- planes_viaje --> planes_miembros ; planes_viaje.sala_id --> chat_salas
  +-- albumes --> album_fotos --> album_votos
  |                    +------> album_comentarios --> album_comentario_votos
  +-- interacciones --> resena_votos
  +-- activos_ocultos --> activos_ocultos_votos / activos_ocultos_checkins
  +-- geo_nonces
```

---

## 14. Economia y XP del apartado social (consolidado)

| Accion | XP | Tope / regla | Fuente |
|---|---|---|---|
| Mensaje de chat (sala) | +2 | 20 XP/dia (10 msgs), compartido con plan | `api/interacciones.js:3099-3108`, `:1161-1182` |
| Mensaje de chat de plan | +2 | idem (mismo contador `progreso_social`) | `api/interacciones.js:3298-3308` |
| Crear sala de chat | 0 | Gate nivel 5 | `api/interacciones.js:3042-3060` |
| Moderar chat | 0 | Gate nivel 4 | `api/interacciones.js:3124-3149` |
| Crear album | +20 | Nivel >= 2; max 5/mes | `api/interacciones.js:3502-3509` |
| Agregar foto a album | +15 (agregador) | Max 50/album, 10/dia | `api/interacciones.js:3556-3577` |
| Foto de otro autor | +10 (autor) | Tope 10 XP/dia | `api/interacciones.js:3562-3572` |
| Votar foto de album (`album_voto`) | +5 | Max 20/dia; **sin UI** | `api/interacciones.js:3585-3613` |
| Votar foto de destino (`foto_voto`) | +5 | Dedup, no auto-voto | `api/interacciones.js:3419-3452` |
| Subir foto de destino (`foto`) | +15 | Gate `mis_fotografo` (nivel 2) | `api/interacciones.js:3386-3412` |
| Comentar media | +2 | 20 XP/dia (10 comentarios), 30/dia sin XP | `api/interacciones.js:3908-3924` |
| Like de comentario | 0 | Toggle idempotente | `api/interacciones.js:4023-4071` |
| Resena con texto | +10 (corta) / +25 (larga) | Dedup; x1.1 lider de spot; amuleto x2 | `api/interacciones.js:4543-4544`, `:4584-4588` |
| Rating (voto rapido) | +10 | Dedup; x1.1; amuleto x2 | `api/interacciones.js:4974-4999` |
| Voto de utilidad (`review_voto`) | 0 | Sin UI | `api/interacciones.js:3329-3379` |
| Proponer Activo Oculto | 0 | Requiere email verificado | `api/interacciones.js:2679-2710` |
| Votar Activo Oculto | +5 | 30 XP/dia (6 votos); JWT+email+nivel 5 | `api/interacciones.js:2773-2797` |
| Checkin de Activo Oculto | +15 | JWT+nonce+device+geocerca; **sin UI** | `api/interacciones.js:2887-2894` |
| Activo Oculto aprobado (admin) | +50 al proponente | No re-paga si ya estaba aprobado | `api/admin.js:430-447` |
| Reto de Parche completado | `xp_bono` a cada miembro activo | Definido por fundador/oficial | `api/interacciones.js:1058-1070` |
| Fama de Parche | 10% del XP (no es XP individual) | Duplicable con `trompeta_fama` | `api/interacciones.js:1017-1023` |
| Referidos (ancestros) | 10/5/3/2/1% FLOOR de `xp_ref_total` | Topes 500 directos / 20 dia | `api/interacciones.js:1148-1152`, `api/usuarios.js:479-518` |
| Cambio de faccion | -500 `xp_total` | Cooldown 15 dias; primera gratis | `api/usuarios.js:378-396` |
| Mision `mis_chat_mensajero` | +25 | Una vez | `api/interacciones.js:334-339` |
| Mision `mis_chat_moderador` | +30 | Una vez | `api/interacciones.js:341-346` |
| Mision `mis_chat_creador` | +40 | Una vez | `api/interacciones.js:348-353` |
| Mision `mis_chat_activo` | +20 | Una vez | `api/interacciones.js:360-369` |
| Mision `mis_plan_creador` | +25 | Una vez | `api/interacciones.js:371-380` |
| Mision `mis_plan_unido` | +15 | Una vez | `api/interacciones.js:382-391` |
| Logro `logr_social_chat` | +30 | Una vez | `api/interacciones.js:824-834` |
| Logro `logr_social_plan` | +35 | Una vez | `api/interacciones.js:836-846` |
| Logro `logr_anfitrion` | +50 | Una vez | `api/interacciones.js:848-864` |

Nota: `amuleto_x2` (dobla XP de las proximas 5 acciones) aplica a resena/guardado/visita/rating, no a chat, albumes ni votos sociales (`api/interacciones.js:942-950`).

---

## 15. Estado de implementacion y gaps

### 15.1 Resumen por subsistema

| Subsistema | Estado global | Nota |
|---|---|---|
| Hub `comunidad.html` (7 tabs) | IMPLEMENTADO | Chat, Planes, Mapa, Ranking, Parches, Activo Oculto, Audiovisual |
| Parches (grupos, fama, retos) | IMPLEMENTADO con gaps | Faltan min 3, email gate, conteo, misiones |
| Chat y planes | IMPLEMENTADO | Con tope XP compartido |
| Albumes y comentarios | IMPLEMENTADO | `album_voto` sin UI |
| Resenas / rating | IMPLEMENTADO | Dedup ADR-022 |
| Voto de utilidad | SOLO BACKEND | Sin boton UI; gate nivel 5 solo texto |
| Activo Oculto (proponer/votar/admin) | IMPLEMENTADO | — |
| Activo Oculto (checkin y mapa) | SOLO BACKEND / SOLO DOCUMENTADO | Sin UI |
| Facciones (elegir + ranking) | IMPLEMENTADO | UI en `mi-perfil` y `comunidad` |
| Afinidad de Parche / control territorial | SOLO DOCUMENTADO | Roto el rotulo de la UI |
| Referidos (backend) | IMPLEMENTADO | Reparto CTE 5 niveles |
| Referidos (frontend) | ROTO | QR a `registro.html`, sin captura de `?ref=` |
| Leaderboard | IMPLEMENTADO | Fallback `MOCK_LB` |
| Busqueda de usuarios | IMPLEMENTADO en admin | No en comunidad |
| Perfil publico / vitrina publica | SOLO DOCUMENTADO | Link ROTO desde comunidad |
| Misiones/logros sociales | IMPLEMENTADO | Sin logros de faccion/referidos |
| Notificaciones email admin | IMPLEMENTADO | Solo backend |
| Notificacion de resena nueva | ROTO | `/api/notificaciones` inexistente |
| Notificaciones in-app | SOLO DOCUMENTADO | No existe |

### 15.2 Tabla de gaps con archivo:linea

| ID | Gap | Archivo:linea | Estado |
|---|---|---|---|
| G-01 | Minimo 3 miembros para fundar no validado | Plan Maestro `...:199,356` vs `api/interacciones.js:4333-4371` | SOLO DOCUMENTADO |
| G-02 | Conteo de miembros no se muestra (`miembros_actuales` vs `miembros_count`) | `api/interacciones.js:2604` vs `comunidad.html:1300-1301` | ROTO |
| G-03 | `FUNDAR PANDILLA` residual sin relabel | `mi-perfil.html:514`, `index.html:4037` | ROTO |
| G-04 | Gate de email al fundar Parche no implementado | `DECISIONS.md:607,613` vs `api/interacciones.js:4343-4348` | SOLO DOCUMENTADO |
| G-05 | `review_voto` sin boton UI | `api/interacciones.js:3329-3379` | SOLO BACKEND |
| G-06 | Gate nivel 5 de voto de utilidad solo es texto | `index.html:4028` vs `api/interacciones.js:3329` | ROTO (gate ausente) |
| G-07 | `album_voto` sin UI | `api/interacciones.js:3585-3613` | SOLO BACKEND |
| G-08 | `activo_oculto_checkin` sin UI | `api/interacciones.js:2804` | SOLO BACKEND |
| G-09 | Mapa dedicado de Activos Ocultos no existe | (ausente) | SOLO DOCUMENTADO |
| G-10 | Afinidad de Parche x1.3/x1.15/x1.0 no existe | `DECISIONS.md:678` | SOLO DOCUMENTADO |
| G-11 | Control territorial no existe; UI lo rotula | `comunidad.html:2156-2198` | SOLO DOCUMENTADO + ROTO |
| G-12 | QR de referidos apunta a `registro.html` inexistente | `mi-perfil.html:1800` | ROTO |
| G-13 | Ningun frontend captura `?ref=` | (ausente) | ROTO |
| G-14 | Perfil publico `?id=` no soportado; link desde comunidad | `comunidad.html:1645` vs `mi-perfil.html` | SOLO DOCUMENTADO + ROTO |
| G-15 | Notificacion de resena a `/api/notificaciones` inexistente | `api/interacciones.js:4618-4637` | ROTO |
| G-16 | No hay notificaciones in-app | (ausente) | SOLO DOCUMENTADO |
| G-17 | `chat_sala` real exige nivel 5, la UI de perks dice nivel 3 | `api/interacciones.js:345-352` vs `comunidad.html:650` | ROTO (etiqueta) |
| G-18 | `chat_mod` real exige nivel 4, la UI dice nivel 12 | `api/interacciones.js:341-345` vs `comunidad.html:653` | ROTO (etiqueta) |
| G-19 | `album_crear` calcula nivel con `floor(xp/100)+1`, no con la tabla de 20 niveles | `api/interacciones.js:3479` | ROTO (formula inconsistente) |
| G-20 | `pandilla.mi_rol` no viene en `pandilla_detalle` | `comunidad.html:1263` vs `api/interacciones.js:2621-2624` | ROTO (cosmetico) |
| G-21 | Misiones de Parche (`mis_fundar_parche`...) no existen | Plan Maestro `.../ExploraCO_Gamificacion_v5_Plan_Maestro.md:241` | SOLO DOCUMENTADO |
| G-22 | Sala de chat privada del grupo no existe | Plan Maestro `...:304` | SOLO DOCUMENTADO |
| G-23 | No hay flujo para rol `oficial` | `db/migrations/010:111` (CHECK) sin endpoint | SOLO DOCUMENTADO |

---

## 16. Glosario social

| Termino | Definicion | Fuente |
|---|---|---|
| **Parche** | Nombre visible de una "Pandilla": grupo de hasta 10 viajeros con fama y retos. En API/esquema sigue siendo `pandilla*`. | `comunidad.html:301`, `db/migrations/010:93` |
| **Fama** | Contador colectivo del Parche (`pandillas.fama_total`). Recibe 10% del XP de cada miembro. | `api/interacciones.js:1007-1028` |
| **Reto de Parche** | Meta colectiva con ventana temporal; al completarse reparte `xp_bono` a los miembros activos. | `api/interacciones.js:1037-1076` |
| **Activo Oculto** | Punto secreto propuesto por la comunidad (crowdsourcing Wayfarer); se aprueba por quorum de votos. | `db/migrations/016:90-112` |
| **Quorum** | Diferencia de votos `favor - contra` con umbral +/-3 que resuelve un Activo Oculto. | `api/interacciones.js:2760-2763` |
| **Faccion** | Bando del usuario (exploradores/curadores/creadores/artistas). Cambiar cuesta 500 XP + 15 dias. | `db/migrations/016:58-61`, `api/usuarios.js:378-396` |
| **Afinidad de Parche** | Multiplicador teorico x1.3/x1.15/x1.0 entre un Parche y su faccion. No implementado. | `DECISIONS.md:678` |
| **Control territorial** | Supuesta competencia por ciudad entre facciones. No implementado; la UI muestra el ranking global. | `DECISIONS.md:678`, `comunidad.html:2156` |
| **Mi Red** | Piramide de referidos de hasta 5 niveles; el ancestro recibe 10/5/3/2/1% del XP. | `api/interacciones.js:1136-1154` |
| **`xp_ref_total`** | Campo de apoyo donde se acumula el XP de red (no es una segunda moneda). | `db/migrations/016:56` |
| **Own the Spot** | Lider del Spot: autor de la resena mas votada de un destino; gana x1.1 en su ciudad. | `api/interacciones.js:891-901` |
| **Voto de utilidad** | Voto sobre una resena (`review_voto`); alimenta la metrica `votos_utiles`. | `api/interacciones.js:3329-3379` |
| **Tombstone** | Comentario eliminado logicamente que conserva sus respuestas (`activo=false`). | `api/interacciones.js:2442-2455` |
| **Capacidad** | Flag derivado de misiones que habilita una UI (`chat`, `crear_chat`, `moderador_chat`, `fundar_pandilla`...). | `api/usuarios.js:67-73`, `usuario-session.js:45-55` |
| **JWT de sesion** | Token HMAC-SHA256 que valida visita, voto de Activo Oculto y checkin. | `api/usuarios.js:115-125`, `api/interacciones.js:1086-1111` |
| **Nonce geoespacial** | Token de un solo uso (2 min) para los checkins geolocalizados. | `db/migrations/016:165-184` |

---

## Apendice A. Mapa completo de endpoints sociales

### A.1 GET `/api/interacciones` (`tipo=...`)

| `tipo` | Parametros clave | Linea |
|---|---|---|
| `geo_nonce_solicitar` | `usuario_id` | `api/interacciones.js:1462` |
| `activos_ocultos_pendientes` | `usuario_id` (o bearer admin) | `api/interacciones.js:1479` |
| `resenas` | `destino_id` | `api/interacciones.js:1508` |
| `fotos` | `destino_id`, `usuario_id` | `api/interacciones.js:1543` |
| `logros` | `usuario_id` | `api/interacciones.js:1639` |
| `misiones` | `usuario_id` | `api/interacciones.js:1683` |
| `chat_salas` | - | `api/interacciones.js:1782` |
| `chat_mensajes` | `sala_id` | `api/interacciones.js:1803` |
| `planes` | `usuario_id` | `api/interacciones.js:1823` |
| `planes_mios` | `usuario_id` | `api/interacciones.js:1839` |
| `plan_chat` | `plan_id`, `usuario_id` | `api/interacciones.js:1858` |
| `vocaciones_catalogo` | - | `api/interacciones.js:1914` |
| `vocaciones_usuario` | `usuario_id` | `api/interacciones.js:1919` |
| `tabla_destino` | `usuario_id` (incluye sendero Pandilla) | `api/interacciones.js:1939` |
| `albumes` | `usuario_id`/`ciudad`/`album_tipo`/`orden`/`limit`/`offset` | `api/interacciones.js:2086` |
| `album_detalle` | `album_id`, `usuario_id` | `api/interacciones.js:2125` |
| `galeria_destino` | `slug` o `destino_id` | `api/interacciones.js:2175` |
| `comentarios_recientes` | bearer admin, `limit`, `offset` | `api/interacciones.js:2238` |
| `multimedia_mapa` | `tipo_media` CSV, `ciudad`, `origen` | `api/interacciones.js:2268` |
| `mi_feed_fotos` | `orden`, `limit`, `offset` | `api/interacciones.js:2357` |
| `fotos_top` | `destino_id` | `api/interacciones.js:2383` |
| `comentarios_foto` | `foto_id`, `usuario_id` | `api/interacciones.js:2407` |
| `consumibles` | - | `api/interacciones.js:2519` |
| `inventario` | `usuario_id` | `api/interacciones.js:2532` |
| `mis_cromos` | `usuario_id` | `api/interacciones.js:2571` |
| `pandilla_detalle` | `pandilla_id` o `usuario_id` | `api/interacciones.js:2590` |
| `pandilla_reto` | `pandilla_id` | `api/interacciones.js:2650` |

### A.2 POST `/api/interacciones` (`tipo` en body)

| `tipo` | Linea |
|---|---|
| `activo_oculto_proponer` | `api/interacciones.js:2679` |
| `activo_oculto_votar` | `api/interacciones.js:2717` |
| `activo_oculto_checkin` | `api/interacciones.js:2804` |
| `chat_sala` | `api/interacciones.js:3042` |
| `chat_msg` | `api/interacciones.js:3065` |
| `chat_mod` | `api/interacciones.js:3124` |
| `plan_crear` | `api/interacciones.js:3153` |
| `plan_unirse` | `api/interacciones.js:3203` |
| `plan_salir` | `api/interacciones.js:3238` |
| `plan_chat_msg` | `api/interacciones.js:3256` |
| `review_voto` | `api/interacciones.js:3329` |
| `foto` | `api/interacciones.js:3386` |
| `foto_voto` | `api/interacciones.js:3419` |
| `album_crear` | `api/interacciones.js:3471` |
| `album_agregar_foto` | `api/interacciones.js:3517` |
| `album_voto` | `api/interacciones.js:3585` |
| `album_quitar_foto` | `api/interacciones.js:3617` |
| `album_editar` | `api/interacciones.js:3638` |
| `album_eliminar` | `api/interacciones.js:3675` |
| `admin_foto_top` | `api/interacciones.js:3689` |
| `admin_moderar_foto_album` | `api/interacciones.js:3708` |
| `admin_xp` | `api/interacciones.js:3733` |
| `vocacion_activar` | `api/interacciones.js:3802` |
| `comentario_foto` | `api/interacciones.js:3839` |
| `comentario_eliminar` | `api/interacciones.js:3956` |
| `comentario_voto` | `api/interacciones.js:4027` |
| `comprar_consumible` | `api/interacciones.js:4081` |
| `usar_consumible` | `api/interacciones.js:4141` |
| `cromo_obtener` | `api/interacciones.js:4251` |
| `cromo_intercambio` | `api/interacciones.js:4261` |
| `pandilla_crear` | `api/interacciones.js:4333` |
| `pandilla_unirse` | `api/interacciones.js:4374` |
| `pandilla_salir` | `api/interacciones.js:4431` |
| `pandilla_reto` | `api/interacciones.js:4446` |
| `resena` | `api/interacciones.js:4496` |
| `guardado` | `api/interacciones.js:4645` |
| `quitar_guardado` | `api/interacciones.js:4705` |
| `visita` | `api/interacciones.js:4725` |
| `quitar_visita` | `api/interacciones.js:4938` |
| `rating` | `api/interacciones.js:4950` |

### A.3 `/api/usuarios`

| Verbo | Parametro / `tipo` | Linea |
|---|---|---|
| GET | `tipo=leaderboard` | `api/usuarios.js:194` |
| GET | `tipo=buscar` o `buscar=` | `api/usuarios.js:205` |
| GET | `tipo=referido_codigo` | `api/usuarios.js:223` |
| GET | `tipo=referido_red` | `api/usuarios.js:281` |
| GET | `tipo=faccion_ranking` | `api/usuarios.js:311` |
| GET | `tipo=email_verificar_confirmar` | `api/usuarios.js:328` |
| GET | `id=` (perfil crudo) | `api/usuarios.js:332` |
| POST | `tipo=faccion_elegir` | `api/usuarios.js:351` |
| POST | `tipo=email_verificar_solicitar` | `api/usuarios.js:404` |
| POST | `tipo=email_verificar_confirmar` | `api/usuarios.js:443` |
| POST | upsert de registro (+ `?ref=`) | `api/usuarios.js:447-548` |

### A.4 `/api/admin`

| Recurso / `tipo` | Metodo | Linea |
|---|---|---|
| `recurso=notificaciones` | POST | `api/admin.js:282` |
| `recurso=consumibles` (`tipo=consumibles_lista/crear/editar/toggle`) | GET/POST | `api/admin.js:307-395` |
| `recurso=activos_ocultos` (`tipo=activo_oculto_moderar`) | POST | `api/admin.js:403-470` |

### A.5 Otros

| Endpoint | Linea |
|---|---|
| GET `tipo=comentarios_recientes` (moderacion desde admin) | `api/interacciones.js:2238` |
| POST `/api/admin?recurso=notificaciones` desde `publicar-lugar.js` | `api/publicar-lugar.js:212` |
| POST `/api/notificaciones` (ROTO, inexistente) desde resena | `api/interacciones.js:4618-4637` |

---

## Apendice B. Discrepancias entre codigo y documentacion previa

| ID | Documento previo dice | El codigo real hace | Evidencia |
|---|---|---|---|
| D-01 | `comunidad.html` tiene 3 tabs reales: Chat, Planes, Ranking. | Tiene 7 tabs: + Mapa, Parches, Activo Oculto, Audiovisual. | `GUIA_DE_DESARROLLO.md:900-903` vs `comunidad.html:296-304` |
| D-02 | `pandilla_crear` exige "min. 3 miembros". | Solo valida nivel 14 y max 1 activa; no valida minimo. | Plan Maestro `...:199,356` vs `api/interacciones.js:4333-4361` |
| D-03 | ADR-025 exige email verificado para fundar Parche. | No implementado; solo XP. | `DECISIONS.md:607,613` vs `api/interacciones.js:4343-4348` |
| D-04 | Existen misiones de Parche (`mis_fundar_parche`, +50 XP, etc.). | No existen; no hay grupo `pandilla`. | Plan Maestro `.../ExploraCO_Gamificacion_v5_Plan_Maestro.md:241` vs `api/interacciones.js:214-556` |
| D-05 | Afinidad de Parche (x1.3/x1.15/x1.0) y control territorial existen como calculos en consulta. | No hay codigo que los calcule. | `DECISIONS.md:678`, `BLUEPRINT.md:74` vs grep de `x1.3`/`territorial` en `api/` |
| D-06 | UI de capacidades de chat: crear sala nivel 3, moderar nivel 12. | Backend exige nivel 5 (crear) y nivel 4 (moderar). | `comunidad.html:648-654` vs `api/interacciones.js:334-353` |
| D-07 | `GUIA_DE_DESARROLLO.md` cita `interacciones.js` en L772-896 para resena y L2356 para foto. | Hoy resena esta en L4496 y foto en L3386. | `GUIA_DE_DESARROLLO.md:833` vs `api/interacciones.js:4496` (deriva de lineas; ADR-006) |
| D-08 | La notificacion de resena nueva al admin funciona via `/api/notificaciones`. | Ese endpoint no existe; el real es `/api/admin?recurso=notificaciones`. | `api/interacciones.js:4618-4637` vs `api/admin.js:282`, `vercel.json:5-10` |
| D-09 | Registro con `?ref=<codigo>` operativo (citado como logro en TSK-101). | El backend lo soporta, pero no existe `registro.html` ni captura del parametro en el frontend. | `PROJECT.md:74`, `NEXT.md:6`, `TASKS.md:2518` vs `mi-perfil.html:1800` y ausencia de `registro.html` |
| D-10 | `review_voto` es una capacidad de nivel 5 (Own the Spot). | No valida nivel en el backend; el gate solo figura en el texto de `index.html:4028`. | `index.html:4028` vs `api/interacciones.js:3329-3380` |
| D-11 | La seccion de facciones del hub es "Control Territorial". | Consulta `faccion_ranking` (ranking global por XP), no territorio. | `comunidad.html:2156-2198` vs `api/usuarios.js:311-324` |
| D-12 | `album_voto` deberia integrarse en la galeria/album. | Endpoint completo pero sin ningun frontend que lo llame. | `api/interacciones.js:3585` vs grep `album_voto` en `*.html`/`*.js` |
| D-13 | Checkin de Activo Oculto es parte del flujo Wayfarer. | Backend completo, sin UI. | `api/interacciones.js:2804` vs ausencia en `*.html` |
| D-14 | Perfil publico navegable y vitrina publica. | No implementados; el link `/mi-perfil.html?id=` no lee el parametro. | `comunidad.html:1645` vs ausencia de `URLSearchParams` en `mi-perfil.html` |
| D-15 | `album_crear` valida nivel con la tabla de 20 niveles. | Usa `Math.floor(xp_total / 100) + 1`, formula distinta a `NIVELES`. | `api/interacciones.js:3479` vs `api/usuarios.js:14-35` |

---

*Fin del documento. Fuente de verdad: los archivos del repositorio citados linea a linea (ADR-006). Ante cualquier discrepancia, prevalece el archivo real.*
