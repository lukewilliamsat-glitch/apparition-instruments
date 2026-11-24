import argparse
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path, PurePosixPath
import re
from zipfile import ZIP_STORED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parent
ORIGIN = 'https://prwmowexhonguvtiywsy.supabase.co'
BASE = 'c4a196b23575b5fd0f9374f92d0bb192405ad5813b19f17579b19c9ca9b1ee07'
WRITER = '65ffe320574328aa999c6012ba990c74114e16f35431b3e1bce82503349e4f0e'

def rewrite(value, changes):
    for old, new in changes:
        assert value.count(old) == 1, old
        value = value.replace(old, new)
    return value

def stage_auth(data):
    return rewrite(data,[
        ("'/rest/v1/admin_members?select=user_id&user_id=eq.'+encodeURIComponent(identity.id),{headers:",
         "'/rest/v1/rpc/quartermaster84c_orders',{headers:"),
        ("if(!Array.isArray(rows))throw new Error('Could not verify Admin membership.');",
         "if (typeof rows?.subject!=='string') throw new Error('Could not verify staging membership.');"),
        ("rows.some(row=>row.user_id===identity.id)", "rows.subject===identity.id"),
        ("'/rest/v1/admin_members?select=user_id&user_id=eq.'+encodeURIComponent(identity.id)+'&limit=2'",
         "'/rest/v1/rpc/quartermaster84c_orders'"),
        ("options),2048,{signal,onBytes}", "options),8192,{signal,onBytes}"),
        ("!Array.isArray(rows)||rows.length!==1||Object.keys(rows[0]||{}).length!==1||rows[0]?.user_id!==identity.id",
         "rows?.subject!==identity.id"),
    ])

def stage_writer(data):
    return rewrite(data,[
        ("  receive: ['POST','quartermaster84w_receive']",
         """  receive: ['POST','quartermaster84w_receive'],
  orders: ['GET','quartermaster84c_orders'],
  suppliers: ['GET','quartermaster84c_suppliers'],
  dominion: ['GET','dominion81_status'],
  review: ['GET','quartermaster84_review'],
  proposal: ['GET','quartermaster84c_finance_proposal'],
  financeSave: ['POST','quartermaster84c_finance_save'],
  financeStatus: ['GET','quartermaster84c_finance_status'],
  omniscience: ['GET','quartermaster84c_omniscience']"""),
        ("orderId, request, makeRequestId", "orderId, request, suppliers=[], makeRequestId"),
        ("  const uuidPattern='[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}';\n", ""),
        ("text('Supplier record ID',36,uuidPattern)", "select('Packaging supplier',suppliers.map(s=>[s.id,s.name]))"),
    ])

def build(artifact, writer, out):
    assert sha256(artifact.read_bytes()).hexdigest() == BASE
    assert sha256(writer.read_bytes()).hexdigest() == WRITER
    with ZipFile(artifact) as root:
        static = ZipFile(BytesIO(root.read('quartermaster84-observe-static.zip')))
    files = {p.relative_to(ROOT/'site').as_posix():p.read_bytes() for p in (ROOT/'site').rglob('*') if p.is_file()}
    assert re.fullmatch(r"[\s\S]*url:'https://prwmowexhonguvtiywsy\.supabase\.co',\s*publishableKey:'sb_publishable_[A-Za-z0-9_-]+'[\s\S]*",
                        files['backend/public-config.mjs'].decode())
    files['workshop.mjs'] = stage_writer(writer.read_text()).encode()
    for route in ('admin/orders','admin/quartermaster','admin/dominion','admin/finance','admin/omniscience'):
        files[route+'/index.html'] = files['index.html']
    files['404.html'] = b'<!doctype html><meta charset=utf-8><title>Page unavailable</title><p>This route is unavailable in the 84C rehearsal.</p><a href=/admin/orders/>Staging Orders</a>'
    def module(name):
        if name in files:
            return
        data = static.read(name).decode()
        if name=='admin/admin-auth.mjs':
            data = stage_auth(data)
        files[name]=data.encode()
        for spec in re.findall(r"""from\s+['"]([^'"]+)['"]""",data):
            assert spec.startswith('.') or spec.startswith('/'), spec
            from posixpath import normpath
            target = spec.split('?')[0]
            module(normpath(target.lstrip('/') if target.startswith('/') else str(PurePosixPath(name).parent/target)))
    for entry in ('admin/admin-auth.mjs','admin/command/bounded-json.mjs','admin/omniscience/model.mjs'):
        module(entry)
    deny = re.compile(rb'acdxpxvksvdwfajntzfx|sb_secret_|sk_live_|whsec_|stripe\.com|ebay\.com|apparitioninstruments\.co\.uk|/functions/v1')
    assert all(not deny.search(data) for data in files.values())
    out.mkdir(parents=True,exist_ok=True)
    manifest=[]
    with ZipFile(out/'quartermaster84c-static.zip','w',compression=ZIP_STORED) as zip:
        for n,data in sorted(files.items()):
            assert not n.startswith('/') and '..' not in PurePosixPath(n).parts
            info=ZipInfo(n,date_time=(1980,1,1,0,0,0))
            info.external_attr=0o100644<<16
            zip.writestr(info,data,compress_type=ZIP_STORED)
            manifest.append({'path':n,'bytes':len(data),'sha256':sha256(data).hexdigest()})
    (out/'inventory.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    print(f'{len(manifest)} files, dependency-closed')

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('artifact',type=Path)
    p.add_argument('writer',type=Path)
    p.add_argument('out',type=Path)
    a=p.parse_args()
    build(a.artifact,a.writer,a.out)
