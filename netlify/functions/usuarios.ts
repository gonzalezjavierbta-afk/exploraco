// netlify/functions/usuarios.ts
// GET  /api/usuarios?id=...
// GET  /api/usuarios?tipo=leaderboard
// POST /api/usuarios  — upsert (login/registro)

import type { Handler } from '@netlify/functions';
import { getUsuarioPorId, upsertUsuario, getLeaderboard } from '../../src/lib/neon';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};

    if (event.httpMethod === 'GET') {
      // Leaderboard
      if (params.tipo === 'leaderboard') {
        const ranking = await getLeaderboard(parseInt(params.limit || '10'));
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: ranking }) };
      }
      // Perfil por ID
      if (params.id) {
        const usuario = await getUsuarioPorId(params.id);
        if (!usuario) return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: 'Usuario no encontrado' }) };
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: usuario }) };
      }
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Falta parámetro id o tipo' }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { auth_id, email, nombre, avatar_url, auth_provider } = body;

      if (!auth_id || !email || !nombre) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Faltan campos: auth_id, email, nombre' }) };
      }

      const usuario = await upsertUsuario({ auth_id, email, nombre, avatar_url, auth_provider });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: usuario }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };

  } catch (err: any) {
    console.error('[/api/usuarios]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'Error interno del servidor' }),
    };
  }
};
