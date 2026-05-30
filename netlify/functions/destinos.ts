// netlify/functions/destinos.ts
// GET /api/destinos?categoria=hostal&ciudad=Bogotá&busqueda=...&destacados=true

import type { Handler } from '@netlify/functions';
import { getDestinos, getDestinosParaMapa } from '../../src/lib/neon';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, s-maxage=60', // Cache 60s en Netlify Edge
  };

  try {
    const params = event.queryStringParameters || {};

    // Modo mapa: solo coords y datos mínimos
    if (params.modo === 'mapa') {
      const destinos = await getDestinosParaMapa();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, data: destinos }),
      };
    }

    const destinos = await getDestinos({
      categoria: params.categoria as any,
      ciudad:    params.ciudad,
      busqueda:  params.busqueda,
      destacados: params.destacados === 'true',
      limit:  parseInt(params.limit  || '50'),
      offset: parseInt(params.offset || '0'),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        total: destinos.length,
        data: destinos,
      }),
    };
  } catch (err: any) {
    console.error('[/api/destinos]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'Error al obtener destinos' }),
    };
  }
};
