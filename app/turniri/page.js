import { supabase } from '../../lib/supabaseClient';

export const revalidate = 30;

function formatDate(value) {
  if (!value) return 'Datum nije objavljen';
  return new Date(`${value}T00:00:00`).toLocaleDateString('hr-HR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function statusLabel(status) {
  const labels = {
    najavljen: 'Najavljen',
    prijave_otvorene: 'Prijave otvorene',
    zavrsen: 'Završen',
  };
  return labels[status] || status || 'Najavljen';
}

function isOpen(tournament) {
  return tournament.status === 'prijave_otvorene'
    && (!tournament.registration_deadline || new Date(tournament.registration_deadline) >= new Date());
}

export default async function TournamentsPage() {
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('id,name,description,format,tempo,starts_at,location,status,published,registration_deadline,event_stage')
    .eq('published', true)
    .order('starts_at', { ascending: true });

  const visible = (tournaments || []).filter((t) => t.event_stage !== 'FINAL');
  const upcoming = visible.filter((t) => !t.starts_at || new Date(`${t.starts_at}T23:59:59`) >= new Date());

  return (
    <>
      <div className="board-row" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</div>
      <header className="top">
        <div className="top-inner">
          <a href="/" className="brand">ŠK Dubrovnik Grand Prix</a>
          <nav className="primary" aria-label="Glavna navigacija">
            <a href="/">Naslovnica</a>
            <a href="/turniri" className="active">Turniri</a>
            <a href="/dgp">DGP poredak</a>
            <a href="/poredak">Igrači</a>
          </nav>
        </div>
      </header>

      <section className="tournaments-hero">
        <div className="tournaments-hero-inner">
          <span className="eyebrow">Kalendar natjecanja</span>
          <h1>Najave turnira</h1>
          <p>Pronađite sljedeći turnir ŠK Dubrovnik, pregledajte detalje i prijavite se kada su prijave otvorene.</p>
        </div>
      </section>

      <main className="tournaments-main">
        <div className="tournaments-heading">
          <div>
            <span className="section-kicker">Natjecanja</span>
            <h2>Turniri u kalendaru</h2>
          </div>
          <span className="tournament-total">{visible.length} objavljenih turnira</span>
        </div>

        {error ? (
          <div className="tournament-empty">Turniri trenutačno nisu dostupni.</div>
        ) : upcoming.length === 0 ? (
          <div className="tournament-empty">Trenutačno nema nadolazećih turnira.</div>
        ) : (
          <div className="tournament-grid">
            {upcoming.map((tournament) => (
              <article className="tournament-card" key={tournament.id}>
                <div className="tournament-card-top">
                  <span className={`status-pill ${isOpen(tournament) ? 'status-open' : ''}`}>
                    {isOpen(tournament) ? 'Prijave otvorene' : statusLabel(tournament.status)}
                  </span>
                  <span className="tournament-date">{formatDate(tournament.starts_at)}</span>
                </div>
                <h3>{tournament.name}</h3>
                {tournament.description && <p>{tournament.description}</p>}
                <dl className="tournament-meta">
                  {tournament.location && <div><dt>Lokacija</dt><dd>{tournament.location}</dd></div>}
                  {tournament.format && <div><dt>Format</dt><dd>{tournament.format}</dd></div>}
                  {tournament.tempo && <div><dt>Tempo</dt><dd>{tournament.tempo}</dd></div>}
                </dl>
                <div className="tournament-actions">
                  <a className="btn-secondary" href={`/turniri/${tournament.id}`}>Detalji turnira</a>
                  {isOpen(tournament) && <a className="btn-primary" href={`/turniri/${tournament.id}#prijava`}>Prijavi se</a>}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix · Kalendar natjecanja</footer>
    </>
  );
}
