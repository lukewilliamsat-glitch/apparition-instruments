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
        rule = dict(schemaname='hidden_schema_name', tablename='hidden_table_name',
                    policyname='hidden_policy_name', permissive='PERMISSIVE', roles=['public'],
                    cmd='SELECT', qual='hidden_policy_definition', with_check=None)
        actual['policies'] = [rule]
        alternate = self.expected | {'policies': actual['policies']}
        with patch.object(anchor, 'psql', return_value=json.dumps(alternate).encode()), \
                self.assertRaises(anchor.Refusal) as err:
            anchor.verify_proof(self.expected, actual, {}, 'select 1;')
        message = str(err.exception)
        self.assertIn('columns, policies', message)
        self.assertIn('default_expr=1', message)
        self.assertIn('policies (added=1)', message)
        self.assertIn('alternate search-path match (diagnostic only): columns', message)
        self.assertNotIn('hidden_', message)

    def test_refuses_non_loopback_network(self):
        with patch.object(anchor.os, 'listdir', return_value=['lo', 'eth0']), self.assertRaises(anchor.Refusal):
            anchor.offline()


def native_mutations(env):
    proof_sql = (anchor.HOME / 'proof.sql').read_text()
    qualification = anchor.psql("""
      BEGIN;
      CREATE EXTENSION citext WITH SCHEMA extensions;
      CREATE TABLE extensions.path_parent(id integer PRIMARY KEY);
      CREATE TABLE public.path_child(name extensions.citext, parent_id integer REFERENCES extensions.path_parent(id));
      CREATE VIEW public.path_view AS SELECT id FROM extensions.path_parent;
      CREATE FUNCTION public.path_fn(val extensions.citext) RETURNS extensions.citext LANGUAGE sql AS $$ SELECT $1 $$;
      SET LOCAL search_path TO pg_catalog, public;
    """ + proof_sql + """
      SET LOCAL search_path TO pg_catalog, public, extensions;
    """ + proof_sql + "\nROLLBACK;", env, 'native qualification fixture failed')
    first, second = map(json.loads, qualification.splitlines())
    differences = anchor.proof_mismatches(first, second)
    assert set(differences) == {'relations', 'columns', 'constraints', 'functions'}, differences
    assert anchor.column_difference(first['columns'], second['columns']) == 'type=1'
    print('PASS native: identical catalogs render different views, types, foreign keys and function signatures under different paths.')
    anchor.psql("""
      CREATE TABLE public.regression_test (id integer, value integer DEFAULT 1,
        CONSTRAINT regression_check CHECK (value > 0));
      CREATE INDEX regression_idx ON public.regression_test(value);
      ALTER TABLE public.regression_test ENABLE ROW LEVEL SECURITY;
      CREATE POLICY regression_policy ON public.regression_test USING (value > 0);
      GRANT SELECT ON public.regression_test TO anon, authenticated, PUBLIC;
      CREATE FUNCTION public.regression_fn() RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$;
    """, env, 'native comparison setup failed')
    base = json.loads(anchor.psql(proof_sql, env, 'native reference proof failed'))
    reordered = copy.deepcopy(base)
    relation = next(row for row in reordered['relations'] if row['rel'] == 'regression_test')
    items = relation['acl'][1:-1].split(',')  # These fixture roles have no quoting or commas.
    assert len(items) >= 4
    relation['acl'] = '{' + ','.join(reversed(items)) + '}'
    assert anchor.verify_proof(base, reordered, env, proof_sql) == ['relations']
    print('PASS native: ACL reordering only; same grantors, grantees, privilege and grant options.')
    mutations = (
        ('ALTER TABLE public.regression_test ALTER id TYPE bigint;', 'columns (type=1)'),
        ('ALTER TABLE public.regression_test ALTER value SET DEFAULT 2;', 'columns (default_expr=1)'),
        ('ALTER TABLE public.regression_test DROP CONSTRAINT regression_check; ALTER TABLE public.regression_test ADD CONSTRAINT regression_check CHECK (value >= 0);', 'constraints (rule=1)'),
        ('ALTER TABLE public.regression_test DROP CONSTRAINT regression_check; ALTER TABLE public.regression_test ADD CONSTRAINT regression_check CHECK (value > 0) NOT VALID;', 'convalidated=1'),
        ('DROP INDEX public.regression_idx; CREATE INDEX regression_idx ON public.regression_test(value DESC);', 'indexes (definition=1)'),
        ('ALTER POLICY regression_policy ON public.regression_test USING (value >= 0);', 'policies (qual=1)'),
        ('CREATE OR REPLACE FUNCTION public.regression_fn() RETURNS integer LANGUAGE sql AS $$ SELECT 2 $$;', 'functions (definition=1)'),
        ('ALTER FUNCTION public.regression_fn() SECURITY DEFINER;', 'functions (definition=1)'),
        ('ALTER FUNCTION public.regression_fn() SET search_path TO extensions;', 'functions (definition=1)'),
        ('ALTER TABLE public.regression_test OWNER TO authenticated;', 'owner=1'),
        ('ALTER TABLE public.regression_test FORCE ROW LEVEL SECURITY;', 'relforcerowsecurity=1'),
        ('REVOKE SELECT ON public.regression_test FROM PUBLIC;', 'relations (acl=1)'),
        ('GRANT SELECT ON public.regression_test TO authenticated WITH GRANT OPTION;', 'relations (acl=1)'),
    )
    for ddl, detail in mutations:
        actual = json.loads(anchor.psql('BEGIN;\n' + ddl + '\n' + proof_sql + '\nROLLBACK;',
                                       env, 'native mutation failed'))
        try:
            anchor.verify_proof(base, actual, env, proof_sql)
        except anchor.Refusal as err:
            assert detail in str(err), str(err)
            assert 'regression_test' not in str(err)
        else:
            raise AssertionError('accepted genuine metadata mutation: ' + detail)
    print(f'PASS native: refused all {len(mutations)} genuine schema and privilege mutations.')


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
                    if not managed_path:
                        native_mutations(env)
                    if managed_path:
                        anchor.psql('ALTER DATABASE postgres SET search_path TO public, extensions;',
                                    env, 'fixture source search_path setup failed')
                    anchor.capture(source, env, [recipient], 'synthetic')
                finally:
                    anchor.stop_local(db)
                digest = anchor.sha(exchange / 'backup.age')
                if not managed_path:
                    def refused(label, attempt_key, candidate_digest):
                        with tempfile.TemporaryDirectory(dir=work) as fail_dir:
                            try:
                                anchor.restore(pathlib.Path(fail_dir), 'synthetic', attempt_key,
                                               candidate_digest, anchor.git_run())
                            except anchor.Refusal as err:
                                assert label in str(err), str(err)
                            else:
                                raise AssertionError('expected archive refusal')
                            assert not (exchange / 'restore.json').exists()

                    wrong_path = work / 'wrong-key'
                    anchor.run(['age-keygen', '-o', str(wrong_path)], step='fixture wrong-key generation failed')
                    wrong = next(line for line in wrong_path.read_text().splitlines()
                                 if line.startswith('AGE-SECRET-KEY-1'))
                    refused('archive decryption or authentication failed', wrong, digest)
                    archived = exchange / 'backup.age'
                    original = archived.read_bytes()
                    archived.write_bytes(original[:-1] + bytes([original[-1] ^ 1]))
                    try:
                        refused('retained archive integrity mismatch', key, digest)
                    finally:
                        archived.write_bytes(original)
                    print('PASS native: incorrect identity and integrity mismatch refused.')
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
