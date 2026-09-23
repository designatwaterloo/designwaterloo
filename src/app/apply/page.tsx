import { createClient } from '@/lib/supabase/server';
import Link from '@/components/Link';
import ApplicationEditor from './ApplicationEditor';
import styles from './page.module.css';

export const metadata = { title: 'Apply to Design Waterloo', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function ApplyPage() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError' && error.status !== 401 && error.status !== 403) {
    return <main data-account-workspace className={styles.page}><h1>Apply to Design Waterloo</h1><p>We couldn’t check your account. Please try again.</p><Link href="/apply">Try again</Link></main>;
  }
  if (!user) return <main className={`${styles.page} ${styles.entry}`}>
    <h1>Sign in to apply</h1>
    <Link href="/sign-in?redirectTo=%2Fapply" className={styles.primary}>Sign in or create an account</Link>
  </main>;
  return <ApplicationEditor />;
}
