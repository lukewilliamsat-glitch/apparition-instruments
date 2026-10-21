"""Existing libseccomp only; clean environment, inherited kernel network denial."""
import os,sys,pathlib,subprocess,ctypes,ctypes.util,errno,json
root=pathlib.Path(__file__).resolve().parent.parent.parent
nodefault=ctypes.util.find_library('seccomp')
if not nodefault:raise SystemExit('BLOCKED: existing libseccomp unavailable; install nothing')
def deny_network():
 libc=ctypes.CDLL(None,use_errno=True)
 if libc.prctl(38,1,0,0,0)!=0:raise OSError(ctypes.get_errno(),'NoNewPrivs failed')
 sc=ctypes.CDLL(nodefault);sc.seccomp_init.argtypes=[ctypes.c_uint32];sc.seccomp_init.restype=ctypes.c_void_p
 sc.seccomp_syscall_resolve_name.argtypes=[ctypes.c_char_p];sc.seccomp_syscall_resolve_name.restype=ctypes.c_int
 sc.seccomp_rule_add.argtypes=[ctypes.c_void_p,ctypes.c_uint32,ctypes.c_int,ctypes.c_uint];sc.seccomp_load.argtypes=[ctypes.c_void_p];sc.seccomp_release.argtypes=[ctypes.c_void_p]
 ctx=sc.seccomp_init(0x7fff0000)
 if not ctx:raise RuntimeError('No filter context')
 for name in ['socket','socketpair','connect','sendto','sendmsg','sendmmsg','io_uring_setup']:
  syscall=sc.seccomp_syscall_resolve_name(name.encode())
  if syscall>=0 and sc.seccomp_rule_add(ctx,0x00050000|errno.EPERM,syscall,0)!=0:raise RuntimeError('Rule failure')
 if sc.seccomp_load(ctx)!=0:raise RuntimeError('Filter failure')
 sc.seccomp_release(ctx)
out=pathlib.Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','HC36_OUTPUT':str(out/'RELEASE_TEST_RESULTS.json')}
probe=r'''import socket,errno,subprocess,sys,json,pathlib
records=[]
for family in [socket.AF_INET,socket.AF_INET6]:
 for kind in [socket.SOCK_STREAM,socket.SOCK_DGRAM]:
  try:socket.socket(family,kind);raise AssertionError('Socket bypass')
  except PermissionError as e:assert e.errno==errno.EPERM;records.append({'family':int(family),'type':int(kind),'errno':e.errno,'denied':True})
assert 'NoNewPrivs:\t1' in pathlib.Path('/proc/self/status').read_text()
child=subprocess.run([sys.executable,'-I','-c',"import socket,errno\ntry: socket.socket();raise AssertionError('child bypass')\nexcept PermissionError as e: assert e.errno==errno.EPERM"],check=True)
print(json.dumps({'status':'PASS','networkSocketProbes':records,'childInheritedDenial':True,'NoNewPrivs':True,'productionRequests':0}))'''
p=subprocess.run([sys.executable,'-I','-c',probe],cwd=root,env=env,preexec_fn=deny_network,close_fds=True,text=True,capture_output=True,check=True,timeout=15)
(out/'NETWORK_PROOF.json').write_text(p.stdout);print(p.stdout.strip(),flush=True)
r=subprocess.run([sys.executable,'-I',str(root/'tests/homecoming36/test_release.py')],cwd=root,env=env,preexec_fn=deny_network,close_fds=True,text=True,capture_output=True,timeout=60)
print(r.stdout);print(r.stderr,file=sys.stderr);raise SystemExit(r.returncode)
