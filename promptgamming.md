# ExploraCO Gaming v5.0 — Prompt Tecnico para OpenCode
## Piramide de Referidos (XP REF) + Crowdsourcing Geoespacial "Activo Oculto" + Facciones

**Documento de entrega.** Generado bajo AI-DOS, siguiendo Reglas de Oro ExploraCO v5. Antes de escribir una sola linea de codigo, verificar contra el repositorio real (Reglas de Oro punto 8 / ADR-006) que todo lo descrito en la seccion 1 sigue siendo cierto — este documento se escribio a partir de PROJECT.md, BLUEPRINT.md, DECISIONS.md, NEXT.md, TASKS.md, BUGS_HISTORICOS.md y el Plan Maestro de Gamificacion recibidos el 2026-09-13, pero el chat nunca es fuente de verdad.

---

## 0. Nota importante sobre el punto de partida

El documento `ExploraCO_Gamificacion_v4_Plan_Maestro.md` que acompana este prompt describe Pandillas, Cromos, Consumibles y los 20 niveles como "propuesta". **Verificado contra DECISIONS.md/NEXT.md: ya estan implementados** (`ADR-018`, 2026-09-10, migracion 010) y ya corren en el working tree de produccion. Ademas, `ADR-024` (geocerca Haversine + anti-spoofing en visitas) y `ADR-026` (vocaciones, chat de plan, XP admin) se sumaron el 2026-09-12/13. Este prompt asume ese estado real, no el del Plan Maestro. Si al momento de ejecutar esto algo cambio de nuevo, detenerse y pedir los archivos reales antes de continuar.

---

## 1. Estado real de la base (punto de partida verificado)

- `api/interacciones.js` en **v12** (~4.547 lineas). `api/usuarios.js` en **v8**. Presupuesto serverless: **8/8, sin margen** — ningun archivo nuevo en `/api`.
- Migraciones aplicadas en Neon hasta la **015 inclusive** (confirmado por Javier). Esta entrega es la **016**.
- Ya existen y esta tarea debe REUSAR, no reconstruir:
  - `pandillas` / `pandillas_miembros` / `pandilla_retos` (grupos de 3-10, fundados por Nivel 14+, fama propia) — ADR-018.
  - Motor de geocerca Haversine + anti-spoofing en `tipo=visita`: `haversineMetros`, `resolverRadioM`, radios adaptativos 100/150/200/250 m, accuracy<=150 m, cooldown 90 s, velocidad max 69.4 m/s, tope 30/24h, dedup-first + indice unico parcial — ADR-024.
  - Calculo dinamico de nivel/era/badge desde `xp_total` (nunca columna fija) — principio que esta entrega debe seguir para todo lo nuevo que sea derivable (afinidad de Parche, control territorial).
  - Patron "requiere actividad reciente" ya usado para Fama de Pandilla (evita inflar contadores colectivos con cuentas inactivas).
  - `RESEND_API_KEY` ya estaba prevista como variable de entorno pendiente de configurar (BLUEPRINT.md) — este es el momento de activarla para el correo de verificacion.
- **Riesgo residual documentado y sin resolver hasta hoy:** `ADR-025` quedo reservado como candidato en ADR-024 para sesion firmada/atestacion de dispositivo (spoofing de GPS aceptado explicitamente "para ese alcance"). Esta entrega **si** lo resuelve (ver seccion 5.4).

---

## 2. Alcance de esta entrega

A. Sistema Piramidal de Referidos (XP REF), 5 niveles.
B. Crowdsourcing Geoespacial "Activo Oculto" — Wayfarer completo (propuesta + votacion peer-to-peer, no solo aprobacion de admin).
C. 3 Facciones + relabel de "Pandilla" a **"Parche"** en la UI.
D. Resolucion de `ADR-025` (sesion firmada / anti-replay / fingerprint) + verificacion de correo real obligatoria para las acciones sensibles nuevas.
E. Frontend minimo (no solo backend).

Fuera de alcance explicito (ver seccion 7).

---

## 3. Migracion `db/migrations/016_multinivel_crowdsourcing.sql`

Idempotente (Reglas de Oro punto 8 / ADR-008), asume 010-015 ya aplicadas. Todo con `IF NOT EXISTS`.

```sql
-- ============================================================
-- 016_multinivel_crowdsourcing.sql
-- Piramide de Referidos + Activo Oculto (Wayfarer) + Facciones + ADR-025
-- ============================================================

-- A. Piramide de Referidos + Facciones + verificacion de correo
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS referido_por UUID REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS codigo_referido VARCHAR(20),
  ADD COLUMN IF NOT EXISTS xp_ref_total INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referidos_directos_contados INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faccion VARCHAR(20),
  ADD COLUMN IF NOT EXISTS faccion_elegida_en TIMESTAMP,
  ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS email_token_expira TIMESTAMP,
  ADD COLUMN IF NOT EXISTS device_hashes JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_usuarios_referido_por ON usuarios(referido_por);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_codigo_referido
  ON usuarios(codigo_referido) WHERE codigo_referido IS NOT NULL;

-- B. Crowdsourcing geoespacial (Activo Oculto / Wayfarer)
CREATE TABLE IF NOT EXISTS activos_ocultos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesto_por UUID REFERENCES usuarios(id),
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  foto_url TEXT,
  categoria VARCHAR(50),
  ciudad VARCHAR(100),
  estado VARCHAR(20) DEFAULT 'pendiente',
  votos_favor INT DEFAULT 0,
  votos_contra INT DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT NOW(),
  resuelto_en TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activos_ocultos_votos (
  activo_id UUID REFERENCES activos_ocultos(id),
  usuario_id UUID REFERENCES usuarios(id),
  voto VARCHAR(10) NOT NULL,
  creado_en TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (activo_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS activos_ocultos_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id UUID REFERENCES activos_ocultos(id),
  usuario_id UUID REFERENCES usuarios(id),
  lat NUMERIC(10,7), lng NUMERIC(10,7), accuracy NUMERIC(6,2),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_activo_checkin_unico
  ON activos_ocultos_checkins(activo_id, usuario_id) WHERE activo = TRUE;

-- D. ADR-025: nonce anti-replay para geolocalizacion firmada
CREATE TABLE IF NOT EXISTS geo_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  nonce VARCHAR(64) NOT NULL,
  proposito VARCHAR(30),
  usado BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMP DEFAULT NOW(),
  expira_en TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_geo_nonce_unico ON geo_nonces(nonce);

-- Nota: la afinidad de Parche a Faccion NO se persiste (calculo dinamico
-- en tiempo de consulta, mismo principio que nivel/era/badge, seccion 2.6
-- del Plan Maestro). El control territorial por ciudad tampoco se persiste.
```

---

## 4. Matriz de operaciones (sin archivos nuevos — presupuesto 8/8 intacto)

### `api/usuarios.js` (v8 -> v9)

| `tipo=` / query | Metodo | Descripcion |
|---|---|---|
| `referido_codigo` | GET | Devuelve el `codigo_referido` propio; lo genera si no existe (slug corto, ej. 6 caracteres alfanumericos, colision-check contra el indice unico) |
| `referido_red` | GET | Arbol de referidos propios hasta 5 niveles via CTE recursiva sobre `referido_por`; devuelve conteo y `xp_ref_total` aportado por nivel |
| `faccion_elegir` | POST | Asigna `faccion` una sola vez; requiere `email_verificado=true` (ver 5.4) |
| `faccion_ranking` | GET | XP agregado por faccion (calculo dinamico via SUM sobre `usuarios.xp_total` agrupado por `faccion`, nunca almacenado) |
| `email_verificar_solicitar` | POST | Genera `email_token` (24h), envia correo via Resend |
| `email_verificar_confirmar` | POST | Valida `email_token`, marca `email_verificado=true` |
| Upsert de registro (ya existente, extender) | POST | Leer `?ref=<codigo>` en el registro; setear `referido_por` UNA sola vez (nunca despues, evita farming de re-asignacion); incrementar `referidos_directos_contados` del referente respetando el tope (5.1) |

### `api/interacciones.js` (v12 -> v13)

| `tipo=` | Metodo | Descripcion |
|---|---|---|
| *(interno, no es un tipo nuevo)* | - | Toda ruta que ya suma `xp_total` debe invocar la funcion compartida `repartirXpReferidos(usuarioId, xpGanado)` (ver 5.1) antes de retornar |
| `geo_nonce_solicitar` | GET | Emite nonce de un solo uso (expira 2 min) requerido antes de `visita` y `activo_oculto_checkin` (ADR-025) |
| `activo_oculto_proponer` | POST | Crea fila en `activos_ocultos`, `estado='pendiente'`; rechaza `lat/lng = 0,0`; requiere `email_verificado=true` |
| `activo_ocultos_pendientes` | GET | Lista para votar, excluye las propuestas propias del usuario que consulta |
| `activo_oculto_votar` | POST | Nivel minimo (5.2), 1 voto por usuario (PK compuesta lo garantiza), sin auto-voto, recalcula `estado` si se alcanza quorum |
| `activo_oculto_checkin` | POST | Reusa `haversineMetros`/`resolverRadioM` de ADR-024, exige nonce valido (ADR-025), solo sobre activos `estado='aprobado'` |

### `api/admin.js`

| `tipo=` | Metodo | Descripcion |
|---|---|---|
| `activo_oculto_moderar` | POST | Forzar aprobar/rechazar (casos de disputa o abuso), Bearer admin, Cero Borrado Logico (`activo=false`, nunca DELETE) |

---

## 5. Reglas de negocio (confirmadas por Javier + supuestos marcados)

### 5.1 XP Piramidal

- Aplica sobre **cualquier** XP que gane el referido, de cualquier fuente (confirmado).
- Se acumula en un contador **aparte**, `usuarios.xp_ref_total` — **nunca** en `xp_total` (confirmado: no debe mover el nivel real ni la era del referente).
- Solo se reparte por acciones **realmente validadas server-side** del referido (confirmado: "desde la actividad real"). Como hoy toda ganancia de XP ya pasa por validaciones server-side (geocerca, dedup, topes diarios), el reparto simplemente se dispara sobre el XP que el servidor efectivamente otorgo — no hace falta un chequeo adicional de "actividad real", ya esta implicito.
- Calculo **en tiempo real** (confirmado: "la mejor opcion" ante la ausencia de cron en Vercel Hobby): CTE recursiva sobre `referido_por` (hasta 5 ancestros) ejecutada dentro de la misma transaccion SQL que otorga el XP original.
- Porcentajes: L1=10%, L2=5%, L3=3%, L4=2%, L5=1%. Redondeo hacia abajo (`FLOOR`) para evitar drift fraccionario acumulado.
- Esquema: columna simple `referido_por` + CTE recursiva, **sin tabla de ledger dedicada** (confirmado: opcion 1).
- Codigo de referido: **uno solo por usuario por ahora** (confirmado), generado bajo demanda.
- La recompensa de compartir se activa **solo con el registro real** de un nuevo usuario via `?ref=<codigo>` (confirmado) — nunca por el acto de compartir en si (no verificable server-side).
- **Tope (confirmado que debe existir; numeros propuestos por Claude, a validar):**
  - Maximo **500 referidos directos contabilizados** por usuario (mas alla de eso el registro funciona, pero no suma mas al contador ni activa reparto adicional para ese referente).
  - Rate-limit de **20 registros nuevos contabilizados por dia** por codigo de referido (anti-bot de alta masiva).

### 5.2 Crowdsourcing "Activo Oculto" — Wayfarer completo

- Confirmado: se construye el sistema de **votacion peer-to-peer real** (no la version simplificada que reusa `publicar-lugar.js`).
- Proponer: abierto a cualquier usuario con correo verificado (sin nivel minimo — el filtro de calidad lo da la votacion, no la entrada).
- Votar: **requiere nivel minimo** (confirmado). *Propuesta de Claude a validar:* Nivel 5 (Vanguardia Territorial), el mismo nivel donde ya se desbloquea "voto de utilidad" para Own the Spot — coherencia de producto: quien ya califica calidad de reseñas esta habilitado para calificar calidad de puntos de encuentro.
- Quorum (*propuesta de Claude a validar*): `votos_favor - votos_contra >= 3` -> aprobado; `<= -3` -> rechazado. Sin voto en 30 dias -> se resuelve a rechazado en la siguiente lectura (calculo dinamico, no cron).
- Geocerca del checkin posterior a la aprobacion: **reusa integramente** el motor de ADR-024 (confirmado: "el mismo") — mismos radios, mismo cooldown, mismo tope 24h.
- Visibilidad: **no aparecen** en `index.html`/`/api/destinos`/directorio principal (confirmado: "generar la mejor opcion" -> se opta por mantenerlos fuera del directorio turistico y mostrarlos solo en un mapa de comunidad dedicado, coherente con el nombre "Activo Oculto").
- Recompensas diferenciadas confirmadas (numeros propuestos por Claude, a validar):
  - Proponer un activo que termina **aprobado**: +50 XP (nada si se rechaza, para no premiar spam de propuestas).
  - Votar: +5 XP por voto valido, tope diario 30 XP (6 votos/dia) — anti-farming de voto rapido sin criterio.
  - Checkin confirmado en un activo aprobado: +15 XP (menor que una visita a destino turistico curado editorialmente).
- Metadata de angulo/iluminacion inspirada en el VPS de Niantic: **confirmado que es solo conceptual** — no se implementa en esta entrega.

### 5.3 Facciones + Parches

- 3 Facciones fijas de entrada. Los nombres del pedido original eran ejemplos; Javier pidio que Claude proponga los definitivos. **Propuesta:** *Exploradores* (asociada al Sendero Explorador), *Curadores* (Sendero Critico + votacion de Activos Ocultos) y **Creadores** (Sendero Organizador + Audiovisual — enlaza directamente con "Era 4: Leyenda y **Gran Creador**", que ya existe en la tabla de 20 niveles). A confirmar antes de nombrarlas en produccion.
- **Confirmado explicitamente:** las Pandillas (renombradas a **"Parche"** en toda la UI) siguen siendo libres e independientes de la Faccion — un Parche no pertenece a una sola Faccion.
- **Recomendacion de Claude, a confirmar antes de ejecutar:** dejar los nombres internos de tabla/endpoint (`pandillas`, `pandillas_miembros`, `pandilla_retos`, `tipo=pandilla_crear/pandilla_unirse/pandilla_reto`) **sin cambiar** — el rename es solo de las etiquetas visibles al usuario. Evita una migracion de renombrado riesgosa sobre algo que ya esta en produccion (ADR-018) sin necesidad funcional real.
- **Confirmado:** un Parche recibe **mas puntos de Fama cuanto mayor sea la afinidad de sus miembros a una misma Faccion.** Diseño propuesto (a validar):
  - Afinidad = % de miembros activos del Parche que comparten la Faccion mas comun del grupo.
  - Multiplicador sobre la Fama de Parche generada: **100% afinidad -> x1.3**, **75-99% -> x1.15**, **50-74% -> x1.0**, **<50% -> x1.0** (nunca penalidad, para no castigar la inclusion).
  - Se calcula dinamicamente (JOIN `pandillas_miembros` + `usuarios.faccion` en el momento de la consulta) — **no se persiste**, siguiendo el mismo principio de calculo dinamico que nivel/era/badge.
- Permanencia de la eleccion de Faccion: **no quedo especificada en las respuestas.** *Propuesta de Claude, pendiente de tu confirmacion explicita antes de construir el candado:* permanente salvo cambio excepcional pagado con `puntos_canjeables` (ej. 500) + cooldown de 90 dias, para evitar oportunismo en el control territorial.
- Competencia entre Facciones (confirmado: "proponer la mejor opcion"): **control territorial dinamico por ciudad** — la Faccion con mas Activos Ocultos aprobados + checkins confirmados en una ciudad en los ultimos 30 dias "controla" esa ciudad (bandera/color de Faccion en el mapa de comunidad). Se recalcula en cada consulta, sin tabla de "dueño" persistida — mismo principio de calculo dinamico. A validar.

### 5.4 Anti-Sybil — ADR-025 resuelto en esta entrega

- **Verificacion de correo real (confirmado, obligatoria en esta entrega):** al registrarse se envia `email_token` (24h) via Resend. Mientras `email_verificado=false`, el usuario navega y gana XP normal, pero **no puede**: generar/usar codigo de referido, proponer o votar Activos Ocultos, ni fundar un Parche. Cierra el vector barato de Sybil en las dos features nuevas mas sensibles sin bloquear el uso general de la plataforma.
- **Verificacion fotografica (confirmado): fuera de alcance de esta entrega**, queda documentada como Fase 2 de roadmap.
- **Sesion firmada (confirmado que se resuelve ahora):** las operaciones que otorgan XP sensible (checkin de visita, checkin de Activo Oculto, voto) deben autenticarse con un JWT firmado (HMAC, secreto en variable de entorno nueva `SESSION_JWT_SECRET`) emitido por `usuarios.js` al login/registro, en vez de confiar en un `usuario_id` que el cliente simplemente adjunta al body.
  - **Verificar primero contra el archivo real (ADR-006)** si `interacciones.js` ya autentica el `usuario_id` de alguna forma antes de asumir que hace falta desde cero — no reconstruir algo que ya existe.
- **Nonce anti-replay:** antes de un checkin geolocalizado, el cliente pide un nonce de un solo uso (`GET ?tipo=geo_nonce_solicitar`, expira 2 min) y lo incluye en el POST — evita reproducir un payload de lat/lng/accuracy capturado una sola vez.
- **Device fingerprint ligero:** en cada login se guarda un hash de (user-agent + id aleatorio persistido en `localStorage`) en `usuarios.device_hashes` (tope 5 mas recientes). No es prueba dura de identidad; sirve para que el admin detecte redes de referidos que comparten dispositivo en revision manual, no para bloqueo automatico agresivo.

---

## 6. Frontend minimo requerido (confirmado: se incluye en esta entrega, no se pospone)

- `mi-perfil.html` — seccion "Mi Red": codigo de referido propio + boton copiar + imagen QR generada **100% client-side** via `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=...">` (sin libreria nueva, sin costo de backend, sin romper ASCII-safety porque es una URL, no codigo ejecutable) + lista simple (no grafo) de los 5 niveles de la red con conteo y `xp_ref_total` aportado por nivel.
- Selector de Faccion (una sola vez) con las 3 opciones y una linea de descripcion de cada una.
- Nueva seccion/mapa de comunidad para ver, proponer y votar Activos Ocultos cerca del usuario (boton "Proponer punto aqui" con geolocalizacion del navegador + lista de pendientes por votar).
- Reemplazar la etiqueta "Pandilla" por **"Parche"** en todos los textos visibles de `mi-perfil.html` / `comunidad.html` / `admin.html` (solo texto, sin tocar nombres de funcion/variable internos, ver 5.3).
- Banner "Verifica tu correo": no bloqueante para el uso general, bloqueante especificamente en los botones de Proponer / Votar / Generar codigo / Fundar Parche.

---

## 7. Fuera de alcance explicito de esta entrega

- Verificacion fotografica de identidad (Fase 2, roadmap).
- Visualizacion del arbol de referidos como grafo (solo lista simple por ahora, confirmado: "por ahora 1" codigo, alcance minimo de UI).
- Multiples codigos de referido por usuario.
- Captura de metadata de angulo/iluminacion en fotos de Activos Ocultos (inspiracion VPS conceptual, confirmado que no se implementa).
- Renombrar tablas/endpoints `pandilla*` a `parche*` a nivel de codigo (solo relabel de UI, salvo que Javier confirme lo contrario).

---

## 8. Checklist de verificacion obligatoria (Escudo GOLD)

1. `node --check` sobre los 3 archivos `api/*.js` tocados.
2. ASCII-safety: 0 bytes >127, 0 backticks, 0 doble-escape en `api/*.js` (script de verificacion en BLUEPRINT.md seccion 8).
3. Balance de `<div>` en cada HTML tocado (`mi-perfil.html`, `comunidad.html`, `admin.html`, mapa nuevo).
4. Migracion 016 probada **idempotente** (aplicar dos veces seguidas sin error).
5. Smoke test dedicado (patron de `scripts/smoke_visita_geocerca.js`) cubriendo: reparto piramidal de 5 niveles con redondeo y tope, ciclo completo de un Activo Oculto (proponer -> votar -> aprobar -> checkin), y bloqueo de las 4 acciones sensibles cuando `email_verificado=false`.
6. Confirmar contra el archivo real (ADR-006) el estado actual de autenticacion de `usuario_id` en `interacciones.js` antes de dar por hecho que el JWT de sesion hace falta desde cero.
7. **Sin archivos nuevos en `/api`** — presupuesto 8/8 verificado al cierre.
8. Al terminar, documentar como candidatos a ADR (verificar numero libre siguiendo el precedente de ADR-026 antes de asignarlo): "Piramide Multinivel + Crowdsourcing Wayfarer + Facciones" y la resolucion formal de "ADR-025: Sesion Firmada / Anti-Sybil".

---

## 9. Puntos marcados como propuesta de Claude — requieren tu confirmacion antes de construir

- Tope de 500 referidos directos + 20 registros/dia por codigo (5.1).
- Nivel 5 como minimo para votar Activos Ocultos, y quorum +/-3 votos netos (5.2).
- XP de recompensa: +50 proponer aprobado / +5 por voto (tope 30/dia) / +15 checkin (5.2).
- Nombres definitivos de Faccion: Exploradores / Curadores / Creadores (5.3).
- Dejar sin renombrar las tablas/endpoints `pandilla*` (5.3).
- Permanencia de la Faccion (cambio pagado + cooldown 90 dias) — este punto no llego a responderse explicitamente (5.3).
- Multiplicadores de afinidad de Parche: x1.3 / x1.15 / x1.0 (5.3).
- Control territorial por ciudad con ventana movil de 30 dias como mecanica de competencia entre Facciones (5.3).

hacer las preguntas necesarias para completar la tarea de la mejor forma posible
