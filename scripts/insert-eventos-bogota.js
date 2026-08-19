// scripts/insert-eventos-bogota.js
// Inserta los 5 eventos de Bogotá en la base de datos Neon.
// Ejecutar: DATABASE_URL="..." node scripts/insert-eventos-bogota.js

const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const eventos = [
  {
    slug: 'voces-por-la-vida-bogota',
    nombre: 'Colombia: Voces por la Vida',
    categoria_slug: 'evento',
    lead: 'Concierto solidario con los grandes artistas de Colombia para recaudar fondos por las víctimas del terremoto M7.4',
    descripcion: 'La industria musical colombiana se une en una jornada sin precedentes para apoyar la reconstrucción de las zonas afectadas por el terremoto del 10 de agosto. Karol G, Miguel Bosé, Sebastián Yatra, Maluma, Silvestre Dangond, Grupo Niche, ChocQuibTown y decenas de artistas más donarán su talento en el recinto Vive Claro, el más grande de Colombia. El total de los aportes será donado a Presentes Corporación.',
    emoji: '🎵',
    hero_bg: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
    foto_hero: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80',
    precio_desde: 'Desde $100.000 (donación)',
    horario: '23 de agosto, 2026',
    ciudad: 'Bogotá',
    region: 'Cundinamarca',
    lat: 4.6389,
    lng: -74.0831,
    web: 'https://www.ticketmaster.co',
    tags: {
      fecha_inicio: '2026-08-23',
      fecha_fin: '2026-08-23',
      edicion: 'Única función',
      sede: 'Vive Claro Distrito Cultural, Bogotá',
      lineup: [
        { nombre: 'Karol G', rol: 'Headliner (livestream)', genero: 'Reggaetón' },
        { nombre: 'Miguel Bosé', rol: 'Headliner', genero: 'Pop Latino' },
        { nombre: 'Sebastián Yatra', rol: 'Headliner', genero: 'Pop' },
        { nombre: 'Maluma', rol: 'Headliner', genero: 'Reggaetón' },
        { nombre: 'Silvestre Dangond', rol: 'Artista', genero: 'Vallenato' },
        { nombre: 'Grupo Niche', rol: 'Artista', genero: 'Salsa' },
        { nombre: 'ChocQuibTown', rol: 'Artista', genero: 'Hip Hop' },
        { nombre: 'Andrés Cepeda', rol: 'Artista', genero: 'Pop' },
        { nombre: 'Beéle', rol: 'Artista', genero: 'Reggaetón' },
        { nombre: 'Draco Rosa', rol: 'Artista', genero: 'Rock Latino' },
        { nombre: 'Eladio Carrión', rol: 'Artista', genero: 'Trap' },
        { nombre: 'Pedro Capó', rol: 'Artista', genero: 'Pop' },
        { nombre: 'Nanpa Básico', rol: 'Artista', genero: 'Urbano' }
      ],
      agenda: [
        { dia: '23 agosto', hora: '4:00 p.m.', actividad: 'Apertura de puertas' },
        { dia: '23 agosto', hora: '6:00 p.m.', actividad: 'Inicio del concierto solidario' }
      ],
      categorias_entrada: [
        { tipo: 'Donación solidaria', precio: '$100.000', disponibilidad: 'Disponible' }
      ],
      que_llevar: ['Cédula de ciudadanía', 'Comprobante de donación', 'Ropa cómoda'],
      prohibido: ['Armas de fuego', 'Sustancias ilícidas', 'Envases de vidrio']
    }
  },
  {
    slug: 'festival-afrodiaspora-bogota',
    nombre: 'Festival Afrodiáspora 2026',
    categoria_slug: 'evento',
    lead: 'Tres noches de música afrodescendiente: afrobeat, reggae, dancehall y fusión afrocolombiana',
    descripcion: 'El Festival Afrodiáspora llega por primera vez al Teatro Colsubsidio con una programación que reunirá a exponentes de la música afrodescendiente contemporánea. Un recorrido que conecta África, el Caribe y Colombia a través de géneros como el afrobeat, el reggae, el dancehall y las nuevas sonoridades de la música afrocolombiana.',
    emoji: '🥁',
    hero_bg: 'linear-gradient(135deg,#0a1a0a,#1a2a1a)',
    foto_hero: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80',
    precio_desde: 'Desde $56.000',
    horario: '20, 21 y 22 de agosto, 7:30 p.m.',
    ciudad: 'Bogotá',
    region: 'Cundinamarca',
    lat: 4.6126,
    lng: -74.0831,
    web: 'https://teatrocolsubsidio.com',
    tags: {
      fecha_inicio: '2026-08-20',
      fecha_fin: '2026-08-22',
      edicion: 'Primera edición',
      sede: 'Teatro Colsubsidio, Av. El Dorado #25-40',
      lineup: [
        { nombre: 'Seun Kuti & Egypt 80', rol: 'Headliner (20 agosto)', genero: 'Afrobeat' },
        { nombre: 'Yellowman', rol: 'Headliner (21 agosto)', genero: 'Reggae/Dancehall' },
        { nombre: 'Alexis Play Big Band Colombia', rol: 'Headliner (22 agosto)', genero: 'Fusión Pacífico' }
      ],
      agenda: [
        { dia: '20 agosto', hora: '7:30 p.m.', actividad: 'Seun Kuti & Egypt 80 - Afrobeat' },
        { dia: '21 agosto', hora: '7:30 p.m.', actividad: 'Yellowman - Reggae Dancehall' },
        { dia: '22 agosto', hora: '7:30 p.m.', actividad: 'Alexis Play Big Band Colombia - Fusión' }
      ],
      categorias_entrada: [
        { tipo: 'General', precio: '$56.000', disponibilidad: 'Disponible' },
        { tipo: 'VIP', precio: '$280.000', disponibilidad: 'Disponible' }
      ],
      que_llevar: ['Cédula de ciudadanía', 'Boleta impresa o digital'],
      prohibido: ['Grabaciones de audio/video sin autorización']
    }
  },
  {
    slug: 'morat-bogota-2026',
    nombre: 'Morat - Ya Es Mañana World Tour',
    categoria_slug: 'evento',
    lead: '6 funciones en el Movistar Arena + Casa Morat, experiencia inmersiva',
    descripcion: 'Morat regresa a Bogotá con su gira "Ya Es Mañana World Tour". La banda ofrecerá seis conciertos en el Movistar Arena y presentará Casa Morat, una experiencia inmersiva que permitirá a los fanáticos recorrer el universo creativo del grupo. Funciones del 14 al 23 de agosto de 2026.',
    emoji: '🎤',
    hero_bg: 'linear-gradient(135deg,#0a0a1a,#1a1a2a)',
    foto_hero: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80',
    precio_desde: 'Consulta precios',
    horario: '21, 22 y 23 de agosto, 9:00 p.m.',
    ciudad: 'Bogotá',
    region: 'Cundinamarca',
    lat: 4.6126,
    lng: -74.0831,
    web: 'https://www.ticketmaster.co',
    tags: {
      fecha_inicio: '2026-08-21',
      fecha_fin: '2026-08-23',
      edicion: 'Gira Ya Es Mañana World Tour',
      sede: 'Movistar Arena, Bogotá',
      lineup: [
        { nombre: 'Morat', rol: 'Headliner', genero: 'Pop Rock' }
      ],
      agenda: [
        { dia: '14-23 agosto', hora: 'Variable', actividad: 'Casa Morat - Experiencia inmersiva' },
        { dia: '21 agosto', hora: '9:00 p.m.', actividad: 'Concierto función 4' },
        { dia: '22 agosto', hora: '9:00 p.m.', actividad: 'Concierto función 5' },
        { dia: '23 agosto', hora: '9:00 p.m.', actividad: 'Concierto función 6 (cierre)' }
      ],
      categorias_entrada: [
        { tipo: 'Tribuna', precio: 'Consulta', disponibilidad: 'Disponible' },
        { tipo: 'General', precio: 'Consulta', disponibilidad: 'Disponible' },
        { tipo: 'VIP', precio: 'Consulta', disponibilidad: 'Disponible' }
      ],
      que_llevar: ['Cédula de ciudadanía', 'Boleta impresa o digital'],
      prohibido: ['Cámaras profesionales', 'Comida externa']
    }
  },
  {
    slug: 'expoferia-vehiculos-electricos-bogota',
    nombre: 'ExpoFeria Vehículos Eléctricos e Híbridos 2026',
    categoria_slug: 'evento',
    lead: 'Más de 20 marcas, test drives, asesoría especializada y descuentos exclusivos',
    descripcion: 'La segunda edición de la ExpoFeria reúne a las principales marcas del sector automotor para presentar novedades, impulsar negocios y promover tecnologías de bajas emisiones. Audi, Chevrolet, Hyundai, Kia, Volvo, Volkswagen y más de 20 marcas participan. Entrada gratuita con registro previo.',
    emoji: '🚗',
    hero_bg: 'linear-gradient(135deg,#0a1a2a,#1a2a3a)',
    foto_hero: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=900&q=80',
    precio_desde: 'Entrada gratuita',
    horario: '20 al 23 de agosto',
    ciudad: 'Bogotá',
    region: 'Cundinamarca',
    lat: 4.6126,
    lng: -74.0831,
    web: 'https://expoferiavehiculoselectricos.com',
    tags: {
      fecha_inicio: '2026-08-20',
      fecha_fin: '2026-08-23',
      edicion: 'Segunda edición',
      sede: 'Centro Comercial Carrera, Av. Américas #50-15',
      lineup: [],
      agenda: [
        { dia: '20-23 agosto', hora: '10:00 a.m. - 8:00 p.m.', actividad: 'Exhibición de 20+ marcas automotrices' },
        { dia: '20-23 agosto', hora: 'Variable', actividad: 'Test drives y asesoría especializada' },
        { dia: '20-23 agosto', hora: 'Variable', actividad: 'Descuentos exclusivos de feria' }
      ],
      categorias_entrada: [
        { tipo: 'General', precio: 'Gratis', disponibilidad: 'Registro previo en línea' }
      ],
      que_llevar: ['Registro en línea', 'Cédula de ciudadanía'],
      prohibido: []
    }
  },
  {
    slug: 'bogota-horse-week-2026',
    nombre: 'Bogotá Horse Week 2026',
    categoria_slug: 'evento',
    lead: 'El evento ecuestre más importante del año: deporte, cultura y entretenimiento para toda la familia',
    descripcion: 'Segunda edición del certamen ecuestre más importante de Colombia. Durante 25 días, Bogotá se convierte en el epicentro del sector equino con competencias nacionales e internacionales, feria gastronómica, villa comercial y exhibición automotriz. Entrada gratuita y pet friendly.',
    emoji: '🐎',
    hero_bg: 'linear-gradient(135deg,#2a1a0a,#3a2a0a)',
    foto_hero: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=900&q=80',
    precio_desde: 'Entrada gratuita',
    horario: '13 de agosto al 6 de septiembre',
    ciudad: 'Bogotá',
    region: 'Cundinamarca',
    lat: 4.7126,
    lng: -74.0531,
    web: '',
    tags: {
      fecha_inicio: '2026-08-13',
      fecha_fin: '2026-09-06',
      edicion: 'Segunda edición',
      sede: 'Escuela de Unidades Montadas y Equitación, Carrera 7 #106-10',
      lineup: [],
      agenda: [
        { dia: '13 ago - 6 sep', hora: 'Variable', actividad: 'Competencias ecuestres nacionales e internacionales' },
        { dia: '13 ago - 6 sep', hora: 'Variable', actividad: 'Feria gastronómica' },
        { dia: '13 ago - 6 sep', hora: 'Variable', actividad: 'Villa comercial y exhibición automotriz' }
      ],
      categorias_entrada: [
        { tipo: 'General', precio: 'Gratis', disponibilidad: 'Abierto al público' }
      ],
      que_llevar: ['Ropa cómoda', 'Protectores solares', 'Agua'],
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
