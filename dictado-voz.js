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
 * ANTI-DUPLICACION (bug reportado en Chrome Android)
 * El motor NO emite bloques disjuntos de final + interim: el interim de un
 * segmento YA contiene el texto que se acaba de finalizar en ESE MISMO segmento.
 * Sumar "todos los finales" + "todos los interims" duplicaba la ultima frase.
 * Ahora se consumen solo los resultados nuevos (desde event.resultIndex), se
 * guardan los finales en un buffer persistente (estado.textoBase) y todo se
 * une con fusion por solape: un fragmento que repite y extiende lo ya acumulado
 * lo REEMPLAZA, no se concatena.
 *
 * CICLO DE VIDA
 * - finalizar() anula los 4 handlers de la instancia que cierra y la aborta:
 *   ningun motor huerfano sigue escribiendo con el estado ya reseteado.
 * - estado.arrancando bloquea la reentrada por toques repetidos durante el
 *   arranque asincrono; el estado activo se marca en el onstart REAL.
 * - Si el motor corta por silencio o limite del navegador, NO se relanza solo:
 *   se avisa de que hay que reanudar y de que lo dictado se conserva.
 * - Diagnostico dormido: con ?dvdebug=1 en la URL se dibuja un contador de
 *   resultados recibidos y estado del motor. Sin ese flag no toca el DOM.
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
  var MSG_CORTE = 'El dictado se detuvo solo. Pulsa Dictar para reanudar; lo que ya dictaste se conserva.';
  // Longitud minima de un solape sufijo/prefijo para considerarlo repeticion.
  var MIN_SOLAPE = 3;

  // Estado interno del modulo (una sola grabacion activa a la vez).
  var estado = {
    reconocimiento: null,
    input: null,
    boton: null,
    callback: null,
    // Texto que ya estaba en el campo (tecleado a mano o dictado antes).
    prefijo: '',
    // Buffer persistente de lo dictado y ya confirmado (resultados finales).
    textoBase: '',
    // Ultimo valor que escribio el modulo: sirve para detectar edicion manual.
    ultimoEscrito: null,
    // true entre start() y el onstart real (bloquea la reentrada por toques).
    arrancando: false,
    // Diagnostico (solo se pinta con ?dvdebug=1).
    eventosResultado: 0,
    resultados: 0
  };

  // Nodos opcionales creados por el modulo (aviso de corte y contador debug).
  var avisoEl = null;
  var nodoDebug = null;

  function normalizar(texto) {
    return String(texto === null || texto === undefined ? '' : texto)
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Une dos fragmentos con un solo espacio y colapsa el resto. Los transcripts
     de Chrome suelen traer espacio final: unirlos a ciegas pega palabras. */
  function unirTexto(parteA, parteB) {
    var a = normalizar(parteA);
    var b = normalizar(parteB);
    if (!a) return b;
    if (!b) return a;
    return normalizar(a + ' ' + b);
  }

  /* Fusion por solape. Devuelve el texto acumulado + lo realmente nuevo:
     - fragmento que repite y extiende lo acumulado -> reemplaza (anti-duplicacion);
     - fragmento que ya estaba contenido al inicio    -> se ignora (reemision);
     - solape sufijo/prefijo en frontera de palabra   -> se cose una sola vez.
     Nota: repetir a proposito un fragmento identico no se duplica; es el precio
     de no duplicar el interim del mismo segmento (bug de Chrome Android). */
  function fusionarSolape(acumulado, fragmento) {
    var a = normalizar(acumulado);
    var b = normalizar(fragmento);
    if (!a) return b;
    if (!b) return a;
    if (a === b) return a;
    var al = a.toLowerCase();
    var bl = b.toLowerCase();
    if (bl.indexOf(al) === 0) return b;
    if (al.indexOf(bl) === 0) return a;
    // Solape por PALABRAS: el motor reemite una frase que cruza dos segmentos
    // ("la playa grande" + "grande azul"). Se cose una sola vez.
    var palabrasA = al.split(' ');
    var palabrasB = bl.split(' ');
    var maxPalabras = Math.min(palabrasA.length, palabrasB.length);
    for (var m = maxPalabras; m >= 1; m--) {
      if (palabrasA.slice(palabrasA.length - m).join(' ') !==
          palabrasB.slice(0, m).join(' ')) continue;
      return normalizar(a + ' ' + b.split(' ').slice(m).join(' '));
    }
    // Solape por CARACTERES en frontera de palabra (interim a medio formar).
    var max = Math.min(al.length, bl.length);
    for (var k = max; k >= MIN_SOLAPE; k--) {
      if (al.slice(al.length - k) !== bl.slice(0, k)) continue;
      if (k < bl.length && bl.charAt(k) !== ' ') continue;
      if (k < al.length && al.charAt(al.length - k - 1) !== ' ') continue;
      return normalizar(a + ' ' + b.slice(k));
    }
    return normalizar(a + ' ' + b);
  }

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

  /* --------------------------- Diagnostico --------------------------- */

  function depurarActivado() {
    try {
      var loc = global.location;
      var busca = loc && typeof loc.search === 'string' ? loc.search : '';
      return busca.indexOf('dvdebug=1') !== -1;
    } catch (e) {
      return false;
    }
  }

  function estadoMotor() {
    if (estado.reconocimiento) return estado.arrancando ? 'arrancando' : 'activo';
    return 'detenido';
  }

  function refrescarDebug() {
    if (!depurarActivado() || !nodoDebug) return;
    nodoDebug.textContent = '[dvdebug eventos=' + estado.eventosResultado +
      ' resultados=' + estado.resultados + ' motor=' + estadoMotor() + ']';
  }

  // Dormido salvo ?dvdebug=1: sin el flag no se crea ni se toca ningun nodo.
  function actualizarDebug(boton) {
    if (!depurarActivado()) return;
    var doc = global.document;
    if (!doc || typeof doc.createElement !== 'function') return;
    if (!nodoDebug) {
      nodoDebug = doc.createElement('span');
      nodoDebug.id = 'dv-debug';
      nodoDebug.className = 'dv-debug';
      if (typeof nodoDebug.setAttribute === 'function') {
        nodoDebug.setAttribute('aria-hidden', 'true');
      }
      nodoDebug.style.fontSize = '11px';
      nodoDebug.style.opacity = '.75';
      nodoDebug.style.marginLeft = '6px';
      var padre = boton && boton.parentNode;
      if (padre && typeof padre.appendChild === 'function') padre.appendChild(nodoDebug);
    }
    refrescarDebug();
  }

  /* ------------------------ Aviso de corte --------------------------- */

  function limpiarAviso() {
    if (avisoEl && avisoEl.parentNode && typeof avisoEl.parentNode.removeChild === 'function') {
      avisoEl.parentNode.removeChild(avisoEl);
    }
    avisoEl = null;
    var doc = global.document;
    if (doc && typeof doc.getElementById === 'function') {
      var huerfano = doc.getElementById('dv-aviso');
      if (huerfano && huerfano.parentNode && typeof huerfano.parentNode.removeChild === 'function') {
        huerfano.parentNode.removeChild(huerfano);
      }
    }
  }

  /* Corte del motor (silencio, limite del navegador): se avisa por toast si la
     pagina lo expone, si no con una etiqueta del silo dv- junto al boton. */
  function avisarCorte(boton) {
    if (typeof global.toast === 'function') {
      try {
        global.toast(MSG_CORTE);
        return;
      } catch (e) {
        /* si toast falla, se usa la etiqueta */
      }
    }
    var doc = global.document;
    if (!doc || typeof doc.createElement !== 'function') return;
    if (!avisoEl) {
      avisoEl = doc.createElement('span');
      avisoEl.id = 'dv-aviso';
      avisoEl.className = 'dv-aviso';
      if (typeof avisoEl.setAttribute === 'function') avisoEl.setAttribute('role', 'status');
      avisoEl.style.display = 'inline-block';
      avisoEl.style.marginLeft = '8px';
      avisoEl.style.fontSize = '12px';
      var padre = boton && boton.parentNode;
      if (padre && typeof padre.appendChild === 'function') padre.appendChild(avisoEl);
    }
    avisoEl.textContent = MSG_CORTE;
  }

  /* --------------------------- Ciclo de vida ------------------------- */

  function finalizar(motivo) {
    var rec = estado.reconocimiento;
    var cb = estado.callback;

    // Ningun motor huerfano puede seguir escribiendo: se anulan los 4 handlers
    // de ESTA instancia y se aborta antes de tocar el estado.
    if (rec) {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.onstart = null;
      } catch (e) {
        /* motores de terceros con setters estrictos */
      }
      try {
        if (typeof rec.abort === 'function') rec.abort();
      } catch (e) {
        /* abort() falla si el motor ya estaba cerrado */
      }
    }

    estado.reconocimiento = null;
    estado.callback = null;
    limpiarBoton(estado.boton);
    estado.boton = null;
    estado.input = null;
    estado.prefijo = '';
    estado.textoBase = '';
    estado.ultimoEscrito = null;
    estado.arrancando = false;
    DictadoVoz.grabando = false;
    refrescarDebug();

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
        rec.onstart = null;
        if (typeof rec.stop === 'function') rec.stop();
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

      // Guardia de concurrencia: solo puede haber una grabacion activa. Si ya
      // hay una sesion (arrancando o activa) sobre ESTE input, no se crea otro
      // motor: los toques repetidos durante el arranque asincrono se ignoran.
      if (estado.reconocimiento) {
        if (estado.input === inputEl) return true;
        detenerSilencioso();
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
      // El texto que ya hay en el campo es el prefijo de la sesion: sobrevive a
      // la reanudacion y no se duplica con lo que se dicte a continuacion.
      estado.prefijo = normalizar(inputEl.value);
      estado.textoBase = '';
      estado.ultimoEscrito = estado.prefijo;
      estado.arrancando = true;
      estado.eventosResultado = 0;
      estado.resultados = 0;
      limpiarAviso();

      rec.onstart = function () {
        if (estado.reconocimiento !== rec) return;
        // El estado activo se marca en el onstart REAL, no antes de start().
        estado.arrancando = false;
        DictadoVoz.grabando = true;
        if (btn && btn.classList) btn.classList.add(CLASE_ACTIVA);
        actualizarDebug(btn);
      };

      rec.onresult = function (event) {
        // Handler de una instancia ya cerrada: no escribe nada.
        if (estado.reconocimiento !== rec) return;
        var resultados = event && event.results;
        if (!resultados) return;
        var n = resultados.length || 0;

        // El usuario edito el campo a mano mientras dictaba: ese texto pasa a
        // ser el prefijo de la sesion y no se pisa ni se duplica.
        if (estado.ultimoEscrito !== null &&
            normalizar(inputEl.value) !== estado.ultimoEscrito) {
          estado.prefijo = normalizar(inputEl.value);
          estado.textoBase = '';
          estado.ultimoEscrito = null;
        }

        // Solo lo NUEVO desde event.resultIndex: no se re-suman los bloques ya
        // procesados en eventos anteriores.
        var desde = 0;
        if (typeof event.resultIndex === 'number' && event.resultIndex > 0) {
          desde = event.resultIndex;
        }
        if (desde > n) desde = n;

        var finales = '';
        var interims = '';
        for (var i = desde; i < n; i++) {
          var r = resultados[i];
          if (!r || !r[0]) continue;
          var txt = String(r[0].transcript || '');
          if (!txt) continue;
          if (r.isFinal) {
            finales = unirTexto(finales, txt);
          } else {
            interims = unirTexto(interims, txt);
          }
          estado.resultados += 1;
        }
        estado.eventosResultado += 1;

        // Los finales nuevos entran al buffer persistente.
        if (finales) {
          estado.textoBase = fusionarSolape(estado.textoBase, finales);
        }
        // El interim se muestra SOBRE el buffer, con la misma fusion por solape:
        // en Chrome Android el interim del segmento repite lo recien finalizado.
        var visible = interims
          ? fusionarSolape(estado.textoBase, interims)
          : estado.textoBase;

        escribir(inputEl, unirTexto(estado.prefijo, visible));
        estado.ultimoEscrito = normalizar(inputEl.value);
        actualizarDebug(btn);
      };

      rec.onerror = function (event) {
        if (estado.reconocimiento !== rec) return;
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
        if (estado.reconocimiento !== rec) return;
        // Chrome corta solo a los ~60s o por silencio: motivo 'navegador'. NO se
        // relanza solo: se avisa de que hay que reanudar y que lo dictado sigue.
        avisarCorte(btn);
        finalizar('navegador');
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
      if (btn && !estado.boton) limpiarBoton(btn);
      if (!estado.reconocimiento) return false;
      detenerSilencioso();
      return true;
    },

    toggle: function (inputEl, btn, alTerminar) {
      if (estado.reconocimiento) {
        // Segundo toque durante el arranque asincrono: se ignora (ni cancela la
        // sesion ni abre un motor paralelo).
        if (estado.arrancando && estado.input === inputEl) return true;
        if (!inputEl || estado.input === inputEl) {
          DictadoVoz.detener(btn);
          return false;
        }
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
