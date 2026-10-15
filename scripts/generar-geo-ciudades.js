/**
 * generar-geo-ciudades.js  --  ExploraCO
 * Genera el artefacto estatico geo-ciudades.js que consume el navegador.
 *
 *   node scripts/generar-geo-ciudades.js
 *
 * ENTRADA : db/seeds/geo_ciudades_seed.json (1122 registros)
 * SALIDA  : geo-ciudades.js  (raiz del repo, junto a dictado-voz.js)
 *
 * CONTRATO DEL ARTEFACTO (ADR-097 D2, NO CAMBIAR):
 *   window.GEO_CIUDADES = { version: '<ISO date>', items: [ [nombre, departamento, zona, lat, lng], ... ] };
 *   - la zona YA viene resuelta: el unico mapa departamento -> zona vive AQUI.
 *   - el navegador lee el valor, no lo deduce, y no lleva copia del mapa.
 *   - el campo tipo no se emite: la busqueda es por nombre y el usuario no lo ve.
 *   - no se emiten indices precalculados: la busqueda se arma en runtime.
 *
 * NORMATIVA: ADR-001 vanilla JS sin build tools (este script es Node de build,
 * el artefacto es JS plano); ADR-002 ASCII-safe estricto, cero backticks;
 * cero endpoints nuevos (presupuesto Vercel 8/8 intacto).
 *
 * IDEMPOTENCIA: la salida se ordena por (departamento_normalizado,
 * nombre_normalizado, cod_mpio) y la deduplicacion usa cod_mpio, de modo que
 * dos ejecuciones seguidas producen un archivo identico byte a byte. El unico
 * campo que depende del tiempo es version; se puede fijar con la variable
 * de entorno GEO_CIUDADES_VERSION para congelar la salida.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// MAPA UNICO Y UNICO: departamento -> zona natural (33 departamentos).
//
// FUENTE DE VERDAD Y MAPEO (dejar documentado aqui, no en un comentario suelto):
//   - El catalogo zonas_geograficas de Neon (db/migrations/027_zonas_marcas.sql,
//     L119-124) sembro 5 filas con estos slugs:
//         caribe  pacifico  andes  llanos  amazonia
//   - destinos.zona (db/migrations/028_destinos_zona.sql, L32-34) usa otra
//     nomenclatura: andina y amazonica en lugar de andes y amazonia.
//     No hay FK entre ambos catalogos; conviven por convention (deuda abierta
//     en NEXT.md: alinear slugs de zona con la 027).
//   - MIGRACION EXPLICITA usada por este generador (unica, con nombre):
//
//         const ZONAS_ZG_A_DESTINOS = {
//           andes:    'andina',      <- zonas_geograficas.slug -> destinos.zona
//           amazonia: 'amazonica',
//           caribe:   'caribe',
//           pacifico: 'pacifico',
//           llanos:   'llanos'
//         };
//
//   - Si zonas_geograficas cambia sus slugs, se corrige SOLO aqui y el
//     artefacto se regenera: el navegador nunca lleva esta tabla.
//
// La deduccion por departamento se hace sobre departamento_normalizado
// (ya sin tildes en el seed), por eso estas claves son ASCII puro.
// ---------------------------------------------------------------------------
const ZONAS_ZG_A_DESTINOS = {
  andes: 'andina',
  amazonia: 'amazonica',
  caribe: 'caribe',
  pacifico: 'pacifico',
  llanos: 'llanos'
};

// keys: departamento_normalizado del seed -> slug de zonas_geograficas
const ZONA_POR_DEPARTAMENTO = {
  'amazonas': 'amazonia',
  'antioquia': 'andes',
  'arauca': 'llanos',
  'archipielago de san andres providencia y santa catalina': 'caribe',
  'atlantico': 'caribe',
  // OJO: la clave es el departamento_normalizado del seed, que ya viene SIN
  // puntuacion: "BOGOTA, D.C." se normaliza a "bogota d c" (coma y punto fuera).
  'bogota d c': 'andes',
  'bolivar': 'caribe',
  'boyaca': 'andes',
  'caldas': 'andes',
  'caqueta': 'amazonia',
  'casanare': 'llanos',
  'cauca': 'pacifico',
  'cesar': 'andes',
  'choco': 'pacifico',
  'cundinamarca': 'andes',
  'cordoba': 'andes',
  'guainia': 'amazonia',
  'guaviare': 'amazonia',
  'huila': 'andes',
  'la guajira': 'caribe',
  'magdalena': 'caribe',
  'meta': 'llanos',
  'narino': 'andes',
  'norte de santander': 'andes',
  'putumayo': 'amazonia',
  'quindio': 'andes',
  'risaralda': 'andes',
  'santander': 'andes',
  'sucre': 'andes',
  'tolima': 'andes',
  'valle del cauca': 'pacifico',
  'vaupes': 'amazonia',
  'vichada': 'llanos'
};

const RAIZ = path.resolve(__dirname, '..');
const RUTA_SEED = path.join(RAIZ, 'db', 'seeds', 'geo_ciudades_seed.json');
const RUTA_SALIDA = path.join(RAIZ, 'geo-ciudades.js');

/** Convierte cualquier caracter > 127 en escape \uXXXX simple (ADR-002). */
function asciiSafe(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    out += code > 127
      ? '\\u' + code.toString(16).toUpperCase().padStart(4, '0')
      : s.charAt(i);
  }
  return out;
}

/** Numero a texto fijo: determinista entre ejecuciones y entre maquinas. */
function coord(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(6) : '0.000000';
}

function main() {
  const seed = JSON.parse(fs.readFileSync(RUTA_SEED, 'utf8'));
  if (!Array.isArray(seed) || seed.length === 0) {
    throw new Error('geo_ciudades_seed.json vacio o con forma inesperada');
  }

  const vistos = new Map();
  let duplicados = 0;

  for (const r of seed) {
    const zonaSlug = ZONA_POR_DEPARTAMENTO[r.departamento_normalizado];
    if (!zonaSlug) {
      throw new Error(
        'Departamento sin zona asignada: ' + r.departamento_normalizado +
        ' (nombre: ' + r.nombre + '). Anadelo a ZONA_POR_DEPARTAMENTO.'
      );
    }
    const clave = r.cod_mpio || (r.departamento_normalizado + '|' + r.nombre_normalizado);
    if (vistos.has(clave)) {
      duplicados++;
      continue;
    }
    vistos.set(clave, {
      dpto: r.departamento_normalizado,
      nombre: r.nombre_normalizado,
      cod: r.cod_mpio || '',
      fila: [
        r.nombre.toUpperCase(),
        r.departamento.toUpperCase(),
        ZONAS_ZG_A_DESTINOS[zonaSlug],
        r.lat,
        r.lng
      ]
    });
  }

  const items = Array.from(vistos.values()).sort(function (a, b) {
    if (a.dpto !== b.dpto) return a.dpto < b.dpto ? -1 : 1;
    if (a.nombre !== b.nombre) return a.nombre < b.nombre ? -1 : 1;
    return a.cod < b.cod ? -1 : (a.cod > b.cod ? 1 : 0);
  });

  const version = process.env.GEO_CIUDADES_VERSION ||
    new Date().toISOString().slice(0, 10);

  const filas = items.map(function (it) {
    const f = it.fila;
    return "  ['" + asciiSafe(f[0]) + "','" + asciiSafe(f[1]) + "','" + f[2] +
      "'," + coord(f[3]) + ',' + coord(f[4]) + ']';
  });

  const salida = [
    '// geo-ciudades.js  --  ARTEFACTO GENERADO. NO EDITAR A MANO.',
    '// Generador: scripts/generar-geo-ciudades.js  (node scripts/generar-geo-ciudades.js)',
    '// Fuente: db/seeds/geo_ciudades_seed.json',
    '// Contrato ADR-097 D2: version + items [nombre, departamento, zona, lat, lng].',
    '// La zona viene resuelta: el navegador NO deduce ni copia el mapa.',
    '// ASCII-safe estricto (ADR-002), cero backticks, sin modulos.',
    'window.GEO_CIUDADES = {',
    "  version: '" + version + "',",
    '  items: [',
    filas.join(',\n'),
    '  ]',
    '};',
    ''
  ].join('\n');

  fs.writeFileSync(RUTA_SALIDA, salida, 'utf8');

  // --- Resumen por stdout ---------------------------------------------------
  const bytes = Buffer.byteLength(salida, 'utf8');
  console.log('=== generar-geo-ciudades ===');
  console.log('registros leidos      : ' + seed.length);
  console.log('registros emitidos    : ' + items.length);
  console.log('duplicados descartados: ' + duplicados);
  console.log('version               : ' + version);
  console.log('artefacto             : geo-ciudades.js  (' + bytes + ' bytes, ' +
    (bytes / 1024).toFixed(1) + ' KB)');

  const porZona = {};
  items.forEach(function (it) {
    porZona[it.fila[2]] = (porZona[it.fila[2]] || 0) + 1;
  });
  console.log('items por zona        : ' + JSON.stringify(porZona));

  console.log('departamentos -> zona (' +
    Object.keys(ZONA_POR_DEPARTAMENTO).length + ' declarados):');
  const usados = {};
  items.forEach(function (it) { usados[it.dpto] = true; });
  Object.keys(ZONA_POR_DEPARTAMENTO).sort().forEach(function (d) {
    console.log('  ' + (usados[d] ? ' ' : '*') + ' ' +
      (d + '                                                       ').slice(0, 58) +
      ZONAS_ZG_A_DESTINOS[ZONA_POR_DEPARTAMENTO[d]]);
  });
  const sinZona = Object.keys(usados).filter(function (d) { return !ZONA_POR_DEPARTAMENTO[d]; });
  console.log('departamentos sin zona: ' + sinZona.length +
    (sinZona.length ? ' -> ' + sinZona.join(', ') : ' (ninguno)'));
}

main();