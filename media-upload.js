/* media-upload.js - LATAWEL
 * Cliente compartido de subida de medios a Vercel Blob.
 * Sube el archivo DIRECTO al store (client upload); el backend solo emite un
 * token firmado via /api/utilidades?tipo=blob_upload.
 *
 * API PUBLICA (contrato fijo):
 *
 *   window.MediaUpload.LIMITES
 *     { foto: 5242880, audio: 15728640, video: 31457280 }
 *
 *   window.MediaUpload.tipoDeArchivo(file) -> 'foto' | 'audio' | 'video' | null
 *
 *   window.MediaUpload.validar(file, tipo) -> { ok, tipo?, error? }
 *     Valida mime y tamano ANTES de subir (espejo de api/blob-upload.js).
 *
 *   window.MediaUpload.subir({ file, tipo?, contexto?, modo?, jwt?,
 *                              adminToken?, onProgress? })
 *     Devuelve Promise<{ url, pathname, contentType, size }>.
 *     - contexto: 'museo' | 'album' | 'perfil' | 'destino' (default 'museo').
 *     - modo: 'publico' fuerza el prefijo publico/destino/<tipo>/ y envia
 *       jwt: null en el clientPayload, para que el servidor autorice el
 *       prefijo publico aunque el navegador tenga sesion guardada (caso
 *       publicar.html). Sin 'modo' se autodetecta.
 *     - jwt: se autodetecta via window.ExploraCO y localStorage. El
 *       usuario_id del clientPayload y el prefijo salen del 'sub' del propio
 *       JWT, nunca de la UI: el prefijo y el clientPayload NUNCA se
 *       contradicen.
 *     - adminToken: sube como admin (prefijo admin/).
 *     - onProgress({ loaded, total, percentage }).
 *     - Sin sesion valida solo se permite contexto 'destino' + imagen (lo
 *       valida el servidor). Con jwt caducado se reintenta UNA vez via
 *       window.ExploraCO.refreshJwt; si falla se cae a modo publico solo en
 *       contexto 'destino' y en el resto se rechaza con mensaje claro.
 *     - Si la subida falla, se repite el evento del protocolo (solo lectura)
 *       para traducir el error real del servidor a un mensaje humano.
 *
 * Dependencia: @vercel/blob/client via esm.sh, version fija (sin bundler).
 * ASCII-safe (ADR-002): sin bytes > 127 ni backticks.
 */
(function () {
  'use strict';

  var BLOB_VERSION = '2.8.0';
  var BLOB_CLIENT_URL = 'https://esm.sh/@vercel/blob@' + BLOB_VERSION + '/client';
  var HANDLE_UPLOAD_URL = '/api/utilidades?tipo=blob_upload';

  var LIMITES = { foto: 5 * 1024 * 1024, audio: 15 * 1024 * 1024, video: 30 * 1024 * 1024 };

  var MIME_OK = {
    foto: /^image\/(jpeg|png|webp|gif|avif)$/i,
    audio: /^audio\//i,
    video: /^video\//i
  };

  var _modulo = null;

  function cargarCliente() {
    if (_modulo) { return Promise.resolve(_modulo); }
    try {
      return Promise.resolve(import(BLOB_CLIENT_URL)).then(function (m) { _modulo = m; return m; });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function jwtActual() {
    try {
      if (window.ExploraCO && typeof window.ExploraCO.obtenerJwt === 'function') {
        return window.ExploraCO.obtenerJwt();
      }
      var raw = window.localStorage.getItem('exploraco_user');
      if (raw) { var s = JSON.parse(raw); return (s && s.jwt) ? s.jwt : null; }
    } catch (e) { /* sin sesion */ }
    return null;
  }

  /* ---- Coherencia prefijo <-> clientPayload -----------------------------
     api/utilidades.js autoriza el prefijo asi:
       - adminToken valido         -> admin/
       - jwt valido (firma + exp)  -> usuarios/<sub>/
       - resto, solo foto+destino  -> publico/destino/
     y exige que el pathname empiece por "prefijo + tipo + /", y que
     clientPayload.usuario_id coincida con el 'sub' del jwt (si no, responde
     SESION_INVALIDA). Por eso el uid SIEMPRE sale del 'sub' del propio JWT
     (decodificado en local) y el modo publico viaja con jwt:null: el prefijo
     y el payload no pueden llegar a contradecirse. */
  var PREFIJO_ADMIN = 'admin/';
  var PREFIJO_USUARIO = 'usuarios/';
  var PREFIJO_PUBLICO = 'publico/destino/';
  var MENSAJE_SESION_REQUERIDA = 'Necesitas iniciar sesion con tu cuenta para subir este archivo. Vuelve a entrar e intenta de nuevo.';

  var B64URL_ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  function b64urlABytes(txt) {
    var limpio = String(txt || '').replace(/=+$/, '');
    var out = [];
    var acc = 0;
    var bits = 0;
    for (var i = 0; i < limpio.length; i++) {
      var ch = limpio.charAt(i);
      var idx;
      if (ch === '+') { idx = 62; }
      else if (ch === '/') { idx = 63; }
      else { idx = B64URL_ALFABETO.indexOf(ch); }
      if (idx < 0) { return null; }
      acc = (acc << 6) | idx;
      bits += 6;
      if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); }
    }
    return out;
  }

  function utf8DeBytes(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i];
      if (b < 128) { out += String.fromCharCode(b); }
      else if (b > 191 && b < 224) { out += String.fromCharCode(((b & 31) << 6) | (bytes[i + 1] & 63)); i += 1; }
      else if (b > 223 && b < 240) { out += String.fromCharCode(((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63)); i += 2; }
      else { out += String.fromCharCode(((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63)); i += 3; }
    }
    return out;
  }

  /* El jwt de ExploraCO es de DOS partes: "payloadB64.firma" (payload primero,
     ver api/utilidades.js blobVerificarJwt). Si llegara un jwt de 3 partes se
     usa la parte 1, que es el payload estandar. */
  function leerJwtPayload(token) {
    if (!token || typeof token !== 'string') { return null; }
    var partes = token.split('.');
    if (partes.length < 2) { return null; }
    var b64 = (partes.length >= 3) ? partes[1] : partes[0];
    var bytes = b64urlABytes(b64);
    if (!bytes) { return null; }
    var datos = null;
    try { datos = JSON.parse(utf8DeBytes(bytes)); } catch (e) { return null; }
    if (!datos || typeof datos !== 'object') { return null; }
    return datos;
  }

  function estadoJwt(token) {
    if (!token || typeof token !== 'string') { return { existe: false, valido: false, motivo: 'sin-token' }; }
    var datos = leerJwtPayload(token);
    if (!datos || !datos.sub || !datos.exp) { return { existe: true, valido: false, motivo: 'ilegible' }; }
    if (Number(datos.exp) <= Math.floor(Date.now() / 1000)) { return { existe: true, valido: false, motivo: 'caducado' }; }
    return { existe: true, valido: true, motivo: 'ok', jwt: token, uid: String(datos.sub) };
  }

  function refreshDisponible() {
    return !!(window.ExploraCO && typeof window.ExploraCO.refreshJwt === 'function');
  }

  function tipoDeArchivo(file) {
    var mime = String((file && file.type) || '');
    if (/^image\//i.test(mime)) { return 'foto'; }
    if (/^audio\//i.test(mime)) { return 'audio'; }
    if (/^video\//i.test(mime)) { return 'video'; }
    return null;
  }

  function mb(n) { return Math.round(n / (1024 * 1024)); }

  function validar(file, tipo) {
    if (!file) { return { ok: false, error: 'No elegiste ningun archivo' }; }
    var t = tipo || tipoDeArchivo(file);
    if (!t || !LIMITES[t]) { return { ok: false, error: 'Tipo de archivo no permitido' }; }
    if (!MIME_OK[t].test(String(file.type || ''))) {
      return { ok: false, error: 'Formato no permitido para ' + t };
    }
    if (file.size > LIMITES[t]) {
      return { ok: false, error: 'El archivo supera el limite de ' + mb(LIMITES[t]) + ' MB' };
    }
    return { ok: true, tipo: t };
  }

  function nombreSeguro(name) {
    return String(name || 'archivo').replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
  }

  /* ---- Optimizacion de imagen en el NAVEGADOR (Fase C) ----------------
     Redimensiona (sin AMPLIAR), respeta la orientacion EXIF y re-encoda a
     WebP (fallback JPEG). Al pasar por canvas se ELIMINAN los metadatos,
     incluida la geolocalizacion GPS. GIF/SVG nunca se tocan (animacion /
     vectorial). Si algo falla o no mejora, se sube el original. */
  var MAX_DIM = { perfil: 800, museo: 1600, album: 1600, destino: 1600, admin: 1600 };
  var OPTIMIZABLES = /^image\/(jpeg|png|webp|avif)$/i;

  function esOptimizable(file) {
    if (typeof document === 'undefined') { return false; }
    return OPTIMIZABLES.test(String((file && file.type) || ''));
  }

  function cargarImagen(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        return createImageBitmap(file, { imageOrientation: 'from-image' })
          .catch(function () { return createImageBitmap(file); });
      } catch (e) { /* cae al fallback <img> */ }
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
      img.src = url;
    });
  }

  function canvasABlob(canvas, tipo, calidad) {
    return new Promise(function (resolve) {
      if (!canvas.toBlob) { resolve(null); return; }
      canvas.toBlob(function (b) { resolve(b); }, tipo, calidad);
    });
  }

  function optimizarImagen(file, contexto) {
    if (!esOptimizable(file)) { return Promise.resolve(file); }
    var max = MAX_DIM[contexto] || 1600;
    return cargarImagen(file).then(function (img) {
      var w = img.width || img.naturalWidth || 0;
      var h = img.height || img.naturalHeight || 0;
      if (!w || !h) { return file; }
      var escala = Math.min(1, max / Math.max(w, h));
      var outW = Math.max(1, Math.round(w * escala));
      var outH = Math.max(1, Math.round(h * escala));
      var canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      var ctx = canvas.getContext('2d');
      if (!ctx) { return file; }
      ctx.drawImage(img, 0, 0, outW, outH);
      return canvasABlob(canvas, 'image/webp', 0.8).then(function (blob) {
        if (blob) { return blob; }
        return canvasABlob(canvas, 'image/jpeg', 0.82);
      }).then(function (blob) {
        if (!blob) { return file; }
        if (blob.size >= file.size && escala === 1) { return file; }
        var ext = (blob.type === 'image/webp') ? '.webp' : '.jpg';
        var nombre = String(file.name || 'foto').replace(/\.[A-Za-z0-9]+$/, '') + ext;
        try { return new File([blob], nombre, { type: blob.type, lastModified: Date.now() }); }
        catch (e) { blob.name = nombre; return blob; }
      });
    }).catch(function () { return file; });
  }

  /* ---- Errores accionables ---------------------------------------------
     El SDK @vercel/blob/client enmascara el cuerpo del error del servidor
     ("Vercel Blob: Failed to retrieve the client token"). Solo cuando la
     subida YA fallo se repite el evento del protocolo para leer el error
     real y traducirlo. */
  var ERRORES_HUMANOS = {
    ALMACENAMIENTO_NO_CONFIGURADO: 'El servicio de archivos no esta configurado. Avisa al equipo de ExploraCO.',
    SESION_REQUERIDA: 'Necesitas iniciar sesion con tu cuenta para subir este archivo.',
    SESION_INVALIDA: 'Tu sesion no corresponde a esta cuenta. Vuelve a iniciar sesion e intenta de nuevo.',
    PATHNAME_NO_AUTORIZADO: 'Tu sesion no puede guardar el archivo en esa carpeta. Vuelve a iniciar sesion e intenta otra vez.',
    PATHNAME_INVALIDO: 'El nombre del archivo no es valido. Renombralo sin simbolos raros e intenta de nuevo.'
  };

  function mensajeDeError(codigo, err) {
    var c = codigo ? String(codigo) : '';
    if (c && ERRORES_HUMANOS[c]) { return ERRORES_HUMANOS[c]; }
    if (c) { return 'No se pudo subir el archivo (' + c + '). Intenta de nuevo.'; }
    var original = (err && err.message) ? String(err.message) : '';
    if (/client token/i.test(original)) {
      return 'No se pudo subir el archivo: el servidor no autorizo la subida. Vuelve a iniciar sesion e intenta otra vez.';
    }
    if (original) { return 'No se pudo subir el archivo: ' + original; }
    return 'No se pudo subir el archivo. Intenta de nuevo.';
  }

  function diagnosticarSubida(pathname, clientPayload, headers) {
    if (typeof fetch !== 'function') { return Promise.resolve(null); }
    var cabeceras = { 'content-type': 'application/json' };
    if (headers && headers.Authorization) { cabeceras.Authorization = headers.Authorization; }
    var cuerpo = JSON.stringify({
      type: 'blob.generate-client-token',
      payload: { pathname: pathname, clientPayload: clientPayload, multipart: false }
    });
    return fetch(HANDLE_UPLOAD_URL, { method: 'POST', headers: cabeceras, body: cuerpo })
      .then(function (r) { return r.json(); })
      .then(function (d) { return (d && d.error) ? String(d.error) : null; })
      .catch(function () { return null; });
  }

  function sesionPublica(tipo) {
    return { modo: 'publico', prefijo: PREFIJO_PUBLICO + tipo + '/', jwt: null, uid: null, headers: null };
  }

  function sesionUsuario(jwt, uid, tipo) {
    return { modo: 'usuario', prefijo: PREFIJO_USUARIO + String(uid) + '/' + tipo + '/', jwt: jwt, uid: String(uid), headers: null };
  }

  function degradarOError(tipo, contexto) {
    if (contexto === 'destino') { return sesionPublica(tipo); }
    return Promise.reject(new Error(MENSAJE_SESION_REQUERIDA));
  }

  function resolverSesion(opts, tipo, contexto) {
    if (opts.adminToken) {
      return Promise.resolve({
        modo: 'admin',
        prefijo: PREFIJO_ADMIN + tipo + '/',
        jwt: null,
        uid: null,
        headers: { Authorization: 'Bearer ' + opts.adminToken }
      });
    }
    if (opts.modo === 'publico') { return Promise.resolve(sesionPublica(tipo)); }

    var info = estadoJwt(opts.jwt || jwtActual());
    if (info.valido) { return Promise.resolve(sesionUsuario(info.jwt, info.uid, tipo)); }

    if (info.existe && info.motivo === 'caducado' && refreshDisponible()) {
      return Promise.resolve(window.ExploraCO.refreshJwt()).then(function (nuevo) {
        var info2 = estadoJwt(nuevo || jwtActual());
        if (info2.valido) { return sesionUsuario(info2.jwt, info2.uid, tipo); }
        return degradarOError(tipo, contexto);
      }).catch(function () {
        return degradarOError(tipo, contexto);
      });
    }
    return Promise.resolve(degradarOError(tipo, contexto));
  }

  function subirConSDK(archivo, pathname, clientPayload, headers, opts) {
    return cargarCliente().then(function (m) {
      var opciones = {
        access: 'public',
        handleUploadUrl: HANDLE_UPLOAD_URL,
        clientPayload: clientPayload,
        multipart: false
      };
      if (headers) { opciones.headers = headers; }
      if (archivo.type) { opciones.contentType = archivo.type; }
      if (typeof opts.onProgress === 'function') {
        opciones.onUploadProgress = function (p) { opts.onProgress(p); };
      }
      return m.upload(pathname, archivo, opciones).then(function (result) {
        result.__sizeSubido = archivo.size;
        return result;
      });
    });
  }

  function subir(opts) {
    opts = opts || {};
    var v = validar(opts.file, opts.tipo);
    if (!v.ok) { return Promise.reject(new Error(v.error)); }
    var tipo = v.tipo;
    var contexto = opts.contexto || 'museo';

    return optimizarImagen(opts.file, contexto).then(function (archivo) {
      return resolverSesion(opts, tipo, contexto).then(function (sesion) {
        var pathname = sesion.prefijo + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + nombreSeguro(archivo.name);
        var clientPayload = JSON.stringify({
          jwt: sesion.jwt || null,
          usuario_id: sesion.uid || null,
          tipo: tipo,
          contexto: contexto
        });
        return subirConSDK(archivo, pathname, clientPayload, sesion.headers, opts).catch(function (err) {
          return diagnosticarSubida(pathname, clientPayload, sesion.headers).then(function (codigo) {
            throw new Error(mensajeDeError(codigo, err));
          });
        });
      });
    }).then(function (result) {
      return {
        url: result.url,
        pathname: result.pathname,
        contentType: result.contentType,
        tipo: tipo,
        size: result.__sizeSubido || opts.file.size
      };
    });
  }

  /* A1: confirmacion visual no tecnica tras una subida. NUNCA muestra la URL.
     Miniatura (si es imagen) + check SVG + mensaje + peso final. */
  function pesoLegible(n) {
    var b = parseInt(n, 10);
    if (!isFinite(b) || b <= 0) { return ''; }
    if (b < 1024) { return b + ' B'; }
    if (b < 1024 * 1024) { return (b / 1024).toFixed(1) + ' KB'; }
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function confirmacion(resultado, opts) {
    opts = opts || {};
    if (typeof document === 'undefined') { return; }
    var anterior = document.getElementById('mu-confirm');
    if (anterior && anterior.parentNode) { anterior.parentNode.removeChild(anterior); }
    var r = resultado || {};
    var esImagen = /^image\//i.test(String(r.contentType || ''));
    var miniatura = (opts.miniatura !== false && esImagen && r.url)
      ? '<img src="' + String(r.url).replace(/"/g, '&quot;') + '" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px;margin-right:10px;flex:0 0 auto">'
      : '';
    var check = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="flex:0 0 auto;margin-right:8px"><circle cx="12" cy="12" r="11" fill="#16a34a"></circle><path d="M7 12.5l3.2 3.2L17 8.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    var mensaje = String(opts.mensaje || 'Archivo subido correctamente');
    var peso = pesoLegible(r.size);
    var caja = document.createElement('div');
    caja.id = 'mu-confirm';
    caja.setAttribute('role', 'status');
    caja.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:10050;display:flex;align-items:center;max-width:92vw;padding:10px 16px;background:rgba(15,23,42,.96);border:1px solid rgba(22,163,74,.55);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.45);color:#fff;font-family:Outfit,sans-serif;font-size:13px;font-weight:600';
    caja.innerHTML = miniatura + check + '<span>' + mensaje + (peso ? (' <span style="color:rgba(255,255,255,.6);font-weight:500">' + peso + '</span>') : '') + '</span>';
    document.body.appendChild(caja);
    setTimeout(function () {
      if (caja && caja.parentNode) { caja.parentNode.removeChild(caja); }
    }, 4000);
  }

  window.MediaUpload = {
    LIMITES: LIMITES,
    tipoDeArchivo: tipoDeArchivo,
    validar: validar,
    subir: subir,
    confirmacion: confirmacion,
    MAX_DIM: MAX_DIM
  };
})();
