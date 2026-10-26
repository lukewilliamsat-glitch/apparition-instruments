import sys,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/command-release'))
from frontend import exclude_terminal_failed_pages
from archive_core import Rejected
class TerminalFailureTests(unittest.TestCase):
 def test_exact_terminal_failure_only_and_later_attempt_never_published(self):
  sha='a'*40;p={'terminalFailedPagesRun':{'runId':77,'originalJobId':99,'sourceCommit':sha}}
  d={'sha':sha,'latestStatus':{'state':'failure','log_url':'https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/77/job/100'}}
  names=['Publish this exact verified Pages artifact once','Verify actual served frontend, public pages, tools and holiday bytes','Restore the verified complete rollback on confirmed live verification failure']
  original={'id':99,'run_id':77,'conclusion':'failure','steps':[{'name':n,'conclusion':'failure' if i==0 else 'skipped'} for i,n in enumerate(names)]}
  latest={'id':100,'run_id':77,'conclusion':'failure','steps':[{'name':n,'conclusion':'skipped'} for n in names]}
  values={'/actions/runs/77':{'head_sha':sha,'status':'completed','conclusion':'failure'},'/actions/jobs/99':original,'/actions/jobs/100':latest}
  log='Created deployment for '+sha+', ID: '+sha+'\n##[error]Deployment failed, try again later.'
  self.assertEqual(exclude_terminal_failed_pages(p,[d],values.__getitem__,lambda _:log),([],[77]))
  for message in ['',log+'Reported success!']:
   with self.assertRaises(Rejected):exclude_terminal_failed_pages(p,[d],values.__getitem__,lambda _:message)
  latest['steps'][0]['conclusion']='failure'
  with self.assertRaises(Rejected):exclude_terminal_failed_pages(p,[d],values.__getitem__,lambda _:log)
  other=copy.deepcopy(d);other['latestStatus']['log_url']=other['latestStatus']['log_url'].replace('/77/','/78/')
  self.assertEqual(exclude_terminal_failed_pages(p,[other],values.__getitem__,lambda _:log),([other],[]))
if __name__=='__main__':unittest.main()
