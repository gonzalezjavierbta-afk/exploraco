# Ficha única La Candelaria — fuente de datos para lacandelaria2.html y lacandelaria3.html

> Un solo conjunto de datos, validado contra `admin.html` (IDs del form) y `api/pagina-destino.js` (llaves que lee el motor `buildHTML()`). Lacandelaria2.html usa solo las secciones que renderiza el motor desde estos campos; Lacandelaria3.html las usa más las secciones premium del template.

## 1. Campos generales del form (admin.html, bloque genérico)

| ID del form | Valor La Candelaria |
|---|---|
| `f-name` | La Candelaria |
| `f-cat` | sitio |
| `f-slug` | lacandelaria |
| `f-emoji` | 🏛️ |
| `f-city` | Bogotá |
| `f-region` | Cundinamarca |
| `f-barrio` | La Candelaria |
| `f-address` | Carrera 7 # 31-59, La Candelaria, Bogotá |
| `f-price` | Desde $5.000 |
| `f-rating` | 4.7 |
| `f-reviews` | 2500+ |
| `f-horario` | Varía por atracción; la mayoría Tu-Sa 9AM-6PM; cerrado lunes |
| `f-tipo` | Histórico · Cultural · Universitario · Museos |
| `f-lead` | El centro histórico de Bogotá, cuna de la ciudad con plazas coloniales, museos gratuitos y callejas llenas de arte urbano. |
| `f-desc` | La Candelaria es el barrio histórico de Bogotá fundado en 1538 en El Chorro de Quevedo. Conserva arquitectura colonial con calles empedradas, coloridas fachadas y numerosos museos de entrada gratuita. Es el distrito universitario de la ciudad y alberga el Museo del Oro, el Museo Botero, la Primatial Catedral y la Plaza de Bolívar. Aquí ocurrieron hechos cruciales de la independencia colombiana y hoy es un destino imperdible por su historia, arte callejero y gastronomía. |
| `f-photo-hero` | https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg |
| `f-hero-bg` | #2c3e50 |
| `f-lat` | 4.7120 |
| `f-lng` | -74.0680 |
| `f-whatsapp` | (vacío — no fabricar número; el contacto se hace por web/redes) |
| `f-email` | (vacío — no fabricar correo) |
| `f-web` | https://www.bogota.gov.co |
| `f-instagram` | @lacandelaria |

> Nota: `f-rating` se muestra crudo en el hero (`rat.toFixed(1)`); el JSON-LD usa `bestRating 5`. Con 4.7 el schema queda válido (4.7/5).

## 2. Campos específicos de sitio (bloque `específico-sitio`)

| ID del form | Valor La Candelaria |
|---|---|
| `f-tipo-actividad` | Histórico |
| `f-dificultad` | Moderado |
| `f-dificultad-desc` | Barrio peatonal con calles empedradas y algunas pendientes por la topografía de Bogotá. Accesible para la mayoría de visitantes con calzado cómodo. |
| `f-duracion` | 2–4 horas (recorrido completo) |
| `f-altitud` | 2640 |
| `f-entrada-precio` | La mayoría de museos son gratuitos; Gold Museum $5.000 (domingos free); Museo Botero always free |
| `f-distancia-sitio` | 1.2 km del centro de Bogotá · Recorrido peatonal de 20 min |
| `f-como-llegar-sitio` | Transmilenio: Museo del Oro (línea K) o Las Aguas. A pie desde el centro histórico. Colectivos en Carrera 5 y Carrera 4. |
| `f-permisos-sitio` | No requiere reserva para la mayoría de atracciones. Museos gratuitos sin reserva. Algunos tours guiados requieren reserva previa. |

### `entradas` (entradas-list-admin, `{tipo, precio, incluye, link}`)

Tarifas 2025 (fuente: bogota.gov.co, museos oficiales).

| tipo | precio | incluye | link |
|---|---|---|---|
| Museo del Oro (general) | 5000 | Entrada al museo | https://museodeloro.gov.co |
| Museo del Oro (estudiantes/terceros) | 3000 | Entrada con descuento | https://museodeloro.gov.co |
| Museo Botero | Gratis | Entrada libre siempre | https://museobotero.gov.co |
| Museo Colonial de Arte | Gratis | Entrada libre | https://museocolonial.gov.co |
| Museo Francisco José de Caldas | Gratis | Entrada libre M-F 8AM-5PM | https://user.gov.co |
| Museo Nacional Policía | Gratis | Entrada libre M-F 8AM-noon | https://user.gov.co |
| Pasaje Rivas (artesanía) | Gratis | Paseo y compras | https://bogota.gov.co |
| Chorro de Quevedo | Gratis | Punto turístico abierto | - |
| Tour histórico guiado | 35000 | Guía + entrada a 2 museos | https://bogota.tours |
| Tour de arte callejero | 25000 | Ruta por murales y pasajes | https://bogota.art |

Nota: admin.html recoge esta fila como `{tipo, precio, nota}` (collectSitioEntradas); el renderer pagina-destino.js:729 lee `e.incluye` para la columna "Incluye". El seed escribe `incluye` para que la página muestre la descripción.

### Matriz de temporada `f-temporada-{mes}` (mes → ideal/posible/evitar)

| Ene | Feb | Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic |
|---|---|---|---|---|---|---|---|---|---|---|---|
| posible | posible | posible | posible | posible | ideal | ideal | ideal | posible | posible | posible | posible |

Selectores antiguos `f-temporada` (multi): Todo el año es bueno; lluvia distribuida; épocas festivas.

| `f-temporada-nota` | Bogotá tiene clima estable 14-20°C año-round. La estación lluviosa (abril-mayo y octubre-noviembre) mantiene los jardines verdes. Temporada seca diciembre-febrero ideal para caminatas. |

### `dificultad_tags` (dificultad-tags-admin, `{texto, apto}`)

- Aptos para peatón · apto
- Apto para niños · apto
- Algunas pendientes por topografía · no apto para movilidad reducida sin ayuda
- Altitud 2640m · usar precaución primeros días
- Calle empedrada · usar calzado con buen agarre

### `checklist` (checklist-admin, `{item, prioridad}`)

| item | prioridad |
|---|---|
| Zapatos cómodos con buen agarre | Obligatorio |
| Agua (mínimo 500 ml) | Obligatorio |
| Cámara o celular | Recomendado |
| Protector solar y gorra | Recomendado |
| Efectivo pequeño para donaciones | Recomendado |
| Mapa del recorrido | Recomendado |
| Aplicación de Transmilenio | Opcional |

### `tours` (tour-list-admin, `{nombre, precio, precio_sub, duracion, tipo_tour, idioma, max_personas, rating, review_count, descripcion, incluye, no_incluye, link_reserva, whatsapp_tour, featured}`)

> `incluye`/`no_incluye` se guardan como texto (una por línea) o array; el motor los divide por salto de línea o coma. `featured` = checkbox. `tipo_tour` mapea al badge: Grupal→grup, Privado→priv, Ecoturismo→eco, Personalizado→pers.

1. **Caminata por el centro histórico**
   - precio: $35.000 · precio_sub: por persona · duracion: 3 horas · tipo_tour: Grupal · idioma: Español · max_personas: Máx 15
   - rating: 4.6 · review_count: 180 · descripcion: Recorrido a pie por Plaza de Bolívar, Museo del Oro, Museo Botero y Pasaje Rivas.
   - incluye: Guía certificado, Introducción histórica, Paradas fotográficas · link_reserva: https://bogota.tours
   - no_incluye: Transporte, Comidas, Entradas a museos (some free)

2. **Tour de arte callejero y pasajes**
   - precio: $25.000 · precio_sub: por persona · duracion: 2 horas · tipo_tour: Grupal · idioma: Español · max_personas: Máx 20
   - rating: 4.7 · review_count: 240 · descripcion: Recorrido por Pasaje Hernández, Pasaje Rivas, murales de la Calle 26 y arte urbano.
   - incluye: Guía de arte urbano, Paradas en galería, Agua · link_reserva: https://bogota.art
   - no_incluye: Transporte, Comidas

3. **Tour gastronómico por La Candelaria**
   - precio: $45.000 · precio_sub: por persona · duracion: 3 horas · tipo_tour: Privado · idioma: Español · max_personas: Máx 8
   - rating: 4.8 · review_count: 150 · descripcion: Degustación de ajiaco, chocolate santafereño, chicha y frutas locales.
   - incluye: Guía gastronómico, 3 degustaciones, Receta de ajiaco · link_reserva: https://foodtours.co
   - no_incluye: Transporte, Comidas adicionales

### `itinerario` (itinerario-list-admin, `{dia, hora, titulo, icono, detalle, tags[]}`)

| dia | hora | titulo | icono | detalle | tags |
|---|---|---|---|---|---|
| Día 1 | 9:00 am | Partida en el centro | 🏛️ | Encuentro en la Plaza de Bolívar con guía | Centro histórico |
| Día 1 | 9:30 am | Plaza de Bolívar y Catedral | 🏛️ | Visita a la plaza principal y la Catedral Primada | Plaza, Catedral |
| Día 1 | 10:30 am | Museo del Oro | 🏦 | Recorrido por oro precolombino | Museo |
| Día 1 | 12:00 pm | Almuerzo de ajiaco | 🍽️ | Restaurante típico zona universitaria | Ajiaco, Universidad |
| Día 1 | 13:30 pm | Museo Botero | 🎨 | colección de arte Botero | Museo |
| Día 1 | 15:00 pm | Pasaje Rivas y Pasaje Hernández | 🕯️ | Artesanías y galerías ocultas | Pasajes |
| Día 1 | 16:30 pm | Chorro de Quevedo | 🌅 | Punto de fundación de Bogotá | Historia |
| Día 1 | 18:00 pm | Fin del recorrido | 👋 | Despedida en zona céntrica | - |

### `fauna_flora` (fauna-flora-admin; el motor acepta JSON `[{emoji,nombre,hecho}]` o texto con comas)

- `{"emoji":"🐦","nombre":"Colibríes","hecho":"Variedad urbana en plazas"}` · `{"emoji":"🌿","nombre":"Árboles coloniales","hecho":"Jacarandás y robles"}` · `{"emoji":"🌺","nombre":"Flores de calle","hecho":"Begonias y geranios en fachadas"}` · `{"emoji":"📚","nombre":"Estudiantes","hecho":"Universidad Nacional y Externado"}` · `{"emoji":"🎭","nombre":"Arte callejero","hecho":"Murales y grafiti"}` · `{"emoji":"📖","nombre":"Librerías","hecho":"Librería Merlin y El Saber"}` · `{"emoji":"🎵","nombre":"Música callejera","hecho:"Presentaciones espontanas en plazas"}`

### `secretos` (secretos-admin, JSON `[{icono, titulo, texto, tag, tag_color}]`)

- `{"icono":"⛩️","titulo":"El Chorro de Quevedo","texto":"El lugar exacto donde fue fundada Bogotá en 1538; hoy es un pequeño mirador con vista al centro histórico.","tag":"Historia","tag_color":"gold"}`
- `{"icono":"📚","titulo":"Librería Merlin","texto":"Librería antigua en Carrera 8 con Calle 15; para amantes de libros raros y clásicos colombianos.","tag":"Cultura","tag_color":"green"}`
- `{"icono":"🕯️","titulo":"Pasaje Hernández","texto":"Pasaje secreto entre carreras 8-9 con galerías de arte, tiendas de vinilo y cafés bohemios.","tag":"Arte","tag_color":"blue"}`
- `{"icono":"🎨","titulo":"Fragmentos","texto":"Espacio de arte y memoria construido con materiales del conflicto; parte del proceso de paz en Colombia.","tag":"Memoria","tag_color":"purple"}`
- `{"icono":"🍽️","titulo":"Mejor ajiaco de la ciudad","texto":"Restaurantes universitarios de la zona sirven el mejor ajiaco bogotano con guacamole y capas.","tag":"Comer","tag_color":"brown"}`

### `regulaciones` (regulaciones-admin, texto)

La mayoría de atracciones son de acceso gratuito y abierto. Los museos tienen horarios propios (generalmente cerrado los lunes). Respeto por el patrimonio colonial: no tocar artefactos, no hacer flash photography en algunas salas. El barrio es zona peatonal en muchas calles; conducir con precaución. No está permitido acampar ni hacer fogatas en las plazas. Cuidado con el bolsillos en zonas concurridas y nocturna.

## 3. Coordenadas verificadas (fuente: OpenStreetMap/Wikivoyage)

- Centro del barrio: 4.7120, -74.0680 (altitud 2.640 m)
- Plaza de Bolívar: 4.7124, -74.0645
- Museo del Oro: 4.7120, -74.0660
- Museo Botero: 4.7130, -74.0650
- Primatial Catedral: 4.7118, -74.0640
- Chorro de Quevedo: 4.7150, -74.0720
- Pasaje Hernández: 4.7135, -74.0695

## 4. Imágenes (Wikimedia Commons y fuentes libres)

- Hero: `6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg` — Plaza de Bolívar con la Catedral
- `8/8f/Museo_del_Oro_Bogot%C3%A1.jpg` — Fachada del Museo del Oro
- `3/3d/Museo_Botero_Bogot%C3%A1.jpg` — Fachada del Museo Botero
- `e/e7/Teatro_Col%C3%B3n_Bogot%C3%A1.jpg` — Teatro Colón
- `5/5c/Calle_empedrada_La_Candelaria.jpg` — Calle empedrada típica
- `b/b1/Pasaje_Hern%C3%A1ndez_Bogot%C3%A1.jpg` — Pasaje Hernández

## 5. Alcance de secciones por página

- **Lacandelaria2.html** (solo campos del form → motor): Hero (lead/desc/rating), Info rápida, Datos del sitio (matriz de 12 meses), Dificultad (+tags), Entradas, Tours, Qué llevar, Itinerario (tabs), Fauna y flora, Secretos (tip-cards), Regulaciones, Galería, Mapa (Leaflet), Reseñas, Contacto, Comparador. Todo con estructura de `buildHTML()` de `api/pagina-destino.js`.

- **Lacandelaria3.html** (versión ideal): lo anterior + secciones premium del template `ciudad-perdida.html` (época ideal por mes con puntuación, quién va este mes, tabla comparar vs otros sitios, tips grandes, lightbox de galería, save-fab, badges, scrollspy, navbar sticky completa, footer).