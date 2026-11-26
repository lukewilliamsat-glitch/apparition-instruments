import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
const {Client}=createRequire(import.meta.url)(process.env.PG_ORDERS_MODULE);
const db=new Client({host:'127.0.0.1',port:55494,user:'postgres',database:'postgres'});
const sql=n=>readFile(new URL(n,import.meta.url),'utf8');
const id='00000000-0000-4000-8000-000000000094',actor='00000000-0000-4000-8000-000000000001';
const batch1='00000000-0000-4000-8000-000000000011',batch2='00000000-0000-4000-8000-000000000012';
const items=[{type:'kit',productId:'kit-1',quantity:2,snapshot:{stockRequirements:[{componentId:'cap-1',quantity:2},{componentId:'res-1',quantity:1}]}}];
const scalar=async(q,a)=>(await db.query(q,a)).rows[0].result;
await db.connect();
try{
 await db.query(`create role anon;create role authenticated;create role service_role;
 create schema ironclad69;create table public.components(id text primary key);
 create table public.orders(id uuid primary key,items jsonb,currency text,payment_status text,fulfillment_applied_at timestamptz);
 create table ironclad69.batches(id uuid primary key,component_id text,origin text,quantity bigint,remaining bigint,cost_minor bigint,received_at timestamptz,cost_evidence_date date);
 create table ironclad69.cost_snapshots(id uuid default gen_random_uuid(),order_id uuid,line_index int,component_id text,batch_id uuid,quantity int,batch_total_minor bigint,batch_quantity bigint,line_cost_minor bigint,basis text,evidence text,actor uuid);
 create function ironclad69.actor() returns uuid language plpgsql stable as $$begin if current_setting('request.jwt.claim.sub',true) is distinct from '${actor}' then raise exception 'Admin required' using errcode='42501';end if;return '${actor}';end $$;
 insert into public.components values('cap-1'),('res-1');
 insert into ironclad69.batches values('${batch1}','cap-1','receipt',10,6,101,'2026-11-01',null),('${batch2}','res-1','receipt',10,8,50,'2026-11-01',null);`);
 await db.query(await sql('helpers.baseline.sql'));
 await db.query(await sql('constituents.sql'));
 await db.query('insert into public.orders values($1,$2,\'GBP\',\'paid\',\'2026-11-20\')',[id,JSON.stringify(items)]);
 for(const role of ['anon','service_role','authenticated']){
  await db.query('set role '+role);await assert.rejects(db.query('select public.ironclad69_cost_read($1)',[id]),{code:'42501'});await db.query('reset role');
 }
 await db.query(`set request.jwt.claim.sub='${actor}'`);
 const capture=(comp,batch,quantity,basis='verified_physical_trace')=>scalar('select ironclad69.capture_cost($1,$2) result',[actor,JSON.stringify({orderId:id,lineIndex:0,componentId:comp,batchId:batch,quantity,basis,evidence:'Genuine fixture trace reference'})]);
 await capture('cap-1',batch1,4);
 assert.deepEqual(await scalar('select public.ironclad69_cost_read($1) result',[id]),[],'Incomplete BOM is unresolved');
 await assert.rejects(capture('cap-1',batch1,1),{code:'40001'});
 await capture('res-1',batch2,2);
 await db.query('begin read only;set local role authenticated');
 const rows=await scalar('select public.ironclad69_cost_read($1) result',[id]);
 assert.equal(rows.length,1);assert.equal(rows[0].line_cost_minor,50);assert.equal(rows[0].batch_quantity,2);assert.equal(rows[0].basis,'verified_physical_trace');
 await assert.rejects(db.query('select * from ironclad69.constituent_snapshots'),{code:'42501'});await db.query('rollback');
 await assert.rejects(db.query('update ironclad69.constituent_snapshots set quantity=quantity'),{code:'55000'});
 await db.query('update public.orders set items=$2 where id=$1',[id,JSON.stringify([{...items[0],quantity:1}])]);
 assert.deepEqual(await scalar('select public.ironclad69_cost_read($1) result',[id]),[],'Changed BOM invalidates old trace');
 await db.query('update public.orders set items=$2 where id=$1',[id,JSON.stringify(items)]);
 const traces=[{line_index:0,component_id:'cap-1',batch_id:batch1,quantity:4,batch_total_minor:101,batch_quantity:10,basis:'allocated_batch'},
 {line_index:0,component_id:'res-1',batch_id:batch2,quantity:2,batch_total_minor:50,batch_quantity:10,basis:'verified_physical_trace'}];
 const projected=await scalar('select ironclad69.constituent_projection($1,$2) result',[JSON.stringify(items),JSON.stringify(traces)]);
 assert.equal(projected[0].basis,'allocated_batch','One inferred constituent keeps the complete line estimated');
 await db.query(`create schema dominion79;create table dominion79.provenance(order_id uuid,component_id text,quantity bigint,batches jsonb);create table dominion79.holds(order_id uuid,state text,order_items_hash bytea);`);
 const second='00000000-0000-4000-8000-000000000095';
 await db.query('insert into public.orders select $1,items,currency,payment_status,fulfillment_applied_at from public.orders where id=$2',[second,id]);
 await db.query("insert into dominion79.holds select id,'consumed',sha256(convert_to(items::text,'UTF8')) from public.orders where id=$1",[second]);
 for(const [comp,batch,quantity,cost] of [['cap-1',batch1,4,101],['res-1',batch2,2,50]])await db.query('insert into dominion79.provenance values($1,$2,$3,$4)',[second,comp,quantity,JSON.stringify([{batch,quantity,batchCostMinor:cost,batchUnits:10,basis:'estimated-batch'}])]);
 await db.query('begin read only;set local role authenticated');
 const unity=await scalar('select public.ironclad69_cost_read($1) result',[second]);await db.query('commit');
 assert.equal(unity[0].line_cost_minor,50);assert.equal(unity[0].basis,'allocated_batch','UNITY inferred physical allocation is not silently verified');
 const peer=new Client({host:'127.0.0.1',port:55494,user:'postgres',database:'postgres'});await peer.connect();
 try{
  const race='00000000-0000-4000-8000-000000000096';
  await db.query('insert into public.orders select $1,items,currency,payment_status,fulfillment_applied_at from public.orders where id=$2',[race,id]);
  const body=(componentId,batchId,quantity)=>JSON.stringify({orderId:race,lineIndex:0,componentId,batchId,quantity,basis:'verified_physical_trace',evidence:'Concurrent isolated fixture trace'});
  await Promise.all([db.query('select ironclad69.capture_cost($1,$2)',[actor,body('cap-1',batch1,4)]),peer.query('select ironclad69.capture_cost($1,$2)',[actor,body('res-1',batch2,2)])]);
  assert.equal((await scalar('select public.ironclad69_cost_read($1) result',[race]))[0].line_cost_minor,50);
 }finally{await peer.end();}
 await writeFile(process.argv[2],JSON.stringify(rows));
 console.log('PASS immutable complete-BOM evidence, missing/stale rejection, actual read-only Admin semantics, denied roles and unchanged UNITY estimated basis');
}finally{await db.end();}
