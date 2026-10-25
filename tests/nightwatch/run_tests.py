#!/usr/bin/env python3
"""Machine-readable synthetic acceptance. Optional pre-test process negative controls."""
import argparse,datetime,hashlib,importlib.util,json,os,platform,resource,socket,sys,time,unittest
from pathlib import Path
from unittest.mock import patch
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--require-process-isolation',action='store_true');a=p.parse_args()
resource.setrlimit(resource.RLIMIT_AS,(512*1024*1024,512*1024*1024));resource.setrlimit(resource.RLIMIT_CPU,(120,120))
root=Path(__file__).resolve().parents[2];out=Path(a.out);out.mkdir(exist_ok=True)
negative=[]
if a.require_process_isolation:
    net=os.readlink('/proc/self/ns/net');assert net!=os.environ['NIGHTWATCH_PARENT_NETNS']
    caps=next(x.split(':',1)[1].strip() for x in Path('/proc/self/status').read_text().splitlines() if x.startswith('CapEff:'));assert int(caps,16)==0
    for family,address in [(socket.AF_INET,('192.0.2.1',443)),(socket.AF_INET6,('2001:db8::1',443))]:
        s=socket.socket(family,socket.SOCK_STREAM);s.settimeout(.5)
        try:s.connect(address);raise AssertionError('External route unexpectedly reachable')
        except OSError as e:assert e.errno in (101,113,97,99);negative.append({'family':family.name,'outcome':'DENIED','errno':e.errno})
        finally:s.close()
spec=importlib.util.spec_from_file_location('nightwatch_tests',Path(__file__).with_name('test_release.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class Records(unittest.TextTestResult):
    def __init__(self,*args,**kw):super().__init__(*args,**kw);self.records=[]
    def addSuccess(self,test):super().addSuccess(test);self.records.append({'case':test.id(),'result':'PASS'})
    def addFailure(self,test,err):super().addFailure(test,err);self.records.append({'case':test.id(),'result':'FAIL'})
    def addError(self,test,err):super().addError(test,err);self.records.append({'case':test.id(),'result':'ERROR'})
network_attempts=[]
def deny(*args,**kw):network_attempts.append(True);raise AssertionError('Synthetic test attempted networking')
with (out/'unit-tests.txt').open('w') as log,patch('socket.socket.connect',deny),patch('socket.socket.connect_ex',deny),patch('socket.create_connection',deny):
    result=unittest.TextTestRunner(stream=log,verbosity=2,resultclass=Records).run(unittest.defaultTestLoader.loadTestsFromModule(module))
source={str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for base in ('scripts/nightwatch','tests/nightwatch') for f in sorted((root/base).glob('*')) if f.is_file() and f.suffix in ('.py','.css','.sh')}
record={'scope':'synthetic_only','runtime':platform.python_version(),'platform':platform.system(),'testedCode':source,'testsRun':result.testsRun,'passed':len([x for x in result.records if x['result']=='PASS']),'failures':len(result.failures),'errors':len(result.errors),'unexpectedSocketAttempts':len(network_attempts),'processIsolation':{'required':a.require_process_isolation,'negativeControls':negative},'originalArchiveReads':0,'realDeploymentCalls':0,'imageDecodes':0,'recordedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'cases':result.records}
(out/'TEST_RESULTS.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({k:v for k,v in record.items() if k not in ('cases','testedCode')}))
raise SystemExit(0 if result.wasSuccessful() and not network_attempts else 1)
