'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('hr-HR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const statusLabels = {
  REGISTERED: 'Zaprimljena',
  CONFIRMED: 'Potvrđena',
  DECLINED: 'Odbijena',
};

export default function AdminRegistrationsPage() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [tournamentId, setTournamentId] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isAdmin = role === 'admin' || role === 'super_admin';

  async function load() {
    setLoading(true);
    setError('');
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      setSession(null);
      setRole(null);
      setLoading(false);
      return;
    }
    setSession(auth.user);

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', auth.user.id)
      .maybeSingle();

    if (profileError) {
      setError('Nije moguće provjeriti administratorske ovlasti.');
      setLoading(false);
      return;
    }

    setRole(profile?.role || null);
    if (!['admin', 'super_admin'].includes(profile?.role)) {
      setLoading(false);
      return;
    }

    const [{ data: ts, error: tsError }, { data: rs, error: rsError }] = await Promise.all([
      supabase.from('tournaments').select('id,name,starts_at').order('starts_at', { ascending: false }),
      supabase
        .from('tournament_registrations')
        .select('id,tournament_id,full_name,email,registered_at,status,updated_at')
        .order('registered_at', { ascending: false }),
    ]);

    if (tsError || rsError) {
      setError('Nije moguće učitati prijave. Provjerite administratorske ovlasti.');
      setLoading(false);
      return;
    }

    setTournaments(ts || []);
    setRegistrations(rs || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const { data: listener } = supabase.auth.onAuthStateChange(() => load());
    return () => listener.subscription.unsubscribe();
  }, []);

  const tournamentMap = useMemo(
    () => new Map(tournaments.map((t) => [t.id, t])),
    [tournaments]
  );

  const filtered = useMemo(() => registrations.filter((item) => {
    const tournamentMatches = tournamentId === 'all' || String(item.tournament_id) === tournamentId;
    const statusMatches = status === 'all' || item.status === status;
    return tournamentMatches && statusMatches;
  }), [registrations, tournamentId, status]);

  const counts = useMemo(() => ({
    all: registrations.length,
    registered: registrations.filter((r) => r.status === 'REGISTERED').length,
    confirmed: registrations.filter((r) => r.status === 'CONFIRMED').length,
    declined: registrations.filter((r) => r.status === 'DECLINED').length,
  }), [registrations]);

  async function updateStatus(id, nextStatus) {
    setBusyId(id);
    setMessage('');
    setError('');
    const { error: rpcError } = await supabase.rpc('admin_update_registration_status', {
      p_registration_id: id,
      p_status: nextStatus,
    });
    if (rpcError) {
      setError(rpcError.message || 'Promjena statusa nije uspjela.');
    } else {
      setMessage(`Status prijave je promijenjen u „${statusLabels[nextStatus]}”.`);
      await load();
    }
    setBusyId(null);
  }

  if (loading) return <main className="admin-shell"><div className="admin-loading">Učitavanje prijava…</div></main>;

  if (!session) {
    return (
      <main className="admin-shell">
        <section className="admin-gate"><span className="section-kicker">Administracija</span><h1>Prijave na turnire</h1><p>Za pristup ovoj stranici potrebno je prijaviti se administratorskim računom.</p><a className="btn-primary" href="/login">Prijava</a></section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="admin-shell">
        <section className="admin-gate"><span className="section-kicker">403</span><h1>Pristup nije dopušten</h1><p>Ova stranica je dostupna samo administratorima ŠK Dubrovnik Grand Prix.</p><a className="btn-secondary" href="/">Povratak na naslovnicu</a></section>
      </main>
    );
  }

  return (
    <>
      <div className="board-row" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</div>
      <header className="top"><div className="top-inner"><a href="/" className="brand">ŠK Dubrovnik Grand Prix</a><nav className="primary"><a href="/admin">Dashboard</a><a className="active" href="/admin/prijave">Prijave</a><a href="/turniri">Turniri</a><a href="/dgp">Poredak</a></nav></div></header>

      <section className="admin-hero"><div className="admin-hero-inner"><span className="eyebrow">Administracija</span><h1>Prijave na turnire</h1><p>Pregled, potvrda i obrada javnih prijava na objavljene turnire.</p></div></section>

      <main className="admin-main">
        <div className="admin-stat-grid">
          <div className="admin-stat"><span>Ukupno</span><strong>{counts.all}</strong></div>
          <div className="admin-stat"><span>Zaprimljene</span><strong>{counts.registered}</strong></div>
          <div className="admin-stat"><span>Potvrđene</span><strong>{counts.confirmed}</strong></div>
          <div className="admin-stat"><span>Odbijene</span><strong>{counts.declined}</strong></div>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-head"><div><span className="section-kicker">Radni pregled</span><h2>Registracije</h2></div><span className="admin-result-count">{filtered.length} rezultata</span></div>
          <div className="admin-filters">
            <label>Turnir<select value={tournamentId} onChange={(e) => setTournamentId(e.target.value)}><option value="all">Svi turniri</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Svi statusi</option><option value="REGISTERED">Zaprimljene</option><option value="CONFIRMED">Potvrđene</option><option value="DECLINED">Odbijene</option></select></label>
          </div>

          {message && <div className="admin-message success">{message}</div>}
          {error && <div className="admin-message error">{error}</div>}

          <div className="admin-table-wrap">
            <table className="admin-table"><thead><tr><th>Igrač</th><th>Turnir</th><th>E-mail</th><th>Zaprimljeno</th><th>Status</th><th>Akcija</th></tr></thead><tbody>
              {filtered.length === 0 ? <tr><td colSpan="6" className="admin-empty">Nema prijava za odabrane filtre.</td></tr> : filtered.map((item) => {
                const tournament = tournamentMap.get(item.tournament_id);
                return <tr key={item.id}><td><strong>{item.full_name}</strong></td><td>{tournament?.name || `Turnir #${item.tournament_id}`}</td><td>{item.email}</td><td>{formatDate(item.registered_at)}</td><td><span className={`status-pill admin-status status-${item.status.toLowerCase()}`}>{statusLabels[item.status] || item.status}</span></td><td><div className="admin-actions">
                  {item.status !== 'CONFIRMED' && <button disabled={busyId === item.id} onClick={() => updateStatus(item.id, 'CONFIRMED')}>Potvrdi</button>}
                  {item.status !== 'DECLINED' && <button className="danger" disabled={busyId === item.id} onClick={() => updateStatus(item.id, 'DECLINED')}>Odbij</button>}
                  {item.status !== 'REGISTERED' && <button className="ghost" disabled={busyId === item.id} onClick={() => updateStatus(item.id, 'REGISTERED')}>Vrati</button>}
                </div></td></tr>;
              })}
            </tbody></table>
          </div>
        </section>
      </main>
      <footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix · Administracija</footer>
    </>
  );
}
