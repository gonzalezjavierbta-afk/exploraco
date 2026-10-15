// api/publicar-lugar.js
// Schema real confirmado por diagnostico:
//   categoria_slug (varchar), lead, descripcion, highlight, foto_hero,
//   region, zona, booking, hostelworld, airbnb, tipo, tags (jsonb), creado_en
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

// Subcategorias controladas por categoria (ADR-016). Lista cerrada por
// categoria final (catSlug); si el slug no pertenece a la lista se
// descarta (fallback = comportamiento actual sin subcategoria).
const SUBCAT_LISTA = {
  sitio: ['naturaleza','museo','cultura','bar','parque','espacio-publico','sitio-historico','religioso','aventura'],
  comida: ['restaurante','cafe','gastrobar','comida-rapida','dulces'],
  evento: ['concierto','festival','teatro','exposicion','deporte','cine','fiesta'],
};

// ---------------------------------------------------------------------------
// ZONA (columna destinos.zona, migracion 028)
// ---------------------------------------------------------------------------
// Lista CERRADA de 5 regiones naturales. Es la MISMA lista que acepta la
// constraint CHECK destinos_zona_chk en Neon; esa CHECK admite SOLO estos
// valores o NULL. De ahi la regla que gobierna toda esta seccion: NUNCA se
// persiste lo que el cliente mando sin validarlo contra la lista. Una cadena
// vacia o un valor inventado revientan la INSERT con 500 (mismo motivo por el
// que api/admin-destinos.js normaliza a NULL en vez de persistir la cadena).
//
// PATRON COPIADO de api/admin-destinos.js (linea 297): el ternario
// b.zona ? String(b.zona).trim() : null -- ternario sobre el valor crudo
// con .trim() al lado del truthy. Aqui se le antepone la validacion contra
// la lista cerrada y la re-derivacion por departamento, que ese endpoint
// no necesita porque solo lo consume el admin.
//
// ASCII-SAFE (ADR-002): las claves del mapa van sin tildes y SIN
// PUNTUACION, y se comparan contra normTexto(), que normaliza NFD, borra
// los diacriticos y borra la puntuacion. Asi el cliente puede mandar
// "Bogot\u00e1, D.C." o "C\u00f3rdoba" y el match funciona sin escribir un
// solo byte > 127 en el codigo.
var ZONAS = ['andina', 'amazonica', 'caribe', 'pacifico', 'llanos'];

// ===========================================================================
// COPIA (SINCRONIZADA A MANO) de ZONA_POR_DEPARTAMENTO
// de scripts/generar-geo-ciudades.js -- LEER ANTES DE TOCAR
// ===========================================================================
// ORIGEN DE VERDAD: el mapa departamento -> zona vive EXCLUSIVAMENTE en
// scripts/generar-geo-ciudades.js (ADR-097 D2: "el navegador no lo deduce").
// Lo que sigue NO es una segunda fuente de verdad: es una COPIA, y el unico
// motivo de que exista aqui es que este archivo corre en Vercel como funcion
// serverless, donde no puede importar un .js estatico de scripts/ (~67 KB)
// sin arrastrarlo entero al bundle de despliegue. Copiar 33 lineas es un
// riesgo de despliegue cero; importar un modulo de 67 KB para leer una
// constante es un riesgo real. La duplicacion queda ACOTADA por el smoke de
// paridad (scripts/, ver "CONTRATO CON EL SMOKE" mas abajo).
//
// REGLAS DE ESTA TABLA (no negociables):
//   1. Deben ser EXACTAMENTE las mismas 33 claves y valores que
//      ZONA_POR_DEPARTAMENTO, en el mismo orden, para que el diff sea legible.
//   2. Los valores van YA traducidos al vocabulario de la columna
//      destinos.zona (andina/amazonica/caribe/pacifico/llanos), NO a los
//      slugs de zonas_geograficas (andes/amazonia/...): la conversion es la
//      constante ZONAS_ZG_A_DESTINOS del generador, y aqui ya esta aplicada.
//      CESAR y SUCRE son 'andina' por esta razon; la auditoria reporto que
//      esta tabla decia 'caribe' y esa era la version equivocada.
//   3. Las claves son SIN PUNTUACION porque son las departamento_normalizado
//      del seed (db/seeds/geo_ciudades_seed.json), que ya viene normalizado:
//      "BOGOTA, D.C." -> "bogota d c", y el departamento de San Andres ->
//      "archipielago de san andres providencia y santa catalina". Por eso
//      normTexto() borra la puntuacion antes de comparar (ver mas abajo).
//
// CONTRATO CON EL SMOKE DE PARIDAD (scripts/,otro agente):
//   Bloque delimitado por 'var DEPTO_ZONA = {' y el primer '};' posterior.
//   UNA entrada por linea con el patron exacto:  'clave': 'valor',
//   con clave y valor ASCII puro entre comillas simples. Extraer el bloque
//   entero y aplicar /'([^']+)':\s*'([^']+)'/g sobre el; comparar contra
//   ZONAS_ZG_A_DESTINOS[ZONA_POR_DEPARTAMENTO[d]] del generador.
var DEPTO_ZONA = {
  'amazonas': 'amazonica',
  'antioquia': 'andina',
  'arauca': 'llanos',
  'archipielago de san andres providencia y santa catalina': 'caribe',
  'atlantico': 'caribe',
  'bogota d c': 'andina',
  'bolivar': 'caribe',
  'boyaca': 'andina',
  'caldas': 'andina',
  'caqueta': 'amazonica',
  'casanare': 'llanos',
  'cauca': 'pacifico',
  'cesar': 'andina',
  'choco': 'pacifico',
  'cordoba': 'andina',
  'cundinamarca': 'andina',
  'guainia': 'amazonica',
  'guaviare': 'amazonica',
  'huila': 'andina',
  'la guajira': 'caribe',
  'magdalena': 'caribe',
  'meta': 'llanos',
  'narino': 'andina',
  'norte de santander': 'andina',
  'putumayo': 'amazonica',
  'quindio': 'andina',
  'risaralda': 'andina',
  'santander': 'andina',
  'sucre': 'andina',
  'tolima': 'andina',
  'valle del cauca': 'pacifico',
  'vaupes': 'amazonica',
  'vichada': 'llanos'
};

// Alias que el cliente o el propio formulario suelen mandar en vez del nombre
// oficial del departamento. Se resuelven ANTES de buscar en DEPTO_ZONA, y sus
// CLAVES estan tambien en forma canonica (ya normalizadas), porque la
// comparacion ocurre sobre normTexto() y no sobre el texto crudo.
var DEPTO_ALIAS = {
  'bogota': 'bogota d c',
  'd c': 'bogota d c',
  'dc': 'bogota d c',
  'norte santander': 'norte de santander',
  'san andres': 'archipielago de san andres providencia y santa catalina',
  'san andres y providencia': 'archipielago de san andres providencia y santa catalina',
  'archipielago de san andres': 'archipielago de san andres providencia y santa catalina'
};

// Normaliza un valor de texto para comparar contra DEPTO_ZONA y
// DEPTO_ALIAS. Tres pasos, en este orden:
//   1. TILDES: NFD + borrado del bloque combinante U+0300-U+036F. Sin esto
//      "Bogot\u00e1" nunca matchearia la clave ASCII 'bogota d c'.
//   2. PUNTUACION: se borra (y se colapsa el espacio que deja). Sin este
//      paso "Bogot\u00e1, D.C." daba 'bogota, d.c.' y "San Andr\u00e9s,
//      Providencia y Santa Catalina" daba un texto CON comas: ninguna de las
//      dos formas alcanzaba su clave, que esta sin puntuacion porque sale
//      del seed ya normalizado. Con la puntuacion fuera, la forma larga y la
//      forma corta de San Andres colapsan a la MISMA clave y "Bogot\u00e1,
//      D.C." resuelve igual que "Bogota D.C.".
//   3. minusculas + colapso de espacios + trim.
function normTexto(v) {
  if (v === undefined || v === null) return '';
  return String(v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[,;:.()[\]{}\/!?<>@#$%^&*+=~|'"-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Resuelve la zona que se va a persistir. Prioridad:
//   1) body.zona, solo si es EXACTAMENTE uno de los 5 valores de la lista
//      cerrada (match ya normalizado: sin tildes, sin mayusculas, sin
//      espacios sobrantes, sin puntuacion).
//   2) Si no hay zona valida, se RE-DERIVA desde el departamento con el
//      mapa interno. Es el punto de seguridad de contrato: el cliente no
//      decide la zona, la zona se valida o se deduce.
//   3) El bucle de alias es deliberado: resuelve en cadena (un alias puede
//      apuntar a otro alias) y ademas es el unico punto donde se puede
//      enganchar una normalizacion extra sin tocar el mapa.
//   4) Si tampoco hay departamento reconocible, NULL. Nunca '' -- la CHECK
//      no lo admite y la INSERT moriria con 500.
function resolverZona(zonaRaw, deptoRaw) {
  var z = normTexto(zonaRaw);
  if (ZONAS.indexOf(z) !== -1) return z;
  var d = normTexto(deptoRaw);
  for (var i = 0; i < 5 && DEPTO_ALIAS[d]; i++) d = DEPTO_ALIAS[d];
  return DEPTO_ZONA[d] || null;
}

// Dominios permitidos para video_url -- solo se persiste si el host
// coincide (defensa adicional; el saneo real hacia <iframe> ocurre en
// pagina-destino.js al momento de renderizar).
//
// SPOTIFY: se admiten los hosts de escucha de un track, que antes eran
// rechazados y por tanto no se podian ni guardar.
//
// POR QUE LA LISTA ES DE HOSTS EXACTOS Y NO DE DOMINIOS BASE:
// un matching por sufijo ingenuo (endsWith('spotify.com')) es
// INSEGURO, deja pasar:
//   - 'evilspotify.com'      (coincide el sufijo, el dominio es otro)
//   - 'spotify.com.attacker.net' (el atacante registra ese dominio y
//     su cadena TERMINA en 'spotify.com')
// y abrir el host raiz con la regla del punto literal
// (host === d || host.endsWith('.' + d)) dejaria pasar cualquier
// subdominio, incluido 'notopen.spotify.com'. Por eso NO se anade
// 'spotify.com' a secas ni un comodin '*.spotify.com': la whitelist
// queda cerrada a hosts concretos y el match es exacto (indexOf).
//
// ESQUEMAS: aqui SOLO se aceptan URLs http/https. El URI 'spotify:' no
// tiene jerarquia de autoridad, asi que new URL() lo parsea con host
// vacio y se rechaza solo (no hace falta un caso especial). Decision de
// producto, documentada a proposito: en lugares el campo video_url es
// siempre una URL http/https. Si alguna vez se admite el URI
// 'spotify:track:ID', hay que NORMALIZARLO en el cliente a
// https://open.spotify.com/track/ID, no abrir el backend a otro esquema.
const VIDEO_HOSTS = [
  'youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com', 'www.vimeo.com',
  'open.spotify.com', 'play.spotify.com',
];

// Invariante de la whitelist: toda entrada debe ser un HOST concreto
// (contiene al menos un punto y no empieza por punto). Falla ruidoso al
// cargar el modulo si alguien anade un dominio raiz, que combinado con
// un futuro matching por sufijo volveria a abrir la puerta a
// subdominios arbitrarios. No es validacion de entrada del usuario: es
// una guarda de codigo sobre una constante del propio modulo.
VIDEO_HOSTS.forEach(function (h) {
  if (h.indexOf('.') === -1 || h.charAt(0) === '.')
    throw new Error('VIDEO_HOSTS: entrada no permitida, debe ser un host exacto: ' + h);
});

function esVideoUrlSegura(u) {
  try {
    // new URL() exige esquema absoluto: 'spotify:...' cae al catch (host
    // vacio) y las rutas relativas se rechazan tambien.
    var host = new URL(String(u)).hostname.toLowerCase();
    // Match EXACTO y case-insensitive (hostname ya viene normalizado).
    // A proposito NO se usa endsWith: ver la nota de seguridad arriba.
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

// Normaliza el resumen corto (sintro): colapsa saltos/tabs y espacios
// multiples a un espacio, recorta a 200 caracteres y devuelve null si
// queda vacio (ADR-034). Misma practica que api/admin-destinos.js.
function normSintro(v) {
  if (v === undefined || v === null) return null;
  var s = String(v).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return s ? s.slice(0, 200) : null;
}

function distanciaMetros(lat1, lng1, lat2, lng2) {
  var R = 6371000, rad = Math.PI / 180;
  var dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  var a = Math.sin(dLat/2)*Math.sin(dLat/2)
    + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nivel de completitud de la publicacion (Fase 2). Mas campos = mas XP.
function calcularTierPublicacion(b) {
  var extras = 0;
  if (b.descripcion_larga) extras++;
  if (b.foto_principal) extras++;
  if (b.precio_desde || b.horario) extras++;
  if (b.sitio_web || b.instagram) extras++;
  if (b.subcategoria) extras++;
  if (Array.isArray(b.faqs) && b.faqs.length) extras++;
  if (Array.isArray(b.amenidades) && b.amenidades.length) extras++;
  if (b.sitio_tipo_actividad || b.sitio_como_llegar || b.sitio_horario) extras++;
  var tieneCoords = !!(b.latitud && b.longitud);
  var tieneGaleria = Array.isArray(b.fotos_galeria) && b.fotos_galeria.length > 0;
  if (tieneCoords && tieneGaleria && extras >= 4) return 'completo';
  if (extras >= 2) return 'intermedio';
  return 'basico';
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
  //
  // ENVIO BASICO SIN WHATSAPP: whatsapp deja de ser requerido. La regla
  // minima del envio es nombre, categoria, ciudad, descripcion_corta y
  // foto_principal.
  //
  // NO se exige NINGUN contacto (ni whatsapp, ni email, ni sesion JWT): un
  // envio sin via de contacto se acepta igual y el destino queda con el
  // autor sin forma de ser located -- el aviso al usuario es trabajo del
  // frontend, no un 400 del backend. Solo el camino de blog sigue
  // exigiendo email, porque su modal no recolecta whatsapp.
  var reqs = esBlog
    ? ['nombre','categoria','ciudad','descripcion_corta','email']
    : ['nombre','categoria','ciudad','descripcion_corta','foto_principal'];
  for (var i = 0; i < reqs.length; i++) {
    if (!body[reqs[i]] || !String(body[reqs[i]]).trim())
      return res.status(400).json({ error: 'Campo requerido: ' + reqs[i] });
  }

  try {
    var sql = neon(process.env.DATABASE_URL);

    var catSlug = esBlog ? 'blog' : (CAT_MAP[(body.categoria||'').toLowerCase()] || 'sitio');
    var nuevoSlug = slug(body.nombre, body.ciudad);

    // Zona (columna zona, migracion 028). Lista cerrada de 5 valores o
    // NULL: se valida lo que llega y, si no es valido, se re-deriva del
    // departamento. Ver resolverZona(). Nunca sale '' de aqui.
    var zonaFinal = resolverZona(body.zona, body.departamento);

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
    // Subcategoria (ADR-016) -- lista cerrada por categoria final
    if (body.subcategoria && SUBCAT_LISTA[catSlug]) {
      var subcat = String(body.subcategoria).toLowerCase();
      if (SUBCAT_LISTA[catSlug].indexOf(subcat) !== -1) {
        tags.subcategoria = subcat;
      }
    }
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

    var tierPub = calcularTierPublicacion(body);
    var geoPub = false;
    var latU = parseFloat(body.lat_usuario), lngU = parseFloat(body.lng_usuario);
    var latD = parseFloat(body.latitud), lngD = parseFloat(body.longitud);
    if (isFinite(latU) && isFinite(lngU) && isFinite(latD) && isFinite(lngD)
      && distanciaMetros(latU, lngU, latD, lngD) <= 300) geoPub = true;
    var fotoPub = Array.isArray(body.fotos_galeria) && body.fotos_galeria.length > 0;

    // Autor (Fase 2): solo si el usuario ya esta logueado (Bearer valido).
    // publicar-lugar no verifica el JWT: lo reenvia a interacciones, que
    // es el unico lugar con el motor de sesion.
    var autorId = null;
    var authPub = req.headers['authorization'] || req.headers['Authorization'] || '';
    if (authPub) {
      try {
        var baseUrlPub = (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://exploraco.vercel.app');
        var rReg = await fetch(baseUrlPub + '/api/interacciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authPub },
          body: JSON.stringify({ tipo: 'publicar_lugar_registrar' })
        });
        var jReg = await rReg.json();
        if (jReg && jReg.ok && jReg.data && jReg.data.autor_id) autorId = String(jReg.data.autor_id);
      } catch (eReg) {
        console.warn('[publicar-lugar] registrar autor fallo: ' + (eReg && eReg.message));
      }
    }
    tags.autor_id = autorId;
    tags.pub_tier = tierPub;
    tags.pub_geo = geoPub;
    tags.pub_foto = fotoPub;
    tags.pub_xp_estado = autorId ? 'pendiente' : 'sin_autor';

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
      + 'ciudad, region, barrio, zona, '
      + 'lat, lng, '
      + 'whatsapp, telefono, email, web, instagram, '
      + 'precio_desde, horario, '
      + 'foto_hero, '
      + 'booking, hostelworld, airbnb, '
      + 'tipo, tags, sintro, '
      + 'status, destacado, verificado, '
      + 'creado_en, actualizado_en '
      + ') VALUES ( '
      + '$1,$2,$3, '
      + '$4,$5,$6, '
      + '$7,$8,$9,$10, '
      + '$11,$12, '
      + '$13,$14,$15,$16,$17, '
      + '$18,$19, '
      + '$20, '
      + '$21,$22,$23, '
      + '$24,$25, $26, '
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
        zonaFinal,                                        // zona ($10)
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
        normSintro(body.sintro),
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
