# Ficha única Monserrate Guía — entrada de blog (categoria_slug='blog')

> Fuente de datos para el seed `api/seed-monserrate-guia.js`. Es la primera entrada REAL
> de la sección Inspírate. Reutiliza datos verificados de `ficha-monserrate.md` (sitio) y
> de investigación web (monserrate.co, Wikipedia, El Tiempo, Semana, bogotavive.com).

## 1. Campos generales del post

| Campo | Valor |
|---|---|
| `f-name` (título) | El cerro que vigila a Bogotá: guía completa para subir a 3.152 m |
| `f-slug` | monserrate-guia-completa |
| `f-cat` | blog |
| `f-city` | Bogotá |
| `f-region` | Cundinamarca |
| `f-barrio` | La Candelaria |
| `f-lead` | Monserrate es el cerro tutelar de Bogotá: 3.152 m de historia, fe, funicular, teleférico y un sendero entre frailejones. Esta guía reúne cómo llegar, tarifas 2026, horarios, qué ver en la cima, gastronomía, naturaleza y consejos prácticos. |
| `f-desc` (cuerpo) | ~6.000 palabras, párrafos separados por `\n\n` (el renderer usa `white-space:pre-line`). Sin HTML. |
| `f-photo-hero` | https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/2019_Bogot%C3%A1_-_Iglesia_de_Monserrate.jpg/960px-2019_Bogot%C3%A1_-_Iglesia_de_Monserrate.jpg |
| `f-hero-bg` | #1a103d |
| `f-emoji` | ⛪ |

## 2. Temas (multi-tema, tags)

- `tags.temas` = ['cultura', 'naturaleza', 'aventura', 'tips', 'gastro'] (todos)
- `tags.tema` = 'cultura' (primario, derivado automáticamente en admin; en seed se escribe explícito)

## 3. Tags específicos de blog

| key | valor |
|---|---|
| `video_url` | https://youtu.be/Bgtc-bsl9II (verificado vía oEmbed: "How to Get to the Top of Monserrate in Bogotá") |
| `id_autor` | (vacío por ahora — migración 004 pendiente; se editará desde admin.html con el buscador de autor) |
| `video_url` | verificado con renderer: `youtu.be/<id>` → embed OK |

## 4. Imágenes de galería (destinos_fotos, thumbs 960px verificados en Commons)

| # | URL | caption |
|---|---|---|
| 0 | https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/2019_Bogot%C3%A1_-_Iglesia_de_Monserrate.jpg/960px-2019_Bogot%C3%A1_-_Iglesia_de_Monserrate.jpg | Basílica del Señor Caído en la cima |
| 1 | https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Monserrate_Bogota.jpg/960px-Monserrate_Bogota.jpg | El cerro de Monserrate sobre Bogotá |
| 2 | https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Monserrate_Bogota_-_panoramio_%281%29.jpg/960px-Monserrate_Bogota_-_panoramio_%281%29.jpg | La ciudad vista desde la cima |
| 3 | https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Funicular_de_Monserrate_01.jpg/960px-Funicular_de_Monserrate_01.jpg | Funicular del cerro |

## 5. Datos de referencia del contenido (verificados)

- Altitud: 3.152 m s.n.m. Coordenadas cima: 4.605833, -74.056389. Basílica: 4.605182, -74.055437.
- Historia: hermita 1657 (Señor Caído de Pedro de Lugo Albarracín), basílica neogótica terminada 1925 (Arturo Jaramillo), funicular 1929, teleférico 1955.
- Antes llamado "cerro de Las Nieves" hasta mediados del s. XVII.
- Sendero peatonal: ~2,4 km, 600 m de desnivel, ~1.605 escalones, ~45-60 min. Abierto 5:00 am-1:00 pm (ascenso), descenso hasta 4:00 pm, cerrado martes.
- Funicular/teleférico: Lun-Sáb 6:30 am-10:00 pm; Dom 5:30 am-5:00 pm; Festivos 6:30 am-5:00 pm (taquilla igual). Teleférico: 4 min, 820 m, 40 personas. Funicular: ~10 min.
- Tarifas 2025/2026 (monserrate.co): L-S ida y regreso $32.000-$35.000, domingos $19.000-$21.000, un trayecto L-S $19.000, domingos $11.000, adulto mayor L-S $27.000 / dom $15.000, Fast Pass $87.500-$96.500, deportistas (5:30-9:00) $10.500, mascotas $11.500, Sendero Paramuno 3h $77.000 / residente $34.500.
- Gastronomía cima: Casa San Isidro, Santa Clara (vista a la Sabana).
- Naturaleza: ~119 especies de aves, 18 colibríes, ~494 especies vegetales, frailejón (Espeletia), chamicero cundiboyacense.
- Estación baja: Carrera 2 Este # 21-48, La Candelaria. TransMilenio: Las Aguas (línea K) + 15 min.
- 11 zonas WiFi gratis en la cima. Pago con tarjeta (Visa/Master/Amex/Diners) y efectivo. No parqueadero de visitantes en la cima.

## 6. Estructura del cuerpo (párrafos con \n\n)

1. Introducción: el centinela de Bogotá (qué es, por qué es imperdible).
2. Historia: del cerro de Las Nieves al Señor Caído (1657→hoy).
3. Cómo llegar: estación baja, TransMilenio, a pie desde La Candelaria.
4. Las tres formas de subir: funicular, teleférico, sendero peatonal (comparativa).
5. Tarifas y horarios 2026 (tabla descriptiva en prosa).
6. Qué ver en la cima: basílica, miradores 360°, el Señor Caído.
7. Gastronomía: Casa San Isidro, Santa Clara, comida típica.
8. Naturaleza y páramo: frailejones, aves, flora, el ecosistema del cerro.
9. Consejos prácticos: mejor hora, clima, altura, qué llevar, WiFi, mascotas.
10. Preguntas frecuentes (respondidas en prosa).
11. Cierre: plan perfecto y CTA a la app.

## 7. Estado

- status: 'published' (publicación directa vía loader).
- La migración `db/migrations/004_usuarios_blog_autor.sql` (foto_url) queda PENDIENTE de aplicar.
  El post se crea sin id_autor → el renderer omite la sección "Quien escribe" (autor=null).
  Cuando el usuario se registre y la migración se aplique, se asigna el autor desde admin.html.
- Verificación tras carga: GET /monserrate-guia-completa.html (200, JSON-LD BlogPosting, video embed,
  galería), grid `/api/destinos?categoria=blog` (card con temas), sitemap.