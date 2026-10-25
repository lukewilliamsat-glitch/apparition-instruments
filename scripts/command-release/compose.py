#!/usr/bin/env python3
"""Offline complete COMMAND payload preparation. No network, generator or publisher.

Requires separately obtained/accepted current-state and archive-access evidence.
Input assertions do not grant owner consent. Never run on private bytes without it.
"""
import argparse,os,re,resource,signal,time
from pathlib import Path
from archive_core import Payload,canonical,inventory,make_bundle,read_pages_zip,require,sha,strict_json,verify_bundle,_snapshot,MAX_ZIP,MAX_FILE

SHARED={'admin/admin-auth.mjs','admin/admin-gate.mjs','admin/application.mjs'}
COMMAND={'command.css','entry.mjs','editor-port.mjs','index.html','nocturne.css','presentation.mjs','read-boundary.mjs','bounded-json.mjs','production-read.mjs','read-activation.mjs','command01/controller.mjs','command01/model.mjs','command01/view.mjs','command01/workbench.css','command02/editor-view.mjs','command02/editor.css','command02/schema.mjs','command02/session.mjs'}
ALLOWED=SHARED|{'admin/command/'+p for p in COMMAND}
PROTECTED={'operations/snapshot.json','operations/public.mjs','operations/model.mjs','operations/purchase-controls.mjs','backend/site-operations.mjs'}

def bounded_file(path,limit):
    path=Path(path)
    require(not any(p.is_symlink() for p in [path,*path.parents]),'Symlink input')
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    with os.fdopen(fd,'rb') as f:
        import stat
        info=os.fstat(f.fileno());require(stat.S_ISREG(info.st_mode) and info.st_size<=limit,'Input bounds/type')
        raw=f.read(limit+1);require(len(raw)<=limit,'Input grew beyond bound');return raw

def validate_manifest(manifest,overlay,expected_sha):
    require(sha(canonical(manifest))==expected_sha,'Source manifest identity')
    require(manifest.get('kind')=='COMMAND_READONLY_SOURCE_OVERLAY_V1','Source manifest kind')
    for key in ['sourceCommit','baseSourceCommit']:
        require(isinstance(manifest.get(key),str) and re.fullmatch('[a-f0-9]{40}',manifest[key]),'Source commit identity')
    entries=manifest.get('entries');require(isinstance(entries,list) and len(entries)==len(ALLOWED),'Exact reviewed file count')
    require({e.get('path') for e in entries}==ALLOWED and set(overlay)==ALLOWED,'Unexpected/missing overlay path')
    for entry in entries:
        require(set(entry)=={'path','beforeSHA256','afterSHA256','bytes'},'Manifest entry schema')
        path=entry['path'];data=overlay[path]
        require(type(entry['bytes']) is int and entry['bytes']==len(data) and sha(data)==entry['afterSHA256'],'Source bytes drift: '+path)
        before=entry['beforeSHA256'];require(before is None or re.fullmatch('[a-f0-9]{64}',before),'Preimage identity')
    inventory(overlay)

def compose_overlay(baseline,overlay,manifest,manifest_sha):
    validate_manifest(manifest,overlay,manifest_sha);inventory(baseline.files)
    files=dict(baseline.files);changes=[]
    for entry in sorted(manifest['entries'],key=lambda e:e['path']):
        path=entry['path'];old=baseline.files.get(path)
        require((None if old is None else sha(old))==entry['beforeSHA256'],'Current baseline/source preimage drift: '+path)
        files[path]=overlay[path]
        changes.append({'path':path,'beforeSHA256':entry['beforeSHA256'],'afterSHA256':entry['afterSHA256'],'bytes':entry['bytes']})
    require(set(files)==set(baseline.files)|ALLOWED,'Unexpected deletion/addition')
    for path,raw in baseline.files.items():
        if path not in ALLOWED:require(files[path]==raw,'Unrelated file changed: '+path)
    result=Payload(files,baseline.directories);inventory(result.files)
    return result,changes

def acceptance_before_archive(evidence,manifest,overlay,manifest_sha,now):
    validate_manifest(manifest,overlay,manifest_sha)
    require(evidence.get('version')==1,'Evidence version')
    expected=evidence.get('expectedActive');require(isinstance(expected,dict),'Current identity missing')
    require(expected.get('sourceCommit')==manifest['baseSourceCommit'],'Production source drift')
    _snapshot(evidence.get('current'),expected,evidence.get('holidayEvidenceSHA256'),now)
    for name in ['metadataEvidenceSHA256','liveReadEvidenceSHA256','holidayEvidenceSHA256']:
        require(isinstance(evidence.get(name),str) and re.fullmatch('[a-f0-9]{64}',evidence[name]),'Missing accepted evidence: '+name)
    activation=overlay['admin/command/read-activation.mjs'].decode('utf-8')
    require(re.search(r'^\s*enabled\s*:\s*true\s*,\s*$',activation,re.M),'Production read activation still disabled')
    for name in ['metadataEvidenceSHA256','liveReadEvidenceSHA256']:
        require(re.search(r"^\s*"+name+r"\s*:\s*['\"]"+evidence[name]+r"['\"]\s*,?\s*$",activation,re.M),'Activation evidence mismatch')
    access=evidence.get('archiveAccess');require(isinstance(access,dict),'Archive access approval missing')
    require(access.get('scope')=='COMMAND_CURRENT_BASELINE_READ_ONLY' and isinstance(access.get('approvalRef'),str) and 0<len(access['approvalRef'])<=120,'Exact owner archive access required')
    require(access.get('maxReads')==1 and type(access.get('expiresAt')) is int and now<access['expiresAt']<=now+3600,'Archive access bounds/expiry')
    require(type(access.get('bytes')) is int and 0<access['bytes']<=MAX_ZIP and re.fullmatch('[a-f0-9]{64}',access.get('sha256','')),'Archive identity bounds')

def prepare(*,baseline_path,overlay,manifest,manifest_sha,evidence,out,now=None):
    now=int(time.time()) if now is None else now
    # All non-archive gates precede materialisation. Caller must already hold the
    # actual exact approval; a JSON reference cannot authorise private access.
    acceptance_before_archive(evidence,manifest,overlay,manifest_sha,now)
    access=evidence['archiveAccess'];raw=bounded_file(baseline_path,MAX_ZIP)
    baseline=read_pages_zip(raw,access['sha256'],access['bytes'])
    require(baseline.digest()==evidence['expectedActive']['payloadDigest'],'Complete current payload association mismatch')
    references=evidence.get('protectedReferences');require(isinstance(references,dict) and set(references)>=PROTECTED,'Holiday static/runtime references missing')
    for path,digest in references.items():require(path in baseline.files and sha(baseline.files[path])==digest,'Protected reference drift: '+path)
    store=strict_json(baseline.files['operations/snapshot.json']).get('store',{})
    require(store.get('state')=='ORDERS_PAUSED','OPEN/unknown static Operations snapshot is not an accepted holiday baseline')
    release,changes=compose_overlay(baseline,overlay,manifest,manifest_sha)
    release_raw,release_receipt=make_bundle(release,manifest['sourceCommit'],'release')
    rollback_receipt={'version':1,'kind':'rollback','sourceCommit':manifest['baseSourceCommit'],'payloadDigest':baseline.digest(),'archiveSHA256':sha(raw),'archiveBytes':len(raw),'files':baseline.manifest(),'directories':list(baseline.directories)}
    require(verify_bundle(raw,rollback_receipt,sha(canonical(rollback_receipt))).digest()==baseline.digest(),'Original rollback verification')
    require(verify_bundle(release_raw,release_receipt,sha(canonical(release_receipt))).digest()==release.digest(),'Complete release verification')
    directory=Path(out);directory.mkdir(mode=0o700,parents=False,exist_ok=False)
    receipt={'version':1,'productionReady':False,'requiresExactOwnerDeploymentApproval':True,'sourceCommit':manifest['sourceCommit'],'sourceManifestSHA256':manifest_sha,'releaseSHA256':sha(release_raw),'rollbackSHA256':sha(raw),'holidayEvidenceSHA256':evidence['holidayEvidenceSHA256'],'releaseReceiptSHA256':sha(canonical(release_receipt)),'rollbackReceiptSHA256':sha(canonical(rollback_receipt)),'changedFiles':len(changes),'unrelatedFilesPreserved':len(set(baseline.files)-ALLOWED),'publisher':'NONE; separate exact approval and accepted publication-only route required'}
    outputs={'release.zip':release_raw,'rollback-original.zip':raw,'release-receipt.json':canonical(release_receipt),'rollback-receipt.json':canonical(rollback_receipt),'file-differences.json':canonical(changes),'preparation-receipt.json':canonical(receipt)}
    for name,data in outputs.items():
        with (directory/name).open('xb') as f:f.write(data);f.flush();os.fsync(f.fileno())
        os.chmod(directory/name,0o600)
    return receipt

def main():
    resource.setrlimit(resource.RLIMIT_AS,(512*1024*1024,512*1024*1024));resource.setrlimit(resource.RLIMIT_CPU,(120,120));signal.alarm(180)
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ['baseline','source-root','manifest','manifest-sha256','evidence','out-new']:parser.add_argument('--'+name,required=True)
    args=parser.parse_args();manifest=strict_json(bounded_file(args.manifest,65536));evidence=strict_json(bounded_file(args.evidence,16384));source=Path(args.source_root)
    overlay={path:bounded_file(source/'dist'/path,MAX_FILE) for path in ALLOWED}
    print(canonical(prepare(baseline_path=args.baseline,overlay=overlay,manifest=manifest,manifest_sha=args.manifest_sha256,evidence=evidence,out=args.out_new)).decode())
if __name__=='__main__':main()
