import {references,createReference,normaliseInstrument,instrumentSummary,instrumentExplanation,instrumentCapabilities} from '../electronics/instrument/configuration.mjs';
import {componentPresets,pickupPresets} from '../electronics/response/assumptions.mjs';
import {allowed} from '../wiring-generator/model.mjs';
export function mountInstrumentPanel(root,{getInstrument,onChange,onReference}){
 const doc=root.ownerDocument,e=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const details=e('details');details.className='forge-instrument';details.id='forge-instrument';const summary=e('summary','Instrument / edit configuration'),description=e('p');description.id='forge-instrument-summary';description.setAttribute('aria-live','polite');
 const refLabel=e('label','Starting point'),ref=e('select');ref.id='forge-reference';for(const [id,r] of Object.entries(references)){const o=e('option',r.label);o.value=id;ref.append(o);}refLabel.append(ref);
 const label=e('label','My guitar label · optional, stays local'),name=e('input');name.id='forge-instrument-label';name.maxLength=80;label.append(name);
 const facts=e('p'),explanation=e('p'),limits=e('p');limits.id='forge-instrument-limit';const controls=e('div');controls.className='forge-instrument-controls';const reset=e('button','Reset this reference');reset.type='button';reset.id='forge-reference-reset';
 const note=e('p','Generic, editable starting points. Pickup assumptions are illustrative, not manufacturer measurements. Shared links omit your guitar label and local notes.');
 details.append(summary,refLabel,label,facts,explanation,controls,reset,note);root.append(description,details,limits);
 function edit(fn){const i=structuredClone(getInstrument());fn(i);onChange(normaliseInstrument(i));refresh();}
 function select(text,values,current,change){const label=e('label',text),s=e('select');for(const v of values){const o=e('option',typeof v==='object'?v.label:String(v));o.value=typeof v==='object'?v.value:String(v);s.append(o);}s.value=String(current);s.addEventListener('change',()=>change(s.value));label.append(s);controls.append(label);return s;}
 ref.addEventListener('change',()=>{onReference(createReference(ref.value));refresh();});name.addEventListener('change',()=>edit(i=>{i.label=name.value;}));reset.addEventListener('click',()=>{const i=getInstrument();onReference(createReference(i.reference||'les-paul'));refresh();});
 function refresh(){const i=getInstrument(),r=references[i.reference],cap=instrumentCapabilities(i);ref.value=i.reference||'';name.value=i.label;description.textContent=instrumentSummary(i);facts.textContent=i.layout+' pickups · '+i.controlLayout+' controls · '+i.selector.family.replaceAll('-',' ');explanation.textContent=instrumentExplanation(i)+(i.reference==='strat'||i.reference==='hss'?' · Shared tone capacitor; bridge has no tone control in this reference.':'');limits.textContent=cap.reason;controls.replaceChildren();
  for(const c of i.controls){select(c.id.replace(/([A-Z])/g,' $1')+' pot · kΩ',componentPresets[c.role+'Pot'],c.pot,value=>edit(next=>{next.controls.find(x=>x.id===c.id).pot=Number(value);}));if(c.role==='tone')select(c.id.replace(/([A-Z])/g,' $1')+' capacitor · µF',allowed.neckCap,c.capacitor,value=>edit(next=>{for(const t of next.controls)if(t.capacitorGroup===c.capacitorGroup)t.capacitor=value;}));else select(c.id.replace(/([A-Z])/g,' $1')+' treble bleed',allowed.bleed,c.bleed,value=>edit(next=>{next.wiring='modern';next.controls.find(x=>x.id===c.id).bleed=value;}));}
  for(const p of i.pickups){const values=Object.entries(pickupPresets).filter(([id])=>p.type==='single'?id==='single':id!=='single').map(([value,a])=>({value,label:a.label}));select(p.position+' pickup assumption',values,p.assumption,value=>edit(next=>{next.pickups.find(x=>x.position===p.position).assumption=value;}));}
  for(const key of ['cableC','loadR'])select(key==='cableC'?'Cable capacitance · pF':'Input resistance · MΩ',componentPresets[key],i.load[key],value=>edit(next=>{next.load[key]=Number(value);}));
 }
 refresh();return {refresh};
}
