import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Outfit } from 'next/font/google';
import './globals.css';

// Tipografia del repo: 'Outfit' (cuerpo) y 'Barlow Condensed' (display)
// (_premium.css:5-6, _motor.css:1). next/font las descarga en BUILD y las
// auto-hospeda: cero dependencia de Google Fonts en runtime (ADR-114 D5).
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-barlow',
  display: 'swap',
});

// Gate @seo-dev 2026-11-02 (ADR-115 D2): metadatos aprobados, no provisionales.
// Paridad literal con index.html:8-28 (title canonico, 3 descriptions y OG).
// Binarios en absoluto a latawel.com (ADR-114 D12): prohibido duplicar assets.
// El canonical es POR RUTA: cada app/<ruta>/page.tsx declara el suyo via
// alternates.canonical (incluido /sobre.html en la tarea 8); el layout no lo fija.
export const metadata: Metadata = {
  metadataBase: new URL('https://latawel.com'),
  title: 'LATAWEL \u2013 Descubre Colombia',
  description:
    'Plataforma de turismo interactivo de Colombia: explora hostales, gastronom\u00eda, lugares naturales y eventos culturales en 32 ciudades. Filtra y planea tu viaje.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  manifest: 'https://latawel.com/manifest.json',
  icons: {
    icon: [
      { url: 'https://latawel.com/assets/brand/favicon/favicon.ico' },
      {
        url: 'https://latawel.com/assets/brand/favicon/favicon-32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: 'https://latawel.com/assets/brand/favicon/favicon-16.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: 'https://latawel.com/assets/brand/favicon/favicon-180.png',
        sizes: '180x180',
      },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'LATAWEL',
    title: 'LATAWEL \u2014 Plataforma de turismo interactivo',
    description:
      'Plataforma de turismo interactivo de Colombia: 80 hostales, restaurantes, lugares naturales y eventos culturales. Filtra por categor\u00eda y planifica tu viaje.',
    url: '/',
    images: [
      {
        url: 'https://latawel.com/assets/brand/og/latawel-og-1200x630.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LATAWEL \u2014 Plataforma de turismo interactivo',
    description:
      'Plataforma de turismo interactivo de Colombia: 80 hostales, restaurantes, lugares naturales y eventos culturales en un solo mapa.',
    images: ['https://latawel.com/assets/brand/og/latawel-og-1200x630.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#FF4A00',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${outfit.variable} ${barlow.variable}`}>
      <body className="bg-warm font-body text-ink antialiased">{children}</body>
    </html>
  );
}
