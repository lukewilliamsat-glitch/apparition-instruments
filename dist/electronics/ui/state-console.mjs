import {layoutInfo} from '../../wiring-generator/model.mjs';
// Controls describe graph state. Callers own mutation and reconstruct the same circuit.
export function mountStateConsole(root,{onSelector,onSwitch}){
 const doc=root.ownerDocument,e=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 root.classList.add('circuit-state-console');root.setAttribute('aria-label','Circuit State');root.append(e('h3','Circuit State'));const controls=e('div');controls.className='circuit-state-controls';root.append(controls);
 function group(label,values,current,change,id){const field=e('fieldset'),legend=e('legend',label);field.dataset.stateDevice=id;field.append(legend);for(const [value,text] of values){const b=e('button',text);b.type='button';b.dataset.stateValue=value;b.id='state-'+id+'-'+value;b.setAttribute('aria-pressed',String(current===value));b.addEventListener('click',()=>change(value));field.append(b);}controls.append(field);}
 function update(circuit){const focus=doc.activeElement?.id;controls.replaceChildren();const state=circuit.state,positions=layoutInfo[state.guitar]?.positions;if(positions){const entries=Object.entries(positions).map(([value,label])=>[value,state.guitar==='hss'?label.replace('Full bridge humbucker','Bridge'):label]);if(['les-paul','sg'].includes(state.guitar))entries.sort((a,b)=>['bridge','both','neck'].indexOf(a[0])-['bridge','both','neck'].indexOf(b[0]));group(entries.length===5?'5-way selector':'3-way selector',entries,state.position,onSelector,'selector');}
 for(const m of state.switching||[]){const host=m.host.replace(/([A-Z])/g,' $1');group(host+' · '+m.pickup+' split',[['down','DOWN · FULL'],['up','UP · SPLIT']],m.position,value=>onSwitch(m.id,value),m.id);}
 if(focus)doc.getElementById(focus)?.focus({preventScroll:true});
 }
 return {update};
}
