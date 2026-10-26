#!/usr/bin/env python3
"""Immutable frontend publication using the established archive/transport boundaries.

No generators, business-record reads, writes, retries or hidden fallback. Operations
uses the existing public read-only RPC once before publication and once after it.
"""
import argparse,hashlib,json,os,re,stat,time,urllib.request,urllib.error,urllib.parse
from datetime import datetime,timezone
from pathlib import Path
from archive_core import Payload,canonical,inventory,require,sha,strict_json,_read_tar,MAX_TAR
from compose import bounded_file
from frontend import get_bytes,NoRedirect
from transport import REPOSITORY

SITE='https://apparitioninstruments.co.uk'
FEATURES={'SPECTRE','LANTERN','SENTINEL'}

def plan_at(path):
    p=strict_json(bounded_file(path,262144))
    require(p.get('version')==1 and p.get('authority')=='AUTHORISATION_57' and p.get('feature') in FEATURES,'Wrong frontend authority/scope')
    require(p.get('siteURL')==SITE and p.get('commandReads') is False and p.get('commandWrites') is False,'Site or COMMAND activation mismatch')
    for key in ['baseTarSHA256','basePayloadDigest','candidateDigest','rollbackDigest']:
        require(re.fullmatch('[a-f0-9]{64}',p.get(key,'')),'Missing immutable payload identity')
    require(0<len(p.get('changes',[]))<=256,'Change limit')
    require(len({c['path'] for c in p['changes']})==len(p['changes']),'Duplicate delta path')
    return p

def tree_payload(root):
    root=Path(root);require(root.is_dir() and not root.is_symlink(),'Payload root missing')
    files={}
    for f in root.rglob('*'):
        require(not f.is_symlink(),'Payload link refused')
        if f.is_file():files[f.relative_to(root).as_posix()]=bounded_file(f,8*1024*1024)
        else:require(f.is_dir(),'Special payload entry refused')
    inventory(files);return Payload(files)

def write_tree(payload,root):
    root=Path(root);root.mkdir(mode=0o755,parents=False,exist_ok=False)
    for path,data in payload.files.items():
        f=root/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data);f.chmod(0o644)
    require(tree_payload(root).digest()==payload.digest(),'Written tree differs')

def cache_reference_only(c):
    if c.get('operation')!='replace' or not c.get('replacements'):return False
    for r in c['replacements']:
        before=urllib.parse.urlsplit(r['before']);after=urllib.parse.urlsplit(r['after'])
        if before.scheme or before.netloc or after.scheme or after.netloc:return False
        if before.path!=after.path or before.fragment!=after.fragment or not re.search(r'\.(?:mjs|js|css)$',before.path):return False
        old=urllib.parse.parse_qsl(before.query,keep_blank_values=True);new=urllib.parse.parse_qsl(after.query,keep_blank_values=True)
        if [x for x in old if x[0]!='build']!=[x for x in new if x[0]!='build']:return False
        builds=[value for key,value in new if key=='build']
        if len(builds)!=1 or not re.fullmatch('[a-f0-9]{40}',builds[0]) or not isinstance(r.get('count'),int) or r['count']<1:return False
    return True

def prepare(p,baseline,root,out):
    raw=bounded_file(Path(baseline)/'artifact.tar',MAX_TAR)
    require(sha(raw)==p['baseTarSHA256'],'Original baseline TAR changed')
    base=_read_tar(raw);require(base.digest()==p['basePayloadDigest'],'Complete baseline identity changed')
    files=dict(base.files);rollback=dict(base.files);changes=[]
    for c in p['changes']:
        path=c['path'];before=files.get(path)
        require(not path.startswith('supabase/'),'Backend delta refused')
        require(not path.startswith(('admin/','forge-pro/')) or cache_reference_only(c),'Unrelated privileged workspace delta refused')
        if p['feature']=='SPECTRE':require(path in {'customer-ui.css','index.html','operations/snapshot.json'},'SPECTRE delta exceeded')
        require((sha(before) if before is not None else None)==c['beforeSHA256'],'Delta preimage mismatch: '+path)
        if c['operation']=='source':
            require(c['source'].startswith('dist/') and '..' not in c['source'].split('/'),'Unapproved overlay source')
            data=bounded_file(Path(root)/c['source'],8*1024*1024)
        elif c['operation']=='replace':
            require(before is not None,'Reference target missing');data=before
            for r in c['replacements']:
                old=r['before'].encode();new=r['after'].encode()
                require(old and data.count(old)==r['count'],'Reference replacement preimage/count mismatch: '+path)
                data=data.replace(old,new)
        elif c['operation']=='operations-open':
            require(path=='operations/snapshot.json' and before is not None,'Only the known static Operations snapshot may change')
            data=bounded_file(Path(root)/c['source'],8192);old=strict_json(before);value=strict_json(data)
            require(set(old)==set(value) and old['news']==value['news'],'News or unrelated Operations structure changed')
            store=value['store'];expected=p['operationsEvidence']
            require(store['state']==store['desired_state']=='OPEN' and store['pause_from'] is None and store['resume_at'] is None,'Static OPEN correction required')
            require(store['updated_at']==expected['updated_at'],'Operations evidence identity changed')
            rollback[path]=data
        else:raise ValueError('Unsupported delta operation')
        require(sha(data)==c['afterSHA256'] and len(data)==c['bytes'],'Delta postimage mismatch: '+path)
        files[path]=data;changes.append({'path':path,'beforeSHA256':c['beforeSHA256'],'afterSHA256':sha(data),'bytes':len(data)})
    candidate=Payload(files);restore=Payload(rollback)
    require(candidate.digest()==p['candidateDigest'] and restore.digest()==p['rollbackDigest'],'Complete candidate/rollback identity mismatch')
    require({k for k in set(files)|set(base.files) if files.get(k)!=base.files.get(k)}=={c['path'] for c in p['changes']},'Unexplained payload delta')
    out=Path(out);out.mkdir(mode=0o700,exist_ok=False)
    write_tree(candidate,out/'candidate');write_tree(restore,out/'rollback')
    result={'feature':p['feature'],'baseDigest':base.digest(),'candidateDigest':candidate.digest(),'rollbackDigest':restore.digest(),'changedFiles':changes,'unchangedFiles':len(set(base.files)-{c['path'] for c in p['changes']}),'candidateFiles':len(files),'commandReads':False,'commandWrites':False}
    (out/'prepared.json').write_bytes(canonical(result));return result

def verify(p,folder,kind):
    root=Path(folder);require({f.name for f in root.iterdir()}=={'artifact.tar'},'Unexpected artifact envelope')
    raw=bounded_file(root/'artifact.tar',MAX_TAR);payload=_read_tar(raw)
    require(payload.digest()==p['candidateDigest' if kind=='candidate' else 'rollbackDigest'],'Uploaded complete inventory mismatch')
    return {'kind':kind,'tarSHA256':sha(raw),'tarBytes':len(raw),'payloadDigest':payload.digest(),'fileCount':len(payload.files),'inventory':payload.manifest()}

def verify_live(p,kind='candidate',get=get_bytes):
    mapping=p[{'candidate':'releaseVerification','rollback':'rollbackVerification','baseline':'baselineVerification'}[kind]]
    require(3<=len(mapping)<=8,'Bounded live verification map required')
    files=[];total=0
    for path,expected in mapping.items():
        require(path.startswith('/') and not path.startswith('//') and '..' not in path and '#' not in path,'Unsafe live path')
        raw=get(SITE+path+('&' if '?' in path else '?')+'release57='+expected[:12],262144)
        total+=len(raw);require(total<=1048576 and sha(raw)==expected,'Served payload differs: '+path)
        files.append({'path':path,'sha256':expected,'bytes':len(raw)})
    return {'result':'PASS','feature':p['feature'],'kind':kind,'requests':len(files),'bytes':total,'files':files}

def operations(p,get=None):
    if get:raw=get()
    else:
        config=Path('dist/backend/public-config.mjs').read_text()
        url=re.search("url:'([^']+)'",config)[1];key=re.search("publishableKey:'([^']+)'",config)[1]
        require(url=='https://acdxpxvksvdwfajntzfx.supabase.co','Unexpected public backend')
        request=urllib.request.Request(url+'/rest/v1/rpc/get_site_operations',data=b'{}',method='POST',headers={'apikey':key,'Content-Type':'application/json'})
        with urllib.request.build_opener(NoRedirect).open(request,timeout=5) as response:raw=response.read(8193)
    require(len(raw)<=8192,'Operations response bound')
    value=strict_json(raw);s=value.get('store',{});expected=p['operationsEvidence']
    require(s.get('state')==s.get('desired_state')=='OPEN' and s.get('pause_from') is None and s.get('resume_at') is None,'Authoritative Operations is not OPEN')
    require(s.get('updated_at')==expected['updated_at'],'Authoritative Operations changed; reconcile exact evidence')
    observed=value.get('server_time','');require(isinstance(observed,str) and len(observed)<=64,'Operations observation missing')
    require(abs((datetime.now(timezone.utc)-datetime.fromisoformat(observed)).total_seconds())<=300,'Operations timestamp is stale')
    return {'state':'OPEN','pause_from':None,'resume_at':None,'updated_at':s['updated_at'],'observedAt':observed,'bytes':len(raw),'sha256':sha(raw),'requests':1,'mutations':0}

def preflight(p,get=None,public_get=get_bytes,final=False,operation='release',restore_run=None):
    if p['feature']=='SENTINEL':
        decision=p.get('evidenceReuse',{}).get('interactionDecision')
        require(isinstance(decision,dict) and decision.get('status')=='OWNER_ACCEPTED' and decision.get('applicationSource')==p['applicationSource'],'SENTINEL interaction choice has not been supplied')
    require(os.environ.get('GITHUB_REPOSITORY')==REPOSITORY and os.environ.get('GITHUB_REF')=='refs/heads/main','Wrong repository/branch')
    source=os.environ.get('GITHUB_SHA','');run_id=os.environ.get('GITHUB_RUN_ID','');token=os.environ.get('GH_TOKEN','')
    require(re.fullmatch('[a-f0-9]{40}',source) and run_id.isdigit() and (token or get),'Trusted workflow identity required')
    calls=0;total=0;started=time.monotonic();cache={}
    def read(path):
        nonlocal calls,total
        if path in cache:return cache[path]
        calls+=1;require(calls<=40 and time.monotonic()-started<60,'Bounded GitHub preflight exhausted')
        raw=None
        if get:value=get(path)
        else:
            raw=get_bytes('https://api.github.com/repos/'+REPOSITORY+path,786432,{'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'})
            total+=len(raw);require(total<=4194304,'Metadata byte ceiling');value=strict_json(raw)
        cache[path]=value;return value
    require(read('/git/ref/heads/main').get('object',{}).get('sha')==source,'Current main changed')
    pages=read('/pages');require(pages.get('build_type')=='workflow' and pages.get('html_url','').rstrip('/')==SITE and pages.get('https_enforced') is True,'Pages target/settings changed')
    for state in ['in_progress','queued','waiting','pending','requested']:
        runs=read('/actions/runs?status='+state+'&per_page=10').get('workflow_runs')
        require(isinstance(runs,list) and len(runs)<10,'Pending workflow listing incomplete')
        require(all(str(r.get('id'))==run_id or r.get('head_branch')!='main' for r in runs),'Competing main workflow remains pending')
    records=read('/deployments?environment=github-pages&per_page=10');require(isinstance(records,list) and 0<len(records)<=10,'Deployment listing unavailable')
    expected_run=int(p['baseRunId']) if operation=='release' else int(restore_run or 0)
    expected_source=p['baseSource'] if operation=='release' else source
    known={str(x['runId']):x for x in p.get('knownFailedPublications',[])};excluded=[];base=None
    prefix='https://github.com/'+REPOSITORY+'/actions/runs/'
    for d in sorted(records,key=lambda v:v['id'],reverse=True):
        statuses=read('/deployments/'+str(d['id'])+'/statuses?per_page=1');require(len(statuses)==1,'Deployment status missing')
        s=statuses[0];log=s.get('log_url') or '';match=re.fullmatch(re.escape(prefix)+r'(\d+)(?:/job/(\d+))?',log)
        require(d.get('environment')=='github-pages' and match,'Unassociated deployment')
        prior_run,job=match.groups()
        if prior_run==run_id and d.get('sha')==source:continue
        if s.get('state')=='success':
            require(int(prior_run)==expected_run and d.get('sha')==expected_source,'Current active publication changed')
            base={'id':d['id'],'runId':int(prior_run),'source':d['sha']};break
        k=known.get(prior_run)
        require(k is not None and d.get('sha')==k['source'] and s.get('state')=='failure','Unknown or uncertain later deployment')
        prior=read('/actions/runs/'+prior_run)
        require(prior.get('status')=='completed' and prior.get('conclusion')=='failure' and prior.get('head_sha')==k['source'],'Prior failure is not completed/unchanged')
        actual=read('/actions/jobs/'+str(k['jobId']));require(actual.get('run_id')==int(prior_run) and actual.get('conclusion')=='failure','Failed job identity drift')
        steps={x['name']:x.get('conclusion') for x in actual.get('steps',[])}
        require(steps.get(k['deployStep'])==('skipped' if k['kind']=='preflight' else 'failure'),'Prior deploy outcome uncertain')
        require(steps.get(k['restoreStep'])=='skipped','Prior restore outcome uncertain')
        if k['kind']=='terminal':
            if get:content=read('/__test_log/'+str(k['jobId']))
            else:
                url='https://api.github.com/repos/'+REPOSITORY+'/actions/jobs/'+str(k['jobId'])+'/logs'
                request=urllib.request.Request(url,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json'})
                try:
                    with urllib.request.build_opener(NoRedirect).open(request,timeout=5) as r:raw=r.read(262145)
                except urllib.error.HTTPError as e:
                    require(e.code in (301,302,303,307),'Original failure log unavailable')
                    location=e.headers.get('Location','');u=urllib.parse.urlsplit(location)
                    require(u.scheme=='https' and not u.username and not u.password and (u.hostname or '').endswith(('.blob.core.windows.net','.actions.githubusercontent.com')),'Unexpected log download host')
                    raw=get_bytes(location,262144)
                require(len(raw)<=262144,'Original log bound');content=raw.decode('utf8')
            require('Created deployment for '+k['source']+', ID: '+k['source'] in content and '##[error]Deployment failed, try again later.' in content and 'Reported success!' not in content,'Terminal deployment failure not established')
        if job and int(job)!=k['jobId']:
            later=read('/actions/jobs/'+job);later_steps={x['name']:x.get('conclusion') for x in later.get('steps',[])}
            require(later.get('run_id')==int(prior_run) and later.get('conclusion')=='failure' and later_steps.get(k['deployStep'])==later_steps.get(k['restoreStep'])=='skipped','Later attempt may have published')
        excluded.append(int(prior_run))
    require(base is not None,'Expected active baseline not found in bounded deployment window')
    live=verify_live(p,'baseline' if operation=='release' else 'candidate',public_get)
    result={'result':'PASS','main':source,'base':base,'reconciledTerminalOrSkippedRuns':sorted(set(excluded)),'metadataRequests':calls,'metadataBytes':total,'baselineStatic':live,'operation':operation}
    if final:result['operations']=operations(p)
    return result

if __name__=='__main__':
    import resource,signal
    resource.setrlimit(resource.RLIMIT_AS,(512*1024*1024,512*1024*1024));signal.alarm(180)
    cli=argparse.ArgumentParser();cli.add_argument('mode',choices=['prepare','verify','preflight','live']);cli.add_argument('--plan',required=True);cli.add_argument('--baseline');cli.add_argument('--root',default='.');cli.add_argument('--out');cli.add_argument('--folder');cli.add_argument('--kind',default='candidate',choices=['candidate','rollback']);cli.add_argument('--final',action='store_true');cli.add_argument('--operation',default='release',choices=['release','restore']);cli.add_argument('--restore-run',type=int);a=cli.parse_args();p=plan_at(a.plan)
    if a.mode=='prepare':value=prepare(p,a.baseline,a.root,a.out)
    elif a.mode=='verify':value=verify(p,a.folder,a.kind)
    elif a.mode=='preflight':value=preflight(p,final=a.final,operation=a.operation,restore_run=a.restore_run)
    else:value={'static':verify_live(p,a.kind),'operations':operations(p)}
    print(canonical(value).decode())
