"""Node suites in inherited syscall denial; no production services or credentials."""
from pathlib import Path
import sys,os,tempfile,subprocess,json,platform,hashlib
root=Path(__file__).resolve().parents[1]
node=str(Path(sys.argv[1]).resolve())
development='--development' in sys.argv
if sys.platform!='linux' or platform.machine()!='x86_64':raise SystemExit('Reviewed filter requires Linux x64')
suites=['blackbox34/publication.mjs','blackbox34/demand.mjs','blackbox34/presentation.mjs','blackbox34/preflight.mjs','blackbox34/benchmark.mjs',
 'blackbox31-static-images.mjs','blackbox32-hardening.mjs','egress-static-assets-v2.mjs','egress-static-assets-v2-dom.mjs',
 'component-repository.mjs','component-export.mjs','kit-snapshot.mjs','p07b-checkout.mjs']
probes='''import socket,subprocess,sys,json
results=[]
for family in [socket.AF_INET,socket.AF_INET6]:
 for kind in [socket.SOCK_STREAM,socket.SOCK_DGRAM]:
  try:socket.socket(family,kind);raise AssertionError('Socket unexpectedly available')
  except PermissionError:results.append('socket denied '+str(family)+'/'+str(kind))
try:socket.getaddrinfo('nightfall-negative.invalid',443);raise AssertionError('Unexpected DNS')
except socket.gaierror:results.append('DNS blocked')
c=subprocess.run([sys.executable,'-c','import socket;socket.socket()'],text=True,capture_output=True)
assert c.returncode and 'Operation not permitted' in c.stderr
results.append('child inherits denial')
assert 'NoNewPrivs:\\t1' in open('/proc/self/status').read()
print(json.dumps({'passed':len(results),'probes':results}))
'''
out=Path(os.environ.get('NIGHTFALL_EVIDENCE',root/'docs/performance/blackbox34/local-evidence'))
out.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='nightfall-isolated-') as scratch:
 env={'PATH':str(Path(node).parent)+':/usr/bin:/bin','HOME':scratch,'TMPDIR':scratch,'GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','GIT_TERMINAL_PROMPT':'0','LANG':'C.UTF-8'}
 deny=str(Path(scratch)/'network-deny')
 subprocess.run(['/usr/bin/cc','-O2','-Wall',str(root/'tests/blackbox31-network-deny.c'),'-o',deny],env=env,check=True)
 proof=json.loads(subprocess.check_output([deny,sys.executable,'-c',probes],env=env,text=True))
 version=subprocess.check_output([deny,node,'-p','process.version'],env=env,text=True).strip()
 if not development and not version.startswith('v22.'):raise SystemExit('Node 22 required for acceptance')
 results=[]
 for suite in suites:
  run=subprocess.run([deny,node,'--experimental-strip-types',str(root/'tests'/suite)],cwd=root,env=env,text=True,capture_output=True,timeout=300)
  result={'suite':suite,'exit':run.returncode,'status':'PASS' if run.returncode==0 else 'FAIL','stdout':run.stdout,'stderr':run.stderr,'sha256':hashlib.sha256((root/'tests'/suite).read_bytes()).hexdigest()}
  results.append(result);print(suite,result['status'],flush=True)
 record={'runtime':version,'developmentOnly':development,'networkIsolation':proof,'productionRequests':0,'suites':results,'passed':sum(r['exit']==0 for r in results),'total':len(results)}
 (out/'NODE_RESULTS.json').write_text(json.dumps(record,indent=2)+'\n')
 print(json.dumps({'runtime':version,'passed':record['passed'],'total':record['total'],'evidence':str(out/'NODE_RESULTS.json')}),flush=True)
 if record['passed']!=record['total']:raise SystemExit(1)
