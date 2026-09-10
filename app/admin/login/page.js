'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError('Pogrešan email ili lozinka.');
      return;
    }

    router.push('/admin/dashboard');
  }

  async function handleForgotPassword() {
    setError('');
    setMessage('');

    if (!email) {
      setError('Najprije upišite email adresu.');
      return;
    }

    setResetLoading(true);
    const redirectTo = `${window.location.origin}/admin/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setResetLoading(false);

    if (resetError) {
      setError('Nije moguće poslati poveznicu za reset lozinke. Provjerite email adresu.');
      return;
    }

    setMessage('Ako račun postoji, poslali smo poveznicu za promjenu lozinke na tu email adresu.');
  }

  return (
    <div className="admin-shell">
      <div className="admin-card">
        <h1>Admin prijava</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Lozinka</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Prijava u tijeku…' : 'Prijavi se'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={resetLoading}
          style={{ marginTop: '12px' }}
        >
          {resetLoading ? 'Slanje…' : 'Zaboravljena lozinka?'}
        </button>

        {error && <p className="error-msg">{error}</p>}
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
