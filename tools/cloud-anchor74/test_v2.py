"""Synthetic PostgreSQL checks only. No provider or vault credentials."""
import json
import pathlib
import tempfile

import anchor

anchor.offline()
with tempfile.TemporaryDirectory(dir='/work') as folder:
    db, env = anchor.start_local(pathlib.Path(folder), 'anchor_fixture_source')
    try:
        for fixture in ('fixture.sql', 'fixture-v2.sql'):
            anchor.psql((anchor.HOME / fixture).read_text(), env, 'V2 regression fixture setup failed')
        body = (anchor.HOME/'proof-v2.sql').read_text()
        def observe(prefix='', statements=()):
            sql = prefix + '\nBEGIN ISOLATION LEVEL REPEATABLE READ;\n' + '\n'.join(statements) + '\n' + body + '\nROLLBACK;'
            return json.loads(anchor.psql(sql, env, 'V2 regression observation failed'))

        anchor.psql('GRANT SELECT ON public.v2_view TO PUBLIC, authenticated, anon;', env, 'V2 ACL fixture setup failed')
        expected = observe()
        assert set(expected) == set(anchor.PROOF_GROUPS)
        assert expected == observe('SET search_path TO auth, public; SET TimeZone TO \'Pacific/Auckland\'; SET quote_all_identifiers TO on;')
        assert expected == observe(statements=[
            'REVOKE SELECT ON public.v2_view FROM PUBLIC, authenticated, anon;',
            'GRANT SELECT ON public.v2_view TO anon, authenticated, PUBLIC;',
        ])
        assert any(c['type_schema']=='extensions' and c['type_name']=='citext' for c in expected['columns'])
        assert any(r['relpersistence']=='u' for r in expected['relations'])
        cases = [
            ('columns', 'ALTER TABLE public.v2_item ALTER value TYPE bigint;'),
            ('columns', "ALTER TABLE public.v2_item ALTER code SET DEFAULT 'different';"),
            ('constraints','ALTER TABLE public.v2_item DROP CONSTRAINT v2_positive; ALTER TABLE public.v2_item ADD CONSTRAINT v2_positive CHECK (value >= 0) NOT VALID;'),
            ('indexes','DROP INDEX public.v2_idx; CREATE INDEX v2_idx ON public.v2_item(code DESC) WHERE value > 0;'),
            ('policies','ALTER POLICY v2_policy ON public.v2_item USING (value >= 0);'),
            ('functions','ALTER FUNCTION public.v2_fn(extensions.citext) SECURITY DEFINER;'),
            ('functions','ALTER FUNCTION public.v2_fn(extensions.citext) SET search_path TO extensions;'),
            ('functions','CREATE OR REPLACE FUNCTION public.v2_fn(val extensions.citext) RETURNS extensions.citext LANGUAGE sql AS $$ SELECT NULL::extensions.citext $$;'),
            ('relations','ALTER VIEW public.v2_view OWNER TO authenticated;'),
            ('relations','ALTER TABLE public.v2_item FORCE ROW LEVEL SECURITY;'),
            ('relations','REVOKE SELECT ON public.v2_item FROM PUBLIC;'),
            ('relations','ALTER TABLE public.v2_item SET LOGGED;'),
            ('columns','REVOKE GRANT OPTION FOR SELECT (value) ON public.v2_item FROM authenticated;'),
        ]
        for group, ddl in cases:
            changed = observe(statements=[ddl])
            assert group in anchor.proof_mismatches(expected, changed), group
        print('PASS V2: changed display settings and ACL order compare equal; all 13 real mutations refused.')
    finally:
        anchor.stop_local(db)
