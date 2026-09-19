# MODO_EXPRESS_ANALISIS.md - ExploraCO

## Estado del documento
- **Version:** v1.0
- **Fecha:** 2026-09-19
- **Autor:** Documentation Specialist (AI-DOS)
- **Tipo:** Nota tecnica / manual interno de `ampliacion desarrollo/` (no es un documento del AI-DOS Core)
- **Proposito:** documentar, con calidad de manual interno, que es el "modo express" de ExploraCO, que omite y por que, como acelera el trabajo, que riesgos reales ya se observaron, cuando NO debe usarse y como cerrarlo.
- **Skill operativa asociada:** `.opencode/skills/express-mode/SKILL.md` (copia de registro en `SKILL_MODO_EXPRESS.md`).
- **Regla de verdad:** toda cifra de lineas o de archivos citada aqui es referencial (ADR-006). El baseline de verdad es siempre el archivo real del repositorio.

---

## A) Que es el "modo express / xpress"

El **modo express** (o "xpress") es una forma de trabajo **rapida, dirigida y proporcional al riesgo**: se prioriza el **cambio funcional** que el usuario pidio y se **difiere todo lo no critico** (documentacion, refactors colaterales, pruebas end-to-end, backfill de datos) a un cierre posterior.

- Se activa cuando el usuario pide explicitamente trabajar "**express**", "**xpress**" o "**rapido**".
- No es un modo "sin control": cambia el **orden** y la **profundidad** de los controles, no los elimina. La verificacion se vuelve **local, barata y proporcional**; la formal (Escudo GOLD + QA de subagente) se reserva para los cambios que pueden romper runtime.
- El objetivo es entregar el cambio funcional en el menor numero de pasos posible, dejando **deuda visible y registrada** en lugar de deuda invisible.

**Principio rector:** *cambiar primero lo que el usuario ve, verificar solo lo que puede romperse, y documentar todo junto al final.*

---

## B) Que se omite y por que

| Elemento omitido en express | Por que se omite | Riesgo que asume | Como se mitiga |
|---|---|---|---|
| **Plan formal por fases / spec previa** | Un spec completo cuesta turnos y no agrega valor cuando el cambio es pequeno y bien entendido. | Implementar algo distinto a lo que el usuario queria o dejar un caso borde sin pensar. | Spec **inline minima** en la primera linea del trabajo (que se va a cambiar, en que archivo y con que criterio de exito). |
| **Exploracion masiva y exhaustiva** | Leer todo el proyecto agota contexto y cuota; el 90% de los cambios tocan zonas ya conocidas. | Tocar un lugar equivocado por no conocer un consumidor oculto. | **Lectura dirigida**: `grep` de la ancla + `read` con `offset`/`limit` por rangos de lineas. Solo **1** `@explore` cuando es imprescindible (p. ej. contar consumidores de una ancla). |
| **Documentacion (TASKS / NEXT / DECISIONS / ADR / BUGS) en el momento** | Reescribir los docs tras cada micro-cambio multiplica el trabajo y produce reescrituras contradictorias. | Que el relevo quede desactualizado si la sesion se corta a mitad. | **Diferir al cierre de sesion** y hacer **un solo pase documental** al final, ya con el alcance real ejecutado. |
| **Escudo GOLD formal + QA de subagente por cada cambio** | Correr el escudo completo y lanzar un auditor por cada edicion es desproporcionado para cambios de bajo riesgo. | Publicar una regresion que los checks estaticos no ven. | **Verificacion local minima**: `node --check` por bloque, ASCII-safety, balance de divs, `grep` de residuos y smoke puntual. **QA runtime obligatorio SOLO** cuando el cambio anida contenedores dinamicos o altera runtime. |
| **Pruebas end-to-end reales (Neon / produccion)** | El entorno local **no tiene `DATABASE_URL`**; el operador es quien ejecuta contra Neon. | Desplegar algo que solo falla con datos reales. | Delegar al operador con instrucciones concretas (preflight + cleanup + verificacion en vivo) y smokes con **mock** para validar logica. |
| **Refactors de deuda colateral y limpieza de codigo muerto** | Un refactor "de paso" amplia el diff y el riesgo de regresion mientras se trabaja rapido. | Acumular deuda tecnica que luego exige un pase dedicado. | **Registrar como pendientes** (etiquetas en `NEXT.md` / items en `TASKS.md`) en vez de arreglarlos durante express. |
| **Revision de regresiones multi-archivo / casos borde** | Revisar todas las combinaciones cuesta mas que el cambio mismo. | Romper una ruta poco usada de la app. | Revisar **solo los consumidores relevantes** al cambio (los que comparten la ancla, el modulo o el contrato de datos). |
| **Backfill / lectura de datos existentes** | Express no debe ejecutar SQL destructivo ni migrar datos sin supervision. | Corromper datos de produccion. | Entregar un **script read-only** (`scripts/diagnose_*.js`) + un `db/cleanups/NNN_*.sql` idempotente **para que lo corra el dueno**. |

---

## C) Como se hace mas rapido que el modo normal

Tecnicas concretas observadas en la sesion express:

1. **Brief quirurgico de delegacion.** Un subagente por dominio con: **rutas exactas + numeros de linea + bloque `old`/`new` exacto**. Se elimina la ambiguedad y el subagente no re-explora. Un brief preciso es mas barato que varios intentos.
2. **Saltar la exploracion pesada.** `grep` dirigido al ancla + `read` con `offset`/`limit`. Delegar a `@explore` **solo lo inevitable** (p. ej. repuntar 92 archivos y confirmar el universo real).
3. **Paralelizar tareas independientes.** Varios `task` en un mismo mensaje cuando no comparten archivos; respetar dependencias (lo que edita el mismo archivo o el mismo contrato va secuencial).
4. **Reutilizar componentes existentes.** Reusar el modal de album para el popup de media, reusar helpers ya probados y **extraer un modulo compartido** en vez de duplicar (patron `media-actions.js`).
5. **Cambios minimos y de bajo riesgo primero.** Editar la linea exacta; evitar refactors amplios durante express. El diff pequeno es el mejor control de regresion.
6. **Verificacion proporcional al riesgo.** Checks locales casi siempre; Escudo GOLD / QA formal **solo** cuando el cambio puede romper runtime.
7. **Cierre de documentacion en un unico pase al final.** Un bloque de `TASKS.md` + un bloque de `NEXT.md` (+ ADR/BUG si aplica), en vez de reescribir docs en cada paso.

---

## D) Riesgos reales observados en la sesion

### D.1 Regresion NO detectable por checks estaticos (anidacion de contenedores)
- **Caso:** al anidar `#pf-clase` dentro de `#arbol-clases`, la funcion `arbolPintar()` hacia `innerHTML = ...` sobre el contenedor y **destruia el widget en runtime** (el nodo anidado desaparecia al repintar).
- **Deteccion:** se detecto **porque en ESE cambio si se corrio QA**. Los checks estaticos (`node --check`, ASCII, balance de divs) no lo habrian visto.
- **Correccion:** un **sub-contenedor persistente `#arbol-body`** que sobrevive al repintado.
- **Leccion:** **QA runtime obligatorio cuando se anidan contenedores dinamicos.** Antes de anidar, preguntar: *quien reescribe el `innerHTML` de este contenedor y a quien se lleva por delante?*

### D.2 Smoke desactualizado por un cambio previo
- **Caso:** el check **J21 de `smoke_036_media_unificada.js`** fallo porque su **ventana de datos era demasiado corta** despues de ampliar `mi_feed_fotos` en un cambio anterior.
- **Leccion:** un smoke en rojo puede venir de un cambio ajeno ya hecho, no del cambio actual. Siempre distinguir **fallo preexistente** de **regresion nueva** (comparar contra HEAD o contra el estado documentado).

### D.3 Cambio masivo mecanico (repunte en 92 archivos)
- **Caso:** repunte de `index.html#mymapa-section` en **92 archivos** (`index.html` + nodos del repo).
- **Riesgo:** tocar con una sustitucion masiva paginas/archivos **fuera del alcance** de la tarea.
- **Leccion:** los cambios masivos por texto exigen un **universo controlado** (listar antes, reemplazar despues) y una revision del diff por archivo.

### D.4 Deuda diferida que exige un pase posterior
- **Caso:** **JS muerto** y **backups con anclas** que no se limpian durante express.
- **Riesgo:** la deuda sigue creciendo y se mezcla con el proximo cambio si no queda etiquetada.
- **Leccion:** diferir **con etiqueta y ubicacion** (no en la cabeza de quien trabajo express).

---

## E) Cuando NO usar express (escalar a modo normal)

Express **no aplica** cuando el costo de una regresion silenciosa supera el ahorro de tiempo. Escalar a modo normal (plan + Escudo GOLD + QA + revision) en:

- **Cambios de arquitectura** (nuevos modulos, contratos entre capas, reorganizacion de carpetas).
- **Esquema, RLS o seguridad** (migraciones de esquema, permisos, autenticacion, exposicion de datos).
- **Migraciones de datos** (backfill destructivo, normalizacion, dedupe con escritura).
- **Refactors compartidos** (helpers que consumen varios archivos o modulos de amplia base).
- **Alcance amplio:** cambios que tocan **> 3 archivos criticos** o **> 10 archivos en total**.

Regla practica: *si el cambio puede romper runtime de forma silenciosa, o toca datos/seguridad, no es express.*

---

## F) Sugerencias de optimizacion (accionables)

1. **Crear `scripts/express_check.js`** que corra en un solo comando:
   - `node --check` sobre `api/*.js` + `scripts/*.js`;
   - ASCII-safety (bytes > 127, `\u` doble-escape, backticks) en `api/*.js`;
   - balance de divs de los HTML clave.
   Asi no se repiten one-liners en cada sesion express.
2. **Plantillas de "brief express" por dominio** (backend / frontend / admin / renderer / sql) con el formato de **anchors exactos** (ruta + rango de lineas + `old`/`new`).
3. **Checklist express de 6 puntos** antes de declarar algo "listo" (ver la skill operativa).
4. **Regla de decision express vs normal** en forma de tabla (tabla de la seccion E).
5. **Cierre documental en bloque unico al final**, para evitar reescrituras de `TASKS.md`/`NEXT.md` a mitad de sesion.
6. **Marcar la deuda con etiquetas en `NEXT.md`** (por ejemplo `[DEUDA-EXPRESS]`) en vez de arreglarla durante express.
7. **Para datos:** entregar siempre un `scripts/diagnose_*.js` **read-only** + un `db/cleanups/NNN_*.sql` **idempotente** (patron ya usado en el repo).
8. **Evitar cambios masivos por texto cuando se pueda:** preferir un **parametro / feature-flag** o un **repunte centralizado** (una sola fuente que el resto consuma) en lugar de reemplazar el mismo patron en decenas de archivos.

---

## G) Bitacora de la sesion (8 tareas express)

> Verificacion referida al checklist local de 6 puntos (sintaxis, ASCII, divs, grep de residuos, smoke puntual, runtime/QA si aplica). La deuda diferida es la que quedo etiquetada para un pase posterior.

| # | Tarea | Dominio | Archivos | Verificacion | Deuda diferida |
|---|---|---|---|---|---|
| 1 | Quitar la seccion "Fotos publicadas" del Museo | Frontend / perfil | `mi-perfil.html` | `node --check` del script inline, balance de divs, `grep` del `id`/titulo eliminado sin residuos | Limpieza de estilos/handlers huerfanos de la seccion, si quedaron |
| 2 | Popup de "Media reciente" reusando el modal de album | Frontend / comunidad | `comunidad.html` | balance de divs, `grep` del binding al modal reusado, smoke puntual del feed | Encapsular las `opts` por-root del modal si aparece un tercer consumidor |
| 3 | Galeria ampliada de destino: quitar `slice(0,12)` + 2 bloques lugar/comunidad | Backend + frontend | `api/interacciones.js`, `galeria.html` | `node --check`, ASCII-safety (API), balance de divs, `grep` de los bloques retirados | Revisar paginacion/rendimiento del grid sin tope al crecer la galeria |
| 4 | Fusion real: eliminar Clase + Tabla de Destino + grilla de Vocaciones y absorber en el Arbol de Progreso | Frontend / perfil | `mi-perfil.html` | **QA runtime** (por la anidacion de contenedores): fix con sub-contenedor persistente `#arbol-body`; divs + `node --check` | JS muerto de las secciones retiradas; claves de estado huerfanas |
| 5 | Absorber "Mi Viaje personal": `mymapa.js` en el tab Mapa de comunidad + retirar modulo del index + repuntar consumidores | Frontend / comunidad | `mymapa.js` (nuevo), `comunidad.html`, `index.html` + repunte de `index.html#mymapa-section` en 92 archivos | `grep` del ancla vieja (0 residuos fuera de alcance), `node --check` del modulo nuevo, balance de divs | Backups/anclas legacy del modulo retirado; el repunte masivo exige revision por archivo |
| 6 | Videos ocultos: default de visibilidad + dedup republicable | Backend + datos | `museo_recurso` / `album_agregar_foto` (`api/interacciones.js`), `scripts/diagnose_media_oculta.js`, `db/cleanups/003_publicar_media_oculta.sql` | `node --check`, ASCII-safety (API/SQL), lectura read-only verificada, idempotencia del cleanup | Ejecucion real del cleanup en Neon (la corre el dueno); seguimiento del patron de visibilidad |
| 7 | Mapa cultural sin la media de usuarios: `ORDER BY votos DESC LIMIT` por rama | Backend + datos | `multimedia_mapa` (`api/interacciones.js`), `scripts/diagnose_video_mapa.js` | `node --check`, ASCII-safety, `grep` del `ORDER BY`/`LIMIT` por rama, script read-only | Validar el ranking con datos reales de produccion |
| 8 | Ficha Hostal R10: conteo de votos de fotos de viajero al store canonico `media_votos` | Backend / renderer | `api/pagina-destino.js` | `node --check`, ASCII-safety, smoke de la ficha, `grep` del store canonico | Comprobar el conteo en vivo; retirar rutas legacy de conteo si quedan |

**Cierre de sesion:** documentacion diferida consolidada en un solo pase (`TASKS.md` + `NEXT.md` + ADR/BUGS si aplica) al terminar la ultima tarea, describiendo el **alcance real ejecutado** (no el plan original).

---

*Fin del documento. Complementa a `SKILL_MODO_EXPRESS.md` y a la copia operativa `.opencode/skills/express-mode/SKILL.md`.*
