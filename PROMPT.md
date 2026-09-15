# PROMPT OPENCODE — TSK-103 / ADR-028
## Perfil Personal, Perfil Publico "Museo", Red de Referidos operativa, Arbol de Clases y Casas

> Proyecto: **ExploraCO** (`gonzalezjavierbta-afk/exploraco`) · Entrega posterior a la 016 (Gaming v5.0)
> Documento de entrada unico. **No leas los documentos maestros completos** (suman +8.000 lineas): todo el contexto necesario esta aqui.

---

## 0. COMO TRABAJAR ESTA TAREA (economia de recursos — leer primero)

**0.1 Archivos que SI debes abrir (whitelist estricta).** No abras ningun otro archivo del repo salvo que un error te obligue, y en ese caso di por que:

| Archivo | Para que | Lectura |
|---|---|---|
| `api/usuarios.js` (561 L) | anadir ramas `tipo=` nuevas | completo |
| `api/interacciones.js` (5.031 L) | anadir ramas `tipo=`, catalogos MISIONES/LOGROS/VOCACIONES | **por rangos** (ver 0.2) |
| `api/admin.js` (477 L) | filtro de consumibles por categoria | parcial |
| `api/utilidades.js` | `STATIC_PAGES` del sitemap | solo el bloque `STATIC_PAGES` |
| `mi-perfil.html` (2.020 L) | administrador de perfil | completo |
| `comunidad.html` (2.241 L) | enlaces al perfil publico | solo L1640-1650 y L2150-2205 |
| `usuario-session.js` (1.041 L) | captura de `?ref=`, catalogo de ramas, JWT | parcial |
| `db/migrations/016_multinivel_crowdsourcing.sql` | patron idempotente de referencia | completo |
| `db/migrations/010_gamificacion_v4.sql` | forma real de la tabla `consumibles` | solo el bloque `consumibles` |
| `db/migrations/008_comunidad_social.sql` | forma real de `chat_salas` (¿tiene CHECK en `tipo`?) | solo `chat_salas` |

**NO leas** `TASKS.md`, `NEXT.md`, `BUGS_HISTORICOS.md`, `DECISIONS.md`, `PROJECT.md`, `BLUEPRINT.md` ni los Planes Maestros v4/v5 para *entender* la tarea. Solo los **escribes** al final (WP-7), anexando; nunca los reescribes completos.

**0.2 Rangos utiles de `api/interacciones.js`** (baseline v13, verificado 2026-09-14; **reverifica los numeros antes de editar**, ADR-006: el archivo real manda, nunca la cifra citada):

- `1-215` cabecera, NIVELES, eras, catalogo VOCACIONES (`187-203`)
- `214-548` catalogo `MISIONES` (28)
- `579-864` catalogo `LOGROS` (30)
- `1086-1155` `validarSesion`, nonce, `repartirXpReferidos`
- `1157-1182` tope diario de XP de chat (`chatXpDisponible`/`registrarChatXp`)
- `1454-2665` router **GET** (`tipo=`)
- `1939-2081` `tabla_destino` (5 senderos con fama — leer, es el patron a imitar)
- `2666-5031` router **POST** (`body.tipo` asignado a `tipo2` en L2668)
- `3802-3833` `vocacion_activar`
- `4081-4248` `comprar_consumible` / `usar_consumible`

**0.3 Orden de trabajo obligatorio.** Un paquete a la vez, con checkpoint. **Detente y reporta** al terminar WP-1, WP-3 y WP-5; no sigas si el Escudo GOLD de ese paquete no esta verde.

```
WP-1 migracion 017  ->  WP-2 referidos end-to-end  ->  WP-3 perfil publico museo + DM
   ->  WP-4 arbol de clases  ->  WP-5 Casas + misiones de perfil  ->  WP-6 consumibles
   ->  WP-7 documentacion y verificacion final
```

**0.4 Prohibido:** crear archivos en `api/` (presupuesto 8/8 agotado), usar frameworks, usar `pg`, usar `import/export`, modificar migraciones ya existentes (001-016), reescribir archivos grandes completos, inventar cifras de lineas sin verificarlas.

---

## 1. CONTEXTO TECNICO MINIMO (lo que hay que respetar si o si)

**Stack.** Vercel Hobby (auto-deploy desde GitHub) · Neon PostgreSQL con `@neondatabase/serverless` (`neon()`, nunca `pg`) · Node serverless CommonJS estricto en `api/*.js` · Frontend HTML + JS Vanilla sin frameworks, HTML por concatenacion de strings.

**Reglas de Oro (no negociables):**

1. **ASCII-Safe total en `api/*.js`:** 0 bytes > 127, 0 tildes, 0 "n-tilde", 0 emojis directos, **0 backticks**. Solo escapes Unicode simples (`\u00f1`); el doble escape (`\\uXXXX`) es un bug.
2. **Ediciones estructurales en HTML grandes via script Python** con `str.replace()` de coincidencia exacta, mas verificacion de **balance de `<div>`** y de cierre de comentarios antes de entregar.
3. **Persistencia JSONB por MERGE** (`COALESCE(campo,'{}'::jsonb) || ...`), nunca reemplazo total. **Cero borrado logico:** bajas con `activo=false`.
4. **Aislamiento atomico de CSS:** todo estilo nuevo bajo un selector padre unico (ej. `.pf-publico`, `.arbol-clases`) con reset de silo inicial.
5. **Interactividad fisica:** `onclick` inyectado en el HTML, no delegacion magica.
6. **Escudo de auditoria GOLD** en consola: INFO / DEBUG / LINK / TRACE / TIME.
7. **SVG integro**, prohibidas fuentes de iconos externas. Tipografia **Barlow Condensed** (titulos) + **Geist 900** (valores numericos). Paleta del sitio: dorado `#E8A020`, negro `#111`, fondo `#FBF8F2`.
8. **Referencia de verdad:** el archivo real del repo. Si una cifra de este prompt no coincide con el archivo, **manda el archivo** y lo reportas.
9. **Entrega quirurgica:** bloque completo + punto de entrada (3 lineas previas) + punto final (3 lineas posteriores) + numero de linea aproximado.
10. Cerrar con las preguntas necesarias (ver seccion 9).

**Migraciones:** viven en `db/migrations/`, son **acumulativas e idempotentes** (`IF NOT EXISTS`, constraints con nombre). Las aplica Javier manualmente en Neon.

> **BLOQUEANTE previo:** la migracion **016 debe estar aplicada en Neon** antes de la 017. Si no lo esta, la 017 fallara (`usuarios.faccion`, `codigo_referido`, etc. no existirian). Confirmalo antes de escribir SQL.

---

## 2. ESTADO REAL VERIFICADO (no reimplementar lo que ya existe)

### 2.1 Ya existe y funciona — REUSAR, no duplicar

| Pieza | Donde | Nota |
|---|---|---|
| 20 niveles / 4 eras / badge | `api/usuarios.js:14-60` | derivados de `xp_total`, **nunca persistidos** |
| 28 misiones (catalogo en codigo, DAG `requiere`, `check(ctx)`) | `api/interacciones.js:214-548` | grupos: general(11), ciudad(3), categoria(2), fotos(6), artista(6) |
| 30 logros con tier y rareza global | `api/interacciones.js:579-864` | |
| 13 consumibles con de-nivel real | tabla `consumibles`; `api/interacciones.js:4081-4248` | incluye `perfil_marco_dorado`(700), `perfil_tema_oscuro`(500), `perfil_banda_artista`(900) |
| Cromos (drop 15%) y Parches (ex Pandillas) | `api/interacciones.js` | "Parche" es **relabel solo de UI**; API y esquema siguen usando `pandilla*` |
| 5 senderos con fama (`tabla_destino`) | `api/interacciones.js:1939-2081` | tiers `FAMA_TIERS` 0/100/250/450/700 — **patron a imitar en el arbol** |
| 4 facciones (`exploradores/curadores/creadores/artistas`) | `usuarios.faccion` CHECK; `api/usuarios.js:311-324, 351-397` | 1a eleccion gratis; cambio 500 `xp_total` + cooldown 15 dias; exige `email_verificado` |
| 4 vocaciones de artista (`musico/cine/artista_grafico/escritor`) | `usuarios.vocaciones` jsonb; `api/interacciones.js:187-203, 3802-3833` | todas a nivel 5, acumulables; UI en `mi-perfil.html:~1075-1102` |
| Piramide de referidos 5 niveles 10/5/3/2/1% FLOOR | `api/interacciones.js:1136-1155` (reparto en 14 puntos de XP); `api/usuarios.js:223-308` | `xp_ref_total` es campo de apoyo; topes 500 directos / 20 por dia |
| JWT de sesion HMAC + nonce + `device_hashes` + email verificado | `api/usuarios.js:115-125`; `api/interacciones.js:1086-1128` | protege `visita`, `activo_oculto_votar`, `activo_oculto_checkin` |
| Museo-line propia (trofeos/fotos/destinos) | `mi-perfil.html:~951+` (`syncMuseoLine`), contenedor `:260` | **base del museo publico** |
| Galeria de 3 mejoras `perfil_*` | `mi-perfil.html` | se MUEVE en WP-6 |
| Mi Red + QR | `mi-perfil.html:1783-1855` (QR via `api.qrserver.com` en `:1801`) | se COMPLETA en WP-2 |
| Chat y salas | `chat_salas` / `chat_mensajes` (migracion 008) | base del DM en WP-3 |

### 2.2 Esta ROTO y esta entrega DEBE arreglarlo

| # | Fallo | Evidencia |
|---|---|---|
| R-1 | El QR y el enlace de referido apuntan a `/registro.html?ref=<codigo>` y **`registro.html` no existe** en el repo | `mi-perfil.html:1800` |
| R-2 | **Ningun frontend captura `?ref=`**: el backend lo soporta (`api/usuarios.js:461`) pero nunca lo recibe -> la piramide es inalcanzable desde la web | grep `?ref=` solo devuelve `mi-perfil.html:1799-1800` |
| R-3 | `comunidad.html:1645` enlaza al autor de un album a `/mi-perfil.html?id=<uuid>`, pero **`mi-perfil.html` ignora el parametro** y siempre muestra al usuario en sesion | no hay `URLSearchParams` en `mi-perfil.html` |
| R-4 | La UI rotula "Control Territorial por Faccion" pero consulta `faccion_ranking`, que devuelve ranking global por XP, no territorio | `comunidad.html:2153-2201` |
| R-5 | Residual sin relabel: `mi-perfil.html:514` y `:517` e `index.html:4037` aun dicen "FUNDAR PANDILLA" / "XP de Pandilla" | |

### 2.3 Riesgo de diseno que debes resolver, no ignorar

Hoy conviven **tres sistemas de progresion paralelos**: (a) los 5 senderos de fama de `tabla_destino`, (b) las 4 vocaciones de artista de `usuarios.vocaciones`, (c) las 4 facciones de `usuarios.faccion`. El arbol de clases de WP-4 **no puede ser un cuarto sistema**: debe absorber (a) y (b) y colgar de (c). Ver 4.4.

---

## 3. PARAMETROS DE CALIBRACION (valores decididos; si Javier no dice lo contrario, usa estos)

| # | Parametro | Valor |
|---|---|---|
| P-1 | Pagina de perfil publico | **archivo nuevo `perfil.html`** en la raiz (patron `galeria.html`), leido por `?id=<uuid>`; `mi-perfil.html?id=` redirige a `perfil.html?id=` para arreglar R-3 |
| P-2 | Visibilidad del perfil publico | publico por defecto (`usuarios.perfil_publico = true`), con interruptor en mi-perfil |
| P-3 | Costo del mensaje directo | **20 XP al abrir un hilo nuevo**; respuestas dentro de un hilo abierto **0 XP**; el DM **no otorga XP a nadie** |
| P-4 | Gate del DM | remitente nivel >= 3 y `email_verificado`; maximo 5 hilos nuevos/dia; texto <= 500 chars; receptor puede bloquear |
| P-5 | Grupo grande ("Casas") | **Propuesta 3 hibrida** (ver seccion 5): 3 Casas elegibles + atributo derivado Local/Nacional/Extranjero |
| P-6 | Ramas del arbol | **16 ramas = 4 facciones x 4 ramas**, 5 nodos por rama, umbrales `FAMA_TIERS` 0/100/250/450/700 |
| P-7 | Ramas de facciones no activas | se pueden **ver** pero no progresar: solo acumula puntos la rama de la faccion activa |
| P-8 | Persistencia del arbol | columna nueva `usuarios.progreso_arbol` jsonb (merge); `usuarios.vocaciones` se conserva intacta por compatibilidad y se **espeja** hacia las 4 ramas de artista |
| P-9 | QR | se mantiene `api.qrserver.com` con `onerror` -> fallback a enlace de texto + boton "Descargar QR" |
| P-10 | Consumibles de perfil | columna `consumibles.categoria`; los 3 `perfil_*` pasan a `categoria='perfil'`; se siembran 4 nuevos (ver WP-6) |
| P-11 | XP de las misiones de perfil | 8 misiones, 10-30 XP c/u, sin gate de nivel (son de onboarding) |

---

## 4. PAQUETES DE TRABAJO

### WP-1 — Migracion `db/migrations/017_perfil_publico_arbol_casas.sql` (NUEVA, aditiva, idempotente)

Objetos a crear (nada de esto puede romper si se ejecuta dos veces):

**`usuarios` (ALTER ... ADD COLUMN IF NOT EXISTS):**

| Columna | Tipo | Default | Uso |
|---|---|---|---|
| `bio` | text | NULL | perfil personal |
| `intereses` | jsonb | `'[]'::jsonb` | lista de slugs ASCII |
| `pais_base` | varchar(2) | NULL | ISO-3166-1 alfa-2; `'CO'` para Colombia |
| `casa` | varchar(20) | NULL | CHECK con nombre: 3 valores (seccion 5) |
| `casa_elegida_en` | timestamptz | NULL | cooldown de cambio |
| `progreso_arbol` | jsonb | `'{}'::jsonb` | `{"<rama_id>":{"puntos":N,"nodos":{"<nodo_id>":"ISO-date"}}}` |
| `perfil_config` | jsonb | `'{}'::jsonb` | vitrina elegida, tema, orden de secciones |
| `perfil_publico` | boolean | `true` | interruptor de visibilidad |
| `dm_abierto` | boolean | `true` | acepta mensajes directos |

**`consumibles`:** `ADD COLUMN IF NOT EXISTS categoria varchar(30) NOT NULL DEFAULT 'general'` + `UPDATE consumibles SET categoria='perfil' WHERE clave LIKE 'perfil\_%'` (idempotente por naturaleza) + seed de los 4 consumibles nuevos de WP-6 con `ON CONFLICT (clave) DO NOTHING`.

**`chat_salas`:** `ADD COLUMN IF NOT EXISTS clave_dm varchar(80)` + indice unico parcial `idx_chat_salas_dm_unica ON chat_salas(clave_dm) WHERE tipo='dm'`.
**Antes de escribirlo:** abre `008_comunidad_social.sql` y comprueba si `chat_salas.tipo` tiene un CHECK. Si lo tiene, extiendelo con el patron idempotente `ALTER TABLE ... DROP CONSTRAINT IF EXISTS <nombre>; ALTER TABLE ... ADD CONSTRAINT <nombre> CHECK (tipo IN ('viajeros','ciudad','region','plan','dm'));`. Si no lo tiene, no inventes uno nuevo.

**Tabla nueva `usuario_bloqueos`:** `(bloqueador_id uuid REFERENCES usuarios(id), bloqueado_id uuid REFERENCES usuarios(id), creado_en timestamptz DEFAULT now(), PRIMARY KEY (bloqueador_id, bloqueado_id))`.

**Indices:** `idx_usuarios_casa ON usuarios(casa) WHERE casa IS NOT NULL`, `idx_chat_mensajes_sala_fecha ON chat_mensajes(sala_id, creado_en DESC)`.

Entrega tambien `docs/DEPLOY_017.md` con el checklist: aplicar 017 en Neon (requiere 016 aplicada) -> verificar columnas -> deploy.

**Checkpoint 1:** reporta el SQL completo y el resultado de una verificacion de idempotencia (ejecutar dos veces el DDL en seco).

---

### WP-2 — Red de referidos operativa de punta a punta (arregla R-1 y R-2)

1. **`registro.html` (NUEVO, raiz).** Pagina de registro/entrada minima, estilo del sitio, aislada con `.reg-silo`. Lee `?ref=<codigo>`, lo muestra como "Te invito: <codigo>" y lo envia en el POST de alta a `/api/usuarios`. Anadir `/registro.html` a `STATIC_PAGES` en `api/utilidades.js` (priority 0.5, monthly).
2. **Captura global en `usuario-session.js`:** al cargar cualquier pagina, si hay `?ref=` en la URL, guardarlo en `localStorage` bajo `exploraco_ref` con TTL de 30 dias; en el alta de usuario, adjuntarlo al body **solo si el usuario es nuevo** (el backend ya ignora `referido_por` en la rama `ON CONFLICT DO UPDATE`). Limpiar la clave tras un alta exitosa.
3. **Bloque "Mi Red" en `mi-perfil.html`** (reemplaza/extiende `:1783-1855`) con **tres insumos separados y explicitos**:
   - **QR** apuntando a `https://exploraco.vercel.app/registro.html?ref=<CODIGO>` + boton "Descargar QR".
   - **Codigo** en input readonly + boton "Copiar codigo" (`navigator.clipboard.writeText` con fallback a `document.execCommand('copy')`).
   - **Enlace completo** en input readonly + boton "Copiar enlace" + boton "Compartir" (usa `navigator.share` si existe).
   - Cada boton confirma con toast (`window.ExploraCO.mostrarToast`) y deja el estado "Copiado" 2 s.
4. **Arbol de referidos de 5 niveles:** consume `GET /api/usuarios?tipo=referido_red&usuario_id=` y renderiza **niveles L1..L5** con conteo por nivel, porcentaje aplicado (10/5/3/2/1) y XP aportado. Si `email_verificado` es false, muestra el banner de verificacion en vez del bloque (comportamiento ya existente, conservalo).

---

### WP-3 — Perfil publico "Museo" (`perfil.html?id=<uuid>`) + Mensaje Directo

**3.1 Backend — un solo GET para todo el museo** (evita 5 round-trips):

`GET /api/interacciones?tipo=museo_publico&usuario_id=<uuid>` devuelve en un payload:

```
{
  usuario: { id, nombre, foto_url, bio, ciudad_base, pais_base, creado_en,
             nivel, badge_actual, era, faccion, casa, origen,
             xp_total, perfil_publico, dm_abierto },
  vitrina: { marco, tema, banda },            // capacidades perfil_* activas
  logros:  [ {id, nombre, tier, rareza_pct, desbloqueado_en} ],  // solo desbloqueados
  cromos:  [ {clave, nombre, rareza, cantidad} ],
  albumes: [ {id, titulo, tipo, portada_url, total_fotos, votos} ],   // limit 12
  mapa:    [ {destino_id, slug, nombre, ciudad, lat, lng} ],          // visitas activo=true, limit 200
  arbol:   { faccion, ramas: [ {rama_id, nombre, puntos, tier, nodos_desbloqueados} ] },
  parche:  { id, nombre, fama_total } | null,
  stats:   { visitas, resenas, fotos, albumes, referidos_directos }
}
```

Reglas: si `perfil_publico=false` devuelve 403 `PERFIL_PRIVADO` con el minimo (nombre + nivel). **Nunca** expone `email`, `email_token`, `device_hashes`, `codigo_referido` ni `referido_por`.

Complemento en `api/usuarios.js`: `GET ?tipo=perfil_publico&id=<uuid>` como version ligera para tarjetas/hover (nombre, foto, nivel, faccion, casa).

**3.2 Frontend `perfil.html` (NUEVO, raiz, anadir a `STATIC_PAGES`).** Estructura tipo museo, CSS bajo `.pf-museo` con reset de silo:

1. **Hall de entrada:** avatar con marco (dorado si posee `perfil_marco_dorado`), nombre, badge de nivel, chips de Faccion + Casa + Origen, banda de artista si la posee, bio, ciudad/pais, fecha de ingreso.
2. **Sala de Trofeos:** grid de logros desbloqueados con tier (bronce/plata/oro/platino), rareza global % y fecha. Los bloqueados **no se muestran** (es un museo, no un checklist).
3. **Sala de Cromos:** vitrina con rareza y cantidad.
4. **Sala de Mapas:** mapa Leaflet (el sitio ya lo usa) con los pines de destinos visitados + contador de ciudades. Si no hay visitas, estado vacio elegante ("Aun no ha marcado destinos").
5. **Sala Audiovisual:** grid de albumes con portada; clic abre el album existente.
6. **Sala de Clases:** version **solo lectura** del arbol de WP-4 (misma funcion de render, parametro `readonly=true`).
7. **Boton flotante "Enviar mensaje"** (ver 3.3) y boton "Compartir perfil" (copia la URL).

Tema oscuro de galeria si posee `perfil_tema_oscuro`: se aplica con una clase `.pf-museo--oscuro` en el contenedor raiz, **nunca** tocando `body` (aislamiento atomico).

**3.3 Mensaje Directo (DM).** Sin endpoint nuevo: ramas en `api/interacciones.js`.

| Rama | Metodo | Regla | XP |
|---|---|---|---|
| `dm_enviar` | POST | Gate P-4. Calcula `clave_dm` como los dos uuid ordenados alfabeticamente unidos por `_`. Si no existe sala con esa `clave_dm`, la crea (`tipo='dm'`, `nombre` generado ASCII-safe) y **cobra 20 XP** al remitente con el patron de `comprar_consumible` (`WHERE xp_total >= 20`, devuelve `nivel_anterior`/`nivel_nuevo`/`bajo_nivel`). Si ya existe, inserta el mensaje sin costo. 403 si el receptor tiene `dm_abierto=false` o si existe fila en `usuario_bloqueos`. | -20 al abrir / 0 |
| `dm_hilos` | GET | Hilos del usuario con ultimo mensaje y no leidos | - |
| `dm_mensajes` | GET | Ultimos 100 de un hilo; **solo** si el solicitante es uno de los dos participantes | - |
| `dm_bloquear` | POST | Inserta/borra en `usuario_bloqueos` | - |

**Defensa obligatoria:** `chat_mensajes` GET y `chat_msg` POST ya excluyen salas `tipo='plan'`; **extiende esa exclusion a `tipo='dm'`** para que un DM no sea legible desde el chat publico. Este es el punto mas facil de romper la privacidad — verificalo explicitamente.

UI: bandeja "Mensajes" nueva en `mi-perfil.html` (lista de hilos + hilo abierto) y boton de envio en `perfil.html` con confirmacion explicita del costo ("Abrir conversacion cuesta 20 XP").

**Checkpoint 2:** reporta el payload real de `museo_publico` contra un usuario de prueba y la verificacion de que un DM no aparece en `chat_mensajes`.

---

### WP-4 — Arbol de Clases estilo Albion (16 ramas x 5 nodos)

**4.1 Catalogo en codigo** (patron `LOGROS`/`MISIONES`), en `api/interacciones.js`, junto al catalogo de vocaciones. Constante `RAMAS`:

| Faccion | Ramas (4) | Fuente de puntos (datos que YA existen) |
|---|---|---|
| `exploradores` | `exp_rutas`, `exp_ocultos`, `exp_ciudades`, `exp_naturaleza` | visitas `activo=true`; propuestas/votos de Activo Oculto; ciudades distintas visitadas; visitas con `dims.geo.zona` rural/naturaleza |
| `curadores` | `cur_critico`, `cur_colecciones`, `cur_datos`, `cur_guia` | resenas + votos utiles; mapas y destinos en mapas; ratings y fotos a fichas; mensajes de chat con XP |
| `creadores` | `cre_planes`, `cre_parche`, `cre_eventos`, `cre_embajador` | planes creados/unidos; fama de parche y retos; capacidad `organizar_actividad`; referidos directos activos |
| `artistas` | `art_musica`, `art_cine`, `art_grafica`, `art_literatura` | espejo de `usuarios.vocaciones` (`musico`/`cine`/`artista_grafico`/`escritor`) + albumes por `tipo` + las 6 misiones de artista |

Cada rama declara: `id`, `faccion`, `nombre`, `desc`, `icono_svg` (path inline, sin fuentes externas) y `nodos[5]`.
Cada nodo declara: `id`, `tier` (1-5), `umbral` (0/100/250/450/700), `nombre`, `efecto`.

**Efectos permitidos** (deliberadamente conservadores para no romper la economia): titulo visible en el perfil publico, insignia en la Sala de Clases, y **solo en el nodo 5** una capacidad ya existente del mapa de `usuario-session.js:45-55` o un descuento del 10% en consumibles de su categoria. **Prohibido** crear multiplicadores de XP nuevos sin aprobacion.

**4.2 Acumulacion de puntos.** Anadir al catalogo `MISIONES` dos campos opcionales: `rama` y `puntos_rama`. Tras completar una mision, si el usuario tiene faccion activa y la rama pertenece a esa faccion, sumar `puntos_rama` con **merge JSONB** sobre `progreso_arbol`. Las acciones sueltas (visita, resena, foto...) suman puntos calculados, no persistidos por accion: el endpoint recalcula `puntos` derivados igual que hace `tabla_destino` y los suma a los puntos persistidos de mision. Documenta la formula exacta que uses en la cabecera del catalogo.

**4.3 Endpoints:**

- `GET tipo=arbol_catalogo` -> las 16 ramas con sus nodos (cacheable, sin usuario).
- `GET tipo=arbol_usuario&usuario_id=` -> faccion activa, puntos y tier por rama, nodos desbloqueados, siguiente umbral.
- `POST tipo=rama_activar` -> activa una rama (gate: faccion activa coincidente + nivel 5, igual que las vocaciones). **Conserva `vocacion_activar` funcionando** (alias interno) para no romper la UI ni las 6 misiones de artista existentes.

**4.4 Absorcion de los sistemas previos (obligatorio, ver 2.3):**
- Las 4 vocaciones de artista **son** las 4 ramas `art_*`: al leer, si `usuarios.vocaciones` tiene una clave activa, la rama correspondiente aparece activa. Un solo estado visible para el usuario.
- Los 5 senderos de `tabla_destino` se mantienen como endpoint (no lo rompas), pero en la UI de `mi-perfil.html` la seccion "Senderos" se reemplaza por el arbol; documenta `tabla_destino` como legado interno en WP-7.

**4.5 UI del arbol (SVG inline).** En `mi-perfil.html`, seccion "Mi Clase", bajo `.arbol-clases`:
- Lienzo SVG con **4 columnas** (una por rama de la faccion activa) y **5 nodos verticales** por columna, unidos por lineas (`<line>`/`<path>`) que cambian de color al desbloquearse.
- Nodo bloqueado: circulo gris + candado SVG. Nodo disponible: borde dorado `#E8A020` pulsante. Nodo desbloqueado: relleno dorado + check.
- Bajo cada columna, barra de progreso con `puntos actuales / umbral siguiente` en Geist 900.
- Tooltip al `onclick` (no hover-only, debe funcionar en movil) con nombre, efecto y requisito.
- Las 3 facciones no activas se muestran como pestanas **atenuadas y no navegables** con el texto "Cambia de faccion para desbloquear" (coherente con P-7).
- El SVG debe ser responsive (`viewBox` + `preserveAspectRatio`), sin dependencias externas.

---

### WP-5 — Casas (segmentacion en 3) + Origen + misiones de perfil

**5.1 Modelo.** Implementa la **Propuesta 3 hibrida** de la seccion 5 salvo que Javier indique otra:

- `usuarios.casa` -> 3 valores CHECK: `condor`, `jaguar`, `delfin` (etiquetas visibles: Casa Condor / Casa Jaguar / Casa Delfin).
- **Origen derivado, nunca persistido como identidad:** `origen = 'local' | 'nacional' | 'extranjero'`, calculado en consulta a partir de `pais_base` y `ciudad_base` frente a la ciudad del destino de la accion. Se usa **solo como modulador de bonos**, no como equipo.
- Eleccion de Casa: primera gratis a partir de **nivel 2**; cambio cuesta **300 XP** + cooldown **30 dias** (mas caro en tiempo y mas barato en XP que la faccion, a proposito: la Casa es identidad de equipo, la Faccion es rol de juego).
- `POST tipo=casa_elegir` en `api/usuarios.js` (patron identico a `faccion_elegir`, incluida la exigencia de `email_verificado`).
- `GET tipo=casa_ranking`: agregado por Casa (miembros, XP, activos ocultos aprobados, checkins 30 dias) + top 5 por Casa. **Normaliza por numero de miembros** para que la Casa mas poblada no gane siempre.
- Arregla de paso **R-4**: rotula la seccion de `comunidad.html` segun lo que realmente devuelve (ranking), o implementa el conteo por ciudad. No dejes la etiqueta enganosa.

**5.2 Bonos por Origen** (aplicados en el calculo de puntos de rama, no en `xp_total`, para no inflar la economia):

| Origen | Bono |
|---|---|
| `local` (misma ciudad base que el destino) | x1.2 en `cur_*` (curar, corregir, responder) y en propuestas de Activo Oculto de su ciudad |
| `nacional` (Colombia, otra ciudad) | x1.2 en `exp_rutas` y `exp_ciudades` (check-ins fuera de su base) |
| `extranjero` (`pais_base <> 'CO'`) | x1.2 en `cur_critico` y `art_literatura` (resenas y contenido en otro idioma) |

**5.3 Misiones de perfil (grupo nuevo `perfil`, 8 misiones).** Anadir al catalogo `MISIONES` con `grupo:'perfil'`, sin `requiere` entre ellas salvo la ultima:

| id | Nombre | Check | XP | rama |
|---|---|---|---|---|
| `mis_perfil_foto` | Ponle cara al viajero | `foto_url` no vacio | 10 | - |
| `mis_perfil_bio` | Cuenta tu historia | `bio` >= 40 chars | 15 | - |
| `mis_perfil_ciudad` | Tu punto de partida | `ciudad_base` y `pais_base` no nulos | 10 | - |
| `mis_perfil_intereses` | Que te mueve | `intereses` con >= 3 elementos | 15 | - |
| `mis_perfil_email` | Viajero verificado | `email_verificado = true` | 30 | - |
| `mis_perfil_casa` | Jura tu Casa | `casa` no nula | 20 | - |
| `mis_perfil_faccion` | Elige tu oficio | `faccion` no nula | 20 | - |
| `mis_perfil_completo` | Pasaporte sellado | `requiere` las 7 anteriores | 30 | +25 puntos a la rama que el usuario elija |

Estas misiones alimentan el bloque "Completa tu perfil" en `mi-perfil.html`: barra de progreso 0-100% con las 8 casillas y enlace directo al campo que falta.

**5.4 `mi-perfil.html` como administrador de perfil completo.** Reorganiza la pagina en pestanas (sin romper nada existente):

`PERFIL` (datos personales, foto, bio, ciudad/pais, intereses, progreso de completitud) · `CLASE` (faccion, Casa, arbol) · `MI RED` (referidos) · `MUSEO` (vista previa de lo que ven otros + boton "Ver mi perfil publico") · `INVENTARIO` (consumibles, cromos, tienda) · `MENSAJES` (DM) · `CUENTA` (email, verificacion, privacidad: `perfil_publico`, `dm_abierto`, sesion).

**Checkpoint 3:** reporta el balance de `<div>` de `mi-perfil.html` antes y despues, por pestana.

---

### WP-6 — Consumibles con categoria (mueve la "Galeria de mejoras de perfil")

1. Columna `consumibles.categoria` (WP-1). Categorias: `perfil`, `impulso`, `social`, `coleccion`, `general`.
2. **Retira** la seccion independiente "Galeria de mejoras de mi perfil" de `mi-perfil.html` y haz que la Tienda de Consumibles agrupe por categoria con chips de filtro (`Todos | Perfil | Impulso | Social | Coleccion`). Los 3 `perfil_*` aparecen ahora bajo el chip "Perfil".
3. `GET tipo=consumibles` acepta `&categoria=` opcional; `api/admin.js` (`consumibles_lista/crear/editar`) gana el campo `categoria` en formulario y payload.
4. **Siembra 4 consumibles nuevos de categoria `perfil`** (precios en el rango vigente 250-1.500 XP), pensados para "hacer el museo mas llamativo":

| Clave | Nombre | Precio | Efecto |
|---|---|---|---|
| `perfil_marco_plata` | Marco de Plata | 300 | marco alternativo (entrada barata a la personalizacion) |
| `perfil_vitrina_destacada` | Vitrina Destacada | 650 | fija 3 logros elegidos arriba del museo |
| `perfil_titulo_custom` | Titulo de Viajero | 800 | titulo libre de 24 chars (moderable desde admin) |
| `perfil_fondo_paisaje` | Fondo de Paisaje | 1.000 | cabecera del museo con una foto propia del usuario |

Todos permanentes, aplicados via `capacidades` (merge JSONB) igual que los 3 existentes, y leidos por `perfil.html` en `vitrina`.

---

### WP-7 — Documentacion y verificacion final

1. `DECISIONS.md`: **ADR-028** (perfil publico museo + DM con costo de XP + arbol de clases + Casas + categorias de consumibles). Incluye contexto, decision, alternativas descartadas y consecuencias.
2. `TASKS.md`: **TSK-103** con el desglose por WP y su estado real.
3. `NEXT.md`: entrada de "Completado reciente" + pendiente operativo (aplicar 017 en Neon + deploy).
4. `BUGS_HISTORICOS.md`: registra R-1..R-5 con su resolucion.
5. `BLUEPRINT.md`: actualiza seccion 3 (columnas nuevas), 5-ter (perfil.html y registro.html) y la tabla de endpoints (ramas `tipo=` nuevas).
6. `PROJECT.md`: 3-4 lineas en el resumen del sistema social. **No lo reescribas.**
7. Smoke test `scripts/smoke_017_perfil_arbol_casas.js` que cubra, como minimo: idempotencia DDL, `museo_publico` con perfil privado y publico, cobro de 20 XP del DM y su dedup de sala, fuga de DM en `chat_mensajes` (debe dar 0), gate de `casa_elegir` (cooldown y XP), calculo de tier de una rama, y las 8 misiones de perfil.

**Escudo GOLD final (obligatorio, pegar la salida real):**

```bash
node --check api/usuarios.js && node --check api/interacciones.js && node --check api/admin.js
grep -P '[^\x00-\x7f]' api/*.js        # 0 resultados
grep -c '`' api/usuarios.js api/interacciones.js   # 0
python3 -c "import sys;t=open('mi-perfil.html').read();print(t.count('<div')-t.count('</div>'))"   # 0
python3 -c "t=open('perfil.html').read();print(t.count('<div')-t.count('</div>'))"                 # 0
```

---

## 5. PROPUESTAS PARA LA SEGMENTACION EN 3 GRUPOS GRANDES

> Javier elige una. El prompt asume la **Propuesta 3**; si elige otra, cambia solo WP-5.

### Propuesta 1 — Territorial pura: **Locales · Nacionales · Extranjeros**

Grupo **derivado automaticamente** de `ciudad_base` + `pais_base`, no elegible.

- **Local:** reside en la ciudad. Gana por verificar fichas, responder dudas del chat de su ciudad, proponer Activos Ocultos de su barrio y organizar parches presenciales.
- **Nacional:** colombiano fuera de su ciudad base. Gana por check-ins presenciales lejos de su base y por descubrir Activos Ocultos en ciudades nuevas.
- **Extranjero:** `pais_base <> 'CO'`. Gana por resenas en otro idioma, rutas de inmersion cultural y guias de viaje.
- **Competencia:** "el territorio se defiende o se conquista" — los Locales suman por curar su ciudad, los visitantes por conquistarla.
- **Pro:** narrativa realista y util para el negocio (turismo). Sin decision que el usuario pueda equivocar.
- **Contra:** los grupos quedaran muy desbalanceados al inicio (casi todos Locales de Bogota, casi cero Extranjeros); no hay identidad de equipo elegible, que es lo que engancha; cambiar de grupo requiere mudarse.

### Propuesta 2 — Casas totemicas elegibles: **Condor · Jaguar · Delfin**

Tres equipos tematicos colombianos, elegibles y permanentes (estilo Ingress / Pokemon GO), sin relacion con donde vive el usuario.

- **Casa Condor (Andes / altura):** montana, caminatas, miradores, patrimonio andino.
- **Casa Jaguar (Selva y Pacifico):** naturaleza densa, biodiversidad, rutas remotas.
- **Casa Delfin (Caribe y rios):** agua, costa, fiesta, gastronomia costera.
- Competencia mensual por Casa (control territorial por ciudad, logros de temporada, cromo exclusivo del ganador). El sistema sugiere la Casa con menos miembros al elegir, para balancear.
- **Pro:** balanceable por diseno, identidad fuerte, permite ligas y temporadas, no depende de datos personales.
- **Contra:** es "sabor" puro — no aporta informacion real sobre el usuario ni al negocio, y se solapa conceptualmente con las Facciones si no se diferencian bien los roles.

### Propuesta 3 — **Hibrida (recomendada): Casas elegibles + Origen derivado**

Combina las dos anteriores en dos ejes que no compiten entre si:

| Eje | Que es | Como se obtiene | Para que sirve |
|---|---|---|---|
| **Casa** (3) | equipo de competencia: Condor / Jaguar / Delfin | elegible a nivel 2; cambio 300 XP + 30 dias | rankings, temporadas, control territorial, identidad visual |
| **Origen** (3) | atributo: Local / Nacional / Extranjero | derivado de `pais_base`/`ciudad_base` en cada consulta | modula bonos (x1.2 segun 5.2), misiones asimetricas, no crea ranking propio |
| **Faccion** (4) | rol de juego: exploradores / curadores / creadores / artistas | ya implementado | define que 4 ramas del arbol puedes subir |

- **Pro:** conserva la riqueza narrativa de Locales/Extranjeros sin partir la competencia en grupos desbalanceados; la Casa se puede balancear; los tres ejes se leen distinto (equipo / origen / oficio) y no se pisan.
- **Contra:** es la opcion con mas piezas conceptuales — exige que la UI explique bien los tres ejes (un solo panel "Mi identidad" con las tres tarjetas resuelve casi todo).
- **Costo tecnico:** identico a la Propuesta 2 (una columna `casa` + CHECK); el Origen no cuesta columnas nuevas mas alla de `pais_base`.

---

## 6. CONTRATO DE CALIDAD (criterios de aceptacion)

- [ ] `db/migrations/017_*.sql` idempotente, ejecutable dos veces sin error, sin tocar 001-016.
- [ ] Presupuesto serverless **8/8 intacto**: cero archivos nuevos en `api/`.
- [ ] `node --check` limpio en los 3 endpoints tocados; 0 bytes > 127; 0 backticks en `api/*.js`; 0 dobles escapes `\\u`.
- [ ] Balance de `<div>` = 0 en `mi-perfil.html`, `perfil.html`, `registro.html` y `comunidad.html`.
- [ ] El QR, el codigo y el enlace de referido funcionan y el `?ref=` llega al backend en un alta real (R-1, R-2 cerrados).
- [ ] `perfil.html?id=<uuid>` carga con una sola llamada de museo y no filtra email, tokens ni codigo de referido.
- [ ] Un DM cobra 20 XP una sola vez por hilo y **no** aparece en `chat_mensajes` publico.
- [ ] El arbol muestra 4 ramas x 5 nodos en SVG, con candados, progreso y tooltip funcional en movil.
- [ ] Las 4 vocaciones de artista previas siguen funcionando y se ven como ramas `art_*` (sin estado duplicado).
- [ ] Las 8 misiones de perfil se completan y otorgan XP; la barra de completitud llega a 100%.
- [ ] La galeria de mejoras ya no existe como seccion suelta: vive en la Tienda bajo el chip "Perfil".
- [ ] Smoke `scripts/smoke_017_*.js` en verde, con conteo `N/N PASS` pegado en el reporte.
- [ ] ADR-028, TSK-103 y las entradas de NEXT/BUGS/BLUEPRINT escritas.

---

## 7. FORMATO DE ENTREGA

Por cada archivo tocado:

1. **Ruta + numero de linea aproximado** del cambio.
2. **Punto de entrada:** las 3 lineas exactas anteriores al bloque.
3. **Bloque completo** (el segmento mas completo posible; no fragmentos sueltos que obliguen a recomponer logica).
4. **Punto final:** las 3 lineas exactas posteriores.
5. Para `mi-perfil.html`, `comunidad.html` y cualquier HTML > 1.000 lineas: **script Python** con `str.replace()` de coincidencia exacta + verificacion de balance de `<div>` impresa como `[OK]` / `[FAIL]`.
6. Al final de cada WP: resumen de 5 lineas con que cambio, que verificaste y que quedo pendiente.

---

## 8. RIESGOS CONOCIDOS — no los repitas

- **BUG-006 (funcion duplicada):** usa prefijos de dominio en las funciones nuevas (`pfMuseoRender()`, `arbolRender()`, `dmEnviar()`, `casaElegir()`). Antes de crear una funcion, `grep` su nombre en el archivo.
- **Estado citado sin verificar (ADR-006):** varias secciones del admin/perfil tenian UI construida pero desconectada del backend. Verifica extremo a extremo, no por inspeccion visual.
- **Relabel Pandilla -> Parche:** solo texto de UI. No renombres tablas, columnas ni ramas `tipo=`.
- **De-nivel real:** cobrar XP puede bajar de nivel y revocar capacidades. En el DM devuelve `bajo_nivel` y avisa en la UI antes de cobrar.
- **Doble escape `\\uXXXX`:** es bug, no proteccion.

---

## 9. PREGUNTAS OBLIGATORIAS

Antes de escribir una sola linea de codigo, confirma con Javier:

1. ¿La **migracion 016 ya esta aplicada en Neon** y hay deploy con `SESSION_JWT_SECRET` y `RESEND_API_KEY` configuradas? (Bloqueante absoluto.)
2. ¿Cual de las **3 propuestas de segmentacion** (seccion 5) se implementa? ¿Los nombres Condor/Jaguar/Delfin quedan o prefiere otros?
3. ¿Confirma el **costo del DM** (20 XP por hilo nuevo, respuestas gratis, nivel minimo 3)?
4. ¿`perfil.html` como **archivo nuevo** o `?id=` dentro de `mi-perfil.html`?
5. ¿Los **nombres de las 12 ramas** no-artista propuestos en 4.1 quedan, o los renombra?
6. ¿Se puede **progresar en ramas de facciones no activas** o solo en la activa (P-7)?
7. ¿Se **siembran los 4 consumibles nuevos** de perfil con esos precios, o solo se mueve lo existente a la categoria?
8. ¿La entrega es **de una sola vez** o por fases con commit intermedio en cada checkpoint?
9. ¿Se mantiene el **QR externo** (`api.qrserver.com`) o se vendoriza una libreria local?
10. ¿Los 5 **senderos de `tabla_destino`** se retiran de la UI (reemplazados por el arbol) o conviven?

**Y en general: haz las preguntas necesarias para completar la tarea de la mejor forma posible.**
