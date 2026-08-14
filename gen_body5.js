const fs = require('fs');

const chunk = `
<section class="ssec bwarm" id="galeria"><div class="sin">
<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Galeria de fotos</h2><div class="stnum">9</div></div>
<div class="gal">
<div class="gal-i" style="background-image:url('https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg')"></div>
<div class="gal-i" style="background-image:url('https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Museo_del_Oro_Bogot%C3%A1.jpg/800px-Museo_del_Oro_Bogot%C3%A1.jpg')"></div>
<div class="gal-i" style="background-image:url('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Museo_Botero_Bogot%C3%A1.jpg/800px-Museo_Botero_Bogot%C3%A1.jpg')"></div>
<div class="gal-i" style="background-image:url('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Teatro_Col%C3%B3n_Bogot%C3%A1.jpg/800px-Teatro_Col%C3%B3n_Bogot%C3%A1.jpg')"></div>
<div class="gal-i" style="background-image:url('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg')"></div>
</div></div></section>

<section class="ssec bwhite" id="mapa"><div class="sin">
<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Ubicacion y como llegar</h2><div class="stnum">10</div></div>
<div id="mapel"><iframe loading="lazy" src="https://www.google.com/maps?q=4.7120,-74.0680&z=15&output=embed"></iframe></div>
<p class="stext" style="margin-top:14px">Transmilenio: Museo del Oro (línea K) o Las Aguas. A pie desde el centro histórico. Colectivos en Carrera 5 y Carrera 4. El barrio está ubicado a 4.7120, -74.0680, a 2.640 m sobre el nivel del mar.</p>
<div class="mapacts">
<a class="mabtn gold" href="https://www.google.com/maps/dir/?api=1&destination=4.7120,-74.0680" target="_blank">🗺️ Google Maps</a>
<a class="mabtn blue" href="https://www.bogota.gov.co" target="_blank">○ Sitio web</a>
<a class="mabtn outline" href="https://instagram.com/lacandelaria" target="_blank">Instagram</a>
</div>
</div></section>
`;

fs.appendFileSync('_lacandelaria2_body.html', chunk, 'utf8');
console.log('Appended galeria+mapa, total:', fs.statSync('_lacandelaria2_body.html').size, 'bytes');
