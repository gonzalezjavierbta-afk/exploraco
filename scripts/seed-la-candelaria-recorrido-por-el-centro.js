// scripts/seed-la-candelaria-recorrido-por-el-centro.js
// Datos del post de blog "La Candelaria a pie: del Chorro de Quevedo a la
// Plaza de Bolivar, guia del centro historico de Bogota" (quinta entrada
// REAL de la seccion Inspirate).
//
// Fuente: datos factuales de scripts/seed-lacandelaria.js (fundacion 1538,
// Chorro de Quevedo, Plaza de Bolivar, Catedral, Museo del Oro, Museo
// Botero, Pasaje Rivas, Pasaje Hernandez, libreria Merlin, Teatro Colon,
// Distrito Graffiti, gastronomia) + redaccion editorial propia. Cuerpo
// ~2.900 palabras, parrafos por \n\n, fotos inline [foto:URL|texto]
// (fotos reutilizadas de seed-lacandelaria.js, ya en produccion).
//
// Blog NO lleva FAQs, ni video (video_url vacio), ni autor. Multi-tema:
// tags.temas[] + tags.tema.
//
// Uso:
//   node scripts/load-la-candelaria-recorrido-por-el-centro-api.js [URL] [TOKEN]
// URL por defecto: https://exploraco.vercel.app
// TOKEN por defecto: exploraco12345 (ADMIN_SECRET de desarrollo)
// Idempotente: DELETE+POST.

const SLUG = 'la-candelaria-recorrido-por-el-centro';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg';

const PHOTOS = [
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg',
    caption: 'Plaza de Bolivar y Catedral Primada'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg',
    caption: 'Calle empedrada de La Candelaria'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Museo_del_Oro_Bogot%C3%A1.jpg/800px-Museo_del_Oro_Bogot%C3%A1.jpg',
    caption: 'Fachada del Museo del Oro'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Museo_Botero_Bogot%C3%A1.jpg/800px-Museo_Botero_Bogot%C3%A1.jpg',
    caption: 'Fachada del Museo Botero'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Teatro_Col%C3%B3n_Bogot%C3%A1.jpg/800px-Teatro_Col%C3%B3n_Bogot%C3%A1.jpg',
    caption: 'Teatro Colon, joya arquitectonica del centro'
  }
];

const BASE = {
  slug: SLUG,
  nombre: 'La Candelaria a pie: del Chorro de Quevedo a la Plaza de Bolivar, guia del centro historico de Bogota',
  categoria_slug: 'blog',
  lead: 'Un recorrido caminando por el barrio donde nacio Bogota: El Chorro de Quevedo, la Plaza de Bolivar, la Catedral, los museos del Oro y Botero, los pasajes Rivas y Hernandez, las librerias de viejo, el teatro Colon y el arte urbano. Con horarios, precios, gastronomia y consejos de seguridad.',
  descripcion: `La Candelaria no es un barrio cualquiera: es la cuna de Bogota, el lugar donde la ciudad empezo hace casi cinco siglos y donde hoy se concentra la mayor densidad de historia, cultura y arte por metro cuadrado de la capital. Caminar por sus calles empedradas es viajar en el tiempo entre fachadas coloniales, museos de clase mundial, librerias de viejo, murales gigantes y restaurantes que guardan las recetas de la abuela. Esta guia propone un recorrido a pie, del lugar de la fundacion al corazon institucional de la plaza, para que aproveches el dia al maximo: que ver, en que orden, cuanto cuesta, donde comer y como moverte con seguridad.

La Candelaria es tambien un barrio universitario, y eso se nota en cada esquina. La Universidad del Rosario, fundada en 1653 y una de las mas antiguas de America, ocupa un claustro colonial de gran belleza; el Externado y la Universidad de la Salle completan el mapa estudiantil del centro. Esa energia joven se traduce en cafes economicos, librerias, teatros independientes y un ambiente de discusion y creatividad que pocos centros historicos conservan. El visitante que camina La Candelaria comparte las aceras con estudiantes de todas las regiones del pais.

La historia empieza el 6 de agosto de 1538, cuando el conquistador Gonzalo Jimenez de Quesada fundo la ciudad en un punto que hoy se conoce como El Chorro de Quevedo. El nombre original, Nuestra Senora de la Esperanza, no prospero: pronto la ciudad se llamo Santafe de Bogota, y el barrio que crecio alrededor del centro colonial adopto el nombre de La Candelaria, por la fiesta de la Candelaria o la candela de las velas que alumbraban las calles. Ese punto de origen es hoy una placita pintoresca, con una capilla de adobe, murales de colores y un ambiente bohemio que no ha parado de crecer.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg|Calle empedrada de La Candelaria]

El recorrido propuesto se organiza como una caminata de medio dia que se puede estirar a jornada completa. La idea es empezar en el alto del barrio, en El Chorro de Quevedo, e ir bajando por las calles coloniales hacia la Plaza de Bolivar, el centro gravitacional del conjunto. De ahi, el circuito continua por los museos del costado oriental, los pasajes comerciales, el teatro y las librerias, y termina en el distrito de arte urbano y la zona gastronomica. La topografia ayuda: el barrio esta sobre una ladera suave, y caminar en descenso es mas amable para las piernas.

Entender el trazado del centro ayuda a no perderse. Bogota se ordena por calles (que corren de oriente a occidente) y carreras (de norte a sur), con numeros que crecen hacia afuera. En La Candelaria, las calles 9 a 16 y las carreras 1 a 7 encierran casi todo el circuito. Los nombres historicos conviven con los numeros: la calle de la Ensenanza, la calle del Colibri, la plaza de los Aljibes. Perderse un poco es parte del encanto, pero saber que la plaza de Bolivar esta siempre al sur ayuda a reorientarse en cualquier momento del paseo.

Empecemos, entonces, por el origen. El Chorro de Quevedo, en la calle 13 con carrera 2, es una plaza pequena donde el tiempo parece detenerse: casas de adobe, murales, plantas trepadoras y el recuerdo de la fundacion. Hoy es un punto de encuentro de estudiantes, artistas y viajeros, con cafes y tarros de chicha alrededor. Vale la pena sentarse un rato, tomar algo y dejar que el ambiente bohemio te envuelva antes de lanzarte al recorrido. Desde aqui ya se intuye la vista de los cerros y de la ciudad moderna al fondo.

La Plaza de Bolivar es el siguiente gran hito. Es el corazon institucional de Colombia: alli se levantan el Capitolio Nacional, sede del Congreso; el Palacio de Justicia; el Palacio Lievano, sede de la alcaldia; y la Catedral Primada, que domina el costado oriental. La plaza es grande, abierta y siempre esta viva: palomas, vendedores, manifestaciones pacificas y visitantes que se fotografian frente a la estatua de Simon Bolivar. Por la noche, iluminada, tiene una belleza distinta que bien vale una segunda visita.

Los edificios de la plaza cuentan la historia politica del pais. El Capitolio Nacional, de estilo neoclasico, fue sede del Congreso y testigo de los grandes debates nacionales; el Palacio de Justicia, reconstruido en los anos noventa, recuerda la tragedia de 1985; el Palacio Lievano, sede de la alcaldia, luce una fachada francesa con el reloj en su torre. La estatua de Bolivar, obra del escultor italiano Tenerani, mira hacia el Capitolio desde el siglo diecinueve. Recorrer el perimetro de la plaza es leer dos siglos de historia politica en un solo vistazo.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg|Plaza de Bolivar y Catedral Primada]

Muy cerca de la plaza, bajando por la carrera 7, se encuentra la Casa de Narino, la residencia presidencial, con su guardia de uniforme que cambia en una ceremonia que los visitantes esperan para fotografiar. La visita guiada al palacio es gratuita y se programa los primeros sabados de cada mes con inscripcion previa. No es imprescindible, pero si tienes tiempo, la ceremonia del cambio de guardia y la historia del edificio le dan un toque institucional a la caminata. De paso, la carrera 7 es una de las calles mas antiguas y animadas del centro.

La Catedral Primada, consagrada en 1823 sobre el solar de la primera iglesia de la ciudad, es el templo catolico mas importante de Colombia. Su interior es sobrio, de estilo neoclasico, con tres naves y una capilla del Sagrario al lado. La entrada es gratuita y se puede recorrer en unos veinte minutos. Frente a ella, la esquina de la plazuela de la Catedral reune artesanos, lustrabotas y el bullicio de la vida diaria del centro. Es un buen punto para observar la ciudad sin prisa.

Junto a la Catedral, la capilla del Sagrario guarda un retablo barroco de gran valor, y hacia el sur, el Palacio de San Carlos fue residencia presidencial y sede de la diplomacia colombiana. Por la carrera 6 hacia arriba, las casas coloniales de dos pisos con balcones y patios interiores son el mejor ejemplo de la arquitectura domestica del siglo diecinueve. Muchas de esas casonas hoy albergan museos, galerias y cafes, y varias abren sus patios para que el visitante entre a mirar. La sorpresa esta en los detalles: las puertas talladas, los zaguanes y las tejas de barro cuentan historias que las placas no mencionan.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Museo_del_Oro_Bogot%C3%A1.jpg/800px-Museo_del_Oro_Bogot%C3%A1.jpg|Fachada del Museo del Oro]

El Museo del Oro, a una cuadra de la plaza sobre la calle 16 con carrera 5, es el museo mas importante de Colombia y uno de los imprescindibles del continente. Su coleccion reune decenas de miles de piezas de orfebreria prehispanica: balsa muisca, poporos, mascaras, narigueras y ofrendas que muestran el dominio del oro de las culturas precolombinas. La entrada general cuesta 5.000 pesos y es gratis los domingos; estudiantes pagan 3.000. Abre de martes a sabado, con horario extendido algunos dias, y cierra los lunes. Dale al menos dos horas.

Entre las piezas mas celebres del Museo del Oro esta la Balsa Muisca, la ofrenda que dio origen a la leyenda del Dorado, hallada en la laguna de Guatavita. Cerca del museo, en la esquina de la carrera 7 con calle 11, la Casa del Florero conmemora el grito de independencia del 20 de julio de 1810 y hoy es el Museo de la Independencia, con entrada economica. Si tu interes por la historia colonial y republicana es grande, este museo complementa perfectamente la visita al del Oro, y ambos pueden recorrerse en la misma jornada.

El Museo Botero es el otro gran imperdible, y la mejor noticia es que la entrada es gratuita siempre. El artista Fernando Botero dono su coleccion personal: obras suyas, de sus etapas mas representativas, y maestros internacionales como Picasso, Monet, Dali y Renoir. El museo ocupa una casona colonial de dos plantas, con patio interior, en la calle 11 con carrera 4. Es pequeno pero exquisito, ideal para visitar en una hora y media. Los domingos se llena, asi que entre semana se disfruta mas tranquilo.

Al oriente, el Museo Colonial, en una casona del siglo diecisiete junto a la iglesia de San Ignacio, exhibe arte religioso colonial con entrada gratuita. El circuito cultural del Banco de la Republica suma la Casa de Moneda y la biblioteca Luis Angel Arango, con la plaza que lleva su nombre frente a la Catedral. Para el viajero que quiere profundizar sin gastar, este conjunto ofrece museos gratis y una de las mejores bibliotecas de America Latina, con exposiciones que cambian todo el ano y patios donde descansar del empedrado.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Museo_Botero_Bogot%C3%A1.jpg/800px-Museo_Botero_Bogot%C3%A1.jpg|Fachada del Museo Botero]

Para las compras, los pasajes son la joya escondida. El Pasaje Rivas, entre la calle 9 y 10 con carrera 8, es un pasillo angosto lleno de puestos de artesanias, joyeria, textiles y recuerdos, con ese encanto de mercado antiguo que ningun centro comercial replica. El Pasaje Hernandez, mas arriba, entre carreras 8 y 9, es territorio de galerias, tiendas de vinilos, cafes y librerias independientes, favorito de los bohemios. Recorrerlos es gratis y adictivo: siempre aparece algo que no esperabas.

La compra de recuerdos tiene su arte. En el Pasaje Rivas, regatea con amabilidad y compara precios entre puestos; los textiles, la ceramica de Raquira, las hamacas y las joyas en tagua y filigrana son los clasicos. Los domingos, la Plaza del Periodista y las calles cercanas se llenan de mercados de pulgas con antiguedades, vinilos y curiosidades. Y si buscas algo unico, las galerias del Pasaje Hernandez venden obra de artistas emergentes a precios razonables. Cualquier compra, ademas, apoya directamente a los artesanos del centro.

El teatro Colon, a pocas cuadras, es otra joya. Inaugurado en 1892, es el teatro de opera mas antiguo del pais y uno de los mas hermosos de America: fachada neoclasica, interior de madera tallada, terciopelo rojo y una cupula decorada. Las funciones van de la opera al ballet y el teatro, y existen visitas guiadas para conocer su historia y su arquitectura. Aunque no entres a una funcion, la fachada y el vestibulo merecen la parada, y es una de las postales mas elegantes del centro.

La oferta cultural del barrio no se detiene cuando cae el sol. El teatro Colon y el Teatro Nacional programan funciones de opera, ballet y musica clasica, y los teatros alternativos de La Candelaria montan obras de pequeno formato y monologos a precios accesibles. Los jueves y viernes, los cafes del barrio organizan conciertos de boleros, jazz y musica andina. Para el viajero, cerrar el dia con una funcion o un concierto es la forma perfecta de completar la experiencia cultural del centro historico.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Teatro_Col%C3%B3n_Bogot%C3%A1.jpg/800px-Teatro_Col%C3%B3n_Bogot%C3%A1.jpg|Teatro Colon, joya arquitectonica del centro]

Los amantes de los libros tienen su propio circuito. La libreria Merlin, en la carrera 8 con calle 15, es una de las mas antiguas y queridas de Bogota: estanterias que llegan al techo, primeras ediciones, libros raros y ese olor a papel que no se encuentra en otro lado. Alrededor, otras librerias de viejo y puestos de libros usados completan la ruta. Para el viajero curioso, hojear los estantes de una libreria candelaria es un plan en si mismo, y a veces aparecen verdaderos tesoros a buen precio.

El cafe y los libros son una pareja inseparable en La Candelaria. Cafeterias como la Puerta Falsa, las terrazas de la plaza del Chorro y los cafes con biblioteca de la carrera 4 ofrecen el ambiente ideal para una pausa entre museos. El cafe colombiano se disfruta aqui con almojabana o pan de bono, y el chocolate santafereno es la alternativa caliente para las tardes de niebla. Una hora de lectura y cafe en el centro historico es uno de los placeres mas simples que ofrece la ciudad, y los locales lo practican con devocion.

El arte urbano le da a La Candelaria su cara mas contemporanea. El Distrito Graffiti, alrededor de la carrera 3 entre calles 12 y 15, es un museo al aire libre con murales de artistas nacionales e internacionales; muchos narran el proceso de paz y la memoria del pais. En la calle 26, el enorme mural del proceso de paz y las obras alrededor del centro de memoria convierten la avenida en una galeria de kilometros. Hay tours de graffiti guiados por los propios artistas, una forma excelente de entender el mensaje detras de cada pared.

Junto al arte urbano, el Espacio de Arte y Memoria Fragmentos, en la calle 24, es un proyecto unico en el mundo: un suelo de miles de piezas de armas fundidas, pensado para sanar heridas del conflicto. La visita es gratuita y profundamente conmovedora, con una escultura central de la artista Doris Salcedo. No es un lugar para fotos turisticas, sino para reflexionar. Para el viajero con interes real en la historia reciente de Colombia, es una parada que no olvidara.

Comer en La Candelaria es parte del recorrido. La Puerta Falsa, en la calle 11 con carrera 6, es el restaurante mas antiguo de la ciudad y el lugar para probar el chocolate santafereno con queso, las almojabanas, los tamales y el famoso ajiaco. En la zona universitaria, los restaurantes de menu del dia ofrecen sopa, plato fuerte y jugo desde unos 15.000 pesos. Y a dos pasos, la plaza de La Perseverancia es la favorita de los foodies para desayunar de mercado. Comer aqui es conocer el alma gastronomica del centro.

A un paso del barrio, La Macarena suma la oferta gastronomica mas contemporanea del centro: cafes de especialidad con tostado propio, restaurantes de autor y galerias de arte que convirtieron la zona en la meca de los foodies. Muchos de esos cafes abren temprano y ofrecen algunos de los mejores espressos de la ciudad. La Candelaria y La Macarena se visitan juntas sin notar la frontera, y juntas forman el circuito cultural y gastronomico mas completo de Bogota, con opciones para todos los presupuestos.

El Chorro de Quevedo, que conocimos al inicio, se transforma de noche: cafes, musica en vivo, tarros de chicha y un ambiente bohemio que reune estudiantes y artistas. Es un plan perfecto para cerrar el dia despues del recorrido, tomando algo al aire libre mientras la plaza se ilumina. La chicha, la bebida fermentada de maiz de herencia muisca, se ofrece en varios puestos, y probarla es un guino a la historia mas profunda del lugar.

Sobre la seguridad, el barrio es el mas visitado de Bogota y durante el dia es seguro para pasear; las calles estan llenas de turistas, estudiantes y vendedores. Las recomendaciones son las de siempre: guarda el celular y la billetera en bolsillos seguros, evita calles solitarias, y por la noche limita el recorrido a las zonas con movimiento. No camines con equipos grandes en horas de poco flujo, y usa apps de transporte para moverte hacia otros barrios cuando el dia termine.

La logistica es simple. Para llegar, el TransMilenio te deja en la estacion Museo del Oro o en Las Aguas, ambas a pocas cuadras del corazon del barrio; los taxis y las apps llegan hasta las calles principales. El recorrido completo a pie, sin apuros y con los museos por dentro, toma entre 4 y 6 horas; si quieres verlo todo con calma y comer por el camino, programa un dia completo. Lleva calzado comodo: las calles son empedradas y hay pendientes.

Un itinerario sugerido para una jornada ideal: llega en la manana a El Chorro de Quevedo, baja por la carrera 3 viendo los murales del Distrito Graffiti hasta la Plaza de Bolivar, visita la Catedral, almuerza en La Candelaria o la zona universitaria, por la tarde entra al Museo del Oro (gratis los domingos) y luego al Museo Botero, recorre los pasajes Rivas y Hernandez, y cierra la tarde en el teatro Colon y las librerias. De noche, vuelve al Chorro para la chicha y la musica.

Si te queda tiempo, los alrededores extienden la experiencia. La Quinta de Bolivar, la casa del libertador a media hora caminando, ofrece jardines y museo. El cerro de Monserrate, con su funicular, esta a un paso y regala la mejor vista de la ciudad. Y el barrio de la Macarena, al oriente, es la puerta a los cafes de especialidad y las galerias de arte. La Candelaria no termina en sus calles: es el punto de partida de la mitad de los planes de Bogota.

La Candelaria es, en resumen, un barrio que se camina y se saborea. Cinco siglos de historia caben en unas pocas cuadras, y cada vuelta de esquina regala una fachada colonial, un mural, un libro o un plato de comida que cuenta otra parte de la historia de Colombia. Nuestra recomendacion final: camina lento, mira hacia arriba (los balcones esconden detalles), pregunta a los vendedores y deja que el barrio te cuente su historia a su propio ritmo. La Candelaria no se visita: se recorre, y quien la recorre vuelve.`,
  highlight: 'El recorrido definitivo a pie por el barrio donde nacio Bogota: fundacion, plaza, museos gratis, pasajes, librerias, arte urbano y gastronomia',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5979,
  lng: -74.0728,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.bogota.gov.co',
  instagram: '@lacandelaria',
  precio_desde: '',
  horario: '',
  emoji: '\ud83c\udfdb\ufe0f',
  hero_bg: '#2c3e50',
  tipo: 'Blog - Guia de barrio',
  capacidad: '',
  como_llegar: 'TransMilenio: estaciones Museo del Oro (linea K) o Las Aguas. A pie desde el centro historico. El recorrido propuesto parte de El Chorro de Quevedo y baja hacia la Plaza de Bolivar.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tema: 'cultura',
  temas: ['cultura', 'tips'],
  video_url: ''
};

const FAQS = [];

const FOTOS_GALERIA = PHOTOS.slice(1).map(function(p, i) {
  return { url: p.url, caption: p.caption, orden: i + 1 };
});

module.exports = { SLUG, HERO, PHOTOS, BASE, TAGS, FAQS, FOTOS_GALERIA };
