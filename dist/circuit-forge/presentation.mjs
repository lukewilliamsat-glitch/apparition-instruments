import {endpoint,net} from '../wiring-generator/model.mjs';
import {routeDiagram} from '../wiring-generator/routing.mjs';
import {drawCircuit} from '../wiring-generator/render.mjs';

const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const signalColours={signal:'#303b43',ground:'#7a8187',tone:'#ad2929',switching:'#926f31'};
export function pathDetails(circuit,reference){
 endpoint(circuit,reference);
 const references=[...net(circuit,reference)].sort(),members=new Set(references);
 const wires=circuit.connections.filter(w=>members.has(w.from)&&members.has(w.to));
 const components=circuit.components.filter(part=>references.some(ref=>ref.startsWith(part.id+'.')));
 const contacts=circuit.contacts.filter(([from,to])=>members.has(from)&&members.has(to));
 return {references,wires,components,contacts};
}
export function circuitChanges(previous,current){
 if(!previous)return [];
 const before=new Map(previous.connections.map(w=>[w.id,w.from+' → '+w.to]));
 const after=new Map(current.connections.map(w=>[w.id,w.from+' → '+w.to]));
 const changes=[];
 for(const [id,path] of after)if(before.get(id)!==path)changes.push({id,from:before.get(id)||null,to:path});
 for(const [id,path] of before)if(!after.has(id))changes.push({id,from:path,to:null});
 return changes;
}
const crossing=(a,b,c,d)=>{
 const horizontal=(p,q,r,s)=>p[1]===q[1]&&r[0]===s[0]&&r[0]>Math.min(p[0],q[0])&&r[0]<Math.max(p[0],q[0])&&p[1]>Math.min(r[1],s[1])&&p[1]<Math.max(r[1],s[1])?[r[0],p[1]]:null;
 return horizontal(a,b,c,d)||horizontal(c,d,a,b);
};
export function visualCrossings(circuit){
 const routes=routeDiagram(circuit),result=new Map();
 for(let i=0;i<circuit.connections.length;i++)for(let j=i+1;j<circuit.connections.length;j++){
  const first=circuit.connections[i],second=circuit.connections[j];
  const a=routes.get(first.id),b=routes.get(second.id);
  for(let x=1;x<a.length;x++)for(let y=1;y<b.length;y++){
   const point=crossing(a[x-1],a[x],b[y-1],b[y]);if(!point)continue;
   if(circuit.components.some(part=>Object.keys(part.terminals).some(key=>{const p=endpoint(circuit,part.id+'.'+key);return Math.abs(p.x-point[0])<13&&Math.abs(p.y-point[1])<13;})))continue;
   const key=point.join(',');if(!result.has(key))result.set(key,{x:point[0],y:point[1],wires:[first.id,second.id],colour:signalColours[first.category]});
  }
 }
 return [...result.values()];
}
export function forgeDiagram(circuit,{selection=null}={}){
 const svg=drawCircuit(circuit,{selection}),crossings=visualCrossings(circuit);
 const hops=crossings.map(({x,y,colour})=>`<g class="forge-crossing" aria-hidden="true"><circle cx="${x}" cy="${y}" r="8" fill="#f5f5f5"/><path d="M${x-9} ${y}Q${x} ${y-13} ${x+9} ${y}" fill="none" stroke="${colour}" stroke-width="3"/></g>`).join('');
 const contacts=circuit.contacts.map(([from,to])=>{const a=endpoint(circuit,from),b=endpoint(circuit,to);return `<path class="forge-closed-contact" d="M${a.x} ${a.y}Q${(a.x+b.x)/2} ${Math.min(a.y,b.y)-28} ${b.x} ${b.y}" fill="none" stroke="#926f31" stroke-width="3" stroke-dasharray="5 4" aria-hidden="true"><title>${esc(from+' ↔ '+to+' closed')}</title></path>`;}).join('');
 return svg.replace('</svg>',`<g pointer-events="none">${hops}${contacts}</g></svg>`);
}
