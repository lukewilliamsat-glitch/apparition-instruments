// Content preservation authority only. Trust pins must come from the operator, not candidate claims.
import {record,fail,isHash,pathsUnique,sha256,stable} from './core.mjs';
export const differenceIdentity=row=>sha256(stable({path:row.path,repositorySHA256:row.repositorySHA256,observedLiveSHA256:row.observedLiveSHA256,candidateSHA256:row.candidateSHA256,sourceCommit:row.sourceCommit}));
export function verifyOwnerDispositions({value,digest,trustedDigests=[],rows}){
 if(!isHash(digest)||!Array.isArray(trustedDigests)||!trustedDigests.every(isHash)||!trustedDigests.includes(digest))return {trusted:false,resolved:[],issues:[{code:'OWNER_DISPOSITION_UNTRUSTED',detail:'Owner disposition requires a separately supplied authorisation pin'}]};
 const keys=['schemaVersion','kind','decisionId','ownerReference','scope','items'];record(value,keys,'owner disposition');
 if(keys.some(k=>!Object.hasOwn(value,k))||value.schemaVersion!==1||value.kind!=='atlas-owner-dispositions'||value.scope!=='content-preservation-only'||typeof value.decisionId!=='string'||!value.decisionId||typeof value.ownerReference!=='string'||!value.ownerReference||!Array.isArray(value.items)||!value.items.length)fail('OWNER_DISPOSITION_SCHEMA','Invalid versioned owner disposition');
 pathsUnique(value.items.map(x=>x.path),'owner dispositions');const matrix=new Map(rows.map(x=>[x.path,x])),resolved=[],issues=[];
 for(const item of value.items){
  const fields=['path','differenceSHA256','repositorySHA256','observedLiveSHA256','candidateSHA256','decision'];record(item,fields,'owner disposition item');
  if(fields.some(k=>!Object.hasOwn(item,k))||!['differenceSHA256','repositorySHA256','observedLiveSHA256','candidateSHA256'].every(k=>isHash(item[k]))||item.decision!=='preserve-observed-bytes')fail('OWNER_DISPOSITION_SCHEMA','Invalid preservation decision');
  const row=matrix.get(item.path);
  if(!row||!row.ownerDecisionRequired||item.differenceSHA256!==differenceIdentity(row)||item.repositorySHA256!==row.repositorySHA256||item.observedLiveSHA256!==row.observedLiveSHA256||item.candidateSHA256!==row.candidateSHA256||item.candidateSHA256!==item.observedLiveSHA256){issues.push({code:'OWNER_DISPOSITION_BINDING',detail:item.path});continue;}
  resolved.push(item.path);
 }
 return {trusted:true,resolved,issues};
}
