#!/usr/bin/env python3
"""Validate an exact approved COMMAND handoff and stage its original Pages TAR.

No default archive retrieval, website generator or deployment call. Actual owner
approval and independently accepted evidence must precede production execution.
"""
import argparse,io,re,time,zipfile,resource,signal
from pathlib import Path
from archive_core import canonical,require,sha,strict_json,verify_bundle,_read_tar,_snapshot,MAX_ZIP,MAX_TAR
from compose import ALLOWED,PROTECTED,bounded_file,compose_overlay

FILES={'release.zip','rollback.zip','release-receipt.json','rollback-receipt.json','source-manifest.json','approval.json'}
ROUTE='github-pages/command-publication-only-v1'

def approved(root,approval_sha,operation,tooling_commit,now):
    root=Path(root)
    require(root.is_dir() and not root.is_symlink() and {p.name for p in root.iterdir()}==FILES,'Unexpected handoff contents')
    a=strict_json(bounded_file(root/'approval.json',16384))
    require(sha(canonical(a))==approval_sha,'Exact approval digest mismatch')
    require(a.get('scope')=='COMMAND_EXACT_PRODUCTION_RELEASE' and a.get('repository')=='lukewilliamsat-glitch/apparition-instruments','Wrong approval scope/repository')
    require(a.get('operation')==operation and operation in ('release','restore'),'Operation mismatch')
    require(a.get('toolingCommit')==tooling_commit and re.fullmatch('[a-f0-9]{40}',tooling_commit),'Tooling identity mismatch')
    require(isinstance(a.get('expectedActiveWorkflowCommit'),str) and re.fullmatch('[a-f0-9]{40}',a['expectedActiveWorkflowCommit']),'Prior publishing-workflow identity missing')
    require(a.get('routeId')==ROUTE and a.get('environment')=='github-pages' and a.get('sharedConcurrencyGroup')=='pages','Publication route mismatch')
    require(a.get('visualApproved') is True and a.get('productionApproved') is True and a.get('restorationProcedureAccepted') is True and a.get('rollbackRetentionVerified') is True,'Owner/rollback gates incomplete')
    require(a.get('productionWrites') is False,'COMMAND write authority must remain disabled')
    for key in ['ownerVisualApprovalRef','ownerProductionApprovalRef','archiveAccessApprovalRef']:
        require(isinstance(a.get(key),str) and 0<len(a[key])<=120 and all(32<=ord(c)<127 for c in a[key]),'Exact owner approval reference missing')
    require(isinstance(a.get('operationId'),str) and re.fullmatch('[A-Za-z0-9-]{8,80}',a['operationId']),'Operation identity missing')
    require(type(a.get('expiresAt')) is int and now<a['expiresAt']<=now+3600,'Approval expired/unbounded')
    for key in ['releaseReceiptSHA256','rollbackReceiptSHA256','sourceManifestSHA256','readbackPlanSHA256','holidayEvidenceSHA256','environmentProtectionEvidenceSHA256','metadataEvidenceSHA256','liveReadEvidenceSHA256']:
        require(isinstance(a.get(key),str) and re.fullmatch('[a-f0-9]{64}',a[key]),'Unpinned evidence: '+key)
    _snapshot(a.get('currentEvidence'),a.get('expectedActive',{}),a['holidayEvidenceSHA256'],now)
    return a

def stage(*,directory,approval_sha,operation,tooling_commit,checkout,out,now=None):
    now=int(time.time()) if now is None else now;root=Path(directory)
    a=approved(root,approval_sha,operation,tooling_commit,now)
    manifest=strict_json(bounded_file(root/'source-manifest.json',65536))
    require(sha(canonical(manifest))==a['sourceManifestSHA256'] and manifest.get('sourceCommit')==a.get('candidateSourceCommit'),'Candidate source manifest mismatch')
    provenance=manifest.get('sourceProvenance')
    require(isinstance(provenance,list) and len(provenance)==len(ALLOWED) and {e.get('path') for e in provenance}==ALLOWED,'Stamped source provenance required')
    for entry in provenance:require(sha(bounded_file(Path(checkout)/'dist'/entry['path'],8*1024*1024))==entry['rawSourceSHA256'],'Checked-out candidate source drift')
    release_raw=bounded_file(root/'release.zip',MAX_ZIP);rollback_raw=bounded_file(root/'rollback.zip',MAX_ZIP)
    rr=strict_json(bounded_file(root/'release-receipt.json',2*1024*1024));br=strict_json(bounded_file(root/'rollback-receipt.json',2*1024*1024))
    release=verify_bundle(release_raw,rr,a['releaseReceiptSHA256']);rollback=verify_bundle(rollback_raw,br,a['rollbackReceiptSHA256'])
    require(rr['kind']=='release' and br['kind']=='rollback' and rr['sourceCommit']==a['candidateSourceCommit'] and br['sourceCommit']==manifest['baseSourceCommit'],'Bundle role/source mismatch')
    expected,changes=compose_overlay(rollback,{p:release.files[p] for p in ALLOWED},manifest,a['sourceManifestSHA256'])
    require(expected.files==release.files and expected.directories==release.directories,'Unreviewed release contents/directories')
    for path in PROTECTED:require(path in rollback.files and rollback.files[path]==release.files[path],'Holiday static/runtime reference drift')
    require(strict_json(rollback.files['operations/snapshot.json']).get('store',{}).get('state')=='ORDERS_PAUSED','Historical OPEN snapshot is not an accepted rollback')
    activation=release.files['admin/command/read-activation.mjs'].decode('utf-8')
    require(re.search(r'^\s*enabled\s*:\s*true\s*,\s*$',activation,re.M),'Verified production read activation required')
    for key in ['metadataEvidenceSHA256','liveReadEvidenceSHA256']:require(re.search(r"^\s*"+key+r"\s*:\s*['\"]"+a[key]+r"['\"]\s*,?\s*$",activation,re.M),'Activation evidence mismatch')
    prior=br if operation=='release' else rr
    require(a['expectedActive']['payloadDigest']==prior['payloadDigest'] and a['expectedActive']['sourceCommit']==prior['sourceCommit'],'Expected active complete payload mismatch')
    raw=release_raw if operation=='release' else rollback_raw;receipt=rr if operation=='release' else br
    with zipfile.ZipFile(io.BytesIO(raw)) as z:tar=z.read('artifact.tar')
    require(len(tar)<=MAX_TAR and _read_tar(tar).manifest()==receipt['files'],'Selected TAR mismatch')
    out=Path(out);out.mkdir(mode=0o700,parents=False,exist_ok=False)
    record={'operationId':a['operationId'],'operation':operation,'toolingCommit':tooling_commit,'candidateSourceCommit':a['candidateSourceCommit'],'approvalSHA256':approval_sha,'payloadDigest':receipt['payloadDigest'],'archiveSHA256':receipt['archiveSHA256'],'tarSHA256':sha(tar),'tarBytes':len(tar),'changedFiles':len(changes),'routeId':ROUTE,'liveReleaseVerified':False}
    for name,data in [('artifact.tar',tar),('staged.json',canonical(record))]:
        with (out/name).open('xb') as f:f.write(data)
        (out/name).chmod(0o600)
    return record

def uploaded_tar(directory,staged_record,receipt,receipt_sha):
    directory=Path(directory);require(directory.is_dir() and not directory.is_symlink() and {p.name for p in directory.iterdir()}=={'artifact.tar'},'Unexpected uploaded artifact contents')
    raw=bounded_file(directory/'artifact.tar',MAX_TAR)
    require(len(raw)==staged_record['tarBytes'] and sha(raw)==staged_record['tarSHA256'],'Uploaded original TAR bytes differ')
    require(sha(canonical(receipt))==receipt_sha,'Selected receipt identity mismatch')
    payload=_read_tar(raw);require(payload.manifest()==receipt['files'] and list(payload.directories)==receipt['directories'] and payload.digest()==receipt['payloadDigest'],'Uploaded complete payload differs')
    return {'uploadedOriginalTarVerified':True,'payloadDigest':payload.digest(),'tarSHA256':sha(raw),'liveReleaseVerified':False}

if __name__=='__main__':
    resource.setrlimit(resource.RLIMIT_AS,(512*1024*1024,512*1024*1024));resource.setrlimit(resource.RLIMIT_CPU,(120,120));signal.alarm(180)
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['stage','verify-upload']);p.add_argument('--handoff',required=True);p.add_argument('--approval-sha256',required=True);p.add_argument('--operation',choices=['release','restore'],required=True);p.add_argument('--tooling-commit',required=True);p.add_argument('--checkout',default='.');p.add_argument('--out-new');p.add_argument('--uploaded');p.add_argument('--staged');args=p.parse_args()
    if args.mode=='stage':result=stage(directory=args.handoff,approval_sha=args.approval_sha256,operation=args.operation,tooling_commit=args.tooling_commit,checkout=args.checkout,out=args.out_new)
    else:
        a=approved(args.handoff,args.approval_sha256,args.operation,args.tooling_commit,int(time.time()));kind='release' if args.operation=='release' else 'rollback';receipt=strict_json(bounded_file(Path(args.handoff)/(kind+'-receipt.json'),2*1024*1024));record=strict_json(bounded_file(args.staged,16384));require(record['approvalSHA256']==args.approval_sha256 and record['operation']==args.operation,'Staged operation mismatch');result=uploaded_tar(args.uploaded,record,receipt,a[kind+'ReceiptSHA256'])
    print(canonical(result).decode())
