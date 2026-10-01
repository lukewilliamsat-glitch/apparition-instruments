// Instrument descriptions compose existing electrical/catalogue authorities; no equations here.
import {allowed,configuration} from '../../wiring-generator/model.mjs';
import {componentPresets,pickupPresets} from '../response/assumptions.mjs';
export const instrumentVersion=1;
export const instrumentFamilies=Object.freeze({'les-paul':'Les Paul-style',sg:'SG-style',tele:'Tele-style',strat:'Strat-style',superstrat:'Superstrat-style',prs:'PRS-style',custom:'Custom instrument'});
export const instrumentFamily=i=>i.family||({'les-paul':'les-paul',tele:'tele',strat:'strat',hss:'superstrat','prs-hh':'prs'}[i.reference]||'custom');
export const familyPickupLayouts=Object.freeze({'les-paul':['HH'],sg:['HH'],tele:['SS'],strat:['SSS','HSS','HSH','HH'],superstrat:['SSS','HSS','HSH','HH'],prs:['HH'],custom:['S','SS','HS','SH','SSS','H','HH','HSS','HSH']});
export const pickupLayouts=Object.freeze({S:{bridge:'single'},SS:{neck:'single',bridge:'single'},HS:{neck:'single',bridge:'humbucker'},SH:{neck:'humbucker',bridge:'single'},SSS:{neck:'single',middle:'single',bridge:'single'},H:{bridge:'humbucker'},HH:{neck:'humbucker',bridge:'humbucker'},HSS:{neck:'single',middle:'single',bridge:'humbucker'},HSH:{neck:'humbucker',middle:'single',bridge:'humbucker'}});
export const controlLayouts=Object.freeze({'1V':[1,0],'1V1T':[1,1],'1V2T':[1,2],'2V1T':[2,1],'2V2T':[2,2]});
export const switchFamilies=Object.freeze({'3-way-toggle':3,'3-way-blade':3,'5-way-blade':5});
export const references=Object.freeze({
 'les-paul':{label:'Les Paul / SG-style reference',layout:'HH',controls:'2V2T',selector:'3-way-toggle',pot:500,cap:'0.022',generator:'les-paul',assignment:'Independent neck and bridge volume and tone controls.'},
 tele:{label:'Tele-style reference',layout:'SS',controls:'1V1T',selector:'3-way-blade',pot:250,cap:'0.047',generator:'tele',assignment:'Master volume and master tone for neck and bridge.'},
 strat:{label:'Strat-style reference',layout:'SSS',controls:'1V2T',selector:'5-way-blade',pot:250,cap:'0.047',generator:'strat',assignment:'Master volume; neck tone and middle tone share one capacitor. Bridge has no tone control. This is one conventional assignment, not every Strat.'},
 hss:{label:'Superstrat HSS-style reference',layout:'HSS',controls:'1V2T',selector:'5-way-blade',pot:500,cap:'0.022',generator:null,assignment:'Master volume; neck tone and middle tone share one capacitor. Bridge humbucker has no tone control. Full humbucker only; no automatic split.'},
 'prs-hh':{label:'PRS-style HH reference',layout:'HH',controls:'1V1T',selector:'3-way-toggle',pot:500,cap:'0.022',generator:null,assignment:'Master volume and master tone; full passive humbuckers. Generic three-way starting point, not manufacturer specifications.'}
});
const object=v=>v&&typeof v==='object'&&!Array.isArray(v),positions=['neck','middle','bridge'];
const clone=v=>structuredClone(v);
function finite(v,min,max){return typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;}
function safeExtensions(v,depth=0){if(depth>4)throw Error('Instrument extensions are too deeply nested.');if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)||typeof v==='string'&&v.length<=200)return v;if(Array.isArray(v)&&v.length<=20)return v.map(x=>safeExtensions(x,depth+1));if(object(v)&&Object.keys(v).length<=20){const out={};for(const k of Object.keys(v).sort()){if(!/^[a-zA-Z][\w-]{0,40}$/.test(k)||['constructor','prototype','__proto__'].includes(k))throw Error('Invalid instrument extension.');out[k]=safeExtensions(v[k],depth+1);}return out;}throw Error('Invalid instrument extension.');}
export function selectorSelections(layout,family){const p=Object.keys(pickupLayouts[layout]||{});if(p.length===1)return [p];if(family==='5-way-blade'&&p.length===3)return [['bridge'],['bridge','middle'],['middle'],['middle','neck'],['neck']];if(p.length===2&&switchFamilies[family]===3)return [['bridge'],['bridge','neck'],['neck']];return null;}
export function createReference(id='les-paul'){
 const r=references[id];if(!r)throw Error('Unknown instrument reference.');const names=Object.keys(pickupLayouts[r.layout]);
 const pickups=names.map(position=>({position,type:pickupLayouts[r.layout][position],assumption:pickupLayouts[r.layout][position]==='single'?'single':'generic',modification:'full'}));
 const control=(id,role,assignments)=>({id,role,assignments,pot:r.pot,position:role==='volume'?7:10,...role==='tone'?{capacitor:r.cap,capacitorGroup:r.controls==='1V2T'?'shared-tone':id}:{bleed:'none'}});
 const controls=r.controls==='2V2T'?['neck','bridge'].flatMap(p=>[control(p+'Volume','volume',[p]),control(p+'Tone','tone',[p])]):[control('masterVolume','volume',names),...r.controls==='1V2T'?[control('neckTone','tone',['neck']),control('middleTone','tone',['middle'])]:[control('masterTone','tone',names)]];
 return normaliseInstrument({version:1,reference:id,label:'',layout:r.layout,controlLayout:r.controls,pickups,controls,selector:{family:r.selector,selection:r.selector==='5-way-blade'?5:3},wiring:'modern',load:{cableC:500,loadR:1},source:{kind:'generic-reference'},extensions:{}});
}
export function normaliseInstrument(input){
 if(!object(input)||input.version!==instrumentVersion)throw Error('Unsupported instrument version.');
 if(!Object.hasOwn(pickupLayouts,input.layout)||!Object.hasOwn(controlLayouts,input.controlLayout))throw Error('Unsupported pickup or control layout.');
 if(input.family!==undefined&&!Object.hasOwn(instrumentFamilies,input.family))throw Error('Unknown instrument family.');
 if(input.reference!==undefined&&!Object.hasOwn(references,input.reference))throw Error('Unknown instrument reference.');
 if(input.label!==undefined&&(typeof input.label!=='string'||input.label.length>80))throw Error('Instrument label must be at most 80 characters.');
 if(!Array.isArray(input.pickups)||input.pickups.length!==Object.keys(pickupLayouts[input.layout]).length)throw Error('Missing required pickup positions.');
 const seen=new Set(),pickups=input.pickups.map(p=>{if(!object(p)||seen.has(p.position)||!positions.includes(p.position)||pickupLayouts[input.layout][p.position]!==p.type)throw Error('Invalid or duplicate pickup position/type.');seen.add(p.position);if(!Object.hasOwn(pickupPresets,p.assumption)||p.type==='single'&&p.assumption!=='single')throw Error('Pickup assumption does not match its type.');if(!['full','coil-split','partial-split','series','parallel','phase-reversal'].includes(p.modification))throw Error('Unknown pickup modification.');if(p.conductor!==undefined&&!allowed.colours.includes(p.conductor))throw Error('Invalid conductor profile.');return {position:p.position,type:p.type,assumption:p.assumption,modification:p.modification,...p.conductor?{conductor:p.conductor}:{}};}).sort((a,b)=>positions.indexOf(a.position)-positions.indexOf(b.position));
 const counts=controlLayouts[input.controlLayout];if(!Array.isArray(input.controls)||input.controls.length!==counts[0]+counts[1])throw Error('Missing required controls.');
 const ids=new Set(),controls=input.controls.map(c=>{if(!object(c)||typeof c.id!=='string'||!/^[a-zA-Z][\w-]{0,40}$/.test(c.id)||ids.has(c.id)||!['volume','tone'].includes(c.role))throw Error('Invalid control identity.');ids.add(c.id);if(!Array.isArray(c.assignments)||!c.assignments.length||new Set(c.assignments).size!==c.assignments.length||c.assignments.some(p=>!seen.has(p)))throw Error('Invalid control assignment.');if(!componentPresets[c.role+'Pot'].includes(c.pot)||!finite(c.position,0,10))throw Error('Invalid control value or position.');if(c.role==='tone'&&(!allowed.neckCap.includes(c.capacitor)||typeof c.capacitorGroup!=='string'||!/^[a-zA-Z][\w-]{0,40}$/.test(c.capacitorGroup)))throw Error('Invalid tone capacitor.');if(c.role==='volume'&&!allowed.bleed.includes(c.bleed))throw Error('Invalid treble bleed.');return {id:c.id,role:c.role,assignments:positions.filter(p=>c.assignments.includes(p)),pot:c.pot,position:c.position,...c.role==='tone'?{capacitor:c.capacitor,capacitorGroup:c.capacitorGroup}:{bleed:c.bleed}};}).sort((a,b)=>a.id.localeCompare(b.id));
 if(controls.filter(c=>c.role==='volume').length!==counts[0]||controls.filter(c=>c.role==='tone').length!==counts[1]||pickups.some(p=>!controls.some(c=>c.role==='volume'&&c.assignments.includes(p.position))))throw Error('Invalid control architecture.');
 for(const group of new Set(controls.filter(c=>c.role==='tone').map(c=>c.capacitorGroup)))if(new Set(controls.filter(c=>c.capacitorGroup===group).map(c=>c.capacitor)).size!==1)throw Error('Shared tone capacitor values must agree.');
 if(!object(input.selector)||!Object.hasOwn(switchFamilies,input.selector.family)||!Number.isInteger(input.selector.selection)||input.selector.selection<1||input.selector.selection>switchFamilies[input.selector.family])throw Error('Unsupported switch identity or selection.');
 if(input.shielding!==undefined&&!allowed.shielding.includes(input.shielding))throw Error('Invalid shielding state.');
 if(!allowed.wiring.includes(input.wiring)||input.wiring==='50s'&&controls.some(c=>c.bleed&&c.bleed!=='none'))throw Error('Unsupported wiring/treble bleed combination.');
 if(!object(input.load)||!componentPresets.cableC.includes(input.load.cableC)||!componentPresets.loadR.includes(input.load.loadR))throw Error('Invalid model load.');
 const extensions=safeExtensions(input.extensions||{});if(!object(extensions)||JSON.stringify(extensions).length>2000)throw Error('Instrument extensions are too large.');
 return {version:instrumentVersion,...input.family!==undefined?{family:input.family}:{},...input.reference?{reference:input.reference}:{},label:(input.label||'').trim(),layout:input.layout,controlLayout:input.controlLayout,pickups,controls,selector:{family:input.selector.family,selection:input.selector.selection},wiring:input.wiring,shielding:input.shielding||'yes',load:{cableC:input.load.cableC,loadR:input.load.loadR},source:{kind:input.reference?'generic-reference':'custom'},extensions};
}
export function validateInstrument(input){try{return {valid:true,instrument:normaliseInstrument(input),errors:[]};}catch(e){return {valid:false,instrument:null,errors:[e.message]};}}
// Topology compatibility compares actual relationships, not a reference name alone.
export function matchingReference(input){const i=normaliseInstrument(input);if(i.pickups.some(p=>p.modification!=='full'))return null;for(const [id,r] of Object.entries(references)){const base=createReference(id),family=instrumentFamily(i);if(family!=='custom'&&!({'les-paul':['les-paul','sg'],tele:['tele'],strat:['strat','superstrat'],hss:['strat','superstrat'],'prs-hh':['prs']}[id]||[]).includes(family))continue;if(i.layout!==r.layout||i.controlLayout!==r.controls||i.selector.family!==r.selector||i.controls.length!==base.controls.length)continue;if(i.controls.every(c=>base.controls.some(b=>b.id===c.id&&b.role===c.role&&JSON.stringify(b.assignments)===JSON.stringify(c.assignments)&&b.capacitorGroup===c.capacitorGroup)))return id;}return null;}
export function generatorConfiguration(input){const i=normaliseInstrument(input),id=matchingReference(i),r=references[id];if(!r?.generator||i.wiring!=='modern'&&id!=='les-paul')return null;
 const volumes=i.controls.filter(c=>c.role==='volume'),tones=i.controls.filter(c=>c.role==='tone');if(new Set(volumes.map(c=>c.bleed)).size>1)return null;
 const position=id==='les-paul'?{1:'bridge',2:'both',3:'neck'}[i.selector.selection]:String(i.selector.selection);
 return configuration({guitar:r.generator,wiring:i.wiring,bleed:volumes[0].bleed,neckCap:tones.find(c=>c.assignments.includes('neck'))?.capacitor||r.cap,bridgeCap:id==='les-paul'?tones.find(c=>c.assignments.includes('bridge')).capacitor:tones[0].capacitor,position,colours:'generic',shielding:i.shielding,...id==='les-paul'?{pickupProfiles:Object.fromEntries(i.pickups.map(p=>[p.position,p.conductor||'generic']))}:{}});
}
export function instrumentCapabilities(input){const i=normaliseInstrument(input),id=matchingReference(i),g=generatorConfiguration(i),selected=selectorSelections(i.layout,i.selector.family)?.[i.selector.selection-1]||[],tone=i.controls.find(c=>c.role==='tone'&&c.assignments.includes(selected[0]));
 const supportedSegment=!!g&&i.wiring==='modern'&&selected.length===1&&['neck','bridge'].includes(selected[0])&&!!tone;
 const reason=!g?'This configuration can be described, but its switching/control arrangement is not yet modelled by the Wiring Generator or Signal Lab.':selected.length>1?'Combined pickups require the coupled pickup model, which is not yet available.':!supportedSegment?'This selected pickup/control arrangement is not yet modelled by Signal Lab.':'';
 return {canAnalyseResponse:supportedSegment,canGenerateWiring:!!g,canOpenTrebleBleedDesigner:supportedSegment,canBuildKit:id==='les-paul'&&!!g,canShare:true,canEditControlAssignment:false,selected,reason};
}
export function instrumentSummary(input){const i=normaliseInstrument(input),r=references[i.reference];return (i.family?instrumentFamilies[i.family]:r?.label||'Custom instrument')+' · '+i.layout+' · '+i.controlLayout+' · '+i.selector.family.replaceAll('-',' ').toUpperCase();}
export function instrumentExplanation(input){const i=normaliseInstrument(input);return i.controls.map(c=>(c.id.replace(/([A-Z])/g,' $1')+': '+c.assignments.join(' + ')+' · '+c.pot+' kΩ'+(c.role==='tone'?' · '+c.capacitor+' µF':' · treble bleed '+c.bleed))).join('; ');}
export function publicInstrument(input){const i=normaliseInstrument(input);return normaliseInstrument({...i,label:'',extensions:{}});}
export function instrumentFromLegacy(state){const i=createReference('les-paul'),c=state.configuration;i.wiring=c.wiring;i.shielding=c.shielding;i.selector.selection={bridge:1,both:2,neck:3}[c.position];for(const p of i.pickups){const a=state.responseAssumptions.channels[p.position];p.assumption=a.pickup;p.conductor=c.pickupProfiles?.[p.position]||'generic';p.type='humbucker';}i.layout=i.pickups.every(p=>p.type==='humbucker')?'HH':i.pickups.every(p=>p.type==='single')?'SS':i.pickups.find(p=>p.position==='bridge').type==='humbucker'?'HS':'SH';for(const part of i.controls){const ch=part.assignments[0],role=part.role;part.pot=state.responseAssumptions.channels[ch][role+'Pot'];part.position=state.controlPositions[ch][role];if(role==='tone')part.capacitor=c[ch+'Cap'];else part.bleed=c.bleed;}i.load={cableC:state.responseAssumptions.cableC,loadR:state.responseAssumptions.loadR};return normaliseInstrument(i);}

// Descriptive editing only: capabilities still match the complete validated arrangement.
export function configureInstrumentDimensions(input,changes={}){
 const original=normaliseInstrument(input),family=changes.family||instrumentFamily(original);
 if(!instrumentFamilies[family])throw Error('Unknown instrument family.');
 const familyChanged=family!==instrumentFamily(original),base=familyChanged?createReference({sg:'les-paul',superstrat:'hss',prs:'prs-hh',custom:'tele'}[family]||family):original;
 const layout=changes.layout||base.layout,controlLayout=changes.controlLayout||base.controlLayout,selector=changes.selector||base.selector.family;
 if(!familyPickupLayouts[family].includes(layout))throw Error('Pickup layout is not available for this family.');
 const next={...base,family,label:original.label,load:original.load,extensions:original.extensions,layout,controlLayout,selector:{family:selector,selection:Math.min(base.selector.selection,switchFamilies[selector]||1)}};
 if(layout!==base.layout||controlLayout!==base.controlLayout){
  next.pickups=Object.entries(pickupLayouts[layout]).map(([position,type])=>{const old=base.pickups.find(p=>p.position===position&&p.type===type);return old||{position,type,assumption:type==='single'?'single':'generic',modification:'full'};});
  const names=next.pickups.map(p=>p.position),[volumes,tones]=controlLayouts[controlLayout],pot=base.controls[0].pot,cap=base.controls.find(c=>c.role==='tone')?.capacitor||'0.022';
  const assignments=n=>volumes===1?names:n===0?(names.filter(p=>p!=='bridge').length?names.filter(p=>p!=='bridge'):names):[names.includes('bridge')?'bridge':names.at(-1)];
  next.controls=[];
  for(let n=0;n<volumes;n++)next.controls.push({id:volumes===1?'masterVolume':n===0?'neckVolume':'bridgeVolume',role:'volume',assignments:assignments(n),pot,position:7,bleed:'none'});
  for(let n=0;n<tones;n++){const name=tones===1?'masterTone':n===0?'neckTone':names.includes('middle')&&volumes===1?'middleTone':'bridgeTone';next.controls.push({id:name,role:'tone',assignments:tones===1?names:[name.startsWith('middle')?'middle':n===0?names[0]:names.includes('bridge')?'bridge':names.at(-1)],pot,position:10,capacitor:cap,capacitorGroup:controlLayout==='1V2T'?'shared-tone':name});}
 }
 return normaliseInstrument(next);
}
