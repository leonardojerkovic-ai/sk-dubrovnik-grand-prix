import { notFound } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export const revalidate = 30;

function formatDate(value) {
  if (!value) return 'Datum nije objavljen';
  return new Date(`${value}T00:00:00`).toLocaleDateString('hr-HR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function isOpen(tournament) {
  return tournament.status === 'prijave_otvorene'
    && (!tournament.registration_deadline || new Date(tournament.registration_deadline) >= new Date());
}

export default async function TournamentDetailPage({ params }) {
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('id,name,description,format,tempo,starts_at,location,status,published,registration_deadline,event_stage')
    .eq('id', params.id)
    .eq('published', true)
    .single();

  if (error || !tournament || tournament.event_stage === 'FINAL') notFound();

  const open = isOpen(tournament);
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

      <section className="tournament-detail-hero">
        <div className="tournament-detail-inner">
          <a className="back-link" href="/turniri">← Svi turniri</a>
          <span className="eyebrow">{open ? 'Prijave otvorene' : 'Turnir'}</span>
          <h1>{tournament.name}</h1>
          <p>{formatDate(tournament.starts_at)}{tournament.location ? ` · ${tournament.location}` : ''}</p>
        </div>
      </section>

      <main className="tournament-detail-main">
        <section className="detail-content">
          <div className="detail-card">
            <span className="section-kicker">Informacije</span>
            <h2>O turniru</h2>
            <p>{tournament.description || 'Detalji turnira bit će objavljeni uskoro.'}</p>
            <dl className="detail-meta">
              {tournament.format && <div><dt>Format</dt><dd>{tournament.format}</dd></div>}
              {tournament.tempo && <div><dt>Tempo igre</dt><dd>{tournament.tempo}</dd></div>}
              <div><dt>Datum</dt><dd>{formatDate(tournament.starts_at)}</dd></div>
              {tournament.location && <div><dt>Mjesto</dt><dd>{tournament.location}</dd></div>}
              {tournament.registration_deadline && <div><dt>Rok prijave</dt><dd>{formatDate(tournament.registration_deadline)}</dd></div>}
            </dl>
          </div>

          <section className="registration-card" id="prijava">
            <span className="section-kicker">Sudjelovanje</span>
            <h2>{open ? 'Prijava na turnir' : 'Prijave'}</h2>
            {open ? (
              <>
                <p>Prijavite se putem javnog obrasca. Za sada je ovo ulazna točka za postojeći Supabase workflow prijava.</p>
                <a className="btn-primary" href={`/prijava?turnir=${tournament.id}`}>Otvori obrazac za prijavu</a>
              </>
            ) : (
              <p>Prijave trenutačno nisu otvorene. Status turnira: <strong>{tournament.status || 'najavljen'}</strong>.</p>
            )}
          </section>
        </section>
      </main>
      <footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix · {tournament.name}</footer>
    </>
  );
}
