import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {finance} from './fixture.mjs';
import {reviewed,ironcladAtomic} from '../release69b/assemble.mjs';

const read=f=>readFileSync(new URL('../../'+f,import.meta.url),'utf8');
const native=process.env.LEVIATHAN74_NATIVE==='true';
const admin='68a00000-0000-4000-8000-000000000001', customer='68a00000-0000-4000-8000-000000000002';
const purchase='68a00000-0000-4000-8000-000000000003', reimbursement='68a00000-0000-4000-8000-000000000004';
const order='68a00000-0000-4000-8000-000000000005';
const anonymous='RESET ROLE; SET ROLE anon; SELECT set_config(\'request.jwt.claim.sub\',\'\',false);';
const claims=uid=>"RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','"+uid+"',false);";
const label=n=>console.log('PASS '+n);
let db,parallel;
if(native){
 const {Pool}=createRequire(import.meta.url)(process.env.LEVIATHAN74_PG_MODULE);
 const pool=new Pool({host:'127.0.0.1',port:55474,user:'postgres',database:'postgres',max:5,connectionTimeoutMillis:5000});
 const c=await pool.connect();
 parallel=async s=>{const cc=await pool.connect();try{return await cc.query(s);}catch(err){await cc.query('rollback');throw err;}finally{cc.release();}};
 db={exec:s=>c.query(s),query:(s,args)=>c.query(s,args),close:async()=>{c.release();await pool.end();}};
}else{
 const x=pathToFileURL(resolve(process.env.LEVIATHAN74_PGLITE||'node_modules/@electric-sql/pglite/dist')+'/');
 const {PGlite}=await import(new URL('index.js',x)),{pgcrypto}=await import(new URL('contrib/pgcrypto.js',x));
 db=new PGlite({extensions:{pgcrypto}});
}
const sql=(s,a)=>db.query(s,a), first=async(s,a)=>Object.values((await sql(s,a)).rows[0])[0];
const getOrders=(from='2026-06-01',to='2026-08-01',day=null,cursor=null)=>first('select public.omniscience74_orders($1,$2,$3,$4)',[from,to,day,cursor]);
const getOutlays=()=>first("select public.omniscience74_outlays('2026-06-01','2026-08-01')");
const stockValue={currency:'USD',date:'2026-06-13',original:10000,gbp:7800,vendor:'Synthetic supplier',category:'Components',purpose:'Catalogue stock acquisition',funding:'director',treatment:'recorded-elsewhere',evidence:'synthetic-stock-receipt',link:'synthetic-procurement-24',recurring:false,notes:''};
const outlay=(id,payload)=>first('select public.omniscience74_record_outlay($1,$2)',[id,payload]);
const reimburse=(id,minor,evidence='fixture-repay-1')=>first("select public.omniscience74_reimburse($1,$2,'2026-06-14',$3,$4)",[id,purchase,minor,evidence]);
try{
 await db.exec(read('tests/release69b/production-contract.sql'));
 const version=await first("select current_setting('server_version')");
 if(native)assert.match(version,/^17\.6(?:\D|$)/);
 console.log('Production-shaped PostgreSQL:',version);
 await db.exec(`
  insert into auth.users(id,email,email_confirmed_at) values ('${admin}','admin@example.invalid',now()),('${customer}','customer@example.invalid',now());
  insert into public.admin_members(user_id) values ('${admin}');
  insert into public.orders(id,request_id,request_hash,sales_channel,external_reference,order_date,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,payment_status,paid_at,fulfillment_applied_at,created_at)
  values ('${order}','${order}',repeat('a',32),'EBAY','SYNTHETIC-FIN74','2026-06-13',750,399,1149,'{"email":"must-not-return@example.invalid"}','{"address":"must-not-return"}',
  '[{"type":"component","name":"Workshop capacitor","productId":"fixture-cap","sku":"CAP","quantity":1,"unitPrice":750,"lineTotal":750,"currency":"GBP"}]','paid',now(),now(),'2026-06-16T09:00:00Z');
  insert into public.orders(request_id,request_hash,sales_channel,created_at,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,payment_status,paid_at)
  select gen_random_uuid(),repeat('b',32),'WEBSITE','2026-06-13T10:00:00Z',500,0,500,'{}','{}','[{"type":"component","name":"Synthetic resistor","productId":"fixture-r","sku":"R","quantity":1,"unitPrice":500,"lineTotal":500,"currency":"GBP"}]','paid','2026-06-13T23:40:00Z'
  from generate_series(1,11);
  insert into public.orders(request_id,request_hash,sales_channel,created_at,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,payment_status)
  values (gen_random_uuid(),repeat('c',32),'WEBSITE','2026-06-13T10:00:00Z',500,0,500,'{}','{}','[{"type":"component","name":"Synthetic resistor","productId":"fixture-r","sku":"R","quantity":1,"unitPrice":500,"lineTotal":500,"currency":"GBP"}]','unpaid');
 `);
 if(process.env.LEVIATHAN74_STACK==='true'){
  await db.exec("insert into public.commerce_shipping(country,standard_delivery_pence,free_delivery_threshold_pence) values('GB',399,5000);");
  for(const member of reviewed('releaseA'))await db.exec(member.raw.toString());
  await db.exec(ironcladAtomic().toString());
  label('Verified A and B installed before the independent reporting migration');
 }
 const snapshot=await first("select md5(string_agg(to_jsonb(o)::text,'' order by id)) from public.orders o");
 await db.exec(read('supabase/migrations/20261117162718_omniscience74_v1.sql'));
 await db.exec(anonymous);await assert.rejects(getOrders(),e=>e.code==='42501');
 await db.exec(claims(customer));
 await assert.rejects(getOrders(),e=>e.code==='42501');await assert.rejects(outlay(purchase,stockValue),e=>e.code==='42501');
 await assert.rejects(sql('select * from omniscience74.outlays'),e=>e.code==='42501');
 await db.exec(claims(admin));
 await assert.rejects(getOrders('2020-01-01','2026-01-02'),e=>e.code==='22023');
 const a=await getOrders(), b=await getOrders('2026-06-01','2026-08-01',a.next.day,a.next.id);
 const both=[...a.rows,...b.rows];
 assert.equal(a.rows.length,10);assert.equal(b.rows.length,2);assert.equal(b.next,null);
 assert.equal(new Set(both.map(r=>r.id)).size,12);
 assert(both.filter(r=>r.channel==='WEBSITE').every(r=>r.day==='2026-06-14'));
 const row=both.find(r=>r.id===order);
 assert.equal(row.day,'2026-06-13');assert.equal(row.finance,null);
 assert(!JSON.stringify(both).includes('must-not-return'));assert.equal(row.items[0].productId,'fixture-cap');
 label('Admin-only reporting, bounded keyset, UK DST, unpaid exclusion, no customer projection');
 await db.exec('reset role');
 const basis=await first("select public.command63_finance_basis(o) from public.orders o where id=$1",[order]);
 await db.exec(claims(admin));
 const saved=await first('select public.command63_financial_save($1,0,$2,$3,$4)',[order,basis,crypto.randomUUID(),finance]);
 assert.equal(saved.outcome,'committed');
 const current=(await getOrders('2026-06-13','2026-06-13')).rows[0];
 assert.equal(current.current,true);assert.equal(current.finance.lines[0].unitCostMicro,1000000);
 label('Reads a real BLACK LEDGER save and evidence fingerprint from the production-shaped contract');
 const record=await outlay(purchase,stockValue);assert.equal(record.duplicate,false);
 assert.equal((await outlay(purchase,stockValue)).duplicate,true);
 await assert.rejects(outlay(purchase,{...stockValue,gbp:7700}),e=>e.code==='23505');
 await assert.rejects(outlay(crypto.randomUUID(),{...stockValue,evidence:'SYNTHETIC-STOCK-RECEIPT'}),e=>e.code==='23505');
 await assert.rejects(outlay(crypto.randomUUID(),{...stockValue,evidence:'bad-ref',link:''}),e=>e.code==='23514');
 await assert.rejects(outlay(crypto.randomUUID(),{...stockValue,evidence:'bad-date',date:'2099-01-01'}),e=>e.code==='22023');
 label('Append-only outlay, duplicate resistance, foreign cost, required external reference');
 assert.equal((await reimburse(reimbursement,3000)).duplicate,false);
 assert.equal((await reimburse(reimbursement,3000)).duplicate,true);
 assert.equal((await getOutlays()).rows[0].reimbursed,3000);
 await assert.rejects(reimburse(crypto.randomUUID(),5000,'over-recorded'),e=>e.code==='23514');
 if(native){
  const withClaim="begin; set local role authenticated; select set_config('request.jwt.claim.sub','"+admin+"',true); ";
  const race=(ref)=>parallel(withClaim+"select public.omniscience74_reimburse(gen_random_uuid(),'"+purchase+"','2026-06-14',4000,'"+ref+"');commit;");
  const attempts=await Promise.allSettled([race('race-a'),race('race-b')]);
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(attempts.find(r=>r.status==='rejected').reason.code,'23514');
  assert.equal((await getOutlays()).rows[0].reimbursed,7000);
 }
 label('Director reimbursement cap, replay and remaining balance'+(native?', two concurrent sessions':''));
 await db.exec('reset role');
 assert.equal(await first("select md5(string_agg(to_jsonb(o)::text,'' order by id)) from public.orders o"),snapshot);
 assert.equal(await first('select count(*)::int from public.order_financial_revisions'),1);
 assert.equal(await first("select has_function_privilege('service_role','public.omniscience74_orders(date,date,date,uuid)','EXECUTE')"),false);
 label('No order or historical finance changes, no service-role access');
}catch(err){console.error(err.message,err.code??'',err.constraint??'',err.where??'');process.exitCode=1;}finally{await db.close();}
