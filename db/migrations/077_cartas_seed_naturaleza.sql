-- ============================================================================
-- Migration 077: cartas - SEED de la familia NATURALEZA (5 flora + 5 fauna)
--   Solo filas. CERO esquema: la 076 ya dejo el dominio puesto (familia con
--   'naturaleza', subtipo flora/fauna y chk_cartas_catalogo_naturaleza).
-- Fecha: 2026-11-11
-- Referencias: ADR-121 (enmienda: 8 familias), ADR-002 (ASCII-safe),
--   ADR-003 (cero borrado fisico), ADR-006 (el archivo real manda),
--   ADR-008 (idempotencia), ADR-035 (XP numeric(12,2)).
-- Requiere, YA APLICADAS y con fila valida en schema_migrations:
--   060 (stats_json/fusionable), 066 (familia/subtipo/edicion/supply_max/
--   emitidas/precio_xp + sus CHECKs), 068 (precio_xp numeric(12,2)),
--   069 (familia NOT NULL), 076 (familia 'naturaleza'; PREDECESOR INMEDIATO
--   en el directorio: el runner lo exige en el ledger).
-- Contrato: docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md
--   11.11.3 regla 3.1-3.6 (primario fortuna, secundario alcance y puntos por
--   rareza), 11.11.4 regla 4.1/4.2 (multiplicador 1.0 = 150/400/1000/2500),
--   11.11.6 (contrato del seed), 11.11.7 (las 10 especies) y 11.11.8 (la
--   carta describe, no ubica).
--
-- PROPOSITO
--   El catalogo tiene 45 cartas y 0 de familia naturaleza. Sin esta familia,
--   'fortuna' no es primario en ninguna carta y el eje queda alimentado solo
--   como secundario (hueco de 11.11.3 regla 3.2). Este fichero mete 10 cartas
--   de especie viva colombiana, con precio, tirada y stats resueltos.
--
-- LAS 10 ESPECIES (lista verificada por el operador: binomial GBIF exacto y
-- presencia en Colombia). El binomial se escribe en stats_json.nombre_cientifico
-- porque chk_cartas_catalogo_naturaleza lo EXIGE (076 regla 5.1).
--   id                     nombre                     subtipo  binomial
--   cn_palma_cera          Palma de Cera del Quindio  flora    Ceroxylon quindiuense
--   cn_orquidea_trianae    Orquidea Cattleya Trianae  flora    Cattleya trianae
--   cn_frailejon           Frailejon                  flora    Espeletia grandiflora
--   cn_guadua              Guadua                     flora    Guadua angustifolia
--   cn_ceibo               Ceibo                      flora    Ceiba pentandra
--   cn_jaguar              Jaguar                     fauna    Panthera onca
--   cn_oso_anteojos        Oso de Anteojos            fauna    Tremarctos ornatus
--   cn_danta_paramo        Danta de Paramo            fauna    Tapirus pinchaque
--   cn_rana_dorada         Rana Dorada                fauna    Phyllobates terribilis
--   cn_titi_cabeciblanco   Titi Cabeciblanco          fauna    Saguinus oedipus
--
-- DESVIO CONSCIENTE 1: ids cn_<slug> (encargo del operador) en lugar de los
--   ctn_flora_NN / ctn_fauna_NN que propone 11.11.7. Mismo contenido, prefijo
--   declarado: 0 filas con id LIKE 'cn_%' medidas antes de escribir esto.
-- DESVIO CONSCIENTE 2: la lista de especies NO es la de 11.11.7 (que incluia
--   nenufar, mangle, delfin rosado y guacamaya). Manda la lista verificada
--   contra GBIF entregada por el operador: 4 de las 10 sustituidas.
-- DESVIO CONSCIENTE 3: NO se siembra estado_iucn. La fuente autoritativa
--   (IUCN Red List) responde 403 sin token y no se inventa una categoria de
--   conservacion. 11.11.6 lo declara OPCIONAL, luego omitirlo no incumple.
--   stats_json queda con las 4 claves duras: primario, fortuna, alcance y
--   nombre_cientifico. Las guardas (5) y (6) de este fichero PARAN si alguna
--   fila trae estado_iucn, para que la clave no entre por la puerta de atras.
--
-- REPARTO DE RAREZA (contrato 11.11.6: 4 comun / 3 raro / 2 epico / 1 dorado)
--   comun  4 = palma de cera, guadua, ceibo, titi cabeciblanco
--   raro   3 = orquidea trianae, frailejon, oso de anteojos
--   epico  2 = jaguar, danta de paramo
--   dorado 1 = rana dorada
--   Por subtipo: flora 5 (3 comun + 2 raro) y fauna 5 (1 + 1 + 2 + 1).
--   La rareza es un EJE DE JUEGO, no un juicio de conservacion (11.11.8
--   regla 8.5): ninguna regla del juego la deriva de una categoria UICN.
--
-- PRECIO, SUPPLY Y EDICION (11.11.4 multiplicador 1.0; tabla de 070)
--   rareza   precio_xp   supply_max   edicion    punto de tirada
--   comun        150.00         5000   limitada          peso 5000
--   raro         400.00         1000   limitada          peso 1000
--   epico       1000.00          250   limitada           peso 250
--   dorado      2500.00           50   limitada            peso 50
--   Son los MISMOS numeros de 11.11.6 y de la tabla de 070: una sola
--   autoridad de precio y de tirada en el catalogo.
--
-- STATS (11.11.3 regla 3.6, espejo de lugar con el par invertido)
--   rareza    fortuna (primario)   alcance (secundario)   suma
--   comun                      3                      1      4
--   raro                       5                      3      8
--   epico                      9                      5     14
--   dorado                    14                     10     24
--   Tope por eje: CARTA_STATS_TOPE = 40 (lib/cartas-config.js:121). El maximo
--   sembrado es 14, muy por debajo. Sin presencia, sin sku, sin bonus_xp_pct.
--
-- nivel_gate
--   NULL en las 10 (11.11.6: no se inventa politica de gates; decision del
--   operador: drops abiertos). Con nivel_gate NULL, chk_cartas_catalogo_
--   fusionable no obliga a nada; aun asi fusionable se escribe false explicito
--   (11.11.2 regla 2.3) porque la columna nace DEFAULT true (060) y omitirla
--   crearia cartas fusionables por omision.
--
-- IMAGENES (reuso verificado, cero rutas nuevas)
--   En assets/cartas/ solo existen 5 laminas y las 5 responden HEAD 200 en
--   produccion (medido 2026-11-11 con Invoke-WebRequest -Method Head):
--     consumible_catalejo_explorador.png, consumible_lente_artista.png,
--     consumible_lupa_curador.png, consumible_pluma_creador.png,
--     marca_ancestral.png
--   No hay arte de naturaleza y NO se inventan URLs: las 10 cartas reutilizan
--   esas 5 laminas como arte provisional (flora con las de herramienta de
--   autoria, fauna con las de observacion). Se declara: es reuso, no arte
--   propio. La guarda (4) solo admite esas 5 rutas.
--
-- CERO LOCALIZACIONES (11.11.8 regla 8.1-8.3)
--   La descripcion es UNA linea de habitat generico (Andes, paramo, selva del
--   Pacifico, noroeste del pais) y nunca un municipio, vereda, quebrada ni
--   coordenada. La guarda (4) prohibe digitos en la descripcion (proxy de
--   coordenada) y la (5) prohibe las claves lat, lng, ubicacion y municipio.
--
-- IDEMPOTENCIA (ADR-008)
--   INSERT ... ON CONFLICT (id) DO NOTHING. Cero UPDATE, cero sentencia de
--   borrado, cero TRUNCATE. Segunda corrida: 0 filas insertadas, catalogo
--   identico (el md5 del bloque seed se imprime en el NOTICE y no cambia) y
--   los guards se recalculan sobre ids absolutos, no sobre filas nuevas.
--
-- PRE (medido en Neon antes de aplicar, 2026-11-11)
--   catalogo = 45 cartas = 24 lugar + 8 personaje + 6 marca + 3 consumible
--   + 4 producto. familia = 'naturaleza' = 0 filas. ids cn_% = 0 filas.
--   ledger: 075 y 076 en 'aplicada'.
--   md5 del catalogo (formula reproducible con los NULL marcados '~'):
--     md5(string_agg(id||'|'||nombre||'|'||familia||'|'||subtipo||'|'||rareza
--         ||'|'||coalesce(precio_xp::text,'~')||'|'||coalesce(supply_max::text,'~')
--         ||'|'||edicion||'|'||coalesce(nivel_gate::text,'~')||'|'||fusionable::text
--         ||'|'||activo::text||'|'||stats_json::text,'#' ORDER BY id))
--     PRE = e56f3a06d7884af0af1e869494f0a370  (n = 45)
--
-- POST esperado
--   55 cartas = 45 + 10. naturaleza = 10 (5 flora + 5 fauna).
--   rareza 4/3/2/1; precio 150/400/1000/2500; supply 5000/1000/250/50.
--   edicion 'limitada' 10/10; emitidas 0; fusionable false 10/10;
--   nivel_gate NULL 10/10; activo true 10/10; 0 con presencia o estado_iucn.
--   10/10 comprables: carta_acunar exige precio_xp > 0, activo = true y
--   stock (supply_max IS NULL OR emitidas < supply_max).
--
-- COMO SE APLICA (PowerShell, desde la raiz del repo)
--   node scripts/apply_sql_file.js db/migrations/077_cartas_seed_naturaleza.sql --dry-run
--   node scripts/apply_sql_file.js db/migrations/077_cartas_seed_naturaleza.sql --notas "seed naturaleza 10 cartas"
--   La fila del ledger (077, 'aplicada') la pone el runner, no este SQL.
--
-- ROLLBACK (comentado; ADR-003 prohibe el borrado fisico de filas con historia)
--   Revertir 077 = apagar las 10 cartas, no borrarlas. Solo si ninguna tiene
--   usuarios_cartas ni ofertas se podria plantear un borrado fisico, y aun asi
--   la via correcta es una migracion nueva con su fila en el ledger.
--   -- BEGIN;
--   --   UPDATE public.cartas_catalogo
--   --      SET activo = false
--   --    WHERE familia = 'naturaleza'
--   --      AND id IN ('cn_palma_cera', 'cn_orquidea_trianae', 'cn_frailejon',
--   --                 'cn_guadua', 'cn_ceibo', 'cn_jaguar', 'cn_oso_anteojos',
--   --                 'cn_danta_paramo', 'cn_rana_dorada',
--   --                 'cn_titi_cabeciblanco');
--   -- ROLLBACK;
--   La fila del ledger NO se borra: es la unica evidencia de que 077 corrio.
-- ============================================================================

DO $mig077$
DECLARE
  -- Semilla completa: 10 filas con TODO el dato de valor explicito (nada se
  -- deriva en el INSERT, para que las guardas puedan comparar la fila entera
  -- contra la tabla aprobada antes de escribir).
  v_seed jsonb := '[
    {"id":"cn_palma_cera","nombre":"Palma de Cera del Quindio","familia":"naturaleza","subtipo":"flora","rareza":"comun","precio_xp":150,"supply_max":5000,"nivel_gate":null,"edicion":"limitada","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"naturaleza_flora","imagen_url":"assets/cartas/consumible_pluma_creador.png","descripcion":"Palma endemica de bosques de niebla andinos, de crecimiento lento","stats_json":{"primario":"fortuna","fortuna":3,"alcance":1,"nombre_cientifico":"Ceroxylon quindiuense"}},
    {"id":"cn_orquidea_trianae","nombre":"Orquidea Cattleya Trianae","familia":"naturaleza","subtipo":"flora","rareza":"raro","precio_xp":400,"supply_max":1000,"nivel_gate":null,"edicion":"limitada","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"naturaleza_flora","imagen_url":"assets/cartas/consumible_lente_artista.png","descripcion":"Orquidea epifita de bosques humedos andinos","stats_json":{"primario":"fortuna","fortuna":5,"alcance":3,"nombre_cientifico":"Cattleya trianae"}},
    {"id":"cn_frailejon","nombre":"Frailejon","familia":"naturaleza","subtipo":"flora","rareza":"raro","precio_xp":400,"supply_max":1000,"nivel_gate":null,"edicion":"limitada","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"naturaleza_flora","imagen_url":"assets/cartas/consumible_pluma_creador.png","descripcion":"Roseta gigante de paramo, clave en la regulacion hidrica","stats_json":{"primario":"fortuna","fortuna":5,"alcance":3,"nombre_cientifico":"Espeletia grandiflora"}},
    {"id":"cn_guadua","nombre":"Guadua","familia":"naturaleza","subtipo":"flora","rareza":"comun","precio_xp":150,"supply_max":5000,"nivel_gate":null,"edicion":"limitada","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"naturaleza_flora","imagen_url":"assets/cartas/consumible_pluma_creador.png","descripcion":"Bambu nativo que forma guaduales en riberas andinas","stats_json":{"primario":"fortuna","fortuna":3,"alcance":1,"nombre_cientifico":"Guadua angustifolia"}},
    {"id":"cn_ceibo","nombre":"Ceibo","familia":"naturaleza","subtipo":"flora","rareza":"comun","precio_xp":150,"supply_max":5000,"nivel_gate":null,"edicion":"limitada","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"naturaleza_flora","imagen_url":"assets/cartas/consumible_lente_artista.png","descripcion":"Arbol emergente de selvas bajas, con raices tabulares","stats_json":{"primario":"fortuna","fortuna":3,"alcance":1,"nombre_cientifico":"Ceiba pentandra"}},
    {"id":"cn_jaguar","nombre":"Jaguar","familia":"naturaleza","subtipo":"fauna","rareza":"epico","precio_xp":1000,"supply_max":250,"nivel_gate":null,"edicion":"limitada","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"naturaleza_fauna","imagen_url":"assets/cartas/consumible_catalejo_explorador.png","descripcion":"Felido mas grande de America, de manchas unicas","stats_json":{"primario":"fortuna","fortuna":9,"alcance":5,"nombre_cientifico":"Panthera onca"}},
    {"id":"cn_oso_anteojos","nombre":"Oso de Anteojos","familia":"naturaleza","subtipo":"fauna","rareza":"raro","precio_xp":400,"supply_max":1000,"nivel_gate":null,"edicion":"limitada","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"naturaleza_fauna","imagen_url":"assets/cartas/consumible_lupa_curador.png","descripcion":"Oso andino de manchas claras, habita bosques de montana","stats_json":{"primario":"fortuna","fortuna":5,"alcance":3,"nombre_cientifico":"Tremarctos ornatus"}},
    {"id":"cn_danta_paramo","nombre":"Danta de Paramo","familia":"naturaleza","subtipo":"fauna","rareza":"epico","precio_xp":1000,"supply_max":250,"nivel_gate":null,"edicion":"limitada","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"naturaleza_fauna","imagen_url":"assets/cartas/consumible_catalejo_explorador.png","descripcion":"Tapir andino de pelaje lanudo, dispersor de semillas","stats_json":{"primario":"fortuna","fortuna":9,"alcance":5,"nombre_cientifico":"Tapirus pinchaque"}},
    {"id":"cn_rana_dorada","nombre":"Rana Dorada","familia":"naturaleza","subtipo":"fauna","rareza":"dorado","precio_xp":2500,"supply_max":50,"nivel_gate":null,"edicion":"limitada","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"naturaleza_fauna","imagen_url":"assets/cartas/consumible_lupa_curador.png","descripcion":"Rana endemica de la selva humeda del Pacifico, de veneno defensivo","stats_json":{"primario":"fortuna","fortuna":14,"alcance":10,"nombre_cientifico":"Phyllobates terribilis"}},
    {"id":"cn_titi_cabeciblanco","nombre":"Titi Cabeciblanco","familia":"naturaleza","subtipo":"fauna","rareza":"comun","precio_xp":150,"supply_max":5000,"nivel_gate":null,"edicion":"limitada","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"naturaleza_fauna","imagen_url":"assets/cartas/consumible_catalejo_explorador.png","descripcion":"Primate de cresta blanca, endemico del noroeste de Colombia","stats_json":{"primario":"fortuna","fortuna":3,"alcance":1,"nombre_cientifico":"Saguinus oedipus"}}
  ]'::jsonb;

  v_txt           text;
  v_n             int;
  v_ins           int;
  v_otros_antes   int;
  v_otros_despues int;
  v_md5           text;
BEGIN
  -- (0) PRECONDICION DE ESQUEMA: columnas de 060 / 066 / 068 / 069 ----------
  SELECT count(*) INTO v_n
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'cartas_catalogo'
     AND column_name IN ('familia', 'subtipo', 'stats_json', 'precio_xp',
                         'supply_max', 'edicion', 'emitidas', 'imagen_url',
                         'fusionable', 'nivel_gate', 'set_slug');
  IF v_n <> 11 THEN
    RAISE EXCEPTION 'MIG077: faltan columnas de 060/066/068/069 (encontradas % de 11)', v_n;
  END IF;

  -- (0b) PREDECESOR: la 076 tiene que estar en el ledger -------------------
  SELECT count(*) INTO v_n
    FROM schema_migrations
   WHERE nombre = '076_cartas_familia_naturaleza.sql'
     AND resultado = 'aplicada';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'MIG077 ABORTA: la 076 no tiene fila aplicada en schema_migrations; sin el CHECK de familia/subtipo no se siembra';
  END IF;

  -- (0c) CARTA DE NAVEGACION: 10 filas ni una mas --------------------------
  IF jsonb_array_length(v_seed) <> 10 THEN
    RAISE EXCEPTION 'MIG077 ABORTA: el seed trae % cartas y el contrato fija 10',
      jsonb_array_length(v_seed);
  END IF;

  -- (1) GUARDA DE IDS: formato cn_, ascii minusculas, sin duplicados -------
  SELECT string_agg(id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text)
   WHERE x.id IS NULL
      OR x.id !~ '^cn_[a-z0-9_]+$';
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: ids con formato invalido (se exige cn_ + ascii minusculas): %', v_txt;
  END IF;

  SELECT string_agg(id, ', ') INTO v_txt
    FROM (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text)
           GROUP BY id HAVING count(*) > 1) d;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: ids duplicados dentro del seed: %', v_txt;
  END IF;

  -- (2) GUARDA DE COLISION: un id del seed que YA exista debe ser la MISMA
  -- carta (familia y nombre); si difiere es colision, no repeticion.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, nombre text, familia text)
    JOIN cartas_catalogo c ON c.id = x.id
   WHERE c.familia <> x.familia OR c.nombre <> x.nombre;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: ids del seed que ya existen con OTRA familia/nombre (colision): %', v_txt;
  END IF;

  -- (2b) GUARDA DE NOMBRE: dos cartas homonimas en el catalogo son una
  -- duplicidad visible en la coleccion (A27). Incluye las 45 ya existentes.
  SELECT string_agg(q.nombre, ', ') INTO v_txt FROM (
    SELECT c.nombre
      FROM cartas_catalogo c
      JOIN jsonb_to_recordset(v_seed) AS x(nombre text) ON c.nombre = x.nombre
     WHERE c.id NOT IN (SELECT id FROM jsonb_to_recordset(v_seed) AS y(id text))
    ) q;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: nombre ya usado por otra carta del catalogo: %', v_txt;
  END IF;

  -- (3) GUARDA DE FAMILIA Y SUBTIPO (espejo de 076 y de chk_..._subtipo) ----
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, familia text, subtipo text,
                                         set_slug text)
   WHERE x.familia IS DISTINCT FROM 'naturaleza'
      OR x.subtipo IS NULL
      OR x.subtipo NOT IN ('flora', 'fauna')
      OR x.set_slug IS DISTINCT FROM 'naturaleza_' || x.subtipo;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: familia/subtipo/set_slug invalido en: %', v_txt;
  END IF;

  -- (3b) GUARDA DE CURADURIA: la fila tiene que ser EXACTAMENTE una de las 10
  -- especies verificadas (nombre comun, subtipo y binomial). Si alguien edita
  -- la semilla y cambia un binomial, esta guarda para la migracion.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, nombre text, subtipo text,
                                         stats_json jsonb)
    LEFT JOIN (VALUES
        ('cn_palma_cera',        'Palma de Cera del Quindio', 'flora', 'Ceroxylon quindiuense'),
        ('cn_orquidea_trianae',  'Orquidea Cattleya Trianae', 'flora', 'Cattleya trianae'),
        ('cn_frailejon',         'Frailejon',                 'flora', 'Espeletia grandiflora'),
        ('cn_guadua',            'Guadua',                    'flora', 'Guadua angustifolia'),
        ('cn_ceibo',             'Ceibo',                     'flora', 'Ceiba pentandra'),
        ('cn_jaguar',            'Jaguar',                    'fauna', 'Panthera onca'),
        ('cn_oso_anteojos',      'Oso de Anteojos',           'fauna', 'Tremarctos ornatus'),
        ('cn_danta_paramo',      'Danta de Paramo',           'fauna', 'Tapirus pinchaque'),
        ('cn_rana_dorada',       'Rana Dorada',               'fauna', 'Phyllobates terribilis'),
        ('cn_titi_cabeciblanco', 'Titi Cabeciblanco',         'fauna', 'Saguinus oedipus')
      ) AS m(id, nombre, subtipo, binomial) ON m.id = x.id
   WHERE m.id IS NULL
      OR x.nombre   IS DISTINCT FROM m.nombre
      OR x.subtipo  IS DISTINCT FROM m.subtipo
      OR (x.stats_json->>'nombre_cientifico') IS DISTINCT FROM m.binomial;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: fila fuera de la lista verificada de 10 especies (id/nombre/subtipo/binomial): %', v_txt;
  END IF;

  -- (4) GUARDA DE TEXTO E IMAGEN: descripcion de una linea, sin digitos
  -- (proxy de coordenada) y sin salto de linea; imagen dentro del arte que
  -- existe y responde HEAD 200. Cero URL inventada.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, nombre text, descripcion text,
                                         imagen_url text)
   WHERE x.nombre IS NULL OR btrim(x.nombre) = ''
      OR x.descripcion IS NULL
      OR btrim(x.descripcion) = ''
      OR length(x.descripcion) < 20
      OR length(x.descripcion) > 160
      OR x.descripcion ~ '[0-9]'
      OR position(chr(10) in x.descripcion) > 0
      OR position(';' in x.descripcion) > 0
      OR x.imagen_url NOT IN (
           'assets/cartas/consumible_catalejo_explorador.png',
           'assets/cartas/consumible_lente_artista.png',
           'assets/cartas/consumible_lupa_curador.png',
           'assets/cartas/consumible_pluma_creador.png',
           'assets/cartas/marca_ancestral.png');
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: nombre/descripcion/imagen (fuera de las 5 laminas verificadas) en: %', v_txt;
  END IF;

  -- (5) GUARDA DE FORMA DE stats_json: objeto con EXACTAMENTE las 4 claves
  -- del contrato. Ni presencia (es de cosmetica), ni sku (es de producto),
  -- ni bonus_xp_pct (D-5), ni estado_iucn (desvio consciente 3: sin fuente).
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, stats_json jsonb)
   WHERE jsonb_typeof(x.stats_json) IS DISTINCT FROM 'object'
      OR x.stats_json = '{}'::jsonb
      OR (x.stats_json - 'primario' - 'fortuna' - 'alcance' - 'nombre_cientifico') <> '{}'::jsonb;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: stats_json con claves fuera de primario/fortuna/alcance/nombre_cientifico en: %', v_txt;
  END IF;

  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, stats_json jsonb)
   WHERE x.stats_json ? 'presencia'
      OR x.stats_json ? 'estado_iucn'
      OR x.stats_json ? 'sku'
      OR x.stats_json ? 'bonus_xp_pct'
      OR x.stats_json ? 'lat'
      OR x.stats_json ? 'lng'
      OR x.stats_json ? 'ubicacion'
      OR x.stats_json ? 'municipio';
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: stats_json trae una clave prohibida (presencia/estado_iucn/sku/bonus_xp_pct/lugar) en: %', v_txt;
  END IF;

  -- (6) GUARDA DE STATS: primario fortuna, valores por rareza de 3.6 y el
  -- binomial con forma de binomio (Genero especie). Un rango 0..40 se exige
  -- ademas de la igualdad, para que el mensaje sea legible si un eje se sale
  -- del tope CARTA_STATS_TOPE.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, rareza text, stats_json jsonb)
    LEFT JOIN (VALUES
        ('comun',  'fortuna', 3,  1),
        ('raro',   'fortuna', 5,  3),
        ('epico',  'fortuna', 9,  5),
        ('dorado', 'fortuna', 14, 10)
      ) AS m(rareza, primario, fortuna, alcance) ON m.rareza = x.rareza
   WHERE m.rareza IS NULL
      OR x.stats_json->>'primario' IS DISTINCT FROM m.primario
      OR (x.stats_json->>'fortuna')::int IS DISTINCT FROM m.fortuna
      OR (x.stats_json->>'alcance')::int IS DISTINCT FROM m.alcance
      OR (x.stats_json->>'fortuna')::int < 0
      OR (x.stats_json->>'fortuna')::int > 40
      OR (x.stats_json->>'alcance')::int < 0
      OR (x.stats_json->>'alcance')::int > 40
      OR (x.stats_json->>'nombre_cientifico') IS NULL
      OR (x.stats_json->>'nombre_cientifico') !~ '^[A-Z][a-z]+ [a-z]+$';
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: stats fuera del contrato 11.11.3 (fortuna/alcance) o binomial invalido en: %', v_txt;
  END IF;

  -- (7) GUARDA DE VALOR: precio > 0, supply > 0, edicion limitada,
  -- nivel_gate NULL, fusionable false, emitidas 0, activo true, no evento.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, rareza text, precio_xp numeric,
         supply_max integer, nivel_gate smallint, edicion text,
         fusionable boolean, activo boolean, es_evento boolean, emitidas integer)
    LEFT JOIN (VALUES
        ('comun',   150.00::numeric(12,2), 5000),
        ('raro',    400.00::numeric(12,2), 1000),
        ('epico',  1000.00::numeric(12,2),  250),
        ('dorado', 2500.00::numeric(12,2),   50)
      ) AS m(rareza, precio_xp, supply_max) ON m.rareza = x.rareza
   WHERE x.precio_xp IS NULL OR x.precio_xp <= 0
      OR x.supply_max IS NULL OR x.supply_max <= 0
      OR m.rareza IS NULL
      OR x.precio_xp  IS DISTINCT FROM m.precio_xp
      OR x.supply_max IS DISTINCT FROM m.supply_max
      OR x.nivel_gate IS NOT NULL
      OR x.edicion IS DISTINCT FROM 'limitada'
      OR x.fusionable IS DISTINCT FROM false
      OR x.activo IS DISTINCT FROM true
      OR x.es_evento IS DISTINCT FROM false
      OR x.emitidas IS DISTINCT FROM 0;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: precio/supply/nivel_gate/edicion/fusionable/activo fuera de la tabla por rareza en: %', v_txt;
  END IF;

  -- (8) INVARIANTE DE NO DESTRUCCION: cuenta de filas ajenas al seed ANTES.
  SELECT count(*) INTO v_otros_antes
    FROM cartas_catalogo c
   WHERE c.id NOT IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text));

  -- (9) INSERT: ON CONFLICT (id) DO NOTHING. Los CHECK vivos son la segunda
  -- red; estas guardas existen para fallar ANTES y con mensaje legible.
  INSERT INTO cartas_catalogo (
    id, nombre, set_slug, rareza, nivel_gate, es_evento, imagen_url, activo,
    emisor_tipo, descripcion, stats_json, fusionable, familia, subtipo,
    precio_xp, edicion, supply_max, emitidas
  )
  SELECT r.id, r.nombre, r.set_slug, r.rareza, r.nivel_gate, false,
         r.imagen_url, true, 'sistema', r.descripcion, r.stats_json,
         false, r.familia, r.subtipo,
         r.precio_xp, 'limitada', r.supply_max, 0
    FROM jsonb_to_recordset(v_seed) AS r(
           id text, nombre text, familia text, subtipo text, rareza text,
           nivel_gate smallint, precio_xp numeric, supply_max integer,
           edicion text, imagen_url text, set_slug text, descripcion text,
           stats_json jsonb)
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_ins = ROW_COUNT;

  -- (10) POST: no se toco nada ajeno --------------------------------------
  SELECT count(*) INTO v_otros_despues
    FROM cartas_catalogo c
   WHERE c.id NOT IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text));
  IF v_otros_despues <> v_otros_antes THEN
    RAISE EXCEPTION 'MIG077 ABORTA: filas ajenas al seed % -> % (no puede cambiar)',
      v_otros_antes, v_otros_despues;
  END IF;
  -- (10b) El catalogo ajeno al seed solo puede CRECER por otras migraciones
  -- (la 078 suma 9 cosmeticas), nunca encogerse. La igualdad estricta se
  -- reserva al par antes/despues de arriba: aqui solo se exige el minimo
  -- medido en el PRE, para que la segunda corrida siga siendo no-op.
  IF v_otros_antes < 45 THEN
    RAISE EXCEPTION 'MIG077 ABORTA: el catalogo previo trae % filas ajenas al seed y el pre medido es 45', v_otros_antes;
  END IF;

  -- (11) POST: las 10 existen ---------------------------------------------
  SELECT count(*) INTO v_n
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text));
  IF v_n <> 10 THEN
    RAISE EXCEPTION 'MIG077 ABORTA: quedaron % de 10 cartas de naturaleza', v_n;
  END IF;

  -- (12) POST: forma de stats_json y cero claves prohibidas ----------------
  SELECT string_agg(c.id, ', ') INTO v_txt
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     AND (c.familia IS DISTINCT FROM 'naturaleza'
       OR c.subtipo NOT IN ('flora', 'fauna')
       OR jsonb_typeof(c.stats_json) <> 'object'
       OR c.stats_json = '{}'::jsonb
       OR (c.stats_json - 'primario' - 'fortuna' - 'alcance' - 'nombre_cientifico') <> '{}'::jsonb
       OR c.stats_json ? 'presencia'
       OR c.stats_json ? 'estado_iucn'
       OR c.stats_json ? 'sku'
       OR c.stats_json ? 'bonus_xp_pct'
       OR NOT (c.stats_json ? 'nombre_cientifico'));
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: familia/subtipo/stats_json invalido en base: %', v_txt;
  END IF;

  -- (13) POST: valor y disponibilidad (10/10 comprables) -------------------
  SELECT string_agg(c.id, ', ') INTO v_txt
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     AND (c.precio_xp IS NULL OR c.precio_xp <= 0
       OR c.supply_max IS NULL OR c.supply_max <= 0
       OR c.edicion <> 'limitada'
       OR c.nivel_gate IS NOT NULL
       OR c.activo = false
       OR c.es_evento = true
       OR c.emisor_tipo <> 'sistema'
       OR c.fusionable = true
       OR c.emitidas <> 0
       OR c.imagen_url IS NULL OR btrim(c.imagen_url) = '');
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: precio/supply/edicion/activo/imagen invalido en: %', v_txt;
  END IF;

  -- (14) POST: reparto por subtipo 5/5 y por rareza 4/3/2/1 ----------------
  SELECT string_agg(subtipo || '=' || n, ', ') INTO v_txt FROM (
    SELECT c.subtipo, count(*)::text AS n
      FROM cartas_catalogo c
     WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     GROUP BY c.subtipo) q
   WHERE NOT ((subtipo = 'flora' AND n = '5') OR (subtipo = 'fauna' AND n = '5'));
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: reparto por subtipo fuera de 5/5: %', v_txt;
  END IF;

  SELECT string_agg(rareza || '=' || n, ', ') INTO v_txt FROM (
    SELECT c.rareza, count(*)::text AS n
      FROM cartas_catalogo c
     WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     GROUP BY c.rareza) q
   WHERE NOT ((rareza = 'comun' AND n = '4')
           OR (rareza = 'raro' AND n = '3')
           OR (rareza = 'epico' AND n = '2')
           OR (rareza = 'dorado' AND n = '1'));
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: reparto por rareza fuera de 4/3/2/1: %', v_txt;
  END IF;

  -- (15) POST: la suma de puntos por rareza es la de 3.6 y el primario manda
  SELECT string_agg(c.id, ', ') INTO v_txt
    FROM cartas_catalogo c
    JOIN (VALUES ('comun', 4), ('raro', 8), ('epico', 14), ('dorado', 24))
      AS m(rareza, total) ON m.rareza = c.rareza
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     AND ((c.stats_json->>'fortuna')::int + (c.stats_json->>'alcance')::int) <> m.total;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: suma de ejes distinta de la tabla 3.6 en: %', v_txt;
  END IF;

  -- (16) POST: cero homonimos en TODO el catalogo --------------------------
  SELECT string_agg(nombre || '=' || n, ', ') INTO v_txt FROM (
    SELECT c.nombre, count(*)::text AS n
      FROM cartas_catalogo c
     GROUP BY c.nombre HAVING count(*) > 1) d;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG077 ABORTA: nombres duplicados en el catalogo: %', v_txt;
  END IF;

  -- (17) HUELLA: md5 estable del bloque seed (segunda corrida identica) ----
  SELECT md5(string_agg(c.id || '|' || c.nombre || '|' || c.familia || '|'
                        || c.subtipo || '|' || c.rareza || '|'
                        || c.precio_xp::text || '|' || c.supply_max::text
                        || '|' || c.edicion || '|' || c.activo::text
                        || '|' || c.stats_json::text, '#' ORDER BY c.id)) INTO v_md5
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text));

  RAISE NOTICE 'MIG077 OK: % carta(s) insertada(s) en esta corrida; 10 en catalogo (5 flora + 5 fauna); ajenas al seed = %',
    v_ins, v_otros_despues;
  RAISE NOTICE 'MIG077 OK: rareza 4/3/2/1, precio 150/400/1000/2500, supply 5000/1000/250/50, nivel_gate NULL, fusionable false';
  RAISE NOTICE 'MIG077 md5(seed)=% (segunda corrida debe imprimir el mismo valor)', v_md5;
END
$mig077$;
