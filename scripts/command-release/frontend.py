#!/usr/bin/env python3
"""Exact frontend-only publication; authenticated catalogue activation stays off.

Only GitHub metadata and bounded static website GETs are used. No Supabase,
generator, package install, product record or privileged session is requested.
"""
import argparse,io,json,os,re,time,urllib.request,zipfile,resource,signal
from pathlib import Path
from archive_core import Payload,canonical,require,sha,strict_json,_read_tar,pages_zip,MAX_TAR
from compose import ALLOWED,PROTECTED,bounded_file,compose_overlay
from transport import assess_github,REPOSITORY

SITE='https://apparitioninstruments.co.uk'
SCOPE='COMMAND_FRONTEND_ONLY_READS_DISABLED'

def read_plan(path):
    p=strict_json(bounded_file(path,131072))
    require(p.get('version')==1 and p.get('scope')==SCOPE,'Frontend-only plan required')
    require(p.get('productionReads') is False and p.get('productionWrites') is False,'Unverified reads/writes must remain disabled')
    require(p.get('siteURL')==SITE and p.get('visualAcceptedSource')==p.get('applicationSource'),'Target/visual identity mismatch')
    for name in ['applicationSource','baseSource']:require(re.fullmatch('[a-f0-9]{40}',p.get(name,'')),'Source identity missing')
    for name in ['baseTarSHA256','basePayloadDigest','compiledManifestSHA256','candidateTarSHA256','candidatePayloadDigest']:require(re.fullmatch('[a-f0-9]{64}',p.get(name,'')),'Payload identity missing: '+name)
    for name in ['baseRunId','baseArtifactId']:require(type(p.get(name)) is int and p[name]>0,'Artifact/run identity missing')
    require(set(p.get('protectedReferences',{}))==PROTECTED,'Protected references missing')
    return p

def compose_frontend(base_raw,overlay_root,manifest,manifest_sha):
    base=_read_tar(base_raw)
    overlay={p:bounded_file(Path(overlay_root)/'dist'/p,8*1024*1024) for p in ALLOWED}
    activation=overlay['admin/command/read-activation.mjs'].decode()
    for name in ['enabled','inventoryRead']:require(re.search(r'^\s*'+name+r'\s*:\s*false\s*,?\s*$',activation,re.M),'Frontend release must keep '+name+' disabled')
    for name in ['metadataEvidenceSHA256','liveReadEvidenceSHA256']:require(re.search(r'^\s*'+name+r'\s*:\s*null\s*,?\s*$',activation,re.M),'No invented live activation evidence')
    require(strict_json(base.files['operations/snapshot.json']).get('store',{}).get('state')=='ORDERS_PAUSED','Holiday baseline is not paused')
    result,changes=compose_overlay(base,overlay,manifest,manifest_sha)
    for p in PROTECTED:require(result.files[p]==base.files[p],'Protected Operations drift')
    zipped=pages_zip(result)
    with zipfile.ZipFile(io.BytesIO(zipped)) as z:tar=z.read('artifact.tar')
    return base,result,changes,tar,zipped

def stage(plan,base_dir,overlay_root,manifest_path,out):
    base_dir=Path(base_dir);require({p.name for p in base_dir.iterdir()}=={'artifact.tar'},'Unexpected baseline envelope')
    raw=bounded_file(base_dir/'artifact.tar',MAX_TAR);require(sha(raw)==plan['baseTarSHA256'],'Original rollback TAR mismatch')
    manifest=strict_json(bounded_file(manifest_path,65536))
    require(manifest['sourceCommit']==plan['applicationSource'] and manifest['baseSourceCommit']==plan['baseSource'],'Overlay source mismatch')
    base,result,changes,tar,zipped=compose_frontend(raw,overlay_root,manifest,plan['compiledManifestSHA256'])
    require(base.digest()==plan['basePayloadDigest'],'Complete baseline mismatch')
    require(result.digest()==plan['candidatePayloadDigest'] and sha(tar)==plan['candidateTarSHA256'],'Exact complete candidate mismatch')
    for p,h in plan['protectedReferences'].items():require(sha(base.files[p])==h,'Holiday reference identity mismatch')
    out=Path(out);out.mkdir(mode=0o700,exist_ok=False)
    for name,data in [('rollback/artifact.tar',raw),('release/artifact.tar',tar)]:
        target=out/name;target.parent.mkdir(mode=0o700,exist_ok=True);target.write_bytes(data);target.chmod(0o600)
    receipt={'scope':SCOPE,'applicationSource':plan['applicationSource'],'basePayloadDigest':base.digest(),'candidatePayloadDigest':result.digest(),'candidateTarSHA256':sha(tar),'rollbackTarSHA256':sha(raw),'candidateArchiveSHA256':sha(zipped),'changedFiles':changes,'unrelatedFilesPreserved':len(set(base.files)-ALLOWED),'productionReads':False,'productionWrites':False,'productionLiveVerified':False}
    (out/'receipt.json').write_bytes(canonical(receipt))
    return receipt

def verify_tar(plan,directory,kind):
    root=Path(directory);require(root.is_dir() and not root.is_symlink() and {p.name for p in root.iterdir()}=={'artifact.tar'},'Unexpected uploaded artifact contents')
    raw=bounded_file(root/'artifact.tar',MAX_TAR);expected=plan['candidateTarSHA256' if kind=='release' else 'baseTarSHA256']
    require(sha(raw)==expected,'Original uploaded TAR bytes differ')
    payload=_read_tar(raw);require(payload.digest()==plan['candidatePayloadDigest' if kind=='release' else 'basePayloadDigest'],'Uploaded complete inventory differs')
    return {'originalTarReadback':'PASS','kind':kind,'tarSHA256':expected,'files':len(payload.files)}

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None

def get_bytes(url,limit,headers=None):
    try:
        with urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url,headers=headers or {}),timeout=5) as r:
            raw=r.read(limit+1);require(len(raw)<=limit,'Response exceeds bound');return raw
    except Exception:raise ValueError('Bounded endpoint unavailable or out of bounds; no response/token logged') from None

def prior_identity(plan,deployments,current_run,tooling_sha,operation,restore_run):
    prefix='https://github.com/'+REPOSITORY+'/actions/runs/'
    prior=[]
    for d in deployments:
        log=d.get('latestStatus',{}).get('log_url') or ''
        if d.get('sha')==tooling_sha and (log==prefix+str(current_run) or log.startswith(prefix+str(current_run)+'/')):continue
        prior.append(d)
    require(prior,'No previous confirmed publication')
    d=max(prior,key=lambda v:v['id']);log=d.get('latestStatus',{}).get('log_url') or ''
    expected_run=plan['baseRunId'] if operation=='release' else restore_run
    expected_sha=plan['baseSource'] if operation=='release' else tooling_sha
    require(type(expected_run) is int and expected_run>0,'Exact prior release run required')
    require(d.get('sha')==expected_sha and d['latestStatus'].get('state')=='success','Current active publication changed')
    require(log==prefix+str(expected_run) or log.startswith(prefix+str(expected_run)+'/'),'Current publishing run changed')
    return d

def exclude_proven_nonpublications(plan,deployments,read):
    """Exclude only a pinned failed attempt whose actual deploy steps were skipped."""
    keep=[];excluded=[];prefix='https://github.com/'+REPOSITORY+'/actions/runs/'
    for d in deployments:
        log=d.get('latestStatus',{}).get('log_url') or ''
        known=next((v for v in plan.get('nonPublishingFailedRuns',[]) if log==prefix+str(v['runId']) or log.startswith(prefix+str(v['runId'])+'/')),None)
        if known is None:keep.append(d);continue
        require(d.get('sha')==known['sourceCommit'] and d.get('latestStatus',{}).get('state')=='failure','Known nonpublication identity/status drift')
        run=read('/actions/runs/'+str(known['runId']));job=read('/actions/jobs/'+str(known['jobId']))
        require(run.get('head_sha')==known['sourceCommit'] and run.get('status')=='completed' and run.get('conclusion')=='failure','Failed run is not completed/unchanged')
        require(job.get('run_id')==known['runId'] and job.get('id')==known['jobId'] and job.get('conclusion')=='failure','Failed job identity mismatch')
        steps=job.get('steps',[])
        for name in ['Publish this exact verified Pages artifact once','Restore the verified complete rollback on confirmed live verification failure']:
            matches=[s for s in steps if s.get('name')==name]
            require(len(matches)==1 and matches[0].get('conclusion')=='skipped','Cannot exclude an attempted/uncertain publication')
        excluded.append(known['runId'])
    return keep,excluded

def preflight(plan,operation='release',restore_run=None,get=None,public_get=None):
    require(os.environ.get('GITHUB_REPOSITORY')==REPOSITORY and os.environ.get('GITHUB_REF')=='refs/heads/main','Wrong repository/branch')
    tooling=os.environ.get('GITHUB_SHA','');current=os.environ.get('GITHUB_RUN_ID','');token=os.environ.get('GH_TOKEN','')
    require(re.fullmatch('[a-f0-9]{40}',tooling) and current.isdigit() and (token or get),'Trusted workflow identity/token required')
    calls=0;size=0;start=time.monotonic()
    def read(path):
        nonlocal calls,size
        calls+=1;require(calls<=16 and time.monotonic()-start<=35,'GitHub metadata ceiling')
        if get:return get(path)
        raw=get_bytes('https://api.github.com/repos/'+REPOSITORY+path,524288,{'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'COMMAND55-frontend-publication/1'})
        size+=len(raw);require(size<=2*1024*1024,'Metadata byte ceiling');return strict_json(raw)
    ref=read('/git/ref/heads/main');pages=read('/pages')
    runs=[read('/actions/runs?status='+s+'&per_page=5')['workflow_runs'] for s in ['in_progress','queued','waiting','pending','requested']]
    ds=read('/deployments?environment=github-pages&per_page=5');require(isinstance(ds,list) and 0<len(ds)<=5,'Deployment metadata missing')
    for d in ds:
        require(type(d.get('id')) is int,'Deployment identity invalid');ss=read('/deployments/'+str(d['id'])+'/statuses?per_page=1');require(len(ss)==1,'Deployment status missing');d['latestStatus']=ss[0]
    ds,excluded=exclude_proven_nonpublications(plan,ds,read)
    d=prior_identity(plan,ds,current,tooling,operation,restore_run)
    a={'siteURL':SITE,'expectedActive':{'deploymentId':str(d['id'])},'expectedActiveWorkflowCommit':d['sha']}
    result=assess_github(a,ref=ref,pages=pages,runs=runs,deployments=ds,current_run=current,tooling_commit=tooling)
    raw=(public_get or get_bytes)(SITE+'/operations/snapshot.json?command55check='+plan['baseTarSHA256'][:12],8192)
    require(sha(raw)==plan['protectedReferences']['operations/snapshot.json'],'Served holiday snapshot changed')
    require(strict_json(raw).get('store',{}).get('state')=='ORDERS_PAUSED','Actual holiday state not paused')
    return {**result,'priorRunId':plan['baseRunId'] if operation=='release' else restore_run,'excludedProvenNonPublishingRuns':excluded,'metadataRequests':calls,'metadataBytes':size,'servedHoliday':'ORDERS_PAUSED','backendRequests':0,'scope':SCOPE}

def verify_live(plan,kind='release',get=None):
    mapping=plan['verificationFiles' if kind=='release' else 'rollbackVerificationFiles'];require(isinstance(mapping,dict) and 3<=len(mapping)<=7,'Bounded live plan missing')
    total=0;out=[]
    for path,expected in mapping.items():
        require(path.startswith('/') and '..' not in path and not path.startswith('//') and '#' not in path,'Invalid static verification path')
        raw=(get or get_bytes)(SITE+path+('&' if '?' in path else '?')+'command55check='+expected[:12],262144)
        total+=len(raw);require(total<=1024*1024 and sha(raw)==expected,'Served static file mismatch')
        out.append({'path':path,'bytes':len(raw),'sha256':expected})
    return {'staticLiveVerification':'PASS','kind':kind,'scope':SCOPE,'requests':len(out),'responseBytes':total,'files':out,'productionReads':False,'productionWrites':False,'authenticatedCatalogueAcceptance':'NOT_CLAIMED_DISABLED'}

if __name__=='__main__':
    resource.setrlimit(resource.RLIMIT_AS,(512*1024*1024,512*1024*1024));resource.setrlimit(resource.RLIMIT_CPU,(180,180));signal.alarm(180)
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['stage','verify','preflight','live']);p.add_argument('--plan',required=True);p.add_argument('--kind',choices=['release','rollback'],default='release');p.add_argument('--operation',choices=['release','restore'],default='release');p.add_argument('--restore-run',type=int);p.add_argument('--base-dir');p.add_argument('--overlay-root');p.add_argument('--manifest');p.add_argument('--out');p.add_argument('--directory');args=p.parse_args();plan=read_plan(args.plan)
    if args.mode=='stage':result=stage(plan,args.base_dir,args.overlay_root,args.manifest,args.out)
    elif args.mode=='verify':result=verify_tar(plan,args.directory,args.kind)
    elif args.mode=='preflight':result=preflight(plan,args.operation,args.restore_run)
    else:result=verify_live(plan,args.kind)
    print(canonical(result).decode())
