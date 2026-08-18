// scripts/seed-theatron-guia.js
// Datos del post de blog "Theatron: la noche mas inclusiva de Bogota
// en 20 salas - guia completa para bailar hasta el amanecer"
// (segunda entrada REAL de la seccion Inspirate, tras
// monserrate-guia-completa.html).
//
// Fuente: datos factuales de scripts/seed-theatron.js (ficha del club
// en categoria sitio) + redaccion editorial propia en el mismo tono
// que la guia de Monserrate. Cuerpo ~2.900 palabras en descripcion
// (TEXT), parrafos separados por \n\n y fotos inline con el marcador
// [foto:URL|texto] que parsea api/pagina-destino.js (parseBlogBody).
//
// Blog NO lleva FAQs (la seccion FAQ se omite en articulos), ni video
// (video_url vacio), ni autor asignado (sin id_autor hasta que se
// asigne desde admin.html). Multi-tema: tags.temas[] + tags.tema.
//
// Uso:
//   node scripts/load-theatron-guia-api.js [URL] [TOKEN]
// URL por defecto: https://exploraco.vercel.app
// TOKEN por defecto: exploraco12345 (ADMIN_SECRET de desarrollo)
// Idempotente: DELETE+POST (patron load-monserrate-guia-api.js).

const SLUG = 'theatron-guia-completa';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Zona_rosa%28Bogot%C3%A1%29.jpg/960px-Zona_rosa%28Bogot%C3%A1%29.jpg';

const PHOTOS = [
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Zona_rosa%28Bogot%C3%A1%29.jpg/960px-Zona_rosa%28Bogot%C3%A1%29.jpg',
    caption: 'El eje de la Zona Rosa, cerca del corazon nocturno de Chapinero'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG',
    caption: 'Chapinero de noche, el escenario donde se mueve el Chapigay'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bogota_Chapinero_calle_63.JPG/960px-Bogota_Chapinero_calle_63.JPG',
    caption: 'La calle 63, otro eje nocturno del barrio'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bogot%C3%A1_Parque_de_la_93.JPG/960px-Bogot%C3%A1_Parque_de_la_93.JPG',
    caption: 'El Parque de la 93, otro corazon nocturno de la ciudad'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Bogot%C3%A1_Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes_en_Chapinero.JPG/960px-Bogot%C3%A1_Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes_en_Chapinero.JPG',
    caption: 'La iglesia de Lourdes, icono de Chapinero'
  }
];

const BASE = {
  slug: SLUG,
  nombre: 'Theatron: la noche mas inclusiva de Bogota en 20 salas - guia completa para bailar hasta el amanecer',
  categoria_slug: 'blog',
  lead: 'Theatron es el megaclub mas grande de Latinoamerica y el corazon del Chapigay: veinte salas tematicas, shows drag y una fiesta inclusiva en un antiguo teatro de la calle 58. Esta guia reune su historia, la musica de cada sala, los precios, los horarios, como llegar y todos los consejos para bailar hasta el amanecer.',
  descripcion: `Cuando hablamos de la vida nocturna en Bogota hay un nombre que se repite antes que cualquier otro: Theatron. No es una discoteca mas: es el megaclub mas grande de Latinoamerica, el corazon de la escena LGBTQ+ de la capital y, desde 2002, el epicentro del conocido Chapigay. Lo que alguna vez fue un teatro tradicional de Chapinero se convirtio en un universo de veinte salas, miles de personas y una fiesta que no distingue genero, orientacion ni procedencia. Esta guia completa reune todo lo que necesitas saber para vivir una noche inolvidable en Theatron: su historia, sus salas, la musica que suena en cada una, los shows drag, los precios, los horarios, como llegar y los consejos practicos para que tu primera visita sea perfecta.

La historia de Theatron comienza con una de esas transformaciones que solo la noche sabia hacer. En la calle 58 con carrera 10 de Chapinero existia un teatro con vocacion de gran sala, de esos que alguna vez llenaron la cartelera cultural de Bogota. En 2002, ese mismo espacio se reinvento como discoteca y nacio Theatron: un club multiformato que aprovecho la altura de sus techos y la distribucion de sus escenarios para crear algo inedito en la ciudad. Lejos de ser un saloon de una sola pista, Theatron se diseno como un laberinto de experiencias.

Lo que empezo como una apuesta arriesgada en un edificio con historia se convirtio en un referente que la propia ciudad adopto. Theatron crecio con Bogota, sobrevivio a los cambios de la industria nocturna, al impacto de las redes sociales y a la competencia de las fiestas mas intimas, y demostro que un club grande tambien puede sentirse cercano. Parte de su secreto esta en ese equilibrio: escala de megaclub, trato de barrio.

Con los anos, la esquina de Theatron dejo de ser un punto y se convirtio en un eje. La calle 58, entre la carrera 10 y la carrera 11, se lleno de bares, cafeterias, gastrobares y terrazas de ambiente inclusivo. Los bogotanos la bautizaron Chapigay, y hoy es el corazon de la escena LGBTQ+ de la capital. Llegar a Theatron no es solo entrar a bailar: es sumergirse en un barrio que respira fiesta, tolerancia y cultura desde la previa hasta la madrugada.

El Chapigay no nacio de la nada: fue una construccion colectiva de la comunidad, de los bares y de una discoteca que entendio que la noche tambien puede ser territorio de pertenencia. Hoy esa esquina es punto de encuentro de turistas que vienen por Theatron, de parejas que celebran aniversarios y de generaciones enteras que aprendieron a bailar en sus salas. Pocos lugares de Bogota concentran tanta memoria, tanta musica y tanta vida en tan pocos metros cuadrados.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Bogot%C3%A1_Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes_en_Chapinero.JPG/960px-Bogot%C3%A1_Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes_en_Chapinero.JPG|La iglesia de Lourdes, icono del barrio que abraza la noche del Chapigay]

La promesa de Theatron se resume en un numero que impresiona a cualquiera: veinte salas tematicas repartidas en varios pisos del antiguo teatro, con capacidad para recibir entre cinco mil y siete mil personas en una misma noche. Cada sala tiene su propio nombre, su propia estetica y, sobre todo, su propia musica. La experiencia completa puede tomarte entre tres y cinco horas, y aun asi es probable que descubras una esquina que te habia quedado pendiente.

Recorrer las veinte salas no es un capricho: es la forma en que Theatron fue disenado. El antiguo teatro se distribuyo en varios pisos, y cada nivel tiene su propia atmosfera y su propio volumen. Hay salas al lado de la pista principal, otras en el subsuelo, una terraza arriba y un jardin afuera. La recomendacion de los asiduos es no quedarse en la primera sala que veas: la noche cambia por completo cuando subes o bajas una planta.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Zona_rosa%28Bogot%C3%A1%29.jpg/960px-Zona_rosa%28Bogot%C3%A1%29.jpg|El eje de la Zona Rosa, cerca del corazon nocturno de Chapinero]

Si es tu primera vez, conviene empezar por las salas historicas. Theatron, la sala principal, es el corazon de la casa: una pista grande con pantallas, luces y la energia de miles de personas bailando juntas. A su lado, Teatrino aprovecha la vocacion original del edificio y conserva el aire de escenario de teatro. El Muro y Eva completan el nucleo de las salas clasicas, cada una con su propio publico y su propio genero musical. Recorrerlas en orden es la mejor manera de entender la escala del lugar.

La musica es el verdadero mapa de Theatron. En una sola noche puedes pasar del pop comercial de la sala principal al house de Teatrino, al reggaeton de Plaza Rosa y al techno de las salas subterraneas. Musiclab es la apuesta electronica, Beerlin Bar rinde homenaje a la estetica de los clubes berlineses y Epoca propone un viaje al pasado con sonidos de decadas anteriores. No importa cual sea tu genero favorito: en Theatron hay un lugar donde suena exactamente lo que quieres escuchar.

Entre el nucleo principal y los rincones mas alternativos, Beerlin Bar y Metro cumplen el papel de las salas de paso. Beerlin Bar mira a la estetica de los clubes alemanes, con luces frias y techno contundente; Metro, por su parte, es mas relajada, ideal para una escala cuando quieres recuperar el aliento sin salirte de la fiesta. Son salas chicas, pero con personalidad propia, y suelen ser las favoritas de quienes buscan algo mas que la pista principal.

Plaza Rosa es la sala de los ritmos latinos y del reggaeton, un territorio propio dentro del club con su propia escenografia y su propio publico. La Cantina, Palma y Baru completan la propuesta latina con sonidos caribenos, tropicales y bailable. Para los que prefieren el ambiente de bar tradicional, Beerlin Bar y Metro ofrecen una escala mas intima sin salir de la misma direccion. La variedad es tan grande que cada visitante termina adoptando su sala favorita.

La Capilla, Caixa y Subthe 58 son las salas de los que buscan algo distinto. Subthe 58 juega con el nombre y la ubicacion del club en el subsuelo, con una estetica cruda que recuerda los after de las grandes capitales. Los J*tos y Glow Garden agregan un toque ludico y luminoso, mientras que Lotus cierra la oferta con una propuesta mas lounge. Recorrerlas todas es parte de la experiencia: cada puerta esconde un mundo diferente.

Cuando la noche avanza, dos salas toman protagonismo. Glow Garden es una sala exterior con un jardin luminoso que se convierte en el escenario perfecto para el amanecer, y SkyTop es la terraza del piso alto, con aire libre y vista de Chapinero entre set y set. Ambos son el cierre favorito de los asiduos: la fiesta no termina cuando se apagan las luces de las salas cerradas, sino cuando el sol aparece sobre la ciudad.

Theatron reserva ademas espacios para los momentos de pausa y para quienes prefieren la conversacion al baile. La sala VIP y las zonas lounge permiten sentarse, pedir algo y ver la fiesta desde la distancia, mientras las salas principales mantienen su ritmo. Ese equilibrio entre pista y descanso es parte de la genialidad del lugar: en Theatron puedes bailar cinco horas seguidas o ir dosificando la noche a tu manera.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG|Chapinero de noche: el escenario donde se mueve el Chapigay]

Los sabados, Theatron agrega un ingrediente que lo distingue de cualquier otro club de la ciudad: los shows drag en vivo. Las artistas mas reconocidas de la escena colombiana se toman el escenario central con numeros musicales, humor y mucho brillo, en presentaciones que se han convertido en cita obligada. Llega temprano si quieres buen lugar: la sala principal se llena y el show es, para muchos, el momento mas esperado de la semana.

La escena drag en Colombia vivio un auge en los ultimos anos, y Theatron ha sido parte de ese movimiento desde antes de que fuera tendencia. El club ha acogido a artistas que despues se volvieron referentes nacionales, y sus shows mezclan lip sync, comedia, glamour y mucha puesta en escena. Ver un show drag en Theatron no es un relleno de la noche: es el numero principal que muchos planean sus sabados alrededor.

Theatron tambien es pionero en apuestas de inclusion. El club cuenta con una sala exclusiva para mujeres, una de sus iniciativas mas celebradas por el publico y una muestra de como una discoteca puede pensar la noche de maneras distintas. En un ecosistema nocturno donde casi todo se disena sin matices, ese tipo de decisiones hace que Theatron se sienta un paso adelante.

El ambiente es, de hecho, la mayor de sus atracciones. Theatron es el epicentro del Chapigay y su politica es abiertamente inclusiva: todos son bienvenidos, sin importar su orientacion, identidad o el motivo por el que llegan. Esa energia se reconoce afuera del pais: en 2024 el club fue incluido en el ranking World's 100 Best Clubs y ocupo el puesto 68 entre los mejores clubes del planeta, un reconocimiento a dos decadas construyendo una de las noches mas grandes de Latinoamerica.

A lo largo del ano, Theatron se convierte ademas en escenario de fechas especiales que amplifican su agenda. La marcha del orgullo, las fiestas de halloween, la temporada decembrina y las celebraciones de fin de ano llenan el club de producciones tematicas, artistas invitados y shows unicos. Estas fechas se agotan con anticipacion, asi que si tu visita coincide con alguna de ellas, revisa la programacion y reserva tu lugar con tiempo.

Entrar a Theatron tiene un precio que conviene planear. El cover es de 30.000 pesos colombianos si llegas antes de las 10 de la noche, y de 50.000 despues de esa hora. En la practica, llegar temprano no solo es mas economico: tambien te permite conocer las salas con menos gente, elegir tu lugar favorito y arrancar la fiesta con energia fresca.

Si vienes en grupo grande o quieres una experiencia mas comoda, Theatron ofrece mesas VIP con servicio preferencial. La reserva se gestiona directamente en el sitio oficial del club, y el valor depende de la ubicacion y la fecha. Para celebraciones especiales, cumpleanos o despedidas, una mesa en la sala principal o en Glow Garden convierte la noche en un plan de otro nivel.

Si vienes en grupo, planear la noche con anticipacion hace la diferencia. Define de antemano que salas quieren visitar, pongan un punto de encuentro por si se pierden (es facil separarse entre miles de personas) y coordinen la hora de llegada para aprovechar el cover mas economico. Tambien conviene cargar poco: en la pista, entre menos lleves, mejor.

La agenda de Theatron tambien tiene su propia logica. Los jueves el club abre de 9 de la noche a 5 de la manana, con noches tematicas que varian cada semana. Los viernes y sabados el ritmo es otro: doble jornada que arranca al mediodia y en la tarde, y continua por la noche hasta el amanecer. Los sabados, ademas, son los dias de los shows drag, asi que son la apuesta mas fuerte del fin de semana.

Los jueves son, en la practica, el ensayo general de la semana. Las noches tematicas varian entre generos, epocas y fiestas dedicadas a publicos especificos, y el cover suele ser mas accesible que el del sabado. Para quien quiere conocer Theatron sin las multitudes del fin de semana, el jueves es el dia ideal: las salas estan llenas de energia pero con mas espacio para bailar y descubrir cada rincon del club.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bogota_Chapinero_calle_63.JPG/960px-Bogota_Chapinero_calle_63.JPG|La calle 63, otro eje nocturno de Chapinero]

Llegar a Theatron es sencillo. El club esta en la Calle 58 Bis No. 10-32, en pleno Chapinero. En TransMilenio, las estaciones mas cercanas son Calle 57 y Flores, ambas sobre la avenida Caracas; desde cualquiera de las dos caminas unos minutos por la calle 58 hasta la puerta. En taxi o app pide el destino a la calle 58 con carrera 10 y no tendras problema: es una de las esquinas mas conocidas de la vida nocturna bogotana.

El requisito es simple pero obligatorio: ser mayor de 18 anos y llevar documento de identidad valido. La entrada general no requiere reserva, aunque los dias de mayor afluencia (sabados y fechas especiales) conviene llegar antes de las 10 para evitar filas. En la puerta se controla la edad de manera rigurosa, asi que ten tu documento a la mano desde el momento en que bajas del taxi.

En cuanto a la ropa, Theatron es flexible pero tiene su codigo. No exige etiqueta formal, pero se recomienda look de fiesta: la noche bogotana se viste, y la gente de Theatron le pone cuidado al estilo. Evita la ropa deportiva excesiva y ten en cuenta que en las salas cerradas puede hacer calor; guarda una capa para la terraza de SkyTop en la madrugada.

Algunos consejos practicos para tu primera vez: llega antes de las 10 de la noche para pagar el cover de 30.000 y entrar sin filas; revisa la programacion de shows drag si vas un sabado; usa calzado comodo porque vas a recorrer varios pisos y miles de pasos de baile; y guarda lo que no necesites en el guardarropa o consigna, porque los objetos grandes no entran a las pistas.

La experiencia no empieza en la puerta de Theatron, sino en el barrio. El Chapigay de la calle 58 concentra una decena de bares, cafeterias y gastrobares donde la gente hace la previa al ritmo de cocktails, conversaciones y la promesa de una gran noche. Tomar algo en una terraza antes de entrar es casi un rito entre los asiduos, y una buena manera de arrancar con el animo arriba.

La propuesta gastronomica del Chapigay es parte de la noche. Alrededor de la calle 58 encuentras gastrobares con hamburguesas, pizzas, arepas y cocina de autor a precios razonables, ademas de bares de cocktails que preparan sus propias versiones de los clasicos. Comer antes de entrar es una buena estrategia: la fiesta quema energia, y llegar con el estomago lleno hace que el baile dure mas y la resaca se sienta menos.

Cuando Theatron cierra, el eje no se apaga del todo. Algunos bares del Chapigay extienden su horario y otros puntos de Chapinero toman la posta para quienes quieren seguir la fiesta. La ciudad tiene esa costumbre de no soltar la noche, y la esquina de la calle 58 es el mejor ejemplo. Si tu plan es bailar hasta el amanecer, organizate para el after y disfruta del recorrido.

Y si tu noche termina al amanecer, Chapinero tiene la respuesta para el dia siguiente. Cafeterias de especialidad, panaderias y restaurantes de desayuno abren temprano en el barrio, y un buen ajiaco o un cafe con huevos pericos son el cierre perfecto de la jornada. La tradicion bogotana del domingo de resaca tiene su epicentro en estas calles, asi que nadie tiene que volver a casa sin desayunar.

[foto:https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bogot%C3%A1_Parque_de_la_93.JPG/960px-Bogot%C3%A1_Parque_de_la_93.JPG|El Parque de la 93, otro corazon nocturno de la ciudad]

Como en cualquier gran salida nocturna, la prudencia es tu mejor aliada. Move el barrio en grupo cuando sea posible, cuida tus pertenencias en las zonas mas llenas y acuerda el transporte de regreso antes de que termine la noche. Bogota es una ciudad que ofrece mucha fiesta, y con unas reglas basicas de sentido comun tu noche en Theatron sera solo buen recuerdo.

Una de las preguntas mas frecuentes sobre Theatron es si es un lugar solo para la comunidad LGBTQ+. La respuesta es no: Theatron es el epicentro del Chapigay y su ambiente es abiertamente inclusivo, pero sus puertas estan abiertas para todos. La regla es una sola: respeto. En ese ambiente, cada quien baila donde se siente a gusto y la noche se convierte en un espacio de libertad compartida.

Theatron tambien se gano un lugar en los itinerarios de los viajeros que visitan Bogota. En las guias de vida nocturna de Latinoamerica y en los rankings internacionales, el club aparece como parada obligada para entender la fiesta de la capital, y no es raro escuchar otros idiomas en las pistas. Para el turista, Theatron es una muestra de lo que la ciudad puede ofrecer cuando se atreve a ser ella misma.

Theatron no es solo una discoteca: es un pedazo de la identidad nocturna de Bogota, un lugar donde el antiguo teatro de la calle 58 se convirtio en un simbolo de inclusion y fiesta. Nuestra recomendacion final es que reserves una noche, llegues temprano, recorras las veinte salas, veas un show drag si puedes y termines en Glow Garden viendo amanecer sobre Chapinero. Esa es, sin exagerar, una de las mejores noches que puede ofrecer la capital.`,
  highlight: 'El megaclub mas grande de Latinoamerica: veinte salas, shows drag, ambiente inclusivo y la fiesta que define la noche de Bogota',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Chapinero (Chapigay)',
  lat: 4.64509,
  lng: -74.0639,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://portaltheatron.co',
  instagram: '@theatronbogota',
  precio_desde: '',
  horario: 'Jue 9PM-5AM; Vie-Sab doble jornada',
  emoji: '\ud83c\udf7f',
  hero_bg: '#7f1d1d',
  tipo: 'Blog - Guia completa',
  capacidad: '',
  como_llegar: 'Calle 58 Bis No. 10-32, Chapinero. TransMilenio: estaciones Calle 57 o Flores (Av. Caracas) y caminar por la calle 58.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tema: 'cultura',
  temas: ['cultura', 'aventura', 'tips', 'gastro'],
  video_url: ''
};

const FAQS = [];

const FOTOS_GALERIA = PHOTOS.slice(1).map(function(p, i) {
  return { url: p.url, caption: p.caption, orden: i + 1 };
});

module.exports = { SLUG, HERO, PHOTOS, BASE, TAGS, FAQS, FOTOS_GALERIA };