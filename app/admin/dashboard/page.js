'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = još provjeravamo
  const [news, setNews] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  const [newsForm, setNewsForm] = useState({
    title: '', tag: '', excerpt: '', format: '', status: '',
  });
  const [tourForm, setTourForm] = useState({
    name: '', description: '', format: '', tempo: '', starts_at: '', location: '',
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
    setNews(n || []);
    setTournaments(t || []);
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
      <div className="admin-card">
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
    </div>
  );
}
