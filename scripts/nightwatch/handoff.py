#!/usr/bin/env python3
"""Validate a separately approved future Pages handoff; never contacts any service.

Current/holiday evidence is an externally supplied trusted attestation. This
module does not independently establish live state and never creates authority.
"""
import argparse,os,re,time
from pathlib import Path
from payload import *
from prepare import bounded_file,export_payload,runtime_bounds
from delivery import _snapshot


def stage_handoff(directory,approval_sha,operation,out,tooling_commit,now=None):
    now=int(time.time()) if now is None else now;root=Path(directory)
    expected={'release.zip','rollback.zip','release-receipt.json','rollback-receipt.json','approval.json'}
    require(root.is_dir() and not root.is_symlink() and {f.name for f in root.iterdir()}==expected,'Unexpected handoff files')
    approval=strict_json(bounded_file(root/'approval.json',16384))
    require(sha(canonical(approval))==approval_sha,'Pinned approval digest')
    require(approval.get('scope')=='NIGHTWATCH_EXACT_PRODUCTION_RELEASE','Wrong production scope')
    require(approval.get('visualApproved') is True and approval.get('productionApproved') is True,'Separate owner approvals required')
    require(approval.get('restorationProcedureAccepted') is True and approval.get('rollbackRetentionVerified') is True,'Rollback gate incomplete')
    require(approval.get('operation')==operation and operation in ('release','restore'),'Operation mismatch')
    require(approval.get('sharedConcurrencyGroup')=='pages','Shared concurrency missing')
    require(approval.get('toolingCommit')==tooling_commit and re.fullmatch('[a-f0-9]{40}',tooling_commit),'Tooling drift')
    require(type(approval.get('expiresAt')) is int and now<approval['expiresAt']<=now+3600,'Approval expired/unbounded')
    require(isinstance(approval.get('approvalRef'),str) and approval['approvalRef'].strip(),'Owner reference missing')
    for field in ('releaseReceiptSHA256','rollbackReceiptSHA256','readbackPlanSHA256','holidayEvidenceSHA256'):
        require(isinstance(approval.get(field),str) and re.fullmatch('[a-f0-9]{64}',approval[field]),'Unpinned evidence')
    release_raw=bounded_file(root/'release.zip',MAX_ZIP);rollback_raw=bounded_file(root/'rollback.zip',MAX_ZIP)
    rr=strict_json(bounded_file(root/'release-receipt.json',2*1024*1024));br=strict_json(bounded_file(root/'rollback-receipt.json',2*1024*1024))
    release=verify_bundle(release_raw,rr,approval['releaseReceiptSHA256']);rollback=verify_bundle(rollback_raw,br,approval['rollbackReceiptSHA256'])
    require(rr['kind']=='release' and br['kind']=='rollback','Bundle roles')
    verify_overlay(rollback,release,release.files.get('customer-ui.css',b''))
    expected_active=approval.get('expectedActive');require(isinstance(expected_active,dict) and set(expected_active)=={'deploymentId','sourceCommit','payloadDigest'},'Expected active identity missing')
    prior=br if operation=='release' else rr
    require(expected_active['payloadDigest']==prior['payloadDigest'] and expected_active['sourceCommit']==prior['sourceCommit'],'Current payload is not previous complete bundle')
    _snapshot(approval.get('currentEvidence'),expected_active,approval['holidayEvidenceSHA256'],now)
    archive='release.zip' if operation=='release' else 'rollback.zip';receipt='release-receipt.json' if operation=='release' else 'rollback-receipt.json';digest=approval['releaseReceiptSHA256' if operation=='release' else 'rollbackReceiptSHA256']
    target=rr if operation=='release' else br
    result=export_payload(root/archive,root/receipt,digest,out)
    result.update(operation=operation,archiveSHA256=target['archiveSHA256'],readbackPlanSHA256=approval['readbackPlanSHA256'],currentStateEvidence='EXTERNAL ATTESTATION; NOT INDEPENDENTLY FETCHED',liveReleaseVerified=False)
    return result

if __name__=='__main__':
    runtime_bounds()
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--handoff',required=True);p.add_argument('--approval-sha256',required=True);p.add_argument('--operation',choices=['release','restore'],required=True);p.add_argument('--tooling-commit',required=True);p.add_argument('--out-new',required=True);a=p.parse_args()
    print(canonical(stage_handoff(a.handoff,a.approval_sha256,a.operation,a.out_new,a.tooling_commit)).decode())
