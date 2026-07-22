import os

# Configuración de rutas ExploraCO
api_file = "api/pagina-destino.js"

if not os.path.exists(api_file):
    print(f"[FAIL] No se encontró {api_file}")
    exit()

with open(api_file, "r", encoding="utf-8") as f:
    content = f.read()

print("[...] Iniciando Sincronización v21 (Rescate de Error 500)...")

# 1. ACTUALIZACIÓN DE LOG (Trazabilidad)
content = content.replace("admin-v10.20260722_v20", "admin-v10.20260722_v21")

# 2. LA LÓGICA MAESTRA (Híbrida y Protegida)
# Nota: Usamos \\u para que en el JS quede \u (estrella \u2605 y check \u2713)
new_logic = """if (cat === 'sitio' && secretos) {
        try {
            var sData = (typeof secretos === 'string' && secretos.trim().startsWith('[')) ? JSON.parse(secretos) : secretos;
            secSecretos = '<section class="ssec bwarm" id="secretos"><div class="sin"><div class="strow"><div class="sgl"></div><h2 class="stitle bc">Lo que nadie te dice</h2><div class="stnum">8</div></div>';
            
            if (Array.isArray(sData)) {
                // RENDERIZADO VISUAL v9 (Referente Tayrona)
                secSecretos += '<div class="tips-grid">' + sData.map(function(t){
                    return '<div class="tip-card"><div class="tip-icon">'+esc(t.icono || '\\u2605')+'</div><div class="tip-body"><div class="tip-title">'+esc(t.titulo)+'</div><div class="tip-text">'+esc(t.texto)+'</div><span class="tip-tag tip-'+esc(t.tag_color || 'gold')+'">'+esc(t.tag || 'Tip')+'</span></div></div>';
                }).join('') + '</div>';
            } else {
                // FALLBACK TEXTO PLANO (Seguro contra Error 500)
                var sList = (typeof sData === 'string') ? sData.split(/[.\\n]/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 5; }) : [];
                secSecretos += '<div style="display:flex;flex-direction:column;gap:8px">' + sList.map(function(s){
                    return '<div class="hbox"><span class="hbico">\\\\u2713</span><p class="hbtx">'+esc(s)+'</p></div>';
                }).join('') + '</div>';
            }
            secSecretos += '</div></section>';
        } catch (err) {
            console.error("ExploraCO_Error_v21:", err.message);
            secSecretos = '<!-- Error en renderizado: ' + err.message + ' -->';
        }
    }"""

# 3. IDENTIFICACIÓN DINÁMICA DEL BLOQUE
# Si ya se aplicó v17/v18, el inicio del bloque tiene el h2 con "Lo que nadie te dice"
new_anchor = "secSecretos = '<section class=\"ssec bwarm\" id=\"secretos\"><div class=\"sin\"><div class=\"strow\"><div class=\"sgl\"></div><h2 class=\"stitle bc\">Lo que nadie te dice</h2>"

if new_anchor in content:
    print("[INFO] Se detectó la versión v17/v18. Aplicando limpieza v21 sobre el bloque nuevo.")
    # Buscamos el inicio del if y el final de la sección
    start_idx = content.find("if (cat === 'sitio' && secretos) {")
    # Buscamos el final del bloque inyectado anteriormente
    end_anchor = "secSecretos += '</div></section>';"
    end_idx = content.find(end_anchor) + len(end_anchor) + 5 # margen para el cierre }
    
    # Reemplazo del bloque completo (nuevo por nuevo corregido)
    final_content = content[:start_idx] + new_logic + content[content.find("}", end_idx)+1:]
    
    with open(api_file, "w", encoding="utf-8") as f:
        f.write(final_content)
    print("[OK] Bloque v21 sincronizado. Sube el archivo.")
else:
    print("[FAIL] No se encontró el bloque esperado. Es posible que el archivo esté corrupto.")
    print("RECOMENDACIÓN: Revierte el archivo api/pagina-destino.js a su estado original y vuelve a empezar.")