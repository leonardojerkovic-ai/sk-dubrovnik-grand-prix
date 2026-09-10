import Link from 'next/link';
import PublicHeader from '../../components/PublicHeader';
import { supabase } from '../../../lib/supabaseClient';

export const revalidate = 30;

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
      .eq('player_id', playerId)
      .order('tournament_id', { ascending: false }),
    supabase
      .from('player_ratings')
      .select('effective_month, fide_standard, fide_rapid, fide_blitz')
      .eq('player_id', playerId)
      .order('effective_month', { ascending: false }),
  ]);

  const rows = results || [];
  const games = rows.reduce((sum, r) => sum + Number(r.games_played || 0), 0);
  const wins = rows.reduce((sum, r) => sum + Number(r.wins || 0), 0);
  const draws = rows.reduce((sum, r) => sum + Number(r.draws || 0), 0);
  const losses = rows.reduce((sum, r) => sum + Number(r.losses || 0), 0);
  const score = rows.reduce((sum, r) => sum + Number(r.score || 0), 0);
  const gpPoints = rows.reduce((sum, r) => sum + Number(r.points_awarded || 0), 0);
  const podiums = rows.filter((r) => Number(r.final_rank) >= 1 && Number(r.final_rank) <= 3).length;

  const seasons = new Map();
  for (const row of rows) {
    const season = row.tournaments?.seasons;
    const key = season?.code || String(row.tournaments?.season_id || 'nepoznato');
    const current = seasons.get(key) || { name: season?.name || 'Sezona', events: 0, games: 0, points: 0, wins: 0 };
    current.events += 1;
    current.games += Number(row.games_played || 0);
    current.points += Number(row.points_awarded || 0);
    current.wins += Number(row.wins || 0);
    seasons.set(key, current);
  }

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
            <div className="section-heading"><span className="eyebrow">POVIJEST NASTUPA</span><h2>Turniri</h2></div>
            {!rows.length ? <p>Nema evidentiranih nastupa.</p> : <div className="public-table-wrap"><table className="public-table"><thead><tr><th>Turnir</th><th>Sezona</th><th>Mjesto</th><th>Rezultat</th><th>GP</th></tr></thead><tbody>{rows.map((r, i) => <tr key={`${r.tournament_id}-${i}`}><td>{r.tournaments?.name || 'Turnir'}</td><td>{r.tournaments?.seasons?.name || '—'}</td><td>{r.final_rank ?? '—'}</td><td>{r.score ?? '—'} ({r.wins ?? 0}-{r.draws ?? 0}-{r.losses ?? 0})</td><td>{Number(r.points_awarded || 0)}</td></tr>)}</tbody></table></div>}
          </section>

          <section className="public-panel">
            <div className="section-heading"><span className="eyebrow">SEZONSKE STATISTIKE</span><h2>Napredak kroz sezone</h2></div>
            {!seasons.size ? <p>Nema sezonskih podataka.</p> : <div className="public-season-list">{Array.from(seasons.values()).map((s) => <div className="public-season-row" key={s.name}><strong>{s.name}</strong><span>{s.events} nastupa · {s.games} partija · {s.wins} pobjeda · {s.points.toFixed(2)} GP</span></div>)}</div>}
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
