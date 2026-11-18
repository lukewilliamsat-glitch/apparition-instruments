import json
import unittest
from unittest.mock import patch

import anchor


class ProductionPreflightTest(unittest.TestCase):
    good = dict(readOnly='on', ssl=True, objects=0, vectorBuckets=0, vectorIndexes=0, externalTables=0)
    token = '00000001-00000001-1'
    env = {'PGSSLMODE': 'verify-full', 'PGSSLROOTCERT': '/fixture/root.crt'}

    def call(self, **delta):
        with patch.object(anchor, 'psql', return_value=json.dumps(self.good | delta).encode()) as psql:
            anchor.production_preflight(self.env, self.token)
            return psql.call_args.args

    def test_accepts_exact_values_inside_read_only_snapshot(self):
        sql, env, _ = self.call()
        self.assertIs(env, self.env)
        self.assertTrue(sql.startswith(
            f"begin isolation level repeatable read read only; set transaction snapshot '{self.token}';"))
        self.assertIn('pg_stat_ssl where pid=pg_backend_pid()', sql)
        self.assertTrue(sql.endswith('commit;'))

    def test_verified_client_tls_does_not_excuse_absent_backend_tls(self):
        for value, message in ((False, 'false'), (None, 'unavailable or invalid'), (1, 'unavailable or invalid')):
            with self.subTest(value=value), self.assertRaisesRegex(
                    anchor.Refusal, r'backend TLS \(pg_stat_ssl\): ' + message):
                self.call(ssl=value)

    def test_reports_scope_and_read_only_failures_without_values(self):
        for field in ('objects', 'vectorBuckets', 'vectorIndexes', 'externalTables'):
            with self.subTest(field=field), self.assertRaisesRegex(anchor.Refusal, field + ': nonzero'):
                self.call(**{field: 1})
        with self.assertRaisesRegex(anchor.Refusal, 'read-only transaction: off'):
            self.call(readOnly='off')
        with self.assertRaisesRegex(anchor.Refusal, 'objects: unavailable or invalid'):
            self.call(objects=False)

    def test_malformed_response_is_refused_without_echoing_it(self):
        cases = (b'not json', b'[]', b'{}', json.dumps(self.good | {'unexpected': 'synthetic'}).encode())
        for case in cases:
            with patch.object(anchor, 'psql', return_value=case), self.assertRaisesRegex(
                    anchor.Refusal, '^unexpected production preflight response$'):
                anchor.production_preflight(self.env, self.token)


if __name__ == '__main__':
    unittest.main()
