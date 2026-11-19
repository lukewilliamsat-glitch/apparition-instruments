"""Run with python3 tools/cloud-anchor74/test_restore_plan.py; all inputs fictional."""
import json
import pathlib
import tempfile

import restore_plan as r


def reject(operation):
    try:
        operation()
    except r.Rejected:
        return
    raise AssertionError('changed or malformed plan accepted')


archive = dict(capture_run='100000', release='100001', asset='100002', bytes='123', sha256='0'*64)
commitment = r.binding_commitment(archive)
approved = dict(repository='fictional/anchor', candidate_sha='1'*40, controller_sha='2'*40,
                workflow_blob='3'*40, restore_profile='fictional-proof-2', capture_run='100000',
                review_environment='fictional-env', archive_commitment=commitment)
found = r.digest_plan(approved, dict(reversed(list(approved.items()))), archive)
assert found == {'plan_sha256': 'ca3d3cac1d504571850b4820e4da79ad698a3e7ffa90c1c311d7ba0a0e17f6a1',
                 'status': 'metadata-matched'}
assert r.digest_plan(approved, approved, archive, found['plan_sha256'])['status'] == 'review-digest-matched'
for field in approved:
    reject(lambda: r.digest_plan(approved, approved | {field:'4'}, archive))
changes = dict(capture_run='200000', release='200001', asset='200002', bytes='321', sha256='f'*64)
for field, value in changes.items():
    reject(lambda: r.digest_plan(approved, approved, archive | {field:value}))
reject(lambda: r.digest_plan(approved, approved, archive, 'f'*64))
reject(lambda: r.digest_plan(approved, approved, archive | {'secret': 'fictional'}))
with tempfile.TemporaryDirectory() as root:
    p = pathlib.Path(root)/'test.json'
    p.write_text('{"test":"x","test":"y"}')
    reject(lambda: r.read_json(p))
    p.write_text(json.dumps('x'*(r.LIMIT+1)))
    reject(lambda: r.read_json(p))
print('PASS metadata plan: source, archive and review binding; changed fields, duplicate keys and oversized inputs refused.')
