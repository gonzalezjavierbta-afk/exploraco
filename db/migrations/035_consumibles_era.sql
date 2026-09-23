-- ============================================================================
-- Migration 035: Gate de consumibles por era (banda exclusiva de compra)
--   consumibles.era_exclusiva + backfill de premium + 15 consumibles nuevos
-- Fecha: 2026-09-23
-- Referencias: ADR-056 (gate de consumibles por era), ADR-002 (ASCII-safe),
--   ADR-003 (Cero Borrado Logico), ADR-006 (baseline = esquema REAL auditado
--   antes de escribir), ADR-008 (gobernanza e idempotencia de esquema),
--   ADR-028 (catalogo administrable: sin CHECK), ADR-035/ADR-053 (XP
--   numeric(12,2) y precios de consumibles), ADR-042 (columnas de la 027),
--   BUG-021 / BUG-060 (patron: migracion completa ANTES del deploy),
--   BUG-026 (emojis en SQL nunca como bytes UTF-8 directos).
-- Spec: docs/superpowers/specs/2026-09-23-consumibles-por-era-design.md
--   (secciones 3, 4 y 5).
-- Requiere: consumibles.precio_xp_base (creada por la 027; la 034 la
--   re-provisiona) y 010 / 015 / 017 / 018 / 031 aplicadas. NO requiere que la
--   034 este aplicada: si no lo esta, la semilla igual funciona (precio_xp_base
--   ya existe) y el catalogo parte de 17 filas en vez de 20.
--
-- QUE HACE
--   1. consumibles.era_exclusiva varchar(20) NULLABLE. NULL = tienda base
--      (sin gate). Sin CHECK (catalogo administrable, ADR-028) y SIN indice
--      (catalogo de decenas de filas; sin indice a proposito).
--   2. Backfill de premium por listas literales de claves: Cronista 3,
--      Leyenda 4, Mito 2. El resto de los consumibles queda NULL (no se toca).
--   3. Semilla de 15 consumibles nuevos (3 por era) que REUTILIZAN tipos de
--      efecto existentes (sin logica de efecto nueva).
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo ALTER TABLE ADD COLUMN / UPDATE por lista literal / INSERT
--   de semilla. No elimina, no renombra, no toca objetos previos.
--   IDEMPOTENTE (ADR-008): ADD COLUMN IF NOT EXISTS; los UPDATE del backfill
--   asignan un LITERAL fijo por lista de claves (segunda corrida = no-op); la
--   semilla usa INSERT ... ON CONFLICT (clave) DO UPDATE SET (re-afirma los
--   campos de la semilla sin duplicar filas). Re-ejecutar el archivo COMPLETO
--   es no-op seguro (N veces).
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene con tilde,
--   cero emojis, cero escapes unicode, cero backticks.
--   NO MODIFICA 001-034: los archivos previos quedan intactos. Esta migracion
--   solo consume columnas creadas por migraciones anteriores.
--   SIN DELETE NI DROP: no se borra ninguna fila ni objeto. Cero Borrado
--   Logico (ADR-003).
--
-- PRE-REQUISITOS
--   - 010: crea la tabla consumibles y siembra 10 filas.
--   - 015: siembra 3 consumibles de perfil.
--   - 017: crea consumibles.categoria y siembra 4 consumibles de perfil.
--   - 018: categoriza los 17 consumibles de 010/015/017
--     (perfil/impulso/social/coleccion/general).
--   - 031: repricing ABSOLUTO de consumibles.precio_xp (numeric(12,2)).
--   - 034: auto-provisiona consumibles.precio_xp_base NUMERIC(12,2) NOT NULL
--     DEFAULT 0 y siembra 3 producibles (prod_*). ESTA MIGRACION NO EXIGE la
--     034 aplicada: precio_xp_base ya existe por la 027 (verificado en Neon
--     2026-09-23: columna presente). Si la 034 NO esta aplicada (estado real
--     de Neon hoy: no existe casa_ofertas ni los prod_*), el catalogo previo
--     es de 17 filas y la semilla igual funciona (precio_xp_base existe).
--
-- SEMANTICA DEL GATE (ADR-056; spec seccion 2)
--   - era_exclusiva NULL = tienda base (sin gate).
--   - Compra EXCLUSIVA: se compra solo si era_visible = era_exclusiva.
--     Fuera de la era (futura o pasada) -> bloqueado.
--   - Uso PERMITIDO siempre si el item ya esta en el inventario: NO se aplica
--     gate en usar_consumible.
--   - Valor de evaluacion = nivel ganado:
--     era_visible = calcularEra(GREATEST(nivel derivado de xp_total,
--     nivel_max)). Nunca se pierde por gastar XP (ADR-053).
--   - Aplica uniformemente a todos los consumibles; los prod_* quedan NULL.
--
-- HALLAZGO DEL ESQUEMA REAL (ADR-006; verificado en db/migrations 010, 015,
-- 017 y 034 antes de escribir):
--   - consumibles (010): id uuid PK DEFAULT gen_random_uuid(); clave
--     varchar(50) UNIQUE NOT NULL; nombre varchar(100) NOT NULL; descripcion
--     text DEFAULT ''; precio_xp; activo boolean NOT NULL DEFAULT true;
--     creado_en timestamptz DEFAULT now().
--   - consumibles.categoria (017): varchar(30) NOT NULL DEFAULT 'general'.
--   - consumibles.precio_xp (021): convertido a numeric(12,2).
--   - consumibles.precio_xp_base (027/034): numeric(12,2) NOT NULL DEFAULT 0.
--     La semilla lo escribe con el MISMO valor de precio_xp (si se omitiera,
--     quedaria en su DEFAULT 0 y corromperia la vista consumibles_precio).
--   - consumibles.era_exclusiva NO EXISTE antes de esta migracion.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon (o con
--   scripts/apply_sql_file.js) DESPUES de la 034 y ANTES del deploy del
--   backend (patron BUG-021 / BUG-060). Re-ejecutarlo es no-op funcional.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 035.
-- ============================================================================
-- (0.a) Confirmar que era_exclusiva aun NO existe. Esperado antes: 0 filas;
--       despues: 1 fila.
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name='era_exclusiva';
--
-- (0.b) Confirmar el catalogo previo y que la 034 provisiono precio_xp_base.
--       Esperadas 20 filas; precio_xp_base DEBE ser NOT NULL.
-- SELECT clave, precio_xp, precio_xp_base, categoria FROM consumibles
--   ORDER BY clave;
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name='precio_xp_base';

-- ============================================================================
-- 1. CONSUMIBLES: COLUMNA era_exclusiva (gate por era)
-- ============================================================================
-- varchar(20) NULLABLE, SIN CHECK (catalogo administrable, ADR-028: la
-- validacion estricta vive en el backend) y SIN indice (catalogo <= 35 filas).
-- NULL = tienda base (sin gate). Los items existentes quedan NULL por defecto;
-- el unico gate inicial es el backfill de premium de la seccion 2.

ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS era_exclusiva varchar(20);

-- ============================================================================
-- 2. BACKFILL DE PREMIUM (listas literales; idempotente)
-- ============================================================================
-- UPDATE idempotente por lista explicita de claves (WHERE ... IN). Cada
-- UPDATE asigna un LITERAL fijo, por lo que re-ejecutar deja el mismo estado
-- (segunda corrida = no-op funcional). El resto de los consumibles NO se toca
-- (queda era_exclusiva = NULL). Total gateado aqui: 3 + 4 + 2 = 9.
--   Cronista (3): pluma_inspirada, trompeta_fama, perfil_vitrina_destacada
--   Leyenda  (4): perfil_marco_dorado, perfil_titulo_custom, sala_efimera,
--                 perfil_banda_artista
--   Mito     (2): perfil_fondo_paisaje, pase_vip
--   NULL    (11): amuleto_x2, imantador_cromos, cuaderno_expedicion,
--                 pergamino_mapa, perfil_marco_plata, perfil_tema_oscuro,
--                 pin_cromado, vitrina_estelar, prod_artesania, prod_cafe,
--                 prod_souvenir

UPDATE consumibles SET era_exclusiva = 'Cronista'
WHERE clave IN (
  'pluma_inspirada',
  'trompeta_fama',
  'perfil_vitrina_destacada'
);

UPDATE consumibles SET era_exclusiva = 'Leyenda'
WHERE clave IN (
  'perfil_marco_dorado',
  'perfil_titulo_custom',
  'sala_efimera',
  'perfil_banda_artista'
);

UPDATE consumibles SET era_exclusiva = 'Mito'
WHERE clave IN (
  'perfil_fondo_paisaje',
  'pase_vip'
);

-- ============================================================================
-- 3. SEMILLA DE 15 CONSUMIBLES NUEVOS (3 por era)
-- ============================================================================
-- Filas NUEVAS de consumibles (clave UNIQUE). Idempotente con
-- ON CONFLICT (clave) DO UPDATE SET: en la primera corrida inserta; en una
-- segunda re-afirma los campos de la semilla sin duplicar filas.
-- Lista de columnas EXPLICITA. tipo_canje = NULL para todos (no son
-- producibles por el usuario). activo = true.
-- CRITICO (nota de la 034): precio_xp_base es NOT NULL y alimenta la vista
-- consumibles_precio; se siembra con el MISMO valor de precio_xp.
-- Los 15 reutilizan tipos de efecto existentes (spec seccion 5); las
-- descripciones son ASCII sin acentos (precedente de semillas).

INSERT INTO consumibles
  (clave, nombre, descripcion, precio_xp, precio_xp_base, activo,
   categoria, era_exclusiva, tipo_canje)
VALUES
  ('brujula_aprendiz', 'Brujula del Aprendiz',
   'Activa el multiplicador x2 de XP por 3 usos.',
   380, 380, true, 'impulso', 'Caminante', NULL),
  ('cantimplora_anden', 'Cantimplora del Anden',
   'Otorga un espacio extra de mapas.',
   420, 420, true, 'coleccion', 'Caminante', NULL),
  ('mapa_carboncillo', 'Mapa a Carboncillo',
   'Otorga un album fotografico extra.',
   460, 460, true, 'coleccion', 'Caminante', NULL),
  ('linterna_selva', 'Linterna de Selva',
   'Otorga dos espacios extra de mapas.',
   700, 700, true, 'coleccion', 'Explorador', NULL),
  ('libreta_campo', 'Libreta de Campo',
   'Otorga dos albumes fotograficos extra.',
   760, 760, true, 'coleccion', 'Explorador', NULL),
  ('brujula_ruta', 'Brujula de Ruta',
   'Activa el multiplicador x2 de XP por 6 usos.',
   900, 900, true, 'impulso', 'Explorador', NULL),
  ('tintero_cronista', 'Tintero del Cronista',
   'Desbloquea el permiso de arte de forma permanente.',
   980, 980, true, 'general', 'Cronista', NULL),
  ('camara_antigua', 'Camara Antigua',
   'Destaca la vitrina del perfil durante 7 dias.',
   1080, 1080, true, 'social', 'Cronista', NULL),
  ('sello_archivo', 'Sello de Archivo',
   'Garantiza un cromo epico en la proxima obtencion.',
   1150, 1150, true, 'coleccion', 'Cronista', NULL),
  ('estandarte_leyenda', 'Estandarte de Leyenda',
   'Duplica la fama de parche durante 24 horas.',
   1500, 1500, true, 'social', 'Leyenda', NULL),
  ('capa_travesia', 'Capa de Travesia',
   'Fija el pin del mapa durante 7 dias.',
   1650, 1650, true, 'impulso', 'Leyenda', NULL),
  ('corona_rutas', 'Corona de Rutas',
   'Otorga el marco dorado permanente de la vitrina.',
   1800, 1800, true, 'perfil', 'Leyenda', NULL),
  ('reliquia_ancestral', 'Reliquia Ancestral',
   'Otorga el tema oscuro permanente de la vitrina.',
   2200, 2200, true, 'perfil', 'Mito', NULL),
  ('aura_mito', 'Aura de Mito',
   'Destaca la vitrina del perfil durante 7 dias.',
   2400, 2400, true, 'social', 'Mito', NULL),
  ('nombre_eterno', 'Nombre Eterno',
   'Otorga el titulo permanente Mito Eterno.',
   2800, 2800, true, 'perfil', 'Mito', NULL)
ON CONFLICT (clave) DO UPDATE SET
  nombre         = EXCLUDED.nombre,
  descripcion    = EXCLUDED.descripcion,
  precio_xp      = EXCLUDED.precio_xp,
  precio_xp_base = EXCLUDED.precio_xp_base,
  categoria      = EXCLUDED.categoria,
  era_exclusiva  = EXCLUDED.era_exclusiva,
  activo         = true;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion; NO modifica nada). Copiar y correr sentencia por sentencia.
-- ============================================================================
-- (a) Distribucion de consumibles por era (esperado TRAS la 035):
--     Caminante  = 3   (nuevos 1-3)
--     Explorador = 3   (nuevos 4-6)
--     Cronista   = 6   (backfill 3 + nuevos 7-9)
--     Leyenda    = 7   (backfill 4 + nuevos 10-12)
--     Mito       = 5   (backfill 2 + nuevos 13-15)
--     NULL       = 8   (17 base - 9 premium backfilleados)
--     NOTA DE CONTEO 1: los 9 premium del backfill (seccion 2) se SUMAN a los 3
--     nuevos de su era; por eso Cronista/Leyenda/Mito dan 6/7/5 (no 3/4/2).
--     NOTA DE CONTEO 2 (estado real de Neon 2026-09-23): la 034 NO esta
--     aplicada, asi que el catalogo previo es de 17 filas (no 20) y NULL da 8.
--     Si la 034 se aplicara despues, se suman 3 prod_* NULL -> NULL = 11.
-- SELECT era_exclusiva, COUNT(*) FROM consumibles
--   GROUP BY era_exclusiva ORDER BY era_exclusiva;
--
-- (b) Total del catalogo (esperado 32 = 17 previos + 15 nuevos hoy; 35 si la
--     034 esta aplicada con sus 3 prod_*):
-- SELECT COUNT(*) FROM consumibles;
--
-- (c) Detalle de los consumibles con gate (esperado 24 filas: 9 premium del
--     backfill + 15 nuevos), ordenados por era y clave:
-- SELECT clave, era_exclusiva FROM consumibles
--   WHERE era_exclusiva IS NOT NULL
--   ORDER BY era_exclusiva, clave;
--
-- (d) Integridad de la semilla (esperado 15 filas; tipo_canje NULL, activo
--     true y precio_xp_base = precio_xp):
-- SELECT clave, era_exclusiva, categoria, precio_xp, precio_xp_base, activo,
--        tipo_canje
--   FROM consumibles
--   WHERE clave IN ('brujula_aprendiz','cantimplora_anden','mapa_carboncillo',
--     'linterna_selva','libreta_campo','brujula_ruta','tintero_cronista',
--     'camara_antigua','sello_archivo','estandarte_leyenda','capa_travesia',
--     'corona_rutas','reliquia_ancestral','aura_mito','nombre_eterno')
--   ORDER BY era_exclusiva, clave;
--
-- (e) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(d): los conteos y valores deben ser IDENTICOS (no-op funcional).
