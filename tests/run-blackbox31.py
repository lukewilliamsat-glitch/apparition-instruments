"""Cloud/local isolated runner. No package installation or live service access."""
from pathlib import Path
import tempfile, subprocess, os, sys, json, platform
root=Path(__file__).resolve().parents[1]
if sys.platform!='linux' or platform.machine()!='x86_64':
    raise SystemExit('Blocked: reviewed process-level network filter requires Linux x86_64')
node=sys.argv[1] if len(sys.argv)==2 else None
if not node or not Path(node).is_file():
    raise SystemExit('Pass an existing absolute Node executable; runner never downloads software')
probes='''import socket,subprocess,sys,json
results=[]
for family in [socket.AF_INET,socket.AF_INET6]:
 for kind in [socket.SOCK_STREAM,socket.SOCK_DGRAM]:
  try:
   socket.socket(family,kind)
   raise AssertionError('Socket unexpectedly available')
  except PermissionError:results.append('socket denied '+str(family)+'/'+str(kind))
try:
 socket.getaddrinfo('blackbox31-probe.invalid',443)
 raise AssertionError('Unexpected DNS resolution')
except socket.gaierror:results.append('synthetic DNS denied')
c=subprocess.run([sys.executable,'-c','import socket;socket.socket()'],capture_output=True,text=True)
assert c.returncode and 'Operation not permitted' in c.stderr
results.append('child inherits denial')
s=open('/proc/self/status').read()
assert 'NoNewPrivs:\\t1' in s and 'Seccomp:\\t2' in s
print(json.dumps({'passed':len(results),'probes':results,'NoNewPrivs':1,'Seccomp':2}))
'''
suites=['blackbox31-static-images.mjs','egress-static-assets-v2.mjs','egress-static-assets-v2-dom.mjs','component-repository.mjs','component-export.mjs','kit-snapshot.mjs','p07b-checkout.mjs']
with tempfile.TemporaryDirectory(prefix='blackbox31-isolation-') as scratch:
    env={'PATH':'/usr/bin:/bin','HOME':scratch,'TMPDIR':scratch,'GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','GIT_TERMINAL_PROMPT':'0','LANG':'C.UTF-8'}
    deny=str(Path(scratch)/'network-deny')
    subprocess.run(['/usr/bin/cc','-O2','-Wall',str(root/'tests/blackbox31-network-deny.c'),'-o',deny],env=env,check=True,cwd=root)
    proof=subprocess.run([deny,sys.executable,'-c',probes],env=env,check=True,capture_output=True,text=True,cwd=root)
    network=json.loads(proof.stdout);print('Network probes:',network['passed'],flush=True)
    results=[]
    for suite in suites:
        run=subprocess.run([deny,node,'--experimental-strip-types',str(root/'tests'/suite)],env=env,cwd=root,text=True,capture_output=True,timeout=120)
        entry={'suite':suite,'exit':run.returncode,'stdout':run.stdout,'stderr':run.stderr}
        results.append(entry)
        print(suite, 'PASS' if run.returncode==0 else 'FAIL',flush=True)
        if run.returncode:
            print(run.stdout);print(run.stderr)
            raise SystemExit('Stopped on failed suite; no further suites run')
    detail=json.loads(results[0]['stdout'].splitlines()[-1])
    record={'sourceMain':'2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f','runtime':detail['runtime'],'network':network,'focused':detail,'regressionSuites':results[1:],'suiteInvocationsPassed':len(results),'productionRequests':0,'browserAcceptance':False}
    output=root/'docs/performance/blackbox31/TEST_RESULTS.json'
    output.write_text(json.dumps(record,indent=2)+'\n')
    print(json.dumps({'suiteInvocationsPassed':len(results),'focusedScenariosPassed':detail['passed'],'networkProbesPassed':network['passed'],'runtime':detail['runtime'],'measurements':detail['measurements']},indent=2))
