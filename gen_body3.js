const fs = require('fs');

const chunk = `
<section class="ssec bwhite" id="tours"><div class="sin">
<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Tours disponibles</h2><div class="stnum">6</div></div>
<div class="tgrid">
<div class="tcard">
<div class="tc-badge">Grupal</div>
<div class="tc-title">Caminata por el centro histórico</div>
<div class="tc-meta"><span>🕐 3 horas</span><span>👥 Máx 15</span><span>🗣️ Español</span></div>
<div class="tc-price">$35.000</div>
<div class="tc-desc">Recorrido a pie por Plaza de Bolívar, Museo del Oro, Museo Botero y Pasaje Rivas.</div>
<div class="tc-inc"><div>✓ Guía certificado</div><div>✓ Introducción histórica</div><div>✓ Paradas fotográficas</div></div>
<a class="tc-cta" href="https://bogota.tours" target="_blank">💬 Reservar ahora</a>
</div>
<div class="tcard">
<div class="tc-badge">Grupal</div>
<div class="tc-title">Tour de arte callejero y pasajes</div>
<div class="tc-meta"><span>🕐 2 horas</span><span>👥 Máx 20</span><span>🗣️ Español</span></div>
<div class="tc-price">$25.000</div>
<div class="tc-desc">Recorrido por Pasaje Hernández, Pasillo del Culo, murales y arte urbano.</div>
<div class="tc-inc"><div>✓ Guía de arte urbano</div><div>✓ Paradas en galería</div><div>✓ Agua</div></div>
<a class="tc-cta" href="https://bogota.art" target="_blank">💬 Reservar ahora</a>
</div>
<div class="tcard">
<div class="tc-badge">Privado</div>
<div class="tc-title">Tour gastronómico por La Candelaria</div>
<div class="tc-meta"><span>🕐 3 horas</span><span>👥 Máx 8</span><span>🗣️ Español</span></div>
<div class="tc-price">$45.000</div>
<div class="tc-desc">Degustación de ajiaco, chocolate santafereño, chicha y frutas locales.</div>
<div class="tc-inc"><div>✓ Guía gastronómico</div><div>✓ 3 degustaciones</div><div>✓ Receta de ajiaco</div></div>
<a class="tc-cta" href="https://foodtours.co" target="_blank">💬 Reservar ahora</a>
</div>
</div></div></section>

<section class="ssec bwarm" id="checklist"><div class="sin">
<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Que llevar</h2><div class="stnum">7</div></div>
<div class="tips-grid">
<div class="tip-card"><div class="tip-icon">✓</div><div><div class="tip-title">Zapatos cómodos con buen agarre</div><span class="tip-tag tip-red">Obligatorio</span></div></div>
<div class="tip-card"><div class="tip-icon">✓</div><div><div class="tip-title">Agua (mínimo 500 ml)</div><span class="tip-tag tip-red">Obligatorio</span></div></div>
<div class="tip-card"><div class="tip-icon">✓</div><div><div class="tip-title">Cámara o celular</div><span class="tip-tag tip-gold">Recomendado</span></div></div>
<div class="tip-card"><div class="tip-icon">✓</div><div><div class="tip-title">Protector solar y gorra</div><span class="tip-tag tip-gold">Recomendado</span></div></div>
<div class="tip-card"><div class="tip-icon">✓</div><div><div class="tip-title">Efectivo pequeño para donaciones</div><span class="tip-tag tip-gold">Recomendado</span></div></div>
<div class="tip-card"><div class="tip-icon">✓</div><div><div class="tip-title">Mapa del recorrido</div><span class="tip-tag tip-gold">Recomendado</span></div></div>
<div class="tip-card"><div class="tip-icon">✓</div><div><div class="tip-title">Aplicación de Transmilenio</div><span class="tip-tag tip-blue">Opcional</span></div></div>
</div></div></section>
`;

fs.appendFileSync('_lacandelaria2_body.html', chunk, 'utf8');
console.log('Appended tours+checklist, total:', fs.statSync('_lacandelaria2_body.html').size, 'bytes');
