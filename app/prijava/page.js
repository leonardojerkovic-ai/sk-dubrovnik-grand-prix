'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

function formatDate(value) {
  if (!value) return 'Datum nije objavljen';
  return new Date(`${value}T00:00:00`).toLocaleDateString('hr-HR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function isOpen(tournament) {
  return tournament?.status === 'prijave_otvorene'
    && (!tournament.registration_deadline || new Date(tournament.registration_deadline) >= new Date());
}

function RegistrationContent() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get('turnir');
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [eligibility, setEligibility] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ playerId: '', email: '' });

  useEffect(() => {
    let active = true;
    async function load() {
      if (!tournamentId) { setError('Nije odabran turnir.'); setLoading(false); return; }
      const [{ data: t, error: tError }, { data: ps, error: pError }] = await Promise.all([
        supabase.from('tournaments').select('id,name,starts_at,location,status,published,registration_deadline,event_stage,tournament_scope,category_code,access_type,max_players').eq('id', tournamentId).eq('published', true).eq('event_stage', 'REGULAR').single(),
        supabase.from('players').select('id,full_name,birth_year,gender,is_member').eq('is_active', true).order('full_name'),
      ]);
      if (!active) return;
      if (tError || !t) setError('Turnir nije pronađen ili prijave nisu javno dostupne.');
      else setTournament(t);
      if (pError) setError((current) => current || 'Popis igrača nije moguće učitati.');
      else setPlayers(ps || []);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [tournamentId]);

  const visiblePlayers = useMemo(() => players.filter((player) => eligibility[player.id]?.eligible !== false), [players, eligibility]);

  useEffect(() => {
    if (!tournament || !players.length) return;
    let active = true;
    async function checkAll() {
      const results = await Promise.all(players.map(async (player) => {
        const { data, error: rpcError } = await supabase.rpc('check_tournament_registration_eligibility', { p_tournament_id: tournament.id, p_player_id: player.id });
        return [player.id, rpcError ? { eligible: false, reason: 'Provjera podobnosti nije uspjela.' } : data?.[0] || { eligible: false, reason: 'Igrač nije podoban.' }];
      }));
      if (active) setEligibility(Object.fromEntries(results));
    }
    checkAll();
    return () => { active = false; };
  }, [tournament, players]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault(); setError('');
    if (!form.playerId) { setError('Odaberite igrača.'); return; }
    const email = form.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) { setError('Unesite ispravnu e-mail adresu.'); return; }
    if (!isOpen(tournament)) { setError('Prijave za ovaj turnir više nisu otvorene.'); return; }
    if (eligibility[form.playerId] && !eligibility[form.playerId].eligible) { setError(eligibility[form.playerId].reason); return; }
    setSubmitting(true);
    const { error: insertError } = await supabase.rpc('submit_tournament_registration', { p_tournament_id: tournament.id, p_player_id: Number(form.playerId), p_email: email });
    setSubmitting(false);
    if (insertError) { setError(insertError.message?.replace(/^.*?: /, '') || 'Prijava nije zaprimljena.'); return; }
    setSubmitted(true);
  }

  return (
    <>
      <div className="board-row" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</div>
      <header className="top"><div className="top-inner"><a href="/" className="brand">ŠK Dubrovnik Grand Prix</a><nav className="primary" aria-label="Glavna navigacija"><a href="/">Naslovnica</a><a href="/turniri">Turniri</a><a href="/dgp">DGP poredak</a><a href="/poredak">Igrači</a></nav></div></header>
      <section className="registration-hero"><div className="registration-hero-inner"><a className="back-link" href={tournament ? `/turniri/${tournament.id}` : '/turniri'}>← Natrag na turnir</a><span className="eyebrow">Javna prijava</span><h1>Prijava na turnir</h1><p>Odaberite igrača i unesite e-mail za kontakt. Sustav automatski provjerava kategorijsku podobnost prije slanja.</p></div></section>
      <main className="registration-main">
        {loading ? <section className="registration-card"><p>Učitavanje turnira…</p></section> : error && !tournament ? <section className="registration-card"><p className="error-msg">{error}</p><a className="btn-secondary" href="/turniri">Povratak na turnire</a></section> : submitted ? <section className="registration-card registration-success"><span className="section-kicker">Prijava zaprimljena</span><h2>Hvala na prijavi.</h2><p>Prijava za <strong>{tournament.name}</strong> uspješno je zaprimljena sa statusom <strong>REGISTERED</strong>. Organizator je sada može potvrditi ili odbiti.</p><div className="registration-actions"><a className="btn-primary" href="/turniri">Natrag na turnire</a><a className="btn-secondary" href={`/turniri/${tournament.id}`}>Detalji turnira</a></div></section> : <section className="registration-layout"><div className="registration-card"><span className="section-kicker">Sudionik</span><h2>{tournament.name}</h2><p className="registration-context">{formatDate(tournament.starts_at)}{tournament.location ? ` · ${tournament.location}` : ''}</p>{!isOpen(tournament) ? <div className="registration-closed"><strong>Prijave nisu otvorene.</strong><span>Rok prijave je istekao ili turnir trenutačno nije otvoren za prijave.</span></div> : <form onSubmit={handleSubmit} noValidate><div className="field"><label htmlFor="playerId">Igrač</label><select id="playerId" name="playerId" value={form.playerId} onChange={updateField} required><option value="">Odaberite igrača</option>{visiblePlayers.map((player) => <option key={player.id} value={player.id}>{player.full_name}</option>)}</select></div><div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" maxLength={320} required /></div>{form.playerId && eligibility[form.playerId] && <p className={eligibility[form.playerId].eligible ? 'eligibility-ok' : 'eligibility-error'}>{eligibility[form.playerId].reason}</p>}{error && <p className="error-msg" role="alert">{error}</p>}<button className="btn-primary registration-submit" type="submit" disabled={submitting || !form.playerId}>{submitting ? 'Slanje prijave…' : 'Pošalji prijavu'}</button><p className="registration-note">Slanjem obrasca prijava se evidentira kao REGISTERED. Potvrdu nastupa donosi organizator.</p></form>}</div><aside className="registration-side"><span className="section-kicker">Pravila prijave</span><h2>Automatske provjere</h2><ol><li>Turnir mora biti objavljen i imati otvorene prijave.</li><li>Provjerava se kategorija igrača prema pravilima turnira.</li><li>Provjerava se članstvo kada je za turnir obavezno.</li><li>Duplikat i popunjen kapacitet se odbijaju na poslužitelju.</li></ol></aside></section>}
      </main>
      <footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix · Javna prijava</footer>
    </>
  );
}

export default function RegistrationPage() {
  return <Suspense fallback={<main className="registration-main"><section className="registration-card"><p>Učitavanje prijave…</p></section></main>}><RegistrationContent /></Suspense>;
}
