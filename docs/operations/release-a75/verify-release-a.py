#!/usr/bin/env python3
"""Verify and stage the exact Release A static tree; never contact production."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import zipfile

CANDIDATE='ac7b361723c2eea4b75fb4b9c6827ae542ae36c7a8f6bcdf2b84c0365f6ea023'
ROLLBACK='52f876edfba409ef1442eceae9a283b0024b53f2a195711f43113b0d6dd43cfe'
MANIFEST='9974858e8b6e62fb34450d47b3872ecb55a53e18b0c15f1b7d87e4e585548998'
CURRENT='41fab337-e7df-499f-9292-fef300e46fe7'
SOURCE='cc34aa5ae5326134dbc215af673b5132c45da29c'
def sha(data): return hashlib.sha256(data).hexdigest()
def verify(test, label):
    if not test: raise ValueError(label)
def file_sha(path):
    with path.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()
def inventory(archive,prefix):
    return {p[len(prefix):]:sha(archive.read(p)) for p in archive.namelist() if p.startswith(prefix) and not p.endswith('/')}
def stage(candidate,rollback,out):
    verify(file_sha(candidate)==CANDIDATE,'candidate ZIP digest')
    verify(file_sha(rollback)==ROLLBACK,'rollback ZIP digest')
    with zipfile.ZipFile(candidate) as c,zipfile.ZipFile(rollback) as b:
        raw=c.read('composition.json')
        verify(sha(raw)==MANIFEST,'composition digest')
        m=json.loads(raw); section=m['releaseA']
        verify(m['currentRollback']==CURRENT and m['sources']['releaseA']==SOURCE,'release identity')
        actual=inventory(c,'release-a-site/')
        baseline=inventory(b,'candidate/')
        verify(actual==section['files'] and len(actual)==476,'complete static candidate')
        verify(baseline==json.loads(b.read('ironclad69a-receipt.json'))['release'] and len(baseline)==465,'complete static rollback')
        delta={name for name in actual.keys()|baseline.keys() if actual.get(name)!=baseline.get(name)}
        verify(delta==set(section['changed']) and len(delta)==33,'approved static delta')
        verify(not out.exists(),'staging directory must be fresh')
        out.mkdir(mode=0o700)
        for name in sorted(actual):
            p=PurePosixPath(name)
            verify(not p.is_absolute() and '..' not in p.parts and '\\' not in name,'unexpected path')
            dst=out.joinpath(*p.parts)
            dst.parent.mkdir(parents=True,exist_ok=True)
            dst.write_bytes(c.read('release-a-site/'+name))
        print(json.dumps({'source':SOURCE,'rollback':CURRENT,'staged_files':len(actual),'changed_files':len(delta)}))
if __name__=='__main__':
    parser=argparse.ArgumentParser()
    for name in ('candidate','rollback','out'): parser.add_argument(name,type=Path)
    a=parser.parse_args()
    stage(a.candidate,a.rollback,a.out)
