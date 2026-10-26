#!/usr/bin/env python3
"""Bounded private handoff reader and GitHub-only preflight. Never deploys/builds.

The private capsule is supplied only through an owner-approved environment secret.
No URL, token, response body or private policy expression is printed.
"""
import argparse,io,os,re,stat,time,urllib.request,zipfile
from pathlib import Path
from urllib.parse import urlsplit
from archive_core import canonical,require,sha,strict_json
from compose import bounded_file
from handoff import FILES,approved

REPOSITORY='lukewilliamsat-glitch/apparition-instruments'
MAX_HANDOFF=48*1024*1024
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None

def capsule(raw,tooling_commit):
    require(isinstance(raw,str) and len(raw.encode())<=16384,'Private handoff capsule missing or oversized')
    c=strict_json(raw.encode());require(set(c)=={'scope','toolingCommit','operation','handoffBytes','handoffSHA256','approvalSHA256','url'},'Private capsule schema')
    require(c['scope']=='COMMAND_APPROVED_PRIVATE_HANDOFF' and c['toolingCommit']==tooling_commit,'Private capsule scope/source mismatch')
    require(c['operation'] in ('release','restore') and type(c['handoffBytes']) is int and 0<c['handoffBytes']<=MAX_HANDOFF,'Private handoff bounds')
    for key in ['handoffSHA256','approvalSHA256']:require(re.fullmatch('[a-f0-9]{64}',c.get(key,'')),'Private capsule digest')
    require(isinstance(c['url'],str) and len(c['url'])<=8192,'Private URL type/bounds')
    try:u=urlsplit(c['url']);port=u.port;host=u.hostname or ''
    except ValueError:raise ValueError('Invalid private handoff URL') from None
    allowed=re.fullmatch(r'(?:oaisdmntpr\w*|oaisdsorpr\w*|sdmntpr\w*)\.blob\.core\.windows\.net',host) or re.fullmatch(r'oaisdmntpr\w*aws\.s3\.[a-z0-9-]+\.amazonaws\.com',host) or re.fullmatch(r'sdmntpr\w*\.oaiusercontent\.com',host)
    require(u.scheme=='https' and allowed and not u.username and not u.password and port in (None,443) and not u.fragment,'Unapproved private handoff host')
    return c

def download_private(c,reader=None):
    if reader is None:
        def reader(url,limit):
            try:
                request=urllib.request.Request(url,headers={'User-Agent':'COMMAND-exact-handoff/1'})
                start=time.monotonic();chunks=[];total=0
                with urllib.request.build_opener(NoRedirect).open(request,timeout=15) as response:
                    while True:
                        require(time.monotonic()-start<=60,'Private handoff deadline exceeded')
                        block=response.read(min(65536,limit-total+1))
                        if not block:break
                        total+=len(block);require(total<=limit,'Private handoff exceeds approved bytes');chunks.append(block)
                return b''.join(chunks)
            except Exception:raise ValueError('Private handoff unavailable or out of bounds; no URL logged') from None
    raw=reader(c['url'],c['handoffBytes']);require(isinstance(raw,bytes) and len(raw)==c['handoffBytes'] and sha(raw)==c['handoffSHA256'],'Private handoff integrity mismatch')
    return raw

def unpack(raw,out):
    limits={name:(22*1024*1024 if name.endswith('.zip') else 2*1024*1024 if 'receipt' in name else 65536 if name=='source-manifest.json' else 16384) for name in FILES}
    contents={}
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            infos=z.infolist();require(len(infos)==len(FILES) and {i.filename for i in infos}==FILES,'Unexpected handoff archive entries')
            require(sum(i.file_size for i in infos)<=MAX_HANDOFF,'Private handoff expansion limit')
            for info in infos:
                require(not info.flag_bits&1 and info.compress_type in (zipfile.ZIP_STORED,zipfile.ZIP_DEFLATED) and stat.S_IFMT(info.external_attr>>16) in (0,stat.S_IFREG),'Unsafe handoff archive type')
                limit=limits[info.filename];require(0<=info.file_size<=limit,'Handoff entry size')
                with z.open(info) as f:data=f.read(limit+1)
                require(len(data)==info.file_size and len(data)<=limit,'Handoff entry integrity/bounds');contents[info.filename]=data
    except (zipfile.BadZipFile,RuntimeError,EOFError):raise ValueError('Invalid private handoff archive') from None
    out=Path(out);out.mkdir(mode=0o700,parents=False,exist_ok=False)
    for name,data in contents.items():
        with (out/name).open('xb') as f:f.write(data)
        (out/name).chmod(0o600)

def assess_github(a,*,ref,pages,runs,deployments,current_run,tooling_commit):
    require(ref.get('object',{}).get('sha')==tooling_commit,'Current main changed')
    expected=urlsplit(a.get('siteURL',''));observed=urlsplit(pages.get('html_url',''))
    require(expected.scheme=='https' and expected.hostname and expected.path in ('','/') and not expected.username and not expected.query and not expected.fragment,'Exact existing HTTPS root-site target required')
    require(pages.get('build_type')=='workflow' and observed.scheme==expected.scheme and observed.netloc==expected.netloc and observed.path.rstrip('/')==expected.path.rstrip('/'),'Pages target/source mismatch')
    for group in runs:
        require(len(group)<5,'Pending workflow listing incomplete; no pagination/retry')
        for run in group:require(str(run.get('id'))==str(current_run) or run.get('head_branch')!='main','Competing main workflow remains pending')
    require(isinstance(deployments,list) and 0<len(deployments)<=5,'Current deployment metadata missing')
    candidates=[]
    prefix='https://github.com/'+REPOSITORY+'/actions/runs/'+str(current_run)
    for item in deployments:
        require(item.get('environment')=='github-pages' and type(item.get('id')) is int,'Unexpected deployment resource')
        status=item.get('latestStatus',{});log=status.get('log_url') or ''
        if item.get('sha')==tooling_commit and (log==prefix or log.startswith(prefix+'/')):continue
        candidates.append(item)
    require(candidates,'No prior deployment identity')
    latest=max(candidates,key=lambda x:x['id']);require(latest['latestStatus'].get('state')=='success','Latest prior deployment is not confirmed successful')
    require(str(latest['id'])==a['expectedActive']['deploymentId'] and latest.get('sha')==a.get('expectedActiveWorkflowCommit'),'Active deployment/workflow source drift')
    return {'githubPreflight':'PASS','currentMain':tooling_commit,'priorDeploymentId':str(latest['id']),'pendingCompetingMainRuns':0,'siteURL':a['siteURL'],'servedPayloadAssociation':'EXTERNAL ACCEPTED EVIDENCE; NOT INFERRED FROM API SUCCESS','environmentProtection':'EXTERNAL OWNER-VERIFIED HASH; SERVER ENVIRONMENT ENFORCEMENT REQUIRED'}

def github_preflight(a,token,current_run,tooling_commit,get=None):
    require(bool(token) or get is not None,'Workflow GitHub token unavailable; no identity fallback')
    calls=0;total=0;started=time.monotonic()
    def read(path):
        nonlocal calls,total
        calls+=1;require(calls<=16 and time.monotonic()-started<=30,'GitHub preflight request/deadline ceiling')
        if get is not None:return get(path)
        try:
            request=urllib.request.Request('https://api.github.com/repos/'+REPOSITORY+path,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'COMMAND-publication-preflight/1'})
            with urllib.request.build_opener(NoRedirect).open(request,timeout=10) as response:raw=response.read(524289)
            total+=len(raw);require(len(raw)<=524288 and total<=2*1024*1024 and time.monotonic()-started<=30,'GitHub metadata response/deadline ceiling');return strict_json(raw)
        except Exception:raise ValueError('GitHub metadata unavailable, denied or out of bounds; no response/token logged') from None
    ref=read('/git/ref/heads/main');pages=read('/pages')
    runs=[]
    for state in ['in_progress','queued','waiting','pending','requested']:
        data=read('/actions/runs?status='+state+'&per_page=5');require(isinstance(data.get('workflow_runs'),list),'Invalid workflow metadata');runs.append(data['workflow_runs'])
    deployments=read('/deployments?environment=github-pages&per_page=5');require(isinstance(deployments,list) and 0<len(deployments)<=5,'Invalid deployment metadata')
    for item in deployments:
        require(type(item.get('id')) is int and item['id']>0,'Invalid deployment ID');statuses=read('/deployments/'+str(item['id'])+'/statuses?per_page=1');require(isinstance(statuses,list) and len(statuses)==1,'Deployment status missing');item['latestStatus']=statuses[0]
    return {**assess_github(a,ref=ref,pages=pages,runs=runs,deployments=deployments,current_run=current_run,tooling_commit=tooling_commit),'requests':calls,'metadataBytes':total}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['receive','preflight']);p.add_argument('--out-new');p.add_argument('--handoff');p.add_argument('--operation',choices=['release','restore']);p.add_argument('--approval-sha256');p.add_argument('--tooling-commit',required=True);args=p.parse_args()
    if args.mode=='receive':
        c=capsule(os.environ.get('COMMAND_HANDOFF_CAPSULE',''),args.tooling_commit);unpack(download_private(c),args.out_new);result={'receivedApprovedHandoff':True,'handoffSHA256':c['handoffSHA256'],'approvalSHA256':c['approvalSHA256'],'operation':c['operation']}
    else:
        require(isinstance(args.approval_sha256,str) and re.fullmatch('[a-f0-9]{64}',args.approval_sha256),'Pinned approval digest required');a=approved(args.handoff,args.approval_sha256,args.operation,args.tooling_commit,int(time.time()));result=github_preflight(a,os.environ.get('GH_TOKEN',''),os.environ.get('GITHUB_RUN_ID',''),args.tooling_commit)
    print(canonical(result).decode())
