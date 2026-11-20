import assert from 'node:assert/strict';
import { createHash,randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const { Pool }=createRequire(import.meta.url)(process.env.DOMINION_PG_MODULE);
const pool=new Pool({host:'127.0.0.1',port:55478,user:'postgres',database:'dominion79_fixture',max:2,connectionTimeoutMillis:3500,statement_timeout:12000});
const query=(sql,args)=>pool.query(sql,args);
const one=async(sql,args)=>Object.values((await query(sql,args)).rows[0])[0];
const load=path=>readFile(path,'utf8');
const root=resolve(process.env.DOMINION_ACCEPTED_ROOT), here=new URL('./',import.meta.url);
const accepted=path=>resolve(root,path);
const admin=randomUUID(), buyer=randomUUID();
async function install(path,expected) {
 const sql=await load(path);
 if(expected)assert.equal(createHash('sha256').update(sql).digest('hex'),expected);
 await query(sql);
}
async function as(role,actor,sql) {
 assert.ok(['anon','authenticated','service_role'].includes(role));
 const c=await pool.connect();
 try{
  await c.query('begin read only');
  await c.query('set local role '+role);
  if(actor)await c.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
  return Object.values((await c.query(sql)).rows[0])[0];
 }finally{await c.query('rollback');c.release();}
}
try{
 assert.equal(await one('select current_database()'),'dominion79_fixture');
 assert.match(await one("select current_setting('server_version')"),/^17\.6\b/);
 await install(accepted('tests/release69b/production-contract.sql'));
 const manifest=JSON.parse(await load(accepted('tests/release69b/manifest.json')));
 for(const [path,hash] of manifest.releaseA)await install(accepted('supabase/migrations/'+path),hash);
 await install(accepted('docs/operations/release69b/ironclad69b-production.atomic.sql'),'04ec507549545b31946aaef827e54201a8fec15c806f10f0fd217ea22fe49c90');
 await install(resolve(process.env.DOMINION_C_SQL),'f73d9b68df1eb8bd4a251d29ec58df1941132a4549d80c79e1790260fd9ea6be');
 await install(new URL('../dominion78c/ironheart80-stage-a.review.sql',here),'1e4f79c5a4e321b0e80450b10adf72b80ae3adb5b51dc1c09554c3811e6942de');
 const before=await one("select md5(string_agg(md5(pg_get_functiondef(oid)),'' order by oid)) from pg_proc where pronamespace in ('dominion79'::regnamespace,'quartermaster79'::regnamespace,'public'::regnamespace)");
 const readStage=new URL('stageb81.read.review.sql',here);
 await install(readStage);
 assert.equal(await one("select md5(string_agg(md5(pg_get_functiondef(oid)),'' order by oid)) from pg_proc where pronamespace in ('dominion79'::regnamespace,'quartermaster79'::regnamespace,'public'::regnamespace) and oid not in ('public.dominion81_status()'::regprocedure)"),before);
 assert.equal(await one("select provolatile='s' and prosecdef and proconfig=array['search_path=\"\"'] from pg_proc where oid='public.dominion81_status()'::regprocedure"),true);
 assert.equal(await one("select count(*)::int from pg_class where relkind='r' and relrowsecurity and relnamespace in ('dominion79'::regnamespace,'quartermaster79'::regnamespace)"),15);
 await query("insert into auth.users(id,email,email_confirmed_at) values ($1,'fixture-admin81@example.invalid',now()),($2,'fixture-buyer81@example.invalid',now())",[admin,buyer]);
 await query('insert into public.admin_members(user_id) values ($1)',[admin]);
 const status='select public.dominion81_status()';
 for(const [role,actor] of [['anon',null],['service_role',null],['authenticated',null],['authenticated',buyer]])
   await assert.rejects(as(role,actor,status),{code:'42501'});
 await assert.rejects(as('authenticated',admin,'select mode from dominion79.lifecycle_control'),{code:'42501'});
 await assert.rejects(as('authenticated',admin,'select count(*) from quartermaster79.material'),{code:'42501'});
 const empty={schema:1,unity:{mode:'paused',holds:0,holdLines:0,measuredAllocations:0},quartermaster:{mode:'disabled',materials:0,packs:0,movements:0}};
 assert.deepEqual(await as('authenticated',admin,status),empty);
 await query(`insert into quartermaster79.material(sku,title,reorder_at,inner_mm,outer_mm,tare_grams)
 select 'fixture81-'||i,'Synthetic packaging',0,array[1,1,1],array[2,2,2],1 from generate_series(1,1008) i`);
 assert.deepEqual(await as('authenticated',admin,status),{...empty,quartermaster:{...empty.quartermaster,materials:1001}});
 console.log('PASS PostgreSQL 17.6: exact Release A/B/C and Stage A, authenticated read-only transaction, dormant modes, empty and capped counts, three roles denied or limited, no direct private access, no mutation function or existing contract change');
}finally{await pool.end();}
