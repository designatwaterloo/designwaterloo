import 'server-only';
const endpoint='https://mcp.ando.so/mcp';
const workspace='9f2e7171-1f97-432e-bf7d-d051e32c982d';
export async function notifyReview(member:{id:string;slug:string;first_name:string;last_name:string;program:string|null;submitted_at:string|null},test=false){
 if(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||'http://localhost').hostname!=='skalyworwmxcofolgnjs.supabase.co')return;
 const key=process.env.ANDO_REVIEW_API_KEY,channel=process.env.ANDO_REVIEW_CHANNEL_ID;
 if(!key||!channel)throw Error('Ando review notifications are not configured.');
 let session:string|null=null;
 async function rpc(method:string,params:unknown,id?:number){
  const headers:Record<string,string>={Authorization:`Bearer ${key}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream'};
  if(session)headers['Mcp-Session-Id']=session;
  const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',...(id?{id}:{}),method,params}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Ando notification request failed.');
  session=response.headers.get('Mcp-Session-Id')||session;
  if(!id)return null;
  const text=await response.text();
  const messages=response.headers.get('content-type')?.includes('text/event-stream')?text.split('\n').filter(l=>l.startsWith('data:')).map(l=>JSON.parse(l.slice(5))):[JSON.parse(text)];
  const result=messages.find(m=>m.id===id);
  if(!result||result.error||result.result?.isError)throw Error('Ando notification failed.');
  return result.result;
 }
 await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'design-waterloo-reviews',version:'1.0'}},1);
 await rpc('notifications/initialized',{});
 const principal=await rpc('tools/call',{name:'get_current_principal',arguments:{}},2);
 const identity=principal?.structuredContent || JSON.parse(principal?.content?.find((item:{type:string;text?:string})=>item.type==='text')?.text || '{}');
 if(identity.principal?.workspace_id!==workspace)throw Error('Ando workspace did not match Design Waterloo.');
 if(identity.principal?.principal_type!=='agent')throw Error('Review notifications require an Ando bot credential, not a personal credential.');
 const clean=(value:string)=>value.replace(/[\r\n\[\]<>*_\x60]/g,' ').trim();
 await rpc('tools/call',{name:'send_message',arguments:{conversation_id:channel,idempotency_key:`profile-review:${member.id}:${member.submitted_at}`,markdown_content:test?"Connection test: automatic profile-review notifications are connected. No student was submitted.":`**New profile submission**\n\n${clean(member.first_name)} ${clean(member.last_name)}${member.program?' · '+clean(member.program):''}\n\n[Review submissions](https://designwaterloo.com/admin) · [Profile](https://designwaterloo.com/@${encodeURIComponent(member.slug)})\n\n_Automatic notification from Design Waterloo._`}},3);
}
