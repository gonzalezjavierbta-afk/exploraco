/* media-upload.js - ExploraCO
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
 *   window.MediaUpload.subir({ file, tipo?, contexto?, jwt?, usuarioId?,
 *                              adminToken?, onProgress? })
 *     Devuelve Promise<{ url, pathname, contentType, size }>.
 *     - contexto: 'museo' | 'album' | 'perfil' | 'destino' (default 'museo').
 *     - jwt/usuarioId: se autodetectan via window.ExploraCO.
 *     - adminToken: sube como admin (prefijo admin/).
 *     - onProgress({ loaded, total, percentage }).
 *     - Sin sesion solo se permite contexto 'destino' + imagen (lo valida el
 *       servidor).
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
    return import(BLOB_CLIENT_URL).then(function (m) { _modulo = m; return m; });
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

  function usuarioIdActual() {
    var u = window.ExploraCO && window.ExploraCO.usuario;
    return (u && u.id) ? String(u.id) : null;
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

  function subir(opts) {
    opts = opts || {};
    var v = validar(opts.file, opts.tipo);
    if (!v.ok) { return Promise.reject(new Error(v.error)); }
    var tipo = v.tipo;
    var contexto = opts.contexto || 'museo';

    return optimizarImagen(opts.file, contexto).then(function (archivo) {
      var headers = null;
      var prefijo;

      if (opts.adminToken) {
        prefijo = 'admin/' + tipo + '/';
        headers = { Authorization: 'Bearer ' + opts.adminToken };
      } else {
        var jwt = opts.jwt || jwtActual();
        var uid = opts.usuarioId || usuarioIdActual();
        if (jwt && uid) { prefijo = 'usuarios/' + uid + '/' + tipo + '/'; }
        else { prefijo = 'publico/destino/' + tipo + '/'; }
      }

      var jwtPayload = opts.jwt || (opts.adminToken ? null : jwtActual());
      var uidPayload = opts.usuarioId || (opts.adminToken ? null : usuarioIdActual());
      var pathname = prefijo + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + nombreSeguro(archivo.name);
      var clientPayload = JSON.stringify({
        jwt: jwtPayload || null,
        usuario_id: uidPayload || null,
        tipo: tipo,
        contexto: contexto
      });

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
