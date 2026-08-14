const fs = require('fs');

const chunk = `
<div class="stnum">4</div></div>
<div class="diffcard" style="border-color:#d97706">
<div class="difflabel" style="color:#d97706">Moderado</div>
<div class="diffbars"><div class="diffbar" style="background:#d97706"></div><div class="diffbar" style="background:#d97706"></div><div class="diffbar" style="background:#E5E7EB"></div><div class="diffbar" style="background:#E5E7EB"></div></div>
<div class="diffdesc">Barrio peatonal con calles empedradas y algunas pendientes por la topografía de Bogotá. Accesible para la mayoría de visitantes con calzado cómodo.</div>
<div class="difftags">
<span class="difftag apto">✓ Apto para peatón</span>
<span class="difftag apto">✓ Apto para niños</span>
<span class="difftag noapto">✗ Algunas pendientes por topografía</span>
<span class="difftag noapto">✗ Calle empedrada</span>
</div>
</div>
</div></section>

<section class="ssec bwarm" id="entradas"><div class="sin">
<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Entradas y precios</h2><div class="stnum">5</div></div>
<table class="entradas-table"><thead><tr><th>Tipo</th><th>Precio</th><th>Incluye</th><th>Comprar</th></tr></thead><tbody>
<tr><td class="entrada-tipo">Museo del Oro (general)</td><td class="entrada-precio">$5.000</td><td style="font-size:11px;color:#666">Entrada al museo</td><td><a class="entrada-link" href="https://museodeloro.gov.co" target="_blank">🎫 Comprar</a></td></tr>
<tr><td class="entrada-tipo">Museo del Oro (estudiantes)</td><td class="entrada-precio">$3.000</td><td style="font-size:11px;color:#666">Entrada con descuento</td><td><a class="entrada-link" href="https://museodeloro.gov.co" target="_blank">🎫 Comprar</a></td></tr>
<tr><td class="entrada-tipo">Museo Botero</td><td class="entrada-precio"><span class="entrada-gratis">Gratis</span></td><td style="font-size:11px;color:#666">Entrada libre siempre</td><td><a class="entrada-link" href="https://museobotero.gov.co" target="_blank">🎫 Info</a></td></tr>
<tr><td class="entrada-tipo">Museo Colonial de Arte</td><td class="entrada-precio"><span class="entrada-gratis">Gratis</span></td><td style="font-size:11px;color:#666">Entrada libre</td><td><a class="entrada-link" href="https://museocolonial.gov.co" target="_blank">🎫 Info</a></td></tr>
<tr><td class="entrada-tipo">Museo Francisco José de Caldas</td><td class="entrada-precio"><span class="entrada-gratis">Gratis</span></td><td style="font-size:11px;color:#666">M–F 8AM–5PM</td><td><a class="entrada-link" href="https://user.gov.co" target="_blank">🎫 Info</a></td></tr>
<tr><td class="entrada-tipo">Tour histórico guiado</td><td class="entrada-precio">$35.000</td><td style="font-size:11px;color:#666">Guía + entrada a 2 museos</td><td><a class="entrada-link" href="https://bogota.tours" target="_blank">🎫 Comprar</a></td></tr>
<tr><td class="entrada-tipo">Tour de arte callejero</td><td class="entrada-precio">$25.000</td><td style="font-size:11px;color:#666">Ruta por murales y pasajes</td><td><a class="entrada-link" href="https://bogota.art" target="_blank">🎫 Comprar</a></td></tr>
<tr><td class="entrada-tipo">Tour gastronómico</td><td class="entrada-precio">$45.000</td><td style="font-size:11px;color:#666">Degustación de ajiaco y postres</td><td><a class="entrada-link" href="https://foodtours.co" target="_blank">🎫 Comprar</a></td></tr>
</tbody></table>
<div class="entradas-nota">⚠️ El Museo del Oro es gratis los domingos. La mayoría de museos son gratuitos. Precios confirmados 2025.</div>
</div></section>
`;

fs.appendFileSync('_lacandelaria2_body.html', chunk, 'utf8');
console.log('Appended part 2, total:', (fs.statSync('_lacandelaria2_body.html').size), 'bytes');
