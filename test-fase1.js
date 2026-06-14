// test-fase1.js
// Ejecutar en Node.js: node test-fase1.js
// O pegar en la consola del navegador en exploraco.vercel.app
// Verifica los 3 endpoints de la Fase 1

const BASE = 'https://exploraco.vercel.app';
const SECRET = 'exploraco12345';

async function test(nombre, fn) {
  process.stdout && process.stdout.write(`  ${nombre}... `);
  try {
    const result = await fn();
    console.log(`✅ ${result}`);
    return true;
  } catch(e) {
    console.log(`❌ ${e.message}`);
    return false;
  }
}

async function run() {
  console.log('\n🧪 ExploraCO — Test Fase 1\n');
  let ok = 0, total = 0;

  // ── 1. publicar-lugar ─────────────────────────────────────────
  console.log('📋 POST /api/publicar-lugar');
  let nuevoSlug = null;

  total++;
  if (await test('Campos faltantes → 400', async () => {
    const r = await fetch(`${BASE}/api/publicar-lugar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Test' })
    });
    if (r.status !== 400) throw new Error(`Esperaba 400, recibí ${r.status}`);
    return 'devuelve 400 correctamente';
  })) ok++;

  total++;
  if (await test('Publicar lugar de prueba → 200', async () => {
    const r = await fetch(`${BASE}/api/publicar-lugar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'TEST Hostal Verificación',
        categoria: 'hostal',
        ciudad: 'Bogotá',
        descripcion_corta: 'Lugar de prueba para verificar el sistema de publicación automática',
        whatsapp: '573000000000',
        departamento: 'Cundinamarca',
        foto_principal: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
        precio_desde: '45000',
      })
    });
    const data = await r.json();
    if (!r.ok || !data.ok) throw new Error(data.error || data.detalle || `Status ${r.status}`);
    nuevoSlug = data.slug;
    return `slug=${data.slug}`;
  })) ok++;

  // ── 2. moderar-destinos ───────────────────────────────────────
  console.log('\n🔔 GET+POST /api/moderar-destinos');

  total++;
  if (await test('Sin auth → 401', async () => {
    const r = await fetch(`${BASE}/api/moderar-destinos?status=pending`);
    if (r.status !== 401) throw new Error(`Esperaba 401, recibí ${r.status}`);
    return 'devuelve 401 sin Bearer';
  })) ok++;

  total++;
  if (await test('Listar pendientes → 200', async () => {
    const r = await fetch(`${BASE}/api/moderar-destinos?status=pending&limit=5`, {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    });
    const data = await r.json();
    if (!data.ok) throw new Error(data.error);
    return `${data.total} pendiente(s)`;
  })) ok++;

  let idParaAprobar = null;
  total++;
  if (await test('El test anterior quedó en pending', async () => {
    const r = await fetch(`${BASE}/api/moderar-destinos?status=pending&limit=50`, {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    });
    const data = await r.json();
    if (!data.ok) throw new Error(data.error);
    const found = data.items.find(i => i.slug === nuevoSlug || i.nombre === 'TEST Hostal Verificación');
    if (!found && nuevoSlug) throw new Error(`Slug ${nuevoSlug} no aparece en pendientes`);
    if (found) idParaAprobar = found.id;
    return found ? `encontrado id=${found.id}` : 'no hay datos de publicar aún (puede tardar)';
  })) ok++;

  if (idParaAprobar) {
    total++;
    if (await test('Aprobar el lugar de prueba → published', async () => {
      const r = await fetch(`${BASE}/api/moderar-destinos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SECRET}`
        },
        body: JSON.stringify({ id: idParaAprobar, accion: 'aprobar' })
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      return `status=${data.destino.status}, url=${data.url||'—'}`;
    })) ok++;
  }

  // ── 3. pagina-destino ─────────────────────────────────────────
  console.log('\n📄 GET /{slug}.html (rewrite → /api/pagina-destino)');

  total++;
  if (await test('Slug inexistente → 404', async () => {
    const r = await fetch(`${BASE}/slug-que-no-existe-xyz123.html`);
    if (r.status !== 404) throw new Error(`Esperaba 404, recibí ${r.status}`);
    return 'devuelve 404';
  })) ok++;

  total++;
  if (await test('Página existente (hostal-casa-medina) → HTML', async () => {
    const r = await fetch(`${BASE}/hostal-casa-medina.html`);
    const txt = await r.text();
    // Puede ser HTML estático (200) o dinámico (200) — ambos válidos
    if (!r.ok) throw new Error(`Status ${r.status}`);
    if (!txt.includes('<!DOCTYPE') && !txt.includes('<html')) throw new Error('No parece HTML');
    return `${r.status} — ${txt.length} bytes`;
  })) ok++;

  if (nuevoSlug && idParaAprobar) {
    total++;
    if (await test('Página del test creado → 200 con HTML completo', async () => {
      // Esperar un momento para que el cache se invalide
      await new Promise(r => setTimeout(r, 1000));
      const r = await fetch(`${BASE}/${nuevoSlug}.html`);
      const txt = await r.text();
      if (!r.ok) throw new Error(`Status ${r.status} — ${txt.slice(0,200)}`);
      if (!txt.includes('TEST Hostal Verificación')) throw new Error('HTML no contiene el nombre del lugar');
      return `✓ página renderizada (${txt.length} bytes)`;
    })) ok++;

    // Limpiar: rechazar el lugar de prueba
    try {
      await fetch(`${BASE}/api/moderar-destinos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
        body: JSON.stringify({ id: idParaAprobar, accion: 'rechazar' })
      });
      console.log('\n  🧹 Lugar de prueba marcado como rechazado');
    } catch(_) {}
  }

  // ── Resumen ───────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Resultado: ${ok}/${total} tests pasaron`);
  if (ok === total) {
    console.log('🎉 Fase 1 completamente funcional\n');
  } else {
    console.log(`⚠️  ${total-ok} test(s) fallaron — revisar arriba\n`);
  }
}

run().catch(console.error);
