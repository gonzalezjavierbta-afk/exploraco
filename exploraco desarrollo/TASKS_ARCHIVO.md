# TASKS_ARCHIVO.md - ExploraCO

Historico movido de TASKS.md (AI-DOS Core, Cero Borrado Logico, Regla de Oro 3).
Contiene el bloque Prioridad PAGINAS DINAMICAS (TSK-018..TSK-065) completo.
El tablero vigente es TASKS.md.

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


## Archivado 2026-11-14

- *(SUPERADO POR EL BLOQUE DE ARRIBA, 2026-11-12; se conserva por ADR-003)* **TSK-257 SISTEMA DE CARTAS EJERCITADO (65/64/57; 3 compras, 1 nivel, 4 expediciones, 1 compartir) (2026-11-12, pase documental unico R2; ADR-121 Enmienda 13) -- LO PRIMERO QUE HAY QUE LEER.** **Ejercicio real de punta a punta (2026-11-12 02:18Z, usuario `3b78efad-e9f6-49a7-bbd1-af836f528348` "Javier"), con los ids reales y contra la misma base:** **compra 1** `ct_comun_01` (Villa de Leyva, `comun`, **150 XP**) -> `emitidas` **0 -> 1**, ledger `carta_compra` **id 2939**; **nivel** Villa **1 -> 2** por **150 XP**, ledger `carta_nivel` **id 2940** (`xp_invertido=150`); **compra 2** segunda copia de Villa por **150 XP** -> `emitidas` **1 -> 2**, ledger `carta_compra` **id 2941**, `cantidad=2`; **expediciones** **4 cobros de 15 XP** (`xpd_eco_compra` x2 = **30 XP** y `xpd_obr_foto` x2 = **30 XP**), ledger `carta_expedicion` **ids 2942-2945**, **0 persistencia de mas**; **compartir** **1 asiento** (`xp_base 25`, **`xp_final 35.85`**), **`media_compartidos` 1 fila**, mas `logro` **10** y `mision` **15**. **Estado final medido:** `xp_total` **2489.62**, `xp_gastado_sinks` **930.00**, disponible **1559.62**; **inventario 2 cartas / 3 copias** (`ct_comun_01` base **2** + `car_artista_prueba` base **1**); niveles Villa **2** y prueba **1**; `emitidas` Villa **2**. **LOS 4 CONTADORES YA NO ESTAN EN 0:** `carta_compra` **3**, `carta_nivel` **1**, `carta_expedicion` **4**, `compartir` **1** -> `saldo`, `compra`, **nivel**, **expedicion** y **compartir** quedan **probados con dato real**. **Poder efectivo verificado por el handler:** Villa **5.3** con 2 copias a nivel 2 (`poder_sin_copias` **5.0**; el delta +0.3 es el factor `1 + min(cantidad-1,9) x 0.05` aplicado por codigo); carta de prueba **8** pero **`retirada:true`** y **`activa_catalogo:false`**; catalogo con sesion: Villa `posee=true`, `cantidad=2`, `cantidad_base=2`, `nivel=2`, `coste_nivel_xp=400`, `poder=4` (base). **D-34 CERRADA (080)** y **decision del operador: DEJAR** `car_artista_prueba` (`activo=false`, `emitidas=1`, copia del comprador viva) como **pieza historica con badge `Retirada`**, sin borrarla (ADR-003); catalogo publico **57**. **UX de retirada `?v=12`:** la ficha con `retirada:true` **no pinta** "Subir nivel" ni "Acunar otra", solo la nota de carta retirada (el backend habria dado **404/409**); **UI 213/213**. **Aclaracion:** **`nivel_gate` NO es puerta de compra** -- se usa para **reclamar sets** (`cartas_gate`, `api/usuarios.js:3337+`), por eso la carta de prueba con `nivel_gate=14` se compro con nivel de cuenta **1 por diseno**. **`xpd_obr_ugc`** pertenece al **autor de la obra** (`bc940e34-...`), **no a Javier**: sigue pendiente para ese usuario y **no es efecto de D-34**. **Foto:** **65 cartas / 64 activas / 57 acunables** (2 piezas de prueba: obra `[TEST]` en `cartas_media` + carta retirada). **Verificacion (pase de implementacion; ADR-006: no re-ejecutada aqui):** `npm test` **exit 0**, UI **213/213**, economia **83/83**, expedicion **64/64**, constantes **102/102**, divs **503/503, 606/606, 99/99**, **ASCII 0**. **Commits:** `2ddc89f` (copias), `0749777` (Enmienda 12), `939b5c4` (UX retirada `?v=12`); **no se afirma deploy mas alla de `939b5c4`**. **Deudas vivas:** **D-23** (arte: 20 imagenes / 5 laminas, el operador no genera artes nuevos), **D-32 residual / `030` dormida** (**0 ALTO, 2 MEDIO**, sin consumidor en runtime), **D-33** (una migracion aplicada no se edita), **`estado_iucn` FUERA** por decision del operador (403 sin token) y **`historico` inactivo** (0 cartas). **D-34 CERRADA.** Sigue **D-14 parcial** (`artista` solo con la carta de prueba retirada).
- *(SUPERADO POR EL BLOQUE DE ARRIBA, 2026-11-12; se conserva por ADR-003)* **TSK-257 COMPRA REAL EJERCITADA / D-34 CERRADA / COPIAS APILABLES (65 / 64 / 57) (2026-11-11, pase documental unico R2; ADR-121 Enmienda 12) -- LO PRIMERO QUE HAY QUE LEER.** **COMPRA REAL EJERCITADA (2026-11-11 21:48Z, usuario `3b78efad-e9f6-49a7-bbd1-af836f528348` "Javier"), medida por SQL:** `usuarios_cartas` **1 fila** (`car_artista_prueba`, variante `base`, `cantidad=1`), `usuarios_cartas_nivel` **1 fila** (nivel 1), `cartas_catalogo.emitidas` **0 -> 1**, `xp_ledger` **1 fila** `accion='carta_compra'` (**id 2429**, `xp_base=480`, `xp_final=0`, `es_exento=true`, contexto `precio_xp=480`) y el debito real en **`usuarios.xp_gastado_sinks = 480.00`** (disponible **1888.77**). La UI mostro **"ya la tienes"**: **D-26 confirmada con dato real** y **D-30 (`posee=true` no medido) cerrada de hecho**. **Por primera vez `saldo` y `compra` SI estan probados.** **D-34 CERRADA con la migracion 080** (`db/migrations/080_cartas_apagar_prueba_d34.sql`): `car_artista_prueba` pasa a **`activo=false`**, **`emitidas` sigue 1**, **la copia del comprador sigue existiendo y activa**, **`xp_gastado_sinks` sigue 480**, **cero `DELETE`** (ADR-003), **idempotente** (2a corrida **0 cambios**, **md5 identico**). **EFECTO LATERAL DETECTADO Y CORREGIDO:** `cartas_mias` filtraba `c.activo=true` y **ocultaba la carta comprada** (un usuario que pago 480 XP se quedaba sin ver lo suyo); ahora **incluye lo poseido con `retirada:true`** (mas `activa_catalogo` y `poder_sin_copias`) -> **se retira la venta, no la propiedad**. **REGLA NUEVA DEL OPERADOR, con esas palabras: "las cartas se pueden comprar varias, ya que esto aumenta los atributos que da cada carta".** **Contrato en la spec 12 (254 lineas, VIGENTE):** factor **`1 + min(cantidad-1, 9) x 0.05`** (**max 1.45**), **`CARTA_MAX_COPIAS=99`**, **`CARTA_COPIAS_BP=5`** / **`CARTA_COPIAS_CAP=9`** en `lib/cartas-config.js` (`:312-314`, con `factorCopias` `:320`, `poderConCopias` `:331`, `vectorExpedicion` `:355`); poder efectivo **visible en inventario y museo** y **dentro del vector de expedicion** con **tope de 40 por eje INTACTO** (`LEAST(40,...)` no se mueve: **se llega antes, no mas lejos**); el **catalogo sigue mostrando poder BASE a nivel 1 con 1 copia** (es escaparate); **409 `CARTA_TOPE_COPIAS`** al llegar a **99** (`tope_ok`, `WHERE cantidad < 99`); el cobro va **DESPUES de crear la copia** (**emit -> inv -> deb -> nvl -> led**); **fusion recalcula desde `cantidad-4`**; **progreso de coleccion solo con catalogo activo**, y las **retiradas quedan visibles en inventario con badge `Retirada`** y **fuera del progreso**. **UI:** **5 estados** (`Acunar`, `Tienes N` + `Acunar otra`, `Agotada`, `XP insuficiente`, `Tope: 99`) y **`?v=11`** en las **3** superficies. **Foto real del catalogo: 65 cartas / 64 ACTIVAS / 57 acunables-comprables**; **1 inactiva** (`car_artista_prueba`, poseida). **El catalogo publico en produccion responde `total=57` y `familia=artista` da 0.** **CORRECCION:** cualquier **"63 / 56"** de los docs era **aritmetica mal restada** (restaba 2 piezas de prueba, pero la obra `[TEST]` **vive en `cartas_media`, no es una carta**); el numero vigente es **65 / 64 / 57**. **Verificacion (pase de implementacion; ADR-006: no re-ejecutada aqui):** **`npm test` exit 0**; constantes **102/102**, economia **83/83**, UI **207/207**, expedicion **64/64**, arte **71/71**, **0 persistencia**; divs **503/503, 606/606 y 99/99**; **ASCII 0** en `api/*.js`, `lib/*.js` y smokes. **Deploy medido y acotado:** commit **`2ddc89f`** desplegado, **`cartas-ui.js?v=11` sirve `CARTA_TOPE_COPIAS`**, `comunidad.html` con **`v=11`** y **catalogo prod 57**; **no se afirma nada mas**. **DEUDAS ABIERTAS:** **D-23** (arte: **no se generan artes nuevos**, decision del operador), **D-27** (`total`/`restantes` publicos), **D-33** (gobernanza de migraciones), **D-32 residual**/**030 dormida** (**0 ALTO / 2 MEDIO**, cero consumidor en runtime), **D-20** (md5 070), **D-12/D-19** y **D-13** (sin tabla de copias por serial); **`estado_iucn` FUERA por decision del operador** (sin token, **403**, no se rellena a mano) y **`historico` INACTIVO** (0 cartas). **SIGUE EN 0 el ledger de `carta_nivel`, `carta_expedicion` y `compartir`:** los tres **nunca se han ejercitado** y **no se afirman probados**. **Prueba pendiente: una SEGUNDA compra con una cosmetica real de 75 XP** (p.ej. **`cs_marco_01`**) para ver el poder subir de **5.0 a 5.3 con 2 copias**.
- *(SUPERADO POR EL BLOQUE DE ARRIBA, 2026-11-11; se conserva por ADR-003)* **TSK-257 CORRECCION DE PRODUCTO: EL CATALOGO Y LA ACUNACION DE COPIAS NUEVAS SE VEN EN EL MERCADO (2026-11-11, pase documental unico R2; ADR-121 Enmienda 11) -- LO PRIMERO QUE HAY QUE LEER.** **Decision del operador (2026-11-11), con esas palabras:** *"el catalogo y la acunacion de copias nuevas se ven en el MERCADO; en Inventario solo se ve lo que ya se tiene"*. **Movimiento medido:** el bloque **"Comprar cartas (acunacion)"** con el host **`#catalogo-panel` ACTIVO** pasa a **`comunidad.html`**, dentro de **`#cpanel-mercado`** (host en **`:1240`**, titulo del bloque en **`:1239`**, panel abierto en **`:1213`**) y con **`data-c-cat-modo="mercado"`**, junto al mercado P2P. **Inventario:** en `mi-perfil.html` el host **NO se borra** (ADR-003): queda **vacio, oculto e inerte** con **`data-c-cat-modo="inventario" hidden`** (**`:1242`**) y en su lugar hay un **puente** "Ver catalogo en el Mercado" -> `comunidad.html#mercado` (**`:1240`**). **Guard:** `cartas-ui.js` exige la marca de superficie (`CATALOGO_MODO_ATTR` **`:1851`**, `catalogoHostActivo()` **`:1853`**, guard en el arranque **`:1869`**): solo monta con **`mercado`**; en Inventario **no monta y no hace peticiones**. **NO se mueve:** el boton **"Acunar"** de una carta **POSEIDA** sigue en la **ficha del Inventario** (es tu copia) y **las expediciones se quedan en Inventario** (se juegan desde tus cartas). **Camino de compra correcto:** **Mercado -> Comprar cartas -> Acunar**. **Verificacion (pase de implementacion; ADR-006: no re-ejecutada aqui):** UI **188/188**; divs **comunidad 503/503** (**+3**), **mi-perfil 606/606**, **perfil 99/99**; **`?v=10`** en las **3** superficies (`comunidad.html:1334`, `mi-perfil.html:9284`, `perfil.html:351`); **`npm test` exit 0**; **8/8 funciones serverless, cero endpoint nuevo, cero migracion**. **No se afirma deploy.** **D-34 SIGUE ABIERTA y su evidencia no cambia:** `usuarios_cartas` **sin filas** y `xp_ledger` **sin filas** con `accion='carta_compra'` -> mover el panel **no ejercita la transaccion**, solo cambia donde se ve el boton. **Checklist de cierre del sistema de cartas en `NEXT.md` (apertura).**
- *(SUPERADO POR EL BLOQUE DE ARRIBA, 2026-11-11; se conserva por ADR-003)* **TSK-257 PULIDO DEL CATALOGO (POSE POR VARIANTES, FICHA EN MODO LECTURA, FILTROS PERSISTENTES, NIVEL REAL) (2026-11-11, pase documental unico R2; ADR-121 Enmienda 10) -- LO PRIMERO QUE HAY QUE LEER.** **Dato:** **ninguna migracion nueva** (sigue **066-079**) y **cero endpoint nuevo** (`?tipo=cartas_catalogo` es rama existente; **8/8** funciones). **D-26 CERRADA:** `GET /api/usuarios?tipo=cartas_catalogo` **agrega TODAS las variantes** en `posee`/`cantidad` (antes solo `base`), anade **`cantidad_base`** y **no duplica filas**: **58 filas / 58 ids unicos**; `smoke_economia` **68/68** con **0 persistencia**. **D-28 CERRADA:** la tarjeta abre la **ficha en modo lectura** con **un unico** boton de acunar que **reutiliza la confirmacion de coste** (sin segundo camino de cobro), **sin boton de nivel si no posee**, **"Ya la tienes" + nivel** cuando `posee`, cierra con **Escape / clic fuera / X**, **devuelve el foco a la tarjeta** y lleva **`role="dialog"` + `aria-modal`**. **D-29 CERRADA:** `familia`/`rareza`/`q` persistidos en **`sessionStorage`** (clave **`exploraco.catalogo.filtros`**) con **lectura tolerante** (JSON corrupto -> defaults; sin storage -> no lanza), restauracion con **una sola peticion** y accion **"Limpiar filtros"**. **Contrato:** la fila trae **`nivel` REAL** de la copia (join a **`usuarios_cartas_nivel`**, PK `(usuario_id,carta_id)`, **sin nivel por variante**) y **`coste_nivel_xp`** via `costeSubidaNivel()`; **sin sesion `nivel:1` y `coste_nivel_xp:null`**; **en tope (5) `null`**. **Decisiones:** `poder`/`poder_base` **siguen a nivel 1** (poder base de la carta, comparable; el nivel se muestra aparte) y `coste_nivel_xp` **se expone con sesion aunque no se posea** (la UI solo pinta el boton si `posee`; **no es fuga**, el POST exige poseer). **Verificacion:** UI **179/179**, economia **73/73**, **`npm test` exit 0**, **`?v=9`** en las **3** superficies, divs **606/606, 500/500 y 99/99**. **D-34 SIGUE ABIERTA, con evidencia nueva de que la compra NO se ha ejercitado:** `usuarios_cartas` **0**, `usuarios_cartas_nivel` **0**, `emitidas` de **`car_artista_prueba` 0** y **`xp_ledger` sin filas** en `carta_compra`, `carta_nivel`, `carta_expedicion` y `compartir` -> **ni una copia emitida, ni un asiento de compra, ni un nivel subido**. La carta **`[TEST]` sigue `activo=true` y comprable a 480 XP a proposito** (es la unica con la que se puede probar). **NO se afirma que `saldo`/`compra` funcionen.** **SIGUEN ABIERTAS: D-27** (`total`/`restantes` publicos), **D-30** (`usuarios_cartas` vacia -> **`posee=true` no medido**), **D-33**, **D-32 residual** (**0 ALTO / 2 MEDIO**, `030` dormida), **D-23** (arte), **D-20**, **D-12/D-19** y **D-13**; **UICN FUERA** por decision del operador. **SIGUE:** la **prueba real de compra** *(camino CORREGIDO por la Enmienda 11: **Mercado -> Comprar cartas -> Acunar**; el "Inventario -> Catalogo -> Acunar" de esta foto queda SUPERADO)*, y **solo despues** el apagado de **D-34** con `activo=false` (**reversible**, nunca `DELETE`) -> foto **63 / 56**. **Nada de esta tanda esta en `origin`:** el ultimo deploy del sistema sigue siendo **`e9be424`** (fase 2).
- *(SUPERADO POR EL BLOQUE DE ARRIBA, 2026-11-11; se conserva por ADR-003)* **TSK-257 CIRCUITO UGC CERRADO (65 CARTAS / 8 FAMILIAS / 58 ACUNABLES) (2026-11-11, pase documental unico R2; ADR-121 Enmienda 9) -- LO PRIMERO QUE HAY QUE LEER.** **Dato:** **079 APLICADA** (`db/migrations/079_cartas_artista_prueba_ugc.sql`), **1 fila** de ledger, **3 corridas con md5 identico**, **`emitidas=0`**. **Efecto medido:** la obra **`[TEST] Rio de piedra`** (`7e57c0de-0000-4000-8000-000000000075`) pasa de **`pendiente` a `aprobada`** **sin tocar autor ni licencia** (**`CC0-1.0` ya presente**, **CHECK `chk_cartas_media_licencia`** de la 068 cumplido) y se crea **1 carta de familia `artista`**: **`car_artista_prueba`**, `subtipo='grafica'` (la obra es foto), **`rareza='raro'`**, **480 XP** (400 x 1.2, `precioAcunacion()`), **`supply_max=1000`**, **`nivel_gate=14`**, **`edicion='limitada'`**, **`emitidas=0`**, **`fusionable=false`**, **`media_id` = la obra**, **`emisor_tipo='ugc'`** y **`emisor_id` = autor de la obra**; **`stats_json`** `{"primario":"oficio","oficio":5,"alcance":3,"fortuna":0,"rendimiento":0}` (**presupuesto raro 8**, **`oficio` primario** = el unico eje con consumidor en `obra`). **Catalogo: 65 cartas** = **24 lugar + 8 personaje + 6 marca + 10 naturaleza + 9 cosmetica + 1 artista + 3 consumible + 4 producto**; **58 acunables**. **Las 8 familias tienen cartas** (`historico` sigue inactivo, 0). **Circuito CERRADO:** la mision **`xpd_obr_ugc`** (rama **`obra`**, eje **`oficio`**) pasa de **`SIN_ACCION` a 1 accion pendiente**; con el `autor_id` real el SQL devuelve **`total=1, cobros_previos=0, pendientes=1`** -> **primera vez que `obra` tiene algo que cobrar**. **Guarda de origen probada en tx+ROLLBACK:** con la obra **`pendiente`** el alta da **409 `MEDIA_NO_APROBADA`** y **no inserta**; aprobada despues, **inserta**. **DEUDAS:** **D-34 NUEVA** (datos de prueba en produccion: la obra `[TEST]` **aprobada** y **`car_artista_prueba` `activo=true` comprable a 480 XP** son **instrumento de la prueba de compra**, **no catalogo real**; deben **apagarse/retirarse antes del lanzamiento** -> catalogo real **63 / 56** *(cifra ERRONEA: el vigente es **65 / 64 / 57**, ADR-121 Enmienda 12)* y `artista` vuelve a 0; **nunca `DELETE`**, ADR-003); **D-33** (gobernanza: una migracion aplicada no se edita); **D-32 residual** (**0 ALTO / 2 MEDIO** de feature dormida: `030` sin aplicar, cero consumidor en runtime); **D-23** (arte: **20 cartas con imagen y 5 laminas**; el operador **no genera artes nuevos**); **D-26..D-30** (catalogo); **D-20** (md5 070); **D-12/D-19** y **D-13**. **UICN FUERA por ahora** (decision del operador 2026-11-11: sin token, **403**, no se siembra; las 10 `naturaleza` siguen con `estado_iucn` **vacio a proposito** y **ninguna UI debe leerlas como amenazadas**). **SIGUE:** apagar la prueba (**D-34**) **despues** de que el operador ejecute **la compra real end-to-end**; arte (**D-23**); decidir la **030** por escrito. **Nada de esta tanda esta en `origin`:** el ultimo deploy del sistema sigue siendo **`e9be424`** (fase 2).
- *(SUPERADO POR EL BLOQUE DE ARRIBA, 2026-11-11; se conserva por ADR-003)* - **TSK-257 CATALOGO DE 64 CARTAS / 8 FAMILIAS (2026-11-11, pase documental unico R2; ADR-121 Enmienda 8) -- LO PRIMERO QUE HAY QUE LEER.** **Dato:** **075, 076, 077 y 078 APLICADAS** (1 fila de ledger cada una). **076:** el CHECK de `familia` admite **8 valores** (**`naturaleza`** incluida) y `subtipo` cierra **`naturaleza -> flora|fauna`**; **+1 constraint** (`chk_cartas_catalogo_naturaleza`); **`precio_xp` sigue exigiendo `> 0`** (sin cambio); idempotente. **077:** **10 cartas `naturaleza`** (`cn_*`), **5 flora / 5 fauna**, rareza **4/3/2/1**, precio **150/400/1000/2500**, supply **5000/1000/250/50**, `limitada`, `nivel_gate NULL` (**`fusionable=false`** por el CHECK) y **sin localizaciones**; especies **verificadas contra GBIF** (binomio exacto **y** presencia en Colombia): palma de cera, `Cattleya trianae`, frailejon, guadua, ceibo, jaguar, oso de anteojos, danta de paramo, rana dorada y titi cabeciblanco. **`estado_iucn` VACIO POR FALTA DE FUENTE** (**IUCN responde 403 sin token**) -> **no se inventa dato de conservacion**. **078:** **9 cosmeticas** (`cc_*`), **3 marco / 3 fondo / 3 insignia**, precio **75/200/500/1250**, **`edicion='abierta'` + `supply_max NULL`** (**decision del operador: un sumidero con techo deja de ser sumidero**), `stats_json` con **solo `presencia`**, `fusionable=false`. **075 (SEMILLA DE PRUEBA, no contenido real):** 1 obra **`[TEST] Rio de piedra`** en `cartas_media`, `estado_moderacion='pendiente'`, **`CC0-1.0`**, autor = **usuario con mas XP** (`bc940e34...`), `media_url` **`assets/cartas/marca_ancestral.png`** (HEAD 200) -> ejercita **envio -> moderacion -> carta con `media_id` -> mision `obra`**. **Catalogo: 64 cartas** = **24 lugar + 8 personaje + 6 marca + 10 naturaleza + 9 cosmetica + 3 consumible + 4 producto**; **57 acunables** (24+8+6+10+9). **Admin sin segunda autoridad:** `cartas_lista` emite **`config {familias, subtipos}`** desde `lib/cartas-config.js` (verificado: **8 familias** y `naturaleza: ['flora','fauna']` en `:60-71`) y `admin.html` pinta desde ahi; **listas literales retiradas**. **Verificacion:** constantes **88/88**, UI **140/140** (subira con el chip de `naturaleza`: ese pase corre en paralelo y **no se acredita aqui**), economia **62/62**, expedicion **61/61**, **`npm test` exit 0**; **8/8 funciones, cero endpoint nuevo**. **Imagenes: 19/19 HEAD 200 pero solo 5 laminas distintas** -> **D-23 crece**. **Nada de esta tanda esta en `origin`:** el ultimo deploy del sistema es **`e9be424`** (fase 2); **no se afirma deploy**. Detalle en la seccion TSK-257 (fase 6).
- *(SUPERADO POR EL BLOQUE DE ARRIBA, 2026-11-11; se conserva por ADR-003)* **TSK-257 EXPEDICION COMPLETA (4 RAMAS, 12 MISIONES) (2026-11-11, pase documental unico R2; ADR-121 Enmienda 7) -- LO PRIMERO QUE HAY QUE LEER.** **Dato:** **074 APLICADA** (`db/migrations/074_media_compartidos_recrear.sql`, **16.938 B**): **recrea `media_compartidos`** con el **DDL de la 022** (**9 columnas, 3 indices, 2 FK, 3 CHECK**) porque la 022 figuraba como **`historico_no_verificado`** y **nunca se aplico**; efecto medido: **COMPARTIR deja de responder 503 `SCHEMA_NOT_MIGRATED`**. **La 022 NO se toca ni se reescribe su fila.** **D-31 CERRADA:** `xpd_dif_comparte` cambia de senal a **`xp_ledger accion='compartir' AND contexto->>'fuente'='destino'`** (ref = `id::text`), **fail-closed** si no hay filas; **`senal_disponible:true` desde ya** y las acciones apareceran cuando el primer compartir escriba su asiento. **Fase 5:** **6 misiones nuevas -> 12 misiones / 4 ramas** (`difusion`, `hallazgo`, `obra`, `economia`) con ejes **`alcance`, `fortuna`, `oficio`, `rendimiento`**; **caps 5/24 h y 200 XP/dia COMPARTIDOS entre las 4 ramas**; guard de carga ampliado a **12 misiones / 4 ramas / 4 ejes** con regla **`oficio` solo en `obra`** y **`rendimiento` solo en `economia`**. **Aritmetica declarada:** **12 misiones suman 320 XP**; **una pasada completa NO cabe en 200 y no puede caber**; el invariante que protege el cap es **top-5 = 185 <= 200** (cuatro de 40 + una de 25) y el **minimo diario posible es 75**; **12 cobros = `ceil(12/5)` = 3 dias** por slots. **Verificacion:** `smoke_expedicion` **61/61** con **0 persistencia** (`xp_ledger` **387**, compras **12**, media **0**); **`npm test` exit 0**. **DEUDA SISTEMICA NUEVA, D-32:** el ledger tiene **41 filas `historico_no_verificado`** (numeros **3-43**) frente a **30 `aplicada`** (rango **44-74**) -> el compartir roto era **un sintoma del patron, no un caso aislado**; criterio de cierre = **verificar una a una contra `information_schema`/`to_regclass`**, empezando por las que **sostienen features vivas**. **Estado de datos que condiciona las ramas nuevas:** `cartas_media` **0 filas** (misiones `obra` en **`SIN_ACCION`** hasta que exista una obra aprobada), `usuarios_cartas` **0** (misiones `economia` sin acciones de carta) y `xp_ledger accion='compartir'` **0** hasta el primer compartir real. **Siguen vivas:** **D-23** (arte), **D-20**, **D-12/D-19**, **D-13**, **D-14** parcial y **D-26..D-30**. **Nada de esta tanda esta en `origin`:** el ultimo deploy del sistema es **`e9be424`** (fase 2). Detalle en la seccion TSK-257 (fase 5).
- *(SUPERADO POR EL BLOQUE DE ARRIBA, 2026-11-11; se conserva por ADR-003)* **TSK-257 EXPEDICION OPERATIVA (v1: difusion/hallazgo) (2026-11-11, pase documental unico R2; ADR-121 Enmienda 6) -- LO PRIMERO QUE HAY QUE LEER.** **Dato:** **073 APLICADA** (`db/migrations/073_cartas_expedicion_idempotencia.sql`): indice unico parcial **`xp_ledger_expedicion_accion_uq`** sobre `(usuario_id, contexto->>'mision_id', contexto->>'accion_ref') WHERE accion='carta_expedicion'` + **CHECK `chk_xp_ledger_expedicion_contexto`** (todo cobro de expedicion lleva las dos claves). **Probado:** duplicado -> **23505**; ref distinta -> **entra**; sin ref -> **23514**; **2a corrida = no-op**. Ledger: **066-073** con **1 fila** cada una. **Backend:** array **`EXPEDICIONES` SEPARADO de `MISIONES`** (6 misiones v1, **3 `difusion`** con `alcance` y **3 `hallazgo`** con `fortuna`), con **guard que revienta** si una mision con `expedicion_rama` o id `xpd_*` entra en `MISIONES` (evita el **faucet infinito** de `evaluarMisiones`, que paga **sin cap**); **`carta_expedicion` en `BONO_EXCLUIDAS`**; **caps 5/24 h y 200 XP/dia** medidos en `xp_ledger`, con **recorte al remanente** y **409 `CAP_RECOMPENSA`** si el remanente es menor que la recompensa minima; **idempotencia por el indice: 23505 -> `xp:0, repetido:true`**; vector **`LEAST(40, SUM de cartas distintas)`** con `uc.activo`, `c.activo`, `cantidad>=1`, maximo por variante y `+nivel` al primario; **`GET ?tipo=expediciones`** devuelve **`acciones_pendientes`** y **`acciones_pendientes_total`** y el cobro es **`POST ?tipo=expedicion_cobrar`** (**8/8 funciones, ninguna nueva**). **UI:** panel **"Expediciones"** en la seccion de cartas de `mi-perfil.html`, con **`usadas/limite`** y **`xp_hoy/200`**, misiones por rama, umbrales propios con **`faltan`** por eje y estados **`Cumplida`/`Te faltan N acciones`/`Umbral no alcanzado`/`Cap diario`/`Sin accion disponible`**; "Expedicionar" usa **`acciones_pendientes[0].ref`**. **Verificacion:** `smoke_expedicion` **44/44** con **0 persistencia** y **ya dentro de `npm test`**; `smoke_cartas_ui` **130/130**; **`npm test` exit 0**; divs `mi-perfil` **606/606**; **`?v=6`** en las **3** superficies (**`?v=5` superado**). **Que consume v1, con esas palabras:** las 6 misiones exigen **solo `alcance` y `fortuna`**; **`oficio` y `rendimiento` NO tienen consumidor en v1** (`rendimiento` es bono declarado **solo de expedicion** pero sus ramas `obra`/`economia` son **fase 5**), luego las **14 cartas de `personaje`/`marca` siguen sin consumidor en v1**. **DEUDA NUEVA MEDIDA, sin dulcificar: D-31** -- **`media_compartidos` NO existe en la base viva** (la **022** figura en el ledger como **`historico_no_verificado`**, `GAMIFICACION.md:548`), asi que **`xpd_dif_comparte`** queda **`senal_disponible:false` / `SIN_ACCION`** y **nunca paga**: es **fail-closed**, **no un bug de UI**. Decision pendiente del operador: **(a)** aplicar la **022**, **(b)** reemplazar la senal (spec) o **(c)** retirar la mision; mientras tanto `difusion` opera con **2 de 3**. **Deudas del catalogo, ya numeradas (aprobado por el operador): D-26** `posee` solo variante `base`; **D-27** `total`/`restantes` publicos; **D-28** la tarjeta de catalogo no abre ficha; **D-29** filtros no persistidos; **D-30** `usuarios_cartas` vacia -> **`posee=true` no medido**. Siguen **D-23** (arte), **D-20**, **D-12/D-19**, **D-13** y **D-14** parcial (`artista` esperando UGC, `cosmetica` sin sembrar). **Nada de esta tanda esta en `origin`:** el ultimo deploy del sistema es **`e9be424`** (fase 2). Detalle en la seccion TSK-257 (fase 4, cierre de expedicion).
- *(SUPERADO POR EL BLOQUE DE ARRIBA, 2026-11-11; se conserva por ADR-003) **TSK-257 CATALOGO Y VITRINA OPERATIVOS / MODERACION CON IDENTIDAD (2026-11-11, pase documental unico R2; ADR-121 Enmienda 5) -- LO PRIMERO QUE HAY QUE LEER.** **Dato:** **071** y **072** siguen **APLICADAS** (**1 fila de ledger** cada una; **2a corrida = 0 cambios**), el catalogo son **45 cartas** = **24** `lugar` + **8** `personaje` (`cp_*`) + **6** `marca` (`cm_*`) + **3** `consumible` + **4** `producto`, y **38 acunables** (24+8+6). **Canal de adquisicion implementado (arbol, SIN COMMIT Y SIN DEPLOY):** rama nueva **`GET /api/usuarios?tipo=cartas_catalogo`** (`api/usuarios.js` v27, **sin funcion serverless nueva: 8/8**): **38 acunables**, filtros `familia`/`rareza`/`q` (ILIKE con **comodines escapados**, `q=%` y `q=_` literales), paginacion `page`/`limit` (**max 60**), orden **rareza + nombre**, por carta `restantes`, `stats`, `poder`/`poder_base` con `poderCarta()`, `media_id` **anulado si la obra no esta aprobada**, `posee`/`cantidad` **solo con sesion** (variante `base`), y **503 `SCHEMA_NOT_MIGRATED`** verificado con **42703** simulado; pruebas reales contra Neon **27/27** (total 38, personaje 8, dorado 5, producto/consumible 0, 0 ids repetidos). **Vitrina:** *(SUPERADO EN LA SUPERFICIE 2026-11-11, ADR-121 Enmienda 11: el catalogo se compra en el **Mercado** de `comunidad.html`; el host de `mi-perfil.html` queda inerte por ADR-003)* panel **"Catalogo"** dentro de la seccion de cartas de `mi-perfil.html` (`#catalogo-panel`), filtros de **las 5 familias con cartas y 4 rarezas**, buscador con debounce, grid de **24** con "Cargar mas", estados **"Ya la tienes"/"Agotada"/"Acunar"** con confirmacion de coste y, tras acunar, parcheo de `restantes`/`total` **sin recargar**; `comunidad.html` **solo lleva el bump**. **D-25 (precedencia) IMPLEMENTADA:** `ADMIN_USER_ID` **prevalece**; `body.moderado_por` es **solo respaldo** si el env no esta configurado y el uuid **existe** en `usuarios`; respuesta con **`identidad_origen: env|body|ninguna`**. **D-24 (precio al editar) IMPLEMENTADA:** recalcula con `precioAcunacion()` usando **familia y rareza EFECTIVAS**; `producto`/`consumible` **fuerzan NULL**; **explicito manda**; **400 `PRECIO_NO_DETERMINABLE`**; **la doble edicion no reescribe**. **D-21/D-22 CERRADAS por la spec** (11.8, contrato v3.5: **1333 lineas, 0 bytes >127**): `personaje`/`marca` **no fusionables en v1 porque `nivel_gate` no es NULL y el CHECK manda**; `historico` **declarado y vacio**, criterio de entrada = **nombre canonico ya en el repo**, sin figuras reales ni IP nueva. **DECISION DEL OPERADOR (2026-11-11): NO se generan artes nuevos** -> arte de **personaje provisional y D-23 ABIERTA**; `historico` **inactivo**. **Secuencia:** **tienda/catalogo ahora, expedicion despues** (fase 4, **faucet con cap 5/24 h y 200 XP/dia**, ledger); **stats display-only hasta que exista expedicion**. **Verificacion:** UI **97/97** (63->97), economia **62/62**, db_tx **41/41**, constantes **74/74**, `mi-perfil` divs **603/603**, **`npm test` exit 0**, cache-busting **`?v=5`** en las **3** superficies (**`?v=4` queda superado**). **Nada de esta tanda esta en `origin`:** el ultimo deploy del sistema es **`e9be424`** (fase 2). **Deudas:** **D-23** (arte) y **D-20** (md5 070) abiertas, **D-12/D-19**, **D-13**, **D-14** parcial (`artista` esperando UGC aprobado, `cosmetica` sin sembrar) y las **nuevas del catalogo**: `posee` solo variante `base`, `restantes`/`total` publicos, la tarjeta no abre ficha, filtros no persistidos y **`usuarios_cartas` vacia -> `posee=true` no medido**. Detalle en la seccion TSK-257 (fase 4).
- *(SUPERADO POR EL BLOQUE DE ARRIBA, 2026-11-11; se conserva por ADR-003) **TSK-257 FAMILIAS DE JUEGO SEMBRADAS / MODERACION ENDURECIDA (2026-11-11, pase documental unico R2; ADR-121 Enmienda 4) -- LO PRIMERO QUE HAY QUE LEER.** **Dato:** **071** y **072 APLICADAS**, **1 fila de ledger** cada una y **2a corrida = 0 cambios**. **071** deja **45 cartas** = **24** `lugar` + **3** `consumible` + **4** `producto` + **8** `personaje` (`cp_*`) + **6** `marca` (`cm_*`); rarezas nuevas **5 comun / 4 raro / 3 epico / 2 dorado**, con **dorado en AMBAS familias**; `stats_json` con **solo los 4 ejes** (`alcance`/`oficio`/`fortuna`/`rendimiento`, **sin** `presencia`, **sin** `sku`, **sin** `bonus_xp_pct`); **14/14 comprables**; **16 guardas `RAISE`**. **072** fija precio = **base por rareza x multiplicador de familia** con **autoridad unica en `lib/cartas-config.js`** (`CARTA_PRECIO_BASE_XP`, `CARTA_MULT_FAMILIA`, `precioAcunacion()`): `personaje` **180/480/1200/3000**, `marca` **225/600/1500/3750**, `lugar` **intacto (x1.0)** y las **7** de `producto`/`consumible` con `precio_xp` **NULL** -> **38 comprables** (24+8+6); **md5 de `lugar` sin cambio**. **Codigo:** `api/admin.js` calcula con `precioAcunacion()` **solo al crear sin `precio_xp` explicito**; **`carta_acunar` NO cambia** (sigue leyendo `precio_xp` de la base, que es la autoridad del cobro). **Moderacion:** **409 `MEDIA_CON_CARTAS`** con `cartas_n` al retirar o rechazar obra aprobada con cartas activas (`cartas_catalogo.media_id` + `activo=true`), **dentro de transaccion con `SELECT ... FOR UPDATE`** (sin carrera) y **sin tocar el estado**; identidad real por **`ADMIN_USER_ID`** (uuid validado + `EXISTS usuarios.id`), que **no hace fallar** la moderacion si falta (`moderado_por` NULL y `identidad_admin:false`), con columna **"Moderada por"**, aviso persistente y el 409 pintado con N + boton "Ver cartas". **Verificacion:** economia **49/49** (E14-E19, 0 persistencia), db_tx **41/41** con **C7** (`23502` en `familia`), constantes **66/66**, **`npm test` exit 0**, divs **1408/1408**. **Deudas:** **D-20** (md5 obsoleto del header 070), **D-21** (spec 2.1 vs CHECK de fusionable), **D-22** (`historico` sin cartas), **D-23** (arte provisional), **D-24** (precio al editar), **D-25** (`moderado_por` override); siguen **D-12/D-19** y **D-13**; **D-14 CERRADA** en `personaje`/`marca`, abierta en `artista`/`cosmetica`. **TIENDA DIFERIDA** hasta **>= 2 familias de juego con stock real** (hoy no existe: exigiria endpoint de catalogo). Detalle en la seccion TSK-257.
- *(SUPERADO POR EL BLOQUE DE ARRIBA, 2026-11-11; se conserva por ADR-003) **TSK-257 FASE 2 IMPLEMENTADA Y DESPLEGADA / PRECIOS SEMBRADOS (2026-11-11, pase documental unico R2; ADR-121 Enmienda 3) -- LO PRIMERO QUE HAY QUE LEER.** Sistema de cartas: **7 familias de 3 capas**, vector de **4 ejes jugables + `presencia`**, tirada por **pesos 5000/1000/250/50**, valor de acunacion **base por rareza x multiplicador de familia** y supply por **`emitidas` + `supply_max`**; UGC de **obra (`cartas_media`) a N ediciones**. **Dato:** **066, 067, 068, 069 y 070 APLICADAS**, cada una con **1 fila** en el ledger; **069** deja `familia`/`subtipo` **NOT NULL** (**0 NULL**, **31/31**, segunda corrida **no-op**); **070** siembra **24** `lugar` con `edicion='limitada'` y precio/tirada por rareza real: **9** x **150/5000**, **7** x **400/1000**, **5** x **1000/250**, **3** x **2500/50**; **24/24 comprables**; las **7** de `producto`/`consumible` siguen `precio_xp` **NULL** (CHECK de 066); **6** `ct_comun_01..06` reclasificadas `subtipo='natural'` (operador, 2026-11-11). **md5 del dato** tras segunda corrida: `a3bc72bfb611ef9b9741b0f1bf42c580` (**0 cambios**). **Codigo:** desplegado **`e9be424`** en `origin/main` y verificado en produccion (`fichaPoderNivel` en `cartas-ui.js`, `cartas-media-lista` en `admin.html`). **Verificacion:** UI **63/63**, economia **43/43**, `smoke_cartas_db_tx` **40/40**, divs admin **1405/1405**, **`npm test` exit 0**. **D-15 y D-17 CERRADAS**, **D-16 CERRADA** (acunacion/nivel); siguen **D-12/D-19**, **D-13** (sin tabla de copias por serial) y **D-14**. **Deudas vivas:** C7 opcional (`23502`, subiria db_tx a 41), retirada de obra aprobada con cartas emitidas, `moderado_por` NULL, md5 obsoleto del header 070, assets UGC URL/texto (sin storage) y **0 cartas** de `personaje`/`artista`/`marca`/`cosmetica` (ramas de `oficio`/`rendimiento` sin alimento). El **`?v=4`** y el boton **ACUNAR** estan en el **arbol**, **no** en `origin`. Detalle en la seccion TSK-257.
- **(ESTADO PRE-DEPLOY, SUPERADO POR EL BLOQUE DE ARRIBA DESDE EL DEPLOY + `008`; ADR-003) TSK-256 ESTADO PRE-DEPLOY CERRADO: 6 FILAS DESACTIVADAS EN NEON (cleanup 007), BUG-153 CERRADO, UI Y ADMIN HECHOS (2026-11-10, pase final R2; ADR-120).** **Dato:** `db/cleanups/007_desactivar_consumibles_predeploy_064.sql` (4.620 B, verificado con `Test-Path` = True) desactiva **6** filas (`activo=false`) mientras el backend desplegado no lee los campos nuevos -- las **4** cartas de faccion de la 057, `ancestral_base` y `ancestral_premio_set` (esta ultima era **comprable por 0 XP**: el codigo viejo solo filtra `activo=true` y lee `precio_xp`). **Conteos:** activos **44 -> 38**, total **44**; las **3 botellas** (`ancestral_pocima_50ml` / `_media_375ml` / `_botella_750ml`) quedan **intactas y activas**. **Reactivacion:** el SQL de reactivacion se entrega con el mismo `IN (...)` sobre `activo=false`; **no se borro ninguna fila** (ADR-003). **BUG-153 CERRADO:** needle de `scripts/smoke_media_upload_prefijo.js` reapuntado a la forma real (`esMedioPublico` + contexto `destino`, `:58`/`:61`) -> **46/46**, test de mutacion **8/8**, `npm run test` **exit 0**. **UI:** `cartas-arte.js:33,37` mapea `ancestral_base` a la lamina de marca; `mercado.js` pinta chips de bono/set y **elimina** `STOCK_LLENO`; `mi-perfil.html` pasa a estado **por carta** (mapa `consumible_efectos`, `:2925`/`:3217`) con fallback al objeto antiguo, mensajes `CONSUMIBLE_PERMANENTE`/`YA_POSEES` y **sin** `PF_FAC_TOPE`; **cartas_arte 71/71**, **mercado 38/38**, divs mi-perfil **600/600**. **Backend GETs:** `?tipo=inventario` publica `data.capacidades.consumible_efectos` (mapa) y `data.capacidades.sets_acceso` (`api/interacciones.js:5979`; el flag se escribe solo ahi) y **conserva** `data.efecto`; `?tipo=consumibles` publica `bono_pct`, `bono_tope_xp`, `es_permanente`, `desbloquea_set`, `otorga_carta` con **degradacion 42703**; `sets_acceso` **no** va en el catalogo publico. **Admin:** los **6** campos entran en `api/admin.js` (`desbloquea_set` en `:363`/`:377`: lista blanca, SELECT, INSERT, UPDATE, validacion y coherencias) y en `admin.html` (crear + modal); divs admin **1351/1351**; `npm run test` **exit 0**. **Vivo y sin resolver:** reactivar las **6** filas **tras** el deploy (sin eso el set no se puede comprar), premio 4/4 **no cableado** en intercambio/drop, `premio_set` **null** en replay, `smoke_090` y `smoke_test_epic_prompt` **rojos pre-existentes**, y **BUG-154**. **Sin commit y sin deploy.** *(Enunciado previo conservado, ADR-003.)*
- **(SUPERADO POR EL BLOQUE DE ARRIBA EN LO QUE TOQUE AL ESTADO PRE-DEPLOY; ADR-003) TSK-256 IMPLEMENTADA EN ARBOL DE TRABAJO, CON 064 Y 065 YA APLICADAS EN NEON (2026-11-10; ADR-120) -- LO PRIMERO QUE HAY QUE LEER.** Bono **+% global de 24 h** (`bono_pct` 10/15/20/25, `bono_tope_xp` 250/400/550/700) con estado en el mapa `capacidades.consumible_efectos`, hook unico `acreditarBonoGlobal` en `registrarXpLedger` con lista negra por `accion` y **default NEGAR**, **tope de compra de 30 retirado**, set **`ancestral_esencia`** 4/4 (base de 400 XP **permanente** con **409 `CONSUMIBLE_PERMANENTE`**, 3 botellas que **conservan** su precio de 058, 4 misiones filtradas y premio `premio_set` en CTE idempotente). **Verificacion:** 057 **148/148**, 064 **48/48**, 065 **34/34**, cartas_constantes **29/29**, cartas_db **40/40**, consumibles **63/63**, mercado **38/38**, gamificacion_v4 **97/97**. **Deudas abiertas (a)-(f):** needle de `smoke_media_upload_prefijo.js:51` (**BUG-153**, pre-existente), escapado JSON-LD sin smoke (**BUG-154**, riesgo pre-existente), premio **no cableado** en intercambio/drop, `premio_set` **null** en replay, **UI** de cooldown/panel y texto muerto `STOCK_LLENO`/`PF_FAC_TOPE` (`mi-perfil.html:2914`), y **admin** sin los 6 campos nuevos. **Orden del proximo pase:** needle -> UI -> admin -> premio en intercambio. **Sin commit y sin deploy.**
- *(ESTADO DE GIT SUPERADO 2026-11-04: commiteada y EN PRODUCCION; `mercado.js` 1.3.0 y `cartas-ui.js` HTTP 200 en el aire, HEAD `b2cc696`. Se conserva el enunciado, ADR-003.)* **CERRADA EN CODIGO / EN WORKING TREE (2026-10-28; pase documental unico R2; commit PENDIENTE; NO desplegada; RUN REAL DE LA 062 EJECUTADO).** **TSK-245 / ADR-110 (ACEPTADO, revision 1 aprobada por `@architect-review`) - La compra de consumibles se muda al catalogo del Mercado (pago en XP reusando el POST existente) y el tab Inventario pasa a ser COLECCION de lo poseido; la tienda de faccion deja el gate INERTE POR DATO (`faccion_requerida = NULL` en las 4 claves) y el PREDICADO DEL MOTOR SE CONSERVA.** Backend `api/interacciones.js` **+27/-11** (`?tipo=consumibles` con identidad del `sub` del Bearer e `usuario_id` de query ignorado, `:9780-9856`; `comprar_consumible` con sesion firmada y body ignorado, **401 `SESION_REQUERIDA`/`SESION_INVALIDA`**, `:13913-13924`; `usar_consumible` intacto, `:14164`). Migracion **062 APLICADA EN NEON CON COMMIT** (254 lineas, **1 `UPDATE` idempotente** de las 4 claves; `schema_migrations` **numero=62**, notas "ADR-110 D4": **4 filas** con `faccion_requerida IS NULL` y `nivel_requerido=4`, **0** con faccion no nula (eran 4), **0** otros campos cambiados, idempotencia `update=0`) y **063 APLICADA** (`063_consumibles_faccion_copy.sql`, 215 lineas, **numero=63**, notas "ADR-110 D4 copy": `nuevo_copy=4`, `copy_obsoleto=0`, `idem=0`, otros campos 0). `mercado.js` **v1.3.0** (`getJSON(qs, opts)` retrocompatible, catalogo con Bearer, boton Comprar XP, chips y gates, `+201/-14`). `mi-perfil.html` tab **Coleccion** con `#pf-coleccion` aditivo y `#pf-fac-tienda` reutilizado como "Efecto de faccion" (divs 659/659). `comunidad.html` con 7 reglas del silo `#cpanel-mercado` y `mercado.js?v=3` en ambas paginas (divs 474/474). **Escudo GOLD 9/9 PASS; `api/` = 8 (cero endpoint nuevo); 0 bytes > 127 anadidos.** **T8 CON CONTROL POSITIVO PASS en produccion con `BEGIN`/`ROLLBACK` (`hubo_commit=false`); 062 y 063 APLICADAS en Neon.** **PENDIENTE UNICO (operador): commit + deploy backend -> `mercado.js` -> HTML con `?v=3`.** Detalle, ficheros y rangos en la seccion TSK-245 al final de este fichero; argumento en `DECISIONS.md` ADR-110 (`:11850`, subseccion **Implementacion (2026-10-28)**).
- **Estado actual (el motivo de que siga abierta):** el HTML servido **sigue prerenderizado con el motor viejo**; el defecto queda registrado como **BUG-138** con estado **RESUELTO EN CODIGO - PENDIENTE DE DEPLOY**. *(SUPERADO el 2026-10-25: el HTML servido ya es el del motor nuevo, medido en el cierre de arriba.)*
- **TSK-224 -- NO_CONFIRMADO.** *(SUPERADO 2026-11-04, Tanda B: **criterio SEMANTICO decidido** y medido **1/3** por destino real; ver Tanda B punto 6. Enunciado original conservado, ADR-003.)* `#relacionados` de `/medellin.html` tiene **3** enlaces, **0** con `bogota` en el slug, pero **1 es destino Bogota** (`/taller-de-las-moscas.html`, meta "Bogota - Bogota D.C."). El criterio de cierre (**slug vs destino real**) **no esta decidido**: se dejan las dos cifras y no se cierra.
- **BUG-139 -- ABIERTO con alcance revisado.** *(SUPERADO 2026-11-04, Tanda B: medicion **2/0/92/35** sobre 129 seeds, **hipotesis del caption refutada**, **guard WARN** en `verificar-fotos-fichas.js` y **capa UI hecha** en `galeria.html`; ver Tanda B puntos 3-5. Enunciado original conservado, ADR-003.)* **129** seeds en `scripts/`, solo **2** escriben `tags.creditos_fotos` (`seed-barranquilla.js`, `seed-santa-marta.js`); el motor **ya** tiene cascada de **3** niveles (`api/pagina-destino.js:961-969`: tags -> autor/licencia del item -> caption "texto - Foto: autor / lic") y **`galeria.html` tiene 0 referencias a credito** = hueco real sin mitigar. **Recomendacion registrada:** **NO backfill masivo**; (a) capa de credito en `galeria.html`, (b) medir cuantos de los **81** seeds ya llevan "Foto:" en el caption antes de decidir, (c) guard en el tooling de fichas.

**Que sigue (filas 6-23).** *(Estado tras el cierre de filas 7b y 15, 2026-11-04: **7b y 15 hechas en codigo**, **9 aceptada por decision**, **8 en codigo con push pendiente** (`0d844f4` **ahead 1**); **15b** es propuesta nueva pendiente de confirmacion del operador; **el unico paso bloqueante es el push + deploy**, y con el se cierra BUG-130 en vivo.)* *(Estado tras la Tanda B, 2026-11-04: filas **6, 7 y 8** hechas o resueltas; **7b** pendiente de confirmacion del operador; **BUG-129** es la unica de la ola 1 sin tocar; **BUG-137 ya esta en produccion**, luego de las filas 10-13 solo queda el resto de su alcance. El plan original se conserva, ADR-003.)* (1) **Filas 6-9 (ola 1):** BUG-139 datos, BUG-139 UI, BUG-130 y BUG-129. **TSK-224 es la fila 15 (ola 3)**, con el criterio slug vs destino real sin decidir (ver arriba). (2) **Filas 10-13:** commit + deploy de BUG-137 y su cierre en vivo. (3) **Filas 20-23:** **`.env.local` existe en la raiz** (ignorado por `.gitignore:8`, **0** ficheros trackeados) con **una sola clave `DATABASE_URL`**, pero **ningun script carga `dotenv`** (**0** coincidencias en `scripts/`): la variable se **exporta en cada invocacion**. Eso **desbloquea** migracion **048**, **TSK-240** y **TSK-194**: dejan de estar bloqueadas por entorno y pasan a estarlo por **gate o decision**.

**Enlaces (no argumentos; ADR-084 D1).** **ADR-116** (TSK-251) | **ADR-114** y **ADR-115** (TSK-250, aparcada) | **ADR-089** (los 13 SKIP) | **ADR-006** (baseline = archivo real) | **ADR-003** (cero borrado logico) | **ADR-084** (un unico pase de cierre y argumento una sola vez) | **BUG-098** (patron de instrumentacion obsoleta) | **BUG-137** | **BUG-139**.
- **Cerradas en esta tanda:** **D-21 y D-22** (por enmienda de spec, spec 11.8) y **D-24 y D-25** (por codigo medido). `expedicion_rama` (`obra`/`economia`) **sigue sin implementar**: es el siguiente bloque de producto (**faucet con cap 5/24 h y 200 XP/dia**). *(SUPERADO por el bloque de expedicion de abajo en lo que toca a `difusion`/`hallazgo`: esas dos ramas ya estan implementadas; `obra`/`economia` siguen sin implementar.)*

**Fase 4 (cierre) aplicada y medida (ADR-121 Enmienda 6): expedicion v1 operativa, ramas `difusion` y `hallazgo`.** La fase 4 la abrio la Enmienda 5 con el canal de adquisicion; este bloque la **cierra** con la expedicion. **`obra`/`economia` es fase 5** (siguiente bloque).

**Evidencia de la migracion 073 (tabla de migraciones; medida en el pase de implementacion, ADR-006: no se re-ejecuta aqui).**

| Grupo | Criterio | Resultado registrado |
|---|---|---|
| 073 | Indice unico parcial | `xp_ledger_expedicion_accion_uq` sobre `(usuario_id, (contexto->>'mision_id'), (contexto->>'accion_ref')) WHERE accion = 'carta_expedicion'` |
| 073 | CHECK de contexto | `chk_xp_ledger_expedicion_contexto`: todo cobro con `carta_expedicion` lleva `mision_id` y `accion_ref` |
| 073 | Prueba de duplicado | duplicado -> **23505**; `accion_ref` distinta -> **entra**; sin `accion_ref` -> **23514** |
| 073 | Idempotencia de corrida | **2a corrida = no-op**; **1 fila** en el ledger |
| 073 | Alcance | aditivo, **0 filas afectadas** hoy y **0 backfill** (`carta_expedicion` no existia) |

25. **Migracion 073 APLICADA (unica pieza de esquema):** indice unico parcial **`xp_ledger_expedicion_accion_uq (usuario_id, (contexto->>'mision_id'), (contexto->>'accion_ref')) WHERE accion='carta_expedicion'`** + **CHECK `chk_xp_ledger_expedicion_contexto`** (todo cobro de expedicion lleva `mision_id` y `accion_ref`; sin las dos claves el indice tendria agujero NULL). **Probado:** duplicado -> **23505**; ref distinta -> **entra**; sin ref -> **23514**. **Segunda corrida = no-op**; **1 fila** en el ledger.
26. **Backend - separacion y guard anti-faucet:** array **`EXPEDICIONES` SEPARADO de `MISIONES`** (6 misiones v1: **3 `difusion`** -> `xpd_dif_comparte` (`alcance` 0, 1 accion), `xpd_dif_mapa` (`alcance` 8, 3 acciones), `xpd_dif_resena` (`alcance` 20, 2 acciones); **3 `hallazgo`** -> `xpd_for_visita` (`fortuna` 0, 1), y sus dos escalones (`fortuna` 8 y 20)). **Guard que REVIENTA** si una mision con `expedicion_rama` o id `xpd_*` entra en `MISIONES`: **`evaluarMisiones` paga sin cap** y colar una expedicion ahi seria un **faucet infinito**. **`carta_expedicion` anadida a `BONO_EXCLUIDAS`** (el bono de ADR-120 no se apila).
27. **Caps y remanente (medidos en `xp_ledger`, no en memoria):** **5 cobros/24 h** y **200 XP/dia**. Al acercarse al tope se **recorta al remanente** (`cap_aplicado`); si el remanente es **menor que la recompensa minima** -> **409 `CAP_RECOMPENSA`** con **0 filas**; tope alcanzado -> **409 `CAP_DIARIO`**. **Idempotencia por el indice:** **23505 -> `xp:0, repetido:true`** (200, no 5xx). **El cap no sustituye al indice:** dos POST concurrentes consumirian **dos cupos por una accion**.
28. **Vector de stats (primer consumidor real de `stats_json`):** **`LEAST(40, SUM de cartas distintas)`** con `uc.activo`, `c.activo`, `cantidad>=1`, **maximo por variante** y **`+nivel` al primario** (fixture de la spec A8: 2 doradas `lugar` -> `alcance` 35).
29. **Contrato HTTP:** **`GET ?tipo=expediciones`** devuelve **`acciones_pendientes`** (refs cobrables) y **`acciones_pendientes_total`**; el cobro es **`POST ?tipo=expedicion_cobrar`**. **8/8 funciones serverless, ninguna nueva.**
30. **UI (`mi-perfil.html`):** panel **"Expediciones"** en la seccion de cartas, con **`usadas/limite`** y **`xp_hoy/200`**, misiones agrupadas **por rama**, **umbrales propios con `faltan` por eje** y estados **`Cumplida`/`Te faltan N acciones`/`Umbral no alcanzado`/`Cap diario`/`Sin accion disponible`**. El boton **"Expedicionar"** usa **`acciones_pendientes[0].ref`**. Cache-busting **`?v=6`** en las **3** superficies.
31. **Verificacion del cierre de la fase 4:** `scripts/smoke_expedicion.js` **44/44** con **0 persistencia** y **ya dentro de `npm test`**; `smoke_cartas_ui` **130/130**; **`npm test` exit 0**; divs `mi-perfil` **606/606** (603 -> 606); **`?v=6`** en las 3 superficies.
32. **Que consume v1 (dicho con esas palabras):** las 6 misiones exigen **solo `alcance` y `fortuna`**. **`oficio` y `rendimiento` NO tienen consumidor en v1**; `rendimiento` es el bono **declarado solo para expedicion** de este ADR, pero **v1 no lo consume** porque sus ramas (`obra`/`economia`) son **fase 5**. Por tanto las **14 cartas de `personaje`/`marca` siguen sin consumidor en v1**: hoy solo son **poder de coleccion**.
33. **Alcance NO desplegado:** todo vive en el **arbol de trabajo**. **Nada esta en `origin`**; el ultimo deploy del sistema es **`e9be424`** (fase 2). No se afirma produccion para esta fase.

**Deudas VIVAS tras el cierre de la fase 4 (expedicion) (ADR-121 Enmienda 6).** *(SUPERADO EN LO QUE TOCA A D-31 Y AL ALCANCE DE RAMAS POR EL BLOQUE DE FASE 5 DE ABAJO; se conserva por ADR-003.)*
