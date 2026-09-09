import {NextResponse} from 'next/server';
import {after} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {notifyReview} from '@/lib/ando-review';
export const maxDuration=120;
export async function POST(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {data:current,error:readError}=await db.from('members').select('id,review_status,submitted_at,onboarding_completed').eq('auth_user_id',user.id).single();
 if(readError||!current)return NextResponse.json({error:'Couldn’t load your profile.'},{status:404});
 if(!current.onboarding_completed)return NextResponse.json({error:'Finish onboarding before submitting your profile.'},{status:409});
 if(current.review_status==='approved')return NextResponse.json({error:'Your profile is already published.'},{status:409});
 // Keep the original submission timestamp on retries.
 if(current.review_status!=='pending_review'){
  const result=await db.from('members').update({review_status:'pending_review',submitted_at:new Date().toISOString(),is_approved:false}).eq('id',current.id).eq('review_status',current.review_status).select('id');
  if(result.error||!result.data?.length)return NextResponse.json({error:'Couldn’t submit. Refresh and try again.'},{status:409});
 }
 const {data:member}=await db.from('members').select('id,slug,first_name,last_name,program,submitted_at').eq('id',current.id).single();
 if(member)after(async()=>{
  for(let attempt=0;attempt<3;attempt++){
   try{await notifyReview(member);return;}catch{if(attempt<2)await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));}
  }
  console.error('[review] Ando delivery failed; dashboard retry available', {memberId:member.id});
 });
 return NextResponse.json({success:true});
}
