/* niveles-data.js - Fuente unica de niveles y capacidades (ADR-040 T2)
 * ASCII-safe (ADR-002): cero caracteres > 127 en el archivo fuente.
 * CommonJS (BUG-001): require/module.exports.
 * Doble export: module.exports (smoke/Node) + window.NivelesData (browser).
 */
(function() {
  'use strict';

  var NivelesData = {};

  /* ---- XP_LEVELS: 40 rangos / 5 Eras ---- */
  /* Copia textual de mi-perfil.html:833-856 con los MISMOS umbrales.
   * El campo capacidades string se reemplaza por CAPACIDADES_DETALLE. */
  /* Curva v7 (40 niveles / 5 Eras): Caminante 1-10, Explorador 11-20,
   * Cronista 21-30, Leyenda 31-35, Mito 36-40. Espejo de la tabla
   * canonica de 40 umbrales; validado por scripts/smoke_niveles_espejos.js.
   * Los titulos con tilde/ene usan escapes \uXXXX (ASCII-safe, ADR-002).
   * Emojis 1-20 reusados del catalogo previo (deduplicados); 21-40 nuevos. */
  NivelesData.XP_LEVELS = [
    {min:0,nombre:'Caminante Novato',emoji:'\uD83C\uDF31',era:'Caminante'},
    {min:150,nombre:'Rastreador Local',emoji:'\uD83E\uDDED',era:'Caminante'},
    {min:500,nombre:'Explorador Urbano',emoji:'\uD83C\uDFD8\uFE0F',era:'Caminante'},
    {min:1000,nombre:'Aventurero Regional',emoji:'\uD83E\uDD7E',era:'Caminante'},
    {min:1650,nombre:'Vanguardia Territorial',emoji:'\uD83C\uDFD9\uFE0F',era:'Caminante'},
    {min:2500,nombre:'Embajador de Zona',emoji:'\uD83C\uDFDB\uFE0F',era:'Caminante'},
    {min:3450,nombre:'Fot\u00f3grafo de Ruta',emoji:'\u2B50',era:'Caminante'},
    {min:4550,nombre:'Cronista de Historias',emoji:'\uD83D\uDCD6',era:'Caminante'},
    {min:5800,nombre:'Buscador de Leyendas',emoji:'\uD83E\uDDF0',era:'Caminante'},
    {min:7150,nombre:'Gu\u00eda de Fronteras',emoji:'\uD83E\uDDD7',era:'Caminante'},
    {min:8650,nombre:'Estratega Comunitario',emoji:'\uD83C\uDFAF',era:'Explorador'},
    {min:10250,nombre:'Documentalista Visual',emoji:'\uD83C\uDFAC',era:'Explorador'},
    {min:12000,nombre:'Se\u00f1or del Spot',emoji:'\uD83D\uDC51',era:'Explorador'},
    {min:13850,nombre:'Cart\u00f3grafo de Cine',emoji:'\uD83C\uDF05',era:'Explorador'},
    {min:15800,nombre:'Protector del Patrimonio',emoji:'\uD83D\uDEE1\uFE0F',era:'Explorador'},
    {min:17900,nombre:'Curador de Colombia',emoji:'\uD83D\uDDBC\uFE0F',era:'Explorador'},
    {min:20100,nombre:'Mariscal de Parche',emoji:'\uD83D\uDCA5',era:'Explorador'},
    {min:22450,nombre:'Cineasta de Territorio',emoji:'\uD83C\uDFA5',era:'Explorador'},
    {min:24850,nombre:'Inmortal del Mapa',emoji:'\uD83D\uDD25',era:'Explorador'},
    {min:27400,nombre:'Gran Maestro ExploraCO',emoji:'\uD83C\uDF96\uFE0F',era:'Explorador'},
    {min:30050,nombre:'Tejedor de Rutas',emoji:'\uD83D\uDDFA\uFE0F',era:'Cronista'},
    {min:32800,nombre:'Cronista de Regiones',emoji:'\uD83C\uDF0E',era:'Cronista'},
    {min:35700,nombre:'Curador de Relatos',emoji:'\uD83D\uDCDC',era:'Cronista'},
    {min:38650,nombre:'Guardi\u00e1n de Tradiciones',emoji:'\uD83C\uDFFA',era:'Cronista'},
    {min:41750,nombre:'Arquitecto de Itinerarios',emoji:'\uD83E\uDDF1',era:'Cronista'},
    {min:44900,nombre:'Maestro de Ceremonias',emoji:'\uD83C\uDFA9',era:'Cronista'},
    {min:48200,nombre:'Cronista Mayor',emoji:'\uD83D\uDD8B\uFE0F',era:'Cronista'},
    {min:51600,nombre:'Embajador Cultural',emoji:'\uD83E\uDD1D',era:'Cronista'},
    {min:55050,nombre:'Historiador de Territorio',emoji:'\uD83D\uDDFF',era:'Cronista'},
    {min:58700,nombre:'Sabio de los Caminos',emoji:'\uD83E\uDDE0',era:'Cronista'},
    {min:62400,nombre:'Leyenda Emergente',emoji:'\uD83C\uDF1F',era:'Leyenda'},
    {min:66150,nombre:'Forjador de Leyendas',emoji:'\uD83D\uDEE0\uFE0F',era:'Leyenda'},
    {min:70050,nombre:'H\u00e9roe del Mapa',emoji:'\uD83E\uDDB8',era:'Leyenda'},
    {min:74050,nombre:'Tit\u00e1n de las Rutas',emoji:'\uD83C\uDFD4\uFE0F',era:'Leyenda'},
    {min:78150,nombre:'Leyenda Viva',emoji:'\uD83D\uDCAB',era:'Leyenda'},
    {min:82300,nombre:'Mito Naciente',emoji:'\uD83C\uDF0C',era:'Mito'},
    {min:86600,nombre:'Semidi\u00f3s del Viaje',emoji:'\u26A1',era:'Mito'},
    {min:90950,nombre:'Guardi\u00e1n Ancestral',emoji:'\uD83E\uDDFF',era:'Mito'},
    {min:95450,nombre:'Esp\u00edritu del Territorio',emoji:'\uD83C\uDFF5\uFE0F',era:'Mito'},
    {min:100000,nombre:'Mito Eterno ExploraCO',emoji:'\uD83C\uDFC6',era:'Mito'}
  ];

  /* ---- CAPACIDADES_DETALLE: 13 capacidades desbloqueables por nivel ---- */
  /* Fuentes reales (ADR-006 / ADR-040):
   *   - 4 primeras: campo desbloquea del catalogo MISIONES
   *     (api/interacciones.js:1246/1253/1260/1267) con gate XP documentado
   *     en el comentario :1237-1243. Nivel = umbral XP del check().
   *   - 9 siguientes: CAPACIDADES_POR_NIVEL (usuario-session.js:65-75).
   *     Nivel = clave numerica del mapa (indice 1-based).
   * Nota: organizar_actividad aparece en AMBAS fuentes pero se lista
   * UNA sola vez en nivel 11 (CAPACIDADES_POR_NIVEL). La mision
   * mis_organizador_bogota (nivel 3) NO duplica la capacidad. */
  NivelesData.CAPACIDADES_DETALLE = [
    {
      clave: 'subir_fotos',
      nombre: 'Subir fotos',
      howto: 'Sube fotos desde la galeria de cualquier destino o album',
      nivel: 2
    },
    {
      clave: 'chat',
      nombre: 'Chat Publico',
      howto: 'Accede al Chat Publico desde la barra de navegacion y escribe tu primer mensaje',
      nivel: 3
    },
    {
      clave: 'moderador_chat',
      nombre: 'Moderador de chat',
      howto: 'En una sala de chat, usa las herramientas de moderacion para gestionar mensajes',
      nivel: 4
    },
    {
      clave: 'crear_chat',
      nombre: 'Crear salas de chat',
      howto: 'Crea una nueva sala de chat desde la seccion de Comunidad',
      nivel: 5
    },
    {
      clave: 'crear_planes',
      nombre: 'Crear Planes',
      howto: 'Abre Comunidad > Planes y crea una actividad de viaje',
      nivel: 6
    },
    {
      clave: 'emojis_premium',
      nombre: 'Emojis premium',
      howto: 'En la sala de chat, usa el selector de emojis premium para expresarte',
      nivel: 7
    },
    {
      clave: 'sello_sala',
      nombre: 'Sello de sala',
      howto: 'Fija un mensaje importante en la cabecera de la sala de chat',
      nivel: 10
    },
    {
      clave: 'organizar_actividad',
      nombre: 'Organizar actividad',
      howto: 'Abre Comunidad > Planes y organiza una actividad grupal en tu ciudad',
      nivel: 11
    },
    {
      clave: 'fundar_pandilla',
      nombre: 'Fundar pandilla',
      howto: 'Crea tu propia pandilla de viajeros desde la seccion de Comunidad',
      nivel: 14
    },
    {
      clave: 'moderar_galerias',
      nombre: 'Moderar galerias',
      howto: 'Gestiona y modera galerias y resenas desde el panel de contenido',
      nivel: 15
    },
    {
      clave: 'cromo_dorado',
      nombre: 'Cromo dorado',
      howto: 'Consigue cromos dorados al completar colecciones de destinos por ciudad',
      nivel: 16
    },
    {
      clave: 'mariscal_parche',
      nombre: 'Mariscal de Parche',
      howto: 'Disfruta de multiplicador x1.2 XP en actividades de tu Parche grupal y accede a pases VIP',
      nivel: 17
    },
    {
      clave: 'inmortal',
      nombre: 'Inmortal del Mapa',
      howto: 'Tu avatar lleva marco Neon Fuego y tienes acceso anticipado a funciones beta',
      nivel: 19
    }
  ];

  /* ---- capacidadesDelNivel: filtra CAPACIDADES_DETALLE por nivel ---- */
  NivelesData.capacidadesDelNivel = function(nivel) {
    var result = [];
    for (var i = 0; i < NivelesData.CAPACIDADES_DETALLE.length; i++) {
      if (NivelesData.CAPACIDADES_DETALLE[i].nivel === nivel) {
        result.push(NivelesData.CAPACIDADES_DETALLE[i]);
      }
    }
    return result;
  };

  /* ---- MISION_GATE_FALLBACK: 11 misiones con nivel conocido ---- */
   /* Fallback cliente usado mientras el backend no envia campo nivel en
   * el payload de GET ?tipo=misiones (pre-v22, ADR-040 B).
   *
   * Las 5 primeras: misiones con umbral XP explicito en su check()
   * (api/interacciones.js:1237-1243):
   *   mis_fotografo        -> check xpTotal >= 100 = nivel 2
   *                          (desbloquea subir_fotos)
   *   mis_chat_mensajero   -> check xpTotal >= 250 = nivel 3
   *                          (desbloquea chat)
   *   mis_chat_moderador   -> check xpTotal >= 450 = nivel 4
   *                          (desbloquea moderador_chat)
   *   mis_chat_creador     -> check xpTotal >= 700 = nivel 5
   *                          (desbloquea crear_chat)
   *   mis_organizador_bogota -> check exige 300 XP = nivel 3
   *                          (desbloquea organizar_actividad; la CAPACIDAD
   *                           se activa en nivel 11, pero la mision se
   *                           lista en nivel 3, sin duplicar nivel 11)
   *
   * Las 6 adicionales: bloque de Fotos (ADR-017), todas con
   * gate_nivel:2 explicito en el catalogo MISIONES. Su cadena de
   * requiere forma un DAG cuya raiz es mis_primera_foto_social (nivel 2):
   *   mis_primera_foto_social  -> raiz del bloque fotos, gate_nivel:2
   *   mis_creador_album        -> requiere mis_primera_foto_social
   *   mis_album_curador        -> requiere mis_creador_album
   *   mis_fotografo_social     -> requiere mis_primera_foto_social
   *   mis_cazador_recompensas  -> requiere mis_fotografo_social
   *   mis_favorito_del_pueblo  -> requiere mis_fotografo_social
   * Total: 5 + 6 = 11 entradas congeladas. */
  NivelesData.MISION_GATE_FALLBACK = {
    'mis_fotografo': 2,
    'mis_chat_mensajero': 3,
    'mis_chat_moderador': 4,
    'mis_chat_creador': 5,
    'mis_organizador_bogota': 3,
    'mis_primera_foto_social': 2,
    'mis_creador_album': 2,
    'mis_album_curador': 2,
    'mis_fotografo_social': 2,
    'mis_cazador_recompensas': 2,
    'mis_favorito_del_pueblo': 2
  };

  /* ---- misionesPorNivel: filtra misiones del GET ?tipo=misiones ---- */
  /* Reglas de asignacion (ADR-040 B, orden de prioridad):
   *   (a) si m.nivel != null -> m.nivel === nivel (backend v22+)
   *   (b) si m.gate_nivel != null -> m.gate_nivel === nivel
   *   (c) fallback -> MISION_GATE_FALLBACK[m.id] === nivel
   * Cada mision devuelta incluye campo estado del payload. */
  NivelesData.misionesPorNivel = function(nivel, misionesData) {
    if (!misionesData || !Array.isArray(misionesData)) return [];
    var result = [];
    for (var i = 0; i < misionesData.length; i++) {
      var m = misionesData[i];
      var mNivel = null;
      if (m.nivel != null) {
        mNivel = m.nivel;
      } else if (m.gate_nivel != null) {
        mNivel = m.gate_nivel;
      } else if (NivelesData.MISION_GATE_FALLBACK[m.id] != null) {
        mNivel = NivelesData.MISION_GATE_FALLBACK[m.id];
      }
      if (mNivel === nivel) {
        result.push({
          id: m.id,
          nombre: m.nombre,
          xp: m.xp,
          grupo: m.grupo,
          requiere: m.requiere || [],
          estado: m.estado || 'pendiente',
          desbloquea: m.desbloquea || null
        });
      }
    }
    return result;
  };

  /* ---- GRUPO_NOMBRE: traduccion de los 6 grupos reales ---- */
  /* mi-perfil.html:1095 solo tenia 3; este es el catalogo completo. */
  NivelesData.GRUPO_NOMBRE = {
    general: 'General',
    ciudad: 'Ciudad',
    categoria: 'Categor\u00eda',
    fotos: 'Fotos',
    artista: 'Artista',
    perfil: 'Perfil'
  };

  /* ---- Export dual ---- */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NivelesData;
  }
  if (typeof window !== 'undefined') {
    window.NivelesData = NivelesData;
  }

})();
