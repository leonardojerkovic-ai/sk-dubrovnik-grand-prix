'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const CATEGORIES = ['S65', 'S50', 'U20', 'U16', 'U12', 'U1800', 'Akademija'];
const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/prijave', label: 'Prijave' },
  { href: '/admin/dgp', label: 'DGP' },
  { href: '/turniri', label: 'Javni turniri' },
  { href: '/dgp', label: 'Ljestvice' },
];

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function dateLabel(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('hr-HR');
}

function statusLabel(value) {
  const map = {
    REGISTERED: 'Prijavljena',
    CONFIRMED: 'Potvrđena',
    DECLINED: 'Odbijena',
    PUBLISHED: 'Objavljeno',
  };
  return map[value] || value || '—';
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [news, setNews] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [players, setPlayers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [ratingsByPlayer, setRatingsByPlayer] = useState({});
  const [loading, setLoading] = useState(true);

  const [newsForm, setNewsForm] = useState({ title: '', tag: '', excerpt: '', format: '', status: '' });
  const [tourForm, setTourForm] = useState({ name: '', description: '', format: '', tempo: '', starts_at: '', location: '' });
  const [playerForm, setPlayerForm] = useState({
    full_name: '', gender: '', title: '', club: 'ŠK Dubrovnik', category: CATEGORIES[0],
    is_member: true, general_gp_points: '', category_gp_points: '',
  });
  const [ratingForm, setRatingForm] = useState({ player_id: '', effective_month: currentMonthISO(), fide_standard: '', fide_rapid: '', fide_blitz: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/admin/login');
        return;
      }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, display_name')
        .eq('id', data.session.user.id)
        .maybeSingle();
      const currentRole = profile?.role;
      if (!['admin', 'super_admin'].includes(currentRole)) {
        await supabase.auth.signOut();
        router.push('/admin/login');
        return;
      }
      if (mounted) {
        setRole(currentRole);
        setSession(data.session);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!sess) router.push('/admin/login');
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function loadData() {
    setLoading(true);
    const [nRes, tRes, pRes, rRes, regRes, rankRes] = await Promise.all([
      supabase.from('news').select('*').order('published_at', { ascending: false }),
      supabase.from('tournaments').select('*').order('starts_at', { ascending: true }),
      supabase.from('players').select('*').order('full_name', { ascending: true }),
      supabase.from('player_ratings').select('*').order('effective_month', { ascending: false }),
      supabase.from('tournament_registrations').select('*').order('registered_at', { ascending: false }).limit(100),
      supabase.from('dgp_general_ranking').select('*').order('rank', { ascending: true }).limit(5),
    ]);

    setNews(nRes.data || []);
    setTournaments(tRes.data || []);
    setPlayers(pRes.data || []);
    setRegistrations(regRes.data || []);
    setRanking(rankRes.data || []);

    const latest = {};
    (rRes.data || []).forEach((row) => {
      if (!latest[row.player_id]) latest[row.player_id] = row;
    });
    setRatingsByPlayer(latest);
    setLoading(false);
  }

  useEffect(() => {
    if (session && role) loadData();
  }, [session, role]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  async function submitNews(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    const { error } = await supabase.from('news').insert([newsForm]);
    setSaving(false);
    if (error) return setMsg('Greška: ' + error.message);
    setNewsForm({ title: '', tag: '', excerpt: '', format: '', status: '' });
    setMsg('Vijest spremljena.'); loadData();
  }

  async function submitTournament(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    const { error } = await supabase.from('tournaments').insert([tourForm]);
    setSaving(false);
    if (error) return setMsg('Greška: ' + error.message);
    setTourForm({ name: '', description: '', format: '', tempo: '', starts_at: '', location: '' });
    setMsg('Turnir spremljen.'); loadData();
  }

  async function submitPlayer(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    const payload = {
      ...playerForm,
      general_gp_points: playerForm.general_gp_points === '' ? 0 : Number(playerForm.general_gp_points),
      category_gp_points: playerForm.category_gp_points === '' ? 0 : Number(playerForm.category_gp_points),
    };
    const { error } = await supabase.from('players').insert([payload]);
    setSaving(false);
    if (error) return setMsg('Greška: ' + error.message);
    setPlayerForm({ full_name: '', gender: '', title: '', club: 'ŠK Dubrovnik', category: CATEGORIES[0], is_member: true, general_gp_points: '', category_gp_points: '' });
    setMsg('Igrač spremljen.'); loadData();
  }

  async function submitRating(e) {
    e.preventDefault();
    if (!ratingForm.player_id) return setMsg('Odaberi igrača za kojeg unosiš rejting.');
    setSaving(true); setMsg('');
    const payload = {
      player_id: Number(ratingForm.player_id),
      effective_month: ratingForm.effective_month,
      fide_standard: ratingForm.fide_standard === '' ? null : Number(ratingForm.fide_standard),
      fide_rapid: ratingForm.fide_rapid === '' ? null : Number(ratingForm.fide_rapid),
      fide_blitz: ratingForm.fide_blitz === '' ? null : Number(ratingForm.fide_blitz),
    };
    const { error } = await supabase.from('player_ratings').upsert([payload], { onConflict: 'player_id,effective_month' });
    setSaving(false);
    if (error) return setMsg('Greška: ' + error.message);
    setMsg('Rejting spremljen za odabrani mjesec.'); loadData();
  }

  async function deleteNews(id) {
    if (!confirm('Obrisati ovu vijest?')) return;
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) setMsg('Greška: ' + error.message); else loadData();
  }

  async function deleteTournament(id) {
    if (!confirm('Obrisati ovaj turnir?')) return;
    const { error } = await supabase.from('tournaments').delete().eq('id', id);
    if (error) setMsg('Greška: ' + error.message); else loadData();
  }

  async function deletePlayer(id) {
    if (!confirm('Obrisati ovog igrača i njegovu povijest rejtinga?')) return;
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) setMsg('Greška: ' + error.message); else loadData();
  }

  const publishedNews = useMemo(() => news.filter((n) => n.published === true || n.status === 'PUBLISHED' || n.status === 'published'), [news]);
  const openTournaments = useMemo(() => tournaments.filter((t) => t.published === true && !t.is_final), [tournaments]);
  const upcoming = useMemo(() => tournaments.filter((t) => t.starts_at && new Date(t.starts_at) >= new Date()).slice(0, 5), [tournaments]);
  const registrationStats = useMemo(() => ({
    total: registrations.length,
    registered: registrations.filter((r) => r.status === 'REGISTERED').length,
    confirmed: registrations.filter((r) => r.status === 'CONFIRMED').length,
    declined: registrations.filter((r) => r.status === 'DECLINED').length,
  }), [registrations]);

  if (session === undefined) return <div className="admin-shell">Provjera prijave…</div>;
  if (!session || !role) return null;

  const card = { background: 'var(--surface, #fff)', border: '1px solid var(--line, #e7e2d8)', borderRadius: 18, padding: 22, boxShadow: '0 10px 30px rgba(20, 30, 50, .06)' };
  const muted = { color: 'var(--ink-soft)', fontSize: '.9rem' };
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 };

  return (
    <div className="admin-shell" style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 18px 60px' }}>
      <div className="admin-topbar" style={{ marginBottom: 18 }}>
        <div>
          <div style={{ ...muted, marginBottom: 3 }}>ŠK Dubrovnik · Grand Prix</div>
          <h1 style={{ fontSize: '1.7rem', color: 'var(--navy)', margin: 0 }}>Admin Dashboard</h1>
        </div>
        <button className="btn-danger" onClick={handleLogout}>Odjava</button>
      </div>

      <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {NAV.map((item) => (
          <button key={item.href} type="button" onClick={() => router.push(item.href)} className="btn-secondary" style={{ cursor: 'pointer' }}>
            {item.label}
          </button>
        ))}
      </nav>

      <section style={{ ...card, marginBottom: 18, background: 'linear-gradient(135deg, var(--navy, #17243a), #263b5b)', color: '#fff', border: 0 }}>
        <div style={{ ...muted, color: 'rgba(255,255,255,.7)', marginBottom: 6 }}>Kontrolni centar</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 'clamp(1.6rem, 4vw, 2.35rem)', color: '#fff' }}>Dobrodošli u Admin panel</h2>
        <p style={{ margin: 0, maxWidth: 720, color: 'rgba(255,255,255,.82)', lineHeight: 1.6 }}>
          Na jednom mjestu pratite igrače, turnire, prijave, vijesti i DGP ljestvice. Operativne radnje ostaju zaštićene administratorskim ovlastima.
        </p>
      </section>

      {msg && <div style={{ ...card, marginBottom: 18, padding: 14 }}>{msg}</div>}

      <section style={{ ...grid, marginBottom: 18 }}>
        {[
          ['Igrači', players.length, 'Ukupna baza igrača'],
          ['Turniri', tournaments.length, `${openTournaments.length} objavljenih/open`],
          ['Prijave', registrationStats.total, `${registrationStats.confirmed} potvrđenih`],
          ['Vijesti', publishedNews.length, 'Objavljene vijesti'],
        ].map(([label, value, note]) => (
          <div key={label} style={card}>
            <div style={muted}>{label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.2, margin: '7px 0' }}>{loading ? '…' : value}</div>
            <div style={muted}>{note}</div>
          </div>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(280px, .9fr)', gap: 18, marginBottom: 18 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <div><h2 style={{ margin: 0, color: 'var(--navy)' }}>DGP — vodeći igrači</h2><div style={muted}>Opća Grand Prix ljestvica</div></div>
            <button className="btn-primary" onClick={() => router.push('/dgp')}>Otvori ljestvicu</button>
          </div>
          {ranking.length === 0 ? <p style={muted}>Ljestvica trenutno nema podataka.</p> : ranking.map((r, i) => {
            const name = r.full_name || r.player_name || `Igrač #${r.player_id ?? i + 1}`;
            const points = r.points ?? r.general_gp_points ?? r.total_points ?? 0;
            return <div key={r.player_id ?? i} className="admin-list-item"><div><strong>{r.rank ?? i + 1}. {name}</strong><div style={muted}>{r.is_member ? 'Član ŠK Dubrovnik' : 'Nije član'}</div></div><strong>{points} bod.</strong></div>;
          })}
        </div>

        <div style={card}>
          <h2 style={{ margin: '0 0 4px', color: 'var(--navy)' }}>Prijave</h2>
          <div style={{ ...muted, marginBottom: 14 }}>Zadnje prijave na turnire</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
            <div style={{ textAlign: 'center', padding: 10, borderRadius: 12, background: 'var(--background, #f7f5f0)' }}><strong>{registrationStats.registered}</strong><div style={muted}>nove</div></div>
            <div style={{ textAlign: 'center', padding: 10, borderRadius: 12, background: 'var(--background, #f7f5f0)' }}><strong>{registrationStats.confirmed}</strong><div style={muted}>potvrđene</div></div>
            <div style={{ textAlign: 'center', padding: 10, borderRadius: 12, background: 'var(--background, #f7f5f0)' }}><strong>{registrationStats.declined}</strong><div style={muted}>odbijene</div></div>
          </div>
          {registrations.slice(0, 5).map((r) => <div key={r.id} className="admin-list-item"><div><strong>{r.full_name}</strong><div style={muted}>{statusLabel(r.status)} · {dateLabel(r.registered_at)}</div></div></div>)}
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => router.push('/admin/prijave')}>Upravljaj prijavama</button>
        </div>
      </section>

      <section style={{ ...card, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div><h2 style={{ margin: 0, color: 'var(--navy)' }}>Nadolazeći turniri</h2><div style={muted}>Operativni pregled kalendara</div></div>
          <button className="btn-secondary" onClick={() => router.push('/turniri')}>Javni prikaz</button>
        </div>
        {upcoming.length === 0 ? <p style={muted}>Nema nadolazećih turnira.</p> : upcoming.map((t) => <div key={t.id} className="admin-list-item"><div><strong>{t.name}</strong><div style={muted}>{dateLabel(t.starts_at)}{t.location ? ` · ${t.location}` : ''}</div></div><span style={muted}>{t.published ? 'Objavljen' : 'Radna verzija'}</span></div>)}
      </section>

      <section style={{ ...grid, marginBottom: 18 }}>
        <div style={card}><h2 style={{ marginTop: 0, color: 'var(--navy)' }}>Brze radnje</h2><div style={{ display: 'grid', gap: 10 }}>
          <button className="btn-primary" onClick={() => document.getElementById('nova-vijest')?.scrollIntoView({ behavior: 'smooth' })}>+ Nova vijest</button>
          <button className="btn-primary" onClick={() => document.getElementById('novi-turnir')?.scrollIntoView({ behavior: 'smooth' })}>+ Novi turnir</button>
          <button className="btn-primary" onClick={() => document.getElementById('novi-igrac')?.scrollIntoView({ behavior: 'smooth' })}>+ Novi igrač</button>
          <button className="btn-primary" onClick={() => document.getElementById('novi-rejting')?.scrollIntoView({ behavior: 'smooth' })}>+ Mjesečni rejting</button>
        </div></div>
        <div style={card}><h2 style={{ marginTop: 0, color: 'var(--navy)' }}>Status sustava</h2><div style={{ display: 'grid', gap: 10 }}>
          <div className="admin-list-item"><span>Ovlasti</span><strong>{role === 'super_admin' ? 'Super admin' : 'Admin'}</strong></div>
          <div className="admin-list-item"><span>DGP ljestvica</span><strong>{ranking.length ? 'Aktivna' : 'Bez podataka'}</strong></div>
          <div className="admin-list-item"><span>Registracije</span><strong>Zaštićene</strong></div>
        </div></div>
      </section>

      <section id="nova-vijest" style={{ ...card, marginBottom: 18 }}>
        <h2 style={{ color: 'var(--navy)' }}>Nova vijest</h2>
        <form onSubmit={submitNews}>
          <div className="field"><label>Naslov</label><input value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} required /></div>
          <div className="field"><label>Oznaka</label><input placeholder="npr. Prijave otvorene" value={newsForm.tag} onChange={(e) => setNewsForm({ ...newsForm, tag: e.target.value })} /></div>
          <div className="field"><label>Kratki opis</label><textarea value={newsForm.excerpt} onChange={(e) => setNewsForm({ ...newsForm, excerpt: e.target.value })} /></div>
          <div className="field"><label>Format</label><input placeholder="npr. Švicarski" value={newsForm.format} onChange={(e) => setNewsForm({ ...newsForm, format: e.target.value })} /></div>
          <div className="field"><label>Status</label><input placeholder="npr. Prijave otvorene" value={newsForm.status} onChange={(e) => setNewsForm({ ...newsForm, status: e.target.value })} /></div>
          <button className="btn-primary" type="submit" disabled={saving}>Spremi vijest</button>
        </form>
        {news.slice(0, 5).map((n) => <div className="admin-list-item" key={n.id}><div><strong>{n.title}</strong>{n.tag && <div style={muted}>{n.tag}</div>}</div><button className="btn-danger" onClick={() => deleteNews(n.id)}>Obriši</button></div>)}
      </section>

      <section id="novi-turnir" style={{ ...card, marginBottom: 18 }}>
        <h2 style={{ color: 'var(--navy)' }}>Novi turnir</h2>
        <form onSubmit={submitTournament}>
          <div className="field"><label>Naziv</label><input value={tourForm.name} onChange={(e) => setTourForm({ ...tourForm, name: e.target.value })} required /></div>
          <div className="field"><label>Opis</label><textarea value={tourForm.description} onChange={(e) => setTourForm({ ...tourForm, description: e.target.value })} /></div>
          <div className="field"><label>Format</label><input placeholder="npr. Švicarski sustav, 7 kola" value={tourForm.format} onChange={(e) => setTourForm({ ...tourForm, format: e.target.value })} /></div>
          <div className="field"><label>Tempo</label><input placeholder="npr. 90 min + 30 sek/potez" value={tourForm.tempo} onChange={(e) => setTourForm({ ...tourForm, tempo: e.target.value })} /></div>
          <div className="field"><label>Datum početka</label><input type="date" value={tourForm.starts_at} onChange={(e) => setTourForm({ ...tourForm, starts_at: e.target.value })} /></div>
          <div className="field"><label>Lokacija</label><input value={tourForm.location} onChange={(e) => setTourForm({ ...tourForm, location: e.target.value })} /></div>
          <button className="btn-primary" type="submit" disabled={saving}>Spremi turnir</button>
        </form>
        {tournaments.slice(0, 6).map((t) => <div className="admin-list-item" key={t.id}><div><strong>{t.name}</strong><div style={muted}>{dateLabel(t.starts_at)}</div></div><button className="btn-danger" onClick={() => deleteTournament(t.id)}>Obriši</button></div>)}
      </section>

      <section id="novi-igrac" style={{ ...card, marginBottom: 18 }}>
        <h2 style={{ color: 'var(--navy)' }}>Novi igrač</h2>
        <form onSubmit={submitPlayer}>
          <div className="field"><label>Ime i prezime</label><input value={playerForm.full_name} onChange={(e) => setPlayerForm({ ...playerForm, full_name: e.target.value })} required /></div>
          <div className="field"><label>Spol</label><select value={playerForm.gender} onChange={(e) => setPlayerForm({ ...playerForm, gender: e.target.value })}><option value="">—</option><option value="M">M</option><option value="Ž">Ž</option></select></div>
          <div className="field"><label>Titula</label><input placeholder="npr. FM, WCM" value={playerForm.title} onChange={(e) => setPlayerForm({ ...playerForm, title: e.target.value })} /></div>
          <div className="field"><label>Klub</label><input value={playerForm.club} onChange={(e) => setPlayerForm({ ...playerForm, club: e.target.value })} /></div>
          <div className="field"><label>Kategorija</label><select value={playerForm.category} onChange={(e) => setPlayerForm({ ...playerForm, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="field"><label><input type="checkbox" checked={playerForm.is_member} onChange={(e) => setPlayerForm({ ...playerForm, is_member: e.target.checked })} style={{ width: 'auto', marginRight: 8 }} />Član ŠK Dubrovnik</label></div>
          <div className="field"><label>Bodovi — Opći GP</label><input type="number" step="0.5" value={playerForm.general_gp_points} onChange={(e) => setPlayerForm({ ...playerForm, general_gp_points: e.target.value })} /></div>
          <div className="field"><label>Bodovi — Kategorijski GP</label><input type="number" step="0.5" value={playerForm.category_gp_points} onChange={(e) => setPlayerForm({ ...playerForm, category_gp_points: e.target.value })} /></div>
          <button className="btn-primary" type="submit" disabled={saving}>Spremi igrača</button>
        </form>
        {players.slice(0, 8).map((p) => <div className="admin-list-item" key={p.id}><div><strong>{p.title ? `${p.title} ` : ''}{p.full_name}</strong><div style={muted}>{p.category} · {p.club}{p.is_member ? '' : ' · nije član'}</div></div><button className="btn-danger" onClick={() => deletePlayer(p.id)}>Obriši</button></div>)}
      </section>

      <section id="novi-rejting" style={card}>
        <h2 style={{ color: 'var(--navy)' }}>Mjesečni rejting igrača</h2>
        <p style={{ ...muted, marginBottom: 16 }}>Svaki mjesec ostaje sačuvan zasebno, tako da povijest turnira može koristiti rejting koji je vrijedio u tom razdoblju.</p>
        <form onSubmit={submitRating}>
          <div className="field"><label>Igrač</label><select value={ratingForm.player_id} onChange={(e) => setRatingForm({ ...ratingForm, player_id: e.target.value })} required><option value="">— odaberi igrača —</option>{players.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
          <div className="field"><label>Mjesec</label><input type="date" value={ratingForm.effective_month} onChange={(e) => setRatingForm({ ...ratingForm, effective_month: e.target.value })} required /></div>
          <div className="field"><label>FIDE Standard</label><input type="number" value={ratingForm.fide_standard} onChange={(e) => setRatingForm({ ...ratingForm, fide_standard: e.target.value })} /></div>
          <div className="field"><label>FIDE Rapid</label><input type="number" value={ratingForm.fide_rapid} onChange={(e) => setRatingForm({ ...ratingForm, fide_rapid: e.target.value })} /></div>
          <div className="field"><label>FIDE Blitz</label><input type="number" value={ratingForm.fide_blitz} onChange={(e) => setRatingForm({ ...ratingForm, fide_blitz: e.target.value })} /></div>
          <button className="btn-primary" type="submit" disabled={saving}>Spremi rejting za odabrani mjesec</button>
        </form>
        {players.slice(0, 8).map((p) => {
          const r = ratingsByPlayer[p.id];
          return <div className="admin-list-item" key={p.id}><div><strong>{p.full_name}</strong><div style={muted}>{r ? `Std ${r.fide_standard ?? '—'} · Rapid ${r.fide_rapid ?? '—'} · Blitz ${r.fide_blitz ?? '—'} · ${dateLabel(r.effective_month)}` : 'Još nema unesenog rejtinga'}</div></div></div>;
        })}
      </section>
    </div>
  );
}
