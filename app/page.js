import { supabase } from '../lib/supabaseClient';

// Server Component - podaci se dohvaćaju na serveru prije slanja HTML-a klijentu,
// isto kao što bi PHP izvršio upit prije nego ispiše stranicu.
export const revalidate = 30; // stranica se osvježava iz baze najviše svakih 30s

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('hr-HR');
}

export default async function HomePage() {
  const { data: news } = await supabase
    .from('news')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(10);

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('starts_at', { ascending: true });

  return (
    <>
      <header className="top">
        <div className="top-inner">
          <a href="/" className="brand">
            {/* Zamijeni /logo.png stvarnim logom kluba (stavi ga u /public) */}
            <img className="mark" src="/logo.png" alt="ŠK Dubrovnik" />
            ŠK Dubrovnik Grand Prix
          </a>
          <nav className="primary">
            <a href="/" className="active">Home</a>
            <a href="/turniri">Turniri</a>
            <a href="/poredak">Poredak</a>
            <a href="/uclani-se">Učlani se</a>
          </nav>
        </div>
      </header>

      <BoardRow />

      <section className="hero">
        <div className="hero-inner">
          <div className="eyebrow">Šahovski klub Dubrovnik</div>
          <h1>ŠK Dubrovnik Grand Prix</h1>
          <p>
            Najave turnira, kalendar natjecanja i poredak igrača ŠK Dubrovnik —
            sve prijave i rezultati na jednom mjestu.
          </p>
          <a href="/turniri" className="cta">Prijavi se na turnir</a>
        </div>
      </section>

      <BoardRow />

      <div className="layout">
        <aside className="sidebar">
          <details open>
            <summary>Turniri</summary>
            <ul>
              <li><a href="/turniri">Najave</a></li>
              <li><a href="/kalendar">Kalendar</a></li>
              <li><a href="/rezultati">Rezultati</a></li>
            </ul>
          </details>
          <details>
            <summary>Klub</summary>
            <ul>
              <li><a href="/o-nama">O nama</a></li>
              <li><a href="/dokumenti">Dokumenti</a></li>
              <li><a href="/kontakt">Kontakt</a></li>
            </ul>
          </details>

          {/* Nadolazeći turniri iz baze, umjesto ručno upisanog teksta */}
          {tournaments && tournaments.length > 0 && (
            <details open>
              <summary>Nadolazeći</summary>
              <ul>
                {tournaments.map((t) => (
                  <li key={t.id}>
                    <a href={`/turniri/${t.id}`}>
                      {t.name}{t.starts_at ? ` — ${formatDate(t.starts_at)}` : ''}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </aside>

        <main>
          <h2>Najave</h2>

          {(!news || news.length === 0) && (
            <p style={{ color: 'var(--ink-soft)' }}>
              Trenutno nema objavljenih vijesti.
            </p>
          )}

          {news && news.map((item) => (
            <article className="news-card" key={item.id}>
              {item.tag && <span className="tag">{item.tag}</span>}
              <h3>{item.title}</h3>
              {item.excerpt && <p>{item.excerpt}</p>}
              <div className="meta">
                {item.format && <span>Format: {item.format}</span>}
                {item.status && <span>Status: {item.status}</span>}
              </div>
            </article>
          ))}
        </main>
      </div>

      <footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix</footer>
    </>
  );
}

function BoardRow() {
  return (
    <div className="board-row">
      {Array.from({ length: 16 }).map((_, i) => (
        <span key={i}></span>
      ))}
    </div>
  );
}
