# Ficha: La Redada Miscelanea Cultural — Bogotá

Datos para la página dinámica `la-redada-miscelanea-cultural.html`
(categoría `sitio`, subcategoría `cultura`). Elaborada a partir de los datos
crudos entregados por el cliente (Bogotá, La Candelaria). No hay
investigación externa: solo se usan hechos aportados por el cliente más las
dos fuentes reales que él mismo indicó.

Contrato: el bloque JSON FINAL alimenta el seed. El JSON queda en ASCII
seguro (escapes `\uXXXX`), igual que el seed que se deriva de él.

## Decisiones de ingesta (importantes)

- **Sin rating (ADR-009):** se eliminó "4.6/5" del highlight. `TAGS` no
  contiene la clave `rating` y el tour no lleva `rating` ni `review_count`.
  La página nace con 0 reseñas hasta que existan interacciones reales.
- **Sin fotos:** `foto_hero` va vacío y `PHOTOS` nace `[]`. El cliente subirá
  sus fotos reales al final, así que no se resuelven fotos ni se escriben en
  BD. `FOTOS_SUGERIDAS` es solo un brief documental (5 items, 1 `es_hero`).
- **Contacto verificado solo en parte:** `whatsapp`, `telefono` y `web` van
  vacíos porque NO están verificados. No se inventa ningún dato de contacto.
- **Subcategoría `cultura` (ADR-016, decisión del operador):** es un arreglo
  PURO DATO, sin tocar `api/pagina-destino.js`. Con `cultura` el motor
  habilita solo: descripcion, entradas, colecciones, recorridos,
  horarios_zona, accesibilidad, secretos, programacion y contexto. Quedan
  OCULTAS: tours, itinerario, equipamiento/checklist, dificultad/
  temporada_matriz y regulaciones.
- **Remapeo del contenido que el gating ocultaría** (nada se pierde):
  - El tour "Recorrido por la Casona y Tienda Autonoma" y los hitos del
    itinerario con sentido de recorrido por la casona se movieron a
    `recorridos`.
  - La agenda de tarde-noche (04:00 PM patio/café, 05:30 PM tienda autónoma,
    07:00 PM evento cultural) se movió a `programacion`.
  - Las banderas de `dificultad_tags` ("Apto para todo publico" y "Acceso
    peatonal accesible") se movieron a `accesibilidad`.
  - El horario general del espacio se movió a `horarios_zona`.
  - La Tienda Autónoma se describe en `colecciones` (sin precios inventados).
  - La norma de convivencia, el consejo de efectivo/Nequi y la nota de
    programación continua todo el año se recuperaron en `contexto`.
- **Claves exigidas por `validate_ficha.js` para `sitio`:** se conservan
  `tours`, `equipamiento`, `itinerario`, `regulaciones` y `temporada_matriz`
  aunque el gating las deje invisibles (el validador exige la clave). La
  matriz de 12 meses "ideal" se descarta y queda como objeto vacío.
- **Emojis:** los escapes crudos `\u1F3AD` / `\u1F1E6` eran inválidos
  (5 dígitos hex). Todos los emojis van como par surrogate válido
  (p. ej. teatro `\ud83c\udfad`).

## Datos generales

- **Slug:** `la-redada-miscelanea-cultural`
- **Nombre:** La Redada Miscelanea Cultural
- **Categoría:** sitio · **Subcategoría:** cultura
- **Lead:** Un espacio cultural independiente y autogestionado en el centro
  de Bogotá dedicado a la creación artística, el encuentro comunitario y la
  autogestión.
- **Highlight:** Espacio cultural independiente y autogestionado - Centro
  Historico
- **Ciudad / Región / Barrio:** Bogotá / Cundinamarca / La Candelaria
- **Coordenadas:** 4.5975, -74.0752
- **Email:** laredadamiscelanea@gmail.com · **Instagram:**
  @laredadamiscelaneacultural
- **WhatsApp / Teléfono / Web:** vacíos (no verificados)
- **Precio desde:** Entradas desde $0 (aportes voluntarios). Money-safe: un
  solo token numérico para esquivar la concatenación de `money()`. El rango
  de eventos ($10.000 - $30.000) vive en `TAGS.precio_entrada` y en el
  `incluye` de la entrada "Conciertos y Funciones".
- **Horario:** Mié-Sáb 3:00 PM - 11:00 PM
- **Emoji:** 🎭 · **Hero bg:** `linear-gradient(135deg,#1A1A1A 0%,#E8A020 100%)`
- **Tipo:** Centro Cultural - Espacio Comunitario - Música & Arte
- **Capacidad:** 150 personas
- **Cómo llegar:** TransMilenio estación Las Aguas o Museo del Oro, caminar
  hacia la Carrera 5 con Calle 12C en el Centro Histórico.

## Específico sitio (remapeado a las secciones de `cultura`)

- **Descripción:** dos párrafos sobre la casona colonial y la agenda
  (conciertos independientes, teatro, cine, ferias de diseño autogestionado,
  talleres y debates) y sobre economía solidaria (tienda de productos
  independientes, café y talleres de libre creación).
- **Entradas:** 2 items — General / aporte voluntario ("Gratis", incluye
  acceso a la casona, exposiciones y café) y Conciertos y funciones
  (precio money-safe "$10.000"; el rango habitual $10.000 - $30.000 va en el
  texto de `incluye`, no en `precio`, para esquivar la concatenación de
  `money()`).
- **Colecciones:** la Tienda Autónoma (fanzines y editorial independiente,
  vestuario y arte local, gráfica independiente). Sin precios.
- **Recorridos:** "Recorrido por la Casona y Tienda Autonoma" (1 hora) más
  los hitos del recorrido: Patio Central, Tienda Autónoma y Salas de
  Exhibición y Escenario.
- **Programación:** agenda Mié-Sáb de tarde-noche (04:00 PM, 05:30 PM,
  07:00 PM).
- **Horarios por zona:** Programación cultural · Mié-Sab 3:00 PM - 11:00 PM ·
  Abierto.
- **Accesibilidad:** "Apto para todo publico" y "Acceso peatonal accesible".
- **Secretos:** 2 items — El Patio Central (☕) y Tienda Autónoma (🛒).
- **Contexto:** norma de convivencia, efectivo/Nequi en la tienda autónoma y
  aportes a artistas, y programación continua todo el año.
- **Invisibles por gating (contenido conservado):** tours, itinerario,
  equipamiento, regulaciones, temporada_matriz.

## FAQ

1. ¿Dónde queda La Redada Miscelánea Cultural?
2. ¿Cuánto cuesta la entrada?
3. ¿Qué se puede hacer en La Redada?
4. ¿Qué horario tiene?
5. ¿Cómo se paga en la tienda autónoma?

## Imágenes (brief documental, sin resolver)

5 items con nombres de archivo de Wikimedia Commons tal como los entregó el
cliente (el cliente subirá sus fotos reales; no se descargan ni se siembran).

## Fuentes

1. { tipo: oficial, url: https://www.instagram.com/laredadamiscelaneacultural/,
   que_respalda: programación, horarios, eventos y contacto del espacio }
2. { tipo: maps, url: https://maps.google.com, que_respalda: coordenadas
   decimales y barrio (La Candelaria, centro histórico de Bogotá) }

## JSON de entrega (bloque exacto)

```json
{
  "BASE": {
    "slug": "la-redada-miscelanea-cultural",
    "nombre": "La Redada Miscelanea Cultural",
    "categoria_slug": "sitio",
    "lead": "Un espacio cultural independiente y autogestionado en el centro de Bogota dedicado a la creacion artistica, el encuentro comunitario y la autogestion.",
    "descripcion": "La Redada Miscelanea Cultural es un nodo vivo de la cultura independiente en el centro historico de Bogota. Ocupa una casona colonial del barrio La Candelaria y funciona como espacio autogestionado: sus salas se abren para conciertos independientes, teatro, cine, ferias de diseno autogestionado, talleres y debates.\n\nLa programacion convive con una economia solidaria: en la casa funcionan una tienda de productos independientes, un cafe y talleres de libre creacion donde los proyectos locales venden directo al publico. El espacio se sostiene con aportes voluntarios y con la boleteria de los eventos, por eso su agenda es continua de miercoles a sabado.",
    "highlight": "Espacio cultural independiente y autogestionado - Centro Historico",
    "ciudad": "Bogota",
    "region": "Cundinamarca",
    "barrio": "La Candelaria",
    "lat": 4.5975,
    "lng": -74.0752,
    "whatsapp": "",
    "telefono": "",
    "email": "laredadamiscelanea@gmail.com",
    "web": "",
    "instagram": "@laredadamiscelaneacultural",
    "precio_desde": "Entradas desde $0 (aportes voluntarios)",
    "horario": "Mie-Sab 3:00 PM - 11:00 PM",
    "emoji": "\ud83c\udfad",
    "hero_bg": "linear-gradient(135deg,#1A1A1A 0%,#E8A020 100%)",
    "foto_hero": "",
    "tipo": "Centro Cultural - Espacio Comunitario - Musica & Arte",
    "capacidad": "150 personas",
    "como_llegar": "TransMilenio estacion Las Aguas o Museo del Oro, caminar hacia la Carrera 5 con Calle 12C en el Centro Historico.",
    "status": "published",
    "destacado": true
  },
  "TAGS": {
    "subcategoria": "cultura",
    "tipo_actividad": "Centro Cultural y Espacio Comunitario Autogestionado",
    "dificultad": "Facil",
    "dificultad_desc": "Recorrido a pie por una casona colonial; no exige esfuerzo fisico.",
    "duracion": "1-3 horas",
    "precio_entrada": "Entradas desde $0 con aporte voluntario. Conciertos y funciones entre $10.000 y $30.000.",
    "distancia": "Centro Historico de Bogota, barrio La Candelaria",
    "como_llegar": "TransMilenio estacion Las Aguas o Museo del Oro, caminar hacia la Carrera 5 con Calle 12C en el Centro Historico.",
    "permisos": "Ingreso libre a la casona, el cafe y la tienda autonoma; los eventos se pagan en taquilla o con aporte voluntario.",
    "temporada_nota": "Programacion continua durante todo el ano, con agenda de miercoles a sabado en la tarde y la noche.",
    "regulaciones": "Espacio libre de discriminacion. Prohibido el ingreso de bebidas alcoholicas externas.",
    "secretos": [
      {
        "icono": "\u2615",
        "titulo": "El Patio Central",
        "texto": "El patio interior de la casona colonial es el corazon del espacio: alli esta el cafe de la casa y suelen montarse las ferias de diseno autogestionado y los encuentros de la comunidad.",
        "tag": "Imperdible",
        "tag_color": "gold"
      },
      {
        "icono": "\ud83d\uded2",
        "titulo": "Tienda Autonoma",
        "texto": "En la tienda los proyectos independientes venden directo al publico fanzines, ilustracion, vestuario y productos de economia solidaria, sin intermediarios.",
        "tag": "Economia solidaria",
        "tag_color": "green"
      }
    ],
    "contexto": "Espacio libre de discriminacion. Prohibido el ingreso de bebidas alcoholicas externas.\n\nLleva efectivo o Nequi: en la tienda autonoma los proyectos independientes venden directo y los aportes a los artistas se reciben de forma voluntaria.\n\nLa programacion es continua durante todo el ano: la agenda de conciertos, teatro, cine-foro, ferias y talleres se publica mes a mes en el Instagram de La Redada.",
    "entradas": [
      {
        "tipo": "Entrada General",
        "precio": "Gratis",
        "incluye": "Acceso a la casona, exposiciones y cafe",
        "link": "https://www.instagram.com/laredadamiscelaneacultural/"
      },
      {
        "tipo": "Conciertos y Funciones",
        "precio": "$10.000",
        "incluye": "Ingreso a evento privado de la agenda cultural (rango habitual $10.000 - $30.000)",
        "link": "https://www.instagram.com/laredadamiscelaneacultural/"
      }
    ],
    "colecciones": [
      {
        "nombre": "Fanzines y editorial independiente",
        "descripcion": "Publicaciones, fanzines y libros de proyectos editoriales independientes que se venden directo en la tienda autonoma."
      },
      {
        "nombre": "Vestuario y arte local",
        "descripcion": "Prendas, accesorios y obra de artistas y disenadores locales que producen de forma autogestionada."
      },
      {
        "nombre": "Grafica independiente",
        "descripcion": "Afiches, serigrafia e ilustracion de la escena grafica independiente de Bogota."
      }
    ],
    "recorridos": [
      {
        "icono": "\ud83c\udfe0",
        "nombre": "Recorrido por la Casona y Tienda Autonoma",
        "descripcion": "Paseo por las salas de exposicion, proyectos de autogestion y productos locales.",
        "duracion": "1 hora"
      },
      {
        "icono": "\u2615",
        "nombre": "Patio Central",
        "descripcion": "Primer paso del recorrido: el patio colonial donde funciona el cafe de la casa.",
        "duracion": "20 min"
      },
      {
        "icono": "\ud83d\uded2",
        "nombre": "Tienda Autonoma",
        "descripcion": "Fanzines, editorial independiente, grafica y vestuario de creadores locales.",
        "duracion": "25 min"
      },
      {
        "icono": "\ud83c\udfad",
        "nombre": "Salas de Exhibicion y Escenario",
        "descripcion": "Salas de la casona donde se programan teatro, cine-foro, conciertos y debates.",
        "duracion": "30 min"
      }
    ],
    "programacion": [
      {
        "dia": "Mie-Sab 04:00 PM",
        "eventos": "Llegada y cafe en el patio central de la casona."
      },
      {
        "dia": "Mie-Sab 05:30 PM",
        "eventos": "Tienda autonoma: fanzines, grafica y productos de proyectos locales."
      },
      {
        "dia": "Mie-Sab 07:00 PM",
        "eventos": "Evento cultural: teatro, cine-foro o concierto independiente."
      }
    ],
    "horarios_zona": [
      {
        "zona": "Programacion cultural",
        "horario": "Mie-Sab 3:00 PM - 11:00 PM",
        "estado": "Abierto"
      }
    ],
    "accesibilidad": [
      {
        "icono": "\ud83d\udc65",
        "nombre": "Apto para todo publico",
        "descripcion": "Conciertos, teatro, cine-foro, talleres y ferias abiertas para todo tipo de publico."
      },
      {
        "icono": "\u267f",
        "nombre": "Acceso peatonal accesible",
        "descripcion": "Se llega caminando por el centro historico; la entrada principal es peatonal y la casona se recorre a pie."
      }
    ],
    "tours": [
      {
        "nombre": "Recorrido por la Casona y Tienda Autonoma",
        "precio": "Aporte voluntario",
        "precio_sub": "Guiado por el equipo de La Redada",
        "duracion": "1 hora",
        "tipo_tour": "Grupal",
        "idioma": "Espanol",
        "max_personas": "20",
        "descripcion": "Paseo por las salas de exposicion, proyectos de autogestion y productos locales.",
        "incluye": ["Acompanamiento del equipo de La Redada"],
        "no_incluye": ["Consumos en la tienda autonoma"],
        "link_reserva": "https://www.instagram.com/laredadamiscelaneacultural/",
        "featured": true
      }
    ],
    "equipamiento": [
      {
        "item": "Efectivo o Nequi para la tienda autonoma y los aportes a los artistas",
        "prioridad": "Recomendado"
      },
      {
        "item": "Ropa comoda y calzado para caminar por el centro historico",
        "prioridad": "Recomendado"
      },
      {
        "item": "Abrigo ligero para la noche bogotana",
        "prioridad": "Recomendado"
      }
    ],
    "itinerario": [
      {
        "dia": "Dia 1",
        "hora": "16:00",
        "titulo": "Llegada al Patio Central",
        "icono": "\u2615",
        "detalle": "Bienvenida en el patio de la casona colonial con cafe de la casa.",
        "tags": ["Patio", "Cafe"]
      },
      {
        "dia": "Dia 1",
        "hora": "17:30",
        "titulo": "Tienda Autonoma",
        "icono": "\ud83d\uded2",
        "detalle": "Recorrido por la tienda de productos independientes: fanzines, ilustracion y vestuario local.",
        "tags": ["Autogestion", "Diseno"]
      },
      {
        "dia": "Dia 1",
        "hora": "19:00",
        "titulo": "Evento cultural en la casona",
        "icono": "\ud83c\udfad",
        "detalle": "Teatro, cine-foro o concierto independiente en las salas de La Redada.",
        "tags": ["Teatro", "Musica"]
      }
    ],
    "dificultad_tags": [
      {
        "texto": "Apto para todo publico",
        "apto": true
      },
      {
        "texto": "Acceso peatonal accesible",
        "apto": true
      }
    ],
    "temporada_matriz": {}
  },
  "FAQS": [
    {
      "pregunta": "Donde queda La Redada Miscelanea Cultural?",
      "respuesta": "En el barrio La Candelaria, en el centro historico de Bogota, cerca de la Carrera 5 con Calle 12C."
    },
    {
      "pregunta": "Cuanto cuesta la entrada a La Redada?",
      "respuesta": "El ingreso general es gratuito con aporte voluntario; los conciertos y funciones cuestan entre $10.000 y $30.000."
    },
    {
      "pregunta": "Que se puede hacer en La Redada Miscelanea Cultural?",
      "respuesta": "Conciertos independientes, teatro, cine-foro, ferias de diseno autogestionado, talleres, debates y compras en la tienda autonoma."
    },
    {
      "pregunta": "Cual es el horario de La Redada?",
      "respuesta": "Abre de miercoles a sabado entre 3:00 PM y 11:00 PM, con la agenda cultural concentrada en la tarde y la noche."
    },
    {
      "pregunta": "Como se paga en la tienda autonoma?",
      "respuesta": "Se recomienda llevar efectivo o Nequi: la tienda de proyectos independientes y los aportes a los artistas se reciben de forma directa."
    }
  ],
  "FOTOS_SUGERIDAS": [
    {
      "tema": "Patio interior de una casona colonial en La Candelaria",
      "caption": "Patio interior de la casona colonial de La Candelaria donde funciona La Redada Miscelanea Cultural",
      "nombres_archivo_wikimedia": [
        "File:Bogota_Candelaria_patio_interior.jpg"
      ],
      "es_hero": true
    },
    {
      "tema": "Cultura independiente en Bogota",
      "caption": "Escena de cultura independiente y autogestionada en Bogota",
      "nombres_archivo_wikimedia": [
        "File:Bogota_Cultura_Independiente.jpg"
      ],
      "es_hero": false
    },
    {
      "tema": "Grafica independiente",
      "caption": "Grafica y publicaciones independientes de la escena colombiana",
      "nombres_archivo_wikimedia": [
        "File:Grafica_Independiente_Colombia.jpg"
      ],
      "es_hero": false
    },
    {
      "tema": "Concierto acustico en espacio cultural",
      "caption": "Concierto acustico en un espacio cultural independiente de Bogota",
      "nombres_archivo_wikimedia": [
        "File:Concierto_Acustico_Bogota.jpg"
      ],
      "es_hero": false
    },
    {
      "tema": "Fanzines y feria de diseno autogestionado",
      "caption": "Fanzines y diseno autogestionado en la feria de la tienda autonoma",
      "nombres_archivo_wikimedia": [
        "File:Fanzines_Feria_Diseno.jpg"
      ],
      "es_hero": false
    }
  ],
  "FUENTES": [
    {
      "tipo": "oficial",
      "url": "https://www.instagram.com/laredadamiscelaneacultural/",
      "que_respalda": "Programacion, horarios, eventos y contacto del espacio."
    },
    {
      "tipo": "maps",
      "url": "https://maps.google.com",
      "que_respalda": "Coordenadas decimales y barrio (La Candelaria, centro historico de Bogota)."
    }
  ]
}
```
