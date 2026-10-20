#!/usr/bin/env python3
"""Replay a verified Phase2G recovery ZIP offline. No network or package manager."""
import argparse,base64,hashlib,io,json,os,pathlib,platform,shutil,subprocess,tarfile
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--package',required=True);p.add_argument('--node',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 package=pathlib.Path(a.package).resolve();out=pathlib.Path(a.output).resolve();node=pathlib.Path(a.node).resolve()
 assert platform.system()=='Linux' and platform.machine()=='x86_64','Use Linux x64/WSL2 for this offline replay; Windows browser route is separate'
 assert subprocess.check_output([str(node),'--version'],text=True).strip()=='v22.20.0','Byte-comparison replay pins Node 22.20.0'
 # User verifies the complete ZIP hash first; every member is checked again here.
 for row in (package/'SHA256SUMS').read_text().splitlines():
  h,n=row.split('  ',1);q=pathlib.PurePosixPath(n);assert not q.is_absolute() and '..' not in q.parts
  assert digest(package/n)==h,n
 release=json.loads((package/'RELEASE.json').read_text());out.mkdir();source=out/'source'
 subprocess.run(['git','clone','--quiet','--branch','atlas/phase2g-certification-closure',str(package/'atlas-phase2g.bundle'),str(source)],check=True)
 assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==release['commit']
 assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD^{tree}'],text=True).strip()==release['tree']
 subprocess.run(['git','-C',str(source),'fsck','--full','--strict'],check=True,capture_output=True)
 historical=out/'historical';historical.mkdir();data=subprocess.check_output(['git','-C',str(source),'archive','bb4ba2a932239a3ef397272b27143f0cd3adcccf'])
 with tarfile.open(fileobj=io.BytesIO(data)) as t:t.extractall(historical,filter='data')
 lock=json.loads((historical/'package-lock.json').read_text())['packages']
 for r in json.loads((package/'dependency-provenance.json').read_text()):
  name=r['package'];item=lock['node_modules/'+name];b=(package/'runtime-packages'/(name.replace('/','_')+'.tgz')).read_bytes();alg,h=item['integrity'].split('-',1)
  assert base64.b64encode(hashlib.new(alg,b).digest()).decode()==h
  target=historical/'node_modules'/name;target.mkdir(parents=True)
  with tarfile.open(fileobj=io.BytesIO(b),mode='r:gz') as t:
   for member in t.getmembers():
    if member.name=='package' and member.isdir():continue
    assert member.name.startswith('package/') and not member.issym() and not member.islnk()
    member.name=member.name[8:]
    if member.name:t.extract(member,target,filter='data')
 previous=out/'phase2f';shutil.copytree(package/'phase2f',previous);shutil.copytree(historical/'dist',previous/'repository');shutil.copytree(previous/'baseline',previous/'rollback')
 launcher=out/'network-deny';env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','TZ':'UTC','NODE_OPTIONS':'--import='+str(source/'tests/atlas/network-guard.mjs')}
 subprocess.run(['gcc','-std=c11','-Wall','-Wextra','-Werror','-O2',str(source/'tests/atlas/network-deny.c'),'-o',str(launcher)],check=True,env=env)
 def run(label,script,*args):
  x=subprocess.run([str(launcher),str(node),'--experimental-vm-modules',str(source/script),*map(str,args)],cwd=source,env=env,capture_output=True,text=True,timeout=300)
  (out/(label+'.stdout')).write_text(x.stdout);(out/(label+'.stderr')).write_text(x.stderr)
  if x.returncode:raise RuntimeError(label+' failed; retained diagnostics')
  print(label,'PASS',flush=True)
 run('network-probes','tests/atlas/network-probe.mjs')
 run('reconstruction','tests/atlas/reconstruction-rehearsal.mjs',historical,previous,package/'proof',out/'reconstruction')
 run('closure','tests/atlas/closure-rehearsal.mjs',previous,out/'reconstruction/reconstruction.json',out/'closure')
 compared=[]
 for folder,name in [('reconstruction','reconstruction.json'),('reconstruction','generator-44.json'),('reconstruction','source-325.json'),('closure','VERDICT.json'),('closure','CLOSURE.json'),('closure','REHEARSAL.json')]:
  actual=digest(out/folder/name);assert actual==digest(package/'evidence'/folder/name),folder+'/'+name;compared.append({'file':folder+'/'+name,'sha256':actual})
 assert not subprocess.check_output(['git','-C',str(source),'status','--porcelain'])
 result={'commit':release['commit'],'tree':release['tree'],'node':'v22.20.0','byteIdenticalReports':compared,'sourceClean':True,'productionRequests':0,'browserExecuted':False,'publicationAuthorised':False}
 (out/'REPLAY.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
if __name__=='__main__':main()
