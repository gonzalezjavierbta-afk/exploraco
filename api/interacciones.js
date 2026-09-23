// api/interacciones.js  v28 (Mercado de Emprendedores, migracion 034):
//   ramas GET ?tipo=mercado_config|mercado_ofertas|mercado_mi y POST
//   ?tipo=mercado_publicar|mercado_comprar|mercado_cancelar|mercado_producir
//   (sin endpoints nuevos, 8/8 ADR-010). Habilidad GLOBAL del usuario sobre
//   usuarios.mercado_puntos (escala MERCADO_TIERS 0/100/250/450/700, 5 nodos
//   con slots y reduccion de impuesto; piso 0.01). La compra es atomica en
//   UNA sentencia con CTEs de modificacion (el driver neon HTTP no mantiene
//   transacciones interactivas): descuenta XP del comprador, acredita neto al
//   vendedor + mercado_puntos (neto/10), hace merge JSONB del inventario
//   (ADR-003), baja cantidad_restante y registra mercado_ventas. Ledger
//   xp_ledger: compra exenta negativa + venta exenta positiva. Requiere la
//   migracion 034 aplicada en Neon ANTES del deploy; sin ella las ramas
//   responden 503 con mensaje claro (42P01/42703), sin romper.
//   OJO contrato real (ADR-006): mercado_ofertas/mercado_ventas.consumible_id
//   es uuid -> consumibles(id), NO la clave; las ramas resuelven clave|uuid.
// api/interacciones.js  v26 (ADR-054, guardados de media en Mis Albumes):
//   (1) mis_guardados_media EXIGE sesion firmada (verificarSesion): el
//       dueno sale del TOKEN y el usuario_id del query se IGNORA (leccion
//       BUG-081). Reemplaza el contrato de carpetas privadas (ADR-052) por
//       albumes[] + mi_album_id/mi_album_titulo/visible; conserva data[]
//       (shape de mymapa.js) y el 503 SCHEMA_NOT_MIGRATED tipado (ahora
//       migracion 032).
//   (2) POST ?tipo=guardados_carpeta reescrito sobre ALBUMES: accion=album
//       (asignar/quitar album; C2 anti-IDOR del album destino y C3
//       desasignacion atomica con visible=false) y accion=publicar (409
//       SIN_ALBUM si no tiene album); crear|renombrar|eliminar|mover -> 410
//       CARPETAS_DEPRECADAS. Se elimina TODO el SQL de carpetas.
//   (3) album_detalle fusiona guardados[] (referencias album_foto/
//       viajero_foto/curada) y albumes_guardados[] (fuente='album') con
//       invariante de no-fuga (C1): a un no-dueno solo visible=true Y origen
//       publico; el dueno (token == albumes.usuario_id) ve su organizacion
//       completa. Sesion opcional, JAMAS derivada del query param.
//   (4) Endurecimiento BUG-061: guardar_media/quitar_guardado_media y
//       album_crear exigen sesion firmada y derivan el usuario del token
//       (el usuario_id del body se ignora).
//   (5) BUG-082 (colateral): api/pagina-destino.js filtra af.visible=true
//       en las fotos de album por cercania (ADR-039 D.1).
//   REQUIERE la migracion 032_guardados_album.sql aplicada en Neon ANTES
//   del deploy (patron BUG-021/BUG-060); sin ella mis_guardados_media
//   responde 503 SCHEMA_NOT_MIGRATED y album_detalle degrada las claves
//   nuevas a [].
// api/interacciones.js  v25 (TSK gamificacion v6 / ADR-053):
//   (1) Motor unico de XP: XP_BASES (catalogo v2.1, unico), M_nivel
//       x1.0..x3.0 sobre el nivel DERIVADO de xp_total y doble cap
//       secuencial 5.0/10.0 con gamificacion_config (1 SELECT; fallback a
//       constantes; degrada 42P01/42703 con warn). Sin piso 1.0.
//   (2) xp_ledger: registrarXpLedger en TODOS los puntos de escritura de
//       xp_total (incluidos los exentos: misiones/logros/pandilla reto/
//       admin_xp; restas de compras y DM con xp_final negativo) y
//       actualizacion monotona de usuarios.nivel_max.
//   (3) Bases/acciones: visita_bono_rural 25, resena_larga 30,
//       foto_viajero 20, ao_checkin 20, ao_proponer +30 (cap 3/dia),
//       plan_crear +20 (cap 3/dia), plan_unirse +6 (cap 5/dia),
//       spot_atributos +10 (NUEVA rama, dedup por ledger; completitud por
//       categoria: tags.subcategoria en sitio/comida/evento, cualquier tag
//       no vacio en hostal/vacia, ADR-016), album_foto_autor por catalogo.
//       Misiones de plan 25->10 y 15->10. xp_detalle generalizado (shape
//       del ADR + alias legacy de la visita).
//   (4) NIVELES_LOCAL sincronizado con los 20 umbrales v6 (techo 42000).
//   REQUIERE la migracion 031_gamificacion_v6_nivel_scaling.sql aplicada en
//   Neon ANTES del deploy (patron BUG-021/BUG-060). Si no esta, el XP se
//   entrega igual y tanto el ledger como la config degradan con warn.
// api/interacciones.js  v24 (seguridad multimedia_mapa H-1/H-2 + ADR-052
// carpetas de guardados):
//   (1) H-1/H-2 (multimedia_mapa): scope=mio EXIGE sesion firmada
//       (verificarSesion) y deriva el dueno del token; el query param
//       usuario_id se ignora. La clausula af.visible solo se suprime con
//       dueno autenticado (mmScopeMio && mmUsuarioId): no se puede leer
//       media privada de terceros ni de todos sin Bearer.
//   (2) ADR-052 (carpetas de guardados): organizacion privada de bookmarks
//       (nombre + orden) con 503 SCHEMA_NOT_MIGRATED tipado, sin degradar
//       a []; rama POST ?tipo=guardados_carpeta (crear|renombrar|eliminar|
//       mover) con sesion firmada. SUPERSEDED por ADR-054 (v26).
//   (3) Feature A / ADR-051 (migracion 029): ubicacion individual por
//       recurso de album. multimedia_mapa emite COALESCE(af.lat,a.lat)
//       (fallback vivo recurso -> album -> autor); museo_recurso GET
//       expone lat_propia/lng_propia + coords_heredadas y lat/lng
//       efectivas; POST crear|editar persisten af.lat/lng del recurso,
//       aceptan album_lat/album_lng hacia albumes (COALESCE al sembrar,
//       nunca sobrescriben) y quitar_coords vuelve a heredar del album.
//   REQUIERE las migraciones 029 (album_fotos.lat/lng) y 030 (carpetas de
//   guardados) aplicadas en Neon ANTES del deploy (patron BUG-021/BUG-060).
// api/interacciones.js  v23 (TSK-118/ADR-041 incremento sobre el release v22 ADR-039 + ADR-040 + T4.5):
//   (1) Museo URL-only (ADR-039): ramas GET/POST tipo=museo_recurso
//       (crear/editar/eliminar/listar) sobre album_fotos con visibilidad
//       POR RECURSO (af.visible, migracion 025) y filtro af.visible=true en
//       los lectores publicos (multimedia_mapa sin scope=mio, museo_publico
//       total_fotos, mis_fotos, mi_feed_fotos, fotos_top, album_detalle y
//       galeria_destino); mis_guardados_media SIN filtro (bookmarks privados).
//   (2) Acordeon de niveles (ADR-040): MISION_GATE_XP + nivelDeMisionServidor
//       y campos aditivos gate_nivel/desbloquea/nivel en ?tipo=misiones (y
//       desbloquea tambien aditivo en ?tipo=logros).
//   (3) T4.5 / ENMIENDA 1 ADR-039: misiones mis_videografo y mis_sonidista
//       (video/audio del Museo) en el catalogo MISIONES.
//   v22 (rev. filtros de conteo en albumes/album_detalle/museo_publico;
//       gate_nivel de misiones de video/audio; GET museo_recurso usuario_id
//       opcional; editar por agregador_id).
//   REQUIERE la migracion 025_album_fotos_visible.sql aplicada en Neon ANTES
// del deploy (patron BUG-021/BUG-060). Cero endpoints nuevos (8/8).
// v23 (TSK-118: canal oficial es_oficial con degradacion 42703; authz de casa_tributo_config via validarSesion; fix IDOR lider)
// v21 (TSK-112 / ADR-038: calcularXpFinal clase+Casa, tributacion al cofre, xp_clase/nivel_clase)
// v20 (ADR-036: compartir con XP por primer share + media unificada votos/comentarios/guardados; base v18 ADR-035 XP numeric(12,2))
// TSK-111 (v20): radio urbano 50m (CAMBIO 4) + album_oficial en multimedia_mapa (CAMBIO 8)
// (ASCII-safe: 0 backticks, 0 no-ASCII)
// v19 requiere migraciones 022_media_compartidos.sql y
// 023_interacciones_media_unificadas.sql aplicadas en Neon ANTES del deploy.
// Fuentes canonicas de media: curada (destinos_fotos.id), viajero_foto
// (interacciones.id tipo='foto') y album_foto (album_fotos.id). Las tablas
// legacy album_votos/album_comentarios/album_comentario_votos se conservan
// (cero borrado logico); su backfill idempotente lo hace la 023.
// interacciones columnas: rating (no puntuacion), creado_en (no created_at)
// tipo CHECK: resena, guardado, visita, foto, rating
// rating CHECK: 1-5
// usuario_nombre NO existe - se guarda en texto como prefijo
//
// v7 (fix perfil): los GET tipo=logros/tipo=misiones ejecutan ahora un
// backfill retroactivo (evaluarLogros/evaluarMisiones) ANTES de leer el
// progreso persistido, para registrar logros/misiones ya alcanzados que
// quedaron sin persistir (antes solo se evaluaban en los 4 POST de XP:
// resena/guardado/visita/rating). Nuevo GET tipo=misiones (catalogo +
// estado/fecha). La respuesta de ambos comparte entregarCatalogo().
//
// v8 (Albums ADR-017): +6 misiones, +7 logros, +5 GET (albumes, album_detalle,
//   multimedia_mapa, mi_feed_fotos, fotos_top), +8 POST (album_crear,
//   album_agregar_foto, album_voto, album_quitar_foto, album_editar,
//   album_eliminar, admin_foto_top, admin_moderar_foto_album).
//   Requiere migracion 009_albumes.sql antes de desplegar.
//
// REQUIERE MIGRACION ANTES DE DESPLEGAR (acumulativa desde v4):
//   ALTER TABLE interacciones
//     ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
//   ALTER TABLE usuarios
//     ADD COLUMN IF NOT EXISTS progreso_misiones jsonb NOT NULL DEFAULT '{}'::jsonb;
//   ALTER TABLE usuarios
//     ADD COLUMN IF NOT EXISTS progreso_logros jsonb NOT NULL DEFAULT '{}'::jsonb;
//   -- v6 (Milestones v2, db/migrations/007_milestones_v2.sql):
//   ALTER TABLE interacciones
//     ADD COLUMN IF NOT EXISTS votos_utiles integer NOT NULL DEFAULT 0;
//   CREATE TABLE IF NOT EXISTS resena_votos (...);
//   ALTER TABLE usuarios
//     ADD COLUMN IF NOT EXISTS patrocinios jsonb NOT NULL DEFAULT '{}'::jsonb;
//
// v3: cierra 3 vectores de fraude de XP encontrados en v2:
//  1) 'visita' ahora requiere usuario_id y se deduplica (antes: XP
//     infinito con solo repetir el POST).
//  2) 'guardado'/'quitar_guardado' ahora usan la columna 'activo' en vez
//     de DELETE (Cero Borrado Logico). Antes: ciclo guardar/quitar/
//     guardar otorgaba XP sin limite.
//  3) 'resena' ahora deduplica por usuario_id+destino_id cuando hay
//     usuario_id (antes: resenas repetidas del mismo usuario sumaban XP
//     sin limite y distorsionaban el rating promedio del destino).
//
// v4: motor de misiones. El catalogo (MISIONES, mas abajo) es codigo
// estatico, no una fila JSONB editable por request: la evaluacion de
// dependencias (DAG via 'requiere') y de cada condicion corre siempre en
// servidor, nunca se le confia al cliente. El progreso POR USUARIO si
// vive en Neon (usuarios.progreso_misiones), fusionado con el operador
// '||' (Reglas de Oro punto 3 / ADR-003), nunca reemplazado. No se creo
// un endpoint nuevo (el presupuesto de 8 funciones de Vercel Hobby ya
// esta consumido, ver BLUEPRINT.md): evaluarMisiones() corre dentro de
// esta misma invocacion, justo despues de que 'resena'/'guardado'/
// 'visita' ya hayan sumado su XP base.
//
// v5: catalogo LOGROS estilo consola (tier bronce/plata/oro/platino +
// rareza % tipo Steam) y coleccion por ciudad estilo Upland. Mismo
// patron que MISIONES: codigo estatico, DAG via 'requiere', progreso en
// usuarios.progreso_logros (merge '||'), evaluacion server-side dentro
// de esta invocacion (evaluarLogros), sin endpoint nuevo. El GET
// tipo=logros devuelve el catalogo completo con estado/fecha/tier y la
// rareza global calculada con jsonb_object_keys sobre usuarios activos.
// Los nombres de ciudad se comparan NORMALIZADOS (sin tildes) porque en
// Neon conviven 'Bogota' y 'Bogot\u00e1' segun el seed.

const { neon } = require('@neondatabase/serverless');
var crypto = require('crypto');

// v9 Gamificacion v4.0: probabilidades de cromos por rareza (ADR-018)
var CROMO_PROBABILIDADES = { comun: 0.45, raro: 0.30, epico: 0.18, dorado: 0.07 };

// v11 (ADR-024) Presencia Fisica v4.0: geocerca Haversine server-side
// para el POST tipo='visita', cierre del farming de XP (reactivar no
// repaga) y bono rural plano. Helpers puros, sin dependencias.
//
// v12 (epic prompt.txt 2026-09-13): vocaciones de artista (3 rutas
// acumulables, catalogo en codigo), chat privado por plan (GET plan_chat,
// POST plan_chat_msg y sala ligada en plan_crear), admin_xp (Bearer,
// delta_xp o nivel exacto) y dos fixes: BUG-A (contadores de comentarios
// degradables cuando la migracion 013 no esta aplicada) y BUG-B
// (multimedia_mapa hereda coords del album desde la primera visita o
// guardado del autor hacia un destino georreferenciado). Requiere la
// migracion 015 antes de desplegar (usuarios.vocaciones y
// planes_viaje.sala_id).
//
// v13 (Entrega 016, 2026-09-14): piramide de referidos con reparto
// multinivel (10/5/3/2/1 % via xp_ref_total), Wayfarer Activo Oculto
// (proponer / votar con quorum / checkin geolocalizado), nonce
// anti-replay de geolocalizacion (ADR-025, tabla geo_nonces), vocaciones
// de artista unificadas a nivel 5 (4 rutas: musico/cine/arte/escritor) y
// sesion firmada JWT (validarSesion, misma firma que api/usuarios.js
// v9). Requiere la migracion 016 antes de desplegar (tablas
// activos_ocultos*, activos_ocultos_votos, activos_ocultos_checkins y
// geo_nonces).
//
// v14 (WP-4, TSK-103 / ADR-028, 2026-09-15): Arbol de Clases estilo
// Albion (16 ramas = 4 facciones x 4 ramas, 5 nodos cada una, umbrales
// 0/100/250/450/700). Catalogo en codigo RAMAS (junto a VOCACIONES),
// puntos derivados D_R recalculados en cada lectura + bonos SOLO de
// misiones completadas (rama + puntos_rama en el catalogo MISIONES).
// Ramas tipo=: GET arbol_catalogo (publico), GET arbol_usuario (progreso
// + persistencia write-once de fechas de nodo para el dueno con sesion),
// POST rama_activar (gate nivel 5, sin coincidencia de faccion; art_*
// delega en usuarios.vocaciones), POST arbol_usuario accion=bono_mision
// (+25 unico e idempotente de mis_perfil_completo). museo_publico expone
// el arbol en solo lectura. comprar_consumible aplica el descuento del
// nodo 5 si la categoria del consumible coincide. Requiere la migracion
// 017 (usuarios.progreso_arbol, consumibles.categoria).
//
// v15 (WP-5, TSK-103 / ADR-028, 2026-09-15): Origen derivado + bono x1.2
// dentro de D_R (nunca sobre xp_total ni sobre interacciones.xp_ganado) y
// 8 misiones de perfil (grupo 'perfil', ids mis_perfil_*). El Origen
// ('local'/'nacional'/'extranjero') se deriva por FILA de accion
// comparando usuarios.pais_base/ciudad_base con la ciudad del destino
// (ciudades normalizadas con TRANSLATE para tolerar tildes, patron
// ADR-012). Sin columnas nuevas: usa pais_base (017) y ciudad_base.
//
// v18 (ADR-035, 2026-09-17): el XP pasa a numeric(12,2). Helpers red2
// (half-up a 2 decimales) y numXp (normaliza el string de Neon a Number).
// calcularNivelLocal/ent/D_R, sqlBonoFila, reparto de referidos, fama de
// Parche, amuletos, visitas, compra de consumibles, admin_xp y xp_bono de
// retos pasan a half-up 2. La guarda de fama (famaBase < 1) pasa a <= 0.
// El gate de album_crear usa calcularNivelLocal (antes Math.floor/100+1).
// NUEVA rama GET tipo=pandilla_ranking (global por fama_total DESC, con
// miembros_activos y fallback 42703). Cero endpoints nuevos (8/8).
// TSK-111 (v20, CAMBIO 4): radio de verificacion urbano reducido de 100 m a
// 50 m. Bajan SOLO el default y las subcategorias urbanas; el campo rural
// (RURAL_KEYWORDS -> 250), parque 150, concierto 150, festival 200 y
// deporte 200 se mantienen. ACCURACY_MAX_M (150 m) NO cambia: es un
// chequeo de precision GPS, independiente del radio del lugar.
var TIERRA_RADIO_M = 6371008.8;
var RADIO_DEFAULT_M = 50;
var RADIO_POR_CATEGORIA = { sitio: 50, hostal: 50, comida: 50, evento: 150 };
var RADIO_POR_SUBCATEGORIA = {
  naturaleza: 250, aventura: 250, parque: 150,
  'espacio-publico': 50, 'sitio-historico': 50, museo: 50, cultura: 50,
  religioso: 50, bar: 50, restaurante: 50, cafe: 50, gastrobar: 50,
  'comida-rapida': 50, dulces: 50, concierto: 150, festival: 200,
  teatro: 50, exposicion: 50, deporte: 200, cine: 50, fiesta: 50
};
var RURAL_KEYWORDS = ['sendero', 'mirador', 'finca', 'cabana', 'glamping',
  'rural', 'ecotur', 'natural', 'playa', 'montana', 'refugio', 'cascada',
  'reserva', 'parque nacional', 'rio'];
var ACCURACY_MAX_M = 150;
var COOLDOWN_MIN_SEG = 90;
var MAX_VELOCIDAD_MPS = 69.4;
var VISITAS_DIA_MAX = 30;
var VECINOS_RURAL_MAX = 3;
var VECINOS_BBOX_DEG = 0.02;
var VISITA_BONO_RURAL = 25;
// v27 (Rising Star Decay autorizado): el XP por voto de media decrece con la
// carga reciente y se recarga solo al pasar 24h sin votar. El cooldown entre
// votos crece con la carga. El tope duro diario sigue intacto.
var VOTOS_DIA_MAX = 20;
var VOTO_DECAY_DIV = 20;
var VOTO_COOLDOWN_FACTOR = 30;
var VOTO_COOLDOWN_MAX_SEG = 600;
// ADR-033 (v17): escalado de XP segun la amplitud del area de verificacion
// del lugar. Areas extensas (ciudades, parques metropolitanos) debilitan la
// presencia fisica, asi que rinden menos XP. La visita SIEMPRE se registra
// (marca el mapa); solo cambia el XP otorgado.
var RADIO_XP_MEDIO_M = 1000;
var RADIO_XP_CERO_M = 5000;
function factorXpPorRadio(radio) {
  if (radio === null || radio === undefined) return 1;
  if (radio > RADIO_XP_CERO_M) return 0;
  if (radio > RADIO_XP_MEDIO_M) return 0.5;
  return 1;
}

function haversineMetros(lat1, lng1, lat2, lng2) {
  var rad = Math.PI / 180;
  var dLat = (lat2 - lat1) * rad;
  var dLng = (lng2 - lng1) * rad;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return TIERRA_RADIO_M * c;
}

// ADR-033 (v17): el admin puede fijar un radio explicito en metros por
// lugar (destinos.radio_m). Tiene prioridad absoluta sobre la heuristica
// adaptativa: un bar puede exigir un punto exacto (~100 m) y una ciudad o
// parque extenso cubrir un area amplia. NULL/invalido = heuristica.
function resolverRadioM(categoria, tags, nombre, radioExplicito) {
  if (radioExplicito !== undefined && radioExplicito !== null && radioExplicito !== '') {
    var re = parseInt(radioExplicito, 10);
    if (isFinite(re) && re >= 25 && re <= 100000) return re;
  }
  var t = tags || {};
  var blob = [t.tipo_actividad, t.tipo_alojamiento, t.tipo_comida, nombre]
    .filter(function(x) { return x !== undefined && x !== null; })
    .join(' ').toLowerCase();
  for (var i = 0; i < RURAL_KEYWORDS.length; i++) {
    if (blob.indexOf(RURAL_KEYWORDS[i]) !== -1) return 250;
  }
  var sub = t.subcategoria ? String(t.subcategoria).toLowerCase() : '';
  if (sub && Object.prototype.hasOwnProperty.call(RADIO_POR_SUBCATEGORIA, sub))
    return RADIO_POR_SUBCATEGORIA[sub];
  if (categoria && Object.prototype.hasOwnProperty.call(RADIO_POR_CATEGORIA, categoria))
    return RADIO_POR_CATEGORIA[categoria];
  return RADIO_DEFAULT_M;
}

function tieneCoordsValidas(lat, lng) {
  return typeof lat === 'number' && typeof lng === 'number'
    && isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0;
}

// XP decimal (ADR-035): las columnas XP son numeric(12,2). Neon entrega
// numeric como STRING, asi que todo valor XP se normaliza a Number y se
// redondea half-up a 2 decimales con helpers unicos.
function red2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
function numXp(v) { var n = Number(v); return isFinite(n) ? n : 0; }

// TSK-112 (v21, ADR-038): Clases Rising Star + factor de nivelacion por
// Casa. UNICO catalogo de bonus/umbrales y UNICO calculo de XP final.
// Regla de No-Duplicidad (AGENTS.md 2.1): las acciones de la whitelist
// llaman al motor calcularXpFinal/calcularXpAcreditado; nunca copian esta
// matematica.
var BONUS_CLASE = { cartografo: 0.08, cronista: 0.10, explorador: 0.07 };
var XP_NIVEL_CLASE = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500];

// ADR-053 Decision 9 (v25): catalogo UNICO de bases de XP v2.1. Toda base
// de accion sale de aqui; prohibido el literal suelto. 'compartir' conserva
// los dos montos del ADR (primero/posterior). 'ao_votar' NO figuraba en la
// tabla del ADR pero SI es un punto de escritura real de xp_total (:5584,
// +5): se cataloga para no dejar un literal suelto (ver desviaciones).
// v27: recalibrado por esfuerzo (simples=3, comentario=6, visita/material=30).
var XP_BASES = {
  visita: 60,
  visita_bono_rural: VISITA_BONO_RURAL,
  resena_larga: 30,
  resena_corta: 10,
  rating: 5,
  guardado: 3,
  chat_comentario: 6,
  compartir: { primero: 25, posterior: 5 },
  foto_viajero: 30,
  album_crear: 25,
  album_foto: 20,
  album_foto_autor: 10,
  album_guardado: 5,
  album_guardado_autor: 10,
  voto_media: 3,
  ao_votar: 5,
  ao_proponer: 30,
  ao_checkin: 20,
  plan_crear: 20,
  plan_unirse: 6,
  spot_atributos: 10,
  publicar_basico: 25,
  publicar_intermedio: 60,
  publicar_completo: 120,
  publicar_bono_geo: 40,
  publicar_bono_foto: 30
};

// ADR-053 Decision 1/2 (v25): M_nivel lineal de x1.0 (N1) a x3.0 (N40) y
// FALLBACK en codigo de los 3 parametros de gamificacion_config. Las
// constantes son el fallback y el valor semilla, nunca una segunda fuente.
var CAP_PROGRESION_DEFAULT = 5.0;
var CAP_GLOBAL_DEFAULT = 10.0;
var M_NIVEL_MAX_DEFAULT = 3.0;

// M_nivel(N) = 1.0 + ((N-1)/39) * (m_nivel_max - 1.0). Con el default
// m_nivel_max = 3.0 el paso es 2.0/39 (formula congelada del ADR-053,
// reescalada a 40 niveles en el RELEASE 2026-09-23).
// n se acota a [1, 40]; mNivelMax permite recalibrar sin deploy.
function obtenerMultiplicadorNivel(nivel, mNivelMax) {
  var n = parseInt(nivel, 10);
  if (!isFinite(n) || n < 1) n = 1;
  if (n > 40) n = 40;
  var tope = numXp(mNivelMax);
  if (!isFinite(tope) || tope < 1) tope = M_NIVEL_MAX_DEFAULT;
  return 1.0 + ((n - 1) / 39) * (tope - 1.0);
}

function calcularNivelClase(xpClaseTotal) {
  var xp = numXp(xpClaseTotal);
  var nivel = 1;
  for (var i = 1; i < XP_NIVEL_CLASE.length; i++) {
    if (xp >= XP_NIVEL_CLASE[i]) nivel = i + 1;
    else break;
  }
  return Math.min(nivel, 10);
}

// ADR-053 Decision 6 (v25): 1 SELECT a gamificacion_config por
// acreditacion (sin cache, aceptado por el operador). DEGRADA a las
// constantes en codigo si la tabla no existe (42P01/42703) o si la lectura
// falla, registrando el motivo (patron BUG-021 / AGENTS.md 2.2: prohibido
// el catch vacio). NUNCA lanza.
async function leerConfigGamificacion(sql) {
  var cfg = {
    capProgresion: CAP_PROGRESION_DEFAULT,
    capGlobal: CAP_GLOBAL_DEFAULT,
    mNivelMax: M_NIVEL_MAX_DEFAULT
  };
  try {
    var rows = await sql('SELECT clave, valor FROM gamificacion_config');
    (rows || []).forEach(function(r) {
      var v = numXp(r.valor);
      if (r.clave === 'cap_progresion' && v > 0) cfg.capProgresion = v;
      else if (r.clave === 'cap_global' && v > 0) cfg.capGlobal = v;
      else if (r.clave === 'm_nivel_max' && v >= 1) cfg.mNivelMax = v;
    });
  } catch (eCfg) {
    if (eCfg && (eCfg.code === '42P01' || eCfg.code === '42703')) {
      console.warn('[gamificacion] gamificacion_config ausente (' + eCfg.code + '): caps por constante');
    } else {
      console.warn('[gamificacion] config no leida, caps por constante: ' + (eCfg && eCfg.message));
    }
  }
  return cfg;
}

// ADR-053 Decision 2 (v25): UNICO calculo de XP final. Firma retrocompatible
// (xp_base, nivel_clase, clase_id, casa_tag, ctx). ctx =
// { nivel_usuario, amuleto, lider, capProgresion, capGlobal, mNivelMax };
// defaults seguros: nivel_usuario ausente -> 1, amuleto/lider -> false.
// CADENA SECUENCIAL CONGELADA:
//   m_nivel         = M_nivel(nivel_usuario)                 // 1.0 .. 3.0
//   mult_clase      = 1 + nivel_clase * BONUS_CLASE[clase_id] // 1.0 .. 2.0
//   factor_casa     = 1.30 rezagada | 1.00 equilibrada | 0.85 dominante
//   mult_progresion = m_nivel * mult_clase * factor_casa
//   mult_prog_c     = min(mult_progresion, CAP_PROGRESION)   // 5.0
//   stack_temp      = (amuleto ? 2 : 1) * (lider ? 1.1 : 1)
//   mult_stack      = mult_clase * factor_casa * stack_temp  // reporte
//   mult_global     = mult_prog_c * stack_temp
//   mult_global_c   = min(mult_global, CAP_GLOBAL)           // 10.0
//   xp_final        = red2(xp_base * mult_global_c)
// Sin piso 1.0: el x0.85 de Casa dominante (ADR-038) se preserva a proposito.
// El bono rural y demas bonos PLANOS se suman DESPUES del cap (caller).
// Devuelve el desglose completo para el ledger y el toast (xp_detalle).
function calcularXpFinal(xp_base, nivel_clase, clase_id, casa_tag, ctx) {
  var c = ctx || {};
  var capProgresion = numXp(c.capProgresion);
  if (!isFinite(capProgresion) || capProgresion <= 0) capProgresion = CAP_PROGRESION_DEFAULT;
  var capGlobal = numXp(c.capGlobal);
  if (!isFinite(capGlobal) || capGlobal <= 0) capGlobal = CAP_GLOBAL_DEFAULT;
  var m_nivel = obtenerMultiplicadorNivel(
    c.nivel_usuario === undefined || c.nivel_usuario === null ? 1 : c.nivel_usuario,
    c.mNivelMax
  );
  var bonus = BONUS_CLASE[clase_id] || 0;
  var nivel = parseInt(nivel_clase, 10);
  if (!isFinite(nivel) || nivel < 1) nivel = 1;
  if (nivel > 10) nivel = 10;
  var mult_clase = 1 + (nivel * bonus);
  var factor_casa = (casa_tag === 'rezagada') ? 1.30
    : (casa_tag === 'dominante') ? 0.85 : 1.0;
  var mult_progresion = m_nivel * mult_clase * factor_casa;
  var capProgAplicado = mult_progresion > capProgresion;
  var mult_progresion_c = capProgAplicado ? capProgresion : mult_progresion;
  var stackTemp = (c.amuleto ? 2.0 : 1.0) * (c.lider ? 1.1 : 1.0);
  var mult_stack = mult_clase * factor_casa * stackTemp;
  var mult_global = mult_progresion_c * stackTemp;
  var capGlobAplicado = mult_global > capGlobal;
  var mult_global_c = capGlobAplicado ? capGlobal : mult_global;
  var cap_aplicado = capGlobAplicado ? 'global'
    : (capProgAplicado ? 'progresion' : 'ninguno');
  return {
    xp_final: red2(numXp(xp_base) * mult_global_c),
    m_nivel: m_nivel,
    mult_clase: mult_clase,
    factor_casa: factor_casa,
    mult_progresion: mult_progresion,
    mult_progresion_c: mult_progresion_c,
    cap_progresion: capProgresion,
    mult_stack: mult_stack,
    mult_global: mult_global,
    mult_global_c: mult_global_c,
    cap_global: capGlobal,
    cap_aplicado: cap_aplicado
  };
}

// v25: envoltorio async del punto unico. Lee la config de caps (1 SELECT) y
// delega en calcularXpFinal. Evita duplicar la lectura en cada caller
// (Regla de No-Duplicidad) y es el punto que usan las acreditaciones.
async function calcularXpAcreditado(sql, xp_base, nivel_clase, clase_id, casa_tag, ctx) {
  var cfg = await leerConfigGamificacion(sql);
  var c = Object.assign({}, ctx || {});
  c.capProgresion = cfg.capProgresion;
  c.capGlobal = cfg.capGlobal;
  c.mNivelMax = cfg.mNivelMax;
  return calcularXpFinal(xp_base, nivel_clase, clase_id, casa_tag, c);
}

// v25: desglose aditivo para la UI (ADR-053 Decision 13/spec 9.1). El shape
// del ADR se conserva; total y cap_aplicado pueden sobreescribirse cuando el
// caller aplica un cap DENOMINADO EN XP (compartir/chat, cap_aplicado
// 'accion') o suma bonos planos.
function armarXpDetalle(base, res, bonosPlanos, totalReal, capAplicadoReal) {
  var r = res || {};
  var bonos = numXp(bonosPlanos);
  return {
    base: numXp(base),
    m_nivel: r.m_nivel,
    mult_clase: r.mult_clase,
    factor_casa: r.factor_casa,
    mult_progresion: r.mult_progresion_c,
    cap_progresion: r.cap_progresion,
    mult_stack: r.mult_stack,
    mult_global: r.mult_global_c,
    cap_global: r.cap_global,
    cap_aplicado: capAplicadoReal || r.cap_aplicado,
    bonos_planos: bonos,
    total: (totalReal === undefined || totalReal === null)
      ? red2(numXp(r.xp_final) + bonos)
      : red2(numXp(totalReal))
  };
}

// ADR-053 Decision 7 (v25): ledger unico de XP. BEST-EFFORT: se aisla en su
// propio try/catch con console.warn (nunca bloquea ni revierte la
// acreditacion; si la 031 no esta aplicada, degrada). El parametro opcional
// 'nivel' actualiza ademas usuarios.nivel_max de forma MONOTONA y tambien
// best-effort (Decision 5; el GREATEST jamas decrece). Prohibido el catch
// vacio (AGENTS.md 2.2): todo catch registra el motivo.
async function registrarXpLedger(sql, datos) {
  var d = datos || {};
  try {
    var cap = (d.cap_aplicado === 'progresion' || d.cap_aplicado === 'global'
      || d.cap_aplicado === 'accion') ? d.cap_aplicado : 'ninguno';
    await sql(
      'INSERT INTO xp_ledger (usuario_id, accion, xp_base, mult_nivel, mult_stack,'
      + ' mult_final, cap_aplicado, bonos_planos, xp_final, es_exento, contexto)'
      + ' VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)',
      [d.usuario_id, String(d.accion || 'desconocida'), red2(d.xp_base),
       numXp(d.mult_nivel) || 1, numXp(d.mult_stack) || 1, numXp(d.mult_final) || 1,
       cap, red2(d.bonos_planos), red2(d.xp_final), d.es_exento === true,
       d.contexto ? JSON.stringify(d.contexto) : null]
    );
  } catch (eLed) {
    console.warn('[xp_ledger] fila no registrada ('
      + (eLed && eLed.code ? eLed.code + ' ' : '') + (eLed && eLed.message) + ')');
  }
  if (d.nivel !== undefined && d.nivel !== null) {
    var lvl = parseInt(d.nivel, 10);
    if (isFinite(lvl) && lvl >= 1) {
      try {
        await sql(
          'UPDATE usuarios SET nivel_max = GREATEST(COALESCE(nivel_max, 1), $2::smallint) WHERE id=$1::uuid',
          [d.usuario_id, lvl]
        );
      } catch (eNivelMax) {
        if (eNivelMax && (eNivelMax.code === '42703' || eNivelMax.code === '42P01')) {
          console.warn('[nivel_max] columna/tabla ausente (031 pendiente); insignia derivada intacta');
        } else {
          console.warn('[nivel_max] no actualizado: ' + (eNivelMax && eNivelMax.message));
        }
      }
    }
  }
}

// v25: true si el usuario es lider de la ciudad del destino (stack x1.1).
// Sustituye a xpConMultiplicador (que multiplicaba FUERA del punto unico):
// ahora el caller resuelve el booleano y lo pasa en ctx.lider. Degrada a
// false registrando el motivo; nunca lanza.
function esLiderDestino(sql, usuarioId, destinoId) {
  if (!usuarioId || !destinoId) return Promise.resolve(false);
  return sql('SELECT ciudad FROM destinos WHERE id=$1 LIMIT 1', [destinoId])
    .then(function(r) {
      var ciudad = r[0] ? r[0].ciudad : '';
      if (!ciudad) return false;
      return esLiderDeCiudad(sql, usuarioId, ciudad);
    })
    .catch(function(eLid) {
      console.warn('[xp] lider de ciudad no resuelto: ' + (eLid && eLid.message));
      return false;
    });
}

// ADR-053 Dec 9 + ADR-016 (v25): regla de COMPLETITUD de spot_atributos.
// Exige 3 campos nucleo SIEMPRE (ciudad; direccion fisica = destinos.address
// con barrio de respaldo, migracion 011; contacto = telefono, o precio_desde
// en hostal/comida) mas una senal de taxonomia segun la categoria:
//   - categoria con taxonomia de subcategoria declarada (sitio, comida,
//     evento; ADR-016): al menos 1 valor no vacio en tags.subcategoria.
//   - categoria SIN taxonomia de subcategoria (hostal, blog, vacia o
//     desconocida): al menos 1 valor no vacio en CUALQUIER clave de tags
//     (barra mas debil pero alcanzable). Un hostal jamas tendria
//     tags.subcategoria en el flujo del admin, por lo que exigirlo haria
//     inalcanzable su +10 XP.
// Nunca lanza: entradas raras degradan a false (incompleto) sin error.
// DEUDA (ADR-053): destinos NO tiene columna de creador (verificado en
// admin-destinos.js / publicar-lugar.js), asi que la regla "nunca al
// creador" NO es verificable server-side; el dedup real es por
// (usuario, destino) contra xp_ledger. Cerrarla exige una futura columna
// destinos.creado_por.
var SPOT_CATS_SUBCATEGORIA = ['sitio', 'comida', 'evento'];

function valorNoVacio(v) {
  if (Array.isArray(v))
    return v.some(function(x){ return String(x == null ? '' : x).trim() !== ''; });
  if (v && typeof v === 'object')
    return Object.keys(v).some(function(k){ return valorNoVacio(v[k]); });
  return v !== undefined && v !== null && String(v).trim() !== '';
}

function tieneTagNoVacio(tags) {
  if (!tags || typeof tags !== 'object') return false;
  return Object.keys(tags).some(function(k) {
    var v = tags[k];
    if (Array.isArray(v)) return valorNoVacio(v);
    if (v && typeof v === 'object') {
      return Object.keys(v).some(function(k2){ return valorNoVacio(v[k2]); });
    }
    return valorNoVacio(v);
  });
}

function completitudSpotAtributos(destinoRow) {
  var d = destinoRow || {};
  var cat = String(d.categoria_slug || '').toLowerCase();
  var requierePrecio = (cat === 'hostal' || cat === 'comida');
  var dir = String(d.address || d.barrio || '').trim();
  var ciudad = String(d.ciudad || '').trim();
  var contacto = requierePrecio
    ? (d.precio_desde !== undefined && d.precio_desde !== null && String(d.precio_desde).trim() !== '')
    : String(d.telefono || '').trim() !== '';
  if (!ciudad || !dir || !contacto) return false;
  var tags = d.tags || {};
  if (SPOT_CATS_SUBCATEGORIA.indexOf(cat) !== -1) {
    // sitio / comida / evento: taxonomia obligatoria (ADR-016).
    return valorNoVacio(tags.subcategoria);
  }
  // hostal / blog / categoria vacia o desconocida: barra debil alcanzable.
  return tieneTagNoVacio(tags);
}

function calcularTagCasa(miembros_casa, total_miembros) {
  var total = parseInt(total_miembros, 10);
  if (!isFinite(total) || total <= 0) return 'equilibrada';
  var miembros = parseInt(miembros_casa, 10);
  if (!isFinite(miembros) || miembros < 0) miembros = 0;
  var pct = miembros / total;
  if (pct > 0.45) return 'dominante';
  if (pct < 0.25) return 'rezagada';
  return 'equilibrada';
}

// Contexto de entrega (1 SELECT): clase del usuario + tag de su Casa por
// poblacion relativa. DEGRADACION (patron BUG-021): si el esquema 024 aun
// no esta migrado, reintenta el SELECT minimo y, si tambien falla,
// devuelve defaults seguros. NUNCA lanza y NUNCA captura en silencio.
async function contextoXpE(sql, usuarioId) {
  var out = { clase_id: null, nivel_clase: 1, xp_clase: 0, casa: null, tag: 'equilibrada' };
  if (!usuarioId) return out;
  function armarCtx(row) {
    var r = row || {};
    var nivel = parseInt(r.nivel_clase, 10);
    if (!isFinite(nivel) || nivel < 1) nivel = 1;
    var miembros = parseInt(r.miembros_casa, 10);
    var total = parseInt(r.total_miembros, 10);
    return {
      clase_id: r.clase_id || null,
      nivel_clase: nivel,
      xp_clase: numXp(r.xp_clase),
      casa: r.casa || null,
      tag: calcularTagCasa(isFinite(miembros) ? miembros : 0, isFinite(total) ? total : 0),
      // ADR-053 Enmienda 1: M_nivel usa el nivel DERIVADO de xp_total
      // (calcularNivel), NUNCA nivel_max/nivel_visible. Gastar XP puede
      // bajar el multiplicador aunque la insignia se conserve (ADR-018).
      nivel_usuario: calcularNivelLocal(numXp(r.xp_total)).nivel
    };
  }
  try {
    var rows = await sql(
      'SELECT u.clase_id, u.nivel_clase, u.xp_clase, u.casa, u.xp_total, '
      + '(SELECT COUNT(*)::int FROM usuarios WHERE casa = u.casa) AS miembros_casa, '
      + '(SELECT COUNT(*)::int FROM usuarios WHERE casa IS NOT NULL) AS total_miembros '
      + 'FROM usuarios u WHERE u.id = $1::uuid',
      [usuarioId]
    );
    return armarCtx(rows && rows[0]);
  } catch (errCtx) {
    console.warn('[xp] contexto degradado: ' + (errCtx && errCtx.message));
  }
  try {
    var minRows = await sql(
      'SELECT clase_id, nivel_clase, xp_clase, casa, xp_total FROM usuarios WHERE id = $1::uuid',
      [usuarioId]
    );
    return armarCtx(minRows && minRows[0]);
  } catch (errMin) {
    console.warn('[xp] contexto minimo degradado: ' + (errMin && errMin.message));
    return out;
  }
}

// Efectos posteriores a la entrega de XP (best-effort, no bloquean):
// (a) 50% del XP final al xp_clase/nivel_clase del usuario con Clase;
// (b) 10% del XP final al cofre de su Casa. Cada efecto se aisla con su
// propio try/catch que registra el error (AGENTS.md 2.2); jamas lanza ni
// revierte el XP del usuario. NO existe endpoint HTTP casa_tributar.
async function acreditarClaseYCofre(sql, usuarioId, ctx, xp_final) {
  var c = ctx || {};
  if (c.clase_id) {
    try {
      var xp_inc = red2(xp_final * 0.5);
      await sql(
        'UPDATE usuarios SET xp_clase = xp_clase + $1, nivel_clase = $2 WHERE id=$3::uuid',
        [xp_inc, calcularNivelClase(parseFloat(c.xp_clase || 0) + xp_inc), usuarioId]
      );
    } catch (errClase) {
      console.error('[entregarXp] clase/cofre best-effort: ' + (errClase && errClase.message));
    }
  }
  if (c.casa) {
    try {
      var pctRows = await sql('SELECT COALESCE(tributo_pct, 10) AS pct FROM casas_cofre WHERE casa = $1', [c.casa]);
      var pct = parseFloat((pctRows && pctRows[0] && pctRows[0].pct) || 10);
      if (!isFinite(pct) || pct < 0 || pct > 15) pct = 10;
      var tributo = red2(xp_final * (pct / 100));
      await sql(
        'UPDATE casas_cofre SET xp_cofre_total = xp_cofre_total + $1, actualizado_en = NOW() WHERE casa = $2',
        [tributo, c.casa]
      );
      await avanzarMisionesCasa(sql, usuarioId, 'xp_total', xp_final);
    } catch (errCofre) {
      console.error('[acreditarClaseYCofre] cofre/mision best-effort: ' + (errCofre && errCofre.message));
    }
  }
}

// Misiones conjuntas de Casa (comunicacion Casas, 2026-09-18): avanza
// best-effort las misiones activas de la Casa del usuario. metaTipo debe
// pertenecer al catalogo del CHECK de casa_misiones; para 'xp_total' el
// delta es el XP entregado y para el resto es 1 accion. Nunca lanza: si
// la migracion aun no corrio (42P01) degrada registrando el motivo
// (AGENTS.md 2.2, prohibido el catch vacio que silencia fallos).
var CASA_MISIONES_META = ['visitas', 'xp_total', 'resenas', 'fotos'];
async function avanzarMisionesCasa(sql, usuarioId, metaTipo, delta) {
  if (!usuarioId) return;
  if (CASA_MISIONES_META.indexOf(metaTipo) === -1) return;
  var inc = metaTipo === 'xp_total' ? delta : 1;
  inc = Math.round(Number(inc));
  if (!isFinite(inc) || inc <= 0) inc = 1;
  try {
    await sql(
      'UPDATE casa_misiones cm '
      + 'SET progreso_actual = LEAST(cm.progreso_actual + $3::int, cm.meta_valor), '
      + 'estado = CASE WHEN LEAST(cm.progreso_actual + $3::int, cm.meta_valor) >= cm.meta_valor THEN \'completada\' ELSE cm.estado END, '
      + 'completado_en = CASE WHEN LEAST(cm.progreso_actual + $3::int, cm.meta_valor) >= cm.meta_valor AND cm.completado_en IS NULL THEN NOW() ELSE cm.completado_en END '
      + 'WHERE cm.casa = (SELECT casa FROM usuarios WHERE id = $1::uuid) '
      + 'AND cm.estado = \'activa\' AND cm.meta_tipo = $2',
      [usuarioId, metaTipo, inc]
    );
  } catch (errMision) {
    if (errMision && errMision.code === '42P01') {
      console.warn('[avanzarMisionesCasa] casa_misiones no existe (migracion pendiente)');
      return;
    }
    console.error('[avanzarMisionesCasa] best-effort: ' + (errMision && errMision.message));
  }
}

// Bornes de los 40 niveles (espejo sincronizado de api/usuarios.js NIVELES;
// NO hay require cruzado entre funciones serverless: admin.js:56-59). La UI
// sincroniza XP_LEVELS en index/mi-perfil/comunidad. RELEASE 2026-09-23:
// umbrales NUEVOS (techo 100000), mismos para el nivel derivado de
// M_nivel. Se usan para calcular nivel y era en GETs locales (inventario)
// sin depender de api/usuarios.js.
var NIVELES_LOCAL = [
  0, 150, 500, 1000, 1650, 2500, 3450, 4550, 5800, 7150,
  8650, 10250, 12000, 13850, 15800, 17900, 20100, 22450, 24850, 27400,
  30050, 32800, 35700, 38650, 41750, 44900, 48200, 51600, 55050, 58700,
  62400, 66150, 70050, 74050, 78150, 82300, 86600, 90950, 95450, 100000
];
function calcularNivelLocal(xpTotal) {
  var xp = Number(xpTotal) || 0;
  var idx = 0;
  for (var i = 0; i < NIVELES_LOCAL.length; i++) {
    if (xp >= NIVELES_LOCAL[i]) idx = i;
  }
  return { nivel: idx + 1, badge_actual: '' };
}
function calcularEraLocal(nivel) {
  if (nivel <= 10) return 'Caminante';
  if (nivel <= 20) return 'Explorador';
  if (nivel <= 30) return 'Cronista';
  if (nivel <= 35) return 'Leyenda';
  return 'Mito';
}

// Era canonica "ganada": GREATEST(nivel derivado de xp_total, nivel_max).
// Espejo documentado de conNivel() en api/usuarios.js:160-170 (ADR-053).
// El gate de consumibles por era SIEMPRE debe usar este helper: nunca el
// nivel derivado del XP crudo (gastar XP baja el nivel economico, no la era).
function calcularEraVisibleLocal(xpTotal, nivelMax) {
  var n = calcularNivelLocal(xpTotal).nivel;
  var nm = parseInt(nivelMax, 10) || 1;
  return calcularEraLocal(Math.max(n, nm));
}

// ADR-040 (v22): nivel que desbloquea cada mision que abre capacidad.
// Los valores son el nivel (1-based) cuyo umbral minimo vive en el mismo
// catalogo NIVELES_LOCAL; nivelDeMisionServidor valida contra ESE catalogo
// (prohibido declarar una segunda tabla de umbrales, Regla de No-Duplicidad).
var MISION_GATE_XP = {
  mis_fotografo: 2,
  mis_chat_mensajero: 3,
  mis_chat_moderador: 4,
  mis_chat_creador: 5,
  mis_organizador_bogota: 3
};

// ADR-040 (B): nivel de una mision para el acordeon de Mi Perfil.
// Prioridad: (a) gate_nivel explicito del catalogo; (b) MISION_GATE_XP;
// (c) null (sin ancla detectable: sigue en el panel #pf-misiones).
function nivelDeMisionServidor(item) {
  if (!item) return null;
  if (item.gate_nivel != null) return item.gate_nivel;
  var lvl = MISION_GATE_XP[item.id];
  if (lvl == null) return null;
  // calcularNivelLocal sobre el umbral real de ese nivel devuelve el mismo
  // nivel; mantiene una unica tabla de umbrales (NIVELES_LOCAL).
  return calcularNivelLocal(NIVELES_LOCAL[lvl - 1]).nivel;
}

// Normaliza un booleano opcional del body (true/false, 'true'/'false',
// 1/0, '1'/'0'); cualquier otro valor (o ausente) devuelve null.
function aBooleano(v) {
  if (v === true || v === 'true' || v === 1 || v === '1') return true;
  if (v === false || v === 'false' || v === 0 || v === '0') return false;
  return null;
}

// Nombres de los 40 niveles (misma tabla que api/usuarios.js NIVELES;
// ASCII-safe: las tildes van como escapes \u00xx, nunca bytes > 127).
var BADGES_LOCAL = [
  'Caminante Novato', 'Rastreador Local', 'Explorador Urbano',
  'Aventurero Regional', 'Vanguardia Territorial', 'Embajador de Zona',
  'Fot\u00f3grafo de Ruta', 'Cronista de Historias', 'Buscador de Leyendas',
  'Gu\u00eda de Fronteras', 'Estratega Comunitario', 'Documentalista Visual',
  'Se\u00f1or del Spot', 'Cart\u00f3grafo de Cine', 'Protector del Patrimonio',
  'Curador de Colombia', 'Mariscal de Parche', 'Cineasta de Territorio',
  'Inmortal del Mapa', 'Gran Maestro ExploraCO', 'Tejedor de Rutas',
  'Cronista de Regiones', 'Curador de Relatos', 'Guardi\u00e1n de Tradiciones',
  'Arquitecto de Itinerarios', 'Maestro de Ceremonias', 'Cronista Mayor',
  'Embajador Cultural', 'Historiador de Territorio', 'Sabio de los Caminos',
  'Leyenda Emergente', 'Forjador de Leyendas', 'H\u00e9roe del Mapa',
  'Tit\u00e1n de las Rutas', 'Leyenda Viva', 'Mito Naciente',
  'Semidi\u00f3s del Viaje', 'Guardi\u00e1n Ancestral', 'Esp\u00edritu del Territorio',
  'Mito Eterno ExploraCO'
];

// Alias para el epic v12 (admin_xp y vocaciones): NO se duplica la lista,
// se reusa NIVELES_LOCAL (mismos 40 minimos que api/usuarios.js NIVELES)
// para que no existan dos catalogos que puedan desincronizarse.
var NIVELES_ADMIN = NIVELES_LOCAL;

// -- Catalogo de vocaciones de artista (epic 2026-09-13) -------------
// 3 rutas acumulables (Musico, Cine, Artista grafico) desbloqueables por
// nivel (NIVELES_ADMIN). El catalogo vive en codigo (patron de LOGROS);
// usuarios.vocaciones solo guarda las claves activadas por el usuario.
// ASCII-safe (ADR-002): los emojis van como escapes \uXXXX, nunca bytes.
// v13 (Entrega 016): las 4 vocaciones artisticas se desbloquean juntas
// en el bloque de nivel 5 (decision aprobada, ADR-026).
var VOCACIONES = [
  { id: 'musico', nombre: 'Musico', emoji: '\uD83C\uDFB5', nivel: 5,
    habilidades: ['Vitrina musical', 'Setlist destacado', 'Sello de interprete'] },
  { id: 'cine', nombre: 'Cine', emoji: '\uD83C\uDFAC', nivel: 5,
    habilidades: ['Reel de cine', 'Cartelera propia', 'Sello de cineasta'] },
  { id: 'artista_grafico', nombre: 'Artista Grafico', emoji: '\uD83C\uDFA8', nivel: 5,
    habilidades: ['Galeria de obra', 'Paleta de marca', 'Sello de autor'] },
  { id: 'escritor', nombre: 'Escritor', emoji: '\u270D\uFE0F', nivel: 5,
    habilidades: ['Pluma de relatos', 'Bitacora de ruta', 'Sello de cronista'] }
];

// -- Catalogo del Arbol de Clases (WP-4, TSK-103 / ADR-028) ----------
// 16 ramas = 4 facciones x 4 ramas, 5 nodos por rama. Los umbrales son
// los mismos tiers de tabla_destino (0/100/250/450/700) para no crear una
// segunda escala de progreso (Regla de No-Duplicidad). El arbol NO es un
// cuarto sistema de progresion: cuelga de usuarios.faccion y ESPEJA las 4
// vocaciones de artista de usuarios.vocaciones en las ramas art_*
// (fuente unica, ADR-026).
//
// DECISION DEL DUENO (WP-4): se progresa en TODAS las ramas de cualquier
// faccion; rama_activar NO exige coincidencia de faccion, solo nivel 5.
//
// PUNTOS DERIVADOS (D_R): se recalculan en CADA lectura desde las
// acciones reales del usuario; JAMAS se leen de usuarios.progreso_arbol.
//   P_R = COALESCE((progreso_arbol->'bonos'->>R)::numeric, 0) + D_R
// Los 'bonos' provienen SOLO de misiones completadas (campos rama y
// puntos_rama del catalogo MISIONES) o del bono unico de mis_perfil_completo.
// Formulas D_R (ver calcularDerivadosArbol):
//   exp_rutas:      SUM(xp_ganado) de interacciones tipo IN ('guardado','visita') activo=true
//   exp_ocultos:    aprobados*60 + pendientes*10 + checkins*25 (016)
//   exp_ciudades:   COUNT(DISTINCT ciudad) de destinos visitados activos * 40
//   exp_naturaleza: SUM(xp_ganado de visitas) + n_visitas_rural*20
//   cur_critico:    SUM(xp_ganado) de resena/rating + SUM(votos_utiles)*10
//   cur_colecciones:n_cromos*15 + n_dorados*50 (usuarios_cromos/cromos_catalogo)
//   cur_datos:      n_votos_activo*8 + n_review_voto*5 + n_comentarios*5 (016/007/013)
//   cur_guia:       n_mapas_publicos*40 + n_mapa_destinos*5 + n_planes_unidos*15
//   cre_planes:     n_planes_creados_activos*25 + n_miembros_planes*10
//   cre_parche:     es_fundador*100 + n_miembros_activos*15 + n_retos_completados*30
//   cre_eventos:    SUM(xp_ganado) de acciones a destinos.categoria_slug='evento'
//   cre_embajador:  n_directos*40 + n_red_nivel2_5*10 (usuarios.referido_por)
//   art_musica:     (vocacion musico)*50 + n_media_audio*15 (album_fotos.foto_type='audio')
//   art_cine:       (vocacion cine)*50 + n_media_video*15
//   art_grafica:    (vocacion artista_grafico)*50 + n_votos_recibidos*10
//   art_literatura: (vocacion escritor)*50 + n_resenas_largas*15 (LENGTH(texto)>500)
//
// BONO DE ORIGEN x1.2 (WP-5, ADR-028), SOLO dentro de D_R (jamas toca
// usuarios.xp_total ni interacciones.xp_ganado). El Origen se deriva por
// fila comparando pais_base/ciudad_base del usuario con la ciudad del
// destino de la accion (TRANSLATE tolera tildes):
//   local      -> cur_critico, cur_colecciones, cur_datos, cur_guia, exp_ocultos
//   nacional   -> exp_rutas, exp_ciudades
//   extranjero -> cur_critico, art_literatura
// El redondeo del bono es ROUND(valor * 1.2, 2) por fila/unidad (mismo
// criterio que la piramide de referidos, ADR-035). En ramas sin ciudad de
// destino (cur_colecciones, y el componente sin mapa de cur_guia, y
// art_literatura) se aplica el ORIGEN PROPIO del usuario, documentado
// como simplificacion.
// Ninguna consulta D_R menciona progreso_arbol ni perfil_config (invariante
// anti-doble-conteo). Cada consulta degrada a 0 en catch (tabla/columna
// ausente por migracion pendiente) sin romper la lectura.
//
// EFECTOS PERMITIDOS (duro): nodos 1-4 con efecto null (solo titulo e
// insignia cosmeticos); el nodo 5 puede ser un TITULO visible o un
// DESCUENTO del 10% en consumibles de una categoria (perfil/mapas/galeria/
// chat). PROHIBIDO conceder capacidades funcionales o de privilegio y
// PROHIBIDO crear multiplicadores de XP.
var RAMA_TIERS = [0, 100, 250, 450, 700];
var RAMA_TIERS_NOMBRES = ['Iniciado', 'Aprendiz', 'Veterano', 'Maestro', 'Leyenda'];

var RAMAS = [
  {
    id: 'exp_rutas', faccion: 'exploradores', nombre: 'Rutas',
    emoji: '\uD83E\uDDED',
    desc: 'Recorre y guarda destinos para dominar las rutas de Colombia.',
    fuente: 'xp de guardados y visitas activas',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Caminante', insignia: 'ruta-paso', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Trazador', insignia: 'ruta-huella', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Cartografo', insignia: 'ruta-mapa', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Guia de Rutas', insignia: 'ruta-guia', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Maestro de Rutas', insignia: 'ruta-maestro',
        efecto: { tipo: 'titulo', valor: 'Maestro de Rutas' } }
    ]
  },
  {
    id: 'exp_ocultos', faccion: 'exploradores', nombre: 'Ocultos',
    emoji: '\uD83D\uDD0D',
    desc: 'Propone, vota y verifica Activos Ocultos en el terreno.',
    fuente: 'propuestas aprobadas, pendientes y checkins de Activo Oculto',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Curioso', insignia: 'oculto-curioso', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Rastreador', insignia: 'oculto-rastreador', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Descubridor', insignia: 'oculto-descubridor', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Explorador de Sombras', insignia: 'oculto-sombras', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Leyenda Oculta', insignia: 'oculto-leyenda',
        efecto: { tipo: 'titulo', valor: 'Leyenda Oculta' } }
    ]
  },
  {
    id: 'exp_ciudades', faccion: 'exploradores', nombre: 'Ciudades',
    emoji: '\uD83C\uDFD9',
    desc: 'Suma ciudades distintas a tu mapa de viajero.',
    fuente: 'ciudades distintas con visitas activas',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Visitante', insignia: 'ciudad-visitante', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Transeunte', insignia: 'ciudad-transeunte', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Viajero de Ciudades', insignia: 'ciudad-viajero', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Conquistador Urbano', insignia: 'ciudad-conquistador', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Nomada Urbano', insignia: 'ciudad-nomada',
        efecto: { tipo: 'descuento', categoria: 'mapas', pct: 10 } }
    ]
  },
  {
    id: 'exp_naturaleza', faccion: 'exploradores', nombre: 'Naturaleza',
    emoji: '\uD83C\uDF3F',
    desc: 'Confirma visitas a senderos, parques y destinos rurales.',
    fuente: 'xp de visitas y salidas rurales o de naturaleza',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Sendero', insignia: 'natura-sendero', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Baqueano', insignia: 'natura-baqueano', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Guardian Verde', insignia: 'natura-guardian', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Espiritu del Bosque', insignia: 'natura-espiritu', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Voz de la Montana', insignia: 'natura-montana',
        efecto: { tipo: 'titulo', valor: 'Voz de la Montana' } }
    ]
  },
  {
    id: 'cur_critico', faccion: 'curadores', nombre: 'Critico',
    emoji: '\u2B50',
    desc: 'Escribe resenas y califica lugares con criterio.',
    fuente: 'xp de resenas y ratings mas votos utiles recibidos',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Opinador', insignia: 'critico-opinador', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Resenador', insignia: 'critico-resenador', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Critico Local', insignia: 'critico-local', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Critico Experto', insignia: 'critico-experto', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Pluma de Autoridad', insignia: 'critico-autoridad',
        efecto: { tipo: 'titulo', valor: 'Pluma de Autoridad' } }
    ]
  },
  {
    id: 'cur_colecciones', faccion: 'curadores', nombre: 'Colecciones',
    emoji: '\uD83D\uDCE6',
    desc: 'Completa tu vitrina de cromos y persigue los dorados.',
    fuente: 'cromos coleccionados y cromos dorados',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Aprendiz de Vitrina', insignia: 'colec-aprendiz', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Coleccionista', insignia: 'colec-coleccionista', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Curador de Cromos', insignia: 'colec-curador', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Maestro de Vitrina', insignia: 'colec-maestro', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Archivista Dorado', insignia: 'colec-archivista',
        efecto: { tipo: 'descuento', categoria: 'perfil', pct: 10 } }
    ]
  },
  {
    id: 'cur_datos', faccion: 'curadores', nombre: 'Datos',
    emoji: '\uD83D\uDCCA',
    desc: 'Vota propuestas, resenas y comentarios de la comunidad.',
    fuente: 'votos en Activos Ocultos, votos de resenas y comentarios',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Observador', insignia: 'datos-observador', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Analista', insignia: 'datos-analista', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Verificador', insignia: 'datos-verificador', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Faro de Datos', insignia: 'datos-faro', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Oraculo de Datos', insignia: 'datos-oraculo',
        efecto: { tipo: 'descuento', categoria: 'galeria', pct: 10 } }
    ]
  },
  {
    id: 'cur_guia', faccion: 'curadores', nombre: 'Guia',
    emoji: '\uD83D\uDDFA',
    desc: 'Publica mapas tematicos y guia planes de viaje.',
    fuente: 'mapas publicos, destinos mapeados y planes unidos',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Aprendiz de Mapa', insignia: 'guia-aprendiz', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Trazador de Mapas', insignia: 'guia-trazador', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Guia Practico', insignia: 'guia-practico', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Cartografo Mayor', insignia: 'guia-cartografo', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Gran Guia', insignia: 'guia-gran',
        efecto: { tipo: 'descuento', categoria: 'mapas', pct: 10 } }
    ]
  },
  {
    id: 'cre_planes', faccion: 'creadores', nombre: 'Planes',
    emoji: '\uD83E\uDD1D',
    desc: 'Convoca planes de viaje y suma viajeros a tu grupo.',
    fuente: 'planes creados activos y miembros sumados',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Anfitrion Novato', insignia: 'plan-anfitrion', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Organizador', insignia: 'plan-organizador', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Lider de Planes', insignia: 'plan-lider', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Arquitecto de Viajes', insignia: 'plan-arquitecto', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Maestro de Planes', insignia: 'plan-maestro',
        efecto: { tipo: 'descuento', categoria: 'chat', pct: 10 } }
    ]
  },
  {
    id: 'cre_parche', faccion: 'creadores', nombre: 'Parche',
    emoji: '\uD83D\uDC51',
    desc: 'Funda o impulsa tu Parche y completa sus retos.',
    fuente: 'fundacion, miembros activos y retos completados',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Recluta', insignia: 'parche-recluta', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Miembro Activo', insignia: 'parche-miembro', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Oficial de Parche', insignia: 'parche-oficial', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Referente del Parche', insignia: 'parche-referente', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Fundador Legendario', insignia: 'parche-fundador',
        efecto: { tipo: 'titulo', valor: 'Fundador Legendario' } }
    ]
  },
  {
    id: 'cre_eventos', faccion: 'creadores', nombre: 'Eventos',
    emoji: '\uD83C\uDF89',
    desc: 'Participa y dinamiza la agenda de eventos del pais.',
    fuente: 'xp de acciones en destinos de categoria evento',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Asistente', insignia: 'evento-asistente', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Convocante', insignia: 'evento-convocante', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Promotor', insignia: 'evento-promotor', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Gestor de Eventos', insignia: 'evento-gestor', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Maestro de Eventos', insignia: 'evento-maestro',
        efecto: { tipo: 'titulo', valor: 'Maestro de Eventos' } }
    ]
  },
  {
    id: 'cre_embajador', faccion: 'creadores', nombre: 'Embajador',
    emoji: '\uD83C\uDF96',
    desc: 'Invita viajeros y haz crecer tu red de referidos.',
    fuente: 'referidos directos y red de niveles 2 a 5',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Invitado', insignia: 'embajador-invitado', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Referente', insignia: 'embajador-referente', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Embajador Local', insignia: 'embajador-local', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Embajador Regional', insignia: 'embajador-regional', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Embajador de Leyenda', insignia: 'embajador-leyenda',
        efecto: { tipo: 'descuento', categoria: 'perfil', pct: 10 } }
    ]
  },
  {
    id: 'art_musica', faccion: 'artistas', nombre: 'Musica',
    emoji: '\uD83C\uDFB5',
    desc: 'Desarrolla tu vocacion musical y publica audio.',
    fuente: 'vocacion de musico y media de audio subida',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Aficionado', insignia: 'musica-aficionado', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Interprete', insignia: 'musica-interprete', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Compositor', insignia: 'musica-compositor', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Productor', insignia: 'musica-productor', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Leyenda Musical', insignia: 'musica-leyenda',
        efecto: { tipo: 'descuento', categoria: 'galeria', pct: 10 } }
    ]
  },
  {
    id: 'art_cine', faccion: 'artistas', nombre: 'Cine',
    emoji: '\uD83C\uDFAC',
    desc: 'Desarrolla tu vocacion audiovisual y publica video.',
    fuente: 'vocacion de cine y media de video subido',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Espectador', insignia: 'cine-espectador', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Realizador', insignia: 'cine-realizador', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Director', insignia: 'cine-director', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Cineasta', insignia: 'cine-cineasta', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Leyenda del Cine', insignia: 'cine-leyenda',
        efecto: { tipo: 'descuento', categoria: 'galeria', pct: 10 } }
    ]
  },
  {
    id: 'art_grafica', faccion: 'artistas', nombre: 'Grafica',
    emoji: '\uD83C\uDFA8',
    desc: 'Publica tu obra visual y recibe votos de la comunidad.',
    fuente: 'vocacion de artista grafico y votos recibidos en tus fotos',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Trazos', insignia: 'grafica-trazos', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Ilustrador', insignia: 'grafica-ilustrador', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Disenador', insignia: 'grafica-disenador', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Artista Visual', insignia: 'grafica-visual', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Leyenda Grafica', insignia: 'grafica-leyenda',
        efecto: { tipo: 'descuento', categoria: 'perfil', pct: 10 } }
    ]
  },
  {
    id: 'art_literatura', faccion: 'artistas', nombre: 'Literatura',
    emoji: '\u270D\uFE0F',
    desc: 'Escribe relatos y resenas extensas de tus viajes.',
    fuente: 'vocacion de escritor y resenas extensas',
    nodos: [
      { id: 'n1', puntos: 0, nombre: 'Lector', insignia: 'letras-lector', efecto: null },
      { id: 'n2', puntos: 100, nombre: 'Cronista', insignia: 'letras-cronista', efecto: null },
      { id: 'n3', puntos: 250, nombre: 'Narrador', insignia: 'letras-narrador', efecto: null },
      { id: 'n4', puntos: 450, nombre: 'Escritor de Viajes', insignia: 'letras-viajes', efecto: null },
      { id: 'n5', puntos: 700, nombre: 'Leyenda Literaria', insignia: 'letras-leyenda',
        efecto: { tipo: 'titulo', valor: 'Leyenda Literaria' } }
    ]
  }
];

// Indice id -> rama (lista blanca para validar rama_id del cliente).
var RAMA_POR_ID = {};
RAMAS.forEach(function(r) { RAMA_POR_ID[r.id] = r; });

// -- Mercado de Emprendedores (migracion 034) -------------------------
// Habilidad GLOBAL del usuario (aplica en las 3 Casas). El nodo se deriva
// de usuarios.mercado_puntos con la MISMA escala de tiers del Arbol de
// Clases (0/100/250/450/700) para no crear una segunda escala de progreso
// (Regla de No-Duplicidad). El catalogo vive en codigo (patron RAMAS).
// OJO: mercado_ofertas.consumible_id es uuid -> consumibles(id) segun el
// contrato de la 034, NO la clave; las ramas resuelven clave o uuid a id.
var MERCADO_CASAS = ['condor', 'jaguar', 'delfin'];
var MERCADO_TIERS = [0, 100, 250, 450, 700];
// IMPORTANTE (reconciliacion con la regla de RAMAS, L900-905):
// (a) MERCADO_NODOS es un catalogo SEPARADO de RAMAS. La regla de L900-905
//     (los nodos de RAMAS no conceden capacidades funcionales ni
//     multiplicadores de XP) aplica al arbol de 16 ramas y NO a este.
// (b) Los efectos del mercado estan ACOTADOS a la economia del mercado:
//     slots de oferta, reduccion del impuesto de la Casa, y produccion de
//     consumibles. NO crean multiplicadores de XP ni conceden privilegios
//     globales.
// (c) Su justificacion se documenta en el ADR de cierre (docs-keeper).
var MERCADO_NODOS = [
  { nodo: 1, nombre: 'Aprendiz de Mercado', nivel_jugador: 2,  slots_extra: 1, reduccion_impuesto: 0,    produce: false },
  { nodo: 2, nombre: 'Tendero',             nivel_jugador: 5,  slots_extra: 2, reduccion_impuesto: 0.01, produce: false },
  { nodo: 3, nombre: 'Productor',           nivel_jugador: 10, slots_extra: 3, reduccion_impuesto: 0.02, produce: true },
  { nodo: 4, nombre: 'Distribuidor',        nivel_jugador: 20, slots_extra: 3, reduccion_impuesto: 0.03, produce: true },
  { nodo: 5, nombre: 'Magnate',             nivel_jugador: 30, slots_extra: 4, reduccion_impuesto: 0.04, produce: true }
];
var MERCADO_UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
function calcularMercado(puntos) {
  var p = numXp(puntos);
  var idx = 0;
  for (var i = 0; i < MERCADO_TIERS.length; i++) {
    if (p >= MERCADO_TIERS[i]) idx = i;
  }
  return idx + 1;
}
function nodoMercado(nodo) {
  var n = parseInt(nodo, 10);
  if (!isFinite(n) || n < 1) n = 1;
  if (n > MERCADO_NODOS.length) n = MERCADO_NODOS.length;
  return MERCADO_NODOS[n - 1];
}
// Gate por nivel de jugador: ademas de los puntos, el catalogo
// MERCADO_NODOS[].nivel_jugador impone un TECHO al nodo alcanzable. El
// nodo EFECTIVO es el MENOR entre el alcanzado por mercado_puntos y el
// alcanzado por el nivel de jugador (derivado de xp_total, NUNCA
// inventado). Asi un usuario con muchos puntos pero nivel bajo no salta
// el gate de produccion/impuesto.
function nodoMercadoPorNivel(nivelJugador) {
  var n = parseInt(nivelJugador, 10) || 1;
  var idx = 0;
  for (var i = 0; i < MERCADO_NODOS.length; i++) {
    if (n >= MERCADO_NODOS[i].nivel_jugador) idx = i;
  }
  return idx + 1;
}
function calcularMercadoEfectivo(puntos, nivelJugador) {
  var porPuntos = calcularMercado(puntos);
  var porNivel = nodoMercadoPorNivel(nivelJugador);
  return Math.min(porPuntos, porNivel);
}
// Impuesto efectivo = max(0, impuesto_base_pct - reduccion del nodo).
// Piso 0: el impuesto puede llegar a 0 (Casa delfin, base 0.00), segun la
// norma aprobada "Delfin 0%/5%". El piso es 0, no 0.01.
function impuestoEfectivoMercado(impuestoBasePct, nodo) {
  var pct = numXp(impuestoBasePct) - nodoMercado(nodo).reduccion_impuesto;
  return Math.max(0, red2(pct));
}
// Slots totales de una Casa = slots_base de mercado_config + slots_extra
// del nodo alcanzado.
function slotsMercado(slotsBase, nodo) {
  var base = parseInt(slotsBase, 10);
  if (!isFinite(base) || base < 0) base = 0;
  return base + nodoMercado(nodo).slots_extra;
}

// v28 (mercado): usuario de la sesion firmada. El body.usuario_id NUNCA se
// confia (leccion BUG-061). Devuelve {ok:true, usuario_id} o {ok:false, razon}.
function usuarioDeSesion(req) {
  var s = verificarSesion(req);
  if (!s.ok) return { ok: false, razon: s.razon };
  return { ok: true, usuario_id: String(s.sub) };
}

// v28 (mercado): 503 tipado con mensaje claro si falta el esquema de la 034.
function responderMercadoAusente(res, e, etiqueta) {
  console.warn('[mercado] ' + etiqueta + ' ausente (migracion 034 pendiente): '
    + (e && e.message));
  return res.status(503).json({
    ok: false,
    error: 'Mercado no disponible (migracion 034 pendiente)',
    code: 'SCHEMA_NOT_MIGRATED'
  });
}

// v28 (mercado): normas de una Casa. Devuelve la fila o null.
function cargarConfigMercado(sql, casa) {
  return sql(
    'SELECT casa, impuesto_base_pct, arancel_inter_casa_pct, slots_base,'
    + ' permite_cross_casa, permite_produccion, precio_min, precio_max,'
    + ' duracion_oferta_horas, activo FROM mercado_config WHERE casa=$1 LIMIT 1',
    [casa]
  ).then(function(rows) { return rows[0] || null; });
}

// v28 (mercado): fragmento SQL UNICO del merge JSONB del inventario
// (ADR-003). signo es '+' o '-' y lo fija el codigo, nunca el cliente.
function sqlMergeInventario(signo) {
  return 'capacidades = COALESCE(capacidades,\'{}\'::jsonb)'
    + ' || jsonb_build_object(\'consumibles\', COALESCE(capacidades->\'consumibles\',\'{}\'::jsonb)'
    + ' || jsonb_build_object($2::text, COALESCE((capacidades->\'consumibles\'->>$2::text)::int, 0) '
    + signo + ' $3::int))';
}

// v28 (mercado): descuenta unidades del inventario de forma atomica.
// Devuelve true solo si alcanzaba (el WHERE lo garantiza).
function descontarInventario(sql, usuarioId, clave, cantidad) {
  return sql(
    'UPDATE usuarios SET ' + sqlMergeInventario('-')
    + ' WHERE id=$1::uuid'
    + ' AND COALESCE((capacidades->\'consumibles\'->>$2::text)::int, 0) >= $3::int'
    + ' RETURNING id',
    [usuarioId, clave, cantidad]
  ).then(function(rows) { return rows.length > 0; });
}

// v28 (mercado): suma unidades al inventario (merge JSONB, ADR-003).
function acreditarInventario(sql, usuarioId, clave, cantidad) {
  return sql(
    'UPDATE usuarios SET ' + sqlMergeInventario('+')
    + ' WHERE id=$1::uuid',
    [usuarioId, clave, cantidad]
  );
}

// Mapeo art_* <-> vocacion: las 4 ramas de artista ESPEJAN
// usuarios.vocaciones (fuente unica, ADR-026). No se escribe ramas_activas
// para art_*.
var VOCACION_POR_RAMA_ART = {
  art_musica: 'musico', art_cine: 'cine',
  art_grafica: 'artista_grafico', art_literatura: 'escritor'
};

// Literal SQL de comilla simple con escape (ids de rama/nodo provienen de
// esta lista blanca o de JSON.stringify; ninguno lleva comilla simple).
function sqlLiteralArbol(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

// Nivel de nodo alcanzado (1..5): mayor i con P_R >= RAMA_TIERS[i].
function nivelNodoArbol(puntos) {
  var p = Number(puntos) || 0;
  var idx = 0;
  for (var i = 0; i < RAMA_TIERS.length; i++) {
    if (p >= RAMA_TIERS[i]) idx = i;
  }
  return idx + 1;
}

// Nodos alcanzados con P_R (array de objetos del catalogo).
function nodosDesbloqueadosArbol(rama, puntos) {
  var p = Number(puntos) || 0;
  return rama.nodos.filter(function(n) { return p >= n.puntos; });
}

// Bono pendiente del bono unico de +25: 25 solo si mis_perfil_completo
// esta completada y aun no se eligio rama (tolerante: mis_perfil_completo
// llega en WP-5, hoy da 0).
function bonoPendienteArbol(progresoMisiones, progresoArbol) {
  var pm = progresoMisiones || {};
  var pa = progresoArbol || {};
  var completo = pm.mis_perfil_completo;
  if (!completo || completo.estado !== 'completada') return 0;
  if (pa.rama_bono_elegida) return 0;
  return 25;
}

// Descuento de nodo 5 aplicable a una categoria de consumible (0 si
// ninguna rama con nodo 5 alcanzado descuenta esa categoria).
function descuentoArbolParaCategoria(ramas, categoria) {
  if (!categoria) return 0;
  var pct = 0;
  (ramas || []).forEach(function(r) {
    var ef = r.efecto;
    if (ef && ef.tipo === 'descuento' && ef.categoria === categoria) {
      var p = parseInt(ef.pct, 10) || 0;
      if (p > pct) pct = p;
    }
  });
  return pct;
}

// -- Origen derivado + bono x1.2 (WP-5, TSK-103 / ADR-028) ------------
// El Origen no se persiste como identidad: se recalcula por request desde
// usuarios.pais_base/ciudad_base y se compara, fila a fila, con la ciudad
// del destino. Se pasa al SQL como $2 (ciudad_base cruda, '' si NULL) y
// $3 (boolean extranjero) para que cada consulta decida el bono por FILA.
// La normalizacion replica TRANSLATE_CIUDAD de los logros (tildes ->
// vocal simple) para tolerar 'Bogota' y 'Bogot\u00e1' (ADR-012 / BUGS:63).
// ASCII-safe: la lista de tildes va como escapes \u00xx, nunca como bytes.
function sqlNormCiudad(expr) {
  return "LOWER(TRANSLATE(COALESCE(" + expr + ",''),'"
    + '\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc' + "','aeiouu'))";
}
// local = misma ciudad que el destino y no extranjero.
function sqlOrigenLocal(exprCiudad) {
  var nc = sqlNormCiudad(exprCiudad);
  var nb = sqlNormCiudad('$2');
  return "(NOT $3::boolean AND " + nb + " <> '' AND "
    + nc + " <> '' AND " + nc + " = " + nb + ")";
}
// nacional = no extranjero y ciudad distinta a la del destino (incluye
// pais_base NULL o ciudad_base NULL, siempre que el destino tenga ciudad).
function sqlOrigenNacional(exprCiudad) {
  var nc = sqlNormCiudad(exprCiudad);
  var nb = sqlNormCiudad('$2');
  return "(NOT $3::boolean AND " + nc + " <> '' AND ("
    + nb + " = '' OR " + nc + " <> " + nb + "))";
}
// Origen propio del usuario para ramas sin ciudad de destino: local =
// residente con ciudad_base declarada y no extranjero.
function sqlOrigenLocalPropio() {
  return "(NOT $3::boolean AND " + sqlNormCiudad('$2') + " <> '')";
}
// Multiplicador x1.2 con ROUND half-up a 2 decimales por fila/unidad
// (mismo criterio que la piramide de referidos, ADR-035). exprPuntos es
// un literal o una expresion SQL.
var BONO_ORIGEN = 1.2;
function sqlBonoFila(exprPuntos, cond) {
  return "CASE WHEN " + cond + " THEN ROUND((" + exprPuntos + ") * "
    + BONO_ORIGEN + ", 2) ELSE (" + exprPuntos + ") END";
}

// Calcula los puntos DERIVADOS (D_R) de las 16 ramas. NUNCA lee
// progreso_arbol. Cada consulta degrada a 0 en catch (tabla/columna
// ausente por migracion pendiente). Agrupa las agregaciones en pocas
// round-trips por dominio.
function calcularDerivadosArbol(sql, usuarioId, vocaciones) {
  var v = vocaciones || {};
  var out = {};
  RAMAS.forEach(function(r) { out[r.id] = 0; });
  function ent(x) { return red2(parseFloat(x) || 0); }

  // Contexto de Origen (WP-5, ADR-028): UNA sola lectura de
  // pais_base/ciudad_base; nunca se persiste y nunca menciona
  // progreso_arbol (invariante anti-doble-conteo). Degrada a
  // {ciudad:'', extranjero:false} si la migracion 017 no esta aplicada.
  return sql(
    'SELECT pais_base, ciudad_base FROM usuarios WHERE id=$1',
    [usuarioId]
  ).catch(function() { return []; }).then(function(rows) {
    var u = rows[0] || {};
    var orgPais = (u.pais_base == null) ? '' : String(u.pais_base);
    var org = {
      ciudad: (u.ciudad_base == null) ? '' : String(u.ciudad_base),
      extranjero: (orgPais !== '' && orgPais.toUpperCase() !== 'CO'),
    };
    return derivadosArbolConOrigen(sql, usuarioId, v, out, ent, org);
  });
}

// Cuerpo de D_R con el contexto de Origen ya resuelto. Solo lo llama
// calcularDerivadosArbol. $2 = ciudad_base cruda del usuario y $3 =
// boolean extranjero (ver sqlOrigenLocal/sqlOrigenNacional).
function derivadosArbolConOrigen(sql, usuarioId, v, out, ent, org) {
  var orgCiudad = org.ciudad;
  var orgExtranjero = org.extranjero;
  // Origen propio del usuario (ramas sin ciudad de destino): local =
  // residente con ciudad_base declarada y no extranjero.
  var localPropio = (!orgExtranjero && orgCiudad !== '');
  var pOrg = [usuarioId, orgCiudad, orgExtranjero];

  // Exploradores: rutas, ciudades y naturaleza (interacciones/destinos).
  var qExp = sql(
    "SELECT"
    + " COALESCE(ROUND(SUM(" + sqlBonoFila('i.xp_ganado', sqlOrigenNacional('d.ciudad'))
    + ") FILTER (WHERE i.tipo IN ('guardado','visita') AND i.activo=true), 2), 0) AS exp_rutas,"
    + " COALESCE(ROUND(SUM(i.xp_ganado) FILTER (WHERE i.tipo='visita' AND i.activo=true), 2), 0) AS natura_xp,"
    + " (SELECT COUNT(*)::int FROM interacciones i2 JOIN destinos d2 ON d2.id=i2.destino_id"
    + "   WHERE i2.usuario_id=$1 AND i2.tipo='visita' AND i2.activo=true"
    + "   AND (i2.dims->'geo'->>'zona'='rural' OR d2.tags->>'subcategoria' IN ('naturaleza','aventura','parque'))) AS natura_rural,"
    + " (SELECT COALESCE(ROUND(SUM(" + sqlBonoFila('40', sqlOrigenNacional('dc.ciudad')) + "), 2), 0) FROM ("
    + "   SELECT DISTINCT d3.ciudad FROM interacciones i3 JOIN destinos d3 ON d3.id=i3.destino_id"
    + "   WHERE i3.usuario_id=$1 AND i3.tipo='visita' AND i3.activo=true AND COALESCE(d3.ciudad,'') <> '') dc) AS exp_ciudades"
    + " FROM interacciones i LEFT JOIN destinos d ON d.id=i.destino_id WHERE i.usuario_id=$1",
    pOrg
  ).then(function(rows) {
    var q = rows[0] || {};
    out.exp_rutas = ent(q.exp_rutas);
    out.exp_ciudades = ent(q.exp_ciudades);
    out.exp_naturaleza = ent(q.natura_xp) + ent(q.natura_rural) * 20;
  }).catch(function(){});

  // Exploradores: Activo Oculto (migracion 016). Bono de Origen local
  // por PROPUESTA de la ciudad del usuario (ao.ciudad); los checkins de
  // presencia no llevan bono de origen (no son propuestas).
  // FIX O1 (WP-6): aprobados y pendientes exigen ao.activo=true, para no
  // contar propuestas soft-deleted al derivar exp_ocultos.
  var qOcultos = sql(
    "SELECT"
    + " (SELECT COALESCE(ROUND(SUM(" + sqlBonoFila('60', sqlOrigenLocal('ao.ciudad')) + "), 2), 0)"
    + "   FROM activos_ocultos ao WHERE ao.propuesto_por=$1 AND ao.activo=true"
    + "   AND (ao.votos_favor - ao.votos_contra) >= 3) AS aprobados,"
    + " (SELECT COALESCE(ROUND(SUM(" + sqlBonoFila('10', sqlOrigenLocal('ao2.ciudad')) + "), 2), 0)"
    + "   FROM activos_ocultos ao2 WHERE ao2.propuesto_por=$1 AND ao2.activo=true AND ao2.estado='pendiente'"
    + "   AND (ao2.votos_favor - ao2.votos_contra) < 3 AND (ao2.votos_favor - ao2.votos_contra) > -3) AS pendientes,"
    + " (SELECT COUNT(*)::int FROM activos_ocultos_checkins WHERE usuario_id=$1 AND activo=true) AS checkins",
    pOrg
  ).then(function(rows) {
    var q = rows[0] || {};
    out.exp_ocultos = ent(q.aprobados) + ent(q.pendientes) + ent(q.checkins) * 25;
  }).catch(function(){});

  // Curadores: critico (resenas/ratings + votos utiles). Bono de Origen
  // local O extranjero por FILA (xp + votos_utiles*10 de esa resena). Si
  // votos_utiles no existe (migracion 007 pendiente), reintenta solo con
  // el XP de la fila.
  var qCritico = sql(
    "SELECT COALESCE(ROUND(SUM(" + sqlBonoFila('i.xp_ganado + COALESCE(i.votos_utiles,0)*10',
      '(' + sqlOrigenLocal('d.ciudad') + ' OR $3::boolean)')
    + ") FILTER (WHERE i.tipo IN ('resena','rating')), 2), 0) AS xp"
    + " FROM interacciones i LEFT JOIN destinos d ON d.id=i.destino_id WHERE i.usuario_id=$1",
    pOrg
  ).then(function(rows) {
    var q = rows[0] || {};
    out.cur_critico = ent(q.xp);
  }).catch(function() {
    return sql(
      "SELECT COALESCE(ROUND(SUM(" + sqlBonoFila('i.xp_ganado',
        '(' + sqlOrigenLocal('d.ciudad') + ' OR $3::boolean)')
      + ") FILTER (WHERE i.tipo IN ('resena','rating')), 2), 0) AS xp"
      + " FROM interacciones i LEFT JOIN destinos d ON d.id=i.destino_id WHERE i.usuario_id=$1",
      pOrg
    ).then(function(rows) { out.cur_critico = ent((rows[0] || {}).xp); }).catch(function(){});
  });

  // Curadores: colecciones de cromos (migracion 010). Los cromos no
  // guardan ciudad: SIMPLIFICACION documentada -> bono local con el
  // origen PROPIO del usuario (no hay destino con el que comparar).
  var qColec = sql(
    "SELECT COALESCE(SUM(uc.cantidad),0)::int AS n_cromos,"
    + " COALESCE(SUM(uc.cantidad) FILTER (WHERE cc.rareza='dorado'),0)::int AS n_dorados"
    + " FROM usuarios_cromos uc JOIN cromos_catalogo cc ON cc.id = uc.cromo_id"
    + " WHERE uc.usuario_id=$1",
    [usuarioId]
  ).then(function(rows) {
    var q = rows[0] || {};
    var uCromo = localPropio ? red2(15 * BONO_ORIGEN) : 15;
    var uDorado = localPropio ? red2(50 * BONO_ORIGEN) : 50;
    out.cur_colecciones = ent(q.n_cromos) * uCromo + ent(q.n_dorados) * uDorado;
  }).catch(function(){});

  // Curadores: datos (votos de Activo Oculto 016, votos de resena 007,
  // comentarios de media 013). Bono de Origen local por UNIDAD: la ciudad
  // sale de la propuesta votada / del destino de la resena votada / del
  // album del comentario. Degrada completo si falta cualquiera.
  var qDatos = sql(
    "SELECT"
    + " (SELECT COALESCE(ROUND(SUM(" + sqlBonoFila('8', sqlOrigenLocal('ao.ciudad')) + "), 2), 0)"
    + "   FROM activos_ocultos_votos av JOIN activos_ocultos ao ON ao.id=av.activo_id"
    + "   WHERE av.usuario_id=$1) AS n_votos_activo,"
    + " (SELECT COALESCE(ROUND(SUM(" + sqlBonoFila('5', sqlOrigenLocal('d.ciudad')) + "), 2), 0)"
    + "   FROM resena_votos rv JOIN interacciones i ON i.id=rv.resena_id"
    + "   LEFT JOIN destinos d ON d.id=i.destino_id"
    + "   WHERE rv.usuario_id=$1) AS n_review_voto,"
    + " (SELECT COALESCE(ROUND(SUM(" + sqlBonoFila('5', sqlOrigenLocal('alb.ciudad')) + "), 2), 0)"
    + "   FROM media_comentarios mc JOIN album_fotos af ON af.id::text=mc.item_id"
    + "   JOIN albumes alb ON alb.id=af.album_id"
    + "   WHERE mc.usuario_id=$1 AND mc.activo=true AND mc.fuente='album_foto') AS n_comentarios",
    pOrg
  ).then(function(rows) {
    var q = rows[0] || {};
    out.cur_datos = ent(q.n_votos_activo) + ent(q.n_review_voto) + ent(q.n_comentarios);
  }).catch(function(){});

  // Curadores: guia (mapas 006 + planes unidos 008). Bono de Origen local
  // por UNIDAD: los destinos mapeados traen su ciudad; los mapas y planes
  // no tienen ciudad -> origen PROPIO del usuario (simplificacion
  // documentada). $3 no se usa en las dos primeras subconsultas, pero
  // sqlOrigenLocalPropio lo referencia, asi que pOrg se mantiene.
  var qGuia = sql(
    "SELECT"
    + " (SELECT COALESCE(ROUND(SUM(" + sqlBonoFila('40', sqlOrigenLocalPropio()) + "), 2), 0)"
    + "   FROM mapas WHERE usuario_id=$1 AND publico=true) AS n_mapas_publicos,"
    + " (SELECT COALESCE(ROUND(SUM(" + sqlBonoFila('5', sqlOrigenLocal('d.ciudad')) + "), 2), 0) FROM mapa_destinos md"
    + "   JOIN mapas m ON m.id=md.mapa_id LEFT JOIN destinos d ON d.id=md.destino_id"
    + "   WHERE m.usuario_id=$1) AS n_mapa_destinos,"
    + " (SELECT COALESCE(ROUND(SUM(" + sqlBonoFila('15', sqlOrigenLocalPropio()) + "), 2), 0)"
    + "   FROM planes_miembros WHERE usuario_id=$1) AS n_planes",
    pOrg
  ).then(function(rows) {
    var q = rows[0] || {};
    out.cur_guia = ent(q.n_mapas_publicos) + ent(q.n_mapa_destinos) + ent(q.n_planes);
  }).catch(function(){});

  // Creadores: planes (creados activos + miembros sumados).
  var qPlanes = sql(
    "SELECT"
    + " (SELECT COUNT(*)::int FROM planes_viaje WHERE creador_id=$1 AND activo=true) AS n_planes,"
    + " (SELECT COUNT(*)::int FROM planes_miembros pm JOIN planes_viaje p ON p.id=pm.plan_id"
    + "   WHERE p.creador_id=$1 AND p.activo=true) AS n_miembros",
    [usuarioId]
  ).then(function(rows) {
    var q = rows[0] || {};
    out.cre_planes = ent(q.n_planes) * 25 + ent(q.n_miembros) * 10;
  }).catch(function(){});

  // Creadores: parche (fundacion, miembros activos, retos completados).
  var qParche = sql(
    "SELECT"
    + " (SELECT COUNT(*)::int FROM pandillas WHERE fundador_id=$1 AND activo=true) AS n_fundadas,"
    + " (SELECT COUNT(*)::int FROM pandillas_miembros pm2 WHERE pm2.activo=true AND pm2.pandilla_id IN"
    + "   (SELECT pandilla_id FROM pandillas_miembros WHERE usuario_id=$1 AND activo=true)) AS n_miembros,"
    + " (SELECT COUNT(*)::int FROM pandilla_retos pr JOIN pandillas_miembros pm3 ON pm3.pandilla_id=pr.pandilla_id"
    + "   WHERE pm3.usuario_id=$1 AND pm3.activo=true AND pr.completado=true) AS n_retos",
    [usuarioId]
  ).then(function(rows) {
    var q = rows[0] || {};
    out.cre_parche = (ent(q.n_fundadas) > 0 ? 100 : 0) + ent(q.n_miembros) * 15 + ent(q.n_retos) * 30;
  }).catch(function(){});

  // Creadores: eventos (acciones sobre destinos de categoria evento).
  var qEventos = sql(
    "SELECT COALESCE(ROUND(SUM(i.xp_ganado), 2), 0) AS xp FROM interacciones i"
    + " JOIN destinos d ON d.id=i.destino_id"
    + " WHERE i.usuario_id=$1 AND d.categoria_slug='evento'",
    [usuarioId]
  ).then(function(rows) {
    out.cre_eventos = ent((rows[0] || {}).xp);
  }).catch(function(){});

  // Creadores: embajador (referidos directos + red de niveles 2 a 5).
  var qEmbajador = sql(
    "WITH RECURSIVE red AS ("
    + "SELECT u.id, 1 AS nivel FROM usuarios u WHERE u.referido_por=$1"
    + " UNION ALL"
    + " SELECT u2.id, red.nivel + 1 FROM usuarios u2 JOIN red ON u2.referido_por = red.id WHERE red.nivel < 5"
    + ") SELECT"
    + " (SELECT COUNT(*)::int FROM usuarios WHERE referido_por=$1) AS directos,"
    + " (SELECT COUNT(*)::int FROM red WHERE nivel > 1) AS red2_5",
    [usuarioId]
  ).then(function(rows) {
    var q = rows[0] || {};
    out.cre_embajador = ent(q.directos) * 40 + ent(q.red2_5) * 10;
  }).catch(function(){});

  // Artistas: vocaciones (fuente unica) + media/votos/resenas (009/013).
  var qArt = sql(
    "SELECT"
    + " (SELECT COUNT(*)::int FROM album_fotos WHERE agregador_id=$1 AND foto_type='audio' AND activo=true) AS n_audio,"
    + " (SELECT COUNT(*)::int FROM album_fotos WHERE agregador_id=$1 AND foto_type='video' AND activo=true) AS n_video,"
    + " (SELECT COUNT(*)::int FROM media_votos mv JOIN album_fotos af ON af.id::text=mv.item_id"
    + "   WHERE mv.fuente='album_foto' AND mv.activo=true AND af.autor_original_id=$1) AS n_votos,"
    + " (SELECT COUNT(*)::int FROM interacciones WHERE usuario_id=$1 AND tipo='resena'"
    + "   AND LENGTH(COALESCE(texto,'')) > 500) AS n_largas",
    [usuarioId]
  ).then(function(rows) {
    var q = rows[0] || {};
    out.art_musica = (v.musico ? 50 : 0) + ent(q.n_audio) * 15;
    out.art_cine = (v.cine ? 50 : 0) + ent(q.n_video) * 15;
    out.art_grafica = (v.artista_grafico ? 50 : 0) + ent(q.n_votos) * 10;
    // Bono de Origen extranjero por resena larga (art_literatura). La
    // vocacion escritor*50 es un desbloqueo, no una fila de accion: solo
    // se bonifica la contribucion de las resenas largas. SIMPLIFICACION:
    // art_literatura no tiene destino, se usa el origen propio del usuario.
    out.art_literatura = (v.escritor ? 50 : 0)
      + ent(q.n_largas) * (orgExtranjero ? red2(15 * BONO_ORIGEN) : 15);
  }).catch(function(){});

  return Promise.all([qExp, qOcultos, qCritico, qColec, qDatos, qGuia,
    qPlanes, qParche, qEventos, qEmbajador, qArt]).then(function() { return out; });
}

// Lee el estado COMPLETO del arbol de un usuario (faccion, vocaciones,
// ramas activas y las 16 ramas con bono + derivado + nivel + nodos).
// Funcion UNICA compartida por GET arbol_usuario y por museo_publico
// (Regla de No-Duplicidad). Nunca lee puntos de progreso_arbol: solo los
// 'bonos' persistidos y el recalculo D_R.
function calcularArbolUsuario(sql, usuarioId) {
  var base = {
    usuarioId: String(usuarioId || ''),
    faccion: null, vocaciones: {}, ramasActivas: {}, progresoArbol: {},
    rama_bono_elegida: null, bono_pendiente: 0, ramas: [],
  };
  if (!base.usuarioId) return Promise.resolve(base);
  return sql(
    'SELECT faccion, vocaciones, progreso_arbol, progreso_misiones'
    + ' FROM usuarios WHERE id=$1 LIMIT 1',
    [base.usuarioId]
  ).catch(function(){ return []; }).then(function(rows) {
    if (!rows.length) return base;
    var u = rows[0];
    base.faccion = u.faccion || null;
    base.vocaciones = u.vocaciones || {};
    base.progresoArbol = u.progreso_arbol || {};
    base.ramasActivas = base.progresoArbol.ramas_activas || {};
    base.rama_bono_elegida = base.progresoArbol.rama_bono_elegida || null;
    base.bono_pendiente = bonoPendienteArbol(u.progreso_misiones || {}, base.progresoArbol);
    return calcularDerivadosArbol(sql, base.usuarioId, base.vocaciones)
      .then(function(deriv) {
        var bonos = base.progresoArbol.bonos || {};
        base.ramas = RAMAS.map(function(r) {
          var bono = red2(numXp(bonos[r.id]));
          var derivado = red2(numXp(deriv[r.id]));
          var puntos = red2(bono + derivado);
          var nivel = nivelNodoArbol(puntos);
          var vocKey = VOCACION_POR_RAMA_ART[r.id];
          var activa = vocKey
            ? !!base.vocaciones[vocKey]
            : base.ramasActivas[r.id] === true;
          return {
            id: r.id, faccion: r.faccion, nombre: r.nombre, emoji: r.emoji,
            desc: r.desc, fuente: r.fuente,
            puntos: puntos, bono: bono, derivado: derivado,
            nivel_nodo: nivel, nodos_desbloqueados: nodosDesbloqueadosArbol(r, puntos),
            efecto: nivel >= RAMA_TIERS.length ? r.nodos[r.nodos.length - 1].efecto : null,
            activa: activa,
          };
        });
        return base;
      });
  });
}

// Persiste write-once la fecha ISO de cada nodo alcanzado en
// progreso_arbol.ramas.<rama>.nodos.<nodo> (merge ANIDADO, nunca
// reemplaza el objeto ramas ni los nodos ya fechados). Solo se invoca
// para el dueno con sesion firmada; si falla, degrada a false.
function persistirNodosArbol(sql, usuarioId, progresoArbol, ramas) {
  var pa = progresoArbol || {};
  var ramasPa = pa.ramas || {};
  var hoy = new Date().toISOString();
  var parches = {};
  (ramas || []).forEach(function(r) {
    var ya = (ramasPa[r.id] && ramasPa[r.id].nodos) || {};
    var nuevos = {};
    (r.nodos_desbloqueados || []).forEach(function(n) {
      if (!ya[n.id]) nuevos[n.id] = hoy;
    });
    if (Object.keys(nuevos).length) parches[r.id] = nuevos;
  });
  var ids = Object.keys(parches);
  if (!ids.length) return Promise.resolve(false);
  var sqlRamas = '';
  ids.forEach(function(rid) {
    var lit = sqlLiteralArbol(rid);
    sqlRamas += ' || jsonb_build_object(' + lit
      + ", COALESCE(progreso_arbol->'ramas'->" + lit + ",'{}'::jsonb)"
      + " || jsonb_build_object('nodos', COALESCE(progreso_arbol->'ramas'->" + lit
      + "->'nodos','{}'::jsonb) || " + sqlLiteralArbol(JSON.stringify(parches[rid])) + "::jsonb))";
  });
  return sql(
    "UPDATE usuarios SET progreso_arbol = COALESCE(progreso_arbol,'{}'::jsonb)"
    + " || jsonb_build_object('ramas', COALESCE(progreso_arbol->'ramas','{}'::jsonb)" + sqlRamas + ')'
    + ' WHERE id=$1',
    [usuarioId]
  ).then(function() { return true; }).catch(function() { return false; });
}

// -- Catalogo de misiones (Fase 3) ---------------------------------
// requiere: ids de misiones que deben estar 'completada' antes de que
// esta se evalue siquiera (evita gastar consultas de mas). check()
// recibe el contexto ya cargado (ctx) y devuelve una Promise<boolean>.
var CIUDAD_META    = 'Bogota';
var TAG_COWORKING  = 'coworking'; // enum cerrado v1: unico valor soportado hoy;
                                   // pendiente extenderlo cuando el admin
                                   // deje de aceptar texto libre en tags

// Chequeo reutilizable de las misiones de perfil (WP-5): recibe una
// EXPRESION SQL de LISTA BLANCA escrita en el propio catalogo (nunca
// texto del cliente) y devuelve Promise<boolean>. Degrada a false si la
// columna no existe todavia (migracion 017 pendiente), igual que el
// resto de checks del catalogo.
function misionPerfilFlag(ctx, expr) {
  return ctx.sql(
    'SELECT (' + expr + ') AS ok FROM usuarios WHERE id=$1',
    [ctx.usuarioId]
  ).then(function(r) { return !!(r[0] && r[0].ok === true); })
   .catch(function(){ return false; });
}

var MISIONES = [
  {
    id: 'mis_primer_guardado', grupo: 'general', requiere: [],
    nombre: 'Primer lugar guardado', xp: 15,
    rama: 'exp_rutas', puntos_rama: 20,
    check: function(ctx) { return Promise.resolve(ctx.totalGuardados >= 1); },
  },
  {
    id: 'mis_primera_resena', grupo: 'general', requiere: [],
    nombre: 'Primera rese\u00f1a sustancial', xp: 20,
    check: function(ctx) {
      return ctx.sql(
        'SELECT id FROM interacciones WHERE usuario_id=$1 AND tipo=\'resena\' AND xp_ganado>=25 LIMIT 1',
        [ctx.usuarioId]
      ).then(function(r){ return r.length > 0; });
    },
  },
  {
    id: 'mis_primera_visita', grupo: 'general', requiere: [],
    nombre: 'Primera visita confirmada', xp: 15,
    rama: 'exp_rutas', puntos_rama: 25,
    check: function(ctx) { return ctx.visitasActivas.then(function(n){ return n >= 1; }); },
  },
  {
    id: 'mis_explorador_bogota', grupo: 'ciudad', requiere: ['mis_primer_guardado'],
    nombre: 'Explorador de Bogota', xp: 40,
    rama: 'exp_ciudades', puntos_rama: 30,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'guardado\' AND i.activo=true AND d.ciudad=$2',
        [ctx.usuarioId, CIUDAD_META]
      ).then(function(r){ return !!(r[0] && r[0].n >= 5); });
    },
  },
  {
    // Requiere amplitud (guardar + resenar), no solo volumen -- ver nota
    // de entrega sobre la curva de dificultad Explorador -> Organizador.
    id: 'mis_organizador_bogota', grupo: 'ciudad',
    requiere: ['mis_explorador_bogota', 'mis_primera_resena'],
    nombre: 'Organizador de Bogota', xp: 100, desbloquea: 'organizar_actividad',
    check: function(ctx) {
      if (ctx.xpTotal < 300) return Promise.resolve(false);
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'guardado\' AND i.activo=true AND d.ciudad=$2',
        [ctx.usuarioId, CIUDAD_META]
      ).then(function(r){ return !!(r[0] && r[0].n >= 8); });
    },
  },
  {
    id: 'mis_nomada_digital', grupo: 'categoria', requiere: ['mis_primer_guardado'],
    nombre: 'N\u00f3mada digital', xp: 30,
    rama: 'exp_rutas', puntos_rama: 20,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'guardado\' AND i.activo=true'
        + '   AND d.categoria_slug=\'hostal\''
        + '   AND (d.tags->\'actividades\' ? $2 OR d.tags->\'que_incluye\' ? $2)',
        [ctx.usuarioId, TAG_COWORKING]
      ).then(function(r){ return !!(r[0] && r[0].n >= 3); });
    },
  },
  {
    // Milestones v2 (ADR-014): Own the Spot estilo SKATE. Convierte una
    // resena en Bogota en la mas votada de su spot (votos_utiles maximo
    // del destino). Recompensa +75 XP (prompt gsming) y deriva el badge
    // "Gobernador de Monserrate" (ver LOGROS logr_spot_domado).
    id: 'mis_own_spot_bogota', grupo: 'ciudad',
    requiere: ['mis_organizador_bogota', 'mis_primera_resena'],
    nombre: 'Dueno del Spot en Bogota', xp: 75,
    rama: 'cur_critico', puntos_rama: 50,
    check: function(ctx) {
      return esLiderDeCiudad(ctx.sql, ctx.usuarioId, 'Bogota');
    },
  },
  {
    // Milestones v2 (ADR-014): Gran Arquitecto estilo Albion. Disena un
    // mapa tematico publico con al menos 5 destinos (spec mapas 2026-09-05).
    id: 'mis_gran_arquitecto', grupo: 'general', requiere: [],
    nombre: 'Gran Arquitecto', xp: 50,
    rama: 'cur_guia', puntos_rama: 50,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM ('
        + '  SELECT m.id FROM mapas m'
        + '  JOIN mapa_destinos md ON md.mapa_id = m.id'
        + '  WHERE m.usuario_id = $1 AND m.publico = true'
        + '  GROUP BY m.id HAVING COUNT(md.destino_id) >= 5'
        + ') t',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    // Milestones v2 (ADR-014): itinerario perfeccion (condicion pragm
    // aprobada por Javier): visitas confirmadas a 4+ destinos cuya ficha
    // incluya itinerario[] en tags (categoria sitio/naturaleza).
    id: 'mis_itinerario_perfeccion', grupo: 'categoria', requiere: ['mis_primera_visita'],
    nombre: 'Itinerario en perfecto orden', xp: 60,
    rama: 'exp_naturaleza', puntos_rama: 40,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(DISTINCT i.destino_id)::int AS n FROM interacciones i'
        + ' JOIN destinos d ON d.id = i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'visita\' AND i.activo=true'
        + '   AND d.tags ? \'itinerario\'',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 4); });
    },
  },
  // -- Desbloqueos de capacidades (ADR: gamificacion progresiva) -------
  // Misiones de nivel que abren funcionalidades de UI:
  //   subir_fotos     -> Nivel 2 (100 XP) + primera resena
  //   chat            -> Nivel 3 (250 XP)
  //   moderador_chat  -> Nivel 4 (450 XP)
  //   crear_chat      -> Nivel 5 (700 XP)
  // usuarios.js las traduce a usuario.capacidades via DESBLOQUEOS.
  {
    id: 'mis_fotografo', grupo: 'general', requiere: ['mis_primera_resena'],
    nombre: 'Fot\u00f3grafo de publicaciones', xp: 20, desbloquea: 'subir_fotos',
    check: function(ctx) {
      return Promise.resolve(ctx.xpTotal >= 100);
    },
  },
  {
    // T4.5 / ENMIENDA 1 ADR-039 (v22): primera pieza de VIDEO del Museo
    // (album_fotos.foto_type='video'). Sin DDL: progreso_misiones es jsonb.
    id: 'mis_videografo', grupo: 'fotos', requiere: [],
    nombre: 'Cronicas en Movimiento', xp: 15,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_fotos af'
        + ' JOIN albumes a ON a.id = af.album_id'
        + ' WHERE a.usuario_id=$1 AND af.foto_type=\'video\' AND af.activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    // T4.5 / ENMIENDA 1 ADR-039 (v22): primera pieza de AUDIO del Museo
    // (album_fotos.foto_type='audio'). Sin DDL.
    id: 'mis_sonidista', grupo: 'fotos', requiere: [],
    nombre: 'Ecos y Relatos', xp: 15,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_fotos af'
        + ' JOIN albumes a ON a.id = af.album_id'
        + ' WHERE a.usuario_id=$1 AND af.foto_type=\'audio\' AND af.activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    id: 'mis_chat_mensajero', grupo: 'general', requiere: ['mis_primera_resena'],
    nombre: 'Primer mensaje en la comunidad', xp: 25, desbloquea: 'chat',
    check: function(ctx) {
      return Promise.resolve(ctx.xpTotal >= 250);
    },
  },
  {
    id: 'mis_chat_moderador', grupo: 'general', requiere: ['mis_chat_mensajero'],
    nombre: 'Moderador de chat', xp: 30, desbloquea: 'moderador_chat',
    check: function(ctx) {
      return Promise.resolve(ctx.xpTotal >= 450);
    },
  },
  {
    id: 'mis_chat_creador', grupo: 'general', requiere: ['mis_chat_moderador'],
    nombre: 'Creador de salas', xp: 40, desbloquea: 'crear_chat',
    check: function(ctx) {
      return Promise.resolve(ctx.xpTotal >= 700);
    },
  },
  // -- Comunidad social real (espec 2026-09-08) ---------------------
  // Misiones accionables del chat y los planes. Sus check() consultan
  // las tablas de la migracion 008 (chat_mensajes, planes_viaje,
  // planes_miembros); si la migracion no ha corrido, la consulta falla
  // y el catch degrada a false sin romper la accion principal.
  {
    id: 'mis_chat_activo', grupo: 'general', requiere: ['mis_chat_mensajero'],
    nombre: 'Conversador activo', xp: 20,
    rama: 'cur_datos', puntos_rama: 20,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM chat_mensajes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 10); })
       .catch(function(){ return false; });
    },
  },
  {
    id: 'mis_plan_creador', grupo: 'general', requiere: ['mis_chat_mensajero'],
    nombre: 'Creador de planes', xp: 10,
    rama: 'cre_planes', puntos_rama: 25,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM planes_viaje WHERE creador_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); })
       .catch(function(){ return false; });
    },
  },
  {
    id: 'mis_plan_unido', grupo: 'general', requiere: [],
    nombre: 'Viajero en grupo', xp: 10,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM planes_miembros WHERE usuario_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); })
       .catch(function(){ return false; });
    },
  },
  // --- Misiones de Albums/Fotos (ADR-017) ---
  {
    id: 'mis_primera_foto_social',
    grupo: 'fotos',
    requiere: [],
    nombre: 'Primera foto social',
    xp: 15,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_fotos WHERE agregador_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    id: 'mis_creador_album',
    grupo: 'fotos',
    requiere: ['mis_primera_foto_social'],
    nombre: 'Creador de albumes',
    xp: 20,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM albumes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    id: 'mis_album_curador',
    grupo: 'fotos',
    requiere: ['mis_creador_album'],
    nombre: 'Curador de albumes',
    xp: 40,
    rama: 'cur_colecciones', puntos_rama: 40,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM albumes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 5); });
    },
  },
  {
    id: 'mis_fotografo_social',
    grupo: 'fotos',
    requiere: ['mis_primera_foto_social'],
    nombre: 'Fotografo social',
    xp: 30,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_fotos WHERE agregador_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 10); });
    },
  },
  {
    id: 'mis_cazador_recompensas',
    grupo: 'fotos',
    requiere: ['mis_fotografo_social'],
    nombre: 'Cazador de recompensas',
    xp: 25,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM media_votos WHERE usuario_id=$1 AND fuente=\'album_foto\' AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 20); })
       .catch(function(){ return false; });
    },
  },
  {
    id: 'mis_favorito_del_pueblo',
    grupo: 'fotos',
    requiere: ['mis_fotografo_social'],
    nombre: 'Favorito del pueblo',
    xp: 50,
    rama: 'art_grafica', puntos_rama: 50,
    gate_nivel: 2,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM media_votos mv '
        + 'JOIN album_fotos af ON af.id::text = mv.item_id '
        + 'WHERE mv.fuente=\'album_foto\' AND mv.activo=true AND af.autor_original_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 10); })
       .catch(function(){ return false; });
    },
  },
  // -- Vocaciones artisticas (Entrega 016 / ADR-026): el bloque de nivel
  // 5 abre 4 caminos acumulables (musico/cine/arte/escritor). El ctx de
  // evaluarMisiones no trae vocaciones, asi que cada check lee
  // usuarios.vocaciones (jsonb de claves activadas por vocacion_activar).
  {
    id: 'mis_primera_vocacion_artista', grupo: 'artista', requiere: [],
    nombre: 'Primera vocacion artistica', xp: 25,
    check: function(ctx) {
      return ctx.sql('SELECT vocaciones FROM usuarios WHERE id=$1', [ctx.usuarioId])
        .then(function(r) {
          var v = (r[0] && r[0].vocaciones) || {};
          return !!(v.musico || v.cine || v.artista_grafico || v.escritor);
        })
        .catch(function(){ return false; });
    },
  },
  {
    id: 'mis_camino_musica', grupo: 'artista', requiere: ['mis_primera_vocacion_artista'],
    nombre: 'Camino de la musica', xp: 40,
    rama: 'art_musica', puntos_rama: 40,
    check: function(ctx) {
      return ctx.sql('SELECT vocaciones FROM usuarios WHERE id=$1', [ctx.usuarioId])
        .then(function(r) { return !!((r[0] && r[0].vocaciones) || {}).musico; })
        .catch(function(){ return false; });
    },
  },
  {
    id: 'mis_camino_cine', grupo: 'artista', requiere: ['mis_primera_vocacion_artista'],
    nombre: 'Camino del cine', xp: 40,
    rama: 'art_cine', puntos_rama: 40,
    check: function(ctx) {
      return ctx.sql('SELECT vocaciones FROM usuarios WHERE id=$1', [ctx.usuarioId])
        .then(function(r) { return !!((r[0] && r[0].vocaciones) || {}).cine; })
        .catch(function(){ return false; });
    },
  },
  {
    id: 'mis_camino_arte', grupo: 'artista', requiere: ['mis_primera_vocacion_artista'],
    nombre: 'Camino del arte', xp: 40,
    rama: 'art_grafica', puntos_rama: 40,
    check: function(ctx) {
      return ctx.sql('SELECT vocaciones FROM usuarios WHERE id=$1', [ctx.usuarioId])
        .then(function(r) { return !!((r[0] && r[0].vocaciones) || {}).artista_grafico; })
        .catch(function(){ return false; });
    },
  },
  {
    id: 'mis_camino_escritor', grupo: 'artista', requiere: ['mis_primera_vocacion_artista'],
    nombre: 'Camino del escritor', xp: 40,
    rama: 'art_literatura', puntos_rama: 40,
    check: function(ctx) {
      return ctx.sql('SELECT vocaciones FROM usuarios WHERE id=$1', [ctx.usuarioId])
        .then(function(r) { return !!((r[0] && r[0].vocaciones) || {}).escritor; })
        .catch(function(){ return false; });
    },
  },
  {
    id: 'mis_poliglota_artista', grupo: 'artista', requiere: ['mis_primera_vocacion_artista'],
    nombre: 'Poliglota del arte', xp: 60,
    check: function(ctx) {
      return ctx.sql('SELECT vocaciones FROM usuarios WHERE id=$1', [ctx.usuarioId])
        .then(function(r) {
          var v = (r[0] && r[0].vocaciones) || {};
          var n = 0;
          if (v.musico) n++;
          if (v.cine) n++;
          if (v.artista_grafico) n++;
          if (v.escritor) n++;
          return n >= 2;
        })
        .catch(function(){ return false; });
    },
  },
  // -- Misiones de perfil (WP-5, TSK-103 / ADR-028) --------------------
  // Onboarding del perfil completo, sin 'requiere' entre ellas salvo la
  // ultima (que se resuelve por el DAG). Alimentan la barra de
  // completitud de mi-perfil.html. Los checks consultan usuarios.* porque
  // el ctx de evaluarMisiones no trae estos campos.
  {
    id: 'mis_perfil_foto', grupo: 'perfil', requiere: [],
    nombre: 'Ponle cara al viajero', xp: 10,
    check: function(ctx) {
      return misionPerfilFlag(ctx, "COALESCE(foto_url,'') <> '' OR COALESCE(avatar_url,'') <> ''");
    },
  },
  {
    id: 'mis_perfil_bio', grupo: 'perfil', requiere: [],
    nombre: 'Cuenta tu historia', xp: 15,
    check: function(ctx) {
      return misionPerfilFlag(ctx, "LENGTH(COALESCE(bio,'')) >= 40");
    },
  },
  {
    id: 'mis_perfil_ciudad', grupo: 'perfil', requiere: [],
    nombre: 'Tu punto de partida', xp: 10,
    check: function(ctx) {
      return misionPerfilFlag(ctx, "ciudad_base IS NOT NULL AND pais_base IS NOT NULL");
    },
  },
  {
    id: 'mis_perfil_intereses', grupo: 'perfil', requiere: [],
    nombre: 'Que te mueve', xp: 15,
    check: function(ctx) {
      return misionPerfilFlag(ctx, "jsonb_array_length(COALESCE(intereses,'[]'::jsonb)) >= 3");
    },
  },
  {
    id: 'mis_perfil_email', grupo: 'perfil', requiere: [],
    nombre: 'Viajero verificado', xp: 30,
    check: function(ctx) {
      return misionPerfilFlag(ctx, "email_verificado = true");
    },
  },
  {
    id: 'mis_perfil_casa', grupo: 'perfil', requiere: [],
    nombre: 'Jura tu Casa', xp: 20,
    check: function(ctx) {
      return misionPerfilFlag(ctx, "casa IS NOT NULL");
    },
  },
  {
    id: 'mis_perfil_faccion', grupo: 'perfil', requiere: [],
    nombre: 'Elige tu oficio', xp: 20,
    check: function(ctx) {
      return misionPerfilFlag(ctx, "faccion IS NOT NULL");
    },
  },
  {
    // Cierra el DAG: si las 7 anteriores estan completadas, se completa.
    id: 'mis_perfil_completo', grupo: 'perfil',
    requiere: ['mis_perfil_foto', 'mis_perfil_bio', 'mis_perfil_ciudad',
               'mis_perfil_intereses', 'mis_perfil_email', 'mis_perfil_casa',
               'mis_perfil_faccion'],
    nombre: 'Pasaporte sellado', xp: 30,
    check: function(ctx) { return Promise.resolve(true); },
  },
  // -- Compartir media (ADR-036 B, v19) --------------------------------
  // Pagan XP las comparticiones reales registradas en media_compartidos
  // (migracion 022). Los checks degradan a false si la tabla no existe.
  {
    id: 'mis_primer_compartido', grupo: 'general', requiere: [],
    nombre: 'Primer compartido', xp: 15,
    rama: 'exp_rutas', puntos_rama: 20,
    check: function(ctx) {
      return contarCompartidosUsuario(ctx.sql, ctx.usuarioId).then(function(n){ return n >= 1; });
    },
  },
  {
    id: 'mis_voz_comunidad', grupo: 'general', requiere: ['mis_primer_compartido'],
    nombre: 'Voz de la comunidad', xp: 40,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(DISTINCT (fuente || \':\' || item_id))::int AS n FROM media_compartidos WHERE usuario_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 10); })
       .catch(function(){ return false; });
    },
  },
  {
    id: 'mis_embajador_destinos', grupo: 'general', requiere: ['mis_voz_comunidad'],
    nombre: 'Embajador de destinos', xp: 75,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(DISTINCT destino_id)::int AS n FROM media_compartidos WHERE usuario_id=$1 AND destino_id IS NOT NULL',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 10); })
       .catch(function(){ return false; });
    },
  },
];

// -- Catalogo de logros (v5, estilo consola + Upland) ---------------
// Mismo patron que MISIONES: codigo estatico, DAG via 'requiere',
// check() server-side. Anade tier (bronce/plata/oro/platino) para el
// UI y xp de recompensa. La rareza % se calcula en el GET tipo=logros
// a partir de cuantos usuarios activos desbloquearon cada logro.
//
// Normalizacion de nombres de ciudad: en Neon conviven 'Bogota' y
// 'Bogot\u00e1' segun el seed, asi que toda comparacion de ciudad usa
// TRANSLATE para ignorar tildes y LOWER para ignorar mayusculas.
var TRANSLATE_CIUDAD = "TRANSLATE(COALESCE(d.ciudad,''),'\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc','aeiouu')";
var CIUDAD_NORM      = "LOWER(" + TRANSLATE_CIUDAD + ")";

// Coleccion por ciudad (estilo Upland: juntar "propiedades" de una
// ciudad en Tu Mapa). Umbrales por ciudad con los nombres canonizados
// que existen en los seeds publicados.
var CIUDADES_COLECCION = [
  { ciudad: 'Bogota',      n: 12, id: 'logr_alcalde_bogota',        nombre: 'Alcalde de Bogota',             emoji: '\uD83C\uDFDB', tier: 'platino', xp: 100,
    desc: 'Guarda 12 destinos de Bogota en Tu Mapa' },
  { ciudad: 'Cartagena',   n: 8,  id: 'logr_conquistador_cartagena', nombre: 'Conquistador de Cartagena',      emoji: '\u2693',       tier: 'oro',     xp: 75,
    desc: 'Guarda 8 destinos de Cartagena en Tu Mapa' },
  { ciudad: 'Medellin',    n: 8,  id: 'logr_conquistador_medellin',  nombre: 'Conquistador de Medellin',       emoji: '\uD83C\uDFD4', tier: 'oro',     xp: 75,
    desc: 'Guarda 8 destinos de Medellin en Tu Mapa' },
  { ciudad: 'Santa Marta', n: 6,  id: 'logr_senor_santa_marta',      nombre: 'Se\u00f1or de Santa Marta',      emoji: '\uD83C\uDF34', tier: 'plata',   xp: 40,
    desc: 'Guarda 6 destinos de Santa Marta en Tu Mapa' },
  { ciudad: 'Cali',        n: 6,  id: 'logr_cali_es_colombia',       nombre: 'Cali es Colombia',               emoji: '\uD83D\uDC83', tier: 'plata',   xp: 40,
    desc: 'Guarda 6 destinos de Cali en Tu Mapa' },
];

// Logros generales (voto rapido, blogs y conteos de progreso).
var LOGROS = [
  {
    id: 'logr_primer_voto', grupo: 'general', requiere: [],
    nombre: 'Primera calificaci\u00f3n',
    desc: 'Califica por primera vez un lugar con el voto r\u00e1pido de 1 a 5 estrellas',
    emoji: '\u2B50', tier: 'bronce', xp: 10,
    check: function(ctx) { return ctx.totalVotos().then(function(n){ return n >= 1; }); },
  },
  {
    id: 'logr_critico_10', grupo: 'general', requiere: ['logr_primer_voto'],
    nombre: 'Cr\u00edtico', desc: 'Acumula 10 calificaciones en total',
    emoji: '\uD83C\uDFAF', tier: 'plata', xp: 25,
    check: function(ctx) { return ctx.totalVotos().then(function(n){ return n >= 10; }); },
  },
  {
    id: 'logr_critico_25', grupo: 'general', requiere: ['logr_critico_10'],
    nombre: 'Cr\u00edtico experto', desc: 'Acumula 25 calificaciones en total',
    emoji: '\uD83C\uDFAF', tier: 'oro', xp: 50,
    check: function(ctx) { return ctx.totalVotos().then(function(n){ return n >= 25; }); },
  },
  {
    id: 'logr_opinion_blog', grupo: 'general', requiere: [],
    nombre: 'Lector cr\u00edtico', desc: 'Deja tu primera opini\u00f3n en un art\u00edculo del blog',
    emoji: '\uD83D\uDCDD', tier: 'bronce', xp: 10,
    check: function(ctx) { return ctx.blogOpiniones().then(function(n){ return n >= 1; }); },
  },
  {
    id: 'logr_votos_blog_5', grupo: 'general', requiere: ['logr_opinion_blog'],
    nombre: 'Bibliotecario', desc: 'Califica 5 art\u00edculos del blog',
    emoji: '\uD83D\uDCDA', tier: 'plata', xp: 25,
    check: function(ctx) { return ctx.blogVotos().then(function(n){ return n >= 5; }); },
  },
  {
    id: 'logr_votos_blog_10', grupo: 'general', requiere: ['logr_votos_blog_5'],
    nombre: 'Curador de historias', desc: 'Califica 10 art\u00edculos del blog',
    emoji: '\uD83D\uDCDA', tier: 'oro', xp: 50,
    check: function(ctx) { return ctx.blogVotos().then(function(n){ return n >= 10; }); },
  },
  {
    id: 'logr_coleccionista_10', grupo: 'coleccion', requiere: [],
    nombre: 'Coleccionista', desc: 'Guarda 10 lugares en total',
    emoji: '\uD83D\uDCBC', tier: 'bronce', xp: 15,
    check: function(ctx) { return Promise.resolve(ctx.totalGuardados >= 10); },
  },
  {
    id: 'logr_coleccionista_50', grupo: 'coleccion', requiere: ['logr_coleccionista_10'],
    nombre: 'Magnate del mapa', desc: 'Guarda 50 lugares en total',
    emoji: '\uD83C\uDFC6', tier: 'oro', xp: 75,
    check: function(ctx) { return Promise.resolve(ctx.totalGuardados >= 50); },
  },
  {
    id: 'logr_ciudades_5', grupo: 'coleccion', requiere: ['logr_coleccionista_10'],
    nombre: 'Viajero multiciudad', desc: 'Guarda lugares en 5 ciudades distintas',
    emoji: '\uD83D\uDDFA', tier: 'plata', xp: 30,
    check: function(ctx) { return ctx.ciudadesDistintas().then(function(n){ return n >= 5; }); },
  },
  {
    id: 'logr_visitas_5', grupo: 'coleccion', requiere: [],
    nombre: 'Senderista', desc: 'Confirma 5 visitas a destinos',
    emoji: '\uD83E\uDDBC', tier: 'bronce', xp: 15,
    check: function(ctx) { return ctx.visitasActivas().then(function(n){ return n >= 5; }); },
  },
  {
    id: 'logr_visitas_20', grupo: 'coleccion', requiere: ['logr_visitas_5'],
    nombre: 'N\u00f3mada', desc: 'Confirma 20 visitas a destinos',
    emoji: '\uD83E\uDDED', tier: 'oro', xp: 50,
    check: function(ctx) { return ctx.visitasActivas().then(function(n){ return n >= 20; }); },
  },
  {
    id: 'logr_pionero', grupo: 'coleccion', requiere: [],
    nombre: 'Pionero', desc: 'Confirma una visita en zona rural o remota',
    emoji: '\uD83E\uDDED', tier: 'plata', xp: 40,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM interacciones WHERE usuario_id=$1 AND tipo=\'visita\' AND activo=true AND dims->\'geo\'->>\'zona\'=\'rural\'',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  // --- Logros de Albums/Fotos (ADR-017) ---
  {
    id: 'logr_albumero', grupo: 'fotos', requiere: [],
    nombre: 'Albumero', desc: 'Crea tu primer album fotografico',
    emoji: '\uD83D\uDDBC', tier: 'bronce', xp: 15,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM albumes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    id: 'logr_coleccionista_visual', grupo: 'fotos', requiere: ['logr_albumero'],
    nombre: 'Coleccionista visual', desc: 'Sube 25 fotos a albumes',
    emoji: '\uD83C\uDFA8', tier: 'plata', xp: 30,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_fotos WHERE autor_original_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 25); });
    },
  },
  {
    id: 'logr_maestro_fotografo', grupo: 'fotos', requiere: ['logr_coleccionista_visual'],
    nombre: 'Maestro fotografico', desc: 'Sube 50 fotos a albumes',
    emoji: '\uD83C\uDF1F', tier: 'oro', xp: 60,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM album_fotos WHERE autor_original_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 50); });
    },
  },
  {
    id: 'logr_favorito_comunidad', grupo: 'fotos', requiere: [],
    nombre: 'Favorito de la comunidad', desc: 'Tus fotos reciben 10 votos en total',
    emoji: '\u2B50', tier: 'bronce', xp: 20,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM media_votos mv '
        + 'JOIN album_fotos af ON af.id::text = mv.item_id '
        + 'WHERE mv.fuente=\'album_foto\' AND mv.activo=true AND af.autor_original_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 10); })
       .catch(function(){ return false; });
    },
  },
  {
    id: 'logr_estrella_del_mapa', grupo: 'fotos', requiere: ['logr_favorito_comunidad'],
    nombre: 'Estrella del mapa', desc: 'Una de tus fotos es seleccionada como top por un admin',
    emoji: '\uD83C\uDF1F', tier: 'oro', xp: 40,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM destinos '
        + 'WHERE foto_hero IN (SELECT foto_url FROM album_fotos WHERE autor_original_id=$1)',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    id: 'logr_guardian_historias', grupo: 'fotos', requiere: ['logr_albumero'],
    nombre: 'Guardian de historias', desc: 'Crea 5 albumes con al menos 10 fotos cada uno',
    emoji: '\uD83D\uDCDA', tier: 'platino', xp: 100,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM ('
        + '  SELECT af.album_id FROM album_fotos af '
        + '  JOIN albumes a ON a.id = af.album_id '
        + '  WHERE a.usuario_id=$1 AND af.activo=true '
        + '  GROUP BY af.album_id HAVING COUNT(*) >= 10'
        + ') sub',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 5); });
    },
  },
  {
    id: 'logr_viajero_multimedia', grupo: 'fotos', requiere: ['logr_albumero'],
    nombre: 'Viajero multimedia', desc: 'Crea albumes de los 3 tipos: fotos, videos y audio',
    emoji: '\uD83C\uDFA5', tier: 'plata', xp: 35,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(DISTINCT tipo)::int AS tipos FROM albumes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].tipos >= 3); });
    },
  },
];

// Logros de coleccion por ciudad, generados desde CIUDADES_COLECCION
// para mantener el catalogo data-driven dentro de codigo estatico.
CIUDADES_COLECCION.forEach(function(c) {
  LOGROS.push({
    id: c.id, grupo: 'ciudad', requiere: ['logr_coleccionista_10'],
    nombre: c.nombre, desc: c.desc, emoji: c.emoji, tier: c.tier, xp: c.xp,
    check: function(ctx) { return ctx.guardadosCiudad(c.ciudad).then(function(n){ return n >= c.n; }); },
  });
});

// Logros Milestones v2 (ADR-014): badges de identidad estilo Steam/
// SKATE/Albion. IDs estables: una vez desbloqueado, el progreso en
// usuarios.progreso_logros no se invalida al renombrar el catalogo.
LOGROS.push(
  {
    id: 'logr_spot_domado', grupo: 'general', requiere: ['logr_primer_voto', 'logr_critico_10'],
    nombre: 'Spot Domado', desc: 'Tu resena es la numero 1 (mas votada) en un destino de dificultad Experto',
    emoji: '\uD83C\uDFC5', tier: 'oro', xp: 50,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM interacciones i'
        + ' JOIN destinos d ON d.id = i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'resena\''
        + '   AND (LOWER(d.tags->>\'dificultad\') IN (\'experto\',\'extremo\')'
        + '     OR LOWER(COALESCE(d.tags->>\'dificultad\',\'\')) = \'extremo\')'
        + '   AND i.votos_utiles > 0'
        + '   AND i.votos_utiles = (SELECT MAX(v.votos_utiles) FROM interacciones v'
        + '       WHERE v.destino_id = i.destino_id AND v.tipo=\'resena\')',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); });
    },
  },
  {
    id: 'logr_especialista_gastro', grupo: 'general', requiere: ['logr_critico_10'],
    nombre: 'Especialista en Gastro', desc: 'Alcanza Tier 3 de Critico escribiendo solo resenas de Comida',
    emoji: '\uD83C\uDF54', tier: 'plata', xp: 40,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n_total,'
        + ' COUNT(*) FILTER (WHERE d.categoria_slug = \'comida\')::int AS n_comida'
        + ' FROM interacciones i JOIN destinos d ON d.id = i.destino_id'
        + ' WHERE i.usuario_id=$1 AND i.tipo=\'resena\'',
        [ctx.usuarioId]
      ).then(function(r){
        var row = r[0] || { n_total: 0, n_comida: 0 };
        return row.n_total >= 5 && row.n_total === row.n_comida;
      });
    },
  },
  {
    id: 'logr_cazador_rarezas', grupo: 'general', requiere: ['logr_critico_10', 'logr_coleccionista_10'],
    nombre: 'Cazador de Rarezas', desc: 'Desbloquea un trofeo cuya rareza global sea menor al 5%',
    emoji: '\uD83D\uDD0D', tier: 'platino', xp: 100,
    check: function(ctx) {
      return ctx.rarezaGlobal().then(function(rareza) {
        if (!rareza) return false;
        // Cazador de Rarezas: el usuario ya tiene desbloqueado algun
        // trofeo cuya rareza global hoy vista menos del 5% de los
        // viajeros activos (estilo Steam).
        var desbloqueados = ctx.progresoLogros || {};
        var tieneRaro = false;
        Object.keys(desbloqueados).forEach(function(k) {
          var st = desbloqueados[k];
          if (st && st.estado === 'completada' && rareza[k] > 0 && rareza[k] < 5) {
            tieneRaro = true;
          }
        });
        return tieneRaro;
      });
    },
  }
);

// Logros de la comunidad social (espec 2026-09-08): chat y planes
// colectivos. Mismo patron que los de arriba: codigo estatico, check()
// server-side que consulta las tablas de la migracion 008.
LOGROS.push(
  {
    id: 'logr_social_chat', grupo: 'general', requiere: ['logr_primer_voto'],
    nombre: 'Conversador', desc: 'Env\u00eda 50 mensajes en el chat de la comunidad',
    emoji: '\uD83D\uDCAC', tier: 'plata', xp: 30,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM chat_mensajes WHERE usuario_id=$1 AND activo=true',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 50); })
       .catch(function(){ return false; });
    },
  },
  {
    id: 'logr_social_plan', grupo: 'general', requiere: ['logr_primer_voto'],
    nombre: 'Organizador de viajes', desc: 'Crea 3 planes de viaje colectivos',
    emoji: '\uD83D\uDDFA', tier: 'oro', xp: 35,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM planes_viaje WHERE creador_id=$1',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 3); })
       .catch(function(){ return false; });
    },
  },
  {
    id: 'logr_anfitrion', grupo: 'general', requiere: ['logr_primer_voto'],
    nombre: 'Anfitri\u00f3n de parche', desc: 'Un plan tuyo re\u00fane 5 o m\u00e1s viajeros',
    emoji: '\uD83E\uDD1D', tier: 'oro', xp: 50,
    check: function(ctx) {
      return ctx.sql(
        'SELECT COUNT(*)::int AS n FROM ('
        + ' SELECT p.id FROM planes_viaje p'
        + ' JOIN planes_miembros pm ON pm.plan_id = p.id'
        + ' WHERE p.creador_id = $1'
        + ' GROUP BY p.id HAVING COUNT(pm.usuario_id) >= 5'
        + ') t',
        [ctx.usuarioId]
      ).then(function(r){ return !!(r[0] && r[0].n >= 1); })
       .catch(function(){ return false; });
    },
  }
);

// Logros de compartir media (ADR-036 B, v19): cuentan filas de
// media_compartidos (migracion 022). El check degrada a 0 -> false si la
// tabla no existe (contarCompartidosUsuario nunca lanza por 42P01).
LOGROS.push(
  {
    id: 'logr_primer_compartido', grupo: 'general', requiere: [],
    nombre: 'Primer compartido', desc: 'Comparte un lugar o una foto por primera vez',
    emoji: '\uD83D\uDD17', tier: 'bronce', xp: 10,
    check: function(ctx) {
      return contarCompartidosUsuario(ctx.sql, ctx.usuarioId).then(function(n){ return n >= 1; });
    },
  },
  {
    id: 'logr_compartidor_25', grupo: 'general', requiere: ['logr_primer_compartido'],
    nombre: 'Compartidor', desc: 'Comparte 25 veces en total',
    emoji: '\uD83D\uDCE4', tier: 'plata', xp: 25,
    check: function(ctx) {
      return contarCompartidosUsuario(ctx.sql, ctx.usuarioId).then(function(n){ return n >= 25; });
    },
  },
  {
    id: 'logr_viral_100', grupo: 'general', requiere: ['logr_compartidor_25'],
    nombre: 'Viral', desc: 'Comparte 100 veces en total',
    emoji: '\uD83D\uDD25', tier: 'oro', xp: 50,
    check: function(ctx) {
      return contarCompartidosUsuario(ctx.sql, ctx.usuarioId).then(function(n){ return n >= 100; });
    },
  }
);

// -- Own the Spot (SKATE, Milestones v2 / ADR-014) ------------------
// El lider de un spot es el autor de la resena mas votada (votos_utiles
// maximo) de un destino. La consulta corre BAJO DEMANDA (respuesta del
// prompt gsming: "bajo demanda") tanto en api/pagina-destino.js (bloque
// "Lider del Spot" de la seccion de resenas) como aqui, para el
// multiplicador de XP x1.1 en la ciudad del lider. Requiere la migracion
// 007 (columna interacciones.votos_utiles); si aun no existe, la query
// falla y el catch la degrada a false sin romper el POST.
function esLiderDeCiudad(sql, usuarioId, ciudad) {
  if (!usuarioId || !ciudad) return Promise.resolve(false);
  return sql(
    'SELECT 1 AS uno FROM interacciones i'
    + ' JOIN destinos d ON d.id = i.destino_id'
    + ' WHERE i.usuario_id = $1 AND i.tipo = \'resena\''
    + '   AND i.votos_utiles > 0'
    + '   AND i.votos_utiles = (SELECT MAX(v.votos_utiles) FROM interacciones v'
    + '       WHERE v.destino_id = i.destino_id AND v.tipo = \'resena\')'
    + '   AND ' + CIUDAD_NORM + ' = LOWER($2)'
    + ' LIMIT 1',
    [usuarioId, ciudad]
  ).then(function(r){ return r.length > 0; }).catch(function(){ return false; });
}

// Capacidad desbloqueada por mision (patron de la foto en el POST):
// lee usuarios.progreso_misiones y devuelve true si la mision esta
// 'completada'. Nunca lanza: un fallo degrada a false.
function misionCompletada(sql, usuarioId, misionId) {
  if (!usuarioId || !misionId) return Promise.resolve(false);
  return sql(
    "SELECT (progreso_misiones->$1->>'estado') = 'completada' AS ok FROM usuarios WHERE id=$2",
    [misionId, usuarioId]
  ).then(function(r){ return !!(r[0] && r[0].ok); })
   .catch(function(){ return false; });
}

// ============================================================
// v9 Gamificacion v4.0 (ADR-018): helpers de consumibles,
// cromos y fama de pandilla. Requiere la migracion 010 antes de
// desplegar; si la tabla no existe, las consultas fallan y se
// degradan sin romper la accion principal.
// ============================================================

// Lee capacidades del usuario (inventario JSONB de consumibles).
function leerCapacidades(sql, usuarioId) {
  return sql('SELECT capacidades FROM usuarios WHERE id=$1', [usuarioId])
    .then(function(r){ return (r[0] && r[0].capacidades) || {}; })
    .catch(function(){ return {}; });
}

// Aplica el efecto del consumible al capacidades JSONB (MERGE ||).
// Actualiza solo la clave indicada preservando el resto del inventario.
function actualizarCapacidad(sql, usuarioId, clave, valor) {
  return sql(
    'UPDATE usuarios SET capacidades = COALESCE(capacidades,\'{}\'::jsonb)'
    + " || jsonb_build_object($1, $2::jsonb) WHERE id=$3",
    [clave, JSON.stringify(valor), usuarioId]
  ).catch(function(){});
}

// Amuleto de Doble XP (clave amuleto_x2): si capacidades->
// multiplicador_x2_usos > 0, CONSUME un uso y reporta doubled=true.
// ADR-053 (v25): YA NO multiplica el XP aqui; el x2 entra como parte del
// stack temporal dentro del punto unico (ctx.amuleto) para que el cap
// global vea el stack real y xp_base nunca llegue pre-multiplicado. El
// campo xp devuelto es la base intacta (compatibilidad de firma). Nunca
// lanza: fallo degrada a sin amuleto.
function aplicarAmuletoX2(sql, usuarioId, xpBase) {
  var base = red2(xpBase);
  if (!usuarioId) return Promise.resolve({ xp: base, doubled: false });
  return leerCapacidades(sql, usuarioId).then(function(caps) {
    var usos = parseInt(caps.multiplicador_x2_usos, 10) || 0;
    if (usos <= 0) return { xp: base, doubled: false };
    return actualizarCapacidad(sql, usuarioId, 'multiplicador_x2_usos', usos - 1)
      .then(function() { return { xp: base, doubled: true }; });
  });
}

// Obtencion de cromo (probabilidad 15% base + CROMO_PROBABILIDADES por
// rareza). Si capacidades->cromo_garantia = 'epico' (consumible
// imantador_cromos activo), fuerza rareza epica o dorada y consume la
// garantia. Selecciona un cromo activo del catalogo; si no hay de la
// rareza exacta, degrada a cualquiera. UPSERT en usuarios_cromos
// (cantidad + 1). Devuelve el cromo obtenido o null.
function intentarObtenerCromo(sql, usuarioId, destinoId) {
  if (!usuarioId) return Promise.resolve(null);
  if (Math.random() >= 0.15) return Promise.resolve(null);
  return leerCapacidades(sql, usuarioId).then(function(caps) {
    var garantia = caps.cromo_garantia || null;
    var roll = Math.random();
    var rareza;
    if (garantia === 'epico') {
      rareza = (roll < 0.07) ? 'dorado' : 'epico';
    } else if (roll < 0.07) {
      rareza = 'dorado';
    } else if (roll < 0.25) {
      rareza = 'epico';
    } else if (roll < 0.55) {
      rareza = 'raro';
    } else {
      rareza = 'comun';
    }
    var consumo = garantia === 'epico'
      ? actualizarCapacidad(sql, usuarioId, 'cromo_garantia', null)
      : Promise.resolve();
    return consumo.then(function() {
      return sql(
        'SELECT id, nombre, rareza, set_slug, imagen_url FROM cromos_catalogo'
        + ' WHERE activo=true AND rareza=$1 ORDER BY RANDOM() LIMIT 1',
        [rareza]
      ).then(function(rows) {
        if (!rows.length) {
          return sql('SELECT id, nombre, rareza, set_slug, imagen_url FROM cromos_catalogo WHERE activo=true ORDER BY RANDOM() LIMIT 1', [])
            .then(function(fb) { return fb[0] || null; });
        }
        return rows[0];
      });
    }).then(function(cromo) {
      if (!cromo) return null;
      return sql(
        'INSERT INTO usuarios_cromos (usuario_id, cromo_id, cantidad) VALUES ($1,$2,1)'
        + ' ON CONFLICT (usuario_id, cromo_id) DO UPDATE SET cantidad = usuarios_cromos.cantidad + 1',
        [usuarioId, cromo.id]
      ).then(function() {
        return { id: cromo.id, nombre: cromo.nombre, rareza: cromo.rareza, set_slug: cromo.set_slug, imagen_url: cromo.imagen_url };
      });
    });
  }).catch(function(){ return null; });
}

// Aporte de fama a la pandilla activa del usuario: 10% del XP ganado
// (ROUND), duplicado si capacidades->fama_x2_hasta es futuro (consumible
// trompeta_fama). Nunca lanza: sin pandilla activa no hace nada.
function aplicarFamaPandilla(sql, usuarioId, xpGanado) {
  xpGanado = numXp(xpGanado);
  if (!usuarioId || xpGanado <= 0) return Promise.resolve(false);
  return sql(
    'SELECT pm.pandilla_id FROM pandillas_miembros pm'
    + ' JOIN pandillas p ON p.id = pm.pandilla_id'
    + ' WHERE pm.usuario_id=$1 AND pm.activo=true AND p.activo=true LIMIT 1',
    [usuarioId]
  ).then(function(rows) {
    if (!rows.length) return false;
    var pandillaId = rows[0].pandilla_id;
    var famaBase = red2(xpGanado * 0.10);
    if (famaBase <= 0) return false;
    return leerCapacidades(sql, usuarioId).then(function(caps) {
      var fama = famaBase;
      if (caps.fama_x2_hasta && new Date(String(caps.fama_x2_hasta)) > new Date()) {
        fama = red2(famaBase * 2);
      }
      return sql('UPDATE pandillas SET fama_total = fama_total + $1 WHERE id=$2', [fama, pandillaId])
        .then(function(){ return true; });
    });
  }).catch(function(){ return false; });
}

// Progreso de retos de parche (contrato final punto 8): suma +1 a los
// retos ACTIVOS (completado=false, fecha_fin futura) de la pandilla del
// usuario cuyo tipo_reto coincida con el pasado ('resena' para resena,
// 'guardado' para guardado, 'visita' para visita y rating). Al cruzar
// meta_valor marca completado=true y reparte xp_bono entre los miembros
// activos. Devuelve { titulo, xp_bono } del primer reto completado en
// esta accion, o null si no aplica. Nunca lanza: degrada a null.
function progresarPandillaRetos(sql, usuarioId, tipoReto) {
  if (!usuarioId || !tipoReto) return Promise.resolve(null);
  return sql(
    'SELECT pm.pandilla_id FROM pandillas_miembros pm'
    + ' JOIN pandillas p ON p.id = pm.pandilla_id'
    + ' WHERE pm.usuario_id=$1 AND pm.activo=true AND p.activo=true LIMIT 1',
    [usuarioId]
  ).then(function(rows) {
    if (!rows.length) return null;
    var prPandillaId = rows[0].pandilla_id;
    return sql(
      'UPDATE pandilla_retos SET progreso_actual = progreso_actual + 1,'
      + ' completado = (progreso_actual + 1 >= meta_valor)'
      + ' WHERE pandilla_id=$1 AND completado=false AND tipo_reto=$2'
      + ' AND fecha_fin > NOW()'
      + ' RETURNING id, titulo, meta_valor, progreso_actual, completado, xp_bono',
      [prPandillaId, tipoReto]
    ).then(function(retosUp) {
      var completados = (retosUp || []).filter(function(r){ return r.completado === true; });
      if (!completados.length) return null;
      var primer = completados[0];
      // Reparte el bono de cada reto completado entre los miembros activos
      var cadena = Promise.resolve();
      completados.forEach(function(r) {
        if (!(numXp(r.xp_bono) > 0)) return;
        cadena = cadena.then(function() {
          var bonoReto = red2(numXp(r.xp_bono));
          return sql(
            'UPDATE usuarios SET xp_total = xp_total + $1'
            + ' WHERE id IN (SELECT usuario_id FROM pandillas_miembros'
            + ' WHERE pandilla_id=$2 AND activo=true) RETURNING id',
            [bonoReto, prPandillaId]
          ).then(function(dest) {
            // ADR-053 (v25): bono de reto EXENTO de M_nivel, repartido a
            // TODOS los miembros activos -> una fila de ledger por usuario.
            return Promise.all((dest || []).map(function(fila) {
              return registrarXpLedger(sql, {
                usuario_id: fila.id, accion: 'pandilla_reto', xp_base: bonoReto,
                mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'ninguno',
                bonos_planos: 0, xp_final: bonoReto, es_exento: true,
                contexto: { pandilla_id: prPandillaId, reto_id: r.id, titulo: r.titulo }
              });
            }));
          });
        });
      });
      return cadena.then(function() {
        return { titulo: primer.titulo, xp_bono: red2(numXp(primer.xp_bono)) };
      });
    });
  }).catch(function(){ return null; });
}

// =====================================================================
// ENTREGA 016 (Gaming v5.0): helpers de sesion, reparto y nonce
// =====================================================================

// Validador JWT (ADR-025): misma firma que api/usuarios.js v9
// (HMAC-SHA256 sobre payload base64url con SESSION_JWT_SECRET). El token
// viaja como Authorization: Bearer <b64.sig>.
// v22: verificarSesion devuelve {ok:true, sub} (usuario de la sesion) o
// {ok:false, razon}; validarSesion lo reusa y exige que sub sea
// String(usuarioIdEsperado). El usuario NUNCA se confia al body (BUG-061).
function verificarSesion(req) {
  var encabezado = req.headers['authorization'] || '';
  if (encabezado.indexOf('Bearer ') !== 0) return { ok: false, razon: 'SESION_REQUERIDA' };
  var token = encabezado.slice(7).trim();
  var punto = token.indexOf('.');
  if (punto <= 0 || punto === token.length - 1) return { ok: false, razon: 'SESION_INVALIDA' };
  var payloadB64 = token.slice(0, punto);
  var firma = token.slice(punto + 1);
  var secreto = process.env.SESSION_JWT_SECRET || 'dev_secret';
  var firmaEsperada = crypto
    .createHmac('sha256', secreto)
    .update(payloadB64)
    .digest('base64url');
  var fa = Buffer.from(firma, 'utf8');
  var fb = Buffer.from(firmaEsperada, 'utf8');
  if (fa.length !== fb.length) return { ok: false, razon: 'SESION_INVALIDA' };
  if (!crypto.timingSafeEqual(fa, fb)) return { ok: false, razon: 'SESION_INVALIDA' };
  var payload = null;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (e) { return { ok: false, razon: 'SESION_INVALIDA' }; }
  if (!payload || !payload.exp || !payload.sub) return { ok: false, razon: 'SESION_INVALIDA' };
  if (payload.exp <= Math.floor(Date.now() / 1000)) return { ok: false, razon: 'SESION_EXPIRADA' };
  return { ok: true, sub: String(payload.sub) };
}

// Valida que la sesion firmada corresponda al usuario esperado. Devuelve
// {ok:true} o {ok:false, razon}.
function validarSesion(req, usuarioIdEsperado) {
  var s = verificarSesion(req);
  if (!s.ok) return { ok: false, razon: s.razon };
  if (s.sub !== String(usuarioIdEsperado)) return { ok: false, razon: 'SESION_INVALIDA' };
  return { ok: true };
}

// Respuesta 401 unica para fallos de sesion (contrato de la Entrega 016).
function responderSesion(res, razon) {
  return res.status(401).json({ ok: false, error: razon });
}

// Consumo atomico de nonce anti-replay (ADR-025): un solo uso, expira
// en 2 minutos y esta atado al usuario. Devuelve Promise<boolean>. Si
// geo_nonces no existe (migracion 016 pendiente) el 42P01 sube limpio y
// el catch global lo tipifica como 503.
function consumirNonce(sql, nonce, usuarioId) {
  return sql(
    'UPDATE geo_nonces SET usado=true '
    + 'WHERE nonce=$1 AND usado=false AND expira_en>NOW() AND usuario_id=$2 RETURNING id',
    [nonce, usuarioId]
  ).then(function(r) { return r.length > 0; });
}

// Reparto multinivel de la piramide de referidos (Entrega 016): del XP
// ganado por el usuario, sus ancestros hasta 5 niveles reciben 10/5/3/2/1
// % (ROUND half-up a 2 decimales, ADR-035) sobre xp_ref_total, solo si el
// ancestro no supero el tope de 500 referidos directos. REGLA Postgres
// (0A000): el UPDATE es la sentencia PRINCIPAL con FROM cadena - jamas un
// UPDATE dentro del WITH RECURSIVE. Nunca lanza: degrada a false.
function repartirXpReferidos(sql, usuarioId, xpGanado) {
  var xpGan = Number(xpGanado) || 0;
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

// Clave unica de un hilo de Mensajeria Directa (migracion 017): los dos
// uuid participantes ordenados alfabeticamente unidos por '_' (36+1+36 =
// 73 chars). El indice unico parcial idx_chat_salas_dm_unica garantiza un
// solo hilo por par de usuarios.
function claveDm(a, b) {
  var x = String(a || '');
  var y = String(b || '');
  return x < y ? x + '_' + y : y + '_' + x;
}

// Mejora de perfil activa (vitrina del museo publico): el catalogo de
// consumibles perfil_* se guarda en usuarios.capacidades, tanto como flag
// directo (capacidades.<clave> = true) como cantidad en el inventario
// (capacidades.consumibles.<clave>). Lee ambas formas sin reescribir.
function perfilPosee(caps, clave) {
  var c = caps || {};
  if (c[clave] === true) return true;
  var inv = c.consumibles || {};
  return (parseInt(inv[clave], 10) || 0) > 0;
}

// Fondo por defecto del museo cuando perfil_fondo_paisaje se consume sin
// body.fondo (o con un valor invalido). Clave ASCII que el frontend
// resuelve a su paisaje base; nunca una URL externa (ADR-002).
var FONDO_PERFIL_DEFAULT = 'default';

// Titulo de viajero (perfil_titulo_custom, WP-6 / TSK-103 / ADR-028):
// normaliza a ASCII imprimible y recorta a 24 caracteres. NFKD + borrado
// de las marcas combinantes convierte tildes y enes a ASCII, de modo que
// el titulo viaja siempre como texto seguro (ADR-002). Devuelve '' si
// queda vacio (el caller responde 400 TITULO_REQUERIDO).
function tituloPerfilSafe(valor) {
  var s = String(valor == null ? '' : valor);
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  return s.replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24);
}

// Mejora de perfil persistida (WP-6, ADR-003): escribe usuarios.perfil_config
// con MERGE JSONB a nivel raiz (COALESCE(perfil_config,'{}'::jsonb) || $1),
// NUNCA reemplazo. Mismo contrato que la rama perfil_actualizar de
// api/usuarios.js. Nunca lanza: si la migracion 017 no esta aplicada
// degrada a false sin romper el uso del consumible.
function mergePerfilConfig(sqlFn, usuarioId, parche) {
  if (!usuarioId || !parche) return Promise.resolve(false);
  return sqlFn(
    'UPDATE usuarios SET perfil_config = COALESCE(perfil_config, \'{}\'::jsonb)'
    + ' || $1::jsonb WHERE id=$2',
    [JSON.stringify(parche), usuarioId]
  ).then(function() { return true; }).catch(function() { return false; });
}

// Rareza global estilo Steam de los logros: mapa id -> % de usuarios
// activos que lo desbloquearon. Helper compartido por el GET tipo=logros,
// el GET tipo=museo_publico y el contexto de evaluarLogros (Regla de
// No-Duplicidad). Nunca lanza: degrada a {}.
function rarezaLogrosGlobal(sqlFn) {
  return sqlFn(
    'SELECT k AS id, COUNT(*)::int AS n FROM usuarios u,'
    + ' LATERAL jsonb_object_keys(COALESCE(u.progreso_logros,\'{}\'::jsonb)) AS k'
    + ' WHERE u.activo = true GROUP BY k'
  ).then(function(raros) {
    return sqlFn('SELECT COUNT(*)::int AS n FROM usuarios WHERE activo = true')
      .then(function(totales) {
        var totalUsr = totales[0] ? totales[0].n : 0;
        var mapa = {};
        (raros || []).forEach(function(r) {
          mapa[r.id] = totalUsr ? Math.round((r.n / totalUsr) * 1000) / 10 : 0;
        });
        return mapa;
      });
  }).catch(function(){ return {}; });
}

// Anti-farming del chat (espec 2026-09-08): +2 XP por mensaje con tope
// diario de 20 XP (10 mensajes/dia). El contador vive en
// usuarios.progreso_social con la estructura { chat_dia: 'YYYY-MM-DD',
// chat_n: N }. Nunca lanza: un fallo degrada a sin XP disponible.
function chatXpDisponible(sql, usuarioId) {
  if (!usuarioId) return Promise.resolve({ disponible: false, xp: 0, hoy: '', n: 0 });
  var hoy = new Date();
  var hoyStr = hoy.getUTCFullYear() + '-'
    + String(hoy.getUTCMonth() + 1).padStart(2, '0') + '-'
    + String(hoy.getUTCDate()).padStart(2, '0');
  return sql('SELECT progreso_social FROM usuarios WHERE id=$1', [usuarioId])
    .then(function(r){
      var ps = (r[0] && r[0].progreso_social) || {};
      var n = (ps.chat_dia === hoyStr) ? (parseInt(ps.chat_n, 10) || 0) : 0;
      return { disponible: n < 10, xp: n < 10 ? XP_BASES.chat_comentario : 0, hoy: hoyStr, n: n };
    })
    .catch(function(){ return { disponible: false, xp: 0, hoy: hoyStr, n: 0 }; });
}

function registrarChatXp(sql, usuarioId, hoy, n) {
  return sql(
    "UPDATE usuarios SET progreso_social = COALESCE(progreso_social,'{}'::jsonb)"
    + " || jsonb_build_object('chat_dia', $1, 'chat_n', $2::int) WHERE id=$3",
    [hoy, n + 1, usuarioId]
  ).catch(function(){});
}

// BUG-A (v12) / ADR-036 (v19): contador de comentarios degradable de una
// foto. Ahora lee del modelo unificado media_comentarios
// (fuente='album_foto', item_id = foto_id::text); si la migracion 023 no
// esta aplicada (42P01/42703) devuelve 0 en silencio (con warn limitado)
// para que album_detalle, galeria_destino y mi_feed_fotos degraden con
// gracia. Cualquier otro error se re-lanza.
function contarComentarioSafe(sqlFn, fotoId) {
  if (!fotoId) return Promise.resolve(0);
  return sqlFn(
    'SELECT COUNT(*)::int AS n FROM media_comentarios mc'
    + ' WHERE mc.fuente = \'album_foto\' AND mc.item_id = $1::text AND mc.activo = true',
    [fotoId]
  ).then(function(r) {
    return (r[0] && parseInt(r[0].n, 10)) || 0;
  }).catch(function(e) {
    if (e && (e.code === '42P01' || e.code === '42703')) {
      console.warn('TRACE: media_comentarios ausente (migracion 023), contador degradado a 0');
      return 0;
    }
    throw e;
  });
}

// Helper generico reutilizable (v16): ejecuta una plantilla SQL que
// proyecta una foto/avatar de usuario (columna usuarios.foto_url,
// migracion 004, pendiente de aplicar en Neon). Si esa columna aun no
// existe, el 42703 se degrada reintentando la MISMA consulta con un
// reemplazo alterno por query en vez de escalar al 503 global
// (SCHEMA_NOT_MIGRATED). La plantilla lleva la marca __FOTO_URL__ (una o
// varias veces); el par de reemplazos [conFotoUrl, sinFotoUrl] es opcional
// y por defecto asume el JOIN con usuarios u (COALESCE con avatar_url).
// Nunca silencia: solo el 42703 activa el reintento (logueado con
// console.error); cualquier otro codigo se re-lanza y, si el reintento
// falla, su error se propaga.
function queryConAvatarFallback(sqlFn, plantilla, params, reemplazos) {
  var par = reemplazos || ['COALESCE(u.foto_url, u.avatar_url, \'\')', 'COALESCE(u.avatar_url, \'\')'];
  var conFoto = plantilla.split('__FOTO_URL__').join(par[0]);
  var sinFoto = plantilla.split('__FOTO_URL__').join(par[1]);
  return sqlFn(conFoto, params).catch(function(e) {
    if (!e || e.code !== '42703') throw e;
    console.error('[interacciones] query degradada 42703: ' + e.message);
    return sqlFn(sinFoto, params);
  });
}

// Coordenadas de respaldo para albumes sin geolocalizacion (BUG-B):
// hereda lat/lng/ciudad de la primera interaccion (visita/guardado) del
// autor con un destino georreferenciado. Devuelve null si no hay una.
function coordsFallbackAutor(sqlFn, usuarioId) {
  if (!usuarioId) return Promise.resolve(null);
  return sqlFn(
    'SELECT d.lat AS lat, d.lng AS lng, d.ciudad AS ciudad'
    + ' FROM interacciones i'
    + ' JOIN destinos d ON d.id = i.destino_id'
    + ' WHERE i.usuario_id = $1'
    + '   AND i.tipo IN (\'visita\', \'guardado\')'
    + '   AND d.lat IS NOT NULL AND d.lng IS NOT NULL'
    + ' ORDER BY i.creado_en DESC'
    + ' LIMIT 1',
    [usuarioId]
  ).then(function(r) { return r && r.length ? r[0] : null; })
   .catch(function(e) {
     if (e && (e.code === '42P01' || e.code === '42703')) {
       console.warn('TRACE: esquema incompleto en coordsFallbackAutor, coords heredadas degradadas a null');
       return null;
     }
     throw e;
   });
}

// Evalua el catalogo completo para un usuario y persiste lo nuevo que se
// haya completado. Nunca lanza: un fallo aqui no debe tumbar la accion
// principal (resena/guardado/visita) que ya se registro con exito.
function evaluarMisiones(sql, usuarioId) {
  return sql(
    'SELECT xp_total, total_guardados, total_visitas, progreso_misiones FROM usuarios WHERE id=$1',
    [usuarioId]
  ).then(function(rows) {
    if (!rows.length) return [];
    var u = rows[0];
    var progreso = u.progreso_misiones || {};
    var visitasActivasM = sql(
      'SELECT COUNT(*)::int AS n FROM interacciones WHERE usuario_id=$1 AND tipo=\'visita\' AND activo=true',
      [usuarioId]
    ).then(function(r){ return r[0] ? (parseInt(r[0].n, 10) || 0) : 0; })
     .catch(function(){ return 0; });
    var ctx = {
      sql: sql,
      usuarioId: usuarioId,
      xpTotal: numXp(u.xp_total),
      totalGuardados: parseInt(u.total_guardados) || 0,
      totalVisitas: parseInt(u.total_visitas) || 0,
      visitasActivas: visitasActivasM,
    };
    var completadas = {};
    Object.keys(progreso).forEach(function(k) {
      if (progreso[k] && progreso[k].estado === 'completada') completadas[k] = true;
    });

    var nuevas = [];
    var cadena = Promise.resolve();
    MISIONES.forEach(function(m) {
      cadena = cadena.then(function() {
        if (completadas[m.id]) return;
        var okRequisitos = m.requiere.every(function(r){ return completadas[r]; });
        if (!okRequisitos) return;
        return m.check(ctx).then(function(cumplida) {
          if (!cumplida) return;
          completadas[m.id] = true;
          progreso[m.id] = { estado: 'completada', en: new Date().toISOString() };
          nuevas.push(m);
          console.log('TRACE: Hito detectado | Accion: ' + m.id + ' | Recompensa: ' + m.xp + ' XP');
        });
      });
    });

    return cadena.then(function() {
      if (!nuevas.length) return [];
      var xpBonus = red2(nuevas.reduce(function(s, m){ return s + (Number(m.xp) || 0); }, 0));
      return sql(
        'UPDATE usuarios SET'
        + '   progreso_misiones = COALESCE(progreso_misiones,\'{}\'::jsonb) || $1::jsonb,'
        + '   xp_total = xp_total + $2'
        + ' WHERE id = $3',
        [JSON.stringify(progreso), xpBonus, usuarioId]
      ).then(function() {
        // ADR-053 (v25): misiones EXENTAS de M_nivel (xp fijo). Se
        // instrumenta la acreditacion en el ledger con es_exento=true.
        return registrarXpLedger(sql, {
          usuario_id: usuarioId, accion: 'mision', xp_base: xpBonus,
          mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'ninguno',
          bonos_planos: 0, xp_final: xpBonus, es_exento: true,
          nivel: calcularNivelLocal(numXp(u.xp_total) + xpBonus).nivel,
          contexto: { misiones: nuevas.map(function(m){ return m.id; }) }
        });
      }).then(function() {
        // Arbol de Clases (WP-4): suma los puntos_rama SOLO en la primera
        // transicion a completada (nuevas ya excluye lo completado). El
        // merge es ANIDADO por rama: nunca reemplaza el objeto bonos
        // completo. Corre en su propia sentencia para que, si la
        // migracion 017 no esta aplicada, el progreso de misiones no se
        // pierda (degrada con warn).
        var bonos = {};
        nuevas.forEach(function(m) {
          if (!m.rama || !m.puntos_rama) return;
          if (!RAMA_POR_ID[m.rama]) return;
          var pts = red2(numXp(m.puntos_rama));
          if (pts <= 0) return;
          bonos[m.rama] = (bonos[m.rama] || 0) + pts;
        });
        var ramasBonus = Object.keys(bonos);
        if (!ramasBonus.length) return;
        var sumaSql = ramasBonus.map(function(r) {
          var lit = sqlLiteralArbol(r);
          return ' || jsonb_build_object(' + lit
            + ", COALESCE((progreso_arbol->'bonos'->>" + lit + ')::numeric,0) + ' + bonos[r] + ')';
        }).join('');
        return sql(
          "UPDATE usuarios SET progreso_arbol = COALESCE(progreso_arbol,'{}'::jsonb)"
          + " || jsonb_build_object('bonos', COALESCE(progreso_arbol->'bonos','{}'::jsonb)"
          + sumaSql + ') WHERE id = $1',
          [usuarioId]
        ).catch(function(e) {
          console.warn('TRACE: bonos de arbol no persistidos (migracion 017 pendiente?): ' + (e && e.message));
        });
      }).then(function() { return nuevas; });
    });
  }).catch(function(err) {
    console.error('[misiones]', err.message);
    return [];
  });
}

// Evalua el catalogo LOGROS para un usuario y persiste lo nuevo. Mismo
// patron de seguridad que evaluarMisiones: corre en servidor, nunca
// lanza, y las consultas de agregados se memoizan (una por accion) para
// no disparar una consulta por logro.
function evaluarLogros(sql, usuarioId) {
  return sql(
    'SELECT xp_total, total_guardados, total_visitas, progreso_logros FROM usuarios WHERE id=$1',
    [usuarioId]
  ).then(function(rows) {
    if (!rows.length) return [];
    var u = rows[0];
    var progreso = u.progreso_logros || {};
    var cache = {};
    function memo(key, query, params) {
      if (!cache[key]) {
        cache[key] = sql(query, params).then(function(r) {
          return r[0] ? parseInt(r[0].n) || 0 : 0;
        }).catch(function(){ return 0; });
      }
      return cache[key];
    }
    var ctx = {
      sql: sql,
      usuarioId: usuarioId,
      xpTotal: numXp(u.xp_total),
      totalGuardados: parseInt(u.total_guardados) || 0,
      totalVisitas: parseInt(u.total_visitas) || 0,
      progresoLogros: progreso,
      totalVotos: function() {
        return memo('votos',
          'SELECT COUNT(*)::int AS n FROM interacciones WHERE usuario_id=$1 AND tipo=\'rating\'',
          [usuarioId]);
      },
      blogVotos: function() {
        return memo('blogvotos',
          'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
          + ' WHERE i.usuario_id=$1 AND i.tipo=\'rating\' AND d.categoria_slug=\'blog\'',
          [usuarioId]);
      },
      blogOpiniones: function() {
        return memo('blogopiniones',
          'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
          + ' WHERE i.usuario_id=$1 AND i.tipo=\'resena\' AND d.categoria_slug=\'blog\'',
          [usuarioId]);
      },
      ciudadesDistintas: function() {
        return memo('ciudades',
          'SELECT COUNT(DISTINCT ' + CIUDAD_NORM + ')::int AS n FROM interacciones i'
          + ' JOIN destinos d ON d.id=i.destino_id'
          + ' WHERE i.usuario_id=$1 AND i.tipo=\'guardado\' AND i.activo=true AND ' + CIUDAD_NORM + ' <> \'\'',
          [usuarioId]);
      },
      visitasActivas: function() {
        return memo('visitas_activas',
          'SELECT COUNT(*)::int AS n FROM interacciones WHERE usuario_id=$1 AND tipo=\'visita\' AND activo=true',
          [usuarioId]);
      },
      guardadosCiudad: function(ciudad) {
        var key = 'ciudad_' + ciudad;
        return memo(key,
          'SELECT COUNT(*)::int AS n FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
          + ' WHERE i.usuario_id=$1 AND i.tipo=\'guardado\' AND i.activo=true AND ' + CIUDAD_NORM + ' = LOWER($2)',
          [usuarioId, ciudad]);
      },
      rarezaGlobal: function() {
        // Rareza estilo Steam: % de usuarios activos que desbloquearon
        // cada logro. Delega en rarezaLogrosGlobal (misma query del GET
        // tipo=logros, helper compartido) memoizada para correr una sola
        // vez por POST (badge logr_cazador_rarezas, ADR-014).
        if (cache['rareza']) return cache['rareza'];
        cache['rareza'] = rarezaLogrosGlobal(sql);
        return cache['rareza'];
      },
    };
    var completados = {};
    Object.keys(progreso).forEach(function(k) {
      if (progreso[k] && progreso[k].estado === 'completada') completados[k] = true;
    });

    var nuevos = [];
    var cadena = Promise.resolve();
    LOGROS.forEach(function(l) {
      cadena = cadena.then(function() {
        if (completados[l.id]) return;
        var okRequisitos = l.requiere.every(function(r){ return completados[r]; });
        if (!okRequisitos) return;
        return l.check(ctx).then(function(cumplido) {
          if (!cumplido) return;
          completados[l.id] = true;
          progreso[l.id] = { estado: 'completada', en: new Date().toISOString() };
          nuevos.push(l);
          console.log('TRACE: Logro desbloqueado | ' + l.id + ' | +' + l.xp + ' XP');
        });
      });
    });

    return cadena.then(function() {
      if (!nuevos.length) return [];
      var xpBonus = red2(nuevos.reduce(function(s, l){ return s + (Number(l.xp) || 0); }, 0));
      return sql(
        'UPDATE usuarios SET'
        + '   progreso_logros = COALESCE(progreso_logros,\'{}\'::jsonb) || $1::jsonb,'
        + '   xp_total = xp_total + $2'
        + ' WHERE id = $3',
        [JSON.stringify(progreso), xpBonus, usuarioId]
      ).then(function() {
        // ADR-053 (v25): logros EXENTOS de M_nivel (xp fijo). Ledger.
        return registrarXpLedger(sql, {
          usuario_id: usuarioId, accion: 'logro', xp_base: xpBonus,
          mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'ninguno',
          bonos_planos: 0, xp_final: xpBonus, es_exento: true,
          nivel: calcularNivelLocal(numXp(u.xp_total) + xpBonus).nivel,
          contexto: { logros: nuevos.map(function(l){ return l.id; }) }
        });
      }).then(function() { return nuevos; });
    });
  }).catch(function(err) {
    console.error('[logros]', err.message);
    return [];
  });
}

// Comparte la respuesta GET de logros/misiones: mapea un catalogo
// estatico + el progreso jsonb del usuario a filas {id, grupo, nombre,
// desc, xp, requiere, estado, en} y cuenta las completadas. 'meta'
// (opcional) anade campos extra por item (tier/emoji/rareza en logros).
// Evita duplicar el mismo bucle en tipo=logros y tipo=misiones
// (Regla de No-Duplicidad).
function entregarCatalogo(catalogo, progreso, meta) {
  var desbloqueados = 0;
  var data = catalogo.map(function(item) {
    var st = progreso[item.id];
    var done = !!(st && st.estado === 'completada');
    if (done) desbloqueados++;
    var fila = {
      id: item.id, grupo: item.grupo, nombre: item.nombre,
      desc: item.desc || null, xp: item.xp, requiere: item.requiere,
      estado: done ? 'completada' : 'pendiente',
      en: done ? (st.en || null) : null,
      // ADR-040 (B, aditivo): capacidad que abre la mision/logro (o null).
      // Compartido: ?tipo=logros tambien lo gana sin regresion.
      desbloquea: item.desbloquea || null,
    };
    if (meta) meta(fila, item);
    return fila;
  });
  return { data: data, desbloqueados: desbloqueados };
}

// =====================================================================
// v19 (ADR-036): helpers de media unificada y comparticiones.
// Las tablas media_votos/media_comentarios/media_comentario_likes vienen
// de la migracion 023; media_compartidos de la 022. Todo helper de lectura
// degrada 42P01/42703 (migracion pendiente) con warn; cualquier otro
// error se re-lanza (prohibido catch vacio). Los bloques de existencia
// duplicados de guardar_media/album_voto/foto_voto pasan por
// resolverMediaItem (Regla de No-Duplicidad).
// =====================================================================

var MEDIA_FUENTES = ['curada', 'viajero_foto', 'album_foto'];
var MEDIA_ITEM_RE = /^[0-9A-Za-z_-]{1,64}$/;

function mediaFuenteValida(f) {
  return MEDIA_FUENTES.indexOf(String(f || '').toLowerCase()) !== -1;
}

// v26 (ADR-054): fuentes validas de un bookmark de media. Incluye 'album'
// (album entero, sin foto_url) ademas de las 3 fuentes de MEDIA_FUENTES.
// La comparten guardar_media y guardados_carpeta (Regla de No-Duplicidad).
var GUARDADO_FUENTES = ['album', 'album_foto', 'viajero_foto', 'curada'];
function guardadoFuenteValida(f) {
  return GUARDADO_FUENTES.indexOf(String(f || '').toLowerCase()) !== -1;
}

// Ejecuta una promesa SQL y degrada SOLO el esquema ausente (42P01/42703)
// al valor indicado con warn; el resto de errores se re-lanzan.
function conDegradacionMedia(promesa, etiqueta, valor) {
  return promesa.catch(function(e) {
    if (e && (e.code === '42P01' || e.code === '42703')) {
      console.warn('TRACE: ' + etiqueta + ' ausente (migracion pendiente); degradado');
      return valor;
    }
    throw e;
  });
}

// v24 (ADR-052): true si el error indica esquema ausente (migracion
// pendiente). Lo comparten los lectores/escritores de carpetas de guardados
// para responder 503 SCHEMA_NOT_MIGRATED tipado en vez de degradar en
// silencio o caer al 500 global.
function esEsquemaFaltante(e) {
  return !!(e && (e.code === '42P01' || e.code === '42703'));
}

// Progreso anti-spam (usuarios.progreso_album): lo comparten albumes,
// comentarios y votos. Se movio del handler al modulo para reutilizarlo en
// crearComentarioMedia sin duplicar el cuerpo.
function getProgresoAlbum(sqlFn, uid) {
  return sqlFn('SELECT progreso_album FROM usuarios WHERE id=$1', [uid])
    .then(function(r){ return (r[0] && r[0].progreso_album) || {}; })
    .catch(function(){ return {}; });
}
function updProgresoAlbum(sqlFn, uid, obj) {
  return sqlFn('UPDATE usuarios SET progreso_album = progreso_album || $1::jsonb WHERE id=$2', [JSON.stringify(obj), uid]).catch(function(){});
}
function hoy() { return new Date().toISOString().slice(0, 10); }

// Resuelve existencia y autor de un item de media canonico. item_id se
// compara como text (id::text=$1) para no asumir uuid/text en tablas no
// versionadas (patron BUG-021). Devuelve
// {ok, fuente, itemId, autorId, albumDuenoId, destinoId} o {ok:false}.
function resolverMediaItem(sqlFn, fuente, itemId) {
  var f = String(fuente || '').toLowerCase();
  var id = String(itemId || '').trim();
  if (MEDIA_FUENTES.indexOf(f) === -1 || !MEDIA_ITEM_RE.test(id))
    return Promise.resolve({ ok: false });
  var base = function(autorId, albumDuenoId, destinoId) {
    return { ok: true, fuente: f, itemId: id, autorId: autorId || null, albumDuenoId: albumDuenoId || null, destinoId: destinoId || null };
  };
  var q;
  if (f === 'curada') {
    q = sqlFn('SELECT id, destino_id FROM destinos_fotos WHERE id::text=$1 LIMIT 1', [id])
      .then(function(r){ return r.length ? base(null, null, r[0].destino_id) : { ok: false }; });
  } else if (f === 'viajero_foto') {
    q = sqlFn(
      'SELECT id, usuario_id AS autor_id, destino_id FROM interacciones'
      + ' WHERE id::text=$1 AND tipo=\'foto\' AND activo=true'
      + ' AND (dims IS NULL OR NOT (dims ? \'voto_foto_id\')) LIMIT 1',
      [id]
    ).then(function(r){ return r.length ? base(r[0].autor_id, null, r[0].destino_id) : { ok: false }; });
  } else {
    q = sqlFn(
      'SELECT af.id, af.autor_original_id AS autor_id, a.usuario_id AS album_dueno_id'
      + ' FROM album_fotos af JOIN albumes a ON a.id = af.album_id'
      + ' WHERE af.id::text=$1 AND af.activo=true AND a.activo=true LIMIT 1',
      [id]
    ).then(function(r){ return r.length ? base(r[0].autor_id, r[0].album_dueno_id, null) : { ok: false }; });
  }
  return conDegradacionMedia(q, 'resolverMediaItem/' + f, { ok: false });
}

// Nucleo de voto (like/unlike) sobre media_votos con soft-delete. Devuelve
// {nuevo, reactivado, duplicado, tope, cooldown, faltan, xp, votos}.
// duplicado=true solo cuando ya existia un voto ACTIVO (el caller responde
// 409). Reactivar tras un unlike NO re-paga XP. Tope unificado de 20
// votos/24h. v27: XP decreciente con la carga reciente (se recarga a full a
// las 24h) y cooldown creciente con la carga.
function aplicarMediaVoto(sqlFn, usuarioId, fuente, itemId, accion) {
  var f = String(fuente || '').toLowerCase();
  var id = String(itemId || '').trim();
  function contar() {
    return conDegradacionMedia(
      sqlFn('SELECT COUNT(*)::int AS n FROM media_votos WHERE fuente=$1 AND item_id=$2 AND activo=true', [f, id]),
      'media_votos', [{ n: 0 }]
    ).then(function(r){ return (r[0] && parseInt(r[0].n, 10)) || 0; });
  }
  function base(extra) {
    return contar().then(function(v) {
      var out = { nuevo: false, reactivado: false, duplicado: false, tope: false, xp: 0, votos: v };
      Object.keys(extra || {}).forEach(function(k){ out[k] = extra[k]; });
      return out;
    });
  }
  return conDegradacionMedia(
    sqlFn('SELECT activo FROM media_votos WHERE usuario_id=$1 AND fuente=$2 AND item_id=$3 LIMIT 1', [usuarioId, f, id]),
    'media_votos', []
  ).then(function(prev) {
    if (accion === 'unlike') {
      if (prev.length && prev[0].activo) {
        return sqlFn('UPDATE media_votos SET activo=false, actualizado_en=NOW() WHERE usuario_id=$1 AND fuente=$2 AND item_id=$3', [usuarioId, f, id])
          .then(function(){ return base(); });
      }
      return base();
    }
    if (prev.length && prev[0].activo) return base({ duplicado: true });
    return conDegradacionMedia(
      sqlFn("SELECT COUNT(*)::int AS n, "
        + "COALESCE(SUM(GREATEST(0, 1 - EXTRACT(EPOCH FROM (NOW() - creado_en)) / 86400.0)), 0) AS carga, "
        + "MAX(creado_en) AS ult "
        + "FROM media_votos WHERE usuario_id=$1 AND creado_en > NOW() - INTERVAL '1 day'", [usuarioId]),
      'media_votos', [{ n: 0 }]
    ).then(function(cnt) {
      var filaVoto = cnt[0] || {};
      var nVotos = parseInt(filaVoto.n, 10) || 0;
      if (nVotos >= VOTOS_DIA_MAX) return base({ tope: true });
      // Energia ponderada por tiempo: cada voto pesa menos cuanto mas
      // antiguo, asi que la recompensa se recarga sola a full a las 24h.
      var carga = Number(filaVoto.carga);
      if (!isFinite(carga) || carga < 0) carga = 0;
      if (carga > VOTOS_DIA_MAX) carga = VOTOS_DIA_MAX;
      var cooldownSeg = Math.min(VOTO_COOLDOWN_MAX_SEG, Math.round(carga * VOTO_COOLDOWN_FACTOR));
      if (cooldownSeg > 0 && filaVoto.ult) {
        var ultMs = new Date(filaVoto.ult).getTime();
        if (isFinite(ultMs)) {
          var transcurridoSeg = (Date.now() - ultMs) / 1000;
          if (transcurridoSeg < cooldownSeg) {
            return base({ cooldown: true, faltan: Math.max(1, Math.ceil(cooldownSeg - transcurridoSeg)) });
          }
        }
      }
      var factorVoto = 1 - (carga / VOTO_DECAY_DIV);
      if (factorVoto < 0) factorVoto = 0;
      var xpBaseVoto = Math.round(XP_BASES.voto_media * factorVoto * 100) / 100;
      if (prev.length) {
        return sqlFn('UPDATE media_votos SET activo=true, actualizado_en=NOW() WHERE usuario_id=$1 AND fuente=$2 AND item_id=$3', [usuarioId, f, id])
          .then(function(){ return base({ reactivado: true }); });
      }
      return sqlFn('INSERT INTO media_votos (usuario_id, fuente, item_id, xp_ganado, activo) VALUES ($1,$2,$3,$4,true)', [usuarioId, f, id, xpBaseVoto])
        .then(async function() {
          var ctxVoto = await contextoXpE(sqlFn, usuarioId);
          var resVoto = await calcularXpAcreditado(sqlFn, xpBaseVoto,
            ctxVoto.nivel_clase, ctxVoto.clase_id, ctxVoto.tag,
            { nivel_usuario: ctxVoto.nivel_usuario });
          var xpVotoFinal = resVoto.xp_final;
          await sqlFn('UPDATE usuarios SET xp_total=xp_total+$1, ultimo_acceso=NOW() WHERE id=$2', [xpVotoFinal, usuarioId]).catch(function(){});
          await acreditarClaseYCofre(sqlFn, usuarioId, ctxVoto, xpVotoFinal);
          await registrarXpLedger(sqlFn, {
            usuario_id: usuarioId, accion: 'voto_media', xp_base: xpBaseVoto,
            mult_nivel: resVoto.m_nivel, mult_stack: resVoto.mult_stack,
            mult_final: resVoto.mult_global_c, cap_aplicado: resVoto.cap_aplicado,
            xp_final: xpVotoFinal, contexto: { fuente: f, item_id: id, carga: carga }
          });
          return base({ nuevo: true, xp: xpVotoFinal, xp_detalle: armarXpDetalle(xpBaseVoto, resVoto, 0) });
        });
    });
  });
}

// Votos + comentarios activos de un item (shape del GET media_interacciones).
function contarMedia(sqlFn, fuente, itemId) {
  var f = String(fuente || '').toLowerCase();
  var id = String(itemId || '').trim();
  var votosP = conDegradacionMedia(
    sqlFn('SELECT COUNT(*)::int AS n FROM media_votos WHERE fuente=$1 AND item_id=$2 AND activo=true', [f, id]),
    'media_votos', [{ n: 0 }]
  ).then(function(r){ return (r[0] && parseInt(r[0].n, 10)) || 0; });
  var comP = conDegradacionMedia(
    sqlFn('SELECT COUNT(*)::int AS n FROM media_comentarios WHERE fuente=$1 AND item_id=$2 AND activo=true', [f, id]),
    'media_comentarios', [{ n: 0 }]
  ).then(function(r){ return (r[0] && parseInt(r[0].n, 10)) || 0; });
  return Promise.all([votosP, comP]).then(function(par) {
    return { votos: par[0], comentarios: par[1] };
  });
}

// Metricas en lote (votos, comentarios, ya_votado, ya_guardado) para un
// conjunto de items de una misma fuente. Evita el N+1 en galeria_destino.
function cargarMetricasMedia(sqlFn, usuarioId, fuente, ids) {
  var out = { votos: {}, comentarios: {}, ya_votado: {}, ya_guardado: {} };
  if (!ids || !ids.length) return Promise.resolve(out);
  var votosP = conDegradacionMedia(
    sqlFn('SELECT item_id, COUNT(*)::int AS n FROM media_votos WHERE fuente=$1 AND activo=true AND item_id = ANY($2::text[]) GROUP BY item_id', [fuente, ids]),
    'media_votos', []
  );
  var comP = conDegradacionMedia(
    sqlFn('SELECT item_id, COUNT(*)::int AS n FROM media_comentarios WHERE fuente=$1 AND activo=true AND item_id = ANY($2::text[]) GROUP BY item_id', [fuente, ids]),
    'media_comentarios', []
  );
  var yaVotoP = usuarioId ? conDegradacionMedia(
    sqlFn('SELECT item_id FROM media_votos WHERE fuente=$1 AND activo=true AND usuario_id=$2 AND item_id = ANY($3::text[])', [fuente, usuarioId, ids]),
    'media_votos', []
  ) : Promise.resolve([]);
  var yaGuardadoP = usuarioId ? conDegradacionMedia(
    sqlFn('SELECT item_id FROM media_guardados WHERE fuente=$1 AND activo=true AND usuario_id=$2 AND item_id = ANY($3::text[])', [fuente, usuarioId, ids]),
    'media_guardados', []
  ) : Promise.resolve([]);
  return Promise.all([votosP, comP, yaVotoP, yaGuardadoP]).then(function(par) {
    (par[0] || []).forEach(function(r){ out.votos[String(r.item_id)] = parseInt(r.n, 10) || 0; });
    (par[1] || []).forEach(function(r){ out.comentarios[String(r.item_id)] = parseInt(r.n, 10) || 0; });
    (par[2] || []).forEach(function(r){ out.ya_votado[String(r.item_id)] = true; });
    (par[3] || []).forEach(function(r){ out.ya_guardado[String(r.item_id)] = true; });
    return out;
  });
}

// Voto de media con el contrato de los alias legacy: valida existencia y
// self-vote y devuelve un resultado tipificado {status, error, xp, votos}.
function registrarVotoMedia(sqlFn, usuarioId, fuente, itemId, noEncontrada) {
  return resolverMediaItem(sqlFn, fuente, itemId).then(function(target) {
    if (!target.ok) return { status: 404, error: noEncontrada || 'Media no encontrada' };
    if (target.autorId && String(target.autorId) === String(usuarioId))
      return { status: 403, error: 'No puedes votar tu propia foto' };
    return aplicarMediaVoto(sqlFn, usuarioId, fuente, itemId, 'like').then(function(r) {
      if (r.tope) return { status: 429, error: 'Limite de 20 votos por dia alcanzado' };
      if (r.cooldown) return { status: 429, error: 'Espera ' + r.faltan + 's para tu proximo voto' };
      if (r.duplicado) return { status: 409, error: 'Ya votaste esta foto', ya_votado: true };
      return { status: 200, xp: r.xp, votos: r.votos, ya_votado: true, reactivado: r.reactivado, xp_detalle: r.xp_detalle || undefined };
    });
  });
}

// Cierre comun de un voto: reparto de referidos + evaluacion de misiones y
// logros. Evita duplicar el mismo bloque en media_voto/album_voto/foto_voto.
function completarVotoMedia(sqlFn, usuarioId, r) {
  return repartirXpReferidos(sqlFn, usuarioId, r.xp).then(function() {
    return Promise.all([evaluarMisiones(sqlFn, usuarioId), evaluarLogros(sqlFn, usuarioId)]);
  }).then(function(ml) {
    return { ok: true, xp: r.xp, votos: r.votos, ya_votado: r.ya_votado, misiones: ml[0], logros: ml[1], xp_detalle: r.xp_detalle || undefined };
  });
}

// Arbol de comentarios con el mismo shape de comentarios_foto:
// nodo {id, foto_id, parent_id, padre_visible_id, nivel, texto, eliminado,
// creado_en, autor, es_mio, likes, ya_like, respuestas}. Compartido por
// comentarios_foto y media_comentarios.
function construirArbolComentarios(rows, usuarioId) {
  var porId = {};
  var hijos = {};
  (rows || []).forEach(function(r) {
    porId[String(r.id)] = r;
    hijos[String(r.id)] = [];
  });
  (rows || []).forEach(function(r) {
    var pid = r.parent_id ? String(r.parent_id) : null;
    if (pid && hijos[pid]) hijos[pid].push(String(r.id));
  });
  var memo = {};
  var conserva = function(id) {
    if (memo[id] !== undefined) return memo[id];
    var self = porId[id];
    if (self && self.activo) { memo[id] = true; return true; }
    memo[id] = false;
    var h = hijos[id] || [];
    for (var i = 0; i < h.length; i++) {
      if (conserva(h[i])) { memo[id] = true; break; }
    }
    return memo[id];
  };
  var total = 0;
  (rows || []).forEach(function(r) { if (r.activo) total++; });
  var flat = [];
  var armar = function(id, nivel, padreVisibleId) {
    var r = porId[id];
    var eliminado = !r.activo;
    var nodo = {
      id: r.id,
      foto_id: r.foto_id,
      parent_id: r.parent_id,
      padre_visible_id: padreVisibleId,
      nivel: nivel,
      texto: eliminado ? null : r.texto,
      eliminado: eliminado,
      creado_en: r.creado_en,
      autor: eliminado ? null : {
        id: r.usuario_id,
        nombre: r.autor_nombre || null,
        avatar: r.autor_avatar || '',
      },
      es_mio: !eliminado && !!usuarioId && String(r.usuario_id) === String(usuarioId),
      likes: eliminado ? 0 : (parseInt(r.likes, 10) || 0),
      ya_like: eliminado ? false : !!r.ya_like,
      respuestas: [],
    };
    flat.push({
      id: nodo.id, parent_id: nodo.parent_id,
      padre_visible_id: nodo.padre_visible_id, nivel: nodo.nivel,
    });
    (hijos[id] || []).forEach(function(hijoId) {
      if (conserva(hijoId)) nodo.respuestas.push(armar(hijoId, nivel + 1, r.id));
    });
    return nodo;
  };
  var arboles = [];
  (rows || []).forEach(function(r) {
    var id = String(r.id);
    if (!conserva(id)) return;
    var pid = r.parent_id ? String(r.parent_id) : null;
    var esRaiz = !pid || !porId[pid] || !conserva(pid);
    if (esRaiz) arboles.push(armar(id, 0, null));
  });
  return { total: total, data: arboles, flat: flat };
}

// Crea un comentario/respuesta sobre media unificada. Devuelve
// {ok:true, comentario, xp, misiones, logros} o {ok:false, status, error}.
// El caller resuelve antes la existencia de la media con resolverMediaItem.
function crearComentarioMedia(sqlFn, usuarioId, fuente, itemId, texto, parentId) {
  var f = String(fuente || '').toLowerCase();
  var id = String(itemId || '').trim();
  return queryConAvatarFallback(sqlFn,
    'SELECT id, nombre, __FOTO_URL__ AS avatar FROM usuarios WHERE id=$1 LIMIT 1',
    [usuarioId],
    ['COALESCE(foto_url, avatar_url, \'\')', 'COALESCE(avatar_url, \'\')']
  ).catch(function(){ return []; }).then(function(usr) {
    if (!usr.length) return { ok: false, status: 403, error: 'Usuario no registrado' };
    var cuerpo = String(texto || '').trim();
    if (!cuerpo) return { ok: false, status: 400, error: 'texto vacio' };
    if (cuerpo.length > 1000) return { ok: false, status: 400, error: 'texto maximo 1000 caracteres' };
    var parent = parentId || null;
    var validarPadre = Promise.resolve(null);
    if (parent) {
      validarPadre = conDegradacionMedia(
        sqlFn('SELECT id, fuente, item_id, activo FROM media_comentarios WHERE id=$1 LIMIT 1', [parent]),
        'media_comentarios', []
      ).then(function(pr) {
        if (!pr.length || !pr[0].activo) return { status: 404, error: 'Comentario padre no encontrado' };
        if (String(pr[0].fuente) !== f || String(pr[0].item_id) !== id)
          return { status: 400, error: 'parent_id no pertenece a esta media' };
        return null;
      });
    }
    return validarPadre.then(function(errPadre) {
      if (errPadre) return { ok: false, status: errPadre.status, error: errPadre.error };
      return conDegradacionMedia(
        sqlFn("SELECT COUNT(*)::int AS n FROM media_comentarios WHERE usuario_id=$1 AND creado_en > NOW() - INTERVAL '1 day'", [usuarioId]),
        'media_comentarios', [{ n: 0 }]
      ).then(function(cnt) {
        if (((cnt[0] && parseInt(cnt[0].n, 10)) || 0) >= 30)
          return { ok: false, status: 429, error: 'Limite de 30 comentarios por dia alcanzado' };
        return sqlFn(
          'INSERT INTO media_comentarios (usuario_id, fuente, item_id, parent_id, texto)'
          + ' VALUES ($1, $2, $3, $4, $5)'
          + ' RETURNING id, usuario_id, fuente, item_id, parent_id, texto, activo, creado_en',
          [usuarioId, f, id, parent, cuerpo]
        ).then(function(ins) {
          var row = ins[0];
          var nivelP = Promise.resolve(0);
          if (parent) {
            nivelP = conDegradacionMedia(
              sqlFn('WITH RECURSIVE anc AS ('
                + ' SELECT id, parent_id, 0 AS depth FROM media_comentarios WHERE id=$1'
                + ' UNION ALL'
                + ' SELECT a.id, a.parent_id, anc.depth + 1 FROM media_comentarios a JOIN anc ON a.id = anc.parent_id'
                + ') SELECT COALESCE(MAX(depth),0)::int AS d FROM anc', [parent]),
              'media_comentarios', []
            ).then(function(d){ return ((d[0] && parseInt(d[0].d, 10)) || 0) + 1; });
          }
          return nivelP.then(function(nivel) {
            return getProgresoAlbum(sqlFn, usuarioId).then(function(prog) {
              var h = hoy();
              var dia = (prog.comentarios_dia_fecha === h) ? (parseInt(prog.comentarios_dia, 10) || 0) : 0;
              var xp = dia < 10 ? XP_BASES.chat_comentario : 0;
              var xpComentarioEntregado = 0;
              var detalleComentario = null;
              // ADR-053 Dec 7 (v25): el cupo del chat/comentario es de 10
              // XP/dia, por eso la fila del ledger va con cap_aplicado
              // 'accion' (el invariante multiplicativo no aplica a este cap
              // denominado en XP; xp_final es lo realmente acreditado).
              var aplicar = xp > 0
                ? contextoXpE(sqlFn, usuarioId).then(async function(ctxComentario) {
                    var resCom = await calcularXpAcreditado(sqlFn, XP_BASES.chat_comentario,
                      ctxComentario.nivel_clase, ctxComentario.clase_id, ctxComentario.tag,
                      { nivel_usuario: ctxComentario.nivel_usuario });
                    xpComentarioEntregado = resCom.xp_final;
                    detalleComentario = armarXpDetalle(XP_BASES.chat_comentario, resCom, 0, xpComentarioEntregado, 'accion');
                    await sqlFn('UPDATE usuarios SET xp_total = xp_total + $1, ultimo_acceso = NOW() WHERE id=$2', [xpComentarioEntregado, usuarioId]).catch(function(){});
                    await acreditarClaseYCofre(sqlFn, usuarioId, ctxComentario, xpComentarioEntregado);
                    await repartirXpReferidos(sqlFn, usuarioId, xpComentarioEntregado);
                    await updProgresoAlbum(sqlFn, usuarioId, { comentarios_dia: dia + 1, comentarios_dia_fecha: h });
                    await registrarXpLedger(sqlFn, {
                      usuario_id: usuarioId, accion: 'chat_comentario', xp_base: XP_BASES.chat_comentario,
                      mult_nivel: resCom.m_nivel, mult_stack: resCom.mult_stack,
                      mult_final: resCom.mult_global_c, cap_aplicado: 'accion',
                      xp_final: xpComentarioEntregado, contexto: { fuente: f, item_id: id, canal: 'comentario_media' }
                    });
                  })
                : Promise.resolve();
              return aplicar.then(function() {
                return Promise.all([evaluarMisiones(sqlFn, usuarioId), evaluarLogros(sqlFn, usuarioId)]);
              }).then(function(ml) {
                return {
                  ok: true,
                  comentario: {
                    id: row.id,
                    foto_id: row.item_id,
                    parent_id: row.parent_id,
                    padre_visible_id: parent || null,
                    nivel: nivel,
                    texto: row.texto,
                    eliminado: false,
                    creado_en: row.creado_en,
                    autor: { id: usuarioId, nombre: usr[0].nombre || null, avatar: usr[0].avatar || '' },
                    es_mio: true,
                    likes: 0,
                    ya_like: false,
                    respuestas: [],
                  },
                  xp: xpComentarioEntregado,
                  xp_detalle: detalleComentario || undefined,
                  misiones: ml[0],
                  logros: ml[1],
                };
              });
            });
          });
        });
      });
    });
  });
}

// Contador degradable de comparticiones del usuario (misiones/logros de
// compartir, ADR-036 B). Degrada a 0 si falta la migracion 022.
function contarCompartidosUsuario(sqlFn, usuarioId) {
  if (!usuarioId) return Promise.resolve(0);
  return sqlFn('SELECT COUNT(*)::int AS n FROM media_compartidos WHERE usuario_id=$1', [usuarioId])
    .then(function(r){ return (r[0] && parseInt(r[0].n, 10)) || 0; })
    .catch(function(e) {
      if (e && (e.code === '42P01' || e.code === '42703')) {
        console.warn('TRACE: media_compartidos ausente (migracion 022); contador degradado a 0');
        return 0;
      }
      throw e;
    });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    var sql = neon(process.env.DATABASE_URL);

    // -- GET ----------------------------------------------------------
    if (req.method === 'GET') {
      var tipo     = req.query.tipo       || null;
      var destinoId= req.query.destino_id || null;
      var usuarioId= req.query.usuario_id || null;

      // Entrega 016 (Wayfarer): nonce anti-replay para checkins
      // geolocalizados (ADR-025). GET segun la matriz del contrato; el
      // nonce es de un solo uso y expira en 2 minutos.
      if (tipo === 'geo_nonce_solicitar') {
        if (!usuarioId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var gnNonce = crypto.randomBytes(32).toString('hex');
        var gnFilas = await sql(
          'INSERT INTO geo_nonces (usuario_id, proposito, nonce, expira_en) '
          + 'VALUES ($1, \'checkin\', $2, NOW() + INTERVAL \'2 minutes\') RETURNING nonce, expira_en',
          [usuarioId, gnNonce]
        );
        return res.json({ ok: true, data: { nonce: gnFilas[0].nonce, expira_en: gnFilas[0].expira_en } });
      }

      // Entrega 016 (Wayfarer): cola de propuestas pendientes para
      // votar, excluyendo las del propio usuario. El estado leido se
      // deriva: el quorum (+/-3) manda sobre la columna estado real; si
      // no hay quorum y pasaron 30 dias (sin actividad de votos o sin
      // propuesta nueva) la propuesta se lee como rechazada.
      if (tipo === 'activos_ocultos_pendientes') {
        var esAdminAo = (req.headers.authorization || '').slice(7)
          === (process.env.ADMIN_SECRET || 'exploraco12345');
        if (!usuarioId && !esAdminAo)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var aoPend = await sql(
          'SELECT a.id, a.nombre, a.descripcion, a.lat, a.lng, a.foto_url, '
          + 'a.categoria, a.ciudad, a.creado_en, a.votos_favor, a.votos_contra, '
          + 'a.propuesto_por, u.nombre AS propuesto_por_nombre, '
          + 'CASE WHEN (SELECT MAX(v.creado_en) FROM activos_ocultos_votos v '
          + '   WHERE v.activo_id = a.id) IS NOT NULL '
          + '  AND (SELECT MAX(v.creado_en) FROM activos_ocultos_votos v '
          + '   WHERE v.activo_id = a.id) < NOW() - INTERVAL \'30 days\' THEN \'rechazado\' '
          + 'WHEN (SELECT MAX(v.creado_en) FROM activos_ocultos_votos v '
          + '   WHERE v.activo_id = a.id) IS NULL '
          + '  AND a.creado_en < NOW() - INTERVAL \'30 days\' THEN \'rechazado\' '
          + 'ELSE \'pendiente\' END AS estado_leido '
          + 'FROM activos_ocultos a '
          + 'LEFT JOIN usuarios u ON a.propuesto_por = u.id '
          + 'WHERE a.estado = \'pendiente\' AND a.activo = true '
          + 'AND ($1::uuid IS NULL OR a.propuesto_por <> $1) '
          + 'ORDER BY a.creado_en ASC LIMIT 50',
          [usuarioId || null]
        );
        aoPend.forEach(function(x) { x.estado = x.estado_leido; });
        return res.json({ ok: true, data: aoPend });
      }

      // Resenas de un destino
      if (tipo === 'resenas' && destinoId) {
        var rows = await sql(
          'SELECT i.id, i.rating, i.texto, i.creado_en, i.dims, i.traveller_type, '
          + 'u.nombre AS usuario_nombre, u.badge_actual '
          + 'FROM interacciones i '
          + 'LEFT JOIN usuarios u ON i.usuario_id = u.id '
          + 'WHERE i.destino_id = $1 AND i.tipo = \'resena\' '
          + 'ORDER BY i.creado_en DESC '
          + 'LIMIT 20',
          [destinoId]
        );
        return res.status(200).json({ ok: true, data: rows });
      }

      // Promedios de dimensiones de un destino (para las barras de puntuacion)
      if (tipo === 'dims_avg' && destinoId) {
        var dimsAvgRows = await sql(
          'SELECT '
          + 'ROUND(AVG(NULLIF(dims->>\'experiencia\',\'\')::numeric),1) AS experiencia, '
          + 'ROUND(AVG(NULLIF(dims->>\'guias\',\'\')::numeric),1) AS guias, '
          + 'ROUND(AVG(NULLIF(dims->>\'acceso\',\'\')::numeric),1) AS acceso, '
          + 'ROUND(AVG(NULLIF(dims->>\'valor\',\'\')::numeric),1) AS valor, '
          + 'ROUND(AVG(NULLIF(dims->>\'vistas\',\'\')::numeric),1) AS vistas, '
          + 'ROUND(AVG(NULLIF(dims->>\'seguridad\',\'\')::numeric),1) AS seguridad '
          + 'FROM interacciones '
          + 'WHERE destino_id=$1 AND tipo=\'resena\' AND dims IS NOT NULL AND dims != \'{}\'::jsonb',
          [destinoId]
        );
        return res.status(200).json({ ok: true, data: dimsAvgRows[0] || {} });
      }

      // Fotos de viajeros de un destino (con conteo de votos y marca
      // ya_votado para el usuario actual). Las fotos son interacciones
      // tipo='foto'; desde v19 (ADR-036) los votos viven en media_votos
      // (fuente='viajero_foto'), ya no como filas interacciones con
      // dims->>'voto_foto_id'.
      if (tipo === 'fotos' && destinoId) {
        var fotosRows = await conDegradacionMedia(sql(
          'SELECT f.id, f.texto AS url, f.creado_en, u.nombre AS autor_nombre, '
          + '(SELECT COUNT(*)::int FROM media_votos mv '
          + '  WHERE mv.fuente=\'viajero_foto\' AND mv.activo=true AND mv.item_id = f.id::text) AS votos '
          + 'FROM interacciones f LEFT JOIN usuarios u ON u.id = f.usuario_id '
          + 'WHERE f.destino_id=$1 AND f.tipo=\'foto\' AND f.activo=true '
          + 'AND (f.dims IS NULL OR NOT (f.dims ? \'voto_foto_id\')) '
          + 'ORDER BY f.creado_en DESC LIMIT 60',
          [destinoId]
        ), 'media_votos', []);
        var yaVotoFotos = {};
        if (usuarioId) {
          var misVotosFotos = await conDegradacionMedia(sql(
            'SELECT item_id AS foto_id FROM media_votos '
            + 'WHERE usuario_id=$1 AND fuente=\'viajero_foto\' AND activo=true',
            [usuarioId]
          ), 'media_votos', []);
          misVotosFotos.forEach(function(v){ if (v.foto_id) yaVotoFotos[String(v.foto_id)] = true; });
        }
        fotosRows.forEach(function(r){ r.ya_votado = !!yaVotoFotos[String(r.id)]; });
        return res.status(200).json({ ok: true, data: fotosRows });
      }

      // Guardados de un usuario
      if (tipo === 'guardados' && usuarioId) {
        var guardados = await sql(
          'SELECT i.destino_id, d.nombre, d.slug, d.foto_hero, d.ciudad, d.categoria_slug'
          + ' FROM interacciones i'
          + ' JOIN destinos d ON d.id = i.destino_id'
          + ' WHERE i.usuario_id = $1 AND i.tipo = \'guardado\' AND i.activo = true'
          + '   AND d.status = \'published\''
          + ' ORDER BY i.creado_en DESC',
          [usuarioId]
        );
        return res.status(200).json({ ok: true, data: guardados });
      }

      // Esta guardado?
      if (tipo === 'is_guardado' && destinoId && usuarioId) {
        var check = await sql(
          'SELECT id FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'guardado\' AND activo=true LIMIT 1',
          [destinoId, usuarioId]
        );
        return res.status(200).json({ ok: true, guardado: check.length > 0 });
      }

      // Mapa de un usuario: guardados activos + visitas confirmadas.
      // Devuelve en data.{guardados, visitados} los destinos COMPLETOS
      // (JOIN destinos, d.id AS destino_id), no solo UUIDs -- fix del
      // spec 'mapas publicos/privados' (2026-09-05): mi-perfil.html
      // espera objetos para _hidratarGuardadosDB/cargarMiMapa. Mismo
      // patron de columnas que tipo=guardados mas lat/lng para el mapa.
      if (tipo === 'mapa' && usuarioId) {
        var mapaGuardados = await sql(
          'SELECT DISTINCT d.id AS destino_id, d.nombre, d.slug, d.foto_hero, d.ciudad, d.categoria_slug, d.lat, d.lng, '
          + ' d.tags->>\'subcategoria\' AS subcategoria'
          + ' FROM interacciones i'
          + ' JOIN destinos d ON d.id = i.destino_id'
          + ' WHERE i.usuario_id = $1 AND i.tipo = \'guardado\' AND i.activo = true'
          + '   AND d.status = \'published\'',
          [usuarioId]
        );
        var mapaVisitas = await sql(
          'SELECT DISTINCT d.id AS destino_id, d.nombre, d.slug, d.foto_hero, d.ciudad, d.categoria_slug, d.lat, d.lng, '
          + ' d.tags->>\'subcategoria\' AS subcategoria'
          + ' FROM interacciones i'
          + ' JOIN destinos d ON d.id = i.destino_id'
          + ' WHERE i.usuario_id = $1 AND i.tipo = \'visita\' AND i.activo = true'
          + '   AND d.status = \'published\'',
          [usuarioId]
        );
        return res.status(200).json({
          ok: true,
          data: {
            guardados: mapaGuardados,
            visitados: mapaVisitas
          }
        });
      }

      // Voto del usuario en un destino (resena o voto rapido sin texto)
      if (tipo === 'mi_rating' && destinoId && usuarioId) {
        var miVoto = await sql(
          'SELECT rating, tipo FROM interacciones '
          + 'WHERE destino_id=$1 AND usuario_id=$2 '
          + 'AND tipo IN (\'resena\',\'rating\') '
          + 'ORDER BY (tipo=\'resena\') DESC LIMIT 1',
          [destinoId, usuarioId]
        );
        return res.status(200).json({ ok: true, voto: miVoto.length > 0 ? miVoto[0] : null });
      }

      // Catalogo de logros del usuario (v5): estado, fecha, tier y
      // rareza global estilo Steam (% de usuarios activos que lo
      // desbloquearon). Una query agregada con jsonb_object_keys.
      // v7: backfill retroactivo antes de leer el progreso, para
      // registrar logros ya alcanzados que quedaron sin persistir.
      if (tipo === 'logros' && usuarioId) {
        var usrLogros = await sql(
          'SELECT progreso_logros FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        if (!usrLogros.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });

        await evaluarLogros(sql, usuarioId);

        var usrLogros2 = await sql(
          'SELECT progreso_logros FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        var progresoLogros = usrLogros2[0].progreso_logros || {};

        var rareza = await rarezaLogrosGlobal(sql);

        var resLogros = entregarCatalogo(LOGROS, progresoLogros, function(fila, l) {
          fila.tier = l.tier;
          fila.emoji = l.emoji;
          fila.rareza_pct = rareza[l.id] != null ? rareza[l.id] : 0;
        });
        return res.status(200).json({
          ok: true,
          data: resLogros.data,
          desbloqueados: resLogros.desbloqueados,
          total: LOGROS.length,
        });
      }

      // Catalogo de misiones del usuario (v7): estado y fecha por mision,
      // con el mismo patron que tipo=logros. Backfill retroactivo via
      // evaluarMisiones() antes de leer el progreso persistido.
      if (tipo === 'misiones' && usuarioId) {
        var usrMis = await sql(
          'SELECT progreso_misiones FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        if (!usrMis.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });

        await evaluarMisiones(sql, usuarioId);

        var usrMis2 = await sql(
          'SELECT progreso_misiones FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        var progresoMisiones = usrMis2[0].progreso_misiones || {};
        // ADR-040 (B, v22): campos ADITIVOS de nivel/gate para el acordeon.
        // gate_nivel y nivel = gate efectivo (catalogo o MISION_GATE_XP);
        // desbloquea ya viaja en la fila base de entregarCatalogo.
        var resMisiones = entregarCatalogo(MISIONES, progresoMisiones, function(fila, m) {
          var nivel = nivelDeMisionServidor(m);
          fila.gate_nivel = nivel;
          fila.nivel = nivel;
        });
        return res.status(200).json({
          ok: true,
          data: resMisiones.data,
          desbloqueadas: resMisiones.desbloqueados,
          total: MISIONES.length,
        });
      }

      // Mapas tematicos del usuario (spec mapas publicos/privados
      // 2026-09-05): id, nombre, emoji, descripcion, publico, creado_en
      // y conteo de destinos por mapa (LEFT JOIN + GROUP BY).
      if (tipo === 'mapas_mios' && usuarioId) {
        var mapasMios = await sql(
          'SELECT m.id, m.nombre, m.emoji, m.descripcion, m.publico, m.creado_en,'
          + ' COALESCE(COUNT(md.destino_id),0)::int AS n_destinos'
          + ' FROM mapas m'
          + ' LEFT JOIN mapa_destinos md ON md.mapa_id = m.id'
          + ' WHERE m.usuario_id = $1'
          + ' GROUP BY m.id'
          + ' ORDER BY m.creado_en DESC',
          [usuarioId]
        );
        return res.status(200).json({ ok: true, data: mapasMios });
      }

      // Catalogo publico: mapas publicos recientes (publico=true,
      // ORDER BY creado_en DESC, LIMIT 50). Incluye autor
      // (usuarios.nombre) y conteo de destinos.
      if (tipo === 'mapas_publicos') {
        var mapasPublicos = await sql(
          'SELECT m.id, m.nombre, m.emoji, m.descripcion, m.creado_en,'
          + ' u.nombre AS autor,'
          + ' COALESCE(COUNT(md.destino_id),0)::int AS n_destinos'
          + ' FROM mapas m'
          + ' JOIN usuarios u ON u.id = m.usuario_id'
          + ' LEFT JOIN mapa_destinos md ON md.mapa_id = m.id'
          + ' WHERE m.publico = true'
          + ' GROUP BY m.id, u.nombre'
          + ' ORDER BY m.creado_en DESC'
          + ' LIMIT 50'
        );
        return res.status(200).json({ ok: true, data: mapasPublicos });
      }

      // Detalle de un mapa tematico: mapa + destinos completos (JOIN
      // destinos con lat/lng para el mapa publico). Si el mapa es
      // privado solo el dueno (usuario_id) puede verlo; un tercero
      // recibe 'No autorizado' (equivalente 404, spec 2026-09-05).
      if (tipo === 'mapa_detalle') {
        var mapaDetalleId = req.query.id || null;
        if (!mapaDetalleId)
          return res.status(400).json({ ok: false, error: 'id requerido' });
        var mapaDetalleRows = await sql(
          'SELECT m.id, m.usuario_id, m.nombre, m.emoji, m.descripcion, m.publico, m.creado_en, m.actualizado_en,'
          + ' u.nombre AS autor'
          + ' FROM mapas m'
          + ' JOIN usuarios u ON u.id = m.usuario_id'
          + ' WHERE m.id = $1 LIMIT 1',
          [mapaDetalleId]
        );
        if (!mapaDetalleRows.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });
        var mapaDetalle = mapaDetalleRows[0];
        if (!mapaDetalle.publico) {
          if (!usuarioId || usuarioId !== mapaDetalle.usuario_id)
            return res.status(403).json({ ok: false, error: 'No autorizado' });
        }
        var mapaDestinos = await sql(
          'SELECT d.id AS destino_id, d.nombre, d.slug, d.foto_hero, d.ciudad, d.categoria_slug, d.lat, d.lng, '
          + ' d.tags->>\'subcategoria\' AS subcategoria'
          + ' FROM mapa_destinos md'
          + ' JOIN destinos d ON d.id = md.destino_id'
          + ' WHERE md.mapa_id = $1'
          + ' ORDER BY md.orden, md.creado_en',
          [mapaDetalleId]
        );
        return res.status(200).json({ ok: true, data: { mapa: mapaDetalle, destinos: mapaDestinos } });
      }

      // Reverse lookup de mapas (ADR-034): dado un destino (destino_id
      // uuid o slug), devuelve los mapas tematicos que lo incluyen. La
      // visibilidad se filtra SQL-side: los publicos para cualquiera y
      // los privados solo para su dueno. El viewer ($2) NUNCA sale de un
      // query param crudo: el candidato es req.query.usuario_id y solo se
      // acepta si validarSesion() confirma la firma JWT (patron
      // dm_hilos/museo_publico, ADR-025). Sin sesion valida viewer=null
      // (m.usuario_id = NULL nunca es true) y solo se devuelven publicos.
      if (tipo === 'mapas_de_destino') {
        var mdSlug = req.query.slug ? String(req.query.slug) : null;
        var mdDestinoId = destinoId ? String(destinoId) : null;
        if (!mdDestinoId && !mdSlug)
          return res.status(400).json({ ok: false, error: 'destino_id o slug requerido' });
        if (mdDestinoId
          && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(mdDestinoId))
          return res.status(400).json({ ok: false, error: 'destino_id invalido' });
        if (!mdDestinoId && !/^[a-z0-9-]{3,}$/.test(mdSlug))
          return res.status(400).json({ ok: false, error: 'slug invalido' });

        var mdDestRes = mdDestinoId
          ? await sql('SELECT id FROM destinos WHERE id = $1::uuid LIMIT 1', [mdDestinoId])
          : await sql('SELECT id FROM destinos WHERE slug = $1 LIMIT 1', [mdSlug]);
        if (!mdDestRes.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });
        var mdDestino = mdDestRes[0].id;

        var mdViewer = null;
        if (usuarioId) {
          var mdViewerCand = String(usuarioId);
          if (validarSesion(req, mdViewerCand).ok) mdViewer = mdViewerCand;
        }

        var mdMapas = await sql(
          'SELECT m.id, m.nombre, m.emoji, m.descripcion, m.publico,'
          + ' (m.usuario_id = $2::uuid) AS es_mio,'
          + ' (SELECT COUNT(*)::int FROM mapa_destinos md2 WHERE md2.mapa_id = m.id) AS n_destinos'
          + ' FROM mapas m'
          + ' JOIN mapa_destinos md ON md.mapa_id = m.id'
          + ' WHERE md.destino_id = $1'
          + '   AND (m.publico = true OR m.usuario_id = $2::uuid)'
          + ' ORDER BY m.publico DESC, m.creado_en DESC',
          [mdDestino, mdViewer]
        );
        return res.status(200).json({ ok: true, data: mdMapas });
      }

      // Salas de chat (espec comunidad 2026-09-08): lista de salas activas
      // con el ultimo mensaje, su autor y el total de mensajes (para el
      // listado estilo "room"). El contador de "online" es decorativo en
      // el frontend (sin websockets en Vercel Hobby); aqui solo se sirve
      // el dato de contenido.
      if (tipo === 'chat_salas') {
        var chatSalasSql = function (conOficial) {
          return 'SELECT s.id, s.nombre, s.icono, s.descripcion, s.tipo, '
            + (conOficial ? 's.es_oficial,' : 'false AS es_oficial,')
            + ' s.creador_id, s.creado_en,'
            + ' (SELECT m.texto FROM chat_mensajes m'
            + '   WHERE m.sala_id = s.id AND m.activo = true ORDER BY m.creado_en DESC LIMIT 1) AS ultimo_texto,'
            + ' (SELECT COALESCE(NULLIF(m.nombre,\'\'), u.nombre, \'Viajero\') FROM chat_mensajes m'
            + '   LEFT JOIN usuarios u ON u.id = m.usuario_id'
            + '   WHERE m.sala_id = s.id AND m.activo = true ORDER BY m.creado_en DESC LIMIT 1) AS ultimo_usuario,'
            + ' (SELECT COUNT(*)::int FROM chat_mensajes m'
            + '   WHERE m.sala_id = s.id AND m.activo = true) AS total_mensajes'
            + ' FROM chat_salas s'
            + ' WHERE s.activo = true AND (s.tipo IS NULL OR s.tipo NOT IN (\'plan\',\'dm\'))'
            + ' ORDER BY s.orden DESC, s.creado_en ASC';
        };
        var salasRows;
        try {
          salasRows = await sql(chatSalasSql(true), []);
        } catch (salasErr) {
          if (salasErr && salasErr.code === '42703') {
            console.warn('[chat_salas] es_oficial ausente (026 pendiente): fallback sin es_oficial');
            salasRows = await sql(chatSalasSql(false), []);
          } else {
            throw salasErr;
          }
        }
        return res.status(200).json({ ok: true, data: salasRows });
      }

      // Mensajes de una sala (espec comunidad 2026-09-08): ultimos 100,
      // mas recientes primero; el frontend los invierte para mostrar en
      // orden cronologico.
      if (tipo === 'chat_mensajes' && req.query.sala_id) {
        var msgsRows = await sql(
          'SELECT m.id, m.usuario_id, m.texto, m.fijado, m.creado_en,'
          + ' COALESCE(NULLIF(m.nombre,\'\'), u.nombre, \'Viajero\') AS nombre,'
          + ' COALESCE(u.avatar_url, \'\') AS avatar_url'
          + ' FROM chat_mensajes m'
          + ' LEFT JOIN usuarios u ON u.id = m.usuario_id'
          + ' WHERE m.sala_id = $1 AND m.activo = true'
          + '   AND NOT EXISTS (SELECT 1 FROM chat_salas cs'
          + '     WHERE cs.id = m.sala_id AND cs.tipo IN (\'plan\',\'dm\'))'
          + ' ORDER BY m.creado_en DESC'
          + ' LIMIT 100',
          [req.query.sala_id]
        );
        return res.status(200).json({ ok: true, data: msgsRows });
      }

      // Perfil publico "Museo" (TSK-103 / ADR-028, WP-3): UN solo GET con
      // todo el perfil (usuario + vitrina + logros + cromos + albumes +
      // mapa + parche + stats + arbol) para evitar 5 round-trips. Respeta
      // perfil_publico (migracion 017): si es privado y quien pide no es
      // el dueno (sesion JWT, ADR-025) responde 403 PERFIL_PRIVADO con el
      // minimo. Nunca expone email, email_token, device_hashes,
      // codigo_referido ni referido_por. El arbol entra como arbol (WP-4,
      // solo lectura). NO otorga XP ni reparte referidos.
      if (tipo === 'museo_publico' && (req.query.usuario_id || req.query.id)) {
        var mpId = String(req.query.usuario_id || req.query.id || '');
        // Migracion 004 pendiente: si usuarios.foto_url aun no existe en
        // Neon (42703), el museo publico reintenta por query con
        // avatar_url AS foto_url y responde 200 en vez del 503 global.
        // El resto de la rama (incluido el 403 PERFIL_PRIVADO) no cambia.
        var mpRows = await queryConAvatarFallback(
          sql,
          'SELECT id, nombre, __FOTO_URL__ AS foto_url, avatar_url, bio, ciudad_base, pais_base, creado_en,'
          + ' xp_total, faccion, casa, capacidades, progreso_logros, perfil_publico, dm_abierto,'
          + ' perfil_config'
          + ' FROM usuarios WHERE id=$1 AND activo=true LIMIT 1',
          [mpId],
          ['foto_url', 'avatar_url AS foto_url']
        );
        if (!mpRows.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var mpU = mpRows[0];
        var mpCalc = calcularNivelLocal(numXp(mpU.xp_total));
        var mpNivel = mpCalc.nivel;
        var mpEsPublico = (mpU.perfil_publico !== false);
        if (!mpEsPublico) {
          // Dueno: unico autorizado a leer un museo privado. Se exige la
          // sesion firmada de ese mismo usuario, no un parametro de query.
          var mpSes = validarSesion(req, mpId);
          if (!mpSes.ok) {
            return res.status(403).json({
              ok: false,
              error: 'PERFIL_PRIVADO',
              data: { nombre: mpU.nombre, nivel: mpNivel },
            });
          }
        }
        var mpCaps = mpU.capacidades || {};
        // Valores DESCRIPTIVOS (WP-3, TSK-103 / ADR-028): perfil.html pinta
        // el museo segun el string, no segun un booleano. null = sin mejora.
        // WP-6 (TSK-103 / ADR-028): la vitrina se EXTIENDE en solo lectura
        // con lo persistido en usuarios.perfil_config (titulo/fondo/
        // destacados). Degrada a null/[] si la migracion 017 no esta
        // aplicada o el campo falta; no expone ninguna otra clave.
        var mpPerfil = mpU.perfil_config || {};
        var mpVitrina = {
          marco: perfilPosee(mpCaps, 'perfil_marco_dorado') ? 'dorado' : (perfilPosee(mpCaps, 'perfil_marco_plata') ? 'plata' : null),
          tema: perfilPosee(mpCaps, 'perfil_tema_oscuro') ? 'oscuro' : null,
          banda: perfilPosee(mpCaps, 'perfil_banda_artista') ? 'Artista' : null,
          titulo: (typeof mpPerfil.titulo === 'string') ? mpPerfil.titulo : null,
          fondo: (typeof mpPerfil.fondo === 'string') ? mpPerfil.fondo : null,
          destacados: Array.isArray(mpPerfil.destacados) ? mpPerfil.destacados : [],
        };
        var mpRareza = await rarezaLogrosGlobal(sql);
        var mpProgreso = mpU.progreso_logros || {};
        var mpLogros = [];
        LOGROS.forEach(function(l) {
          var st = mpProgreso[l.id];
          if (st && st.estado === 'completada') {
            mpLogros.push({
              id: l.id, nombre: l.nombre, tier: l.tier,
              rareza_pct: mpRareza[l.id] != null ? mpRareza[l.id] : 0,
              desbloqueado_en: st.en || null,
            });
          }
        });
        var mpCromos = await sql(
          'SELECT cc.id AS clave, cc.nombre, cc.rareza, uc.cantidad'
          + ' FROM usuarios_cromos uc JOIN cromos_catalogo cc ON cc.id = uc.cromo_id'
          + ' WHERE uc.usuario_id=$1 ORDER BY cc.rareza DESC, uc.obtenido_en DESC LIMIT 200',
          [mpId]
        ).catch(function(){ return []; });
        var mpAlbumes = await sql(
          'SELECT a.id, a.titulo, a.tipo, a.portada_url,'
          + ' (SELECT COUNT(*)::int FROM album_fotos af WHERE af.album_id=a.id AND af.activo=true AND af.visible=true) AS total_fotos,'
          + ' (SELECT COUNT(*)::int FROM album_fotos af2 JOIN media_votos mv ON mv.item_id=af2.id::text'
          + '   WHERE mv.fuente=\'album_foto\' AND mv.activo=true AND af2.album_id=a.id AND af2.visible=true) AS votos'
          + ' FROM albumes a WHERE a.usuario_id=$1 AND a.activo=true'
          + ' ORDER BY a.creado_en DESC LIMIT 12',
          [mpId]
        ).catch(function(){ return []; });
        var mpMapa = await sql(
          'SELECT i.destino_id, d.slug, d.nombre, d.ciudad, d.lat, d.lng'
          + ' FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
          + ' WHERE i.usuario_id=$1 AND i.tipo=\'visita\' AND i.activo=true'
          + ' ORDER BY i.creado_en DESC LIMIT 200',
          [mpId]
        ).catch(function(){ return []; });
        var mpParcheRows = await sql(
          'SELECT p.id, p.nombre, p.fama_total FROM pandillas p'
          + ' JOIN pandillas_miembros pm ON pm.pandilla_id=p.id'
          + ' WHERE pm.usuario_id=$1 AND pm.activo=true AND p.activo=true LIMIT 1',
          [mpId]
        ).catch(function(){ return []; });
        var mpStatsRows = await sql(
          'SELECT'
          + ' (SELECT COUNT(*)::int FROM interacciones WHERE usuario_id=$1 AND tipo=\'visita\' AND activo=true) AS visitas,'
          + ' (SELECT COUNT(*)::int FROM interacciones WHERE usuario_id=$1 AND tipo=\'resena\' AND activo=true) AS resenas,'
          + ' (SELECT COUNT(*)::int FROM interacciones WHERE usuario_id=$1 AND tipo=\'foto\' AND activo=true) AS fotos,'
          + ' (SELECT COUNT(*)::int FROM albumes WHERE usuario_id=$1 AND activo=true) AS albumes,'
          + ' (SELECT COUNT(*)::int FROM usuarios WHERE referido_por=$1) AS referidos_directos',
          [mpId]
        ).catch(function(){ return []; });
        var mpStats = mpStatsRows[0] || { visitas: 0, resenas: 0, fotos: 0, albumes: 0, referidos_directos: 0 };
        // Sala de Clases (WP-4): arbol en SOLO LECTURA. No persiste fechas
        // (quien mira no es necesariamente el dueno) y reusa la MISMA
        // funcion de calculo del GET arbol_usuario (No-Duplicidad). Si el
        // calculo falla, degrada a la faccion sin ramas.
        var mpArbol = { faccion: mpU.faccion || null, ramas: [] };
        try {
          var mpArbolCalc = await calcularArbolUsuario(sql, mpId);
          mpArbol = {
            faccion: mpArbolCalc.faccion,
            ramas: mpArbolCalc.ramas.map(function(r) {
              var lvl = Math.max(1, Math.min(RAMA_TIERS_NOMBRES.length, parseInt(r.nivel_nodo, 10) || 1));
              return {
                rama_id: r.id, faccion: r.faccion, nombre: r.nombre,
                puntos: r.puntos, tier: RAMA_TIERS_NOMBRES[lvl - 1],
                nodos_desbloqueados: (r.nodos_desbloqueados || []).length,
              };
            }),
          };
        } catch (eArbol) {
          console.warn('TRACE: museo_publico sin arbol: ' + (eArbol && eArbol.message));
        }
        // Cache publico solo para museos publicos (nunca se cachea el 403).
        if (mpEsPublico)
          res.setHeader('Cache-Control', 'public, s-maxage=60');
        return res.status(200).json({
          ok: true,
          data: {
            usuario: {
              id: mpU.id,
              nombre: mpU.nombre,
              foto_url: mpU.foto_url || null,
              avatar_url: mpU.avatar_url || null,
              bio: mpU.bio || null,
              ciudad_base: mpU.ciudad_base || null,
              pais_base: mpU.pais_base || null,
              creado_en: mpU.creado_en,
              nivel: mpNivel,
              badge_actual: BADGES_LOCAL[mpNivel - 1] || mpCalc.badge_actual,
              era: calcularEraLocal(mpNivel),
              faccion: mpU.faccion || null,
              casa: mpU.casa || null,
              xp_total: red2(numXp(mpU.xp_total)),
              perfil_publico: mpEsPublico,
              dm_abierto: mpU.dm_abierto !== false,
            },
            vitrina: mpVitrina,
            logros: mpLogros,
            cromos: mpCromos,
            albumes: mpAlbumes,
            mapa: mpMapa,
            arbol: mpArbol,
            parche: mpParcheRows.length
              ? { id: mpParcheRows[0].id, nombre: mpParcheRows[0].nombre, fama_total: red2(numXp(mpParcheRows[0].fama_total)) }
              : null,
            stats: {
              visitas: parseInt(mpStats.visitas, 10) || 0,
              resenas: parseInt(mpStats.resenas, 10) || 0,
              fotos: parseInt(mpStats.fotos, 10) || 0,
              albumes: parseInt(mpStats.albumes, 10) || 0,
              referidos_directos: parseInt(mpStats.referidos_directos, 10) || 0,
            },
          },
        });
      }

      // Museo multimedia URL-only (ADR-039 C, v22): lista los recursos
      // (album_fotos) de un usuario con VISIBILIDAD SERVER-SIDE. Quien no
      // sea el dueno con sesion firmada solo ve af.visible=true; el dueno
      // ve todo. Requiere la migracion 025 (af.visible). Cero XP.
      if (tipo === 'museo_recurso') {
        // ADR-039 (C): usuario_id|id OPCIONAL. Sin query se toma el dueno
        // de la sesion firmada (verificarSesion); si no hay sesion y no
        // llega usuario_id, responde 400. El cliente actual siempre lo
        // envia, por lo que no hay regresion.
        var MR_USUARIO_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        var mrSes = verificarSesion(req);
        var mrUsuarioRaw = String(req.query.usuario_id || req.query.id || '').trim();
        if (!mrUsuarioRaw) {
          if (!mrSes.ok)
            return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
          mrUsuarioRaw = String(mrSes.sub || '').trim();
        }
        if (!MR_USUARIO_UUID.test(mrUsuarioRaw))
          return res.status(400).json({ ok: false, error: 'usuario_id invalido' });
        var mrEsDueno = !!(mrSes.ok && mrSes.sub.toLowerCase() === mrUsuarioRaw.toLowerCase());
        var mrAlbumFiltro = null;
        if (req.query.album_id !== undefined && req.query.album_id !== null && String(req.query.album_id).trim() !== '') {
          mrAlbumFiltro = String(req.query.album_id).trim();
          if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(mrAlbumFiltro))
            return res.status(400).json({ ok: false, error: 'album_id invalido' });
        }
        var mrVisibleFiltro = null;
        if (req.query.visible !== undefined && req.query.visible !== null && String(req.query.visible).trim() !== '') {
          mrVisibleFiltro = aBooleano(req.query.visible);
          if (mrVisibleFiltro === null)
            return res.status(400).json({ ok: false, error: 'visible invalido' });
        }
        var mrLimit = parseInt(req.query.limit || '50', 10);
        if (!isFinite(mrLimit) || mrLimit < 1) mrLimit = 50;
        if (mrLimit > 200) mrLimit = 200;
        var mrOffset = parseInt(req.query.offset || '0', 10);
        if (!isFinite(mrOffset) || mrOffset < 0) mrOffset = 0;
        var mrParams = [mrUsuarioRaw];
        var mrWhere = ' WHERE a.usuario_id = $1::uuid AND a.activo = true AND af.activo = true';
        if (!mrEsDueno) mrWhere += ' AND af.visible = true';
        if (mrVisibleFiltro !== null) {
          mrParams.push(mrVisibleFiltro);
          mrWhere += ' AND af.visible = $' + mrParams.length;
        }
        if (mrAlbumFiltro) {
          mrParams.push(mrAlbumFiltro);
          mrWhere += ' AND af.album_id = $' + mrParams.length + '::uuid';
        }
        mrParams.push(mrLimit);
        var mrLimIdx = mrParams.length;
        mrParams.push(mrOffset);
        var mrOffIdx = mrParams.length;
        var mrRows = await sql(
          'SELECT af.id, af.album_id, a.titulo AS album_titulo, af.foto_url,'
          + ' af.media_title, af.foto_type, af.lat AS lat_propia, af.lng AS lng_propia,'
          + ' COALESCE(af.lat, a.lat) AS lat, COALESCE(af.lng, a.lng) AS lng,'
          + ' a.ciudad, af.visible, af.creado_en'
          + ' FROM album_fotos af JOIN albumes a ON a.id = af.album_id'
          + mrWhere
          + ' ORDER BY af.creado_en DESC'
          + ' LIMIT $' + mrLimIdx + ' OFFSET $' + mrOffIdx,
          mrParams
        );
        // Votos unificados (ADR-036): query aparte degradable a 0 si la
        // migracion 023 no esta aplicada.
        var mrVotos = {};
        var mrIds = mrRows.map(function(r){ return String(r.id); });
        if (mrIds.length) {
          var mrVotoRows = await conDegradacionMedia(sql(
            'SELECT item_id, COUNT(*)::int AS n FROM media_votos'
            + ' WHERE fuente = \'album_foto\' AND activo = true AND item_id = ANY($1::text[])'
            + ' GROUP BY item_id',
            [mrIds]
          ), 'media_votos', []);
          (mrVotoRows || []).forEach(function(v) {
            mrVotos[String(v.item_id)] = parseInt(v.n, 10) || 0;
          });
        }
        var mrData = mrRows.map(function(r) {
          // A2 (ADR-051): lat/lng son las EFECTIVAS (recurso o album);
          // lat_propia/lng_propia solo la del recurso; coords_heredadas
          // indica que el pin proviene de la carpeta (af.lat IS NULL).
          return {
            id: r.id, album_id: r.album_id, album_titulo: r.album_titulo,
            foto_url: r.foto_url, media_title: r.media_title,
            tipo_media: r.foto_type,
            lat_propia: (r.lat_propia === null || r.lat_propia === undefined) ? null : r.lat_propia,
            lng_propia: (r.lng_propia === null || r.lng_propia === undefined) ? null : r.lng_propia,
            coords_heredadas: (r.lat_propia === null || r.lat_propia === undefined),
            lat: r.lat, lng: r.lng, ciudad: r.ciudad,
            visible: r.visible === true,
            votos: mrVotos[String(r.id)] || 0,
            creado_en: r.creado_en,
          };
        });
        return res.status(200).json({ ok: true, data: mrData });
      }

      // Mensajeria Directa - bandeja de hilos (TSK-103 / ADR-028, WP-3):
      // hilos donde el usuario es participante (clave_dm = dos uuid
      // ordenados unidos por '_'), con ultimo mensaje y no leidos
      // derivados (mensajes del otro posteriores a mi ultimo mensaje; no
      // existe tabla de leidos). Solo con sesion firmada (ADR-025).
      if (tipo === 'dm_hilos' && req.query.usuario_id) {
        var dhId = String(req.query.usuario_id || '');
        var dhSes = validarSesion(req, dhId);
        if (!dhSes.ok) return responderSesion(res, dhSes.razon);
        var dhHilos = await sql(
          'SELECT s.id, s.clave_dm, s.creado_en,'
          + ' CASE WHEN split_part(s.clave_dm,\'_\',1)=$1 THEN split_part(s.clave_dm,\'_\',2)'
          + '      ELSE split_part(s.clave_dm,\'_\',1) END AS otro_id,'
          + ' (SELECT m.texto FROM chat_mensajes m WHERE m.sala_id=s.id AND m.activo=true'
          + '   ORDER BY m.creado_en DESC LIMIT 1) AS ultimo_texto,'
          + ' (SELECT m.creado_en FROM chat_mensajes m WHERE m.sala_id=s.id AND m.activo=true'
          + '   ORDER BY m.creado_en DESC LIMIT 1) AS ultimo_en,'
          + ' (SELECT COUNT(*)::int FROM chat_mensajes m WHERE m.sala_id=s.id AND m.activo=true'
          + '   AND m.usuario_id::text<>$1 AND m.creado_en > COALESCE('
          + '     (SELECT MAX(m2.creado_en) FROM chat_mensajes m2 WHERE m2.sala_id=s.id'
          + '       AND m2.usuario_id::text=$1 AND m2.activo=true), \'epoch\'::timestamptz)) AS no_leidos'
          + ' FROM chat_salas s'
          + ' WHERE s.activo=true AND s.tipo=\'dm\''
          + ' AND (split_part(s.clave_dm,\'_\',1)=$1 OR split_part(s.clave_dm,\'_\',2)=$1)'
          + ' ORDER BY ultimo_en DESC NULLS LAST',
          [dhId]
        );
        var dhOtros = [];
        var dhVistos = {};
        dhHilos.forEach(function(h){ if (h.otro_id && !dhVistos[String(h.otro_id)]) { dhVistos[String(h.otro_id)] = true; dhOtros.push(h.otro_id); } });
        var dhUsuarios = dhOtros.length ? await sql(
          'SELECT id, nombre, COALESCE(foto_url, avatar_url, \'\') AS avatar_url FROM usuarios WHERE id = ANY($1::uuid[])',
          [dhOtros]
        ).catch(function(){ return []; }) : [];
        var dhPorId = {};
        dhUsuarios.forEach(function(u){ dhPorId[String(u.id)] = u; });
        // Bloqueo vigente por contraparte (WP-3, TSK-103 / ADR-028): el
        // frontend pinta Bloquear/Desbloquear tras recargar. Una sola query
        // para todo el inbox; si la migracion 017 no esta aplicada, degrada
        // a [] y todos los hilos quedan bloqueado:false sin romper la
        // respuesta.
        var dhBloqueos = await sql(
          'SELECT CASE WHEN bloqueador_id::text=$1 THEN bloqueado_id ELSE bloqueador_id END AS otro'
          + ' FROM usuario_bloqueos WHERE bloqueador_id::text=$1 OR bloqueado_id::text=$1',
          [dhId]
        ).catch(function(){ return []; });
        var dhBloqSet = {};
        (dhBloqueos || []).forEach(function(b){ if (b && b.otro) dhBloqSet[String(b.otro)] = true; });
        dhHilos.forEach(function(h){
          var o = dhPorId[String(h.otro_id)] || {};
          h.otro_nombre = o.nombre || 'Viajero';
          h.otro_avatar = o.avatar_url || '';
          h.no_leidos = parseInt(h.no_leidos, 10) || 0;
          h.bloqueado = (dhBloqSet[String(h.otro_id)] === true);
        });
        return res.status(200).json({ ok: true, data: dhHilos });
      }

      // Mensajeria Directa - mensajes de un hilo: ultimos 100 en orden
      // cronologico ASC. SOLO si el solicitante es uno de los dos
      // participantes (validado contra clave_dm, nunca un parametro
      // libre), con sesion firmada y sin bloqueo entre ambos. Un DM
      // jamas se lee por el GET publico chat_mensajes.
      if (tipo === 'dm_mensajes' && req.query.usuario_id && req.query.sala_id) {
        var dmsgId = String(req.query.usuario_id || '');
        var dmsgSala = String(req.query.sala_id || '');
        var dmsgSes = validarSesion(req, dmsgId);
        if (!dmsgSes.ok) return responderSesion(res, dmsgSes.razon);
        var dmsgSalaRow = await sql(
          'SELECT id, tipo, clave_dm FROM chat_salas WHERE id=$1 AND activo=true LIMIT 1',
          [dmsgSala]
        ).catch(function(){ return []; });
        if (!dmsgSalaRow.length || dmsgSalaRow[0].tipo !== 'dm' || !dmsgSalaRow[0].clave_dm)
          return res.status(404).json({ ok: false, error: 'Hilo no encontrado' });
        var dmsgClave = String(dmsgSalaRow[0].clave_dm);
        var dmsgA = dmsgClave.slice(0, 36);
        var dmsgB = dmsgClave.slice(37);
        if (dmsgA !== dmsgId && dmsgB !== dmsgId)
          return res.status(403).json({ ok: false, error: 'No autorizado' });
        var dmsgOtro = dmsgA === dmsgId ? dmsgB : dmsgA;
        var dmsgBloqueo = await sql(
          'SELECT 1 AS uno FROM usuario_bloqueos'
          + ' WHERE (bloqueador_id=$1 AND bloqueado_id=$2)'
          + '    OR (bloqueador_id=$2 AND bloqueado_id=$1) LIMIT 1',
          [dmsgId, dmsgOtro]
        ).catch(function(){ return []; });
        if (dmsgBloqueo.length)
          return res.status(403).json({ ok: false, error: 'DM_BLOQUEADO' });
        var dmsgRows = await sql(
          'SELECT * FROM ('
          + ' SELECT m.id, m.usuario_id, m.texto, m.fijado, m.creado_en,'
          + ' COALESCE(NULLIF(m.nombre,\'\'), u.nombre, \'Viajero\') AS nombre,'
          + ' COALESCE(u.avatar_url, \'\') AS avatar_url'
          + ' FROM chat_mensajes m LEFT JOIN usuarios u ON u.id = m.usuario_id'
          + ' WHERE m.sala_id=$1 AND m.activo=true'
          + ' ORDER BY m.creado_en DESC LIMIT 100'
          + ') t ORDER BY t.creado_en ASC',
          [dmsgSala]
        );
        return res.status(200).json({ ok: true, data: dmsgRows, otro_id: dmsgOtro });
      }

      // Planes de viaje colectivos (espec comunidad 2026-09-08): listado
      // con miembros actuales derivados por COUNT y marca 'unido' para el
      // usuario que consulta (EXISTS con $1; si no hay usuario_id, false).
      if (tipo === 'planes') {
        var planesRows = await sql(
          'SELECT p.id, p.destino, p.fechas, p.cupos, p.descripcion, p.sala_id, p.creador_id, p.creado_en,'
          + ' (SELECT COUNT(*)::int FROM planes_miembros pm WHERE pm.plan_id = p.id) AS miembros_actuales,'
          + ' (SELECT u.nombre FROM usuarios u WHERE u.id = p.creador_id) AS creador_nombre,'
          + ' EXISTS(SELECT 1 FROM planes_miembros pm WHERE pm.plan_id = p.id AND pm.usuario_id = $1) AS unido'
          + ' FROM planes_viaje p'
          + ' WHERE p.activo = true'
          + ' ORDER BY p.creado_en DESC'
          + ' LIMIT 50',
          [usuarioId]
        );
        return res.status(200).json({ ok: true, data: planesRows });
      }

      // Planes creados por el usuario (para gestion y compartir).
      if (tipo === 'planes_mios' && usuarioId) {
        var planesMiosRows = await sql(
          'SELECT p.id, p.destino, p.fechas, p.cupos, p.descripcion, p.sala_id, p.creado_en,'
          + ' (SELECT COUNT(*)::int FROM planes_miembros pm WHERE pm.plan_id = p.id) AS miembros_actuales'
          + ' FROM planes_viaje p'
          + ' WHERE p.creador_id = $1 AND p.activo = true'
          + ' ORDER BY p.creado_en DESC'
          + ' LIMIT 50',
          [usuarioId]
        );
        return res.status(200).json({ ok: true, data: planesMiosRows });
      }

      // Chat privado del plan (epic 2026-09-13): sala ligada a
      // planes_viaje.sala_id (migracion 015) + ultimos 100 mensajes en
      // orden cronologico + nombres de miembros (incluye al creador).
      // Gate de membresia: miembro de planes_miembros o creador del plan.
      // Si el plan aun no tiene sala, responde 200 con error sin romper
      // el contrato del cliente.
      if (tipo === 'plan_chat' && req.query.plan_id) {
        var plcPlanId = String(req.query.plan_id || '');
        var plcUserId = String(req.query.usuario_id || '');
        if (!plcUserId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var plcPlanRow = await sql(
          'SELECT id, creador_id, sala_id FROM planes_viaje WHERE id=$1 AND activo=true LIMIT 1',
          [plcPlanId]
        ).catch(function(){ return []; });
        if (!plcPlanRow.length)
          return res.status(404).json({ ok: false, error: 'Plan no encontrado' });
        if (String(plcPlanRow[0].creador_id) !== plcUserId) {
          var plcMemb = await sql(
            'SELECT 1 FROM planes_miembros WHERE plan_id=$1 AND usuario_id=$2 LIMIT 1',
            [plcPlanId, plcUserId]
          ).catch(function(){ return []; });
          if (!plcMemb.length)
            return res.status(403).json({ ok: false, error: 'Solo miembros del plan' });
        }
        if (!plcPlanRow[0].sala_id)
          return res.status(200).json({ ok: false, error: 'Este plan aun no tiene chat' });
        var plcSalaRow = await sql(
          'SELECT s.id, s.nombre, s.icono, s.descripcion, s.tipo, s.creador_id, s.creado_en'
          + ' FROM chat_salas s WHERE s.id=$1 AND s.activo=true LIMIT 1',
          [plcPlanRow[0].sala_id]
        ).catch(function(){ return []; });
        if (!plcSalaRow.length)
          return res.status(200).json({ ok: false, error: 'Este plan aun no tiene chat' });
        var plcMsgs = await sql(
          'SELECT m.id, m.usuario_id, m.texto, m.fijado, m.creado_en,'
          + ' COALESCE(NULLIF(m.nombre,\'\'), u.nombre, \'Viajero\') AS nombre,'
          + ' COALESCE(u.avatar_url, \'\') AS avatar_url'
          + ' FROM chat_mensajes m'
          + ' LEFT JOIN usuarios u ON u.id = m.usuario_id'
          + ' WHERE m.sala_id = $1 AND m.activo = true'
          + ' ORDER BY m.creado_en ASC'
          + ' LIMIT 100',
          [plcPlanRow[0].sala_id]
        );
        var plcMiembros = await sql(
          'SELECT DISTINCT u.nombre AS nombre FROM planes_miembros pm'
          + ' LEFT JOIN usuarios u ON u.id = pm.usuario_id'
          + ' WHERE pm.plan_id = $1 AND u.nombre IS NOT NULL'
          + ' UNION'
          + ' SELECT DISTINCT u2.nombre AS nombre FROM usuarios u2'
          + ' WHERE u2.id = $2 AND u2.nombre IS NOT NULL',
          [plcPlanId, plcPlanRow[0].creador_id]
        );
        var plcNombres = [];
        plcMiembros.forEach(function(r) { if (r.nombre) plcNombres.push(r.nombre); });
        return res.status(200).json({ ok: true, sala: plcSalaRow[0], mensajes: plcMsgs, miembros: plcNombres });
      }

      // Catalogo de vocaciones de artista (epic 2026-09-13): publico.
      // El catalogo vive en codigo (VOCACIONES); la columna
      // usuarios.vocaciones solo guarda las claves activadas por usuario.
      if (tipo === 'vocaciones_catalogo') {
        return res.status(200).json({ ok: true, data: VOCACIONES });
      }

      // Vocaciones activadas de un usuario + catalogo completo.
      if (tipo === 'vocaciones_usuario' && req.query.usuario_id) {
        var vocUsrId = String(req.query.usuario_id || '');
        var vocUsrRow = await sql(
          'SELECT vocaciones FROM usuarios WHERE id=$1',
          [vocUsrId]
        ).catch(function(){ return []; });
        if (!vocUsrRow.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var vocAct = (vocUsrRow[0] && vocUsrRow[0].vocaciones) || {};
        return res.status(200).json({ ok: true, data: { activadas: Object.keys(vocAct), catalogo: VOCACIONES } });
      }

      // Arbol de Clases: catalogo publico (WP-4, TSK-103 / ADR-028).
      // 16 ramas con sus 5 nodos. Sin usuario: cacheable.
      if (tipo === 'arbol_catalogo') {
        res.setHeader('Cache-Control', 'public, s-maxage=300');
        return res.status(200).json({
          ok: true,
          data: {
            tiers: RAMA_TIERS,
            ramas: RAMAS.map(function(r) {
              return {
                id: r.id, faccion: r.faccion, nombre: r.nombre, emoji: r.emoji,
                desc: r.desc, fuente: r.fuente,
                nodos: r.nodos.map(function(n) {
                  return { id: n.id, puntos: n.puntos, nombre: n.nombre, insignia: n.insignia, efecto: n.efecto };
                }),
              };
            }),
          },
        });
      }

      // Arbol de Clases: progreso de un usuario. Recalcula D_R en cada
      // lectura (nunca lee puntos de progreso_arbol) y persiste write-once
      // la fecha ISO de cada nodo alcanzado SOLO si el solicitante es el
      // dueno con sesion firmada (ADR-025); en caso contrario es lectura.
      if (tipo === 'arbol_usuario' && req.query.usuario_id) {
        var arbId = String(req.query.usuario_id || '');
        var arbData = await calcularArbolUsuario(sql, arbId);
        if (!arbData.ramas.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        if (validarSesion(req, arbId).ok) {
          await persistirNodosArbol(sql, arbId, arbData.progresoArbol, arbData.ramas);
        }
        return res.status(200).json({
          ok: true,
          data: {
            faccion: arbData.faccion,
            ramas: arbData.ramas.map(function(r) {
              return {
                id: r.id, faccion: r.faccion, nombre: r.nombre, emoji: r.emoji,
                desc: r.desc, fuente: r.fuente,
                puntos: r.puntos, bono: r.bono, derivado: r.derivado,
                nivel_nodo: r.nivel_nodo, nodos_desbloqueados: r.nodos_desbloqueados,
                efecto: r.efecto, activa: r.activa,
              };
            }),
            bono_pendiente: arbData.bono_pendiente,
          },
        });
      }

      // Tabla de Destino (Albion, Milestones v2 / ADR-014): tres senderos
      // de especializacion (Explorador, Critico, Organizador) que
      // progresan en paralelo al XP general. Cada sendero suma "fama"
      // derivada de las acciones reales (columna xp_ganado de
      // interacciones, mas los mapas tematicos). Los niveles por sendero
      // se derivan en cada lectura (FAMA_TIERS), nunca se persisten.
      // patrocinios llega vacio: la capa SKATE de patrocinios queda
      // como opcion abierta (ver DECISIONS.md ADR-014).
      if (tipo === 'tabla_destino' && usuarioId) {
        var tdUser = await sql(
          'SELECT id FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        if (!tdUser.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });

        var famaExplorador = await sql(
          'SELECT COALESCE(ROUND(SUM(xp_ganado), 2),0) AS fama, '
          + ' COUNT(*) FILTER (WHERE i.tipo=\'guardado\' AND i.activo=true)::int AS n_guardados, '
          + ' COUNT(*) FILTER (WHERE i.tipo=\'visita\' AND i.activo=true)::int AS n_visitas '
          + ' FROM interacciones i WHERE i.usuario_id=$1 '
          + '   AND (i.tipo=\'visita\' OR (i.tipo=\'guardado\' AND i.activo=true))',
          [usuarioId]
        );
        var famaCritico = await sql(
          'SELECT COALESCE(ROUND(SUM(xp_ganado), 2),0) AS fama, '
          + ' COUNT(*) FILTER (WHERE i.tipo=\'resena\')::int AS n_resenas, '
          + ' COUNT(*) FILTER (WHERE i.tipo=\'rating\')::int AS n_votos '
          + ' FROM interacciones i WHERE i.usuario_id=$1 '
          + '   AND i.tipo IN (\'resena\',\'rating\')',
          [usuarioId]
        );
        var famaOrganizador = await sql(
          'SELECT COALESCE(COUNT(m.id),0)::int AS n_mapas, '
          + ' COALESCE(COUNT(*) FILTER (WHERE m.publico=true),0)::int AS n_publicos, '
          + ' COALESCE(SUM(nm.n_destinos),0)::int AS n_destinos '
          + ' FROM mapas m '
          + ' LEFT JOIN (SELECT mapa_id, COUNT(*)::int AS n_destinos FROM mapa_destinos GROUP BY mapa_id) nm '
          + '   ON nm.mapa_id = m.id '
          + ' WHERE m.usuario_id=$1',
          [usuarioId]
        );
        // v9 (ADR-018) sendero Audiovisual: fotos/votos de viajero
        // (interacciones tipo='foto'; los votos viven en media_votos
        // fuente='viajero_foto' desde ADR-036) + albumes georeferenciados
        // y videos (tabla albumes de la migracion 009). Degrada a [] con
        // warn si media_votos no existe (migracion 023 pendiente).
        var famaAudiovisual = await conDegradacionMedia(sql(
          'SELECT COALESCE(ROUND(SUM(xp_ganado), 2),0) AS fama, '
          + ' COUNT(*) FILTER (WHERE i.dims->>\'voto_foto_id\' IS NULL)::int AS n_fotos, '
          + ' (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.usuario_id=$1 AND mv.fuente=\'viajero_foto\' AND mv.activo=true) AS n_votos_foto '
          + ' FROM interacciones i WHERE i.usuario_id=$1 AND i.tipo=\'foto\' AND i.activo=true',
          [usuarioId]
        ), 'media_votos', []);
        var albumAudiovisual = await sql(
          'SELECT COALESCE(COUNT(*) FILTER (WHERE a.lat IS NOT NULL AND a.lng IS NOT NULL),0)::int AS n_albumes_geo, '
          + ' COALESCE(COUNT(*) FILTER (WHERE a.tipo=\'videos\'),0)::int AS n_videos '
          + ' FROM albumes a WHERE a.usuario_id=$1 AND a.activo=true',
          [usuarioId]
        ).catch(function(){ return []; });
        // v9 (ADR-018) sendero Pandilla: fama_total de la pandilla activa
        // del usuario (pandillas_miembros.activo=true).
        var famaPandillaRow = await sql(
          'SELECT p.id AS pandilla_id, p.fama_total, p.nombre FROM pandillas p'
          + ' JOIN pandillas_miembros pm ON pm.pandilla_id = p.id'
          + ' WHERE pm.usuario_id=$1 AND pm.activo=true AND p.activo=true LIMIT 1',
          [usuarioId]
        ).catch(function(){ return []; });

        function nivelSendero(fama, TIERS) {
          var idx = 0;
          for (var i = 0; i < TIERS.length; i++) {
            if (fama >= TIERS[i].min) idx = i;
          }
          var cur = TIERS[idx];
          var next = TIERS[idx + 1] || null;
          var progreso = next
            ? Math.min(100, Math.round(((fama - cur.min) / (next.min - cur.min)) * 100))
            : 100;
          return {
            nivel: idx + 1,
            nombre: cur.nombre,
            min: cur.min,
            max: next ? next.min : null,
            progreso: progreso,
            total: TIERS.length,
          };
        }

        var FAMA_TIERS = [
          { min: 0,   nombre: 'Semilla' },
          { min: 100, nombre: 'Aprendiz' },
          { min: 250, nombre: 'Practicante' },
          { min: 450, nombre: 'Especialista' },
          { min: 700, nombre: 'Maestro' },
        ];

        var fe = famaExplorador[0] || { fama: 0, n_guardados: 0, n_visitas: 0 };
        fe.fama = red2(numXp(fe.fama));
        var fc = famaCritico[0] || { fama: 0, n_resenas: 0, n_votos: 0 };
        fc.fama = red2(numXp(fc.fama));
        var fo = famaOrganizador[0] || { n_mapas: 0, n_publicos: 0, n_destinos: 0 };
        var famaOrg = red2((fo.n_mapas * 40) + (fo.n_destinos * 5));
        var fav = famaAudiovisual[0] || { fama: 0, n_fotos: 0, n_votos_foto: 0 };
        fav.fama = red2(numXp(fav.fama));
        var favAlb = albumAudiovisual[0] || { n_albumes_geo: 0, n_videos: 0 };
        var famaAudiovisualTotal = red2(fav.fama + (favAlb.n_albumes_geo * 30) + (favAlb.n_videos * 35));
        var pandillaActiva = famaPandillaRow[0] || null;
        var famaPandillaTotal = pandillaActiva ? red2(numXp(pandillaActiva.fama_total)) : 0;

        var senderos = [
          {
            id: 'explorador', nombre: 'Explorador', emoji: '\uD83E\uDDED',
            descripcion: 'Guarda destinos (+5) y confirma visitas (+20)',
            fama: fe.fama, acciones: { guardados: fe.n_guardados, visitas: fe.n_visitas },
            sendero: nivelSendero(fe.fama, FAMA_TIERS),
          },
          {
            id: 'critico', nombre: 'Cr\u00edtico', emoji: '\u2B50',
            descripcion: 'Escribe rese\u00f1as (+10/+25) y vota (+10)',
            fama: fc.fama, acciones: { resenas: fc.n_resenas, votos: fc.n_votos },
            sendero: nivelSendero(fc.fama, FAMA_TIERS),
          },
          {
            id: 'organizador', nombre: 'Organizador', emoji: '\uD83D\uDDFA',
            descripcion: 'Crea mapas tem\u00e1ticos y agrega destinos',
            fama: famaOrg, acciones: { mapas: fo.n_mapas, publicos: fo.n_publicos, destinos: fo.n_destinos },
            sendero: nivelSendero(famaOrg, FAMA_TIERS),
          },
          {
            id: 'audiovisual', nombre: 'Audiovisual', emoji: '\uD83C\uDFA5',
            descripcion: 'Sube fotos/videos y georreferencia albumes',
            fama: famaAudiovisualTotal,
            acciones: { fotos: fav.n_fotos, votos_foto: fav.n_votos_foto, albumes_geo: favAlb.n_albumes_geo, videos: favAlb.n_videos },
            sendero: nivelSendero(famaAudiovisualTotal, FAMA_TIERS),
          },
          {
            id: 'pandilla', nombre: 'Pandilla', emoji: '\uD83D\uDC51',
            descripcion: 'Suma fama colectiva con tu pandilla',
            fama: famaPandillaTotal,
            pandilla_nombre: pandillaActiva ? pandillaActiva.nombre : null,
            acciones: { pandilla_id: pandillaActiva ? famaPandillaRow[0].pandilla_id : null },
            sendero: pandillaActiva
              ? nivelSendero(famaPandillaTotal, FAMA_TIERS)
              : { nivel: 0, nombre: 'Sin Parche', min: 0, max: 100, progreso: 0, total: FAMA_TIERS.length },
          },
        ];

        var famaTotalGlobal = red2(senderos.reduce(function(s, sn){ return s + numXp(sn.fama); }, 0));

        return res.status(200).json({
          ok: true,
          data: { senderos: senderos, fama_total_global: famaTotalGlobal, patrocinios: [] },
        });
      }

      // --- Albums fotograficos (ADR-017) ---

      // Listado de albumes con filtros
      if (tipo === 'albumes') {
        var albumUsuarioId = req.query.usuario_id || null;
        var albumCiudad = req.query.ciudad || null;
        var albumTipo = req.query.album_tipo || null;
        var albumLimit = Math.min(parseInt(req.query.limit || '20'), 50);
        var albumOffset = parseInt(req.query.offset || '0');
        var albumOrden = req.query.orden || 'recientes';
        // Opt-in (excluir_museo=1|true): oculta el album auto-creado
        // "Mi Museo" de todos los usuarios. Por defecto NO se filtra para no
        // alterar a galeria.html, museo_publico ni otros consumidores.
        var albumExcluirMuseo = (req.query.excluir_museo === '1' || req.query.excluir_museo === 'true');

        var albumParams = [];
        var np = 0;
        var albumWhere = ' WHERE a.activo = true';
        // v28: match tolerante a acentos (Mi con acento en la i) via
        // translate(chr()) sin bytes no-ASCII en el fuente (ADR-002). chr: a=225/224, e=233/232,
        // i=237/236, o=243/242, u=250/249/252, n=241.
        if (albumExcluirMuseo) albumWhere += " AND translate(lower(a.titulo), chr(225)||chr(224)||chr(233)||chr(232)||chr(237)||chr(236)||chr(243)||chr(242)||chr(250)||chr(249)||chr(252)||chr(241), 'aaeeiioouuun') <> 'mi museo'";
        if (albumUsuarioId) { np++; albumWhere += ' AND a.usuario_id = $' + np; albumParams.push(albumUsuarioId); }
        if (albumCiudad) { np++; albumWhere += ' AND a.ciudad = $' + np; albumParams.push(albumCiudad); }
        if (albumTipo) { np++; albumWhere += ' AND a.tipo = $' + np; albumParams.push(albumTipo); }
        np++; var albumLimitIdx = np; albumParams.push(albumLimit);
        np++; var albumOffsetIdx = np; albumParams.push(albumOffset);
        var albumesRows = await conDegradacionMedia(sql(
          'SELECT a.id, a.usuario_id, a.titulo, a.descripcion, a.tipo,'
          + ' a.lat, a.lng, a.ciudad, a.region, a.portada_url, a.es_top,'
          + ' a.creado_en, u.nombre AS autor_nombre,'
          + ' (SELECT COUNT(*)::int FROM album_fotos af WHERE af.album_id = a.id AND af.activo=true AND af.visible=true) AS fotos_count,'
          + ' (SELECT COUNT(*)::int FROM album_fotos af2'
          + '  JOIN media_votos mv ON mv.item_id = af2.id::text'
          + '  WHERE mv.fuente = \'album_foto\' AND mv.activo = true AND af2.album_id = a.id AND af2.visible=true) AS votos_count'
          + ' FROM albumes a'
          + ' LEFT JOIN usuarios u ON u.id = a.usuario_id'
          + albumWhere
          + ' ORDER BY '
          + (albumOrden === 'populares' ? 'votos_count DESC' :
             albumOrden === 'top' ? 'a.es_top DESC, votos_count DESC' :
             'a.creado_en DESC')
          + ' LIMIT $' + albumLimitIdx
          + ' OFFSET $' + albumOffsetIdx,
          albumParams
        ), 'media_votos', []);
        return res.status(200).json({ ok: true, data: albumesRows });
      }

      // Detalle de un album con sus fotos
      if (tipo === 'album_detalle' && req.query.album_id) {
        var albumId = req.query.album_id;
        // Migracion 004 pendiente: si usuarios.foto_url aun no existe en
        // Neon (42703), el detalle de album degrada por query con
        // COALESCE(u.avatar_url, '') en vez del 503 global.
        var albumDetRows = await queryConAvatarFallback(
          sql,
          'SELECT a.*, u.nombre AS autor_nombre,'
          + ' u.nombre AS usuario_nombre, __FOTO_URL__ AS usuario_avatar,'
          + ' (SELECT COUNT(*)::int FROM album_fotos af WHERE af.album_id = a.id AND af.activo=true AND af.visible=true) AS fotos_count'
          + ' FROM albumes a LEFT JOIN usuarios u ON u.id = a.usuario_id'
          + ' WHERE a.id = $1 AND a.activo = true',
          [albumId]
        );
        if (!albumDetRows.length)
          return res.status(404).json({ ok: false, error: 'Album no encontrado' });

        var fotosDetRows = await conDegradacionMedia(queryConAvatarFallback(
          sql,
          'SELECT af.id, af.foto_url, af.foto_type, af.media_title, af.media_source,'
          + ' af.autor_original_id, af.agregador_id, af.creado_en,'
          + ' u.nombre AS autor_nombre, __FOTO_URL__ AS autor_avatar, u.id AS usuario_id,'
          + ' (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente = \'album_foto\' AND mv.item_id = af.id::text AND mv.activo = true) AS votos'
          + ' FROM album_fotos af'
          + ' LEFT JOIN usuarios u ON u.id = af.autor_original_id'
          + ' WHERE af.album_id = $1 AND af.activo = true AND af.visible = true'
          + ' ORDER BY af.creado_en ASC',
          [albumId]
        ), 'media_votos', []);

        // BUG-A (v12) / ADR-036 (v19): el contador de comentarios corre
        // post-query con degradacion: si la migracion 023
        // (media_comentarios) no esta aplicada, 42P01 se atrapa y devuelve
        // 0 en vez de 503.
        await Promise.all(fotosDetRows.map(function(f) {
          return contarComentarioSafe(sql, f.id).then(function(n) { f.comentarios = n; });
        }));

        // Marcar ya_votado / ya_guardado / es_propia para el usuario actual.
        // BUG-A (v12) / ADR-036: las 3 metricas son degradables; si la
        // migracion 023 (media_votos) o 019 (media_guardados) falta,
        // conDegradacionMedia degrada a [] y el detalle del album NO se
        // tumba (patron BUG-021). es_propia usa autor_original_id, la MISMA
        // columna que resolverMediaItem/media_voto (quien devuelve 403 al
        // votar la propia), para que el flag coincida con el backend.
        var yaVotoAlbum = {};
        var yaGuardadoAlbum = {};
        if (usuarioId) {
          var misVotosAlbum = await conDegradacionMedia(sql(
            'SELECT item_id AS foto_id FROM media_votos WHERE usuario_id=$1 AND fuente=\'album_foto\' AND activo=true',
            [usuarioId]
          ), 'media_votos', []);
          misVotosAlbum.forEach(function(v){ yaVotoAlbum[String(v.foto_id)] = true; });

          var misGuardadosAlbum = await conDegradacionMedia(sql(
            'SELECT item_id AS foto_id FROM media_guardados WHERE usuario_id=$1 AND fuente=\'album_foto\' AND activo=true',
            [usuarioId]
          ), 'media_guardados', []);
          misGuardadosAlbum.forEach(function(g){ yaGuardadoAlbum[String(g.foto_id)] = true; });
        }
        fotosDetRows.forEach(function(r){
          r.ya_votado = !!yaVotoAlbum[String(r.id)];
          r.ya_guardado = !!yaGuardadoAlbum[String(r.id)];
          r.es_propia = !!(usuarioId && r.autor_original_id
            && String(r.autor_original_id) === String(usuarioId));
        });

        // ADR-054 (v26): fusion de guardados. El dueno se deriva del TOKEN
        // (verificarSesion), NUNCA del query param. Invariante de no-fuga
        // (C1): a un no-dueno solo se le emiten bookmarks visible=true cuyo
        // ORIGEN sea publico; el dueno ve su organizacion completa. El
        // origen de 'curada' es publico por la propia existencia de la fila
        // en destinos_fotos (el JOIN lo garantiza).
        var adSes = verificarSesion(req);
        var adEsDueno = !!(adSes.ok && albumDetRows[0].usuario_id
          && String(adSes.sub) === String(albumDetRows[0].usuario_id));

        // v28: bookmark del ALBUM por el usuario consultado (fuente='album').
        // Se lee con el usuarioId del query (mismo patron que ya_votado/
        // ya_guardado por foto) para que el boton nazca en estado correcto
        // en galeria.html y comunidad.html. Degrada a false sin la 019/032.
        var adYaGuardadoAlbum = false;
        if (usuarioId) {
          var adMgAlbum = await conDegradacionMedia(sql(
            'SELECT 1 FROM media_guardados WHERE usuario_id=$1 AND fuente=\'album\' AND item_id=$2 AND activo=true LIMIT 1',
            [usuarioId, String(albumId)]
          ), 'media_guardados', []);
          adYaGuardadoAlbum = adMgAlbum.length > 0;
        }
        var adEsPropioAlbum = !!(usuarioId && albumDetRows[0].usuario_id
          && String(usuarioId) === String(albumDetRows[0].usuario_id));

        var adGuardados = await conDegradacionMedia(sql(
          'SELECT sub.* FROM ('
          + ' SELECT mg.item_id::text AS id, af.foto_url, af.foto_type, af.media_title,'
          + '  af.creado_en, COALESCE(u.nombre, \'\') AS autor_nombre,'
          + '  (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente = \'album_foto\' AND mv.item_id = mg.item_id AND mv.activo = true) AS votos,'
          + '  \'album_foto\' AS origen_fuente, mg.visible'
          + ' FROM media_guardados mg'
          + ' JOIN album_fotos af ON af.id::text = mg.item_id'
          + ' JOIN albumes a ON a.id = af.album_id'
          + ' LEFT JOIN usuarios u ON u.id = COALESCE(af.autor_original_id, af.agregador_id)'
          + ' WHERE mg.album_id = $1::uuid AND mg.fuente = \'album_foto\' AND mg.activo = true'
          + '  AND ($2::boolean OR (mg.visible AND af.activo AND af.visible AND a.activo))'
          + ' UNION ALL'
          + ' SELECT mg.item_id::text, i.texto, \'foto\' AS foto_type, \'\' AS media_title,'
          + '  i.creado_en, COALESCE(u.nombre, \'\'),'
          + '  (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente = \'viajero_foto\' AND mv.item_id = mg.item_id AND mv.activo = true),'
          + '  \'viajero_foto\', mg.visible'
          + ' FROM media_guardados mg'
          + ' JOIN interacciones i ON i.id::text = mg.item_id'
          + ' LEFT JOIN usuarios u ON u.id = i.usuario_id'
          + ' WHERE mg.album_id = $1::uuid AND mg.fuente = \'viajero_foto\' AND mg.activo = true'
          + '  AND ($2::boolean OR (mg.visible AND i.activo))'
          + ' UNION ALL'
          + ' SELECT mg.item_id::text, df.url, \'foto\' AS foto_type, \'\' AS media_title,'
          + '  df.creado_en, \'\' AS autor_nombre,'
          + '  (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente = \'curada\' AND mv.item_id = mg.item_id AND mv.activo = true),'
          + '  \'curada\', mg.visible'
          + ' FROM media_guardados mg'
          + ' JOIN destinos_fotos df ON df.id::text = mg.item_id'
          + ' WHERE mg.album_id = $1::uuid AND mg.fuente = \'curada\' AND mg.activo = true'
          + '  AND ($2::boolean OR mg.visible)'
          + ' ) sub ORDER BY sub.creado_en DESC LIMIT 200',
          [albumId, adEsDueno]
        ), 'media_guardados', []);
        adGuardados.forEach(function(g){ g.guardado = true; });

        // Bookmark de un ALBUM entero (fuente='album') organizado en este
        // album: se publica solo si es visible Y el album origen sigue
        // activo; el dueno ve todos sus bookmarks.
        var adAlbumesGuardados = await conDegradacionMedia(sql(
          'SELECT a.id::text AS id, a.titulo, COALESCE(a.portada_url, \'\') AS portada_url'
          + ' FROM media_guardados mg'
          + ' JOIN albumes a ON a.id::text = mg.item_id'
          + ' WHERE mg.album_id = $1::uuid AND mg.fuente = \'album\' AND mg.activo = true'
          + '  AND ($2::boolean OR (mg.visible AND a.activo))'
          + ' ORDER BY mg.creado_en DESC LIMIT 100',
          [albumId, adEsDueno]
        ), 'media_guardados', []);

        return res.status(200).json({ ok: true, album: albumDetRows[0], fotos: fotosDetRows, guardados: adGuardados, albumes_guardados: adAlbumesGuardados, ya_guardado_album: adYaGuardadoAlbum, es_propio: adEsPropioAlbum });
      }

      // Galeria de un destino (ficha publica): fotos curadas de
      // destinos_fotos + fotos de viajeros (interacciones tipo='foto') +
      // fotos de albumes de usuario geolocalizadas cerca del destino
      // (mismo criterio de cercania que fotos_top).
      // Params: slug (o destino_id), incluir (CSV viajeros/albumes) y
      // usuario_id (opcional). Sin endpoints nuevos (ADR-010).
      // v16: incluir activa items[] (grilla unificada de la ficha); sin el,
      // la respuesta es la misma que consume galeria.html y no se ejecuta
      // ninguna query extra.
      if (tipo === 'galeria_destino') {
        var gdSlug = req.query.slug || null;
        var gdDestinoId = req.query.destino_id || null;
        if (!gdSlug && !gdDestinoId)
          return res.status(400).json({ ok: false, error: 'slug o destino_id requerido' });

        // incluir es un CSV estricto (mismo patron que tipo_media en
        // multimedia_mapa): un token invalido responde 400, nunca se
        // degrada en silencio a "todos los origenes".
        var gdIncluirRaw = req.query.incluir;
        var gdIncluirPresente = (gdIncluirRaw !== undefined && gdIncluirRaw !== null);
        var gdViajerosOn = false;
        var gdAlbumesOn = false;
        if (gdIncluirPresente) {
          var gdWhitelist = ['viajeros', 'albumes'];
          var gdInvalidos = [];
          var gdVistos = {};
          String(gdIncluirRaw).split(',').forEach(function(t){
            var tok = String(t).trim().toLowerCase();
            if (!tok) return;
            if (gdWhitelist.indexOf(tok) === -1) {
              if (gdInvalidos.indexOf(tok) === -1) gdInvalidos.push(tok);
              return;
            }
            gdVistos[tok] = true;
          });
          if (gdInvalidos.length
              || (String(gdIncluirRaw).trim() !== ''
                  && !gdVistos.viajeros && !gdVistos.albumes))
            return res.status(400).json({ ok: false, error: 'incluir invalido' });
          gdViajerosOn = !!gdVistos.viajeros;
          gdAlbumesOn = !!gdVistos.albumes;
        }
        var gdUsuarioId = req.query.usuario_id || null;

        var gdDestinoRows = await sql(
          'SELECT id, nombre, slug, ciudad, lat, lng'
          + ' FROM destinos'
          + ' WHERE (slug = $1 OR id = $2) AND status = \'published\''
          + ' LIMIT 1',
          [gdSlug, gdDestinoId]
        );
        if (!gdDestinoRows.length)
          return res.status(404).json({ ok: false, error: 'Destino no encontrado' });
        var gdDestino = gdDestinoRows[0];

        // Curadas: id y creado_en son aditivos al SELECT legacy. Desde v19
        // (ADR-036) la foto curada es votable/comentable, asi que se cargan
        // sus metricas unificadas reales (votos/comentarios/ya_votado/
        // ya_guardado) en lote, sin N+1.
        var gdFotos = await sql(
          'SELECT id, url, caption, orden, creado_en FROM destinos_fotos'
          + ' WHERE destino_id = $1'
          + ' ORDER BY orden ASC',
          [gdDestino.id]
        );
        var gdMetCuradaRows = await cargarMetricasMedia(sql, gdUsuarioId, 'curada',
          gdFotos.map(function(f){ return String(f.id); }));
        gdFotos.forEach(function(f) {
          var k = String(f.id);
          f.votos = gdMetCuradaRows.votos[k] || 0;
          f.comentarios = gdMetCuradaRows.comentarios[k] || 0;
          f.ya_votado = !!gdMetCuradaRows.ya_votado[k];
          f.ya_guardado = !!gdMetCuradaRows.ya_guardado[k];
        });
        // dos rankings. Copia ordenada por votos (curadas) para items[]
        // sin mutar gdFotos: el array legacy fotos[] conserva su orden actual
        // por orden ASC. Desempate por orden ASC (nulls al final).
        var gdFotosRank = gdFotos.slice().sort(function(a, b) {
          var va = parseInt(a.votos, 10) || 0, vb = parseInt(b.votos, 10) || 0;
          if (vb !== va) return vb - va;
          var oa = (a.orden == null) ? 1e9 : parseInt(a.orden, 10);
          var ob = (b.orden == null) ? 1e9 : parseInt(b.orden, 10);
          return oa - ob;
        });

        // BUG-A (v12) / ADR-036 (v19): el contador de comentarios se calcula
        // post-query con contarComentarioSafe, que degrada a 0 si la
        // migracion 023 (media_comentarios) no esta aplicada, en vez de
        // tumbar el GET.
        // v16: el 42703 de usuarios.foto_url (migracion 004) degrada por
        // query con queryConAvatarFallback en vez del 503 global.
        var gdUsuarios = await queryConAvatarFallback(
          sql,
          'SELECT af.id, af.foto_url, af.foto_type, af.media_title, af.media_source,'
          + ' af.creado_en, af.autor_original_id,'
          + ' a.id AS album_id, a.titulo AS album_titulo, a.ciudad,'
          + ' u.nombre AS autor_nombre, u.id AS autor_id,'
          + ' __FOTO_URL__ AS autor_avatar,'
          + ' (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente = \'album_foto\' AND mv.item_id = af.id::text AND mv.activo = true) AS votos'
          + ' FROM album_fotos af'
          + ' JOIN albumes a ON a.id = af.album_id'
          + ' LEFT JOIN usuarios u ON u.id = af.autor_original_id'
          + ' WHERE af.activo = true AND af.visible = true AND a.activo = true'
          + ' AND a.lat IS NOT NULL AND a.lng IS NOT NULL'
          + ' AND ABS(a.lat - $1) < 0.01 AND ABS(a.lng - $2) < 0.01'
          + ' ORDER BY votos DESC LIMIT 100',
          [gdDestino.lat, gdDestino.lng]
        );
        await Promise.all(gdUsuarios.map(function(f) {
          return contarComentarioSafe(sql, f.id).then(function(n) { f.comentarios = n; });
        }));

        var gdRespuesta = {
          ok: true,
          destino: {
            id: gdDestino.id,
            nombre: gdDestino.nombre,
            slug: gdDestino.slug,
            ciudad: gdDestino.ciudad,
            lat: gdDestino.lat,
            lng: gdDestino.lng,
          },
          fotos: gdFotos,
          usuarios: gdUsuarios,
        };

        // items[] unificado (clave SOLO presente si el cliente pide
        // incluir): normaliza curadas + viajeros + albumes al mismo shape.
        if (gdIncluirPresente) {
          var gdViajeros = [];
          if (gdViajerosOn) {
            // Misma base que el branch tipo=fotos: las filas
            // de voto (dims.voto_foto_id) no son fotos y se excluyen.
            gdViajeros = await queryConAvatarFallback(
              sql,
              'SELECT f.id, f.texto AS url, f.usuario_id AS autor_id, f.creado_en,'
              + ' u.nombre AS autor_nombre, __FOTO_URL__ AS autor_avatar,'
              + ' (SELECT COUNT(*)::int FROM media_votos mv'
              + '  WHERE mv.fuente=\'viajero_foto\' AND mv.item_id = f.id::text AND mv.activo=true) AS votos'
              + ' FROM interacciones f LEFT JOIN usuarios u ON u.id = f.usuario_id'
              + ' WHERE f.destino_id=$1 AND f.tipo=\'foto\' AND f.activo=true'
              + ' AND (f.dims IS NULL OR NOT (f.dims ? \'voto_foto_id\'))'
              + ' ORDER BY votos DESC, f.creado_en DESC LIMIT 60',
              [gdDestino.id]
            );
          }

          // v19 (ADR-036): votos/comentarios/ya_votado/ya_guardado reales
          // en lote por fuente (evita N+1). Curada se reutiliza del lote ya
          // cargado para el array legacy fotos[]. Degrada a mapas vacios si
          // la migracion 023 no esta aplicada.
          var gdIdsViajero = gdViajeros.map(function(f){ return String(f.id); });
          var gdIdsAlbum = gdAlbumesOn ? gdUsuarios.slice(0, 100).map(function(f){ return String(f.id); }) : [];
          var gdMetricas = await Promise.all([
            Promise.resolve(gdMetCuradaRows),
            cargarMetricasMedia(sql, gdUsuarioId, 'viajero_foto', gdIdsViajero),
            cargarMetricasMedia(sql, gdUsuarioId, 'album_foto', gdIdsAlbum),
          ]);
          var gdMetDe = function(met) {
            return function(id) {
              var k = String(id);
              return {
                votos: met.votos[k] || 0,
                comentarios: met.comentarios[k] || 0,
                ya_votado: !!met.ya_votado[k],
                ya_guardado: !!met.ya_guardado[k],
              };
            };
          };
          var gdMetCurada = gdMetDe(gdMetricas[0]);
          var gdMetViajero = gdMetDe(gdMetricas[1]);
          var gdMetAlbum = gdMetDe(gdMetricas[2]);

          // Orden determinista: curadas (votos DESC, orden ASC) -> viajeros
          // (votos DESC, creado_en DESC) -> album (votos DESC). Dedupe por URL
          // con trim y
          // precedencia curada > viajero > album: como se agrega en ese
          // mismo orden, la primera aparicion gana (Cero Borrado Logico:
          // la fila descartada sigue viva en su tabla de origen).
          var gdItems = [];
          var gdUrlsVistas = {};
          var gdAgregarItem = function(it) {
            var clave = String(it.url || '').trim();
            if (clave) {
              if (gdUrlsVistas[clave]) return;
              gdUrlsVistas[clave] = true;
            }
            gdItems.push(it);
          };

          // v20: sin tope artificial de curadas. La respuesta entrega TODAS
          // las fotos de destinos_fotos (votos DESC, orden ASC); galeria.html
          // pagina 12/pagina en cliente. Antes se truncaba a 12 aqui.
          gdFotosRank.forEach(function(f){
            var mCu = gdMetCurada(f.id);
            gdAgregarItem({
              origen: 'curada',
              id_origen: f.id,
              fuente: 'curada',
              tipo_voto: 'media',
              url: f.url,
              caption: f.caption || '',
              votos: mCu.votos,
              comentarios: mCu.comentarios,
              ya_votado: mCu.ya_votado,
              ya_guardado: mCu.ya_guardado,
              es_propia: false,
              autor_id: null,
              autor_nombre: null,
              autor_avatar: null,
              album_id: null,
              album_titulo: null,
              foto_type: 'foto',
              media_source: null,
              creado_en: f.creado_en || null,
            });
          });

          gdViajeros.forEach(function(f){
            var mVj = gdMetViajero(f.id);
            gdAgregarItem({
              origen: 'viajero',
              id_origen: f.id,
              fuente: 'viajero_foto',
              tipo_voto: 'media',
              url: f.url,
              caption: '',
              votos: mVj.votos,
              comentarios: mVj.comentarios,
              ya_votado: mVj.ya_votado,
              ya_guardado: mVj.ya_guardado,
              es_propia: !!(gdUsuarioId && String(f.autor_id) === String(gdUsuarioId)),
              autor_id: f.autor_id || null,
              autor_nombre: f.autor_nombre || null,
              autor_avatar: f.autor_avatar || '',
              album_id: null,
              album_titulo: null,
              foto_type: 'foto',
              media_source: null,
              creado_en: f.creado_en || null,
            });
          });

          if (gdAlbumesOn) {
            gdUsuarios.slice(0, 100).forEach(function(f){
              var mAl = gdMetAlbum(f.id);
              gdAgregarItem({
                origen: 'album',
                id_origen: f.id,
                fuente: 'album_foto',
                tipo_voto: 'media',
                url: f.foto_url,
                caption: f.media_title || '',
                votos: mAl.votos,
                comentarios: mAl.comentarios,
                ya_votado: mAl.ya_votado,
                ya_guardado: mAl.ya_guardado,
                es_propia: !!(gdUsuarioId && String(f.autor_original_id) === String(gdUsuarioId)),
                autor_id: f.autor_original_id || null,
                autor_nombre: f.autor_nombre || null,
                autor_avatar: f.autor_avatar || '',
                album_id: f.album_id || null,
                album_titulo: f.album_titulo || null,
                foto_type: f.foto_type || 'foto',
                media_source: f.media_source || null,
                creado_en: f.creado_en || null,
              });
            });
          }

          gdRespuesta.items = gdItems;
        }

        return res.status(200).json(gdRespuesta);
      }

      // Moderacion admin: comentarios recientes de albumes (ADR-023).
      // Requiere Authorization: Bearer <ADMIN_SECRET>. Mismo patron que
      // admin_moderar_foto_album / admin_foto_top.
      if (tipo === 'comentarios_recientes') {
        var crToken = req.headers.authorization || '';
        if (crToken.indexOf('Bearer ') !== 0)
          return res.status(401).json({ ok: false, error: 'Token requerido' });
        crToken = crToken.slice(7);
        var crSecret = process.env.ADMIN_SECRET || 'exploraco12345';
        if (crToken !== crSecret)
          return res.status(403).json({ ok: false, error: 'Token invalido' });

        var crLimit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 100);
        var crOffset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);

        var crRows = await conDegradacionMedia(sql(
          'SELECT mc.id, mc.item_id AS foto_id, mc.texto, mc.creado_en, mc.activo,'
          + ' u.nombre AS autor_nombre, u.id AS autor_id,'
          + ' af.foto_url, af.foto_type,'
          + ' a.id AS album_id, a.titulo AS album_titulo'
          + ' FROM media_comentarios mc'
          + ' JOIN album_fotos af ON af.id::text = mc.item_id'
          + ' JOIN albumes a ON a.id = af.album_id'
          + ' LEFT JOIN usuarios u ON u.id = mc.usuario_id'
          + ' WHERE mc.fuente = \'album_foto\''
          + ' ORDER BY mc.creado_en DESC'
          + ' LIMIT $1 OFFSET $2',
          [crLimit, crOffset]
        ), 'media_comentarios', []);
        return res.status(200).json({ ok: true, data: crRows });
      }

      // Mapa audiovisual: UNION de album_fotos (A1/ADR-051: lat/lng PROPIA
      // del recurso con fallback a la del album via COALESCE) + destinos_fotos.
      // Nota: en un UNION, $N se comparte entre ambas ramas. Usamos $1/$2 fijos.
      if (tipo === 'multimedia_mapa') {
        // v10 (ADR-023): multi-seleccion endurecida. Los tokens se
        // normalizan a minusculas antes de la whitelist; si tipo_media
        // viene con contenido no vacio pero trae tokens invalidos (o
        // ningun token valido) se responde 400, nunca se degrada en
        // silencio a "todos los tipos". Ausente o vacio = sin filtro.
        var mmTipos = null;
        var mmTiposAplicados = [];
        var mmTiposRaw = req.query.tipo_media;
        if (mmTiposRaw !== undefined && mmTiposRaw !== null && String(mmTiposRaw).trim() !== '') {
          var mmWhitelist = ['foto', 'video', 'audio'];
          var mmInvalidos = [];
          var mmVistos = {};
          String(mmTiposRaw).split(',').forEach(function(t){
            var tok = String(t).trim().toLowerCase();
            if (!tok) return;
            if (mmWhitelist.indexOf(tok) === -1) {
              if (mmInvalidos.indexOf(tok) === -1) mmInvalidos.push(tok);
              return;
            }
            if (!mmVistos[tok]) { mmVistos[tok] = true; mmTiposAplicados.push(tok); }
          });
          if (mmInvalidos.length || !mmTiposAplicados.length)
            return res.status(400).json({ ok: false, error: 'tipo_media no contiene tipos validos', tipos_invalidos: mmInvalidos });
          mmTipos = mmTiposAplicados;
        }
        var mmCiudad = req.query.ciudad || null;
        var mmOrigen = req.query.origen || null;
        // v27: vista=albumes devuelve SOLO pines agrupados (destino_album +
        // album_grupo); el default 'sueltos' conserva el comportamiento
        // historico (fotos individuales + destino_album). Cualquier otro
        // valor degrada a 'sueltos'.
        var mmVista = String(req.query.vista || 'sueltos').toLowerCase();
        if (mmVista !== 'albumes') mmVista = 'sueltos';
        // v17 (ADR-031): la capa publica ya NO se restringe por sesion. El
        // filtro restrictivo H-1/ADR-021 solo se aplica con scope=mio
        // (toggle "Solo mio" del mapa). Default = contenido publico.
        var mmScopeMio = String(req.query.scope || '').toLowerCase() === 'mio';
        // v24 (H-1/H-2): scope=mio es un filtro de DUENO y exige sesion
        // firmada. El usuario sale del token (verificarSesion), NUNCA del
        // query param: pedir los privados de un tercero con
        // ?scope=mio&usuario_id=... ya no es posible. Sin dueno autenticado
        // no se puede suprimir af.visible (ver clausula del UNION).
        var mmUsuarioId = null;
        if (mmScopeMio) {
          var mmSes = verificarSesion(req);
          if (!mmSes.ok)
            return res.status(400).json({ ok: false, error: 'SESION_REQUERIDA' });
          var mmSub = String(mmSes.sub || '').trim();
          if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(mmSub))
            return res.status(400).json({ ok: false, error: 'SESION_INVALIDA' });
          mmUsuarioId = mmSub;
        }
        // TSK-111 (CAMBIO 8): destino_id OPCIONAL para el album oficial
        // del pin del mapa. Se valida con la MISMA regex uuid inline que
        // usuario_id: si no viene o no es uuid, se ignora y la respuesta
        // degrada a album_oficial: [] (sin 400, tolerante).
        var mmDestinoId = null;
        var mmDestinoRaw = req.query.destino_id;
        if (mmDestinoRaw !== undefined && mmDestinoRaw !== null) {
          var mmDestinoStr = String(mmDestinoRaw).trim();
          if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(mmDestinoStr))
            mmDestinoId = mmDestinoStr;
        }
        // En un UNION ALL los $N son COMPARTIDOS entre ambas ramas. El
        // indice real de cada parametro se captura al apilarlo
        // (mmIdxTipos/mmIdxCiudad/mmIdxUsuario) y se reutiliza en las 2
        // ramas; si un opcional no viene, su indice es null y la clausula
        // no se emite. asi el orden de $N siempre respeta mmParams.
        var mmParams = [];
        var np = 0;
        var mmIdxTipos = null;
        var mmIdxCiudad = null;
        var mmIdxUsuario = null;
        if (mmTipos) { np++; mmIdxTipos = np; mmParams.push(mmTipos); }
        if (mmCiudad) { np++; mmIdxCiudad = np; mmParams.push(mmCiudad); }
        if (mmUsuarioId) { np++; mmIdxUsuario = np; mmParams.push(mmUsuarioId); }

        // FIX capa media 503 (SCHEMA_NOT_MIGRATED): la proyeccion del
        // avatar usa queryConAvatarFallback para degradar 42703 cuando
        // usuarios.foto_url (migracion 004) aun no existe en Neon. Sin
        // este wrapper la capa audiovisual entera caia al 503 global.
        // v27: con vista=albumes las ramas individuales (album_fotos /
        // destinos_fotos) NO se ejecutan; multimediaRows arranca vacio y
        // solo se pueblan los pines agrupados mas abajo.
        var multimediaRows = [];
        if (mmVista !== 'albumes')
          multimediaRows = await conDegradacionMedia(queryConAvatarFallback(sql,
          '('
          + ' SELECT af.foto_url AS media_url, af.foto_type AS media_type,'
          + '  af.media_title, af.media_source,'
          + '  COALESCE(af.lat, a.lat) AS lat, COALESCE(af.lng, a.lng) AS lng, a.ciudad,'
          + '  a.titulo AS album_titulo, u.nombre AS autor_nombre,'
          + '  u.nombre AS usuario_nombre, __FOTO_URL__ AS usuario_avatar,'
          + '  af.autor_original_id::text AS usuario_id, a.id::text AS album_id,'
          + '  \'album\' AS origen, a.id::text AS origen_id, af.id::text AS media_id,'
          + '  \'album_foto\' AS fuente,'
          + '  (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente = \'album_foto\' AND mv.item_id = af.id::text AND mv.activo = true) AS votos'
          + ' FROM album_fotos af'
          + ' JOIN albumes a ON a.id = af.album_id'
          + ' LEFT JOIN usuarios u ON u.id = af.autor_original_id'
          + ' WHERE a.activo=true AND af.activo=true'
          // ADR-039 (D.1) / v24 (H-1): capa publica solo visible=true. La
          // clausula SOLO se suprime con dueno autenticado (mmScopeMio ya
          // implica session valida); jamas sin mmUsuarioId.
          + (mmScopeMio && mmUsuarioId ? '' : ' AND af.visible = true')
          + (mmIdxTipos ? ' AND af.foto_type = ANY($' + mmIdxTipos + '::text[])' : '')
          + (mmIdxCiudad ? ' AND a.ciudad = $' + mmIdxCiudad : '')
          + (mmIdxUsuario ? ' AND a.usuario_id = $' + mmIdxUsuario + '::uuid' : '')
          + ' ORDER BY votos DESC LIMIT 300) UNION ALL ('
          + ' SELECT df.url AS media_url, \'foto\' AS media_type,'
          + '  df.caption AS media_title, \'\' AS media_source, d.lat, d.lng, d.ciudad,'
          + '  d.nombre AS album_titulo, \'\' AS autor_nombre,'
          + '  \'\' AS usuario_nombre, \'\' AS usuario_avatar, NULL::text AS usuario_id, NULL::text AS album_id,'
          + '  \'destino\' AS origen, d.slug AS origen_id, df.id::text AS media_id,'
          + '  \'curada\' AS fuente,'
          + '  (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente = \'curada\' AND mv.item_id = df.id::text AND mv.activo = true) AS votos'
          + ' FROM destinos_fotos df'
          + ' JOIN destinos d ON d.id = df.destino_id'
          + ' WHERE d.lat IS NOT NULL AND d.lng IS NOT NULL AND d.status = \'published\''
          + ((mmTipos && mmTipos.indexOf('foto') === -1) || mmOrigen === 'album' ? ' AND FALSE' : '')
          + (mmIdxCiudad ? ' AND d.ciudad = $' + mmIdxCiudad : '')
          + (mmIdxUsuario ? ' AND d.id IN (SELECT i.destino_id FROM interacciones i WHERE i.usuario_id = $' + mmIdxUsuario + '::uuid AND i.tipo IN (\'guardado\',\'voto\',\'rating\') AND i.activo = true)' : '')
          + ' ORDER BY votos DESC LIMIT 300) ORDER BY votos DESC LIMIT 600',
          mmParams
        ), 'media_votos', []);

        // BUG-B (v12): los albumes sin lat/lng heredan coords de la
        // primera interaccion (visita/guardado) del autor hacia un
        // destino georreferenciado; los que se quedan sin coords se
        // descartan antes de responder. El shape se mantiene
        // ({ok, data, tipos_aplicados}) y el orden/limite original.
        var mmSinCoords = multimediaRows.filter(function(r) {
          return !tieneCoordsValidas(r.lat, r.lng);
        });
        if (mmSinCoords.length) {
          await Promise.all(mmSinCoords.map(function(r) {
            return coordsFallbackAutor(sql, r.usuario_id).then(function(fb) {
              if (!fb) return;
              r.lat = fb.lat;
              r.lng = fb.lng;
              if (!r.ciudad && fb.ciudad) r.ciudad = fb.ciudad;
              r.coords_heredadas = true;
            });
          }));
          multimediaRows = multimediaRows.filter(function(r) {
            return tieneCoordsValidas(r.lat, r.lng);
          });
        }

        // v17 (ADR-031): representacion "album de destino". Ademas de las
        // fotos individuales de la ficha (origen='destino'), se emite UNA
        // fila agregada por destino (origen='destino_album') con portada y
        // conteo. Asi el mapa muestra el album de la ficha de hostal r10
        // como un pin agrupado que abre su galeria, y no solo fotos sueltas.
        var mmDestinoAlbumOn = mmOrigen !== 'album'
          && (mmVista === 'albumes' || !mmTipos || mmTipos.indexOf('foto') !== -1);
        if (mmDestinoAlbumOn && !mmScopeMio) {
          var mmAlbumRows = await sql(
            'SELECT d.slug AS origen_id, d.nombre AS album_titulo, d.lat, d.lng, d.ciudad,'
            + ' COUNT(df.id)::int AS fotos_count,'
            + ' (ARRAY_AGG(df.url ORDER BY df.es_hero DESC NULLS LAST, df.orden ASC NULLS LAST))[1] AS media_url'
            + ' FROM destinos d JOIN destinos_fotos df ON df.destino_id = d.id'
            + ' WHERE d.lat IS NOT NULL AND d.lng IS NOT NULL'
            + '   AND d.lat <> 0 AND d.lng <> 0 AND d.status = \'published\''
            + (mmIdxCiudad ? ' AND d.ciudad = $' + mmIdxCiudad : '')
            + ' GROUP BY d.id, d.slug, d.nombre, d.lat, d.lng, d.ciudad'
            + ' ORDER BY fotos_count DESC LIMIT 200',
            mmParams
          ).catch(function(){ return []; });
          mmAlbumRows.forEach(function(a) {
            if (!tieneCoordsValidas(a.lat, a.lng)) return;
            multimediaRows.push({
              media_url: a.media_url,
              media_type: 'album',
              media_title: a.album_titulo,
              media_source: '',
              lat: a.lat, lng: a.lng, ciudad: a.ciudad,
              album_titulo: a.album_titulo,
              autor_nombre: '', usuario_nombre: '', usuario_avatar: '',
              usuario_id: null, album_id: null,
              origen: 'destino_album', origen_id: a.origen_id,
              votos: 0, fotos_count: a.fotos_count
            });
          });
        }

        // v27: vista=albumes agrega UNA fila por album de usuario
        // (origen='album_grupo') con coords obligatorias (a.lat/a.lng),
        // portada y conteo de fotos. Con scope=mio el dueno ve sus albums
        // aunque las fotos no sean publicas; sin scope solo se exige
        // af.visible=true. Las filas NO pasan por coordsFallbackAutor: sus
        // coords ya son validas por WHERE. Si vista=sueltos este bloque no
        // corre (cero regresion).
        if (mmVista === 'albumes') {
          var mgVis = function(alias) {
            return (mmScopeMio && mmUsuarioId) ? '' : ' AND ' + alias + '.visible = true';
          };
          var mgParams = [];
          var mgIdxCiudad = null;
          var mgIdxUsuario = null;
          if (mmCiudad) { mgParams.push(mmCiudad); mgIdxCiudad = mgParams.length; }
          if (mmUsuarioId) { mgParams.push(mmUsuarioId); mgIdxUsuario = mgParams.length; }
          var mgRows = await sql(
            'SELECT'
            + ' COALESCE(a.portada_url, (SELECT af2.foto_url FROM album_fotos af2'
            + ' WHERE af2.album_id = a.id AND af2.activo = true' + mgVis('af2')
            + ' ORDER BY af2.creado_en ASC LIMIT 1)) AS media_url,'
            + ' \'album\' AS media_type, a.titulo AS media_title, \'\' AS media_source,'
            + ' a.lat, a.lng, a.ciudad, a.usuario_id::text AS usuario_id,'
            + ' a.id::text AS album_id, \'album_grupo\' AS origen,'
            + ' a.id::text AS origen_id, a.id::text AS media_id,'
            + ' (SELECT COUNT(*)::int FROM album_fotos af3'
            + ' WHERE af3.album_id = a.id AND af3.activo = true' + mgVis('af3') + ') AS fotos_count'
            + ' FROM albumes a'
            + ' WHERE a.activo = true AND a.lat IS NOT NULL AND a.lng IS NOT NULL'
            + ' AND translate(lower(a.titulo), chr(225)||chr(224)||chr(233)||chr(232)||chr(237)||chr(236)||chr(243)||chr(242)||chr(250)||chr(249)||chr(252)||chr(241), \'aaeeiioouuun\') <> \'mi museo\''
            + ' AND EXISTS (SELECT 1 FROM album_fotos af'
            + ' WHERE af.album_id = a.id AND af.activo = true' + mgVis('af') + ')'
            + (mgIdxCiudad ? ' AND a.ciudad = $' + mgIdxCiudad : '')
            + (mgIdxUsuario ? ' AND a.usuario_id = $' + mgIdxUsuario + '::uuid' : '')
            + ' ORDER BY fotos_count DESC LIMIT 200',
            mgParams
          ).catch(function(eGrp) {
            console.warn('[multimedia_mapa] album_grupo fallo: ' + (eGrp && eGrp.message));
            return [];
          });
          if (!Array.isArray(mgRows)) mgRows = [];
          mgRows.forEach(function(g) {
            if (!tieneCoordsValidas(g.lat, g.lng)) return;
            multimediaRows.push(g);
          });
        }

        // TSK-111 (CAMBIO 8): album_oficial del destino para el drawer del
        // pin del mapa cultural. Query INDEPENDIENTE del UNION ALL (usa su
        // propio $1) y solo corre con un destino_id uuid valido. Degrada a
        // [] si la tabla no existe en Neon (42P01/42703) y NUNCA tumba la
        // rama. Nota ADR-006: @neondatabase/serverless resuelve sql(...)
        // como ARRAY de filas (no {rows}), igual que el resto del archivo.
        // El shape de data/tipos_aplicados NO cambia: solo se agrega clave.
        var mmFotosOficiales = [];
        if (mmDestinoId) {
          mmFotosOficiales = await conDegradacionMedia(sql(
            'SELECT df.id, df.url, df.caption, df.orden,'
            + ' (SELECT COUNT(*)::int FROM media_votos mv'
            + '   WHERE mv.fuente = \'curada\' AND mv.item_id = df.id::text AND mv.activo = true) AS votos'
            + ' FROM destinos_fotos df'
            + ' WHERE df.destino_id = $1::uuid'
            + ' ORDER BY votos DESC, df.es_hero DESC NULLS LAST, df.orden ASC NULLS LAST'
            + ' LIMIT 12',
            [mmDestinoId]
          ), 'destinos_fotos', []);
          if (!Array.isArray(mmFotosOficiales)) mmFotosOficiales = [];
        }
        return res.status(200).json({ ok: true, data: multimediaRows, tipos_aplicados: mmTiposAplicados, album_oficial: mmFotosOficiales });
      }

      // Feed de fotos recientes de albumes
      if (tipo === 'mi_feed_fotos') {
        var feedLimit = Math.min(parseInt(req.query.limit || '20'), 50);
        var feedOffset = parseInt(req.query.offset || '0');
        var feedOrden = req.query.orden === 'top' ? 'top' : 'recientes';
        // usuario_id es OPCIONAL: pinta es_propia/ya_votado/ya_guardado para
        // los botones de comunidad. Si no es uuid valido se ignora (tratado
        // como vacio) en vez de tirar 400 y romper el feed publico.
        var feedUid = req.query.usuario_id ? String(req.query.usuario_id).trim() : '';
        if (feedUid && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(feedUid))
          feedUid = '';
        var feedParams = [feedLimit, feedOffset];
        if (feedUid) feedParams.push(feedUid);
        // autor_id usa af.autor_original_id: la MISMA columna que
        // resolverMediaItem('album_foto') para que es_propia coincida con el
        // 403 de registrarVotoMedia. media_votos ya se usaba aqui; si falta,
        // conDegradacionMedia degrada el feed entero a [].
        var feedRows = await conDegradacionMedia(sql(
          'SELECT af.id, af.foto_url, af.foto_type, af.media_title, af.media_source,'
          + ' a.titulo AS album_titulo, a.ciudad, a.id AS album_id,'
          + ' u.nombre AS autor_nombre, af.autor_original_id AS autor_id,'
          + ' (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente = \'album_foto\' AND mv.item_id = af.id::text AND mv.activo = true) AS votos,'
          + (feedUid
              ? ' COALESCE(af.autor_original_id = $3::uuid, false) AS es_propia,'
                + ' EXISTS(SELECT 1 FROM media_votos mv2 WHERE mv2.fuente = \'album_foto\' AND mv2.item_id = af.id::text AND mv2.usuario_id = $3::uuid AND mv2.activo = true) AS ya_votado,'
              : ' false AS es_propia, false AS ya_votado,')
          + ' af.creado_en'
          + ' FROM album_fotos af'
          + ' JOIN albumes a ON a.id = af.album_id'
          + ' LEFT JOIN usuarios u ON u.id = af.autor_original_id'
          + ' WHERE af.activo = true AND af.visible = true AND a.activo = true'
          + (feedOrden === 'top' ? ' ORDER BY votos DESC, af.creado_en DESC' : ' ORDER BY af.creado_en DESC')
          + ' LIMIT $1 OFFSET $2',
          feedParams
        ), 'media_votos', []);
        // ya_guardado va APARTE: media_guardados (migracion 019) puede faltar
        // y un 42P01 tumbaria todo el feed. Se degrada a [] y se mapea por fila.
        var feedGuardados = {};
        if (feedUid) {
          var feedIds = feedRows.map(function(f){ return String(f.id); });
          if (feedIds.length) {
            var feedGdRows = await conDegradacionMedia(sql(
              'SELECT item_id FROM media_guardados'
              + ' WHERE usuario_id = $1::uuid AND fuente = \'album_foto\' AND activo = true'
              + ' AND item_id = ANY($2::text[])',
              [feedUid, feedIds]
            ), 'media_guardados', []);
            feedGdRows.forEach(function(r){ feedGuardados[String(r.item_id)] = true; });
          }
        }
        feedRows.forEach(function(f){
          if (f.es_propia !== true) f.es_propia = false;
          if (f.ya_votado !== true) f.ya_votado = false;
          f.ya_guardado = feedGuardados[String(f.id)] === true;
        });
        // BUG-A (v12): contador de comentarios post-query degradable.
        await Promise.all(feedRows.map(function(f) {
          return contarComentarioSafe(sql, f.id).then(function(n) { f.comentarios = n; });
        }));
        return res.status(200).json({ ok: true, data: feedRows });
      }

      // ADR-032 (v17): "Mis fotos" del museo. Une las fotos agregadas a
      // albumes propios (album_fotos.agregador_id) con las fotos de viajero
      // subidas en fichas (interacciones.tipo='foto', excluyendo las filas
      // de voto que reutilizan dims->>'voto_foto_id'). Requiere usuario_id.
      if (tipo === 'mis_fotos') {
        var mfUsuario = usuarioId ? String(usuarioId).trim() : '';
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(mfUsuario))
          return res.status(400).json({ ok: false, error: 'usuario_id invalido' });
        var mfRows = await conDegradacionMedia(sql(
          'SELECT sub.* FROM ('
          + ' SELECT af.id::text AS id, af.foto_url, af.foto_type, af.media_title,'
          + '  a.id::text AS album_id, a.titulo AS album_titulo, a.ciudad AS ciudad,'
          + '  \'album_foto\' AS fuente, NULL::text AS destino_slug, NULL::text AS destino_nombre,'
          + '  (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente = \'album_foto\' AND mv.item_id = af.id::text AND mv.activo = true) AS votos,'
          + '  af.creado_en'
          + ' FROM album_fotos af JOIN albumes a ON a.id = af.album_id'
          + ' WHERE af.agregador_id = $1::uuid AND af.activo = true AND af.visible = true AND a.activo = true'
          + ' UNION ALL'
          + ' SELECT i.id::text, i.texto, \'foto\' AS foto_type, \'\' AS media_title,'
          + '  NULL::text, NULL::text, d.ciudad,'
          + '  \'viajero_foto\', d.slug, d.nombre,'
          + '  (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente = \'viajero_foto\' AND mv.item_id = i.id::text AND mv.activo = true), i.creado_en'
          + ' FROM interacciones i JOIN destinos d ON d.id = i.destino_id'
          + ' WHERE i.usuario_id = $1::uuid AND i.tipo = \'foto\' AND i.activo = true'
          + '   AND (i.dims IS NULL OR NOT (i.dims ? \'voto_foto_id\'))'
          + ' ) sub ORDER BY sub.creado_en DESC LIMIT 200',
          [mfUsuario]
        ), 'media_votos', []);
        return res.status(200).json({ ok: true, data: mfRows });
      }

      // ADR-054 (v26): "Mis guardados" de media. El dueno se deriva de la
      // sesion firmada (verificarSesion); el usuario_id del query se IGNORA
      // (leccion BUG-081). Cada bookmark expone su album de organizacion
      // (mi_album_id/mi_album_titulo/visible, migracion 032) y la respuesta
      // suma los albumes activos del usuario. Si la migracion 032 no esta
      // aplicada (42P01/42703) se responde 503 SCHEMA_NOT_MIGRATED tipado:
      // NUNCA se degrada a [] en silencio (hallazgo H-4).
      if (tipo === 'mis_guardados_media') {
        var mgSes = verificarSesion(req);
        if (!mgSes.ok) return responderSesion(res, mgSes.razon);
        var mgUsuario = String(mgSes.sub || '').trim();
        var mgRows, mgAlbumes;
        try {
          mgRows = await sql(
            'SELECT sub.*, COALESCE(ga.titulo, \'\') AS mi_album_titulo FROM ('
            + ' SELECT \'album\' AS fuente, mg.item_id::text AS item_id, mg.creado_en,'
            + '  a.titulo AS titulo, COALESCE(a.portada_url, \'\') AS media_url, \'album\' AS media_type,'
            + '  a.ciudad AS ciudad, a.id::text AS album_id, NULL::text AS destino_slug,'
            + '  mg.album_id::text AS mi_album_id, mg.visible'
            + ' FROM media_guardados mg JOIN albumes a ON a.id::text = mg.item_id'
            + ' WHERE mg.usuario_id = $1::uuid AND mg.fuente = \'album\' AND mg.activo = true AND a.activo = true'
            + ' UNION ALL'
            + ' SELECT \'album_foto\', mg.item_id::text, mg.creado_en,'
            + '  COALESCE(NULLIF(af.media_title, \'\'), a.titulo) AS titulo, af.foto_url, af.foto_type,'
            + '  a.ciudad, a.id::text, NULL::text, mg.album_id::text, mg.visible'
            + ' FROM media_guardados mg JOIN album_fotos af ON af.id::text = mg.item_id'
            + ' JOIN albumes a ON a.id = af.album_id'
            + ' WHERE mg.usuario_id = $1::uuid AND mg.fuente = \'album_foto\' AND mg.activo = true AND af.activo = true'
            + ' UNION ALL'
            + ' SELECT \'viajero_foto\', mg.item_id::text, mg.creado_en,'
            + '  d.nombre AS titulo, i.texto AS media_url, \'foto\' AS media_type,'
            + '  d.ciudad, NULL::text, d.slug, mg.album_id::text, mg.visible'
            + ' FROM media_guardados mg JOIN interacciones i ON i.id::text = mg.item_id'
            + ' JOIN destinos d ON d.id = i.destino_id'
            + ' WHERE mg.usuario_id = $1::uuid AND mg.fuente = \'viajero_foto\' AND mg.activo = true'
            + ' UNION ALL'
            + ' SELECT \'curada\', mg.item_id::text, mg.creado_en,'
            + '  d.nombre AS titulo, df.url AS media_url, \'foto\' AS media_type,'
            + '  d.ciudad, NULL::text, d.slug, mg.album_id::text, mg.visible'
            + ' FROM media_guardados mg'
            + ' JOIN destinos_fotos df ON df.id::text = mg.item_id'
            + ' JOIN destinos d ON d.id = df.destino_id'
            + ' WHERE mg.usuario_id = $1::uuid AND mg.fuente = \'curada\' AND mg.activo = true'
            + ' ) sub'
            + ' LEFT JOIN albumes ga ON ga.id = sub.mi_album_id::uuid AND ga.activo = true'
            + ' ORDER BY sub.creado_en DESC LIMIT 200',
            [mgUsuario]
          );
          mgAlbumes = await sql(
            'SELECT id::text AS id, titulo, tipo FROM albumes'
            + ' WHERE usuario_id = $1::uuid AND activo = true'
            + ' ORDER BY creado_en DESC LIMIT 50',
            [mgUsuario]
          );
        } catch (eMg) {
          if (!esEsquemaFaltante(eMg)) throw eMg;
          console.error('[interacciones] mis_guardados_media sin migracion 032 (albumes): ' + (eMg.message || eMg));
          return res.status(503).json({ ok: false, error: 'SCHEMA_NOT_MIGRATED' });
        }
        return res.status(200).json({ ok: true, data: mgRows, albumes: mgAlbumes });
      }

      // Top fotos para curacion de directorios (por coord match)
      if (tipo === 'fotos_top' && destinoId) {
        var ftRows = await conDegradacionMedia(sql(
          'SELECT af.id, af.foto_url, af.foto_type, af.media_title,'
          + ' u.nombre AS autor_nombre, a.titulo AS album_titulo,'
          + ' (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente = \'album_foto\' AND mv.item_id = af.id::text AND mv.activo = true) AS votos'
          + ' FROM album_fotos af'
          + ' JOIN albumes a ON a.id = af.album_id'
          + ' LEFT JOIN usuarios u ON u.id = af.autor_original_id'
          + ' JOIN destinos d ON d.id = $1'
          + ' WHERE af.activo = true AND af.visible = true AND a.activo = true'
          + ' AND a.lat IS NOT NULL AND a.lng IS NOT NULL'
          + ' AND ABS(a.lat - d.lat) < 0.01 AND ABS(a.lng - d.lng) < 0.01'
          + ' ORDER BY votos DESC LIMIT 10',
          [destinoId]
        ), 'media_votos', []);
        return res.status(200).json({ ok: true, data: ftRows });
      }

      // Comentarios de una media de album (ADR-023): 1 GET. Consulta
      // PLANA de todos los comentarios del foto_id (incluye inactivos
      // para poder reparentar) y arma el arbol SERVER-SIDE. Un inactivo
      // sin descendencia activa se descarta; uno con hijos se devuelve
      // como tombstone (texto/autor nulos, conserva respuestas[]).
      // nivel es 0-based; el cliente limita la indentacion visual a 3.
      // Comentarios de una foto de album (contrato legacy intacto):
      // desde v19 (ADR-036) lee del modelo unificado media_comentarios
      // (fuente='album_foto'), con los likes en media_comentario_likes
      // (soft-delete activo). El arbol se arma con el helper compartido.
      if (tipo === 'comentarios_foto') {
        var cfFotoId = req.query.foto_id || null;
        if (!cfFotoId)
          return res.status(400).json({ ok: false, error: 'foto_id requerido' });

        var cfTarget = await resolverMediaItem(sql, 'album_foto', String(cfFotoId));
        if (!cfTarget.ok)
          return res.status(404).json({ ok: false, error: 'Media no encontrada' });

        // Igual que multimedia_mapa: degrada 42703 si usuarios.foto_url
        // (migracion 004) no existe en Neon, en vez del 503 global.
        var cfRows = await conDegradacionMedia(queryConAvatarFallback(sql,
          'SELECT mc.id, mc.item_id AS foto_id, mc.parent_id, mc.usuario_id, mc.texto, mc.activo, mc.creado_en,'
          + ' u.nombre AS autor_nombre, __FOTO_URL__ AS autor_avatar,'
          + ' (SELECT COUNT(*)::int FROM media_comentario_likes ml WHERE ml.comentario_id = mc.id AND ml.activo = true) AS likes,'
          + ' EXISTS(SELECT 1 FROM media_comentario_likes ml2 WHERE ml2.comentario_id = mc.id AND ml2.usuario_id = $2 AND ml2.activo = true) AS ya_like'
          + ' FROM media_comentarios mc'
          + ' LEFT JOIN usuarios u ON u.id = mc.usuario_id'
          + ' WHERE mc.fuente = \'album_foto\' AND mc.item_id = $1::text'
          + ' ORDER BY mc.creado_en ASC, mc.id ASC',
          [cfFotoId, usuarioId]
        ), 'media_comentarios', []);

        var cfArbol = construirArbolComentarios(cfRows, usuarioId);
        return res.status(200).json({
          ok: true,
          foto_id: cfFotoId,
          total: cfArbol.total,
          data: cfArbol.data,
          flat: cfArbol.flat,
        });
      }

      // Interacciones de un item de media unificada (ADR-036 B):
      // {fuente, item_id, usuario_id?} -> votos, comentarios, ya_votado,
      // ya_guardado. Las fuentes canonicas son curada (destinos_fotos.id),
      // viajero_foto (interacciones.id) y album_foto (album_fotos.id).
      if (tipo === 'media_interacciones') {
        var miFuente = String(req.query.fuente || '').toLowerCase();
        var miItem = String(req.query.item_id || '').trim();
        if (!mediaFuenteValida(miFuente) || !MEDIA_ITEM_RE.test(miItem))
          return res.status(400).json({ ok: false, error: 'fuente o item_id invalido' });

        var miTarget = await resolverMediaItem(sql, miFuente, miItem);
        if (!miTarget.ok)
          return res.status(404).json({ ok: false, error: 'Media no encontrada' });

        var miCont = await contarMedia(sql, miFuente, miItem);
        var miYaVotado = false;
        var miYaGuardado = false;
        if (usuarioId) {
          var miVoto = await conDegradacionMedia(
            sql('SELECT 1 AS uno FROM media_votos WHERE usuario_id=$1 AND fuente=$2 AND item_id=$3 AND activo=true LIMIT 1', [usuarioId, miFuente, miItem]),
            'media_votos', []
          );
          miYaVotado = miVoto.length > 0;
          var miGuard = await conDegradacionMedia(
            sql('SELECT 1 AS uno FROM media_guardados WHERE usuario_id=$1 AND fuente=$2 AND item_id=$3 AND activo=true LIMIT 1', [usuarioId, miFuente, miItem]),
            'media_guardados', []
          );
          miYaGuardado = miGuard.length > 0;
        }
        return res.status(200).json({
          ok: true, fuente: miFuente, item_id: miItem,
          votos: miCont.votos, comentarios: miCont.comentarios,
          ya_votado: miYaVotado, ya_guardado: miYaGuardado,
        });
      }

      // Arbol de comentarios de un item de media unificada (ADR-036 B).
      // Mismo shape exacto que comentarios_foto (nodo.foto_id = item_id).
      if (tipo === 'media_comentarios') {
        var mcmFuente = String(req.query.fuente || '').toLowerCase();
        var mcmItem = String(req.query.item_id || '').trim();
        if (!mediaFuenteValida(mcmFuente) || !MEDIA_ITEM_RE.test(mcmItem))
          return res.status(400).json({ ok: false, error: 'fuente o item_id invalido' });

        var mcmTarget = await resolverMediaItem(sql, mcmFuente, mcmItem);
        if (!mcmTarget.ok)
          return res.status(404).json({ ok: false, error: 'Media no encontrada' });

        var mcmRows = await conDegradacionMedia(queryConAvatarFallback(sql,
          'SELECT mc.id, mc.item_id AS foto_id, mc.parent_id, mc.usuario_id, mc.texto, mc.activo, mc.creado_en,'
          + ' u.nombre AS autor_nombre, __FOTO_URL__ AS autor_avatar,'
          + ' (SELECT COUNT(*)::int FROM media_comentario_likes ml WHERE ml.comentario_id = mc.id AND ml.activo = true) AS likes,'
          + ' EXISTS(SELECT 1 FROM media_comentario_likes ml2 WHERE ml2.comentario_id = mc.id AND ml2.usuario_id = $3 AND ml2.activo = true) AS ya_like'
          + ' FROM media_comentarios mc'
          + ' LEFT JOIN usuarios u ON u.id = mc.usuario_id'
          + ' WHERE mc.fuente = $1 AND mc.item_id = $2'
          + ' ORDER BY mc.creado_en ASC, mc.id ASC',
          [mcmFuente, mcmItem, usuarioId]
        ), 'media_comentarios', []);

        var mcmArbol = construirArbolComentarios(mcmRows, usuarioId);
        return res.status(200).json({
          ok: true, fuente: mcmFuente, item_id: mcmItem,
          total: mcmArbol.total, data: mcmArbol.data, flat: mcmArbol.flat,
        });
      }

      // ==========================================================
      // v9 Gamificacion v4.0 (ADR-018) - GETs de consumibles, cromos
      // y pandillas. Requieren la migracion 010; si una tabla no
      // existe, la consulta falla y el catch degrada a respuesta
      // vacia o 503 con error claro.
      // ==========================================================

      // Catalogo activo de consumibles con precios (tabla consumibles).
      // WP-6 (TSK-103 / ADR-028): acepta &categoria= opcional para que la
      // tienda agrupe/filtre por categoria sin endpoint nuevo (8/8). El
      // filtro es 100% parametrizado ($1::text IS NULL = todas) y cada item
      // devuelve su categoria. Si la columna aun no existe (migracion 018
      // pendiente) degrada al catalogo completo sin filtro (cero rotura).
      if (tipo === 'consumibles') {
        var catCons = String(req.query.categoria || '').trim().toLowerCase().slice(0, 30);
        var catalogoConsumibles = [];
        try {
          catalogoConsumibles = await sql(
            'SELECT clave, nombre, descripcion, precio_xp, categoria, era_exclusiva FROM consumibles'
            + ' WHERE activo = true AND ($1::text IS NULL OR categoria = $1::text)'
            + ' ORDER BY precio_xp ASC, clave ASC',
            [catCons || null]
          );
        } catch (eCatCons) {
          // Degradacion (migracion 018 o 035 pendiente): catalogo completo
          // sin categoria ni era_exclusiva; el contrato se uniforma abajo.
          console.warn('TRACE: GET consumibles sin categoria: ' + (eCatCons && eCatCons.message));
          catalogoConsumibles = await sql(
            'SELECT clave, nombre, descripcion, precio_xp FROM consumibles'
            + ' WHERE activo = true ORDER BY precio_xp ASC, clave ASC',
            []
          ).catch(function(){ return []; });
        }
        // Era ganada del usuario (ADR-053/ADR-056): solo se calcula si viene
        // usuario_id. Sin fila o sin columnas -> era_usuario null y sin gate.
        var catEraUsuario = null;
        if (usuarioId) {
          var catUsrRows = await sql(
            'SELECT xp_total, nivel_max FROM usuarios WHERE id=$1',
            [usuarioId]
          ).catch(function(){ return []; });
          if (catUsrRows.length) {
            catEraUsuario = calcularEraVisibleLocal(catUsrRows[0].xp_total, catUsrRows[0].nivel_max);
          }
        }
        // numeric(12,2) llega como string: normalizar el precio (ADR-035).
        // era_exclusiva se uniforma a null cuando la columna no existe o el
        // valor es vacio; bloqueado solo aplica con usuario_id presente.
        catalogoConsumibles = catalogoConsumibles.map(function(c) {
          c.precio_xp = red2(numXp(c.precio_xp));
          c.era_exclusiva = c.era_exclusiva || null;
          c.bloqueado = !!(c.era_exclusiva && catEraUsuario && c.era_exclusiva !== catEraUsuario);
          return c;
        });
        return res.status(200).json({ ok: true, data: catalogoConsumibles, era_usuario: catEraUsuario });
      }

      // Inventario del usuario: consumibles como objeto clave ->
      // { cantidad, nombre } + xp_total + nivel calculado + era.
      // Contrato final: el frontend en paralelo espera consumibles[k]
      // con shape { cantidad, nombre } (no solo la cantidad cruda).
      if (tipo === 'inventario' && usuarioId) {
        var invRows = await sql(
          'SELECT capacidades, xp_total, nivel_max FROM usuarios WHERE id=$1',
          [usuarioId]
        );
        if (!invRows.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });
        var inv = invRows[0];
        var capsInv = inv.capacidades || {};
        var invXp = red2(numXp(inv.xp_total));
        var invNivel = calcularNivelLocal(invXp);
        // ADR-053/ADR-056: la era es la ganada (GREATEST derivado, nivel_max),
        // no la derivada del XP crudo (gastar XP no baja la era).
        var invEra = calcularEraVisibleLocal(inv.xp_total, inv.nivel_max);
        var invCrudo = capsInv.consumibles || {};
        // Catalogo para resolver clave -> nombre publico + era_exclusiva.
        // Degradacion en dos niveles: sin 035 cae al SELECT sin era pero
        // conserva los nombres publicos (nunca regresa a la clave cruda).
        var invCatalogo = await sql(
          'SELECT clave, nombre, era_exclusiva FROM consumibles WHERE activo=true',
          []
        ).catch(function(){ return null; });
        if (!invCatalogo) {
          invCatalogo = await sql(
            'SELECT clave, nombre FROM consumibles WHERE activo=true',
            []
          ).catch(function(){ return []; });
        }
        var invNombres = {};
        var invEras = {};
        invCatalogo.forEach(function(c) {
          invNombres[c.clave] = c.nombre;
          invEras[c.clave] = c.era_exclusiva || null;
        });
        var inventarioCons = {};
        Object.keys(invCrudo).forEach(function(clave) {
          inventarioCons[clave] = {
            cantidad: parseInt(invCrudo[clave], 10) || 0,
            nombre: invNombres[clave] || clave,
            era_exclusiva: invEras[clave] || null,
          };
        });
        return res.status(200).json({
          ok: true,
          data: {
            consumibles: inventarioCons,
            nivel: invNivel.nivel,
            xp_total: invXp,
            era: invEra,
          },
        });
      }

      // Coleccion de cromos del usuario (join con catalogo).
      if (tipo === 'mis_cromos' && usuarioId) {
        var cromosRows = await sql(
          'SELECT cc.id AS cromo_id, cc.nombre, cc.rareza, cc.set_slug, cc.imagen_url,'
          + ' uc.cantidad, uc.obtenido_en'
          + ' FROM usuarios_cromos uc'
          + ' JOIN cromos_catalogo cc ON cc.id = uc.cromo_id'
          + ' WHERE uc.usuario_id = $1'
          + ' ORDER BY cc.rareza DESC, uc.obtenido_en DESC',
          [usuarioId]
        ).catch(function(){ return []; });
        return res.status(200).json({ ok: true, data: cromosRows });
      }

      // Ranking global de Parches por fama acumulada (ADR-035, lectura
      // publica sin sesion). miembros_activos = miembros vigentes (30
      // dias): pm.activo=true + u.activo=true + ultimo_acceso reciente.
      // Si usuarios.activo/ultimo_acceso no existen (42703), se
      // reintenta la MISMA consulta sin la condicion de actividad y se
      // devuelve miembros_activos=0 (nunca catch vacio).
      if (tipo === 'pandilla_ranking') {
        var prkLimit = parseInt(req.query.limit, 10);
        if (!isFinite(prkLimit) || prkLimit <= 0) prkLimit = 50;
        prkLimit = Math.min(prkLimit, 200);
        // La condicion de actividad se interpola como literal SQL (no hay
        // params libres: $1 es el LIMIT); el unico texto interpolado son
        // nombres de columna controlados, ninguno viene del cliente.
        var prkCond = 'pm.activo = true AND u.activo = true'
          + ' AND u.ultimo_acceso > NOW() - INTERVAL \'30 days\'';
        var prkSql = function (condAct) {
          return 'SELECT p.id, p.nombre, p.ciudad_base, p.descripcion, p.fama_total,'
            + ' (SELECT COUNT(*)::int FROM pandillas_miembros pm'
            + '   WHERE pm.pandilla_id = p.id AND pm.activo = true) AS miembros,'
            + ' (SELECT COUNT(*)::int FROM pandillas_miembros pm'
            + '   JOIN usuarios u ON u.id = pm.usuario_id'
            + '   WHERE pm.pandilla_id = p.id AND ' + condAct + ') AS miembros_activos'
            + ' FROM pandillas p WHERE p.activo = true'
            + ' ORDER BY p.fama_total DESC NULLS LAST, p.creado_en ASC LIMIT $1';
        };
        var prkParches;
        try {
          prkParches = await sql(prkSql(prkCond), [prkLimit]);
        } catch (prkErr) {
          if (!prkErr || prkErr.code !== '42703') throw prkErr;
          console.warn('[interacciones] pandilla_ranking degradado 42703: ' + prkErr.message);
          prkParches = await sql(prkSql('pm.activo = true'), [prkLimit]);
        }
        prkParches = prkParches.map(function (p) {
          p.fama_total = red2(numXp(p.fama_total));
          p.miembros = Number(p.miembros) || 0;
          p.miembros_activos = Number(p.miembros_activos) || 0;
          return p;
        });
        return res.status(200).json({
          ok: true,
          data: { parches: prkParches, total: prkParches.length },
        });
      }

      // Detalle de pandilla: pandilla + miembros activos + retos activos.
      // Contrato final: si el usuario NO tiene pandilla activa, devuelve
      // pandilla:null y pandillas_disponibles (activas con cupo < 10)
      // para que el frontend renderice el grid de unirse; si la tiene,
      // pandillas_disponibles llega vacio.
      // Acepta pandilla_id o usuario_id (pandilla activa del usuario).
      if (tipo === 'pandilla_detalle') {
        var pdPandillaId = req.query.pandilla_id || null;
        var pdUsuarioId = req.query.usuario_id || null;
        if (!pdPandillaId && pdUsuarioId) {
          var pdBusca = await sql(
            'SELECT pandilla_id FROM pandillas_miembros'
            + ' WHERE usuario_id=$1 AND activo=true LIMIT 1',
            [pdUsuarioId]
          ).catch(function(){ return []; });
          if (!pdBusca.length) {
            // Sin pandilla activa: grid de pandillas con cupo disponible.
            var pdLibres = await sql(
              'SELECT p.id, p.nombre, p.fundador_id, p.fama_total, p.ciudad_base, p.descripcion, p.creado_en,'
              + ' (SELECT COUNT(*)::int FROM pandillas_miembros pm'
              + '   WHERE pm.pandilla_id = p.id AND pm.activo = true) AS miembros_actuales'
              + ' FROM pandillas p WHERE p.activo = true'
              + ' AND (SELECT COUNT(*)::int FROM pandillas_miembros pm'
              + '   WHERE pm.pandilla_id = p.id AND pm.activo = true) < 10'
              + ' ORDER BY p.fama_total DESC, p.creado_en ASC'
              + ' LIMIT 30',
              []
            ).catch(function(){ return []; });
            pdLibres = pdLibres.map(function(p) {
              p.fama_total = red2(numXp(p.fama_total));
              return p;
            });
            return res.status(200).json({
              ok: true,
              data: { pandilla: null, miembros: [], retos: [], pandillas_disponibles: pdLibres },
            });
          }
          pdPandillaId = pdBusca[0].pandilla_id;
        }
        if (!pdPandillaId)
          return res.status(400).json({ ok: false, error: 'pandilla_id o usuario_id requerido' });
        var pdRows = await sql(
          'SELECT p.id, p.nombre, p.fundador_id, p.fama_total, p.ciudad_base, p.descripcion, p.creado_en'
          + ' FROM pandillas p WHERE p.id=$1 AND p.activo=true LIMIT 1',
          [pdPandillaId]
        ).catch(function(){ return []; });
        if (!pdRows.length)
          return res.status(404).json({ ok: false, error: 'Pandilla no encontrada' });
        var pdMiembros = await sql(
          'SELECT pm.usuario_id, pm.rol, pm.fecha_ingreso, u.nombre, u.avatar_url'
          + ' FROM pandillas_miembros pm'
          + ' LEFT JOIN usuarios u ON u.id = pm.usuario_id'
          + ' WHERE pm.pandilla_id=$1 AND pm.activo=true'
          + ' ORDER BY (pm.rol=\'fundador\') DESC, pm.fecha_ingreso ASC',
          [pdPandillaId]
        ).catch(function(){ return []; });
        var pdRetos = await sql(
          'SELECT id, titulo, descripcion, tipo_reto, meta_valor, progreso_actual,'
          + ' fecha_inicio, fecha_fin, completado, xp_bono'
          + ' FROM pandilla_retos WHERE pandilla_id=$1 AND completado=false'
          + ' ORDER BY fecha_fin ASC',
          [pdPandillaId]
        ).catch(function(){ return []; });
        pdRows[0].fama_total = red2(numXp(pdRows[0].fama_total));
        pdRetos = pdRetos.map(function(r) {
          r.xp_bono = red2(numXp(r.xp_bono));
          return r;
        });
        return res.status(200).json({
          ok: true,
          data: { pandilla: pdRows[0], miembros: pdMiembros, retos: pdRetos, pandillas_disponibles: [] },
        });
      }

      // Retos activos de una pandilla (GET para consultar estado).
      if (tipo === 'pandilla_reto' && req.query.pandilla_id) {
        var prRows2 = await sql(
          'SELECT id, titulo, descripcion, tipo_reto, meta_valor, progreso_actual,'
          + ' fecha_inicio, fecha_fin, completado, xp_bono'
          + ' FROM pandilla_retos'
          + ' WHERE pandilla_id=$1 AND completado=false AND fecha_fin > NOW()'
          + ' ORDER BY fecha_fin ASC',
          [req.query.pandilla_id]
        ).catch(function(){ return []; });
        prRows2 = prRows2.map(function(r) {
          r.xp_bono = red2(numXp(r.xp_bono));
          return r;
        });
        return res.status(200).json({ ok: true, data: prRows2 });
      }

      // Misiones conjuntas de Casa (comunicacion Casas, 2026-09-18): GET
      // ?tipo=casa_misiones&casa=condor|jaguar|delfin devuelve las misiones
      // ACTIVAS de esa Casa. Unico endpoint (no se duplica en usuarios.js).
      if (tipo === 'casa_misiones') {
        var casaMis = String(req.query.casa || '').toLowerCase();
        if (['condor', 'jaguar', 'delfin'].indexOf(casaMis) === -1)
          return res.status(400).json({ ok: false, error: 'casa invalida' });
        var misionesCasaRows = await sql(
          'SELECT * FROM casa_misiones WHERE casa=$1 AND estado=\'activa\' ORDER BY creado_en DESC',
          [casaMis]
        );
        return res.status(200).json({ ok: true, data: misionesCasaRows });
      }

      // ==========================================================
      // v28 Mercado de Emprendedores (migracion 034). Ramas GET del
      // catalogo del mercado. Degradacion: si faltan las tablas/columnas
      // (42P01/42703) se responde 503 con mensaje claro, sin romper.
      // ==========================================================

      // Normas de las 3 Casas (mercado_config).
      if (tipo === 'mercado_config') {
        var mcCfgRows;
        try {
          mcCfgRows = await sql(
            'SELECT casa, impuesto_base_pct, arancel_inter_casa_pct, slots_base,'
            + ' permite_cross_casa, permite_produccion, precio_min, precio_max,'
            + ' duracion_oferta_horas, activo, actualizado_en'
            + ' FROM mercado_config ORDER BY casa ASC',
            []
          );
        } catch (eMcCfg) {
          if (!esEsquemaFaltante(eMcCfg)) throw eMcCfg;
          return responderMercadoAusente(res, eMcCfg, 'mercado_config');
        }
        mcCfgRows = mcCfgRows.map(function(c) {
          c.impuesto_base_pct = numXp(c.impuesto_base_pct);
          c.arancel_inter_casa_pct = numXp(c.arancel_inter_casa_pct);
          c.precio_min = red2(numXp(c.precio_min));
          c.precio_max = red2(numXp(c.precio_max));
          c.slots_base = parseInt(c.slots_base, 10) || 0;
          c.duracion_oferta_horas = parseInt(c.duracion_oferta_horas, 10) || 0;
          return c;
        });
        return res.status(200).json({ ok: true, data: mcCfgRows });
      }

      // Ofertas activas y no expiradas de una Casa. Default: la Casa del
      // usuario si llega usuario_id. precio_referencia = precio_xp_base *
      // clamp(1 + (ventas_24h - ofertas_activas) * 0.02, 0.5, 3.0).
      if (tipo === 'mercado_ofertas') {
        var moCasa = String(req.query.casa || '').trim().toLowerCase();
        if (!moCasa && usuarioId) {
          var moUCasa = await sql(
            'SELECT casa FROM usuarios WHERE id=$1::uuid LIMIT 1',
            [usuarioId]
          ).catch(function(eMoU) {
            if (esEsquemaFaltante(eMoU)) return [];
            console.warn('[mercado] casa del usuario no resuelta: ' + (eMoU && eMoU.message));
            return [];
          });
          if (moUCasa.length) moCasa = String(moUCasa[0].casa || '').toLowerCase();
        }
        if (MERCADO_CASAS.indexOf(moCasa) === -1)
          return res.status(400).json({ ok: false, error: 'casa invalida' });
        var moRows;
        try {
          moRows = await sql(
            'SELECT o.id, o.vendedor_id, o.casa, o.consumible_id, o.cantidad,'
            + ' o.cantidad_restante, o.precio_unitario, o.origen, o.estado,'
            + ' o.creado_en, o.expira_en, c.clave, c.nombre, c.precio_xp_base,'
            + ' (SELECT COUNT(*)::int FROM mercado_ventas v'
            + '   WHERE v.consumible_id = o.consumible_id AND v.casa = o.casa'
            + '   AND v.creado_en > NOW() - INTERVAL \'24 hours\') AS ventas_24h,'
            + ' (SELECT COUNT(*)::int FROM mercado_ofertas o2'
            + '   WHERE o2.consumible_id = o.consumible_id AND o2.casa = o.casa'
            + '   AND o2.estado = \'activa\' AND o2.expira_en > NOW()) AS ofertas_activas'
            + ' FROM mercado_ofertas o'
            + ' LEFT JOIN consumibles c ON c.id = o.consumible_id'
            + ' WHERE o.casa = $1 AND o.estado = \'activa\' AND o.expira_en > NOW()'
            + ' ORDER BY o.precio_unitario ASC, o.creado_en DESC LIMIT 100',
            [moCasa]
          );
        } catch (eMoO) {
          if (!esEsquemaFaltante(eMoO)) throw eMoO;
          return responderMercadoAusente(res, eMoO, 'mercado_ofertas');
        }
        moRows = moRows.map(function(o) {
          var base = numXp(o.precio_xp_base);
          var factor = 1 + ((Number(o.ventas_24h) || 0) - (Number(o.ofertas_activas) || 0)) * 0.02;
          if (factor < 0.5) factor = 0.5;
          if (factor > 3.0) factor = 3.0;
          o.precio_unitario = red2(numXp(o.precio_unitario));
          o.precio_xp_base = red2(base);
          o.precio_referencia = red2(base * factor);
          o.ventas_24h = Number(o.ventas_24h) || 0;
          o.ofertas_activas = Number(o.ofertas_activas) || 0;
          return o;
        });
        return res.status(200).json({ ok: true, casa: moCasa, data: moRows });
      }

      // Panel "mi mercado": saldo, nodo alcanzado, mis ofertas activas y
      // las normas efectivas (slots e impuesto) de las 3 Casas.
      if (tipo === 'mercado_mi') {
        // v28 (mercado): owner-only. El usuario se deriva de la sesion
        // firmada; req.query.usuario_id NUNCA se confia (leccion BUG-061).
        var mmSes = usuarioDeSesion(req);
        if (!mmSes.ok) return responderSesion(res, mmSes.razon);
        var mmUid = mmSes.usuario_id;
        var mmUsr, mmCfg, mmOfertas;
        try {
          mmUsr = await sql(
            'SELECT mercado_puntos, xp_total FROM usuarios WHERE id=$1::uuid LIMIT 1',
            [mmUid]
          );
          mmCfg = await sql(
            'SELECT casa, impuesto_base_pct, arancel_inter_casa_pct, slots_base,'
            + ' permite_cross_casa, permite_produccion, precio_min, precio_max,'
            + ' duracion_oferta_horas, activo FROM mercado_config',
            []
          );
          mmOfertas = await sql(
            'SELECT o.id, o.casa, o.consumible_id, o.cantidad, o.cantidad_restante,'
            + ' o.precio_unitario, o.origen, o.estado, o.creado_en, o.expira_en,'
            + ' c.clave, c.nombre, c.precio_xp_base'
            + ' FROM mercado_ofertas o'
            + ' LEFT JOIN consumibles c ON c.id = o.consumible_id'
            + ' WHERE o.vendedor_id = $1::uuid AND o.estado = \'activa\''
            + ' AND o.expira_en > NOW() ORDER BY o.creado_en DESC LIMIT 100',
            [mmUid]
          );
        } catch (eMm) {
          if (!esEsquemaFaltante(eMm)) throw eMm;
          return responderMercadoAusente(res, eMm, 'mercado_mi');
        }
        if (!mmUsr.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });
        var mmPuntos = numXp(mmUsr[0].mercado_puntos);
        var mmNivel = calcularNivelLocal(numXp(mmUsr[0].xp_total)).nivel;
        var mmNodoPorPuntos = calcularMercado(mmPuntos);
        var mmNodoPorNivel = nodoMercadoPorNivel(mmNivel);
        var mmNodo = calcularMercadoEfectivo(mmPuntos, mmNivel);
        var mmNodoInfo = nodoMercado(mmNodo);
        var mmCasas = MERCADO_CASAS.map(function(casa) {
          var cfg = null;
          for (var ci = 0; ci < mmCfg.length; ci++) {
            if (String(mmCfg[ci].casa) === casa) { cfg = mmCfg[ci]; break; }
          }
          cfg = cfg || {};
          var usados = 0;
          for (var oi = 0; oi < mmOfertas.length; oi++) {
            if (String(mmOfertas[oi].casa) === casa) usados++;
          }
          var totales = slotsMercado(cfg.slots_base, mmNodo);
          return {
            casa: casa,
            activo: cfg.activo === true,
            slots_totales: totales,
            slots_usados: usados,
            slots_libres: Math.max(0, totales - usados),
            impuesto_efectivo_pct: impuestoEfectivoMercado(cfg.impuesto_base_pct, mmNodo),
            arancel_inter_casa_pct: numXp(cfg.arancel_inter_casa_pct),
            permite_cross_casa: cfg.permite_cross_casa === true,
            permite_produccion: cfg.permite_produccion === true,
            precio_min: red2(numXp(cfg.precio_min)),
            precio_max: red2(numXp(cfg.precio_max)),
            duracion_oferta_horas: parseInt(cfg.duracion_oferta_horas, 10) || 0
          };
        });
        mmOfertas = mmOfertas.map(function(o) {
          o.precio_unitario = red2(numXp(o.precio_unitario));
          o.precio_xp_base = red2(numXp(o.precio_xp_base));
          return o;
        });
        return res.status(200).json({
          ok: true,
          data: {
            usuario_id: mmUid,
            mercado_puntos: red2(mmPuntos),
            mercado_nodo: mmNodo,
            nodo_por_puntos: mmNodoPorPuntos,
            nodo_por_nivel: mmNodoPorNivel,
            mercado_nodo_nombre: mmNodoInfo.nombre,
            slots_extra: mmNodoInfo.slots_extra,
            produce: mmNodoInfo.produce,
            ofertas: mmOfertas,
            casas: mmCasas
          }
        });
      }

      return res.status(400).json({ ok: false, error: 'Par\u00e1metros insuficientes' });
    }

    // -- POST ---------------------------------------------------------
    if (req.method === 'POST') {
      var body = req.body || {};
      var tipo2     = body.tipo || req.query.tipo;
      var destinoId2= body.destino_id;
      var usuarioId2= body.usuario_id || null;

      // ============ ENTREGA 016: WAYFARER ACTIVO OCULTO ============
      // Crowdsourcing geoespacial (migracion 016): cualquier usuario con
      // correo verificado propone sin gate de nivel (decision aprobada);
      // el filtro de calidad lo da la votacion de la comunidad.

      // Proponer un Activo Oculto. El +50 XP se otorga SOLO al aprobar
      // (via quorum de votos), no por proponer.
      if (tipo2 === 'activo_oculto_proponer') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var aoUsr = await sql(
          'SELECT email_verificado FROM usuarios WHERE id=$1',
          [usuarioId2]
        );
        if (!aoUsr.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        if (!(aoUsr[0].email_verificado === true))
          return res.status(403).json({ ok: false, error: 'EMAIL_SIN_VERIFICAR' });
        var aoNombre = String(body.nombre || '').trim();
        var aoDesc = String(body.descripcion || '').trim();
        var aoLat = parseFloat(body.lat);
        var aoLng = parseFloat(body.lng);
        var aoCiudad = String(body.ciudad || '').trim().slice(0, 100) || null;
        var aoFoto = String(body.foto_url || '').trim().slice(0, 2000) || null;
        var aoCategoria = String(body.categoria || '').trim().slice(0, 50) || null;
        if (!aoNombre)
          return res.status(400).json({ ok: false, error: 'nombre requerido' });
        if (!isFinite(aoLat) || !isFinite(aoLng))
          return res.status(400).json({ ok: false, error: 'COORDENADAS_INVALIDAS' });
        if (aoLat === 0 && aoLng === 0)
          return res.status(400).json({ ok: false, error: 'COORDENADAS_INVALIDAS' });
        if (aoLat < -90 || aoLat > 90 || aoLng < -180 || aoLng > 180)
          return res.status(400).json({ ok: false, error: 'COORDENADAS_INVALIDAS' });
        var aoIns = await sql(
          'INSERT INTO activos_ocultos (propuesto_por, nombre, descripcion, lat, lng, foto_url, categoria, ciudad) '
          + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, estado',
          [usuarioId2, aoNombre, aoDesc, aoLat, aoLng, aoFoto, aoCategoria, aoCiudad]
        );
        // ADR-053 Dec 9 (v25): ao_proponer acredita +30 XP DIRECTO con
        // M_nivel y cap de 3/dia CON XP. La 4a propuesta del dia se ACEPTA
        // funcionalmente pero SIN XP: se registra en el ledger con
        // xp_final=0 y cap_aplicado='accion'. El +50 al aprobar (quorum)
        // NO se toca.
        var aoPropHoy = await sql(
          'SELECT COUNT(*)::int AS n FROM activos_ocultos '
          + 'WHERE propuesto_por=$1 AND creado_en > NOW() - INTERVAL \'1 day\'',
          [usuarioId2]
        ).catch(function(eProp) {
          console.warn('[ao_proponer] conteo diario no leido: ' + (eProp && eProp.message));
          return [];
        });
        var aoPropN = (aoPropHoy[0] && parseInt(aoPropHoy[0].n, 10)) || 0;
        var aoPropXpFinal = 0;
        var aoPropDetalle = null;
        var aoPropCtx = await contextoXpE(sql, usuarioId2);
        if (aoPropN <= 3) {
          var resAoProp = await calcularXpAcreditado(sql, XP_BASES.ao_proponer,
            aoPropCtx.nivel_clase, aoPropCtx.clase_id, aoPropCtx.tag,
            { nivel_usuario: aoPropCtx.nivel_usuario });
          aoPropXpFinal = resAoProp.xp_final;
          aoPropDetalle = armarXpDetalle(XP_BASES.ao_proponer, resAoProp, 0);
          await sql(
            'UPDATE usuarios SET xp_total = xp_total + $1, ultimo_acceso = NOW() WHERE id=$2',
            [aoPropXpFinal, usuarioId2]
          ).catch(function(eAop) { console.warn('[ao_proponer] xp no acreditado: ' + (eAop && eAop.message)); });
          await acreditarClaseYCofre(sql, usuarioId2, aoPropCtx, aoPropXpFinal);
          await repartirXpReferidos(sql, usuarioId2, aoPropXpFinal);
          await registrarXpLedger(sql, {
            usuario_id: usuarioId2, accion: 'ao_proponer', xp_base: XP_BASES.ao_proponer,
            mult_nivel: resAoProp.m_nivel, mult_stack: resAoProp.mult_stack,
            mult_final: resAoProp.mult_global_c, cap_aplicado: resAoProp.cap_aplicado,
            xp_final: aoPropXpFinal, contexto: { activo_id: aoIns[0].id }
          });
        } else {
          await registrarXpLedger(sql, {
            usuario_id: usuarioId2, accion: 'ao_proponer', xp_base: XP_BASES.ao_proponer,
            mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'accion',
            xp_final: 0, contexto: { activo_id: aoIns[0].id, motivo: 'cap_diario_3' }
          });
        }
        return res.json({
          ok: true,
          data: {
            activo_id: aoIns[0].id, estado: aoIns[0].estado,
            xp: aoPropXpFinal, xp_detalle: aoPropDetalle || undefined
          }
        });
      }

      // Votar una propuesta (quorum +/-3 para aprobar/rechazar en una
      // sola sentencia). Gates en orden: sesion firmada -> correo
      // verificado -> nivel 5 -> no votar la propuesta propia -> voto
      // valido. La PK compuesta deduplica; el segundo voto no paga XP.
      if (tipo2 === 'activo_oculto_votar') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var svVoto = validarSesion(req, usuarioId2);
        if (!svVoto.ok) return responderSesion(res, svVoto.razon);
        var aoVUsr = await sql(
          'SELECT email_verificado, xp_total FROM usuarios WHERE id=$1',
          [usuarioId2]
        );
        if (!aoVUsr.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        if (!(aoVUsr[0].email_verificado === true))
          return res.status(403).json({ ok: false, error: 'EMAIL_SIN_VERIFICAR' });
        if (calcularNivelLocal(numXp(aoVUsr[0].xp_total)).nivel < 5)
          return res.status(403).json({ ok: false, error: 'NIVEL_INSUFICIENTE' });
        var aoActivoId = String(body.activo_id || '');
        if (!aoActivoId)
          return res.status(400).json({ ok: false, error: 'activo_id requerido' });
        var aoTarget = await sql(
          'SELECT propuesto_por FROM activos_ocultos WHERE id=$1',
          [aoActivoId]
        ).catch(function(){ return []; });
        if (!aoTarget.length)
          return res.status(404).json({ ok: false, error: 'ACTIVO_NO_ENCONTRADO' });
        if (String(aoTarget[0].propuesto_por) === String(usuarioId2))
          return res.status(409).json({ ok: false, error: 'VOTO_PROPIO' });
        var aoVoto = String(body.voto || '');
        if (aoVoto !== 'favor' && aoVoto !== 'contra')
          return res.status(400).json({ ok: false, error: 'VOTO_INVALIDO' });
        var aoVotoIns = await sql(
          'INSERT INTO activos_ocultos_votos (activo_id, usuario_id, voto) VALUES ($1, $2, $3) '
          + 'ON CONFLICT (activo_id, usuario_id) DO NOTHING RETURNING id',
          [aoActivoId, usuarioId2, aoVoto]
        );
        if (!aoVotoIns.length)
          return res.status(200).json({ ok: true, ya_votado: true, xp_otorgado: false });
        // Contadores + quorum + resuelto_en en UNA sentencia (misma
        // transaccion logica que el INSERT del voto, sin ventana entre
        // el conteo y el UPDATE).
        await sql(
          'UPDATE activos_ocultos SET '
          + 'votos_favor = votos_favor + CASE WHEN $3 = \'favor\' THEN 1 ELSE 0 END, '
          + 'votos_contra = votos_contra + CASE WHEN $3 = \'contra\' THEN 1 ELSE 0 END, '
          + 'estado = CASE WHEN (votos_favor + CASE WHEN $3 = \'favor\' THEN 1 ELSE 0 END) '
          + '  - (votos_contra + CASE WHEN $3 = \'contra\' THEN 1 ELSE 0 END) >= 3 THEN \'aprobado\' '
          + 'WHEN (votos_favor + CASE WHEN $3 = \'favor\' THEN 1 ELSE 0 END) '
          + '  - (votos_contra + CASE WHEN $3 = \'contra\' THEN 1 ELSE 0 END) <= -3 THEN \'rechazado\' '
          + 'ELSE estado END, '
          + 'resuelto_en = CASE WHEN (votos_favor + CASE WHEN $3 = \'favor\' THEN 1 ELSE 0 END) '
          + '  - (votos_contra + CASE WHEN $3 = \'contra\' THEN 1 ELSE 0 END) >= 3 THEN NOW() '
          + 'WHEN (votos_favor + CASE WHEN $3 = \'favor\' THEN 1 ELSE 0 END) '
          + '  - (votos_contra + CASE WHEN $3 = \'contra\' THEN 1 ELSE 0 END) <= -3 THEN NOW() '
          + 'ELSE resuelto_en END '
          + 'WHERE id=$2',
          [usuarioId2, aoActivoId, aoVoto]
        );
        // +5 XP por voto con tope diario (patron chatXpDisponible): max
        // 30 XP al dia = 6 votos con recompensa; el resto sigue votando
        // pero sin XP. El COUNT corre despues del INSERT, asi el voto
        // actual ya cuenta para su propio tope.
        var aoVotosHoy = await sql(
          'SELECT COUNT(*)::int AS n FROM activos_ocultos_votos '
          + 'WHERE usuario_id=$1 AND creado_en > NOW() - INTERVAL \'1 day\'',
          [usuarioId2]
        );
        var aoVotosN = (aoVotosHoy[0] && parseInt(aoVotosHoy[0].n, 10)) || 0;
        var aoVotoDetalle = null;
        if (aoVotosN <= 6) {
          var ctxAoVoto = await contextoXpE(sql, usuarioId2);
          var resAoVoto = await calcularXpAcreditado(sql, XP_BASES.ao_votar,
            ctxAoVoto.nivel_clase, ctxAoVoto.clase_id, ctxAoVoto.tag,
            { nivel_usuario: ctxAoVoto.nivel_usuario });
          var xpAoVotoFinal = resAoVoto.xp_final;
          aoVotoDetalle = armarXpDetalle(XP_BASES.ao_votar, resAoVoto, 0);
          await sql(
            'UPDATE usuarios SET xp_total = xp_total + $1, ultimo_acceso = NOW() WHERE id=$2',
            [xpAoVotoFinal, usuarioId2]
          ).catch(function(e){ console.warn('gaming016 xp_voto no acreditado', e && e.code); });
          await acreditarClaseYCofre(sql, usuarioId2, ctxAoVoto, xpAoVotoFinal);
          await repartirXpReferidos(sql, usuarioId2, xpAoVotoFinal);
          await registrarXpLedger(sql, {
            usuario_id: usuarioId2, accion: 'ao_votar', xp_base: XP_BASES.ao_votar,
            mult_nivel: resAoVoto.m_nivel, mult_stack: resAoVoto.mult_stack,
            mult_final: resAoVoto.mult_global_c, cap_aplicado: resAoVoto.cap_aplicado,
            xp_final: xpAoVotoFinal, contexto: { activo_id: aoActivoId, voto: aoVoto }
          });
        } else {
          return res.status(200).json({ ok: true, ya_votado: false, xp_otorgado: false });
        }
        var aoVMisiones = await evaluarMisiones(sql, usuarioId2);
        var aoVLogros = await evaluarLogros(sql, usuarioId2);
        return res.json({
          ok: true,
          data: { ya_votado: false, xp_otorgado: true, xp: xpAoVotoFinal, xp_detalle: aoVotoDetalle || undefined, misiones: aoVMisiones, logros: aoVLogros }
        });
      }

      // Checkin geolocalizado sobre un Activo Oculto aprobado: nonce
      // anti-replay + device_hash registrado + geocerca Haversine +
      // cooldown 90s + tope diario 30 (mismas constantes de la visita,
      // ADR-024). Dedup por el UNIQUE parcial (activo, usuario) activo.
      if (tipo2 === 'activo_oculto_checkin') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var svCheckin = validarSesion(req, usuarioId2);
        if (!svCheckin.ok) return responderSesion(res, svCheckin.razon);
        var aoCheckId = String(body.activo_id || '');
        var aoCheckNonce = String(body.nonce || '');
        var aoCheckLat = parseFloat(body.lat);
        var aoCheckLng = parseFloat(body.lng);
        var aoCheckAcc = (body.accuracy !== undefined && body.accuracy !== null && body.accuracy !== '')
          ? parseFloat(body.accuracy) : null;
        var aoCheckDevice = String(body.device_hash || '');
        if (!aoCheckId || !aoCheckNonce)
          return res.status(400).json({ ok: false, error: 'activo_id y nonce requeridos' });
        if (!isFinite(aoCheckLat) || !isFinite(aoCheckLng) || (aoCheckLat === 0 && aoCheckLng === 0))
          return res.status(400).json({ ok: false, error: 'COORDENADAS_INVALIDAS' });
        var nonceCheckinOk = await consumirNonce(sql, aoCheckNonce, usuarioId2);
        if (!nonceCheckinOk)
          return res.status(400).json({ ok: false, error: 'NONCE_INVALIDO' });
        if (!aoCheckDevice)
          return res.status(403).json({ ok: false, error: 'DEVICE_NO_REGISTRADO' });
        var devOk = await sql(
          'SELECT 1 AS uno FROM usuarios WHERE id=$1 AND device_hashes @> $2::jsonb',
          [usuarioId2, JSON.stringify([aoCheckDevice])]
        ).catch(function(){ return []; });
        if (!devOk.length)
          return res.status(403).json({ ok: false, error: 'DEVICE_NO_REGISTRADO' });
        var aoCheckAct = await sql(
          'SELECT id, lat, lng, categoria, nombre FROM activos_ocultos '
          + 'WHERE id=$1 AND estado=\'aprobado\' AND activo=true',
          [aoCheckId]
        ).catch(function(){ return []; });
        if (!aoCheckAct.length)
          return res.status(404).json({ ok: false, error: 'ACTIVO_NO_ENCONTRADO' });
        // Geocerca: radios 100/150/200/250 segun categoria con fallback
        // 150 (el 250 rural sale de las keywords del nombre).
        var acCat = String(aoCheckAct[0].categoria || '').toLowerCase();
        var acNombre = String(aoCheckAct[0].nombre || '').toLowerCase();
        var radioCheckin = 150;
        if (Object.prototype.hasOwnProperty.call(RADIO_POR_CATEGORIA, acCat))
          radioCheckin = RADIO_POR_CATEGORIA[acCat];
        for (var acRk = 0; acRk < RURAL_KEYWORDS.length; acRk++) {
          if (acNombre.indexOf(RURAL_KEYWORDS[acRk]) !== -1) { radioCheckin = 250; break; }
        }
        var acLatDest = typeof aoCheckAct[0].lat === 'number' ? aoCheckAct[0].lat : parseFloat(aoCheckAct[0].lat);
        var acLngDest = typeof aoCheckAct[0].lng === 'number' ? aoCheckAct[0].lng : parseFloat(aoCheckAct[0].lng);
        var acDist = haversineMetros(aoCheckLat, aoCheckLng, acLatDest, acLngDest);
        if (aoCheckAcc !== null && (!isFinite(aoCheckAcc) || aoCheckAcc <= 0))
          return res.status(400).json({ ok: false, error: 'ACCURACY_INVALIDA' });
        if (aoCheckAcc !== null && aoCheckAcc > ACCURACY_MAX_M)
          return res.status(422).json({ ok: false, error: 'ACCURACY_INSUFICIENTE' });
        if (acDist > radioCheckin + (aoCheckAcc || 0))
          return res.status(422).json({
            ok: false,
            error: 'FUERA_DE_RANGO',
            dist_m: Math.round(acDist),
            radio_m: radioCheckin
          });
        // Cooldown 90s y tope diario 30 (mismas constantes de visita).
        var acUltimo = await sql(
          'SELECT MAX(creado_en) AS ultimo FROM activos_ocultos_checkins WHERE usuario_id=$1',
          [usuarioId2]
        ).catch(function(){ return []; });
        if (acUltimo.length && acUltimo[0].ultimo) {
          var acDt = (Date.now() - Date.parse(acUltimo[0].ultimo)) / 1000;
          if (acDt < COOLDOWN_MIN_SEG)
            return res.status(429).json({ ok: false, error: 'CHECKIN_RATE_LIMIT' });
        }
        var acHoy = await sql(
          'SELECT COUNT(*)::int AS n FROM activos_ocultos_checkins '
          + 'WHERE usuario_id=$1 AND creado_en > NOW() - INTERVAL \'1 day\'',
          [usuarioId2]
        ).catch(function(){ return []; });
        if (((acHoy[0] && parseInt(acHoy[0].n, 10)) || 0) >= VISITAS_DIA_MAX)
          return res.status(429).json({ ok: false, error: 'LIMITE_DIARIO' });
        var acIns = await sql(
          'INSERT INTO activos_ocultos_checkins (activo_id, usuario_id, lat, lng, accuracy) '
          + 'VALUES ($1, $2, $3, $4, $5) '
          + 'ON CONFLICT (activo_id, usuario_id) WHERE activo = true DO NOTHING RETURNING id',
          [aoCheckId, usuarioId2, aoCheckLat, aoCheckLng, aoCheckAcc]
        ).catch(function(e) { if (e && e.code === '23505') return []; throw e; });
        if (!acIns.length)
          return res.status(200).json({ ok: true, ya_checkin: true, xp: 0 });
        var ctxCheckin = await contextoXpE(sql, usuarioId2);
        var resCheckin = await calcularXpAcreditado(sql, XP_BASES.ao_checkin,
          ctxCheckin.nivel_clase, ctxCheckin.clase_id, ctxCheckin.tag,
          { nivel_usuario: ctxCheckin.nivel_usuario });
        var xpCheckinFinal = resCheckin.xp_final;
        await sql(
          'UPDATE usuarios SET xp_total = xp_total + $1, ultimo_acceso = NOW() WHERE id=$2',
          [xpCheckinFinal, usuarioId2]
        ).catch(function(e){ console.warn('gaming016 xp_checkin no acreditado', e && e.code); });
        await acreditarClaseYCofre(sql, usuarioId2, ctxCheckin, xpCheckinFinal);
        await repartirXpReferidos(sql, usuarioId2, xpCheckinFinal);
        await registrarXpLedger(sql, {
          usuario_id: usuarioId2, accion: 'ao_checkin', xp_base: XP_BASES.ao_checkin,
          mult_nivel: resCheckin.m_nivel, mult_stack: resCheckin.mult_stack,
          mult_final: resCheckin.mult_global_c, cap_aplicado: resCheckin.cap_aplicado,
          xp_final: xpCheckinFinal, contexto: { activo_id: aoCheckId }
        });
        var acMis = await evaluarMisiones(sql, usuarioId2);
        var acLog = await evaluarLogros(sql, usuarioId2);
        return res.json({ ok: true, data: { checkin_id: acIns[0].id, xp: xpCheckinFinal, xp_detalle: armarXpDetalle(XP_BASES.ao_checkin, resCheckin, 0), misiones: acMis, logros: acLog } });
      }

      // -- Mapas tematicos (spec mapas publicos/privados 2026-09-05) --
      // Se manejan ANTES del guard generico de destino_id porque
      // mapa_crear / mapa_editar / mapa_eliminar no reciben destino_id.
      // Cero Borrado Logico: el DELETE de un mapa borra la fila (CASCADE
      // limpia mapa_destinos); aqui si es un borrado fisico legitimo (el
      // mapa es del usuario logueado y no hay XP de por medio).
      if (tipo2 === 'mapa_crear' || tipo2 === 'mapa_editar'
          || tipo2 === 'mapa_eliminar'
          || tipo2 === 'mapa_agregar_destino'
          || tipo2 === 'mapa_quitar_destino') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });

        if (tipo2 === 'mapa_crear') {
          var nombreNuevo = String(body.nombre || '').trim();
          if (!nombreNuevo)
            return res.status(400).json({ ok: false, error: 'nombre no puede estar vacio' });
          if (nombreNuevo.length > 80)
            return res.status(400).json({ ok: false, error: 'nombre debe tener maximo 80 caracteres' });
          var emojiNuevo = String(body.emoji || '').trim().slice(0, 8);
          var descNueva = String(body.descripcion || '').trim().slice(0, 1000);
          if (emojiNuevo) {
            var mapaNuevoRows = await sql(
              'INSERT INTO mapas (usuario_id, nombre, emoji, descripcion) VALUES ($1, $2, $3, $4) RETURNING id, publico',
              [usuarioId2, nombreNuevo, emojiNuevo, descNueva]
            );
          } else {
            // Sin emoji: se omite la columna para que aplique el DEFAULT
            // E'\U0001F5FA' de la migracion 006 (bug historico 026: en
            // ASCII-safe no entra el glifo; el servidor lo inyecta).
            var mapaNuevoRows = await sql(
              'INSERT INTO mapas (usuario_id, nombre, descripcion) VALUES ($1, $2, $3) RETURNING id, publico',
              [usuarioId2, nombreNuevo, descNueva]
            );
          }
          return res.status(200).json({ ok: true, id: mapaNuevoRows[0].id, publico: mapaNuevoRows[0].publico });
        }

        if (tipo2 === 'mapa_editar') {
          var mapaEditarId = body.mapa_id || null;
          if (!mapaEditarId)
            return res.status(400).json({ ok: false, error: 'mapa_id requerido' });
          var mapaEditarRows = await sql(
            'SELECT id FROM mapas WHERE id = $1 AND usuario_id = $2 LIMIT 1',
            [mapaEditarId, usuarioId2]
          );
          if (!mapaEditarRows.length)
            return res.status(404).json({ ok: false, error: 'No encontrado' });
          var setsEditar = ['actualizado_en = NOW()'];
          var valsEditar = [];
          var piEditar = 1;
          if (body.nombre !== undefined && body.nombre !== null) {
            var nombreEditado = String(body.nombre).trim();
            if (!nombreEditado)
              return res.status(400).json({ ok: false, error: 'nombre no puede estar vacio' });
            if (nombreEditado.length > 80)
              return res.status(400).json({ ok: false, error: 'nombre debe tener maximo 80 caracteres' });
            setsEditar.push('nombre = $' + piEditar);
            valsEditar.push(nombreEditado);
            piEditar++;
          }
          if (body.emoji !== undefined && body.emoji !== null) {
            setsEditar.push('emoji = $' + piEditar);
            valsEditar.push(String(body.emoji).trim().slice(0, 8));
            piEditar++;
          }
          if (body.descripcion !== undefined && body.descripcion !== null) {
            setsEditar.push('descripcion = $' + piEditar);
            valsEditar.push(String(body.descripcion).trim().slice(0, 1000));
            piEditar++;
          }
          if (body.publico !== undefined && body.publico !== null) {
            setsEditar.push('publico = $' + piEditar);
            valsEditar.push(body.publico === true || body.publico === 'true' || body.publico === 1 || body.publico === '1');
            piEditar++;
          }
          valsEditar.push(mapaEditarId);
          var mapaEditadoRows = await sql(
            'UPDATE mapas SET ' + setsEditar.join(', ') + ' WHERE id = $' + piEditar + ' RETURNING id, nombre, emoji, descripcion, publico',
            valsEditar
          );
          return res.status(200).json({ ok: true, data: mapaEditadoRows[0] });
        }

        if (tipo2 === 'mapa_eliminar') {
          var mapaEliminarId = body.mapa_id || null;
          if (!mapaEliminarId)
            return res.status(400).json({ ok: false, error: 'mapa_id requerido' });
          var mapaEliminado = await sql(
            'DELETE FROM mapas WHERE id = $1 AND usuario_id = $2 RETURNING id',
            [mapaEliminarId, usuarioId2]
          );
          if (!mapaEliminado.length)
            return res.status(404).json({ ok: false, error: 'No encontrado' });
          return res.status(200).json({ ok: true });
        }

        if (tipo2 === 'mapa_agregar_destino') {
          var mapaAgregarId = body.mapa_id || null;
          var destinoAgregarId = body.destino_id || null;
          if (!mapaAgregarId || !destinoAgregarId)
            return res.status(400).json({ ok: false, error: 'mapa_id y destino_id requeridos' });
          var mapaDuenoRows = await sql(
            'SELECT id FROM mapas WHERE id = $1 AND usuario_id = $2 LIMIT 1',
            [mapaAgregarId, usuarioId2]
          );
          if (!mapaDuenoRows.length)
            return res.status(404).json({ ok: false, error: 'No encontrado' });
          var destinoInsertRows = await sql(
            'INSERT INTO mapa_destinos (mapa_id, destino_id, orden)'
            + ' SELECT $1, $2, COALESCE((SELECT MAX(orden) + 1 FROM mapa_destinos WHERE mapa_id = $1), 0)'
            + ' ON CONFLICT (mapa_id, destino_id) DO NOTHING RETURNING mapa_id',
            [mapaAgregarId, destinoAgregarId]
          );
          return res.status(200).json({ ok: true, ya_incluido: destinoInsertRows.length === 0 });
        }

        if (tipo2 === 'mapa_quitar_destino') {
          var mapaQuitarId = body.mapa_id || null;
          var destinoQuitarId = body.destino_id || null;
          if (!mapaQuitarId || !destinoQuitarId)
            return res.status(400).json({ ok: false, error: 'mapa_id y destino_id requeridos' });
          var mapaQuitarRows = await sql(
            'SELECT id FROM mapas WHERE id = $1 AND usuario_id = $2 LIMIT 1',
            [mapaQuitarId, usuarioId2]
          );
          if (!mapaQuitarRows.length)
            return res.status(404).json({ ok: false, error: 'No encontrado' });
          await sql(
            'DELETE FROM mapa_destinos WHERE mapa_id = $1 AND destino_id = $2',
            [mapaQuitarId, destinoQuitarId]
          );
          return res.status(200).json({ ok: true });
        }
      }

      // -- Chat y Planes reales (espec comunidad 2026-09-08) ---------
      // Se manejan ANTES del guard generico de destino_id porque operan
      // sobre salas/planes, no sobre destinos. Todos validan capacidad
      // server-side via misionCompletada() y, cuando hay XP (chat),
      // aplican el tope diario anti-farming (chatXpDisponible).
      // Las capacidades las traduce api/usuarios.js desde
      // usuarios.progreso_misiones (DESBLOQUEOS).

      // Crear sala de chat (capacidad crear_chat, nivel 5).
      if (tipo2 === 'chat_sala') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var puedeCrearSala = await misionCompletada(sql, usuarioId2, 'mis_chat_creador');
        if (!puedeCrearSala)
          return res.status(403).json({ ok: false, error: 'Desbloquea Creador de salas (nivel 5) para crear salas' });
        var salaNombre = String(body.nombre || '').trim();
        if (!salaNombre)
          return res.status(400).json({ ok: false, error: 'nombre requerido' });
        if (salaNombre.length > 40)
          return res.status(400).json({ ok: false, error: 'nombre maximo 40 caracteres' });
        var salaIcono = String(body.icono || '\uD83D\uDCAC').slice(0, 8);
        var salaDesc = String(body.descripcion || '').trim().slice(0, 120);
        var salaIns = await sql(
          'INSERT INTO chat_salas (nombre, icono, descripcion, tipo, orden, creador_id) '
          + 'VALUES ($1, $2, $3, \'viajeros\', 0, $4) RETURNING id',
          [salaNombre, salaIcono, salaDesc, usuarioId2]
        );
        return res.status(200).json({ ok: true, id: salaIns[0].id });
      }

      // Enviar mensaje (capacidad chat, nivel 3). +2 XP con tope diario
      // de 20 XP; evalua misiones y logros en cada envio.
      if (tipo2 === 'chat_msg') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var puedeChat = await misionCompletada(sql, usuarioId2, 'mis_chat_mensajero');
        if (!puedeChat)
          return res.status(403).json({ ok: false, error: 'Desbloquea el chat (nivel 3, 250 XP) para escribir mensajes' });
        var msgSala = String(body.sala_id || '');
        var msgTexto = String(body.texto || '').trim();
        if (!msgSala)
          return res.status(400).json({ ok: false, error: 'sala_id requerido' });
        if (!msgTexto)
          return res.status(400).json({ ok: false, error: 'mensaje vacio' });
        if (msgTexto.length > 500)
          return res.status(400).json({ ok: false, error: 'mensaje maximo 500 caracteres' });
        var salaValida;
        try {
          salaValida = await sql(
            'SELECT id, tipo, es_oficial FROM chat_salas WHERE id=$1 AND activo=true LIMIT 1',
            [msgSala]
          );
        } catch (salaErr) {
          if (salaErr && salaErr.code === '42703') {
            console.warn('[chat_msg] es_oficial ausente (026 pendiente): fallback sin es_oficial');
            salaValida = await sql(
              'SELECT id, tipo, false AS es_oficial FROM chat_salas WHERE id=$1 AND activo=true LIMIT 1',
              [msgSala]
            );
          } else {
            console.error('[chat_msg] sala lookup: ' + (salaErr && salaErr.message));
            throw salaErr;
          }
        }
        if (!salaValida.length)
          return res.status(404).json({ ok: false, error: 'Sala no encontrada' });
        // v12 (chat privado por plan) + WP-3 (DM): las salas tipo='plan'
        // solo se escriben via plan_chat_msg y las tipo='dm' solo via
        // dm_enviar; el chat general no puede saltarse su privacidad.
        if (salaValida[0].tipo === 'plan')
          return res.status(403).json({ ok: false, error: 'Esta sala es privada del plan' });
        if (salaValida[0].tipo === 'dm')
          return res.status(403).json({ ok: false, error: 'SALA_PRIVADA' });
        // Canal oficial (sub-modulo 3B): la sala es_oficial solo la
        // publica el admin (Bearer ADMIN_SECRET o email brsk84@gmail.com).
        var chatEsAdmin = false;
        var chatBearer = (req.headers.authorization || '');
        if (chatBearer.indexOf('Bearer ') === 0) {
          chatEsAdmin = (chatBearer.slice(7) === (process.env.ADMIN_SECRET || 'exploraco12345'));
        }
        if (!chatEsAdmin && usuarioId2) {
          var chatUE = await sql('SELECT email FROM usuarios WHERE id=$1::uuid LIMIT 1', [usuarioId2]).catch(function(e){ console.error('[chat_msg] admin email lookup: ' + (e && e.message)); return []; });
          if (chatUE && chatUE[0] && String(chatUE[0].email || '').toLowerCase() === 'brsk84@gmail.com') chatEsAdmin = true;
        }
        if (salaValida[0].tipo === 'viajeros' && salaValida[0].es_oficial === true && !chatEsAdmin)
          return res.status(403).json({ ok: false, error: 'Solo el administrador puede publicar en el canal oficial' });
        var autorMsg = await sql('SELECT nombre FROM usuarios WHERE id=$1 LIMIT 1', [usuarioId2]).catch(function(){ return []; });
        var nombreMsg = autorMsg[0] && autorMsg[0].nombre ? String(autorMsg[0].nombre).slice(0, 60) : 'Viajero';
        var msgIns = await sql(
          'INSERT INTO chat_mensajes (sala_id, usuario_id, nombre, texto) '
          + 'VALUES ($1, $2, $3, $4) RETURNING id, creado_en',
          [msgSala, usuarioId2, nombreMsg, msgTexto]
        );
        var xpChat = 0, misionesChat = [], logrosChat = [];
        var detalleChat = null;
        var dispChat = await chatXpDisponible(sql, usuarioId2);
        if (dispChat.disponible) {
          xpChat = dispChat.xp;
          var ctxChat = await contextoXpE(sql, usuarioId2);
          var resChat = await calcularXpAcreditado(sql, XP_BASES.chat_comentario,
            ctxChat.nivel_clase, ctxChat.clase_id, ctxChat.tag,
            { nivel_usuario: ctxChat.nivel_usuario });
          var xpChatFinal = resChat.xp_final;
          // ADR-053 Dec 7 (v25): cupo de chat = 10 XP/dia -> la fila del
          // ledger va con cap_aplicado 'accion' y xp_final real.
          detalleChat = armarXpDetalle(XP_BASES.chat_comentario, resChat, 0, xpChatFinal, 'accion');
          await sql(
            'UPDATE usuarios SET xp_total = xp_total + $1, ultimo_acceso = NOW() WHERE id = $2',
            [xpChatFinal, usuarioId2]
          ).catch(function(){});
          await acreditarClaseYCofre(sql, usuarioId2, ctxChat, xpChatFinal);
          await registrarChatXp(sql, usuarioId2, dispChat.hoy, dispChat.n);
          // v13: reparto multinivel del XP ganado (piramide de
          // referidos, no bloquea).
          await repartirXpReferidos(sql, usuarioId2, xpChatFinal);
          await registrarXpLedger(sql, {
            usuario_id: usuarioId2, accion: 'chat_comentario', xp_base: XP_BASES.chat_comentario,
            mult_nivel: resChat.m_nivel, mult_stack: resChat.mult_stack,
            mult_final: resChat.mult_global_c, cap_aplicado: 'accion',
            xp_final: xpChatFinal, contexto: { sala_id: msgSala, canal: 'chat' }
          });
          xpChat = xpChatFinal;
        }
        misionesChat = await evaluarMisiones(sql, usuarioId2);
        logrosChat = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({
          ok: true,
          id: msgIns[0].id,
          creado_en: msgIns[0].creado_en,
          xp: xpChat,
          xp_detalle: detalleChat || undefined,
          misiones: misionesChat,
          logros: logrosChat
        });
      }

      // Canal oficial (sub-modulo 3B): anuncio broadcast del admin a la
      // sala es_oficial. Exige Bearer ADMIN_SECRET; el usuario_id es
      // opcional (columna nullable) y jamas se inventa un id inexistente.
      if (tipo2 === 'anuncio_oficial') {
        var anunBearer = req.headers.authorization || '';
        var anunEsAdmin = anunBearer.indexOf('Bearer ') === 0
          && anunBearer.slice(7) === (process.env.ADMIN_SECRET || 'exploraco12345');
        if (!anunEsAdmin)
          return res.status(403).json({ ok: false, error: 'Solo el administrador puede publicar anuncios oficiales' });
        var anunTexto = String(body.texto || '').trim();
        if (!anunTexto)
          return res.status(400).json({ ok: false, error: 'texto requerido' });
        if (anunTexto.length > 1000)
          return res.status(400).json({ ok: false, error: 'texto maximo 1000 caracteres' });
        var anunSala = await sql(
          'SELECT id FROM chat_salas WHERE es_oficial = true LIMIT 1',
          []
        );
        if (!anunSala.length)
          return res.status(404).json({ ok: false, error: 'No existe una sala oficial' });
        var anunUsuario = usuarioId2 || null;
        var anunIns = await sql(
          'INSERT INTO chat_mensajes (sala_id, usuario_id, nombre, texto) '
          + 'VALUES ($1, $2, \'ExploraCO Oficial\', $3) RETURNING id, creado_en',
          [anunSala[0].id, anunUsuario, anunTexto]
        );
        return res.status(200).json({ ok: true, data: { id: anunIns[0].id, creado_en: anunIns[0].creado_en } });
      }

      // Tributo configurable de Casa (sub-modulo 4C): el admin (Bearer)
      // o el lider_user_id de la Casa pueden fijar tributo_pct (0-15).
      if (tipo2 === 'casa_tributo_config') {
        var ctcCasa = String(body.casa || '').toLowerCase();
        var ctcPct = parseFloat(body.tributo_pct);
        if (['condor', 'jaguar', 'delfin'].indexOf(ctcCasa) === -1)
          return res.status(400).json({ ok: false, error: 'casa invalida' });
        if (!isFinite(ctcPct) || ctcPct < 0 || ctcPct > 15)
          return res.status(400).json({ ok: false, error: 'tributo_pct debe estar entre 0 y 15' });
        var ctcBearer = req.headers.authorization || '';
        var ctcEsAdmin = ctcBearer.indexOf('Bearer ') === 0
          && ctcBearer.slice(7) === (process.env.ADMIN_SECRET || 'exploraco12345');
        var ctcAutorizado = ctcEsAdmin;
        if (!ctcAutorizado && usuarioId2 && validarSesion(req, usuarioId2).ok) {
          var ctcLider = await sql(
            'SELECT lider_user_id FROM casas_cofre WHERE casa=$1 LIMIT 1',
            [ctcCasa]
          ).catch(function(e){ console.error('[casa_tributo_config] lider lookup: ' + (e && e.message)); return []; });
          if (ctcLider.length && ctcLider[0].lider_user_id
              && String(ctcLider[0].lider_user_id) === String(usuarioId2)) ctcAutorizado = true;
        }
        if (!ctcAutorizado)
          return res.status(403).json({ ok: false, error: 'Solo el administrador o el lider de la Casa pueden configurar el tributo' });
        await sql(
          'UPDATE casas_cofre SET tributo_pct=$1, actualizado_en=NOW() WHERE casa=$2',
          [ctcPct, ctcCasa]
        );
        return res.status(200).json({ ok: true, casa: ctcCasa, tributo_pct: ctcPct });
      }

      // Moderacion de chat (capacidad moderador_chat, nivel 4): fijar
      // (toggle) o eliminar (soft-delete) un mensaje de una sala.
      if (tipo2 === 'chat_mod') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var puedeMod = await misionCompletada(sql, usuarioId2, 'mis_chat_moderador');
        if (!puedeMod)
          return res.status(403).json({ ok: false, error: 'Desbloquea Moderador de chat (nivel 4) para moderar' });
        var modSala = String(body.sala_id || '');
        var modMsgId = String(body.msg_id || '');
        var modAccion = String(body.accion || '');
        if (!modSala || !modMsgId)
          return res.status(400).json({ ok: false, error: 'sala_id y msg_id requeridos' });
        if (modAccion !== 'fijar' && modAccion !== 'eliminar')
          return res.status(400).json({ ok: false, error: 'accion debe ser fijar o eliminar' });
        // WP-3 (privacidad): los moderadores no pueden tocar salas
        // privadas (plan o DM); chat_mod solo opera sobre salas publicas.
        var modSalaRow = await sql(
          'SELECT tipo FROM chat_salas WHERE id=$1 AND activo=true LIMIT 1',
          [modSala]
        ).catch(function(){ return []; });
        if (modSalaRow.length && (modSalaRow[0].tipo === 'plan' || modSalaRow[0].tipo === 'dm'))
          return res.status(403).json({ ok: false, error: 'SALA_PRIVADA' });
        var modTarget = await sql(
          'SELECT id FROM chat_mensajes WHERE id=$1 AND sala_id=$2 AND activo=true LIMIT 1',
          [modMsgId, modSala]
        ).catch(function(){ return []; });
        if (!modTarget.length)
          return res.status(404).json({ ok: false, error: 'Mensaje no encontrado' });
        if (modAccion === 'fijar') {
          await sql('UPDATE chat_mensajes SET fijado = NOT fijado WHERE id = $1', [modMsgId]);
        } else {
          await sql('UPDATE chat_mensajes SET activo = false WHERE id = $1', [modMsgId]);
        }
        return res.status(200).json({ ok: true });
      }

      // Crear plan de viaje (gate: chat desbloqueado, nivel 3). El XP
      // llega por la mision mis_plan_creador (25 XP, una vez).
      if (tipo2 === 'plan_crear') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var puedePlan = await misionCompletada(sql, usuarioId2, 'mis_chat_mensajero');
        if (!puedePlan)
          return res.status(403).json({ ok: false, error: 'Desbloquea el chat (nivel 3) para crear planes' });
        var planDestino = String(body.destino || '').trim();
        var planFechas = String(body.fechas || '').trim();
        var planCupos = parseInt(body.cupos, 10);
        var planDesc = String(body.descripcion || '').trim();
        if (!planDestino)
          return res.status(400).json({ ok: false, error: 'destino requerido' });
        if (planDestino.length > 80)
          return res.status(400).json({ ok: false, error: 'destino maximo 80 caracteres' });
        if (isNaN(planCupos) || planCupos < 1 || planCupos > 50)
          return res.status(400).json({ ok: false, error: 'cupos debe ser entre 1 y 50' });
        if (planFechas.length > 60)
          return res.status(400).json({ ok: false, error: 'fechas maximo 60 caracteres' });
        if (planDesc.length > 300)
          return res.status(400).json({ ok: false, error: 'descripcion maximo 300 caracteres' });
        var planIns = await sql(
          'INSERT INTO planes_viaje (destino, fechas, cupos, descripcion, creador_id) '
          + 'VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [planDestino, planFechas, planCupos, planDesc, usuarioId2]
        );

        // v12 (epic 2026-09-13, migracion 015): el plan nace con su sala
        // de chat privada (tipo='plan', icono calendario) y se liga via
        // planes_viaje.sala_id. Alta secuencial sin transaccion explicita
        // (patron del archivo); si falla la sala, el plan sigue valido.
        var planSalaIns = await sql(
          'INSERT INTO chat_salas (nombre, icono, descripcion, tipo, orden, creador_id) '
          + 'VALUES ($1, $2, $3, \'plan\', 0, $4) RETURNING id',
          ['Plan: ' + planDestino, '\uD83D\uDCC5', planFechas || 'Chat privado del plan', usuarioId2]
        ).catch(function(){ return []; });
        if (planSalaIns.length) {
          await sql(
            'UPDATE planes_viaje SET sala_id = $1 WHERE id = $2',
            [planSalaIns[0].id, planIns[0].id]
          ).catch(function(){});
          planIns[0].sala_id = planSalaIns[0].id;
        }
        // ADR-053 Dec 9 (v25): plan_crear acredita +20 XP DIRECTO con
        // M_nivel y cap de 3/dia. La mision mis_plan_creador baja a 10 y se
        // evalua aparte (EXENTA). El conteo incluye este plan (ya
        // insertado): los 3 primeros del dia pagan; el 4+ no.
        var planHoy = await sql(
          'SELECT COUNT(*)::int AS n FROM planes_viaje '
          + 'WHERE creador_id=$1 AND creado_en > NOW() - INTERVAL \'1 day\'',
          [usuarioId2]
        ).catch(function(ePlan) {
          console.warn('[plan_crear] conteo diario no leido: ' + (ePlan && ePlan.message));
          return [];
        });
        var planN = (planHoy[0] && parseInt(planHoy[0].n, 10)) || 0;
        var planXpFinal = 0;
        var detallePlan = null;
        if (planN <= 3) {
          var ctxPlan = await contextoXpE(sql, usuarioId2);
          var resPlan = await calcularXpAcreditado(sql, XP_BASES.plan_crear,
            ctxPlan.nivel_clase, ctxPlan.clase_id, ctxPlan.tag,
            { nivel_usuario: ctxPlan.nivel_usuario });
          planXpFinal = resPlan.xp_final;
          detallePlan = armarXpDetalle(XP_BASES.plan_crear, resPlan, 0);
          await sql(
            'UPDATE usuarios SET xp_total = xp_total + $1, ultimo_acceso = NOW() WHERE id=$2',
            [planXpFinal, usuarioId2]
          ).catch(function(ePlanXp) { console.warn('[plan_crear] xp no acreditado: ' + (ePlanXp && ePlanXp.message)); });
          await acreditarClaseYCofre(sql, usuarioId2, ctxPlan, planXpFinal);
          await repartirXpReferidos(sql, usuarioId2, planXpFinal);
          await registrarXpLedger(sql, {
            usuario_id: usuarioId2, accion: 'plan_crear', xp_base: XP_BASES.plan_crear,
            mult_nivel: resPlan.m_nivel, mult_stack: resPlan.mult_stack,
            mult_final: resPlan.mult_global_c, cap_aplicado: resPlan.cap_aplicado,
            xp_final: planXpFinal, contexto: { plan_id: planIns[0].id }
          });
        } else {
          await registrarXpLedger(sql, {
            usuario_id: usuarioId2, accion: 'plan_crear', xp_base: XP_BASES.plan_crear,
            mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'accion',
            xp_final: 0, contexto: { plan_id: planIns[0].id, motivo: 'cap_diario_3' }
          });
        }
        var misionesPlan = await evaluarMisiones(sql, usuarioId2);
        var logrosPlan = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, id: planIns[0].id, xp: planXpFinal, xp_detalle: detallePlan || undefined, misiones: misionesPlan, logros: logrosPlan });
      }

      // Unirse a un plan (libre para registrados). Dedup por PK (409),
      // 403 si es el plan propio, 409 si esta lleno. El XP llega por la
      // mision mis_plan_unido (15 XP, una vez).
      if (tipo2 === 'plan_unirse') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var joinPlan = String(body.plan_id || '');
        if (!joinPlan)
          return res.status(400).json({ ok: false, error: 'plan_id requerido' });
        var planRow = await sql(
          'SELECT id, creador_id, cupos FROM planes_viaje WHERE id=$1 AND activo=true LIMIT 1',
          [joinPlan]
        ).catch(function(){ return []; });
        if (!planRow.length)
          return res.status(404).json({ ok: false, error: 'Plan no encontrado' });
        if (planRow[0].creador_id === usuarioId2)
          return res.status(403).json({ ok: false, error: 'No puedes unirte a tu propio plan' });
        var miembrosNow = await sql(
          'SELECT COUNT(*)::int AS n FROM planes_miembros WHERE plan_id=$1',
          [joinPlan]
        ).catch(function(){ return []; });
        var nMiembros = (miembrosNow[0] && parseInt(miembrosNow[0].n, 10)) || 0;
        if (nMiembros >= (parseInt(planRow[0].cupos, 10) || 0))
          return res.status(409).json({ ok: false, error: 'Plan lleno' });
        try {
          await sql(
            'INSERT INTO planes_miembros (plan_id, usuario_id) VALUES ($1, $2)',
            [joinPlan, usuarioId2]
          );
        } catch (eJoin) {
          return res.status(409).json({ ok: false, error: 'Ya estas en este plan' });
        }
        // ADR-053 Dec 9 (v25): plan_unirse acredita +6 XP DIRECTO con
        // M_nivel y cap de 5/dia. La mision mis_plan_unido baja a 10 y se
        // evalua aparte (EXENTA). El conteo incluye esta unirse (ya
        // insertada): las 5 primeras del dia pagan; la 6+ no.
        var joinHoy = await sql(
          'SELECT COUNT(*)::int AS n FROM planes_miembros '
          + 'WHERE usuario_id=$1 AND creado_en > NOW() - INTERVAL \'1 day\'',
          [usuarioId2]
        ).catch(function(eJoinC) {
          console.warn('[plan_unirse] conteo diario no leido: ' + (eJoinC && eJoinC.message));
          return [];
        });
        var joinN = (joinHoy[0] && parseInt(joinHoy[0].n, 10)) || 0;
        var joinXpFinal = 0;
        var detalleJoin = null;
        if (joinN <= 5) {
          var ctxJoin = await contextoXpE(sql, usuarioId2);
          var resJoin = await calcularXpAcreditado(sql, XP_BASES.plan_unirse,
            ctxJoin.nivel_clase, ctxJoin.clase_id, ctxJoin.tag,
            { nivel_usuario: ctxJoin.nivel_usuario });
          joinXpFinal = resJoin.xp_final;
          detalleJoin = armarXpDetalle(XP_BASES.plan_unirse, resJoin, 0);
          await sql(
            'UPDATE usuarios SET xp_total = xp_total + $1, ultimo_acceso = NOW() WHERE id=$2',
            [joinXpFinal, usuarioId2]
          ).catch(function(eJoinXp) { console.warn('[plan_unirse] xp no acreditado: ' + (eJoinXp && eJoinXp.message)); });
          await acreditarClaseYCofre(sql, usuarioId2, ctxJoin, joinXpFinal);
          await repartirXpReferidos(sql, usuarioId2, joinXpFinal);
          await registrarXpLedger(sql, {
            usuario_id: usuarioId2, accion: 'plan_unirse', xp_base: XP_BASES.plan_unirse,
            mult_nivel: resJoin.m_nivel, mult_stack: resJoin.mult_stack,
            mult_final: resJoin.mult_global_c, cap_aplicado: resJoin.cap_aplicado,
            xp_final: joinXpFinal, contexto: { plan_id: joinPlan }
          });
        } else {
          await registrarXpLedger(sql, {
            usuario_id: usuarioId2, accion: 'plan_unirse', xp_base: XP_BASES.plan_unirse,
            mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'accion',
            xp_final: 0, contexto: { plan_id: joinPlan, motivo: 'cap_diario_5' }
          });
        }
        var misionesJoin = await evaluarMisiones(sql, usuarioId2);
        var logrosJoin = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, xp: joinXpFinal, xp_detalle: detalleJoin || undefined, misiones: misionesJoin, logros: logrosJoin });
      }

      // Salir de un plan.
      if (tipo2 === 'plan_salir') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var leavePlan = String(body.plan_id || '');
        if (!leavePlan)
          return res.status(400).json({ ok: false, error: 'plan_id requerido' });
        await sql(
          'DELETE FROM planes_miembros WHERE plan_id=$1 AND usuario_id=$2',
          [leavePlan, usuarioId2]
        );
        return res.status(200).json({ ok: true });
      }

      // Mensaje en el chat privado de un plan (epic 2026-09-13): gates
      // de membresia (miembro o creador) y de capacidad de chat (misma
      // mision que chat_msg); +2 XP con tope diario de 20 via
      // registrarChatXp (helper reutilizado, no duplicado). Mismo shape
      // que chat_msg + plan_id.
      if (tipo2 === 'plan_chat_msg') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var puedePlanChat = await misionCompletada(sql, usuarioId2, 'mis_chat_mensajero');
        if (!puedePlanChat)
          return res.status(403).json({ ok: false, error: 'Desbloquea el chat (nivel 3, 250 XP) para escribir mensajes' });
        var pcmPlanId = String(body.plan_id || '');
        var pcmTexto = String(body.texto || '').trim();
        if (!pcmPlanId)
          return res.status(400).json({ ok: false, error: 'plan_id requerido' });
        if (!pcmTexto)
          return res.status(400).json({ ok: false, error: 'mensaje vacio' });
        if (pcmTexto.length > 500)
          return res.status(400).json({ ok: false, error: 'mensaje maximo 500 caracteres' });
        var pcmPlan = await sql(
          'SELECT id, creador_id, sala_id FROM planes_viaje WHERE id=$1 AND activo=true LIMIT 1',
          [pcmPlanId]
        ).catch(function(){ return []; });
        if (!pcmPlan.length)
          return res.status(404).json({ ok: false, error: 'Plan no encontrado' });
        var pcmEsCreador = String(pcmPlan[0].creador_id) === String(usuarioId2);
        if (!pcmEsCreador) {
          var pcmMemb = await sql(
            'SELECT 1 FROM planes_miembros WHERE plan_id=$1 AND usuario_id=$2 LIMIT 1',
            [pcmPlanId, usuarioId2]
          ).catch(function(){ return []; });
          if (!pcmMemb.length)
            return res.status(403).json({ ok: false, error: 'Solo miembros del plan' });
        }
        if (!pcmPlan[0].sala_id)
          return res.status(400).json({ ok: false, error: 'Este plan aun no tiene chat' });
        var autorPcm = await sql(
          'SELECT nombre FROM usuarios WHERE id=$1 LIMIT 1',
          [usuarioId2]
        ).catch(function(){ return []; });
        var nombrePcm = autorPcm[0] && autorPcm[0].nombre ? String(autorPcm[0].nombre).slice(0, 60) : 'Viajero';
        var pcmIns = await sql(
          'INSERT INTO chat_mensajes (sala_id, usuario_id, nombre, texto) '
          + 'VALUES ($1, $2, $3, $4) RETURNING id, creado_en',
          [pcmPlan[0].sala_id, usuarioId2, nombrePcm, pcmTexto]
        );
        var xpPcm = 0, misionesPcm = [], logrosPcm = [];
        var detallePcm = null;
        var dispPcm = await chatXpDisponible(sql, usuarioId2);
        if (dispPcm.disponible) {
          xpPcm = dispPcm.xp;
          var ctxPcm = await contextoXpE(sql, usuarioId2);
          var resPcm = await calcularXpAcreditado(sql, XP_BASES.chat_comentario,
            ctxPcm.nivel_clase, ctxPcm.clase_id, ctxPcm.tag,
            { nivel_usuario: ctxPcm.nivel_usuario });
          var xpPcmFinal = resPcm.xp_final;
          detallePcm = armarXpDetalle(XP_BASES.chat_comentario, resPcm, 0, xpPcmFinal, 'accion');
          await sql(
            'UPDATE usuarios SET xp_total = xp_total + $1, ultimo_acceso = NOW() WHERE id = $2',
            [xpPcmFinal, usuarioId2]
          ).catch(function(){});
          await acreditarClaseYCofre(sql, usuarioId2, ctxPcm, xpPcmFinal);
          await registrarChatXp(sql, usuarioId2, dispPcm.hoy, dispPcm.n);
          // v13: reparto multinivel del XP ganado (no bloquea).
          await repartirXpReferidos(sql, usuarioId2, xpPcmFinal);
          await registrarXpLedger(sql, {
            usuario_id: usuarioId2, accion: 'chat_comentario', xp_base: XP_BASES.chat_comentario,
            mult_nivel: resPcm.m_nivel, mult_stack: resPcm.mult_stack,
            mult_final: resPcm.mult_global_c, cap_aplicado: 'accion',
            xp_final: xpPcmFinal, contexto: { plan_id: pcmPlanId, canal: 'plan_chat' }
          });
          xpPcm = xpPcmFinal;
        }
        misionesPcm = await evaluarMisiones(sql, usuarioId2);
        logrosPcm = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({
          ok: true,
          id: pcmIns[0].id,
          creado_en: pcmIns[0].creado_en,
          plan_id: pcmPlanId,
          xp: xpPcm,
          xp_detalle: detallePcm || undefined,
          misiones: misionesPcm,
          logros: logrosPcm
        });
      }

      // -- Mensajeria Directa (TSK-103 / ADR-028, WP-3) --------------
      // Enviar un DM. Gate P-4: remitente nivel >= 3, email verificado,
      // receptor distinto, texto 1..500. Bloqueo en CUALQUIER direccion
      // (usuario_bloqueos) -> 403. Hilo nuevo: cobra 20 XP al emisor con
      // el patron atomico de comprar_consumible (WHERE xp_total >= 20) y
      // devuelve nivel_anterior/nivel_nuevo/bajo_nivel; si el receptor
      // tiene dm_abierto=false y NO hay hilo previo -> 403 DM_CERRADO.
      // Tope 5 hilos nuevos/dia. Responder en un hilo abierto es gratis.
      // El DM NO otorga XP a nadie ni reparte referidos.
      if (tipo2 === 'dm_enviar') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var dmSes = validarSesion(req, usuarioId2);
        if (!dmSes.ok) return responderSesion(res, dmSes.razon);
        var dmReceptor = String(body.receptor_id || '');
        var dmTexto = String(body.texto || '').trim();
        if (!dmReceptor)
          return res.status(400).json({ ok: false, error: 'receptor_id requerido' });
        if (dmReceptor === String(usuarioId2))
          return res.status(409).json({ ok: false, error: 'DM_A_MI_MISMO' });
        if (!dmTexto)
          return res.status(400).json({ ok: false, error: 'mensaje vacio' });
        if (dmTexto.length > 500)
          return res.status(400).json({ ok: false, error: 'mensaje maximo 500 caracteres' });
        var dmEmisorRow = await sql(
          'SELECT id, nombre, xp_total, email_verificado FROM usuarios WHERE id=$1 LIMIT 1',
          [usuarioId2]
        );
        if (!dmEmisorRow.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var dmEmisor = dmEmisorRow[0];
        var dmNivel = calcularNivelLocal(numXp(dmEmisor.xp_total)).nivel;
        if (dmNivel < 3)
          return res.status(403).json({ ok: false, error: 'NIVEL_INSUFICIENTE', nivel: dmNivel });
        if (!(dmEmisor.email_verificado === true))
          return res.status(403).json({ ok: false, error: 'EMAIL_SIN_VERIFICAR' });
        var dmReceptorRow = await sql(
          'SELECT id, nombre, dm_abierto FROM usuarios WHERE id=$1 LIMIT 1',
          [dmReceptor]
        );
        if (!dmReceptorRow.length)
          return res.status(404).json({ ok: false, error: 'Receptor no encontrado' });
        var dmBloqueo = await sql(
          'SELECT 1 AS uno FROM usuario_bloqueos'
          + ' WHERE (bloqueador_id=$1 AND bloqueado_id=$2)'
          + '    OR (bloqueador_id=$2 AND bloqueado_id=$1) LIMIT 1',
          [usuarioId2, dmReceptor]
        );
        if (dmBloqueo.length)
          return res.status(403).json({ ok: false, error: 'DM_BLOQUEADO' });
        var dmClave = claveDm(usuarioId2, dmReceptor);
        var dmSalaPrev = await sql(
          'SELECT id FROM chat_salas WHERE clave_dm=$1 AND tipo=\'dm\' AND activo=true LIMIT 1',
          [dmClave]
        );
        var dmSalaId = dmSalaPrev.length ? dmSalaPrev[0].id : null;
        var dmXpCobrado = 0;
        var dmXpAntes = numXp(dmEmisor.xp_total);
        var dmNivelAnt = dmNivel;
        var dmXpNuevo = dmXpAntes;
        if (!dmSalaId) {
          if (dmReceptorRow[0].dm_abierto === false)
            return res.status(403).json({ ok: false, error: 'DM_CERRADO' });
          var dmNuevosHoy = await sql(
            'SELECT COUNT(*)::int AS n FROM chat_salas'
            + ' WHERE creador_id=$1 AND tipo=\'dm\' AND creado_en > NOW() - INTERVAL \'1 day\'',
            [usuarioId2]
          );
          if ((dmNuevosHoy[0] && dmNuevosHoy[0].n) >= 5)
            return res.status(429).json({ ok: false, error: 'DM_LIMITE_DIARIO' });
          var dmNombre = 'DM ' + String(dmEmisor.nombre || 'Viajero').slice(0, 30);
          // Alta + cobro atomicos (patron comprar_consumible): el INSERT
          // solo ocurre si xp_total >= 20 (CTE puede); el UPDATE de cobro
          // REPITE el guard xp_total >= 20 (cierra la carrera de dos hilos
          // nuevos concurrentes con 20-39 XP: el segundo UPDATE relee la
          // fila ya descontada y no deja xp negativo), solo si el INSERT
          // creo fila (CTE cobro con EXISTS nueva) y devuelve el xp_total
          // real para no recalcularlo en JS (dmXpAntes - 20).
          var dmNueva = await sql(
            'WITH puede AS (SELECT id FROM usuarios WHERE id=$4 AND xp_total >= 20),'
            + ' nueva AS (INSERT INTO chat_salas (nombre, icono, descripcion, tipo, orden, creador_id, clave_dm)'
            + '   SELECT $1,$2,$3,\'dm\',0,$4,$5 FROM puede'
            + '   ON CONFLICT (clave_dm) WHERE tipo=\'dm\' AND clave_dm IS NOT NULL DO NOTHING'
            + '   RETURNING id),'
            + ' cobro AS (UPDATE usuarios SET xp_total = xp_total - 20'
            + '   WHERE id=$4 AND xp_total >= 20 AND EXISTS (SELECT 1 FROM nueva) RETURNING xp_total)'
            + ' SELECT (SELECT id FROM nueva) AS sala_id, (SELECT xp_total FROM cobro) AS xp_total',
            [dmNombre, '\uD83D\uDCAC', 'Mensajeria directa', usuarioId2, dmClave]
          );
          var dmCobro = dmNueva.length ? dmNueva[0] : {};
          if (dmCobro.xp_total !== null && dmCobro.xp_total !== undefined) {
            // Cobro confirmado por la BD: sala nueva + xp_total_nuevo real.
            dmSalaId = dmCobro.sala_id;
            dmXpCobrado = 20;
            dmXpNuevo = numXp(dmCobro.xp_total);
            // ADR-053 (v25): las RESTAS de XP se registran EXENTAS con
            // xp_final negativo (apertura de hilo DM: -20).
            await registrarXpLedger(sql, {
              usuario_id: usuarioId2, accion: 'dm_nuevo', xp_base: 20,
              mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'ninguno',
              bonos_planos: 0, xp_final: -20, es_exento: true,
              contexto: { clave_dm: dmClave, sala_id: dmSalaId }
            });
          } else {
            // Sin fila de cobro: o xp < 20 (402) o carrera perdida contra
            // otro request que creo el hilo (se reusa, xp_cobrado 0).
            var dmReChequeo = await sql(
              'SELECT id FROM chat_salas WHERE clave_dm=$1 AND tipo=\'dm\' AND activo=true LIMIT 1',
              [dmClave]
            );
            if (dmReChequeo.length) {
              dmSalaId = dmReChequeo[0].id;
            } else {
              return res.status(402).json({ ok: false, error: 'PUNTOS_INSUFICIENTES' });
            }
          }
        }
        var dmIns = await sql(
          'INSERT INTO chat_mensajes (sala_id, usuario_id, nombre, texto)'
          + ' VALUES ($1,$2,$3,$4) RETURNING id, creado_en',
          [dmSalaId, usuarioId2, String(dmEmisor.nombre || 'Viajero').slice(0, 60), dmTexto]
        );
        var dmNivelNuevo = calcularNivelLocal(dmXpNuevo).nivel;
        return res.status(200).json({
          ok: true,
          sala_id: dmSalaId,
          clave_dm: dmClave,
          id: dmIns[0].id,
          creado_en: dmIns[0].creado_en,
          xp_cobrado: dmXpCobrado,
          xp_total_nuevo: red2(dmXpNuevo),
          nivel_anterior: dmNivelAnt,
          nivel_nuevo: dmNivelNuevo,
          bajo_nivel: dmNivelNuevo < dmNivelAnt,
        });
      }

      // Bloquear / desbloquear a un usuario (DM). INSERT ... ON CONFLICT
      // DO NOTHING (PK compuesta bloqueador+bloqueado) o DELETE fisico de
      // la relacion (excepcion acotada de la migracion 017: un bloqueo
      // debe cesar de inmediato). Con sesion firmada.
      if (tipo2 === 'dm_bloquear') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var dbSes = validarSesion(req, usuarioId2);
        if (!dbSes.ok) return responderSesion(res, dbSes.razon);
        var dbBloqueado = String(body.bloqueado_id || '');
        var dbAccion = String(body.accion || '');
        if (!dbBloqueado)
          return res.status(400).json({ ok: false, error: 'bloqueado_id requerido' });
        if (dbBloqueado === String(usuarioId2))
          return res.status(409).json({ ok: false, error: 'BLOQUEO_A_MI_MISMO' });
        if (dbAccion === 'bloquear') {
          await sql(
            'INSERT INTO usuario_bloqueos (bloqueador_id, bloqueado_id) VALUES ($1,$2)'
            + ' ON CONFLICT (bloqueador_id, bloqueado_id) DO NOTHING',
            [usuarioId2, dbBloqueado]
          );
          return res.status(200).json({ ok: true, bloqueado: true });
        }
        if (dbAccion === 'desbloquear') {
          await sql(
            'DELETE FROM usuario_bloqueos WHERE bloqueador_id=$1 AND bloqueado_id=$2',
            [usuarioId2, dbBloqueado]
          );
          return res.status(200).json({ ok: true, bloqueado: false });
        }
        return res.status(400).json({ ok: false, error: 'accion debe ser bloquear o desbloquear' });
      }

      // -- Review_voto (Milestones v2 / ADR-014, SKATE "Own the Spot") --
      // Voto util sobre una resena existente. Se maneja ANTES del guard
      // generico de destino_id porque recibe resena_id, no destino_id.
      // Dedup por usuario+resena (tabla resena_votos, PK compuesta);
      // incrementa votos_utiles en la fila de la resena. No otorga XP:
      // es un voto de utilidad, no una accion de viaje. Requiere la
      // migracion 007 (tabla resena_votos).
      if (tipo2 === 'review_voto') {
        var resenaVotoId = body.resena_id || null;
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        if (!resenaVotoId)
          return res.status(400).json({ ok: false, error: 'resena_id requerido' });

        var resenaVotoTarget = await sql(
          'SELECT id, usuario_id AS autor_id FROM interacciones WHERE id=$1 AND tipo=\'resena\' LIMIT 1',
          [resenaVotoId]
        ).catch(function(){ return []; });
        if (!resenaVotoTarget.length)
          return res.status(404).json({ ok: false, error: 'Resena no encontrada' });

        // H-1 (QA Milestones v2): un autor no puede votar su propia
        // resena como util -- seria un "self-vote" que lo corona lider
        // del spot (y x1.1 en toda la ciudad) sin merito real.
        if (resenaVotoTarget[0].autor_id && resenaVotoTarget[0].autor_id === usuarioId2)
          return res.status(403).json({ ok: false, error: 'No puedes votar tu propia resena' });

        var yaVotoUtil = await sql(
          'SELECT 1 AS uno FROM resena_votos WHERE usuario_id=$1 AND resena_id=$2 LIMIT 1',
          [usuarioId2, resenaVotoId]
        ).catch(function(){ return []; });
        if (yaVotoUtil.length > 0)
          return res.status(409).json({
            ok: false,
            error: 'Ya votaste esta resena como util',
            ya_votado: true,
          });

        // H-2 (QA Milestones v2): la escritura NO se silencia. Si la
        // migracion 007 (tabla resena_votos / votos_utiles) no corrio,
        // el POST debe fallar con 503 en vez de responder 200 sin
        // persistir nada (Regla de Oro: no capturar generico que
        // silencie fallos de integracion).
        try {
          await sql(
            'INSERT INTO resena_votos (usuario_id, resena_id) VALUES ($1,$2)',
            [usuarioId2, resenaVotoId]
          );
          await sql(
            'UPDATE interacciones SET votos_utiles = votos_utiles + 1 WHERE id=$1',
            [resenaVotoId]
          );
        } catch (eReviewVoto) {
          console.error('[interacciones] review_voto fallo (migracion 007 pendiente?): ' + eReviewVoto.message);
          return res.status(503).json({ ok: false, error: 'Voto util no disponible: migracion pendiente' });
        }

        return res.status(200).json({ ok: true, votos_utiles: 1 });
      }

      // -- Foto de viajero (desbloqueable: capacidad subir_fotos) --
      // Subir foto a un destino: se persiste como interaccion tipo='foto'
      // con texto=URL. Requiere la mision 'mis_fotografo' completada
      // (Nivel 2 + primera resena). +15 XP.
      if (tipo2 === 'foto') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        if (!destinoId2)
          return res.status(400).json({ ok: false, error: 'destino_id requerido' });
        var fotoUrl = String(body.url || body.foto_url || '').trim();
        if (!/^https?:\/\//.test(fotoUrl) || fotoUrl.length > 2000)
          return res.status(400).json({ ok: false, error: 'URL de foto inv\u00e1lida' });
        var capFoto = await sql(
          "SELECT (progreso_misiones->'mis_fotografo'->>'estado') = 'completada' AS ok FROM usuarios WHERE id=$1",
          [usuarioId2]
        ).catch(function(){ return []; });
        if (!(capFoto[0] && capFoto[0].ok))
          return res.status(403).json({ ok: false, error: 'Desbloquea Subir fotos (nivel 2) para publicar fotos' });

        var fotoIns = await sql(
          "INSERT INTO interacciones (destino_id, usuario_id, tipo, texto, xp_ganado, creado_en) "
          + "VALUES ($1, $2, 'foto', $3, $4, NOW()) RETURNING id",
          [destinoId2, usuarioId2, fotoUrl, XP_BASES.foto_viajero]
        );
        var misionesFoto = [], logrosFoto = [];
        var ctxFoto = await contextoXpE(sql, usuarioId2);
        var resFoto = await calcularXpAcreditado(sql, XP_BASES.foto_viajero,
          ctxFoto.nivel_clase, ctxFoto.clase_id, ctxFoto.tag,
          { nivel_usuario: ctxFoto.nivel_usuario });
        var xpFotoFinal = resFoto.xp_final;
        await sql('UPDATE usuarios SET xp_total=xp_total+$1, ultimo_acceso=NOW() WHERE id=$2', [xpFotoFinal, usuarioId2]).catch(function(){});
        await acreditarClaseYCofre(sql, usuarioId2, ctxFoto, xpFotoFinal);
        await avanzarMisionesCasa(sql, usuarioId2, 'fotos', 1);
        // v13: reparto multinivel del XP ganado (no bloquea).
        await repartirXpReferidos(sql, usuarioId2, xpFotoFinal);
        await registrarXpLedger(sql, {
          usuario_id: usuarioId2, accion: 'foto_viajero', xp_base: XP_BASES.foto_viajero,
          mult_nivel: resFoto.m_nivel, mult_stack: resFoto.mult_stack,
          mult_final: resFoto.mult_global_c, cap_aplicado: resFoto.cap_aplicado,
          xp_final: xpFotoFinal, contexto: { destino_id: destinoId2, tipo: 'foto' }
        });
        misionesFoto = await evaluarMisiones(sql, usuarioId2);
        logrosFoto = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, id: fotoIns[0].id, xp: xpFotoFinal, xp_detalle: armarXpDetalle(XP_BASES.foto_viajero, resFoto, 0), misiones: misionesFoto, logros: logrosFoto });
      }

      // -- Voto en foto (+5 XP al votante) --
      // -- Voto en foto de viajero (alias legacy de media_voto) --------
      // v19 (ADR-036): delega en el modelo unificado con fuente
      // 'viajero_foto'. Conserva el contrato exacto: 404 Foto no
      // encontrada, 403 self-vote, 409 Ya votaste y +5 XP la primera vez.
      // DEUDA (BUG-061): mantiene trust de usuario_id sin Bearer; pendiente
      // de validarSesion cuando sus multiples clientes migren.
      if (tipo2 === 'foto_voto') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var fotoVotoId = body.foto_id || null;
        if (!fotoVotoId)
          return res.status(400).json({ ok: false, error: 'foto_id requerido' });
        var fotoVotoRes = await registrarVotoMedia(sql, usuarioId2, 'viajero_foto', String(fotoVotoId), 'Foto no encontrada');
        if (fotoVotoRes.status !== 200)
          return res.status(fotoVotoRes.status).json({ ok: false, error: fotoVotoRes.error, ya_votado: fotoVotoRes.ya_votado || undefined });
        return res.status(200).json(await completarVotoMedia(sql, usuarioId2, fotoVotoRes));
      }

      // -- Museo multimedia URL-only (ADR-039 B, v22) ------------------
      // Recursos del Museo como URLs externas sobre album_fotos (009), con
      // visibilidad por recurso (025). Auth SIEMPRE por sesion firmada
      // (ADR-025): el usuario sale del token, NUNCA del body (BUG-061).
      // Mutaciones por accion=crear|editar|eliminar (patron del archivo).
      if (tipo2 === 'museo_recurso') {
        var mrSesPost = verificarSesion(req);
        if (!mrSesPost.ok) return responderSesion(res, mrSesPost.razon);
        var mrUser = mrSesPost.sub;
        var mrAccion = String(body.accion || 'crear').toLowerCase();
        var MR_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

        if (mrAccion === 'crear') {
          var mrUrl = String(body.url || '').trim();
          if (!/^https?:\/\//i.test(mrUrl) || mrUrl.length > 2000)
            return res.status(400).json({ ok: false, error: 'URL de recurso inv\u00e1lida' });
          var mrTipo = String(body.tipo_media || '').toLowerCase();
          if (mrTipo !== 'foto' && mrTipo !== 'video' && mrTipo !== 'audio')
            return res.status(400).json({ ok: false, error: 'tipo_media invalido' });
          var mrCaption = '';
          if (body.caption !== undefined && body.caption !== null) {
            mrCaption = String(body.caption).trim();
            if (mrCaption.length > 200)
              return res.status(400).json({ ok: false, error: 'caption maximo 200 caracteres' });
          }
          var mrVisible = aBooleano(body.visible);
          if (mrVisible === null) mrVisible = true;

          // Gate de creacion: capacidad subir_fotos (mis_fotografo). Las
          // misiones nuevas mis_videografo/mis_sonidista NO pueden ser
          // prerequisito: su check exige >=1 recurso ya creado (seria un
          // deadlock). Se evaluan como hito POST-insert. Desviacion
          // documentada respecto del literal del pedido.
          var mrCap = await misionCompletada(sql, mrUser, 'mis_fotografo');
          if (!mrCap)
            return res.status(403).json({ ok: false, error: 'Desbloquea Subir fotos (nivel 2) para publicar media' });

          // Album destino: si llega debe ser propio; si no, "Mi Museo".
          var mrAlbumId = null;
          if (body.album_id !== undefined && body.album_id !== null && String(body.album_id).trim() !== '') {
            mrAlbumId = String(body.album_id).trim();
            if (!MR_UUID.test(mrAlbumId))
              return res.status(400).json({ ok: false, error: 'album_id invalido' });
            var mrAlbumPropio = await sql(
              'SELECT id FROM albumes WHERE id=$1::uuid AND usuario_id=$2::uuid AND activo=true LIMIT 1',
              [mrAlbumId, mrUser]
            );
            if (!mrAlbumPropio.length)
              return res.status(400).json({ ok: false, error: 'album_id no pertenece al usuario' });
          } else {
            await sql(
              'INSERT INTO albumes (usuario_id, titulo, tipo)'
              + ' VALUES ($1::uuid, \'Mi Museo\', \'mixto\')'
              + ' ON CONFLICT DO NOTHING',
              [mrUser]
            );
            var mrMiMuseo = await sql(
              'SELECT id FROM albumes WHERE usuario_id=$1::uuid AND titulo=\'Mi Museo\' AND activo=true LIMIT 1',
              [mrUser]
            );
            if (!mrMiMuseo.length)
              return res.status(500).json({ ok: false, error: 'No se pudo preparar el album Mi Museo' });
            mrAlbumId = mrMiMuseo[0].id;
          }

          // A3 (ADR-051): body.lat/lng son coords DEL RECURSO (van a
          // album_fotos); body.album_lat/album_lng son coords de la CARPETA
          // (van a albumes). Si la carpeta no tiene coords y el recurso si,
          // se siembra la carpeta con las del recurso SOLO si esta vacia:
          // COALESCE(lat,$1) nunca sobrescribe coords ya existentes.
          var mrTraeLat = (body.lat !== undefined && body.lat !== null && String(body.lat).trim() !== '');
          var mrTraeLng = (body.lng !== undefined && body.lng !== null && String(body.lng).trim() !== '');
          if (mrTraeLat !== mrTraeLng)
            return res.status(400).json({ ok: false, error: 'lat y lng deben venir juntos' });
          var mrLat = null, mrLng = null;
          if (mrTraeLat) {
            mrLat = parseFloat(body.lat);
            mrLng = parseFloat(body.lng);
            if (!isFinite(mrLat) || !isFinite(mrLng) || mrLat < -90 || mrLat > 90 || mrLng < -180 || mrLng > 180)
              return res.status(400).json({ ok: false, error: 'COORDENADAS_INVALIDAS' });
          }
          var mrTraeAlbumLat = (body.album_lat !== undefined && body.album_lat !== null && String(body.album_lat).trim() !== '');
          var mrTraeAlbumLng = (body.album_lng !== undefined && body.album_lng !== null && String(body.album_lng).trim() !== '');
          if (mrTraeAlbumLat !== mrTraeAlbumLng)
            return res.status(400).json({ ok: false, error: 'album_lat y album_lng deben venir juntos' });
          var mrAlbumLat = null, mrAlbumLng = null;
          if (mrTraeAlbumLat) {
            mrAlbumLat = parseFloat(body.album_lat);
            mrAlbumLng = parseFloat(body.album_lng);
            if (!isFinite(mrAlbumLat) || !isFinite(mrAlbumLng) || mrAlbumLat < -90 || mrAlbumLat > 90 || mrAlbumLng < -180 || mrAlbumLng > 180)
              return res.status(400).json({ ok: false, error: 'COORDENADAS_INVALIDAS' });
          }
          // Sembrado de la carpeta: coords explicitas del album si llegan;
          // si no, las del recurso (solo rellenan NULL por COALESCE).
          var mrAlbumLatSeed = (mrAlbumLat !== null) ? mrAlbumLat : mrLat;
          var mrAlbumLngSeed = (mrAlbumLng !== null) ? mrAlbumLng : mrLng;
          var mrCiudad = String(body.ciudad || '').trim().slice(0, 80) || null;
          var mrRegion = String(body.region || '').trim().slice(0, 80) || null;
          if (mrAlbumLatSeed !== null || mrCiudad || mrRegion) {
            await sql(
              'UPDATE albumes SET lat = COALESCE(lat, $1), lng = COALESCE(lng, $2),'
              + ' ciudad = COALESCE($3, ciudad), region = COALESCE($4, region),'
              + ' actualizado_en = NOW()'
              + ' WHERE id=$5::uuid AND usuario_id=$6::uuid AND activo=true',
              [mrAlbumLatSeed, mrAlbumLngSeed, mrCiudad, mrRegion, mrAlbumId, mrUser]
            );
          }

          var mrXp = XP_BASES.album_foto;
          var mrIns;
          try {
            mrIns = await sql(
              'INSERT INTO album_fotos'
              + ' (album_id, agregador_id, autor_original_id, foto_url, foto_type,'
              + '  media_title, media_source, visible, xp_otorgado_autor, lat, lng)'
              + ' VALUES ($1::uuid, $2::uuid, $2::uuid, $3, $4, $5, \'\', $6, $7, $8, $9)'
              + ' RETURNING id, album_id, visible',
              [mrAlbumId, mrUser, mrUrl, mrTipo, mrCaption, mrVisible, mrXp, mrLat, mrLng]
            );
          } catch (mrInsErr) {
            // ADR-039 + migracion 025: el indice unico
            // idx_album_fotos_dedup (album_id, foto_url, autor_original_id)
            // choca con recursos nacidos ocultos (visible=false). Reintento
            // idempotente: reactiva el registro existente en vez de
            // bloquear. NO se otorga XP porque el recurso ya existia.
            if (mrInsErr && mrInsErr.code === '23505') {
              var mrDup = await sql(
                'SELECT id, album_id, visible, activo FROM album_fotos'
                + ' WHERE album_id=$1::uuid AND foto_url=$2 AND autor_original_id=$3::uuid LIMIT 1',
                [mrAlbumId, mrUrl, mrUser]
              ).catch(function(){ return []; });
              if (mrDup.length) {
                if (mrDup[0].activo && mrDup[0].visible)
                  return res.status(409).json({ ok:false, error:'Registro duplicado', duplicado:true, recurso_id: mrDup[0].id });
                var mrRep = await sql(
                  'UPDATE album_fotos SET activo=true, visible=true WHERE id=$1::uuid'
                  + ' RETURNING id, album_id, visible',
                  [mrDup[0].id]
                );
                return res.status(200).json({ ok:true, reactivado:true, recurso:{ id: mrRep[0].id, album_id: mrRep[0].album_id, visible: mrRep[0].visible } });
              }
            }
            throw mrInsErr;
          }

          var mrCtx = await contextoXpE(sql, mrUser);
          var mrRes = await calcularXpAcreditado(sql, mrXp, mrCtx.nivel_clase, mrCtx.clase_id, mrCtx.tag,
            { nivel_usuario: mrCtx.nivel_usuario });
          var mrXpFinal = mrRes.xp_final;
          await sql('UPDATE usuarios SET xp_total=xp_total+$1, ultimo_acceso=NOW() WHERE id=$2::uuid', [mrXpFinal, mrUser]).catch(function(e){ console.warn('TRACE: museo_recurso xp no acreditado', e && e.code); });
          await acreditarClaseYCofre(sql, mrUser, mrCtx, mrXpFinal);
          await repartirXpReferidos(sql, mrUser, mrXpFinal);
          await registrarXpLedger(sql, {
            usuario_id: mrUser, accion: 'album_foto', xp_base: mrXp,
            mult_nivel: mrRes.m_nivel, mult_stack: mrRes.mult_stack,
            mult_final: mrRes.mult_global_c, cap_aplicado: mrRes.cap_aplicado,
            xp_final: mrXpFinal, contexto: { recurso_id: mrIns[0].id, canal: 'museo_recurso' }
          });
          var mrMisiones = await evaluarMisiones(sql, mrUser);
          var mrLogros = await evaluarLogros(sql, mrUser);
          return res.status(200).json({
            ok: true,
            recurso: { id: mrIns[0].id, album_id: mrIns[0].album_id, visible: mrIns[0].visible },
            xp: mrXpFinal, xp_detalle: armarXpDetalle(mrXp, mrRes, 0), misiones: mrMisiones, logros: mrLogros,
          });
        }

        if (mrAccion === 'editar') {
          var mrEditId = String(body.id || '').trim();
          if (!MR_UUID.test(mrEditId))
            return res.status(400).json({ ok: false, error: 'id requerido' });
          var mrTraeCaption = (body.caption !== undefined && body.caption !== null);
          var mrTraeVisible = (body.visible !== undefined && body.visible !== null);
          var mrTraeAlbum = (body.album_id !== undefined && body.album_id !== null && String(body.album_id).trim() !== '');
          var mrTraeLat2 = (body.lat !== undefined && body.lat !== null && String(body.lat).trim() !== '');
          var mrTraeLng2 = (body.lng !== undefined && body.lng !== null && String(body.lng).trim() !== '');
          // A4 (ADR-051): quitar_coords vuelve a heredar del album. Si llega
          // junto con lat/lng, quitar_coords GANA (documentado): el frontend
          // puede arrastrar campos residuales del formulario.
          var mrQuitarCoords = (aBooleano(body.quitar_coords) === true);
          var mrTraeAlbumLat2 = (body.album_lat !== undefined && body.album_lat !== null && String(body.album_lat).trim() !== '');
          var mrTraeAlbumLng2 = (body.album_lng !== undefined && body.album_lng !== null && String(body.album_lng).trim() !== '');
          if (!mrTraeCaption && !mrTraeVisible && !mrTraeAlbum && !mrTraeLat2 && !mrTraeLng2 && !mrQuitarCoords && !mrTraeAlbumLat2 && !mrTraeAlbumLng2)
            return res.status(400).json({ ok: false, error: 'sin campos editables' });
          if (mrTraeLat2 !== mrTraeLng2)
            return res.status(400).json({ ok: false, error: 'lat y lng deben venir juntos' });
          if (mrTraeAlbumLat2 !== mrTraeAlbumLng2)
            return res.status(400).json({ ok: false, error: 'album_lat y album_lng deben venir juntos' });

          var mrEditRows = await sql(
            'SELECT af.id, af.album_id, af.visible FROM album_fotos af'
            + ' WHERE af.id=$1::uuid AND af.activo=true'
            + '   AND af.agregador_id=$2::uuid'
            + ' LIMIT 1',
            [mrEditId, mrUser]
          );
          if (!mrEditRows.length)
            return res.status(404).json({ ok: false, error: 'Recurso no encontrado' });
          var mrAlbumActual = mrEditRows[0].album_id;

          var mrDestino = mrAlbumActual;
          if (mrTraeAlbum) {
            mrDestino = String(body.album_id).trim();
            if (!MR_UUID.test(mrDestino))
              return res.status(400).json({ ok: false, error: 'album_id invalido' });
            var mrDestinoPropio = await sql(
              'SELECT id FROM albumes WHERE id=$1::uuid AND usuario_id=$2::uuid AND activo=true LIMIT 1',
              [mrDestino, mrUser]
            );
            if (!mrDestinoPropio.length)
              return res.status(400).json({ ok: false, error: 'album_id no pertenece al usuario' });
          }

          // A4: coords DEL RECURSO (body.lat/lng -> album_fotos). Se validan
          // aqui para construir mrSets mas abajo; quitar_coords las anula.
          // Coords de la CARPETA (body.album_lat/lng -> albumes).
          var mrLat2 = null, mrLng2 = null;
          if (!mrQuitarCoords && mrTraeLat2) {
            mrLat2 = parseFloat(body.lat);
            mrLng2 = parseFloat(body.lng);
            if (!isFinite(mrLat2) || !isFinite(mrLng2) || mrLat2 < -90 || mrLat2 > 90 || mrLng2 < -180 || mrLng2 > 180)
              return res.status(400).json({ ok: false, error: 'COORDENADAS_INVALIDAS' });
          }
          if (mrTraeAlbumLat2) {
            var mrALat2 = parseFloat(body.album_lat);
            var mrALng2 = parseFloat(body.album_lng);
            if (!isFinite(mrALat2) || !isFinite(mrALng2) || mrALat2 < -90 || mrALat2 > 90 || mrALng2 < -180 || mrALng2 > 180)
              return res.status(400).json({ ok: false, error: 'COORDENADAS_INVALIDAS' });
            await sql(
              'UPDATE albumes SET lat=$1, lng=$2, actualizado_en=NOW()'
              + ' WHERE id=$3::uuid AND usuario_id=$4::uuid AND activo=true',
              [mrALat2, mrALng2, mrDestino, mrUser]
            );
          }

          var mrSets = [];
          var mrParams = [mrEditId, mrUser];
          if (mrTraeCaption) {
            var mrCap2 = String(body.caption || '').trim();
            if (mrCap2.length > 200)
              return res.status(400).json({ ok: false, error: 'caption maximo 200 caracteres' });
            mrParams.push(mrCap2);
            mrSets.push('media_title = $' + mrParams.length);
          }
          if (mrTraeVisible) {
            var mrVis2 = aBooleano(body.visible);
            if (mrVis2 === null)
              return res.status(400).json({ ok: false, error: 'visible invalido' });
            mrParams.push(mrVis2);
            mrSets.push('visible = $' + mrParams.length);
          }
          if (mrTraeAlbum) {
            mrParams.push(mrDestino);
            mrSets.push('album_id = $' + mrParams.length + '::uuid');
          }
          // A4: coords propias del recurso en album_fotos (quitar -> NULL).
          if (mrQuitarCoords) {
            mrSets.push('lat = NULL', 'lng = NULL');
          } else if (mrTraeLat2) {
            mrParams.push(mrLat2);
            mrSets.push('lat = $' + mrParams.length);
            mrParams.push(mrLng2);
            mrSets.push('lng = $' + mrParams.length);
          }
          var mrEditUpd;
          if (mrSets.length) {
            mrEditUpd = await sql(
              'UPDATE album_fotos SET ' + mrSets.join(', ')
              + ' WHERE id=$1::uuid AND activo=true'
              + '   AND agregador_id=$2::uuid'
              + ' RETURNING id, album_id, visible',
              mrParams
            );
            if (!mrEditUpd.length)
              return res.status(404).json({ ok: false, error: 'Recurso no encontrado' });
          } else {
            // Solo cambio de coords del album (sin columnas de album_fotos).
            mrEditUpd = [{ id: mrEditId, album_id: mrDestino, visible: mrEditRows[0].visible }];
          }
          return res.status(200).json({
            ok: true,
            recurso: { id: mrEditUpd[0].id, album_id: mrEditUpd[0].album_id, visible: mrEditUpd[0].visible },
          });
        }

        if (mrAccion === 'eliminar') {
          var mrDelId = String(body.id || '').trim();
          if (!MR_UUID.test(mrDelId))
            return res.status(400).json({ ok: false, error: 'id requerido' });
          var mrDel = await sql(
            'UPDATE album_fotos SET activo=false'
            + ' WHERE id=$1::uuid AND activo=true'
            + '   AND album_id IN (SELECT id FROM albumes WHERE usuario_id=$2::uuid AND activo=true)'
            + ' RETURNING id',
            [mrDelId, mrUser]
          );
          if (!mrDel.length)
            return res.status(404).json({ ok: false, error: 'Recurso no encontrado' });
          return res.status(200).json({ ok: true, recurso: { id: mrDel[0].id } });
        }

        return res.status(400).json({ ok: false, error: 'accion invalida' });
      }

      // --- Albums fotograficos POST (ADR-017) ---
      // Se manejan ANTES del guard generico de destino_id porque
      // album_crear / album_agregar_foto / etc. no reciben destino_id.

      // Helpers anti-spam para albums: getProgresoAlbum/updProgresoAlbum/hoy
      // viven a nivel de modulo (v19) para reutilizarlos en crearComentarioMedia.

      // Crear album
      if (tipo2 === 'album_crear') {
        // v26 (ADR-054, BUG-061): sesion firmada obligatoria; el dueno sale
        // del TOKEN y el usuario_id del body se ignora.
        var alSes = verificarSesion(req);
        if (!alSes.ok) return responderSesion(res, alSes.razon);
        var alUsuario = String(alSes.sub || '').trim();
        var alTitulo = String(body.titulo || '').trim();
        if (!alTitulo) return res.status(400).json({ ok: false, error: 'titulo requerido' });
        if (alTitulo.length > 120) return res.status(400).json({ ok: false, error: 'titulo maximo 120 caracteres' });

        // Check nivel >= 2
        var nivelCheck = await sql('SELECT xp_total FROM usuarios WHERE id=$1', [alUsuario]).catch(function(){ return []; });
        var nivelCalc = nivelCheck[0] ? calcularNivelLocal(nivelCheck[0].xp_total).nivel : 1;
        if (nivelCalc < 2) return res.status(403).json({ ok: false, error: 'Nivel insuficiente (requiere nivel 2)' });

        // Anti-spam: max 5 albumes/mes
        var pa = await getProgresoAlbum(sql, alUsuario);
        var mesActual = hoy().slice(0, 7);
        if ((pa.albumes_mes_fecha || '').slice(0, 7) === mesActual && (pa.albumes_mes || 0) >= 5)
          return res.status(429).json({ ok: false, error: 'Limite de 5 albumes por mes alcanzado' });

        var alDesc = String(body.descripcion || '').trim().slice(0, 1000);
        var alTipo = ['fotos','videos','audio','mixto'].includes(body.album_tipo) ? body.album_tipo : 'fotos';
        var alLat = body.lat ? parseFloat(body.lat) : null;
        var alLng = body.lng ? parseFloat(body.lng) : null;
        // ADR-051/v27: la ubicacion del album es OBLIGATORIA; el pin del
        // mapa agrupado (origen=album_grupo) depende de ella. OJO:
        // isFinite(null) es true, por eso se chequea null explicito.
        if (alLat === null || alLng === null || !isFinite(alLat) || !isFinite(alLng)
          || alLat < -90 || alLat > 90 || alLng < -180 || alLng > 180)
          return res.status(400).json({ ok: false, error: 'COORDENADAS_REQUERIDAS' });
        var alCiudad = String(body.ciudad || '').trim().slice(0, 80) || null;
        var alRegion = String(body.region || '').trim().slice(0, 80) || null;
        var alPortada = String(body.portada_url || '').trim().slice(0, 2000) || null;

        var albumIns = await sql(
          'INSERT INTO albumes (usuario_id, titulo, descripcion, tipo, lat, lng, ciudad, region, portada_url) '
          + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
          [alUsuario, alTitulo, alDesc, alTipo, alLat, alLng, alCiudad, alRegion, alPortada]
        );

        // XP +20
        var ctxAlbum = await contextoXpE(sql, alUsuario);
        var resAlbum = await calcularXpAcreditado(sql, XP_BASES.album_crear,
          ctxAlbum.nivel_clase, ctxAlbum.clase_id, ctxAlbum.tag,
          { nivel_usuario: ctxAlbum.nivel_usuario });
        var xpAlbumFinal = resAlbum.xp_final;
        await sql('UPDATE usuarios SET xp_total=xp_total+$1, ultimo_acceso=NOW() WHERE id=$2', [xpAlbumFinal, alUsuario]).catch(function(){});
        await acreditarClaseYCofre(sql, alUsuario, ctxAlbum, xpAlbumFinal);
        // v13: reparto multinivel sobre el XP REAL entregado (+20).
        await repartirXpReferidos(sql, alUsuario, xpAlbumFinal);
        await registrarXpLedger(sql, {
          usuario_id: alUsuario, accion: 'album_crear', xp_base: XP_BASES.album_crear,
          mult_nivel: resAlbum.m_nivel, mult_stack: resAlbum.mult_stack,
          mult_final: resAlbum.mult_global_c, cap_aplicado: resAlbum.cap_aplicado,
          xp_final: xpAlbumFinal, contexto: { album_id: albumIns[0].id }
        });

        // Actualizar progreso_album
        var nuevoAlbumesMes = ((pa.albumes_mes_fecha || '').slice(0, 7) === mesActual) ? (pa.albumes_mes || 0) + 1 : 1;
        await updProgresoAlbum(sql, alUsuario, { albumes_mes: nuevoAlbumesMes, albumes_mes_fecha: hoy() });

        var misionesAlbum = await evaluarMisiones(sql, alUsuario);
        var logrosAlbum = await evaluarLogros(sql, alUsuario);
        return res.status(200).json({ ok: true, album: albumIns[0], xp: xpAlbumFinal, xp_detalle: armarXpDetalle(XP_BASES.album_crear, resAlbum, 0), misiones: misionesAlbum, logros: logrosAlbum });
      }

      // Agregar foto a album (Pinterest-style)
      if (tipo2 === 'album_agregar_foto') {
        if (!usuarioId2) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var afAlbumId = body.album_id || null;
        var afFotoUrl = String(body.foto_url || '').trim();
        if (!afAlbumId) return res.status(400).json({ ok: false, error: 'album_id requerido' });
        if (!afFotoUrl || !/^https?:\/\//.test(afFotoUrl) || afFotoUrl.length > 2000)
          return res.status(400).json({ ok: false, error: 'foto_url invalida' });

        // Check album exists and activo
        var afAlbumCheck = await sql('SELECT id, usuario_id FROM albumes WHERE id=$1 AND activo=true', [afAlbumId]).catch(function(){ return []; });
        if (!afAlbumCheck.length) return res.status(404).json({ ok: false, error: 'Album no encontrado' });
        // v16 (fix IDOR de escritura): solo el dueno del album puede
        // agregarle fotos. El album existe pero es ajeno -> 403 explicito.
        if (String(afAlbumCheck[0].usuario_id) !== String(usuarioId2))
          return res.status(403).json({ ok: false, error: 'ALBUM_AJENO' });

        // Check fotos count < 50
        var afCount = await sql('SELECT COUNT(*)::int AS n FROM album_fotos WHERE album_id=$1 AND activo=true', [afAlbumId]).catch(function(){ return [{n:0}]; });
        if (afCount[0].n >= 50) return res.status(429).json({ ok: false, error: 'Album lleno (maximo 50 fotos)' });

        // Anti-spam: max 10 fotos/dia
        var pa2 = await getProgresoAlbum(sql, usuarioId2);
        if ((pa2.fotos_dia_fecha || '') === hoy() && (pa2.fotos_dia || 0) >= 10)
          return res.status(429).json({ ok: false, error: 'Limite de 10 fotos por dia alcanzado' });

        var afAutorOriginal = body.autor_original_id || usuarioId2;
        var afFotoType = ['foto','video','audio'].includes(body.foto_type) ? body.foto_type : 'foto';
        var afMediaTitle = String(body.media_title || '').trim().slice(0, 200);
        var afMediaSource = String(body.media_source || '').trim().slice(0, 100);
        // ADR-032: el contenido subido al album/album de comunidad es
        // PUBLICO por defecto; solo un false explicito lo oculta.
        var afVisible = aBooleano(body.visible);
        if (afVisible === null) afVisible = true;

        // ADR-051/v27: coords propias de la foto de album (OPCIONALES). Si
        // falta una o no son validas, ambas quedan NULL y la foto hereda la
        // ubicacion del album via COALESCE(af.lat,a.lat). Si llegan validas,
        // siembran albumes.lat/lng con COALESCE (nunca sobrescriben).
        var afLat = (body.lat !== undefined && body.lat !== null && body.lat !== '') ? parseFloat(body.lat) : null;
        var afLng = (body.lng !== undefined && body.lng !== null && body.lng !== '') ? parseFloat(body.lng) : null;
        if (afLat === null || !isFinite(afLat) || afLat < -90 || afLat > 90) afLat = null;
        if (afLng === null || !isFinite(afLng) || afLng < -180 || afLng > 180) afLng = null;
        if (afLat === null || afLng === null) { afLat = null; afLng = null; }
        if (afLat !== null) {
          await sql(
            'UPDATE albumes SET lat = COALESCE(lat, $1), lng = COALESCE(lng, $2), actualizado_en = NOW()'
            + ' WHERE id = $3 AND usuario_id = $4',
            [afLat, afLng, afAlbumId, usuarioId2]
          ).catch(function(eSeed) { console.warn('[album_foto] seed coords fallo: ' + (eSeed && eSeed.message)); });
        }

        // Check dedup (025): un registro oculto o inactivo NO bloquea el
        // reintento; se republica reactivandolo, SIN re-otorgar XP.
        var afDedup = await sql(
          'SELECT id, activo, visible FROM album_fotos WHERE album_id=$1 AND foto_url=$2 AND autor_original_id=$3 LIMIT 1',
          [afAlbumId, afFotoUrl, afAutorOriginal]
        ).catch(function(){ return []; });
        if (afDedup.length) {
          if (afDedup[0].activo && afDedup[0].visible)
            return res.status(409).json({ ok: false, error: 'Foto ya existe en este album' });
          var afRep = await sql('UPDATE album_fotos SET activo=true, visible=true WHERE id=$1 RETURNING *', [afDedup[0].id]);
          return res.status(200).json({ ok: true, reactivado: true, foto: afRep[0] });
        }

        var afIns;
        try {
          afIns = await sql(
            'INSERT INTO album_fotos (album_id, agregador_id, autor_original_id, foto_url, foto_type, media_title, media_source, visible, xp_otorgado_autor, lat, lng) '
            + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [afAlbumId, usuarioId2, afAutorOriginal, afFotoUrl, afFotoType, afMediaTitle, afMediaSource, afVisible, XP_BASES.album_foto, afLat, afLng]
          );
        } catch (afInsErr) {
          // La FK autor_original_id -> usuarios.id (009) convierte un id
          // inexistente en 23503: se tipifica como 400 en vez del 500
          // generico del catch global. Cualquier otro error se re-lanza.
          if (afInsErr && afInsErr.code === '23503')
            return res.status(400).json({ ok: false, error: 'AUTOR_ORIGINAL_INVALIDO' });
          throw afInsErr;
        }

        // XP +15 al agregador
        var ctxAlbumFoto = await contextoXpE(sql, usuarioId2);
        var resAlbumFoto = await calcularXpAcreditado(sql, XP_BASES.album_foto,
          ctxAlbumFoto.nivel_clase, ctxAlbumFoto.clase_id, ctxAlbumFoto.tag,
          { nivel_usuario: ctxAlbumFoto.nivel_usuario });
        var xpAlbumFotoFinal = resAlbumFoto.xp_final;
        await sql('UPDATE usuarios SET xp_total=xp_total+$1, ultimo_acceso=NOW() WHERE id=$2', [xpAlbumFotoFinal, usuarioId2]).catch(function(){});
        await acreditarClaseYCofre(sql, usuarioId2, ctxAlbumFoto, xpAlbumFotoFinal);
        // v13: reparto multinivel del XP ganado por el agregador (no
        // bloquea).
        await repartirXpReferidos(sql, usuarioId2, xpAlbumFotoFinal);
        await registrarXpLedger(sql, {
          usuario_id: usuarioId2, accion: 'album_foto', xp_base: XP_BASES.album_foto,
          mult_nivel: resAlbumFoto.m_nivel, mult_stack: resAlbumFoto.mult_stack,
          mult_final: resAlbumFoto.mult_global_c, cap_aplicado: resAlbumFoto.cap_aplicado,
          xp_final: xpAlbumFotoFinal, contexto: { foto_id: afIns[0].id, canal: 'album_agregar_foto' }
        });

        // XP al autor original si es foto de otro. ADR-053 Dec 8.5 (v25):
        // album_foto_autor se rutea por el catalogo unico (antes eran 4
        // literales +10) y recibe M_nivel; el tope diario se mide contra la
        // BASE del catalogo (XP_BASES.album_foto_autor), no contra un
        // literal, para no romper el contador de progreso_album.
        var xpAutorOriginalResp = 0;
        if (afAutorOriginal !== usuarioId2) {
          var pa3 = await getProgresoAlbum(sql, afAutorOriginal);
          var capAutorDia = XP_BASES.album_foto_autor;
          if ((pa3.xp_autor_fecha || '') !== hoy() || (pa3.xp_autor_dia || 0) < capAutorDia) {
            var ctxAutor = await contextoXpE(sql, afAutorOriginal);
            var resAutor = await calcularXpAcreditado(sql, XP_BASES.album_foto_autor,
              ctxAutor.nivel_clase, ctxAutor.clase_id, ctxAutor.tag,
              { nivel_usuario: ctxAutor.nivel_usuario });
            var xpAutorFinal = resAutor.xp_final;
            await sql('UPDATE usuarios SET xp_total=xp_total+$1, ultimo_acceso=NOW() WHERE id=$2', [xpAutorFinal, afAutorOriginal]).catch(function(){});
            // v13: reparto multinivel para el autor original (no bloquea).
            await repartirXpReferidos(sql, afAutorOriginal, xpAutorFinal);
            await registrarXpLedger(sql, {
              usuario_id: afAutorOriginal, accion: 'album_foto_autor', xp_base: XP_BASES.album_foto_autor,
              mult_nivel: resAutor.m_nivel, mult_stack: resAutor.mult_stack,
              mult_final: resAutor.mult_global_c, cap_aplicado: resAutor.cap_aplicado,
              xp_final: xpAutorFinal, contexto: { foto_id: afIns[0].id, agregador_id: usuarioId2 }
            });
            var nuevoXpAutor = ((pa3.xp_autor_fecha || '') === hoy())
              ? red2((pa3.xp_autor_dia || 0) + xpAutorFinal) : red2(xpAutorFinal);
            await updProgresoAlbum(sql, afAutorOriginal, { xp_autor_dia: nuevoXpAutor, xp_autor_fecha: hoy() });
            xpAutorOriginalResp = xpAutorFinal;
          }
        }

        // Actualizar progreso_album del agregador
        var nuevoFotosDia = ((pa2.fotos_dia_fecha || '') === hoy()) ? (pa2.fotos_dia || 0) + 1 : 1;
        await updProgresoAlbum(sql, usuarioId2, { fotos_dia: nuevoFotosDia, fotos_dia_fecha: hoy() });

        var misionesFoto = await evaluarMisiones(sql, usuarioId2);
        var logrosFoto = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({ ok: true, foto: afIns[0], xp: xpAlbumFotoFinal, xp_detalle: armarXpDetalle(XP_BASES.album_foto, resAlbumFoto, 0), xp_autor_original: xpAutorOriginalResp, misiones: misionesFoto, logros: logrosFoto });
      }

      // Votar foto de album (alias legacy de media_voto, ADR-036 v19):
      // delega en el modelo unificado con fuente 'album_foto'. Conserva el
      // contrato exacto: 404 Foto no encontrada, 403 self-vote, 409 Ya
      // votaste y +5 XP la primera vez. Tope unificado de 20 votos/24h.
      // DEUDA (BUG-061): mantiene trust de usuario_id sin Bearer; pendiente
      // de validarSesion cuando sus multiples clientes migren.
      if (tipo2 === 'album_voto') {
        if (!usuarioId2) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var avFotoId = body.foto_id || null;
        if (!avFotoId) return res.status(400).json({ ok: false, error: 'foto_id requerido' });
        var avRes = await registrarVotoMedia(sql, usuarioId2, 'album_foto', String(avFotoId), 'Foto no encontrada');
        if (avRes.status !== 200)
          return res.status(avRes.status).json({ ok: false, error: avRes.error, ya_votado: avRes.ya_votado || undefined });
        return res.status(200).json(await completarVotoMedia(sql, usuarioId2, avRes));
      }

      // Voto unificado de media (ADR-036 B): {usuario_id, fuente, item_id,
      // accion: 'like'|'unlike'}. Fuentes curada/viajero_foto/album_foto.
      // +5 XP la primera vez; reaparecer tras unlike NO re-paga XP; tope
      // unificado de 20 votos/24h.
      if (tipo2 === 'media_voto') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        // ADR-036 (QA): mutacion con sesion obligatoria (mismo patron que
        // compartir). Cierra el spoofing de usuario_id de clase BUG-061.
        var mvSesion = validarSesion(req, usuarioId2);
        if (!mvSesion.ok) return responderSesion(res, mvSesion.razon);
        var mvFuente = String(body.fuente || '').toLowerCase();
        var mvItem = String(body.item_id || '').trim();
        var mvAccion = String(body.accion || 'like').toLowerCase();
        if (!mediaFuenteValida(mvFuente))
          return res.status(400).json({ ok: false, error: 'fuente invalida (curada|viajero_foto|album_foto)' });
        if (!MEDIA_ITEM_RE.test(mvItem))
          return res.status(400).json({ ok: false, error: 'item_id invalido' });
        if (mvAccion !== 'like' && mvAccion !== 'unlike')
          return res.status(400).json({ ok: false, error: 'accion debe ser like o unlike' });

        var mvTarget = await resolverMediaItem(sql, mvFuente, mvItem);
        if (!mvTarget.ok)
          return res.status(404).json({ ok: false, error: 'Media no encontrada' });
        if (mvAccion === 'like' && mvTarget.autorId && String(mvTarget.autorId) === String(usuarioId2))
          return res.status(403).json({ ok: false, error: 'No puedes votar tu propia foto' });

        var mvRes = await aplicarMediaVoto(sql, usuarioId2, mvFuente, mvItem, mvAccion);
        if (mvRes.tope)
          return res.status(429).json({ ok: false, error: 'Limite de 20 votos por dia alcanzado' });
        if (mvAccion === 'like' && mvRes.duplicado)
          return res.status(409).json({ ok: false, error: 'Ya votaste esta media', ya_votado: true });

        var mvMisiones = await evaluarMisiones(sql, usuarioId2);
        var mvLogros = await evaluarLogros(sql, usuarioId2);
        if (mvRes.xp > 0) await repartirXpReferidos(sql, usuarioId2, mvRes.xp);
        return res.status(200).json({
          ok: true, xp: mvRes.xp, votos: mvRes.votos,
          ya_votado: mvAccion === 'like', reactivado: mvRes.reactivado || undefined,
          xp_detalle: mvRes.xp_detalle || undefined,
          misiones: mvMisiones, logros: mvLogros,
        });
      }

      // Comentario unificado de media (ADR-036 B): {usuario_id, fuente,
      // item_id, texto, parent_id?}. Mismo shape de arbol que
      // comentario_foto, +2 XP con tope 20/dia y rate-limit 30/dia.
      if (tipo2 === 'media_comentar') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        // ADR-036 (QA): mutacion con sesion obligatoria (mismo patron que
        // compartir). Cierra el spoofing de usuario_id de clase BUG-061.
        var mcSesion = validarSesion(req, usuarioId2);
        if (!mcSesion.ok) return responderSesion(res, mcSesion.razon);
        var mcFuente = String(body.fuente || '').toLowerCase();
        var mcItem = String(body.item_id || '').trim();
        if (!mediaFuenteValida(mcFuente))
          return res.status(400).json({ ok: false, error: 'fuente invalida (curada|viajero_foto|album_foto)' });
        if (!MEDIA_ITEM_RE.test(mcItem))
          return res.status(400).json({ ok: false, error: 'item_id invalido' });
        var mcTarget = await resolverMediaItem(sql, mcFuente, mcItem);
        if (!mcTarget.ok)
          return res.status(404).json({ ok: false, error: 'Media no encontrada' });
        var mcRes = await crearComentarioMedia(sql, usuarioId2, mcFuente, mcItem, body.texto, body.parent_id || null);
        if (!mcRes.ok)
          return res.status(mcRes.status).json({ ok: false, error: mcRes.error });
        return res.status(201).json({ ok: true, comentario: mcRes.comentario, xp: mcRes.xp, misiones: mcRes.misiones, logros: mcRes.logros });
      }

      // Quitar foto de album (solo agregador o creador del album)
      if (tipo2 === 'album_quitar_foto') {
        if (!usuarioId2) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var qfFotoId = body.foto_id || null;
        var qfAlbumId = body.album_id || null;
        if (!qfFotoId || !qfAlbumId) return res.status(400).json({ ok: false, error: 'foto_id y album_id requeridos' });

        var qfCheck = await sql(
          'SELECT af.id, af.agregador_id, a.usuario_id AS creador_id'
          + ' FROM album_fotos af JOIN albumes a ON a.id = af.album_id'
          + ' WHERE af.id = $1 AND af.album_id = $2',
          [qfFotoId, qfAlbumId]
        ).catch(function(){ return []; });
        if (!qfCheck.length) return res.status(404).json({ ok: false, error: 'Foto no encontrada en album' });
        if (qfCheck[0].agregador_id !== usuarioId2 && qfCheck[0].creador_id !== usuarioId2)
          return res.status(403).json({ ok: false, error: 'Sin permisos para quitar esta foto' });

        await sql('UPDATE album_fotos SET activo = false WHERE id = $1', [qfFotoId]);
        return res.status(200).json({ ok: true });
      }

      // Editar album (solo creador)
      if (tipo2 === 'album_editar') {
        if (!usuarioId2) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var aeAlbumId = body.album_id || null;
        if (!aeAlbumId) return res.status(400).json({ ok: false, error: 'album_id requerido' });

        var aeCheck = await sql('SELECT id, usuario_id FROM albumes WHERE id=$1 AND activo=true', [aeAlbumId]).catch(function(){ return []; });
        if (!aeCheck.length) return res.status(404).json({ ok: false, error: 'Album no encontrado' });
        if (aeCheck[0].usuario_id !== usuarioId2) return res.status(403).json({ ok: false, error: 'Sin permisos' });

        var aeTitulo = body.titulo !== undefined ? String(body.titulo).trim().slice(0, 120) : null;
        var aeDesc = body.descripcion !== undefined ? String(body.descripcion).trim().slice(0, 1000) : null;
        var aePortada = body.portada_url !== undefined ? String(body.portada_url).trim().slice(0, 2000) : null;
        var aeLat = body.lat !== undefined ? parseFloat(body.lat) : undefined;
        var aeLng = body.lng !== undefined ? parseFloat(body.lng) : undefined;
        var aeCiudad = body.ciudad !== undefined ? String(body.ciudad).trim().slice(0, 80) : undefined;
        var aeRegion = body.region !== undefined ? String(body.region).trim().slice(0, 80) : undefined;

        var sets = [];
        var vals = [];
        var idx = 1;
        if (aeTitulo !== null) { sets.push('titulo=$' + idx); vals.push(aeTitulo); idx++; }
        if (aeDesc !== null) { sets.push('descripcion=$' + idx); vals.push(aeDesc); idx++; }
        if (aePortada !== null) { sets.push('portada_url=$' + idx); vals.push(aePortada); idx++; }
        if (aeLat !== undefined && !isNaN(aeLat)) { sets.push('lat=$' + idx); vals.push(aeLat); idx++; }
        if (aeLng !== undefined && !isNaN(aeLng)) { sets.push('lng=$' + idx); vals.push(aeLng); idx++; }
        if (aeCiudad !== undefined) { sets.push('ciudad=$' + idx); vals.push(aeCiudad || null); idx++; }
        if (aeRegion !== undefined) { sets.push('region=$' + idx); vals.push(aeRegion || null); idx++; }

        if (!sets.length) return res.status(400).json({ ok: false, error: 'Sin cambios' });

        sets.push('actualizado_en=NOW()');
        vals.push(aeAlbumId);
        await sql('UPDATE albumes SET ' + sets.join(', ') + ' WHERE id=$' + idx, vals);
        return res.status(200).json({ ok: true });
      }

      // Eliminar album (soft-delete, solo creador)
      if (tipo2 === 'album_eliminar') {
        if (!usuarioId2) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var elAlbumId = body.album_id || null;
        if (!elAlbumId) return res.status(400).json({ ok: false, error: 'album_id requerido' });

        var elCheck = await sql('SELECT id, usuario_id FROM albumes WHERE id=$1 AND activo=true', [elAlbumId]).catch(function(){ return []; });
        if (!elCheck.length) return res.status(404).json({ ok: false, error: 'Album no encontrado' });
        if (elCheck[0].usuario_id !== usuarioId2) return res.status(403).json({ ok: false, error: 'Sin permisos' });

        await sql('UPDATE albumes SET activo = false, actualizado_en = NOW() WHERE id = $1', [elAlbumId]);
        return res.status(200).json({ ok: true });
      }

      // ADR-032 (v17) + ADR-036 (v19) + ADR-054 (v26): guardado (bookmark)
      // de media. fuente valida el tipo de item: album -> albumes.id,
      // album_foto -> album_fotos.id, viajero_foto -> interacciones.id
      // (tipo='foto'), curada -> destinos_fotos.id. item_id acepta uuid o
      // digitos (migracion 023: media_guardados.item_id text). No es voto ni
      // copia. Requiere migracion 019 (ampliada por 023); si falta, 503.
      // v26 (BUG-061): sesion firmada obligatoria; el usuario se deriva del
      // TOKEN y el usuario_id del body se ignora.
      if (tipo2 === 'guardar_media' || tipo2 === 'quitar_guardado_media') {
        var gmSes = verificarSesion(req);
        if (!gmSes.ok) return responderSesion(res, gmSes.razon);
        var gmUsuario = String(gmSes.sub || '').trim();
        var gmFuente = String(body.fuente || '').toLowerCase();
        if (!guardadoFuenteValida(gmFuente))
          return res.status(400).json({ ok: false, error: 'fuente invalida (album|album_foto|viajero_foto|curada)' });
        var gmItem = String(body.item_id || '').trim();
        if (!MEDIA_ITEM_RE.test(gmItem))
          return res.status(400).json({ ok: false, error: 'item_id invalido' });

        try {
          if (tipo2 === 'quitar_guardado_media') {
            await sql(
              'UPDATE media_guardados SET activo = false'
              + ' WHERE usuario_id = $1 AND fuente = $2 AND item_id = $3',
              [gmUsuario, gmFuente, gmItem]
            );
            return res.status(200).json({ ok: true, guardado: false });
          }

          var gmExiste = false;
          var gmAlbumDueno = null;
          if (gmFuente === 'album') {
            var gmAl = await sql('SELECT id, usuario_id FROM albumes WHERE id::text=$1 AND activo=true', [gmItem]).catch(function(){ return []; });
            gmExiste = gmAl.length > 0;
            if (gmExiste) gmAlbumDueno = String(gmAl[0].usuario_id);
          } else {
            var gmTarget = await resolverMediaItem(sql, gmFuente, gmItem);
            gmExiste = gmTarget.ok;
          }
          if (!gmExiste)
            return res.status(404).json({ ok: false, error: 'Media no encontrada' });

          // v28: estado previo del bookmark para no re-pagar XP al reactivar.
          var gmPrev = await sql(
            'SELECT activo FROM media_guardados WHERE usuario_id = $1 AND fuente = $2 AND item_id = $3',
            [gmUsuario, gmFuente, gmItem]
          ).catch(function(){ return []; });
          var gmYaActivo = !!(gmPrev.length && gmPrev[0].activo);

          await sql(
            'INSERT INTO media_guardados (usuario_id, fuente, item_id, activo, creado_en)'
            + ' VALUES ($1, $2, $3, true, NOW())'
            + ' ON CONFLICT (usuario_id, fuente, item_id)'
            + ' DO UPDATE SET activo = true, creado_en = NOW()',
            [gmUsuario, gmFuente, gmItem]
          );

          // v28: XP dual al guardar un ALBUM (ejecutor 5 / dueno 10), solo en
          // el alta; reactivar no re-paga. Espejo del patron album_foto_autor.
          if (gmFuente === 'album' && !gmYaActivo) {
            try {
              var ctxGm = await contextoXpE(sql, gmUsuario);
              var resGm = await calcularXpAcreditado(sql, XP_BASES.album_guardado,
                ctxGm.nivel_clase, ctxGm.clase_id, ctxGm.tag,
                { nivel_usuario: ctxGm.nivel_usuario });
              var xpGmFinal = resGm.xp_final;
              await sql('UPDATE usuarios SET xp_total=xp_total+$1, ultimo_acceso=NOW() WHERE id=$2', [xpGmFinal, gmUsuario]).catch(function(eU){ console.warn('[interacciones] guardar_media xp ejecutor no acreditado: ' + (eU && eU.message)); });
              await acreditarClaseYCofre(sql, gmUsuario, ctxGm, xpGmFinal);
              await repartirXpReferidos(sql, gmUsuario, xpGmFinal);
              await registrarXpLedger(sql, {
                usuario_id: gmUsuario, accion: 'album_guardado', xp_base: XP_BASES.album_guardado,
                mult_nivel: resGm.m_nivel, mult_stack: resGm.mult_stack,
                mult_final: resGm.mult_global_c, cap_aplicado: resGm.cap_aplicado,
                xp_final: xpGmFinal, contexto: { album_id: gmItem, canal: 'guardar_media' }
              });
              if (gmAlbumDueno && gmAlbumDueno !== String(gmUsuario)) {
                var ctxGmA = await contextoXpE(sql, gmAlbumDueno);
                var resGmA = await calcularXpAcreditado(sql, XP_BASES.album_guardado_autor,
                  ctxGmA.nivel_clase, ctxGmA.clase_id, ctxGmA.tag,
                  { nivel_usuario: ctxGmA.nivel_usuario });
                var xpGmAFinal = resGmA.xp_final;
                await sql('UPDATE usuarios SET xp_total=xp_total+$1, ultimo_acceso=NOW() WHERE id=$2', [xpGmAFinal, gmAlbumDueno]).catch(function(eD){ console.warn('[interacciones] guardar_media xp dueno no acreditado: ' + (eD && eD.message)); });
                await acreditarClaseYCofre(sql, gmAlbumDueno, ctxGmA, xpGmAFinal);
                await repartirXpReferidos(sql, gmAlbumDueno, xpGmAFinal);
                await registrarXpLedger(sql, {
                  usuario_id: gmAlbumDueno, accion: 'album_guardado_autor', xp_base: XP_BASES.album_guardado_autor,
                  mult_nivel: resGmA.m_nivel, mult_stack: resGmA.mult_stack,
                  mult_final: resGmA.mult_global_c, cap_aplicado: resGmA.cap_aplicado,
                  xp_final: xpGmAFinal, contexto: { album_id: gmItem, guardador_id: gmUsuario }
                });
              }
            } catch (eGmXp) {
              console.warn('[interacciones] guardar_media XP no acreditado: ' + (eGmXp && eGmXp.message));
            }
          }
          return res.status(200).json({ ok: true, guardado: true });
        } catch (eGuardarMedia) {
          if (eGuardarMedia && (eGuardarMedia.code === '42P01' || eGuardarMedia.code === '42703' || eGuardarMedia.code === '22P02')) {
            console.error('[interacciones] guardar_media sin migracion 019/023: ' + eGuardarMedia.message);
            return res.status(503).json({ ok: false, error: 'Guardados de media no disponibles (migracion 019/023 pendiente)', code: 'SCHEMA_NOT_MIGRATED' });
          }
          throw eGuardarMedia;
        }
      }

      // ADR-054 (v26): POST ?tipo=guardados_carpeta reutilizado sobre
      // ALBUMES (supersede las carpetas privadas de ADR-052). Auth SIEMPRE
      // por sesion firmada: el dueno sale del token, nunca del body.
      //   accion=album    -> asigna/quita el album de un bookmark; el album
      //                      destino debe ser del usuario (C2, anti-IDOR) y
      //                      la desasignacion fuerza visible=false en la
      //                      MISMA sentencia (C3, CHECK 23514).
      //   accion=publicar -> visible=true|false; exige album previo (409
      //                      SIN_ALBUM).
      //   crear|renombrar|eliminar -> 410 CARPETAS_DEPRECADAS (sin
      //                      silencio: la UI vieja debe migrar).
      // Requiere la migracion 032; si falta (42P01/42703) -> 503 tipado.
      if (tipo2 === 'guardados_carpeta') {
        var gcSes = usuarioId2 ? validarSesion(req, usuarioId2) : verificarSesion(req);
        if (!gcSes.ok) return responderSesion(res, gcSes.razon);
        var gcUsuario = usuarioId2 ? String(usuarioId2).trim() : String(gcSes.sub || '').trim();
        var gcAccion = String(body.accion || '').toLowerCase();
        var GC_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

        if (['crear', 'renombrar', 'eliminar', 'mover'].indexOf(gcAccion) !== -1)
          return res.status(410).json({ ok: false, error: 'CARPETAS_DEPRECADAS' });

        var gcFuente = String(body.fuente || '').toLowerCase();
        var gcItem = String(body.item_id || '').trim();
        if (gcAccion !== 'album' && gcAccion !== 'publicar')
          return res.status(400).json({ ok: false, error: 'accion invalida (album|publicar)' });
        if (!guardadoFuenteValida(gcFuente))
          return res.status(400).json({ ok: false, error: 'fuente invalida (album|album_foto|viajero_foto|curada)' });
        if (!MEDIA_ITEM_RE.test(gcItem))
          return res.status(400).json({ ok: false, error: 'item_id invalido' });

        try {
          if (gcAccion === 'album') {
            var gcTraeAlbum = (body.album_id !== undefined && body.album_id !== null && String(body.album_id).trim() !== '');
            var gcAlbumDestino = null;
            if (gcTraeAlbum) {
              gcAlbumDestino = String(body.album_id).trim();
              if (!GC_UUID.test(gcAlbumDestino))
                return res.status(400).json({ ok: false, error: 'album_id invalido' });
              // C2: el album destino debe ser del usuario de la sesion y
              // estar activo; si no -> 404 ALBUM_NO_ENCONTRADO (no se
              // publica ni organiza dentro de un album ajeno).
              var gcAlbumOwn = await sql(
                'SELECT id FROM albumes'
                + ' WHERE id = $1::uuid AND usuario_id = $2::uuid AND activo = true LIMIT 1',
                [gcAlbumDestino, gcUsuario]
              );
              if (!gcAlbumOwn.length)
                return res.status(404).json({ ok: false, error: 'ALBUM_NO_ENCONTRADO' });
            }
            // C3: desasignar (album_id NULL) fuerza visible=false en la
            // MISMA sentencia para no violar el CHECK (23514).
            var gcUpdAlbum = await sql(
              'UPDATE media_guardados SET album_id = $1::uuid,'
              + ' visible = CASE WHEN $1::uuid IS NULL THEN false ELSE visible END'
              + ' WHERE usuario_id = $2::uuid AND fuente = $3 AND item_id = $4 AND activo = true'
              + ' RETURNING item_id',
              [gcAlbumDestino, gcUsuario, gcFuente, gcItem]
            );
            if (!gcUpdAlbum.length)
              return res.status(404).json({ ok: false, error: 'GUARDADO_NO_ENCONTRADO' });
            return res.status(200).json({ ok: true, album_id: gcAlbumDestino });
          }

          // accion=publicar: leer primero el album del bookmark; sin album
          // no se puede publicar (el CHECK exige album_id si visible=true).
          var gcVisible = !!body.visible;
          var gcRowPub = await sql(
            'SELECT album_id FROM media_guardados'
            + ' WHERE usuario_id = $1::uuid AND fuente = $2 AND item_id = $3 AND activo = true LIMIT 1',
            [gcUsuario, gcFuente, gcItem]
          );
          if (!gcRowPub.length)
            return res.status(404).json({ ok: false, error: 'GUARDADO_NO_ENCONTRADO' });
          if (!gcRowPub[0].album_id)
            return res.status(409).json({ ok: false, error: 'SIN_ALBUM' });
          var gcUpdPub = await sql(
            'UPDATE media_guardados SET visible = $1'
            + ' WHERE usuario_id = $2::uuid AND fuente = $3 AND item_id = $4 AND activo = true'
            + ' RETURNING item_id',
            [gcVisible, gcUsuario, gcFuente, gcItem]
          );
          if (!gcUpdPub.length)
            return res.status(404).json({ ok: false, error: 'GUARDADO_NO_ENCONTRADO' });
          return res.status(200).json({ ok: true, visible: gcVisible });
        } catch (eGc) {
          if (!esEsquemaFaltante(eGc)) throw eGc;
          console.error('[interacciones] guardados_carpeta sin migracion 032: ' + (eGc.message || eGc));
          return res.status(503).json({ ok: false, error: 'SCHEMA_NOT_MIGRATED' });
        }
      }

      // Admin: seleccionar foto top para destino
      if (tipo2 === 'admin_foto_top') {
        var aftAdminToken = req.headers.authorization || '';
        if (aftAdminToken.indexOf('Bearer ') !== 0)
          return res.status(401).json({ ok: false, error: 'Token requerido' });
        aftAdminToken = aftAdminToken.slice(7);
        var adminSecret = process.env.ADMIN_SECRET || 'exploraco12345';
        if (aftAdminToken !== adminSecret)
          return res.status(403).json({ ok: false, error: 'Token invalido' });

        var aftDestinoId = body.destino_id || null;
        var aftFotoUrl = String(body.foto_url || '').trim();
        if (!aftDestinoId || !aftFotoUrl)
          return res.status(400).json({ ok: false, error: 'destino_id y foto_url requeridos' });

        await sql('UPDATE destinos SET foto_hero = $1, actualizado_en = NOW() WHERE id = $2', [aftFotoUrl, aftDestinoId]);
        return res.status(200).json({ ok: true });
      }

      // Admin: moderar foto de album (soft-delete)
      if (tipo2 === 'admin_moderar_foto_album') {
        var amaAdminToken = req.headers.authorization || '';
        if (amaAdminToken.indexOf('Bearer ') !== 0)
          return res.status(401).json({ ok: false, error: 'Token requerido' });
        amaAdminToken = amaAdminToken.slice(7);
        var adminSecret2 = process.env.ADMIN_SECRET || 'exploraco12345';
        if (amaAdminToken !== adminSecret2)
          return res.status(403).json({ ok: false, error: 'Token invalido' });

        var amaFotoId = body.foto_id || null;
        var amaAccion = body.accion || 'eliminar';
        if (!amaFotoId) return res.status(400).json({ ok: false, error: 'foto_id requerido' });

        if (amaAccion === 'eliminar') {
          await sql('UPDATE album_fotos SET activo = false WHERE id = $1', [amaFotoId]);
        }
        return res.status(200).json({ ok: true });
      }

      // Admin: ajuste de XP / subir a nivel exacto (epic 2026-09-13).
      // Bearer identico a comentarios_recientes / admin_foto_top. Body:
      // {usuario_id, delta_xp} para sumar/restar, o {usuario_id, nivel}
      // para subir a un nivel exacto (xp_total = minimo del umbral). El
      // nivel/badge se recalcula desde NIVELES_ADMIN/BADGES_LOCAL: nunca
      // se confia en la columna persistida, que puede desincronizarse.
      if (tipo2 === 'admin_xp') {
        var axToken = req.headers.authorization || '';
        if (axToken.indexOf('Bearer ') !== 0)
          return res.status(401).json({ ok: false, error: 'Token requerido' });
        axToken = axToken.slice(7);
        var axSecret = process.env.ADMIN_SECRET || 'exploraco12345';
        if (axToken !== axSecret)
          return res.status(403).json({ ok: false, error: 'Token invalido' });
        var axUserId = String(body.usuario_id || '');
        if (!axUserId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var axTieneNivel = body.nivel !== undefined && body.nivel !== null && body.nivel !== '';
        var axTieneDelta = body.delta_xp !== undefined && body.delta_xp !== null && body.delta_xp !== '';
        var axNivel = axTieneNivel ? parseInt(body.nivel, 10) : null;
        var axDelta = axTieneDelta ? red2(parseFloat(body.delta_xp)) : null;
        if (!axTieneNivel && !axTieneDelta)
          return res.status(400).json({ ok: false, error: 'nivel o delta_xp requerido' });
        if (axTieneNivel && axTieneDelta)
          return res.status(400).json({ ok: false, error: 'envia solo uno de nivel o delta_xp' });
        if (axTieneNivel && (isNaN(axNivel) || axNivel < 1 || axNivel > NIVELES_ADMIN.length))
          return res.status(400).json({ ok: false, error: 'nivel debe estar entre 1 y ' + NIVELES_ADMIN.length });
        if (axTieneDelta && (isNaN(axDelta) || axDelta === 0))
          return res.status(400).json({ ok: false, error: 'delta_xp invalido' });
        var axUsr = await sql(
          'SELECT * FROM usuarios WHERE id=$1',
          [axUserId]
        ).catch(function(){ return []; });
        if (!axUsr.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var axXpActual = numXp(axUsr[0].xp_total);
        var axNuevoXp;
        if (axTieneNivel) {
          // Decision: subir a nivel X = minimo del umbral del nivel, pero
          // Math.max NO degrada a un usuario que ya supero ese nivel (no
          // se quita XP ganado legitimamente con una seleccion menor).
          axNuevoXp = red2(Math.max(NIVELES_ADMIN[axNivel - 1], axXpActual));
        } else {
          axNuevoXp = red2(Math.max(0, axXpActual + axDelta));
        }
        var axUpd = await sql(
          'UPDATE usuarios SET xp_total=$1, ultimo_acceso=NOW() WHERE id=$2 RETURNING *',
          [axNuevoXp, axUserId]
        );
        var axFila = axUpd && axUpd.length ? axUpd[0] : axUsr[0];
        var axCalc = calcularNivelLocal(axNuevoXp);
        // ADR-053 Dec 4 (v25): admin_xp EXENTO de M_nivel; entrega exacta
        // del delta (puede ser negativa). Se registra en el ledger.
        await registrarXpLedger(sql, {
          usuario_id: axUserId, accion: 'admin_xp',
          xp_base: red2(axTieneNivel ? (axNuevoXp - axXpActual) : axDelta),
          mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'ninguno',
          bonos_planos: 0, xp_final: red2(axNuevoXp - axXpActual), es_exento: true,
          nivel: axCalc.nivel, contexto: { origen: 'admin_xp', modo: axTieneNivel ? 'nivel' : 'delta' }
        });
        var axEra = calcularEraLocal(axCalc.nivel);
        return res.status(200).json({
          ok: true,
          data: {
            usuario: {
              id: axFila.id,
              nombre: axFila.nombre,
              email: axFila.email,
              xp_total: red2(axNuevoXp),
              nivel: axCalc.nivel,
              badge_actual: BADGES_LOCAL[axCalc.nivel - 1] || axFila.badge_actual || '',
              era: axEra,
            },
            delta_aplicado: red2(axTieneNivel ? (axNuevoXp - axXpActual) : axDelta),
            mensaje: 'XP actualizado'
          }
        });
      }

      // Activar/desactivar vocacion de artista (epic 2026-09-13): toggle
      // sobre usuarios.vocaciones (jsonb). Gate por nivel derivado de
      // xp_total (NIVELES_ADMIN), nunca del cliente. Toggle con
      // Object.assign/delete en JS porque hay que borrar claves; el
      // UPDATE solo reemplaza el objeto de vocaciones del usuario.
      if (tipo2 === 'vocacion_activar') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });
        var vocId = String(body.vocacion_id || '');
        var vocItem = null;
        for (var vi = 0; vi < VOCACIONES.length; vi++) {
          if (VOCACIONES[vi].id === vocId) { vocItem = VOCACIONES[vi]; break; }
        }
        if (!vocItem)
          return res.status(400).json({ ok: false, error: 'vocacion_id no valido' });
        var vocUsrRow2 = await sql(
          'SELECT vocaciones, xp_total FROM usuarios WHERE id=$1',
          [usuarioId2]
        ).catch(function(){ return []; });
        if (!vocUsrRow2.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var vocNivel = calcularNivelLocal(numXp(vocUsrRow2[0].xp_total)).nivel;
        if (vocNivel < vocItem.nivel)
          return res.status(403).json({ ok: false, error: 'Sube a nivel ' + vocItem.nivel + ' para desbloquear esta vocacion' });
        var vocActual = (vocUsrRow2[0].vocaciones) || {};
        var vocNuevo = Object.assign({}, vocActual);
        if (Object.prototype.hasOwnProperty.call(vocNuevo, vocId)) {
          delete vocNuevo[vocId];
        } else {
          vocNuevo[vocId] = true;
        }
        await sql(
          'UPDATE usuarios SET vocaciones = $1::jsonb WHERE id=$2',
          [JSON.stringify(vocNuevo), usuarioId2]
        );
        return res.status(200).json({ ok: true, data: { activadas: Object.keys(vocNuevo) } });
      }

      // Arbol de Clases: activar una rama (WP-4, TSK-103 / ADR-028).
      // Gate: sesion firmada del dueno (ADR-025) + nivel >= 5 derivado de
      // xp_total (calcularNivelLocal). DECISION DEL DUENO: NO se exige
      // coincidencia de faccion; se progresa en ramas de cualquier
      // faccion (estilo Albion). Las ramas art_* DELEGAN en la semantica
      // de vocacion_activar: escriben usuarios.vocaciones (fuente unica)
      // y NUNCA ramas_activas.
      if (tipo2 === 'rama_activar') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var ramActSes = validarSesion(req, usuarioId2);
        if (!ramActSes.ok) return responderSesion(res, ramActSes.razon);
        var ramActId = String(body.rama_id || '');
        if (!RAMA_POR_ID[ramActId])
          return res.status(400).json({ ok: false, error: 'rama_id no valido' });
        var ramActUsr = await sql(
          'SELECT xp_total, vocaciones, progreso_arbol FROM usuarios WHERE id=$1',
          [usuarioId2]
        ).catch(function(){ return []; });
        if (!ramActUsr.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var ramActNivel = calcularNivelLocal(numXp(ramActUsr[0].xp_total)).nivel;
        if (ramActNivel < 5)
          return res.status(403).json({ ok: false, error: 'Sube a nivel 5 para desbloquear el arbol de clases' });
        var ramActVoc = Object.assign({}, (ramActUsr[0].vocaciones) || {});
        var ramActProg = (ramActUsr[0].progreso_arbol) || {};
        var ramActVocKey = VOCACION_POR_RAMA_ART[ramActId];
        if (ramActVocKey) {
          // Misma semantica que vocacion_activar: toggle sobre
          // usuarios.vocaciones (fuente unica), sin tocar ramas_activas.
          if (Object.prototype.hasOwnProperty.call(ramActVoc, ramActVocKey)) {
            delete ramActVoc[ramActVocKey];
          } else {
            ramActVoc[ramActVocKey] = true;
          }
          await sql(
            'UPDATE usuarios SET vocaciones = $1::jsonb WHERE id=$2',
            [JSON.stringify(ramActVoc), usuarioId2]
          );
        } else {
          await sql(
            "UPDATE usuarios SET progreso_arbol = COALESCE(progreso_arbol,'{}'::jsonb)"
            + " || jsonb_build_object('ramas_activas', COALESCE(progreso_arbol->'ramas_activas','{}'::jsonb)"
            + ' || jsonb_build_object($1::text, true)) WHERE id=$2',
            [ramActId, usuarioId2]
          );
        }
        var ramActActivas = Object.keys(Object.assign({}, ramActProg.ramas_activas || {}));
        if (!ramActVocKey && ramActActivas.indexOf(ramActId) === -1) ramActActivas.push(ramActId);
        return res.status(200).json({
          ok: true,
          data: { ramas_activas: ramActActivas, vocaciones: ramActVoc },
        });
      }

      // Arbol de Clases: materializar el bono unico de +25 de la mision
      // mis_perfil_completo (WP-4). Idempotente por write-once: solo si
      // bono_pendiente (mision completada y sin eleccion previa) y aun no
      // se eligio rama. Merge ANIDADO de bonos[rama] + rama_bono_elegida.
      if (tipo2 === 'arbol_usuario') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var bonoSes = validarSesion(req, usuarioId2);
        if (!bonoSes.ok) return responderSesion(res, bonoSes.razon);
        if (String(body.accion || '') !== 'bono_mision')
          return res.status(400).json({ ok: false, error: 'accion no valida' });
        var bonoRamaId = String(body.rama_id || '');
        if (!RAMA_POR_ID[bonoRamaId])
          return res.status(400).json({ ok: false, error: 'rama_id no valido' });
        var bonoUsr = await sql(
          'SELECT progreso_misiones, progreso_arbol FROM usuarios WHERE id=$1',
          [usuarioId2]
        ).catch(function(){ return []; });
        if (!bonoUsr.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var bonoPa = (bonoUsr[0].progreso_arbol) || {};
        if (!bonoPendienteArbol(bonoUsr[0].progreso_misiones || {}, bonoPa))
          return res.status(409).json({ ok: false, error: 'BONO_NO_DISPONIBLE' });
        await sql(
          "UPDATE usuarios SET progreso_arbol = COALESCE(progreso_arbol,'{}'::jsonb)"
          + " || jsonb_build_object('bonos', COALESCE(progreso_arbol->'bonos','{}'::jsonb)"
          + "   || jsonb_build_object($1::text, COALESCE((progreso_arbol->'bonos'->>$1)::numeric,0) + 25),"
          + "   'rama_bono_elegida', $1::text)"
          + ' WHERE id=$2',
          [bonoRamaId, usuarioId2]
        ).catch(function(e) {
          console.warn('TRACE: bono de mision no persistido: ' + (e && e.message));
        });
        return res.status(200).json({
          ok: true,
          data: { bono_pendiente: 0, rama_bono_elegida: bonoRamaId },
        });
      }

      // -- Comentarios de media (ADR-023) ----------------------------
      // Publicar comentario o respuesta. Rate-limit 30/dia por usuario y
      // XP +2 con tope 20/dia (10 comentarios) en progreso_album (merge
      // ||, patron del chat). Sin endpoint nuevo (8/8, ADR-010).
      // Comentario en foto de album (alias legacy, ADR-036 v19): delega en
      // el modelo unificado con fuente 'album_foto' a traves de
      // crearComentarioMedia. Conserva el contrato exacto: 400 texto,
      // 403 Usuario no registrado, 404 Media/Comentario padre no
      // encontrado, 429 y 201 con el mismo shape de comentario.
      // DEUDA (BUG-061): mantiene trust de usuario_id sin Bearer; pendiente
      // de validarSesion cuando sus multiples clientes migren.
      if (tipo2 === 'comentario_foto') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var cfcFotoId = body.foto_id || null;
        if (!cfcFotoId)
          return res.status(400).json({ ok: false, error: 'foto_id requerido' });
        var cfcTarget = await resolverMediaItem(sql, 'album_foto', String(cfcFotoId));
        if (!cfcTarget.ok)
          return res.status(404).json({ ok: false, error: 'Media no encontrada' });

        var cfcRes = await crearComentarioMedia(sql, usuarioId2, 'album_foto', String(cfcFotoId), body.texto, body.parent_id || null);
        if (!cfcRes.ok) {
          if (cfcRes.status === 403)
            return res.status(403).json({ ok: false, error: 'Usuario no registrado' });
          return res.status(cfcRes.status).json({ ok: false, error: cfcRes.error });
        }
        return res.status(201).json({
          ok: true,
          comentario: cfcRes.comentario,
          xp: cfcRes.xp,
          misiones: cfcRes.misiones,
          logros: cfcRes.logros,
        });
      }

      // Soft-delete de un comentario (ADR-023, migrado a media en ADR-036
      // v19). Pueden borrar el autor, el admin (Bearer ADMIN_SECRET) o el
      // dueno del album (solo fuente album_foto). Por defecto NO cascada:
      // el nodo queda como tombstone y conserva respuestas. Con
      // cascada:true (solo admin) un CTE recursivo desactiva todo el
      // subarbol. Idempotente; no descuenta XP.
      if (tipo2 === 'comentario_eliminar') {
        var cfeComentarioId = body.comentario_id || null;
        if (!cfeComentarioId)
          return res.status(400).json({ ok: false, error: 'comentario_id requerido' });

        var cfeAdmin = false;
        var cfeToken = req.headers.authorization || '';
        if (cfeToken.indexOf('Bearer ') === 0) {
          var cfeSecret = process.env.ADMIN_SECRET || 'exploraco12345';
          if (cfeToken.slice(7) === cfeSecret) cfeAdmin = true;
        }
        if (!usuarioId2 && !cfeAdmin)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });

        var cfeCascada = body.cascada === true || body.cascada === 'true'
          || body.cascada === 1 || body.cascada === '1';

        var cfeRow = await conDegradacionMedia(
          sql('SELECT id, usuario_id AS autor_id, fuente, item_id, activo FROM media_comentarios WHERE id=$1 LIMIT 1', [cfeComentarioId]),
          'media_comentarios', []
        );
        if (!cfeRow.length)
          return res.status(404).json({ ok: false, error: 'Comentario no encontrado' });

        var cfeAlbumDuenoId = null;
        if (String(cfeRow[0].fuente) === 'album_foto') {
          var cfeTarget = await resolverMediaItem(sql, 'album_foto', String(cfeRow[0].item_id));
          if (cfeTarget.ok) cfeAlbumDuenoId = cfeTarget.albumDuenoId;
        }

        var cfeAutorizado = cfeAdmin
          || String(cfeRow[0].autor_id) === String(usuarioId2)
          || (!!cfeAlbumDuenoId && String(cfeAlbumDuenoId) === String(usuarioId2));
        if (!cfeAutorizado)
          return res.status(403).json({ ok: false, error: 'Sin permisos para eliminar este comentario' });
        if (cfeCascada && !cfeAdmin)
          return res.status(403).json({ ok: false, error: 'Solo el admin puede eliminar en cascada' });

        if (!cfeRow[0].activo)
          return res.status(200).json({
            ok: true, eliminado: true, ya_eliminado: true,
            cascada: false, comentarios_desactivados: 0,
          });

        var cfeDesactivados = 0;
        if (cfeCascada) {
          var cfeUpd = await sql(
            'WITH RECURSIVE sub AS ('
            + ' SELECT id FROM media_comentarios WHERE id=$1'
            + ' UNION ALL'
            + ' SELECT mc.id FROM media_comentarios mc JOIN sub ON mc.parent_id = sub.id'
            + ') UPDATE media_comentarios SET activo=false'
            + ' WHERE id IN (SELECT id FROM sub) AND activo=true RETURNING id',
            [cfeComentarioId]
          );
          cfeDesactivados = cfeUpd.length;
        } else {
          await sql('UPDATE media_comentarios SET activo=false WHERE id=$1 AND activo=true', [cfeComentarioId]);
          cfeDesactivados = 1;
        }
        return res.status(200).json({
          ok: true,
          eliminado: true,
          ya_eliminado: false,
          cascada: cfeCascada,
          comentarios_desactivados: cfeDesactivados,
        });
      }

      // Toggle de me gusta sobre un comentario (ADR-023, migrado a
      // media_comentario_likes en ADR-036 v19 con soft-delete activo). No
      // otorga XP. like es idempotente (nunca 409); unlike desactiva. Sin
      // self-like (403). No se puede votar un tombstone (404).
      if (tipo2 === 'comentario_voto') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var cvComentarioId = body.comentario_id || null;
        if (!cvComentarioId)
          return res.status(400).json({ ok: false, error: 'comentario_id requerido' });
        var cvAccion = String(body.accion || '');
        if (cvAccion !== 'like' && cvAccion !== 'unlike')
          return res.status(400).json({ ok: false, error: 'accion debe ser like o unlike' });

        var cvRow = await conDegradacionMedia(
          sql('SELECT id, usuario_id AS autor_id FROM media_comentarios WHERE id=$1 AND activo=true LIMIT 1', [cvComentarioId]),
          'media_comentarios', []
        );
        if (!cvRow.length)
          return res.status(404).json({ ok: false, error: 'Comentario no encontrado' });
        if (String(cvRow[0].autor_id) === String(usuarioId2))
          return res.status(403).json({ ok: false, error: 'No puedes dar me gusta a tu propio comentario' });

        var cvNuevo = false;
        if (cvAccion === 'like') {
          var cvPrev = await conDegradacionMedia(
            sql('SELECT activo FROM media_comentario_likes WHERE usuario_id=$1 AND comentario_id=$2 LIMIT 1', [usuarioId2, cvComentarioId]),
            'media_comentario_likes', []
          );
          cvNuevo = !cvPrev.length || !cvPrev[0].activo;
          await sql(
            'INSERT INTO media_comentario_likes (usuario_id, comentario_id, activo) VALUES ($1, $2, true)'
            + ' ON CONFLICT (usuario_id, comentario_id) DO UPDATE SET activo = true',
            [usuarioId2, cvComentarioId]
          );
        } else {
          await sql(
            'UPDATE media_comentario_likes SET activo = false WHERE usuario_id=$1 AND comentario_id=$2',
            [usuarioId2, cvComentarioId]
          );
        }
        var cvLikes = await conDegradacionMedia(
          sql('SELECT COUNT(*)::int AS n FROM media_comentario_likes WHERE comentario_id=$1 AND activo=true', [cvComentarioId]),
          'media_comentario_likes', []
        );
        return res.status(200).json({
          ok: true,
          ya_like: cvAccion === 'like',
          likes: (cvLikes[0] && parseInt(cvLikes[0].n, 10)) || 0,
          nuevo: cvNuevo,
        });
      }

      // ==========================================================
      // v9 Gamificacion v4.0 (ADR-018) - POSTs de consumibles,
      // cromos y pandillas. Se manejan ANTES del guard generico de
      // destino_id porque estas operaciones no reciben destino_id.
      // Requieren la migracion 010 aplicada en Neon.
      // ==========================================================

      // Comprar consumible pagando xp_total (anti-farming max 5/dia).
      if (tipo2 === 'comprar_consumible') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var ccClave = String(body.clave || '').trim();
        if (!ccClave)
          return res.status(400).json({ ok: false, error: 'clave requerida' });
        var ccCons = await sql(
          'SELECT id, clave, precio_xp, categoria, era_exclusiva FROM consumibles WHERE clave=$1 AND activo=true LIMIT 1',
          [ccClave]
        ).catch(function(){ return []; });
        if (!ccCons.length) {
          // Degradacion si consumibles.categoria no existe todavia
          // (migracion 017 / WP-6 pendiente): la compra sigue sin
          // descuento en vez de romper.
          ccCons = await sql(
            'SELECT id, clave, precio_xp FROM consumibles WHERE clave=$1 AND activo=true LIMIT 1',
            [ccClave]
          ).catch(function(){ return []; });
        }
        if (!ccCons.length)
          return res.status(503).json({ ok: false, error: 'Consumibles no disponibles (migracion 010 pendiente?)' });
        // Descuento del nodo 5 del Arbol de Clases (WP-4): 10% si el
        // usuario alcanzo el nodo 5 de una rama cuyo efecto descuenta la
        // categoria del consumible. Si el calculo degrada, no hay
        // descuento (nunca rompe la compra).
        var ccPrecioBase = red2(numXp(ccCons[0].precio_xp));
        var ccCategoria = ccCons[0].categoria || null;
        var ccDescPct = 0;
        if (ccCategoria) {
          try {
            var ccArbol = await calcularArbolUsuario(sql, usuarioId2);
            ccDescPct = descuentoArbolParaCategoria(ccArbol.ramas, ccCategoria);
          } catch (eDesc) {
            ccDescPct = 0;
          }
        }
        var ccPrecio = ccDescPct > 0
          ? red2(ccPrecioBase * (100 - ccDescPct) / 100)
          : ccPrecioBase;
        var ccUsr = await sql('SELECT xp_total, capacidades, nivel_max FROM usuarios WHERE id=$1', [usuarioId2]).catch(function(){ return []; });
        if (!ccUsr.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });
        // Gate de era (ADR-056): compra exclusiva por era. El item solo se
        // compra si la era ganada del usuario coincide con era_exclusiva.
        // NULL = sin gate (tienda base). Va antes del chequeo de XP, del
        // anti-farming y del UPDATE.
        var ccEraItem = ccCons[0].era_exclusiva || null;
        if (ccEraItem) {
          var ccEraUsuario = calcularEraVisibleLocal(ccUsr[0].xp_total, ccUsr[0].nivel_max);
          if (ccEraUsuario !== ccEraItem)
            return res.status(403).json({ ok: false, error: 'ERA_INSUFICIENTE', era_requerida: ccEraItem, era_actual: ccEraUsuario });
        }
        var ccXp = numXp(ccUsr[0].xp_total);
        if (ccXp < ccPrecio)
          return res.status(409).json({ ok: false, error: 'XP insuficiente', xp_total: red2(ccXp), precio: ccPrecio });
        // Anti-farming: max 5 compras por dia por usuario
        var ccCount = await sql(
          "SELECT COUNT(*)::int AS n FROM compra_consumibles WHERE usuario_id=$1 AND creado_en > NOW() - INTERVAL '1 day'",
          [usuarioId2]
        ).catch(function(){ return []; });
        if ((ccCount[0] && ccCount[0].n) >= 5)
          return res.status(429).json({ ok: false, error: 'Limite de 5 compras por dia alcanzado' });
        // amuleto_x2: no apilar multiplicadores activos
        var ccCaps = ccUsr[0].capacidades || {};
        if (ccClave === 'amuleto_x2' && (parseInt(ccCaps.multiplicador_x2_usos, 10) || 0) > 0)
          return res.status(409).json({ ok: false, error: 'Ya tienes un amuleto x2 activo' });
        var ccNivelAnt = calcularNivelLocal(ccXp).nivel;
        // Resta atomica + merge del inventario (nunca deja xp negativo:
        // el WHERE xp_total >= $1 protege la escritura)
        var ccUpd = await sql(
          'UPDATE usuarios SET xp_total = xp_total - $1,'
          + " capacidades = COALESCE(capacidades,'{}'::jsonb)"
          + " || jsonb_build_object('consumibles', COALESCE(capacidades->'consumibles','{}'::jsonb)"
          + ' || jsonb_build_object($2, COALESCE((capacidades->\'consumibles\'->>$2)::int, 0) + 1))'
          + ' WHERE id=$3 AND xp_total >= $1 RETURNING xp_total',
          [ccPrecio, ccClave, usuarioId2]
        ).catch(function(){ return []; });
        if (!ccUpd.length)
          return res.status(409).json({ ok: false, error: 'XP insuficiente para la compra' });
        // Ledger append-only
        await sql(
          'INSERT INTO compra_consumibles (usuario_id, consumible_id, xp_pagado) VALUES ($1,$2,$3)',
          [usuarioId2, ccCons[0].id, ccPrecio]
        ).catch(function(){});
        var ccXpNuevo = numXp(ccUpd[0].xp_total);
        var ccNivelNuevo = calcularNivelLocal(ccXpNuevo).nivel;
        // ADR-053 (v25): las COMPRAS restan XP -> fila EXENTA con xp_final
        // negativo (misma via que la apertura de DM: resta auditada).
        await registrarXpLedger(sql, {
          usuario_id: usuarioId2, accion: 'compra_consumible', xp_base: ccPrecio,
          mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'ninguno',
          bonos_planos: 0, xp_final: red2(-ccPrecio), es_exento: true,
          nivel: ccNivelNuevo, contexto: { consumible: ccClave, consumible_id: ccCons[0].id }
        });
        return res.status(200).json({
          ok: true,
          precio_base: ccPrecioBase,
          precio_final: ccPrecio,
          descuento_pct: ccDescPct,
          xp_total_nuevo: red2(ccXpNuevo),
          nivel_anterior: ccNivelAnt,
          nivel_nuevo: ccNivelNuevo,
          bajo_nivel: ccNivelNuevo < ccNivelAnt,
        });
      }

      // Usar consumible (descuenta inventario y aplica efecto).
      if (tipo2 === 'usar_consumible') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var ucClave = String(body.clave || '').trim();
        if (!ucClave)
          return res.status(400).json({ ok: false, error: 'clave requerida' });
        var ucCons = await sql(
          'SELECT id, clave FROM consumibles WHERE clave=$1 LIMIT 1',
          [ucClave]
        ).catch(function(){ return []; });
        if (!ucCons.length)
          return res.status(404).json({ ok: false, error: 'Consumible no existe' });
        var ucCaps = await leerCapacidades(sql, usuarioId2);
        var ucInv = ucCaps.consumibles || {};
        var ucQty = parseInt(ucInv[ucClave], 10) || 0;
        if (ucQty < 1)
          return res.status(409).json({ ok: false, error: 'No tienes este consumible' });
        // Validaciones anti-stacking (spec seccion 8). ADR-056: amuleto_x2 y
        // las brujulas comparten el contador multiplicador_x2_usos, asi que
        // ninguna se puede apilar sobre un x2 ya activo. Se conserva el texto
        // historico para amuleto_x2 (contrato previo) y uno generico para
        // las claves nuevas.
        var UC_CLAVES_X2 = ['amuleto_x2', 'brujula_aprendiz', 'brujula_ruta'];
        if (UC_CLAVES_X2.indexOf(ucClave) !== -1 && (parseInt(ucCaps.multiplicador_x2_usos, 10) || 0) > 0) {
          var ucMsgX2 = ucClave === 'amuleto_x2'
            ? 'Ya tienes un amuleto x2 activo'
            : 'Ya tienes un multiplicador x2 activo';
          return res.status(409).json({ ok: false, error: ucMsgX2 });
        }
        if (ucClave === 'sala_efimera') {
          var ucSalas = Array.isArray(ucCaps.salas_efimeras) ? ucCaps.salas_efimeras : [];
          ucSalas = ucSalas.filter(function(s){ return s && s.hasta && new Date(s.hasta).getTime() > Date.now(); });
          if (ucSalas.length >= 2)
            return res.status(429).json({ ok: false, error: 'Maximo 2 salas efimeras activas' });
        }
        // WP-6 (TSK-103 / ADR-028): validacion de los efectos perfil_*
        // ANTES de descontar inventario. Un payload invalido responde 400
        // sin consumir la mejora (el descuento y el ledger ocurren despues).
        var ucTitulo = '';
        if (ucClave === 'perfil_titulo_custom') {
          ucTitulo = tituloPerfilSafe(body.titulo);
          if (!ucTitulo)
            return res.status(400).json({ ok: false, error: 'TITULO_REQUERIDO' });
        }
        var ucDestacados = null;
        if (ucClave === 'perfil_vitrina_destacada') {
          // WP-6: acepta el nombre historico body.destacados y el alias
          // que envia mi-perfil.html, body.albumes (mismo array <=3 ids).
          var ucDestInput = body.destacados || body.albumes;
          if (!Array.isArray(ucDestInput) || ucDestInput.length > 3)
            return res.status(400).json({ ok: false, error: 'DESTACADOS_INVALIDOS' });
          ucDestacados = [];
          for (var ucD = 0; ucD < ucDestInput.length; ucD++) {
            var ucDestId = String(ucDestInput[ucD] == null ? '' : ucDestInput[ucD]).trim().slice(0, 64);
            if (ucDestId) ucDestacados.push(ucDestId);
          }
        }
        // Descuenta 1 del inventario (borra la clave si llega a 0)
        if (ucQty === 1) {
          await sql(
            "UPDATE usuarios SET capacidades = COALESCE(capacidades,'{}'::jsonb) #- '{consumibles," + ucClave + "}' WHERE id=$1",
            [usuarioId2]
          ).catch(function(){});
        } else {
          await sql(
            'UPDATE usuarios SET capacidades = COALESCE(capacidades,\'{}\'::jsonb)'
            + " || jsonb_build_object('consumibles', COALESCE(capacidades->'consumibles','{}'::jsonb)"
            + ' || jsonb_build_object($1, $2::int)) WHERE id=$3',
            [ucClave, ucQty - 1, usuarioId2]
          ).catch(function(){});
        }
        // Aplica el efecto especifico (spec seccion 10)
        var ucEfecto = {};
        var ucSieteDias = 7 * 24 * 3600 * 1000;
        var ucUnDia = 24 * 3600 * 1000;
        if (ucClave === 'pluma_inspirada') {
          ucEfecto = { permiso_arte: true };
          await actualizarCapacidad(sql, usuarioId2, 'permiso_arte', true);
        } else if (ucClave === 'cuaderno_expedicion') {
          var ucAlbums = parseInt(ucCaps.albums_extra, 10) || 0;
          ucEfecto = { albums_extra: ucAlbums + 1 };
          await actualizarCapacidad(sql, usuarioId2, 'albums_extra', ucAlbums + 1);
        } else if (ucClave === 'pergamino_mapa') {
          var ucMapas = parseInt(ucCaps.mapas_extra, 10) || 0;
          ucEfecto = { mapas_extra: ucMapas + 1 };
          await actualizarCapacidad(sql, usuarioId2, 'mapas_extra', ucMapas + 1);
        } else if (ucClave === 'sala_efimera') {
          // Crea sala comunitaria sin gate de nivel (el esquema real de
          // chat_salas no tiene expira_en; la expiracion se trackea en
          // capacidades.salas_efimeras con ventana de 7 dias).
          var ucNombre = String(body.nombre || 'Sala Efimera').trim().slice(0, 40);
          var ucIcono = String(body.icono || '\uD83D\uDCAC').slice(0, 8);
          var ucDescSal = String(body.descripcion || 'Sala comunitaria creada con Sala Efimera').trim().slice(0, 120);
          var ucSalaRows = await sql(
            'INSERT INTO chat_salas (nombre, icono, descripcion, tipo, orden, creador_id)'
            + ' VALUES ($1,$2,$3,\'viajeros\',0,$4) RETURNING id',
            [ucNombre, ucIcono, ucDescSal, usuarioId2]
          ).catch(function(){ return []; });
          if (ucSalaRows.length) {
            var ucEfimeras = Array.isArray(ucCaps.salas_efimeras) ? ucCaps.salas_efimeras : [];
            ucEfimeras = ucEfimeras.filter(function(s){ return s && s.hasta && new Date(s.hasta).getTime() > Date.now(); });
            var ucHasta = new Date(Date.now() + ucSieteDias).toISOString();
            ucEfimeras.push({ sala_id: ucSalaRows[0].id, hasta: ucHasta });
            await actualizarCapacidad(sql, usuarioId2, 'salas_efimeras', ucEfimeras);
            ucEfecto = { sala_id: ucSalaRows[0].id, expira_en: ucHasta };
          } else {
            ucEfecto = { error: 'No se pudo crear la sala' };
          }
        } else if (ucClave === 'amuleto_x2') {
          ucEfecto = { multiplicador_x2_usos: 5 };
          await actualizarCapacidad(sql, usuarioId2, 'multiplicador_x2_usos', 5);
        } else if (ucClave === 'imantador_cromos') {
          ucEfecto = { cromo_garantia: 'epico' };
          await actualizarCapacidad(sql, usuarioId2, 'cromo_garantia', 'epico');
        } else if (ucClave === 'trompeta_fama') {
          var ucFamaHasta = new Date(Date.now() + ucUnDia).toISOString();
          ucEfecto = { fama_x2_hasta: ucFamaHasta };
          await actualizarCapacidad(sql, usuarioId2, 'fama_x2_hasta', ucFamaHasta);
        } else if (ucClave === 'vitrina_estelar') {
          var ucVitrinaHasta = new Date(Date.now() + ucSieteDias).toISOString();
          ucEfecto = { vitrina_estelar_hasta: ucVitrinaHasta };
          await actualizarCapacidad(sql, usuarioId2, 'vitrina_estelar_hasta', ucVitrinaHasta);
        } else if (ucClave === 'pin_cromado') {
          var ucPinHasta = new Date(Date.now() + ucSieteDias).toISOString();
          ucEfecto = { pin_mapa_hasta: ucPinHasta };
          await actualizarCapacidad(sql, usuarioId2, 'pin_mapa_hasta', ucPinHasta);
        } else if (ucClave === 'pase_vip') {
          var ucVipHasta = new Date(Date.now() + 30 * ucUnDia).toISOString();
          ucEfecto = { vip_hasta: ucVipHasta };
          await actualizarCapacidad(sql, usuarioId2, 'vip_hasta', ucVipHasta);
        } else if (ucClave === 'perfil_marco_dorado') {
          // WP-6 (TSK-103 / ADR-028): marco permanente de la vitrina del
          // museo. Capacidad-flag (leida por museo_publico via perfilPosee)
          // + merge de perfil_config a nivel raiz (ADR-003, nunca reemplazo).
          ucEfecto = { marco: 'dorado' };
          await actualizarCapacidad(sql, usuarioId2, 'perfil_marco_dorado', true);
          await mergePerfilConfig(sql, usuarioId2, { marco: 'dorado' });
        } else if (ucClave === 'perfil_marco_plata') {
          // Marco alternativo de entrada (WP-6): mismo contrato que el
          // dorado; el ultimo marco consumido gana en perfil_config.
          ucEfecto = { marco: 'plata' };
          await actualizarCapacidad(sql, usuarioId2, 'perfil_marco_plata', true);
          await mergePerfilConfig(sql, usuarioId2, { marco: 'plata' });
        } else if (ucClave === 'perfil_tema_oscuro') {
          // Tema oscuro permanente del museo (WP-6).
          ucEfecto = { tema: 'oscuro' };
          await actualizarCapacidad(sql, usuarioId2, 'perfil_tema_oscuro', true);
          await mergePerfilConfig(sql, usuarioId2, { tema: 'oscuro' });
        } else if (ucClave === 'perfil_banda_artista') {
          // Banda de artista bajo el nombre en la comunidad (WP-6).
          ucEfecto = { banda: 'Artista' };
          await actualizarCapacidad(sql, usuarioId2, 'perfil_banda_artista', true);
          await mergePerfilConfig(sql, usuarioId2, { banda: 'Artista' });
        } else if (ucClave === 'perfil_titulo_custom') {
          // Titulo de viajero ya saneado a ASCII (max 24) en la fase de
          // validacion previa al descuento de inventario.
          ucEfecto = { titulo: ucTitulo };
          await actualizarCapacidad(sql, usuarioId2, 'perfil_titulo_custom', true);
          await mergePerfilConfig(sql, usuarioId2, { titulo: ucTitulo });
        } else if (ucClave === 'perfil_fondo_paisaje') {
          // Cabecera del museo: URL http(s) o clave ASCII, max 300. Acepta
          // body.fondo (nombre historico) y el alias body.fondo_url que
          // envia mi-perfil.html. Si no viene o no es valido, cae al valor
          // por defecto documentado (FONDO_PERFIL_DEFAULT); nunca rompe.
          var ucFondo = String(body.fondo || body.fondo_url || '').trim();
          var ucFondoOk = ucFondo.length <= 300
            && (/^https?:\/\/\S+$/i.test(ucFondo) || /^[a-z0-9_-]{1,40}$/i.test(ucFondo));
          if (!ucFondoOk) ucFondo = FONDO_PERFIL_DEFAULT;
          ucEfecto = { fondo: ucFondo };
          await actualizarCapacidad(sql, usuarioId2, 'perfil_fondo_paisaje', true);
          await mergePerfilConfig(sql, usuarioId2, { fondo: ucFondo });
        } else if (ucClave === 'perfil_vitrina_destacada') {
          // Hasta 3 ids de album elegidos (ya validados <=3 antes del
          // descuento). El array completo se sella en perfil_config (merge).
          ucEfecto = { destacados: ucDestacados };
          await actualizarCapacidad(sql, usuarioId2, 'perfil_vitrina_destacada', true);
          await mergePerfilConfig(sql, usuarioId2, { destacados: ucDestacados });
        } else if (ucClave === 'brujula_aprendiz') {
          // ADR-056 / migracion 035: 3 usos de x2 (mismo contador del amuleto).
          ucEfecto = { multiplicador_x2_usos: 3 };
          await actualizarCapacidad(sql, usuarioId2, 'multiplicador_x2_usos', 3);
        } else if (ucClave === 'brujula_ruta') {
          ucEfecto = { multiplicador_x2_usos: 6 };
          await actualizarCapacidad(sql, usuarioId2, 'multiplicador_x2_usos', 6);
        } else if (ucClave === 'cantimplora_anden') {
          var ucMapC = parseInt(ucCaps.mapas_extra, 10) || 0;
          ucEfecto = { mapas_extra: ucMapC + 1 };
          await actualizarCapacidad(sql, usuarioId2, 'mapas_extra', ucMapC + 1);
        } else if (ucClave === 'linterna_selva') {
          var ucMapL = parseInt(ucCaps.mapas_extra, 10) || 0;
          ucEfecto = { mapas_extra: ucMapL + 2 };
          await actualizarCapacidad(sql, usuarioId2, 'mapas_extra', ucMapL + 2);
        } else if (ucClave === 'mapa_carboncillo') {
          var ucAlbC = parseInt(ucCaps.albums_extra, 10) || 0;
          ucEfecto = { albums_extra: ucAlbC + 1 };
          await actualizarCapacidad(sql, usuarioId2, 'albums_extra', ucAlbC + 1);
        } else if (ucClave === 'libreta_campo') {
          var ucAlbL = parseInt(ucCaps.albums_extra, 10) || 0;
          ucEfecto = { albums_extra: ucAlbL + 2 };
          await actualizarCapacidad(sql, usuarioId2, 'albums_extra', ucAlbL + 2);
        } else if (ucClave === 'tintero_cronista') {
          ucEfecto = { permiso_arte: true };
          await actualizarCapacidad(sql, usuarioId2, 'permiso_arte', true);
        } else if (ucClave === 'camara_antigua') {
          var ucVitA = new Date(Date.now() + ucSieteDias).toISOString();
          ucEfecto = { vitrina_estelar_hasta: ucVitA };
          await actualizarCapacidad(sql, usuarioId2, 'vitrina_estelar_hasta', ucVitA);
        } else if (ucClave === 'aura_mito') {
          var ucVitB = new Date(Date.now() + ucSieteDias).toISOString();
          ucEfecto = { vitrina_estelar_hasta: ucVitB };
          await actualizarCapacidad(sql, usuarioId2, 'vitrina_estelar_hasta', ucVitB);
        } else if (ucClave === 'sello_archivo') {
          ucEfecto = { cromo_garantia: 'epico' };
          await actualizarCapacidad(sql, usuarioId2, 'cromo_garantia', 'epico');
        } else if (ucClave === 'estandarte_leyenda') {
          var ucFamaEst = new Date(Date.now() + ucUnDia).toISOString();
          ucEfecto = { fama_x2_hasta: ucFamaEst };
          await actualizarCapacidad(sql, usuarioId2, 'fama_x2_hasta', ucFamaEst);
        } else if (ucClave === 'capa_travesia') {
          var ucPinCapa = new Date(Date.now() + ucSieteDias).toISOString();
          ucEfecto = { pin_mapa_hasta: ucPinCapa };
          await actualizarCapacidad(sql, usuarioId2, 'pin_mapa_hasta', ucPinCapa);
        } else if (ucClave === 'corona_rutas') {
          // Permanente: flag de capacidad + merge de perfil_config (ADR-003).
          ucEfecto = { marco: 'dorado' };
          await actualizarCapacidad(sql, usuarioId2, 'perfil_corona_rutas', true);
          await mergePerfilConfig(sql, usuarioId2, { marco: 'dorado' });
        } else if (ucClave === 'reliquia_ancestral') {
          ucEfecto = { tema: 'oscuro' };
          await actualizarCapacidad(sql, usuarioId2, 'perfil_reliquia_ancestral', true);
          await mergePerfilConfig(sql, usuarioId2, { tema: 'oscuro' });
        } else if (ucClave === 'nombre_eterno') {
          // Titulo fijo; no requiere payload.
          ucEfecto = { titulo: 'Mito Eterno' };
          await actualizarCapacidad(sql, usuarioId2, 'perfil_nombre_eterno', true);
          await mergePerfilConfig(sql, usuarioId2, { titulo: 'Mito Eterno' });
        }
        // Ledger de uso append-only
        await sql(
          'INSERT INTO consumo_consumibles (usuario_id, consumible_id, efecto_detalle)'
          + ' VALUES ($1,$2,$3::jsonb)',
          [usuarioId2, ucCons[0].id, JSON.stringify(ucEfecto)]
        ).catch(function(){});
        return res.status(200).json({ ok: true, efecto: ucEfecto });
      }

      // Disparo manual de cromo (probabilidad 15% + CROMO_PROBABILIDADES).
      if (tipo2 === 'cromo_obtener') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var coAccion = String(body.accion || 'resena').slice(0, 20);
        var coDestino = body.destino_id || null;
        var coCromo = await intentarObtenerCromo(sql, usuarioId2, coDestino);
        return res.status(200).json({ ok: true, accion: coAccion, cromo: coCromo });
      }

      // Intercambio de cromo duplicado entre 2 usuarios.
      if (tipo2 === 'cromo_intercambio') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido (emisor)' });
        var ciReceptor = String(body.receptor_id || '');
        var ciCromoId = String(body.cromo_id || '');
        if (!ciReceptor || !ciCromoId)
          return res.status(400).json({ ok: false, error: 'receptor_id y cromo_id requeridos' });
        if (ciReceptor === usuarioId2)
          return res.status(409).json({ ok: false, error: 'No puedes intercambiar contigo mismo' });
        var ciReceptorRow = await sql(
          'SELECT id FROM usuarios WHERE id=$1 AND activo=true',
          [ciReceptor]
        ).catch(function(){ return []; });
        if (!ciReceptorRow.length)
          return res.status(404).json({ ok: false, error: 'Receptor no encontrado' });
        var ciCromoRow = await sql(
          'SELECT id FROM cromos_catalogo WHERE id=$1 AND activo=true LIMIT 1',
          [ciCromoId]
        ).catch(function(){ return []; });
        if (!ciCromoRow.length)
          return res.status(404).json({ ok: false, error: 'Cromo no encontrado' });
        var ciMio = await sql(
          'SELECT cantidad FROM usuarios_cromos WHERE usuario_id=$1 AND cromo_id=$2 LIMIT 1',
          [usuarioId2, ciCromoId]
        ).catch(function(){ return []; });
        if (!ciMio.length || parseInt(ciMio[0].cantidad, 10) < 2)
          return res.status(409).json({ ok: false, error: 'Necesitas al menos 2 copias del cromo para intercambiar' });
        // Anti-farming: max 3 intercambios por dia via la tabla real
        // cromo_intercambios (migracion 010, idx_cromo_inter_dia). El
        // ledger es append-only y se inserta una fila por intercambio
        // tras el credito exitoso (misino try, mismo rollback).
        var ciInicioDia = hoy() + 'T00:00:00Z';
        var ciCount = await sql(
          'SELECT COUNT(*)::int AS n FROM cromo_intercambios'
          + ' WHERE emisor_id=$1 AND creado_en >= $2',
          [usuarioId2, ciInicioDia]
        ).catch(function(){ return []; });
        if ((ciCount[0] && ciCount[0].n) >= 3)
          return res.status(429).json({ ok: false, error: 'Limite de 3 intercambios por dia alcanzado' });
        // Debita emisor (borra fila si llega a 0)
        var ciNuevaCant = parseInt(ciMio[0].cantidad, 10) - 1;
        if (ciNuevaCant <= 0) {
          await sql('DELETE FROM usuarios_cromos WHERE usuario_id=$1 AND cromo_id=$2', [usuarioId2, ciCromoId]);
        } else {
          await sql('UPDATE usuarios_cromos SET cantidad=$1 WHERE usuario_id=$2 AND cromo_id=$3', [ciNuevaCant, usuarioId2, ciCromoId]);
        }
        // Credita receptor y registra el intercambio en el ledger
        // append-only (cromo_intercambios). El rollback centralizado
        // devuelve la copia al emisor si cualquiera de los dos falla.
        try {
          await sql(
            'INSERT INTO usuarios_cromos (usuario_id, cromo_id, cantidad) VALUES ($1,$2,1)'
            + ' ON CONFLICT (usuario_id, cromo_id) DO UPDATE SET cantidad = usuarios_cromos.cantidad + 1',
            [ciReceptor, ciCromoId]
          );
          await sql(
            'INSERT INTO cromo_intercambios (emisor_id, receptor_id, cromo_id) VALUES ($1,$2,$3)',
            [usuarioId2, ciReceptor, ciCromoId]
          );
        } catch (eCi) {
          // Rollback: devuelve la copia al emisor para no perderla
          if (ciNuevaCant <= 0) {
            await sql('INSERT INTO usuarios_cromos (usuario_id, cromo_id, cantidad) VALUES ($1,$2,1)', [usuarioId2, ciCromoId]).catch(function(){});
          } else {
            await sql('UPDATE usuarios_cromos SET cantidad=$1 WHERE usuario_id=$2 AND cromo_id=$3', [ciNuevaCant + 1, usuarioId2, ciCromoId]).catch(function(){});
          }
          return res.status(500).json({ ok: false, error: 'Error al acreditar al receptor' });
        }
        return res.status(200).json({ ok: true });
      }

      // Fundar pandilla (gate: nivel >= 14 = 8500 XP, max 1 activa).
      if (tipo2 === 'pandilla_crear') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var pcNombre = String(body.nombre || '').trim();
        if (!pcNombre)
          return res.status(400).json({ ok: false, error: 'nombre requerido' });
        if (pcNombre.length > 100)
          return res.status(400).json({ ok: false, error: 'nombre maximo 100 caracteres' });
        var pcCiudad = String(body.ciudad_base || '').trim().slice(0, 100) || null;
        var pcDesc = String(body.descripcion || '').trim().slice(0, 1000);
        var pcUsr = await sql('SELECT xp_total FROM usuarios WHERE id=$1', [usuarioId2]).catch(function(){ return []; });
        if (!pcUsr.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });
        var pcNivel = calcularNivelLocal(numXp(pcUsr[0].xp_total)).nivel;
        if (pcNivel < 14)
          return res.status(403).json({ ok: false, error: 'Se requiere nivel 14 (8500 XP) para fundar una pandilla' });
        var pcActiva = await sql(
          'SELECT 1 AS uno FROM pandillas_miembros WHERE usuario_id=$1 AND activo=true LIMIT 1',
          [usuarioId2]
        ).catch(function(){ return []; });
        if (pcActiva.length)
          return res.status(409).json({ ok: false, error: 'Ya perteneces a una pandilla activa' });
        var pcNuevo;
        try {
          pcNuevo = await sql(
            'INSERT INTO pandillas (nombre, fundador_id, ciudad_base, descripcion) VALUES ($1,$2,$3,$4) RETURNING *',
            [pcNombre, usuarioId2, pcCiudad, pcDesc]
          );
        } catch (ePc) {
          if (ePc.code === '23505')
            return res.status(409).json({ ok: false, error: 'Ya existe una pandilla con ese nombre' });
          return res.status(500).json({ ok: false, error: 'Error al crear pandilla' });
        }
        await sql(
          'INSERT INTO pandillas_miembros (pandilla_id, usuario_id, rol) VALUES ($1,$2,\'fundador\')',
          [pcNuevo[0].id, usuarioId2]
        ).catch(function(){});
        return res.status(200).json({ ok: true, pandilla: pcNuevo[0] });
      }

      // Unirse a pandilla (max 1 activa, max 10 miembros, cooldown 14d).
      if (tipo2 === 'pandilla_unirse') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var puPandilla = String(body.pandilla_id || '');
        if (!puPandilla)
          return res.status(400).json({ ok: false, error: 'pandilla_id requerido' });
        var puActiva = await sql(
          'SELECT 1 AS uno FROM pandillas_miembros WHERE usuario_id=$1 AND activo=true LIMIT 1',
          [usuarioId2]
        ).catch(function(){ return []; });
        if (puActiva.length)
          return res.status(409).json({ ok: false, error: 'Ya perteneces a una pandilla activa' });
        // Cooldown 14 dias: ultima membresia inactiva (fecha_ingreso)
        // o fecha_salida guardada en capacidades al salir.
        var puUltima = await sql(
          'SELECT fecha_ingreso FROM pandillas_miembros WHERE usuario_id=$1 AND activo=false ORDER BY fecha_ingreso DESC LIMIT 1',
          [usuarioId2]
        ).catch(function(){ return []; });
        var puCaps = await leerCapacidades(sql, usuarioId2);
        var puCooldownOk = true;
        var puVentana = 14 * 24 * 3600 * 1000;
        if (puUltima.length) {
          var puTs = new Date(puUltima[0].fecha_ingreso).getTime();
          if (!isNaN(puTs) && (Date.now() - puTs) < puVentana) puCooldownOk = false;
        }
        if (puCooldownOk && puCaps.fecha_salida_pandilla) {
          var puTs2 = new Date(String(puCaps.fecha_salida_pandilla)).getTime();
          if (!isNaN(puTs2) && (Date.now() - puTs2) < puVentana) puCooldownOk = false;
        }
        if (!puCooldownOk)
          return res.status(429).json({ ok: false, error: 'Debes esperar 14 dias para unirte a otra pandilla' });
        var puPand = await sql(
          'SELECT id FROM pandillas WHERE id=$1 AND activo=true LIMIT 1',
          [puPandilla]
        ).catch(function(){ return []; });
        if (!puPand.length)
          return res.status(404).json({ ok: false, error: 'Pandilla no encontrada' });
        var puMiembros = await sql(
          'SELECT COUNT(*)::int AS n FROM pandillas_miembros WHERE pandilla_id=$1 AND activo=true',
          [puPandilla]
        ).catch(function(){ return []; });
        if ((puMiembros[0] && puMiembros[0].n) >= 10)
          return res.status(409).json({ ok: false, error: 'Pandilla llena (maximo 10 miembros)' });
        try {
          await sql(
            'INSERT INTO pandillas_miembros (pandilla_id, usuario_id, rol) VALUES ($1,$2,\'miembro\')',
            [puPandilla, usuarioId2]
          );
        } catch (ePu) {
          if (ePu.code === '23505')
            return res.status(409).json({ ok: false, error: 'Ya eres miembro de esta pandilla' });
          return res.status(500).json({ ok: false, error: 'Error al unirte' });
        }
        return res.status(200).json({ ok: true });
      }

      // Salir de pandilla activa (Cero Borrado Logico + cooldown 14d).
      if (tipo2 === 'pandilla_salir') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var psUpd = await sql(
          'UPDATE pandillas_miembros SET activo=false WHERE usuario_id=$1 AND activo=true RETURNING pandilla_id',
          [usuarioId2]
        ).catch(function(){ return []; });
        if (!psUpd.length)
          return res.status(409).json({ ok: false, error: 'No perteneces a ninguna pandilla activa' });
        // Guarda la fecha de salida para el cooldown de reingreso
        await actualizarCapacidad(sql, usuarioId2, 'fecha_salida_pandilla', new Date().toISOString());
        return res.status(200).json({ ok: true });
      }

      // Crear reto de parche (rol fundador/oficial, ventana temporal).
      if (tipo2 === 'pandilla_reto') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var prPandilla = String(body.pandilla_id || '');
        var prTitulo = String(body.titulo || '').trim();
        if (!prPandilla || !prTitulo)
          return res.status(400).json({ ok: false, error: 'pandilla_id y titulo requeridos' });
        if (prTitulo.length > 150)
          return res.status(400).json({ ok: false, error: 'titulo maximo 150 caracteres' });
        var prRol = await sql(
          'SELECT rol FROM pandillas_miembros WHERE pandilla_id=$1 AND usuario_id=$2 AND activo=true LIMIT 1',
          [prPandilla, usuarioId2]
        ).catch(function(){ return []; });
        if (!prRol.length)
          return res.status(403).json({ ok: false, error: 'No eres miembro de esta pandilla' });
        if (prRol[0].rol !== 'fundador' && prRol[0].rol !== 'oficial')
          return res.status(403).json({ ok: false, error: 'Se requiere rol fundador u oficial para crear retos' });
        var prMeta = parseInt(body.meta_valor, 10);
        if (isNaN(prMeta) || prMeta < 1)
          return res.status(400).json({ ok: false, error: 'meta_valor debe ser entero positivo' });
        var prFin = body.fecha_fin ? new Date(String(body.fecha_fin)) : null;
        if (!prFin || isNaN(prFin.getTime()) || prFin.getTime() <= Date.now())
          return res.status(400).json({ ok: false, error: 'fecha_fin debe ser una fecha futura' });
        var prDesc = String(body.descripcion || '').trim().slice(0, 1000);
        var prTipoReto = String(body.tipo_reto || 'general').slice(0, 50);
        var prXp = parseFloat(body.xp_bono);
        if (isNaN(prXp) || prXp < 0) prXp = 0;
        else prXp = red2(prXp);
        var prIns = await sql(
          'INSERT INTO pandilla_retos (pandilla_id, titulo, descripcion, tipo_reto, meta_valor, fecha_fin, xp_bono)'
          + ' VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
          [prPandilla, prTitulo, prDesc, prTipoReto, prMeta, prFin.toISOString(), prXp]
        ).catch(function(){ return []; });
        if (!prIns.length)
          return res.status(503).json({ ok: false, error: 'Retos no disponibles (migracion 010 pendiente?)' });
        prIns[0].xp_bono = red2(numXp(prIns[0].xp_bono));
        return res.status(200).json({ ok: true, reto: prIns[0] });
      }

      // -- Compartir media (ADR-036 A, v19) ----------------------------
      // {tipo:'compartir', usuario_id, destino_id, fuente, item_id, canal}.
      // 25 XP la PRIMERA vez que un usuario comparte un (fuente,item_id)
      // para siempre; 5 XP en las posteriores; tope de 50 XP en ventana
      // rodante de 24h. Exige validarSesion (cierra el spoofing de XP,
      // clase BUG-061). NO escribe en interacciones: el ledger es
      // media_compartidos.xp_ganado (migracion 022).
      if (tipo2 === 'compartir') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var cpSesion = validarSesion(req, usuarioId2);
        if (!cpSesion.ok) return responderSesion(res, cpSesion.razon);

        var cpFuente = String(body.fuente || '').toLowerCase();
        if (['destino', 'curada', 'viajero_foto', 'album_foto'].indexOf(cpFuente) === -1)
          return res.status(400).json({ ok: false, error: 'fuente invalida (destino|curada|viajero_foto|album_foto)' });
        var cpCanal = String(body.canal || '').toLowerCase();
        if (['web_share', 'whatsapp', 'copiar', 'otro'].indexOf(cpCanal) === -1)
          return res.status(400).json({ ok: false, error: 'canal invalido (web_share|whatsapp|copiar|otro)' });
        var cpItem = String(body.item_id || '').trim();
        if (!/^[0-9A-Za-z_-]{1,64}$/.test(cpItem))
          return res.status(400).json({ ok: false, error: 'item_id invalido' });

        // Existencia del item por fuente (404 si no). El destino_id del log
        // se deriva del item validado para no arriesgar la FK de
        // media_compartidos.destino_id.
        var cpDestinoId = null;
        if (cpFuente === 'destino') {
          var cpD = await sql(
            'SELECT id FROM destinos WHERE id::text=$1 AND status=\'published\' LIMIT 1',
            [cpItem]
          ).catch(function(){ return []; });
          if (!cpD.length)
            return res.status(404).json({ ok: false, error: 'Destino no encontrado' });
          cpDestinoId = cpD[0].id;
        } else {
          var cpTarget = await resolverMediaItem(sql, cpFuente, cpItem);
          if (!cpTarget.ok)
            return res.status(404).json({ ok: false, error: 'Media no encontrada' });
          cpDestinoId = cpTarget.destinoId || null;
        }
        // El destino_id explicito del body (uuid valido) tiene prioridad
        // como contexto de pagina para las fuentes que no son 'destino'
        // (alimenta mis_embajador_destinos, que cuenta destinos distintos).
        if (cpFuente !== 'destino') {
          var cpBodyDestino = String(body.destino_id || '').trim();
          if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cpBodyDestino))
            cpDestinoId = cpBodyDestino;
        }

        // Tope de eventos: 10 comparticiones por 24h, paguen o no XP. Al
        // alcanzarlo se responde sin insertar y sin consumir el primero.
        var cpEventos = await conDegradacionMedia(
          sql("SELECT COUNT(*)::int AS n FROM media_compartidos WHERE usuario_id=$1 AND creado_en > NOW() - INTERVAL '1 day'", [usuarioId2]),
          'media_compartidos', [{ n: 0 }]
        );
        if (((cpEventos[0] && parseInt(cpEventos[0].n, 10)) || 0) >= 10)
          return res.status(200).json({ ok: true, xp: 0, primero: false, tope_diario: true, misiones: [], logros: [] });

        // Deteccion atomica del primer share (indice unico parcial
        // media_compartidos_primero_uq). Si no inserta, es posterior.
        var cpInsPri = await sql(
          'INSERT INTO media_compartidos (usuario_id, destino_id, fuente, item_id, canal, es_primero, xp_ganado)'
          + ' VALUES ($1, $2, $3, $4, $5, true, 0)'
          + ' ON CONFLICT (usuario_id, fuente, item_id) WHERE es_primero = true DO NOTHING'
          + ' RETURNING id',
          [usuarioId2, cpDestinoId, cpFuente, cpItem, cpCanal]
        );
        var cpPrimero = cpInsPri.length > 0;
        var cpFilaId = cpPrimero ? cpInsPri[0].id : null;
        if (!cpPrimero) {
          var cpInsLog = await sql(
            'INSERT INTO media_compartidos (usuario_id, destino_id, fuente, item_id, canal, es_primero, xp_ganado)'
            + ' VALUES ($1, $2, $3, $4, $5, false, 0) RETURNING id',
            [usuarioId2, cpDestinoId, cpFuente, cpItem, cpCanal]
          );
          cpFilaId = cpInsLog[0].id;
        }

        // XP base 25 (primero) o 5 (posterior), capada al remanente de la
        // ventana rodante de 50 XP/24h. Si el remanente es 0 se registra el
        // evento con xp 0.
        var cpXpDiaPrevio = await conDegradacionMedia(
          sql("SELECT COALESCE(SUM(xp_ganado), 0)::numeric AS s FROM media_compartidos WHERE usuario_id=$1 AND creado_en > NOW() - INTERVAL '1 day'", [usuarioId2]),
          'media_compartidos', [{ s: 0 }]
        );
        var cpDiaPrevio = cpXpDiaPrevio[0] ? numXp(cpXpDiaPrevio[0].s) : 0;
        var cpBase = cpPrimero ? XP_BASES.compartir.primero : XP_BASES.compartir.posterior;
        var cpRemanente = Math.max(0, red2(50 - cpDiaPrevio));
        var cpBaseCap = Math.min(cpBase, cpRemanente);
        var cpAmuleto = { doubled: false };
        var cpResult = null;
        var cpXpFinal = 0;
        var cpCapLedger = 'accion';
        if (cpBaseCap > 0) {
          var ctxCompartir = await contextoXpE(sql, usuarioId2);
          cpAmuleto = await aplicarAmuletoX2(sql, usuarioId2, cpBaseCap);
          var cpLider = await esLiderDestino(sql, usuarioId2, cpDestinoId);
          cpResult = await calcularXpAcreditado(sql, cpBaseCap, ctxCompartir.nivel_clase,
            ctxCompartir.clase_id, ctxCompartir.tag,
            { nivel_usuario: ctxCompartir.nivel_usuario, amuleto: cpAmuleto.doubled, lider: cpLider });
          // ADR-038/ADR-036: el ledger media_compartidos.xp_ganado y el
          // tope rodante de 50 XP/24h cuentan sobre el xp_final; el recorte
          // por cupo (cap denominado en XP) se registra como 'accion'
          // (ADR-053 Dec 7 / R-12).
          cpXpFinal = red2(Math.min(cpResult.xp_final, cpRemanente));
          cpCapLedger = (cpXpFinal < cpResult.xp_final) ? 'accion' : cpResult.cap_aplicado;
          if (cpXpFinal > 0) {
            await sql('UPDATE usuarios SET xp_total=xp_total+$1, ultimo_acceso=NOW() WHERE id=$2', [cpXpFinal, usuarioId2]).catch(function(){});
            await sql('UPDATE media_compartidos SET xp_ganado=$1 WHERE id=$2', [cpXpFinal, cpFilaId]).catch(function(){});
            await acreditarClaseYCofre(sql, usuarioId2, ctxCompartir, cpXpFinal);
            await aplicarFamaPandilla(sql, usuarioId2, cpXpFinal);
            await repartirXpReferidos(sql, usuarioId2, cpXpFinal);
          }
        }
        await registrarXpLedger(sql, {
          usuario_id: usuarioId2, accion: 'compartir', xp_base: cpBase,
          mult_nivel: cpResult ? cpResult.m_nivel : 1,
          mult_stack: cpResult ? cpResult.mult_stack : 1,
          mult_final: cpResult ? cpResult.mult_global_c : 1,
          cap_aplicado: cpCapLedger, bonos_planos: 0, xp_final: cpXpFinal,
          contexto: { fuente: cpFuente, item_id: cpItem, canal: cpCanal, destino_id: cpDestinoId, primero: cpPrimero }
        });
        var cpMisiones = await evaluarMisiones(sql, usuarioId2);
        var cpLogros = await evaluarLogros(sql, usuarioId2);
        var cpReto = await progresarPandillaRetos(sql, usuarioId2, 'compartir');
        var cpCromo = cpXpFinal > 0 ? await intentarObtenerCromo(sql, usuarioId2, cpDestinoId) : null;
        var cpXpDia = red2(cpDiaPrevio + cpXpFinal);

        var cpResp = {
          ok: true, xp: cpXpFinal, primero: cpPrimero, canal: cpCanal,
          xp_dia: cpXpDia, tope_diario: cpXpDia >= 50,
          xp_detalle: cpResult ? armarXpDetalle(cpBase, cpResult, 0, cpXpFinal, cpCapLedger) : undefined,
          misiones: cpMisiones, logros: cpLogros,
        };
        if (cpAmuleto.doubled) cpResp.amuleto_x2 = true;
        if (cpCromo) cpResp.cromo = cpCromo;
        if (cpReto) cpResp.reto_completado = cpReto;
        return res.status(200).json(cpResp);
      }

      // -- Completar atributos de un spot (ADR-053 Dec 9, v25) ---------
      // {tipo:'spot_atributos', usuario_id, destino_id}. Otorga +10 XP con
      // M_nivel UNA SOLA VEZ por (usuario, destino), SOLO a quien completa
      // (nunca en la creacion). El servidor RELEE destinos y valida la
      // completitud con completitudSpotAtributos: 3 campos nucleo no vacios
      // (ciudad, direccion = address/barrio, telefono o precio_desde en
      // hostal/comida) + taxonomia por categoria (tags.subcategoria en
      // sitio/comida/evento; cualquier tag no vacio en hostal/blog/vacia,
      // ADR-016). Sin completitud -> 200 {ok:true, xp:0, motivo:'incompleto'}
      // (no es error). Dedup contra el propio ledger (degrada si la 031 no
      // esta aplicada; la deuda "nunca al creador" por falta de
      // destinos.creado_por queda documentada en el helper).
      if (tipo2 === 'spot_atributos') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var spSes = validarSesion(req, usuarioId2);
        if (!spSes.ok) return responderSesion(res, spSes.razon);
        var spDestino = String(body.destino_id || destinoId2 || '').trim();
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(spDestino))
          return res.status(400).json({ ok: false, error: 'destino_id invalido' });
        var spD = await sql(
          'SELECT id, categoria_slug, ciudad, address, barrio, telefono, precio_desde, tags '
          + 'FROM destinos WHERE id=$1::uuid LIMIT 1',
          [spDestino]
        ).catch(function(eSp) {
          if (eSp && (eSp.code === '42P01' || eSp.code === '42703')) {
            console.warn('[spot_atributos] esquema de destinos incompleto: ' + eSp.code);
          } else {
            console.warn('[spot_atributos] destino no leido: ' + (eSp && eSp.message));
          }
          return [];
        });
        if (!spD.length)
          return res.status(404).json({ ok: false, error: 'Destino no encontrado' });
        var spRow = spD[0];
        // Dedup contra el ledger: 1 sola vez por (usuario, destino).
        var spYa = false;
        try {
          var spLed = await sql(
            'SELECT 1 AS uno FROM xp_ledger '
            + 'WHERE usuario_id=$1::uuid AND accion=\'spot_atributos\' '
            + 'AND contexto->>\'destino_id\'=$2 LIMIT 1',
            [usuarioId2, spDestino]
          );
          spYa = !!(spLed && spLed.length);
        } catch (eSpLed) {
          console.warn('[spot_atributos] dedup de ledger no disponible: ' + (eSpLed && eSpLed.code));
        }
        if (spYa)
          return res.status(200).json({ ok: true, xp: 0, motivo: 'ya_otorgado' });
        // Completitud por categoria (ver completitudSpotAtributos): 3 campos
        // nucleo siempre + taxonomia de subcategoria (sitio/comida/evento,
        // ADR-016); hostal/blog/vacia admiten "al menos 1 tag no vacio".
        if (!completitudSpotAtributos(spRow))
          return res.status(200).json({ ok: true, xp: 0, motivo: 'incompleto' });
        var spCtx = await contextoXpE(sql, usuarioId2);
        var resSpot = await calcularXpAcreditado(sql, XP_BASES.spot_atributos,
          spCtx.nivel_clase, spCtx.clase_id, spCtx.tag,
          { nivel_usuario: spCtx.nivel_usuario });
        var xpSpotFinal = resSpot.xp_final;
        await sql(
          'UPDATE usuarios SET xp_total = xp_total + $1, ultimo_acceso = NOW() WHERE id=$2',
          [xpSpotFinal, usuarioId2]
        ).catch(function(eSpXp) { console.warn('[spot_atributos] xp no acreditado: ' + (eSpXp && eSpXp.message)); });
        await acreditarClaseYCofre(sql, usuarioId2, spCtx, xpSpotFinal);
        await repartirXpReferidos(sql, usuarioId2, xpSpotFinal);
        await registrarXpLedger(sql, {
          usuario_id: usuarioId2, accion: 'spot_atributos', xp_base: XP_BASES.spot_atributos,
          mult_nivel: resSpot.m_nivel, mult_stack: resSpot.mult_stack,
          mult_final: resSpot.mult_global_c, cap_aplicado: resSpot.cap_aplicado,
          xp_final: xpSpotFinal, contexto: { destino_id: spDestino }
        });
        var spMisiones = await evaluarMisiones(sql, usuarioId2);
        var spLogros = await evaluarLogros(sql, usuarioId2);
        return res.status(200).json({
          ok: true, xp: xpSpotFinal, xp_detalle: armarXpDetalle(XP_BASES.spot_atributos, resSpot, 0),
          misiones: spMisiones, logros: spLogros
        });
      }

      // ============ v28 MERCADO DE EMPRENDEDORES (migracion 034) ============
      // Todas las ramas exigen sesion firmada y derivan el usuario del token
      // (nunca de body.usuario_id, leccion BUG-061).

      // Publicar una oferta en el mercado de la Casa del vendedor.
      if (tipo2 === 'mercado_publicar') {
        var mpSes = usuarioDeSesion(req);
        if (!mpSes.ok) return responderSesion(res, mpSes.razon);
        var mpUid = mpSes.usuario_id;
        var mpOrigen = String(body.origen || 'inventario').trim().toLowerCase();
        if (mpOrigen !== 'inventario' && mpOrigen !== 'produccion')
          return res.status(400).json({ ok: false, error: 'origen invalido' });
        var mpRef = String(body.consumible_id || body.clave || '').trim();
        if (!mpRef)
          return res.status(400).json({ ok: false, error: 'consumible_id requerido' });
        var mpCant = parseInt(body.cantidad, 10);
        if (!isFinite(mpCant) || mpCant < 1) mpCant = 1;
        if (mpCant > 999) mpCant = 999;
        var mpPrecio = numXp(body.precio_unitario);
        if (!(mpPrecio > 0))
          return res.status(400).json({ ok: false, error: 'precio_unitario requerido' });

        var mpUsr, mpCons, mpCfg;
        try {
          mpUsr = await sql(
            'SELECT casa, xp_total, mercado_puntos FROM usuarios WHERE id=$1::uuid LIMIT 1',
            [mpUid]
          );
          mpCons = await sql(
            'SELECT id, clave, nombre, tipo_canje FROM consumibles'
            + ' WHERE (clave=$1 OR id::text=$1) AND activo=true LIMIT 1',
            [mpRef]
          );
          mpCfg = await cargarConfigMercado(sql, String((mpUsr[0] || {}).casa || '').toLowerCase());
        } catch (eMp) {
          if (!esEsquemaFaltante(eMp)) throw eMp;
          return responderMercadoAusente(res, eMp, 'mercado_publicar');
        }
        if (!mpUsr.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });
        var mpNivel = calcularNivelLocal(numXp(mpUsr[0].xp_total)).nivel;
        if (mpNivel < 2)
          return res.status(403).json({ ok: false, error: 'NIVEL_INSUFICIENTE' });
        var mpCasa = String(mpUsr[0].casa || '').toLowerCase();
        if (MERCADO_CASAS.indexOf(mpCasa) === -1)
          return res.status(403).json({ ok: false, error: 'CASA_REQUERIDA' });
        if (!mpCons.length)
          return res.status(404).json({ ok: false, error: 'Consumible no encontrado' });
        if (!mpCfg || mpCfg.activo !== true)
          return res.status(403).json({ ok: false, error: 'MERCADO_INACTIVO' });
        var mpPmin = numXp(mpCfg.precio_min);
        var mpPmax = numXp(mpCfg.precio_max);
        if (mpPrecio < mpPmin || mpPrecio > mpPmax)
          return res.status(400).json({ ok: false, error: 'PRECIO_FUERA_DE_RANGO', precio_min: mpPmin, precio_max: mpPmax });

        var mpNodo = calcularMercadoEfectivo(numXp(mpUsr[0].mercado_puntos), mpNivel);
        var mpNodoInfo = nodoMercado(mpNodo);
        if (mpOrigen === 'produccion') {
          if (!mpNodoInfo.produce)
            return res.status(403).json({ ok: false, error: 'NODO_INSUFICIENTE' });
          if (mpCfg.permite_produccion !== true)
            return res.status(403).json({ ok: false, error: 'PRODUCCION_DESHABILITADA' });
          if (String(mpCons[0].tipo_canje || '') !== 'producir')
            return res.status(400).json({ ok: false, error: 'CONSUMIBLE_NO_PRODUCIBLE' });
        }

        // Slots libres en la Casa del vendedor.
        var mpSlots;
        try {
          mpSlots = await sql(
            'SELECT COUNT(*)::int AS n FROM mercado_ofertas'
            + ' WHERE vendedor_id=$1::uuid AND casa=$2 AND estado=\'activa\''
            + ' AND expira_en > NOW()',
            [mpUid, mpCasa]
          );
        } catch (eMpS) {
          if (!esEsquemaFaltante(eMpS)) throw eMpS;
          return responderMercadoAusente(res, eMpS, 'mercado_ofertas');
        }
        var mpUsados = (mpSlots[0] && Number(mpSlots[0].n)) || 0;
        var mpTotales = slotsMercado(mpCfg.slots_base, mpNodo);
        if (mpUsados >= mpTotales)
          return res.status(409).json({ ok: false, error: 'SIN_SLOTS', slots_totales: mpTotales, slots_usados: mpUsados });

        // Descuento atomico del inventario (409 si no alcanza). Aplica a
        // ambos origenes: la produccion tambien deposita en el inventario
        // (mercado_producir), asi que ofertarla lo descuenta (anti-dupe).
        var mpOkInv = await descontarInventario(sql, mpUid, String(mpCons[0].clave), mpCant);
        if (!mpOkInv)
          return res.status(409).json({ ok: false, error: 'INVENTARIO_INSUFICIENTE' });

        var mpHoras = parseInt(mpCfg.duracion_oferta_horas, 10);
        if (!isFinite(mpHoras) || mpHoras < 1) mpHoras = 24;
        var mpOf;
        try {
          mpOf = await sql(
            'INSERT INTO mercado_ofertas (vendedor_id, casa, consumible_id, cantidad,'
            + ' cantidad_restante, precio_unitario, origen, estado, expira_en)'
            + ' VALUES ($1::uuid,$2,$3::uuid,$4::int,$4::int,$5::numeric,$6,\'activa\','
            + ' NOW() + ($7::int * INTERVAL \'1 hour\'))'
            + ' RETURNING id, expira_en',
            [mpUid, mpCasa, mpCons[0].id, mpCant, mpPrecio, mpOrigen, mpHoras]
          );
        } catch (eMpI) {
          // Si el INSERT falla, devolver las unidades ya descontadas.
          await acreditarInventario(sql, mpUid, String(mpCons[0].clave), mpCant)
            .catch(function(eRev) { console.warn('[mercado] reversion de inventario fallida: ' + (eRev && eRev.message)); });
          if (esEsquemaFaltante(eMpI)) return responderMercadoAusente(res, eMpI, 'mercado_ofertas');
          if (eMpI && (eMpI.code === '23503' || eMpI.code === '23514' || eMpI.code === '22P02'))
            return res.status(400).json({ ok: false, error: 'OFERTA_INVALIDA' });
          throw eMpI;
        }
        return res.status(200).json({
          ok: true, oferta_id: mpOf[0].id, expira_en: mpOf[0].expira_en,
          origen: mpOrigen, cantidad: mpCant, precio_unitario: red2(mpPrecio)
        });
      }

      // Comprar una oferta: operacion atomica en UNA sentencia con CTEs de
      // modificacion (el driver neon HTTP no mantiene transacciones
      // interactivas; un solo statement es atomico). Descuenta XP del
      // comprador, acredita neto al vendedor + mercado_puntos, hace merge
      // del inventario (ADR-003), baja cantidad_restante y registra la venta.
      if (tipo2 === 'mercado_comprar') {
        var mqSes = usuarioDeSesion(req);
        if (!mqSes.ok) return responderSesion(res, mqSes.razon);
        var mqUid = mqSes.usuario_id;
        var mqId = String(body.oferta_id || '').trim();
        if (!mqId)
          return res.status(400).json({ ok: false, error: 'oferta_id requerido' });
        if (!MERCADO_UUID_RE.test(mqId))
          return res.status(400).json({ ok: false, error: 'oferta_id invalido' });
        var mqCant = parseInt(body.cantidad, 10);
        if (!isFinite(mqCant) || mqCant < 1) mqCant = 1;
        if (mqCant > 999) mqCant = 999;

        var mqOf, mqUsr, mqVend, mqCfg;
        try {
          mqOf = await sql(
            'SELECT o.id, o.vendedor_id, o.casa, o.consumible_id, o.cantidad_restante,'
            + ' o.precio_unitario, o.estado, o.expira_en, c.clave'
            + ' FROM mercado_ofertas o'
            + ' LEFT JOIN consumibles c ON c.id = o.consumible_id'
            + ' WHERE o.id=$1::uuid LIMIT 1',
            [mqId]
          );
          if (!mqOf.length)
            return res.status(404).json({ ok: false, error: 'OFERTA_NO_ENCONTRADA' });
          if (String(mqOf[0].vendedor_id) === mqUid)
            return res.status(403).json({ ok: false, error: 'AUTOCOMPRA_PROHIBIDA' });
          if (mqOf[0].estado !== 'activa' || !mqOf[0].expira_en
              || new Date(mqOf[0].expira_en).getTime() <= Date.now())
            return res.status(409).json({ ok: false, error: 'OFERTA_NO_DISPONIBLE' });
          if (numXp(mqOf[0].cantidad_restante) < mqCant)
            return res.status(409).json({ ok: false, error: 'CANTIDAD_INSUFICIENTE' });
          // Anti-farming: tope de 20 compras por comprador en 24h.
          var mqCount = await sql(
            "SELECT COUNT(*)::int AS n FROM mercado_ventas WHERE comprador_id=$1::uuid"
            + " AND creado_en > NOW() - INTERVAL '24 hours'",
            [mqUid]
          );
          if ((mqCount[0] && Number(mqCount[0].n)) >= 20)
            return res.status(429).json({ ok: false, error: 'LIMITE_COMPRAS_24H' });
          mqUsr = await sql(
            'SELECT casa, xp_total FROM usuarios WHERE id=$1::uuid LIMIT 1',
            [mqUid]
          );
          mqVend = await sql(
            'SELECT mercado_puntos, xp_total FROM usuarios WHERE id=$1::uuid LIMIT 1',
            [mqOf[0].vendedor_id]
          );
          mqCfg = await cargarConfigMercado(sql, String(mqOf[0].casa || '').toLowerCase());
        } catch (eMq) {
          if (!esEsquemaFaltante(eMq)) throw eMq;
          return responderMercadoAusente(res, eMq, 'mercado_comprar');
        }
        if (!mqUsr.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });
        if (!mqVend.length)
          return res.status(404).json({ ok: false, error: 'Vendedor no encontrado' });
        if (!mqCfg)
          return responderMercadoAusente(res, { message: 'mercado_config sin fila' }, 'mercado_config');

        var mqCasa = String(mqOf[0].casa || '').toLowerCase();
        var mqCross = String(mqUsr[0].casa || '').toLowerCase() !== mqCasa;
        if (mqCross && mqCfg.permite_cross_casa !== true)
          return res.status(403).json({ ok: false, error: 'CROSS_CASA_NO_PERMITIDO' });

        var mqNodoVend = calcularMercadoEfectivo(
          numXp(mqVend[0].mercado_puntos),
          calcularNivelLocal(numXp(mqVend[0].xp_total)).nivel
        );
        var mqImpPct = impuestoEfectivoMercado(mqCfg.impuesto_base_pct, mqNodoVend);
        var mqAraPct = mqCross ? numXp(mqCfg.arancel_inter_casa_pct) : 0;
        var mqPrecio = numXp(mqOf[0].precio_unitario);
        var mqSubtotal = red2(mqPrecio * mqCant);
        var mqImpXp = red2(mqSubtotal * mqImpPct);
        var mqAraXp = red2(mqSubtotal * mqAraPct);
        var mqNeto = red2(Math.max(0, mqSubtotal - mqImpXp - mqAraXp));
        var mqPuntosVend = red2(mqNeto / 10);
        var mqClave = String(mqOf[0].clave || '');

        var mqRes;
        try {
          mqRes = await sql(
            'WITH ok_oferta AS ('
            + ' SELECT id FROM mercado_ofertas WHERE id=$1::uuid AND estado=\'activa\''
            + ' AND expira_en > NOW() AND cantidad_restante >= $2::int'
            + '), ok_xp AS ('
            + ' SELECT id FROM usuarios WHERE id=$3::uuid AND xp_total >= $4::numeric'
            + '), debit AS ('
            + ' UPDATE usuarios SET xp_total = xp_total - $4::numeric,'
            + ' capacidades = COALESCE(capacidades,\'{}\'::jsonb)'
            + '  || jsonb_build_object(\'consumibles\', COALESCE(capacidades->\'consumibles\',\'{}\'::jsonb)'
            + '  || jsonb_build_object($5::text, COALESCE((capacidades->\'consumibles\'->>$5::text)::int,0) + $2::int))'
            + ' WHERE id=$3::uuid AND xp_total >= $4::numeric'
            + '  AND EXISTS(SELECT 1 FROM ok_oferta) RETURNING xp_total'
            + '), dec AS ('
            + ' UPDATE mercado_ofertas SET cantidad_restante = cantidad_restante - $2::int,'
            + '  estado = CASE WHEN cantidad_restante - $2::int <= 0 THEN \'agotada\' ELSE estado END'
            + ' WHERE id=$1::uuid AND EXISTS(SELECT 1 FROM debit) RETURNING cantidad_restante'
            + '), cred AS ('
            + ' UPDATE usuarios SET xp_total = xp_total + $6::numeric,'
            + '  mercado_puntos = COALESCE(mercado_puntos,0) + $7::numeric'
            + ' WHERE id=$8::uuid AND EXISTS(SELECT 1 FROM debit) RETURNING id'
            + '), venta AS ('
            + ' INSERT INTO mercado_ventas (oferta_id, comprador_id, vendedor_id,'
            + '  consumible_id, casa, es_cross_casa, cantidad, precio_unitario, subtotal_xp,'
            + '  impuesto_pct, impuesto_xp, arancel_pct, arancel_xp, neto_vendedor_xp, creado_en)'
            + ' SELECT $1::uuid, $3::uuid, $8::uuid, $9::uuid, $10::text, $11::boolean,'
            + '  $2::int, $12::numeric, $4::numeric, $13::numeric, $14::numeric,'
            + '  $15::numeric, $16::numeric, $6::numeric, NOW()'
            + ' FROM ok_oferta WHERE EXISTS(SELECT 1 FROM debit) RETURNING id'
            + ')'
            + ' SELECT EXISTS(SELECT 1 FROM ok_oferta) AS oferta_ok,'
            + ' EXISTS(SELECT 1 FROM ok_xp) AS xp_ok,'
            + ' (SELECT xp_total FROM debit) AS comprador_xp,'
            + ' (SELECT cantidad_restante FROM dec) AS cantidad_restante,'
            + ' (SELECT id::text FROM venta) AS venta_id',
            [mqId, mqCant, mqUid, mqSubtotal, mqClave, mqNeto, mqPuntosVend,
             mqOf[0].vendedor_id, mqOf[0].consumible_id, mqCasa, mqCross,
             mqPrecio, mqImpPct, mqImpXp, mqAraPct, mqAraXp]
          );
        } catch (eMqX) {
          if (eMqX && eMqX.code === '23514') return res.status(409).json({ ok: false, error: 'OFERTA_NO_DISPONIBLE' });
          if (!esEsquemaFaltante(eMqX)) throw eMqX;
          return responderMercadoAusente(res, eMqX, 'mercado_ventas');
        }
        var mqR = mqRes[0] || {};
        if (mqR.oferta_ok !== true)
          return res.status(409).json({ ok: false, error: 'OFERTA_NO_DISPONIBLE' });
        if (mqR.xp_ok !== true)
          return res.status(409).json({ ok: false, error: 'XP_INSUFICIENTE', subtotal_xp: mqSubtotal });

        // Ledger best-effort: gasto del comprador (negativo, exento) y
        // acreditacion del vendedor (positivo, exento).
        await registrarXpLedger(sql, {
          usuario_id: mqUid, accion: 'mercado_compra', xp_base: mqSubtotal,
          mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'ninguno',
          bonos_planos: 0, xp_final: red2(-mqSubtotal), es_exento: true,
          contexto: { oferta_id: mqId, vendedor_id: mqOf[0].vendedor_id, consumible: mqClave, cantidad: mqCant }
        });
        await registrarXpLedger(sql, {
          usuario_id: mqOf[0].vendedor_id, accion: 'mercado_venta', xp_base: mqSubtotal,
          mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'ninguno',
          bonos_planos: 0, xp_final: mqNeto, es_exento: true,
          contexto: { oferta_id: mqId, comprador_id: mqUid, consumible: mqClave, cantidad: mqCant }
        });

        return res.status(200).json({
          ok: true,
          venta_id: mqR.venta_id,
          cantidad: mqCant,
          subtotal_xp: mqSubtotal,
          impuesto_pct: mqImpPct,
          impuesto_xp: mqImpXp,
          arancel_pct: mqAraPct,
          arancel_xp: mqAraXp,
          neto_vendedor_xp: mqNeto,
          mercado_puntos_vendedor: mqPuntosVend,
          es_cross_casa: mqCross,
          cantidad_restante: Number(mqR.cantidad_restante),
          xp_total_nuevo: red2(numXp(mqR.comprador_xp))
        });
      }

      // Cancelar una oferta propia; si era de inventario y quedaba stock,
      // se devuelve al inventario del vendedor (Cero Borrado Logico).
      if (tipo2 === 'mercado_cancelar') {
        var mzSes = usuarioDeSesion(req);
        if (!mzSes.ok) return responderSesion(res, mzSes.razon);
        var mzUid = mzSes.usuario_id;
        var mzId = String(body.oferta_id || '').trim();
        if (!mzId)
          return res.status(400).json({ ok: false, error: 'oferta_id requerido' });
        if (!MERCADO_UUID_RE.test(mzId))
          return res.status(400).json({ ok: false, error: 'oferta_id invalido' });
        var mzRows;
        try {
          mzRows = await sql(
            'SELECT o.id, o.vendedor_id, o.origen, o.cantidad_restante, o.estado, c.clave'
            + ' FROM mercado_ofertas o'
            + ' LEFT JOIN consumibles c ON c.id = o.consumible_id'
            + ' WHERE o.id=$1::uuid LIMIT 1',
            [mzId]
          );
        } catch (eMz) {
          if (!esEsquemaFaltante(eMz)) throw eMz;
          return responderMercadoAusente(res, eMz, 'mercado_ofertas');
        }
        if (!mzRows.length)
          return res.status(404).json({ ok: false, error: 'OFERTA_NO_ENCONTRADA' });
        if (String(mzRows[0].vendedor_id) !== mzUid)
          return res.status(403).json({ ok: false, error: 'NO_ES_TU_OFERTA' });
        if (mzRows[0].estado !== 'activa')
          return res.status(409).json({ ok: false, error: 'OFERTA_NO_ACTIVA' });
        var mzUpd = await sql(
          'UPDATE mercado_ofertas SET estado=\'cancelada\''
          + ' WHERE id=$1::uuid AND vendedor_id=$2::uuid AND estado=\'activa\' RETURNING id',
          [mzId, mzUid]
        );
        if (!mzUpd.length)
          return res.status(409).json({ ok: false, error: 'OFERTA_NO_ACTIVA' });
        var mzDevueltas = 0;
        if (String(mzRows[0].origen) === 'inventario') {
          mzDevueltas = parseInt(mzRows[0].cantidad_restante, 10) || 0;
          if (mzDevueltas > 0) {
            await acreditarInventario(sql, mzUid, String(mzRows[0].clave || ''), mzDevueltas)
              .catch(function(eMzR) { console.warn('[mercado] devolucion de inventario fallida: ' + (eMzR && eMzR.message)); });
          }
        }
        return res.status(200).json({ ok: true, oferta_id: mzId, devueltas: mzDevueltas });
      }

      // Producir un consumible producible: consume XP (precio_xp_base x
      // cantidad) y deposita las unidades en el inventario. Exige nodo >= 3.
      if (tipo2 === 'mercado_producir') {
        var mrSes = usuarioDeSesion(req);
        if (!mrSes.ok) return responderSesion(res, mrSes.razon);
        var mrUid = mrSes.usuario_id;
        var mrRef = String(body.consumible_id || body.clave || '').trim();
        if (!mrRef)
          return res.status(400).json({ ok: false, error: 'consumible_id requerido' });
        var mrCant = parseInt(body.cantidad, 10);
        if (!isFinite(mrCant) || mrCant < 1) mrCant = 1;
        if (mrCant > 10) mrCant = 10;

        var mrUsr, mrCons, mrCfg;
        try {
          mrUsr = await sql(
            'SELECT casa, xp_total, mercado_puntos FROM usuarios WHERE id=$1::uuid LIMIT 1',
            [mrUid]
          );
          mrCfg = await cargarConfigMercado(sql, String((mrUsr[0] || {}).casa || '').toLowerCase());
          mrCons = await sql(
            'SELECT id, clave, nombre, precio_xp_base FROM consumibles'
            + ' WHERE (clave=$1 OR id::text=$1) AND activo=true'
            + ' AND tipo_canje=\'producir\' LIMIT 1',
            [mrRef]
          );
        } catch (eMr) {
          if (!esEsquemaFaltante(eMr)) throw eMr;
          return responderMercadoAusente(res, eMr, 'mercado_producir');
        }
        if (!mrUsr.length)
          return res.status(404).json({ ok: false, error: 'No encontrado' });
        var mrCasa = String(mrUsr[0].casa || '').toLowerCase();
        if (MERCADO_CASAS.indexOf(mrCasa) === -1)
          return res.status(403).json({ ok: false, error: 'CASA_REQUERIDA' });
        var mrNodo = calcularMercadoEfectivo(
          numXp(mrUsr[0].mercado_puntos),
          calcularNivelLocal(numXp(mrUsr[0].xp_total)).nivel
        );
        if (!nodoMercado(mrNodo).produce)
          return res.status(403).json({ ok: false, error: 'NODO_INSUFICIENTE' });
        if (!mrCfg || mrCfg.activo !== true)
          return res.status(403).json({ ok: false, error: 'MERCADO_INACTIVO' });
        if (mrCfg.permite_produccion !== true)
          return res.status(403).json({ ok: false, error: 'PRODUCCION_DESHABILITADA' });
        if (!mrCons.length)
          return res.status(404).json({ ok: false, error: 'CONSUMIBLE_NO_PRODUCIBLE' });

        var mrCosto = red2(numXp(mrCons[0].precio_xp_base) * mrCant);
        var mrUpd = await sql(
          'UPDATE usuarios SET xp_total = xp_total - $1::numeric'
          + ' WHERE id=$2::uuid AND xp_total >= $1::numeric RETURNING xp_total',
          [mrCosto, mrUid]
        );
        if (!mrUpd.length)
          return res.status(409).json({ ok: false, error: 'XP_INSUFICIENTE', costo_xp: mrCosto });
        await acreditarInventario(sql, mrUid, String(mrCons[0].clave), mrCant);
        await registrarXpLedger(sql, {
          usuario_id: mrUid, accion: 'mercado_producir', xp_base: mrCosto,
          mult_nivel: 1, mult_stack: 1, mult_final: 1, cap_aplicado: 'ninguno',
          bonos_planos: 0, xp_final: red2(-mrCosto), es_exento: true,
          contexto: { consumible: String(mrCons[0].clave), cantidad: mrCant }
        });
        return res.status(200).json({
          ok: true, consumible: String(mrCons[0].clave), cantidad: mrCant,
          costo_xp: mrCosto, xp_total_nuevo: red2(numXp(mrUpd[0].xp_total))
        });
      }

      // Fase 2: registrar autor de una publicacion (verifica sesion del
      // usuario y devuelve su id para que publicar-lugar.js lo guarde en
      // tags.autor_id). No otorga XP aqui.
      if (tipo2 === 'publicar_lugar_registrar') {
        var sesReg = verificarSesion(req);
        if (!sesReg || !sesReg.sub) return responderSesion(res, 'SESION_REQUERIDA');
        return res.status(200).json({ ok: true, data: { autor_id: String(sesReg.sub) } });
      }

      // Fase 2: otorgar XP al autor cuando el admin APRUEBA el lugar
      // (status='published'). Autorizado con ADMIN_SECRET (server-to-server
      // desde admin.js). Idempotente via tags.pub_xp_estado.
      if (tipo2 === 'publicar_lugar_otorgar') {
        var admSecretPub = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
        if (admSecretPub !== (process.env.ADMIN_SECRET || 'exploraco12345'))
          return res.status(401).json({ ok: false, error: 'No autorizado' });
        if (!destinoId2) return res.status(400).json({ ok: false, error: 'destino_id requerido' });
        var filasPub = await sql('SELECT tags, nombre FROM destinos WHERE id=$1', [destinoId2]);
        if (!filasPub.length) return res.status(404).json({ ok: false, error: 'Destino no encontrado' });
        var tagsPub = filasPub[0].tags || {};
        var autorPub = tagsPub.autor_id;
        if (!autorPub) return res.status(200).json({ ok: true, otorgado: false, motivo: 'sin_autor' });
        if (tagsPub.pub_xp_estado === 'otorgado')
          return res.status(200).json({ ok: true, otorgado: false, motivo: 'ya_otorgado' });
        // Claim idempotente: solo el primero que cambia el estado otorga XP.
        var claimPub = await sql(
          'UPDATE destinos SET tags = COALESCE(tags, \'{}\'::jsonb) || $2::jsonb '
          + 'WHERE id=$1 AND COALESCE(tags->>\'pub_xp_estado\', \'\') <> \'otorgado\' RETURNING id',
          [destinoId2, JSON.stringify({ pub_xp_estado: 'otorgado' })]
        );
        if (!claimPub.length) return res.status(200).json({ ok: true, otorgado: false, motivo: 'ya_otorgado' });
        var tierPub = String(tagsPub.pub_tier || 'basico');
        var baseKeyPub = 'publicar_' + tierPub;
        if (XP_BASES[baseKeyPub] === undefined) baseKeyPub = 'publicar_basico';
        var xpBasePub = numXp(XP_BASES[baseKeyPub]);
        var bonoGeoPub = tagsPub.pub_geo ? numXp(XP_BASES.publicar_bono_geo) : 0;
        var bonoFotoPub = tagsPub.pub_foto ? numXp(XP_BASES.publicar_bono_foto) : 0;
        var ctxPub = await contextoXpE(sql, autorPub);
        var resPub = await calcularXpAcreditado(sql, xpBasePub, ctxPub.nivel_clase,
          ctxPub.clase_id, ctxPub.tag, { nivel_usuario: ctxPub.nivel_usuario });
        var xpTotalPub = red2(resPub.xp_final + bonoGeoPub + bonoFotoPub);
        // Acreditacion con rollback del claim: si algo falla, el estado
        // vuelve a 'pendiente' para permitir reintento (idempotencia real).
        try {
          await sql('UPDATE usuarios SET xp_total=xp_total+$1 WHERE id=$2', [xpTotalPub, autorPub]);
          await acreditarClaseYCofre(sql, autorPub, ctxPub, xpTotalPub);
          await registrarXpLedger(sql, {
            usuario_id: autorPub, accion: 'publicar_lugar', xp_base: xpBasePub,
            mult_nivel: resPub.m_nivel, mult_stack: resPub.mult_stack,
            mult_final: resPub.mult_global_c, cap_aplicado: resPub.cap_aplicado,
            bonos_planos: red2(bonoGeoPub + bonoFotoPub), xp_final: xpTotalPub,
            contexto: { destino_id: destinoId2, tier: tierPub, geo: !!tagsPub.pub_geo, foto: !!tagsPub.pub_foto }
          });
          await repartirXpReferidos(sql, autorPub, xpTotalPub);
        } catch (eOtorgaXp) {
          await sql(
            'UPDATE destinos SET tags = COALESCE(tags, \'{}\'::jsonb) || $2::jsonb WHERE id=$1',
            [destinoId2, JSON.stringify({ pub_xp_estado: 'pendiente' })]
          ).catch(function(eRoll) { console.warn('[publicar_lugar] rollback estado fallo: ' + (eRoll && eRoll.message)); });
          console.warn('[publicar_lugar] acreditacion fallo, estado revertido: ' + (eOtorgaXp && eOtorgaXp.message));
          return res.status(500).json({ ok: false, error: 'XP no acreditado, reintentable' });
        }
        return res.status(200).json({ ok: true, otorgado: true, xp: xpTotalPub, autor_id: autorPub, tier: tierPub });
      }

      if (!tipo2 || !destinoId2)
        return res.status(400).json({ ok: false, error: 'tipo y destino_id son requeridos' });

      // Validar tipo contra constraint real. Se incluyen los tipos
      // 'quitar_*' que no insertan filas (hacen UPDATE/DELETE sobre
      // filas existentes) y por tanto no chocan con el CHECK de la
      // columna tipo -- antes faltaban y el POST los rechazaba con 400,
      // dejando 'quitar_guardado' inalcanzable desde el frontend.
      var tiposValidos = ['resena','guardado','quitar_guardado','visita','quitar_visita','foto','rating'];
      if (!tiposValidos.includes(tipo2))
        return res.status(400).json({ ok: false, error: 'tipo inv\u00e1lido: ' + tipo2 });

      // -- Resena --
      if (tipo2 === 'resena') {
        var ratingVal = parseInt(body.rating || body.puntuacion || 0);
        if (ratingVal < 1 || ratingVal > 5)
          return res.status(400).json({ ok: false, error: 'rating debe ser entre 1 y 5' });

        // Un usuario identificado solo puede calificar un destino una vez,
        // ya sea con resena (texto) o con voto rapido sin texto (TSK-015).
        // (BUG de fraude: antes se podian repetir resenas y sumar XP sin
        // limite). Si usuario_id es null (resena anonima, caso actual de
        // produccion en pagina-destino.js) no hay como deduplicar todavia
        // -- queda cubierto cuando se conecte la sesion real ahi.
        if (usuarioId2) {
          var yaReseno = await sql(
            'SELECT rating, tipo FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 '
            + 'AND tipo IN (\'resena\',\'rating\') LIMIT 1',
            [destinoId2, usuarioId2]
          );
          if (yaReseno.length > 0)
            return res.status(409).json({
              ok: false,
              error: 'Ya calificaste este lugar',
              ya_reseno: true,
              ya_votado: true,
              voto_previo: { rating: yaReseno[0].rating, tipo: yaReseno[0].tipo }
            });
        }

        // usuario_nombre no existe en la tabla -> guardarlo en texto como prefijo
        var nombrePrefijo = body.usuario_nombre
          ? '[' + body.usuario_nombre.slice(0,50) + '] '
          : '';
        var textoFinal = body.texto
          ? (nombrePrefijo + body.texto).slice(0, 2000)
          : (body.usuario_nombre ? nombrePrefijo.trim() : null);

        // Dimensiones (puntuaciones por categoria, JSONB) y tipo de viajero
        var dimsFinal = {};
        if (body.dims && typeof body.dims === 'object' && !Array.isArray(body.dims)) {
          Object.keys(body.dims).forEach(function(k) {
            var v = parseInt(body.dims[k], 10);
            if (v >= 1 && v <= 5) dimsFinal[k] = v;
          });
        }
        var travTypeFinal = body.traveller_type
          ? String(body.traveller_type).slice(0, 30)
          : null;

        var xpGanado = textoFinal && textoFinal.replace(nombrePrefijo,'').trim().length > 50
          ? XP_BASES.resena_larga : XP_BASES.resena_corta;

        var result = await sql(
          'INSERT INTO interacciones '
          + '(destino_id, usuario_id, tipo, rating, texto, dims, traveller_type, xp_ganado, creado_en) '
          + 'VALUES ($1, $2, \'resena\', $3, $4, $5, $6, $7, NOW()) '
          + 'RETURNING id',
          [destinoId2, usuarioId2, ratingVal, textoFinal, dimsFinal, travTypeFinal, xpGanado]
        );

        // Actualizar rating promedio y total_resenas en destinos.
        // Ambos se recalcularon sobre resena+rating para que el contador
        // no quede desfasado del promedio (v5, TSK-015).
        await sql(
          'UPDATE destinos SET '
          + 'rating = ('
          + '  SELECT ROUND(AVG(rating)::numeric, 2)'
          + '  FROM interacciones'
          + '  WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\') AND rating IS NOT NULL'
          + '), '
          + 'total_resenas = ('
          + '  SELECT COUNT(*) FROM interacciones'
          + '  WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\')'
          + '), '
          + 'actualizado_en = NOW() '
          + 'WHERE id = $1',
          [destinoId2]
        );

        // Sumar XP al usuario si esta logueado
        var misionesNuevas = [];
        var logrosNuevas = [];
        var xpResenaEntregado = xpGanado;
        var amuletoResena = { doubled: false };
        var resResena = null;
        var detalleResena = null;
        var cromoResena = null;
        if (usuarioId2) {
          var ctxResena = await contextoXpE(sql, usuarioId2);
          // ADR-018: amuleto_x2 y lider de ciudad entran al STACK del punto
          // unico (no multiplican por fuera). La fila de interacciones
          // conserva la BASE (xpGanado) para no romper mis_primera_resena
          // (xp_ganado >= 25 con resena_larga = 30).
          amuletoResena = await aplicarAmuletoX2(sql, usuarioId2, xpGanado);
          var liderResena = await esLiderDestino(sql, usuarioId2, destinoId2);
          resResena = await calcularXpAcreditado(sql, xpGanado, ctxResena.nivel_clase,
            ctxResena.clase_id, ctxResena.tag,
            { nivel_usuario: ctxResena.nivel_usuario, amuleto: amuletoResena.doubled, lider: liderResena });
          xpResenaEntregado = resResena.xp_final;
          detalleResena = armarXpDetalle(xpGanado, resResena, 0);
          await sql(
            'UPDATE usuarios SET '
            + 'xp_total = xp_total + $1, '
            + 'total_resenas = total_resenas + 1, '
            + 'ultimo_acceso = NOW() '
            + 'WHERE id = $2',
            [xpResenaEntregado, usuarioId2]
          ).catch(function(){});
          await acreditarClaseYCofre(sql, usuarioId2, ctxResena, xpResenaEntregado);
          await avanzarMisionesCasa(sql, usuarioId2, 'resenas', 1);
          await registrarXpLedger(sql, {
            usuario_id: usuarioId2,
            accion: xpGanado === XP_BASES.resena_larga ? 'resena_larga' : 'resena_corta',
            xp_base: xpGanado, mult_nivel: resResena.m_nivel, mult_stack: resResena.mult_stack,
            mult_final: resResena.mult_global_c, cap_aplicado: resResena.cap_aplicado,
            xp_final: xpResenaEntregado, contexto: { destino_id: destinoId2 }
          });
          misionesNuevas = await evaluarMisiones(sql, usuarioId2);
          logrosNuevas = await evaluarLogros(sql, usuarioId2);
          // v9 (ADR-018): chance de cromo (15%) y aporte de fama a la
          // pandilla activa (10% del XP entregado, no bloquean).
          cromoResena = await intentarObtenerCromo(sql, usuarioId2, destinoId2);
          await aplicarFamaPandilla(sql, usuarioId2, xpResenaEntregado);
          // v13: reparto multinivel del XP ganado (no bloquea).
          await repartirXpReferidos(sql, usuarioId2, xpResenaEntregado);
          // v9 contrato final (punto 8): progreso de retos de parche.
          var retoResena = await progresarPandillaRetos(sql, usuarioId2, 'resena');
        } else {
          var retoResena = null;
        }

        // Notificar al admin (no bloquea la respuesta)
        try {
          var destinoInfo = await sql(
            'SELECT nombre, ciudad, slug FROM destinos WHERE id=$1 LIMIT 1',
            [destinoId2]
          );
          if (destinoInfo.length > 0) {
            fetch(
              (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://exploraco.vercel.app')
              + '/api/notificaciones',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Internal-Secret': process.env.ADMIN_SECRET || 'exploraco12345',
                },
                body: JSON.stringify({
                  tipo:            'resena',
                  rating:          ratingVal,
                  texto:           textoFinal,
                  usuario_nombre:  body.usuario_nombre || 'Visitante',
                  destino_nombre:  destinoInfo[0].nombre,
                  destino_ciudad:  destinoInfo[0].ciudad,
                  destino_slug:    destinoInfo[0].slug,
                }),
              }
            ).catch(function() {}); // fire & forget
          }
        } catch(_) {}

        return res.status(200).json({ ok: true, id: result[0].id, xp: xpResenaEntregado, xp_detalle: detalleResena || undefined, misiones: misionesNuevas, logros: logrosNuevas, cromo: cromoResena || undefined, amuleto_x2: amuletoResena.doubled || undefined, reto_completado: retoResena || null });
      }

      // -- Guardado --
      if (tipo2 === 'guardado') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido para guardar' });

        // Verificar si ya existe (activo o previamente quitado). Se
        // guarda 'activo' junto con el id para poder distinguir un
        // guardado vigente de uno reactivable sin una segunda consulta.
        var existe = await sql(
          'SELECT id, activo FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'guardado\' LIMIT 1',
          [destinoId2, usuarioId2]
        );

        if (existe.length > 0 && existe[0].activo)
          return res.status(200).json({ ok: true, ya_guardado: true, misiones: [], logros: [] });

        if (existe.length > 0 && !existe[0].activo) {
          // Reactivar un guardado previamente quitado. Cero Borrado
          // Logico (Reglas de Oro punto 3): se reactiva la fila original
          // en vez de insertar una nueva, y no se otorga XP de nuevo
          // (evita el ciclo guardar/quitar/guardar para granjear XP).
          await sql(
            'UPDATE interacciones SET activo=true WHERE id=$1',
            [existe[0].id]
          );
          return res.status(200).json({ ok: true, reactivado: true, xp: 0, misiones: [], logros: [] });
        }

        var xpGuardado = XP_BASES.guardado;
        await sql(
          'INSERT INTO interacciones (destino_id, usuario_id, tipo, xp_ganado, creado_en) VALUES ($1, $2, \'guardado\', $3, NOW())',
          [destinoId2, usuarioId2, xpGuardado]
        );

        // total_guardados queda como contador historico (nunca baja al
        // quitar), igual que el patron ya usado por el motor de puntos
        // local en index.html (userPoints.saved via Math.max()). Sirve
        // como base fiable para futuras insignias/misiones ("guardaste
        // 5 lugares alguna vez"), sin depender del estado activo actual.
        var ctxGuardado = await contextoXpE(sql, usuarioId2);
        // v9 (ADR-018): amuleto_x2 y lider de ciudad entran al STACK del
        // punto unico (no multiplican por fuera).
        var amuletoGuardado = await aplicarAmuletoX2(sql, usuarioId2, xpGuardado);
        var liderGuardado = await esLiderDestino(sql, usuarioId2, destinoId2);
        var resGuardado = await calcularXpAcreditado(sql, xpGuardado, ctxGuardado.nivel_clase,
          ctxGuardado.clase_id, ctxGuardado.tag,
          { nivel_usuario: ctxGuardado.nivel_usuario, amuleto: amuletoGuardado.doubled, lider: liderGuardado });
        var xpGuardadoFinal = resGuardado.xp_final;
        await sql(
          'UPDATE usuarios SET xp_total=xp_total+$1, total_guardados=total_guardados+1 WHERE id=$2',
          [xpGuardadoFinal, usuarioId2]
        ).catch(function(){});
        await acreditarClaseYCofre(sql, usuarioId2, ctxGuardado, xpGuardadoFinal);
        await registrarXpLedger(sql, {
          usuario_id: usuarioId2, accion: 'guardado', xp_base: xpGuardado,
          mult_nivel: resGuardado.m_nivel, mult_stack: resGuardado.mult_stack,
          mult_final: resGuardado.mult_global_c, cap_aplicado: resGuardado.cap_aplicado,
          xp_final: xpGuardadoFinal, contexto: { destino_id: destinoId2 }
        });

        var misionesGuardado = await evaluarMisiones(sql, usuarioId2);
        var logrosGuardado = await evaluarLogros(sql, usuarioId2);
        // v9 (ADR-018): chance de cromo + aporte de fama a la pandilla.
        var cromoGuardado = await intentarObtenerCromo(sql, usuarioId2, destinoId2);
        await aplicarFamaPandilla(sql, usuarioId2, xpGuardadoFinal);
        // v13: reparto multinivel del XP ganado (no bloquea).
        await repartirXpReferidos(sql, usuarioId2, xpGuardadoFinal);
        // v9 contrato final (punto 8): progreso de retos de parche.
        var retoGuardado = await progresarPandillaRetos(sql, usuarioId2, 'guardado');
        return res.status(200).json({ ok: true, xp: xpGuardadoFinal, xp_detalle: armarXpDetalle(xpGuardado, resGuardado, 0), misiones: misionesGuardado, logros: logrosGuardado, cromo: cromoGuardado || undefined, amuleto_x2: amuletoGuardado.doubled || undefined, reto_completado: retoGuardado || null });
      }

      // -- Quitar guardado --
      if (tipo2 === 'quitar_guardado') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });

        // Cero Borrado Logico (Reglas de Oro punto 3): se desactiva la
        // fila, nunca se borra. Antes esto era un DELETE, lo que permitia
        // un ciclo guardar/quitar/guardar para ganar XP sin limite -- ver
        // el bloque 'guardado' arriba, que ahora reactiva en vez de
        // re-insertar y no vuelve a pagar XP.
        await sql(
          'UPDATE interacciones SET activo=false WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'guardado\' AND activo=true',
          [destinoId2, usuarioId2]
        );
        return res.status(200).json({ ok: true });
      }

      // -- Visita (Presencia Fisica v4.0, ADR-024) --
      // Exige presencia fisica server-side: Haversine contra el destino,
      // precision GPS, anti-farming (cooldown, velocidad y tope diario),
      // dedup idempotente y bono rural plano (no multiplicable).
      if (tipo2 === 'visita') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido para marcar visita' });

        // v13 (Entrega 016 / ADR-025): la geolocalizacion exige sesion
        // firmada (JWT) y nonce de un solo uso emitido por
        // geo_nonce_solicitar. El nonce se consume ANTES del dedup y de
        // la geocerca; si la migracion 016 falta, el 42P01 sube al catch
        // tipificado (503).
        var svVisita = validarSesion(req, usuarioId2);
        if (!svVisita.ok) return responderSesion(res, svVisita.razon);
        var nonceVisita = String(body.nonce || '');
        if (!nonceVisita)
          return res.status(400).json({ ok: false, error: 'NONCE_REQUERIDO' });
        var nonceVisitaOk = await consumirNonce(sql, nonceVisita, usuarioId2);
        if (!nonceVisitaOk)
          return res.status(400).json({ ok: false, error: 'NONCE_INVALIDO' });

        // 3) Dedup primero: detecta CUALQUIER fila, activa o no.
        var yaVisitado = await sql(
          'SELECT id, activo FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'visita\' LIMIT 1',
          [destinoId2, usuarioId2]
        );
        if (yaVisitado.length > 0 && yaVisitado[0].activo)
          return res.status(200).json({ ok: true, ya_visitado: true, xp: 0, misiones: [], logros: [] });
        if (yaVisitado.length > 0 && !yaVisitado[0].activo) {
          await sql('UPDATE interacciones SET activo=true WHERE id=$1', [yaVisitado[0].id]);
          return res.status(200).json({ ok: true, reactivado: true, xp: 0, misiones: [], logros: [] });
        }

        // 4) Destino real.
        var destVisita = await sql(
          'SELECT id, lat, lng, categoria_slug, tags, nombre, radio_m FROM destinos WHERE id=$1',
          [destinoId2]
        );
        if (!destVisita.length)
          return res.status(404).json({ ok: false, error: 'Destino no encontrado', code: 'DESTINO_NO_ENCONTRADO' });
        destVisita = destVisita[0];

        // 5) El blog no admite presencia fisica.
        if (destVisita.categoria_slug === 'blog')
          return res.status(400).json({ ok: false, error: 'No se puede confirmar presencia fisica en el blog', code: 'VISITA_NO_PERMITIDA' });

        // 6) Coordenadas del usuario.
        if (body.lat === undefined || body.lat === null || body.lng === undefined || body.lng === null)
          return res.status(400).json({ ok: false, error: 'lat y lng son requeridos', code: 'COORDENADAS_REQUERIDAS' });
        var uLatV = parseFloat(body.lat);
        var uLngV = parseFloat(body.lng);
        if (!isFinite(uLatV) || !isFinite(uLngV) || uLatV < -90 || uLatV > 90 || uLngV < -180 || uLngV > 180 || (uLatV === 0 && uLngV === 0))
          return res.status(400).json({ ok: false, error: 'lat o lng invalidos', code: 'COORDENADAS_INVALIDAS' });

        // 7) Precision GPS.
        var uAccV = null;
        if (body.accuracy !== undefined && body.accuracy !== null && body.accuracy !== '') {
          uAccV = parseFloat(body.accuracy);
          if (!isFinite(uAccV) || uAccV <= 0)
            return res.status(400).json({ ok: false, error: 'accuracy invalido', code: 'ACCURACY_INVALIDA' });
          if (uAccV > ACCURACY_MAX_M)
            return res.status(422).json({ ok: false, error: 'Precision GPS insuficiente', code: 'PRECISION_INSUFICIENTE' });
        }

        // 8) Geocerca server-side.
        var dLatV = typeof destVisita.lat === 'number' ? destVisita.lat : parseFloat(destVisita.lat);
        var dLngV = typeof destVisita.lng === 'number' ? destVisita.lng : parseFloat(destVisita.lng);
        var destConCoords = tieneCoordsValidas(dLatV, dLngV);
        var radioVisita = null;
        var distVisita = null;
        var modoVisita = destConCoords ? 'geocerca' : 'sin_geocerca';
        if (destConCoords) {
          radioVisita = resolverRadioM(destVisita.categoria_slug, destVisita.tags, destVisita.nombre, destVisita.radio_m);
          distVisita = haversineMetros(uLatV, uLngV, dLatV, dLngV);
          if (distVisita > radioVisita + (uAccV || 0))
            return res.status(422).json({
              ok: false,
              error: 'Estas fuera del radio permitido para confirmar la visita',
              code: 'FUERA_DE_RANGO',
              dist_m: Math.round(distVisita),
              radio_m: radioVisita
            });
        }
        // ADR-033: XP escalado segun la amplitud del area efectiva. Con
        // geocerca se usa el radio resuelto; sin coords (sin_geocerca) no
        // hay penalizacion porque no hay area que abusar.
        var factorAreaVisita = modoVisita === 'geocerca' ? factorXpPorRadio(radioVisita) : 1;
        var xpBaseVisita = red2(XP_BASES.visita * factorAreaVisita);

        // 9) Anti-farming: cooldown, velocidad imposible y tope diario.
        var prevVisita = await sql(
          'SELECT creado_en, dims FROM interacciones WHERE usuario_id=$1 AND tipo=\'visita\' ORDER BY creado_en DESC LIMIT 1',
          [usuarioId2]
        );
        var prevGeo = prevVisita.length && prevVisita[0].dims ? prevVisita[0].dims.geo : null;
        var prevLatV = prevGeo ? parseFloat(prevGeo.lat) : NaN;
        var prevLngV = prevGeo ? parseFloat(prevGeo.lng) : NaN;
        var vMpsVisita = null;
        if (isFinite(prevLatV) && isFinite(prevLngV)) {
          var dtVisita = prevVisita[0].creado_en
            ? (Date.now() - Date.parse(prevVisita[0].creado_en)) / 1000
            : null;
          if (dtVisita !== null && !isNaN(dtVisita)) {
            if (dtVisita < COOLDOWN_MIN_SEG)
              return res.status(429).json({ ok: false, error: 'Debes esperar antes de confirmar otra visita', code: 'RATE_LIMIT' });
            if (dtVisita > 0) {
              vMpsVisita = haversineMetros(uLatV, uLngV, prevLatV, prevLngV) / dtVisita;
              if (vMpsVisita > MAX_VELOCIDAD_MPS)
                return res.status(422).json({ ok: false, error: 'Velocidad de desplazamiento imposible', code: 'VELOCIDAD_IMPOSIBLE' });
            }
          }
        }
        var visitasHoy = await sql(
          'SELECT COUNT(*)::int AS n FROM interacciones WHERE usuario_id=$1 AND tipo=\'visita\' AND creado_en > NOW() - INTERVAL \'24 hours\'',
          [usuarioId2]
        );
        if ((visitasHoy[0] && visitasHoy[0].n) >= VISITAS_DIA_MAX)
          return res.status(429).json({ ok: false, error: 'Limite diario de visitas alcanzado', code: 'LIMITE_DIARIO' });

        // 10) Zona rural / urbana (subcategoria, keyword y densidad).
        var zonaVisita = 'sin_geocerca';
        var zonaMotivoVisita = 'sin_geocerca';
        var vecinosVisita = null;
        if (destConCoords) {
          var subcatVisita = destVisita.tags && destVisita.tags.subcategoria
            ? String(destVisita.tags.subcategoria).toLowerCase() : '';
          var blobVisita = [
            destVisita.tags ? destVisita.tags.tipo_actividad : null,
            destVisita.tags ? destVisita.tags.tipo_alojamiento : null,
            destVisita.tags ? destVisita.tags.tipo_comida : null,
            destVisita.nombre
          ].filter(function(x) { return x !== undefined && x !== null; }).join(' ').toLowerCase();
          var subcatRural = subcatVisita === 'naturaleza' || subcatVisita === 'aventura' || subcatVisita === 'parque';
          var keywordRural = RURAL_KEYWORDS.some(function(k) { return blobVisita.indexOf(k) !== -1; });
          var vecinosRows = await sql(
            'SELECT COUNT(*)::int AS n FROM destinos WHERE status=\'published\''
            + ' AND lat IS NOT NULL AND lng IS NOT NULL AND lat<>0 AND lng<>0'
            + ' AND ABS(lat-$1)<$3 AND ABS(lng-$2)<$3',
            [dLatV, dLngV, VECINOS_BBOX_DEG]
          );
          vecinosVisita = vecinosRows[0] ? (parseInt(vecinosRows[0].n, 10) || 0) : 0;
          if (subcatRural) { zonaVisita = 'rural'; zonaMotivoVisita = 'subcategoria'; }
          else if (keywordRural) { zonaVisita = 'rural'; zonaMotivoVisita = 'keyword'; }
          else if (vecinosVisita <= VECINOS_RURAL_MAX) { zonaVisita = 'rural'; zonaMotivoVisita = 'densidad'; }
          else { zonaVisita = 'urbana'; zonaMotivoVisita = 'urbano'; }
        }
        var bonoRuralVisita = zonaVisita === 'rural' ? VISITA_BONO_RURAL : 0;

        // 11) Insert con dims.geo (auditoria de la presencia fisica).
        var dimsVisitaGeo = {
          lat: uLatV,
          lng: uLngV,
          accuracy: uAccV,
          dist_m: distVisita === null ? null : Math.round(distVisita),
          radio_m: radioVisita,
          zona: zonaVisita,
          zona_motivo: zonaMotivoVisita,
          modo: modoVisita,
          v_mps: vMpsVisita,
          ts_cliente: body.ts !== undefined && body.ts !== null ? body.ts : null
        };
        try {
          await sql(
            'INSERT INTO interacciones (destino_id, usuario_id, tipo, dims, xp_ganado, creado_en) VALUES ($1, $2, \'visita\', $3::jsonb, $4, NOW())',
            [destinoId2, usuarioId2, JSON.stringify({ geo: dimsVisitaGeo }), xpBaseVisita]
          );
        } catch (eVisitaIns) {
          if (eVisitaIns && eVisitaIns.code === '23505')
            return res.status(200).json({ ok: true, ya_visitado: true, xp: 0, misiones: [], logros: [] });
          throw eVisitaIns;
        }
        // v9 (ADR-018): amuleto_x2 y lider de ciudad entran al STACK del
        // punto unico. v25 (ADR-053): la visita usa M_nivel DERIVADO.
        var ctxVisita = await contextoXpE(sql, usuarioId2);
        var amuletoVisita = await aplicarAmuletoX2(sql, usuarioId2, xpBaseVisita);
        var liderVisita = await esLiderDestino(sql, usuarioId2, destinoId2);
        var resVisita = await calcularXpAcreditado(sql, xpBaseVisita, ctxVisita.nivel_clase,
          ctxVisita.clase_id, ctxVisita.tag,
          { nivel_usuario: ctxVisita.nivel_usuario, amuleto: amuletoVisita.doubled, lider: liderVisita });
        // El bono rural sigue siendo PLANO: se suma DESPUES del cap, sin
        // factor ni amuleto. Se unifica fama y cofre al valor POST-CAP +
        // bonos (xp_acreditable) - cambio deliberado Decision 8.3.
        var xpTotalVisita = red2(resVisita.xp_final + bonoRuralVisita);
        await sql(
          'UPDATE usuarios SET xp_total=xp_total+$1, total_visitas=total_visitas+1 WHERE id=$2',
          [xpTotalVisita, usuarioId2]
        ).catch(function(){});
        await acreditarClaseYCofre(sql, usuarioId2, ctxVisita, xpTotalVisita);
        await avanzarMisionesCasa(sql, usuarioId2, 'visitas', 1);
        await registrarXpLedger(sql, {
          usuario_id: usuarioId2, accion: 'visita', xp_base: xpBaseVisita,
          mult_nivel: resVisita.m_nivel, mult_stack: resVisita.mult_stack,
          mult_final: resVisita.mult_global_c, cap_aplicado: resVisita.cap_aplicado,
          bonos_planos: bonoRuralVisita, xp_final: xpTotalVisita,
          contexto: { destino_id: destinoId2, zona: zonaVisita }
        });

        var misionesVisita = await evaluarMisiones(sql, usuarioId2);
        var logrosVisita = await evaluarLogros(sql, usuarioId2);
        // v9 (ADR-018): chance de cromo + aporte de fama a la pandilla.
        // ADR-053 Dec 8.3: fama sobre xp_acreditable (antes usaba el PRE
        // bono rural: inconsistencia preexistente corregida).
        var cromoVisita = await intentarObtenerCromo(sql, usuarioId2, destinoId2);
        await aplicarFamaPandilla(sql, usuarioId2, xpTotalVisita);
        // v13: reparto multinivel del XP TOTAL ganado en la visita
        // (incluye bono rural, no bloquea).
        await repartirXpReferidos(sql, usuarioId2, xpTotalVisita);
        // v9 contrato final (punto 8): progreso de retos de parche.
        var retoVisita = await progresarPandillaRetos(sql, usuarioId2, 'visita');
        return res.status(200).json({
          ok: true,
          xp: xpTotalVisita,
          xp_detalle: Object.assign(armarXpDetalle(xpBaseVisita, resVisita, bonoRuralVisita), {
            factor_area: factorAreaVisita,
            multiplicador: resVisita.mult_global_c,
            amuleto: amuletoVisita.doubled ? 2 : 1,
            bono_rural: bonoRuralVisita
          }),
          dist_m: distVisita === null ? null : Math.round(distVisita),
          radio_m: radioVisita,
          zona: zonaVisita,
          zona_motivo: zonaMotivoVisita,
          modo: modoVisita,
          misiones: misionesVisita,
          logros: logrosVisita,
          cromo: cromoVisita || undefined,
          amuleto_x2: amuletoVisita.doubled || undefined,
          reto_completado: retoVisita || null
        });
      }

      // -- Quitar visita (Cero Borrado Logico, R-1 / ADR-024) --
      // Antes era DELETE fisico y permitia farming (quitar/reactivar sin
      // limite). Ahora desactiva la fila; el XP y total_visitas ya
      // otorgados NO se descuentan. Reactivar se maneja en 'visita'.
      if (tipo2 === 'quitar_visita') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });

        await sql(
          'UPDATE interacciones SET activo=false WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'visita\' AND activo=true',
          [destinoId2, usuarioId2]
        );
        return res.status(200).json({ ok: true });
      }

      // -- Solo rating (sin texto) - quick-rating v5 (TSK-015) ---------
      if (tipo2 === 'rating') {
        var rVal = parseInt(body.rating || 0);
        if (rVal < 1 || rVal > 5)
          return res.status(400).json({ ok: false, error: 'rating debe ser 1-5' });

        // El voto rapido requiere sesion: cierra el vector de votos
        // anonimos infinitos que distorsionaban el promedio.
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'Se requiere usuario_id' });

        // Dedup simetrico (una calificacion por usuario y destino).
        var yaVoto = await sql(
          'SELECT rating, tipo FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 '
          + 'AND tipo IN (\'resena\',\'rating\') LIMIT 1',
          [destinoId2, usuarioId2]
        );
        if (yaVoto.length > 0)
          return res.status(409).json({
            ok: false,
            error: 'Ya calificaste este lugar',
            ya_votado: true,
            voto_previo: { rating: yaVoto[0].rating, tipo: yaVoto[0].tipo }
          });

        await sql(
          'INSERT INTO interacciones (destino_id, usuario_id, tipo, rating, xp_ganado, creado_en) '
          + 'VALUES ($1, $2, \'rating\', $3, $4, NOW())',
          [destinoId2, usuarioId2, rVal, XP_BASES.rating]
        );

        // Alinear AVG y COUNT sobre resena+rating para que el contador
        // coincida con el numerador del promedio (v5).
        await sql(
          'UPDATE destinos SET '
          + 'rating = (SELECT ROUND(AVG(rating)::numeric,2) FROM interacciones '
          + '          WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\') AND rating IS NOT NULL), '
          + 'total_resenas = (SELECT COUNT(*) FROM interacciones '
          + '          WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\')), '
          + 'actualizado_en = NOW() '
          + 'WHERE id=$1',
          [destinoId2]
        ).catch(function(){});

        // Sumar XP al usuario logueado y evaluar misiones + logros.
        var misionesRating = [];
        var logrosRating = [];
        var ctxRating = await contextoXpE(sql, usuarioId2);
        // v9 (ADR-018): amuleto_x2 y lider de ciudad entran al STACK del
        // punto unico (v25 / ADR-053: no multiplican por fuera).
        var amuletoRating = await aplicarAmuletoX2(sql, usuarioId2, XP_BASES.rating);
        var liderRating = await esLiderDestino(sql, usuarioId2, destinoId2);
        var resRating = await calcularXpAcreditado(sql, XP_BASES.rating, ctxRating.nivel_clase,
          ctxRating.clase_id, ctxRating.tag,
          { nivel_usuario: ctxRating.nivel_usuario, amuleto: amuletoRating.doubled, lider: liderRating });
        var xpRatingFinal = resRating.xp_final;
        await sql(
          'UPDATE usuarios SET xp_total=xp_total+$1, ultimo_acceso=NOW() WHERE id=$2',
          [xpRatingFinal, usuarioId2]
        ).catch(function(){});
        await acreditarClaseYCofre(sql, usuarioId2, ctxRating, xpRatingFinal);
        await registrarXpLedger(sql, {
          usuario_id: usuarioId2, accion: 'rating', xp_base: XP_BASES.rating,
          mult_nivel: resRating.m_nivel, mult_stack: resRating.mult_stack,
          mult_final: resRating.mult_global_c, cap_aplicado: resRating.cap_aplicado,
          xp_final: xpRatingFinal, contexto: { destino_id: destinoId2 }
        });
        misionesRating = await evaluarMisiones(sql, usuarioId2);
        logrosRating = await evaluarLogros(sql, usuarioId2);
        // v9 (ADR-018): chance de cromo + aporte de fama a la pandilla.
        var cromoRating = await intentarObtenerCromo(sql, usuarioId2, destinoId2);
        await aplicarFamaPandilla(sql, usuarioId2, xpRatingFinal);
        // v13: reparto multinivel del XP ganado (no bloquea).
        await repartirXpReferidos(sql, usuarioId2, xpRatingFinal);
        // v9 contrato final (punto 8): rating cuenta como 'visita' en
        // los retos de parche (regla del contrato).
        var retoRating = await progresarPandillaRetos(sql, usuarioId2, 'visita');

        return res.status(200).json({ ok: true, xp: xpRatingFinal, xp_detalle: armarXpDetalle(XP_BASES.rating, resRating, 0), misiones: misionesRating, logros: logrosRating, cromo: cromoRating || undefined, amuleto_x2: amuletoRating.doubled || undefined, reto_completado: retoRating || null });
      }

      return res.status(400).json({ ok: false, error: 'tipo no implementado: ' + tipo2 });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  } catch(err) {
    console.error('[interacciones]', (err && err.code ? err.code + ' ' : '') + err.message);
    if (err && err.code === '23505')
      return res.status(409).json({ ok: false, error: 'Registro duplicado', duplicado: true });
    if (err && (err.code === '42P01' || err.code === '42703'))
      return res.status(503).json({ ok: false, error: 'Esquema de base de datos pendiente de migracion', code: 'SCHEMA_NOT_MIGRATED' });
    return res.status(500).json({ ok: false, error: err.message });
  }
};
