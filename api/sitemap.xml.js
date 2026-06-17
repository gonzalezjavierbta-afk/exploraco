// api/sitemap.xml.js
// Genera sitemap dinámico con todos los destinos published de Neon
// Vercel rewrite: GET /sitemap.xml → /api/sitemap.xml

const { neon } = require('@neondatabase/serverless');

const BASE = 'https://exploraco.co';

// Páginas estáticas siempre presentes
const STATIC_PAGES = [
  { loc: '/',                       priority: '1.0', freq: 'daily'   },
  { loc: '/directorio-hostal.html', priority: '0.9', freq: 'daily'   },
  { loc: '/directorio-comida.html', priority: '0.9', freq: 'daily'   },
  { loc: '/directorio-sitio.html',  priority: '0.9', freq: 'daily'   },
  { loc: '/directorio-evento.html', priority: '0.9', freq: 'daily'   },
  { loc: '/publicar.html',          priority: '0.6', freq: 'monthly' },
  { loc: '/viajeros.html',          priority: '0.5', freq: 'weekly'  },
];

function xmlEsc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isoDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  return new Date(d).toISOString().slice(0, 10);
}

module.exports = async function handler(req, res) {
  // Solo GET
  if (req.method !== 'GET') return res.status(405).end();

  try {
    var sql = neon(process.env.DATABASE_URL);

    // Traer todos los destinos publicados
    var rows = await sql(
      `SELECT slug, categoria_slug, actualizado_en, creado_en, rating, total_resenas
       FROM destinos
       WHERE status = 'published'
       ORDER BY actualizado_en DESC NULLS LAST`
    );

    // Prioridad por categoría
    var CAT_PRIORITY = {
      hostal: '0.85', comida: '0.80', sitio: '0.80', evento: '0.75',
    };

    var urls = '';

    // Páginas estáticas
    STATIC_PAGES.forEach(function (p) {
      urls += `
  <url>
    <loc>${xmlEsc(BASE + p.loc)}</loc>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
  </url>`;
    });

    // Páginas individuales de destinos
    rows.forEach(function (row) {
      var priority = CAT_PRIORITY[row.categoria_slug] || '0.75';
      // Destinos con más reseñas tienen prioridad mayor
      if (row.total_resenas > 10) priority = '0.90';
      if (row.total_resenas > 50) priority = '0.95';

      urls += `
  <url>
    <loc>${xmlEsc(BASE + '/' + row.slug + '.html')}</loc>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
    <lastmod>${isoDate(row.actualizado_en || row.creado_en)}</lastmod>
  </url>`;
    });

    var xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).send(xml);

  } catch (err) {
    console.error('[sitemap]', err.message);
    // En caso de error, devolver sitemap mínimo
    var fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE}/</loc><priority>1.0</priority></url>
</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(fallback);
  }
};
