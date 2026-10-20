// Offline receipt review; does not launch a browser or create acceptance evidence.
import {loadJSON,stable} from './core.mjs';
import {checkBrowserEvidence} from './browser-evidence.mjs';
const [reportFile,reportSHA256,planFile,planSHA256,artifactsRoot]=process.argv.slice(2);
if(!artifactsRoot)throw Error('Explicit REPORT REPORT_SHA PLAN PLAN_SHA ARTIFACTS required');
try{const report=(await loadJSON(reportFile,reportSHA256)).value,plan=(await loadJSON(planFile,planSHA256)).value,r=await checkBrowserEvidence({report,plan,planSHA256,artifactsRoot});console.log(stable(r));if(!r.browserAccepted)process.exitCode=2;}catch(e){console.log(stable({browserAccepted:false,errorCode:e.code||'BROWSER_IO'}));process.exitCode=1;}
