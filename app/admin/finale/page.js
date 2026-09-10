'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const STATUS = ['QUALIFIED','INVITED','CONFIRMED','DECLINED','REPLACEMENT','PLAYED','NO_SHOW'];

export default function AdminFinalPage() {
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [finals, setFinals] = useState([]);
  const [finalId, setFinalId] = useState('');
  const [rows, setRows] = useState([]);
  const [kind, setKind] = useState('GENERAL');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) { setSession(null); setLoading(false); return; }
    setSession(auth.user);
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', auth.user.id).maybeSingle();
    setRole(profile?.role || null);
    const { data, error: e } = await supabase.from('tournaments').select('id,name,start_date,event_stage,category_code,results_locked').eq('event_stage','FINAL').order('start_date',{ascending:false});
    if (e) setError(e.message); else setFinals(data || []);
    setLoading(false);
  }

  async function loadRows(id) {
    if (!id) { setRows([]); return; }
    const final = finals.find((x) => String(x.id) === String(id));
    const table = final?.category_code === 'U20' ? 'junior_gp_final_qualifiers' : 'grand_prix_final_qualifiers';
    setKind(table === 'grand_prix_final_qualifiers' ? 'GENERAL' : 'U20');
    const { data, error: e } = await supabase.from(table).select('*').eq('final_tournament_id', Number(id)).order('final_slot',{ascending:true});
    if (e) setError(e.message); else setRows(data || []);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadRows(finalId); }, [finalId, finals]);

  const playerIds = useMemo(() => [...new Set(rows.map((r) => r.player_id).filter(Boolean))], [rows]);
  const [players, setPlayers] = useState([]);
  useEffect(() => { if (!playerIds.length) return setPlayers([]); supabase.from('players').select('id,full_name').in('id', playerIds).then(({data}) => setPlayers(data || [])); }, [playerIds.join(',')]);
  const names = useMemo(() => new Map(players.map((p) => [p.id,p.full_name])), [players]);
  const selected = finals.find((x) => String(x.id) === String(finalId));
  const table = kind === 'U20' ? 'junior_gp_final_qualifiers' : 'grand_prix_final_qualifiers';

  async function setStatus(row, status) {
    setBusy(true); setError(''); setMessage('');
    const call = kind === 'U20'
      ? supabase.rpc('junior_final_record_status', { p_final_tournament_id:Number(finalId), p_player_id:row.player_id, p_status:status })
      : supabase.rpc('set_dgp_final_status', { p_qualifier_id:row.id, p_status:status });
    const { error: e } = await call;
    setBusy(false);
    if (e) setError(e.message); else { setMessage(`Status ${status} je spremljen.`); await loadRows(finalId); }
  }

  async function refresh() {
    if (!finalId) return;
    setBusy(true); setError('');
    const fn = kind === 'U20' ? 'refresh_dgp_junior_final_qualifiers' : 'refresh_dgp_final_qualifiers';
    const { error: e } = await supabase.rpc(fn, { p_final_tournament_id:Number(finalId) });
    setBusy(false);
    if (e) setError(e.message); else { setMessage('TOP 8 / replacement lista je osvježena.'); await loadRows(finalId); }
  }

  async function protect() {
    if (!finalId || !window.confirm('Zaključati Finale i trajno zaštititi rezultate?')) return;
    setBusy(true); setError('');
    const { error: e } = await supabase.rpc('finalize_dgp_final_results', { p_final_tournament_id:Number(finalId) });
    setBusy(false);
    if (e) setError(e.message); else { setMessage('Finale je završeno i rezultati su zaštićeni.'); await load(); await loadRows(finalId); }
  }

  if (loading) return <main className="admin-shell"><div className="admin-loading">Učitavanje Finala…</div></main>;
  if (!session) return <main className="admin-shell"><section className="admin-gate"><h1>Finale</h1><p>Potrebna je administratorska prijava.</p><a className="btn-primary" href="/admin/login">Prijava</a></section></main>;
  if (!['admin','super_admin'].includes(role)) return <main className="admin-shell"><section className="admin-gate"><h1>403</h1><p>Pristup nije dopušten.</p></section></main>;

  return <main className="admin-shell" style={{maxWidth:1240,margin:'0 auto',padding:'24px 18px 60px'}}>
    <div className="admin-topbar" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}><div><div style={{color:'var(--ink-soft)'}}>ŠK Dubrovnik · Faza 3D</div><h1 style={{margin:0}}>Finale — TOP 8</h1></div><a className="btn-secondary" href="/admin/dashboard">← Dashboard</a></div>
    {error && <div className="admin-message error">{error}</div>}{message && <div className="admin-message success">{message}</div>}
    <section className="admin-panel" style={{marginBottom:18}}><span className="section-kicker">Finale</span><h2>Odabir Finala</h2><select value={finalId} onChange={(e)=>setFinalId(e.target.value)} style={{width:'100%',maxWidth:700,padding:12,borderRadius:10}}><option value="">Odaberi Finale</option>{finals.map((f)=><option key={f.id} value={f.id}>{f.name} · {f.category_code || 'Opći'}{f.results_locked?' · ZAKLJUČANO':''}</option>)}</select></section>
    {selected && <section className="admin-panel"><div className="admin-panel-head"><div><span className="section-kicker">Kvalifikacija</span><h2>{kind === 'U20' ? 'U20 TOP 8' : 'Opći TOP 8'}</h2></div><span>{rows.length}/8 mjesta</span></div>
      <div className="admin-actions" style={{marginBottom:16}}><button onClick={refresh} disabled={busy || selected.results_locked}>Osvježi TOP 8 / Replacement</button><button className="danger" onClick={protect} disabled={busy || selected.results_locked}>Završi Finale i zaštiti rezultat</button></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Slot</th><th>Igrač</th><th>Kval. rang</th><th>Bodovi</th><th>Status</th><th>Zamijenio</th><th>Akcija</th></tr></thead><tbody>{rows.length===0?<tr><td colSpan="7" className="admin-empty">Nema kvalificiranih igrača. Osvježi TOP 8.</td></tr>:rows.map((r)=><tr key={r.id}><td>{r.final_slot || '—'}</td><td>{names.get(r.player_id) || `#${r.player_id}`}</td><td>{r.qualification_rank}</td><td>{r.qualification_points}</td><td><strong>{r.status}</strong></td><td>{r.replaced_player_id ? `#${r.replaced_player_id}` : '—'}</td><td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{['INVITED','CONFIRMED','DECLINED','NO_SHOW','PLAYED'].map((s)=><button key={s} onClick={()=>setStatus(r,s)} disabled={busy || selected.results_locked || r.status==='PLAYED' || r.status==='NO_SHOW'}>{s}</button>)}</div></td></tr>)}</tbody></table></div>
      <p style={{color:'var(--ink-soft)',marginTop:16}}>DECLINED automatski pokreće replacement prema kvalifikacijskom poretku. CONFIRMED zatim može prijeći u PLAYED ili NO_SHOW. PLAYED/NO_SHOW su zaključani.</p>
    </section>}
  </main>;
}
