// Offline event-matrix model, not a claim about GitHub's actual engine or protections.
import {portablePath,pathsUnique} from './core.mjs';
export function maintenanceDecision({event,ref,changedPaths,manualMode}){
 const result=(classification,reason)=>({classification,reason,productionDeploymentAllowed:false,actualEngineVerified:false});
 if(ref!=='refs/heads/main')return result('offline-validation','Engineering refs cannot publish');
 if(event==='schedule')return result('scheduled-refresh-requires-existing-authority','Schedule does not grant backend or deployment authority');
 if(event==='workflow_dispatch')return ['audit-only','static-only','full-build','cms-only'].includes(manualMode)?result('manual-'+manualMode,'Separate release gates remain required'):result('blocked','Explicit manual mode required');
 if(event!=='push'||!Array.isArray(changedPaths)||!changedPaths.length)return result('blocked','Unsupported event or absent authoritative diff');
 // Repository workflow paths use .github; publication asset paths intentionally do not.
 try{const gitPaths=changedPaths.map(p=>typeof p==='string'&&p.startsWith('.github/')?p.slice(1):p);pathsUnique(gitPaths,'changed paths');gitPaths.forEach(portablePath);}catch{return result('blocked','Malformed changed-path set');}
 return changedPaths.every(p=>p.startsWith('.github/workflows/'))?result('workflow-maintenance','Proposed paths-ignore suppresses workflow-only pushes'):result('site-change-requires-release-gates','Mixed/site paths must not be treated as workflow-only maintenance');
}
