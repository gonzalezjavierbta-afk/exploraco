const fs = require('fs');

const chunk = `
<section class="ssec bwarm" id="faq"><div class="sin">
<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Preguntas frecuentes</h2><div class="stnum">11</div></div>
<details class="faqi"><summary>¿Cuál es el mejor museo para visitar en La Candelaria?</summary><div class="fqatext"><p>El Museo del Oro es el más destacado con su colección de oro precolombino. El Museo Botero es gratuito y alberga la colección privada del artista. Ambos son imperdibles.</p></div></details>
<details class="faqi"><summary>¿Es gratis entrar a La Candelaria?</summary><div class="fqatext"><p>El barrio es público y gratuito para pasear. Los museos tienen entrada: el Museo del Oro cuesta $5.000, pero es gratis los domingos y muchos museos son gratuitos siempre.</p></div></details>
<details class="faqi"><summary>¿A qué hora abre el Museo del Oro?</summary><div class="fqatext"><p>De martes a domingo de 9:00 am a 6:00 pm. Cerrado los lunes. Entrada general $5.000, estudiantes $3.000. Domingos gratis después de la 1:00 pm.</p></div></details>
<details class="faqi"><summary>¿Se puede visitar La Candelaria en un día?</summary><div class="fqatext"><p>Sí, el recorrido completo dura entre 2 y 4 horas caminando. Puedes combinarlo con el Museo del Oro y terminar con un ajiaco en los alrededores.</p></div></details>
</div></section>

<section class="ssec bwhite" id="resenas"><div class="sin">
<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Resenas de viajeros</h2><div class="stnum">12</div></div>
<div class="rblock" id="rblock">
<div><div class="rbavg">4.7</div><div class="rbstars" id="rbstars"><span class="rbst on">*</span><span class="rbst on">*</span><span class="rbst on">*</span><span class="rbst on">*</span><span class="rbst">*</span></div><div class="rbcnt">2500+ reseñas</div></div>
</div>
<div class="rvlist" id="rvlist">
<div class="rvitem"><div class="rvhead"><div class="rvav">MR</div><div class="rvname">María</div><div class="rvstars"><span class="rvst on">*</span><span class="rvst on">*</span><span class="rvst on">*</span><span class="rvst on">*</span><span class="rvst">*</span></div></div><div class="rvtx">Pasear por La Candelaria es like volver al siglo XIX. Las calles empedradas, el aroma a chocolate santafereño y los murales te transportan. El Museo del Oro al atardecer es mágico.</div></div>
<div class="rvitem"><div class="rvhead"><div class="rvav">CP</div><div class="rvname">Carlos</div><div class="rvstars"><span class="rvst on">*</span><span class="rvst on">*</span><span class="rvst on">*</span><span class="rvst on">*</span><span class="rvst">*</span></div></div><div class="rvtx">Me enamoró el Pasaje Hernández y la Librería Merlin. La arquitectura colonial aquí es impresionante. Llevar zapatos cómodos, las calles son empedradas.</div></div>
<div class="rvitem"><div class="rvhead"><div class="rvav">LA</div><div class="rvname">Laura</div><div class="rvstars"><span class="rvst on">*</span><span class="rvst on">*</span><span class="rvst on">*</span><span class="rvst on">*</span><span class="rvst">*</span></div></div><div class="rvtx">Perfecto para un día cultural. Plaza de Bolívar, Catedral, Museo del Oro y el Chorro de Quevedo. Todo caminando y muy bonito. El ajiaco del almuerzo fue el mejor.</div></div>
</div>
<p class="stext" id="rvempty" style="display:none">Se el primero en dejar una resena.</p>
<div class="wr">
<div class="wrtitle">Escribir una resena</div>
<input id="rvn" type="text" placeholder="Tu nombre" class="wrinp">
<div class="sprow" id="rv-stars">
<span class="spk" data-v="5" onclick="setRvScore(5)">*</span>
<span class="spk" data-v="4" onclick="setRvScore(4)">*</span>
<span class="spk" data-v="3" onclick="setRvScore(3)">*</span>
<span class="spk" data-v="2" onclick="setRvScore(2)">*</span>
<span class="spk" data-v="1" onclick="setRvScore(1)">*</span>
</div>
<textarea id="rvt" placeholder="Que te parecio este lugar?" class="wrinp"></textarea>
<button class="wrsub" onclick="submitRv()">Publicar resena -></button>
<div class="wrok" id="rvok">✓ Gracias por tu resena!</div>
<div class="wr" id="qrwrap" style="margin-top:8px">
<div class="wrtitle">Califica este lugar</div>
<div class="sprow" id="qr-stars">
<span class="spk" data-v="1" onclick="votarDID(1)">☆</span>
<span class="spk" data-v="2" onclick="votarDID(2)">☆</span>
<span class="spk" data-v="3" onclick="votarDID(3)">☆</span>
<span class="spk" data-v="4" onclick="votarDID(4)">☆</span>
<span class="spk" data-v="5" onclick="votarDID(5)">☆</span>
</div>
<div class="wrok" id="qrok" style="display:none">✓ Gracias por tu voto!</div>
</div>
</div>
</div></section>
`;

fs.appendFileSync('_lacandelaria2_body.html', chunk, 'utf8');
console.log('Appended FAQ+resenas, total:', fs.statSync('_lacandelaria2_body.html').size, 'bytes');
