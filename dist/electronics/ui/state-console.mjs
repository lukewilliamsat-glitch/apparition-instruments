import {layoutInfo} from '../../wiring-generator/model.mjs';
// Controls describe graph state. Callers own mutation and reconstruct the same circuit.
export function mountStateConsole(root,{onSelector,onSwitch}){
 const doc=root.ownerDocument,e=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 root.classList.add('circuit-state-console');root.setAttribute('aria-label','Circuit State');root.append(e('h3','Circuit State'));const controls=e('div');controls.className='circuit-state-controls';root.append(controls);
 let shape='';
 controls.addEventListener('click',event=>{const button=event.target.closest('button[data-state-value]');if(!button||!controls.contains(button)||button.getAttribute('aria-pressed')==='true')return;const id=button.closest('fieldset').dataset.stateDevice;if(id==='selector')onSelector(button.dataset.stateValue);else onSwitch(id,button.dataset.stateValue);});
 function group(label,values,id){const field=e('fieldset'),legend=e('legend',label);field.dataset.stateDevice=id;field.append(legend);for(const [value,text] of values){const b=e('button',text);b.type='button';b.dataset.stateValue=value;b.dataset.stateShort=id==='selector'?(Number.isFinite(Number(value))?value:{bridge:'B',both:'B + N',neck:'N'}[value]||text):text;b.setAttribute('aria-label',text);b.id='state-'+id+'-'+value;field.append(b);}controls.append(field);}
 function update(circuit){const state=circuit.state,positions=layoutInfo[state.guitar]?.positions,groups=[];
 if(positions){const entries=Object.entries(positions).map(([value,label])=>[value,state.guitar==='hss'?label.replace('Full bridge humbucker','Bridge'):label]);if(['les-paul','sg'].includes(state.guitar))entries.sort((a,b)=>['bridge','both','neck'].indexOf(a[0])-['bridge','both','neck'].indexOf(b[0]));groups.push([entries.length===5?'5-way selector':'3-way selector',entries,'selector']);}
 for(const m of state.switching||[]){const host=m.host.replace(/([A-Z])/g,' $1');groups.push([host+' · '+m.pickup+' split',[['down','DOWN · FULL'],['up','UP · SPLIT']],m.id]);}
 const next=JSON.stringify(groups);if(next!==shape){const focus=doc.activeElement?.id;controls.replaceChildren();for(const args of groups)group(...args);shape=next;if(focus)doc.getElementById(focus)?.focus({preventScroll:true});}
 for(const field of controls.children){const current=field.dataset.stateDevice==='selector'?state.position:state.switching.find(m=>m.id===field.dataset.stateDevice).position;for(const b of field.querySelectorAll('button'))b.setAttribute('aria-pressed',String(current===b.dataset.stateValue));}
 }
 return {update};
}
