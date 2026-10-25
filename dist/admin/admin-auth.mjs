import {publicBackendConfig} from '../backend/public-config.mjs';
import {boundedJSON,readError} from './command/bounded-json.mjs';

const sessionKey='apparition.admin.supabase-session.v1';
const validConfig=config=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config?.url||'')&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(config?.publishableKey||'');

// Browser tokens are ordinary Supabase Auth session tokens, never Admin credentials.
// Membership and all future business writes are decided by the database under RLS.
export function createAdminAuth({config=publicBackendConfig,request=globalThis.fetch,storage=globalThis.localStorage,now=Date.now}={}){
 if(!validConfig(config)||typeof request!=='function'||!storage)throw new Error('Admin authentication is unavailable.');
 let session=null;const listeners=new Set();
 const headers=token=>({apikey:config.publishableKey,...token?{Authorization:'Bearer '+token}:{}});
 const read=()=>{try{const raw=storage.getItem(sessionKey),value=raw&&JSON.parse(raw);return value&&typeof value.access_token==='string'&&typeof value.refresh_token==='string'&&Number.isFinite(value.expires_at)?value:null;}catch{return null;}};
 const clear=()=>{session=null;storage.removeItem(sessionKey);for(const listener of listeners)listener();};
 const save=data=>{if(!data?.access_token||!data?.refresh_token||!Number.isFinite(data.expires_in))throw new Error('Invalid authentication response.');session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(now()/1000)+data.expires_in};storage.setItem(sessionKey,JSON.stringify(session));};
 const refresh=async(options={})=>{const response=await request(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),...options.signal?{signal:options.signal}:{}});if(!response.ok){clear();return false;}save(options.bounded?await boundedJSON(response,16384,options):await response.json());return true;};
 async function accessToken(options={}){session||=read();if(!session)throw new Error('Admin sign-in is required.');if(session.expires_at<=Math.floor(now()/1000)+60&&!await refresh(options))throw new Error('Admin session expired. Please sign in again.');return session.access_token;}
 const check=async()=>{
  let token=await accessToken();let user=await request(config.url+'/auth/v1/user',{headers:headers(token)});
  if(user.status===401&&session?.refresh_token){if(!await refresh())return {status:'signed-out'};token=await accessToken();user=await request(config.url+'/auth/v1/user',{headers:headers(token)});}
  if(user.status===401){clear();return {status:'signed-out'};}if(!user.ok)throw new Error('Could not verify the Admin session.');
  const identity=await user.json();if(!/^[0-9a-f-]{36}$/i.test(identity?.id||'')){clear();return {status:'signed-out'};}
  const members=await request(config.url+'/rest/v1/admin_members?select=user_id&user_id=eq.'+encodeURIComponent(identity.id),{headers:{...headers(token),Accept:'application/json'}});
  if(members.status===401){clear();return {status:'signed-out'};}if(!members.ok)throw new Error('Could not verify Admin membership.');
  const rows=await members.json();if(!Array.isArray(rows))throw new Error('Could not verify Admin membership.');
  return {status:rows.some(row=>row.user_id===identity.id)?'authorized':'denied'};
 };
 return Object.freeze({
  async restore(){session=read();return session?check():{status:'signed-out'};},
  async authorizeRead({signal,onBytes}={}){
   // Existing restore/sign-in contracts are unchanged. This stricter read proof is
   // based on a server-accepted token and self membership, never client role claims.
   session=read();if(!session)throw readError('EXPIRED','Admin sign-in is required.');
   let token;try{token=await accessToken({signal,bounded:true,onBytes});}catch(e){if(e.code)throw e;throw readError('EXPIRED','Restore the Admin session to continue.');}
   const options={headers:{...headers(token),Accept:'application/json'},signal,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'};
   const identity=await boundedJSON(await request(config.url+'/auth/v1/user',options),16384,{signal,onBytes});
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity?.id||''))throw readError('DENIED','Verified Admin identity is unavailable.');
   const rows=await boundedJSON(await request(config.url+'/rest/v1/admin_members?select=user_id&user_id=eq.'+encodeURIComponent(identity.id)+'&limit=2',options),2048,{signal,onBytes});
   if(!Array.isArray(rows)||rows.length!==1||Object.keys(rows[0]||{}).length!==1||rows[0]?.user_id!==identity.id)throw readError('DENIED','Current Admin membership is required.');
   let claims;try{const part=token.split('.')[1];claims=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));}catch{throw readError('DENIED','The server-accepted session has an unsupported token format.');}
   // The Auth server accepted this token above. Decode only its subject/expiry;
   // no decoded role/app/user metadata grants authority.
   if(claims.sub!==identity.id||!Number.isSafeInteger(claims.exp)||claims.exp*1000<=now()||claims.exp*1000-now()>86400000)throw readError('EXPIRED','The verified Admin session has expired or has an unsupported lifetime.');
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
   if(signal?.aborted||read()?.access_token!==token)throw readError('STALE','The Admin session changed during verification.');
   return {subject:identity.id,sessionId:'token-'+Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join(''),expiresAt:claims.exp*1000,token};
  },
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  async signIn(email,password){const response=await request(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({email,password})});if(!response.ok)return {status:'invalid-credentials'};save(await response.json());return check();},
  async signOut(){session||=read();if(session){const response=await request(config.url+'/auth/v1/logout?scope=local',{method:'POST',headers:headers(await accessToken())});if(!response.ok&&response.status!==401)throw new Error('Could not end the Admin session. Please retry.');}clear();return {status:'signed-out'};},
  accessToken
 });
}

export {sessionKey as adminAuthSessionKey};
