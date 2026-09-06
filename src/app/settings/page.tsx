import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Footer from '@/components/Footer';
import Link from '@/components/Link';
import UsernameForm from './UsernameForm';
import styles from './page.module.css';

export const metadata = { title: 'Account settings | Design Waterloo' };

export default async function SettingsPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/sign-in?redirectTo=%2Fsettings');
  const { data: member, error } = await client.from('members').select('slug').eq('auth_user_id', user.id).maybeSingle();
  if (error) throw new Error('Could not load your settings. Please try again.');
  if (!member) redirect('/profile/edit');
  return <>
    <main className={styles.main}>
      <div className={styles.content}>
        <p><Link href="/dashboard">← Back to dashboard</Link></p>
        <h1>Account settings</h1>
        <UsernameForm key={member.slug} currentUsername={member.slug} />
      </div>
    </main>
    <Footer />
  </>;
}
