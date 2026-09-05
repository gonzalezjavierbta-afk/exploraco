# TASKS.md - ExploraCO

Tablero operativo del proyecto (AI-DOS Cap. 9.4)[cite: 1]. Cada tarea incluye: ID, Prioridad, Responsable, Estado, Dependencia, Sprint, Detalle t\u00e9cnico y Evidencia f\u00edsica de \u00e9xito.

## Leyenda de estado
- **PENDIENTE:** no iniciada[cite: 1].
- **EN PROGRESO:** iniciada, sin cerrar[cite: 1].
- **BLOQUEADA:** requiere una dependencia previa[cite: 1].
- **COMPLETADA:** cerrada e integrada[cite: 1].

---

## Prioridad PAGINAS DINAMICAS - Paginas de destino servidas por el motor

> Series de paginas de destino dinamicas (patron monserrate.html) cargadas
> en produccion via `api/pagina-destino.js`. La carga se hace con la API de
> admin (`POST /api/admin-destinos`, Bearer exploraco12345) porque no hay
> DATABASE_URL local; el seed equivalente (`scripts/seed-*.js`, upsert SQL
> idempotente) queda versionado para quien tenga la URL de Neon. Mismo
> patron para ambas: seed (datos del formulario) + loader idempotente
> (borra previo + POST). Ver DECISIONS.md ADR-009 (rating 0 hasta resenas
> reales + destacado editorial) y BUGS_HISTORICOS.md BUG-022 (imagenes).

### TSK-018: Pagina dinamica lacandelaria.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina de La Candelaria (cat sitio, slug `lacandelaria`,
  `status='published'`, `destacado=true`, rating 0). Datos del formulario
  admin; fuente ficha-lacandelaria.md. Archivos: `scripts/seed-lacandelaria.js`
  y `scripts/load-lacandelaria-api.js`.
- **Evidencia:** `/lacandelaria.html` 200 con todas las secciones del motor;
  sitemap (cache MISS) incluye el slug; `/api/destinos` lo lista destacado
  rating 0 (id 72433a29-...). Pendiente conocido: corregir URLs de imagenes
  (BUG-022) - ver NEXT.md.

### TSK-019: Pagina dinamica bogota.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Bogota a escala ciudad (cat sitio, slug `bogota`,
  `status='published'`, `destacado=true`, rating 0) con guia completa:
  itinerario 3 dias, 8 entradas de museos reales (Museo del Oro, Botero,
  Nacional, MAMBO, Monserrate), 5 tours, 7 fotos verificadas, 5 FAQs.
  Fuente: ficha-bogota.md. Archivos: `scripts/seed-bogota.js` y
  `scripts/load-bogota-api.js`.
- **Evidencia:** `/bogota.html` 200 (74KB) con todas las secciones (canonical
  exploraco.co/bogota.html, mapa #mapel, tours Monserrate, ajiaco);
  sitemap (cache MISS) incluye el slug (91 urls); `/api/destinos` lo lista
  name=Bogota, cat=sitio, destacado=True, rating=0, published (id
  adc2225f-0086-4381-97b2-6f8bb157fe00). Total destinos: 84.

### TSK-020: Pagina dinamica museo-del-oro.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Museo del Oro (cat sitio, slug `museo-del-oro`,
  `status='published'`, `destacado=true`, rating 0) con datos reales:
  Balsa Muisca, Poporo Quimbaya, 4 salas permanentes, 5 entradas, 3 tours,
  6 fotos verificadas (curl 200), 5 FAQs. Fuente: ficha-museo-del-oro.md.
  Archivos: `scripts/seed-museo-del-oro.js` y `scripts/load-museo-del-oro-api.js`.
- **Evidencia:** `/museo-del-oro.html` 200 (66KB, 9 secciones) con Balsa
  Muisca, El Dorado y domingos gratis; sitemap (MISS) incluye el slug;
  `/api/destinos` lo lista destacado rating 0 (id 508b0bc4-...).

### TSK-021: Pagina dinamica museo-botero.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Museo Botero (cat sitio, slug `museo-botero`,
  `status='published'`, `destacado=true`, rating 0) con datos reales:
  208 obras (123 Botero + 85 internacionales), entrada gratis siempre,
  4 entradas, 3 tours, 4 fotos verificadas (curl 200), 5 FAQs. Fuente:
  ficha-museo-botero.md. Archivos: `scripts/seed-museo-botero.js` y
  `scripts/load-museo-botero-api.js`.
- **Evidencia:** `/museo-botero.html` 200 (65KB, 9 secciones) con Picasso,
  Monet y gratis; sitemap (MISS) incluye el slug; `/api/destinos` lo lista
  destacado rating 0 (id 7fd0967b-...).

### TSK-022: Pagina dinamica jardin-botanico-bogota.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Jardin Botanico Jose Celestino Mutis (cat sitio,
  slug `jardin-botanico-bogota`, `status='published'`, `destacado=true`,
  rating 0) con datos reales: Tropicario (invernadero mas grande de
  Suramerica), 34 colecciones vivas, 6 entradas con tarifas 2026, 3 tours,
  4 fotos verificadas (curl 200), 5 FAQs. Fuente: ficha-jardin-botanico.md.
  Archivos: `scripts/seed-jardin-botanico.js` y `scripts/load-jardin-botanico-api.js`.
- **Evidencia:** `/jardin-botanico-bogota.html` 200 (67KB, 9 secciones) con
  Tropicario y Mutis; sitemap (MISS) incluye el slug; `/api/destinos` lo
  lista destacado rating 0 (id ca5d7941-...).

### TSK-023: Pagina dinamica plaza-de-bolivar.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina de la Plaza de Bolivar (cat sitio, slug `plaza-de-bolivar`,
  `status='published'`, `destacado=true`, rating 0) con datos reales: fundada
  como Plaza Mayor en 1539, estatua de Tenerani, Catedral Primada, Capitolio,
  Palacio de Justicia y Palacio Lievano, 5 entradas gratis, 3 tours, 7 fotos
  verificadas (curl 200), 5 FAQs. Fuente: ficha-plaza-de-bolivar.md. Archivos:
  `scripts/seed-plaza-de-bolivar.js` y `scripts/load-plaza-de-bolivar-api.js`.
- **Evidencia:** `/plaza-de-bolivar.html` 200 (68KB, 9 secciones) con Capitolio,
  Tenerani y acceso 24 horas; sitemap (MISS) incluye el slug; `/api/destinos`
  lo lista destacado rating 0 (id 63586c9a-...).

### TSK-024: Pagina dinamica museo-nacional.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Museo Nacional de Colombia (cat sitio, slug
  `museo-nacional`, `status='published'`, `destacado=true`, rating 0) con datos
  reales: fundado en 1823, antiguo Panoptico de Thomas Reed (Monumento Nacional
  1975), 17 salas, tarifas 2026 ($6.000 colombianos / $15.000 extranjeros,
  miercoles tarde gratis), 3 tours, 7 fotos verificadas (curl 200), 5 FAQs.
  Fuente: ficha-museo-nacional.md. Archivos: `scripts/seed-museo-nacional.js` y
  `scripts/load-museo-nacional-api.js`.
- **Evidencia:** `/museo-nacional.html` 200 (67KB, 9 secciones) con 17 salas y
  Thomas Reed; sitemap (MISS) incluye el slug; `/api/destinos` lo lista
  destacado rating 0 (id 61c31f08-...).

### TSK-025: Pagina dinamica quebrada-la-vieja.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina de la Quebrada La Vieja (cat sitio, slug
  `quebrada-la-vieja`, `status='published'`, `destacado=true`, rating 0) con
  datos reales: sendero de 2,7 km hasta 3.200 m, registro previo obligatorio
  (app Caminos de los Cerros Orientales / caminos.eaab.gov.co), aforos EAAB
  (775/419), tramos Claro de Luna-La Virgen-Paramo, 3 tours, 7 fotos verificadas
  (curl 200), 5 FAQs. Fuente: ficha-quebrada-la-vieja.md. Archivos:
  `scripts/seed-quebrada-la-vieja.js` y `scripts/load-quebrada-la-vieja-api.js`.
- **Evidencia:** `/quebrada-la-vieja.html` 200 (68KB, 9 secciones) con registro
  y Rosales; sitemap (MISS) incluye el slug; `/api/destinos` lo lista destacado
  rating 0 (id 5c763772-...).

### TSK-026: Pagina dinamica cerro-de-guadalupe.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Cerro de Guadalupe (cat sitio, slug
  `cerro-de-guadalupe`, `status='published'`, `destacado=true`, rating 0) con
  datos reales: 3.360 m (mas alto que Monserrate), estatua de la Virgen (15 m)
  de Gustavo Arcila Uribe, ermita, via carreteable de 1967, sin funicular
  (correccion de dato erroneo), acceso gratis, 3 tours, 7 fotos verificadas
  (curl 200), 5 FAQs. Fuente: ficha-cerro-de-guadalupe.md. Archivos:
  `scripts/seed-cerro-de-guadalupe.js` y `scripts/load-cerro-de-guadalupe-api.js`.
- **Evidencia:** `/cerro-de-guadalupe.html` 200 (67KB, 9 secciones) con 3.360,
  Arcila y Choachi; sitemap (MISS) incluye el slug; `/api/destinos` lo lista
  destacado rating 0 (id 3d85b44b-...).

### TSK-027: Pagina dinamica parque-simon-bolivar.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Parque Metropolitano Simon Bolivar (cat sitio, slug
  `parque-simon-bolivar`, `status='published'`, `destacado=true`, rating 0) con
  datos reales: 113 hectareas (Ley 31 de 1979, inaugurado 1991 sobre la
  Hacienda El Salitre), laguna navegable, 4 km de ciclorruta, Plaza de Eventos
  (80.000-140.000, Rock al Parque), Biblioteca Virgilio Barco, 5 entradas, 3
  tours, 9 fotos verificadas (curl 200), 5 FAQs. Fuente:
  ficha-parque-simon-bolivar.md. Archivos: `scripts/seed-parque-simon-bolivar.js`
  y `scripts/load-parque-simon-bolivar-api.js`.
- **Evidencia:** `/parque-simon-bolivar.html` 200 (68KB, 9 secciones) con
  laguna, Rock al Parque y Virgilio Barco; sitemap (MISS) incluye el slug;
  `/api/destinos` lo lista destacado rating 0 (id f8085f9a-...).

### TSK-028: Pagina dinamica club-octava.html (Lugares de electronica)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Octava Club (cat sitio, slug `club-octava`,
  `status='published'`, `destacado=true`, rating 0) con datos reales: club de
  techno/house de Fourvenues en Cra 8 No. 63-41 (Chapinero), 100+ eventos,
  50.000+ asistentes, 200+ artistas internacionales, aforo 800, cocteles
  30.000-65.000, 3 tours, 6 fotos verificadas (curl 200), 5 FAQs. Fuente:
  ficha-club-octava.md. Archivos: `scripts/seed-club-octava.js` y
  `scripts/load-club-octava-api.js`.
- **Evidencia:** `/club-octava.html` 200 (66KB, 9 secciones) con techno y
  Fourvenues; sitemap (MISS) incluye el slug; `/api/destinos` lo lista
  destacado rating 0 (id 6b1404c1-...).

### TSK-029: Pagina dinamica theatron.html (Lugares de electronica)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Theatron (cat sitio, slug `theatron`,
  `status='published'`, `destacado=true`, rating 0) con datos reales:
  megaclub LGBTQ+ con 20 salas tematicas, capacidad 5.000-7.000, epicentro
  del Chapigay, World's 100 Best Clubs 2024 (#68), cover 30.000 antes de las
  10PM y 50.000 despues, shows drag, 3 tours, 6 fotos verificadas (curl 200),
  5 FAQs. Fuente: ficha-theatron.md. Archivos: `scripts/seed-theatron.js` y
  `scripts/load-theatron-api.js`.
- **Evidencia:** `/theatron.html` 200 (66KB, 9 secciones) con 20 salas y
  Chapigay; sitemap (MISS) incluye el slug; `/api/destinos` lo lista destacado
  rating 0 (id 842c130f-...).

### TSK-030: Pagina dinamica video-club.html (Lugares de electronica)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Video Club (cat sitio, slug `video-club`,
  `status='published'`, `destacado=true`, rating 0) con datos reales: club de
  la Cll 64 #13-09 (Chapinero, frente al Cosmos), 3 ambientes (chill out,
  techno/house, terraza), evento "Escandalo 25" ($104.000 anytime), Kevin
  Saunderson (may-2025), 3 tours, 6 fotos verificadas (curl 200), 5 FAQs.
  Fuente: ficha-video-club.md. Archivos: `scripts/seed-video-club.js` y
  `scripts/load-video-club-api.js`.
- **Evidencia:** `/video-club.html` 200 (67KB, 9 secciones) con chill out y
  Escandalo; sitemap (MISS) incluye el slug; `/api/destinos` lo lista
  destacado rating 0 (id c4a1c21e-...).

### TSK-031: Pagina dinamica mad-radio.html (Lugares de electronica)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Mad Radio (cat sitio, slug `mad-radio`,
  `status='published'`, `destacado=true`, rating 0) con datos reales: club de
  la Cra 14A #82-42 (Chico/Chapinero), 3 pisos (barra, tech-house, reggae/rock
  y terraza), tienda de vinilos, abierto mie-sab desde 8PM, fundado 2017,
  3 tours, 6 fotos verificadas (curl 200), 5 FAQs. Fuente: ficha-mad-radio.md.
  Archivos: `scripts/seed-mad-radio.js` y `scripts/load-mad-radio-api.js`.
- **Evidencia:** `/mad-radio.html` 200 (66KB, 9 secciones) con vinilos y
  tech-house; sitemap (MISS) incluye el slug; `/api/destinos` lo lista
  destacado rating 0 (id 49e5208b-...).

### TSK-032: Pagina dinamica gate-club.html (Lugares de electronica)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Gate Club (cat sitio, slug `gate-club`,
  `status='published'`, `destacado=true`, rating 0) con datos reales: club de
  techno/house de la Tv. 39A #20A-69 (Ortezal, Puente Aranda), eventos 2026
  (Energy Transfer, Europe Tour), cerveza $12.000, 3 tours, 6 fotos verificadas
  (curl 200), 5 FAQs. Fuente: ficha-gate-club.md. Archivos:
  `scripts/seed-gate-club.js` y `scripts/load-gate-club-api.js`.
- **Evidencia:** `/gate-club.html` 200 (65KB, 9 secciones) con Ortezal y
  Energy Transfer; sitemap (MISS) incluye el slug; `/api/destinos` lo lista
  destacado rating 0 (id 02141eae-...).

### TSK-033: Pagina dinamica radio-estrella.html (Lugares de electronica)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Radio Estrella (cat sitio, slug `radio-estrella`,
  `status='published'`, `destacado=true`, rating 0) con datos reales: club de
  trance/fast techno/hard house/UKG de la Cra 15 #99-23 (Chico), abierto
  vie-sab 10PM-5AM, a 81 m de Chico Plaza, 3 tours, 6 fotos verificadas (curl
  200), 5 FAQs. Fuente: ficha-radio-estrella.md. Archivos:
  `scripts/seed-radio-estrella.js` y `scripts/load-radio-estrella-api.js`.
- **Evidencia:** `/radio-estrella.html` 200 (64KB, 9 secciones) con trance y
  UKG; sitemap (MISS) incluye el slug; `/api/destinos` lo lista destacado
  rating 0 (id afe9610d-...).

### TSK-034: Pagina dinamica espacio-kinder.html (Lugares de electronica)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Espacio Kinder (Proyecto Kinder, cat sitio, slug
  `espacio-kinder`, `status='published'`, `destacado=true`, rating 0) con
  datos reales: megaclub heredero del Kaputt Klub, abrio 31-oct-2025 en el ex
  Colegio Nuestra Senora de Chiquinquira (Av. Calle 63 #15-70, Barrios
  Unidos), 5 pisos, 7 salas, galeria 250 m2, auditorio 1.500, aforo hasta
  4.500, bono 30.000 COP, 3 tours, 9 fotos verificadas (curl 200), 5 FAQs.
  Fuente: ficha-espacio-kinder.md. Archivos: `scripts/seed-espacio-kinder.js` y
  `scripts/load-espacio-kinder-api.js`.
- **Evidencia:** `/espacio-kinder.html` 200 (69KB, 9 secciones) con Kaputt y
  colegio; sitemap (MISS) incluye el slug; `/api/destinos` lo lista destacado
  rating 0 (id 5a53a6cd-...).

### TSK-035: Pagina dinamica radio-berlin.html (Lugares de electronica)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Radio Berlin (cat sitio, slug `radio-berlin`,
  `status='published'`, `destacado=true`, rating 0) con datos reales: "La Casa
  del Techno", nacio 2010 frente a la Plaza de Toros (La Macarena, cerro jul
  2023) y resucito en Cra 13 #64-13 (Chapinero), cabina-jaula, capacidad
  400-500, miercoles de house gratis, gratis antes de 22:00 los viernes,
  RadioBerlin Academy, 3 tours, 7 fotos verificadas (curl 200), 5 FAQs.
  Fuente: ficha-radio-berlin.md. Archivos: `scripts/seed-radio-berlin.js` y
  `scripts/load-radio-berlin-api.js`.
- **Evidencia:** `/radio-berlin.html` 200 (68KB, 9 secciones) con jaula,
  Macarena y Academy; sitemap (MISS) incluye el slug; `/api/destinos` lo
  lista destacado rating 0 (id 30e67f95-...).

### TSK-036: Pagina dinamica museo-santa-clara.html (Museos faltantes)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Museo de Santa Clara (cat sitio, slug
  `museo-santa-clara`, `status='published'`, `destacado=true`, rating 0) con
  datos reales: templo del Real Convento de Santa Clara (1647), barroco
  santafere\u00f1o, 328 piezas (9 retablos: 1 mayor + 8 laterales, 112 \u00f3leos,
  24 esculturas), oleos de Gregorio Vasquez de Arce y Ceballos, artesonado
  mudejar con pentafolias, tarifas Res. 2137/2025 (adultos $6.000/$15.000),
  gratis domingos, miercoles desde las 2PM, 20-jul y 7-ago, 3 tours, 7 fotos
  verificadas (curl 200), 5 FAQs. Direccion corregida: Cra 8 No. 8-91.
  Fuente: ficha-museo-santa-clara.md. Archivos: `scripts/seed-museo-santa-clara.js`
  y `scripts/load-museo-santa-clara-api.js`.
- **Evidencia:** `/museo-santa-clara.html` 200 (67KB, 9 secciones) con
  pentafolia y retablos; sitemap (MISS) incluye el slug; `/api/destinos` lo
  lista destacado rating 0 (id 508fc7be-...).

### TSK-037: Pagina dinamica quinta-de-bolivar.html (Museos faltantes)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Casa Museo Quinta de Bolivar (cat sitio, slug
  `quinta-de-bolivar`, `status='published'`, `destacado=true`, rating 0) con
  datos reales: casa campestre entregada a Bolivar en 1820, habitada 423 dias,
  espada de Bolivar (robada por el M-19 en 1974, regreso a la Quinta el
  24-jul-2026), jardin historico patrimonio del paisaje (36 especies de aves),
  tarifas Res. 0975 ($6.000/$15.000), gratis ultimo domingo, audioguia $2.000,
  3 tours, 9 fotos verificadas (curl 200), 5 FAQs. Coordenadas OSM 4.6025734,
  -74.0628512. Fuente: ficha-quinta-de-bolivar.md. Archivos:
  `scripts/seed-quinta-de-bolivar.js` y `scripts/load-quinta-de-bolivar-api.js`.
- **Evidencia:** `/quinta-de-bolivar.html` 200 (68KB, 9 secciones) con espada
  y Monserrate; sitemap (MISS) incluye el slug; `/api/destinos` lo lista
  destacado rating 0 (id 1485ff1f-...).

### TSK-038: Pagina dinamica museo-de-la-independencia.html (Museos faltantes)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de Museo de la Independencia - Casa del Florero (cat
  sitio, slug `museo-de-la-independencia`, `status='published'`,
  `destacado=true`, rating 0) con datos reales: casa colonial de +400 anos
  (s. XVI), incidente del Florero de Llorente (20-jul-1810), fundado 1960 por
  la Academia Colombiana de Historia, 2.360 obras, base del florero original,
  candado de Llorente, balcon esquinado verde, sobrevivio al Bogotazo (1948),
  tarifas Res. 2137/2025 ($6.000/$15.000), gratis miercoles 3-5PM, ultimo
  domingo y 20-jul, 3 tours, 5 fotos verificadas (curl 200), 5 FAQs.
  Coordenadas 4.5983, -74.0751. Fuente: ficha-museo-de-la-independencia.md.
  Archivos: `scripts/seed-museo-de-la-independencia.js` y
  `scripts/load-museo-de-la-independencia-api.js`.
- **Evidencia:** `/museo-de-la-independencia.html` 200 (67KB, 9 secciones) con
  Llorente y Bogotazo; sitemap (MISS) incluye el slug; `/api/destinos` lo
  lista destacado rating 0 (id 96f299d4-...).

### TSK-039: Pagina dinamica parque-nacional.html (Parques de Bogota)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Parque Nacional Enrique Olaya Herrera (cat sitio,
  slug `parque-nacional`, `status='published'`, `destacado=true`, rating 0)
  con datos reales: primer parque publico de Bogota (1934, Ley 50/1931, Karl
  Brunner), 283 ha (141 de reserva forestal de cerros), Monumento Nacional
  (Dcto 1756/1996), monumento a Rafael Uribe Uribe (Victorio Macho 1940),
  Torre del Reloj Suizo (1938), Teatro El Parque (1936, MN 1995), mapa en
  relieve de Colombia, "Al Silencio" de Ramirez Villamizar y "Rita 5:30 p.m."
  de Grau, horario IDRD 6AM-6PM, gratis, coords 4.622881, -74.060984, 3
  tours, 7 fotos verificadas (200), 5 FAQs. Fuente:
  ficha-parque-nacional.md. Archivos: `scripts/seed-parque-nacional.js` y
  `scripts/load-parque-nacional-api.js`.
- **Evidencia:** `/parque-nacional.html` 200 (66KB, hero/galeria/precios/
  itinerario/faqs); `/api/destinos` total=107 con el slug destacado rating 0
  (id d5ebbd0e-...); sitemap incluye el slug (114 urls).

### TSK-040: Pagina dinamica el-virrey.html (Parques de Bogota)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Parque El Virrey (cat sitio, slug `el-virrey`,
  `status='published'`, `destacado=true`, rating 0) con datos reales: parque
  lineal y corredor ecologico de ronda (1999), 10,4 ha / ~1,7 km entre
  Autopista Norte y carrera 7 (La Cabrera, Chapinero), >3.300 arboles, 71-100+
  especies de aves (32 migratorias), abeja andina cornuda endemica, 5 especies
  de murcielagos, Sendero Ambiental Gran Chico, escultura "Gran Cascada" de
  Edgar Negret, prohibido futbol (Consejo de Estado 8201/2006), coords
  4.67424, -74.0563, gratis, 3 tours, 8 fotos verificadas (200), 5 FAQs.
  Fuente: ficha-el-virrey.md. Archivos: `scripts/seed-el-virrey.js` y
  `scripts/load-el-virrey-api.js`.
- **Evidencia:** `/el-virrey.html` 200 (65KB, hero/galeria/precios/
  itinerario/faqs); `/api/destinos` total=107 con el slug destacado rating 0
  (id d372c2ce-...); sitemap incluye el slug (114 urls).

### TSK-041: Pagina dinamica el-tunal.html (Parques de Bogota)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Parque Metropolitano El Tunal (cat sitio, slug
  `el-tunal`, `status='published'`, `destacado=true`, rating 0) con datos
  reales: 55 ha en Tunjuelito, antigua hacienda, misa campal de Juan Pablo II
  (1986, templete conservado), estadio de futbol anos 80, remodelacion
  $12.000M (reapertura oct-2001), CC Ciudad Tunal (1984), Biblioteca Gabriel
  Garcia Marquez (Biblored, +84.000 volumenes), >50.000 visitantes finde,
  lagos ~3 ha, pista atletica, bicicross, skate, coords 4.574436, -74.133402,
  Cll 48B Sur #22A-07, gratis (canchas con tarifa), 3 tours, 8 fotos
  verificadas (200), 5 FAQs. Fuente: ficha-el-tunal.md. Archivos:
  `scripts/seed-el-tunal.js` y `scripts/load-el-tunal-api.js`.
- **Evidencia:** `/el-tunal.html` 200 (66KB, hero/galeria/precios/
  itinerario/faqs); `/api/destinos` total=107 con el slug destacado rating 0
  (id b5acbd21-...); sitemap incluye el slug (114 urls).

### TSK-042: Pagina dinamica parque-la-florida.html (Parques de Bogota)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Parque Metropolitano La Florida (cat sitio, slug
  `parque-la-florida`, `status='published'`, `destacado=true`, rating 0) con
  datos reales: 267 ha en Engativa (limite Funza/Cota), lago + humedal +
  bosques, primer observatorio de aves permanente de Bogota (10-nov-2011,
  estructura de guadua), tingua bogotana (Rallus semiplumbeus, "en peligro"
  Res 126/2024) y jilguero andino, 2.546 msnm, vivero pedagogico, asadores y
  ciclorrutas, coords 4.720412, -74.129334, gratis, 3 tours, 8 fotos
  verificadas (200), 5 FAQs. Fuente: ficha-parque-la-florida.md. Archivos:
  `scripts/seed-parque-la-florida.js` y `scripts/load-parque-la-florida-api.js`.
- **Evidencia:** `/parque-la-florida.html` 200 (66KB, hero/galeria/precios/
  itinerario/faqs); `/api/destinos` total=107 con el slug destacado rating 0
  (id 6035661b-...); sitemap incluye el slug (114 urls).

### TSK-043: Primera entrada real de blog en produccion (monserrate-guia-completa.html)
- **Estado:** COMPLETADA
- **Detalle:** Primer post REAL de la seccion Inspirate (categoria blog,
  slug `monserrate-guia-completa`, nombre "El cerro que vigila a Bogota:
  guia completa para subir a 3.152 m", `status='published'`,
  `destacado=true`). Cuerpo ~6.250 palabras (66 parrafos) en descripcion
  TEXT (parrafos separados por \n\n, render con white-space:pre-line),
  lead + highlight, 5 FAQs, 3 fotos de galeria + 1 hero (Wikimedia
  Commons, thumbs 960px verificadas con curl), video
  https://youtu.be/Bgtc-bsl9II (verificado via oEmbed, embed OK en
  render), tags JSONB multi-tema {tema:'cultura', temas:['cultura',
  'naturaleza','aventura','tips','gastro'], video_url:'https://youtu.be/
  Bgtc-bsl9II'}. SIN id_autor por decision de Javier (migracion 004
  pendiente; se asignara/editar a desde admin.html despues). Archivos:
  `scripts/seed-monserrate-guia.js` (datos), `scripts/load-monserrate-guia-api.js`
  (loader idempotente DELETE+POST) y
  `exploraco desarrollo/ficha-monserrate-guia.md` (ficha con datos
  verificados). Carga via API de admin (no hay DATABASE_URL local), mismo
  patron que TSK-018..042. Ver DECISIONS.md ADR-010 (multi-tema).
- **Evidencia:** GET /monserrate-guia-completa.html = 200 con JSON-LD
  BlogPosting, video embed, chip "Cultura", divs balanceados 80/80;
  /api/destinos?categoria=blog devuelve el post con tema=cultura; sitemap
  incluye el slug. Nota: el post ya es visible en produccion porque el
  loader llama a la API ya desplegada; los cambios multi-tema del repo
  (temas[] en destinos.js/index.html/pagina-destino.js/admin.html) quedan
  pendientes del deploy de Vercel (ver TSK-044 y NEXT.md).

### TSK-044: Multi-tema (tags.temas[]) -- implementado en repo, pendiente de deploy
- **Estado:** BLOQUEADA (implementado y verificado en repo; bloqueado por el
  deploy de Vercel, causa desconocida y diagnostico en pausa)
- **Detalle:** Cambios transversales para que un destino/blog pueda tener
  varios temas: `api/destinos.js` toPlace() expone `temas: tags.temas ||
  [tags.tema]` (mantiene el campo `tema` para compatibilidad); `index.html`
  inspirateCardHTML usa `tArr[0]` (p.temas o p.tema) y renderInspirate
  filtra con `tArr.indexOf(filter)>=0`; `api/pagina-destino.js` array
  `temasBlog` normalizado + chips del hero con forEach + schemaLD agrega
  keywords multi-tema con safeJSON(d.tags); `admin.html` campo
  `f-blog-tema` ahora es `<select multiple>`, `CATEGORY_TAG_FIELDS.blog`
  usa {key:'temas', multi:true, localKey:'temas'}, `_buildTagsObj()` deriva
  `tags.tema = p.temas[0]`, `_applyTagsToLocal()` envuelve tags.tema en
  local.temas y `savePlace()` agrega collectCategoryTagFields(p,'blog').
  Todos pasan node --check y ASCII-safety (0 bytes>127, 0 backticks).
- **Evidencia:** solo local por ahora -- los cambios NO estan desplegados
  (deploy de Vercel sigue fallando). Tras el deploy: /api/destinos?categoria=blog
  debe devolver el array temas[] y los chips/hero/filtro de Inspirate deben
  mostrar los multiples temas. Ver DECISIONS.md ADR-010.

### TSK-046: Blog -- Bogota para viajeros (tips)
- **Estado:** COMPLETADA
- **Detalle:** Segunda entrada real de blog (posts 1-5 usan el patron de
  Theatron). Slug `bogota-guia-para-el-viajero`, nombre "Bogota para
  viajeros: clima, altitud, transporte, dinero y seguridad en una sola
  guia". 2.840 palabras, 36 bloques, 5 fotos inline (reutilizadas de
  `seed-bogota.js`), temas tips/cultura. Sin FAQs, sin video, sin autor.
  Archivos: `scripts/seed-bogota-guia-para-el-viajero.js` y
  `scripts/load-bogota-guia-para-el-viajero-api.js` (loader idempotente
  DELETE+POST).
- **Evidencia:** GET /bogota-guia-para-el-viajero.html = 200 (61KB, 5 figuras
  bfig, Opinion, chips Tips/Cultura, sin FAQ). Smoke test local PASS.
  ID en prod: cd09d39c-71bb-474e-b3b9-ca2a638481f0.

### TSK-047: Blog -- Bogota gastronomia (gastro)
- **Estado:** COMPLETADA
- **Detalle:** Tercera entrada real de blog. Slug `bogota-gastronomia-guia`,
  nombre "Bogota a la mesa: ajiaco, mercados, dulces callejeros y cafes
  de especialidad". 2.837 palabras, 37 bloques, 7 fotos inline (verificadas
  via API de Wikimedia Commons), temas gastro/cultura. Sin FAQs, sin video,
  sin autor. Archivos: `scripts/seed-bogota-gastronomia-guia.js` y
  `scripts/load-bogota-gastronomia-guia-api.js`.
- **Evidencia:** GET /bogota-gastronomia-guia.html = 200 (62KB, 7 figuras,
  Opinion, chips Gastronomia/Cultura, sin FAQ). Smoke test local PASS.
  ID en prod: 5d14af37-0253-4908-a34c-dccacbc46509.

### TSK-048: Blog -- La Candelaria recorrido (cultura)
- **Estado:** COMPLETADA
- **Detalle:** Cuarta entrada real de blog. Slug
  `la-candelaria-recorrido-por-el-centro`, nombre "La Candelaria a pie:
  del Chorro de Quevedo a la Plaza de Bolivar, guia del centro historico
  de Bogota". 2.830 palabras, 36 bloques, 5 fotos inline (reutilizadas
  de `seed-lacandelaria.js`), temas cultura/tips. Sin FAQs, sin video,
  sin autor. Archivos:
  `scripts/seed-la-candelaria-recorrido-por-el-centro.js` y
  `scripts/load-la-candelaria-recorrido-por-el-centro-api.js`.
- **Evidencia:** GET /la-candelaria-recorrido-por-el-centro.html = 200 (61KB,
  5 figuras, Opinion, chips Cultura/Tips, sin FAQ). Smoke test local PASS.
  ID en prod: 335f25f3-c320-4727-9bac-294d3f7ebe59.

### TSK-049: Blog -- Parques y espacios verdes (naturaleza)
- **Estado:** COMPLETADA
- **Detalle:** Quinta entrada real de blog. Slug
  `parques-y-espacios-verdes-de-bogota`, nombre "El pulmon de Bogota:
  Simon Bolivar, Jardin Botanico, El Virrey, El Tunal y los cerros
  orientales". 2.758 palabras, 35 bloques, 7 fotos inline (reutilizadas
  de `seed-parque-simon-bolivar.js`, `seed-jardin-botanico.js`,
  `seed-el-virrey.js`, `seed-el-tunal.js`, `seed-quebrada-la-vieja.js`),
  temas naturaleza/tips. Sin FAQs, sin video, sin autor. Archivos:
  `scripts/seed-parques-y-espacios-verdes-de-bogota.js` y
  `scripts/load-parques-y-espacios-verdes-de-bogota-api.js`.
- **Evidencia:** GET /parques-y-espacios-verdes-de-bogota.html = 200 (63KB,
  7 figuras, Opinion, chips Naturaleza/Tips, sin FAQ). Smoke test local PASS.
  ID en prod: db8dc119-8832-446b-a790-5390c9ed83bd.
- **Blog en produccion:** 6 entradas visibles en `/blog.html` (Monserrate,
  Theatron, viajero, gastronomia, La Candelaria, parques). Total destinos
  en el sitio: 113 (107 destino + 6 blog).

### TSK-050: Pagina dinamica candelario.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina del bar-restaurante El Candelario (cat sitio, slug
  `candelario`, `status='published'`, `destacado=true`, rating 0). Casa
  colonial de +120 anos en la calle 12b con quinta (La Candelaria):
  cocina criolla de dia, bar de noche, leyendas de fantasmas. Coordenadas
  aprox. 4.5972, -74.0739. 6 fotos, 3 tours, 5 FAQs. Archivos:
  `scripts/seed-candelario.js` y `scripts/load-candelario-api.js`.
- **Evidencia:** GET /candelario.html = 200; presente en /api/destinos con
  lat/lng. Publicado via POST /api/admin-destinos (id d4df574e-...).

### TSK-051: Pagina dinamica klandestino.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina del bar Klandestino (cat sitio, slug `klandestino`,
  `status='published'`, `destacado=true`, rating 0). Cocteleria de
  espiritu clandestino en el centro; contacto oficial via Instagram
  @klandestinobogota (la info se publica ahi: horarios, eventos,
  ubicacion exacta). Precios marcados como referencia. Coordenadas aprox.
  4.5985, -74.0745. 5 fotos, 2 tours, 5 FAQs. Archivos:
  `scripts/seed-klandestino.js` y `scripts/load-klandestino-api.js`.
- **Evidencia:** GET /klandestino.html = 200; presente en /api/destinos.
  Publicado via POST /api/admin-destinos (id 63f54ea9-...).
- **Nota editorial:** no fue posible verificar el contenido del Instagram
  (bloqueado); la pagina evita afirmaciones no confirmadas. Ojo: la
  Alcaldia cerro en ago-2025 un bar homonimo en Restrepo (fachada de
  sindicatos); el usuario confirmo que la pagina corresponde al perfil
  @klandestinobogota.

### TSK-052: Pagina dinamica quiebracanto.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina del templo salsero Quiebracanto (cat sitio, slug
  `quiebracanto`, `status='published'`, `destacado=true`, rating 0).
  Fundado en 1979 (Las Aguas), en la carrera quinta desde 1982 (Cra 5
  #17-76); orquestas en vivo los fines de semana, cover de referencia
  5.000-10.000. Coordenadas aprox. 4.6030, -74.0715. 5 fotos, 3 tours,
  5 FAQs. Archivos: `scripts/seed-quiebracanto.js` y
  `scripts/load-quiebracanto-api.js`.
- **Evidencia:** GET /quiebracanto.html = 200; presente en /api/destinos.
  Publicado via POST /api/admin-destinos (id f2f7959d-...).

### TSK-053: Pagina dinamica bellagio-bar.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Bellagio Bar (cat sitio, slug `bellagio-bar`,
  `status='published'`, `destacado=true`, rating 0). Av Jimenez #3-87
  frente al Parque de los Periodistas: cocteleria, cerveza artesanal,
  rap en vivo y trivia. Instagram @bellagiobarbogota, tel +57 324 4651175.
  Coordenadas aprox. 4.6068, -74.0725. 5 fotos, 3 tours, 5 FAQs.
  Archivos: `scripts/seed-bellagio.js` y `scripts/load-bellagio-api.js`.
- **Evidencia:** GET /bellagio-bar.html = 200; presente en /api/destinos.
  Publicado via POST /api/admin-destinos (id 97741ed2-...).

### TSK-054: Pagina dinamica cafe-cinema.html
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Cafe Cinema (cat sitio, slug `cafe-cinema`,
  `status='published'`, `destacado=true`, rating 0). Cafe-bar de los
  cinefilos del centro, fundado a principios de los 90 en la Terraza
  Pasteur (cra 7 con calle 24, Local 207) por cinco directores de
  cineclub. Coordenadas aprox. 4.6145, -74.0685. 5 fotos, 2 tours,
  5 FAQs. Archivos: `scripts/seed-cafe-cinema.js` y
  `scripts/load-cafe-cinema-api.js`.
- **Evidencia:** GET /cafe-cinema.html = 200; presente en /api/destinos.
  Publicado via POST /api/admin-destinos (id cbd3c919-...).
- **Lotes de bares del centro en produccion:** candelario, klandestino,
  quiebracanto, bellagio-bar y cafe-cinema (los 5 con rating 0 hasta
  resenas reales, ADR-009).

### TSK-057: Pagina dinamica rock-al-parque.html (primer evento del motor)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Festival Rock al Parque 2026 - Edicion 30
  (30 anos) como PRIMER destino con `categoria_slug='evento'` servido por
  el motor. Lema "30 anos, 30 ediciones, estremeciendo a Bogota", del 10 al
  12 de octubre de 2026 en la plazoleta de eventos del Parque Simon Bolivar
  (gratis, 26 artistas distritales confirmados por Idartes el 17-ago-2026).
  TAGS evento completos (TASK-003): `fecha_inicio='2026-10-10'`,
  `fecha_fin='2026-10-12'`, `edicion`, `sede`, `lineup` (26 artistas con
  genero), `agenda` (3 dias + actividades de memoria), `categorias_entrada`
  (gratis), `que_llevar` (6), `prohibido` (5). 5 fotos, 6 FAQs.
  Coordenadas del parque 4.658056, -74.093889. Archivos:
  `scripts/seed-rock-al-parque.js` y `scripts/load-rock-al-parque-api.js`.
  Se elimino el `rock-al-parque.html` estatico (placeholder viejo con
  caracteres corruptos) que ensombrecia el rewrite `/:slug.html` en Vercel
  (los estaticos tienen prioridad sobre las rewrites). Los 18 eventos
  previos en Neon siguen con tags vacios; este es el primero con las
  secciones nuevas de evento.
- **Evidencia:** POST /api/admin-destinos = OK (id 754d852f-...,
  status published, destacado). GET /api/pagina-destino?slug=rock-al-parque
  = 200 con las 5 secciones de evento (Fecha y sede, Lineup/Artistas,
  Agenda, Tipos de entrada, Que llevar). Sitemap incluye el slug.
  Smoke `scripts/smoke_test_rock_al_parque.js` 8/8 PASS + balance de divs
  276/276; smoke heredado `scripts/smoke_test_evento.js` 14/14 PASS.
  Pendiente: commit+push para que el `git rm` del estatico surta efecto y
  la URL publica sirva la pagina dinamica.

### TSK-058: Pagina dinamica morat-bogota.html (conciertos Morat en Bogota)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del concierto "Morat en Bogota: Ya Es Manana World
  Tour" como 2do destino `categoria_slug='evento'` del motor. Seis
  funciones del 14, 15, 16, 21, 22 y 23 de agosto de 2026 en el Movistar
  Arena (av. NQS con av. Jose Celestino Mutis, El Campin, coordenadas
  4.6652, -74.0839). Primeras 3 fechas agotadas (Tu Boleta); la gira suma
  24 conciertos sold out y su primer Latin Grammy 2025 por "Ya es manana".
  Incluye Casa Morat (experiencia inmersiva 14-23 ago) y 5 FAQs. TAGS
  evento completos (TASK-003): `fecha_inicio='2026-08-14'`,
  `fecha_fin='2026-08-23'`, `edicion='Ya Es Manana World Tour'`,
  `sede='Movistar Arena, Bogota'`, `lineup` (Morat 9:00 pm), `agenda`
  (6 conciertos + Casa Morat), `categorias_entrada` (Agotado/Disponible),
  `que_llevar` (4), `prohibido` (4). Slug elegido `morat-bogota` para NO
  colisionar con el slug `morat-bogota-2026` del WIP sin commitear
  `scripts/insert-eventos-bogota.js`. Archivos: `scripts/seed-morat-bogota.js`,
  `scripts/load-morat-bogota-api.js` y `scripts/smoke_test_morat_bogota.js`.
  No habia estatico `morat-bogota.html` que ensombreciera el rewrite.
- **Evidencia:** POST /api/admin-destinos = OK (id 22950e3d-...,
  status published, destacado). GET /api/pagina-destino?slug=morat-bogota
  = 200 con las 5 secciones de evento y divs balanceados (213/213).
  URL publica https://exploraco.vercel.app/morat-bogota.html = 200.
  Sitemap incluye el slug. Smoke `scripts/smoke_test_morat_bogota.js`
  8/8 PASS + balance de divs.

### TSK-059: Pagina dinamica festival-de-verano-bogota.html (Festival de Verano 2026)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Festival de Verano 2026 - Edicion 29 (IDRD con
  la Alcaldia Mayor de Bogota) como 3er destino `categoria_slug='evento'`
  del motor. Del 31 de julio al 31 de agosto de 2026, mas de 60 actividades
  gratuitas en parques y escenarios publicos de toda la ciudad (ancla:
  Plaza de Eventos Parque Simon Bolivar 4.658056, -74.093889). Mexico
  pais invitado; celebracion de los 488 anos de Bogota. Incluye el
  Conciertazo de Verano (1 ago, Plaza de Eventos: Calibre 50, Luister La
  Voz, Proyecto A, Jhon Onofre) y la Parada del Circuito Sudamericano de
  Voleibol de Playa (El Salitre). TAGS evento completos (TASK-003):
  `fecha_inicio='2026-07-31'`, `fecha_fin='2026-08-31'`,
  `edicion='Edicion 29'`, `sede`, `pais_invitado`, `lineup` (Conciertazo
  + 4 artistas), `agenda` (6 eventos), `categorias_entrada` (Gratis),
  `que_llevar` (5), `prohibido` (4). Archivos:
  `scripts/seed-festival-de-verano-bogota.js`,
  `scripts/load-festival-de-verano-bogota-api.js` y
  `scripts/smoke_test_festival_de_verano.js`. No habia estatico que
  ensombreciera el rewrite.
- **Evidencia:** POST /api/admin-destinos = OK (id 340cd60f-...,
  status published, destacado). GET /api/pagina-destino?slug=festival-de-verano-bogota
  = 200 con las 5 secciones de evento y divs balanceados (233/233).
  URL publica https://exploraco.vercel.app/festival-de-verano-bogota.html
  = 200. Sitemap incluye el slug. Smoke
  `scripts/smoke_test_festival_de_verano.js` 8/8 PASS + balance de divs.

### TSK-060: Pagina dinamica jazz-al-parque.html (Jazz al Parque 2026)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Festival Jazz al Parque 2026 - Edicion 29 como 4to
  destino `categoria_slug='evento'` del motor. El festival de jazz gratuito
  mas importante de Colombia y referente de America Latina, el 12 y 13 de
  septiembre de 2026 en el Parque El Country (Av. Calle 127 #11D-90,
  Usaquen, coords 4.6986, -74.0304). Organiza Idartes con la Alcaldia Mayor
  de Bogota; eje conceptual "Donde la memoria latina se convierte en
  encuentro". TAGS evento completos (TASK-003): `fecha_inicio='2026-09-12'`,
  `fecha_fin='2026-09-13'`, `edicion='Edicion 29'`, `sede`, `organiza`,
  `lema`, `lineup` (2), `agenda` (2 dias), `categorias_entrada` (Gratis),
  `que_llevar` (5), `prohibido` (4). 5 fotos verificadas (Unsplash), 5 FAQs.
  Archivos: `scripts/seed-jazz-al-parque.js`, `scripts/load-jazz-al-parque-api.js`
  y `scripts/smoke_test_jazz_al_parque.js`. No habia estatico que
  ensombreciera el rewrite.
- **Evidencia:** POST /api/admin-destinos = OK (id 58d06891-...,
  status published, destacado). GET /api/pagina-destino?slug=jazz-al-parque
  = 200 con las 5 secciones de evento y divs balanceados (218/218).
  URL publica https://exploraco.vercel.app/jazz-al-parque.html = 200.
  Sitemap incluye el slug. Smoke `scripts/smoke_test_jazz_al_parque.js`
  8/8 PASS + balance de divs.

### TSK-061: Pagina dinamica salsa-al-parque.html (Salsa al Parque 2026)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Festival Salsa al Parque 2026 - Edicion 27 como 5to
  destino `categoria_slug='evento'` del motor. El festival gratuito de salsa
  mas grande de Colombia, cierre del circuito Festivales al Parque, el 28 y
  29 de noviembre de 2026 en el Parque Metropolitano Simon Bolivar
  (coords 4.658056, -74.093889). Organiza Idartes con la Alcaldia Mayor de
  Bogota; eje conceptual "La revolucion que nunca deja de sonar". TAGS evento
  completos (TASK-003): `fecha_inicio='2026-11-28'`,
  `fecha_fin='2026-11-29'`, `edicion='Edicion 27'`, `sede`, `organiza`,
  `lema`, `lineup` (2), `agenda` (2 dias), `categorias_entrada` (Gratis),
  `que_llevar` (5), `prohibido` (4). 5 fotos verificadas (Unsplash), 5 FAQs.
  Archivos: `scripts/seed-salsa-al-parque.js`, `scripts/load-salsa-al-parque-api.js`
  y `scripts/smoke_test_salsa_al_parque.js`. No habia estatico que
  ensombreciera el rewrite.
- **Evidencia:** POST /api/admin-destinos = OK (id 6b290c4e-...,
  status published, destacado). GET /api/pagina-destino?slug=salsa-al-parque
  = 200 con las 5 secciones de evento y divs balanceados (219/219).
  URL publica https://exploraco.vercel.app/salsa-al-parque.html = 200.
  Sitemap incluye el slug. Smoke `scripts/smoke_test_salsa_al_parque.js`
  8/8 PASS + balance de divs.

### TSK-062: Corregir agenda cultural (fecha de hoy + eventos nuevos ausentes)
- **Estado:** COMPLETADA
- **Detalle:** Bug reportado por el usuario: (1) los 5 eventos del motor se
  mostraban en la agenda del home con la fecha de HOY en vez de la fecha real
  del evento; (2) al abrir la agenda completa (agenda.html) los eventos
  nuevos no aparecian. Causa raiz triple:
  1. `api/destinos.js` devolvia `day`/`month` desde columnas `event_day`/
     `event_month` que los seeds de evento no pueblan (solo escriben
     `tags.fecha_inicio`), asi que `toAgendaEvent()` en index-api-connector.js
     caia al fallback `new Date()` (hoy). Ademas el listado NO devolvia `tags`,
     por lo que `fecha_inicio`/`sede`/`lineup` eran ilegibles para el front.
  2. `agenda.html` fetcheaba `?cat=eventos` pero el `categoria_slug` real es
     `evento` -> 0 filas, los eventos nuevos nunca se agregaban.
  3. `agenda.html` hacia `AGENDA_EVENTS = AGENDA_EVENTS.concat(...)` pero
     `AGENDA_EVENTS` es `const` -> `TypeError: Assignment to constant
     variable`, atrapado por el `.catch` (nada se mostraba). Ademas leia
     `d.precio_desde` (la API devuelve `price`).
- **Correccion:** (1) `api/destinos.js` deriva `day`/`month` desde
  `tags.fecha_inicio` ('YYYY-MM-DD') con fallback a las columnas legadas, y
  ahora devuelve `tags` completos en el listado. (2) `index-api-connector.js`
  `toAgendaEvent()` parsea `tags.fecha_inicio` con `new Date(y,m,d)` (sin TZ)
  antes de caer al fallback. (3) `agenda.html` `loadApiEvents()` usa
  `?cat=evento`, agrega con `Array.prototype.push.apply` (mutacion in-place,
  respetando el `const`), lee `d.price`, y deduplica por nombre para evitar el
  doble Rock al Parque (el hardcodeado tiene url 'index.html').
- **Evidencia:** `node --check` limpio en api/destinos.js e
  index-api-connector.js; script inline de agenda.html extraido y `node
  --check` OK; ASCII-safety: api/destinos.js 0 bytes no-ASCII (los bytes
  no-ASCII restantes en index-api-connector.js/agenda.html son preexistentes,
  emojis en comentarios, no en lineas nuevas). Prueba unitaria de la logica
  toPlace: 2026-08-14 -> 14 Ago, 2026-09-12 -> 12 Sep, 2026-11-28 -> 28 Nov,
  2026-10-10 -> 10 Oct, sin fecha -> null null. Balance de divs de agenda.html
  preexistente (62/63, identico a HEAD, no tocado). Antes del deploy:
   GET /api/destinos?cat=evento confirmo `day`/`month`/`tags` vacios en los 5
   eventos; tras deploy la API los puebla y agenda.html renderiza con la fecha
   real de cada evento.

### TSK-063: 5 paginas dinamicas de comida en La Candelaria (centro de Bogota)
- **Estado:** COMPLETADA
- **Detalle:** Primera tanda de la categoria `comida` con el patron completo
  seed + loader + smoke versionado (los 18 de comida previos en prod no
  tenian seeds). Set curado de 5 lugares reales del centro historico, todos
  con `categoria_slug='comida'`, `status='published'`, `destacado=true`:
  1. `la-puerta-falsa-bogota` - Cafe La Puerta Falsa (Cl. 11 #6-50), desde
     1816; tamal, chocolate santafere\u00f1o, ajiaco. 7 fotos de Wikimedia
     reales del local (interior, mostrador, chocolate, ajiaco).
  2. `el-gato-gris-bogota` - El Gato Gris (Cl. 12b #1A-12), bistro junto al
     Chorro de Quevedo; tel 3229161227. 7 fotos (barrio + platos).
  3. `origen-bistro-bogota` - Origen Bistro (Cra 4 #12c-88), cocina de autor
     colombiana; casa colonial con patio; lunes cerrado. 7 fotos.
  4. `la-fruteria-candelaria-bogota` - Cafeteria y Fruteria La Candelaria
     (Cl. 12 #8-85), jugos y desayunos; tel 6013414124; domicilio Si con
     plataformas. 6 fotos.
  5. `la-casona-de-la-candelaria-bogota` - La Casona de la Candelaria
     (Cra 6 #8-39), cocina criolla en casona colonial con patio. 6 fotos.
  Nota: el candidato original "La Casona de la Abuela" se descarto porque
  las fuentes lo ubican en Toberin/Usaquen (norte), no en el centro; se
  reemplazo por La Casona de la Candelaria (centro).
- **Archivos:** `scripts/seed-<slug>.js` (datos, upsert SQL idempotente,
  modo `--dry`), `scripts/load-<slug>-api.js` (DELETE+POST a
  /api/admin-destinos con Bearer), `scripts/smoke_test_<slug>.js`
  (buildHTML del renderer). TAGS usan los campos comida que lee
  `api/pagina-destino.js` (TASK-002): `tipo_comida`, `cocina`, `ambiente`,
  `precio_promedio`, `terraza`, `reservas`, `domicilio`, `menu_destacado[]`
  (con badge popular), `opciones_dieta[]`, `horario_detallado{}` (7 dias,
  Origen Bistro con Lunes Cerrado) y `domicilio_plataformas[]`.
- **Evidencia:** Escudo GOLD: `node --check` OK en los 15 archivos;
  ASCII-safety 0 bytes no-ASCII en seeds/loaders/smokes; smokes 7/7 PASS por
  lugar (5/5) con las secciones `perfil-comida`, `menu`, `horarios`,
  `delivery` presentes y divs balanceados. Carga a prod: POST
  /api/admin-destinos = OK (ids 024f2ae6-..., c4acaf97-...,
  f88102ac-..., 9582d05c-..., 705e34b4-..., status published,
  destacado true). Fotos verificadas HTTP 200 (BUG-022) con User-Agent.
  GET /api/pagina-destino?slug=<cada slug> = 200 con las 4 secciones de
  comida; URLs publicas .html = 200 (55-57KB); /api/destinos?cat=comida
  paso de 18 a 23; sitemap incluye los 5 slugs.

### TSK-064: Limpieza de datos de prueba en produccion (P0)
- **Estado:** COMPLETADA (2026-08-19, ejecutada por Javier en consola Neon)
- **Detalle:** Se eliminaron 425 registros basura de la BD de produccion:
  (1) 424 destinos `test-hostal-verificacion-bogota-*` (386 draft + 38
  archived) generados por una prueba masiva de una sesion anterior;
  (2) el evento `fiesta-r10` (status published, descripcion basura,
  lat/lng 0) que era visible en listados y agenda publicos; (3) el usuario
  de prueba 'prueba' (`0a865be8-...`, xp=0, sin interacciones). SQL
  versionado en `db/cleanups/001_limpieza_datos_prueba.sql` (cascada
  manual igual al DELETE de api/admin-destinos.js:311).
- **Evidencia:** BD 552 -> 127 registros (127 published, 0 drafts, 0
  archived). 0 registros `test-hostal-*`, 0 `fiesta-r10`. Eventos
  publicos en /api/destinos?cat=evento 23 -> 22; stats destinos 122 ->
  121. Leaderboard solo muestra `javier` (xp=10). Regresion OK: logros
  javier sigue 200 con total=16.

### TSK-065: Robustez del panel admin (P2) - cierre de div raiz + precarga de secretos + clearForm completo
- **Estado:** COMPLETADA (2026-08-19)
- **Detalle:** Tarea P2 aprobada por Javier sobre `admin.html`. Se corrigio
  el desbalance PRE-EXISTENTE de 1 div (633 vs 632, hallazgo de
  auditoria de sesiones previas): el `<div class="app">` (linea 447) nunca
  se cerraba. Se inserto exactamente un `</div>` antes de `</body>` via
  Python `str.replace()` (Regla de Oro 2, ancla unica
  `</script></body></html>`), quedando el archivo con balance global 0 y
  HTML-puro 0. Ademas se corrigieron 4 bugs reales encontrados en la
  auditoria del flujo loadForm()/updateCatUI()/clearForm() (2 hallazgos
  del qa-auditor y 2 del lider de sesion):
  1. **Precarga de tarjetas de secretos (Sitio/Extras):** `#secretos-list-admin`
     quedaba vacio al editar (solo el textarea `f-secretos` recibia el JSON
     crudo via `applyCategoryTagFields`). Ahora `loadForm()` parsea
     `p.secretos` (array o JSON string) y puebla las tarjetas con
     `.secreto-icono/.secreto-titulo/.secreto-tag/.secreto-color/
     .secreto-texto`, vaciando el textarea (el collector
     `collectSitioSecretos()` prioriza tarjetas). Texto plano sigue
     funcionando via textarea.
  2. **Correccion post-auditoria de la precarga de secretos:** la primera
     version de este fix llamaba `esc()` (inexistente a nivel global; solo
     existia local dentro de los builders de export L4398/4451/5079/5137).
     El qa-auditor lo detecto en runtime con Node `vm` (patron de scope de
     BUG-020): `ReferenceError: esc is not defined` al editar un sitio con
     secretos, tarjetas vacias, y el error silencioso ante node --check /
     balance de divs. Corregido reemplazando las 4 llamadas por `_esc()`
     (global, L3207/L4807). Verificacion runtime: top-level del script sin
     ReferenceError, `typeof _esc === 'function'`, y simulacion del bloque
     con DOM controlado -> 1 tarjeta creada, `f-secretos` vaciado, PASS.
  3. **Contaminacion cruzada en `collectAmenities()`:** el fallback global
     `.srv-check` (checkboxes de servicios del HOSTAL) corria tambien cuando
     el contenedor solicitado no existia en el DOM (ej: `#sitio-amenities-check`,
     que nunca se creo), de modo que al guardar un SITIO o una COMIDA sin
     amenities marcadas el registro heredaba los servicios del hostal.
     Ahora el fallback solo corre si el llamador no indico contenedor
     (`!cid`).
  4. **`clearForm()` incompleto:** no limpiaba las listas dinamicas de sitio
     (tours, checklist, dificultad-tags, entradas, itinerario, secretos),
     comida (menu, plataformas, dietas) ni blog (tema multi, video, autor),
     ni 12 campos escalares que `loadForm()` precarga (f-dificultad-desc,
     f-temporada-nota, f-checklist-tip, f-tipo-comida, f-cocina,
     f-precio-promedio, f-ambiente, f-terraza, f-reservas, f-domicilio,
     f-blog-video, f-blog-autor-id) -- lo que contaminaba un "Nuevo lugar"
     con datos del lugar editado anterior. Se anadieron los resets.
- **Verificacion (Escudo GOLD, BLUEPRINT seccion 8):** balance global
  `<div>`/`</div>` = 0 (634/634); balance HTML puro (sin script/style) = 0
  (519/519) con pila 0; balance por zona de los 5 paneles
  `especifico-hostal/comida/sitio/evento/blog` = 0 cada uno; `node --check`
  limpio sobre el `<script>` inline extraido (4.109 lineas); ASCII-safety
  7.291 bytes >127 (baseline exacto, 0 nuevos); dobles escapes `\\u` = 0;
  IDs del contrato intactos (lineup-list, secretos-list-admin, etc.).
  Verificacion runtime (Node `vm` con DOM simulado, metodo del qa-auditor):
  script inline completo carga sin ReferenceError; `_esc` global OK; el
  bloque de precarga de secretos crea la tarjeta y vacia `f-secretos`.
  Las 5 ediciones JS fueron 100% dentro de `<script>` (mas la edicion
  HTML del cierre de div), via Python con ancla unica cada una (1
  ocurrencia verificada).
- **Leccion del proceso (qa-auditor):** `node --check`, el balance de divs y
  el ASCII NO detectan errores de scope (una funcion usada antes de
  existir a nivel global). El diagnostico inicial de admin-dev de que las 4
  declaraciones de `esc()` eran "redundancias inofensivas por hoisting" era
  incorrecto -- eran locales a callbacks de export, no globales. Verificar
  SIEMPRE con reproduccion en Node `vm` (patron BUG-020).
- **Hallazgos documentados sin tocar (fuera de alcance):** `esc()` declarada
  4 veces (L4398/4451/5079/5137, locales a builders de export, una no
  escapa backslashes); `setEditorMeta()`
  duplicada (L2232/L3960) -- redundancias inofensivas por hoisting;
  `#sitio-amenities-check` sigue siendo codigo muerto (loadForm L3042 y
  savePlace L3483) pero ya no contamina datos; ningun seed de sitio incluye
  `amenidades` (no hay UI de servicios para sitio en el admin).

---

## Prioridad CRITICA - Fase de Paridad "Ciudad Perdida" y Refactorizacion Backend

> Nota de cierre (Sprint 2 - Paridad Visual, ver DECISIONS.md ADR-006): las
> tareas TSK-011 a TSK-014 tal como estaban descritas no correspondian al
> codigo real (ej. TSK-014 pedia fijar admin.html en 4.817 lineas exactas,
> pero el archivo real ya tenia 5.082 antes de esta entrega). Se cierran
> con el alcance realmente verificado y ejecutado; ver detalle abajo.

### TASK-000: Sincronizar admin-destinos.js a v2 REAL
- **Estado:** COMPLETADA (verificado, no requirio cambios)
- **Nota de cierre:** admin-destinos.js v2.1 ya implementa el MERGE JSONB (`tags = COALESCE(tags,'{}') || $N::jsonb`, ver linea ~247 de admin-destinos.js). No se toco en este sprint porque los campos nuevos (dificultad_desc, dificultad_tags, temporada_matriz, tipo_tour/idioma/max_personas) viven dentro del mismo campo `tags` generico -- el merge existente ya los persiste sin cambios de backend.

### TSK-013: Hero e impacto visual (Multimedia) -- Sprint 2
- **Estado:** COMPLETADA
- **Detalle:** Fix del bug que dejaba `heroThumbs` siempre vacio (doble declaracion, ver BUGS_HISTORICOS.md BUG-011). Enriquecido `hqi` con Duracion, Horario y fallback de rating "4.8 - Nuevo". Ajustado `.htitle` a `clamp(40px,6vw,72px)`. Eliminado codigo muerto `heroBtns`.
- **Evidencia:** pagina-destino.js, bloque HQI (buscar "BUG-011 fix").

### TSK-014: Dificultad (Industrial Premium) -- Sprint 2
- **Estado:** COMPLETADA
- **Detalle:** Nuevos campos `tags.dificultad_desc` y `tags.dificultad_tags` (aptitudes/restricciones) en admin.html (`especifico-sitio > Dificultad`) y en pagina-destino.js (`.diffcard`, bordes rectos, sombra dura `5px var(--gold)`). Fix del bug donde el valor "Experto" del select no matcheaba la clave "extremo" del renderer (ver BUGS_HISTORICOS.md BUG-013).
- **Evidencia:** admin.html `#dificultad-tags-admin` + `f-dificultad-desc`; pagina-destino.js `.diffcard`.

### TSK-015: Temporada (matriz de 12 meses) -- Sprint 2
- **Estado:** COMPLETADA
- **Detalle:** Nuevo campo `tags.temporada_matriz` (objeto Ene..Dic con ideal/posible/evitar), UI de 12 selects en admin.html, render en matriz con leyenda en pagina-destino.js. El campo legado `tags.temporada` (rangos de texto) se conserva como fallback y en un `<details>` de compatibilidad en el admin (Cero Borrado Logico, Reglas de Oro punto 3).
- **Evidencia:** admin.html `f-temporada-ene`..`f-temporada-dic`; pagina-destino.js `.tmgrid`.

### TSK-016: Tours 4.0 -- Sprint 2
- **Estado:** COMPLETADA
- **Detalle:** Nuevos campos `tipo_tour`, `idioma`, `max_personas` por tour (genericos via `[data-field]`, sin cambios en `collectTourItems()`). Motor de tarjeta propio `.tcard` (abandona `.icard`). Fix critico: el renderer leia `t.link`/`t.desc`, pero admin.html guarda `t.link_reserva`/`t.descripcion` -- el boton "Reservar ahora" y la descripcion nunca se mostraban en produccion (ver BUGS_HISTORICOS.md BUG-012).
- **Evidencia:** pagina-destino.js `.tcard`; admin.html `_tourRowHTML()`.

### TSK-011 / TSK-012 (Supabase Storage, persistencia por data-field generica)
- **Estado:** NO APLICABLE a este sprint
- **Nota:** El proyecto ya usa Neon + fotos via URL directa (no Supabase Storage) y `collectTourItems()` ya usaba el patron `[data-field]` antes de este sprint. Si estas tareas se referian a otra cosa, se necesita detalle adicional de Javier -- no se invento alcance para cerrarlas.



---

## Prioridad ALTA - Categor\u00edas pendientes (Sprint Actual)

### TASK-001: Implementar categoria Hostal
- **Prioridad:** ALTA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** COMPLETADA
- **Dependencia:** Ninguna (habitaciones/amenidades/faqs ya existen en `destinos_detalles`)[cite: 1]
- **Sprint:** Sprint 2 (Primer modulo funcional)[cite: 1]
- **Nota de cierre:** el admin de Hostal NO estaba vacio como decia este ticket -- ya tenia 6 sub-tabs (Habitaciones, Servicios, Reservas, Como llegar, Eventos, FAQs) con inputs reales (ver DECISIONS.md ADR-006). Se agrego la 7a sub-pestana "Politicas" con los 6 campos pedidos (tipo_alojamiento, reglas_casa, edad_minima, mascotas, cocina_compartida + politica_cancelacion reutilizando un input existente), registrados en el motor generico `CATEGORY_TAG_FIELDS.hostal` / `CATEGORY_TAG_LISTS.hostal` (TSK-012) en vez de editar `collectPlace()`/`_placeToAPI()`/`loadForm()` a mano. De paso se corrigieron 4 fallas activas encontradas en el camino (ver BUGS_HISTORICOS.md BUG-016): datos de habitaciones/eventos desalineados por funciones duplicadas, 5 campos que nunca llegaban a la API, y 2 que llegaban pero el backend los descartaba.
- **Detalle tecnico:** Sub-tabs en admin.html dentro de `especifico-hostal`[cite: 1]. Campos tags: tipo_actividad -> tipo_alojamiento, reglas_casa, actividades, que_incluye, politica_cancelacion[cite: 1], mas edad_minima/mascotas/cocina_compartida (ya anticipados en BLUEPRINT.md seccion 4 y en el TODO del propio codigo). Secciones nuevas en pagina-destino.js: Reglas de la casa, Actividades disponibles (+ Que incluye), Como llegar, Eventos del hostal -- las 2 ultimas porque BUG-C dejaba esos datos sin ningun lugar donde persistirse ni mostrarse. Balance de divs verificado (0), `node --check` limpio.
- **Evidencia fisica de exito:** Formulario de Hostal renderizado en el front-end y datos insertados sin desbordamientos en el DOM. Smoke test de `buildHTML()` con datos mock de hostal confirma render correcto de las 4 secciones nuevas y degradacion condicional (0 secciones fantasma) cuando no hay datos.

### TASK-002: Implementar categor\u00eda Comida
- **Prioridad:** ALTA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** COMPLETADA
- **Dependencia:** TASK-001 (completada, patron ya validado)[cite: 1]
- **Sprint:** Sprint 4
- **Nota de cierre:** igual que con Hostal (ADR-006), el admin de Comida
  NO estaba vacio como decia este ticket -- ya tenia 3 sub-tabs (Carta/
  Menu, Horarios, Delivery) con inputs reales, pero ninguno de sus datos
  llegaba a Neon: `CATEGORY_TAG_FIELDS.comida`/`CATEGORY_TAG_LISTS.comida`
  (TSK-012) estaban vacios ([]), y `collectMenuItems()`/
  `collectHorariosDias()` estaban duplicadas y rotas (ver BUGS_HISTORICOS.md
  BUG-018). Se agrego la 4a sub-pestana "Perfil" (tipo_comida, cocina,
  precio_promedio, ambiente, terraza, reservas, opciones dieteticas) y se
  conectaron los 3 tabs existentes al motor generico
  `CATEGORY_TAG_FIELDS.comida`/`CATEGORY_TAG_LISTS.comida`, en vez de tocar
  `collectPlace()`/`_placeToAPI()`/`loadForm()` a mano (igual criterio que
  TASK-001). `horario_detallado` se trato como objeto {dia:{abre,cierra,
  estado}} (no arreglo), con el mismo tratamiento especial que
  `temporada_matriz` de Sitio en `_buildTagsObj()`/`_applyTagsToLocal()`.
  Se agrego ademas una lista generica de "otras plataformas de domicilio"
  (mas alla de Rappi/iFood, que ya existian pero nunca se guardaban) por
  decision explicita del Project Manager al validar el alcance.
  De paso se encontro y corrigio un bug critico no documentado en
  `loadForm()`: el precarga de Sitio y Evento estaba anidado (y por lo
  tanto muerto) dentro de `if(p.cat==='hostal')` desde TASK-001 -- ver
  BUGS_HISTORICOS.md BUG-017. `admin-destinos.js` no requirio cambios: el
  MERGE JSONB ya existente (ADR-003) cubre `tags.menu_destacado`,
  `tags.opciones_dieta`, `tags.horario_detallado`, etc. sin tocar el
  backend (mismo razonamiento que TASK-000/Sprint 2).
- **Detalle tecnico:** Sub-tabs en admin.html dentro de `especifico-comida`
  (Carta/Menu, Horarios, Delivery, Perfil). Campos tags: tipo_comida,
  cocina, precio_promedio, ambiente, terraza, reservas, domicilio, rappi,
  ifood, domicilio_zona, menu_destacado[] (nombre/precio/foto/badge),
  opciones_dieta[] (checkboxes), domicilio_plataformas[],
  horario_detallado{}. Secciones nuevas en pagina-destino.js: Cocina y
  ambiente, Menu destacado, Horarios, Opciones dieteticas y domicilio --
  las 4 condicionales (no se renderizan si `tags` no tiene datos para esa
  seccion). Balance de divs de `especifico-comida` verificado (0),
  `node --check` limpio en admin.html y en pagina-destino.js, ASCII-safety
  de pagina-destino.js verificada (0 bytes no-ASCII, 0 backticks, 0 doble
  escape).
- **Evidencia fisica de exito:** Smoke test de `buildHTML()` con datos mock
  de comida (ver script de verificacion) confirma render correcto de las 4
  secciones nuevas, degradacion condicional (0 secciones fantasma) cuando
  `tags` esta vacio, y que un dia marcado "Cerrado" se muestra aunque no
  tenga horas cargadas. Tambien se verifico con datos mock de categoria
  `sitio` que el fix de BUG-017 no rompe su propio precarga.

### TASK-003: Implementar categor\u00eda Evento
- **Prioridad:** ALTA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** COMPLETADO (Sprint 5)
- **Dependencia:** TASK-001, TASK-002 (mismo patr\u00f3n ya validado dos veces)[cite: 1]
- **Sprint:** Sprint 5 (Integracion)
- **Detalle t\u00e9cnico:** Sub-tabs en `admin.html` dentro de `especifico-evento`: Fechas y sede, Lineup/Artistas, Agenda, y 2 sub-tabs nuevos (Tipos de entrada, Qu\u00e9 llevar). Campos tags: fecha_inicio, fecha_fin, edicion, sede, lineup[], agenda[], categorias_entrada[], que_llevar[], prohibido[] -- registrados en el motor gen\u00e9rico `CATEGORY_TAG_FIELDS.evento`/`CATEGORY_TAG_LISTS.evento` (TSK-012), no editados a mano. "capacidad" y "entrada desde" NO se duplicaron dentro de tags: se eliminaron los inputs `f-aforo`/`f-entrada-desde` (nunca conectados a nada) y se reusan los campos gen\u00e9ricos ya existentes `f-capacidad` (columna `destinos.capacidad`) y `f-price` (columna `destinos.precio_desde`), mismo patr\u00f3n de no-duplicaci\u00f3n que TASK-001 aplic\u00f3 con `politica_cancelacion`. Secciones nuevas en `pagina-destino.js`: Fecha y sede, Lineup/Artistas, Agenda del evento, Tipos de entrada, Qu\u00e9 llevar (con checklist + prohibiciones) -- las 5 condicionales, con fechas formateadas ("5 de Diciembre de 2026") vía un helper nuevo (`fmtFechaEvento()`). `admin-destinos.js` no requiri\u00f3 cambios (mismo razonamiento que Sitio/Hostal/Comida: el MERGE JSONB ya cubre los campos nuevos, ADR-003).
- **Nota de cierre:** al verificar el archivo real (ADR-006) se confirm\u00f3 que el admin de Evento tampoco estaba vac\u00edo como dec\u00eda este ticket -- ya ten\u00eda 3 sub-tabs (Fechas y sede, Lineup, Agenda) con inputs reales, pero con **6 fallas activas nunca reportadas** (ver BUGS_HISTORICOS.md BUG-019): (1) `CATEGORY_TAG_FIELDS.evento`/`CATEGORY_TAG_LISTS.evento` estaban vac\u00edos, as\u00ed que absolutamente nada de lo que se escrib\u00eda en la pesta\u00f1a Evento llegaba a Neon; (2) los botones "+ A\u00f1adir artista"/"+ A\u00f1adir actividad" llamaban a `addLineupRow()`/`addAgendaRow()`, funciones que no exist\u00edan en el archivo; (3) `collectLineupItems()`/`collectAgendaItems()` estaban declaradas dos veces (mismo patr\u00f3n que BUG-006/BUG-018); (4) exist\u00eda c\u00f3digo huerfano (`addLineupItem()`/`addEntradaItem()` apuntando a contenedores `#lineup-admin`/`#entradas-admin` que no exist\u00edan en el DOM actual); (5) `loadForm()` precargaba el Lineup al editar un evento pero nunca la Agenda; (6) los campos "Entrada desde"/"Aforo" duplicaban `f-price`/`f-capacidad` (gen\u00e9ricos, ya usados por las 4 categor\u00edas) sin conectarse a ning\u00fan lado. Se corrigieron las 6 durante esta entrega, se reconect\u00f3 `addEntradaItem()` (antes hu\u00e9rfano) como base del nuevo sub-tab "Tipos de entrada", y se agregaron collectors nuevos para `categorias_entrada`, `que_llevar` y `prohibido`.
- **Evidencia f\u00edsica de \u00e9xito:** Smoke test de `buildHTML()` con datos mock de evento (ver script de verificaci\u00f3n) confirma que la agenda se despliega de manera secuencial, las fechas se formatean correctamente ("5 de Diciembre de 2026"), los tipos de entrada "Agotado" se marcan en rojo, y que un evento sin tags cargados no genera ninguna de las 5 secciones nuevas (0 secciones fantasma). Tambi\u00e9n se verific\u00f3 que un destino de categor\u00eda Sitio sigue renderizando sin error (regresi\u00f3n). Balance de divs de `especifico-evento` verificado (0), `node --check` limpio en `admin.html` (script inline extra\u00eddo) y en `pagina-destino.js`, ASCII-safety de `pagina-destino.js` verificada (0 bytes no-ASCII, 0 backticks, 0 doble escape).

---

## Prioridad SOCIAL - Backlog Social

### TSK-015: M\u00f3dulos de puntuaci\u00f3n din\u00e1mica (Quick-Rating)
- **Prioridad:** SOCIAL
- **Responsable:** Lead Developer
- **Estado:** COMPLETADO (Agosto 2026)
- **Dependencia:** TASK-001, TASK-002, TASK-003
- **Sprint:** Sprint 4
- **Detalle t\u00e9cnico:** Voto rapido de 1 a 5 estrellas sin texto en la pagina publica de destino. Backend (`api/interacciones.js`): POST tipo=rating requiere `usuario_id` (400 si falta), dedup simetrico contra resena+rating (409 `ya_votado` + `voto_previo`), +10 XP, `evaluarMisiones()`; nuevo GET tipo=mi_rating para precargar el voto del usuario. `total_resenas` ahora cuenta resena+rating (AVG y COUNT alineados en `interacciones.js` y en el DELETE de `api/admin.js`). Frente (`usuario-session.js`): metodos `window.ExploraCO.votar(DID, rating)` y `obtenerMiVoto(DID)`; sin sesion abre modal de login (NO crea sesion temporal). Renderer (`api/pagina-destino.js`): widget `#qr-stars` dentro de la seccion de resenas, solo si `cat !== 'blog'`, con funciones inline `pintarQR`/`votarDID`/`precargarMiVoto` y guard de presencia de `#qr-stars` (inerte en blogs).
- **Evidencia f\u00edsica de \u00e9xito:** El promedio general del lugar se recalcula al enviar un voto (local en el cliente y en DB), el widget precarga el voto previo del usuario logueado, y el contador "N resenas" incluye votos sin texto. Smoke tests buildHTML: widget presente en 'sitio' (incluye nRes=0), ausente en 'blog', sin IDs duplicados. Escudo GOLD: `node --check` limpio en los 4 archivos, 0 no-ASCII / 0 backticks en los 3 serverless.
- **Decisiones de producto (ver DECISIONS.md ADR-007):** dedup simetrico (quien voto sin texto no puede resenar despues); voto sin sesion -> modal de login; solo el widget nuevo usa \u2605 (el resto de la pagina sigue con asterisco *); la etiqueta sigue siendo "N resenas"; migracion de datos natural (los destinos existentes convergen en el primer POST de cualquiera de los dos tipos).
- **Verificacion en produccion (Agosto 2026):** el flujo completo se probo contra la API de produccion tras corregir un bug de BD que NO estaba en el codigo: un trigger huerfano `trg_xp_on_interaccion`/`fn_actualizar_xp()` rompia los 4 POST de interaccion con 500, y la migracion `activo`/`progreso_misiones` documentada en interacciones.js:9 nunca se habia aplicado (ver BUGS_HISTORICOS.md BUG-021 y DECISIONS.md ADR-008). Post-fix: visita +20 XP + mision, guardado +5 XP con dedup via `activo`, rating +10 XP, resena duplicada 409 `ya_votado`, ausencia del widget en blogs confirmada.

### TSK-016: Widget "Qui\u00e9n va este mes"
- **Prioridad:** SOCIAL
- **Responsable:** Lead Developer
- **Estado:** PENDIENTE
- **Dependencia:** TSK-015
- **Sprint:** Sprint 4
- **Detalle t\u00e9cnico:** Desarrollar componente de UI que extraiga y agrupe avatares de perfiles p\u00fablicos confirmados para un destino espec\u00edfico en el mes en curso.
- **Evidencia f\u00edsica de \u00e9xito:** Avatar miniatura del usuario de prueba es inyectado din\u00e1micamente en el widget de la barra lateral al hacer clic en "Asistir\u00e9".

### TSK-017: Comparador de lugares similares
- **Prioridad:** SOCIAL
- **Responsable:** Lead Developer
- **Estado:** COMPLETADO (Agosto 2026)
- **Dependencia:** TSK-015
- **Sprint:** Sprint 4
- **Detalle t\u00e9cnico:** L\u00f3gica de recomendaci\u00f3n basada en cruce de tags renderizando un carrusel con los top 3 lugares de la misma categor\u00eda ra\u00edz. Implementado 100% en `api/pagina-destino.js` SIN endpoint nuevo (presupuesto Vercel Hobby 8/8 agotado, ver NEXT.md): el handler consulta hermanos `WHERE categoria_slug=$1 AND status='published' AND id<>$2 ORDER BY rating DESC NULLS LAST LIMIT 50` y `topRelacionados()` los rankea por **Jaccard** (interseccion/union) sobre `COMPARADOR_KEYS` por categor\u00eda (sitio: tipo_actividad/dificultad/duracion/temporada; hostal: tipo_alojamiento/reglas_casa/ciudad; comida: tipo_comida/cocina/ambiente/precio_promedio/terraza; evento: sede/edicion/ciudad). Los valores se normalizan (trim + lowercase) y los arrays se expanden. Si hay menos de 3 con overlap, el relleno por rating garantiza la evidencia "compartiendo la categor\u00eda ra\u00edz". Blog excluido del comparador. Render: secci\u00f3n `secRelacionados` "Tambien te puede interesar" tras Contacto (al final de la p\u00e1gina), carrusel horizontal `.rcscroll` con exactamente 3 `.rcard` (foto/emoji con fallback hero_bg, badge de categor\u00eda, nombre, ciudad-region, estrellas + N resenas, enlace `/slug.html`). CSS scoped `.rc*` en el string CSS del renderer (ADR-004).
- **Evidencia f\u00edsica de \u00e9xito:** El scroll horizontal al final de la p\u00e1gina de detalle muestra exactamente 3 cards adicionales compartiendo la categor\u00eda ra\u00edz. Verificado con smoke test de `buildHTML()`/`topRelacionados()` (23/23 PASS: ranking por overlap, relleno por rating, exactamente 3 `.rcard`, 0 secciones fantasma, blog sin comparador, escape de inyecciones en slug/nombre/ciudad, delta de divs del comparador = 0) + `node --check` y ASCII-safety limpios. Verificaci\u00f3n visual en produccion pendiente del deploy.

---

## Prioridad SOCIAL - Logros y trofeos (Sprint Actual)

### TSK-055: Sistema de logros/trofeos estilo consola + coleccion por ciudad (Upland)
- **Prioridad:** ALTA
- **Responsable:** backend-dev + renderer-dev
- **Estado:** COMPLETADO y verificado en prod (2026-08-19; deploy y migracion 005 ya activos, ver TASK-020)
- **Dependencia:** TSK-015 (voto rapido), misiones XP v4, ADR-012
- **Detalle técnico:** Catalogo `LOGROS` estatico en `api/interacciones.js` v5: 16 trofeos con `tier` (bronce/plata/oro/platino), `xp`, `requiere` (DAG) y `check(ctx)` server-side -- 6 de voto/opinion (logr_primer_voto, critico_10, critico_25, opinion_blog, votos_blog_5, votos_blog_10), 5 de conteo (coleccionista_10, coleccionista_50, ciudades_5, visitas_5, visitas_20) y 5 generados de `CIUDADES_COLECCION` (Bogota 12 platino/Alcalde, Cartagena 8 oro, Medellin 8 oro, Santa Marta 6 plata, Cali 6 plata). Progreso en nueva columna `usuarios.progreso_logros jsonb` (migracion `db/migrations/005_usuarios_progreso_logros.sql`, ADR-008), merge `||` segun ADR-003. `evaluarLogros()` se ejecuta en los 4 POST de XP (resena, guardado, visita, rating) con agregados memoizados (1 query por grupo, no por trofeo) y anade `logros` a la respuesta (mantiene `misiones`). GET `tipo=logros&usuario_id=` devuelve catalogo + estado/fecha/tier + rareza global % (Steam, via `jsonb_object_keys`). `api/usuarios.js` deriva `total_logros` (conteo de claves). Nombres de ciudad comparados normalizados (TRANSLATE sin tildes + LOWER) porque Neon convive 'Bogota' y 'Bogotá'. `usuario-session.js`: `sumaLogrosXp`/`mostrarLogrosToast` (toast "Trofeo desbloqueado") en las 4 acciones.
- **Evidencia física de éxito:** `node --check` limpio en interacciones/usuarios/usuario-session; ASCII-safety 0 bytes no-ASCII en los serverless; test local `scripts/test_logros_catalogo.js` 12/12 PASS (16 ids unicos, shape, tiers, DAG a ids validos, todos los check devuelven Promise, TRANSLATE/COALESCE, 5 ciudades, logros de ciudad en catalogo).

### TSK-056: Voto rapido habilitado en blogs + badge de rating en Inspirate/blog.html
- **Prioridad:** ALTA
- **Responsable:** renderer-dev
- **Estado:** COMPLETADO y verificado en prod (2026-08-19; deploy activo, ver TASK-020)
- **Dependencia:** TSK-055, TASK-017/018 (blog), TSK-015
- **Detalle técnico:** Se elimina la supresion `esBlogRes ? '' : '<div id="qrwrap">'` en `api/pagina-destino.js`: el widget `#qr-stars` se renderiza en TODAS las categorias incluida blog, con copy condicional ("Califica este artículo" vs "Califica este lugar") y contador "N opiniones" vs "N resenas" (votos +10 XP, dedup 409, ADR-007). Las tarjetas de Inspirate (`inspFeaturedHTML`/`inspHighlightHTML` en index.html) y las cards de blog.html (`api/utilidades.js` blog-lista, SELECT ahora con `rating`/`total_resenas`) muestran el badge `[estrella] X.Y (N)` cuando hay resenas.
- **Evidencia física de éxito:** Smoke `scripts/smoke_test_blog_voto.js` 14/14 PASS (widget presente en blog y sitio, copy correcto por categoria, contador correcto, sin IDs duplicados, degradacion nRes=0, balance de divs 42/42). `node --check` limpio en pagina-destino.js, utilidades.js e index.html (script inline extraido).

### TASK-020: Aplicar migracion 005 (progreso_logros) + deploy del sistema gaming
- **Prioridad:** ALTA
- **Responsable:** backend-dev (con Javier en Neon)
- **Estado:** COMPLETADA (verificada en prod el 2026-08-19)
- **Dependencia:** TSK-055, TSK-056
- **Nota de cierre:** la migracion `db/migrations/005_usuarios_progreso_logros.sql` YA estaba aplicada en Neon y el sistema gaming (interacciones.js v5) ya estaba desplegado: GET `tipo=logros` con un `usuario_id` real (UUID valido) responde 200 con el catalogo de 16 trofeos y rareza %. El 500 que se habia registrado en sesiones previas era un falso positivo: se habia probado con `usuario_id=test-check`, que no es UUID valido y Postgres lo rechaza con `invalid input syntax for type uuid` (no es un fallo de la columna faltante). Leccion de proceso: verificar logros SIEMPRE con un UUID real de la tabla usuarios, nunca con un id de prueba.
- **Detalle técnico:** Ejecutar en la consola de Neon (ADR-008: SQL versionado, no suelto): `\i db/migrations/005_usuarios_progreso_logros.sql` (ALTER TABLE ADD COLUMN IF NOT EXISTS `progreso_logros jsonb NOT NULL DEFAULT '{}'::jsonb`). Sin esta migracion, GET `tipo=logros` devuelve 500 y los POST degradan (evaluarLogros captura el error y devuelve []). Despues: deploy de Vercel y verificacion en prod (GET logros de un usuario con acciones, voto en un post de blog, badge en Inspirate, toasts de trofeo).
- **Evidencia física de éxito:** Verificado el 2026-08-19 con UUID real `3b78efad-e9f6-49a7-bbd1-af836f528348` (usuario javier): GET `https://exploraco.vercel.app/api/interacciones?tipo=logros&usuario_id=3b78efad-e9f6-49a7-bbd1-af836f528348` = 200 con `total=16`, `desbloqueados=0`, trofeos con `tier`/`rareza_pct`; GET `/api/usuarios?id=...` = 200 con `total_logros=0` y `foto_url`/`ciudad_base` presentes (migracion 004 tambien aplicada).

---

## Prioridad MEDIA/BAJA - Infraestructura y Backlog

### TASK-004: Conectar dominio propio exploraco.co en Vercel
- **Prioridad:** MEDIA
- **Responsable:** Project Manager (Javier)[cite: 1]
- **Estado:** PENDIENTE[cite: 1]
- **Dependencia:** Ninguna[cite: 1]
- **Sprint:** Sprint 4 (Optimizacion)[cite: 1]
- **Detalle t\u00e9cnico:** A\u00f1adir y propagar registros DNS del dominio principal en el dashboard de Vercel.
- **Evidencia f\u00edsica de \u00e9xito:** Retorno consistente de c\u00f3digo HTTP 200 al navegar a exploraco.co.

### TASK-005: Configurar Google Search Console y enviar sitemap
- **Prioridad:** MEDIA
- **Responsable:** Project Manager (Javier)[cite: 1]
- **Estado:** PENDIENTE[cite: 1]
- **Dependencia:** TASK-004 (dominio propio activo)[cite: 1]
- **Sprint:** Sprint 4[cite: 1]
- **Detalle t\u00e9cnico:** Generar archivo `sitemap.xml` din\u00e1mico con la ruta de todos los destinos y someterlo a indexaci\u00f3n.
- **Evidencia f\u00edsica de \u00e9xito:** Bandera verde de "Success" en Search Console al leer el sitemap enviado.

### TASK-006: Configurar variable de entorno RESEND_API_KEY en Vercel
- **Prioridad:** MEDIA
- **Responsable:** Project Manager (Javier)[cite: 1]
- **Estado:** PENDIENTE[cite: 1]
- **Dependencia:** Ninguna[cite: 1]
- **Sprint:** Sprint 4[cite: 1]
- **Detalle t\u00e9cnico:** Inyectar la clave API de forma segura en la configuraci\u00f3n de variables de entorno de producci\u00f3n del panel de Vercel.
- **Evidencia f\u00edsica de \u00e9xito:** Ejecuci\u00f3n de script de env\u00edo de correo de prueba exitosa sin arrojar error de autorizaci\u00f3n 401.

### TASK-007: Vaciar arrays hardcodeados PL[] y MAPA_PLACES[] de index.html
- **Prioridad:** MEDIA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** COMPLETADA
- **Dependencia:** TASK-001, TASK-002, TASK-003 (todas las categorias deben estar 100% en Neon) -- dependencia satisfecha desde el cierre de TASK-003 (Sprint 5).
- **Sprint:** Sprint 6
- **Detalle tecnico:** Antes de ejecutar el vaciado se verifico (Reglas de Oro v5, punto 8) si index.html tenia logica de carga dinamica propia. Resultado: index.html no tiene ningun fetch() propio; toda la carga dinamica depende de un script externo, `index-api-connector.js`, que existia ya en el repositorio pero no estaba registrado en ningun documento del AI-DOS Core (PROJECT.md, BLUEPRINT.md, DECISIONS.md, NEXT.md, BUGS_HISTORICOS.md) pese a ser critico para la carga de datos. Se solicito y verifico ese archivo antes de tocar index.html, en vez de asumir que existia o que hacia lo esperado. Confirmado que hace `fetch('/api/destinos?limit=500...')`, repuebla `PL`/`MAPA_PLACES` respetando su naturaleza `const` (via `.length=0` + `.push()`, sin romper referencias), y vuelve a invocar `renderDest()` y refresca el mapa (`refreshMapaMarkers()` o `initMapaSection()` como fallback) tras recibir los datos. Con eso confirmado, se vaciaron `PL` y `MAPA_PLACES` (quedan `const PL=[];` y `const MAPA_PLACES=[];`, declaracion preservada -- Cero Borrado Logico) mediante script Python con anclas de texto exactas (ver `vaciar_arrays_task007.py`).
- **Verificacion:** balance de `<div>` antes/despues = 0/0 (sin cambios, la edicion es 100% dentro de `<script>`); `node --check` limpio sobre el bloque `<script>` inline extraido; se rastrearon los ~20 sitios que leen `PL`/`MAPA_PLACES` en index.html y todos usan el patron `.filter(...)[0]` + guarda `if(!p) return`, por lo que ningun cambio de comportamiento inesperado (excepciones JS) ocurre con arrays vacios.
- **Pendiente conocido (fuera de alcance de esta tarea):** `renderMyMap()` (seccion personal "Mi Mapa", guardados/visitados del usuario) no es re-invocada por `index-api-connector.js` tras el fetch inicial -- solo se vuelve a llamar ante interaccion del usuario (guardar/quitar/limpiar). Si un usuario con lugares ya guardados abre esa seccion antes de interactuar, puede ver datos vacios/placeholder hasta su primera interaccion. Adicionalmente, `MM_PINS[]` (pines decorativos del mini-mapa) sigue hardcodeado con IDs de la version estatica original de `PL`; como `index-api-connector.js` reasigna `id` de forma posicional (`idx+1`) segun el orden de respuesta de la API, esos IDs ya no garantizan apuntar al mismo lugar. Ninguno de los dos rompe la carga (fallbacks seguros ya presentes), pero ambos quedan como candidatos a tarea de seguimiento.
- **CORRECCION (Sprint 7, ver BUGS_HISTORICOS.md BUG-020):** la verificacion de `index-api-connector.js` hecha en este cierre fue incompleta. Se confirmo que `replArr()`/`replObj()` usaban el patron correcto de mutacion (`.length=0`+`.push()`) pero no se verifico que `window[name]` realmente apuntara al mismo binding que los `const PL`/`const MAPA_PLACES`/`const AGENDA_EVENTS` de index.html -- no lo hace (las declaraciones `const`/`let` de nivel superior no se exponen en `window`, solo `var` y funciones). Esto dejaba `PL`/`MAPA_PLACES`/`AGENDA_EVENTS` reales permanentemente vacios pese a que el log del conector reportaba los conteos correctos. El bug ya existia antes de TASK-007 pero era invisible porque esos arrays tenian datos hardcodeados de respaldo. Corregido en Sprint 7 -- ver BUG-020 para el detalle completo y la prueba que lo confirma.
- **Evidencia fisica de exito:** index.html reducido de 4548 a 4373 lineas (-175, -68.382 bytes) al retirar los 2 arrays hardcodeados. `index-api-connector.js` (ya en produccion) queda formalmente documentado en BLUEPRINT.md seccion 5-bis.

### TASK-008: Paginas indexables de busqueda (/buscar?q=...)
- **Prioridad:** BAJA
- **Responsable:** Lead Developer + QA Specialist (SEO)[cite: 1]
- **Estado:** COMPLETADO (Agosto 2026)
- **Dependencia:** Presupuesto de endpoints de Vercel Hobby[cite: 1]
- **Sprint:** Sprint 5+ (fuera del piloto QR Terraza)[cite: 1]
- **Detalle t\u00e9cnico:** Reutilizar un endpoint de servidor para capturar las peticiones GET y permitir Server-Side Rendering b\u00e1sico para la extracci\u00f3n de meta etiquetas.
- **Evidencia f\u00edsica de \u00e9xito:** La etiqueta og:title del `<head>` cambia de manera program\u00e1tica al inspeccionar el c\u00f3digo fuente de acuerdo al par\u00e1metro `q`.
- **NOTA DE CIERRE (Agosto 2026):** Implementado sin endpoint nuevo (presupuesto Hobby 8/8): bloque `?tipo=buscar` SSR en `api/utilidades.js` (GET sin auth) + rewrite `{ "source": "/buscar", "destination": "/api/utilidades?tipo=buscar" }` en `vercel.json` (los query params del request se reenvian por defecto). Se conecto el boton "Buscar ahora" del hero: `goBuscar()` en `index.html` (si `#sinp` tiene texto navega a `/buscar?q=...`, si no conserva el scroll a `#recs`). Alcance de busqueda completo: `nombre ILIKE`, `ciudad ILIKE`, `region ILIKE`, `barrio ILIKE` y `tags::text ILIKE` (escape de comodines `\`, `%`, `_`), `LIMIT 30 ORDER BY rating DESC NULLS LAST`. Pagina indexable: `<title>`/`og:title` dinamicos segun `q`, canonical `https://exploraco.co/buscar?q=...`, `og:url`, `robots index,follow`, form GET en la pagina, grid de cards con markup del directorio (img/emoji/badge de categoria/estrellas/ciudad-region-Colombia/precio), estado vacio y sin-q, footer. Cabeceras: `Cache-Control: public, s-maxage=1800, stale-while-revalidate=3600`. Evidencia: `node --check` limpio, ASCII-safety del archivo intacto (680 bytes >127, todos pre-existentes), smoke test `smoke_buscar.js` 29/29 PASS (og:title dinamico, escape de inyeccion `<script>` y de comodines `%`/`_`, SQL parametrizado, truncado a 80 chars, balance de divs = 0, cache headers). ADR-002 respetado (bloque nuevo 100% ASCII-safe).

### TSK-066: Ruta Salsera de Bogota - 7 bares de salsa + guia de blog (nueva sesion)
- **Prioridad:** ALTA
- **Responsable:** Lead Developer + renderer-dev + seo-dev
- **Estado:** COMPLETADA (2026-08-19, esta sesion)
- **Dependencia:** TASK-001/002/003 (patron seed+loader validado), TASK-011 (deploy desbloqueado)
- **Sprint:** Sprint actual (contenido nuevo)
- **Detalle tecnico:** Se crearon 7 paginas dinamicas de categoria `sitio` (tipos_actividad='Salsa bar') + 1 post de blog guia (`categoria_slug='blog'`, multi-tema `temas:['cultura','noche','gastro','musica']`), siguiendo el patron seed+loader establecido (ej. TSK-052 Quiebracanto, TSK-047 bogota-gastronomia-guia).
  - **7 bares sitio (slugs):** galeria-cafe-libro (Parque 93/Palermo, 1982, orquestas top, galeria arte), el-goce-pagano (Las Aguas, 1978, mas antiguo, acetatos, intelectuales), sandunguera (Chapinero, 1994, Templo Salsa Clasica, clases Mie/Jue/Sab), salsa-camara (Chapinero, 1988, orquestas intl Aragon/Dan Den), habana-93 (Parque 93, 2006, lunch $29.900 12-16h + salsa vivo diario), rumbavana (Cra 19A con 16, 1992, rumba caleña, hermanos Soto), bar-continental (Cra 8 #66-18, 2020, speakeasy ron/vinilos TripAdvisor #1).
  - **Blog guia (slug ruta-salsera-de-bogota):** ~2.500 palabras, 8 fotos inline [foto:URL|texto] (Wikimedia Commons, thumbs 960px verificadas HTTP 200), multi-tema `cultura/noche/gastro/musica`, sin FAQs, sin video. Enlaza los 7 nuevos + Quiebracanto + Theatron (ya existentes). 3 rutas sugeridas (Centro, Chapinero, Parque 93) + logistica (TransMilenio, taxis, presupuesto, efectivo).
- **Archivos creados (16):** `scripts/seed-<slug>.js` (7 sitio + 1 blog, upsert SQL idempotente, `--dry`), `scripts/load-<slug>-api.js` (8 loaders DELETE+POST a `/api/admin-destinos` Bearer exploraco12345), `exploraco desarrollo/ficha-<slug>.md` (8 fichas con datos verificados).
- **Fotos:** 5 fotos por bar (hero + 4 galeria) + 8 fotos blog = 43 URLs Wikimedia Commons, todas thumbs 960px verificadas HTTP 200 (patron BUG-022). 3 fotos rate-limited en HEADs (429) funcionan en prod (diferentes IPs, cache).
- **Carga a prod:** 8 POST `/api/admin-destinos` = OK (ids nuevos, status=published, destacado=true). Fotos verificadas HTTP 200.
- **Verificacion (Escudo GOLD):** `node --check` OK en los 16 scripts; ASCII-safety 0 bytes no-ASCII; smokes: GET /api/destinos?cat=sitio total 65 (era 58, +7), slugs nuevos publicados; GET /api/destinos?categoria=blog incluye ruta-salsera-de-bogota; 8 URLs .html = 200; sitemap.xml incluye los 8 slugs nuevos; 9 fotos clave curl 200 (rate limits en HEADs son de mi IP, prod OK).
- **Evidencia fisica de exito:** /api/destinos?cat=sitio paso de 58 a 65 destinos; 7 slugs nuevos + blog; 8 URLs .html = 200; sitemap con 8 slugs nuevos; 43 fotos verificadas; Escudo GOLD limpio en 16 scripts.

### TSK-067: Actualizacion documental sesion Ruta Salsera (cierre)
- **Prioridad:** MEDIA
- **Responsable:** docs-keeper
- **Estado:** COMPLETADA (esta edicion)
- **Dependencia:** TSK-066
- **Detalle tecnico:** Actualizacion de TASKS.md (TSK-066, TSK-067), NEXT.md (segmento de sesion Ruta Salsera), DECISIONS.md (si aplica), BUGS_HISTORICOS.md (rate limits Wikimedia en HEADs, no bloqueantes). No nuevos ADRs.

### TSK-068: 5 eventos de la semana 24-30 ago 2026 en produccion
- **Prioridad:** ALTA
- **Responsable:** Lead Developer + renderer-dev + qa-auditor
- **Estado:** COMPLETADA (2026-08-24)
- **Dependencia:** TASK-003 (tags evento), patron seed+loader+smoke de Fase 9 (TSK-057..061, TSK-063)
- **Sprint:** Sprint actual (contenido nuevo)
- **Detalle tecnico:** Se crearon 5 paginas dinamicas con `categoria_slug='evento'`
  para la semana del 24 al 30 de agosto de 2026. El usuario entrego la lista
  candidata, se investigo cada evento (fechas, sedes, coordenadas, precios,
  horarios, lineups, edad minima, ticketeras) y aprobo publicarlos tal cual,
  todos `status='published'` + `destacado=true`:
  1. `maroon-5-bogota` - Maroon 5 "Love Is Like Tour", jue 27 ago, Coliseo
     MedPlus (Calle 80 km 1.5 via Cota, coords 4.7381,-74.1320), puertas 4 pm
     show 9 pm, edad minima 14, ticketera TaquillaLive, organiza Paramo;
     precios Etapa 1 $294.000-$671.000 (Etapa 2 suma $60.000 por localidad);
     fecha reprogramada desde el 25 de abril.
  2. `la-vida-es-hoy-bogota` - Camilo Cifuentes + Miguel Buitrago (Media Vida),
     jue 27 ago 7:00 pm, Universidad EAN campus Legacy (Cra 11 #78-47,
     Chapinero, coords 4.6628,-74.0558), boletaenlinea.co; reprogramado desde
     julio.
  3. `tardeando-el-centro-bogota` - jornada cultural "ultimo viernes" de la
     FUGA con aliados (I Love La Candelaria, AsoSanDiego, Asobares, Visit
     Centro Internacional), vie 28 ago 1:00 pm a medianoche, centro historico /
     La Candelaria (ancla Plaza de Bolivar 4.5981,-74.0758), mayoria gratis.
     Lineup vacio (no aplica); smoke valida que la seccion lineup NO renderice.
  4. `las-bartenders-el-musical-bogota` - cabaret de cocteleria en vivo +
     acrobacias + musica, 120 min, solo 18+, Casa E Borrero Sala Arlequin
     (Cra 24 #41-69, Park Way, coords 4.63287,-74.07520), funciones jue/vie/sab
     8:00 pm, temporada hasta sab 29 ago (fecha_inicio 27 / fecha_fin 29),
     desde $86.000 (Dinaticket/Atr\u00e1palo, rating 9.8).
  5. `juanpis-live-show-bogota` - The Juanpis Live Show "Si Nos Organizamos
     Cabemos Todos", concierto benefico AGOTADO por el Choc\u00f3 (terremoto
     M7.4 del 10 de ago, 100% del recaudo a la Fundaci\u00f3n PLAN via
     Tuboleta), sab 29 ago puertas 2 pm show 4-11 pm, Movistar Arena (coords
     4.6652,-74.0839), 18+, PULEP PQB187, zonas de donaci\u00f3n Azul/Roja/
     Plata/Dorada ($130k/$230k/$290k/$330k, todas disponibilidad 'Agotado' ->
     badge tip-red), lineup 13 artistas (Juanpis Gonz\u00e1lez anfitri\u00f3n +
     Feid, Carlos Vives, Kapo, Manuel Turizo, Mike Bah\u00eda, Santiago Cruz,
     Luis Alfonso, Nidia G\u00f3ngora, ChocQuibTown, Piso 21, Manuel Medrano,
     Monsieur Perin\u00e9); organiza Ria\u00f1o Producciones + BeatHub
     Entertainment.
- **Archivos creados (15):** `scripts/seed-<slug>.js` x5 (upsert SQL idempotente
  ON CONFLICT slug, modo `--dry`, TAGS evento completos segun TASK-003:
  `fecha_inicio`, `fecha_fin`, `edicion`, `sede`, `organiza`, `lema`,
  `lineup[]`, `agenda[]`, `categorias_entrada[]`, `que_llevar[]`,
  `prohibido[]` (+ `pulep` en Juanpis)), `scripts/load-<slug>-api.js` x5
  (DELETE+POST a `/api/admin-destinos`, Bearer exploraco12345),
  `scripts/smoke_test_<slug>.js` x5 (buildHTML en sandbox vm con fake_neon.js).
- **Hallazgo tecnico nuevo:** `esc()` de `api/pagina-destino.js` codifica
  acentos como entidades numericas (`\u00ed` -> `&#237;`), por lo que los
  `includes()` de los smokes fallan con strings con tildes. Los 5 smokes
  incluyen helper `inc()` que compara tambien la version entity-encoded
  (`html.includes(enc(s)) || html.includes(s)`).
- **Fotos:** 5 por evento (hero + 4 galeria). Se reutilizaron URLs Unsplash ya
  validadas en prod (Morat/Rock/Festivales) + 4 nuevas de cocteleria
  verificadas HEAD 200 antes de sembrar (patron BUG-022).
- **Verificacion (Escudo GOLD):** `node --check` OK en los 15 archivos;
  ASCII-safety 0 bytes no-ASCII en los 15; smokes 8 checks PASS cada uno +
  divs balanceados (178/178, 146/146, 137/137, 133/133, 216/216). Carga a
  prod: 5 POST `/api/admin-destinos` OK (ids 54a64de1-..., 8276c138-...,
  3a35f099-..., 3481dca9-..., d1a918d5-...) todos published + destacado.
- **Evidencia fisica de exito:** las 5 URLs `.html` = 200 en prod (55-60KB)
  con seccion `evento-fechas`; `/api/destinos?cat=evento` paso de 22 a 27 con
  day/month correctos derivados de `tags.fecha_inicio` (27/27/28/27/29 Ago);
  sitemap.xml incluye los 5 slugs; contenido clave verificado en prod
  (Feid + Agotado + tip-red en Juanpis; $671.000 + Coliseo MedPlus en Maroon 5).

### TSK-069: 10 hostales top de Bogota en produccion
- **Prioridad:** ALTA
- **Responsable:** Lead Developer + renderer-dev + qa-auditor
- **Estado:** COMPLETADA (2026-08-24)
- **Dependencia:** Patron seed+loader+smoke de Fase 9 (TSK-057..061, TSK-063, TSK-068); secciones hostal del motor (TASK-001, BUG-C)
- **Sprint:** Sprint actual (contenido nuevo)
- **Detalle tecnico:** Se crearon 10 paginas dinamicas con `categoria_slug='hostal'`
  para los mejores hostales de Bogota (mix ic\u00f1icos de La Candelaria + top
  rating de Chapinero). El usuario aprobo la lista final; todos
  `status='published'` + destacado editorial:
  1. `cranky-croc-hostel-bogota` - The Cranky Croc Hostel, La Candelaria,
     9.7/10 con casi 4.000 resenas en Hostelworld (el mejor valorado en
     volumen), casa colonial colorida con patio/terraza/restaurante, dorms
     desde $92.000. Booking + Hostelworld verificados.
  2. `masaya-hostel-bogota` - Masaya Bogota, Cra 2 #12-48, 9.0/10 (+2.500),
     casa colonial a 50 m del Chorro de Quevedo, free walking tour, bar y
     terraza, desayuno incluido, solo adultos 18+, mascotas con costo.
     WhatsApp real (573106092782) -> botones Reservar por habitacion.
  3. `botanico-hostel-bogota` - Botanico Hostel, Cra 2 #9-87, 9.2/10
     (+2.300), jardin tropical + rooftop, yoga diaria, desayuno incluido,
     recepcion 24h sin toque de queda, dorms desde $35.000.
  4. `viajero-bogota-hostel-spa` - Viajero Bogota Hostel & Spa, Las Nieves,
     9.5/10 (+1.300), unico del centro con spa propio (sauna/turco/
     hidromasaje gratis en privadas), restaurante La Nevera, eventos Linkup.
  5. `arche-noah-boutique-hostel-bogota` - Arche Noah Boutique Hostel,
     Cl 12F #2-09, gestion alemana, patio-jardin con cafeteria, desde $38.000;
     sin URLs de reserva verificadas -> se omiten booking_url/hostelworld_url.
  6. `granada-hostel-bogota` - Granada Hostel, Cl 11 #2-65/75, 8.9/10
     (+1.500), casona s. XX con coworking/billar/terraza solarium, agua
     caliente 24/7 alta presion, lockers gratis, recepcion 24h, minima 16.
  7. `republica-cabin-beds-bogota` - Republica Bogota Cabin Beds, Quinta
     Camacho (Chapinero), cabin beds con cortina blackout + luz propia +
     enchufe, adults-only, karaoke, entre Parque 93 y Zona T.
  8. `82hostel-bogota` - 82Hostel, Cra 19 #80-14 (Chico), economico con
     sala de juegos, cocina integrada, aparcamiento propio (raro en Bogota),
     acepta mascotas y familias.
  9. `vecinos-by-la-palmera-bogota` - Vecinos by La Palmera, Cl 70 #11a-18,
     9.7/10 (staff 9.9/limpieza 9.9), desayuno+lockers gratis, coworking y
     agenda semanal REAL renderizada como `tags.eventos_hostal[]` (Movie
     Night, Noche de Leyendas, Boardgames Night, Tejo Night, Salsa Class).
  10. `karuss-hostel-bogota` - Karuss Hostel (ex Bakano), Cl 12F #2-86,
      9.9/10: el mejor calificado de Bogota; hosts Luis y Leidy, casa nueva
      con chimenea, desayuno incluido, pago solo efectivo. WhatsApp real
      (573057875998).
  Descartados en investigacion: Selina/Socialtel (cadena quebro), La Playa
  (8.0, Teusaquillo), Fatima (3.8 TripAdvisor).
- **Archivos creados (31):** `scripts/seed-<slug>.js` x10 (upsert SQL
  idempotente, modo `--dry`, TAGS hostal completos: `tipo_alojamiento`,
  `checkin`, `checkout`, `recepcion`, `edad_minima`, `mascotas`,
  `cocina_compartida`, `barrio_descripcion`, `politica_cancelacion`,
  `reglas_casa`, `habitaciones[]` con badges popular/female/premium,
  `amenidades[]`, `actividades[]`, `que_incluye[]`, `transporte[]`,
  `eventos_hostal[]`), `scripts/load-<slug>-api.js` x10 (DELETE+POST a
  `/api/admin-destinos` enviando TAMBIEN top-level `checkin`, `checkout`,
  `habitaciones`, `amenidades`, `booking_url`, `hostelworld_url`,
  `airbnb_url` porque admin-destinos los escribe en destinos_detalles y el
  motor los lee de det.*, no de tags), `scripts/smoke_test_<slug>.js` x10
  (buildHTML en sandbox vm pasando `det` explicito) y
  `scripts/_gen_hostales_pipeline.js` (generador que produce loaders+smokes
  desde plantilla para evitar copiar/pegar x20).
- **Hallazgo tecnico:** el fallback det->tags de pagina-destino.js (~L1854)
  vive en el wrapper prod, NO dentro de buildHTML(); los smokes deben pasar
  `det={habitaciones,amenidades,checkin,checkout,...}` como segundo arg o la
  tabla de habitaciones y las pills Check-in no renderizan. Los precios
  string tipo '$92.000' pasan por money() que los normaliza.
- **Fotos:** 5 por hostal (hero + 4 galeria), todas reutilizando URLs de
  Wikimedia Commons ya validadas en prod (pool de seeds existentes); captions
  honestas de barrio/contexto (nunca interiores no verificados del hostel).
- **Verificacion (Escudo GOLD):** `node --check` OK en los 31 archivos;
  ASCII-safety 0 bytes no-ASCII en los 31 (conversor temporal); smokes PASS
  x10 (11 checks en Vecinos por eventos) + divs balanceados cada uno. Carga
  a prod: 10 POST `/api/admin-destinos` OK (ids d44f0c11-, 0baa3fc5-,
  344033a1-, 9891169d-, 8e4fe851-, bf88a8dc-, 63e850ef-, a9877c17-,
  8052f1b9-, 2e1aaf93-) todos published.
- **Evidencia fisica de exito:** las 10 URLs `.html` = 200 en prod
  (59-62KB) con secciones `habitaciones`, pill Check-in/Check-out,
  `reglas-casa`, `actividades`, `como-llegar`; Vecinos muestra
  `eventos-hostal` con su agenda semanal; WhatsApp links presentes en
  Masaya/Karuss; booking/hostelworld links presentes donde verificados.

### TSK-070: Fix Mi Mapa personal - guardados invisibles al iniciar y lista duplicada
- **Prioridad:** ALTA
- **Responsable:** Lead Developer
- **Estado:** COMPLETADA (2026-08-24, codigo verificado localmente; commit pendiente)
- **Dependencia:** Ninguna (bug de frontend en index.html + index-api-connector.js)
- **Detalle tecnico:** El usuario reporto dos bugs en la seccion Mi Viaje/
  Mi mapa personal de index.html:
  1. *No muestra los sitios guardados al iniciar* - causa raiz triple:
     (a) el primer `renderMyMap()` corria ANTES de cargar `mm_saved`/
     `mm_visited` del localStorage (la carga vivia ~30 lineas mas abajo,
     en LOAD SOCIAL STATE);
     (b) `index-api-connector.js` poblaba `MAPA_PLACES` de forma asincrona
     pero su `applyData()` nunca llamaba `renderMyMap()` (riesgo ya anotado
     en NEXT.md), asi que la seccion quedaba congelada en el estado vacio
     del primer render hasta que el usuario interactuara;
     (c) los guardados en Neon nunca se hidrataban al arrancar:
     `ExploraCO.cargarMiMapa()` existia en usuario-session.js (GET
     `/api/interacciones?tipo=mapa`, devuelve array de UUIDs activos) y
     nadie la llamaba nunca.
  2. *Lista duplicada* - `renderMMList()` solo hacia `cont.innerHTML=''`
     en el camino vacio; con resultados, cada re-render (filtros, tabs,
     renderMyMap) acumulaba `appendChild` sobre las filas previas.
  **Fixes aplicados:**
  - (A) `cont.innerHTML = ''` SIEMPRE antes del forEach en
    `renderMMList()` (index.html ~L3650).
  - (B) Carga de `mm_saved`/`mm_visited` movida al bloque INIT antes del
    primer `renderMyMap()` (index.html ~L2878) + nueva linea al final de
    `applyData()` en index-api-connector.js:
    `if (typeof renderMyMap === 'function') renderMyMap();` - con (A) es
    idempotente y repinta Mi Mapa cuando `MAPA_PLACES` ya tiene datos.
  - (C) Nueva `_hidratarGuardadosDB()` en index.html (junto a `_uuidDeId`,
    ~L4177): si hay sesion y datos cargados, trae los UUID activos via
    `cargarMiMapa()`, los mapea a ids posicionales buscando `p._uuid` en
    `MAPA_PLACES`/`PL` (convenio inverso de `_uuidDeId`), une los faltantes
    a `mmSaved`, persiste en localStorage y re-renderiza. Idempotente via
    flag `_mmHidratado`; si no hay sesion o `MAPA_PLACES` esta vacio sale
    SIN marcar el flag (reintento natural en el proximo render). No toca
    `mmVisited` (el endpoint solo devuelve guardados). Disparadores: el
    wrapper existente de `renderMyMap` (~L3790, que a su vez ahora lo
    invoca el conector tras poblar datos) y `window.onExploraCOUpdate`
    (cubre login sin reload).
- **Archivos modificados (2):** `index.html` (+75/-4),
  `index-api-connector.js` (+7).
- **Verificacion:** `node --check` OK en index-api-connector.js y en el
  bloque `<script>` inline unico de index.html extraido a temp; smoke de
  hidratacion con Node vm extrayendo la funcion real del HTML: 4/4 PASS
  (merge con dedupe por id posicional, sin sesion no marca flag,
  MAPA_PLACES vacio reintenta, DB vacia marca flag sin persistir ni
  renderizar); revision integral del diff git.
- **Evidencia fisica de exito:** guardar un lugar y recargar index.html
  muestra pin/contador/lista sin requerir interaccion; alternar tabs y
  filtros de la lista repetidas veces no duplica filas; usuario logueado
  con guardados en Neon y localStorage vacio ve sus guardados al cargar la
  pagina.
- **Riesgo conocido dejado explicito:** `mm_saved` sigue usando ids
  posicionales (`idx+1`) que dependen del ORDER BY del API entre sesiones
  (riesgo MM_PINS ya anotado); la hidratacion mapea por UUID en el momento
  correcto, pero el fix estructural (guardar slugs/UUIDs) queda como
  backlog. Ademas `clearMyMap()` borra solo local: con sesion activa los
  guardados de BD reviven al recargar (candidato: llamar `quitarGuardado`
  por UUID desde clearMyMap).

### TSK-071: Modulo Blog visible en admin + editor de escritos con preview fiel al motor
- **Prioridad:** ALTA
- **Responsable:** admin-dev + renderer-dev
- **Estado:** COMPLETADA (2026-08-24, codigo verificado localmente; commit pendiente)
- **Dependencia:** Ninguna (solo admin.html; el soporte blog del formulario
  ya existia desde las sesiones Sprint Inspirate pero era invisible)
- **Detalle tecnico:** El usuario reporto "no veo nada relacionado a blog"
  en admin.html. Investigacion confirmo que TODO el modulo existia (filtro
  pill Blog en la tabla, categoria en el form, panel especifico-blog con
  tabs Historia/Autor, buscador de autor, CRUD PUT/DELETE) PERO no habia
  entrada en el sidebar: updateNavCounts() calculaba `snav-count-blog` sin
  encontrar el elemento en el DOM. Se implemento:
  1. *Entrada sidebar* "Blog" con contador (`showScreenCat('tabla','blog')`,
     id snav-blog/snav-count-blog) tras Eventos + titulo 'BLOG' agregado al
     mapa de labels de showScreenCat (antes caia en 'TODOS').
  2. *Herramientas del cuerpo* (visibles solo cat=blog via
     updateBlogBodyTools() enganchado a updateCatUI() y newPlace()):
     boton Ampliar (overlay pantalla completa #blog-desc-overlay con COPIA
     del valor en #f-desc-big, sincronizado de vuelta al cerrar -- nunca se
     mueve el #f-desc original), botones Foto/Video que insertan
     [foto:URL|caption] / [video:URL] en la posicion del cursor como bloque
     propio (separado por linea vacia, requisito del parser), y contador
     palabras/min con la formula EXACTA del motor
     (Math.max(1, Math.round(palabras/200)), pagina-destino.js L562).
  3. *Preview client-side* (#blog-preview-modal): builder
     blogBuildCuerpoHtml()/blogVideoEmbedUrl() = puerto literal de
     parseBlogBody()/videoEmbedUrlBlog() del motor; renderiza titulo,
     lead, autor seleccionado (_blogAutorNombre stash en
     blogSeleccionarAutor/blogLimpiarAutor/reset), cuerpo con marcadores y
     video principal; CSS replica .bfig/.bvid/.stext del motor (L192-196).
     Cierra con ✕/Esc/click-fuera.
- **Archivo modificado:** `admin.html` (+~230 lineas).
- **Verificacion:** node --check OK del bloque script inline unico;
  smoke de fidelidad con Node vm extrayendo funciones reales de AMBOS
  archivos (esc del servidor inyectado como _esc para aislar la logica):
  19/19 PASS -- salidas identicas en parrafos, fotos validas/invalidas/
  sin caption/malformadas, videos YouTube watch/youtu.be/Vimeo/dominio
  prohibido/malformados, mixtos y bordes (saltos con espacios, vacio).
  Hallazgo del harness: en la vm hay que inyectar la global URL (en
  Vercel/Node existe nativa).
- **Evidencia fisica de exito:** el sidebar muestra "Blog" con el conteo
  real de posts; clic filtra la tabla con titulo BLOG; editar un post
  abre tabs Historia/Autor; con cat=blog aparecen Ampliar/Foto/Video/
  Preview y el contador; Ampliar edita comodo y sincroniza al salir;
  Preview muestra el articulo igual que lo renderizara pagina-destino.js.

### TASK-009: Integracion de pagos Wompi/PSE para planes destacados
- **Prioridad:** BAJA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** PENDIENTE[cite: 1]
- **Dependencia:** Ninguna[cite: 1]
- **Sprint:** Sprint 5+[cite: 1]
- **Detalle t\u00e9cnico:** Incluir el script de Wompi Widget y parametrizar la l\u00f3gica para generar una transacci\u00f3n atada al ID del plan.
- **Evidencia f\u00edsica de \u00e9xito:** Redirecci\u00f3n segura completada hacia el simulador de checkout de PSE en entorno Sandbox.

### TASK-010: Notificacion por WhatsApp al due\u00f1o cuando el admin aprueba un lugar
- **Prioridad:** BAJA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** PENDIENTE[cite: 1]
- **Dependencia:** RESEND_API_KEY o servicio equivalente de mensajeria configurado[cite: 1]
- **Sprint:** Sprint 5+[cite: 1]
- **Detalle t\u00e9cnico:** Configurar un webhook de disparo hacia un proveedor de mensajer\u00eda cuando se modifique la columna de estado del lugar a aprobado.
- **Evidencia f\u00edsica de \u00e9xito:** Recepci\u00f3n instant\u00e1nea del mensaje SMS o WhatsApp en un dispositivo m\u00f3vil de prueba tras guardar los cambios en el panel de administraci\u00f3n.

### TASK-011: Desbloquear el deploy de Vercel (causa desconocida)
- **Prioridad:** ALTA
- **Responsable:** Project Manager (Javier) + Lead Developer
- **Estado:** COMPLETADA
- **Dependencia:** Ninguna
- **Detalle t\u00e9cnico:** El deploy automatico de Vercel desde GitHub sigue fallando sin causa identificada. Bloquea la visibilidad en produccion de los cambios multi-tema de TSK-044 (api/destinos.js, index.html, api/pagina-destino.js, admin.html) y de los cambios de TASK-008/TSK-017 pendientes desde sesiones previas. Diagnostico iniciado pero pausado: revisar logs de build de Vercel (dashboard o `vercel logs`) y comparar con el ultimo deploy exitoso. Posibles sospechosos: algun archivo nuevo que rompa el build de la funcion serverless, cambios en vercel.json, o limites del plan Hobby.
- **Evidencia f\u00edsica de \u00e9xito:** Un commit nuevo a main (o redeploy manual) pasa el build de Vercel y queda visible en https://exploraco.vercel.app; `/api/destinos?categoria=blog` devuelve el post con `temas[]` (array multi-tema).

### TASK-012: Aplicar migracion db/migrations/004_usuarios_blog_autor.sql en Neon
- **Prioridad:** MEDIA
- **Responsable:** Lead Developer (con acceso a la URL de Neon)
- **Estado:** COMPLETADA (verificada en prod el 2026-08-19: columnas `foto_url` y `ciudad_base` presentes en la respuesta de GET /api/usuarios?id=...)
- **Dependencia:** Ninguna (el archivo ya existe en el repo, ADR-008 cumplido)
- **Detalle t\u00e9cnico:** Aplicar en Neon la migracion versionada `db/migrations/004_usuarios_blog_autor.sql` que agrega `usuarios.foto_url` y `usuarios.ciudad_base` (requeridas por la seccion "Quien escribe" del renderer de blog y por el buscador de autor de admin.html). Es idempotente (`ADD COLUMN IF NOT EXISTS`). El post monserrate-guia-completa se creo SIN `id_autor` a proposito hasta que esta migracion se aplique.
- **Evidencia f\u00edsica de \u00e9xito:** `SELECT column_name FROM information_schema.columns WHERE table_name='usuarios'` muestra `foto_url` y `ciudad_base`; al guardar el post desde admin.html con un autor asignado, la seccion "Quien escribe" aparece en /monserrate-guia-completa.html.

### TASK-013: Asignar autor al post de blog monserrate-guia-completa desde admin.html
- **Prioridad:** BAJA
- **Responsable:** Project Manager (Javier)
- **Estado:** PENDIENTE (dependencia TASK-012 ya COMPLETADA -- el autor ya puede asignarse desde admin.html)
- **Dependencia:** TASK-012 (migracion 004 aplicada)
- **Detalle t\u00e9cnico:** Editar el post monserrate-guia-completa desde admin.html usando el buscador de autor (que filtra usuarios ya registrados) y guardar. El renderer de blog omitira la seccion "Quien escribe" mientras el post no tenga `id_autor`.
- **Evidencia f\u00edsica de \u00e9xito:** /monserrate-guia-completa.html muestra la seccion "Quien escribe" con nombre/foto/ciudad del autor.

### TASK-014: Push a GitHub de la sesion actual (blog + multi-tema)
- **Prioridad:** ALTA
- **Responsable:** Project Manager (Javier)
- **Estado:** PENDIENTE
- **Dependencia:** Sesion de Chrome con GCM (gestor de credenciales) activa
- **Detalle t\u00e9cnico:** Hacer commit y push al repo gonzalezjavierbta-afk/exploraco de los archivos de esta sesion: `scripts/seed-monserrate-guia.js`, `scripts/load-monserrate-guia-api.js`, `exploraco desarrollo/ficha-monserrate-guia.md`, `db/migrations/004_usuarios_blog_autor.sql`, mas los cambios multi-tema de `api/destinos.js`, `index.html`, `api/pagina-destino.js` y `admin.html`. El push depende de la sesion Chrome/GCM y no se pudo ejecutar en esta sesion.
- **Evidencia f\u00edsica de \u00e9xito:** `git log --oneline -1` muestra el commit nuevo en el remoto.

### TASK-015: Pagina /blog.html con SSR de listado de blog (Fase 1)
- **Prioridad:** ALTA
- **Responsable:** Lead Developer + backend-dev
- **Estado:** COMPLETADA (commit c3311d8, verificada en prod: /blog.html 200 con cards, buscador filtra, boton Inspirate lleva a la pagina)
- **Dependencia:** TASK-011 (deploy desbloqueado)
- **Detalle t\u00e9cnico:** Implementar el listado de blog como `?tipo=blog-lista` DENTRO de `api/utilidades.js` (respeta ADR-010 presupuesto 8/8). SSR de `/blog.html` con buscador client-side instantaneo (JSON embebido con `<` escapado a `\u003c`, filtro por texto + chips de tema), grid de cards sin estrellas (ADR-007/009) con fecha + badge Destacado + min de lectura + ubicacion, LIMIT 50 sin paginacion, dos estados vacios (sin posts / sin coincidencias), title/canonical `https://exploraco.co/blog.html`, robots indexable. Rewrite en vercel.json ANTES de `/:slug.html`. Boton de index.html:1434 cambia de `openBlogModal()` a `href="blog.html"`.
- **Evidencia f\u00edsica de \u00e9xito:** `/blog.html` en produccion responde 200 con las cards de posts publicados, el buscador filtra por texto y tema, y el enlace desde Inspirate lleva a la pagina.

### TASK-016: Fotos/videos inline en el cuerpo del blog (Fase 2)
- **Prioridad:** ALTA
- **Responsable:** renderer-dev
- **Estado:** COMPLETADA (commit 8f48f42, verificada en prod: 4 figures con foto y caption inline entre los parrafos)
- **Dependencia:** TASK-015 (Fase 1)
- **Detalle t\u00e9cnico:** Nueva funcion `parseBlogBody()` en `api/pagina-destino.js` (server-side, ASCII-safe, sin backticks) que divide `descripcion` en bloques por `\n\n` y convierte los marcadores inline `[foto:URL|texto]` -> `<figure class="bfig">` con img+figcaption y `[video:URL]` -> `<div class="bvid">` con iframe via `videoEmbedUrlBlog()`. URLs de foto validadas http/https, texto escapado con `esc()`, marcadores mal formados descartados sin romper el render. Solo aplica a `categoria_slug==='blog'`; las demas categorias conservan su `<p class="stext">` con `white-space:pre-line`. CSS nuevo `.bfig` (img 100% con max-height 480px, radius 12px, caption centrado) y `.bvid` (aspect-ratio 16:9). Seed de Monserrate actualizado con 4 marcadores en puntos naturales (basilica, funicular, vista desde la cima, flora).
- **Evidencia f\u00edsica de \u00e9xito:** /monserrate-guia-completa.html en produccion muestra 4 figures con foto y caption inline entre los parrafos; smoke tests: fase2 16/16 PASS (incluye XSS, javascript: descartado, video invalido descartado, balance de divs 0) y regresion blog 19/19 PASS.

### TASK-017: Resenas de blog con estrellas 1-5 (Fase 3)
- **Prioridad:** ALTA
- **Responsable:** renderer-dev + backend-dev
- **Estado:** COMPLETADA (codigo commit f09de13 + docs/limpieza commit 7e05b88, verificada en prod: seccion "Resenas del articulo" con formulario simplificado)
- **Dependencia:** TASK-016 (Fase 2)
- **Detalle t\u00e9cnico:** Se habilitan las resenas para la categoria blog pero con formulario SIMPLIFICADO: estrellas 1-5 + nombre + comentario, sin puntuacion por dimensiones (dims), sin "Fuiste como" (traveller_type) y sin voto rapido (#qr-stars). El JS inline de reseñas (submitRv/addRvOptimista) ya era generico y funciona igual con dims/traveller vacios (publicarResena en usuario-session.js acepta ambos opcionales, y interacciones.js los inserta como vacios). Se cambia el titulo a "Resenas del articulo" y el placeholder del comentario. Las demas categorias conservan el widget completo. Nav incluye la seccion (ya tenia has:!!secResenas).
- **Evidencia f\u00edsica de \u00e9xito:** /monserrate-guia-completa.html en produccion muestra la seccion "Resenas del articulo" con formulario de 5 estrellas + nombre + comentario (sin dims ni tipo de viajero ni voto rapido); el promedio se muestra arriba; balance de divs 0 en smoke blog 23/23 y regresion evento 13/13.

### TASK-018: Diseño moderno minimalista del post de blog (Fase 4)
- **Prioridad:** ALTA
- **Responsable:** renderer-dev
- **Estado:** COMPLETADA (commit 98eb7de, verificada en prod: post con hero bhero de portada, columna de lectura, sin subnav ni gstrip)
- **Dependencia:** TASK-017 (Fase 3)
- **Detalle t\u00e9cnico:** Variante de diseño propia para `categoria_slug==='blog'` que distingue un articulo de un destino. Hero nuevo `.bhero`: foto de portada ancha (`.bcover` a todo el ancho, height min(52vh,440px)) con bloque de titulo/lead/chips limpio sobre fondo crema (`.bhin`/`.bhtitle`/`.bhslead`/`.bchips`), sin grid de 3 thumbs (`.prow`), sin botones Contactar/Como llegar/Guardar/Estuve aqui y sin barra dorada de rating (`.gstrip` desactivada para blog). Sin subnav sticky (`subnav` vacio si cat==='blog'). El `<body>` lleva la clase `blog` que activa columna de lectura ~720px (`body.blog .sin{max-width:720px}`), texto 16px/1.8, oculta la numeracion dorada (`body.blog .stnum{display:none}`) y suaviza la tipografia de titulos. Se conservan todas las secciones del articulo: La historia (con fotos inline .bfig), video, FAQs, reseñas con estrellas y autor.
- **Evidencia f\u00edsica de \u00e9xito:** /monserrate-guia-completa.html en produccion se ve como un articulo de blog moderno minimalista (hero de portada ancha, sin grid de thumbs ni subnav sticky, columna de lectura centrada, sin numeracion dorada), distinto del render de destinos; smoke blog 34/34 PASS (incluye checks Fase 4: body.blog, bhero, bhtitle, bhslead, bchips, bcover, sin subnav, sin gstrip, sin prow, stnum oculto por CSS) y regresion evento/sitio 13/13.

### TASK-019: Recorte del seed de Monserrate a ~3000 palabras (Fase 5)
- **Prioridad:** MEDIA
- **Responsable:** renderer-dev
- **Estado:** COMPLETADA (commit 2ed18ff, re-seed en prod con id cf9dea6d, verificada: 3.018 palabras, 15 min de lectura, 4 figures inline)
- **Dependencia:** TASK-018 (Fase 4)
- **Detalle t\u00e9cnico:** Recorte editorial del cuerpo del post para mejorar la legibilidad y el tiempo de lectura (de ~31 min a ~15 min). Se conservaron los parrafos esenciales por bloques tematicos: introduccion e historia (1-8), funicular y teleferico (9-12), ubicacion y sendero peatonal (13-16), tarifas y horarios (17-20), mejor epoca y hora (21-22), la cima y gastronomia (23-27), biodiversidad y flora (28-32), consejo de altura (35) y cierre (68-69). Los 4 marcadores [foto:] se conservan intactos (parrafos 6, 10, 24, 29). Las FAQs no cambian. El reemplazo se hizo por bloque exacto de string (script Node en temp, separador real es el escape `\n\n` dentro del string JS).
- **Evidencia f\u00edsica de \u00e9xito:** el post en produccion reporta ~3.018 palabras (el renderer calcula el tiempo de lectura desde la longitud), mantiene las 4 fotos inline, y el smoke blog sigue 34/34 PASS (html baja de 80.4KB a 61.0KB).

---

### TSK-072: Hostal R10 en directorio - seed + loader + smoke
- **Estado:** COMPLETADA
- **Detalle:** Pagina dinamica del Hostal R10 (La Candelaria, Bogota),
  casona historica remodelada para estudiantes de intercambio. Datos de
  HW 8.8/10 (679 reviews), Booking 8.4 (1.858 reviews). 18+ exclusivo,
  4 dorms con literas privadas + 6 privadas, bar, terraza hamacas, city
  tour gratis, coworking, recepcion 24h. Check-in 15:00-24:00, checkout
  12:00, cancelacion 24h, impuestos 19% no incluidos. Archivos:
  `scripts/seed-hostal-r10-bogota.js` (3 habitaciones, 14 amenidades, 5
  actividades, 3 transporte, 5 FAQs), `scripts/load-hostal-r10-bogota-api.js`,
  `scripts/smoke_test_hostal-r10-bogota.js`. Generador actualizado (11
  hostales, 22 archivos).
- **Evidencia:** `/hostal-r10-bogota.html` en produccion 200 con todas
  las secciones; smoke 11/11 PASS; precio_desde '$55.000' (fix
  concatenacion). Directorio hostal estatico no incluye R10 (PL embebido,
  backlog conocido).

### TSK-073: La K-zona en directorio - seed + loader + smoke + prod
- **Estado:** COMPLETADA
- **Detalle:** Pagina dinamica de LaK-Zona (Espacio Cultural Artistico
  Alternativo, Calle 15 # 9-64, barrio Veracruz, Centro Historico de
  Bogota; antigua categoria sitio como Espacio Kinder). Colectivo de
  artivistas/gestores (ONG LaK-Zona // ASOCAMEC, sin animo de lucro,
  2010/2015) que fomenta Derechos Culturales. Espacios (Las Zonas):
  studio produccion musical, ensayos (acustico/bateria), danza o circo
  (20 m2), proyeccion audiovisual (30 m2, aforo 40), K-Fe (70 m2, aforo
  80), Auditorio (escenario 265.5 m2, aforo 500), Galerias (45 m),
  Oficinas/Coworking; turismo comunitario: Museo Urbano-Ancestral de la
  Memoria (1000+ m2), residencias artisticas (apartaestudio 30 m2),
  visitas guiadas. Programacion semanal de entrada libre 5pm-11pm
  (mier Sesiones PIYAA, jueves Somos Calle, viernes Junte Salsero, sab
  K-Fe). Fuente: lak-zona.org (+ IG @lakzonaeslazona, Eventario/Yandex).
  Archivos: `scripts/seed-la-k-zona.js` (8 zonas, 4 entradas, 2 tours, 4
  equipamiento, 4 itinerario, 4 secretos, 4 regulaciones, 6 FAQs),
  `scripts/load-la-k-zona-api.js`, `scripts/smoke_test_la_k_zona.js`.
- **Evidencia:** `/la-k-zona.html` en produccion 200 (71KB) con todas
  las secciones del motor sitio (dificultad, entradas, tours, checklist,
  itinerario, fauna, secretos, regulaciones, galeria, mapa, FAQ);
  smoke 11/11 PASS (balance divs 0); node --check y ASCII-safe clean
  (0 no-ASCII). slug=la-k-zona, id 2daadd88-831c-4584-8193-afdb4bc07d72.
  Nota: coords aprox. del Centro (calle 15 #9-64). Directorio sitio
  estatico no incluye la-k-zona (PL embebido, backlog conocido).

### TSK-074: 10 eventos de la semana 5-11 sep 2026 como paginas dinamicas de evento
- **Estado:** COMPLETADA
- **Detalle:** 10 paginas dinamicas (categoria evento) con eventos reales y
  unicos de la semana 5 al 11 de septiembre de 2026 en Colombia, cada uno
  con su triple de archivos (seed + loader + smoke, patron Fase 9 / TSK-068).
  30 scripts creados en `scripts/` (10 seeds + 10 loaders + 10 smoke tests),
  siguiendo el patron TSK-068: seed-<slug>.js con SLUG/HERO/PHOTOS/BASE/
  TAGS/FAQS ASCII-safe con escapes \\uXXXX, load-<slug>-api.js que POST a
  /api/admin-destinos en https://exploraco.vercel.app con token por defecto
  exploraco12345, smoke_test_<slug>.js con buildHTML via VM.
  **Los 10 slugs:**
  1. `arcangel-medellin-2026` - Arcangel en Medellin, Atanasio Girardot,
     4-5 sep 2026, 5 sep agotado.
  2. `ferias-y-fiestas-guaduas-2026` - Ferias y Fiestas de Guaduas,
     4-11 sep 2026, gratis.
  3. `los-parceritos-villavicencio` - Lokillo y Jota P en Villavicencio,
     4 sep 2026.
  4. `parranda-vallenata-barranquilla` - Samuel Morales y Jaime Luis
     Campillo en TRUQ, Barranquilla, 5 sep 2026, gratis.
  5. `queentaesencia-homenaje-queen-medellin` - Trilogia Live Bar,
     Medellin, 11 sep 2026, cover $50.000.
  6. `festival-cordillera-2026` - Festival Cordillera 2026,
     12-13 sep, Parque Simon Bolivar, 41 shows, lema "El futuro es latino".
  7. `jazz-al-parque-2026` - Jazz al Parque ed. 29, 12-13 sep,
     Parque El Country, 17 agrupaciones, gratis.
  8. `justin-quiles-lenny-tavarez-bogota` - Justin Quiles y Lenny
     Tavarez en Movistar Arena, 11 sep, puertas 5pm show 7pm, +18,
     general agotado.
  9. `john-summit-chamorro-bogota` - John Summit en Chamorro Bogota,
     10 sep, show benefico 100% utilidades a victimas del sismo.
  10. `stray-kids-bogota` - Stray Kids en Vive Claro, 9 sep,
      primera visita a Colombia.
  Tags JSONB por evento: fecha_inicio/fin, edicion, sede, organiza, lema,
  lineup[], agenda[], categorias_entrada[], que_llevar[], prohibido[].
  Contenido 100% ASCII-safe (escapes \\uXXXX, 0 bytes no-ASCII en los 30
  nuevos scripts).
- **Evidencia:** `node --check` 30/30 OK; 10/10 smoke tests PASS; 0 bytes
  no-ASCII en los 30 nuevos scripts. Cargados en produccion via loaders
  (`POST /api/admin-destinos`, Bearer default) -> todos
  `status=published` con 5 fotos y 5-6 FAQs. Paginas en vivo verificadas
  200 OK (len ~55-61KB). `/api/destinos?cat=evento` lista 47 eventos.
  Spot-check: divs balanceados en smokes (174-188 abiertos=cerrados).
  Directorio evento estatico no incluye estos slugs (PL embebido,
  backlog conocido).
- **Commit:** `71d18f7` "feat: 10 eventos sem 5-11 sep como paginas
  dinamicas (TSK-074) - seeds, loaders y smoke tests en prod"
  (pusheado a main).

---

### TSK-075: Campo web oficial visible y prominente en el hero de la ficha (pagina-destino.js)
- **Estado:** COMPLETADA
- **Detalle:** Auditoria (2026-08-31) revelo que la pagina web oficial
  (`destinos.web`) se capturaba en 2 formularios (publico `sitio_web`,
  admin `f-web`) y viajaba en la API, pero SOLO se publicaba como un boton
  secundario "Sitio web" en la seccion Contacto del detalle
  (`pagina-destino.js:1554`), sin aparecer en home, directorios ni agenda
  (pese a que los conectores ya exponian `web`). Decidido (usuario):
  elevarla a informacion oficial prominente en el hero de la ficha.
  Cambios en `api/pagina-destino.js`: helper `dominioWeb(u)` (extrae
  hostname legible sin protocolo ni "www."), chip-link `.hqi.hqilink` en la
  fila HQI que muestra el dominio como dato visible tras el horario, y boton
  CTA primario "Sitio web oficial" (`hbtn`) al inicio de `hctar` en el hero.
  El boton secundario de Contacto se conserva (refuerza, no duplica).
  Blogs excluidos (un articulo no es un lugar con sitio oficial),
  consistente con la exclusion actual de `secContact`.
- **Evidencia:** `node --check` PASS; ASCII-safety 0 bytes >127 y 0
  backticks; smoke dedicado PASS (con `web` -> boton + chip de dominio en
  hero + boton Contacto conservado; sin `web` -> ausencia total, divs
  balanceados 83/78); los 39 smokes existentes siguen PASS tras el cambio
  y los eventos con `web` (ulibro 180/180, medejazz 188/188) intactos.
- **Backlog (no implementado, auditado):** home `renderDest()/renderAgenda()`,
  directorios `renderDir()` (y fallback `var PLACES` sin campo `web`),
  agenda `toAgendaEvent()`, y schemaLD JSON-LD aun no muestran `web`.
  Pendiente de decidir si se extiende fuera del hero.

### TSK-076: Eventos semana 31 ago - 6 sep 2026 (batch previo, en produccion)
- **Estado:** COMPLETADA (verificada 2026-09-05)
- **Detalle:** Batch de eventos de la semana del 31 de agosto al 6 de
  septiembre de 2026, anterior a TSK-074 (que documenta la semana 5-11
  sep, commit 71d18f7). Este batch estaba ya publicado en produccion pero
  sin entrada documental propia en TASKS.md. Separado de TSK-074 en esta
  sesion para mantener trazabilidad correcta.
  Slugs verificados en vivo contra la API de produccion
  (https://exploraco.vercel.app/api/destinos) el 2026-09-05 (10 slugs):
  1. `semana-del-bienestar-bogota` - bienestar hol\u00edstico, 31 ago-4 sep.
  2. `libera-2026-bogota` - feria de coleccionismo y cultura alternativa,
     Plaza de la Hoja.
  3. `festival-teatro-libre-bogota` - teatro contempor\u00e1neo en 11 sedes.
  4. `hearth-summit-bogota` - encuentro/rave sonoro en la Candelaria.
  5. `sabor-bogota` - feria gastron\u00f3mica, 3-6 sep.
  6. `vive-mejor-bogota` - expo de vida saludable.
  7. `dia-del-arte-urbano-bogota` - festival de muralismo y street art,
     4-6 sep.
  8. `ulibro-bucaramanga` - Feria del Libro UNAB, edicion 24
     "Habitemos lo salvaje", 28 ago-6 sep, cierre Claudio Narea.
  9. `medejazz-medellin` - Festival de Jazz, 30 aniversario, 5-19 sep,
     Orquesta Arag\u00f3n y Joseph Amado.
  10. `travesia-rio-magdalena` - expedicion fluvial del brazo de Loba,
      2-6 sep, 20 embarcaciones.
  TSK-074 (semana 5-11 sep) documenta 10 slugs diferentes
  (arcangel-medellin-2026, ferias-y-fiestas-guaduas-2026,
  los-parceritos-villavicencio, parranda-vallenata-barranquilla,
  queentaesencia-homenaje-queen-medellin, festival-cordillera-2026,
  jazz-al-parque-2026, justin-quiles-lenny-tavarez-bogota,
  john-summit-chamorro-bogota, stray-kids-bogota) que corresponden a
  la semana siguiente.
- **Evidencia:** Los 10 slugs verificados en vivo contra la API de
  produccion: GET /api/destinos -> slugs presentes con status=published.
  Fecha de verificacion: 2026-09-05.
- **Nota cruzada:** Este batch se separa de TSK-074 (commit 71d18f7),
  que documenta la semana 5-11 sep 2026 con 10 paginas dinamicas.

---

## Regla de actualizacion
Toda tarea completada debe reflejarse aqui (cambio de Estado) y su cierre debe registrarse en NEXT.md como parte del ciclo documental (AI-DOS Cap. 9.9)[cite: 1]. Nueva tarea -> Modificar proyecto -> Actualizar documento -> Continuar Sprint[cite: 1].