import {client,configured} from './backend.js';
import * as S from './store.js';
import {$,esc,toast} from './ui.js';
export function authEntry(render){
 let mode='signin',busy=false;
 $('#app').innerHTML=`<main class="entry" id="main"><section class="entry-story"><div class="brand"><span class="logo-mark">s</span><span>sahyog<small>institutional commons</small></span></div><div><div class="eyebrow">SHARED RESOURCES. EQUAL OPPORTUNITIES.</div><h1>Make every<br>resource count.</h1><p>Discover shared spaces and equipment. Request access, track approvals, and record every handover.</p><img src="assets/resource-3.jpg" alt="Shared laboratory" style="width:100%;border-radius:24px"></div></section><section class="entry-form auth-simple"><div class="auth-tabs" role="tablist" aria-label="Account access"><button type="button" role="tab" id="signin-tab" aria-controls="auth-panel" aria-selected="true" data-auth-mode="signin">Sign in</button><button type="button" role="tab" id="signup-tab" aria-controls="auth-panel" aria-selected="false" tabindex="-1" data-auth-mode="signup">Create account</button></div><div id="auth-panel" role="tabpanel" aria-labelledby="signin-tab"><h2 id="auth-title">Welcome back.</h2><p id="auth-description">Sign in to your Sahyog workspace.</p>${configured?'':'<div class="notice warning">Setup needed: add your Supabase URL and publishable key in <strong>js/config.js</strong>, then follow <strong>SETUP.md</strong>.</div>'}<form id="auth-form"><div id="signup-name" hidden><label for="auth-name">Full name</label><input id="auth-name" name="name" maxlength="80" minlength="2" autocomplete="name" placeholder="Your full name" disabled></div><label for="auth-email">Email address</label><input id="auth-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required><label for="auth-password">Password</label><div class="auth-password"><input id="auth-password" name="password" type="password" autocomplete="current-password" required><button type="button" id="toggle-password" aria-controls="auth-password" aria-label="Show password">Show</button></div><p class="helper auth-password-hint" id="password-hint" hidden>Use at least 8 characters.</p><div id="signup-role" hidden><label for="auth-role">How will you use Sahyog?</label><select id="auth-role" name="role" disabled><option value="borrower">Borrow resources — Student / Borrower</option><option value="owner">Share resources — Resource owner</option></select><p class="helper auth-role-hint">Choose borrower to book equipment or spaces. Choose owner to list and manage resources.</p></div><p id="auth-message" role="status" aria-live="polite" class="auth-message" hidden></p><button class="btn primary full" id="auth-submit" type="submit" ${configured?'':'disabled'}>Sign in</button><button type="button" class="btn ghost auth-forgot" id="forgot-password">Forgot password?</button></form><p class="auth-switch"><span id="switch-description">New to Sahyog?</span> <button type="button" id="switch-mode">Create an account</button></p></div></section></main>`;
 const form=$('#auth-form'),submit=$('#auth-submit'),message=$('#auth-message');
 const status=(text,error=false)=>{message.textContent=text;message.hidden=!text;message.classList.toggle('error-text',error)};
 function setMode(next){
  if(busy)return;mode=next;const signup=mode==='signup';
  document.querySelectorAll('[data-auth-mode]').forEach(tab=>{const selected=tab.dataset.authMode===mode;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1});
  $('#auth-panel').setAttribute('aria-labelledby',signup?'signup-tab':'signin-tab');
  $('#auth-title').textContent=signup?'Create your account.':'Welcome back.';
  $('#auth-description').textContent=signup?'Fill in your details to get started.':'Sign in to your Sahyog workspace.';
  $('#signup-name').hidden=!signup;$('#signup-role').hidden=!signup;$('#password-hint').hidden=!signup;
  form.elements.name.disabled=!signup;form.elements.name.required=signup;form.elements.role.disabled=!signup;
  form.elements.password.autocomplete=signup?'new-password':'current-password';
  if(signup)form.elements.password.minLength=8;else form.elements.password.removeAttribute('minlength');
  submit.textContent=signup?'Create account':'Sign in';$('#forgot-password').hidden=signup;
  $('#switch-description').textContent=signup?'Already have an account?':'New to Sahyog?';
  $('#switch-mode').textContent=signup?'Sign in':'Create an account';status('');
 }
 document.querySelectorAll('[data-auth-mode]').forEach(tab=>{
  tab.onclick=()=>setMode(tab.dataset.authMode);
  tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'signin':e.key==='End'?'signup':mode==='signin'?'signup':'signin';setMode(next);document.querySelector('[data-auth-mode="'+mode+'"]').focus()}};
 });
 $('#switch-mode').onclick=()=>{setMode(mode==='signin'?'signup':'signin');$('#auth-title').scrollIntoView({block:'nearest'})};
 $('#toggle-password').onclick=()=>{const visible=form.elements.password.type==='password';form.elements.password.type=visible?'text':'password';$('#toggle-password').textContent=visible?'Hide':'Show';$('#toggle-password').setAttribute('aria-label',visible?'Hide password':'Show password')};
 function setBusy(value){busy=value;submit.disabled=value||!configured;document.querySelectorAll('[data-auth-mode],#switch-mode,#forgot-password').forEach(button=>button.disabled=value);form.setAttribute('aria-busy',String(value));submit.textContent=value?(mode==='signup'?'Creating account…':'Signing in…'):(mode==='signup'?'Create account':'Sign in')}
 form.onsubmit=async e=>{e.preventDefault();if(busy)return;const signup=mode==='signup';setBusy(true);status('');try{
  if(signup&&form.elements.name.value.trim().length<2){form.elements.name.focus();throw Error('Enter your full name (at least 2 characters).')}
  const credentials={email:form.elements.email.value.trim(),password:form.elements.password.value};
  const {data,error}=signup?await client.auth.signUp({...credentials,options:{data:{name:form.elements.name.value.trim(),requested_role:form.elements.role.value},emailRedirectTo:location.origin+location.pathname}}):await client.auth.signInWithPassword(credentials);
  if(error)throw error;if(!data.session){status('Account created. Check your email to confirm your account, then sign in.');return}await S.refresh();render();
 }catch(err){status(err.message,true)}finally{setBusy(false)}};
 $('#forgot-password').onclick=async()=>{if(busy)return;setBusy(true);status('');try{if(!configured)throw Error('Complete Supabase setup first.');const email=form.elements.email.value.trim();if(!email){form.elements.email.focus();throw Error('Enter your email address first.')}if(!form.elements.email.reportValidity())return;const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname+'?reset=1'});if(error)throw error;status('If the account exists, a password reset link has been sent.')}catch(err){status(err.message,true)}finally{setBusy(false)}};
}
export function accountInfo(){toast('Your workspace role is assigned to this account. Sign out to use another account.')}
export function passwordRecovery(render){
 $('#app').innerHTML='<main class="entry-form"><h2>Set a new password</h2><form id="recovery-form"><label>New password<input type="password" name="password" minlength="8" required autocomplete="new-password"></label><p id="recovery-message" role="alert"></p><button class="btn primary">Save password</button></form></main>';
 $('#recovery-form').onsubmit=async e=>{e.preventDefault();try{const {error}=await client.auth.updateUser({password:e.target.password.value});if(error)throw error;history.replaceState(null,'',location.pathname);await S.refresh();render()}catch(err){$('#recovery-message').textContent=err.message}};
}
