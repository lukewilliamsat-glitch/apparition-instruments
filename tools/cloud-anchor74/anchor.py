"""Cloud ANCHOR. Never echo native PostgreSQL error text or plaintext data."""
import datetime as dt
import hashlib
import io
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile

HOME = pathlib.Path('/anchor')
# The pinned container runs Python in isolated mode; use only its read-only source mount.
sys.path.insert(0, str(HOME))
import constraint74m
import constraint74o
SCRATCH = pathlib.Path('/work')
EXCHANGE = pathlib.Path('/exchange')
SCOPES = ('public', 'forge_private', 'auth', 'storage', 'supabase_migrations')
MEMBERS = ('roles.sql', 'scope.dump', 'proof.json', 'manifest.json')
PROJECT = 'acdxpxvksvdwfajntzfx'
LIMIT = 256 * 1024**2
RECIPIENT = re.compile(r'age1[0-9a-z]{58}')
SNAPSHOT = re.compile(r'[A-Fa-f0-9-]{8,80}')
PROOF_GROUPS = ('schemas', 'relations', 'columns', 'counts', 'constraints', 'indexes',
                'policies', 'triggers', 'functions', 'sequences', 'joins', 'role_memberships',
                'admin_acl', 'core_extensions')
COLUMN_KEYS = ('ns', 'rel', 'attname')
COLUMN_FIELDS = ('type', 'attnotnull', 'attidentity', 'attgenerated', 'acl', 'default_expr')
DIAGNOSTIC_FIELDS = {
    'relations': (('ns', 'rel'), ('relkind', 'relrowsecurity', 'relforcerowsecurity', 'owner', 'acl', 'view_definition')),
    'columns': (COLUMN_KEYS, COLUMN_FIELDS),
    'constraints': (('ns', 'rel', 'conname'), ('rule', 'convalidated')),
    'indexes': (('ns', 'rel', 'name'), ('definition', 'indisvalid')),
    'policies': (('schemaname', 'tablename', 'policyname'), ('permissive', 'roles', 'cmd', 'qual', 'with_check')),
    'functions': (('nspname', 'proname', 'signature'), ('owner', 'acl', 'definition')),
}
ACL_GROUPS = ('relations', 'columns', 'functions')
FINAL_REL_KEYS = ('ns', 'rel')
FINAL_REL_FIELDS = ('relkind', 'relpersistence', 'relrowsecurity', 'relforcerowsecurity',
                    'owner', 'acl', 'view_definition')
FINAL_CON_KEYS = ('ns', 'rel', 'conname')
FINAL_CON_FIELDS = ('rule', 'convalidated')
FINAL_RESTORE_PROFILE = 'v2-final-two-1'
SEMANTIC_RESTORE_PROFILE = 'v2-constraint-native-1'
EXORCISM_RESTORE_PROFILE = 'v2-constraint-native-2'
V2_PATH = 'pg_catalog'
REQUIRED_EXTENSIONS = {'pgcrypto', 'uuid-ossp'}


def extension_scope(proof, version):
    names = set(proof['core_extensions'])
    return REQUIRED_EXTENSIONS <= names <= (REQUIRED_EXTENSIONS | ({'citext'} if version == 2 else set()))


def v2_read(body):
    return 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\n' + body + '\nCOMMIT;'


class Refusal(Exception):
    pass


def require(test, label):
    if not test:
        raise Refusal(label)


def sha(file):
    with file.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')


def git_run():
    result = os.environ.get('ANCHOR_RUN', '')
    require(re.fullmatch(r'[1-9][0-9]{4,20}', result), 'invalid run identity')
    return result


def run(args, *, step, env=None, input_bytes=None, output=None):
    with open(os.devnull, 'wb') as discarded:
        proc = subprocess.run(args, input=input_bytes, env=env, stdout=subprocess.PIPE if output is None else output,
                              stderr=discarded, check=False, timeout=220)
    require(proc.returncode == 0, step)
    return proc.stdout


def db_env(**tweaks):
    base = {k: v for k, v in os.environ.items() if not k.startswith(('PG', 'ANCHOR_', 'AWS_', 'GH_', 'GITHUB_', 'SUPABASE_'))}
    return {**base, 'PGCONNECT_TIMEOUT': '10', **tweaks}


def psql(sql, env, step):
    return run(['psql', '-XqAt', '--no-password', '--set=ON_ERROR_STOP=1'], env=env, input_bytes=sql.encode(), step=step).strip()


def snapshot_sql(token, body):
    require(SNAPSHOT.fullmatch(token), 'invalid snapshot identity')
    return "begin isolation level repeatable read read only; set transaction snapshot '" + token + "';\n" + body + "\ncommit;"


def start_local(work, user):
    offline()
    socket = work / 'socket'
    socket.mkdir()
    db = work / 'pg'
    env = db_env(PGHOST=str(socket), PGPORT='5432', PGUSER=user, PGDATABASE='postgres', PGSSLMODE='disable')
    env['LC_ALL'] = 'C.UTF-8'
    run(['initdb', '-D', str(db), '-U', user, '--no-instructions', '--auth-local=trust', '--auth-host=reject', '--encoding=UTF8', '--locale=C.UTF-8'], env=env, step='isolated initdb failed')
    options = "-c listen_addresses='' -c shared_preload_libraries='' -c session_preload_libraries='' -c local_preload_libraries='' -c max_connections=8 -c log_min_messages=panic -c unix_socket_permissions=0700 -k " + str(socket)
    run(['pg_ctl', '-D', str(db), '-o', options, '-l', str(work / 'pg.log'), '-w', 'start'], env=env, step='isolated postgres start failed')
    return db, env


def stop_local(db):
    run(['pg_ctl', '-D', str(db), '-m', 'immediate', '-w', 'stop'], step='isolated postgres stop failed')


def offline():
    require(set(os.listdir('/sys/class/net')) == {'lo'}, 'restore refused: container has a non-loopback interface')


def prime_production(work, config):
    require(set(config) == {'host', 'user', 'password', 'ca'}, 'production config is incomplete')
    require(re.fullmatch(r'aws-[0-9]+-eu-west-1\.pooler\.supabase\.com', config['host']), 'expected exact eu-west-1 Supabase session pooler family')
    require(re.fullmatch(r'[a-z][a-z0-9_]{0,47}\.' + PROJECT, config['user']), 'database role does not identify the production project')
    require(8 <= len(config['password']) <= 1024, 'database credential missing')
    require(config['ca'].startswith('-----BEGIN CERTIFICATE-----') and len(config['ca']) < 32000, 'provider CA missing or malformed')
    ca = work / 'root.crt'
    ca.write_text(config['ca'] + '\n')
    return db_env(PGHOST=config['host'], PGUSER=config['user'], PGPASSWORD=config['password'], PGDATABASE='postgres', PGPORT='5432',
                  PGSSLMODE='verify-full', PGGSSENCMODE='disable', PGSSLROOTCERT=str(ca),
                  PGOPTIONS='-c search_path=pg_catalog -c default_transaction_read_only=on -c lock_timeout=15000 -c statement_timeout=180000')


def production_preflight(env, token):
    body = """select jsonb_build_object(
      'readOnly',current_setting('transaction_read_only'),
      'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
      'objects',(select count(*) from storage.objects),
      'vectorBuckets',(select count(*) from storage.buckets_vectors),
      'vectorIndexes',(select count(*) from storage.vector_indexes),
      'externalTables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where c.relkind='f' and n.nspname in ('public','forge_private','auth','storage','supabase_migrations')));"""
    found = json.loads(psql(snapshot_sql(token, body), env, 'source project preflight failed'))
    require(found == dict(readOnly='on', ssl=True, objects=0, vectorBuckets=0, vectorIndexes=0, externalTables=0), 'backup scope changed or read-only TLS could not be verified')


def capture(work, env, recipients, mode, version=2):
    require(version == 2 or (version == 1 and mode == 'synthetic'), 'legacy capture is fixture-only')
    proof_file = HOME / ('proof-v2.sql' if version == 2 else 'proof.sql')
    proof_sql = proof_file.read_text()
    begin = now()
    server = psql("select current_setting('server_version')", env, 'source version query failed').decode()
    require(re.fullmatch(r'17\.6(?: [a-zA-Z0-9 .()+_-]{1,75})?', server), 'source is not the reviewed PostgreSQL 17.6')
    with subprocess.Popen(['psql', '-XqAt', '--no-password', '--set=ON_ERROR_STOP=1'], env=env,
                          stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True) as keeper:
        try:
            require(keeper.stdin is not None and keeper.stdout is not None, 'could not create snapshot session')
            keeper.stdin.write("begin isolation level repeatable read read only;\nselect pg_export_snapshot();\n")
            keeper.stdin.flush()
            token = keeper.stdout.readline().strip()
            require(SNAPSHOT.fullmatch(token), 'could not acquire a consistent source snapshot')
            if mode == 'production':
                production_preflight(env, token)
            proof = json.loads(psql(snapshot_sql(token, proof_sql), env, 'source scope proof failed'))
            require(proof['schemas'] == sorted(SCOPES) and extension_scope(proof, version), 'required recovery schemas or extensions missing')
            for c in proof['relations']:
                require(c['relkind'] != 'f', 'foreign table requires a different recovery boundary')
            dump_args = ['pg_dump', '--no-password', '--format=custom', '--compress=gzip:3', '--snapshot=' + token,
                         '--exclude-table=storage.buckets_vectors', '--exclude-table=storage.vector_indexes',
                         '--exclude-extension=*', '--no-tablespaces', '--file=' + str(work/'scope.dump')]
            run(dump_args + ['--schema=' + scope for scope in SCOPES], env=env, step='scope export failed; no archive retained')
            if version == 2:
                # Sequences are not MVCC state. Refuse observed drift surrounding the dump.
                after = json.loads(psql(snapshot_sql(token, proof_sql), env, 'source proof recheck failed'))
                require(not proof_mismatches(proof, after), 'source proof drifted during dump; no archive retained')
            if mode == 'production':
                production_preflight(env, token)
            keeper.stdin.write("rollback;\n\\q\n")
            keeper.stdin.flush()
        finally:
            keeper.terminate()
    bootstrap = psql("select rolname from pg_roles where oid=10 and rolsuper", env, 'source bootstrap role not verified').decode()
    require(re.fullmatch(r'[a-z][a-z0-9_]{1,62}', bootstrap), 'unsupported bootstrap role')
    with (work/'roles.sql').open('wb') as f:
        run(['pg_dumpall', '--roles-only', '--no-role-passwords', '--no-password'], env=env, output=f, step='password-free role export failed')
    (work/'proof.json').write_text(json.dumps(proof, sort_keys=True, separators=(',', ':')))
    manifest = {
        'version': version, 'project': PROJECT if mode == 'production' else 'fixture-only', 'mode': mode, 'capture_run': git_run(),
        'started_utc': begin, 'finished_utc': now(), 'database': server, 'bootstrap_role': bootstrap, 'pg_dump': run(['pg_dump','--version'], step='PG tool unavailable').decode().strip(),
        'scopes': list(SCOPES), 'hashes': {name: sha(work/name) for name in MEMBERS[:-1]}
    }
    if version == 2:
        manifest.update(proof_search_path=V2_PATH, proof_sha256=sha(proof_file))
    (work/'manifest.json').write_text(json.dumps(manifest, sort_keys=True))
    require(sum((work/name).stat().st_size for name in MEMBERS) < LIMIT, 'backup beyond the reviewed 256 MiB bound')
    with tarfile.open(work/'seal.tar', 'w', format=tarfile.USTAR_FORMAT) as tf:
        for name in MEMBERS:
            tf.add(work/name, arcname=name, recursive=False)
    encrypted = work / 'backup.age'
    require(len(recipients) in (1, 2) and len(set(recipients)) == len(recipients) and all(RECIPIENT.fullmatch(r) for r in recipients), 'invalid or repeated age recipient')
    run(['age', '-o', str(encrypted)] + sum((['-r', v] for v in recipients), []) + [str(work/'seal.tar')], step='encryption failed')
    require(encrypted.stat().st_size <= LIMIT and encrypted.open('rb').read(22).startswith(b'age-encryption.org/v1'), 'encrypted package guard failed')
    shutil.copyfile(encrypted, EXCHANGE/'backup.age')
    safe = {k: manifest[k] for k in ('project','mode','capture_run','started_utc','finished_utc','database','pg_dump','scopes')}
    safe.update(sha256=sha(encrypted), bytes=encrypted.stat().st_size, encryption='age X25519 + ChaCha20-Poly1305')
    (EXCHANGE/'capture.json').write_text(json.dumps(safe, sort_keys=True))
    print('Capture sealed; only ciphertext and schema-scope metadata left private scratch.')


def extract(work, sealed):
    with tarfile.open(sealed, 'r:') as tf:
        files = tf.getmembers()
        require(len(files) == len(MEMBERS) and {f.name for f in files} == set(MEMBERS) and all(f.isfile() for f in files)
                and sum(f.size for f in files) < LIMIT, 'unexpected archive member or size')
        for f in files:
            with tf.extractfile(f) as source, (work/f.name).open('xb') as dest:
                shutil.copyfileobj(source, dest)
    manifest = json.loads((work/'manifest.json').read_text())
    require(type(manifest['version']) is int and manifest['version'] in (1, 2)
            and set(manifest['hashes']) == set(MEMBERS[:-1]), 'invalid backup manifest')
    require(all(sha(work/name)==expected for name,expected in manifest['hashes'].items()), 'member digest mismatch')
    return manifest


def proof_mismatches(expected, actual):
    require(all(isinstance(p, dict) and set(p) == set(PROOF_GROUPS) for p in (expected, actual)),
            'unexpected recovery proof groups')
    return [group for group in PROOF_GROUPS if actual[group] != expected[group]]


def metadata_index(rows, keys, fields):
    if rows is None:  # jsonb_agg returns NULL for an empty group.
        return {}
    require(isinstance(rows, list), 'invalid metadata proof')
    out = {}
    for row in rows:
        require(isinstance(row, dict) and set(row) == set(keys + fields)
                and all(isinstance(row[k], str) for k in keys), 'invalid metadata proof')
        key = tuple(row[k] for k in keys)
        require(key not in out, 'duplicate metadata proof identity')
        out[key] = row
    return out


def field_difference(expected, actual, keys, fields):
    before, after = (metadata_index(rows, keys, fields) for rows in (expected, actual))
    shared = before.keys() & after.keys()
    counts = {'missing': len(before.keys() - after.keys()), 'added': len(after.keys() - before.keys())}
    for field in fields:
        counts[field] = sum(before[key][field] != after[key][field] for key in shared)
    if not any(counts.values()):
        return 'ordering or representation differs'
    return ', '.join(f'{field}={min(n, 9999)}' + ('+' if n > 9999 else '')
                     for field, n in counts.items() if n)


def column_difference(expected, actual):
    return field_difference(expected, actual, COLUMN_KEYS, COLUMN_FIELDS)


def compare_acl_order(expected, actual, env, groups):
    acl_groups = tuple(group for group in ACL_GROUPS if group in groups)
    values = set()
    for proof in (expected, actual):
        for group in acl_groups:
            for row in proof[group] or []:
                value = row['acl']
                require(value is None or isinstance(value, str), 'invalid ACL evidence')
                if value is not None:
                    values.add(value)
    if not values:
        return expected, actual
    ordered = sorted(values)
    # Parse with PostgreSQL, not textual ACL splitting. Encode data before
    # interpolation; only lowercase hex can enter the SQL string literal.
    payload = json.dumps(ordered, ensure_ascii=True).encode().hex()
    sql = f"""BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog;
WITH inputs AS (
  SELECT value, ord FROM jsonb_array_elements_text(
    convert_from(decode('{payload}', 'hex'), 'UTF8')::jsonb) WITH ORDINALITY AS i(value, ord)
), expanded AS (
  SELECT i.ord, COALESCE((
    SELECT jsonb_agg(jsonb_build_array(g.rolname, e.grantee = 0, r.rolname, e.privilege_type, e.is_grantable))
    FROM aclexplode(i.value::aclitem[]) e
    LEFT JOIN pg_roles g ON g.oid = e.grantor
    LEFT JOIN pg_roles r ON r.oid = e.grantee
  ), '[]'::jsonb) AS grants
  FROM inputs i
)
SELECT jsonb_agg(grants ORDER BY ord) FROM expanded;
COMMIT;"""
    parsed = json.loads(psql(sql, env, 'offline ACL interpretation failed'))
    require(isinstance(parsed, list) and len(parsed) == len(ordered), 'incomplete ACL evidence')
    normal = {}
    for value, grants in zip(ordered, parsed):
        require(isinstance(grants, list) and all(
            isinstance(g, list) and len(g) == 5 and isinstance(g[0], str) and type(g[1]) is bool
            and (g[2] is None if g[1] else isinstance(g[2], str))
            and isinstance(g[3], str) and type(g[4]) is bool for g in grants), 'unresolved ACL identity')
        # Preserve grant multiplicity, grantor, grantee, PUBLIC and grant option.
        normal[value] = sorted(tuple(g) for g in grants)

    def project(proof):
        return proof | {
            group: [row | {'acl': None if row['acl'] is None else normal[row['acl']]}
                    for row in proof[group]] if proof[group] is not None else None
            for group in acl_groups
        }
    return project(expected), project(actual)


def verify_proof(expected, actual, env, proof_sql):
    raw_failures = proof_mismatches(expected, actual)
    before, after = compare_acl_order(expected, actual, env, raw_failures)
    failures = proof_mismatches(before, after)
    acl_matches = [group for group in raw_failures if group not in failures]
    if not failures:
        return acl_matches
    detail = ''.join('; ' + group + ' (' + field_difference(
        before[group], after[group], *DIAGNOSTIC_FIELDS[group]) + ')'
        for group in failures if group in DIAGNOSTIC_FIELDS)
    if acl_matches:
        detail += '; equivalent ACL ordering: ' + ', '.join(acl_matches)
    # V1 did not seal its effective search_path. This is only diagnostic:
    # two objects can have the same unqualified spelling under different paths.
    try:
        with_path = json.loads(psql('SET search_path TO pg_catalog, public, extensions;\n' + proof_sql,
                                    env, 'isolated comparison probe failed'))
        alt_before, alt_after = compare_acl_order(expected, with_path, env, failures)
        matched = [group for group in failures if group not in proof_mismatches(alt_before, alt_after)]
        if matched:
            detail += '; alternate search-path match (diagnostic only): ' + ', '.join(matched)
    except (Refusal, ValueError):
        pass
    raise Refusal('restore comparisons failed: ' + ', '.join(failures) + detail)


def relation_default_grants(env, pairs):
    # A SQL NULL relacl is the hard-wired ACL, not ALTER DEFAULT PRIVILEGES
    # or an empty ACL. PostgreSQL itself computes this for each owner/kind.
    ordered = sorted(pairs)
    payload = json.dumps(ordered, ensure_ascii=True).encode().hex()
    sql = f"""SET LOCAL search_path TO pg_catalog;
WITH pairs AS (
  SELECT value->>0 AS owner, value->>1 AS kind, ord
  FROM jsonb_array_elements(convert_from(decode('{payload}', 'hex'), 'UTF8')::jsonb)
       WITH ORDINALITY AS p(value, ord)
)
SELECT jsonb_agg((SELECT jsonb_agg(
    jsonb_build_array(grantor, is_public, grantee, privilege_type, is_grantable)
    ORDER BY grantor COLLATE "C", is_public, grantee COLLATE "C", privilege_type COLLATE "C", is_grantable)
  FROM (SELECT pg_get_userbyid(e.grantor) AS grantor, e.grantee = 0 AS is_public,
          CASE WHEN e.grantee <> 0 THEN pg_get_userbyid(e.grantee) END AS grantee,
          e.privilege_type, e.is_grantable
        FROM aclexplode(acldefault(p.kind::"char", r.oid)) e) grants
  ) ORDER BY p.ord)
FROM pairs p JOIN pg_roles r ON r.rolname = p.owner;"""
    rows = json.loads(psql(v2_read(sql), env, 'native default ACL lookup failed'))
    require(isinstance(rows, list) and len(rows) == len(ordered) and all(rows),
            'native default ACL owner or privileges unresolved')
    return dict(zip(ordered, rows))


def final_relation_default_equivalence(expected, actual, env):
    before, after = (metadata_index(v, FINAL_REL_KEYS, FINAL_REL_FIELDS) for v in (expected, actual))
    def default_pair(row):
        return row['owner'], 's' if row['relkind'] == 'S' else 'r'
    pairs = {}
    for key in before.keys() & after.keys():
        a, b = before[key], after[key]
        if (a['owner'] == b['owner'] and a['relkind'] == b['relkind']
                and a['relkind'] in ('r', 'p', 'v', 'm', 'S', 'f')
                and (a['acl'] is None) != (b['acl'] is None)):
            pairs[key] = default_pair(a)
    if not pairs:
        return expected, actual, 0
    defaults = relation_default_grants(env, set(pairs.values()))
    equivalent = set()
    for key, pair in pairs.items():
        a, b = before[key], after[key]
        explicit = a['acl'] if b['acl'] is None else b['acl']
        if explicit == defaults[pair]:
            equivalent.add(key)

    def canonical(rows):
        return [r | {'acl': defaults[pairs[(r['ns'], r['rel'])]]}
                if (r['ns'], r['rel']) in equivalent else r for r in rows]
    return canonical(expected), canonical(actual), len(equivalent)


def final_restore_context(env, dump, before, after, failures):
    # Never expose TOC names or SQL. Source proof does not include the graph.
    toc = run(['pg_restore', '--list', str(dump)], step='bounded TOC inspection failed')
    attach_entries = len(re.findall(rb'^\d+;\s+\d+\s+\d+\s+TABLE ATTACH\s', toc, re.M))
    sql = """SET LOCAL search_path TO pg_catalog;
SELECT coalesce(jsonb_agg(jsonb_build_array(n.nspname,r.relname,c.conname,
    r.relispartition,c.conparentid<>0,NOT c.conislocal,c.coninhcount>0,
    coalesce(f.relkind='p',false))), '[]'::jsonb)
FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
JOIN pg_namespace n ON n.oid=r.relnamespace LEFT JOIN pg_class f ON f.oid=c.confrelid
WHERE n.nspname IN ('public','forge_private','auth','storage','supabase_migrations');"""
    rows = json.loads(psql(v2_read(sql), env, 'bounded constraint context query failed'))
    hints = f'toc_table_attach={bound_count(attach_entries)}'
    if 'constraints' not in failures:
        return hints
    a, b = (metadata_index(p['constraints'], FINAL_CON_KEYS, FINAL_CON_FIELDS) for p in (before, after))
    changes = {key for key in b if a.get(key) != b[key]}
    flags = ('target_partition', 'target_parent_constraint', 'target_not_local',
             'target_inherited', 'target_references_partitioned')
    counts = dict.fromkeys(flags, 0)
    for ns, rel, con, *values in rows:
        if (ns, rel, con) in changes:
            for flag, value in zip(flags, values):
                counts[flag] += int(value is True)
    return hints + ', ' + ', '.join(f'{name}={bound_count(n)}' for name, n in counts.items())


def bound_count(n):
    return str(min(9999, n)) + ('+' if n > 9999 else '')


def constraint_rule_equivalence(expected, actual, env, allow_replay, *, classified=False):
    before, after = (metadata_index(p, FINAL_CON_KEYS, FINAL_CON_FIELDS) for p in (expected, actual))
    proven, outcomes, hints, kinds = set(), {}, {}, {}
    attempts = 0

    def count(group, label):
        group[label] = group.get(label, 0) + 1

    for key in sorted(before.keys() | after.keys()):
        source, target = before.get(key), after.get(key)
        if source == target:
            continue
        if source is None or target is None:
            count(outcomes, 'extra_target' if source is None else 'missing_target')
            count(kinds, constraint74m.kind((source or target)['rule']))
            continue
        source_kind, target_kind = (constraint74m.kind(r['rule']) for r in (source, target))
        count(kinds, source_kind if source_kind == target_kind else 'different_kind')
        if source['convalidated'] != target['convalidated']:
            count(outcomes, 'validation_mismatch' if classified else 'validation_difference')
        if source['rule'] == target['rule']:
            continue
        for hint in constraint74m.difference_hints(source['rule'], target['rule']):
            count(hints, hint)
        outcome = 'unsupported'
        if source_kind == target_kind == 'check' and source['convalidated'] == target['convalidated']:
            if not allow_replay:
                outcome = 'other_group_unresolved'
            elif attempts == constraint74m.PROBE_LIMIT:
                outcome = 'probe_budget'
            else:
                attempts += 1
                try:
                    outcome = (constraint74o.native_check(key, source, target, env) if classified else
                               constraint74m.native_check(key, source, target, env, psql, offline))
                except (Refusal, ValueError, TypeError, subprocess.TimeoutExpired):
                    outcome = 'result_shape' if classified else 'unresolved'
        count(outcomes, outcome)
        if outcome == 'native_equivalent':
            proven.add(key)
    details = '; '.join(label + ' (' + ', '.join(
        f'{name}={bound_count(n)}' for name, n in sorted(values.items())) + ')'
        for label, values in [('constraint kinds', kinds), ('rule hints only', hints),
                              ('constraint outcomes', outcomes)] if values)
    normalized = [r | {'rule': before[tuple(r[k] for k in FINAL_CON_KEYS)]['rule']}
                  if tuple(r[k] for k in FINAL_CON_KEYS) in proven else r for r in actual]
    return normalized, len(proven), details


def verify_v2_final(expected, actual, env, dump, *, semantic=False, classified=False):
    failures = proof_mismatches(expected, actual)
    equivalents = 0
    if 'relations' in failures:
        a, b, equivalents = final_relation_default_equivalence(expected['relations'], actual['relations'], env)
        expected, actual = expected | {'relations': a}, actual | {'relations': b}
        failures = proof_mismatches(expected, actual)
    native_equivalents, diagnostic = 0, ''
    if semantic and 'constraints' in failures:
        normalized, native_equivalents, diagnostic = constraint_rule_equivalence(
            expected['constraints'], actual['constraints'], env, failures == ['constraints'], classified=classified)
        actual = actual | {'constraints': normalized}
        failures = proof_mismatches(expected, actual)
    if not failures:
        return ((bound_count(equivalents), bound_count(native_equivalents))
                if semantic else bound_count(equivalents))
    labels = [diagnostic] if diagnostic else []
    if 'relations' in failures:
        labels.append('relations (' + field_difference(expected['relations'], actual['relations'],
                                                       FINAL_REL_KEYS, FINAL_REL_FIELDS) + ')')
    if 'constraints' in failures:
        labels.append('constraints (' + field_difference(expected['constraints'], actual['constraints'],
                                                         FINAL_CON_KEYS, FINAL_CON_FIELDS) + ')')
    if labels:
        try:
            labels.append('restore context only (' + final_restore_context(
                env, dump, expected, actual, failures) + ')')
        except (Refusal, ValueError):
            labels.append('restore context unavailable')
    labels.append('proven default ACL equivalences=' + bound_count(equivalents))
    raise Refusal('V2 recovery comparison failed: ' + ', '.join(failures) + '; ' + '; '.join(labels))


def restore(work, mode, key, expected, source_run, required_version=None, final=False, semantic=False, classified=False):
    offline()
    archive = EXCHANGE/'backup.age'
    require(re.fullmatch(r'[a-f0-9]{64}', expected) and 0 < archive.stat().st_size <= LIMIT and sha(archive)==expected, 'retained archive integrity mismatch')
    require(key.startswith('AGE-SECRET-KEY-1') and len(key) < 160, 'invalid verification key')
    identity = work / 'verify-key'
    identity.write_text(key.strip()+'\n')
    run(['age', '-d', '-i', str(identity), '-o', str(work/'seal.tar'), str(archive)], step='archive decryption or authentication failed')
    identity.unlink()
    require((work/'seal.tar').stat().st_size<=LIMIT, 'decrypted archive beyond safety bound')
    manifest = extract(work, work/'seal.tar')
    require(manifest['mode']==mode and manifest['capture_run']==source_run and manifest['project']==(PROJECT if mode=='production' else 'fixture-only'), 'archive belongs to a different capture or environment')
    version = manifest['version']
    require(required_version is None or version == required_version, 'unexpected archive proof version')
    require(not (final or semantic) or version == 2, 'final-two restore requires V2 proof')
    proof_file = HOME / ('proof-v2.sql' if version == 2 else 'proof.sql')
    if version == 2:
        require(manifest.get('proof_search_path') == V2_PATH and manifest.get('proof_sha256') == sha(proof_file)
                and manifest.get('scopes') == list(SCOPES), 'invalid V2 proof profile')
    expected_proof = json.loads((work/'proof.json').read_text())
    require(isinstance(expected_proof, dict) and set(expected_proof) == set(PROOF_GROUPS),
            'unexpected recovery proof groups')
    require(extension_scope(expected_proof, version), 'restore extension scope not approved')
    roles = (work/'roles.sql').read_text()
    require(not re.search(r"(?im)^\s*(alter|create)\s+role\b[^\n]*\bpassword\s+(?:E)?'", roles), 'role archive contains a password value')
    # PostgreSQL 17 grants explicitly reference grantors. Initialise with the source bootstrap
    # name so GRANTED BY still refers to the cluster's privileged bootstrap identity (OID 10).
    bootstrap = manifest['bootstrap_role']
    require(re.fullmatch(r'[a-z][a-z0-9_]{1,62}', bootstrap), 'unsupported bootstrap role')
    roles, dedup = re.subn(r'(?m)^CREATE ROLE (?:"'+bootstrap+r'"|'+bootstrap+r');$', '', roles)
    require(dedup == 1, 'role export did not contain exactly one bootstrap CREATE ROLE')
    db, env = start_local(work, bootstrap)
    try:
        psql(roles, env, 'isolated password-free role import failed')
        for name, cfg in expected_proof['core_extensions'].items():
            ns, extension_version = cfg['schema'], cfg['version']
            require(re.fullmatch(r'[a-z_][a-z0-9_]{0,32}', ns) and re.fullmatch(r'[0-9.]{1,16}', extension_version) and ns not in SCOPES, 'unsupported extension namespace or version')
            psql(f'create schema if not exists "{ns}"; create extension "{name}" with schema "{ns}" version \'{extension_version}\';', env, 'required extension unavailable')
        ddl = run(['pg_restore','--schema-only','--file=-',str(work/'scope.dump')], step='isolated archive schema inspection failed')
        if re.search(rb'(?m)^CREATE SCHEMA public;', ddl):
            psql('drop schema public;', env, 'isolated public schema preparation failed')
        run(['pg_restore','--no-password','--exit-on-error','--single-transaction','--dbname=postgres',str(work/'scope.dump')], env=env, step='isolated scope restore failed')
        proof_sql = proof_file.read_text()
        if version == 2:
            actual = json.loads(psql(v2_read(proof_sql), env, 'restored V2 scope proof failed'))
            if semantic:
                relation_defaults, constraint_equivs = verify_v2_final(
                    expected_proof, actual, env, work/'scope.dump', semantic=True, **({'classified':True} if classified else {}))
            elif final:
                relation_defaults = verify_v2_final(expected_proof, actual, env, work/'scope.dump')
            else:
                mismatches = proof_mismatches(expected_proof, actual)
                require(not mismatches, 'V2 recovery comparison failed: ' + ', '.join(mismatches))
            acl_matches = []
        else:
            actual = json.loads(psql(proof_sql, env, 'restored V1 scope proof failed'))
            acl_matches = verify_proof(expected_proof, actual, env, proof_sql)
        if mode == 'synthetic':
            require(psql("select count(*) from auth.users where email='anchor-fictional-row-canary@example.invalid'",env,'fixture row check failed') == b'1', 'fixture row was not recovered')
        out = {'status':'passed', 'mode': mode, 'project': manifest['project'], 'capture_run': source_run, 'restore_run': git_run(),
               'restored_utc': now(), 'archive_sha256': expected, 'restore_server': psql("select current_setting('server_version')",env,'restore server not verified').decode(),
               'checks': sorted(expected_proof), 'acl_order_equivalent': acl_matches,
               'network': 'loopback only, no provider credentials'}
        out.update(proof_version=version)
        if version == 2:
            out.update(proof_search_path=V2_PATH, proof_sha256=manifest['proof_sha256'])
        if semantic:
            out.update(restore_profile=EXORCISM_RESTORE_PROFILE if classified else SEMANTIC_RESTORE_PROFILE, equivalent_relation_default_acls=relation_defaults,
                       equivalent_native_check_rules=constraint_equivs)
        elif final:
            out.update(restore_profile=FINAL_RESTORE_PROFILE, equivalent_relation_default_acls=relation_defaults)
        (EXCHANGE/'restore.json').write_text(json.dumps(out, sort_keys=True))
        print('Retained ciphertext restored and all aggregate checks passed.')
    finally:
        stop_local(db)


def main():
    os.umask(0o077)
    mode = sys.argv[1]
    with tempfile.TemporaryDirectory(prefix='anchor-', dir=SCRATCH) as tmp:
        work = pathlib.Path(tmp)
        if mode in ('fixture-capture', 'fixture-capture-v2-final', 'fixture-capture-v2-semantic', 'fixture-capture-v2-classified'):
            offline()
            db, env = start_local(work, 'anchor_fixture_source')
            try:
                psql((HOME/'fixture.sql').read_text(), env, 'synthetic setup failed')
                psql((HOME/'fixture-v2.sql').read_text(), env, 'synthetic V2 metadata setup failed')
                if mode.endswith(('-final', '-semantic', '-classified')):
                    psql((HOME/'fixture-final-two.sql').read_text(), env, 'synthetic final-two fixture setup failed')
                if mode.endswith(('-semantic', '-classified')):
                    psql((HOME/'fixture-constraint74m.sql').read_text(), env, 'synthetic semantic fixture setup failed')
                if mode.endswith('-classified'):
                    psql((HOME/'fixture-constraint74o.sql').read_text(), env, 'synthetic classified fixture setup failed')
                capture(work, env, [os.environ['ANCHOR_PUBLIC_FIXTURE']], 'synthetic')
            finally:
                stop_local(db)
        elif mode == 'production-capture':
            conf = json.loads(sys.stdin.buffer.read(50000))
            recipients = conf.pop('recipients')
            require(len(recipients) == 2, 'owner and verifier recipients required')
            capture(work, prime_production(work, conf), recipients, 'production')
        elif mode in ('fixture-restore', 'production-restore', 'production-restore-v2',
                      'fixture-restore-v2-final', 'production-restore-v2-final',
                      'fixture-restore-v2-semantic', 'production-restore-v2-semantic',
                      'fixture-restore-v2-classified', 'production-restore-v2-classified'):
            restore(work, 'synthetic' if mode.startswith('fixture-') else 'production',
                    sys.stdin.read(160), sys.argv[2], sys.argv[3],
                    2 if '-v2' in mode else None, final=mode.endswith('-final'), semantic=mode.endswith(('-semantic', '-classified')), classified=mode.endswith('-classified'))
        else:
            raise Refusal('unknown operation')


if __name__ == '__main__':
    try:
        main()
    except Refusal as err:
        print('CLOUD ANCHOR refused: ' + str(err), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('CLOUD ANCHOR refused: protected processing failed; no detailed logs emitted.', file=sys.stderr)
        sys.exit(1)
