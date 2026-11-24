import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setTimeout as wait} from 'node:timers/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {Client}=require(process.env.QUARTERMASTER_PG_MODULE??'pg');
const host=process.env.QUARTERMASTER_PG_HOST??'127.0.0.1';
assert.equal(host,'127.0.0.1');
const options={host,port:Number(process.env.QUARTERMASTER_PG_PORT??5432),user:'postgres',database:'quartermaster84w_fixture'};
const connect=async()=>{const c=new Client(options);await c.connect();return c;};
const [db,a,b]=await Promise.all([connect(),connect(),connect()]);
const files=process.argv[2];
const file=path=>readFile(new URL(path,import.meta.url),'utf8');
const as=(n)=>'a0000000-0000-4000-8000-00000000000'+n;
const ids=[1,2,3,4].map(n=>'84000000-0000-4000-8000-00000000001'+n);
const uid=n=>'85000000-0000-4000-8000-'+String(n).padStart(12,'0');
const supplier='84000000-0000-4000-8000-000000000001';
const row=async(client,sql,params)=>(await client.query(sql,params)).rows[0];
const val=async(client,sql,params)=>(await row(client,sql,params)).v;
async function role(client,actor,level='authenticated'){
 await client.query('begin');
 assert.ok(['authenticated','anon','service_role'].includes(level));
 await client.query('set local role '+level);
 if(actor)await client.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
}
async function access(client,actor,fn,level){
 await role(client,actor,level);
 try{const result=await fn(client);await client.query('commit');return result;}
 catch(error){await client.query('rollback');throw error;}
}
const scoped=(actor,sql,params,level,client=a)=>access(client,actor,c=>val(c,sql,params),level);
const check=(promise,code)=>assert.rejects(promise,{code});
const action=(client,order,request,g,v,data)=>val(client,'select public.quartermaster84w_pack($1,$2,$3,$4,$5) v',[order,uid(request),g,v,data]);
const pack=(...args)=>access(a,as(1),client=>action(client,...args));
const approval=(client,p,req,evidence=p.evidenceHash,basis=p.orderBasisHash)=>val(client,
 'select public.quartermaster84c_finance_save($1,$2,$3,$4,$5) v',[ids[0],p.revision,basis,evidence,uid(req)]);
const proposal=()=>scoped(as(2),'select public.quartermaster84c_finance_proposal($1) v',[ids[0]]);
async function lockWait(client){
 for(let i=0;i<60;i++){
  if((await row(db,'select wait_event_type from pg_stat_activity where pid=$1',[client.processID])).wait_event_type==='Lock')return;
  await wait(25);
 }
 assert.fail('Expected blocked concurrent backend');
}
try{
 assert.equal((await row(db,'select current_database() name')).name,options.database);
 await db.query(await file('./stage-prerequisites.sql'));
 const sql=await readFile(files,'utf8');
 // Missing verified identity must fail atomically.
 await db.query('update auth.users set email_confirmed_at=null where id=$1',[as(3)]);
 await assert.rejects(db.query(sql),{code:'P0002'});
 await db.query('rollback');
 assert.equal(await val(db,"select to_regnamespace('quartermaster84c') v"),null);
 await db.query('update auth.users set email_confirmed_at=now() where id=$1',[as(3)]);
 await db.query(sql);
 assert.equal(await val(db,'select count(*)::int v from quartermaster84c.fixture_orders'),4);
 const financeSnapshot=await val(db,'select count(*)::int v from public.order_financial_revisions');
 const packingSku={kind:'reserve',sku:'84C-MAILER'};
 for(const level of ['anon','service_role'])await check(scoped(null,'select public.quartermaster84c_orders() v',[],level),'42501');
 await check(scoped(as(4),'select public.quartermaster84c_orders() v'),'42501');
 await check(scoped(as(1),'select command63_finance_actor() v'),'42501');
 await check(scoped(as(3),'select command63_finance_actor() v'),'42501');
 await check(scoped(as(3),'select count(*) v from quartermaster79.material'),'42501');
 await check(scoped(as(1),"select quartermaster79.saved_bom('[]') v"),'42501');
 assert.equal((await scoped(as(3),'select public.quartermaster84c_orders() v')).writer,false);
 await check(scoped(as(3),'select public.quartermaster84w_workspace($1) v',[ids[0]]),'42501');
 await check(scoped(as(2),'select public.quartermaster84w_workspace($1) v',[ids[0]]),'42501');
 assert.equal((await scoped(as(1),'select public.quartermaster84c_suppliers() v')).length,1);
 for(const state of ['disabled','observe']){
  await db.query('update quartermaster84w.gate set mode=$1 where singleton',[state]);
  await check(pack(ids[0],1,0,0,packingSku),'42501');
 }
 await db.query("update quartermaster84w.gate set mode='workshop' where singleton");
 await check(pack(uid(198),2,0,0,packingSku),'42501');
 const receive=()=>scoped(as(1),'select public.quartermaster84w_receive($1,$2,$3,$4,$5,$6) v',
   [uid(20),'84C-MAILER',supplier,'84C-PURCHASE',1,40]);
 assert.equal(await receive(),true);assert.equal(await receive(),false);
 await role(a,as(1));
 assert.equal((await action(a,ids[0],3,0,0,packingSku)).generation,1);
 await role(b,as(1));
 const competing=action(b,ids[1],4,0,0,packingSku).catch(e=>e);
 await lockWait(b);
 await a.query('commit');
 assert.equal((await competing).code,'23514');
 await b.query('rollback');
 const partial={kind:'pick',component:'fixture-staging-pot',quantity:1};
 assert.equal((await pack(ids[0],5,1,0,partial)).revision,1);
 const ws=await scoped(as(1),'select public.quartermaster84w_workspace($1) v',[ids[0]]);
 assert.equal(ws.order.picks[0].picked,1);
 await check(pack(ids[0],6,1,0,partial),'40001');
 await pack(ids[0],7,1,1,{kind:'release'});
 assert.equal((await pack(ids[0],8,1,2,packingSku)).generation,2);
 await check(pack(ids[0],9,1,0,partial),'40001');
 await pack(ids[0],10,2,0,{...partial,quantity:2});
 const complete={kind:'complete',purchase:uid(20),mm:[40,30,20],grams:75,format:'large-letter',estimate:130,tracking:'84C-TRACKING'};
 const packed=await pack(ids[0],11,2,1,complete);
 assert.deepEqual(await pack(ids[0],11,2,1,complete),packed);
 const estimate=await proposal();
 assert.equal(estimate.evidence.estimate,130);assert.equal(estimate.canApprove,false);
 await pack(ids[0],12,2,2,{kind:'postage',minor:115,receipt:'84C-POSTAGE'});
 const p=await proposal();
 assert.equal(p.canApprove,true);assert.equal(p.evidence.packaging,40);assert.equal(p.evidence.actual,115);
 assert.equal(await val(db,'select count(*)::int v from public.order_financial_revisions'),financeSnapshot);
 await check(access(a,as(1),c=>approval(c,p,20)),'42501');
 await check(access(a,as(2),c=>approval(c,p,20,'a'.repeat(64))),'40001');
 assert.equal((await access(a,as(2),c=>approval(c,p,21,p.evidenceHash,'b'.repeat(64)))).outcome,'order-conflict');
 await role(a,as(2));
 assert.equal((await approval(a,p,22)).revision,1);
 await role(b,as(2));
 const financeRace=approval(b,p,23).catch(e=>e);
 await lockWait(b);
 await a.query('commit');
 assert.equal((await financeRace).outcome,'conflict');
 await b.query('commit');
 const receipt=await access(a,as(2),c=>approval(c,p,22));
 assert.equal(receipt.idempotent,true);assert.equal(receipt.revision,1);
 const report=await scoped(as(2),'select public.quartermaster84c_omniscience($1) v',[ids[0]]);
 assert.equal(report.current,true);
 assert.equal(report.finance.costs.packaging.minor,40);assert.equal(report.finance.costs.shipping.minor,115);
 assert.equal(await val(db,'select count(*)::int v from public.order_financial_revisions'),1);
 if(process.env.QUARTERMASTER_STAGE_SITE){
  const model=await import(pathToFileURL(join(process.env.QUARTERMASTER_STAGE_SITE,'admin/omniscience/model.mjs')));
  const result=model.evaluate(report);
  assert.equal(result.state,'recorded');
  assert.equal(result.calculation.fulfilmentCosts.packaging,40);
  assert.equal(result.calculation.fulfilmentCosts.shipping,115);
 }
 const original=report.finance;
 const correction=structuredClone(original);
 correction.costs.other={minor:10,state:'confirmed',source:'84C synthetic correction'};
 const corrected=await scoped(as(2),'select public.command63_financial_save($1,1,$2,$3,$4) v',
   [ids[0],p.orderBasisHash,uid(25),correction]);
 assert.equal(corrected.revision,2);
 const records=(await db.query('select before_document,after_document from public.order_financial_revisions where order_id=$1 order by revision',[ids[0]])).rows;
 assert.equal(records.length,2);
 assert.deepEqual(records[0].after_document,original);
 assert.deepEqual(records[1].before_document,original);
 assert.deepEqual(records[1].after_document,correction);
 const p2=await proposal();
 assert.equal(p2.document.costs.other.minor,10);
 assert.equal(p2.document.costs.shipping.minor,115);
 console.log('PASS OMNISCIENCE recorded costs and preserved previous financial revision after correction');
 assert.equal(await val(db,"select quantity::int v from public.inventory where component_id='fixture-staging-pot'"),99);
 assert.equal(await val(db,"select count(*)::int v from quartermaster79.movement where kind='packed'"),1);
 const financeBefore=await val(db,"select md5(string_agg(after_document::text,',' order by revision)) v from public.order_financial_revisions");

 await scoped(as(1),'select public.quartermaster84w_receive($1,$2,$3,$4,$5,$6) v',[uid(30),'84C-MAILER',supplier,'84C-RECOVERY',1,40]);
 await pack(ids[2],30,0,0,packingSku);
 await db.query(await file('../db/recovery.sql'));
 await check(pack(ids[3],32,0,0,packingSku),'42501');
 await assert.rejects(db.query(await file('../db/finish-recovery.sql')),/Reserved packs remain/);
 await db.query('rollback');
 assert.equal((await pack(ids[2],33,1,0,{kind:'release'})).state,'released');
 await db.query(await file('../db/finish-recovery.sql'));
 await check(pack(ids[3],34,0,0,packingSku),'42501');
 assert.equal(await val(db,"select md5(string_agg(after_document::text,',' order by revision)) v from public.order_financial_revisions"),financeBefore);
 assert.equal(await val(db,"select count(*)::int v from quartermaster79.movement where kind='packed'"),1);
 assert.equal((await scoped(as(3),'select public.dominion81_status() v')).unity.mode,'paused');
 console.log('PASS atomic staging package, role denials, concurrent last-unit and finance saves, isolated ECLIPSE/OMNISCIENCE and compensating drain');
} finally {
 for(const c of [db,a,b])await c.end();
}
