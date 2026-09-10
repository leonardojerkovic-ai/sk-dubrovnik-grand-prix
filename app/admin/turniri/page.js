'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const EMPTY_FORM = {
  name: '', description: '', season_id: '', format: '', tempo: '',
  start_date: '', end_date: '', registration_deadline: '', location: '',
  status: 'najavljen', tournament_type: 'DGP', tournament_level: 'REGULAR',
  tournament_scope: 'GENERAL', category_code: '', event_stage: 'REGULAR',
  access_type: 'OPEN', max_players: '', rounds: '', fide_rated: false, published: false,
};

const STATUS = [
  ['najavljen', 'Najavljen'],
  ['prijave_otvorene', 'Prijave otvorene'],
  ['zavrsen', 'Završen'],
];

const CATEGORIES = [
  ['', 'Opći GP'], ['U12', 'U12'], ['U16', 'U16'], ['U20', 'U20'],
  ['WOMEN', 'Žene'], ['S50', 'S50'], ['S65', 'S65'], ['U1800', 'U1800'], ['ACADEMY', 'Akademija'],
];

function formatDate(value) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString('hr-HR') : '—';
}

function statusLabel(value) {
  return STATUS.find(([code]) => code === value)?.[1] || value || '—';
}

function stageLabel(value) {
  return value === 'FINAL' ? 'Finale' : 'Regularni';
}

function categoryLabel(value) {
  return CATEGORIES.find(([code]) => code === (value || ''))?.[1] || value || 'Opći GP';
}

function validateForm(form) {
  const errors = [];
  if (!form.name.trim()) errors.push('Naziv turnira je obavezan.');
  if (!form.season_id) errors.push('Sezona je obavezna.');
  if (!form.start_date) errors.push('Datum početka je obavezan.');
  if (!form.end_date) errors.push('Datum završetka je obavezan.');
  if (form.start_date && form.end_date && form.end_date < form.start_date) errors.push('Datum završetka ne može biti prije početka.');
  if (form.registration_deadline && form.start_date) {
    const deadline = new Date(form.registration_deadline);
    const start = new Date(`${form.start_date}T23:59:59`);
    if (deadline > start) errors.push('Rok prijave mora biti prije početka turnira ili najkasnije na dan početka.');
  }
  if (form.max_players !== '' && (!Number.isInteger(Number(form.max_players)) || Number(form.max_players) < 1)) errors.push('Maksimalan broj igrača mora biti cijeli broj veći od 0.');
  if (form.rounds !== '' && (!Number.isInteger(Number(form.rounds)) || Number(form.rounds) < 1)) errors.push('Broj kola mora biti cijeli broj veći od 0.');
  if (form.event_stage === 'FINAL' && form.category_code && !['U20'].includes(form.category_code)) {
    errors.push('Za kategorijsko finale trenutno je dopušten U20; opći Finale ostaje bez category_code.');
  }
  if (form.event_stage === 'FINAL' && form.category_code === 'U20' && form.tournament_scope !== 'U20') errors.push('U20 Finale mora imati opseg U20.');
  return errors;
}

export default function AdminTournamentsPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ season: '', status: '', category: '', stage: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push('/admin/login');
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', data.session.user.id).maybeSingle();
      if (!['admin', 'super_admin'].includes(profile?.role)) {
        await supabase.auth.signOut();
        return router.push('/admin/login');
      }
      if (mounted) { setSession(data.session); setRole(profile.role); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => { if (!sess) router.push('/admin/login'); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [router]);

  async function loadData() {
    setLoading(true); setError('');
    const [tRes, sRes] = await Promise.all([
      supabase.from('tournaments').select('*').order('start_date', { ascending: false }).order('starts_at', { ascending: false }),
      supabase.from('seasons').select('id,code,name,start_date,end_date,is_active').order('start_date', { ascending: false }),
    ]);
    if (tRes.error) setError(tRes.error.message);
    else setTournaments(tRes.data || []);
    if (sRes.error) setError((prev) => prev || sRes.error.message);
    else setSeasons(sRes.data || []);
    setLoading(false);
  }

  useEffect(() => { if (session && role) loadData(); }, [session, role]);

  const filtered = useMemo(() => tournaments.filter((t) => {
    if (filters.season && String(t.season_id) !== filters.season) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.category && (t.category_code || '') !== filters.category) return false;
    if (filters.stage && (t.event_stage || 'REGULAR') !== filters.stage) return false;
    return true;
  }), [tournaments, filters]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage(''); setError('');
  }

  function startCreate() {
    const active = seasons.find((s) => s.is_active) || seasons[0];
    setEditingId(null);
    setForm({ ...EMPTY_FORM, season_id: active ? String(active.id) : '' });
    setMessage(''); setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEdit(t) {
    setEditingId(t.id);
    setForm({
      ...EMPTY_FORM,
      ...t,
      season_id: t.season_id ? String(t.season_id) : '',
      start_date: t.start_date || t.starts_at || '',
      end_date: t.end_date || '',
      registration_deadline: t.registration_deadline ? new Date(t.registration_deadline).toISOString().slice(0, 16) : '',
      max_players: t.max_players ?? '', rounds: t.rounds ?? '',
      fide_rated: Boolean(t.fide_rated), published: Boolean(t.published),
    });
    setMessage(''); setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveTournament(e) {
    e.preventDefault();
    const validation = validateForm(form);
    if (validation.length) { setError(validation.join(' ')); return; }
    setSaving(true); setMessage(''); setError('');
    const payload = {
      name: form.name.trim(), description: form.description.trim() || null,
      season_id: Number(form.season_id), format: form.format.trim() || null,
      tempo: form.tempo.trim() || null, starts_at: form.start_date || null,
      start_date: form.start_date || null, end_date: form.end_date || null,
      registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : null,
      location: form.location.trim() || null, status: form.status,
      tournament_type: form.tournament_type.trim() || null,
      tournament_level: form.tournament_level.trim() || null,
      tournament_scope: form.tournament_scope.trim() || 'GENERAL',
      category_code: form.category_code || null, event_stage: form.event_stage,
      access_type: form.access_type || 'OPEN', max_players: form.max_players === '' ? null : Number(form.max_players),
      rounds: form.rounds === '' ? null : Number(form.rounds), fide_rated: Boolean(form.fide_rated), published: Boolean(form.published),
    };
    const query = editingId
      ? supabase.from('tournaments').update(payload).eq('id', editingId)
      : supabase.from('tournaments').insert(payload).select('id').single();
    const { error: saveError } = await query;
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    setMessage(editingId ? 'Turnir je ažuriran.' : 'Turnir je kreiran.');
    setEditingId(null); setForm(EMPTY_FORM); await loadData();
  }

  async function togglePublished(tournament) {
    setMessage(''); setError('');
    const next = !tournament.published;
    const validation = validateForm({ ...EMPTY_FORM, ...tournament, season_id: tournament.season_id ? String(tournament.season_id) : '', start_date: tournament.start_date || tournament.starts_at || '', end_date: tournament.end_date || '', max_players: tournament.max_players ?? '' });
    if (next && validation.length) { setError(`Turnir se ne može objaviti: ${validation.join(' ')}`); return; }
    const { error: updateError } = await supabase.from('tournaments').update({ published: next }).eq('id', tournament.id);
    if (updateError) setError(updateError.message); else { setMessage(next ? 'Turnir je objavljen.' : 'Objava je povučena.'); loadData(); }
  }

  async function deleteTournament(tournament) {
    if (!window.confirm(`Obrisati turnir „${tournament.name}“?`)) return;
    setMessage(''); setError('');
    const { error: deleteError } = await supabase.from('tournaments').delete().eq('id', tournament.id);
    if (deleteError) setError(`Turnir se ne može obrisati: ${deleteError.message}`);
    else { setMessage('Turnir je obrisan.'); if (editingId === tournament.id) startCreate(); loadData(); }
  }

  if (session === undefined) return <div className="admin-shell">Provjera prijave…</div>;
  if (!session || !role) return null;

  const card = { background: 'var(--surface, #fff)', border: '1px solid var(--line, #e7e2d8)', borderRadius: 18, padding: 22, boxShadow: '0 10px 30px rgba(20,30,50,.06)' };
  const input = { width: '100%', border: '1px solid var(--line, #ddd7cb)', borderRadius: 10, padding: '10px 12px', background: '#fff', color: 'var(--ink, #17243a)' };
  const label = { display: 'grid', gap: 6, fontWeight: 650, fontSize: '.9rem' };

  return <div className="admin-shell" style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 18px 60px' }}>
    <div className="admin-topbar" style={{ marginBottom: 18 }}>
      <div><div style={{ color: 'var(--ink-soft)', fontSize: '.9rem' }}>ŠK Dubrovnik · Faza 3A</div><h1 style={{ margin: 0, color: 'var(--navy)' }}>Upravljanje turnirima</h1></div>
      <button className="btn-secondary" onClick={() => router.push('/admin/dashboard')}>← Dashboard</button>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px,.9fr) minmax(0,1.4fr)', gap: 18, alignItems: 'start' }}>
      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 18 }}>
          <div><span style={{ color: 'var(--ink-soft)', fontSize: '.82rem' }}>{editingId ? 'UREĐIVANJE' : 'NOVI TURNIR'}</span><h2 style={{ margin: '3px 0 0', color: 'var(--navy)' }}>{editingId ? `Turnir #${editingId}` : 'Kreiraj turnir'}</h2></div>
          {editingId && <button className="btn-secondary" onClick={startCreate}>Novi</button>}
        </div>
        {error && <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: '#fff1f0', border: '1px solid #f0c8c5', color: '#8d2c25' }}>{error}</div>}
        {message && <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: '#eef8f1', border: '1px solid #c6e2cf', color: '#24633a' }}>{message}</div>}
        <form onSubmit={saveTournament} style={{ display: 'grid', gap: 13 }}>
          <label style={label}>Naziv *<input style={input} value={form.name} onChange={(e) => update('name', e.target.value)} /></label>
          <label style={label}>Sezona *<select style={input} value={form.season_id} onChange={(e) => update('season_id', e.target.value)}><option value="">Odaberi sezonu</option>{seasons.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></label>
          <label style={label}>Opis<textarea style={{ ...input, minHeight: 80 }} value={form.description} onChange={(e) => update('description', e.target.value)} /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={label}>Početak *<input type="date" style={input} value={form.start_date} onChange={(e) => update('start_date', e.target.value)} /></label>
            <label style={label}>Završetak *<input type="date" style={input} value={form.end_date} onChange={(e) => update('end_date', e.target.value)} /></label>
          </div>
          <label style={label}>Rok prijave<input type="datetime-local" style={input} value={form.registration_deadline} onChange={(e) => update('registration_deadline', e.target.value)} /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={label}>Format<input style={input} value={form.format} onChange={(e) => update('format', e.target.value)} placeholder="Swiss" /></label>
            <label style={label}>Tempo<input style={input} value={form.tempo} onChange={(e) => update('tempo', e.target.value)} placeholder="Rapid" /></label>
          </div>
          <label style={label}>Lokacija<input style={input} value={form.location} onChange={(e) => update('location', e.target.value)} /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={label}>Status<select style={input} value={form.status} onChange={(e) => update('status', e.target.value)}>{STATUS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label style={label}>Faza<select style={input} value={form.event_stage} onChange={(e) => update('event_stage', e.target.value)}><option value="REGULAR">Regularni</option><option value="FINAL">Finale</option></select></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={label}>Kategorija<select style={input} value={form.category_code} onChange={(e) => { const v=e.target.value; update('category_code', v); if(v) update('tournament_scope', v); else update('tournament_scope','GENERAL'); }}>{CATEGORIES.map(([v,l]) => <option key={v || 'general'} value={v}>{l}</option>)}</select></label>
            <label style={label}>Pristup<select style={input} value={form.access_type} onChange={(e) => update('access_type', e.target.value)}><option value="OPEN">Otvoren</option><option value="MEMBERS_ONLY">Samo članovi</option></select></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={label}>Maks. igrača<input type="number" min="1" style={input} value={form.max_players} onChange={(e) => update('max_players', e.target.value)} /></label>
            <label style={label}>Broj kola<input type="number" min="1" style={input} value={form.rounds} onChange={(e) => update('rounds', e.target.value)} /></label>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.fide_rated} onChange={(e) => update('fide_rated', e.target.checked)} /> FIDE rejting</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.published} onChange={(e) => update('published', e.target.checked)} /> Objavi javnosti</label>
          <button className="btn-primary" disabled={saving}>{saving ? 'Spremanje…' : editingId ? 'Spremi izmjene' : 'Kreiraj turnir'}</button>
        </form>
      </section>

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}><div><span style={{ color: 'var(--ink-soft)', fontSize: '.82rem' }}>ADMIN POPIS</span><h2 style={{ margin: '3px 0 0', color: 'var(--navy)' }}>Turniri</h2></div><button className="btn-primary" onClick={startCreate}>+ Novi turnir</button></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
          <select style={input} value={filters.season} onChange={(e) => setFilters((p) => ({ ...p, season: e.target.value }))}><option value="">Sve sezone</option>{seasons.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}</select>
          <select style={input} value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}><option value="">Svi statusi</option>{STATUS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select style={input} value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}><option value="">Sve kategorije</option>{CATEGORIES.slice(1).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select style={input} value={filters.stage} onChange={(e) => setFilters((p) => ({ ...p, stage: e.target.value }))}><option value="">Sve faze</option><option value="REGULAR">Regularni</option><option value="FINAL">Finale</option></select>
        </div>
        {loading ? <p>Učitavanje…</p> : filtered.length === 0 ? <p style={{ color: 'var(--ink-soft)' }}>Nema turnira za odabrane filtere.</p> : <div style={{ display: 'grid', gap: 9 }}>
          {filtered.map((t) => <article key={t.id} style={{ border: '1px solid var(--line,#e7e2d8)', borderRadius: 13, padding: 14, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, alignItems: 'center' }}>
            <div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 5 }}><span className="status-pill">{t.published ? 'Objavljen' : 'Skriven'}</span><span className="status-pill">{statusLabel(t.status)}</span><span className="status-pill">{stageLabel(t.event_stage)}</span><span className="status-pill">{categoryLabel(t.category_code)}</span></div><strong style={{ color: 'var(--navy)' }}>{t.name}</strong><div style={{ color: 'var(--ink-soft)', fontSize: '.88rem', marginTop: 4 }}>{formatDate(t.start_date || t.starts_at)} · {t.location || 'Lokacija nije navedena'} · {t.max_players ? `${t.max_players} mjesta` : 'bez limita'}</div></div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}><button className="btn-secondary" onClick={() => startEdit(t)}>Uredi</button><button className={t.published ? 'btn-secondary' : 'btn-primary'} onClick={() => togglePublished(t)}>{t.published ? 'Povuci objavu' : 'Objavi'}</button><button className="btn-danger" onClick={() => deleteTournament(t)}>Obriši</button></div>
          </article>)}
        </div>}
      </section>
    </div>
  </div>;
}
