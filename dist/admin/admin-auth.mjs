import {publicBackendConfig} from '../backend/public-config.mjs';

const sessionKey='apparition.admin.supabase-session.v1';
const validConfig=config=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config?.url||'')&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(config?.publishableKey||'');

// Browser tokens are ordinary Supabase Auth session tokens, never Admin credentials.
// Membership and all future business writes are decided by the database under RLS.
export function createAdminAuth({config=publicBackendConfig,request=globalThis.fetch,storage=globalThis.localStorage,now=Date.now}={}){
 if(!validConfig(config)||typeof request!=='function'||!storage)throw new Error('Admin authentication is unavailable.');
 let session=null;
 const headers=token=>({apikey:config.publishableKey,...token?{Authorization:'Bearer '+token}:{}});
 const read=()=>{try{const raw=storage.getItem(sessionKey),value=raw&&JSON.parse(raw);return value&&typeof value.access_token==='string'&&typeof value.refresh_token==='string'&&Number.isFinite(value.expires_at)?value:null;}catch{return null;}};
 const clear=()=>{session=null;storage.removeItem(sessionKey);};
 const save=data=>{if(!data?.access_token||!data?.refresh_token||!Number.isFinite(data.expires_in))throw new Error('Invalid authentication response.');session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(now()/1000)+data.expires_in};storage.setItem(sessionKey,JSON.stringify(session));};
 const refresh=async()=>{const response=await request(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});if(!response.ok){clear();return false;}save(await response.json());return true;};
 async function accessToken(){session||=read();if(!session)throw new Error('Admin sign-in is required.');if(session.expires_at<=Math.floor(now()/1000)+60&&!await refresh())throw new Error('Admin session expired. Please sign in again.');return session.access_token;}
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
  async signIn(email,password){const response=await request(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({email,password})});if(!response.ok)return {status:'invalid-credentials'};save(await response.json());return check();},
  async signOut(){session||=read();if(session){const response=await request(config.url+'/auth/v1/logout?scope=local',{method:'POST',headers:headers(await accessToken())});if(!response.ok&&response.status!==401)throw new Error('Could not end the Admin session. Please retry.');}clear();return {status:'signed-out'};},
  accessToken
 });
}

export {sessionKey as adminAuthSessionKey};
