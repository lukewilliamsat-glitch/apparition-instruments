"""Bounded diagnostics-preserving process groups; no transport or credentials."""
import os,signal,subprocess
def capture(command,*,cwd,env,timeout):
 process=subprocess.Popen(command,cwd=cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,start_new_session=True)
 timed_out=False
 try:stdout,stderr=process.communicate(timeout=timeout)
 except subprocess.TimeoutExpired:
  timed_out=True
  # Kill the whole isolated group, including inherited test/CLI children.
  try:os.killpg(process.pid,signal.SIGTERM)
  except ProcessLookupError:pass
  try:stdout,stderr=process.communicate(timeout=3)
  except subprocess.TimeoutExpired:
   try:os.killpg(process.pid,signal.SIGKILL)
   except ProcessLookupError:pass
   stdout,stderr=process.communicate()
 return {'stdout':stdout,'stderr':stderr,'exitCode':124 if timed_out else process.returncode,'timedOut':timed_out}
