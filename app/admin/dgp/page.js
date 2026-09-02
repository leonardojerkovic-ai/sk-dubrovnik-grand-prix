'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function DgpAdminPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState('');
  const [results, setResults] = useState([]);
  const [qualifiers, setQualifiers] = useState([]);
  const [message, setMessage] = useState('');

  async function loadTournaments() {
    const { data } = await supabase
      .from('tournaments')
      .select('id,name,start_date,event_stage,tournament_scope,category_code,status,published')
      .order('start_date', { ascending: false });
    setTournaments(data || []);
  }

  async function loadTournament(id) {
    if (!id) return;
    const { data: r } = await supabase
      .from('tournament_results')
      .select('id,player_id,final_rank,score,games_played,wins,draws,losses,rating_used,points_awarded,players(full_name)')
      .eq('tournament_id', id)
      .order('final_rank', { ascending: true, nullsFirst: false });
    setResults(r || []);

    const t = tournaments.find(x => String(x.id) === String(id));
    if (t?.event_stage === 'FINAL') {
      const { data: q } = await supabase
        .from('grand_prix_final_qualifiers')
        .select('id,final_slot,player_id,qualification_rank,qualification_points,status,replaced_player_id,players(full_name)')
        .eq('final_tournament_id', id)
        .order('final_slot', { ascending: true });
      setQualifiers(q || []);
    } else setQualifiers([]);
  }

  useEffect(() => { loadTournaments(); }, []);
  useEffect(() => { loadTournament(selected); }, [selected]);

  async function recalculate() {
    if (!selected) return;
    const { error } = await supabase.rpc('calculate_dgp_points', { p_tournament_id: Number(selected) });
    setMessage(error ? `Greška: ${error.message}` : 'Bodovi su ponovno izračunati.');
    loadTournament(selected);
  }

  async function refreshFinal() {
    if (!selected) return;
    const { error } = await supabase.rpc('refresh_dgp_final_qualifiers', { p_final_tournament_id: Number(selected) });
    setMessage(error ? `Greška: ${error.message}` : 'Kvalifikacije za finale su osvježene.');
    loadTournament(selected);
  }

  async function updateResult(id, field, value) {
    const numeric = value === '' ? null : Number(value);
    const { error } = await supabase.from('tournament_results').update({ [field]: numeric }).eq('id', id);
    if (error) setMessage(`Greška: ${error.message}`);
    else loadTournament(selected);
  }

  return (
    <main className="admin-shell" style={{ maxWidth: 1100 }}>
      <div className="admin-topbar">
        <h1>DGP upravljanje</h1>
        <a href="/admin/dashboard">← Admin panel</a>
      </div>
      <div className="admin-card">
        <h2>Turnir / rezultati</h2>
        <select value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Odaberi turnir…</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name} — {t.start_date || 'bez datuma'} — {t.event_stage || ''}</option>)}
        </select>
        {selected && <div style={{ display: 'flex', gap: 10, marginTop: 15, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={recalculate}>Ponovno izračunaj DGP bodove</button>
          {tournaments.find(t => String(t.id) === String(selected))?.event_stage === 'FINAL' && <button className="btn-primary" onClick={refreshFinal}>Osvježi kvalifikacije finala</button>}
        </div>}
        {message && <p>{message}</p>}
      </div>

      {qualifiers.length > 0 && <div className="admin-card">
        <h2>Finale — TOP 8</h2>
        {qualifiers.map(q => <div className="admin-list-item" key={q.id}>
          <strong>#{q.final_slot || '—'} {q.players?.full_name || `Igrač ${q.player_id}`}</strong>
          <span>{q.status} · rang {q.qualification_rank} · {q.qualification_points} bod.</span>
        </div>)}
      </div>}

      {results.length > 0 && <div className="admin-card">
        <h2>Rezultati</h2>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th>Igrač</th><th>Plasman</th><th>Score</th><th>Partije</th><th>Rejting</th><th>GP bodovi</th></tr></thead>
          <tbody>{results.map(r => <tr key={r.id}>
            <td>{r.players?.full_name || r.player_id}</td>
            <td><input type="number" value={r.final_rank ?? ''} onChange={e => updateResult(r.id, 'final_rank', e.target.value)} style={{ width: 70 }} /></td>
            <td><input type="number" step="0.5" value={r.score ?? ''} onChange={e => updateResult(r.id, 'score', e.target.value)} style={{ width: 80 }} /></td>
            <td><input type="number" value={r.games_played ?? ''} onChange={e => updateResult(r.id, 'games_played', e.target.value)} style={{ width: 70 }} /></td>
            <td>{r.rating_used ?? '—'}</td>
            <td>{r.points_awarded ?? 0}</td>
          </tr>)}</tbody>
        </table></div>
      </div>}
    </main>
  );
}
