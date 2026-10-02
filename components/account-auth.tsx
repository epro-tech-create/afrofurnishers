'use client';

import { useState, type FormEvent } from 'react';
import { useStore } from './store';

export function AccountAuth({
  onDone,
  intro,
}: {
  onDone?: () => void;
  intro?: string;
}) {
  const { signup, login } = useStore();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') await signup({ name, phone, password });
      else await login({ phone, password });
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="account-auth" onSubmit={submit}>
      {intro ? <p className="account-auth-lead">{intro}</p> : null}
      <div className="auth-switch" role="tablist" aria-label="Account">
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>
          Create account
        </button>
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>
          Sign in
        </button>
      </div>
      <div className="form-grid">
        {mode === 'signup' && (
          <label className="full">Full name
            <input value={name} onChange={e => setName(e.target.value)} required maxLength={80} placeholder="e.g. Neema John" autoComplete="name" />
          </label>
        )}
        <label className="full">Phone number
          <input value={phone} onChange={e => setPhone(e.target.value)} required maxLength={20} placeholder="07XX XXX XXX" autoComplete="tel" inputMode="tel" />
        </label>
        <label className="full">Password
          <input value={password} onChange={e => setPassword(e.target.value)} required minLength={6} maxLength={72} type="password" placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
        </label>
      </div>
      {mode === 'signup' && (
        <p className="muted">Use the phone you want on the order. Past purchases with this number show up in your account.</p>
      )}
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="button" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}
