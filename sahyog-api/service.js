import {createDomain} from './domain.js';
const fail=message=>{throw Error(message)};
const text=(v,min=0,max=2000)=>{if(typeof v!=='string'||v.trim().length<min||v.length>max)fail('Invalid text field.');return v.trim()};
const list=(v,max=50)=>{if(!Array.isArray(v)||v.length>max||v.some(x=>typeof x!=='string'||x.length>200))fail('Invalid list.');return v};
const number=(v,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail('Invalid number.');return v};
export function blankState(){const s=createDomain({}).seed();return {...s,users:[],resources:[],bookings:[],activity:[],notifications:[],guide:false};}
export function attachMember(s,member){let p=s.users.find(x=>x.id===member.id);if(!p){p={id:member.id,name:member.name,email:member.email,department:'',interests:[],certs:[],role:'borrower'};s.users.push(p)}p.role=member.role;p.certs=member.certs;p.email=member.email;s.session=member.id;return p;}
export function visibleState(source,id){
 const s=structuredClone(source),me=s.users.find(x=>x.id===id);if(!me)fail('Account not found.');const admin=me.role==='admin';
 s.session=id;
 const owned=new Set(s.resources.filter(r=>r.ownerId===id).map(r=>r.id));
 const allBookings=s.bookings;
 s.bookings=s.bookings.filter(b=>admin||b.userId===id||owned.has(b.resourceId));
 const bookedResources=new Set(s.bookings.map(b=>b.resourceId));
 s.resources=s.resources.filter(r=>admin||r.published||r.ownerId===id||bookedResources.has(r.id));
 s.busy=allBookings.filter(b=>s.resources.some(r=>r.id===b.resourceId)&&['Approved','Active','Awaiting Inspection'].includes(b.status)).map(b=>({resourceId:b.resourceId,start:b.start,end:b.end}));
 const bookings=new Set(s.bookings.map(b=>b.id));
 s.incidents=s.incidents.filter(i=>admin||bookings.has(i.bookingId));
 s.activity=s.activity.filter(e=>admin||bookings.has(e.target)||owned.has(e.resourceId)||e.target===id);
 s.notifications=s.notifications.filter(n=>n.to.includes(id)).map(n=>({...n,to:[id],read:n.read.includes(id)?[id]:[]}));
 const resources=new Set(s.resources.map(r=>r.id));s.comments=s.comments.filter(c=>resources.has(c.resourceId));
 s.alerts=s.alerts.filter(a=>a.userId===id);
 const related=new Set([id,...s.bookings.map(b=>b.userId),...s.comments.map(c=>c.userId),...s.resources.map(r=>r.ownerId)]);
 s.users=s.users.filter(p=>admin||related.has(p.id)).map(p=>admin||p.id===id?p:{id:p.id,name:p.name,role:p.role,department:p.department,email:'',certs:[],interests:[]});
 for(const key of ['favorites','recent','views'])s[key]={[id]:s[key]?.[id]??(key==='views'?'Overview':[])};
 return s;
}
export function applyCommand(state,member,op,args=[]){
 const s=structuredClone(state),me=attachMember(s,member),domain=createDomain(s);
 if(!Array.isArray(args)||args.length>5)fail('Invalid arguments.');
 const data=args[0];
 if(op==='request'){
  text(data.resourceId,1,80);text(data.start,10,50);text(data.end,10,50);text(data.purpose,10);
 }else if(op==='saveResource'){
  for(const k of ['name','description','location','category','type','campus','rules','certRequired','image'])if(data[k]!==undefined)text(data[k],0,k==='description'||k==='rules'?2000:300);
  text(data.name,3,120);text(data.description,10);text(data.location,1,200);
  for(const k of ['hourlyRate','deposit'])number(data[k],0,10000000);
  number(data.open,0,23);number(data.close,1,24);number(data.maxHours,1,8);
  if(typeof data.published!=='boolean'||typeof data.supervisionRequired!=='boolean')fail('Invalid listing flags.');
  for(const k of ['accessories','specs','blockedDates'])if(data[k])list(data[k]);
  if(data.image&&!/^(assets\/[a-zA-Z0-9/_.-]+|https:\/\/[^\s<>"']+)$/.test(data.image))fail('Invalid resource image.');
  args=[Object.fromEntries(['id','name','description','location','category','type','campus','building','rules','certRequired','image','photoId','hourlyRate','deposit','open','close','maxHours','published','supervisionRequired','status','accessories','specs','blockedDates','coordinates','distanceKm'].filter(k=>data[k]!==undefined).map(k=>[k,data[k]]))];
 }else if(op==='decide'){
  const b=s.bookings.find(b=>b.id===data);if(!b)fail('Booking not found.');const r=s.resources.find(r=>r.id===b.resourceId);
  if(args[1]==='manager-review'&&me.role!=='admin'&&b.userId!==me.id&&r.ownerId!==me.id)fail('Not your booking.');
  text(args[2]??'',0);
  if(args[1]==='checkin'&&(Date.now()<+new Date(b.start)-15*60000||Date.now()>+new Date(b.end)))fail('Check-in opens 15 minutes before the booking and closes at its end.');
  if(args[1]==='return'&&Date.now()<+new Date(b.start))fail('The booking has not started.');
 }else if(op==='reportIncident'){
  text(data.description,10);if(!['Low','Medium','High','Critical'].includes(data.severity))fail('Invalid severity.');text(data.type,1,100);
  args=[Object.fromEntries(['bookingId','description','severity','type','photoId'].filter(k=>data[k]!==undefined).map(k=>[k,data[k]]))];
 }else if(op==='incidentStatus'){if(!['Reported','Under Review','Action Requested','Resolved'].includes(args[1]))fail('Invalid incident stage.');text(args[2],1);
 }else if(op==='setPolicy'){
  number(data.quota,1,80);number(data.concurrent,1,8);number(data.advance,1,90);if(!['usage','fifo'].includes(data.priority)||!['review','record'].includes(data.noShow)||typeof data.waitlist!=='boolean')fail('Invalid policy.');
 }else if(op==='preferences'){
  const patch=data||{};domain.change(d=>{
   const p=d.users.find(p=>p.id===me.id);
   if(patch.profile){p.name=text(patch.profile.name,2,80);p.department=text(patch.profile.department,0,120);p.interests=list(patch.profile.interests)}
   for(const key of ['favorites','recent'])if(patch[key])d[key][me.id]=list(patch[key],200).filter(id=>d.resources.some(r=>r.id===id&&(r.published||r.ownerId===me.id)));
   if(patch.view)d.views={...d.views,[me.id]:text(patch.view,1,80)};
   if(patch.comments){if(patch.comments.length>1000)fail('Too many comments.');for(const c of patch.comments){
    const old=d.comments.find(x=>x.id===c.id);const r=d.resources.find(r=>r.id===c.resourceId);if(!r||(!r.published&&r.ownerId!==me.id&&me.role!=='admin'))fail('Resource unavailable.');
    if(old){if(old.userId!==me.id)fail('Only the author can edit comments.');old.body=text(c.body,1,1000);old.deleted=!!c.deleted;old.edited=true;}
    else{if(c.parentId&&!d.comments.some(x=>x.id===c.parentId&&x.resourceId===c.resourceId))fail('Parent comment not found.');d.comments.push({id:crypto.randomUUID(),resourceId:r.id,userId:me.id,body:text(c.body,1,1000),parentId:c.parentId||null,at:new Date().toISOString()})}
   }}
   if(patch.alerts){if(patch.alerts.length>100)fail('Too many price watches.');d.alerts=d.alerts.filter(a=>a.userId!==me.id).concat(patch.alerts.map(a=>({id:text(a.id,1,80),resourceId:text(a.resourceId,1,80),target:number(a.target,0,10000000),direction:['below','above'].includes(a.direction)?a.direction:'below',active:!!a.active,userId:me.id})));}
   if(patch.profile||patch.comments||patch.alerts)domain.event(d,patch.profile?'Profile updated':patch.comments?'Discussion updated':'Price watch updated',patch.comments?.[0]?.resourceId||me.id,'Member saved workspace changes.',patch.comments?.[0]?.resourceId||'');
   if(patch.read)for(const n of d.notifications)if(n.to.includes(me.id)&&patch.read.includes(n.id)&&!n.read.includes(me.id))n.read.push(me.id);
  });return {state:domain.get(),result:null};
 }else if(op!=='read')fail('Unknown operation.');
 const result=op==='read'?null:domain[op](...args);return {state:domain.get(),result};
}
export function photoVisible(s,id,path){const v=visibleState(s,id);return path.startsWith(id+'/')||v.resources.some(r=>r.photoId===path)||v.bookings.some(b=>b.checkin?.photoId===path||b.return?.photoId===path)||v.incidents.some(i=>i.photoId===path);}
