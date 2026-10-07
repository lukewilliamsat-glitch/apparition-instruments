import {normaliseProject,projectFromCircuit} from '../electronics/state/project.mjs';
import {makeCircuit} from '../wiring-generator/model.mjs';
import {makeInstrumentCircuit} from '../electronics/instrument/circuit.mjs';
import {applyCircuitAnalysis,circuitStateSummary} from '../electronics/state/circuit-state.mjs';
import {logicalParts} from '../circuit-forge/parts.mjs';
import {publicInstrument} from '../electronics/instrument/configuration.mjs';
export const snapshotVersion=1,engineIdentity='apparition-electronics-e846063-v1';
export const instrumentFields=Object.freeze(['manufacturer','model','year','serial','type','configuration','notes','reference']);
const text=(v,max=200)=>{if(v==null)return '';if(typeof v!=='string'||v.length>max)throw Error('Invalid project text.');return v.trim();};
export const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function normaliseMetadata(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid project metadata.');
 const i=input.instrument??{};if(!i||typeof i!=='object'||Array.isArray(i)||Object.keys(i).some(k=>!instrumentFields.includes(k)))throw Error('Invalid instrument metadata.');
 const instrument={};for(const key of instrumentFields){if(key==='year'){if(i.year!=null&&i.year!==''){if(!Number.isInteger(Number(i.year))||Number(i.year)<1800||Number(i.year)>2200)throw Error('Instrument year must be 1800–2200.');instrument.year=Number(i.year);}}else instrument[key]=text(i[key],key==='notes'?4000:200);}
 return {title:text(input.title,120)||'Untitled instrument',notes:text(input.notes,8000),instrument};
}
export function circuitForProject(project){const p=normaliseProject(project),state=p.electronics;return state.version===2?makeInstrumentCircuit(state.instrument):applyCircuitAnalysis(makeCircuit(state.configuration),state);}
export function createSnapshot(metadata,localProject){
 const p=normaliseProject(localProject),circuit=circuitForProject(p),parts=logicalParts(circuit);
 return {schema:1,engine:engineIdentity,metadata:normaliseMetadata(metadata),electronics:p.electronics,technical:{summary:circuitStateSummary(circuit),components:parts.items,limits:parts.reason,readiness:{electrical:'SUPPORTED CONFIGURATION',physicalFit:'UNKNOWN',manufacturing:'NOT MODELLED'}}};
}
export function validateSnapshot(input,{allowHistorical=false}={}){
 if(!input||input.schema!==snapshotVersion||typeof input.engine!=='string'||JSON.stringify(input).length>100000)throw Error('Unsupported or oversized project snapshot.');
 if(input.engine!==engineIdentity){if(allowHistorical)return structuredClone(input);throw Error('This revision uses a different electronics engine. Historical facts are retained; automatic reinterpretation is unavailable.');}
 const expected=createSnapshot(input.metadata,{version:1,electronics:input.electronics});
 if(canonical(input.technical)!==canonical(expected.technical))throw Error('Snapshot technical facts do not match the authoritative circuit.');return expected;
}
export function localFromSnapshot(snapshot){const s=validateSnapshot(snapshot);return normaliseProject({version:1,name:s.metadata.title,electronics:s.electronics});}
export function snapshotFromCircuit(metadata,circuit){return createSnapshot(metadata,projectFromCircuit(circuit));}
export const measurementTypes=Object.freeze({resistance:['ohm','kohm','Mohm'],capacitance:['pF','nF','uF'],pickupDCR:['ohm','kohm'],pickupInductance:['H','mH']});
export function normaliseMeasurement(input){
 if(!input||!measurementTypes[input.type]?.includes(input.unit))throw Error('Choose a supported measurement type and unit.');
 const value=Number(input.value),nominal=input.nominal==null||input.nominal===''?null:Number(input.nominal);
 if(input.value==null||input.value===''||!Number.isFinite(value)||value<=0||value>1e12||nominal!==null&&(!Number.isFinite(nominal)||nominal<=0||nominal>1e12))throw Error('Measurement and optional nominal value must be positive finite numbers.');
 const at=input.observed_at||new Date().toISOString();if(!Number.isFinite(Date.parse(at)))throw Error('Invalid measurement timestamp.');
 return {type:input.type,unit:input.unit,value,nominal,component_id:text(input.component_id,80)||null,observed_at:new Date(at).toISOString(),notes:text(input.notes,2000),provenance:'MANUAL'};
}
export function compareRevisions(a,b){
 if(a.schema!==1||b.schema!==1||a.engine!==b.engine)return {supported:false,reason:'Snapshot schema/engine differs; no equivalence is claimed.',changes:[]};
 const changes=[];function walk(x,y,path){if(canonical(x)===canonical(y))return;if(x&&y&&typeof x==='object'&&typeof y==='object'&&!Array.isArray(x)&&!Array.isArray(y)){for(const key of [...new Set([...Object.keys(x),...Object.keys(y)])].sort())walk(x[key],y[key],path+'.'+key);}else changes.push({path,before:x??null,after:y??null});}
 walk(a.electronics,b.electronics,'electronics');walk(a.metadata,b.metadata,'instrument/project');return {supported:true,reason:'Structured settings and metadata only; measured observations are separate records. No physical fit or tonal quality is inferred.',changes};
}
// Future publication boundary only. Never project notes, serial, customer reference or identity.
export function passportProjection(snapshot){const s=validateSnapshot(snapshot),electronics=s.electronics.version===2?{version:2,instrument:publicInstrument(s.electronics.instrument)}:s.electronics,clean=createSnapshot({}, {version:1,electronics});return {schema:1,engine:clean.engine,electronics:clean.electronics,technical:clean.technical};}
