import {createClient} from '../assets/vendor/supabase.js';
import {config} from './config.js';
export const configured=Boolean(config.supabaseUrl&&config.supabasePublishableKey);
export const client=configured?createClient(config.supabaseUrl,config.supabasePublishableKey):null;
export async function call(op,args=[]){
 if(!client)throw Error('Add your Supabase URL and publishable key to js/config.js first.');
 const {data:{session}}=await client.auth.getSession();if(!session)throw Error('Sign in to continue.');
 const response=await fetch(config.supabaseUrl+'/functions/v1/sahyog-api',{method:'POST',headers:{apikey:config.supabasePublishableKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({op,args})});
 let data;try{data=await response.json()}catch{throw Error('Backend unavailable. Deploy the sahyog-api function using SETUP.md.')}
 if(!response.ok)throw Error(data.error||data.message||'Backend request failed.');return data;
}
