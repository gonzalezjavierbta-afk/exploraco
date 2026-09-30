# ADR-LATAWEL: Migracion de identidad visual de ExploraCO a LATAWEL

**ID:** ADR-LATAWEL (consecutivo propuesto: ADR-073; se consolidara en `exploraco desarrollo/DECISIONS.md` en el pase de cierre, R2 - no se edita aqui)
**Fecha:** 2026-09-30
**Autor:** Chief Architect (AI-DOS) / decision de producto del operador (PO)
**Estado:** Aceptado (2026-09-30)

**Nota de numeracion:** el mayor ADR registrado en el archivo real es ADR-072 (verificado por ADR-006). Este documento vive en `logos/` por la restriccion R2 (docs del AI-DOS Core solo en el pase de cierre) y se incorporara como ADR-073 cuando el pase de cierre lo autorice.

---

## 1. Contexto y problema

El sitio exploraCO (repo `exploraco`) opera hoy con una identidad de marca (nombre, paleta dorada, tipografia y activos) que ya no corresponde a la marca vigente. El operador aprobo la migracion a la marca **LATAWEL** con su manual de identidad (`logos/07-MANUAL.md`, v1.0) y entrego los activos disponibles como 4 PNG en `logos/` (no existe SVG maestro).

El problema a resolver es **cambiar la identidad visible sin tocar la estructura ni la logica del producto**:

- No se redisenan las 20 pantallas del prompt de rediseno; el alcance es SOLO identidad sobre la estructura actual.
- La produccion no es solo estatica: el rewrite de `vercel.json` (`/:slug.html -> /api/pagina-destino?slug=:slug`) hace que **`api/pagina-destino.js` sea la superficie primaria** de las fichas; los HTML estaticos tambien deben migrarse.
- Existen identificadores tecnicos que contienen la cadena "ExploraCO" o "exploraco" (namespace `window.ExploraCO`, token, style id, endpoints) que **NO deben tocarse** so pena de romper sesion, compartir, auth y contrato de datos.
- No se pueden crear endpoints nuevos (presupuesto Vercel Hobby 8/8, ADR-001/ADR-010) ni migraciones de esquema.

Baseline medido sobre el archivo real el 2026-09-30 (HTML+JS+CSS publicos, excl. `node_modules`; ADR-006):

| Literal en el repo | Ocurrencias |
|---|---|
| `#E8A020` | 850 |
| `#C8860A` | 386 |
| `#FDF3E0` | 129 |
| `#ffb400` | 12 |
| `rgba(232,160,32` | 1627 |
| `ExploraCO` | 1639 |
| `exploraco.co` | 411 |

HTML reales: 126 total (122 publicos sin prefijo `_` + 4 fragmentos `_*_body.html`); el alcance aprobado cita 119 paginas. De acuerdo con ADR-006, el codemod debe enumerar el set real y no confiar en el numero citado.

---

## 2. Decision

Se adopta una **migracion de identidad por capa**: tokens de diseno re-mapeados + texto visible y meta tags reemplazados + activos derivados a `assets/brand/`, preservando todo identificador tecnico, el esquema de datos, los endpoints y la estructura de las pantallas.

### 2.1 Tabla de decisiones

| # | Tema | Decision |
|---|---|---|
| 1 | **Alcance** | SOLO cambio de identidad sobre la estructura actual. NO se redisenan las 20 pantallas del prompt de rediseno. Se acepta como deuda visual las pantallas no pulidas. |
| 2 | **Marca** | Nombre oficial **LATAWEL**: mayusculas sostenidas, una sola palabra, sin espacios, sin guiones, sin variaciones (manual 08.1). |
| 3 | **Tagline** | **"What to do?"** es el tagline oficial. Se descarta "Tus eventos, tus entradas" (D021). |
| 4 | **Descriptor** | **"plataforma de turismo interactivo"** (manual 0 y 1). |
| 5 | **Dominio** | Web/dominio destino **latawel.com**. Migran canonical, OG (`og:url`, `og:image` absoluta), `sitemap.xml`, `FROM_EMAIL` y las constantes `BASE`. **GATED:** el cambio de dominio solo se activa cuando latawel.com exista y resuelva (DNS + TLS + verificacion del dominio en el proveedor de email). Antes de eso, las constantes conservan el valor anterior via fallback. |
| 6 | **Paleta** | Naranja LATAWEL `#FF4A00` (principal), Negro Azulado `#0F1419`, Blanco `#FFFFFF`, Gris Interfaz `#E5E7EB`, Naranja Claro `#FFB84D`. Se descartan `#E8A020`, `#C8860A`, `#FDF3E0` y `#ffb400`. |
| 7 | **Tipografia** | **Poppins SOLO** para marca/logo y tagline. En texto se conservan **Barlow Condensed + Outfit**. No se reconstruye el wordmark tipograficamente (manual 8.3/12). |
| 8 | **Header** | Header oscuro `#0F1419` con **logo horizontal en variante de fondo oscuro (wordmark blanco)**; enlaces claros, CTA en naranja. |
| 9 | **Formas y espaciado** | Radio 12px (cards 12-16, chips 999). Espaciado en multiplos de 4 (subsume la escala base 8 del manual 16.1). |
| 10 | **Assets** | Se generan derivados en `assets/brand/` a partir de los 4 PNG de `logos/`. Contrato cerrado en la seccion 4. No hay SVG maestro; se acepta como deuda. |
| 11 | **Codemod** | Reemplazo textual controlado (seccion 2.2) con **denylist de identificadores** y verificacion ASCII-safe en `api/*.js`. |
| 12 | **Superficie de produccion** | **Primaria:** `api/pagina-destino.js` (por el rewrite `/:slug.html`). **Tambien:** las paginas HTML estaticas (alcance aprobado 119; real 122+4). **Soporte:** `api/utilidades.js` (sitemap/blog-lista/buscar), `api/usuarios.js` y `api/admin.js` (`FROM_EMAIL`). |
| 13 | **Backend / datos** | **0 endpoints nuevos** (8/8 intacto, ADR-001/ADR-010), **0 migraciones**, **0 cambios de esquema**. `tags` JSONB intacto (Cero Borrado Logico / ADR-003): esta migracion no escribe en `tags` ni usa el motor `CATEGORY_TAG_FIELDS`/`CATEGORY_TAG_LISTS`. |

### 2.2 Codemod (reglas)

**Textual visible (SE REEMPLAZA):**
- `ExploraCO` -> `LATAWEL` en `title`, `og:site_name`, `og:title`, `og:description`, `twitter:title`, JSON-LD `name`, footer `(c) 2026 ...`, y en los patrones `document.title.replace(' - ExploraCO','')` / `document.title.replace(' - ExploraCO','')`.
- El separador de titulo pasa a `" | LATAWEL"` (ASCII, sin guion largo no-ASCII).

**Dominio (GATED):**
- `exploraco.co` -> `latawel.com` en canonical, `og:url`, `og:image` absoluta, `sitemap.xml` y `FROM_EMAIL`, **solo** cuando el dominio exista/resuelva.
- Implementacion recomendada: constante/enviroment con fallback, ej. `var BASE = process.env.SITE_BASE_URL || 'https://exploraco.co';` y `var FROM_EMAIL = process.env.FROM_EMAIL || 'ExploraCO <noreply@exploraco.co>';`. El corte de dominio es entonces un cambio de variable, reversible en un paso.

**Color (SE REEMPLAZA):**
- Hex y rgba legacy (`#E8A020` / `rgba(232,160,32,...)` / `#C8860A` / `#FDF3E0` / `#ffb400`) -> tokens LATAWEL segun el mapeo de la seccion 3.2.
- Preferir el re-mapeo de tokens (seccion 3.1) sobre la caza literal de hex, para reducir ~3004 sustituciones a unos pocos puntos.

**Denylist de identificadores (NUNCA SE REEMPLAZA):** ver seccion 5. El codemod debe usar limites de palabra y excluir cuando `ExploraCO` sea parte de un identificador protegido.

### 2.3 Validacion del codemod

Se acepta el codemod cuando, sobre las superficies en alcance:
1. `grep` de `#E8A020`, `#C8860A`, `#FDF3E0`, `#ffb400`, `rgba(232,160,32` = 0.
2. `grep` de `ExploraCO` standalone visible = 0 (solo permanecen ocurrencias dentro de identificadores protegidos).
3. `grep` de `exploraco.co` = 0 en superficies publicas (tras autorizar el corte de dominio).
4. Escudo GOLD limpio: `node --check` PASS, 0 bytes > 127, balance de divs.
5. Smoke: home, una ficha via `api/pagina-destino.js`, `sitemap.xml`, `blog.html`, `/buscar`.

---

## 3. Tokens de diseno (bloque CSS propuesto)

### 3.1 Bloque de marca

```css
:root{
  /* --- Tokens de marca LATAWEL (fuente de verdad) --- */
  --ltw-orange:#FF4A00;
  --ltw-navy:#0F1419;
  --ltw-white:#FFFFFF;
  --ltw-gray-ui:#E5E7EB;
  --ltw-orange-light:#FFB84D;

  /* Tipografia */
  --ltw-font-brand:'Poppins',sans-serif;          /* SOLO logo y tagline */
  --ltw-font-display:'Barlow Condensed',sans-serif;
  --ltw-font-body:'Outfit',sans-serif;

  /* Formas */
  --ltw-radius:12px;
  --ltw-radius-card:16px;
  --ltw-radius-chip:999px;

  /* Espaciado (multiplos de 4) */
  --ltw-space-1:4px;
  --ltw-space-2:8px;
  --ltw-space-3:12px;
  --ltw-space-4:16px;
  --ltw-space-6:24px;
  --ltw-space-8:32px;
  --ltw-space-12:48px;

  --ltw-shadow-card:0 4px 16px rgba(0,0,0,.08);
}
```

### 3.2 Capa de compatibilidad (re-mapeo de tokens legacy)

El markup existente usa `var(--gold)`, `var(--gold-dark)`, `var(--gold-light)`, `var(--black)`, `var(--bg)`, `var(--warm)`, `var(--border)`. Para no redisenar, el codemod **cambia solo estos valores** y no los usos:

```css
:root{
  --gold:#FF4A00;        /* antes #E8A020  - primario / CTA */
  --gold-dark:#FFB84D;   /* antes #C8860A  - hover de superficies (manual 14.3) */
  --gold-light:#E5E7EB;  /* antes #FDF3E0  - fondo de avisos / superficies */
  --black:#0F1419;       /* antes #111      - header / hero / texto */
  --white:#FFFFFF;
  --bg:#FFFFFF;          /* antes #F8F7F3   - fondo general */
  --warm:#E5E7EB;        /* antes #FBF8F2   - superficie calida -> gris interfaz */
  --border:#E5E7EB;      /* antes #EDE8E0   - divisores */
  --gold-ink:#FF4A00;    /* NUEVO token - texto/enfasis sobre fondos claros */
}
```

**Caveat del doble rol de `--gold-dark`:** cuando el codemod lo encuentre como `color:` (texto sobre fondo claro) debe sustituir el uso por `var(--gold-ink)` (`#FF4A00`); cuando sea fondo/borde de hover, conserva `var(--gold-dark)` (`#FFB84D`). Es la unica sustitucion de uso permitida por legibilidad/contraste.

**Accesibilidad (manual 14.2):** blanco sobre `#FF4A00` ronda 3.4:1 -> solo texto grande y componentes de UI. Negro azulado sobre naranja ronda 5.5:1 (AA). Texto principal sobre `#FFFFFF`/`#E5E7EB` con `#0F1419`.

---

## 4. Contrato de assets

Los derivados se generan a partir de los 4 PNG de `logos/` y se publican en rutas fijas. **El resto del equipo consume exclusivamente estas rutas** (no las de `logos/`):

| Ruta publicada | Uso |
|---|---|
| `assets/brand/latawel-logo-horizontal.png` | Logo horizontal a color, fondo claro (header claro, docs) |
| `assets/brand/latawel-logo-horizontal-white.png` | Logo horizontal variante fondo oscuro (wordmark blanco) - header `#0F1419` |
| `assets/brand/latawel-logo-vertical.png` | Logo vertical principal (incluye sombra eliptica oficial, manual 9.1) |
| `assets/brand/latawel-simbolo.png` | Isotipo/app/icono (pin + 2 arcos), sin wordmark |
| `assets/brand/favicon/favicon-16.png` | Favicon 16x16 |
| `assets/brand/favicon/favicon-32.png` | Favicon 32x32 |
| `assets/brand/favicon/favicon-180.png` | Apple touch icon 180x180 |
| `assets/brand/favicon/favicon.ico` | Contenedor ICO multi-resolucion (generado; el ICO no puede ser un PNG renombrado) |
| `assets/brand/og/latawel-og-1200x630.png` | Imagen OG propia de marca (reemplaza la foto Unsplash por defecto) |

Fuentes de origen disponibles en `logos/`: `logo horizontal la tawel.png`, `Logo vertical.png`, `boton.png`, `boton vertical latawel.png`. **No existe SVG maestro ni PNG con wordmark blanco**: la variante blanca y el ICO se derivan por manipulacion digital. Se acepta como deuda (ver seccion 7).

---

## 5. Separacion: identidad visual vs identificadores tecnicos

### 5.1 Identidad visual (SE CAMBIA)

- Texto visible de marca: `ExploraCO` -> `LATAWEL`.
- Tagline "What to do?" y descriptor "plataforma de turismo interactivo".
- `title`, `og:site_name`, `og:title`, `og:description`, `twitter:*`, JSON-LD `name`.
- Paleta legacy -> paleta LATAWEL; tipografia de marca (Poppins solo marca/tagline).
- Header oscuro y logos (color / blanco), favicons e imagen OG.
- Dominio en canonical, OG, sitemap y `FROM_EMAIL` (gated).

### 5.2 Identificadores tecnicos (SE CONSERVAN - prohibido reemplazar)

- `window.ExploraCO` (namespace global del cliente).
- `window.onExploraCOUpdate` (hook entre scripts).
- Token por defecto `'exploraco12345'` (`ADMIN_SECRET`) en `api/*.js`.
- `STYLE_ID = 'exploraco-share-style'` en `compartir.js`.
- Nombres de archivo `.html` (slugs de rutas y redirecciones de `vercel.json`).
- Endpoints `/api/*.js` y query params `tipo=`.
- Esquema y objetos de DB: tablas, columnas, nombres de rol, `tags` JSONB.
- Carpeta `exploraco desarrollo/` y demas nombres tecnicos de repositorio.
- Cualquier otra literal `exploraco` no visible: debe auditarse y conservarse salvo prueba de que es texto de marca visible.

---

## 6. Consecuencias

**Positivas**
- Identidad unificada (marca, paleta, tipografia y activos) sin rediseno ni deuda estructural.
- Re-mapeo de tokens minimiza el codemod: ~3004 colores literales colapsan a pocos puntos.
- Riesgo backend ~0: 0 endpoints nuevos, 0 migraciones, 0 cambios de esquema.
- Corte de dominio reversible en un paso (variable con fallback).

**Negativas / aceptadas**
- Deuda visual: pantallas no pulidas del prompt de rediseno quedan fuera (aceptado por el PO).
- Deuda de activos: sin SVG maestro, los derivados son raster y la variante blanca/ICO son manipulados.
- Deuda de marca: el manual pide vector como maestro (18); no se cumple aun.
- CSS huerfano potencial de tokens retirados mientras no se limpie (bajo, `--gold-*` se reusa).

---

## 7. Riesgos

| Riesgo | Mitigacion |
|---|---|
| Codemod reemplaza identificadores (`window.ExploraCO`, `exploraco12345`, `exploraco-share-style`) | Denylist + limites de palabra + validacion de la seccion 2.3 antes de commit |
| Corte de dominio antes de que latawel.com exista: canonical/OG/sitemap/email rotos | Gate por variable con fallback; activar solo con DNS + TLS + dominio verificado en email |
| Reemplazo de `FROM_EMAIL` sin dominio verificado: entregabilidad rota (Resend) | Mantener `exploraco.co` hasta verificar latawel.com en el proveedor |
| No-ASCII en `api/*.js` (guion largo en sufijos de titulo) | Usar `" | LATAWEL"` ASCII; Escudo GOLD exige 0 bytes > 127 |
| Sin SVG maestro: derivados de baja calidad/escalado | Aceptado como deuda; reemplazar por SVG cuando el proveedor de marca lo entregue (T19) |
| Contraste: blanco sobre `#FF4A00` 3.4:1 | Reservar blanco sobre naranja a texto grande/UI; cuerpo oscuro sobre claro |
| Cache social de OG/canonical antiguos | Re-scrape manual de OG tras deploy; `Cache-Control` ya existe para `api/*` y `.js` |
| Sesion/datos rotos | Identificadores preservados; localStorage keys intactas -> sesion y progreso sobreviven |

---

## 8. Rollback

- **Visual:** revertir el commit del codemod restaura texto, meta y tokens. La capa de compatibilidad concentra el cambio de color en pocos puntos.
- **Dominio:** volver a `exploraco.co` en la variable con fallback (un paso, sin tocar codigo de pagina).
- **Assets:** son archivos NUEVOS en `assets/brand/`; los PNG originales de `logos/` se conservan, por lo que el rollback no requiere re-generar nada.
- **Datos:** no hay rollback de datos porque no hay migraciones ni escritura en `tags`/DB.
- **Restriccion:** los HTML estaticos migrados se restauran por `git revert`; no hay estado externo afectado.

---

## 9. Verificacion y criterios de cierre

1. Codemod validado segun seccion 2.3 (greps en 0, Escudo GOLD, ASCII-safe).
2. Contrato de assets publicado y con `HEAD 200` en las 9 rutas de la seccion 4.
3. Favicon e imagen OG actualizados en `index.html` y en la cabecera generada por `api/pagina-destino.js`.
4. Smoke de home, ficha dinamica, `sitemap.xml`, `blog.html` y `/buscar`.
5. Registro del ADR-073 en `exploraco desarrollo/DECISIONS.md` y ajuste de `BLUEPRINT.md` en el pase de cierre (R2).
6. Commit unico de identidad (sin cambios funcionales mezclados).

---

## 10. ADRs relacionados

ADR-001 (prohibicion de frameworks / presupuesto 8/8), ADR-002 (ASCII-safe), ADR-003 (merge JSONB / Cero Borrado Logico), ADR-004 (scoped CSS), ADR-006 (baseline de verdad), ADR-010 (presupuesto 8/8). Fuente de identidad: `logos/07-MANUAL.md` v1.0 (D017, D019, D020, D021, D022).

---

## 11. Preguntas abiertas y bloqueantes

1. **Corte de dominio:** latawel.com ya esta registrado y delegado? Hay acceso a DNS y al proveedor de email para verificar el dominio? Define la fecha del gate.
2. **Conteo de HTML:** el alcance aprobado cita 119; el archivo real tiene 122 publicos + 4 fragmentos `_*.html`. Se incluyen los 4 fragmentos y las plantillas `_monserrate_*` en el codemod?
3. **Assets:** quien produce y con que herramienta la variante blanca (`latawel-logo-horizontal-white.png`), el `favicon.ico` y la OG 1200x630? Hay plazo para el SVG maestro (T19) que reemplace los raster?
4. **`--gold-dark`:** se aprueba el split `--gold-ink` (#FF4A00) para texto y `--gold-dark` (#FFB84D) para hover, o se prefiere un unico valor?
5. **`FROM_EMAIL`:** mantener `ExploraCO <noreply@exploraco.co>` hasta verificar latawel.com, o cambiar el nombre visible a `LATAWEL` conservando el remitente exploraco.co mientras tanto?
6. **Fuera de alcance:** `map-picker.js`, `mapa-cultural.js` y los ~90 HTML con `cartocdn` (ADR-071) se incluyen en la pasada de identidad o se dejan como deuda separada?
