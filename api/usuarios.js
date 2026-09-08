// api/usuarios.js -- Vercel Serverless Function (ASCII-safe: 0 backticks, 0 no-ASCII)
const { neon } = require('@neondatabase/serverless');

// Mismos umbrales que XP_LEVELS en index.html (~linea 3276 del motor de
// puntos local) y en mi-perfil/comunidad. Milestones v2 (ADR-014) expandio
// la escala de 6 a 15 rangos en 3 Eras (Mundano/Patrocinado/Organizador).
// nivel/badge_actual existian como columnas en usuarios pero
// interacciones.js nunca las escribia -- se calculan aqui en cada
// lectura a partir de xp_total en vez de guardarse, para que nunca
// puedan desincronizarse sin tener que coordinar una escritura extra en
// cada uno de los 3 lugares de interacciones.js que suman XP.
const NIVELES = [
  { min: 0,     nombre: 'Viajero Novato' },
  { min: 100,   nombre: 'Explorador de Barrio' },
  { min: 250,   nombre: 'Mochilero Aut\u00f3nomo' },
  { min: 450,   nombre: 'Cazador de Senderos' },
  { min: 700,   nombre: 'Local Consagrado' },
  { min: 1000,  nombre: 'Viajero Patrocinado' },
  { min: 1400,  nombre: 'Cr\u00edtico de la Calle' },
  { min: 1900,  nombre: 'Cart\u00f3grafo de Rutas' },
  { min: 2500,  nombre: 'Embajador de Ciudad' },
  { min: 3200,  nombre: 'Influenciador Local' },
  { min: 4000,  nombre: 'Organizador de Eventos' },
  { min: 5000,  nombre: 'Protector del Patrimonio' },
  { min: 6500,  nombre: 'Due\u00f1o de la Escena' },
  { min: 8500,  nombre: 'Leyenda de Territorio' },
  { min: 11000, nombre: 'Maestro ExploraCO' },
];

function calcularNivel(xpTotal) {
  const xp = parseInt(xpTotal) || 0;
  let nivelIdx = 0;
  for (let i = 0; i < NIVELES.length; i++) {
    if (xp >= NIVELES[i].min) nivelIdx = i;
  }
  return { nivel: nivelIdx + 1, badge_actual: NIVELES[nivelIdx].nombre };
}

function conNivel(row) {
  if (!row) return row;
  const calc = calcularNivel(row.xp_total);
  row.nivel = calc.nivel;
  row.badge_actual = calc.badge_actual;
  return row;
}

// Misiones que desbloquean capacidades de UI (Fase 3, ver
// api/interacciones.js MISIONES). Se declara solo el mapeo id -> nombre
// de la capacidad, no todo el catalogo: este endpoint no necesita
// evaluar condiciones (check()), solo leer que ya quedo 'completada'
// en usuarios.progreso_misiones.
const DESBLOQUEOS = {
  mis_organizador_bogota: 'organizar_actividad',
  mis_fotografo:         'subir_fotos',
  mis_chat_mensajero:    'chat',
  mis_chat_moderador:    'moderador_chat',
  mis_chat_creador:      'crear_chat',
};

function conMisiones(row) {
  if (!row) return row;
  const progreso = row.progreso_misiones || {};
  const capacidades = {};
  Object.keys(DESBLOQUEOS).forEach((misionId) => {
    if (progreso[misionId] && progreso[misionId].estado === 'completada') {
      capacidades[DESBLOQUEOS[misionId]] = true;
    }
  });
  row.capacidades = capacidades;
  return row;
}

// total_logros: cuantos trofeos desbloqueo el usuario (conteo de claves
// en progreso_logros). No se guarda en columna: se deriva en cada lectura
// igual que nivel/badge_actual, para que nunca se desincronice con el
// catalogo LOGROS de api/interacciones.js.
function conLogros(row) {
  if (!row) return row;
  const progreso = row.progreso_logros || {};
  row.total_logros = Object.keys(progreso).length;
  return row;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { id, tipo, limit = '10' } = req.query;

    if (req.method === 'GET') {
      if (tipo === 'leaderboard') {
        const rows = await sql(
          'SELECT id, nombre, avatar_url, perfil_tipo, xp_total, nivel, '
          + 'badge_actual, total_resenas, total_guardados '
          + 'FROM usuarios WHERE activo = true '
          + 'ORDER BY xp_total DESC '
          + 'LIMIT $1',
          [parseInt(limit)]
        );
        return res.json({ ok: true, data: rows.map(conNivel) });
      }
      if (id) {
        const rows = await sql('SELECT * FROM usuarios WHERE id = $1', [id]);
        if (!rows.length) return res.status(404).json({ ok: false, error: 'No encontrado' });
        return res.json({ ok: true, data: conLogros(conMisiones(conNivel(rows[0]))) });
      }
      return res.status(400).json({ ok: false, error: 'Falta id o tipo' });
    }

    if (req.method === 'POST') {
      const { auth_id, email, nombre, avatar_url, auth_provider } = req.body || {};
      if (!auth_id || !email || !nombre) {
        return res.status(400).json({ ok: false, error: 'Faltan: auth_id, email, nombre' });
      }
      const rows = await sql(
        'INSERT INTO usuarios (auth_id, email, nombre, avatar_url, auth_provider) '
        + 'VALUES ($1, $2, $3, $4, $5) '
        + 'ON CONFLICT (auth_id) DO UPDATE SET '
        + 'nombre = EXCLUDED.nombre, '
        + 'avatar_url = COALESCE(EXCLUDED.avatar_url, usuarios.avatar_url), '
        + 'ultimo_acceso = NOW() '
        + 'RETURNING *',
        [auth_id, email, nombre, avatar_url || null, auth_provider || 'email']
      );
      return res.json({ ok: true, data: conLogros(conMisiones(conNivel(rows[0]))) });
    }

    return res.status(405).json({ ok: false, error: 'M\u00e9todo no permitido' });

  } catch (err) {
    console.error('[usuarios]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
