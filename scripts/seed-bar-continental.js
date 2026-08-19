// scripts/seed-bar-continental.js
// Crea (o actualiza) la pagina dinamica bar-continental.html con los datos
// de Bar Continental (Cra 8 #66-18, Chapinero), speakeasy de ron y salsa
// fundado 2020, TripAdvisor #1, vinilos viernes, siguiendo el patron de scripts/seed-quiebracanto.js.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-bar-continental.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-bar-continental.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'bar-continental';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Chapinero de noche, donde Bar Continental cultiva su culto al ron y la salsa desde 2020' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Salsa_dance_dip.jpg/960px-Salsa_dance_dip.jpg', caption: 'Pareja bailando salsa, el ritmo que suena en vinilo los viernes' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg/960px-Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg', caption: 'Palacio Lievano, icono del centro historico bogotano' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Bogota_city_skyline_at_night_seen_from_the_Monseratte_sanctuary.png/960px-Bogota_city_skyline_at_night_seen_from_the_Monseratte_sanctuary.png', caption: 'Bogota nocturna desde Monserrate, vista hacia los cerros orientales' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'La Plaza de Bolivar, corazon historico de la ciudad' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Bar Continental',
  categoria_slug: 'sitio',
  lead: 'Speakeasy ron/salsa Chapinero (Cra 8 #66-18): TripAdvisor #1, vinilos viernes 6 DJs, cigar lounge, menu LP Cuchifrito, 5 anos culto.',
  descripcion: 'Bar Continental (Carrera 8 #66-18, Chapinero, Bogota, coordenadas aprox. 4.6526, -74.0633) es un espacio que rescata los olores, sabores y sonidos del Caribe en un acogedor refugio en el corazon de Chapinero, a tan solo unas cuadras de los cerros orientales. Fundado en 2020 por Guillermo Rivera (mixologo y melomano), supero la incertidumbre de la pandemia para consolidarse como un bar de culto, orgullosamente #1 en TripAdvisor entre los 30 mejores bares de Bogota.\n\nEl concepto: ron como destilado insignia, cocteles latinos accesibles, comida latinoamericana (tacos de posta negra, ceviches, quesadillas mexicanas, choripanes, sandwiches cubanos, banos tipicos), y salsa clasica, chachacha y bugalu de fondo. El vinilo no es decorado: es instrumento. Cada viernes, 6 DJs (The Vinyl Brothers y colectivo) se turnan de 8 PM a 11 PM para poner a girar discos, no playlists. El menu actual, "Cuchifrito Circuit", rinde homenaje al movimiento underground de los 70 en Nueva York, estructurado como un LP: Lado A (frescos, fruta) y Lado B (contundentes, menos azucar, mas ron).\n\nEl segundo piso alberga un cigar lounge con tabacos importados y maridajes especializados. Horarios: Martes a Jueves 4 PM - 1 AM; Viernes y Sabados 4 PM - 2 AM. Instagram: @barcontinental.bog. Web: barcontinental.com. Email: barcontinental.bog@gmail.com. Telefono: +57 315 777 9319. Evento especial: "La Salsaton" (pista de baile total, mobiliario quitado, 3 DJs).',
  highlight: 'TripAdvisor #1: ron, vinilos viernes 6 DJs, cigar lounge, menu LP Cuchifrito, salsa underground 2020 Cra 8 con 66.',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Chapinero (cerca cerros)',
  lat: 4.6526,
  lng: -74.0633,
  whatsapp: '',
  telefono: '+57 315 777 9319',
  email: 'barcontinental.bog@gmail.com',
  web: 'https://barcontinental.com',
  instagram: '@barcontinental.bog',
  precio_desde: 'Cocteles $40k-$45k; platos $35k-$65k; sin cover regular',
  horario: 'Mar-Jue 16-1; Vie-Sab 16-2; Vinilos Vie 20-23',
  emoji: '\ud83e\udd43',
  hero_bg: '#1e3a5f',
  foto_hero: HERO,
  tipo: 'Speakeasy ron  -  Vinilos  -  Cigar lounge  -  #1  -  5 anos',
  capacidad: 'Intimo, bar + 2do piso cigar lounge',
  como_llegar: 'TransMilenio Calle 63 o Av. Chile + taxi 5 min a Cra 8 #66-18. Taxi: Cra 8 #66-18, Chapinero. Parque 93: 10 min.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Salsa bar',
  dificultad: 'Facil',
  dificultad_desc: 'Bar intimo con barra y segundo piso (cigar lounge) accesible por escaleras. Requiere ser mayor de 18 anos. Zona Chapinero segura, TransMilenio cercano.',
  duracion: '3-5 horas',
  altitud: '2600',
  temporada: ['Todo el ano', 'Viernes vinilos 20-23h (6 DJs rotativos)', 'Evento La Salsaton (puntual)', 'Catar de ron y cigar lounge 2do piso'],
  precio_entrada: 'Sin cover regular; cocteles $40k-$45k; platos $35k-$65k; catas y eventos especiales con costo.',
  distancia: 'Carrera 8 #66-18, Chapinero. Cerca TransMilenio Calle 63 y Av. Chile. A cuadras de los cerros orientales.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos con documento de identidad valido. Cigar lounge: solo mayores de 18.',
  temporada_nota: 'Viernes 20-23h: 6 DJs de vinilos rotativos (The Vinyl Brothers + colectivo). Evento "La Salsaton" puntual: pista total, 3 DJs. Cigar lounge 2do piso con reserva. Verificar en @barcontinental.bog.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83e\udd43', nombre: 'Ron insignia', hecho: 'Carta enfocada en ron, mezcal, tequila, viche: el destilado caribeno como protagonista' },
    { emoji: '\ud83c\udfb5', nombre: 'Vinilos viernes 6 DJs', hecho: 'The Vinyl Brothers + colectivo de melomanos: 8-11 PM, discos reales, nada de playlists' },
    { emoji: '\ud83d\udc94', nombre: 'Cigar lounge 2do piso', hecho: 'Tabacos importados, maridajes especializados, espacio intimo para fumadores' },
    { emoji: '\ud83c\udfdb\ufe0f', nombre: 'Menu "Cuchifrito Circuit"', hecho: 'Estructurado como LP: Lado A (frescos/fruta) y Lado B (contundentes/ron), homenaje salsa underground NYC 70s' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfb5', titulo: 'Viernes de vinilos: 6 DJs, 3 horas', texto: 'Cada viernes 8-11 PM, The Vinyl Brothers y 4 DJs invitados rotan: salsa, chachacha, bugalu, olvidos. Cada semana es distinta.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udf1f', titulo: 'La Salsaton: pista total', texto: 'Evento puntual: quitan el mobiliario, 3 DJs, el bar se vuelve pista de baile gigante. Sigue @barcontinental.bog para la fecha.', tag: 'Eventos', tag_color: 'blue' },
    { icono: '\ud83d\udc94', titulo: 'Cigar lounge: segundo piso', texto: 'Subes las escaleras y entras a otro mundo: tabacos premium, maridaje con ron viejo, silencio relativo para conversar.', tag: 'Cerca', tag_color: 'brown' },
    { icono: '\ud83c\udf77', titulo: 'Coctel "Caballero de la Salsa"', texto: 'Homenaje a Gilberto Santa Rosa: romantico, burbujeante, en copa delicada. Pide el Lado B del menu.', tag: 'Musica', tag_color: 'green' }
  ]),
  regulaciones: 'Mayor de 18 anos con documento de identidad valido. Cigar lounge: solo mayores de 18. No se permite ingreso de alimentos ni bebidas externas. Se reserva el derecho de admision. Eventos especiales (Salsaton, catas) requieren reserva previa.',
  checklist_tip: 'Viernes 8 PM: llega para los vinilos (gratis, sin cover extra). Reserva para cigar lounge. Pide el menu como LP: Lado A o Lado B segun tu nivel de ron.',
  entradas: [
    { tipo: 'Acceso regular (Mar-Sab)', precio: 'sin cover', incluye: 'Barra, vinilos viernes 20-23h, ambiente salsa', link: 'https://barcontinental.com' },
    { tipo: 'Cata de ron / Maridaje', precio: 'variable', incluye: 'Segun evento (ver Instagram/web)', link: 'https://barcontinental.com' },
    { tipo: 'Cigar lounge (2do piso)', precio: 'segun consumo', incluye: 'Tabacos importados, maridaje ron, reserva previa', link: 'https://barcontinental.com' },
    { tipo: 'La Salsaton (evento)', precio: 'variable', incluye: 'Pista total, 3 DJs, mobiliario quitado', link: 'https://www.instagram.com/barcontinental.bog/' }
  ],
  tours: [
    {
      nombre: 'Viernes de vinilos: la experiencia Continental',
      precio: 'Sin cover (solo consumo)', precio_sub: 'cocteles $40k-$45k',
      duracion: '3-5 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.9', review_count: 156,
      descripcion: 'La experiencia #1 de TripAdvisor: 6 DJs de vinilos 8-11 PM, cocteles de autor, ron de culto, ambiente speakeasy en Cra 8 con 66.',
      incluye: ['Acceso al bar', '6 DJs vinilos (20-23h)', 'Cocteles Lado A/B', 'Ambiente speakeasy', 'Salsa/chachacha/bugalu'],
      no_incluye: ['Cocteles', 'Comida', 'Cigar lounge', 'Transporte'],
      link_reserva: 'https://barcontinental.com',
      featured: true
    },
    {
      nombre: 'Cata de ron + cigar lounge',
      precio: 'Variable', precio_sub: 'evento con reserva',
      duracion: '2-3 horas', tipo_tour: 'Cata', idioma: 'Espanol', max_personas: 'Grupos pequenos (8-12)',
      rating: '4.8', review_count: 34,
      descripcion: 'Experiencia guiada en el segundo piso: rones premium, tabacos importados, maridajes y historias de la cultura del ron caribeno.',
      incluye: ['Rones premium', 'Tabacos importados', 'Maridajes guiados', 'Cigar lounge privado', 'Historia del ron'],
      no_incluye: ['Transporte', 'Consumo extra'],
      link_reserva: 'https://barcontinental.com',
      featured: false
    },
    {
      nombre: 'Ruta Chapinero culto: Bar Continental + Sandunguera + Salsa Camara',
      precio: 'Variable', precio_sub: 'segun consumo en los 3',
      duracion: '4-5 horas', tipo_tour: 'Ruta', idioma: 'Espanol', max_personas: 'Grupos pequenos',
      rating: '4.7', review_count: 19,
      descripcion: 'Los 3 pilares de la salsa en Chapinero: Continental (vinilos, ron, speakeasy), Sandunguera (clasica, clases, Templo), Salsa Camara (orquestas, 37 anos). Todos a 10 min caminando.',
      incluye: ['Itinerario Chapinero', 'Parada en 3 bares', 'Contexto: 3 formas de vivir la salsa'],
      no_incluye: ['Bebidas', 'Transporte', 'Covers', 'Catas'],
      link_reserva: 'https://barcontinental.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para cocteles ($40k-$45k)', prioridad: 'Recomendado' },
    { item: 'Reserva para cigar lounge / catas', prioridad: 'Opcional' },
    { item: 'Curiosidad por el ron y la salsa en vinilo', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Martes', hora: '6:00 pm', titulo: 'Apertura speakeasy', icono: '\ud83e\udd43', detalle: 'Bar abre, primera copa de ron, salsa de fondo en vinilo', tags: ['Apertura'] },
    { dia: 'Viernes', hora: '8:00 pm', titulo: 'Los 6 DJs toman el control', icono: '\ud83c\udfb5', detalle: 'Vinilos rotativos 20-23h: salsa, chachacha, bugalu, cada semana distinto', tags: ['Vinilos', 'DJs'] },
    { dia: 'Sabado', hora: '7:00 pm', titulo: 'Noche de Salsaton (si hay)', icono: '\ud83c\udf1f', detalle: 'Mobiliario fuera, 3 DJs, pista total hasta la madrugada', tags: ['Evento', 'Pista'] }
  ],
  dificultad_tags: [
    { texto: 'Bar intimo, barra + segundo piso (escaleras)', apto: true },
    { texto: 'Chapinero, TransMilenio Calle 63 / Av. Chile cercano', apto: true },
    { texto: 'Viernes vinilos gratis (sin cover extra)', apto: true },
    { texto: 'Cocteles $40k-$45k: rango medio-alto', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Que es Bar Continental?', respuesta: 'Speakeasy de ron y salsa en Chapinero (Cra 8 #66-18), TripAdvisor #1 Bogota, fundado 2020: vinilos viernes 6 DJs, cigar lounge, menu "Cuchifrito Circuit", cocteles de autor.' },
  { pregunta: 'Que dias hay vinilos?', respuesta: 'Cada viernes de 8:00 PM a 11:00 PM: 6 DJs (The Vinyl Brothers + colectivo) rotan discos de salsa, chachacha, bugalu. Sin cover extra.' },
  { pregunta: 'Cuales son los horarios?', respuesta: 'Martes a Jueves 4 PM - 1 AM; Viernes y Sabados 4 PM - 2 AM. Cigar lounge 2do piso con reserva. Eventos especiales (Salsaton) puntuales.' },
  { pregunta: 'Cuanto cuestan los cocteles?', respuesta: 'Cocteles $40.000-$45.000; platos $35.000-$65.000. Menu "Cuchifrito Circuit" estilo LP: Lado A (frescos) y Lado B (contundentes). Sin cover regular.' },
  { pregunta: 'Que es el cigar lounge?', respuesta: 'Segundo piso con tabacos importados, maridajes con ron viejo, espacio intimo. Solo mayores de 18, requiere reserva.' },
  { pregunta: 'Cual es la edad minima?', respuesta: 'Mayor de 18 anos con documento de identidad valido.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-bar-continental.js [--dry]');
    process.exit(1);
  }

  var sql = getNeon()(url);
  var dry = process.argv.indexOf('--dry') !== -1;

  var existing = await sql('SELECT id, slug FROM destinos WHERE slug=$1 LIMIT 1', [SLUG]);

  if (dry) {
    console.log('[dry-run] ' + (existing.length ? 'UPDATE (fila existe)' : 'INSERT (nueva fila)') + ' para slug=' + SLUG);
    console.log('[dry-run] base:\n' + JSON.stringify(BASE, null, 2));
    console.log('[dry-run] tags (' + Object.keys(TAGS).length + ' claves):\n' + JSON.stringify(TAGS, null, 2));
    console.log('[dry-run] fotos galeria: ' + PHOTOS.length + ' | faqs: ' + FAQS.length);
    return;
  }

  var tagPayload = JSON.stringify(TAGS);
  var inserted = await sql(
    'INSERT INTO destinos ( '
    + 'slug, nombre, categoria_slug, lead, descripcion, highlight, '
    + 'ciudad, region, barrio, lat, lng, '
    + 'whatsapp, telefono, email, web, instagram, '
    + 'precio_desde, horario, emoji, hero_bg, foto_hero, '
    + 'tipo, capacidad, como_llegar, '
    + 'status, destacado, tags, creado_en, actualizado_en '
    + ') VALUES ( '
    + '$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'
    + '$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,NOW(),NOW() '
    + ') '
    + 'ON CONFLICT (slug) DO UPDATE SET '
    + 'nombre=EXCLUDED.nombre, lead=EXCLUDED.lead, descripcion=EXCLUDED.descripcion, '
    + 'ciudad=EXCLUDED.ciudad, region=EXCLUDED.region, barrio=EXCLUDED.barrio, '
    + 'lat=EXCLUDED.lat, lng=EXCLUDED.lng, web=EXCLUDED.web, instagram=EXCLUDED.instagram, '
    + 'precio_desde=EXCLUDED.precio_desde, horario=EXCLUDED.horario, emoji=EXCLUDED.emoji, '
    + 'hero_bg=EXCLUDED.hero_bg, foto_hero=EXCLUDED.foto_hero, tipo=EXCLUDED.tipo, '
    + 'como_llegar=EXCLUDED.como_llegar, status=EXCLUDED.status, destacado=EXCLUDED.destacado, '
    + 'tags = COALESCE(destinos.tags, \'{}\'::jsonb) || EXCLUDED.tags, '
    + 'actualizado_en = NOW() '
    + 'RETURNING id, slug, nombre, status',
    [
      BASE.slug, BASE.nombre, BASE.categoria_slug, BASE.lead, BASE.descripcion, BASE.highlight,
      BASE.ciudad, BASE.region, BASE.barrio, BASE.lat, BASE.lng,
      BASE.whatsapp, BASE.telefono, BASE.email, BASE.web, BASE.instagram,
      BASE.precio_desde, BASE.horario, BASE.emoji, BASE.hero_bg, BASE.foto_hero,
      BASE.tipo, BASE.capacidad, BASE.como_llegar,
      BASE.status, BASE.destacado, tagPayload
    ]
  );

  var id = inserted[0].id;
  console.log('OK - destino ' + inserted[0].slug + ' (' + id + ') status=' + inserted[0].status);

  if (FAQS.length) {
    await sql(
      'INSERT INTO destinos_detalles (destino_id, faqs, creado_en) VALUES ($1,$2,NOW()) '
      + 'ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs',
      [id, JSON.stringify(FAQS)]
    ).catch(function(){});
  }

  for (var i = 0; i < PHOTOS.length; i++) {
    var esHero = (i === 0);
    await sql(
      'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
      + 'VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING',
      [id, PHOTOS[i].url, PHOTOS[i].caption, i, esHero]
    ).catch(function(){});
  }

  console.log('OK - faqs y ' + PHOTOS.length + ' fotos de galeria insertadas.');
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});