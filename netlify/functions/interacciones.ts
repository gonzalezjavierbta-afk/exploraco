// netlify/functions/interacciones.ts
// POST /api/interacciones  — guardar, quitar, reseña
// GET  /api/interacciones?tipo=mapa&usuario_id=...

import type { Handler } from '@netlify/functions';
import {
  guardarDestino, quitarGuardado, getMiMapa,
  publicarResena, getResenas, isGuardado,
} from '../../src/lib/neon';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};

    // GET — Mi Mapa o reseñas de un destino
    if (event.httpMethod === 'GET') {
      if (params.tipo === 'mapa' && params.usuario_id) {
        const guardados = await getMiMapa(params.usuario_id);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: guardados }) };
      }
      if (params.tipo === 'resenas' && params.destino_id) {
        const resenas = await getResenas(params.destino_id, parseInt(params.limit || '20'));
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: resenas }) };
      }
      if (params.tipo === 'is_guardado' && params.usuario_id && params.destino_id) {
        const guardado = await isGuardado(params.usuario_id, params.destino_id);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, guardado }) };
      }
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Parámetros inválidos' }) };
    }

    // POST — guardar destino o publicar reseña
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { tipo, usuario_id, destino_id } = body;

      if (!usuario_id || !destino_id || !tipo) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Faltan campos requeridos' }) };
      }

      if (tipo === 'guardado') {
        const result = await guardarDestino(usuario_id, destino_id);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...result }) };
      }

      if (tipo === 'quitar_guardado') {
        await quitarGuardado(usuario_id, destino_id);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      if (tipo === 'resena') {
        if (!body.rating || body.rating < 1 || body.rating > 5) {
          return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Rating inválido (1-5)' }) };
        }
        const result = await publicarResena({
          usuarioId: usuario_id,
          destinoId: destino_id,
          rating: parseFloat(body.rating),
          texto: body.texto,
        });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...result }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Tipo no reconocido' }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };

  } catch (err: any) {
    console.error('[/api/interacciones]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'Error interno del servidor' }),
    };
  }
};
