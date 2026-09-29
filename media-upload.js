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

  function subir(opts) {
    opts = opts || {};
    var v = validar(opts.file, opts.tipo);
    if (!v.ok) { return Promise.reject(new Error(v.error)); }
    var tipo = v.tipo;
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
    var pathname = prefijo + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + nombreSeguro(opts.file.name);
    var clientPayload = JSON.stringify({
      jwt: jwtPayload || null,
      usuario_id: uidPayload || null,
      tipo: tipo,
      contexto: opts.contexto || 'museo'
    });

    return cargarCliente().then(function (m) {
      var opciones = {
        access: 'public',
        handleUploadUrl: HANDLE_UPLOAD_URL,
        clientPayload: clientPayload,
        multipart: false
      };
      if (headers) { opciones.headers = headers; }
      if (opts.file.type) { opciones.contentType = opts.file.type; }
      if (typeof opts.onProgress === 'function') {
        opciones.onUploadProgress = function (p) { opts.onProgress(p); };
      }
      return m.upload(pathname, opts.file, opciones);
    }).then(function (result) {
      return {
        url: result.url,
        pathname: result.pathname,
        contentType: result.contentType,
        tipo: tipo,
        size: opts.file.size
      };
    });
  }

  window.MediaUpload = {
    LIMITES: LIMITES,
    tipoDeArchivo: tipoDeArchivo,
    validar: validar,
    subir: subir
  };
})();
