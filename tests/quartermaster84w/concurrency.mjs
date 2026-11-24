import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
const require = createRequire(import.meta.url);
const {Client} = require(process.env.QUARTERMASTER_PG_MODULE ?? 'pg');
const database = 'quartermaster84w_fixture';
const host = process.env.QUARTERMASTER_PG_HOST ?? '127.0.0.1';
assert.ok(host === '127.0.0.1' || host.startsWith('/'), 'Local PostgreSQL fixture required');
const settings = {host, database, port:Number(process.env.QUARTERMASTER_PG_PORT ?? '5432'),
  user:process.env.QUARTERMASTER_PG_USER ?? 'postgres', application_name:'quartermaster84w-isolated'};
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12,'0');
const [packer, cost, outsider, supplier] = [1,2,3,4].map(uuid);
const order = [10,11,12,13].map(uuid);
const purchases = [21,22].map(uuid);
const action = {
  reserve: sku => ({kind:'reserve',sku}), pick: quantity => ({kind:'pick',component:'fixture-pot',quantity}),
  release: {kind:'release'},
  complete: {kind:'complete',purchase:purchases[0],mm:[42,34,20],grams:120,
    format:'large-letter',tracking:'FIXTURE-TRACK',estimate:115},
  postage: {kind:'postage',minor:109,receipt:'FIXTURE-POSTAGE-01'}
};

const here = path => new URL(path,import.meta.url);
const supplied = process.argv.slice(2);
const paths = supplied.length ? supplied : [
  '../dominion78c/ironheart80-stage-a.review.sql','../stageb81/stageb81.read.review.sql',
  '../quartermaster84/observe.review.sql','../dominion78c/quartermaster79.sql','../quartermaster84/acceptance.mjs'
].map(here);
const [stage, first, observe, old, fixture] = await Promise.all(paths.map(path => readFile(path,'utf8')));
function reusable(name) {
  const start = old.indexOf('create function quartermaster79.'+name+'(');
  const end = old.indexOf('\nend $$;', start);
  assert.ok(start>=0 && end>start);
  return old.slice(start,end+8);
}

async function open() { const c = new Client(settings); await c.connect(); return c; }
const [control,a,b] = await Promise.all([open(),open(),open()]);
const row = async (client,q,params) => (await client.query(q,params)).rows[0];
const run = async (client,o,r,g,v,act) =>
  (await row(client,'select public.quartermaster84w_pack($1,$2,$3,$4,$5) as value',[o,uuid(r),g,v,act])).value;
const receive = async (client,id,sku,qty,total) => (await row(client,
  'select public.quartermaster84w_receive($1,$2,$3,$4,$5,$6) as value',
  [id,sku,supplier,'FIXTURE-'+sku,qty,total])).value;

async function begin(c,subject,role='authenticated') {
  assert.ok(['authenticated','anon','service_role'].includes(role));
  await c.query('begin');
  await c.query('set local role '+role);
  if (subject) await c.query("select set_config('request.jwt.claim.sub',$1,true)", [subject]);
}
async function use(c,actor,fn,role) {
  await begin(c,actor,role);
  try {const out=await fn(); await c.query('commit'); return out;}
  catch(error) {await c.query('rollback'); throw error;}
}
async function waitsForLock(c) {
  const deadline = Date.now()+3500;
  while(Date.now()<deadline) {
    const state=await row(control,'select wait_event_type from pg_stat_activity where pid=$1',[c.processID]);
    if (state?.wait_event_type==='Lock') return;
    await delay(20);
  }
  assert.fail('Expected a genuine concurrent PostgreSQL lock wait');
}
const asPacker = (...params) => use(a,packer,()=>run(a,...params));
const denied = (p,code) => assert.rejects(p,{code});
const outcome = (generation,revision,state) => ({generation,revision,state});
const settled = p => p.then(value=>({value}),error=>({error}));

try {
  const server = await row(control,"select current_database() db,current_setting('server_version') version");
  assert.equal(server.db,database);
  assert.match(server.version,/^17\./);
  assert.notEqual(a.processID,b.processID);
  assert.equal((await row(control,"select to_regclass('public.orders') as prior")).prior,null);
  console.log('Isolated PostgreSQL '+server.version+', three independent backend sessions');

  const setup = fixture.match(/await db\.exec\(\x60([\s\S]*?)\x60\);\nawait db\.exec\('begin;/);
  assert.ok(setup,'Expected accepted 84B disposable prerequisites');
  await control.query(setup[1]);
  await control.query('begin;\n'+stage.slice(stage.indexOf('create schema dominion79;')));
  await control.query(first);
  await control.query(observe);
  for(const name of ['receive','complete']) await control.query(reusable(name));
  await control.query('revoke all on all functions in schema quartermaster79 from public,anon,authenticated,service_role');
  for (const sql of ['writer-core.review.sql','writer-context.review.sql']) await control.query(await readFile(here('./'+sql),'utf8'));

  await control.query('insert into auth.users values($1),($2),($3)',[packer,cost,outsider]);
  await control.query('insert into public.admin_members values($1),($2)',[packer,cost]);
  await control.query('insert into quartermaster84w.staff values($1,true,false,false),($2,false,true,true)',[packer,cost]);
  await control.query('insert into ironclad69.suppliers values($1)',[supplier]);
  await control.query("insert into public.inventory values ('fixture-pot',99); insert into public.components values ('fixture-pot','Fixture pot')");
  await control.query("insert into public.order_financial_revisions values ('00000000-0000-4000-8000-000000000222','{\"fixture\":\"historical\"}')");
  await control.query("insert into quartermaster79.material values ('F-ONE','One',0,0,array[10,10,10],array[12,12,12],10),('F-MANY','Many',0,0,array[10,10,10],array[12,12,12],10)");
  await control.query(`insert into public.orders
    select id,'FIXTURE','ready_to_dispatch','paid','[{"type":"component","productId":"fixture-pot","quantity":1}]',now(),null,null,'{}'
    from unnest($1::uuid[]) id`,[order]);
  const inspect = "select (select to_jsonb(i) from public.inventory i) stock,(select to_jsonb(f) from public.order_financial_revisions f) finance";
  const baseline = await row(control,inspect);

  await denied(asPacker(order[0],100,0,0,action.reserve('F-ONE')),'42501');
  await denied(use(a,outsider,()=>run(a,order[0],100,0,0,action.reserve('F-ONE'))),'42501');
  for (const role of ['anon','service_role']) await denied(use(a,null,()=>run(a,order[0],100,0,0,action.reserve('F-ONE')),role),'42501');
  await denied(use(a,packer,()=>a.query('select * from quartermaster79.packing')),'42501');
  await control.query("update quartermaster84w.gate set mode='workshop'");
  const createMaterial = actor => use(a,actor,()=>row(a,
    "select public.quartermaster84w_create_material('F-NEW','Fixture new',array[8,8,8],array[9,9,9],1,0) as created"));
  await denied(createMaterial(packer),'42501');
  assert.equal((await createMaterial(cost)).created,true);
  assert.equal((await createMaterial(cost)).created,false);
  const context = (actor,id) => use(a,actor,()=>row(a,'select public.quartermaster84w_workspace($1) as data',[id]));
  assert.equal((await context(packer,order[0])).data.order.canReserve,true);
  assert.equal((await context(cost,order[0])).data.order.canReserve,false);
  await denied(context(outsider,order[0]),'42501');
  await denied(use(a,packer,()=>receive(a,purchases[0],'F-ONE',1,41)),'42501');
  assert.equal(await use(a,cost,()=>receive(a,purchases[0],'F-ONE',1,41)),true);
  assert.equal(await use(a,cost,()=>receive(a,purchases[0],'F-ONE',1,41)),false);
  await denied(use(a,cost,()=>receive(a,purchases[0],'F-ONE',2,41)),'23505');
  assert.equal(await use(a,cost,()=>receive(a,purchases[1],'F-MANY',3,122)),true);
  console.log('PASS scoped staff, role denial, disabled gate and receipt idempotency');

  await begin(a,packer);
  assert.deepEqual(await run(a,order[0],100,0,0,action.reserve('F-ONE')),outcome(1,0,'reserved'));
  await begin(b,packer);
  const last=settled(run(b,order[1],101,0,0,action.reserve('F-ONE')));
  await waitsForLock(b);
  await a.query('commit');
  assert.equal((await last).error?.code,'23514');
  await b.query('rollback');

  await begin(a,packer);
  assert.deepEqual(await run(a,order[2],102,0,0,action.reserve('F-MANY')),outcome(1,0,'reserved'));
  await begin(b,packer);
  const same=settled(run(b,order[2],102,0,0,action.reserve('F-MANY')));
  await waitsForLock(b);
  await a.query('commit');
  assert.deepEqual((await same).value,outcome(1,0,'reserved'));
  await b.query('commit');
  console.log('PASS simultaneous last-unit contention and same-order reservation retry');

  const reservedContext=(await context(packer,order[0])).data.order;
  assert.equal(reservedContext.canPick,true);
  assert.equal(reservedContext.batches.length,1);
  assert.equal(reservedContext.picks[0].quantity,1);
  assert.deepEqual(await asPacker(order[0],103,1,0,action.pick(1)),outcome(1,1,'reserved'));
  assert.deepEqual(await asPacker(order[0],104,1,1,action.pick(0)),outcome(1,2,'reserved'));
  await denied(asPacker(order[0],105,1,0,action.pick(1)),'40001');
  await begin(a,packer);
  assert.deepEqual(await run(a,order[0],106,1,2,action.release),outcome(1,3,'released'));
  await begin(b,packer);
  const release=settled(run(b,order[0],106,1,2,action.release));
  await waitsForLock(b);
  await a.query('commit');
  assert.deepEqual((await release).value,outcome(1,3,'released'));
  await b.query('commit');
  assert.deepEqual(await asPacker(order[0],107,1,3,action.reserve('F-ONE')),outcome(2,0,'reserved'));
  await denied(asPacker(order[0],108,1,0,action.pick(1)),'40001');
  await denied(asPacker(order[0],108,2,0,{...action.pick(1),arbitrary:'fixture'}),'22023');
  assert.deepEqual(await asPacker(order[0],109,2,0,action.pick(1)),outcome(2,1,'reserved'));

  await b.query('begin');
  await b.query("update public.orders set payment_status='partially_refunded',refunded_pence=100,latest_refund_at='2026-10-01' where id=$1",[order[0]]);
  const refund=settled(asPacker(order[0],110,2,1,action.complete));
  await waitsForLock(a);
  await b.query('commit');
  assert.equal((await refund).error?.code,'23514');
  await control.query("insert into public.partial_refund_reviews values($1,100,'2026-10-01')",[order[0]]);
  await begin(a,packer);
  assert.deepEqual(await run(a,order[0],110,2,1,action.complete),outcome(2,2,'packed'));
  await begin(b,packer);
  const completed=settled(run(b,order[0],110,2,1,action.complete));
  await waitsForLock(b);
  await a.query('commit');
  assert.deepEqual((await completed).value,outcome(2,2,'packed'));
  await b.query('commit');
  await denied(asPacker(order[0],110,2,1,{...action.complete,grams:140}),'23505');
  const movement=await row(control,`select (select count(*)::int from quartermaster79.movement where order_id=$1) moves,
    (select remaining from quartermaster79.purchase where id=$2) remaining,
    (select actual_material_minor::int from quartermaster79.packing where order_id=$1) actual`,[order[0],purchases[0]]);
  assert.deepEqual(movement,{moves:1,remaining:0,actual:41});
  console.log('PASS stale ABA and generation rejection, replayed release, re-reservation, refund race and duplicate completion');

  await denied(asPacker(order[0],111,2,2,action.postage),'42501');
  for(let i=0;i<2;i++) assert.deepEqual(await use(a,cost,()=>run(a,order[0],111,2,2,action.postage)),outcome(2,3,'packed'));
  await control.query("update quartermaster79.rollout set mode='observe'");
  const evidence=await use(a,cost,()=>row(a,'select public.quartermaster84_review($1) as data',[order[0]]));
  assert.deepEqual(evidence.data.order.cost,{packagingActualMinor:41,postageEstimatedMinor:115,postageActualMinor:109});
  assert.equal(evidence.data.order.readyForReview,true);
  assert.deepEqual(await row(control,inspect),baseline);
  console.log('PASS separated costs, 84B read bridge, unchanged finance revisions and physical component stock');

  await asPacker(order[3],112,0,0,action.reserve('F-MANY'));
  await asPacker(order[3],113,1,0,action.pick(1));
  await b.query('begin');
  await b.query("update public.orders set status='dispatched' where id=$1",[order[3]]);
  const dispatch=settled(asPacker(order[3],114,1,1,{...action.complete,purchase:purchases[1],tracking:'FIXTURE-DISPATCH'}));
  await waitsForLock(a);
  await b.query('commit');
  assert.equal((await dispatch).error?.code,'23514');
  await control.query("update quartermaster84w.gate set mode='drain'");
  await denied(asPacker(order[1],117,0,0,action.reserve('F-MANY')),'42501');
  const drainContext=(await context(packer,order[2])).data.order;
  assert.equal(drainContext.canReserve,false);
  assert.equal(drainContext.canPick,false);
  assert.equal(drainContext.canRelease,true);
  assert.deepEqual(await asPacker(order[2],115,1,0,action.release),outcome(1,1,'released'));
  assert.deepEqual(await asPacker(order[3],116,1,1,action.release),outcome(1,2,'released'));
  assert.equal((await row(control,"select count(*)::int as n from quartermaster79.packing where state='reserved'")).n,0);
  const readReceipt = staff => use(a,staff,()=>row(a,'select public.quartermaster84w_command_result($1) as result',[uuid(110)]));
  assert.deepEqual((await readReceipt(packer)).result,outcome(2,2,'packed'));
  assert.equal((await readReceipt(cost)).result,null);
  console.log('PASS genuine dispatch contention, drain-only release and actor-scoped uncertain-command lookup');
} finally {
  await Promise.all([control,a,b].map(client=>client.end()));
}
