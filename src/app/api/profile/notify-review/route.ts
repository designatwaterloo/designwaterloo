import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {notifyReview} from '@/lib/ando-review';
export async function POST(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {data:member,error}=await db.from('members').select('id,slug,first_name,last_name,program,submitted_at,review_status').eq('auth_user_id',user.id).single();
 if(error||!member)return NextResponse.json({error:'Profile unavailable'},{status:404});
 if(member.review_status!=='pending_review'||!member.submitted_at)return NextResponse.json({skipped:true});
 try{await notifyReview(member);return NextResponse.json({success:true});}
 catch{return NextResponse.json({error:'Your profile was submitted, but the team notification could not be sent. Open your dashboard to retry.'},{status:503});}
}
