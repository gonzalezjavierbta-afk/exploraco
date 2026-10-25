---
name: gold-shield
description: Ejecuta el Escudo GOLD: sintaxis (node --check), ASCII-safety y balance de divs. Usalo al desplegar api/*.js, admin.html o pagina-destino.js.
---

# Gold Shield

Ejecuta las 3 verificaciones obligatorias antes de cada entrega.

## Verificaciones

### 1. Sintaxis
```bash
node --check <archivo>
```
Resultado: PASS/FAIL + mensaje de error si falla

### 2. ASCII-safety (solo api/*.js)
Verificar 3 conteos que deben dar 0:
- Bytes > 127 (caracteres no-ASCII)
- Dobles escapes `\\u` (bug de doble escape)
- Backticks (prohibidos en CommonJS estricto)

Script de verificación:
```bash
node -e "const fs=require('fs'); const c=fs.readFileSync('<archivo>','utf8'); let b=0,d=0,tk=0; for(let i=0;i<c.length;i++){if(c.charCodeAt(i)>127)b++; if(c[i]==='\\'&&c[i+1]==='\\'&&c[i+2]==='u')d++; if(c[i]==='`')tk++;} console.log('ASCII:',b,'DobleEscape:',d,'Backticks:',tk);"
```
Resultado: 0/0/0 = PASS

### 3. Balance de divs (solo admin.html)
Verificar `<div` vs `</div>` por zona:
- Aislar cada zona por categoría (especifico-sitio, especifico-hostal, etc.)
- Contar aperturas y cierres
- Diferencia debe ser 0

Script de verificación:
```bash
node -e "const fs=require('fs'); const h=fs.readFileSync('admin.html','utf8'); const o=(h.match(/<div/g)||[]).length; const c=(h.match(/<\/div/g)||[]).length; console.log('Abiertos:',o,'Cerrados:',c,'Diff:',o-c);"
```
Resultado: diferencia 0 = PASS

### 4. Smoke test (si existe)
```bash
node scripts/smoke_test_<slug>.js
```
Resultado: todos los checks PASS + balance de divs

### 5. Lista cerrada de subcategorias de sitio (guard, bloqueante)

Una copia desincronizada de la lista cerrada de subcategorias de sitio es
BLOQUEANTE de despliegue. El argumento (por que son 10 copias) vive en
`DECISIONS.md` ADR-101; aqui solo el comando.

```bash
node scripts/gold_shield.js
```
Ejecuta `scripts/express_check.js` (sintaxis + ASCII-safety + balance de divs)
y despues el guard `scripts/verificar-subcategorias.js`. Exit 0 = limpio;
exit 1 = bloqueante (FAIL nuevo en express_check o desincronizacion de la lista).
Solo el guard: `node scripts/gold_shield.js --sin-express`.

## Reporte estructurado

```
## Escudo GOLD - <archivo>

| Verificación | Resultado | Evidencia |
|--------------|-----------|-----------|
| Sintaxis     | PASS/FAIL | node --check output |
| ASCII-safety | PASS/FAIL | 0/0/0 |
| Balance divs | PASS/FAIL | X/Y diff=Z |
| Smoke test   | PASS/FAIL | N/N checks |
| Subcategorias| PASS/FAIL | 10/10 copias |

**Veredicto:** LIMPIO / BLOQUEANTE / RECOMENDACIÓN
```

## Clasificación

- **LIMPIO:** todas las verificaciones PASS → listo para entregar
- **BLOQUEANTE:** cualquier verificación FAIL → NO entregar, corregir primero
- **RECOMENDACIÓN:** PASS con hallazgos menores → entregar con nota

## Uso

Invocado automáticamente desde:
- `content-loader` después de generar los archivos
- `create-dynamic-page` en el paso 6
- Cualquier agente que modifique api/*.js, admin.html, etc.

O invocado directamente:
```
/gold-shield api/destinos.js
```