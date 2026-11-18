// scripts/seed-eventos-2026-11-18.js
// GENERADO por upload-eventos.js (--seed) desde eventos/eventos.json.
// Upsert idempotente (ON CONFLICT slug) para quien tenga DATABASE_URL.
// Uso: DATABASE_URL=postgres://... node scripts/seed-eventos-2026-11-18.js [--dry]
// ASCII-safe: 0 bytes >127.

var neon = null;
function getNeon() { if (!neon) neon = require('@neondatabase/serverless').neon; return neon; }

var EVENTOS = [{"slug":"salsa-y-descontrol-vol-2-2026","nombre":"Salsa y Descontrol Vol. 2","categoria_slug":"evento","lead":"Una noche de pura salsa y viche sin parar en la casita, celebrando los 7 a\u00f1os del 21N.","descripcion":"Llega la segunda edici\u00f3n de Salsa y Descontrol a las instalaciones de Las Moscas, uniendo fuerzas con Ancestral Bebida para ofrecer una velada imperdible de salsa brava, vinilos y viche. Disfruta de una n\u00f3mina de lujo en las consolas y el tradicional ritual de choris y choris veg a cargo de @monstruacion, acompa\u00f1ado de soberan\u00eda et\u00edlica y pola toda la noche.\n\nA partir de las 9:00 p.m. arranca el desorden en un ambiente de cofrad\u00eda y cultura urbana en el coraz\u00f3n de Bogot\u00e1.","highlight":"","ciudad":"Bogot\u00e1","region":"Bogot\u00e1 D.C.","barrio":"Chapinero / Marly","lat":4.6392,"lng":-74.0655,"whatsapp":"","telefono":"","email":"","web":"","instagram":"@tallerdelasmoscas","precio_desde":"$12.000","horario":"9:00 p.m. - 3:00 a.m.","emoji":"\ud83d\udc83","hero_bg":"linear-gradient(135deg,#7a0d1e 0%,#0B0A09 100%)","foto_hero":"https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/Salsa_dancing.jpg/960px-Salsa_dancing.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail","tipo":"","capacidad":"","como_llegar":"","status":"published","destacado":false,"tags":{"fecha_inicio":"2026-11-20","fecha_fin":"2026-11-20","edicion":"Vol. 2","sede":"Cra 19A # 61E-11, Bogot\u00e1","organiza":"Las Moscas & Ancestral Bebida","lema":"A 7 a\u00f1os del 21N la revoluci\u00f3n sigue siendo una fiesta","tipo_evento":"musica","lineup":[{"nombre":"\u00d3rbita","rol":"DJ Set","genero":"Salsa / Vinilos"},{"nombre":"JurasiX","rol":"DJ Set","genero":"Salsa"},{"nombre":"Jos\u00e9 Campana","rol":"DJ Set","genero":"Salsa"},{"nombre":"Bacat\u00e1","rol":"DJ Set","genero":"Salsa"},{"nombre":"Ancestral","rol":"Invitado especial","genero":"Viche / Bebidas ancestrales"}],"agenda":[{"dia":"2026-11-20","hora":"9:00 p.m.","actividad":"Apertura de puertas y inicio de DJ sets"},{"dia":"2026-11-20","hora":"3:00 a.m.","actividad":"Cierre del evento"}],"categorias_entrada":[{"tipo":"General","precio":"$12.000","disponibilidad":"Disponible"}],"que_llevar":["Buena actitud","Efectivo para el aporte y consumo"],"prohibido":["Armas","Comportamientos violentos"]},"faqs":[{"pregunta":"\u00bfCu\u00e1l es el valor del aporte de entrada?","respuesta":"El aporte es de $12.000 por persona."},{"pregunta":"\u00bfQu\u00e9 horario tiene el evento?","respuesta":"El evento inicia a las 9:00 p.m. y va hasta las 3:00 a.m."},{"pregunta":"\u00bfD\u00f3nde se realiza?","respuesta":"En la Cra 19A # 61E-11, Bogot\u00e1."}],"fotos":[]},{"slug":"vinilos-inversos-c8yu","nombre":"Vinilos N Versos Vol. 2","categoria_slug":"evento","lead":"Una sesi\u00f3n especial de alta fidelidad y selecci\u00f3n en vinilo con los mejores exponentes de la escena local.","descripcion":"Llega la segunda entrega de Vinilos N Versos, una experiencia sonora imperdible centrada en el formato f\u00edsico y el calor de los surcos de vinilo. Reunimos a una selecta n\u00f3mina de selectores y artistas independientes para una noche de inmersi\u00f3n musical, cultura de coleccionista y buena compa\u00f1\u00eda en el espacio de R10.\n\nDisfruta de una curadur\u00eda musical excepcional que cruza g\u00e9neros y \u00e9pocas en un formato ac\u00fastico y visualmente aut\u00e9ntico.","highlight":"","ciudad":"Bogot\u00e1","region":"Bogot\u00e1 D.C.","barrio":"La Candelaria / Centro","lat":4.5981,"lng":-74.0758,"whatsapp":"","telefono":"","email":"","web":"https://hostalterraza.vercel.app/evento.html?slug=vinilos-inversos-c8yu","instagram":"@r10_bogota","precio_desde":"$15.000","horario":"8:00 p.m. - 3:00 a.m.","emoji":"\ud83d\udcbf","hero_bg":"linear-gradient(135deg,#c98b2e 0%,#0B0A09 100%)","foto_hero":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/DJ_Setup_Vinyl_Records.jpg/960px-DJ_Setup_Vinyl_Records.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail","tipo":"","capacidad":"","como_llegar":"","status":"published","destacado":false,"tags":{"fecha_inicio":"2026-11-20","fecha_fin":"2026-11-20","edicion":"Vol. 2","sede":"Calle 12B #5-07, Bogot\u00e1 (R10)","organiza":"Charlie Jamm & R10","lema":"El sonido puro del vinilo en el coraz\u00f3n de la ciudad","tipo_evento":"musica","lineup":[{"nombre":"Charlie Jamm","rol":"Selector / DJ","genero":"Vinilo"},{"nombre":"Rente","rol":"Selector / DJ","genero":"Vinilo"},{"nombre":"Urka","rol":"Selector / DJ","genero":"Vinilo"},{"nombre":"K\u00fcmbra","rol":"Selector / DJ","genero":"Vinilo"},{"nombre":"Jah Fellah","rol":"Selector / DJ","genero":"Vinilo"}],"agenda":[{"dia":"2026-11-20","hora":"8:00 p.m.","actividad":"Apertura de puertas y calentamiento en vinilo"},{"dia":"2026-11-20","hora":"3:00 a.m.","actividad":"Cierre de la sesi\u00f3n"}],"categorias_entrada":[{"tipo":"General","precio":"$15.000","disponibilidad":"Disponible"}],"que_llevar":["Pasi\u00f3n por la m\u00fasica","Efectivo para ingresos y barra"],"prohibido":["Armas","Mal comportamiento"]},"faqs":[{"pregunta":"\u00bfCu\u00e1l es el valor de la entrada?","respuesta":"El aporte sugerido para la sesi\u00f3n es de $15.000."},{"pregunta":"\u00bfD\u00f3nde se realiza el evento?","respuesta":"En la sede cultural R10 (Calle 12B #5-07, Bogot\u00e1)."},{"pregunta":"\u00bfQu\u00e9 tipo de m\u00fasica se programa?","respuesta":"Selecci\u00f3n exclusiva en formato de vinilo abarcando diversos g\u00e9neros de la cultura sonora independiente."}],"fotos":[]}];

module.exports = { EVENTOS: EVENTOS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) { console.error('Falta DATABASE_URL.'); process.exit(1); }
  var sql = getNeon()(url);
  var dry = process.argv.indexOf('--dry') !== -1;
  if (dry) { console.log('[dry-run] ' + EVENTOS.length + ' eventos listos para upsert.'); return; }
  var okCount = 0;
  for (var i = 0; i < EVENTOS.length; i++) {
    var ev = EVENTOS[i];
    try {
      var inserted = await sql(
        'INSERT INTO destinos ( '
        + 'slug, nombre, categoria_slug, lead, descripcion, highlight, '
        + 'ciudad, region, barrio, lat, lng, '
        + 'whatsapp, telefono, email, web, instagram, '
        + 'precio_desde, horario, emoji, hero_bg, foto_hero, '
        + 'tipo, capacidad, como_llegar, '
        + 'status, destacado, tags, creado_en, actualizado_en '
        + ') VALUES ( '
        + '$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'
        + '$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,NOW(),NOW() '
        + ') '
        + 'ON CONFLICT (slug) DO UPDATE SET '
        + 'nombre=EXCLUDED.nombre, lead=EXCLUDED.lead, descripcion=EXCLUDED.descripcion, '
        + 'ciudad=EXCLUDED.ciudad, region=EXCLUDED.region, barrio=EXCLUDED.barrio, '
        + 'lat=EXCLUDED.lat, lng=EXCLUDED.lng, web=EXCLUDED.web, instagram=EXCLUDED.instagram, '
        + 'precio_desde=EXCLUDED.precio_desde, horario=EXCLUDED.horario, emoji=EXCLUDED.emoji, '
        + 'hero_bg=EXCLUDED.hero_bg, foto_hero=EXCLUDED.foto_hero, tipo=EXCLUDED.tipo, '
        + 'como_llegar=EXCLUDED.como_llegar, status=EXCLUDED.status, destacado=EXCLUDED.destacado, '
        + 'tags = COALESCE(destinos.tags, \'{}\'::jsonb) || EXCLUDED.tags, '
        + 'actualizado_en = NOW() '
        + 'RETURNING id, slug, status',
        [
          ev.slug, ev.nombre, ev.categoria_slug, ev.lead, ev.descripcion, ev.highlight,
          ev.ciudad, ev.region, ev.barrio, ev.lat, ev.lng,
          ev.whatsapp, ev.telefono, ev.email, ev.web, ev.instagram,
          ev.precio_desde, ev.horario, ev.emoji, ev.hero_bg, ev.foto_hero,
          ev.tipo, ev.capacidad, ev.como_llegar,
          ev.status, ev.destacado, JSON.stringify(ev.tags)
        ]
      );
      var id = inserted[0].id;
      if (ev.faqs && ev.faqs.length) {
        await sql(
          'INSERT INTO destinos_detalles (destino_id, faqs, creado_en) VALUES ($1,$2,NOW()) '
          + 'ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs',
          [id, JSON.stringify(ev.faqs)]
        ).catch(function(){});
      }
      if (ev.fotos && ev.fotos.length) {
        for (var f = 0; f < ev.fotos.length; f++) {
          await sql(
            'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
            + 'VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING',
            [id, ev.fotos[f].url, ev.fotos[f].caption || '', f, false]
          ).catch(function(){});
        }
      }
      okCount++;
      console.log('[OK] ' + ev.slug);
    } catch (err) { console.error('[ERROR] ' + ev.slug + ': ' + err.message); }
  }
  console.log('\n' + okCount + '/' + EVENTOS.length + ' eventos insertados correctamente.');
})().catch(function(err){ console.error('ERROR:', err.message); process.exit(1); });
