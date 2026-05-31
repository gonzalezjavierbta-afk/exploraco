/**
 * ExploraCO — Admin API Bridge
 * 
 * Incluye este script en admin.html ANTES del cierre </body>
 * para conectar el admin existente con la API de Neon.
 * 
 * <script src="admin-api-bridge.js"></script>
 * 
 * Lo que hace:
 * 1. Intercepta savePlace() para guardar en DB además de localStorage
 * 2. Intercepta deletePlace() para borrar en DB
 * 3. Sincroniza places desde DB al cargar (DB tiene prioridad)
 * 4. Conecta publishAll() para usar la API en vez de fetch de archivos
 */

(function() {
  'use strict';

  // ── Configuración ──────────────────────────────────────
  var API_BASE = window.EXPLORACО_API || '';  // '' = mismo dominio Netlify
  var ADMIN_TOKEN = window.ADMIN_SECRET || localStorage.getItem('admin_secret') || '';

  // Pedir token si no existe
  if (!ADMIN_TOKEN) {
    ADMIN_TOKEN = prompt('Token de admin (ADMIN_SECRET de Netlify):') || '';
    if (ADMIN_TOKEN) localStorage.setItem('admin_secret', ADMIN_TOKEN);
  }

  var AUTH_HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + ADMIN_TOKEN,
  };

  // ── Estado de sincronización ──────────────────────────
  var syncStatus = { ok: false, lastSync: null, pendingUploads: 0 };

  function showSyncBadge(text, color) {
    var badge = document.getElementById('api-sync-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.style.background = color || '#888';
    badge.style.display = 'block';
  }

  // ── API helpers ────────────────────────────────────────
  async function apiGet(path) {
    var res = await fetch(API_BASE + path, { headers: AUTH_HEADERS });
    if (!res.ok) throw new Error('API error ' + res.status);
    return res.json();
  }

  async function apiPost(path, body) {
    var res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function apiPut(path, body) {
    var res = await fetch(API_BASE + path, {
      method: 'PUT',
      headers: AUTH_HEADERS,
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function apiDelete(path) {
    var res = await fetch(API_BASE + path, {
      method: 'DELETE',
      headers: AUTH_HEADERS,
    });
    return res.json();
  }

  // ── Mapear place del admin → formato API ──────────────
  function placeToApi(p) {
    return {
      slug:           p.slug || '',
      nombre:         p.name || '',
      categoria_slug: p.cat || 'sitio',
      lead:           p.lead || '',
      desc:           p.desc || '',
      highlight:      p.highlight || '',
      city:           p.city || '',
      region:         p.region || '',
      barrio:         p.barrio || '',
      address:        p.address || '',
      lat:            parseFloat(p.lat) || null,
      lng:            parseFloat(p.lng) || null,
      whatsapp:       p.whatsapp || '',
      tel:            p.tel || '',
      email:          p.email || '',
      web:            p.web || '',
      instagram:      p.instagram || '',
      booking:        p.booking || '',
      price:          p.price || '',
      emoji:          p.emoji || '📍',
      hero_bg:        p.hero_bg || 'linear-gradient(135deg,#111,#222)',
      foto_hero:      p.photos && p.photos[0] ? (p.photos[0].url || p.photos[0]) : null,
      rating:         parseFloat(p.rating) || 0,
      reviews:        parseInt(p.reviews) || 0,
      status:         p.status || 'draft',
      destacado:      p.destacado || false,
      photos:         p.photos || [],
      // Hostal
      habs:           p.habs || [],
      amenities:      p.amenities || [],
      scores:         p.scores || {},
      faqs:           p.faqs || [],
      transport:      p.transport || [],
      hostalEvents:   p.hostalEvents || [],
      checkin:        p.checkin || '',
      checkout:       p.checkout || '',
      bookingUrl:     p.bookingUrl || '',
      hostelworld:    p.hostelworld || '',
      airbnb:         p.airbnb || '',
    };
  }

  // ── Mapear respuesta API → formato admin ──────────────
  function apiToPlace(d) {
    return {
      id:          d.id || Date.now(),
      slug:        d.slug || '',
      name:        d.nombre || '',
      cat:         d.categoria_slug || 'sitio',
      lead:        d.lead || '',
      desc:        d.descripcion || '',
      highlight:   d.highlight || '',
      city:        d.ciudad || '',
      region:      d.region || '',
      barrio:      d.barrio || '',
      address:     d.direccion || '',
      lat:         d.lat || '',
      lng:         d.lng || '',
      whatsapp:    d.whatsapp || '',
      tel:         d.telefono || '',
      email:       d.email || '',
      web:         d.web || '',
      instagram:   d.instagram || '',
      booking:     d.booking || '',
      price:       d.precio_desde || '',
      emoji:       d.emoji || '📍',
      hero_bg:     d.hero_bg || '',
      photos:      d.photos || (d.foto_hero ? [{ url: d.foto_hero, cap: '' }] : []),
      rating:      d.rating || 0,
      reviews:     d.total_resenas || 0,
      status:      d.status || 'published',
      destacado:   d.destacado || false,
      habs:        d.habitaciones || [],
      amenities:   d.amenidades || [],
      scores:      d.scores || {},
      faqs:        d.faqs || [],
      transport:   d.transporte || [],
      hostalEvents: d.eventos_hostal || [],
      checkin:     d.checkin || '',
      checkout:    d.checkout || '',
      bookingUrl:  d.booking_url || '',
      hostelworld: d.hostelworld_url || '',
      airbnb:      d.airbnb_url || '',
    };
  }

  // ── Map de IDs locales → UUIDs de Neon ───────────────
  var localToUUID = {};  // { localId: 'uuid-neon' }

  function getUUID(localId) {
    return localToUUID[localId] || null;
  }

  // ── Interceptar savePlace ──────────────────────────────
  window.addEventListener('exploracо:place-saved', async function(e) {
    var place = e.detail;
    if (!place) return;

    showSyncBadge('⏳ Sincronizando...', '#f59e0b');

    try {
      var uuid = getUUID(place.id);
      var payload = placeToApi(place);
      var result;

      if (uuid) {
        // Actualizar en DB
        result = await apiPut('/api/admin-destinos?id=' + uuid, payload);
      } else {
        // Crear en DB
        result = await apiPost('/api/admin-destinos', payload);
        if (result.ok && result.data && result.data.id) {
          localToUUID[place.id] = result.data.id;
          localStorage.setItem('local_to_uuid', JSON.stringify(localToUUID));
        }
      }

      if (result && result.ok) {
        showSyncBadge('✓ Sincronizado con DB', '#16a34a');
        setTimeout(() => showSyncBadge('', ''), 3000);
      } else {
        showSyncBadge('⚠️ Solo guardado local', '#f59e0b');
      }
    } catch (err) {
      console.warn('[bridge] savePlace error:', err.message);
      showSyncBadge('⚠️ Sin conexión a DB', '#ef4444');
    }
  });

  // ── Interceptar deletePlace ───────────────────────────
  window.addEventListener('exploracо:place-deleted', async function(e) {
    var localId = e.detail;
    var uuid = getUUID(localId);
    if (!uuid) return;

    try {
      await apiDelete('/api/admin-destinos?id=' + uuid);
      delete localToUUID[localId];
      localStorage.setItem('local_to_uuid', JSON.stringify(localToUUID));
    } catch (err) {
      console.warn('[bridge] deletePlace error:', err.message);
    }
  });

  // ── Sincronizar desde DB al iniciar ──────────────────
  async function syncFromDB() {
    showSyncBadge('⏳ Cargando desde DB...', '#3b82f6');

    try {
      var data = await apiGet('/api/admin-destinos?limit=500');
      if (!data.ok || !data.data) throw new Error('Sin datos');

      // Reconstruir el mapa local→UUID
      localToUUID = JSON.parse(localStorage.getItem('local_to_uuid') || '{}');

      // Convertir destinos de DB al formato del admin
      var dbPlaces = data.data.map(apiToPlace);

      // Merge: DB tiene prioridad, pero conservar IDs locales para coincidencias por slug
      var localPlaces = window.places || [];
      var mergedMap = {};

      // Poner locales primero
      localPlaces.forEach(function(p) { mergedMap[p.slug] = p; });

      // Sobreescribir con DB (más reciente)
      dbPlaces.forEach(function(p) {
        var local = Object.values(localToUUID).indexOf(p.id) >= 0
          ? localPlaces.find(function(l) { return localToUUID[l.id] === p.id; })
          : null;

        if (local) {
          // Mantener ID local pero datos de DB
          mergedMap[p.slug] = Object.assign({}, p, { id: local.id });
          localToUUID[local.id] = p.id;
        } else {
          mergedMap[p.slug] = p;
        }
      });

      localStorage.setItem('local_to_uuid', JSON.stringify(localToUUID));

      var merged = Object.values(mergedMap);

      // Actualizar el estado global del admin
      if (window.places !== undefined) {
        window.places = merged;
        try {
          localStorage.setItem('admin_places', JSON.stringify(merged));
        } catch(e) {}

        // Re-renderizar si las funciones existen
        if (typeof window.renderTabla === 'function') window.renderTabla();
        if (typeof window.renderDashboard === 'function') window.renderDashboard();
        if (typeof window.updateNavCounts === 'function') window.updateNavCounts();
      }

      syncStatus = { ok: true, lastSync: new Date(), pendingUploads: 0 };
      showSyncBadge('✓ DB conectada · ' + dbPlaces.length + ' lugares', '#16a34a');
      setTimeout(() => showSyncBadge('● DB', '#16a34a'), 4000);

    } catch (err) {
      console.warn('[bridge] syncFromDB error:', err.message);
      showSyncBadge('⚠️ Offline — usando localStorage', '#f59e0b');
    }
  }

  // ── Añadir badge de sincronización al DOM ─────────────
  function injectSyncUI() {
    // Badge en el topbar
    var badge = document.createElement('span');
    badge.id = 'api-sync-badge';
    badge.style.cssText = [
      'display:none;padding:3px 10px;border-radius:20px;',
      'font-size:10px;font-weight:700;color:#fff;',
      'margin-left:8px;cursor:pointer;',
    ].join('');
    badge.title = 'Estado de sincronización con Neon DB';
    badge.onclick = function() { syncFromDB(); };

    // Buscar el topbar
    var topbar = document.querySelector('.topbar, .tb-right, header');
    if (topbar) topbar.appendChild(badge);

    // Botón sync manual en la barra lateral
    var snav = document.querySelector('.snav');
    if (snav) {
      var syncBtn = document.createElement('div');
      syncBtn.style.cssText = 'padding:8px 16px;cursor:pointer;color:rgba(255,255,255,.4);font-size:11px;border-top:1px solid rgba(255,255,255,.06);margin-top:auto';
      syncBtn.innerHTML = '🔄 Sincronizar DB';
      syncBtn.onclick = syncFromDB;
      snav.appendChild(syncBtn);
    }
  }

  // ── Patch de las funciones del admin ─────────────────
  function patchAdminFunctions() {
    // Patch savePlace para disparar evento
    var _savePlace = window.savePlace;
    if (typeof _savePlace === 'function') {
      window.savePlace = function() {
        _savePlace.apply(this, arguments);
        // El admin ya guardó en localStorage, ahora sincronizamos
        // Buscar el lugar recién guardado
        setTimeout(function() {
          var places = window.places || [];
          var newest = places[places.length - 1];
          if (newest) {
            window.dispatchEvent(new CustomEvent('exploracо:place-saved', { detail: newest }));
          }
        }, 100);
      };
    }

    // Patch deletePlace para disparar evento
    var _deletePlace = window.deletePlace;
    if (typeof _deletePlace === 'function') {
      window.deletePlace = function(id) {
        _deletePlace.apply(this, [id]);
        window.dispatchEvent(new CustomEvent('exploracо:place-deleted', { detail: id }));
      };
    }

    // Patch publishAll para usar DB directamente
    var _publishAll = window.publishAll;
    if (typeof _publishAll === 'function') {
      window.publishAll = async function() {
        // Sincronizar todo primero
        showSyncBadge('⏳ Publicando en DB...', '#f59e0b');
        var places = window.places || [];
        var published = places.filter(function(p) { return p.status === 'published'; });

        var ok = 0, errors = 0;
        for (var i = 0; i < published.length; i++) {
          var p = published[i];
          try {
            var uuid = getUUID(p.id);
            var payload = placeToApi(p);
            var result;
            if (uuid) {
              result = await apiPut('/api/admin-destinos?id=' + uuid, payload);
            } else {
              result = await apiPost('/api/admin-destinos', payload);
              if (result.ok && result.data) {
                localToUUID[p.id] = result.data.id;
              }
            }
            if (result && result.ok) ok++;
            else errors++;
          } catch(e) { errors++; }
        }

        localStorage.setItem('local_to_uuid', JSON.stringify(localToUUID));
        showSyncBadge('✓ DB: ' + ok + ' publicados', '#16a34a');

        // También ejecutar el publishAll original (descarga ZIP)
        _publishAll.apply(this, arguments);
      };
    }
  }

  // ── Inicialización ────────────────────────────────────
  function init() {
    // Cargar mapa de IDs guardado
    try {
      localToUUID = JSON.parse(localStorage.getItem('local_to_uuid') || '{}');
    } catch(e) { localToUUID = {}; }

    injectSyncUI();

    // Sincronizar después de que el admin cargue
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(syncFromDB, 800);  // dar tiempo al admin para inicializar
        setTimeout(patchAdminFunctions, 1000);
      });
    } else {
      setTimeout(syncFromDB, 800);
      setTimeout(patchAdminFunctions, 1000);
    }
  }

  init();

})();
