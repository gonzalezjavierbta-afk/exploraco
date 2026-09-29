// Smoke 042 (Fase B): valida de forma estatica el Pasaporte + billetera +
// fotos de perfil (migracion 042) en el working tree. No toca red ni BD.
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
check('usuarios: version v24 en cabecera', usr.indexOf('// v24 (2026-09-29)') !== -1);
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
check('mi-perfil: host pf-galeria', perfil.indexOf('id="pf-galeria"') !== -1);
check('mi-perfil: cargarBilletera definida', perfil.indexOf('function cargarBilletera()') !== -1);
check('mi-perfil: campo fecha de nacimiento', perfil.indexOf("campo === 'fecha_nacimiento'") !== -1);

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
