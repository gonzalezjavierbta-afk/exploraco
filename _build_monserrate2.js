const fs = require('fs');

const css = fs.readFileSync('_motor.css', 'utf8');
const body = fs.readFileSync('_monserrate2_body.html', 'utf8');

const hero = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/2019_Bogot%C3%A1_-_Iglesia_de_Monserrate.jpg/1200px-2019_Bogot%C3%A1_-_Iglesia_de_Monserrate.jpg';
const lead = 'Sube a 3.152 m sobre Bogotá y visita la Basílica del Señor Caído de Monserrate, un cerro sagrado con más de tres siglos de historia, miradores de 360° y un sendero entre niebla y frailejones.';

const schema = {
  '@context': 'https://schema.org',
  '@type': 'TouristAttraction',
  name: 'Monserrate',
  description: lead,
  url: 'https://exploraco.co/monserrate2.html',
  image: hero,
  address: { '@type': 'PostalAddress', addressLocality: 'Bogotá', addressCountry: 'CO' },
  geo: { '@type': 'GeoCoordinates', latitude: 4.605833, longitude: -74.056389 },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', ratingCount: 4820, bestRating: '5', worstRating: '1' },
  priceRange: 'Desde $21.000'
};
const ld = '<script type="application/ld+json">\n' + JSON.stringify(schema, null, 2) + '\n<\/script>';

const head =
  '<!DOCTYPE html>\n<html lang="es">\n<head>\n'
  + '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n'
  + '<title>Monserrate  ExploraCO</title>\n'
  + '<meta name="description" content="' + lead + '">\n'
  + '<meta property="og:title" content="Monserrate  ExploraCO">\n'
  + '<meta property="og:description" content="' + lead + '">\n'
  + '<meta property="og:image" content="' + hero + '">\n'
  + '<meta property="og:type" content="place">\n'
  + '<meta name="theme-color" content="#E8A020">\n'
  + '<link rel="canonical" href="https://exploraco.co/monserrate2.html">\n'
  + ld + '\n'
  + '<style>' + css + '</style>\n</head>\n<body>\n\n'
  + body
  + '\n</body>\n</html>';

fs.writeFileSync('Monserrate2.html', head, 'utf8');
console.log('Monserrate2.html escrito: ' + head.length + ' chars');
