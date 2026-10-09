import {composeWorkbench} from '../wiring-generator/composition.mjs';
import {compactWorkbench} from '../electronics/ui/workbench-console.mjs';
import {appendWorkbenchOverview} from '../electronics/ui/workbench-overview.mjs';
import {switchContactMap} from '../wiring-generator/components.mjs';
import {mountStateConsole} from '../electronics/ui/state-console.mjs';
import {explainSelection,appendExplanation} from '../wiring-generator/explanation.mjs';
import {normalisePresentation,buildKey} from '../wiring-generator/presentation.mjs';
import {createReference,generatorConfiguration,instrumentCapabilities,instrumentFromLegacy,references,normaliseInstrument,selectorSelections} from '../electronics/instrument/configuration.mjs';
import {makeInstrumentCircuit,instrumentFromCircuit} from '../electronics/instrument/circuit.mjs';
import {mountInstrumentPanel} from './instrument-panel.mjs';
import {projectKitHandoff} from '../knowledge/kit-project.mjs';
import {readProject,projectFromCircuit,projectURL} from '../electronics/state/project.mjs';
import {mountProjectPanel} from '../knowledge/project-panel.mjs';
import {mountForgeShell} from './application-shell.mjs';
import {mountProfessionalBridge} from '../forge-pro/editor-bridge.mjs';
import {learningLink,mountKnowledgeCards} from '../knowledge/context.mjs';
import {readCircuitState,captureCircuitState,circuitStateURL,circuitStateSummary,wiringHandoff,designerHandoff,kitHandoff} from '../electronics/state/circuit-state.mjs';
import {setupMobileWorkbench} from './mobile-workbench.mjs';
import {forgeCircuit,defaultControls} from './model.mjs';
import {createCircuitHistory} from './history.mjs';
import {mountPartsList} from './parts.mjs';
import {createPublicComponentRepository} from '../backend/component-data.mjs';
import {pickupPresets,componentPresets,defaultResponseAssumptions} from '../electronics/response/assumptions.mjs';
import {forgeResponse,responseComponent} from './response.mjs';
import {createResponseGraph} from './response-view.mjs';
import {composeResponse,captureResponse,referenceDescription,frequencyFromFraction,fractionFromFrequency} from '../electronics/response/analysis.mjs';
import {forgeDiagram,visualCrossings} from './presentation.mjs';
import {endpoint} from '../wiring-generator/model.mjs';
import {selectorReport,changeReport,inspectSelection,selectionHighlight,terminalName} from './workbench.mjs';
import {pickupConventions} from '../wiring-generator/colours.mjs';

const $=query=>document.querySelector(query),form=$('#forge-controls'),mount=$('#forge-diagram'),viewport=$('#forge-viewport');
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const stateRoot=el('section');stateRoot.id='forge-circuit-state';$('.forge-workspace-modes').before(stateRoot);
const stateConsole=mountStateConsole(stateRoot,{onSelector:value=>form.querySelector('input[name="position"][value="'+value+'"]').click(),onSwitch:(id,value)=>{instrument=instrumentFromCircuit(circuit);instrument.switching.find(m=>m.id===id).position=value;render();}});
compactWorkbench(document,'forge');
// Legacy form controls retain analysis integrations but are not a second visible console.
for(const node of [...form.children])if(node.id!=='forge-instrument-root'&&node.tagName!=='BUTTON'){node.hidden=true;node.dataset.consoleLegacy='true';}

let shell;let circuit,selection=null,roleView='all',mobile,presentationMode=normalisePresentation(new URLSearchParams(location.search).get('view')||'trace');
let comparisonMode='ab',frozenReference=null,signalReport=null,previousSignal=null,graphView=null,inspectionFrequency=1000,lastCause='',assumptionIdentity='';
const setText=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
const projectImport=readProject(window.location.search);let projectContext=projectImport.project;
const initialMode=new URLSearchParams(window.location.search).get('mode');
const importedCircuit=new URLSearchParams(window.location.search).has('ap')?{state:projectContext?.electronics||null,notice:projectImport.notice}:readCircuitState(window.location.search);
let instrument=importedCircuit.state?.instrument||(importedCircuit.state?.configuration?.switching?instrumentFromLegacy(importedCircuit.state):null),instrumentPanel;
const circuitHistory=createCircuitHistory();let replayingHistory=false,partsList=null;
const workflow=el('section');workflow.id='forge-workflow';workflow.setAttribute('aria-label','Getting started and editing history');
workflow.append(el('h2','Understand your circuit'),el('p','Choose a guitar reference in Guitar & Pickups, then configure its controls and selector. Circuit Lab shows connections; Signal Lab compares the supported electrical response. These are modelled references, not a physical fitment check.'));
const steps=el('ol');for(const text of ['Choose and configure a supported reference.','Inspect components, connections and capability messages.','Compare a supported response, then save locally or share the circuit.','Continue to wiring, a parts list or a compatible kit when available.'])steps.append(el('li',text));workflow.append(steps);
const modelGuide=el('a','How to read this circuit model');modelGuide.href='../luthier-hub/reading-a-circuit-model/';workflow.append(modelGuide);
const historyActions=el('div');historyActions.className='project-actions';
const undo=el('button','Undo circuit change'),redo=el('button','Redo circuit change');undo.id='forge-undo';redo.id='forge-redo';undo.type=redo.type='button';
const historyStatus=el('p');historyStatus.setAttribute('role','status');
function refreshHistory(){undo.disabled=!circuitHistory.canUndo;redo.disabled=!circuitHistory.canRedo;}
function restoreHistory(direction){const state=circuitHistory[direction]();if(!state)return;replayingHistory=true;try{instrument=state.instrument||instrumentFromLegacy(state);selection=null;configureInstrument();if(!render())throw Error('The previous circuit could not be restored.');historyStatus.textContent=direction==='undo'?'Previous circuit restored.':'Circuit change restored.';}finally{replayingHistory=false;refreshHistory();}}
undo.addEventListener('click',()=>restoreHistory('undo'));redo.addEventListener('click',()=>restoreHistory('redo'));historyActions.append(undo,redo);workflow.append(historyActions,historyStatus);stateRoot.before(workflow);refreshHistory();
const selectedChannel=()=>signalReport?.supported?signalReport.channel:circuit?.state.position;
const withProject=url=>projectContext?projectURL(url,projectContext):url;
const frequencyLabel=f=>f>=1000?(f/1000).toFixed(2)+' kHz':f.toFixed(0)+' Hz';
function inspectionReadout(sample){
 inspectionFrequency=sample.frequency;const frequency=frequencyLabel(sample.frequency),format=db=>db<=-100?'≤ −100 dB':db.toFixed(2)+' dB';
 setText($('#forge-inspect-frequency-value'),frequency);const input=$('#forge-inspect-frequency');input.value=Math.round(fractionFromFrequency(sample.frequency)*1000);input.setAttribute('aria-valuetext',frequency);
 setText($('#forge-inspection-readout'),frequency+' · Current '+format(sample.current)+(sample.reference===null?'':' · Reference '+format(sample.reference)+' · Δ '+(sample.clipped?'clipped':(sample.delta>=0?'+':'')+sample.delta.toFixed(2)+' dB')));
}
function setWorkspaceMode(mode,fromShell=false){
 if(shell&&!fromShell){shell.selectView(mode==='signal'?'signal':'circuit');return;}
 const physical=mode==='physical';
 mobile?.modeChanged(mode);
 $('#forge-mode-physical').hidden=!physical;$('#forge-response-lab').hidden=physical;
 $('#forge-diagram-title').textContent=physical?'Circuit Lab':'Signal Lab';
 for(const button of document.querySelectorAll('[data-forge-mode]'))button.setAttribute('aria-pressed',String(button.dataset.forgeMode===mode));
}
const choose=(kind,value)=>{selection=kind==='component'?{kind,id:value}:kind==='wire'?{kind,id:value}:{kind:'terminal',ref:value};updateSelection();shell?.showInspection(selection,{open:!mobile?.isMobile});mobile?.selectionChanged(selection);};
let paintedCircuit=null,paintedMode=null;
function paint(){
 if(presentationMode==='build'&&paintedMode==='build'&&paintedCircuit===circuit)return;
 const active=document.activeElement,attribute=['data-terminal','data-wire','data-component'].find(name=>active?.hasAttribute?.(name)),value=attribute&&active.getAttribute(attribute),left=viewport.scrollLeft,top=viewport.scrollTop;
 if(circuit.state.guitar==='instrument'){mount.replaceChildren(el('p',instrumentCapabilities(instrument).reason));return;}
 mount.innerHTML=forgeDiagram(circuit,{selection:selectionHighlight(circuit,selection),filter:roleView,mode:presentationMode});paintedCircuit=circuit;paintedMode=presentationMode;mobile?.diagramChanged();viewport.scrollLeft=left;viewport.scrollTop=top;
 if(value)mount.querySelector(`[${attribute}="${value}"]`)?.focus({preventScroll:true});
}
function updateSelection(){
 const info=circuit.state.guitar==='instrument'?null:inspectSelection(circuit,selection),box=$('#forge-inspection');box.replaceChildren();
 mobile?.selectionLabel(info);
 if(!info){selection=null;appendWorkbenchOverview(box,circuit);}
 else if(presentationMode==='explain'){
  const id=selection.id||selection.ref,context=explainSelection(circuit,selection.kind==='terminal'?'terminal':selection.kind,id);
  if(selection.ref)box.append(el('code',selection.ref));box.append(el('h4',context.title),el('p',context.value));appendExplanation(box,context);
 }else {
  box.append(el('h4',info.heading),el('p',info.subtitle));if(selection.ref)box.append(el('code',selection.ref));
  if(info.kind==='component'){
   box.append(el('h5','What it does now'),el('p',info.purpose));
   if(info.physicalWiring?.length){const heading=el('h5','Physical wiring'),list=el('dl');list.className='forge-wiring-list';for(const lead of info.physicalWiring){const row=el('div'),name=el('dt',lead.colour),detail=el('dd');detail.append(el('strong',lead.role),el('span','→ '+lead.destination),el('small',lead.termination));row.append(name,detail);list.append(row);}box.append(heading,list);}
   const terminals=el('details'),summary=el('summary','Inspect terminals'),list=el('ul');for(const t of info.terminals){const item=el('li'),button=el('button',t.label);button.type='button';button.addEventListener('click',()=>choose('terminal',t.ref));item.append(button,document.createTextNode(' · '+(t.connections.length?t.connections.join(' · '):'No external wire')));list.append(item);}terminals.append(summary,list);box.append(terminals);
  }else if(info.kind==='wire'){
   if(info.physicalData){box.append(el('p',info.physical));const list=el('dl');list.className='forge-inspection-facts';for(const [label,value] of [['Purpose',info.physicalData.role],['Destination',info.physicalData.destination],['Termination',info.physicalData.termination],['Electrical path',info.physicalData.path]]){const term=el('dt',label),definition=el('dd',value);list.append(term,definition);}box.append(list);}
   box.append(el('p',info.summary));
   const trace=el('button','Trace complete electrical net');trace.type='button';trace.addEventListener('click',()=>choose('terminal',info.ref));box.append(trace);
  }else{
   if(info.physical)box.append(el('p',info.physical));
   box.append(el('p',info.summary),el('p','Identify this terminal by continuity on the actual part. Solder only the listed physical conductors; internal switch contacts are not additional wires.'));
   const label=el('h5','Connections on this segment'),list=el('ul');for(const wire of info.connections){const item=el('li'),button=el('button',wire.description);button.type='button';button.addEventListener('click',()=>choose('wire',wire.id));item.append(button);list.append(item);}box.append(label,list);
   if(info.contacts.length){box.append(el('h5','Closed switch contacts'));const contacts=el('ul');for(const text of info.contacts)contacts.append(el('li',text));box.append(contacts);}
   const terminals=el('details'),summary=el('summary','Terminal references ('+info.references.length+')'),refs=el('ul');for(const ref of info.references)refs.append(el('li',terminalName(circuit,ref)));terminals.append(summary,refs);box.append(terminals);
  }
 }
 if(selection?.kind==='component'&&presentationMode!=='build'){const map=switchContactMap(circuit,selection.id);if(map){const visual=el('div');visual.innerHTML=map;box.append(visual);}}
 for(const button of document.querySelectorAll('#forge-parts button'))button.setAttribute('aria-pressed',String(selection?.kind==='component'&&button.dataset.part===selection.id));
 for(const button of document.querySelectorAll('[data-trace]'))button.setAttribute('aria-pressed',String(selection?.kind==='terminal'&&button.dataset.trace===selection.ref));
 paint();
 updateLabSelection();
}
function updateLabSelection(){
 const target=selection?.kind==='component'?selection.id:selection?.kind==='wire'?circuit.connections.find(w=>w.id===selection.id)?.from.split('.')[0]:selection?.ref?.split('.')[0];
 const element=target&&responseComponent(circuit,target),box=$('#forge-response-selection');
 box.textContent=element?`${element.label} is a ${element.role==='bleed'?'treble bleed element':element.role+' control'} in the ${element.channel} circuit.${element.channel===circuit.state.position?' It affects the displayed response.':' Select that pickup alone to analyse it.'}`:selection?'This selection has no direct role in the supported response model.':'';
}
function renderLab(){
 const raw=forgeResponse(circuit),report=composeResponse(raw,{mode:comparisonMode,frozen:frozenReference,previous:previousSignal}),context=$('#forge-response-context'),graph=$('#forge-response-graph'),controls=$('#forge-response-controls'),key=$('#forge-response-key'),assumptions=$('#forge-response-assumptions'),actions=$('#forge-response-actions');
 signalReport=report;
 for(const button of document.querySelectorAll('[data-lab-pickup]'))button.setAttribute('aria-pressed',String(button.dataset.labPickup===circuit.state.position));
 for(const button of document.querySelectorAll('[data-response-mode]'))button.setAttribute('aria-pressed',String(button.dataset.responseMode===comparisonMode));
 $('#forge-frozen-actions').hidden=comparisonMode!=='frozen';$('#forge-freeze').disabled=!report.supported;$('#forge-freeze').textContent=frozenReference?'Replace frozen reference':'Freeze current response';$('#forge-freeze-clear').disabled=!frozenReference;
 setText($('#forge-frozen-description'),frozenReference?'Saved for this session · '+referenceDescription(frozenReference):'');
 setText($('#forge-comparison-note'),comparisonMode==='live'?'Only the current response is shown.':comparisonMode==='ab'?'Current circuit versus no treble bleed, with the same pickup, Volume, Tone and loading.':'Freeze a complete response, then change controls or components. The reference stays fixed, including across pickup changes.');
 controls.hidden=!report.supported;key.hidden=!report.supported;$('#forge-response-inspect').hidden=!report.supported;$('#forge-response-components').hidden=!report.supported;
 $('#forge-response-lab').classList.toggle('is-unsupported',!report.supported);
 actions.hidden=report.supported||circuit.state.wiring!=='modern'||circuit.state.position!=='both';
 assumptions.closest('details').hidden=!report.supported;
 $('#forge-response-lab .forge-response-explanation').textContent=report.supported?'What changes?':'Response unavailable for this circuit state';
 if(!report.supported){setText($('#forge-response-magnitude'),'');setText($('#forge-frozen-differences'),'');graph.replaceChildren();graphView=null;context.textContent=circuit.state.wiring==='modern'?'MODEL LIMIT · SELECTOR':'MODEL LIMIT · WIRING';setText($('#forge-response-summary'),report.reason);for(const id of ['forge-response-cause','forge-response-why','forge-response-limits'])setText($('#'+id),'');return;}
 setText(context,`${report.channel.toUpperCase()} PICKUP · Modern wiring · ${report.bleed} · ${report.state.toneCap/1000} µF tone capacitor`);
 for(const [name,keyName] of [['volume','volume'],['tone','tonePosition']]){const input=$('#forge-response-'+name),value=report.state[keyName];input.value=value;setText($('#forge-response-'+name+'-value'),value.toFixed(1)+' / 10');}
 $('#forge-lab-bleed').value=form.elements.bleed.value;$('#forge-lab-cap').value=form.elements.namedItem(instrument&&instrument.reference!=='les-paul'?'neckCap':report.channel+'Cap').value;
 key.querySelector('.forge-response-reference').hidden=!report.reference;setText(key.querySelector('.forge-response-current'),report.legend.current);setText(key.querySelector('.forge-response-reference'),report.legend.reference);
 if(!graphView||graphView.compact!==!!mobile?.isMobile){const retainedFrequency=inspectionFrequency;graphView=createResponseGraph(report,{compact:!!mobile?.isMobile,onInspect:inspectionReadout});graph.replaceChildren(graphView.svg);graphView.inspect(retainedFrequency,false);}else graphView.update(report);
 setText($('#forge-response-magnitude'),report.explanation.magnitude?report.explanation.magnitude+' electrical difference':'');
 setText($('#forge-frozen-differences'),comparisonMode==='frozen'&&frozenReference?(report.comparedChanges.length?'Changed from frozen: '+report.comparedChanges.map(c=>c.label.replace(' changed','')).join(' · '):'Current values match the frozen electrical state.'):'');
 for(const key of Object.keys(componentPresets))$('#forge-lab-'+key).value=String(report.state[key]);$('#forge-lab-pickup').value=circuit.state.responseAssumptions.channels[report.channel].pickup;for(const option of $('#forge-lab-pickup').options)option.disabled=!!instrument&&(instrument.pickups.find(p=>p.position===report.channel)?.type==='single'?option.value!=='single':option.value==='single');
 setText($('#forge-response-summary'),report.explanation.what);setText($('#forge-response-why'),report.explanation.why);setText($('#forge-response-limits'),report.explanation.caveat);
 if(report.changes.length)lastCause='Latest adjustment: '+report.changes.map(change=>change.label).join(' · ');
 setText($('#forge-response-cause'),lastCause);
 const difference=report.difference;setText($('#forge-difference-marker'),difference&&!difference.clipped&&Math.abs(difference.delta)>=.1?'◇ Largest sampled difference · '+frequencyLabel(difference.frequency)+' · '+(difference.delta>=0?'+':'')+difference.delta.toFixed(2)+' dB':'');
 const identity=JSON.stringify(report.assumptions);if(identity!==assumptionIdentity){assumptions.replaceChildren();for(const line of report.assumptions)assumptions.append(el('li',line));assumptions.append(el('li','Magnitude categories use the largest absolute sampled separation: negligible < 0.1 dB; subtle 0.1–<1 dB; moderate 1–<6 dB; strong ≥6 dB. They describe electrical differences, not audibility.'));assumptionIdentity=identity;}
 previousSignal={channel:report.channel,state:{...report.state}};
}
function updateContextActions(){
 if(!replayingHistory)circuitHistory.record(captureCircuitState(circuit));refreshHistory();
 partsList?.update();shell?.update();
 if(instrument||projectContext)projectContext=projectFromCircuit(circuit,projectContext||{});
 setText($('#forge-shared-summary'),circuitStateSummary(circuit,signalReport));
 const wiring=wiringHandoff(circuit);$('#forge-view-wiring').hidden=!wiring;if(wiring){$('#forge-view-wiring').href=withProject(wiring);const guided=new URL(withProject(wiring),location.origin);guided.searchParams.set('build','guided');$('#forge-guided-build').href=guided.pathname+guided.search;}$('#forge-guided-build').hidden=!wiring;
 const designer=designerHandoff(circuit,signalReport),kit=projectKitHandoff(circuit,projectContext);
 const capability=instrumentCapabilities(instrument||instrumentFromLegacy(captureCircuitState(circuit)));
 setText($('#forge-status'),'Model support · Wiring: '+(capability.canGenerateWiring?'supported':'unavailable')+' · Response: '+(signalReport?.supported?'supported':'unavailable')+' · Kit: '+(kit.url?'available':'unavailable')+'. '+[capability.wiringReason||capability.reason,!signalReport?.supported?signalReport?.reason:null].filter(Boolean).join(' '));
 $('#forge-design-bleed').hidden=!designer.url;if(designer.url)$('#forge-design-bleed').href=withProject(designer.url);
 setText($('#forge-designer-limit'),designer.reason);$('#forge-kit').hidden=!kit.url;if(kit.url)$('#forge-kit').href=withProject(kit.url);setText($('#forge-kit-limit'),kit.reason);
 const url=withProject(circuitStateURL('/circuit-forge/',captureCircuitState(circuit)));window.history.replaceState(null,'',url);
}

let inventoryKey='';
function updateInventory(){
 const nextKey=JSON.stringify(circuit.components.map(p=>[p.id,p.label,p.value,p.type]));
 const list=$('#forge-parts');if(nextKey!==inventoryKey){list.replaceChildren();
 for(const part of circuit.components){const item=el('li'),button=el('button');button.type='button';button.dataset.part=part.id;button.append(el('strong',part.label),el('small',part.value||part.type));button.addEventListener('click',()=>choose('component',part.id));item.append(button);list.append(item);}
 inventoryKey=nextKey;}
 $('#forge-count').textContent=`(${circuit.components.length})`;
 $('#forge-facts').textContent=`${circuit.components.length} components · ${circuit.connections.length} external connections · ${visualCrossings(composeWorkbench(circuit)).length} separated crossings`;
}
function updateSelector(){
 if(circuit.state.guitar==='instrument'){$('#forge-selector').textContent='Selector described; contact diagram is not yet available.';$('#forge-contacts').replaceChildren();return;}
 const report=selectorReport(circuit),box=$('#forge-contacts');$('#forge-selector').textContent=report.description;box.replaceChildren();
 for(const channel of report.channels){const item=el('div'),button=el('button',channel.label+' volume output');button.type='button';button.addEventListener('click',()=>choose('terminal',channel.ref));item.append(el('strong',channel.active?'Connected to jack':'Not connected to jack'),button);box.append(item);}
 const closed=el('p','Closed contacts: '+(report.closed.map(x=>x.description).join('; ')||'none')+'. Unselected switch contacts remain open.');box.append(closed);
}
function updateChanges(previous){if(circuit.state.guitar==='instrument'||previous?.state.guitar==='instrument'){$('#forge-change').textContent='Instrument configuration updated. Unsupported arrangements are retained as descriptions.';return;}const report=changeReport(previous,circuit),box=$('#forge-change');box.replaceChildren(el('h4',report.heading));const list=el('ul');for(const line of report.lines)list.append(el('li',line));box.append(list);}
function render(resetControls=false){
 try{
  const choices=Object.fromEntries(['wiring','bleed','neckCap','bridgeCap','position','neckProfile','bridgeProfile'].map(key=>[key,form.elements.namedItem(key).value]));
  const previous=circuit,result=instrument?{circuit:makeInstrumentCircuit(instrument),kitURL:null}:forgeCircuit(choices,resetControls?defaultControls:circuit?.state.controlPositions||importedCircuit.state?.controlPositions||defaultControls,resetControls?defaultResponseAssumptions():circuit?.state.responseAssumptions||importedCircuit.state?.responseAssumptions||defaultResponseAssumptions(),resetControls?'yes':circuit?.state.shielding||importedCircuit.state?.configuration.shielding||'yes');circuit=result.circuit;
  $('#forge-workbench-identity').textContent=instrument?[instrument.layout,instrument.controlLayout,instrument.selector.family.replace('-way-','-WAY ').toUpperCase(),instrument.wiring.toUpperCase()].join(' · '):circuit.state.guitar.toUpperCase()+' · '+circuit.state.wiring.toUpperCase();
  if(circuit.state.guitar==='instrument')selection=null;
  if(selection&&!inspectSelection(circuit,selection))selection=null;
  form.elements.bleed.disabled=false;$('#forge-kit').href=result.kitURL;$('#forge-kit').hidden=!result.kitURL;
  $('#forge-loading-help').hidden=true;
  $('#forge-status').textContent=`${choices.wiring==='50s'?'50s':choices.wiring==='60s'?'60s':'Modern'} wiring · ${choices.position} selector`;
  stateConsole.update(circuit);
  updateInventory();updateSelector();updateChanges(previous);updateSelection();renderLab();updateContextActions();instrumentPanel?.refresh();
  return true;
 }catch(error){if(circuit)updateContextActions();
  $('#forge-loading-help').hidden=true;
  $('#forge-status').textContent='Unsupported circuit choice: '+error.message;return false;}
}
form.addEventListener('change',event=>{if(!event.target.name)return;if(instrument){instrument=instrumentFromCircuit(circuit);const n=event.target.name,v=event.target.value;if(n==='neckProfile'||n==='bridgeProfile')instrument.pickups.find(p=>p.position===n.replace('Profile','')).conductor=v;if(n==='position')instrument.selector.selection=['les-paul','sg'].includes(generatorConfiguration(instrument)?.guitar)?{bridge:1,both:2,neck:3}[v]:Number(v);if(n==='wiring'){instrument.wiring=v;}if(n==='bleed')for(const c of instrument.controls)if(c.role==='volume')c.bleed=v;if(['neckCap','bridgeCap'].includes(n))for(const c of instrument.controls)if(c.role==='tone'&&(instrument.reference!=='les-paul'||c.assignments.includes(n.replace('Cap',''))))c.capacitor=v;}render();});
for(const channel of ['neck','bridge']){const select=form.elements.namedItem(channel+'Profile');for(const [id,profile] of Object.entries(pickupConventions)){const option=el('option',profile.label);option.value=id;select.append(option);}}
form.addEventListener('reset',()=>setTimeout(()=>{projectContext=null;selection=null;lastCause='';$('#forge-import-note').textContent='';if(instrument){instrument=createReference(instrument.reference||'les-paul');configureInstrument();}render(true);},0));
for(const [id,sourceName] of [['forge-lab-bleed','bleed'],['forge-lab-cap','neckCap']]){
 const select=$('#'+id);for(const option of form.elements.namedItem(sourceName).options)select.append(option.cloneNode(true));
 select.addEventListener('change',()=>{const name=id==='forge-lab-bleed'?'bleed':instrument&&instrument.reference!=='les-paul'?'neckCap':selectedChannel()+'Cap',source=form.elements.namedItem(name);source.value=select.value;source.dispatchEvent(new Event('change',{bubbles:true}));});
}
for(const [key,values] of Object.entries(componentPresets)){
 const select=$('#forge-lab-'+key);for(const value of values){const option=el('option',value+(key==='cableC'?' pF':key==='loadR'?' MΩ':' kΩ'));option.value=String(value);select.append(option);}
 select.addEventListener('change',()=>{const a=circuit.state.responseAssumptions;if(['volumePot','tonePot'].includes(key))a.channels[selectedChannel()][key]=Number(select.value);else a[key]=Number(select.value);if(instrument)instrument=instrumentFromCircuit(circuit);render();});
}
for(const [id,preset] of Object.entries(pickupPresets)){const option=el('option',preset.label+' · '+preset.pickupR+' kΩ / '+preset.pickupL+' H / '+preset.pickupC+' pF');option.value=id;$('#forge-lab-pickup').append(option);}
$('#forge-lab-pickup').addEventListener('change',event=>{circuit.state.responseAssumptions.channels[selectedChannel()].pickup=event.target.value;if(instrument)instrument=instrumentFromCircuit(circuit);render();});
for(const button of document.querySelectorAll('[data-response-mode]'))button.addEventListener('click',()=>{comparisonMode=button.dataset.responseMode;renderLab();});
$('#forge-freeze').addEventListener('click',()=>{if(!signalReport?.supported)return;frozenReference=captureResponse(signalReport);comparisonMode='frozen';renderLab();});
$('#forge-freeze-clear').addEventListener('click',()=>{frozenReference=null;renderLab();});
$('#forge-inspect-frequency').addEventListener('input',event=>{graphView?.inspect(frequencyFromFraction(Number(event.target.value)/1000));});
$('#forge-inspect-clear').addEventListener('click',()=>graphView?.clear());
for(const name of ['volume','tone'])$('#forge-response-'+name).addEventListener('input',event=>{
 const channel=selectedChannel();if(!['neck','bridge'].includes(channel))return;
 circuit.state.controlPositions[channel][name]=Number(event.target.value);if(instrument){instrument=instrumentFromCircuit(circuit);circuit=makeInstrumentCircuit(instrument);}renderLab();updateContextActions();
});
mount.addEventListener('click',event=>{const target=event.target.closest('[data-terminal],[data-wire],[data-component]');if(!target)return;if(target.dataset.terminal)choose('terminal',target.dataset.terminal);else if(target.dataset.wire)choose('wire',target.dataset.wire);else choose('component',target.dataset.component);});
mount.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const target=event.target.closest('[data-terminal],[data-wire],[data-component]');if(target){event.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
$('#forge-clear').addEventListener('click',()=>{selection=null;updateSelection();});
for(const button of document.querySelectorAll('[data-role-view]'))button.addEventListener('click',()=>{
 roleView=button.dataset.roleView;
 for(const option of document.querySelectorAll('[data-role-view]'))option.setAttribute('aria-pressed',String(option===button));
 paint();
});
for(const button of document.querySelectorAll('[data-trace]'))button.addEventListener('click',()=>choose('terminal',button.dataset.trace));
function updatePresentation(){
 $('#forge-mode-physical').dataset.presentation=presentationMode;for(const b of document.querySelectorAll('[data-forge-presentation]'))b.setAttribute('aria-pressed',String(b.dataset.forgePresentation===presentationMode));
 $('#forge-build-key').textContent=buildKey;$('#forge-build-key').hidden=presentationMode!=='build';$('.forge-role-views').hidden=presentationMode!=='trace';$('.forge-path-actions').hidden=presentationMode!=='trace';$('#forge-build-key').closest('.diagram-guidance').hidden=presentationMode!=='build';
}
for(const b of document.querySelectorAll('[data-forge-presentation]'))b.addEventListener('click',()=>{presentationMode=normalisePresentation(b.dataset.forgePresentation);updatePresentation();updateSelection();});
updatePresentation();
for(const button of document.querySelectorAll('[data-forge-mode]'))button.addEventListener('click',()=>setWorkspaceMode(button.dataset.forgeMode));
for(const button of document.querySelectorAll('[data-analyse],[data-lab-pickup]'))button.addEventListener('click',()=>{
 const wanted=button.dataset.analyse||button.dataset.labPickup,value=instrument&&instrument.reference!=='les-paul'?wanted==='neck'?(instrument.selector.family==='5-way-blade'?'5':'3'):wanted==='bridge'?'1':wanted:wanted;form.querySelector(`input[name="position"][value="${value}"]`)?.click();
});

if(importedCircuit.state?.configuration){const c=importedCircuit.state.configuration;for(const key of ['wiring','bleed','neckCap','bridgeCap','position']){const radios=form.querySelectorAll('input[type=radio][name='+key+']');if(radios.length)for(const radio of radios)radio.checked=radio.value===c[key];else form.elements.namedItem(key).value=c[key];}for(const channel of ['neck','bridge'])form.elements.namedItem(channel+'Profile').value=c.pickupProfiles?.[channel]||'generic';}
$('#forge-import-note').textContent=importedCircuit.notice;
instrumentPanel=mountInstrumentPanel($('#forge-instrument-root'),{getKitAvailability:()=>!$('#forge-kit').hidden,getInstrument:()=>instrument||instrumentFromLegacy(captureCircuitState(circuit||forgeCircuit().circuit)),onChange:i=>{instrument=i;configureInstrument();render();},onReference:i=>{instrument=i;selection=null;frozenReference=null;previousSignal=null;comparisonMode='ab';if(projectContext)projectContext={...projectContext,kitReference:undefined,extensions:{...projectContext.extensions,kitSelection:null}};configureInstrument();render();}});
if(instrument)configureInstrument();
if(render())window.__forgeEntry?.ready();else window.__forgeEntry?.fail();

const projectRoot=el('section');projectRoot.className='local-projects';projectRoot.setAttribute('aria-label','Local circuit projects');document.querySelector('.forge-main').append(projectRoot);
mountProjectPanel(projectRoot,{getCircuit:()=>circuit,getProject:()=>projectContext,setProject:p=>{projectContext=p;updateContextActions();},reset:()=>form.reset()});
const professionalBridge=mountProfessionalBridge(projectRoot,{getCircuit:()=>circuit,getProject:()=>projectContext});
const exportHelp=el('p','Local saves stay on this browser. Share links contain circuit settings without project names or notes. Use the Wiring Diagram Generator for its SVG/print exports when wiring is supported; cloud saves are explicit durable revisions in Projects. Free work can still be saved locally without an account.');projectRoot.append(exportHelp);
const partsRoot=el('section');partsRoot.id='forge-logical-parts';projectRoot.after(partsRoot);partsList=mountPartsList(partsRoot,{getCircuit:()=>circuit,repository:createPublicComponentRepository()});partsList.update();
for(const [selector,key,label] of [['#forge-lab-volumePot','pots','Why pot value matters'],['#forge-lab-cap','caps','Understanding tone capacitors'],['#forge-lab-bleed','bleeds','How treble bleeds work'],['#forge-lab-pickup','pickups','Pickup conductors and model assumptions']])$(selector).closest('label').after(learningLink(document,key,label));
$('#forge-contacts').after(learningLink(document,'switches','How selector contacts work'));
const learning=el('details'),learningTitle=el('summary','Learn about these components');learning.append(learningTitle);mountKnowledgeCards(learning,['potentiometers','capacitors','treble-bleeds']);projectRoot.after(learning);
shell=mountForgeShell({doc:document,root:document.querySelector('.forge-main'),onMode:setWorkspaceMode,getCircuit:()=>circuit,getProject:()=>projectContext,bridge:professionalBridge});
mobile=setupMobileWorkbench({mount,viewport,onChoose:choose,panelController:shell,onLayoutChange:()=>{if(circuit)renderLab();}});
if(initialMode==='signal')setWorkspaceMode('signal');

function configureInstrument(){
 const g=generatorConfiguration(instrument),r=references[instrument.reference],formSelector=form.querySelector('input[name="position"]').closest('fieldset'),options=formSelector.querySelector('.forge-segmented-options');formSelector.classList.add('forge-selector-positions');options.replaceChildren();
 const described=selectorSelections(instrument.layout,instrument.selector.family);const positionLabel=names=>names?.length===2&&instrument.layout==='SS'?'Both':names?.map(p=>p[0].toUpperCase()+p.slice(1)).join(' + ');const labels=['les-paul','sg'].includes(g?.guitar)?{neck:'Neck',both:'Both',bridge:'Bridge'}:Object.fromEntries(Array.from({length:instrument.selector.family==='5-way-blade'?5:3},(_,n)=>[String(n+1),positionLabel(described?.[n])||'Position '+(n+1)+' · unmodelled']));
 for(const [value,text] of Object.entries(labels)){const label=el('label'),input=el('input');input.type='radio';input.name='position';input.value=value;input.checked=value===(g?.position||String(instrument.selector.selection));label.append(input,el('span',text));options.append(label);}
 const lab=$('.forge-response-pickup');lab.replaceChildren();for(const [value,text] of Object.entries(labels)){const b=el('button',text);b.type='button';b.dataset.labPickup=value;b.setAttribute('aria-pressed',String(value===(g?.position||String(instrument.selector.selection))));b.addEventListener('click',()=>form.querySelector('input[name="position"][value="'+value+'"]').click());lab.append(b);}
 for(const key of ['wiring','bleed','neckCap','bridgeCap']){const v=g?.[key]||(key==='wiring'?instrument.wiring:key==='bleed'?instrument.controls.find(c=>c.role==='volume').bleed:r?.cap||'0.022');const radios=form.querySelectorAll('input[name="'+key+'"][type="radio"]');if(radios.length)for(const radio of radios)radio.checked=radio.value===v;else form.elements.namedItem(key).value=v;}
 for(const key of ['neckProfile','bridgeProfile'])form.elements.namedItem(key).value=g?.pickupProfiles?.[key.replace('Profile','')]||'generic';
 // Configuration lives exclusively in the Control Console.
 for(const button of document.querySelectorAll('[data-trace]'))button.hidden=!!button.dataset.trace.includes('Pickup')&&!instrument.pickups.some(p=>button.dataset.trace.startsWith(p.position));
}
