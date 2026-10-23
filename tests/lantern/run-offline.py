"""Offline Node acceptance only. No browser/CI/deployment capability."""
import ctypes
import errno
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def deny_network():
    if platform.machine() != 'x86_64':
        raise RuntimeError('Reviewed syscall filter requires x86_64')
    class Filter(ctypes.Structure):
        _fields_ = [('code', ctypes.c_ushort), ('jt', ctypes.c_ubyte), ('jf', ctypes.c_ubyte), ('k', ctypes.c_uint)]
    class Program(ctypes.Structure):
        _fields_ = [('len', ctypes.c_ushort), ('filter', ctypes.POINTER(Filter))]
    instructions = [(0x20, 0, 0, 4), (0x15, 1, 0, 0xC000003E), (0x06, 0, 0, 0x80000000), (0x20, 0, 0, 0)]
    # Socket creation, connection, listening, message I/O and io_uring. All
    # inherited stdio are pipes; no socket descriptors or credentials passed.
    for number in [41, 42, 43, 44, 45, 46, 47, 49, 50, 53, 288, 299, 307, 425, 426, 427]:
        instructions += [(0x15, 0, 1, number), (0x06, 0, 0, 0x00050000 | errno.EPERM)]
    instructions.append((0x06, 0, 0, 0x7FFF0000))
    filters = (Filter * len(instructions))(*(Filter(*item) for item in instructions))
    program = Program(len(filters), filters)
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(38, 1, 0, 0, 0) or libc.prctl(22, 2, ctypes.byref(program)):
        raise OSError(ctypes.get_errno(), 'Could not install offline filter')


def run(command, env, timeout=35):
    result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True,
                            timeout=timeout, close_fds=True, preexec_fn=deny_network)
    return {'command': command, 'exitCode': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr}


if __name__ == '__main__':
    output = Path(sys.argv[1]).resolve()
    node = shutil.which('node')
    if not node:
        raise RuntimeError('Existing Node runtime required; no download attempted')
    env = {'PATH': str(Path(node).parent) + ':/usr/bin:/bin', 'LANG': 'C.UTF-8', 'TZ': 'UTC'}
    probe = r'''import socket,errno,json,subprocess,sys
rows=[]
for family in [socket.AF_INET,socket.AF_INET6]:
 for kind in [socket.SOCK_STREAM,socket.SOCK_DGRAM]:
  try: socket.socket(family,kind);raise AssertionError('Socket permitted')
  except OSError as e:
   assert e.errno==errno.EPERM;rows.append({'family':int(family),'kind':int(kind),'errno':e.errno})
child=subprocess.check_output([sys.executable,'-c',"import socket,errno;\ntry: socket.socket();raise AssertionError('Child socket permitted')\nexcept OSError as e: assert e.errno==errno.EPERM;print('DENIED')"],text=True).strip()
assert child=='DENIED'
status=open('/proc/self/status').read();assert next(line.split(':')[1].strip() for line in status.splitlines() if line.startswith('NoNewPrivs:'))=='1'
print(json.dumps({'direct':rows,'child':child,'noNewPrivs':True,'applicationModulesOpened':0}))'''
    isolation = run([sys.executable, '-c', probe], env)
    if isolation['exitCode']:
        output.write_text(json.dumps({'status': 'BLOCKED', 'isolation': isolation}, indent=2) + '\n')
        raise SystemExit(1)
    version = run([node, '--version'], env)
    commands = [
        [node, '--experimental-vm-modules', '--import', './tests/fixtures/offline-guard.mjs', 'tests/lantern/startup.mjs'],
        [node, '--import', './tests/fixtures/offline-guard.mjs', 'tests/p07b-checkout.mjs'],
        [node, '--import', './tests/fixtures/offline-guard.mjs', 'tests/p07b2-checkout-status.mjs'],
        [node, '--import', './tests/fixtures/offline-guard.mjs', 'tests/operations-v1-checkout.mjs'],
        [node, '--import', './tests/fixtures/offline-guard.mjs', 'tests/egress-cache-browser.mjs'],
        [node, '--import', './tests/fixtures/offline-guard.mjs', 'tests/product-content.mjs'],
    ]
    results = [run(command, env) for command in commands]
    record = {'status': 'PASS' if all(r['exitCode'] == 0 for r in results) else 'FAIL',
              'scope': 'offline Node/VM and test-double acceptance; NOT Chrome',
              'node': version['stdout'].strip(), 'isolation': json.loads(isolation['stdout']),
              'results': results, 'productionRequests': 0, 'browser': 'NOT TESTED'}
    output.write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps({'status': record['status'], 'node': record['node'], 'suites': len(results),
                      'passed': sum(r['exitCode'] == 0 for r in results), 'browser': record['browser']}))
    raise SystemExit(record['status'] != 'PASS')
