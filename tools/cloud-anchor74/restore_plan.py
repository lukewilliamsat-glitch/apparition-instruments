"""Make or verify a metadata-only review plan. Does not call providers or dispatch."""
import argparse
import hashlib
import hmac
import json
import re
import sys

LIMIT = 8192
FIELDS = {
    'repository': r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',
    'controller_sha': r'[0-9a-f]{40}',
    'candidate_sha': r'[0-9a-f]{40}',
    'workflow_blob': r'[0-9a-f]{40}',
    'archive_commitment': r'[0-9a-f]{64}',
    'capture_run': r'[1-9][0-9]{4,20}',
    'review_environment': r'[A-Za-z0-9_.-]{1,64}',
    'restore_profile': r'[a-z0-9-]{1,64}',
}


class Rejected(Exception):
    pass


def demand(test, category):
    if not test:
        raise Rejected(category)


def binding_commitment(metadata):
    demand(isinstance(metadata, dict) and set(metadata) == {'capture_run','release','asset','bytes','sha256'},
           'unexpected archive metadata fields')
    values = [metadata[k] for k in ('capture_run', 'release', 'asset', 'bytes', 'sha256')]
    for value, pattern in zip(values, (r'[1-9][0-9]{4,20}', r'[1-9][0-9]{0,20}',
                                     r'[1-9][0-9]{0,20}', r'[1-9][0-9]{0,8}', r'[0-9a-f]{64}')):
        demand(isinstance(value, str) and re.fullmatch(pattern, value), 'invalid archive metadata')
    demand(int(metadata['bytes']) <= 256 * 1024**2, 'archive size exceeds restore limit')
    return hashlib.sha256(('\n'.join(values) + '\n').encode('ascii')).hexdigest()


def validated_plan(value):
    demand(isinstance(value, dict) and set(value) == set(FIELDS), 'unexpected plan fields')
    for key, pattern in FIELDS.items():
        field = value[key]
        demand(isinstance(field, str) and len(field) <= 200 and re.fullmatch(pattern, field), 'invalid plan field: ' + key)
    return value


def digest_plan(expected, observed, vault_metadata, reviewed=None):
    expected, observed = map(validated_plan, (expected, observed))
    for key in FIELDS:
        demand(hmac.compare_digest(expected[key], observed[key]), 'plan evidence differs: ' + key)
    archive = binding_commitment(vault_metadata)
    demand(vault_metadata['capture_run'] == observed['capture_run']
           and hmac.compare_digest(archive, observed['archive_commitment']), 'vault metadata does not match plan')
    plan = json.dumps({'format': 'cloud-anchor-restore-plan-1', **expected},
                      sort_keys=True, separators=(',', ':'), ensure_ascii=True)
    digest = hashlib.sha256(plan.encode('ascii') + b'\n').hexdigest()
    if reviewed is not None:
        demand(isinstance(reviewed, str) and re.fullmatch(r'[0-9a-f]{64}', reviewed)
               and hmac.compare_digest(digest, reviewed), 'reviewed plan digest differs')
    return {'plan_sha256': digest, 'status': 'review-digest-matched' if reviewed else 'metadata-matched'}


def read_json(path):
    def unique(pairs):
        out = {}
        for key, value in pairs:
            demand(key not in out, 'duplicate JSON key')
            out[key] = value
        return out

    with open(path, 'rb') as f:
        data = f.read(LIMIT + 1)
    demand(len(data) <= LIMIT, 'metadata exceeds input limit')
    return json.loads(data, object_pairs_hook=unique)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--approved-plan', required=True)
    p.add_argument('--observed-plan', required=True)
    p.add_argument('--vault-metadata', required=True)
    p.add_argument('--reviewed-plan-sha')
    a = p.parse_args()
    try:
        outcome = digest_plan(read_json(a.approved_plan), read_json(a.observed_plan),
                              read_json(a.vault_metadata), a.reviewed_plan_sha)
    except Rejected as exc:
        print('Restore metadata plan refused: ' + str(exc), file=sys.stderr)
        return 1
    except (OSError, ValueError, RecursionError):
        print('Restore metadata plan refused: unreadable input.', file=sys.stderr)
        return 1
    print(json.dumps(outcome, sort_keys=True))
    return 0


if __name__ == '__main__':
    sys.exit(main())
