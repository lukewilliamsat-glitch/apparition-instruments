import ast,copy,json,hashlib,os,re,time,sys
from pathlib import Path
p=Path(sys.argv[1]);f=json.loads((p/'helper-fixture.json').read_text());plan=f['plan'];job=f['job'];a={x['id']:x for x in f['artifacts']};raw=(p/'failed-receipt.zip').read_bytes();known=plan['knownFailedPublications'][1]
def require(ok,msg):
 if not ok:raise ValueError(msg)
env={'require':require,'strict_json':json.loads,'sha':lambda b:hashlib.sha256(b).hexdigest()};exec((p/'restored-helper.py').read_text(),env);verify=env['restored_publication'];read=lambda k:a[int(k.split('/')[-1])];assert verify(plan,known,job,read,lambda:raw)['payloadDigest']==plan['basePayloadDigest'];n=1
for name in [known['deployStep'],known['restoreStep'],'Independently read back the retained complete rollback','Verify every retained rollback file and its exact payload identity']:
 bad=copy.deepcopy(job)
 for step in bad['steps']:
  if step['name']==name:step['conclusion']='skipped'
 try:verify(plan,known,bad,read,lambda:raw);raise AssertionError('Unproven restoration accepted')
 except ValueError:n+=1
for key,val in [('digest','sha256:'+'0'*64),('expired',True),('size_in_bytes',1),('workflow_run',{'id':1,'head_sha':known['source']})]:
 b=copy.deepcopy(a);b[12745263557][key]=val
 try:verify(plan,known,job,lambda k:b[int(k.split('/')[-1])],lambda:raw);raise AssertionError('Artifact drift accepted')
 except ValueError:n+=1
try:verify(plan,known,job,read,lambda:raw[:-1]);raise AssertionError('Tampered receipt accepted')
except ValueError:n+=1
bad=copy.deepcopy(plan);bad['basePayloadDigest']='0'*64
try:verify(bad,known,job,read,lambda:raw);raise AssertionError('Different baseline accepted')
except ValueError:n+=1
bad=copy.deepcopy(known);bad['runId']=1
try:verify(plan,bad,job,read,lambda:raw);raise AssertionError('Unknown restoration accepted')
except ValueError:n+=1
# Exercise the actual preflight history loop with actual deployment/status/job snapshots.
s=ast.parse((p/'publisher-recovered.py').read_text());node=next(x for x in s.body if isinstance(x,ast.FunctionDef)and x.name=='preflight');records=json.loads((p/'current-deployments.json').read_text())['deployments'];other=json.loads((p/'preflight-failed-job.json').read_text());source='4da0fb6d9294c713e6fed706d1178e758e167cd4';os.environ.update(GITHUB_REPOSITORY='lukewilliamsat-glitch/apparition-instruments',GITHUB_REF='refs/heads/main',GITHUB_SHA=source,GITHUB_RUN_ID='99999999999')
cache={'/git/ref/heads/main':{'object':{'sha':source}},'/pages':{'build_type':'workflow','html_url':'https://apparitioninstruments.co.uk','https_enforced':True},'/deployments?environment=github-pages&per_page=10':records,'/actions/jobs/122283922788':job,'/actions/jobs/122346434460':other}
for d in records:cache['/deployments/'+str(d['id'])+'/statuses?per_page=1']=d['statuses'][:1]
for k in plan['knownFailedPublications']:cache['/actions/runs/'+str(k['runId'])]={'status':'completed','conclusion':'failure','head_sha':k['source']}
for st in ['in_progress','queued','waiting','pending','requested']:cache['/actions/runs?status='+st+'&per_page=10']={'workflow_runs':[]}
for aid,item in a.items():cache['/actions/artifacts/'+str(aid)]=item
env.update(os=os,re=re,time=time,REPOSITORY='lukewilliamsat-glitch/apparition-instruments',SITE='https://apparitioninstruments.co.uk',get_bytes=lambda *args:None,unified_native_evidence=lambda *args:None,verify_live=lambda p,*args:{'result':'PASS'},operations=lambda p:None)
env['restored_publication']=lambda p,k,j,read:verify(p,k,j,read,lambda:raw);exec(compile(ast.Module(body=[node],type_ignores=[]),'actual-preflight','exec'),env)
r=env['preflight'](plan,get=lambda k:cache[k]);assert r['base']['id']==7362511613 and r['reconciledTerminalOrSkippedRuns']==[40531133959,40548752980];n+=1
for change in ['unknown','wrongJob','wrongDeployment']:
 b=copy.deepcopy(cache)
 if change=='unknown':b['/deployments?environment=github-pages&per_page=10'][0]['sha']='0'*40
 if change=='wrongJob':b['/deployments/7362675635/statuses?per_page=1'][0]['log_url']=b['/deployments/7362675635/statuses?per_page=1'][0]['log_url'].replace('122283922788','999')
 if change=='wrongDeployment':b['/deployments?environment=github-pages&per_page=10'][1]['id']=7362675636;b['/deployments/7362675636/statuses?per_page=1']=b['/deployments/7362675635/statuses?per_page=1']
 try:env['preflight'](plan,get=lambda k:b[k]);raise AssertionError('Unknown deployment accepted')
 except ValueError:n+=1
out={'passed':True,'targetedPublisherGroups':n,'reconciledEnvironmentRecords':[7365302103,7362675635],'successfulBaselineDeployment':7362511613,'payloadDigest':plan['basePayloadDigest'],'applicationPayloadChanged':False};(p/'recovery-test-result.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
