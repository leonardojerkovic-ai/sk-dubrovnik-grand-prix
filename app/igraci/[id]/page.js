import Link from 'next/link';
import PublicHeader from '../../components/PublicHeader';
import { supabase } from '../../../lib/supabaseClient';

export const revalidate = 30;

const categoryLabels = {
  GENERAL: 'Opći GP',
  S65: 'S65',
  S50: 'S50',
  U1800: 'U1800',
  U20: 'U20',
  U16: 'U16',
  U12: 'U12',
  WOMEN: 'Žene',
  ACADEMY: 'Akademija',
};

function categoryLabel(code) {
  return categoryLabels[code] || code || 'Opći GP';
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const { data: player } = await supabase.from('players').select('full_name').eq('id', id).maybeSingle();
  return {
    title: player?.full_name ? `${player.full_name} — profil` : 'Profil igrača',
    description: player?.full_name ? `Grand Prix profil igrača ${player.full_name}.` : 'Grand Prix profil igrača.',
  };
}

export default async function PlayerProfilePage({ params }) {
  const { id } = await params;
  const playerId = Number(id);
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .maybeSingle();

  if (playerError || !player) {
    return (
      <main><PublicHeader active="/igraci" /><section className="public-section"><div className="public-state public-state-error">Profil igrača trenutačno nije dostupan.</div></section></main>
    );
  }

  const [{ data: results, error: resultsError }, { data: ratings, error: ratingsError }] = await Promise.all([
    supabase
      .from('tournament_results')
      .select('tournament_id, final_rank, score, games_played, wins, draws, losses, points_awarded, rating_standard, rating_rapid, rating_blitz, rating_used, tournaments(name, starts_at, season_id, tournament_scope, category_code, event_stage, status, seasons(name, code))')
      .eq('player_id', playerId),
    supabase
      .from('player_ratings')
      .select('effective_month, fide_standard, fide_rapid, fide_blitz')
      .eq('player_id', playerId)
      .order('effective_month', { ascending: false }),
  ]);

  const rows = [...(results || [])].sort((a, b) => new Date(a.tournaments?.starts_at || 0) - new Date(b.tournaments?.starts_at || 0));
  const games = rows.reduce((sum, r) => sum + Number(r.games_played || 0), 0);
  const wins = rows.reduce((sum, r) => sum + Number(r.wins || 0), 0);
  const draws = rows.reduce((sum, r) => sum + Number(r.draws || 0), 0);
  const losses = rows.reduce((sum, r) => sum + Number(r.losses || 0), 0);
  const score = rows.reduce((sum, r) => sum + Number(r.score || 0), 0);
  const gpPoints = rows.reduce((sum, r) => sum + Number(r.points_awarded || 0), 0);
  const rankedRows = rows.filter((r) => Number.isFinite(Number(r.final_rank)) && Number(r.final_rank) > 0);
  const bestPlacement = rankedRows.length ? Math.min(...rankedRows.map((r) => Number(r.final_rank))) : null;
  const podiums = rankedRows.filter((r) => Number(r.final_rank) <= 3).length;
  const firstPlaces = rankedRows.filter((r) => Number(r.final_rank) === 1).length;
  const secondPlaces = rankedRows.filter((r) => Number(r.final_rank) === 2).length;
  const thirdPlaces = rankedRows.filter((r) => Number(r.final_rank) === 3).length;
  const averagePlacement = average(rankedRows.map((r) => Number(r.final_rank)));
  const winRate = games ? (wins / games) * 100 : 0;

  const seasons = new Map();
  for (const row of rows) {
    const season = row.tournaments?.seasons;
    const key = season?.code || String(row.tournaments?.season_id || 'nepoznato');
    const current = seasons.get(key) || { code: key, name: season?.name || 'Sezona', events: 0, games: 0, points: 0, wins: 0, draws: 0, losses: 0, ranks: [] };
    current.events += 1;
    current.games += Number(row.games_played || 0);
    current.points += Number(row.points_awarded || 0);
    current.wins += Number(row.wins || 0);
    current.draws += Number(row.draws || 0);
    current.losses += Number(row.losses || 0);
    if (Number(row.final_rank) > 0) current.ranks.push(Number(row.final_rank));
    seasons.set(key, current);
  }
  const seasonRows = Array.from(seasons.values()).reverse();

  const categories = [];
  const seenCategories = new Set();
  for (const row of rows) {
    const code = row.tournaments?.category_code || row.tournaments?.tournament_scope || 'GENERAL';
    if (!seenCategories.has(code)) {
      seenCategories.add(code);
      categories.push({ code, label: categoryLabel(code), first: row.tournaments?.starts_at });
    }
  }

  const successfulTournaments = [...rows]
    .filter((r) => Number(r.points_awarded || 0) > 0 || Number(r.final_rank) > 0)
    .sort((a, b) => {
      const points = Number(b.points_awarded || 0) - Number(a.points_awarded || 0);
      if (points) return points;
      return Number(a.final_rank || 99999) - Number(b.final_rank || 99999);
    })
    .slice(0, 5);

  return (
    <main>
      <PublicHeader active="/igraci" />
      <section className="public-page-hero">
        <div>
          <span className="eyebrow">PLAYER PROFILE</span>
          <h1>{player.full_name}</h1>
          <p>{[player.title, player.club, player.category].filter(Boolean).join(' · ') || 'ŠK Dubrovnik'}</p>
        </div>
      </section>

      <section className="public-section">
        <div className="public-stat-grid">
          <div className="public-stat-card"><span>GP bodovi</span><strong>{Number(player.general_gp_points ?? 0)}</strong></div>
          <div className="public-stat-card"><span>Kategorijski bodovi</span><strong>{Number(player.category_gp_points ?? 0)}</strong></div>
          <div className="public-stat-card"><span>Nastupi</span><strong>{rows.length}</strong></div>
          <div className="public-stat-card"><span>Partije</span><strong>{games}</strong></div>
          <div className="public-stat-card"><span>Pobjede</span><strong>{wins}</strong></div>
          <div className="public-stat-card"><span>Podiji</span><strong>{podiums}</strong></div>
        </div>

        {resultsError || ratingsError ? <div className="public-state public-state-error">Dio statistike trenutačno nije dostupan.</div> : null}

        <div className="public-detail-grid">
          <section className="public-panel">
            <div className="section-heading"><span className="eyebrow">REKORD</span><h2>Najbolji plasman</h2></div>
            <div className="public-stat-grid">
              <div className="public-stat-card"><span>Najbolji plasman</span><strong>{bestPlacement ?? '—'}</strong></div>
              <div className="public-stat-card"><span>Prosjek plasmana</span><strong>{averagePlacement ? averagePlacement.toFixed(2) : '—'}</strong></div>
              <div className="public-stat-card"><span>1. mjesta</span><strong>{firstPlaces}</strong></div>
              <div className="public-stat-card"><span>2. mjesta</span><strong>{secondPlaces}</strong></div>
              <div className="public-stat-card"><span>3. mjesta</span><strong>{thirdPlaces}</strong></div>
              <div className="public-stat-card"><span>Postotak pobjeda</span><strong>{winRate.toFixed(1)}%</strong></div>
            </div>
          </section>

          <section className="public-panel">
            <div className="section-heading"><span className="eyebrow">NAJUSPJEŠNIJI NASTUPI</span><h2>Najbolji turniri</h2></div>
            {!successfulTournaments.length ? <p>Nema evidentiranih turnira s rezultatima.</p> : <div className="public-season-list">{successfulTournaments.map((r, i) => <div className="public-season-row" key={`${r.tournament_id}-${i}`}><strong>{r.tournaments?.name || 'Turnir'}</strong><span>{formatDate(r.tournaments?.starts_at)} · {r.final_rank ? `${r.final_rank}. mjesto` : 'plasman —'} · {Number(r.points_awarded || 0)} GP</span></div>)}</div>}
          </section>

          <section className="public-panel">
            <div className="section-heading"><span className="eyebrow">SEZONSKI TREND</span><h2>Napredak kroz sezone</h2></div>
            {!seasonRows.length ? <p>Nema sezonskih podataka.</p> : <div className="public-table-wrap"><table className="public-table"><thead><tr><th>Sezona</th><th>Nastupi</th><th>Partije</th><th>GP</th><th>Prosjek plasmana</th><th>W-D-L</th></tr></thead><tbody>{seasonRows.map((s) => <tr key={s.code}><td>{s.name}</td><td>{s.events}</td><td>{s.games}</td><td>{s.points.toFixed(2)}</td><td>{s.ranks.length ? average(s.ranks).toFixed(2) : '—'}</td><td>{s.wins}-{s.draws}-{s.losses}</td></tr>)}</tbody></table></div>}
          </section>

          <section className="public-panel">
            <div className="section-heading"><span className="eyebrow">KATEGORIJSKI NAPREDAK</span><h2>Kategorije u kojima je nastupao</h2></div>
            {!categories.length ? <p>Nema evidentiranih kategorijskih nastupa.</p> : <div className="public-player-grid">{categories.map((category) => <div className="public-player-card" key={category.code}><div><strong>{category.label}</strong><span>Prvi evidentirani nastup: {formatDate(category.first)}</span></div></div>)}</div>}
            <p className="public-muted">Kategorije su izvedene iz stvarno evidentiranih turnirskih nastupa; sustav ne stvara zasebnu povijest kategorija.</p>
          </section>

          <section className="public-panel">
            <div className="section-heading"><span className="eyebrow">POVIJEST NASTUPA</span><h2>Kronologija</h2></div>
            {!rows.length ? <p>Nema evidentiranih nastupa.</p> : <div className="public-table-wrap"><table className="public-table"><thead><tr><th>Datum</th><th>Turnir</th><th>Kategorija</th><th>Mjesto</th><th>Rezultat</th><th>GP</th></tr></thead><tbody>{rows.map((r, i) => <tr key={`${r.tournament_id}-${i}`}><td>{formatDate(r.tournaments?.starts_at)}</td><td>{r.tournaments?.name || 'Turnir'}</td><td>{categoryLabel(r.tournaments?.category_code || r.tournaments?.tournament_scope)}</td><td>{r.final_rank ?? '—'}</td><td>{r.score ?? '—'} ({r.wins ?? 0}-{r.draws ?? 0}-{r.losses ?? 0})</td><td>{Number(r.points_awarded || 0)}</td></tr>)}</tbody></table></div>}
          </section>

          <section className="public-panel">
            <div className="section-heading"><span className="eyebrow">RATING HISTORY</span><h2>FIDE rejting</h2></div>
            {!ratings?.length ? <p>Nema evidentirane rating povijesti.</p> : <div className="public-table-wrap"><table className="public-table"><thead><tr><th>Mjesec</th><th>Standard</th><th>Rapid</th><th>Blitz</th></tr></thead><tbody>{ratings.map((r) => <tr key={r.effective_month}><td>{r.effective_month}</td><td>{r.fide_standard ?? '—'}</td><td>{r.fide_rapid ?? '—'}</td><td>{r.fide_blitz ?? '—'}</td></tr>)}</tbody></table></div>}
          </section>

          <section className="public-panel">
            <div className="section-heading"><span className="eyebrow">SAŽETAK</span><h2>Karijera u GP-u</h2></div>
            <p>Ukupno ostvareni rezultat: <strong>{score.toFixed(2)}</strong>.</p>
            <p>Ukupno dodijeljeni GP bodovi iz evidentiranih nastupa: <strong>{gpPoints.toFixed(2)}</strong>.</p>
            <p>Omjer: <strong>{wins}-{draws}-{losses}</strong>.</p>
            <p>{player.fide_id ? <>FIDE ID: <strong>{player.fide_id}</strong></> : 'FIDE ID nije evidentiran.'}</p>
            <Link className="text-link" href="/igraci">← Svi igrači</Link>
          </section>
        </div>
      </section>
    </main>
  );
}
