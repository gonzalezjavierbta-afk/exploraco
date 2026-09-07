# Referentes de la Agenda — ExploraCO

Fuentes de referencia para poblar la agenda de eventos de ExploraCO (categoría `evento`).
Documento de apoyo del AI-DOS Core. Complementa `BLUEPRINT.md` (patrón Fase 9) y `create-dynamic-page`.

## Referente principal (inspiración diaria)

- **Instagram `@quehaypahacerenbogota`** — "QUÉ HAY PA HACER? (Bogotá)"
  - URL: https://www.instagram.com/quehaypahacerenbogota/
  - Qué aporta: agenda diaria de planes y eventos de Bogotá (conciertos, expos, ferias, planes gratis).
  - **Limitación importante:** el perfil **no es scrapeable** (Instagram exige login/Graph API y el contenido diario vive sobre todo en *Stories*, que son efímeros). No intentes extraer datos verificables desde aquí.
  - **Uso correcto:** úsalo como *inspiración* para detectar qué está pasando HOY / esta semana en Bogotá. Luego verifica fechas, sedes, precios y lineups en las fuentes oficiales de abajo antes de sembrar.

## Fuentes oficiales verificables (fuente de verdad de los datos)

| Fuente | URL | Qué aporta |
|---|---|---|
| Portal Bogotá — Agenda cultural | https://bogota.gov.co/que-hacer/agenda-cultural | Planes gratis y oficiales del Distrito, fechas y sedes |
| Idartes — Agenda | https://www.idartes.gov.co/es/agenda | Conciertos, teatro, cine, exposiciones de Idartes |
| SCRD — Eventos "Imperdibles" | https://www.culturarecreacionydeporte.gov.co/es/eventos | Agenda semanal "Imperdibles" y eventos del sector |
| Visit Bogotá — Agenda | https://visitbogota.co/es/agenda-de-eventos | Conciertos y eventos con ticketera (turismo) |
| Tuboleta | https://www.tuboleta.com | Boletería, horarios y recintos de conciertos/teatro |
| IDPC | https://idpc.gov.co | Patrimonio cultural, Mes del Patrimonio, recorridos |

## Cómo usar estas fuentes

1. Detectar un plan (p. ej., vía `@quehaypahacerenbogota` o el Portal Bogotá).
2. Verificar en al menos 2 fuentes oficiales: fecha inicio/fin, sede, dirección, horario, precio, lineup, organizador.
3. Convertirlo en página dinámica con el patrón Fase 9: `seed` + `loader` + `smoke`, categoría `evento`, TAGS evento (`fecha_inicio`, `fecha_fin`, `edicion`, `sede`, `organiza`, `lema`, `lineup[]`, `agenda[]`, `categorias_entrada[]`, `que_llevar[]`, `prohibido[]`).
4. Fotos: reutilizar URLs Unsplash/Wikimedia ya validadas en el repo o verificar HEAD 200 antes de usar (BUG-022). Rating parte en 0 (ADR-009).

## Sesión de referencia (2026-09-07)

Ejemplo de uso de estas fuentes: se crearon 3 páginas dinámicas de evento para "hoy/en curso" (lunes 7 sep 2026):
`jazz-expandido-bogota`, `mes-del-patrimonio-bogota` y `transitos-fragmentados-bogota`.
