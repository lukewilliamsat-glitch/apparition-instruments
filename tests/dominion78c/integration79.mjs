import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { marketplaceWalkthrough } from './reconciliation-fixture79.mjs';

const r=createRequire(import.meta.url);
const {Pool}=r(process.env.DOMINION_PG_MODULE);
const base=resolve(process.env.DOMINION_ACCEPTED_ROOT);
const here=new URL('./',import.meta.url);
const raw=f=>readFile(resolve(base,f),'utf8');
const digest=s=>createHash('sha256').update(s).digest('hex');
const pool=new Pool({host:'127.0.0.1',port:55478,user:'postgres',database:'dominion79_fixture',max:5,connectionTimeoutMillis:3500,statement_timeout:8000});
const query=(sql,args)=>pool.query(sql,args);
const out=async(sql,args)=>Object.values((await query(sql,args)).rows[0]??{})[0];
const as=async(role,actor,op)=>{
 const c=await pool.connect();
 try{
  await c.query('begin');
  await c.query(role==='service_role'?'set local role service_role':'set local role authenticated');
  if(actor)await c.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
  const v=await op(async(sql,args)=>Object.values((await c.query(sql,args)).rows[0]??{})[0]);
  await c.query('commit');
  return v;
 }catch(e){await c.query('rollback');throw e;}finally{c.release();}
};
const admin=randomUUID(),buyer=randomUUID();
const numberHex=()=>randomUUID().replaceAll('-','');
const write=(k,body,key=randomUUID())=>as('authenticated',admin,q=>q('select public.ironclad69_write($1,$2,$3)',[key,k,body]));
const read=(k,body)=>as('authenticated',admin,q=>q('select public.ironclad69_read($1,$2)',[k,body]));
const stock=id=>out('select quantity::int from public.inventory where component_id=$1',[id]);
const expiry=()=>new Date(Date.now()+3600000).toISOString();
const reserve=(o,owner,until)=>as('service_role',null,q=>q('select dominion79.reserve($1,$2,$3)',[o.id,owner,until]));
const release=(o,why,session=o.session)=>as('service_role',null,q=>q('select dominion79.release_verified($1,$2,$3)',[o.id,session,why]));
const pay=(o,event=o.event,amount=o.totalPence)=>as('service_role',null,q=>q('select dominion79.consume($1,$2,$3,$4,$5,$6,$7,$8)',[o.id,'fixture-stripe',event,o.reference,o.session,o.intent,amount,'gbp']));
const directItem=(id,quantity=1,snapshot={})=>({type:'component',productId:id,quantity,snapshot});
const assemblyItem=(entries,quantity=1)=>({type:'assembly',quantity,snapshot:{stockRequirements:entries}});
const kitItem=(entries,quantity=1)=>({type:'kit',quantity,snapshot:{stockRequirements:entries}});
const part=(componentId,quantity)=>({componentId,quantity});
const refs=o=>({...o,session:'cs_live_'+numberHex(),event:'evt_'+numberHex(),intent:'pi_'+numberHex()});
async function syntheticOrder(items){
 const id=randomUUID(),o=refs({id,reference:'AI-'+String(++sequence),totalPence:750});
 await query(`insert into public.orders(id,request_id,request_hash,reference,sales_channel,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,payment_status,stripe_checkout_session_id)
 values($1,$1,repeat('a',32),$2,'WEBSITE',750,0,750,'{}','{"country":"GB"}',$3,'unpaid',$4)`,[id,o.reference,JSON.stringify(items),o.session]);
 return o;
}
let sequence=790000;
const legacyQuote=sku=>as('service_role',null,q=>q('select public.create_guest_kit_order($1)',[{requestId:randomUUID(),items:[{product:'component',sku,quantity:1}],checkoutMode:'stripe',deliveryMethod:'standard'}]));
const legacyPay=o=>as('service_role',null,q=>q("select public.fulfil_paid_stripe_checkout($1,'checkout.session.completed',$2,$3,$4,$5,$6,'gbp')",[o.event,o.id,o.reference,o.session,o.intent,o.totalPence]));

async function setup(){
 assert.match(await out("select current_setting('server_version')"),/^17\.6\b/);
 assert.equal(await out('select current_database()'),'dominion79_fixture');
 await query(await raw('tests/release69b/production-contract.sql'));
 const manifest=JSON.parse(await raw('tests/release69b/manifest.json'));
 for(const [name,hash] of manifest.releaseA){
  const s=await raw('supabase/migrations/'+name);assert.equal(digest(s),hash);await query(s);
 }
 const b=await raw('docs/operations/release69b/ironclad69b-production.atomic.sql');
 assert.equal(digest(b),'04ec507549545b31946aaef827e54201a8fec15c806f10f0fd217ea22fe49c90');await query(b);
 const c=await readFile(resolve(process.env.DOMINION_C_SQL),'utf8');
 assert.equal(digest(c),'f73d9b68df1eb8bd4a251d29ec58df1941132a4549d80c79e1790260fd9ea6be');await query(c);
 await query(await readFile(new URL('unity79.sql',here),'utf8'));
 await query(await readFile(new URL('quartermaster79.sql',here),'utf8'));
 await query(`insert into auth.users(id,email,email_confirmed_at) values ($1,'fixture79-admin@example.invalid',now()),($2,'fixture79-buyer@example.invalid',now())`,[admin,buyer]);
 await query('insert into public.admin_members(user_id) values ($1)',[admin]);
 await query(`insert into public.site_operations(id,desired_state) values(true,'OPEN');
 insert into public.commerce_shipping(country,standard_delivery_pence,free_delivery_threshold_pence) values('GB',399,5000);
 insert into public.components(id,sku,name,category,active,individually,sale_price) values
 ('fixture79-cap','F79-CAP','Synthetic capacitor','capacitors',true,true,750),
 ('fixture79-res','F79-RES','Synthetic resistor','resistors',true,true,750),
 ('fixture79-pot','F79-POT','Synthetic measured pot','potentiometers',false,false,750),
 ('fixture79-race','F79-RACE','Synthetic race part','capacitors',true,true,750);
 insert into public.inventory(component_id,quantity) values ('fixture79-cap',0),('fixture79-res',4),('fixture79-pot',0),('fixture79-race',1);
 insert into quartermaster79.material(sku,title,reorder_at,inner_mm,outer_mm,tare_grams) values 
 ('F79-LABEL','Synthetic mailer',1,array[195,145,15],array[200,150,18],12);`);
}
try{
 await setup();
 // Scenario C: the actual Admin procurement RPC receives stock and creates a real IRONCLAD batch.
 const supplier=(await write('supplier',{name:'Fixture supplier 79',currency:'GBP'})).id;
 const receive=(componentId,quantity,unitMinor,reference,key=randomUUID())=>write('quickPurchase',{
  supplierId:supplier,currency:'GBP',reference,date:'2026-11-19',method:'quantity',
  lines:[{componentId,quantity,unitMinor}],charges:{freight:40}
 },key);
 const note=randomUUID(),q1=await receive('fixture79-cap',6,110,'F79-RECEIVE-C',note),q2=await receive('fixture79-cap',6,110,'F79-RECEIVE-C',note);
 assert.equal(q1.batches[0].batchId,q2.batches[0].batchId);
 assert.equal(await stock('fixture79-cap'),6);
 assert.equal((await read('inventory',{componentId:'fixture79-cap'}))[0].available,6);
 assert.equal(q1.batches[0].costMinor,700);
 const purchase=randomUUID();
 assert.equal(await as('service_role',null,q=>q('select quartermaster79.receive($1,$2,$3,$4,$5,$6)',[purchase,'F79-LABEL',supplier,'F79-PACKAGING',2,101])),true);
 assert.equal(await as('service_role',null,q=>q('select quartermaster79.receive($1,$2,$3,$4,$5,$6)',[purchase,'F79-LABEL',supplier,'F79-PACKAGING',2,101])),false);

 // A/E/F: one saved configured physical BOM is consumed by the unchanged real legacy paid RPC.
 const configured=await syntheticOrder([kitItem([part('fixture79-cap',2),part('fixture79-res',1)],2),assemblyItem([part('fixture79-cap',1)]),directItem('fixture79-res')]);
 const deadlines=expiry();
 assert.equal(await reserve(configured,'fixture-purchaser',deadlines),'held');
 assert.equal(await reserve(configured,'fixture-purchaser',deadlines),'held');
 await assert.rejects(reserve(configured,'wrong-owner',deadlines),/differs/);
 assert.equal(await stock('fixture79-cap'),6);
 await assert.rejects(query("update public.inventory set quantity=1 where component_id='fixture79-cap'"),/reserved or protected/);
 await assert.rejects(pay(configured,configured.event,1),/does not match/);
 assert.equal(await stock('fixture79-cap'),6);
 assert.equal(await out('select count(*)::int from dominion79.provider_events'),0);
 const first=await Promise.all([pay(configured),pay(configured,'evt_'+numberHex())]);
 assert.deepEqual(first.sort(),['duplicate','paid']);
 assert.equal(await pay(configured),'duplicate');
 assert.equal(await stock('fixture79-cap'),1);
 assert.equal(await stock('fixture79-res'),1);
 const trace=await out("select batches from dominion79.provenance where order_id=$1 and component_id='fixture79-cap'",[configured.id]);
 assert.deepEqual(trace,[{batch:q1.batches[0].batchId,quantity:5,basis:'estimated-batch',batchCostMinor:700,batchUnits:6}]);
 assert.equal(await out("select count(*)::int from ironclad69.movements where component_id='fixture79-cap' and delta=-5"),1);
 // Packaging reservations are distinct from saleable stock; physical packing integrates into existing order.
 const pick={'fixture79-cap':5,'fixture79-res':3}, pack=randomUUID();
 await assert.rejects(as('service_role',null,q=>q('select quartermaster79.reserve($1,$2,$3,$4)',[configured.id,pack,'F79-LABEL',{'fixture79-cap':4}])),/complete saved/);
 assert.equal(await as('service_role',null,q=>q('select quartermaster79.reserve($1,$2,$3,$4)',[configured.id,pack,'F79-LABEL',pick])),'reserved');
 const packSql='select quartermaster79.complete($1,$2,$3,$4,$5,$6,$7,$8)';
 const packArgs=[configured.id,pack,purchase,[200,150,18],113,'large-letter','SYNTHETIC-79',115];
 assert.deepEqual(await Promise.all(Array.from({length:2},()=>as('service_role',null,q=>q(packSql,packArgs)))),['packed','packed']);
 assert.equal(await out("select count(*)::int from quartermaster79.movement where kind='packed'"),1);
 const cost=await as('service_role',null,q=>q('select quartermaster79.cost_evidence($1)',[configured.id]));
 assert.equal(cost.packagingActualMinor,50);assert.equal(cost.postageEstimatedMinor,115);assert.equal(cost.postageActualMinor,null);assert.equal(cost.dispatched,false);
 assert.equal(await out('select status from public.orders where id=$1',[configured.id]),'pending');
 assert.deepEqual(await as('service_role',null,q=>q("select quartermaster79.ready_stock('F79-LABEL')")),{sku:'F79-LABEL',physical:1,available:1,reorder:true});
 console.log('PASS A/C/F: exact A+B+C, actual IRONCLAD procurement, saved configured BOM, real legacy paid procedure, duplicate payment and packing, traceable batch estimates and no dispatch');

 const [competitor1,competitor2]=await Promise.all(Array.from({length:2},()=>syntheticOrder([directItem('fixture79-race')])));
 const raced=await Promise.allSettled([reserve(competitor1,'race-a',expiry()),reserve(competitor2,'race-b',expiry())]);
 assert.equal(raced.filter(x=>x.status==='fulfilled').length,1);
 const held=raced[0].status==='fulfilled'?competitor1:competitor2, other=held===competitor1?competitor2:competitor1;
 await assert.rejects(release(held,'expired-unpaid'),/not due/);
 await assert.rejects(release(held,'cancelled-unpaid',other.session),/Verified attached/);
 await assert.rejects(release(held,'browser-abandoned'),/Verified attached/);
 assert.equal(await release(held,'cancelled-unpaid'),'released');
 await assert.rejects(pay(held),/no longer usable/);
 assert.equal(await reserve(other,'recovered',expiry()),'held');
 assert.equal(await stock('fixture79-race'),1);
 const legacy=refs(await legacyQuote('F79-RACE'));
 await query('update public.orders set stripe_checkout_session_id=$1 where id=$2',[legacy.session,legacy.id]);
 await assert.rejects(legacyPay(legacy),/reserved or protected/);
 assert.equal(await release(other,'cancelled-unpaid'),'released');
 assert.equal(await legacyPay(legacy),'paid');
 assert.equal(await legacyPay(legacy),'already_paid');
 assert.equal(await stock('fixture79-race'),0);
 assert.equal(legacy.totalPence,1149);
 console.log('PASS E/F: concurrent holds, false cancellation/late payment refusal, original checkout and postage, legacy writer protection and fallback');

 // D: actual bench measurement, allocation, guarded pick and legacy retirement of the exact reserved physical units.
 const pots=(await receive('fixture79-pot',3,300,'F79-MEASURED')).batches[0];
 await write('measure',{batchId:pots.batchId,nominalOhm:500000,taper:'A',shaft:'short split',units:[{slot:1,ohm:498700},{slot:2,ohm:499200},{slot:3,ohm:510000,quality:'quarantine'}]});
 const units=(await read('measurements',{batchId:pots.batchId})).filter(x=>x.slot<=2).map(x=>x.id).sort();
 const set=(await write('allocate',{componentId:'fixture79-pot',toleranceBp:100,unitIds:units})).id;
 const selected=await syntheticOrder([directItem('fixture79-pot',2,{dominionSetId:set})]);
 await reserve(selected,'measured-buyer',expiry());
 await assert.rejects(write('release',{id:set,reason:'Fixture reserved set guard'}),/reserved order/);
 await assert.rejects(reserve(await syntheticOrder([directItem('fixture79-pot')]),'generic-buyer',expiry()),/Insufficient/);
 assert.equal(await pay(selected),'paid');
 assert.equal(await stock('fixture79-pot'),1);
 assert.deepEqual(await out('select measured_units from dominion79.provenance where order_id=$1',[selected.id]),units);
 assert.equal((await read('inventory',{componentId:'fixture79-pot'}))[0].available,0);

 // B/F: read-only provider evidence joins an actual existing synthetic external Orders record.
 const external=randomUUID(), previousStock=await stock('fixture79-cap');
 await query(`insert into public.orders(id,request_id,request_hash,sales_channel,external_reference,order_date,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,payment_status,paid_at,fulfillment_applied_at)
 values($1,$1,repeat('b',32),'EBAY','F79-EBAY-PAID',date '2026-11-19',1000,150,1150,'{}','{}',$2,'paid',now(),now())`,[external,JSON.stringify([directItem('fixture79-cap',2)])]);
 const market=await marketplaceWalkthrough(query);
 assert.equal(market.orders.length,1);assert.equal(market.orders[0].existingOrderId,external);assert.equal(market.orders[0].stockMutation,false);
 assert.equal(market.finance.length,2);assert.ok(market.finance.every(x=>x.manualOrderId===external));
 assert.equal(market.review[0].kind,'unmapped-listing');assert.equal(await stock('fixture79-cap'),previousStock);
 assert.equal(await out("select count(*)::int from public.orders where external_reference='F79-EBAY-PAID'"),1);
 console.log('PASS B/F: eBay read-only import matched an existing external Orders record; fee and refund evidence deduplicated, no stock or additional orders');

 // An authorised role still cannot directly use experimental database routines or see their evidence.
 await assert.rejects(as('authenticated',buyer,q=>q("select quartermaster79.ready_stock('F79-LABEL')")),e=>e.code==='42501');
 await assert.rejects(as('authenticated',admin,q=>q('select dominion79.reserve($1,$2,$3)',[held.id,'admin-not-service',expiry()])),e=>e.code==='42501');
 await assert.rejects(as('service_role',null,q=>q('select * from dominion79.holds limit 1')),e=>e.code==='42501');
 assert.equal(await out('select count(*)::int from public.order_financial_revisions'),0);
 console.log('PASS D and permissions: exact measured set consumption, quality hold preserved, denied client access, no Financial revisions');
}finally{await pool.end();}
