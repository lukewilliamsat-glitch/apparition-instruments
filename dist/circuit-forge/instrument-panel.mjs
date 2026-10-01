import {references,createReference,normaliseInstrument,instrumentSummary,instrumentCapabilities,instrumentFamilies,instrumentFamily,familyPickupLayouts,configureInstrumentDimensions,switchFamilies} from '../electronics/instrument/configuration.mjs';
import {componentPresets,pickupPresets} from '../electronics/response/assumptions.mjs';
import {allowed} from '../wiring-generator/model.mjs';
import {pickupLayoutArtwork} from '../wiring-generator/components.mjs';
export function mountInstrumentPanel(root,{getInstrument,onChange,onReference}){
 const doc=root.ownerDocument,e=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const description=e('dl');description.id='forge-instrument-summary';description.className='forge-configuration-summary';description.setAttribute('aria-live','polite');
 const primary=e('div');primary.className='forge-configuration-primary';const artwork=e('div');artwork.id='forge-pickup-layout-art';artwork.setAttribute('aria-hidden','true');
 const details=e('details');details.className='forge-instrument';details.id='forge-instrument';details.append(e('summary','Values & my guitar'));const controls=e('div');controls.className='forge-instrument-controls';
 const limits=e('p');limits.id='forge-instrument-limit';limits.setAttribute('role','status');const availability=e('p');availability.id='forge-capability-status';
 const refLabel=e('label','Starting reference'),ref=e('select');ref.id='forge-reference';for(const [id,r] of Object.entries(references)){const o=e('option',r.label);o.value=id;ref.append(o);}refLabel.append(ref);
 const nameLabel=e('label','My guitar · optional local label'),name=e('input');name.id='forge-instrument-label';name.maxLength=80;nameLabel.append(name);
 const reset=e('button','Reset this reference');reset.type='button';reset.id='forge-reference-reset';
 details.append(controls,nameLabel,reset,e('p','Illustrative pickup assumptions. Shared links omit your guitar label and local notes.'));
 root.append(refLabel,primary,artwork,description,availability,limits,details);
 function edit(fn){const i=structuredClone(getInstrument());fn(i);onChange(normaliseInstrument(i));refresh();}
 function select(root,text,values,current,change,id){const label=e('label',text),s=e('select');s.id=id||'forge-setting-'+text.toLowerCase().replace(/[^a-z0-9]+/g,'-');for(const v of values){const o=e('option',typeof v==='object'?v.label:String(v));o.value=typeof v==='object'?v.value:String(v);s.append(o);}s.value=String(current);s.addEventListener('change',()=>change(s.value));label.append(s);root.append(label);return s;}
 function group(title){const section=e('details');section.open=openGroups.has(title);section.className='forge-configuration-group';section.append(e('summary',title));controls.append(section);return section;}
 function dimensions(changes){onChange(configureInstrumentDimensions(getInstrument(),changes));refresh();}
 ref.addEventListener('change',()=>{onReference(createReference(ref.value));refresh();});name.addEventListener('change',()=>edit(i=>{i.label=name.value;}));reset.addEventListener('click',()=>{const i=getInstrument();onReference(createReference(i.reference||'les-paul'));refresh();});
 let openGroups=new Set();
 function refresh(){const focused=doc.activeElement?.id;openGroups=new Set([...controls.querySelectorAll('details[open]')].map(n=>n.querySelector('summary').textContent));const i=getInstrument(),cap=instrumentCapabilities(i),family=instrumentFamily(i);ref.value=i.reference||'';name.value=i.label;primary.replaceChildren();
  select(primary,'Instrument',Object.entries(instrumentFamilies).map(([value,label])=>({value,label})),family,value=>dimensions({family:value}),'forge-family');
  select(primary,'Pickup layout',familyPickupLayouts[family],i.layout,value=>dimensions({layout:value}),'forge-pickup-layout');
  select(primary,'Controls',[...new Set(['1V1T','1V2T','2V2T',i.controlLayout])],i.controlLayout,value=>dimensions({controlLayout:value}),'forge-control-layout');
  select(primary,'Selector',Object.keys(switchFamilies).map(value=>({value,label:value.replaceAll('-',' ')})),i.selector.family,value=>dimensions({selector:value}),'forge-selector-family');
  artwork.innerHTML=pickupLayoutArtwork(i.pickups);description.replaceChildren();for(const [key,value] of [['Instrument',instrumentFamilies[family]],['Pickups',i.layout],['Controls',i.controls.filter(c=>c.role==='volume').length+' Volume / '+i.controls.filter(c=>c.role==='tone').length+' Tone'],['Selector',i.selector.family.replaceAll('-',' ')],['Wiring',i.wiring]]){const row=e('div');row.append(e('dt',key),e('dd',value));description.append(row);}
  description.setAttribute('aria-label',instrumentSummary(i));availability.textContent='Wiring '+(cap.canGenerateWiring?'available':'not modelled')+' · Response '+(cap.canAnalyseResponse?'available':'not modelled')+' · Kit '+(cap.canBuildKit?'available':'unavailable');limits.textContent=cap.reason;limits.hidden=!cap.reason;controls.replaceChildren();
  const pickupGroup=group('Pickup assumptions');for(const p of i.pickups){const values=Object.entries(pickupPresets).filter(([id])=>p.type==='single'?id==='single':id!=='single').map(([value,a])=>({value,label:a.label}));select(pickupGroup,p.position+' pickup model',values,p.assumption,value=>edit(next=>{next.pickups.find(x=>x.position===p.position).assumption=value;}));}
  const controlGroup=group('Pot values & tone capacitors');for(const c of i.controls){select(controlGroup,c.id.replace(/([A-Z])/g,' $1')+' · kΩ',componentPresets[c.role+'Pot'],c.pot,value=>edit(next=>{next.controls.find(x=>x.id===c.id).pot=Number(value);}));if(c.role==='tone'){select(controlGroup,c.id.replace(/([A-Z])/g,' $1')+' capacitor · µF',allowed.neckCap,c.capacitor,value=>edit(next=>{for(const t of next.controls)if(t.capacitorGroup===c.capacitorGroup)t.capacitor=value;}));controlGroup.append(e('small',c.assignments.join(' + ')+(i.controlLayout==='1V2T'?' · shared capacitor':'')));}}
  const options=group('Circuit options');select(options,'Wiring style',allowed.wiring,i.wiring,value=>edit(next=>{next.wiring=value;if(value==='50s')for(const c of next.controls)if(c.role==='volume')c.bleed='none';}));for(const c of i.controls.filter(c=>c.role==='volume'))select(options,c.id.replace(/([A-Z])/g,' $1')+' treble bleed',allowed.bleed,c.bleed,value=>edit(next=>{next.wiring='modern';next.controls.find(x=>x.id===c.id).bleed=value;}));
  const load=group('Cable & input load');for(const key of ['cableC','loadR'])select(load,key==='cableC'?'Cable capacitance · pF':'Input resistance · MΩ',componentPresets[key],i.load[key],value=>edit(next=>{next.load[key]=Number(value);}));
  const target=focused&&doc.getElementById(focused);if(target&&root.contains(target))target.focus({preventScroll:true});
 }
 refresh();return {refresh};
}
