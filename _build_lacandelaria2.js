const fs = require('fs');

const css = fs.readFileSync('_motor.css', 'utf8');
const body = fs.readFileSync('_lacandelaria2_body.html', 'utf8');

const hero = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg';
const lead = 'El centro histórico de Bogotá, cuna de la ciudad con plazas coloniales, museos gratuitos y callejas llenas de arte urbano.';

const schema = {
  '@context': 'https://schema.org',
  '@type': 'TouristAttraction',
  name: 'La Candelaria',
  description: lead,
  url: 'https://exploraco.co/lacandelaria2.html',
  image: hero,
  address: { '@type': 'PostalAddress', addressLocality: 'Bogotá', addressCountry: 'CO' },
  geo: { '@type': 'GeoCoordinates', latitude: 4.7120, longitude: -74.0680 },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.7', ratingCount: 2500, bestRating: '5', worstRating: '1' },
  priceRange: 'Desde $5.000'
};
const ld = '<script type="application/ld+json">\n' + JSON.stringify(schema, null, 2) + '\n</script>';

const head =
  '<!DOCTYPE html>\n<html lang="es">\n<head>\n'
  + '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n'
  + '<title>La Candelaria  ExploraCO</title>\n'
  + '<meta name="description" content="' + lead + '">\n'
  + '<meta property="og:title" content="La Candelaria  ExploraCO">\n'
  + '<meta property="og:description" content="' + lead + '">\n'
  + '<meta property="og:image" content="' + hero + '">\n'
  + '<meta property="og:type" content="place">\n'
  + '<meta name="theme-color" content="#E8A020">\n'
  + '<link rel="canonical" href="https://exploraco.co/lacandelaria2.html">\n'
  + ld + '\n'
  + '<style>' + css + '</style>\n</head>\n<body>\n\n'
  + body
  + '\n</body>\n</html>';

fs.writeFileSync('lacandelaria2.html', head, 'utf8');
console.log('lacandelaria2.html written: ' + head.length + ' chars');
