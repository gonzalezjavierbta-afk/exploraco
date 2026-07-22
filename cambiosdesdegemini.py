import os

# Configuración de rutas
api_file = "api/pagina-destino.js"

if not os.path.exists(api_file):
    print(f"[FAIL] No se encontró {api_file}")
    exit()

with open(api_file, "r", encoding="utf-8") as f:
    content = f.read()

print("[...] Iniciando reemplazo resiliente por anclajes (v17)...")

# 1. FIX DE FAUNA (Aseguramos que esté aplicado)
old_fauna = "var faunaFlora     = tags.fauna_flora  || '';"
new_fauna = "var faunaFlora = (typeof tags.fauna_flora === 'string' && tags.fauna_flora.startsWith('[')) ? JSON.parse(tags.fauna_flora) : (tags.fauna_flora || []);"
content = content.replace(old_fauna, new_fauna)

# 2. FIX DE SECRETOS (Método de recorte por anclaje)
# Buscamos los puntos de inicio y fin confirmados en tu análisis de líneas
start_anchor = "if (cat === 'sitio' && secretos) {"
# El bloque original termina después de mostrar el párrafo de texto simple
end_anchor = "'+esc(secretos)+'</p>')"

if start_anchor in content and end_anchor in content:
    # Definimos la nueva lógica híbrida v9 (ASCII-safe)
    # Nota: Usamos \\u para que en el JS final quede \u (estrella \u2605 y check \u2713)
    new_logic = """if (cat === 'sitio' && secretos) {
        let sData = (typeof secretos === 'string' && secretos.trim().startsWith('[')) ? JSON.parse(secretos) : secretos;
        secSecretos = '<section class="ssec bwarm" id="secretos"><div class="sin"><div class="strow"><div class="sgl"></div><h2 class="stitle bc">Lo que nadie te dice</h2><div class="stnum">8</div></div>';
        
        if (Array.isArray(sData)) {
            // Renderizado visual v9 (Tip Cards) - Referente Tayrona
            secSecretos += '<div class="tips-grid">' + sData.map(function(t){
                return '<div class="tip-card"><div class="tip-icon">'+esc(t.icono || '\\u2605')+'</div><div class="tip-body"><div class="tip-title">'+esc(t.titulo)+'</div><div class="tip-text">'+esc(t.texto)+'</div><span class="tip-tag tip-'+esc(t.tag_color || 'gold')+'">'+esc(t.tag || 'Tip')+'</span></div></div>';
            }).join('') + '</div>';
        } else {
            // Fallback para texto plano antiguo (Evita Error 500)
            var sList = sData.split(/[.\\n]/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 5; });
            secSecretos += '<div style="display:flex;flex-direction:column;gap:8px">' + sList.map(function(s){
                return '<div class="hbox"><span class="hbico">\\\\u2713</span><p class="hbtx">'+esc(s)+'</p></div>';
            }).join('') + '</div>';
        }
        secSecretos += '</div></section>';
    }"""

    # Localizamos los índices para el recorte
    start_idx = content.find(start_anchor)
    # Buscamos el primer }; o } que sigue al end_anchor para cerrar el bloque
    remaining_content = content[content.find(end_anchor):]
    close_idx = remaining_content.find("}") + 1
    end_idx = content.find(end_anchor) + close_idx

    # Realizamos la sustitución del bloque completo
    new_content = content[:start_idx] + new_logic + content[end_idx:]
    
    with open(api_file, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("[OK] Bloque de Secretos actualizado exitosamente.")
else:
    print("[FAIL] No se pudieron localizar los anclajes de Secretos.")

print("[FIN] Sube el archivo y verifica la carga de Monserrate.")