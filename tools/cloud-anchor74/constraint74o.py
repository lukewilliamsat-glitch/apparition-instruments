"""Single-statement PostgreSQL CHECK replay. Never emit SQL or database messages."""
import ctypes as C
import json
import os
from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from constraint74m import PROBE_NAME, RULE_LIMIT, canonical_node

FIXED = frozenset("""
source_unsupported_syntax target_unsupported_syntax source_quoting_restriction
target_quoting_restriction expression_size_limit expression_depth_limit unsafe_input
eligibility_restriction boundary_restriction engine_version result_shape
sql_syntax sql_resolution sql_type sql_privilege sql_unsupported sql_data
sql_statement_timeout sql_lock_timeout sql_resource sql_refusal probe_process_timeout probe_process_refused
native_decode native_unsupported_node native_structure_mismatch dependency_mismatch
constrained_column_mismatch inheritance_mismatch validation_mismatch native_equivalent
""".split())
SQLSTATE = {
    b'57014': 'sql_statement_timeout', b'55P03': 'sql_lock_timeout',
    b'42601': 'sql_syntax', b'42P01': 'sql_resolution', b'42703': 'sql_resolution',
    b'42704': 'sql_resolution', b'42883': 'sql_resolution', b'42P18': 'sql_resolution',
    b'42804': 'sql_type', b'42846': 'sql_type', b'42501': 'sql_privilege',
}
NODE_TAGS = frozenset("""
VAR CONST OPEXPR DISTINCTEXPR NULLIFEXPR SCALARARRAYOPEXPR BOOLEXPR FUNCEXPR
RELABELTYPE COERCEVIAIO ARRAYCOERCEEXPR CONVERTROWTYPEEXPR COERCETODOMAIN
COERCETODOMAINVALUE CASEEXPR CASEWHEN CASETESTEXPR ARRAYEXPR ROWEXPR
ROWCOMPAREEXPR COALESCEEXPR MINMAXEXPR COLLATEEXPR FIELDSELECT SUBSCRIPTINGREF
NULLTEST BOOLEANTEST SQLVALUEFUNCTION NAMEDARGEXPR PARAM XMLEXPR
""".split())
DOLLAR = re.compile(r'\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$')
SETTINGS = (
    "search_path TO pg_catalog", "standard_conforming_strings TO on",
    "DateStyle TO 'ISO, YMD'", "TimeZone TO 'UTC'", "IntervalStyle TO postgres",
    "extra_float_digits TO 3", "quote_all_identifiers TO off",
    "statement_timeout TO '4s'", "lock_timeout TO '1s'",
)

class Refused(Exception):
    pass


def clause(rule, side):
    """Fence one CHECK expression; the native parser, not this fence, interprets it."""
    if not isinstance(rule, str):
        raise Refused(side+'_unsupported_syntax')
    if len(rule.encode()) > RULE_LIMIT:
        raise Refused('expression_size_limit')
    if '\0' in rule:
        raise Refused('unsafe_input')
    start = re.match(r'^CHECK[ \t\r\n]*\(', rule, re.ASCII)
    if not start:
        raise Refused(side+'_unsupported_syntax')
    i = start.end()
    stack = ['(']
    while i < len(rule):
        ch = rule[i]
        if ch in "'\"":
            if rule[max(0,i-2):i].upper() == 'U&':
                raise Refused(side+'_quoting_restriction')
            escape = ch == "'" and i > 0 and rule[i-1] in 'eE' and (
                i == 1 or (rule[i-2].isascii() and not (rule[i-2].isalnum() or rule[i-2] in '_$')))
            i += 1
            while i < len(rule):
                if rule[i] == '\\' and escape:
                    i += 2
                elif rule[i] == ch and rule[i+1:i+2] == ch:
                    i += 2
                elif rule[i] == ch:
                    i += 1
                    # A continued E string inherits its lexical mode from its
                    # first part. Refuse implicit continuation rather than guess.
                    if ch == "'" and re.match(r'[ \t\r\n]*[\r\n][ \t\r\n]*\x27', rule[i:]):
                        raise Refused(side+'_quoting_restriction')
                    break
                else:
                    i += 1
            else:
                raise Refused(side+'_quoting_restriction')
            continue
        if ch == '$':
            m = DOLLAR.match(rule,i)
            # ASCII dollar tags only, and never as part of an identifier.
            if not m or (i and (not rule[i-1].isascii() or rule[i-1].isalnum() or rule[i-1] in '_$')):
                raise Refused(side+'_quoting_restriction')
            end = rule.find(m[0],m.end())
            if end < 0:
                raise Refused(side+'_quoting_restriction')
            i = end + len(m[0])
            continue
        if ch in ';\\' or rule[i:i+2] in ('--','/*','*/'):
            raise Refused('unsafe_input')
        if ch in '([':
            stack.append(ch)
            if len(stack) > 128:
                raise Refused('expression_depth_limit')
        if ch in ')]':
            if not stack or stack.pop() != ( '(' if ch == ')' else '[' ):
                raise Refused(side+'_unsupported_syntax')
            if not stack:
                tail = re.fullmatch(r'(?:\s+(NO INHERIT))?(?:\s+(NOT VALID))?[ \t\r\n]*',rule[i+1:],re.ASCII)
                expr = rule[start.end():i]
                if not tail or not expr.strip():
                    raise Refused(side+'_unsupported_syntax')
                return expr, bool(tail[1]), bool(tail[2])
        i += 1
    raise Refused(side+'_unsupported_syntax')


def state(code):
    if code in SQLSTATE:
        return SQLSTATE[code]
    return {b'0A':'sql_unsupported', b'22':'sql_data', b'53':'sql_resource', b'54':'sql_resource'}.get(
        (code or b'')[:2], 'sql_refusal')


def expression(value):
    try:
        if not isinstance(value, str) or len(value.encode()) > 262144:
            raise ValueError
        node = canonical_node(value)
    except (ValueError, TypeError, UnicodeError):
        raise Refused('native_decode') from None
    if any(node[i+1] not in NODE_TAGS for i,t in enumerate(node[:-1]) if t == '{'):
        raise Refused('native_unsupported_node')
    return node


class Connection:
    """Use libpq extended protocol, no psql metacommands or multi-statement query."""
    def __init__(self, env):
        P, S, I = C.c_void_p, C.c_char_p, C.c_int
        self.pq = p = C.CDLL("libpq.so.5")
        signatures = {
            'PQconnectdbParams': (P, [C.POINTER(S),C.POINTER(S),I]),
            'PQstatus':(I,[P]), 'PQfinish':(None,[P]), 'PQclear':(None,[P]),
            'PQexecParams':(P,[P,S,I,P,C.POINTER(S),P,P,I]), 'PQresultStatus':(I,[P]),
            'PQresultErrorField':(S,[P,I]), 'PQntuples':(I,[P]), 'PQnfields':(I,[P]),
            'PQgetvalue':(S,[P,I,I]), 'PQgetisnull':(I,[P,I,I]),
        }
        for symbol,(ret,args) in signatures.items():
            fn = getattr(p,symbol); fn.restype=ret; fn.argtypes=args
        options = dict(host=env['PGHOST'], port='5432', dbname='postgres', user=env['PGUSER'],
                       sslmode='disable', connect_timeout='2', passfile='/dev/null',
                       client_encoding='UTF8')
        arr=C.c_char_p*(len(options)+1)
        self.conn=p.PQconnectdbParams(arr(*(x.encode() for x in options),None),
                                     arr(*(x.encode() for x in options.values()),None),0)
        if not self.conn or p.PQstatus(self.conn)!=0:
            self.close()
            raise Refused('boundary_restriction')
        notice=C.CFUNCTYPE(None,P,S)
        self.notice=notice(lambda *_: None)
        p.PQsetNoticeProcessor.argtypes=[P,notice,P]
        p.PQsetNoticeProcessor.restype=P
        p.PQsetNoticeProcessor(self.conn,self.notice,None)

    def close(self):
        if self.conn:
            self.pq.PQfinish(self.conn)
            self.conn=None

    def query(self, sql, *args):
        p=self.pq
        params=(C.c_char_p*len(args))(*(x.encode() for x in args))
        res=p.PQexecParams(self.conn,sql.encode(),len(args),None,params,None,None,0)
        if not res:
            raise Refused('sql_refusal')
        try:
            if p.PQresultStatus(res) not in (1,2):
                # SQLSTATE only. No stderr or PG diagnostic field is collected.
                raise Refused(state(p.PQresultErrorField(res,ord('C'))))
            if p.PQntuples(res)>1 or p.PQnfields(res)>1:
                raise Refused('result_shape')
            if p.PQntuples(res)==1 and p.PQnfields(res)==1 and not p.PQgetisnull(res,0,0):
                return p.PQgetvalue(res,0,0).decode('utf8')
            return None
        finally:
            p.PQclear(res)


ELIGIBLE = """SELECT CASE
 WHEN current_setting('server_version_num') <> '170006' THEN 'engine_version'
 WHEN inet_server_addr() IS NOT NULL OR inet_client_addr() IS NOT NULL THEN 'boundary_restriction'
 WHEN EXISTS(SELECT FROM pg_event_trigger WHERE evtenabled <> 'D') THEN 'eligibility_restriction'
 ELSE coalesce((SELECT CASE
 WHEN c.convalidated <> $4::boolean THEN 'validation_mismatch'
 WHEN c.connoinherit <> $5::boolean THEN 'inheritance_mismatch'
 ELSE 'ready' END
 FROM pg_class r JOIN pg_namespace n ON n.oid=r.relnamespace
 JOIN pg_constraint c ON c.conrelid=r.oid
 WHERE n.nspname=$1 AND r.relname=$2 AND c.conname=$3 AND r.relkind='r' AND NOT r.relispartition
   AND c.contype='c' AND c.conislocal AND c.coninhcount=0 AND c.conparentid=0
   AND NOT c.condeferrable AND NOT c.condeferred AND c.conbin IS NOT NULL
   AND NOT EXISTS(SELECT FROM pg_inherits h WHERE h.inhrelid=r.oid OR h.inhparent=r.oid)
   AND NOT EXISTS(SELECT FROM pg_constraint p WHERE p.conrelid=r.oid AND p.conname=$6)
 ),'eligibility_restriction') END"""
COMPARE = """SELECT jsonb_build_array(
 original.conkey=probe.conkey, original.connoinherit=probe.connoinherit,
 (SELECT array_agg(ROW(d.refclassid,d.refobjid,d.refobjsubid,d.deptype)::text ORDER BY
 d.refclassid,d.refobjid,d.refobjsubid,d.deptype) FROM pg_depend d
 WHERE d.classid='pg_constraint'::regclass AND d.objid=original.oid) IS NOT DISTINCT FROM
 (SELECT array_agg(ROW(d.refclassid,d.refobjid,d.refobjsubid,d.deptype)::text ORDER BY
 d.refclassid,d.refobjid,d.refobjsubid,d.deptype) FROM pg_depend d
 WHERE d.classid='pg_constraint'::regclass AND d.objid=probe.oid),
 original.conbin::text, probe.conbin::text)
 FROM pg_namespace n JOIN pg_class r ON r.relnamespace=n.oid
 JOIN pg_constraint original ON original.conrelid=r.oid AND original.conname=$3
 JOIN pg_constraint probe ON probe.conrelid=r.oid AND probe.conname=$4
 WHERE n.nspname=$1 AND r.relname=$2"""


def relation_identifier(name):
    return '"' + name.replace('"','""') + '"'


def classify(result):
    try:
        value=json.loads(result)
        if not isinstance(value,list) or len(value)!=5 or any(type(f) is not bool for f in value[:3]):
            raise ValueError
    except (ValueError, TypeError):
        raise Refused('result_shape') from None
    cols, inherit, deps, original, probe = value
    trees_equal = expression(original)==expression(probe)
    if not inherit:
        return 'inheritance_mismatch'
    if not cols:
        return 'constrained_column_mismatch'
    if not deps:
        return 'dependency_mismatch'
    return 'native_equivalent' if trees_equal else 'native_structure_mismatch'


def worker(key, source, target, env):
    if set(os.listdir('/sys/class/net')) != {'lo'}:
        raise Refused('boundary_restriction')
    host=Path(env.get('PGHOST',''))
    if (not host.is_absolute() or not host.is_relative_to('/work')
            or '..' in host.parts or host.resolve()!=host
            or host.name!='socket' or not re.fullmatch(r'[a-z][a-z0-9_]{1,62}',env.get('PGUSER',''))):
        raise Refused('boundary_restriction')
    if not isinstance(key,(tuple,list)) or len(key)!=3 or not all(
            isinstance(k,str) and 0<len(k.encode())<=63 and '\0' not in k for k in key):
        raise Refused('unsafe_input')
    old, new=clause(source['rule'],'source'),clause(target['rule'],'target')
    validation = source['convalidated']
    if type(validation) is not bool or type(target['convalidated']) is not bool or (
        validation!=target['convalidated'] or (validation and (old[2] or new[2]))):
        raise Refused('validation_mismatch')
    if old[1]!=new[1]:
        raise Refused('inheritance_mismatch')
    db=Connection(env)
    try:
        db.query('BEGIN')
        for setting in SETTINGS:
            db.query('SET LOCAL '+setting)
        ready=db.query(ELIGIBLE,*key,str(validation),str(old[1]),PROBE_NAME)
        if ready!='ready':
            raise Refused(ready if ready in FIXED else 'result_shape')
        # Single extended-protocol command, exact fenced clause and forestalled
        # table scan. On any exit PQfinish rolls back; the cluster is disposable.
        name='.'.join(map(relation_identifier,key[:2]))
        db.query('ALTER TABLE ONLY '+name+' ADD CONSTRAINT '+relation_identifier(PROBE_NAME)+
                 ' CHECK ('+old[0]+')'+(' NO INHERIT' if old[1] else '')+' NOT VALID')
        return classify(db.query(COMPARE,*key,PROBE_NAME))
    finally:
        db.close()


def native_check(key, source, target, env):
    if (env.get('PGPORT')!='5432' or env.get('PGDATABASE')!='postgres' or env.get('PGSSLMODE')!='disable'
        or {'PGHOSTADDR','PGSERVICE','PGPASSWORD','PGPASSFILE','PGOPTIONS'} & env.keys()):
        return 'boundary_restriction'
    try:
        # Strip all inherited settings including secrets and libpq service configuration.
        private_env={k:env[k] for k in ('PGHOST','PGUSER') if k in env}
        request=json.dumps([key,source,target],ensure_ascii=True).encode()
        if len(request)>RULE_LIMIT*16:
            return 'expression_size_limit'
        result=subprocess.run([sys.executable,'-I',str(Path(__file__).resolve())],input=request,
                              stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,env=private_env,timeout=12)
        if result.returncode != 0:
            return 'probe_process_refused'
        value=result.stdout.decode('ascii').strip()
        return value if value in FIXED else 'result_shape'
    except subprocess.TimeoutExpired:
        return 'probe_process_timeout'
    except OSError:
        return 'probe_process_refused'
    except (UnicodeError, TypeError, ValueError):
        return 'result_shape'


if __name__=='__main__':
    try:
        out=worker(*json.loads(sys.stdin.buffer.read(RULE_LIMIT*16+1)),os.environ)
    except Refused as err:
        out=str(err)
    except (ValueError, TypeError, KeyError, UnicodeError):
        out='result_shape'
    except OSError:
        out='boundary_restriction'
    print(out if out in FIXED else 'result_shape')
