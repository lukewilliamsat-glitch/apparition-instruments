import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile, realpath} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {extname, resolve, sep} from 'node:path';
import {workshopLabel} from '../dominion78c/quartermaster.mjs';

const require = createRequire(import.meta.url);
const {PGlite} = require(process.env.QUARTERMASTER_PGLITE);
const {chromium} = require(process.env.QUARTERMASTER_PLAYWRIGHT);
const root = await realpath(process.argv[2]);
const db = new PGlite();
const stage = await readFile(new URL('../dominion78c/ironheart80-stage-a.review.sql', import.meta.url), 'utf8');
const firstLight = await readFile(new URL('../stageb81/stageb81.read.review.sql', import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(stage).digest('hex'),
  '1e4f79c5a4e321b0e80450b10adf72b80ae3adb5b51dc1c09554c3811e6942de');
const owner = 'aaaaaaaa-0000-4000-8000-000000000001';
const buyer = 'bbbbbbbb-0000-4000-8000-000000000002';
const order = 'cccccccc-0000-4000-8000-000000000003';
const historicOrder = 'dddddddd-0000-4000-8000-000000000004';
const badOrder = 'eeeeeeee-0000-4000-8000-000000000005';
const kit = JSON.stringify([{type:'kit', quantity:2, snapshot:{stockRequirements:[
  {componentId:'fixture-pot', quantity:2}, {componentId:'fixture-cap', quantity:1}
]}}, {type:'component', productId:'fixture-pot', quantity:1}]);

// Disposable prerequisites. Stage A DDL and FIRST LIGHT RPC below come from the pinned sources.
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema ironclad69;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable set search_path='' as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create table public.admin_members(user_id uuid primary key references auth.users);
  create function ironclad69.actor() returns uuid language plpgsql stable set search_path='' as $$
  declare a uuid:=auth.uid();
  begin
   if a is null or not exists(select from public.admin_members where user_id=a) then
    raise exception 'Admin membership required' using errcode='42501';
   end if;
   return a;
  end $$;
  create table public.orders(id uuid primary key, reference text not null, status text not null,
    payment_status text not null, items jsonb not null, fulfillment_applied_at timestamptz,
    refunded_pence bigint, latest_refund_at timestamptz, customer jsonb);
  create table public.inventory(component_id text primary key, quantity bigint);
  create table public.components(id text primary key, name text);
  create table public.partial_refund_reviews(order_id uuid, refunded_pence bigint, refund_at timestamptz);
  create table public.order_financial_revisions(id uuid primary key, document jsonb);
  create table ironclad69.measurements(id uuid primary key);
  create table ironclad69.suppliers(id uuid primary key);
`);
await db.exec('begin;\n' + stage.slice(stage.indexOf('create schema dominion79;')));
await db.exec(firstLight);
await db.exec(await readFile(new URL('./observe.review.sql', import.meta.url), 'utf8'));
await db.query('insert into auth.users values ($1),($2)', [owner,buyer]);
await db.query('insert into public.admin_members values ($1)', [owner]);
await db.exec(`
  insert into public.inventory values ('fixture-pot',15),('fixture-cap',12);
  insert into public.components values ('fixture-pot','Fixture potentiometer'),('fixture-cap','Fixture capacitor');
  insert into quartermaster79.material values ('F-BOX','Fixture packing box',1,3,array[10,10,10],array[12,12,12],10);
`);
await db.query(`
  insert into public.orders values
    ($1,'FIXTURE-100','ready_to_dispatch','paid',$4,now(),null,null,'{"private":"discard"}'),
    ($2,'FIXTURE-101','ready_to_dispatch','partially_refunded',$4,now(),100,'2026-10-01','{"private":"discard"}'),
    ($3,'FIXTURE-102','pending','paid','[{"type":"unknown","quantity":1}]',now(),null,null,'{}')
`, [order,historicOrder,badOrder,kit]);
await db.query(`
  insert into quartermaster79.packing(order_id,request_id,sku,picked,state,measured_mm,measured_grams,postal_class,
    tracking,packed_at,actual_material_minor,estimated_postage_minor)
  values($1,'aaaaaaaa-1000-4000-8000-000000000010','F-BOX','{"fixture-pot":5,"fixture-cap":2}', 'reserved',
    null,null,null,null,null,null,null),
  ($2,'aaaaaaaa-1000-4000-8000-000000000011','F-BOX','{"fixture-pot":5,"fixture-cap":2}', 'packed',
    array[40,30,20],121,'large-letter','FIXTURE-TRACK',now(),48,115)
`, [order,historicOrder]);
await db.query("insert into quartermaster79.pick_progress values($1,'fixture-pot',1)", [order]);
await db.query(`insert into quartermaster79.postage_evidence(id,order_id,minor,receipt,actor)
  values('aaaaaaaa-1000-4000-8000-000000000012',$1,109,'FIXTURE-RECEIPT',$2)`, [historicOrder,owner]);

async function read(role, subject, id = order) {
  return db.transaction(async tx => {
    await tx.exec('set transaction read only');
    await tx.exec('set local role ' + role);
    if (subject) await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [subject]);
    return (await tx.query('select public.quartermaster84_review($1) as value', [id])).rows[0].value;
  });
}

for (const [role, subject] of [['anon', null], ['authenticated', buyer], ['authenticated', null], ['service_role', null]]) {
  await assert.rejects(read(role, subject), {code:'42501'});
}
const permissions = await db.query(`select
  has_function_privilege('authenticated','public.quartermaster84_review(uuid)','EXECUTE') as allowed,
  has_function_privilege('authenticated','quartermaster79.saved_bom(jsonb)','EXECUTE') as helper,
  has_table_privilege('authenticated','quartermaster79.packing','SELECT,INSERT,UPDATE,DELETE') as direct`);
assert.deepEqual(permissions.rows[0], {allowed:true,helper:false,direct:false});
assert.deepEqual(await read('authenticated',owner), {mode:'disabled',schema:1,order:null});
await db.exec("update quartermaster79.rollout set mode='workshop'");
assert.deepEqual(await read('authenticated',owner), {mode:'disabled',schema:1,order:null});
await db.exec("update quartermaster79.rollout set mode='observe'");
await assert.rejects(read('authenticated',owner,badOrder), {code:'22023'});
const response = await read('authenticated',owner);
assert.deepEqual(response.order.picks, [
  {name:'Fixture capacitor',quantity:2,picked:0}, {name:'Fixture potentiometer',quantity:5,picked:1}]);
assert.equal(response.order.materials[0].available,2);
assert.ok(!JSON.stringify(response).includes('discard'));
let evidence = (await read('authenticated',owner,historicOrder)).order;
assert.equal(evidence.readyForReview,false);
assert.deepEqual(evidence.cost,{packagingActualMinor:48,postageEstimatedMinor:115,postageActualMinor:109});
await db.query("insert into public.partial_refund_reviews values($1,100,'2026-10-01')",[historicOrder]);
evidence = (await read('authenticated',owner,historicOrder)).order;
assert.equal(evidence.readyForReview,true);
const relations = ['public.orders','public.inventory','public.order_financial_revisions',
  'quartermaster79.packing','quartermaster79.movement','quartermaster79.pick_progress','quartermaster79.postage_evidence'];
const snapshot = () => db.query('select ' + relations.map((table, i) =>
  '(select md5(coalesce(string_agg(x::text,' + "','" + ' order by x::text),\'\')) from ' + table + ' x) as t' + i).join(','));
const baseline = (await snapshot()).rows;
console.log('PASS exact read SQL: role denial, closed direct grants, disabled and observe states, bounded saved BOM, partial refund and cost evidence');

const mime = {'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'};
const server = createServer(async (req,res) => {
  const path = new URL(req.url,'http://127.0.0.1').pathname;
  const file = resolve(root,'.'+path+(path.endsWith('/')?'index.html':''));
  if (req.method !== 'GET' || !file.startsWith(root+sep)) return res.writeHead(403).end();
  try {
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(data);
  } catch {res.writeHead(404).end();}
});
await new Promise(done => server.listen(0,'127.0.0.1',done));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({executablePath:process.env.QUARTERMASTER_CHROMIUM,headless:true,
  args:['--no-sandbox','--disable-background-networking']});
const rpcRequests = [];
try {
  for (const viewport of [{width:1360,height:850},{width:390,height:844}]) {
    const context = await browser.newContext({viewport});
    await context.addInitScript(() => localStorage.setItem('apparition.admin.supabase-session.v1',
      JSON.stringify({access_token:'disposable-84-fixture',refresh_token:'disposable-84-fixture',
        expires_at:Math.floor(Date.now()/1000)+7200})));
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === origin) return route.continue();
      if (url.origin !== 'https://acdxpxvksvdwfajntzfx.supabase.co') return route.abort();
      const reply = (json,status=200) => route.fulfill({json,status,headers:{'access-control-allow-origin':origin}});
      if (url.pathname === '/auth/v1/user') return reply({id:owner});
      if (url.pathname === '/rest/v1/admin_members') return reply([{user_id:owner}]);
      if (url.pathname === '/rest/v1/rpc/quartermaster84_review') {
        rpcRequests.push(req.method());
        return reply(await read('authenticated',owner,url.searchParams.get('p_order')));
      }
      if (url.pathname === '/auth/v1/logout') return route.fulfill({status:204,headers:{'access-control-allow-origin':origin}});
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(origin+'/admin/quartermaster/?order='+historicOrder);
    await page.getByText('Postage estimate: £1.15',{exact:true}).waitFor({timeout:10000});
    assert.ok(await page.getByText('Recorded postage: £1.09',{exact:true}).isVisible());
    assert.ok(await page.getByText('Actually used packaging: £0.48',{exact:true}).isVisible());
    assert.equal(await page.locator('[data-workspace=orders]').getAttribute('aria-current'),'page');
    assert.equal(await page.getByRole('link',{name:'Back to this order'}).getAttribute('href'),'/admin/orders/?id='+historicOrder);
    assert.equal(await page.locator('#quartermaster-workshop form, #quartermaster-workshop button').count(),0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    if (viewport.width === 390) {
      const menu=page.locator('[data-admin-menu]');
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'),'true');
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'),'false');
    }
    await page.getByRole('button',{name:'Sign Out',exact:true}).click();
    await page.getByRole('button',{name:'Sign In',exact:true}).waitFor({timeout:10000});
    assert.equal(await page.locator('#quartermaster-workshop').textContent(),'');
    await context.close();
  }
  assert.deepEqual(rpcRequests,['GET','GET']);
  assert.deepEqual((await snapshot()).rows,baseline);
  console.log('PASS exact static bytes: desktop/mobile, Orders context and back link, sign-out, GET-only and unchanged business fixtures');

  const labelPage = await browser.newPage();
  for (const kind of ['component','batch','set','packaging']) {
    await labelPage.setContent(workshopLabel({kind,title:'W'.repeat(32),reference:'W'.repeat(32),detail:'W'.repeat(36)}));
    const label = await labelPage.locator('svg').evaluate(el => {
      const rect=el.getBoundingClientRect();
      return {width:rect.width,height:rect.height,safe:Array.from(el.querySelectorAll('text')).every(text => {
        const box = text.getBBox();
        return [box.x,box.x+box.width].every(x => [box.y,box.y+box.height].every(y => Math.hypot(x-25,y-25)<=21));
      })};
    });
    assert.ok(Math.abs(label.width-50*96/25.4)<0.05 && Math.abs(label.height-label.width)<0.05 && label.safe);
  }
  console.log('PASS digital circular label proof: 50 mm in Chromium with a 4 mm quiet edge for all four kinds');
} finally {
  await browser.close();
  await db.close();
  await new Promise(done => server.close(done));
}
