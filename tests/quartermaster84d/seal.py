"""Build a deterministic 84D archive from the approved 84B wrapper."""
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path, PurePosixPath
import sys
from zipfile import ZIP_STORED, ZipFile, ZipInfo

BASE = 'c4a196b23575b5fd0f9374f92d0bb192405ad5813b19f17579b19c9ca9b1ee07'
PATCH = {
    'admin/quartermaster/entry.mjs': 'entry.mjs',
    'admin/quartermaster/index.html': None,
    'admin/quartermaster/production.mjs': 'production.mjs',
    'admin/quartermaster/workshop.mjs': 'workshop.mjs',
}
def digest(data):
    return sha256(data).hexdigest()

def build(wrapper, out):
    original = wrapper.read_bytes()
    if digest(original) != BASE:
        raise ValueError('84B rollback wrapper mismatch')
    with ZipFile(BytesIO(original)) as outer:
        with ZipFile(BytesIO(outer.read('quartermaster84-observe-static.zip'))) as archive:
            names = archive.namelist()
            if len(names) != 491 or len(set(names)) != 491 or any(
                PurePosixPath(n).is_absolute() or '..' in PurePosixPath(n).parts or
                n.endswith('/') or '\\' in n for n in names
            ):
                raise ValueError('Unexpected baseline paths')
            files = {name: archive.read(name) for name in names}
    for target, source in PATCH.items():
        if source is None:
            data = files[target].replace(
                b'data-admin-entry="./entry.mjs?build=quartermaster84-observe1"',
                b'data-admin-entry="./entry.mjs?build=quartermaster84d"')
        else:
            data = Path(__file__).with_name(source).read_bytes()
        if files.get(target) == data or any(s in data for s in
            (b'prwmowexhonguvtiywsy', b'example.invalid', b'quartermaster84c_', b'84C-FIXTURE')):
            raise ValueError('Unexpected overlay: ' + target)
        files[target] = data
    out.mkdir(parents=True, exist_ok=True)
    with ZipFile(out/'quartermaster84d-static.zip', 'w') as archive:
        for name, data in sorted(files.items()):
            entry = ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data, compress_type=ZIP_STORED)
    manifest = {'files':len(files), 'changed':sorted(PATCH),
                'inventory':{n:digest(d) for n,d in sorted(files.items())}}
    (out/'inventory.json').write_text(json.dumps(manifest, separators=(',',':'))+'\n')

if __name__ == '__main__':
    build(Path(sys.argv[1]), Path(sys.argv[2]))
