#!/usr/bin/env python3
"""Immutable frontend publication using the established archive/transport boundaries.

No generators, business-record reads, writes, retries or hidden fallback. Operations
uses the existing public read-only RPC once before publication and once after it.
"""
import argparse,hashlib,json,os,re,stat,time,urllib.request,urllib.error,urllib.parse
from datetime import datetime,timezone
from pathlib import Path
from archive_core import Payload,canonical,inventory,require,sha,strict_json,_read_tar,MAX_TAR
from compose import ALLOWED,bounded_file
from frontend import get_bytes,NoRedirect
from transport import REPOSITORY

SITE='https://apparitioninstruments.co.uk'
FEATURES={'SPECTRE','LANTERN','SENTINEL','COMMAND_FRONTEND','COMMAND_UNIFIED_ADMIN','COMMAND_ASCENDANCE','COMMERCE_FORGE','BLACK_LEDGER'}
COMMAND_SOURCE='df78c5bf5144b012a7d96c628186180fa6432df3'
UNIFIED_ALLOWED={'admin/application.mjs','admin/application.css','admin/admin-gate.mjs','admin/overview.mjs','admin/command/index.html','admin/command-redirect.mjs'}
ASCENDANCE_PHASES={'A':{'admin/application.css','admin/overview.mjs'},'B':{'admin/application.css','admin/admin.mjs'},'C':{'admin/application.css','admin/application.mjs','admin/orders/app.mjs','admin/orders/external-order.mjs','admin/orders/economics.mjs','admin/orders/finance-ui.mjs','admin/orders/finance-activation.mjs','admin/orders/cost-reference.mjs'}}
FORGE_PHASES={'C_NAV':{'admin/application.mjs','admin/sales-content-presentation.mjs'},'A':ASCENDANCE_PHASES['C'],'B':{'admin/catalogue-settings/settings.mjs','backend/catalogue-options.mjs','admin/admin.mjs','admin/application.css'},'C':{'admin/site-operations/index.html','commercial/offers-admin.mjs','commercial/offers.mjs','commercial/offer-reference.mjs','commercial/offer-activation.mjs','admin/application.css'}}
LEDGER_PHASES={'SAFE':{'backend/catalogue-image-delivery.mjs', 'components/cards.mjs', 'products/app.mjs', 'admin/orders/financial-record.mjs', 'backend/static-image-contract.mjs', 'backend/demand-image-presentation.mjs', 'backend/verified-image-pool.mjs', 'backend/public-read.mjs', 'admin/orders/finance-ui.mjs', 'backend/component-data.mjs', 'admin/orders/app.mjs', 'admin/orders/financial-order.mjs', 'backend/providers.mjs'},'RECON':{'admin/orders/finance-ui.mjs','admin/orders/economics-v2.mjs'}}
COMMAND_MANIFEST_SHA='899151248c2fe2492f198ae19bc36a975287d0edad55cf5168c2657184e17ff1'

def plan_at(path):
    p=strict_json(bounded_file(path,262144))
    require(p.get('version')==1 and p.get('feature') in FEATURES and p.get('authority')==('AUTHORISATION_58' if p['feature']=='COMMAND_FRONTEND' else 'AUTHORISATION_60' if p['feature']=='COMMAND_UNIFIED_ADMIN' else 'AUTHORISATION_61' if p['feature']=='COMMAND_ASCENDANCE' else 'AUTHORISATION_62' if p['feature']=='COMMERCE_FORGE' else 'AUTHORISATION_63' if p['feature']=='BLACK_LEDGER' else 'AUTHORISATION_57'),'Wrong frontend authority/scope')
    if p['feature']=='COMMAND_FRONTEND':
        require(p.get('applicationSource')==p.get('visualAcceptedSource')==COMMAND_SOURCE,'COMMAND accepted source mismatch')
        require(p.get('commandManifestSHA256')==COMMAND_MANIFEST_SHA,'COMMAND compiled source manifest mismatch')
    if p['feature']=='COMMAND_UNIFIED_ADMIN':
        require(re.fullmatch('[a-f0-9]{40}',p.get('applicationSource','')) and re.fullmatch('[a-f0-9]{64}',p.get('unifiedManifestSHA256','')),'Unified source identity missing')
    if p['feature']=='COMMAND_ASCENDANCE':
        require(p.get('phase') in ASCENDANCE_PHASES and re.fullmatch('[a-f0-9]{40}',p.get('applicationSource','')) and re.fullmatch('[a-f0-9]{64}',p.get('ascendanceManifestSHA256','')),'Ascendance phase/source identity missing')
    if p['feature']=='COMMERCE_FORGE':
        require(p.get('phase') in FORGE_PHASES and re.fullmatch('[a-f0-9]{40}',p.get('applicationSource','')) and re.fullmatch('[a-f0-9]{64}',p.get('forgeManifestSHA256','')),'Commerce phase/source identity missing')
        require(p.get('financialPersistence') is False and p.get('activePromotions') is False,'Unapproved commercial activation refused')
    if p['feature']=='BLACK_LEDGER':
        require(p.get('phase') in LEDGER_PHASES and re.fullmatch('[a-f0-9]{40}',p.get('applicationSource','')) and re.fullmatch('[a-f0-9]{64}',p.get('ledgerManifestSHA256','')),'Black Ledger phase/source identity missing')
        require(p.get('financialPersistence') is False and p.get('activePromotions') is False,'Unapproved privileged commercial activation refused')
    require(p.get('siteURL')==SITE and p.get('commandReads') is False and p.get('commandWrites') is False,'Site or COMMAND activation mismatch')
    for key in ['baseTarSHA256','basePayloadDigest','candidateDigest','rollbackDigest']:
        require(re.fullmatch('[a-f0-9]{64}',p.get(key,'')),'Missing immutable payload identity')
    require(all(3<=len(p.get(k,{}))<=8 for k in ['baselineVerification','rollbackVerification','releaseVerification']),'Bounded live verification map required')
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
    command_entries={}
    compiled_allowed=UNIFIED_ALLOWED
    compiled_namespace='command60'
    if p['feature']=='COMMAND_FRONTEND':
        manifest=strict_json(bounded_file(Path(root)/'docs/command/command05/COMMAND_RELEASE_COMPILED_58.json',65536))
        require(sha(canonical(manifest))==COMMAND_MANIFEST_SHA and manifest.get('sourceCommit')==COMMAND_SOURCE,'COMMAND source manifest changed')
        command_entries={e['path']:e for e in manifest['entries']}
        require(set(command_entries)==ALLOWED and {c['path'] for c in p['changes'] if c.get('operation')=='source'}==ALLOWED,'Exact COMMAND overlay required')
    if p['feature']=='COMMAND_UNIFIED_ADMIN':
        manifest=strict_json(bounded_file(Path(root)/'docs/command/command60/source-manifest.json',65536))
        require(sha(canonical(manifest))==p['unifiedManifestSHA256'] and manifest.get('kind')=='COMMAND_UNIFIED_ADMIN_V1' and manifest.get('sourceCommit')==p['applicationSource'],'Unified source manifest changed')
        command_entries={e['path']:e for e in manifest['entries']}
        require(set(command_entries)==UNIFIED_ALLOWED and {c['path'] for c in p['changes'] if c.get('operation')=='compiled-admin'}==UNIFIED_ALLOWED,'Exact unified Admin overlay required')
    if p['feature']=='COMMAND_ASCENDANCE':
        compiled_allowed=ASCENDANCE_PHASES[p['phase']];compiled_namespace='command61-'+p['phase']
        manifest=strict_json(bounded_file(Path(root)/('docs/command/command61/source-manifest-'+p['phase']+'.json'),65536))
        require(sha(canonical(manifest))==p['ascendanceManifestSHA256'] and manifest.get('kind')=='COMMAND_ASCENDANCE_V1' and manifest.get('phase')==p['phase'] and manifest.get('sourceCommit')==p['applicationSource'],'Ascendance source manifest changed')
        command_entries={e['path']:e for e in manifest['entries']}
        require(set(command_entries)==compiled_allowed and {c['path'] for c in p['changes'] if c.get('operation')=='compiled-admin'}==compiled_allowed,'Exact Ascendance phase overlay required')
    if p['feature']=='COMMERCE_FORGE':
        compiled_allowed=FORGE_PHASES[p['phase']];compiled_namespace='commerce62-'+p['phase']
        manifest=strict_json(bounded_file(Path(root)/('docs/operations/commerce62/source-manifest-'+p['phase']+'.json'),65536))
        require(sha(canonical(manifest))==p['forgeManifestSHA256'] and manifest.get('kind')=='COMMERCE_FORGE_V1' and manifest.get('phase')==p['phase'] and manifest.get('sourceCommit')==p['applicationSource'],'Commerce source manifest changed')
        command_entries={e['path']:e for e in manifest['entries']}
        require(set(command_entries)==compiled_allowed and {c['path'] for c in p['changes'] if c.get('operation')=='compiled-admin'}==compiled_allowed,'Exact Commerce phase overlay required')
    if p['feature']=='BLACK_LEDGER':
        compiled_allowed=LEDGER_PHASES[p['phase']];compiled_namespace='black-ledger63-'+p['phase']
        manifest=strict_json(bounded_file(Path(root)/('docs/operations/black-ledger63/source-manifest-'+p['phase']+'.json'),65536))
        require(sha(canonical(manifest))==p['ledgerManifestSHA256'] and manifest.get('kind')=='BLACK_LEDGER_V1' and manifest.get('phase')==p['phase'] and manifest.get('sourceCommit')==p['applicationSource'],'Black Ledger source manifest changed')
        command_entries={e['path']:e for e in manifest['entries']}
        require(set(command_entries)==compiled_allowed and {c['path'] for c in p['changes'] if c.get('operation')=='compiled-admin'}==compiled_allowed,'Exact Black Ledger phase overlay required')
    for c in p['changes']:
        path=c['path'];before=files.get(path)
        require(not path.startswith('supabase/'),'Backend delta refused')
        if p['feature'] in ('COMMAND_UNIFIED_ADMIN','COMMAND_ASCENDANCE','COMMERCE_FORGE','BLACK_LEDGER'):
            if path in command_entries:
                e=command_entries[path]
                require(c.get('operation')=='compiled-admin' and c.get('source')=='release-overlays/'+compiled_namespace+'/'+path and all(c.get(k)==e[k] for k in ['beforeSHA256','afterSHA256','bytes']),'Unified approved source mismatch')
            else:require((p['feature']=='BLACK_LEDGER' and p['phase']=='SAFE' or path.startswith('admin/') or path=='commercial/admin.mjs') and path.endswith(('.html','.mjs','.js')) and cache_reference_only(c),'Unified unrelated delta refused')
        elif p['feature']=='COMMAND_FRONTEND':
            if path in command_entries:
                e=command_entries[path]
                require(c.get('operation')=='source' and c.get('source')=='dist/'+path and all(c.get(k)==e[k] for k in ['beforeSHA256','afterSHA256','bytes']),'COMMAND approved source delta mismatch')
            else:require(path.startswith('admin/') and path.endswith('.html') and cache_reference_only(c),'COMMAND unrelated delta refused')
        else:require(not path.startswith(('admin/','forge-pro/')) or cache_reference_only(c),'Unrelated privileged workspace delta refused')
        if p['feature']=='SPECTRE':require(path in {'customer-ui.css','index.html','operations/snapshot.json'},'SPECTRE delta exceeded')
        require((sha(before) if before is not None else None)==c['beforeSHA256'],'Delta preimage mismatch: '+path)
        if c['operation']=='compiled-admin':
            require(p['feature'] in ('COMMAND_UNIFIED_ADMIN','COMMAND_ASCENDANCE','COMMERCE_FORGE','BLACK_LEDGER') and c['source']=='release-overlays/'+compiled_namespace+'/'+path and path in compiled_allowed,'Unapproved compiled Admin source')
            data=bounded_file(Path(root)/c['source'],8*1024*1024)
        elif c['operation']=='source':
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
    if p['feature']=='BLACK_LEDGER' and p['phase']=='SAFE':
        require('enabled:false' in files['backend/image-delivery-config.mjs'].decode().replace(' ',''),'Unapproved NIGHTFALL activation refused')
    if p['feature'] in ('COMMAND_FRONTEND','COMMAND_UNIFIED_ADMIN','COMMAND_ASCENDANCE','COMMERCE_FORGE','BLACK_LEDGER'):
        activation=files['admin/command/read-activation.mjs'].decode('utf-8')
        require(all(re.search(r'^\s*'+name+r'\s*:\s*false\s*,?\s*$',activation,re.M) for name in ['enabled','inventoryRead']),'COMMAND unverified activation refused')
        require(all(re.search(r'^\s*'+name+r'\s*:\s*null\s*,?\s*$',activation,re.M) for name in ['metadataEvidenceSHA256','liveReadEvidenceSHA256']),'COMMAND fabricated activation evidence refused')
    if p['feature']=='COMMAND_ASCENDANCE' and p['phase']=='C' or p['feature'] in ('COMMERCE_FORGE','BLACK_LEDGER'):
        finance=files['admin/orders/finance-activation.mjs'].decode('utf-8')
        require(re.search(r'^\s*enabled\s*:\s*false\s*,?\s*$',finance,re.M),'Unapproved financial save activation refused')
        require(all(re.search(r'^\s*'+name+r'\s*:\s*null\s*,?\s*$',finance,re.M) for name in ['backendEvidenceSHA256','livePersistenceEvidenceSHA256']),'Unapproved financial activation evidence refused')
    if p['feature']=='COMMERCE_FORGE' and p['phase'] in ('C','C_NAV') or p['feature']=='BLACK_LEDGER':
        offers=files['commercial/offer-activation.mjs'].decode('utf-8')
        require(re.search(r'^\s*enabled\s*:\s*false\s*,?\s*$',offers,re.M),'Unapproved promotion activation refused')
        require(all(re.search(r'^\s*'+name+r'\s*:\s*null\s*,?\s*$',offers,re.M) for name in ['backendEvidenceSHA256','liveCheckoutEvidenceSHA256']),'Unapproved checkout evidence refused')
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

def unified_native_evidence(p,read):
    evidence=p['nativeAcceptance'];execution=evidence.get('executionSource',p['applicationSource'])
    require(re.fullmatch('[a-f0-9]{40}',execution),'Native execution source missing')
    if p['feature']=='BLACK_LEDGER' and p['phase']=='SAFE':
        require(p['applicationSource']=='b4d7e3708e1cd0153e922122fa2400f0c46d9ce7' and execution=='d085c8968e37df3292650200321be6769f5c32e3' and evidence['runId']==40525724200,'Wrong explicitly approved SAFE source')
        accepted=read('/actions/runs/40525724200')
        require(accepted.get('head_sha')==execution and accepted.get('status')=='completed' and accepted.get('path')=='.github/workflows/command63-black-ledger.yml','Wrong financial acceptance run')
        job=read('/actions/jobs/122264638013')
        require(job.get('run_id')==40525724200 and job.get('name')=='acceptance' and job.get('conclusion')=='success','Financial Chrome job not successful')
        artifact=read('/actions/artifacts/12742718558')
        require(artifact.get('digest')=='sha256:5cc5a028625e9236de4e9e86fbfea39e4df7874cba1862c70fbc989bc880fa28' and artifact.get('size_in_bytes')==3534 and artifact.get('workflow_run',{}).get('head_sha')==execution and not artifact.get('expired'),'Verified browser evidence identity changed')
        compared=read('/compare/'+execution+'...'+p['applicationSource'])
        permitted={'.github/workflows/command63-black-ledger.yml','tests/command63/finance-postgres17.mjs','tests/command63/pg17-result-test.mjs','tests/command63/pg17-result.mjs','tests/nightfall63-integration.mjs','docs/operations/black-ledger63/PRIVILEGED_FINANCE_GATE.json','docs/operations/black-ledger63/finance-source-status.json','docs/operations/black-ledger63/nightfall-integration-status.json','dist/backend/catalogue-image-delivery.mjs','dist/backend/component-data.mjs','dist/backend/demand-image-presentation.mjs','dist/backend/public-read.mjs','dist/backend/static-image-contract.mjs','dist/backend/verified-image-pool.mjs','dist/components/cards.mjs','dist/products/app.mjs'}
        require(compared.get('merge_base_commit',{}).get('sha')==execution and compared.get('status')=='ahead' and {f.get('filename') for f in compared.get('files',[])}==permitted,'Financial application changed after accepted browser source')
        return {'runId':40525724200,'jobId':122264638013,'applicationSource':p['applicationSource'],'executionSource':execution,'financialApplicationUnchanged':True,'nightfall':'Accepted runtime and targeted DOM integration, activation remains false'}
    accepted=read('/actions/runs/'+str(evidence['runId']))
    require(accepted.get('head_sha')==execution and accepted.get('status')=='completed' and accepted.get('conclusion')=='success','Unified native acceptance is not successful for exact source')
    if p['feature']=='COMMAND_ASCENDANCE':require(accepted.get('path')=='.github/workflows/command61-ascendance.yml','Wrong Ascendance acceptance workflow')
    if p['feature']=='COMMERCE_FORGE':require(accepted.get('path')=='.github/workflows/command62-commerce-forge.yml','Wrong Commerce acceptance workflow')
    if p['feature']=='BLACK_LEDGER':require(accepted.get('path')=='.github/workflows/command63-black-ledger.yml','Wrong Black Ledger acceptance workflow')
    if execution!=p['applicationSource']:
        compared=read('/compare/'+p['applicationSource']+'...'+execution)
        require(compared.get('merge_base_commit',{}).get('sha')==p['applicationSource'] and compared.get('status')=='ahead','Native reuse ancestry differs')
        files=compared.get('files',[])
        test_prefix='tests/command63/' if p['feature']=='BLACK_LEDGER' else 'tests/command62/' if p['feature']=='COMMERCE_FORGE' else 'tests/command61/' if p['feature']=='COMMAND_ASCENDANCE' else 'tests/command60/'
        require(0<len(files)<=10 and all(f.get('filename','').startswith(test_prefix) and f.get('status') in ('added','modified') for f in files),'Application changed after native reuse source')
    return {'runId':evidence['runId'],'applicationSource':p['applicationSource'],'executionSource':execution,'applicationUnchanged':True}

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
    if p['feature'] in ('COMMAND_UNIFIED_ADMIN','COMMAND_ASCENDANCE','COMMERCE_FORGE','BLACK_LEDGER'):unified_native_evidence(p,read)
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
