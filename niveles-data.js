/* niveles-data.js - Fuente unica de niveles y capacidades (ADR-040 T2)
 * ASCII-safe (ADR-002): cero caracteres > 127 en el archivo fuente.
 * CommonJS (BUG-001): require/module.exports.
 * Doble export: module.exports (smoke/Node) + window.NivelesData (browser).
 */
(function() {
  'use strict';

  var NivelesData = {};

  /* ---- XP_LEVELS: 20 rangos / 4 Eras ---- */
  /* Copia textual de mi-perfil.html:833-856 con los MISMOS umbrales.
   * El campo capacidades string se reemplaza por CAPACIDADES_DETALLE. */
  /* ADR-053 T6: umbrales v6 (techo 42000) y grafia CORREGIDA del titulo 11
   * ('Estratega Comunitario', no 'Estrat\u00e9ga'). Espejo de api/usuarios.js
   * NIVELES; validado por scripts/smoke_niveles_espejos.js. Los titulos con
   * tilde/ene usan escapes \uXXXX (ASCII-safe, ADR-002). */
  NivelesData.XP_LEVELS = [
    {min:0,nombre:'Caminante Novato',emoji:'\uD83C\uDF31',era:'Era 1 Mundana'},
    {min:100,nombre:'Rastreador Local',emoji:'\uD83E\uDDED',era:'Era 1'},
    {min:250,nombre:'Explorador Urbano',emoji:'\uD83E\uDDED',era:'Era 1'},
    {min:450,nombre:'Aventurero Regional',emoji:'\uD83E\uDD7E',era:'Era 1'},
    {min:700,nombre:'Vanguardia Territorial',emoji:'\uD83C\uDFD9\uFE0F',era:'Era 1'},
    {min:1050,nombre:'Embajador de Zona',emoji:'\uD83C\uDFDB\uFE0F',era:'Era 2 Patrocinada'},
    {min:1500,nombre:'Fot\u00f3grafo de Ruta',emoji:'\u2B50',era:'Era 2'},
    {min:2100,nombre:'Cronista de Historias',emoji:'\uD83D\uDCD6',era:'Era 2'},
    {min:2900,nombre:'Buscador de Leyendas',emoji:'\uD83E\uDDF0',era:'Era 2'},
    {min:3900,nombre:'Gu\u00eda de Fronteras',emoji:'\uD83E\uDDED',era:'Era 2'},
    {min:5200,nombre:'Estratega Comunitario',emoji:'\uD83C\uDFAF',era:'Era 3'},
    {min:6800,nombre:'Documentalista Visual',emoji:'\uD83C\uDFAC',era:'Era 3'},
    {min:8800,nombre:'Se\u00f1or del Spot',emoji:'\uD83D\uDC51',era:'Era 3'},
    {min:11200,nombre:'Cart\u00f3grafo de Cine',emoji:'\uD83C\uDF05',era:'Era 3'},
    {min:14200,nombre:'Protector del Patrimonio',emoji:'\uD83D\uDEE1\uFE0F',era:'Era 3'},
    {min:17800,nombre:'Curador de Colombia',emoji:'\uD83E\uD489',era:'Era 4 Leyenda'},
    {min:22200,nombre:'Mariscal de Parche',emoji:'\uD83D\uDCA5',era:'Era 4'},
    {min:27500,nombre:'Cineasta de Territorio',emoji:'\uD83C\uDFA5',era:'Era 4'},
    {min:34000,nombre:'Inmortal del Mapa',emoji:'\uD83D\uDD25',era:'Era 4'},
    {min:42000,nombre:'Gran Maestro ExploraCO',emoji:'\uD83D\uDC51',era:'Era 4'}
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
