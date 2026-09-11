import Link from 'next/link';
import PublicHeader from '../../components/PublicHeader';
import { supabase } from '../../../lib/supabaseClient';

export const revalidate = 30;

const categoryLabels = {
  U12: 'U12', U16: 'U16', U20: 'U20', U1800: 'U1800',
  S50: 'S50', S65: 'S65', WOMEN: 'Žene', ACADEMY: 'Akademija',
};

function label(code) {
  return categoryLabels[code] || code || 'Opći GP';
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function rankRows(points, players) {
  return Object.entries(points)
    .map(([playerId, value]) => ({
      playerId: Number(playerId),
      points: Number(value),
      name: players.get(Number(playerId)) || 'Nepoznat igrač',
    }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'hr'))
    .map((row, index, all) => ({ ...row, rank: index === 0 || row.points !== all[index - 1].points ? index + 1 : all[index - 1].rank }));
}

export const metadata = {
  title: 'Povijest ljestvica',
  description: 'Povijesni presjeci Grand Prix ljestvice nakon završenih turnira.',
};

export default async function RankingHistoryPage() {
  const [{ data: tournaments, error: tournamentsError }, { data: results, error: resultsError }] = await Promise.all([
    supabase
      .from('tournaments')
      .select('id,name,starts_at,season_id,tournament_scope,category_code,event_stage,status,published,seasons(name,code)')
      .eq('status', 'zavrsen')
      .eq('published', true)
      .order('starts_at', { ascending: true }),
    supabase
      .from('tournament_results')
      .select('tournament_id,player_id,points_awarded,players(full_name)')
  ]);

  const completed = tournaments || [];
  const playerNames = new Map((results || []).map((row) => [row.player_id, row.players?.full_name || 'Nepoznat igrač']));
  const byTournament = new Map();
  for (const row of results || []) {
    if (!byTournament.has(row.tournament_id)) byTournament.set(row.tournament_id, []);
    byTournament.get(row.tournament_id).push(row);
  }

  const generalBySeason = new Map();
  const specialBySeasonCategory = new Map();
  const snapshots = [];

  for (const tournament of completed) {
    const seasonKey = tournament.season_id || tournament.seasons?.code || 'unknown';
    if (!generalBySeason.has(seasonKey)) generalBySeason.set(seasonKey, {});
    const generalPoints = generalBySeason.get(seasonKey);
    const isGeneral = (tournament.tournament_scope || 'GENERAL') === 'GENERAL';

    if (isGeneral) {
      for (const row of byTournament.get(tournament.id) || []) {
        generalPoints[row.player_id] = (generalPoints[row.player_id] || 0) + Number(row.points_awarded || 0);
      }
      snapshots.push({
        key: `general-${tournament.id}`,
        tournament,
        scope: 'GENERAL',
        category: null,
        rows: rankRows(generalPoints, playerNames),
      });
    } else if (tournament.category_code) {
      const categoryKey = `${seasonKey}:${tournament.category_code}`;
      if (!specialBySeasonCategory.has(categoryKey)) specialBySeasonCategory.set(categoryKey, {});
      const specialPoints = specialBySeasonCategory.get(categoryKey);
      for (const row of byTournament.get(tournament.id) || []) {
        specialPoints[row.player_id] = (specialPoints[row.player_id] || 0) + Number(row.points_awarded || 0);
      }

      const combined = {};
      const categoryGeneral = generalPoints;
      for (const [playerId, points] of Object.entries(categoryGeneral)) combined[playerId] = Number(points || 0);
      for (const [playerId, points] of Object.entries(specialPoints)) combined[playerId] = (combined[playerId] || 0) + Number(points || 0);

      snapshots.push({
        key: `category-${tournament.id}`,
        tournament,
        scope: 'CATEGORY',
        category: tournament.category_code,
        rows: rankRows(combined, playerNames),
      });
    }
  }

  const seasons = new Map();
  for (const snapshot of snapshots) {
    const key = snapshot.tournament.season_id || snapshot.tournament.seasons?.code || 'unknown';
    if (!seasons.has(key)) seasons.set(key, { name: snapshot.tournament.seasons?.name || 'Sezona', snapshots: [] });
    seasons.get(key).snapshots.push(snapshot);
  }

  return (
    <main>
      <PublicHeader active="/poredak" />
      <section className="public-page-hero">
        <div>
          <span className="eyebrow">RANKING HISTORY</span>
          <h1>Povijest ljestvica</h1>
          <p>Pregled poretka nakon svakog završenog i javno objavljenog turnira.</p>
        </div>
      </section>

      <section className="public-section">
        <div className="public-card" style={{ marginBottom: 24 }}>
          <h2>Kako čitati povijest?</h2>
          <p>Svaki zapis predstavlja povijesni presjek kumulativnih bodova na kraju turnira. Kategorijske ljestvice računaju se kao <strong>Opći GP + posebni bodovi iste kategorije</strong>, prema pravilima sustava.</p>
        </div>

        {tournamentsError || resultsError ? (
          <div className="public-state public-state-error">Povijest ljestvica trenutačno nije dostupna.</div>
        ) : !snapshots.length ? (
          <div className="public-state">Još nema završenih javno objavljenih turnira s rezultatima.</div>
        ) : (
          Array.from(seasons.entries()).map(([seasonKey, season]) => (
            <section className="public-panel" key={seasonKey} style={{ marginBottom: 20 }}>
              <div className="section-heading">
                <span className="eyebrow">SEZONA</span>
                <h2>{season.name}</h2>
              </div>
              <div className="public-season-list">
                {season.snapshots.map((snapshot) => (
                  <details className="faq-item" key={snapshot.key}>
                    <summary>
                      {snapshot.scope === 'GENERAL' ? 'Opći GP' : label(snapshot.category)} · {snapshot.tournament.name} · {formatDate(snapshot.tournament.starts_at)}
                    </summary>
                    <div className="public-table-wrap">
                      <table className="public-table">
                        <thead><tr><th>#</th><th>Igrač</th><th>Kumulativni bodovi</th></tr></thead>
                        <tbody>
                          {snapshot.rows.map((row) => (
                            <tr key={row.playerId}>
                              <td>{row.rank}</td>
                              <td><Link href={`/igraci/${row.playerId}`}>{row.name}</Link></td>
                              <td>{row.points.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))
        )}
      </section>
    </main>
  );
}
