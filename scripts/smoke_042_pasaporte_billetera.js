// Smoke 042 (Fase B): valida de forma estatica el Pasaporte + billetera +
// fotos de perfil (migracion 042) en el working tree. No toca red ni BD.
//
// Nota: las fotos de perfil ya no son un modulo del cuerpo de la pagina.
// Viven dentro del modal de subida (modo "perfil"), en #museo-perfil-fotos.
// Este smoke sigue validando la MIGRACION 042 (lo unico que se movio de sitio
// es el destino del render); el resto de la migracion no se toca.
const fs = require('fs');
const path = require('path');

function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) process.exitCode = 1;
}

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const mig = read('db/migrations/042_pasaporte_billetera_fotos.sql');
const usr = read('api/usuarios.js');
const int = read('api/interacciones.js');
const perfil = read('mi-perfil.html');

// Migracion 042
check('042: fecha_nacimiento DATE', mig.indexOf('ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE') !== -1);
check('042: tabla usuario_fotos', mig.indexOf('CREATE TABLE IF NOT EXISTS usuario_fotos') !== -1);
check('042: tabla billeteras', mig.indexOf('CREATE TABLE IF NOT EXISTS billeteras') !== -1);
check('042: album_fotos.destino_id', mig.indexOf('ADD COLUMN destino_id uuid') !== -1);
check('042: indice principal unico', mig.indexOf('uq_usuario_fotos_principal') !== -1);
check('042: ASCII-safe', (function () {
  var b = 0, t = 0;
  for (var i = 0; i < mig.length; i++) { if (mig.charCodeAt(i) > 127) b++; if (mig.charAt(i) === '`') t++; }
  return b === 0 && t === 0;
})());

// api/usuarios.js
check('usuarios: version v26 en cabecera', usr.indexOf('// v26 (2026-10-10)') !== -1);
check('usuarios: rama foto_agregar', usr.indexOf("c.tipo === 'foto_agregar'") !== -1);
check('usuarios: rama foto_principal', usr.indexOf("c.tipo === 'foto_principal'") !== -1);
check('usuarios: rama foto_quitar', usr.indexOf("c.tipo === 'foto_quitar'") !== -1);
check('usuarios: GET billetera_mia', usr.indexOf("tipo === 'billetera_mia'") !== -1);
check('usuarios: fecha_nacimiento en perfil_actualizar', usr.indexOf('fecha_nacimiento = ') !== -1);
check('usuarios: tope 10 fotos', usr.indexOf('MAX_FOTOS_PERFIL') !== -1);
check('usuarios: valida prefijo de blob del usuario', usr.indexOf('urlPerteneceAlUsuario') !== -1);
check('usuarios: una sola edicion de fecha (WHERE IS NULL)', usr.indexOf('AND fecha_nacimiento IS NULL') !== -1);

// api/interacciones.js
check('interacciones: logro logr_pasaporte_completo', int.indexOf("id: 'logr_pasaporte_completo'") !== -1);
check('interacciones: ctx.pasaporteCompleto', int.indexOf('pasaporteCompleto: function()') !== -1);
check('interacciones: reparte XP a referidos en logros', int.indexOf('repartirXpReferidos(sql, usuarioId, xpBonus)') !== -1);

// mi-perfil.html
check('mi-perfil: host pf-pasaporte', perfil.indexOf('id="pf-pasaporte"') !== -1);
check('mi-perfil: host pf-billetera', perfil.indexOf('id="pf-billetera"') !== -1);
check('mi-perfil: cargarBilletera definida', perfil.indexOf('function cargarBilletera()') !== -1);
check('mi-perfil: cargarBilletera sigue trayendo fotos', perfil.indexOf('res.data.fotos || []') !== -1);

// Fotos de perfil: la superficie ahora vive DENTRO del modal de subida.
check('mi-perfil: wrap de fotos en el modal', perfil.indexOf('id="museo-perfil-fotos-wrap"') !== -1);
check('mi-perfil: grid de fotos en el modal', perfil.indexOf('id="museo-perfil-fotos"') !== -1);
check('mi-perfil: cabecera de fotos en el modal', perfil.indexOf('id="museo-perfil-fotos-head"') !== -1);
// El wrap se muestra SOLO en modo perfil: no basta con que exista el
// getElementById. Se comprueba el COMPORTAMIENTO: toda asignacion de
// display de pfWrap debe ser un ternario condicionado por esPerfil con la
// rama perfil visible ('' o 'block') y la otra rama oculta ('none').
// Si se deja en valor fijo ('block', '' o 'none') o se borra, falla.
check('mi-perfil: el wrap se muestra solo en modo perfil', (function () {
  var re = /pfWrap\.style\.display\s*=\s*([^;\n]+)/g;
  var m, n = 0, ok = true;
  while ((m = re.exec(perfil)) !== null) {
    n++;
    if (!/^esPerfil\s*\?\s*(''|'block'|"block")\s*:\s*'none'\s*$/.test(m[1].trim())) ok = false;
  }
  return n > 0 && ok;
})());
check('mi-perfil: pfPintarFotosModal definida', perfil.indexOf('function pfPintarFotosModal(') !== -1);
check('mi-perfil: cache de fotos del modal', perfil.indexOf('var pfFotosCache = null;') !== -1);
check('mi-perfil: cargarBilletera alimenta la cache', perfil.indexOf('pfFotosCache = res.data.fotos || [];') !== -1);

// El modulo salio del cuerpo de la pagina: su host y sus dos renderizadores
// tienen que seguir SIN existir (regresion si alguien los reintroduce).
check('mi-perfil: ya NO existe el host pf-galeria', perfil.indexOf('id="pf-galeria"') === -1);
check('mi-perfil: ya NO esta renderGaleriaPerfil', perfil.indexOf('function renderGaleriaPerfil') === -1);
check('mi-perfil: ya NO esta pfFotoAgregar', perfil.indexOf('function pfFotoAgregar') === -1);

// Las acciones sobreviven al traslado.
check('mi-perfil: accion pfFotoSubirUrl', perfil.indexOf('function pfFotoSubirUrl(') !== -1);
check('mi-perfil: accion pfFotoPrincipal', perfil.indexOf('function pfFotoPrincipal(') !== -1);
check('mi-perfil: accion pfFotoQuitar', perfil.indexOf('function pfFotoQuitar(') !== -1);
// Las acciones se cablean desde las miniaturas del MODAL, no desde un boton
// de la pagina (que ya no existe): se comprueba el onclick tal cual se emite.
check('mi-perfil: boton Principal en las miniaturas del modal',
  perfil.indexOf('class="pf-gal-btn" onclick="pfFotoPrincipal(') !== -1);
check('mi-perfil: boton Quitar en las miniaturas del modal',
  perfil.indexOf('class="pf-gal-btn danger" onclick="pfFotoQuitar(') !== -1);
check('mi-perfil: campo fecha de nacimiento', perfil.indexOf("campo === 'fecha_nacimiento'") !== -1);

// Lote SELLADO (v26): el sello ya no viene de un campo nuevo sino de la
// EXISTENCIA de la fila en billeteras. Se extrae el cuerpo de pfPasSelloHtml
// con un patron ACOTADO (desde su declaracion hasta la funcion siguiente) para
// poder auditarlo sin arrastrar el resto de renderPasaporte.
const sello = (function () {
  var a = perfil.indexOf('function pfPasSelloHtml()');
  if (a === -1) return '';
  var b = perfil.indexOf('function renderPasaporte(', a);
  return (b > a) ? perfil.slice(a, b) : '';
})();

// El flag se CALCULA, no se copia: tiene que existir la rama que lo pone en
// true y la que lo devuelve a false (tolerante a 42P01/42703).
check('usuarios: calcula el flag sellado (ramas true y false)', (function () {
  var re = /bmPasaporte\.sellado\s*=\s*(true|false)\s*;/g;
  var m, t = 0, f = 0;
  while ((m = re.exec(usr)) !== null) { if (m[1] === 'true') t++; else f++; }
  return t > 0 && f > 0;
})());
check('usuarios: el sello se lee de billeteras (no de un campo nuevo)',
  usr.indexOf('FROM billeteras WHERE usuario_id=$1 LIMIT 1') !== -1);
check('mi-perfil: helper del sello con la palabra COMPLETADO', (function () {
  return sello.indexOf('function pfPasSelloHtml()') !== -1
    && sello.indexOf('COMPLETADO') !== -1
    && sello.indexOf('pf-pas-sello') !== -1;
})());
check('mi-perfil: degradacion p.sellado con respaldo en p.completo', (function () {
  return perfil.indexOf('var sellado = (p.sellado != null) ? !!p.sellado : !!p.completo;') !== -1
    && perfil.indexOf('if (sellado) { box.innerHTML = pfPasSelloHtml(); return; }') !== -1;
})());
// NEGATIVO: el modulo cerrado solo pinta el sello. Si el helper volviera a
// incluir el grid de 10 items o la barra de progreso, el passport sellado
// mostraria el formulario editable. Se exige sello no vacio para que el
// negativo no pase en vacuo si el helper desaparece.
check('mi-perfil: ya NO pinta pf-pas-grid ni pf-pas-bar en el sello', (function () {
  return sello.length > 0
    && sello.indexOf('pf-pas-grid') === -1
    && sello.indexOf('pf-pas-bar') === -1;
})());

// Fase C: C4 ubicacion + optimizacion de media
check('C4: album_foto acepta destino_id (insert con fallback)', int.indexOf('lat, lng, destino_id)') !== -1);
check('C4: mi-perfil buscador de destino', perfil.indexOf('function buscarDestinoAlbum(') !== -1);
const media = read('media-upload.js');
check('C: media-upload optimiza a WebP', media.indexOf("'image/webp'") !== -1);
check('C: media-upload respeta orientacion EXIF', media.indexOf("imageOrientation: 'from-image'") !== -1);
check('C: media-upload perfil 800 / galeria 1600', media.indexOf('perfil: 800') !== -1 && media.indexOf('museo: 1600') !== -1);
check('C: media-upload no amplia (escala min 1)', media.indexOf('Math.min(1,') !== -1);
check('C: bloque de subida above-the-fold', perfil.indexOf('class="pf-subida"') !== -1);

console.log(process.exitCode ? 'SMOKE 042 PASAPORTE: FAIL' : 'SMOKE 042 PASAPORTE: OK');
