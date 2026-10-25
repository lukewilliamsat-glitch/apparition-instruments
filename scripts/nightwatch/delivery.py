"""Fail-closed publish/whole-payload restore coordinator with injected IO only.

No default GitHub/Supabase/browser transport. JSON approval fields never create
owner consent; actual production use requires separately approved route/gates.
"""
from __future__ import annotations
import json,os,re,time
from pathlib import Path
from payload import Rejected,canonical,require,sha,verify_bundle,verify_overlay


def atomic_json(path:Path,value):
    require(not path.exists() and not path.is_symlink(),'Journal already exists')
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'wb') as f:f.write(canonical(value));f.flush();os.fsync(f.fileno())

def replace_json(path:Path,value):
    temp=path.with_suffix('.pending')
    atomic_json(temp,value);os.replace(temp,path)
    fd=os.open(path.parent,os.O_RDONLY|os.O_DIRECTORY)
    try:os.fsync(fd)
    finally:os.close(fd)


def _snapshot(value,expected,holiday,now):
    require(isinstance(value,dict),'Snapshot missing')
    require(isinstance(expected.get('deploymentId'),str) and 0<len(expected['deploymentId'])<=200,'Active deployment identity missing')
    require(isinstance(expected.get('sourceCommit'),str) and re.fullmatch('[a-f0-9]{40}',expected['sourceCommit']),'Active source identity missing')
    require(isinstance(expected.get('payloadDigest'),str) and re.fullmatch('[a-f0-9]{64}',expected['payloadDigest']),'Active payload identity missing')
    require(value.get('deploymentId')==expected['deploymentId'],'Active deployment drift')
    require(value.get('sourceCommit')==expected['sourceCommit'],'Active source drift')
    require(value.get('payloadDigest')==expected['payloadDigest'],'Complete active-payload association missing/drifted')
    require(value.get('holidayEvidenceSHA256')==holiday,'Holiday evidence drift')
    require(value.get('holidayMode') is True and value.get('physicalOrdersPaused') is True and value.get('onlineToolsAvailable') is True,'Holiday protection unverified')
    require(value.get('closureWindow')==['2026-10-17','2026-11-15'],'Closure window mismatch')
    require(type(value.get('observedAt')) is int and 0<=now-value['observedAt']<=300,'Stale current-state evidence')
    require(type(value.get('competingPublishers')) is int and value['competingPublishers']==0,'Concurrent publisher')


def deliver(*,release_raw,release_receipt,rollback_raw,rollback_receipt,approval,port,journal_dir,now=None):
    """Exactly one injected deploy attempt; no retries or automatic rollback.

    The port must independently establish complete active payload association and
    fresh holiday protection, then upload/deploy/read back the approved payload.
    A production implementation is intentionally not supplied by this library.
    """
    now=int(time.time()) if now is None else now
    require(isinstance(approval,dict),'Approval missing')
    require(approval.get('visualApproved') is True and approval.get('productionApproved') is True,'Separate owner approvals required')
    require(isinstance(approval.get('approvalRef'),str) and 1<=len(approval['approvalRef'])<=120,'Approval reference missing')
    op=approval.get('operationId');require(isinstance(op,str) and re.fullmatch(r'[A-Za-z0-9-]{8,80}',op),'Operation identity')
    kind=approval.get('operation');require(kind in ('release','restore'),'Operation kind')
    require(type(approval.get('expiresAt')) is int and now<approval['expiresAt']<=now+3600,'Approval expiry')
    for key in ('releaseReceiptSHA256','rollbackReceiptSHA256','holidayEvidenceSHA256'):
        require(isinstance(approval.get(key),str) and re.fullmatch(r'[a-f0-9]{64}',approval[key]),'Approval digest')
    release=verify_bundle(release_raw,release_receipt,approval['releaseReceiptSHA256'])
    rollback=verify_bundle(rollback_raw,rollback_receipt,approval['rollbackReceiptSHA256'])
    require(release_receipt['kind']=='release' and rollback_receipt['kind']=='rollback','Bundle role')
    require(release.digest()!=rollback.digest(),'No-op/ambiguous release')
    verify_overlay(rollback,release,release.files.get('customer-ui.css',b''))
    target_receipt=release_receipt if kind=='release' else rollback_receipt
    target_raw=release_raw if kind=='release' else rollback_raw
    expected=approval.get('expectedActive');require(isinstance(expected,dict),'Active identity missing')
    require(set(expected)=={'deploymentId','payloadDigest','sourceCommit'},'Active identity schema')
    old_receipt=rollback_receipt if kind=='release' else release_receipt
    require(expected['payloadDigest']==old_receipt['payloadDigest'] and expected['sourceCommit']==old_receipt['sourceCommit'],'Rollback is not complete expected active payload')
    # Real publication must be a supported, separately accepted route; test ports
    # are explicitly labelled and cannot be mistaken for live acceptance.
    require(port is not None and getattr(port,'backend_independent',False) is True,'No approved publication port')
    require(approval.get('routeId')==getattr(port,'route_id',None),'Route identity mismatch')
    root=Path(journal_dir);require(root.is_dir() and not root.is_symlink(),'Journal directory must be trusted existing directory')
    lock=root/'pages.lock'
    try:lock.mkdir(mode=0o700)
    except FileExistsError:raise Rejected('Pages lock held; no automatic stale-lock removal')
    record=root/(op+'.json')
    try:
        require(not record.exists() and not record.is_symlink(),'Operation already attempted; reconcile separately')
        first=port.snapshot();_snapshot(first,expected,approval['holidayEvidenceSHA256'],now)
        # Two observations do not replace the external shared Pages concurrency
        # group. They fail closed on detectable source/publisher/holiday drift.
        _snapshot(port.snapshot(),expected,approval['holidayEvidenceSHA256'],now)
        event={'operationId':op,'operation':kind,'state':'ATTEMPTING','archiveSHA256':sha(target_raw),'payloadDigest':target_receipt['payloadDigest'],'priorDeploymentId':expected['deploymentId'],'approvalRef':approval['approvalRef'],'routeId':port.route_id,'simulated':getattr(port,'simulated',False) is True}
        atomic_json(record,event)
        try:
            identity=port.deploy(target_raw,target_receipt,op)
            require(isinstance(identity,str) and 0<len(identity)<=200,'Missing deployment receipt')
            expected_after={'deploymentId':identity,'payloadDigest':target_receipt['payloadDigest'],'sourceCommit':target_receipt['sourceCommit']}
            _snapshot(port.readback(identity),expected_after,approval['holidayEvidenceSHA256'],now)
        except Exception:
            event['state']='UNCERTAIN';replace_json(record,event);raise Rejected('Outcome uncertain; no automatic retry/restore')
        event['state']='CONFIRMED';event['deploymentId']=identity;replace_json(record,event)
        return event
    finally:lock.rmdir()
