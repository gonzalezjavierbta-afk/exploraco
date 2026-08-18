// scripts/seed-bogota-guia-para-el-viajero.js
// Datos del post de blog "Bogota para viajeros: clima, altitud, transporte,
// dinero y seguridad en una sola guia" (tercera entrada REAL de la seccion
// Inspirate, tras monserrate-guia-completa y theatron-guia-completa).
//
// Fuente: datos factuales de scripts/seed-bogota.js (ficha de la ciudad) +
// redaccion editorial propia en el tono de las guias previas. Cuerpo ~2.900
// palabras en descripcion (TEXT), parrafos separados por \n\n y fotos inline
// con el marcador [foto:URL|texto] que parsea api/pagina-destino.js.
//
// Blog NO lleva FAQs, ni video (video_url vacio), ni autor. Multi-tema:
// tags.temas[] + tags.tema.
//
// Uso:
//   node scripts/load-bogota-guia-para-el-viajero-api.js [URL] [TOKEN]
// URL por defecto: https://exploraco.vercel.app
// TOKEN por defecto: exploraco12345 (ADMIN_SECRET de desarrollo)
// Idempotente: DELETE+POST (patron load-theatron-guia-api.js).

const SLUG = 'bogota-guia-para-el-viajero';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg';

const PHOTOS = [
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg',
    caption: 'El skyline del centro de Bogota, con los cerros orientales de fondo'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Plaza_de_Bol%C3%ADvar_-_Bogot%C3%A1.JPG',
    caption: 'Plaza de Bolivar, el corazon institucional de la ciudad'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/TransMilenio_estaci%C3%B3n_Las_Aguas_y_Monserrate.jpg/960px-TransMilenio_estaci%C3%B3n_Las_Aguas_y_Monserrate.jpg',
    caption: 'TransMilenio, la red de buses rapidos mas grande de Latinoamerica'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Panor%C3%A1mica_de_Usaquen%2C_Bogot%C3%A1_D.C.jpg/960px-Panor%C3%A1mica_de_Usaquen%2C_Bogot%C3%A1_D.C.jpg',
    caption: 'Panoramica de Usaquen, el antiguo pueblo absorbido por la ciudad'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Museo-del-Oro-Fachada_%2827842494739%29.jpg/960px-Museo-del-Oro-Fachada_%2827842494739%29.jpg',
    caption: 'El Museo del Oro, parada obligada de cualquier itinerario'
  }
];

const BASE = {
  slug: SLUG,
  nombre: 'Bogota para viajeros: clima, altitud, transporte, dinero y seguridad en una sola guia',
  categoria_slug: 'blog',
  lead: 'Todo lo que necesitas saber antes de viajar a Bogota: clima de 14-20C, altitud de 2.640 m, como moverte en TransMilenio y ciclovia, dinero, propinas, seguridad, zonas para hospedarte y los mejores planes. Una guia practica para que tu primera visita sea perfecta.',
  descripcion: `Bogota es una de esas ciudades que hay que conocer con calma, pero tambien es una de las que mas se disfrutan cuando se llega preparado. Capital de Colombia, fundada en 1538 y levantada sobre la sabana andina a 2.640 metros sobre el nivel del mar, concentra historia colonial, museos de clase mundial, una escena gastronomica en plena ebullicion y la energia de una metropoli de mas de siete millones de personas. Esta guia practica reune todo lo que necesitas saber antes de viajar: el clima, la altitud, como llegar del aeropuerto, como moverte por la ciudad, el dinero, las propinas, la seguridad, los barrios y los planes que no te puedes perder. Con esta informacion, tu primera visita a Bogota sera mucho mas facil.

Empecemos por lo que mas sorprende a quien llega por primera vez: la altura. Bogota se levanta a 2.640 metros sobre el nivel del mar, es decir, mas alta que Cusco. A esa altitud el aire tiene menos oxigeno y el cuerpo necesita un par de dias para adaptarse. Algunos viajeros sienten falta de aire al subir escaleras, dolor de cabeza leve o mareos durante las primeras 24 a 48 horas. La recomendacion es simple: hidratate constantemente, evita el alcohol el primer dia, come ligero y toma el primer dia con calma. La mayoria de las personas se adaptan sin mayor problema, pero es mejor prevenir que el soroche arruine tu paseo.

El segundo factor que define la experiencia es el clima, y aqui la palabra clave es imprevisible. Bogota tiene temperaturas estables durante todo el ano: entre 14 y 20 grados en promedio, con mananas frescas y tardes que pueden ser de sol o de lluvia en cuestion de minutos. No hay estaciones como en otras latitudes, sino temporadas de lluvia y de sequia. Las lluvias mas fuertes caen en abril-mayo y en octubre-noviembre; las temporadas mas secas son diciembre-enero y julio-agosto. Pero incluso en la temporada seca, un aguacero sorpresa puede aparecer a media tarde. La estrategia es vestirse por capas y cargar siempre un paraguas o impermeable.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg|El skyline del centro de Bogota, con los cerros orientales de fondo]

El clima define tambien la maleta. Lleva ropa abrigada para la noche, porque al caer el sol la temperatura baja y en las zonas altas de la ciudad puede hacer bastante frio. Incluye una chaqueta impermeable, zapatos comodos para caminar, y no olvides que a 2.640 metros la radiacion solar es mas intensa: protector solar y gorra son mas necesarios de lo que parece. El calzado es clave: caminaras bastante, especialmente en La Candelaria, con sus calles empedradas y pendientes. Y deja espacio en la maleta para las compras: artesanias, chocolate, cafe y libros se consiguen a muy buen precio.

Cuando llega el momento de elegir la fecha, la respuesta corta es que Bogota funciona todo el ano, pero hay matices. Diciembre y enero son ideales: clima seco, ambiente festivo y, en diciembre, los alumbrados navidenos convierten la ciudad en un espectaculo de luces. Julio y agosto son otra buena ventana, con clima estable y festivales como el de Verano o el Rock al Parque. Si viajas en temporada de lluvias, no desistas: los planes de museos, cafes y gastronomia salvan cualquier tarde lluviosa, y las mananas suelen estar despejadas.

[foto:https://upload.wikimedia.org/wikipedia/commons/6/64/Plaza_de_Bol%C3%ADvar_-_Bogot%C3%A1.JPG|Plaza de Bolivar, el corazon institucional de la ciudad]

La llegada a Bogota se hace por el Aeropuerto Internacional El Dorado, uno de los mas modernos de la region. Del aeropuerto al centro hay unos 13 kilometros, entre 30 y 45 minutos dependiendo del trafico. Las opciones son el taxi oficial con tarifa fija, las apps de transporte que operan con normalidad en la terminal, y el TransMilenio: la estacion El Dorado conecta con el centro a traves de la ruta K86, una opcion economica y directa si viajas ligero. El aeropuerto tiene cajeros, casas de cambio y servicios de wifi, asi que puedes llegar sin pesos y resolver sobre la marcha.

Para moverte por la ciudad, el sistema publico estrella es TransMilenio: la red de buses rapidos mas grande de Latinoamerica, con carriles exclusivos que evitan el trafico. Funciona con la tarjeta TuLlave, que se compra y recarga en estaciones y tiendas. Un pasaje cuesta alrededor de 2.900 pesos, y los transbordos entre troncales son gratuitos dentro de la misma estacion. Ademas de las troncales, el sistema SITP cubre las rutas alimentadoras con los mismos buses azules. Si vienes por varios dias, la tarjeta TuLlave es una de las compras mas utiles que puedes hacer.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/TransMilenio_estaci%C3%B3n_Las_Aguas_y_Monserrate.jpg/960px-TransMilenio_estaci%C3%B3n_Las_Aguas_y_Monserrate.jpg|TransMilenio, la red de buses rapidos mas grande de Latinoamerica]

Un consejo de local: aprovecha la ciclovia dominical. Cada domingo y festivo, de 7 de la manana a 2 de la tarde, la ciudad cierra cerca de 120 kilometros de calles para bicicletas, caminantes y deportistas. La ciclovia conecta los parques mas importantes y es, ademas de un plan sano, una forma distinta de ver Bogota. Puedes alquilar una bicicleta por horas o simplemente caminar por las vias cerradas. Los bogotanos la viven en serio: hay vendedores de fruta, bandas en vivo y un ambiente festivo que no te esperabas.

Para distancias mas largas o trayectos nocturnos, las apps de transporte son la opcion mas comoda y segura. Uber, DiDi e InDriver operan en la ciudad con tarifas que se ven antes de confirmar el viaje. Los taxis amarillos de calle pueden tomarse con precaucion y siempre con el taximetro visible; de noche, prefiere las apps. El trafico de Bogota es pesado en horas pico (7-9 de la manana y 5-8 de la noche), asi que planifica los traslados con margen, especialmente hacia el aeropuerto.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Panor%C3%A1mica_de_Usaquen%2C_Bogot%C3%A1_D.C.jpg/960px-Panor%C3%A1mica_de_Usaquen%2C_Bogot%C3%A1_D.C.jpg|Panoramica de Usaquen, el antiguo pueblo absorbido por la ciudad]

Hablemos de dinero, porque no hay nada que arruine mas un viaje que quedarse corto. La moneda es el peso colombiano, y aunque las tarjetas de credito y debito se aceptan en la mayoria de restaurantes, hoteles y tiendas, el efectivo sigue siendo rey en los mercados, el transporte y los puestos callejeros. Lleva billetes pequenos para comprar en la calle y pide cambio cuando puedas, porque a veces el comercio callejero no tiene para dar vuelto de billetes grandes. Hay cajeros en todas las zonas turisticas, y las tarjetas internacionales funcionan sin problema en la red de la mayoria de bancos.

Las propinas son parte de la cultura, pero con reglas claras. En los restaurantes, el servicio del 10 por ciento suele venir incluido en la cuenta, asi que no hace falta dejar mas a menos que el servicio haya sido excelente. En los tours guiados y con los maleteros, una propina voluntaria de unos pocos miles de pesos es bienvenida. En las apps de transporte, la propina se puede dejar en la misma aplicacion. En general, el viajero que no deja propina extra no ofende a nadie, porque el servicio ya esta contemplado.

El presupuesto puede variar muchisimo segun el estilo de viaje. Un viajero con mochila puede moverse con entre 150.000 y 250.000 pesos diarios, incluyendo hostal, comidas callejeras y transporte publico. Un viajero de nivel medio, con hotel confortable, restaurantes de gama media y algunos tours, gastara entre 350.000 y 600.000 pesos diarios. Y quien quiera alta cocina, hoteles boutique y experiencias premium, el cielo es el limite. Bogota tiene oferta para todos los bolsillos, y la relacion calidad-precio es uno de sus grandes atractivos.

Comprar en Bogota tambien tiene su logica. Las artesanias mas buscadas son las mochilas arhuacas, las hamacas, la ceramica de Raquira y los tejidos de lana de los pueblos boyacenses. El punto clasico de compras es el Pasaje Rivas en La Candelaria, y el mercado de pulgas de Usaquen los domingos es perfecto para encontrar antiguedades y artesanias con ambiente de pueblo. Para el cafe y el chocolate, las tiendas especializadas del centro y de Chapinero ofrecen empaques regalables a muy buen precio. Y no olvides que en los mercados se puede regatear con amabilidad.

La eleccion del barrio donde alojarte define la experiencia. La Candelaria es la opcion para los que quieren historia, museos y ambiente universitario, a pasos del centro colonial y de Monserrate. Chapinero, con sus calles de la Zona Rosa y su vida nocturna, es perfecto para los que buscan marcha y gastronomia. La Zona G y la Zona T concentran la alta cocina y los hoteles de lujo, y Usaquen ofrece un aire de pueblo colonial con su famoso mercado de pulgas del domingo. Todos los barrios turisticos estan bien conectados, asi que no hay mala eleccion.

Si de comer bien se trata, Bogota tiene zonas enteras dedicadas a eso. La Zona G, alrededor de la calle 70 con carrera 7, concentra restaurantes de autor y cocina internacional de alto nivel. La Zona T y el Parque de la 93 ofrecen opciones mas variadas, con terrazas y ambiente joven. Y en La Candelaria, los restaurantes universitarios sirven ajiaco y platos tipicos a precios de estudiante. Probar la comida callejera es casi obligatorio: empanadas, arepas de huevo, papas rellenas y jugos de frutas exoticas se consiguen en cualquier esquina, y la calidad sorprende al precio que se paga.

Ademas de moverte entre barrios, conviene conocerlos aunque sea de pasada. La Candelaria es el corazon historico y el mejor lugar para caminar sin rumbo. Chapinero es el centro de la vida nocturna y de la escena LGBTQ+, con el Chapigay como epicentro. Usaquen conserva calles empedradas y una plaza que el domingo se llena de artesanos. Y el norte de la ciudad, con la Zona T y el Parque de la 93, concentra restaurantes, cafes y terrazas que son el plan perfecto para una tarde de sol.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Museo-del-Oro-Fachada_%2827842494739%29.jpg/960px-Museo-del-Oro-Fachada_%2827842494739%29.jpg|El Museo del Oro, parada obligada de cualquier itinerario]

La gastronomia merece un capitulo propio, porque comer en Bogota es parte del viaje. El plato insignia es el ajiaco: una sopa de papas con pollo, maiz y guasca, que se acompana con alcaparras, crema de leche y aguacate. Tambien debes probar el chocolate santafereno con queso para derretir, los tamales, la almojabana, el pan de bono y las empanadas callejeras con aji. Para los dulces, la oblea con arequipe y el salpicon de frutas son clasicos infaltables. En los mercados como La Perseverancia o Paloquemao encuentras todo esto y mas, con precios de local.

Los museos son el otro gran atractivo, y aqui la mejor noticia: muchos son gratuitos o muy economicos. El Museo del Oro, con la mayor coleccion de orfebreria prehispanica del mundo, cuesta 5.000 pesos y es gratis los domingos. El Museo Botero, con la coleccion personal del artista mas famoso de Colombia, es gratis siempre. El Museo Nacional, el mas antiguo del pais, cuesta 4.000 pesos y tambien es gratis los domingos. Sumale el MAMBO, la Quinta de Bolivar y decenas de galerias independientes: la oferta cultural de Bogota es de las mejores del continente.

Colombia es un pais cafetero, y Bogota es el mejor lugar para descubrir por que. En las ultimas dos decadas la ciudad vivio una revolucion de cafes de especialidad: baristas que tuestan grano del Huila, de la Sierra Nevada o del eje cafetero, con metodo de filtro y tostado propio. Los barrios de La Macarena, Chapinero y la Zona G concentran las mejores cafeterias de la capital. Un buen cafe colombiano se paga entre 6.000 y 12.000 pesos, una ganga comparado con el precio internacional. Sumale las panaderias tradicionales con almojabana y pan de bono recien horneados, y tendras el desayuno perfecto.

Sobre la seguridad, seamos honestos y practicos. Bogota es una ciudad segura para el viajero que usa el sentido comun, y las zonas turisticas son tranquilas durante el dia. Las reglas son las de cualquier gran capital: evita calles desoladas de noche, no uses el celular en la calle con descuido, guarda la billetera en un bolsillo seguro y usa apps de transporte en lugar de taxis de calle a altas horas. Los carteristas operan en zonas muy concurridas, asi que en el transporte publico en hora pico, cuida tus pertenencias. Con precaucion, tu visita sera sin sobresaltos.

En cuestiones de salud, la ciudad esta bien equipada. Hay farmacias en cada esquina (Farmatodo, Drogas La Rebaja, Colsubsidio) y muchas abren 24 horas. Para una emergencia, el hospital mas cercano siempre tiene urgencias, y el sistema de ambulancias se activa llamando al 123. Lleva tus medicamentos de siempre en la maleta, porque encontrar los mismos nombres comerciales no siempre es posible. Y recuerda el seguro de viaje: ante cualquier imprevisto, la tranquilidad vale lo que cuesta.

La tecnologia te va a ayudar mucho. Google Maps funciona bien y muestra las estaciones de TransMilenio con sus rutas. La app de TuLlave te permite revisar el saldo de tu tarjeta. Las apps de transporte (Uber, DiDi, InDriver) son imprescindibles para traslados nocturnos. Y aunque el espanol es el idioma oficial, en las zonas turisticas cada vez hay mas gente que habla ingles. Un diccionario o traductor en el celular te sacara de apuros en los mercados y con los artesanos.

La conectividad no es un problema. El aeropuerto y la mayoria de hoteles, cafes y centros comerciales ofrecen wifi gratuito. Si quieres datos moviles, las operadoras locales (Claro, Movistar, Tigo) venden SIMs prepago con planes de datos en los centros comerciales y tiendas oficiales, y tambien hay opciones de eSIM internacional que funcionan al llegar. Un consejo: descarga los mapas de Bogota para uso offline, porque la senal puede ser irregular en algunos puntos del centro.

Si viajas con ninos, Bogota tambien tiene planes pensados para ellos. El Jardin Botanico con su mariposario, el Parque Simon Bolivar con su laguna navegable y el Planetario Distrital son los favoritos de las familias. La ciclovia dominical es perfecta para andar en bici con los mas pequenos, y muchos museos ofrecen talleres gratuitos los fines de semana. La ciudad es amigable con la familia, y con un poco de organizacion, los ninos disfrutan tanto como los adultos.

Aprender unas palabras de jerga local hace milagros para conectar con la gente. Los bogotanos usan el habla con carino: un amigo es un parcero, algo bueno es bacano, un favor se pide con un regio, y cuando algo es genial se dice que es chimba (con moderacion, porque es informal). Saludar con un buenos dias o una buenas tardes antes de pedir algo es de buena educacion, y la gente lo agradece. El espanol colombiano es claro y musical, y los bogotanos son conocidos por su amabilidad.

Bogota vive tambien un calendario de eventos que vale la pena mirar antes de viajar. En diciembre, los alumbrados navidenos llenan la ciudad de luz, con el eje de la Calle 26 y el Parque Simon Bolivar como protagonistas. A mitad de ano, el Rock al Parque convierte la Plaza de Eventos en el festival de rock gratuito mas grande de Latinoamerica, y el Festival de Verano ofrece deportes y musica al aire libre. Sumale ferias de libro, temporadas de teatro y exposiciones que cambian cada mes: siempre hay algo pasando.

Un ultimo dato de calendario: Colombia tiene muchos lunes festivos (los llamados puentes), y en esos fines de semana las ciudades turisticas y los destinos cercanos se llenan. Si tu viaje coincide con un puente, reserva hospedaje con anticipacion y llega temprano a los atractivos. Tambien es cierto lo contrario: los dias laborales los museos y monumentos estan casi vacios, y la ciudad se siente mas intima. Para el viajero flexible, un martes o miercoles puede ser el mejor dia para Monserrate o el Museo del Oro.

Si tu viaje dura mas de tres dias, considera una excursion de un dia. La Catedral de Sal de Zipaquira, a menos de una hora, es una de las maravillas mas visitadas del pais. El pueblo colonial de Villa de Leyva, con su plaza empedrada, esta a dos horas y media. Y para una escapada de fin de semana, la laguna de Guatavita o las rocas de Suesca son los favoritos de los aventureros. Bogota es la base perfecta para conocer buena parte de la riqueza de Cundinamarca sin cambiar de hotel.

Antes de partir, un checklist mental: documento de identidad a la mano (en Colombia te lo pueden pedir para comprar en TransMilenio o entrar a algunos lugares), una chaqueta impermeable, zapatos comodos, la tarjeta TuLlave, algo de efectivo en billetes pequenos, protector solar y mucha hidratacion para la altitud. Con eso, Bogota se deja recorrer con confianza. La ciudad premia a quien llega preparado y castiga a quien llega en piloto automatico.

Y si algo de esta guia te deja con dudas, recuerda el espiritu de la ciudad: Bogota es grande, diversa y sorprendente, y cada visita descubre una capa nueva. Los cerros de Monserrate y Guadalupe vigilan la sabana, La Candelaria guarda la memoria, Chapinero baila hasta el amanecer y los parques invitan a respirar. Preparado como vas a estar despues de leer esta guia, lo unico que falta es el tiquete. Bienvenido a Bogota: la ciudad te espera con los brazos abiertos, el clima cambiante y la mejor energia de Colombia.`,
  highlight: 'Clima de 14-20C, altitud de 2.640 m, TransMilenio, ciclovia, propinas del 10% y todos los tips para que tu primera visita a Bogota sea perfecta',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Ciudad completa',
  lat: 4.711,
  lng: -74.0721,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.bogota.gov.co',
  instagram: '@bogota',
  precio_desde: '',
  horario: '',
  emoji: '\ud83c\udfdb\ufe0f',
  hero_bg: '#0e2a3a',
  tipo: 'Blog - Guia practica',
  capacidad: '',
  como_llegar: 'Aeropuerto El Dorado (BOG). Del aeropuerto al centro: taxi oficial, apps de transporte o TransMilenio ruta K86 desde la estacion El Dorado.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tema: 'tips',
  temas: ['tips', 'cultura'],
  video_url: ''
};

const FAQS = [];

const FOTOS_GALERIA = PHOTOS.slice(1).map(function(p, i) {
  return { url: p.url, caption: p.caption, orden: i + 1 };
});

module.exports = { SLUG, HERO, PHOTOS, BASE, TAGS, FAQS, FOTOS_GALERIA };
