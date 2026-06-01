# ExploraCO — Guía de Configuración Netlify + Neon
## Paso a Paso para Publicar el Portal Dinámico

---

## PASO 1 — Configurar Variables de Entorno en Netlify

1. Ve a **app.netlify.com** → tu sitio → **Site Settings**
2. En el menú lateral: **Environment Variables**
3. Agrega estas 2 variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_2lOyG9EUWsRb@ep-shiny-voice-aqg9cltg-pooler.c-8.us-east-1.aws.neon.tech/exploraco?sslmode=require&connect_timeout=10` |
| `DATABASE_URL_UNPOOLED` | `postgresql://neondb_owner:npg_2lOyG9EUWsRb@ep-shiny-voice-aqg9cltg.c-8.us-east-1.aws.neon.tech/exploraco?sslmode=require` |

> ⚠️ **IMPORTANTE:** La diferencia entre las dos URLs es `-pooler` en el hostname.
> - `DATABASE_URL` → con `-pooler` → para las funciones serverless en producción
> - `DATABASE_URL_UNPOOLED` → sin `-pooler` → solo para migraciones locales

---

## PASO 2 — Ejecutar la Migración (crear tablas en Neon)

### Opción A — Desde tu computador local

```bash
# 1. Clonar o navegar a la carpeta del backend
cd ExploraCO_Backend

# 2. Instalar dependencias
npm install

# 3. Crear .env.local con tus credenciales
cp .env.example .env.local
# Editar .env.local y pegar tus URLs de Neon

# 4. Ejecutar migración
npm run migrate

# Deberías ver:
# ✅ Conexión exitosa
# ✓ TABLE categorias
# ✓ TABLE destinos
# ✓ TABLE usuarios
# ✓ TABLE interacciones
# 🎉 Base de datos lista para ExploraCO
```

### Opción B — Desde Neon Console (sin instalar nada)

1. Ve a **console.neon.tech** → tu proyecto `exploraco`
2. Clic en **SQL Editor**
3. Pega el contenido completo de `schema.sql`
4. Clic **Run**

---

## PASO 3 — Verificar las tablas en Neon

En el SQL Editor de Neon, ejecuta:

```sql
-- Ver todas las tablas creadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Verificar categorías
SELECT * FROM categorias;

-- Verificar destinos de ejemplo
SELECT nombre, ciudad, rating FROM destinos;
```

Deberías ver:
```
categorias, destinos, destinos_detalles, destinos_fotos,
interacciones, usuarios, xp_historial
```

---

## PASO 4 — Desplegar las Funciones en Netlify

### Si usas el ZIP actual (maqueta estática + funciones)

```bash
# Desde la raíz del proyecto
npm run build

# El resultado está en /dist
# Subir la carpeta dist a Netlify drag & drop
# O configurar git push automático
```

### Si usas Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

---

## PASO 5 — Migrar los 80 lugares del Admin al DB

El admin actual guarda en `localStorage`. Para migrar al DB:

```sql
-- Ejemplo: insertar un lugar manualmente desde Neon Console
INSERT INTO destinos (slug, nombre, categoria_slug, lead, ciudad, region, lat, lng, precio_desde, rating, total_resenas, status, destacado, emoji, hero_bg)
VALUES (
  'hostal-candelaria-bogota',
  'Hostal La Candelaria',
  'hostal',
  'El mejor hostal del centro histórico de Bogotá.',
  'Bogotá', 'Cundinamarca',
  4.5981, -74.0759,
  'Desde $45.000/noche',
  9.2, 127,
  'published', true, '🏨',
  'linear-gradient(135deg,#1a3a5c,#2a4a7c)'
);
```

Para migración masiva desde el admin, usar el botón
**"Publicar todo"** que ya sincroniza con la API.

---

## PASO 6 — Probar los Endpoints

Una vez desplegado, prueba desde tu navegador o curl:

```bash
# Listar destinos publicados
curl https://tu-sitio.netlify.app/api/destinos

# Filtrar por categoría
curl https://tu-sitio.netlify.app/api/destinos?categoria=hostal

# Destinos para el mapa
curl https://tu-sitio.netlify.app/api/destinos?modo=mapa

# Leaderboard de viajeros
curl https://tu-sitio.netlify.app/api/usuarios?tipo=leaderboard
```

Respuesta esperada:
```json
{
  "ok": true,
  "total": 80,
  "data": [
    {
      "id": "uuid...",
      "slug": "hostal-casa-medina",
      "nombre": "Hostal Casa Medina",
      "rating": 9.2,
      ...
    }
  ]
}
```

---

## PASO 7 — Usar los Componentes React

### En una página Astro

```astro
---
// src/pages/directorio.astro
import { GridDestinos } from '../components/CardDestino';
---
<html>
  <body>
    <h1>Directorio de Hospedajes</h1>

    <!-- Destinos destacados -->
    <GridDestinos
      categoria="hostal"
      destacados={true}
      limit={12}
      client:load
    />
  </body>
</html>
```

### Mi Mapa en una página

```astro
---
// src/pages/mi-mapa.astro
import MiMapa from '../components/MiMapa';
---
<html>
  <body>
    <div style="height: 600px;">
      <MiMapa usuarioId="uuid-del-usuario-logueado" client:load />
    </div>
  </body>
</html>
```

---

## Troubleshooting

### Error: "Connection timeout"
```
Solución: Agrega &connect_timeout=10 al final de DATABASE_URL
Neon tiene cold start de 1-3 seg tras 5 min de inactividad
```

### Error: "Too many connections"
```
Solución: Asegúrate de usar la URL con -pooler
El pooler maneja hasta 10,000 conexiones simultáneas
```

### Error: "SSL required"
```
Solución: Verifica que la URL incluya ?sslmode=require
```

### Las funciones no aparecen en Netlify
```
Solución: Verifica netlify.toml tenga:
  [build]
    functions = "netlify/functions"
```

### Los datos no se actualizan en el directorio
```
El cache de Netlify Edge es de 60 segundos.
Para forzar actualización: agrega ?t=timestamp a la URL
O cambia Cache-Control a 'no-cache' en las funciones
```

---

## Arquitectura Final

```
Viajero (browser)
    │
    ├── GET /directorio-hostal.html  → HTML estático (Netlify CDN)
    ├── GET /api/destinos             → Netlify Function → Neon DB
    ├── POST /api/interacciones       → Netlify Function → Neon DB
    └── GET /mi-mapa                  → HTML + React → /api/destinos
                                                      → /api/interacciones

Admin (browser)
    │
    ├── admin.html                   → localStorage (actual)
    └── POST /api/destinos-admin     → Netlify Function → Neon DB (próximo paso)

Neon PostgreSQL
    ├── destinos          (80+ lugares)
    ├── usuarios          (viajeros + XP)
    ├── interacciones     (reseñas + guardados)
    └── xp_historial      (log de puntos)
```
