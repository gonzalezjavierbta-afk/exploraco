// api/usuarios.js — Vercel Serverless Function
const { neon } = require('@neondatabase/serverless');

// Mismos umbrales que XP_LEVELS en index.html (linea ~3625 del motor de
// puntos local). nivel/badge_actual existian como columnas en usuarios
// pero interacciones.js nunca las escribia -- se calculan aqui en cada
// lectura a partir de xp_total en vez de guardarse, para que nunca
// puedan desincronizarse sin tener que coordinar una escritura extra en
// cada uno de los 3 lugares de interacciones.js que suman XP.
const NIVELES = [
  { min: 0,    nombre: 'Viajero novato' },
  { min: 100,  nombre: 'Explorador' },
  { min: 300,  nombre: 'Aventurero' },
  { min: 600,  nombre: 'Embajador Colombia' },
  { min: 1000, nombre: 'Leyenda viajera' },
  { min: 2000, nombre: 'Maestro ExploraCO' },
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
const DESBLOQUEOS = { mis_organizador_bogota: 'organizar_actividad' };

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
        const rows = await sql`
          SELECT id, nombre, avatar_url, perfil_tipo, xp_total, nivel,
                 badge_actual, total_resenas, total_guardados
          FROM usuarios WHERE activo = true
          ORDER BY xp_total DESC
          LIMIT ${parseInt(limit)}
        `;
        return res.json({ ok: true, data: rows.map(conNivel) });
      }
      if (id) {
        const rows = await sql`SELECT * FROM usuarios WHERE id = ${id}`;
        if (!rows.length) return res.status(404).json({ ok: false, error: 'No encontrado' });
        return res.json({ ok: true, data: conMisiones(conNivel(rows[0])) });
      }
      return res.status(400).json({ ok: false, error: 'Falta id o tipo' });
    }

    if (req.method === 'POST') {
      const { auth_id, email, nombre, avatar_url, auth_provider } = req.body || {};
      if (!auth_id || !email || !nombre) {
        return res.status(400).json({ ok: false, error: 'Faltan: auth_id, email, nombre' });
      }
      const rows = await sql`
        INSERT INTO usuarios (auth_id, email, nombre, avatar_url, auth_provider)
        VALUES (${auth_id}, ${email}, ${nombre}, ${avatar_url || null}, ${auth_provider || 'email'})
        ON CONFLICT (auth_id) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          avatar_url = COALESCE(EXCLUDED.avatar_url, usuarios.avatar_url),
          ultimo_acceso = NOW()
        RETURNING *
      `;
      return res.json({ ok: true, data: conMisiones(conNivel(rows[0])) });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido' });

  } catch (err) {
    console.error('[usuarios]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
