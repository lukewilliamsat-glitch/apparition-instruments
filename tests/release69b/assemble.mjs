import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const root=new URL('../../',import.meta.url);
export const manifest=JSON.parse(readFileSync(new URL('manifest.json',import.meta.url)));
export function reviewed(which){
 return manifest[which].map(([file,digest])=>{
  const raw=readFileSync(new URL('supabase/migrations/'+file,root));assert.equal(hash(raw),digest,file+' changed');
  assert(!/^\s*(begin|commit|rollback);\s*$/im.test(raw.toString()),'A member controls the outer transaction');
  return {file,digest,raw};
 });
}
export function ironcladAtomic(){
 const first="-- Release B: approve these exact bytes only. Do not install members separately.\nBEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='75s';\n";
 const check=`DO $release69b_preflight$
DECLARE
 checkout_hash text:=md5(pg_get_functiondef(to_regprocedure('public.create_guest_kit_order(jsonb)')));
 finance_hash text:=md5(pg_get_functiondef(to_regprocedure('public.command63_finance_validate(jsonb,jsonb,text)')));
 a_schemas integer:=(select count(*) from pg_namespace where nspname in ('overseer_delivery','overseer_aftercare','overseer_order_dates','eclipse_finance'));
BEGIN
 IF to_regnamespace('commerce67') IS NOT NULL OR to_regnamespace('ironclad69') IS NOT NULL THEN
  RAISE EXCEPTION 'Release B expects no Commerce and no prior IRONCLAD installation';
 END IF;
 IF to_regclass('public.inventory') IS NULL OR to_regprocedure('public.apply_order_inventory(jsonb)') IS NULL
  OR to_regprocedure('public.fulfil_paid_stripe_checkout(text,text,uuid,text,text,text,bigint,text)') IS NULL
  OR to_regprocedure('public.create_external_order(jsonb)') IS NULL THEN
  RAISE EXCEPTION 'Release B legacy stock contract missing';
 END IF;
 IF checkout_hash IS NULL OR finance_hash IS NULL
  OR NOT ((a_schemas,checkout_hash,finance_hash) IN (
   (0,'3af9927a0bc3d5ac2f917a6818f910cb','04f3dc3b60ccf984f8afa7fca29c482a'),
   (4,'ba4bf95a75a64036cb04f280be006d92','289cf4e98092b59ab9b51d5aa0f1bb34')
  ))
  OR md5(pg_get_functiondef(to_regprocedure('public.create_external_order(jsonb)'))) IS DISTINCT FROM 'df2e46524aba50edb6140f4eb87d3f3e'
  OR md5(pg_get_functiondef(to_regprocedure('public.apply_order_inventory(jsonb)'))) IS DISTINCT FROM '9d1c421b855ded51ce681ec46cf32a13' THEN
  RAISE EXCEPTION 'Release B production contract drift; check the actual delta before applying';
 END IF;
END $release69b_preflight$;
`;
 const final=`DO $release69b_assert$
BEGIN
 IF ironclad69.commerce_enabled() OR ironclad69.reservations('nonexistent-probe') <> 0
  OR has_function_privilege('anon','public.ironclad69_write(uuid,text,jsonb)','EXECUTE')
  OR has_schema_privilege('authenticated','ironclad69','USAGE') THEN
  RAISE EXCEPTION 'Release B failed effective authority checks';
 END IF;
END $release69b_assert$;
COMMIT;
`;
 return Buffer.concat([Buffer.from(first+check),...reviewed('releaseB').flatMap(x=>[Buffer.from('\n-- Member '+x.file+' sha256:'+x.digest+'\n'),x.raw,Buffer.from('\n')]),Buffer.from(final)]);
}
if(process.argv[2]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dst=process.argv[2];mkdirSync(dst,{recursive:true});
 const atom=ironcladAtomic();writeFileSync(join(dst,'ironclad69b-production.atomic.sql'),atom);
 const a=reviewed('releaseA');mkdirSync(join(dst,'release-a'),{recursive:true});
 for(const m of a)writeFileSync(join(dst,'release-a',m.file),m.raw);
 writeFileSync(join(dst,'SHA256SUMS.txt'),hash(atom)+'  ironclad69b-production.atomic.sql\n'+a.map(x=>x.digest+'  release-a/'+x.file).join('\n')+'\n');
 console.log(JSON.stringify({atomicReleaseB:hash(atom),components:manifest}));
}
