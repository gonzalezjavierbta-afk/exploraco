// api/admin.js -- endpoint unificado para todas las funciones del admin (ASCII-safe: 0 backticks, 0 no-ASCII)
// Ruta por ?recurso=X:
//   solicitudes  -> moderar-destinos (listar/aprobar/rechazar)
//   resenas      -> resenas-admin (listar/eliminar resenas)
//   destacado    -> destacar (activar/desactivar perfiles)
//   notificaciones -> envio de emails
//   consumibles  -> CRUD consumibles (gamificacion v4, ADR-018)
//   activos_ocultos -> moderar propuestas Wayfarer (tipo=activo_oculto_moderar,
//     Entrega 016 / migracion 016: aprobar otorga +50 XP al proponente con
//     reparto piramidal; rechazar no paga nada. Cero borrado fisico)
//   salud_red    -> panel "Salud de la Red" (ADR-053): agrega xp_ledger por
//     dia/accion (XP entregado, usuarios activos, caps, distribucion_nivel
//     {derivado, visible}, exentos y nivel_max vs nivel derivado). GET;
//     degrada 42P01 si la migracion 031 no corrio
//   mercado      -> Mercado de Emprendedores (migracion 034): normas por Casa
//     (mercado_config_lista / mercado_config_editar) y moderacion de ofertas
//     (mercado_ofertas_lista / mercado_ofertas_moderar). La moderacion NO
//     devuelve inventario (es sancion admin, no cancelacion del dueno).
//     Degrada 503 SCHEMA_NOT_MIGRATED (42P01/42703) si la 034 no corrio.
// Auth: Bearer exploraco12345 (o X-Internal-Secret) en todos los casos
// v4 (ADR-053, 2026-09-21): en salud_red, distribucion_nivel pasa a exponer
// las DOS vistas {derivado, visible} (economia vs insignia, Dec 5) y se
// agrega el bloque exentos {xp_total_entregado, eventos, por_accion}
// (misiones/logros/referidos/admin_xp y restas), filtrado por la misma
// ventana dias. Degradacion intacta (42P01 en xp_ledger -> 200 degradado).
// v3 (ADR-053 / Enmienda 1, 2026-09-21): rama NUEVA GET ?recurso=salud_red
// (router real por ?recurso=, gate auth()) con degradacion 42P01; expone
// por_dia/por_accion/usuarios/caps/nivel_max_vs_derivado/distribucion_nivel/
// alertas. No crea
// endpoints (8/8, ADR-001). El repricing de consumibles lo aplica la
// migracion 031 en consumibles.precio_xp; aqui NO hay precios hardcodeados.
// v2 (ADR-035, 2026-09-17): precio_xp acepta decimal (punto o coma) y el
// reparto de referidos usa ROUND(...,2) con Number; las respuestas de
// resenas/consumibles normalizan las columnas XP (numeric llega string).
// v5 (Mercado de Emprendedores, migracion 034, 2026-09-23): rama NUEVA
// ?recurso=mercado con 4 tipos (mercado_config_lista / mercado_config_editar
// / mercado_ofertas_lista / mercado_ofertas_moderar). Reusa auth()/authInternal()
// del archivo y esquemaAusente() para la degradacion 503 SCHEMA_NOT_MIGRATED.
// No crea endpoints (8/8, ADR-001).

const { neon } = require('@neondatabase/serverless');

var RESEND_API  = 'https://api.resend.com/emails';
var FROM_EMAIL  = 'ExploraCO <noreply@exploraco.co>';
var ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@exploraco.co';

var PLANES = {
  mensual:    { precio: 49000,  dias: 30,  label: 'Mensual'    },
  trimestral: { precio: 120000, dias: 90,  label: 'Trimestral' },
  anual:      { precio: 390000, dias: 365, label: 'Anual'       },
};

function auth(req) {
  return (req.headers['authorization']||'').replace('Bearer ','').trim()
    === (process.env.ADMIN_SECRET || 'exploraco12345');
}
function authInternal(req) {
  return (req.headers['x-internal-secret']||'').trim()
    === (process.env.ADMIN_SECRET || 'exploraco12345');
}

// XP decimal (ADR-035): las columnas XP son numeric(12,2) y Neon las
// entrega como STRING. red2 = half-up a 2 decimales; numXp = a Number.
function red2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
function numXp(v) { var n = Number(v); return isFinite(n) ? n : 0; }
// Porcentajes del mercado (mercado_config.*_pct son numeric(5,4)): half-up a
// 4 decimales. No reusa red2 porque el impuesto/arancel viven en escala 0..1.
function red4(v) { return Math.round((Number(v) || 0) * 10000) / 10000; }

// Espejo de REPORTE de los 40 umbrales de api/usuarios.js:NIVELES (ADR-053
// Decision 3) para resolver el nivel DERIVADO de xp_total dentro de SQL puro
// en la rama admin salud_red. NO hay require cruzado entre funciones
// serverless (patron documentado arriba, admin.js:56-59): este CASE es solo
// LECTURA para el reporte (nivel_max vs nivel derivado); no alimenta M_nivel
// ni escribe nada. Si los umbrales cambian en la fuente, este espejo debe
// actualizarse (lo cubre el smoke de espejos de umbrales).
var NIVEL_DERIVADO_SQL = 'CASE '
  + 'WHEN xp_total >= 100000 THEN 40 '
  + 'WHEN xp_total >= 95450 THEN 39 '
  + 'WHEN xp_total >= 90950 THEN 38 '
  + 'WHEN xp_total >= 86600 THEN 37 '
  + 'WHEN xp_total >= 82300 THEN 36 '
  + 'WHEN xp_total >= 78150 THEN 35 '
  + 'WHEN xp_total >= 74050 THEN 34 '
  + 'WHEN xp_total >= 70050 THEN 33 '
  + 'WHEN xp_total >= 66150 THEN 32 '
  + 'WHEN xp_total >= 62400 THEN 31 '
  + 'WHEN xp_total >= 58700 THEN 30 '
  + 'WHEN xp_total >= 55050 THEN 29 '
  + 'WHEN xp_total >= 51600 THEN 28 '
  + 'WHEN xp_total >= 48200 THEN 27 '
  + 'WHEN xp_total >= 44900 THEN 26 '
  + 'WHEN xp_total >= 41750 THEN 25 '
  + 'WHEN xp_total >= 38650 THEN 24 '
  + 'WHEN xp_total >= 35700 THEN 23 '
  + 'WHEN xp_total >= 32800 THEN 22 '
  + 'WHEN xp_total >= 30050 THEN 21 '
  + 'WHEN xp_total >= 27400 THEN 20 '
  + 'WHEN xp_total >= 24850 THEN 19 '
  + 'WHEN xp_total >= 22450 THEN 18 '
  + 'WHEN xp_total >= 20100 THEN 17 '
  + 'WHEN xp_total >= 17900 THEN 16 '
  + 'WHEN xp_total >= 15800 THEN 15 '
  + 'WHEN xp_total >= 13850 THEN 14 '
  + 'WHEN xp_total >= 12000 THEN 13 '
  + 'WHEN xp_total >= 10250 THEN 12 '
  + 'WHEN xp_total >= 8650 THEN 11 '
  + 'WHEN xp_total >= 7150 THEN 10 '
  + 'WHEN xp_total >= 5800 THEN 9 '
  + 'WHEN xp_total >= 4550 THEN 8 '
  + 'WHEN xp_total >= 3450 THEN 7 '
  + 'WHEN xp_total >= 2500 THEN 6 '
  + 'WHEN xp_total >= 1650 THEN 5 '
  + 'WHEN xp_total >= 1000 THEN 4 '
  + 'WHEN xp_total >= 500 THEN 3 '
  + 'WHEN xp_total >= 150 THEN 2 '
  + 'ELSE 1 END';

// Errores de esquema ausente (migracion pendiente, patron BUG-021): tabla
// (42P01) o columna (42703) que aun no existe. Unico predicado para no
// repetir el codigo en cada degradacion de salud_red (Regla de No-Duplicidad).
function esquemaAusente(e) {
  return !!(e && (e.code === '42P01' || e.code === '42703'));
}

// Normaliza una fila de mercado_config para la respuesta JSON: los pct a 4
// decimales y los precios a 2 (numeric de Neon llega como string). Unico
// punto de normalizacion para las dos vias que devuelven config (lista y
// editar) -- Regla de No-Duplicidad.
function normalizarConfigMercado(r) {
  r.impuesto_base_pct = red4(numXp(r.impuesto_base_pct));
  r.arancel_inter_casa_pct = red4(numXp(r.arancel_inter_casa_pct));
  r.precio_min = red2(numXp(r.precio_min));
  r.precio_max = red2(numXp(r.precio_max));
  return r;
}

// == CATEGORIA DE CONSUMIBLE (WP-6, TSK-103 / ADR-028) ====================
// Categorias conocidas del catalogo (migracion 018): perfil | impulso |
// social | coleccion | general. La columna consumibles.categoria NO lleva
// CHECK a proposito (catalogo administrable), asi que se acepta cualquier
// slug ASCII de hasta 30 caracteres. Vacio, tipo invalido o mayor a 30
// devuelve null y el caller responde 400 CATEGORIA_INVALIDA.
function normalizarCategoriaConsumible(valor) {
  var s = String(valor == null ? '' : valor).trim().toLowerCase();
  if (!s || s.length > 30) return null;
  if (!/^[a-z0-9_-]+$/.test(s)) return null;
  return s;
}

// == ERA EXCLUSIVA DE CONSUMIBLE (ADR-056) ================================
// Catalogo administrable: era_exclusiva vacia/NULL => null (sin gate).
// Comparacion case-insensitive contra las 5 eras del motor v7; cualquier
// valor no reconocido cae a null (nunca se escribe basura en el gate).
function normalizarEraConsumible(v) {
  var s = String(v == null ? '' : v).trim().toLowerCase();
  if (!s || s === 'ninguna' || s === 'null' || s === 'sin_gate') return null;
  var eras = { caminante:'Caminante', explorador:'Explorador', cronista:'Cronista', leyenda:'Leyenda', mito:'Mito' };
  return eras[s] || null;
}

// == REPARTO PIRAMIDAL (Entrega 016) ======================================
// EXCEPCION CONTROLADA al tripwire de no-duplicidad (GSD 2.1): los
// archivadores api/*.js se despliegan como funciones serverless
// independientes (sin require cruzado entre ellas), asi que cada una es
// autosuficiente. Esta copia identica viene de api/interacciones.js v13
// (FUENTE DE VERDAD; si cambia alla, actualizar aqui). Constante API:
// con WITH RECURSIVE cadena de 5 niveles + UPDATE como SENTENCIA
// PRINCIPAL con FROM cadena (regla Postgres 0A000: un UPDATE dentro del
// WITH es ilegal), ROUND half-up a 2 decimales de 10/5/3/2/1 % sobre
// xp_ref_total (ADR-035) y tope referidos_directos_contados < 500.
// Nunca lanza: degrada a false.
function repartirXpReferidos(sql, usuarioId, xp) {
  var xpGan = Number(xp) || 0;
  if (!usuarioId || !(xpGan > 0)) return Promise.resolve(false);
  return sql(
    'WITH RECURSIVE cadena AS ('
    + 'SELECT u.referido_por AS ancestro_id, 1 AS nivel FROM usuarios u '
    + 'WHERE u.id=$1 AND u.referido_por IS NOT NULL '
    + 'UNION ALL '
    + 'SELECT u2.referido_por, cadena.nivel + 1 FROM usuarios u2 '
    + 'JOIN cadena ON u2.id = cadena.ancestro_id '
    + 'WHERE cadena.nivel < 5 AND u2.referido_por IS NOT NULL'
    + ') '
    + 'UPDATE usuarios a '
    + 'SET xp_ref_total = COALESCE(xp_ref_total, 0) + ROUND($2 * ('
    + 'CASE c.nivel WHEN 1 THEN 0.10 WHEN 2 THEN 0.05 '
    + 'WHEN 3 THEN 0.03 WHEN 4 THEN 0.02 ELSE 0.01 END), 2) '
    + 'FROM cadena c WHERE a.id = c.ancestro_id '
    + 'AND a.referidos_directos_contados < 500',
    [usuarioId, xpGan]
  ).then(function(){ return true; }).catch(function(){ return false; });
}

// -- EMAIL ----------------------------------------------------------
async function sendEmail(to, subject, html) {
  var key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: 'no_api_key' };
  try {
    var r = await fetch(RESEND_API, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+key },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Resend '+r.status);
    return { ok: true, id: d.id };
  } catch(e) { return { ok: false, error: e.message }; }
}

function emailResena(b) {
  var s = '\u2605'.repeat(Math.round(b.rating||0))+'\u2606'.repeat(5-Math.round(b.rating||0));
  return '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem">'
    + '<h2 style="color:#E8A020">\u2b50 Nueva rese\u00f1a \u2014 ' + (b.destino_nombre||'') + '</h2>'
    + '<p><strong>Por:</strong> ' + (b.usuario_nombre||'Visitante') + '</p>'
    + '<p><strong>Rating:</strong> ' + s + '</p>'
    + '<p><strong>Texto:</strong> ' + (b.texto||'(sin texto)') + '</p>'
    + '<p><a href="https://exploraco.vercel.app/admin.html" style="background:#E8A020;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">Ver en admin \u2192</a></p>'
    + '</div>';
}
function emailSolicitud(b) {
  return '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem">'
    + '<h2 style="color:#6366f1">\ud83d\udd14 Nueva solicitud \u2014 ' + (b.nombre||'') + '</h2>'
    + '<p><strong>Ciudad:</strong> ' + (b.ciudad||'') + '</p>'
    + '<p><strong>Categor\u00eda:</strong> ' + (b.categoria||'') + '</p>'
    + '<p><strong>WhatsApp:</strong> <a href="https://wa.me/' + b.whatsapp + '">' + b.whatsapp + '</a></p>'
    + '<p><strong>Descripci\u00f3n:</strong> ' + (b.descripcion_corta||'') + '</p>'
    + '<p><a href="https://exploraco.vercel.app/admin.html" style="background:#E8A020;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">Revisar en admin \u2192</a></p>'
    + '</div>';
}

// -- HANDLER PRINCIPAL ------------------------------------------------
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var recurso = req.query.recurso || '';
  var sql     = neon(process.env.DATABASE_URL);
  var body    = req.body || {};

  // == SOLICITUDES (moderar-destinos) ==================================
  if (recurso === 'solicitudes') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

    if (req.method === 'GET') {
      var status  = req.query.status || 'draft';
      var allowed = ['draft','published','archived'];
      if (!allowed.includes(status)) status = 'draft';
      var limit  = Math.min(parseInt(req.query.limit)  || 15, 100);
      var offset = Math.max(parseInt(req.query.offset) || 0, 0);

      var rows = await sql(
        'SELECT d.id, d.slug, d.nombre, '
        + 'd.categoria_slug AS categoria, c.nombre AS categoria_nombre, '
        + 'd.ciudad, d.region AS departamento, '
        + 'd.lead AS descripcion_corta, d.foto_hero AS foto_principal, '
        + 'd.precio_desde, d.lat, d.lng, d.status, d.destacado, '
        + 'd.creado_en AS created_at, '
        + 'd.whatsapp, d.email, d.web, d.instagram, '
        + 'd.tags AS detalles '
        + 'FROM destinos d '
        + 'LEFT JOIN categorias c ON c.slug = d.categoria_slug '
        + 'WHERE d.status = $1 '
        + 'ORDER BY d.creado_en DESC LIMIT $2 OFFSET $3',
        [status, limit, offset]
      );
      var total = await sql('SELECT COUNT(*) AS n FROM destinos WHERE status=$1',[status]);
      return res.status(200).json({ ok:true, status, total: parseInt((total[0]||{}).n||0), items:rows });
    }

    if (req.method === 'POST') {
      var acciones = { aprobar:'published', rechazar:'archived', pendiente:'draft' };
      if (!body.id || !acciones[body.accion])
        return res.status(400).json({ ok:false, error:'Falta id o accion v\u00e1lida' });
      var nuevo = acciones[body.accion];
      var upd = await sql(
        'UPDATE destinos SET status=$1, destacado=$2, actualizado_en=NOW() '
        + 'WHERE id=$3 RETURNING id, slug, nombre, status',
        [nuevo, Boolean(body.destacado||false), body.id]
      );
      if (!upd.length) return res.status(404).json({ ok:false, error:'No encontrado' });
      if (nuevo === 'published') {
        try {
          var baseUrlAdm = (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://exploraco.vercel.app');
          await fetch(baseUrlAdm + '/api/interacciones', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + (process.env.ADMIN_SECRET || 'exploraco12345')
            },
            body: JSON.stringify({ tipo: 'publicar_lugar_otorgar', destino_id: body.id })
          });
        } catch (eOtorga) {
          console.warn('[admin solicitudes] otorgar XP fallo: ' + (eOtorga && eOtorga.message));
        }
      }
      var msgs = { published:'\u2705 Publicado', archived:'\ud83d\uddc4\ufe0f Archivado', draft:'\u23f3 Borrador' };
      return res.status(200).json({
        ok:true, mensaje: msgs[nuevo],
        url: nuevo==='published' ? 'https://exploraco.vercel.app/'+upd[0].slug+'.html' : null,
        destino: upd[0],
      });
    }
  }

  // == RESENAS (resenas-admin) ==========================================
  if (recurso === 'resenas') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

    if (req.method === 'GET') {
      var limit2  = Math.min(parseInt(req.query.limit)||50, 200);
      var offset2 = Math.max(parseInt(req.query.offset)||0, 0);
      var slug2   = req.query.slug || null;

      var conds2 = ["i.tipo='resena'"]; var params2=[]; var pi2=1;
      if (slug2) { conds2.push('d.slug=$'+pi2++); params2.push(slug2); }

      var rows2 = await sql(
        'SELECT i.id, i.rating, i.texto, i.creado_en, i.xp_ganado, '
        + 'u.nombre AS usuario_nombre, u.email AS usuario_email, '
        + 'd.id AS destino_id, d.slug AS destino_slug, '
        + 'd.nombre AS destino_nombre, d.ciudad AS destino_ciudad '
        + 'FROM interacciones i '
        + 'LEFT JOIN usuarios u ON u.id=i.usuario_id '
        + 'LEFT JOIN destinos d ON d.id=i.destino_id '
        + 'WHERE ' + conds2.join(' AND ') + ' '
        + 'ORDER BY i.creado_en DESC LIMIT $' + pi2 + ' OFFSET $' + (pi2+1),
        [...params2, limit2, offset2]
      );
      var total2 = await sql(
        'SELECT COUNT(*) AS n, ROUND(AVG(i.rating)::numeric,2) AS avg, '
        + 'COUNT(CASE WHEN i.rating>=4 THEN 1 END) AS pos, '
        + 'COUNT(CASE WHEN i.rating<=2 THEN 1 END) AS neg '
        + 'FROM interacciones i LEFT JOIN destinos d ON d.id=i.destino_id '
        + 'WHERE ' + conds2.join(' AND '), params2
      );
      var st2 = total2[0]||{};
      return res.status(200).json({
        ok:true, total: parseInt(st2.n||0),
        stats: { total:parseInt(st2.n||0), rating_promedio:parseFloat(st2.avg||0), positivas:parseInt(st2.pos||0), negativas:parseInt(st2.neg||0) },
        data: rows2.map(function(r){
          var txt=r.texto||''; var m=txt.match(/^\[([^\]]+)\]\s*/);
          return { id:r.id, rating: r.rating?parseFloat(r.rating):0, texto: m?txt.slice(m[0].length):txt,
            fecha:r.creado_en, xp:red2(numXp(r.xp_ganado)),
            usuario:{ nombre:r.usuario_nombre||(m?m[1]:'An\u00f3nimo'), email:r.usuario_email||null },
            destino:{ id:r.destino_id, slug:r.destino_slug||'', nombre:r.destino_nombre||'', ciudad:r.destino_ciudad||'' }};
        }),
      });
    }

    if (req.method === 'DELETE') {
      var rid = req.query.id || body.id;
      if (!rid) return res.status(400).json({ ok:false, error:'id requerido' });
      var rv = await sql('SELECT destino_id FROM interacciones WHERE id=$1 LIMIT 1',[rid]);
      if (!rv.length) return res.status(404).json({ ok:false, error:'No encontrada' });
      await sql('DELETE FROM interacciones WHERE id=$1',[rid]);
      // Recalcular sobre resena+rating para que AVG y COUNT sigan alineados
      // cuando un usuario conserva su fila de voto rapido (v5, TSK-015).
      await sql(
        'UPDATE destinos SET '
        + 'rating=(SELECT ROUND(AVG(rating)::numeric,2) FROM interacciones WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\') AND rating IS NOT NULL), '
        + 'total_resenas=(SELECT COUNT(*) FROM interacciones WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\')), '
        + 'actualizado_en=NOW() WHERE id=$1',
        [rv[0].destino_id]
      ).catch(function(){});
      return res.status(200).json({ ok:true, mensaje:'Rese\u00f1a eliminada' });
    }
  }

  // == DESTACADO =========================================================
  if (recurso === 'destacado') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

    if (req.method === 'GET') {
      var slug3 = req.query.slug;
      if (!slug3) {
        var todos = await sql(
          'SELECT slug,nombre,ciudad,categoria_slug,destacado, '
          + 'tags->>\'destacado_hasta\' AS destacado_hasta, tags->>\'plan\' AS plan '
          + 'FROM destinos WHERE status=\'published\' ORDER BY destacado DESC, rating DESC NULLS LAST'
        );
        return res.status(200).json({ ok:true, data:todos });
      }
      var dr = await sql(
        'SELECT id,slug,nombre,ciudad,destacado, '
        + 'tags->>\'destacado_hasta\' AS destacado_hasta, tags->>\'plan\' AS plan '
        + 'FROM destinos WHERE slug=$1 LIMIT 1', [slug3]
      );
      if (!dr.length) return res.status(404).json({ ok:false, error:'No encontrado' });
      var dd = dr[0];
      var hasta3 = dd.destacado_hasta ? new Date(dd.destacado_hasta) : null;
      var activo3 = dd.destacado && hasta3 && hasta3 > new Date();
      return res.status(200).json({ ok:true, slug:dd.slug, nombre:dd.nombre, destacado:dd.destacado||false,
        activo:activo3, plan:dd.plan||null, destacado_hasta:dd.destacado_hasta||null,
        dias_restantes: activo3 ? Math.ceil((hasta3-new Date())/86400000) : 0, planes:PLANES });
    }

    if (req.method === 'POST') {
      var plan3 = body.plan || 'mensual';
      if (!body.slug || !PLANES[plan3]) return res.status(400).json({ ok:false, error:'slug/plan inv\u00e1lido' });
      var hasta4 = new Date(Date.now()+PLANES[plan3].dias*86400000).toISOString();
      var upd3 = await sql(
        'UPDATE destinos SET destacado=true, '
        + 'tags=COALESCE(tags,\'{}\')||$2::jsonb, actualizado_en=NOW() '
        + 'WHERE slug=$1 RETURNING id,slug,nombre',
        [body.slug, JSON.stringify({ destacado_hasta:hasta4, plan:plan3, precio:PLANES[plan3].precio })]
      );
      if (!upd3.length) return res.status(404).json({ ok:false, error:'No encontrado' });
      return res.status(200).json({ ok:true, mensaje:'\u2705 Destacado activado \u2014 plan '+PLANES[plan3].label, hasta:hasta4, destino:upd3[0] });
    }

    if (req.method === 'DELETE') {
      var slug4 = req.query.slug;
      if (!slug4) return res.status(400).json({ ok:false, error:'slug requerido' });
      await sql(
        'UPDATE destinos SET destacado=false, '
        + 'tags=COALESCE(tags,\'{}\')-\'destacado_hasta\'-\'plan\'-\'precio\', actualizado_en=NOW() '
        + 'WHERE slug=$1', [slug4]
      );
      return res.status(200).json({ ok:true, mensaje:'Destacado removido' });
    }
  }

  // == NOTIFICACIONES (email) ============================================
  if (recurso === 'notificaciones') {
    if (!auth(req) && !authInternal(req))
      return res.status(401).json({ ok:false, error:'No autorizado' });
    if (req.method !== 'POST') return res.status(405).end();

    if (body.tipo === 'resena') {
      var r4 = await sendEmail(ADMIN_EMAIL,
        '\u2b50 Nueva rese\u00f1a \u2014 '+(body.destino_nombre||''), emailResena(body));
      return res.status(200).json(r4);
    }
    if (body.tipo === 'solicitud') {
      var r5 = await sendEmail(ADMIN_EMAIL,
        '\ud83d\udd14 Nueva solicitud \u2014 '+(body.nombre||''), emailSolicitud(body));
      return res.status(200).json(r5);
    }
    return res.status(400).json({ ok:false, error:'tipo debe ser: resena | solicitud' });
  }

  // == CONSUMIBLES (gamificacion v4 / ADR-018) =============================
  // CRUD sobre la tabla consumibles (migracion 010). La clave es la
  // identidad: nunca se edita. El ledger compra_consumibles guarda
  // xp_pagado como snapshot al momento de la compra, asi que cambiar
  // precio_xp aqui solo afecta compras futuras, nunca el historial.
  // Cero Borrado Logico: no existe DELETE; el estado se controla con
  // consumibles_toggle (activo = NOT activo).
  if (recurso === 'consumibles') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

    var tipo = req.query.tipo || '';

    // --- Lista: todos (activos e inactivos) ------------------------------
    if (tipo === 'consumibles_lista') {
      // Degradacion (migracion 035 pendiente): sin era_exclusiva, pero la
      // lista sigue completa. El catch de la primera consulta devuelve null
      // solo ante error; un [] legitimo es truthy y no reintenta.
      var filasC = await sql(
        'SELECT id, clave, nombre, descripcion, precio_xp, categoria, era_exclusiva, activo, creado_en '
        + 'FROM consumibles ORDER BY activo DESC, precio_xp ASC, clave ASC'
      ).catch(function(){ return null; });
      if (!filasC) {
        filasC = await sql(
          'SELECT id, clave, nombre, descripcion, precio_xp, categoria, activo, creado_en '
          + 'FROM consumibles ORDER BY activo DESC, precio_xp ASC, clave ASC'
        );
      }
      filasC = filasC.map(function(c){
        c.precio_xp = red2(numXp(c.precio_xp));
        c.era_exclusiva = c.era_exclusiva || null;
        return c;
      });
      return res.status(200).json({ ok:true, data: filasC, total: filasC.length });
    }

    // --- Crear: clave unica, precio entero > 0 ----------------------------
    if (tipo === 'consumibles_crear') {
      var claveN = String(body.clave||'').trim().toLowerCase();
      var nombreN = String(body.nombre||'').trim();
      var descN  = String(body.descripcion||'').trim();
      // ADR-035: precio_xp es numeric(12,2); acepta decimal con punto o coma.
      var precioN = parseFloat(String(body.precio_xp == null ? '' : body.precio_xp).replace(',', '.'));
      if (!claveN || !nombreN) {
        return res.status(400).json({ ok:false, error:'clave y nombre son obligatorios' });
      }
      if (!isFinite(precioN) || precioN <= 0) {
        return res.status(400).json({ ok:false, error:'precio_xp debe ser un numero mayor que 0' });
      }
      precioN = red2(precioN);
      // WP-6 (TSK-103 / ADR-028): categoria opcional; default 'general'
      // (mismo default de la columna). Si viene, se normaliza y valida.
      var catN = 'general';
      if (body.categoria !== undefined && String(body.categoria).trim() !== '') {
        catN = normalizarCategoriaConsumible(body.categoria);
        if (!catN) return res.status(400).json({ ok:false, error:'CATEGORIA_INVALIDA' });
      }
      // ADR-056: era_exclusiva opcional; vacio/desconocido -> null (sin gate).
      var eraN = normalizarEraConsumible(body.era_exclusiva);
      var existC = await sql('SELECT 1 FROM consumibles WHERE clave=$1 LIMIT 1',[claveN]);
      if (existC.length) {
        return res.status(409).json({ ok:false, error:'Ya existe un consumible con esa clave' });
      }
      var insC = await sql(
        'INSERT INTO consumibles (clave, nombre, descripcion, precio_xp, categoria, era_exclusiva) '
        + 'VALUES ($1,$2,$3,$4,$5,$6) '
        + 'RETURNING id, clave, nombre, descripcion, precio_xp, categoria, era_exclusiva, activo, creado_en',
        [claveN, nombreN, descN, precioN, catN, eraN]
      );
      insC[0].precio_xp = red2(numXp(insC[0].precio_xp));
      return res.status(201).json({ ok:true, data: insC[0], mensaje:'Consumible creado' });
    }

    // --- Editar: nombre/descripcion/precio_xp (NUNCA la clave) ------------
    if (tipo === 'consumibles_editar') {
      if (!body.id) {
        return res.status(400).json({ ok:false, error:'id requerido' });
      }
      var setsC = []; var paramsC = []; var piC = 1;
      if ('nombre' in body) {
        var nomE = String(body.nombre||'').trim();
        if (!nomE) return res.status(400).json({ ok:false, error:'nombre no puede quedar vacio' });
        setsC.push('nombre=$'+piC++); paramsC.push(nomE);
      }
      if ('descripcion' in body) {
        setsC.push('descripcion=$'+piC++); paramsC.push(String(body.descripcion||'').trim());
      }
      if ('precio_xp' in body) {
        var precioE = parseFloat(String(body.precio_xp == null ? '' : body.precio_xp).replace(',', '.'));
        if (!isFinite(precioE) || precioE < 0) {
          return res.status(400).json({ ok:false, error:'precio_xp debe ser un numero mayor o igual a 0' });
        }
        setsC.push('precio_xp=$'+piC++); paramsC.push(red2(precioE));
      }
      // WP-6 (TSK-103 / ADR-028): categoria editable (default de columna
      // 'general'; la lista conocida vive en normalizarCategoriaConsumible).
      if ('categoria' in body) {
        var catE = normalizarCategoriaConsumible(body.categoria);
        if (!catE) return res.status(400).json({ ok:false, error:'CATEGORIA_INVALIDA' });
        setsC.push('categoria=$'+piC++); paramsC.push(catE);
      }
      // ADR-056: era_exclusiva editable; vacio/desconocido -> null (quita
      // el gate). Se distingue "no enviado" (no toca la columna) de null.
      if ('era_exclusiva' in body) {
        var eraE = normalizarEraConsumible(body.era_exclusiva);
        setsC.push('era_exclusiva=$'+piC++); paramsC.push(eraE);
      }
      if (!setsC.length) {
        return res.status(400).json({ ok:false, error:'nada que editar: envia nombre, descripcion, precio_xp, categoria o era_exclusiva' });
      }
      paramsC.push(body.id);
      var updC = await sql(
        'UPDATE consumibles SET '+setsC.join(', ')+' WHERE id=$'+piC
        + ' RETURNING id, clave, nombre, descripcion, precio_xp, categoria, era_exclusiva, activo',
        paramsC
      );
      if (!updC.length) return res.status(404).json({ ok:false, error:'Consumible no encontrado' });
      updC[0].precio_xp = red2(numXp(updC[0].precio_xp));
      return res.status(200).json({ ok:true, data: updC[0], mensaje:'Consumible actualizado' });
    }

    // --- Toggle: Cero Borrado Logico (activo = NOT activo) ----------------
    if (tipo === 'consumibles_toggle') {
      if (!body.id) return res.status(400).json({ ok:false, error:'id requerido' });
      var filaT = await sql('SELECT activo FROM consumibles WHERE id=$1 LIMIT 1',[body.id]);
      if (!filaT.length) return res.status(404).json({ ok:false, error:'Consumible no encontrado' });
      // Si body.activo viene explicito se respeta (contrato spec); si no se
      // alterna el estado actual (toggle puro pedido por la tarea).
      var nuevoT = (typeof body.activo === 'boolean') ? body.activo : !filaT[0].activo;
      await sql('UPDATE consumibles SET activo=$1 WHERE id=$2',[nuevoT, body.id]);
      return res.status(200).json({
        ok:true, activo:nuevoT,
        mensaje: nuevoT ? 'Consumible activado' : 'Consumible desactivado'
      });
    }

    return res.status(400).json({ ok:false, error:'tipo invalido para recurso consumibles' });
  }

  // == MERCADO DE EMPRENDEDORES (migracion 034) ============================
  // Router real por ?recurso=mercado (mismo patron que consumibles). No crea
  // endpoints (8/8, ADR-001). Auth reusa auth()/authInternal() del archivo.
  // Degradacion: si mercado_config / mercado_ofertas no existen (42P01) o les
  // falta una columna (42703), responde 503 SCHEMA_NOT_MIGRATED (patron
  // activos_ocultos) porque la 034 aun no corrio. Sin SELECT *: cada consulta
  // lista sus columnas explicitamente.
  // MODERACION vs CANCELACION DEL DUENO: mercado_ofertas_moderar SOLO marca
  // estado='cancelada' (Cero Borrado Logico) y NO devuelve inventario al
  // vendedor: es una sancion administrativa, no el desistimiento del dueno
  // (que si reintegraria cantidad_restante al inventario del vendedor).
  if (recurso === 'mercado') {
    if (!auth(req) && !authInternal(req))
      return res.status(401).json({ ok:false, error:'No autorizado' });

    var tipoM = req.query.tipo || '';
    var CASAS_MERCADO = ['condor','jaguar','delfin'];
    var ESTADOS_MERCADO = ['activa','agotada','cancelada'];

    try {
      // --- Normas por Casa: lista (3 filas ordenadas por casa) ----------
      if (tipoM === 'mercado_config_lista') {
        if (req.method !== 'GET') return res.status(405).end();
        var filasMC = await sql(
          'SELECT casa, impuesto_base_pct, arancel_inter_casa_pct, slots_base, '
          + 'permite_cross_casa, permite_produccion, precio_min, precio_max, '
          + 'duracion_oferta_horas, activo, actualizado_en '
          + 'FROM mercado_config ORDER BY casa ASC'
        );
        filasMC = filasMC.map(normalizarConfigMercado);
        return res.status(200).json({ ok:true, data: filasMC, total: filasMC.length });
      }

      // --- Normas por Casa: editar (valida casa y rangos) ---------------
      if (tipoM === 'mercado_config_editar') {
        if (req.method !== 'POST') return res.status(405).end();
        var casaM = String(body.casa == null ? '' : body.casa).trim().toLowerCase();
        if (CASAS_MERCADO.indexOf(casaM) < 0)
          return res.status(400).json({ ok:false, error:'CASA_INVALIDA' });

        // ADR-035: numeric acepta punto o coma; se normaliza a punto.
        var pctM  = parseFloat(String(body.impuesto_base_pct == null ? '' : body.impuesto_base_pct).replace(',', '.'));
        var arrM  = parseFloat(String(body.arancel_inter_casa_pct == null ? '' : body.arancel_inter_casa_pct).replace(',', '.'));
        var slotsM = parseInt(body.slots_base, 10);
        var pminM = parseFloat(String(body.precio_min == null ? '' : body.precio_min).replace(',', '.'));
        var pmaxM = parseFloat(String(body.precio_max == null ? '' : body.precio_max).replace(',', '.'));
        var durM  = parseInt(body.duracion_oferta_horas, 10);

        // Rangos del contrato: pct 0..0.15; slots 0..20; duracion 1..720;
        // precio_min > 0 y precio_max >= precio_min.
        if (!isFinite(pctM) || pctM < 0 || pctM > 0.15)
          return res.status(400).json({ ok:false, error:'IMPUESTO_FUERA_DE_RANGO' });
        if (!isFinite(arrM) || arrM < 0 || arrM > 0.15)
          return res.status(400).json({ ok:false, error:'ARANCEL_FUERA_DE_RANGO' });
        if (!isFinite(slotsM) || slotsM < 0 || slotsM > 20)
          return res.status(400).json({ ok:false, error:'SLOTS_FUERA_DE_RANGO' });
        if (!isFinite(durM) || durM < 1 || durM > 720)
          return res.status(400).json({ ok:false, error:'DURACION_FUERA_DE_RANGO' });
        if (!isFinite(pminM) || pminM <= 0)
          return res.status(400).json({ ok:false, error:'PRECIO_MIN_INVALIDO' });
        if (!isFinite(pmaxM) || pmaxM < pminM)
          return res.status(400).json({ ok:false, error:'PRECIO_MAX_INVALIDO' });

        var updMC = await sql(
          'UPDATE mercado_config SET impuesto_base_pct=$1, '
          + 'arancel_inter_casa_pct=$2, slots_base=$3, permite_cross_casa=$4, '
          + 'permite_produccion=$5, precio_min=$6, precio_max=$7, '
          + 'duracion_oferta_horas=$8, activo=$9, actualizado_en=NOW() '
          + 'WHERE casa=$10 '
          + 'RETURNING casa, impuesto_base_pct, arancel_inter_casa_pct, slots_base, '
          + 'permite_cross_casa, permite_produccion, precio_min, precio_max, '
          + 'duracion_oferta_horas, activo, actualizado_en',
          [red4(pctM), red4(arrM), slotsM, Boolean(body.permite_cross_casa),
           Boolean(body.permite_produccion), red2(pminM), red2(pmaxM), durM,
           Boolean(body.activo), casaM]
        );
        if (!updMC.length)
          return res.status(404).json({ ok:false, error:'CASA_NO_ENCONTRADA' });
        return res.status(200).json({
          ok:true, data: normalizarConfigMercado(updMC[0]),
          mensaje:'Normas del mercado actualizadas',
        });
      }

      // --- Ofertas: lista (JOIN consumibles + vendedor) -----------------
      if (tipoM === 'mercado_ofertas_lista') {
        if (req.method !== 'GET') return res.status(405).end();
        var casaF = String(req.query.casa == null ? '' : req.query.casa).trim().toLowerCase();
        var estadoF = String(req.query.estado == null ? '' : req.query.estado).trim().toLowerCase();
        var condM = []; var paramsM = []; var piM = 1;
        if (casaF) {
          if (CASAS_MERCADO.indexOf(casaF) < 0)
            return res.status(400).json({ ok:false, error:'CASA_INVALIDA' });
          condM.push('o.casa=$' + piM++); paramsM.push(casaF);
        }
        if (estadoF) {
          if (ESTADOS_MERCADO.indexOf(estadoF) < 0)
            return res.status(400).json({ ok:false, error:'ESTADO_INVALIDO' });
          condM.push('o.estado=$' + piM++); paramsM.push(estadoF);
        }
        var whereM = condM.length ? ('WHERE ' + condM.join(' AND ')) : '';
        var filasOF = await sql(
          'SELECT o.id, o.casa, o.cantidad, o.cantidad_restante, '
          + 'o.precio_unitario, o.origen, o.estado, o.creado_en, o.expira_en, '
          + 'c.clave AS consumible_clave, c.nombre AS consumible_nombre, '
          + 'u.nombre AS vendedor_nombre, u.email AS vendedor_email '
          + 'FROM mercado_ofertas o '
          + 'LEFT JOIN consumibles c ON c.id = o.consumible_id '
          + 'LEFT JOIN usuarios u ON u.id = o.vendedor_id '
          + whereM + ' ORDER BY o.creado_en DESC LIMIT 200',
          paramsM
        );
        filasOF = filasOF.map(function (o) {
          o.precio_unitario = red2(numXp(o.precio_unitario));
          return o;
        });
        return res.status(200).json({ ok:true, data: filasOF, total: filasOF.length });
      }

      // --- Ofertas: moderar (cancelacion admin, sin reintegro) ----------
      if (tipoM === 'mercado_ofertas_moderar') {
        if (req.method !== 'POST') return res.status(405).end();
        if (!body.oferta_id)
          return res.status(400).json({ ok:false, error:'oferta_id requerido' });
        // Validar formato uuid ANTES del SQL: un id malformado produce 22P02
        // (que caeria al catch como 500); aqui se responde 400 explicito.
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(body.oferta_id)))
          return res.status(400).json({ ok:false, error:'oferta_id invalido' });
        var motivoM = String(body.motivo == null ? '' : body.motivo).trim();

        // Moderacion administrativa: SOLO estado='cancelada' (Cero Borrado
        // Logico). A DIFERENCIA de la cancelacion por el dueno, esta via NO
        // reintegra inventario al vendedor: devolver cantidad_restante seria
        // neutralizar la sancion. No existe tabla de ledger de moderacion en
        // la migracion 034, asi que la constancia va al log del servidor.
        var modM = await sql(
          'UPDATE mercado_ofertas SET estado=\'cancelada\' '
          + 'WHERE id=$1 AND estado<>\'cancelada\' '
          + 'RETURNING id, casa, consumible_id, vendedor_id',
          [body.oferta_id]
        );
        if (!modM.length) {
          // Distinguir "no existe" de "ya cancelada" (idempotencia).
          var chkM = await sql(
            'SELECT id, estado FROM mercado_ofertas WHERE id=$1 LIMIT 1',
            [body.oferta_id]
          );
          if (!chkM.length)
            return res.status(404).json({ ok:false, error:'OFERTA_NO_ENCONTRADA' });
          return res.status(200).json({ ok:true, oferta_id: body.oferta_id, sin_cambios:true });
        }
        console.warn('[admin] mercado_ofertas_moderar: oferta ' + body.oferta_id
          + ' cancelada por admin; motivo=' + (motivoM || '(sin motivo)'));
        return res.status(200).json({ ok:true, oferta_id: body.oferta_id });
      }

      return res.status(400).json({ ok:false, error:'tipo invalido para recurso mercado' });
    } catch (eM) {
      if (esquemaAusente(eM))
        return res.status(503).json({
          ok:false, error:'SCHEMA_NOT_MIGRATED',
          detalle:'Aplica db/migrations/034_mercado_emprendedores.sql en Neon antes de usar el mercado.',
        });
      return res.status(500).json({ ok:false, error:'Error interno' });
    }
  }

  // == ACTIVOS OCULTOS (Wayfarer, moderacion admin - Entrega 016) ==========
  // Moderacion manual sobre las propuestas de la comunidad (migracion 016).
  // El quorum de votos (+/-3) ya resuelve el caso normal en
  // api/interacciones.js v13; esta rama es la via directa del admin.
  // Cero borrado fisico: se cambia estado/resuelto_en, nunca DELETE.
  if (recurso === 'activos_ocultos') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
    if (req.method !== 'POST') return res.status(405).end();
    var tipoAO = body.tipo || req.query.tipo || '';

    // Moderar una propuesta: 'aprobar' (+50 XP al proponente + reparto
    // piramidal) o 'rechazar' (sin XP, decision aprobada). Al aprobar una
    // propuesta YA aprobada se responde sin_cambios:true sin pagar XP de
    // nuevo (anti-farm de re-aprobacion).
    if (tipoAO === 'activo_oculto_moderar') {
      try {
        var aoAccion = body.accion;
        var aoId = body.activo_id;
        if (!aoId) return res.status(400).json({ ok:false, error:'activo_id requerido' });
        if (aoAccion !== 'aprobar' && aoAccion !== 'rechazar')
          return res.status(400).json({ ok:false, error:'ACCION_INVALIDA' });

        var aoRow = await sql(
          'SELECT propuesto_por, estado FROM activos_ocultos '
          + 'WHERE id=$1 AND activo=true',
          [aoId]
        );
        if (!aoRow.length)
          return res.status(404).json({ ok:false, error:'ACTIVO_NO_ENCONTRADO' });
        var aoPropuesta = aoRow[0].propuesto_por;
        var aoEstado = aoRow[0].estado;

        if (aoAccion === 'aprobar') {
          if (aoEstado === 'aprobado')
            return res.status(200).json({ ok:true, data:{ sin_cambios:true, estado:'aprobado', xp_proponente:0 } });
          await sql(
            'UPDATE activos_ocultos SET estado=\'aprobado\', resuelto_en=NOW() '
            + 'WHERE id=$1 AND activo=true',
            [aoId]
          );
          // +50 XP al autor de la propuesta (no se otorga al proponer,
          // solo al aprobar) y reparto piramidal silencioso. si el
          // proponente ya no existe (FK optional), el UPDATE no afecta
          // filas y el reparto degrada a false: inofensivo.
          await sql(
            'UPDATE usuarios SET xp_total=xp_total+50, ultimo_acceso=NOW() WHERE id=$1',
            [aoPropuesta]
          ).catch(function(e){ console.warn('gaming016 xp_propuesta no acreditado', e && e.code); });
          await repartirXpReferidos(sql, aoPropuesta, 50);
          return res.status(200).json({ ok:true, data:{ estado:'aprobado', xp_proponente:50 } });
        }

        // accion = rechazar (sin XP, decision aprobada)
        await sql(
          'UPDATE activos_ocultos SET estado=\'rechazado\', resuelto_en=NOW() '
          + 'WHERE id=$1 AND activo=true',
          [aoId]
        );
        return res.status(200).json({ ok:true, data:{ estado:'rechazado', xp_proponente:0 } });
      } catch (e) {
        // Errores tipificados (mismo patron que api/interacciones.js):
        // tabla/columna ausente = migracion pendiente; violacion de PK =
        // conflicto; cualquier otra cosa = 500 explicito (no silenciado).
        if (e && (e.code === '42P01' || e.code === '42703'))
          return res.status(503).json({ ok:false, error:'SCHEMA_NOT_MIGRATED' });
        if (e && e.code === '23505')
          return res.status(409).json({ ok:false, error:'CONFLICTO' });
        return res.status(500).json({ ok:false, error:'Error interno' });
      }
    }

    return res.status(400).json({ ok:false, error:'tipo invalido para recurso activos_ocultos' });
  }

  // == SALUD DE LA RED (gamificacion v6 / ADR-053 Decision 13.3) ==========
  // Rama NUEVA GET ?recurso=salud_red. El router real enruta por ?recurso=
  // (no se agrega un despachador global ?tipo=, Enmienda 1 Q1) y el gate
  // Bearer reusa auth(), mismo patron que las demas ramas. Agrega el
  // xp_ledger por dia/accion para el panel "Salud de la Red".
  // Degradacion obligatoria (patron BUG-021 / ADR-053 R-1): si la migracion
  // 031 no corrio y xp_ledger no existe (42P01), responde 200 con
  // degradado:true y console.warn, nunca 500 ni catch vacio.
  // Sin SELECT *: cada consulta lista sus columnas explicitamente.
  if (recurso === 'salud_red') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
    if (req.method !== 'GET') return res.status(405).end();

    // Ventana parametrizable en dias (default 30), acotada 1..365 para no
    // permitir intervalos arbitrarios.
    var diasSR = parseInt(req.query.dias, 10);
    if (!isFinite(diasSR) || diasSR < 1) diasSR = 30;
    if (diasSR > 365) diasSR = 365;

    // Economia XP -- XP en juego (circulante): SUM(usuarios.xp_total) de las
    // cuentas activas. Depende SOLO de usuarios (siempre existe), por lo que
    // se calcula antes del ledger para que viaje incluso en la degradacion
    // 42P01 de xp_ledger.
    var xpEnJuego = 0;
    var juegoSR = await sql(
      'SELECT COALESCE(SUM(xp_total), 0) AS xp FROM usuarios WHERE activo = true'
    );
    if (juegoSR.length) xpEnJuego = red2(numXp(juegoSR[0].xp));

    var ledgerSR;
    try {
      ledgerSR = await sql(
        'SELECT date_trunc(\'day\', creado_en) AS dia, '
        + 'COALESCE(SUM(xp_final), 0) AS xp, COUNT(*)::int AS eventos '
        + 'FROM xp_ledger '
        + 'WHERE creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
        + 'AND es_exento = false GROUP BY 1 ORDER BY 1 DESC',
        [diasSR]
      );
    } catch (eSR) {
      if (eSR && eSR.code === '42P01') {
        console.warn('[admin] salud_red degradado 42P01: xp_ledger no disponible (' + eSR.message + ')');
        return res.status(200).json({
          ok: true, degradado: true, motivo: 'xp_ledger no disponible',
          data: { xp_producido: null, xp_quemado: null, xp_en_juego: xpEnJuego },
        });
      }
      throw eSR;
    }

    // Top acciones por XP entregado.
    var topAcciones = await sql(
      'SELECT accion, COALESCE(SUM(xp_final), 0) AS xp, COUNT(*)::int AS n '
      + 'FROM xp_ledger WHERE es_exento = false '
      + 'GROUP BY 1 ORDER BY 2 DESC LIMIT 20'
    );

    // Usuarios activos (distintos) por dia y en la ventana.
    var activosDia = await sql(
      'SELECT date_trunc(\'day\', creado_en) AS dia, COUNT(DISTINCT usuario_id)::int AS usuarios '
      + 'FROM xp_ledger '
      + 'WHERE creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
      + 'AND es_exento = false GROUP BY 1 ORDER BY 1 DESC',
      [diasSR]
    );
    var activosVentana = await sql(
      'SELECT COUNT(DISTINCT usuario_id)::int AS n FROM xp_ledger '
      + 'WHERE creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
      + 'AND es_exento = false',
      [diasSR]
    );

    // Tasa de caps por accion (solo filas donde algun cap recorto).
    var capsAccion = await sql(
      'SELECT accion, cap_aplicado, COUNT(*)::int AS n FROM xp_ledger '
      + 'WHERE cap_aplicado <> \'ninguno\' GROUP BY 1, 2 ORDER BY 3 DESC'
    );

    // nivel_max vs nivel DERIVADO de xp_total (misma tabla de umbrales):
    // detecta usuarios cuya insignia quedo protegida por el reescalado.
    // Degrada 42703/42P01 si nivel_max no existiera (031 sin correr).
    var nivelMaxSR = null;
    try {
      var derSR = await sql(
        'WITH d AS (SELECT nivel_max, ' + NIVEL_DERIVADO_SQL + ' AS nivel_derivado '
        + 'FROM usuarios WHERE activo = true) '
        + 'SELECT COUNT(*)::int AS total, '
        + 'COUNT(*) FILTER (WHERE nivel_max > nivel_derivado)::int AS protegidos, '
        + 'COALESCE(MAX(nivel_max - nivel_derivado), 0)::int AS brecha_max FROM d'
      );
      nivelMaxSR = derSR.length ? derSR[0] : { total: 0, protegidos: 0, brecha_max: 0 };
    } catch (eNM) {
      if (esquemaAusente(eNM)) {
        console.warn('[admin] salud_red: nivel_max no disponible ' + eNM.code + ' (' + eNM.message + ')');
        nivelMaxSR = { degradado: true, motivo: 'nivel_max no disponible' };
      } else {
        throw eNM;
      }
    }

    // Distribucion de usuarios por banda de nivel. Las DOS vistas conviven
    // (ADR-053 Decision 5), porque miden cosas distintas:
    //   - derivado: nivel calculado de xp_total con la tabla nueva. Es el que
    //     MANDA para M_nivel y para el castigo economico del de-nivel: gastar
    //     XP puede bajar el multiplicador aunque la insignia se conserve
    //     (ADR-018).
    //   - visible: GREATEST(nivel_derivado, COALESCE(nivel_max,1)). Es la
    //     INSIGNIA que se exhibe; nivel_max solo protege la insignia y NO
    //     neutraliza el castigo economico.
    var distribucionNivel = { derivado: [], visible: [] };
    try {
      var distDerivado = await sql(
        'SELECT ' + NIVEL_DERIVADO_SQL + ' AS nivel, COUNT(*)::int AS usuarios '
        + 'FROM usuarios WHERE activo = true GROUP BY 1 ORDER BY 1'
      );
      distribucionNivel.derivado = distDerivado.map(function (x) {
        x.usuarios = parseInt(x.usuarios, 10) || 0;
        return x;
      });
    } catch (eDer) {
      if (esquemaAusente(eDer)) {
        console.warn('[admin] salud_red: distribucion derivada degradada ' + eDer.code + ' (' + eDer.message + ')');
      } else {
        throw eDer;
      }
    }
    try {
      var distVisible = await sql(
        'SELECT GREATEST(' + NIVEL_DERIVADO_SQL + ', COALESCE(nivel_max, 1)) AS nivel, '
        + 'COUNT(*)::int AS usuarios '
        + 'FROM usuarios WHERE activo = true GROUP BY 1 ORDER BY 1'
      );
      distribucionNivel.visible = distVisible.map(function (x) {
        x.usuarios = parseInt(x.usuarios, 10) || 0;
        return x;
      });
    } catch (eVis) {
      if (esquemaAusente(eVis)) {
        console.warn('[admin] salud_red: distribucion visible degradada ' + eVis.code + ' (' + eVis.message + ')');
      } else {
        throw eVis;
      }
    }

    // Filas EXENTAS (es_exento = true) de la MISMA ventana: misiones, logros,
    // referidos, admin_xp y las restas de compras registradas como exentas.
    // NO pasan por M_nivel ni por caps: se reportan aparte para medir el
    // volumen de XP que queda fuera del sistema de multiplicadores.
    var exentosAccion = await sql(
      'SELECT accion, COALESCE(SUM(xp_final), 0) AS xp, COUNT(*)::int AS n '
      + 'FROM xp_ledger WHERE es_exento = true '
      + 'AND creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
      + 'GROUP BY 1 ORDER BY 2 DESC LIMIT 20',
      [diasSR]
    );
    var exentosTotal = await sql(
      'SELECT COALESCE(SUM(xp_final), 0) AS xp, COUNT(*)::int AS eventos '
      + 'FROM xp_ledger WHERE es_exento = true '
      + 'AND creado_en >= NOW() - ($1::int * INTERVAL \'1 day\')',
      [diasSR]
    );

    // Economia XP -- XP producido (acunado) y XP quemado (gastado). Ambos
    // leen xp_ledger: si la migracion 031 no corrio (42P01/42703) degradan a
    // null sin romper el endpoint (patron esquemaAusente). xp_producido suma
    // los eventos positivos; xp_quemado usa el valor ABSOLUTO de los negativos.
    var xpProducido = null;
    var xpQuemado = null;
    try {
      var prodSR = await sql(
        'SELECT COALESCE(SUM(xp_final), 0) AS xp FROM xp_ledger WHERE xp_final > 0'
      );
      var quemSR = await sql(
        'SELECT COALESCE(-SUM(xp_final), 0) AS xp FROM xp_ledger WHERE xp_final < 0'
      );
      xpProducido = prodSR.length ? red2(numXp(prodSR[0].xp)) : 0;
      xpQuemado = quemSR.length ? red2(numXp(quemSR[0].xp)) : 0;
    } catch (eEco) {
      if (!esquemaAusente(eEco)) throw eEco;
      console.warn('[admin] salud_red: economia xp degradada ' + eEco.code + ' (' + eEco.message + ')');
    }

    // Normalizacion (numeric llega string; bigint tambien).
    var xpTotalEntregado = 0;
    var porDia = ledgerSR.map(function (d) {
      d.xp = red2(numXp(d.xp));
      d.eventos = parseInt(d.eventos, 10) || 0;
      xpTotalEntregado = red2(xpTotalEntregado + d.xp);
      return d;
    });
    var capsPorAccion = capsAccion.map(function (c) {
      c.n = parseInt(c.n, 10) || 0;
      return c;
    });
    var capTopAccion = {};
    capsPorAccion.forEach(function (c) {
      if (!capTopAccion[c.accion] || c.n > capTopAccion[c.accion].n) capTopAccion[c.accion] = c;
    });
    var porAccion = topAcciones.map(function (a) {
      var capTop = capTopAccion[a.accion];
      return {
        accion: a.accion,
        xp_entregado: red2(numXp(a.xp)),
        eventos: parseInt(a.n, 10) || 0,
        cap_aplicado_top: capTop ? capTop.cap_aplicado : null,
      };
    });
    var capsProgresion = 0;
    var capsGlobal = 0;
    capsPorAccion.forEach(function (c) {
      if (c.cap_aplicado === 'progresion') capsProgresion += c.n;
      if (c.cap_aplicado === 'global') capsGlobal += c.n;
    });
    var exentosPorAccion = exentosAccion.map(function (a) {
      return {
        accion: a.accion,
        xp_entregado: red2(numXp(a.xp)),
        eventos: parseInt(a.n, 10) || 0,
      };
    });
    var exentosVentana = exentosTotal.length
      ? { xp_entregado: red2(numXp(exentosTotal[0].xp)), eventos: parseInt(exentosTotal[0].eventos, 10) || 0 }
      : { xp_entregado: 0, eventos: 0 };
    var alertas = [];
    if (nivelMaxSR && nivelMaxSR.degradado) {
      alertas.push({ tipo: 'nivel_max_degradado', detalle: String(nivelMaxSR.motivo) });
    } else if (nivelMaxSR && nivelMaxSR.protegidos > 0) {
      alertas.push({
        tipo: 'nivel_max_protegido',
        detalle: nivelMaxSR.protegidos + ' usuario(s) conservan una insignia mayor al nivel derivado de su xp_total (brecha max ' + nivelMaxSR.brecha_max + ')',
      });
    }

    return res.status(200).json({
      ok: true,
      data: {
        ventana_dias: diasSR,
        xp_total_entregado: xpTotalEntregado,
        xp_producido: xpProducido,
        xp_quemado: xpQuemado,
        xp_en_juego: xpEnJuego,
        por_dia: porDia,
        por_accion: porAccion,
        usuarios_activos: activosVentana.length ? (parseInt(activosVentana[0].n, 10) || 0) : 0,
        usuarios_activos_por_dia: activosDia.map(function (d) {
          d.usuarios = parseInt(d.usuarios, 10) || 0;
          return d;
        }),
        caps_por_accion: capsPorAccion,
        caps: { cap_progresion_veces: capsProgresion, cap_global_veces: capsGlobal },
        distribucion_nivel: distribucionNivel,
        exentos: {
          xp_total_entregado: exentosVentana.xp_entregado,
          eventos: exentosVentana.eventos,
          por_accion: exentosPorAccion,
        },
        nivel_max_vs_derivado: nivelMaxSR,
        alertas: alertas,
      },
    });
  }

  // == Sin recurso reconocido =============================================
  return res.status(400).json({
    ok: false,
    error: 'recurso inv\u00e1lido. Usa ?recurso=solicitudes|resenas|destacado|notificaciones|consumibles|activos_ocultos|salud_red|mercado',
  });
};
