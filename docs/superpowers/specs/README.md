# Índice de Especificaciones (docs/superpowers/specs)

Índice de todas las specs de diseño de ExploraCO. Cada spec documenta el diseño
de una entrega o feature; la fuente de verdad sigue siendo el archivo real del
repositorio (ADR-006).

**Total:** 19 specs.

| Fecha | Spec | Tema | Estado |
|---|---|---|---|
| 2026-08-17 | [2026-08-17-mapa-cultural-clustering-design.md](2026-08-17-mapa-cultural-clustering-design.md) | Mapa cultural: cercanía por geolocalización + clustering estilo Upland | Aprobado |
| 2026-08-18 | [2026-08-18-logros-trofeos-voto-blog-design.md](2026-08-18-logros-trofeos-voto-blog-design.md) | Sistema de logros/trofeos (Fase 8) y voto rápido en blogs (ADR-012) | Implementado en repo (spec declaraba pendiente de deploy + migración Neon) |
| 2026-08-19 | [2026-08-19-ruta-salsera-bogota-design.md](2026-08-19-ruta-salsera-bogota-design.md) | Ruta Salsera de Bogotá (7 bares + guía de blog) | Aprobado por Javier |
| 2026-09-05 | [2026-09-05-mapas-publicos-privados-design.md](2026-09-05-mapas-publicos-privados-design.md) | Mapas temáticos: públicos/privados por usuario | Aprobado |
| 2026-09-07 | [2026-09-07-comunidad-unificada-design.md](2026-09-07-comunidad-unificada-design.md) | Comunidad unificada en comunidad.html + eliminación del módulo social del index | Implementado |
| 2026-09-07 | [2026-09-07-milestones-v2-gaming-design.md](2026-09-07-milestones-v2-gaming-design.md) | Milestones v2: Plan Maestro de Gaming (Steam + SKATE + Albion), ADR-014 | Implementado |
| 2026-09-08 | [2026-09-08-comunidad-chat-planes-backend-design.md](2026-09-08-comunidad-chat-planes-backend-design.md) | Chat y Planes reales con gaming completo en comunidad.html (ADR-015) | Implementado |
| 2026-09-09 | [2026-09-09-albumes-fotograficos-design.md](2026-09-09-albumes-fotograficos-design.md) | Sistema de Álbumes Fotográficos (ADR-017) | Implementado (spec declaraba pendiente de implementación) |
| 2026-09-10 | [2026-09-10-gamificacion-v4-design.md](2026-09-10-gamificacion-v4-design.md) | Gamificación v4.0: consumibles, cromos, Pandillas y 20 niveles (ADR-018) | Implementado (spec declaraba diseño completo pendiente) |
| 2026-09-10 | [2026-09-10-multimedia-mapa-cultural-drawer.md](2026-09-10-multimedia-mapa-cultural-drawer.md) | Capa multimedia + drawer del mapa cultural (index.html), ADR-021 | Aprobado por usuario |
| 2026-09-12 | [2026-09-12-presencia-fisica-gamificacion-v4-design.md](2026-09-12-presencia-fisica-gamificacion-v4-design.md) | Presencia física + presencia espacial: geocerca de visitas (ADR-024) | Implementado en working tree (migración 014 aplicada en Neon) |
| 2026-09-13 | [2026-09-13-epic-prompt-vocaciones-chat-perfil-design.md](2026-09-13-epic-prompt-vocaciones-chat-perfil-design.md) | Epic prompt.txt: museo de trofeos, vocaciones, chat por niveles y fixes multimedia (ADR-026) | Aprobado por Javier (implementado en working tree) |
| 2026-09-14 | [2026-09-14-gaming-v5-referidos-wayfarer-facciones-design.md](2026-09-14-gaming-v5-referidos-wayfarer-facciones-design.md) | Entrega 016 "ExploraCO Gaming v5.0": referidos multinivel, Wayfarer (Activo Oculto), 4 facciones y mundo artistas (ADR-025/027) | IMPLEMENTADO en working tree (pendiente migración 016 en Neon + env en Vercel + deploy) |
| 2026-09-15 | [2026-09-15-galeria-unificada-destino-design.md](2026-09-15-galeria-unificada-destino-design.md) | Galeria unificada de la ficha de destino (curadas + viajeros + albumes) | Aprobado |
| 2026-09-17 | [2026-09-17-xp-decimal-rankings-comunidad-design.md](2026-09-17-xp-decimal-rankings-comunidad-design.md) | XP decimal numeric(12,2) + rankings de comunidad (ADR-035) | Implementado |
| 2026-09-21 | [2026-09-21-gamificacion-nivel-scaling-v6-design.md](2026-09-21-gamificacion-nivel-scaling-v6-design.md) | Gamificacion v6: M_nivel, doble cap secuencial y reescalado de umbrales (ADR-053, ENMIENDA 1) | Diseno congelado; implementado y desplegado (migracion 031 aplicada en Neon) |
| 2026-09-23 | [2026-09-23-consumibles-por-era-design.md](2026-09-23-consumibles-por-era-design.md) | Consumibles con gate por era: `consumibles.era_exclusiva` (banda exclusiva de compra), 15 nuevos (3 por era) + 9 premium backfilleados (catálogo 32 en el estado real de Neon: 17 previos + 15 nuevos; 35 si la 034 se aplica), migración 035 aplicada en Neon el 2026-09-23 (ADR-056) | Implementado (migración 035 APLICADA en Neon el 2026-09-23; numeración alineada a ADR-056) |
| 2026-09-24 | [2026-09-24-multiplicador-origen-lejania-design.md](2026-09-24-multiplicador-origen-lejania-design.md) | Multiplicador de Origen por lejania Local/Nomada/Extranjero (ADR-058) | Implementado (migracion 038 aplicada en Neon el 2026-09-24) |
| 2026-09-24 | [2026-09-24-gaming-v6.1-early-mid-late-design.md](2026-09-24-gaming-v6.1-early-mid-late-design.md) | Gaming v6.1 + Early/Middle/Late Game: gates de eleccion, referidos 10%, cartas-gate, moneda secundaria, gobernanza 3 capas, own-spot multi-media y Gig Economy P2P (ADR-059..066) | PROPUESTO / Fase 0 (SOLO documentacion) |

## Notas

- Las specs se nombran `YYYY-MM-DD-tema-design.md` (o `.md`).
- El **estado** refleja el encabezado de cada spec; cuando una spec quedó superada
  por la implementación posterior, se anota entre paréntesis.
- La spec de la Entrega 016 (`2026-09-14`) se complementa con los documentos
  maestros: `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Gamificacion_v5_Plan_Maestro.md`
  y `.../ExploraCO_Sistema_Social_v5.md`.
- Los gaps/hallazgos conocidos con evidencia `archivo:linea` se registran en
  `exploraco desarrollo/BUGS_HISTORICOS.md` (BUG-035..BUG-043) y en el mapa
  G-01..G-23 de `ExploraCO_Sistema_Social_v5.md`.
