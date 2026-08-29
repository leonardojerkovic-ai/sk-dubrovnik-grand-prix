export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js'

export default async function PoredakPage() {
  // Inicijalizacija Supabase klijenta unutar funkcije da spriječimo grešku pri buildu
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <PageShell>
        <p className="error-msg">Greška: Nedostaju Supabase varijable okruženja na poslužitelju.</p>
      </PageShell>
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Dohvaćanje igrača iz baze: samo članovi ŠK Dubrovnik, poredani po Općem GP-u
  const { data: dubrovnikStandings, error } = await supabase
    .from('profiles')
    .select('full_name, title_category, rating_rapid, category_gp_type, points_general_gp, points_category_gp')
    .eq('is_sk_dubrovnik_member', true)
    .order('points_general_gp', { ascending: false })

  if (error) {
    return (
      <PageShell>
        <p className="error-msg">Greška pri dohvaćanju poretka: {error.message}</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <h1>Grand Prix Poredak — ŠK Dubrovnik</h1>
      <p className="poredak-intro">Službena tablica poretka članova ŠK Dubrovnik za aktualnu sezonu.</p>

      <div className="poredak-table-wrap">
        <table className="poredak-table">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th>Ime i prezime</th>
              <th>Titula / Kat.</th>
              <th>Kategorija</th>
              <th className="col-num">Rapid Rejting</th>
              <th className="col-num col-points">Opći GP Bodovi</th>
            </tr>
          </thead>
          <tbody>
            {dubrovnikStandings && dubrovnikStandings.length > 0 ? (
              dubrovnikStandings.map((player, index) => (
                <tr key={index}>
                  <td className="col-rank">{index + 1}.</td>
                  <td className="poredak-name">{player.full_name}</td>
                  <td>{player.title_category || '-'}</td>
                  <td className="poredak-muted">{player.category_gp_type || '-'}</td>
                  <td className="col-num">{player.rating_rapid || 0}</td>
                  <td className="col-num col-points">{player.points_general_gp || 0}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="poredak-empty">
                  Trenutno nema unesenih članova ili bodova.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}

function PageShell({ children }) {
  return (
    <>
      <header className="top">
        <div className="top-inner">
          <a href="/" className="brand">
            <img className="mark" src="/logo.png" alt="ŠK Dubrovnik" />
            ŠK Dubrovnik Grand Prix
          </a>
          <nav className="primary">
            <a href="/">Home</a>
            <a href="/turniri">Turniri</a>
            <a href="/poredak" className="active">Poredak</a>
            <a href="/uclani-se">Učlani se</a>
          </nav>
        </div>
      </header>

      <div className="poredak-page">{children}</div>

      <footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix</footer>
    </>
  )
}