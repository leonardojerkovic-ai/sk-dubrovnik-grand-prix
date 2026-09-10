import PublicHeader from '../components/PublicHeader';
import { supabase } from '../../lib/supabaseClient';

export const revalidate = 30;
export const metadata = { title: 'Prijave | ŠK Dubrovnik Grand Prix', description: 'Prijave na otvorene turnire ŠK Dubrovnik Grand Prix.' };

export default async function ApplicationsPage() {
  const { data: tournaments, error } = await supabase.from('tournaments').select('*').eq('published', true).eq('status', 'najavljen').order('starts_at', { ascending: true });
  return <><PublicHeader active="/prijave" /><section className="page-hero"><div><span className="eyebrow">Sudjeluj</span><h1>Prijave</h1><p>Odaberite turnir i prijavite se online. Sustav provjerava uvjete i status prijave.</p></div></section><main className="public-main"><div className="tournament-grid">{error ? <div className="public-card"><h2>Prijave trenutačno nisu dostupne.</h2></div> : !tournaments?.length ? <div className="public-card"><h2>Trenutačno nema otvorenih prijava.</h2><p>Pratite najave za sljedeće turnire.</p></div> : tournaments.map((t) => <article className="public-card" key={t.id}><span className="section-kicker">{t.starts_at ? new Date(t.starts_at).toLocaleDateString('hr-HR') : 'Turnir'}</span><h2>{t.name}</h2>{t.description && <p>{t.description}</p>}<a className="btn-primary" href={`/turniri/${t.id}#prijava`}>Prijavi se</a></article>)}</div></main><footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix</footer></>;
}
