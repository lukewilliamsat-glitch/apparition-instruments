import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {Client}=createRequire(import.meta.url)(process.env.QUARTERMASTER_PG_MODULE);
const host=process.env.QUARTERMASTER_PG_HOST;
assert.equal(host,'127.0.0.1');
const options={host,port:Number(process.env.QUARTERMASTER_PG_PORT),user:'postgres',database:'quartermaster84w_fixture'};
const db=new Client(options);
await db.connect();
const file=path=>readFile(path,'utf8');
const value=async(sql,args)=>Object.values((await db.query(sql,args)).rows[0])[0];
const actor=n=>'a0000000-0000-4000-8000-00000000000'+n;
const uid=n=>'85000000-0000-4000-8000-'+String(n).padStart(12,'0');
const [order,other]=[1,2].map(n=>'84000000-0000-4000-8000-00000000001'+n);
const supplier='84000000-0000-4000-8000-000000000001';
async function call(seat,sql,args,role='authenticated'){
  await db.query('begin');
  try {
    await db.query('set local role '+role);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[seat?actor(seat):'']);
    return await value(sql,args);
  } finally {
    await db.query('rollback');
  }
}
async function write(seat,sql,args){
  await db.query('begin');
  try {
    await db.query('set local role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[actor(seat)]);
    const result=await value(sql,args);
    await db.query('commit');
    return result;
  } catch(e) { await db.query('rollback'); throw e; }
}
try {
  await db.query(await file('quartermaster84c/test/stage-prerequisites.sql'));
  const stageA=await file('iron-discipline-84a/tests/dominion78c/ironheart80-stage-a.review.sql');
  await db.query(stageA.slice(stageA.indexOf('create schema dominion79;'),stageA.lastIndexOf('commit;')));
  for(const path of ['iron-discipline-84a/tests/stageb81/stageb81.read.review.sql','iron-discipline-84a/tests/quartermaster84/observe.review.sql']){
    const source=await file(path);
    // Prior release preflights depend on unrelated production objects. Use their exact installed bodies.
    const start=source.indexOf('create function ');
    assert.ok(start>=0);
    await db.query(source.slice(start,source.lastIndexOf('commit;')));
  }
  await db.query("update quartermaster79.rollout set mode='observe' where singleton");
  const install=await file('quartermaster84d/.build/install.sql');
  const access='select public.quartermaster84d_access()';
  await db.query("insert into public.admin_members(user_id) values($1),($2) on conflict do nothing",[actor(2),actor(3)]);
  await db.query("update quartermaster79.rollout set mode='disabled' where singleton");
  await assert.rejects(db.query(install),/Unexpected release baseline/);
  await db.query('rollback');
  assert.equal(await value("select to_regnamespace('quartermaster84w')"),null);
  await db.query("update quartermaster79.rollout set mode='observe' where singleton");
  await db.query(install);
  assert.equal(await value('select count(*)::int from quartermaster84w.staff'),0);
  assert.deepEqual(await call(2,access),{mode:'disabled',packing:false,receive:false,finance:false});
  for(const role of ['anon','service_role']) await assert.rejects(call(null,access,[],role),{code:'42501'});
  await assert.rejects(call(1,access),{code:'42501'});
  await assert.rejects(call(2,'select count(*) from quartermaster84w.staff'),{code:'42501'});
  await assert.rejects(call(2,"select quartermaster79.saved_bom('[]')"),{code:'42501'});
  const fixture=(await file('quartermaster84c/db/seed.sql')).split('-- Distinct seats')[0]
    .split('\n').filter(l=>!l.includes('quartermaster84c')).join('\n').replace(/^select \('84000000-0000-4000-8000-00000000001'\|\|n\)::uuid from generate_series\(1,4\) n;$/m,'');
  await db.query(fixture);
  await db.query("insert into quartermaster84w.staff values($1,true,true,true,true),($2,true,false,false,false)",[actor(2),actor(3)]);
  const receive=(seq,ref)=>write(2,'select public.quartermaster84w_receive($1,$2,$3,$4,1,40)',[uid(seq),'84C-MAILER',supplier,ref]);
  await assert.rejects(receive(20,'84D-REHEARSAL'),{code:'42501'});
  await db.query("update quartermaster84w.gate set mode='workshop' where singleton");
  assert.equal(await receive(20,'84D-REHEARSAL'),true);
  assert.equal(await receive(20,'84D-REHEARSAL'),false);
  assert.equal((await call(2,'select public.quartermaster84d_suppliers()')).length,1);
  await assert.rejects(call(3,'select public.quartermaster84d_suppliers()'),{code:'42501'});
  const pack=(id,n,generation,revision,action)=>write(2,'select public.quartermaster84w_pack($1,$2,$3,$4,$5)',[id,uid(n),generation,revision,action]);
  await pack(order,1,0,0,{kind:'reserve',sku:'84C-MAILER'});
  await pack(order,2,1,0,{kind:'pick',component:'fixture-staging-pot',quantity:2});
  await assert.rejects(pack(order,3,1,0,{kind:'release'}),{code:'40001'});
  const complete={kind:'complete',purchase:uid(20),mm:[40,30,20],grams:75,format:'large-letter',estimate:130};
  const packed=await pack(order,4,1,1,complete);
  assert.deepEqual(await pack(order,4,1,1,complete),packed);
  await pack(order,5,1,2,{kind:'postage',minor:115,receipt:'84D-REHEARSAL'});
  const proposal='select public.quartermaster84d_finance_proposal($1)';
  assert.equal((await call(2,proposal,[order])).state,'needs-record');
  await assert.rejects(call(3,proposal,[order]),{code:'42501'});
  const basis=(await call(2,'select public.command63_financial_read($1)',[order])).orderBasisHash;
  const doc={policyVersion:'marketplace-contribution-v2',currency:'GBP',paymentBreakdownBasis:'customer_gross',
    actualPaidMinor:1000,postageMinor:0,marketplaceTaxMinor:0,marketplaceTaxState:'confirmed',marketplaceTaxSource:'Rehearsal',
    discount:{kind:'none',minor:0,percentage:''},
    lines:[{id:'line-0',label:'84C fixture potentiometer',productId:'fixture-staging-pot',quantity:2,unitPriceMinor:500,
      priceBasis:'net',discountMinor:0,unitCostMicro:250000,costState:'confirmed',costSource:'Rehearsal'}],
    fees:[],feesComplete:true,costs:{packaging:{minor:0,state:'confirmed',source:'Rehearsal'},shipping:{minor:0,state:'confirmed',source:'Rehearsal'},other:{minor:0,state:'confirmed',source:'Rehearsal'},labour:{state:'excluded'}},
    tax:{state:'not_applicable',minor:null,source:'Rehearsal'},settlement:{minor:null,state:'unknown',source:'',adjustmentMinor:0,adjustmentSource:''},
    adjustments:[]};
  assert.equal((await write(2,'select public.command63_financial_save($1,0,$2,$3,$4)',[order,basis,uid(30),doc])).revision,1);
  const p=await call(2,proposal,[order]);
  assert.equal(p.state,'ready');assert.equal(p.packaging,40);assert.equal(p.postage,115);
  assert.ok(!('document' in p));
  const save=(request,evidence=p.evidence)=>write(2,'select public.quartermaster84d_finance_save($1,$2,$3,$4,$5)',[order,p.revision,p.basis,evidence,uid(request)]);
  await assert.rejects(save(31,'a'.repeat(64)),{code:'40001'});
  assert.equal((await save(32)).revision,2);
  assert.equal((await save(32)).revision,2);
  await assert.rejects(save(33),{code:'40001'});
  assert.equal((await call(2,proposal,[order])).state,'already-recorded');
  const report=await call(2,"select row from jsonb_array_elements(public.omniscience74_orders(current_date,current_date,null,null)->'rows') row where row->>'id'=$1::text",[order]);
  assert.equal(report.finance.costs.packaging.minor,40);assert.equal(report.finance.costs.shipping.minor,115);
  assert.equal(await value("select count(*)::int from quartermaster79.movement where kind='packed'"),1);
  assert.equal(await value('select count(*)::int from public.order_financial_revisions'),2);
  assert.equal(await value("select quantity::int from public.inventory where component_id='fixture-staging-pot'"),99);
  await receive(21,'84D-DRAIN');
  await pack(other,6,0,0,{kind:'reserve',sku:'84C-MAILER'});
  await db.query(await file('quartermaster84d/drain.sql'));
  await assert.rejects(receive(22,'DENIED'),{code:'42501'});
  await assert.rejects(db.query(await file('quartermaster84d/finish-drain.sql')),/outstanding reservations/);
  await db.query('rollback');
  await pack(other,7,1,0,{kind:'release'});
  await db.query(await file('quartermaster84d/finish-drain.sql'));
  assert.equal((await call(2,access)).mode,'disabled');
  assert.equal((await call(2,'select public.dominion81_status()')).quartermaster.mode,'observe');
  assert.equal(await value('select count(*)::int from public.order_financial_revisions'),2);
  console.log('PASS dormant upgrade, granular denials, owner workflow, exactly-once costs, ECLIPSE/OMNISCIENCE and drain');
} finally { await db.end(); }
