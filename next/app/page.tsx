import { Button } from '@/components/ui/button';

// Pagina provisional de la raiz: debe emitir out/index.html con el export estatico.
export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <p className="font-display text-xs font-extrabold uppercase tracking-[2px] text-gold">
        andamiaje
      </p>
      <h1 className="mt-2 font-display text-5xl font-black uppercase leading-[0.9] text-ink">
        ExploraCO next
      </h1>
      <p className="mt-4 max-w-prose text-ink/70">
        Sitio estatico en construccion. No hay rutas migradas todavia:
        ver <code className="rounded-xc-sm bg-warm px-1">next/inventario.json</code>.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button className="rounded-xc bg-gold font-display text-sm font-black uppercase tracking-[1px] text-white">
          Boton de prueba
        </Button>
        <a
          className="rounded-xc border border-gold px-4 py-2 font-display text-sm font-bold uppercase tracking-[1px] text-gold"
          href="/404.html"
        >
          Enlace normal sin prefetch
        </a>
      </div>
    </main>
  );
}
