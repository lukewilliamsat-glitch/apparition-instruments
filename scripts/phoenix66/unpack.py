"""Read the two complete upload ZIPs from a successful package run."""
import hashlib
import json
import stat
import sys
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

PINS = {
    'baseline': 'd82ba2358bd5e5d4a6bc803f1c092cecd707cfb27a2e515b220281d4f29101b5',
    'nightfall': '1c462ac8fcaad2becb39aeb3a7f003789e8a843f127b55890db3af4afaf20412',
}
def require(ok, message):
    if not ok:
        raise ValueError(message)
def sha(b):
    return hashlib.sha256(b).hexdigest()
root=Path(sys.argv[1]).resolve()
receipt_path=root/'receipt.json'
require(receipt_path.stat().st_size<=262144,'Invalid receipt size')
receipt=json.loads(receipt_path.read_bytes())
for name,pin in PINS.items():
    row=receipt['payloads'][name]
    file=root/(name+'.zip')
    require(file.stat().st_size<=22*1024*1024 and sha(file.read_bytes())==row['zipSha256'],'Archive receipt mismatch')
    items=row['files']
    canonical=json.dumps(items,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
    require(len(items)==460 and sha(canonical)==pin,'Unapproved inventory')
    inventory={i['path']:i for i in items}
    checked={}
    with ZipFile(file) as z:
        entries=z.infolist()
        require(len(entries)==len(inventory) and {e.filename for e in entries}==set(inventory),'Archive inventory mismatch')
        for e in entries:
            path=PurePosixPath(e.filename)
            require(not path.is_absolute() and e.filename==str(path) and all(p not in ('..','.') for p in path.parts) and '\\' not in e.filename,'Invalid archive path')
            item=inventory[e.filename]
            require(stat.S_IFMT(e.external_attr>>16)==stat.S_IFREG and e.file_size==item['bytes'] and e.file_size<=8*1024*1024,'Unexpected static ZIP entry')
            b=z.read(e)
            require(len(b)==item['bytes'] and sha(b)==item['sha256'],'Archive asset mismatch')
            checked[e.filename]=b
    target=root/name
    target.mkdir(exist_ok=False)
    for path,b in checked.items():
        f=target/path
        f.parent.mkdir(parents=True,exist_ok=True)
        f.write_bytes(b)
print('PASS: both complete upload trees match their pinned inventories')
