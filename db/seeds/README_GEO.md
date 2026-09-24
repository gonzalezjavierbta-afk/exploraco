# GEO Seeds de Referencia — ExploraCO (investigacion de fuentes)

Documento de trazabilidad del dataset geo para `geo_ciudades` y `geo_paises`
(tablas de referencia para calcular distancia entre el origen declarado de un
usuario y un punto turistico, ver PROYECTO: `usuarios.ciudad_base` /
`usuarios.pais_base`).

Fecha de investigacion: 2026-09-24. Todo verificado con descarga real (HTTP 200)
y validacion cruzada con Nominatim (OpenStreetMap).

## Archivos en esta carpeta

| Archivo | Contenido | Registros | Tamano |
|---|---|---|---|
| `geo_ciudades_raw.csv` | Fuente cruda: DIVIPOLA codigos municipios (datos.gov.co) | 1.122 | 70,8 KB |
| `geo_ciudades_dane_divipola_2025.xlsx` | XLSX oficial DANE Geoportal (nombres/codigos, SIN lat/lng) | 1.103 mpios + 18 ANM + 1 isla | 299,7 KB |
| `geo_ciudades_seed.json` | Seed normalizado y ASCII-safe para `geo_ciudades` | 1.122 | 280,6 KB |
| `geo_paises_raw.csv` | Fuente cruda: country centroids (komsitr) | 245 | 9,6 KB |
| `geo_paises_raw.json` | Idem en JSON | 245 | 33,6 KB |
| `geo_paises_seed.json` | Seed normalizado y ASCII-safe para `geo_paises` | 245 | 35,0 KB |

## Fuente 1 — Municipios con coordenadas (PRIMARIA)

- **Dataset:** DIVIPOLA — Codigos municipios (Mapas Nacionales)
- **Proveedor:** DANE via Datos Abiertos Colombia (datos.gov.co)
- **URL del dataset:** https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C-digos-municipios/gdxc-w37w
- **URL directa de descarga (CSV):** https://www.datos.gov.co/api/views/gdxc-w37w/rows.csv?accessType=DOWNLOAD
- **Formato:** CSV (UTF-8)
- **Registros:** 1.122 = 1.103 Municipio + 18 Area no municipalizada + 1 Isla (San Andres)
- **Corte:** 30 diciembre 2024 (metadata "Data Last Updated January 24, 2025"; el DANE reporta 1.103 municipios a dic 2025, la misma estructura)
- **Licencia:** Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0), declarada en el dataset
- **Columnas (7):** [Código Departamento, Nombre Departamento, Código Municipio, Nombre Municipio, Tipo: Municipio / Isla / Área no municipalizada, longitud, Latitud]
- **Particularidades:** lat/lng vienen como TEXTO con coma decimal y entre comillas (ej. `"-75,581775"`): hay que convertir `,` → `.` y `parseFloat` al mapear. El nombre de Bogota es `BOGOTÁ, D.C.` (departamento a su vez `BOGOTÁ, D.C.`, cod 11). Cali es `SANTIAGO DE CALI`, Cartagena es `CARTAGENA DE INDIAS`, Cucuta es `SAN JOSÉ DE CÚCUTA`.

## Fuente 2 — Nombres/codigos oficiales DANE 2025 (SECUNDARIA, sin coords)

- **Dataset:** DIVIPOLA Municipios (Geoportal DANE)
- **URL:** https://geoportal.dane.gov.co/descargas/divipola/DIVIPOLA_Municipios.xlsx
- **Formato:** XLSX (2 hojas: portada + codigos)
- **Registros:** 1.103 municipios + 18 areas no municipalizadas + isla de San Andres ("Actualizado al 30 de Diciembre de 2025")
- **Licencia:** datos oficiales del DANE (uso publico con atribucion)
- **Hallazgo verificado (inspector del XLSX):** este archivo NO incluye latitud/longitud (0 strings tipo coordenada; columnas Código/Nombre/Tipo/Ubicación). Solo sirve para validar nombres y codigos DIVIPOLA. No usar como fuente de coordenadas.
- **Alternativa con coordenadas (DANE/SIU, historico 2019):** http://www.sui.gov.co/suibase/documentos/dane/DIVIPOLA_2019-10-1.xls (cabeceras municipales con lat/lng, misma cobertura pero corte 2019 — queda como referencia, no se descargo).

## Fuente 3 — Centroides de paises ISO-3166 alfa-2 (PRIMARIA)

- **Dataset:** country-centroid (repo GitHub komsitr/country-centroid)
- **URL repo:** https://github.com/komsitr/country-centroid (rama master)
- **URL directa (CSV):** https://raw.githubusercontent.com/komsitr/country-centroid/master/country-centroids.csv
- **URL directa (JSON):** https://raw.githubusercontent.com/komsitr/country-centroid/master/country-centroids.json
- **Formato:** CSV (con BOM UTF-8) / JSON (array)
- **Registros:** 245 paises/territorios, ISO 3166-1 alpha-2/alpha-3 unicos (0 duplicados verificados)
- **Licencia:** sin LICENSE explicito en el repo; los valores coinciden exactamente con el dataset publico "countries.csv" de Google Public Data / Dataset Publishing Language (https://developers.google.com/public-data/docs/canonical/countries_csv), que es de uso publico. Atribucion recomendada: "Centroides de Google Public Data, via komsitr/country-centroid".
- **Columnas (5):** alpha2, alpha3, latitude, longitude, name. El CSV termina cada fila con `\r` (CRLF): limpiar al parsear. Ej. Colombia: CO,COL,4.570868,-74.297333.
- **Nota:** REST Countries (restcountries.com) expone `coordinates.lat/lng` por pais pero la API publica sin key fue retirada (el endpoint v3.1 responde 301 hoy); no se la uso. World Bank API (`https://api.worldbank.org/v2/country?format=json`) entrega lat/lng de la CAPITAL (no centroide) y sigue disponible sin key como respaldo; la capital de Colombia quedaria en Bogota (-74.1, 4.6) en vez del centroide nacional.

## Esquema propuesto para las tablas destino

### `geo_ciudades`

| Columna | Tipo | Origen (columna CSV) | Ejemplo |
|---|---|---|---|
| nombre | text | Nombre Municipio (con tildes, legible) | `BOGOTÁ, D.C.` |
| nombre_normalizado | text | derivada: NFD -> minusculas -> [a-z0-9 ] | `bogota d c` |
| departamento | text | Nombre Departamento | `VALLE DEL CAUCA` |
| departamento_normalizado | text | derivada | `valle del cauca` |
| cod_dpto | char(2) | Codigo Departamento | `11` |
| cod_mpio | char(5) | Codigo Municipio (DIVIPOLA) | `11001` |
| tipo | text | Tipo: Municipio/Isla/Area no municipalizada | `Municipio` |
| lat | double precision | Latitud (`,`) -> `.` | -74.106992 (ojo: es lng) |
| lng | double precision | longitud (`,`) -> `.` | 4.649251 |
| pais_iso2 | char(2) | constante `CO` | `CO` |

Mapa inverso de coordenadas: en el CSV la columna `longitud` es el lng (negativo)
y `Latitud` es el lat. No invertir.

### `geo_paises`

| Columna | Tipo | Origen | Ejemplo |
|---|---|---|---|
| nombre | text | name (el CSV trae `\r`) | `Colombia` |
| nombre_normalizado | text | derivada | `colombia` |
| iso2 | char(2) | alpha2 (upper) | `CO` |
| iso3 | char(3) | alpha3 (upper) | `COL` |
| lat | double precision | latitude | 4.570868 |
| lng | double precision | longitude | -74.297333 |

## Estrategia de normalizacion (match con `usuarios.ciudad_base`)

`ciudad_base` es un campo libre del registro: puede llegar `Bogota`, `Bogotá`,
`bogota d.c.`, `Medellin`, `Medellín`, `B/quilla`, `Sta Marta`, etc.

1. **Normalizacion canonica del input** (misma funcion en backend y en el matcher):
   NFD + strip diacriticos + lowercase + `[^a-z0-9 ]` -> espacio + colapsar espacios + trim.
   - `Bogotá` -> `bogota`  |  `MEDELLÍN` -> `medellin`  |  `Bogotá, D.C.` -> `bogota d c`
2. **Tabla `geo_ciudades.nombre_normalizado`** ya viene normalizada con la misma
   funcion (los seeds de esta carpeta). El match es `nombre_normalizado = ??`.
3. **Diccionario de alias/abreviaturas** para la basura comun del campo libre
   (tabla o mapa en el matcher, NO en la tabla geo):
   - `b/quilla`, `bquilla`, `barranquilla` -> `barranquilla`
   - `sta marta`, `stamarta` -> `santa marta`
   - `bogota d c` -> preferencia por `bogota` (o add alias `bogota` como nombre alterno)
   - `cucuta` vs `san jose de cucuta` (el usuario escribe `cucuta`)
   - `cali` vs `santiago de cali`; `cartagena` vs `cartagena de indias`
   - Para estos 4 casos, el matcher debe probar: (a) igualdad exacta canonical,
     (b) el municipio es "sufijo" del normalizado (`cartagena` en `cartagena de indias`),
     (c) alias explicito. (b) es suficiente para la mayoria.
4. **Ambiguedad real:** hay 66 nombres de municipio duplicados (ver riesgos).
   El normalizado NO es unico: `villanueva` aparece 4 veces (Bolivar, La Guajira,
   Santander, Casanare). La PK de match debe ser `(nombre_normalizado,
   departamento_normalizado)` o resolver con desambiguacion por departamento
   cuando el usuario lo declare; si no, tomar el de mayor poblacion/quien sabe por
   politca de producto (documentar la decision).

## Ejemplos verificados (10 ciudades, cruce con Nominatim)

| Nombre (DIVIPOLA) | Departamento | cod_mpio | lat | lng | Nominatim (OSM) | delta aprox |
|---|---|---|---|---|---|---|
| BOGOTÁ, D.C. | BOGOTÁ, D.C. | 11001 | 4.649251 | -74.106992 | 4.653382, -74.083633 | ~2,5 km |
| MEDELLÍN | ANTIOQUIA | 05001 | 6.246631 | -75.581775 | 6.269732, -75.602560 | ~3,0 km |
| SANTIAGO DE CALI | VALLE DEL CAUCA | 76001 | 3.413686 | -76.521330 | 3.410844, -76.581213 | ~6,3 km |
| CARTAGENA DE INDIAS | BOLÍVAR | 13001 | 10.385126 | -75.496269 | 10.426557, -75.544167 | ~6,6 km |
| BARRANQUILLA | ATLÁNTICO | 08001 | 10.977961 | -74.815546 | (verificar al deploy) | — |
| SANTA MARTA | MAGDALENA | 47001 | 11.204679 | -74.199829 | (verificar al deploy) | — |
| BUCARAMANGA | SANTANDER | 68001 | 7.116470 | -73.132562 | (verificar al deploy) | — |
| PEREIRA | RISARALDA | 66001 | 4.804985 | -75.719711 | (verificar al deploy) | — |
| SAN JOSÉ DE CÚCUTA | NORTE DE SANTANDER | 54001 | 7.905725 | -72.508178 | 7.897146, -72.508039 | ~0,9 km |
| LETICIA | AMAZONAS | 91001 | -4.198950 | -69.941721 | (verificar al deploy) | — |

Nota: las diferencias con Nominatim son esperables: DIVIPOLA ubica la **cabecera
municipal** (punto oficial), OSM el centro del polígono/casco urbano. Para la
geocerca de presencia fisica de ExploraCO (ADR-024, radios 100-250 m) conviene
definir si se usa el punto DIVIPOLA o puntos corregidos por destino (los destinos
ya tienen sus propias lat/lng curadas).

## Riesgos y ambiguedades de matching

1. **66 nombres duplicados** en 1.122 registros. Top: `LA UNIÓN` x4 (Antioquia,
   Nariño, Sucre, Valle), `VILLANUEVA` x4, `BUENAVISTA` x4, `ARGELIA` x3,
   `GRANADA` x3, `GUADALUPE` x3, `NARIÑO` x3 (incluye el municipio Nariño en
   Cundinamarca), `BOLÍVAR` x3 (municipios en Cauca/Santander/Valle, distintos del
   departamento), `SABANALARGA` x3, `SANTA BÁRBARA` x3, `CÓRDOBA` x3, `CALDAS` x2,
   `ARMENIA` x2 (Antioquia y Quindío — ojo: Quindío es capital de depto), etc.
2. **Nombres oficiales vs coloquiales:** Bogotá (`BOGOTÁ, D.C.`), Cali
   (`SANTIAGO DE CALI`), Cartagena (`CARTAGENA DE INDIAS`), Cúcuta
   (`SAN JOSÉ DE CÚCUTA`), San Andrés (`SAN ANDRÉS` — Isla en el dataset, tipo
   `Isla`). El matcher debe normalizar ambos lados y probar sufijo/alias.
3. **Mismo nombre para municipio y departamento:** `BOLÍVAR`, `CÓRDOBA`, `NARIÑO`,
   `SUCRE`, `CALDAS`, `QUINDÍO`, `RISARALDA`, `ATLÁNTICO` son municipios y
   departamentos a la vez. Si el usuario escribe `Bolivar` puede referirse al
   departamento (área) o al municipio (Bolívar/Cauca, Bolívar/Santander,
   Bolívar/Valle). Exigir departamento en la desambiguacion.
4. **Tipos no-municipio:** 18 Areas no municipalizadas (Amazonas, Guainía,
   Guaviare, Vaupés, Vichada) y 1 Isla (San Andrés) tienen fila en el dataset con
   codigo DIVIPOLA propio. Incluirlas en `geo_ciudades` esta bien (son orígenes
   válidos), pero el matcher no debe confundir `SAN ANDRÉS` (isla) con otras
   entradas.
5. **Formato del CSV fuente:** valores de lat/lng como string `"-75,581775"`
   (coma decimal + comillas), header con tilde en `Código`, UTF-8. Parsear con
   split que respete comillas y convertir `,` -> `.`.
6. **BOM y CRLF:** `geo_paises_raw.csv` trae BOM (U+FEFF) al inicio y `\r` al
   final de cada fila — el seed ya los limpia.
7. **Departamento `BOGOTÁ, D.C.`:** es a la vez departamento (cod 11) y distrito
   capital. En `destinos.ciudad` de ExploraCO suele guardarse `Bogotá` (sin
   distrito): el alias `bogota d c` -> `bogota` es imprescindible.
8. **Cobertura vs solicitud:** el dataset cubre los ~1.100 municipios (1.122
   filas). Si el producto solo necesita capitales, filtrar por `cod_mpio % 1000 = 1`.

## Verificaciones de la investigacion (2026-09-24)

- HEAD/descarga real de las 5 URLs de origen: 200 OK.
- XLSX DANE inspeccionado internamente: sin coordenadas (solo codigos/nombres).
- Coordenadas de 4 ciudades cruzadas con Nominatim: delta 0,9-6,6 km (cabecera
  municipal vs centro OSM), sin errores de hemisferio.
- Seeds JSON validados: parsean con `require()`, 1.122 + 245 registros, 0 bytes
  > 127 (ASCII-safe, ADR-002).
- Los seeds usan escapes `\uXXXX` para tildes (ADR-002); `nombre_normalizado` y
  `departamento_normalizado` son 100% `[a-z0-9 ]`.