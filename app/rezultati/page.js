import { supabase } from '../../lib/supabaseClient';

export const revalidate = 30;

function formatDate(value) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('hr-HR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function resultLabel(row) {
  const score = row.score == null ? '—' : Number(row.score).toFixed(1);
  return `${score} bod.`;
}

function ResultTable({ rows }) {
  if (!rows.length) return <div className="results-empty">Rezultati još nisu objavljeni.</div>;
  return (
    <div className="results-table-wrap">
      <table className="ranking-table results-table">
        <thead><tr><th>#</th><th>Igrač</th><th>Rezultat</th><th>Pobjede</th><th>Remiji</th><th>Porazi</th><th>GP bodovi</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.final_rank ?? '—'}</td>
              <td><span className="player-name">{row.players?.full_name || 'Nepoznat igrač'}</span></td>
              <td>{resultLabel(row)}</td>
              <td>{row.wins ?? 0}</td>
              <td>{row.draws ?? 0}</td>
              <td>{row.losses ?? 0}</td>
              <td className="points">{Number(row.points_awarded || 0).toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ResultsPage({ searchParams }) {
  const requestedId = searchParams?.turnir;
  const { data: tournaments, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id,name,starts_at,location,status,published,event_stage')
    .eq('published', true)
    .eq('status', 'zavrsen')
    .order('starts_at', { ascending: false });

  const publicTournaments = (tournaments || []).filter((t) => t.event_stage !== 'FINAL' || t.event_stage === 'FINAL');
  const selected = publicTournaments.find((t) => String(t.id) === String(requestedId)) || publicTournaments[0];

  let results = [];
  let resultsError = null;
  if (selected) {
    const response = await supabase
      .from('tournament_results')
      .select('id,player_id,final_rank,score,games_played,wins,draws,losses,rating_used,points_awarded,players(full_name)')
      .eq('tournament_id', selected.id)
      .order('final_rank', { ascending: true, nullsFirst: false });
    results = response.data || [];
    resultsError = response.error;
  }

  return (
    <>
      <div className="board-row" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</div>
      <header className="top">
        <div className="top-inner">
          <a href="/" className="brand">ŠK Dubrovnik Grand Prix</a>
          <nav className="primary" aria-label="Glavna navigacija">
            <a href="/">Naslovnica</a><a href="/turniri">Turniri</a><a href="/dgp">DGP poredak</a><a href="/rezultati" className="active">Rezultati</a><a href="/poredak">Igrači</a>
          </nav>
        </div>
      </header>
      <section className="tournaments-hero">
        <div className="tournaments-hero-inner">
          <span className="eyebrow">Službeni rezultati</span>
          <h1>Rezultati turnira</h1>
          <p>Objavljeni rezultati završених turnira ŠK Dubrovnik, uključujući plasmane i dodijeljene GP bodove.</p>
        </div>
      </section>
      <main className="tournaments-main">
        {tournamentError ? (
          <div className="tournament-empty" role="alert">Rezultati trenutačno nisu dostupni. Pokušajte ponovno za nekoliko trenutaka.</div>
        ) : !selected ? (
          <div className="tournament-empty">Još nema objavljenih rezultata.</div>
        ) : (
          <>
            <section className="detail-card results-header-card">
              <span className="section-kicker">Turnir</span>
              <h2>{selected.name}</h2>
              <p>{formatDate(selected.starts_at)}{selected.location ? ` · ${selected.location}` : ''}</p>
              <div className="results-switcher" aria-label="Odabir turnira">
                {publicTournaments.map((tournament) => <a key={tournament.id} className={tournament.id === selected.id ? 'active' : ''} href={`/rezultati?turnir=${tournament.id}`}>{tournament.name}</a>)}
              </div>
            </section>
            <section className="detail-card">
              <span className="section-kicker">Konačni poredak</span>
              <h2>Plasman i bodovi</h2>
              {resultsError ? <div className="results-empty" role="alert">Rezultati trenutačno nisu dostupni.</div> : <ResultTable rows={results} />}
            </section>
          </>
        )}
      </main>
      <footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix · Službeni rezultati</footer>
    </>
  );
}
