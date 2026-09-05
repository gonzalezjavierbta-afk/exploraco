// api/interacciones.js  v5 - motor de misiones + logros (Fase 3/Gaming)
// (ASCII-safe: 0 backticks, 0 no-ASCII)
// interacciones columnas: rating (no puntuacion), creado_en (no created_at)
// tipo CHECK: resena, guardado, visita, foto, rating
// rating CHECK: 1-5
// usuario_nombre NO existe - se guarda en texto como prefijo
//
// REQUIERE MIGRACION ANTES DE DESPLEGAR (acumulativa desde v4):
//   ALTER TABLE interacciones
//     ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
//   ALTER TABLE usuarios
//     ADD COLUMN IF NOT EXISTS progreso_misiones jsonb NOT NULL DEFAULT '{}'::jsonb;
//   ALTER TABLE usuarios
//     ADD COLUMN IF NOT EXISTS progreso_logros jsonb NOT NULL DEFAULT '{}'::jsonb;
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
      // Devuelve ambos en data.{guardados, visitados} (arrays de UUIDs).
      // La migracion estructural de Mi Mapa usa slugs en localStorage y
      // necesita hidratar tambien los visitados (antes solo traia
      // guardados), para que 'Ya fui' se sincronice entre dispositivos.
      if (tipo === 'mapa' && usuarioId) {
        var mapaGuardados = await sql(
          'SELECT DISTINCT i.destino_id FROM interacciones i'
          + ' WHERE i.usuario_id = $1 AND i.tipo = \'guardado\' AND i.activo = true',
          [usuarioId]
        );
        var mapaVisitas = await sql(
          'SELECT DISTINCT i.destino_id FROM interacciones i'
          + ' WHERE i.usuario_id = $1 AND i.tipo = \'visita\'',
          [usuarioId]
        );
        return res.status(200).json({
          ok: true,
          data: {
            guardados: mapaGuardados.map(function(r){ return r.destino_id; }),
            visitados: mapaVisitas.map(function(r){ return r.destino_id; })
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
      if (tipo === 'logros' && usuarioId) {
        var usrLogros = await sql(
          'SELECT progreso_logros FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        if (!usrLogros.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });

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

        var progresoLogros = usrLogros[0].progreso_logros || {};
        var desbloqueados = 0;
        var dataLogros = LOGROS.map(function(l) {
          var st = progresoLogros[l.id];
          var done = !!(st && st.estado === 'completada');
          if (done) desbloqueados++;
          return {
            id: l.id, grupo: l.grupo, nombre: l.nombre, desc: l.desc,
            emoji: l.emoji, tier: l.tier, xp: l.xp, requiere: l.requiere,
            estado: done ? 'completada' : 'pendiente',
            en: done ? (st.en || null) : null,
            rareza_pct: rareza[l.id] != null ? rareza[l.id] : 0,
          };
        });
        return res.status(200).json({
          ok: true,
          data: dataLogros,
          desbloqueados: desbloqueados,
          total: LOGROS.length,
        });
      }

      return res.status(400).json({ ok: false, error: 'Par\u00e1metros insuficientes' });
    }

    // -- POST ---------------------------------------------------------
    if (req.method === 'POST') {
      var body = req.body || {};
      var tipo2     = body.tipo;
      var destinoId2= body.destino_id;
      var usuarioId2= body.usuario_id || null;

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
        if (usuarioId2) {
          await sql(
            'UPDATE usuarios SET '
            + 'xp_total = xp_total + $1, '
            + 'total_resenas = total_resenas + 1, '
            + 'ultimo_acceso = NOW() '
            + 'WHERE id = $2',
            [xpGanado, usuarioId2]
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

        return res.status(200).json({ ok: true, id: result[0].id, xp: xpGanado, misiones: misionesNuevas, logros: logrosNuevas });
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
        await sql(
          'UPDATE usuarios SET xp_total=xp_total+$1, total_guardados=total_guardados+1 WHERE id=$2',
          [xpGuardado, usuarioId2]
        ).catch(function(){});

        var misionesGuardado = await evaluarMisiones(sql, usuarioId2);
        var logrosGuardado = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, xp: xpGuardado, misiones: misionesGuardado, logros: logrosGuardado });
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
        await sql(
          'UPDATE usuarios SET xp_total=xp_total+20, total_visitas=total_visitas+1 WHERE id=$1',
          [usuarioId2]
        ).catch(function(){});

        var misionesVisita = await evaluarMisiones(sql, usuarioId2);
        var logrosVisita = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, xp: 20, misiones: misionesVisita, logros: logrosVisita });
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
        await sql(
          'UPDATE usuarios SET xp_total=xp_total+10, ultimo_acceso=NOW() WHERE id=$1',
          [usuarioId2]
        ).catch(function(){});
        misionesRating = await evaluarMisiones(sql, usuarioId2);
        logrosRating = await evaluarLogros(sql, usuarioId2);

        return res.status(200).json({ ok: true, xp: 10, misiones: misionesRating, logros: logrosRating });
      }

      return res.status(400).json({ ok: false, error: 'tipo no implementado: ' + tipo2 });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  } catch(err) {
    console.error('[interacciones]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
