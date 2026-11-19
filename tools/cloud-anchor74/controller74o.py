"""Trusted recovery dispatcher: candidate commits supply reviewed data, never code."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import subprocess
import sys

from constraint74o import FIXED as NATIVE_DIAGNOSTICS
from restore_plan import validated_plan, digest_plan, read_json, Rejected

REPO='lukewilliamsat-glitch/apparition-instruments'
OWNER_ID=281964084
ENV_ID=27712338155
ENVIRONMENT='cloud-anchor74-restore'
TAG='refs/tags/cloud-anchor-v2-controller'
WORKFLOW='.github/workflows/cloud-anchor74-controller.yml'
CANDIDATE_PATH='tools/cloud-anchor74/restore-candidate.json'
PROFILE='v2-constraint-native-2'
PROJECT='acdxpxvksvdwfajntzfx'
CAPTURE='44349292200'
BINDING='6dc1942de3e008a86a24bf272ad4cd83a9a4cd05b22faa51494bf745a3f3b34d'
# Owner supplied this permanent recipient, independently recovery-tested in 74C,
# and reconfirmed it unchanged for V2. Never take an evidence recipient from a candidate.
OWNER_RECIPIENT='age1g7n756m2zepfw0u4t64s8ssyzzncdqs2fyz2t62zaeu70ryegyusp6w646'
GROUPS=frozenset('schemas relations columns counts constraints indexes policies triggers functions sequences joins role_memberships admin_acl core_extensions'.split())
DIAGNOSTICS=NATIVE_DIAGNOSTICS | frozenset('validation_mismatch extra_target missing_target unsupported other_group_unresolved probe_budget'.split())
HINTS=frozenset('cast_notation type_tokens collation_tokens qualification call_tokens literal_tokens operator_tokens expression_shape referential_actions deferral_tokens uniqueness_tokens inheritance_tokens bounded_input other_tokens'.split())
KINDS=frozenset('check foreign_key primary_key unique exclude other different_kind'.split())
CHECK_GROUPS=(
    ('constraint kinds',KINDS),('rule hints only',HINTS),('constraint outcomes',DIAGNOSTICS),
)
RECEIPT_FIELDS=set('status mode project capture_run restore_run restored_utc archive_sha256 restore_server checks acl_order_equivalent network proof_version proof_search_path proof_sha256 restore_profile equivalent_relation_default_acls equivalent_native_check_rules'.split())
HEX40=re.compile(r'[0-9a-f]{40}')
HEX64=re.compile(r'[0-9a-f]{64}')
ID=re.compile(r'[1-9][0-9]{4,20}')
MAX_LOG=32768


def must(value,message):
    if not value:
        raise Rejected(message)


def canonical(value):
    return (json.dumps(value,sort_keys=True,ensure_ascii=True,separators=(',',':'))+'\n').encode('ascii')


def checked_id(raw, pattern, message):
    must(isinstance(raw,str) and pattern.fullmatch(raw),message)
    return raw


def gh(endpoint):
    # Expose the read-scoped Actions token only to this trusted API client.
    env={k:os.environ[k] for k in ('PATH','GH_TOKEN') if k in os.environ}
    p=subprocess.run(['gh','api','--hostname','github.com','--method','GET',f'repos/{REPO}/{endpoint}'],
                     env=env,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=18)
    must(p.returncode==0 and len(p.stdout)<=2*1024*1024,'could not read trusted GitHub metadata')
    return json.loads(p.stdout)


def pinned_blob(candidate,path,api):
    sha=checked_id(candidate,HEX40,'candidate commit must be a full immutable SHA')
    commit=api(f'git/commits/{sha}')
    must(isinstance(commit,dict) and commit.get('sha')==sha,'GitHub commit identity differs')
    tree=checked_id(commit.get('tree',{}).get('sha'),HEX40,'invalid GitHub tree identity')
    parts=path.split('/')
    for i,component in enumerate(parts):
        reply=api(f'git/trees/{tree}')
        must(reply.get('sha')==tree and reply.get('truncated') is False,'incomplete or different GitHub tree')
        hits=[x for x in reply.get('tree',[]) if x.get('path')==component]
        expected=('blob','100644') if i==len(parts)-1 else ('tree','040000')
        must(len(hits)==1 and (hits[0].get('type'),hits[0].get('mode'))==expected,
             'reviewed path is absent or not a regular tracked file')
        tree=checked_id(hits[0].get('sha'),HEX40,'invalid tree or blob identity')
    reply=api(f'git/blobs/{tree}')
    must(reply.get('sha')==tree and reply.get('encoding')=='base64'
         and type(reply.get('size')) is int and 0<reply['size']<=8192,'blob exceeds review input contract')
    value=base64.b64decode(''.join(reply['content'].split()),validate=True)
    must(len(value)==reply['size'] and hashlib.sha1(f'blob {len(value)}\0'.encode()+value).hexdigest()==tree,
         'blob bytes do not match immutable Git identity')
    return tree,value


def candidate_profile(data):
    try:
        value=json.loads(data)
    except (TypeError,ValueError):
        raise Rejected('candidate is not a recognised review manifest') from None
    must(isinstance(value,dict) and set(value)=={'format','restore_profile','fallback'}
         and value['format']=='anchor74-recovery-candidate-1' and value['restore_profile']==PROFILE
         and value['fallback'] in ('off','owner-encrypted-aggregate')
         and data==canonical(value),'candidate manifest cannot extend the trusted engine')
    return value


def identity(env):
    controller=checked_id(env.get('GITHUB_SHA'),HEX40,'controller SHA missing')
    run=checked_id(env.get('GITHUB_RUN_ID'),ID,'invalid GitHub run ID')
    must(env.get('GITHUB_REPOSITORY')==REPO and env.get('GITHUB_REF')==TAG
         and env.get('GITHUB_WORKFLOW_REF')==f'{REPO}/{WORKFLOW}@{TAG}'
         and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and env.get('GITHUB_RUN_ATTEMPT')=='1',
         'wrong controller workflow, tag, event or replayed attempt')
    return controller,run


def plan(env,api):
    controller,run=identity(env)
    candidate=checked_id(env.get('ANCHOR_CANDIDATE'),HEX40,'candidate commit must be a full immutable SHA')
    manifest,data=pinned_blob(candidate,CANDIDATE_PATH,api)
    workflow,_=pinned_blob(controller,WORKFLOW,api)
    run_info=api(f'actions/runs/{run}')
    must(type(run_info.get('id')) is int and str(run_info['id'])==run and run_info.get('head_sha')==controller
         and run_info.get('run_attempt')==1 and run_info.get('event')=='workflow_dispatch'
         and run_info.get('path')==WORKFLOW,'GitHub run details do not match the controller plan')
    doc=validated_plan(dict(repository=REPO,controller_sha=controller,candidate_sha=candidate,
                            workflow_blob=workflow,archive_commitment=BINDING,capture_run=CAPTURE,
                            review_environment=ENVIRONMENT,restore_profile=PROFILE))
    return doc | dict(format='anchor74-controller-plan-1', candidate_manifest=manifest,run_id=run,
                      attempt=1,review_environment_id=ENV_ID,reviewer_id=OWNER_ID,
                      fallback=candidate_profile(data)['fallback'])


def owner_review(doc, history):
    must(isinstance(history,list) and len(history)<=20,'ambiguous GitHub review history')
    targeted=[r for r in history if any(e.get('id')==ENV_ID and e.get('name')==ENVIRONMENT
                                     for e in r.get('environments',[]))]
    command='approve-anchor74 '+hashlib.sha256(canonical(doc)).hexdigest()
    must(len(targeted)==1 and targeted[0].get('state')=='approved'
         and targeted[0].get('user',{}).get('id')==OWNER_ID
         and targeted[0].get('comment')==command,
         'protected owner review missing or does not approve this exact run and plan')


def authorize(env, api, preflight):
    doc=plan(env,api)
    check=checked_id(preflight,HEX64,'preflight digest is missing')
    must(hmac.compare_digest(hashlib.sha256(canonical(doc)).hexdigest(),check),
         'execution plan changed since no-secret preflight')
    must(env.get('ANCHOR_CONTROLLER_APPROVED_SHA')==doc['controller_sha'],
         'controller SHA does not match protected environment variable')
    owner_review(doc,api(f"actions/runs/{doc['run_id']}/approvals"))
    return doc


def verify_receipt(receipt, doc, metadata, proof_hash, *, fixture=False):
    # Reuse the archive-binding implementation, independently of engine output.
    base={k:doc[k] for k in ('repository','controller_sha','candidate_sha','workflow_blob',
                          'archive_commitment','capture_run','review_environment','restore_profile')}
    digest_plan(base,base,metadata)
    must(isinstance(receipt,dict) and set(receipt)==RECEIPT_FIELDS,'unexpected receipt schema')
    checks=receipt.get('checks')
    must(isinstance(checks,list) and all(isinstance(g,str) for g in checks)
         and len(checks)==len(GROUPS) and frozenset(checks)==GROUPS,'incomplete or duplicate recovery comparisons')
    exact=dict(status='passed', mode='synthetic' if fixture else 'production',
               project='fixture-only' if fixture else PROJECT,capture_run=doc['capture_run'],
               restore_run=doc['run_id'],archive_sha256=metadata['sha256'],
               proof_version=2,proof_search_path='pg_catalog',proof_sha256=proof_hash,
               restore_profile=PROFILE,acl_order_equivalent=[],network='loopback only, no provider credentials')
    must(all(receipt.get(k)==v for k,v in exact.items()),'recovery receipt is inconsistent with the authorised plan')
    must(isinstance(receipt.get('restore_server'),str) and re.fullmatch(r'17\.6(?: \([\x20-\x7e]{1,100}\))?',receipt['restore_server'])
         and isinstance(receipt.get('restored_utc'),str) and re.fullmatch(r'20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+00:00',receipt['restored_utc']),
         'invalid restore server or timestamp')
    for name in ('equivalent_relation_default_acls','equivalent_native_check_rules'):
        must(isinstance(receipt.get(name),str) and re.fullmatch(r'(?:0|[1-9][0-9]{0,3})',receipt[name]),
             'invalid equivalence count')
    return {k:receipt[k] for k in ('status','capture_run','restore_run','proof_version',
            'restore_profile','checks','equivalent_relation_default_acls','equivalent_native_check_rules','restored_utc',
            'archive_sha256','proof_sha256')}


def diagnostics(log):
    must(isinstance(log,bytes) and len(log)<=MAX_LOG,'restore diagnostic exceeded trusted output contract')
    lines=[l for l in log.decode('utf8',errors='replace').splitlines()
           if l.startswith('CLOUD ANCHOR refused: V2 recovery comparison failed: ')]
    if len(lines)!=1:
        return {'status':'refused','stage':'restore','diagnostics':{}}
    categories={}
    for label,allowed in CHECK_GROUPS:
        match=re.search(r'(?:^|; )'+re.escape(label)+r' \(([^)]{1,1500})\)',lines[0])
        if not match:
            continue
        values={}
        for pair in match[1].split(', '):
            item=re.fullmatch(r'([a-z_]+)=([1-9][0-9]{0,3})(\+?)',pair)
            if not item or item[1] not in allowed or item[1] in values:
                return {'status':'refused','stage':'restore','diagnostics':{}}
            values[item[1]]=int(item[2])
        categories[label]=values
    return {'status':'refused','stage':'proof_comparison','diagnostics':categories}


def fallback_bytes(doc,summary):
    must(doc['fallback']=='owner-encrypted-aggregate','encrypted fallback not approved')
    # Reconstruct only from a canonical, named bounded vocabulary. No raw
    # constraint ASTs, SQL, identifiers, literals, server logs or row data.
    must(set(summary)=={'status','stage','diagnostics'} and summary['status']=='refused'
         and summary['stage'] in ('restore','proof_comparison')
         and summary['diagnostics'].keys() <= dict(CHECK_GROUPS).keys(),'unsafe failure evidence')
    for label,counts in summary['diagnostics'].items():
        must(all(k in dict(CHECK_GROUPS)[label] and type(v) is int and 1<=v<=9999 for k,v in counts.items()),
             'unsafe failure evidence')
    return canonical(dict(format='anchor74-aggregate-diagnostics-1',capture_run=doc['capture_run'],
                          restore_run=doc['run_id'],plan_sha256=hashlib.sha256(canonical(doc)).hexdigest(),**summary))


def main():
    mode=sys.argv[1]
    if mode in ('plan','authorize'):
        env=os.environ
        doc=plan(env,gh) if mode=='plan' else authorize(env,gh,env.get('ANCHOR_PREFLIGHT_DIGEST'))
        Path(sys.argv[2]).write_bytes(canonical(doc))
        print(hashlib.sha256(canonical(doc)).hexdigest())
    elif mode=='receipt':
        doc,metadata,receipt=(read_json(x) for x in sys.argv[2:5])
        out=verify_receipt(receipt,doc,{'capture_run':doc['capture_run'],**metadata},
                           hashlib.sha256(Path(__file__).with_name('proof-v2.sql').read_bytes()).hexdigest())
        print(f'Approved plan SHA-256: {hashlib.sha256(canonical(doc)).hexdigest()}')
        print('V2 does not independently seal the original partition and inheritance graph.')
        print(json.dumps(out | {k:doc[k] for k in ('controller_sha','candidate_sha','archive_commitment')},sort_keys=True))
    elif mode in ('diagnostics','fallback'):
        with open(sys.argv[2],'rb') as file:
            result=diagnostics(file.read(MAX_LOG+1))
        if mode=='fallback':
            sys.stdout.buffer.write(fallback_bytes(read_json(sys.argv[3]),result))
        else:
            print(json.dumps(result,sort_keys=True))
    elif mode=='owner-recipient':
        print(OWNER_RECIPIENT)
    else:
        raise Rejected('unsupported controller command')


if __name__=='__main__':
    try:
        main()
    except Rejected as exc:
        print('CLOUD ANCHOR controller refused: '+str(exc),file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('CLOUD ANCHOR controller refused: malformed or unavailable trusted metadata.',file=sys.stderr)
        sys.exit(1)
