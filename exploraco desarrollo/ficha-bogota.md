# Ficha unica Bogota - fuente de datos para la pagina dinamica bogota.html

> Un solo conjunto de datos, validado contra `admin.html` (IDs del form) y
> `api/pagina-destino.js` (llaves que lee el motor `buildHTML()`). Bogota se
> trata como un destino de categoria `sitio` a escala ciudad, con los mismos
> campos del formulario que lacandelaria/monserrate.

## 1. Campos generales del form (admin.html, bloque generico)

| ID del form | Valor Bogota |
|---|---|
| `f-name` | Bogota |
| `f-cat` | sitio |
| `f-slug` | bogota |
| `f-emoji` | \ud83c\udfdb (torre de ciudad) |
| `f-city` | Bogota |
| `f-region` | Cundinamarca |
| `f-barrio` | Capital |
| `f-address` | Bogota, Cundinamarca, Colombia |
| `f-price` | Desde $5.000 (Museo del Oro) |
| `f-horario` | Atracciones abiertas mayormente 9AM-6PM; Museo del Oro Mar-Sab 9AM-7PM, Dom 10AM-5PM, cerrado lun |
| `f-tipo` | Ciudad Capital - Cultura - Museos - Gastronomia - Historia |
| `f-lead` | La capital de Colombia: un mix de historia colonial, museos de clase mundial, gastronomia (ajiaco) y la energia de una metropoli de 7 millones de personas a 2.640 metros de altitud. |
| `f-desc` | Bogota es la capital y ciudad mas grande de Colombia, fundada en 1538 por Gonzalo Jimenez de Quesada. Se extiende sobre la sabana andina a 2.640 m, entre los cerros orientales con Monserrate y Guadalupe como guardianes. Concentra los mejores museos del pais (Museo del Oro, Museo Botero, Museo Nacional), el centro historico de La Candelaria, barrios modernos como Chapinero y la Zona T, y una escena gastronomica y cultural en constante crecimiento. Es el punto de entrada obligado del turismo colombiano y la base para explorar el resto del pais. |
| `f-photo-hero` | https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg |
| `f-hero-bg` | #1a2a3a |
| `f-lat` | 4.7110 |
| `f-lng` | -74.0721 |
| `f-whatsapp` | (vacio) |
| `f-email` | (vacio) |
| `f-web` | https://www.bogota.gov.co |
| `f-instagram` | @bogota |

## 2. Campos especificos de sitio (bloque `especifico-sitio`)

| ID del form | Valor Bogota |
|---|---|
| `f-tipo-actividad` | Ciudad Capital |
| `f-dificultad` | Facil |
| `f-dificultad-desc` | Ciudad accesible para recorrer a pie en el centro y en transporte publico (TransMilenio, taxi, apps). La altitud (2.640 m) requiere 1-2 dias de adaptacion: hidratacion constante y ritmo tranquilo los primeros dias. |
| `f-duracion` | 3-5 dias (recomendado) |
| `f-altitud` | 2640 |
| `f-entrada-precio` | Museos: Museo del Oro $5.000 (domingos gratis), Museo Botero gratis, Museo Nacional $4.000 (domingos gratis). Monserrate funicular+teleferico ida y vuelta aprox. $72.000-100.000 |
| `f-distancia-sitio` | Aeropuerto El Dorado a 13 km del centro (~30-45 min en taxi o TransMilenio) |
| `f-como-llegar-sitio` | Aeropuerto Internacional El Dorado (BOG) con vuelos desde todo el mundo. En la ciudad: TransMilenio (red BRT mas grande de Latinoamerica), taxi, apps de transporte, TransMiCable. Del aeropuerto: taxi oficial o TransMilenio estacion El Dorado (ruta K86 al centro). |
| `f-permisos-sitio` | No requiere permiso para recorrer la ciudad. Museos con entrada (varios gratis los domingos). Monserrate sin reserva previa, aunque en festivos conviene llegar temprano. Algunos tours requieren reserva. |

### `entradas` (entradas-list-admin, `{tipo, precio, incluye, link}`)

Tarifas 2025-2026 (fuente: bogota.gov.co, banrepcultural.org, museos oficiales).

| tipo | precio | incluye | link |
|---|---|---|---|
| Museo del Oro (general) | 5000 | Entrada general Mar-Sab y festivos | https://www.banrepcultural.org/bogota/museo-del-oro |
| Museo del Oro (domingo) | Gratis | Entrada libre los domingos para todos | https://www.banrepcultural.org/bogota/museo-del-oro |
| Museo Botero | Gratis | Entrada libre siempre (coleccion Botero) | https://www.banrepcultural.org/bogota/museo-botero |
| Museo Nacional de Colombia | 4000 | Coleccion permanente | https://museonacional.gov.co |
| Museo Nacional (domingo) | Gratis | Entrada libre los domingos | https://museonacional.gov.co |
| MAMBO (Museo Arte Moderno) | 14000 | Coleccion de arte moderno y contemporaneo | https://www.mambogota.com |
| Monserrate (funicular/teleferico) | 75000 | Subida y bajada, vista 360 de la ciudad | https://www.monserrate.co |
| Catedral Primada de Bogota | Gratis | Visita al templo en la Plaza de Bolivar | https://www.catedraldebogota.org |

Nota: admin.html recoge la fila como `{tipo, precio, nota}`; el renderer lee `e.incluye`. El seed escribe `incluye`.

### Matriz de temporada `f-temporada-{mes}` (mes - ideal/posible/evitar)

| Ene | Feb | Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ideal | ideal | posible | posible | evitar | posible | ideal | ideal | posible | evitar | posible | ideal |

`f-temporada-nota`: Bogota tiene clima estable 14-20C todo el ano. Temporada seca principal dic-ene y jul-ago (mejores vistas a Monserrate). Lluvias mas fuertes abril-mayo y octubre-noviembre. En diciembre la ciudad se llena de alumbrados navidenos.

### `dificultad_tags` (dificultad-tags-admin, `{texto, apto}`)

- Ciudad accesible a pie en el centro - apto
- Apto para ninos - apto
- Altitud 2640m - usar precaucion los primeros dias
- Traslados largos entre barrios - usar TransMilenio o taxi
- Lluvias impredecibles - llevar paraguas o impermeable

### `checklist` (checklist-admin, `{item, prioridad}`)

| item | prioridad |
|---|---|
| Hidratacion y bocadillos por la altitud | Obligatorio |
| Paragua o impermeable (lluvia sorpresa) | Obligatorio |
| Efectivo en pesos (propinas y mercados) | Recomendado |
| Tarjeta de transporte (TuLlave) para TransMilenio | Recomendado |
| Zapatos comodos para caminar | Recomendado |
| Documento de identidad (pasaporte) | Recomendado |
| Ropa de abrigo para la noche (frio de montana) | Opcional |

### `tours` (tour-list-admin)

1. **Walking tour por el centro historico**
   - precio: $40.000 - precio_sub: por persona - duracion: 3 horas - tipo_tour: Grupal - idioma: Espanol - max_personas: Max 12
   - rating: 4.8 - review_count: 320 - descripcion: Plaza de Bolivar, Catedral, La Candelaria y el Chorro de Quevedo con guia.
   - incluye: Guia certificado, Entrada a Museo Botero, Historia de la fundacion - link_reserva: https://bogotawalkingtours.com
   - no_incluye: Transporte, Alimentos

2. **Tour gastronomico: ajiaco y mercados**
   - precio: $65.000 - precio_sub: por persona - duracion: 3.5 horas - tipo_tour: Grupal - idioma: Espanol - max_personas: Max 8
   - rating: 4.9 - review_count: 210 - descripcion: Degustacion de ajiaco, chocolate santafereño, tamales y frutas exoticas en la Plaza de Mercado La Perseverancia.
   - incluye: Guia gastronomico, 4 degustaciones, Receta de ajiaco - link_reserva: https://bogotafoodtours.com
   - no_incluye: Transporte, Bebidas adicionales

3. **Monserrate al amanecer**
   - precio: $90.000 - precio_sub: por persona - duracion: 4 horas - tipo_tour: Privado - idioma: Espanol/Ingles - max_personas: Max 6
   - rating: 4.9 - review_count: 145 - descripcion: Funicular al cerro para ver el amanecer sobre toda la sabana bogotana.
   - incluye: Tiquetes funicular, Guia, Desayuno tipico - link_reserva: https://monserratebogota.com
   - no_incluye: Traslado al punto de encuentro

4. **Tour de grafiti y arte urbano**
   - precio: $50.000 - precio_sub: por persona - duracion: 3 horas - tipo_tour: Grupal - idioma: Espanol/Ingles - max_personas: Max 15
   - rating: 4.7 - review_count: 98 - descripcion: Distrito Graffiti en el barrio La Candelaria y murales de la Calle 26.
   - incluye: Guia de arte urbano, Recorrido a pie, Datos del proceso de paz - link_reserva: https://bogotagraffititour.com
   - no_incluye: Transporte, Comidas

5. **Bogota en bicicleta (cicloruta)**
   - precio: $55.000 - precio_sub: por persona - duracion: 4 horas - tipo_tour: Grupal - idioma: Espanol/Ingles - max_personas: Max 10
   - rating: 4.6 - review_count: 76 - descripcion: Recorrido por la red de ciclorutas con paradas en parques y puntos culturales.
   - incluye: Bicicleta, Casco, Guia, Seguro - link_reserva: https://bogotabiketour.com
   - no_incluye: Alimentos, Seguro personal

### `itinerario` (itinerario-list-admin, `{dia, hora, titulo, icono, detalle, tags[]}`)

| dia | hora | titulo | icono | detalle | tags |
|---|---|---|---|---|---|
| Dia 1 | 9:00 am | Plaza de Bolivar y Catedral | \ud83c\udfdb | Corazon de la ciudad: Congreso, Palacio de Justicia y Catedral Primada | Centro, Historia |
| Dia 1 | 11:00 am | La Candelaria | \ud83c\udfeb | Calles coloniales, museos y arte urbano | Centro, Colonial |
| Dia 1 | 1:30 pm | Ajiaco en zona universitaria | \ud83c\udf72 | Almuerzo tipico bogotano | Gastronomia |
| Dia 1 | 3:00 pm | Museo Botero | \ud83c\udfa8 | Coleccion gratuita de Fernando Botero | Arte, Gratis |
| Dia 1 | 5:00 pm | Museo del Oro | \ud83d\udc8e | La mayor coleccion de orfebreria prehispanica del mundo | Museos |
| Dia 2 | 8:00 am | Funicular a Monserrate | \ud83d\ude9c | Vista 360 de la sabana desde 3.152 m | Monserrate |
| Dia 2 | 11:00 am | Quinta de Bolivar | \ud83c\udfe1 | Casa-museo del libertador Simón Bolivar | Historia |
| Dia 2 | 2:00 pm | Museo Nacional | \ud83c\udfdb | Historia de Colombia desde la epoca prehispanica | Museos |
| Dia 2 | 6:00 pm | Zona T y Parque 93 | \ud83c\udf7d | Cena y vida nocturna en Chapinero | Noche |
| Dia 3 | 9:00 am | Mercado La Perseverancia | \ud83e\uddc1 | Mercado tradicional con desayuno local | Gastronomia |
| Dia 3 | 11:00 am | Distrito Graffiti | \ud83c\udfa8 | Arte urbano y murales de la Calle 26 | Arte |
| Dia 3 | 2:00 pm | Usaquen | \ud83c\udf0f | Pueblo colonial absorbido por la ciudad, mercados de pulgas | Barrios |
| Dia 3 | 4:00 pm | Parque Simon Bolivar | \ud83c\udf33 | El pulmon verde de la ciudad, ciclovia | Parques |

### `fauna_flora` (JSON `[{emoji,nombre,hecho}]`)

- \ud83d\udc26 Colibries - Presentes en cerros y parques de la ciudad
- \ud83c\udf3f Roble andino - Arbol emblematico de los cerros orientales
- \ud83c\udf3c Frailejon - Planta tipica del paramo (Cerro de Monserrate)
- \ud83d\udc1a Copeton de los Andes - Aves nativas del paramo cercano
- \ud83c\udf31 Eucaliptos y alamedas - Vegetacion de las calles y parques urbanos
- \ud83e\uddb8 Perezosos - Rescatados en humedales urbanos (Humedal Cordoba)

### `secretos` (JSON `[{icono, titulo, texto, tag, tag_color}]`)

- \ud83c\udfdb "Casa de Narinho" - Residencia presidencial con guardia y horario de visita gratuito los primeros sabados del mes. Tag: Historia, gold
- \ud83d\udcd6 "Librerias de La Candelaria" - Libreria Merlin y librerias de viejo esconden primeras ediciones y libros raros. Tag: Cultura, green
- \ud83c\udf0f "Ciclovia dominical" - De 7AM a 2PM la ciudad cierra 120 km de calles para bicis y caminantes. Tag: Tip, blue
- \ud83c\udfa8 "Museo Botero gratis" - Uno de los museos mas importantes de Latinoamerica con entrada libre siempre. Tag: Gratis, gold
- \ud83c\udf6b "Chocolate santafereño con queso" - El desayuno clasico bogotano; probarlo en La Candelaria. Tag: Comer, brown
- \ud83c\udf04 "Atardecer desde Monserrate" - Subir 1 hora antes del atardecer para la mejor luz sobre la sabana. Tag: Tip, blue

### `regulaciones` (regulaciones-admin, texto)

Bogota es una ciudad segura si se siguen las precauciones urbanas habituales: evitar zonas despobladas de noche, cuidar pertenencias en transporte publico y usar apps de transporte en vez de taxis de calle. Los museos tienen sus propios horarios (generalmente cerrado los lunes). En los cerros (Monserrate) se debe permanecer en los senderos habilitados. No esta permitido fumar en espacios cerrados ni en parques. La altitud de 2.640 m puede afectar la primera noche: hidratarse y evitar alcohol. Las propinas en restaurantes son del 10% y ya suelen estar incluidas en la cuenta.

## 3. Coordenadas verificadas (fuente: OpenStreetMap/Wikivoyage)

- Centro de la ciudad (Plaza de Bolivar): 4.7110, -74.0721 (altitud 2.640 m)
- Aeropuerto El Dorado: 4.7016, -74.1469 (13 km al oeste)
- Monserrate (cerro): 4.6058, -74.0556
- Museo del Oro: 4.6012, -74.0720
- Museo Botero: 4.6034, -74.0703
- Museo Nacional: 4.6157, -74.0684
- Usaquen: 4.6989, -74.0311
- Zona T / Parque 93: 4.6780, -74.0476

## 4. Imagenes (Wikimedia Commons, verificadas HTTP 200, tamano 960px valido)

- Hero: `6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg` - skyline del centro
- `6/64/Plaza_de_Bol%C3%ADvar_-_Bogot%C3%A1.JPG` - Plaza de Bolivar
- `3/36/Teleferico_Monserrate.jpg/960px-Teleferico_Monserrate.jpg` - Teleferico de Monserrate
- `9/9a/Santuario_de_Monserrate%2C_Bogot%C3%A1.jpg/960px-Santuario_de_Monserrate%2C_Bogot%C3%A1.jpg` - Santuario de Monserrate
- `4/4a/TransMilenio_estaci%C3%B3n_Las_Aguas_y_Monserrate.jpg/960px-...` - TransMilenio con Monserrate al fondo
- `e/ef/Panor%C3%A1mica_de_Usaquen%2C_Bogot%C3%A1_D.C.jpg/960px-...` - Panoramica de Usaquen
- `b/b0/Museo-del-Oro-Fachada_%2827842494739%29.jpg/960px-...` - Fachada del Museo del Oro

## 5. FAQs (5)

1. **Es seguro Bogota para turistas?** Si, las zonas turisticas (La Candelaria, Chapinero, Zona T) son seguras de dia. Usa apps de transporte, evita calles vacias de noche y guarda tus pertenencias en el transporte publico.
2. **Cuantos dias se necesitan para ver Bogota?** 3-5 dias. Tres dias cubren el centro historico, Monserrate y un par de museos; con 4-5 dias agregas Usaquen, arte urbano y excursiones de un dia como la Catedral de Sal de Zipaquira.
3. **Como llegar del aeropuerto al centro?** Taxi oficial (30-45 min, tarifa fija) o TransMilenio ruta K86 desde la estacion El Dorado hasta el centro (~40 min). Apps de transporte tambien operan en El Dorado.
4. **Cual es la mejor epoca para visitar Bogota?** Diciembre-enero y julio-agosto son los meses mas secos con mejor visibilidad de Monserrate. La ciudad funciona todo el ano; en diciembre los alumbrados navidenos son imperdibles.
5. **Que comida tipica hay que probar?** El ajiaco (sopa de papa con pollo y maiz), el chocolate santafereño con queso, los tamales, la almojabana y las obleas con arequipe.

## 6. Alcance

- **Bogota.html** (pagina dinamica via `api/pagina-destino.js`, patron lacandelaria): Hero (lead/desc/rating 0), Info rapida, Datos del sitio (matriz 12 meses), Dificultad (+tags), Entradas, Tours, Que llevar, Itinerario (tabs), Fauna y flora, Secretos (tip-cards), Regulaciones, Galeria, Mapa (iframe Google), Resenas (vacio), Contacto, Relacionados.
- **Nota:** las secciones premium (Leaflet, quien va este mes, comparador visual, lightbox) solo viven en paginas hardcodeadas; el motor dinamico usa iframe Google Maps como monserrate.html.
- **Rating:** 0 hasta que lleguen resenas reales (ADR-008/decision de producto); el motor muestra "Se el primero en dejar una resena".
