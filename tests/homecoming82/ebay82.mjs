import {createHash,createPrivateKey,randomBytes,sign as signBytes} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {identifier} from '../dominion78c/contracts.mjs';
import {providerJSON} from './provider-json.mjs';

const scopes=['sell.fulfillment.readonly','sell.finances','commerce.identity.readonly'];
const scopeString=scopes.map(s=>'https://api.ebay.com/oauth/api_scope/'+s).join(' ');
const accountRef=s=>identifier(s,'verified eBay subject');
const tokenPart=x=>typeof x==='string'&&/^[!-~]{1,8192}$/.test(x);
const sha=s=>createHash('sha256').update(s).digest('hex');
const matchEnvironment=e=>['production','sandbox'].includes(e);
const host=(prefix,e)=>prefix+(e==='sandbox'?'.sandbox':'')+'.ebay.com';
const endpoints={token:'/identity/v1/oauth2/token',identity:'/commerce/identity/v1/user',
 orders:'/sell/fulfillment/v1/order',transactions:'/sell/finances/v1/transaction'};

export function ebayProviderRequest(environment,fetcher) {
 if(!matchEnvironment(environment))throw Error('Unknown eBay environment');
 return providerJSON((url,method)=>{
  if(url.origin==='https://'+host('api',environment)){
   if(url.pathname===endpoints.token)return method==='POST'&&!url.search;
   if(url.pathname===endpoints.orders)return method==='GET';
  }
  if(url.origin==='https://'+host('apiz',environment)&&method==='GET')
   return url.pathname===endpoints.transactions||url.pathname===endpoints.identity&&!url.search;
  return false;
 },fetcher);
}

// Each start/finish/status call must obtain an Admin identity from the actual server auth
// layer. State is one-use and actor-bound via a private atomically consumed hash.
// A vault adapter must encrypt at rest and reject changing a linked account as a side effect of reconnect.
export function ebayConsent({environment='sandbox',config,auth,stateStore,vault,request=ebayProviderRequest(environment),now=()=>Date.now()}){
 if(!matchEnvironment(environment)||typeof auth?.requireAdmin!=='function'||typeof stateStore?.stage!=='function'||
    typeof stateStore?.take!=='function'||typeof vault?.bind!=='function'||typeof vault?.status!=='function'||
    !/^[A-Za-z0-9._-]{1,128}$/.test(config?.clientId??'')||!tokenPart(config?.clientSecret)||
    !/^[A-Za-z0-9_-]{1,128}$/.test(config?.ruName??''))throw Error('Private eBay consent configuration incomplete');
 async function admin(){return identifier(await auth.requireAdmin(),'authorized Admin');}
 async function start({account,expectedSubject}){
  const actor=await admin();
  identifier(account,'connection alias');accountRef(expectedSubject);
  const state=randomBytes(32).toString('base64url');
  await stateStore.stage({hash:sha(state),actor,account,expectedSubject,environment,expiresAt:now()+600000});
  const url=new URL('https://'+host('auth',environment)+'/oauth2/authorize');
  url.search=new URLSearchParams({client_id:config.clientId,redirect_uri:config.ruName,response_type:'code',scope:scopeString,state});
  return url.href;
 }
 async function complete({state,code,declined=false}){
  const actor=await admin();
  if(typeof state!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(state))throw Error('Invalid consent state');
  const intent=await stateStore.take({hash:sha(state),actor,environment,now:now()});
  if(!intent||intent.actor!==actor||intent.environment!==environment||!Number.isSafeInteger(intent.expiresAt)||intent.expiresAt<=now())throw Error('Consent expired or could not be verified');
  if(declined)return {status:'declined'};
  if(!tokenPart(code))throw Error('Authorisation code missing');
  const token=await request({url:'https://'+host('api',environment)+endpoints.token,method:'POST',timeoutMs:7000,maxBytes:25000,
   headers:{Authorization:'Basic '+Buffer.from(config.clientId+':'+config.clientSecret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:config.ruName}).toString()});
  const t=token?.body;
  if(token?.status!==200||!tokenPart(t?.access_token)||!tokenPart(t?.refresh_token)||!(/^bearer$/i.test(t.token_type??''))||
    !Number.isSafeInteger(t.refresh_token_expires_in)||t.refresh_token_expires_in<=0||t.refresh_token_expires_in>700*86400)
     throw Error('eBay consent needs review');
  const id=await request({url:'https://'+host('apiz',environment)+endpoints.identity,method:'GET',timeoutMs:7000,maxBytes:30000,
   headers:{Authorization:'Bearer '+t.access_token,Accept:'application/json'}});
  const subject=id?.body?.userId;
  if(id?.status!==200||subject!==intent.expectedSubject||id?.body?.registrationMarketplaceId!=='EBAY_GB')throw Error('The authorised eBay identity does not match the reviewed UK seller');
  // The subsequent limited-scope refresh and signed reads are the real provider scope proof.
  const expiresAt=now()+t.refresh_token_expires_in*1000;
  await vault.bind({actor,account:intent.account,subject,environment,expiresAt,refreshToken:t.refresh_token,requestedScopes:[...scopes]});
  return {status:'consent-recorded',verifiedReads:false};
 }
 async function connectionStatus(account){
  const actor=await admin();identifier(account,'connection alias');
  const data=await vault.status({actor,account,environment});
  return {state:!data?'disconnected':data.expiresAt<=now()?'reconnect-required':data.readsVerified===true?'verified':'consent-recorded'};
 }
 return {start,complete,connectionStatus};
}

export function ukFinanceSigner({environment='sandbox',vault,now=()=>Date.now()}){
 if(!matchEnvironment(environment)||typeof vault?.signingKey!=='function')throw Error('Private eBay signing key store required');
 return async({account,method,url})=>{
  identifier(account,'connection alias');
  const u=new URL(url);
  if(u.origin!=='https://'+host('apiz',environment)||u.pathname!==endpoints.transactions||u.username||u.password||u.hash||method!=='GET')
   throw Error('eBay signature requested outside Finance read contract');
  const k=await vault.signingKey({account,environment});
  const timestamp=Math.floor(now()/1000);
  if(!k||k.account!==account||k.environment!==environment||!Number.isSafeInteger(k.expiresAt)||k.expiresAt<=now()||
    !/^[-_A-Za-z0-9]+(?:\.([-_A-Za-z0-9]*)){4}$/.test(k.jwe??'')||k.jwe.length>12000)throw Error('eBay signing key missing or expired');
  try{
   const key=createPrivateKey(k.privateKeyPem);
   const alg=key.asymmetricKeyType==='ed25519'?null:key.asymmetricKeyType==='rsa'?'RSA-SHA256':undefined;
   if(alg===undefined)throw Error();
   const params='("x-ebay-signature-key" "@method" "@path" "@authority");created='+timestamp;
   const base='"x-ebay-signature-key": '+k.jwe+'\n"@method": GET\n"@path": '+u.pathname+'\n"@authority": '+u.host+'\n"@signature-params": '+params;
   return {'x-ebay-signature-key':k.jwe,'signature-input':'sig1='+params,signature:'sig1=:'+signBytes(alg,Buffer.from(base,'ascii'),key).toString('base64')+':'};
  }catch{throw Error('Finance signature could not be generated');}
 };
}

// Wire the accepted reader and gateway to environment-specific endpoints, with no
// network performed until a reviewed connection is available. Do not publish these modules.
export async function makeVerifiedEbayReads({environment='sandbox',vault,fetcher,wait,now=()=>Date.now()}){
 const {makeEbayGateway,createReadAdapter}=await import('../dominion78c/marketplace79.mjs');
 const request=ebayProviderRequest(environment,fetcher);
 const sign=ukFinanceSigner({environment,vault,now});
 function target(url){
  const u=new URL(url);
  if(u.hostname==='api.ebay.com')u.hostname=host('api',environment);
  else if(u.hostname==='apiz.ebay.com')u.hostname=host('apiz',environment);
  else throw Error('Unrecognised eBay gateway URL');
  return u.href;
 }
 const transport=makeEbayGateway({vault:{async load(account){
  const row=await vault.load({account,environment});
  if(row?.environment!==environment||row?.account!==account||!row.subject||row.expiresAt<=now()||!Number.isSafeInteger(row.expiresAt))
    throw Error('Reviewed eBay consent missing or expired');
  return {...row,grantedScopes:row.requestedScopes};
 }},request:async opts=>{
  const resp=await request({...opts,url:target(opts.url)});
  const u=new URL(opts.url);
  if(resp.status===204&&opts.method==='GET'&&u.pathname===endpoints.transactions&&u.searchParams.get('offset')==='0')
   return {status:200,body:{transactions:[],offset:0,next:null}};
  return resp;
 },sign:args=>sign({...args,url:target(args.url)}),now});
 return createReadAdapter({transport,wait:wait??(ms=>new Promise(r=>setTimeout(r,ms)))});
}
