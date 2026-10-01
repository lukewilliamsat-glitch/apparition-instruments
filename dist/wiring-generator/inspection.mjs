import {endpoint,net} from './model.mjs';

export function pathDetails(circuit,reference){
 endpoint(circuit,reference);
 const references=[...net(circuit,reference)].sort(),members=new Set(references);
 const wires=circuit.connections.filter(w=>members.has(w.from)&&members.has(w.to));
 const components=circuit.components.filter(part=>references.some(ref=>ref.startsWith(part.id+'.')));
 const contacts=circuit.contacts.filter(([from,to])=>members.has(from)&&members.has(to));
 const elements=(circuit.elements||[]).filter(element=>members.has(element.from)||members.has(element.to));
 return {references,wires,components,contacts,...elements.length?{elements}:{}};
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
