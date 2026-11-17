import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const path=resolve(process.argv[2],'supabase/functions/overseer-aftercare/index.ts');
const {handleAftercare,sender}=await import(pathToFileURL(path));
const origin='https://apparitioninstruments.co.uk', hosted='https://acdxpxvksvdwfajntzfx.supabase.co';
const env={SUPABASE_URL:hosted,SUPABASE_ANON_KEY:'TEST_ONLY',SUPABASE_SERVICE_ROLE_KEY:'TEST_ONLY_SERVICE',SMTP_FROM_EMAIL:sender,SMTP_FROM_NAME:'Synthetic'};
let calls=0;
const blocked=async()=>{calls++;throw new Error('Network or mail is forbidden');};
for(const flag of [undefined,'false']){
 const response=await handleAftercare(new Request('https://test.invalid',{method:'POST',headers:{origin},body:JSON.stringify({action:'confirm'})}),{get:n=>n==='OVERSEER_EBAY_SMTP_ENABLED'?flag:env[n]},blocked,blocked);
 assert.equal(response.status,503);
 assert.match((await response.json()).message,/transport is disabled/i);
}
assert.equal(calls,0);
console.log('PASS Aftercare Direct fails before contacting Auth, database, or mail with its production flag missing or off');
