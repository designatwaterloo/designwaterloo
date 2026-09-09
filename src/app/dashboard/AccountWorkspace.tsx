"use client";
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import {ArrowLeftIcon,UserCircleIcon,BriefcaseIcon,CalendarDaysIcon,MagnifyingGlassIcon,Cog6ToothIcon,ShieldCheckIcon,PencilIcon,ArrowPathIcon,ArrowRightStartOnRectangleIcon,LinkIcon,EnvelopeIcon} from '@heroicons/react/24/outline';
import { canReview } from '@/lib/admin-access';
import SocialIcon from '@/components/SocialIcon';
import PhotoEditor from './PhotoEditor';
import DeleteAccount from './DeleteAccount';
import PublicationHelp from './PublicationHelp';
import ReviewConfirmation from '@/components/ReviewConfirmation';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import Link from '@/components/Link';
import type { Member } from '@/types/database';
import { SPECIALTIES } from '@/lib/specialties';
import { normalizePortfolioUrl } from '@/lib/portfolio-url';
import { normalizeLinkedIn } from '@/lib/linkedin';
import { normalizeSocialUrl } from '@/lib/social-url';
import ExperienceFields from '../welcome/ExperienceFields';
import StudiesFields from '../welcome/StudiesFields';
import ScheduleFields from '../welcome/ScheduleFields';
import UsernameForm from '../settings/UsernameForm';
import { ImportedPosition, positionError, sortPositions } from '@/lib/experience-import';
import { workSequences } from '@/lib/work-sequences';
import styles from './page.module.css';

type Tab = 'Profile'|'Experience'|'Availability'|'Account';
export default function AccountWorkspace({member}:{member:Member}) {
 const {refreshMember,signOut,user}=useAuth();
 const db=useMemo(()=>createClient(),[]);
 const [confirmAction,setConfirmAction]=useState<'submit'|'unpublish'|null>(null);
 const [photoOpen,setPhotoOpen]=useState(false);
 const [sectionQuery,setSectionQuery]=useState('');
 const [jumpTarget,setJumpTarget]=useState('');
 const [tab,setTab]=useState<Tab>('Profile');
 useEffect(()=>{const section=window.location.hash.slice(1);const next=({profile:'Profile',experience:'Experience',availability:'Availability',account:'Account'} as Record<string,Tab>)[section];if(next){setTab(next);if(next==='Experience')void openExperience(false);}
 // Initialize the section once from the URL.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const [editing,setEditing]=useState<string|null>(null);
 const [draft,setDraft]=useState(member);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [notificationFailed,setNotificationFailed]=useState(false);
 const [notificationRetry,setNotificationRetry]=useState(0);
 const [positions,setPositions]=useState<ImportedPosition[]>([]);
 const [loadingPositions,setLoadingPositions]=useState(false);
 const status=member.review_status||'draft';
 useEffect(()=>{setNotificationFailed(false);if(status!=='pending_review'||!member.submitted_at)return;let cancelled=false;const retry=setTimeout(()=>{void fetch('/api/profile/notify-review',{method:'POST'}).then(response=>{if(!cancelled)setNotificationFailed(!response.ok);}).catch(()=>{if(!cancelled)setNotificationFailed(true);});},1000);return()=>{cancelled=true;clearTimeout(retry);};},[status,member.submitted_at,notificationRetry]);
 const label={draft:'Unpublished',approved:'Published',pending_review:'Under review',rejected:'Needs changes'}[status];
 function begin(section:string) {setDraft(member);setEditing(section);setError('');setNotice('');}
 function change(patch:Partial<Member>) {setDraft(d=>({...d,...patch}));}
 function cancel() {setDraft(member);setEditing(null);setError('');if(tab==='Experience')void openExperience(false);}
 async function save(patch:Partial<Member>) {
  if(busy)return;setBusy(true);setError('');
  try {const r=await db.from('members').update(patch).eq('id',member.id).select('id');if(r.error||!r.data?.length)throw Error('Couldn’t save your changes. Please try again.');await refreshMember();void fetch("/api/revalidate-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:member.slug})}).catch(()=>{});setEditing(null);setNotice('Changes saved.');}
  catch(e){setError(e instanceof Error?e.message:'Couldn’t save.');}finally{setBusy(false);}
 }
 async function openExperience(edit = true, leadership = false) {
  setLoadingPositions(true);setError('');if(edit)setNotice('');
  const r=await db.from(leadership?'member_leadership':'member_experiences').select('*').eq('member_id',member.id);
  if(r.error)setError('Couldn’t load your experience. Try again.');
  else {setPositions(sortPositions((r.data||[]).map(p=>({...p,company:'company' in p?p.company:p.organization,position_title:p.position_title||'',start_year:p.start_year||'',end_month:'end_month' in p?p.end_month:null,end_year:'end_year' in p?p.end_year:null,description:'description' in p?p.description||'':'',location:'location' in p?p.location||'':'',employment_type:'employment_type' in p?p.employment_type||'':''}))));if(edit)setEditing(leadership?'Leadership':'Experience');}
  setLoadingPositions(false);
 }
 async function saveExperience() {
  const invalid=positionError(positions);if(invalid){setError(invalid);return;}
  setBusy(true);setError('');
  try {
   // Read the current parent and leadership immediately before the atomic save.
   const [profile,leadership,experience]=await Promise.all([db.from('members').select('*').eq('id',member.id).single(),db.from('member_leadership').select('*').eq('member_id',member.id),db.from('member_experiences').select('*').eq('member_id',member.id)]);
   if(profile.error||leadership.error||experience.error)throw Error('Couldn’t load your saved profile. Please try again.');
   const r=await db.rpc('save_my_profile',{profile:profile.data,experiences:editing==='Leadership'?experience.data||[]:positions.map(p=>({...p,end_year:p.is_current?null:p.end_year,end_month:p.is_current?null:p.end_month})),leadership:editing==='Leadership'?positions.map(p=>({position_title:p.position_title,organization:p.company,start_month:p.start_month,start_year:p.start_year,is_current:p.is_current,link:p.link})):leadership.data||[],submit:false});
   if(r.error)throw Error('Couldn’t save your experience. Please try again.');
   await refreshMember();void fetch("/api/revalidate-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:member.slug})}).catch(()=>{});setEditing(null);setNotice('Experience saved.');void openExperience(false);
  }catch(e){setError(e instanceof Error?e.message:'Couldn’t save.');}finally{setBusy(false);}
 }
 const sectionIndex: {label:string;page:Tab;keywords:string}[]=[
 {label:'Photo',page:'Profile',keywords:'avatar picture'}, {label:'Bio',page:'Profile',keywords:'introduction about'},
 {label:'Program',page:'Profile',keywords:'school studies graduation'}, {label:'Skills',page:'Profile',keywords:'specialties'},
 {label:'Links',page:'Profile',keywords:'portfolio social instagram github linkedin email contact'},
 {label:'Your positions',page:'Experience',keywords:'jobs work experience linkedin'}, {label:'Leadership',page:'Experience',keywords:'community volunteer'},
 {label:'Work terms',page:'Availability',keywords:'calendar schedule availability coop'},
 {label:'Name',page:'Account',keywords:'first last name'}, {label:'Email',page:'Account',keywords:'school email login'},
 {label:'Username',page:'Account',keywords:'handle slug'}, {label:'Replay onboarding',page:'Account',keywords:'introduction onboarding'},
 ];
 const sectionResults=sectionIndex.filter(item=>`${item.label} ${item.page} ${item.keywords}`.toLowerCase().includes(sectionQuery.trim().toLowerCase()));
 useEffect(()=>{if(!jumpTarget)return;const frame=requestAnimationFrame(()=>{const heading=Array.from(document.querySelectorAll('h2')).find(el=>el.textContent===jumpTarget);if(heading){heading.scrollIntoView({block:'center',behavior:'smooth'});heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}setJumpTarget('');});return()=>cancelAnimationFrame(frame);},[tab,jumpTarget]);
 function jumpTo(item:{label:string;page:Tab}){if(editing)return;navigate(item.page);setJumpTarget(item.label);setSectionQuery('');}
 function navigate(next:Tab){if(editing)return;setTab(next);window.history.replaceState(null,'',`/dashboard#${next.toLowerCase()}`);setNotice('');setError('');if(next==='Experience')void openExperience(false);}
 const controls=(onSave:()=>void)=><div className={styles.formActions}><button type="button" className={styles.primaryButton} disabled={busy} onClick={onSave}>{busy?'Saving…':'Save changes'}</button><button type="button" className={styles.secondaryButton} disabled={busy} onClick={cancel}>Cancel</button></div>;
 const section=(name:string,_description:string,summary:ReactNode,form:ReactNode,onSave:()=>void)=><section className={styles.section} aria-label={name}><div className={styles.sectionTitle}><h2>{name}</h2></div><div className={styles.sectionBody}>{editing===name?<fieldset disabled={busy} className={styles.form}>{form}{controls(onSave)}</fieldset>:<div className={styles.summary}><div>{summary}</div><button type="button" className={styles.editButton} disabled={!!editing||busy} onClick={()=>begin(name)} aria-label={`Edit ${name.toLowerCase()}`} title={`Edit ${name.toLowerCase()}`}><PencilIcon width={20} height={20} aria-hidden="true"/></button></div>}</div></section>;
 const field=(name:string,key:keyof Member,multiline=false)=><label className={styles.field}>{name}{multiline?<textarea aria-label={name} name={key} value={String(draft[key]||'')} maxLength={3000} onChange={e=>change({[key]:e.target.value})}/>:<input aria-label={name} name={key} value={String(draft[key]||'')} maxLength={300} onChange={e=>change({[key]:e.target.value})}/>}</label>;
 return <main data-account-workspace className={styles.workspace}>
  {confirmAction&&<ReviewConfirmation action={confirmAction} onCancel={()=>setConfirmAction(null)} onConfirm={async()=>{
    if(confirmAction==='unpublish'){const r=await fetch('/api/profile/unpublish',{method:'POST'});if(!r.ok)throw Error('Couldn’t unpublish your profile.');await refreshMember();setNotice('Profile unpublished. Your details are saved.');}
    else {const r=await fetch('/api/profile/submit',{method:'POST'});if(!r.ok)throw Error('Couldn’t submit your profile. Refresh and try again.');await refreshMember();setNotice('Submitted for review. This usually takes about a day.');}
    setConfirmAction(null);
   }}/>}
  <aside className={styles.sidebar}><div className={styles.identity}><span className={styles.monogram}>{member.profile_image_url?<Image unoptimized src={member.profile_image_url} width={40} height={40} alt=""/>:<>{member.first_name[0]}{member.last_name[0]}</>}</span><div><strong>{member.first_name} {member.last_name}</strong><p>@{member.slug}</p></div></div><div className={styles.sectionSearch}><label><MagnifyingGlassIcon width={16} height={16} aria-hidden="true"/><span className="sr-only">Search sections</span><input type="search" placeholder="Search sections…" value={sectionQuery} disabled={!!editing} onChange={e=>setSectionQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setSectionQuery('');if(e.key==='Enter'&&sectionResults[0]){e.preventDefault();jumpTo(sectionResults[0]);}}}/></label>{sectionQuery.trim()&&<div className={styles.sectionResults} aria-label="Section search results">{sectionResults.length?sectionResults.map(item=><button key={item.label} onClick={()=>jumpTo(item)}><span>{item.label}</span><small>{item.page}</small></button>):<p role="status">No sections found.</p>}</div>}</div><nav aria-label="Account workspace">{(['Profile','Experience','Availability','Account'] as Tab[]).map(t=><button type="button" key={t} aria-current={tab===t?'page':undefined} disabled={!!editing&&tab!==t} onClick={()=>navigate(t)}>{(() => {const Icon={Profile:UserCircleIcon,Experience:BriefcaseIcon,Availability:CalendarDaysIcon,Account:Cog6ToothIcon}[t];return <Icon width={18} height={18} aria-hidden="true"/>;})()}{t}</button>)}{canReview(member,user)&&<Link href={member.is_admin?"/admin/members":"/admin"} className={styles.adminLink} aria-disabled={!!editing} onClick={e=>{if(editing)e.preventDefault();}}><ShieldCheckIcon width={18} height={18} aria-hidden="true"/>Admin</Link>}</nav><div className={styles.sidebarBottom}><Link href="/directory" className={styles.directoryButton}><ArrowLeftIcon width={18} height={18} aria-hidden="true"/><span>Back to directory</span></Link><button type="button" className={styles.signOut} disabled={busy||!!editing} onClick={()=>signOut()}><ArrowRightStartOnRectangleIcon width={18} height={18} aria-hidden="true"/>Sign out</button></div></aside>
  <div className={styles.panel}><header className={styles.pageHeader}><div><h1>{tab==='Profile'?'Your profile':tab}</h1><p className={styles.eyebrow}>{{Profile:'Manage your public profile.',Experience:'Your work and community roles.',Availability:'Keep your work terms up to date.',Account:'Manage your account details.'}[tab]}</p></div><div className={styles.headerActions}><div className={styles.statusGroup}><span className={styles.status}><i data-status={status}/>{label}</span><PublicationHelp/></div>{status==='approved'?<button className={styles.secondaryButton} disabled={busy||!!editing} onClick={()=>setConfirmAction('unpublish')}>Unpublish</button>:(status==='draft'||status==='rejected')&&<button className={styles.secondaryButton} disabled={busy||!!editing} onClick={()=>setConfirmAction('submit')}>Submit for review</button>}{status==='approved'&&member.is_approved&&<Link href={`/@${member.slug}`} className={styles.primaryButton}>View public profile ↗</Link>}</div></header>
   {status==='rejected'&&member.rejection_feedback&&<section className={styles.notice} aria-label="Requested changes"><h2>Changes requested</h2><p style={{whiteSpace:'pre-wrap'}}>{member.rejection_feedback}</p><p>Update your profile, then submit it for another review.</p></section>}
   {notificationFailed&&<p role="status" className={styles.notice}>Your submission is saved and in the review queue, but we couldn’t notify the team. <button type="button" className={styles.secondaryButton} onClick={()=>setNotificationRetry(value=>value+1)}>Retry notification</button></p>}
   {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
   {tab==='Profile'&&<>
    <section className={styles.section}><div className={styles.sectionTitle}><h2>Photo</h2><p>Use a real photo of yourself so people can recognize you.</p></div><div><button className={styles.photoButton} aria-label="Change or crop profile photo" disabled={!!editing} onClick={()=>setPhotoOpen(true)}>{member.profile_image_url?<Image unoptimized src={member.profile_image_url} width={80} height={100} alt="Your profile photo"/>:<span>Add photo</span>}<span className={styles.photoPencil}><PencilIcon width={22} height={22}/></span></button></div></section>
    {photoOpen&&<PhotoEditor url={member.profile_image_url||''} onCancel={()=>setPhotoOpen(false)} onSave={async url=>{const r=await db.from('members').update({profile_image_url:url}).eq('id',member.id).select('id');if(r.error||!r.data?.length)throw Error('Couldn’t save photo.');await refreshMember();setPhotoOpen(false);void fetch('/api/revalidate-profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:member.slug})});}}/>}
    {section('Bio','',<p>{member.bio||'Add a short introduction.'}</p>,field('Bio','bio',true),()=>void save({bio:draft.bio}))}
    {section('Program','Your school and graduating class.',<><strong>{member.program||'Add your program'}</strong><p>{member.school}{member.graduating_class?` · Class of ${member.graduating_class}`:''}</p></>,<><p className={styles.helper}>{member.school}</p><StudiesFields school={member.school||''} program={draft.program||''} year={draft.graduating_class||''} onProgram={program=>change({program})} onYear={graduating_class=>change({graduating_class})}/></>,()=>{if(draft.graduating_class&&!/^20\d{2}$/.test(draft.graduating_class)){setError('Enter a four-digit graduating year.');return;}void save({program:draft.program,graduating_class:draft.graduating_class});})}
    {section('Skills','What you like to make.',<div className={styles.tags}>{member.specialties?.length?member.specialties.map(s=><span key={s}>{s}</span>):<p>Add your skills.</p>}</div>,<><p className={styles.helper}>Choose up to five.</p><div className={styles.skillChoices}>{SPECIALTIES.map(s=><label key={s}><input type="checkbox" name="skills" checked={draft.specialties?.includes(s)||false} disabled={!draft.specialties?.includes(s)&&(draft.specialties?.length||0)>=5} onChange={e=>change({specialties:e.target.checked?[...(draft.specialties||[]),s]:(draft.specialties||[]).filter(v=>v!==s)})}/><span>{s}</span></label>)}</div></>,()=>void save({specialties:draft.specialties}))}
    <section className={styles.section} aria-label="Links"><div className={styles.sectionTitle}><h2>Links</h2></div><div className={styles.sectionBody}><fieldset className={styles.linksForm} disabled={busy||!!editing&&editing!=='Links'}>
     <legend className="sr-only">Profile links</legend>
     <div className={styles.linkGroup}>{([
      ['Portfolio','portfolio','Your website',LinkIcon],
      ['LinkedIn','linkedin','LinkedIn URL',null],
      ['Instagram','instagram','Instagram username or URL',null],
      ['GitHub','github','GitHub username or URL',null],
      ['X / Twitter','twitter','X username or URL',null],
      ['Public contact email','public_email','Public contact email',EnvelopeIcon],
     ] as const).map(([label,key,placeholder,Icon])=><label key={key} className={styles.linkRow}><span className={styles.linkIcon} aria-hidden="true">{Icon?<Icon width={20} height={20}/>:<SocialIcon platform={key as 'linkedin'|'instagram'|'github'|'twitter'}/>}</span><span className="sr-only">{label}</span><input name={key} type={key==='public_email'?'email':'text'} autoCapitalize="none" spellCheck={false} aria-label={label} placeholder={placeholder} maxLength={300} value={String((editing==='Links'?draft:member)[key]||'')} onChange={e=>{if(editing!=='Links')begin('Links');change({[key]:e.target.value});}}/></label>)}</div>
     {editing==='Links'&&controls(()=>{const portfolio=normalizePortfolioUrl(draft.portfolio||''),linkedin=normalizeLinkedIn(draft.linkedin||'');if(portfolio===null||linkedin===null){setError('Check your portfolio and LinkedIn links.');return;}if(draft.public_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.public_email)){setError('Enter a valid public contact email.');return;}const instagram=normalizeSocialUrl('instagram',draft.instagram||''),github=normalizeSocialUrl('github',draft.github||''),twitter=normalizeSocialUrl('twitter',draft.twitter||'');if(instagram===null||github===null||twitter===null){setError('Use a valid Instagram, GitHub, or X profile URL or username for each link.');return;}void save({portfolio,linkedin,instagram,github,twitter,public_email:draft.public_email});})}
    </fieldset></div></section>
   </>}
   {tab==='Experience'&&<section className={styles.singleSection}><h2>Your positions</h2>{!editing&&<button className={styles.secondaryButton} disabled={loadingPositions} onClick={()=>void openExperience()}>Paste from LinkedIn</button>}{editing==='Experience'||editing==='Leadership'?<><ExperienceFields leadership={editing==='Leadership'} value={positions} onChange={setPositions} disabled={busy}/>{controls(()=>void saveExperience())}</>:<>{positions.length>0?<ol className={styles.experienceList} role="list">{positions.map(p=><li key={p.id}><strong>{p.position_title}</strong><p>{p.company}</p><small>{p.start_year}{p.is_current?" – Present":p.end_year?` – ${p.end_year}`:""}</small></li>)}</ol>:<p>{loadingPositions?"Loading your positions…":"No positions added yet."}</p>}<button type="button" className={styles.secondaryButton} disabled={loadingPositions} onClick={()=>void openExperience()}>{loadingPositions?'Loading…':'Edit experience'}</button><div className={styles.replay}><h2>Leadership</h2><p>Community roles and organizations you’re part of.</p><button type="button" className={styles.secondaryButton} disabled={loadingPositions} onClick={()=>void openExperience(true,true)}>Edit leadership</button></div></>}</section>}
   {tab==='Availability'&&section('Work terms','When you’re available to work.',<ScheduleFields animated={false} choices={workSequences(member.school||'',member.program||'',member.graduating_class||'')} year={member.graduating_class||''} value={member.work_schedule||[]} onChange={()=>{}} editing={false}/>,<ScheduleFields animated={false} choices={workSequences(member.school||'',member.program||'',member.graduating_class||'')} year={member.graduating_class||''} value={draft.work_schedule||[]} onChange={work_schedule=>change({work_schedule})} editing/>,()=>void save({work_schedule:draft.work_schedule}))}
   {tab==='Account'&&<>
    {section('Name','',<strong>{member.first_name} {member.last_name}</strong>,<div className={styles.columns}>{field('First name','first_name')}{field('Last name','last_name')}</div>,()=>{if(!draft.first_name.trim()||!draft.last_name.trim()){setError('Enter your first and last name.');return;}void save({first_name:draft.first_name.trim(),last_name:draft.last_name.trim()});})}
    <section className={styles.section}><div className={styles.sectionTitle}><h2>Email</h2></div><div className={styles.sectionBody}><label className={styles.field}><span className="sr-only">Email</span><input type="email" value={member.school_email||''} readOnly aria-disabled="true" className={styles.lockedEmail} aria-describedby="account-email-help"/></label><p id="account-email-help" className={styles.accountHelp}>Your university sign-in email.</p></div></section>
    <section className={styles.section}><div className={styles.sectionTitle}><h2>Username</h2></div><div className={styles.usernameField}><UsernameForm currentUsername={member.slug} compact/></div></section>
    <section className={styles.section}><div className={styles.sectionTitle}><h2>Replay onboarding</h2></div><div className={styles.sectionBody}><Link href="/welcome?replay=true" className={styles.secondaryButton}><ArrowPathIcon width={17} height={17} aria-hidden="true"/>Replay onboarding</Link></div></section>
    <section className={styles.section}><div className={styles.sectionTitle}><h2>Session</h2></div><div className={styles.sectionBody}><button type="button" className={`${styles.secondaryButton} ${styles.signOut}`} onClick={()=>signOut()}><ArrowRightStartOnRectangleIcon width={18} height={18} aria-hidden="true"/>Sign out</button></div></section>
    <DeleteAccount fullName={`${member.first_name} ${member.last_name}`}/>
   </>}
   {editing&&<p className={styles.editHint}>Save or cancel this section before switching pages.</p>}
  </div>
 </main>;
}
