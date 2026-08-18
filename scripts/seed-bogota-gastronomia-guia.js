// scripts/seed-bogota-gastronomia-guia.js
// Datos del post de blog "Bogota a la mesa: ajiaco, mercados, dulces
// callejeros y cafes de especialidad" (cuarta entrada REAL de la seccion
// Inspirate).
//
// Fuente: datos factuales de scripts/seed-bogota.js y scripts/seed-lacandelaria.js
// (ajiaco, chocolate santafereno, tamales, mercados, tours gastro) +
// redaccion editorial propia. Cuerpo ~2.900 palabras, parrafos por \n\n,
// fotos inline [foto:URL|texto] (todas verificadas via API de Wikimedia Commons).
//
// Blog NO lleva FAQs, ni video (video_url vacio), ni autor. Multi-tema:
// tags.temas[] + tags.tema.
//
// Uso:
//   node scripts/load-bogota-gastronomia-guia-api.js [URL] [TOKEN]
// URL por defecto: https://exploraco.vercel.app
// TOKEN por defecto: exploraco12345 (ADMIN_SECRET de desarrollo)
// Idempotente: DELETE+POST.

const SLUG = 'bogota-gastronomia-guia';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Ajiaco-santafere%C3%B1o.colombia.jpg/960px-Ajiaco-santafere%C3%B1o.colombia.jpg';

const PHOTOS = [
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Ajiaco-santafere%C3%B1o.colombia.jpg/960px-Ajiaco-santafere%C3%B1o.colombia.jpg',
    caption: 'El ajiaco santafereno, el plato rey de Bogota'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Bandeja_Paisa.jpg/960px-Bandeja_Paisa.jpg',
    caption: 'La bandeja paisa, el banquete de la region andina'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg/960px-Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg',
    caption: 'Chocolate santafereno con queso en la Puerta Falsa'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Empanada_colombiana.jpg/960px-Empanada_colombiana.jpg',
    caption: 'Empanadas, el snack callejero por excelencia'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Obleas_y_solteritas_0.jpg/960px-Obleas_y_solteritas_0.jpg',
    caption: 'Obleas con arequipe, dulces infaltables de la calle'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Salpic%C3%B3n_de_frutas.jpg',
    caption: 'El salpicon de frutas, el fresco perfecto para la tarde'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Fruit_in_Colombia.jpg/960px-Fruit_in_Colombia.jpg',
    caption: 'Frutas exoticas en los mercados bogotanos'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Caf%C3%A9_colombiano_Santa_Clara.jpg/960px-Caf%C3%A9_colombiano_Santa_Clara.jpg',
    caption: 'El cafe de especialidad, la nueva joya gastronomica de la ciudad'
  }
];

const BASE = {
  slug: SLUG,
  nombre: 'Bogota a la mesa: ajiaco, mercados, dulces callejeros y cafes de especialidad',
  categoria_slug: 'blog',
  lead: 'Una guia gastronomica completa de Bogota: el ajiaco santafereno y la bandeja paisa, el chocolate con queso, las empanadas y obleas de la calle, las frutas exoticas, los mercados de Paloquemao y La Perseverancia, y la revolucion del cafe de especialidad. Precios, horarios, zonas y consejos para comer como un local.',
  descripcion: `Comer en Bogota es mucho mas que alimentarse: es una forma de entender la ciudad. La capital colombiana levanto sobre la sabana andina, a 2.640 metros de altura, una de las cocinas mas variadas y sorprendentes del continente. Aqui conviven el ajiaco de los domingos en familia, la empanada de la esquina a las diez de la manana, el chocolate con queso de los desayunos de niebla, la chicha de tradicion muisca y una nueva generacion de cafes de especialidad que puso a la ciudad en el mapa mundial de la gastronomia. Esta guia reune los platos que no puedes dejar de probar, los mercados donde se esconde el sabor de verdad, los dulces callejeros, los precios y las zonas donde la cocina bogotana brilla.

Hay razones mas profundas detras de este festival de sabores. La altitud de la ciudad cambia los tiempos de coccion (el agua hierve a menor temperatura), lo que obliga a los chefs a dominar tecnicas que no se ensenan en otras latitudes. La sabana ofrece productos unicos: papa criolla, guasca, quinua, hortalizas y frutas que alimentaron la cocina santaferena durante siglos. Y la mezcla de migraciones, de los espanoles a los inmigrantes del siglo veinte, convirtio a Bogota en un crisol gastronomico. Comer en Bogota es, literalmente, probar la historia de la ciudad.

Empecemos por el plato insignia: el ajiaco santafereno. No es cualquier sopa: es un plato de domingo, de celebracion, de navidad y de reunion familiar. Se prepara con tres tipos de papa (la papa criolla, que se deshace y espesa el caldo; la sabanera y la pastusa), pollo, maiz y guasca, una hierba andina que le da ese sabor inconfundible. Se sirve acompanado de alcaparras, crema de leche y aguacate, y cada comensal arma su plato a su gusto. Es caliente, contundente y reconfortante, perfecto para el clima frio de la capital. Hay quien dice que el ajiaco cura el alma; lo que es seguro es que deja el estomago feliz.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Ajiaco-santafere%C3%B1o.colombia.jpg/960px-Ajiaco-santafere%C3%B1o.colombia.jpg|El ajiaco santafereno, el plato rey de Bogota]

Para probar el ajiaco como se debe, la referencia historica es la Puerta Falsa, en la calle 11 con carrera 6, uno de los restaurantes mas antiguos de la ciudad y parada obligada de cualquier recorrido por La Candelaria. Pero el ajiaco se sirve en toda la ciudad: en los restaurantes de la zona universitaria del centro, en los comedores de La Perseverancia y en las fondas de los barrios tradicionales. Los bogotanos defienden cada version, y la verdad es que no hay una mala. La regla es llegar con hambre y pedir el ajiaco acompanado de arroz, que en Bogota es casi obligatorio.

Ademas del ajiaco, la cocina andina tiene otros pesos pesados. La bandeja paisa, nacida en la region antioquena pero adoptada por toda Colombia, es un banquete: arroz, frijoles, carne molida, chicharron, huevo frito, chorizo, tajada de platano maduro, arepa y aguacate en un mismo plato. No es un plato, es un desafio, y en Bogota se sirve en las principales cadenas de comida tipica y en los restaurantes del centro. El tamal, envuelto en hoja de platano, y la mazamorra con panela son otros clasicos que vale la pena sumar a la lista.

Bogota es tambien el punto donde se encuentran las cocinas de todo el pais. La lechona tolimense, el sancocho de la costa, las hormigas culonas de Santander, el mote de queso del Caribe, el mute santandereano y los platos de la cocina amazonica se sirven en los restaurantes del centro y en las ferias gastronomicas de la ciudad. En Bogota puedes recorrer Colombia entera sin salir de la capital, y cada inmigrante trajo consigo su receta de la casa. Para el viajero con apetito curioso, esa diversidad es el mejor de los regalos.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Bandeja_Paisa.jpg/960px-Bandeja_Paisa.jpg|La bandeja paisa, el banquete de la region andina]

El dia en Bogota empieza con desayunos que son una religion. El protagonista es el chocolate santafereno: chocolate caliente espeso y especiado, que se acompana con queso fresco para derretir dentro de la taza o para morder entre sorbo y sorbo. Se sirve con almojabana, un panecillo de queso y maiz, y con pan de bono, suave y aromatico. Tambien hay huevos pericos (revueltos con tomate y cebolla), caldo de costilla y arepas con queso. En La Candelaria y en las panaderias tradicionales de toda la ciudad, ese desayuno cuesta entre 8.000 y 18.000 pesos y te deja listo para caminar todo el dia.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg/960px-Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg|Chocolate santafereno con queso en la Puerta Falsa]

La calle es otro restaurante gigante. La empanada es la reina del snack bogotano: masa de maiz frita rellena de carne o pollo, con papa y especias, que se toma con aji y limon. Las arepas (de huevo, de queso, de choclo), las papas rellenas, las carimanolas y los perros calientes estilo colombiano completan la oferta callejera. Se consiguen en puestos, vitrinas y carritos en toda la ciudad, y un buen par de empanadas cuesta entre 3.000 y 6.000 pesos. Para el viajero, probar la calle es casi obligatorio: es donde se esconde el sabor mas autentico.

La panaderia colombiana merece capitulo aparte. La almojabana, el pan de bono, el pandeyuca, los bunuelos de queso y las tortas de la tarde son parte de la rutina bogotana. Los bunuelos son infaltables en diciembre, cuando las panaderias se llenan del aroma navideno. Para el viajero, la panaderia de la esquina es el mejor termometro del dia a dia: alli desayunan, meriendan y conversan los vecinos, y el cafe con pan de bono cuesta una fraccion de lo que pagarias en cualquier cafeteria turistica.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Empanada_colombiana.jpg/960px-Empanada_colombiana.jpg|Empanadas, el snack callejero por excelencia]

Si hay algo que los bogotanos toman en serio, son los dulces. La oblea con arequipe es el clasico por excelencia: dos obleas crujientes rellenas de arequipe, queso, mora, chocolate y otros toppings a eleccion. El salpicon de frutas, con su mezcla de banano, papaya, manzana y otras frutas con hielo, es el fresco perfecto para la tarde. Y no pueden faltar las cocadas, el dulce de leche, los bocadillos de guayaba y las brevas con arequipe. Las vitrinas de dulces de La Candelaria, la calle 17 y las dulcerias tradicionales son un museo de la golosina colombiana.

La temporada decembrina tiene sus propios dulces. Las natillas, las hojuelas, las brevas con arequipe y los dulces de leche llenan las mesas en diciembre, y las panaderias se transforman en fabricas de golosinas navidenas. Aunque viajes en otra epoca, muchas dulcerias tradicionales mantienen estas preparaciones todo el ano. La dulceria de La Candelaria y las vitrinas del centro son el lugar ideal para comprar colaciones, bocadillos y arequipe para llevar a casa.

[foto:https://upload.wikimedia.org/wikipedia/commons/b/b4/Salpic%C3%B3n_de_frutas.jpg|El salpicon de frutas, el fresco perfecto para la tarde]

La generosidad tropical de Colombia llega a la mesa bogotana a traves de sus frutas. Lulo, curuba, guanabana, feijoa, mamoncillo, tomate de arbol, uchuvas y maracuya son apenas el principio de una lista que parece no acabar. Se toman en jugos, en batidos, en salpicones o solas, y son el mejor acompanamiento para cualquier comida. En los mercados y en los puestos de jugos de toda la ciudad, un jugo natural cuesta entre 4.000 y 8.000 pesos. Probar frutas que no existen en tu pais es una de las experiencias mas simples y gratificantes del viaje.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Fruit_in_Colombia.jpg/960px-Fruit_in_Colombia.jpg|Frutas exoticas en los mercados bogotanos]

El corazon de la gastronomia bogotana late en sus plazas de mercado. Paloquemao, al occidente del centro, es la mas famosa: tres pabellones con frutas, verduras, flores, carnes y el mejor cafe del dia entre los pasillos. La Perseverancia, en el centro historico, es la favorita de los foodies, con sus puestos de comida preparada y su famoso desayuno con chocolate. Y los fines de semana, el mercado campesino del Jardin Botanico y las plazas de barrio acercan los productos de la sabana directamente del campesino. Recorrer una plaza de mercado es, en si mismo, un tour gastronomico.

Los mercados tienen sus propios ritmos. La mayoria abren muy temprano, desde las 4 o 5 de la manana, cuando los campesinos llegan con los productos frescos, y empiezan a cerrar hacia las 3 o 4 de la tarde. Para verlos en su mejor momento, la manana es la hora: hay mas producto, mas color, mas ambiente y los puestos de comida preparada ofrecen desayunos y almuerzos del dia. A Paloquemao conviene llegar antes del medio dia; La Perseverancia brilla en el desayuno con su chocolate santafereno y sus almojabanas recien hechas.

El domingo tiene su propio ritual: el ajiaco en familia. Los restaurantes y fondas tradicionales se llenan de grupos que ordenan la sopa por olla para compartir, con todo el acompanamiento sobre la mesa y una sobremesa larga de conversacion. Para el viajero, sumarse a ese ritual es conocer la cara mas humana de Bogota. Busca las fondas de La Candelaria, de La Perseverancia o de los barrios de Chapinero un domingo al mediodia y pide el ajiaco con arroz, aguacate y limon: veras como el tiempo se detiene.

Colombia es un pais cafetero, y Bogota es su mejor vitrina. En las ultimas dos decadas la ciudad vivio una revolucion del cafe de especialidad: baristas que tuestan su propio grano, del Huila, de la Sierra Nevada o del eje cafetero, y que preparan espresso, filtro, cold brew y metodos alternativos con una dedicacion que compite con las mejores capitales del mundo. Los barrios de La Macarena, Chapinero y la Zona G concentran las cafeterias mas premiadas de la capital. Un cafe de especialidad se paga entre 6.000 y 12.000 pesos, y probarlo es entender por que Colombia manda en el mapa mundial del cafe.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Caf%C3%A9_colombiano_Santa_Clara.jpg/960px-Caf%C3%A9_colombiano_Santa_Clara.jpg|El cafe de especialidad, la nueva joya gastronomica de la ciudad]

Las bebidas acompanan cada momento del dia. El tinto, ese cafe negro que se toma en pocillo en todas las esquinas, es la bebida nacional por excelencia. La aguapanela, agua caliente con panela y limon, es el remedio popular contra el frio y el resfriado. Y los jugos naturales, con las frutas de temporada, se piden en cualquier restaurante. Sumale el chocolate de la tarde con queso y la chicha de los bares tradicionales, y tendras un mapa completo de la bebida bogotana.

La bebida mas antigua de la sabana es otra historia. La chicha, fermentada de maiz, es herencia muisca y una de las tradiciones vivas mas fascinantes de la region. En Bogota se puede probar en chicherias del centro y de los barrios populares, y tambien en versiones artesanales modernas en algunos bares de La Candelaria. Es una bebida de sabor fuerte y fermentado, que se toma en ambiente de conversacion y musica. Para el viajero curioso, una parada por una chicheria es un viaje al corazon prehispanico de la ciudad.

La escena de cerveza artesanal tambien crecio al ritmo de la gastronomia. Los brew pubs y las fabricas de cerveza de Chapinero, la Zona G y Teusaquillo ofrecen estilos que van de la lager a la imperial stout, casi siempre con comida de bar bien ejecutada. El maridaje con arepas y empanadas es una combinacion ganadora, y los envases para llevar se volvieron el recuerdo favorito de los cerveceros. Una tarde de tapas y cerveza artesanal es otra cara de la Bogota gastronomica que vale la pena descubrir.

Si buscas alta cocina, Bogota no se queda corta. La Zona G, alrededor de la calle 70 con carrera 7, concentra algunos de los mejores restaurantes de Colombia, con chefs que reinterpretan la cocina andina, amazonica y del Pacifico con tecnica de primer nivel. La Zona T y el Parque de la 93 suman opciones internacionales y terrazas elegantes. Y La Macarena, junto al Parque Nacional, es el barrio bohemio de los restaurantes de autor. Un almuerzo de gama media cuesta entre 40.000 y 80.000 pesos; la alta cocina supera los 120.000 por persona con entrada y postre.

La cocina bogotana tambien mira al mundo. Barrios como Chapinero y la Zona Rosa ofrecen de todo: cocina peruana, mexicana, japonesa, italiana, libanesa, vietnamita y fusion colombiana con cualquier cosa que imagines. Los food trucks y los patios gastronomicos se multiplicaron en los ultimos anos, y la ciudad tiene una escena de cocina de autor joven y valiente. Para el viajero que quiere variedad, Bogota no decepciona: la oferta es tan amplia que es imposible quedarse corto.

Bogota tambien es un destino amigable para vegetarianos y veganos. La cocina colombiana tiene platos que no llevan carne, como la mazamorra, el mute, los envueltos de maiz, las arepas, el ajiaco sin pollo y la enorme oferta de frutas; y la ciudad exploto con restaurantes vegetarianos, veganos y de cocina plant based. La Zona Rosa, Chapinero y La Macarena concentran la mejor oferta sin carnes, con menus creativos que no le piden nada a los clasicos. Comer bien en Bogota no depende de la dieta: depende de saber donde mirar.

Los horarios de comida tienen su logica. El almuerzo se sirve entre las 12 del mediodia y las 3 de la tarde, con las fondas y los restaurantes de comida tipica llenos entre la 1 y las 2. La cena arranca hacia las 7 de la noche y los restaurantes se llenan entre las 8 y las 9. Las panaderias abren temprano, desde las 6 o 7 de la manana, y los puestos de empanadas funcionan todo el dia. En los restaurantes, la propina del 10 por ciento suele estar incluida en la cuenta, asi que no hace falta dejar extra.

El presupuesto gastronomico es tan flexible como la ciudad. Un dia comiendo en la calle y en fondas cuesta entre 30.000 y 60.000 pesos: empanadas de desayuno, almuerzo del dia en una fonda con sopa, plato fuerte y jugo, y una oblea de postre. Comer en restaurantes de nivel medio sube el rango a 80.000-150.000 pesos diarios. Y quien quiera una experiencia de alta cocina, la cena en un restaurante de la Zona G parte de 120.000 pesos por persona. La relacion calidad-precio de Bogota sigue siendo uno de sus mayores atractivos.

La logistica de los museos y la comida se combina perfectamente. Cerca del Museo del Oro, La Candelaria ofrece almuerzos ejecutivos en la zona universitaria desde 15.000 pesos. Junto al Museo Botero, las fondas de la calle 12 sirven ajiaco y bandeja paisa. Y en la calle 26, la plaza de La Perseverancia es el almuerzo perfecto despues del recorrido por el arte urbano. La regla es simple: programa el almuerzo alrededor de la zona que visitas y ganaras tiempo y dinero.

Si quieres profundizar, existen tours gastronomicos que recorren los sabores de la ciudad con guia. El mas popular combina La Candelaria con degustaciones de ajiaco, chocolate santafereno, chicha y frutas locales; otros se enfocan en los mercados y en la comida callejera. Los tours cuestan entre 45.000 y 90.000 pesos por persona, duran entre 3 y 4 horas y suelen incluir varias degustaciones. Son una forma eficiente de conocer el mapa gastronomico sin improvisar, y los guias cuentan historias que no aparecen en ninguna guia.

La escena gastronomica joven se mueve en patios y mercados nocturnos. Barrios como el Parkway en Teusaquillo y los patios gastronomicos del centro y de Chapinero reunen food trucks y puestos de cocina emergente bajo un mismo techo, con mesas compartidas y musica. Estos espacios son la cara mas moderna de la comida bogotana: alli conviven la arepa de huevo, el ramen, el taco y el sushi, y los precios se mantienen razonables. Para el viajero joven, un patio gastronomico es el plan perfecto para una noche.

Algunos consejos practicos para comer bien en Bogota. Lleva efectivo en billetes pequenos, porque en los mercados y en la calle no siempre hay datafono. Prueba un plato nuevo cada dia y no te limites al ajiaco: hay cientos de sopas, guisos y fritangas por descubrir. Ten cuidado con el nivel de picante del aji cuando pidas comida callejera, porque el aji colombiano es bravo. Y recuerda la altitud: la ciudad esta a 2.640 metros, asi que hidratate bien y evita los excesos de alcohol el primer dia, cuando el cuerpo esta adaptandose.

Si quieres llevarte un pedazo de la gastronomia bogotana, las tiendas de delicatessen y las plazas ofrecen regalos perfectos: cafe tostado de especialidad, chocolate santafereno en tableta, bocadillos de guayaba, arequipe, dulces de leche y panela organica. Los supermercados y las tiendas de productos tipicos de La Candelaria y de Paloquemao tienen empaques listos para el viaje. Una mochila llena de sabores colombianos es el mejor recuerdo (y el mas rico).

La gastronomia bogotana es, en el fondo, un espejo de la ciudad: diversa, calida, sorprendente y llena de contrastes. Del ajiaco de la abuela al cold brew de la cafeteria de La Macarena, de la chicha de los muiscas a la bandeja paisa de mil calorias, cada bocado cuenta una historia. Nuestra recomendacion final es simple: llega con hambre, camina mucho, pregunta a los locales, pruebalo todo y deja que Bogota te sorprenda a la mesa. Porque en esta ciudad, cada comida es un viaje.`,
  highlight: 'Del ajiaco santafereno al cafe de especialidad: los sabores que definen a Bogota, con precios, mercados, dulces callejeros y consejos para comer como un local',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Toda la ciudad (Paloquemao, La Candelaria, La Macarena, Zona G)',
  lat: 4.6505,
  lng: -74.06,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.bogota.gov.co',
  instagram: '@bogota',
  precio_desde: '',
  horario: '',
  emoji: '\ud83c\udf7d\ufe0f',
  hero_bg: '#7a4419',
  tipo: 'Blog - Guia gastronomica',
  capacidad: '',
  como_llegar: 'Mercados y zonas gastronomicas distribuidas en la ciudad: Paloquemao (TransMilenio Paloquemao), La Perseverancia (centro), La Macarena y Zona G (Chapinero).',
  status: 'published',
  destacado: true
};

const TAGS = {
  tema: 'gastro',
  temas: ['gastro', 'cultura'],
  video_url: ''
};

const FAQS = [];

const FOTOS_GALERIA = PHOTOS.slice(1).map(function(p, i) {
  return { url: p.url, caption: p.caption, orden: i + 1 };
});

module.exports = { SLUG, HERO, PHOTOS, BASE, TAGS, FAQS, FOTOS_GALERIA };