'use client';
import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ACCOUNT_DELETION_PHRASE, validDeletionConfirmation } from '@/lib/account-deletion';
import styles from './page.module.css';

export default function DeleteAccount({ fullName }: { fullName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() {
    if (busy || !validDeletionConfirmation({ fullName: name, phrase }, fullName)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: name, phrase }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Couldn’t delete your account.');
      window.location.replace('/directory');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); setBusy(false); }
  }
  return <section className={styles.section}>
    <div className={styles.sectionTitle}><h2>Delete account</h2></div>
    <div className={styles.sectionBody}>
      <p>Permanently delete your account, profile, and work history. This cannot be undone.</p>
      <button type="button" className={`${styles.secondaryButton} ${styles.signOut}`} onClick={() => { setName(''); setPhrase(''); setError(''); setOpen(true); }}>Delete account</button>
    </div>
    {open && <ConfirmDialog title="Delete your account?" message="Your login, profile, and work history will be permanently deleted. This cannot be undone." danger confirmLabel="Delete my account" loading={busy} confirmDisabled={!validDeletionConfirmation({ fullName: name, phrase }, fullName)} onCancel={() => setOpen(false)} onConfirm={() => void remove()}>
      <div className={styles.form}>
        <label htmlFor="delete-full-name">Enter your full name: {fullName}</label>
        <input id="delete-full-name" autoComplete="off" value={name} disabled={busy} onChange={event => setName(event.target.value)} />
        <label htmlFor="delete-confirmation">Type “{ACCOUNT_DELETION_PHRASE}”</label>
        <input id="delete-confirmation" autoComplete="off" autoCapitalize="none" spellCheck={false} value={phrase} disabled={busy} onChange={event => setPhrase(event.target.value)} />
        {error && <p role="alert">{error}</p>}
      </div>
    </ConfirmDialog>}
  </section>;
}
