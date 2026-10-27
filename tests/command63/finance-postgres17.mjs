// Native concurrent database acceptance. Only the disposable CI service is permitted.
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import{readFileSync}from'node:fs';
import {emailPreviewDatabase} from '../fixtures/email-preview-database.mjs';import{financeDraft}from'../../dist/admin/orders/finance-ui.mjs';
assert.equal(process.env.COMMAND63_NATIVE_FIXTURE,'1');assert.equal(process.env.PGHOST,'127.0.0.1');assert.equal(process.env.PGDATABASE,'command63_fixture');assert.equal(process.env.PGUSER,'command63_fixture');
const actor='10000000-0000-4000-8000-000000000001',quote=v=>v===null?'NULL':typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'";
const bind=(sql,params)=>sql.replace(/\$(\d+)/g,(_,n)=>quote(params[Number(n)-1]));
function psql(sql){return new Promise((resolve,reject)=>{const c=spawn('psql',['--no-psqlrc','-qAt','--set','ON_ERROR_STOP=1'],{env:process.env,stdio:['pipe','pipe','pipe']});let out='',err='';c.stdout.on('data',b=>{out+=b;if(out.length>1024*1024)c.kill();});c.stderr.on('data',b=>{err+=b;if(err.length>65536)c.kill();});c.once('error',reject);c.once('exit',code=>code===0?resolve(out.trim()):reject(Error(err.slice(-3000))));c.stdin.end("set standard_conforming_strings=on;set request.jwt.claim.sub='"+actor+"';\n"+sql);});}
const db={exec:async sql=>{await psql(sql);},query:async(sql,params=[])=>{const out=await psql('select coalesce(json_agg(r),\'[]\'::json) from ('+bind(sql,params)+')r;');return{rows:JSON.parse(out)};}};
const fixture=await emailPreviewDatabase({database:db});const {one,create}=fixture;
assert.match((await one('select version() as version')).version,/PostgreSQL 17[.]6/);
const sql=readFileSync(new URL('../../supabase/migrations/20261027140000_black_ledger_financial_v1.sql',import.meta.url),'utf8');
await assert.rejects(db.exec('begin;'+sql+'select 1/0;commit;'));assert.equal((await one("select to_regclass('public.order_financial_records') as present")).present,null);
await db.exec('begin;'+sql+'commit;');
const createOrder=()=>create({requestId:crypto.randomUUID(),channel:'EBAY',externalReference:'NATIVE-FIXTURE-'+crypto.randomUUID(),orderDate:'2026-10-27',customerName:'Local fixture only',postagePence:0,items:[{type:'component',productId:'a',quantity:1,unitPricePence:399}]});
const o=await createOrder(),original=(await one('select to_jsonb(o) as row from public.orders o where id=$1',[o.id])).row,stock=(await db.query('select component_id,quantity from public.inventory order by component_id')).rows;
const doc=financeDraft({items:original.items,pricing:{total:399,delivery:0}}),basis=(await one('select public.command63_financial_read($1) as r',[o.id])).r.orderBasisHash;
const save=(id,request,hash=basis)=>one('select public.command63_financial_save($1,0,$2,$3,$4::jsonb) as r',[id,hash,request,JSON.stringify(doc)]);
// Separate psql processes really overlap on the same native PostgreSQL service.
const receipts=await Promise.all(Array.from({length:8},()=>save(o.id,crypto.randomUUID())));assert.equal(receipts.filter(x=>x.r.outcome==='committed').length,1);assert.equal(receipts.filter(x=>x.r.outcome==='conflict').length,7);assert.equal((await one('select count(*)::int as n from public.order_financial_revisions where order_id=$1',[o.id])).n,1);
const second=await createOrder(),secondBasis=(await one('select public.command63_financial_read($1) as r',[second.id])).r.orderBasisHash,req=crypto.randomUUID();
const replays=await Promise.all(Array.from({length:8},()=>save(second.id,req,secondBasis)));assert(replays.every(x=>x.r.outcome==='committed'));assert.equal(replays.filter(x=>x.r.idempotent===false).length,1);assert.equal((await one('select count(*)::int as n from public.order_financial_revisions where order_id=$1',[second.id])).n,1);
assert.deepEqual((await one('select to_jsonb(o) as row from public.orders o where id=$1',[o.id])).row,original);const after=(await db.query('select component_id,quantity from public.inventory order by component_id')).rows;assert.equal(stock[0].quantity-after[0].quantity,1);assert.equal(stock[1].quantity,after[1].quantity);assert.equal((await one('select count(*)::int as n from public.order_email_deliveries')).n,0);
await assert.rejects(db.exec("set role anon;select public.command63_financial_read('"+o.id+"');"));
await assert.rejects(db.exec("set role authenticated;select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',false);select public.command63_financial_read('"+o.id+"');"));
await db.exec('revoke execute on function public.command63_financial_save(uuid,bigint,text,uuid,jsonb) from authenticated;');assert.equal((await one('select count(*)::int as n from public.order_financial_revisions')).n,2);
console.log(JSON.stringify({passed:true,database:(await one('select version() as v')).v,groups:7,concurrentProcessesPerRace:8,stockChanges:'Fixture order creation only; financial saves changed none.',rollback:'Save revoked, both financial records and audit revisions retained.'}));
