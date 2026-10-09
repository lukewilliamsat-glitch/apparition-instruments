import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {createHash} from 'node:crypto';
const db=new PGlite({extensions:{pgcrypto}}),sql=readFileSync('docs/approval/catalogue-delivery-v2.sql','utf8');
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema extensions;create extension pgcrypto with schema extensions;grant usage on schema extensions to anon,authenticated;
 create table components(id text primary key,sku text,name text,category text,manufacturer text,description text,specs jsonb,product_content jsonb,individually boolean,in_kits boolean,sale_price numeric,kit_price numeric,image jsonb,kit_price_quantity int,active boolean,public_allowed boolean);
 create table inventory(component_id text references components(id),quantity int,public_allowed boolean);
 alter table components enable row level security;alter table inventory enable row level security;
 create policy public_components on components for select to anon,authenticated using(public_allowed);
 create policy public_inventory on inventory for select to anon,authenticated using(public_allowed);
 grant select on components,inventory to anon,authenticated;
 create view catalogue_components with(security_invoker=true) as select c.id,c.sku,c.name,c.category,c.manufacturer,c.description,c.specs,c.product_content,c.individually,c.in_kits,c.sale_price,c.kit_price,c.image,c.kit_price_quantity,i.quantity as stock from components c join inventory i on i.component_id=c.id where c.active and(c.individually or c.in_kits);
 grant select on catalogue_components to anon,authenticated;`);
 const image='data:image/png;base64,fixture';
 for(const [id,active,allowed] of [['public',true,true],['private',true,false],['inactive',false,true]]){
  await db.query('insert into components values($1,$1,$1,\'fixture\',null,null,\'{}\',\'{}\',true,false,125,100,$2::jsonb,1,$3,$4)',[id,JSON.stringify(image),active,allowed]);
  await db.query('insert into inventory values($1,4,$2)',[id,allowed]);
 }
 const before=(await db.query('select * from components order by id')).rows;
 await db.exec(sql);
 assert.deepEqual((await db.query('select * from components order by id')).rows,before);
 assert.equal((await db.query("select reloptions from pg_class where oid='catalogue_delivery_v2'::regclass")).rows[0].reloptions[0],'security_invoker=true');
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  assert.equal((await db.query("select has_table_privilege(current_user,'catalogue_delivery_v2','UPDATE') or has_table_privilege(current_user,'catalogue_delivery_v2','DELETE') or has_table_privilege(current_user,'catalogue_delivery_v2','INSERT') as writable")).rows[0].writable,false);
  const rows=(await db.query('select * from catalogue_delivery_v2')).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].id,'public');assert(!('image' in rows[0]));assert.equal(rows[0].image_reference,null);
  assert.equal(rows[0].image_identity,createHash('sha256').update(image).digest('hex'));assert.equal(rows[0].stock,4);assert.equal(rows[0].sale_price,'125');
  for(const statement of ['update catalogue_delivery_v2 set name=\'bad\'','delete from catalogue_delivery_v2','insert into catalogue_delivery_v2(id) values(\'bad\')'])await assert.rejects(db.exec(statement),e=>['42501','55000'].includes(e.code));
  await db.exec('reset role');
 }
 await db.exec('set role service_role');await assert.rejects(db.query('select * from catalogue_delivery_v2'),e=>e.code==='42501');await db.exec('reset role');
 await assert.rejects(db.exec(sql),e=>e.code==='42P07');await db.exec('rollback');
 assert.deepEqual((await db.query('select * from components order by id')).rows,before);
 assert.equal((await db.query('select count(*) n from inventory')).rows[0].n,3);
 assert(!/\b(drop|delete|truncate|update)\b/i.test(sql));
 console.log('V2 isolated SQL/RLS PASS: exact review SQL, source fingerprint parity, no embedded data, prices/stock intact, invoker policies exclude private/inactive rows, anon/authenticated SELECT only, service role denied, fail-closed retry and unchanged source records.');
}finally{await db.close();}
