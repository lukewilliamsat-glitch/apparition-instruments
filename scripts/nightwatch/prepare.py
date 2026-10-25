#!/usr/bin/env python3
"""Offline package tools; real archive preparation requires separate owner approval.

No network, credentials, deployment, builds, database, or image decoding.
"""
import argparse,json,os,resource,signal,stat,time
from pathlib import Path
from payload import *


def bounded_file(path,limit):
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    with os.fdopen(fd,'rb') as f:
        info=os.fstat(f.fileno());require(stat.S_ISREG(info.st_mode) and info.st_size<=limit,'Input type/size')
        data=f.read(limit+1);require(len(data)<=limit,'Input grew beyond bound');return data


def receipt(raw,payload,source,kind):
    require(isinstance(source,str) and re.fullmatch('[a-f0-9]{40}',source),'Source commit')
    return {'version':1,'kind':kind,'sourceCommit':source,'payloadDigest':payload.digest(),'archiveSHA256':sha(raw),'archiveBytes':len(raw),'files':payload.manifest(),'directories':list(payload.directories)}


def prepare_archive(baseline_path,approval_path,css_path,source,out,now=None):
    # Inspect approval before touching baseline bytes. This guard cannot itself
    # grant consent: the operator must already hold the exact owner instruction.
    now=int(time.time()) if now is None else now
    approval=strict_json(bounded_file(approval_path,16384))
    require(approval.get('scope')=='NIGHTWATCH_ARCHIVE_READ_AND_LOCAL_VISUAL_REVIEW','Archive access approval required')
    require(approval.get('ownerConfirmed') is True and isinstance(approval.get('approvalRef'),str) and approval['approvalRef'].strip(),'Owner archive approval missing')
    require(approval.get('archiveSHA256')==ANCHOR_SHA and type(approval.get('archiveBytes')) is int and approval['archiveBytes']==ANCHOR_BYTES,'Archive approval identity')
    require(type(approval.get('expiresAt')) is int and now<approval['expiresAt']<=now+86400,'Archive approval freshness')
    require(approval.get('artifactId')==12590914632 and approval.get('maxOriginalReadBytes')==MAX_ZIP,'Archive approval bounds')
    require(approval.get('allowImageDecoding') is False,'Preparation must not decode images')
    css=bounded_file(css_path,65536);require(sha(css)==NEW_CSS,'CSS source mismatch')
    raw=bounded_file(baseline_path,MAX_ZIP)
    payload=read_pages_zip(raw,ANCHOR_SHA,ANCHOR_BYTES)
    candidate,changes=assemble_spectre(payload,css)
    new_raw,new_receipt=make_bundle(candidate,source,'release')
    rollback_receipt=receipt(raw,payload,'2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f','rollback')
    require(verify_bundle(raw,rollback_receipt,sha(canonical(rollback_receipt))).digest()==payload.digest(),'Rollback verification')
    require(verify_bundle(new_raw,new_receipt,sha(canonical(new_receipt))).digest()==candidate.digest(),'Release verification')
    directory=Path(out);directory.mkdir(mode=0o700,parents=False,exist_ok=False)
    outputs={'candidate.zip':new_raw,'rollback-original.zip':raw,'release-receipt.json':canonical(new_receipt),'rollback-receipt.json':canonical(rollback_receipt),'file-differences.json':canonical(changes)}
    readiness={'version':1,'productionReady':False,'ownerVisualApproved':False,'holidayCurrentState':'UNVERIFIED — BLOCK PRODUCTION','activeServedPayload':'UNVERIFIED','productionRoute':'UNINSTALLED TEMPLATE ONLY','releaseReceiptSHA256':sha(canonical(new_receipt)),'rollbackReceiptSHA256':sha(canonical(rollback_receipt)),'originalArchiveSHA256':sha(raw),'fileCount':len(payload.files),'changedFileCount':len(changes),'imagesDecoded':0}
    outputs['readiness.json']=canonical(readiness)
    for name,data in outputs.items():
        with (directory/name).open('xb') as f:f.write(data);f.flush();os.fsync(f.fileno())
        os.chmod(directory/name,0o600)
    return readiness


def export_payload(archive_path,receipt_path,receipt_sha,out):
    raw=bounded_file(archive_path,MAX_ZIP);r=strict_json(bounded_file(receipt_path,2*1024*1024))
    payload=verify_bundle(raw,r,receipt_sha)
    directory=Path(out);directory.mkdir(mode=0o700,parents=False,exist_ok=False)
    for name in payload.directories:
        if name=='.':continue
        safe_path(name);(directory/name).mkdir(parents=True,exist_ok=True,mode=0o700)
    for name,data in sorted(payload.files.items()):
        target=directory/name;target.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
        with target.open('xb') as f:f.write(data)
        os.chmod(target,0o600)
    require(inventory({n:(directory/n).read_bytes() for n in payload.files})==r['files'],'Export readback mismatch')
    return {'files':len(payload.files),'payloadDigest':payload.digest(),'productionAuthority':False}


def runtime_bounds():
    resource.setrlimit(resource.RLIMIT_AS,(512*1024*1024,512*1024*1024));resource.setrlimit(resource.RLIMIT_CPU,(120,120));signal.alarm(180)

def main():
    runtime_bounds()
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='command',required=True)
    p=sub.add_parser('prepare');p.add_argument('--baseline',required=True);p.add_argument('--archive-approval',required=True);p.add_argument('--css',required=True);p.add_argument('--source-commit',required=True);p.add_argument('--out-new',required=True)
    p=sub.add_parser('export');p.add_argument('--archive',required=True);p.add_argument('--receipt',required=True);p.add_argument('--receipt-sha256',required=True);p.add_argument('--out-new',required=True)
    a=parser.parse_args()
    if a.command=='prepare':r=prepare_archive(a.baseline,a.archive_approval,a.css,a.source_commit,a.out_new)
    else:r=export_payload(a.archive,a.receipt,a.receipt_sha256,a.out_new)
    print(json.dumps(r,sort_keys=True))
if __name__=='__main__':main()
