# BLUEPRINT.md - ExploraCO

## Estado
- Version: v1.0
- Referencia tecnica principal del proyecto (AI-DOS Cap. 9.4)
- Basado en: pagina-destino.js v9, admin-destinos.js v2, admin.html (baseline aproximado ~7.800 lineas -- ver NEXT.md para el conteo exacto; por ADR-006 este numero es solo referencial, nunca metodo de verificacion)

## 1. Arquitectura general

ExploraCO sigue una arquitectura serverless ligera: sin frameworks frontend, sin ORM, con generacion de HTML 100% en servidor mediante concatenacion de strings (Vanilla JS estricto, ver DECISIONS.md ADR-001).

Flujo completo del sistema:

```
ADMIN (admin.html)
  -> collectPlace() recoge todos los campos del formulario
  -> _placeToAPI(p) traduce al formato Neon (incluye tagsObj)
  -> _syncToNeon(p) hace POST/PUT a /api/admin-destinos
  -> admin-destinos.js v2 (INSERT/UPDATE, merge JSONB)
  -> Neon PostgreSQL
  -> Visitante pide /{slug}.html
  -> vercel.json rewrite -> /api/pagina-destino?slug=...
  -> pagina-destino.js v9 hace SELECT en 4 tablas
  -> buildHTML() ensambla el HTML final
  -> respuesta enviada con Cache-Control: no-store
```

## 2. Endpoints (api/*.js) - presupuesto fijo: 8 de 8 (Vercel Hobby)

| Endpoint | Metodo(s) | Responsabilidad |
|---|---|---|
| destinos.js | GET | Listado publico, filtros, modo=mapa, stats (Cache s-maxage=10) |
| usuarios.js | GET/POST | Perfil, leaderboard, upsert de usuario |
| interacciones.js | GET/POST | Rese\u00f1as, guardados, visitas, calculo de XP |
| admin-destinos.js | GET/POST/PUT/DELETE | CRUD completo con auth Bearer (v2 reescrito) |
| publicar-lugar.js | POST | Formulario publico, crea destino en status=draft |
| pagina-destino.js | GET | HTML dinamico premium por slug (v9, motor principal) |
| admin.js | GET/POST | Recursos admin: solicitudes, rese\u00f1as, destacado, notificaciones |
| utilidades.js | GET | sitemap, visitas, fotos, diagnostico |

Nota critica: el limite de 8 funciones esta en su maximo. Cualquier endpoint nuevo requiere fusionar responsabilidades dentro de un archivo existente via query params (patron ya usado en admin.js y utilidades.js), no crear un archivo nuevo.

Autenticacion: header `Authorization: Bearer exploraco12345`. Variables de entorno en Vercel: `DATABASE_URL`, `ADMIN_SECRET`, `RESEND_API_KEY` (pendiente de configurar, ver TASKS.md).

`vercel.json` rewrites clave:
```
/:slug.html  -> /api/pagina-destino?slug=:slug
/sitemap.xml -> /api/utilidades?tipo=sitemap
```

## 3. Modelo de datos (Neon PostgreSQL)

### Tabla `destinos` (principal)
Campos fijos comunes a las 4 categorias: id, slug, nombre, categoria_slug, lead, descripcion, highlight, ciudad, region, barrio, lat, lng, whatsapp, telefono, email, web, instagram, precio_desde, horario, emoji, hero_bg, foto_hero, rating, total_resenas, status, destacado, booking, hostelworld, airbnb, tipo, capacidad, como_llegar, tags (jsonb), creado_en, actualizado_en.

Nota de nomenclatura obligatoria (evita el bug historico de campos vacios, ver BUGS_HISTORICOS.md BUG-007): usar siempre `ciudad` (no `city`), `descripcion` (no `desc`), `telefono` (no `tel`), `precio_desde` (no `price`), `creado_en` (no `created_at`).

### Tabla `destinos_fotos`
Galeria de imagenes por destino: id, destino_id (FK), url, caption, orden, es_hero, creado_en.

### Tabla `destinos_detalles`
Detalles estructurados (principalmente hostal, pero reutilizable): destino_id (PK/FK), checkin, checkout, habitaciones (jsonb), amenidades (jsonb), faqs (jsonb), booking_url, hostelworld_url, airbnb_url, scores (jsonb).

### Tabla `interacciones`
Rese\u00f1as, guardados y visitas: id, usuario_id (FK, nullable = anonimo), destino_id (FK), tipo (resena/guardado/visita), rating (1-5), texto, xp_ganado, creado_en.

### Tabla `usuarios`
Perfil y gamificacion: id, email (unique), nombre, xp_total, nivel, badge_actual, total_resenas, creado_en.

## 4. Motor de tags JSONB (modulo central)

El campo `destinos.tags` es el mecanismo que permite escalar a nuevas categorias sin alterar el esquema relacional. Cada categoria define su propia forma de tags:

- **Sitio** (implementado): tipo_actividad, dificultad, dificultad_desc, dificultad_tags[] (Sprint 2: {texto, apto:boolean}), duracion, altitud, horario_visita, precio_entrada, distancia, como_llegar, temporada (legado, rangos de texto), temporada_matriz (Sprint 2: objeto {Ene..Dic: ideal|posible|evitar}), permisos, tours[] (Sprint 2: + tipo_tour, idioma, max_personas), equipamiento[], entradas[], itinerario[], fauna_flora, secretos, regulaciones.
- **Hostal** (implementado, Sprint 3 / TASK-001): tipo_alojamiento, politica_cancelacion, edad_minima, mascotas, cocina_compartida, actividades[], reglas_casa, que_incluye[].
- **Comida** (implementado, Sprint 4 / TASK-002): tipo_comida, cocina, precio_promedio, reservas, menu_destacado[], horario_detallado{}, opciones_dieta[], ambiente, terraza, domicilio, domicilio_plataformas[].
- **Evento** (implementado, Sprint 5 / TASK-003): fecha_inicio, fecha_fin, edicion, sede, lineup[], agenda[], categorias_entrada[], que_llevar[], prohibido[]. Nota: "capacidad" y "entrada desde" se evaluaron para esta categoria pero NO se agregaron como campos de `tags` -- el admin ya tenia inputs propios (`f-aforo`/`f-entrada-desde`) duplicando 1 a 1 los campos genericos ya existentes y compartidos por las 4 categorias (`f-capacidad` -> columna `destinos.capacidad`; `f-price` -> columna `destinos.precio_desde`). Se eliminaron los duplicados y Evento reusa esos 2 campos genericos (ver BUGS_HISTORICOS.md BUG-019, punto 6).

### Protocolo de persistencia: MERGE obligatorio (ver DECISIONS.md ADR-003)

Los endpoints de actualizacion (admin-destinos.js) nunca reemplazan el campo tags completo. Siempre hacen merge a nivel SQL:

```sql
tags = COALESCE(tags, '{}') || $new_tags::jsonb
```

Esto preserva los datos de tags ya guardados por otras categorias o ediciones anteriores, evitando el borrado logico de informacion no incluida en el payload actual (Reglas de Oro ExploraCO v5, punto 3: Cero Borrado Logico).

## 5. Arquitectura de pagina-destino.js (v9) - motor de renderizado

Genera HTML 100% en servidor mediante concatenacion de strings (operador `+`), sin template literals (backticks prohibidos en backend, ver DECISIONS.md ADR-002).

Dise\u00f1o visual: tipografia Barlow Condensed (titulos) + Outfit (cuerpo), paleta dorado `#E8A020` / negro `#111` / fondo warm `#FBF8F2`. Componentes CSS reutilizables: `gstrip` (barra dorada sticky), `icard` (tarjeta icono), `hbox` (highlight box), `tpill` (chip/tag), `stnum` (numero de seccion grande).

### Secciones comunes a las 4 categorias (se renderizan siempre que existan datos)
secDescripcion, secInfo, secGaleria, secHabitaciones (solo hostal), secReservar, secMapa, secFaq, secResenas, secContact.

### Secciones especificas de "Sitio" (implementadas - 8 secciones adicionales)
secSitio, secEntradas, secTours, secChecklist, secItinerario (con tabs por dia via `switchItin()`), secFauna, secSecretos, secRegulaciones.

Nota Sprint 2 (Paridad Visual): secDificultad, secSitio (bloque Temporada) y secTours fueron redisenadas para ser "Tags-Aware" del modelo de datos extendido: leen `dificultad_desc`/`dificultad_tags`, `temporada_matriz` (con fallback automatico a `temporada` legado si el destino aun no fue migrado) y `tipo_tour`/`idioma`/`max_personas` por tour. Ninguna de las 3 secciones rompe si esos campos nuevos estan vacios -- se degradan al comportamiento anterior.

### Secciones especificas de "Hostal" (implementadas, Sprint 3 / TASK-001)
secHostalActividades (Actividades disponibles), secHostalReglas (Reglas de la casa).

### Secciones especificas de "Comida" (implementadas, Sprint 4 / TASK-002)
secPerfilComida (perfil: tipo_comida/cocina/precio_promedio/ambiente), secMenuDestacado, secHorariosComida, secDeliveryComida (opciones dieteticas + domicilio).

### Secciones especificas de "Evento" (implementadas, Sprint 5 / TASK-003)
secEventoInfo (Fecha y sede: fecha_inicio/fecha_fin formateadas via `fmtFechaEvento()`, edicion, sede), secLineupEvento (Lineup/Artistas), secAgendaEvento (Agenda del evento, tabla secuencial dia/hora/actividad), secEntradasEvento (Tipos de entrada, con badge de color por disponibilidad: Disponible/Pocas/Agotado), secPrepEvento (Que llevar: checklist de que_llevar[] + prohibido[] en un solo grid de tarjetas).

Con esto, las 4 categorias tienen su Tab Especifico y sus secciones de renderizado completas. Todas las secciones especificas son condicionales: si no hay datos en `tags` para esa seccion, no se renderiza (sin bloques vacios en el HTML final) -- verificado con smoke tests de `buildHTML()` para Hostal, Comida y Evento.

Iconos: se escriben siempre como escapes `\uXXXX` dentro del codigo JS (nunca emoji directo). Ejemplos ya en uso: `\u2605` (estrella), `\u2713` (check), `\u23F0` (reloj), `\u2302` (casa), `\u2706` (telefono), `\u2709` (mensaje), `\u26A0` (aviso), `\u2731` (planta), `\u29BF` (pin/zona).

## 5-bis. index-api-connector.js - carga dinamica de index.html (documentado en TASK-007, Sprint 6)

Script frontend (no es funcion serverless, no cuenta contra el presupuesto de 8 endpoints) cargado al final de `<body>` en index.html junto a `usuario-session.js`:

```html
<script src="index-api-connector.js"></script>
<script src="usuario-session.js"></script>
```

Hasta TASK-007 este archivo ya existia y estaba en produccion, pero no figuraba en ningun documento del AI-DOS Core -- se descubrio y documento durante la verificacion previa al vaciado de `PL[]`/`MAPA_PLACES[]` (Reglas de Oro v5, punto 8). `usuario-session.js` (provee `window.ExploraCO`: `guardarDestino`/`mostrarLogin`/`mostrarToast`/`usuario`) sigue sin verificarse -- ver NEXT.md, Riesgos activos.

**Que hace:**
1. Al cargar el DOM (con 200ms de margen) y en cada busqueda con debounce de 300ms sobre `#sinp`/`#dest-input`, hace `fetch('/api/destinos?limit=500...')`.
2. Repuebla `PL[]`, `MAPA_PLACES[]` y `DEST_FEATURED_IDS[]`, y el objeto `DEST_PHOTOS{}`, sin romper la referencia: `replArr(targetArr, newArr)`/`replObj(targetObj, newObj)` reciben el array/objeto REAL por referencia (no un string) y mutan in-place (`.length=0`+`.push()`). Antepone tambien los eventos reales de Neon (`cat==='evento'`) a `AGENDA_EVENTS[]`, sin eliminar los de ejemplo que no dupliquen slug.
   - **Correccion (Sprint 7, ver BUGS_HISTORICOS.md BUG-020):** la version original de `replArr`/`replObj` recibia un *nombre de string* y mutaba `window[name]`. Como `PL`/`MAPA_PLACES`/`AGENDA_EVENTS` estan declarados con `const` en index.html (y las declaraciones `const`/`let` de nivel superior NO se exponen en `window`), ese patron nunca actualizaba los arrays reales -- creaba una propiedad `window.PL` nueva y desconectada en cada fetch. Se corrigio pasando el array/objeto real por referencia.
3. Tras repoblar, vuelve a invocar `renderDest()` y `renderAgenda()`, y refresca el mapa: si el Leaflet map (`mapaMap`, `var` en index.html) ya existe, llama `refreshMapaMarkers()`; si no, llama `initMapaSection()` (que ya invoca `refreshMapaMarkers()` internamente) -- evita depender de que el usuario haya llegado a la seccion de mapa via scroll/IntersectionObserver/timeout de 2s.
4. Actualiza los contadores de stats (`#stat-destinos`, `#stat-ciudades`, `#stat-resenas`, `#stat-rating`) solo en la carga inicial, no en cada busqueda.

**Que NO hace (ver NEXT.md, Riesgos activos, Sprint 6):** no re-invoca `renderMyMap()` (seccion personal "Mi Mapa") tras el fetch inicial -- esa funcion solo se refresca ante interaccion directa del usuario. Tampoco actualiza `MM_PINS[]` (pines decorativos, hardcodeados con ids de la version estatica original de `PL`), por lo que puede haber desfase de ids entre esos pines y los lugares reales tras el fetch.

## 6. admin.html - sistema de formularios (baseline referencial ~7.800 lineas)

Estructura de tabs principal: GENERAL | FOTOS | CONTENIDO | ESPECIFICO | CONTACTO.

El tab ESPECIFICO muestra un sub-panel segun `categoria_slug`:
- `especifico-sitio`, `especifico-hostal`, `especifico-comida`, `especifico-evento`: las 4 completas (Sprint 2/3/4/5 respectivamente).

### Patron de implementacion por categoria (7 pasos originales, ya aplicado a las 4 categorias)

Nota (desde TSK-012, aplicado por primera vez en Hostal/TASK-001): los
pasos 4 y 5 de esta lista (editar `collectPlace()`/`_placeToAPI()` a
mano) quedaron superados por el motor generico
`CATEGORY_TAG_FIELDS`/`CATEGORY_TAG_LISTS`. Para una categoria nueva
hoy, esos 2 pasos se reemplazan por "registrar los campos en
`CATEGORY_TAG_FIELDS.<categoria>`/`CATEGORY_TAG_LISTS.<categoria>`" --
ver el ejemplo real de cualquiera de las 4 categorias en admin.html.
Los pasos 1, 2, 3, 6 y 7 se mantienen igual.

1. Definir los campos especificos en `tags` JSONB (ver seccion 4 de este documento).
2. Agregar sub-tabs y paneles en admin.html dentro de `especifico-X` (`cat-editor-tabs` + `cat-panel`), verificando balance de divs antes y despues (Reglas de Oro v5, punto 2).
3. Agregar funciones JS con prefijo de categoria para evitar colisiones de nombre (ej: `addHostalHabitacion()`, `addComidaPlato()`, `addLineupRow()`/`addAgendaRow()` en Evento). El prefijo evita el bug historico de "funcion duplicada" (ver BUGS_HISTORICOS.md BUG-006, y su recurrencia en BUG-018/BUG-019).
4. ~~Actualizar `collectPlace()` para leer los campos nuevos segun la categoria activa.~~ Superado por TSK-012: registrar en `CATEGORY_TAG_FIELDS.<cat>`/`CATEGORY_TAG_LISTS.<cat>` y listo -- `collectCategoryTagFields()` ya recorre esa configuracion.
5. ~~Actualizar `_placeToAPI()` para incluir los campos nuevos dentro de `tagsObj`.~~ Superado por TSK-012: `_buildTagsObj()` ya recorre `CATEGORY_TAG_FIELDS`/`CATEGORY_TAG_LISTS` automaticamente.
6. Agregar las secciones condicionales correspondientes en pagina-destino.js (leer con `safeJSON(tags.campo)`, ensamblar solo si hay datos).
7. Actualizar `loadForm()` en admin.html para precargar los datos al editar un destino existente (los campos escalares via `applyCategoryTagFields()`; los arrays/listas siguen precargandose a mano, uno por contenedor -- ver el bloque `if(p.cat==='evento')` como referencia mas reciente).

## 7. Aislamiento atomico de estilos (ver DECISIONS.md ADR-004)

Para que el dise\u00f1o de una categoria no interfiera con otra, todo CSS de una plantilla o seccion debe vivir bajo un selector padre unico (ej. `.tpl-pX`, `.cat-sitio`, `.cat-hostal`). Cada bloque de estilos debe iniciar neutralizando margenes o posiciones heredadas del Maestro (Reset de Silo), segun Reglas de Oro ExploraCO v5, punto 4.

## 8. Dependencias y restricciones tecnicas

- Driver de base de datos: `@neondatabase/serverless`. Prohibido usar `pg`.
- Modulos backend: CommonJS estricto (`require` / `module.exports`). Prohibido `import` / `export`.
- Frontend: 0 frameworks (ver ADR-001). Interactividad via atributo `onclick` inyectado fisicamente en el HTML generado por el servidor (Reglas de Oro v5, punto 5).
- Iconografia: SVG integro; prohibidas las fuentes de iconos externas (Reglas de Oro v5, punto 7).

### Scripts de verificacion de referencia

Verificar ASCII-safety de un archivo serverless:
```python
with open('api/pagina-destino.js', 'rb') as f:
    raw = f.read()
print("no-ASCII:", len([b for b in raw if b > 127]))   # debe ser 0
print("doble escape:", raw.count(b'\\\\u'))              # debe ser 0
print("backticks:", raw.count(b'`'))                    # debe ser 0
print("module.exports:", b'module.exports' in raw)      # debe ser True
```

Verificar balance de divs en admin.html:
```python
with open('admin.html', 'r') as f: t = f.read()
# Cada categoria se aisla desde su propio inicio hasta el inicio de la
# SIGUIENTE categoria (nunca todas contra el mismo indice final -- ese
# error hacia que las 3 primeras zonas se solaparan entre si).
bounds = [('hostal','especifico-comida'), ('comida','especifico-sitio'),
          ('sitio','especifico-evento')]
for cat, next_id in bounds:
    z = t[t.find(f'id="especifico-{cat}"'):t.find(f'id="{next_id}"')]
    print(f'{cat}: balance={z.count("<div")-z.count("</div>")}')  # debe ser 0
# Evento es la ultima categoria -- no hay "siguiente id", se aisla con
# su propio comentario de cierre en vez de con el id de otra categoria.
start = t.find('<div id="especifico-evento"')
end = t.find('<!-- /especifico-evento -->') + len('<!-- /especifico-evento -->')
z = t[start:end]
print(f'evento: balance={z.count("<div")-z.count("</div>")}')  # debe ser 0
```

## 9. Diagrama de capas

```
     ADMIN.HTML (formularios, 4 categorias)
              |
              v
     admin-destinos.js v2 (CRUD + merge JSONB)
              |
              v
     NEON POSTGRESQL (destinos, destinos_fotos, destinos_detalles, interacciones, usuarios)
              |
              v
     pagina-destino.js v9 (SELECT + buildHTML)
              |
              v
     HTML estatico servido al visitante (sin framework, sin build step)
```

##### Scripts de verificaci\u00f3n obligatorios (Escudo GOLD)
1. **Validaci\u00f3n de Sintaxis (NUEVO):**
   `node --check api/pagina-destino.js` (Debe pasar limpio) [1].
2. **ASCII-Safety:**
   `grep -P '[^\x00-\x7f]' api/*.js` (Debe devolver 0 resultados) [1, 2].
3. **Balance de DIVs:**
   Verificar manualmente o con script Python que el conteo de `<div` sea igual al de `</div>` en cada secci\u00f3n de `admin.html` [1, 2].
