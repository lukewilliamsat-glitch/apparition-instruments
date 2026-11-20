"""Reuse the exact accepted business scenarios against installed Stage A shapes."""
from hashlib import sha256
from pathlib import Path
import sys

p = Path(sys.argv[1])
assert sha256(p.read_bytes()).hexdigest() == "845607381ed95c1957d33d7d3412d031df601c1fa5deb642a1ee7e76e3784087"
s = p.read_text()
a = s.index(" const audit=`do $$ begin")
b = s.index(" assert.equal(await out('select mode from dominion79.lifecycle_control')",a)
s = s[:a] + """ assert.equal(digest(stage),approvedStageA);
 await query(stage);
 const nativeShape=async()=>out(`select md5(jsonb_agg(to_jsonb(x) order by x.schema,x.object,x.kind,x.identity)::text)
 from (
 select n.nspname schema,c.relname object,'relation' kind,c.relkind::text identity,
 jsonb_build_array(c.relrowsecurity,c.relforcerowsecurity,c.relacl) detail
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('dominion79','quartermaster79')
 union all
 select n.nspname,c.relname,'constraint',a.conname,to_jsonb(pg_get_constraintdef(a.oid))
 from pg_constraint a join pg_class c on c.oid=a.conrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('dominion79','quartermaster79')
 ) x`);
 const startingShape=await nativeShape();
 assert.equal(await out("select count(*)::int from pg_class where relnamespace in ('dominion79'::regnamespace,'quartermaster79'::regnamespace) and relkind='r' and relrowsecurity"),15);
 assert.equal(await out("select count(*)::int from pg_proc where pronamespace in ('dominion79'::regnamespace,'quartermaster79'::regnamespace)"),0);
 await query(composeRuntimeOverlay('unity79.sql',await readFile(new URL('unity79.sql',here),'utf8')));
 await query(composeRuntimeOverlay('quartermaster79.sql',await readFile(new URL('quartermaster79.sql',here),'utf8')));
 await query(await readFile(new URL('marketplace79.sql',here),'utf8'));
 await query(await readFile(new URL('legacy-writers80.fixture.sql',here),'utf8'));
 await query(composeRuntimeOverlay('ironheart80.sql',await readFile(new URL('ironheart80.sql',here),'utf8')));
 assert.equal(await nativeShape(),startingShape);
 console.log('PASS exact Stage A schema: runtime overlaid in isolation with no table, constraint or relation ACL changes');
""" + s[b:]
p.with_name(".integration82-generated.mjs").write_text(
    "import { approvedStageA, composeRuntimeOverlay } from '../homecoming82/runtime-overlay.mjs';\n" + s)
