"""Isolated BLACKBOX 32 acceptance; existing dependencies, no service access."""
from pathlib import Path
import tempfile, subprocess, sys, json, platform, hashlib

root = Path(__file__).resolve().parents[1]
if sys.platform != 'linux' or platform.machine() != 'x86_64':
    raise SystemExit('Blocked: reviewed network filter requires Linux x86_64')
if len(sys.argv) not in (2, 3) or not Path(sys.argv[1]).is_file():
    raise SystemExit('Pass absolute existing Node 22 executable and optional baseline/final stage')
node = str(Path(sys.argv[1]).resolve())
stage = sys.argv[2] if len(sys.argv) == 3 else 'final'
if stage not in ('baseline', 'final', 'probe'):
    raise SystemExit('Invalid stage')
probes = '''import socket,subprocess,sys,json
results=[]
for family in [socket.AF_INET,socket.AF_INET6]:
 for kind in [socket.SOCK_STREAM,socket.SOCK_DGRAM]:
  try:
   socket.socket(family,kind)
   raise AssertionError('Socket unexpectedly available')
  except PermissionError:results.append('socket denied '+str(family)+'/'+str(kind))
try:
 socket.getaddrinfo('blackbox32-probe.invalid',443)
 raise AssertionError('Unexpected DNS resolution')
except socket.gaierror:results.append('synthetic DNS denied')
c=subprocess.run([sys.executable,'-c','import socket;socket.socket()'],capture_output=True,text=True)
assert c.returncode and 'Operation not permitted' in c.stderr
results.append('child inherits denial')
s=open('/proc/self/status').read()
assert 'NoNewPrivs:\\t1' in s and 'Seccomp:\\t2' in s
print(json.dumps({'passed':len(results),'probes':results,'NoNewPrivs':1,'Seccomp':2}))
'''
suites = ['blackbox31-static-images.mjs', 'egress-static-assets-v2.mjs',
          'egress-static-assets-v2-dom.mjs', 'component-repository.mjs',
          'component-export.mjs', 'kit-snapshot.mjs', 'p07b-checkout.mjs']
if stage == 'final':
    suites.append('blackbox32-hardening.mjs')
if stage == 'probe':
    suites = ['blackbox32-hardening.mjs']
out = root / 'docs/performance/blackbox32'
out.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='blackbox32-isolation-') as scratch:
    env = {'PATH': '/usr/bin:/bin', 'HOME': scratch, 'TMPDIR': scratch,
           'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null',
           'GIT_TERMINAL_PROMPT': '0', 'LANG': 'C.UTF-8'}
    deny = str(Path(scratch) / 'network-deny')
    subprocess.run(['/usr/bin/cc', '-O2', '-Wall',
                    str(root / 'tests/blackbox31-network-deny.c'), '-o', deny],
                   env=env, check=True, cwd=root)
    proof = subprocess.run([deny, sys.executable, '-c', probes], env=env,
                           check=True, capture_output=True, text=True, cwd=root)
    network = json.loads(proof.stdout)
    runtime = subprocess.run([deny, node, '-p', 'JSON.stringify(process.versions)'],
                             env=env, check=True, capture_output=True, text=True)
    versions = json.loads(runtime.stdout)
    if not versions['node'].startswith('22.'):
        raise SystemExit('Expected Node 22; no compatibility claim from another major')
    print('Node', versions['node'], 'network probes', network['passed'], flush=True)
    results = []
    for suite in suites:
        run = subprocess.run([deny, node, '--experimental-strip-types',
                              str(root / 'tests' / suite)], env=env, cwd=root,
                             text=True, capture_output=True, timeout=120)
        results.append({'suite': suite, 'exit': run.returncode,
                        'status': 'PASS' if run.returncode == 0 else 'FAIL',
                        'stdout': run.stdout, 'stderr': run.stderr,
                        'classification': None if run.returncode == 0 else 'unclassified'})
        print(suite, results[-1]['status'], flush=True)
    dependencies = {}
    for name in ('happy-dom', '@electric-sql/pglite'):
        p = root / 'node_modules' / name / 'package.json'
        dependencies[name] = json.loads(p.read_text())['version']
    record = {'baselineCommit': 'baf899a62863998b749bca8387793a6b1ed5db61',
              'baselineTree': '8597a99b14e663613ae0749c546a7db56c096654',
              'stage': stage, 'runtime': versions, 'dependencies': dependencies,
              'isolation': network, 'suites': results,
              'suiteInvocationsPassed': sum(r['exit'] == 0 for r in results),
              'productionRequests': 0, 'browserAcceptance': False,
              'testFileSHA256': {s: hashlib.sha256((root / 'tests' / s).read_bytes()).hexdigest()
                                 for s in suites}}
    target = out / {'baseline': 'NODE22_BASELINE.json', 'probe': 'HARDENING_BEFORE.json',
                    'final': 'REGRESSION_RESULTS.json'}[stage]
    target.write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps({'runtime': versions['node'], 'passed': record['suiteInvocationsPassed'],
                      'total': len(results), 'evidence': target.name}), flush=True)
    if any(r['exit'] != 0 for r in results):
        raise SystemExit(1)
