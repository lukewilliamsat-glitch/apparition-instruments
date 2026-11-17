import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {hash,ironcladAtomic,reviewed} from './assemble.mjs';
const root=new URL('../../',import.meta.url), read=f=>readFileSync(new URL(f,root),'utf8');
const pgScript=read('tests/release69b/production-contract.sql');
const admin='68a00000-0000-4000-8000-000000000001', buyer='68a00000-0000-4000-8000-000000000002', oldEbay='68a00000-0000-4000-8000-000000000003';
const native=process.env.RELEASE69B_NATIVE==='true';
const literal=s=>"'"+String(s).replaceAll("'","''")+"'";
const json=v=>literal(JSON.stringify(v))+'::jsonb';
const int=v=>Number(v);
const results=[];
let Pool,pglite,ext;
if(native){({Pool}=createRequire(import.meta.url)(process.env.RELEASE69B_PG_MODULE||'pg'));}
else{
 const p=pathToFileURL(resolve(process.env.RELEASE69B_PGLITE||'engines/node_modules/@electric-sql/pglite/dist')+'/');
 pglite=(await import(new URL('index.js',p))).PGlite;
 ext=(await import(new URL('contrib/pgcrypto.js',p))).pgcrypto;
}
const opts={host:'127.0.0.1',port:55469,user:'postgres',connectionTimeoutMillis:4000};
async function instance(label){
 if(!native)return new pglite({extensions:{pgcrypto:ext}});
 assert(['a','b','stack'].includes(label));
 const database='isolated_release69b_'+label,rootPool=new Pool({...opts,database:'postgres'});
 await rootPool.query('CREATE DATABASE '+database);await rootPool.end();
 const pool=new Pool({...opts,database,max:4}),conn=await pool.connect();
 return {exec:s=>conn.query(s),query:(s,p)=>conn.query(s,p),async parallel(s){
  const c=await pool.connect();
  try{return await c.query(s);}catch(e){await c.query('rollback');throw e;}finally{c.release();}
 },async close(){conn.release();await pool.end();}};
}
const one=async(db,s,p)=>(await db.query(s,p)).rows[0];
const call=async(db,s,p)=>Object.values(await one(db,s,p))[0];
const stock=(db,id)=>call(db,'select quantity from public.inventory where component_id='+literal(id));
const claims=(db,role,uid)=>db.exec('reset role; set role '+role+'; select set_config(\'request.jwt.claim.sub\','+literal(uid)+',false);');
const code=e=>e?.code;
function result(label,detail){results.push({label,...detail});console.log('PASS '+label,JSON.stringify(detail));}
function eq(val,expected){assert.equal(int(val),expected);}
async function start(label){
 const db=await instance(label);
 try{await db.exec(native&&label!=='a'?pgScript.replace(/^create role [^;]+;\n/gm,''):pgScript);}catch(e){console.error('Replay contract failed:',e.code,e.message,e.position,e.detail);throw e;}
 const server=await call(db,'select current_setting(\'server_version\')');
 if(native)assert.match(server,/^17\.6(?:\D|$)/);
 const identity=await one(db,`select md5(pg_get_functiondef('public.create_guest_kit_order(jsonb)'::regprocedure)) checkout,
 md5(pg_get_functiondef('public.create_external_order(jsonb)'::regprocedure)) external,
 md5(pg_get_functiondef('public.command63_finance_validate(jsonb,jsonb,text)'::regprocedure)) finance,
 md5(pg_get_functiondef('public.apply_order_inventory(jsonb)'::regprocedure)) inventory`);
 assert.deepEqual(identity,{checkout:'3af9927a0bc3d5ac2f917a6818f910cb',external:'df2e46524aba50edb6140f4eb87d3f3e',finance:'04f3dc3b60ccf984f8afa7fca29c482a',inventory:'9d1c421b855ded51ce681ec46cf32a13'});
 assert.equal(await call(db,"select to_regnamespace('commerce67') is null"),true);
 await db.exec(`insert into auth.users(id,email,email_confirmed_at) values ('${admin}','admin@example.invalid',now()),('${buyer}','buyer@example.invalid',now());
 insert into public.admin_members(user_id) values ('${admin}');
 insert into public.site_operations(id,desired_state) values(true,'OPEN');
 insert into public.commerce_shipping(country,standard_delivery_pence,free_delivery_threshold_pence) values('GB',399,5000);
 insert into public.components(id,sku,name,category,active,individually,sale_price) values
 ('fixture-staging-cap','STAGING-CAP','Workshop capacitor','capacitors',true,true,750),('fixture-weblarge','STAGING-WEB-LARGE','Fictional complete kit','capacitors',true,true,5000);
 insert into public.inventory(component_id,quantity) values ('fixture-staging-cap',100),('fixture-weblarge',20);
 insert into public.orders(id,request_id,request_hash,sales_channel,external_reference,order_date,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,payment_status,paid_at,fulfillment_applied_at,created_at)
 values('${oldEbay}','${oldEbay}',repeat('a',32),'EBAY','OV68-SYNTHETIC','2026-10-31',750,399,1149,'{"name":"Fictional Workshop Buyer","email":"overseer-buyer@example.invalid"}','{"country":"GB"}',
 '[{"type":"component","name":"Workshop capacitor","productId":"fixture-staging-cap","sku":"STAGING-CAP","quantity":1,"unitPrice":750,"lineTotal":750,"currency":"GBP"}]','paid',now(),now(),'2026-11-03T09:00:00Z');
 `);
 result('production-shaped-'+label,{server,engine:native?'native PostgreSQL':'PGlite PostgreSQL',commerce:false,contracts:identity});
 return db;
}
const checkout=(db,sku='STAGING-CAP',requestId=crypto.randomUUID())=>call(db,'select public.create_guest_kit_order($1::jsonb)',[JSON.stringify({requestId,items:[{product:'component',sku,quantity:1}],checkoutMode:'stripe',deliveryMethod:'standard'})]);
async function legacy(db,label){
 await db.exec('reset role');
 const before=await stock(db,'fixture-staging-cap'),paid=await checkout(db),free=await checkout(db,'STAGING-WEB-LARGE');
 eq((await one(db,'select delivery_pence from public.orders where id=$1',[paid.id])).delivery_pence,399);
 eq((await one(db,'select delivery_pence from public.orders where id=$1',[free.id])).delivery_pence,0);
 assert.equal(await stock(db,'fixture-staging-cap'),before);
 const session='cs_live_Synthetic69B'+crypto.randomUUID().replaceAll('-',''),intent='pi_69B'+crypto.randomUUID().replaceAll('-',''),event='evt_69B'+crypto.randomUUID().replaceAll('-','');
 await db.query('update public.orders set stripe_checkout_session_id=$1 where id=$2',[session,paid.id]);
 const order=await one(db,'select reference,total_pence from public.orders where id=$1',[paid.id]);
 const fulfil='select public.fulfil_paid_stripe_checkout($1,\'checkout.session.completed\',$2,$3,$4,$5,$6,\'gbp\')';
 const args=[event,paid.id,order.reference,session,intent,order.total_pence];
 assert.equal(await call(db,fulfil,args),'paid');assert.equal(await call(db,fulfil,args),'already_paid');
 eq(await stock(db,'fixture-staging-cap'),int(before)-1);
 // The paid procedure is exercised directly with sandbox-shaped identifiers, never a Stripe API call.
 result(label,{paidOnce:true,unpaidUntouched:true,postage:399,freeThreshold:5000,stripeNetwork:false});
}
async function runA(db){
 await checkout(db,'STAGING-CAP','68a00000-0000-4000-8000-000000000004');
 const before=await call(db,`select jsonb_agg(to_jsonb(o) order by id) from public.orders o`);
 for(const m of reviewed('releaseA')){try{await db.exec(m.raw.toString());}catch(e){console.error('Release A member',m.file,e.code,e.message);throw e;}}
 assert.deepEqual(await call(db,`select jsonb_agg(to_jsonb(o) order by id) from public.orders o`),before);
 assert.equal(await call(db,'select mode from overseer_aftercare.control where id'),'off');
 assert.equal(await call(db,"select public.get_site_operations()#>>'{store,state}'"),'OPEN');
 assert.equal(await call(db,"select has_function_privilege('anon','public.overseer_correct_order_date(uuid,timestamptz,date,text,uuid)','EXECUTE')"),false);
 const beforeCost=await call(db,'select public.command63_finance_basis(o) from public.orders o where id='+literal(oldEbay));
 const version=(await one(db,'select updated_at::text from public.orders where id=$1',[oldEbay])).updated_at;
 const args=[oldEbay,version,'2026-09-30','Synthetic recorded correction',crypto.randomUUID()];
 const correct='select public.overseer_correct_order_date($1,$2,$3,$4,$5)';
 await claims(db,'authenticated',buyer);await assert.rejects(call(db,correct,args),e=>code(e)==='42501');
 await claims(db,'authenticated',admin);
 assert.equal((await call(db,correct,args)).orderDate,'2026-09-30');assert.equal((await call(db,correct,args)).duplicate,true);
 let stale=[...args];stale[2]='2026-09-29';stale[4]=crypto.randomUUID();
 await assert.rejects(call(db,correct,stale),e=>code(e)==='40001');
 await db.exec('reset role');
 assert.equal(await call(db,'select public.command63_finance_basis(o) from public.orders o where id='+literal(oldEbay)),beforeCost);
 await db.exec('reset role; update public.orders set order_date=\'2026-10-31\' where id='+literal(oldEbay)+';');
 const staged=execFileSync(process.execPath,[new URL('tests/eclipse68b/staging.mjs',root).pathname],{encoding:'utf8'});
 try{await db.exec(staged);}catch(e){console.error('ECLIPSE',e.code,e.message);throw e;}
 result('release-A-contracts',await one(db,"select md5(pg_get_functiondef('public.create_guest_kit_order(jsonb)'::regprocedure)) checkout, md5(pg_get_functiondef('public.create_external_order(jsonb)'::regprocedure)) external, md5(pg_get_functiondef('public.command63_finance_validate(jsonb,jsonb,text)'::regprocedure)) finance, md5(pg_get_functiondef('public.apply_order_inventory(jsonb)'::regprocedure)) inventory"));
 result('release-A',{exactMembers:4,legacyTariffRetained:true,aftercare:'off',dateAuditAndACL:true,eclipseRevisions:true,fulfilmentLibrary:true});
 await legacy(db,'release-A-legacy');
}
async function concurrentReceiving(db){
 const component='fixture-staging-cap';
 const before=await stock(db,component);
 await claims(db,'authenticated',admin);
 const write=(k,d)=>call(db,"select public.ironclad69_write($1,$2,$3)",[crypto.randomUUID(),k,d]);
 const supplier=await write('supplier',{name:'Synthetic concurrent supplier'});
 const order=await write('purchase',{supplierId:supplier.id,reference:'SYNTHETIC-69B-CONCURRENT',method:'quantity',currency:'GBP',lines:[{componentId:component,quantity:1,unitMinor:400}]});
 await write('purchaseState',{id:order.id,state:'ordered'});
 const [line]=await call(db,"select public.ironclad69_read('purchaseLines',$1)",[{id:order.id}]);
 await db.exec('reset role;');
 const claim="begin; set local role authenticated; select set_config('request.jwt.claim.sub',"+literal(admin)+',true);';
 const receive=reference=>claim+"select public.ironclad69_write(gen_random_uuid(),'receive',"+json({id:order.id,reference,lines:[{lineId:line.id,quantity:1}]})+"); commit;";
 const attempts=await Promise.allSettled(['SYNTH-CONCURRENT-A','SYNTH-CONCURRENT-B'].map(r=>db.parallel(receive(r))));
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1,JSON.stringify(attempts.map(x=>x.reason?.message)));
 assert.match(attempts.find(x=>x.status==='rejected').reason.message,/Receipt exceeds outstanding purchase quantity|Only ordered or partially received purchases can receive|not open for receiving|not receivable|not receiv|Only an outstanding purchase can be received/i);
 eq(await stock(db,component),int(before)+1);
 await claims(db,'authenticated',admin);
 const [received]=await call(db,"select public.ironclad69_read('purchaseLines',$1)",[{id:order.id}]);
 eq(received.received,1);
 await db.exec('reset role;');
 result('native-concurrent-receiving',{writers:2,committed:1,physicalDelta:1,commerce:false});
}
async function runB(db,priorA){
 await db.exec('reset role;');
 const inventory=await call(db,`select jsonb_agg(to_jsonb(i) order by component_id) from public.inventory i`);
 const ledger=await call(db,`select jsonb_build_object('records',(select jsonb_agg(to_jsonb(f) order by order_id) from public.order_financial_records f),'revisions',(select jsonb_agg(to_jsonb(v) order by order_id,revision) from public.order_financial_revisions v))`);
 const atomic=ironcladAtomic();
 if(!priorA){
  // Fault injection changes only the final pre-commit assertion in this disposable database.
  const forced=atomic.toString().replace('IF ironclad69.commerce_enabled() OR','IF true OR ironclad69.commerce_enabled() OR');
  await assert.rejects(db.exec(forced),e=>e.message==='Release B failed effective authority checks');
  await db.exec('rollback');
  assert.equal(await call(db,"select to_regnamespace('ironclad69') is null and to_regprocedure('public.ironclad69_write(uuid,text,jsonb)') is null"),true);
  assert.deepEqual(await call(db,"select jsonb_agg(to_jsonb(i) order by component_id) from public.inventory i"),inventory);
  result('release-B-atomic-fault',{noWorkspaceSchemaOrRpc:true,inventoryUntouched:true});
 }
 try{await db.exec(atomic.toString());}catch(e){console.error('Release B install',e.code,e.message,e.detail);throw e;}
 assert.equal(await call(db,"select to_regnamespace('commerce67') is null"),true);
 assert.equal(await call(db,"select ironclad69.commerce_enabled()"),false);
 eq(await call(db,"select ironclad69.reservations('fixture-staging-cap')"),0);
 assert.deepEqual(await call(db,`select jsonb_agg(to_jsonb(i) order by component_id) from public.inventory i`),inventory);
 await claims(db,'authenticated',admin);
 await call(db,"select public.ironclad69_write($1,'threshold',$2)",[crypto.randomUUID(),{componentId:'fixture-staging-cap',low:3,target:20}]);
 await db.exec('reset role');
 eq(await call(db,"select sum(remaining) from ironclad69.batches where component_id='fixture-staging-cap'"),int(await stock(db,'fixture-staging-cap')));
 assert.equal(await call(db,"select cost_minor from ironclad69.batches where component_id='fixture-staging-cap' and origin='opening'"),null);
 // Accepted staging assertions adapted only to the intentionally absent schema.
 let sql=read('tests/ironclad69/staging.sql').replace(/exists\(select from commerce67\.control where enabled\)/g,'ironclad69.commerce_enabled()');
 try{await db.exec(sql);}catch(e){console.error('Inventory',e.code,e.message,e.where);throw e;}
 for(const f of ['staging-legacy.sql','staging-forge.sql']){
  sql=read('tests/ironclad69/'+f).replace(/exists\(select from commerce67\.control where enabled\)/g,'ironclad69.commerce_enabled()');
  try{await db.exec(sql);}catch(e){console.error(f,e.code,e.message,e.where);throw e;}
 }
 assert.deepEqual(await call(db,`select jsonb_build_object('records',(select jsonb_agg(to_jsonb(f) order by order_id) from public.order_financial_records f),'revisions',(select jsonb_agg(to_jsonb(v) order by order_id,revision) from public.order_financial_revisions v))`),ledger);
 await legacy(db,'release-B-website-legacy');
 if(native&&!priorA)await concurrentReceiving(db);
 await db.exec('begin; create schema commerce67;');
 try{
  // Presence without the expected managed relations is an error, never an implicit zero.
  await assert.rejects(call(db,'select ironclad69.commerce_enabled()'),e=>code(e)==='42P01');
  await db.exec('rollback; begin; create schema commerce67;create table commerce67.control(enabled boolean);insert into commerce67.control values (false);create table commerce67.holds(component_id text,quantity bigint);insert into commerce67.holds values (\'fixture-staging-cap\',3);');
  assert.equal(await call(db,'select ironclad69.commerce_enabled()'),false);
  eq(await call(db,'select ironclad69.reservations(\'fixture-staging-cap\')'),3);
  await db.exec('update commerce67.control set enabled=true');
  assert.equal(await call(db,'select ironclad69.commerce_enabled()'),true);
 }finally{await db.exec('rollback');}
 result('release-B'+(priorA?'-after-A':'-independent'),{packageSha:hash(atomic),fourExactMembers:true,existingStockUntouched:true,openingUnknown:true,receiptIdempotency:true,stocktakeStaleness:true,unchangedLedger:true,quickAtomic:true,commerceModes:['absent','inactive/with holds','drift fails closed']});
}
for(const scenario of ['a','b','stack']){
 const db=await start(scenario);
 try{if(scenario!=='b')await runA(db);if(scenario!=='a')await runB(db,scenario==='stack');}catch(e){console.error({scenario,error:e.message,code:e.code,at:e.where,query:e.query?.slice(0,180),detail:e.detail});process.exitCode=1;break;}finally{await db.close();}
}
console.log(JSON.stringify({result:process.exitCode?'FAIL':'PASS',engine:native?'native':'pglite',groups:results}));
