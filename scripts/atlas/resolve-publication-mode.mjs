import {record,stable} from './core.mjs';
const requiredGates=['sourceRevisionVerified','baselineComplete','overlayAllowlisted','validationPassed','protectedFilesPreserved'];
const modes=['full-build','static-only','cms-only','audit-only'];
export function resolvePublicationMode(input){
 const decision=(mode,codes,explanation)=>({schemaVersion:1,mode,allowed:mode!=='blocked',publicationAllowed:mode!=='blocked'&&mode!=='audit-only',reasonCodes:codes,requiredGates:[...requiredGates],explanation,authority:'Local decision only; not an approval, credential or proof of externally supplied gates.'});
 try{
  record(input,['schemaVersion','event','ref','commitMessage','dispatch','gates'],'mode input');
  if(input.schemaVersion!==1||!['push','workflow_dispatch','schedule','pull_request'].includes(input.event))return decision('blocked',['UNSUPPORTED_EVENT'],'Unsupported event/version');
  if(input.ref!=='refs/heads/main')return decision('blocked',['UNAPPROVED_REF'],'Only exact main ref is approved for this policy');
  if(typeof input.commitMessage!=='string'||input.commitMessage.length>65536)return decision('blocked',['MALFORMED_EVENT'],'Commit message must be present (empty allowed for non-push)');
  if(input.event==='push'&&!input.commitMessage.trim())return decision('blocked',['MISSING_COMMIT_MESSAGE'],'Push requires a nonempty commit message');
  record(input.dispatch,['mode'],'dispatch');record(input.gates,requiredGates,'gates');
  if(!requiredGates.every(k=>typeof input.gates[k]==='boolean'))return decision('blocked',['MISSING_GATES'],'Every safety gate requires an explicit Boolean');
  const markerStatic=/\[static-only\]/i.test(input.commitMessage),markerCMS=/\[cms-only\]/i.test(input.commitMessage);
  if(markerStatic&&markerCMS)return decision('blocked',['CONFLICTING_MARKERS'],'Both markers are present');
  const requested=input.dispatch.mode;
  if(requested!==undefined&&!modes.includes(requested))return decision('blocked',['UNKNOWN_MODE'],'Unknown requested mode');
  if(input.event!=='workflow_dispatch'&&requested!==undefined)return decision('blocked',['INVALID_DISPATCH'],'Dispatch mode supplied for non-dispatch event');
  if(input.event==='pull_request')return decision('blocked',['PULL_REQUEST_NO_PUBLICATION'],'PRs do not obtain publication permission; use a separate offline audit command');
  let mode=input.event==='workflow_dispatch'?(requested||'audit-only'):input.event==='push'?(markerStatic?'static-only':markerCMS?'cms-only':'full-build'):'audit-only';
  if(input.event==='workflow_dispatch'&&(markerStatic||markerCMS))return decision('blocked',['MARKER_OUTSIDE_PUSH'],'Dispatch must use explicit structured mode without push markers');
  if(input.event==='schedule'&&(markerStatic||markerCMS))return decision('blocked',['MARKER_OUTSIDE_PUSH'],'Schedule cannot use commit-message publication markers');
  const failed=requiredGates.filter(k=>!input.gates[k]);if(failed.length)return decision('blocked',failed.map(k=>'GATE_'+k.replace(/[A-Z]/g,c=>'_'+c).toUpperCase()),'Required external evidence/gate missing: '+failed.join(', '));
  return decision(mode,[input.event==='schedule'?'SCHEDULE_AUDIT_ONLY':'GATES_PASSED'],mode==='audit-only'?'Audit only; never deploy or run live data generators.':'Requested mode accepted after all explicit gates; orchestration still needs owner approval.');
 }catch(e){return decision('blocked',['MALFORMED_INPUT'],'Input contract invalid: '+e.message);}
}
export const resolverGates=Object.freeze(requiredGates);
