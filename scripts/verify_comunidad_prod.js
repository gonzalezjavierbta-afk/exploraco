// Verificacion en vivo de la comunidad social (TSK-089) contra produccion.
// Uso: node scripts/verify_comunidad_prod.js [BASE_URL]
// Default: https://exploraco.vercel.app
// NO destructivo: los POST usan un uuid inexistente para comprobar que los
// tipos estan registrados y los gates responden, sin insertar datos reales.
const BASE = process.argv[2] || process.env.BASE_URL || 'https://exploraco.vercel.app';
const FAKE = '00000000-0000-4000-8000-000000000000';

function check(label, cond, extra) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label + (extra ? ' | ' + extra : ''));
  if (!cond) process.exitCode = 1;
}

async function get(path) {
  const r = await fetch(BASE + path);
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, json: j };
}
async function post(body) {
  const r = await fetch(BASE + '/api/interacciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, json: j };
}

(async function main() {
  // 1) Salas (migracion 008 aplicada -> 6 salas del sistema)
  const s = await get('/api/interacciones?tipo=chat_salas');
  check('GET chat_salas: 200 ok', s.status === 200 && s.json && s.json.ok === true, 'status=' + s.status);
  const salas = (s.json && s.json.data) || [];
  check('GET chat_salas: >= 6 salas', salas.length >= 6, 'count=' + salas.length);
  const sala0 = salas[0];

  // 2) Mensajes de la primera sala
  if (sala0 && sala0.id) {
    const m = await get('/api/interacciones?tipo=chat_mensajes&sala_id=' + encodeURIComponent(sala0.id));
    check('GET chat_mensajes: ok y data array',
      m.status === 200 && m.json && m.json.ok === true && Array.isArray(m.json.data),
      'msgs=' + ((m.json && m.json.data && m.json.data.length) || 0));
  } else {
    check('GET chat_mensajes: sala disponible', false, 'no hay sala para probar');
  }

  // 3) Planes (sin usuario -> data vacio)
  const p = await get('/api/interacciones?tipo=planes');
  check('GET planes: ok y data array',
    p.status === 200 && p.json && p.json.ok === true && Array.isArray(p.json.data),
    'status=' + p.status);

  // 4) Usuario real del leaderboard para validar catalogos
  const lb = await get('/api/usuarios?tipo=leaderboard&limit=5');
  const users = (lb.json && lb.json.data) || [];
  const uid = users.length ? users[0].id : null;
  check('leaderboard: obtiene usuario real', !!uid, uid ? 'uid=' + uid : 'sin usuarios');

  if (uid) {
    const mi = await get('/api/interacciones?tipo=misiones&usuario_id=' + encodeURIComponent(uid));
    check('misiones: total 22 (catalogo nuevo desplegado)', mi.json && mi.json.total === 22,
      'total=' + ((mi.json && mi.json.total) || 'n/a'));
    const lg = await get('/api/interacciones?tipo=logros&usuario_id=' + encodeURIComponent(uid));
    check('logros: total 29 (catalogo nuevo desplegado)', lg.json && lg.json.total === 29,
      'total=' + ((lg.json && lg.json.total) || 'n/a'));
  }

  // 5) POST registrados y gates (uuid inexistente -> sin efectos reales)
  const c1 = await post({ tipo: 'chat_msg', usuario_id: FAKE, sala_id: (sala0 && sala0.id) || '', texto: 'x' });
  check('POST chat_msg: gate 403 (sin chat)', c1.status === 403 && /chat/i.test((c1.json && c1.json.error) || ''), 'status=' + c1.status);

  const c2 = await post({ tipo: 'chat_sala', usuario_id: FAKE, nombre: 'X' });
  check('POST chat_sala: gate 403 (sin crear_chat)', c2.status === 403, 'status=' + c2.status);

  const c3 = await post({ tipo: 'chat_mod', usuario_id: FAKE, sala_id: (sala0 && sala0.id) || '', msg_id: FAKE, accion: 'fijar' });
  check('POST chat_mod: gate 403 (sin moderador)', c3.status === 403, 'status=' + c3.status);

  const c4 = await post({ tipo: 'plan_crear', usuario_id: FAKE, destino: 'X', cupos: 4 });
  check('POST plan_crear: gate 403 (sin chat)', c4.status === 403, 'status=' + c4.status);

  const c5 = await post({ tipo: 'plan_unirse', usuario_id: FAKE, plan_id: FAKE });
  check('POST plan_unirse: 404 plan inexistente', c5.status === 404, 'status=' + c5.status);

  const c6 = await post({ tipo: 'plan_salir', usuario_id: FAKE, plan_id: FAKE });
  check('POST plan_salir: 200 ok (no-op)', c6.status === 200 && c6.json && c6.json.ok === true, 'status=' + c6.status);

  // 6) Frontend desplegado con el codigo nuevo
  const html = await fetch(BASE + '/comunidad.html');
  const txt = await html.text();
  check('comunidad.html: 200', html.status === 200, 'status=' + html.status);
  check('comunidad.html: incluye tipo=chat_salas', txt.indexOf('tipo=chat_salas') !== -1);
  check('comunidad.html: incluye fix XSS esc()', txt.indexOf('function esc(') !== -1);

  console.log('VERIFY COMUNIDAD PROD: ' + (process.exitCode ? 'CON FALLOS' : 'OK'));
})().catch(function(err) {
  console.log('FAIL - verifier lanzo error: ' + err.message);
  process.exitCode = 1;
});