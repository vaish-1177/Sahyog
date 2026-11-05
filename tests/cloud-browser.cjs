// UI integration test with simulated Supabase HTTP endpoints; no live project required.
const {chromium}=require('@playwright/test');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{
 const {applyCommand,blankState,attachMember,visibleState}=await import('../supabase/functions/sahyog-api/service.js');
 const owner={id:'11111111-1111-4111-8111-111111111111',name:'Owner',email:'owner@example.com',role:'owner',certs:[]},student={id:'22222222-2222-4222-8222-222222222222',name:'Student',email:'student@example.com',role:'borrower',certs:[]};let state=blankState();[owner,student].forEach(m=>attachMember(state,m));state=applyCommand(state,owner,'saveResource',[{name:'Shared Test Room',description:'A shared room for collaborative student projects.',category:'Meeting Spaces',type:'Space',location:'Block A',campus:'Main Campus',coordinates:[28.61,77.21],distanceKm:0,open:8,close:20,maxHours:4,hourlyRate:0,deposit:0,certRequired:'None',accessories:[],specs:[],rules:'Keep clean',published:true,status:'Available',supervisionRequired:false}]).state;
 const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'8131'},stdio:'ignore'});let browser;const errors=[];
 try{
  let executablePath=process.env.CHROME_PATH,args=['--no-sandbox'];if(!executablePath){try{const c=await import('@sparticuz/chromium');executablePath=await c.default.executablePath();args=c.default.args}catch{}}
  browser=await chromium.launch({executablePath,args,headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message)});page.on('console',m=>{if(m.type()==='error')console.error(m.text())});
  await page.goto('http://localhost:8131');await page.getByText('Setup needed:',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Sign in',exact:true}).isDisabled(),true);
  await page.route('**/js/config.js',route=>route.fulfill({contentType:'application/javascript',body:"export const config={supabaseUrl:'https://test-project.supabase.co',supabasePublishableKey:'sb_publishable_test'};"}));
  const token=m=>Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:m.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.sig';
  await page.route('https://test-project.supabase.co/**',async route=>{const req=route.request(),url=req.url();const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*'};if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:cors,body:''});let response={};let status=200;
   try{if(url.includes('/auth/v1/token')){const body=req.postDataJSON(),m=body.email===owner.email?owner:student;response={access_token:token(m),refresh_token:'mock-refresh',token_type:'bearer',expires_in:3600,user:{id:m.id,email:m.email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{name:m.name},created_at:new Date().toISOString()}}}
   else if(url.includes('/auth/v1/logout'))response={};
   else if(url.includes('/functions/v1/sahyog-api')){const auth=req.headers().authorization,m=JSON.parse(Buffer.from(auth.split('.')[1],'base64url').toString()).sub===owner.id?owner:student;const {op,args}=req.postDataJSON();if(op==='read')response={state:visibleState(state,m.id)};else{const next=applyCommand(state,m,op,args);state=next.state;response={state:visibleState(state,m.id),result:next.result}}}
   else response={};}catch(e){status=400;response={error:e.message}}
   await route.fulfill({status,headers:cors,contentType:'application/json',body:JSON.stringify(response)});
  });
  await page.reload();async function login(email){await page.locator('[name=email]').fill(email);await page.locator('[name=password]').fill('DemoPass123');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('.sidebar').waitFor()}
  async function nav(name){await page.locator('.sidebar [data-page="'+name+'"]').first().click()}
  async function logout(){await page.evaluate(()=>document.querySelector('[data-action="logout"]').click());await page.locator('#auth-form').waitFor()}
  await login(student.email);await nav('Explore Resources');await page.getByRole('button',{name:/View details/}).click();await page.locator('[data-action="book"]').first().click();
  await page.getByRole('button',{name:/Continue/}).click();await page.locator('[name=purpose]').fill('Plan the student innovation project together.');await page.getByRole('button',{name:/Continue/}).click();await page.getByRole('button',{name:/Continue/}).click();await page.locator('[name=agreement]').check();await page.getByRole('button',{name:/Continue/}).click();await page.getByRole('button',{name:'Save & finish'}).click();await page.getByRole('button',{name:'Open my bookings'}).click();assert.equal(state.bookings.length,1);
  await page.reload();await page.locator('.sidebar').waitFor();await nav('My Bookings');await page.getByRole('heading',{name:'Shared Test Room',exact:true}).waitFor();
  await logout();await login(owner.email);await nav('Booking Requests');await page.getByRole('button',{name:'Evaluate & approve'}).click();await page.getByRole('button',{name:'Evaluate & save decision'}).click();await page.locator('#modal').waitFor({state:'hidden'});assert.equal(state.bookings[0].status,'Approved');
  await nav('Settings');await page.getByRole('button',{name:'Refresh workspace'}).click();await page.getByText('Workspace refreshed.',{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('.sidebar').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await logout();await page.locator('#auth-form').waitFor();assert.deepEqual(errors,[]);console.log('PASS: setup gate; borrower login/request/reload; owner login/approval; refresh; mobile layout; logout; zero browser errors (mock endpoints).');
 }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exit(1)});
