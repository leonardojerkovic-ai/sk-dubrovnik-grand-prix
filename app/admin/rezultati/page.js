'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const EMPTY = { player_id: '', final_rank: '', score: '', games_played: '', wins: '', draws: '', losses: '', rating_used: '' };

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = lines[0].toLowerCase();
  const hasHeader = first.includes('player_id') || first.includes('plasman');
  const data = hasHeader ? lines.slice(1) : lines;
  return data.map((line) => {
    const cells = line.split(',').map((x) => x.trim());
    return { player_id: cells[0] || '', final_rank: cells[1] || '', score: cells[2] || '', games_played: cells[3] || '', wins: cells[4] || '', draws: cells[5] || '', losses: cells[6] || '', rating_used: cells[7] || '' };
  });
}

function toPayload(row) {
  return {
    player_id: Number(row.player_id), final_rank: Number(row.final_rank), score: Number(row.score),
    games_played: Number(row.games_played), wins: Number(row.wins), draws: Number(row.draws),
    losses: Number(row.losses), rating_used: Number(row.rating_used),
  };
}

export default function AdminResultsPage() {
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [players, setPlayers] = useState([]);
  const [tournamentId, setTournamentId] = useState('');
  const [rows, setRows] = useState([]);
  const [csv, setCsv] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) { setSession(null); setLoading(false); return; }
    setSession(auth.user);
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', auth.user.id).maybeSingle();
    setRole(profile?.role || null);
    const [{ data: ts, error: te }, { data: ps, error: pe }] = await Promise.all([
      supabase.from('tournaments').select('id,name,starts_at,status,results_locked,max_players').order('starts_at', { ascending: false }),
      supabase.from('players').select('id,full_name').eq('is_active', true).order('full_name'),
    ]);
    if (te) setError(te.message); else setTournaments(ts || []);
    if (pe) setError((x) => x || pe.message); else setPlayers(ps || []);
    setLoading(false);
  }

  async function loadResults(id) {
    if (!id) { setRows([]); return; }
    setError('');
    const { data, error: e } = await supabase.from('tournament_results').select('id,player_id,final_rank,score,games_played,wins,draws,losses,rating_used,points_awarded').eq('tournament_id', id).order('final_rank', { ascending: true });
    if (e) setError(e.message); else setRows(data || []);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadResults(tournamentId); }, [tournamentId]);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.full_name])), [players]);
  const selectedTournament = tournaments.find((t) => String(t.id) === String(tournamentId));
  const canEdit = Boolean(selectedTournament && !selectedTournament.results_locked);

  function updateRow(index, field, value) {
    setRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
    setError(''); setMessage('');
  }

  function addRow() { setRows((current) => [...current, { ...EMPTY, id: `new-${Date.now()}` }]); }
  function importCsv() {
    try { const imported = parseCsv(csv); if (!imported.length) throw new Error('CSV je prazan.'); setRows(imported.map((r, i) => ({ ...r, id: `import-${Date.now()}-${i}` }))); setMessage(`Uvezeno ${imported.length} redaka. Provjera slijedi pri spremanju.`); setError(''); }
    catch (e) { setError(e.message); }
  }

  async function save() {
    if (!tournamentId) { setError('Odaberite turnir.'); return; }
    if (!canEdit) { setError('Rezultati su zaključani.'); return; }
    setSaving(true); setError(''); setMessage('');
    const { error: e } = await supabase.rpc('save_tournament_results', { p_tournament_id: Number(tournamentId), p_results: rows.map(toPayload) });
    setSaving(false);
    if (e) setError(e.message); else { setMessage('Rezultati su spremljeni i bodovi su ponovno izračunati.'); await loadResults(tournamentId); }
  }

  async function finalize() {
    if (!tournamentId) { setError('Odaberite turnir.'); return; }
    if (!canEdit) { setError('Rezultati su već zaključani.'); return; }
    if (!window.confirm('Zaključati rezultate i završiti turnir? Nakon toga rezultati se ne mogu mijenjati bez SUPER_ADMIN otključavanja.')) return;
    setSaving(true); setError(''); setMessage('');
    const { error: e } = await supabase.rpc('finalize_tournament_results', { p_tournament_id: Number(tournamentId) });
    setSaving(false);
    if (e) setError(e.message); else { setMessage('Turnir je završen. Rezultati i bodovi su zaključani.'); await load(); await loadResults(tournamentId); }
  }

  async function unlock() {
    if (!tournamentId) return;
    if (!window.confirm('SUPER_ADMIN otključavanje omogućuje ponovnu izmjenu rezultata. Nastaviti?')) return;
    setSaving(true); setError('');
    const { error: e } = await supabase.rpc('unlock_tournament_results', { p_tournament_id: Number(tournamentId) });
    setSaving(false);
    if (e) setError(e.message); else { setMessage('Rezultati su otključani.'); await load(); }
  }

  if (loading) return <main className="admin-shell"><div className="admin-loading">Učitavanje rezultata…</div></main>;
  if (!session) return <main className="admin-shell"><section className="admin-gate"><span className="section-kicker">Administracija</span><h1>Rezultati</h1><p>Za pristup je potrebna administratorska prijava.</p><a className="btn-primary" href="/admin/login">Prijava</a></section></main>;
  if (!['admin', 'super_admin'].includes(role)) return <main className="admin-shell"><section className="admin-gate"><h1>403</h1><p>Pristup nije dopušten.</p></section></main>;

  return <main className="admin-shell" style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 18px 60px' }}>
    <div className="admin-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
      <div><div style={{ color: 'var(--ink-soft)' }}>ŠK Dubrovnik · Faza 3C</div><h1 style={{ margin: 0 }}>Rezultati turnira</h1></div>
      <a className="btn-secondary" href="/admin/dashboard">← Dashboard</a>
    </div>
    {error && <div className="admin-message error">{error}</div>}{message && <div className="admin-message success">{message}</div>}
    <section className="admin-panel" style={{ marginBottom: 18 }}>
      <div className="admin-panel-head"><div><span className="section-kicker">Turnir</span><h2>Odabir turnira</h2></div></div>
      <select value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} style={{ width: '100%', maxWidth: 620, padding: 12, borderRadius: 10 }}><option value="">Odaberi turnir</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}{t.results_locked ? ' · ZAKLJUČANO' : ''}</option>)}</select>
    </section>
    {selectedTournament && <>
      <section className="admin-panel" style={{ marginBottom: 18 }}>
        <div className="admin-panel-head"><div><span className="section-kicker">Unos / import</span><h2>Rezultati</h2></div><span>{rows.length} igrača</span></div>
        <p style={{ color: 'var(--ink-soft)' }}>CSV format: <code>player_id,final_rank,score,games_played,wins,draws,losses,rating_used</code></p>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="player_id,final_rank,score,games_played,wins,draws,losses,rating_used" disabled={!canEdit} style={{ width: '100%', minHeight: 90, padding: 12, borderRadius: 10 }} />
        <div className="admin-actions" style={{ marginTop: 10 }}><button onClick={importCsv} disabled={!canEdit}>Uvezi CSV</button><button onClick={addRow} disabled={!canEdit}>+ Dodaj igrača</button></div>
        <div className="admin-table-wrap" style={{ marginTop: 16 }}><table className="admin-table"><thead><tr><th>Igrač</th><th>Plasman</th><th>Score</th><th>Partije</th><th>W</th><th>D</th><th>L</th><th>Rating</th><th>GP bodovi</th></tr></thead><tbody>
          {rows.length === 0 ? <tr><td colSpan="9" className="admin-empty">Nema unesenih rezultata.</td></tr> : rows.map((row, i) => <tr key={row.id || i}><td><select value={row.player_id || ''} onChange={(e) => updateRow(i, 'player_id', e.target.value)} disabled={!canEdit}><option value="">Odaberi</option>{players.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></td>{['final_rank','score','games_played','wins','draws','losses','rating_used'].map((field) => <td key={field}><input type="number" value={row[field] ?? ''} onChange={(e) => updateRow(i, field, e.target.value)} disabled={!canEdit} /></td>)}<td>{row.points_awarded ?? '—'}</td></tr>)}
        </tbody></table></div>
        <div className="admin-actions" style={{ marginTop: 16 }}><button className="btn-primary" onClick={save} disabled={!canEdit || saving}>{saving ? 'Spremanje…' : 'Spremi rezultate'}</button><button className="danger" onClick={finalize} disabled={!canEdit || saving}>Završi turnir i zaključaj</button>{role === 'super_admin' && selectedTournament.results_locked && <button className="ghost" onClick={unlock} disabled={saving}>SUPER_ADMIN · Otključaj</button>}</div>
      </section>
      <section className="admin-panel"><span className="section-kicker">Zaštita</span><h2>{selectedTournament.results_locked ? 'Rezultati su zaključani' : 'Rezultati su otvoreni za uređivanje'}</h2><p>{selectedTournament.results_locked ? 'Zaključavanje sprječava izmjene u bazi. Samo SUPER_ADMIN može privremeno otključati rezultate.' : 'Nakon završetka turnira sustav ponovno provjerava rezultate, obračunava bodove i zaključava zapis.'}</p></section>
    </>}
  </main>;
}
