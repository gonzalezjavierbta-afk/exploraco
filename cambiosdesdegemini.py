import os

# Configuracion segun Contexto v4
orig = "admin.html"
dest = "admin-v10-dev.html"

if not os.path.exists(orig):
    print(f"[FAIL] No se encontro {orig}")
    exit()

with open(orig, "r", encoding="utf-8") as f:
    content = f.read()

print("[...] Procesando admin.html...")

# 1. Actualizacion de Log de Version para validacion Ruthless
# Buscamos la version v9 para subirla a v10
old_log = 'console.log("✅ ExploraCO Admin admin-v9.20260702 — todo OK");'
new_log = 'console.log("ExploraCO Admin admin-v10.20260722 - todo OK");'
content = content.replace(old_log, new_log)

# 2. FIX CRITICO en savePlace() [Linea 2567]
# Evita que Secretos y Fauna se guarden como texto plano
old_secretos = "p.secretos = collectSitioSecretos ? collectSitioSecretos() : v('f-secretos');"
new_secretos = """// Fix quirurgico: Parsear JSON para evitar texto literal en la web
        let sRaw = v('f-secretos');
        try {
            p.secretos = (sRaw.trim().startsWith('[') || sRaw.trim().startsWith('{')) ? JSON.parse(sRaw) : sRaw;
        } catch(e) { p.secretos = sRaw; }
        
        // Aplicamos la misma logica a fauna_flora si existe en el payload
        let fRaw = v('f-fauna-flora') || '';
        try {
            p.fauna_flora = (fRaw.trim().startsWith('[')) ? JSON.parse(fRaw) : fRaw;
        } catch(e) { p.fauna_flora = fRaw; }"""

if old_secretos in content:
    content = content.replace(old_secretos, new_secretos)
    print("[OK] Logica de serializacion corregida en savePlace.")
else:
    print("[FAIL] No se encontro la linea de asignacion de secretos.")

# 3. Guardar el archivo de desarrollo
with open(dest, "w", encoding="utf-8") as f:
    f.write(content)

print(f"[OK] Archivo {dest} generado exitosamente.")