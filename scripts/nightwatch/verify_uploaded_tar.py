#!/usr/bin/env python3
"""Check Pages action's locally repackaged TAR before any deployment step."""
import argparse
from payload import _read_tar,MAX_TAR,canonical,require,sha,strict_json
from prepare import bounded_file,runtime_bounds

def verify_tar(tar_path,receipt_path,receipt_sha):
    receipt=strict_json(bounded_file(receipt_path,2*1024*1024));require(sha(canonical(receipt))==receipt_sha,'Receipt digest')
    payload=_read_tar(bounded_file(tar_path,MAX_TAR))
    require(payload.manifest()==receipt['files'] and list(payload.directories)==receipt['directories'],'Uploaded TAR changed complete payload')
    require(payload.digest()==receipt['payloadDigest'],'Uploaded TAR payload identity')
    return {'files':len(payload.files),'payloadDigest':payload.digest(),'verification':'LOCAL UPLOAD TAR ONLY; NOT LIVE SERVED VERIFICATION'}

if __name__=='__main__':
    runtime_bounds()
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--tar',required=True);p.add_argument('--receipt',required=True);p.add_argument('--receipt-sha256',required=True);a=p.parse_args();print(canonical(verify_tar(a.tar,a.receipt,a.receipt_sha256)).decode())
