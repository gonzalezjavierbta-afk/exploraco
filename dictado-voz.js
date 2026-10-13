/**
 * dictado-voz.js - Dictado por voz en el navegador (100% cliente).
 *
 * PROPOSITO
 * Enganchar un <input> a un boton de dictado por voz usando la Web Speech API.
 * Escribe el texto reconocido dentro del input respetando maxLength y notificando
 * al consumidor cuando la sesion termina y POR QUE (usuario / navegador / error).
 * No hace ninguna llamada a /api/ ni a ningun servidor: todo ocurre en el cliente.
 *
 * SOPORTE DE NAVEGADOR
 * - SI: Chrome (escritorio), Edge (escritorio), Safari (escritorio, requiere permiso).
 * - NO: Firefox (no implementa webkitSpeechRecognition en general).
 * - NO: iOS Safari / Safari en iPhone e iPad no soporta reconocimiento continuo.
 * - Si no hay soporte, iniciar() no rompe nada: devuelve false y no dibuja nada.
 *
 * USO
 *   window.DictadoVoz.iniciar(inputEl, btn, function (motivo) { ... });
 *   window.DictadoVoz.toggle(inputEl, btn, cb);
 *   window.DictadoVoz.detenerTodo();
 *
 * Dependencias externas: ninguna. Usa window.toast si existe, si no console.warn.
 */
(function (global) {
  'use strict';

  var LANG = 'es-CO';
  var CLASE_ACTIVA = 'grabando-activo';

  // Estado interno del modulo (una sola grabacion activa a la vez).
  var estado = {
    reconocimiento: null,
    input: null,
    boton: null,
    callback: null,
    textoBase: '',
    valorPrevio: '',
    arrancando: false
  };

  var windows = global.window || global;

  function avisar(mensaje) {
    if (typeof global.toast === 'function') {
      try {
        global.toast(mensaje, 'error');
        return;
      } catch (e) {
        /* cae al fallback silencioso */
      }
    }
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[DictadoVoz] ' + mensaje);
    }
  }

  function esSoportado() {
    return Boolean(
      global.SpeechRecognition || global.webkitSpeechRecognition
    );
  }

  function limpiarBoton(boton) {
    if (boton && boton.classList) {
      boton.classList.remove(CLASE_ACTIVA);
    }
  }

  // Trunca al maxLength si el input lo define.
  function aplicarMaxLength(inputEl, texto) {
    var limite = inputEl && inputEl.maxLength;
    if (typeof limite === 'number' && limite > 0 && texto.length > limite) {
      return texto.slice(0, limite);
    }
    return texto;
  }

  function escribir(inputEl, texto) {
    if (!inputEl) return;
    inputEl.value = aplicarMaxLength(inputEl, texto);
    if (typeof inputEl.dispatchEvent === 'function' && global.Event) {
      try {
        inputEl.dispatchEvent(new global.Event('input', { bubbles: true }));
      } catch (e) {
        /* algunos motores antiguos no aceptan el constructor; se ignora */
      }
    }
  }

  function finalizar(motivo) {
    var cb = estado.callback;
    estado.reconocimiento = null;
    estado.callback = null;
    limpiarBoton(estado.boton);
    estado.boton = null;
    estado.input = null;
    estado.textoBase = '';
    estado.valorPrevio = '';
    estado.arrancando = false;
    DictadoVoz.grabando = false;
    if (typeof cb === 'function') {
      try {
        cb(motivo);
      } catch (e) {
        if (console && console.warn) console.warn('[DictadoVoz] callback fallo', e);
      }
    }
  }

  // Detiene el motor sin invocar el callback de terminacion.
  function detenerSilencioso() {
    var rec = estado.reconocimiento;
    if (rec) {
      try {
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.stop();
      } catch (e) {
        /* motor ya detenido */
      }
    }
    finalizar('usuario');
  }

  var DictadoVoz = {
    // true mientras hay una sesion de reconocimiento viva.
    grabando: false,

    esSoportado: esSoportado,

    iniciar: function (inputEl, btn, alTerminar) {
      if (!esSoportado()) return false;
      if (!inputEl) return false;

      // Guardia de concurrencia: solo puede haber una grabacion activa.
      if (estado.reconocimiento && estado.input !== inputEl) {
        detenerSilencioso();
      }
      if (estado.reconocimiento && estado.input === inputEl) {
        return true;
      }

      var Ctor = global.SpeechRecognition || global.webkitSpeechRecognition;
      var rec = new Ctor();
      rec.lang = LANG;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      estado.reconocimiento = rec;
      estado.input = inputEl;
      estado.boton = btn;
      estado.callback = alTerminar;
      estado.textoBase = '';
      estado.valorPrevio = String(inputEl.value || '').trim();
      DictadoVoz.grabando = true;
      if (btn && btn.classList) btn.classList.add(CLASE_ACTIVA);

      rec.onresult = function (event) {
        var resultados = event && event.results;
        if (!resultados) return;
        var base = '';
        var interim = '';
        // Recorre TODOS los resultados: solo los finales pasan al buffer base.
        for (var i = 0; i < resultados.length; i++) {
          var r = resultados[i];
          if (!r) continue;
          var txt = r[0] ? r[0].transcript : '';
          if (r.isFinal) {
            base += txt;
          } else {
            interim += txt;
          }
        }
        estado.textoBase = base;
        var partes = [estado.valorPrevio, base, interim];
        var valor = partes.join(' ').replace(/\s+/g, ' ').trim();
        escribir(inputEl, valor);
      };

      rec.onerror = function (event) {
        var codigo = (event && event.error) || 'error';
        var mensaje = 'No se pudo iniciar el dictado (' + codigo + ').';
        if (codigo === 'not-allowed' || codigo === 'service-not-allowed') {
          mensaje = 'Permiso de microfono denegado. Activalo en el navegador.';
        } else if (codigo === 'audio-capture') {
          mensaje = 'No se encontro ningun microfono conectado.';
        } else if (codigo === 'no-speech') {
          mensaje = 'No se detecto voz. Intenta de nuevo.';
        } else if (codigo === 'network') {
          mensaje = 'Error de red en el servicio de dictado.';
        }
        if (codigo !== 'no-speech') avisar(mensaje);
        try {
          rec.stop();
        } catch (e) {
          /* onend se engancho tambien, el estado no queda colgado */
        }
        // Si onend no dispara, cerramos aqui con el motivo del error.
        if (estado.reconocimiento === rec) finalizar('error');
      };

      rec.onend = function () {
        // Chrome corta solo a los ~60s o por silencio: motivo 'navegador'.
        if (estado.reconocimiento === rec) finalizar('navegador');
      };

      try {
        rec.start();
      } catch (e) {
        avisar('El dictado ya estaba activo. Detenlo antes de reiniciarlo.');
        finalizar('error');
        return false;
      }
      return true;
    },

    detener: function (btn) {
      if (btn && !estado.boton) limpiarBoton(boton);
      if (!estado.reconocimiento) return false;
      detenerSilencioso();
      return true;
    },

    toggle: function (inputEl, btn, alTerminar) {
      if (estado.reconocimiento && (!inputEl || estado.input === inputEl)) {
        DictadoVoz.detener(btn);
        return false;
      }
      return DictadoVoz.iniciar(inputEl, btn, alTerminar);
    },

    // Para cerrar modales: el microfono nunca debe quedar abierto.
    detenerTodo: function () {
      if (estado.reconocimiento) {
        detenerSilencioso();
        return true;
      }
      return false;
    }
  };

  // Si la pestana se oculta, corta el microfono.
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) DictadoVoz.detenerTodo();
    });
    // Tambien al descargar la pagina.
    global.addEventListener('pagehide', function () {
      DictadoVoz.detenerTodo();
    });
  }

  global.DictadoVoz = DictadoVoz;
  // node
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DictadoVoz;
  }
})(typeof window !== 'undefined' ? window : this);