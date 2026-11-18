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
                  PGSSLMODE='verify-full', PGSSLROOTCERT=str(ca), PGOPTIONS='-c default_transaction_read_only=on -c lock_timeout=15000 -c statement_timeout=180000')


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


def capture(work, env, recipients, mode):
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
            proof = json.loads(psql(snapshot_sql(token, (HOME / 'proof.sql').read_text()), env, 'source scope proof failed'))
            require(proof['schemas'] == sorted(SCOPES) and set(proof['core_extensions']) == {'pgcrypto', 'uuid-ossp'}, 'required recovery schemas or extensions missing')
            for c in proof['relations']:
                require(c['relkind'] != 'f', 'foreign table requires a different recovery boundary')
            dump_args = ['pg_dump', '--no-password', '--format=custom', '--compress=gzip:3', '--snapshot=' + token,
                         '--exclude-table=storage.buckets_vectors', '--exclude-table=storage.vector_indexes',
                         '--exclude-extension=*', '--no-tablespaces', '--file=' + str(work/'scope.dump')]
            run(dump_args + ['--schema=' + scope for scope in SCOPES], env=env, step='scope export failed; no archive retained')
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
        'version': 1, 'project': PROJECT if mode == 'production' else 'fixture-only', 'mode': mode, 'capture_run': git_run(),
        'started_utc': begin, 'finished_utc': now(), 'database': server, 'bootstrap_role': bootstrap, 'pg_dump': run(['pg_dump','--version'], step='PG tool unavailable').decode().strip(),
        'scopes': list(SCOPES), 'hashes': {name: sha(work/name) for name in MEMBERS[:-1]}
    }
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
    require(manifest['version'] == 1 and set(manifest['hashes']) == set(MEMBERS[:-1]), 'invalid backup manifest')
    require(all(sha(work/name)==expected for name,expected in manifest['hashes'].items()), 'member digest mismatch')
    return manifest


def proof_mismatches(expected, actual):
    require(all(isinstance(p, dict) and set(p) == set(PROOF_GROUPS) for p in (expected, actual)),
            'unexpected recovery proof groups')
    return [group for group in PROOF_GROUPS if actual[group] != expected[group]]


def field_difference(expected, actual, keys, fields):
    def index(rows):
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

    before, after = index(expected), index(actual)
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


def restore(work, mode, key, expected, source_run):
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
    expected_proof = json.loads((work/'proof.json').read_text())
    require(isinstance(expected_proof, dict) and set(expected_proof) == set(PROOF_GROUPS),
            'unexpected recovery proof groups')
    require(set(expected_proof['core_extensions']) == {'pgcrypto', 'uuid-ossp'}, 'restore extension scope not approved')
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
            ns, version = cfg['schema'], cfg['version']
            require(re.fullmatch(r'[a-z_][a-z0-9_]{0,32}', ns) and re.fullmatch(r'[0-9.]{1,16}', version) and ns not in SCOPES, 'unsupported extension namespace or version')
            psql(f'create schema if not exists "{ns}"; create extension "{name}" with schema "{ns}" version \'{version}\';', env, 'required extension unavailable')
        ddl = run(['pg_restore','--schema-only','--file=-',str(work/'scope.dump')], step='isolated archive schema inspection failed')
        if re.search(rb'(?m)^CREATE SCHEMA public;', ddl):
            psql('drop schema public;', env, 'isolated public schema preparation failed')
        run(['pg_restore','--no-password','--exit-on-error','--single-transaction','--dbname=postgres',str(work/'scope.dump')], env=env, step='isolated scope restore failed')
        proof_sql = (HOME/'proof.sql').read_text()
        actual = json.loads(psql(proof_sql, env, 'restored scope proof failed'))
        acl_matches = verify_proof(expected_proof, actual, env, proof_sql)
        if mode == 'synthetic':
            require(psql("select count(*) from auth.users where email='anchor-fictional-row-canary@example.invalid'",env,'fixture row check failed') == b'1', 'fixture row was not recovered')
        out = {'status':'passed', 'mode': mode, 'project': manifest['project'], 'capture_run': source_run, 'restore_run': git_run(),
               'restored_utc': now(), 'archive_sha256': expected, 'restore_server': psql("select current_setting('server_version')",env,'restore server not verified').decode(),
               'checks': sorted(expected_proof), 'acl_order_equivalent': acl_matches,
               'network': 'loopback only, no provider credentials'}
        (EXCHANGE/'restore.json').write_text(json.dumps(out, sort_keys=True))
        print('Retained ciphertext restored and all aggregate checks passed.')
    finally:
        stop_local(db)


def main():
    os.umask(0o077)
    mode = sys.argv[1]
    with tempfile.TemporaryDirectory(prefix='anchor-', dir=SCRATCH) as tmp:
        work = pathlib.Path(tmp)
        if mode == 'fixture-capture':
            offline()
            db, env = start_local(work, 'anchor_fixture_source')
            try:
                psql((HOME/'fixture.sql').read_text(), env, 'synthetic setup failed')
                capture(work, env, [os.environ['ANCHOR_PUBLIC_FIXTURE']], 'synthetic')
            finally:
                stop_local(db)
        elif mode == 'production-capture':
            conf = json.loads(sys.stdin.buffer.read(50000))
            recipients = conf.pop('recipients')
            require(len(recipients) == 2, 'owner and verifier recipients required')
            capture(work, prime_production(work, conf), recipients, 'production')
        elif mode in ('fixture-restore', 'production-restore'):
            restore(work, 'synthetic' if mode.startswith('fixture-') else 'production', sys.stdin.read(160), sys.argv[2], sys.argv[3])
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
