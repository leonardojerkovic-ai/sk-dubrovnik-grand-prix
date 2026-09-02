import { supabase } from '../../lib/supabaseClient';

export const revalidate = 30;
const VIEWS = [
  ['dgp_general_ranking', 'Opći GP'],
  ['dgp_s65_ranking', 'S65'], ['dgp_s50_ranking', 'S50'],
  ['dgp_u1800_ranking', 'U1800'], ['dgp_u20_ranking', 'U20'],
  ['dgp_u16_ranking', 'U16'], ['dgp_u12_ranking', 'U12'], ['dgp_women_ranking', 'Žene'],
];

export default async function DgpPage() {
  const datasets = await Promise.all(VIEWS.map(async ([view, label]) => {
    const { data, error } = await supabase.from(view).select('*');
    return { view, label, data: data || [], error };
  }));
  return <>
    <header className="top"><div className="top-inner"><a href="/" className="brand">ŠK Dubrovnik Grand Prix</a><nav className="primary"><a href="/">Naslovnica</a><a href="/dgp" className="active">DGP poredak</a><a href="/poredak">Igrači</a></nav></div></header>
    <main className="layout" style={{gridTemplateColumns:'1fr'}}><section>
      <h1>Dubrovnik Grand Prix 2027</h1>
      <p style={{color:'var(--ink-soft)'}}>Automatski poredak prema pravilima i rezultatima evidentiranima u sustavu.</p>
      {datasets.map(({view,label,data,error}) => <div key={view} style={{margin:'30px 0'}}>
        <h2>{label}</h2>
        {error ? <p>Podaci trenutačno nisu dostupni.</p> : <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>#</th><th>Igrač</th><th>Bodovi</th><th>Rezultati</th></tr></thead><tbody>{data.map((r,i) => <tr key={r.player_id || i}><td>{i+1}</td><td>{r.full_name}</td><td>{r.general_gp_points ?? r[`${view.replace('dgp_','').replace('_ranking','')}_total_points`] ?? r.category_gp_points ?? 0}</td><td>{r.counted_results ?? r.counted_regular_results ?? r.counted_s50_results ?? r.counted_s65_results ?? r.counted_u20_results ?? r.counted_u16_results ?? r.counted_u12_results ?? r.counted_women_results ?? 0}</td></tr>)}</tbody></table></div>}
      </div>)}
    </section></main><footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix</footer>
  </>;
}
