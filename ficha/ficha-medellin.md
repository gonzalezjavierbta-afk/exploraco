# Ficha unica Medellin - fuente de datos para la pagina dinamica medellin.html

> Un solo conjunto de datos, validado contra `admin.html` (IDs del form) y
> `api/pagina-destino.js` (llaves que lee el motor `buildHTML()`). Medellin se
> trata como un destino de categoria `sitio` a escala ciudad, con los mismos
> campos del formulario que plaza-botero-medellin o comuna-13-san-javier-medellin.
> Espejo en forma y profundidad de `ficha/ficha-bogota.md`.
> Sin fotografias por decision explicita del operador: `foto_hero` = null y el
> hero degrada a color solido (`f-hero-bg`) + emoji.
> Las tablas van en grafia ASCII (ADR-002); el bloque JSON de la seccion 8 es el
> contrato exacto y conserva tildes como escapes \uXXXX.

## 1. Campos generales del form (admin.html, bloque generico)

| ID del form | Valor Medellin |
|---|---|
| `f-name` | Medellin |
| `f-cat` | sitio |
| `f-slug` | medellin |
| `f-emoji` | \ud83c\udf38 (flor / primavera) |
| `f-city` | Medellin (grafia canonica en BASE: Medell\u00edn) |
| `f-region` | Antioquia |
| `f-barrio` | Centro / Valle de Aburra |
| `f-address` | Medellin, Antioquia, Colombia |
| `f-price` | Espacio publico libre / Parques desde $10.000 COP |
| `f-horario` | Accesible 24/7; Metro 4:30 AM - 11:00 PM |
| `f-tipo` | Destino Urbano / Cultura / Innovacion |
| `f-lead` | La capital de Antioquia y la Ciudad de la Eterna Primavera: innovacion urbana, clima templado todo el ano y cultura paisa entre montanas. |
| `f-desc` | Medellin esta en el Valle de Aburra a 1.495 msnm y combina modernidad urbana con una geografia montanosa espectacular. Segunda ciudad mas poblada de Colombia (2.5 millones en zona urbana, mas de 4.3 millones en el area metropolitana). Su sistema de transporte integrado, unico en el pais (Metro, Metrocable, Tranvia y Metroplus), y su transformacion social la llevaron a ser Ciudad Mas Innovadora del Mundo en 2013 y hoy Distrito Especial de Ciencia, Tecnologia e Innovacion. Atractivos: Plaza Botero, Comuna 13, Parque Explora, Jardin Botanico y Parque Arvi; eventos: Feria de las Flores en agosto y Colombiamoda. |
| `f-photo-hero` | (vacio) - sin fotografia por decision del operador |
| `f-hero-bg` | #1b4d3e (hex solido, verde montana) |
| `f-lat` | 6.2442 |
| `f-lng` | -75.5812 |
| `f-whatsapp` | (vacio) |
| `f-telefono` | 6044444144 |
| `f-email` | (vacio) |
| `f-web` | https://www.medellin.gov.co |
| `f-instagram` | @alcaldiademed |
| `f-capacidad` | Aforo metropolitano |

## 2. Campos especificos de sitio (bloque `especifico-sitio`)

| ID del form | Valor Medellin |
|---|---|
| `f-tipo-actividad` | Turismo Urbano / Cultural / Naturaleza |
| `f-dificultad` | Facil |
| `f-dificultad-desc` | Ciudad accesible a pie en el centro y con transporte integrado masivo (Metro, Metrocable, Tranvia, Metroplus). Las laderas de la Comuna 13 y los senderos del Parque Arvi exigen esfuerzo moderado; el clima templado (22 C promedio) permite recorrerla todo el ano. |
| `f-duracion` | 3-5 dias |
| `f-altitud` | 1495 |
| `f-temporada` | Todo el ano / Agosto (Feria de las Flores) / Diciembre (Alumbrados navidenos) |
| `f-entrada-precio` | Espacio publico gratuito; parques y museos principales entre $10.000 y $40.000 COP |
| `f-distancia-sitio` | Capital departamental del Valle de Aburra |
| `f-como-llegar-sitio` | Sistema Integrado de Transporte Masivo (Metro, Metrocable, Tranvia y Metroplus) con tarjeta Civica o tarjeta bancaria habilitada. |
| `f-permisos-sitio` | No requiere permisos generales para el ingreso a la ciudad. Parques naturales como Arvi tienen horarios y guias especificos. |
| `f-temporada-nota` | Clima de primavera constante (22 C promedio). Lluvias moderadas en abril-mayo y octubre-noviembre; agosto concentra la Feria de las Flores y diciembre los alumbrados navidenos. |

### `entradas` (entradas-list-admin, `{tipo, precio, incluye, link}`)

Tarifas tomadas de las fichas locales del destino (ficha/ficha-*.json) y de las
fuentes oficiales de la seccion 7. Todas las URLs verificadas HTTP 200.

| tipo | precio | incluye | link |
|---|---|---|---|
| Plaza Botero y centro historico | Gratis | 23 esculturas de bronce de Fernando Botero a cielo abierto y recorrido por La Candelaria | https://www.medellin.travel |
| Museo de Antioquia | $24.000 COP extranjeros / $15.000 COP nacionales | Salas permanentes de Fernando Botero y exposiciones temporales | https://www.museodeantioquia.co |
| Parque Explora y Acuario | $40.000 COP general | Salas interactivas, vivario, planetario y acuario de agua dulce | https://www.parqueexplora.org |
| Jardin Botanico y Orquideorama | Gratis | Acceso a 14 hectareas, Orquideorama y colecciones vegetales | https://www.botanicomedellin.org |
| Pueblito Paisa y Cerro Nutibara | Gratis | Replica del pueblo antioqueno y mirador panoramico 360 | https://www.medellin.travel |
| Parque Arvi (Metrocable Linea L) | Entrada gratis / Metrocable $13.500 COP por trayecto | Acceso a la reserva y senderos; los recorridos guiados se cobran aparte | https://www.parquearvi.org |
| MAMM (Museo de Arte Moderno) | $18.000 COP general / $12.000 COP estudiantes | Exposiciones de arte contemporaneo en Ciudad del Rio | https://www.elmamm.org |
| Fincas Silleteras de Santa Elena | $25.000 COP con recorrido guiado | Cultivos de flores, armado de silleta y visita a la finca campesina | https://www.santaelena.com.co |

Nota: admin.html recoge la fila como `{tipo, precio, nota}`; el renderer lee
`e.incluye`. El seed escribe `incluye`.

### Matriz de temporada `f-temporada-{mes}` (mes - ideal/posible/evitar)

| Ene | Feb | Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ideal | ideal | posible | posible | posible | ideal | ideal | ideal | posible | posible | ideal | ideal |

`f-temporada-nota`: Clima de primavera constante (22 C promedio). Lluvias moderadas en abril-mayo y octubre-noviembre; agosto concentra la Feria de las Flores y diciembre los alumbrados navidenos.

### `dificultad_tags` (dificultad-tags-admin, `{texto, apto}`)

- Ciudad accesible a pie en el centro y con sistema Metro - apto
- Apto para familias y personas de todas las edades - apto
- Recorridos inclinados en laderas (Comuna 13, Arvi) - NO apto
- Lluvias frecuentes en abril-mayo y octubre-noviembre - NO apto
- Traslados largos entre cerros y centro en hora pico - NO apto

### `equipamiento` (checklist-admin via `collectChecklistItems`, `{item, prioridad}`)

| item | prioridad |
|---|---|
| Calzado comodo para caminatas urbanas | Obligatorio |
| Sombrilla pequena o impermeable ligero (lluvias de abril-mayo y octubre-noviembre) | Obligatorio |
| Proteccion solar: gorra y bloqueador | Recomendado |
| Tarjeta Civica para Metro, Metrocable y Tranvia | Recomendado |
| Chaqueta ligera para Arvi y Santa Elena (12-18 C) | Recomendado |
| Botella de agua reutilizable | Recomendado |
| Efectivo en pesos para mercados y propinas | Opcional |

### `tours` (tour-list-admin)

Sin `rating` ni `review_count`: no hay fuente verificable (ADR-009/ADR-008).

1. **Graffitour Comunitario Comuna 13**
   - precio: $35.000 COP - precio_sub: por persona (aporte voluntario desde $0) - duracion: 2.5 horas - tipo_tour: Grupal - idioma: Espanol e Ingles - max_personas: Max 20
   - descripcion: Recorrido por la historia de transformacion social de la Comuna 13, las escaleras electricas al aire libre y las galerias de arte urbano.
   - incluye: Guia local comunitario, Recorrido por el arte urbano, Muestra de hip-hop y danza urbana - link_reserva: https://www.medellin.travel
   - no_incluye: Transporte al punto de encuentro, Consumos personales

2. **Tour Centro Historico y Plaza Botero**
   - precio: $50.000 COP - precio_sub: por persona - duracion: 3.5 horas - tipo_tour: Grupal - idioma: Espanol - max_personas: Max 12
   - descripcion: Caminata por el Pasaje Junin, Parque Berrio, Edificio Coltejer, Basilica Metropolitana y la Plaza de las Esculturas.
   - incluye: Guia certificado, Recorrido a pie por el centro, Contexto historico de la ciudad - link_reserva: https://www.medellin.travel
   - no_incluye: Entradas a museos, Alimentos

3. **Senderos guiados Parque Arvi**
   - precio: Desde $20.000 COP - precio_sub: por persona (no incluye el Metrocable) - duracion: 3 horas - tipo_tour: Grupal - idioma: Espanol - max_personas: Max 15
   - descripcion: Caminata guiada por los bosques de niebla y el antiguo Camino Cieza de Leon, con avistamiento de aves.
   - incluye: Guia ambiental, Sendero interpretativo, Seguro de accidentes - link_reserva: https://www.parquearvi.org
   - no_incluye: Metrocable Linea L ($13.500 COP por trayecto), Alimentos

4. **Visita a Fincas Silleteras de Santa Elena**
   - precio: $25.000 COP - precio_sub: por persona (con reserva previa) - duracion: 2 horas - tipo_tour: Grupal - idioma: Espanol - max_personas: Max 12
   - descripcion: Recorrido por los cultivos de mas de 80 especies de flores y taller de armado de silleta con una familia silletera.
   - incluye: Guia campesino, Recorrido por los cultivos, Demostracion de armado de silleta - link_reserva: https://www.santaelena.com.co
   - no_incluye: Transporte a Santa Elena, Flores para llevar

5. **Comuna 13 privado con guia local**
   - precio: $60.000 COP - precio_sub: por persona - duracion: 3 horas - tipo_tour: Privado - idioma: Espanol e Ingles - max_personas: Max 6
   - descripcion: Version privada del recorrido por San Javier: escaleras electricas, murales y conversacion con lideres del barrio.
   - incluye: Guia local privado, Ritmo personalizado, Paradas fotograficas - link_reserva: https://www.medellin.travel
   - no_incluye: Transporte, Consumos personales

### `itinerario` (itinerario-list-admin, `{dia, hora, titulo, icono, detalle, tags[]}`)

13 paradas en 3 dias.

| dia | hora | titulo | icono | detalle | tags |
|---|---|---|---|---|---|
| Dia 1 | 09:00 AM | Plaza Botero | \ud83c\udfdb | Las 23 esculturas de bronce de Fernando Botero a cielo abierto, en el corazon del centro. | Arte, Centro |
| Dia 1 | 10:30 AM | Museo de Antioquia | \ud83d\uddbc | Sala Botero y mas de 5.000 piezas en el antiguo Palacio Municipal, frente a la plaza. | Museos, Historia |
| Dia 1 | 12:30 PM | Almuerzo en la Plaza de Mercado de Florez | \ud83c\udf72 | Mercado fundado en 1891: fondas de cocina tipica y flores frescas desde $15.000 COP. | Gastronomia, Mercado |
| Dia 1 | 02:30 PM | Parque de las Luces (Plaza Cisneros) | \ud83d\udca1 | 300 torres de luz de hasta 24 metros que transformaron el centro administrativo. | Urbano, Foto |
| Dia 1 | 04:30 PM | La Candelaria y Pasaje Junin | \ud83c\udfdb | Basilica Metropolitana, Iglesia de la Candelaria y el Edificio Coltejer. | Historia, Centro |
| Dia 2 | 09:00 AM | Jardin Botanico y Orquideorama | \ud83c\udf3f | 14 hectareas, mas de 1.000 especies vegetales y el Orquideorama. Martes a domingo. | Naturaleza, Gratis |
| Dia 2 | 11:00 AM | Parque Explora y Acuario | \ud83d\udc20 | Mas de 300 experiencias interactivas y el acuario de agua dulce mas grande de Sudamerica. | Ciencia, Familia |
| Dia 2 | 02:00 PM | Metrocable Linea L | \ud83d\udea0 | Ascenso en teleferico desde Santo Domingo hasta el Parque Arvi ($13.500 COP por trayecto). | Transporte, Paisaje |
| Dia 2 | 03:30 PM | Senderos del Parque Arvi | \ud83c\udf32 | Bosques de niebla, avistamiento de aves y el antiguo Camino Cieza de Leon. | Eco, Caminata |
| Dia 3 | 09:00 AM | Graffitour Comuna 13 | \ud83c\udfa8 | Escaleras electricas al aire libre, murales y escuelas de hip-hop en San Javier. | Arte Urbano, Comunidad |
| Dia 3 | 12:30 PM | Almuerzo comunitario en San Javier | \ud83c\udf7d | Cocina de barrio atendida por emprendimientos locales del circuito turistico. | Gastronomia, Comunidad |
| Dia 3 | 02:30 PM | Pueblito Paisa y Cerro Nutibara | \ud83c\udfd4 | Replica del pueblo antioqueno y mirador 360 sobre el Valle de Aburra. | Mirador, Tradicion |
| Dia 3 | 05:00 PM | Provenza (El Poblado) | \ud83c\udf2e | Cena y vida nocturna en el corredor gastronomico de El Poblado. | Noche, Gastronomia |

### `fauna_flora` (JSON `[{emoji,nombre,hecho}]`)

- \ud83c\udf3a Orquideas del Orquideorama - El Orquideorama del Jardin Botanico exhibe mas de 300 especies y es el epicentro de la floricultura antioquena.
- \ud83d\udc26 Aves del Parque Arvi y cerros tutelares - En los cerros tutelares y en el Parque Arvi habitan mas de 160 especies de aves registradas.
- \ud83e\udd8e Iguanas silvestres - Las iguanas viven libres entre los arboles del Jardin Botanico, que protege mas de 1.000 especies vegetales en 14 hectareas.
- \ud83d\udc1f Pirarucus y piranas - El acuario de agua dulce del Parque Explora, el mas grande de Sudamerica, alberga peces del Amazonas y de los rios colombianos.
- \ud83c\udf33 Bosques de niebla de Santa Elena - El Parque Arvi protege mas de 16.000 hectareas de bosque de niebla y el antiguo Camino Cieza de Leon.
- \ud83c\udf3c Flores de las fincas silleteras - Las fincas de Santa Elena cultivan mas de 80 especies de flores para armar las silletas de la Feria de las Flores.

### `secretos` (JSON `[{icono, titulo, texto, tag, tag_color}]`)

- \ud83d\ude87 "Unico Metro de Colombia" - Medellin cuenta con el unico sistema de tren metropolitano del pais, inaugurado en 1995. Tag: Innovacion, gold.
- \ud83d\udea1 "Pioneros en Metrocable" - Fue la primera ciudad del mundo en integrar telefericos al transporte publico urbano como estrategia de integracion social (Linea K, 2004). Tag: Transporte, blue.
- \ud83c\udf3b "Cultura Silletera" - La tradicion de los silleteros de Santa Elena fue declarada Patrimonio Cultural e Inmaterial de la Nacion en 2014. Tag: Patrimonio, green.
- \ud83d\udcfb "Salon Malaga" - Bar y cafe fundado en 1957 en La Candelaria, famoso por conservar mas de 50.000 discos de tango en vinilo. Tag: Tango, gold.
- \ud83c\udfa4 "Cuna del Hip-Hop" - La Comuna 13 tiene sus propias escuelas de rap y lirica que impulsan proyectos de paz y turismo comunitario. Tag: Cultura, purple.
- \ud83d\udcf7 "Fotografos Minuto en Plaza Botero" - En la plaza aun trabajan fotografos con camaras analogas e impresion instantanea tradicional, oficio en via de extincion. Tag: Tradicion, gold.

### `regulaciones` (regulaciones-admin, texto)

Respetar la Cultura Metro en estaciones, trenes y cables. Usar guias locales autorizados en la Comuna 13 para promover el turismo comunitario. No arrojar basura en parques ni en los cerros tutelares. No fumar en espacios cerrados.

`checklist_tip`: Compra la Tarjeta Civica Eventual en cualquier estacion del Metro: evita filas y sirve para Metro, Metrocable, Tranvia y Metroplus.

## 3. Coordenadas verificadas (fichas locales del destino)

- Centro de la ciudad (BASE): 6.2442, -75.5812 (altitud 1.495 m)
- Plaza Botero: 6.2519, -75.5686
- Museo de Antioquia: 6.2522, -75.5689
- Parque Explora: 6.2708, -75.5656
- Jardin Botanico: 6.2703, -75.5639
- Pueblito Paisa / Cerro Nutibara: 6.2364, -75.5803
- Comuna 13 (San Javier): 6.2517, -75.6139
- Parque Arvi: 6.2813, -75.5019
- Cerro El Volador: 6.2625, -75.5828
- MAMM (Ciudad del Rio): 6.2238, -75.5752

## 4. Imagenes

Sin imagenes: decision explicita del operador. `foto_hero` = null y
`FOTOS_SUGERIDAS` = []. No se proponen archivos de Wikimedia. El motor
(`api/pagina-destino.js`, `grad = d.hero_bg || CAT_GRAD[cat]`) concatena el valor
crudo de `hero_bg`, por eso se siembra un hex solido de 6 digitos (#1b4d3e) y no
un gradiente.

## 5. FAQs (5)

1. **?Cual es la mejor epoca para visitar Medellin?** Todo el ano por su clima constante de 22 C. Destacan agosto, con la Feria de las Flores, y diciembre, con los alumbrados navidenos.
2. **?Como movilizarse de forma economica en la ciudad?** Con el Sistema Integrado Metro (tren, Metrocable, Tranvia y buses Metroplus) usando la tarjeta Civica, que tambien acepta tarjeta bancaria habilitada.
3. **?Es seguro visitar la Comuna 13?** Si. Es uno de los puntos turisticos mas visitados de la ciudad; conviene recorrerlo con guias locales y dentro de los circuitos comunitarios.
4. **?A que distancia esta el Aeropuerto Internacional Jose Maria Cordova?** Esta en Rionegro, a unos 35-45 minutos en taxi o bus intermunicipal a traves del Tunel de Oriente.
5. **?Que plato tipico no se puede dejar de probar?** La bandeja paisa y la arepa de choclo con queso; en la Plaza de Mercado de Florez se consiguen platos tipicos desde $15.000 COP.

## 6. Alcance

- **medellin.html** (pagina dinamica via `api/pagina-destino.js`, patron bogota): Hero (lead/desc/rating 0), Info rapida, Datos del sitio (matriz 12 meses), Dificultad (+tags), Entradas, Tours, Que llevar, Itinerario (tabs), Fauna y flora, Secretos (tip-cards), Regulaciones, Galeria (vacia por decision del operador), Mapa (iframe Google), Resenas (vacio), Contacto, Relacionados.
- **Nota:** las secciones premium (Leaflet, quien va este mes, comparador visual, lightbox) solo viven en paginas hardcodeadas; el motor dinamico usa iframe Google Maps.
- **Rating:** 0 hasta que lleguen resenas reales (ADR-008/ADR-009); el motor muestra "Se el primero en dejar una resena". Ningun `highlight`, tour o TAGS lleva rating ni review_count.

## 7. Fuentes

1. { tipo: oficial, url: "https://www.medellin.gov.co", que_respalda: "Datos institucionales, telefono y sitio oficial" }
2. { tipo: oficial, url: "https://www.medellin.travel", que_respalda: "Informacion turistica, atracciones e itinerarios" }
3. { tipo: maps, url: "https://maps.google.com/?q=Medellin+Colombia", que_respalda: "Coordenadas geograficas y ubicacion" }
4. { tipo: prensa, url: "https://www.elcolombiano.com", que_respalda: "Datos de poblacion y transformacion urbana" }

## 8. JSON de entrega (bloque exacto)

```json
{
  "BASE": {
    "slug": "medellin",
    "nombre": "Medell\u00edn",
    "categoria_slug": "sitio",
    "lead": "Conocida como la Ciudad de la Eterna Primavera, Medell\u00edn es la capital de Antioquia y referente global de innovaci\u00f3n, cultura y resiliencia.",
    "descripcion": "Ubicada en el Valle de Aburr\u00e1 a 1.495 msnm, Medell\u00edn combina modernidad urbana con una geograf\u00eda monta\u00f1osa espectacular. Es la segunda ciudad m\u00e1s poblada de Colombia, con 2.5 millones de habitantes en su zona urbana y m\u00e1s de 4.3 millones en el \u00e1rea metropolitana.\n\nDestaca por su sistema de transporte integrado, \u00fanico en el pa\u00eds (Metro, Metrocable, Tranv\u00eda y Metropl\u00fas), y por su profunda transformaci\u00f3n social: pas\u00f3 de una crisis severa en los a\u00f1os 90 a ser nombrada la Ciudad M\u00e1s Innovadora del Mundo en 2013, y hoy es Distrito Especial de Ciencia, Tecnolog\u00eda e Innovaci\u00f3n.\n\nEntre sus atractivos imperdibles destacan la Plaza Botero, la Comuna 13 con sus escaleras el\u00e9ctricas al aire libre, el Parque Explora, el Jard\u00edn Bot\u00e1nico y el Parque Arv\u00ed, adem\u00e1s de eventos como la Feria de las Flores en agosto y Colombiamoda.",
    "highlight": "La Ciudad de la Eterna Primavera: innovaci\u00f3n urbana, clima templado todo el a\u00f1o y cultura paisa entre monta\u00f1as.",
    "ciudad": "Medell\u00edn",
    "region": "Antioquia",
    "barrio": "Centro / Valle de Aburr\u00e1",
    "lat": 6.2442,
    "lng": -75.5812,
    "whatsapp": "",
    "telefono": "6044444144",
    "email": "",
    "web": "https://www.medellin.gov.co",
    "instagram": "@alcaldiademed",
    "precio_desde": "Espacio p\u00fablico libre \u00b7 Parques desde $10.000 COP",
    "horario": "Accesible 24/7 \u00b7 Metro 4:30 AM - 11:00 PM",
    "emoji": "\ud83c\udf38",
    "hero_bg": "#1b4d3e",
    "foto_hero": null,
    "tipo": "Destino Urbano \u00b7 Cultura \u00b7 Innovaci\u00f3n",
    "capacidad": "Aforo metropolitano",
    "como_llegar": "Por aire v\u00eda Aeropuerto Internacional Jos\u00e9 Mar\u00eda C\u00f3rdova (Rionegro, 35 min por el T\u00fanel de Oriente) u Olaya Herrera (vuelos regionales); por tierra v\u00eda Terminales del Norte o del Sur.",
    "status": "published",
    "destacado": true
  },
  "TAGS": {
    "tipo_actividad": "Turismo Urbano / Cultural / Naturaleza",
    "dificultad": "Facil",
    "dificultad_desc": "Ciudad accesible a pie en el centro y con transporte integrado masivo (Metro, Metrocable, Tranv\u00eda, Metropl\u00fas). Las laderas de la Comuna 13 y los senderos del Parque Arv\u00ed exigen esfuerzo moderado; el clima templado (22 C promedio) permite recorrerla todo el a\u00f1o.",
    "duracion": "3-5 dias",
    "altitud": "1495",
    "temporada": [
      "Todo el a\u00f1o",
      "Agosto (Feria de las Flores)",
      "Diciembre (Alumbrados navide\u00f1os)"
    ],
    "precio_entrada": "Espacio p\u00fablico gratuito; parques y museos principales entre $10.000 y $40.000 COP",
    "distancia": "Capital departamental del Valle de Aburr\u00e1",
    "como_llegar": "Sistema Integrado de Transporte Masivo (Metro, Metrocable, Tranv\u00eda y Metropl\u00fas) con tarjeta C\u00edvica o tarjeta bancaria habilitada.",
    "permisos": "No requiere permisos generales para el ingreso a la ciudad. Parques naturales como Arv\u00ed tienen horarios y gu\u00edas espec\u00edficos.",
    "temporada_nota": "Clima de primavera constante (22 C promedio). Lluvias moderadas en abril-mayo y octubre-noviembre; agosto concentra la Feria de las Flores y diciembre los alumbrados navide\u00f1os.",
    "fauna_flora": [
      {
        "emoji": "\ud83c\udf3a",
        "nombre": "Orqu\u00eddeas del Orquideorama",
        "hecho": "El Orquideorama del Jard\u00edn Bot\u00e1nico exhibe m\u00e1s de 300 especies y es el epicentro de la floricultura antioque\u00f1a."
      },
      {
        "emoji": "\ud83d\udc26",
        "nombre": "Aves del Parque Arv\u00ed y cerros tutelares",
        "hecho": "En los cerros tutelares y en el Parque Arv\u00ed habitan m\u00e1s de 160 especies de aves registradas."
      },
      {
        "emoji": "\ud83e\udd8e",
        "nombre": "Iguanas silvestres",
        "hecho": "Las iguanas viven libres entre los \u00e1rboles del Jard\u00edn Bot\u00e1nico, que protege m\u00e1s de 1.000 especies vegetales en 14 hect\u00e1reas."
      },
      {
        "emoji": "\ud83d\udc1f",
        "nombre": "Piraruc\u00fas y pira\u00f1as",
        "hecho": "El acuario de agua dulce del Parque Explora, el m\u00e1s grande de Sudam\u00e9rica, alberga peces del Amazonas y de los r\u00edos colombianos."
      },
      {
        "emoji": "\ud83c\udf33",
        "nombre": "Bosques de niebla de Santa Elena",
        "hecho": "El Parque Arv\u00ed protege m\u00e1s de 16.000 hect\u00e1reas de bosque de niebla y el antiguo Camino Cieza de Le\u00f3n."
      },
      {
        "emoji": "\ud83c\udf3c",
        "nombre": "Flores de las fincas silleteras",
        "hecho": "Las fincas de Santa Elena cultivan m\u00e1s de 80 especies de flores para armar las silletas de la Feria de las Flores."
      }
    ],
    "secretos": [
      {
        "icono": "\ud83d\ude87",
        "titulo": "\u00danico Metro de Colombia",
        "texto": "Medell\u00edn cuenta con el \u00fanico sistema de tren metropolitano del pa\u00eds, inaugurado en 1995.",
        "tag": "Innovaci\u00f3n",
        "tag_color": "gold"
      },
      {
        "icono": "\ud83d\udea1",
        "titulo": "Pioneros en Metrocable",
        "texto": "Fue la primera ciudad del mundo en integrar telef\u00e9ricos al transporte p\u00fablico urbano como estrategia de integraci\u00f3n social (L\u00ednea K, 2004).",
        "tag": "Transporte",
        "tag_color": "blue"
      },
      {
        "icono": "\ud83c\udf3b",
        "titulo": "Cultura Silletera",
        "texto": "La tradici\u00f3n de los silleteros de Santa Elena fue declarada Patrimonio Cultural e Inmaterial de la Naci\u00f3n en 2014.",
        "tag": "Patrimonio",
        "tag_color": "green"
      },
      {
        "icono": "\ud83d\udcfb",
        "titulo": "Sal\u00f3n M\u00e1laga",
        "texto": "Bar y caf\u00e9 fundado en 1957 en La Candelaria, famoso por conservar m\u00e1s de 50.000 discos de tango en vinilo.",
        "tag": "Tango",
        "tag_color": "gold"
      },
      {
        "icono": "\ud83c\udfa4",
        "titulo": "Cuna del Hip-Hop",
        "texto": "La Comuna 13 tiene sus propias escuelas de rap y l\u00edrica que impulsan proyectos de paz y turismo comunitario.",
        "tag": "Cultura",
        "tag_color": "purple"
      },
      {
        "icono": "\ud83d\udcf7",
        "titulo": "Fot\u00f3grafos Minuto en Plaza Botero",
        "texto": "En la plaza a\u00fan trabajan fot\u00f3grafos con c\u00e1maras an\u00e1logas e impresi\u00f3n instant\u00e1nea tradicional, oficio en v\u00eda de extinci\u00f3n.",
        "tag": "Tradici\u00f3n",
        "tag_color": "gold"
      }
    ],
    "regulaciones": "Respetar la Cultura Metro en estaciones, trenes y cables. Usar gu\u00edas locales autorizados en la Comuna 13 para promover el turismo comunitario. No arrojar basura en parques ni en los cerros tutelares. No fumar en espacios cerrados.",
    "checklist_tip": "Compra la Tarjeta C\u00edvica Eventual en cualquier estaci\u00f3n del Metro: evita filas y sirve para Metro, Metrocable, Tranv\u00eda y Metropl\u00fas.",
    "entradas": [
      {
        "tipo": "Plaza Botero y centro hist\u00f3rico",
        "precio": "Gratis",
        "incluye": "23 esculturas de bronce de Fernando Botero a cielo abierto y recorrido por La Candelaria",
        "link": "https://www.medellin.travel"
      },
      {
        "tipo": "Museo de Antioquia",
        "precio": "$24.000 COP extranjeros / $15.000 COP nacionales",
        "incluye": "Salas permanentes de Fernando Botero y exposiciones temporales",
        "link": "https://www.museodeantioquia.co"
      },
      {
        "tipo": "Parque Explora y Acuario",
        "precio": "$40.000 COP general",
        "incluye": "Salas interactivas, vivario, planetario y acuario de agua dulce",
        "link": "https://www.parqueexplora.org"
      },
      {
        "tipo": "Jard\u00edn Bot\u00e1nico y Orquideorama",
        "precio": "Gratis",
        "incluye": "Acceso a 14 hect\u00e1reas, Orquideorama y colecciones vegetales",
        "link": "https://www.botanicomedellin.org"
      },
      {
        "tipo": "Pueblito Paisa y Cerro Nutibara",
        "precio": "Gratis",
        "incluye": "R\u00e9plica del pueblo antioque\u00f1o y mirador panor\u00e1mico 360",
        "link": "https://www.medellin.travel"
      },
      {
        "tipo": "Parque Arv\u00ed (Metrocable L\u00ednea L)",
        "precio": "Entrada gratis / Metrocable $13.500 COP por trayecto",
        "incluye": "Acceso a la reserva y senderos; los recorridos guiados se cobran aparte",
        "link": "https://www.parquearvi.org"
      },
      {
        "tipo": "MAMM (Museo de Arte Moderno)",
        "precio": "$18.000 COP general / $12.000 COP estudiantes",
        "incluye": "Exposiciones de arte contempor\u00e1neo en Ciudad del R\u00edo",
        "link": "https://www.elmamm.org"
      },
      {
        "tipo": "Fincas Silleteras de Santa Elena",
        "precio": "$25.000 COP con recorrido guiado",
        "incluye": "Cultivos de flores, armado de silleta y visita a la finca campesina",
        "link": "https://www.santaelena.com.co"
      }
    ],
    "tours": [
      {
        "nombre": "Graffitour Comunitario Comuna 13",
        "precio": "$35.000 COP",
        "precio_sub": "por persona (aporte voluntario desde $0)",
        "duracion": "2.5 horas",
        "tipo_tour": "Grupal",
        "idioma": "Espa\u00f1ol e Ingl\u00e9s",
        "max_personas": "20",
        "descripcion": "Recorrido por la historia de transformaci\u00f3n social de la Comuna 13, las escaleras el\u00e9ctricas al aire libre y las galer\u00edas de arte urbano.",
        "incluye": [
          "Gu\u00eda local comunitario",
          "Recorrido por el arte urbano",
          "Muestra de hip-hop y danza urbana"
        ],
        "no_incluye": [
          "Transporte al punto de encuentro",
          "Consumos personales"
        ],
        "link_reserva": "https://www.medellin.travel",
        "featured": true
      },
      {
        "nombre": "Tour Centro Hist\u00f3rico y Plaza Botero",
        "precio": "$50.000 COP",
        "precio_sub": "por persona",
        "duracion": "3.5 horas",
        "tipo_tour": "Grupal",
        "idioma": "Espa\u00f1ol",
        "max_personas": "12",
        "descripcion": "Caminata por el Pasaje Jun\u00edn, Parque Berr\u00edo, Edificio Coltejer, Bas\u00edlica Metropolitana y la Plaza de las Esculturas.",
        "incluye": [
          "Gu\u00eda certificado",
          "Recorrido a pie por el centro",
          "Contexto hist\u00f3rico de la ciudad"
        ],
        "no_incluye": [
          "Entradas a museos",
          "Alimentos"
        ],
        "link_reserva": "https://www.medellin.travel",
        "featured": false
      },
      {
        "nombre": "Senderos guiados Parque Arv\u00ed",
        "precio": "Desde $20.000 COP",
        "precio_sub": "por persona (no incluye el Metrocable)",
        "duracion": "3 horas",
        "tipo_tour": "Grupal",
        "idioma": "Espa\u00f1ol",
        "max_personas": "15",
        "descripcion": "Caminata guiada por los bosques de niebla y el antiguo Camino Cieza de Le\u00f3n, con avistamiento de aves.",
        "incluye": [
          "Gu\u00eda ambiental",
          "Sendero interpretativo",
          "Seguro de accidentes"
        ],
        "no_incluye": [
          "Metrocable L\u00ednea L ($13.500 COP por trayecto)",
          "Alimentos"
        ],
        "link_reserva": "https://www.parquearvi.org",
        "featured": false
      },
      {
        "nombre": "Visita a Fincas Silleteras de Santa Elena",
        "precio": "$25.000 COP",
        "precio_sub": "por persona (con reserva previa)",
        "duracion": "2 horas",
        "tipo_tour": "Grupal",
        "idioma": "Espa\u00f1ol",
        "max_personas": "12",
        "descripcion": "Recorrido por los cultivos de m\u00e1s de 80 especies de flores y taller de armado de silleta con una familia silletera.",
        "incluye": [
          "Gu\u00eda campesino",
          "Recorrido por los cultivos",
          "Demostraci\u00f3n de armado de silleta"
        ],
        "no_incluye": [
          "Transporte a Santa Elena",
          "Flores para llevar"
        ],
        "link_reserva": "https://www.santaelena.com.co",
        "featured": false
      },
      {
        "nombre": "Comuna 13 privado con gu\u00eda local",
        "precio": "$60.000 COP",
        "precio_sub": "por persona",
        "duracion": "3 horas",
        "tipo_tour": "Privado",
        "idioma": "Espa\u00f1ol e Ingl\u00e9s",
        "max_personas": "6",
        "descripcion": "Versi\u00f3n privada del recorrido por San Javier: escaleras el\u00e9ctricas, murales y conversaci\u00f3n con l\u00edderes del barrio.",
        "incluye": [
          "Gu\u00eda local privado",
          "Ritmo personalizado",
          "Paradas fotogr\u00e1ficas"
        ],
        "no_incluye": [
          "Transporte",
          "Consumos personales"
        ],
        "link_reserva": "https://www.medellin.travel",
        "featured": false
      }
    ],
    "equipamiento": [
      {
        "item": "Calzado c\u00f3modo para caminatas urbanas",
        "prioridad": "Obligatorio"
      },
      {
        "item": "Sombrilla peque\u00f1a o impermeable ligero (lluvias de abril-mayo y octubre-noviembre)",
        "prioridad": "Obligatorio"
      },
      {
        "item": "Protecci\u00f3n solar: gorra y bloqueador",
        "prioridad": "Recomendado"
      },
      {
        "item": "Tarjeta C\u00edvica para Metro, Metrocable y Tranv\u00eda",
        "prioridad": "Recomendado"
      },
      {
        "item": "Chaqueta ligera para Arv\u00ed y Santa Elena (12-18 C)",
        "prioridad": "Recomendado"
      },
      {
        "item": "Botella de agua reutilizable",
        "prioridad": "Recomendado"
      },
      {
        "item": "Efectivo en pesos para mercados y propinas",
        "prioridad": "Opcional"
      }
    ],
    "itinerario": [
      {
        "dia": "D\u00eda 1",
        "hora": "09:00 AM",
        "titulo": "Plaza Botero",
        "icono": "\ud83c\udfdb",
        "detalle": "Las 23 esculturas de bronce de Fernando Botero a cielo abierto, en el coraz\u00f3n del centro.",
        "tags": [
          "Arte",
          "Centro"
        ]
      },
      {
        "dia": "D\u00eda 1",
        "hora": "10:30 AM",
        "titulo": "Museo de Antioquia",
        "icono": "\ud83d\uddbc",
        "detalle": "Sala Botero y m\u00e1s de 5.000 piezas en el antiguo Palacio Municipal, frente a la plaza.",
        "tags": [
          "Museos",
          "Historia"
        ]
      },
      {
        "dia": "D\u00eda 1",
        "hora": "12:30 PM",
        "titulo": "Almuerzo en la Plaza de Mercado de Fl\u00f3rez",
        "icono": "\ud83c\udf72",
        "detalle": "Mercado fundado en 1891: fondas de cocina t\u00edpica y flores frescas desde $15.000 COP.",
        "tags": [
          "Gastronom\u00eda",
          "Mercado"
        ]
      },
      {
        "dia": "D\u00eda 1",
        "hora": "02:30 PM",
        "titulo": "Parque de las Luces (Plaza Cisneros)",
        "icono": "\ud83d\udca1",
        "detalle": "300 torres de luz de hasta 24 metros que transformaron el centro administrativo.",
        "tags": [
          "Urbano",
          "Foto"
        ]
      },
      {
        "dia": "D\u00eda 1",
        "hora": "04:30 PM",
        "titulo": "La Candelaria y Pasaje Jun\u00edn",
        "icono": "\ud83c\udfdb",
        "detalle": "Bas\u00edlica Metropolitana, Iglesia de la Candelaria y el Edificio Coltejer.",
        "tags": [
          "Historia",
          "Centro"
        ]
      },
      {
        "dia": "D\u00eda 2",
        "hora": "09:00 AM",
        "titulo": "Jard\u00edn Bot\u00e1nico y Orquideorama",
        "icono": "\ud83c\udf3f",
        "detalle": "14 hect\u00e1reas, m\u00e1s de 1.000 especies vegetales y el Orquideorama. Martes a domingo.",
        "tags": [
          "Naturaleza",
          "Gratis"
        ]
      },
      {
        "dia": "D\u00eda 2",
        "hora": "11:00 AM",
        "titulo": "Parque Explora y Acuario",
        "icono": "\ud83d\udc20",
        "detalle": "M\u00e1s de 300 experiencias interactivas y el acuario de agua dulce m\u00e1s grande de Sudam\u00e9rica.",
        "tags": [
          "Ciencia",
          "Familia"
        ]
      },
      {
        "dia": "D\u00eda 2",
        "hora": "02:00 PM",
        "titulo": "Metrocable L\u00ednea L",
        "icono": "\ud83d\udea0",
        "detalle": "Ascenso en telef\u00e9rico desde Santo Domingo hasta el Parque Arv\u00ed ($13.500 COP por trayecto).",
        "tags": [
          "Transporte",
          "Paisaje"
        ]
      },
      {
        "dia": "D\u00eda 2",
        "hora": "03:30 PM",
        "titulo": "Senderos del Parque Arv\u00ed",
        "icono": "\ud83c\udf32",
        "detalle": "Bosques de niebla, avistamiento de aves y el antiguo Camino Cieza de Le\u00f3n.",
        "tags": [
          "Eco",
          "Caminata"
        ]
      },
      {
        "dia": "D\u00eda 3",
        "hora": "09:00 AM",
        "titulo": "Graffitour Comuna 13",
        "icono": "\ud83c\udfa8",
        "detalle": "Escaleras el\u00e9ctricas al aire libre, murales y escuelas de hip-hop en San Javier.",
        "tags": [
          "Arte Urbano",
          "Comunidad"
        ]
      },
      {
        "dia": "D\u00eda 3",
        "hora": "12:30 PM",
        "titulo": "Almuerzo comunitario en San Javier",
        "icono": "\ud83c\udf7d",
        "detalle": "Cocina de barrio atendida por emprendimientos locales del circuito tur\u00edstico.",
        "tags": [
          "Gastronom\u00eda",
          "Comunidad"
        ]
      },
      {
        "dia": "D\u00eda 3",
        "hora": "02:30 PM",
        "titulo": "Pueblito Paisa y Cerro Nutibara",
        "icono": "\ud83c\udfd4",
        "detalle": "R\u00e9plica del pueblo antioque\u00f1o y mirador 360 sobre el Valle de Aburr\u00e1.",
        "tags": [
          "Mirador",
          "Tradici\u00f3n"
        ]
      },
      {
        "dia": "D\u00eda 3",
        "hora": "05:00 PM",
        "titulo": "Provenza (El Poblado)",
        "icono": "\ud83c\udf2e",
        "detalle": "Cena y vida nocturna en el corredor gastron\u00f3mico de El Poblado.",
        "tags": [
          "Noche",
          "Gastronom\u00eda"
        ]
      }
    ],
    "dificultad_tags": [
      {
        "texto": "Ciudad accesible a pie en el centro y con sistema Metro",
        "apto": true
      },
      {
        "texto": "Apto para familias y personas de todas las edades",
        "apto": true
      },
      {
        "texto": "Recorridos inclinados en laderas (Comuna 13, Arv\u00ed)",
        "apto": false
      },
      {
        "texto": "Lluvias frecuentes en abril-mayo y octubre-noviembre",
        "apto": false
      },
      {
        "texto": "Traslados largos entre cerros y centro en hora pico",
        "apto": false
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
      "Nov": "ideal",
      "Dic": "ideal"
    }
  },
  "FAQS": [
    {
      "pregunta": "\u00bfCu\u00e1l es la mejor \u00e9poca para visitar Medell\u00edn?",
      "respuesta": "Todo el a\u00f1o por su clima constante de 22 C. Destacan agosto, con la Feria de las Flores, y diciembre, con los alumbrados navide\u00f1os."
    },
    {
      "pregunta": "\u00bfC\u00f3mo movilizarse de forma econ\u00f3mica en la ciudad?",
      "respuesta": "Con el Sistema Integrado Metro (tren, Metrocable, Tranv\u00eda y buses Metropl\u00fas) usando la tarjeta C\u00edvica, que tambi\u00e9n acepta tarjeta bancaria habilitada."
    },
    {
      "pregunta": "\u00bfEs seguro visitar la Comuna 13?",
      "respuesta": "S\u00ed. Es uno de los puntos tur\u00edsticos m\u00e1s visitados de la ciudad; conviene recorrerlo con gu\u00edas locales y dentro de los circuitos comunitarios."
    },
    {
      "pregunta": "\u00bfA qu\u00e9 distancia est\u00e1 el Aeropuerto Internacional Jos\u00e9 Mar\u00eda C\u00f3rdova?",
      "respuesta": "Est\u00e1 en Rionegro, a unos 35-45 minutos en taxi o bus intermunicipal a trav\u00e9s del T\u00fanel de Oriente."
    },
    {
      "pregunta": "\u00bfQu\u00e9 plato t\u00edpico no se puede dejar de probar?",
      "respuesta": "La bandeja paisa y la arepa de choclo con queso; en la Plaza de Mercado de Fl\u00f3rez se consiguen platos t\u00edpicos desde $15.000 COP."
    }
  ],
  "FOTOS_SUGERIDAS": [],
  "FUENTES": [
    {
      "tipo": "oficial",
      "url": "https://www.medellin.gov.co",
      "que_respalda": "Datos institucionales, tel\u00e9fono y sitio oficial"
    },
    {
      "tipo": "oficial",
      "url": "https://www.medellin.travel",
      "que_respalda": "Informaci\u00f3n tur\u00edstica, atracciones e itinerarios"
    },
    {
      "tipo": "maps",
      "url": "https://maps.google.com/?q=Medellin+Colombia",
      "que_respalda": "Coordenadas geogr\u00e1ficas y ubicaci\u00f3n"
    },
    {
      "tipo": "prensa",
      "url": "https://www.elcolombiano.com",
      "que_respalda": "Datos de poblaci\u00f3n y transformaci\u00f3n urbana"
    }
  ]
}
```
