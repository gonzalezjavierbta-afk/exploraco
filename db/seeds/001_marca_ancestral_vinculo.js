// 001_marca_ancestral_vinculo.js
// Crea la marca real ANCESTRAL para su dueno, la fija como marca activa y
// vincula los 3 consumibles ancestral_* sembrados por la 058 con marca_id NULL.
//
// QUE HACE (4 pasos, ADR-107 D16)
//   1. Resuelve el dueno por email EXACTO (lower(email) = lower($1)). Si la
//      consulta devuelve 0 filas o mas de 1, ABORTA: no se elige un usuario
//      por aproximacion (el UUID del dueno no se adivina).
//   2. Crea la marca ANCESTRAL si (usuario_id, nombre='ANCESTRAL') no existe.
//      Idempotente por WHERE NOT EXISTS + re-lectura: desde la 058 marcas ya
//      NO tiene UNIQUE (usuario_id), asi que no hay ON CONFLICT posible.
//   3. Fija usuarios.marca_activa_id a esa marca (FK compuesta de la 058: el
//      puntero solo puede apuntar a una marca del mismo usuario).
//   4. Vincula consumibles.marca_id en las 3 claves ancestral_* que sigan en
//      NULL. Idempotente por el IS NULL. Es prerrequisito DURO de
//      consumible_entregar (filtro estricto c.marca_id = marca).
//
// premios_config: se escribe EXACTAMENTE el esquema cerrado de ADR-107 D7
//   {"alcance":"global","orden_premios":["ancestral_pocima_50ml"],"tope_unidades":null}
//   Son las 3 unicas claves que lee marcaPremioConfig() / escribe la rama
//   marca_premios_config (whitelist de api/interacciones.js). Cero claves
//   inventadas: codigo y dato hablan el mismo idioma. Los tunables
//   (xp_por_unidad, pesos, factor_retorno, tasa_cop_por_xp) NO se duplican
//   aqui: viven en gamificacion_config y el codigo los inyecta.
//
// CARACTER
//   - Solo SELECT / INSERT / UPDATE. Cero DELETE, cero DROP, cero ALTER: el
//     DDL ya lo hizo la 058.
//   - --dry-run es el modo por defecto (solo lee y reporta el plan).
//     Escribir exige --apply explicito.
//   - Re-ejecutable: si la marca existe la reutiliza, el UPDATE de
//     consumibles no toca filas ya vinculadas y el UPDATE de usuarios no
//     reescribe si el puntero ya apunta a ANCESTRAL.
//   - ASCII-safe (ADR-002): cero bytes > 127, cero backticks, CommonJS.
//   - Sin PII en salida: del email solo se reporta cuantas filas resolvio.
//
// USO
//   node db/seeds/001_marca_ancestral_vinculo.js --email=dueno@dominio.tld
//   node db/seeds/001_marca_ancestral_vinculo.js --email=dueno@dominio.tld --apply
//   Exit code 0 = los 5 checks de verificacion pasan. 1 = algo fallo o aborto.
'use strict';

var path = require('path');
var RAIZ = path.join(__dirname, '..', '..');

var APPLY = process.argv.indexOf('--apply') !== -1;

var NOMBRE_MARCA = 'ANCESTRAL';
var NIVEL_REQUERIDO = 5;
var DESCRIPCION = 'Marca de licores ancestrales de autor: premio semanal del Top 3 de ExploraCO.';

// Esquema CERRADO de ADR-107 D7. No anadir claves.
var PREMIOS_CONFIG = {
  alcance: 'global',
  orden_premios: ['ancestral_pocima_50ml'],
  tope_unidades: null
};

var CLAVES = [
  'ancestral_pocima_50ml',
  'ancestral_media_375ml',
  'ancestral_botella_750ml'
];

// Precios sembrados por la 058 (seccion 7). Se verifican, no se escriben.
var PRECIOS_ESPERADOS = {
  ancestral_pocima_50ml: 14000,
  ancestral_media_375ml: 41000,
  ancestral_botella_750ml: 76000
};

function log(s) {
  process.stdout.write(String(s) + '\n');
}

function errMsg(e) {
  return (e && e.message) ? e.message : String(e);
}

function leerArg(nombre) {
  var prefijo = '--' + nombre + '=';
  var i;
  for (i = 0; i < process.argv.length; i++) {
    var a = process.argv[i];
    if (a.indexOf(prefijo) === 0) return a.slice(prefijo.length);
  }
  return null;
}

function fallo(msg) {
  log('');
  log('ABORTA: ' + msg);
  return Promise.reject(new Error(msg));
}

function conectar() {
  require(path.join(RAIZ, 'scripts', 'load_env_local'))();
  var url = String(process.env.DATABASE_URL || '').trim();
  if (!url) {
    return fallo('DATABASE_URL ausente o vacia. No se imprime el valor.');
  }
  var neon;
  try {
    neon = require(path.join(RAIZ, 'node_modules', '@neondatabase', 'serverless')).neon;
  } catch (e) {
    return fallo('falta @neondatabase/serverless: ' + errMsg(e));
  }
  return Promise.resolve(neon(url));
}

// ---------------------------------------------------------------------------
// 1. DUENO
// ---------------------------------------------------------------------------
function resolverDueno(sql, email) {
  return sql(
    'SELECT id::text AS id FROM usuarios WHERE lower(email) = lower($1)',
    [email]
  ).then(function (filas) {
    log('[1] Resolucion del dueno: ' + filas.length + ' usuario(s) con ese email exacto.');
    if (filas.length !== 1) {
      return fallo('dueno no resuelto de forma unica (' + filas.length +
        ' filas). Se exige exactamente 1 fila: no se elige por aproximacion.');
    }
    return filas[0].id;
  });
}

// ---------------------------------------------------------------------------
// 2. MARCA ANCESTRAL (idempotente)
// ---------------------------------------------------------------------------
function leerMarca(sql, usuarioId) {
  return sql(
    'SELECT id::text AS id, nombre, estado_promo, premios_config ' +
    'FROM marcas ' +
    'WHERE usuario_id = $1::uuid AND upper(nombre) = $2 ' +
    'ORDER BY creado_en ASC',
    [usuarioId, NOMBRE_MARCA]
  );
}

function crearMarca(sql, usuarioId) {
  // WHERE NOT EXISTS en la MISMA sentencia: dos ejecuciones simultaneas no
  // pueden crear dos ANCESTRAL (no hay UNIQUE que lo impida desde la 058).
  return sql(
    'INSERT INTO marcas ' +
    '(usuario_id, nombre, descripcion, activa, verificada, nivel_requerido, ' +
    ' estado_promo, premios_config) ' +
    'SELECT $1::uuid, $2, $3, TRUE, TRUE, $4, FALSE, $5::jsonb ' +
    'WHERE NOT EXISTS (' +
    '  SELECT 1 FROM marcas WHERE usuario_id = $1::uuid AND upper(nombre) = $2' +
    ') ' +
    'RETURNING id::text AS id',
    [usuarioId, NOMBRE_MARCA, DESCRIPCION, NIVEL_REQUERIDO, JSON.stringify(PREMIOS_CONFIG)]
  );
}

function asegurarMarca(sql, usuarioId) {
  return leerMarca(sql, usuarioId).then(function (filas) {
    if (filas.length > 1) {
      return fallo('hay ' + filas.length + ' marcas ANCESTRAL para ese usuario. ' +
        'No se elige una: hay que consolidarlas a mano (operador humano).');
    }
    if (filas.length === 1) {
      log('[2] Marca ANCESTRAL ya existente: REUTILIZADA (' + filas[0].id + '). No se inserta otra.');
      return filas[0].id;
    }
    if (!APPLY) {
      log('[2] Marca ANCESTRAL no existe: se CREARIA en modo --apply.');
      return null;
    }
    return crearMarca(sql, usuarioId).then(function (ins) {
      if (ins.length === 1) {
        log('[2] Marca ANCESTRAL creada: ' + ins[0].id);
        return ins[0].id;
      }
      // Carrera: otro proceso la creo entre el SELECT y el INSERT.
      return leerMarca(sql, usuarioId).then(function (otra) {
        if (otra.length !== 1) {
          return fallo('tras el INSERT hay ' + otra.length + ' marcas ANCESTRAL. Abortado.');
        }
        log('[2] Marca ANCESTRAL ya existente (carrera): REUTILIZADA (' + otra[0].id + ').');
        return otra[0].id;
      });
    });
  });
}

// ---------------------------------------------------------------------------
// 3. MARCA ACTIVA DEL DUENO
// ---------------------------------------------------------------------------
function fijarMarcaActiva(sql, usuarioId, marcaId) {
  if (!APPLY) {
    log('[3] usuarios.marca_activa_id -> ANCESTRAL: se ACTUALIZARIA en modo --apply.');
    return Promise.resolve(0);
  }
  return sql(
    'UPDATE usuarios SET marca_activa_id = $1::uuid ' +
    'WHERE id = $2::uuid AND marca_activa_id IS DISTINCT FROM $1::uuid ' +
    'RETURNING id::text AS id',
    [marcaId, usuarioId]
  ).then(function (filas) {
    log('[3] usuarios.marca_activa_id -> ANCESTRAL: ' + filas.length +
      ' fila(s) actualizada(s) (0 = ya apuntaba ahi; idempotente).');
    return filas.length;
  });
}

// ---------------------------------------------------------------------------
// 4. VINCULO DE LOS 3 CONSUMIBLES
// ---------------------------------------------------------------------------
function vincularConsumibles(sql, marcaId) {
  if (!APPLY) {
    log('[4] consumibles.marca_id -> ANCESTRAL: se VINCULARIAN los que sigan en NULL.');
    return Promise.resolve(0);
  }
  return sql(
    'UPDATE consumibles SET marca_id = $1::uuid ' +
    'WHERE clave IN ($2, $3, $4) AND marca_id IS NULL ' +
    'RETURNING clave',
    [marcaId, CLAVES[0], CLAVES[1], CLAVES[2]]
  ).then(function (filas) {
    log('[4] consumibles vinculados en esta pasada: ' + filas.length +
      ' (idempotente: los ya vinculados no se tocan).');
    return filas.length;
  });
}

// ---------------------------------------------------------------------------
// 5. VERIFICACION (5 checks, solo SELECT)
// ---------------------------------------------------------------------------
function verificar(sql, usuarioId) {
  var res = { ok: true };

  function check(nombre, ok, detalle) {
    log('  ' + (ok ? 'PASS' : 'FAIL') + ' ' + nombre + ' -> ' + detalle);
    if (!ok) res.ok = false;
  }

  log('');
  log('=== VERIFICACION (SELECT) ===');

  return sql(
    'SELECT count(*)::int AS n, min(id::text) AS id FROM marcas ' +
    'WHERE usuario_id = $1::uuid AND upper(nombre) = $2',
    [usuarioId, NOMBRE_MARCA]
  ).then(function (f) {
    var n = f[0].n;
    res.marcaId = f[0].id;
    check('(i) filas ANCESTRAL del dueno', n === 1, 'esperado 1, real ' + n);
    if (!res.marcaId) {
      return fallo('no hay marca ANCESTRAL donde verificar: los checks ii-v no son evaluables.');
    }

    return sql(
      'SELECT count(*)::int AS n, ' +
      '       bool_and(estado_promo = false) AS promo_off, ' +
      '       bool_and((SELECT count(*) FROM jsonb_object_keys(premios_config)) = 3) AS tres_claves, ' +
      '       bool_and(premios_config->>\'alcance\' = \'global\') AS alcance_global, ' +
      '       bool_and(premios_config->\'orden_premios\' = \'["ancestral_pocima_50ml"]\'::jsonb) AS orden_ok, ' +
      '       bool_and(premios_config->\'tope_unidades\' = \'null\'::jsonb) AS tope_null ' +
      'FROM marcas WHERE usuario_id = $1::uuid AND upper(nombre) = $2',
      [usuarioId, NOMBRE_MARCA]
    ).then(function (g) {
      var r = g[0];
      check('(ii.a) estado_promo = false', r.promo_off === true, 'real ' + r.promo_off);
      check('(ii.b) premios_config con 3 claves exactas', r.tres_claves === true,
        'alcance/orden_premios/tope_unidades, real ' + r.tres_claves);
      check('(ii.c) alcance = global', r.alcance_global === true, 'real ' + r.alcance_global);
      check('(ii.d) orden_premios = [ancestral_pocima_50ml]', r.orden_ok === true, 'real ' + r.orden_ok);
      check('(ii.e) tope_unidades = null', r.tope_null === true, 'real ' + r.tope_null);

      return sql(
        'SELECT count(*)::int AS n FROM usuarios u ' +
        'JOIN marcas m ON m.id = u.marca_activa_id AND m.usuario_id = u.id ' +
        'WHERE u.id = $1::uuid AND upper(m.nombre) = $2',
        [usuarioId, NOMBRE_MARCA]
      );
    }).then(function (h) {
      check('(iii) usuarios.marca_activa_id -> ANCESTRAL', h[0].n === 1, 'esperado 1, real ' + h[0].n);

      return sql(
        'SELECT count(*) FILTER (WHERE marca_id = $1::uuid)::int AS con_marca, ' +
        '       count(*) FILTER (WHERE marca_id IS NULL)::int AS sin_marca ' +
        'FROM consumibles WHERE clave IN ($2, $3, $4)',
        [res.marcaId, CLAVES[0], CLAVES[1], CLAVES[2]]
      );
    }).then(function (k) {
      var con = k[0].con_marca;
      var sin = k[0].sin_marca;
      check('(iv) 3 consumibles con marca_id = ANCESTRAL', con === 3, 'esperado 3, real ' + con);
      check('(iv.b) 0 consumibles ancestral_* con marca_id NULL', sin === 0, 'esperado 0, real ' + sin);

      return sql(
        'SELECT clave, precio_cop::numeric::text AS precio ' +
        'FROM consumibles WHERE clave IN ($1, $2, $3) ORDER BY clave',
        [CLAVES[0], CLAVES[1], CLAVES[2]]
      );
    }).then(function (p) {
      var malos = [];
      p.forEach(function (fila) {
        var esperado = PRECIOS_ESPERADOS[fila.clave];
        var real = Number(fila.precio);
        if (!(real === esperado)) malos.push(fila.clave + '=' + fila.precio + ' (esperado ' + esperado + ')');
      });
      check('(v) precio_cop correcto en los 3', p.length === 3 && malos.length === 0,
        p.length + ' fila(s); desviaciones: ' + (malos.length ? malos.join(', ') : '0'));
      return res;
    });
  });
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
function main() {
  var email = leerArg('email');
  log('=== MARCA ANCESTRAL: alta + vinculo de consumibles ===');
  log('Modo: ' + (APPLY ? 'APPLY (escribe)' : 'DRY-RUN (solo lee; usa --apply para escribir)'));
  if (!email) {
    return fallo('falta --email=<email del dueno>. No hay email por defecto en el codigo.');
  }

  var ctx = {};
  return conectar()
    .then(function (sql) {
      return resolverDueno(sql, email).then(function (usuarioId) {
        ctx.sql = sql;
        ctx.usuarioId = usuarioId;
        log('    UUID del dueno resuelto: ' + usuarioId);
        return asegurarMarca(sql, usuarioId);
      }).then(function (marcaId) {
        ctx.marcaId = marcaId;
        if (!marcaId) {
          log('[3] y [4] no se ejecutan en dry-run sobre una marca inexistente.');
          return { ok: false };
        }
        return fijarMarcaActiva(sql, ctx.usuarioId, marcaId).then(function () {
          return vincularConsumibles(sql, marcaId);
        }).then(function () {
          return verificar(sql, ctx.usuarioId);
        });
      });
    })
    .then(function (r) {
      log('');
      log('RESULTADO: ' + (r && r.ok ? 'OK. Los 5 checks de verificacion pasan.'
        : 'INCOMPLETO. Ver checks en FAIL (o marca inexistente en dry-run).'));
      if (r && r.ok) return 0;
      return APPLY ? 2 : 0;
    })
    .catch(function (e) {
      log('ERROR: ' + errMsg(e));
      return 1;
    });
}

// No se fuerza process.exit(): con el pool HTTP de Neon vivo, un exit forzado
// en Windows muere con un assertion de libuv y enmascara el codigo real
// (medido en db/cleanups/005: es un detalle documentado ahi).
main().then(function (code) {
  process.exitCode = code;
});
