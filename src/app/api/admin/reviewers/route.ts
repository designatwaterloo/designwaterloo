import { NextResponse } from 'next/server';
import { requireAdmin, createAdminClient } from '@/lib/supabase/admin-guard';
export async function GET(){
 const auth=await requireAdmin();if(!auth.ok)return auth.response;
 const client=createAdminClient();const ids:string[]=[];
 for(let page=1;;page++) {const {data,error}=await client.auth.admin.listUsers({page,perPage:200});if(error)return NextResponse.json({error:'Could not load roles'},{status:500});ids.push(...data.users.filter(u=>u.app_metadata?.design_waterloo_role==='admin').map(u=>u.id));if(data.users.length<200)break;}
 if(!ids.length)return NextResponse.json({memberIds:[]});
 const {data,error}=await client.from('members').select('id').in('auth_user_id',ids);
 if(error)return NextResponse.json({error:'Could not load roles'},{status:500});
 return NextResponse.json({memberIds:data.map(m=>m.id)});
}
