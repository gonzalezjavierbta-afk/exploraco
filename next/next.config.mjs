/** @type {import('next').NextConfig} */
const nextConfig = {
  // ADR-114 D2: SSG puro. El sitio se sirve estatico, sin runtime de servidor.
  output: 'export',
  // ADR-114 D4: URLs sin barra final, para preservar rutas tipo /sobre.html
  // emitidas como archivos .html en out/.
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // Aisla el root del build en next/: el repo raiz tiene su propio lockfile y
  // no queremos que Next resuelva modulos contra la raiz (ADR-114 D2).
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
