#!/usr/bin/env python3
"""Compile a local Linux x64 seccomp launcher, then run only Atlas tests/demos.
No acquisition, package install, application generator or external endpoint.
The filter is inherited by all children and cannot be removed by the child.
"""
import argparse, pathlib, subprocess, os, sys, json, platform, shutil, datetime
p=argparse.ArgumentParser();p.add_argument('--evidence',required=True);p.add_argument('--node',default=shutil.which('node'));a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[2];out=pathlib.Path(a.evidence).resolve();out.mkdir(parents=True,exist_ok=True)
if platform.system()!='Linux' or platform.machine()!='x86_64':sys.exit('Blocked: reviewed seccomp launcher supports Linux x86_64 only')
node=pathlib.Path(a.node).resolve();launcher=out/'atlas-network-deny';src=root/'tests/atlas/network-deny.c'
env={'PATH':'/usr/local/bin:/usr/bin:/bin','LANG':'C.UTF-8','TZ':'UTC','NODE_OPTIONS':'--import='+str(root/'tests/atlas/network-guard.mjs')}
subprocess.run(['gcc','-std=c11','-Wall','-Wextra','-Werror','-O2',str(src),'-o',str(launcher)],check=True,env=env)
version=subprocess.check_output([str(node),'--version'],text=True,env=env).strip()
commands=[('network-probes',[str(node),str(root/'tests/atlas/network-probe.mjs')]),('atlas-tests',[str(node),'--test','--test-concurrency=1','--test-reporter=tap',str(root/'tests/atlas/safety.test.mjs'),str(root/'tests/atlas/release.test.mjs'),str(root/'tests/atlas/recovery.test.mjs')])]
if (root/'tests/atlas/demo.mjs').exists():commands.append(('synthetic-demo',[str(node),str(root/'tests/atlas/demo.mjs'),str(out/'demo')]))
results=[]
for name,cmd in commands:
 r=subprocess.run([str(launcher),*cmd],cwd=root,env=env,capture_output=True,text=True,timeout=180)
 (out/(name+'.stdout.txt')).write_text(r.stdout);(out/(name+'.stderr.txt')).write_text(r.stderr)
 results.append({'name':name,'command':['SECCompLauncher',*cmd],'exitCode':r.returncode,'stdout':name+'.stdout.txt','stderr':name+'.stderr.txt'})
 print(name,'PASS' if r.returncode==0 else 'FAIL',flush=True)
 if r.returncode:print(r.stdout[-10000:]);print(r.stderr[-5000:]);break
record={'UTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'node':version,'nodeExecutable':str(node),'os':platform.platform(),'architecture':platform.machine(),'isolation':'Compiled source-controlled seccomp filter + no_new_privs, inherited by test/CLI children; fetch/WebSocket stub defence in depth','environment':'Explicit PATH/LANG/TZ/NODE_OPTIONS only; no credentials inherited','commands':results,'allPassed':all(x['exitCode']==0 for x in results),'productionAccess':False}
(out/'execution.json').write_text(json.dumps(record,indent=2)+'\n')
sys.exit(0 if record['allPassed'] else 1)
