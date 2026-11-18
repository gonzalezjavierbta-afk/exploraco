-- ============================================================================
-- Migration 084: consumibles - RECALIBRACION DE PRECIO (-60%) y COPY de las
--   4 cartas de bono con los numeros nuevos.
-- Fecha: 2026-11-18
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (cero borrado: solo UPDATE por
--   clave, ningun DELETE), ADR-006 (baseline = fila real leida antes de
--   reescribir), ADR-008 (idempotencia, SQL versionado), ADR-120 (cartas de
--   bono), 034/035/058/064 (convencion precio_xp = precio_xp_base).
-- Requiere: 010 (consumibles), 031 (precio_xp numeric), 046 (precio_xp_base
--   y xp_gastado_sinks), 058, 062, 064 (bono_pct, bono_tope_xp).
--
-- PROPOSITO
--   BLOQUE 1 - Precio a 40% del actual (-60%). 39 filas: las 38 del mapeo del
--     operador mas pin_cromado (400 -> 160). Se aplica SOLO por
--     clave + precio viejo, de modo que un cambio previo del precio en el
--     panel no se pisa: es el mismo patron con el que 064 protegio a las 3
--     filas de 058.
--   BLOQUE 2 - Copy de las 4 cartas de bono (catalejo / lupa / lente / pluma)
--     con la mecanica exacta, el punto de equilibrio, el techo y el alcance
--     real de la allowlist BONO_APLICA. Los topes NO cambian (250/400/550/700).
--
-- QUE NO TOCA
--   - Los 4 ancestral, congelados: ancestral_base (400), ancestral_pocima_50ml
--     (1166.67), ancestral_media_375ml (3416.67), ancestral_botella_750ml
--     (6333.33). Ninguno figura en el VALUES ni en el WHERE.
--   - ancestral_premio_set: EXCLUIDA. Es 0 -> 0 (no-op), inactiva, fila
--     tecnica del premio del set. No se menciona en el UPDATE.
--   - NO toca bono_pct, bono_tope_xp, bono_accion, bono_xp_fijo, nivel_
--     requerido, cargas, duracion_horas, limite_diario, stock, precio_cop,
--     marca_id, faccion_requerida, era_exclusiva, activo ni nombre.
--   - Los 4 ancestral conservan precio_cop (14000/41000/76000). El precio es
--     la UNICA palanca de esta migracion.
--
-- POR QUE precio_xp Y precio_xp_base SE MUEVEN JUNTOS
--   Son dos lectores distintos del mismo numero: la vista consumibles_precio
--   deriva precio_xp_efectivo de precio_xp_base, el mercado publica
--   precio_xp_base como precio_referencia (api/interacciones.js:11823-11829) y
--   la compra cobra precio_xp (H23 de 064:110-112). Si solo se moviera uno, el
--   catalogo mostraria un precio y cobraria otro. La base es ademas el coste de
--   produccion de los prod_* (api/interacciones.js:20355-20382).
--
-- AVISO: ESTA MIGRACION BAJA EL COSTE DE PRODUCCION EN EL MERCADO.
--   prod_cafe 60 -> 24, prod_artesania 40 -> 16, prod_souvenir 30 -> 12 (base y
--   precio). Cualquier oferta viva cuyo precio_unitario se fijo con el coste
--   viejo queda por encima del coste nuevo: eso lo arbitra el mercado, esta
--   migracion no reescribe ofertas (mercado_ofertas es dato de usuario).
--
-- DECISIONES REGISTRADAS (vinculantes para esta version)
--   (i)   precio_xp_base se mueve SOLO donde ya igualaba a precio_xp
--         (convencion 034/035/064). N = 22 filas.
--   (ii)  Las 17 filas con precio_xp_base = 0.00 CONSERVAN el 0.00: subirlas de
--         0 al valor nuevo no seria un descuento sino un aumento, y empezaria a
--         cobrar un coste de produccion hoy gratuito. DEUDA MEDIDA, no tocada:
--         sus filas siguen con base 0 (coste de produccion 0 en el mercado).
--   (iii) El precio es la unica palanca: los topes de bono (250/400/550/700) y
--         los porcentajes (10/15/20/25) quedan como estan.
--
-- IDEMPOTENCIA
--   BLOQUE 1: el AND c.precio_xp = v.viejo hace que la segunda corrida vea
--     0 filas (el precio ya es el nuevo). 0 filas cambiadas, sin error.
--   BLOQUE 2: el AND descripcion IS DISTINCT FROM v.descr hace 0 filas la
--     segunda vez. Se usa el patron FROM (VALUES ...) de 064 en vez de un
--     CASE duplicado para no escribir dos veces los 4 textos.
--
-- ATOMICIDAD: el runner NO abre transaccion (driver HTTP de Neon, divide por
--   ';' respetando dollar-quotes y literales y corta al primer error:
--   scripts/apply_sql_file.js:735-790). Cada sentencia es atomica por si misma.
--   NO se escriben sentencias de apertura ni de cierre de transaccion.
--
-- ORDEN: despues de 083. No depende de 085. Re-ejecutar 057/062/064 no cambia
--   precios (ninguna de las tres escribe precio_xp de estas 39 claves salvo 064
--   en las 4 cartas de bono, que escribe 160/260/360/450: si se re-ejecuta la
--   064, hay que re-aplicar esta 084).
-- ============================================================================

-- ============================================================================
-- PREFLIGHT (comentado; NO se ejecuta. Copiar y correr ANTES de aplicar.)
-- ============================================================================
-- (p1) Baseline de las 39 claves + los 4 ancestral: 43 filas.
-- SELECT clave, precio_xp, precio_xp_base,
--        (precio_xp_base = precio_xp) AS base_igual_al_precio
--   FROM consumibles
--  WHERE clave IN ('nombre_eterno','aura_mito','pase_vip','reliquia_ancestral',
--    'corona_rutas','capa_travesia','perfil_fondo_paisaje','estandarte_leyenda',
--    'perfil_banda_artista','perfil_titulo_custom','sala_efimera','sello_archivo',
--    'perfil_marco_dorado','camara_antigua','perfil_vitrina_destacada',
--    'trompeta_fama','tintero_cronista','pluma_inspirada','brujula_ruta',
--    'imantador_cromos','perfil_tema_oscuro','pergamino_mapa','libreta_campo',
--    'cuaderno_expedicion','amuleto_x2','linterna_selva','perfil_marco_plata',
--    'vitrina_estelar','mapa_carboncillo','consumible_pluma_creador',
--    'cantimplora_anden','pin_cromado','brujula_aprendiz',
--    'consumible_lente_artista','consumible_lupa_curador',
--    'consumible_catalejo_explorador','prod_cafe','prod_artesania',
--    'prod_souvenir','ancestral_base','ancestral_pocima_50ml',
--    'ancestral_media_375ml','ancestral_botella_750ml')
--  ORDER BY precio_xp DESC, clave;
--   ESPERADO: 43 filas. 22 con base_igual_al_precio = true en las 39 primeras
--   (22 = las que moveran base), 17 con false (pin_cromado incluido), y los 4
--   ancestral con true (no se tocan).
--
-- (p2) Colision por valor, la trampa a vigilar: 400 esta en dos claves.
-- SELECT clave, precio_xp FROM consumibles WHERE precio_xp = 400;
--   ESPERADO: pin_cromado (400 -> 160) y ancestral_base (400, INTACTO). El
--   UPDATE lleva clave + precio viejo, asi que solo pin_cromado cambia.
--
-- (p3) Descripcion es text (sin tope de longitud) y las 4 cartas tienen hoy el
--   copy viejo de 064. Comprobar tambien que las 4 son base = precio.
-- SELECT clave, length(descripcion) AS largo, precio_xp,
--        (precio_xp_base = precio_xp) AS base_ok
--   FROM consumibles
--  WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                  'consumible_lente_artista','consumible_pluma_creador');
--
-- (p4) Reparto de topes/porcentajes (no debe cambiar con esta migracion).
-- SELECT clave, bono_pct, bono_tope_xp FROM consumibles
--  WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                  'consumible_lente_artista','consumible_pluma_creador')
--  ORDER BY bono_pct;
--   ESPERADO: 10/250, 15/400, 20/550, 25/700.

-- ============================================================================
-- 1. PRECIO -60% (40% del actual). 39 filas. Idempotente por precio viejo.
--    precio_xp_base se mueve SOLO si hoy es igual a precio_xp (decision (i));
--    en las 17 filas con base 0.00 se queda en 0.00 (deuda medida, decision
--    (ii)). Ningun ancestral figura aqui.
-- ============================================================================
UPDATE consumibles AS c SET
  precio_xp      = v.nuevo,
  precio_xp_base = CASE WHEN c.precio_xp_base = c.precio_xp
                        THEN v.nuevo
                        ELSE c.precio_xp_base END
FROM (VALUES
  -- clave                            viejo  nuevo
  ('nombre_eterno',                    2800, 1120),
  ('aura_mito',                        2400,  960),
  ('pase_vip',                         2400,  960),
  ('reliquia_ancestral',               2200,  880),
  ('corona_rutas',                     1800,  720),
  ('capa_travesia',                    1650,  660),
  ('perfil_fondo_paisaje',             1600,  640),
  ('estandarte_leyenda',               1500,  600),
  ('perfil_banda_artista',             1440,  576),
  ('perfil_titulo_custom',             1280,  512),
  ('sala_efimera',                     1280,  512),
  ('sello_archivo',                    1150,  460),
  ('perfil_marco_dorado',              1120,  448),
  ('camara_antigua',                   1080,  432),
  ('perfil_vitrina_destacada',         1040,  416),
  ('trompeta_fama',                    1000,  400),
  ('tintero_cronista',                  980,  392),
  ('pluma_inspirada',                   960,  384),
  ('brujula_ruta',                      900,  360),
  ('imantador_cromos',                  800,  320),
  ('perfil_tema_oscuro',                800,  320),
  ('pergamino_mapa',                    800,  320),
  ('libreta_campo',                     760,  304),
  ('cuaderno_expedicion',               720,  288),
  ('amuleto_x2',                        700,  280),
  ('linterna_selva',                    700,  280),
  ('perfil_marco_plata',                480,  192),
  ('vitrina_estelar',                   480,  192),
  ('mapa_carboncillo',                  460,  184),
  ('consumible_pluma_creador',          450,  180),
  ('cantimplora_anden',                 420,  168),
  ('pin_cromado',                       400,  160),
  ('brujula_aprendiz',                  380,  152),
  ('consumible_lente_artista',          360,  144),
  ('consumible_lupa_curador',           260,  104),
  ('consumible_catalejo_explorador',    160,   64),
  ('prod_cafe',                          60,   24),
  ('prod_artesania',                     40,   16),
  ('prod_souvenir',                      30,   12)
) AS v(clave, viejo, nuevo)
WHERE c.clave = v.clave
  AND c.precio_xp = v.viejo;

-- ============================================================================
-- 2. COPY de las 4 cartas de bono (mismos topes y porcentajes; nuevo precio).
--    Reglas del texto, iguales en las 4 para que se comparen de un vistazo:
--      - Los primeros 94-97 caracteres son autosuficientes (precio y efecto):
--        el Mercado corta la descripcion a 110 caracteres (mercado.js:1102).
--      - El porcentaje va sobre el XP BASE, antes de los multiplicadores de
--        nivel y de origen, y el bono se abona como asiento aparte.
--      - Punto de equilibrio y techo con los numeros NUEVOS: 640/694/720/720 y
--        2.500/2.667/2.750/2.800 de XP base. Neto maximo +186/+296/+406/+520.
--      - No apilamiento, no reembolso, alcance real de BONO_APLICA.
--    PROHIBIDO el texto "todas las acciones": es falso (BONO_EXCLUIDAS,
--    api/interacciones.js:5873-5896).
--    ASCII puro, sin tildes ni backticks. Idempotente por IS DISTINCT FROM.
-- ============================================================================
UPDATE consumibles AS c
   SET descripcion = v.descr
  FROM (VALUES
    ('consumible_catalejo_explorador',
     'Precio de catalogo: 64 XP (el Arbol de Clases puede descontarlo). +10% de XP BASE durante 24 h desde que la activas, con tope de 250 XP de bono por ventana. El porcentaje se aplica sobre el XP base, antes de los multiplicadores de nivel y de origen, y el bono se abona como asiento aparte. Punto de equilibrio: 640 XP base. El tope se toca a 2.500 XP base y el neto maximo es +186 XP. Si tienes otra carta activa, solo paga la de mayor porcentaje, las demas siguen gastando su reloj. Paga en acciones de jugador (guardados, visitas, votos, calificaciones, resenas, comentarios, fotos, albumes, planes, compartir, publicar lugar), NO paga misiones, logros, referidos, expediciones ni mercado. El tope que no se consuma se pierde y no se reembolsa, y reactivar la misma carta dentro de la ventana da error.'),
    ('consumible_lupa_curador',
     'Precio de catalogo: 104 XP (el Arbol de Clases puede descontarlo). +15% de XP BASE durante 24 h desde que la activas, con tope de 400 XP de bono por ventana. El porcentaje se aplica sobre el XP base, antes de los multiplicadores de nivel y de origen, y el bono se abona como asiento aparte. Punto de equilibrio: 694 XP base. El tope se toca a 2.667 XP base y el neto maximo es +296 XP. Si tienes otra carta activa, solo paga la de mayor porcentaje, las demas siguen gastando su reloj. Paga en acciones de jugador (guardados, visitas, votos, calificaciones, resenas, comentarios, fotos, albumes, planes, compartir, publicar lugar), NO paga misiones, logros, referidos, expediciones ni mercado. El tope que no se consuma se pierde y no se reembolsa, y reactivar la misma carta dentro de la ventana da error.'),
    ('consumible_lente_artista',
     'Precio de catalogo: 144 XP (el Arbol de Clases puede descontarlo). +20% de XP BASE durante 24 h desde que la activas, con tope de 550 XP de bono por ventana. El porcentaje se aplica sobre el XP base, antes de los multiplicadores de nivel y de origen, y el bono se abona como asiento aparte. Punto de equilibrio: 720 XP base. El tope se toca a 2.750 XP base y el neto maximo es +406 XP. Si tienes otra carta activa, solo paga la de mayor porcentaje, las demas siguen gastando su reloj. Paga en acciones de jugador (guardados, visitas, votos, calificaciones, resenas, comentarios, fotos, albumes, planes, compartir, publicar lugar), NO paga misiones, logros, referidos, expediciones ni mercado. El tope que no se consuma se pierde y no se reembolsa, y reactivar la misma carta dentro de la ventana da error.'),
    ('consumible_pluma_creador',
     'Precio de catalogo: 180 XP (el Arbol de Clases puede descontarlo). +25% de XP BASE durante 24 h desde que la activas, con tope de 700 XP de bono por ventana. El porcentaje se aplica sobre el XP base, antes de los multiplicadores de nivel y de origen, y el bono se abona como asiento aparte. Punto de equilibrio: 720 XP base. El tope se toca a 2.800 XP base y el neto maximo es +520 XP. Si tienes otra carta activa, solo paga la de mayor porcentaje, las demas siguen gastando su reloj. Paga en acciones de jugador (guardados, visitas, votos, calificaciones, resenas, comentarios, fotos, albumes, planes, compartir, publicar lugar), NO paga misiones, logros, referidos, expediciones ni mercado. El tope que no se consuma se pierde y no se reembolsa, y reactivar la misma carta dentro de la ventana da error.')
  ) AS v(clave, descr)
 WHERE c.clave = v.clave
   AND c.descripcion IS DISTINCT FROM v.descr;

-- ============================================================================
-- 3. VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta aqui).
-- ============================================================================
-- (a) 39 filas con precio nuevo y NINGUNA de las 4 claves ancestral.
-- SELECT count(*)::int AS filas_39
--   FROM consumibles
--  WHERE (clave, precio_xp) IN (VALUES
--    ('nombre_eterno',1120::numeric),('aura_mito',960::numeric),
--    ('pase_vip',960::numeric),('reliquia_ancestral',880::numeric),
--    ('corona_rutas',720::numeric),('capa_travesia',660::numeric),
--    ('perfil_fondo_paisaje',640::numeric),('estandarte_leyenda',600::numeric),
--    ('perfil_banda_artista',576::numeric),('perfil_titulo_custom',512::numeric),
--    ('sala_efimera',512::numeric),('sello_archivo',460::numeric),
--    ('perfil_marco_dorado',448::numeric),('camara_antigua',432::numeric),
--    ('perfil_vitrina_destacada',416::numeric),('trompeta_fama',400::numeric),
--    ('tintero_cronista',392::numeric),('pluma_inspirada',384::numeric),
--    ('brujula_ruta',360::numeric),('imantador_cromos',320::numeric),
--    ('perfil_tema_oscuro',320::numeric),('pergamino_mapa',320::numeric),
--    ('libreta_campo',304::numeric),('cuaderno_expedicion',288::numeric),
--    ('amuleto_x2',280::numeric),('linterna_selva',280::numeric),
--    ('perfil_marco_plata',192::numeric),('vitrina_estelar',192::numeric),
--    ('mapa_carboncillo',184::numeric),('consumible_pluma_creador',180::numeric),
--    ('cantimplora_anden',168::numeric),('pin_cromado',160::numeric),
--    ('brujula_aprendiz',152::numeric),('consumible_lente_artista',144::numeric),
--    ('consumible_lupa_curador',104::numeric),
--    ('consumible_catalejo_explorador',64::numeric),
--    ('prod_cafe',24::numeric),('prod_artesania',16::numeric),
--    ('prod_souvenir',12::numeric));
--   ESPERADO: 39.
--
-- (b) Los 4 ancestral INTACTOS (400 / 1166.67 / 3416.67 / 6333.33).
-- SELECT clave, precio_xp, precio_xp_base FROM consumibles
--  WHERE clave IN ('ancestral_base','ancestral_pocima_50ml',
--                  'ancestral_media_375ml','ancestral_botella_750ml')
--  ORDER BY precio_xp;
--
-- (c) No colision por valor: pin_cromado = 160 y ancestral_base = 400.
-- SELECT clave, precio_xp FROM consumibles
--  WHERE clave IN ('pin_cromado','ancestral_base') ORDER BY clave;
--   ESPERADO: ancestral_base 400.00, pin_cromado 160.00.
--
-- (d) Base movida N y base intacta en 0 M, con N + M = 39.
-- SELECT count(*) FILTER (WHERE precio_xp_base = precio_xp)::int AS base_movida,
--        count(*) FILTER (WHERE precio_xp_base = 0)::int AS base_sigue_cero,
--        count(*)::int AS total
--   FROM consumibles
--  WHERE clave IN (las 39 del bloque 1);
--   ESPERADO: base_movida 22, base_sigue_cero 17, total 39.
--
-- (e) Divergencia residual precio_xp IS DISTINCT FROM precio_xp_base.
-- SELECT count(*)::int AS divergentes FROM consumibles
--  WHERE precio_xp IS DISTINCT FROM precio_xp_base;
--   ESPERADO: 17. Son exactamente las 17 filas con base 0.00 preexistente
--   (deuda medida, decision (ii)). Antes de la 084 el numero era 17 tambien:
--   la migracion NO crea divergencia nueva, solo cambia el precio. Los 4
--   ancestral siguen con precio = base y por eso NO aparecen aqui.
--
-- (f) Las 4 descripciones nuevas.
-- SELECT clave, length(descripcion) AS largo,
--        left(descripcion, 60) AS cabeza,
--        (descripcion LIKE '%Punto de equilibrio: 640 XP base%') AS eq_catalejo,
--        (descripcion ILIKE '%todas las acciones%') AS prohibido
--   FROM consumibles
--  WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                  'consumible_lente_artista','consumible_pluma_creador')
--  ORDER BY precio_xp;
--   ESPERADO: 4 filas, prohibido = false en las 4, cabeza empieza por
--   'Precio de catalogo: 64|104|144|180 XP'.
--   100 caracteres autosuficientes (corte del Mercado a 110, mercado.js:1102):
--     catalejo 94, lupa 97, lente 97, pluma 97.
--
-- (g) Idempotencia: re-ejecutar el fichero debe dar UPDATE 0 en el bloque 1 y
--     UPDATE 0 en el bloque 2, sin error.

-- ============================================================================
-- ROLLBACK (comentado entero; NO se ejecuta). Restaura precios y copy de
--   partida. Solo UPDATE: no hay DELETE ni DROP (ADR-003). Idempotente: si ya
--   esta revertido, el WHERE no selecciona nada.
--   OJO: re-ejecutar 064 despues restaura el copy viejo y los precios
--   160/260/360/450 de las 4 cartas de bono.
--
--   UPDATE consumibles AS c SET precio_xp = v.viejo
--     FROM (VALUES ('nombre_eterno', 2800), ('aura_mito', 2400),
--       ('pase_vip', 2400), ('reliquia_ancestral', 2200), ('corona_rutas', 1800),
--       ('capa_travesia', 1650), ('perfil_fondo_paisaje', 1600),
--       ('estandarte_leyenda', 1500), ('perfil_banda_artista', 1440),
--       ('perfil_titulo_custom', 1280), ('sala_efimera', 1280),
--       ('sello_archivo', 1150), ('perfil_marco_dorado', 1120),
--       ('camara_antigua', 1080), ('perfil_vitrina_destacada', 1040),
--       ('trompeta_fama', 1000), ('tintero_cronista', 980),
--       ('pluma_inspirada', 960), ('brujula_ruta', 900),
--       ('imantador_cromos', 800), ('perfil_tema_oscuro', 800),
--       ('pergamino_mapa', 800), ('libreta_campo', 760),
--       ('cuaderno_expedicion', 720), ('amuleto_x2', 700),
--       ('linterna_selva', 700), ('perfil_marco_plata', 480),
--       ('vitrina_estelar', 480), ('mapa_carboncillo', 460),
--       ('consumible_pluma_creador', 450), ('cantimplora_anden', 420),
--       ('pin_cromado', 400), ('brujula_aprendiz', 380),
--       ('consumible_lente_artista', 360), ('consumible_lupa_curador', 260),
--       ('consumible_catalejo_explorador', 160), ('prod_cafe', 60),
--       ('prod_artesania', 40), ('prod_souvenir', 30)
--     ) AS v(clave, viejo)
--    WHERE c.clave = v.clave AND c.precio_xp = v.nuevo_actual;
--   (en la practica el rollback se escribe con el mismo VALUES de arriba
--    usando c.precio_xp = (viejo * 0.4), para no depender de otro literal)
--
--   UPDATE consumibles SET precio_xp_base = precio_xp
--    WHERE clave IN (las 22 filas que hoy tienen base = precio);
--
--   UPDATE consumibles SET descripcion = CASE clave
--     WHEN 'consumible_catalejo_explorador' THEN 'Todas las facciones. ...'
--     WHEN 'consumible_lupa_curador' THEN 'Todas las facciones. ...'
--     WHEN 'consumible_lente_artista' THEN 'Todas las facciones. ...'
--     WHEN 'consumible_pluma_creador' THEN 'Todas las facciones. ...'
--   END
--    WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                    'consumible_lente_artista','consumible_pluma_creador')
--      AND descripcion LIKE 'Precio de catalogo:%';
--   (los 4 textos de partida son los de 064:113-132)
-- ============================================================================
