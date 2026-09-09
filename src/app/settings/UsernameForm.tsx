'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { validateUsername } from '@/lib/usernames';
import { profilePath } from '@/lib/profile-urls';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from '@/components/Link';
import styles from './page.module.css';

export default function UsernameForm({ currentUsername, compact = false }: { currentUsername: string; compact?: boolean }) {
  const [current, setCurrent] = useState(currentUsername);
  const [value, setValue] = useState(currentUsername);
  const [status, setStatus] = useState('');
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const busy = useRef(false);
  const client = useMemo(() => createClient(), []);
  const { refreshMember } = useAuth();
  const check = validateUsername(value);
  const changed = check.normalized !== current;

  useEffect(() => { setCurrent(currentUsername); setValue(currentUsername); }, [currentUsername]);

  useEffect(() => {
    let cancelled = false;
    setAvailable(false);
    if (!changed) { setStatus(''); return; }
    if (!check.ok) { setStatus(check.error ?? 'Enter a username.'); return; }
    setStatus('Checking availability…');
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await client.rpc('username_available', { candidate: check.normalized });
        if (cancelled) return;
        setAvailable(!error && data === true);
        setStatus(error ? 'Could not check availability. Try again.' : data ? 'Available.' : 'Already taken or reserved.');
      } catch {
        if (!cancelled) setStatus('Could not check availability. Try again.');
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [changed, check.ok, check.error, check.normalized, client]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !check.ok || !changed || !available) return;
    busy.current = true;
    setSaving(true); setError(''); setSaved(false);
    try {
      const response = await fetch('/api/account/username', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: check.normalized, currentUsername: current }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your username.');
      setCurrent(data.username); setValue(data.username); setSaved(true);
      await refreshMember().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your username.');
    } finally { busy.current = false; setSaving(false); }
  }

  return <section className={styles.section} aria-label={compact ? "Username" : undefined} aria-labelledby={compact ? undefined : "username-heading"}>
    {!compact && <><h2 id="username-heading">Your username</h2><p>Your address on Design Waterloo. Your work and profile stay with you when it changes.</p></>}
    <form onSubmit={save} className={styles.form}>
      <label className={compact ? "sr-only" : undefined} htmlFor="username">Username</label>
      <div className={styles.inputRow}>
        <span aria-hidden="true">@</span>
        <input id="username" name="username" type="text" value={value} maxLength={41}
          autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={saving}
          aria-describedby="username-help username-status" aria-invalid={changed && !check.ok}
          onChange={e => { setValue(e.target.value); setError(''); setSaved(false); }} />
      </div>
      <p id="username-help">3–40 letters, numbers, or hyphens.</p>
      <p id="username-status" role="status">{status}</p>
      <button type="submit" disabled={saving || !changed || !available || !check.ok}>
        {saving ? 'Saving…' : 'Save username'}
        <span className={styles.touchTarget} aria-hidden="true" />
      </button>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {saved && <p role="status">Username saved.</p>}
    </form>
    <p className={styles.address}><Link href={profilePath(current)}>designwaterloo.com/@{current}</Link></p>
    {!compact && <p>Old profile links will still find you. Previous usernames stay reserved for your account.</p>}
  </section>;
}
