"use client";
import {useEffect,useRef,useState} from 'react';
import styles from '@/app/dashboard/page.module.css';
export const reviewMessage='We hand-curate students in the directory. Review usually takes about a day, and your profile becomes public once approved.';
export default function ReviewConfirmation({action,onConfirm,onCancel}:{action:'submit'|'unpublish';onConfirm:()=>Promise<void>;onCancel:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{ref.current?.showModal();},[]);
 return <dialog ref={ref} className={styles.confirmDialog} onCancel={e=>{e.preventDefault();if(!busy)onCancel();}} aria-labelledby="review-confirm-heading"><h2 id="review-confirm-heading">{action==='unpublish'?'Unpublish your profile?':'Submit your profile for review?'}</h2><p>{action==='unpublish'?'Your profile will leave the public directory. To publish it again, you’ll need to resubmit it for review.':'Publishing requires approval from our team.'}</p><p>{reviewMessage}</p>{error&&<p role="alert">{error}</p>}<div className={styles.formActions}><button className={styles.secondaryButton} disabled={busy} onClick={onCancel}>Cancel</button><button className={styles.primaryButton} disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await onConfirm();}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}}>{busy?'Please wait…':action==='unpublish'?'Unpublish profile':'Confirm submission'}</button></div></dialog>;
}
