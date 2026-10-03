'use client';

import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth/client';
import { useStore } from './store';

function message(error: { message?: string } | null): string {
  return error?.message || 'Something went wrong';
}

export function AccountAuth({
  onDone,
  intro,
}: {
  onDone?: () => void;
  intro?: string;
}) {
  const { refreshCustomer } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function google() {
    setError('');
    setBusy(true);
    const { error: authError } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: window.location.href,
    });
    if (authError) {
      setError(message(authError));
      setBusy(false);
    }
  }

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Enter your name.');
      return;
    }
    setBusy(true);
    try {
      const { error: authError } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: 'sign-in',
      });
      if (authError) throw new Error(message(authError));
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { error: authError } = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: code.trim(),
        name: name.trim(),
      });
      if (authError) throw new Error(message(authError));
      await refreshCustomer();
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not work');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="account-auth" onSubmit={sent ? verify : sendCode}>
      {intro ? <p className="account-auth-lead">{intro}</p> : null}
      <button type="button" className="button button-google" disabled={busy} onClick={google}>
        Continue with Google
      </button>
      <p className="auth-or">or use email</p>
      <div className="form-grid">
        <label className="full">Full name
          <input value={name} onChange={e => setName(e.target.value)} required maxLength={80} placeholder="e.g. Neema John" autoComplete="name" />
        </label>
        <label className="full">Email
          <input value={email} onChange={e => setEmail(e.target.value)} required maxLength={120} type="email" placeholder="you@email.com" autoComplete="email" />
        </label>
        {sent && (
          <label className="full">Code from your email
            <input value={code} onChange={e => setCode(e.target.value)} required maxLength={8} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" />
          </label>
        )}
      </div>
      {sent && <p className="muted">We sent a code to {email}. It expires in 15 minutes.</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="button" disabled={busy}>
        {busy ? 'Please wait…' : sent ? 'Sign in' : 'Send code'}
      </button>
      {sent && (
        <button type="button" className="text-link" disabled={busy} onClick={() => sendCode()}>
          Send a new code
        </button>
      )}
    </form>
  );
}
