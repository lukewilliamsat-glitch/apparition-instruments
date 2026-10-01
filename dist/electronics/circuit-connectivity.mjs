// Conductive authority: external wires and optional actual closed contacts only.
// Passive winding/component elements and geometric crossings never join nets.
// Derive per operation so callers may safely edit graphs without stale caches.
export function conductiveIndex(circuit,{contacts=true}={}){
 const parent=new Map();
 function root(ref){if(!parent.has(ref))parent.set(ref,ref);let p=parent.get(ref);while(p!==parent.get(p))p=parent.get(p);let n=ref;while(parent.get(n)!==p){const next=parent.get(n);parent.set(n,p);n=next;}return p;}
 for(const [a,b] of [...circuit.connections.map(w=>[w.from,w.to]),...(contacts?circuit.contacts:[])]){const x=root(a),y=root(b);if(x!==y)parent.set(y,x);}
 let groups,canonical;
 function groupNets(){if(groups)return;groups=new Map();canonical=new Map();for(const ref of parent.keys()){const key=root(ref);if(!groups.has(key))groups.set(key,new Set());groups.get(key).add(ref);if(!canonical.has(key)||ref<canonical.get(key))canonical.set(key,ref);}}
 return {root,net:ref=>{const key=root(ref);groupNets();return new Set(groups.get(key)||[ref]);},canonical:ref=>{const key=root(ref);groupNets();return canonical.get(key)||ref;}};
}
