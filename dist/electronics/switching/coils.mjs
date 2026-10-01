import {net} from '../../wiring-generator/model.mjs';
// Windings are passive two-terminal elements, never conductive shorts in net().
export function seriesCoils(pickupId){return [
 {id:pickupId+'CoilA',type:'coil',pickup:pickupId,coil:'A',from:pickupId+'.hot',to:pickupId+'.linkA'},
 {id:pickupId+'CoilB',type:'coil',pickup:pickupId,coil:'B',from:pickupId+'.linkB',to:pickupId+'.ground'}
];}
export function humbuckerCoilState(circuit,pickupId='bridgePickup'){
 const coils=(circuit.elements||[]).filter(element=>element.type==='coil'&&element.pickup===pickupId);
 if(coils.length!==2)throw Error('Explicit humbucker coil topology is unavailable.');
 const canonical=ref=>[...net(circuit,ref)].sort()[0],hot=canonical(pickupId+'.hot'),ground=canonical(pickupId+'.ground');
 const edges=coils.map(coil=>({...coil,a:canonical(coil.from),b:canonical(coil.to)}));
 // Paths through actual winding elements after contraction of wires and contacts.
 const participating=new Set();
 function paths(node,seen,used){if(node===ground){used.forEach(id=>participating.add(id));return;}for(const edge of edges){if(edge.a===edge.b)continue;const next=edge.a===node?edge.b:edge.b===node?edge.a:null;if(next&&!seen.has(next))paths(next,new Set([...seen,next]),[...used,edge.id]);}}
 paths(hot,new Set([hot]),[]);
 const volumes=circuit.components.filter(part=>part.role==='volume'),output=net(circuit,'jack.tip'),input=net(circuit,pickupId+'.hot');
 const selected=volumes.some(volume=>input.has(volume.id+'.lug3')&&output.has(volume.id+'.lug2'));
 const states=edges.map(edge=>({id:edge.id,coil:edge.coil,from:edge.from,to:edge.to,shunted:edge.a===edge.b,participating:participating.has(edge.id),contributes:selected&&participating.has(edge.id)}));
 return {pickup:pickupId,selected,mode:states.every(coil=>coil.participating)?'full-series':states.find(coil=>coil.participating)?.coil==='A'?'coil-A':'unsupported',coils:states};
}
