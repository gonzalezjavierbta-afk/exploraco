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
- **Ampliacion 2026-09-13 (epic prompt.txt, TSK-100/ADR-026):** el perfil como "museo de trofeos" quedo COMPLETO en su version v1 dentro del epic prompt.txt: `mi-perfil.html` estrena museo-line en el hero (trofeos·fotos·destinos con backfill real), galeria de mejoras de perfil (3 consumibles `perfil_*`) y seccion Vocaciones de artista. La vitrina extendida y el sello de verificado quedan como futuro cercano (decision de Javier).

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

### TSK-077: Canon del Guejar y Las Gachas en directorio - fichas + seeds + loaders + smokes + prod
- **Estado:** COMPLETADA
- **Detalle:** Dos paginas dinamicas de categoria sitio agregadas al
  directorio (patron TSK-073 la-k-zona), nuevas por investigacion web de
  las dos fuentes (maravillasdelguejar.com para el canon y
  sinitinerario.com para Las Gachas).
  1. `canon-del-guejar` (id 83): Can\u00f3n del Guejar, Mesetas (Meta).
     La entrada representa el DESTINO y usa al operador Maravillas del
     Guejar como contacto/web de referencia (maravillasdelguejar.com,
     WhatsApp 573144457907, maravillasdelguejar@gmail.com, IG
     maravillas_del_guejar) segun decision de la sesion. Lat/Lng 3.3840276,
     -74.0438661 (Mesetas). Rafting 17 km cat 3 desde $357.000, 5
     Maravillas del Parque Guejar, Charco Azul, Cueva de los Guacharos.
     5 fotos Commons verificadas (curl 200/206), 6 FAQs.
  2. `las-gachas` (id 82): Las Gachas, Guadalupe (Santander). Pocetas
     naturales de aguas turquesas sobre piedra roja a 20 min por el Camino
     Real; sin web oficial (campo web vac\u00edo; enlaces de reserva a la
     guia local sinitinerario.com/las-gachas/). Lat/Lng 6.2468, -73.4182.
     5 fotos Commons verificadas, 6 FAQs.
  Ambos: `categoria_slug='sitio'`, `status='published'`, `destacado=true`,
  **rating 0** (ADR-009; el badge hero "★ 4.8 \u00b7 Nuevo" es placeholder
  del motor pagina-destino.js:634-638 cuando rat=0, no dato guardado).
  Archivos creados (los 6, ASCII-safe 0 bytes >127): `scripts/
  seed-canon-del-guejar.js` + `load-canon-del-guejar-api.js` +
  `smoke_test_canon_del_guejar.js` y `scripts/seed-las-gachas.js` +
  `load-las-gachas-api.js` + `smoke_test_las_gachas.js`. Leccion de la
  sesion: el renderer construye el link de Instagram con
  (d.instagram||'').replace('@','') (pagina-destino.js:1569), por lo que
  el seed guarda el handle SIN '@'. Tarjetas estaticas agregadas a
  `directorio.html` y `directorio-sitio.html` (ids 83 y 82 al inicio de
  PLACES, 82/83 al final de FEAT y entradas 82/83 en PHOTOS).
- **Evidencia:** Carga en prod v\u00eda loaders (DELETE+POST Bearer
  exploraco12345): las-gachas id fd216d5c-... y canon-del-guejar id
  9501e3b7-... status=published. Verificacion en vivo 2026-09-07:
  /canon-del-guejar.html y /las-gachas.html = 200; API pagina-destino de
  ambos slugs renderiza todas las secciones sitio (dificultad + matriz de
  epoca, entradas, tours, checklist, itinerario, fauna, secretos,
  regulaciones, galeria 5 fotos, mapa, FAQ 6, resenas con RV_AVG=0/
  RV_COUNT=0, contacto); /api/destinos?categoria=sitio lista ambos
  (69 sitios, antes 67); sitemap/exploraco.co incluye los dos slugs.
  Escudo GOLD: node --check 6 scripts PASS; ASCII-safety 0 bytes >127;
  smokes 11/11 y 10/10 PASS con divs balanceados (373/373 y 316/316);
  bloques PLACES/FEAT/PHOTOS evaluados por VM en ambos directorios
  (places=83/30, feat=13, photosKeys=83). Coordenadas aproximadas
   via Nominatim (Mesetas 3.3840276,-74.0438661; Guadalupe 6.2468,-73.4182).

### TSK-078: 3 eventos "hoy/en curso" (7 sep 2026) como paginas dinamicas + referente agenda
- **Estado:** COMPLETADA
- **Detalle:** A pedido del usuario se (a) creo el archivo de referentes de
  la agenda (`exploraco desarrollo/referentes-agenda.md`) con el Instagram
  @quehaypahacerenbogota como inspiracion diaria (NO scrapeable, ver nota) y
  las fuentes oficiales verificables (bogota.gov.co, idartes.gov.co,
  culturarecreacionydeporte.gov.co, visitbogota.co, tuboleta.com, idpc.gov.co),
  y (b) se crearon 3 paginas dinamicas de evento para "hoy/en curso"
  (lunes 7 sep 2026) con el patron Fase 9 (seed + loader + smoke):
  1. `jazz-expandido-bogota` (id c9b13826-...): temporada de jazz del Centro
     Nacional de las Artes (Teatro Colon, Sala Delia Zapata, Sala Fanny Mikey,
     Plazoleta), 4-27 sep 2026, musicos de 6 paises. Lineup 9 artistas
     (Davi Fonseca, Luca Ciarla, Michael Varekamp, Rembrandt Trio, Tiken Jah
     Fakoly, Buika+OSN...). Fuente: La Republica 2026-09-07.
  2. `mes-del-patrimonio-bogota` (id c18674eb-...): Mes del Patrimonio 2026
     (IDPC + SDCRD), todo septiembre, 50+ actividades gratis, lema "Memoria
     que construye futuro", 20 anos del IDPC. Fuente: bogota.gov.co.
  3. `transitos-fragmentados-bogota` (id e8771df6-...): exposicion
     fotografica de Isabella Vargas y Mary Barrios en el CEFE Chapinero,
     3-12 sep 2026, entrada libre. Fuente: bogota.gov.co / Pulzo.
  Los 3: `categoria_slug='evento'`, `status='published'`, `destacado=true`,
  rating 0 (ADR-009). Archivos creados (9, ASCII-safe 0 bytes >127):
  3 seeds + 3 loaders + 3 smokes en `scripts/`. Slugs con sufijo `-bogota`
  para no colisionar con HTML estatico de la raiz.
- **Evidencia:** Escudo GOLD: node --check 9/9 PASS; ASCII-safety 0 bytes
  >127; smokes 3/3 PASS con divs balanceados (190/190, 180/180, 168/168).
  Carga en prod via loaders (DELETE+POST Bearer exploraco12345): los 3
  status=published. Verificacion en vivo 2026-09-07: las 3 URLs .html = 200
  (58-61KB); /api/destinos?cat=evento lista 50 eventos con day/month reales
  (4/1/3 Sep); sitemap.xml incluye los 3 slugs. Nota: Instagram no es
  scrapeable (solo devuelve logo base64); los datos se verificaron en
  fuentes oficiales abiertas.

### TSK-079: Pagina dinamica parque-mundo-aventura.html (parque de atracciones en Kennedy)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Parque Mundo Aventura (cat sitio, slug
  `parque-mundo-aventura`, `status='published'`, `destacado=true`, rating 0)
  con datos reales 2026: el parque de atracciones numero uno de Colombia por
  visitantes (13 ha en Kennedy - Hipotecho, Carrera 71D # 1-14 Sur), abrio
  el 30-ene-1998 como aporte de la Camara de Comercio de Bogota (Corparques),
  +40 atracciones en zonas tematicas, Gravity torre de caida libre mas alta
  de Colombia (57 m, 2023), modelo de acceso unico: ingreso gratuito y solo
  se paga por usar las atracciones. Precios 2026: Pasaporte Gold $95.000 /
  Silver $84.000 / Kids $73.000 / FilaExpress $73.000; ingreso al parque
  gratuito. 8 fotos verificadas, 5 FAQs, 3 tours (rating '0'/review_count 0,
  ADR-009). Fuentes: mundoaventura.com.co, Wikipedia, kennedy.gov.co,
  visitbogota.co/IDT. Archivos: `scripts/seed-parque-mundo-aventura.js`
  (21 keys TAGS sitio), `scripts/load-parque-mundo-aventura-api.js`,
  `scripts/smoke_test_parque_mundo_aventura.js` y
  `exploraco desarrollo/ficha-parque-mundo-aventura.md`.
  Nota: coordenadas corregidas a lat 4.622054, lng -74.134912 (el borrador
  inicial apuntaba ~4 km al norte).
- **Evidencia:** Escudo GOLD PASS: node --check OK en los 3 scripts;
  ASCII-safety 0 bytes >127 en los 3; smoke test 15 checks PASS + balance
  de divs open=339 close=339 diff=0. Carga en prod via loader (DELETE+POST
  Bearer exploraco12345): destino creado id 47692fc4-1775-47e2-96fd-36eaae5004b4
  status=published destacado=True. Verificacion en vivo 2026-09-07:
  /parque-mundo-aventura.html = 200 con las 15 secciones del motor sitio
  (hero con chip de dominio y boton "Sitio web oficial", rating 0.0/0
  resenas); /api/destinos?categoria=sitio lista el slug (name=Parque Mundo
  Aventura, cat=sitio, id 47692fc4-...); sitemap.xml incluye el slug
  (lastmod 2026-09-07).

### TSK-080: Milestones v2 - Plan Maestro de Gaming (Steam + SKATE + Albion)
- **Estado:** COMPLETADA (implementado y verificado localmente 2026-09-07;
  pendiente migracion 007 en Neon + deploy)
- **Detalle:** Implementacion del Plan Maestro de Gaming del prompt
  `prompt gsming.txt` con las 3 respuestas de calibracion de Javier
  (1. Own the Spot BAJO DEMANDA; 2. Tabla de Destino como mapa de nodos
  SVG; 3. Patrocinios con opcion abierta, solo diseno). Cambios:
  1. `api/interacciones.js` (v6): helpers `esLiderDeCiudad`/`xpConMultiplicador`
     (multiplicador x1.1 sobre XP base en la ciudad del lider, aplicado en
     los 4 POST: resena/guardado/visita/rating; degrada a XP base si la
     migracion 007 no corrio); GET `tipo=tabla_destino` (3 senderos
     Explorador/Critico/Organizador con fama derivada de xp_ganado + mapas
     tematicos, niveles FAMA_TIERS por lectura, `patrocinios: []`); POST
     `tipo=review_voto` (upvote util, dedup PK usuario_id+resena_id -> 409,
     403 self-vote, 404 resena inexistente, 503 si migracion 007 pendiente);
     3 misiones nuevas (`mis_own_spot_bogota` +75, `mis_gran_arquitecto`
     +50, `mis_itinerario_perfeccion` +60 con condicion pragmatica: >=4
     visitas a destinos con tags.itinerario) y 3 logros nuevos
     (`logr_spot_domado` +50, `logr_especialista_gastro` +40,
     `logr_cazador_rarezas` +100 con rareza global <5%) -> LOGROS 19.
  2. `api/usuarios.js`: NIVELES 6 -> 15 (umbrales 0/100/250/450/700/1000/
     1400/1900/2500/3200/4000/5000/6500/8500/11000) en 3 Eras
     (Mundano/Patrocinado/Organizador).
  3. `api/pagina-destino.js`: query `spotLider` bajo demanda (try/catch ->
     null si migracion 007 no corrio) + bloque HTML "Lider del spot" en
     secResenas (solo categorias != blog) + 8vo parametro opcional
     `spotLider` en `buildHTML`.
  4. `index.html`, `mi-perfil.html`, `comunidad.html`: XP_LEVELS 15;
     XP_BADGES sin los 5 badges muertos (caribe/andino/compartido/
     plan_maestro/social); mi-perfil anade seccion "Tabla de Destino" con
     arbol SVG y corrige `rareza_global` -> `rareza_pct` y el contador
     desbloqueados/total (19).
  5. `db/migrations/007_milestones_v2.sql` (nuevo): `interacciones.votos_utiles`
     + indice parcial, tabla `resena_votos` (PK usuario_id+resena_id),
     `usuarios.patrocinios jsonb`. Idempotente IF NOT EXISTS.
     PENDIENTE de aplicar en Neon (lo ejecuta Javier en la consola).
  6. `scripts/smoke_test_milestones_v2.js` (nuevo) y
     `scripts/test_logros_catalogo.js` (actualizado a 19 trofeos).
  Spec: `docs/superpowers/specs/2026-09-07-milestones-v2-gaming-design.md`.
  ADR: DECISIONS.md ADR-014 (el codigo lo referencia como "ADR-013" en
  comentarios; ver nota de numeracion en el ADR).
- **Evidencia:** `scripts/smoke_test_milestones_v2.js` 28 checks PASS
  (ejecutado localmente: NIVELES 15 con umbrales del prompt, tabla_destino
  con 3 senderos + fama organizador = mapas*40 + destinos*5, patrocinios [],
  review_voto 400 sin usuario_id, Own the Spot degrada a false sin migracion
  007, bloque "Lider del spot" presente/con hint x1.1/ausente sin lider/
  ausente en blog, balance de divs 95/95). `scripts/test_logros_catalogo.js`
  12/12 PASS (19 trofeos: 6 general + 5 conteo + 5 ciudad + 3 Milestones v2,
  ids unicos, shape, tiers, DAG, Promise, CIUDAD_NORM, 5 ciudades). Escudo
  GOLD: node --check 5/5; ASCII-safety 0 bytes >127 en api/*.js (1
  doble-escape preexistente confirmado en pagina-destino.js:1791 que NO es
  de esta tarea); smokes 4/4. QA-auditor: veredicto RECOMENDACION con
  hallazgos H-1 (self-vote) y H-2 (escritura silenciosa) YA CORREGIDOS en
  el codigo (403 y 503 respectivamente), H-3 (contador 16 -> total)
  corregido en mi-perfil.html, H-4 (GUIA_DE_DESARROLLO.md seccion 7.7)
  corregido.

### TSK-081: Pagina dinamica cinemateca-de-bogota.html (centro cultural de las artes audiovisuales)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de la Cinemateca de Bogota (cat sitio, slug
  `cinemateca-de-bogota`, `status='published'`, `destacado=true`, rating 0).
  Datos investigados por Gemini v2 (ficha JSON) y convertidos al contrato .md
  validado con `validate_ficha.js` (PASS). 4 salas de proyeccion (Sala Capital
  272 personas), BECMA, laboratorios Idartes, 3 secretos (MIDBO, consulta
  gratuita, laboratorios), 3 entradas, 1 tour (rating ''/review_count 0, ADR-009),
  3 equipamiento, 3 itinerario, 3 dificultad_tags, 5 FAQs, fotos reales
  verificadas HEAD 200 (BUG-022). `fauna_flora: ''` (paridad admin: el campo no
  se envia cuando esta vacio; evita seccion fantasma en el renderer). Archivos:
  `scripts/seed-cinemateca-de-bogota.js`, `scripts/load-cinemateca-de-bogota-api.js`,
  `scripts/smoke_test_cinemateca.js` y `exploraco desarrollo/ficha-cinemateca-de-bogota.md`.
- **Evidencia:** Escudo GOLD PASS: node --check OK en los 3 scripts; ASCII-safety
  0 bytes >127 en los 3. Smoke test 13 checks PASS (incluye seccion FAQ via
  det.faqs, degradacion sin seccion fauna con lista vacia, instagram como
  `instagram.com/cinematecabta`) + balance de divs open=258 close=258 diff=0.
  Carga en prod via loader (DELETE+POST Bearer exploraco12345): destino creado
  id 62a1099c-3bbf-43c3-9dcc-a892e67a4f64 status=published destacado=True.
  Verificacion en vivo 2026-09-07: /cinemateca-de-bogota.html = 200 (65KB) con
  las secciones del motor sitio y divs 291/291; /api/destinos lista el slug;
  sitemap.xml incluye el slug (priority 0.80).

### TSK-082: Pagina dinamica centro-cultural-delia-zapata-olivella.html (complejo cultural en La Candelaria)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Centro Cultural Delia Zapata Olivella (cat sitio,
  slug `centro-cultural-delia-zapata-olivella`, `status='published'`,
  `destacado=true`, rating 0). Complejo estatal de +15.000 m² en La
  Candelaria (Carrera 6 # 5-22, junto al Teatro Colon), extension del Teatro
  Colon/Ministerio de las Culturas. 3 salas (Sala Delia Zapata +400 personas,
  Sala Fanny Mikey caja negra, Ensayadero) + Plaza del Centro. 3 secretos
  (tributo a Delia Zapata, puente patrimonial con Teatro Colon, acustica de
  la Sala Fanny Mikey), 2 entradas, 1 tour (rating ''/review_count 0, ADR-009),
  3 equipamiento, 3 itinerario, 3 dificultad_tags, 5 FAQs. Investigacion de
  Gemini (ficha JSON) convertida al contrato .md validado con
  `validate_ficha.js` (PASS). Fotos reales verificadas HEAD 200 (BUG-022): no
  existe foto del edificio nuevo en Commons, se usaron 5 reales coherentes
  (fachada Teatro Colon 2024 como HERO, interior Teatro Colon, La Candelaria
  desde carrera 4, Plaza de Bolivar 2024, Casa de Delia Zapata Olivella).
  `fauna_flora: ''` (paridad admin). Archivos:
  `scripts/seed-centro-cultural-delia-zapata-olivella.js`,
  `scripts/load-centro-cultural-delia-zapata-olivella-api.js`,
  `scripts/smoke_test_delia_zapata.js` y
  `exploraco desarrollo/ficha-centro-cultural-delia-zapata-olivella.md`.
- **Evidencia:** Escudo GOLD PASS: node --check OK en los 3 scripts;
  ASCII-safety 0 bytes >127 en los 3. Smoke test 13 checks PASS + balance de
  divs open=258 close=258 diff=0. Carga en prod via loader (DELETE+POST Bearer
  exploraco12345): destino creado id 49dfe37c-6c55-471d-830c-c062533286a1
  status=published destacado=True. Verificacion en vivo 2026-09-07:
  /centro-cultural-delia-zapata-olivella.html = 200 (64KB) con las secciones
  del motor sitio y divs 292/292; /api/destinos lista el slug (total 175);
  sitemap.xml incluye el slug.

### TSK-083: Agenda cultural - soporte multidia, vista por dia y categorias claras
- **Estado:** COMPLETADA
- **Detalle:** Rework de la agenda cultural (seccion de `index.html` + pagina
  completa `agenda.html` + conector `index-api-connector.js`) para que un
  evento que dura varios dias (`tags.fecha_inicio` -> `tags.fecha_fin`,
  inclusive) aparezca en TODOS los dias y meses en los que esta vigente.
  Cambios:
  - Nuevo `agenda-shared.js` (raiz, ASCII-safe, IIFE -> `window.AgendaUtil`):
    `normDates`, `evActiveOn` (inicio<=dia<=fin), `evActiveMonths` (cruza de
    mes), `evRangeText` ('12 Sep', '12-13 Sep', '28 Ago - 6 Sep'),
    `detectEventCat` (keywords priorizadas musica/cultura/gastro/naturaleza/
    festival con fold sin tildes) y soporte a recurrentes anuales
    (day/month[/dayEnd/monthEnd]) resueltos al anio consultado.
  - `index.html`: strip por dia con navegacion semana anterior/siguiente +
    boton "Hoy"; los puntos marcan TODOS los dias vigentes; clic en dia filtra
    eventos activos ese dia (dedupe); tarjeta muestra rango + chip "En curso";
    orden cronologico; filtros categoria/ciudad conservan el dia elegido;
    nuevo filtro "🎭 Cultura" (exposiciones/patrimonio/teatro/danza).
  - `agenda.html`: misma logica; el evento aparece en cada mes activo
    (agrupacion por `evActiveMonths`); strip por dia con "Hoy" y dia<->
    (`setDayFilter` limpia el filtro de mes); rango en tarjeta + "En curso";
    nuevo filtro "🎭 Cultura"; `loadApiEvents` usa inicio+fin, hora real
    (`d.horario` en `time`) y sede en `loc`.
  - BUG preexistente corregido: `loadApiEvents` usaba `d.nombre`/`d.ciudad`
    (undefined, la API expone `name`/`city`) -> nombres "undefined" en la
    agenda completa. Ahora `d.name`/`d.city` con fallback.
  - Rangos anuales anadidos a festivales hardcodeados: Carnaval (14-17 Feb),
    Feria de las Flores (1-10 Ago), Feria de Cali (25-30 Dic), Festival
    Vallenato (27-30 Abr).
- **Evidencia:** `scripts/smoke_test_agenda.js` 30/30 PASS (multidia antes/
  inicio/medio/fin/despues, cruce de mes Ago+Sep, textos de rango, recurrentes
  anuales, deteccion de categoria). Verificado con datos reales de
  `/api/destinos?cat=evento`: 23/50 eventos activos el 7-sep-2026 (transitos
  3-12 Sep, patrimonio 1-30 Sep, jazz expandido 4-27 Sep, guaduas 4-11 Sep,
  medejazz 5-19 Sep, teatro libre 31 Ago - 7 Sep); ulibro aparece en Ago+Sep
  y NO el 7 sep (termina el 6); categorias detectadas 50 eventos = musica 15,
  cultura 11, festival 20, naturaleza 2, gastro 2. node --check OK en
  agenda-shared.js / index-api-connector.js / smoke_test_agenda.js; parse de
  scripts inline de index.html y agenda.html OK; ASCII 0 bytes >127 en
  agenda-shared.js.

### TSK-084: Agenda cultural - tarjetas de evento sin doble enlace
- **Estado:** COMPLETADA
- **Detalle:** En `agenda.html` cada tarjeta de evento era un `<a>` al evento
  que ademas contenía OTRO `<a class="ev-link-btn">Ver detalles →</a>` con la
  misma URL (HTML anidado inválido: el navegador cierra el enlace externo y se
  renderizaban DOS bloques clicables -> "una tarjeta y otra que dice ver
  detalles", ambas al mismo evento). En `index.html` ocurría lo mismo con un
  `<button class="ag-ev-action">` dentro del `<a>`. Cambios:
  - `agenda.html` `evCard()`: se elimina el `<a>` interno; la tarjeta queda
    como un único `<a class="ev-card">`. El CTA pasa a `<span class="ev-cta">`
    no interactivo (affordance dorado + micro-interacción
    `.ev-card:hover .ev-cta` translateX). "Próximamente" queda como
    `<span class="ev-cta external">` informativo.
  - `index.html` `renderAgenda()`: el `<button>` pasa a `<span class="ag-ev-cta">`
    (variantes gold/outline, sin cursor:pointer, sin stopPropagation);
    hover de la tarjeta desplaza la flecha.
- **Evidencia:** parse de scripts inline de index.html y agenda.html OK (vm);
  sin referencias residuales a `.ev-link-btn`/`.ag-ev-action`; smoke
  `scripts/smoke_test_agenda.js` 30/30 PASS (lógica no cambia).

### TSK-085: Ingesta automatizada de eventos a la agenda (CLI + skill)
- **Estado:** COMPLETADA
- **Detalle:** Herramienta para subir eventos a la agenda cultural en lote
  sin escribir seed+loader+smoke por evento. La agenda ya soporta multidia
  (fecha_inicio -> fecha_fin) y categoria auto-detectada. Componentes:
  - `scripts/validate_eventos.js`: valida un array JSON de eventos (slug
    `[a-z0-9-]`, nombre, ciudad, lat/lng != 0,0, fecha_inicio/fecha_fin
    `YYYY-MM-DD` con fin >= inicio, sede, arrays opcionales, tipo_evento
    valido, slugs unicos). `--prod` avisa colisiones y total vs la agenda.
  - `scripts/upload-eventos.js <archivo.json> [URL] [TOKEN] [--dry] [--seed]`:
    idempotente DELETE+POST por slug a `/api/admin-destinos` (Bearer
    `exploraco12345`, default `https://exploraco.vercel.app`); defaults
    `categoria_slug='evento'`, `status='published'`, `destacado=false`
    (override), `fecha_fin`=inicio si falta; `--dry` valida sin subir;
    `--seed` genera `scripts/seed-eventos-<fecha>.js` (upsert `ON CONFLICT
    slug`, faqs en destinos_detalles, fotos en destinos_fotos, ASCII-safe).
  - `eventos/eventos.example.json`: plantilla con schema completo y 2
    ejemplos (1 dia y multidia que cruza mes). `eventos/eventos.json` arranca
    en `[]`.
  - `.opencode/skills/ingest-eventos/SKILL.md`: wrapper de agente (recibir
    eventos -> generar eventos.json -> validar -> subir --seed -> verificar
    en /api/destinos?cat=evento y en la agenda -> docs).
  - `agenda.html`: `?cat=evento&limit=50` -> `limit=200` para que los lotes
    aparezcan completos.
- **Evidencia:** node --check OK en validate_eventos.js y upload-eventos.js;
  ASCII 0 bytes >127 en ambos. validate PASS en eventos.example.json (2) y
  eventos.json (0); FAIL (exit 1) contra payload invalido (9 errores: slug,
  ciudad, 0,0, fechas, tipo_evento, lineup, duplicado). upload `--dry --seed`
  reporta el lote y genera seed valido (node --check OK, ASCII 0) sin tocar
  produccion (el seed de prueba con eventos EJEMPLO se eliminó). agenda.html
  parse OK; smoke_test_agenda.js 30/30 PASS.

### TSK-086: Prompt Gemini para investigacion de eventos (lote -> eventos.json)
- **Estado:** COMPLETADA
- **Detalle:** Prompt maestro hermano del de fichas para investigar LOTES de
  eventos en Google Gemini y obtener directo el JSON de `eventos/eventos.json`.
  - Nuevo `.opencode/skills/gemini-research/prompts/GEMINI_EVENTOS_PROMPT.md`:
    plantilla generica por lote (N eventos, ciudad, rango de fechas, tipos).
    Seccion de fuentes (Portal Bogota, Idartes, SCRD, Visit Bogota,
    TuBoleta/Ticketmaster, webs oficiales; NO Instagram). Reglas: fechas
    `YYYY-MM-DD` con fin >= inicio (multidia), sede, `tipo_evento` obligatorio
    (fuerza festival/musica/gastro/naturaleza/cultura en la agenda),
    coordenadas reales, sin ratings (ADR-009). Entrega: un unico bloque
    ```json ``` con el ARRAY copiable a eventos/eventos.json + seccion
    `## Fuentes` fuera del JSON. Fotos como `fotos_sugeridas[]`
    (`{tema, caption, nombres_archivo_wikimedia:["File:..."], es_hero}`), 1
    hero + galeria, con `foto_hero`/`fotos_galeria` VACIOS en el batch (el
    pipeline resuelve y verifica HEAD 200 por evento, BUG-022).
  - `ingest-eventos/SKILL.md`: FASE A (pasar el prompt a Gemini, guardar el
    bloque en eventos/eventos.json), FASE B (fotos por evento opcional:
    resolver fotos_sugeridas via API Wikimedia y re-subir), FASE C (validar
    --prod -> subir --seed -> verificar -> docs).
  - `eventos/eventos.example.json`: se anaden bloques `fotos_sugeridas` de
    ejemplo a los 2 eventos y faqs de ejemplo.
  - `scripts/validate_eventos.js`: validacion opcional de `fotos_sugeridas`
    (array; caption; nombres `File:...`; exactamente 1 `es_hero` cuando hay
    fotos).
- **Evidencia:** node --check OK y ASCII 0 en validate_eventos.js; validate
  PASS en eventos.example.json (2, con fotos_sugeridas 5/1 hero c/u); FAIL
  (exit 1, 3 errores) contra fotos mal formadas (sin prefijo File: y sin
  es_hero); upload --dry ignora fotos_sugeridas y reporta el lote;
  smoke_test_agenda.js 30/30 PASS.

### TSK-087: Lote real de 11 eventos subido a la agenda desde Gemini
- **Estado:** COMPLETADA
- **Detalle:** Primera ingesta real end-to-end: el usuario pego el prompt
  `GEMINI_EVENTOS_PROMPT.md` en Gemini, guardo el JSON en
  `eventos/eventos.json` y se subio a produccion con el pipeline de TSK-085.
  Lote: 11 eventos de Bogota para septiembre 2026 (feria gastronomica
  Sabores de Bogota 11-13 Sep [gastro, destacado], jazz fusion en Movistar
  Arena 8 Sep [musica], danza contemporanea Teatro Mayor 9-10 Sep [cultura],
  muestra de cine Teatro Gaitan 10-13 Sep [cultura], poesia BibloRed 12-13
  Sep [cultura], musica andina Teatro Colsubsidio 11 Sep [musica], MAMBO 8-13
  Sep [cultura], gala sinfonica Movistar 12 Sep [musica], jornada ambiental
  CEFE Fontanar 13 Sep [naturaleza], festival de piano Teatro Mayor 12-13 Sep
  [musica], feria de diseno Plaza de los Artesanos 11-13 Sep [cultura]).
  Fotos via `fotos_sugeridas` (ignoradas por el batch; FASE B pendiente).
- **Evidencia:** validate_eventos.js --prod PASS (11 validos, 0 colisiones;
  total pasa de 50 a 61 < 200). upload-eventos.js --seed -> 11/11 subidos
  (ids detallados en el log; seed generado `scripts/seed-eventos-2026-09-08.js`,
  node --check OK, ASCII 0). Verificado en prod: /api/destinos?cat=evento
  total 61; paginas 200 (feria-gastronomica-sabores-de-bogota-2026.html,
  muestra-cine-independiente-...html); categorias detectadas correctas
  (gastro/musica/cultura/naturaleza); multidia correcto (MAMBO activo 8,10 y
  13 Sep, no el 14; rango '8-13 Sep'; danza activa 9-10 Sep, no el 11).
- **Fix de pipeline:** `upload-eventos.js` parseaba los flags como posicionales
  (`--seed` se usaba como URL -> 'Failed to parse URL'); ahora los flags no
  desplazan archivo/URL/TOKEN. `validate_eventos.js`/`upload-eventos.js`
  reemplazan `process.exit()` por `process.exitCode` para evitar el crash de
  libuv en Windows tras fetch (exit code anormal -1073740791).
- **FASE B (fotos):** nuevo `scripts/resolver-fotos-eventos.js` (reutilizable)
  que resuelve `fotos_sugeridas` a URLs reales de Wikimedia (thumbs 960px +
  HEAD 200, BUG-022) con fallback por recinto (`tags.sede`). 10/11 eventos con
  fotos reales; solo `concierto-musica-andina-teatro-colsubsidio-2026` queda
  sin foto (no existe foto del recinto en Commons). Se corrigio un match
  incorrecto (jazz/gala apuntaban a un palacio de Madrid) usando las fotos
  reales del Movistar Arena Bogota. Re-subidos 11/11 (DELETE+POST) y seed
  `scripts/seed-eventos-2026-09-08.js` regenerado (node --check OK, ASCII 0).

### TSK-088: Conector Hostal Terraza -> agenda (extraccion automatica)
- **Estado:** COMPLETADA
- **Detalle:** Nuevo `scripts/extraer-hostalterraza.js` que lee los eventos
  publicados de https://hostalterraza.vercel.app (tabla Supabase `eventos`,
  RLS anon de lectura publica, misma key que el sitio) y los fusiona en
  `eventos/eventos.json` con slug prefijo `ht-`. Filtros: solo proximos
  (fecha >= hoy), sin pruebas/demos, sin campanas (la binacional no tiene
  sede local; flag `--incluir-campanas`). Coordenadas via Nominatim (fragmento
  de calle + bounding box de Bogota para evitar matches errados como Fontibon);
  foto via `content.poster_url`/`imagen_url` con HEAD 200 (BUG-022). Mapeo:
  `tipo_evento` fiesta->musica, cine/cinematografia->cultura, campana->cultura,
  sin categoria->festival; `lineup` de `content.dj_lineup`, `categorias_entrada`
  de `content.boletos` (Preventa/Taquilla), `faqs` de `content.faq`; `web` al
  evento original. Salida: `eventos/hostalterraza.json` (lote normalizado) +
  fusion (reemplaza ht-* previos, conserva el resto). Flags: `--dry`.
  `ingest-eventos/SKILL.md` actualizado con FASE A2 (fuente externa).
- **Evidencia:** extraccion real -> 2 eventos `ht-*`:
  `ht-afromango-fest-kouj` (Afromango fest, 2026-09-11, musica, sede Calle 19
  #4-20 La casa del oso, lat 4.6044/-74.0696, foto i.ibb.co) y
  `ht-salsa-flow-nt65` (Tropilove, 2026-09-12, musica, sede calle 12B #5-07
  R10, lat 4.5988/-74.0727, foto i.ibb.co). validate_eventos.js --prod PASS
  (13 validos; los 11 previos se re-suben idempotente). upload-eventos.js
  --seed -> 13/13 subidos (total eventos prod 63). Paginas
  ht-afromango-fest-kouj.html y ht-salsa-flow-nt65.html = 200 con foto.
  node --check OK y ASCII 0 en extraer-hostalterraza.js.

### TSK-089: Comunidad social real - chat y planes con gaming completo
- **Estado:** COMPLETADA (implementado y verificado localmente 2026-09-08;
  pendiente migracion 008 en Neon + deploy)
- **Detalle:** Rediseno del apartado social de comunidad.html (tabs Chat y
  Planes) conectado al backend real de Neon, con gaming completo (XP,
  misiones, logros). Respuestas de calibracion de Javier: (1) XP de chat
  +2 por mensaje con tope diario de 20 XP (anti-farming en
  `usuarios.progreso_social`); (2) crear plan gateado por el chat
  desbloqueado (nivel 3 / 250 XP), unirse es libre para registrados;
  (3) sin sesion = chat y planes bloqueados con CTA de login (se elimina
  el demo local de ambos tabs; Ranking conserva su fallback).
  Cambios:
  1. `db/migrations/008_comunidad_social.sql` (nuevo): `chat_salas`
     (con seed idempotente de 6 salas del sistema, emojis `E'\U...'`),
     `chat_mensajes` (moderacion por fijado/activo soft-delete),
     `planes_viaje` + `planes_miembros` (PK compuesta), `usuarios +
     progreso_social jsonb`. Idempotente (ADR-008), ASCII 0.
  2. `api/interacciones.js`: helpers `misionCompletada`/`chatXpDisponible`/
     `registrarChatXp`; GET `chat_salas`, `chat_mensajes`, `planes`,
     `planes_mios`; POST `chat_sala` (gate crear_chat), `chat_msg` (gate
     chat, +2 XP tope 20/dia), `chat_mod` (gate moderador_chat: fijar/
     eliminar), `plan_crear` (gate chat, valida destino/cupos 1-50),
     `plan_unirse` (dedup 409, 403 plan propio, 409 lleno), `plan_salir`;
     MISIONES +3 (mis_chat_activo +20, mis_plan_creador +25,
     mis_plan_unido +15); LOGROS +3 (logr_social_chat +30,
     logr_social_plan +35, logr_anfitrion +50) -> LOGROS 22. Sin endpoint
     nuevo (presupuesto 8/8, ADR-010).
  3. `comunidad.html`: tabs Chat/Planes consumen la API (polling 5s,
     sin websockets en Hobby), envio optimista + XP toast, moderacion
     condicional, formulario de plan (no `prompt`), fix XSS (`esc()` en
     todo texto de usuario). Div balance 86/86.
  4. `scripts/test_logros_catalogo.js` (19 -> 22) y
     `scripts/smoke_test_comunidad.js` (nuevo, 30 checks).
- **Evidencia:** `node --check api/interacciones.js` OK; ASCII 0 bytes
  >127 y 0 backticks; `test_logros_catalogo.js` 12/12 PASS (LOGROS 22);
  `smoke_test_comunidad.js` 30/30 PASS (catalogo, 4 GET, 6 POST
  registrados, gates 403, anti-farming); divs comunidad 86/86.
  Espec: `docs/superpowers/specs/2026-09-08-comunidad-chat-planes-
  backend-design.md`; ADR-015 en DECISIONS.md. Pendiente BLOQUEANTE:
  aplicar la migracion 008 en Neon antes del deploy.
  APLICACION DE LA MIGRACION: exclusivamente en el **editor SQL de Neon**.
  Los runners locales que exigen result set por sentencia fallan con las
  sentencias DDL (`result.rows` undefined -> error "Cannot read properties
  of undefined (reading 'map')"). Es idempotente; re-ejecutar el archivo
  completo es seguro tras un fallo parcial.

### TSK-090: Subcategorias en tags (ADR-016) - implementacion Fase 1-3 en working tree
- **Estado:** EN PROGRESO (implementacion Fase 1-3 lista local 2026-09-10,
  sin commitear; pendiente commit/deploy + ejecutar reclasificacion en
  produccion con DATABASE_URL y aprobacion de Javier + verificacion pre/post)
- **Detalle:** Alcance REAL ejecutado del ADR-016 (verificado contra archivo
  ADR-006):
  1. `admin.html`: 3 selects `f-subcategoria-*` (sitio L1321 con onchange
     `applySubcategoriaSitio()`, comida L1182, evento L1496) registrados en
     `CATEGORY_TAG_FIELDS.<cat>` (L2591/2632/2646); visibilidad condicional de
     sub-tabs `especifico-sitio` via `SITIO_ALL_TABS` (L4474) +
     `applySubcategoriaSitio()` (L4475). Balance divs 0 (653/653).
  2. `api/pagina-destino.js`: `SUBCAT_LABEL` (21 labels, L20-28),
     `SITIO_SECCIONES_POR_SUBCATEGORIA` (L42-52), chip `.subcat-chip` en el
     hero (L2007-2008, CSS scoped L175), gating `subcatActiva()` (L1461) sobre
     8 secciones legacy (dificultad, entradas, tours, checklist, itinerario,
     fauna, secretos, regulaciones) + 13 secciones nuevas condicionales
     (colecciones, recorridos, accesibilidad, programacion, musica_vivo, cover,
     codigo_vestimenta, happy_hour, atracciones, horarios_zona,
     actividades_gratis, que_ver, contexto). H1: `cover` se lee como objeto
     `{valor, nota}` con fallback a `cover_valor`/`cover_nota` planos legacy
     (L599-601). H2: las 13 nuevas usan `subcatActiva()`. Fallback sin
     subcategoria = render legacy intacto (L611-614, regresion cero).
  3. `api/publicar-lugar.js`: `SUBCAT_LISTA` (L29-33) valida contra la lista
     cerrada de la categoria final y solo persiste si matchea (L104-107).
  4. `publicar.html`: 3 selects (L250/267/280) con show/hide por chip
     (L829-833), `subcatResumen()` (L963-965), payload `subcategoria` (L1076).
  5. `.opencode/skills/gemini-research/scripts/validate_ficha.js`:
     `SUBCATEGORIAS` (L46-58), validacion backward-compatible (ausencia de
     subcategoria NO es error, L114-122).
  6. `scripts/reclasificar-subcategorias.js` (NUEVO): idempotente,
     `--dry-run` (default) / `--apply` / `--local`, merge JSONB (ADR-003),
     inferencia keyword->subcategoria (tipo_actividad > nombre > lead, orden
     especifico->generico, NFD + limites de palabra), log en
     `scripts/logs/reclasificar-subcategorias-2026-09-10.log`.
- **Evidencia:** dry-run local sobre 84 seeds: 74 inferidos, 10 sin-match
  (candelario + 9 eventos multiformato), 0 skipped (resumen
  `total=84 asignar=74 aplicado=0 skip=0 sin_match=10 modo=dry-run`).
  ADR-016 en DECISIONS.md (Estado actualizado a Fase 1-3 completada).
  Pendiente: (a) commit + push del working tree; (b) revisar los 10 sin-match
  con Javier; (c) aplicar reclasificacion en produccion
  (`DATABASE_URL=... node scripts/reclasificar-subcategorias.js --apply`);
  (d) Escudo GOLD + smoke de buildHTML() de las 3 categorias con y sin
  subcategoria antes de cerrar.

---

### TSK-091: Pagina dinamica bahia-malaga.html (PNN Uramba Bahia Malaga)
- **Estado:** COMPLETADA (2026-09-09)
- **Detalle:** Pagina del Parque Nacional Natural Uramba Bahia Malaga (cat
  sitio, slug `bahia-malaga`, `status='published'`, `destacado=true`,
  rating 0) con datos del PNN: 47.094 hectareas en Buenaventura (Valle del
  Cauca), santuario de la ballena jorobada (Megaptera novaeangliae) entre
  julio y octubre, manglares, esteros y cascada La Sierpe, comunidades
  afrodescendientes de Juanchaco/Ladrilleros/La Plata/Puerto Chiple.
  Coordenadas 3.9333, -77.35. TASA muelle $20.000 COP + tours desde
  $70.000-80.000 COP. Fuente: ficha-bahia-malaga.json (ficha completa,
  sin re-investigacion). Archivos: `scripts/seed-bahia-malaga.js`
  (upsert ON CONFLICT slug, modo `--dry`, ASCII-safe 0/0/0),
  `scripts/load-bahia-malaga-api.js` (DELETE+POST Bearer exploraco12345)
  y `scripts/smoke_test_bahia_malaga.js` (buildHTML en sandbox vm).
  Fotos: las 10 URLs de FOTOS_SUGERIDAS de la ficha daban `missing` en
  Wikimedia Commons -> se resolvieron 5 reales verificadas HEAD 200
  (BUG-022): HERO "Ballena jorobada y ballenato en Bahia Malaga" (la unica
  foto georeferenciada del parque en Commons), ballena jorobada yubarta,
  manglar del Pacifico colombiano, calle de Juanchaco y playa de
  Juanchaco. FAQS 5. Rating 0 (ADR-009, sin resenas sembradas).
- **Evidencia (Escudo GOLD):** `node --check` PASS en los 3 archivos;
  ASCII-safety 0 bytes >127 / 0 dobles escapes / 0 backticks en los 3;
  smoke `scripts/smoke_test_bahia_malaga.js` 15/15 PASS con balance de
  divs 361/361. Carga en prod via loader: POST /api/admin-destinos = OK
  (id 1d233452-9728-4e90-be80-f5b611337129, status published, destacado
  true). GET /bahia-malaga.html = 200 (79.763 bytes) con las 9 secciones
  del motor sitio (entradas, tours, fauna, secretos, itinerario,
  checklist, faq, galeria, mapa); /api/destinos?categoria=sitio lista el
  slug (name "Parque Nacional Natural Uramba Bahia Malaga", rating 0,
  total sitio 74); sitemap.xml incluye el slug (HTTP 200).

---

### TSK-092: Sistema de Albums Fotograficos [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-09; pendiente migracion 009 en Neon + deploy, segun header de api/interacciones.js v8)
- **Prioridad:** Alta
- **Fecha:** 2026-09-09
- **ADR:** ADR-017
- **Archivos modificados:**
  - db/migrations/009_albumes.sql (NUEVO)
  - api/interacciones.js v7 -> v8 (+604 lineas)
  - admin.html (+99 lineas)
  - comunidad.html (+136 lineas)
  - mi-perfil.html (+190 lineas)
  - api/pagina-destino.js (foto destacada ADR-017 P11)

- **Subtareas completadas:**
  1. Migracion SQL 009_albumes.sql (3 tablas + 1 columna + 6 indices)
  2. Backend: 5 GET + 8 POST + 6 misiones + 7 logros
  3. Admin: Foto Top + Moderacion
  4. Mapa audiovisual en comunidad.html (Leaflet + MarkerCluster)
  5. Mis Albumes en mi-perfil.html (grid + modales)
  6. Foto destacada en pagina-destino.js
  7. Tests actualizados
  8. Documentacion (ADR-017)

- **Nota de cierre (ADR-006, verificado contra archivo real):** la migracion
  `db/migrations/009_albumes.sql` existe en el repo; `api/interacciones.js`
  es v8 (header "Albums ADR-017: +6 misiones, +7 logros, +5 GET (albumes,
  album_detalle, multimedia_mapa, mi_feed_fotos, fotos_top), +8 POST
  (album_crear, album_agregar_foto, album_voto, album_quitar_foto,
  album_editar, album_eliminar, admin_foto_top, admin_moderar_foto_album)")
  y declara "Requiere migracion 009_albumes.sql antes de desplegar";
  admin.html tiene la seccion Foto Top del Destino + adminModerarFotoAlbum;
  comunidad.html tiene el tab Mapa (`#cpanel-mapa`, fix z-index Leaflet,
  GET `tipo=multimedia_mapa`); mi-perfil.html tiene "Mis Albumes" con
  modales crear/detalle; api/pagina-destino.js tiene la foto destacada
  (ADR-017, P11).

- **Pendiente para V2:**
  - Visibilidad public/unlisted/privado de albumes
  - Boton "Reportar" para fotos ofensivas
  - Upload real (Cloudinary/R2)
  - Busqueda de albumes

---

### TSK-093: Capa multimedia + drawer del mapa cultural [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-10; requiere deploy de api/interacciones.js con fix UNION, ver BUG-030)
- **Prioridad:** Alta
- **Fecha:** 2026-09-10
- **Spec:** docs/superpowers/specs/2026-09-10-multimedia-mapa-cultural-drawer.md
- **Archivos modificados:**
  - index.html (capa multimedia Leaflet + drawer lateral fijo)
  - index-api-connector.js (toMapPlace foto/photos + bloque MAPA_MEDIA)
  - api/interacciones.js (fix UNION types de multimedia_mapa, BUG-030)

- **Subtareas completadas:**
  1. Capa de pines multimedia en el mapa Leaflet de index.html
     (foto/video/audio con divIcon de colores y toggle por tipo)
  2. Drawer lateral fijo con datos del destino (foto hero, rating, precio,
     lead, link) + tabs Fotos/Videos/Audios con lightbox, embed de
     YouTube/Vimeo y player de audio
  3. index-api-connector.js propaga `foto` y `photos[]` en `toMapPlace()`
     y puebla `MAPA_MEDIA[]` desde el endpoint publico
     GET /api/interacciones?tipo=multimedia_mapa
  4. Fix UNION types en api/interacciones.js (BUG-030): `a.id::text AS
     origen_id` en la rama de albumes

- **Nota de cierre (ADR-006, verificado contra archivo real):** index.html
  tiene `MAPA_MEDIA` (L1514) y el filtro `MAPA_MEDIA_TIPO` (L1516) con
  re-sync de la capa multimedia (L2636); index-api-connector.js
  `toMapPlace()` (L72) emite `foto` (L88, `item.foto_hero || item.foto`)
  y `photos[]` (L92, slice 8), y el bloque 3b (L256-276) consume el
  endpoint publico y puebla `MAPA_MEDIA` via `replArr` (L271);
  api/interacciones.js en el UNION ALL de `multimedia_mapa` castea
  `a.id::text AS origen_id` (L1484) frente a `d.slug AS origen_id`
  (L1496); la spec del drawer existe en
  docs/superpowers/specs/2026-09-10-multimedia-mapa-cultural-drawer.md.

- **Pendiente:**
  - Deploy de api/interacciones.js (fix UNION) y verificacion en
    produccion de la capa multimedia y el drawer

---

### TSK-094: Gamificacion v4.0 -- consumibles, economia de XP, 20 niveles, cromos y pandillas [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-10; pendiente aplicar migracion 010 en Neon + deploy)
- **Prioridad:** Alta
- **Fecha:** 2026-09-10
- **ADR:** ADR-018
- **Spec:** docs/superpowers/specs/2026-09-10-gamificacion-v4-design.md
- **Prompt origen:** prompt gamming.txt (respuestas de Javier: 10 consumibles, 20 niveles confirmados, de-nivel con revocacion, cromos/pandillas completos, precios editables desde admin)

- **Archivos modificados:**
  - db/migrations/010_gamificacion_v4.sql (NUEVO, 9 tablas + ALTER + seed)
  - docs/superpowers/specs/2026-09-10-gamificacion-v4-design.md (NUEVO)
  - api/interacciones.js (v8 -> v9: +5 GET, +8 POST, tabla_destino 5 senderos, retos de parche)
  - api/usuarios.js (NIVELES 20 + BUG-1 conMisiones merge + calcularEra)
  - api/admin.js (+4 endpoints CRUD consumibles)
  - admin.html (screen Consumibles con precios editables)
  - mi-perfil.html (vitrina 20 niveles + Tienda/Inventario/Mis Cromos)
  - comunidad.html (tab Pandillas + retos)
  - index.html (XP_LEVELS 20)
  - usuario-session.js (gastarXp + CAPACIDADES_POR_NIVEL + XP_LEVELS 20)
  - scripts/smoke_test_gamificacion_v4.js (NUEVO)
  - scripts/smoke_test_perfil_progreso.js, smoke_test_milestones_v2.js, smoke_test_comunidad.js, verify_comunidad_prod.js (conteos stale corregidos)

- **Subtareas completadas:**
  1. Spec tecnica v4.0 + revision arquitectonica (2 bugs bloqueantes detectados y corregidos)
  2. Migracion 010 (consumibles, ledgers, cromos, pandillas, retos, cromo_intercambios)
  3. Backend v9 (economia de XP con de-nivel, cromos probabilisticos, pandillas completas)
  4. Admin: CRUD de consumibles con precios editables
  5. Frontend: vitrina 20 niveles, tienda/inventario, cromos, pandillas
  6. Smokes oficiales (95/95) + correccion de regresiones
  7. ADR-018 + docs

- **Verificacion:** Escudo GOLD node --check 4/4; ASCII-safety 0 bytes >127 en api/*.js; smoke_test_gamificacion_v4.js 95/95 PASS; smokes de regresion OK.

- **Pendiente (BLOQUEANTE):** aplicar db/migrations/010_gamificacion_v4.sql en Neon (Javier) + commit/deploy y verificacion en vivo.

---

### TSK-095: Refactor UI/UX ficha de destino (prompt cambios.txt) -- verificado admin, hero HQI, popover Guardar y galeria con lightbox [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-11)
- **Prioridad:** Alta
- **Fecha:** 2026-09-11
- **Prompt origen:** `prompt cambios.txt` (requerimientos UI/UX de la ficha dinamica + sistema de verificado manual admin)
- **Archivos modificados (3, Escudo GOLD LIMPIO):**
  - api/pagina-destino.js (motor de render de la ficha)
  - admin.html (checkbox `f-verificado` + wiring completo, divs 716/716)
  - api/admin-destinos.js (columna `verificado` gestionada, patron de `destacado`)

- **Subtareas completadas:**
  1. **Hero HQI (remueve TSK-075):** se eliminan los chips de resenas, precio "desde", duracion y del link web (este se centraliza en la botonera); se agrega chip de direccion fisica con fallback `d.address || d.barrio` (L764); se conservan ciudad/region y horario.
  2. **Seccion "Sobre este lugar":** se elimina el `slead` (el lead se mantiene solo en el hero); nuevo subtitulo estilizado `.sintro` (CSS L231, borde dorado + italica) con apertura de la descripcion (150 chars, fallback a highlight, solo no-blog) (L801).
  3. **Botonera hero:** Sitio Web y Contactar como unicos prominentes (`hbtn`); Como llegar, Ver galeria, Guardar y Estuve aqui en secundario (`hobtn`).
  4. **Boton Guardar -> popover `abrirPopoverGuardar()`** (L2257): seleccion "Tu Mapa" (`toggleGuardado`), checkboxes de mapas tematicos del usuario (`mapas_mios` + `mapa_detalle`) y crear nuevo mapa (`mapa_crear` + `mapa_agregar_destino`, L2301). Reutiliza la API existente de /api/interacciones (sin endpoints nuevos).
  5. **Franja naranja (gstrip):** conserva resenas y precio desde; ELIMINADO el boton "Reservar" (comentario L781-782; la reserva vive en secReservar); agregado boton "Ver galeria" con scroll directo a `#galeria` (L783, condicion `galAll.length > 1`).
  6. **Galeria:** foto principal grande `.gal-main` (L1484, click abre lightbox) + miniaturas `.gal-thumbs` (L1485) + boton "Ver galeria ampliada" (L1486) + **Lightbox** `#lb` (L1493) con navegacion prev/next, teclado (Esc/flechas) y cierre por fondo.
  7. **secMapa:** SOLO boton Google Maps (se eliminan WhatsApp y Telefono de ese bloque, comentario L1755-1756).
  8. **Limpieza de modulos:** eliminado el modulo inferior "Foto destacada" (`secFotoDestacada`, era ADR-017/P11; comentario L1936) y eliminado el boton Google Maps del bloque secContact (queda centralizado en secMapa, comentario L1941-1942).
  9. **Sin insignia publica de verificado:** por decision, el renderer NO emite ninguna insignia publica del campo `verificado` (0 ocurrencias de `verificado` en api/pagina-destino.js); es control interno del admin. Ver DECISIONS.md ADR-019.
  10. **admin.html:** nuevo checkbox `f-verificado` "Verificacion manual admin" en pestana General (L795-797) + wiring completo: clearForm (L2548-2549 `cbVer.checked=false`), loadForm (L2988-2989 `cbVer.checked = !!(p.verificado)`), savePlace (L3629-3630 `p.verificado = !!(cbVer && cbVer.checked)`), `_placeToAPI` (`verificado: p.verificado === true`, L5828) y `_mergeNeonRowIntoLocal` (L6145 con guard `!== undefined && !== null`).
  11. **api/admin-destinos.js:** `verificado` como COLUMNA gestionada con el patron identico a `destacado`: GET listado la incluye (L63), INSERT (L109/157 con `Boolean(b.verificado||false)`) y UPDATE con guard `b.verificado !== undefined` que permite persistir `false` y DESTILDAR (L256-258). La columna ya existia en Neon (la usan publicar-lugar.js y destinos.js).
  12. **ADR-019** en DECISIONS.md + NEXT.md con el backlog de hallazgos del QA.

- **Verificacion (Escudo GOLD):** `node --check` limpio en api/pagina-destino.js y api/admin-destinos.js; ASCII-safety 0 caracteres no-ASCII nuevos en los 3 (1 doble escape preexistente confirmado ~L2174 de addRvOptimista, NO de esta tarea; ver backlog en NEXT.md); balance de divs de admin.html 716/716 (delta 0, re-verificado contra archivo real ADR-006); smoke del renderer 28/28 PASS; flujo de verificado 6/6 PASS (checkbox admin -> INSERT/UPDATE de admin-destinos.js -> GET listado -> merge _mergeNeonRowIntoLocal, incluyendo desmarcar con UPDATE `false`).

- **Cierre de backlog (2026-09-11, verificacion exp-pickle 14/14 PASS):**
  - **`address` PERSISTIDA (cierra el riesgo activo 1 de NEXT.md):** `admin.html` `_placeToAPI` envia `address` en POST y PUT (L5807); `api/admin-destinos.js` INSERT persiste la columna (L103 columnas, `$10` en L114, L137 valores) y el fieldMap del UPDATE la incluye (L220); `api/pagina-destino.js` L764 sigue leyendo `d.address || d.barrio` (sin cambios). Columna lista via migracion `db/migrations/011_ficha_direccion_destinos.sql` (`ALTER TABLE destinos ADD COLUMN IF NOT EXISTS address TEXT;`, idempotente, patron ADR-008) -- PENDIENTE de APLICARSE en el editor SQL de Neon manualmente (NO pendiente de implementarse).
  - **Gate de la seccion "Reservar" DECIDIDO e implementado (ADR-020):** `secReservar` SOLO se renderiza cuando el destino tiene enlace real de Booking.com o Hostelworld (`bookingUrl || hwUrl`, api/pagina-destino.js L1747). El WhatsApp solo y el Airbnb solo ya no disparan la seccion (los sitios ya no muestran "Reservar" sobrante); WhatsApp y contacto siguen vivos via hero y secContact.
  - **Insignia publica de verificado: NO** (decidido; coherente con ADR-019 -- solo control interno del admin + columna, sin render publico).
  - **Estado final de la TSK-095:** implementada; pasos manuales pendientes = (1) HOTFIX BUG-031 en produccion (commit+push+redeploy del fix del JS inline del popover, ver bullet abajo -- TSK-095 YA desplegada CON el bug, produccion rota), (2) aplicar la migracion 011 en Neon + commit/push manual del usuario.
  - **BUG-031 (detectado post-deploy, corregido en codigo, PENDIENTE deploy manual):** el popover de Guardar de la TSK-095 (subtarea 4) llego a produccion con el JS inline de buildHTML() roto: el onchange de los checkboxes de mapas tematicos se ensamblaba en 3 lineas (L2288-2290) con comilla escapada mal formada (`\\\'` dentro de string single-quoted) -> `SyntaxError: Unexpected token` en la linea 126 del JS inline generado -> TODAS las paginas dinamicas sin funciones de cliente (`abrirPopoverGuardar is not defined`, Estuve aqui, submitRv, votarDID, lightbox; confirmado local 5 categorias y prod 4 paginas). Reportado por usuario en /parque-mundo-aventura.html. FIX en working tree SIN commitear: L2288-2290 colapsadas en 1 sola con entidad HTML `&#39;` (cliente queda `toggleMapaDest('ID',this.checked)`) + guard permanente `scripts/check_buildHTML_inline.js` (parsea con vm.Script todo inline de buildHTML: 8 funciones criticas + JSON-LD + divs; exit 0/1/2). Verificado: node --check PASS, ASCII 0/0/0, smoke parque 14/14, check inline 3 categorias 8/8, divs 364/364. Detalle completo: BUGS_HISTORICOS.md BUG-031; Escudo GOLD debe incluir `node scripts/check_buildHTML_inline.js`.
  - **Sigue abierto (higiene menor, NO bloqueante):** doble escape preexistente ~L2174 en `addRvOptimista` (ver backlog en NEXT.md, punto 3) y BUG-027 (boton Instagram en secContact).
  - **Nota posterior (TSK-105 / ADR-030, 2026-09-16):** las menciones a `secMapa` de las subtareas 7 y 8 quedaron OBSOLETAS: `secMapa` (id="mapa") se FUSIONO con `secTransporteHostal` en `secComoLlegar` (id="como-llegar", transporte arriba + mapa abajo), con una sola entrada de subnav `como-llegar` y un ancla legacy invisible `#mapa`. El texto historico se conserva por Cero Borrado Logico (Regla de Oro 3); el estado vigente esta en TSK-105 y BLUEPRINT.md seccion 5.

---

### TSK-096: Capa audiovisual estricta y paridad de drawer en el mapa cultural (prompt cambios.txt) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-12)
- **Prioridad:** Alta
- **Fecha:** 2026-09-12
- **Prompt origen:** `prompt cambios.txt` (requerimientos de capa audiovisual, filtros del mapa y paridad de popups/drawers)
- **Archivos modificados (4, Escudo GOLD limpio):**
  - api/interacciones.js (query param `origen` en el handler `multimedia_mapa`)
  - index-api-connector.js (fetch con `&origen=album`)
  - index.html (filtros deseleccionables, capa estricta y paridad de drawer)
  - mapas.html (drawer lateral propio en el mapa de detalle)

- **Decisiones de producto (respuestas del usuario):**
  1. Capa audiovisual estricta: mejor opcion = filtro en backend (param opcional) + filtro defensivo frontend.
  2. Sin toggle on/off: la deseleccion de "Todo" oculta todos los pines del directorio.
  3. Se elimina el popup de los pines individuales y se deja el drawer.
  4. Alcance "a los 2": ademas del mapa cultural, aplicar la paridad a "Mi Mapa personal" y a `mapas.html`.

- **Subtareas completadas:**
  1. **Backend (api/interacciones.js):** nuevo `var mmOrigen = req.query.origen || null;` (L1712); la rama estatica se anula con `((mmTipo && mmTipo !== 'foto') || mmOrigen === 'album' ? ' AND FALSE' : '')` (L1739). Sin `origen` la respuesta es identica a la anterior (retrocompatible con comunidad.html L1221). Sin parametros SQL nuevos ni migracion.
  2. **Connector (index-api-connector.js):** el fetch de multimedia_mapa pide `&origen=album` (L258).
  3. **Capa estricta (index.html):** `renderMapaMedia()` y `mdMediasCercanas()` descartan `origen === 'destino'`; la capa solo pinta albumes de usuarios. El branch defensivo `origen==='destino'` de `openMapaMediaDrawer` se conserva.
  4. **Filtro deseleccionable (index.html):** el listener de `.mf-btn[data-cat]` detecta `yaActivo` y deselecciona (`mapaActiveCat='off'`); `filterMapaPins('off')` deja `mapaPlaces=[]` (recluster vacia la capa) y `renderMapaList('off')` muestra estado vacio. "Todo" activa la capa media solo al re-seleccionarse, no al deseleccionar.
  5. **Paridad de drawer (index.html):** eliminado el `bindPopup` de los pines del directorio (`refreshMapaMarkers`) y de "Mi Mapa personal" (`updateMMMarkers`); el clic usa `setMapaActive()` -> `openMapaDrawer(place)`. Se limpio el manejo de popup (`openPopup`, `mapaPendingPopupId`) de `setMapaActive` y `onMapaMoved`. Clusters intactos (zoom + popup de lista).
  6. **mapas.html:** drawer lateral propio (`.dd-wrap`/`.dd-panel`, CSS nuevo acorde a la pagina) + `abrirDrawerDetalle(x)` con hero (`_fotoSrc` valida esquema), badge de categoria (`CAT_LBL`), titulo, ciudad y CTA `/{slug}.html`; cierre por backdrop, boton y Escape; datos escapados con `_esc`.
  7. **ADR-021** en DECISIONS.md + NEXT.md actualizado.

- **Verificacion (Escudo GOLD):** `node --check api/interacciones.js` e `index-api-connector.js` PASS; JS inline extraido de index.html y mapas.html con `node _verify.js` + `node --check` PASS; ASCII-safety: 0 caracteres no-ASCII en lineas nuevas (un comentario CSS se normalizo a ASCII); balance de divs index.html -1 (preexistente en HEAD, sin regresion) y mapas.html 0 (HEAD 0).

- **Auditoria (BUGS_HISTORICOS):** BUG-001 (no-ASCII en api/*.js) no aplica (cambio ASCII); BUG-030 (UNION types uuid/varchar) sin reaparicion (`a.id::text AS origen_id` intacto); BUG-020 (replArr const/window) sin impacto; BUG-031 (JS inline) cubierto por `node --check` del inline extraido. XSS: los drawers escapan datos con `esc()`/`_esc()`.

- **Fuera de alcance / backlog:** la capa multimedia de `comunidad.html` sigue mostrando la rama estatica (no se le agrego `origen=album`); `mapaPendingPopupId`/`mapaPendingClearTimer` quedan declaradas sin uso; pendiente commit/deploy manual.

---

### TSK-097: Fixes multimedia + constraint unica de interacciones (prompt cambios.txt) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-12)
- **Prioridad:** Alta
- **Fecha:** 2026-09-12
- **Prompt origen:** `prompt cambios.txt` (fixes multimedia + constraint unica de interacciones)
- **Archivos modificados (Escudo GOLD limpio, working tree SIN commitear):**
  - `db/migrations/012_interacciones_dedup_resena_rating.sql` (NUEVO)
  - `api/interacciones.js` (catch 23505 + trazabilidad multimedia_mapa/album_detalle)
  - `api/pagina-destino.js` (BUG-027: icono Instagram)
  - `index.html` (DEST_PHOTOS vacio + `photoPlaceholderHTML` + `openAlbumModal` + balance de divs 497/497)
  - `index-api-connector.js` (confirmado sin URLs externas)
  - `mi-perfil.html` (UI completa de albumes + fix comillas de `quitarFotoAlbum`)
  - `comunidad.html` (reproductor real de audio/video/embed + `abrirAlbumModal`)
  - `admin.html` (moderacion de fotos de album, divs 724/724)
  - `scripts/smoke_auditoria_pagina_destino.js` (NUEVO; 42 checks al cierre de TSK-097, 54 checks HOY tras TSK-105 / ADR-030, 2026-09-16)

- **Fixes completados:**
  1. **FIX 1 - Constraint unica de interacciones (solo resena/rating):** nueva migracion
     `db/migrations/012_interacciones_dedup_resena_rating.sql` que hace DROP de la constraint
     heredada `interacciones_usuario_id_destino_id_tipo_key` y crea el indice unico PARCIAL
     `idx_interacciones_dedup_resena_rating ON interacciones (usuario_id, destino_id)
     WHERE tipo IN ('resena','rating')`, con dedup defensivo (conserva la resena con texto y,
     a igualdad de tipo, la mas reciente; excluye usuario_id NULL) y recalculo de
     `destinos.rating`/`total_resenas` solo para los destinos afectados (patron ADR-007/008,
     idempotente, ASCII-safe). Motivo: los INSERT `tipo='foto'` (upload de foto de lugar) y
     `tipo='foto_voto'` chocaban con la constraint compuesta y devolvian 500; con el indice
     parcial las fotos quedan libres (ADR-017) y el dedup de resena/rating se preserva
     (ADR-007). En `api/interacciones.js` el catch final ahora mapea `err.code === '23505'`
     a 409 tipado (`{ok:false, error:'Registro duplicado', duplicado:true}`, L3451-3452) en
     vez de 500 generico.
  2. **FIX 2 - Fotos reales en index (sin URLs de prueba):** `index.html` dejo
     `var DEST_PHOTOS = {};` (L1781; antes tenia URLs Unsplash de prueba) y agrego el helper
     reutilizable `photoPlaceholderHTML(emoji, variant)` (L2928) con placeholder neutro
     (gradiente + emoji) para destinos sin foto real. `index-api-connector.js` confirmado sin
     URLs externas (solo refiere el placeholder del index). La capa `MAPA_MEDIA` ya era 100%
     real desde ADR-021 (`?tipo=multimedia_mapa&origen=album`). No existia `MOCK_MEDIA`.
  3. **FIX 3 - Albumes en perfil:** `mi-perfil.html` ahora tiene UI completa para crear,
     editar (`album_editar`), eliminar (`album_eliminar`), subir foto (`album_agregar_foto`)
     y quitar foto (`album_quitar_foto`), reutilizando `window.ExploraCO.usuario` como sesion.
  4. **FIX 4 - Trazabilidad de autor/album:** `api/interacciones.js` enriquece
     `multimedia_mapa` (agrega `album_id`, `usuario_id`, `usuario_nombre`, `usuario_avatar`,
     L1673/1724) y `album_detalle` (agrega `usuario_nombre`, `usuario_avatar`, `autor_avatar`,
     `usuario_id` en fotos, L1685). `index.html` (`openAlbumModal` L3321 + drawer) y
     `comunidad.html` (`abrirAlbumModal` L1340) permiten ir de foto -> album y de autor ->
     `/mi-perfil.html?id=...`.
  5. **FIX 5 - Auditoria multimedia:** `api/pagina-destino.js` corrigio BUG-027 (el boton
      Instagram mostraba el literal `[foto]`; ahora `\uD83D\uDCF7`, L1950). Se creo
      `scripts/smoke_auditoria_pagina_destino.js` (42 checks al cierre de TSK-097;
      54 checks HOY tras TSK-105 / ADR-030, 2026-09-16). `comunidad.html` agrego
     reproductor real de audio/video/embed (`avMediaHTML` L1274, `avEmbedUrl` L1264).
     `index.html` corrigio el desbalance de divs (un `</div>` sobrante y uno faltante en
     `publicar-modal`; balance 497/497). `admin.html` conecto la UI de moderacion de fotos
     de album (`adminCargarFeedFotos` -> `mi_feed_fotos` L6056, `adminRetirarFotoAlbum` ->
     `admin_moderar_foto_album` con accion 'eliminar' L6031/6120).

- **Verificacion (Escudo GOLD):** `node --check` limpio en api/interacciones.js y
  api/pagina-destino.js; `node --check index-api-connector.js` limpio; 0 bytes >127 en los
  api/*.js (index-api-connector.js mantiene sus 26 backticks preexistentes, baseline HEAD 26);
  balance de divs 0 en index.html (497/497), comunidad.html (181/181), mi-perfil.html
  (166/166) y admin.html (724/724); JS inline de los 4 HTML parsea con `node --check`;
  `scripts/check_buildHTML_inline.js` -> TODO OK; smokes OK: `smoke_auditoria_pagina_destino.js`
  (42/42 al cierre de TSK-097; 54/54 HOY tras TSK-105 / ADR-030, 2026-09-16),
  `smoke_test_comunidad.js`, `test_logros_catalogo.js` (29) y
  `smoke_test_perfil_progreso.js`. QA manual detecto y se corrigieron 2 bugs de integracion
  nuevos: (a) `openAlbumModal` en index.html leia `res.data` en vez de `res.album`/`res.fotos`;
  (b) `mi-perfil.html` generaba `onclick="quitarFotoAlbum(uuid,uuid)"` sin comillas
  (ReferenceError); ambos corregidos (L3333-3338 y L1121).

- **PENDIENTE BLOQUEANTE (ACTUALIZADO 2026-09-13):** la migracion `db/migrations/012_interacciones_dedup_resena_rating.sql` YA fue aplicada por Javier en Neon (migraciones 011-014 aplicadas el 2026-09-13).
  Pendiente tambien: commit + push + deploy manual del working tree completo (incluye los
  cambios de modelos de agentes, ver NEXT.md) y reiniciar opencode para que tome los modelos
  nuevos de `.opencode/agent/`.

---

### TSK-098: Epic multimedia de usuarios: fix 500 albumes/mapa, filtro multi-seleccion, galeria ampliada, modulo audiovisual y comentarios tipo Facebook [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-12, working tree SIN commitear)
- **Prioridad:** Alta
- **Fecha:** 2026-09-12
- **Prompt origen:** epic multimedia de usuarios (fix 500 en albumes/mapa, filtro multi-seleccion, galeria ampliada, modulo audiovisual y comentarios tipo Facebook)
- **Archivos modificados/nuevos (Escudo GOLD limpio, working tree SIN commitear):**
  - `api/interacciones.js` (COALESCE foto/avatar, catch 42P01/42703 -> 503 `SCHEMA_NOT_MIGRATED`, `multimedia_mapa` con `tipo_media` CSV, `mi_feed_fotos?orden=`, contador `comentarios`, 6 ramas `tipo=` nuevas de comentarios/galeria; SIN endpoints nuevos, presupuesto 8/8 ADR-010)
  - `db/migrations/013_album_comentarios.sql` (NUEVO, ADR-023)
  - `index.html`, `comunidad.html` (filtro multimedia multi-seleccion + comentarios en modales de album; comunidad estrena tab "Audiovisual")
  - `mi-perfil.html` (inputs lat/lng para georreferenciar albumes + comentarios en el modal de detalle)
  - `admin.html` (panel de moderacion de comentarios)
  - `galeria.html` (NUEVO)
  - `album-comments.js` (NUEVO)
  - `api/pagina-destino.js` (boton "Ver galeria ampliada" -> `/galeria.html?destino=<slug>`)
  - `api/utilidades.js` (`/galeria.html` en STATIC_PAGES del sitemap)

- **Cambios completados (verificados contra archivo real, ADR-006):**
  1. **Fix 500 en albumes/mapa:** `COALESCE(u.foto_url, u.avatar_url, '')` en `album_detalle`/`multimedia_mapa` (avatar null ya no rompe); catch global `err.code === '42P01' || err.code === '42703'` -> 503 tipado `SCHEMA_NOT_MIGRATED` (L3920-3921) en vez de 500 generico.
  2. **Filtro multimedia multi-seleccion:** `multimedia_mapa` acepta `tipo_media=foto,video,audio` (CSV), consulta con `ANY($1::text[])` (L1807-1828), 400 estricto ante tokens invalidos (`tipos_invalidos`) en vez del fallback silencioso, y respuesta con `tipos_aplicados` (L1866).
  3. **Feed de fotos con orden:** `mi_feed_fotos?orden=top|recientes` (`feedOrden`, L1873; default recientes).
  4. **Contador de comentarios:** subquery derivada `comentarios` (COUNT activos) en `album_detalle` y `mi_feed_fotos` (patron ADR-023: contador derivado, sin columna persistida).
  5. **Comentarios tipo Facebook (ADR-023):** 6 ramas `tipo=` nuevas en `api/interacciones.js` SIN endpoint nuevo: GET `comentarios_foto` (arbol con `likes`/`ya_like`/`es_mio`/`nivel`/`respuestas[]`, L1917-1933), GET `galeria_destino` (L1713), GET `comentarios_recientes` (L1775), POST `comentario_foto` (201, rate-limit diario 30, +2 XP tope 20/dia, L2908), POST `comentario_eliminar` (soft-delete autor/admin + `cascada` opcional, L3023), POST `comentario_voto` (toggle `like`/`unlike` idempotente, 403 self-like, sin XP, L3094-3129).
  6. **Galeria ampliada:** `galeria.html` (NUEVO) con modo global (fotos mas votadas + albumes populares) y modo `?destino=<slug>` (fotos del destino + fotos de usuarios por votos), integra comentarios (`window.AlbumComments.mount`, L341-385); `api/pagina-destino.js` L1488: boton "Ver galeria ampliada" navega a `/galeria.html?destino=<slug>` con fallback al lightbox in-page si no hay slug; `api/utilidades.js` L20 agrega `/galeria.html` (priority 0.7, weekly) a STATIC_PAGES del sitemap.
  7. **Modulo audiovisual:** `comunidad.html` tab "Audiovisual" (L293, `initAudiovisual` L1614): grid de albumes + feed con orden recientes/populares/top y "cargar mas".
  8. **Georreferenciacion:** `mi-perfil.html` inputs lat/lng en albumes para que aparezcan en el mapa (`multimedia_mapa`).
  9. **Moderacion admin:** `admin.html` panel de comentarios (`adminCargarComentarios` -> GET `comentarios_recientes` + POST `comentario_eliminar` con cascada admin, L6139-6152).
  10. **Componente compartido:** `album-comments.js` (NUEVO) expone `window.AlbumComments.mount/toggle` (arbol anidado, indentacion visual clamp a 3 niveles, like/unlike, borrar, responder), consumido por index.html (L3392), comunidad.html (L1448), mi-perfil.html (L1188) y galeria.html.

- **Decisiones de producto (confirmadas por el usuario):**
  1. Ingreso de media por URL externa por ahora; SUBIDA REAL DE ARCHIVOS queda como TODO futuro (requiere storage externo tipo Vercel Blob/Supabase/Cloudinary porque Vercel Hobby no persiste archivos).
  2. Los links que sube un usuario quedan en su galeria y referenciados en el mapa (por eso lat/lng en albumes).
  3. Comentarios con likes y respuestas anidadas ILIMITADAS en datos (indentacion visual limitada a 3 niveles, ADR-023).
  4. Migraciones 004-012 ya aplicadas por Javier en Neon; la 013 la aplica manualmente el (bloqueante para los `tipo=` de comentarios; sin ella devuelven 503 `SCHEMA_NOT_MIGRATED`). ACTUALIZADO 2026-09-13: la 013 ya fue aplicada por Javier en Neon PRODUCCION (migraciones 011-014 aplicadas); queda la 015 del epic prompt.txt (TSK-100).

- **Verificacion (Escudo GOLD, 2026-09-12):** `node --check` PASS en api/interacciones.js, api/pagina-destino.js, api/utilidades.js y album-comments.js (re-verificado en esta sesion documental); ASCII-safety 0 bytes >127 en api/interacciones.js, album-comments.js y db/migrations/013_album_comentarios.sql. Hallazgo de QA de la sesion: canonicals con homografo cirilico `\u043E` en 8 HTML -> BUGS_HISTORICOS.md BUG-033 (NO bloqueante, fuera del alcance del epic).

- **PENDIENTES (bloqueantes):**
  1. **APLICAR `db/migrations/013_album_comentarios.sql` EN NEON -- [HECHO 2026-09-13] (lo ejecuto Javier en el editor SQL; idempotente IF NOT EXISTS, ASCII-safe, requiere migracion 009 previa; aplicada junto con 011/012/014 el 2026-09-13).** Sin la tabla, los `tipo=` de comentarios y el contador `comentarios` degradan a 503 `SCHEMA_NOT_MIGRATED` (catch 42P01 de este epic).
  2. **Commit + push + deploy manual** del working tree completo (incluye los pendientes de TSK-095/096/097 y los cambios de modelos de agentes de `.opencode/agent/`).
  3. **Verificacion post-deploy:** mapa con fotos de usuarios (albumes con lat/lng), abrir album sin 500, filtros multi-seleccion foto+video+audio, galeria ampliada (modo global y `?destino=`), comentarios end-to-end (crear/responder/like/unlike/borrar/moderar en admin).
  4. **TODO futuro: subida real de archivos** (storage externo tipo Vercel Blob/Supabase/Cloudinary; hoy el ingreso es por URL externa).

- **Fuera de alcance / backlog:** BUG-033 (canonicals cirilicos, NO bloqueante, fix de 1 caracter por archivo); subida real de archivos (TODO, requiere storage externo); nota ADR-023: `multimedia_mapa` y `fotos_top` pueden sumar el contador `comentarios` despues.

---

### TSK-099: Presencia Fisica + Espacial v4.0 (geocerca server-side en visita)

- **Estado:** IMPLEMENTADO EN WORKING TREE; PENDIENTE APLICAR MIGRACION 014 EN NEON + DEPLOY (backend + frontend verificados 2026-09-12: `node --check` PASS, ASCII 0 bytes >127, tests de logros 30/30)
- **Prioridad:** ALTA
- **Fecha:** 2026-09-12
- **Responsable:** backend-dev + renderer-dev + data-migration/sql-security + qa-auditor + docs-keeper
- **Dependencia:** ADR-024; migracion 012 (indice parcial resena/rating, PENDIENTE en Neon); migracion 013
- **ADR:** ADR-024
- **Spec:** `docs/superpowers/specs/2026-09-12-presencia-fisica-gamificacion-v4-design.md`
- **Prompt origen:** `prompt cambios.txt` (Presencia Fisica + Presencia Espacial)

- **Problema:** el POST `tipo=visita` otorgaba +20 XP sin presencia fisica; `quitar_visita` hacia `DELETE` fisico y permitia el ciclo visita/quitar_visita/visita (farming); el dedup `SELECT`+`INSERT` no era atomico; un radio fijo de 100 m castigaba la exploracion rural.

- **Subtareas:**
  1. **[A - Backend Haversine] HECHO:** `api/interacciones.js` v11. Helpers `haversineMetros` + `resolverRadioM` + constantes (`RADIO_DEFAULT_M=100`, `RADIO_POR_CATEGORIA`, `RADIO_POR_SUBCATEGORIA`, `RURAL_KEYWORDS`, `ACCURACY_MAX_M=150`, `COOLDOWN_MIN_SEG=90`, `MAX_VELOCIDAD_MPS=69.4`, `VISITAS_DIA_MAX=30`, `VECINOS_RURAL_MAX=3`, `VECINOS_BBOX_DEG=0.02`, `VISITA_BONO_RURAL=20`). Handler `tipo=visita` reescrito con el contrato 400/404/422/429/200 idempotente, dedup-first, evidencia `dims.geo`, bono rural, `zona_motivo` `subcategoria`/`keyword`/`densidad`/`urbano` y `modo='sin_geocerca'`; rechazo de `0,0`; tope diario en ventana movil de 24 h; `quitar_visita` -> `UPDATE activo=false` (soft-delete, sin descontar XP); catch `23505` -> 200 `ya_visitado`. Codigo real del error de velocidad: `VELOCIDAD_IMPOSIBLE`.
  2. **[B - Frontend geolocation] HECHO en working tree/HEAD `fcd6060`:** `usuario-session.js` `obtenerUbicacion()` (`navigator.geolocation.getCurrentPosition`, `enableHighAccuracy`, timeout 10 s) + `marcarVisitado()` enviando `lat/lng/accuracy/ts` + `mensajeErrorVisita()`; `sincronizarGuardados()` ya NO migra visitas (solo guardados, comentario ADR-024); `api/pagina-destino.js` boton `marcarVisitadoBtn` con estado de carga que llama `window.ExploraCO.marcarVisitado(DID)`.
  3. **[C - Migracion 014] CREADA, PENDIENTE DE APLICAR:** `db/migrations/014_reset_visitas_presencia_fisica.sql` (10 pasos sin tablas temporales para compatibilidad con el editor SQL de Neon, idempotente, transaccional, ASCII-safe): respaldo `interacciones_visitas_reset_backup`; recomputo de `usuarios.xp_total` (resta `SUM(xp_ganado)` + bonos `mis_primera_visita` 15 / `mis_itinerario_perfeccion` 60 / `logr_visitas_5` 15 / `logr_visitas_20` 50), `total_visitas`, `pandillas.fama_total` y `pandilla_retos`; reset dirigido de flags JSONB; purga fisica de visitas gamificadas; `CREATE UNIQUE INDEX idx_interacciones_visita_unica (usuario_id,destino_id) WHERE tipo='visita' AND usuario_id IS NOT NULL`. Conserva analitica anonima (`usuario_id IS NULL`) y cromos.
  4. **[D - ADR-024] HECHO (esta sesion documental):** ADR-024 en `DECISIONS.md` + spec en `docs/superpowers/specs/2026-09-12-presencia-fisica-gamificacion-v4-design.md`.
  5. **[E - QA] HECHO (salvo smoke dedicado):** tests de Haversine/radios/zona rural/anti-spoofing/idempotencia/soft-delete/`sin_geocerca` cubiertos; Escudo GOLD (`node --check` PASS, ASCII 0 bytes >127); tests de logros actualizados a 30 en `scripts/test_logros_catalogo.js`, `scripts/smoke_test_perfil_progreso.js`, `scripts/smoke_test_comunidad.js` y `scripts/verify_comunidad_prod.js` (todos PASS). `scripts/smoke_visita_geocerca.js` (smoke dedicado del contrato) 15/15 PASS (ejecutado 2026-09-12).

- **Decisiones de producto (aprobadas):** radios adaptativos 100/150/200/250 m (keyword -> subcategoria -> categoria -> default); bono rural plano +20 XP solo en INSERT fresco (sin multiplicador/amuleto/fama); `logr_pionero` tier plata 40 XP; `sin_geocerca` para destinos sin coordenadas; reset unico autorizado con respaldo; spoofing residual -> ADR-025 candidato.

- **Impacto:** `api/interacciones.js`, `usuario-session.js`, `api/pagina-destino.js`, `db/migrations/014_reset_visitas_presencia_fisica.sql`, `scripts/test_logros_catalogo.js` (+ smokes de logros), docs. **Sin endpoints nuevos** (8/8, ADR-010). **Trade-off:** el contador publico de visitas de `api/utilidades.js` puede bajar tras el reset. **Drift residual de XP** por multiplicadores/amuleto (sin ledger) documentado en el spec.

- **Evidencia:** `node --check api/interacciones.js` PASS; ASCII 0 bytes >127 en `api/interacciones.js`; handler `tipo=visita` con Haversine/geocerca/anti-farming/`dims.geo`/bono rural y `quitar_visita` soft-delete verificados contra archivo real; logro `logr_pionero` presente en el catalogo (LOGROS 30); tests de logros 30/30 PASS en los 4 scripts; `node scripts/smoke_visita_geocerca.js` 15/15 PASS (validaciones tempranas, dedup activa/inactiva, cooldown, tope diario, caminos felices urbano xp 20 y rural xp 40). Falta: la verificacion en vivo tras aplicar la migracion 014 y desplegar.

- **Pendiente BLOQUEANTE (ACTUALIZADO 2026-09-13):** la migracion 014 YA fue aplicada por Javier en Neon (junto con 011/012/013, mismas fechas). Queda: aplicar la migracion 015 del epic prompt.txt (TSK-100) tras el commit + commit/push/deploy manual + verificacion en vivo de la geocerca (marcar "Estuve aqui" exige ubicacion, fuera de rango -> 422 FUERA_DE_RANGO).

---

### TSK-100: Epic prompt.txt -- perfil museo v1, vocaciones acumulables, chat por plan privado, XP admin y fixes multimedia (BUG A/B) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-13, implementada en working tree; Escudo GOLD verde; pendiente aplicar migracion 015 en Neon + commit/push/deploy)
- **Prioridad:** ALTA
- **Fecha:** 2026-09-13
- **Prompt origen:** `prompt.txt` (museo de trofeos en mi-perfil, vocaciones de artista estilo Diablo/PoE/Albion, limpieza de salas de la comunidad, chat propio por plan, XP admin para testear niveles, BUG A 503 de album_detalle, BUG B mapa cultural sin fotos de usuarios)
- **Spec:** `docs/superpowers/specs/2026-09-13-epic-prompt-vocaciones-chat-perfil-design.md`
- **ADR:** ADR-026 (DECISIONS.md)
- **Responsable:** free-build (orquestador) + free-tpl/frontend/admin/renderer/backend/js-silo/qa + docs-keeper

- **Nota de migraciones (registro):** las migraciones **011-014 YA fueron aplicadas por Javier en Neon PRODUCCION el 2026-09-13** (011 direccion, 012 dedup resena/rating, 013 comentarios, 014 reset de visitas presencia fisica). La **015 `db/migrations/015_epic_prompt.sql` queda PENDIENTE de aplicar por Javier tras el commit** (idempotente IF NOT EXISTS + ON CONFLICT, ASCII-safe, 4 bloques).

- **Subtareas (del Alcance de la spec; las 7 + 2 bugs):**
  1. **[Perfil museo v1] HECHO:** `mi-perfil.html` (1.575 lineas) estrena museo-line en el hero (`#pf-museo-line`: trofeos·fotos·destinos con backfill real, L906), galeria de mejoras de perfil (`#pf-mejoras-grid`: 3 consumibles `perfil_*`), seccion Vocaciones de artista (`#pf-vocaciones-grid` con toggle, candado por nivel y manejo de 403) y chip "Sin mapa" en albumes sin lat/lng (`\u26A0 Sin mapa`, L1241/1359). CSS vitrina de trofeos. Divs 195/195. Vitrina extendida y sello verificado quedan como futuro cercano (decision de Javier).
  2. **[Vocaciones acumulables] HECHO:** catalogo `VOCACIONES` en codigo (`api/interacciones.js` L181-188: musico@5, cine@8, artista_grafico@11, cada una con habilidades[]); columna `usuarios.vocaciones jsonb NOT NULL DEFAULT '{}'` (migracion 015, merge ADR-003); GET `vocaciones_catalogo` (publico), GET `vocaciones_usuario` y POST `vocacion_activar` (toggle, gate de nivel server-side 403). ACUMULABLES: el usuario puede tener todas las que desbloquee.
  3. **[Comunidad: limpieza de salas] HECHO:** migracion 015 borra `chat_salas WHERE creador_id IS NULL AND nombre NOT IN ('Chat general','Bogota')` (idempotente, acumulativa sobre el seed de 008; CASCADE limpia los mensajes). `comunidad.html` agrega filtro defensivo `tipo !== 'plan'` en el listado, bloque "Niveles de chat" (5 perks: chat@3, crear_chat@3, emojis_premium@7, sello_sala@10, moderador_chat@12) y refactor compartido chatMsgsHTML/chatPollTick/enviarMensajeOpt. Divs 223/223.
  4. **[Chat por plan privado] HECHO:** `planes_viaje.sala_id uuid REFERENCES chat_salas(id)` (FK nullable, sin CASCADE, migracion 015); `plan_crear` crea `chat_salas` tipo='plan' y liga la sala (L2736-2748); GET `plan_chat` (sala + mensajes + miembros, gate miembro/creador 403, L1641-1678) y POST `plan_chat_msg` (gate miembro, +2 XP tope 20/dia reusando chatXpDisponible/registrarChatXp, L2811-2850); defensa: `chat_msg` POST rechaza salas de plan y `chat_mensajes` GET las excluye (L1595); GET `planes`/`planes_mios` exponen `p.sala_id`; `comunidad.html` modal privado "Chat del plan" (abrirPlanChat/enviarPlanChat/polling 5 s, L1058-1154) e indicador "chat activo" (L987-988).
  5. **[Admin XP] HECHO:** POST `admin_xp` (L3274-3336, Bearer `ADMIN_SECRET` con fallback 'exploraco12345'): `{usuario_id, delta_xp}` (Math.max(0,...)) o `{usuario_id, nivel}` 1-20 (Math.max con el umbral, NO degrada); recalcula con calcularNivelLocal/calcularEraLocal/BADGES_LOCAL; `UPDATE usuarios SET xp_total=$1, ultimo_acceso=NOW()` (se uso `ultimo_acceso`, no `actualizado_en`, porque esa columna no existe en usuarios). `admin.html` tab "Jugadores" (snav-jugadores + showScreen('jugadores'), L1980-2039): buscador por nombre/email, tarjeta de jugador (nivel, XP, era, logros, vocaciones activas), sumar/restar XP y subir a nivel exacto 1-20; refactor `_adminBuscarUsuarios` compartido con blogBuscarAutor (L6933). Divs 786/786.
  6. **[BUG A -- 503 album_detalle] HECHO:** helper `contarComentarioSafe(sql, fotoId)` (L1025) degrada a 0 comentarios si la tabla `album_comentarios` (migracion 013) no existe (catch 42P01/42703), aplicado en `album_detalle`, `galeria_detalle` y `mi_feed_fotos`. `comentarios_recientes` (admin) sigue exigiendola (503 tipificado, no degrada silenciosamente).
  7. **[BUG B -- mapa cultural sin fotos de usuarios] HECHO:** `multimedia_mapa` ya no exige coords en el album: helper `coordsFallbackAutor(sql, usuarioId)` (L1045) hereda lat/lng/ciudad de la primera visita/guardado del autor hacia un destino georreferenciado; descarta los que quedan sin coords; flag `coords_heredadas`. Resuelve el caso reportado (hostal r10).
  8. **[Backend api/usuarios.js] HECHO:** v8 (180 lineas): GET `?buscar=` (2+ chars, ILIKE sobre nombre/email, limit 20, pasa por conLogros/conMisiones/conNivel, L126-141) y columna `vocaciones` incluida en SELECT * (perfil).
  9. **[user-session] HECHO:** `emojis_premium@7` y `sello_sala@10` en CAPACIDADES_POR_NIVEL (L47-48) + catalogo `window.ExploraCO.vocaciones` (L59-87). `subirNivelTest(n)` NO se creo (no hay helpers de test previos en el proyecto; decision de no inventar infraestructura).

- **Decisiones de producto (Javier, 2026-09-13):** vocaciones acumulables (no exclusivas); mejoras de perfil v1 = SOLO marco dorado (700 XP), tema galeria oscura (500 XP) y banda de artista (900 XP) como consumibles permanentes (ON CONFLICT clave) activados por `usar_consumible`; chat de plan PRIVADO solo miembros; admin XP = "subir a nivel X exacto" + delta manual, sin degradar; migraciones 011-014 YA aplicadas en Neon; la 015 la aplica Javier tras el commit.

- **Verificacion (Escudo GOLD, 2026-09-13):** `node --check` PASS en api/interacciones.js (v12, 4.547 lineas) y api/usuarios.js (v8); ASCII 0 bytes >127 en los api/*.js y en la migracion 015; balance de divs mi-perfil 195/195, comunidad 223/223 y admin 786/786; header de interacciones.js v12 con el bloque del epic en L75-83. SMOKE DEDICADO DEL EPIC ENTREGADO: `scripts/smoke_test_epic_prompt.js` 50/50 PASS (ejecutado 2026-09-13, salida "SMOKE EPIC PROMPT: OK"), cubre vocaciones, admin_xp, plan_chat/plan_chat_msg, contarComentarioSafe, coordsFallbackAutor, queries capturadas sala_id/tipo!=plan, divs de los 3 HTML y la migracion 015.

- **PENDIENTES (bloqueantes):**
  1. **APLICAR `db/migrations/015_epic_prompt.sql` EN NEON (lo ejecuta Javier en el editor SQL de Neon tras el commit; idempotente IF NOT EXISTS + ON CONFLICT, requiere la 008 para chat_salas/planes_viaje y la 010 para consumibles).** Sin la columna `usuarios.vocaciones` y `planes_viaje.sala_id`, `vocacion_activar`/`vocaciones_*` responden 500/503 y `plan_crear` falla al ligar la sala.
  2. **Commit + push + deploy manual** del working tree completo (incluye los pendientes de TSK-095/096/097/098/099 y la migracion 015).
  3. **Verificacion post-deploy en vivo:** vocaciones end-to-end (toggle + candado 403), admin_xp niveles 1-20 sin degradacion, plan_chat con miembro vs no-miembro (403), mapa cultural con fotos de usuarios (caso hostal r10), contadores de comentarios sin 503, y un plan nuevo con chat ligado.

- **Pendientes pequenos / backlog:** backfill opcional de `sala_id` para planes EXISTENTES (la migracion los deja NULL; solo los planes creados tras el deploy obtienen sala via `plan_crear`); vitrina extendida de perfil y sello verificado (futuro cercano, decision de Javier); `comunidad.html` capa multimedia con `origen=album` (candidata a unificar, backlog TSK-096); BUG-033 canonicals cirilicos (NO bloqueante). NOTA de cierre QA: el smoke dedicado del epic SI se entrego en `scripts/smoke_test_epic_prompt.js` (50/50 PASS, ver Verificacion arriba).

- **Fuera de alcance:** subida real de archivos (requiere storage externo, TODO vigente de TSK-098); ADR-025 (sesion firmada/atestacion, candidato); cambios de codigo posteriores al registro documental.

---

### TSK-101: Entrega 016 "ExploraCO Gaming v5.0" -- piramide de referidos, crowdsourcing Wayfarer (Activo Oculto), 4 facciones y mundo artistas [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-14, implementada y verificada en working tree; pendiente aplicar la migracion 016 en Neon + configurar `RESEND_API_KEY`/`SESSION_JWT_SECRET` en Vercel + commit/push/deploy)
- **Prioridad:** ALTA
- **Fecha:** 2026-09-14
- **Prompt origen:** `promptgamming.md` (Entrega 016 "ExploraCO Gaming v5.0", aprobada por arquitectura y verificada contra el repo real)
- **ADR:** ADR-027 (piramide + crowdsourcing + facciones + mundo artistas) y ADR-025 (sesion firmada / anti-Sybil, consume el candidato reservado desde ADR-024)
- **Checklist de despliegue:** `docs/DEPLOY_016.md`
- **Responsable:** build (orquestador) + backend/architect/sql-security/admin/frontend/qa + docs-keeper

- **Alcance ejecutado (verificado contra archivo real, ADR-006):**
  1. **[Esquema] `db/migrations/016_multinivel_crowdsourcing.sql` (NUEVA, 209 lineas, idempotente ADR-008, ASCII-safe ADR-002):** 10 columnas en `usuarios` (`referido_por`, `codigo_referido`, `xp_ref_total`, `referidos_directos_contados`, `faccion` con CHECK de 4 facciones, `faccion_elegida_en`, `email_verificado`, `email_token`, `email_token_expira`, `device_hashes`) + 4 tablas (`activos_ocultos`, `activos_ocultos_votos`, `activos_ocultos_checkins`, `geo_nonces`) + 8 indices. Idempotencia DDL verificada 13/13.
  2. **[Backend `api/usuarios.js` v8 -> v9]:** piramide de referidos (codigo, red CTE de 5 niveles, `?ref=` en registro con topes 500/20, reparto 10/5/3/2/1 FLOOR en `xp_ref_total`), 4 facciones (primera gratis, cambio 500 `xp_total` + cooldown 15 dias), verificacion de email (Resend), JWT HMAC (`firmarSesion`, `SESSION_JWT_SECRET`) y `device_hashes`.
  3. **[Backend `api/interacciones.js` v12 -> v13]:** helper `repartirXpReferidos` (CTE recursiva) inyectado en 14 puntos de XP real (excluye `admin_xp` y `comprar_consumible`); Wayfarer Activo Oculto completo (proponer sin nivel pero con email verificado, votar nivel 5, quorum +/-3, 30 dias derivado, +50/+5/+15 XP, checkin reusa geocerca ADR-024 + nonce); `validarSesion` (JWT con `timingSafeEqual`) en visita/votar/checkin; nonce en visita y checkin; vocaciones en bloque nivel 5 (musico/cine/artista_grafico/escritor); 6 misiones de artista.
  4. **[Backend `api/admin.js`]:** rama `activo_oculto_moderar` (Bearer admin): aprobar +50 XP al proponente con reparto piramidal, rechazar sin XP y borrado logico (`activo=false`).
  5. **[Frontend]:** `mi-perfil.html` (Mi Red + QR + selector de facciones + panel de vocaciones + banner de verificacion), `comunidad.html` (relabel visual Pandilla->Parche solo en el texto visible + seccion Activo Oculto + ranking de facciones), `admin.html` (panel de moderacion de Activos Ocultos), `usuario-session.js` (catalogo de vocaciones nivel 5, fingerprint de dispositivo, JWT + refresh silencioso).
  6. **[Governanza/config]:** `.gitignore` corregido (filtra `.env`, `.env.local`, `.env.*.local`; conserva `!.env.example`), `.env.example` creado (NUEVO, plantilla con `DATABASE_URL`, `ADMIN_SECRET`, `SESSION_JWT_SECRET`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `SITE_URL`, `DEV_EMAIL_ECHO`), `docs/DEPLOY_016.md` (NUEVO, checklist de 5 pasos).

- **Presupuesto de endpoints:** **8/8 INTACTO** (verificado con `git status`: cero archivos nuevos en `api/`; todo entro como ramas `tipo=` y helpers dentro de los endpoints existentes, ADR-010).

- **Evidencia (Escudo GOLD, 2026-09-14):**
  - Smoke dedicado `scripts/smoke_016_multinivel_crowdsourcing.js`: **39/39 PASS** (ejecutado en esta sesion documental, salida "SMOKE 016 MULTINIVEL: OK").
  - `node --check` PASS x3 (`api/usuarios.js`, `api/interacciones.js`, `api/admin.js`); ASCII-safety **0 bytes >127** y **0 backticks**; balance de divs **0**; idempotencia DDL **13/13**.
  - Arquitectura: 8 archivos en `api/` (sin altas); headers reales confirmados `api/usuarios.js` v9 y `api/interacciones.js` v13.

- **PENDIENTE OPERATIVO (bloqueante para produccion, lo ejecuta Javier):**
  1. **Aplicar `db/migrations/016_multinivel_crowdsourcing.sql` en Neon antes del deploy** (editor SQL, archivo COMPLETO en una corrida; idempotente). Prerrequisito declarado en `docs/DEPLOY_016.md`: migraciones **010 a 015** ya aplicadas (verificar 015 -- ADR-006).
  2. **Configurar variables en Vercel:** `SESSION_JWT_SECRET` (generar aleatorio fuerte; el fallback `dev_secret` es inseguro) y `RESEND_API_KEY`; `SITE_URL` (`https://exploraco.co` si el dominio propio esta activo, `https://exploraco.vercel.app` si no). Confirmar `DATABASE_URL`/`ADMIN_SECRET` reales. NO configurar `DEV_EMAIL_ECHO` en produccion.
  3. **Deploy en UN SOLO release:** `api/usuarios.js` v9 + `api/interacciones.js` v13 + `api/admin.js` deben viajar juntos y compartir el MISMO `SESSION_JWT_SECRET` (si una funcion usa otro secreto, los usuarios reciben 401).
  4. **Verificacion en vivo:** registro con `?ref=`, verificacion de correo, eleccion/cambio de faccion, proponer/votar/checkin de Activo Oculto, moderacion admin (+50 XP al aprobar), y sesion JWT (token alterado -> 401).

- **Fuera de alcance:** subida real de archivos (storage externo, TODO de TSK-098); atestacion nativa de dispositivo (Play Integrity/App Attest, evolucion futura de ADR-025); correccion del drift documental de `scripts/validate_ficha.js` (ver BUGS_HISTORICOS.md BUG-034).

---

### TSK-102: Consolidacion documental del sistema de gamificacion y apartado social (v5) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-14, working tree; solo documentacion, sin cambios de codigo)
- **Prioridad:** MEDIA
- **Fecha:** 2026-09-14
- **Prompt origen:** cierre documental de la Entrega 016 ("ExploraCO Gaming v5.0") y del Plan Maestro v5
- **ADR:** ADR-006 (baseline = archivo real), ADR-002 (docs core ASCII-safe), ADR-025/ADR-027 (decisiones consolidadas)
- **Responsable:** docs-keeper (Documentation Specialist, ruta de pago)

- **Alcance ejecutado (verificado contra archivo real, ADR-006):**
  1. **Documento maestro gaming v5:** `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Gamificacion_v5_Plan_Maestro.md` -- Plan Maestro tecnico + hoja de ruta del sistema de gamificacion (v4 + Entrega 016), con estados IMPLEMENTADO / SOLO BACKEND / SOLO DOCUMENTADO / ROTO y citas `archivo:linea`; enlace cruzado al Sistema Social v5.
  2. **Documento maestro social v5:** `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Sistema_Social_v5.md` -- mapa consolidado del apartado social (hub, Parches, chat/planes, albumes/comentarios, resenas, referidos, facciones, Wayfarer, notificaciones) con tabla de gaps G-01..G-23 y discrepancias D-01..D-15; enlace cruzado al Plan Maestro v5.
  3. **Docs core consolidados por esta tarea:** TASKS.md (TSK-102), NEXT.md (completado reciente + pendientes/riesgos) y BUGS_HISTORICOS.md (BUG-035..BUG-043). Los docs core PROJECT.md, BLUEPRINT.md, GUIA_DE_DESARROLLO.md y RUTA los cubre otra tarea paralela (no se tocan aqui).
  4. **Specs:** `docs/superpowers/specs/2026-09-14-gaming-v5-referidos-wayfarer-facciones-design.md` (diseno de la Entrega 016) e indice `docs/superpowers/specs/README.md` (13 specs).

- **Gaps documentados (referencia):** los 9 hallazgos reales de la consolidacion quedan con severidad y evidencia `archivo:linea` en BUGS_HISTORICOS.md BUG-035 a BUG-043: referidos inalcanzables por web (BUG-035), visita rota en frontend (BUG-036), notificacion de resena a endpoint inexistente (BUG-037), conteo de miembros de Parche (BUG-038), relabel residual Pandilla (BUG-039), etiquetas de chat desfasadas (BUG-040), gate de voto de utilidad ausente (BUG-041), formula de nivel de `album_crear` (BUG-042), tabs de comunidad en GUIA (BUG-043). El mapa completo (23 gaps) vive en `ExploraCO_Sistema_Social_v5.md` seccion 15.2.

- **Evidencia (ADR-006):** los dos documentos maestros existen en `exploraco desarrollo/ampliacion desarrollo/`; el enlace Plan Maestro v5 -> Sistema Social v5 y el inverso fueron verificados (ambos archivos existen y las rutas citadas son correctas); los 9 BUGs se registraron con la evidencia confirmada contra el codigo real (`mi-perfil.html:1800`, `usuario-session.js:598-609`, `api/interacciones.js:4618-4637`, `api/interacciones.js:2602-2604`, `mi-perfil.html:514/517`, `index.html:4037`, `comunidad.html:648-654`, `api/interacciones.js:3329-3380`, `api/interacciones.js:3479`, `GUIA_DE_DESARROLLO.md:900-903`).

- **Pendiente operativo (heredado de TSK-101, sin cambio):** aplicar `db/migrations/016_multinivel_crowdsourcing.sql` en Neon; configurar `SESSION_JWT_SECRET` y `RESEND_API_KEY` (y `SITE_URL`) en Vercel; commit/push/deploy en un solo release; verificar en vivo. Persisten 2 flujos ROTO de UI (BUG-035/BUG-036) que requieren codigo (fuera del alcance documental).

- **Fuera de alcance:** correccion de los 9 hallazgos en codigo (se documentan, no se corrigen); actualizacion de GUIA_DE_DESARROLLO.md/RUTA/PROJECT.md/BLUEPRINT.md (otra tarea).

---

### TSK-103: Perfil publico museo + Mensajeria Directa + Arbol de Clases de 16 ramas + Casas + categorias de consumibles [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-15, implementada y verificada en working tree; el smoke de cierre esta ENTREGADO y en verde 73/73 PASS). **PENDIENTE OPERATIVO: aplicar `db/migrations/017_perfil_publico_arbol_casas.sql` y `db/migrations/018_consumibles_categorias.sql` en Neon (016/015 ya aplicadas) + commit/push/deploy.** El smoke dedicado `scripts/smoke_017_perfil_arbol_casas.js` esta ENTREGADO (verificado contra archivo real, ADR-006: el archivo existe) y pasa 73/73 PASS (evidencia: `node scripts/smoke_017_perfil_arbol_casas.js` -> 73/73 PASS, 2026-09-15).
- **Prioridad:** ALTA
- **Fecha:** 2026-09-15
- **Prompt origen:** `PROMPT.md` (Entrega "perfil publico museo + DM + Arbol de 16 ramas + Casas + categorias de consumibles", WP-1..WP-7)
- **ADR:** ADR-028 (DECISIONS.md); consume precedentes ADR-018/ADR-025/ADR-026/ADR-027
- **Checklist de despliegue:** `docs/DEPLOY_017.md`
- **Responsable:** free-build/build (orquestador) + backend/sql-security/frontend/admin/renderer/qa + docs-keeper

- **Alcance ejecutado (verificado contra archivo real, ADR-006):**

  **WP-1 [Esquema -- migracion 017] COMPLETADO (aplicacion en Neon PENDIENTE):** `db/migrations/017_perfil_publico_arbol_casas.sql` (NUEVA, aditiva e idempotente ADR-008, ASCII-safe ADR-002). Columnas: `usuarios.intereses` (jsonb), `usuarios.pais_base` (varchar(2)), `usuarios.casa` (varchar(20)), `usuarios.casa_elegida_en` (timestamptz), `usuarios.progreso_arbol` (jsonb), `usuarios.perfil_config` (jsonb), `usuarios.perfil_publico` (boolean), `usuarios.dm_abierto` (boolean); `consumibles.categoria` (varchar(30) DEFAULT 'general'); `chat_salas.clave_dm` (varchar(80)). Constraints/indices: `chk_usuarios_casa`, `chk_chat_salas_tipo` (se elimina antes `chat_salas_tipo_check` legacy para no duplicar), `idx_chat_salas_dm_unica`, `idx_chat_salas_dm_a`, `idx_chat_salas_dm_b`, `idx_usuarios_casa`, `idx_usuarios_pais_base`, `idx_interacciones_usuario_tipo_activo`. Tabla NUEVA `usuario_bloqueos` (PK compuesta, `chk_usuario_bloqueos_distintos`) + `idx_usuario_bloqueos_bloqueado`.
  **WP-2 [Esquema -- migracion 018] COMPLETADO (aplicacion en Neon PENDIENTE):** `db/migrations/018_consumibles_categorias.sql` (NUEVA, aditiva). Categoriza 17 consumibles: `perfil` 7 (`perfil_marco_dorado`, `perfil_tema_oscuro`, `perfil_banda_artista`, `perfil_marco_plata`, `perfil_vitrina_destacada`, `perfil_titulo_custom`, `perfil_fondo_paisaje`), `impulso` 3, `social` 4, `coleccion` 2, `general` 1. Un UPDATE por categoria con lista explicita de claves (se evita `LIKE 'perfil_%'` por el comodin `_`). Presupone la 017 aplicada.
  **WP-3 [Perfil publico + blindaje PII] COMPLETADO:** `api/usuarios.js` v10 -- `GET tipo=perfil_publico` (version ligera) + proyeccion owner-aware de `GET ?id=` (subconjunto publico SIN email/tokens/`device_hashes`/`codigo_referido`; el detalle completo solo para admin o el dueno); `?buscar=` exige admin; `?tipo=referido_codigo` exige sesion firmada JWT (ADR-025). Cierra la fuga de PII PREEXISTENTE. `api/interacciones.js` gana `GET tipo=museo_publico` (perfil + trofeos + fotos + destinos + arbol en solo lectura) y `api/utilidades.js` agrega `/registro.html` y `/perfil.html` a `STATIC_PAGES`.
  **WP-4 [Arbol de Clases de 16 ramas] COMPLETADO:** `api/interacciones.js` v14 -- catalogo `RAMAS` en codigo (16 = 4 facciones x 4 ramas, 5 nodos cada una; `RAMA_TIERS = [0,100,250,450,700]`), puntos derivados `D_R` recalculados en cada lectura + bonos SOLO de misiones completadas. Ramas: GET `arbol_catalogo` (publico), GET `arbol_usuario` (progreso + persistencia write-once de fechas de nodo para el dueno con sesion), POST `rama_activar` (gate nivel 5, sin coincidencia de faccion; `art_*` delega en `usuarios.vocaciones`), POST `arbol_usuario` `accion=bono_mision` (+25 unico e idempotente de `mis_perfil_completo`). `comprar_consumible` aplica el descuento del nodo 5 si la categoria coincide. `museo_publico` expone el arbol en solo lectura.
  **WP-5 [Casas + Origen + perfil_actualizar] COMPLETADO:** `api/usuarios.js` v11/v12 -- POST `casa_elegir` (espejo de `faccion_elegir`, con sesion firmada y nivel 2) y GET `casa_ranking` (normalizado por numero de miembros); POST `perfil_actualizar` (alias `perfil_editar`) con SET dinamico parametrizado, sesion firmada del dueno, `pais_base` ISO-2 y merge JSONB de `perfil_config`. `api/interacciones.js` v15 -- Origen derivado (`local`/`nacional`/`extranjero`) por FILA de accion comparando `pais_base`/`ciudad_base` con la ciudad del destino (normalizada con `TRANSLATE`); bono x1.2 SOLO dentro de `D_R` (nunca sobre `xp_total` ni `interacciones.xp_ganado`); 8 misiones de grupo `perfil` (`mis_perfil_*`).
  **WP-6 [DM + bloqueos + categorias en admin] COMPLETADO:** `api/interacciones.js` -- DM (`dm_enviar` / `dm_hilos` / `dm_mensajes` / `dm_bloquear`) sobre `chat_salas.tipo='dm'` + `clave_dm`; hilo nuevo con cobro de 20 XP al emisor; respeto de `usuario_bloqueos` (403); `chat_msg` rechaza atacar salas DM. GET `consumibles?categoria=` (filtro; degrada si `categoria` no existe, ADR-008). `api/admin.js` -- `normalizarCategoriaConsumible` + `categoria` en `consumibles_lista`/`crear`/`editar` (400 `CATEGORIA_INVALIDA`).
  **WP-7 [Frontend + fixes + docs] COMPLETADO:** `perfil.html` (NUEVO), `registro.html` (NUEVO, alta con `?ref=`), `mi-perfil.html` (bloque Mi Red con QR/codigo/enlace, bandeja DM, Arbol de Clases SVG, pestanas PERFIL/CLASE/MI RED/MUSEO/INVENTARIO/MENSAJES/CUENTA, "Completa tu perfil", selector de Casa, tienda por chips de categoria, redirect R-3, relabel R-5), `comunidad.html` (R-4), `index.html` (R-5), `usuario-session.js` (captura `?ref=` con TTL 30d + `loginConEmail` con `codigo_referido` + JWT en refresco), `docs/DEPLOY_017.md` (NUEVO), `scripts/verify_017_precheck.js` (NUEVO, read-only).

- **Fixes R-1..R-5 (regresiones cerradas en esta entrega):**
  1. **R-1:** `registro.html` faltante (BUG-035) -> creada la pagina de alta con captura de `?ref=`.
  2. **R-2:** el frontend no capturaba `?ref=` -> `usuario-session.js` lo captura con TTL 30d y lo envia como `codigo_referido` en `loginConEmail`.
  3. **R-3:** `mi-perfil.html?id=` ignoraba el parametro -> redirect a `perfil.html?id=`.
  4. **R-4:** etiqueta "Control Territorial" enganosa en `comunidad.html` -> corregida.
  5. **R-5:** relabel Pandilla->Parche en la UI (residual de BUG-039) -> `index.html` y `mi-perfil.html`.

- **Fixes adicionales de seguridad/consistencia (detectados durante la entrega):**
  1. **Fuga de PII preexistente** en `api/usuarios.js` `?id=`/`?buscar=`/`referido_codigo` -> proyeccion owner-aware + admin-only + JWT (WP-3).
  2. **Carrera del cobro del DM** -> hilo nuevo idempotente (`ON CONFLICT (clave_dm) WHERE tipo='dm'`).
  3. **`museo_publico` tragaba el error de esquema** (devolvia 404 en vez de 503) -> error tipificado 503 `SCHEMA_NOT_MIGRATED`.
  4. **`casa_ranking`/`exp_ocultos` contaban Activos Ocultos sin filtrar `activo=true`** -> filtro agregado.

- **Desviaciones justificadas vs el prompt (registradas en ADR-028):** (a) `usuarios.bio` ya existia sin versionar, no se re-declara; (b) no se crea `idx_chat_mensajes_sala_fecha` porque `idx_chat_mensajes_sala` ya existe; (c) SI se crea el CHECK `chk_chat_salas_tipo` (008 no lo tenia) pese al "no inventes uno"; (d) los 5 senderos de `tabla_destino` CONVIVEN en la UI (no se reemplazan por el arbol); (e) se progresa en TODAS las ramas de cualquier faccion (`rama_activar` solo exige nivel 5).

- **Deuda tecnica (patron BUG-021):** columnas NO versionadas confirmadas en Neon: `interacciones.activo`, `usuarios.bio` y `usuarios.activo`. No se declaran en 017 para no chocar con la realidad; queda como deuda documentada.

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-010). Cero archivos nuevos en `api/`; todo entra como ramas `tipo=` y helpers en `api/usuarios.js` (v12), `api/interacciones.js` (v15), `api/admin.js` y `api/utilidades.js`.

- **Evidencia (ADR-006, contra archivo real):**
  - Existen: `db/migrations/017_perfil_publico_arbol_casas.sql` (12.013 bytes), `db/migrations/018_consumibles_categorias.sql` (5.281 bytes), `perfil.html` (53.205 bytes), `registro.html` (13.991 bytes), `docs/DEPLOY_017.md` (7.870 bytes), `scripts/verify_017_precheck.js` (6.177 bytes).
  - `scripts/smoke_017_perfil_arbol_casas.js` -> **COMPLETADO** (ENTREGADO, 31.677 bytes). Evidencia: `node scripts/smoke_017_perfil_arbol_casas.js` -> `73/73 PASS` (2026-09-15).
  - Headers reales: `api/usuarios.js` v12 (perfil_publico, blindaje PII, casas, perfil_actualizar) y `api/interacciones.js` v15 (arbol, museo_publico, DM, consumibles?categoria, Origen, 8 misiones perfil).
  - `api/utilidades.js` contiene `/registro.html` y `/perfil.html` en `STATIC_PAGES`; `api/admin.js` contiene `categoria` en el CRUD de consumibles.

- **PENDIENTE OPERATIVO (bloqueante para produccion, lo ejecuta Javier):**
  1. **Aplicar `db/migrations/017_perfil_publico_arbol_casas.sql` en Neon** (editor SQL, archivo COMPLETO en una corrida; idempotente). Prerrequisito: 016/015 ya aplicadas.
  2. **Aplicar despues `db/migrations/018_consumibles_categorias.sql`** (presupone la 017: la columna `consumibles.categoria` la agrega la 017).
  3. **Smoke de cierre:** `node scripts/smoke_017_perfil_arbol_casas.js` -> `73/73 PASS` (2026-09-15). ENTREGADO y en verde; ya no es pendiente.
  4. **Commit + push + deploy en un solo release** (incluye los pendientes previos sin commitear de TSK-095..TSK-102).
  5. **Verificacion en vivo:** perfil publico `perfil.html?id=` sin PII, DM (hilo nuevo, cobro 20 XP, bloqueo 403), Arbol (activar nodo nivel 5, bono de mision), Casas (elegir + ranking), tienda por categorias, `?ref=` capturado en `registro.html`.

- **Fuera de alcance:** migracion de datos legacy no prevista; atestacion nativa de dispositivo (evolucion futura de ADR-025); correccion de la deuda de columnas no versionadas (solo se documenta).

---

### TSK-104: Verificacion admin forzada en el upsert + rama `verificar_usuario` + dashboard con datos reales (5 tarjetas) y filtro de verificados [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-15, implementada y verificada en working tree, Escudo GOLD PASS). **PENDIENTE OPERATIVO: aplicar `db/migrations/017_perfil_publico_arbol_casas.sql` y `db/migrations/018_consumibles_categorias.sql` en Neon (016/015 ya aplicadas) + commit/push/deploy.**
- **Prioridad:** MEDIA
- **Fecha:** 2026-09-15
- **Prompt origen:** `prompt_exploraco_tsk104.md` (verificacion admin + diferenciacion visual de verificados + dashboard con datos reales)
- **ADR:** ADR-029 (DECISIONS.md); consume precedentes ADR-019 (`destinos.verificado`) y ADR-028 (`email_verificado` / `verificar_usuario`)
- **Responsable:** build (orquestador) + backend/admin/qa + docs-keeper

- **Alcance ejecutado (verificado contra archivo real, ADR-006):**

  **Tarea A [`api/usuarios.js`, +45/-6 en el working tree] COMPLETADO:**
  1. **[A1 - auto-verificacion del admin en el upsert]** El INSERT de `usuarios` agrega la columna `email_verificado` (`$7`) y el `ON CONFLICT (auth_id) DO UPDATE` agrega `email_verificado = (COALESCE(usuarios.email_verificado, false) OR EXCLUDED.email_verificado)`. La condicion es `email.toLowerCase() === 'brsk84@gmail.com' || nombre.toLowerCase() === 'javier'`. El `OR` hace la marca idempotente y monotona: nunca desmarca a quien ya estaba verificado.
  2. **[A2 - rama POST `tipo=verificar_usuario`, admin-only]** Guard `esAdminUsuario(req)` -> 401 `'No autorizado'`; 400 si falta `usuario_id`; `UPDATE usuarios SET email_verificado=$1 WHERE id=$2 RETURNING id`; 404 si no hay filas; responde `{ ok, usuario_id, email_verificado }`. El valor enviado es el estado final (idempotente: permite marcar y desmarcar).
  3. **[C1 - `total` en GET `?tipo=leaderboard`]** Se agrega `SELECT COUNT(*)::int AS n FROM usuarios WHERE activo = true` y el campo aditivo `total` a la respuesta `{ ok, data, total }` (no altera `data`).

  **Tarea B [`admin.html`, +42/-8 en el working tree] COMPLETADO:**
  4. **[B - diferenciacion de verificados en `renderTabla()`]** Fila con fondo `#f0fdf4` y borde izquierdo `#22c55e` cuando `p.verificado`; badge `VERIF` tras el nombre. **[B3 - filtro]** Pills `data-verified` + variable `currentVerifiedFilter` + `setVerifiedFilter()` + condicion `if(currentVerifiedFilter === true && !p.verificado) return false` dentro de `filtered`.

  **Tarea C [`admin.html` y `api/utilidades.js`] COMPLETADO:**
  5. **[C1 - tarjeta Usuarios]** `ds-usuarios` deja de usar `st.destinos`; ahora lee el `total` real del leaderboard.
  6. **[C2 - tarjeta Visitas + rama nueva]** `api/utilidades.js` (+24/-0) agrega la rama admin-only GET `?tipo=visitas_global` -> `{ ok, total, v30, v7 }` sobre `interacciones tipo='visita' AND activo=true` (usa `auth(req)`/Bearer). No existia endpoint de visitas globales y NO se creo archivo nuevo (8/8 intacto, ADR-010). `admin.html` consume esa rama para `ds-visitas`.
  7. **[C3 - quinta tarjeta]** Tarjeta `ds-verificados` derivada del array local `places` (`p.verificado === true`). **[C4 - CSS]** `.stats-grid` pasa a `repeat(5,1fr)`.
  8. **[Fix post-sync]** `syncFromNeon()` re-renderiza el dashboard si la pantalla esta activa, para que las tarjetas no queden en 0 en un navegador limpio.

- **Decisiones aprobadas por Javier (2026-09-15):**
  1. La migracion 016 ya estaba aplicada (confirmado segun NEXT.md/ADR-028/`docs/DEPLOY_017.md`); el prompt de tarea la declaraba "pendiente" por error (ADR-006: se confirma contra las fuentes del repo).
  2. C2 se resolvio creando la rama `visitas_global` (no existia endpoint de visitas globales).
  3. Dashboard con 5 tarjetas.
  4. Filtro "Verificados" + badge en la tabla.
  5. A2 usa `esAdminUsuario` + 401 (consistencia con el patron del archivo); el prompt sugeria 403.
  6. El conteo de viajeros entra como campo aditivo `total` en el leaderboard (no se toca `stats` de `api/destinos.js`).

- **Hallazgos QA residuales (no bloqueantes; ver observaciones en BUGS_HISTORICOS.md):**
  - **H4 (riesgo aceptado):** cualquier usuario que se registre con nombre `javier` queda auto-verificado (es el requisito textual del prompt). Riesgo de integridad a revisar.
  - **H6:** `GET ?tipo=leaderboard` es publico y ahora expone `total` (conteo de usuarios) sin Bearer.
  - **H7:** `verificar_usuario` con `usuario_id` no-UUID devuelve 500 (capturado por el try externo) en vez de 400.
  - **H8 (preexistente, fuera de TSK-104):** `api/utilidades.js` tiene un `.catch(function(){})` vacio en la rama `visitas` POST, baseline preexistente no-ASCII (680 bytes >127) y 24 backticks; NINGUNO atribuible a TSK-104 (las lineas nuevas del diff estan limpias).

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-010). Cero archivos nuevos en `api/`; todo entra como ramas `tipo=` y ajustes puntuales.

- **Evidencia (ADR-006, contra archivo real):**
  - Header real `api/usuarios.js` v13 al cierre de TSK-104 ("verificacion admin forzada, rama verificar_usuario, total en leaderboard"); nota: el header habia quedado en v9 pese a que el changelog ya documentaba v10-v12 (TSK-103), por eso el salto v9 -> v13. **Nota de version (ADR-006, 2026-09-15): el header real HOY es v14** por el hotfix de login BUG-054 (SQL invalido del merge de `device_hashes`), documentado mas abajo en "Hotfix posterior".
  - `api/utilidades.js` v2 con la rama `visitas_global`; `git diff --stat` = 3 archivos, +105/-14 (`api/usuarios.js` 45, `api/utilidades.js` 24, `admin.html` 50).
  - `esAdminUsuario` existe en `api/usuarios.js` (L180) y A2 lo usa.
  - QA reporta Escudo GOLD PASS (sintaxis, ASCII-safety de lo nuevo, balance de divs). Las lineas agregadas a `api/utilidades.js` no aportan no-ASCII ni backticks.

- **PENDIENTE OPERATIVO (bloqueante para produccion, lo ejecuta Javier):**
  1. **Aplicar `db/migrations/017_perfil_publico_arbol_casas.sql` en Neon** y despues **`018_consumibles_categorias.sql`** (el orden importa: la 018 presupone la 017).
  2. **Commit + push + deploy en un solo release** (incluye los pendientes previos sin commitear de TSK-095..TSK-103 + las migraciones 015/016/017/018).
  3. **Verificacion post-deploy:** A1 (la cuenta admin aparece con `email_verificado=true`), A2 (Bearer valido marca/desmarca; sin Bearer 401; UUID inexistente 404), C1/C2/C3/C4 (las 5 tarjetas con datos reales y sin quedar en 0 en navegador limpio).

- **Fuera de alcance:** correccion de los hallazgos H4/H6/H7/H8 (se documentan, no se corrigen); aplicacion de las migraciones 017/018 (la ejecuta Javier); cambios de codigo posteriores al cierre documental.

- **Bugfix posterior (2026-09-15): regresion colateral de BUG-049 en `refrescarSesion()` -- no previsto en el alcance original de TSK-104.** Detalle completo en `BUGS_HISTORICOS.md` BUG-053.
  - **Sintoma reportado por Javier:** la cuenta `brsk84@gmail.com` (auto-verificada por A1 de esta tarea) tenia `email_verificado = TRUE` en Neon, pero `mi-perfil.html` seguia mostrando el banner "Verifica tu email" y bloqueaba referidos/facciones/casa/DM.
  - **Causa raiz (QA):** `GET /api/usuarios?id=UUID` nunca devuelve `jwt` y, con JWT faltante/expirado, responde la proyeccion publica SIN `email`/`auth_id`/`jwt`/`email_verificado` (`api/usuarios.js`, L500-529; fuga cerrada por BUG-049 / ADR-028). Las dos `refrescarSesion()` REEMPLAZABAN `window.ExploraCO.usuario` (`usuario-session.js`, L1092; `mi-perfil.html`, L854).
  - **Fix (working tree, SIN commitear):** `usuario-session.js` (+21/-4) y `mi-perfil.html` (+19/-4) fusionan la respuesta (`Object.assign({}, actual, d.data)`), conservan `jwt`/`jwt_expira_en` y, ante la proyeccion publica (respuesta sin `email`), no pisan la sesion y llaman `refreshJwt()`/`renovarJwt()`. No quedan asignaciones de sesion alimentadas por GET.
  - **Evidencia (ADR-006):** `git diff --stat` = 2 archivos, +32/-8; `node --check` OK en ambos; delta ASCII 0 en el bloque nuevo; balance de divs de `mi-perfil.html` 0; `scripts/smoke_017_perfil_arbol_casas.js` 73/73 PASS; `scripts/smoke_016_multinivel_crowdsourcing.js` 39/39 PASS; sin recursion.
  - **Estado:** RESUELTO en working tree (2026-09-15); **PENDIENTE commit/push/deploy** y re-login del usuario afectado si su `localStorage` ya perdio `auth_id`/`email`. Repara la regresion colateral de BUG-049 (BUG-049 permanece RESUELTO y sin cambios).
  - **Deuda QA no bloqueante (preexistente, NO de este fix):** `scripts/smoke_test_perfil_progreso.js` espera 22 misiones vs 36 reales; `scripts/smoke_test_epic_prompt.js` espera VOCACIONES 3 vs 4 y `chat_salas` plan vs plan+dm. Ver DQ-1/DQ-2 al final de BUGS_HISTORICOS.md; los smokes NO se actualizan en este cierre.

- **Hotfix posterior (2026-09-15): login 500 por SQL invalido en el merge de `device_hashes` -- no previsto en el alcance original de TSK-104.** Detalle completo en `BUGS_HISTORICOS.md` BUG-054.
  - **Sintoma reportado por Javier:** `POST /api/usuarios` (upsert de login/registro) devolvia 500 para TODOS los logins; error real de Postgres/Neon: `column "t.ord" must appear in the GROUP BY clause or be used in an aggregate function` (SQLSTATE 42803).
  - **Causa raiz:** commit origen `7cc28fe` ("sistema de puntos", 2026-09-14), PREVIO a TSK-104; lo expuso el re-upsert forzado por el fix de sesion (BUG-053), porque `usuario-session.js` envia siempre `device_hash`.
  - **Fix (working tree, SIN commitear):** `api/usuarios.js` (+30/-14; header `v13` -> `v14`) con `jsonb_agg(h ORDER BY ord)` (ORDER BY DENTRO del agregado) y `try/catch` best-effort que loguea con `console.error` y NO re-lanza (el fingerprint nunca bloquea el login).
  - **Evidencia (ADR-006):** header real L2 `v14`; bloque del hotfix L981-1006; `node --check` OK; ASCII/backticks/doble-escape 0/0/0; simulacion runtime con mock `sql`/`neon` 15/15 PASS (200 con `device_hash`; 200 incluso si el UPDATE del fingerprint falla); sin regresion en A1/`verificar_usuario`/`total`; el patron invalido ya no aparece en `api/*.js`.
  - **Estado:** RESUELTO en working tree (2026-09-15); **PENDIENTE OPERATIVO: commit/push/deploy** (login roto en produccion). Ver el pendiente y la verificacion post-deploy en NEXT.md.

---

### TSK-105: Lote "promptarreglos" -- DM 500, galeria duplicada, popover Guardar, "Estuve aqui", unificacion Como llegar/Ubicacion, galeria unificada de destino, seguridad de album y degradacion 503 [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-16, implementada y verificada en working tree). **PENDIENTE OPERATIVO (BLOQUEANTE para cerrar al 100%): aplicar la migracion 004 (`scripts/apply_004_foto_url.js`) + ejecutar `scripts/dedupe_destinos_fotos.js --apply` (dedupe + indice unico) en Neon + commit/push/deploy.**
- **Prioridad:** Alta
- **Fecha:** 2026-09-16
- **Prompt origen:** `promptarreglos.txt`
- **ADR:** ADR-030 (DECISIONS.md); cierra BUG-036 y consume los precedentes ADR-024 (geocerca), ADR-025 (sesion firmada + nonce), ADR-027 (piramide de referidos) y ADR-028 (blindaje PII)
- **Responsable:** build (orquestador) + architect-review + qa + docs-keeper

- **Alcance ejecutado (verificado contra archivo real, ADR-006):**

  1. **BUG-055 - `dm_hilos` 500 (SQLSTATE 42P08).** `api/interacciones.js` L2937-2939 y L2962 castean a texto los usos uuid del parametro ambiguo: `m.usuario_id::text<>$1`, `m2.usuario_id::text=$1` y `bloqueador_id::text=$1 OR bloqueado_id::text=$1`. Causa: `$1` se comparaba contra `split_part(...)` (text) y contra columnas uuid a la vez.
  2. **BUG-056 - foto repetida en la galeria (hostal-r10).** Causa raiz multiple: `destinos_fotos` sin `UNIQUE(destino_id,url)` y sin migracion que la cree, `api/admin-destinos.js` PUT re-insertaba sin borrar, `api/utilidades.js` POST `?tipo=fotos` acumulaba y `admin.html` hacia DOBLE escritura. Fix: semantica REPLACE (dedupe por url + DELETE + reinsert) en `api/admin-destinos.js` PUT/POST (upsert por slug, helper `normFotosGaleria` L43-60, guards 400 en L230/L340-346) y en `api/utilidades.js` POST (L225-234), con guard anti-perdida (lista vacia -> 400 y NO borra); `admin.html` elimina la segunda escritura; `galAll` dedupe defensivo en el render (`api/pagina-destino.js` L727-733).
  3. **BUG-057 - popover "Guardar" cerraba con CUALQUIER click.** `cerrarPopoverGuardar` (`api/pagina-destino.js` L2298) solo cierra si el click es FUERA (`p.contains(ev.target)`) o sobre `#btn-guardar`; `toggleMapaDest` (L2347) muestra error si `!data.ok` y sus `catch` usan `console.warn`.
  4. **BUG-058 - "Estuve aqui" nunca completaba (cierra BUG-036).** `usuario-session.js` solicita `GET ?tipo=geo_nonce_solicitar` (L649-665), envia `Authorization: Bearer` + `nonce`, maneja 401 con `refreshJwt` y reintenta UNA vez con nonce nuevo (L698-767), y traduce `NONCE_*`/`SESION_*`; `obtenerUbicacion` (L602-647) distingue los codigos 1/2/3 y reintenta con baja precision ante 2/3.
  5. **Unificacion "Como llegar" + "Ubicacion".** `api/pagina-destino.js` funde `secTransporteHostal` (id original "como-llegar") y `secMapa` (id original "mapa") en `secComoLlegar` (id="como-llegar", transporte arriba + mapa abajo), con UNA sola entrada de subnav (`{id:'como-llegar', label:'Como llegar'}`) y anclas legacy invisibles `#fotos` y `#mapa`.
  6. **Galeria unificada de destino (ADR-030).** `#galeria` y `#fotos` se fusionan en UNA seccion `id="galeria"` (miniaturas curadas + "Fotos de viajeros" `#fp-grid` + caja `#fp-upload`), con ancla legacy invisible `<span id="fotos">`; nueva UI "Guardar en album" en fotos de viajeros (GET `tipo=albumes` + POST `album_agregar_foto`); helper cliente `galEsc()` (L2379) que escapa HTML y cierra un XSS preexistente del inline. El modulo unificado se muestra SIEMPRE en la ficha.
  7. **BUG-059 - seguridad de album + consistencia de XP.** `album_agregar_foto` valida la propiedad del album (403 `ALBUM_AJENO`, L5143) y tipifica `23503` -> 400 `AUTOR_ORIGINAL_INVALIDO` (L5181); `album_voto` llama `repartirXpReferidos` (L5237), cerrando el gap de la piramide de ADR-027.
  8. **BUG-060 - degradacion del 503 por migracion 004 no aplicada.** Helper `queryConAvatarFallback` (`api/interacciones.js` L2114) degrada `42703` (`usuarios.foto_url` ausente) reintentando con `avatar_url` en `museo_publico` (L2760), `album_detalle` (L3382/L3394) y `galeria_destino` (`gdUsuarios`/`gdViajeros`, L3499/L3542); `api/usuarios.js` hace lo equivalente en `perfil_publico`. Antes eran 503. Mismo patron que BUG-051; causa raiz: migracion 004 nunca aplicada (patron BUG-021).

- **Decisiones de producto (revisadas por architect-review):**
  1. **NO se permite votar fotos curadas en esta entrega:** no se creo el tipo `foto_curada_voto`; `tipo_voto=null` para curadas. Se vota SOLO viajeros (`foto_voto`) y album (`album_voto`). Razon: `destinos_fotos.id` NO es estable (el REPLACE lo re-crea).
  2. **`origen='album'` APAGADO por defecto:** las album_fotos por cercania solo aparecen con `incluir=albumes` en `GET tipo=galeria_destino`.
  3. **`items[]` SOLO se emite si el cliente envia `incluir`** (protege a `galeria.html`, que no lo envia).
  4. **El modulo unificado se muestra SIEMPRE en la ficha** (`scripts/smoke_auditoria_pagina_destino.js` actualizado a 54 checks).
  5. **`autor_original_id` null:** `album_agregar_foto` lo normaliza con `|| usuarioId2` y el dedup se hace por SELECT (no se depende del indice unico, que con NULL no deduplica).

- **Archivos modificados en el working tree (SIN commitear; `git diff --stat` = 8 archivos, +649/-167):**
  - `api/interacciones.js` (271 lineas cambiadas): casts `::text` de DM, `queryConAvatarFallback`, `items[]`/`incluir`, 403/400 de album, `repartirXpReferidos` en `album_voto`.
  - `api/pagina-destino.js` (197 lineas cambiadas): `secComoLlegar`, `#galeria` unificada, UI "Guardar en album" (`abrirAlbumPopover`), `galEsc`, fix del popover.
  - `api/admin-destinos.js` (71 lineas cambiadas): `normFotosGaleria` + REPLACE + guards.
  - `api/utilidades.js` (59 lineas cambiadas): REPLACE en POST `?tipo=fotos`.
  - `api/usuarios.js` (27 lineas cambiadas): fallback de avatar en `perfil_publico`.
  - `usuario-session.js` (127 lineas cambiadas): nonce + Bearer + reintento + geolocation.
  - `admin.html` (8 lineas cambiadas): elimina la doble escritura de la galeria.
  - `scripts/smoke_auditoria_pagina_destino.js` (56 lineas cambiadas): 54 checks.
  - NUEVOS sin versionar: `scripts/apply_004_foto_url.js`, `scripts/dedupe_destinos_fotos.js`.

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001). Cero archivos nuevos en `api/`; todo entra como ramas `tipo=` y helpers.

- **Evidencia (ADR-006, contra archivo real):**
  - Smoke: `node scripts/smoke_auditoria_pagina_destino.js` -> `TODOS LOS SMOKE TESTS PASARON (54 checks)`.
  - `api/interacciones.js` L2114, L2937-2939, L2962, L3382, L3394, L3499, L3542, L5143-5181, L5237; `api/pagina-destino.js` L1521/L1525 (`#galeria` + ancla `#fotos`), L1810 (`secComoLlegar`), L2298, L2347, L2379; `api/admin-destinos.js` L43-60/L230/L340-346.
  - **Nota de version (ADR-006):** los comentarios nuevos de `api/interacciones.js` se rotulan `v16`, pero el header real sigue en `v14` y no se agrego el bloque de changelog `v16`; inconsistencia de version a corregir en el commit.

- **PENDIENTE OPERATIVO (bloqueante para produccion, lo ejecuta Javier; requiere `DATABASE_URL`):**
  1. **`node scripts/apply_004_foto_url.js`** -> aplica `db/migrations/004_usuarios_blog_autor.sql` (`usuarios.foto_url` + `ciudad_base`); cierra de raiz el BUG-060.
  2. **`node scripts/dedupe_destinos_fotos.js --apply`** -> backup + borra duplicados de `destinos_fotos` + `CREATE UNIQUE INDEX idx_destinos_fotos_destino_url`; cierra al 100% el BUG-056.
  3. **Commit + push + deploy en un solo release** (incluye los pendientes previos sin commitear de TSK-095..TSK-104 y las migraciones 015/016/017/018).
  4. **Verificacion post-deploy:** `dm_hilos` 200; "Estuve aqui" completa con nonce+Bearer; popover Guardar conserva checkboxes; galeria sin repetidas; voto de viajeros/album y "Guardar en album" (403 `ALBUM_AJENO` con album ajeno); sin 503 en museo/galeria/albumes/perfil publico; "Como llegar" con transporte + mapa en una sola seccion.

- **Fuera de alcance:** voto de fotos curadas (recorte del MVP, ver decisiones); subida real de archivos; correccion de la doble fila de galeria historica (la hace el script); bump del header `v14` -> `v16` (se corrige en el commit).

---

### TSK-106: Capa multimedia del mapa (filtro por usuario), galeria unificada en `galeria.html` y 12 miniaturas en el hero de la ficha [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-16, implementada y verificada en working tree). **PENDIENTE OPERATIVO: commit/push/deploy** (junto con los pendientes previos de TSK-095..TSK-105).
- **Prioridad:** Alta
- **Fecha:** 2026-09-16
- **Prompt origen:** `PROMPT_MULTIMEDIA_GALERIA.md` (sin versionar en el working tree al cierre).
- **ADR:** DECISIONS.md ADR-030 (actualizado con la decision H-1 y el re-alcance de P3); consume ADR-021 (capa audiovisual estricta), ADR-025 (sesion firmada / nonce) y ADR-028 (blindaje PII). Bug derivado: BUGS_HISTORICOS.md BUG-061 (H-2, no corregido aqui).
- **Responsable:** build (orquestador) + qa + docs-keeper

- **Alcance ejecutado (verificado contra archivo real, ADR-006; `git diff --numstat` = 5 archivos, +243/-56):**

  1. **PROBLEMA 1 - capa multimedia del mapa (`api/interacciones.js` + `index-api-connector.js`).** `GET ?tipo=multimedia_mapa` acepta el filtro opcional `usuario_id` (validado por regex uuid; si el valor es invalido el filtro se IGNORA, nunca se manda texto no-uuid a un cast `::uuid` -> sin 22P02). Con `usuario_id`: rama albumes -> `a.usuario_id=$N::uuid`; rama destinos -> `d.id IN (SELECT i.destino_id FROM interacciones i WHERE i.usuario_id=$N::uuid AND i.tipo IN ('guardado','voto','rating') AND i.activo=true)`. Sin `usuario_id` el SQL publico es byte-identico al anterior (regresion cero). Se reemplazo el calculo fragil de indices del UNION ALL (`(mmTipos?'2':'1')`) por indices capturados al apilar cada parametro (`mmIdxTipos`/`mmIdxCiudad`/`mmIdxUsuario`); si un opcional no viene su indice es null y la clausula no se emite. `index-api-connector.js` deja de enviar `origen=album` y agrega `&usuario_id=<id>` cuando hay sesion (`window.ExploraCO.usuario.id`).
  2. **PROBLEMA 2 - tab audiovisual de "Mi Viaje Personal" (index.html): OMITIDO.** No existe ese tab y NO se construye en TSK-106 (decision explicita del usuario).
  3. **PROBLEMA 3 - galeria unificada: RE-ALCANZADO a `galeria.html`, NO a `comunidad.html`.** `comunidad.html` no tenia la seccion descrita (la galeria unificada real ya vive en `api/pagina-destino.js` `#galeria`). En `galeria.html` (modo destino) queda: aviso "Tienes fotografias de tu viaje?..." + `<input type="url">` + boton que hace `POST /api/interacciones {tipo:'foto', usuario_id, destino_id, url}` + grid unico "Fotos del destino" alimentado con `incluir=viajeros` (se consumen `items[]` del endpoint, con fallback a `fotos[]`+`usuarios[]`). Se elimino `gSeedCard` y la seccion `#g-dest-usuarios`.
  4. **PROBLEMA 4 - hero de la ficha con solo 3 miniaturas (`api/pagina-destino.js`).** El hero pasa de 3 a 12 miniaturas (`HERO_THUMBS_MAX=12`, `galAll.slice(1, HERO_THUMBS_MAX + 1)`); la query de `destinos_fotos` sube `LIMIT 12 -> 24` (material suficiente para `galAll`); el CSS `.prow` pasa de `flex` a `grid` responsivo (6 columnas en desktop, 4 en `<=760px`) y `.pth` pierde el `flex:1`.

- **Decisiones tomadas por el usuario (registradas):**
  1. **P2 OMITIDO:** el tab audiovisual de "Mi Viaje Personal" no existe y no se construye en TSK-106.
  2. **P3 RE-ALCANZADO a `galeria.html`:** aplicado ahi, NO a `comunidad.html`.
  3. **H-1 RESTRICTIVO (confirmado):** con sesion, `usuario_id` RESTRINGE la capa multimedia a lo propio (albumes del usuario + destinos que guardo/voto/califico); no es aditivo. Registrado en ADR-030.
  4. **H-2 -> BUG-061:** `POST tipo='foto'` confia en `body.usuario_id` sin `validarSesion` (spoofable); se registra como bug independiente y NO se corrige en TSK-106 (escalado a `sql-security`).

- **Archivos modificados en el working tree (SIN commitear):**
  - `api/interacciones.js` (+28/-5): filtro opcional `usuario_id` en `multimedia_mapa` + indices capturados del UNION ALL.
  - `index-api-connector.js` (+12/-2): la capa multimedia llama sin `origen=album` y con `usuario_id` si hay sesion.
  - `index.html` (+30/-6): `renderMapaMedia`/`mdMediasCercanas` ya NO descartan `origen==='destino'`; pins de destino en `#1f8a70` con borde punteado (`.mpa-media-pin-dest`), dedupe por `origen_id` (slug) y tope de 300 markers; el drawer titula ambos origenes.
  - `api/pagina-destino.js` (+12/-5): `HERO_THUMBS_MAX=12` + `slice(1,13)`, `LIMIT` de `destinos_fotos` 12 -> 24, `.prow` grid responsivo.
  - `galeria.html` (+161/-38): grid unico "Fotos del destino" + aviso/input/boton de compartir + `gItemCard`/`gDestinoItems`/`gShareFoto`; se eliminan `gSeedCard` y `#g-dest-usuarios`.

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001 / ADR-010). Cero archivos nuevos en `api/`.

- **Evidencia (ADR-006, contra archivo real):**
  - `node --check` OK en `api/interacciones.js`, `api/pagina-destino.js` e `index-api-connector.js`.
  - ASCII-safety: 0 bytes >127 en los 3 archivos JS tocados (`index-api-connector.js` no es `api/*`, pero tambien quedo en 0).
  - Smoke: `node scripts/smoke_auditoria_pagina_destino.js` -> `TODOS LOS SMOKE TESTS PASARON (54 checks)`.
  - `api/interacciones.js` L3719-3745 (validacion uuid + `mmIdx*`) y L3758-3775 (clausulas del UNION ALL); `api/pagina-destino.js` L745 (`HERO_THUMBS_MAX`) y L2524 (`LIMIT 24`); `index.html` `mapaMediaIcon`/`renderMapaMedia`/`mdMediasCercanas`/`openMapaMediaDrawer`; `galeria.html` `gDestinoItems`/`gItemCard`/`gShareFoto`.

- **Pendiente operativo:** **commit + push + deploy** de los 5 archivos en un solo release con los pendientes previos (TSK-095..TSK-105 + migraciones 015/016/017/018 y los scripts de la 004). Verificacion funcional post-deploy segun `PROMPT_MULTIMEDIA_GALERIA.md` seccion 5.

- **Hallazgo derivado (H-2 -> BUG-061):** `POST /api/interacciones` `tipo='foto'` (`api/interacciones.js` ~L5024-5035) usa `body.usuario_id` (`var usuarioId2= body.usuario_id || null;`, L4136) sin `validarSesion` (definida en L1911) -> suplantacion de autor. Preexistente; expuesto por la UI nueva de `galeria.html`. Severidad MEDIA; escalado a `sql-security`.

- **Hallazgo H-3 (no corregido):** `scripts/smoke_auditoria_pagina_destino.js` IGNORA el slug que se le pasa por `process.argv` (el prompt sugeria `node scripts/smoke_auditoria_pagina_destino.js hostal-r10`); el script no lee `process.argv` y valida solo datos minimos embebidos.

- **Higiene de working tree:** hay 3 archivos BORRADOS en el working tree ajenos a TSK-106 (`PROMPT.md`, `prompt_exploraco_tsk104.md`, `promptarreglos.txt`) que NO deben colarse en el commit de TSK-106.

- **Fuera de alcance:** tab audiovisual de "Mi Viaje Personal" (P2, omitido); correccion de H-2/BUG-061 (escalada a `sql-security`); correccion del smoke H-3; `comunidad.html` (no se toca).

---

### TSK-107: Capa de media del mapa (album de destino + visibilidad publica), guardados de media + area museo del perfil, y radio de verificacion por lugar para "Estuve aqui" [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-17, implementada en working tree, SIN commitear). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar `db/migrations/019_media_guardados_radio.sql` en Neon + commit/push/deploy + verificacion en vivo del caso `hostal-r10-bogota`.**
- **Prioridad:** Alta
- **Fecha:** 2026-09-17
- **ADR:** DECISIONS.md ADR-031 + ADR-032 + ADR-033.
- **Responsable:** build (implementacion) + docs-keeper.
- **Bug relacionado:** BUGS_HISTORICOS.md BUG-061 (`POST tipo='foto'` sin `validarSesion`) sigue ABIERTO y no se corrige en esta tarea.

- **Alcance ejecutado (verificado contra archivo real, ADR-006; `git diff --shortstat` = 7 archivos, +591/-53 + 1 migracion nueva sin versionar):**

  1. **ADR-031 - capa de media del mapa.** (a) Fix del 503 `SCHEMA_NOT_MIGRATED`: la consulta de `multimedia_mapa` se envuelve en `queryConAvatarFallback` (`api/interacciones.js` L3775), que degrada `42703` (`usuarios.foto_url` ausente, migracion 004) a `avatar_url`; antes el error escalaba al catch global. (b) Fila agregada por destino `origen='destino_album'` (portada via `ARRAY_AGG(... es_hero DESC NULLS LAST, orden ASC NULLS LAST)[1]` + `fotos_count`) ADEMAS de las fotos individuales `origen='destino'` (L3830-3865). (c) Relajacion del filtro restrictivo H-1/ADR-021: la capa publica ya no se restringe por sesion; el filtro solo aplica con `scope=mio` (si no viene, `mmUsuarioId=null`, L3745-3756). Frontend: toggle "Solo mio" (`index.html` `#mm-solo-mio` L1234 -> `setMapaMediaSoloMio`; `index-api-connector.js` agrega `&scope=mio&usuario_id=` solo con toggle activo + sesion, L350-387).
  2. **ADR-032 - guardados (bookmarks) de media + area museo del perfil.** Migracion 019 crea `media_guardados(usuario_id, fuente, item_id, activo, creado_en, PK(usuario_id,fuente,item_id))` con `CHECK fuente IN ('album','album_foto','viajero_foto')` y sin FK polimorfica (integridad validada en backend). Ramas nuevas en `api/interacciones.js`: GET `mis_fotos` (L3899), GET `mis_guardados_media` (L3929, degrada a lista vacia si falta la 019), POST `guardar_media`/`quitar_guardado_media` (L5476-5533, con 503 `SCHEMA_NOT_MIGRATED` explicito si falta la tabla). Visibilidad: fotos subidas y albumes creados = publicos (museo publico `perfil.html` "Sala V: Fotos", `+60/-3`); guardados = privados (solo `mi-perfil.html` `#mis-guardados-media-grid`, `+109/-0`). Sin endpoints nuevos (8/8, ADR-001).
  3. **ADR-033 - radio de verificacion por lugar.** Migracion 019 agrega `destinos.radio_m integer` con CHECK 25..100000 (NULL = heuristica 100/150/200/250 de ADR-024). `resolverRadioM(categoria, tags, nombre, radioExplicito)` prioriza el radio explicito (`api/interacciones.js` L160-182). Escalado de XP por amplitud: `factorXpPorRadio` con `RADIO_XP_MEDIO_M=1000` (50% XP) y `RADIO_XP_CERO_M=5000` (0 XP); la visita SIEMPRE se registra y marca el mapa (L137-148, L6844-6848). Solo el admin define el radio: `api/admin-destinos.js` acepta `radio_m` en POST/PUT (+16/-3) y `admin.html` expone `#f-radio-m` (+51/-1).

- **Archivos en el working tree (SIN commitear; verificados con `git diff --numstat`):**
  - `api/interacciones.js` (212/14): ADR-031 + ADR-032 + ADR-033.
  - `index.html` (89/3): toggle "Solo mio".
  - `index-api-connector.js` (57/31): wiring `scope=mio`.
  - `mi-perfil.html` (109/0): "Mis fotos" + "Mis guardados".
  - `perfil.html` (60/3): "Sala V: Fotos" publica (solo lectura, sin guardados).
  - `admin.html` (51/1): campo `#f-radio-m` + presets + carga/guardado.
  - `api/admin-destinos.js` (16/3): `radio_m` en SELECT/INSERT/UPDATE.
  - NUEVO sin versionar: `db/migrations/019_media_guardados_radio.sql` (65 lineas, aditiva, idempotente ADR-008, ASCII-safe ADR-002).

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001). Cero archivos nuevos en `api/`.

- **Evidencia (ADR-006, verificacion documental contra archivo real, 2026-09-17):**
  - Existe `db/migrations/019_media_guardados_radio.sql`; contiene `destinos.radio_m` + `destinos_radio_m_check` + tabla `media_guardados` + 2 indices.
  - `api/interacciones.js`: `factorXpPorRadio` L143, `resolverRadioM` L164, `queryConAvatarFallback` en `multimedia_mapa` L3775, `destino_album` L3832/L3861, `scope=mio` L3745/L3756, `mis_fotos` L3899, `mis_guardados_media` L3929, `guardar_media`/`quitar_guardado_media` L5476, `resolverRadioM(destVisita...)` L6833.
  - `mi-perfil.html`: `#mis-fotos-grid` L553, `#mis-guardados-media-grid` L559, `cargarMisFotos` L1758, `cargarMisGuardadosMedia` L1779, `quitarGuardadoMedia` L1800.
  - `perfil.html`: `pfFotos`/`pfCargarFotos` (Sala V).
  - `admin.html`: `#f-radio-m` L1713, `radio_m` en `_placeToAPI` L3822, en carga L6008/L6527.
  - **NO se ejecutaron smokes ni `node --check` en esta sesion documental** (no se reportan resultados de pruebas no corridas). La QA funcional queda pendiente de la verificacion en vivo post-deploy.

- **PENDIENTE OPERATIVO (bloqueante, lo ejecuta Javier; requiere Neon):**
  1. **Aplicar `db/migrations/019_media_guardados_radio.sql` en Neon** (archivo COMPLETO en una corrida; idempotente). Verificar `destinos.radio_m`, `destinos_radio_m_check`, `media_guardados` y los 2 indices.
  2. **Commit + push + deploy en un solo release** junto con los pendientes previos sin commitear (TSK-095..TSK-106 + migraciones 015/016/017/018 + scripts de la 004).
  3. **Verificacion en vivo:** caso `hostal-r10-bogota` (slug, coords 4.598835,-74.072662, status published) aparece en el mapa con pin de album; capa publica por defecto y "Solo mio" con sesion; `mis_fotos`/`mis_guardados_media` en perfil; radio de "Estuve aqui" con un `radio_m` explicito (XP 50% > 1 km y 0 > 5 km).

- **Hallazgos / pendientes derivados:**
  - **Sin UI de alta de bookmark:** no se encontro consumidor de `guardar_media` en el working tree; solo `quitar_guardado_media`. El area "Mis guardados" del perfil se puede poblar unicamente por API directa hasta que exista el marcador en galeria/ficha (el texto vacio de `mi-perfil.html` ya lo menciona).
  - **BUG-061 ABIERTO:** `POST tipo='foto'` sigue confiando en `body.usuario_id` sin `validarSesion` (escalado a `sql-security`); el flujo de `mis_fotos`/`guardar_media` convive con el.
  - **Nota de version (ADR-006):** `api/interacciones.js` mantiene header `v14` mientras los comentarios nuevos se rotulan `v17` (la migracion 019 tambien cita `v17`); inconsistencia a resolver en el commit.
  - **Rebote a revisar:** con `radio_m > 5000` la XP base de visita es 0, pero el bono rural plano de ADR-024 (+20) sigue sumando.
  - **`perfil.html` no muestra guardados** por diseno (privados); su "Sala V: Fotos" consume `mis_fotos` del dueno del museo.

- **Fuera de alcance:** BUG-061 (escalado a `sql-security`); UI de alta de bookmark (`guardar_media` sin consumidor); checkin de Activos Ocultos (mantiene su heuristica propia, no usa `radio_m`); verificacion en vivo (post-deploy).

---

## Regla de actualizacion
Toda tarea completada debe reflejarse aqui (cambio de Estado) y su cierre debe registrarse en NEXT.md como parte del ciclo documental (AI-DOS Cap. 9.9)[cite: 1]. Nueva tarea -> Modificar proyecto -> Actualizar documento -> Continuar Sprint[cite: 1].