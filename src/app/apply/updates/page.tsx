import Link from '@/components/Link';
import { createClient } from '@/lib/supabase/server';
import { hasCoreTeamUpdates } from '@/lib/core-team-updates';
import UpdatesSignup from './UpdatesSignup';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Core team updates | Design Waterloo', robots: { index: false, follow: false } };
export default async function CoreTeamUpdatesPage() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  const unavailable = error && error.name !== 'AuthSessionMissingError' && error.status !== 401 && error.status !== 403;
  return <main className={`${styles.page} ${styles.entry}`}>
    <div><p className={styles.eyebrow}>Our first core team</p><h1>Be the first to know.</h1><p>We’re getting ready to open core team applications.</p></div>
    {unavailable ? <div role="alert"><p>We couldn’t check your account. Please try again.</p><Link href="/apply/updates">Try again</Link></div>
      : user?.email ? <UpdatesSignup email={user.email} initialSubscribed={hasCoreTeamUpdates(user.user_metadata)} />
      : <div><p>Sign in to get an email when applications open.</p><Link href="/sign-in?redirectTo=%2Fapply%2Fupdates" className={styles.primary}>Sign in for updates</Link><p className={styles.hint}>Signing in won’t subscribe you until you choose to sign up.</p></div>}
    <Link href={user ? '/dashboard' : '/'} className={styles.secondary}>{user ? 'Back to your profile' : 'Back to home'}</Link>
  </main>;
}
