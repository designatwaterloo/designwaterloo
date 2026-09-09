"use client";
import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImportedPosition, mergePositions, newPosition, parseExperience, sortPositions } from '@/lib/experience-import';
import { parseExperienceHtml } from '@/lib/experience-html';
import styles from './ExperienceFields.module.css';

export default function ExperienceFields({value,onChange,disabled=false,leadership=false}:{leadership?:boolean;value:ImportedPosition[];onChange:(v:ImportedPosition[])=>void;disabled?:boolean}) {
  const [htmlMode,setHtmlMode]=useState(false);
  const [paste,setPaste]=useState('');
  const [message,setMessage]=useState('');
  const [open,setOpen]=useState<string|null>(null);
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
  function add() {const p=newPosition();onChange([p,...value]);setOpen(p.id);}
  return <fieldset className={styles.root} disabled={disabled}>
    <legend className="sr-only">Experience</legend>
    {!leadership&&<div className={styles.paste}>
      <label htmlFor="experience-paste">{htmlMode?'Paste Experience HTML':'Copy your LinkedIn Experience section'}</label>
      <textarea ref={input} id="experience-paste" name="experience-paste" value={paste} maxLength={htmlMode?300000:100000} placeholder={htmlMode?"Paste the copied Experience div here.":"Paste it here. We’ll fill in your positions."} onChange={e=>setPaste(e.target.value)} onPaste={e=>{const text=e.clipboardData.getData('text/plain');if(text){e.preventDefault();importText(text);}}}/>
      <div className={styles.actions}><button type="button" onClick={paste.trim()?()=>importText(paste):clipboard}>{paste.trim()?'Import text':'Paste experience'}</button><button type="button" onClick={add}>+ Add position</button></div>
    </div>}
    {leadership&&<button type="button" onClick={add}>+ Add leadership role</button>}
    {!leadership&&<button className={styles.mode} type="button" aria-pressed={htmlMode} onClick={()=>{setHtmlMode(v=>!v);setPaste('');setMessage('');}}>{htmlMode?'Use plain text':'Try HTML paste (experimental)'}</button>}
    {htmlMode&&<p className={styles.message}>HTML can preview company logos. These previews aren’t saved yet.</p>}
    <p className={styles.message} role="status" aria-live="polite">{message || (leadership?'Add your community and leadership roles.':'Or add positions manually. You can skip this for now.')}</p>
    <ol className={styles.positions} role="list">
      {value.map((p,index)=><li key={p.id} className={styles.position} style={{'--entry-delay':`${Math.min(index,8)*35}ms`} as React.CSSProperties}>
        <button type="button" className={styles.summary} aria-expanded={open===p.id} onClick={()=>setOpen(open===p.id?null:p.id)}>
          <span>{p.logo_preview && <Image unoptimized width={32} height={32} className={styles.logo} src={p.logo_preview} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none";}}/>}<strong>{p.position_title||'New position'}</strong><span>{p.company||'Add company'}{p.start_year?` · ${p.start_year}${p.is_current?' – Present':p.end_year?` – ${p.end_year}`:''}`:''}</span></span><span>{open===p.id?'Close':'Edit'}</span>
        </button>
        {open===p.id&&<div className={styles.editor}>
          <label>Title<input autoFocus={!p.position_title} name="position-title" value={p.position_title} maxLength={200} onChange={e=>update(p.id,{position_title:e.target.value})}/></label>
          <label>{leadership?'Organization':'Company'}<input name="position-company" value={p.company} maxLength={300} onChange={e=>update(p.id,{company:e.target.value})}/></label>
          <div className={styles.dates}>
            <label>Start month<select name="start-month" value={p.start_month||''} onChange={e=>update(p.id,{start_month:e.target.value||null})}><option value="">Month (optional)</option>{Array.from({length:12},(_,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{new Date(2020,i).toLocaleString('en',{month:'long'})}</option>)}</select></label>
            <label>Start year<input name="start-year" inputMode="numeric" maxLength={4} value={p.start_year} onChange={e=>update(p.id,{start_year:e.target.value.replace(/\D/g,'')})}/></label>
          </div>
          <label className={styles.current}><input type="checkbox" name="current-position" checked={p.is_current} onChange={e=>update(p.id,{is_current:e.target.checked})}/> I currently work here</label>
          {!leadership&&!p.is_current&&<div className={styles.dates}>
            <label>End month<select name="end-month" value={p.end_month||''} onChange={e=>update(p.id,{end_month:e.target.value||null})}><option value="">Month (optional)</option>{Array.from({length:12},(_,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{new Date(2020,i).toLocaleString('en',{month:'long'})}</option>)}</select></label>
            <label>End year<input name="end-year" inputMode="numeric" maxLength={4} value={p.end_year||''} onChange={e=>update(p.id,{end_year:e.target.value.replace(/\D/g,'')||null})}/></label>
          </div>}
          {!leadership&&<><label>Location<input name="position-location" value={p.location} maxLength={300} onChange={e=>update(p.id,{location:e.target.value})}/></label>
          <label>Description<textarea name="position-description" value={p.description} maxLength={10000} onChange={e=>update(p.id,{description:e.target.value})}/></label></>}
          <div className={styles.actions}><button type="button" onClick={()=>{setOpen(null);onChange(sortPositions(value));}}>Done</button><button type="button" onClick={()=>{onChange(value.filter(e=>e.id!==p.id));setOpen(null);}}>Remove position</button></div>
        </div>}
      </li>)}
    </ol>
  </fieldset>;
}
