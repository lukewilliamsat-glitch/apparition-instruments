#!/usr/bin/env python3
"""Build two Cloudflare Direct Upload roots from an already published static snapshot."""
import argparse
import base64
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

BASE = '53331335fe3f1418bc8ea77b82e29ef5ae58c9f1'
NIGHTFALL = 'afbac1358e782b588d222960eebb03f170a026bb'
SOURCE_RUN = 43703349542
SOURCE_ARTIFACT = 14157650445
ARCHIVE_HASH = 'f5aea757ff50a7abc6c87bf125d9f5bc276041cfc77a80bb40217f1dc794f23f'
ARCHIVE_BYTES = 20393412
SOURCE_DIGEST = 'd82ba2358bd5e5d4a6bc803f1c092cecd707cfb27a2e515b220281d4f29101b5'
PATCH_PATHS = (
    'admin/catalogue-settings/settings.mjs',
    'admin/component-repository.mjs',
    'backend/component-data.mjs',
    'components/catalogue.mjs',
    'products/app.mjs',
    'wiring-kits/kit-data.mjs',
)
REQUIRED = (
    'index.html', '404.html', 'products/index.html', 'products/bleed-cap/index.html',
    'products/bleed-cap/image.png', 'components/treble-bleeds/index.html',
    'basket/index.html', 'checkout/index.html', 'checkout/success/index.html',
    'account/index.html', 'admin/index.html', 'admin/orders/index.html',
    'admin/hub-cms/index.html', 'admin/conjure/index.html', 'circuit-forge/index.html',
    'wiring-generator/index.html', 'treble-bleed-designer/index.html',
    'les-paul-kits/index.html', 'operations/snapshot.json', 'backend/public-config.mjs',
)
SAFE_EXTENSIONS = {'.mjs','.js','.html','.css','.json','.png','.svg','.webp','.txt','.xml'}
SECRET_MARKERS = (
    rb'-----BEGIN [A-Z ]*PRIVATE KEY-----', rb'\b(?:sk|rk)_live_[a-zA-Z0-9]{16,}\b',
    rb'\b(?:whsec_|sb_secret_|github_pat_|ghp_)[a-zA-Z0-9_\-]{16,}\b',
    rb'\b(?:postgres|postgresql)://[^\s@]+:[^\s@]+@',
)
JWT = re.compile(rb'eyJ[a-zA-Z0-9_-]{8,}\.(eyJ[a-zA-Z0-9_-]{8,})\.[a-zA-Z0-9_-]{20,}')

def digest(data):
    return hashlib.sha256(data).hexdigest()

def strict(ok, reason):
    if not ok:
        raise ValueError(reason)

def read_tree(root):
    return {str(p.relative_to(root)):p.read_bytes() for p in sorted(root.rglob('*')) if p.is_file()}

def write_tree(root, files):
    root.mkdir(parents=True, exist_ok=False)
    for name,data in files.items():
        path=root/name
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(data)

def gate(files):
    strict(len(files)==460 and set(REQUIRED)<=files.keys(),'Unexpected static inventory')
    for name,data in files.items():
        suffix=Path(name).suffix
        strict(suffix in SAFE_EXTENSIONS and not any(p.startswith('.') for p in Path(name).parts),'Unexpected upload path: '+name)
        strict(len(data)<25*1024*1024,'Pages asset limit: '+name)
        if suffix in {'.png','.webp'}:
            continue
        strict(not any(re.search(pattern,data) for pattern in SECRET_MARKERS),'Secret marker in '+name)
        for match in JWT.finditer(data):
            try:
                token=match[1]
                claims=json.loads(base64.urlsafe_b64decode(token+b'='*(-len(token)%4)))
            except (ValueError, UnicodeError):
                continue
            strict(isinstance(claims,dict) and claims.get('role')=='anon','Unexpected JWT in '+name)
    strict(b'enabled:false' in files['backend/image-delivery-config.mjs'],'Archive-backed image activation must remain off')
    strict(files['products/bleed-cap/image.png'].startswith(b'\x89PNG\r\n\x1a\n'),'Product image not PNG')
    strict(b'https://apparitioninstruments.co.uk/account/' in files['account/app.mjs'],'Auth callback does not match apex')

def native_zip(path, files):
    with ZipFile(path,'x',compression=ZIP_DEFLATED,compresslevel=6) as z:
        for name,data in sorted(files.items()):
            item=ZipInfo(name,(1980,1,1,0,0,0));item.external_attr=0o100644<<16;item.compress_type=ZIP_DEFLATED
            z.writestr(item,data)
    with ZipFile(path) as verify:
        strict(verify.namelist()==sorted(files) and all(verify.read(k)==v for k,v in files.items()),'Direct Upload ZIP read-back failed')
    return {'zip':path.name,'zipSha256':digest(path.read_bytes()),'zipBytes':path.stat().st_size}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('baseline_zip',type=Path)
    parser.add_argument('out',type=Path)
    parser.add_argument('--source',type=Path,default=Path('.'))
    parser.add_argument('--tool-root',type=Path,default=Path('.'))
    a=parser.parse_args()
    sys.path.insert(0,str(a.tool_root.resolve()/'scripts/command-release'))
    import archive_core as ac
    strict(a.baseline_zip.stat().st_size==ARCHIVE_BYTES,'Unexpected original artifact size')
    before=ac.read_pages_zip(a.baseline_zip.read_bytes(),ARCHIVE_HASH,ARCHIVE_BYTES).files
    strict(ac.payload_digest(before)==SOURCE_DIGEST,'Unexpected production snapshot')
    gate(before)
    out=a.out.resolve()
    out.mkdir(parents=True,exist_ok=False)
    candidate=before.copy()
    pins=json.loads(Path(__file__).with_name('source-pins.json').read_text())
    strict(set(pins)==set(PATCH_PATHS),'Incorrect NIGHTFALL allowlist')
    for path in PATCH_PATHS:
        overlay=(a.source/'dist'/path).read_bytes()
        strict(digest(overlay)==pins[path],'Unexpected source bytes: '+path)
        candidate[path]=overlay
    # Reuse the existing deployment cache stamp. Paths, business content and
    # generated product images remain untouched.
    stamp=a.tool_root.resolve()/'scripts/stamp-static-assets.mjs'
    node_program="""
const {stampSource}=await import(process.argv[1]);
let content=''; for await (const chunk of process.stdin) content+=chunk;
const input=JSON.parse(content),revision=process.argv[2];
const output=input.map(([name,source])=>[name,stampSource(source,name.split('.').at(-1),revision)]);
process.stdout.write(JSON.stringify(output));
"""
    def stamped(files,rev):
        items=[(k,v.decode()) for k,v in files.items() if Path(k).suffix in {'.html','.mjs','.js'}]
        r=subprocess.run(['node','--input-type=module','-e',node_program,stamp.as_uri(),rev],
                         input=json.dumps(items),text=True,capture_output=True,check=True,timeout=30)
        return {**files,**{k:v.encode() for k,v in json.loads(r.stdout)}}
    expected=stamped(before,NIGHTFALL)
    candidate=stamped(candidate,NIGHTFALL)
    strict(sorted(k for k in before if candidate[k]!=expected[k])==sorted(PATCH_PATHS),'Unrelated application content changed')
    gate(candidate)
    strict(all(before[k]==candidate[k] for k in before if Path(k).suffix in {'.png','.webp','.svg','.json','.css','.xml','.txt'}),'Static content or asset bytes changed')
    outputs={}
    for label,src,files in [('baseline',BASE,before),('nightfall',NIGHTFALL,candidate)]:
        write_tree(out/label,files)
        strict(read_tree(out/label)==files,'Static tree read-back failed')
        outputs[label]={'applicationCommit':src,'payloadDigest':ac.payload_digest(files),
                        'files':ac.inventory(files),**native_zip(out/(label+'.zip'),files)}
    receipt={'sourceRun':SOURCE_RUN,'sourceArtifact':SOURCE_ARTIFACT,'originalArtifactSha256':ARCHIVE_HASH,
             'applicationDelta':list(PATCH_PATHS),'filesWithCacheStampOnly':sum(before[k]!=expected[k] for k in before if k not in PATCH_PATHS),
             'payloads':outputs}
    (out/'receipt.json').write_bytes(ac.canonical(receipt)+b'\n')
    print(json.dumps({k:{x:y for x,y in v.items() if x!='files'} for k,v in outputs.items()},indent=2))

if __name__=='__main__':
    main()
