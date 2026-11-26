import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHmac} from 'node:crypto';
const {Client}=createRequire(import.meta.url)(process.env.PG_ORDERS_MODULE);
const db=new Client({host:'127.0.0.1',port:55492,user:'postgres',database:'postgres'});
const sql=name=>readFile(new URL(name,import.meta.url),'utf8');
const val=async(q,a)=>Object.values((await db.query(q,a)).rows[0])[0];
const live=process.env.PRODUCTION_SHAPE==='1',account=live?'acct_1UJUR9I4E9fIeEmD':'acct_1UJURLIeVWpsCl5X';
const sign=object=>{const e={id:'evt_'+randomUUID().replaceAll('-',''),object:'event',livemode:live,created:Math.floor(Date.now()/1000),...object};
 const raw=JSON.stringify(e),t=Math.floor(Date.now()/1000);return [raw,'t='+t+',v1='+createHmac('sha256','whsec_DisposableFixture92').update(t+'.'+raw).digest('hex')];};
const receive=(type,session)=>val('select public.convergence92_receive($1,$2)',sign({type,data:{object:session}}));
async function order(owner='fixture93',quantity=1){
 const id=randomUUID();
 await db.query(`insert into public.orders(id,request_id,request_hash,reference,items,total_pence)
 values($1,$2,'fixture',$3,$4,1633)`,[id,randomUUID(),'AI-'+Math.floor(Math.random()*90000000+10000000),JSON.stringify([{type:'component',productId:'fixture92-stock',quantity}])]);
 const plan=await val('select public.convergence92_prepare($1,$2,$3)',[id,owner,Math.floor(Date.now()/1000)+2700]);
 const session=(live?'cs_live_':'cs_test_')+randomUUID().replaceAll('-','');
 await val('select public.convergence92_attach($1,$2,$3)',[id,plan.binding,session]);
 return {object:'checkout.session',id:session,livemode:live,client_reference_id:id,metadata:{order_id:id,dominion_binding:plan.binding},
  amount_total:1633,currency:'gbp',status:'complete',payment_status:'paid',payment_intent:'pi_'+randomUUID().replaceAll('-',''),
  customer_details:{name:'Fixture Recipient',email:'fixture93@example.invalid'},
  collected_information:{shipping_details:{name:'Fixture Recipient',address:{line1:'1 Test Street',city:'London',postal_code:'SW1A 1AA',country:'GB'}}}};
}
await db.connect();
try{
 await db.query(`alter table ironclad69.batches alter column id set default gen_random_uuid();
 alter table public.orders add column delivery jsonb default '{"country":"GB"}';
 create table public.components(id text primary key,sku text,name text,category text,manufacturer text,description text,
 specs jsonb,product_content jsonb,active boolean,individually boolean,in_kits boolean,sale_price integer,kit_price integer,image jsonb,kit_price_quantity integer);`);
 await db.query(await sql('catalogue.baseline.sql'));
 await db.query('grant select on public.catalogue_components to anon,authenticated');
 await db.query(await sql(live?'contact.production.accepted.sql':'contact.staging.accepted.sql'));
 await db.query(await sql(live?'receiver.production.review.sql':'receiver.staging.sql'));
 await db.query(await sql('availability.sql'));
 await db.query("insert into public.components(id,active,individually,in_kits) values('fixture92-stock',true,true,false);update public.inventory set quantity=10");
 const paid=await order();
 const malformed=structuredClone(paid);malformed.collected_information.shipping_details.address.country='US';
 await assert.rejects(receive('checkout.session.completed',malformed),{code:'22023'});
 assert.equal(await val('select quantity::int from public.inventory'),10);
 assert.equal((await receive('checkout.session.completed',paid)).outcome,'paid');
 assert.equal(await val("select customer->>'email' from public.orders where id=$1",[paid.client_reference_id]),'fixture93@example.invalid');
 assert.equal(await val("select delivery->>'country' from public.orders where id=$1",[paid.client_reference_id]),'GB');
 assert.equal(await val('select quantity::int from public.inventory'),9);
 const guests=[];for(let i=0;i<3;i++)guests.push(await order('guest:checkout'));
 await assert.rejects(order('guest:checkout'),{code:'P0001'});
 assert.equal(await val("select count(*)::int from dominion79.holds where owner_key='guest:checkout' and state='held'"),3);
 const physical=await val('select quantity::int from public.inventory');
 await db.query('begin read only;set local role anon');
 assert.equal(await val("select stock::int from public.catalogue_components where id='fixture92-stock'"),physical-4); // three guests plus the accepted 92 failed-payment hold
 await assert.rejects(db.query('select * from dominion79.holds'),{code:'42501'});
 await db.query('rollback');
 await db.query("update dominion79.lifecycle_control set mode='draining'");
 const existing=guests[0];
 assert((await val('select public.convergence92_prepare($1,$2,$3)',[existing.client_reference_id,'guest:checkout',Math.floor(Date.now()/1000)+2700])).sessionId===existing.id);
 await assert.rejects(order('new-owner93'),{code:'55000'});
 for(const guest of guests){
  assert.equal((await receive('checkout.session.expired',{...guest,status:'expired',payment_status:'unpaid',payment_intent:null})).outcome,'expired');
 }
 await assert.rejects(receive('checkout.session.completed',guests[0]),{code:'23514'});
 assert.equal(await val('select quantity::int from public.inventory'),physical);
 const legacy={object:'checkout.session',id:(live?'cs_live_':'cs_test_')+'LegacyFixture93',livemode:live,metadata:{}};
 assert.equal((await receive('checkout.session.completed',legacy)).outcome,'legacy');
 assert.equal((await receive('checkout.session.completed',{...legacy,metadata:{dominion_binding:'a'.repeat(64)}})).outcome,'unattached');
 if(!live){
  await db.query(await sql('staging-custody.sql'));
  await db.query("insert into vault.decrypted_secrets values('STRIPE_SECRET_KEY','sk_test_DisposableFixture93')");
  for(const role of ['anon','authenticated']){await db.query('set role '+role);await assert.rejects(val('select public.convergence93_test_credential()'),{code:'42501'});await db.query('reset role');}
  await db.query('set role service_role');assert.equal(await val('select public.convergence93_test_credential()'),'sk_test_DisposableFixture93');await db.query('reset role');
  await db.query("update vault.decrypted_secrets set decrypted_secret='sk_live_DisposableFixture93' where name='STRIPE_SECRET_KEY'");
  await assert.rejects(val('select public.convergence93_test_credential()'),{code:'28000'});
 }
 console.log('PASS 93 '+(live?'production':'staging')+' shape: atomic signed contact/stock, read-only public availability, guest cap, early verified expiry, drain/resume, late denial, legacy routing and private credential custody');
}finally{await db.end();}
