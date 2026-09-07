# Especificacion de diseno - Milestones v2: Plan Maestro de Gaming (Steam + SKATE + Albion)

**Fecha:** 2026-09-07
**Estado:** Implementado en repo (pendiente migracion 007 en Neon + deploy)
**ADR:** ADR-014 (referenciado como "ADR-013" en comentarios del codigo;
ver DECISIONS.md para la nota de numeracion)
**Tareas:** TASKS.md TSK-080
**Spec/prompt origen:** `prompt gsming.txt` (respuestas de Javier: bajo demanda,
mapa de nodos SVG, patrocinios opcion abierta)

## Objetivo

Integrar las filosofias de juego de Steam (logros con rareza global), SKATE
("Own the Spot": lider de destino con multiplicador de XP) y Albion Online
("Tabla de Destino": tres senderos de fama por especializacion) sobre el motor
de XP/misiones/logros existente. Ampliar los niveles de 6 a 15 rangos en 3
Eras, agregar 3 misiones y 3 logros nuevos, y dejar la capa de "Patrocinios"
(SKATE) disenada pero SIN activacion (opcion abierta).

## Contexto (lo que ya existia)

- `api/interacciones.js` v5: misiones (7), logros (16, ADR-012), XP por accion
  (resena/guardado/visita/rating), dedup de voto (ADR-007), merge JSONB `||`
  (ADR-003), GET `tipo=logros` con rareza global %.
- `api/usuarios.js`: niveles (6) con badge, `calcularNivel`.
- `index.html` / `mi-perfil.html` / `comunidad.html`: `XP_LEVELS` (6) y
  `XP_BADGES` (12) duplicados en los 3 archivos.
- Presupuesto Vercel Hobby: 8 funciones serverless en uso, sin endpoints
  nuevos (todo vive en `api/interacciones.js` / `api/usuarios.js` /
  `api/pagina-destino.js`).

## Decisiones de diseno

### Bloque 1 - Niveles 6 -> 15 (3 Eras)

Umbrales del prompt gsming: 0/100/250/450/700/1000/1400/1900/2500/3200/
4000/5000/6500/8500/11000 XP.

- ERA I Mundano (1-5): Viajero Novato, Explorador de Barrio, Mochilero
  Autonomo, Cazador de Senderos, Local Consagrado.
- ERA II Patrocinado (6-10): Viajero Patrocinado, Critico de la Calle,
  Cartografo de Rutas, Embajador de Ciudad, Influenciador Local.
- ERA III Organizador (11-15): Organizador de Eventos, Protector del
  Patrimonio, Dueno de la Escena, Leyenda de Territorio, Maestro ExploraCO
  (11000 XP).

Sincronizados en 4 lugares: `api/usuarios.js` (NIVELES) e `index.html`,
`mi-perfil.html`, `comunidad.html` (XP_LEVELS). `XP_BADGES` pierde los 5
badges "muertos" (caribe/andino/compartido/plan_maestro/social) en los 3
HTML porque dependian de datos locales ya eliminados con el modulo social.

### Bloque 2 - Tabla de Destino (Albion) como mapa de nodos SVG

GET `tipo=tabla_destino&usuario_id=` dentro de `api/interacciones.js`
(0 funciones nuevas): tres senderos paralelos con "fama" derivada de las
acciones reales (columna `xp_ganado` de interacciones + mapas tematicos):

| Sendero | Fama derivada | Nivel por lectura |
|---|---|---|
| Explorador | SUM(xp_ganado) de guardados+visitas | FAMA_TIERS |
| Critico | SUM(xp_ganado) de resenas+ratings | FAMA_TIERS |
| Organizador | mapas*40 + destinos_en_mapas*5 | FAMA_TIERS |

FAMA_TIERS = Semilla(0)/Aprendiz(100)/Practicante(250)/Especialista(450)/
Maestro(700); el nivel del sendero se deriva en cada lectura, nunca se
persiste. `patrocinios` llega SIEMPRE `[]` (opcion abierta, ver Bloque 5).

Visualizacion en `mi-perfil.html`: seccion "Tabla de Destino" con arbol de
nodos SVG ligero (respuesta de Javier #2), consumida por
`cargarTablaDestino()`. De paso se corrigieron en mi-perfil.html:
`rareza_global` -> `rareza_pct` (nombre real del backend) y el contador de
trofeos desbloqueados/total (ahora `desbloqueados`/total del GET logros).

### Bloque 3 - Own the Spot (SKATE) bajo demanda + multiplicador x1.1

Respuesta de Javier #1: el lider del spot se calcula BAJO DEMANDA con un
SELECT+COUNT al cargar la pagina del destino (sin tarea programada).

- `api/pagina-destino.js`: query `spotLider` (autor de la resena con
  `votos_utiles` maximo del destino, `ORDER BY votos_utiles DESC,
  creado_en ASC`) envuelta en try/catch que degrada a `null` si la
  migracion 007 no corrio. Bloque HTML "Lider del spot" en `secResenas`
  (solo `categoria_slug != 'blog'`): nombre, estrellas, texto, "N votos
  utiles" y hint "x1.1 XP en esta ciudad". Firma `buildHTML(d, det, fotos,
  resenas, autor, relacionados, dimsAvg, spotLider)` con 8vo parametro
  opcional.
- `api/interacciones.js`: helper `esLiderDeCiudad(sql, usuarioId, ciudad)`
  (reusa el patron de MAX(votos_utiles) por destino + ciudad normalizada
  TRANSLATE/LOWER; catch -> false) y `xpConMultiplicador(sql, usuarioId,
  destinoId, xpBase)` que aplica `Math.round(xpBase * 1.1)` si el usuario
  es lider en la ciudad del destino. Se aplica sobre la XP BASE en los 4
  POST: resena, guardado, visita y rating.

### Bloque 4 - Nuevas misiones y logros (Steam/SKATE/Albion)

3 misiones nuevas en el catalogo MISIONES (DAG via `requiere`):

| id | nombre | xp | condicion |
|---|---|---|---|
| mis_own_spot_bogota | Dueno del Spot en Bogota | 75 | esLiderDeCiudad('Bogota'); requiere mis_organizador_bogota + mis_primera_resena |
| mis_gran_arquitecto | Gran Arquitecto | 50 | 1 mapa publico con >= 5 destinos (tabla mapas/mapa_destinos) |
| mis_itinerario_perfeccion | Itinerario en perfecto orden | 60 | 4+ visitas a destinos con tags.itinerario (condicion pragmatica aprobada); requiere mis_primera_visita |

3 logros nuevos en el catalogo LOGROS (total 16 -> 19):

| id | nombre | tier | xp | check |
|---|---|---|---|---|
| logr_spot_domado | (SKATE) | oro | 50 | resena numero 1 por votos en un destino (usa ctx.sql + ctx.usuarioId) |
| logr_especialista_gastro | (Albion) | plata | 40 | resenas de categoria comida (ctx.sql cuenta n_comida) |
| logr_cazador_rarezas | (Steam) | platino | 100 | desbloquear un trofeo con rareza global < 5% (ctx.rarezaGlobal + ctx.progresoLogros) |

### Bloque 5 - Patrocinios (SKATE) con opcion abierta

Respuesta de Javier #3: solo diseno, sin activacion. La columna
`usuarios.patrocinios jsonb` queda creada en la migracion 007 como
placeholder; GET `tabla_destino` devuelve `patrocinios: []`; ninguna UI
los activa. Cuando se active, el codigo ya tiene donde persistir.

## Cambios por archivo

- `api/interacciones.js` (v6): header + migracion acumulativa 007;
  `esLiderDeCiudad`/`xpConMultiplicador` (x1.1 en los 4 POST); MISIONES
  +3; LOGROS +3 (19 total); GET `tipo=tabla_destino` (3 senderos +
  patrocinios:[]); POST `tipo=review_voto` (dedup PK usuario_id+
  resena_id -> 409, 403 self-vote, 404 resena inexistente, 503 si la
  migracion 007 no corrio -- escritura nunca silenciosa).
- `api/usuarios.js`: NIVELES 6->15 con umbrales del prompt (3 Eras).
- `api/pagina-destino.js`: query `spotLider` bajo demanda (try/catch ->
  null), bloque "Lider del spot" en secResenas (no blog), 8vo parametro
  opcional en `buildHTML`.
- `index.html`, `mi-perfil.html`, `comunidad.html`: XP_LEVELS 15;
  XP_BADGES sin los 5 muertos (caribe/andino/compartido/plan_maestro/
  social); mi-perfil anade seccion "Tabla de Destino" con SVG y corrige
  `rareza_global` -> `rareza_pct` y contador desbloqueados/total (19).
- `db/migrations/007_milestones_v2.sql` (nuevo): `interacciones.votos_utiles`
  + indice parcial `idx_interacciones_votos_destino`, tabla `resena_votos`
  (PK usuario_id+resena_id), `usuarios.patrocinios jsonb`. Idempotente
  (IF NOT EXISTS, patron de 006_mapas.sql). PENDIENTE de aplicar en Neon.
- `scripts/smoke_test_milestones_v2.js` (nuevo): smoke dedicado.
- `scripts/test_logros_catalogo.js` (actualizado): 19 trofeos.

## Verificacion

- `scripts/smoke_test_milestones_v2.js`: 28 checks PASS (NIVELES 15,
  umbrales, tabla_destino 3 senderos + fama organizador, patrocinios [],
  review_voto 400 sin usuario, Own the Spot degrada a false sin migracion
  007, bloque Lider del spot con/sin lider y sin blog, balance de divs
  95/95).
- `scripts/test_logros_catalogo.js`: 12/12 PASS (19 trofeos, ids unicos,
  shape, tiers, DAG, Promise, CIUDAD_NORM, 5 ciudades).
- Escudo GOLD: `node --check` 5/5; ASCII-safety 0 bytes >127 en api/*.js
  (1 doble-escape preexistente confirmado en pagina-destino.js:1791, NO de
  esta tarea); smokes 4/4.
- QA-auditor: veredicto RECOMENDACION. H-1 (self-vote 403) y H-2 (escritura
  silenciosa -> 503) YA corregidos en el codigo; H-3 (contador 16 -> total)
  corregido en mi-perfil.html; H-4 (GUIA_DE_DESARROLLO.md seccion 7.7)
  corregido.

## Pendiente

- Aplicar `db/migrations/007_milestones_v2.sql` en Neon (lo ejecuta Javier
  en la consola) ANTES del deploy: sin ella, review_voto responde 503,
  spotLider degrada a null y el x1.1 nunca se aplica.
- Commit + push y deploy de Vercel.
- Verificacion en vivo tras deploy: GET tabla_destino, POST review_voto
  y bloque "Lider del spot" en una ficha real.