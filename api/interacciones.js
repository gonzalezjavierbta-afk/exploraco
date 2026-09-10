// api/interacciones.js  v8 - motor de misiones + logros + Tabla de Destino + Albums fotograficos
// (ASCII-safe: 0 backticks, 0 no-ASCII)
// interacciones columnas: rating (no puntuacion), creado_en (no created_at)
// tipo CHECK: resena, guardado, visita, foto, rating
// rating CHECK: 1-5
// usuario_nombre NO existe - se guarda en texto como prefijo
//
// v7 (fix perfil): los GET tipo=logros/tipo=misiones ejecutan ahora un
// backfill retroactivo (evaluarLogros/evaluarMisiones) ANTES de leer el
// progreso persistido, para registrar logros/misiones ya alcanzados que
// quedaron sin persistir (antes solo se evaluaban en los 4 POST de XP:
// resena/guardado/visita/rating). Nuevo GET tipo=misiones (catalogo +
// estado/fecha). La respuesta de ambos comparte entregarCatalogo().
//
// v8 (Albums ADR-017): +6 misiones, +7 logros, +5 GET (albumes, album_detalle,
//   multimedia_mapa, mi_feed_fotos, fotos_top), +8 POST (album_crear,
//   album_agregar_foto, album_voto, album_quitar_foto, album_editar,
//   album_eliminar, admin_foto_top, admin_moderar_foto_album).
//   Requiere migracion 009_albumes.sql antes de desplegar.
//
// REQUIERE MIGRACION ANTES DE DESPLEGAR (acumulativa desde v4):
//   ALTER TABLE interacciones
//     ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
//   ALTER TABLE usuarios
//     ADD COLUMN IF NOT EXISTS progreso_misiones jsonb NOT NULL DEFAULT '{}'::jsonb;
//   ALTER TABLE usuarios
//     ADD COLUMN IF NOT EXISTS progreso_logros jsonb NOT NULL DEFAULT '{}'::jsonb;
//   -- v6 (Milestones v2, db/migrations/007_milestones_v2.sql):
//   ALTER TABLE interacciones
//     ADD COLUMN IF NOT EXISTS votos_utiles integer NOT NULL DEFAULT 0;
//   CREATE TABLE IF NOT EXISTS resena_votos (...);
//   ALTER TABLE usuarios
//     ADD COLUMN IF NOT EXISTS patrocinios jsonb NOT NULL DEFAULT '{}'::jsonb;
//
// v3: cierra 3 vectores de fraude de XP encontrados en v2:
//  1) 'visita' ahora requiere usuario_id y se deduplica (antes: XP
//     infinito con solo repetir el POST).
//  2) 'guardado'/'quitar_guardado' ahora usan la columna 'activo' en vez
//     de DELETE (Cero Borrado Logico). Antes: ciclo guardar/quitar/
//     guardar otorgaba XP sin limite.
//  3) 'resena' ahora deduplica por usuario_id+destino_id cuando hay
//     usuario_id (antes: resenas repetidas del mismo usuario sumaban XP
//     sin limite y distorsionaban el rating promedio del destino).
//
// v4: motor de misiones. El catalogo (MISIONES, mas abajo) es codigo
// estatico, no una fila JSONB editable por request: la evaluacion de
// dependencias (DAG via 'requiere') y de cada condicion corre siempre en
// servidor, nunca se le confia al cliente. El progreso POR USUARIO si
// vive en Neon (usuarios.progreso_misiones), fusionado con el operador
// '||' (Reglas de Oro punto 3 / ADR-003), nunca reemplazado. No se creo
// un endpoint nuevo (el presupuesto de 8 funciones de Vercel Hobby ya
// esta consumido, ver BLUEPRINT.md): evaluarMisiones() corre dentro de
// esta misma invocacion, justo despues de que 'resena'/'guardado'/
// 'visita' ya hayan sumado su XP base.
//
// v5: catalogo LOGROS estilo consola (tier bronce/plata/oro/platino +
// rareza % tipo Steam) y coleccion por ciudad estilo Upland. Mismo
// patron que MISIONES: codigo estatico, DAG via 'requiere', progreso en
// usuarios.progreso_logros (merge '||'), evaluacion server-side dentro
// de esta invocacion (evaluarLogros), sin endpoint nuevo. El GET
// tipo=logros devuelve el catalogo completo con estado/fecha/tier y la
// rareza global calculada con jsonb_object_keys sobre usuarios activos.
// Los nombres de ciudad se comparan NORMALIZADOS (sin tildes) porque en
// Neon conviven 'Bogota' y 'Bogot\u00e1' segun el seed.

const { neon } = require('@neondatabase/serverless');

// -- Catalogo de misiones (Fase 3) ---------------------------------
// requiere: ids de misiones que deben estar 'completada' antes de que
// esta se evalue siquiera (evita gastar consultas de mas). check()
// recibe el contexto ya cargado (ctx) y devuelve una Promise<boolean>.
var CIUDAD_META    = 'Bogota';
var TAG_COWORKING  = 'coworking'; // enum cerrado v1: unico valor soportado hoy;
                                   // pendiente extenderlo cuando el admin
                                   // deje de aceptar texto libre en tags

var MISIONES = [
  {
    id: 'mis_primer_guardado', grupo: 'general', requiere: [],
    nombre: 'Primer lugar guardado', xp: 15,
    check: function(ctx) { return Promise.resolve(ctx.totalGuardados >= 1); },
  },
  {
    id: 'mis_primera_resena', grupo: 'general', requiere: [],
    nombre: 'Primera rese\u00f1a sustancial', xp: 20,
    check: function(ctx) {
      return ctx.sql(
        'SELECT id FROM interacciones WHERE usuario_id=$1 AND tipo=\'resena\' AND xp_ganado>=25 LIMIT 1',
        [ctx.usuarioId]
      ).then(function(r){ return r.length > 0; });
    },
  },
  {
    id: 'mis_primera_visita', grupo: 'general', requiere: [],
    nombre: 'Primera visita confirmada', xp: 15,
    check: function(ctx) { return Promise.resolve(ctx.totalVisitas >= 1); },
  },
  {
    id: 'mis_explorador_bogota', grupo: 'ciudad', requiere: ['mis_primer_guardado'],
    nombre: 'Explorador de Bogota', xp: 40,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'guardado\' AND i.activo=true AND d.ciudad=$2',
        [ctx.usuarioId, CIUDAD_META]
      ).then(function(r){ return !!(r[0] && r[0].n >= 5); });
    },
  },
  {
    // Requiere amplitud (guardar + resenar), no solo volumen -- ver nota
    // de entrega sobre la curva de dificultad Explorador -> Organizador.
    id: 'mis_organizador_bogota', grupo: 'ciudad',
    requiere: ['mis_explorador_bogota', 'mis_primera_resena'],
    nombre: 'Organizador de Bogota', xp: 100, desbloquea: 'organizar_actividad',
    check: function(ctx) {
      if (ctx.xpTotal < 300) return Promise.resolve(false);
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'guardado\' AND i.activo=true AND d.ciudad=$2',
        [ctx.usuarioId, CIUDAD_META]
      ).then(function(r){ return !!(r[0] && r[0].n >= 8); });
    },
  },
  {
    id: 'mis_nomada_digital', grupo: 'categoria', requiere: ['mis_primer_guardado'],
    nombre: 'N\u00f3mada digital', xp: 30,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'guardado\' AND i.activo=true'
        + '   AND d.categoria_slug=\'hostal\''
        + '   AND (d.tags->\'actividades\' ? $2 OR d.tags->\'que_incluye\' ? $2)',
        [ctx.usuarioId, TAG_COWORKING]
      ).then(function(r){ return !!(r[0] && r[0].n >= 3); });
    },
  },
  {
    // Milestones v2 (ADR-014): Own the Spot estilo SKATE. Convierte una
    // resena en Bogota en la mas votada de su spot (votos_utiles maximo
    // del destino). Recompensa +75 XP (prompt gsming) y deriva el badge
    // "Gobernador de Monserrate" (ver LOGROS logr_spot_domado).
    id: 'mis_own_spot_bogota', grupo: 'ciudad',
    requiere: ['mis_organizador_bogota', 'mis_primera_resena'],
    nombre: 'Dueno del Spot en Bogota', xp: 75,
    check: function(ctx) {
      return esLiderDeCiudad(ctx.sql, ctx.usuarioId, 'Bogota');
    },
  },
  {
    // Milestones v2 (ADR-014): Gran Arquitecto estilo Albion. Disena un
    // mapa tematico publico con al menos 5 destinos (spec mapas 2026-09-05).
    id: 'mis_gran_arquitecto', grupo: 'general', requiere: [],
    nombre: 'Gran Arquitecto', xp: 50,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM ('
        + '  SELECT m.id FROM mapas m'
        + '  JOIN mapa_destinos md ON md.mapa_id = m.id'
        + '  WHERE m.usuario_id = $1 AND m.publico = true'
        + '  GROUP BY m.id HAVING COUNT(md.destino_id) >= 5'
        + ') t',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    // Milestones v2 (ADR-014): itinerario perfeccion (condicion pragm
    // aprobada por Javier): visitas confirmadas a 4+ destinos cuya ficha
    // incluya itinerario[] en tags (categoria sitio/naturaleza).
    id: 'mis_itinerario_perfeccion', grupo: 'categoria', requiere: ['mis_primera_visita'],
    nombre: 'Itinerario en perfecto orden', xp: 60,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(DISTINCT i.destino_id)::int AS n FROM interacciones i'
        + ' JOIN destinos d ON d.id = i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'visita\''
        + '   AND d.tags ? \'itinerario\'',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 4); });
    },
  },
  // -- Desbloqueos de capacidades (ADR: gamificacion progresiva) -------
  // Misiones de nivel que abren funcionalidades de UI:
  //   subir_fotos     -> Nivel 2 (100 XP) + primera resena
  //   chat            -> Nivel 3 (250 XP)
  //   moderador_chat  -> Nivel 4 (450 XP)
  //   crear_chat      -> Nivel 5 (700 XP)
  // usuarios.js las traduce a usuario.capacidades via DESBLOQUEOS.
  {
    id: 'mis_fotografo', grupo: 'general', requiere: ['mis_primera_resena'],
    nombre: 'Fot\u00f3grafo de publicaciones', xp: 20, desbloquea: 'subir_fotos',
    check: function(ctx) {
      return Promise.resolve(ctx.xpTotal >= 100);
    },
  },
  {
    id: 'mis_chat_mensajero', grupo: 'general', requiere: ['mis_primera_resena'],
    nombre: 'Primer mensaje en la comunidad', xp: 25, desbloquea: 'chat',
    check: function(ctx) {
      return Promise.resolve(ctx.xpTotal >= 250);
    },
  },
  {
    id: 'mis_chat_moderador', grupo: 'general', requiere: ['mis_chat_mensajero'],
    nombre: 'Moderador de chat', xp: 30, desbloquea: 'moderador_chat',
    check: function(ctx) {
      return Promise.resolve(ctx.xpTotal >= 450);
    },
  },
  {
    id: 'mis_chat_creador', grupo: 'general', requiere: ['mis_chat_moderador'],
    nombre: 'Creador de salas', xp: 40, desbloquea: 'crear_chat',
    check: function(ctx) {
      return Promise.resolve(ctx.xpTotal >= 700);
    },
  },
  // -- Comunidad social real (espec 2026-09-08) ---------------------
  // Misiones accionables del chat y los planes. Sus check() consultan
  // las tablas de la migracion 008 (chat_mensajes, planes_viaje,
  // planes_miembros); si la migracion no ha corrido, la consulta falla
  // y el catch degrada a false sin romper la accion principal.
  {
    id: 'mis_chat_activo', grupo: 'general', requiere: ['mis_chat_mensajero'],
    nombre: 'Conversador activo', xp: 20,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM chat_mensajes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 10); })
       .catch(function(){ return false; });
    },
  },
  {
    id: 'mis_plan_creador', grupo: 'general', requiere: ['mis_chat_mensajero'],
    nombre: 'Creador de planes', xp: 25,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM planes_viaje WHERE creador_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); })
       .catch(function(){ return false; });
    },
  },
  {
    id: 'mis_plan_unido', grupo: 'general', requiere: [],
    nombre: 'Viajero en grupo', xp: 15,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM planes_miembros WHERE usuario_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); })
       .catch(function(){ return false; });
    },
  },
  // --- Misiones de Albums/Fotos (ADR-017) ---
  {
    id: 'mis_primera_foto_social',
    grupo: 'fotos',
    requiere: [],
    nombre: 'Primera foto social',
    xp: 15,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_fotos WHERE agregador_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    id: 'mis_creador_album',
    grupo: 'fotos',
    requiere: ['mis_primera_foto_social'],
    nombre: 'Creador de albumes',
    xp: 20,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM albumes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    id: 'mis_album_curador',
    grupo: 'fotos',
    requiere: ['mis_creador_album'],
    nombre: 'Curador de albumes',
    xp: 40,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM albumes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 5); });
    },
  },
  {
    id: 'mis_fotografo_social',
    grupo: 'fotos',
    requiere: ['mis_primera_foto_social'],
    nombre: 'Fotografo social',
    xp: 30,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_fotos WHERE agregador_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 10); });
    },
  },
  {
    id: 'mis_cazador_recompensas',
    grupo: 'fotos',
    requiere: ['mis_fotografo_social'],
    nombre: 'Cazador de recompensas',
    xp: 25,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_votos WHERE usuario_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 20); });
    },
  },
  {
    id: 'mis_favorito_del_pueblo',
    grupo: 'fotos',
    requiere: ['mis_fotografo_social'],
    nombre: 'Favorito del pueblo',
    xp: 50,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_votos av '
        + 'JOIN album_fotos af ON af.id = av.foto_id '
        + 'WHERE af.autor_original_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 10); });
    },
  },
];

// -- Catalogo de logros (v5, estilo consola + Upland) ---------------
// Mismo patron que MISIONES: codigo estatico, DAG via 'requiere',
// check() server-side. Anade tier (bronce/plata/oro/platino) para el
// UI y xp de recompensa. La rareza % se calcula en el GET tipo=logros
// a partir de cuantos usuarios activos desbloquearon cada logro.
//
// Normalizacion de nombres de ciudad: en Neon conviven 'Bogota' y
// 'Bogot\u00e1' segun el seed, asi que toda comparacion de ciudad usa
// TRANSLATE para ignorar tildes y LOWER para ignorar mayusculas.
var TRANSLATE_CIUDAD = "TRANSLATE(COALESCE(d.ciudad,''),'\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc','aeiouu')";
var CIUDAD_NORM      = "LOWER(" + TRANSLATE_CIUDAD + ")";

// Coleccion por ciudad (estilo Upland: juntar "propiedades" de una
// ciudad en Tu Mapa). Umbrales por ciudad con los nombres canonizados
// que existen en los seeds publicados.
var CIUDADES_COLECCION = [
  { ciudad: 'Bogota',      n: 12, id: 'logr_alcalde_bogota',        nombre: 'Alcalde de Bogota',             emoji: '\uD83C\uDFDB', tier: 'platino', xp: 100,
    desc: 'Guarda 12 destinos de Bogota en Tu Mapa' },
  { ciudad: 'Cartagena',   n: 8,  id: 'logr_conquistador_cartagena', nombre: 'Conquistador de Cartagena',      emoji: '\u2693',       tier: 'oro',     xp: 75,
    desc: 'Guarda 8 destinos de Cartagena en Tu Mapa' },
  { ciudad: 'Medellin',    n: 8,  id: 'logr_conquistador_medellin',  nombre: 'Conquistador de Medellin',       emoji: '\uD83C\uDFD4', tier: 'oro',     xp: 75,
    desc: 'Guarda 8 destinos de Medellin en Tu Mapa' },
  { ciudad: 'Santa Marta', n: 6,  id: 'logr_senor_santa_marta',      nombre: 'Se\u00f1or de Santa Marta',      emoji: '\uD83C\uDF34', tier: 'plata',   xp: 40,
    desc: 'Guarda 6 destinos de Santa Marta en Tu Mapa' },
  { ciudad: 'Cali',        n: 6,  id: 'logr_cali_es_colombia',       nombre: 'Cali es Colombia',               emoji: '\uD83D\uDC83', tier: 'plata',   xp: 40,
    desc: 'Guarda 6 destinos de Cali en Tu Mapa' },
];

// Logros generales (voto rapido, blogs y conteos de progreso).
var LOGROS = [
  {
    id: 'logr_primer_voto', grupo: 'general', requiere: [],
    nombre: 'Primera calificaci\u00f3n',
    desc: 'Califica por primera vez un lugar con el voto r\u00e1pido de 1 a 5 estrellas',
    emoji: '\u2B50', tier: 'bronce', xp: 10,
    check: function(ctx) { return ctx.totalVotos().then(function(n){ return n >= 1; }); },
  },
  {
    id: 'logr_critico_10', grupo: 'general', requiere: ['logr_primer_voto'],
    nombre: 'Cr\u00edtico', desc: 'Acumula 10 calificaciones en total',
    emoji: '\uD83C\uDFAF', tier: 'plata', xp: 25,
    check: function(ctx) { return ctx.totalVotos().then(function(n){ return n >= 10; }); },
  },
  {
    id: 'logr_critico_25', grupo: 'general', requiere: ['logr_critico_10'],
    nombre: 'Cr\u00edtico experto', desc: 'Acumula 25 calificaciones en total',
    emoji: '\uD83C\uDFAF', tier: 'oro', xp: 50,
    check: function(ctx) { return ctx.totalVotos().then(function(n){ return n >= 25; }); },
  },
  {
    id: 'logr_opinion_blog', grupo: 'general', requiere: [],
    nombre: 'Lector cr\u00edtico', desc: 'Deja tu primera opini\u00f3n en un art\u00edculo del blog',
    emoji: '\uD83D\uDCDD', tier: 'bronce', xp: 10,
    check: function(ctx) { return ctx.blogOpiniones().then(function(n){ return n >= 1; }); },
  },
  {
    id: 'logr_votos_blog_5', grupo: 'general', requiere: ['logr_opinion_blog'],
    nombre: 'Bibliotecario', desc: 'Califica 5 art\u00edculos del blog',
    emoji: '\uD83D\uDCDA', tier: 'plata', xp: 25,
    check: function(ctx) { return ctx.blogVotos().then(function(n){ return n >= 5; }); },
  },
  {
    id: 'logr_votos_blog_10', grupo: 'general', requiere: ['logr_votos_blog_5'],
    nombre: 'Curador de historias', desc: 'Califica 10 art\u00edculos del blog',
    emoji: '\uD83D\uDCDA', tier: 'oro', xp: 50,
    check: function(ctx) { return ctx.blogVotos().then(function(n){ return n >= 10; }); },
  },
  {
    id: 'logr_coleccionista_10', grupo: 'coleccion', requiere: [],
    nombre: 'Coleccionista', desc: 'Guarda 10 lugares en total',
    emoji: '\uD83D\uDCBC', tier: 'bronce', xp: 15,
    check: function(ctx) { return Promise.resolve(ctx.totalGuardados >= 10); },
  },
  {
    id: 'logr_coleccionista_50', grupo: 'coleccion', requiere: ['logr_coleccionista_10'],
    nombre: 'Magnate del mapa', desc: 'Guarda 50 lugares en total',
    emoji: '\uD83C\uDFC6', tier: 'oro', xp: 75,
    check: function(ctx) { return Promise.resolve(ctx.totalGuardados >= 50); },
  },
  {
    id: 'logr_ciudades_5', grupo: 'coleccion', requiere: ['logr_coleccionista_10'],
    nombre: 'Viajero multiciudad', desc: 'Guarda lugares en 5 ciudades distintas',
    emoji: '\uD83D\uDDFA', tier: 'plata', xp: 30,
    check: function(ctx) { return ctx.ciudadesDistintas().then(function(n){ return n >= 5; }); },
  },
  {
    id: 'logr_visitas_5', grupo: 'coleccion', requiere: [],
    nombre: 'Senderista', desc: 'Confirma 5 visitas a destinos',
    emoji: '\uD83E\uDDBC', tier: 'bronce', xp: 15,
    check: function(ctx) { return Promise.resolve(ctx.totalVisitas >= 5); },
  },
  {
    id: 'logr_visitas_20', grupo: 'coleccion', requiere: ['logr_visitas_5'],
    nombre: 'N\u00f3mada', desc: 'Confirma 20 visitas a destinos',
    emoji: '\uD83E\uDDED', tier: 'oro', xp: 50,
    check: function(ctx) { return Promise.resolve(ctx.totalVisitas >= 20); },
  },
  // --- Logros de Albums/Fotos (ADR-017) ---
  {
    id: 'logr_albumero', grupo: 'fotos', requiere: [],
    nombre: 'Albumero', desc: 'Crea tu primer album fotografico',
    emoji: '\uD83D\uDDBC', tier: 'bronce', xp: 15,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM albumes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    id: 'logr_coleccionista_visual', grupo: 'fotos', requiere: ['logr_albumero'],
    nombre: 'Coleccionista visual', desc: 'Sube 25 fotos a albumes',
    emoji: '\uD83C\uDFA8', tier: 'plata', xp: 30,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_fotos WHERE autor_original_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 25); });
    },
  },
  {
    id: 'logr_maestro_fotografo', grupo: 'fotos', requiere: ['logr_coleccionista_visual'],
    nombre: 'Maestro fotografico', desc: 'Sube 50 fotos a albumes',
    emoji: '\uD83C\uDF1F', tier: 'oro', xp: 60,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_fotos WHERE autor_original_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 50); });
    },
  },
  {
    id: 'logr_favorito_comunidad', grupo: 'fotos', requiere: [],
    nombre: 'Favorito de la comunidad', desc: 'Tus fotos reciben 10 votos en total',
    emoji: '\u2B50', tier: 'bronce', xp: 20,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_votos av '
        + 'JOIN album_fotos af ON af.id = av.foto_id '
        + 'WHERE af.autor_original_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 10); });
    },
  },
  {
    id: 'logr_estrella_del_mapa', grupo: 'fotos', requiere: ['logr_favorito_comunidad'],
    nombre: 'Estrella del mapa', desc: 'Una de tus fotos es seleccionada como top por un admin',
    emoji: '\uD83C\uDF1F', tier: 'oro', xp: 40,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM destinos '
        + 'WHERE foto_hero IN (SELECT foto_url FROM album_fotos WHERE autor_original_id=$1)',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    id: 'logr_guardian_historias', grupo: 'fotos', requiere: ['logr_albumero'],
    nombre: 'Guardian de historias', desc: 'Crea 5 albumes con al menos 10 fotos cada uno',
    emoji: '\uD83D\uDCDA', tier: 'platino', xp: 100,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM ('
        + '  SELECT af.album_id FROM album_fotos af '
        + '  JOIN albumes a ON a.id = af.album_id '
        + '  WHERE a.usuario_id=$1 AND af.activo=true '
        + '  GROUP BY af.album_id HAVING COUNT(*) >= 10'
        + ') sub',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 5); });
    },
  },
  {
    id: 'logr_viajero_multimedia', grupo: 'fotos', requiere: ['logr_albumero'],
    nombre: 'Viajero multimedia', desc: 'Crea albumes de los 3 tipos: fotos, videos y audio',
    emoji: '\uD83C\uDFA5', tier: 'plata', xp: 35,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(DISTINCT tipo)::int AS tipos FROM albumes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].tipos >= 3); });
    },
  },
];

// Logros de coleccion por ciudad, generados desde CIUDADES_COLECCION
// para mantener el catalogo data-driven dentro de codigo estatico.
CIUDADES_COLECCION.forEach(function(c) {
  LOGROS.push({
    id: c.id, grupo: 'ciudad', requiere: ['logr_coleccionista_10'],
    nombre: c.nombre, desc: c.desc, emoji: c.emoji, tier: c.tier, xp: c.xp,
    check: function(ctx) { return ctx.guardadosCiudad(c.ciudad).then(function(n){ return n >= c.n; }); },
  });
});

// Logros Milestones v2 (ADR-014): badges de identidad estilo Steam/
// SKATE/Albion. IDs estables: una vez desbloqueado, el progreso en
// usuarios.progreso_logros no se invalida al renombrar el catalogo.
LOGROS.push(
  {
    id: 'logr_spot_domado', grupo: 'general', requiere: ['logr_primer_voto', 'logr_critico_10'],
    nombre: 'Spot Domado', desc: 'Tu resena es la numero 1 (mas votada) en un destino de dificultad Experto',
    emoji: '\uD83C\uDFC5', tier: 'oro', xp: 50,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM interacciones i'
        + ' JOIN destinos d ON d.id = i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'resena\''
        + '   AND (LOWER(d.tags->>\'dificultad\') IN (\'experto\',\'extremo\')'
        + '     OR LOWER(COALESCE(d.tags->>\'dificultad\',\'\')) = \'extremo\')'
        + '   AND i.votos_utiles > 0'
        + '   AND i.votos_utiles = (SELECT MAX(v.votos_utiles) FROM interacciones v'
        + '       WHERE v.destino_id = i.destino_id AND v.tipo=\'resena\')',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    id: 'logr_especialista_gastro', grupo: 'general', requiere: ['logr_critico_10'],
    nombre: 'Especialista en Gastro', desc: 'Alcanza Tier 3 de Critico escribiendo solo resenas de Comida',
    emoji: '\uD83C\uDF54', tier: 'plata', xp: 40,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n_total,'
        + ' COUNT(*) FILTER (WHERE d.categoria_slug = \'comida\')::int AS n_comida'
        + ' FROM interacciones i JOIN destinos d ON d.id = i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'resena\'',
        [ctx.usuarioId]
      ).then(function(r){
        var row = r[0] || { n_total: 0, n_comida: 0 };
        return row.n_total >= 5 && row.n_total === row.n_comida;
      });
    },
  },
  {
    id: 'logr_cazador_rarezas', grupo: 'general', requiere: ['logr_critico_10', 'logr_coleccionista_10'],
    nombre: 'Cazador de Rarezas', desc: 'Desbloquea un trofeo cuya rareza global sea menor al 5%',
    emoji: '\uD83D\uDD0D', tier: 'platino', xp: 100,
    check: function(ctx) {
      return ctx.rarezaGlobal().then(function(rareza) {
        if (!rareza) return false;
        // Cazador de Rarezas: el usuario ya tiene desbloqueado algun
        // trofeo cuya rareza global hoy vista menos del 5% de los
        // viajeros activos (estilo Steam).
        var desbloqueados = ctx.progresoLogros || {};
        var tieneRaro = false;
        Object.keys(desbloqueados).forEach(function(k) {
          var st = desbloqueados[k];
          if (st && st.estado === 'completada' && rareza[k] > 0 && rareza[k] < 5) {
            tieneRaro = true;
          }
        });
        return tieneRaro;
      });
    },
  }
);

// Logros de la comunidad social (espec 2026-09-08): chat y planes
// colectivos. Mismo patron que los de arriba: codigo estatico, check()
// server-side que consulta las tablas de la migracion 008.
LOGROS.push(
  {
    id: 'logr_social_chat', grupo: 'general', requiere: ['logr_primer_voto'],
    nombre: 'Conversador', desc: 'Env\u00eda 50 mensajes en el chat de la comunidad',
    emoji: '\uD83D\uDCAC', tier: 'plata', xp: 30,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM chat_mensajes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 50); })
       .catch(function(){ return false; });
    },
  },
  {
    id: 'logr_social_plan', grupo: 'general', requiere: ['logr_primer_voto'],
    nombre: 'Organizador de viajes', desc: 'Crea 3 planes de viaje colectivos',
    emoji: '\uD83D\uDDFA', tier: 'oro', xp: 35,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM planes_viaje WHERE creador_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 3); })
       .catch(function(){ return false; });
    },
  },
  {
    id: 'logr_anfitrion', grupo: 'general', requiere: ['logr_primer_voto'],
    nombre: 'Anfitri\u00f3n de parche', desc: 'Un plan tuyo re\u00fane 5 o m\u00e1s viajeros',
    emoji: '\uD83E\uDD1D', tier: 'oro', xp: 50,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM ('
        + ' SELECT p.id FROM planes_viaje p'
        + ' JOIN planes_miembros pm ON pm.plan_id = p.id'
        + ' WHERE p.creador_id = $1'
        + ' GROUP BY p.id HAVING COUNT(pm.usuario_id) >= 5'
        + ') t',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); })
       .catch(function(){ return false; });
    },
  }
);

// -- Own the Spot (SKATE, Milestones v2 / ADR-014) ------------------
// El lider de un spot es el autor de la resena mas votada (votos_utiles
// maximo) de un destino. La consulta corre BAJO DEMANDA (respuesta del
// prompt gsming: "bajo demanda") tanto en api/pagina-destino.js (bloque
// "Lider del Spot" de la seccion de resenas) como aqui, para el
// multiplicador de XP x1.1 en la ciudad del lider. Requiere la migracion
// 007 (columna interacciones.votos_utiles); si aun no existe, la query
// falla y el catch la degrada a false sin romper el POST.
function esLiderDeCiudad(sql, usuarioId, ciudad) {
  if (!usuarioId || !ciudad) return Promise.resolve(false);
  return sql(
    'SELECT 1 AS uno FROM interacciones i'
    + ' JOIN destinos d ON d.id = i.destino_id'
    + ' WHERE i.usuario_id = $1 AND i.tipo = \'resena\''
    + '   AND i.votos_utiles > 0'
    + '   AND i.votos_utiles = (SELECT MAX(v.votos_utiles) FROM interacciones v'
    + '       WHERE v.destino_id = i.destino_id AND v.tipo = \'resena\')'
    + '   AND ' + CIUDAD_NORM + ' = LOWER($2)'
    + ' LIMIT 1',
    [usuarioId, ciudad]
  ).then(function(r){ return r.length > 0; }).catch(function(){ return false; });
}

// Aplica el multiplicador x1.1 a la XP base de una accion si el usuario
// es lider de algun spot en la ciudad del destino (bajo demanda).
function xpConMultiplicador(sql, usuarioId, destinoId, xpBase) {
  if (!usuarioId) return Promise.resolve(xpBase);
  return sql('SELECT ciudad FROM destinos WHERE id=$1 LIMIT 1', [destinoId])
    .then(function(r){
      var ciudad = r[0] ? r[0].ciudad : '';
      if (!ciudad) return xpBase;
      return esLiderDeCiudad(sql, usuarioId, ciudad).then(function(es){
        return es ? Math.round(xpBase * 1.1) : xpBase;
      });
    }).catch(function(){ return xpBase; });
}

// Capacidad desbloqueada por mision (patron de la foto en el POST):
// lee usuarios.progreso_misiones y devuelve true si la mision esta
// 'completada'. Nunca lanza: un fallo degrada a false.
function misionCompletada(sql, usuarioId, misionId) {
  if (!usuarioId || !misionId) return Promise.resolve(false);
  return sql(
    "SELECT (progreso_misiones->$1->>'estado') = 'completada' AS ok FROM usuarios WHERE id=$2",
    [misionId, usuarioId]
  ).then(function(r){ return !!(r[0] && r[0].ok); })
   .catch(function(){ return false; });
}

// Anti-farming del chat (espec 2026-09-08): +2 XP por mensaje con tope
// diario de 20 XP (10 mensajes/dia). El contador vive en
// usuarios.progreso_social con la estructura { chat_dia: 'YYYY-MM-DD',
// chat_n: N }. Nunca lanza: un fallo degrada a sin XP disponible.
function chatXpDisponible(sql, usuarioId) {
  if (!usuarioId) return Promise.resolve({ disponible: false, xp: 0, hoy: '', n: 0 });
  var hoy = new Date();
  var hoyStr = hoy.getUTCFullYear() + '-'
    + String(hoy.getUTCMonth() + 1).padStart(2, '0') + '-'
    + String(hoy.getUTCDate()).padStart(2, '0');
  return sql('SELECT progreso_social FROM usuarios WHERE id=$1', [usuarioId])
    .then(function(r){
      var ps = (r[0] && r[0].progreso_social) || {};
      var n = (ps.chat_dia === hoyStr) ? (parseInt(ps.chat_n, 10) || 0) : 0;
      return { disponible: n < 10, xp: n < 10 ? 2 : 0, hoy: hoyStr, n: n };
    })
    .catch(function(){ return { disponible: false, xp: 0, hoy: hoyStr, n: 0 }; });
}

function registrarChatXp(sql, usuarioId, hoy, n) {
  return sql(
    "UPDATE usuarios SET progreso_social = COALESCE(progreso_social,'{}'::jsonb)"
    + " || jsonb_build_object('chat_dia', $1, 'chat_n', $2::int) WHERE id=$3",
    [hoy, n + 1, usuarioId]
  ).catch(function(){});
}

// Evalua el catalogo completo para un usuario y persiste lo nuevo que se
// haya completado. Nunca lanza: un fallo aqui no debe tumbar la accion
// principal (resena/guardado/visita) que ya se registro con exito.
function evaluarMisiones(sql, usuarioId) {
  return sql(
    'SELECT xp_total, total_guardados, total_visitas, progreso_misiones FROM usuarios WHERE id=$1',
    [usuarioId]
  ).then(function(rows) {
    if (!rows.length) return [];
    var u = rows[0];
    var progreso = u.progreso_misiones || {};
    var ctx = {
      sql: sql,
      usuarioId: usuarioId,
      xpTotal: parseInt(u.xp_total) || 0,
      totalGuardados: parseInt(u.total_guardados) || 0,
      totalVisitas: parseInt(u.total_visitas) || 0,
    };
    var completadas = {};
    Object.keys(progreso).forEach(function(k) {
      if (progreso[k] && progreso[k].estado === 'completada') completadas[k] = true;
    });

    var nuevas = [];
    var cadena = Promise.resolve();
    MISIONES.forEach(function(m) {
      cadena = cadena.then(function() {
        if (completadas[m.id]) return;
        var okRequisitos = m.requiere.every(function(r){ return completadas[r]; });
        if (!okRequisitos) return;
        return m.check(ctx).then(function(cumplida) {
          if (!cumplida) return;
          completadas[m.id] = true;
          progreso[m.id] = { estado: 'completada', en: new Date().toISOString() };
          nuevas.push(m);
          console.log('TRACE: Hito detectado | Accion: ' + m.id + ' | Recompensa: ' + m.xp + ' XP');
        });
      });
    });

    return cadena.then(function() {
      if (!nuevas.length) return [];
      var xpBonus = nuevas.reduce(function(s, m){ return s + m.xp; }, 0);
      return sql(
        'UPDATE usuarios SET'
        + '   progreso_misiones = COALESCE(progreso_misiones,\'{}\'::jsonb) || $1::jsonb,'
        + '   xp_total = xp_total + $2'
        + ' WHERE id = $3',
        [JSON.stringify(progreso), xpBonus, usuarioId]
      ).then(function() { return nuevas; });
    });
  }).catch(function(err) {
    console.error('[misiones]', err.message);
    return [];
  });
}

// Evalua el catalogo LOGROS para un usuario y persiste lo nuevo. Mismo
// patron de seguridad que evaluarMisiones: corre en servidor, nunca
// lanza, y las consultas de agregados se memoizan (una por accion) para
// no disparar una consulta por logro.
function evaluarLogros(sql, usuarioId) {
  return sql(
    'SELECT xp_total, total_guardados, total_visitas, progreso_logros FROM usuarios WHERE id=$1',
    [usuarioId]
  ).then(function(rows) {
    if (!rows.length) return [];
    var u = rows[0];
    var progreso = u.progreso_logros || {};
    var cache = {};
    function memo(key, query, params) {
      if (!cache[key]) {
        cache[key] = sql(query, params).then(function(r) {
          return r[0] ? parseInt(r[0].n) || 0 : 0;
        }).catch(function(){ return 0; });
      }
      return cache[key];
    }
    var ctx = {
      sql: sql,
      usuarioId: usuarioId,
      xpTotal: parseInt(u.xp_total) || 0,
      totalGuardados: parseInt(u.total_guardados) || 0,
      totalVisitas: parseInt(u.total_visitas) || 0,
      progresoLogros: progreso,
      totalVotos: function() {
        return memo('votos',
          'SELECT COUNT(*)::int AS n FROM interacciones WHERE usuario_id=$1 AND tipo=\'rating\'',
          [usuarioId]);
      },
      blogVotos: function() {
        return memo('blogvotos',
          'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
          + ' WHERE i.usuario_id=$1 AND i.tipo=\'rating\' AND d.categoria_slug=\'blog\'',
          [usuarioId]);
      },
      blogOpiniones: function() {
        return memo('blogopiniones',
          'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
          + ' WHERE i.usuario_id=$1 AND i.tipo=\'resena\' AND d.categoria_slug=\'blog\'',
          [usuarioId]);
      },
      ciudadesDistintas: function() {
        return memo('ciudades',
          'SELECT COUNT(DISTINCT ' + CIUDAD_NORM + ')::int AS n FROM interacciones i'
          + ' JOIN destinos d ON d.id=i.destino_id'
          + ' WHERE i.usuario_id=$1 AND i.tipo=\'guardado\' AND i.activo=true AND ' + CIUDAD_NORM + ' <> \'\'',
          [usuarioId]);
      },
      guardadosCiudad: function(ciudad) {
        var key = 'ciudad_' + ciudad;
        return memo(key,
          'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
          + ' WHERE i.usuario_id=$1 AND i.tipo=\'guardado\' AND i.activo=true AND ' + CIUDAD_NORM + ' = LOWER($2)',
          [usuarioId, ciudad]);
      },
      rarezaGlobal: function() {
        // Rareza estilo Steam: % de usuarios activos que desbloquearon
        // cada logro. Misma query agregada del GET tipo=logros,
        // memoizada para correr una sola vez por POST (badge
        // logr_cazador_rarezas, Milestones v2 / ADR-014).
        if (cache['rareza']) return cache['rareza'];
        cache['rareza'] = sql(
          'SELECT k AS id, COUNT(*)::int AS n FROM usuarios u,'
          + ' LATERAL jsonb_object_keys(COALESCE(u.progreso_logros,\'{}\'::jsonb)) AS k'
          + ' WHERE u.activo = true GROUP BY k'
        ).then(function(raros) {
          return sql('SELECT COUNT(*)::int AS n FROM usuarios WHERE activo = true')
            .then(function(totales) {
              var totalUsr = totales[0] ? totales[0].n : 0;
              var mapa = {};
              (raros || []).forEach(function(r) {
                mapa[r.id] = totalUsr ? Math.round((r.n / totalUsr) * 1000) / 10 : 0;
              });
              return mapa;
            });
        }).catch(function(){ return {}; });
        return cache['rareza'];
      },
    };
    var completados = {};
    Object.keys(progreso).forEach(function(k) {
      if (progreso[k] && progreso[k].estado === 'completada') completados[k] = true;
    });

    var nuevos = [];
    var cadena = Promise.resolve();
    LOGROS.forEach(function(l) {
      cadena = cadena.then(function() {
        if (completados[l.id]) return;
        var okRequisitos = l.requiere.every(function(r){ return completados[r]; });
        if (!okRequisitos) return;
        return l.check(ctx).then(function(cumplido) {
          if (!cumplido) return;
          completados[l.id] = true;
          progreso[l.id] = { estado: 'completada', en: new Date().toISOString() };
          nuevos.push(l);
          console.log('TRACE: Logro desbloqueado | ' + l.id + ' | +' + l.xp + ' XP');
        });
      });
    });

    return cadena.then(function() {
      if (!nuevos.length) return [];
      var xpBonus = nuevos.reduce(function(s, l){ return s + l.xp; }, 0);
      return sql(
        'UPDATE usuarios SET'
        + '   progreso_logros = COALESCE(progreso_logros,\'{}\'::jsonb) || $1::jsonb,'
        + '   xp_total = xp_total + $2'
        + ' WHERE id = $3',
        [JSON.stringify(progreso), xpBonus, usuarioId]
      ).then(function() { return nuevos; });
    });
  }).catch(function(err) {
    console.error('[logros]', err.message);
    return [];
  });
}

// Comparte la respuesta GET de logros/misiones: mapea un catalogo
// estatico + el progreso jsonb del usuario a filas {id, grupo, nombre,
// desc, xp, requiere, estado, en} y cuenta las completadas. 'meta'
// (opcional) anade campos extra por item (tier/emoji/rareza en logros).
// Evita duplicar el mismo bucle en tipo=logros y tipo=misiones
// (Regla de No-Duplicidad).
function entregarCatalogo(catalogo, progreso, meta) {
  var desbloqueados = 0;
  var data = catalogo.map(function(item) {
    var st = progreso[item.id];
    var done = !!(st && st.estado === 'completada');
    if (done) desbloqueados++;
    var fila = {
      id: item.id, grupo: item.grupo, nombre: item.nombre,
      desc: item.desc || null, xp: item.xp, requiere: item.requiere,
      estado: done ? 'completada' : 'pendiente',
      en: done ? (st.en || null) : null,
    };
    if (meta) meta(fila, item);
    return fila;
  });
  return { data: data, desbloqueados: desbloqueados };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    var sql = neon(process.env.DATABASE_URL);

    // -- GET ----------------------------------------------------------
    if (req.method === 'GET') {
      var tipo     = req.query.tipo       || null;
      var destinoId= req.query.destino_id || null;
      var usuarioId= req.query.usuario_id || null;

      // Resenas de un destino
      if (tipo === 'resenas' && destinoId) {
        var rows = await sql(
          'SELECT i.id, i.rating, i.texto, i.creado_en, i.dims, i.traveller_type, '
          + 'u.nombre AS usuario_nombre, u.badge_actual '
          + 'FROM interacciones i '
          + 'LEFT JOIN usuarios u ON i.usuario_id = u.id '
          + 'WHERE i.destino_id = $1 AND i.tipo = \'resena\' '
          + 'ORDER BY i.creado_en DESC '
          + 'LIMIT 20',
          [destinoId]
        );
        return res.status(200).json({ ok: true, data: rows });
      }

      // Promedios de dimensiones de un destino (para las barras de puntuacion)
      if (tipo === 'dims_avg' && destinoId) {
        var dimsAvgRows = await sql(
          'SELECT '
          + 'ROUND(AVG(NULLIF(dims->>\'experiencia\',\'\')::numeric),1) AS experiencia, '
          + 'ROUND(AVG(NULLIF(dims->>\'guias\',\'\')::numeric),1) AS guias, '
          + 'ROUND(AVG(NULLIF(dims->>\'acceso\',\'\')::numeric),1) AS acceso, '
          + 'ROUND(AVG(NULLIF(dims->>\'valor\',\'\')::numeric),1) AS valor, '
          + 'ROUND(AVG(NULLIF(dims->>\'vistas\',\'\')::numeric),1) AS vistas, '
          + 'ROUND(AVG(NULLIF(dims->>\'seguridad\',\'\')::numeric),1) AS seguridad '
          + 'FROM interacciones '
          + 'WHERE destino_id=$1 AND tipo=\'resena\' AND dims IS NOT NULL AND dims != \'{}\'::jsonb',
          [destinoId]
        );
        return res.status(200).json({ ok: true, data: dimsAvgRows[0] || {} });
      }

      // Fotos de viajeros de un destino (con conteo de votos y marca
      // ya_votado para el usuario actual). Las fotos son interacciones
      // tipo='foto'; cada voto es otra fila tipo='foto' con
      // dims->>'voto_foto_id' apuntando a la foto votada.
      if (tipo === 'fotos' && destinoId) {
        var fotosRows = await sql(
          'SELECT f.id, f.texto AS url, f.creado_en, u.nombre AS autor_nombre, '
          + '(SELECT COUNT(*)::int FROM interacciones fv '
          + '  WHERE fv.tipo=\'foto\' AND fv.activo=true AND fv.dims->>\'voto_foto_id\' = f.id::text) AS votos '
          + 'FROM interacciones f LEFT JOIN usuarios u ON u.id = f.usuario_id '
          + 'WHERE f.destino_id=$1 AND f.tipo=\'foto\' AND f.activo=true '
          + 'AND (f.dims IS NULL OR NOT (f.dims ? \'voto_foto_id\')) '
          + 'ORDER BY f.creado_en DESC LIMIT 60',
          [destinoId]
        );
        var yaVotoFotos = {};
        if (usuarioId) {
          var misVotosFotos = await sql(
            'SELECT dims->>\'voto_foto_id\' AS foto_id FROM interacciones '
            + 'WHERE usuario_id=$1 AND tipo=\'foto\' AND activo=true AND dims ? \'voto_foto_id\'',
            [usuarioId]
          );
          misVotosFotos.forEach(function(v){ if (v.foto_id) yaVotoFotos[String(v.foto_id)] = true; });
        }
        fotosRows.forEach(function(r){ r.ya_votado = !!yaVotoFotos[String(r.id)]; });
        return res.status(200).json({ ok: true, data: fotosRows });
      }

      // Guardados de un usuario
      if (tipo === 'guardados' && usuarioId) {
        var guardados = await sql(
          'SELECT i.destino_id, d.nombre, d.slug, d.foto_hero, d.ciudad, d.categoria_slug'
          + ' FROM interacciones i'
          + ' JOIN destinos d ON d.id = i.destino_id'
          + ' WHERE i.usuario_id = $1 AND i.tipo = \'guardado\' AND i.activo = true'
          + '   AND d.status = \'published\''
          + ' ORDER BY i.creado_en DESC',
          [usuarioId]
        );
        return res.status(200).json({ ok: true, data: guardados });
      }

      // Esta guardado?
      if (tipo === 'is_guardado' && destinoId && usuarioId) {
        var check = await sql(
          'SELECT id FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'guardado\' AND activo=true LIMIT 1',
          [destinoId, usuarioId]
        );
        return res.status(200).json({ ok: true, guardado: check.length > 0 });
      }

      // Mapa de un usuario: guardados activos + visitas confirmadas.
      // Devuelve en data.{guardados, visitados} los destinos COMPLETOS
      // (JOIN destinos, d.id AS destino_id), no solo UUIDs -- fix del
      // spec 'mapas publicos/privados' (2026-09-05): mi-perfil.html
      // espera objetos para _hidratarGuardadosDB/cargarMiMapa. Mismo
      // patron de columnas que tipo=guardados mas lat/lng para el mapa.
      if (tipo === 'mapa' && usuarioId) {
        var mapaGuardados = await sql(
          'SELECT DISTINCT d.id AS destino_id, d.nombre, d.slug, d.foto_hero, d.ciudad, d.categoria_slug, d.lat, d.lng'
          + ' FROM interacciones i'
          + ' JOIN destinos d ON d.id = i.destino_id'
          + ' WHERE i.usuario_id = $1 AND i.tipo = \'guardado\' AND i.activo = true'
          + '   AND d.status = \'published\'',
          [usuarioId]
        );
        var mapaVisitas = await sql(
          'SELECT DISTINCT d.id AS destino_id, d.nombre, d.slug, d.foto_hero, d.ciudad, d.categoria_slug, d.lat, d.lng'
          + ' FROM interacciones i'
          + ' JOIN destinos d ON d.id = i.destino_id'
          + ' WHERE i.usuario_id = $1 AND i.tipo = \'visita\''
          + '   AND d.status = \'published\'',
          [usuarioId]
        );
        return res.status(200).json({
          ok: true,
          data: {
            guardados: mapaGuardados,
            visitados: mapaVisitas
          }
        });
      }

      // Voto del usuario en un destino (resena o voto rapido sin texto)
      if (tipo === 'mi_rating' && destinoId && usuarioId) {
        var miVoto = await sql(
          'SELECT rating, tipo FROM interacciones '
          + 'WHERE destino_id=$1 AND usuario_id=$2 '
          + 'AND tipo IN (\'resena\',\'rating\') '
          + 'ORDER BY (tipo=\'resena\') DESC LIMIT 1',
          [destinoId, usuarioId]
        );
        return res.status(200).json({ ok: true, voto: miVoto.length > 0 ? miVoto[0] : null });
      }

      // Catalogo de logros del usuario (v5): estado, fecha, tier y
      // rareza global estilo Steam (% de usuarios activos que lo
      // desbloquearon). Una query agregada con jsonb_object_keys.
      // v7: backfill retroactivo antes de leer el progreso, para
      // registrar logros ya alcanzados que quedaron sin persistir.
      if (tipo === 'logros' && usuarioId) {
        var usrLogros = await sql(
          'SELECT progreso_logros FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        if (!usrLogros.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });

        await evaluarLogros(sql, usuarioId);

        var usrLogros2 = await sql(
          'SELECT progreso_logros FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        var progresoLogros = usrLogros2[0].progreso_logros || {};

        var rarezaRows = await sql(
          'SELECT k AS id, COUNT(*)::int AS n FROM usuarios u,'
          + ' LATERAL jsonb_object_keys(COALESCE(u.progreso_logros,\'{}\'::jsonb)) AS k'
          + ' WHERE u.activo = true GROUP BY k'
        ).catch(function(){ return []; });
        var totalUsuarios = await sql(
          'SELECT COUNT(*)::int AS n FROM usuarios WHERE activo = true'
        );
        var totalUsr = totalUsuarios[0] ? totalUsuarios[0].n : 0;
        var rareza = {};
        rarezaRows.forEach(function(r){ rareza[r.id] = totalUsr ? Math.round((r.n / totalUsr) * 1000) / 10 : 0; });

        var resLogros = entregarCatalogo(LOGROS, progresoLogros, function(fila, l) {
          fila.tier = l.tier;
          fila.emoji = l.emoji;
          fila.rareza_pct = rareza[l.id] != null ? rareza[l.id] : 0;
        });
        return res.status(200).json({
          ok: true,
          data: resLogros.data,
          desbloqueados: resLogros.desbloqueados,
          total: LOGROS.length,
        });
      }

      // Catalogo de misiones del usuario (v7): estado y fecha por mision,
      // con el mismo patron que tipo=logros. Backfill retroactivo via
      // evaluarMisiones() antes de leer el progreso persistido.
      if (tipo === 'misiones' && usuarioId) {
        var usrMis = await sql(
          'SELECT progreso_misiones FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        if (!usrMis.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });

        await evaluarMisiones(sql, usuarioId);

        var usrMis2 = await sql(
          'SELECT progreso_misiones FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        var progresoMisiones = usrMis2[0].progreso_misiones || {};
        var resMisiones = entregarCatalogo(MISIONES, progresoMisiones, null);
        return res.status(200).json({
          ok: true,
          data: resMisiones.data,
          desbloqueadas: resMisiones.desbloqueados,
          total: MISIONES.length,
        });
      }

      // Mapas tematicos del usuario (spec mapas publicos/privados
      // 2026-09-05): id, nombre, emoji, descripcion, publico, creado_en
      // y conteo de destinos por mapa (LEFT JOIN + GROUP BY).
      if (tipo === 'mapas_mios' && usuarioId) {
        var mapasMios = await sql(
          'SELECT m.id, m.nombre, m.emoji, m.descripcion, m.publico, m.creado_en,'
          + ' COALESCE(COUNT(md.destino_id),0)::int AS n_destinos'
          + ' FROM mapas m'
          + ' LEFT JOIN mapa_destinos md ON md.mapa_id = m.id'
          + ' WHERE m.usuario_id = $1'
          + ' GROUP BY m.id'
          + ' ORDER BY m.creado_en DESC',
          [usuarioId]
        );
        return res.status(200).json({ ok: true, data: mapasMios });
      }

      // Catalogo publico: mapas publicos recientes (publico=true,
      // ORDER BY creado_en DESC, LIMIT 50). Incluye autor
      // (usuarios.nombre) y conteo de destinos.
      if (tipo === 'mapas_publicos') {
        var mapasPublicos = await sql(
          'SELECT m.id, m.nombre, m.emoji, m.descripcion, m.creado_en,'
          + ' u.nombre AS autor,'
          + ' COALESCE(COUNT(md.destino_id),0)::int AS n_destinos'
          + ' FROM mapas m'
          + ' JOIN usuarios u ON u.id = m.usuario_id'
          + ' LEFT JOIN mapa_destinos md ON md.mapa_id = m.id'
          + ' WHERE m.publico = true'
          + ' GROUP BY m.id, u.nombre'
          + ' ORDER BY m.creado_en DESC'
          + ' LIMIT 50'
        );
        return res.status(200).json({ ok: true, data: mapasPublicos });
      }

      // Detalle de un mapa tematico: mapa + destinos completos (JOIN
      // destinos con lat/lng para el mapa publico). Si el mapa es
      // privado solo el dueno (usuario_id) puede verlo; un tercero
      // recibe 'No autorizado' (equivalente 404, spec 2026-09-05).
      if (tipo === 'mapa_detalle') {
        var mapaDetalleId = req.query.id || null;
        if (!mapaDetalleId)
          return res.status(400).json({ ok: false, error: 'id requerido' });
        var mapaDetalleRows = await sql(
          'SELECT m.id, m.usuario_id, m.nombre, m.emoji, m.descripcion, m.publico, m.creado_en, m.actualizado_en,'
          + ' u.nombre AS autor'
          + ' FROM mapas m'
          + ' JOIN usuarios u ON u.id = m.usuario_id'
          + ' WHERE m.id = $1 LIMIT 1',
          [mapaDetalleId]
        );
        if (!mapaDetalleRows.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });
        var mapaDetalle = mapaDetalleRows[0];
        if (!mapaDetalle.publico) {
          if (!usuarioId || usuarioId !== mapaDetalle.usuario_id)
            return res.status(403).json({ ok: false, error: 'No autorizado' });
        }
        var mapaDestinos = await sql(
          'SELECT d.id AS destino_id, d.nombre, d.slug, d.foto_hero, d.ciudad, d.categoria_slug, d.lat, d.lng'
          + ' FROM mapa_destinos md'
          + ' JOIN destinos d ON d.id = md.destino_id'
          + ' WHERE md.mapa_id = $1'
          + ' ORDER BY md.orden, md.creado_en',
          [mapaDetalleId]
        );
        return res.status(200).json({ ok: true, data: { mapa: mapaDetalle, destinos: mapaDestinos } });
      }

      // Salas de chat (espec comunidad 2026-09-08): lista de salas activas
      // con el ultimo mensaje, su autor y el total de mensajes (para el
      // listado estilo "room"). El contador de "online" es decorativo en
      // el frontend (sin websockets en Vercel Hobby); aqui solo se sirve
      // el dato de contenido.
      if (tipo === 'chat_salas') {
        var salasRows = await sql(
          'SELECT s.id, s.nombre, s.icono, s.descripcion, s.tipo, s.creador_id, s.creado_en,'
          + ' (SELECT m.texto FROM chat_mensajes m'
          + '   WHERE m.sala_id = s.id AND m.activo = true ORDER BY m.creado_en DESC LIMIT 1) AS ultimo_texto,'
          + ' (SELECT COALESCE(NULLIF(m.nombre,\'\'), u.nombre, \'Viajero\') FROM chat_mensajes m'
          + '   LEFT JOIN usuarios u ON u.id = m.usuario_id'
          + '   WHERE m.sala_id = s.id AND m.activo = true ORDER BY m.creado_en DESC LIMIT 1) AS ultimo_usuario,'
          + ' (SELECT COUNT(*)::int FROM chat_mensajes m'
          + '   WHERE m.sala_id = s.id AND m.activo = true) AS total_mensajes'
          + ' FROM chat_salas s'
          + ' WHERE s.activo = true'
          + ' ORDER BY s.orden DESC, s.creado_en ASC',
          []
        );
        return res.status(200).json({ ok: true, data: salasRows });
      }

      // Mensajes de una sala (espec comunidad 2026-09-08): ultimos 100,
      // mas recientes primero; el frontend los invierte para mostrar en
      // orden cronologico.
      if (tipo === 'chat_mensajes' && req.query.sala_id) {
        var msgsRows = await sql(
          'SELECT m.id, m.usuario_id, m.texto, m.fijado, m.creado_en,'
          + ' COALESCE(NULLIF(m.nombre,\'\'), u.nombre, \'Viajero\') AS nombre,'
          + ' COALESCE(u.avatar_url, \'\') AS avatar_url'
          + ' FROM chat_mensajes m'
          + ' LEFT JOIN usuarios u ON u.id = m.usuario_id'
          + ' WHERE m.sala_id = $1 AND m.activo = true'
          + ' ORDER BY m.creado_en DESC'
          + ' LIMIT 100',
          [req.query.sala_id]
        );
        return res.status(200).json({ ok: true, data: msgsRows });
      }

      // Planes de viaje colectivos (espec comunidad 2026-09-08): listado
      // con miembros actuales derivados por COUNT y marca 'unido' para el
      // usuario que consulta (EXISTS con $1; si no hay usuario_id, false).
      if (tipo === 'planes') {
        var planesRows = await sql(
          'SELECT p.id, p.destino, p.fechas, p.cupos, p.descripcion, p.creador_id, p.creado_en,'
          + ' (SELECT COUNT(*)::int FROM planes_miembros pm WHERE pm.plan_id = p.id) AS miembros_actuales,'
          + ' (SELECT u.nombre FROM usuarios u WHERE u.id = p.creador_id) AS creador_nombre,'
          + ' EXISTS(SELECT 1 FROM planes_miembros pm WHERE pm.plan_id = p.id AND pm.usuario_id = $1) AS unido'
          + ' FROM planes_viaje p'
          + ' WHERE p.activo = true'
          + ' ORDER BY p.creado_en DESC'
          + ' LIMIT 50',
          [usuarioId]
        );
        return res.status(200).json({ ok: true, data: planesRows });
      }

      // Planes creados por el usuario (para gestion y compartir).
      if (tipo === 'planes_mios' && usuarioId) {
        var planesMiosRows = await sql(
          'SELECT p.id, p.destino, p.fechas, p.cupos, p.descripcion, p.creado_en,'
          + ' (SELECT COUNT(*)::int FROM planes_miembros pm WHERE pm.plan_id = p.id) AS miembros_actuales'
          + ' FROM planes_viaje p'
          + ' WHERE p.creado_id = $1 AND p.activo = true'
          + ' ORDER BY p.creado_en DESC'
          + ' LIMIT 50',
          [usuarioId]
        );
        return res.status(200).json({ ok: true, data: planesMiosRows });
      }

      // Tabla de Destino (Albion, Milestones v2 / ADR-014): tres senderos
      // de especializacion (Explorador, Critico, Organizador) que
      // progresan en paralelo al XP general. Cada sendero suma "fama"
      // derivada de las acciones reales (columna xp_ganado de
      // interacciones, mas los mapas tematicos). Los niveles por sendero
      // se derivan en cada lectura (FAMA_TIERS), nunca se persisten.
      // patrocinios llega vacio: la capa SKATE de patrocinios queda
      // como opcion abierta (ver DECISIONS.md ADR-014).
      if (tipo === 'tabla_destino' && usuarioId) {
        var tdUser = await sql(
          'SELECT id FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        if (!tdUser.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });

        var famaExplorador = await sql(
          'SELECT COALESCE(SUM(xp_ganado),0)::int AS fama, '
          + ' COUNT(*) FILTER (WHERE i.tipo=\'guardado\' AND i.activo=true)::int AS n_guardados, '
          + ' COUNT(*) FILTER (WHERE i.tipo=\'visita\')::int AS n_visitas '
          + ' FROM interacciones i WHERE i.usuario_id=$1 '
          + '   AND (i.tipo=\'visita\' OR (i.tipo=\'guardado\' AND i.activo=true))',
          [usuarioId]
        );
        var famaCritico = await sql(
          'SELECT COALESCE(SUM(xp_ganado),0)::int AS fama, '
          + ' COUNT(*) FILTER (WHERE i.tipo=\'resena\')::int AS n_resenas, '
          + ' COUNT(*) FILTER (WHERE i.tipo=\'rating\')::int AS n_votos '
          + ' FROM interacciones i WHERE i.usuario_id=$1 '
          + '   AND i.tipo IN (\'resena\',\'rating\')',
          [usuarioId]
        );
        var famaOrganizador = await sql(
          'SELECT COALESCE(COUNT(m.id),0)::int AS n_mapas, '
          + ' COALESCE(COUNT(*) FILTER (WHERE m.publico=true),0)::int AS n_publicos, '
          + ' COALESCE(SUM(nm.n_destinos),0)::int AS n_destinos '
          + ' FROM mapas m '
          + ' LEFT JOIN (SELECT mapa_id, COUNT(*)::int AS n_destinos FROM mapa_destinos GROUP BY mapa_id) nm '
          + '   ON nm.mapa_id = m.id '
          + ' WHERE m.usuario_id=$1',
          [usuarioId]
        );

        function nivelSendero(fama, TIERS) {
          var idx = 0;
          for (var i = 0; i < TIERS.length; i++) {
            if (fama >= TIERS[i].min) idx = i;
          }
          var cur = TIERS[idx];
          var next = TIERS[idx + 1] || null;
          var progreso = next
            ? Math.min(100, Math.round(((fama - cur.min) / (next.min - cur.min)) * 100))
            : 100;
          return {
            nivel: idx + 1,
            nombre: cur.nombre,
            min: cur.min,
            max: next ? next.min : null,
            progreso: progreso,
            total: TIERS.length,
          };
        }

        var FAMA_TIERS = [
          { min: 0,   nombre: 'Semilla' },
          { min: 100, nombre: 'Aprendiz' },
          { min: 250, nombre: 'Practicante' },
          { min: 450, nombre: 'Especialista' },
          { min: 700, nombre: 'Maestro' },
        ];

        var fe = famaExplorador[0] || { fama: 0, n_guardados: 0, n_visitas: 0 };
        var fc = famaCritico[0] || { fama: 0, n_resenas: 0, n_votos: 0 };
        var fo = famaOrganizador[0] || { n_mapas: 0, n_publicos: 0, n_destinos: 0 };
        var famaOrg = (fo.n_mapas * 40) + (fo.n_destinos * 5);

        var senderos = [
          {
            id: 'explorador', nombre: 'Explorador', emoji: '\uD83E\uDDED',
            descripcion: 'Guarda destinos (+5) y confirma visitas (+20)',
            fama: fe.fama, acciones: { guardados: fe.n_guardados, visitas: fe.n_visitas },
            sendero: nivelSendero(fe.fama, FAMA_TIERS),
          },
          {
            id: 'critico', nombre: 'Cr\u00edtico', emoji: '\u2B50',
            descripcion: 'Escribe rese\u00f1as (+10/+25) y vota (+10)',
            fama: fc.fama, acciones: { resenas: fc.n_resenas, votos: fc.n_votos },
            sendero: nivelSendero(fc.fama, FAMA_TIERS),
          },
          {
            id: 'organizador', nombre: 'Organizador', emoji: '\uD83D\uDDFA',
            descripcion: 'Crea mapas tem\u00e1ticos y agrega destinos',
            fama: famaOrg, acciones: { mapas: fo.n_mapas, publicos: fo.n_publicos, destinos: fo.n_destinos },
            sendero: nivelSendero(famaOrg, FAMA_TIERS),
          },
        ];

        return res.status(200).json({
          ok: true,
          data: { senderos: senderos, patrocinios: [] },
        });
      }

      // --- Albums fotograficos (ADR-017) ---

      // Listado de albumes con filtros
      if (tipo === 'albumes') {
        var albumUsuarioId = req.query.usuario_id || null;
        var albumCiudad = req.query.ciudad || null;
        var albumTipo = req.query.tipo || null;
        var albumLimit = Math.min(parseInt(req.query.limit || '20'), 50);
        var albumOffset = parseInt(req.query.offset || '0');
        var albumOrden = req.query.orden || 'recientes';

        var albumParams = [];
        var np = 0;
        var albumWhere = ' WHERE a.activo = true';
        if (albumUsuarioId) { np++; albumWhere += ' AND a.usuario_id = $' + np; albumParams.push(albumUsuarioId); }
        if (albumCiudad) { np++; albumWhere += ' AND a.ciudad = $' + np; albumParams.push(albumCiudad); }
        if (albumTipo) { np++; albumWhere += ' AND a.tipo = $' + np; albumParams.push(albumTipo); }
        np++; var albumLimitIdx = np; albumParams.push(albumLimit);
        np++; var albumOffsetIdx = np; albumParams.push(albumOffset);
        var albumesRows = await sql(
          'SELECT a.id, a.usuario_id, a.titulo, a.descripcion, a.tipo,'
          + ' a.lat, a.lng, a.ciudad, a.region, a.portada_url, a.es_top,'
          + ' a.creado_en, u.nombre AS autor_nombre,'
          + ' (SELECT COUNT(*)::int FROM album_fotos af WHERE af.album_id = a.id AND af.activo=true) AS fotos_count,'
          + ' (SELECT COUNT(*)::int FROM album_fotos af2'
          + '  JOIN album_votos av ON av.foto_id = af2.id'
          + '  WHERE af2.album_id = a.id) AS votos_count'
          + ' FROM albumes a'
          + ' LEFT JOIN usuarios u ON u.id = a.usuario_id'
          + albumWhere
          + ' ORDER BY '
          + (albumOrden === 'populares' ? 'votos_count DESC' :
             albumOrden === 'top' ? 'a.es_top DESC, votos_count DESC' :
             'a.creado_en DESC')
          + ' LIMIT $' + albumLimitIdx
          + ' OFFSET $' + albumOffsetIdx,
          albumParams
        );
        return res.status(200).json({ ok: true, data: albumesRows });
      }

      // Detalle de un album con sus fotos
      if (tipo === 'album_detalle' && req.query.album_id) {
        var albumId = req.query.album_id;
        var albumDetRows = await sql(
          'SELECT a.*, u.nombre AS autor_nombre,'
          + ' (SELECT COUNT(*)::int FROM album_fotos af WHERE af.album_id = a.id AND af.activo=true) AS fotos_count'
          + ' FROM albumes a LEFT JOIN usuarios u ON u.id = a.usuario_id'
          + ' WHERE a.id = $1 AND a.activo = true',
          [albumId]
        );
        if (!albumDetRows.length)
          return res.status(404).json({ ok: false, error: 'Album no encontrado' });

        var fotosDetRows = await sql(
          'SELECT af.id, af.foto_url, af.foto_type, af.media_title, af.media_source,'
          + ' af.autor_original_id, af.agregador_id, af.creado_en,'
          + ' u.nombre AS autor_nombre,'
          + ' (SELECT COUNT(*)::int FROM album_votos av WHERE av.foto_id = af.id) AS votos'
          + ' FROM album_fotos af'
          + ' LEFT JOIN usuarios u ON u.id = af.autor_original_id'
          + ' WHERE af.album_id = $1 AND af.activo = true'
          + ' ORDER BY af.creado_en ASC',
          [albumId]
        );

        // Marcar ya_votado para el usuario actual
        var yaVotoAlbum = {};
        if (usuarioId) {
          var misVotosAlbum = await sql(
            'SELECT foto_id FROM album_votos WHERE usuario_id=$1',
            [usuarioId]
          );
          misVotosAlbum.forEach(function(v){ yaVotoAlbum[String(v.foto_id)] = true; });
        }
        fotosDetRows.forEach(function(r){ r.ya_votado = !!yaVotoAlbum[String(r.id)]; });

        return res.status(200).json({ ok: true, album: albumDetRows[0], fotos: fotosDetRows });
      }

      // Mapa audiovisual: UNION de album_fotos (con lat/lng del album) + destinos_fotos.
      // Nota: en un UNION, $N se comparte entre ambas ramas. Usamos $1/$2 fijos.
      if (tipo === 'multimedia_mapa') {
        var mmTipo = req.query.tipo_media || null;
        var mmCiudad = req.query.ciudad || null;
        var mmParams = [];
        var np = 0;
        if (mmTipo) { np++; mmParams.push(mmTipo); }
        if (mmCiudad) { np++; mmParams.push(mmCiudad); }

        var multimediaRows = await sql(
          '('
          + ' SELECT af.foto_url AS media_url, af.foto_type AS media_type,'
          + '  af.media_title, af.media_source, a.lat, a.lng, a.ciudad,'
          + '  a.titulo AS album_titulo, u.nombre AS autor_nombre,'
          + '  \'album\' AS origen, a.id AS origen_id,'
          + '  (SELECT COUNT(*)::int FROM album_votos av WHERE av.foto_id = af.id) AS votos'
          + ' FROM album_fotos af'
          + ' JOIN albumes a ON a.id = af.album_id'
          + ' LEFT JOIN usuarios u ON u.id = af.autor_original_id'
          + ' WHERE a.lat IS NOT NULL AND a.lng IS NOT NULL AND a.activo=true AND af.activo=true'
          + (mmTipo ? ' AND af.foto_type = $1' : '')
          + (mmCiudad ? ' AND a.ciudad = $' + (mmTipo ? '2' : '1') : '')
          + ') UNION ALL ('
          + ' SELECT df.url AS media_url, \'foto\' AS media_type,'
          + '  df.caption AS media_title, \'\' AS media_source, d.lat, d.lng, d.ciudad,'
          + '  d.nombre AS album_titulo, \'\' AS autor_nombre,'
          + '  \'destino\' AS origen, d.slug AS origen_id, 0 AS votos'
          + ' FROM destinos_fotos df'
          + ' JOIN destinos d ON d.id = df.destino_id'
          + ' WHERE d.lat IS NOT NULL AND d.lng IS NOT NULL AND d.status = \'published\''
          + (mmTipo && mmTipo !== 'foto' ? ' AND FALSE' : '')
          + (mmCiudad ? ' AND d.ciudad = $' + (mmTipo ? '2' : '1') : '')
          + ') ORDER BY votos DESC LIMIT 200',
          mmParams
        );
        return res.status(200).json({ ok: true, data: multimediaRows });
      }

      // Feed de fotos recientes de albumes
      if (tipo === 'mi_feed_fotos') {
        var feedLimit = Math.min(parseInt(req.query.limit || '20'), 50);
        var feedOffset = parseInt(req.query.offset || '0');
        var feedRows = await sql(
          'SELECT af.id, af.foto_url, af.foto_type, af.media_title, af.media_source,'
          + ' a.titulo AS album_titulo, a.ciudad, a.id AS album_id,'
          + ' u.nombre AS autor_nombre,'
          + ' (SELECT COUNT(*)::int FROM album_votos av WHERE av.foto_id = af.id) AS votos,'
          + ' af.creado_en'
          + ' FROM album_fotos af'
          + ' JOIN albumes a ON a.id = af.album_id'
          + ' LEFT JOIN usuarios u ON u.id = af.autor_original_id'
          + ' WHERE af.activo = true AND a.activo = true'
          + ' ORDER BY af.creado_en DESC'
          + ' LIMIT $1 OFFSET $2',
          [feedLimit, feedOffset]
        );
        return res.status(200).json({ ok: true, data: feedRows });
      }

      // Top fotos para curacion de directorios (por coord match)
      if (tipo === 'fotos_top' && destinoId) {
        var ftRows = await sql(
          'SELECT af.id, af.foto_url, af.foto_type, af.media_title,'
          + ' u.nombre AS autor_nombre, a.titulo AS album_titulo,'
          + ' (SELECT COUNT(*)::int FROM album_votos av WHERE av.foto_id = af.id) AS votos'
          + ' FROM album_fotos af'
          + ' JOIN albumes a ON a.id = af.album_id'
          + ' LEFT JOIN usuarios u ON u.id = af.autor_original_id'
          + ' JOIN destinos d ON d.id = $1'
          + ' WHERE af.activo = true AND a.activo = true'
          + ' AND a.lat IS NOT NULL AND a.lng IS NOT NULL'
          + ' AND ABS(a.lat - d.lat) < 0.01 AND ABS(a.lng - d.lng) < 0.01'
          + ' ORDER BY votos DESC LIMIT 10',
          [destinoId]
        );
        return res.status(200).json({ ok: true, data: ftRows });
      }

      return res.status(400).json({ ok: false, error: 'Par\u00e1metros insuficientes' });
    }

    // -- POST ---------------------------------------------------------
    if (req.method === 'POST') {
      var body = req.body || {};
      var tipo2     = body.tipo;
      var destinoId2= body.destino_id;
      var usuarioId2= body.usuario_id || null;

      // -- Mapas tematicos (spec mapas publicos/privados 2026-09-05) --
      // Se manejan ANTES del guard generico de destino_id porque
      // mapa_crear / mapa_editar / mapa_eliminar no reciben destino_id.
      // Cero Borrado Logico: el DELETE de un mapa borra la fila (CASCADE
      // limpia mapa_destinos); aqui si es un borrado fisico legitimo (el
      // mapa es del usuario logueado y no hay XP de por medio).
      if (tipo2 === 'mapa_crear' || tipo2 === 'mapa_editar'
          || tipo2 === 'mapa_eliminar'
          || tipo2 === 'mapa_agregar_destino'
          || tipo2 === 'mapa_quitar_destino') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });

        if (tipo2 === 'mapa_crear') {
          var nombreNuevo = String(body.nombre || '').trim();
          if (!nombreNuevo)
            return res.status(400).json({ ok: false, error: 'nombre no puede estar vacio' });
          if (nombreNuevo.length > 80)
            return res.status(400).json({ ok: false, error: 'nombre debe tener maximo 80 caracteres' });
          var emojiNuevo = String(body.emoji || '').trim().slice(0, 8);
          var descNueva = String(body.descripcion || '').trim().slice(0, 1000);
          if (emojiNuevo) {
            var mapaNuevoRows = await sql(
              'INSERT INTO mapas (usuario_id, nombre, emoji, descripcion) VALUES ($1, $2, $3, $4) RETURNING id, publico',
              [usuarioId2, nombreNuevo, emojiNuevo, descNueva]
            );
          } else {
            // Sin emoji: se omite la columna para que aplique el DEFAULT
            // E'\U0001F5FA' de la migracion 006 (bug historico 026: en
            // ASCII-safe no entra el glifo; el servidor lo inyecta).
            var mapaNuevoRows = await sql(
              'INSERT INTO mapas (usuario_id, nombre, descripcion) VALUES ($1, $2, $3) RETURNING id, publico',
              [usuarioId2, nombreNuevo, descNueva]
            );
          }
          return res.status(200).json({ ok: true, id: mapaNuevoRows[0].id, publico: mapaNuevoRows[0].publico });
        }

        if (tipo2 === 'mapa_editar') {
          var mapaEditarId = body.mapa_id || null;
          if (!mapaEditarId)
            return res.status(400).json({ ok: false, error: 'mapa_id requerido' });
          var mapaEditarRows = await sql(
            'SELECT id FROM mapas WHERE id = $1 AND usuario_id = $2 LIMIT 1',
            [mapaEditarId, usuarioId2]
          );
          if (!mapaEditarRows.length)
            return res.status(404).json({ ok: false, error: 'No encontrado' });
          var setsEditar = ['actualizado_en = NOW()'];
          var valsEditar = [];
          var piEditar = 1;
          if (body.nombre !== undefined && body.nombre !== null) {
            var nombreEditado = String(body.nombre).trim();
            if (!nombreEditado)
              return res.status(400).json({ ok: false, error: 'nombre no puede estar vacio' });
            if (nombreEditado.length > 80)
              return res.status(400).json({ ok: false, error: 'nombre debe tener maximo 80 caracteres' });
            setsEditar.push('nombre = $' + piEditar);
            valsEditar.push(nombreEditado);
            piEditar++;
          }
          if (body.emoji !== undefined && body.emoji !== null) {
            setsEditar.push('emoji = $' + piEditar);
            valsEditar.push(String(body.emoji).trim().slice(0, 8));
            piEditar++;
          }
          if (body.descripcion !== undefined && body.descripcion !== null) {
            setsEditar.push('descripcion = $' + piEditar);
            valsEditar.push(String(body.descripcion).trim().slice(0, 1000));
            piEditar++;
          }
          if (body.publico !== undefined && body.publico !== null) {
            setsEditar.push('publico = $' + piEditar);
            valsEditar.push(body.publico === true || body.publico === 'true' || body.publico === 1 || body.publico === '1');
            piEditar++;
          }
          valsEditar.push(mapaEditarId);
          var mapaEditadoRows = await sql(
            'UPDATE mapas SET ' + setsEditar.join(', ') + ' WHERE id = $' + piEditar + ' RETURNING id, nombre, emoji, descripcion, publico',
            valsEditar
          );
          return res.status(200).json({ ok: true, data: mapaEditadoRows[0] });
        }

        if (tipo2 === 'mapa_eliminar') {
          var mapaEliminarId = body.mapa_id || null;
          if (!mapaEliminarId)
            return res.status(400).json({ ok: false, error: 'mapa_id requerido' });
          var mapaEliminado = await sql(
            'DELETE FROM mapas WHERE id = $1 AND usuario_id = $2 RETURNING id',
            [mapaEliminarId, usuarioId2]
          );
          if (!mapaEliminado.length)
            return res.status(404).json({ ok: false, error: 'No encontrado' });
          return res.status(200).json({ ok: true });
        }

        if (tipo2 === 'mapa_agregar_destino') {
          var mapaAgregarId = body.mapa_id || null;
          var destinoAgregarId = body.destino_id || null;
          if (!mapaAgregarId || !destinoAgregarId)
            return res.status(400).json({ ok: false, error: 'mapa_id y destino_id requeridos' });
          var mapaDuenoRows = await sql(
            'SELECT id FROM mapas WHERE id = $1 AND usuario_id = $2 LIMIT 1',
            [mapaAgregarId, usuarioId2]
          );
          if (!mapaDuenoRows.length)
            return res.status(404).json({ ok: false, error: 'No encontrado' });
          var destinoInsertRows = await sql(
            'INSERT INTO mapa_destinos (mapa_id, destino_id, orden)'
            + ' SELECT $1, $2, COALESCE((SELECT MAX(orden) + 1 FROM mapa_destinos WHERE mapa_id = $1), 0)'
            + ' ON CONFLICT (mapa_id, destino_id) DO NOTHING RETURNING mapa_id',
            [mapaAgregarId, destinoAgregarId]
          );
          return res.status(200).json({ ok: true, ya_incluido: destinoInsertRows.length === 0 });
        }

        if (tipo2 === 'mapa_quitar_destino') {
          var mapaQuitarId = body.mapa_id || null;
          var destinoQuitarId = body.destino_id || null;
          if (!mapaQuitarId || !destinoQuitarId)
            return res.status(400).json({ ok: false, error: 'mapa_id y destino_id requeridos' });
          var mapaQuitarRows = await sql(
            'SELECT id FROM mapas WHERE id = $1 AND usuario_id = $2 LIMIT 1',
            [mapaQuitarId, usuarioId2]
          );
          if (!mapaQuitarRows.length)
            return res.status(404).json({ ok: false, error: 'No encontrado' });
          await sql(
            'DELETE FROM mapa_destinos WHERE mapa_id = $1 AND destino_id = $2',
            [mapaQuitarId, destinoQuitarId]
          );
          return res.status(200).json({ ok: true });
        }
      }

      // -- Chat y Planes reales (espec comunidad 2026-09-08) ---------
      // Se manejan ANTES del guard generico de destino_id porque operan
      // sobre salas/planes, no sobre destinos. Todos validan capacidad
      // server-side via misionCompletada() y, cuando hay XP (chat),
      // aplican el tope diario anti-farming (chatXpDisponible).
      // Las capacidades las traduce api/usuarios.js desde
      // usuarios.progreso_misiones (DESBLOQUEOS).

      // Crear sala de chat (capacidad crear_chat, nivel 5).
      if (tipo2 === 'chat_sala') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var puedeCrearSala = await misionCompletada(sql, usuarioId2, 'mis_chat_creador');
        if (!puedeCrearSala)
          return res.status(403).json({ ok: false, error: 'Desbloquea Creador de salas (nivel 5) para crear salas' });
        var salaNombre = String(body.nombre || '').trim();
        if (!salaNombre)
          return res.status(400).json({ ok: false, error: 'nombre requerido' });
        if (salaNombre.length > 40)
          return res.status(400).json({ ok: false, error: 'nombre maximo 40 caracteres' });
        var salaIcono = String(body.icono || '\uD83D\uDCAC').slice(0, 8);
        var salaDesc = String(body.descripcion || '').trim().slice(0, 120);
        var salaIns = await sql(
          'INSERT INTO chat_salas (nombre, icono, descripcion, tipo, orden, creador_id) '
          + 'VALUES ($1, $2, $3, \'viajeros\', 0, $4) RETURNING id',
          [salaNombre, salaIcono, salaDesc, usuarioId2]
        );
        return res.status(200).json({ ok: true, id: salaIns[0].id });
      }

      // Enviar mensaje (capacidad chat, nivel 3). +2 XP con tope diario
      // de 20 XP; evalua misiones y logros en cada envio.
      if (tipo2 === 'chat_msg') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var puedeChat = await misionCompletada(sql, usuarioId2, 'mis_chat_mensajero');
        if (!puedeChat)
          return res.status(403).json({ ok: false, error: 'Desbloquea el chat (nivel 3, 250 XP) para escribir mensajes' });
        var msgSala = String(body.sala_id || '');
        var msgTexto = String(body.texto || '').trim();
        if (!msgSala)
          return res.status(400).json({ ok: false, error: 'sala_id requerido' });
        if (!msgTexto)
          return res.status(400).json({ ok: false, error: 'mensaje vacio' });
        if (msgTexto.length > 500)
          return res.status(400).json({ ok: false, error: 'mensaje maximo 500 caracteres' });
        var salaValida = await sql(
          'SELECT id FROM chat_salas WHERE id=$1 AND activo=true LIMIT 1',
          [msgSala]
        ).catch(function(){ return []; });
        if (!salaValida.length)
          return res.status(404).json({ ok: false, error: 'Sala no encontrada' });
        var autorMsg = await sql('SELECT nombre FROM usuarios WHERE id=$1 LIMIT 1', [usuarioId2]).catch(function(){ return []; });
        var nombreMsg = autorMsg[0] && autorMsg[0].nombre ? String(autorMsg[0].nombre).slice(0, 60) : 'Viajero';
        var msgIns = await sql(
          'INSERT INTO chat_mensajes (sala_id, usuario_id, nombre, texto) '
          + 'VALUES ($1, $2, $3, $4) RETURNING id, creado_en',
          [msgSala, usuarioId2, nombreMsg, msgTexto]
        );
        var xpChat = 0, misionesChat = [], logrosChat = [];
        var dispChat = await chatXpDisponible(sql, usuarioId2);
        if (dispChat.disponible) {
          xpChat = dispChat.xp;
          await sql(
            'UPDATE usuarios SET xp_total = xp_total + $1, ultimo_acceso = NOW() WHERE id = $2',
            [xpChat, usuarioId2]
          ).catch(function(){});
          await registrarChatXp(sql, usuarioId2, dispChat.hoy, dispChat.n);
        }
        misionesChat = await evaluarMisiones(sql, usuarioId2);
        logrosChat = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({
          ok: true,
          id: msgIns[0].id,
          creado_en: msgIns[0].creado_en,
          xp: xpChat,
          misiones: misionesChat,
          logros: logrosChat
        });
      }

      // Moderacion de chat (capacidad moderador_chat, nivel 4): fijar
      // (toggle) o eliminar (soft-delete) un mensaje de una sala.
      if (tipo2 === 'chat_mod') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var puedeMod = await misionCompletada(sql, usuarioId2, 'mis_chat_moderador');
        if (!puedeMod)
          return res.status(403).json({ ok: false, error: 'Desbloquea Moderador de chat (nivel 4) para moderar' });
        var modSala = String(body.sala_id || '');
        var modMsgId = String(body.msg_id || '');
        var modAccion = String(body.accion || '');
        if (!modSala || !modMsgId)
          return res.status(400).json({ ok: false, error: 'sala_id y msg_id requeridos' });
        if (modAccion !== 'fijar' && modAccion !== 'eliminar')
          return res.status(400).json({ ok: false, error: 'accion debe ser fijar o eliminar' });
        var modTarget = await sql(
          'SELECT id FROM chat_mensajes WHERE id=$1 AND sala_id=$2 AND activo=true LIMIT 1',
          [modMsgId, modSala]
        ).catch(function(){ return []; });
        if (!modTarget.length)
          return res.status(404).json({ ok: false, error: 'Mensaje no encontrado' });
        if (modAccion === 'fijar') {
          await sql('UPDATE chat_mensajes SET fijado = NOT fijado WHERE id = $1', [modMsgId]);
        } else {
          await sql('UPDATE chat_mensajes SET activo = false WHERE id = $1', [modMsgId]);
        }
        return res.status(200).json({ ok: true });
      }

      // Crear plan de viaje (gate: chat desbloqueado, nivel 3). El XP
      // llega por la mision mis_plan_creador (25 XP, una vez).
      if (tipo2 === 'plan_crear') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var puedePlan = await misionCompletada(sql, usuarioId2, 'mis_chat_mensajero');
        if (!puedePlan)
          return res.status(403).json({ ok: false, error: 'Desbloquea el chat (nivel 3) para crear planes' });
        var planDestino = String(body.destino || '').trim();
        var planFechas = String(body.fechas || '').trim();
        var planCupos = parseInt(body.cupos, 10);
        var planDesc = String(body.descripcion || '').trim();
        if (!planDestino)
          return res.status(400).json({ ok: false, error: 'destino requerido' });
        if (planDestino.length > 80)
          return res.status(400).json({ ok: false, error: 'destino maximo 80 caracteres' });
        if (isNaN(planCupos) || planCupos < 1 || planCupos > 50)
          return res.status(400).json({ ok: false, error: 'cupos debe ser entre 1 y 50' });
        if (planFechas.length > 60)
          return res.status(400).json({ ok: false, error: 'fechas maximo 60 caracteres' });
        if (planDesc.length > 300)
          return res.status(400).json({ ok: false, error: 'descripcion maximo 300 caracteres' });
        var planIns = await sql(
          'INSERT INTO planes_viaje (destino, fechas, cupos, descripcion, creador_id) '
          + 'VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [planDestino, planFechas, planCupos, planDesc, usuarioId2]
        );
        var misionesPlan = await evaluarMisiones(sql, usuarioId2);
        var logrosPlan = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, id: planIns[0].id, xp: 0, misiones: misionesPlan, logros: logrosPlan });
      }

      // Unirse a un plan (libre para registrados). Dedup por PK (409),
      // 403 si es el plan propio, 409 si esta lleno. El XP llega por la
      // mision mis_plan_unido (15 XP, una vez).
      if (tipo2 === 'plan_unirse') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var joinPlan = String(body.plan_id || '');
        if (!joinPlan)
          return res.status(400).json({ ok: false, error: 'plan_id requerido' });
        var planRow = await sql(
          'SELECT id, creador_id, cupos FROM planes_viaje WHERE id=$1 AND activo=true LIMIT 1',
          [joinPlan]
        ).catch(function(){ return []; });
        if (!planRow.length)
          return res.status(404).json({ ok: false, error: 'Plan no encontrado' });
        if (planRow[0].creador_id === usuarioId2)
          return res.status(403).json({ ok: false, error: 'No puedes unirte a tu propio plan' });
        var miembrosNow = await sql(
          'SELECT COUNT(*)::int AS n FROM planes_miembros WHERE plan_id=$1',
          [joinPlan]
        ).catch(function(){ return []; });
        var nMiembros = (miembrosNow[0] && parseInt(miembrosNow[0].n, 10)) || 0;
        if (nMiembros >= (parseInt(planRow[0].cupos, 10) || 0))
          return res.status(409).json({ ok: false, error: 'Plan lleno' });
        try {
          await sql(
            'INSERT INTO planes_miembros (plan_id, usuario_id) VALUES ($1, $2)',
            [joinPlan, usuarioId2]
          );
        } catch (eJoin) {
          return res.status(409).json({ ok: false, error: 'Ya estas en este plan' });
        }
        var misionesJoin = await evaluarMisiones(sql, usuarioId2);
        var logrosJoin = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, xp: 0, misiones: misionesJoin, logros: logrosJoin });
      }

      // Salir de un plan.
      if (tipo2 === 'plan_salir') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var leavePlan = String(body.plan_id || '');
        if (!leavePlan)
          return res.status(400).json({ ok: false, error: 'plan_id requerido' });
        await sql(
          'DELETE FROM planes_miembros WHERE plan_id=$1 AND usuario_id=$2',
          [leavePlan, usuarioId2]
        );
        return res.status(200).json({ ok: true });
      }

      // -- Review_voto (Milestones v2 / ADR-014, SKATE "Own the Spot") --
      // Voto util sobre una resena existente. Se maneja ANTES del guard
      // generico de destino_id porque recibe resena_id, no destino_id.
      // Dedup por usuario+resena (tabla resena_votos, PK compuesta);
      // incrementa votos_utiles en la fila de la resena. No otorga XP:
      // es un voto de utilidad, no una accion de viaje. Requiere la
      // migracion 007 (tabla resena_votos).
      if (tipo2 === 'review_voto') {
        var resenaVotoId = body.resena_id || null;
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        if (!resenaVotoId)
          return res.status(400).json({ ok: false, error: 'resena_id requerido' });

        var resenaVotoTarget = await sql(
          'SELECT id, usuario_id AS autor_id FROM interacciones WHERE id=$1 AND tipo=\'resena\' LIMIT 1',
          [resenaVotoId]
        ).catch(function(){ return []; });
        if (!resenaVotoTarget.length)
          return res.status(404).json({ ok: false, error: 'Resena no encontrada' });

        // H-1 (QA Milestones v2): un autor no puede votar su propia
        // resena como util -- seria un "self-vote" que lo corona lider
        // del spot (y x1.1 en toda la ciudad) sin merito real.
        if (resenaVotoTarget[0].autor_id && resenaVotoTarget[0].autor_id === usuarioId2)
          return res.status(403).json({ ok: false, error: 'No puedes votar tu propia resena' });

        var yaVotoUtil = await sql(
          'SELECT 1 AS uno FROM resena_votos WHERE usuario_id=$1 AND resena_id=$2 LIMIT 1',
          [usuarioId2, resenaVotoId]
        ).catch(function(){ return []; });
        if (yaVotoUtil.length > 0)
          return res.status(409).json({
            ok: false,
            error: 'Ya votaste esta resena como util',
            ya_votado: true,
          });

        // H-2 (QA Milestones v2): la escritura NO se silencia. Si la
        // migracion 007 (tabla resena_votos / votos_utiles) no corrio,
        // el POST debe fallar con 503 en vez de responder 200 sin
        // persistir nada (Regla de Oro: no capturar generico que
        // silencie fallos de integracion).
        try {
          await sql(
            'INSERT INTO resena_votos (usuario_id, resena_id) VALUES ($1,$2)',
            [usuarioId2, resenaVotoId]
          );
          await sql(
            'UPDATE interacciones SET votos_utiles = votos_utiles + 1 WHERE id=$1',
            [resenaVotoId]
          );
        } catch (eReviewVoto) {
          console.error('[interacciones] review_voto fallo (migracion 007 pendiente?): ' + eReviewVoto.message);
          return res.status(503).json({ ok: false, error: 'Voto util no disponible: migracion pendiente' });
        }

        return res.status(200).json({ ok: true, votos_utiles: 1 });
      }

      // -- Foto de viajero (desbloqueable: capacidad subir_fotos) --
      // Subir foto a un destino: se persiste como interaccion tipo='foto'
      // con texto=URL. Requiere la mision 'mis_fotografo' completada
      // (Nivel 2 + primera resena). +15 XP.
      if (tipo2 === 'foto') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        if (!destinoId2)
          return res.status(400).json({ ok: false, error: 'destino_id requerido' });
        var fotoUrl = String(body.url || body.foto_url || '').trim();
        if (!/^https?:\/\//.test(fotoUrl) || fotoUrl.length > 2000)
          return res.status(400).json({ ok: false, error: 'URL de foto inv\u00e1lida' });
        var capFoto = await sql(
          "SELECT (progreso_misiones->'mis_fotografo'->>'estado') = 'completada' AS ok FROM usuarios WHERE id=$1",
          [usuarioId2]
        ).catch(function(){ return []; });
        if (!(capFoto[0] && capFoto[0].ok))
          return res.status(403).json({ ok: false, error: 'Desbloquea Subir fotos (nivel 2) para publicar fotos' });

        var fotoIns = await sql(
          "INSERT INTO interacciones (destino_id, usuario_id, tipo, texto, xp_ganado, creado_en) "
          + "VALUES ($1, $2, 'foto', $3, 15, NOW()) RETURNING id",
          [destinoId2, usuarioId2, fotoUrl]
        );
        var misionesFoto = [], logrosFoto = [];
        await sql('UPDATE usuarios SET xp_total=xp_total+15, ultimo_acceso=NOW() WHERE id=$1', [usuarioId2]).catch(function(){});
        misionesFoto = await evaluarMisiones(sql, usuarioId2);
        logrosFoto = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, id: fotoIns[0].id, xp: 15, misiones: misionesFoto, logros: logrosFoto });
      }

      // -- Voto en foto (+5 XP al votante) --
      // Cada voto es una fila interacciones tipo='foto' con
      // dims->>'voto_foto_id' apuntando a la foto votada. Dedup por
      // usuario+foto; no se puede votar la propia foto.
      if (tipo2 === 'foto_voto') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var fotoVotoId = body.foto_id || null;
        if (!fotoVotoId)
          return res.status(400).json({ ok: false, error: 'foto_id requerido' });
        var fotoTarget = await sql(
          "SELECT id, usuario_id AS autor_id, destino_id FROM interacciones WHERE id=$1 AND tipo='foto' LIMIT 1",
          [fotoVotoId]
        ).catch(function(){ return []; });
        if (!fotoTarget.length)
          return res.status(404).json({ ok: false, error: 'Foto no encontrada' });
        if (fotoTarget[0].autor_id === usuarioId2)
          return res.status(403).json({ ok: false, error: 'No puedes votar tu propia foto' });
        var yaVotoFoto = await sql(
          "SELECT 1 AS uno FROM interacciones WHERE usuario_id=$1 AND tipo='foto' AND activo=true "
          + "AND dims->>'voto_foto_id' = $2 LIMIT 1",
          [usuarioId2, fotoVotoId]
        ).catch(function(){ return []; });
        if (yaVotoFoto.length)
          return res.status(409).json({ ok: false, error: 'Ya votaste esta foto', ya_votado: true });

        await sql(
          "INSERT INTO interacciones (destino_id, usuario_id, tipo, dims, xp_ganado, creado_en) "
          + "VALUES ($1, $2, 'foto', jsonb_build_object('voto_foto_id', $3::text), 5, NOW())",
          [fotoTarget[0].destino_id, usuarioId2, fotoVotoId]
        );
        var misionesFotoVoto = [], logrosFotoVoto = [];
        await sql('UPDATE usuarios SET xp_total=xp_total+5, ultimo_acceso=NOW() WHERE id=$1', [usuarioId2]).catch(function(){});
        misionesFotoVoto = await evaluarMisiones(sql, usuarioId2);
        logrosFotoVoto = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, xp: 5, misiones: misionesFotoVoto, logros: logrosFotoVoto });
      }

      // --- Albums fotograficos POST (ADR-017) ---
      // Se manejan ANTES del guard generico de destino_id porque
      // album_crear / album_agregar_foto / etc. no reciben destino_id.

      // Helpers anti-spam para albums
      function getProgresoAlbum(sql, uid) {
        return sql('SELECT progreso_album FROM usuarios WHERE id=$1', [uid])
          .then(function(r){ return (r[0] && r[0].progreso_album) || {}; })
          .catch(function(){ return {}; });
      }
      function updProgresoAlbum(sql, uid, obj) {
        return sql('UPDATE usuarios SET progreso_album = progreso_album || $1::jsonb WHERE id=$2', [JSON.stringify(obj), uid]).catch(function(){});
      }
      function hoy() { return new Date().toISOString().slice(0, 10); }

      // Crear album
      if (tipo2 === 'album_crear') {
        if (!usuarioId2) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var alTitulo = String(body.titulo || '').trim();
        if (!alTitulo) return res.status(400).json({ ok: false, error: 'titulo requerido' });
        if (alTitulo.length > 120) return res.status(400).json({ ok: false, error: 'titulo maximo 120 caracteres' });

        // Check nivel >= 2
        var nivelCheck = await sql('SELECT xp_total FROM usuarios WHERE id=$1', [usuarioId2]).catch(function(){ return []; });
        var nivelCalc = nivelCheck[0] ? Math.floor(nivelCheck[0].xp_total / 100) + 1 : 1;
        if (nivelCalc < 2) return res.status(403).json({ ok: false, error: 'Nivel insuficiente (requiere nivel 2)' });

        // Anti-spam: max 5 albumes/mes
        var pa = await getProgresoAlbum(sql, usuarioId2);
        var mesActual = hoy().slice(0, 7);
        if ((pa.albumes_mes_fecha || '').slice(0, 7) === mesActual && (pa.albumes_mes || 0) >= 5)
          return res.status(429).json({ ok: false, error: 'Limite de 5 albumes por mes alcanzado' });

        var alDesc = String(body.descripcion || '').trim().slice(0, 1000);
        var alTipo = ['fotos','videos','audio','mixto'].includes(body.tipo) ? body.tipo : 'fotos';
        var alLat = body.lat ? parseFloat(body.lat) : null;
        var alLng = body.lng ? parseFloat(body.lng) : null;
        var alCiudad = String(body.ciudad || '').trim().slice(0, 80) || null;
        var alRegion = String(body.region || '').trim().slice(0, 80) || null;
        var alPortada = String(body.portada_url || '').trim().slice(0, 2000) || null;

        var albumIns = await sql(
          'INSERT INTO albumes (usuario_id, titulo, descripcion, tipo, lat, lng, ciudad, region, portada_url) '
          + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
          [usuarioId2, alTitulo, alDesc, alTipo, alLat, alLng, alCiudad, alRegion, alPortada]
        );

        // XP +20
        await sql('UPDATE usuarios SET xp_total=xp_total+20, ultimo_acceso=NOW() WHERE id=$1', [usuarioId2]).catch(function(){});

        // Actualizar progreso_album
        var nuevoAlbumesMes = ((pa.albumes_mes_fecha || '').slice(0, 7) === mesActual) ? (pa.albumes_mes || 0) + 1 : 1;
        await updProgresoAlbum(sql, usuarioId2, { albumes_mes: nuevoAlbumesMes, albumes_mes_fecha: hoy() });

        var misionesAlbum = await evaluarMisiones(sql, usuarioId2);
        var logrosAlbum = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, album: albumIns[0], xp: 20, misiones: misionesAlbum, logros: logrosAlbum });
      }

      // Agregar foto a album (Pinterest-style)
      if (tipo2 === 'album_agregar_foto') {
        if (!usuarioId2) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var afAlbumId = body.album_id || null;
        var afFotoUrl = String(body.foto_url || '').trim();
        if (!afAlbumId) return res.status(400).json({ ok: false, error: 'album_id requerido' });
        if (!afFotoUrl || !/^https?:\/\//.test(afFotoUrl) || afFotoUrl.length > 2000)
          return res.status(400).json({ ok: false, error: 'foto_url invalida' });

        // Check album exists and activo
        var afAlbumCheck = await sql('SELECT id, usuario_id FROM albumes WHERE id=$1 AND activo=true', [afAlbumId]).catch(function(){ return []; });
        if (!afAlbumCheck.length) return res.status(404).json({ ok: false, error: 'Album no encontrado' });

        // Check fotos count < 50
        var afCount = await sql('SELECT COUNT(*)::int AS n FROM album_fotos WHERE album_id=$1 AND activo=true', [afAlbumId]).catch(function(){ return [{n:0}]; });
        if (afCount[0].n >= 50) return res.status(429).json({ ok: false, error: 'Album lleno (maximo 50 fotos)' });

        // Anti-spam: max 10 fotos/dia
        var pa2 = await getProgresoAlbum(sql, usuarioId2);
        if ((pa2.fotos_dia_fecha || '') === hoy() && (pa2.fotos_dia || 0) >= 10)
          return res.status(429).json({ ok: false, error: 'Limite de 10 fotos por dia alcanzado' });

        var afAutorOriginal = body.autor_original_id || usuarioId2;
        var afFotoType = ['foto','video','audio'].includes(body.foto_type) ? body.foto_type : 'foto';
        var afMediaTitle = String(body.media_title || '').trim().slice(0, 200);
        var afMediaSource = String(body.media_source || '').trim().slice(0, 100);

        // Check dedup
        var afDedup = await sql(
          'SELECT 1 AS uno FROM album_fotos WHERE album_id=$1 AND foto_url=$2 AND autor_original_id=$3 LIMIT 1',
          [afAlbumId, afFotoUrl, afAutorOriginal]
        ).catch(function(){ return []; });
        if (afDedup.length) return res.status(409).json({ ok: false, error: 'Foto ya existe en este album' });

        var afIns = await sql(
          'INSERT INTO album_fotos (album_id, agregador_id, autor_original_id, foto_url, foto_type, media_title, media_source, xp_otorgado_autor) '
          + 'VALUES ($1, $2, $3, $4, $5, $6, $7, 15) RETURNING *',
          [afAlbumId, usuarioId2, afAutorOriginal, afFotoUrl, afFotoType, afMediaTitle, afMediaSource]
        );

        // XP +15 al agregador
        await sql('UPDATE usuarios SET xp_total=xp_total+15, ultimo_acceso=NOW() WHERE id=$1', [usuarioId2]).catch(function(){});

        // XP +10 al autor original si es foto de otro (tope 10 XP/dia)
        if (afAutorOriginal !== usuarioId2) {
          var pa3 = await getProgresoAlbum(sql, afAutorOriginal);
          if ((pa3.xp_autor_fecha || '') !== hoy() || (pa3.xp_autor_dia || 0) < 10) {
            await sql('UPDATE usuarios SET xp_total=xp_total+10, ultimo_acceso=NOW() WHERE id=$1', [afAutorOriginal]).catch(function(){});
            var nuevoXpAutor = ((pa3.xp_autor_fecha || '') === hoy()) ? (pa3.xp_autor_dia || 0) + 10 : 10;
            await updProgresoAlbum(sql, afAutorOriginal, { xp_autor_dia: nuevoXpAutor, xp_autor_fecha: hoy() });
          }
        }

        // Actualizar progreso_album del agregador
        var nuevoFotosDia = ((pa2.fotos_dia_fecha || '') === hoy()) ? (pa2.fotos_dia || 0) + 1 : 1;
        await updProgresoAlbum(sql, usuarioId2, { fotos_dia: nuevoFotosDia, fotos_dia_fecha: hoy() });

        var misionesFoto = await evaluarMisiones(sql, usuarioId2);
        var logrosFoto = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, foto: afIns[0], xp: 15, xp_autor_original: afAutorOriginal !== usuarioId2 ? 10 : 0, misiones: misionesFoto, logros: logrosFoto });
      }

      // Votar foto de album
      if (tipo2 === 'album_voto') {
        if (!usuarioId2) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var avFotoId = body.foto_id || null;
        if (!avFotoId) return res.status(400).json({ ok: false, error: 'foto_id requerido' });

        // Anti-spam: max 20 votos/dia
        var pa4 = await getProgresoAlbum(sql, usuarioId2);
        if ((pa4.votos_dia_fecha || '') === hoy() && (pa4.votos_dia || 0) >= 20)
          return res.status(429).json({ ok: false, error: 'Limite de 20 votos por dia alcanzado' });

        var avTarget = await sql('SELECT id, autor_original_id, album_id FROM album_fotos WHERE id=$1 AND activo=true LIMIT 1', [avFotoId]).catch(function(){ return []; });
        if (!avTarget.length) return res.status(404).json({ ok: false, error: 'Foto no encontrada' });
        if (avTarget[0].autor_original_id === usuarioId2)
          return res.status(403).json({ ok: false, error: 'No puedes votar tu propia foto' });

        try {
          await sql('INSERT INTO album_votos (usuario_id, foto_id, xp_ganado) VALUES ($1, $2, 5)', [usuarioId2, avFotoId]);
        } catch (e) {
          if (e.code === '23505') return res.status(409).json({ ok: false, error: 'Ya votaste esta foto', ya_votado: true });
          return res.status(500).json({ ok: false, error: 'Error al registrar voto' });
        }

        await sql('UPDATE usuarios SET xp_total=xp_total+5, ultimo_acceso=NOW() WHERE id=$1', [usuarioId2]).catch(function(){});
        var nuevoVotosDia = ((pa4.votos_dia_fecha || '') === hoy()) ? (pa4.votos_dia || 0) + 1 : 1;
        await updProgresoAlbum(sql, usuarioId2, { votos_dia: nuevoVotosDia, votos_dia_fecha: hoy() });

        var misionesVoto = await evaluarMisiones(sql, usuarioId2);
        var logrosVoto = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, xp: 5, misiones: misionesVoto, logros: logrosVoto });
      }

      // Quitar foto de album (solo agregador o creador del album)
      if (tipo2 === 'album_quitar_foto') {
        if (!usuarioId2) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var qfFotoId = body.foto_id || null;
        var qfAlbumId = body.album_id || null;
        if (!qfFotoId || !qfAlbumId) return res.status(400).json({ ok: false, error: 'foto_id y album_id requeridos' });

        var qfCheck = await sql(
          'SELECT af.id, af.agregador_id, a.usuario_id AS creador_id'
          + ' FROM album_fotos af JOIN albumes a ON a.id = af.album_id'
          + ' WHERE af.id = $1 AND af.album_id = $2',
          [qfFotoId, qfAlbumId]
        ).catch(function(){ return []; });
        if (!qfCheck.length) return res.status(404).json({ ok: false, error: 'Foto no encontrada en album' });
        if (qfCheck[0].agregador_id !== usuarioId2 && qfCheck[0].creador_id !== usuarioId2)
          return res.status(403).json({ ok: false, error: 'Sin permisos para quitar esta foto' });

        await sql('UPDATE album_fotos SET activo = false WHERE id = $1', [qfFotoId]);
        return res.status(200).json({ ok: true });
      }

      // Editar album (solo creador)
      if (tipo2 === 'album_editar') {
        if (!usuarioId2) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var aeAlbumId = body.album_id || null;
        if (!aeAlbumId) return res.status(400).json({ ok: false, error: 'album_id requerido' });

        var aeCheck = await sql('SELECT id, usuario_id FROM albumes WHERE id=$1 AND activo=true', [aeAlbumId]).catch(function(){ return []; });
        if (!aeCheck.length) return res.status(404).json({ ok: false, error: 'Album no encontrado' });
        if (aeCheck[0].usuario_id !== usuarioId2) return res.status(403).json({ ok: false, error: 'Sin permisos' });

        var aeTitulo = body.titulo !== undefined ? String(body.titulo).trim().slice(0, 120) : null;
        var aeDesc = body.descripcion !== undefined ? String(body.descripcion).trim().slice(0, 1000) : null;
        var aePortada = body.portada_url !== undefined ? String(body.portada_url).trim().slice(0, 2000) : null;
        var aeLat = body.lat !== undefined ? parseFloat(body.lat) : undefined;
        var aeLng = body.lng !== undefined ? parseFloat(body.lng) : undefined;
        var aeCiudad = body.ciudad !== undefined ? String(body.ciudad).trim().slice(0, 80) : undefined;
        var aeRegion = body.region !== undefined ? String(body.region).trim().slice(0, 80) : undefined;

        var sets = [];
        var vals = [];
        var idx = 1;
        if (aeTitulo !== null) { sets.push('titulo=$' + idx); vals.push(aeTitulo); idx++; }
        if (aeDesc !== null) { sets.push('descripcion=$' + idx); vals.push(aeDesc); idx++; }
        if (aePortada !== null) { sets.push('portada_url=$' + idx); vals.push(aePortada); idx++; }
        if (aeLat !== undefined && !isNaN(aeLat)) { sets.push('lat=$' + idx); vals.push(aeLat); idx++; }
        if (aeLng !== undefined && !isNaN(aeLng)) { sets.push('lng=$' + idx); vals.push(aeLng); idx++; }
        if (aeCiudad !== undefined) { sets.push('ciudad=$' + idx); vals.push(aeCiudad || null); idx++; }
        if (aeRegion !== undefined) { sets.push('region=$' + idx); vals.push(aeRegion || null); idx++; }

        if (!sets.length) return res.status(400).json({ ok: false, error: 'Sin cambios' });

        sets.push('actualizado_en=NOW()');
        vals.push(aeAlbumId);
        await sql('UPDATE albumes SET ' + sets.join(', ') + ' WHERE id=$' + idx, vals);
        return res.status(200).json({ ok: true });
      }

      // Eliminar album (soft-delete, solo creador)
      if (tipo2 === 'album_eliminar') {
        if (!usuarioId2) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var elAlbumId = body.album_id || null;
        if (!elAlbumId) return res.status(400).json({ ok: false, error: 'album_id requerido' });

        var elCheck = await sql('SELECT id, usuario_id FROM albumes WHERE id=$1 AND activo=true', [elAlbumId]).catch(function(){ return []; });
        if (!elCheck.length) return res.status(404).json({ ok: false, error: 'Album no encontrado' });
        if (elCheck[0].usuario_id !== usuarioId2) return res.status(403).json({ ok: false, error: 'Sin permisos' });

        await sql('UPDATE albumes SET activo = false, actualizado_en = NOW() WHERE id = $1', [elAlbumId]);
        return res.status(200).json({ ok: true });
      }

      // Admin: seleccionar foto top para destino
      if (tipo2 === 'admin_foto_top') {
        var aftAdminToken = req.headers.authorization || '';
        if (aftAdminToken.indexOf('Bearer ') !== 0)
          return res.status(401).json({ ok: false, error: 'Token requerido' });
        aftAdminToken = aftAdminToken.slice(7);
        var adminSecret = process.env.ADMIN_SECRET || 'exploraco12345';
        if (aftAdminToken !== adminSecret)
          return res.status(403).json({ ok: false, error: 'Token invalido' });

        var aftDestinoId = body.destino_id || null;
        var aftFotoUrl = String(body.foto_url || '').trim();
        if (!aftDestinoId || !aftFotoUrl)
          return res.status(400).json({ ok: false, error: 'destino_id y foto_url requeridos' });

        await sql('UPDATE destinos SET foto_hero = $1, actualizado_en = NOW() WHERE id = $2', [aftFotoUrl, aftDestinoId]);
        return res.status(200).json({ ok: true });
      }

      // Admin: moderar foto de album (soft-delete)
      if (tipo2 === 'admin_moderar_foto_album') {
        var amaAdminToken = req.headers.authorization || '';
        if (amaAdminToken.indexOf('Bearer ') !== 0)
          return res.status(401).json({ ok: false, error: 'Token requerido' });
        amaAdminToken = amaAdminToken.slice(7);
        var adminSecret2 = process.env.ADMIN_SECRET || 'exploraco12345';
        if (amaAdminToken !== adminSecret2)
          return res.status(403).json({ ok: false, error: 'Token invalido' });

        var amaFotoId = body.foto_id || null;
        var amaAccion = body.accion || 'eliminar';
        if (!amaFotoId) return res.status(400).json({ ok: false, error: 'foto_id requerido' });

        if (amaAccion === 'eliminar') {
          await sql('UPDATE album_fotos SET activo = false WHERE id = $1', [amaFotoId]);
        }
        return res.status(200).json({ ok: true });
      }

      if (!tipo2 || !destinoId2)
        return res.status(400).json({ ok: false, error: 'tipo y destino_id son requeridos' });

      // Validar tipo contra constraint real. Se incluyen los tipos
      // 'quitar_*' que no insertan filas (hacen UPDATE/DELETE sobre
      // filas existentes) y por tanto no chocan con el CHECK de la
      // columna tipo -- antes faltaban y el POST los rechazaba con 400,
      // dejando 'quitar_guardado' inalcanzable desde el frontend.
      var tiposValidos = ['resena','guardado','quitar_guardado','visita','quitar_visita','foto','rating'];
      if (!tiposValidos.includes(tipo2))
        return res.status(400).json({ ok: false, error: 'tipo inv\u00e1lido: ' + tipo2 });

      // -- Resena --
      if (tipo2 === 'resena') {
        var ratingVal = parseInt(body.rating || body.puntuacion || 0);
        if (ratingVal < 1 || ratingVal > 5)
          return res.status(400).json({ ok: false, error: 'rating debe ser entre 1 y 5' });

        // Un usuario identificado solo puede calificar un destino una vez,
        // ya sea con resena (texto) o con voto rapido sin texto (TSK-015).
        // (BUG de fraude: antes se podian repetir resenas y sumar XP sin
        // limite). Si usuario_id es null (resena anonima, caso actual de
        // produccion en pagina-destino.js) no hay como deduplicar todavia
        // -- queda cubierto cuando se conecte la sesion real ahi.
        if (usuarioId2) {
          var yaReseno = await sql(
            'SELECT rating, tipo FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 '
            + 'AND tipo IN (\'resena\',\'rating\') LIMIT 1',
            [destinoId2, usuarioId2]
          );
          if (yaReseno.length > 0)
            return res.status(409).json({
              ok: false,
              error: 'Ya calificaste este lugar',
              ya_reseno: true,
              ya_votado: true,
              voto_previo: { rating: yaReseno[0].rating, tipo: yaReseno[0].tipo }
            });
        }

        // usuario_nombre no existe en la tabla -> guardarlo en texto como prefijo
        var nombrePrefijo = body.usuario_nombre
          ? '[' + body.usuario_nombre.slice(0,50) + '] '
          : '';
        var textoFinal = body.texto
          ? (nombrePrefijo + body.texto).slice(0, 2000)
          : (body.usuario_nombre ? nombrePrefijo.trim() : null);

        // Dimensiones (puntuaciones por categoria, JSONB) y tipo de viajero
        var dimsFinal = {};
        if (body.dims && typeof body.dims === 'object' && !Array.isArray(body.dims)) {
          Object.keys(body.dims).forEach(function(k) {
            var v = parseInt(body.dims[k], 10);
            if (v >= 1 && v <= 5) dimsFinal[k] = v;
          });
        }
        var travTypeFinal = body.traveller_type
          ? String(body.traveller_type).slice(0, 30)
          : null;

        var xpGanado = textoFinal && textoFinal.replace(nombrePrefijo,'').trim().length > 50
          ? 25 : 10;

        var result = await sql(
          'INSERT INTO interacciones '
          + '(destino_id, usuario_id, tipo, rating, texto, dims, traveller_type, xp_ganado, creado_en) '
          + 'VALUES ($1, $2, \'resena\', $3, $4, $5, $6, $7, NOW()) '
          + 'RETURNING id',
          [destinoId2, usuarioId2, ratingVal, textoFinal, dimsFinal, travTypeFinal, xpGanado]
        );

        // Actualizar rating promedio y total_resenas en destinos.
        // Ambos se recalcularon sobre resena+rating para que el contador
        // no quede desfasado del promedio (v5, TSK-015).
        await sql(
          'UPDATE destinos SET '
          + 'rating = ('
          + '  SELECT ROUND(AVG(rating)::numeric, 2)'
          + '  FROM interacciones'
          + '  WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\') AND rating IS NOT NULL'
          + '), '
          + 'total_resenas = ('
          + '  SELECT COUNT(*) FROM interacciones'
          + '  WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\')'
          + '), '
          + 'actualizado_en = NOW() '
          + 'WHERE id = $1',
          [destinoId2]
        );

        // Sumar XP al usuario si esta logueado
        var misionesNuevas = [];
        var logrosNuevas = [];
        var xpResenaEntregado = xpGanado;
        if (usuarioId2) {
          // Milestones v2 (ADR-014): el lider del spot gana x1.1 en su
          // ciudad. Se aplica sobre el XP que recibe el usuario (la fila
          // de interacciones conserva la xp base para no romper el check
          // de mis_primera_resena que mira xp_ganado>=25).
          xpResenaEntregado = await xpConMultiplicador(sql, usuarioId2, destinoId2, xpGanado);
          await sql(
            'UPDATE usuarios SET '
            + 'xp_total = xp_total + $1, '
            + 'total_resenas = total_resenas + 1, '
            + 'ultimo_acceso = NOW() '
            + 'WHERE id = $2',
            [xpResenaEntregado, usuarioId2]
          ).catch(function(){});
          misionesNuevas = await evaluarMisiones(sql, usuarioId2);
          logrosNuevas = await evaluarLogros(sql, usuarioId2);
        }

        // Notificar al admin (no bloquea la respuesta)
        try {
          var destinoInfo = await sql(
            'SELECT nombre, ciudad, slug FROM destinos WHERE id=$1 LIMIT 1',
            [destinoId2]
          );
          if (destinoInfo.length > 0) {
            fetch(
              (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://exploraco.vercel.app')
              + '/api/notificaciones',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Internal-Secret': process.env.ADMIN_SECRET || 'exploraco12345',
                },
                body: JSON.stringify({
                  tipo:            'resena',
                  rating:          ratingVal,
                  texto:           textoFinal,
                  usuario_nombre:  body.usuario_nombre || 'Visitante',
                  destino_nombre:  destinoInfo[0].nombre,
                  destino_ciudad:  destinoInfo[0].ciudad,
                  destino_slug:    destinoInfo[0].slug,
                }),
              }
            ).catch(function() {}); // fire & forget
          }
        } catch(_) {}

        return res.status(200).json({ ok: true, id: result[0].id, xp: xpResenaEntregado, misiones: misionesNuevas, logros: logrosNuevas });
      }

      // -- Guardado --
      if (tipo2 === 'guardado') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido para guardar' });

        // Verificar si ya existe (activo o previamente quitado). Se
        // guarda 'activo' junto con el id para poder distinguir un
        // guardado vigente de uno reactivable sin una segunda consulta.
        var existe = await sql(
          'SELECT id, activo FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'guardado\' LIMIT 1',
          [destinoId2, usuarioId2]
        );

        if (existe.length > 0 && existe[0].activo)
          return res.status(200).json({ ok: true, ya_guardado: true, misiones: [], logros: [] });

        if (existe.length > 0 && !existe[0].activo) {
          // Reactivar un guardado previamente quitado. Cero Borrado
          // Logico (Reglas de Oro punto 3): se reactiva la fila original
          // en vez de insertar una nueva, y no se otorga XP de nuevo
          // (evita el ciclo guardar/quitar/guardar para granjear XP).
          await sql(
            'UPDATE interacciones SET activo=true WHERE id=$1',
            [existe[0].id]
          );
          return res.status(200).json({ ok: true, reactivado: true, xp: 0, misiones: [], logros: [] });
        }

        var xpGuardado = 5;
        await sql(
          'INSERT INTO interacciones (destino_id, usuario_id, tipo, xp_ganado, creado_en) VALUES ($1, $2, \'guardado\', $3, NOW())',
          [destinoId2, usuarioId2, xpGuardado]
        );

        // total_guardados queda como contador historico (nunca baja al
        // quitar), igual que el patron ya usado por el motor de puntos
        // local en index.html (userPoints.saved via Math.max()). Sirve
        // como base fiable para futuras insignias/misiones ("guardaste
        // 5 lugares alguna vez"), sin depender del estado activo actual.
        var xpGuardadoFinal = await xpConMultiplicador(sql, usuarioId2, destinoId2, xpGuardado);
        await sql(
          'UPDATE usuarios SET xp_total=xp_total+$1, total_guardados=total_guardados+1 WHERE id=$2',
          [xpGuardadoFinal, usuarioId2]
        ).catch(function(){});

        var misionesGuardado = await evaluarMisiones(sql, usuarioId2);
        var logrosGuardado = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, xp: xpGuardadoFinal, misiones: misionesGuardado, logros: logrosGuardado });
      }

      // -- Quitar guardado --
      if (tipo2 === 'quitar_guardado') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });

        // Cero Borrado Logico (Reglas de Oro punto 3): se desactiva la
        // fila, nunca se borra. Antes esto era un DELETE, lo que permitia
        // un ciclo guardar/quitar/guardar para ganar XP sin limite -- ver
        // el bloque 'guardado' arriba, que ahora reactiva en vez de
        // re-insertar y no vuelve a pagar XP.
        await sql(
          'UPDATE interacciones SET activo=false WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'guardado\' AND activo=true',
          [destinoId2, usuarioId2]
        );
        return res.status(200).json({ ok: true });
      }

      // -- Visita --
      if (tipo2 === 'visita') {
        // Antes se podia llamar sin usuario_id y sin limite: cada POST
        // sencillo otorgaba +20 XP de forma infinita. Ahora requiere
        // usuario_id (igual que 'guardado') y se deduplica por
        // usuario+destino. Nota: hoy ningun caller real en produccion usa
        // este tipo (pagina-destino.js registra visitas de pagina via
        // /api/utilidades?tipo=visitas, un contador distinto y no
        // gamificado); este fix queda listo para cuando exista un boton
        // real de "marcar como visitado" conectado a la sesion.
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido para marcar visita' });

        var yaVisitado = await sql(
          'SELECT id FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'visita\' LIMIT 1',
          [destinoId2, usuarioId2]
        );
        if (yaVisitado.length > 0)
          return res.status(200).json({ ok: true, ya_visitado: true, xp: 0, misiones: [], logros: [] });

        await sql(
          'INSERT INTO interacciones (destino_id, usuario_id, tipo, xp_ganado, creado_en) VALUES ($1, $2, \'visita\', 20, NOW())',
          [destinoId2, usuarioId2]
        );
        var xpVisitaFinal = await xpConMultiplicador(sql, usuarioId2, destinoId2, 20);
        await sql(
          'UPDATE usuarios SET xp_total=xp_total+$1, total_visitas=total_visitas+1 WHERE id=$2',
          [xpVisitaFinal, usuarioId2]
        ).catch(function(){});

        var misionesVisita = await evaluarMisiones(sql, usuarioId2);
        var logrosVisita = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, xp: xpVisitaFinal, misiones: misionesVisita, logros: logrosVisita });
      }

      // -- Quitar visita --
      // La fila tipo='visita' no tiene columna 'activo' y es deduplicada
      // por usuario+destino, asi que "desmarcar que ya fui" borra la fila
      // por completo (no hay ganancia: el XP de la visita ya se otorgo y
      // no se descuenta). Permite que el boton 'Desmarcar' de Mi Mapa,
      // y clearMyMap, refelejen en Neon el estado local del usuario.
      if (tipo2 === 'quitar_visita') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });

        await sql(
          'DELETE FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'visita\'',
          [destinoId2, usuarioId2]
        );
        return res.status(200).json({ ok: true });
      }

      // -- Solo rating (sin texto) - quick-rating v5 (TSK-015) ---------
      if (tipo2 === 'rating') {
        var rVal = parseInt(body.rating || 0);
        if (rVal < 1 || rVal > 5)
          return res.status(400).json({ ok: false, error: 'rating debe ser 1-5' });

        // El voto rapido requiere sesion: cierra el vector de votos
        // anonimos infinitos que distorsionaban el promedio.
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });

        // Dedup simetrico (una calificacion por usuario y destino).
        var yaVoto = await sql(
          'SELECT rating, tipo FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 '
          + 'AND tipo IN (\'resena\',\'rating\') LIMIT 1',
          [destinoId2, usuarioId2]
        );
        if (yaVoto.length > 0)
          return res.status(409).json({
            ok: false,
            error: 'Ya calificaste este lugar',
            ya_votado: true,
            voto_previo: { rating: yaVoto[0].rating, tipo: yaVoto[0].tipo }
          });

        await sql(
          'INSERT INTO interacciones (destino_id, usuario_id, tipo, rating, xp_ganado, creado_en) '
          + 'VALUES ($1, $2, \'rating\', $3, 10, NOW())',
          [destinoId2, usuarioId2, rVal]
        );

        // Alinear AVG y COUNT sobre resena+rating para que el contador
        // coincida con el numerador del promedio (v5).
        await sql(
          'UPDATE destinos SET '
          + 'rating = (SELECT ROUND(AVG(rating)::numeric,2) FROM interacciones '
          + '          WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\') AND rating IS NOT NULL), '
          + 'total_resenas = (SELECT COUNT(*) FROM interacciones '
          + '          WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\')), '
          + 'actualizado_en = NOW() '
          + 'WHERE id=$1',
          [destinoId2]
        ).catch(function(){});

        // Sumar XP al usuario logueado y evaluar misiones + logros.
        var misionesRating = [];
        var logrosRating = [];
        var xpRatingFinal = await xpConMultiplicador(sql, usuarioId2, destinoId2, 10);
        await sql(
          'UPDATE usuarios SET xp_total=xp_total+$1, ultimo_acceso=NOW() WHERE id=$2',
          [xpRatingFinal, usuarioId2]
        ).catch(function(){});
        misionesRating = await evaluarMisiones(sql, usuarioId2);
        logrosRating = await evaluarLogros(sql, usuarioId2);

        return res.status(200).json({ ok: true, xp: xpRatingFinal, misiones: misionesRating, logros: logrosRating });
      }

      return res.status(400).json({ ok: false, error: 'tipo no implementado: ' + tipo2 });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  } catch(err) {
    console.error('[interacciones]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
