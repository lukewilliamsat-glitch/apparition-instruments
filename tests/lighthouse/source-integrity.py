"""Read-only Git identity and inherited-file integrity; no application imports."""
from pathlib import Path
import hashlib,json,subprocess,sys
root=Path(__file__).resolve().parents[2]
output=Path(sys.argv[1]);commit=sys.argv[2]
base='b396ec59d317b58ed1c9cd94f8f65620cd50a04c'
def git(*args):return subprocess.check_output(['git',*args],cwd=root,text=True).strip()
assert git('rev-parse','HEAD')==commit
changed=[]
paths=git('ls-tree','-r','--name-only',base).splitlines()
for path in paths:
 if git('hash-object','--',path)!=git('rev-parse',base+':'+path):changed.append(path)
assert set(changed)<= {'tests/lantern/startup.mjs'},changed
if changed:
 original=git('show',base+':tests/lantern/startup.mjs')+'\n'
 expected=original.replace("async function graph(response,doc){", "// Keep VM contexts owned until this test process exits (Node 22 VM lifetime).\nconst retainedContexts=globalThis.__lanternTestVMContexts=[];\nasync function graph(response,doc){")
 expected=expected.replace(" const synthetic=(values)=>", " retainedContexts.push(context);\n const synthetic=(values)=>")
 expected=expected.replace("const synthetic=(values)=>new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v] of Object.entries(values))this.setExport(k,v);},{context});", "const synthetic=(values)=>{const module=new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v] of Object.entries(values))this.setExport(k,v);},{context});retainedContexts.push(module);return module;};")
 expected=expected.replace(" return {catalogue,component,requests:()=>requests,renders:()=>renders};", " retainedContexts.push(catalogue,component,repository);\n return {catalogue,component,requests:()=>requests,renders:()=>renders};")
 assert (root/'tests/lantern/startup.mjs').read_text()==expected
added=git('diff','--name-only','--diff-filter=A',base,commit).splitlines()
assert all(p.startswith(('tests/lighthouse/','docs/storefront/lighthouse/')) or p=='.github/workflows/raven-lighthouse.yml' for p in added),added
assert git('hash-object','tests/lighthouse/isolation.mjs')=='5b81f9a75354430d35b7f5e92706f357d65b67b2'
record={'status':'PASS','baseCommit':base,'sourceCommit':commit,'sourceTree':git('rev-parse','HEAD^{tree}'),'inheritedFiles':len(paths),'unchanged':len(paths)-len(changed),'changes':changed,'added':added,'productionWorkflowUnchanged':True,'isolationSource':'993108aa7d65ac204ef54a7018a85f5c783813fd:tests/command01/isolation.mjs','toolLockSHA256':hashlib.sha256((root/'tests/lighthouse/tools/package-lock.json').read_bytes()).hexdigest()}
(output/('SOURCE_AFTER.json' if '--after' in sys.argv else 'SOURCE_IDENTITY.json')).write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'sourceCommit':commit,'sourceTree':record['sourceTree'],'unchanged':record['unchanged'],'status':'PASS'}))
