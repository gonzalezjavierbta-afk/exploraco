# next/ - frontend nuevo (SSG)

Andamiaje del frontend nuevo de ExploraCO segun **ADR-114**. Solo se migran aqui
las rutas ya aprobadas; el resto del sitio (HTML/CSS de silo en la raiz) sigue
intacto y gobernado por `@frontend-tpl` / ADR-004.

## Estado

- `inventario.json` tiene **0 rutas**: nada migrado todavia.
- No existe `middleware.*`, ni `app/**/route.*`, ni `api/`. El presupuesto de
  funciones serverless (8/8) no se toca: `output: 'export'` no emite funciones.
- La raiz `/` es una pagina provisional que emite `out/index.html`.

## Version efectiva instalada

Medido con `npm ls --depth=0` y `node_modules/<pkg>/package.json` (2026-11-02):

| Paquete | Version |
|---|---|
| next | 16.4.3 |
| react | 19.3.1 |
| react-dom | 19.3.1 |
| tailwindcss | 4.3.3 (**v4**) |
| @tailwindcss/postcss | 4.3.3 |
| typescript | 7.0.2 |
| shadcn (CLI) | 4.23.0 |
| @base-ui/react | 1.9.0 |
| node | v24.16.0 |
| npm | 11.13.0 |

Tailwind resolvio **v4**, por eso: `@import "tailwindcss"` + `@theme inline` +
`@tailwindcss/postcss` en `postcss.config.mjs`. **No hay `tailwind.config.*`** con
`content` globs: v4 detecta el contenido automaticamente. Si en algun momento se
baja a v3, habria que crear `tailwind.config.ts` con `content`.

## Comandos

```powershell
cd next
npm install         # dependencias del frontend nuevo (no toca la raiz)
npm run dev         # servidor de desarrollo
npm run build       # export estatico -> next/out/
npm run typecheck   # tsc --noEmit
npm run preview     # sirve out/ en http://localhost:4173 (script propio, sin deps)
```

## Como se inspecciona el export

```powershell
Test-Path out/index.html                 # True
Get-ChildItem out -Recurse -Filter *.css # hoja compilada de Tailwind
npm run preview                          # revisar navegando contra out/
```

`out/`, `.next/`, `node_modules/` estan en `next/.gitignore`; **no se versionan**.
El `.gitignore` de la raiz no se toca.

## Tokens

`app/globals.css` declara en `:root` los tokens **verbatim** del silo CSS original
(`_premium.css:4`, identico en `_motor.css:1`) y los mapea a Tailwind en
`@theme inline`:

- color: `gold` `#FF4A00` (acento), `gold-dark` `#FFB84D`, `gold-light` `#E5E7EB`,
  `ink` `#1A1A1A` (texto), `carbon` `#0F1419` (superficie oscura), `warm` `#E5E7EB`
- tipografia: `font-body` = `Outfit`, `font-display` = `Barlow Condensed`
- radios: `radius-xc-sm` 2px, `radius-xc` 3px (dominante en botones), `radius-xc-md`
  6px, `radius-xc-lg` 8px

No hay variables de espaciado en el silo CSS original, asi que no se inventaron
tokens de espaciado: se usa la escala por defecto de Tailwind. `--border` y
`--muted` del repo **no** se redeclaran porque esos nombres ya los ocupa la capa
semantica de shadcn.

## Notas de migracion

- URLs sin barra final (`trailingSlash: false`) y `.html` por ruta: `/sobre.html`
  se preserva tal cual.
- Navegacion interna con `<a>`, sin `<Link>` con prefetch.
- Binarios por referencia absoluta a `https://latawel.com/...`; `assets/` **no** se
  copia a `public/`.
- `vercel.json` aplica `X-Robots-Tag: noindex` **solo** al host `*.vercel.app`.
- Metadatos SEO de cualquier ruta migrada: los propone `@next-dev` en el markup y
  los aprueba `@seo-dev` (ADR-115 D2). `app/layout.tsx` lleva el TODO explicito.

## Decisiones del andamiaje (2026-11-02)

Cerradas por el orquestador a partir de las preguntas abiertas del andamiaje.

1. **shadcn `style: base-nova` se mantiene** (@base-ui/react 1.9.0). Base UI es la
   linea activa del ecosistema (Radix entro en mantenimiento lento) y es el default
   del CLI 4.23.0 que resolvio este entorno, ya verificado en build. Re-inicializar
   con `-b radix` costaria re-`init` + re-`add` y arriesga el mapeo de tokens de
   `globals.css` que si esta validado. Revisar si aparece un componente sin
   equivalente en Base UI (hoy solo hay uno: `button`).
2. **TypeScript 7.0.2 se mantiene.** `npm run typecheck` y `npm run build` pasan
   con este codigo y `next build` no usa `tsc` (usa SWC), asi que el riesgo queda
   contenido al script `typecheck`. Revisar si una herramienta futura (eslint con
   typed rules) exige la API de TS 5.x.
3. **`next/package-lock.json` se versiona.** Vercel con Root Directory `next/`
   instala con lockfile: build reproducible y `npm ci` posible. El aviso de
   lockfiles multiples lo cubre `turbopack.root` en `next.config.mjs`.
4. **`preview` = `node scripts/preview.mjs` (0 dependencias).** Servidor propio sin
   version flotante ni red, y con control explicito del mapeo `/ruta.html` ->
   archivo, que es justo lo que P1/P4 tienen que medir. `npx serve` queda descartado
   por dependencia externa.
5. **`next-env.d.ts` sigue en `.gitignore`.** Es el default de la plantilla oficial
   de Next y Next lo regenera en `dev`/`build`.
6. **`shadcn` se queda en `dependencies`.** Solo se usa en build
   (`@import "shadcn/tailwind.css"`) y con `output: 'export'` la distincion
   dependencies/devDependencies no altera el bundle; moverlo no aporta beneficio
   medible y obliga a re-verificar. `npm audit` marca `deepmerge` en su arbol
   transitivo, pero no llega a `out/` (es build-time).

### Pendientes conocidos

- (a) `alias_produccion`: el valor real lo fija el OPERADOR en Vercel; no se
  inventa un literal.
- (b) Metadatos de `app/layout.tsx`: pendientes del gate `@seo-dev` (ADR-115 D2).
- (c) Que `app/<ruta>/page.tsx` emita `out/<ruta>.html` esta **inferido** de
  `out/404.html` y `out/_not-found.html`; se mide en el piloto `sobre`
  (ADR-114 D13).
- (d) El arnes de paridad (deuda D-1) debe normalizar la barra final de las URLs
  de origin (`https://latawel.com` == `https://latawel.com/`) al comparar P3;
  Next 16 no emite la barra en el canonical de la raiz.
