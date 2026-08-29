'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const CATEGORIES = ['S65', 'S50', 'U20', 'U16', 'U12', 'U1800', 'Akademija'];

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = još provjeravamo
  const [news, setNews] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [players, setPlayers] = useState([]);
  const [ratingsByPlayer, setRatingsByPlayer] = useState({}); // player_id -> najnoviji rating red

  const [newsForm, setNewsForm] = useState({
    title: '', tag: '', excerpt: '', format: '', status: '',
  });
  const [tourForm, setTourForm] = useState({
    name: '', description: '', format: '', tempo: '', starts_at: '', location: '',
  });
  const [playerForm, setPlayerForm] = useState({
    full_name: '', gender: '', title: '', club: 'ŠK Dubrovnik', category: CATEGORIES[0],
    is_member: true, general_gp_points: '', category_gp_points: '',
  });
  const [ratingForm, setRatingForm] = useState({
    player_id: '', effective_month: currentMonthISO(),
    fide_standard: '', fide_rapid: '', fide_blitz: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Provjeri je li netko prijavljen; ako nije, natrag na login
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/admin/login');
      } else {
        setSession(data.session);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!sess) router.push('/admin/login');
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  async function loadData() {
    const { data: n } = await supabase.from('news').select('*').order('published_at', { ascending: false });
    const { data: t } = await supabase.from('tournaments').select('*').order('starts_at', { ascending: true });
    const { data: p } = await supabase.from('players').select('*').order('full_name', { ascending: true });
    const { data: r } = await supabase
      .from('player_ratings')
      .select('*')
      .order('effective_month', { ascending: false });

    setNews(n || []);
    setTournaments(t || []);
    setPlayers(p || []);

    // Za svakog igrača zadrži samo NAJNOVIJI rating red (lista je već sortirana od najnovijeg)
    const latest = {};
    (r || []).forEach((row) => {
      if (!latest[row.player_id]) latest[row.player_id] = row;
    });
    setRatingsByPlayer(latest);
  }

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  async function submitNews(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const { error } = await supabase.from('news').insert([newsForm]);
    setSaving(false);
    if (error) {
      setMsg('Greška: ' + error.message);
      return;
    }
    setNewsForm({ title: '', tag: '', excerpt: '', format: '', status: '' });
    setMsg('Vijest spremljena.');
    loadData();
  }

  async function submitTournament(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const { error } = await supabase.from('tournaments').insert([tourForm]);
    setSaving(false);
    if (error) {
      setMsg('Greška: ' + error.message);
      return;
    }
    setTourForm({ name: '', description: '', format: '', tempo: '', starts_at: '', location: '' });
    setMsg('Turnir spremljen.');
    loadData();
  }

  async function submitPlayer(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const payload = {
      ...playerForm,
      general_gp_points: playerForm.general_gp_points === '' ? 0 : Number(playerForm.general_gp_points),
      category_gp_points: playerForm.category_gp_points === '' ? 0 : Number(playerForm.category_gp_points),
    };
    const { error } = await supabase.from('players').insert([payload]);
    setSaving(false);
    if (error) {
      setMsg('Greška: ' + error.message);
      return;
    }
    setPlayerForm({
      full_name: '', gender: '', title: '', club: 'ŠK Dubrovnik', category: CATEGORIES[0],
      is_member: true, general_gp_points: '', category_gp_points: '',
    });
    setMsg('Igrač spremljen. Sad mu dodaj rejting u sekciji ispod.');
    loadData();
  }

  async function submitRating(e) {
    e.preventDefault();
    if (!ratingForm.player_id) {
      setMsg('Odaberi igrača za kojeg unosiš rejting.');
      return;
    }
    setSaving(true);
    setMsg('');
    const payload = {
      player_id: Number(ratingForm.player_id),
      effective_month: ratingForm.effective_month,
      fide_standard: ratingForm.fide_standard === '' ? null : Number(ratingForm.fide_standard),
      fide_rapid: ratingForm.fide_rapid === '' ? null : Number(ratingForm.fide_rapid),
      fide_blitz: ratingForm.fide_blitz === '' ? null : Number(ratingForm.fide_blitz),
    };
    // upsert: ako za tog igrača i taj mjesec već postoji red, prepiši ga
    // (spriječava duple redove ako netko dvaput unese isti mjesec)
    const { error } = await supabase
      .from('player_ratings')
      .upsert([payload], { onConflict: 'player_id,effective_month' });
    setSaving(false);
    if (error) {
      setMsg('Greška: ' + error.message);
      return;
    }
    setMsg('Rejting spremljen za odabrani mjesec. Stari mjeseci ostaju netaknuti u povijesti.');
    loadData();
  }

  async function deleteNews(id) {
    if (!confirm('Obrisati ovu vijest?')) return;
    await supabase.from('news').delete().eq('id', id);
    loadData();
  }

  async function deleteTournament(id) {
    if (!confirm('Obrisati ovaj turnir?')) return;
    await supabase.from('tournaments').delete().eq('id', id);
    loadData();
  }

  async function deletePlayer(id) {
    if (!confirm('Obrisati ovog igrača (i cijelu povijest njegovih rejtinga)?')) return;
    await supabase.from('players').delete().eq('id', id);
    loadData();
  }

  if (session === undefined) {
    return <div className="admin-shell">Provjera prijave…</div>;
  }

  return (
    <div className="admin-shell" style={{ maxWidth: 780 }}>
      <div className="admin-topbar">
        <h1 style={{ fontSize: '1.6rem', color: 'var(--navy)' }}>Admin panel</h1>
        <button className="btn-danger" onClick={handleLogout}>Odjava</button>
      </div>

      {msg && <p style={{ marginBottom: 16 }}>{msg}</p>}

      {/* --- Unos vijesti --- */}
      <div className="admin-card" style={{ marginBottom: 30 }}>
        <h1>Nova vijest</h1>
        <form onSubmit={submitNews}>
          <div className="field">
            <label>Naslov</label>
            <input
              value={newsForm.title}
              onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Oznaka (tag)</label>
            <input
              placeholder="npr. Prijave otvorene"
              value={newsForm.tag}
              onChange={(e) => setNewsForm({ ...newsForm, tag: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Kratki opis</label>
            <textarea
              value={newsForm.excerpt}
              onChange={(e) => setNewsForm({ ...newsForm, excerpt: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Format</label>
            <input
              placeholder="npr. Švicarski"
              value={newsForm.format}
              onChange={(e) => setNewsForm({ ...newsForm, format: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Status</label>
            <input
              placeholder="npr. Prijave otvorene"
              value={newsForm.status}
              onChange={(e) => setNewsForm({ ...newsForm, status: e.target.value })}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={saving}>
            Spremi vijest
          </button>
        </form>

        {news.map((n) => (
          <div className="admin-list-item" key={n.id}>
            <div>
              <strong>{n.title}</strong>
              {n.tag && <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{n.tag}</div>}
            </div>
            <button className="btn-danger" onClick={() => deleteNews(n.id)}>Obriši</button>
          </div>
        ))}
      </div>

      {/* --- Unos turnira --- */}
      <div className="admin-card" style={{ marginBottom: 30 }}>
        <h1>Novi turnir</h1>
        <form onSubmit={submitTournament}>
          <div className="field">
            <label>Naziv</label>
            <input
              value={tourForm.name}
              onChange={(e) => setTourForm({ ...tourForm, name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Opis</label>
            <textarea
              value={tourForm.description}
              onChange={(e) => setTourForm({ ...tourForm, description: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Format</label>
            <input
              placeholder="npr. Švicarski sustav, 7 kola"
              value={tourForm.format}
              onChange={(e) => setTourForm({ ...tourForm, format: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Tempo</label>
            <input
              placeholder="npr. 90 min + 30 sek/potez"
              value={tourForm.tempo}
              onChange={(e) => setTourForm({ ...tourForm, tempo: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Datum početka</label>
            <input
              type="date"
              value={tourForm.starts_at}
              onChange={(e) => setTourForm({ ...tourForm, starts_at: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Lokacija</label>
            <input
              value={tourForm.location}
              onChange={(e) => setTourForm({ ...tourForm, location: e.target.value })}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={saving}>
            Spremi turnir
          </button>
        </form>

        {tournaments.map((t) => (
          <div className="admin-list-item" key={t.id}>
            <div>
              <strong>{t.name}</strong>
              {t.starts_at && (
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                  {new Date(t.starts_at).toLocaleDateString('hr-HR')}
                </div>
              )}
            </div>
            <button className="btn-danger" onClick={() => deleteTournament(t.id)}>Obriši</button>
          </div>
        ))}
      </div>

      {/* --- Novi igrač --- */}
      <div className="admin-card" style={{ marginBottom: 30 }}>
        <h1>Novi igrač</h1>
        <form onSubmit={submitPlayer}>
          <div className="field">
            <label>Ime i prezime</label>
            <input
              value={playerForm.full_name}
              onChange={(e) => setPlayerForm({ ...playerForm, full_name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Spol</label>
            <select
              value={playerForm.gender}
              onChange={(e) => setPlayerForm({ ...playerForm, gender: e.target.value })}
            >
              <option value="">—</option>
              <option value="M">M</option>
              <option value="Ž">Ž</option>
            </select>
          </div>
          <div className="field">
            <label>Titula</label>
            <input
              placeholder="npr. FM, WCM, ili ostavi prazno"
              value={playerForm.title}
              onChange={(e) => setPlayerForm({ ...playerForm, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Klub</label>
            <input
              value={playerForm.club}
              onChange={(e) => setPlayerForm({ ...playerForm, club: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Kategorija</label>
            <select
              value={playerForm.category}
              onChange={(e) => setPlayerForm({ ...playerForm, category: e.target.value })}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={playerForm.is_member}
                onChange={(e) => setPlayerForm({ ...playerForm, is_member: e.target.checked })}
                style={{ width: 'auto', marginRight: 8 }}
              />
              Član ŠK Dubrovnik
            </label>
          </div>
          <div className="field">
            <label>Bodovi — Opći GP</label>
            <input
              type="number" step="0.5"
              value={playerForm.general_gp_points}
              onChange={(e) => setPlayerForm({ ...playerForm, general_gp_points: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Bodovi — Kategorijski GP</label>
            <input
              type="number" step="0.5"
              value={playerForm.category_gp_points}
              onChange={(e) => setPlayerForm({ ...playerForm, category_gp_points: e.target.value })}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={saving}>
            Spremi igrača
          </button>
        </form>

        {players.map((p) => (
          <div className="admin-list-item" key={p.id}>
            <div>
              <strong>{p.title ? `${p.title} ` : ''}{p.full_name}</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                {p.category} · {p.club}{p.is_member ? '' : ' · nije član'}
              </div>
            </div>
            <button className="btn-danger" onClick={() => deletePlayer(p.id)}>Obriši</button>
          </div>
        ))}
      </div>

      {/* --- Mjesečni rejting --- */}
      <div className="admin-card">
        <h1>Mjesečni rejting igrača</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: 16 }}>
          Unosi se svakog 1. u mjesecu. Svaki mjesec ostaje sačuvan zasebno —
          prošli turniri i dalje prikazuju rejting koji je vrijedio tada.
        </p>
        <form onSubmit={submitRating}>
          <div className="field">
            <label>Igrač</label>
            <select
              value={ratingForm.player_id}
              onChange={(e) => setRatingForm({ ...ratingForm, player_id: e.target.value })}
              required
            >
              <option value="">— odaberi igrača —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Mjesec (uvijek 1. u mjesecu)</label>
            <input
              type="date"
              value={ratingForm.effective_month}
              onChange={(e) => setRatingForm({ ...ratingForm, effective_month: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>FIDE Standard</label>
            <input
              type="number"
              value={ratingForm.fide_standard}
              onChange={(e) => setRatingForm({ ...ratingForm, fide_standard: e.target.value })}
            />
          </div>
          <div className="field">
            <label>FIDE Rapid</label>
            <input
              type="number"
              value={ratingForm.fide_rapid}
              onChange={(e) => setRatingForm({ ...ratingForm, fide_rapid: e.target.value })}
            />
          </div>
          <div className="field">
            <label>FIDE Blitz</label>
            <input
              type="number"
              value={ratingForm.fide_blitz}
              onChange={(e) => setRatingForm({ ...ratingForm, fide_blitz: e.target.value })}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={saving}>
            Spremi rejting za odabrani mjesec
          </button>
        </form>

        {players.map((p) => {
          const r = ratingsByPlayer[p.id];
          return (
            <div className="admin-list-item" key={p.id}>
              <div>
                <strong>{p.full_name}</strong>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                  {r
                    ? `Std ${r.fide_standard ?? '—'} · Rapid ${r.fide_rapid ?? '—'} · Blitz ${r.fide_blitz ?? '—'} (${new Date(r.effective_month).toLocaleDateString('hr-HR', { month: 'long', year: 'numeric' })})`
                    : 'Još nema unesenog rejtinga'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
