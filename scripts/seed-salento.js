// scripts/seed-salento.js
// Seed idempotente de la pagina dinamica /salento.html (sitio / ciudad).
// Fuente: tmp/ficha-salento.json (node scripts/validate_ficha.js -> PASS).
// Coordenadas definitivas: 4.637157, -75.570844.
// Rating: NO se siembran resenas ni rating; la pagina queda en 0 hasta
// interacciones reales (ADR-009).
//
// Uso:
//   node scripts/seed-salento.js             -> dry-run (por defecto, sin escritura)
//   node scripts/seed-salento.js --apply     -> upsert real en Neon
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

var SLUG = "salento";
var HERO = "https://upload.wikimedia.org/wikipedia/commons/0/05/Plaza_Principal_de_Salento_-_Iglesia_al_fondo_-_panoramio.jpg";

var PHOTOS = [
  {
    "url": "https://upload.wikimedia.org/wikipedia/commons/0/05/Plaza_Principal_de_Salento_-_Iglesia_al_fondo_-_panoramio.jpg",
    "caption": "Plaza Principal de Salento con la iglesia al fondo"
  },
  {
    "url": "https://upload.wikimedia.org/wikipedia/commons/3/3a/Valle_de_Cocora.jpg",
    "caption": "Palmas de cera en el Valle de Cocora"
  },
  {
    "url": "https://upload.wikimedia.org/wikipedia/commons/4/48/Callerealsalento.JPG",
    "caption": "Fachadas coloridas de la Calle Real"
  },
  {
    "url": "https://upload.wikimedia.org/wikipedia/commons/e/e7/Jeep_Willys_-_Salento_%281%29.JPG",
    "caption": "Jeep Willys tradicional en Salento"
  },
  {
    "url": "https://upload.wikimedia.org/wikipedia/commons/1/1f/Salento_Quindio.jpg",
    "caption": "Panor\u00e1mica de Salento y sus tejados"
  }
];

var BASE = {
  "slug": "salento",
  "nombre": "Salento",
  "categoria_slug": "sitio",
  "lead": "Conocido como el Padre del Quind\u00edo, Salento cautiva a viajeros de todo el mundo con sus pintorescas casas coloniales de balcones florecidos, su tradici\u00f3n cafetera y los majestuosos paisajes del Valle de Cocora.",
  "descripcion": "Salento es uno de los destinos tur\u00edsticos m\u00e1s emblem\u00e1ticos de Colombia, ubicado en el departamento del Quind\u00edo, en pleno coraz\u00f3n de la Cordillera Central de los Andes. Fundado en 1842, ostenta el t\u00edtulo honor\u00edfico de municipio m\u00e1s antiguo de la regi\u00f3n, desempe\u00f1ando un papel hist\u00f3rico crucial como paso obligatorio del antiguo Camino Nacional que conectaba el centro del pa\u00eds con el occidente.\n\nEl municipio combina una vibrante tradici\u00f3n cafetera con un patrimonio arquitect\u00f3nico resguardado, caracterizado por fachadas de colores vivos, puertas de madera tallada y ventanales artesanales que reflejan la autenticidad de la colonizaci\u00f3n antioque\u00f1a. Forman parte integral del Paisaje Cultural Cafetero, declarado Patrimonio Mundial por la UNESCO en 2011.\n\nSu entorno natural es mundialmente reconocido por albergar el Valle de Cocora, santuario natural donde crece la palma de cera (Ceroxylon quindiuense), el \u00e1rbol nacional de Colombia que alcanza alturas imponentes sobre los bosques de niebla andinos. Adem\u00e1s de su oferta ecotur\u00edstica, Salento ofrece una gastronom\u00eda t\u00edpica robusta, fincas cafeteras tradicionales de procesos artesanales e innovadores, y una c\u00e1lida atm\u00f3sfera cultural que atrae tanto a mochileros como a viajeros exigentes durante todo el a\u00f1o.",
  "highlight": "4.8/5 \u00b7 Cuna de la Palma de Cera \u00b7 Paisaje Cultural Cafetero",
  "ciudad": "Salento",
  "region": "Quind\u00edo",
  "barrio": "Centro Hist\u00f3rico",
  "lat": 4.637157,
  "lng": -75.570844,
  "whatsapp": "",
  "telefono": "+57 (6) 7590100",
  "email": "contacto@salento-quindio.gov.co",
  "web": "https://www.salento-quindio.gov.co",
  "instagram": "alcaldiadesalento",
  "precio_desde": "Alojamiento desde $60.000 COP / noche",
  "horario": "Acceso libre al municipio 24/7; comercios y atractivos 08:00 - 19:00",
  "emoji": "\u2615",
  "hero_bg": "linear-gradient(135deg, #1A4D2E 0%, #4F6F52 100%)",
  "foto_hero": "https://upload.wikimedia.org/wikipedia/commons/0/05/Plaza_Principal_de_Salento_-_Iglesia_al_fondo_-_panoramio.jpg",
  "tipo": "Destino Tur\u00edstico \u00b7 Paisaje Cultural Cafetero \u00b7 Naturaleza",
  "capacidad": "",
  "como_llegar": "Desde Armenia: bus directo desde la Terminal de Transportes (aprox. 45 min). Desde Pereira: bus hacia Filandia/Salento (aprox. 1 hora).",
  "status": "published",
  "destacado": true
};

// TAGS: la clave cuando_ir[].nota es la que consume el renderer
// (api/pagina-destino.js:2006 -> ci.nota); estado_nota se mapea a nota.
var TAGS = {
  "subcategoria": "ciudad",
  "tipo_actividad": "Ciudad",
  "dificultad": "F\u00e1cil",
  "dificultad_desc": "Accesible para todo tipo de visitantes en la zona urbana.",
  "duracion": "2-3 d\u00edas",
  "altitud": "1895 m s. n. m.",
  "temporada": [
    "Diciembre a Febrero",
    "Junio a Agosto"
  ],
  "precio_entrada": "Sin entrada",
  "distancia": "25 km al noreste de Armenia",
  "como_llegar": "Desde Armenia en bus intermunicipal o automovil particular por la via Armenia-Pereira con desvio en Chagualo.",
  "permisos": "No requiere",
  "temporada_nota": "Clima templado de monta\u00f1a; se recomienda ropa abrigada para las noches y impermeable para la tarde.",
  "fauna_flora": "",
  "secretos": "[{\"icono\":\"\ud83c\udf3f\",\"titulo\":\"El Camino Nacional\",\"texto\":\"Salento formaba parte estrat\u00e9gica del antiguo Camino del Quind\u00edo recorrido por Sim\u00f3n Bol\u00edvar.\",\"tag\":\"Historia\",\"tag_color\":\"gold\"}]",
  "regulaciones": "Prohibido la extracci\u00f3n de palma de cera y cumplimiento de normas de conservaci\u00f3n ambiental en el Valle de Cocora.",
  "checklist_tip": "Llevar calzado c\u00f3modo para caminatas, impermeable y efectivo en pesos colombianos.",
  "entradas": [
    {
      "tipo": "Acceso general al municipio",
      "precio": "Gratis",
      "incluye": "Libre tr\u00e1nsito por plazas y calles hist\u00f3ricas",
      "link": "https://www.salento-quindio.gov.co"
    }
  ],
  "tours": [
    {
      "nombre": "Tour de Caf\u00e9 Finca Tradicional",
      "precio": "$35.000 COP",
      "precio_sub": "Por persona",
      "duracion": "2 horas",
      "tipo_tour": "Grupal",
      "idioma": "Espa\u00f1ol / Ingl\u00e9s",
      "max_personas": "15",
      "rating": "",
      "review_count": 0,
      "descripcion": "Recorrido guiado por los cafetales, explicaci\u00f3n del proceso de recolecci\u00f3n y cata.",
      "incluye": [
        "Gu\u00eda especializado",
        "Degustaci\u00f3n de caf\u00e9"
      ],
      "no_incluye": [
        "Transporte desde el pueblo"
      ],
      "link_reserva": "https://www.salento-quindio.gov.co",
      "featured": true
    }
  ],
  "equipamiento": [
    {
      "item": "Calzado de senderismo",
      "prioridad": "Obligatorio"
    },
    {
      "item": "Impermeable o chaqueta impermeable",
      "prioridad": "Obligatorio"
    }
  ],
  "itinerario": [
    {
      "dia": "D\u00eda 1",
      "hora": "09:00",
      "titulo": "Casco Hist\u00f3rico y Calle Real",
      "icono": "\ud83c\udf04",
      "detalle": "Recorrido por la Plaza de Bol\u00edvar y las coloridas fachadas de la Calle Real.",
      "tags": [
        "Cultura",
        "Arquitectura"
      ]
    },
    {
      "dia": "D\u00eda 2",
      "hora": "07:00",
      "titulo": "Excursi\u00f3n Valle de Cocora",
      "icono": "\u26f0",
      "detalle": "Viaje en jeep Willys y caminata entre palmas de cera gigantes.",
      "tags": [
        "Naturaleza",
        "Senderismo"
      ]
    }
  ],
  "dificultad_tags": [
    {
      "texto": "Apto para familias en zona urbana",
      "apto": true
    }
  ],
  "temporada_matriz": {
    "Ene": "ideal",
    "Feb": "ideal",
    "Mar": "posible",
    "Abr": "posible",
    "May": "posible",
    "Jun": "ideal",
    "Jul": "ideal",
    "Ago": "ideal",
    "Sep": "posible",
    "Oct": "posible",
    "Nov": "posible",
    "Dic": "ideal"
  },
  "atracciones": [
    {
      "icono": "\u26f0",
      "nombre": "Valle de Cocora",
      "descripcion": "Impresionante valle andino famoso por sus altas palmas de cera y senderos ecol\u00f3gicos."
    },
    {
      "icono": "\ud83c\udfe1",
      "nombre": "Calle Real",
      "descripcion": "Calle hist\u00f3rica emblem\u00e1tica con coloridas casas de arquitectura tradicional."
    },
    {
      "icono": "\u26ea",
      "nombre": "Iglesia Nuestra Se\u00f1ora del Carmen",
      "descripcion": "Templo principal ubicado frente a la Plaza de Bol\u00edvar."
    },
    {
      "icono": "\ud83d\udccd",
      "nombre": "Mirador Alto de la Cruz",
      "descripcion": "Punto panor\u00e1mico para obtener vistas de todo el pueblo y sus tejados."
    },
    {
      "icono": "\ud83c\udfde",
      "nombre": "Reserva Natural Santa Rita",
      "descripcion": "Refugio natural privado ideal para avistamiento de aves y cascadas."
    },
    {
      "icono": "\u2615",
      "nombre": "Fincas Cafeteras",
      "descripcion": "Experiencias guiadas sobre el proceso artesanal del caf\u00e9 de origen."
    }
  ],
  "actividades_gratis": [
    {
      "icono": "\ud83d\udeb6",
      "nombre": "Caminata Calle Real",
      "descripcion": "Disfrutar de la arquitectura colonial y artesan\u00edas locales."
    },
    {
      "icono": "\ud83c\udf33",
      "nombre": "Mirador del Valle",
      "descripcion": "Recorrido peatonal hacia el mirador panor\u00e1mico."
    },
    {
      "icono": "\ud83c\udf04",
      "nombre": "Atardecer andino",
      "descripcion": "Avistamiento de puestas de sol desde los miradores."
    },
    {
      "icono": "\ud83d\udcc3",
      "nombre": "Talleres de artesanos",
      "descripcion": "Visita libre a talleres artesanales del centro."
    }
  ],
  "programacion": [
    {
      "dia": "Enero (primera semana)",
      "eventos": "Fiestas Aniversarias de fundaci\u00f3n de Salento."
    },
    {
      "dia": "Diciembre",
      "eventos": "Alumbrado Navide\u00f1o tradicional en el centro."
    }
  ],
  "accesibilidad": [
    {
      "icono": "\u267f",
      "nombre": "Plaza Principal",
      "descripcion": "Rampas y zonas planas adaptadas en piedra."
    },
    {
      "icono": "\u26a0",
      "nombre": "Calles secundarias",
      "descripcion": "Pendientes moderadas y adoquinado hist\u00f3rico."
    }
  ],
  "contexto": "Salento es el municipio m\u00e1s antiguo del Quind\u00edo, pilar del Paisaje Cultural Cafetero y hogar ancestral de la palma de cera en los Andes colombianos.",
  "barrios": [
    {
      "icono": "\ud83c\udfe0",
      "nombre": "Centro Hist\u00f3rico",
      "tipo": "Hist\u00f3rico",
      "descripcion": "Cercano a restaurantes, comercios y arquitectura tradicional."
    },
    {
      "icono": "\ud83c\udfd8",
      "nombre": "Zona Rural / Barbas",
      "tipo": "Alojamiento",
      "descripcion": "Ideal para eco-lodges, fincas cafeteras y tranquilidad."
    },
    {
      "icono": "\ud83d\udcbc",
      "nombre": "La Explanaci\u00f3n",
      "tipo": "Alojamiento",
      "descripcion": "Zona residencial accesible cerca de la entrada principal."
    }
  ],
  "transporte": [
    {
      "icono": "\u2708",
      "nombre": "Aeropuertos cercanos",
      "descripcion": "AXM (Armenia) a 45 min y PEI (Pereira) a 60 min."
    },
    {
      "icono": "\ud83d\ude99",
      "nombre": "Jeeps Willys",
      "descripcion": "Transporte tradicional desde la Plaza de Bol\u00edvar hacia el Valle de Cocora."
    },
    {
      "icono": "\ud83d\ude8c",
      "nombre": "Buses intermunicipales",
      "descripcion": "Conexi\u00f3n constante con Armenia, Pereira y Filandia."
    }
  ],
  "seguridad": [
    {
      "icono": "\ud83d\udee1",
      "nombre": "Seguridad urbana",
      "descripcion": "Presencia de Polic\u00eda de Turismo y ambiente seguro para visitantes (Observatorio Tur\u00edstico Quind\u00edo, 2026)."
    },
    {
      "icono": "\u26a0",
      "nombre": "Precauci\u00f3n general",
      "descripcion": "Cuidado de pertenencias personales en \u00e1reas de alta afluencia."
    },
    {
      "icono": "\ud83e\udded",
      "nombre": "Senderismo seguro",
      "descripcion": "Seguir rutas marcadas en zonas de monta\u00f1a y Valle de Cocora."
    }
  ],
  "presupuesto": [
    {
      "tipo": "Mochilero",
      "rango": "$60.000 - $120.000 COP",
      "detalle": "Hostal compartido, transporte p\u00fablico y men\u00fa del d\u00eda."
    },
    {
      "tipo": "Medio",
      "rango": "$150.000 - $350.000 COP",
      "detalle": "Hotel boutique, tours de caf\u00e9 y restaurantes t\u00edpicos."
    },
    {
      "tipo": "Alto",
      "rango": "$400.000+ COP",
      "detalle": "Eco-hoteles de lujo y experiencias privadas."
    }
  ],
  "gastronomia": [
    {
      "icono": "\ud83c\udf7d",
      "nombre": "Trucha Arco\u00edris",
      "descripcion": "Plato emblem\u00e1tico local frito o al ajillo con patac\u00f3n."
    },
    {
      "icono": "\u2615",
      "nombre": "Caf\u00e9 Especial de Origen",
      "descripcion": "Preparaciones artesanales en cafeter\u00edas de especialidad."
    },
    {
      "icono": "\ud83e\uddc8",
      "nombre": "Patac\u00f3n Pisao",
      "descripcion": "Crujiente pl\u00e1tano con hogao tradicional."
    },
    {
      "icono": "\ud83c\udf58",
      "nombre": "Bandeja Paisa",
      "descripcion": "Plato montanero completo con frijoles y carne."
    }
  ],
  "cuando_ir": [
    {
      "periodo": "Ene - Feb",
      "estado": "ideal",
      "nota": "Temporada seca principal y fiestas patronales."
    },
    {
      "periodo": "Mar - May",
      "estado": "posible",
      "nota": "\u00c9poca de transici\u00f3n con lluvias moderadas."
    },
    {
      "periodo": "Jun - Ago",
      "estado": "ideal",
      "nota": "Temporada vacacional de mitad de a\u00f1o."
    },
    {
      "periodo": "Sep - Nov",
      "estado": "posible",
      "nota": "Meses lluviosos, paisajes muy verdes."
    }
  ]
};

var FAQS = [
  {
    "pregunta": "\u00bfC\u00f3mo llegar al Valle de Cocora desde Salento?",
    "respuesta": "Tomando los tradicionales jeeps Willys ubicados en la Plaza de Bol\u00edvar de Salento."
  },
  {
    "pregunta": "\u00bfEs necesario reservar alojamiento con anticipaci\u00f3n?",
    "respuesta": "S\u00ed, especialmente en fines de semana, vacaciones y diciembre por alta demanda."
  },
  {
    "pregunta": "\u00bfCu\u00e1l es la mejor \u00e9poca del a\u00f1o para visitar Salento?",
    "respuesta": "Los meses secos de diciembre a febrero y junio a agosto."
  },
  {
    "pregunta": "\u00bfQu\u00e9 moneda se utiliza y hay cajeros autom\u00e1ticos?",
    "respuesta": "Peso Colombiano (COP). Hay cajeros en el centro, pero se aconseja efectivo para zonas rurales."
  },
  {
    "pregunta": "\u00bfCu\u00e1ntos d\u00edas se recomiendan para conocer Salento?",
    "respuesta": "De 2 a 3 d\u00edas para recorrer el pueblo, el Valle de Cocora y fincas cafeteras."
  }
];

var INSERT_SQL = "INSERT INTO destinos ( "
  + "slug, nombre, categoria_slug, lead, descripcion, highlight, "
  + "ciudad, region, barrio, lat, lng, "
  + "whatsapp, telefono, email, web, instagram, "
  + "precio_desde, horario, emoji, hero_bg, foto_hero, "
  + "tipo, capacidad, como_llegar, "
  + "status, destacado, tags, creado_en, actualizado_en "
  + ") VALUES ( "
  + "$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,"
  + "$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,NOW(),NOW() "
  + ") "
  + "ON CONFLICT (slug) DO UPDATE SET "
  + "nombre=EXCLUDED.nombre, categoria_slug=EXCLUDED.categoria_slug, lead=EXCLUDED.lead, "
  + "descripcion=EXCLUDED.descripcion, highlight=EXCLUDED.highlight, "
  + "ciudad=EXCLUDED.ciudad, region=EXCLUDED.region, barrio=EXCLUDED.barrio, "
  + "lat=EXCLUDED.lat, lng=EXCLUDED.lng, telefono=EXCLUDED.telefono, email=EXCLUDED.email, "
  + "web=EXCLUDED.web, instagram=EXCLUDED.instagram, "
  + "precio_desde=EXCLUDED.precio_desde, horario=EXCLUDED.horario, emoji=EXCLUDED.emoji, "
  + "hero_bg=EXCLUDED.hero_bg, foto_hero=EXCLUDED.foto_hero, tipo=EXCLUDED.tipo, "
  + "como_llegar=EXCLUDED.como_llegar, status=EXCLUDED.status, destacado=EXCLUDED.destacado, "
  + "tags = COALESCE(destinos.tags, '{}'::jsonb) || EXCLUDED.tags, "
  + "actualizado_en = NOW() "
  + "RETURNING id, slug, nombre, status";

var PARAMS = [
  BASE.slug, BASE.nombre, BASE.categoria_slug, BASE.lead, BASE.descripcion, BASE.highlight,
  BASE.ciudad, BASE.region, BASE.barrio, BASE.lat, BASE.lng,
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
    console.log("[dry-run] slug=" + SLUG + " categoria=" + BASE.categoria_slug + " subcategoria=" + TAGS.subcategoria);
    console.log("[dry-run] SQL:\n" + INSERT_SQL);
    console.log("[dry-run] params: " + PARAMS.length + " (27 columnas)");
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
