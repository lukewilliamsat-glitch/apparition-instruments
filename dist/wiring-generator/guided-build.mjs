// Generator-owned progress projection. No electrical graph or measurement claims.
export function buildIdentity(circuit){return JSON.stringify({components:circuit.components.map(p=>[p.id,p.type,p.value,p.mechanicalHost||'',Object.keys(p.terminals)]),connections:circuit.connections.map(w=>[w.id,w.from,w.to,w.category]),profiles:circuit.state.pickupProfiles||{},colours:circuit.state.colours});}
export function buildStages(circuit,guide){
 const parts=new Map(circuit.components.map(p=>[p.id,p]));
 const titles={prepare:'Prepare components / pickups',volume:'Volume controls',tone:'Tone controls',selector:'Selector',modifiers:'Optional modifiers',output:'Output',ground:'Grounding / shielding',final:'Final inspection'};
 const bucket=row=>{const ps=[row.from,row.to].map(r=>parts.get(r.split('.')[0]));return row.kind==='local-series'?'prepare':row.purpose==='ground'?'ground':ps.some(p=>p.type==='dpdt')||row.purpose==='auxiliary'?'modifiers':ps.some(p=>p.type==='jack')?'output':row.purpose==='tone'?'tone':ps.some(p=>['toggle','blade','blade3','blade5','superswitch'].includes(p.type))?'selector':'volume';};
 return Object.keys(titles).map(id=>({id,label:titles[id],connections:guide.connections.filter(r=>bucket(r)===id)})).filter(s=>s.connections.length||['prepare','final'].includes(s.id));
}
export function createBuildProgress(circuit,guide,saved=null){
 const identity=buildIdentity(circuit),stages=buildStages(circuit,guide),ids=new Set(guide.connections.map(r=>r.id));
 const checkpoints=stages.flatMap(s=>s.id==='prepare'?[{id:'@prepare',stage:s.id},...s.connections.map(r=>({id:r.id,stage:s.id}))]:s.id==='final'?[{id:'@final',stage:s.id}]:s.connections.map(r=>({id:r.id,stage:s.id})));
 const valid=saved?.version===1&&saved.identity===identity;
 const safe=v=>Array.isArray(v)?[...new Set(v.filter(id=>ids.has(id)))]:[];
 const completed=valid?safe(saved.completed):[],skipped=valid?safe(saved.skipped).filter(id=>!completed.includes(id)):[];
 return {version:1,identity,route:valid&&['scratch','check'].includes(saved.route)?saved.route:null,current:valid&&checkpoints.some(c=>c.id===saved.current)?saved.current:'@prepare',completed,skipped,finished:!!(valid&&saved.finished&&completed.length===ids.size&&!skipped.length),stages,checkpoints};
}
export function updateBuildProgress(state,action,id){
 if(action==='route'){if(!['scratch','check'].includes(id))throw Error('Unknown build route');state.route=id;state.finished=false;return state;}
 const cursor=state.checkpoints.findIndex(c=>c.id===state.current),move=n=>{state.current=state.checkpoints[Math.max(0,Math.min(state.checkpoints.length-1,n))].id;state.finished=false;};
 if(action==='previous')move(cursor-1);
 else if(action==='jump'){if(!state.checkpoints.some(c=>c.id===id))throw Error('Unknown checkpoint');state.current=id;state.finished=false;}
 else if(action==='done'||action==='skip'){
  if(state.current==='@final'){if(action==='done'&&state.completed.length===state.checkpoints.filter(c=>!c.id.startsWith('@')).length&&!state.skipped.length)state.finished=true;return state;}
  if(!state.current.startsWith('@')){state.completed=state.completed.filter(v=>v!==state.current);state.skipped=state.skipped.filter(v=>v!==state.current);state[action==='done'?'completed':'skipped'].push(state.current);}
  move(cursor+1);
 }else if(action==='toggle'){if(!state.checkpoints.some(c=>c.id===id&&!c.id.startsWith('@')))throw Error('Unknown connection');state.finished=false;state.skipped=state.skipped.filter(v=>v!==id);state.completed=state.completed.includes(id)?state.completed.filter(v=>v!==id):[...state.completed,id];}
 else throw Error('Unknown progress action');return state;
}
export function progressRecord(s){return {version:1,identity:s.identity,route:s.route,current:s.current,completed:s.completed,skipped:s.skipped,finished:s.finished};}
export function progressKey(identity){let h=2166136261;for(const c of identity)h=Math.imul(h^c.charCodeAt(0),16777619);return 'apparition-guided-build-v3-'+(h>>>0).toString(16);}
export function highlightCheckpoint(mount,row){
 const svg=mount.querySelector('svg');if(!svg)return;svg.dataset.guidedBuild=row?'active':'idle';
 const refs=new Set(row?[row.from,row.to]:[]),parts=new Set([...refs].map(r=>r.split('.')[0]));
 for(const node of svg.querySelectorAll('[data-component],[data-terminal],[data-wire],[data-crossing-wire]')){let active=node.dataset.wire===row?.id&&!!row||node.dataset.crossingWire===row?.id&&!!row||parts.has(node.dataset.component)||refs.has(node.dataset.terminal);node.dataset.buildFocus=row?(active?'active':'context'):'idle';}
}
