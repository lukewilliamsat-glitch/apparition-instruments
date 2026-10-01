// Presentation markers derive from the terminal graph and routed geometry.
// Geometry may identify a crossing, but never an electrical junction.
import {endpoint} from './model.mjs';
import {routeDiagram,routeSemantics} from './routing.mjs';

const categoryColours={signal:'#303b43',ground:'#7a8187',tone:'#ad2929',switching:'#926f31'};
export function trueJunctions(circuit){
 const incident=new Map();
 for(const wire of circuit.connections)for(const ref of [wire.from,wire.to]){
  if(!incident.has(ref))incident.set(ref,[]);
  incident.get(ref).push(wire.id);
 }
 return [...incident].filter(([,wires])=>wires.length>=3).map(([ref,wires])=>{
  const p=endpoint(circuit,ref);
  return {ref,x:p.x,y:p.y,wires};
 });
}

const intersection=(a,b,c,d)=>{
 const horizontal=(p,q,r,s)=>p[1]===q[1]&&r[0]===s[0]&&
  r[0]>Math.min(p[0],q[0])&&r[0]<Math.max(p[0],q[0])&&
  p[1]>Math.min(r[1],s[1])&&p[1]<Math.max(r[1],s[1])?[r[0],p[1]]:null;
 return horizontal(a,b,c,d)||horizontal(c,d,a,b);
};
export function visualCrossings(circuit,{mode='trace'}={}){
 const routes=routeDiagram(circuit,{mode}),semantics=routeSemantics(circuit,{contacts:mode!=='build'}),result=new Map();
 for(let i=0;i<circuit.connections.length;i++)for(let j=i+1;j<circuit.connections.length;j++){
  const first=circuit.connections[i],second=circuit.connections[j];
  if(semantics.get(first.id).net===semantics.get(second.id).net)continue;
  const a=routes.get(first.id),b=routes.get(second.id);
  for(let x=1;x<a.length;x++)for(let y=1;y<b.length;y++){
   const point=intersection(a[x-1],a[x],b[y-1],b[y]);if(!point)continue;
   if(circuit.components.some(part=>Object.keys(part.terminals).some(key=>{
    const p=endpoint(circuit,part.id+'.'+key);
    return Math.abs(p.x-point[0])<13&&Math.abs(p.y-point[1])<13;
   })))continue;
   const key=point.join(',');
   if(!result.has(key))result.set(key,{x:point[0],y:point[1],wires:[first.id,second.id],colour:categoryColours[first.category]||'#303b43'});
  }
 }
 return [...result.values()];
}

export function crossingMarkers(circuit,isWireActive=()=>true,wirePresentation=null,options={}){
 return visualCrossings(circuit,options).map(({x,y,colour,wires})=>
  `<g class="forge-crossing" data-crossing-wires="${wires.join(' ')}" data-crossing-wire="${wires[0]}" data-view-state="${wirePresentation?.(wires[0])?.state||(isWireActive(wires[0])?'active':'muted')}" aria-hidden="true"><circle cx="${x}" cy="${y}" r="5" fill="#f5f5f5"/><path d="M${x-6} ${y}Q${x} ${y-9} ${x+6} ${y}" fill="none" stroke="${wirePresentation?.(wires[0])?.colour||colour}" stroke-width="${wirePresentation?.(wires[0])?.state==='traced'?4.5:3}"/></g>`).join('');
}
