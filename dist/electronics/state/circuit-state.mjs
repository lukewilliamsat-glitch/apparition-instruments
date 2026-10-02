import {instrumentFromGeneratorCircuit,instrumentCircuitState,applyInstrumentValues,instrumentFromCircuit} from '../instrument/circuit.mjs';
import {instrumentSummary,instrumentCapabilities} from '../instrument/configuration.mjs';
// Configuration handoff only. Topology, response and catalogue remain authoritative.
import {configuration,allowed,kitLink} from '../../wiring-generator/model.mjs';
import {defaultResponseAssumptions,resolveResponseAssumptions} from '../response/assumptions.mjs';
import {defaults as responseDefaults,fields,validateState,types} from '../response/circuits.mjs';
import {circuitResponse} from '../response/circuit.mjs';
import {referenceDescription} from '../response/analysis.mjs';
import {configurationFromURL,resolvedPotentiometer,lesPaul,toneCaps} from '../../les-paul-kits/config.mjs';
import {generatorURL,builderDiagramURL} from '../../wiring-generator/session.mjs';
import {deploymentPath} from '../../deployment.mjs';
export const stateVersion=1;
export const defaultControls=Object.freeze({neck:Object.freeze({volume:7,tone:10}),bridge:Object.freeze({volume:7,tone:10})});
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function normaliseCircuitState(input={}){
 if(object(input)&&input.version===2)return instrumentCircuitState(input.instrument);
 if(!object(input)||input.version!==undefined&&input.version!==stateVersion)throw Error('Unsupported circuit link version.');
 const raw=input.configuration||{};if(!object(raw))throw Error('Invalid circuit configuration.');
 const known=Object.fromEntries(Object.keys(allowed).filter(k=>Object.hasOwn(raw,k)).map(k=>[k,raw[k]]));
 if(raw.pickupProfiles!==undefined){if(!object(raw.pickupProfiles))throw Error('Invalid conductor profiles.');known.pickupProfiles=Object.fromEntries(['neck','bridge'].filter(k=>raw.pickupProfiles[k]!==undefined).map(k=>[k,raw.pickupProfiles[k]]));}
 if(raw.volumeBleeds!==undefined)known.volumeBleeds=raw.volumeBleeds;
 if(raw.switching!==undefined)known.switching=raw.switching;
 const config=configuration({...known,guitar:'les-paul'});if(raw.guitar&&raw.guitar!=='les-paul')throw Error('This circuit link does not describe the supported Les Paul topology.');
 config.pickupProfiles={neck:config.colours,bridge:config.colours,...config.pickupProfiles};
 const controls=structuredClone(defaultControls),a=defaultResponseAssumptions();
 if(input.controlPositions!==undefined&&!object(input.controlPositions))throw Error('Invalid control positions.');
 if(input.responseAssumptions!==undefined&&!object(input.responseAssumptions))throw Error('Invalid response assumptions.');
 for(const channel of ['neck','bridge']){
  const values=input.controlPositions?.[channel];if(values!==undefined&&!object(values))throw Error('Invalid channel controls.');
  for(const key of ['volume','tone'])if(values?.[key]!==undefined){const v=values[key];if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>10)throw Error('Invalid control position.');controls[channel][key]=v;}
  const selected=input.responseAssumptions?.channels?.[channel];if(selected!==undefined&&!object(selected))throw Error('Invalid pickup assumptions.');
  for(const key of ['pickup','volumePot','tonePot'])if(selected?.[key]!==undefined)a.channels[channel][key]=selected[key];
 }
 for(const key of ['cableC','loadR'])if(input.responseAssumptions?.[key]!==undefined)a[key]=input.responseAssumptions[key];
 for(const channel of ['neck','bridge'])resolveResponseAssumptions(a,channel);
 return {version:stateVersion,configuration:config,controlPositions:controls,responseAssumptions:a};
}
export function captureCircuitState(circuit){if((['hss','hsh','hh','tele','strat','sg','prs-se'].includes(circuit.state.guitar)||circuit.state.switching||circuit.state.volumeBleeds)&&!circuit.state.instrument)return instrumentCircuitState(instrumentFromGeneratorCircuit(circuit));if(circuit.state.instrument)return instrumentCircuitState(instrumentFromCircuit(circuit));return normaliseCircuitState({configuration:circuit.state,controlPositions:circuit.state.controlPositions,responseAssumptions:circuit.state.responseAssumptions});}
export function readCircuitState(search){
 const q=new URLSearchParams(search);if(!q.has('sf'))return {state:null,notice:''};
 try{const raw=q.get('sf');if(raw.length>12000)throw Error('Circuit link too long.');return {state:normaliseCircuitState(JSON.parse(raw)),notice:'Circuit configuration imported from Signal Forge.'};}
 catch{return {state:null,notice:'The circuit link could not be read. Normal defaults are shown.'};}
}
export function circuitStateURL(path,state,extra={}){const q=new URLSearchParams();q.set('sf',JSON.stringify(normaliseCircuitState(state)));for(const [key,value] of Object.entries(extra))q.set(key,typeof value==='string'?value:JSON.stringify(value));return deploymentPath(path+'?'+q);}
export function applyCircuitAnalysis(circuit,state){
 const valid=normaliseCircuitState(state);if(valid.version===2)return applyInstrumentValues(circuit,valid.instrument);circuit.state.controlPositions=valid.controlPositions;circuit.state.responseAssumptions=valid.responseAssumptions;
 for(const channel of ['neck','bridge']){const values=resolveResponseAssumptions(valid.responseAssumptions,channel);for(const role of ['volume','tone']){const part=circuit.components.find(p=>p.channel===channel&&p.role===role);if(part)part.value=values[role+'Pot']+'kΩ Audio';}}
 return circuit;
}
export function circuitStateSummary(circuit,report=circuitResponse(circuit)){
 if(circuit.state.instrument)return instrumentSummary(instrumentFromCircuit(circuit))+' · '+(report.supported?referenceDescription(report):report.reason);
 const base=(circuit.state.wiring==='modern'?'Modern':circuit.state.wiring==='50s'?'50s':'60s')+' wiring';
 if(report.supported)return base+' · '+referenceDescription(report);
 return base+' · '+(circuit.state.position==='both'?'Both pickups':circuit.state.position)+' · '+circuit.components.filter(p=>['pot','capacitor','resistor'].includes(p.type)).map(p=>p.label+': '+p.value).join(' · ');
}
export function wiringHandoff(circuit){const state=captureCircuitState(circuit);if(!state.configuration)return null;const url=new URL(generatorURL(state.configuration),'https://example.org');url.searchParams.set('sf',JSON.stringify(state));return url.pathname+url.search;}
export function designerHandoff(circuit,report=circuitResponse(circuit)){if(!report.supported)return {url:null,reason:'Select Neck or Bridge with Modern wiring to transfer the supported response model.'};return {url:circuitStateURL('/treble-bleed-designer/',captureCircuitState(circuit),{sr:report.state}),reason:''};}
export function readDesignerHandoff(search){
 const imported=readCircuitState(search),q=new URLSearchParams(search);if(!imported.state)return {...imported,response:null};
 try{const raw=q.get('sr');if(!raw||raw.length>4000)throw Error('Missing response state.');const input=JSON.parse(raw);if(!object(input))throw Error('Invalid response state.');const response={...responseDefaults};for(const key of [...Object.keys(fields),'type','topology'])if(input[key]!==undefined)response[key]=input[key];if(!Object.hasOwn(types,response.type))throw Error('Unknown response type.');validateState(response);return {...imported,response};}
 catch{return {state:null,response:null,notice:'The response link could not be read. Normal Designer defaults are shown.'};}
}
export function kitCanRepresentCaps(state){return ['neck','bridge'].every(ch=>Object.values(lesPaul.capacitors).some(c=>c.enabled!==false&&Number(c.value)===Number(state[ch+'Cap'])));}
export function kitHandoff(circuit){
 if(circuit.state.instrument&&!instrumentCapabilities(circuit.state.instrument).canBuildKit)return {url:null,reason:'No matching Kit Definition exists for this instrument arrangement.'};
 const url=kitLink(circuit);if(!url)return {url:null,reason:'This configuration is not currently available as a preconfigured kit.'};
 const kit=configurationFromURL(new URL(url,'https://example.org').search),pot=resolvedPotentiometer(kit)?.component,caps=toneCaps(kit);
 // Compare actual physical values against the existing resolved Kit Definition.
 const resistance=pot?.specification?.Resistance||'',match=resistance.match(/^([\d.]+)\s*(k|M)Ω$/i),potK=match?Number(match[1])*(match[2].toLowerCase()==='m'?1000:1):NaN;
 const pots=circuit.components.filter(p=>p.type==='pot'),matches=pots.every(p=>parseFloat(p.value)===potK);
 const capMatches=['neck','bridge'].every(ch=>Number(circuit.state[ch+'Cap'])===Number(caps[ch].value));
 if(!matches||!capMatches||!pot?.inKits||!pot.active||!Object.values(lesPaul.capacitors).some(c=>c.enabled!==false&&c===caps.neck)||!Object.values(lesPaul.capacitors).some(c=>c.enabled!==false&&c===caps.bridge))return {url:null,reason:'This configuration is not currently available as a preconfigured kit. Pot and capacitor choices must match the Kit Definition.'};
 return {url:builderDiagramURL(kit,captureCircuitState(circuit).configuration),reason:'Review component brands, shaft length, fitment and availability in Kit Builder. Pickup models, cable/input loads and control positions are analysis assumptions, not supplied kit parts.'};
}
