# Spec - Ruta Salsera de Bogota (7 bares + guia de blog)

Fecha: 2026-08-19
Estado: APROBADO por Javier (sesion brainstorming)

## Objetivo

Incorporar al catalogo de ExploraCO los 7 bares de salsa mas importantes
de Bogota como paginas dinamicas de categoria `sitio`, mas una guia de
blog que enlace la ruta salsera completa (los 7 nuevos + Quiebracanto +
Theatron, ya existentes).

## Lista aprobada (7)

1. Galeria Cafe Libro - Parque 93 + Palermo (43 anos, orquestas nacionales/internacionales, galeria de arte)
2. El Goce Pagano - Las Aguas (desde 1978, el mas antiguo)
3. Sandunguera - Chapinero (Templo de la Salsa Clasica, clases de baile)
4. Salsa Camara - Chapinero (desde 1988, Orquesta Aragon, Dan Den)
5. Habana 93 - Parque 93 (restobar caribeno, rones, orquesta en vivo)
6. Rumbavana - El Lago (desde 1992, rumba caleña en Bogota)
7. Bar Continental - Chapinero (bar de culto desde 2020, ron + son)

## Decisiones de diseno

- **Categoria:** `sitio` (consistente con Quiebracanto y Theatron). NO se
  renombra ninguna categoria (impacto en ~8 archivos + migracion; fuera de
  alcance). Agrupacion por `tags.tipo_actividad='Salsa bar'`.
- **Formato:** 7 paginas dinamicas individuales + 1 post de blog guia.
- **Slugs:** galeria-cafe-libro, el-goce-pagano, sandunguera,
  salsa-camara, habana-93, rumbavana, bar-continental,
  ruta-salsera-de-bogota (blog).
- **Datos:** cada seed sigue el patron de `scripts/seed-quiebracanto.js`
  (BASE + TAGS con fieldset sitio/salsa bar + FAQS + PHOTOS), sin ratings
  hardcodeados (ADR-009), upsert idempotente ON CONFLICT slug.
- **Despliegue:** loaders `load-<slug>-api.js` (DELETE+POST) contra la API
  de admin de produccion, Bearer exploraco12345 (mismo metodo de sesiones
  anteriores).
- **Fotos:** Wikimedia Commons, verificadas HTTP 200 (patron BUG-022).
  Respaldo: hero_bg + emoji si el bar no tiene foto en Commons.

## Archivos a crear

- scripts/seed-<slug>.js y scripts/load-<slug>-api.js para los 8 slugs.
- exploraco desarrollo/ficha-<slug>.md (8 fichas de datos fuente).

## Verificacion

1. node --check + ASCII-safety (Escudo GOLD) en los 16 scripts.
2. Loaders contra prod: /api/destinos?cat=sitio 58 -> 65;
   /api/destinos?categoria=blog incluye la guia.
3. Cada /slug.html responde 200 con hero, cover/entradas, mapa, secretos,
   FAQ.
4. Sitemap incluye los 8 slugs nuevos.
5. Docs: TASKS.md TSK-066 + NEXT.md segmento de sesion.

## Fuera de alcance

- Renombrar categorias (se descarto en brainstorming).
- Alias de etiqueta "Bares" en la UI (queda como mejora opcional futura).
- Calidad de datos legacy de eventos/comidas (P1).