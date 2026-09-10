// scripts/validate_ficha.js
// Valida el bloque JSON de entrega de una ficha generada con el skill
// gemini-research (prompts/ficha_template.md).
//
// Uso:
//   node scripts/validate_ficha.js <ruta-ficha.md>
//
// Exit code 0 = PASS, 1 = FAIL. Solo lectura; no modifica archivos.
// ASCII-safe (no se emiten tildes ni caracteres especiales).

var fs = require('fs');
var path = require('path');

var VALID = ['hostal', 'comida', 'sitio', 'evento'];

var BASE_REQUIRED = [
  'slug', 'nombre', 'categoria_slug', 'lead', 'descripcion', 'highlight',
  'ciudad', 'region', 'lat', 'lng', 'precio_desde', 'horario', 'emoji',
  'tipo', 'como_llegar', 'status', 'destacado'
];

var TAGS_REQUIRED = {
  hostal: [
    'tipo_alojamiento', 'checkin', 'checkout', 'recepcion', 'barrio_descripcion',
    'politica_cancelacion', 'reglas_casa', 'habitaciones', 'amenidades',
    'actividades', 'que_incluye', 'transporte'
  ],
  comida: [
    'tipo_comida', 'cocina', 'ambiente', 'precio_promedio', 'terraza',
    'reservas', 'domicilio', 'menu_destacado', 'opciones_dieta',
    'horario_detallado'
  ],
  sitio: [
    'tipo_actividad', 'dificultad', 'dificultad_desc', 'duracion',
    'precio_entrada', 'distancia', 'como_llegar', 'permisos',
    'regulaciones', 'entradas', 'tours', 'equipamiento', 'itinerario',
    'dificultad_tags', 'temporada_matriz'
  ],
  evento: [
    'fecha_inicio', 'fecha_fin', 'edicion', 'sede', 'lineup', 'agenda',
    'categorias_entrada', 'que_llevar', 'prohibido'
  ]
};

// ADR-016: subcategorias controladas por categoria (lista cerrada de slugs)
var SUBCATEGORIAS = {
  sitio: [
    'naturaleza', 'museo', 'cultura', 'bar', 'parque',
    'espacio-publico', 'sitio-historico', 'religioso', 'aventura'
  ],
  comida: [
    'restaurante', 'cafe', 'gastrobar', 'comida-rapida', 'dulces'
  ],
  evento: [
    'concierto', 'festival', 'teatro', 'exposicion', 'deporte',
    'cine', 'fiesta'
  ]
};

function fail(msg) {
  console.error('[FAIL] ' + msg);
  return false;
}

function ok(msg) {
  console.log('[OK] ' + msg);
  return true;
}

function extractJsonBlock(text) {
  var re = /```json\s*([\s\S]*?)```/g;
  var match, last = null;
  while ((match = re.exec(text)) !== null) last = match[1];
  return last;
}

function validate(fichaPath) {
  var src;
  try {
    src = fs.readFileSync(fichaPath, 'utf8');
  } catch (e) {
    return fail('no se pudo leer el archivo: ' + fichaPath);
  }

  var block = extractJsonBlock(src);
  if (!block) return fail('no se encontro ningun bloque ```json ``` en la ficha');

  var data;
  try {
    data = JSON.parse(block);
  } catch (e) {
    return fail('el bloque JSON no es valido: ' + e.message);
  }

  var allPass = true;

  ['BASE', 'TAGS', 'FAQS', 'FOTOS_SUGERIDAS', 'FUENTES'].forEach(function (k) {
    if (!(k in data)) { allPass = fail('falta la clave raiz: ' + k); }
  });
  if (!allPass) return false;

  var base = data.BASE;
  var missingBase = BASE_REQUIRED.filter(function (k) { return !(k in base); });
  if (missingBase.length) allPass = fail('BASE falta: ' + missingBase.join(', '));

  var cat = base.categoria_slug;
  if (VALID.indexOf(cat) === -1) {
    allPass = fail('categoria_slug invalido: ' + cat + ' (validos: ' + VALID.join(', ') + ')');
  } else {
    var req = TAGS_REQUIRED[cat];
    var missingTags = req.filter(function (k) { return !(k in data.TAGS); });
    if (missingTags.length) allPass = fail('TAGS[' + cat + '] falta: ' + missingTags.join(', '));

    // ADR-016: validar subcategoria si esta presente
    // Ausencia de subcategoria NO es error (fallback ADR-016)
    if (SUBCATEGORIAS[cat] && 'subcategoria' in data.TAGS) {
      var sub = data.TAGS.subcategoria;
      if (typeof sub !== 'string' || !sub.length) {
        allPass = fail('TAGS.subcategoria debe ser un string no vacio');
      } else if (SUBCATEGORIAS[cat].indexOf(sub) === -1) {
        allPass = fail(
          'TAGS.subcategoria invalida para ' + cat + ': "' + sub +
          '" (validas: ' + SUBCATEGORIAS[cat].join(', ') + ')'
        );
      }
    }
  }

  if (base.lat === 0 && base.lng === 0) {
    allPass = fail('coordenadas en 0,0 (prohibido)');
  }
  if (typeof base.lat !== 'number' || typeof base.lng !== 'number') {
    allPass = fail('lat/lng deben ser numeros');
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(base.slug)) {
    allPass = fail('slug invalido (solo minusculas, numeros y guiones): ' + base.slug);
  }

  if (!Array.isArray(data.FAQS) || data.FAQS.length < 5) {
    allPass = fail('FAQS debe tener al menos 5 items (tiene ' + (data.FAQS ? data.FAQS.length : 0) + ')');
  } else {
    data.FAQS.forEach(function (f, i) {
      if (!f.pregunta || !f.respuesta) allPass = fail('FAQS[' + i + '] debe tener pregunta y respuesta');
    });
  }

  if (!Array.isArray(data.FOTOS_SUGERIDAS) || data.FOTOS_SUGERIDAS.length < 5) {
    allPass = fail('FOTOS_SUGERIDAS debe tener al menos 5 items (tiene ' + (data.FOTOS_SUGERIDAS ? data.FOTOS_SUGERIDAS.length : 0) + ')');
  } else {
    var heroCount = 0;
    data.FOTOS_SUGERIDAS.forEach(function (f, i) {
      if (!f.caption) allPass = fail('FOTOS_SUGERIDAS[' + i + '] falta caption');
      if (!Array.isArray(f.nombres_archivo_wikimedia) || !f.nombres_archivo_wikimedia.length) {
        allPass = fail('FOTOS_SUGERIDAS[' + i + '] falta nombres_archivo_wikimedia (lista no vacia)');
      }
      f.nombres_archivo_wikimedia.forEach(function (n) {
        if (n.indexOf('File:') !== 0) allPass = fail('archivo wikimedia sin prefijo File: (' + n + ')');
      });
      if (f.es_hero) heroCount++;
    });
    if (heroCount !== 1) allPass = fail('FOTOS_SUGERIDAS debe tener exactamente 1 es_hero=true (tiene ' + heroCount + ')');
  }

  if (!Array.isArray(data.FUENTES) || !data.FUENTES.length) {
    allPass = fail('FUENTES no debe estar vacia');
  } else {
    data.FUENTES.forEach(function (f, i) {
      if (!f.url || !f.que_respalda) allPass = fail('FUENTES[' + i + '] debe tener url y que_respalda');
    });
  }

  // Proteccion: bloque JSON de ficha NUNCA debe contener campos de rating inventados
  if (data.TAGS && 'rating' in data.TAGS) {
    allPass = fail('TAGS contiene campo `rating` inventado (ADR-009): quitarlo');
  }

  return allPass;
}

var arg = process.argv[2];
if (!arg) {
  console.error('Uso: node ' + path.basename(process.argv[1]) + ' <ruta-ficha.md>');
  process.exit(1);
}

var passed = validate(path.resolve(arg));
if (passed) {
  console.log('PASS - ficha lista para ingesta (' + path.basename(arg) + ')');
  process.exit(0);
} else {
  process.exit(1);
}