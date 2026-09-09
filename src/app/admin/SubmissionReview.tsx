import SocialIcon from '@/components/SocialIcon';
import ScheduleFields from '../welcome/ScheduleFields';
import { workSequences } from '@/lib/work-sequences';
import { normalizeSocialUrl, type SocialPlatform } from '@/lib/social-url';
import { LinkIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import type { Member } from '@/types/database';
import Link from '@/components/Link';
import styles from './page.module.css';

export default function SubmissionReview({member:m,busy,onApprove,onChanges}:{member:Member;busy:boolean;onApprove:(member:Member)=>void;onChanges:(member:Member)=>void}) {
 const links=[['Portfolio','portfolio',m.portfolio],['LinkedIn','linkedin',m.linkedin],['Instagram','instagram',m.instagram],['GitHub','github',m.github],['X','twitter',m.twitter]].filter((entry):entry is [string,string,string]=>!!entry[2]);
 const safeUrl=(value:string)=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}};
 return <article className={styles.submission} aria-label={`Review ${m.first_name} ${m.last_name}`}>
  <header className={styles.submissionHeader}><div><h2>{m.first_name} {m.last_name}</h2><p>{m.school_email}</p></div><Link href={`/@${m.slug}`} className={styles.previewLink} target="_blank" rel="noopener noreferrer">Full profile ↗</Link></header>
  {m.school_email.endsWith('@test.designwaterloo.local')&&<p className={styles.demo}>Demo submission · Fictional account for trying the review flow.</p>}
  <dl className={styles.details}>
   <div><dt>Photo</dt><dd>{m.profile_image_url?<img className={styles.reviewPhoto} src={m.profile_image_url} alt={`${m.first_name} ${m.last_name}`}/>:<span>No photo added</span>}</dd></div>
   <div><dt>Program</dt><dd>{m.program||'Not provided'}<br/>{m.school} · Class of {m.graduating_class||'—'}</dd></div>
   <div><dt>Bio</dt><dd>{m.bio||'No bio added'}</dd></div>
   <div><dt>Skills</dt><dd>{m.specialties?.length?<ul className={styles.skillChips} aria-label="Skills">{m.specialties.map(skill=><li key={skill}>{skill}</li>)}</ul>:'No skills added'}</dd></div>
   <div><dt>Links</dt><dd className={styles.reviewLinks}>{links.length?links.map(([label,key,value])=>{const href=key==='portfolio'?safeUrl(value):normalizeSocialUrl(key as SocialPlatform,value);const content=<><span className={styles.socialIcon} aria-hidden="true">{key==='portfolio'?<LinkIcon/>:<SocialIcon platform={key as SocialPlatform} size={18}/>}</span><span className={styles.linkText}><strong>{label}</strong><span>{href?href.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''):value}</span>{!href&&<small className={styles.invalidLink}>Check link — invalid {label} address</small>}</span>{href&&<ArrowUpRightIcon className={styles.externalIcon} aria-hidden="true"/>}</>;return href?<a key={key} className={styles.socialLink} href={href} target="_blank" rel="noopener noreferrer">{content}</a>:<div key={key} className={styles.socialLink}>{content}</div>}):'No links added'}</dd></div>
   <div className={styles.calendarDetail}><dt>Availability</dt><dd>{m.work_schedule?.length?<ScheduleFields key={m.id} animated={false} choices={workSequences(m.school||'',m.program||'',m.graduating_class||'')} year={m.graduating_class||''} value={m.work_schedule} onChange={()=>{}} editing={false}/>: 'No work terms selected'}</dd></div>
   {m.rejection_feedback&&<div><dt>Previous feedback</dt><dd>{m.rejection_feedback}</dd></div>}
  </dl>
  <footer className={styles.decision}><p>Check their photo, student details, and work before publishing.</p><div><button type="button" className={styles.actionButton} disabled={busy} onClick={()=>onChanges(m)}>Request changes</button><button type="button" className={`${styles.actionButton} ${styles.approveButton}`} disabled={busy} onClick={()=>onApprove(m)}>Approve profile</button></div></footer>
 </article>;
}
