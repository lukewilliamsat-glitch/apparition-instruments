import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const {Client}=createRequire(import.meta.url)(process.env.PG_ORDERS_MODULE);
const c=new Client({host:'127.0.0.1',port:55493,user:'postgres',database:'postgres'});
const sql=name=>readFile(new URL(name,import.meta.url),'utf8');
await c.connect();
try {
 await c.query(`
 create role anon;create role authenticated;create role service_role;
 create function public.command63_finance_actor() returns uuid language plpgsql stable as $$
 begin
  if current_setting('request.jwt.claim.sub',true) is distinct from '00000000-0000-4000-8000-000000000001' then
   raise exception 'Admin membership required' using errcode='42501';
  end if;
  return '00000000-0000-4000-8000-000000000001'::uuid;
 end $$;
 create table public.orders(id uuid primary key,created_at timestamptz,paid_at timestamptz,
 order_date date,payment_status text,sales_channel text,currency text,reference text,total_pence bigint,
 refunded_pence bigint,items jsonb,updated_at timestamptz);
 create function public.command63_finance_basis(o public.orders) returns text language sql immutable as $$select md5(o.items::text||o.total_pence::text)$$;
 create table public.order_financial_records(order_id uuid primary key,revision bigint,document jsonb,order_basis_hash text);
 create schema omniscience74;
 create table omniscience74.outlays(id uuid primary key,day date,vendor text,category text,purpose text,original_minor bigint,currency text,
 sterling_minor bigint,funding text,treatment text,evidence text,external_reference text,recurring boolean,notes text,actor uuid);
 create table omniscience74.reimbursements(id uuid primary key,outlay uuid,day date,sterling_minor bigint);
 insert into public.orders select gen_random_uuid(),now(),now(),'2026-11-26','paid','DIRECT','GBP','FIXTURE-'||n,1000,0,'[]',now()
 from generate_series(1,301) n;
 insert into omniscience74.outlays select gen_random_uuid(),'2026-11-26','Synthetic supplier','Hosting','Isolated test',100,'GBP',100,'director','overhead','FIXTURE-'||n,'',false,'',null
 from generate_series(1,301) n;
 `);
 await c.query(await sql('report-pages.sql'));
 await c.query(await sql('scope.sql'));
 for(const role of ['anon','service_role']){
  await c.query('set role '+role);
  await assert.rejects(c.query("select public.omniscience92_scope('2026-11-01','2026-11-30')"),{code:'42501'});
  await c.query('reset role');
 }
 await c.query('set role authenticated');
 await assert.rejects(c.query("select public.omniscience92_scope('2026-11-01','2026-11-30')"),{code:'42501'});
 await c.query('reset role');
 await c.query("set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001'");
 await c.query('begin read only');
 await c.query('set local role authenticated');
 const first=(await c.query("select public.omniscience92_scope('2026-11-01','2026-11-30') summary")).rows[0].summary;
 assert.equal(first.orders,301);assert.equal(first.outlays,301);assert.match(first.revision,/^[a-f0-9]{32}$/);
 for(const kind of ['orders','outlays']){
  let cursor=null,count=0,pages=0;
  do{
   const {page}=(await c.query('select public.omniscience92_'+kind+'($1,$2,$3,$4) page',
     ['2026-11-01','2026-11-30',cursor?.day??null,cursor?.id??null])).rows[0];
   assert.ok(page.rows.length<=100);count+=page.rows.length;pages++;cursor=page.next;
  }while(cursor);
  assert.equal(count,301);assert.equal(pages,4);
 }
 await c.query('commit');
 const id=(await c.query('select id from public.orders limit 1')).rows[0].id;
 await c.query('update public.orders set total_pence=1234,updated_at=clock_timestamp() where id=$1',[id]);
 const last=(await c.query("select public.omniscience92_scope('2026-11-01','2026-11-30') summary")).rows[0].summary;
 assert.notEqual(first.revision,last.revision);
 console.log('PASS read-only HTTP RPC semantics, 301-row pagination, scope fence and denied unauthorised roles');
} finally{await c.end();}
