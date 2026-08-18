# Especificacion de diseno - Sistema de logros/trofeos (Fase 8)

**Fecha:** 2026-08-18
**Estado:** Implementado en repo (pendiente deploy + migracion Neon)
**ADR:** ADR-012
**Tareas:** TASKS.md TSK-055, TSK-056, TASK-020

## Objetivo

Darle a ExploraCO una capa de "gaming" de consola sobre el motor de XP/misiones
existente: trofeos desbloqueables con tier, rareza global (%) y fecha de
desbloqueo, mas coleccion de "propiedades" por ciudad estilo Upland. En paralelo,
habilitar el voto rapido (1-5 estrellas, +10 XP) en las paginas de blog para que
los articulos alimenten la progresion y muestren rating publico.

## Contexto (lo que ya existia)

- `api/interacciones.js` v4: misiones (6), XP por accion (resena, guardado,
  visita, rating), dedup de voto (ADR-007), merge JSONB `||` (ADR-003),
  evaluacion server-side por POST.
- `api/usuarios.js`: niveles (6), badge, `conNivel`/`conMisiones`.
- Voto rapido `#qr-stars` SOLO en categorias != blog (suprimido con
  `esBlogRes ? '' : '<div id="qrwrap">'`).
- Presupuesto Vercel Hobby: 8 funciones serverless en uso, sin endpoints nuevos.

## Decisiones de diseno

1. **Catalogo LOGROS paralelo a MISIONES** (no extension): mismo patron
   (codigo estatico, DAG `requiere`, check server-side, merge `||`) pero shape
   de consola (`tier`, `xp`, fecha). Nueva columna `usuarios.progreso_logros
   jsonb` (migracion 005, ADR-008).
2. **GET `tipo=logros` dentro de interacciones.js**: 0 funciones nuevas;
   devuelve catalogo + estado por usuario + rareza global % con una sola query
   agregada (`jsonb_object_keys`).
3. **Coleccion por ciudad** con `destinos.ciudad` normalizado (TRANSLATE sin
   tildes + LOWER) porque Neon convive 'Bogota' y 'Bogota-con-tilde'.
4. **Rareza estilo Steam**: % de usuarios activos con el logro.
5. **Voto rapido en blogs**: mismas reglas (dedup 409, +10 XP, requiere sesion),
   copy y contador adaptados.

## Catalogo LOGROS (16)

| id | nombre | tier | xp | check |
|---|---|---|---|---|
| logr_primer_voto | Primera calificacion | bronce | 10 | 1 rating |
| logr_critico_10 | Critico | plata | 25 | 10 rating (req primer_voto) |
| logr_critico_25 | Critico experto | oro | 50 | 25 rating (req critico_10) |
| logr_opinion_blog | Lector critico | bronce | 10 | 1 resena en blog |
| logr_votos_blog_5 | Bibliotecario | plata | 25 | 5 votos en blog (req opinion_blog) |
| logr_votos_blog_10 | Curador de historias | oro | 50 | 10 votos en blog (req votos_blog_5) |
| logr_coleccionista_10 | Coleccionista | bronce | 15 | 10 guardados |
| logr_coleccionista_50 | Magnate del mapa | oro | 75 | 50 guardados (req coleccionista_10) |
| logr_ciudades_5 | Viajero multiciudad | plata | 30 | 5 ciudades distintas (req coleccionista_10) |
| logr_visitas_5 | Senderista | bronce | 15 | 5 visitas |
| logr_visitas_20 | Nomada | oro | 50 | 20 visitas (req visitas_5) |
| logr_ciudad_bogota | Alcalde de Bogota | platino | 100 | 12 guardados en Bogota (req coleccionista_10) |
| logr_ciudad_cartagena | Conquistador de Cartagena | oro | 75 | 8 guardados en Cartagena |
| logr_ciudad_medellin | Conquistador de Medellin | oro | 75 | 8 guardados en Medellin |
| logr_ciudad_santa_marta | Senor de Santa Marta | plata | 40 | 6 guardados en Santa Marta |
| logr_ciudad_cali | Cali es Colombia | plata | 40 | 6 guardados en Cali |

Los 5 logros de ciudad se generan desde `CIUDADES_COLECCION`
(id, ciudad, n, nombre, emoji, tier, xp).

## Flujo de evaluacion

`evaluarLogros(sql, usuarioId)` corre en cada POST de XP (resena, guardado,
visita, rating):
1. Agregados memoizados en un `ctx` (totalVotos, blogVotos, blogOpiniones,
   ciudadesDistintas, guardadosCiudad) para no lanzar una query por trofeo.
2. Por cada logro: si ya esta en `progreso_logros` se omite; si `requiere` no
   esta cumplido se omite; si `check(ctx)` es true, se desbloquea (fecha + xp).
3. Merge `||` del progreso (ADR-003), suma de XP de logros a `xp_total`.
4. Respuesta del POST incluye `logros` (array de nuevos trofeos).

GET `tipo=logros&usuario_id=`:
- Catalogo completo con `estado` (desbloqueado/pendiente/borrado), `en` (fecha),
  `tier`, `requiere`, `xp` y `rareza_pct`.
- Resumen `desbloqueados`/`total`.

## Cambios por archivo

- `api/interacciones.js` (v5): header + migracion, TRANSLATE_CIUDAD,
  CIUDADES_COLECCION, LOGROS, evaluarLogros, GET tipo=logros, `logros` en
  respuestas (y `[]` en early returns).
- `db/migrations/005_usuarios_progreso_logros.sql` (nuevo).
- `api/usuarios.js`: conLogros -> `total_logros`.
- `usuario-session.js`: sumaLogrosXp/mostrarLogrosToast en 4 acciones.
- `api/pagina-destino.js`: widget de voto en todas las categorias, copy y
  contador condicional por categoria.
- `index.html`: seccion Trofeos en Perfil (grilla tier/rareza/barra X/Y) +
  badge de rating en Inspirate.
- `api/utilidades.js`: blog-lista con rating/total_resenas + badge.

## Verificacion

- `scripts/test_logros_catalogo.js`: 12/12 (16 ids unicos, shape, tiers, DAG,
  Promises, TRANSLATE/COALESCE, 5 ciudades, generados en catalogo).
- `scripts/smoke_test_blog_voto.js`: 14/14 (widget en blog y sitio, copy,
  contador, sin IDs duplicados, degradacion nRes=0, balance divs 42/42).
- `node --check` en los 5 JS + inline de index.html; ASCII-safe en serverless.

## Pendiente

- Migracion 005 en Neon (TASK-020) ANTES del deploy.
- Deploy + verificacion en prod.
