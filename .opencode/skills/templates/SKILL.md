---
name: templates
description: "Aislamiento atómico de CSS por categoría/template (.tpl-{template_id}) en ExploraCO: crea, edita o audita el silo CSS de una categoría y valida el patrón normativo."
---

# Templates — Aislamiento Atómico de CSS (ExploraCO)

Skill puente para el **Aislamiento Atómico** de ExploraCO (ADR-004, Regla de Oro de aislamiento): cada categoría o template de la plataforma encapsula su CSS bajo un selector padre único con Reset de Silo. Este archivo orienta; el detalle normativo vive en `exploraco desarrollo/BLUEPRINT.md` y `exploraco desarrollo/DECISIONS.md`.

## Cuándo usar

- Crear el silo CSS de una categoría nueva (`css/categorias/{categoria}.css` o bloque equivalente).
- Modificar colores, tipografía o layout de un silo existente sin colisionar con otro.
- Auditar que un silo cumple el patrón normativo y no filtra estilos a `:root`.

## Por qué importa

`index.html`, `admin.html` y la galería comparten hoja global. Sin encapsulamiento, el CSS de una categoría pisa a otra y cada fix es una regresión en otro silo. El aislamiento atómico convierte cada categoría en una unidad independiente: se edita, se prueba y se revierte sin tocar las demás.

## Checklist de creación

1. **Diagnóstico del DOM real:** `grep` los IDs y clases que la categoría usa realmente en el HTML y en el motor de render (`api/pagina-destino.js`). NUNCA usar el BLUEPRINT como mapa: el ARCHIVO REAL manda (ADR-006).
2. **Tokens + paleta:** definir tokens CSS con prefijo del silo (`--{categoria}-*`); contraste WCAG AA ≥ 4.5:1 en texto.
3. **Reset scoped + puente cromático:** bloque raíz `.tpl-{template_id}` con su acento propio; **prohibido `@import` y escritura en `:root` global**.
4. **Activación atómica:** `display:flex/block !important` (encendidos) y `display:none !important` (apagados); los IDs del DOM nunca se borran (Cero Borrado Lógico, ADR-003).
5. **Grid + secciones en orden DOM:** la grilla sigue el orden real del DOM renderizado, no el del documento de diseño.
6. **Breakpoints + reduced-motion:** 640/767/992/1279 y `prefers-reduced-motion` para transiciones.
7. **Escudo GOLD:** CSS válido, ASCII-safety (0 bytes > 127), cero selectores fantasma, Cero Borrado, accesibilidad, smoke de render y cero colateral.
8. **Registro:** si la categoría se expone en un selector o tab de admin, registrar el theme en `admin.html` siguiendo el patrón vigente.

## Reglas críticas (no negociables)

- **Doble notación de casing:** el kernel escribe en `body` tanto `tpl-{template_id}` (mayúscula) como `tpl-{id}` (minúscula). Todo selector debe cubrir ambas: `.tpl-{id}, .Tpl-{ID}`.
- **Reset de Silo:** el primer bloque del silo neutraliza herencias del global (`margin`, `padding`, `box-sizing`, `line-height`) para que el silo sea predecible.
- **Cero selectores fantasma:** solo selectores que existen en el DOM real. Un selector sin nodo es deuda invisible.
- **Nada suelto en `:root`:** los tokens del silo viven en su selector padre; `:root` solo para variables globales compartidas y justificadas.
- **ASCII-safety:** 0 bytes > 127 en los `.css` (los `.md` sí pueden llevar acentos).

## Cierre documental

- Versión del silo + ADR en `exploraco desarrollo/DECISIONS.md` (patrón ADR-0XX) + si hubo falla, BUG en `exploraco desarrollo/BUGS_HISTORICOS.md` + `TASKS.md`/`NEXT.md`.