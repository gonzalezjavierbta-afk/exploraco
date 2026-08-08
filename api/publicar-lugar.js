// api/publicar-lugar.js
// Schema real confirmado por diagnostico:
//   categoria_slug (varchar), lead, descripcion, highlight, foto_hero,
//   region, booking, hostelworld, airbnb, tipo, tags (jsonb), creado_en
//
// BLOG (Sprint Inspirate): las 5 categorias de tema del modal
// "Comparte tu experiencia" (aventura/gastro/cultura/naturaleza/tips)
// NO son categoria_slug -- son un sub-tema. Todo submit con uno de
// esos valores se guarda con categoria_slug='blog' y el tema elegido
// se preserva en tags.tema (ver BLOG_TEMAS mas abajo).

const { neon } = require('@neondatabase/serverless');

const CAT_MAP = {
  hostal:'hostal', hotel:'hostal', finca:'hostal',
  glamping:'hostal', 'aparta-hotel':'hostal', posada:'hostal',
  restaurante:'comida', cafe:'comida', cafeteria:'comida', bar:'comida',
  sitio:'sitio', parque:'sitio', museo:'sitio', natural:'sitio', lugar:'sitio',
  evento:'evento', festival:'evento', concierto:'evento',
};

// Temas del blog -- vienen del <select id="blog-cat"> en index.html.
// Cualquier valor de esta lista fuerza categoria_slug='blog'.
const BLOG_TEMAS = ['aventura', 'gastro', 'cultura', 'naturaleza', 'tips'];

// Dominios permitidos para video_url -- solo se persiste si el host
// coincide (defensa adicional; el saneo real hacia <iframe> ocurre en
// pagina-destino.js al momento de renderizar).
const VIDEO_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com', 'www.vimeo.com'];

function esVideoUrlSegura(u) {
  try {
    var host = new URL(String(u)).hostname.toLowerCase();
    return VIDEO_HOSTS.indexOf(host) !== -1;
  } catch (e) { return false; }
}

function slug(nombre, ciudad) {
  return ((nombre||'')+'-'+(ciudad||''))
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s-]/g,'').trim()
    .replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,55)
    + '-' + Math.random().toString(36).slice(2,6);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Parsear body si llega como string
  var body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Body JSON requerido' });

  var esBlog = BLOG_TEMAS.indexOf(String(body.categoria||'').toLowerCase()) !== -1;

  // Validar requeridos. Blog reusa el mismo formulario base (nombre=
  // titulo, ciudad=destino, descripcion_corta=resumen) pero pide email
  // en vez de whatsapp -- el modal "Comparte tu experiencia" no
  // recolecta whatsapp (ver index.html #blog-modal).
  var reqs = esBlog
    ? ['nombre','categoria','ciudad','descripcion_corta','email']
    : ['nombre','categoria','ciudad','descripcion_corta','whatsapp'];
  for (var i = 0; i < reqs.length; i++) {
    if (!body[reqs[i]] || !String(body[reqs[i]]).trim())
      return res.status(400).json({ error: 'Campo requerido: ' + reqs[i] });
  }

  try {
    var sql = neon(process.env.DATABASE_URL);

    var catSlug = esBlog ? 'blog' : (CAT_MAP[(body.categoria||'').toLowerCase()] || 'sitio');
    var nuevoSlug = slug(body.nombre, body.ciudad);

    // precio_desde es VARCHAR en la tabla -- formatear como texto
    var precio = null;
    if (body.precio_desde) {
      var num = parseInt(String(body.precio_desde).replace(/\D/g,''));
      if (!isNaN(num) && num > 0) precio = '$' + num.toLocaleString('es-CO');
    }

    // tags JSONB -- todo lo que no tiene columna propia
    var tags = {};
    if (body.amenidades   && body.amenidades.length)   tags.amenidades    = body.amenidades;
    if (body.habitaciones && body.habitaciones.length) tags.habitaciones  = body.habitaciones;
    if (body.faqs         && body.faqs.length)         tags.faqs          = body.faqs;
    if (body.checkin)      tags.checkin      = body.checkin;
    if (body.checkout)     tags.checkout     = body.checkout;
    if (body.contacto_nombre) tags.contacto_nombre = body.contacto_nombre;
    // Campos especificos de sitio turistico
    if (body.sitio_tipo_actividad) tags.tipo_actividad  = body.sitio_tipo_actividad;
    if (body.sitio_dificultad)     tags.dificultad      = body.sitio_dificultad;
    if (body.sitio_duracion)       tags.duracion        = body.sitio_duracion;
    if (body.sitio_horario)        tags.horario_visita  = body.sitio_horario;
    if (body.sitio_precio_entrada) tags.precio_entrada  = body.sitio_precio_entrada;
    if (body.sitio_distancia)      tags.distancia       = body.sitio_distancia;
    if (body.sitio_como_llegar)    tags.como_llegar     = body.sitio_como_llegar;
    if (body.sitio_permisos)       tags.permisos        = body.sitio_permisos;
    if (body.sitio_equipamiento && body.sitio_equipamiento.length) tags.equipamiento = body.sitio_equipamiento;
    if (body.sitio_temporada    && body.sitio_temporada.length)    tags.temporada    = body.sitio_temporada;
    // Campos especificos de blog (Sprint Inspirate)
    if (esBlog) {
      tags.tema = String(body.categoria).toLowerCase();
      if (body.video_url && esVideoUrlSegura(body.video_url)) {
        tags.video_url = String(body.video_url).trim();
      }
    }

    // Blog: el modal solo pide un resumen (descripcion_corta). Se usa
    // tambien como arranque del cuerpo completo (descripcion) para que
    // el editor tenga texto de partida al revisar/ampliar la historia
    // antes de aprobarla -- si llega descripcion_larga explicita (ej.
    // desde el admin), esa tiene prioridad.
    var descripcionFinal = body.descripcion_larga
      || (esBlog ? body.descripcion_corta : null)
      || null;

    var rows = await sql(
      'INSERT INTO destinos ( '
      + 'slug, nombre, categoria_slug, '
      + 'lead, descripcion, highlight, '
      + 'ciudad, region, barrio, '
      + 'lat, lng, '
      + 'whatsapp, telefono, email, web, instagram, '
      + 'precio_desde, horario, '
      + 'foto_hero, '
      + 'booking, hostelworld, airbnb, '
      + 'tipo, tags, '
      + 'status, destacado, verificado, '
      + 'creado_en, actualizado_en '
      + ') VALUES ( '
      + '$1,$2,$3, '
      + '$4,$5,$6, '
      + '$7,$8,$9, '
      + '$10,$11, '
      + '$12,$13,$14,$15,$16, '
      + '$17,$18, '
      + '$19, '
      + '$20,$21,$22, '
      + '$23,$24, '
      + "'draft',false,false, "
      + 'NOW(),NOW() '
      + ') RETURNING id, slug',
      [
        nuevoSlug,
        String(body.nombre).trim(),
        catSlug,
        String(body.descripcion_corta).trim(),           // lead
        descripcionFinal,                                 // descripcion
        body.frase_destacada    || null,                 // highlight
        String(body.ciudad).trim(),
        body.departamento       || null,                 // region
        body.barrio             || null,
        body.latitud  ? parseFloat(body.latitud)  || null : null,
        body.longitud ? parseFloat(body.longitud) || null : null,
        body.whatsapp           || null,
        body.telefono           || null,
        body.email              || null,
        body.sitio_web          || null,                 // web
        body.instagram          || null,
        precio,
        body.horario            || null,
        body.foto_principal     || null,                 // foto_hero
        body.booking_url        || null,                 // booking
        body.hostelworld_url    || null,                 // hostelworld
        body.airbnb_url         || null,                 // airbnb
        body.tipo_alojamiento   || null,                 // tipo
        JSON.stringify(tags),
      ]
    );

    var destino = rows[0];

    // Fotos de galeria -> destinos_fotos
    if (Array.isArray(body.fotos_galeria)) {
      for (var j = 0; j < body.fotos_galeria.length; j++) {
        var foto = body.fotos_galeria[j];
        if (!foto || !foto.url) continue;
        try {
          await sql(
            'INSERT INTO destinos_fotos (destino_id, url, caption, orden) VALUES ($1,$2,$3,$4)',
            [destino.id, foto.url, foto.caption||'', j]
          );
        } catch(e) { /* no fatal -- la foto principal ya esta */ }
      }
    }

    // Notificar al admin de nueva solicitud (fire & forget)
    try {
      fetch(
        (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://exploraco.vercel.app')
        + '/api/admin?recurso=notificaciones',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (process.env.ADMIN_SECRET || 'exploraco12345'),
          },
          body: JSON.stringify({
            tipo:             'solicitud',
            nombre:           String(body.nombre).trim(),
            categoria:        catSlug,
            ciudad:           String(body.ciudad).trim(),
            whatsapp:         body.whatsapp || '',
            descripcion_corta:String(body.descripcion_corta||'').trim(),
            precio_desde:     precio || '',
          }),
        }
      ).catch(function() {});
    } catch(_) {}

    var mensajeOk = esBlog
      ? '\u00a1Historia recibida! El equipo la revisar\u00e1 y la publicar\u00e1 en el blog en 24-48h.'
      : '\u00a1Solicitud recibida! El equipo revisar\u00e1 y publicar\u00e1 tu lugar en 24-48h.';

    return res.status(200).json({
      ok: true,
      mensaje: mensajeOk,
      slug:   destino.slug,
      id:     destino.id,
      status: 'draft',
      url:    'https://exploraco.vercel.app/' + destino.slug + '.html',
    });

  } catch(err) {
    console.error('[publicar-lugar]', err.message);
    return res.status(500).json({ error: 'Error al guardar.', detalle: err.message });
  }
};
