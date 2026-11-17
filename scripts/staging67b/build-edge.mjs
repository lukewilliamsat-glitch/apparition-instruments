import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const base=resolve(process.argv[2]??''), out=resolve(process.argv[3]??'');
assert(process.argv.length===4&&base!==out);
const source='2a70ebe09856044e2d19e7d6a28577698ac71122';
const host='staging.apparition-phoenix-preview.pages.dev';
const paths=['create-checkout/index.ts','stripe-webhook/index.ts','stripe-webhook/contact.ts','stripe-webhook/refund.ts',
 'checkout-status/index.ts','commerce67-reconcile/index.ts','_shared/customer-auth.ts','_shared/commerce67-payments.ts'];
const put=async(path,body)=>{
 assert(!/cs_live_|_live_|acdxpxvksvdwfajntzfx|sendConfirmedOrderOnce/.test(body),'Unexpected production transport in '+path);
 const dest=join(out,path);
 await mkdir(dirname(dest),{recursive:true});
 await writeFile(dest,body,{flag:'wx'});
};
for(const path of paths){
 let s=execFileSync('git',['show',source+':supabase/functions/'+path],{cwd:base,encoding:'utf8'});
 s=s.replaceAll('https://apparitioninstruments.co.uk','https://'+host)
  .replaceAll("'apparitioninstruments.co.uk'","'"+host+"'")
  .replaceAll('cs_live_','cs_test_').replaceAll('_live_','_test_').replaceAll('livemode!==true','livemode!==false')
  .replaceAll('Invalid live','Invalid sandbox').replaceAll('valid live Checkout','valid sandbox Checkout')
  .replaceAll('Live secure checkout','Stripe Sandbox checkout')
  .replace("origin+'/checkout/success/'","origin+'/'").replace("origin+'/basket/?checkout=cancel'","origin+'/?checkout=cancel'");
 if(path==='stripe-webhook/index.ts'){
  assert(s.includes("import {sendConfirmedOrderOnce} from './delivery.ts';\n")&&s.includes('if(!await sendConfirmedOrderOnce'));
  s=s.replace("import {sendConfirmedOrderOnce} from './delivery.ts';\n",'')
     .replace(/^\s*if\(!await sendConfirmedOrderOnce[^\n]*\n/m,'\n // Staging never invokes an email transport.\n');
 }
 if(path==='stripe-webhook/contact.ts'){
  assert(s.includes('||!name||!email'));
  s=s.replace('||!name||!email','||!name||!email||!/@example\\.invalid$/i.test(email)');
 }
 if(path.endsWith('/index.ts')){
  const m=s.match(/Deno\.serve\(req=>(\w+)\(req\)\);/);assert(m,'Unrecognized entry point: '+path);
  s="import {staged} from '../_shared/staging-guard.ts';\n"+s.replace(m[0],'Deno.serve(staged('+m[1]+'));');
 }
 await put(path,s);
}
await put('_shared/staging-guard.ts',await readFile(new URL('./staging-guard.ts',import.meta.url),'utf8'));
