export const KEY='sahyog-commons-v3';
export const uid=p=>p+'-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,12);
export const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
export const dayAfter=n=>{let d=new Date(today()+'T12:00:00+05:30');d.setDate(d.getDate()+n);return d.toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})};
export const hours=b=>(new Date(b.end)-new Date(b.start))/3600000;
const occupying=['Approved','Active','Awaiting Inspection'];
const live=['Pending','Waitlisted','Approved','Active','Awaiting Inspection'];
export function overlaps(a,b){return a.resourceId===b.resourceId&&+new Date(a.start)<+new Date(b.end)&&+new Date(b.start)<+new Date(a.end)}
export function usage(s,id,month,includePending=false){return s.bookings.filter(b=>b.userId===id&&b.start.slice(0,7)===month&&(includePending?live.concat('Completed'):occupying.concat('Completed')).includes(b.status)).reduce((n,b)=>n+hours(b),0)}
export function eligible(s,u,r){return !r.certRequired||r.certRequired==='None'||u.certs.includes(r.certRequired)}
export function conflicts(s,b){return (s.busy||s.bookings.filter(x=>x.id!==b.id&&occupying.includes(x.status))).filter(x=>overlaps(x,b))}
