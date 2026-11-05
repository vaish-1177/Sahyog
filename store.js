import * as demo from './helpers.js';
import {client,call} from './backend.js';
export const {KEY,uid,today,dayAfter,hours,usage,eligible,conflicts,overlaps}=demo;
export let storageWarning='';
let state={version:3,revision:0,session:null,users:[],resources:[],bookings:[],activity:[],notifications:[],incidents:[],comments:[],alerts:[],favorites:{},recent:{},views:{},policy:{quota:20,concurrent:3,advance:30,waitlist:true,priority:'usage',noShow:'review'},guide:false};
export const get=()=>state;
export const user=()=>state.users.find(p=>p.id===state.session);
export const event=()=>{}; // Audit events are created by the server, never trusted from a client.
let queue=Promise.resolve();
export function execute(op,args=[]){const pending=queue.then(async()=>{const data=await call(op,args);if(data.state)state=data.state;return data.result});queue=pending.catch(()=>{});return pending;}
export async function refresh(){return execute('read')}
export async function initialize(){if(!client)return;const {data:{session},error}=await client.auth.getSession();if(error)throw error;if(session)await refresh()}
export const request=(...args)=>execute('request',args);
export const saveResource=(...args)=>execute('saveResource',args);
export const decide=(...args)=>execute('decide',args);
export const reportIncident=(...args)=>execute('reportIncident',args);
export const incidentStatus=(...args)=>execute('incidentStatus',args);
export const setPolicy=(...args)=>execute('setPolicy',args);
export function enter(){throw Error('Sign in with your own account. Demo personas are disabled.')}
export const enterCustom=enter;
export function reset(){throw Error('Cloud records cannot be reset from this interface.')}
export async function logout(){if(client){const {error}=await client.auth.signOut();if(error)throw error}clearSession()}
export function clearSession(){state={...state,session:null,users:[],resources:[],bookings:[],activity:[],notifications:[],incidents:[],comments:[],alerts:[],favorites:{},recent:{}}}
export async function change(fn){
 const before=structuredClone(state),draft=structuredClone(state);fn(draft);
 if(draft.session===null){await logout();return}
 const id=state.session,patch={},different=(a,b)=>JSON.stringify(a)!==JSON.stringify(b);
 const p=draft.users.find(x=>x.id===id),old=before.users.find(x=>x.id===id);
 if(p&&different(p,old))patch.profile={name:p.name,department:p.department,interests:p.interests};
 for(const key of ['favorites','recent'])if(different(draft[key]?.[id],before[key]?.[id]))patch[key]=draft[key][id];
 if(different(draft.views?.[id],before.views?.[id]))patch.view=draft.views[id];
 const comments=draft.comments.filter(c=>different(c,before.comments.find(x=>x.id===c.id)));if(comments.length)patch.comments=comments;
 if(different(draft.alerts,before.alerts))patch.alerts=draft.alerts;
 const read=draft.notifications.filter(n=>n.read.includes(id)&&!before.notifications.find(x=>x.id===n.id)?.read.includes(id)).map(n=>n.id);if(read.length)patch.read=read;
 if(Object.keys(patch).length)await execute('preferences',[patch]);
}
