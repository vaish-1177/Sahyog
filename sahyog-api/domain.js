import {catalog} from './catalog.js';
export function createDomain(initial){

const KEY='sahyog-commons-v3';
const uid=p=>p+'-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,12);
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
const dayAfter=n=>{let d=new Date(today()+'T12:00:00+05:30');d.setDate(d.getDate()+n);return d.toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})};
const hours=b=>(new Date(b.end)-new Date(b.start))/3600000;
const occupying=['Approved','Active','Awaiting Inspection'];
const live=['Pending','Waitlisted','Approved','Active','Awaiting Inspection'];
function seed(){
 const certs=catalog.resources.map(r=>r.certRequired);
 let resources=catalog.resources.map(r=>({...r,status:'Available',ownerId:'owner',published:true,open:9,close:18,maxHours:4,type:'Equipment',rules:'Use only approved materials. Follow supervisor instructions and return every accessory.',accessories:catalog.accessories[r.id],updatedAt:new Date().toISOString()}));
 resources.push({id:'res-11',name:'The Commons · Collaboration Room',category:'Meeting Spaces',owner:'Innovation Centre',ownerId:'owner',location:'Innovation Centre · Room 204',building:'Innovation Centre',campus:'Sahyog Main Campus',distanceKm:.3,coordinates:[28.612,77.211],hourlyRate:0,deposit:0,certRequired:'None',supervisionRequired:false,status:'Available',published:true,open:8,close:20,maxHours:4,type:'Space',description:'A bright, flexible room for project teams, workshops, and your next shared idea.',specs:['12 seats','Whiteboard & display','Accessible entrance'],accessories:['Display remote','Whiteboard markers'],rules:'Leave the room clean and ready for the next team.',image:'assets/resource-9.jpg',updatedAt:new Date().toISOString()});
 resources.push({id:'res-12',name:'Precision Electronics Testing Bench',category:'Electronics',owner:'Electronics Innovation Lab',ownerId:'owner',location:'Engineering Block · Bench 07',building:'Engineering Block',campus:'Sahyog Main Campus',distanceKm:.5,coordinates:[28.616,77.213],hourlyRate:100,deposit:500,certRequired:'Electronics Safety',supervisionRequired:true,status:'Available',published:true,open:9,close:18,maxHours:4,type:'Equipment',description:'An instrumented bench for low-voltage circuit development and diagnostic work.',specs:['Digital oscilloscope','Bench power supply','ESD-safe surface'],accessories:['Probe leads','ESD wrist strap'],rules:'Low voltage only. Supervisor must be present.',image:'assets/resource-10.jpg',updatedAt:new Date().toISOString()});
 const users=[{id:'student',name:'Alex Morgan',email:'alex@sahyog.demo',role:'borrower',certs:[...certs,'Electronics Safety'],interests:['Fabrication & 3D','Meeting Spaces'],department:'Design & Innovation'},{id:'student2',name:'Meera Iyer',email:'meera@sahyog.demo',role:'borrower',certs:[],interests:['Meeting Spaces','Electronics'],department:'Student Innovation Club'},{id:'owner',name:'Dr. Kavya Rao',email:'kavya@sahyog.demo',role:'owner',certs:[],interests:[],department:'Innovation Centre'},{id:'admin',name:'Ishaan Sen',email:'ishaan@sahyog.demo',role:'admin',certs:[],interests:[],department:'Campus Operations'}];
 const booking=(id,resourceId,userId,status,offset,hour,purpose)=>({id,resourceId,userId,status,start:dayAfter(offset)+'T'+hour+':00:00+05:30',end:dayAfter(offset)+'T'+String(Number(hour)+2).padStart(2,'0')+':00:00+05:30',purpose,createdAt:new Date().toISOString(),reason:'Seeded example reservation',sample:true});
 const bookings=[booking('BK-SAMPLE1','res-2','student','Approved',1,'10','Prototype lightweight brackets for the campus robotics project.'),booking('BK-SAMPLE2','res-11','student2','Pending',2,'14','Collaborative planning session for a student design workshop.')];
 const activity=bookings.map(b=>({id:uid('EV'),at:b.createdAt,actor:'Demo dataset',action:'Example reservation',target:b.id,resourceId:b.resourceId,details:'Seeded '+b.status.toLowerCase()+' example. No real resource or transaction.',sample:true}));
 return {version:3,revision:0,session:null,users,resources,bookings,activity,notifications:[],incidents:[],comments:[],alerts:[],favorites:{},recent:{},policy:{quota:20,concurrent:3,advance:30,waitlist:true,priority:'usage',noShow:'review'},guide:true};
}
let state=structuredClone(initial); let storageWarning='';
const get=()=>state;
const user=()=>state.users.find(u=>u.id===state.session);
const must=(test,msg)=>{if(!test)throw Error(msg)};
function change(fn){const draft=structuredClone(state);const result=fn(draft);draft.revision++;state=draft;return result;}
function actor(s){const u=s.users.find(x=>x.id===s.session);must(u,'Choose a demo persona first.');return u}
function owner(s,r){const u=actor(s);must(u.role==='admin'||u.role==='owner'&&r.ownerId===u.id,'Switch to the owning demo workspace.');return u}
function event(s,action,target,details='',resourceId=''){
 const u=actor(s),e={id:uid('EV'),at:new Date().toISOString(),actor:u.name,action,target,resourceId,details};s.activity.unshift(e);
 const b=s.bookings.find(x=>x.id===target),r=s.resources.find(x=>x.id===(resourceId||b?.resourceId));
 const to=[u.id,b?.userId,r?.ownerId,...s.users.filter(p=>p.role==='admin').map(p=>p.id)].filter(Boolean);s.notifications.unshift({id:e.id,...e,to:[...new Set(to)],read:[]});
}
function enter(id){change(s=>{must(s.users.some(u=>u.id===id),'Persona not found');s.session=id})}
function enterCustom(data){change(s=>{must(['borrower','owner','admin'].includes(data.role),'Choose a demo role');must(data.name.trim().length>1&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),'Enter a name and valid demo email');let u=s.users.find(x=>x.email===data.email.toLowerCase()&&x.role===data.role);if(!u){u={id:uid('PERSONA'),name:data.name.trim().slice(0,80),email:data.email.toLowerCase(),role:data.role,certs:[],interests:[],department:'Demo institution'};s.users.push(u)}s.session=u.id})}
function overlaps(a,b){return a.resourceId===b.resourceId&&+new Date(a.start)<+new Date(b.end)&&+new Date(b.start)<+new Date(a.end)}
function usage(s,id,month,includePending=false){return s.bookings.filter(b=>b.userId===id&&b.start.slice(0,7)===month&&(includePending?live.concat('Completed'):occupying.concat('Completed')).includes(b.status)).reduce((n,b)=>n+hours(b),0)}
function eligible(s,u,r){return !r.certRequired||r.certRequired==='None'||u.certs.includes(r.certRequired)}
function conflicts(s,b){return s.bookings.filter(x=>x.id!==b.id&&occupying.includes(x.status)&&overlaps(x,b))}
function validateSchedule(s,b,r){
 const a=new Date(b.start),end=new Date(b.end),h=hours(b);must(!isNaN(+a)&&!isNaN(+end),'Choose valid dates.');const local=new Date(+a+19800000).toISOString(),finish=new Date(+end+19800000).toISOString();
 must(!isNaN(+a)&&!isNaN(+end)&&a>new Date(),'Choose a future date and time.');must(Number.isInteger(h)&&h>=1&&h<=r.maxHours,'Choose 1–'+r.maxHours+' whole hours.');
 must(local.slice(0,10)===finish.slice(0,10)&&Number(local.slice(11,13))+Number(local.slice(14,16))/60>=r.open&&Number(finish.slice(11,13))+Number(finish.slice(14,16))/60<=r.close,'The session must fit within the resource opening hours.');
 must(local.slice(0,10)<=dayAfter(s.policy.advance),'This date is outside the advance booking window.');must(!(r.blockedDates||[]).includes(local.slice(0,10)),'This date is blocked by the resource owner.');
}
function request(data){return change(s=>{
 const u=actor(s),r=s.resources.find(r=>r.id===data.resourceId);must(u.role==='borrower','Use a borrower demo persona to request.');must(r?.published&&r.status==='Available','This resource is not available.');must(eligible(s,u,r),'Missing demo clearance: '+r.certRequired+'. Choose a qualified demo persona or an open-access resource.');
 const b={id:uid('BK'),userId:u.id,resourceId:r.id,start:data.start,end:data.end,purpose:String(data.purpose).trim().slice(0,2000),createdAt:new Date().toISOString(),status:'Pending'};
 validateSchedule(s,b,r);must(b.purpose.length>=10,'Describe the project in at least 10 characters.');must(usage(s,u.id,b.start.slice(0,7),true)+hours(b)<=s.policy.quota,'Monthly hours quota would be exceeded.');must(s.bookings.filter(x=>x.userId===u.id&&live.includes(x.status)).length<s.policy.concurrent,'You reached the concurrent booking limit.');must(!s.bookings.some(x=>x.userId===u.id&&live.includes(x.status)&&overlaps(x,b)),'You already have an overlapping request for this resource.');
 if(conflicts(s,b).length){must(s.policy.waitlist,'This slot is reserved and waitlisting is disabled.');b.status='Waitlisted';b.reason='An approved reservation overlaps this slot.';}
 s.bookings.push(b);event(s,'Request submitted',b.id,b.status==='Waitlisted'?b.reason:b.purpose,r.id);return b.id;
})}
function saveResource(data){return change(s=>{
 const u=actor(s),old=s.resources.find(x=>x.id===data.id);must(u.role!=='borrower','Use an owner or admin demo persona.');if(old)owner(s,old);
 const r={...old,...data,id:old?.id||uid('RES'),ownerId:old?.ownerId||u.id,owner:old?.owner||u.department||u.name,updatedAt:new Date().toISOString()};
 must(r.name.trim().length>2&&r.description.trim().length>=10&&r.location.trim(),'Name, location, and a descriptive summary are required.');must(r.open>=0&&r.close<=24&&r.close>r.open,'Opening hours are invalid.');must(r.maxHours>=1&&r.maxHours<=8&&r.hourlyRate>=0&&r.deposit>=0,'Enter valid duration and illustrative charges.');must(['Available','Maintenance'].includes(r.status),'Choose an availability status.');
 if(old&&old.status==='Maintenance'&&r.status==='Available')must(!s.incidents.some(i=>i.resourceId===r.id&&i.severity==='Critical'&&i.status!=='Resolved'),'Resolve the critical incident before making this resource available.');
 if(old)s.resources[s.resources.findIndex(x=>x.id===old.id)]=r;else s.resources.push(r);event(s,old?'Resource updated':'Resource created',r.id,r.published?'Published in demo discovery.':'Saved as a draft.',r.id);return r.id;
})}
function decide(id,action,reason='',evidence){return change(s=>{
 const b=s.bookings.find(b=>b.id===id);must(b,'Booking not found.');const r=s.resources.find(x=>x.id===b.resourceId),u=actor(s);
 if(['approve','reject','waitlist','complete','no-show','extension-approve','extension-reject'].includes(action)){
  owner(s,r);
  if(action==='complete'){must(b.status==='Awaiting Inspection','A return must be submitted first.');must(reason.trim().length>=3,'Record inspection findings.');b.status='Completed';b.inspection={notes:reason,at:new Date().toISOString(),actor:u.name};}
  else if(action==='no-show'){must(b.status==='Approved'&&new Date(b.end)<new Date(),'A no-show can be recorded after an unused approved slot ends.');b.status='No-show';b.reason=s.policy.noShow==='review'?'Manager review requested for a missed session.':'Recorded without an automatic penalty.';}
  else if(action.startsWith('extension')){must(b.status==='Active'&&b.extension?.status==='Pending','No extension is pending.');if(action==='extension-approve'){const proposed={...b,end:b.extension.end};must(!conflicts(s,proposed).length,'The extension overlaps another approved booking.');must(usage(s,b.userId,b.start.slice(0,7))+hours(proposed)-hours(b)<=s.policy.quota,'The extension exceeds monthly quota.');b.end=proposed.end;}b.extension.status=action==='extension-approve'?'Approved':'Rejected';}
  else{
   must(['Pending','Waitlisted'].includes(b.status),'This request has already been decided.');
   if(action==='reject'){must(reason.trim().length>=3,'A rejection reason is required.');b.status='Rejected';}
   else if(action==='waitlist'){must(reason.trim().length>=3,'Explain the waitlist decision.');b.status='Waitlisted';}
   else{
    const borrower=s.users.find(x=>x.id===b.userId);validateSchedule(s,b,r);must(r.published&&r.status==='Available','Resource is unavailable.');must(eligible(s,borrower,r),'Safety eligibility is required, independent of priority.');must(usage(s,b.userId,b.start.slice(0,7))+hours(b)<=s.policy.quota,'Approved usage would exceed monthly quota.');
    const activeConflicts=conflicts(s,b);const rivals=s.bookings.filter(x=>['Pending','Waitlisted'].includes(x.status)&&overlaps(x,b)&&eligible(s,s.users.find(u=>u.id===x.userId),r));
    const ranked=rivals.sort((a,c)=>(s.policy.priority==='usage'?usage(s,a.userId,b.start.slice(0,7))-usage(s,c.userId,b.start.slice(0,7)):0)||a.createdAt.localeCompare(c.createdAt)||s.bookings.indexOf(a)-s.bookings.indexOf(c));
    if(activeConflicts.length){must(s.policy.waitlist,'Conflicting reservation. Approval blocked.');b.status='Waitlisted';reason='An approved, active, or uninspected reservation overlaps this slot.';}
    else if(ranked[0]?.id!==b.id&&!b.managerApproved){must(s.policy.waitlist,'A competing request has higher priority; waitlisting is disabled. Approval blocked.');b.status='Waitlisted';reason='A competing eligible request has '+(s.policy.priority==='usage'?'lower monthly usage, then earlier submission priority.':'earlier submission priority.');}
    else{b.status='Approved';reason=(b.managerApproved?'Manager-reviewed priority exception. ':'')+'Safety eligible; no reserved overlap. Priority: '+(s.policy.priority==='usage'?'lower monthly usage, then submission order.':'submission order.');}
   }
   b.reason=reason;
  }
 }else if(action==='manager-review'){
  must(b.userId===u.id||u.role!=='borrower','Switch to the requesting persona.');must(['Pending','Waitlisted','Rejected'].includes(b.status),'Only undecided or disputed requests can be reviewed.');must(reason.trim().length>=10,'Explain the exception request.');b.managerReview={status:'Requested',reason};
 }else if(action==='manager-approve'){
  must(u.role==='admin','Use the administrator demo persona.');must(b.managerReview?.status==='Requested','No review is pending.');must(reason.trim().length>=3,'Record the review rationale.');b.managerReview.status='Reviewed';b.managerApproved=true;if(b.status==='Rejected')b.status='Waitlisted';
 }else{
  must(b.userId===u.id&&u.role==='borrower','Switch to the borrower who owns this booking.');
  if(action==='cancel'){must(['Pending','Waitlisted','Approved'].includes(b.status),'This booking cannot be cancelled at this stage.');b.status='Cancelled';}
  else if(action==='extension'){must(b.status==='Active'&&b.extension?.status!=='Pending','An active session without a pending extension is required.');const end=new Date(+new Date(b.end)+3600000).toISOString();const h=new Date(+new Date(end)+19800000).toISOString();must(hours({...b,end})<=r.maxHours&&Number(h.slice(11,13))+Number(h.slice(14,16))/60<=r.close,'An extra hour exceeds this resource’s session or opening limits.');b.extension={status:'Pending',end};}
  else if(action==='checkin'||action==='return'){
   must(b.status===(action==='checkin'?'Approved':'Active'),'This lifecycle action is no longer available.');must(evidence?.photoId&&evidence.checks?.length===2+(r.accessories||[]).length&&evidence.checks.every(Boolean),'Attach a photo and complete every condition check.');b[action]={...evidence,notes:reason,at:new Date().toISOString()};b.status=action==='checkin'?'Active':'Awaiting Inspection';
  }else throw Error('Unknown booking action.');
 }
 event(s,({approve:'Allocation decision',complete:'Inspection completed',return:'Return submitted',checkin:'Checked in','manager-review':'Manager review requested','manager-approve':'Manager review recorded'})[action]||action,b.id,reason||b.reason||b.status,r.id);return b.status;
})}
function reportIncident(data){return change(s=>{const u=actor(s),b=s.bookings.find(b=>b.id===data.bookingId);must(b,'Select a booking.');must(u.id===b.userId||u.role==='admin'||s.resources.find(r=>r.id===b.resourceId)?.ownerId===u.id,'Use a related demo persona.');must(data.description.trim().length>=10,'Describe the issue in at least 10 characters.');const i={...data,id:uid('INC'),resourceId:b.resourceId,reporter:u.id,status:'Reported',at:new Date().toISOString()};s.incidents.push(i);event(s,'Incident reported',b.id,i.type+': '+i.description,b.resourceId);return i.id})}
function incidentStatus(id,status,notes){change(s=>{const i=s.incidents.find(i=>i.id===id);must(i,'Incident not found');owner(s,s.resources.find(r=>r.id===i.resourceId));const stages=['Reported','Under Review','Action Requested','Resolved'];must(stages.indexOf(status)===stages.indexOf(i.status)+1,'Move to the next review stage.');must(notes.trim(),'Record review notes.');i.status=status;i.notes=notes;event(s,'Incident '+status,i.bookingId,notes,i.resourceId)})}
function setPolicy(data){change(s=>{must(actor(s).role==='admin','Use the administrator demo persona to change allocation policy.');must(data.quota>=1&&data.quota<=80&&data.concurrent>=1&&data.concurrent<=8&&data.advance>=1&&data.advance<=90,'Policy values are out of range.');s.policy={...s.policy,...data};event(s,'Policy updated','institution',`${data.quota} h/month; ${data.concurrent} live bookings; ${data.advance} days ahead; ${data.priority} priority.`)})}

return {get,user,change,event,request,saveResource,decide,reportIncident,incidentStatus,setPolicy,seed,dayAfter};
}
