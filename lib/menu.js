// lib/menu.js -- CONTRATO UNICO DEL MENU DE UN DESTINO (ADR-119)
//
// POR QUE VIVE EN lib/ Y NO EN api/: los 8 ficheros de api/ son 8/8 funciones
// serverless (presupuesto Vercel Hobby AGOTADO). Este modulo NO es endpoint:
// es la libreria que api/publicar-lugar.js requirea y que admin / mi-perfil
// pueden cargar como global de navegador. Vercel lo incluye en el bundle por
// trazado de dependencias, sin consumir funcion. Mismo precedente que
// lib/cartas-config.js, lib/completitud.js y lib/sesion.js.
//
// UNA SOLA IMPLEMENTACION, DOS SUPERFICIES (ADR-119 D1): module.exports en
// Node/CommonJS (autoridad de escritura) y globalThis.ECMenu en navegador
// (lectura y previsualizacion). Duplicar la validacion en cliente y servidor
// es justo el bug que este ADR cierra: el servidor decide, el cliente repite.
//
// DOS MODOS, UN CODIGO:
//   - LECTURA (platosDe, archivosDeCarta, canalesDe): nunca recorta, nunca
//     lanza, descarta solo lo indecible (un plato sin nombre). Es lo que pinta
//     el motor: si un dato viejo se pasa de tope, se pinta igual.
//   - ESCRITURA (normalizarFicha): aplica los topes de D5 y devuelve un error
//     con codigo estable en vez de recortar en silencio (D14: no clamp). Es
//     idempotente, asi que no hace falta backfill (D2): normalizar dos veces
//     da el mismo resultado.
//
// Ademas normaliza en LECTURA lo que ya esta guardado (D2: cero backfill):
// llamar a platosDe sobre una ficha legacy no escribe nada en la base.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks, cero ES modules.
(function (raiz, fabrica) {
  'use strict';
  var api = fabrica();
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
  if (raiz) raiz.ECMenu = api;
})(typeof globalThis !== 'undefined' ? globalThis
  : (typeof window !== 'undefined' ? window
    : (typeof self !== 'undefined' ? self : null)), function () {
  'use strict';

  // --- D5: TOPES DE ESCRITURA -------------------------------------------
  // Solo gobiernan que se ACEPTA al escribir. La lectura nunca recorta.
  var TOPE_PLATOS = 60;
  var TOPE_ARCHIVOS = 10;
  var TOPE_PLATAFORMAS = 8;
  var TOPE_NOMBRE = 80;
  var TOPE_DESCRIPCION = 280;
  var TOPE_CATEGORIA = 40;
  var TOPE_PORCION = 40;
  var TOPE_PLATAFORMA = 40;
  var TOPE_BADGE = 24;
  var TOPE_ALERGENOS = 12;
  var TOPE_ALERGENO = 24;
  var TOPE_URL = 500;
  var TOPE_TITULO = 60;
  var TOPE_NOTA = 200;
  var TOPE_ZONAS = 200;
  // 10 MB. El limite real lo corta el almacenamiento de la carta; aqui solo
  // se rechaza lo que ya no tiene sentido pedir.
  var TOPE_PDF_BYTES = 10 * 1024 * 1024;

  // --- D2: catalogo SUGERIDO, NO cerrado --------------------------------
  // categoria es texto libre: estos cuatro valores solo ordenan el render. Un
  // valor fuera de la lista se guarda tal cual (normalizado) y cae en el grupo
  // residual (D8), nunca se borra.
  var CATEGORIAS_SUGERIDAS = ['entrantes', 'principales', 'postres', 'bebidas'];

  // --- D8: degradacion --------------------------------------------------
  // Sin categoria en ningun plato: UNA sola seccion con este titulo.
  var TITULO_MENU = 'Menu';
  // Grupo residual para lo que no cae en el catalogo sugerido.
  var GRUPO_OTROS = 'Otros';

  // --- D3: tipos de archivo de carta -----------------------------------
  // null NO es un tipo valido de la lista: significa "indecidible" y el
  // render lo pinta como enlace (no se adivina por el host).
  var TIPOS_ARCHIVO = ['imagen', 'pdf'];

  // D6/D9 -- centinelas de "no hay dato". Se tratan como vacio: jamas se
  // guarda un '0' o un 'none' como si fuera un numero de WhatsApp.
  var CENTINELAS = ['0', '00', 'none', 'null', 'undefined', 'n/a', 'na', 'ninguno', '-'];

  // --- utilidades de texto (ASCII puro, sin dependencias) ---------------
  function esObjeto(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  // Recorta, colapsa espacios internos y pasa a String. undefined/null -> ''.
  function texto(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/\s+/g, ' ').trim();
  }

  function mayusInicial(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // D2 -- categoria: trim, colapso de espacios y primera letra en mayuscula.
  // El resto del texto no se toca: es texto libre, no una lista cerrada.
  function normalizarCategoria(v) {
    return mayusInicial(texto(v));
  }

  function esCentinela(s) {
    var b = String(s).toLowerCase();
    for (var i = 0; i < CENTINELAS.length; i++) {
      if (b === CENTINELAS[i]) return true;
    }
    return false;
  }

  // --- D6: saneo de URLs ------------------------------------------------
  // new URL y SOLO http/https. Rechaza javascript:, data:, mailto: y las
  // protocol-relative (//host): sin base, new URL las rechaza por si mismo.
  // Sin red, sin lanzar, sin loguear.
  function esUrlSegura(v) {
    if (v === null || v === undefined) return false;
    var s = texto(v);
    if (!s) return false;
    if (s.length > TOPE_URL) return false;
    if (s.slice(0, 2) === '//') return false;
    if (typeof URL === 'function') {
      var u = null;
      try { u = new URL(s); } catch (e) { return false; }
      if (!u) return false;
      var proto = String(u.protocol || '').toLowerCase();
      if (proto !== 'http:' && proto !== 'https:') return false;
      return !!u.hostname;
    }
    // Fallback sin URL global (sandbox vm de smoke): misma regla, forma
    // conservadora. Exige esquema http(s) y un host con punto.
    return /^https?:\/\/[^\s\/]+\.[^\s\/]/i.test(s);
  }

  // --- D6/D9: WhatsApp ------------------------------------------------
  // Solo digitos. 10 digitos que empiezan por 3 -> prefijo 57 (celular CO);
  // 11-14 se respetan tal cual (ya traen indicativo); cualquier otra longitud
  // se rechaza. No se inventa indicativo para un fijo de 7 digitos.
  // Forma de retorno FIJA: {ok, numero, razon}. razon es diagnostico, no se
  // pinta al usuario.
  function normalizarWhatsapp(v) {
    if (v === null || v === undefined) return { ok: true, numero: null, razon: 'VACIO' };
    var s = texto(v);
    if (!s || esCentinela(s)) return { ok: true, numero: null, razon: 'VACIO' };
    var limpio = s.replace(/[\s\-().]/g, '');
    if (limpio.charAt(0) === '+') limpio = limpio.slice(1);
    if (!/^[0-9]+$/.test(limpio)) return { ok: false, numero: null, razon: 'NO_NUMERICO' };
    if (limpio.length === 10 && limpio.charAt(0) === '3')
      return { ok: true, numero: '57' + limpio, razon: 'OK' };
    if (limpio.length >= 11 && limpio.length <= 14)
      return { ok: true, numero: limpio, razon: 'OK' };
    return { ok: false, numero: null, razon: 'LONGITUD' };
  }

  // --- D3: tipo de archivo --------------------------------------------
  var RE_PDF = /\.pdf(\?|#|$)/i;
  var RE_IMAGEN = /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i;

  // El tipo declarado manda si es valido; si falta, se deriva de la
  // extension. Si ni una ni otra: null (enlace).
  function tipoDeArchivo(url, tipo) {
    var t = texto(tipo).toLowerCase();
    if (t === 'imagen' || t === 'image' || t === 'img') return 'imagen';
    if (t === 'pdf' || t === 'documento' || t === 'document') return 'pdf';
    var u = texto(url);
    if (RE_PDF.test(u)) return 'pdf';
    if (RE_IMAGEN.test(u)) return 'imagen';
    return null;
  }

  // --- platos ----------------------------------------------------------
  // Un plato v2 tiene NUEVE campos: nombre (UNICO obligatorio), categoria,
  // precio o precio_texto, porcion, descripcion, alergenos, disponible, foto
  // y badge. Sin id: la identidad de un plato es su posicion en el array, y el
  // array completo se reemplaza en cada escritura (D13).
  // La salida es MINIMA: solo se emite lo que tiene contenido. Un plato legacy
  // con solo nombre no gana claves vacias (el render y el admin tratan la
  // ausencia igual que el vacio, asi que no se pierde nada) y un plato completo
  // vuelve identico. Esto importa porque api/admin-destinos.js:111 REEMPLAZA
  // tags.menu_destacado por esta salida: todo campo que no se emita aqui se
  // borra de la base.
  function unPlato(raw, estricto, errores, campoBase) {
    // Legacy: un plato que es solo un string es un plato con nombre.
    var it = esObjeto(raw) ? raw : { nombre: raw };
    var nombre = texto(it.nombre);
    if (!nombre) {
      errores.push({ codigo: 'menu_plato_invalido', campo: campoBase + '.nombre',
        motivo: 'NOMBRE_REQUERIDO' });
      return null;
    }
    if (estricto && nombre.length > TOPE_NOMBRE) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase + '.nombre',
        motivo: 'TOPE_NOMBRE' });
      return null;
    }
    var descripcion = texto(it.descripcion);
    if (estricto && descripcion.length > TOPE_DESCRIPCION) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase + '.descripcion',
        motivo: 'TOPE_DESCRIPCION' });
      return null;
    }
    // D2 -- precio: numero o string numerico -> precio (numero). Si no es
    // numerico NO se inventa: el texto original se conserva en precio_texto.
    // La conversion es conservadora a proposito: '$12.000' o '12 mil' son
    // texto, no 12000.
    var precio = null;
    var precioTexto = null;
    var p = it.precio;
    if (typeof p === 'number' && isFinite(p) && p >= 0) {
      precio = p;
    } else {
      var ps = texto(p);
      if (ps) {
        if (/^[0-9]+(\.[0-9]{1,2})?$/.test(ps)) precio = Number(ps);
        else precioTexto = ps;
      }
    }
    if (precioTexto === null) {
      var pt = texto(it.precio_texto);
      if (pt) precioTexto = pt;
    }
    if (estricto && precioTexto !== null && precioTexto.length > TOPE_DESCRIPCION) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase + '.precio_texto',
        motivo: 'TOPE_DESCRIPCION' });
      return null;
    }
    var categoria = normalizarCategoria(it.categoria);
    if (estricto && categoria.length > TOPE_CATEGORIA) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase + '.categoria',
        motivo: 'TOPE_CATEGORIA' });
      return null;
    }
    var porcion = texto(it.porcion);
    if (estricto && porcion.length > TOPE_PORCION) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase + '.porcion',
        motivo: 'TOPE_PORCION' });
      return null;
    }
    var badge = texto(it.badge);
    if (estricto && badge.length > TOPE_BADGE) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase + '.badge',
        motivo: 'TOPE_BADGE' });
      return null;
    }
    var alergenos = [];
    var al = it.alergenos;
    var crudo = Array.isArray(al) ? al : (texto(al) ? [al] : []);
    if (estricto && crudo.length > TOPE_ALERGENOS) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase + '.alergenos',
        motivo: 'TOPE_ALERGENOS' });
      return null;
    }
    for (var i = 0; i < crudo.length; i++) {
      var a = texto(crudo[i]);
      if (!a) continue;
      if (estricto && a.length > TOPE_ALERGENO) {
        errores.push({ codigo: 'tope_excedido', campo: campoBase + '.alergenos[' + i + ']',
          motivo: 'TOPE_ALERGENO' });
        return null;
      }
      alergenos.push(a);
    }
    // D7 -- disponible ausente = true. false se CONSERVA: jamas se filtra ni
    // se borra, porque "agotado hoy" es informacion, no basura.
    var disponible = true;
    if (it.disponible === false) disponible = false;
    else if (typeof it.disponible === 'string'
      && /^(false|0|no)$/i.test(texto(it.disponible))) disponible = false;

    // Foto del plato (campo del formulario del admin). Misma regla que el
    // resto de URLs: solo http/https y tope 500. Una URL invalida NO tira el
    // plato: se descarta la foto y se anota el aviso (codigo url_insegura),
    // que el admin pinta en avisos[] y el camino publico devuelve como 400.
    var foto = '';
    var f = texto(it.foto);
    if (f) {
      if (esUrlSegura(f)) foto = f;
      else errores.push({ codigo: 'url_insegura', campo: campoBase + '.foto',
        motivo: 'URL_INSEGURA' });
    }

    var plato = { nombre: nombre };
    if (descripcion) plato.descripcion = descripcion;
    if (precio !== null) plato.precio = precio;
    if (precioTexto !== null) plato.precio_texto = precioTexto;
    if (categoria) plato.categoria = categoria;
    if (porcion) plato.porcion = porcion;
    if (badge) plato.badge = badge;
    if (alergenos.length) plato.alergenos = alergenos;
    if (foto) plato.foto = foto;
    // disponible se emite cuando viene declarado (true o false), para que el
    // round-trip sea exacto. Si no viene, la ausencia ya significa true (D2).
    if (Object.prototype.hasOwnProperty.call(it, 'disponible') || disponible === false)
      plato.disponible = disponible;
    return plato;
  }

  function listaPlatos(raw, estricto, errores, campoBase) {
    var out = [];
    if (raw === null || raw === undefined) return out;
    if (!Array.isArray(raw)) {
      errores.push({ codigo: 'menu_plato_invalido', campo: campoBase, motivo: 'NO_ES_ARRAY' });
      return out;
    }
    if (estricto && raw.length > TOPE_PLATOS) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase, motivo: 'TOPE_PLATOS' });
      return out;
    }
    for (var i = 0; i < raw.length; i++) {
      var p = unPlato(raw[i], estricto, errores, campoBase + '[' + i + ']');
      if (p) out.push(p);
    }
    return out;
  }

  // --- D3: archivos de carta ------------------------------------------
  function unArchivo(raw, estricto, errores, campoBase) {
    var it = esObjeto(raw) ? raw : { url: raw };
    var url = texto(it.url);
    // Una carta con URL no segura no se guarda como "enlace raro": es un
    // archivo invalido y el POST/PATCH lo rechaza (D14).
    if (!esUrlSegura(url)) {
      errores.push({ codigo: 'carta_archivo_invalido', campo: campoBase + '.url',
        motivo: 'URL_INVALIDA' });
      return null;
    }
    var titulo = texto(it.titulo);
    if (estricto && titulo.length > TOPE_TITULO) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase + '.titulo',
        motivo: 'TOPE_TITULO' });
      return null;
    }
    return { url: url, tipo: tipoDeArchivo(url, it.tipo), titulo: titulo };
  }

  function listaArchivos(raw, estricto, errores, campoBase) {
    var out = [];
    if (raw === null || raw === undefined) return out;
    if (!Array.isArray(raw)) {
      errores.push({ codigo: 'carta_archivo_invalido', campo: campoBase, motivo: 'NO_ES_ARRAY' });
      return out;
    }
    if (estricto && raw.length > TOPE_ARCHIVOS) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase, motivo: 'TOPE_ARCHIVOS' });
      return out;
    }
    for (var i = 0; i < raw.length; i++) {
      var a = unArchivo(raw[i], estricto, errores, campoBase + '[' + i + ']');
      if (a) out.push(a);
    }
    return out;
  }

  // --- D4: plataformas de domicilio ------------------------------------
  // Acepta el string legacy (chip SIN enlace: nunca se adivina el host) o
  // {nombre, url}. Una URL invalida NO borra el item: queda chip sin enlace,
  // porque la plataforma sigue existiendo aunque su enlace este mal.
  function unaPlataforma(raw, estricto, errores, campoBase) {
    if (typeof raw === 'string') {
      var n = texto(raw);
      if (!n) {
        errores.push({ codigo: 'plataforma_invalida', campo: campoBase, motivo: 'NOMBRE_REQUERIDO' });
        return null;
      }
      if (estricto && n.length > TOPE_PLATAFORMA) {
        errores.push({ codigo: 'tope_excedido', campo: campoBase, motivo: 'TOPE_PLATAFORMA' });
        return null;
      }
      return { nombre: n, url: null };
    }
    if (!esObjeto(raw)) {
      errores.push({ codigo: 'plataforma_invalida', campo: campoBase, motivo: 'NO_ES_OBJETO' });
      return null;
    }
    var nombre = texto(raw.nombre);
    if (!nombre) {
      errores.push({ codigo: 'plataforma_invalida', campo: campoBase + '.nombre',
        motivo: 'NOMBRE_REQUERIDO' });
      return null;
    }
    if (estricto && nombre.length > TOPE_PLATAFORMA) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase + '.nombre',
        motivo: 'TOPE_PLATAFORMA' });
      return null;
    }
    var url = null;
    if (raw.url !== null && raw.url !== undefined && texto(raw.url)) {
      if (esUrlSegura(raw.url)) url = texto(raw.url);
    }
    return { nombre: nombre, url: url };
  }

  function listaPlataformas(raw, estricto, errores, campoBase) {
    var out = [];
    if (raw === null || raw === undefined) return out;
    if (!Array.isArray(raw)) {
      errores.push({ codigo: 'plataforma_invalida', campo: campoBase, motivo: 'NO_ES_ARRAY' });
      return out;
    }
    if (estricto && raw.length > TOPE_PLATAFORMAS) {
      errores.push({ codigo: 'tope_excedido', campo: campoBase, motivo: 'TOPE_PLATAFORMAS' });
      return out;
    }
    for (var i = 0; i < raw.length; i++) {
      var p = unaPlataforma(raw[i], estricto, errores, campoBase + '[' + i + ']');
      if (p) out.push(p);
    }
    return out;
  }

  // --- zonas de domicilio ----------------------------------------------
  // Lista de barrios/z zonas donde se entrega. Deduplicada por texto en
  // minusculas y sin recortar en lectura (D5: tope solo de escritura).
  function listaZonas(raw, estricto, errores, campoBase) {
    var out = [];
    var vistos = {};
    var arr = Array.isArray(raw) ? raw : (texto(raw) ? [raw] : []);
    for (var i = 0; i < arr.length; i++) {
      var z = texto(arr[i]);
      if (!z) continue;
      if (estricto && z.length > TOPE_ZONAS) {
        errores.push({ codigo: 'tope_excedido', campo: campoBase + '[' + i + ']',
          motivo: 'TOPE_ZONAS' });
        continue;
      }
      var k = z.toLowerCase();
      if (vistos[k]) continue;
      vistos[k] = 1;
      out.push(z);
    }
    return out;
  }

  // --- ESCRITURA: normalizacion de una ficha parcial -------------------
  // Entrada: el objeto de tags (o {tags:{...}}). Solo procesa las claves
  // PRESENTES: lo que no llega, no se toca (el merge JSONB es por clave). Un
  // array vacio [] SI borra el array completo (D13). null/undefined = no
  // tocar, para que un formulario que no envia el campo no borre el menu.
  //
  // Retorno: {ok, ficha, errores:[{codigo, campo, motivo}]}. Si !ok, el
  // llamador responde 400 con errores[0] y NO escribe.
  function normalizarFicha(entrada) {
    var src = esObjeto(entrada) ? entrada : {};
    var ficha = {};
    var errores = [];

    function leer(k) {
      if (Object.prototype.hasOwnProperty.call(src, k) && src[k] !== undefined && src[k] !== null)
        return src[k];
      var t = esObjeto(src.tags) ? src.tags : null;
      if (t && Object.prototype.hasOwnProperty.call(t, k) && t[k] !== undefined && t[k] !== null)
        return t[k];
      return undefined;
    }

    var v = leer('menu_destacado');
    if (v !== undefined) ficha.menu_destacado = listaPlatos(v, true, errores, 'menu_destacado');

    v = leer('carta_archivos');
    if (v !== undefined) ficha.carta_archivos = listaArchivos(v, true, errores, 'carta_archivos');

    // D3 -- carta_nota <=200 y no se pinta sin archivos (esa ultima parte es
    // del render: aqui solo se guarda el texto normalizado).
    v = leer('carta_nota');
    if (v !== undefined) {
      var nota = texto(v);
      if (nota.length > TOPE_NOTA) {
        errores.push({ codigo: 'tope_excedido', campo: 'carta_nota', motivo: 'TOPE_NOTA' });
      } else {
        ficha.carta_nota = nota;
      }
    }

    v = leer('domicilio_plataformas');
    if (v !== undefined) {
      ficha.domicilio_plataformas = listaPlataformas(v, true, errores, 'domicilio_plataformas');
    }

    v = leer('domicilio_zonas');
    if (v !== undefined) {
      ficha.domicilio_zonas = listaZonas(v, true, errores, 'domicilio_zonas');
    }

    // D9 -- whatsapp_pedidos solo digitos (con la regla de 10 -> 57). Un
    // centinela ('0', 'none') equivale a vacio y se guarda como null, jamas
    // como numero.
    v = leer('whatsapp_pedidos');
    if (v !== undefined) {
      var wa = normalizarWhatsapp(v);
      if (!wa.ok) {
        errores.push({ codigo: 'whatsapp_invalido', campo: 'whatsapp_pedidos',
          motivo: wa.razon });
      } else {
        ficha.whatsapp_pedidos = wa.numero;
      }
    }

    return { ok: errores.length === 0, ficha: ficha, errores: errores };
  }

  // --- LECTURA ---------------------------------------------------------
  // Acepta un objeto de tags o una fila con .tags. Nunca escribe, nunca
  // recorta y nunca lanza: el render tiene que poder pintar cualquier fila.
  function capaTags(fuente) {
    if (esObjeto(fuente) && esObjeto(fuente.tags)) return fuente.tags;
    return esObjeto(fuente) ? fuente : {};
  }

  function platosDe(fuente) {
    var t = capaTags(fuente);
    return listaPlatos(t.menu_destacado, false, [], 'menu_destacado');
  }

  function archivosDeCarta(fuente) {
    var t = capaTags(fuente);
    return listaArchivos(t.carta_archivos, false, [], 'carta_archivos');
  }

  function plataformasDe(fuente) {
    var t = capaTags(fuente);
    return listaPlataformas(t.domicilio_plataformas, false, [], 'domicilio_plataformas');
  }

  function zonasDe(fuente) {
    var t = capaTags(fuente);
    return listaZonas(t.domicilio_zonas, false, [], 'domicilio_zonas');
  }

  // D4/D9 -- escalares legacy 'rappi' / 'ifood': se LEEN como canales de
  // domicilio para que una ficha antigua (solo esos dos escalares) no pierda
  // sus botones cuando el render pasa a consumir solo canalesDe(). Es LECTURA
  // PURA: no se escribe nada y los escalares siguen en tags como estaban.
  // Orden y precedencia:
  //   1) primero las entradas EXPLICITAS de domicilio_plataformas[];
  //   2) despues los escalares. Aqui el nombre ya se conoce, asi que una URL
  //      invalida se IGNORA en silencio: no se inventa host ni se convierte en
  //      chip sin enlace (eso es solo para el string legacy del array);
  //   3) dedupe por url o por nombre (sin mayusculas ni acentos basicos):
  //      gana SIEMPRE la entrada explicita del array.
  var ESCALARES_DOMICILIO = [
    { nombre: 'Rappi', clave: 'rappi' },
    { nombre: 'iFood', clave: 'ifood' }
  ];

  // Clave de comparacion de un nombre de plataforma: minusculas y solo
  // [a-z0-9], con los acentos basicos plegados. Se hace por codigo de caracter
  // para que el fichero siga siendo ASCII puro (ADR-002).
  function claveNombre(s) {
    var b = (s === null || s === undefined) ? '' : String(s);
    var out = '';
    for (var i = 0; i < b.length; i++) {
      var c = b.charAt(i).toLowerCase();
      var cp = c.charCodeAt(0);
      if (cp >= 0x00e0 && cp <= 0x00e5) c = 'a';
      else if (cp >= 0x00e8 && cp <= 0x00eb) c = 'e';
      else if (cp >= 0x00ec && cp <= 0x00ef) c = 'i';
      else if (cp >= 0x00f2 && cp <= 0x00f6) c = 'o';
      else if (cp >= 0x00f9 && cp <= 0x00fc) c = 'u';
      else if (cp === 0x00f1) c = 'n';
      if (c >= 'a' && c <= 'z') out += c;
      else if (c >= '0' && c <= '9') out += c;
    }
    return out;
  }

  // Plataformas efectivas de domicilio: array + escalares legacy. Devuelve un
  // array NUEVO, nunca la referencia de tags (no muta la ficha).
  function canalesDomicilio(t) {
    var plataformas = plataformasDe(t);
    var urls = {};
    var nombres = {};
    var i;
    for (i = 0; i < plataformas.length; i++) {
      var u = plataformas[i].url ? texto(plataformas[i].url).toLowerCase() : '';
      if (u) urls[u] = 1;
      var nn = claveNombre(plataformas[i].nombre);
      if (nn) nombres[nn] = 1;
    }
    for (i = 0; i < ESCALARES_DOMICILIO.length; i++) {
      var esc = ESCALARES_DOMICILIO[i];
      var crudo = texto(t[esc.clave]);
      if (!crudo) continue;
      // Tope 500 y solo http/https (via esUrlSegura). Invalida -> ignorada.
      if (!esUrlSegura(crudo)) continue;
      var cu = crudo.toLowerCase();
      var cn = claveNombre(esc.nombre);
      if (urls[cu] || nombres[cn]) continue;
      urls[cu] = 1;
      nombres[cn] = 1;
      plataformas.push({ nombre: esc.nombre, url: crudo });
    }
    return plataformas;
  }

  // D9 -- precedencia: whatsapp_pedidos > whatsapp del lugar. Sin centinelas.
  // Devuelve SIEMPRE la forma completa para que el render no tenga que
  // preguntar si existe la clave.
  function canalesDe(fuente, lugar) {
    var t = capaTags(fuente);
    var l = esObjeto(lugar) ? lugar : {};
    var pedidos = normalizarWhatsapp(t.whatsapp_pedidos);
    var delLugar = normalizarWhatsapp(l.whatsapp);
    var numero = null;
    var origen = null;
    if (pedidos.ok && pedidos.numero) {
      numero = pedidos.numero;
      origen = 'pedidos';
    } else if (delLugar.ok && delLugar.numero) {
      numero = delLugar.numero;
      origen = 'lugar';
    }
    return {
      whatsapp: numero,
      whatsapp_origen: origen,
      plataformas: canalesDomicilio(t),
      zonas: zonasDe(t),
      nota: texto(t.carta_nota)
    };
  }

  return {
    // API publica (ADR-119 D1)
    normalizarFicha: normalizarFicha,
    platosDe: platosDe,
    archivosDeCarta: archivosDeCarta,
    // Lectores de UNA sola lista. publicar.html los invoca con guard
    // (typeof === 'function') para precargar el editor y volver a guardar sin
    // borrar domicilio_zonas ni las plataformas: sin estas dos entradas el
    // guard degradaba a [] y el PATCH del alta borraba lo que no podia leer.
    // NO incluyen la herencia de los escalares rappi/ifood (eso es canalesDe):
    // si la incluyeran, guardar el formulario materializaria los escalares
    // dentro del array y eso es un cambio de forma no pedido.
    plataformasDe: plataformasDe,
    zonasDe: zonasDe,
    canalesDe: canalesDe,
    esUrlSegura: esUrlSegura,
    normalizarWhatsapp: normalizarWhatsapp,
    // Topes de escritura (D5)
    TOPE_PLATOS: TOPE_PLATOS,
    TOPE_ARCHIVOS: TOPE_ARCHIVOS,
    TOPE_PLATAFORMAS: TOPE_PLATAFORMAS,
    TOPE_NOMBRE: TOPE_NOMBRE,
    TOPE_DESCRIPCION: TOPE_DESCRIPCION,
    TOPE_CATEGORIA: TOPE_CATEGORIA,
    TOPE_PORCION: TOPE_PORCION,
    TOPE_PLATAFORMA: TOPE_PLATAFORMA,
    TOPE_BADGE: TOPE_BADGE,
    TOPE_ALERGENOS: TOPE_ALERGENOS,
    TOPE_ALERGENO: TOPE_ALERGENO,
    TOPE_URL: TOPE_URL,
    TOPE_TITULO: TOPE_TITULO,
    TOPE_NOTA: TOPE_NOTA,
    TOPE_ZONAS: TOPE_ZONAS,
    TOPE_PDF_BYTES: TOPE_PDF_BYTES,
    // Contrato de render (D2/D3/D8)
    CATEGORIAS_SUGERIDAS: CATEGORIAS_SUGERIDAS,
    TIPOS_ARCHIVO: TIPOS_ARCHIVO,
    TITULO_MENU: TITULO_MENU,
    GRUPO_OTROS: GRUPO_OTROS
  };
});
