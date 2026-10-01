import {endpoint} from '../wiring-generator/model.mjs';
import {drawCircuit} from '../wiring-generator/render.mjs';
export {visualCrossings} from '../wiring-generator/diagram-semantics.mjs';

const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
export {pathDetails,circuitChanges} from '../wiring-generator/inspection.mjs';
export function forgeDiagram(circuit,{selection=null,filter='all'}={}){
 const svg=drawCircuit(circuit,{selection,filter});
 const contacts=circuit.contacts.filter(([from])=>!['blade','blade3','blade5','superswitch'].includes(endpoint(circuit,from).component.type)).map(([from,to])=>{const a=endpoint(circuit,from),b=endpoint(circuit,to);return `<path class="forge-closed-contact" data-route-role="switch" d="M${a.x} ${a.y}Q${(a.x+b.x)/2} ${Math.min(a.y,b.y)-28} ${b.x} ${b.y}" fill="none" stroke="#926f31" stroke-width="3" stroke-dasharray="5 4" aria-hidden="true"><title>${esc(from+' ↔ '+to+' closed')}</title></path>`;}).join('');
 return svg.replace('</svg>',`<g pointer-events="none">${contacts}</g></svg>`);
}
