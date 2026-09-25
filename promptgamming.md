# BRIEF QUIRÚRGICO — IMPLEMENTACIÓN EXPLORACO v6.1 GAMING & ARQUITECTURA

## OBJETIVO
Implementar las mejoras, correcciones y expansiones de la arquitectura de gaming v6.1 en el repositorio de ExploraCO, corrigiendo los flujos de frontend rotos, aplicando la migración SQL 016/017 para Gig Economy y actualizando la lógica del motor en `/api/interacciones.js` y `/api/usuarios.js`.

---

## REGLAS DE ORO V6 (AI-DOS — CUMPLIMIENTO OBLIGATORIO)
1. **LÍMITE SERVERLESS (8/8):** PROHIBIDO crear nuevos archivos en `/api/`. Todo nuevo handler o parámetro debe entrar como rama `tipo=` (GET) o `tipo2=` (POST) en los endpoints existentes (`interacciones.js` o `usuarios.js`).
2. **CERO BORRADO LÓGICO:** Ningún `DELETE` SQL. Toda baja debe ser `UPDATE ... SET activo = false`.
3. **REGLA DE MERGE JSONB:** Toda actualización de objetos JSONB (`capacidades`, `progreso_misiones`, `progreso_logros`, `device_hashes`) DEBE usar el operador de merge SQL (`||`) con `COALESCE`:
   `UPDATE usuarios SET capacidades = COALESCE(capacidades, '{}'::jsonb) || $2::jsonb WHERE id = $1;`
4. **ESTÁNDAR ASCII-SAFE EN `/api/`:** Los archivos dentro de `/api/*.js` deben ser 100% ASCII-Safe (0 bytes > 127 y 0 backticks en cadenas/mensajes). Utiliza comillas simples y escapes `\n` o `\uXXXX` si es estrictamente necesario.
5. **CERO CATCH SILENCIOSOS:** Todo bloque `try/catch` debe retornar `{ success: false, error: 'MENSAJE_ASCII', code: 'CODIGO_ERROR' }`.

---

## TAREAS DE IMPLEMENTACIÓN

### TAREA 1: MIGRACIÓN SQL (DB / NEON)
Crea o actualiza el archivo `db/migrations/016_multinivel_crowdsourcing.sql` (o `017_gig_economy_v6.sql`) asegurando las siguientes tablas e índices con sentencias idempotentes (`IF NOT EXISTS`):
1. **Contratos P2P:** Tabla `contratos_p2p` (`id UUID`, `empleador_id FK`, `contratado_id FK`, `destino_id FK`, `tipo_encargo`, `recompensa_puntos INT`, `descripcion TEXT`, `estado`, `expira_en TIMESTAMPTZ`).
2. **Soberanía y Upgrades:** Tabla `parche_upgrades` (`id UUID`, `parche_id FK`, `ciudad_slug VARCHAR`, `tipo_upgrade`, `puntos_invertidos INT`, `activo_hasta TIMESTAMPTZ`).
3. **Prensa y Anti-Sybil:** Columnas en `usuarios`: `referido_por`, `codigo_referido`, `xp_ref_total`, `referidos_directos_contados`, `faccion`, `faccion_elegida_en`, `email_verificado`, `device_hashes JSONB`.
4. **Wayfarer:** Tablas `activos_ocultos`, `activos_ocultos_votos`, `activos_ocultos_checkins` y `geo_nonces`.

---

### TAREA 2: ARREGLO DE FLUJOS ROTOS EN FRONTEND

#### A. Flujo de Visita Presencial (`usuario-session.js`)
- **Problema:** `window.ExploraCO.marcarVisitado` no envía JWT Bearer ni `nonce` al backend `v13`.
- **Solución:**
  1. Solicitar previamente el `geo_nonce` llamando a `GET /api/interacciones?tipo=geo_nonce_solicitar&usuario_id=...`.
  2. Obtener el token JWT almacenado en `localStorage` o sesión.
  3. Adjuntar la cabecera `Authorization: Bearer <jwt>` y el parámetro `nonce` en el cuerpo del POST a `/api/interacciones` (`tipo2=visita`).

#### B. Flujo de Captura de Referidos (`mi-perfil.html` / `registro.html`)
- **Problema:** Los enlaces apuntan a `/registro.html?ref=...` pero no se procesa la captura del código `ref`.
- **Solución:**
  1. Asegurar que la vista de autenticación o modal de registro lea `new URLSearchParams(window.location.search).get('ref')`.
  2. Pasar el parámetro `ref` en la petición de registro o upsert enviado a `POST /api/usuarios` (`tipo=upsert` o registro inicial).

---

### TAREA 3: MOTOR CORE DE GAMING & PROGRESIÓN V6.1 (`/api/interacciones.js` Y `/api/usuarios.js`)

#### A. Mapeo de Nivel Derivado (40 Niveles / 5 Eras)
- Actualiza la matriz de umbrales `XP_NIVELES` en `usuarios.js` e `interacciones.js` para escalar dinámicamente de Nivel 1 a Nivel 40 (Era Mundana N1-8, Patrocinada N9-16, Cronista N17-24, Leyenda N25-32, Mito N33-40).
- Asegura que `calcularNivel(xp_total)` retorne `{ nivel, era, badge_actual }` calculados al vuelo sin persistir.

#### B. Multiplicadores y Caps Dinámicos
- En `interacciones.js`, consolida el cálculo del XP final aplicando el **Doble Cap Secuencial**:
  $$\text{XP}_{\text{Entregado}} = \text{Base} \times \min(M_{\text{nivel}} \times M_{\text{clase}} \times M_{\text{origen}}, 5.0) \times M_{\text{temp}} \le 10.0\text{x}$$
- Integra la función de lejanía de origen (ADR-058) `calcularFactorOrigen(distancia_km)`:
  - Local ($\le 25\text{ km}$): `1.0`
  - Nómada ($25\text{--}1000\text{ km}$): `1.0 + 0.2 * (km / 1000)` (máx `1.20`)
  - Extranjero ($> 1000\text{ km}$): Máx `1.40` (requiere `email_verificado = true`).

#### C. Handlers para Gig Economy P2P
Agrega en el ruteador `tipo2` de `interacciones.js`:
- `tipo2 = 'contrato_crear'`: Deduce la recompensa del balance de XP del usuario y crea el registro en `contratos_p2p`.
- `tipo2 = 'contrato_completar'`: Transfiere la recompensa al contratado y libera el estado a `'completado'`.

---

## COMANDOS DE VALIDACIÓN Y VERIFICACIÓN
Al terminar el refactor, ejecuta los siguientes comandos en la terminal de OpenCode:

1. **Verificación ASCII-Safe en `/api/`:**
   `node -e "const fs=require('fs'); ['interacciones.js','usuarios.js','admin.js'].forEach(f => { const b=fs.readFileSync('api/'+f); const nonAscii=[...b].filter(x=>x>127); console.log(f, 'Non-ASCII bytes:', nonAscii.length); });"`
   *(Debe arrojar 0 bytes Non-ASCII en todos los archivos).*

2. **Verificación de Sintaxis y Compilation Check:**
   `node --check api/interacciones.js && node --check api/usuarios.js`

3. **Ejecución de Tests Integration / Smoke:**
   `npm test` o `node scripts/smoke_016_multinivel_crowdsourcing.js`

---
PROCEDE A LEER LOS ARCHIVOS AFECTADOS, PLANIFICAR EL CAMBIO LÍNEA POR LÍNEA Y APLICAR LAS MODIFICACIONES.