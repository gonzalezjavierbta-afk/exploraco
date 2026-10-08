// scripts/insert-eventos-bogota.js
// Inserta los 5 eventos de Bogot\u00e1 en la base de datos Neon.
// Ejecutar: DATABASE_URL="..." node scripts/insert-eventos-bogota.js

const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const eventos = [
  {
    slug: 'voces-por-la-vida-bogota',
    nombre: 'Colombia: Voces por la Vida',
    categoria_slug: 'evento',
    lead: 'Concierto solidario con los grandes artistas de Colombia para recaudar fondos por las v\u00edctimas del terremoto M7.4',
    descripcion: 'La industria musical colombiana se une en una jornada sin precedentes para apoyar la reconstrucci\u00f3n de las zonas afectadas por el terremoto del 10 de agosto. Karol G, Miguel Bos\u00e9, Sebasti\u00e1n Yatra, Maluma, Silvestre Dangond, Grupo Niche, ChocQuibTown y decenas de artistas m\u00e1s donar\u00e1n su talento en el recinto Vive Claro, el m\u00e1s grande de Colombia. El total de los aportes ser\u00e1 donado a Presentes Corporaci\u00f3n.',
    emoji: '\ud83c\udfb5',
    hero_bg: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
    foto_hero: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80',
    precio_desde: 'Desde $100.000 (donaci\u00f3n)',
    horario: '23 de agosto, 2026',
    ciudad: 'Bogot\u00e1',
    region: 'Cundinamarca',
    lat: 4.6389,
    lng: -74.0831,
    web: 'https://www.ticketmaster.co',
    tags: {
      fecha_inicio: '2026-08-23',
      fecha_fin: '2026-08-23',
      edicion: '\u00danica funci\u00f3n',
      sede: 'Vive Claro Distrito Cultural, Bogot\u00e1',
      lineup: [
        { nombre: 'Karol G', rol: 'Headliner (livestream)', genero: 'Reggaet\u00f3n' },
        { nombre: 'Miguel Bos\u00e9', rol: 'Headliner', genero: 'Pop Latino' },
        { nombre: 'Sebasti\u00e1n Yatra', rol: 'Headliner', genero: 'Pop' },
        { nombre: 'Maluma', rol: 'Headliner', genero: 'Reggaet\u00f3n' },
        { nombre: 'Silvestre Dangond', rol: 'Artista', genero: 'Vallenato' },
        { nombre: 'Grupo Niche', rol: 'Artista', genero: 'Salsa' },
        { nombre: 'ChocQuibTown', rol: 'Artista', genero: 'Hip Hop' },
        { nombre: 'Andr\u00e9s Cepeda', rol: 'Artista', genero: 'Pop' },
        { nombre: 'Be\u00e9le', rol: 'Artista', genero: 'Reggaet\u00f3n' },
        { nombre: 'Draco Rosa', rol: 'Artista', genero: 'Rock Latino' },
        { nombre: 'Eladio Carri\u00f3n', rol: 'Artista', genero: 'Trap' },
        { nombre: 'Pedro Cap\u00f3', rol: 'Artista', genero: 'Pop' },
        { nombre: 'Nanpa B\u00e1sico', rol: 'Artista', genero: 'Urbano' }
      ],
      agenda: [
        { dia: '23 agosto', hora: '4:00 p.m.', actividad: 'Apertura de puertas' },
        { dia: '23 agosto', hora: '6:00 p.m.', actividad: 'Inicio del concierto solidario' }
      ],
      categorias_entrada: [
        { tipo: 'Donaci\u00f3n solidaria', precio: '$100.000', disponibilidad: 'Disponible' }
      ],
      que_llevar: ['C\u00e9dula de ciudadan\u00eda', 'Comprobante de donaci\u00f3n', 'Ropa c\u00f3moda'],
      prohibido: ['Armas de fuego', 'Sustancias il\u00edcidas', 'Envases de vidrio']
    }
  },
  {
    slug: 'festival-afrodiaspora-bogota',
    nombre: 'Festival Afrodi\u00e1spora 2026',
    categoria_slug: 'evento',
    lead: 'Tres noches de m\u00fasica afrodescendiente: afrobeat, reggae, dancehall y fusi\u00f3n afrocolombiana',
    descripcion: 'El Festival Afrodi\u00e1spora llega por primera vez al Teatro Colsubsidio con una programaci\u00f3n que reunir\u00e1 a exponentes de la m\u00fasica afrodescendiente contempor\u00e1nea. Un recorrido que conecta \u00c1frica, el Caribe y Colombia a trav\u00e9s de g\u00e9neros como el afrobeat, el reggae, el dancehall y las nuevas sonoridades de la m\u00fasica afrocolombiana.',
    emoji: '\ud83e\udd41',
    hero_bg: 'linear-gradient(135deg,#0a1a0a,#1a2a1a)',
    foto_hero: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80',
    precio_desde: 'Desde $56.000',
    horario: '20, 21 y 22 de agosto, 7:30 p.m.',
    ciudad: 'Bogot\u00e1',
    region: 'Cundinamarca',
    lat: 4.6126,
    lng: -74.0831,
    web: 'https://teatrocolsubsidio.com',
    tags: {
      fecha_inicio: '2026-08-20',
      fecha_fin: '2026-08-22',
      edicion: 'Primera edici\u00f3n',
      sede: 'Teatro Colsubsidio, Av. El Dorado #25-40',
      lineup: [
        { nombre: 'Seun Kuti & Egypt 80', rol: 'Headliner (20 agosto)', genero: 'Afrobeat' },
        { nombre: 'Yellowman', rol: 'Headliner (21 agosto)', genero: 'Reggae/Dancehall' },
        { nombre: 'Alexis Play Big Band Colombia', rol: 'Headliner (22 agosto)', genero: 'Fusi\u00f3n Pac\u00edfico' }
      ],
      agenda: [
        { dia: '20 agosto', hora: '7:30 p.m.', actividad: 'Seun Kuti & Egypt 80 - Afrobeat' },
        { dia: '21 agosto', hora: '7:30 p.m.', actividad: 'Yellowman - Reggae Dancehall' },
        { dia: '22 agosto', hora: '7:30 p.m.', actividad: 'Alexis Play Big Band Colombia - Fusi\u00f3n' }
      ],
      categorias_entrada: [
        { tipo: 'General', precio: '$56.000', disponibilidad: 'Disponible' },
        { tipo: 'VIP', precio: '$280.000', disponibilidad: 'Disponible' }
      ],
      que_llevar: ['C\u00e9dula de ciudadan\u00eda', 'Boleta impresa o digital'],
      prohibido: ['Grabaciones de audio/video sin autorizaci\u00f3n']
    }
  },
  {
    slug: 'morat-bogota-2026',
    nombre: 'Morat - Ya Es Ma\u00f1ana World Tour',
    categoria_slug: 'evento',
    lead: '6 funciones en el Movistar Arena + Casa Morat, experiencia inmersiva',
    descripcion: 'Morat regresa a Bogot\u00e1 con su gira "Ya Es Ma\u00f1ana World Tour". La banda ofrecer\u00e1 seis conciertos en el Movistar Arena y presentar\u00e1 Casa Morat, una experiencia inmersiva que permitir\u00e1 a los fan\u00e1ticos recorrer el universo creativo del grupo. Funciones del 14 al 23 de agosto de 2026.',
    emoji: '\ud83c\udfa4',
    hero_bg: 'linear-gradient(135deg,#0a0a1a,#1a1a2a)',
    foto_hero: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80',
    precio_desde: 'Consulta precios',
    horario: '21, 22 y 23 de agosto, 9:00 p.m.',
    ciudad: 'Bogot\u00e1',
    region: 'Cundinamarca',
    lat: 4.6126,
    lng: -74.0831,
    web: 'https://www.ticketmaster.co',
    tags: {
      fecha_inicio: '2026-08-21',
      fecha_fin: '2026-08-23',
      edicion: 'Gira Ya Es Ma\u00f1ana World Tour',
      sede: 'Movistar Arena, Bogot\u00e1',
      lineup: [
        { nombre: 'Morat', rol: 'Headliner', genero: 'Pop Rock' }
      ],
      agenda: [
        { dia: '14-23 agosto', hora: 'Variable', actividad: 'Casa Morat - Experiencia inmersiva' },
        { dia: '21 agosto', hora: '9:00 p.m.', actividad: 'Concierto funci\u00f3n 4' },
        { dia: '22 agosto', hora: '9:00 p.m.', actividad: 'Concierto funci\u00f3n 5' },
        { dia: '23 agosto', hora: '9:00 p.m.', actividad: 'Concierto funci\u00f3n 6 (cierre)' }
      ],
      categorias_entrada: [
        { tipo: 'Tribuna', precio: 'Consulta', disponibilidad: 'Disponible' },
        { tipo: 'General', precio: 'Consulta', disponibilidad: 'Disponible' },
        { tipo: 'VIP', precio: 'Consulta', disponibilidad: 'Disponible' }
      ],
      que_llevar: ['C\u00e9dula de ciudadan\u00eda', 'Boleta impresa o digital'],
      prohibido: ['C\u00e1maras profesionales', 'Comida externa']
    }
  },
  {
    slug: 'expoferia-vehiculos-electricos-bogota',
    nombre: 'ExpoFeria Veh\u00edculos El\u00e9ctricos e H\u00edbridos 2026',
    categoria_slug: 'evento',
    lead: 'M\u00e1s de 20 marcas, test drives, asesor\u00eda especializada y descuentos exclusivos',
    descripcion: 'La segunda edici\u00f3n de la ExpoFeria re\u00fane a las principales marcas del sector automotor para presentar novedades, impulsar negocios y promover tecnolog\u00edas de bajas emisiones. Audi, Chevrolet, Hyundai, Kia, Volvo, Volkswagen y m\u00e1s de 20 marcas participan. Entrada gratuita con registro previo.',
    emoji: '\ud83d\ude97',
    hero_bg: 'linear-gradient(135deg,#0a1a2a,#1a2a3a)',
    foto_hero: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=900&q=80',
    precio_desde: 'Entrada gratuita',
    horario: '20 al 23 de agosto',
    ciudad: 'Bogot\u00e1',
    region: 'Cundinamarca',
    lat: 4.6126,
    lng: -74.0831,
    web: 'https://expoferiavehiculoselectricos.com',
    tags: {
      fecha_inicio: '2026-08-20',
      fecha_fin: '2026-08-23',
      edicion: 'Segunda edici\u00f3n',
      sede: 'Centro Comercial Carrera, Av. Am\u00e9ricas #50-15',
      lineup: [],
      agenda: [
        { dia: '20-23 agosto', hora: '10:00 a.m. - 8:00 p.m.', actividad: 'Exhibici\u00f3n de 20+ marcas automotrices' },
        { dia: '20-23 agosto', hora: 'Variable', actividad: 'Test drives y asesor\u00eda especializada' },
        { dia: '20-23 agosto', hora: 'Variable', actividad: 'Descuentos exclusivos de feria' }
      ],
      categorias_entrada: [
        { tipo: 'General', precio: 'Gratis', disponibilidad: 'Registro previo en l\u00ednea' }
      ],
      que_llevar: ['Registro en l\u00ednea', 'C\u00e9dula de ciudadan\u00eda'],
      prohibido: []
    }
  },
  {
    slug: 'bogota-horse-week-2026',
    nombre: 'Bogot\u00e1 Horse Week 2026',
    categoria_slug: 'evento',
    lead: 'El evento ecuestre m\u00e1s importante del a\u00f1o: deporte, cultura y entretenimiento para toda la familia',
    descripcion: 'Segunda edici\u00f3n del certamen ecuestre m\u00e1s importante de Colombia. Durante 25 d\u00edas, Bogot\u00e1 se convierte en el epicentro del sector equino con competencias nacionales e internacionales, feria gastron\u00f3mica, villa comercial y exhibici\u00f3n automotriz. Entrada gratuita y pet friendly.',
    emoji: '\ud83d\udc0e',
    hero_bg: 'linear-gradient(135deg,#2a1a0a,#3a2a0a)',
    foto_hero: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=900&q=80',
    precio_desde: 'Entrada gratuita',
    horario: '13 de agosto al 6 de septiembre',
    ciudad: 'Bogot\u00e1',
    region: 'Cundinamarca',
    lat: 4.7126,
    lng: -74.0531,
    web: '',
    tags: {
      fecha_inicio: '2026-08-13',
      fecha_fin: '2026-09-06',
      edicion: 'Segunda edici\u00f3n',
      sede: 'Escuela de Unidades Montadas y Equitaci\u00f3n, Carrera 7 #106-10',
      lineup: [],
      agenda: [
        { dia: '13 ago - 6 sep', hora: 'Variable', actividad: 'Competencias ecuestres nacionales e internacionales' },
        { dia: '13 ago - 6 sep', hora: 'Variable', actividad: 'Feria gastron\u00f3mica' },
        { dia: '13 ago - 6 sep', hora: 'Variable', actividad: 'Villa comercial y exhibici\u00f3n automotriz' }
      ],
      categorias_entrada: [
        { tipo: 'General', precio: 'Gratis', disponibilidad: 'Abierto al p\u00fablico' }
      ],
      que_llevar: ['Ropa c\u00f3moda', 'Protectores solares', 'Agua'],
      prohibido: ['Mascotas sin correa']
    }
  }
];

async function insertEventos() {
  console.log('Conectando a Neon...');
  var inserted = 0;
  for (var ev of eventos) {
    try {
      await sql(
        'INSERT INTO destinos ( '
        + 'slug, nombre, categoria_slug, '
        + 'lead, descripcion, '
        + 'ciudad, region, '
        + 'lat, lng, '
        + 'web, '
        + 'precio_desde, horario, emoji, hero_bg, foto_hero, '
        + 'status, destacado, tags, '
        + 'creado_en, actualizado_en '
        + ') VALUES ( '
        + '$1, $2, $3, '
        + '$4, $5, '
        + '$6, $7, '
        + '$8, $9, '
        + '$10, '
        + '$11, $12, $13, $14, $15, '
        + '$16, $17, $18::jsonb, '
        + 'NOW(), NOW() '
        + ') ON CONFLICT (slug) DO UPDATE SET '
        + 'nombre = EXCLUDED.nombre, '
        + 'lead = EXCLUDED.lead, '
        + 'descripcion = EXCLUDED.descripcion, '
        + 'precio_desde = EXCLUDED.precio_desde, '
        + 'horario = EXCLUDED.horario, '
        + 'tags = COALESCE(destinos.tags, \'{}\'::jsonb) || EXCLUDED.tags, '
        + 'actualizado_en = NOW()',
        [
          ev.slug,
          ev.nombre,
          ev.categoria_slug,
          ev.lead,
          ev.descripcion,
          ev.ciudad,
          ev.region,
          ev.lat,
          ev.lng,
          ev.web,
          ev.precio_desde,
          ev.horario,
          ev.emoji,
          ev.hero_bg,
          ev.foto_hero,
          'published',
          false,
          JSON.stringify(ev.tags)
        ]
      );
      inserted++;
      console.log('[OK] ' + ev.slug);
    } catch (err) {
      console.error('[ERROR] ' + ev.slug + ': ' + err.message);
    }
  }
  console.log('\n' + inserted + '/' + eventos.length + ' eventos insertados correctamente.');
}

insertEventos().catch(console.error);
