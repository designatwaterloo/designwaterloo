import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, createAdminClient } from '@/lib/supabase/admin-guard';

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
 const auth=await requireAdmin(); if(!auth.ok)return auth.response;
 const {id}=await params;
 let body;try{body=await request.json();}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 if(typeof body.isAdmin!=='boolean')return NextResponse.json({error:'isAdmin must be boolean'},{status:400});
 if(id===auth.caller.memberId)return NextResponse.json({error:'Cannot change your own access'},{status:400});
 const client=createAdminClient();
 const {data:target,error}=await client.from('members').select('auth_user_id,is_admin').eq('id',id).maybeSingle();
 if(error)return NextResponse.json({error:'Could not load account'},{status:500});
 if(!target)return NextResponse.json({error:'Member not found'},{status:404});
 if(target.is_admin)return NextResponse.json({error:'Superadmin access cannot be changed here'},{status:403});
 if(!target.auth_user_id)return NextResponse.json({error:'This member must sign in before being granted admin access'},{status:400});
 const result=await client.auth.admin.updateUserById(target.auth_user_id,{app_metadata:{design_waterloo_role:body.isAdmin?'admin':null}});
 if(result.error)return NextResponse.json({error:'Could not update access'},{status:500});
 return NextResponse.json({ok:true,memberId:id,isAdmin:body.isAdmin});
}
