// Generator-owned progress projection. No electrical graph or measurement claims.
export function buildIdentity(circuit){return JSON.stringify({components:circuit.components.map(p=>[p.id,p.type,p.value,p.mechanicalHost||'',Object.keys(p.terminals)]),connections:circuit.connections.map(w=>[w.id,w.from,w.to,w.category]),profiles:circuit.state.pickupProfiles||{},colours:circuit.state.colours});}
// Phase classification projects actual endpoints. Grounding comes last, except pickup
// returns which are installed with the pickup. Sort independent of graph insertion order.
export function connectionPhase(circuit,row,parts=new Map(circuit.components.map(p=>[p.id,p]))){
 const ps=[row.from,row.to].map(ref=>parts.get(ref.split('.')[0]));
 if(ps.some(p=>['humbucker','singlecoil','p90'].includes(p.type)))return 'pickups';
 if(ps.some(p=>p.type==='jack'))return 'output';
 if(row.purpose==='ground')return 'ground';
 if(ps.some(p=>['toggle','blade','blade3','blade5','superswitch'].includes(p.type)))return 'selector';
 return 'bench';
}
export function buildStages(circuit,guide){
 const titles={prepare:'Identify components / bench preparation',bench:'Bench / control assembly',selector:'Selector / harness assembly',output:'Output jack',pickups:'Pickup installation',ground:'Grounding / shielding',final:'Final inspection'};
 const parts=new Map(circuit.components.map(p=>[p.id,p]));
 const buckets=new Map(Object.keys(titles).map(id=>[id,[]]));
 for(const row of guide.connections)buckets.get(connectionPhase(circuit,row,parts)).push(row);
 const rank=row=>row.kind==='local-series'?0:row.purpose==='tone'?1:row.purpose==='auxiliary'?2:row.purpose==='ground'?4:3;
 return Object.keys(titles).map(id=>({id,label:titles[id],connections:buckets.get(id).sort((a,b)=>rank(a)-rank(b)||[a.from,a.to].sort().join('|').localeCompare([b.from,b.to].sort().join('|'))||a.id.localeCompare(b.id))})).filter(s=>s.connections.length||['prepare','final'].includes(s.id));
}
// Future Kit Definition adapter must provide exact physical endpoint evidence. A kit
// name, supplied component, or historical order alone never proves completed soldering.
export function factoryCompleteConnections(circuit,guide,assembly){
 if(!assembly||assembly.version!==1||assembly.source!=='kit-definition'||!assembly.definitionId||assembly.circuitIdentity!==buildIdentity(circuit)||!Array.isArray(assembly.completedConnections))return [];
 const byId=new Map(guide.connections.map(row=>[row.id,row]));
 if(assembly.completedConnections.some(item=>{const row=item&&byId.get(item.id);return !row||item.from!==row.from||item.to!==row.to;}))return [];
 return [...new Set(assembly.completedConnections.map(item=>item.id))].sort();
}
export function createBuildProgress(circuit,guide,saved=null,assembly=null){
 const identity=buildIdentity(circuit),stages=buildStages(circuit,guide),ids=new Set(guide.connections.map(r=>r.id));
 const checkpoints=stages.flatMap(s=>s.id==='prepare'?[{id:'@prepare',stage:s.id},...s.connections.map(r=>({id:r.id,stage:s.id}))]:s.id==='final'?[{id:'@final',stage:s.id}]:s.connections.map(r=>({id:r.id,stage:s.id})));
 const valid=saved?.version===1&&saved.identity===identity;
 const safe=v=>Array.isArray(v)?[...new Set(v.filter(id=>ids.has(id)))]:[];
 const factoryComplete=factoryCompleteConnections(circuit,guide,assembly);
 const completed=valid?safe(saved.completed).filter(id=>saved.route!=='kit'||!factoryComplete.includes(id)):[],skipped=valid?safe(saved.skipped).filter(id=>!completed.includes(id)&&!factoryComplete.includes(id)):[];
 return {version:1,identity,route:valid&&['scratch','kit','check'].includes(saved.route)?saved.route:null,current:valid&&checkpoints.some(c=>c.id===saved.current)&&!(saved.route==='kit'&&factoryComplete.includes(saved.current))?saved.current:'@prepare',completed,skipped,factoryComplete,kitVerified:factoryComplete.length>0,finished:!!(valid&&saved.finished&&completed.length+(saved.route==='kit'?factoryComplete.length:0)===ids.size&&!skipped.length),stages,checkpoints};
}
export function updateBuildProgress(state,action,id){
 if(action==='route'){if(!['scratch','kit','check'].includes(id))throw Error('Unknown build route');state.route=id;state.finished=false;if(id==='kit'){state.completed=state.completed.filter(v=>!state.factoryComplete.includes(v));state.skipped=state.skipped.filter(v=>!state.factoryComplete.includes(v));if(state.factoryComplete.includes(state.current))state.current='@prepare';}return state;}
 const checkpoints=state.route==='kit'?state.checkpoints.filter(c=>!state.factoryComplete.includes(c.id)):state.checkpoints;
 const cursor=checkpoints.findIndex(c=>c.id===state.current),move=n=>{state.current=checkpoints[Math.max(0,Math.min(checkpoints.length-1,n))].id;state.finished=false;};
 if(action==='previous')move(cursor-1);
 else if(action==='jump'){if(!checkpoints.some(c=>c.id===id))throw Error('Unknown checkpoint');state.current=id;state.finished=false;}
 else if(action==='done'||action==='skip'){
  if(state.current==='@final'){if(action==='done'&&state.completed.length===checkpoints.filter(c=>!c.id.startsWith('@')).length&&!state.skipped.length)state.finished=true;return state;}
  if(!state.current.startsWith('@')){state.completed=state.completed.filter(v=>v!==state.current);state.skipped=state.skipped.filter(v=>v!==state.current);state[action==='done'?'completed':'skipped'].push(state.current);}
  move(cursor+1);
 }else if(action==='toggle'){if(!checkpoints.some(c=>c.id===id&&!c.id.startsWith('@')))throw Error('Unknown connection');state.finished=false;state.skipped=state.skipped.filter(v=>v!==id);state.completed=state.completed.includes(id)?state.completed.filter(v=>v!==id):[...state.completed,id];}
 else throw Error('Unknown progress action');return state;
}
export function progressRecord(s){return {version:1,identity:s.identity,route:s.route,current:s.current,completed:s.completed,skipped:s.skipped,finished:s.finished};}
export function progressKey(identity){let h=2166136261;for(const c of identity)h=Math.imul(h^c.charCodeAt(0),16777619);return 'apparition-guided-build-v3-'+(h>>>0).toString(16);}
export function highlightCheckpoint(mount,row){
 const svg=mount.querySelector('svg');if(!svg)return;svg.dataset.guidedBuild=row?'active':'idle';
 const refs=new Set(row?[row.from,row.to]:[]),parts=new Set([...refs].map(r=>r.split('.')[0]));
 for(const node of svg.querySelectorAll('[data-component],[data-terminal],[data-wire],[data-crossing-wire]')){let active=node.dataset.wire===row?.id&&!!row||node.dataset.crossingWire===row?.id&&!!row||parts.has(node.dataset.component)||refs.has(node.dataset.terminal);node.dataset.buildFocus=row?(active?'active':'context'):'idle';}
}
