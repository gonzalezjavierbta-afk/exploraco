---
name: improve-codebase-architecture
description: Audita la arquitectura de ExploraCO buscando oportunidades de profundizacion (modulos profundos, no mas capas) y entrega un informe HTML temporal fuera del repo; la candidata elegida se afina con la skill grill-me (Definition of Done). Usar al plantear un refactor estructural o al notar friccion al navegar el codigo.
---

# Improve Codebase Architecture (ExploraCO)

Superficie de friccion arquitectonica -> **oportunidades de profundizacion**: refactors que convierten modulos superficiales en modulos profundos. El fin es testabilidad y navegabilidad por IA, no "mas capas".

## Vocabulario (usarlo exacto)

**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**. No derivar a "componente", "servicio", "API" ni "boundary".

Principios:

- **Deletion test**: si borro esto, la complejidad se concentra o solo se mueve? "Se concentra" es la senal buena.
- **La interface es la superficie de test**: si para probar algo hay que renderizar media pagina, la interface esta en el sitio equivocado.
- **Un adapter = seam hipotetico; dos = seam real.**

## Fuentes de verdad

- Dominio y alcance: `exploraco desarrollo/PROJECT.md` y `exploraco desarrollo/BLUEPRINT.md`.
- Decisiones: `exploraco desarrollo/DECISIONS.md`. Para ubicar el ultimo ADR: `Select-String -Pattern "^## ADR-0"` y leer **solo su seccion** (Read con `offset`/`limit` <= 60 lineas, ADR-084 D5). Prohibido leer completos los ficheros > 150 KB.
- Baseline = archivo real (ADR-006): nada se declara "hecho" ni "pendiente" por lo que digan TASKS.md o NEXT.md.
- Los ADR **no se re-litigan**: si una candidata choca con uno, se marca y se ofrece reabrirlo como ADR nuevo.

## Proceso

### 1. Explorar (scope antes del scan, YAGNI)

- Si el operador ya nombro una direccion (modulo, subsistema, dolor concreto), se toma y se salta la inferencia.
- Si no: `git log --oneline -30` para hallar los hot spots. Prohibido `git diff` sin `--stat` sobre ficheros > 150 KB.
- Delegar el barrido a `@explore` (read-only, `edit: deny`) con un brief que diga el **resultado esperado**, nunca el metodo; techo 15 turnos por subagente.

Senales de friccion propias de este repo:

- **Silos CSS (ADR-004)**: reglas de una categoria fuera de su selector padre, o dos silos que repiten el mismo bloque. Un `tpl-*` es el module; el selector padre es la interface.
- **Vanilla puro (ADR-001)**: cualquier profundizacion que asuma bundler, transpilador o Node en runtime cliente **no es implementable**. Descartarla.
- **Cero Borrado Logico (ADR-003)**: si la unica forma de testear el module es renderizar HTML con IDs que no se pueden eliminar, el seam esta mal puesto.
- **Presupuesto serverless (8/8 funciones)**: un module que "merece su propio endpoint" no se puede crear; se extiende uno existente por query params.
- **Serverless ASCII-safe (ADR-002)**: cero backticks y cero bytes > 127 en `api/*.js`; una propuesta que los introduzca rompe el deploy.
- Entender un concepto obliga a saltar entre muchos modules pequenos (loader, seed, motor de render): candidata a profundizar.
- Donde los bugs reales viven en **como se llama** a una funcion pura extraida solo para testear (falta de locality).

Aplicar el **deletion test** a todo lo que parezca superficial antes de proponerlo.

### 2. Informe HTML (artefacto temporal, fuera del repo)

Escribir en el directorio temporal del sistema (`%TEMP%`, fallback `$TMPDIR`/`/tmp`):
`<tmp>/architecture-review-<timestamp>.html`. Abrirlo con `start <ruta>` (Windows) / `open` / `xdg-open` y dar la **ruta absoluta**. Nada se escribe dentro del repo.

El informe es un artefacto temporal y **no es codigo de producto**: ADR-001 y ADR-002 no le aplican, asi que puede usar Tailwind y Mermaid por CDN.

Esqueleto minimo autocontenido:

```html
<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Architecture review</title>
<script src="https://cdn.tailwindcss.com"></script>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  mermaid.initialize({ startOnLoad: true });
</script>
<style>
  .badge{display:inline-block;padding:.15rem .55rem;border-radius:999px;font-size:.75rem;font-weight:700}
  .strong{background:#dcfce7;color:#166534}.worth{background:#fef9c3;color:#854d0e}.spec{background:#e5e7eb;color:#374151}
  .card{border:1px solid #e5e7eb;border-radius:.75rem;padding:1.25rem;margin:1.5rem 0}
  .ba{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .warn{border-left:4px solid #f59e0b;background:#fffbeb;padding:.6rem .8rem}
</style></head><body class="max-w-5xl mx-auto p-6 text-slate-800">
<h1 class="text-2xl font-bold">Oportunidades de profundizacion</h1>
<!-- una <section class="card"> por candidata: Files / Problem / Solution /
     Benefits (locality + leverage + como mejora el test) / Before-After / badge -->
<!-- Mermaid cuando la relacion sea de grafo; divs/SVG cuando sea editorial -->
<section class="card"><h2>Top recommendation</h2><p>Cual atacar primero y por que.</p></section>
</body></html>
```

Cada candidata es un `<section class="card">` con: **Files** (modules implicados), **Problem** (por que la arquitectura actual genera friccion), **Solution** (que cambia, en lenguaje llano), **Benefits** (locality, leverage, como mejora el test), **Before / After** visual lado a lado y **badge** `Strong`, `Worth exploring` o `Speculative`. Cerrar con **Top recommendation**.

**Conflicto con ADR**: si la candidata contradice un ADR, incluirla solo si la friccion es real y marcarla con un `<div class="warn">` del tipo "contradice ADR-00XX - merece reabrirse porque...". No listar refactors teoricos que un ADR prohibe.

No proponer interfaces todavia. Preguntar: **"Cual de estas exploramos?"**

### 3. Afinar la elegida con grill-me (Definition of Done)

Invocar la skill `grill-me` sobre la candidata elegida: objetivo, criterios de aceptacion medibles, territorio, comandos de verificacion, hecho + cadencia, gates y fuera de alcance. **Sin el sello "LISTO PARA IMPLEMENTAR" no se implementa.**

Efectos colaterales, ya gobernados en este repo:

- **Termino de dominio nuevo o afinado**: no se escribe inline. Se entrega en el pase documental de cierre a `@docs-keeper` (`PROJECT.md` / `BLUEPRINT.md`). El argumento de cada decision vive **una sola vez** en `DECISIONS.md` (ADR-084 D1).
- **Rechazo con razon de peso** (la que un explorador futuro necesitaria para no re-proponer lo mismo): ofrecer ADR via `@architect`, con la pregunta "lo registro como ADR para que la proxima revision no lo re-sugiera?". Saltar razones efimeras.
- **Interfaces alternativas** (design-it-twice): lanzar 2 subagentes en paralelo con el mismo brief y sesgo distinto (minimizar superficie publica / maximizar locality) y comparar; el ganador se justifica con el deletion test.
- **Gates**: `@architect` y `@architect-review` exigen confirmacion explicita del operador. El **Escudo GOLD** se corre antes de desplegar `api/*.js`, `admin.html`, `index.html` o el motor de render.

## Limites duros

- La auditoria es **read-only**: el unico artefacto escrito es el HTML temporal. Nada de seeds, migraciones ni ediciones de docs dentro de la auditoria.
- No crear endpoints (presupuesto 8/8), no crear directorios de skills o agentes, no tocar `AGENTS.md`.
- Si el hallazgo exige mas de 3 ficheros criticos o un gate sin confirmacion, se entrega como **bloque** y decide el operador.
