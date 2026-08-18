// scripts/seed-parques-y-espacios-verdes-de-bogota.js
// Datos del post de blog "El pulmon de Bogota: Simon Bolivar, Jardin
// Botanico, El Virrey, El Tunal y los cerros orientales" (sexta entrada
// REAL de la seccion Inspirate).
//
// Fuente: datos factuales de scripts/seed-parque-simon-bolivar.js,
// seed-jardin-botanico.js, seed-el-virrey.js, seed-el-tunal.js,
// seed-parque-nacional.js, seed-parque-la-florida.js y
// seed-quebrada-la-vieja.js + redaccion editorial propia. Cuerpo ~2.900
// palabras, parrafos por \n\n, fotos inline [foto:URL|texto] (fotos
// reutilizadas de los seeds de parques, ya en produccion).
//
// Blog NO lleva FAQs, ni video (video_url vacio), ni autor. Multi-tema:
// tags.temas[] + tags.tema.
//
// Uso:
//   node scripts/load-parques-y-espacios-verdes-de-bogota-api.js [URL] [TOKEN]
// URL por defecto: https://exploraco.vercel.app
// TOKEN por defecto: exploraco12345 (ADMIN_SECRET de desarrollo)
// Idempotente: DELETE+POST.

const SLUG = 'parques-y-espacios-verdes-de-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Parque_24_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpg/960px-Parque_24_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpg';

const PHOTOS = [
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Parque_24_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpg/960px-Parque_24_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpg',
    caption: 'Vista aerea del parque Simon Bolivar con su laguna'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Parque_pan_4_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpeg/960px-Parque_pan_4_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpeg',
    caption: 'La laguna artificial del parque, ideal para remar'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Templete_del_Parque_Sim%C3%B3n_Bol%C3%ADvar%2C_Colombia_DSC00080.JPG/960px-Templete_del_Parque_Sim%C3%B3n_Bol%C3%ADvar%2C_Colombia_DSC00080.JPG',
    caption: 'Templete Eucaristico de 1968 en el parque'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Biblioteca_V._B._Panor%C3%A1mica.JPG/960px-Biblioteca_V._B._Panor%C3%A1mica.JPG',
    caption: 'La Biblioteca Virgilio Barco, obra de Rogelio Salmona'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Bogot%C3%A1%2C_sendero_en_el_Jard%C3%ADn_Bot%C3%A1nico.JPG/960px-Bogot%C3%A1%2C_sendero_en_el_Jard%C3%ADn_Bot%C3%A1nico.JPG',
    caption: 'Sendero en el Jardin Botanico'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Tropicario_-_Jard%C3%ADn_Bot%C3%A1nico_de_Bogot%C3%A1_Jos%C3%A9_Celestino_Mutis.jpg/960px-Tropicario_-_Jard%C3%ADn_Bot%C3%A1nico_de_Bogot%C3%A1_Jos%C3%A9_Celestino_Mutis.jpg',
    caption: 'El Tropicario, el invernadero mas grande de Suramerica'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Sendero_en_el_parque_El_Virrey.JPG/960px-Sendero_en_el_parque_El_Virrey.JPG',
    caption: 'Sendero del corredor ecologico El Virrey'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Laguna_d_El_Tunal_Bt%C3%A1.jpeg/960px-Laguna_d_El_Tunal_Bt%C3%A1.jpeg',
    caption: 'Lagos artificiales del parque El Tunal'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/2016_Quebrada_La_Vieja_Bogot%C3%A1.jpg/960px-2016_Quebrada_La_Vieja_Bogot%C3%A1.jpg',
    caption: 'El sendero de la Quebrada La Vieja en los cerros orientales'
  }
];

const BASE = {
  slug: SLUG,
  nombre: 'El pulmon de Bogota: Simon Bolivar, Jardin Botanico, El Virrey, El Tunal y los cerros orientales',
  categoria_slug: 'blog',
  lead: 'Una guia de los espacios verdes de Bogota: el Parque Simon Bolivar con su laguna navegable, el Jardin Botanico con el Tropicario, El Virrey, El Tunal, el Parque Nacional, los humedales y el sendero de la Quebrada La Vieja. Con horarios, precios, actividades y consejos para disfrutar la naturaleza urbana.',
  descripcion: `Cuando se habla de Bogota, casi siempre se piensa en museos, historia y trafico. Pero la capital colombiana es tambien una de las ciudades mas verdes de Latinoamerica: mas de mil parques, cientos de humedales y dos cerros guardianes que enmarcan la sabana a 2.640 metros de altura. Los espacios verdes no son un lujo marginal aqui: son parte de la identidad bogotana, el escenario del deporte, los picnics, los conciertos y la vida de barrio. Esta guia reune los parques y espacios naturales que ningun viajero deberia perderse, desde el gigante Simon Bolivar hasta los senderos de los cerros orientales, con horarios, precios, actividades y consejos practicos.

Entender el lugar de los parques en Bogota ayuda a disfrutarlos mejor. La ciudad construyo su red de espacios verdes con una vision de ciudad moderna: el Instituto Distrital de Recreacion y Deporte (IDRD) administra decenas de parques metropolitanos y zonales, y la mayoria abren de las 5 de la manana a las 6 de la tarde. Los parques no son solo pasto: son escenarios deportivos, culturales y de convivencia, con programacion de torneos, festivales y escuelas de formacion. Para el viajero, entender que el parque es un espacio vivido, no decorativo, cambia por completo la forma de recorrerlo.

El rey de los parques bogotanos es, sin discusion, el Parque Metropolitano Simon Bolivar: 113 hectareas en pleno corazon de la ciudad. Su historia es tan grande como su extension: se creo juridicamente con la Ley 31 de 1979 para conmemorar los doscientos anos del nacimiento de Bolivar, la primera etapa se entrego en 1983 y el parque central se inauguro oficialmente el 15 de diciembre de 1991, sobre los terrenos de la antigua Hacienda El Salitre. Alli, en 1968, se celebro la misa campal del papa Pablo VI, un recuerdo que conserva el Templete Eucaristico. Es, literalmente, el pulmon de la ciudad.

La geografia manda en la escena verde de Bogota. La sabana, bordeada por los cerros orientales, da a la ciudad esa sensacion de valle abrazado, y los parques aprovechan esa topografia con miradores y senderos. Al oriente, los cerros de Monserrate y Guadalupe son los guardianes; al occidente, el rio Bogota y los humedales; al sur, los cerros de Usme y el paramo de la ciudad. Esa red natural, que incluye parques ecologicos distritales, hace de Bogota una ciudad con una identidad verde dificil de encontrar en otras capitales latinoamericanas.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Parque_pan_4_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpeg/960px-Parque_pan_4_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpeg|La laguna artificial del parque, ideal para remar]

La laguna artificial es el corazon lleno de vida del parque. Navegable, de unas 10 a 11 hectareas, ofrece alquiler de botes de pedal, remo y kayak por una tarifa moderada, mientras patos y garzas conviven con los visitantes. Alrededor de la laguna corren los senderos de tierra que invitan a trotar o caminar despacio, y las zonas verdes estan llenas de grupos de picnic, frisbees y mantas sobre el pasto. Los domingos, el ambiente se multiplica: la laguna se llena de botes, la ciclovia pasa por el costado y el parque se convierte en el salon de la ciudad.

Las opciones de deporte son casi infinitas. Ademas de la ciclorruta y la pista de trote, el parque tiene canchas de futbol con iluminacion, zonas de ejercicio al aire libre con maquinas, un parque canino para las mascotas y, en temporada, torneos y maratones que lo convierten en meta deportiva. La actividad no para ni entre semana: los corredores, los ciclistas y los grupos de baile llenan los senderos desde el amanecer. Para el viajero activo, una sesion de trote al amanecer por el Simon Bolivar, con los cerros de fondo, es la mejor manera de empezar el dia en Bogota.

El Simon Bolivar es tambien el templo del deporte capitalino. Tiene una ciclorruta perimetral de 4 kilometros, un ciclopaseo interno de 3.650 metros, una pista de trote de 3.160 metros, canchas de futbol, voleibol y baloncesto, patinodromo, parque canino y zonas de ejercicio al aire libre. Los martes y jueves se suman las rutas de los grupos de ciclistas y corredores. Para el viajero, alquilar una bici y dar la vuelta al parque es una de las mejores maneras de ver la ciudad desde otra perspectiva, con los cerros de fondo.

El parque guarda ademas la mayor plaza de conciertos al aire libre de Colombia: la Plaza de Eventos, con 37.000 metros cuadrados y capacidad para entre 80.000 y 140.000 personas. Es la sede historica del Rock al Parque, el festival de rock gratuito mas grande de Latinoamerica, y del Festival de Verano y los Festivales al Parque, que llenan la plaza de musica, deporte y color a mitad de ano. Para el viajero que llega en temporada de festivales, una tarde de concierto gratuito en el Simon Bolivar es una de las experiencias mas bogotanas que existen.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Templete_del_Parque_Sim%C3%B3n_Bol%C3%ADvar%2C_Colombia_DSC00080.JPG/960px-Templete_del_Parque_Sim%C3%B3n_Bol%C3%ADvar%2C_Colombia_DSC00080.JPG|Templete Eucaristico de 1968 en el parque]

Junto a la historia del parque esta el Templete Eucaristico de 1968, construido para la misa campal del papa Pablo VI. Dieciocho anos despues, en 1986, el papa Juan Pablo II reunio alli a mas de un millon de personas, una de las mayores concentraciones de la historia del pais. El templete, de formas sencillas y materiales nobles, es hoy un monumento silencioso que se recorre en cinco minutos, y su valor simbolico lo convierte en una parada obligada para entender el peso religioso y cultural que tiene este lugar.

Al costado del parque se levanta la Biblioteca Virgilio Barco, una de las obras maestras del arquitecto Rogelio Salmona: ladrillos rojos, jardines acuaticos, rampas y la luz filtrada que define su estilo. La biblioteca es gratuita, abre todos los dias y merece una visita solo por su arquitectura, considerada una de las mas importantes de America Latina. Muchos viajeros la recorren como parte del plan del parque: entrar a su sala principal y asomarse al lago que la rodea es, literalmente, entrar a una obra de arte.

A dos pasos del Simon Bolivar esta el Jardin Botanico Jose Celestino Mutis, el pulmon verde cientifico de Bogota. Fundado en 1955 y heredero de la Real Expedicion Botanica que lidero Mutis en el siglo dieciocho, ocupa cerca de 20 hectareas con 34 colecciones vivas y mas de 46.000 plantas de 903 especies, de las cuales la mayoria son nativas y un porcentaje importante endemicas. Recorrer sus senderos entre paramo, bosque altoandino, humedales, robles y orquideas es un viaje a los ecosistemas de Colombia sin salir de la ciudad.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Bogot%C3%A1%2C_sendero_en_el_Jard%C3%ADn_Bot%C3%A1nico.JPG/960px-Bogot%C3%A1%2C_sendero_en_el_Jard%C3%ADn_Bot%C3%A1nico.JPG|Sendero en el Jardin Botanico]

La joya del Jardin Botanico es el Tropicario: seis domos de vidrio en 2.700 metros cuadrados que reproducen los ecosistemas de Colombia, desde el superparamo hasta la selva humeda del Choco y el Amazonas y el bosque seco tropical. Inaugurado en 2021, es el invernadero mas grande de Suramerica y fue galardonado con la Bienal Panamericana de Arquitectura de Quito. La entrada general cuesta unos 6.000 pesos, el Tropicario se paga aparte y el jardin cierra los lunes por mantenimiento. La experiencia de pasar del frio andino al calor de la selva en cinco minutos es inolvidable.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Tropicario_-_Jard%C3%ADn_Bot%C3%A1nico_de_Bogot%C3%A1_Jos%C3%A9_Celestino_Mutis.jpg/960px-Tropicario_-_Jard%C3%ADn_Bot%C3%A1nico_de_Bogot%C3%A1_Jos%C3%A9_Celestino_Mutis.jpg|El Tropicario, el invernadero mas grande de Suramerica]

Ademas del Tropicario, el Jardin Botanico guarda el mariposario, la coleccion de orquideas, el bosque de niebla y la zona de humedales, y los fines de semana recibe el mercado campesino con productos directos de la sabana. Es uno de los planes favoritos de las familias, con sendas planas y accesibles, y el horario ideal es la manana, cuando el clima es mas estable. Para el viajero que quiere entender la biodiversidad colombiana en unas horas, es la visita perfecta, con la ventaja de estar pegado al Simon Bolivar.

Las colecciones vivas del Jardin Botanico merecen tiempo. El paramo, con sus frailejones de crecimiento lentisimo, es la estrella ecologica; la coleccion de orquideas reune especies nativas; el bosque altoandino protege robles y encenillos; y los humedales del jardin reproducen la laguna de la sabana. Cada coleccion tiene carteles que cuentan la historia de la planta y su lugar en el ecosistema. Para los amantes de la botanica, el Jardin es un museo al aire libre donde cada camino es una leccion, y la combinacion con el Tropicario permite ver en horas lo que en Colombia tarda siglos en crecer.

En el oriente de la ciudad, el Parque El Virrey es el corredor ecologico mas querido de la capital. Se extiende por varios kilometros sobre el antiguo cauce de la quebrada que le da nombre, entre la carrera 7 y la carrera 15, y combina senderos peatonales, ciclorruta, zonas infantiles, canchas y esculturas, incluida la famosa Gran Cascada de Edgar Negret. Es el parque lineal de los chapineros: por la manana lo corren los deportistas, al mediodia lo caminan los oficinistas y el fin de semana se llena de familias, perros y comparsas de picnics.

El Virrey es ademas un ejemplo de ecologia urbana: el parque se construyo sobre la antigua quebrada, que hoy corre canalizada pero cuyos arboles centenarios, la mayoria urapanes, dan sombra a todo el corredor. La escultura Gran Cascada de Edgar Negret recuerda el agua que alguna vez fluyo por el cauce. Recorrer El Virrey es, en cierto sentido, leer la historia de como Bogota domestico su geografia. Y su ubicacion, entre los barrios mas verdes de la ciudad, lo convierte en el parque de los ejecutivos, las familias y los deportistas de Chapinero, con la quebrada y la escultura como testigos.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Sendero_en_el_parque_El_Virrey.JPG/960px-Sendero_en_el_parque_El_Virrey.JPG|Sendero del corredor ecologico El Virrey]

En el sur de Bogota, el Parque Metropolitano El Tunal es el pulmon de la localidad de Tunjuelito y uno de los parques mas completos de la ciudad. Tiene lagos artificiales, canchas de futbol y baloncesto, coliseo cubierto, patinodromo y amplias zonas verdes, ademas de una vista espectacular de los cerros orientales. Es el centro de la vida barrial del sur: torneos deportivos, festivales y el ambiente familiar que define a los parques de los barrios populares. Para el viajero que quiere ver la ciudad real, fuera del circuito turistico, El Tunal es una parada que vale la pena.

Los parques del sur tienen una energia distinta, mas comunitaria. Ademas de El Tunal, la ciudad levanta parques como el Metropolitano de los Novios y el parque Mundo Aventura, y las localidades populares llenan sus barrios de canchas y zonas verdes con programacion de torneos de barrio. Para el viajero que quiere ver la vida real de la ciudad, un domingo en un parque del sur es un plan de autenticidad total: familias, deporte, comida callejera y esa hospitalidad de barrio que no se encuentra en el centro turistico. La energia deportiva del sur es, de hecho, la que alimenta las ligas locales de ciclismo y futbol.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Laguna_d_El_Tunal_Bt%C3%A1.jpeg/960px-Laguna_d_El_Tunal_Bt%C3%A1.jpeg|Lagos artificiales del parque El Tunal]

El Parque Nacional Enrique Olaya Herrera, el mas antiguo de Bogota, es historia viva en el corazon de La Macarena. Inaugurado en los anos treinta, conserva el teatro El Parque de 1936, declarado monumento nacional, el monumento a Rafael Uribe Uribe y un bosque de pinos y especies altoandinas que refresca el barrio. Es el parque de los bohemios: al frente estan los cafes de especialidad y las galerias de La Macarena, y en su interior se camina, se lee y se conversa entre la sombra de los arboles centenarios. Un paseo por el Parque Nacional es una de las tardes mas placenteras del centro.

Los humedales son el secreto verde mejor guardado de Bogota. La ciudad conserva humedales como Cordoba, Jaboque, Juan Amarillo y Santa Maria del Lago, refugio de mas de cien especies de aves entre garzas, tinguas y patos. El Parque La Florida, al occidente, bordea el rio Bogota y suma lagos, senderos y observatorios de aves, con la tingua bogotana, especie endemica en peligro, como habitante estrella. Para los amantes del birdwatching, un amanecer en un humedal bogotano es una experiencia que no tiene precio y que pocas capitales pueden ofrecer.

El sistema de humedales de Bogota es un patrimonio ambiental de primer nivel: mas de doce humedales protegidos que funcionan como esponjas naturales y refugio de aves migratorias. El humedal Cordoba, en el norte, tiene senderos en madera y paneles educativos; el de Jaboque, al occidente, es uno de los mas extensos; y el Parque Santa Maria del Lago combina lago navegable y aves. Visitar un humedal en la manana, cuando la niebla se levanta y las garzas despiertan, es una experiencia que los locales recomiendan a quienes quieren ver la Bogota natural que se esconde entre el asfalto.

Y si buscas el contacto mas directo con la naturaleza, los cerros orientales tienen su sendero mas famoso: la Quebrada La Vieja. El sendero, que parte del barrio Rosales y sube por el cauce de la quebrada entre la carrera 1 y los cerros, es el mas concurrido de Bogota, con cientos de deportistas cada manana. La subida es exigente, toma entre 45 minutos y una hora y media segun el ritmo, y regala una vista privilegiada de la ciudad. Se requiere inscripcion previa y el ingreso es gratuito, con cupos limitados; se recomienda ir muy temprano y con calzado adecuado.

Si la Quebrada La Vieja no es suficiente o el cupo esta lleno, los cerros orientales ofrecen otras puertas. El sendero de Monserrate, por la cara del cerro, es el mas famoso para subir caminando; el sendero de Guadalupe, menos concurrido, regala vistas del sur; y el camino a los Colibries completa la oferta de rutas intermedias. Todos exigen registro y un estado fisico minimo, y todos regalan lo mismo: el silencio del bosque altoandino a veinte minutos del centro de una ciudad de millones de personas, entre frailejones, pinos y el canto de los pajaros.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/2016_Quebrada_La_Vieja_Bogot%C3%A1.jpg/960px-2016_Quebrada_La_Vieja_Bogot%C3%A1.jpg|El sendero de la Quebrada La Vieja en los cerros orientales]

La manera mas democratica de disfrutar los parques es la ciclovia dominical. Cada domingo y festivo, de 7 de la manana a 2 de la tarde, la ciudad cierra cerca de 120 kilometros de calles y los parques se conectan en una sola red de deporte y paseo. Se puede alquilar una bici, correr o simplemente caminar por la mitad de Bogota sin un solo carro. La ciclovia pasa por el Simon Bolivar, El Virrey y el Parque Nacional, y en el camino hay puestos de fruta, bandas y el mejor ambiente deportivo de la ciudad. Es el plan obligado del domingo bogotano.

Para la ciclovia y los parques, el alquiler de bicicletas es facil. El sistema publico de bicis compartidas y los negocios de alquiler por horas ofrecen bicicletas en buen estado, y muchos hoteles las prestan a sus huespedes. Una manana de domingo en bici, entre el Simon Bolivar y El Virrey, es el plan verde definitivo. Y para los mas tecnologicos, las apps de bicis electricas permiten recorrer distancias mayores sin esfuerzo, ideal para unir varios parques en una sola tarde. Lleva siempre casco y respeta los carriles marcados.

Para organizar el tiempo, aqui va una sugerencia. La manana se puede dedicar al Jardin Botanico y el Tropicario, seguido del almuerzo en el mercado campesino; la tarde al Simon Bolivar, con botes en la laguna, bicicleta y la Biblioteca Virgilio Barco; y al atardecer, una caminata tranquila por El Virrey o un paseo por el Parque Nacional con cafe de La Macarena. Quien tenga energia, puede madrugar al dia siguiente para el sendero de la Quebrada La Vieja o el avistamiento de aves en La Florida. En un par de dias se cubre lo esencial.

Los consejos practicos son simples. Los parques abren todos los dias, la mayoria desde temprano hasta el atardecer, y la entrada es gratuita, salvo servicios puntuales como los botes o el Tropicario. Lleva protector solar, agua, ropa comoda y una chaqueta para el clima cambiante; los parques a 2.640 metros se refrescan rapido. Las mascotas son bienvenidas con correa en casi todos los espacios, y en la ciclovia los domingos la ciudad entera se vuelve paseo. Recuerda recoger tu basura y respetar las zonas de pasto.

Bogota es, en definitiva, una ciudad que se respira. Los parques no son una pausa del viaje: son parte central de la experiencia, el lugar donde se encuentra el deporte, la musica, la familia y la naturaleza a pasos del asfalto. Del gigante Simon Bolivar al sendero de los cerros, de los humedales del occidente al Tropicario que reproduce la selva, la oferta verde de la capital es una de sus mayores riquezas. Nuestra recomendacion final: saca tiempo para el pasto, el aire y el sol de Bogota, porque esa es la ciudad que los bogotanos aman y guardan.`,
  highlight: 'Del Simon Bolivar con su laguna navegable al Tropicario y la Quebrada La Vieja: la guia completa de la naturaleza urbana de Bogota',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Varios (Simon Bolivar, El Virrey, El Tunal, La Macarena, Rosales)',
  lat: 4.658056,
  lng: -74.093889,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.idrd.gov.co',
  instagram: '@idrdbogota',
  precio_desde: '',
  horario: '',
  emoji: '\ud83c\udf3f',
  hero_bg: '#1b5e20',
  tipo: 'Blog - Guia de naturaleza',
  capacidad: '',
  como_llegar: 'Simon Bolivar: TransMilenio Salitre - El Greco o Movistar Arena. Jardin Botanico: estacion El Tiempo y caminar. El Virrey: zona de Chapinero. El Tunal: estacion El Tunal. Sendero Quebrada La Vieja: inscripcion previa, barrio Rosales.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tema: 'naturaleza',
  temas: ['naturaleza', 'tips'],
  video_url: ''
};

const FAQS = [];

const FOTOS_GALERIA = PHOTOS.slice(1).map(function(p, i) {
  return { url: p.url, caption: p.caption, orden: i + 1 };
});

module.exports = { SLUG, HERO, PHOTOS, BASE, TAGS, FAQS, FOTOS_GALERIA };
