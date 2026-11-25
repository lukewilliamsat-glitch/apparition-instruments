import assert from 'node:assert/strict';

const read = 'select public.quartermaster86_page($1,$2,$3,$4,$5,$6,$7)';
const register = 'select public.quartermaster86_register($1,$2,$3,$4,$5,$6,$7)';
const args = (section,{q='',filter='all',sort='newest',page=0,sku=null,supplier=null}={})=>[section,q,filter,sort,page,sku,supplier];
export async function testBeforePacking({db,call,write,actor}) {
  await db.query('insert into public.admin_members(user_id) values($1)',[actor(4)]);
  const page=(section,opts,member=2)=>call(member,read,args(section,opts));
  const overview=await page('overview');
  assert.ok(overview.totals.awaiting>=2);
  assert.equal(overview.totals.available,0);
  assert.equal((await page('queue')).rows[0].stage,'awaiting');
  for(const [role,member] of [['authenticated',1],['authenticated',4],['anon',null],['service_role',null]])
    await assert.rejects(call(member,read,args('overview'),role),{code:'42501'});
  for(const area of ['suppliers','purchasing','choices'])
    await assert.rejects(page(area,{},3),{code:'42501'});
  await assert.rejects(call(2,'select * from quartermaster86.stock'),{code:'42501'});
  await assert.rejects(page('packaging',{page:400}),{code:'22023'});
  const packArgs=['86-MAILER','Component mailer',[30,20,9],[34,24,13],10,2,'Letterbox packaging'];
  await assert.rejects(write(2,register,packArgs),{code:'42501'});
  await db.query("update quartermaster84w.gate set mode='workshop' where singleton");
  await assert.rejects(write(3,register,packArgs),{code:'42501'});
  assert.equal(await write(2,register,packArgs),true);
  assert.equal(await write(2,register,packArgs),false);
  await assert.rejects(write(2,register,[...packArgs.slice(0,-1),'Changed description']),{code:'23505'});
  const matching=await page('packaging',{q:'component',filter:'low'});
  assert.deepEqual(matching.rows.map(r=>[r.sku,r.description,r.available,r.reserved]),[['86-MAILER','Letterbox packaging',0,0]]);
  await db.query("update quartermaster84w.gate set mode='disabled' where singleton");
}
export async function testAfterPacking({db,call,order,supplier}) {
  const page=(section,opts,member=2)=>call(member,read,args(section,opts));
  const queue=await page('queue',{filter:'packed'});
  const packed=queue.rows.find(o=>o.id===order);
  assert.equal(packed.postage_recorded,true);
  assert.equal(packed.finance,'approved');
  assert.equal(packed.picked,packed.required);
  assert.equal(Object.hasOwn(packed,'customer'),false);
  assert.equal((await page('queue',{filter:'packed'},3)).rows[0].finance,null);
  const history=await page('purchasing',{supplier,sku:'84C-MAILER'});
  assert.equal(history.rows[0].total_minor,40);
  assert.equal(history.rows[0].remaining,0);
  assert.equal((await page('suppliers')).rows[0].purchases,1);
  assert.equal((await page('packaging',{sku:'84C-MAILER'},3)).rows[0].latest_batch_minor,null);
  const eventTypes=(await page('activity')).rows.map(r=>r.kind);
  for(const event of ['receipt','reservation','pack','postage','finance']) assert.ok(eventTypes.includes(event),event);
  const dashboard=await page('overview');
  assert.equal(dashboard.totals.packed,1);
  assert.ok(dashboard.rows.length<=5);
  await db.query(`insert into quartermaster79.material
    select '86-PAGE-'||n,'Pagination '||n,2,0,array[30,20,9],array[34,24,13],10 from generate_series(1,29) n`);
  const first=await page('packaging',{q:'86-PAGE'});
  const second=await page('packaging',{q:'86-PAGE',page:1});
  assert.equal(first.rows.length,25);
  assert.equal(first.has_more,true);
  assert.equal(second.rows.length,4);
  assert.equal(second.has_more,false);
  assert.ok(!second.rows.some(r=>first.rows.some(old=>old.sku===r.sku)));
  console.log('PASS 86 role boundaries, all seven GET sections in read-only transactions, queue, histories and pagination');
}
