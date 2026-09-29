# DEPLOY 042 - Pasaporte + Billetera + Fotos de perfil (TSK-159 / ADR-069)

Fecha: 2026-09-29. Migracion: `db/migrations/042_pasaporte_billetera_fotos.sql`.

## ORDEN OBLIGATORIO

1. **Aplicar la migracion 042 en Neon ANTES del deploy del backend** (patron BUG-021/BUG-060).
   - Editor SQL de Neon: correr el archivo **COMPLETO** en una sola corrida.
   - Alternativa: `node scripts/apply_sql_file.js db/migrations/042_pasaporte_billetera_fotos.sql`.
   - Es idempotente (ADR-008): re-ejecutar es no-op.
2. Verificar con `node scripts/verify_042_precheck.js` (con `DATABASE_URL`) -> `fecha_nacimiento`, `usuario_fotos`, `billeteras`, `album_fotos.destino_id` e indices en `OK`.
3. Deploy del backend + frontend (Vercel despliega al push de `main`; `vercel.json` sirve `*.js` con `no-store`).

## QUE CREA LA 042

- `usuarios.fecha_nacimiento DATE NULL` (PII owner-only; editable 1 vez).
- `usuario_fotos` (galeria perfil; tope 10 activas atomico; 1 principal activa) + indices.
- `billeteras` (identidad + agregador; `codigo_publico` unico; CHECK estado) + indice.
- `album_fotos.destino_id uuid NULL REFERENCES destinos(id) ON DELETE SET NULL` + indice.

## RIESGOS

- Si el backend se despliega ANTES de la 042: `billetera_mia`/`foto_*` degradan con `responderSchemaPendiente` (503 tipado) y el INSERT de `album_agregar_foto` reintenta sin `destino_id`; el logro `logr_pasaporte_completo` queda en 0 (memo captura 42703). No hay 500, pero las funciones no operan hasta migrar.
- Edad minima 13 es declarativa (solo por fecha declarada); sin verificacion documental.
- El reemplazo de foto de perfil puede dejar blobs huerfanos (Cero Borrado no cubre blobs). Deuda.

## ROLLBACK (emergencia, LOSSY si hay datos)

```sql
DROP TABLE IF EXISTS usuario_fotos;
DROP TABLE IF EXISTS billeteras;
ALTER TABLE usuarios    DROP COLUMN IF EXISTS fecha_nacimiento;
ALTER TABLE album_fotos DROP COLUMN IF EXISTS destino_id;
```

## VERIFICACION POST-DEPLOY

- `GET /api/usuarios?tipo=billetera_mia&usuario_id=<uuid>` con Bearer -> 200 con `pasaporte`, `xp_total`, `cdr_saldo`, `consumibles`, `fotos`, `billetera` (solo si Pasaporte completo).
- `POST /api/usuarios` `tipo=foto_agregar` con URL del prefijo `usuarios/<uid>/...` -> 200; al 11.er intento -> 409 `LIMITE_FOTOS_PERFIL`.
- `POST tipo=perfil_actualizar` con `fecha_nacimiento` dos veces -> 2.a -> 409 `FECHA_NACIMIENTO_BLOQUEADA`.
- Ficha de destino ya visitado: boton "Estuve aqui" con clase `.activo`.
- Mapa: capa base CARTO; con red bloqueada, aviso "No pudimos cargar el mapa base" + Reintentar.
