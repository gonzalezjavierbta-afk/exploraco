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

