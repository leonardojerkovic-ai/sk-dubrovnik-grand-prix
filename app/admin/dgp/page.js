'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const FINAL_STATUSES = ['QUALIFIED', 'INVITED', 'CONFIRMED', 'DECLINED', 'REPLACEMENT', 'PLAYED', 'NO_SHOW'];

export default function DgpAdminPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState('');
  const [tournament, setTournament] = useState(null);
  const [results, setResults] = useState([]);
  const [qualifiers, setQualifiers] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  async function loadTournaments() {
    setLoading(true);
    const { data, error } = await supabase.from('tournaments').select('id,name,start_date,end_date,event_stage,tournament_scope,category_code,status,published,tournament_level,tempo').order('start_date', { ascending: false });
    if (error) setMessage(`Greška: ${error.message}`);
    setTournaments(data || []); setLoading(false);
  }

  async function loadTournament(id) {
    if (!id) { setTournament(null); setResults([]); setQualifiers([]); return; }
    const t = tournaments.find((x) => String(x.id) === String(id));
    setTournament(t || null);
    const [{ data: r, error: re }, { data: q, error: qe }] = await Promise.all([
      supabase.from('tournament_results').select('id,player_id,final_rank,score,games_played,wins,draws,losses,rating_used,points_awarded,calculated_at,players(full_name)').eq('tournament_id', id).order('final_rank', { ascending: true, nullsFirst: false }),
      t?.event_stage === 'FINAL' ? supabase.from('grand_prix_final_qualifiers').select('id,final_slot,player_id,qualification_rank,qualification_points,status,replaced_player_id,players(full_name)').eq('final_tournament_id', id).order('final_slot', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    ]);
    if (re) setMessage(`Greška pri učitavanju rezultata: ${re.message}`);
    if (qe) setMessage(`Greška pri učitavanju kvalifikacija: ${qe.message}`);
    setResults(r || []); setQualifiers(q || []);
  }

  async function loadRankings() {
    const { data, error } = await supabase.from('dgp_general_ranking').select('player_id,full_name,general_gp_points,counted_results,final_points').order('general_gp_points', { ascending: false }).limit(20);
    if (!error) setRankings(data || []);
    else setMessage(`Greška pri učitavanju ljestvice: ${error.message}`);
  }

  useEffect(() => { loadTournaments(); loadRankings(); }, []);
  useEffect(() => { loadTournament(selected); }, [selected, tournaments]);

  async function recalculate() {
    if (!selected || !confirm('Ponovno izračunati DGP bodove za odabrani turnir?')) return;
    setSavingId('recalc'); setMessage('');
    const { error } = await supabase.rpc('calculate_dgp_points', { p_tournament_id: Number(selected) });
    setSavingId(null); setMessage(error ? `Greška: ${error.message}` : 'DGP bodovi su ponovno izračunati.');
    await loadTournament(selected); await loadRankings();
  }

  async function refreshFinal() {
    if (!selected || !confirm('Osvježiti TOP 8 kvalifikacije? Postojeći CONFIRMED, PLAYED i NO_SHOW zapisi ostaju zaštićeni.')) return;
    setSavingId('final'); setMessage('');
    const { error } = await supabase.rpc('refresh_dgp_final_qualifiers', { p_final_tournament_id: Number(selected) });
    setSavingId(null); setMessage(error ? `Greška: ${error.message}` : 'Kvalifikacije finala su osvježene.');
    await loadTournament(selected);
  }

  async function updateResult(row) {
    setSavingId(row.id); setMessage('');
    const { error } = await supabase.rpc('update_dgp_result', { p_result_id: Number(row.id), p_final_rank: row.final_rank === '' ? null : Number(row.final_rank), p_score: row.score === '' ? null : Number(row.score), p_games_played: row.games_played === '' ? null : Number(row.games_played), p_wins: row.wins === '' ? 0 : Number(row.wins), p_draws: row.draws === '' ? 0 : Number(row.draws), p_losses: row.losses === '' ? 0 : Number(row.losses) });
    setSavingId(null); setMessage(error ? `Greška: ${error.message}` : 'Rezultat spremljen.');
    if (!error) await loadTournament(selected);
  }

  async function setFinalStatus(id, status) {
    if (!confirm(`Postaviti status finala na ${status}?`)) return;
    setSavingId(`q-${id}`); setMessage('');
    const { error } = await supabase.rpc('set_dgp_final_status', { p_qualifier_id: Number(id), p_status: status });
    setSavingId(null); setMessage(error ? `Greška: ${error.message}` : `Status je postavljen na ${status}.`);
    if (!error) await loadTournament(selected);
  }

  const stats = useMemo(() => ({ players: results.length, played: results.filter((r) => Number(r.games_played || 0) > 0).length, points: results.reduce((sum, r) => sum + Number(r.points_awarded || 0), 0), confirmed: qualifiers.filter((q) => q.status === 'CONFIRMED').length, declined: qualifiers.filter((q) => q.status === 'DECLINED').length, noShow: qualifiers.filter((q) => q.status === 'NO_SHOW').length }), [results, qualifiers]);
  const rankedRows = useMemo(() => rankings.map((r, i) => ({ ...r, display_rank: i + 1 })), [rankings]);

  function patchResult(id, field, value) { setResults((current) => current.map((r) => r.id === id ? { ...r, [field]: value } : r)); }

  return (
    <main className="admin-shell" style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 18px 60px' }}>
      <div className="admin-topbar" style={{ marginBottom: 18 }}><div><div style={{ color: 'var(--ink-soft)', fontSize: '.9rem' }}>ŠK Dubrovnik · Grand Prix</div><h1>DGP upravljanje</h1></div><a href="/admin/dashboard">← Admin panel</a></div>
      <section className="admin-card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px,1fr) auto', gap: 14, alignItems: 'end' }}><div className="field" style={{ margin: 0 }}><label htmlFor="dgp-tournament">Turnir</label><select id="dgp-tournament" value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Odaberi turnir…</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.start_date || 'bez datuma'} — {t.event_stage || 'REGULAR'}</option>)}</select></div><div style={{ color: 'var(--ink-soft)', fontSize: '.9rem' }}>{loading ? 'Učitavanje…' : `${tournaments.length} turnira`}</div></div>
        {tournament && <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}><span className="admin-badge">{tournament.event_stage}</span><span className="admin-badge">{tournament.tournament_scope}</span><span className="admin-badge">{tournament.category_code || 'GENERAL'}</span><span className="admin-badge">{tournament.status}</span></div>}
        {selected && <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}><button className="btn-primary" disabled={savingId === 'recalc'} onClick={recalculate}>{savingId === 'recalc' ? 'Računam…' : 'Ponovno izračunaj DGP bodove'}</button>{tournament?.event_stage === 'FINAL' && <button className="btn-primary" disabled={savingId === 'final'} onClick={refreshFinal}>{savingId === 'final' ? 'Osvježavam…' : 'Osvježi TOP 8 / replacement'}</button>}</div>}
        {message && <p role="status" style={{ marginBottom: 0 }}>{message}</p>}
      </section>
      {selected && <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>{[[stats.players,'Rezultati'],[stats.played,'Odigrali'],[stats.points,'Dodijeljeni bodovi'],[stats.confirmed,'Potvrđeni'],[stats.declined,'Odbijeni'],[stats.noShow,'NO_SHOW']].map(([v,l]) => <div className="admin-card" key={l}><div style={{ color: 'var(--ink-soft)', fontSize: '.88rem' }}>{l}</div><strong style={{ display: 'block', fontSize: '1.7rem', marginTop: 5 }}>{v}</strong></div>)}</section>}
      {qualifiers.length > 0 && <section className="admin-card" style={{ marginBottom: 18 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div><h2>Finale — TOP 8</h2><p style={{ color: 'var(--ink-soft)' }}>DECLINED → REPLACEMENT, NO_SHOW i zaštićeni statusi.</p></div><span className="admin-badge">{qualifiers.length}/8</span></div><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th>Slot</th><th>Igrač</th><th>Kval. rang</th><th>Bodovi</th><th>Status</th><th>Akcija</th></tr></thead><tbody>{qualifiers.map((q) => <tr key={q.id}><td>#{q.final_slot || '—'}</td><td><strong>{q.players?.full_name || `Igrač ${q.player_id}`}</strong>{q.replaced_player_id && <div style={{ color: 'var(--ink-soft)', fontSize: '.8rem' }}>replacement za #{q.replaced_player_id}</div>}</td><td>{q.qualification_rank ?? '—'}</td><td>{q.qualification_points ?? 0}</td><td><span className="admin-badge">{q.status}</span></td><td><select value={q.status} disabled={savingId === `q-${q.id}`} onChange={(e) => setFinalStatus(q.id, e.target.value)}>{FINAL_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div></section>}
      {results.length > 0 && <section className="admin-card" style={{ marginBottom: 18 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><div><h2>Rezultati turnira</h2><p style={{ color: 'var(--ink-soft)' }}>Promjene se spremaju kroz zaštićeni admin RPC.</p></div><button className="btn-secondary" onClick={() => loadTournament(selected)}>Osvježi</button></div><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th>Igrač</th><th>Pl.</th><th>Score</th><th>Partije</th><th>W</th><th>D</th><th>L</th><th>Rejting</th><th>GP bodovi</th><th></th></tr></thead><tbody>{results.map((r) => <tr key={r.id}><td>{r.players?.full_name || r.player_id}</td>{['final_rank','score','games_played','wins','draws','losses'].map((field) => <td key={field}><input type="number" step={field === 'score' ? '0.5' : '1'} value={r[field] ?? ''} onChange={(e) => patchResult(r.id, field, e.target.value)} style={{ width: field === 'score' ? 72 : 58 }} /></td>)}<td>{r.rating_used ?? '—'}</td><td>{r.points_awarded ?? 0}</td><td><button className="btn-primary" disabled={savingId === r.id} onClick={() => updateResult(r)}>{savingId === r.id ? '…' : 'Spremi'}</button></td></tr>)}</tbody></table></div></section>}
      <section className="admin-card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div><h2>Opći DGP — TOP 20</h2><p style={{ color: 'var(--ink-soft)' }}>Brzi operativni pregled ljestvice.</p></div><a className="btn-secondary" href="/dgp">Javna ljestvica</a></div>{rankedRows.length === 0 ? <p style={{ color: 'var(--ink-soft)' }}>Ljestvica trenutno nema podataka.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th>Rang</th><th>Igrač</th><th>Bodovi</th><th>Finale</th><th>Rezultati</th></tr></thead><tbody>{rankedRows.map((r) => <tr key={r.player_id}><td>{r.display_rank}</td><td>{r.full_name || `Igrač ${r.player_id}`}</td><td>{r.general_gp_points ?? 0}</td><td>{r.final_points ?? 0}</td><td>{r.counted_results ?? 0}</td></tr>)}</tbody></table></div>}</section>
    </main>
  );
}
