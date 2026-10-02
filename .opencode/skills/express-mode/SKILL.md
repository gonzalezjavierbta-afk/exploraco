---
name: express-mode
description: Ejecuta cambios en modo express: prioriza el cambio funcional y verifica segun el riesgo. No permite saltarse R2 (docs en un pase de cierre).
---

# Express Mode

Modo de trabajo **rapido, dirigido y proporcional al riesgo** para ExploraCO: se prioriza el cambio funcional, se verifican solo los puntos que pueden romperse y se difiere todo lo no critico (documentacion, refactors, pruebas end-to-end, backfill de datos) al cierre de sesion.

## R2 transversal (SIEMPRE, aplique o no express)

**R2 (docs solo al cierre) es una regla transversal de todo ExploraCO, no una caracteristica del modo express.** Aplica a cualquier tarea, en modo normal o en modo express:

- La documentacion (`TASKS.md`, `NEXT.md`, `DECISIONS.md`, ADR, `BUGS_HISTORICOS.md`) NO se escribe tarea por tarea. Se escribe en UN solo pase de cierre de la tanda.
- Esta skill NO autoriza a saltarse R2. El modo express solo cambia **CUANDO** se documenta (al cierre), nunca **SI** se documenta.
- **Unica excepcion:** que la tarea sea, precisamente, el cierre documental. Solo entonces se permite editar docs dentro de la tarea.
- Sin pase de cierre, la tanda NO esta cerrada: quedan pendientes el pase documental y el resumen de gasto (R4, `informe-cuota.js --task`).

> Consecuencia: ni la urgencia ni el modo express eximen a nadie de documentar. Lo unico que R2 difiere es el momento, no la obligacion.

## Cuando usar

- El usuario pide explicitamente "**express**", "**xpress**" o "**rapido**".
- Cambios acotados: 1 a 3 archivos criticos, sin tocar datos ni seguridad.
- Ajustes de UI/UX, textos, wiring de frontend, fixes puntuales de backend.

## Cuando NO usar (escalar a modo normal)

- Cambios de **arquitectura** (nuevos modulos, contratos entre capas).
- **Esquema / RLS / seguridad** (permisos, autenticacion, exposicion de datos).
- **Migraciones de datos** o backfill destructivo.
- **Refactors compartidos** (helpers con varios consumidores).
- Alcance amplio: **> 3 archivos criticos** o **> 10 archivos en total**.

> Regla: si el cambio puede romper runtime de forma silenciosa o toca datos/seguridad, no es express.

## Gates de riesgo que NO se saltan en express

Estos dominios exigen **CONFIRMACION EXPLICITA del usuario antes de ejecutar**, aunque la sesion sea express (`AGENTS.md` §2):

| Gate | Agente |
| :--- | :--- |
| SQL / RLS / esquema | `@sql-security` |
| Migraciones / seeds masivos | `@data-migration` |
| Motor de render (`buildHTML`) | `@renderer-dev` |
| Arquitectura / ADR | `@architect` |
| Revision de arquitectura / ADR | `@architect-review` |

El modo express cambia el **orden** y la **profundidad** de los controles, nunca su existencia: el Escudo GOLD (`node --check`, ASCII-safety, balance de divs) sigue siendo obligatorio en `api/*.js`, `admin.html`, `index.html` y `pagina-destino.js`.

## Flujo express paso a paso

1. **Spec inline minima.** Una linea: que se cambia, en que archivo y criterio de exito.
2. **Lectura dirigida.** `grep` del ancla + `read` con `offset`/`limit`. Prohibido leer completos archivos > 150 KB (`api/interacciones.js`, `admin.html`, `mi-perfil.html`, `DECISIONS.md`, `TASKS.md`, `NEXT.md`, `BUGS_HISTORICOS.md`). `@explore` solo si es imprescindible (p. ej. contar consumidores de un ancla).
3. **Brief quirurgico de delegacion.** Un subagente por dominio con rutas + numeros de linea + bloque `old`/`new` exacto (ver plantilla).
4. **Ejecutar cambios minimos**, de bajo riesgo primero. Reusar componentes/helpers; extraer modulo compartido en vez de duplicar.
5. **Paralelizar** solo tareas independientes (varios `task` en un mismo mensaje); respetar dependencias.
6. **Verificacion local minima** (checklist de 6 puntos). QA runtime obligatorio si se anidan contenedores dinamicos.
7. **Registrar deuda** con etiquetas en `exploraco desarrollo/NEXT.md` / items en `TASKS.md` (no arreglarla durante express).
8. **Cierre documental (R2, transversal): un solo pase** al final de la tanda. No documentar tarea por tarea; la excepcion es que la tarea sea el propio cierre documental.

## Plantilla de "brief express"

```
## Brief express - <dominio: backend|frontend|admin|renderer|sql>
Archivo(s): <ruta exacta>
Ancla exacta: <archivo>:L<inicio>-L<fin> (+ 3 lineas previas para ubicar)
OLD (bloque exacto a reemplazar):
<...>
NEW (bloque exacto de reemplazo):
<...>
Restricciones: no duplicar bloques > 5 lineas (docs/orquestacion/REFERENCIA-RUTEO.md), no catch vacios,
  ASCII-safe en api/*.js (cero bytes > 127, cero backticks, cero doble escape).
Verificacion esperada: node --check + ASCII-safety + balance de divs + grep de residuos.
Dependencias: <ninguna | que otro cambio debe ir primero>.
```

## Checklist de verificacion minima (6 puntos)

1. **Sintaxis:** `node --check` sobre cada `.js` tocado (API o script).
2. **ASCII-safety:** en `api/*.js`, 0 bytes > 127, 0 backticks, 0 doble-escape `\u`.
3. **Balance de divs:** de cada HTML clave modificado (diferencia 0).
4. **Residuos:** `grep` de ids/funciones/anclas eliminadas (0 fuera de alcance).
5. **Smoke puntual:** si existe un smoke del area, correrlo y distinguir fallo preexistente de regresion nueva.
6. **Runtime/QA:** obligatorio cuando se anidan contenedores dinamicos o se altera runtime; opcional si el resto esta verde.

> Escudo GOLD formal (`gold-shield`) y QA de subagente: solo cuando el cambio puede romper runtime.

## Que se difiere

- Documentacion (`TASKS.md`, `NEXT.md`, `DECISIONS.md`, ADR, `BUGS_HISTORICOS.md`). R2 es transversal: se difiere el **momento** (al cierre), nunca la obligacion.
- Refactors de deuda colateral y limpieza de codigo muerto (JS muerto, backups con anclas).
- Pruebas end-to-end reales contra Neon/produccion (las corre el operador; no hay `DATABASE_URL` local).
- Backfill/lectura de datos: se entrega `scripts/diagnose_*.js` read-only + `db/cleanups/NNN_*.sql` idempotente.

## Cierre documental (un solo pase, R2 transversal)

Al terminar la ultima tarea (o antes de dar la tanda por cerrada):

1. `TASKS.md`: actualizar **Estado** + nota de cierre con el **alcance real ejecutado**.
2. `NEXT.md`: entrada de relevo ("Que se estaba haciendo" + "Que sigue" + "Riesgos activos").
3. `DECISIONS.md`: nuevo ADR solo si hubo una decision de arquitectura.
4. `BUGS_HISTORICOS.md`: registrar la falla **antes** de cerrar, si aparecio una.
5. Dejar la deuda etiquetada en `exploraco desarrollo/NEXT.md` (por ejemplo `[DEUDA-EXPRESS]`).

Manual ampliado: `exploraco desarrollo/ampliacion desarrollo/MODO_EXPRESS_ANALISIS.md`.
