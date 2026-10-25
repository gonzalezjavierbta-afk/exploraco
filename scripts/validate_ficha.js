// scripts/validate_ficha.js
// Valida el bloque JSON de entrega de una ficha generada con el prompt
// canonico .opencode/prompts/GEMINI_MASTER_PROMPT.md (plantilla:
// .opencode/prompts/ficha_template.md).
//
// Ubicacion canonica: la tienes ahi (cierra BUG-034). Antes vivia dentro de
// la skill gemini-research, despublicada el 2026-10-01.
//
// Uso:
//   node scripts/validate_ficha.js <ruta-ficha.md>
//   node scripts/validate_ficha.js <ruta-ficha.md> --sin-fotos
//   node scripts/validate_ficha.js <ruta-ficha.md> --estricto
//   node scripts/validate_ficha.js <ruta-ficha.md> --estricto --sin-fotos
//
// MODO LEGADO (sin --estricto): comportamiento historico intacto. Tambien se
// admite, ademas del bloque de codigo json, un fichero .json plano (caso de
// ficha/ficha-medellin.json y de las fichas ya emitidas): si no hay bloque se
// intenta parsear el fichero entero como JSON.
//
// MODO --estricto (contrato v2, subcategoria 'ciudad'):
//   - BASE.subcategoria OBLIGATORIA para sitio/comida/evento.
//   - BASE.zona OBLIGATORIA en las CUATRO categorias (sitio/comida/evento/hostal),
//     dentro de la lista cerrada de zonas.
//   - BASE.sintro / BASE.barrio / BASE.hero_bg: se validan si estan
//     presentes; su ausencia solo emite [AVISO].
//   - TAGS exigidos POR SUBCATEGORIA (no una sola lista por categoria).
//   - Formas nuevas de TAGS (barrios, transporte, presupuesto, cuando_ir, ...)
//     se validan CUANDO ESTAN PRESENTES.
//   - FAQS >= 5 en ambos modos. Para subcategoria 'ciudad', si las FAQS no
//     cubren al menos 4 temas de viaje se emite [AVISO] (nunca FAIL).
//
// --sin-fotos es una excepcion EXPLICITA y opt-in: permite FOTOS_SUGERIDAS
// vacia para una pagina de ciudad sin fotos por decision del operador, donde
// el hero degrada a hero_bg solido + emoji. Sin la bandera, una lista vacia o
// con menos de 5 items FALLA igual que siempre (contrato canonico, BUG-034).
// Si FOTOS_SUGERIDAS trae items, se exigen minimo 5 y exactamente 1 es_hero
// con o sin bandera. La bandera es combinable con --estricto.
//
// Exit code 0 = PASS, 1 = FAIL. Solo lectura; no modifica archivos.
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks.

var fs = require('fs');
var path = require('path');

// Excepcion opt-in (se activa con --sin-fotos en argv; ver bloque "Uso").
var SIN_FOTOS = false;

// Modo v2 (se activa con --estricto en argv; ver bloque "Uso").
var ESTRICTO = false;

// Tres comillas invertidas se construyen desde su codigo ASCII para poder
// montar el patron de los bloques json sin escribir el caracter literal.
var TICK3 = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);

var VALID = ['hostal', 'comida', 'sitio', 'evento'];

// Categorias que en v2 exigen BASE.subcategoria (hostal no tiene lista
// cerrada en ADR-016).
var EXIGEN_SUBCATEGORIA = ['sitio', 'comida', 'evento'];

// Lista cerrada de zonas (misma que lib/completitud.js:112).
var ZONAS = ['andina', 'amazonica', 'caribe', 'pacifico', 'llanos'];

var BASE_REQUIRED = [
  'slug', 'nombre', 'categoria_slug', 'lead', 'descripcion', 'highlight',
  'ciudad', 'region', 'lat', 'lng', 'precio_desde', 'horario', 'emoji',
  'tipo', 'como_llegar', 'status', 'destacado'
];

// Campos de BASE v2 que se validan solo si estan presentes.
var BASE_V2_OPCIONALES = ['sintro', 'barrio', 'hero_bg'];

// Modo legado: una unica lista por categoria (no se toca).
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
    'espacio-publico', 'sitio-historico', 'religioso', 'aventura', 'ciudad'
  ],
  comida: [
    'restaurante', 'cafe', 'gastrobar', 'comida-rapida', 'dulces'
  ],
  evento: [
    'concierto', 'festival', 'teatro', 'exposicion', 'deporte',
    'cine', 'fiesta'
  ]
};

// Modo v2: TAGS exigidos por SUBCATEGORIA de sitio. Los nombres son exactos
// y no se re-inventan: si una clave preexistente ya se validaba en modo
// legado, aqui conserva su nombre y su forma original.
var TAGS_SUBCAT = {
  naturaleza: [
    'tipo_actividad', 'dificultad', 'dificultad_desc', 'duracion', 'altitud',
    'temporada', 'precio_entrada', 'distancia', 'como_llegar', 'permisos',
    'temporada_nota', 'fauna_flora', 'secretos', 'regulaciones',
    'checklist_tip', 'entradas', 'tours', 'equipamiento', 'itinerario',
    'dificultad_tags', 'temporada_matriz'
  ],
  aventura: [
    'tipo_actividad', 'dificultad', 'dificultad_desc', 'duracion', 'altitud',
    'temporada', 'precio_entrada', 'distancia', 'como_llegar', 'permisos',
    'temporada_nota', 'fauna_flora', 'secretos', 'regulaciones',
    'checklist_tip', 'entradas', 'tours', 'equipamiento', 'itinerario',
    'dificultad_tags', 'temporada_matriz'
  ],
  parque: [
    'tipo_actividad', 'dificultad', 'dificultad_desc', 'duracion', 'altitud',
    'temporada', 'precio_entrada', 'distancia', 'como_llegar', 'permisos',
    'temporada_nota', 'fauna_flora', 'secretos', 'regulaciones',
    'checklist_tip', 'entradas', 'tours', 'equipamiento', 'itinerario',
    'dificultad_tags', 'temporada_matriz'
  ],
  museo: [
    'tipo_actividad', 'duracion', 'precio_entrada', 'como_llegar', 'permisos',
    'temporada_nota', 'entradas', 'colecciones', 'recorridos', 'horarios_zona',
    'accesibilidad', 'secretos', 'programacion', 'contexto'
  ],
  cultura: [
    'tipo_actividad', 'duracion', 'precio_entrada', 'como_llegar', 'permisos',
    'temporada_nota', 'entradas', 'colecciones', 'recorridos', 'horarios_zona',
    'accesibilidad', 'secretos', 'programacion', 'contexto'
  ],
  'sitio-historico': [
    'tipo_actividad', 'duracion', 'precio_entrada', 'como_llegar', 'permisos',
    'temporada_nota', 'entradas', 'colecciones', 'recorridos', 'horarios_zona',
    'accesibilidad', 'secretos', 'programacion', 'contexto'
  ],
  religioso: [
    'tipo_actividad', 'duracion', 'precio_entrada', 'como_llegar', 'permisos',
    'temporada_nota', 'entradas', 'colecciones', 'recorridos', 'horarios_zona',
    'accesibilidad', 'secretos', 'programacion', 'contexto'
  ],
  bar: [
    'precio_entrada', 'como_llegar', 'entradas', 'horarios_zona',
    'accesibilidad', 'musica_vivo', 'cover', 'codigo_vestimenta',
    'happy_hour', 'programacion'
  ],
  'espacio-publico': [
    'precio_entrada', 'como_llegar', 'entradas', 'atracciones', 'horarios_zona',
    'accesibilidad', 'actividades_gratis', 'programacion'
  ],
  ciudad: [
    'tipo_actividad', 'duracion', 'precio_entrada', 'distancia', 'como_llegar',
    'permisos', 'temporada', 'temporada_nota', 'entradas', 'atracciones',
    'actividades_gratis', 'programacion', 'accesibilidad', 'contexto',
    'barrios', 'transporte', 'seguridad', 'presupuesto', 'gastronomia',
    'cuando_ir'
  ]
};

// Modo v2: FORMAS POR CATEGORIA. Una misma clave puede tener forma distinta
// segun la categoria: 'transporte' es {icon,title,detail} en hostal y
// {icono,nombre,descripcion} en la subcategoria 'ciudad' de sitio. Por eso la
// forma se resuelve por (categoria, subcategoria) y NUNCA por nombre de clave.
// Valor de cada entrada: lista de campos -> lista de objetos; 'strings' ->
// lista de textos; { mapa: [...] } -> objeto cuyos valores son objetos con
// esos campos. Solo se valida la clave si esta presente en TAGS.
var FORMAS = {
  hostal: {
    transporte: ['icon', 'title', 'detail'],
    habitaciones: ['tipo', 'subtitulo', 'badge', 'camas', 'precio'],
    actividades: ['icono', 'nombre', 'descripcion'],
    amenidades: 'strings',
    que_incluye: 'strings'
  },
  sitio: {
    barrios: ['icono', 'nombre', 'tipo', 'descripcion'],
    atracciones: ['icono', 'nombre', 'descripcion'],
    actividades_gratis: ['icono', 'nombre', 'descripcion'],
    accesibilidad: ['icono', 'nombre', 'descripcion'],
    seguridad: ['icono', 'nombre', 'descripcion'],
    gastronomia: ['icono', 'nombre', 'descripcion'],
    presupuesto: ['tipo', 'rango', 'detalle'],
    cuando_ir: ['periodo', 'estado', 'nota']
  },
  comida: {
    horario_detallado: { mapa: ['abre', 'cierra'] },
    menu_destacado: ['nombre', 'precio', 'badge'],
    opciones_dieta: 'strings',
    domicilio_plataformas: 'strings'
  },
  evento: {
    lineup: ['nombre', 'escenario'],
    agenda: ['dia', 'hora', 'actividad'],
    categorias_entrada: ['tipo', 'precio', 'disponibilidad'],
    que_llevar: 'strings',
    prohibido: 'strings'
  }
};

// Formas que solo aplican a UNA subcategoria concreta. 'transporte' NO es
// parte del contrato de las demas subcategorias de sitio: si aparece ahi, no
// se valida con la forma de ciudad ni se exige.
var FORMAS_SUBCAT = {
  ciudad: {
    transporte: ['icono', 'nombre', 'descripcion']
  }
};

// Valores admitidos en TAGS.cuando_ir[].estado.
var ESTADOS_TEMPORADA = ['ideal', 'posible', 'no'];

// Temas que una ficha de ciudad debe cubrir en FAQS (>= 4 de 6). La
// comparacion es insensible a tildes y mayusculas.
var TEMAS_CIUDAD = [
  ['seguridad', ['segur', 'insegur', 'delincuencia', 'robo']],
  ['transporte/aeropuerto', ['transporte', 'aeropuerto', 'moviliz', 'metro', 'taxi', 'bus', 'uber', 'llegar']],
  ['mejor epoca/temporada', ['mejor epoca', 'temporada', 'cuando ir', 'cuando visitar', 'clima', 'lluvia']],
  ['presupuesto', ['presupuesto', 'cuanto cuesta', 'cuanto dinero', 'cuanto vale', 'precio', 'coste', 'costoso', 'barato']],
  ['alojamiento/hostal', ['alojamiento', 'hostal', 'hotel', 'donde dormir', 'donde hosped', 'donde quedarse']],
  ['gastronomia', ['gastronomia', 'plato', 'comida', 'comer', 'restaurante', 'bandeja', 'mercado']]
];

function fail(msg) {
  console.error('[FAIL] ' + msg);
  return false;
}

function ok(msg) {
  console.log('[OK] ' + msg);
  return true;
}

function aviso(msg) {
  console.log('[AVISO] ' + msg);
}

// Minusculas y sin diacriticos: 'Es seguro...' y 'es Seguro' comparan igual.
function normalizar(s) {
  var t = (s === null || s === undefined) ? '' : String(s);
  t = t.toLowerCase();
  if (typeof t.normalize === 'function') {
    t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  return t;
}

// Devuelve el ultimo bloque json del texto, o null si no hay ninguno.
function extractJsonBlock(text) {
  var re = new RegExp(TICK3 + 'json\\s*([\\s\\S]*?)' + TICK3, 'g');
  var match, last = null;
  while ((match = re.exec(text)) !== null) last = match[1];
  return last;
}

// Carga el JSON de la ficha. Un fichero .json plano (sin bloque) tambien es
// valido: es el formato de las fichas ya emitidas.
function loadData(fichaPath) {
  var src;
  try {
    src = fs.readFileSync(fichaPath, 'utf8');
  } catch (e) {
    return { error: 'no se pudo leer el archivo: ' + fichaPath };
  }

  var block = extractJsonBlock(src);
  var raw = (block === null) ? src : block;

  try {
    return { data: JSON.parse(raw) };
  } catch (e) {
    if (block === null) {
      return { error: 'no se encontro ningun bloque json de ficha ni un JSON plano valido en el archivo' };
    }
    return { error: 'el bloque JSON no es valido: ' + e.message };
  }
}

// Resuelve el mapa de formas de una categoria: base de la categoria + las
// formas propias de su subcategoria (si las tiene).
function formasDe(cat, sub) {
  var res = {};
  var base = FORMAS[cat] || {};
  var extra = (sub && FORMAS_SUBCAT[sub]) ? FORMAS_SUBCAT[sub] : {};
  Object.keys(base).forEach(function (k) { res[k] = base[k]; });
  Object.keys(extra).forEach(function (k) { res[k] = extra[k]; });
  return res;
}

// Valida una clave de TAGS con la forma que le toca en su categoria. Los
// mensajes delatan la ruta exacta del campo (TAGS.barrios[2] falta nombre).
function validarForma(tags, clave, forma) {
  var valor = tags[clave];

  if (Array.isArray(forma)) {
    if (!Array.isArray(valor)) {
      return fail('TAGS.' + clave + ' debe ser una lista de objetos (tiene ' + typeof valor + ')');
    }
    if (!valor.length) return fail('TAGS.' + clave + ' no debe estar vacia');

    var lista = true;
    valor.forEach(function (item, i) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        lista = fail('TAGS.' + clave + '[' + i + '] debe ser un objeto') && lista;
        return;
      }
      forma.forEach(function (c) {
        var v = item[c];
        if (!(c in item) || v === null || v === undefined || v === '') {
          lista = fail('TAGS.' + clave + '[' + i + '] falta ' + c) && lista;
        } else if (typeof v !== 'string' && typeof v !== 'number') {
          lista = fail('TAGS.' + clave + '[' + i + '].' + c + ' debe ser string') && lista;
        }
      });
      if (clave === 'cuando_ir') {
        var estado = item.estado;
        if (typeof estado !== 'string' || ESTADOS_TEMPORADA.indexOf(normalizar(estado)) === -1) {
          lista = fail('TAGS.cuando_ir[' + i + '].estado invalido: "' + estado +
            '" (validos: ' + ESTADOS_TEMPORADA.join(', ') + ')') && lista;
        }
      }
    });
    return lista;
  }

  if (forma === 'strings') {
    if (!Array.isArray(valor)) {
      return fail('TAGS.' + clave + ' debe ser una lista de textos (tiene ' + typeof valor + ')');
    }
    if (!valor.length) return fail('TAGS.' + clave + ' no debe estar vacia');

    var textos = true;
    valor.forEach(function (item, i) {
      if (typeof item !== 'string' || !item.trim()) {
        textos = fail('TAGS.' + clave + '[' + i + '] debe ser un string no vacio') && textos;
      }
    });
    return textos;
  }

  // { mapa: [...] }: objeto con una entrada por clave y objetos dentro.
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) {
    return fail('TAGS.' + clave + ' debe ser un objeto con claves y campos ' +
      forma.mapa.join('/') + ' (tiene ' + (Array.isArray(valor) ? 'lista' : typeof valor) + ')');
  }
  var claves = Object.keys(valor);
  if (!claves.length) return fail('TAGS.' + clave + ' no debe estar vacio');

  var mapa = true;
  claves.forEach(function (k) {
    var item = valor[k];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      mapa = fail('TAGS.' + clave + '.' + k + ' debe ser un objeto') && mapa;
      return;
    }
    forma.mapa.forEach(function (c) {
      var v = item[c];
      if (!(c in item) || v === null || v === undefined || v === '') {
        mapa = fail('TAGS.' + clave + '.' + k + ' falta ' + c) && mapa;
      } else if (typeof v !== 'string' && typeof v !== 'number') {
        mapa = fail('TAGS.' + clave + '.' + k + '.' + c + ' debe ser string') && mapa;
      }
    });
  });
  return mapa;
}

// Aviso (no FAIL) para fichas de ciudad: cobertura tematica de las FAQS.
function revisarTemasCiudad(faqs) {
  var texto = [];
  faqs.forEach(function (f) {
    texto.push(normalizar(f.pregunta) + ' ' + normalizar(f.respuesta));
  });
  var blob = texto.join(' || ');

  var cubiertos = [];
  TEMAS_CIUDAD.forEach(function (tema) {
    var clave = tema[0];
    var patrones = tema[1];
    var hay = patrones.some(function (p) { return blob.indexOf(normalizar(p)) !== -1; });
    if (hay) cubiertos.push(clave);
  });

  if (cubiertos.length < 4) {
    var faltan = TEMAS_CIUDAD
      .map(function (t) { return t[0]; })
      .filter(function (c) { return cubiertos.indexOf(c) === -1; });
    aviso('FAQS de ciudad cubren ' + cubiertos.length + '/6 temas (minimo recomendado 4). ' +
      'Temas sin cubrir: ' + faltan.join(', ') + '. No es FAIL: anade preguntas de viaje.');
  } else {
    ok('FAQS de ciudad cubren ' + cubiertos.length + '/6 temas de viaje');
  }
  return true;
}

function validate(fichaPath) {
  var cargado = loadData(fichaPath);
  if (cargado.error) return fail(cargado.error);

  var data = cargado.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return fail('el JSON de la ficha debe ser un objeto');
  }

  if (ESTRICTO) console.log('[INFO] modo estricto (contrato v2)');

  var allPass = true;

  ['BASE', 'TAGS', 'FAQS', 'FOTOS_SUGERIDAS', 'FUENTES'].forEach(function (k) {
    if (!(k in data)) { allPass = fail('falta la clave raiz: ' + k); }
  });
  if (!allPass) return false;

  var base = data.BASE;
  var tags = data.TAGS;
  if (!base || typeof base !== 'object') return fail('BASE debe ser un objeto');
  if (!tags || typeof tags !== 'object') return fail('TAGS debe ser un objeto');

  var missingBase = BASE_REQUIRED.filter(function (k) { return !(k in base); });
  if (missingBase.length) allPass = fail('BASE falta: ' + missingBase.join(', '));

  var cat = base.categoria_slug;

  // ---- Modo v2: BASE.subcategoria y BASE.zona (antes del resto de reglas) --
  var subEfectiva = null;
  if (ESTRICTO) {
    var exigeSub = EXIGEN_SUBCATEGORIA.indexOf(cat) !== -1;
    var subBase = base.subcategoria;
    var subTags = tags.subcategoria;

    var haySubTags = (subTags !== undefined && subTags !== null && String(subTags).trim() !== '');
    var subCruda = (subBase !== undefined && subBase !== null && String(subBase).trim() !== '')
      ? subBase
      : null;

    if (subCruda === null) {
      if (exigeSub) {
        var pista = '';
        if (haySubTags) {
          pista = ' (TAGS.subcategoria="' + subTags + '" es la ubicacion ADR-016 legada;' +
            ' v2 la exige en BASE.subcategoria)';
        }
        allPass = fail('BASE.subcategoria falta o esta vacia: obligatoria en modo estricto' +
          ' para ' + EXIGEN_SUBCATEGORIA.join('/') + pista);
      }
    } else if (typeof subCruda !== 'string') {
      allPass = fail('BASE.subcategoria debe ser un string no vacio');
    } else if (SUBCATEGORIAS[cat] && SUBCATEGORIAS[cat].indexOf(subCruda) === -1) {
      allPass = fail('BASE.subcategoria invalida para ' + cat + ': "' + subCruda +
        '" (validas: ' + SUBCATEGORIAS[cat].join(', ') + ')');
    } else {
      subEfectiva = subCruda;
    }

    if (base.zona === undefined || base.zona === null || String(base.zona).trim() === '') {
      allPass = fail('BASE.zona falta (validas: ' + ZONAS.join(', ') + ')');
    } else if (typeof base.zona !== 'string' || ZONAS.indexOf(normalizar(base.zona)) === -1) {
      allPass = fail('BASE.zona invalida: "' + base.zona + '" (validas: ' + ZONAS.join(', ') + ')');
    }

    BASE_V2_OPCIONALES.forEach(function (k) {
      if (base[k] === undefined || base[k] === null || base[k] === '') {
        aviso('BASE.' + k + ' ausente (campo v2 recomendado)');
      } else if (typeof base[k] !== 'string') {
        allPass = fail('BASE.' + k + ' debe ser string');
      }
    });
  }

  // ---- TAGS exigidos: por subcategoria en v2, por categoria en legado -----
  if (VALID.indexOf(cat) === -1) {
    allPass = fail('categoria_slug invalido: ' + cat + ' (validos: ' + VALID.join(', ') + ')');
  } else {
    if (ESTRICTO && subEfectiva === null && tags.subcategoria !== undefined) {
      subEfectiva = tags.subcategoria; // respaldo legado solo para exigir TAGS
    }

    var req = TAGS_REQUIRED[cat];
    var etiqueta = cat;
    if (ESTRICTO && subEfectiva && TAGS_SUBCAT[subEfectiva]) {
      req = TAGS_SUBCAT[subEfectiva];
      etiqueta = subEfectiva;
    }
    var missingTags = req.filter(function (k) { return !(k in tags); });
    if (missingTags.length) allPass = fail('TAGS[' + etiqueta + '] falta: ' + missingTags.join(', '));

    // ADR-016: validar subcategoria si esta presente
    // Ausencia de subcategoria NO es error (fallback ADR-016)
    if (SUBCATEGORIAS[cat] && 'subcategoria' in tags) {
      var sub = tags.subcategoria;
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

  // ---- Modo v2: formas de TAGS segun la CATEGORIA, solo si estan presentes --
  if (ESTRICTO) {
    var formas = formasDe(cat, subEfectiva);
    Object.keys(formas).forEach(function (clave) {
      if (!(clave in tags)) return;
      if (!validarForma(tags, clave, formas[clave])) allPass = false;
    });
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
      if (!f || !f.pregunta || !f.respuesta) allPass = fail('FAQS[' + i + '] debe tener pregunta y respuesta');
    });
    if (ESTRICTO && subEfectiva === 'ciudad') revisarTemasCiudad(data.FAQS);
  }

  // FOTOS_SUGERIDAS: contrato canonico = minimo 5 items y exactamente 1
  // es_hero. Unica excepcion: lista VACIA con la bandera --sin-fotos, para una
  // pagina de ciudad sin fotos por decision del operador (el hero degrada a
  // hero_bg solido + emoji). Sin la bandera, vacio o < 5 = FAIL.
  var fotos = data.FOTOS_SUGERIDAS;
  if (SIN_FOTOS && Array.isArray(fotos) && fotos.length === 0) {
    console.log('[AVISO] EXCEPCION --sin-fotos: FOTOS_SUGERIDAS vacia aceptada. ' +
      'Pagina sin fotos por decision del operador; el hero debe degradar a ' +
      'hero_bg solido + emoji (foto_hero = null).');
  } else if (!Array.isArray(fotos) || fotos.length < 5) {
    allPass = fail('FOTOS_SUGERIDAS debe tener al menos 5 items (tiene ' +
      (fotos ? fotos.length : 0) + ')' +
      ((Array.isArray(fotos) && fotos.length === 0)
        ? '; si la pagina va sin fotos por decision del operador, invoca la excepcion con --sin-fotos'
        : ''));
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
      if (!f || !f.url || !f.que_respalda) allPass = fail('FUENTES[' + i + '] debe tener url y que_respalda');
    });
  }

  // Proteccion: bloque JSON de ficha NUNCA debe contener campos de rating inventados
  if ('rating' in tags) {
    allPass = fail('TAGS contiene campo "rating" inventado (ADR-009): quitarlo');
  }

  return allPass;
}

var argv = process.argv.slice(2);
SIN_FOTOS = argv.indexOf('--sin-fotos') !== -1;
ESTRICTO = argv.indexOf('--estricto') !== -1;
var arg = argv.filter(function (a) { return a.indexOf('--') !== 0; })[0];
if (!arg) {
  console.error('Uso: node ' + path.basename(process.argv[1]) +
    ' <ruta-ficha.md> [--sin-fotos] [--estricto]');
  process.exit(1);
}

var passed = validate(path.resolve(arg));
if (passed) {
  console.log('PASS - ficha lista para ingesta (' + path.basename(arg) + ')' +
    (ESTRICTO ? ' [estricto v2]' : ''));
  process.exit(0);
} else {
  process.exit(1);
}
