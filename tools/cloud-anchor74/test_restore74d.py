"""74D synthetic-only checks; no vault credentials or provider connection."""
import copy
import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import patch

import anchor


class Comparisons(unittest.TestCase):
    def setUp(self):
        self.expected = dict.fromkeys(anchor.PROOF_GROUPS)
        self.expected['columns'] = [
            dict(ns='hidden_schema_name', rel='hidden_table_name', attname='hidden_column_name',
                 type='text', attnotnull=False, attidentity='', attgenerated='', acl=None, default_expr=None)]

    def test_mandatory_groups(self):
        self.assertEqual(anchor.proof_mismatches(self.expected, self.expected), [])
        for group in anchor.PROOF_GROUPS:
            with self.subTest(group=group):
                actual = self.expected | {group: 'changed'}
                self.assertEqual(anchor.proof_mismatches(self.expected, actual), [group])
                with self.assertRaises(anchor.Refusal):
                    anchor.proof_mismatches(self.expected, {k: v for k, v in actual.items() if k != group})

    def test_columns_identify_field_and_presence(self):
        base = self.expected['columns']
        for field in anchor.COLUMN_FIELDS:
            with self.subTest(field=field):
                restored = [base[0] | {field: 'different'}]
                self.assertEqual(anchor.column_difference(base, restored), field + '=1')
        self.assertEqual(anchor.column_difference(base, []), 'missing=1')
        self.assertEqual(anchor.column_difference([], base), 'added=1')

    def test_diagnostics_never_accept_or_print_values(self):
        actual = copy.deepcopy(self.expected)
        actual['columns'][0]['default_expr'] = 'hidden_default_definition'
        actual['policies'] = 'hidden_policy_definition'
        alternate = self.expected | {'policies': actual['policies']}
        with patch.object(anchor, 'psql', return_value=json.dumps(alternate).encode()), \
                self.assertRaises(anchor.Refusal) as err:
            anchor.verify_proof(self.expected, actual, {}, 'select 1;')
        message = str(err.exception)
        self.assertIn('columns, policies', message)
        self.assertIn('default_expr=1', message)
        self.assertIn('alternate search-path match (diagnostic only): columns', message)
        self.assertNotIn('hidden_', message)


def native():
    anchor.offline()
    for managed_path in (False, True):
        with tempfile.TemporaryDirectory(dir='/work') as d:
            work = pathlib.Path(d)
            source, target, exchange = [work / name for name in ('source', 'target', 'exchange')]
            for path in (source, target, exchange):
                path.mkdir()
            key_path = work / 'fixture-key'
            anchor.run(['age-keygen', '-o', str(key_path)], step='fixture key generation failed')
            recipient = anchor.run(['age-keygen', '-y', str(key_path)],
                                   step='fixture recipient verification failed').decode().strip()
            key = next(line for line in key_path.read_text().splitlines() if line.startswith('AGE-SECRET-KEY-1'))
            with patch.object(anchor, 'EXCHANGE', exchange):
                db, env = anchor.start_local(source, 'anchor_fixture_source')
                try:
                    anchor.psql((anchor.HOME / 'fixture.sql').read_text(), env, 'fixture setup failed')
                    anchor.psql('CREATE TABLE public.path_test (id uuid DEFAULT extensions.uuid_generate_v4());',
                                env, 'fixture default setup failed')
                    if managed_path:
                        anchor.psql('ALTER DATABASE postgres SET search_path TO public, extensions;',
                                    env, 'fixture source search_path setup failed')
                    anchor.capture(source, env, [recipient], 'synthetic')
                finally:
                    anchor.stop_local(db)
                digest = anchor.sha(exchange / 'backup.age')
                try:
                    anchor.restore(target, 'synthetic', key, digest, anchor.git_run())
                except anchor.Refusal as err:
                    if not managed_path:
                        raise
                    assert 'columns (default_expr=1)' in str(err), str(err)
                    assert 'alternate search-path match (diagnostic only): columns' in str(err), str(err)
                    assert not (exchange / 'restore.json').exists()
                    print('PASS native: genuine dump/restore reproduced a proof difference from search_path; fail closed.')
                else:
                    assert not managed_path, 'search-path mismatch was not detected'
                    receipt = json.loads((exchange / 'restore.json').read_text())
                    assert set(receipt['checks']) == set(anchor.PROOF_GROUPS)
                    print('PASS native: fixture restored with all 14 original comparison groups.')


if __name__ == '__main__':
    run_native = '--native' in sys.argv
    suite = unittest.main(argv=[sys.argv[0]], exit=False)
    if not suite.result.wasSuccessful():
        sys.exit(1)
    if run_native:
        native()
