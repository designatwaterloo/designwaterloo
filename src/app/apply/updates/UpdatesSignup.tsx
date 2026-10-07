'use client';
import { useEffect, useState } from 'react';
import styles from '../page.module.css';

export default function UpdatesSignup({ email, initialSubscribed }: { email: string; initialSubscribed: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/core-team/updates', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribed: !subscribed }), signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSubscribed(data.subscribed);
    } catch (error) {
      setError(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'We couldn’t save your preference. Please try again.');
    } finally { setBusy(false); }
  }
  return <div>
    <p role="status">{subscribed ? `You’re on the list. We’ll email ${email} when core team applications open.` : `Get an email at ${email} when core team applications open.`}</p>
    <p className={styles.hint}>No application or completed profile needed. You can opt out here anytime.</p>
    {error && <p role="alert" className={styles.fieldError}>{error}</p>}
    <button type="button" className={subscribed ? styles.secondary : styles.primary} disabled={!ready || busy} onClick={()=>void save()}>
      {busy ? 'Saving…' : subscribed ? 'Unsubscribe from updates' : 'Sign up for updates'}
    </button>
  </div>;
}
