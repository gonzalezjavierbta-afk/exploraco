# Ficha: <Nombre del establecimiento> - <Ciudad>

Datos para la pagina dinamica <slug>.html (categoria <hostal|comida|sitio|evento>).
Generada con el skill `gemini-research` (prompts/GEMINI_MASTER_PROMPT.md).
Este archivo es el contrato: el bloque JSON del final alimenta el seed.

## Datos generales

- **Slug:** <slug>
- **Nombre:** <nombre>
- **Categoria:** <categoria_slug>
- **Lead:** <1-3 frases gancho>
- **Descripcion:** <3-5 parrafos ricos en datos, separados por linea en blanco>
- **Highlight:** <corto con "·">
- **Ciudad:** <ciudad>
- **Region:** <region>
- **Barrio:** <barrio>
- **Lat:** <lat>
- **Lng:** <lng>
- **Whatsapp:** <57... o ausente>
- **Telefono:** <telefono>
- **Email:** <email o ausente>
- **Web:** <url o ausente>
- **Instagram:** <@cuenta o ausente>
- **Precio desde:** <rango de referencia>
- **Horario:** <resumen>
- **Emoji:** <emoji>
- **Hero bg:** <hex/gradient o ausente>
- **Tipo:** <descriptor con "·">
- **Capacidad:** <string o ausente>
- **Como llegar:** <transporte publico + direccion>

## Especifico <categoria>

### (Hostal) Alojamiento y servicios
- Tipo alojamiento, check-in/out, recepcion, edad minima, mascotas, cocina.
- **Habitaciones:** (tabla tipo / subtitulo / badge / camas / precio)
- **Amenidades:** lista
- **Actividades:** (icono + nombre + descripcion)
- **Incluye:** lista
- **Transporte:** (icono + titulo + detalle)
- Barrio, politica de cancelacion, reglas de la casa, agenda semanal.

### (Comida) Carta y servicio
- Tipo comida, cocina, ambiente, precio promedio, terraza, reservas, domicilio.
- **Menu destacado:** (min 4: nombre / precio / badge)
- **Opciones de dieta:** lista
- **Horario detallado por dia**
- **Domicilio plataformas:** lista

### (Sitio) El lugar
- Tipo actividad, dificultad, duracion, altitud, temporada, precio entrada,
  distancia, como llegar, permisos.
- **Entradas:** (tabla tipo / precio / incluye / link)
- **Tours:** (1-2+ reales con duracion, precio, incluye/no incluye, link)
- **Equipamiento:** (item + prioridad)
- **Itinerario:** (3-5 paradas)
- **Fauna y flora:** (solo si aplica)
- **Secretos:** (icono / titulo / texto / tag / tag_color)
- **Regulaciones** y **checklist tip**
- **Temporada matriz** Ene-Dic e **dificultad tags**

### (Evento) El evento
- Fecha inicio/fin, edicion, sede, organiza, lema.
- **Lineup:** (min 10, con escenario/dia)
- **Agenda:** (puertas / inicio / cierre por dia)
- **Categorias de entrada:** (tipo / precio / disponibilidad)
- **Que llevar:** lista
- **Prohibido:** lista
- Como llegar al recinto y boleteria oficial.

## FAQ

1. P: <pregunta> R: <respuesta corta>
2. P: <pregunta> R: <respuesta corta>
3. P: <pregunta> R: <respuesta corta>
4. P: <pregunta> R: <respuesta corta>
5. P: <pregunta> R: <respuesta corta>

## Imagenes (sugerencias a verificar)

> NO son URLs finales. El pipeline resuelve la URL real en Wikimedia Commons
> y verifica HEAD 200 antes de sembrar (BUG-022).

- Hero: <tema> - <caption> (`File:...`)
- Galeria: <tema> - <caption> (`File:...`)

## Fuentes

1. { tipo: oficial/maps/tripadvisor/booking/prensa/otra, url: <url>, que_respalda: <campo confirmado> }
2. ...

## JSON de entrega (bloque exacto)

```json
{
  "BASE": { }, 
  "TAGS": { },
  "FAQS": [ ],
  "FOTOS_SUGERIDAS": [ ],
  "FUENTES": [ ]
}
```

## Notas de conversion (cierra content-loader)

- `foto_hero` se toma de `FOTOS_SUGERIDAS[0]`.
- `fauna_flora` y `secretos` (sitio) se serializan con `JSON.stringify` en el seed.
- Emoji, iconos y `temporada_matriz` se pasan como escapes `\uXXXX` en el seed
  (ADR-002: ASCII-safe en archivos JS; la ficha puede llevar UTF-8 limpio).
- Fotos rotas (HEAD != 200) se descartan y se busca un archivo alternativo
  de `nombres_archivo_wikimedia`.