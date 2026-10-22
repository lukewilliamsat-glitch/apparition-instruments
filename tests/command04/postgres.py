"""Disposable PostgreSQL verification. Unix socket only, no service credentials or HTTP."""
from pathlib import Path
import os,sys,json,subprocess,time
from concurrent.futures import ThreadPoolExecutor
out=Path(sys.argv[1]); socket=Path(sys.argv[2]); bindir=Path(sys.argv[3]); dbuser=sys.argv[4]
assert socket.is_absolute() and socket.is_dir() and str(socket).startswith(str(out.resolve()))
assert json.loads((out/'STAGE_A_RESULTS.json').read_text())['status']=='PASS'
env={'PATH':str(bindir)+':/usr/bin:/bin','LANG':'C.UTF-8','PGHOST':str(socket),'PGPORT':'55439','PGDATABASE':'postgres','PGUSER':dbuser,'HOME':str(out)}
roles={'ic_alice','ic_bob','ic_reader','ic_stranger','ic_anon'}
def call(sql,role=None,ok=True):
 assert role is None or role in roles
 p=subprocess.run([str(bindir/'psql'),'-X','-q','-A','-t','-v','ON_ERROR_STOP=1'],input=sql,text=True,capture_output=True,env={**env,'PGUSER':role or dbuser},timeout=25)
 if ok: assert p.returncode==0,p.stderr
 else: assert p.returncode!=0,'Unexpected SQL success'
 return p.stdout.strip() if ok else p.stderr
q=lambda x:"'"+x.replace("'","''")+"'"
jq=lambda v:q(json.dumps(v,separators=(',',':')))+'::jsonb'
def decoded(sql,role='ic_alice'):return json.loads(call(sql,role))
def read(pid='fx-pot-01',role='ic_alice'):return decoded('SELECT ironclad_fixture.read_product('+q(pid)+');',role)
seq=0
def cmd(patch=None,pid='fx-pot-01',revision=None,**extra):
 global seq;seq+=1
 c={'protocol':'command04-v1','operationId':'ironclad-op-pg-'+str(seq),'id':pid,'expectedRevision':revision or read(pid)['revision'],'patch':patch or {'name':'Reviewed PG fixture '+str(seq)}}
 c.update(extra);return c
def mutate(c,role='ic_alice'):return decoded('SELECT ironclad_fixture.mutate('+jq(c)+');',role)
def deny(c,pattern,role='ic_alice'):
 error=call('SELECT ironclad_fixture.mutate('+jq(c)+');',role,False);assert pattern in error,error

def snapshot():return call("SELECT md5(string_agg(x,'' ORDER BY x)) FROM (SELECT row_to_json(p)::text x FROM ironclad_fixture.products p UNION ALL SELECT row_to_json(p)::text FROM ironclad_fixture.inventory p UNION ALL SELECT row_to_json(p)::text FROM ironclad_fixture.internal_cost p UNION ALL SELECT row_to_json(p)::text FROM ironclad_fixture.operations p UNION ALL SELECT row_to_json(p)::text FROM ironclad_fixture.audit p) s;")
results=[]
def test(name,fn):
 try:fn();results.append({'name':name,'status':'PASS'})
 except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)})
call(Path('tests/command04/postgres-fixture.sql').read_text())
call("INSERT INTO ironclad_fixture.principals VALUES ('ic_alice','synthetic-a',true,clock_timestamp()+interval '1 day',true,true,true,true),('ic_bob','synthetic-b',true,clock_timestamp()+interval '1 day',true,true,false,false),('ic_reader','synthetic-reader',true,clock_timestamp()+interval '1 day',true,false,false,false);")
seed=json.loads((out/'PG_SEED.json').read_text())
for r in seed:
 body={k:v for k,v in r.items() if k not in ['privateCost','imageData','stock','stockUnit','revision']}
 for k in ['salePrice','kitPrice','kitPriceQuantity']:body.setdefault(k,None)
 call('INSERT INTO ironclad_fixture.products VALUES ('+q(r['id'])+','+jq(body)+',1,'+q(r['imageData'])+'); INSERT INTO ironclad_fixture.inventory VALUES ('+q(r['id'])+','+str(r.get('stock') or 0)+','+q(r['stockUnit'])+'); INSERT INTO ironclad_fixture.internal_cost VALUES ('+q(r['id'])+',123);')

def security():
 assert call("SELECT count(*) FROM pg_class WHERE relnamespace='ironclad_fixture'::regnamespace AND relkind='r' AND relrowsecurity AND relforcerowsecurity;")=='6'
 assert call("SELECT count(*) FROM pg_roles WHERE rolname='ic_owner' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls;")=='1'
 assert call("SELECT count(*) FROM pg_proc WHERE pronamespace='ironclad_fixture'::regnamespace AND prosecdef AND proowner='ic_owner'::regrole AND proconfig=ARRAY['search_path=pg_catalog'];")=='3'
 for role in roles:
  assert call("SELECT bool_or(has_table_privilege("+q(role)+",oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')) FROM pg_class WHERE relnamespace='ironclad_fixture'::regnamespace AND relkind='r';")=='f'
 assert call("SELECT has_function_privilege('ic_alice','ironclad_fixture.record_for(text)','EXECUTE');")=='f'
 assert call("SELECT has_function_privilege('ic_anon','ironclad_fixture.mutate(jsonb)','EXECUTE');")=='f'
test('roles, FORCE RLS, private tables, fixed definer contexts and grants',security)
test('anonymous denied',lambda:call("SELECT ironclad_fixture.read_product('fx-pot-01');",'ic_anon',False))
test('non-member authenticated role denied',lambda:call("SELECT ironclad_fixture.read_product('fx-pot-01');",'ic_stranger',False))
test('read-only member reads but cannot mutate',lambda:(read(role='ic_reader'),deny(cmd(),'PERMISSION','ic_reader')))
test('caller role and capability claims cannot be spoofed',lambda:deny(dict(cmd(),actor='synthetic-a',capabilities={'productWrite':True}),'VALIDATION'))
test('caller cannot impersonate another DB session',lambda:call('SET SESSION AUTHORIZATION ic_alice;', 'ic_bob',False))
test('ordinary caller cannot assume owner role',lambda:call('SET ROLE ic_owner;','ic_alice',False))
test('caller GUC does not grant membership',lambda:call("SET request.jwt.claim.sub='synthetic-a'; SELECT ironclad_fixture.read_product('fx-pot-01');",'ic_stranger',False))

def atomic():
 old=read();c=cmd({'name':'Atomic PostgreSQL fixture','salePrice':899},inventory={'mode':'adjust','value':3,'expectedQuantity':old['stock']},internalCost=145);r=mutate(c)
 assert r['record']['revision']=='sim-2' and r['record']['stock']==old['stock']+3
 assert call("SELECT unit_cost FROM ironclad_fixture.internal_cost WHERE component_id='fx-pot-01';")=='145'
 assert call("SELECT before_cost||':'||after_cost FROM ironclad_fixture.audit WHERE operation_id="+q(c['operationId'])+';')=='123:145'
 assert call("SELECT source_image FROM ironclad_fixture.products WHERE id='fx-pot-01';")=='preserved-synthetic-original'
 assert not any(x in json.dumps(r) for x in ['privateCost','source_image','imageData','unit_cost'])
 global committed;committed=c
test('atomic three-record write, revision, receipt, audit and original image',atomic)
# Helpers keep test output compact and fail loudly.
def equal(a,b):assert a==b,(a,b)
test('identical committed retry is idempotent',lambda:equal(mutate(committed)['record']['revision'],'sim-2'))
test('different payload under same operation ID denied',lambda:deny(dict(committed,patch={'name':'Changed'}),'IDEMPOTENCY'))
test('same operation ID on different product denied',lambda:deny(dict(committed,id='fx-cap-01'),'IDEMPOTENCY'))
test('canonical JSON key ordering preserves replay',lambda:equal(mutate(dict(reversed(list(committed.items())))),mutate(committed)))
test('old revision cannot overwrite newer product',lambda:deny(cmd(revision='sim-1'),'CONFLICT'))
test('other actor cannot read receipt',lambda:equal(decoded('SELECT ironclad_fixture.operation_status('+q(committed['operationId'])+');','ic_bob'),{'status':'unknown'}))
test('missing receipt remains unknown',lambda:equal(decoded("SELECT ironclad_fixture.operation_status('ironclad-op-unknown');"),{'status':'unknown'}))
test('reconciliation proves committed response loss',lambda:equal(decoded('SELECT ironclad_fixture.operation_status('+q(committed['operationId'])+');')['result'],mutate(committed)))
for field in ['id','stock','stockUnit','image','imageData','imageInfo','privateCost','revision','specs','category']:
 test('protected field '+field,lambda field=field:deny(cmd({field:'forbidden'}),'VALIDATION'))
for name,patch in [('fractional pence',{'salePrice':1.5}),('negative price',{'salePrice':-1}),('oversize price',{'salePrice':2147483648}),('bad boolean',{'active':'true'}),('blank SKU',{'sku':' '}),('zero kit quantity',{'kitPriceQuantity':0}),('long description',{'description':'x'*5001})]:
 test('validation '+name,lambda patch=patch:deny(cmd(patch),'VALIDATION'))
test('non-string product ID rejected',lambda:deny(dict(cmd(),id=123),'VALIDATION'))
test('inventory capability independent',lambda:deny(cmd(inventory={'mode':'set','expectedQuantity':read()['stock'],'value':4}),'PERMISSION','ic_bob'))
test('cost capability independent',lambda:deny(cmd(internalCost=90),'PERMISSION','ic_bob'))
test('stock expected value conflict',lambda:deny(cmd(inventory={'mode':'set','expectedQuantity':9999,'value':4}),'CONFLICT'))
test('negative stock result denied',lambda:deny(cmd(inventory={'mode':'adjust','expectedQuantity':read()['stock'],'value':-9999}),'VALIDATION'))
test('missing product fails closed',lambda:deny(cmd(pid='missing',revision='sim-1'),'MISSING'))

def fault(table):
 before=snapshot(); call("CREATE FUNCTION ironclad_fixture.test_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC TRANSACTION FAILURE'; END $$; CREATE TRIGGER injected_failure BEFORE "+('INSERT' if table in ['audit','operations'] else 'UPDATE')+' ON ironclad_fixture.'+table+' FOR EACH ROW EXECUTE FUNCTION ironclad_fixture.test_fault();')
 try:
  deny(cmd(inventory={'mode':'set','expectedQuantity':read()['stock'],'value':8},internalCost=181),'SYNTHETIC TRANSACTION FAILURE');equal(snapshot(),before)
 finally:call('DROP TRIGGER injected_failure ON ironclad_fixture.'+table+'; DROP FUNCTION ironclad_fixture.test_fault();')
for table in ['products','inventory','internal_cost','operations','audit']:test('statement failure rolls back complete transaction at '+table,lambda table=table:fault(table))

def concurrent(identical=False,sku=False):
 a=cmd({'sku':'CONCURRENT-SKU'} if sku else {'description':'Concurrent A'})
 b=a if identical else cmd({'sku':'concurrent-sku'} if sku else {'description':'Concurrent B'},pid='fx-cap-01' if sku else a['id'])
 def run(c):
  try:return True,call('BEGIN; SELECT ironclad_fixture.mutate('+jq(c)+'); SELECT pg_sleep(0.3); COMMIT;','ic_alice')
  except Exception as e:return False,str(e)
 with ThreadPoolExecutor(max_workers=2) as pool:r=list(pool.map(run,[a,b]))
 equal(sum(x[0] for x in r),2 if identical else 1)
 equal(call('SELECT count(*) FROM ironclad_fixture.operations WHERE actor=\'synthetic-a\' AND operation_id IN ('+q(a['operationId'])+','+q(b['operationId'])+');'),'1')
test('concurrent duplicate operation commits only once',lambda:concurrent(identical=True))
test('concurrent same-revision different operations conflict',concurrent)
test('concurrent cross-product casefold SKU uniqueness',lambda:concurrent(sku=True))

def rollback_outer():
 before=snapshot();call('BEGIN; SELECT ironclad_fixture.mutate('+jq(cmd())+'); SELECT 1/0; COMMIT;','ic_alice',False);equal(snapshot(),before)
test('outer transaction failure rolls back receipt, audit and records',rollback_outer)

def interrupted():
 before=snapshot();c=cmd();script="SET application_name='ironclad-disposable-interruption'; BEGIN; SELECT ironclad_fixture.mutate("+jq(c)+'); SELECT pg_sleep(15); COMMIT;'
 proc=subprocess.Popen([str(bindir/'psql'),'-X','-q','-A','-t','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env={**env,'PGUSER':'ic_alice'})
 proc.stdin.write(script);proc.stdin.close();pid=''
 try:
  for _ in range(50):
   pid=call("SELECT pid FROM pg_stat_activity WHERE application_name='ironclad-disposable-interruption' AND wait_event='PgSleep';")
   if pid:break
   time.sleep(.05)
  assert pid.isdigit(),'Held disposable transaction not found'
  equal(decoded('SELECT ironclad_fixture.operation_status('+q(c['operationId'])+');'),{'status':'unknown'})
  equal(call('SELECT pg_terminate_backend('+pid+" ) FROM pg_stat_activity WHERE pid="+pid+" AND application_name='ironclad-disposable-interruption';"),'t')
  proc.wait(timeout=5);assert proc.returncode!=0;equal(snapshot(),before)
 finally:
  if proc.poll() is None:proc.terminate();proc.wait(timeout=5)
test('terminated backend rolls back all state; in-flight absence is unknown',interrupted)

def revocation():
 call("UPDATE ironclad_fixture.principals SET enabled=false WHERE role_name='ic_alice';")
 try:deny(committed,'PERMISSION');call("SELECT ironclad_fixture.operation_status('"+committed['operationId']+"');",'ic_alice',False)
 finally:call("UPDATE ironclad_fixture.principals SET enabled=true WHERE role_name='ic_alice';")
test('revoked authority cannot write, replay or reconcile',revocation)
def expiry_wait():
 c=cmd();before=snapshot();lock_sql="SET application_name='ironclad-expiry-lock'; BEGIN; SELECT pg_advisory_xact_lock(hashtextextended('synthetic-a:"+c['operationId']+"',0)); SELECT pg_sleep(1.5); COMMIT;"
 proc=subprocess.Popen([str(bindir/'psql'),'-X','-q','-A','-t','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=env)
 proc.stdin.write(lock_sql);proc.stdin.close()
 try:
  for _ in range(40):
   if call("SELECT count(*) FROM pg_stat_activity WHERE application_name='ironclad-expiry-lock' AND wait_event='PgSleep';")=='1':break
   time.sleep(.025)
  else:raise AssertionError('Fixture operation lock not held')
  call("UPDATE ironclad_fixture.principals SET expires_at=clock_timestamp()+interval '0.3 second' WHERE role_name='ic_alice';")
  deny(c,'PERMISSION');equal(snapshot(),before);proc.wait(timeout=5)
 finally:
  if proc.poll() is None:proc.terminate();proc.wait(timeout=5)
  call("UPDATE ironclad_fixture.principals SET expires_at=clock_timestamp()+interval '1 day' WHERE role_name='ic_alice';")
test('authority expiry during advisory-lock wait denies mutation',expiry_wait)


def expiry():
 call("UPDATE ironclad_fixture.principals SET expires_at=clock_timestamp()-interval '1 second' WHERE role_name='ic_alice';")
 try:deny(cmd(revision=read(role='ic_bob')['revision']),'PERMISSION')
 finally:call("UPDATE ironclad_fixture.principals SET expires_at=clock_timestamp()+interval '1 day' WHERE role_name='ic_alice';")
test('expired authority denied',expiry)
for table in ['audit','operations']:
 for action in ['UPDATE','DELETE','TRUNCATE']:
  sql=("UPDATE ironclad_fixture."+table+" SET actor=actor WHERE actor='synthetic-a';") if action=='UPDATE' else ("DELETE FROM ironclad_fixture."+table+" WHERE actor='synthetic-a';") if action=='DELETE' else 'TRUNCATE ironclad_fixture.audit,ironclad_fixture.operations;'
  test('immutable '+table+' '+action,lambda sql=sql:call('SET ROLE ic_owner; '+sql,ok=False))
test('client cannot directly write protected product/inventory',lambda:(call("UPDATE ironclad_fixture.inventory SET quantity=0 WHERE component_id='fx-pot-01';",'ic_alice',False),call("UPDATE ironclad_fixture.products SET revision=1 WHERE id='fx-pot-01';",'ic_alice',False)))
test('foreign keys restrict deletion, no cascade',lambda:(equal(call("SELECT count(*) FROM pg_constraint WHERE connamespace='ironclad_fixture'::regnamespace AND contype='f' AND confdeltype NOT IN ('a','r');"),'0'),call("DELETE FROM ironclad_fixture.products WHERE id='fx-pot-01';",ok=False)))
report={'status':'PASS' if all(x['status']=='PASS' for x in results) else 'FAIL','postgres':call('SELECT version();'),'total':len(results),'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results),'results':results,'transport':'Unix socket only; server listen_addresses empty in loopback-only namespace','productionRequests':0,'scope':'Fresh disposable schema and login-role model. NOT current Supabase schema, RLS, JWT/session integration or production guarantees.'}
(out/'POSTGRES_RESULTS.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='results'}));print(json.dumps([x for x in results if x['status']=='FAIL']))
sys.exit(bool(report['failed']))
