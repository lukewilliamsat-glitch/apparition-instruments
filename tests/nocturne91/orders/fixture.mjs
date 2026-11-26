import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';

const require = createRequire(import.meta.url);
const {Client} = require(process.env.PG_ORDERS_MODULE || 'pg');
const config = {host:'127.0.0.1', port:Number(process.env.PG_ORDERS_PORT || 55432),
  user:process.env.PG_ORDERS_USER || 'postgres', password:process.env.PG_ORDERS_PASSWORD, database:'postgres'};
const ids = Array.from({length:8},(_,i)=>'00000000-0000-4000-8000-00000000000'+i);
const [admin, observer, website, marketplace, refund, ready, reserved, notified] = ids;
const updatedAt='2026-11-25 00:00:00+00';
const c = new Client(config);
const peer = new Client(config);
const read = file => readFile(new URL(file,import.meta.url),'utf8');

const advance = (client,id,status='pending',target='in_production',seen=updatedAt) =>
  client.query('select public.nocturne91_advance_order($1,$2,$3,$4) as receipt',[id,seen,status,target]);
const complete = (client,orders,reason='Confirmed on marketplace history') => client.query(
  'select public.nocturne91_complete_external_orders($1,$2) as count',
  [JSON.stringify(orders.map(([id,status='pending'])=>({id,status,updated_at:updatedAt}))),reason]);

async function signIn(client,id) {
  await client.query('set role authenticated');
  await client.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
}

await c.connect();
await peer.connect();
try {
  await c.query(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    create schema quartermaster79;
    create table quartermaster79.packing(order_id uuid primary key,state text not null);
    create table public.admin_members(user_id uuid primary key);
    create table public.orders(
      id uuid primary key,status text not null,updated_at timestamptz not null,payment_status text not null,
      paid_at timestamptz,fulfillment_applied_at timestamptz,sales_channel text not null,
      external_reference text, status_history jsonb not null default '[]',
      customer jsonb not null default '{}', refunded_pence bigint not null default 0,latest_refund_at timestamptz,
      dispatch_details jsonb not null default '{"tracking_reference":"saved"}'
    );
    create table public.partial_refund_reviews(order_id uuid,refunded_pence bigint,refund_at timestamptz);
    create table public.order_email_deliveries(id uuid primary key default gen_random_uuid(),order_id uuid, kind text,
      source_event_id text,state text default 'pending',resend_of uuid,automatic_delivery_eligible boolean default false,
      external_requested_by uuid,recipient_email text,order_snapshot jsonb);
    create unique index on public.order_email_deliveries(order_id,kind) where resend_of is null;
    alter table public.orders enable row level security;
  `);
  await c.query(await read('baseline-functions.sql'));
  await c.query(await read('fulfilment.review.sql'));
  await c.query('insert into public.admin_members values ($1)',[admin]);
  for (const [id,channel,status,payment,reference] of [
    [website,'WEBSITE','pending','paid',null],[marketplace,'EBAY','pending','paid','fixture A'],
    [refund,'EBAY','pending','partially_refunded','fixture B'],[ready,'OTHER','ready_to_dispatch','paid','fixture C'],
    [reserved,'EBAY','pending','paid','fixture D'],[notified,'EBAY','pending','paid','fixture E']
  ]) await c.query('insert into public.orders(id,status,updated_at,payment_status,paid_at,fulfillment_applied_at,sales_channel,external_reference) values ($1,$2,$3,$4,$3,$3,$5,$6)',[id,status,updatedAt,payment,channel,reference]);
  await c.query("insert into quartermaster79.packing values ($1,'reserved')",[reserved]);
  await c.query("insert into public.order_email_deliveries (order_id,kind,external_requested_by) values ($1,'dispatched',$2)",[notified,admin]);

  for (const role of ['anon','service_role']) {
    await c.query('set role '+role);
    await assert.rejects(advance(c,website),{code:'42501'});
    await assert.rejects(complete(c,[[marketplace]]),{code:'42501'});
    await c.query('reset role');
  }
  await signIn(c,observer);
  await assert.rejects(advance(c,website),{code:'42501'});
  await assert.rejects(complete(c,[[marketplace]]),{code:'42501'});
  await c.query('reset role');
  await signIn(c,admin);
  await signIn(peer,admin);

  await assert.rejects(advance(c,website,'pending','completed'),{code:'22023'});
  await assert.rejects(advance(c,refund),{code:'22023'});
  await assert.rejects(complete(c,[[website]]),{code:'22023'});
  await assert.rejects(complete(c,[[marketplace],[reserved]]),{code:'22023'});
  await assert.rejects(complete(c,[[notified]]),{code:'22023'});
  await assert.rejects(complete(c,[[marketplace],[marketplace]]),{code:'22023'});
  await assert.rejects(complete(c,[[marketplace]],' '),{code:'22023'});

  const concurrent = await Promise.allSettled([advance(c,website),advance(peer,website)]);
  assert.equal(concurrent.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(concurrent.find(result=>result.status==='rejected').reason.code,'40001');
  const receipt=concurrent.find(result=>result.status==='fulfilled').value.rows[0].receipt;
  assert.equal(receipt.status,'in_production');
  assert.equal((await advance(c,website,'in_production','ready_to_dispatch',receipt.updatedAt)).rows[0].receipt.status,'ready_to_dispatch');
  assert.equal((await advance(c,ready,'ready_to_dispatch','dispatched')).rows[0].receipt.status,'dispatched');
  assert.equal((await complete(c,[[marketplace]])).rows[0].count,1);
  await assert.rejects(complete(c,[[marketplace]]),{code:'40001'});
  await c.query('reset role');
  const rows = (await c.query('select * from public.orders')).rows;
  const find = id=>rows.find(row=>row.id===id);
  const audit = find(marketplace).status_history;
  assert.deepEqual(audit.map(({type,correction,actor,from_status,status,reason})=>({type,correction,actor,from_status,status,reason})),
    [{type:'fulfilment_correction',correction:'external_completion',actor:admin,from_status:'pending',status:'completed',reason:'Confirmed on marketplace history'}]);
  assert.deepEqual(find(marketplace).dispatch_details,{tracking_reference:'saved'});
  assert.equal(find(marketplace).payment_status,'paid');
  assert.equal(find(reserved).status,'pending');
  assert.equal(find(ready).status_history.at(-1).type,'external_dispatch_no_email');
  const notifications = (await c.query('select order_id, kind from public.order_email_deliveries')).rows;
  assert.equal(notifications.filter(x=>x.order_id===website).length,2);
  assert.equal(notifications.filter(x=>x.order_id===marketplace || x.order_id===ready).length,0);
  assert.equal((await c.query('select count(*)::int as count from quartermaster79.packing')).rows[0].count,1);
  console.log('PASS Admin-only grants, guarded transitions, row-lock race, audit-only bulk correction and rollback');
} finally {
  await peer.end();
  await c.end();
}
