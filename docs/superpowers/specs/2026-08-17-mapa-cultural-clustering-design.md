# Mapa cultural: cercanía por geolocalización + clustering estilo Upland

**Fecha:** 2026-08-17
**Estado:** Aprobado
**Archivos afectados:** `index.html` (CSS, HTML topbar, JS Leaflet), `index-api-connector.js` (sin cambios funcionales — solo lectura de `MAPA_PLACES[]`)

## Contexto

La sección "Mapa cultural de Colombia" (`#mapa-section` en `index.html`) usa Leaflet 1.9.4 cargado desde CDN. Actualmente:

- El mapa inicializa a `center:[5.5,-74.5], zoom:6` (vista de todo el país) con `scrollWheelZoom:false` → los ~106 lugares con coordenadas (de `MAPA_PLACES[]`, poblado por `index-api-connector.js` desde `/api/destinos`) se solapan masivamente.
- `setMapaActive()` (línea ~2398) fuerza `mapaMap.setView([lat,lng],10)` → **resetea el zoom siempre** al seleccionar un lugar.
- No existe clustering.

Objetivo: mostrar los sitios más cercanos a la geolocalización del usuario con zoom profundo, corregir el reset de zoom al seleccionar, y agrupar pins que se solapan al alejar (comportamiento tipo Upland — círculo con conteo).

## Decisiones tomadas

1. **Fallback sin geolocalización:** centrar en Bogotá `(4.711,-74.072)` zoom 14 (mayor concentración de sitios).
2. **Lista lateral ordenada por cercanía:** al geolocalizar, reordenar por haversine y mostrar distancia en km.
3. **Controles:** botones `📍 Cerca de mí` y `🗺️ Colombia` en el topbar.
4. **Clustering custom por grilla de píxeles**, sin dependencias nuevas (descartado `Leaflet.markercluster` por CDN).

## Diseño

### 1. Carga y geolocalización

- **Vista inicial del mapa** = Bogotá `(4.711,-74.072)` zoom **14**. Los clusters ya son visibles en esta vista.
- La **primera vez** que `#mapa-section` entra al viewport → pedir `navigator.geolocation.getCurrentPosition` con timeout de 10s:
  - **Éxito:** `flyTo(userPos, 16)` + ordenar lista por distancia (ver §4).
  - **Negado / error / timeout:** quedarse en Bogotá zoom 14. No re-pedir permiso salvo que se use `📍 Cerca de mí`.
- **Botón `📍 Cerca de mí`:** re-pide geolocalización, recentra a zoom 16 y reordena la lista. Estado "Buscando…" mientras se resuelve; si niegan, aviso breve "No pudimos obtener tu ubicación — mostrando Bogotá".
- **Botón `🗺️ Colombia`:** `flyTo([5.5,-74.5], 6)` — vista país con clusters activos.
- La geolocalización se dispara con el init lazy (IntersectionObserver + timeout 2s), **no** al cargar la página.

### 2. Fix del zoom reset al seleccionar (`setMapaActive`)

Regla: **nunca alejar el zoom**.

```
targetZoom = max(zoomActual, primerZoomDondeElLugarQuedaAislado)
```

- Si el lugar ya es un pin individual visible → solo pan centrado (`setView([lat,lng], zoomActual)`) + abrir popup.
- Si el lugar está dentro de un cluster → subir de zoom solo lo necesario hasta que quede aislado (máx. 18), luego centrar y abrir popup.
- Cálculo de "primer zoom aislado": iterar de `zoomActual` a 18 y, con la grilla de §3, comprobar si la celda del marker contiene solo ese lugar (distancia al vecino > 40px). Primer nivel que cumpla → target.

### 3. Clustering custom por grilla de píxeles

- Disparo en `zoomend` y `moveend` (debounce 150ms).
- Proyectar los markers visibles (los que pasan el filtro de categoría) a píxeles con `map.project()`, agrupar en celdas de ~40px.
- **Celda con 1 marker** → pin individual (divIcon teardrop actual, `index.html` ~2342).
- **Celda con >1 marker** → cluster:
  - divIcon circular ~42px, borde dorado `--gold`, fondo oscuro, **conteo** en blanco, emoji del tipo de lugar más común en la celda.
  - `click` → `flyTo(centroide, zoom+2)` para dividir el cluster (comportamiento Upland).
- Rebuild del layer group en cada redibujado (clear + re-add). Mantener `mapaMarkers` para compatibilidad con `filterMapaPins`, `setMapaActive`, `toggleMapaSave`.
- `filterMapaPins(cat)` recalcula el set visible y re-clustera.
- Rendimiento: trivial con ~106 markers.

### 4. Lista lateral ordenada por cercanía

- Tras geolocalizar, guardar `mapaUserPos`.
- Haversine para cada lugar → `p._dist` (km, 1 decimal).
- `renderMapaList(cat)` usa la copia ordenada por distancia cuando `mapaUserPos` existe; mostrar `📍 Ciudad · 1.2 km` en `.mapa-li-loc`.
- El orden por distancia persiste mientras haya geolocalización activa.

### 5. Errores y edge cases

- Geolocation no disponible (file://, http no-https): cae a Bogotá zoom 14.
- 2+ lugares con las mismas coordenadas a zoom 18: se solapan (aceptado, sin spiderfy por ahora).
- `mapaActiveId`, popup con "Guardar en Mi Viaje", y `starHtml()` se mantienen sin cambios.
- `scrollWheelZoom` se habilita (true) para que el usuario pueda alejar y ver clustering.

## Testing

- Smoke manual en local (servir `index.html`): carga → Bogotá zoom 14 con clusters; aceptar geolocalización → flyTo 16 + lista ordenada por distancia; negar → queda Bogotá 14.
- Seleccionar lugar desde lista y desde marker: zoom no baja respecto al actual.
- Alejar a zoom 6 → clusters con conteos correctos; clic en cluster → zoom-in y división.
- Filtros de categoría siguen funcionando y re-clusteran.
- `node --check` sobre el JS extraído no aplica (JS inline); validar con consola del navegador (sin errores).
