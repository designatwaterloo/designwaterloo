import {NextResponse} from 'next/server';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
import {createClient as serviceClient} from '@supabase/supabase-js';
export async function POST(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return NextResponse.json({error:'Couldn’t unpublish. Please try again later.'},{status:503});
 const admin=serviceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.from('members').update({is_approved:false,review_status:'draft',submitted_at:null}).eq('auth_user_id',user.id).select('slug').single();
 if(error||!data)return NextResponse.json({error:'Couldn’t unpublish your profile.'},{status:500});
 revalidatePath('/directory');revalidatePath('/');revalidatePath('/@'+data.slug);revalidatePath('/directory/'+data.slug);
 return NextResponse.json({success:true});
}
