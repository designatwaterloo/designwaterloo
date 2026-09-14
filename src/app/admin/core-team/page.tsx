import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { applicationQuestions } from '@/lib/core-team';
import Link from '@/components/Link';
import styles from '@/app/apply/page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Core team applications | Design Waterloo', robots: { index: false, follow: false } };
export default async function CoreTeamReview({searchParams}:{searchParams:Promise<{before?:string}>}) {
  const access = await requireAdmin();
  if(!access.ok) redirect('/dashboard');
  const db = await createClient();
  const {before} = await searchParams;
  let query = db.from('core_team_applications').select('*').eq('status','submitted').order('submitted_at',{ascending:false}).limit(51);
  if(before && !Number.isNaN(Date.parse(before))) query=query.lt('submitted_at',before);
  const {data,error} = await query;
  return <main className={styles.page}>
    <p className={styles.eyebrow}>Our first core team</p><h1>Applications</h1>
    <p className={styles.intro}>Submitted applications and the profile information shared with them. Applicant drafts are private.</p>
    {error ? <p role="alert">Applications couldn’t be loaded. Please try again.</p> : !data?.length ? <p>No submitted applications yet.</p> : data.slice(0,50).map(app=>{
      const p=app.profile_snapshot ?? {};
      return <details className={styles.question} key={app.id}>
        <summary><strong>{String(p.first_name ?? '')} {String(p.last_name ?? '')}</strong> · {String(p.program ?? '')}<br/><span className={styles.muted}>Submitted {new Date(app.submitted_at!).toLocaleDateString('en-CA',{dateStyle:'long'})}</span></summary>
        <section className={styles.profile}><h2>Profile at submission</h2><p>{String(p.school ?? '')} · Class of {String(p.graduating_class ?? '')}</p><p>{String(p.school_email ?? '')}</p><p style={{whiteSpace:'pre-wrap'}}>{String(p.bio ?? '')}</p><p>{Array.isArray(p.specialties)?p.specialties.map(String).join(' · '):''}</p>
        {['portfolio','linkedin'].map(key=>{const value=String(p[key]??'');return /^https?:\/\//.test(value)?<p key={key}><a href={value} target="_blank" rel="noopener noreferrer">{key} ↗</a></p>:null;})}
        {['experiences','leadership'].map(key=>Array.isArray(p[key])&&p[key].length>0?<div key={key}><h2>{key==='experiences'?'Experience':'Leadership'}</h2>{(p[key] as Record<string,unknown>[]).map((entry,i)=><p key={i}>{String(entry.position_title??'')} · {String(entry.company??entry.organization??'')} · {String(entry.start_year??'')}</p>)}</div>:null)}
        </section>
        {applicationQuestions.map(q=><section className={styles.question} key={q.key}><h2>{q.label}</h2><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{app.answers[q.key]||'Not provided'}</p></section>)}
      </details>;
    })}
    {data && data.length>50 && <Link href={`/admin/core-team?before=${encodeURIComponent(data[49].submitted_at!)}`}>Older applications →</Link>}
  </main>;
}
