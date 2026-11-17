import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root = new URL('file://' + process.argv[2] + '/');
const {stagingEnvironment,stagingFetch} = await import(new URL('_shared/staging-guard.ts',root));
const project='https://prwmowexhonguvtiywsy.supabase.co', live='https://acdxpxvksvdwfajntzfx.supabase.co';
const host='https://staging.apparition-phoenix-preview.pages.dev';
const fixture = {SUPABASE_URL: project,STAGING_PAYMENTS_ENABLED:'true',STAGING_STRIPE_SECRET_KEY:'sk_test_FixtureKey123',
 STAGING_STRIPE_WEBHOOK_SECRET:'whsec_FixtureHook123',STAGING_TURNSTILE_SECRET:'fixtureTurnstile',STRIPE_SECRET_KEY:'sk_live_WrongEnvironment'};
const env = replacement => ({get:name=>({...fixture,...replacement})[name]});
assert.equal(stagingEnvironment(env({SUPABASE_URL:live})),null);
for (const config of [{STAGING_STRIPE_SECRET_KEY:'sk_live_No'}, {STAGING_PAYMENTS_ENABLED:'false'}, {STAGING_STRIPE_WEBHOOK_SECRET:''}]) {
 const edition=stagingEnvironment(env(config));
 assert.equal(edition.get('STRIPE_SECRET_KEY'),undefined);
 assert.equal(edition.get('COMMERCE67_SENTINEL_ENABLED'),undefined);
}
const allowed = stagingEnvironment(env({}));
const calls=[];
const fetchStage = stagingFetch(allowed,async (input, options)=>{calls.push([input,options.redirect]);return new Response('{}');});
for (const target of [live+'/rest/v1/orders', 'https://smtp.example.invalid/send',project+'/storage/v1/object',
 'https://api.stripe.com/v1/checkout/sessions/cs_live_123456789','https://api.stripe.com/v1/customers',
 'https://user@api.stripe.com/v1/checkout/sessions','https://challenges.cloudflare.com/turnstile/v0/siteverify']) {
 await assert.rejects(fetchStage(target,{headers:{Authorization:'Bearer '+fixture.STAGING_STRIPE_SECRET_KEY}}));
}
await assert.rejects(fetchStage('https://api.stripe.com/v1/checkout/sessions',{headers:{Authorization:'Bearer '+fixture.STRIPE_SECRET_KEY}}));
assert.equal(calls.length,0);
for(const target of [project+'/rest/v1/orders','https://api.stripe.com/v1/checkout/sessions/cs_test_123456789']){
 await fetchStage(target,{headers:{Authorization:'Bearer '+fixture.STAGING_STRIPE_SECRET_KEY},redirect:'follow'});
}
assert.deepEqual(calls.map(e=>e[1]),['error','error']);
const {startCheckout}=await import(new URL('create-checkout/index.ts',root));
const response=await startCheckout(new Request(project+'/functions/v1/create-checkout',{method:'POST',headers:{Origin:host},body:'{}'}),
 stagingEnvironment(env({STAGING_PAYMENTS_ENABLED:'false'})),async()=>{throw Error('Unexpected payment transport')});
assert.equal(response.status,503);
const {receiveStripeWebhook}=await import(new URL('stripe-webhook/index.ts',root));
assert.notEqual((await receiveStripeWebhook(new Request(project+'/functions/v1/stripe-webhook',{method:'POST',body:'{}'}),
 allowed,async()=>{throw Error('Unsigned webhook is not allowed to reach providers')})).status,200);
const webhook=await readFile(new URL('stripe-webhook/index.ts',root),'utf8');
assert(!/sendConfirmedOrderOnce|\.\/delivery\.ts/.test(webhook));
console.log('Staging project pin, live key and URL rejection, no redirects, payment default-off, unsigned events, and no email transport passed.');
