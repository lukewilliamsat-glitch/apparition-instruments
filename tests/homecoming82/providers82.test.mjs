import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, generateKeyPairSync, verify } from 'node:crypto';
import { ebayConsent,makeVerifiedEbayReads,ukFinanceSigner } from './ebay82.mjs';
import { providerJSON } from './provider-json.mjs';
import { stripeSandboxTransport,reattachSandboxSession,handleSandboxWebhook,checkoutRoute } from './stripe82.mjs';
import { prepareSandboxCheckout } from '../dominion78c/stripe79.mjs';

const at='2026-11-20T16:00:00Z', now=()=>Date.parse(at);
const account='acct_SyntheticApparition82', owner='synthetic-admin', subject='immutable-synthetic-eBay';
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json'}});

test('eBay binds consent to the Admin, exact UK provider identity and one-use state, without exposing credentials',async()=>{
 let actor=owner, linked, id=subject, expiry=now(), requests=[];
 const state=new Map();
 const config={clientId:'synthetic-app',clientSecret:'fixture-secret',ruName:'fixture-return'};
 const svc=ebayConsent({config,auth:{requireAdmin:async()=>actor},now:()=>expiry,
  stateStore:{
   stage:async x=>state.set(x.hash,x),
   take:async ({hash,actor})=>{const x=state.get(hash);if(x?.actor!==actor)return null;state.delete(hash);return x;}
  },vault:{bind:async x=>{linked=x;},status:async()=>linked},
  request:async x=>{
   requests.push(x);
   if(x.method==='POST')return {status:200,body:{access_token:'fixture-access',refresh_token:'fixture-refresh',token_type:'Bearer',refresh_token_expires_in:47304000}};
   return {status:200,body:{userId:id,registrationMarketplaceId:'EBAY_GB',name:'should not store'}};
  }});
 const start=async()=>new URL(await svc.start({account:'fixture-ebay',expectedSubject:subject}));
 assert.deepEqual(await svc.connectionStatus('fixture-ebay'),{state:'disconnected'});
 const url=await start(), st=url.searchParams.get('state');
 assert.equal(url.origin,'https://auth.sandbox.ebay.com');
 assert.equal(url.searchParams.get('redirect_uri'),config.ruName);
 assert.equal(url.searchParams.get('scope').split(' ').length,3);
 assert.match(url.searchParams.get('scope'),/sell\.fulfillment\.readonly/);
 assert.equal([...state.keys()].includes(st),false);
 actor='another-admin';
 await assert.rejects(()=>svc.complete({state:st,code:'provider-code'}),/expired|verified/);
 assert.equal(requests.length,0);
 actor=owner;
 id='another-eBay-seller';
 await assert.rejects(()=>svc.complete({state:st,code:'provider-code'}),/does not match/);
 assert.equal(linked,undefined);
 await assert.rejects(()=>svc.complete({state:st,code:'provider-code'}),/expired|verified/);
 id=subject;
 const s=await start();
 assert.deepEqual(await svc.complete({state:s.searchParams.get('state'),code:'provider-code'}),{status:'consent-recorded',verifiedReads:false});
 assert.deepEqual(await svc.connectionStatus('fixture-ebay'),{state:'consent-recorded'});
 assert.equal(new URL(requests[0].url).host,'api.sandbox.ebay.com');
 assert.equal(new URLSearchParams(requests[0].body).get('redirect_uri'),config.ruName);
 assert.equal(new URL(requests[1].url).host,'apiz.sandbox.ebay.com');
 assert.equal(linked.subject,subject);
 assert.equal(Object.hasOwn(linked,'name'),false);
 const old=await start();
 expiry+=600001;
 await assert.rejects(()=>svc.complete({state:old.searchParams.get('state'),code:'provider-code'}),/expired/);
});

test('eBay signed UK Finance reads verify cryptographically; first-page 204 commits no false rows',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const jwe='synthetic.head.iv.enc.tag';
 const vault={
  signingKey:async ({account,environment})=>({account,environment,expiresAt:now()+1000,jwe,privateKeyPem:privateKey.export({format:'pem',type:'pkcs8'})}),
  load:async ({account,environment})=>({account,environment,expiresAt:now()+1000,subject,clientId:'fixture-app',
   clientSecret:'fixture-private',refreshToken:'fixture-refresh',requestedScopes:['sell.finances']})
 };
 const actual=[];
 const read=await makeVerifiedEbayReads({vault,now,fetcher:async(url,opt)=>{
  actual.push([url,opt]);
  assert.equal(opt.redirect,'error');
  if(opt.method==='POST')return json({access_token:'fixture-access',token_type:'Bearer',expires_in:7200});
  assert.equal(url.host,'apiz.sandbox.ebay.com');
  const params='("x-ebay-signature-key" "@method" "@path" "@authority");created='+Math.floor(now()/1000);
  assert.equal(opt.headers['signature-input'],'sig1='+params);
  const base='"x-ebay-signature-key": '+jwe+'\n"@method": GET\n"@path": '+url.pathname+'\n"@authority": '+url.host+'\n"@signature-params": '+params;
  assert.equal(verify(null,Buffer.from(base),publicKey,Buffer.from(opt.headers.signature.slice(6,-1),'base64')),true);
  return new Response(null,{status:204});
 }});
 assert.deepEqual(await read('transactions',{account:'fixture-ebay',scopes:['sell.finances'],signerReady:true,
  from:'2026-11-20T15:00:00Z',to:at}),[]);
 assert.equal(actual.length,2);
 await assert.rejects(ukFinanceSigner({vault,now})({account:'fixture-ebay',method:'POST',url:'https://apiz.sandbox.ebay.com/sell/finances/v1/transaction'}),/outside/);
});

test('provider byte cap and allowlist fail closed and do not expose response text',async()=>{
 const request=providerJSON((url,m)=>url.origin==='https://example.invalid'&&m==='GET',
  async()=>json({untrusted:'x'.repeat(1000)}));
 const opts={url:'https://example.invalid',method:'GET',maxBytes:200,timeoutMs:300};
 await assert.rejects(request(opts),/bounded JSON/);
 await assert.rejects(request({...opts,url:'https://evil.invalid'}),/outside contract/);
});

const sandbox={
 orderId:'synthetic-order-82',account,expectedMinor:1750,currencyCode:'GBP',
 expiresAt:'2026-11-20T16:45:00Z',now:at
};
const plan=prepareSandboxCheckout(sandbox);
const session='cs_test_Synthetic82', payment='pi_SyntheticApp82', secret='whsec_Synthetic82Test';
const baseline={
 id:session,object:'checkout.session',livemode:false,amount_total:1750,currency:'gbp',status:'open',payment_status:'unpaid',
 metadata:{dominion_binding:plan.binding},client_reference_id:plan.orderId,url:'https://checkout.stripe.com/c/pay/'+session
};
test('Stripe session transport refuses live keys/URLs, verifies account, and uses one deterministic retry request',async()=>{
 assert.throws(()=>stripeSandboxTransport({key:'sk_live_Fixture82',account,returnOrigin:'http://127.0.0.1:8100'}),/Sandbox credentials/);
 assert.throws(()=>stripeSandboxTransport({key:'sk_test_Fixture82',account,returnOrigin:'https://apparitioninstruments.co.uk'}),/Non-production/);
 let row={...plan,mode:'sandbox'}, requests=[], lost=true;
 const transport=stripeSandboxTransport({key:'sk_test_Fixture82',account,returnOrigin:'http://127.0.0.1:8100',fetcher:async(url,opt)=>{
  if(url.pathname==='/v1/account')return json({object:'account',id:account});
  if(opt.method==='GET')return json({...baseline,status:'expired'});
  const form=new URLSearchParams(opt.body);
  requests.push([opt.headers['Idempotency-Key'],opt.body]);
  assert.equal(form.get('line_items[0][price_data][unit_amount]'),'1750');
  assert.equal(form.get('client_reference_id'),plan.orderId);
  assert.equal(form.get('expires_at'),String(plan.expiration));
  assert.match(form.get('success_url'),/^http:\/\/127\.0\.0\.1:8100\/checkout\/success/);
  if(lost){lost=false;throw Error('simulated lost response');}
  return json(baseline);
 }});
 const repository={read:async()=>row,attach:async ({orderId,binding,sessionId})=>{
  if(binding!==row.binding||orderId!==row.orderId)return false;
  row={...row,sessionId};return true;
 }};
 const call=()=>reattachSandboxSession({orderId:plan.orderId,repository,transport,now:()=>at});
 assert.equal((await call()).state,'review-provider-unavailable');
 assert.equal((await call()).state,'awaiting-provider');
 assert.deepEqual(requests[0],requests[1]);
 assert.equal((await call()).state,'verified-expiry');
 assert.equal(checkoutRoute({mode:'paused',hasHold:false,hasPlan:false,hasSession:false}),'legacy');
 assert.equal(checkoutRoute({mode:'draining',hasHold:true,hasPlan:false,hasSession:false}),'resume-or-review');
});
function seal(type,obj){
 const rawBody=Buffer.from(JSON.stringify({id:'evt_Synthetic82',object:'event',type,account,livemode:false,created:now()/1000,data:{object:obj}}));
 return {rawBody,signature:'t='+now()/1000+',v1='+createHmac('sha256',secret).update(now()/1000+'.').update(rawBody).digest('hex'),secret,now:at,account};
}
test('Stripe webhook handoff refuses wrong money, forged bytes and missing attachment; failed payment does not release',async()=>{
 let attached=true, changes=[];
 const saved={...plan,sessionId:session,intent:payment,mode:'sandbox'};
 const repository={bySession:async(a,s)=>a===account&&s===session&&attached?saved:null,byIntent:async()=>saved,
  applyVerified:async p=>{changes.push(p);return {state:p.type};}};
 const call=(type,object)=>handleSandboxWebhook({...seal(type,object),repository});
 const paid={...baseline,payment_status:'paid',status:'complete',payment_intent:payment};
 assert.deepEqual(await call('checkout.session.async_payment_failed',baseline),{state:'review-failed-payment',release:false});
 assert.equal(changes.length,0);
 await assert.rejects(call('checkout.session.completed',{...paid,amount_total:1}),/does not match/);
 const signed=seal('checkout.session.completed',paid);
 await assert.rejects(handleSandboxWebhook({...signed,rawBody:Buffer.concat([signed.rawBody,Buffer.from(' ')]),repository}),/signature mismatch/);
 attached=false;
 assert.deepEqual(await call('checkout.session.completed',paid),{state:'review-unattached',retry:true});
 attached=true;
 assert.deepEqual(await call('checkout.session.completed',paid),{state:'payment'});
 assert.equal(changes[0].transactionId,payment);
 await assert.rejects(call('refund.updated',{object:'refund',id:'re_Synthetic82',status:'succeeded',payment_intent:payment,currency:'usd',amount:1}),/Refund does not match/);
 assert.equal(changes.length,1);
});
