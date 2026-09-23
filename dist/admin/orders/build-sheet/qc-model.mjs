import {pickList} from './model.mjs';
export const buildStatuses=['NOT STARTED','COMPONENTS PICKED','ASSEMBLY IN PROGRESS','READY FOR QC','QC PASSED','QC FAILED'];
export const qcResults=['NOT TESTED','PASS','FAIL'];
export function qcDefinition(context){
 const parts=pickList(context),has=role=>parts.some(p=>p.role===role),checks=[['picked','Correct components picked'],['wiring','Wiring inspected'],['solder','Solder joints inspected'],['ground','Ground connections checked'],['continuity','Continuity test completed'],['output','Output test completed']];
 if(has('potentiometers'))checks.push(['potValues','Potentiometer values checked'],['volume','Volume controls verified'],['tone','Tone controls verified']);
 if(context.snapshot.configuration.matching==='precision')checks.push(['matching','Precision matching completed']);
 if(parts.some(p=>p.role.includes('ToneCapacitor')))checks.push(['capValues','Capacitor values checked']);
 if(has('trebleBleeds'))checks.push(['bleedValues','Treble bleed values checked'],['bleedOperation','Treble bleed operation verified']);
 if(has('selector'))checks.push(['switching','Switching operation verified']);
 const measurements=[];for(const p of parts){const unit=p.role==='potentiometers'?'kΩ':p.role.includes('ToneCapacitor')?'nF':null;if(unit)for(let i=0;i<p.quantity;i++)measurements.push({id:p.id+'-'+i,label:p.name+' · '+(i+1),unit});}
 return {checks,measurements};
}
export function validateQC(value,definition){
 if(!buildStatuses.includes(value.status)||!qcResults.includes(value.result))throw Error('Choose a valid build status and QC result.');
 if(value.status==='QC PASSED'&&value.result!=='PASS'||value.status==='QC FAILED'&&value.result!=='FAIL')throw Error('Build status and final QC result must agree.');
 for(const key of ['builder','buildDate','person','date','notes'])if(typeof value[key]!=='string')throw Error('Invalid QC field.');
 for(const key of ['buildDate','date'])if(value[key]&&!/^\d{4}-\d{2}-\d{2}$/.test(value[key]))throw Error('Use a valid date.');
 for(const m of definition.measurements){const v=value.measurements[m.id];if(v!==''&&v!==undefined&&(!Number.isFinite(Number(v))||Number(v)<0))throw Error('Measured values must be zero or positive numbers.');}
 return structuredClone(value);
}
