// lib/score.js -- MOTOR COMPARTIDO DEL SCORE COMPUESTO (ADR-086)
//
// Por que vive FUERA de api/: los 8 ficheros de api/ son 8/8 funciones
// serverless (presupuesto Vercel Hobby AGOTADO). Un noveno fichero en api/
// seria una novena funcion. Este modulo no es endpoint: es una libreria que
// api/usuarios.js (leaderboard, faccion_ranking, casa_ranking) y
// api/interacciones.js (pandilla_ranking).requirean, y Vercel la incluye en
// el bundle por trazado de dependencias (nft), sin consumir funcion.
//
// UNA aritmetica de score, cuatro rankings. Si este modulo se duplica dentro
// de un api/*.js, los cuatro rankings dejan de ser comparables entre si: es
// exactamente el fallo que ADR-086 prohibe.
//
// Score_ranking(u) = xp_total(u) + gamma * (0.50 * LEAST(saldo, TOPE)
//                                             + Fama_Parche(u))
//   gamma = gamificacion_config.ranking_score_gamma (rampa admin-gated;
//           ausente = 0.0000 = el score degrada a XP puro)
//   TOPE  = gamificacion_config.ranking_saldo_tope  (dato, no constante)
//   saldo = GREATEST(SUM(moneda_ledger.delta), 0) POR USUARIO, SIN filtro de
//           moneda (ADR-086 fijo el tope como GLOBAL por usuario)
//
// LECTURA PURA: no se escribe de vuelta en xp_total ni en ninguna columna,
// luego xp_total sigue siendo la reputacion inmutable (ADR-018).
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks. CommonJS.
'use strict';

var SCORE_GAMMA_CLAVE = 'ranking_score_gamma';
var SCORE_TOPE_CLAVE = 'ranking_saldo_tope';
// El 2000 NO es una constante de negocio: es el valor semilla de la 045 y solo
// se aplica si la fila de configuracion no existe (estado declarado de
// partida). Con la fila presente se lee el dato.
var SCORE_TOPE_SEMILLA = 2000.0000;
var SCORE_BETA_SALDO = 0.50;

// Fama_Parche(u) = 1.0 * (fama_total de la pandilla * rol_factor
//                        / GREATEST(factor_conversion de la Casa, 1.0))
//                + 2.0 * SUM(puntos_invertidos de upgrades VIGENTES del parche)
//                + 3.0 * SUM(peso de votos en propuestas de capa 'parche'
//                            ya aprobadas)
//
// ATRIBUCION DEL INVERSOR (encargo B, migracion 047): el termino de parche se
// acredita a pu.usuario_id, el usuario que INVERTIO, y NO a cada miembro de la
// pandilla. Con pm.usuario_id una pandilla de N miembros acreditaba el mismo
// upgrade N veces. Eso NO es multiplicacion de filas (eso lo evita el DISTINCT
// ON): es INFLACION de una SUM, y por eso el DISTINCT ON no lo habria
// detectado nunca. El WHERE pu.usuario_id IS NOT NULL es lo que enciende el
// indice idx_parche_upgrades_usuario_id (muerto mientras el conductor fuese
// pm.pandilla_id) y ademas degrada sin romper: hasta que la 047 este aplicada
// el 42703 lo captura sqlConDegradacion y el ranking cae a XP puro.
//
// Cada componente se pre-agrega POR USUARIO y despues se suma. Las 3 fuentes
// NO se unen en un unico agregado a proposito: su producto cartesiano
// multiplicaria los valores (n upgrades x m votos x k pandillas) y inflaria la
// fama sin que ningun error lo delate. Esta forma da 1 fila por usuario SIN
// depender del DISTINCT ON exterior, que solo protege la multiplicacion de
// filas, nunca una suma inflada.
function scoreFamaSql() {
  return 'SELECT b.usuario_id, COALESCE(SUM(b.fama_base), 0)'
    + ' + COALESCE(SUM(b.puntos_invertidos), 0) * 2.0'
    + ' + COALESCE(SUM(b.peso_votos), 0) * 3.0 AS fama'
    + ' FROM ('
    + ' SELECT pm.usuario_id,'
    + ' COALESCE(pa.fama_total, 0) * (CASE pm.rol WHEN \'fundador\' THEN 1.0'
    + ' WHEN \'oficial\' THEN 0.6 ELSE 0.3 END)'
    + ' / GREATEST(COALESCE(cc.factor_conversion, 1.0), 1.0) AS fama_base,'
    + ' 0::numeric AS puntos_invertidos, 0::numeric AS peso_votos'
    + ' FROM pandillas_miembros pm'
    + ' JOIN pandillas pa ON pa.id = pm.pandilla_id'
    + ' LEFT JOIN usuarios uf ON uf.id = pm.usuario_id'
    + ' LEFT JOIN casas_cofre cc ON cc.casa = uf.casa'
    + ' WHERE pm.activo = true'
    + ' UNION ALL SELECT pu.usuario_id, 0::numeric,'
    + ' COALESCE(SUM(GREATEST(pu.puntos_invertidos, 0)), 0), 0::numeric'
    + ' FROM parche_upgrades pu'
    + ' WHERE pu.activo_hasta > NOW() AND pu.usuario_id IS NOT NULL'
    + ' GROUP BY pu.usuario_id'
    + ' UNION ALL SELECT gv.usuario_id, 0::numeric, 0::numeric,'
    + ' COALESCE(SUM(gv.peso), 0)'
    + ' FROM gobernanza_votos gv'
    + ' JOIN gobernanza_propuestas gp ON gp.id = gv.propuesta_id'
    + ' WHERE gp.capa = \'parche\' AND gp.estado = \'aprobada\''
    + ' GROUP BY gv.usuario_id'
    + ' ) b GROUP BY b.usuario_id';
}

// UNA FILA POR USUARIO GARANTIZADA ANTES DE CUALQUIER PARTITION BY (ADR-086
// B3). Cada agregado lleva GROUP BY usuario_id, luego un LEFT JOIN puede
// multiplicar la fila del usuario como maximo UNA vez, y el
// DISTINCT ON (u.id) cablea esa garantia de forma explicita y no heredada.
//
// EL DISTINCT ON HOY ES REDUNDANTE Y SE CABLEA IGUAL, por decision del ADR: el
// primer agregado que se anada sin GROUP BY (una fourth moneda, un segundo
// parche, un LEFT JOIN anidado) lo vuelve imprescindible, y ese fallo no da
// error ni aviso -- ROW_NUMBER() pasa a numerar filas duplicadas del mismo
// usuario y los top-N salen corruptos con el mismo usuario en dos puestos, solo
// en produccion. ORDER BY u.id, u.xp_total DESC es lo que hace DETERMINISTA
// (no arbitraria) la fila que sobrevive.
//
// cols = proyeccion EXPLICITA (nunca u.*: arrastraria email, que es PII) y DEBE
// empezar por 'id', que es la clave del DISTINCT ON. Devuelve solo la clausula
// WITH; el SELECT que la consume lo escribe cada llamador. Dos CTE y no una:
// 'score' es la que garantiza UNA fila por usuario (los agregados con GROUP BY
// mas el DISTINCT ON), y 'scored' solo anade el termino compuesto encima, en un
// paso 1:1 sin ninguna union mas, luego no puede re-multiplicar lo que 'score'
// ya colapso.
function scoreCteSql(cols) {
  return 'WITH score AS ('
    + 'SELECT DISTINCT ON (u.id) ' + cols + ','
    + ' COALESCE(s.saldo, 0) AS saldo, COALESCE(f.fama, 0) AS fama'
    + ' FROM usuarios u'
    + ' LEFT JOIN (SELECT usuario_id, GREATEST(SUM(delta), 0) AS saldo'
    + ' FROM moneda_ledger WHERE usuario_id IS NOT NULL GROUP BY usuario_id'
    + ' ) s ON s.usuario_id = u.id'
    + ' LEFT JOIN (' + scoreFamaSql() + ' ) f ON f.usuario_id = u.id'
    + ' ORDER BY u.id, u.xp_total DESC), scored AS ('
    + ' SELECT ' + cols + ', saldo, fama,'
    + ' xp_total + COALESCE((SELECT valor FROM gamificacion_config'
    + ' WHERE clave = \'' + SCORE_GAMMA_CLAVE + '\'), 0.0000) * ('
    + SCORE_BETA_SALDO + ' * LEAST(GREATEST(saldo, 0), COALESCE((SELECT valor'
    + ' FROM gamificacion_config WHERE clave = \'' + SCORE_TOPE_CLAVE + '\'), '
    + SCORE_TOPE_SEMILLA + ')) + GREATEST(fama, 0)) AS score_ranking'
    + ' FROM score) ';
}

// La ultima red del ORDER BY: si score_ranking llegara en NULL por cualquier
// causa (una funcion, un tipo, una columna renombrada), el orden cae a
// xp_total, que es el orden de siempre.
var SCORE_ORDEN = 'COALESCE(score_ranking, xp_total) DESC, xp_total DESC, id ASC';

// Degradacion EXPLICITA de ADR-086 seccion 4: el ranking responde SIEMPRE y
// nunca devuelve posiciones corruptas. El reintento es la red para el ERROR
// (42P01/42703 = migracion ausente; 57014 = timeout) y el COALESCE del
// multiplicador es la red para el NULL (gamma ausente), y hacen falta las dos
// porque son fallos de naturaleza distinta: uno salta por el catch, el otro no
// da error ni warning en PostgreSQL, solo un orden arbitrario.
function esFalloEsquema(e) {
  return !!(e && (e.code === '42P01' || e.code === '42703'));
}
function esFalloCoste(e) {
  if (!e) return false;
  if (e.code === '57014') return true;
  var m = String(e.message || '');
  return m.indexOf('timeout') !== -1 || m.indexOf('statement') !== -1;
}

// intentos = [{ sql, params, nota }]. Usa el primero que responde. El helper
// NUNCA silencia un codigo que no sea de esquema/coste: esos suben.
async function sqlConDegradacion(sql, etiqueta, intentos) {
  var i = 0;
  for (;;) {
    try {
      return await sql(intentos[i].sql, intentos[i].params || []);
    } catch (e) {
      if (i + 1 >= intentos.length || !(esFalloEsquema(e) || esFalloCoste(e))) throw e;
      console.warn('[' + etiqueta + '] degradado ' + (e.code || 'sin-codigo') + ': '
        + (e.message || '') + ' -> ' + intentos[i + 1].nota);
      i++;
    }
  }
}

module.exports = {
  SCORE_GAMMA_CLAVE: SCORE_GAMMA_CLAVE,
  SCORE_ORDEN: SCORE_ORDEN,
  scoreFamaSql: scoreFamaSql,
  scoreCteSql: scoreCteSql,
  esFalloEsquema: esFalloEsquema,
  esFalloCoste: esFalloCoste,
  sqlConDegradacion: sqlConDegradacion
};