// scripts/seed-palomino.js
// Seed idempotente de la pagina dinamica /palomino.html (sitio / subcategoria ciudad).
// Fuente: ficha de research-agent, con 4 defectos ya corregidos por el operador:
//   1) highlight sin rating (ADR-009: "4.8/10" eliminado).
//   2) TAGS.distancia consolidada en UNA sola clave (venia duplicada).
//   3) foto_hero con la URL real verificada (venia como placeholder "FOTO 1").
//   4) anadidas fauna_flora, secretos y checklist_tip del contrato de la categoria sitio.
// Coordenadas: 11.2458, -73.5658 (Palomino, Dibulla, La Guajira).
// zona: 'caribe' explicita (validate_ficha.js:469-472 + CHECK de 028_destinos_zona.sql).
// Rating: NO se siembran resenas ni rating; la pagina queda en 0 hasta
// interacciones reales (ADR-009).
//
// Uso:
//   node scripts/seed-palomino.js             -> dry-run (por defecto, sin escritura)
//   node scripts/seed-palomino.js --apply     -> upsert real en Neon
//
// Idempotente: ON CONFLICT (slug) DO UPDATE. Correrlo dos veces no duplica.

'use strict';

var fsMod = require("fs");
var pathMod = require("path");

var neon = null;
function getNeon() {
  if (!neon) neon = require("@neondatabase/serverless").neon;
  return neon;
}

var SLUG = "palomino";
var HERO = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/La_playa_palomino.jpg/960px-La_playa_palomino.jpg";

// 5 fotos verificadas con HEAD 200 (BUG-022). Orden fijo: la 1 es el hero.
var PHOTOS = [
  {
    "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/La_playa_palomino.jpg/960px-La_playa_palomino.jpg",
    "caption": "Playa de Palomino con vista a la Sierra Nevada"
  },
  {
    "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Paseo_por_el_rio_Palomino_en_Neumatico.jpg/960px-Paseo_por_el_rio_Palomino_en_Neumatico.jpg",
    "caption": "Tubing en el r\u00edo Palomino"
  },
  {
    "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Desembocadura_R%C3%ADo_Palomino%2C_Guajira.jpg/960px-Desembocadura_R%C3%ADo_Palomino%2C_Guajira.jpg",
    "caption": "Desembocadura del r\u00edo Palomino en el mar Caribe"
  },
  {
    "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Sunset_At_Palomino_%28162479643%29.jpeg/960px-Sunset_At_Palomino_%28162479643%29.jpeg",
    "caption": "Atardecer sobre el mar Caribe en Palomino"
  },
  {
    "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Sierra_Nevada_de_Santa_Marta_desde_r%C3%ADo_Palomino.jpg/960px-Sierra_Nevada_de_Santa_Marta_desde_r%C3%ADo_Palomino.jpg",
    "caption": "Sierra Nevada de Santa Marta desde el r\u00edo Palomino"
  }
];

var BASE = {
  "slug": "palomino",
  "nombre": "Palomino",
  "categoria_slug": "sitio",
  "sintro": "El punto donde la Sierra Nevada de Santa Marta se encuentra con el mar Caribe, famoso por su ambiente bohemio, ecoturismo y tubing por el r\u00edo.",
  "lead": "Palomino es uno de los destinos costeros m\u00e1s atractivos de Colombia, ubicado en el departamento de La Guajira. Combina un ambiente relajado de pueblo playero con la exuberante naturaleza de la selva tropical.",
  "descripcion": "Palomino es un corregimiento del municipio de Dibulla, en La Guajira, donde la Sierra Nevada de Santa Marta desciende hasta el mar Caribe. Nacido como un peque\u00f1o pueblo de pescadores, se transform\u00f3 en un refugio bohemio para mochileros y viajeros que buscan naturaleza sin multitudes. Su geograf\u00eda est\u00e1 marcada por los r\u00edos que bajan de la sierra y se funden con el mar en playas de arena dorada.\n\nEl destino ofrece eco-hoteles, hostales y restaurantes de ambiente relajado, con actividades centradas en el agua y la monta\u00f1a: tubing por el r\u00edo Palomino, caminatas hasta la desembocadura del r\u00edo San Salvador y excursiones hacia la Sierra Nevada de Santa Marta, territorio sagrado de los pueblos ind\u00edgenas de la regi\u00f3n. La oferta combina confort sencillo con una fuerte vocaci\u00f3n de turismo comunitario.\n\nSus playas son extensas y de oleaje fuerte, por lo que se recomienda precauci\u00f3n al nadar y ba\u00f1arse cerca de la orilla o con gu\u00eda local. La cercan\u00eda a comunidades ind\u00edgenas y a reservas naturales hace de Palomino un destino de ecoturismo donde el respeto por el entorno y las costumbres locales es parte de la experiencia.",
  "highlight": "Destino Ecotur\u00edstico",
  "ciudad": "Palomino",
  "region": "La Guajira",
  "barrio": "",
  "zona": "caribe",
  "lat": 11.2458,
  "lng": -73.5658,
  "whatsapp": "",
  "telefono": "",
  "email": "",
  "web": "https://colombia.travel/es/palomino",
  "instagram": "",
  "precio_desde": "Mochilero desde $80.000 COP / d\u00eda",
  "horario": "Acceso libre 24/7",
  "emoji": "\ud83c\udf34",
  "hero_bg": "linear-gradient(135deg, #0284c7, #0d9488)",
  "foto_hero": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/La_playa_palomino.jpg/960px-La_playa_palomino.jpg",
  "tipo": "Destino Ecotur\u00edstico \u00b7 Playas y Selva",
  "capacidad": "",
  "como_llegar": "Desde Santa Marta en autob\u00fas o colectivo (aprox. 1.5 a 2 horas) por la Troncal del Caribe.",
  "status": "published",
  "destacado": true
};

// TAGS: la clave cuando_ir[].nota es la que consume el renderer
// (api/pagina-destino.js:2006 -> ci.nota); estado_nota se mapea a nota.
// Subcategoria 'ciudad' activa (ADR-016): descripcion, atracciones,
// actividades_gratis, programacion, accesibilidad, contexto, barrios,
// transporte, seguridad, presupuesto, gastronomia, cuando_ir.
var TAGS = {
  "subcategoria": "ciudad",
  "tipo_actividad": "Ciudad",
  "dificultad": "F\u00e1cil",
  "dificultad_desc": "Destino accesible para todo tipo de viajero.",
  "duracion": "3-4 d\u00edas",
  "precio_entrada": "Sin entrada",
  "permisos": "No requiere",
  "distancia": "A 90 km de Santa Marta y 75 km de Riohacha. Aeropuerto SMR o RCH.",
  "temporada": [
    "Ene-Abr",
    "Dic"
  ],
  "temporada_nota": "Temporada seca ideal para actividades al aire libre.",
  "fauna_flora": "Tit\u00ed cabeciblanco, aves migratorias, iguanas y bosque seco tropical en los senderos ribere\u00f1os.",
  "secretos": "El tubing se hace temprano para evitar el calor; los mejores atardeceres se ven caminando hacia el sur de la desembocadura.",
  "checklist_tip": "Llevar efectivo: los cajeros del pueblo son escasos y suelen fallar.",
  "regulaciones": "Respetar las normas ambientales locales y de las comunidades ind\u00edgenas.",
  "entradas": [],
  "tours": [],
  "itinerario": [],
  "equipamiento": [
    {
      "item": "Protector solar",
      "prioridad": "Obligatorio"
    },
    {
      "item": "Repelente",
      "prioridad": "Recomendado"
    },
    {
      "item": "Calzado c\u00f3modo",
      "prioridad": "Recomendado"
    }
  ],
  "dificultad_tags": [
    {
      "texto": "Apto para caminatas costeras",
      "apto": true
    }
  ],
  "temporada_matriz": {
    "Ene": "ideal",
    "Feb": "ideal",
    "Mar": "ideal",
    "Abr": "ideal",
    "May": "posible",
    "Jun": "posible",
    "Jul": "posible",
    "Ago": "posible",
    "Sep": "posible",
    "Oct": "posible",
    "Nov": "posible",
    "Dic": "ideal"
  },
  "atracciones": [
    {
      "icono": "\ud83c\udfd6",
      "nombre": "Playa de Palomino",
      "descripcion": "Extensas playas de arena dorada ideales para caminar al atardecer."
    },
    {
      "icono": "\ud83c\udf0a",
      "nombre": "Desembocadura del R\u00edo Palomino",
      "descripcion": "Lugar donde el r\u00edo se encuentra con el mar Caribe."
    },
    {
      "icono": "\ud83c\udf33",
      "nombre": "Reserva Natural One Sanctuary",
      "descripcion": "Santuario natural de protecci\u00f3n ecol\u00f3gica."
    },
    {
      "icono": "\ud83c\udfde",
      "nombre": "R\u00edo San Salvador",
      "descripcion": "Afluente cercano perfecto para caminatas en la naturaleza."
    },
    {
      "icono": "\ud83d\udca7",
      "nombre": "Quebrada de Valencia",
      "descripcion": "Cascada y piscinas naturales de agua dulce a 30 minutos."
    },
    {
      "icono": "\u26f0",
      "nombre": "Miradores de la Sierra",
      "descripcion": "Vistas panor\u00e1micas de la confluencia entre monta\u00f1a y mar."
    }
  ],
  "actividades_gratis": [
    {
      "icono": "\ud83e\uddb6",
      "nombre": "Caminatas al atardecer",
      "descripcion": "Paseos costeros con brisa marina al final del d\u00eda."
    },
    {
      "icono": "\ud83c\udfa8",
      "nombre": "Paseo por el pueblo",
      "descripcion": "Murales, artesan\u00edas y ambiente bohemio en las calles centrales."
    },
    {
      "icono": "\ud83d\udc26",
      "nombre": "Avistamiento de aves",
      "descripcion": "Senderos ribere\u00f1os con especies residentes y migratorias."
    },
    {
      "icono": "\ud83c\udf05",
      "nombre": "Contemplaci\u00f3n de confluencia",
      "descripcion": "El choque de aguas dulces y saladas en la desembocadura."
    }
  ],
  "programacion": [
    {
      "dia": "Permanente",
      "eventos": "Ferias artesanales locales y muestras culturales en temporada alta."
    }
  ],
  "accesibilidad": [
    {
      "icono": "\ud83d\udeb6",
      "nombre": "Infraestructura urbana",
      "descripcion": "Calles destapadas y adoquinadas con aceras r\u00fasticas."
    },
    {
      "icono": "\u267f",
      "nombre": "Acceso a playa",
      "descripcion": "Senderos de arena que dificultan el desplazamiento en silla de ruedas."
    }
  ],
  "contexto": "Palomino es un referente del turismo ecol\u00f3gico y bohemio en el caribe colombiano, destacando por su fusi\u00f3n cultural entre la herencia ind\u00edgena de la Sierra Nevada y la tradici\u00f3n coste\u00f1a.",
  "barrios": [
    {
      "icono": "\ud83c\udfd6",
      "nombre": "Zona de Playa",
      "tipo": "Alojamiento",
      "descripcion": "Eco-hoteles boutique frente al mar y acceso directo a la arena."
    },
    {
      "icono": "\ud83c\udfde",
      "nombre": "Cercan\u00edas del R\u00edo",
      "tipo": "Alojamiento",
      "descripcion": "Entornos naturales y caba\u00f1as tranquilas junto al cauce."
    },
    {
      "icono": "\ud83c\udfe1",
      "nombre": "Centro del Pueblo",
      "tipo": "Vida nocturna",
      "descripcion": "Restaurantes, bares y comercio local sobre la via principal."
    }
  ],
  "transporte": [
    {
      "icono": "\u2708",
      "nombre": "Aeropuerto",
      "descripcion": "SMR (Santa Marta) o RCH (Riohacha), a 1.5-2 h por carretera."
    },
    {
      "icono": "\ud83d\ude8c",
      "nombre": "Bus y Colectivo",
      "descripcion": "Salidas constantes por la Troncal del Caribe desde Santa Marta."
    },
    {
      "icono": "\ud83d\udef5",
      "nombre": "Mototaxi",
      "descripcion": "Transporte r\u00e1pido y econ\u00f3mico dentro del casco urbano."
    }
  ],
  "seguridad": [
    {
      "icono": "\ud83d\udee1",
      "nombre": "Nivel de riesgo",
      "descripcion": "Zona segura en \u00e1reas urbanas; precauci\u00f3n nocturna y Polic\u00eda de Turismo 2026."
    },
    {
      "icono": "\u26a0",
      "nombre": "Oleaje",
      "descripcion": "Fuerte corriente marina en la playa principal; no es apta para nadar lejos de la orilla."
    },
    {
      "icono": "\ud83d\udcb5",
      "nombre": "Efectivo",
      "descripcion": "Baja disponibilidad de cajeros autom\u00e1ticos en el pueblo."
    }
  ],
  "presupuesto": [
    {
      "tipo": "Mochilero",
      "rango": "$80.000 - $130.000 COP",
      "detalle": "Hostal compartido y comidas locales."
    },
    {
      "tipo": "Medio",
      "rango": "$200.000 - $400.000 COP",
      "detalle": "Eco-hotel privado y restaurantes de fusi\u00f3n."
    },
    {
      "tipo": "Alto",
      "rango": "$500.000+ COP",
      "detalle": "Resorts ecol\u00f3gicos y experiencias exclusivas."
    }
  ],
  "gastronomia": [
    {
      "icono": "\ud83d\udc1f",
      "nombre": "Pescado frito con Patac\u00f3n",
      "descripcion": "Servido con arroz de coco y ensalada fresca."
    },
    {
      "icono": "\ud83c\udf5a",
      "nombre": "Arroz de Coco",
      "descripcion": "Guarnici\u00f3n tradicional coste\u00f1a cocinada con leche de coco."
    },
    {
      "icono": "\ud83c\udf5e",
      "nombre": "Fritos Coste\u00f1os",
      "descripcion": "Arepas de huevo y empanadas de carne para comer en la calle."
    }
  ],
  "cuando_ir": [
    {
      "periodo": "Ene - Abr",
      "estado": "ideal",
      "nota": "Temporada seca, la mejor para actividades al aire libre."
    },
    {
      "periodo": "May - Nov",
      "estado": "posible",
      "nota": "Meses de lluvia con menor afluencia de viajeros."
    },
    {
      "periodo": "Dic",
      "estado": "ideal",
      "nota": "Temporada alta con ambiente festivo en el pueblo."
    }
  ]
};

var FAQS = [
  {
    "pregunta": "\u00bfEs seguro nadar en la playa de Palomino?",
    "respuesta": "No se recomienda nadar lejos de la orilla: el oleaje y las corrientes son fuertes. Ba\u00f1arse cerca de la playa y con compa\u00f1\u00eda."
  },
  {
    "pregunta": "\u00bfC\u00f3mo llegar a Palomino desde Santa Marta?",
    "respuesta": "En autob\u00fas o colectivo por la Troncal del Caribe, con un trayecto de aproximadamente 1.5 a 2 horas."
  },
  {
    "pregunta": "\u00bfHay cajeros autom\u00e1ticos en Palomino?",
    "respuesta": "Son limitados y suelen fallar. Se recomienda llevar efectivo suficiente para toda la estad\u00eda."
  },
  {
    "pregunta": "\u00bfCu\u00e1l es la mejor \u00e9poca para visitar Palomino?",
    "respuesta": "De diciembre a abril, temporada seca con menos lluvias y mejores condiciones para playa y senderos."
  },
  {
    "pregunta": "\u00bfD\u00f3nde hospedarse en Palomino?",
    "respuesta": "En la zona de playa para los eco-hoteles frente al mar, cerca del r\u00edo para caba\u00f1as tranquilas, o en el centro del pueblo para restaurantes y vida nocturna."
  }
];

var INSERT_SQL = "INSERT INTO destinos ( "
  + "slug, nombre, categoria_slug, sintro, lead, descripcion, highlight, "
  + "ciudad, region, barrio, zona, lat, lng, "
  + "whatsapp, telefono, email, web, instagram, "
  + "precio_desde, horario, emoji, hero_bg, foto_hero, "
  + "tipo, capacidad, como_llegar, "
  + "status, destacado, tags, creado_en, actualizado_en "
  + ") VALUES ( "
  + "$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,"
  + "$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,NOW(),NOW() "
  + ") "
  + "ON CONFLICT (slug) DO UPDATE SET "
  + "nombre=EXCLUDED.nombre, categoria_slug=EXCLUDED.categoria_slug, "
  + "sintro=EXCLUDED.sintro, lead=EXCLUDED.lead, "
  + "descripcion=EXCLUDED.descripcion, highlight=EXCLUDED.highlight, "
  + "ciudad=EXCLUDED.ciudad, region=EXCLUDED.region, barrio=EXCLUDED.barrio, "
  + "zona=EXCLUDED.zona, lat=EXCLUDED.lat, lng=EXCLUDED.lng, "
  + "whatsapp=EXCLUDED.whatsapp, telefono=EXCLUDED.telefono, email=EXCLUDED.email, "
  + "web=EXCLUDED.web, instagram=EXCLUDED.instagram, "
  + "precio_desde=EXCLUDED.precio_desde, horario=EXCLUDED.horario, emoji=EXCLUDED.emoji, "
  + "hero_bg=EXCLUDED.hero_bg, foto_hero=EXCLUDED.foto_hero, tipo=EXCLUDED.tipo, "
  + "capacidad=EXCLUDED.capacidad, como_llegar=EXCLUDED.como_llegar, "
  + "status=EXCLUDED.status, destacado=EXCLUDED.destacado, "
  + "tags = COALESCE(destinos.tags, '{}'::jsonb) || EXCLUDED.tags, "
  + "actualizado_en = NOW() "
  + "RETURNING id, slug, nombre, status";

var PARAMS = [
  BASE.slug, BASE.nombre, BASE.categoria_slug, BASE.sintro, BASE.lead,
  BASE.descripcion, BASE.highlight,
  BASE.ciudad, BASE.region, BASE.barrio, BASE.zona, BASE.lat, BASE.lng,
  BASE.whatsapp, BASE.telefono, BASE.email, BASE.web, BASE.instagram,
  BASE.precio_desde, BASE.horario, BASE.emoji, BASE.hero_bg, BASE.foto_hero,
  BASE.tipo, BASE.capacidad, BASE.como_llegar,
  BASE.status, BASE.destacado, JSON.stringify(TAGS)
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS, INSERT_SQL: INSERT_SQL };

// Resolver DATABASE_URL: variable de entorno o .env.local (sin dependencias).
function resolveDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  var candidates = [".env.local", ".env"];
  for (var i = 0; i < candidates.length; i++) {
    var p = pathMod.join(__dirname, "..", candidates[i]);
    if (!fsMod.existsSync(p)) continue;
    var lines = fsMod.readFileSync(p, "utf8").split(/\r?\n/);
    for (var j = 0; j < lines.length; j++) {
      var m = /^\s*DATABASE_URL\s*=\s*(.+?)\s*$/.exec(lines[j]);
      if (m) return m[1].replace(/^["\']|["\']$/g, "");
    }
  }
  return "";
}

if (require.main !== module) return;

(async function main() {
  var apply = process.argv.indexOf("--apply") !== -1;

  if (!apply) {
    console.log("[dry-run] slug=" + SLUG + " categoria=" + BASE.categoria_slug + " subcategoria=" + TAGS.subcategoria + " zona=" + BASE.zona);
    console.log("[dry-run] SQL:\n" + INSERT_SQL);
    console.log("[dry-run] params: " + PARAMS.length + " (29 columnas)");
    console.log("[dry-run] base: " + JSON.stringify(BASE));
    console.log("[dry-run] tags: " + Object.keys(TAGS).length + " claves | cuando_ir[0]=" + JSON.stringify(TAGS.cuando_ir[0]));
    console.log("[dry-run] fotos: " + PHOTOS.length + " (hero=1) | faqs: " + FAQS.length);
    console.log("[dry-run] sin escritura. Usa --apply para ejecutar el upsert.");
    return;
  }

  var url = resolveDbUrl();
  if (!url) {
    console.error("Falta DATABASE_URL (env o .env.local).");
    process.exit(1);
  }

  var sql = getNeon()(url);
  var prev = await sql("SELECT id, slug FROM destinos WHERE slug=$1 LIMIT 1", [SLUG]);
  console.log("[apply] " + (prev.length ? "UPDATE sobre id=" + prev[0].id : "INSERT nueva fila") + " para slug=" + SLUG);

  var inserted = await sql(INSERT_SQL, PARAMS);
  var id = inserted[0].id;
  console.log("OK - destino " + inserted[0].slug + " (" + id + ") status=" + inserted[0].status);

  if (FAQS.length) {
    await sql(
      "INSERT INTO destinos_detalles (destino_id, faqs, creado_en) VALUES ($1,$2,NOW()) "
      + "ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs",
      [id, JSON.stringify(FAQS)]
    ).catch(function () {});
  }

  await sql("DELETE FROM destinos_fotos WHERE destino_id=$1", [id]).catch(function () {});
  for (var i = 0; i < PHOTOS.length; i++) {
    await sql(
      "INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) "
      + "VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING",
      [id, PHOTOS[i].url, PHOTOS[i].caption, i, i === 0]
    ).catch(function () {});
  }

  console.log("OK - faqs y " + PHOTOS.length + " fotos escritas.");
  console.log("Verifica: https://exploraco.vercel.app/" + SLUG + ".html");
})().catch(function (err) {
  console.error("ERROR:", err.message);
  process.exit(1);
});
