# Gamificacion v6: multiplicador de nivel (M_nivel), doble cap y reescalado de los 20 umbrales

- **Fecha:** 2026-09-21
- **ADR:** ADR-053 (`exploraco desarrollo/DECISIONS.md`)
- **Estado:** Diseno de Fase 1 CONGELADO; **ENMENDADO 2026-09-21 por la segunda opinion (`@architect-review`, APROBADO CON CAMBIOS). Ver la seccion 16 (Enmienda 1); donde haya contradiccion, PREVALECE la seccion 16.** Implementacion PENDIENTE (backend + UI + admin + migracion 031).
- **Presupuesto endpoints:** 8/8 intacto (ADR-001). Ramas existentes: `?recurso=` en `api/admin.js` (router real) y `?tipo=` en `api/usuarios.js`, mas campos aditivos.
- **ASCII-safe (ADR-002):** este documento, el esquema y todo el codigo de ejemplo usan solo ASCII.
- **Migracion:** `db/migrations/031_gamificacion_v6_nivel_scaling.sql` (029 y 030 ya ocupadas). **Hoy NO esta commiteada** (R-11): versionar antes de aplicar en Neon.

> Fuente de verdad: el archivo real del repositorio (ADR-006). Los numeros de linea
> fueron verificados sobre el working tree el 2026-09-21 con `api/interacciones.js` v24,
> `api/usuarios.js` v18, `api/admin.js`, `usuario-session.js`, `niveles-data.js`,
> `index.html`, `comunidad.html` y `mi-perfil.html`. Si algun archivo cambia, se
> reverifica antes de implementar. Los datos de BD real los audito el operador con
> `scripts/neon_select.js` (modo real) el 2026-09-21.

---

## 1. Objetivo

1. Introducir `M_nivel`: multiplicador de XP que crece con el nivel del usuario, de x1.0 (N1) a x3.0 (N20). Hoy el nivel NO da ninguna ventaja economica.
2. Acotar el stack completo con un **doble cap secuencial** (`CAP_PROGRESION = 5.0`, `CAP_GLOBAL = 10.0`) para que el techo efectivo sea x10.0 en vez de x17.16.
3. Reescalar los 20 umbrales de nivel con techo 42000 XP.
4. Recatalogar las bases de XP de las acciones de mapa (+ nuevas acciones instrumentadas: Activo Oculto proponer/checkin, crear/unirse a plan, completar atributos de spot).
5. Reposicionar los costos de eleccion y el catalogo de consumibles para no deflactar la economia.
6. Crear `xp_ledger`: ledger unico con desglose, que habilita el toast con desglose, el panel admin "Salud de la Red" y la reconciliacion del XP.
7. NO implementar Rising Star Decay (ni la tabla `user_action_decay`): se refuerzan los caps existentes y se agrega UI informativa de enfriamiento/cupo.

Fuera de objetivo: tocar `destinos.tags`, crear endpoints, cambiar el modelo de Casas/Clases/Facciones o persistir `usuarios.nivel`/`badge_actual`.

---

## 2. Evidencia verificada (archivo:linea, ADR-006)

### 2.1 Puntos de anclaje obligatorios

| Elemento | Evidencia real | Nota |
|---|---|---|
| UNICO calculo de XP | `api/interacciones.js:275-283` (`calcularXpFinal`) | comentario "UNICO catalogo" en `:257-261` |
| `BONUS_CLASE` | `api/interacciones.js:262` | `cartografo 0.08`, `cronista 0.10`, `explorador 0.07` |
| `XP_NIVEL_CLASE` | `api/interacciones.js:263` | 11 umbrales, tope nivel 10 |
| `factorCasa` | `api/interacciones.js:280-281` | rezagada 1.30 / dominante 0.85 |
| `red2` / `numXp` | `api/interacciones.js:254-255` | helpers unicos (ADR-035) |
| Amuleto x2 | `api/interacciones.js:2136` (`aplicarAmuletoX2`) | aplicado hoy ANTES de clase/Casa |
| Lider de ciudad x1.1 | `api/interacciones.js:2085-2094` (`xpConMultiplicador`) | consulta la ciudad del destino |
| Efectos post-entrega | `api/interacciones.js:346-374` (`acreditarClaseYCofre`) | 50% a `xp_clase`, 10% al cofre de Casa |
| Nivel derivado (servidor) | `api/usuarios.js:16-37` (`NIVELES`), `:45-69` (`calcularNivel`/`conNivel`) | nivel/badge NUNCA persistidos |
| `NIVELES_LOCAL` | `api/interacciones.js:412-415` | espejo |
| `xp_detalle` (precedente del toast) | `api/interacciones.js:8782-8789` | ya emite `base`/`multiplicador`/`amuleto`/`bono_rural`/`total` |
| `admin_xp` (Bearer, XP fijo) | `api/interacciones.js:7337-7377` (`delta_xp` en `:7351`) | exento de `M_nivel` |
| Catalogos exentos | `MISIONES` **41** entradas (`id: 'mis_`) y `LOGROS` **33** entradas (`tier:`) | conteos verificados por grep |
| Costos de eleccion | `api/usuarios.js:775-776` (faccion 500), `:863-864` (casa 300), `:947-949` (clase 300) | a repricear |
| Repricing de consumibles | `api/admin.js:336-437` (`consumibles_lista/crear/editar/toggle`) | `precio_xp` numerico |
| Router real de admin | `api/admin.js:132` (`req.query.recurso`), `:330-333` (`tipo` solo dentro de `recurso=consumibles`), `:514-517` (recurso invalido) | la rama nueva es `?recurso=salud_red` (Enmienda 1) |
| Gate Bearer admin | `api/admin.js:28-31` (`auth()`), aplicado en `:331` | no es `:29-34` como decia el brief |
| 7+ espejos de umbrales | ver seccion 4.3 | deuda activa (incluye `admin.html:7362` y `BADGES_LOCAL`) |
| Literales `+10` fuera del catalogo | `api/interacciones.js:6936`, `:6939`, `:6940`, `:6951` (insert base 15 en `:6911`) | violacion viva de la Regla de No-Duplicidad (son 4, no 1) |

### 2.2 Correcciones a los numeros citados en el brief de producto

La verificacion de archivo real devuelve lineas distintas a las del brief. Manda el archivo (ADR-006):

| Dato del brief | Real verificado | Delta |
|---|---|---|
| `VISITA_BONO_RURAL` en `api/interacciones.js:194` | `:198` | +4 lineas |
| `factorXpPorRadio` en `:203-210` | declarado en `:205` | rango distinto |
| `mis_plan_creador` 25 XP en `:6054-6101` | valor `xp: 25` en `:1430` (catalogo); handler en `:6056` | el XP vive en `MISIONES`, no en el handler |
| `mis_plan_unido` 15 XP en `:6103-6137` | valor `xp: 15` en `:1442`; handler en `:6106` | idem |
| clase 300 XP en `api/usuarios.js:908` | rama en `:908`; el cobro esta en `:947-949` | el cobro es lo que se repricia |
| "15+ `UPDATE xp_total` sueltos" | **al menos 22** en `api/interacciones.js`: los 19 del grep (`:2260, 2907, 3122, 5584, 5690, 5936, 6207, 6313, 6478, 6654, 6845, 6926, 6936, 7377, 7765, 8309, 8545, 8763, 8872`) **mas 3 multilinea** (`:2586` misiones, `:2729` logros, `:8444` resena) | mas los de `api/usuarios.js`; TODOS se instrumentan (Enmienda 1) |
| `interacciones.xp_gano` | columna real: `interacciones.xp_ganado` | nombre exacto |

### 2.3 Hallazgos de BD real (7 usuarios)

- 6 usuarios con `xp_total > 0`; max `1616.92`; segundo `1511.71`; promedio `548.94`.
- Ambos top quedan en **Nivel 7** con la tabla vieja (`1400 <= 1616.92 < 1900`) y con la nueva (`1500 <= 1616.92 < 2100`): **ningun usuario regresa de nivel**. El techo 42000 queda como aspiracion de diseno sin poblacion de calibracion (ver 4.4).
- Migraciones aplicadas: 024, 026, 030. **NO aplicadas: 027 y 028.**
- `usuarios.nivel` y `usuarios.badge_actual` existen como columnas legacy, nunca escritas por el backend.
- **NO existen** `xp_ledger`, `gamificacion_config`, `usuarios.nivel_max`, `consumibles.precio_xp_base`, `consumibles.precio_xp_actual` ni la vista `consumibles_precio` (las 3 ultimas son de la 027 no aplicada).
- Catalogo real de consumibles: 17 filas en `consumibles.precio_xp` (ver 6.2).

---

## 3. Modelo matematico (congelado en ADR-053)

### 3.1 Formulas

    M_nivel(N)        = 1.0 + ((N - 1) / 19) * 2.0        con N entero en 1..20

    m_nivel           = M_nivel(nivel_usuario)                       // 1.0 .. 3.0
    mult_clase        = 1 + nivel_clase * BONUS_CLASE[clase_id]      // 1.0 .. 2.0
    factor_casa       = 1.30 rezagada | 1.00 equilibrada | 0.85 dominante

    mult_progresion   = m_nivel * mult_clase * factor_casa
    mult_progresion_c = min(mult_progresion, CAP_PROGRESION)         // 5.0

    mult_stack        = mult_clase * factor_casa * (amuleto_x2 ? 2.0 : 1.0) * (es_lider_ciudad ? 1.1 : 1.0)
    mult_global       = mult_progresion_c * (amuleto_x2 ? 2.0 : 1.0) * (es_lider_ciudad ? 1.1 : 1.0)
    mult_global_c     = min(mult_global, CAP_GLOBAL)                 // 10.0

    xp_final          = red2(xp_base * mult_global_c)
    bonos_planos      = bono rural de visita u otros sumados post-cap
    xp_acreditable    = red2(xp_final + bonos_planos)                // lo que va a usuarios.xp_total

**Cap SECUENCIAL (contrato fijo):** `mult_global` se calcula sobre `mult_progresion_c` (YA capado), no sobre el valor crudo. Si el cap de progresion no alimentara al global, quedaria sin efecto apenas el stack temporal sea mayor a 1 (el global 10.0 lo haria irrelevante) y el doble cap seria decorativo.

**Semantica unica de `mult_stack` (Enmienda 1):** `mult_stack` = producto de TODO el stack EXCEPTO `M_nivel` (`mult_clase * factor_casa * amuleto * lider`). Por tanto `m_nivel * mult_stack` es el **producto crudo completo** (sin caps); `mult_global_c` es el **efectivo** y `cap_aplicado` explica el recorte. `mult_stack` es un agregado de REPORTE del ledger, NO se re-multiplica en la cadena del cap (el cap global usa `mult_progresion_c`). Invariante: `xp_final = ROUND(xp_base * mult_final, 2) + bonos_planos`, con salvedad de cuantizacion y de caps de accion (`compartir`/`chat`, `cap_aplicado = 'accion'`).

### 3.2 Rangos y efecto del cap

| Escenario | mult_progresion crudo | post `CAP_PROGRESION` | stack | pre `CAP_GLOBAL` | final |
|---|---|---|---|---|---|
| N1, sin clase, Casa equilibrada | 1.000 | 1.000 | 1.0 | 1.000 | **1.000** |
| N7 tipico (usuario real) | 1.632 | 1.632 | 1.0 | 1.632 | **1.632** |
| N20 + clase 10 + Casa rezagada | 7.800 | 5.000 | 2.0 x 1.1 | 11.000 | **10.000** |
| N12 + clase 5 + Casa rezagada + amuleto | 2.158 * 1.5 * 1.3 = 4.208 | 4.208 | 2.0 | 8.416 | **8.416** |
| N20, sin clase, sin Casa, sin consumibles | 3.000 | 3.000 | 1.0 | 3.000 | **3.000** |
| N1 + Casa dominante (minimo global) | 1.000 * 1.0 * 0.85 = 0.850 | 0.850 | 1.0 | 0.850 | **0.850** |

Techo historico sin cap: **x17.16** (3.0 x 2.0 x 1.3 x 2.0 x 1.1). Techo con cap: **x10.00** (recorte del 41.7%). El cap de progresion solo se activa cuando `m_nivel * mult_clase * factor_casa > 5.0`, y eso depende de la combinacion: con Casa rezagada comienza alrededor del Nivel 9 con clase 10 (y del Nivel 16 con clase 5); con Casa equilibrada exige Nivel >= 17 con clase 8-10 (y Nivel 20 con clase >= 7); con Casa dominante solo Nivel 20 con clase 10. En los niveles medios, donde esta la poblacion real, el cap NO se activa: `M_nivel` aplica completo.

**Sin piso 1.0 (Enmienda 1):** NO se aplica `max(1.0, mult_global_c)`. El rango `[0.85, 10.0]` se preserva a proposito: el x0.85 es el `factorCasa` de Casa dominante ya vigente (ADR-038), no una regresion de `M_nivel` (`M_nivel` es siempre >= 1.0).

### 3.3 Pseudo-codigo del UNICO punto (a redactar por @backend-dev)

Regla de No-Duplicidad: este bloque reemplaza y absorbe el calculo actual; nada fuera de aqui multiplica XP.

    // api/interacciones.js -- UNICO punto de calculo (reemplaza :275-283)
    // Lee gamificacion_config con degradacion a las constantes locales.
    async function calcularXpFinal(sql, ctx) {
      // ctx: { xp_base, nivel_usuario, nivel_clase, clase_id, casa_tag,
      //        stack: { amuleto: bool, lider_ciudad: bool },
      //        bonos_planos: number, accion: string, usuario_id: uuid }
      var cfg = await leerGamificacionConfig(sql); // 1 SELECT + fallback a constantes
      var m_nivel = 1.0 + ((clamp(nivel_usuario,1,20) - 1) / 19) * (cfg.m_nivel_max - 1.0);
      var mult_clase = 1 + (clamp(nivel_clase,1,10) * (BONUS_CLASE[clase_id] || 0));
      var factor_casa = (casa_tag === 'rezagada') ? 1.30 : (casa_tag === 'dominante') ? 0.85 : 1.0;
      var mult_progresion = m_nivel * mult_clase * factor_casa;
      var cap_progresion = false;
      if (mult_progresion > cfg.cap_progresion) { mult_progresion = cfg.cap_progresion; cap_progresion = true; }
      var stack_temp = (ctx.stack && ctx.stack.amuleto ? 2.0 : 1.0)
                     * (ctx.stack && ctx.stack.lider_ciudad ? 1.1 : 1.0);
      var mult_stack = mult_clase * factor_casa * stack_temp;   // reporte: TODO el stack menos M_nivel (Enmienda 1)
      var mult_global = mult_progresion * stack_temp;
      var cap_global = false;
      if (mult_global > cfg.cap_global) { mult_global = cfg.cap_global; cap_global = true; }
      var xp_final = red2(numXp(ctx.xp_base) * mult_global);
      var xp_acreditable = red2(xp_final + numXp(ctx.bonos_planos));
      var desglose = {
        base: numXp(ctx.xp_base), m_nivel: m_nivel, mult_clase: mult_clase,
        factor_casa: factor_casa, mult_progresion: mult_progresion,
        mult_stack: mult_stack, mult_global: mult_global,
        cap_aplicado: cap_global ? 'global' : (cap_progresion ? 'progresion' : 'ninguno'),
        bonos_planos: numXp(ctx.bonos_planos), total: xp_acreditable
      };
      return { xp_final: xp_acreditable, desglose: desglose };
    }

Nota: el `stack` (amuleto + lider) se resuelve ANTES de llamar al punto unico; `aplicarAmuletoX2` deja de multiplicar XP y pasa a informar `{ amuleto: true }` (o a consumir el uso sin tocar el numero). Esto es obligatorio para que el cap global vea el stack real y para que `xp_base` nunca llegue pre-multiplicado.

Nota (Enmienda 1): los caps **denominados en XP** (`compartir` 50 XP/24h, `chat` 10 XP/dia) NO viven en `calcularXpFinal` (que solo aplica caps multiplicativos). Los aplica el caller y la fila del ledger se registra con **`cap_aplicado = 'accion'`** y `xp_final` = XP realmente acreditado (ya recortado por el cupo). Por eso el CHECK de `cap_aplicado` incluye `'accion'`.

---

## 4. Umbrales

### 4.1 Tabla congelada (techo 42000)

| N | Umbral viejo | Umbral nuevo | Delta | M_nivel | Titulo (fuente `api/usuarios.js:16-37`) |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 1.000 | Caminante Novato |
| 2 | 100 | 100 | 0 | 1.105 | Rastreador Local |
| 3 | 250 | 250 | 0 | 1.211 | Explorador Urbano |
| 4 | 450 | 450 | 0 | 1.316 | Aventurero Regional |
| 5 | 700 | 700 | 0 | 1.421 | Vanguardia Territorial |
| 6 | 1000 | 1050 | +50 | 1.526 | Embajador de Zona |
| 7 | 1400 | 1500 | +100 | 1.632 | Fotografo de Ruta |
| 8 | 1900 | 2100 | +200 | 1.737 | Cronista de Historias |
| 9 | 2500 | 2900 | +400 | 1.842 | Buscador de Leyendas |
| 10 | 3200 | 3900 | +700 | 1.947 | Guia de Fronteras |
| 11 | 4000 | 5200 | +1200 | 2.053 | Estratega Comunitario |
| 12 | 5200 | 6800 | +1600 | 2.158 | Documentalista Visual |
| 13 | 6800 | 8800 | +2000 | 2.263 | Senor del Spot |
| 14 | 8500 | 11200 | +2700 | 2.368 | Cartografo de Cine |
| 15 | 10500 | 14200 | +3700 | 2.474 | Protector del Patrimonio |
| 16 | 13000 | 17800 | +4800 | 2.579 | Curador de Colombia |
| 17 | 16000 | 22200 | +6200 | 2.684 | Mariscal de Parche |
| 18 | 19500 | 27500 | +8000 | 2.789 | Cineasta de Territorio |
| 19 | 24000 | 34000 | +10000 | 2.895 | Inmortal del Mapa |
| 20 | 30000 | 42000 | +12000 | 3.000 | Gran Maestro ExploraCO |

`api/usuarios.js:NIVELES` gana un campo `mult` con la columna `M_nivel`, para que el backend tenga la tabla completa en un solo lugar.

### 4.2 Regresion de nivel y `nivel_max`

Los umbrales nuevos son **mayores o iguales** a los viejos en todos los niveles, luego `nivel_nuevo(xp) <= nivel_viejo(xp)`. Bandas de regresion:

| xp | Nivel viejo | Nivel nuevo | Perdida |
|---|---|---|---|
| 1000..1049 | 6 | 5 | 1 |
| 1400..1499 | 7 | 6 | 1 |
| 1900..2099 | 8 | 7 | 1 |
| 2500..2899 | 9 | 8 | 1 |
| 3200..3899 | 10 | 9 | 1 |
| 4000..5199 | 11 | 10 | 1 |
| 5200..6799 | 12 | 11 | 1 |
| 6800..8799 | 13 | 12 | 1 |
| 8500..11199 | 14 | 13 | 1 |
| 10500..14199 | 15 | 14 | 1 |
| 13000..17799 | 16 | 15 | 1 |
| 16000..22199 | 17 | 16 | 1 |
| 19500..27499 | 18 | 17 | 1 |
| 24000..33999 | 19 | 18 | 1 |
| 30000..33999 | 20 | 18 | **2** |
| 34000..41999 | 20 | 19 | 1 |

Con la BD real (max 1616.92) **nadie cae**. La proteccion se implementa igual:

- `usuarios.nivel_max smallint NOT NULL DEFAULT 1` (nivel historico maximo).
- `nivel_visible = GREATEST(calcularNivel(xp_total).nivel, COALESCE(nivel_max, 1))`.
- Actualizacion monotona en cada acreditacion: `nivel_max = GREATEST(COALESCE(nivel_max,1), calc.nivel)`.
- Siembra unica en la 031 con el nivel derivado de la tabla VIEJA.
- `usuarios.nivel` y `usuarios.badge_actual` siguen SIN escribirse: la insignia se deriva de `nivel_visible`.
- **`M_nivel` usa el nivel DERIVADO de `xp_total` (`calcularNivel(xp_total).nivel`), NO `nivel_visible`/`nivel_max` (Enmienda 1).** `nivel_max` protege UNICAMENTE la insignia; NO neutraliza el castigo economico del de-nivel (ADR-018). Gastar XP puede bajar el multiplicador aunque la insignia se conserve.

### 4.3 Los 7+ espejos de umbrales (deuda a sincronizar; Enmienda 1)

| # | Archivo | Evidencia | Forma |
|---|---|---|---|
| 1 | `api/usuarios.js` | `:16-37` | `NIVELES[{min,nombre}]` -- FUENTE SERVIDOR |
| 2 | `api/interacciones.js` | `:412-415` | `NIVELES_LOCAL[]` |
| 3 | `usuario-session.js` | `:19-26` | `XP_LEVELS[]` + `MAX_NIVEL` |
| 4 | `index.html` | `:2969-2994` | `XP_LEVELS[{min,nombre}]` + relleno `.max` |
| 5 | `comunidad.html` | `:580-603` | `XP_LEVELS[{min,...}]` + relleno `.max` |
| 6 | `niveles-data.js` | `:14-35` | `NivelesData.XP_LEVELS[...]` -- FUENTE CLIENTE declarada (ADR-040) |
| 7 | `admin.html` | `:7362` | `_jugNiveles = [0,100,...,30000]` (antes OMITIDO) |
| 8 | `api/interacciones.js` | `:466` | `BADGES_LOCAL[]` (20 TITULOS, no umbrales; tambien se valida) |

Hallazgo: ADR-040 declaro `niveles-data.js` fuente unica cliente, pero **solo `mi-perfil.html:929` lo carga**. `index.html`, `comunidad.html` y `usuario-session.js` conservan copias propias.

Acciones:
1. Sincronizar los 7+ con la tabla 4.1 en la misma entrega.
2. Agregar `mult` a `api/usuarios.js:NIVELES` y a `niveles-data.js`.
3. Exigir `scripts/smoke_niveles_espejos.js`: lee los 7+ archivos (incluidos `admin.html:7362` y `BADGES_LOCAL`), extrae los 20 umbrales (y los 20 titulos de `BADGES_LOCAL`) y FALLA si algun espejo difiere de la fuente servidor. Gate de QA.
4. Migracion gradual a `niveles-data.js` en `index.html`/`comunidad.html`/`usuario-session.js`: si el costo de red lo impide, el archivo derivado debe ser detectado por el smoke (nunca desfase silencioso).
5. **NO hay `require` cruzado entre funciones serverless** (`admin.js:56-59`): `api/interacciones.js` NO puede consumir `NIVELES` de `api/usuarios.js`. `NIVELES_LOCAL` se mantiene como espejo sincronizado + smoke comparador. Opcion a documentar (no implementar ahora): mover la tabla a `lib/` fuera de `api/`.
6. **Falso positivo a EVITAR:** `RAMA_TIERS`/`ARBOL_UMBRALES` (`api/interacciones.js:554`, `mi-perfil.html:3387`, `perfil.html:655`) comparten 5 valores (0/100/250/450/700) pero **NO son espejos de la tabla de 20** (tiers del Arbol de Clases): no incluirlos en el comparador.

### 4.4 Nota de calibracion (42000 por decreto) + meta de ritmo (Enmienda 1)

Con 7 usuarios y max 1616.92 no hay poblacion en la cola alta. El techo 42000 se mantiene por decision de diseno (coherente con `M_nivel(20) = 3.0`), no por datos.

**Meta de ritmo declarada:** N20 en **3-6 meses de uso activo**. Verificacion: la estimacion de la segunda opinion (muy activo ~N20 en 1-2 meses; casual ~8 meses) sugiere que 42000 se alcanza mas rapido que la meta para el usuario muy activo; se documenta como **deuda de calibracion** y NO se cambia el techo (decision del operador). Se revisa cuando exista poblacion (sugerido: >= 10 usuarios en Nivel >= 12 o 90 dias de `xp_ledger`).

**`gamificacion_config` NO recalibra la curva (Enmienda 1):** solo parametriza CAPS (`cap_progresion`, `cap_global`, `m_nivel_max`), NO umbrales. Recalibrar los umbrales exige deploy (se evita una segunda fuente de verdad; Q4).

---

## 5. Catalogo unico de bases de XP v2.1

Regla: una sola constante/catalogo (`XP_BASES`) junto al punto unico de calculo. **Prohibidos los literales sueltos** (el `+10` de `:6936` se rutea al catalogo en esta entrega).

| Accion (`accion`) | Base hoy | Base v2.1 | Cap | `M_nivel` | Evidencia |
|---|---|---|---|---|---|
| `visita` | `20 * factor_area` | sin cambio | 30/dia (`VISITAS_DIA_MAX` `:195`) | SI | `:8667` |
| `visita_bono_rural` | `VISITA_BONO_RURAL = 20` plano | **25** plano | -- | NO (post-cap) | `:198`, `:8726`, `:8761`; `factorXpPorRadio` `:205` NO cambia |
| `resena_larga` (>50 chars) | 25 | **30** | -- | SI | `:8392` |
| `resena_corta` | 10 | 10 | -- | SI | `:8393` |
| `rating` | 5 | 5 | -- | SI | `:2906` |
| `guardado` | 5 | 5 | -- | SI | `:8538-8543` |
| `chat_comentario` | 2 | 2 | 10 XP/dia (20 XP = 10 msgs) | SI | `:2438-2459` |
| `compartir` | 25 primera / 5 posteriores | sin cambio | 10 eventos y 50 XP/24h | SI | ADR-036 / `:8309` |
| `foto_viajero` | 15 | **20** | -- | SI | `:6477` |
| `album_crear` | 20 | 20 | -- | SI | `:6844` |
| `album_foto` | 15 | 15 | -- | SI | `:6925` |
| `album_foto_autor` | 10 (**4 literales**) | 10 (catalogo) o EXENTA con constante unica | -- | SI (por catalogo) o EXENTA | `:6936`, `:6939`, `:6940`, `:6951`; insert `:6911` (ver 5.1) |
| `voto_media` | 5 | 5 | -- | SI | `:2906` |
| `ao_proponer` | 0 directo (+50 al aprobar) | **+30 directo** (+50 al aprobar) | **3/dia con XP** | SI | handler `:5476-5507` (hoy NO acredita) |
| `ao_checkin` | 15 | **20** | cooldown 90 s + 30/dia | SI | `:5688` |
| `plan_crear` | 0 directo (mision 25 unica) | **+20 directo** + mision **10** | **3/dia** | SI directo / NO mision | handler `:6056-6101`; mision `:1430` |
| `plan_unirse` | 0 directo (mision 15 unica) | **+6 directo** + mision **10** | **5/dia** | SI directo / NO mision | handler `:6106-6137`; mision `:1442` |
| `spot_atributos` | NO EXISTE | **+10** | -- | SI | a instrumentar |

Salvedades:
- **No se tocan los caps ya existentes** de rating, guardado, chat/comentario ni compartir.
- **Bajar las misiones de plan (25 -> 10 y 15 -> 10) es obligatorio** para evitar doble pago: el total por crear un plan pasa de 25 una sola vez a 20/dia (cap x3) + 10 una vez.
- **Acoplamiento documentado:** `mis_primera_resena` (`:1246`) compara `xp_ganado >= 25`. Subir `resena_larga` a 30 lo mantiene valido; bajarlo lo rompe.
- **Doble ledger derivado:** `interacciones.xp_ganado` guarda la BASE y alimenta Origen, fama, vocaciones y `art_literatura` (`:1107`, `:531`). Subir bases MUEVE esas metricas (efecto esperado, documentado).
- **Distincion `interacciones` vs `media_compartidos` (Enmienda 1):** la afirmacion "`xp_ganado` guarda la BASE" es cierta SOLO para `interacciones`. **`media_compartidos.xp_ganado` (`:8310`) guarda el XP FINAL.** Consecuencia: el tope de compartir (50 XP/24h) se agota con MENOS acciones al subir `M_nivel` (R-12); la UI de cupo restante debe explicarlo.

### 5.1 `album_foto_autor`: 4 literales, no 1 (Enmienda 1)

En `api/interacciones.js`: `:6936` (`UPDATE usuarios SET xp_total=xp_total+10`), `:6939` (`repartirXpReferidos(...,10)`), `:6940` (tope diario `xp_autor_dia < 10` sobre `progreso_album` JSONB) y `:6951` (`xp_autor_original: ... ? 10 : 0`); mas el `INSERT` de `:6911` con base 15. **Exigencia:** rutear los CUATRO por el catalogo unico (`accion = 'album_foto_autor'`) o declarar `album_foto_autor` EXENTA completa con su constante unica. Instrumentar solo el `UPDATE` y dejar `:6940` hardcodeado rompe el contador del tope diario. No puede quedar ningun literal suelto.

---

## 6. Precedencia, exenciones y repricing

### 6.1 Precedencia y exenciones

Reciben `M_nivel`: visita, rating, guardado, resena, foto de viajero, album crear, album foto, album foto al autor, comentario de media, voto de media, compartir, `ao_proponer`, `ao_checkin`, `plan_crear`, `plan_unirse`, `spot_atributos`.

EXENTAS (XP fijo y determinista, sin `M_nivel` ni caps):
- Misiones (41) y logros (33) -- valor `xp` del catalogo `api/interacciones.js`.
- `admin_xp` (Bearer ADMIN_SECRET) -- entrega exacta del `delta_xp`.
- Bonos de referidos (`repartirXpReferidos`) -- el % del padrino no se multiplica por el nivel de nadie.

Orden obligatorio de la acreditacion:
1. Resolver `xp_base` del catalogo.
2. Resolver `m_nivel`, `mult_clase`, `factor_casa`; calcular y capear la progresion.
3. Resolver `mult_stack`; calcular y capear el global.
4. `xp_final = red2(xp_base * mult_global_c)`.
5. Sumar `bonos_planos` DESPUES del cap (hoy `:8756-8761` ya lo hace plano).
6. Escribir `usuarios.xp_total` (+ `ultimo_acceso`, + contadores de la accion).
7. `acreditarClaseYCofre`, `repartirXpReferidos`, `avanzarMisionesCasa(...,'xp_total',...)` y `aplicarFamaPandilla` sobre `xp_acreditable` (POST-CAP).
8. Insertar la fila de `xp_ledger` con el desglose.

### 6.2 Repricing de consumibles (17 filas)

Regla: categoria `impulso` **x2.0**; categorias `perfil`, `social`, `coleccion`, `general` **x1.6**. Redondeo: half-up a multiplo de 10 (criterio unico; lo fija `sql-security` en la 031 y lo verifica el smoke).

| categoria | item | hoy | factor | nuevo |
|---|---|---|---|---|
| impulso | `amuleto_x2` | 350 | x2.0 | 700 |
| impulso | `imantador_cromos` | 400 | x2.0 | 800 |
| impulso | `trompeta_fama` | 500 | x2.0 | 1000 |
| coleccion | `cuaderno_expedicion` | 450 | x1.6 | 720 |
| coleccion | `pergamino_mapa` | 500 | x1.6 | 800 |
| general | `pluma_inspirada` | 600 | x1.6 | 960 |
| perfil | `perfil_marco_plata` | 300 | x1.6 | 480 |
| perfil | `perfil_tema_oscuro` | 500 | x1.6 | 800 |
| perfil | `perfil_vitrina_destacada` | 650 | x1.6 | 1040 |
| perfil | `perfil_marco_dorado` | 700 | x1.6 | 1120 |
| perfil | `perfil_titulo_custom` | 800 | x1.6 | 1280 |
| perfil | `perfil_banda_artista` | 900 | x1.6 | 1440 |
| perfil | `perfil_fondo_paisaje` | 1000 | x1.6 | 1600 |
| social | `pin_cromado` | 250 | x1.6 | 400 |
| social | `vitrina_estelar` | 300 | x1.6 | 480 |
| social | `sala_efimera` | 800 | x1.6 | 1280 |
| social | `pase_vip` | 1500 | x1.6 | 2400 |

### 6.3 Repricing de costos de eleccion (`api/usuarios.js`)

| Eleccion | Hoy | Nuevo | Ubicacion del cobro |
|---|---|---|---|
| Cambio de faccion | 500 | **800** | `:775-776` |
| Cambio de Casa | 300 | **500** | `:863-864` |
| Recambio de Clase | 300 | **500** | `:947-949` |

### 6.4 Textos de UI hardcodeados (o la UI miente)

| Archivo:linea | Texto actual | Nuevo |
|---|---|---|
| `mi-perfil.html:3330` | "Primera eleccion gratis. Cambios posteriores: 500 XP con 15 dias de espera." | 800 XP |
| `mi-perfil.html:3326` | "Cambio disponible en N dias (500 XP)" / "Puedes cambiar de faccion (500 XP)" | 800 XP |
| `mi-perfil.html:3368` | "Necesitas 500 XP para cambiar de faccion" | 800 XP |
| `mi-perfil.html:4332` | "Primera eleccion gratis desde nivel 2; cambio: 300 XP + cooldown 30 dias." | 500 XP |
| `mi-perfil.html:4367` | "Cambio disponible en N dias (300 XP)" / "Puedes cambiar de Casa (300 XP)" | 500 XP |
| `mi-perfil.html:4369` | "Cambiarla cuesta 300 XP y 30 dias de espera." | 500 XP |
| `mi-perfil.html:4410` | "Necesitas 300 XP para cambiar de Casa" | 500 XP |
| `mi-perfil.html:4427` | "Este cambio cuesta 300 XP y puede bajarte de nivel." | 500 XP |
| `mi-perfil.html:4429` | "...cambiarla cuesta 300 XP y tiene 30 dias de espera." | 500 XP |
| Recambio de Clase | NO LOCALIZADO en `mi-perfil.html` | REVERIFICAR antes de implementar (puede venir del API) |

---

## 7. Contrato de la migracion 031 (a redactar por @sql-security)

Archivo: `db/migrations/031_gamificacion_v6_nivel_scaling.sql`. Aditiva, idempotente (ADR-008), ASCII-safe (ADR-002). **Este apartado es el contrato de esquema; el `.sql` final lo redacta `sql-security`.**

### 7.1 `usuarios.nivel_max`

| Campo | Valor |
|---|---|
| columna | `nivel_max smallint NOT NULL DEFAULT 1` |
| idempotencia | guard `information_schema.columns` (patron BUG-021) |
| siembra | `UPDATE usuarios SET nivel_max = <nivel con la tabla VIEJA> WHERE nivel_max IS NULL OR nivel_max = 1` una sola vez; re-ejecucion no-op |
| monotonica | el backend solo escribe `GREATEST(COALESCE(nivel_max,1), calc.nivel)` |

### 7.2 `gamificacion_config`

| columna | tipo | nota |
|---|---|---|
| `clave` | `text PRIMARY KEY` | -- |
| `valor` | `numeric(12,4) NOT NULL` | -- |
| `descripcion` | `text` | -- |
| `actualizado_en` | `timestamptz NOT NULL DEFAULT NOW()` | -- |

Seed (idempotente con `ON CONFLICT (clave) DO NOTHING`, para no pisar un ajuste manual): `cap_progresion = 5.0`, `cap_global = 10.0`, `m_nivel_max = 3.0`.

### 7.3 `xp_ledger`

| columna | tipo | nota |
|---|---|---|
| `id` | `bigserial PRIMARY KEY` | -- |
| `usuario_id` | `uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE` | -- |
| `accion` | `text NOT NULL` | id del catalogo de bases / mision / logro |
| `xp_base` | `numeric(12,2) NOT NULL DEFAULT 0` | -- |
| `mult_nivel` | `numeric(10,6) NOT NULL DEFAULT 1` | `M_nivel(N)` (nivel DERIVADO de `xp_total`) |
| `mult_stack` | `numeric(10,6) NOT NULL DEFAULT 1` | TODO el stack menos `M_nivel`: `mult_clase * factor_casa * amuleto * lider` (Enmienda 1) |
| `mult_final` | `numeric(10,6) NOT NULL DEFAULT 1` | `mult_global_c` (efectivo post-caps) |
| `cap_aplicado` | `text NOT NULL DEFAULT 'ninguno'` | `ninguno` / `progresion` / `global` / `accion` (caps en XP: compartir/chat; Enmienda 1) |
| `bonos_planos` | `numeric(12,2) NOT NULL DEFAULT 0` | bono rural |
| `xp_final` | `numeric(12,2) NOT NULL DEFAULT 0` | XP acreditado a `xp_total` |
| `es_exento` | `boolean NOT NULL DEFAULT false` | misiones/logros/referidos/admin_xp |
| `contexto` | `jsonb NULL` | destino_id, ref, origen |
| `creado_en` | `timestamptz NOT NULL DEFAULT NOW()` | -- |

Indices: `idx_xp_ledger_usuario_creado (usuario_id, creado_en DESC)` y `idx_xp_ledger_accion_creado (accion, creado_en DESC)`.
Invariante verificable por smoke: para `es_exento = false`, `xp_final = ROUND(xp_base * mult_final, 2) + bonos_planos`. **Salvedad (Enmienda 1):** vale para acciones SIN cap denominado en XP; `compartir` (50 XP/24h) y `chat` (10 XP/dia) registran `cap_aplicado = 'accion'` con `xp_final` = XP realmente acreditado (ya recortado por el cupo). `sql-security` ajusta el CHECK de `cap_aplicado` para incluir `'accion'` y la precision de los multiplicadores a `numeric(10,6)`.
Sin backfill (la tabla no existe hoy; no se inventa historico: ADR-003).

### 7.4 Repricing y robustez frente a la 027

La 027 (ADR-042) define `consumibles.precio_xp_base`, `precio_xp_actual`, `tipo_canje` y la vista `consumibles_precio`; **NO esta aplicada**. Reglas obligatorias:

1. El repricing escribe SIEMPRE la columna existente `consumibles.precio_xp` (numeric).
2. Antes de tocar columnas de la 027, guard `information_schema.columns`; si existen, sincronizar `precio_xp_base = precio_xp` para que `consumibles_precio` no arranque con precios viejos.
3. Re-ejecutar la 031 es no-op.
4. Bloque de verificacion al final (solo lectura) que reporte si la 027 esta aplicada y si `precio_xp_base` quedo coherente.
5. Si la 027 se aplica DESPUES de la 031, el operador debe re-sembrar `precio_xp_base` desde `precio_xp` (deuda de orden de migraciones documentada).

### 7.5 Orden de despliegue (MANDATORIO)

0. **Versionar (commit) la 031 y esta spec ANTES de aplicarlas** (R-11: hoy estan sin commitear; el commit es decision del operador).
1. Aplicar la 031 COMPLETA en Neon.
2. Resolver 027/028: si se aplican, ANTES del deploy del backend, y re-sembrar `precio_xp_base` desde `precio_xp`.
3. Deploy del backend (`api/interacciones.js`, `api/usuarios.js`, `api/admin.js`).
4. Deploy del frontend con cache-bust (`niveles-data.js`, `usuario-session.js`, `index.html`, `comunidad.html`, `mi-perfil.html`, `admin.html`).

Invertir 1-2 respecto del deploy produce `42703` en cada acreditacion (patron BUG-021/BUG-060). Mitigacion obligatoria en el backend: degradacion escalonada (el XP se entrega igual; el ledger se salta con `console.warn`, nunca catch vacio).

---

## 8. Cambios por archivo (briefs de implementacion)

### 8.1 `api/interacciones.js` (@backend-dev)
- Reescribir `calcularXpFinal()` (`:275-283`) como el punto unico de la seccion 3.3, con lectura de `gamificacion_config` + fallback a constantes.
- Crear `XP_BASES` (seccion 5) y reemplazar TODOS los literales de base; incluir **los 4 literales de `album_foto_autor`** (`:6936`, `:6939`, `:6940`, `:6951`; insert `:6911`) o declarar la accion EXENTA con constante unica (seccion 5.1).
- Cablear `stack` (amuleto/lider) dentro del punto unico; `aplicarAmuletoX2` deja de multiplicar XP.
- `contextoXpE` (`:300-339`) debe exponer tambien `nivel_usuario` (hoy lee `xp_total` en el primer SELECT: `:319`) para alimentar `m_nivel`.
- Instrumentar `ao_proponer` (+30 directo, cap 3/dia) y `spot_atributos` (+10); `plan_crear` (+20, cap 3/dia) y `plan_unirse` (+6, cap 5/dia).
- Bajar misiones de plan a 10 XP (`:1430`, `:1442`).
- Actualizar `NIVELES_LOCAL` (`:412-415`) a los umbrales nuevos **como espejo sincronizado** (NO consumir `api/usuarios.js`: no hay `require` cruzado entre funciones serverless, `admin.js:56-59`).
- Escribir `xp_ledger` en **TODOS los al menos 22 puntos de escritura de `xp_total`** (incluidos los exentos, con `es_exento = true`) + actualizar `nivel_max` monotono.
- `M_nivel` se calcula con el nivel DERIVADO de `xp_total` (no `nivel_visible`/`nivel_max`).
- `acreditarClaseYCofre` y `avanzarMisionesCasa('xp_total')` y `aplicarFamaPandilla` sobre `xp_acreditable` (corrige la inconsistencia preexistente fama vs cofre en la visita).
- Generalizar `xp_detalle` (shape de la seccion 9) en las respuestas de las acciones de XP.

### 8.2 `api/usuarios.js` (@backend-dev)
- `NIVELES` (`:16-37`) con los 20 umbrales nuevos + campo `mult`.
- `calcularNivel`/`conNivel` devuelven `nivel` derivado, `nivel_visible` (`GREATEST` con `nivel_max`) y `nivel_max`.
- Costos 800/500/500 en `:775-776`, `:863-864`, `:947-949`.
- `?tipo=leaderboard` debe exponer `nivel_max`/`nivel_visible` (aditivo, sin romper clientes).

### 8.3 `api/admin.js` (@backend-dev o @admin-dev)
- Rama NUEVA **`GET /api/admin?recurso=salud_red`** (Enmienda 1: el router real es `?recurso=`, `admin.js:132`; el gate Bearer es `auth()` en `:28-31` aplicado en `:331`), que agrega por dia/accion desde `xp_ledger`: XP entregado, `cap_aplicado`, top acciones, usuarios activos, `nivel_max` vs nivel derivado. Degradacion 42P01 si la 031 no corre. NO se agrega un despachador global `?tipo=`.
- Verificar que `consumibles_editar` (`:381`) siga funcionando con el precio nuevo.

### 8.4 Frontend compartido (@frontend-tpl + @js-silo-dev)
- `niveles-data.js` (`:14-35`): umbrales nuevos + `mult` + etiqueta de multiplicador por nivel.
- `usuario-session.js` (`:19-26`): umbrales nuevos; evaluar consumir `niveles-data.js` (ADR-040).
- `index.html` (`:2969-2994`) y `comunidad.html` (`:580-603`): umbrales nuevos; idem.
- `mi-perfil.html`: textos 800/500 (seccion 6.4) + toast con desglose + barra de progreso + UI de enfriamiento/cupo.
- `admin.html`: tab "Salud de la Red" (consumo de `?recurso=salud_red`) + leaderboard. **Tambien sincronizar `_jugNiveles` (`:7362`) con la tabla 4.1** (7o espejo; Enmienda 1).
- Estado de XP SIEMPRE con `window.ExploraCO.fmtXp` (helper unico, ADR-035). Prohibido formatear XP inline.

### 8.5 Renderer (@renderer-dev)
- Verificar que `api/pagina-destino.js` NO conserva espejos de umbrales ni bases de XP (el espejo de `+15`/`+5` citado en la spec 2026-09-17 ya no existe en el archivo real: recalibracion ADR-006). Si aparece cualquier espejo, se elimina y se declara en el resumen.

### 8.6 SQL (@sql-security)
- Redactar y aplicar `031_gamificacion_v6_nivel_scaling.sql` bajo el contrato de la seccion 7 (RLS/seguridad y orden de migraciones incluidos).

---

## 9. Contrato de API

### 9.1 `xp_detalle` (aditivo, generalizado)

Precedente real: `api/interacciones.js:8782-8789`. Shape objetivo:

    xp_detalle: {
      base: number,            // xp_base del catalogo
      m_nivel: number,         // 1.0 .. 3.0
      mult_clase: number,      // 1.0 .. 2.0
      factor_casa: number,     // 0.85 | 1.0 | 1.3
      mult_progresion: number, // post cap_progresion
      mult_stack: number,      // TODO el stack menos M_nivel: clase * casa * amuleto * lider (Enmienda 1)
      mult_global: number,     // post cap_global
      cap_aplicado: 'ninguno' | 'progresion' | 'global' | 'accion',
      bonos_planos: number,    // bono rural
      total: number            // xp_acreditable
    }

Compatibilidad: los clientes actuales leen `base`/`multiplicador`/`amuleto`/`bono_rural`/`total`. Se conservan esos alias mientras exista trafico legacy (documentado) y se agregan los nuevos. `total` sigue siendo el XP acreditado.

### 9.2 `GET /api/admin?recurso=salud_red` (NUEVA rama, admin-gated; Enmienda 1)

Respuesta minima esperada (lectura de `xp_ledger`):

    {
      ok: true,
      data: {
        ventana_dias: 30,
        xp_total_entregado: number,
        por_accion: [{ accion, xp_entregado, eventos, cap_aplicado_top }],
        usuarios_activos: number,
        distribucion_nivel: [{ nivel, usuarios }],
        caps: { cap_progresion_veces: number, cap_global_veces: number },
        alertas: [{ tipo, detalle }]   // p.ej. nivel_max > nivel derivado
      }
    }

`?tipo=leaderboard` (ya existente en `api/usuarios.js`) se reusa para el leaderboard del panel. Cero endpoints nuevos (8/8, ADR-001).

---

## 10. UI/UX

1. **Toast con desglose de XP + barra de progreso.** Al acreditar XP, el toast muestra el desglose (base, x nivel, clase/Casa, cap si aplica, bonus) y la barra de progreso al siguiente nivel usando `niveles-data.js` (`min` actual y `min` siguiente). Si `cap_aplicado !== 'ninguno'`, el toast lo indica ("cap de progresion aplicado") para que el numero recortado sea explicable. **Deduplicacion obligatoria (Enmienda 1):** en TODAS las acciones de XP, suprimir el toast local si la respuesta del servidor ya trae `xp_detalle` (el servidor es la unica fuente del toast de XP); evita el doble toast registrado en `NEXT.md:246`.
2. **UI informativa de enfriamiento/cupo.** Cooldown restante y cupo restante del dia por accion capada: visitas (30/dia), `ao_proponer` (3/dia), `ao_checkin` (cooldown 90 s, 30/dia), `plan_crear` (3/dia), `plan_unirse` (5/dia), chat (10 XP/dia), compartir (50 XP/24h). La UI SOLO informa; la verdad la aplica el backend (nunca bloqueo client-side).
3. **Panel admin "Salud de la Red" + leaderboard.** Tab nueva en `admin.html` sobre `?recurso=salud_red` (Enmienda 1) + `?tipo=leaderboard` (api/usuarios.js). Estetica bajo el silo del panel existente (ADR-004).
4. **Silo CSS.** Todo estilo nuevo bajo el selector padre de su pagina (ADR-004, Reset de Silo). Iconos como SVG integro o escapes unicode en JS; nunca emoji directo en backend ni fuentes de iconos externas.

---

## 11. Plan de fases y agentes

| Fase | Entregable | Agente | Gate |
|---|---|---|---|
| 0 | Este diseno + ADR-053 | @architect / @architect-review | aprobacion del operador |
| 1 | `031_gamificacion_v6_nivel_scaling.sql` (esquema + repricing) | @sql-security | idempotencia (2 corridas), ASCII, `information_schema` post |
| 2 | Backend: punto unico + `XP_BASES` + ledger + caps + bases nuevas + repricing de elecciones | @backend-dev | `node --check`, smoke de formulas |
| 3 | Admin: `?recurso=salud_red` + verificar `consumibles_editar` | @admin-dev | smoke de la rama + degradacion 42P01 |
| 4 | Frontend: 7+ espejos (incluye `admin.html:7362`) + textos + toast/barra + enfriamiento/cupo | @frontend-tpl + @js-silo-dev | `smoke_niveles_espejos.js` + balance de divs |
| 5 | Renderer: verificar ausencia de espejos de XP en `pagina-destino.js` | @renderer-dev | reporte (ADR-006) |
| 6 | Escudo GOLD + QA end-to-end | @qa-auditor | 5 latidos + smokes de la seccion 12 |
| 7 | Docs: ADR-053, spec, `README.md` de specs, TASKS/NEXT, BUGS si aparece algo | @docs-keeper | sincronizacion de indices |

Escalado obligatorio: SQL critico (RLS, claves, integridad) -> `sql-security` PRO. Ruta gratuita permitida en fases mecanicas (smokes, docs) segun ADR-048.

---

## 12. Verificacion (Escudo GOLD + smokes)

1. `node --check` de `api/interacciones.js`, `api/usuarios.js`, `api/admin.js`, `usuario-session.js`, `niveles-data.js`.
2. ASCII-safety: 0 bytes > 127 y 0 backticks en los archivos de `api/*.js` tocados y en el `.sql` de la 031. (En este `.md` y en ADR-053: ASCII estricto.)
3. Balance de `<div>` y cierre de comentarios en `index.html`, `comunidad.html`, `mi-perfil.html`, `admin.html`.
4. Latidos GOLD en consola: INFO / DEBUG (version) / LINK (CSS) / TRACE (mapeo cuantitativo) / TIME (sincronia).
5. `scripts/smoke_niveles_espejos.js`: los **7+ espejos** coinciden con `api/usuarios.js:NIVELES` (20 umbrales) y con `M_nivel`; incluye `admin.html:7362` (`_jugNiveles`) y `BADGES_LOCAL` (`interacciones.js:466`, 20 titulos). **Excluye** `RAMA_TIERS`/`ARBOL_UMBRALES` (falso positivo: comparten 5 valores pero NO son la tabla de 20).
6. Smoke de formulas: `M_nivel(1)=1.0`, `M_nivel(20)=3.0`, cap de progresion en 5.0, cap global en 10.0, cap secuencial (caso `mult_progresion=5.5` + stack 1.1 debe dar 5.5, no 6.05), `red2` half-up, bono rural fuera del cap.
7. Smoke del ledger: invariante `xp_final = ROUND(xp_base * mult_final, 2) + bonos_planos` para 100 filas de muestra **de acciones sin cap en XP**; `compartir`/`chat` se validan con `cap_aplicado = 'accion'`; ningun `xp_final` acreditado carece de fila (cubre los al menos 22 puntos de escritura, incluidos los exentos).
8. Smoke de degradacion: sin la 031 aplicada, el XP se entrega igual y el ledger no rompe (con `console.warn`).
9. Smoke de precios: los 17 consumibles coinciden con la tabla 6.2; si la 027 existe, `precio_xp_base = precio_xp`.
10. Smoke de `nivel_max`: usuario en banda de regresion (1000 XP) conserva la insignia de Nivel 6 via `nivel_visible`; `nivel_max` nunca decrece.
11. Verificacion de `xp_detalle`: `total` coincide con el XP acreditado en `usuarios.xp_total` (delta observado).

---

## 13. Deuda registrada en esta spec

| Deuda | Evidencia | Impacto |
|---|---|---|
| 7+ espejos de umbrales sin verificacion automatica (incluye `admin.html:7362` y `BADGES_LOCAL`) | seccion 4.3 | desfase silencioso servidor/cliente; panel admin con niveles viejos (R-13) |
| ADR-040 incumplido (`niveles-data.js` no es la unica fuente cliente) | solo `mi-perfil.html:929` lo carga | duplicidad |
| Al menos 22 escrituras de `xp_total` sin desglose previo al ledger (incluye `:2586`, `:2729`, `:8444`) | `api/interacciones.js` | imposible auditar/calibrar antes de la 031; TODAS se instrumentan |
| `interacciones.xp_ganado` no versionada y como segundo ledger derivado | patron BUG-021; `:1107`, `:531`, `:1246` | mover bases mueve Origen/fama/vocaciones |
| 027/028 NO aplicadas; columnas de la 027 inexistentes | auditoria de BD | repricing debe escribir `precio_xp` y sobrevivir al orden |
| `api/usuarios.js` y `NIVELES_LOCAL` duplican el catalogo de niveles | `:16-37` / `:412-415` | obliga a sincronizar a mano |
| Titulo 11 con tilde mal ubicada (`Estrat\u00e9ga`) | `api/usuarios.js:27` | texto visible incorrecto |
| 4 literales `+10` fuera del catalogo (`album_foto_autor`) | `:6936`, `:6939`, `:6940`, `:6951`; insert `:6911` | viola Regla de No-Duplicidad; instrumentar solo uno rompe el tope diario |
| Fama vs cofre usan bases distintas en la visita | `:8773` vs `:8766` | inconsistencia economica |
| Techo 42000 sin datos de calibracion; no sostiene la meta N20 en 3-6 meses para el muy activo | 7 usuarios, max 1616.92 | deuda de calibracion; `gamificacion_config` NO recalibra umbrales (R-6) |
| 031 y esta spec sin commitear | `git status`: `?? 031...sql`, `?? spec` | baseline de migraciones desfasado si se aplica en Neon (R-11) |
| Caps denominados en XP se agotan con menos acciones al subir `M_nivel` | `compartir` 50/24h, `chat` 10/dia | UI de cupo restante debe explicarlo (R-12) |
| Textos de costo hardcodeados sin fuente unica | seccion 6.4 | UI miente si no se sincroniza |

---

## 14. Fuera de alcance

- Rising Star Decay y tabla `user_action_decay` (descartados de forma explicita).
- Reescribir XP historico o reconstruir `xp_ledger` hacia atras (ADR-003).
- Persistir `usuarios.nivel`/`badge_actual` (siguen derivados).
- Nuevos endpoints (8/8, ADR-001).
- Cambios en `destinos.tags`, en el modelo de Casas/Clases/Facciones o en la UI de albumes.
- Cambios en los caps existentes de rating, guardado, chat y compartir.
- Aplicar 027/028 (decision separada del operador; solo se documenta el orden).
- Actualizar `docs/superpowers/specs/README.md` (fase 7, @docs-keeper).

---

## 15. Preguntas abiertas para el operador

1. **Redondeo del repricing:** multiplo de 10 (propuesto: 720/960/1040/1120/1280/1440/1600) o entero exacto (720/960/1040/...)? El multiplo de 10 es mas legible en la UI; el exacto no introduce sesgo de +5% en precios bajos.
2. **`spot_atributos`:** que evento exacto lo dispara (completar que campos de la ficha? todos? un minimo de N campos?) y donde vive su instrumentacion (admin al publicar/editar, o `publicar-lugar.js`). **RESUELTO (Enmienda 1, Q6):** `spot_atributos` +10 con `M_nivel`; la definicion funcional exacta queda DIFERIDA a la fase de backend y no toca la 031.
3. **`ao_proponer` cap 3/dia con XP:** los envios 4+ del dia se bloquean o se aceptan sin XP? (hoy no acredita nada, el cap es nuevo).
4. **Recambio de Clase en `mi-perfil.html`:** el texto de 300 XP no se localizo en el archivo real. Confirmar si la UI de Clase muestra el costo desde el API (entonces el repricing es solo backend) o si existe un texto hardcodeado en otra pagina.
5. **Migracion 027/028:** se aplican en esta ventana (y en que orden respecto de la 031/deploy) o quedan pendientes y la 031 debe dejar el re-seed documentado? **RESUELTO (Enmienda 1, Q5):** la 031 queda SIN aplicar y SIN commitear en esta ventana; 027/028 se quedan fuera.
6. **Cache de `gamificacion_config`:** se acepta 1 SELECT extra por acreditacion (propuesto) o se exige cache en memoria con TTL desde ya?
7. **Retencion de `xp_ledger`:** hay politica de purga/agregacion (p. ej. mantener 24 meses de detalle) o crece indefinidamente?
8. **Alcance del toast/barra:** aplica a TODAS las acciones de XP o solo a las de mapa (visitas, resenas, fotos, planes) para no saturar de toasts la navegacion? **RESUELTO (Enmienda 1, Q12):** aplica a TODAS las acciones de XP, con deduplicacion obligatoria (suprimir el toast local si la respuesta del servidor trae `xp_detalle`).
9. **Techo 42000:** se mantiene por decreto aun sin datos (recomendado) o se acepta bajarlo a 38000 mientras la poblacion crece? **RESUELTO (Enmienda 1, Q11):** se mantiene 42000 por decreto (decision del operador); se agrega meta de ritmo N20 en 3-6 meses y se documenta la diferencia como deuda de calibracion.

---

## 16. Enmienda 1 (2026-09-21) -- segunda opinion

**Motivo.** `@architect-review` dictamino **APROBADO CON CAMBIOS** con 4 hallazgos ALTO. Esta seccion corrige la spec con el archivo real (ADR-006) y con las decisiones del operador. Donde haya contradiccion entre esta seccion y el cuerpo anterior, **PREVALECE esta seccion 16**. NO se borra el historial. Sigue siendo Fase 1: SOLO documentacion (no codigo, no SQL).

**Correcciones factuales (baseline = archivo real).**

1. **Router de `api/admin.js` = `?recurso=`, NO `?tipo=`** (`admin.js:132`, `:330-333`, `:514-517`); el gate Bearer es `auth()` en `:28-31`, aplicado en `:331`. La rama nueva es **`GET /api/admin?recurso=salud_red`**. NO se agrega un despachador global `?tipo=` (Q1).
2. **Espejos de umbrales: 7+, no 6.** Se suman `admin.html:7362` (`_jugNiveles`) y `api/interacciones.js:466` (`BADGES_LOCAL`, 20 titulos). Smoke `scripts/smoke_niveles_espejos.js` (Q3).
3. **Puntos de escritura de `xp_total`: al menos 22, no 19** (`:2586`, `:2729`, `:8444` eran multilinea). TODOS se instrumentan en el ledger (los exentos con `es_exento = true`).
4. **`media_compartidos.xp_ganado` guarda el XP FINAL, no la BASE** (`:8310`); la afirmacion "guarda la base" vale solo para `interacciones`. El tope de compartir (50 XP/24h) se agota con MENOS acciones (R-12).
5. **`album_foto_autor` son 4 literales `+10`** (`:6936`, `:6939`, `:6940`, `:6951`; insert `:6911` con base 15): rutear los 4 o declarar la accion EXENTA con constante unica.
6. **No hay `require` cruzado entre funciones serverless** (`admin.js:56-59`): `NIVELES_LOCAL` se mantiene como espejo + smoke comparador. Opcion futura (no ahora): mover la tabla a `lib/`.

**Cambios de diseno.**

7. **`mult_stack` = TODO el stack menos `M_nivel`** (`mult_clase * factor_casa * amuleto * lider`); `m_nivel * mult_stack` = producto crudo, `mult_final` = efectivo post-caps, `cap_aplicado` explica el recorte. Ledger reconstruible sin cambiar las 13 columnas.
8. **`M_nivel` usa el nivel DERIVADO de `xp_total`**, NO `nivel_visible`/`nivel_max` (Q2): se preserva el de-nivel de ADR-018; `nivel_max` solo protege la insignia.
9. **Sin piso 1.0 en el cap global:** el rango `[0.85, 10.0]` se preserva; el x0.85 es `factorCasa` de Casa dominante (ADR-038), no una regresion de `M_nivel`.
10. **Invariante del ledger** valido para acciones sin cap en XP; `compartir`/`chat` registran `cap_aplicado = 'accion'` (CHECK ampliado por `sql-security`, multiplicadores a `numeric(10,6)`).
11. **Meta de ritmo:** N20 en **3-6 meses de uso activo**; 42000 podria alcanzarse antes para el muy activo -> deuda de calibracion (NO se cambia el techo).
12. **Doble toast:** deduplicar (suprimir el toast local si la respuesta trae `xp_detalle`; riesgo en `NEXT.md:246`).
13. **R-6 reescrito:** `gamificacion_config` solo parametriza CAPS, no umbrales; NO recalibra la curva 42000. Deuda aceptada, se recalibra con deploy (Q4).

**Riesgos nuevos.** R-11 (ALTO, 031/spec sin commitear; el commit es decision del operador), R-12 (MEDIO, caps en XP se agotan con menos acciones), R-13 (MEDIO, `admin.html:_jugNiveles` fuera del smoke). Falso positivo a EVITAR: `RAMA_TIERS`/`ARBOL_UMBRALES` (`interacciones.js:554`, `mi-perfil.html:3387`, `perfil.html:655`) NO son espejos de la tabla de 20.

**Estado de la enmienda:** APROBADO CON CAMBIOS incorporados (2026-09-21). Fase 1: SOLO documentacion; no se toco codigo ni SQL.

---

hacer las preguntas necesarias para completar la tarea de la mejor forma posible.
