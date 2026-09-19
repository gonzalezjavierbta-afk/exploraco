---
name: express-mode
description: >
  Ejecuta cambios de ExploraCO en "modo express/xpress": prioriza el cambio
  funcional, delega briefs quirurgicos por dominio, usa verificacion minima
  proporcional al riesgo y difiere la documentacion al cierre de sesion.
  Usalo cuando el usuario pida express/xpress/rapido.
---

> **Nota de registro (repo):** esta es la copia de documentacion del skill para el repositorio.
> La **copia operativa** que opencode descubre automaticamente vive en
> `.opencode/skills/express-mode/SKILL.md`. Mantener ambos archivos sincronizados.
> Manual ampliado: `exploraco desarrollo/ampliacion desarrollo/MODO_EXPRESS_ANALISIS.md`.

# Express Mode

Modo de trabajo **rapido, dirigido y proporcional al riesgo** para ExploraCO: se prioriza el cambio funcional, se verifican solo los puntos que pueden romperse y se difiere todo lo no critico (documentacion, refactors, pruebas end-to-end, backfill de datos) al cierre de sesion.

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

## Flujo express paso a paso

1. **Spec inline minima.** Una linea: que se cambia, en que archivo y criterio de exito.
2. **Lectura dirigida.** `grep` del ancla + `read` con `offset`/`limit`. `@explore` solo si es imprescindible (p. ej. contar consumidores de un ancla).
3. **Brief quirurgico de delegacion.** Un subagente por dominio con rutas + numeros de linea + bloque `old`/`new` exacto (ver plantilla).
4. **Ejecutar cambios minimos**, de bajo riesgo primero. Reusar componentes/helpers; extraer modulo compartido en vez de duplicar.
5. **Paralelizar** solo tareas independientes (varios `task` en un mismo mensaje); respetar dependencias.
6. **Verificacion local minima** (checklist de 6 puntos). QA runtime obligatorio si se anidan contenedores dinamicos.
7. **Registrar deuda** con etiquetas en `NEXT.md` / items en `TASKS.md` (no arreglarla durante express).
8. **Cierre documental en un solo pase** al final.

## Plantilla de "brief express"

```
## Brief express - <dominio: backend|frontend|admin|renderer|sql>
Archivo(s): <ruta exacta>
Ancla exacta: <archivo>:L<inicio>-L<fin> (+ 3 lineas previas para ubicar)
OLD (bloque exacto a reemplazar):
<...>
NEW (bloque exacto de reemplazo):
<...>
Restricciones: no duplicar bloques > 5 lineas (AGENTS.md), no catch vacios,
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

- Documentacion (`TASKS.md`, `NEXT.md`, `DECISIONS.md`, ADR, `BUGS_HISTORICOS.md`).
- Refactors de deuda colateral y limpieza de codigo muerto (JS muerto, backups con anclas).
- Pruebas end-to-end reales contra Neon/produccion (las corre el operador; no hay `DATABASE_URL` local).
- Backfill/lectura de datos: se entrega `scripts/diagnose_*.js` read-only + `db/cleanups/NNN_*.sql` idempotente.

## Cierre documental (un solo pase)

Al terminar la ultima tarea:

1. `TASKS.md`: actualizar **Estado** + nota de cierre con el **alcance real ejecutado**.
2. `NEXT.md`: entrada de relevo ("Que se estaba haciendo" + "Que sigue" + "Riesgos activos").
3. `DECISIONS.md`: nuevo ADR solo si hubo una decision de arquitectura.
4. `BUGS_HISTORICOS.md`: registrar la falla **antes** de cerrar, si aparecio una.
5. Dejar la deuda etiquetada en `NEXT.md` (por ejemplo `[DEUDA-EXPRESS]`).

Manual ampliado: `exploraco desarrollo/ampliacion desarrollo/MODO_EXPRESS_ANALISIS.md`.
