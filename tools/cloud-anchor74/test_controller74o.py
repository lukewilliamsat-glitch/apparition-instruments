"""Adversarial controller tests using real Git objects and fictional GitHub API records."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from unittest.mock import patch

import controller74o as c
from restore_plan import binding_commitment

RUN='190001'
OPAQUE='fixture_sql_credential_row_never_emit'


def rejected(fn):
    try: fn()
    except c.Rejected: return
    raise AssertionError('unapproved or malformed recovery accepted')


def fake_records(root, run=RUN):
    def git(*args):
        return subprocess.check_output(['git','-C',str(root),*args],stderr=subprocess.DEVNULL)
    def write(path,text):
        p=root/path; p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(text)
    def commit(message):
        git('add','--all')
        git('-c','user.email=synthetic@example.invalid','-c','user.name=Fixture','commit','-m',message)
        return git('rev-parse','HEAD').decode().strip()
    git('init')
    write(c.WORKFLOW,b"name: fixture\non: workflow_dispatch\n")
    policy=dict(format='anchor74-recovery-candidate-1',restore_profile=c.PROFILE,fallback='off')
    write(c.CANDIDATE_PATH,c.canonical(policy))
    trusted=commit('synthetic trusted controller')
    write('tools/cloud-anchor74/Dockerfile',b'RUN exit 1 # untrusted candidate never builds')
    write('tools/cloud-anchor74/anchor.py',b'raise RuntimeError("candidate must not execute")')
    first=commit('candidate code ignored')
    write(c.CANDIDATE_PATH,c.canonical(policy|{'fallback':'owner-encrypted-aggregate'}))
    second=commit('second candidate on same controller and environment')
    write(c.CANDIDATE_PATH,c.canonical(policy|{'recipient':'age1attacker'}))
    malicious=commit('redirect fallback output')
    p=root/c.CANDIDATE_PATH; p.unlink(); p.symlink_to('anchor.py')
    symlink=commit('candidate symlink refused')
    history=[]
    run_info=dict(id=int(run),head_sha=trusted,run_attempt=1,event='workflow_dispatch',path=c.WORKFLOW)
    def api(endpoint):
        if endpoint==f'actions/runs/{run}':
            return run_info
        if endpoint==f'actions/runs/{run}/approvals':
            return history
        _,kind,sha=endpoint.split('/')
        if kind=='commits':
            return dict(sha=sha,tree=dict(sha=git('rev-parse',sha+'^{tree}').decode().strip()))
        if kind=='trees':
            entries=[]
            for line in git('ls-tree','-z',sha).split(b'\0'):
                if not line: continue
                meta,path=line.decode().split('\t')
                mode,cls,obj=meta.split()
                entries.append(dict(mode=mode,type=cls,sha=obj,path=path))
            return dict(sha=sha,tree=entries,truncated=False)
        if kind=='blobs':
            import base64
            raw=git('cat-file','blob',sha)
            return dict(sha=sha,encoding='base64',content=base64.b64encode(raw).decode(),size=len(raw))
        raise AssertionError('controller used an unexpected endpoint')
    env=dict(GITHUB_SHA=trusted,GITHUB_RUN_ID=run,GITHUB_REF=c.TAG,GITHUB_EVENT_NAME='workflow_dispatch',
             GITHUB_REPOSITORY=c.REPO,GITHUB_RUN_ATTEMPT='1',ANCHOR_CANDIDATE=first,
             GITHUB_WORKFLOW_REF=f'{c.REPO}/{c.WORKFLOW}@{c.TAG}',ANCHOR_CONTROLLER_APPROVED_SHA=trusted)
    return env,api,first,second,malicious,symlink,history,run_info


def sha(doc):
    return hashlib.sha256(c.canonical(doc)).hexdigest()


def approval(doc,who=c.OWNER_ID,env=c.ENV_ID):
    return dict(state='approved',user={'id':who},environments=[dict(id=env,name=c.ENVIRONMENT)],
                comment='approve-anchor74 '+sha(doc))


def core(root):
    env,api,first,second,malicious,symlink,history,run_info=fake_records(root)
    doc1=c.plan(env,api)
    change=env|{'ANCHOR_CANDIDATE':second}
    doc2=c.plan(change,api)
    assert doc1['candidate_sha']==first and doc2['candidate_sha']==second
    assert doc1['review_environment_id']==doc2['review_environment_id']==c.ENV_ID
    rejected(lambda:c.authorize(env,api,sha(doc1)))
    history[:]=[approval(doc1,who=10001)]
    rejected(lambda:c.authorize(env,api,sha(doc1)))
    history[:]=[approval(doc1,env=10001)]
    rejected(lambda:c.authorize(env,api,sha(doc1)))
    history[:]=[approval(doc1)|{'comment':''}]
    rejected(lambda:c.authorize(env,api,sha(doc1)))
    history[:]=[approval(doc1)|{'state':'rejected'}]
    rejected(lambda:c.authorize(env,api,sha(doc1)))
    history[:]=[approval(doc1)]
    assert c.authorize(env,api,sha(doc1))==doc1
    rejected(lambda:c.authorize(change,api,sha(doc1)))
    rejected(lambda:c.authorize(change,api,sha(doc2)))  # prior plan review cannot be replayed
    history[:]=[approval(doc2)]
    assert c.authorize(change,api,sha(doc2))==doc2
    rejected(lambda:c.authorize(change|{'GITHUB_RUN_ATTEMPT':'2'},api,sha(doc2)))
    rejected(lambda:c.authorize(change|{'ANCHOR_CONTROLLER_APPROVED_SHA':'1'*40},api,sha(doc2)))
    history.append(approval(doc2))
    rejected(lambda:c.authorize(change,api,sha(doc2)))
    for bad in (malicious,symlink,'main','0'*40+'; injected'):
        rejected(lambda:c.plan(env|{'ANCHOR_CANDIDATE':bad},api))
    rejected(lambda:c.owner_review(doc2|{'run_id':'190002'},[approval(doc2)]))
    rejected(lambda:c.owner_review(doc2|{'archive_commitment':'2'*64},[approval(doc2)]))
    rejected(lambda:c.owner_review(doc2|{'restore_profile':'another-profile'},[approval(doc2)]))
    def mutated_transport(endpoint):
        value=api(endpoint)
        return value|{'content':'AAAA'} if endpoint.startswith('git/blobs/') else value
    rejected(lambda:c.plan(env,mutated_transport))
    run_info['head_sha']='5'*40
    rejected(lambda:c.plan(change,api))
    log=('noise='+OPAQUE+'\nCLOUD ANCHOR refused: V2 recovery comparison failed: constraints; '
         'constraint kinds (check=2); rule hints only (expression_shape=2); '
         'constraint outcomes (native_equivalent=1, target_quoting_restriction=1); '
         'constraints (rule=1); other='+OPAQUE).encode()
    aggregate=c.diagnostics(log)
    assert aggregate['diagnostics']['constraint outcomes']['target_quoting_restriction']==1
    assert OPAQUE.encode() not in c.fallback_bytes(doc2,aggregate)
    rejected(lambda:c.fallback_bytes(doc1,aggregate))
    injected=c.diagnostics(log.replace(b'target_quoting_restriction',OPAQUE.encode()))
    assert injected['diagnostics']=={}
    rejected(lambda:c.diagnostics(b'x'*(c.MAX_LOG+1)))
    rejected(lambda:c.fallback_bytes(doc2,aggregate|{'raw':OPAQUE}))
    print('PASS controller: two real Git candidates on same environment, exact owner review, replays, mutable inputs, symlinks, untrusted code and malicious diagnostics refused.')


def restore_native(exchange_path,key_path):
    exchange=Path(exchange_path).resolve()
    captured=json.loads((exchange/'capture.json').read_text())
    run=os.environ['ANCHOR_RUN']
    assert captured['mode']=='synthetic' and captured['project']=='fixture-only' and captured['capture_run']==run
    archive=exchange/'backup.age'
    metadata=dict(capture_run=run,release='100001',asset='100002',
                  sha256=captured['sha256'],bytes=str(captured['bytes']))
    assert archive.stat().st_size==captured['bytes']
    assert hashlib.sha256(archive.read_bytes()).hexdigest()==captured['sha256']
    with tempfile.TemporaryDirectory() as root:
        env,api,_,_,_,_,history,_=fake_records(Path(root),run)
        with patch.multiple(c,CAPTURE=run,BINDING=binding_commitment(metadata)):
            pending=c.plan(env,api)
            rejected(lambda:c.authorize(env,api,sha(pending)))
            history.append(approval(pending))
            approved=c.authorize(env,api,sha(pending))
        # Link the exact synthetic approval to execution, not merely a
        # separately generated receipt. Pass only the fictional verifier by stdin.
        runner_env={k:os.environ[k] for k in ('PATH','RUNNER_TEMP','ANCHOR_RUN','HOME') if k in os.environ}
        with open(key_path,'rb') as identity:
            subprocess.run(['bash',str(Path(__file__).with_name('host-run.sh')),
                            str(exchange),'none','fixture-restore-v2-classified',captured['sha256'],run],
                           stdin=identity,env=runner_env,check=True,timeout=150)
        receipt=json.loads((exchange/'restore.json').read_text())
        proof_hash=hashlib.sha256(Path(__file__).with_name('proof-v2.sql').read_bytes()).hexdigest()
        assert c.verify_receipt(receipt,approved,metadata,proof_hash,fixture=True)['status']=='passed'
        for field,val in [('checks',list(c.GROUPS)[:-1]+['impostor']),('restore_run','101000'),
                          ('archive_sha256','0'*64),('proof_sha256','0'*64),('extra',OPAQUE)]:
            rejected(lambda:c.verify_receipt(receipt|{field:val},approved,metadata,proof_hash,fixture=True))
        rejected(lambda:c.verify_receipt(receipt,approved,metadata|{'asset':'100003'},proof_hash,fixture=True))
        print('PASS controller: exact synthetic approval to independently retrieved native 14-group receipt; receipt, identity and binding mutations refused.')


if __name__=='__main__':
    if len(sys.argv)==3:
        restore_native(*sys.argv[1:])
    else:
        with tempfile.TemporaryDirectory() as tmp:
            core(Path(tmp))
