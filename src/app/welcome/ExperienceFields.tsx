"use client";
import { useEffect, useRef, useState } from 'react';
import { useUnsavedChanges } from "@/components/UnsavedChanges";
import Image from 'next/image';
import { PencilIcon } from '@heroicons/react/24/outline';
import { ImportedPosition, mergePositions, newPosition, parseExperience, positionFieldError, positionIncomplete, sortPositions } from '@/lib/experience-import';
import { parseExperienceHtml } from '@/lib/experience-html';
import styles from './ExperienceFields.module.css';

function requiredLabel(text:string, invalid=false) {
  return <span>{text}<span className={styles.required} data-invalid={invalid||undefined} aria-hidden="true">*</span></span>;
}

export default function ExperienceFields({value,onChange,disabled=false,leadership=false,initialOpen=null,hideAdd=false,hidePaste=false,showRequired=false}:{leadership?:boolean;value:ImportedPosition[];onChange:(v:ImportedPosition[])=>void;disabled?:boolean;initialOpen?:string|null;hideAdd?:boolean;hidePaste?:boolean;showRequired?:boolean}) {
  const [htmlMode,setHtmlMode]=useState(false);
  const [paste,setPaste]=useState('');
  const [message,setMessage]=useState('');
  useUnsavedChanges(paste.length>0);
  const [open,setOpen]=useState<string|null>(initialOpen);
  const [attempted,setAttempted]=useState<string|null>(null);
  useEffect(()=>{setOpen(initialOpen);},[initialOpen]);
  const input=useRef<HTMLTextAreaElement>(null);
  function importText(text:string) {
    setPaste(text);
    const result=htmlMode?parseExperienceHtml(text):parseExperience(text);
    if(!result.positions.length) {setMessage(result.warning||'');return;}
    const merged=mergePositions(value,result.positions);
    const count=merged.length-value.length;
    onChange(merged);setPaste('');setOpen(null);
    setMessage(result.warning || (count ? `${count} position${count===1?'':'s'} added. Review anything you want to change.` : 'These positions are already here.'));
  }
  async function clipboard() {
    try { importText(await navigator.clipboard.readText()); }
    catch { setMessage('Paste into the box using your keyboard or touch and hold.');input.current?.focus(); }
  }
  function update(id:string,patch:Partial<ImportedPosition>) {onChange(value.map(p=>p.id===id?{...p,...patch}:p));}
  function add() {const p=newPosition();onChange([p,...value]);setOpen(p.id);setAttempted(null);}
  function toggle(p:ImportedPosition) {
    if(open===p.id) {
      if(positionIncomplete(p)) {setAttempted(p.id);return;}
      setAttempted(null);setOpen(null);onChange(sortPositions(value));return;
    }
    const current=value.find(entry=>entry.id===open);
    if(current&&positionIncomplete(current)) {setAttempted(current.id);return;}
    setAttempted(null);setOpen(p.id);
    if(current) onChange(sortPositions(value));
  }
  function remove(id:string) {
    onChange(value.filter(e=>e.id!==id));
    if(open===id) setOpen(null);
    if(attempted===id) setAttempted(null);
  }
  const companyLabel=leadership?'Organization':'Company';
  return <fieldset className={styles.root} disabled={disabled}>
    <legend className="sr-only">Experience</legend>
    {!leadership&&!hidePaste&&<div className={styles.paste}>
      <label htmlFor="experience-paste">{htmlMode?'Paste Experience HTML':'Copy your LinkedIn Experience section'}</label>
      <textarea ref={input} id="experience-paste" name="experience-paste" value={paste} maxLength={htmlMode?300000:100000} placeholder={htmlMode?"Paste the copied Experience div here.":"Paste it here. We’ll fill in your positions."} onChange={e=>setPaste(e.target.value)} onPaste={e=>{const text=e.clipboardData.getData('text/plain');if(text){e.preventDefault();importText(text);}}}/>
      <div className={styles.actions}><button type="button" onClick={paste.trim()?()=>importText(paste):clipboard}>{paste.trim()?'Import text':'Paste experience'}</button>{!hideAdd&&<button type="button" onClick={add}>+ Add position</button>}</div>
    </div>}
    {leadership&&!hideAdd&&<button type="button" onClick={add}>+ Add leadership role</button>}
    {!leadership&&!hidePaste&&<button className={styles.mode} type="button" aria-pressed={htmlMode} onClick={()=>{setHtmlMode(v=>!v);setPaste('');setMessage('');}}>{htmlMode?'Use plain text':'Try HTML paste (experimental)'}</button>}
    {htmlMode&&<p className={styles.message}>HTML can preview company logos. These previews aren’t saved yet.</p>}
    {message&&<p className={styles.message} role="status" aria-live="polite">{message}</p>}
    <ol className={styles.positions} role="list">
      {value.map((p,index)=>{
        const missing=showRequired||attempted===p.id;
        const fieldError=missing?positionFieldError(p,leadership):null;
        return <li key={p.id} className={styles.position} data-open={open===p.id||undefined} style={{'--entry-delay':`${Math.min(index,8)*35}ms`} as React.CSSProperties}>
        <div className={styles.summary}>
          <button type="button" className={styles.summaryMain} aria-expanded={open===p.id} onClick={()=>toggle(p)}>
            {p.logo_preview && <Image unoptimized width={32} height={32} className={styles.logo} src={p.logo_preview} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}}/>}
            <span className={styles.summaryCopy}><strong>{p.position_title||(leadership?'New role':'New position')}</strong><span>{[p.company||(leadership?'Add organization':'Add company'),p.start_year?`${p.start_year}${p.is_current?' – Present':p.end_year?` – ${p.end_year}`:''}`:''].filter(Boolean).join(' · ')}</span></span>
          </button>
          {open===p.id?<button type="button" className={styles.remove} onClick={()=>toggle(p)}>Close</button>:<button type="button" className={styles.edit} onClick={()=>toggle(p)} aria-label={`Edit ${p.position_title||(leadership?'leadership role':'position')}`} title={`Edit ${p.position_title||(leadership?'leadership role':'position')}`}><PencilIcon width={20} height={20} aria-hidden="true"/></button>}
        </div>
        {open!==p.id&&fieldError&&<p className={styles.fieldError} role="alert">{fieldError}</p>}
        {open===p.id&&<div className={styles.editorReveal}><div className={styles.editor}>
          <label>{requiredLabel('Title', showRequired&&!p.position_title.trim())}<input autoFocus={!p.position_title} name="position-title" value={p.position_title} maxLength={200} required aria-required="true" aria-invalid={missing&&!p.position_title.trim()?true:undefined} onChange={e=>update(p.id,{position_title:e.target.value})}/></label>
          <label>{requiredLabel(companyLabel, showRequired&&!p.company.trim())}<input name="position-company" value={p.company} maxLength={300} required aria-required="true" aria-invalid={missing&&!p.company.trim()?true:undefined} onChange={e=>update(p.id,{company:e.target.value})}/></label>
          <div className={styles.dates}>
            <label>Start month<select name="start-month" value={p.start_month||''} onChange={e=>update(p.id,{start_month:e.target.value||null})}><option value="">Month (optional)</option>{Array.from({length:12},(_,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{new Date(2020,i).toLocaleString('en',{month:'long'})}</option>)}</select></label>
            <label>{requiredLabel('Start year', showRequired&&!/^\d{4}$/.test(p.start_year))}<input name="start-year" inputMode="numeric" maxLength={4} value={p.start_year} required aria-required="true" aria-invalid={missing&&!/^\d{4}$/.test(p.start_year)?true:undefined} onChange={e=>update(p.id,{start_year:e.target.value.replace(/\D/g,'')})}/></label>
          </div>
          <label className={styles.current}><input type="checkbox" name="current-position" checked={p.is_current} onChange={e=>update(p.id,{is_current:e.target.checked})}/> I currently work here</label>
          {!leadership&&!p.is_current&&<div className={styles.dates}>
            <label>End month<select name="end-month" value={p.end_month||''} onChange={e=>update(p.id,{end_month:e.target.value||null})}><option value="">Month (optional)</option>{Array.from({length:12},(_,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{new Date(2020,i).toLocaleString('en',{month:'long'})}</option>)}</select></label>
            <label>End year<input name="end-year" inputMode="numeric" maxLength={4} value={p.end_year||''} onChange={e=>update(p.id,{end_year:e.target.value.replace(/\D/g,'')||null})}/></label>
          </div>}
          {!leadership&&<><label>Location<input name="position-location" value={p.location} maxLength={300} onChange={e=>update(p.id,{location:e.target.value})}/></label>
          <label>Description<textarea name="position-description" value={p.description} maxLength={10000} onChange={e=>update(p.id,{description:e.target.value})}/></label></>}
          {fieldError&&<p className={styles.fieldError} role="alert">{fieldError}</p>}
          <div className={styles.editorActions}><button type="button" onClick={()=>remove(p.id)}>Delete</button></div>
        </div></div>}
      </li>;})}
    </ol>
  </fieldset>;
}
