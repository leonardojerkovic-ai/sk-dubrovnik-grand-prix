import { supabase } from '../../lib/supabaseClient';

export const revalidate = 30;

const CATEGORY_ORDER = ['Akademija', 'U12', 'U16', 'U20', 'U1800', 'S50', 'S65'];

export default async function PoredakPage() {
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('full_name', { ascending: true });

  const { data: ratings } = await supabase
    .from('player_ratings')
    .select('*')
    .order('effective_month', { ascending: false });

  // najnoviji rejting po igraču
  const latestRating = {};
  (ratings || []).forEach((r) => {
    if (!latestRating[r.player_id]) latestRating[r.player_id] = r;
  });

  // grupiraj igrače po kategoriji
  const byCategory = {};
  (players || []).forEach((p) => {
    const cat = p.category || 'Ostalo';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  });

  const categories = CATEGORY_ORDER.filter((c) => byCategory[c]);
  Object.keys(byCategory).forEach((c) => {
    if (!categories.includes(c)) categories.push(c);
  });

  return (
    <>
      <header className="top">
        <div className="top-inner">
          <a href="/" className="brand">
            <img className="mark" src="/logo.png" alt="ŠK Dubrovnik" />
            ŠK Dubrovnik Grand Prix
          </a>
          <nav className="primary">
            <a href="/">Home</a>
            <a href="/turniri">Turniri</a>
            <a href="/poredak" className="active">Poredak</a>
            <a href="/uclani-se">Učlani se</a>
          </nav>
        </div>
      </header>

      <div className="layout" style={{ gridTemplateColumns: '1fr' }}>
        <main>
          <h2>Poredak igrača</h2>

          {categories.length === 0 && (
            <p style={{ color: 'var(--ink-soft)' }}>Još nema unesenih igrača.</p>
          )}

          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: 36 }}>
              <h3 style={{ color: 'var(--red)', fontSize: '1.1rem', marginBottom: 12 }}>
                {cat}
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--navy)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 6px' }}>Igrač</th>
                      <th style={{ padding: '8px 6px' }}>Klub</th>
                      <th style={{ padding: '8px 6px' }}>Std</th>
                      <th style={{ padding: '8px 6px' }}>Rapid</th>
                      <th style={{ padding: '8px 6px' }}>Blitz</th>
                      <th style={{ padding: '8px 6px' }}>Opći GP</th>
                      <th style={{ padding: '8px 6px' }}>Kat. GP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCategory[cat]
                      .sort((a, b) => (b.category_gp_points || 0) - (a.category_gp_points || 0))
                      .map((p) => {
                        const r = latestRating[p.id];
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid #d3e2ec' }}>
                            <td style={{ padding: '8px 6px' }}>
                              {p.title ? `${p.title} ` : ''}{p.full_name}
                              {!p.is_member && (
                                <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem' }}> (gost)</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 6px' }}>{p.club}</td>
                            <td style={{ padding: '8px 6px' }}>{r?.fide_standard ?? '—'}</td>
                            <td style={{ padding: '8px 6px' }}>{r?.fide_rapid ?? '—'}</td>
                            <td style={{ padding: '8px 6px' }}>{r?.fide_blitz ?? '—'}</td>
                            <td style={{ padding: '8px 6px' }}>{p.general_gp_points ?? 0}</td>
                            <td style={{ padding: '8px 6px' }}>{p.category_gp_points ?? 0}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </main>
      </div>

      <footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix</footer>
    </>
  );
}
