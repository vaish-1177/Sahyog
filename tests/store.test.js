import test from 'node:test';
import assert from 'node:assert/strict';
class MemoryStorage{data=new Map();fail=false;getItem(k){return this.data.get(k)??null}setItem(k,v){if(this.fail)throw Error('QuotaExceeded');this.data.set(k,v)}removeItem(k){this.data.delete(k)}}
globalThis.localStorage=new MemoryStorage();
const S=await import('../js/demo-store.js');const {esc,lifecycle}=await import('../js/ui.js');
const as=id=>S.enter(id);
function listing(extra={}){as('owner');return S.saveResource({name:'Shared test bench',description:'A useful test bench for campus prototypes.',category:'Electronics',type:'Equipment',location:'Test Building · Room 12',campus:'Fictional Campus',coordinates:[28.61,77.21],distanceKm:.2,open:8,close:20,maxHours:4,hourlyRate:0,deposit:0,certRequired:'None',accessories:['Tools'],rules:'Use safely.',published:true,status:'Available',specs:['Low voltage'],...extra})}
function booking(resourceId,extra={}){let d=S.dayAfter(3);return S.request({resourceId,start:d+'T10:00:00+05:30',end:d+'T11:00:00+05:30',purpose:'Develop a low-voltage circuit prototype.',...extra})}
const evidence={photoId:'indexeddb-photo-test-reference',checks:[true,true,true]};
test('resource creation, complete borrowing lifecycle, history, and persistence',()=>{
 S.reset();let id=listing();assert(S.get().resources.find(r=>r.id===id).published);as('student');let b=booking(id);assert.equal(S.get().bookings.find(x=>x.id===b).status,'Pending');
 as('owner');S.decide(b,'approve');assert.throws(()=>S.decide(b,'approve'),/already/);as('student');assert.throws(()=>S.decide(b,'return','',evidence),/no longer/);assert.throws(()=>S.decide(b,'checkin'),/photo/);S.decide(b,'checkin','Condition good',evidence);S.decide(b,'return','All accessories returned',evidence);assert.equal(S.get().bookings.find(x=>x.id===b).status,'Awaiting Inspection');assert.throws(()=>S.decide(b,'complete','Good'),/owning/);
 as('owner');S.decide(b,'complete','Compared before and after images; condition good.');let saved=JSON.parse(localStorage.getItem(S.KEY));assert.equal(saved.bookings.find(x=>x.id===b).status,'Completed');assert.equal(saved.bookings.find(x=>x.id===b).return.photoId,evidence.photoId);assert(saved.activity.filter(a=>a.target===b).length>=5);assert(saved.notifications.some(n=>n.target===b&&n.to.includes('student')));
});
test('two competing requests produce a meaningful fairness decision and never conflicting approvals',()=>{
 S.reset();let id=listing();S.change(s=>{const b=s.bookings[0];b.start=S.dayAfter(3)+'T14:00:00+05:30';b.end=S.dayAfter(3)+'T16:00:00+05:30'});as('student');let a=booking(id);as('student2');let b=booking(id);as('owner');assert.equal(S.decide(a,'approve'),'Waitlisted');assert.match(S.get().bookings.find(x=>x.id===a).reason,/lower monthly usage/);assert.equal(S.decide(b,'approve'),'Approved');assert.equal(S.decide(a,'approve'),'Waitlisted');assert.match(S.get().bookings.find(x=>x.id===a).reason,/overlaps/);as('student2');S.decide(b,'cancel');as('owner');assert.equal(S.decide(a,'approve'),'Approved');
});
test('certification, role checks, duplicates, opening hours, past dates and blocked dates',()=>{
 S.reset();let id=listing({certRequired:'CNC Milling Basics'});as('student2');assert.throws(()=>booking(id),/clearance/);as('student');let b=booking(id);assert.throws(()=>booking(id),/overlapping request/);assert.throws(()=>S.decide(b,'approve'),/owning/);assert.throws(()=>S.saveResource({...S.get().resources[0],id:undefined}),/owner or admin/);as('student');assert.throws(()=>booking('res-11',{start:S.dayAfter(-1)+'T10:00:00+05:30',end:S.dayAfter(-1)+'T11:00:00+05:30'}),/future/);assert.throws(()=>booking('res-11',{start:S.dayAfter(4)+'T02:00:00+05:30',end:S.dayAfter(4)+'T03:00:00+05:30'}),/opening/);
 as('owner');S.saveResource({...S.get().resources.find(x=>x.id===id),blockedDates:[S.dayAfter(4)]});as('student');assert.throws(()=>booking(id,{start:S.dayAfter(4)+'T10:00:00+05:30',end:S.dayAfter(4)+'T11:00:00+05:30'}),/blocked/);
});
test('storage failure rolls back the entire operation and audit event',()=>{
 S.reset();as('student');const before=structuredClone(S.get());localStorage.fail=true;assert.throws(()=>booking('res-11'),/Nothing was changed/);assert.deepEqual(S.get(),before);localStorage.fail=false;
});
test('stale-tab changes are rejected rather than silently overwriting data',()=>{
 S.reset();let copy=structuredClone(S.get());copy.revision++;localStorage.setItem(S.KEY,JSON.stringify(copy));assert.throws(()=>S.enter('owner'),/Another tab/);S.reset();
});
test('policy limits are applied; safety stays independent of priority and exceptions',()=>{
 S.reset();let id=listing();S.change(s=>s.bookings=[]);as('admin');S.setPolicy({quota:1,concurrent:1,advance:2,priority:'fifo',waitlist:false,noShow:'record'});as('student2');assert.throws(()=>booking(id),/advance/);let start=S.dayAfter(1)+'T10:00:00+05:30',end=S.dayAfter(1)+'T12:00:00+05:30';assert.throws(()=>booking(id,{start,end}),/quota/);end=S.dayAfter(1)+'T11:00:00+05:30';let b=booking(id,{start,end});assert.throws(()=>booking('res-11',{start:S.dayAfter(2)+'T10:00:00+05:30',end:S.dayAfter(2)+'T11:00:00+05:30'}),/quota|concurrent/);S.decide(b,'manager-review','Please review this educational project.');as('admin');S.decide(b,'manager-approve','Educational priority reviewed.');assert.equal(S.get().bookings.find(x=>x.id===b).managerApproved,true);as('owner');assert.equal(S.decide(b,'approve'),'Approved');
});
test('rejection reasons, incident review stages and pending extensions',()=>{
 S.reset();let id=listing();as('student');let b=booking(id);as('owner');assert.throws(()=>S.decide(b,'reject'),/reason/);S.decide(b,'approve');as('student');S.decide(b,'checkin','Good condition',evidence);S.decide(b,'extension','Need another hour');assert.throws(()=>S.decide(b,'extension'),/pending/);let incident=S.reportIncident({bookingId:b,type:'Access issue',severity:'Low',description:'Example follow-up request for lab supervision.'});assert.throws(()=>S.incidentStatus(incident,'Resolved','done'),/owning/);as('owner');S.decide(b,'extension-approve');assert.equal(S.hours(S.get().bookings.find(x=>x.id===b)),2);assert.throws(()=>S.incidentStatus(incident,'Resolved','done'),/next review/);S.incidentStatus(incident,'Under Review','A supervisor is reviewing.');S.incidentStatus(incident,'Action Requested','Confirm the lab guidance.');S.incidentStatus(incident,'Resolved','Supervisor provided guidance.');assert.equal(S.get().incidents[0].status,'Resolved');
});
test('HTML escaping and lifecycle are data-driven',()=>{assert.equal(esc('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');assert.equal((lifecycle({status:'Completed'}).match(/class="done"/g)||[]).length,6);assert.equal((lifecycle({status:'Pending'}).match(/class="done"/g)||[]).length,1)});
