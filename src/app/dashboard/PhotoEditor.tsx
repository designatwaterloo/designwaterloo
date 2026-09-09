"use client";
import {useEffect,useRef,useState} from 'react';
import styles from './page.module.css';
export default function PhotoEditor({url,onSave,onCancel}:{url:string;onSave:(url:string)=>Promise<void>;onCancel:()=>void}){
 const [ready,setReady]=useState(false);
 const [source,setSource]=useState(url),[zoom,setZoom]=useState(1),[x,setX]=useState(50),[y,setY]=useState(50),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null),loaded=useRef<HTMLImageElement|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 function draw(img:HTMLImageElement){const c=canvas.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;const scale=Math.max(c.width/img.width,c.height/img.height)*zoom,w=img.width*scale,h=img.height*scale;ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,-(w-c.width)*x/100,-(h-c.height)*y/100,w,h);}
 useEffect(()=>{setReady(false);if(!source)return;const img=new window.Image();img.crossOrigin='anonymous';img.onload=()=>{loaded.current=img;draw(img);setReady(true);};img.onerror=()=>setError('Couldn’t load this photo. Choose a new image.');img.src=source;
 // Draw controls are handled separately below.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[source]);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{if(loaded.current)draw(loaded.current);},[zoom,x,y]);
 useEffect(()=>()=>{if(source.startsWith('blob:'))URL.revokeObjectURL(source);},[source]);
 async function save(){setBusy(true);setError('');try{const blob=await new Promise<Blob>((resolve,reject)=>canvas.current?.toBlob(b=>b?resolve(b):reject(Error('Couldn’t crop photo.')),'image/jpeg',.92));const body=new FormData();body.append('file',blob,'profile.jpg');const r=await fetch('/api/upload-image',{method:'POST',body});const data=await r.json();if(!r.ok)throw Error(data.error||'Upload failed.');await onSave(data.imageUrl);}catch(e){setError(e instanceof Error?e.message:'Couldn’t save photo.');}finally{setBusy(false);}}
 return <dialog ref={dialog} className={styles.photoDialog} onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}><h2>Profile photo</h2><canvas ref={canvas} width={640} height={800} aria-label="Photo crop preview"/><fieldset disabled={busy}><label className={styles.field}>Change photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>10*1024*1024){setError('Choose a photo under 10 MB.');return;}setError('');setSource(URL.createObjectURL(f));setZoom(1);setX(50);setY(50);}}/></label>{[['Zoom',zoom,setZoom,1,3],['Horizontal position',x,setX,0,100],['Vertical position',y,setY,0,100]].map(([label,value,set,min,max])=><label className={styles.field} key={String(label)}>{String(label)}<input type="range" min={Number(min)} max={Number(max)} step=".01" value={Number(value)} onChange={e=>(set as (v:number)=>void)(Number(e.target.value))}/></label>)}{error&&<p role="alert">{error}</p>}<div className={styles.formActions}><button className={styles.primaryButton} disabled={!ready} onClick={save}>{busy?'Saving…':'Save photo'}</button><button className={styles.secondaryButton} onClick={onCancel}>Cancel</button></div></fieldset></dialog>;
}
