'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setReady(Boolean(data.session));
      if (!data.session) {
        setError('Link za promjenu lozinke je istekao ili nije valjan. Zatražite novi link.');
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && session) setReady(true);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Lozinka mora imati najmanje 8 znakova.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Lozinke se ne podudaraju.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError('Lozinku nije moguće promijeniti. Zatražite novi link za reset.');
      return;
    }

    setMessage('Lozinka je uspješno promijenjena. Preusmjeravanje na Admin prijavu…');
    setTimeout(() => router.push('/admin/login'), 1200);
  }

  return (
    <div className="admin-shell">
      <div className="admin-card">
        <h1>Nova lozinka</h1>
        <p>Postavite novu lozinku za svoj administratorski račun.</p>

        {ready ? (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">Nova lozinka</label>
              <input
                id="password"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Potvrdi novu lozinku</label>
              <input
                id="confirmPassword"
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Spremanje…' : 'Promijeni lozinku'}
            </button>
          </form>
        ) : (
          <p className="error-msg">{error || 'Provjera poveznice…'}</p>
        )}

        {error && ready && <p className="error-msg">{error}</p>}
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
