import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {applyCommand,attachMember,visibleState,photoVisible} from './service.js';
const url=Deno.env.get('SUPABASE_URL')!, secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'POST required.'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)return json({error:'Sign in first.'},401);
  const {data:auth,error:authError}=await db.auth.getUser(token);if(authError||!auth.user)return json({error:'Your session has expired. Sign in again.'},401);
  const {data:member,error:memberError}=await db.from('sahyog_members').select('*').eq('id',auth.user.id).single();if(memberError)return json({error:'Account setup is missing. Run setup.sql, then sign up again.'},403);
  const raw=await req.text();if(raw.length>250000)return json({error:'Request too large.'},413);
  const {op='read',args=[]}=JSON.parse(raw||'{}');
  const {data:row,error}=await db.from('sahyog_state').select('*').eq('id',1).single();if(error)throw error;
  const state=row.data;attachMember(state,member);
  if(op==='photo'){
   const path=args[0];if(typeof path!=='string'||!photoVisible(state,member.id,path))return json({error:'Photo access denied.'},403);
   const {data,error}=await db.storage.from('sahyog-evidence').createSignedUrl(path,300);if(error)throw error;return json({url:data.signedUrl});
  }
  if(op==='admin-member'){
   if(member.role!=='admin')return json({error:'Administrator access required.'},403);
   const [id,role,certs]=args;if(!['borrower','owner','admin'].includes(role)||!Array.isArray(certs)||certs.length>50||certs.some(c=>typeof c!=='string'||c.length>200))throw Error('Invalid role or certifications.');
   if(id===member.id&&role!=='admin')throw Error('Use another administrator to change your own role.');
   const {error}=await db.from('sahyog_members').update({role,certs}).eq('id',id);if(error)throw error;
   return json({ok:true});
  }
  const {data:members,error:membersError}=await db.from('sahyog_members').select('*');if(membersError)throw membersError;
  for(const m of members)attachMember(state,m);state.session=member.id;
  if(op==='read')return json({state:visibleState(state,member.id)});
  const photo=op==='decide'?args[3]?.photoId:['saveResource','reportIncident'].includes(op)?args[0]?.photoId:null;
  if(photo){
   const old=op==='saveResource'?state.resources.find((r:any)=>r.id===args[0].id)?.photoId:null;
   if(photo!==old){if(typeof photo!=='string'||!photo.startsWith(member.id+'/')||!/^[-a-zA-Z0-9/_.]+$/.test(photo))throw Error('Upload your own photo first.');
    const parts=photo.split('/'),file=parts.pop()!;const {data:files,error}=await db.storage.from('sahyog-evidence').list(parts.join('/'),{search:file});if(error||!files?.some(f=>f.name===file))throw Error('Photo upload not found.');
   }
  }
  const next=applyCommand(state,member,op,args);next.state.session=null;
  const {data:updated,error:updateError}=await db.from('sahyog_state').update({data:next.state,revision:row.revision+1}).eq('id',1).eq('revision',row.revision).select('id');if(updateError)throw updateError;
  if(!updated?.length)return json({error:'Another person updated the workspace. Refresh and try again.'},409);
  return json({state:visibleState(next.state,member.id),result:next.result});
 }catch(error){console.error('sahyog-api',error instanceof Error?error.message:'Request failed');return json({error:error instanceof Error?error.message:'Unable to complete the request.'},400)}
});
