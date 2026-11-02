// Servidor estatico minimo para inspeccionar el resultado de `next build`.
// Sin dependencias y sin runtime de produccion: es solo una herramienta local.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), 'out');
const port = Number(process.env.PORT || 4173);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

if (!existsSync(root)) {
  console.error('No existe out/. Ejecuta "npm run build" primero.');
  process.exit(1);
}

createServer((req, res) => {
  const clean = decodeURIComponent((req.url || '/').split('?')[0]);
  const target = normalize(join(root, clean));
  if (!target.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  const file = existsSync(target) && statSync(target).isFile()
    ? target
    : join(target, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1>');
    return;
  }
  res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`out/ servido en http://localhost:${port}`);
});
