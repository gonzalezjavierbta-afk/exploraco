# Ficha única Monserrate — fuente de datos para Monserrate2.html y Monserrate3.html

> Un solo conjunto de datos, validado contra `admin.html` (IDs del form) y `api/pagina-destino.js` (llaves que lee el motor `buildHTML()`). Monserrate2.html usa solo las secciones que renderiza el motor desde estos campos; Monserrate3.html las usa más las secciones premium del template.

## 1. Campos generales del form (admin.html, bloque genérico)

| ID del form | Valor Monserrate |
|---|---|
| `f-name` | Monserrate |
| `f-cat` | sitio |
| `f-slug` | monserrate |
| `f-emoji` | ⛪ |
| `f-city` | Bogotá |
| `f-region` | Cundinamarca |
| `f-barrio` | La Candelaria |
| `f-address` | Carrera 2 Este # 21-48, La Candelaria, Bogotá |
| `f-price` | Desde $21.000 |
| `f-rating` | 4.9 |
| `f-reviews` | 4820 |
| `f-horario` | Lun–Sáb 6:30 am–10:00 pm · Dom 5:30 am–5:00 pm · Festivos 6:30 am–5:00 pm |
| `f-tipo` | Religioso · Mirador · Naturaleza |
| `f-lead` | Sube a 3.152 m sobre Bogotá y visita la Basílica del Señor Caído de Monserrate, un cerro sagrado con más de tres siglos de historia, miradores de 360° y un sendero entre niebla y frailejones. |
| `f-desc` | El cerro de Monserrate es el emblema de Bogotá: un peñón de 3.152 m que corona los cerros orientales y guarda al Señor Caído desde 1657. La basílica neogótica (1925), el funicular (1929) y el teleférico (1955) lo convirtieron en el sitio religioso y mirador más visitado de la ciudad. |
| `f-photo-hero` | https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/2019_Bogot%C3%A1_-_Iglesia_de_Monserrate.jpg/1200px-2019_Bogot%C3%A1_-_Iglesia_de_Monserrate.jpg |
| `f-hero-bg` | #1a103d |
| `f-lat` | 4.605833 |
| `f-lng` | -74.056389 |
| `f-whatsapp` | (vacío — no fabricar número; el contacto se hace por web/redes) |
| `f-email` | (vacío — no fabricar correo) |
| `f-web` | https://monserrate.co |
| `f-instagram` | @cerrode.monserrate |

> Nota: `f-rating` se muestra crudo en el hero (`rat.toFixed(1)`); el JSON-LD usa `bestRating 5`. Con 4.9 el schema queda válido (4.9/5).

## 2. Campos específicos de sitio (bloque `especifico-sitio`)

| ID del form | Valor Monserrate |
|---|---|
| `f-tipo-actividad` | Religioso |
| `f-dificultad` | Moderado |
| `f-dificultad-desc` | El sendero peatonal sube 2,4 km con pendientes fuertes (600 m de desnivel). El funicular y el teleférico son aptos para todos. La altura (3.152 m) puede causar fatiga y falta de aire. |
| `f-duracion` | ½ día (3–5 h) |
| `f-altitud` | 3152 |
| `f-entrada-precio` | Funicular/teleférico L–S $32.000 · Dom $19.000 · Adulto mayor $27.000/$15.000 · Fast pass $87.500 · Grupos 20+ $27.000 · Deportista (5:30–9:00 am) $10.500 · Mascotas $11.500 · Sendero Paramuno $77.000 / residente $34.500 |
| `f-distancia-sitio` | 3,7 km del centro de Bogotá · ~1 h 15 caminando desde La Candelaria |
| `f-como-llegar-sitio` | En funicular o teleférico desde la estación Quinta de Bolívar. A pie por el Sendero Paramuno (2,3 km) saliendo desde la portería del cerro. TransMilenio: estación Las Aguas (línea K) y 15 min caminando. No hay parqueadero para visitantes en la cima. |
| `f-permisos-sitio` | No se requiere reserva para funicular/teleférico (taquilla o venta en línea). El Sendero Paramuno exige reserva previa y pago de tarifa. La cima puede cerrar por tormenta eléctrica. |

### `entradas` (entradas-list-admin, `{tipo, precio, incluye, link}`)

Tarifas 2025 (fuente: monserrate.co/es/horarios-y-tarifas, bogota.gov.co, Caracol Radio abr-2025).

| tipo | precio | incluye | link |
|---|---|---|---|
| Ida y regreso (L–S y festivos) | 32000 | Funicular o teleférico, ida y vuelta | https://monserrate.co/es/horarios-y-tarifas/ |
| Ida y regreso (Domingos) | 19000 | Funicular o teleférico, ida y vuelta | https://monserrate.co/es/horarios-y-tarifas/ |
| Un solo trayecto (L–S) | 19000 | Subida o bajada | https://monserrate.co/es/horarios-y-tarifas/ |
| Un solo trayecto (Domingos) | 11000 | Subida o bajada | https://monserrate.co/es/horarios-y-tarifas/ |
| Adulto mayor 62+ (L–S) | 27000 | Ida y regreso con cédula | https://monserrate.co/es/horarios-y-tarifas/ |
| Adulto mayor 62+ (Domingos) | 15000 | Ida y regreso con cédula | https://monserrate.co/es/horarios-y-tarifas/ |
| Fast Pass | 87500 | Acceso prioritario sin fila | https://monserrate.co/es/horarios-y-tarifas/ |
| Grupos adultos (20+) | 27000 | Ida y regreso por persona, reserva previa | https://monserrate.co/es/horarios-y-tarifas/ |
| Grupos colegios (20+) | 19000 | Ida y regreso por estudiante, reserva previa | https://monserrate.co/es/horarios-y-tarifas/ |
| Deportistas (5:30–9:00 L–S) | 10500 | Solo descenso, no festivos, requiere tarjeta | https://monserrate.co/es/horarios-y-tarifas/ |
| Mascotas (L–S) | 11500 | Ida y regreso en guacal, no domingos ni temporadas altas | https://monserrate.co/es/horarios-y-tarifas/ |
| Artículo personal adicional | 7500 | Bulto extra | https://monserrate.co/es/horarios-y-tarifas/ |
| Sendero Paramuno 3h (general) | 77000 | Ingreso + guianza + seguro, requiere reserva | https://monserrate.co/es/horarios-y-tarifas/ |
| Sendero Paramuno 3h (residente) | 34500 | Ingreso + guianza, cédula colombiana | https://monserrate.co/es/horarios-y-tarifas/ |
| Sendero Paramuno extendido 3+ h (general) | 91000 | Ingreso + guianza + seguro, requiere reserva | https://monserrate.co/es/horarios-y-tarifas/ |
| Sendero Paramuno extendido 3+ h (residente) | 49500 | Ingreso + guianza, cédula colombiana | https://monserrate.co/es/horarios-y-tarifas/ |

Nota: admin.html recoge esta fila como `{tipo, precio, nota}` (collectSitioEntradas); el renderer pagina-destino.js:729 lee `e.incluye` para la columna "Incluye". El seed escribe `incluye` para que la página muestre la descripción.

### Matriz de temporada `f-temporada-{mes}` (mes → ideal/posible/evitar)

| Ene | Feb | Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ideal | ideal | ideal | posible | evitar | evitar | evitar | posible | posible | evitar | posible | ideal |

Selector antiguo `f-temporada` (multi): Diciembre-Marzo (seca) · Junio-Agosto (seca) · Diciembre (alta turistica)

| `f-temporada-nota` | Enero–marzo y diciembre son los mejores meses: cielo despejado y visibilidad hasta 40 km. En temporada de lluvias la niebla puede tapar la vista en la cima. |

### `dificultad_tags` (dificultad-tags-admin, `{texto, apto}`)

- Aptos funicular y teleférico · apto
- Apto para niños · apto
- Apto silla de ruedas (teleférico) · apto
- Sendero exige buen estado físico · no apto
- La altura afecta a personas sensibles · no apto

### `checklist` (checklist-admin, `{item, prioridad}`)

| item | prioridad |
|---|---|
| Zapatos cómodos con buen agarre | Obligatorio |
| Agua (mínimo 1 L) | Obligatorio |
| Identificación (para tarifa de adulto mayor) | Recomendado |
| Efectivo para taquilla y restaurantes | Recomendado |
| Capa impermeable | Recomendado |
| Protector solar y gorra | Recomendado |
| Cámara o celular cargado | Opcional |

### `entradas` (entradas-list-admin; llaves que lee el motor: `tipo, precio, incluye, link`)

| tipo | precio | incluye | link |
|---|---|---|---|
| Funicular / Teleférico (lun–sáb) | $35.000 | Ida y vuelta | https://monserrate.co |
| Funicular / Teleférico (domingos) | $21.000 | Ida y vuelta | https://monserrate.co |
| Adulto mayor | $29.500 | Ida y vuelta | https://monserrate.co |
| Fast pass | $96.500 | Prioridad de abordaje | https://monserrate.co |
| Grupos (20+ personas) | $29.500 | Por persona | https://monserrate.co |
| Deportista (5:30–9:00 am) | $10.500–$11.500 | Funicular/teleférico ida | https://monserrate.co |
| Sendero Paramuno (3 h) | $77.000 | Entrada + guía + seguro | https://monserrate.co |
| Sendero Paramuno residentes (3 h) | $34.500 | Entrada + guía | https://monserrate.co |
| Sendero Paramuno extendido (3+ h) | $91.000 | Entrada + guía + seguro | https://monserrate.co |
| Sendero Paramuno extendido residentes | $49.500 | Entrada + guía | https://monserrate.co |

> Nota de paridad: el form guarda `nota`; el motor lee `incluye` y `link`. En las páginas estáticas se usan las llaves del motor (`incluye`/`link`).

### `tours` (tour-list-admin, `{nombre, precio, duracion, tipo_tour, idioma, max_personas, descripcion, incluye, link_reserva}`)

1. **Ascenso por el Sendero Paramuno**
   - precio: $77.000 · duracion: 3 horas · tipo_tour: Grupal · idioma: Español / Inglés · max_personas: Máx 25
   - descripcion: Caminata guiada por el sendero ancestral entre niebla y frailejones hasta la cima a 3.152 m.
   - incluye: Guía, seguro, entrada, hidratación · link_reserva: https://monserrate.co
2. **Tour privado del cerro sagrado**
   - precio: $91.000 · duracion: 3+ horas · tipo_tour: Privado · idioma: Español / Inglés · max_personas: Máx 10
   - descripcion: Recorrido privado con la historia muisca, la hermita de 1657 y la basílica de 1925.
   - incluye: Guía privado, entrada, acceso prioritario · link_reserva: https://monserrate.co

### `itinerario` (itinerario-list-admin, `{dia, hora, titulo, icono, detalle, tags[]}`)

| dia | hora | titulo | icono | detalle | tags |
|---|---|---|---|---|---|
| Día 1 | 6:30 am | Partida desde la estación baja | ⛪ | Abordar el funicular o el teleférico en la estación Quinta de Bolívar, o empezar a pie por el sendero. | Estación Quinta de Bolívar, Funicular 1929 |
| Día 1 | 7:30 am | Llegada a la cima (3.152 m) | ⛰️ | Café y desayuno en las plazoletas con la primera vista de Bogotá desde la terraza oriental. | Mirador 360°, Altitud 3.152 m |
| Día 1 | 9:00 am | Basílica del Señor Caído | ⛪ | Visita al santuario neogótico (1925) y al altar del Señor Caído de Pedro de Lugo Albarracín. | Neogótico, Siglo XVII |
| Día 1 | 11:00 am | Almuerzo en la cima | 🍽️ | Casa San Isidro o Santa Clara, con vista a la Sabana de Bogotá. | Casa San Isidro, Santa Clara |
| Día 1 | 2:00 pm | Descenso | 🚡 | Bajar en teleférico para atardecer en la ciudad, o seguir por el sendero de los frailejones. | Teleférico 1955, Frailejones |

### `fauna_flora` (fauna-flora-admin; el motor acepta JSON `[{emoji,nombre,hecho}]` o texto con comas)

- `{"emoji":"🐦","nombre":"Colibríes","hecho":"18 especies en el cerro"}` · `{"emoji":"🌿","nombre":"Chamicero cundiboyacense","hecho":"Ave endémica de los Andes orientales"}` · `{"emoji":"🌼","nombre":"Frailejón","hecho":"Planta emblemática del páramo (Espeletia)"}` · `{"emoji":"🌲","nombre":"Flora de altura","hecho":"~494 especies vegetales censadas"}` · `{"emoji":"🦋","nombre":"Aves","hecho":"~119 especies registradas"}`

### `secretos` (secretos-admin, JSON `[{icono, titulo, texto, tag, tag_color}]`)

- `{"icono":"⛪","titulo":"El Señor Caído de 1657","texto":"La imagen fue tallada por Pedro de Lugo Albarracín en 1657; la hermita original es de ese mismo año.","tag":"Historia","tag_color":"gold"}`
- `{"icono":"🌇","titulo":"Casa San Isidro","texto":"Casona tradicional con gastronomía europea y la mejor mesa con vista a la ciudad.","tag":"Comer","tag_color":"green"}`
- `{"icono":"🌄","titulo":"Llega a las 5:30 am","texto":"Domingos abren más temprano: alcanza el amanecer sobre los cerros orientales casi vacíos.","tag":"Tip","tag_color":"blue"}`
- `{"icono":"📷","titulo":"Foto icónica","texto":"La escalinata de la basílica al atardecer es el encuadre más fotografiado del cerro.","tag":"Tip","tag_color":"red"}`

### `regulaciones` (regulaciones-admin, texto)

Cupo máximo en la cima. No se permite el ingreso de mascotas. Vestimenta respetuosa dentro de la basílica. No botar basura ni salir de los senderos. Horarios de cierre de atracciones por condición climática. Ascenso a pie únicamente por el Sendero Paramuno.

## 3. Coordenadas verificadas (fuente: Wikipedia/Wikidata)

- Cima / santuario: 4.605833, -74.056389 (O: -74.056389). Altitud 3.152 m.
- Basílica (cima): 4.605182, -74.055437.
- Estación baja (Quinta de Bolívar): aprox. 4.6060, -74.0660 (La Candelaria).

## 4. Imágenes (Wikimedia Commons, dominadas `upload.wikimedia.org/wikipedia/commons/thumb/...`)

- Hero + OG: `e/e3/2019_Bogotá_-_Iglesia_de_Monserrate.jpg`
- `7/78/Monserrate Bogota.jpg` — vista del cerro
- `e/e8/Telefónico a Monserrate - panoramio.jpg` — teleférico
- `b/b0/Monserrate Bogota - panoramio (1).jpg` — ciudad desde la cima
- `5/5a/Estacion telefónico Monserrate Bogota - panoramio.jpg` — estación
- Funicular: `Funicular de Monserrate 01.jpg` (archivo en Commons)
- Thumbs: `<ruta>/1200px-<archivo>` para hero, `800px-` para galería, `500px-` para cards.

## 5. Alcance de secciones por página

- **Monserrate2.html** (solo campos del form → motor): Hero (lead/desc/rating), Info rápida, Datos del sitio (matriz de 12 meses), Dificultad (+tags), Entradas, Tours, Qué llevar, Itinerario (tabs), Fauna y flora, Secretos (tip-cards), Regulaciones, Galería, Mapa (Leaflet), Reseñas, Contacto, Comparador. Todo con estructura de `buildHTML()` de `api/pagina-destino.js`.
- **Monserrate3.html** (versión ideal): lo anterior + secciones premium del template `ciudad-perdida.html` (época ideal por mes con puntuación, quién va este mes, tabla comparar vs otros cerros, tips grandes, lightbox de galería, save-fab, badges, scrollspy, navbar sticky completa, footer).
