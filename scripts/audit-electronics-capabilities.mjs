import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import * as current from '../dist/electronics/instrument/configuration.mjs';
const baseline=await import(pathToFileURL(process.argv[2]+'/dist/electronics/instrument/configuration.mjs'));
const rows=[];
for(const [family,layouts] of Object.entries(current.familyPickupLayouts))for(const layout of layouts)for(const controlLayout of ['1V1T','1V2T','2V2T'])for(const selector of Object.keys(current.switchFamilies)){
 const changes={family,layout,controlLayout,selector};let before,after;
 for(const [key,api] of [['before',baseline],['after',current]]){try{const i=api.configureInstrumentDimensions(api.createReference(),changes);const c=api.instrumentCapabilities(i);if(key==='before')before=c.canGenerateWiring;else after=c.canGenerateWiring;}catch{if(key==='before')before=false;else after=false;}}
 const combination=JSON.stringify(changes),classification=after?'valid and implemented':layout==='HSH'||layout==='HH'&&['strat','superstrat','custom'].includes(family)?'valid; future architecture':selector==='5-way-blade'&&['SS','HH'].includes(layout)||selector!=='5-way-blade'&&['SSS','HSS'].includes(layout)?'invalid combination':'descriptive UI option; no validated assignment/topology';rows.push({dimensions:changes,before,after,classification});
}
const modifiers=[];for(const id of Object.keys(current.references))for(const bleed of ['none','prs','cap','duncan'])for(const placement of id==='les-paul'?['neck','bridge','both']:['master'])for(const wiring of id==='les-paul'?['modern','50s','60s']:['modern']){
 const row={reference:id,bleed,placement,wiring};for(const [key,api] of [['before',baseline],['after',current]]){try{const i=api.createReference(id);i.wiring=wiring;for(const c of i.controls)if(c.role==='volume'&&(placement==='both'||placement==='master'||c.assignments.includes(placement)))c.bleed=bleed;row[key]=api.instrumentCapabilities(i).canGenerateWiring;}catch{row[key]=false;}}modifiers.push(row);
}
const counts=Object.fromEntries([...new Set(rows.map(r=>r.classification))].map(k=>[k,rows.filter(r=>r.classification===k).length]));const result={startingHead:'efc61477e48b25f8ec18f6b82039397e10057e34',uiDimensions:rows.length,dimensionClasses:counts,modifierCases:modifiers.length,modifierGapsClosed:modifiers.filter(r=>!r.before&&r.after).length,dimensions:rows,modifiers};writeFileSync('docs/capability-gap-inventory-v1.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,dimensions:undefined,modifiers:undefined}));
