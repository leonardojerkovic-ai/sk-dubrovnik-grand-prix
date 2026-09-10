export default function sitemap() {
  const base = 'https://skdubrovnik.hr';
  return ['/', '/o-nama', '/turniri', '/prijave', '/poredak', '/rezultati', '/vijesti', '/faq', '/kontakt'].map((path) => ({ url: `${base}${path}`, changeFrequency: path === '/' ? 'daily' : 'weekly', priority: path === '/' ? 1 : 0.7 }));
}
