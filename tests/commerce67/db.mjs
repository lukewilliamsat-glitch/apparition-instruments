import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const dsn=process.env.COMMERCE67_PG_DSN;
let pool,client;
if(dsn){
 const u=new URL(dsn);
 assert(u.protocol==='postgresql:'&&u.hostname==='127.0.0.1'&&u.port==='55467'&&u.pathname==='/commerce67_local'&&!u.password&&!u.search,'Use only a fresh loopback test cluster');
 const {Pool}=createRequire(import.meta.url)(process.env.COMMERCE67_PG_MODULE||'pg');
 pool=new Pool({connectionString:dsn,max:4});
 client=await pool.connect();
}
const db=client?{exec:s=>client.query(s),query:(s,p)=>client.query(s,p),close:async()=>{client.release();await pool.end();}}:new PGlite();
const read=f=>readFileSync(new URL('../../supabase/migrations/'+f,import.meta.url),'utf8');
const migration='20261116213239_commerce_ascendant.sql';
const admin='10000000-0000-4000-8000-000000000001';
const customer='10000000-0000-4000-8000-000000000002';
await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 alter default privileges in schema public grant all on tables to anon,authenticated;`);
await db.exec(read('20260924131615_p05a_backend_foundation.sql').split('alter table public.admin_members enable')[0]);
await db.exec(read('20260925083000_p07a_guest_orders.sql').split('create function public.create_guest_kit_order')[0]);
await db.exec(read('20260925103000_p07b_checkout_pricing.sql'));
await db.exec(read('20260925150000_p07b2a_paid_order_fulfilment.sql'));
await db.exec(read('20260927162000_p09c_order_ownership.sql'));
await db.exec(read('20260930114021_external_orders_v1.sql').split('create function public.create_external_order')[0]);
await db.exec(read(migration));
const exec=sql=>db.exec(sql);
const one=async(sql,params=[])=>(await db.query(sql,params)).rows[0];
const result=async(sql,params=[])=>(await one(sql,params)).result;
const caps=q=>[{kind:'component',id:'cap1',quantity:q}];
const quote=(items,code=null)=>result('select public.commerce67_quote($1::jsonb,$2) result',[JSON.stringify(items),code]);
const request=(items,q,code=null)=>({requestId:crypto.randomUUID(),items,quoteId:q.quoteId,code});
const start=p=>result('select public.commerce67_start_checkout($1::jsonb) result',[JSON.stringify(p)]);
const base={kind:'offer',state:'draft',name:'Capacitor offer',description:'Eligible capacitors only',priority:20,
 data:{products:['cap1'],categories:[],exclude:[],stacking:'exclusive',tiers:[{minimum:2,type:'percent',value:1000}]}};
const save=(rule,id=null,revision=0)=>result('select public.commerce67_save_rule($1,$2,$3::jsonb) result',[id,revision,JSON.stringify(rule)]);
const activate=async rule=>{const s=await save(rule);return save({...rule,state:'active'},s.id,s.revision);};
await exec(`insert into auth.users(id) values('${admin}'),('${customer}');
 insert into public.admin_members(user_id) values('${admin}');
 insert into public.components(id,sku,name,category,manufacturer,individually,sale_price,image) values
 ('cap1','C-1','Capacitor 1','capacitors','Example',true,501,'{"publicFixture":true}'),
 ('cap2','C-2','Capacitor 2','capacitors','Example',true,300,null),
 ('cts-a','PA','CTS A500K Short','potentiometers','CTS',true,600,null),
 ('cts-b','PB','CTS B500K Short','potentiometers','CTS',true,600,null),
 ('bleed','TB','Duncan style','treble-bleeds','Apparition',true,300,null);
 insert into public.inventory(component_id,quantity) values('cap1',12),('cap2',3),('cts-a',6),('cts-b',1),('bleed',5);
 insert into public.component_internal(component_id,internal_unit_cost) values('cap1',160);
 select set_config('request.jwt.claim.sub','${admin}',false);`);
await assert.rejects(quote(caps(2)),/disabled/);
await exec(`set role authenticated; select set_config('request.jwt.claim.sub','${customer}',false);`);
await assert.rejects(save(base),e=>e.code==='42501');
await assert.rejects(one('select * from commerce67.rules'),e=>e.code==='42501');
await assert.rejects(start({}),e=>e.code==='42501');
await exec(`select set_config('request.jwt.claim.sub','${admin}',false);`);
const draft=await save(base);
assert.equal(draft.revision,1);
await assert.rejects(save(base,draft.id,0),e=>e.code==='40001');
await assert.rejects(save({...base,data:{...base.data,tiers:[base.data.tiers[0],base.data.tiers[0]]}}),/Duplicate quantity/);
await assert.rejects(save({...base,state:'active'}),/lifecycle/);
await exec('reset role; update commerce67.control set enabled=true;');
assert.equal((await quote(caps(2))).subtotalMinor,1002);
const future=await save({...base,name:'Scheduled future'});
await save({...base,state:'scheduled',startsAt:'2099-01-01T00:00:00Z'},future.id,1);
const expired=await save({...base,name:'Expired'});
await save({...base,state:'active',endsAt:'2020-01-01T00:00:00Z'},expired.id,1);
assert.equal((await quote(caps(2))).discountMinor,0);
const offer=await save({...base,state:'active'},draft.id,1);
assert.equal((await quote(caps(2))).subtotalMinor,902);
assert.equal((await quote(caps(2))).discountMinor,100);
const offer2=await activate({...base,name:'Fixed (code)',code:'BATCH-4',data:{...base.data,
 tiers:[{minimum:2,type:'fixed',value:80},{minimum:4,type:'package',value:1200}]}});
await assert.rejects(quote(caps(2),'BATCH-4'),/unavailable/);
assert.equal((await quote(caps(4),'batch-4')).subtotalMinor,1200);
await save({...base,state:'paused',name:'Fixed (code)',code:'BATCH-4',data:offer2.data},offer2.id,2);
const stack=await activate({...base,name:'Fixed stack',priority:1,data:{...base.data,categories:['capacitors'],
 exclude:['cap2'],stacking:'stackable',tiers:[{minimum:2,type:'fixed',value:110}]}});
const stacked=await quote([...caps(2),{kind:'component',id:'cap2',quantity:1}]);
assert.equal(stacked.subtotalMinor,1192);
assert.equal(stacked.offers[0].id,stack.id);
const bundle=await activate({kind:'bundle',name:'Two-part bundle',state:'draft',priority:0,
 data:{products:[],categories:[],exclude:[],parts:[{componentId:'cap1',quantity:2},{componentId:'cap2',quantity:1}],pricing:'fixed',priceMinor:999}});
const addon=await activate({kind:'addon',name:'Preinstalled Duncan',state:'draft',priority:0,
 data:{products:['cts-a'],categories:[],exclude:[],parts:[{componentId:'bleed',quantity:1}],instructions:'Fit using approved Duncan wiring.',priceMinor:249}});
const configured=[{kind:'bundle',id:bundle.id,quantity:1},{kind:'component',id:'cts-a',quantity:1,addon:addon.id}];
assert.equal((await quote(configured)).subtotalMinor,1848);
await assert.rejects(quote([{kind:'component',id:'cts-b',quantity:1,addon:addon.id}]),/incompatible/);
await assert.rejects(quote([{kind:'bundle',id:bundle.id,quantity:3},{kind:'component',id:'cap2',quantity:1}]),/Shared stock/);
await assert.rejects(quote([{...caps(1)[0],unitPrice:1}]),/Invalid commerce item/);
const saveMeasurement=(id,ohms)=>result('select public.commerce67_record_measurement($1,$2) result',[id,ohms]);
const u1=await saveMeasurement('cts-a',498000),u2=await saveMeasurement('cts-a',501000);
const u3=await saveMeasurement('cts-a',560000),u4=await saveMeasurement('cts-b',500000);
await assert.rejects(saveMeasurement('cap1',500000),/CTS/);
const make=(units,tolerance=100)=>result('select public.commerce67_make_set($1::uuid[],$2,1400) result',[units,tolerance]);
await assert.rejects(make([u1,u3]),/tolerance/);
await assert.rejects(make([u1,u4]),/exact variant/);
const set=await make([u1,u2]);
await assert.rejects(make([u1,u2]),/unique/);
await assert.rejects(exec("update public.inventory set quantity=2 where component_id='cts-a'"),/allocated/);
await assert.rejects(quote([{kind:'set',id:set,quantity:1},{kind:'set',id:set,quantity:1}]),/selected once/);
const stale=await quote(caps(3));
await exec("update public.components set sale_price=510 where id='cap1'");
await assert.rejects(start(request(caps(3),stale)),/changed/);
assert.equal(Number((await one('select count(*) n from public.orders')).n),0);
const all=[...configured,{kind:'set',id:set,quantity:1}];
const q=await quote(all);
assert.equal(q.subtotalMinor,3248);
assert.equal(JSON.stringify(q).includes(u1),false);
assert.equal(JSON.stringify(q).includes('private_costs'),false);
const onlySet=await quote([{kind:'set',id:set,quantity:1}]);
const req=request(all,q),order=await start(req);
await assert.rejects(start(req),/reconciliation/);
await assert.rejects(start(request([{kind:'set',id:set,quantity:1}],onlySet)),/unavailable/);
await assert.rejects(exec("update public.inventory set quantity=1 where component_id='cap1'"),/allocated/);
await db.query("update public.orders set stripe_checkout_session_id='cs_live_123456789' where id=$1",[order.id]);
assert.equal((await start(req)).id,order.id);
const snapshot=await result('select public.commerce67_order_snapshot($1) result',[order.id]);
assert.equal(snapshot.private_costs.cap1,160);
assert.equal(snapshot.quote.subtotalMinor,3248);
const params=['evt_PG67PAID01','checkout.session.completed',order.id,order.reference,'cs_live_123456789','pi_123456789',order.totalPence,'gbp'];
const pay=p=>result('select public.fulfil_paid_stripe_checkout($1,$2,$3,$4,$5,$6,$7,$8) result',p);
await assert.rejects(pay(params.map((v,i)=>i===6?v+1:v)),/differs/);
assert.equal(await pay(params),'paid');
assert.equal(await pay(params),'already_paid');
assert.equal(Number((await one("select quantity from public.inventory where component_id='cts-a'")).quantity),3);
assert.equal(Number((await one("select quantity from public.inventory where component_id='cap1'")).quantity),10);
assert.equal((await one('select state from commerce67.matched_sets where id=$1',[set])).state,'sold');
assert.equal(Number((await one('select count(*) n from commerce67.holds')).n),0);
const expiry=await start(request(caps(2),await quote(caps(2))));
await db.query("update public.orders set stripe_checkout_session_id='cs_live_987654321' where id=$1",[expiry.id]);
const expire=(id,session,ref)=>result('select public.commerce67_expire_checkout($1,$2,$3) result',[id,session,ref]);
assert.equal(await expire(expiry.id,'cs_live_000000000',expiry.reference),false);
assert.equal(await expire(expiry.id,'cs_live_987654321',expiry.reference),true);
assert.equal(await expire(expiry.id,'cs_live_987654321',expiry.reference),true);
assert.equal(Number((await one('select count(*) n from commerce67.holds')).n),0);
await assert.rejects(pay(['evt_PG67EXPIRED','checkout.session.completed',expiry.id,expiry.reference,
 'cs_live_987654321','pi_987654321',expiry.totalPence,'gbp']),/no longer open/);
const legacy=await result('select public.create_guest_kit_order($1::jsonb) result',[JSON.stringify({
 requestId:crypto.randomUUID(),items:[{product:'component',sku:'C-1',quantity:2}],checkoutMode:'stripe'
})]);
assert.equal((await one('select state from commerce67.sessions where order_id=$1',[legacy.id])).state,'open');
if(pool){
 const items=[{kind:'component',id:'cap2',quantity:2}];
 const expected=await quote(items);
 const concurrent=()=>pool.query('select public.commerce67_start_checkout($1::jsonb)',[JSON.stringify(request(items,expected))]);
 const paths=await Promise.allSettled([concurrent(),concurrent()]);
 assert.equal(paths.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(paths.filter(x=>x.status==='rejected').length,1);
 assert.match(paths.find(x=>x.status==='rejected').reason.message,/stock is unavailable/i);
 assert.equal(Number((await one("select sum(quantity) q from commerce67.holds where component_id='cap2'")).q),2);
 console.log('Commerce 67 native PostgreSQL: two overlapping transactions cannot both allocate shared stock');
}
await exec('update commerce67.control set enabled=false');
assert.deepEqual(await result('select public.commerce67_order_snapshot($1) result',[order.id]),snapshot);
await assert.rejects(quote(caps(2)),/disabled/);
await db.close();
console.log('Commerce 67 '+(pool?'native PostgreSQL':'PGlite')+': persistence, roles, revisions, scheduling, pricing, exclusions, shared stock, measurements, stale quotes, Stripe settlement/replay and expiry PASS');
