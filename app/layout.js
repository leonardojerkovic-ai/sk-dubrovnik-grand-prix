import './globals.css';

export const metadata = {
  metadataBase: new URL('https://skdubrovnik.hr'),
  title: { default: 'ŠK Dubrovnik Grand Prix', template: '%s | ŠK Dubrovnik' },
  description: 'Službeni javni portal Šahovskog kluba Dubrovnik — turniri, prijave, ljestvice, rezultati i vijesti.',
  keywords: ['ŠK Dubrovnik', 'Dubrovnik Grand Prix', 'šah', 'šah Dubrovnik', 'turniri Dubrovnik'],
  openGraph: { title: 'ŠK Dubrovnik Grand Prix', description: 'Turniri, prijave, ljestvice, rezultati i vijesti ŠK Dubrovnik.', type: 'website', locale: 'hr_HR' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return <html lang="hr"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" /></head><body>{children}</body></html>;
}
