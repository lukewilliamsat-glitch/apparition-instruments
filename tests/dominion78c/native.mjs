import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {requirements} from './contracts.mjs';
import {processVerifiedEvent} from './commerce.mjs';
const {Pool}=createRequire(import.meta.url)(process.env.DOMINION_PG_MODULE);
const pool=new Pool({host:'127.0.0.1',port:55478, database:'dominion78c_fixture', user:'postgres'});
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const now='2026-11-20T10:00:00Z',until='2026-11-20T10:10:00Z';
const item=(productId,quantity)=>({type:'component',productId,quantity});
const kit=(quantity, stockRequirements)=>({type:'kit',quantity,snapshot:{stockRequirements}});
const one=async(q,p)=>(await pool.query(q,p)).rows[0];
const order=async(n,a)=>pool.query('insert into dominion78c.saved_orders values ($1,$2)',[uuid(n),JSON.stringify(a)]);
const hold=(n,a=now,b=until)=>one('select dominion78c.reserve($1,$2,$3) as state',[uuid(n),a,b]);
const resolve=(n,k,action,at=now)=>one('select dominion78c.resolve($1,$2,$3,$4) as state',[uuid(n),uuid(k),action,at]);
const stocks=async()=>Object.fromEntries((await pool.query('select component_id,quantity from public.inventory order by component_id')).rows.map(x=>[x.component_id,Number(x.quantity)]));
try{
 const version=await one("select current_setting('server_version') version,current_database() db");
 assert.match(version.version,/^17\.6(?:\D|$)/);assert.equal(version.db,'dominion78c_fixture');
 await pool.query(await readFile(new URL('./unity.fixture.sql',import.meta.url),'utf8'));
 await pool.query("insert into public.inventory values ('cap',10),('pot',8),('short',1),('jack',4); insert into dominion78c.restrictions values ('pot',1,1)");
 const items=[kit(2,[{componentId:'cap',quantity:1},{componentId:'pot',quantity:2}]),item('cap',2)];
 const native=(await one('select dominion78c.requirements($1::jsonb) as p',[JSON.stringify(items)])).p;
 assert.deepEqual(native,Object.fromEntries(requirements(items).map(l=>[l.componentId,l.quantity])));
 assert.equal(native.pot,4); assert.equal(native.cap,4);
 await assert.rejects(one("select dominion78c.requirements('[{\"type\":\"kit\",\"quantity\":1}]'::jsonb)"),/Missing saved BOM/);
 await order(1,items);await order(2,[item('pot',4)]);
 const race=await Promise.allSettled([hold(1),hold(2)]);
 assert.equal(race.filter(a=>a.status==='fulfilled').length,1);
 assert.equal(race.filter(a=>a.status==='rejected')[0].reason.code,'23514');
 const winner=race[0].status==='fulfilled'?1:2;
 assert.equal((await hold(winner)).state,'active');
 await assert.rejects(hold(winner,now,'2026-11-20T10:11:00Z'),/Conflicting reservation replay/);
 assert.deepEqual(await stocks(),{cap:10,jack:4,pot:8,short:1});
 const pay=await Promise.all([resolve(winner,50,'consume'),resolve(winner,50,'consume')]);
 assert.deepEqual(pay.map(x=>x.state),['consumed','consumed']);
 assert.equal((await stocks()).pot,4);
 assert.equal((await stocks()).cap,winner===1?6:10);
 await assert.rejects(resolve(winner,50,'release'),/Conflicting disposition replay/);
 await assert.rejects(resolve(winner,51,'consume'),/not active/);
 // A failure on the last sorted requirement must leave earlier stock and hold unchanged.
 await order(3,[item('jack',2),item('short',1)]);await hold(3);
 await pool.query("update public.inventory set quantity=0 where component_id='short'");
 await assert.rejects(resolve(3,51,'consume'),/reconciliation/);
 assert.equal((await stocks()).jack,4);
 assert.equal((await one('select state from dominion78c.holds where order_id=$1',[uuid(3)])).state,'active');
 await order(4,[item('jack',1)]);await hold(4);
 await assert.rejects(resolve(4,52,'expire'),/has not expired/);
 await assert.rejects(resolve(4,52,'consume',until),/expiry/);
 assert.equal((await resolve(4,52,'expire',until)).state,'expired');
 assert.equal((await resolve(3,53,'release')).state,'released');
 assert.equal((await stocks()).jack,4);
 // Transactional fixture adapter: real order lock, replay ledger, and Unity stock in one commit.
 await pool.query(`create table dominion78c.commerce_fixture(order_id uuid primary key, state jsonb not null);
  create table dominion78c.event_fixture(event_key text primary key, order_id uuid not null references dominion78c.commerce_fixture, plan jsonb not null)`);
 const o=uuid(5);
 const document={id:o,state:'awaiting',paymentAccount:'sandbox-fixture',paymentReference:'checkout5',expectedMinor:1030,currency:'GBP',savedItems:[item('jack',2)]};
 await order(5,document.savedItems);await hold(5);
 await pool.query('insert into dominion78c.commerce_fixture values ($1,$2)',[o,JSON.stringify(document)]);
 const e={verified:true,id:uuid(55),transactionId:'payment5',type:'payment',account:'sandbox-fixture',reference:'checkout5',orderId:o,occurredAt:now,money:{minor:1030,currency:'GBP'}};
 let failRecord=false;
 const invoke=envelope=>processVerifiedEvent({envelope,verifyEnvelope:async value=>value,now:()=>now,withOrderTransaction:async(id,run)=>{
  const c=await pool.connect();
  try{
   await c.query('begin');
   const document=(await c.query('select state from dominion78c.commerce_fixture where order_id=$1 for update',[id])).rows[0]?.state;
   if(!document)throw Error('Unknown fixture order');
   const map=new Map((await c.query('select event_key,plan from dominion78c.event_fixture where order_id=$1',[id])).rows.map(x=>[x.event_key,x.plan]));
   const result=await run({savedOrder:()=>document,replaySnapshot:map,consumeReservation:async req=>{
      assert.deepEqual(req,requirements(document.savedItems));
      await c.query("select dominion78c.resolve($1,$2,'consume',$3)",[id,envelope.id,now]);
    },releaseReservation:()=>c.query("select dominion78c.resolve($1,$2,'release',$3)",[id,envelope.id,now]),record:async plan=>{
      if(failRecord)throw Error('Simulated evidence write failure');
      for(const k of [plan.eventKey,plan.transactionKey].filter(Boolean))await c.query('insert into dominion78c.event_fixture values ($1,$2,$3)',[k,id,JSON.stringify(plan)]);
      if(plan.after)await c.query('update dominion78c.commerce_fixture set state=state||$2::jsonb where order_id=$1',[id,JSON.stringify(plan.after)]);
    }});
   await c.query('commit');return result;
  }catch(error){await c.query('rollback');throw error;}finally{c.release();}
 }});
 failRecord=true;
 await assert.rejects(invoke(e),/evidence write failure/);
 assert.equal((await stocks()).jack,4);
 assert.equal((await one('select state from dominion78c.holds where order_id=$1',[o])).state,'active');
 failRecord=false;
 const payments=await Promise.all([invoke(e),invoke({...e,id:uuid(56)}),invoke(e)]);
 assert.deepEqual(payments.map(x=>x.result).sort(),['duplicate-event','duplicate-transaction','paid']);
 assert.equal((await stocks()).jack,2);
 await invoke({...e,id:uuid(57),transactionId:'refund5',type:'refund',money:{minor:200,currency:'GBP'}});
 assert.equal((await stocks()).jack,2);
 assert.equal((await one('select state from dominion78c.commerce_fixture where order_id=$1',[o])).state.refundedMinor,200);
 console.log('PASS PostgreSQL 17.6: native order/stock/evidence transaction rolls back together; duplicate payment consumes once and refund does not restock');
 console.log('PASS PostgreSQL 17.6: saved BOM parity, measurement/allocations limits, concurrent holds, idempotent deduction, atomic failure, expiry, release and late-payment refusal');
}finally{await pool.end();}
