import Link from 'next/link';
import PublicHeader from '../components/PublicHeader';
import { supabase } from '../../lib/supabaseClient';

export const revalidate = 30;

const CATEGORY_ORDER = ['Akademija', 'U12', 'U16', 'U20', 'U1800', 'S50', 'S65', 'Žene'];

export default async function PoredakPage() {
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .order('full_name', { ascending: true });

  const { data: ratings } = await supabase
    .from('player_ratings')
    .select('*')
    .order('effective_month', { ascending: false });

  const latestRating = {};
  (ratings || []).forEach((r) => {
    if (!latestRating[r.player_id]) latestRating[r.player_id] = r;
  });

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
    <main>
      <PublicHeader active="/poredak" />
      <section className="public-page-hero">
        <div>
          <span className="eyebrow">GRAND PRIX RANKINGS</span>
          <h1>Ljestvice</h1>
          <p>Trenutačni poredak igrača uz povijesne presjeke nakon završenih turnira.</p>
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <div><span className="eyebrow">TRENUTAČNO STANJE</span><h2>Poredak igrača</h2></div>
          <Link href="/poredak/povijest">Povijest ljestvica →</Link>
        </div>

        {playersError ? (
          <div className="public-state public-state-error">Ljestvice trenutačno nisu dostupne.</div>
        ) : categories.length === 0 ? (
          <div className="public-state">Još nema unesenih igrača.</div>
        ) : (
          categories.map((cat) => (
            <section className="public-panel" key={cat} style={{ marginBottom: 20 }}>
              <div className="section-heading"><span className="eyebrow">KATEGORIJA</span><h2>{cat}</h2></div>
              <div className="public-table-wrap">
                <table className="public-table">
                  <thead><tr><th>Igrač</th><th>Klub</th><th>Std</th><th>Rapid</th><th>Blitz</th><th>Opći GP</th><th>Kat. GP</th></tr></thead>
                  <tbody>
                    {byCategory[cat]
                      .sort((a, b) => Number(b.category_gp_points || 0) - Number(a.category_gp_points || 0))
                      .map((p) => {
                        const r = latestRating[p.id];
                        return (
                          <tr key={p.id}>
                            <td><Link href={`/igraci/${p.id}`}>{p.title ? `${p.title} ` : ''}{p.full_name}</Link>{!p.is_member && <span> (gost)</span>}</td>
                            <td>{p.club || '—'}</td>
                            <td>{r?.fide_standard ?? '—'}</td>
                            <td>{r?.fide_rapid ?? '—'}</td>
                            <td>{r?.fide_blitz ?? '—'}</td>
                            <td>{Number(p.general_gp_points ?? 0)}</td>
                            <td>{Number(p.category_gp_points ?? 0)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </section>
      <footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix · Ljestvice</footer>
    </main>
  );
}
