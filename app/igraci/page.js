import Link from 'next/link';
import PublicHeader from '../components/PublicHeader';
import { supabase } from '../../lib/supabaseClient';

export const revalidate = 30;

export const metadata = {
  title: 'Igrači',
  description: 'Igrači ŠK Dubrovnik i njihovi Grand Prix nastupi, bodovi i statistika.',
};

export default async function IgraciPage() {
  const { data: players, error } = await supabase
    .from('players')
    .select('id, full_name, title, club, category, general_gp_points, category_gp_points, birth_year, fide_id, is_active')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  return (
    <main>
      <PublicHeader active="/igraci" />
      <section className="public-page-hero">
        <div>
          <span className="eyebrow">GRAND PRIX ECOSYSTEM</span>
          <h1>Igrači</h1>
          <p>Profil igrača, nastupi, bodovi i razvoj kroz Grand Prix.</p>
        </div>
      </section>

      <section className="public-section">
        {error ? (
          <div className="public-state public-state-error">Igrači trenutačno nisu dostupni.</div>
        ) : !players?.length ? (
          <div className="public-state">Trenutačno nema evidentiranih igrača.</div>
        ) : (
          <div className="public-player-grid">
            {players.map((player) => (
              <Link className="public-player-card" href={`/igraci/${player.id}`} key={player.id}>
                <div>
                  <strong>{player.full_name}</strong>
                  <span>{[player.title, player.club].filter(Boolean).join(' · ') || 'ŠK Dubrovnik'}</span>
                </div>
                <div className="public-player-card-stats">
                  <span><b>{Number(player.general_gp_points ?? 0)}</b> GP</span>
                  <span><b>{Number(player.category_gp_points ?? 0)}</b> KAT.</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
