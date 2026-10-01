// Kit Definition remains authoritative for supplied physical choices. Analysis
// positions and assumptions are retained only when the existing shared state can
// represent the selected kit's actual components.
import {builderDiagramURL} from '../wiring-generator/session.mjs';
import {normaliseProject,projectURL} from '../electronics/state/project.mjs';
import {normaliseCircuitState,captureCircuitState,kitHandoff} from '../electronics/state/circuit-state.mjs';
import {toneCaps,lesPaul,generatorCapValue,generatorBleedValue,resolvedPotentiometer,normaliseKit,invalidKitChoices} from '../les-paul-kits/config.mjs';
export function reconcileKitProject(project,kit){
 const p=normaliseProject(project);if(p.electronics.instrument&&p.electronics.instrument.reference!=='les-paul')throw Error('No matching Kit Definition exists for this instrument.');const caps=toneCaps(kit),pot=resolvedPotentiometer(kit)?.component;
 const resistance=pot?.specification?.Resistance||'',match=resistance.match(/^([\d.]+)\s*(k|M)Ω$/i);
 if(!match)throw Error('The selected kit has no supported shared pot value.');
 const potK=Number(match[1])*(match[2].toLowerCase()==='m'?1000:1),electronics=structuredClone(p.electronics);
 Object.assign(electronics.configuration,{wiring:kit.wiring,bleed:generatorBleedValue(lesPaul.bleed[kit.bleed]),neckCap:generatorCapValue(caps.neck),bridgeCap:generatorCapValue(caps.bridge)});
 if(electronics.instrument){electronics.instrument.wiring=kit.wiring;for(const c of electronics.instrument.controls){c.pot=potK;if(c.role==='volume')c.bleed=electronics.configuration.bleed;else c.capacitor=electronics.configuration[c.assignments[0]+'Cap'];}}
 for(const channel of Object.values(electronics.responseAssumptions.channels)){channel.volumePot=potK;channel.tonePot=potK;}
 return normaliseProject({...p,kitReference:{id:lesPaul.id,family:lesPaul.family},extensions:{...p.extensions,kitSelection:{family:lesPaul.family,configuration:normaliseKit(kit)}},electronics:normaliseCircuitState(electronics)});
}
export function kitProjectLink(path,project,kit){return projectURL(path,reconcileKitProject(project,kit));}

export function projectKitHandoff(circuit,project){
 const fallback=kitHandoff(circuit),saved=project?.extensions?.kitSelection;
 if(!fallback.url||saved?.family!==lesPaul.family)return fallback;
 try{if(!saved.configuration||typeof saved.configuration!=='object'||Array.isArray(saved.configuration)||invalidKitChoices(saved.configuration).length)throw Error();const kit=normaliseKit(saved.configuration),reconciled=reconcileKitProject(project,kit),actual=captureCircuitState(circuit);
 if(JSON.stringify(reconciled.electronics)!==JSON.stringify(actual))throw Error();
 return {url:builderDiagramURL(kit,actual.configuration),reason:'Previous Kit Definition choices are retained. Review current availability, physical fit, brands and price before purchase.'};
 }catch{return {...fallback,reason:'The previous kit choices no longer match this circuit. '+fallback.reason};}
}
