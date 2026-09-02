'use client';

import { useEffect, useState } from 'react';
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

export default function RegistrationPage() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get('turnir');
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '' });

  useEffect(() => {
    let active = true;
    async function loadTournament() {
      if (!tournamentId) {
        setError('Nije odabran turnir.');
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('tournaments')
        .select('id,name,starts_at,location,status,published,registration_deadline,event_stage')
        .eq('id', tournamentId)
        .eq('published', true)
        .eq('event_stage', 'REGULAR')
        .single();

      if (!active) return;
      if (queryError || !data) setError('Turnir nije pronađen ili prijave nisu javno dostupne.');
      else setTournament(data);
      setLoading(false);
    }
    loadTournament();
    return () => { active = false; };
  }, [tournamentId]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const fullName = form.fullName.trim();
    const email = form.email.trim();
    if (fullName.length < 2 || fullName.length > 200) {
      setError('Ime i prezime mora sadržavati između 2 i 200 znakova.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) {
      setError('Unesite ispravnu e-mail adresu.');
      return;
    }
    if (!isOpen(tournament)) {
      setError('Prijave za ovaj turnir više nisu otvorene.');
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase
      .from('tournament_registrations')
      .insert({
        tournament_id: tournament.id,
        player_id: null,
        full_name: fullName,
        email,
        status: 'REGISTERED',
      });

    setSubmitting(false);
    if (insertError) {
      setError('Prijava nije zaprimljena. Provjerite podatke ili pokušajte ponovno.');
      return;
    }
    setSubmitted(true);
  }

  return (
    <>
      <div className="board-row" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</div>
      <header className="top">
        <div className="top-inner">
          <a href="/" className="brand">ŠK Dubrovnik Grand Prix</a>
          <nav className="primary" aria-label="Glavna navigacija">
            <a href="/">Naslovnica</a>
            <a href="/turniri">Turniri</a>
            <a href="/dgp">DGP poredak</a>
            <a href="/poredak">Igrači</a>
          </nav>
        </div>
      </header>

      <section className="registration-hero">
        <div className="registration-hero-inner">
          <a className="back-link" href={tournament ? `/turniri/${tournament.id}` : '/turniri'}>← Natrag na turnir</a>
          <span className="eyebrow">Javna prijava</span>
          <h1>Prijava na turnir</h1>
          <p>Jednostavno ispunite osnovne podatke. Organizator će prijavu obraditi kroz službeni admin workflow.</p>
        </div>
      </section>

      <main className="registration-main">
        {loading ? (
          <section className="registration-card"><p>Učitavanje turnira…</p></section>
        ) : error && !tournament ? (
          <section className="registration-card"><p className="error-msg">{error}</p><a className="btn-secondary" href="/turniri">Povratak na turnire</a></section>
        ) : submitted ? (
          <section className="registration-card registration-success">
            <span className="section-kicker">Prijava zaprimljena</span>
            <h2>Hvala na prijavi.</h2>
            <p>Vaša prijava za <strong>{tournament.name}</strong> uspješno je zaprimljena. Organizator će je obraditi i potvrditi prema pravilima turnira.</p>
            <div className="registration-actions"><a className="btn-primary" href="/turniri">Natrag na turnire</a><a className="btn-secondary" href={`/turniri/${tournament.id}`}>Detalji turnira</a></div>
          </section>
        ) : (
          <section className="registration-layout">
            <div className="registration-card">
              <span className="section-kicker">Sudionik</span>
              <h2>{tournament.name}</h2>
              <p className="registration-context">{formatDate(tournament.starts_at)}{tournament.location ? ` · ${tournament.location}` : ''}</p>
              {!isOpen(tournament) ? (
                <div className="registration-closed"><strong>Prijave nisu otvorene.</strong><span>Rok prijave je istekao ili turnir trenutačno nije otvoren za prijave.</span></div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="field"><label htmlFor="fullName">Ime i prezime</label><input id="fullName" name="fullName" value={form.fullName} onChange={updateField} autoComplete="name" maxLength={200} required /></div>
                  <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" maxLength={320} required /></div>
                  {error && <p className="error-msg" role="alert">{error}</p>}
                  <button className="btn-primary registration-submit" type="submit" disabled={submitting}>{submitting ? 'Slanje prijave…' : 'Pošalji prijavu'}</button>
                  <p className="registration-note">Slanjem obrasca prihvaćate da se navedeni podaci koriste za obradu prijave na ovaj turnir.</p>
                </form>
              )}
            </div>
            <aside className="registration-side"><span className="section-kicker">Važno</span><h2>Što se događa nakon prijave?</h2><ol><li>Prijava se sigurno zapisuje u sustav.</li><li>Organizator je vidi u administraciji.</li><li>Potvrda i eventualne izmjene obrađuju se kroz admin workflow.</li></ol></aside>
          </section>
        )}
      </main>
      <footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix · Javna prijava</footer>
    </>
  );
}
