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
//
// ADR-099 (T2) -- UNA SOLA PUERTA, TRES METODOS, CERO ENDPOINTS NUEVOS.
//   POST  -- alta de una solicitud (estado_envio='enviado' POR DEFECTO, para
//            que el publicar.html vivo siga entrando en la cola el dia del
//            despliegue) o de un teaser (estado_envio='semilla', fuera de la
//            cola), mas el alta directa del admin (publicar_directo=true, que
//            exige process.env.ADMIN_SECRET SIN fallback).
//   GET   -- ?mios=1 lista mis envios; ?id=<uuid> devuelve el detalle de uno
//            propio. Propiedad por JWT verificada EN PROCESO con
//            lib/sesion.js (ADR-109 D1): cero fetch, cero delegacion.
//   PATCH -- ?id=<uuid> actualiza MI borrador con allow-list de claves.
//   POST con borrador_id + Bearer (D6.4) RECLAMA la semilla propia y la
//            actualiza EN SU SITIO: nunca inserta una segunda fila. Sin
//            sesion el borrador_id se ignora y el POST sigue su camino.
// Ciclo de vida (D6.4): semilla -> borrador -> enviado. Solo 'enviado' se
// lista en la cola del admin (?recurso=solicitudes).
// El tier, los faltantes y los dos conteos de fotos los calcula SIEMPRE el
// servidor con lib/completitud.js (D4): el cliente solo previsualiza. Los
// pub_* y autor_id son solo-servidor y jamas se confian del body (D6.1).
// Sin migracion: todo lo nuevo vive en tags JSONB y se fusiona con
// COALESCE(tags,'{}'::jsonb) || $N::jsonb (ADR-003, Cero Borrado Logico).

const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');
// ADR-099 D4 -- fuente unica de la aritmetica de completitud. Prohibido
// copiar la formula aqui: si se duplica, el tier del servidor y el del
// formulario dejan de ser comparables y el XP se paga de menos en silencio.
const ECCompletitud = require('../lib/completitud.js');
// ADR-109 D1/T1 -- IDENTIDAD EN PROCESO. La primitiva de sesion (payload
// {sub,iat,exp} + HMAC-SHA256 con SESSION_JWT_SECRET) vive en lib/sesion.js y
// es la MISMA que api/usuarios.js:610-653. Requerirla aqui es lo que elimina
// el fetch() a /api/interacciones y, con el, el autor_id = null silencioso
// cuando ese salto de red fallaba. Cero dependencia externa.
const ECSesion = require('../lib/sesion.js');

// ADR-109 paso 4b: el secreto admin NO tiene fallback publico (fail-closed).
// Sin process.env.ADMIN_SECRET la rama admin responde 503; la comparacion es
// en tiempo constante. Refactor a lib/ pendiente (deuda del arquitecto).
function adminSecretValor() {
  var s = process.env.ADMIN_SECRET;
  return (typeof s === 'string' && s.length > 0) ? s : null;
}
// Bytes UTF-16 -> octetos bajos. Sin Buffer a proposito: el arnes de smoke
// carga el handler en un sandbox vm sin globales de Node, y typed arrays son
// intrinsecos de ECMAScript.
function adminBytes(v) {
  var s = String(v === undefined || v === null ? '' : v);
  var out = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 255;
  return out;
}
function adminSecretIgual(candidato) {
  var real = adminSecretValor();
  if (!real) return false;
  var cand = String(candidato === undefined || candidato === null ? '' : candidato);
  if (cand.length !== real.length || cand.length === 0) return false;
  return crypto.timingSafeEqual(adminBytes(cand), adminBytes(real));
}

const CAT_MAP = {
  // ADR-099 D8.2 -- 'blog' es una CATEGORIA mas del mismo formulario. Antes
  // no estaba aqui y caia en 'sitio' (D8.1), asi que el render -- que
  // ramifica con cat === 'blog' -- nunca se activaba por esta via.
  blog:'blog',
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
  sitio: ['naturaleza','museo','cultura','bar','parque','espacio-publico','sitio-historico','religioso','aventura','ciudad'],
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

// ===========================================================================
// ADR-099 T2 -- estados de envio, completitud, allow-list y anti-abuso
// ===========================================================================
// El tier ya NO se calcula aqui: lo devuelve lib/completitud.js (D4). El
// contador viejo (extras >= 4) se retira porque no distingue una foto de
// cinco ni sabe que existe video (D3.7), y era la razon de que el admin que
// ampliaba una ficha no pudiera mejorar el tier.
var ESTADO_ENVIO_DEFECTO = 'enviado';
// D6.4 -- lista UNICA de estados del ciclo: semilla (teaser anonimo) ->
// borrador (reclamado con sesion o rellenado, fuera de la cola) -> enviado
// (entra en la cola del admin). La normalizacion y las guardas se apoyan en
// esta lista para que no aparezca un cuarto estado por descuido.
var ESTADOS_ENVIO_VALIDOS = ['semilla', 'borrador', 'enviado'];
// Estados sobre los que se puede escribir con PATCH: el borrador (semilla) y
// el borrador ya reclamado con sesion (D6.4). 'enviado' NO se edita: 409.
var ESTADOS_EDITABLES = ['semilla', 'borrador'];
var MAX_FOTOS = 12;
var MIN_DESC_CORTA = 30;
var LIMITE_SEMILLAS_ORIGEN = 3;
var LIMITE_SEMILLAS_DIA = 20;

// D6.1 -- claves que el cliente SI puede escribir en tags (POST y PATCH).
// Contrato de contenido v2 (GEMINI_MASTER_PROMPT seccion 6): toda clave de
// TAGS que el motor pinta y que el cliente puede rellenar tiene que estar
// aqui, o el PATCH la descarta EN SILENCIO (filtro de la linea 1288). Lo que
// NO entra: las claves de BASE (son columnas, no tags) ni cover_valor /
// cover_nota (forma plana legacy: el contrato exige el objeto cover).
var CLAVES_CLIENTE = [
  // identidad de la ficha
  'tema', 'subcategoria', 'tipo_actividad',
  // comunes (contacto, multimedia, ciclo de vida)
  'contacto_nombre', 'video_url', 'estado_envio', 'faqs',
  // hostal
  'amenidades', 'habitaciones', 'checkin', 'checkout', 'tipo_alojamiento',
  'recepcion', 'edad_minima', 'mascotas', 'cocina_compartida',
  'barrio_descripcion', 'politica_cancelacion', 'reglas_casa', 'actividades',
  'que_incluye', 'eventos_hostal',
  // comida
  'tipo_comida', 'cocina', 'ambiente', 'precio_promedio', 'terraza', 'reservas',
  'domicilio', 'menu_destacado', 'opciones_dieta', 'horario_detallado',
  'domicilio_plataformas',
  // sitio -- naturaleza / aventura / parque / juego legacy del validador
  'dificultad', 'dificultad_desc', 'duracion', 'altitud', 'temporada',
  'temporada_nota', 'temporada_matriz', 'precio_entrada', 'distancia',
  'como_llegar', 'permisos', 'regulaciones', 'checklist_tip', 'horario_visita',
  'entradas', 'tours', 'equipamiento', 'itinerario', 'dificultad_tags',
  'fauna_flora', 'secretos', 'que_ver',
  // sitio -- museo / cultura / historico / religioso / bar / espacio-publico
  'colecciones', 'recorridos', 'horarios_zona', 'accesibilidad', 'programacion',
  'contexto', 'musica_vivo', 'cover', 'codigo_vestimenta', 'happy_hour',
  'atracciones', 'actividades_gratis',
  // sitio -- ciudad / pueblo
  'barrios', 'transporte', 'seguridad', 'presupuesto', 'gastronomia', 'cuando_ir',
  // evento
  'fecha_inicio', 'fecha_fin', 'edicion', 'sede', 'organiza', 'lema', 'lineup',
  'agenda', 'categorias_entrada', 'que_llevar', 'prohibido'
];

// D6.1 -- claves SOLO de servidor. Si llegan por POST o PATCH: 400 y no se
// escriben. 'pub_geo' por PATCH valdria +40 XP sin geolocalizar: es
// exactamente la escalada de dinero que ADR-099 cierra.
var CLAVES_SOLO_SERVIDOR = [
  'pub_geo', 'pub_foto', 'pub_tier', 'pub_completitud', 'pub_faltantes',
  'pub_fotos_total', 'pub_fotos_no_hero', 'pub_xp_estado', 'pub_geo_dist_m',
  'autor_id', 'ip_hash', 'origen_envio', 'semilla_huerfana',
  // ADR-109 D2/B4 -- el rastro de procedencia del autor es SOLO de servidor:
  // sin esta clave en la lista, un cliente podria auto-declararse
  // pub_autor_origen='sesion' con autor_id nulo y romper el invariante de D2
  // por la puerta de atras. Fail-closed por los dos consumidores (POST y
  // PATCH comparten claveProhibida, ADR-109 T9 (vi)).
  'pub_autor_origen'
];

var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function baseApi() {
  return (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://exploraco.vercel.app');
}

function leerBody(req) {
  var b = req && req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { return null; } }
  if (!b || typeof b !== 'object') return null;
  return b;
}

function queryDe(req) {
  if (req && req.query && typeof req.query === 'object') return req.query;
  var q = {};
  var u = String((req && req.url) || '');
  var i = u.indexOf('?');
  if (i === -1) return q;
  var partes = u.slice(i + 1).split('&');
  for (var j = 0; j < partes.length; j++) {
    var par = partes[j].split('=');
    if (!par[0]) continue;
    try { q[decodeURIComponent(par[0])] = decodeURIComponent(par[1] || ''); }
    catch (e) { q[par[0]] = par[1] || ''; }
  }
  return q;
}

function cabeceraAuth(req) {
  var h = (req && req.headers) || {};
  return String(h['authorization'] || h['Authorization'] || '').trim();
}

// JSONB de Neon: puede llegar como objeto o como cadena JSON.
function leerTags(v) {
  if (!v) return {};
  if (typeof v === 'string') {
    try { var o = JSON.parse(v); return (o && typeof o === 'object') ? o : {}; }
    catch (e) { return {}; }
  }
  return (typeof v === 'object') ? v : {};
}

function numONull(v) {
  if (v === undefined || v === null || v === '') return null;
  var n = parseFloat(v);
  return isFinite(n) ? n : null;
}

// precio_desde es VARCHAR en la tabla: se guarda ya formateado ('$12.000').
// Una sola funcion para POST y PATCH para que no puedan divergir (D6.1 mapea
// precio_desde y horario a su COLUMNA, no a tags).
function formatearPrecio(v) {
  if (v === undefined || v === null || v === '') return null;
  var n = parseInt(String(v).replace(/\D/g, ''), 10);
  if (!isFinite(n) || n <= 0) return null;
  return '$' + n.toLocaleString('es-CO');
}

// ADR-109 D1/T1 -- IDENTIDAD EN PROCESO. publicar-lugar YA NO delega el JWT en
// api/interacciones.js: verifica el token aqui mismo con lib/sesion.js, la
// misma primitiva que api/usuarios.js. El fetch anterior convertia cualquier
// fallo de red o cold start en autor_id = null SILENCIOSO (3 de 3 envios sin
// autor); ahora la identidad no puede degradarse: o hay firma valida o hay
// razon explicita.
// Devuelve SIEMPRE {autor_id, razon} con autor_id null cuando no hay sesion.
// Cero I/O, cero logging del token.
function resolverAutor(authHeader) {
  var r = ECSesion.verificar(authHeader);
  if (r && r.ok) return { autor_id: String(r.sub), razon: 'OK' };
  return { autor_id: null, razon: (r && r.razon) ? r.razon : 'SESION_INVALIDA' };
}

// D6.2 -- default 'enviado' (retrocompatible: el publicar.html vivo no manda
// el campo y debe seguir entrando en la cola el dia del despliegue).
// D6.4 -- 'borrador' es un estado de PLENO DERECHO del ciclo, no un alias de
// 'draft' de la columna status: se admite aqui y en ESTADOS_EDITABLES.
function normEstadoEnvio(v) {
  var s = String((v === undefined || v === null) ? '' : v).trim().toLowerCase();
  if (!s) return ESTADO_ENVIO_DEFECTO;
  if (s === 'draft') s = 'borrador';
  if (ESTADOS_ENVIO_VALIDOS.indexOf(s) === -1) return null;
  return s;
}

// D6.4 -- carga la fila a reclamar. Se devuelve COMPLETA para que el UPDATE
// pueda conservar lo que el payload no trae (ADR-003: un campo ausente no se
// borra) y para que la completitud se evalue sobre la fila resultante.
async function cargarReclamable(sql, id, autorId) {
  var rows = await sql(
    'SELECT d.id, d.slug, d.nombre, d.categoria_slug, d.lead, d.descripcion, '
    + 'd.highlight, d.ciudad, d.region, d.barrio, d.zona, d.lat, d.lng, '
    + 'd.whatsapp, d.telefono, d.email, d.web, d.instagram, d.foto_hero, '
    + 'd.precio_desde, d.horario, d.sintro, d.booking, d.hostelworld, '
    + 'd.airbnb, d.tipo, d.tags, d.status '
    + 'FROM destinos d WHERE d.id = $1',
    [id]
  );
  var fila = rows && rows[0];
  // Ajeno = 404, no 403: no se filtra la existencia de borradores de otros
  // (misma leccion que GET ?id=).
  if (!fila)
    return { ok: false, status: 404, body: { ok: false, error: 'NO_ENCONTRADO', code: 'NO_ENCONTRADO' } };
  var t = leerTags(fila.tags);
  var dueno = String(t.autor_id || '');
  if (dueno && dueno !== autorId)
    return { ok: false, status: 404, body: { ok: false, error: 'NO_ENCONTRADO', code: 'NO_ENCONTRADO' } };
  var est = normEstadoEnvio(t.estado_envio);
  // 'enviado' no vuelve atras ni se reescribe: 409 (D6.2 + D6.4).
  if (est === 'enviado')
    return { ok: false, status: 409, body: { ok: false, error: 'YA_ENVIADO', code: 'YA_ENVIADO' } };
  // Solo se reclama una fila que el admin no este moderando ya.
  if (String(fila.status || '') !== 'draft')
    return { ok: false, status: 404, body: { ok: false, error: 'NO_ENCONTRADO', code: 'NO_ENCONTRADO' } };
  if (ESTADOS_EDITABLES.indexOf(est) === -1)
    return { ok: false, status: 409, body: { ok: false, error: 'NO_EDITABLE', code: 'NO_EDITABLE' } };
  return { ok: true, status: 200, fila: fila, tags: t };
}

// D8.2 -- 'blog' es una categoria; los 5 temas siguen resolviendo a 'blog'
// (retrocompatibilidad de D8.5: categoria='aventura' no se rompe).
function resolverCategoriaPublicacion(catRaw) {
  var c = String((catRaw === undefined || catRaw === null) ? '' : catRaw).trim().toLowerCase();
  var esBlog = (c === 'blog') || BLOG_TEMAS.indexOf(c) !== -1;
  return { categoria: c, esBlog: esBlog, catSlug: esBlog ? 'blog' : (CAT_MAP[c] || 'sitio') };
}

// D8.2 -- tags.tema sale de body.tema validado contra BLOG_TEMAS, NO de
// body.categoria como hacia antes. Si la categoria ES un tema, ese tema se
// conserva (D8.5).
function resolverTema(cat, temaRaw) {
  if (!cat || !cat.esBlog) return null;
  var t = String((temaRaw === undefined || temaRaw === null) ? '' : temaRaw).trim().toLowerCase();
  if (BLOG_TEMAS.indexOf(t) !== -1) return t;
  if (BLOG_TEMAS.indexOf(cat.categoria) !== -1) return cat.categoria;
  return null;
}

// Tags de cliente del POST y de la simetria del PATCH: SOLO lista blanca. El
// servidor construye el objeto; nunca se fusiona el body entero (D6.1).
// Contrato v2: si el body trae tags (objeto), se siembra desde ahi quedandose
// SOLO con claves de CLAVES_CLIENTE -- el resto se descarta EN SILENCIO,
// incluidas todas las de CLAVES_SOLO_SERVIDOR (pub_*, autor_id, ip_hash,
// origen_envio, semilla_huerfana), que ni siquiera estan en la lista blanca.
// tags malformado (string, array, null) se ignora sin romper.
// Despues se aplican los mapeos planos del formulario legacy (sitio_*, form):
// mantienen su precedencia actual, para no romper el alta de siempre.
function construirTagsCliente(b, catSlug) {
  var tags = {};
  var tIn = (b && b.tags !== undefined && b.tags !== null) ? b.tags : null;
  if (tIn && typeof tIn === 'object' && !Array.isArray(tIn)) {
    for (var kIn in tIn) {
      if (!Object.prototype.hasOwnProperty.call(tIn, kIn)) continue;
      // tema y estado_envio los resuelve el servidor (resolverTema y la
      // maquina de estados): misma simetria que el delta del PATCH, que
      // valida el tema contra BLOG_TEMAS y descarta el estado del cliente.
      if (kIn === 'tema' || kIn === 'estado_envio') continue;
      if (CLAVES_CLIENTE.indexOf(kIn) === -1) continue;
      if (CLAVES_SOLO_SERVIDOR.indexOf(kIn) !== -1) continue;
      tags[kIn] = tIn[kIn];
    }
  }
  if (b.amenidades && b.amenidades.length) tags.amenidades = b.amenidades;
  if (b.habitaciones && b.habitaciones.length) tags.habitaciones = b.habitaciones;
  if (b.faqs && b.faqs.length) tags.faqs = b.faqs;
  if (b.checkin) tags.checkin = b.checkin;
  if (b.checkout) tags.checkout = b.checkout;
  if (b.contacto_nombre) tags.contacto_nombre = b.contacto_nombre;
  if (b.subcategoria && SUBCAT_LISTA[catSlug]) {
    var subcat = String(b.subcategoria).toLowerCase();
    if (SUBCAT_LISTA[catSlug].indexOf(subcat) !== -1) tags.subcategoria = subcat;
  }
  if (b.sitio_tipo_actividad) tags.tipo_actividad = b.sitio_tipo_actividad;
  if (b.sitio_dificultad) tags.dificultad = b.sitio_dificultad;
  if (b.sitio_duracion) tags.duracion = b.sitio_duracion;
  if (b.sitio_horario) tags.horario_visita = b.sitio_horario;
  if (b.sitio_precio_entrada) tags.precio_entrada = b.sitio_precio_entrada;
  if (b.sitio_distancia) tags.distancia = b.sitio_distancia;
  if (b.sitio_como_llegar) tags.como_llegar = b.sitio_como_llegar;
  if (b.sitio_permisos) tags.permisos = b.sitio_permisos;
  if (b.sitio_equipamiento && b.sitio_equipamiento.length) tags.equipamiento = b.sitio_equipamiento;
  if (b.sitio_temporada && b.sitio_temporada.length) tags.temporada = b.sitio_temporada;
  return tags;
}

// D7 + D8.4 + D3.3 -- UNA sola validacion para el POST y para la transicion
// semilla -> enviado del PATCH. Sin ella el PATCH seria la puerta trasera
// para encolar fichas vacias (D6.2).
//   semilla: nombre + categoria + ciudad. Sin descripcion, sin foto.
//   enviado: lo anterior + descripcion_corta >= 30 + email si es blog.
//   foto:    NUNCA es requisito (deroga ADR-097 D5 en esa clausula).
function validarEnvio(d) {
  if (d.fotosTotal > MAX_FOTOS)
    return { ok: false, code: 'FOTOS_EXCEDIDAS', campo: 'fotos_galeria', error: 'FOTOS_EXCEDIDAS' };
  if (!d.nombre)
    return { ok: false, code: 'CAMPO_REQUERIDO', campo: 'nombre', error: 'Campo requerido: nombre' };
  if (!d.categoria)
    return { ok: false, code: 'CAMPO_REQUERIDO', campo: 'categoria', error: 'Campo requerido: categoria' };
  if (!d.ciudad)
    return { ok: false, code: 'CAMPO_REQUERIDO', campo: 'ciudad', error: 'Campo requerido: ciudad' };
  if (d.estadoEnvio === 'semilla') return { ok: true };
  var lead = String((d.lead === undefined || d.lead === null) ? '' : d.lead).trim();
  if (lead.length < MIN_DESC_CORTA)
    return { ok: false, code: 'DESCRIPCION_CORTA_INVALIDA', campo: 'descripcion_corta',
      error: 'Campo requerido: descripcion_corta (minimo ' + MIN_DESC_CORTA + ' caracteres)' };
  if (d.esBlog) {
    if (!String(d.email || '').trim())
      return { ok: false, code: 'CAMPO_REQUERIDO', campo: 'email', error: 'Campo requerido: email' };
    if (BLOG_TEMAS.indexOf(String(d.tema || '').trim().toLowerCase()) === -1)
      return { ok: false, code: 'TEMA_INVALIDO', campo: 'tema', error: 'TEMA_INVALIDO' };
  }
  return { ok: true };
}

// D6.1 -- allow-list del PATCH. Fail-closed y VISIBLE: devuelve la clave
// ofensora en vez de ignorarla en silencio.
function claveProhibida(body) {
  var fuentes = [body];
  if (body && body.tags && typeof body.tags === 'object') fuentes.push(body.tags);
  for (var f = 0; f < fuentes.length; f++) {
    var o = fuentes[f];
    if (!o || typeof o !== 'object') continue;
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      if (CLAVES_SOLO_SERVIDOR.indexOf(k) !== -1) return k;
      if (String(k).indexOf('pub_') === 0) return k;
    }
  }
  return null;
}

function ipDe(req) {
  var h = (req && req.headers) || {};
  var xff = String(h['x-forwarded-for'] || h['X-Forwarded-For'] || '');
  var ip = xff.split(',')[0].trim();
  if (!ip) ip = String(h['x-real-ip'] || h['X-Real-Ip'] || '').trim();
  if (!ip && req && req.socket && req.socket.remoteAddress) ip = String(req.socket.remoteAddress);
  return ip;
}

// D6.6.3 -- sha256(ip + secreto del dia). Sin sal, el hash de una IP es
// reversible por fuerza bruta en 2^32 y tags es legible desde el admin. Se
// guarda el hash, NUNCA la IP cruda (minimizacion de datos).
function hashIp(ip, secreto) {
  var dia = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256')
    .update(String(ip || '') + '|' + String(secreto) + '|' + dia)
    .digest('hex');
}

// D3.6 + D4 -- evalua la fila que se va a persistir. La galeria llega YA
// contada (D3.1): lib/completitud.js no consulta la base.
function evaluarFila(fila, tags, conteo) {
  var entrada = {
    nombre: fila.nombre || '',
    categoria_slug: fila.categoria_slug || '',
    subcategoria: tags.subcategoria || '',
    ciudad: fila.ciudad || '',
    departamento: fila.departamento || '',
    zona: fila.zona || '',
    lead: fila.lead || '',
    descripcion: fila.descripcion || '',
    lat: fila.lat,
    lng: fila.lng,
    whatsapp: fila.whatsapp || '',
    email: fila.email || '',
    web: fila.web || '',
    instagram: fila.instagram || '',
    tags: tags,
    fotos_total: conteo.total,
    fotos_no_hero: conteo.no_hero
  };
  var res = ECCompletitud.calcular(entrada);
  return { res: res, pers: ECCompletitud.persistible(res) };
}

// Lo que el cliente necesita para pintar la barra y la estimacion de XP sin
// recalcular reglas (D10/D12: la cifra final la fijan los multiplicadores).
function respuestaCompletitud(ev) {
  return {
    puntos: ev.res.puntos,
    tier: ev.res.tier,
    faltantes: ev.res.faltantes,
    guardas: ev.res.guardas,
    bloques: ev.res.bloques,
    version: ev.res.version,
    fotos_total: ev.pers.pub_fotos_total,
    fotos_no_hero: ev.pers.pub_fotos_no_hero
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // D6.3 -- el preflight lo responde ESTE handler, no vercel.json. Sin
  // 'Authorization' el Bearer de GET/PATCH no pasaria preflight aunque el
  // metodo este permitido.
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  var metodo = String(req.method || '').toUpperCase();
  if (metodo === 'GET') return manejarGet(req, res);
  if (metodo === 'PATCH') return manejarPatch(req, res);
  if (metodo !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  return manejarPost(req, res);
};

// ===========================================================================
// POST -- alta unica (solicitud, semilla o alta directa del admin)
// ===========================================================================
async function manejarPost(req, res) {
  var body = leerBody(req);
  if (!body) return res.status(400).json({ ok: false, error: 'Body JSON requerido', code: 'BODY_INVALIDO' });

  try {
    var directo = (body.publicar_directo === true || String(body.publicar_directo) === 'true');
    var estadoEnvio = normEstadoEnvio(body.estado_envio);
    // El alta directa del admin siempre es una publicacion: nace 'enviado'.
    if (directo) estadoEnvio = 'enviado';
    if (!estadoEnvio || estadoEnvio === 'borrador')
      return res.status(400).json({ ok: false, error: 'estado_envio no permitido en el alta',
        code: 'ESTADO_ENVIO_INVALIDO', campo: 'estado_envio' });

    var authPub = cabeceraAuth(req);
    // ADR-109 D1 -- sin fetch: la razon viaja hasta el 401 para que el cliente
    // distinga SIN_TOKEN de SESION_EXPIRADA o SESION_INVALIDA.
    var aut = resolverAutor(authPub);
    var autorId = aut.autor_id;
    var razonAutor = aut.razon;

    // D6.5 -- el camino admin del mismo endpoint NO hereda un secreto
    // publico: sin ADMIN_SECRET no hay alta directa y se responde 503
    // CONFIG_ADMIN_SECRET_AUSENTE (ADR-109 paso 4b, antes 401).
    if (directo) {
      if (!adminSecretValor()) {
        console.error('[auth] CONFIG_ADMIN_SECRET_AUSENTE publicar_directo');
        return res.status(503).json({ ok: false, error: 'CONFIG_ADMIN_SECRET_AUSENTE',
          code: 'CONFIG_ADMIN_SECRET_AUSENTE' });
      }
      var tokenAdmin = authPub.replace(/^Bearer\s+/i, '').trim();
      if (!adminSecretIgual(tokenAdmin))
        return res.status(401).json({ ok: false, error: 'No autorizado', code: 'NO_AUTORIZADO' });
    }

    var sql = neon(process.env.DATABASE_URL);

    // D6.4 -- RECLAMO del borrador. Las tres condiciones son necesarias:
    // sesion valida, id con forma de UUID y fila propia que aun no este
    // enviada. Sin JWT el borrador_id se IGNORA en silencio (nunca se reclama
    // por id a ciegas) y el POST sigue su camino normal de alta.
    var borradorId = String((body.borrador_id === undefined || body.borrador_id === null)
      ? '' : body.borrador_id).trim();
    var rec = null;
    if (borradorId && autorId && !directo) {
      if (!UUID_RE.test(borradorId))
        return res.status(400).json({ ok: false, error: 'borrador_id invalido', code: 'ID_INVALIDO' });
      rec = await cargarReclamable(sql, borradorId, autorId);
      if (!rec.ok) return res.status(rec.status).json(rec.body);

      // ADR-003 -- el payload se completa con lo que la semilla ya tenia: un
      // campo AUSENTE no se borra; un campo vacio explicito si (mismo
      // contrato que el PATCH).
      var mapaColumnas = {
        nombre: 'nombre', categoria: 'categoria_slug', ciudad: 'ciudad',
        departamento: 'region', barrio: 'barrio', zona: 'zona',
        latitud: 'lat', longitud: 'lng',
        whatsapp: 'whatsapp', telefono: 'telefono', email: 'email',
        sitio_web: 'web', instagram: 'instagram',
        precio_desde: 'precio_desde', horario: 'horario',
        foto_principal: 'foto_hero', frase_destacada: 'highlight',
        sintro: 'sintro', booking_url: 'booking',
        hostelworld_url: 'hostelworld', airbnb_url: 'airbnb',
        tipo_alojamiento: 'tipo',
        descripcion_corta: 'lead', descripcion_larga: 'descripcion'
      };
      for (var mc in mapaColumnas) {
        if (!Object.prototype.hasOwnProperty.call(mapaColumnas, mc)) continue;
        if (body[mc] === undefined) body[mc] = rec.fila[mapaColumnas[mc]];
      }
    }

    var cat = resolverCategoriaPublicacion(body.categoria);
    var temaFinal = resolverTema(cat, body.tema);

    // D3.1 -- la galeria se cuenta con la formula unica (hero fuera de la
    // galeria). D3.3 -- tope duro de 12, contado DESPUES de deduplicar.
    var conteo = ECCompletitud.contarFotos(body.fotos_galeria, body.foto_principal);

    // D6.4 -- el estado del reclamado lo DERIVA el servidor, no lo elige el
    // cliente: 'enviado' si el payload resultante cumple el minimo de envio
    // completo (D6.2/D7), 'borrador' si solo cumple el minimo de guardado.
    // Un alta nueva conserva el contrato de siempre (estado_envio del body).
    var datosValidacion = {
      nombre: String(body.nombre || '').trim(),
      categoria: cat.categoria,
      ciudad: String(body.ciudad || '').trim(),
      lead: body.descripcion_corta,
      email: body.email,
      esBlog: cat.esBlog,
      tema: temaFinal,
      fotosTotal: conteo.total
    };
    var estadoFinal = estadoEnvio;
    var v = { ok: true };
    if (rec) {
      datosValidacion.estadoEnvio = 'semilla';
      var vBase = validarEnvio(datosValidacion);
      if (!vBase.ok) return res.status(400).json({ ok: false, error: vBase.error, code: vBase.code, campo: vBase.campo });
      datosValidacion.estadoEnvio = 'enviado';
      v = validarEnvio(datosValidacion);
      estadoFinal = v.ok ? 'enviado' : 'borrador';
    } else {
      datosValidacion.estadoEnvio = estadoEnvio;
      v = validarEnvio(datosValidacion);
      if (!v.ok) return res.status(400).json({ ok: false, error: v.error, code: v.code, campo: v.campo });
    }

    // ADR-109 D2/T1 -- el envio DE USUARIO exige sesion. Se evalua DESPUES de
    // la rama 'directo' (ya autenticada con ADMIN_SECRET) y ANTES de tocar la
    // base: sin autor valido NO se escribe fila. 'borrador' y 'semilla' NO
    // cambian de regimen: el borrador anonimo del embudo sigue admitiendo
    // anonimo (ADR-099 D2) porque no promete XP. La exencion del admin NO se
    // hereda: sin ADMIN_SECRET, publicar_directo ya corto en 401 arriba.
    var origenFinal = directo ? 'admin' : (estadoFinal === 'semilla' ? 'teaser' : 'formulario');
    // xp_potencial queda en null A PROPOSITO: el motor de XP vive en
    // api/interacciones.js y no se puede importar aqui (el regex de
    // scripts/smoke_038_casas_clases.js:512-513 vigila que no se bifurque).
    // No se inventa la cifra: el suelo real lo sirve
    // GET /api/interacciones?tipo=catalogo_xp (ADR-109 D3).
    if (!directo && estadoFinal === 'enviado'
        && (origenFinal === 'formulario' || origenFinal === 'teaser') && !autorId) {
      return res.status(401).json({
        ok: false,
        error: 'SESION_REQUERIDA',
        razon: razonAutor,
        xp_potencial: null
      });
    }

    // D6.6 -- anti-abuso sin infraestructura nueva. Solo la SEMILLA consume
    // cupo: un 'enviado' con sesion no se limita por IP (la sesion ya acota
    // por identidad). Contadores en SQL porque serverless es stateless.
    // El RECLAMO no consume cupo: no crea fila, actualiza una que ya existe.
    var ipHash = null;
    if (!rec && estadoEnvio === 'semilla') {
      var secretoSemilla = process.env.SEMILLA_HASH_SECRET;
      if (!secretoSemilla)
        return res.status(429).json({ ok: false, error: 'SEMILLA_GATE_NO_CONFIGURADO', code: 'SEMILLA_GATE_NO_CONFIGURADO' });
      ipHash = hashIp(ipDe(req), secretoSemilla);
      var cOrigen = await sql("SELECT COUNT(*)::int AS n FROM destinos WHERE tags->>'ip_hash' = $1 AND creado_en > date_trunc('day', now())", [ipHash]);
      var nOrigen = (cOrigen && cOrigen[0]) ? Number(cOrigen[0].n) : 0;
      if (nOrigen >= LIMITE_SEMILLAS_ORIGEN)
        return res.status(429).json({ ok: false, error: 'DEMASIADAS_SEMILLAS', code: 'DEMASIADAS_SEMILLAS' });
      var cGlobal = await sql("SELECT COUNT(*)::int AS n FROM destinos WHERE tags->>'estado_envio' = 'semilla' AND creado_en > date_trunc('day', now())", []);
      var nGlobal = (cGlobal && cGlobal[0]) ? Number(cGlobal[0].n) : 0;
      if (nGlobal >= LIMITE_SEMILLAS_DIA)
        return res.status(429).json({ ok: false, error: 'DEMASIADAS_SEMILLAS', code: 'DEMASIADAS_SEMILLAS' });
    }

    var nuevoSlug = slug(body.nombre, body.ciudad);

    // Zona (columna zona, migracion 028). Lista cerrada de 5 valores o
    // NULL: se valida lo que llega y, si no es valido, se re-deriva del
    // departamento. Ver resolverZona(). Nunca sale '' de aqui.
    var zonaFinal = resolverZona(body.zona, body.departamento);

    // precio_desde es VARCHAR en la tabla -- formatear como texto
    var precio = formatearPrecio(body.precio_desde);

    // Tags de cliente (lista blanca) + tema + video. D9: el video deja de ser
    // exclusivo de blog con la MISMA validacion de host; si el host no esta
    // permitido simplemente no se escribe (ni 400 ni 500).
    var tags = construirTagsCliente(body, cat.catSlug);
    if (temaFinal) tags.tema = temaFinal;
    if (body.video_url) {
      var vu = String(body.video_url).trim();
      if (esVideoUrlSegura(vu)) tags.video_url = vu;
    }

    // D2.2 -- bono geo: <= 300 m entre dispositivo y pin. D5 -- se guarda
    // tambien pub_geo_dist_m para que un futuro recalculo sea posible sin
    // migracion (pub_geo es inmutable).
    var latD = numONull(body.latitud);
    var lngD = numONull(body.longitud);
    var latU = numONull(body.lat_usuario);
    var lngU = numONull(body.lng_usuario);
    var geoPub = false;
    var geoDist = null;
    if (latU !== null && lngU !== null && latD !== null && lngD !== null) {
      geoDist = Math.round(distanciaMetros(latU, lngU, latD, lngD));
      geoPub = geoDist <= 300;
    }

    // D7 -- lead no puede ser el literal "undefined": String(undefined) lo
    // produciria. Cadena vacia por defecto; el render ya degrada.
    var nombreFinal = String(body.nombre || '').trim();
    var ciudadFinal = String(body.ciudad || '').trim();
    var leadFinal = String((body.descripcion_corta === undefined || body.descripcion_corta === null)
      ? '' : body.descripcion_corta).trim();

    // Blog: el modal solo pide un resumen. Se usa tambien como arranque del
    // cuerpo completo para que el editor tenga texto de partida -- si llega
    // descripcion_larga explicita, esa tiene prioridad.
    var descripcionFinal = body.descripcion_larga
      ? String(body.descripcion_larga)
      : (cat.esBlog && leadFinal ? leadFinal : null);

    // D6.4 -- al reclamar, la completitud se evalua sobre la fila RESULTANTE
    // (tags viejos + delta), no sobre el payload suelto: si no, el tier del
    // borrador reclamado saldria por debajo del que la fila va a tener.
    var tagsEval = tags;
    if (rec) {
      tagsEval = {};
      var tk;
      for (tk in rec.tags) {
        if (Object.prototype.hasOwnProperty.call(rec.tags, tk)) tagsEval[tk] = rec.tags[tk];
      }
      for (tk in tags) {
        if (Object.prototype.hasOwnProperty.call(tags, tk)) tagsEval[tk] = tags[tk];
      }
    }

    var ev = evaluarFila({
      nombre: nombreFinal,
      categoria_slug: cat.catSlug,
      ciudad: ciudadFinal,
      departamento: body.departamento,
      zona: zonaFinal,
      lead: leadFinal,
      descripcion: descripcionFinal,
      lat: latD,
      lng: lngD,
      whatsapp: body.whatsapp,
      email: body.email,
      web: body.sitio_web,
      instagram: body.instagram
    }, tagsEval, conteo);

    // Claves SOLO de servidor: se estampan DESPUES de las del cliente, asi
    // que cualquier intento de inyeccion queda pisado (D6.1).
    tags.autor_id = autorId;
    tags.estado_envio = estadoFinal;
    tags.origen_envio = origenFinal;
    if (ipHash) tags.ip_hash = ipHash;
    tags.pub_tier = ev.pers.pub_tier;
    tags.pub_completitud = ev.pers.pub_completitud;
    tags.pub_faltantes = ev.pers.pub_faltantes;
    tags.pub_fotos_total = ev.pers.pub_fotos_total;
    tags.pub_fotos_no_hero = ev.pers.pub_fotos_no_hero;
    tags.pub_geo = geoPub;
    tags.pub_foto = ev.pers.pub_fotos_total >= 1;
    // ADR-109 D2 -- estado de XP y PROCEDENCIA del autor, coherentes entre si
    // y derivados del autor resuelto, no del origen del envio. Con autor
    // resuelto JAMAS se escribe 'sin_autor' (era el nulo silencioso que este
    // ADR cierra). La clave pub_autor_origen es el discriminador explicito que
    // D6 necesita para distinguir sesion / admin / anonimo sin tocar
    // origen_envio (que no distingue formulario de teaser ni de admin).
    // 'manual' (reparacion del admin, D8) NO se escribe aqui: lo escribe el
    // editor (merge JSONB). Asi la reparacion se distingue del alta real.
    tags.pub_xp_estado = autorId ? 'pendiente' : 'sin_autor';
    tags.pub_autor_origen = autorId ? 'sesion' : (directo ? 'admin' : 'anonimo');
    if (geoDist !== null) tags.pub_geo_dist_m = geoDist;

    // Alta directa del admin: conserva la publicacion inmediata de hoy. La
    // completitud se calcula igual y el XP solo se acreditara si hay autor
    // (publicar_lugar_otorgar devuelve sin_autor si no lo hay).
    var statusFinal = directo ? 'published' : 'draft';

    // D6.4 -- RECLAMO: se ACTUALIZA la fila reclamada, NUNCA se inserta otra
    // (si se insertara, la semilla quedaria huerfana y el autor veria dos
    // envios). El WHERE repite las condiciones del reclamo para que una
    // carrera (dos pestanas sobre el mismo borrador) no pueda pisar una fila
    // ya enviada. Slug, status y flags de moderacion NO se tocan aqui.
    var filaRec = null;
    if (rec) {
      statusFinal = String(rec.fila.status || 'draft');
      var updRec = await sql(
        'UPDATE destinos SET '
        + 'nombre = $2, categoria_slug = $3, lead = $4, descripcion = $5, highlight = $6, '
        + 'ciudad = $7, region = $8, barrio = $9, zona = $10, '
        + 'lat = $11, lng = $12, '
        + 'whatsapp = $13, telefono = $14, email = $15, web = $16, instagram = $17, '
        + 'precio_desde = $18, horario = $19, foto_hero = $20, '
        + 'booking = $21, hostelworld = $22, airbnb = $23, tipo = $24, '
        + 'sintro = $25, '
        + "tags = COALESCE(tags, '{}'::jsonb) || $26::jsonb, "
        + 'actualizado_en = NOW() '
        + "WHERE id = $1 AND status = 'draft' "
        + "AND (tags->>'autor_id' IS NULL OR tags->>'autor_id' = $27) "
        + "AND COALESCE(tags->>'estado_envio', 'enviado') IN ('semilla', 'borrador') "
        + 'RETURNING id, slug, status, tags',
        [rec.fila.id, nombreFinal, cat.catSlug, leadFinal, descripcionFinal,
         body.frase_destacada || null,
         ciudadFinal, body.departamento || null, body.barrio || null, zonaFinal,
         latD, lngD,
         body.whatsapp || null, body.telefono || null, body.email || null,
         body.sitio_web || null, body.instagram || null,
         precio, body.horario || null, body.foto_principal || null,
         body.booking_url || null, body.hostelworld_url || null, body.airbnb_url || null,
         body.tipo_alojamiento || null,
         normSintro(body.sintro),
         JSON.stringify(tags), autorId]
      );
      filaRec = updRec && updRec[0];
      if (!filaRec) {
        var chk = await sql('SELECT tags FROM destinos WHERE id = $1', [rec.fila.id]);
        var tChk = (chk && chk[0]) ? leerTags(chk[0].tags) : {};
        if (normEstadoEnvio(tChk.estado_envio) === 'enviado')
          return res.status(409).json({ ok: false, error: 'YA_ENVIADO', code: 'YA_ENVIADO' });
        return res.status(404).json({ ok: false, error: 'NO_ENCONTRADO', code: 'NO_ENCONTRADO' });
      }
    }

    var rows = rec ? null : await sql(
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
      + '$27,false,false, '
      + 'NOW(),NOW() '
      + ') RETURNING id, slug',
      [
        nuevoSlug,
        nombreFinal,
        cat.catSlug,
        leadFinal,                                        // lead (nunca "undefined")
        descripcionFinal,                                 // descripcion
        body.frase_destacada    || null,                  // highlight
        ciudadFinal,
        body.departamento       || null,                  // region
        body.barrio             || null,
        zonaFinal,                                        // zona ($10)
        latD,
        lngD,
        body.whatsapp           || null,
        body.telefono           || null,
        body.email              || null,
        body.sitio_web          || null,                  // web
        body.instagram          || null,
        precio,
        body.horario            || null,
        body.foto_principal     || null,                  // foto_hero
        body.booking_url        || null,                  // booking
        body.hostelworld_url    || null,                  // hostelworld
        body.airbnb_url         || null,                  // airbnb
        body.tipo_alojamiento   || null,                  // tipo
        JSON.stringify(tags),
        normSintro(body.sintro),
        statusFinal                                       // $27
      ]
    );

    var destino = rec ? { id: filaRec.id, slug: filaRec.slug } : rows[0];

    // Fotos de galeria -> destinos_fotos, deduplicadas por url (D3.3). El
    // hero NO se inserta aqui: va a la columna foto_hero (D3.1).
    if (Array.isArray(body.fotos_galeria)) {
      var vistas = {};
      var orden = 0;
      // D6.4 -- al reclamar la fila ya existe: se deduplica contra su galeria
      // actual y el orden continua desde el final, para no duplicar fotos ni
      // reordenar las que la semilla ya tuviera.
      if (rec) {
        var yaFotos = await sql('SELECT url FROM destinos_fotos WHERE destino_id = $1', [destino.id]);
        for (var q0 = 0; q0 < (yaFotos || []).length; q0++) {
          var uYa = String(yaFotos[q0].url || '').trim();
          if (uYa) vistas[uYa] = 1;
        }
        orden = (yaFotos || []).length;
      }
      for (var j = 0; j < body.fotos_galeria.length; j++) {
        var foto = body.fotos_galeria[j];
        var urlFoto = (foto && foto.url) ? String(foto.url).trim() : '';
        if (!urlFoto || vistas[urlFoto]) continue;
        vistas[urlFoto] = 1;
        try {
          await sql(
            'INSERT INTO destinos_fotos (destino_id, url, caption, orden) VALUES ($1,$2,$3,$4)',
            [destino.id, urlFoto, (foto && foto.caption) || '', orden]
          );
        } catch(e) { /* no fatal -- la foto principal ya esta */ }
        orden++;
      }
    }

    // D6.4 -- notificar al admin SOLO cuando entra en la cola: las semillas
    // no ensucian la cola y el alta directa del admin no se auto-notifica.
    // ADR-109 paso 4b: la llamada interna NO usa fallback. Sin ADMIN_SECRET
    // viaja una cabecera sin valor y api/admin responde 503 (fail-closed).
    if (estadoFinal === 'enviado' && !directo) {
      try {
        fetch(
          baseApi() + '/api/admin?recurso=notificaciones',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + (adminSecretValor() || ''),
            },
            body: JSON.stringify({
              tipo:             'solicitud',
              nombre:           nombreFinal,
              categoria:        cat.catSlug,
              ciudad:           ciudadFinal,
              whatsapp:         body.whatsapp || '',
              descripcion_corta: leadFinal,
              precio_desde:     precio || '',
            }),
          }
        ).catch(function() {});
      } catch(_) {}
    }

    var mensajeOk;
    if (estadoFinal === 'semilla') {
      mensajeOk = 'Borrador guardado. Puedes continuarlo cuando quieras.';
    } else if (estadoFinal === 'borrador') {
      mensajeOk = 'Borrador reclamado y guardado. Solo falta completar lo que pide el envio.';
    } else if (cat.esBlog) {
      mensajeOk = '\u00a1Historia recibida! El equipo la revisar\u00e1 y la publicar\u00e1 en el blog en 24-48h.';
    } else {
      mensajeOk = '\u00a1Solicitud recibida! El equipo revisar\u00e1 y publicar\u00e1 tu lugar en 24-48h.';
    }

    // 200 (no 201) y contrato actual intacto: ok, mensaje, slug, id, status,
    // url. Se anade lo que el cliente necesita para no recalcular reglas.
    return res.status(200).json({
      ok: true,
      mensaje: mensajeOk,
      slug:   destino.slug,
      id:     destino.id,
      status: statusFinal,
      url:    'https://exploraco.vercel.app/' + destino.slug + '.html',
      estado_envio: estadoFinal,
      origen_envio: tags.origen_envio,
      completitud: respuestaCompletitud(ev)
    });

  } catch(err) {
    console.error('[publicar-lugar]', err.message);
    return res.status(500).json({ ok: false, error: 'Error al guardar.', detalle: err.message });
  }
}

// ===========================================================================
// GET -- ?mios=1 (lista) y ?id=<uuid> (detalle propio). D6.3.
// ===========================================================================
async function manejarGet(req, res) {
  try {
    var q = queryDe(req);
    var authPub = cabeceraAuth(req);
    if (!authPub)
      return res.status(401).json({ ok: false, error: 'SESION_REQUERIDA', code: 'SESION_REQUERIDA' });
    var autGet = resolverAutor(authPub);
    var autorId = autGet.autor_id;
    if (!autorId)
      return res.status(401).json({ ok: false, error: 'SESION_REQUERIDA', code: 'SESION_REQUERIDA', razon: autGet.razon });

    var sql = neon(process.env.DATABASE_URL);
    var id = String(q.id || '').trim();

    if (id) {
      if (!UUID_RE.test(id))
        return res.status(400).json({ ok: false, error: 'id invalido', code: 'ID_INVALIDO' });
      var rows = await sql(
        'SELECT d.id, d.slug, d.nombre, d.categoria_slug, d.lead, d.descripcion, '
        + 'd.highlight, d.ciudad, d.region, d.barrio, d.zona, d.lat, d.lng, '
        + 'd.whatsapp, d.telefono, d.email, d.web, d.instagram, '
        + 'd.precio_desde, d.horario, d.foto_hero, d.sintro, d.status, d.tags, '
        + 'd.creado_en, d.actualizado_en '
        + 'FROM destinos d WHERE d.id = $1',
        [id]
      );
      var fila = rows && rows[0];
      var tagsDet = fila ? leerTags(fila.tags) : {};
      // Ajeno = 404, no 403: no se filtra la existencia de envios de otros.
      if (!fila || String(tagsDet.autor_id || '') !== autorId)
        return res.status(404).json({ ok: false, error: 'NO_ENCONTRADO', code: 'NO_ENCONTRADO' });

      var fotos = await sql(
        'SELECT url, caption, orden FROM destinos_fotos WHERE destino_id = $1 ORDER BY orden',
        [id]
      );
      var listaFotos = [];
      for (var i = 0; i < (fotos || []).length; i++) {
        listaFotos.push({ url: fotos[i].url, caption: fotos[i].caption, orden: fotos[i].orden });
      }
      return res.status(200).json({
        ok: true,
        item: {
          id: fila.id,
          slug: fila.slug,
          nombre: fila.nombre,
          categoria_slug: fila.categoria_slug,
          lead: fila.lead,
          descripcion: fila.descripcion,
          highlight: fila.highlight,
          ciudad: fila.ciudad,
          departamento: fila.region,
          barrio: fila.barrio,
          zona: fila.zona,
          lat: fila.lat,
          lng: fila.lng,
          whatsapp: fila.whatsapp,
          telefono: fila.telefono,
          email: fila.email,
          web: fila.web,
          instagram: fila.instagram,
          precio_desde: fila.precio_desde,
          horario: fila.horario,
          foto_hero: fila.foto_hero,
          sintro: fila.sintro,
          status: fila.status,
          estado_envio: String(tagsDet.estado_envio || ESTADO_ENVIO_DEFECTO),
          origen_envio: tagsDet.origen_envio || null,
          pub_tier: tagsDet.pub_tier || null,
          pub_completitud: (tagsDet.pub_completitud === undefined ? null : tagsDet.pub_completitud),
          pub_faltantes: tagsDet.pub_faltantes || [],
          pub_fotos_total: (tagsDet.pub_fotos_total === undefined ? null : tagsDet.pub_fotos_total),
          pub_fotos_no_hero: (tagsDet.pub_fotos_no_hero === undefined ? null : tagsDet.pub_fotos_no_hero),
          creado_en: fila.creado_en,
          actualizado_en: fila.actualizado_en,
          tags: tagsDet,
          fotos: listaFotos
        }
      });
    }

    var mios = String(q.mios || '');
    if (mios === '1' || mios === 'true') {
      var limit = parseInt(String(q.limit || '20'), 10);
      if (!isFinite(limit) || limit < 1) limit = 20;
      if (limit > 100) limit = 100;
      var offset = parseInt(String(q.offset || '0'), 10);
      if (!isFinite(offset) || offset < 0) offset = 0;

      var filas = await sql(
        "SELECT d.id, d.slug, d.nombre, d.categoria_slug, d.status, d.tags, "
        + "d.creado_en, d.actualizado_en FROM destinos d "
        + "WHERE d.tags->>'autor_id' = $1 ORDER BY d.creado_en DESC LIMIT $2 OFFSET $3",
        [autorId, limit, offset]
      );
      // El total usa EXACTAMENTE el mismo WHERE que la lista: si no, la
      // paginacion miente (misma leccion que D10 en la cola del admin).
      var tot = await sql("SELECT COUNT(*)::int AS n FROM destinos WHERE tags->>'autor_id' = $1", [autorId]);

      var items = [];
      for (var k = 0; k < (filas || []).length; k++) {
        var f = filas[k];
        var t = leerTags(f.tags);
        items.push({
          id: f.id,
          slug: f.slug,
          nombre: f.nombre,
          categoria_slug: f.categoria_slug,
          status: f.status,
          estado_envio: String(t.estado_envio || ESTADO_ENVIO_DEFECTO),
          pub_tier: t.pub_tier || null,
          pub_completitud: (t.pub_completitud === undefined ? null : t.pub_completitud),
          pub_faltantes: t.pub_faltantes || [],
          pub_fotos_total: (t.pub_fotos_total === undefined ? null : t.pub_fotos_total),
          creado_en: f.creado_en,
          actualizado_en: f.actualizado_en
        });
      }
      var total = (tot && tot[0]) ? Number(tot[0].n) : items.length;
      return res.status(200).json({ ok: true, items: items, total: total, limit: limit, offset: offset });
    }

    return res.status(400).json({ ok: false, error: 'Parametro requerido: mios=1 o id', code: 'PARAMETRO_REQUERIDO' });

  } catch (err) {
    console.error('[publicar-lugar][GET]', err.message);
    return res.status(500).json({ ok: false, error: 'Error al consultar.', detalle: err.message });
  }
}

// ===========================================================================
// PATCH -- ?id=<uuid>. Solo mis borradores, allow-list de claves, merge
// JSONB (ADR-003) y revalidacion al pasar a 'enviado'. D6.1 + D6.2.
// ===========================================================================
async function manejarPatch(req, res) {
  try {
    var body = leerBody(req);
    if (!body)
      return res.status(400).json({ ok: false, error: 'Body JSON requerido', code: 'BODY_INVALIDO' });

    var q = queryDe(req);
    var id = String(q.id || body.id || '').trim();
    if (!UUID_RE.test(id))
      return res.status(400).json({ ok: false, error: 'id invalido', code: 'ID_INVALIDO' });

    var authPub = cabeceraAuth(req);
    if (!authPub)
      return res.status(401).json({ ok: false, error: 'SESION_REQUERIDA', code: 'SESION_REQUERIDA' });
    var autPatch = resolverAutor(authPub);
    var autorId = autPatch.autor_id;
    if (!autorId)
      return res.status(401).json({ ok: false, error: 'SESION_REQUERIDA', code: 'SESION_REQUERIDA', razon: autPatch.razon });

    // D6.1 -- allow-list ANTES de tocar la base: fail-closed y visible.
    var prohibida = claveProhibida(body);
    if (prohibida)
      return res.status(400).json({ ok: false, error: 'CLAVE_NO_PERMITIDA: ' + prohibida,
        code: 'CLAVE_NO_PERMITIDA', clave: prohibida });

    var sql = neon(process.env.DATABASE_URL);
    var rows = await sql(
      'SELECT d.id, d.slug, d.nombre, d.categoria_slug, d.lead, d.descripcion, '
      + 'd.ciudad, d.region, d.barrio, d.zona, d.lat, d.lng, '
      + 'd.whatsapp, d.telefono, d.email, d.web, d.instagram, d.foto_hero, '
      + 'd.precio_desde, d.horario, '
      + 'd.tags, d.status '
      + 'FROM destinos d WHERE d.id = $1',
      [id]
    );
    var fila = rows && rows[0];
    if (!fila)
      return res.status(404).json({ ok: false, error: 'NO_ENCONTRADO', code: 'NO_ENCONTRADO' });

    var tagsActuales = leerTags(fila.tags);
    if (String(tagsActuales.autor_id || '') !== autorId)
      return res.status(403).json({ ok: false, error: 'NO_ES_TU_BORRADOR', code: 'NO_ES_TU_BORRADOR' });
    if (String(fila.status || '') !== 'draft')
      return res.status(409).json({ ok: false, error: 'NO_EDITABLE', code: 'NO_EDITABLE' });

    var estadoActual = String(tagsActuales.estado_envio || ESTADO_ENVIO_DEFECTO);
    // 'enviado' no vuelve atras: 409 (no 403) porque el problema es el
    // ESTADO, no la propiedad. Sacar de la cola una solicitud en revision es
    // lo que D6.2 prohibe.
    if (estadoActual === 'enviado')
      return res.status(409).json({ ok: false, error: 'YA_ENVIADO', code: 'YA_ENVIADO' });
    if (ESTADOS_EDITABLES.indexOf(estadoActual) === -1)
      return res.status(409).json({ ok: false, error: 'NO_EDITABLE', code: 'NO_EDITABLE' });

    var estadoDestino = estadoActual;
    var traeEstado = (body.estado_envio !== undefined && body.estado_envio !== null
      && String(body.estado_envio).trim() !== '');
    if (traeEstado) {
      var objetivo = normEstadoEnvio(body.estado_envio);
      if (!objetivo)
        return res.status(400).json({ ok: false, error: 'ESTADO_ENVIO_INVALIDO',
          code: 'ESTADO_ENVIO_INVALIDO', campo: 'estado_envio' });
      if (objetivo === 'semilla' && estadoActual !== 'semilla')
        return res.status(400).json({ ok: false, error: 'TRANSICION_INVALIDA',
          code: 'TRANSICION_INVALIDA', campo: 'estado_envio' });
      estadoDestino = objetivo;
    }

    // --- Valores de columna resultantes (merge fila + body) ---
    var cat = (body.categoria !== undefined)
      ? resolverCategoriaPublicacion(body.categoria)
      : { categoria: String(fila.categoria_slug || ''),
          esBlog: String(fila.categoria_slug || '') === 'blog',
          catSlug: String(fila.categoria_slug || 'sitio') };

    var nombre = (body.nombre !== undefined) ? String(body.nombre || '').trim() : String(fila.nombre || '').trim();
    var ciudad = (body.ciudad !== undefined) ? String(body.ciudad || '').trim() : String(fila.ciudad || '').trim();
    var region = (body.departamento !== undefined) ? (body.departamento || null) : (fila.region || null);
    var barrio = (body.barrio !== undefined) ? (body.barrio || null) : (fila.barrio || null);
    var zona = (body.zona !== undefined || body.departamento !== undefined)
      ? resolverZona(body.zona !== undefined ? body.zona : fila.zona, region)
      : (fila.zona || null);
    var lead = (body.descripcion_corta !== undefined)
      ? String(body.descripcion_corta === null ? '' : body.descripcion_corta).trim()
      : String(fila.lead || '');
    var descripcion = (body.descripcion_larga !== undefined)
      ? (body.descripcion_larga ? String(body.descripcion_larga) : null)
      : (fila.descripcion || null);
    var lat = (body.latitud !== undefined) ? numONull(body.latitud) : numONull(fila.lat);
    var lng = (body.longitud !== undefined) ? numONull(body.longitud) : numONull(fila.lng);
    var whatsapp = (body.whatsapp !== undefined) ? (body.whatsapp || null) : (fila.whatsapp || null);
    var telefono = (body.telefono !== undefined) ? (body.telefono || null) : (fila.telefono || null);
    var email = (body.email !== undefined) ? (body.email || null) : (fila.email || null);
    var web = (body.sitio_web !== undefined) ? (body.sitio_web || null) : (fila.web || null);
    var instagram = (body.instagram !== undefined) ? (body.instagram || null) : (fila.instagram || null);
    var fotoHero = (body.foto_principal !== undefined)
      ? (body.foto_principal ? String(body.foto_principal).trim() : null)
      : (fila.foto_hero || null);
    // D6.1 -- precio_desde y horario son COLUMNA, no tags. Si no vienen en el
    // body se conserva lo que ya tenia la fila (no se borra en silencio).
    var precio = (body.precio_desde !== undefined)
      ? formatearPrecio(body.precio_desde)
      : (fila.precio_desde || null);
    var horario = (body.horario !== undefined) ? (body.horario || null) : (fila.horario || null);

    // --- Delta de tags: SOLO claves de la lista blanca ---
    var delta = {};
    var tCliente = (body.tags && typeof body.tags === 'object') ? body.tags : {};
    var k;
    for (k in tCliente) {
      if (!Object.prototype.hasOwnProperty.call(tCliente, k)) continue;
      if (CLAVES_CLIENTE.indexOf(k) === -1) continue;
      if (k === 'estado_envio') continue;
      delta[k] = tCliente[k];
    }
    // Simetria con el POST: el formulario puede mandar sitio_* y se mapean a
    // su clave de tags, siempre dentro de la lista blanca.
    var tagsPost = construirTagsCliente(body, cat.catSlug);
    for (k in tagsPost) {
      if (!Object.prototype.hasOwnProperty.call(tagsPost, k)) continue;
      if (delta[k] === undefined) delta[k] = tagsPost[k];
    }

    if (delta.subcategoria !== undefined) {
      var sc = String(delta.subcategoria === null ? '' : delta.subcategoria).toLowerCase();
      if (SUBCAT_LISTA[cat.catSlug] && SUBCAT_LISTA[cat.catSlug].indexOf(sc) !== -1) delta.subcategoria = sc;
      else delete delta.subcategoria;
    }
    if (delta.video_url !== undefined) {
      var vv = String(delta.video_url === null ? '' : delta.video_url).trim();
      if (vv && esVideoUrlSegura(vv)) delta.video_url = vv;
      else delete delta.video_url;
    }

    // D8.2 -- el tema se valida contra BLOG_TEMAS y solo existe en blog.
    var temaEfectivo = '';
    if (cat.esBlog) {
      var temaSrc = (body.tema !== undefined)
        ? body.tema
        : (delta.tema !== undefined ? delta.tema : tagsActuales.tema);
      var temaNorm = String((temaSrc === undefined || temaSrc === null) ? '' : temaSrc).trim().toLowerCase();
      if (BLOG_TEMAS.indexOf(temaNorm) !== -1) {
        delta.tema = temaNorm;
        temaEfectivo = temaNorm;
      } else {
        delete delta.tema;
        temaEfectivo = String(tagsActuales.tema || '');
      }
    } else {
      delete delta.tema;
    }

    if (estadoDestino !== estadoActual) delta.estado_envio = estadoDestino;

    // --- Galeria: se cuenta la resultante, deduplicada por url (D3.3) ---
    var fotosActuales = await sql(
      'SELECT url FROM destinos_fotos WHERE destino_id = $1 ORDER BY orden', [id]);
    var fotosTodas = [];
    var vistos = {};
    var f;
    for (f = 0; f < (fotosActuales || []).length; f++) {
      var u0 = String(fotosActuales[f].url || '').trim();
      if (!u0 || vistos[u0]) continue;
      vistos[u0] = 1;
      fotosTodas.push({ url: u0 });
    }
    var nuevas = [];
    if (Array.isArray(body.fotos_galeria)) {
      for (f = 0; f < body.fotos_galeria.length; f++) {
        var fotoN = body.fotos_galeria[f];
        var u1 = (fotoN && fotoN.url) ? String(fotoN.url).trim() : '';
        if (!u1 || vistos[u1]) continue;
        vistos[u1] = 1;
        fotosTodas.push({ url: u1 });
        nuevas.push({ url: u1, caption: (fotoN && fotoN.caption) || '' });
      }
    }
    var conteo = ECCompletitud.contarFotos(fotosTodas, fotoHero);

    // D6.2 -- la transicion a 'enviado' REVALIDA la validacion minima
    // completa: sin esto el PATCH seria la puerta trasera para encolar
    // fichas vacias.
    if (estadoDestino === 'enviado') {
      var v = validarEnvio({
        estadoEnvio: 'enviado',
        nombre: nombre,
        categoria: cat.categoria || cat.catSlug,
        ciudad: ciudad,
        lead: lead,
        email: email,
        esBlog: cat.esBlog,
        tema: temaEfectivo,
        fotosTotal: conteo.total
      });
      if (!v.ok) return res.status(400).json({ ok: false, error: v.error, code: v.code, campo: v.campo });
    } else if (conteo.total > MAX_FOTOS) {
      return res.status(400).json({ ok: false, error: 'FOTOS_EXCEDIDAS',
        code: 'FOTOS_EXCEDIDAS', campo: 'fotos_galeria' });
    }

    // --- Completitud sobre la fila RESULTANTE (D5.1) ---
    var tagsFinal = {};
    for (k in tagsActuales) {
      if (Object.prototype.hasOwnProperty.call(tagsActuales, k)) tagsFinal[k] = tagsActuales[k];
    }
    for (k in delta) {
      if (Object.prototype.hasOwnProperty.call(delta, k)) tagsFinal[k] = delta[k];
    }

    var ev = evaluarFila({
      nombre: nombre,
      categoria_slug: cat.catSlug,
      ciudad: ciudad,
      departamento: region,
      zona: zona,
      lead: lead,
      descripcion: descripcion,
      lat: lat,
      lng: lng,
      whatsapp: whatsapp,
      email: email,
      web: web,
      instagram: instagram
    }, tagsFinal, conteo);

    // Los pub_* los recalcula SIEMPRE el servidor. pub_geo NO se toca: es
    // inmutable (D5.2, solo se midio en el envio).
    delta.pub_tier = ev.pers.pub_tier;
    delta.pub_completitud = ev.pers.pub_completitud;
    delta.pub_faltantes = ev.pers.pub_faltantes;
    delta.pub_fotos_total = ev.pers.pub_fotos_total;
    delta.pub_fotos_no_hero = ev.pers.pub_fotos_no_hero;
    delta.pub_foto = ev.pers.pub_fotos_total >= 1;

    // Galeria nueva: solo despues de validar, para no dejar fotos huerfanas.
    var baseOrden = fotosTodas.length - nuevas.length;
    for (f = 0; f < nuevas.length; f++) {
      try {
        await sql(
          'INSERT INTO destinos_fotos (destino_id, url, caption, orden) VALUES ($1,$2,$3,$4)',
          [id, nuevas[f].url, nuevas[f].caption || '', baseOrden + f]
        );
      } catch (eFoto) { /* no fatal */ }
    }

    // ADR-003: MERGE JSONB, nunca reemplazo total.
    var upd = await sql(
      'UPDATE destinos SET '
      + 'nombre = $2, categoria_slug = $3, lead = $4, descripcion = $5, '
      + 'ciudad = $6, region = $7, barrio = $8, zona = $9, '
      + 'lat = $10, lng = $11, '
      + 'whatsapp = $12, telefono = $13, email = $14, web = $15, instagram = $16, '
      + 'foto_hero = $17, '
      + 'precio_desde = $18, horario = $19, '
      + "tags = COALESCE(tags, '{}'::jsonb) || $20::jsonb, "
      + 'actualizado_en = NOW() '
      + "WHERE id = $1 AND status = 'draft' AND tags->>'autor_id' = $21 "
      + 'RETURNING id, slug, status, tags',
      [id, nombre, cat.catSlug, lead, descripcion, ciudad, region, barrio, zona,
       lat, lng, whatsapp, telefono, email, web, instagram, fotoHero, precio, horario,
       JSON.stringify(delta), autorId]
    );

    var filaUpd = upd && upd[0];
    if (!filaUpd)
      return res.status(404).json({ ok: false, error: 'NO_ENCONTRADO', code: 'NO_ENCONTRADO' });
    var tagsRes = leerTags(filaUpd.tags);

    return res.status(200).json({
      ok: true,
      id: filaUpd.id,
      slug: filaUpd.slug,
      status: filaUpd.status,
      estado_envio: String(tagsRes.estado_envio || estadoDestino),
      completitud: respuestaCompletitud(ev),
      tags: tagsRes
    });

  } catch (err) {
    console.error('[publicar-lugar][PATCH]', err.message);
    return res.status(500).json({ ok: false, error: 'Error al actualizar.', detalle: err.message });
  }
}
