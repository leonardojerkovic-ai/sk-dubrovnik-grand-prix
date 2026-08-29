export const dynamic = 'force-dynamic';import { createClient } from '@supabase/supabase-js'

// Inicijalizacija Supabase klijenta
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default async function PoredakPage() {
  // Dohvaćanje igrača iz baze: samo članovi ŠK Dubrovnik, poredani po Općem GP-u
  const { data: dubrovnikStandings, error } = await supabase
    .from('profiles')
    .select('full_name, title_category, rating_rapid, category_gp_type, points_general_gp, points_category_gp')
    .eq('is_sk_dubrovnik_member', true)
    .order('points_general_gp', { ascending: false })

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        Greška pri dohvaćanju poretka: {error.message}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Grand Prix Poredak — ŠK Dubrovnik</h1>
      <p className="text-gray-600 mb-6">Službena tablica poretka članova ŠK Dubrovnik za aktualnu sezonu.</p>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b text-gray-700 text-sm">
              <th className="p-3 w-12 text-center">#</th>
              <th className="p-3">Ime i prezime</th>
              <th className="p-3">Titula / Kat.</th>
              <th className="p-3">Kategorija</th>
              <th className="p-3 text-right">Rapid Rejting</th>
              <th className="p-3 text-right font-bold">Opći GP Bodovi</th>
            </tr>
          </thead>
          <tbody>
            {dubrovnikStandings && dubrovnikStandings.length > 0 ? (
              dubrovnikStandings.map((player, index) => (
                <tr key={index} className="border-b hover:bg-slate-50 transition">
                  <td className="p-3 text-center font-medium text-gray-500">{index + 1}.</td>
                  <td className="p-3 font-semibold text-gray-900">{player.full_name}</td>
                  <td className="p-3 text-gray-600">{player.title_category || '-'}</td>
                  <td className="p-3 text-sm text-gray-500">{player.category_gp_type || '-'}</td>
                  <td className="p-3 text-right text-gray-600">{player.rating_rapid || 0}</td>
                  <td className="p-3 text-right font-bold text-blue-700">{player.points_general_gp || 0}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-6 text-center text-gray-500">
                  Trenutno nema unesenih članova ili bodova.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}