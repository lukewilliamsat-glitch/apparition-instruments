// Contextual education derived from the same components, wires and contact state.
import {endpoint,net,layoutInfo} from './model.mjs';
import {workshopGuide} from './build-guide.mjs';
import {articleURL} from '../knowledge/registry.mjs';
const pickups=c=>c.components.filter(p=>['humbucker','singlecoil','p90'].includes(p.type));
export function selectorContext(c){
 const output=net(c,'jack.tip'),volumes=c.components.filter(p=>p.role==='volume');
 const active=pickups(c).filter(p=>{const hot=net(c,p.id+'.hot');return output.has(p.id+'.hot')||volumes.some(v=>hot.has(v.id+'.lug3')&&output.has(v.id+'.lug2'));}).map(p=>p.label);
 return {position:layoutInfo[c.state.guitar]?.positions[c.state.position]||c.state.position,active,contacts:c.contacts.map(([a,b])=>[a,b])};
}
export function explainSelection(c,kind,id){
 const wire=kind==='wire'?c.connections.find(w=>w.id===id):null;
 const ref=kind==='terminal'?id:wire?.from;
 const part=kind==='component'?c.components.find(p=>p.id===id):ref?endpoint(c,ref).component:null;
 if(!part)return null;
 const guide=workshopGuide(c),connections=guide.connections.filter(w=>kind==='wire'?w.id===id:kind==='terminal'?w.from===ref||w.to===ref:w.from.startsWith(part.id+'.')||w.to.startsWith(part.id+'.'));
 const bleed=c.connections.some(w=>w.network==='auxiliary'&&(w.from.startsWith(part.id+'.')||w.to.startsWith(part.id+'.')))&&['capacitor','resistor','network'].includes(part.type);
 let article='circuits',purpose='This part connects at the destinations listed below. The circuit graph defines the connection; apparent crossings do not.';
 if(bleed){article='bleeds';purpose='This treble bleed is connected between the volume input and wiper. It changes the supported electrical response as volume is reduced. Compare configurations in Signal Lab or Treble Bleed Designer; the drawing does not predict audibility.';}
 else if(part.role==='volume'){article='pots';purpose='The input feeds the resistive track; the wiper provides output and the ground-end lug establishes the return. Rotation changes the track resistances and output. The casing bond is a separate physical connection.';}
 else if(part.role==='tone'){article='caps';purpose='This tone control varies resistance in the capacitor branch towards ground. Lower resistance increasingly shunts higher-frequency signal. Its connected capacitor and value determine the electrical filtering; follow the actual destinations for this wiring style.';}
 else if(part.type==='capacitor'){article='caps';purpose='This tone capacitor is a physical two-lead component in a branch towards ground. Its impedance depends on frequency; changing capacitance changes the electrical filtering. The main signal need not pass through it on the way to output.';}
 else if(['toggle','blade','blade3','blade5','superswitch'].includes(part.type)){article='switches';purpose='The selector joins its common/output contacts to the selected pickup contacts. These internal contacts are operated by the switch; they are not extra wires to solder.';}
 else if(part.type==='jack'||part.type==='ground'){article='ground';purpose=part.type==='jack'?'The tip carries the output signal and the sleeve provides the return. Identify them by continuity on the real jack.':'This is a hardware ground or shield bond. Keep each required conductor: shielding does not replace a pickup return or the bridge/string connection.';}
 else if(pickups(c).includes(part)){article='pickups';purpose='The pickup supplies signal through its hot conductor and return. Any separate shield and series link retain their own assembly roles. Generic conductor labels do not claim a manufacturer colour convention.';}
 let valueNote=part.value?'The displayed '+part.value+' is the value in this configuration; it is not a universal recommendation.':'Terminal functions and connections come from this circuit.';
 let changeNote='Changing this connection changes the circuit. Follow the listed solder destinations; validate any different arrangement separately.';
 if(part.role==='volume')changeNote='Pot value changes pickup loading. Turning the pot changes input-to-wiper and wiper-to-ground resistance. Compare a supported single-pickup segment in Signal Lab.';
 else if(part.role==='tone'||part.type==='capacitor'&&!bleed)changeNote='Capacitance and tone resistance change this filtering branch. Compare supported values in Signal Lab; the drawing alone does not predict perceived tone.';
 else if(bleed)changeNote='Capacitor and resistor values change the reduced-volume electrical response. Use Treble Bleed Designer for a supported comparison.';
 else if(['toggle','blade','blade3','blade5','superswitch'].includes(part.type)){valueNote='The current selector state and its closed contacts are listed here. Actual switch terminal orientation varies.';changeNote='Changing selector position changes the authoritative closed contacts. It does not change the soldered wires.';}
 else if(pickups(c).includes(part)){valueNote='Conductor functions reflect the selected profile. Generic pickup assumptions are illustrative, not measured manufacturer data.';changeNote='Changing a supported pickup assumption changes the modelled electrical response. This drawing does not establish acoustic output or audibility.';}
 else if(part.type==='jack'||part.type==='ground'){valueNote='Signal, return and shield are distinct physical functions even where bonded to a common ground.';changeNote='Keep the required signal and return destinations. A shield is not a substitute for a pickup return.';}
 const context=selectorContext(c);
 return {title:kind==='terminal'?part.label+' / '+endpoint(c,ref).terminal.label:kind==='wire'?'Connection · '+connections[0]?.fromLabel+' → '+connections[0]?.toLabel:part.label,value:part.value,purpose,valueNote,changeNote,connections,selector:context,contacts:c.contacts.filter(pair=>pair.some(r=>r.startsWith(part.id+'.'))),link:articleURL(article)};
}

// Shared disclosure hierarchy; every connection and selector fact is supplied by the graph.
export function appendExplanation(root,info,{includeRole=true,headingTag='h5'}={}){
 const doc=root.ownerDocument,e=(tag,text)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 const section=(title,text)=>{const node=e('section');node.className='explanation-section';node.append(e(headingTag,title));if(text)node.append(e('p',text));root.append(node);return node;};
 if(includeRole)section('Role in this circuit',info.purpose);
 section('Current selector','Selector '+info.selector.position+' · '+(info.selector.active.join(' + ')||'No connected pickup path'));
 const connections=section('Connected destinations'),list=e('ul');for(const row of info.connections)list.append(e('li',row.fromLabel+' → '+row.toLabel));connections.append(list);
 if(info.contacts.length){const details=e('details');details.append(e('summary','Closed switch contacts'));for(const pair of info.contacts)details.append(e('p',pair.join(' ↔ ')));connections.append(details);}
 section('Value & changes',info.valueNote+' '+info.changeNote);
 const link=e('a','Learn more in the Luthier Hub →');link.href=info.link;link.className='contextual-help';root.append(link);
}
