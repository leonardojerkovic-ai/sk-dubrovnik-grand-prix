import { supabase } from '../../lib/supabaseClient';

export const revalidate = 30;

const VIEWS = [
  ['dgp_general_ranking', 'Opći GP'],
  ['dgp_s65_ranking', 'S65'],
  ['dgp_s50_ranking', 'S50'],
  ['dgp_u1800_ranking', 'U1800'],
  ['dgp_u20_ranking', 'U20'],
  ['dgp_u16_ranking', 'U16'],
  ['dgp_u12_ranking', 'U12'],
  ['dgp_women_ranking', 'Žene'],
];

function pointsFor(view, row) {
  return row.general_gp_points
    ?? row[`${view.replace('dgp_', '').replace('_ranking', '')}_total_points`]
    ?? row.category_gp_points
    ?? 0;
}

function resultsFor(row) {
  return row.counted_results
    ?? row.counted_regular_results
    ?? row.counted_s50_results
    ?? row.counted_s65_results
    ?? row.counted_u20_results
    ?? row.counted_u16_results
    ?? row.counted_u12_results
    ?? row.counted_women_results
    ?? 0;
}

function RankingTable({ view, label, data, error }) {
  if (error) {
    return <div className="ranking-empty">Poredak trenutačno nije dostupan.</div>;
  }

  if (!data.length) {
    return <div className="ranking-empty">Još nema evidentiranih rezultata.</div>;
  }

  return (
    <div className="ranking-table-wrap">
      <table className="ranking-table">
        <thead>
          <tr>
            <th className="rank-col">#</th>
            <th>Igrač</th>
            <th className="number-col">Bodovi</th>
            <th className="number-col">Rezultati</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.player_id || `${view}-${index}`}>
              <td className="rank-col">
                <span className={`rank-badge rank-${index + 1}`}>{index + 1}</span>
              </td>
              <td>
                <span className="player-name">{row.full_name || 'Nepoznat igrač'}</span>
              </td>
              <td className="number-col points">{Number(pointsFor(view, row)).toFixed(0)}</td>
              <td className="number-col muted-number">{resultsFor(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DgpPage() {
  const datasets = await Promise.all(
    VIEWS.map(async ([view, label]) => {
      const { data, error } = await supabase.from(view).select('*');
      return { view, label, data: data || [], error };
    }),
  );

  const general = datasets.find((item) => item.view === 'dgp_general_ranking');
  const leader = general?.data?.[0];
  const totalPlayers = general?.data?.length || 0;

  return (
    <>
      <div className="board-row" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => <span key={index} />)}
      </div>

      <header className="top">
        <div className="top-inner">
          <a href="/" className="brand">ŠK Dubrovnik Grand Prix</a>
          <nav className="primary" aria-label="Glavna navigacija">
            <a href="/">Naslovnica</a>
            <a href="/dgp" className="active">DGP poredak</a>
            <a href="/poredak">Igrači</a>
          </nav>
        </div>
      </header>

      <section className="dgp-hero">
        <div className="dgp-hero-inner">
          <div>
            <div className="eyebrow">Sezona 2027 · službeni poredak</div>
            <h1>Dubrovnik Grand Prix</h1>
            <p>Jedno mjesto za opći GP i sve kategorijske ljestvice. Bodovi se računaju automatski prema pravilima sustava.</p>
          </div>
          <div className="season-card">
            <span>Trenutni lider</span>
            <strong>{leader?.full_name || '—'}</strong>
            <b>{leader ? `${Number(pointsFor('dgp_general_ranking', leader)).toFixed(0)} bod.` : 'Nema bodova'}</b>
          </div>
        </div>
      </section>

      <main className="dgp-main">
        <section className="dgp-intro">
          <div>
            <span className="section-kicker">Poredak</span>
            <h2>Grand Prix 2027</h2>
            <p>Pregled plasmana po ljestvicama, s jasno odvojenim općim i posebnim kategorijama.</p>
          </div>
          <div className="player-count">
            <strong>{totalPlayers}</strong>
            <span>igrača u općem poretku</span>
          </div>
        </section>

        <div className="ranking-grid">
          {datasets.map(({ view, label, data, error }) => (
            <section className={`ranking-card ${view === 'dgp_general_ranking' ? 'ranking-card-featured' : ''}`} key={view}>
              <div className="ranking-card-head">
                <div>
                  <span className="ranking-code">{view === 'dgp_general_ranking' ? 'GP' : label}</span>
                  <h3>{label}</h3>
                </div>
                <span className="ranking-count">{data.length} {data.length === 1 ? 'igrač' : 'igrača'}</span>
              </div>
              <RankingTable view={view} label={label} data={data} error={error} />
            </section>
          ))}
        </div>
      </main>

      <footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix · Automatski poredak</footer>
    </>
  );
}
