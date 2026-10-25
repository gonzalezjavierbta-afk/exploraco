// scripts/seed-medellin.js
//
// SEED de la pagina de CIUDAD medellin (categoria 'sitio'), conforme a ADR-100.
//
// CONTENIDO: patron de scripts/seed-bogota.js (BASE + TAGS con fauna_flora y
// secretos como STRING JSON, entradas/tours/equipamiento/itinerario/
// dificultad_tags como arrays, temporada_matriz como objeto, FAQS a
// destinos_detalles). La ficha de entrada es ficha/ficha-medellin.json, que ya
// viene validada (validate_ficha.js --sin-fotos PASS) y sin fotos.
//
// LOGICA DE ESCRITURA: NO se copia de seed-bogota.js. Se REUTILIZA
// scripts/seed-medellin-lote1.js, que es el seed conforme a ADR-100:
//   - lectura de la ficha (construirFicha)
//   - shim de window para geo-ciudades.js y derivacion region/zona (ADR-097)
//   - normalizacion de tags (secretos/fauna_flora como texto JSON, BUG-024)
//   - llamada a lib/completitud.js (normalizarFila + calcular + persistible)
// Aqui no se reimplementa la aritmetica de completitud ni el mapa geografico:
// se consumen. La unica diferencia con el lote es que esta ficha NO tiene
// fotos, asi que foto_hero se escribe NULL explicito (columna sin ambiguedad)
// y el motor cae a hero_bg solido (#1b4d3e, api/pagina-destino.js:679).
//
// ADMISION (ADR-100 D2): status='published' SOLO si pasan las guardas duras
// (nombre, categoria, ciudad, descripcion_corta >= 30, coordenadas validas,
// foto_hero) y pub_completitud >= UMBRAL_INTERMEDIO. Sin foto_hero la fila va a
// draft.
//
// SUBCATEGORIA: se OMITE a proposito. La lista cerrada de 'sitio' (naturaleza,
// museo, cultura, bar, parque, espacio-publico, sitio-historico, religioso,
// aventura) describe un lugar, no una ciudad entera; elegir 'cultura' o
// 'espacio-publico' seria reduccionista y falso. Sin subcategoria el motor
// aplica el fallback de ADR-016 (todas las secciones activas), que es justo lo
// que una pagina de ciudad necesita. Coste real: 2 puntos de completitud
// (64 en vez de 66); no se compensa inventando un valor.
//
// EXCEPCION AUTORIZADA POR EL OPERADOR (documentada, no silenciosa):
//   --publicar-sin-foto
// Permite publicar ESTA ficha con foto_hero NULL. Solo neutraliza la guarda
// foto_hero: cualquier otra guarda rota o una completitud bajo el umbral siguen
// mandando la fila a draft. Cuando se usa, la excepcion queda escrita en
// destinos.tags.excepcion_admision con tipo 'sin_foto_hero',
// autorizada_operador=true y la fecha, para que no sea un silencio.
//
// Uso:
//   node scripts/seed-medellin.js                        -> DRY (defecto)
//   node scripts/seed-medellin.js --dry                  -> DRY explicito
//   node scripts/seed-medellin.js --publicar-sin-foto    -> DRY mostrando la excepcion
//   DATABASE_URL=... node scripts/seed-medellin.js --write
//   DATABASE_URL=... node scripts/seed-medellin.js --write --publicar-sin-foto
//
// DRY ES EL DEFECTO: sin --write (o --apply) el script NO abre conexion.
// Prohibido DELETE: el upsert es ON CONFLICT (slug) DO UPDATE con merge JSONB.
// Destinos_fotos: CERO filas (esta ficha no tiene fotos).
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var C = require('../lib/completitud.js');
var S = require('./seed-medellin-lote1.js');

var ROOT = path.resolve(__dirname, '..');
var SLUG = 'medellin';
var UMBRAL = C.UMBRAL_INTERMEDIO;
var CLAVE_EXCEPCION = 'excepcion_admision';

// ---------------------------------------------------------------------------
// Lectura de la ficha (para BASE.status; el resto lo hace construirFicha)
// ---------------------------------------------------------------------------

function fichaCruda(slug) {
  var archivo = path.join(ROOT, 'ficha', 'ficha-' + slug + '.json');
  if (!fs.existsSync(archivo)) throw new Error('no existe ' + path.relative(ROOT, archivo));
  return JSON.parse(fs.readFileSync(archivo, 'utf8'));
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Guardas duras (ADR-100 D2)
// ---------------------------------------------------------------------------

function esNumero(v) {
  return typeof v === 'number' && isFinite(v);
}

function coordsValidas(lat, lng) {
  if (!esNumero(lat) || !esNumero(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

// Devuelve la lista de guardas ROTAS. 'foto_hero' es la unica que la bandera
// --publicar-sin-foto puede neutralizar.
function guardasRotas(base) {
  var rotas = [];
  if (!String(base.nombre || '').trim()) rotas.push('nombre');
  if (!String(base.categoria_slug || '').trim()) rotas.push('categoria_slug');
  if (!String(base.ciudad || '').trim()) rotas.push('ciudad');
  if (String(base.lead || '').trim().length < 30) rotas.push('descripcion_corta>=30');
  if (!coordsValidas(base.lat, base.lng)) rotas.push('coordenadas');
  if (!String(base.foto_hero === null || base.foto_hero === undefined ? '' : base.foto_hero).trim()) {
    rotas.push('foto_hero');
  }
  return rotas;
}

// ---------------------------------------------------------------------------
// Decision de status: se evalua dos veces (con y sin la bandera) para que el
// --dry muestre el escenario real de cada modo.
// ---------------------------------------------------------------------------

function decidir(f, rotas, publicarSinFoto) {
  var otras = rotas.filter(function (g) { return g !== 'foto_hero'; });
  var sinFoto = rotas.indexOf('foto_hero') !== -1;

  if (otras.length) return { status: 'draft', motivo: 'guardas:' + otras.join(',') };
  if (f.pub.pub_completitud < UMBRAL) {
    return { status: 'draft', motivo: 'completitud ' + f.pub.pub_completitud + ' < ' + UMBRAL };
  }
  if (String(f.statusFicha || '') === 'draft') return { status: 'draft', motivo: 'ficha marcada draft' };
  if (sinFoto && !publicarSinFoto) {
    return {
      status: 'draft',
      motivo: 'guardas:foto_hero (ADR-100 D2: sin foto_hero -> draft; ' +
        'excepcion explicita con --publicar-sin-foto)'
    };
  }
  if (sinFoto) {
    return {
      status: 'published',
      motivo: 'excepcion_admision:sin_foto_hero autorizada_operador ' + hoyISO()
    };
  }
  return { status: 'published', motivo: '' };
}

// ---------------------------------------------------------------------------
// Construccion de la ficha lista para escribir
// ---------------------------------------------------------------------------

// Fila EXACTA que se persiste (misma forma que consume normalizarFila). Se
// reutiliza la de lote1: lead->descripcion_corta, descripcion->larga, region,
// zona, tags normalizados y faqs.
function filaPersistida(base, faqs, tags) {
  return {
    nombre: base.nombre,
    categoria_slug: base.categoria_slug,
    ciudad: base.ciudad,
    region: base.region,
    zona: base.zona,
    lat: base.lat,
    lng: base.lng,
    lead: base.lead,
    descripcion: base.descripcion,
    foto_hero: base.foto_hero,
    whatsapp: base.whatsapp,
    telefono: base.telefono,
    email: base.email,
    web: base.web,
    instagram: base.instagram,
    precio_desde: base.precio_desde,
    horario: base.horario,
    faqs: faqs,
    tags: tags
  };
}

function construir(opciones) {
  var opts = opciones || {};
  var publicarSinFoto = opts.publicarSinFoto === true;

  // construirFicha(): lectura + geo + tags + completitud de lib/completitud.js.
  var f = S.construirFicha(SLUG);
  var cruda = fichaCruda(SLUG);

  // foto_hero NULL explicito: la columna queda sin ambiguedad y el motor cae a
  // hero_bg (#1b4d3e). construirFicha la dejaba como '' porque resuelve el hero
  // desde las fotos, y aqui no hay ninguna.
  f.base.foto_hero = null;
  f.fotos = [];
  f.hero = null;
  f.statusFicha = String((cruda.BASE && cruda.BASE.status) || '');

  // Completitud recalculada sobre la fila EXACTA que se escribe (misma fuente
  // unica de la aritmetica: lib/completitud.js).
  var fila = filaPersistida(f.base, f.faqs, f.tags);
  var normalizada = C.normalizarFila(fila, f.fotos);
  var resultado = C.calcular(normalizada);
  var pub = C.persistible(resultado);
  f.pub = pub;
  f.completitud = {
    puntos: pub.pub_completitud,
    tier: pub.pub_tier,
    faltantes: pub.pub_faltantes,
    fotos_total: pub.pub_fotos_total,
    fotos_no_hero: pub.pub_fotos_no_hero,
    version: resultado.version,
    bloques: resultado.bloques
  };

  var rotas = guardasRotas(f.base);
  f.guardas = rotas;
  f.guardasNeutralizadas = rotas.filter(function (g) { return g === 'foto_hero'; });

  var sinBandera = decidir(f, rotas, false);
  var conBandera = decidir(f, rotas, true);
  f.statusSinBandera = sinBandera.status;
  f.motivoSinBandera = sinBandera.motivo;
  f.statusConBandera = conBandera.status;
  f.motivoConBandera = conBandera.motivo;

  var decidido = publicarSinFoto ? conBandera : sinBandera;
  f.status = decidido.status;
  f.motivo = decidido.motivo;
  f.publicarSinFoto = publicarSinFoto;

  // La excepcion se registra en tags SOLO si de verdad se publica por ella.
  f.excepcion = null;
  if (publicarSinFoto && rotas.indexOf('foto_hero') !== -1) {
    f.excepcion = {
      tipo: 'sin_foto_hero',
      autorizada_operador: true,
      fecha: hoyISO(),
      motivo: 'Pagina de ciudad sin fotos por decision del operador; el hero ' +
        'degrada a hero_bg solido + emoji (ADR-100 D2).',
      seed: 'scripts/seed-medellin.js'
    };
  }

  return f;
}

// ---------------------------------------------------------------------------
// Escritura: upsert por slug, sin DELETE, merge JSONB
// ---------------------------------------------------------------------------

// Identico al de seed-medellin-lote1.js:453-477 (no esta exportado). Columnas
// en el mismo orden que parametros().
var SQL_UPSERT = 'INSERT INTO destinos ( '
  + 'slug, nombre, categoria_slug, lead, descripcion, highlight, '
  + 'ciudad, region, barrio, zona, lat, lng, '
  + 'whatsapp, telefono, email, web, instagram, '
  + 'precio_desde, horario, emoji, hero_bg, foto_hero, '
  + 'tipo, capacidad, como_llegar, '
  + 'status, destacado, tags, creado_en, actualizado_en '
  + ') VALUES ( '
  + '$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'
  + '$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,NOW(),NOW() '
  + ') '
  + 'ON CONFLICT (slug) DO UPDATE SET '
  + 'nombre=EXCLUDED.nombre, categoria_slug=EXCLUDED.categoria_slug, '
  + 'lead=EXCLUDED.lead, descripcion=EXCLUDED.descripcion, highlight=EXCLUDED.highlight, '
  + 'ciudad=EXCLUDED.ciudad, region=EXCLUDED.region, barrio=EXCLUDED.barrio, zona=EXCLUDED.zona, '
  + 'lat=EXCLUDED.lat, lng=EXCLUDED.lng, '
  + 'whatsapp=EXCLUDED.whatsapp, telefono=EXCLUDED.telefono, email=EXCLUDED.email, '
  + 'web=EXCLUDED.web, instagram=EXCLUDED.instagram, '
  + 'precio_desde=EXCLUDED.precio_desde, horario=EXCLUDED.horario, '
  + 'emoji=EXCLUDED.emoji, hero_bg=EXCLUDED.hero_bg, foto_hero=EXCLUDED.foto_hero, '
  + 'tipo=EXCLUDED.tipo, capacidad=EXCLUDED.capacidad, como_llegar=EXCLUDED.como_llegar, '
  + 'status=EXCLUDED.status, destacado=EXCLUDED.destacado, '
  + 'tags = COALESCE(destinos.tags, \'{}\'::jsonb) || EXCLUDED.tags, '
  + 'actualizado_en = NOW() '
  + 'RETURNING id, slug, nombre, status, zona';

// Tags persistidos: las cinco claves pub_* de persistible() + faqs (el motor
// sobrescribe det.faqs con tags.faqs cuando destinos_detalles no trae
// amenidades, api/pagina-destino.js:3117-3126) + la excepcion si aplica.
// NUNCA autor_id, pub_xp_estado, pub_geo ni pub_foto: una fila de seed no
// tiene autor ni XP (ADR-100 D3).
function tagsPersistidos(f) {
  var tags = S.tagsPersistidos(f);
  if (f.excepcion) tags[CLAVE_EXCEPCION] = f.excepcion;
  // Flag de FILA (api/pagina-destino.js:712-747): esta pagina de CIUDAD va sin
  // fotos por decision del operador, asi que el motor debe cortar el fallback
  // Unsplash de categoria y pintar hero_bg solido + emoji, omitiendo ademas
  // og:image, twitter:image y el image del JSON-LD. Se escribe SOLO cuando la
  // fila no tiene fotos: no es un valor por defecto de un seed generico.
  if (!f.fotos.length) tags.sin_foto_hero = true;
  return tags;
}

function parametros(f) {
  var b = f.base;
  return [
    b.slug, b.nombre, b.categoria_slug, b.lead, b.descripcion, b.highlight,
    b.ciudad, b.region, b.barrio, b.zona, b.lat, b.lng,
    b.whatsapp, b.telefono, b.email, b.web, b.instagram,
    b.precio_desde, b.horario, b.emoji, b.hero_bg,
    b.foto_hero === null || b.foto_hero === undefined ? null : b.foto_hero,
    b.tipo, b.capacidad, b.como_llegar,
    f.status, true, JSON.stringify(tagsPersistidos(f))
  ];
}

async function escribirFicha(sql, f) {
  var filas = await sql(SQL_UPSERT, parametros(f));
  var fila = filas[0];

  if (f.faqs.length) {
    // destinos_detalles tiene 17 columnas y NO tiene creado_en (medido por
    // @data-migration contra information_schema de produccion): el INSERT lista
    // solo columnas que existen. El defecto era del seed, no del esquema.
    await sql(
      'INSERT INTO destinos_detalles (destino_id, faqs) VALUES ($1,$2) '
      + 'ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs',
      [fila.id, JSON.stringify(f.faqs)]
    );
  }

  // destinos_fotos: CERO filas. Esta ficha no tiene fotos y el seed no borra
  // nada (prohibido DELETE): si algun dia llegan fotos, entran por el camino
  // normal, no por aqui.
  return fila;
}

// ---------------------------------------------------------------------------
// Resumen del --dry
// ---------------------------------------------------------------------------

function lista(v) {
  return (Array.isArray(v) && v.length) ? v.join(',') : 'ninguno';
}

function resumen(f) {
  var l = [];
  l.push(f.slug
    + ' | status=' + f.status
    + ' | pub_tier=' + f.completitud.tier
    + ' | pub_completitud=' + f.completitud.puntos
    + ' | zona=' + (f.base.zona || 'NULL')
    + ' | faltantes=' + lista(f.completitud.faltantes));
  l.push('  status sin --publicar-sin-foto: ' + f.statusSinBandera
    + (f.motivoSinBandera ? ' (' + f.motivoSinBandera + ')' : ''));
  l.push('  status con --publicar-sin-foto: ' + f.statusConBandera
    + (f.motivoConBandera ? ' (' + f.motivoConBandera + ')' : ''));
  l.push('  foto_hero=NULL | hero_bg=' + f.base.hero_bg + ' | fotos=' + f.fotos.length
    + ' | destinos_fotos=0 | destacado=true');
  l.push('  ciudad=' + f.base.ciudad + ' | region=' + f.base.region
    + ' | zona=' + (f.base.zona || 'NULL') + ' | subcategoria=' + (f.subcategoria || '(omitida)'));
  l.push('  guardas_rotas=' + lista(f.guardas)
    + ' | pub_fotos_total=' + f.pub.pub_fotos_total
    + ' | pub_fotos_no_hero=' + f.pub.pub_fotos_no_hero
    + ' | version=' + f.completitud.version);
  if (f.excepcion) {
    l.push('  ' + CLAVE_EXCEPCION + '=' + JSON.stringify(f.excepcion));
  }
  return l.join('\n');
}

function parseArgs(argv) {
  var base = S.parseArgs(argv);
  base.publicarSinFoto = argv.indexOf('--publicar-sin-foto') !== -1;
  return base;
}

async function main() {
  var args = parseArgs(process.argv.slice(2));
  var f = construir({ publicarSinFoto: args.publicarSinFoto });

  console.log('SEED medellin (ciudad / sitio) - ADR-100');
  console.log('MODO: ' + (args.write ? 'WRITE (upsert por slug)' : 'DRY (defecto)')
    + ' | UMBRAL_INTERMEDIO=' + UMBRAL + ' | version completitud=' + C.VERSION);
  console.log('EXCEPCION --publicar-sin-foto: ' + (args.publicarSinFoto ? 'ACTIVA' : 'no activa'));
  console.log('DATABASE_URL: ' + (process.env.DATABASE_URL
    ? 'definida'
    : (args.write ? 'NO definida (obligatoria para escribir)' : 'no definida (irrelevante en DRY)')));
  console.log('---');
  console.log(resumen(f));
  console.log('---');

  if (!args.write) {
    console.log('[dry] No se ha escrito nada. Para escribir: '
      + 'DATABASE_URL=... node scripts/seed-medellin.js --write');
    return;
  }

  var url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL para escribir. Nada se ha tocado.');
    process.exit(1);
  }
  if (f.status !== 'published') {
    console.error('La fila sale en draft (' + f.motivo + '). No se escribe: '
      + 'revisa la ficha o usa --publicar-sin-foto si la excepcion esta autorizada.');
    process.exit(1);
  }

  var sql = require('@neondatabase/serverless').neon(url);
  var fila = await escribirFicha(sql, f);
  console.log('OK - ' + fila.slug + ' (' + fila.id + ') status=' + fila.status
    + ' zona=' + (fila.zona || 'NULL') + ' fotos=0 faqs=' + f.faqs.length);
  console.log('Listo. Verifica /medellin.html, /api/destinos?categoria=sitio y el sitemap.');
}

if (require.main === module) {
  main().catch(function (err) {
    console.error('ERROR: ' + (err && err.message ? err.message : String(err)));
    process.exit(1);
  });
}

module.exports = {
  SLUG: SLUG,
  UMBRAL: UMBRAL,
  CLAVE_EXCEPCION: CLAVE_EXCEPCION,
  SQL_UPSERT: SQL_UPSERT,
  construir: construir,
  guardasRotas: guardasRotas,
  filaPersistida: filaPersistida,
  tagsPersistidos: tagsPersistidos,
  parametros: parametros,
  resumen: resumen,
  parseArgs: parseArgs
};
