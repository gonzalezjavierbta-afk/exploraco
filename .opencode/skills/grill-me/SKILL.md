---
name: grill-me
description: Definition of Done y sharpening de plan. Entrevista de 5-8 preguntas que exige objetivo, criterios de aceptacion MEDIBLES, territorio, comandos de verificacion y definicion de hecho ANTES de implementar; si falta uno, responde "NO listo para implementar". Usar al planificar una tarea no trivial o cuando no este claro que significa "hecho".
---

# Definition of Done (grill-me)

Convierte una peticion vaga en un plan implementable con un "hecho" comprobable. Protocolo **autocontenido**: no depende de ninguna sesion, comando ni documento externo.

## Regla dura (no negociable)

Si falta **cualquiera** de (a)-(e), la unica respuesta valida es:

> **NO listo para implementar** - falta (X). Necesito: <dato exacto y formato esperado>.

- Prohibido decir "todo listo", "adelante" o "procedo" sin las cinco respuestas y su evidencia.
- Prohibido rellenar un hueco con una suposicion: si el operador no lo dijo, se pregunta.
- Prohibido citar cifras de otro documento como hechos (ADR-006): el baseline es el archivo real, y el historial de chat no es fuente de verdad (Regla de Oro 8).
- Un criterio de aceptacion sin comando ni evidencia observable **no es un criterio**: es un deseo.

## Protocolo: 5-8 preguntas, en tandas de 3

Preguntar en tandas de maximo 3: el coste es turnos x contexto acumulado, no salida util. No avanzar a la tanda siguiente sin las respuestas de la anterior.

### Tanda 1 - Que y como se mide (obligatorias)

1. **(a) Objetivo** en una frase: que cambia para el usuario y por que ahora. Si aparecen dos objetivos, son dos tareas.
2. **(b) Criterios de aceptacion MEDIBLES**: 1-5 items, cada uno con la evidencia que lo demuestra (comando + salida esperada, N/N checks, 0 coincidencias, HEAD 200, exit 0). Mal: "que se vea bien". Bien: "`node --check api/x.js` exit 0 y 0 hallazgos en el Escudo GOLD".

### Tanda 2 - Donde y como se comprueba (obligatorias)

3. **(c) Territorio**: rutas exactas que se tocan y, sobre todo, rutas que **NO** se tocan. Si el cambio cruza mas de 3 ficheros criticos, se trocea o se entrega como bloque.
4. **(d) Comandos de verificacion**: el comando literal y su resultado esperado, uno por item de (b). Si el criterio no se puede comprobar por comando, se reescribe hasta que exista verificacion script-first.
5. **(e) Definicion de "hecho" y cadencia**: que se entrega (codigo, seeds, docs), en cuantos pases y cuando se commitea/despliega. Por defecto: verificacion por script, **Escudo GOLD** antes de desplegar `api/*.js`, `admin.html`, `index.html` o el motor de render, y **un unico pase documental al cierre** delegado a `@docs-keeper` (R2) - nunca docs a mitad de implementacion.

### Tanda 3 - Fronteras (f obligatoria, g opcional)

6. **(f) Riesgos y gates**: que puede romperse y que gate aplica. Gates vigentes (ADR-115), con confirmacion explicita del usuario antes de ejecutar: `@sql-security`, `@data-migration`, `@backend-dev`, `@renderer-dev`, `@admin-dev`, `@seo-dev`, `@content-loader`, `@architect`, `@architect-review`. Pagar no salta el gate.
7. **(g) Fuera de alcance**: lo que se deja fuera a proposito, para que no reaparezca luego como "pendiente".

## Sello de readiness

Rellenar la tabla. Una fila sin evidencia deja el plan en NO listo.

| # | Dato | Respuesta | Evidencia (comando/salida) |
|---|---|---|---|
| a | Objetivo | | |
| b | Criterios medibles (N) | | |
| c | Territorio (touch / no-touch) | | |
| d | Verificacion | | |
| e | Hecho + cadencia | | |
| f | Gates | | |
| g | Fuera de alcance | | |

Solo con (a)-(e) completas se emite:

> **LISTO PARA IMPLEMENTAR** - N criterios, M comandos de verificacion, gates: <lista o "ninguno">.

## Brief de salida (contrato ~600 tokens)

- Objetivo (1 frase).
- Criterios de aceptacion numerados, cada uno con su comando.
- Territorio: `ruta:rango` que se toca y lista de no-tocables.
- Verificacion: comandos exactos, uno por criterio (pass/fail por item).
- Hecho + cadencia: commit, deploy, Escudo GOLD, pase documental.
- Gates que se piden y en que punto exacto.
- Fuera de alcance.

## Anti-patrones que esta skill debe rechazar

- "Hazlo y ya vemos" sin criterio de aceptacion.
- Verificacion "a ojo" o por lectura de codigo sin ejecutar nada.
- Plan que incluye editar `exploraco desarrollo/*.md` durante la implementacion (viola R2).
- Cambio que exige endpoint nuevo: el presupuesto de Vercel esta en 8/8; se extiende uno existente por query params.
- Refactor que borra IDs del DOM o "codigo muerto" visible: Cero Borrado Logico (ADR-003).
- Declarar cerrado sin mirar el archivo real (ADR-006).
