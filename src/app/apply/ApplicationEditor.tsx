'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from '@/components/Link';
import { useUnsavedChanges } from '@/components/UnsavedChanges';
import { applicationQuestions, emptyAnswers, applicationErrors, type Answers, type CoreTeamApplication, type profileRequirements } from '@/lib/core-team';
import styles from './page.module.css';

type Requirement = ReturnType<typeof profileRequirements>[number];
export default function ApplicationEditor() {
  const [answers, setAnswers] = useState<Answers>({ ...emptyAnswers });
  const current = useRef<Answers>({ ...emptyAnswers });
  const saved = useRef(JSON.stringify(emptyAnswers));
  const revision = useRef(0);
  const inFlight = useRef(false);
  const initialized = useRef(false);
  const alive = useRef(true);
  const [application, setApplication] = useState<CoreTeamApplication | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [validation, setValidation] = useState<Partial<Record<keyof Answers,string>>>({});
  const [saveLabel, setSaveLabel] = useState('All changes saved');
  const submitted = application?.status === 'submitted';
  const dirty = JSON.stringify(answers) !== saved.current;
  const complete = requirements.length > 0 && requirements.every(r => r.complete);
  useUnsavedChanges(loaded && !submitted && (dirty || busy));

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/core-team/application', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) { if (!initialized.current) setNeedsSetup(!!data.needsSetup); throw Error(data.error); }
      if (!alive.current) return;
      setRequirements(data.requirements);
      if (!initialized.current) {
        const initial = data.application?.answers ?? { ...emptyAnswers };
        current.current = initial; saved.current = JSON.stringify(initial); revision.current = data.application?.revision ?? 0;
        setAnswers(initial);setApplication(data.application);setLoaded(true);setError('');initialized.current = true;
      }
    } catch (e) {
      if (alive.current && !initialized.current) setError(e instanceof Error ? e.message : 'Couldn’t load your application. Please retry.');
    }
  }, []);
  useEffect(() => {
    alive.current = true;void load();
    const refresh = () => { void load(); };
    window.addEventListener('focus', refresh);
    return () => { alive.current = false; window.removeEventListener('focus', refresh); };
  }, [load]);

  const save = useCallback(async (submit = false) => {
    if (inFlight.current || submitted || conflict) return false;
    const snapshot = current.current;
    if (!submit && JSON.stringify(snapshot) === saved.current) return true;
    inFlight.current = true;setBusy(true);setSubmitting(submit);setError('');setSaveLabel(submit ? 'Submitting…' : 'Saving…');
    try {
      const response = await fetch('/api/core-team/application', { method: submit ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: snapshot, revision: revision.current }), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) { setConflict(!!data.conflict); if(data.fields)setValidation(data.fields);throw Error(data.error); }
      if (!alive.current) return false;
      revision.current = data.application.revision;saved.current = JSON.stringify(data.application.answers);
      setApplication(data.application);setSaveLabel(JSON.stringify(current.current) === saved.current ? 'All changes saved' : 'Unsaved changes');
      return true;
    } catch (e) {
      if (alive.current) {setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'Couldn’t save. Your answers are still here. Please retry.');setSaveLabel('Not saved');}
      return false;
    } finally { inFlight.current = false;if(alive.current){setBusy(false);setSubmitting(false);} }
  }, [submitted, conflict]);
  useEffect(() => {
    if (!loaded || submitted || conflict || busy || !dirty || error) return;
    const timer = setTimeout(() => {void save();}, 800);
    return () => clearTimeout(timer);
  }, [answers, loaded, submitted, conflict, busy, dirty, error, save]);
  useEffect(() => {
    const retry = () => { if(initialized.current)void save(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [save]);

  function change(key: keyof Answers, value: string) {
    current.current = { ...current.current, [key]: value };setAnswers(current.current);
    setValidation(v => ({...v,[key]:undefined}));if(!conflict)setError('');setSaveLabel('Unsaved changes');
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const errors = applicationErrors(current.current);setValidation(errors);
    if (Object.keys(errors).length) {document.getElementById(`answer-${Object.keys(errors)[0]}`)?.focus();return;}
    if (!complete) {setError('Complete your profile before submitting. Your application answers can still be saved.');return;}
    await save(true);
  }
  return <main data-account-workspace className={styles.page}>
    <Link href="/dashboard" className={styles.back}>← Back to your profile</Link>
    <div className={styles.heading}><div><p className={styles.eyebrow}>Our first core team</p><h1>Apply to Design Waterloo</h1></div>
      {loaded && <span role="status" className={styles.saveStatus}>{submitted ? 'Application submitted' : saveLabel}</span>}
    </div>
    {!submitted && <p className={styles.intro}>Tell us what you’d like to see in the campus design community, what interests you, and something you’re proud of.</p>}
    {error && <div role="alert" className={styles.error}><p>{error}</p>
      {needsSetup ? <Link href="/welcome?redirectTo=%2Fapply">Set up your profile</Link> : !loaded ? <button type="button" onClick={()=>void load()}>Try again</button> : !conflict && <button type="button" disabled={busy} onClick={()=>void save()}>Retry save</button>}
      {conflict && <p>Your text remains below. Copy it somewhere safe, then <Link href="/apply">reload the latest application</Link>.</p>}
    </div>}
    {!loaded && !error && <p role="status">Loading your application…</p>}
    {loaded && <>
      {submitted ? <section className={styles.confirmation} aria-label="Submission confirmation"><h2>Thanks for applying.</h2><p>Your application and profile information have been sent to the Design Waterloo team. You can read your submitted answers below.</p><p className={styles.muted}>Submitted {new Date(application!.submitted_at!).toLocaleDateString('en-CA', { dateStyle: 'long' })}. Changes to your profile won’t change this submission.</p></section>
        : <section className={styles.profile} aria-labelledby="profile-requirements"><div><h2 id="profile-requirements">Your profile</h2><p className={styles.muted}>We use your profile as the baseline for understanding your background and interests. Complete it before submitting your application.</p></div>
          <ul className={styles.checklist}>{requirements.map(r=><li key={r.label}><span aria-hidden="true">{r.complete?'✓':'○'}</span>{r.complete ? <span>{r.label}<span className="sr-only"> complete</span></span> : <Link href={r.href}>{r.label} — complete this</Link>}</li>)}</ul>
          <Link href="/dashboard" className={styles.secondary}>Edit your profile ↗</Link>
        </section>}
      <form onSubmit={submit} noValidate>
        <fieldset disabled={submitted || submitting} className={styles.fields}>
          <legend className="sr-only">Application questions</legend>
          {applicationQuestions.map(q=><section className={styles.question} key={q.key}>
            <label htmlFor={`answer-${q.key}`}>{q.label}{!q.required && <span className={styles.optional}>Optional</span>}</label>
            <p id={`hint-${q.key}`} className={styles.hint}>{q.hint}</p>
            {q.key === 'work_link' ? <input id={`answer-${q.key}`} name={q.key} type="url" autoCapitalize="none" spellCheck={false} value={answers[q.key]} onChange={e=>change(q.key,e.target.value)} maxLength={q.limit} aria-describedby={`hint-${q.key} error-${q.key}`} aria-invalid={!!validation[q.key]}/>
              : <textarea id={`answer-${q.key}`} name={q.key} rows={q.key==='availability'?3:5} value={answers[q.key]} onChange={e=>change(q.key,e.target.value)} maxLength={q.limit} required={q.required} aria-describedby={`hint-${q.key} error-${q.key}`} aria-invalid={!!validation[q.key]}/>}
            <p id={`error-${q.key}`} className={styles.fieldError}>{validation[q.key]}</p>
          </section>)}
        </fieldset>
        {!submitted && <footer className={styles.submitRow}><div><p>Your answers are private to you until you submit. Submitted applications are visible to the team reviewing recruitment.</p><p className={styles.muted}>Progress saves automatically. You can leave and return later once it says “All changes saved.”</p>{!complete&&<p className={styles.muted}>Finish the profile checklist above to submit.</p>}</div><button type="submit" className={styles.primary} disabled={busy||!complete||conflict}>{busy?'Saving…':'Submit application'}</button></footer>}
      </form>
    </>}
  </main>;
}
