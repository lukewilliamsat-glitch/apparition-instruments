// Presentation only: orthogonal routes between semantic terminals. The circuit
// graph, not geometry or colour, determines whether two paths are connected.
const step=10,W=132,H=119;
const cache=new Map();
import {composePhysicalWiring} from './physical.mjs';
export function routeSemantics(c,{contacts=true}={}){
 const parent=new Map();
 const root=ref=>{if(!parent.has(ref))parent.set(ref,ref);let p=parent.get(ref);while(p!==parent.get(p))p=parent.get(p);return p;};
 const join=(a,b)=>{const x=root(a),y=root(b);if(x!==y)parent.set(y,x);};
 for(const w of c.connections)join(w.from,w.to);
 if(contacts)for(const [a,b] of c.contacts||[])join(a,b);
 const role=w=>w.network==='auxiliary'?'auxiliary':w.category==='ground'?'ground':w.category==='signal'?'signal':w.category==='tone'?'tone':w.category==='switching'?'switch':'unknown';
 return new Map(c.connections.map(w=>[w.id,{net:root(w.from),role:role(w)}]));
}
export function componentBounds(p){
 let b;
 if(['pot','pushpull'].includes(p.type))b=[-75,-16,78,p.type==='pushpull'?335:194];
 else if(['humbucker','singlecoil','p90'].includes(p.type))b=[-20,-30,162,240];
 else if(['capacitor','resistor','network'].includes(p.type))b=[-32,-36,32,p.productMark?45:24];
 else if(p.type==='dpdt')b=[-68,-28,68,99];
 else if(p.type==='toggle')b=[-78,-34,82,157];
 else if(p.type==='jack')b=[-83,-33,89,120];
 else if(['blade','blade3','blade5','superswitch'].includes(p.type))b=[-25,-45,195,p.type==='superswitch'?455:155];
 else b=[-24,6,24,32];
 return {id:p.id,l:p.x+b[0],t:p.y+b[1],r:p.x+b[2],b:p.y+b[3]};
}
function port(p,key,b){const t=p.terminals[key],a=[p.x+t.x,p.y+t.y];let q;
 if(['pot','pushpull'].includes(p.type)){
  const horizontal=key==='case'||key.startsWith('switch');
  q=key==='case'?[b.r+35,a[1]]:key.startsWith('switch')?[key.includes('A')?b.l-35:b.r+35,a[1]]:[a[0],b.b+40];
  const grid=q.map(v=>Math.round(v/step)*step);
  // Snap within the solder terminal, then leave the body in one straight lane.
  return squash(horizontal?[a,[a[0],grid[1]],grid]:[a,[grid[0],a[1]],grid]);
 }
 else if(['humbucker','singlecoil','p90'].includes(p.type)){
  q=[a[0]+35,a[1]];const grid=q.map(v=>Math.round(v/step)*step);
  return squash([a,[a[0],grid[1]],grid]);
 }
 else if(['capacitor','resistor','network'].includes(p.type))q=[a[0]+(key==='a'?-15:15),a[1]];
 else if(p.type==='dpdt')q=[key.startsWith('A')?b.l-25:b.r+25,a[1]];
 else if(p.type==='toggle')q=key==='ground'?[a[0],b.t-15]:[a[0],b.b+15];
 else if(p.type==='jack')q=key==='tip'?[b.r+15,a[1]]:[b.l-15,a[1]];
 else if(['blade','blade3','blade5','superswitch'].includes(p.type))q=key==='ground'?[a[0]+20,a[1]]:p.type==='superswitch'?[b.l-20,a[1]-18]:[a[0],key.startsWith('A')?b.t-15:b.b+15];
 else q=[a[0],a[1]-18];
 const grid=q.map(v=>Math.round(v/step)*step);
 // Keep selector leads on one straight escape before entering the grid. The
 // unsnapped 2px intermediate point otherwise creates a visible micro-jog.
 if(p.type==='toggle')return squash([a,[a[0],grid[1]],grid]);
 return [a,[a[0],q[1]],q,[grid[0],q[1]],grid].filter((v,i,all)=>!i||v[0]!==all[i-1][0]||v[1]!==all[i-1][1]);
}
class Heap{constructor(){this.a=[];}push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p][0]<=v[0])break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}pop(){const top=this.a[0],v=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let j=i*2+1;if(j+1<this.a.length&&this.a[j+1][0]<this.a[j][0])j++;if(this.a[j][0]>=v[0])break;this.a[i]=this.a[j];i=j;}this.a[i]=v;}return top;}}
const squash=points=>points.filter((p,i,a)=>!(i&&p[0]===a[i-1][0]&&p[1]===a[i-1][1])).filter((p,i,a)=>!i||i===a.length-1||!((a[i-1][0]===p[0]&&p[0]===a[i+1][0])||(a[i-1][1]===p[1]&&p[1]===a[i+1][1])));
export function routeDiagram(c,{mode='trace'}={}){
 const build=mode==='build';
 const key=JSON.stringify([mode,c.components.map(p=>[p.id,p.type,p.x,p.y,p.terminals,p.productMark]),c.connections.map(w=>[w.id,w.from,w.to,w.route,w.category,w.network]),build?[]:c.contacts]);if(cache.has(key))return cache.get(key);
 const physical=composePhysicalWiring(c),bounds=c.components.map(componentBounds),blocked=new Set(),reserved=new Map(),occupied=new Map(),occupiedEdges=new Map(),results=new Map(),semantics=routeSemantics(c,{contacts:!build});
 for(const b of bounds)for(let x=Math.ceil((b.l-5)/step);x<=Math.floor((b.r+5)/step);x++)for(let y=Math.ceil((b.t-5)/step);y<=Math.floor((b.b+5)/step);y++)blocked.add(y*W+x);
 for(const p of c.components)for(const t of Object.values(p.terminals)){const x=p.x+t.x,y=p.y+t.y;for(let gx=Math.ceil((x-6)/step);gx<=Math.floor((x+6)/step);gx++)for(let gy=Math.ceil((y-6)/step);gy<=Math.floor((y+6)/step);gy++)blocked.add(gy*W+gx);}
 // Keep short, adjacent terminal departures clear for their own connections.
 for(const p of c.components)if(['pot','pushpull','humbucker','singlecoil','p90','blade','blade3','blade5'].includes(p.type)){
  const b=bounds.find(x=>x.id===p.id);
  for(const terminal of Object.keys(p.terminals)){
   const ref=p.id+'.'+terminal,escape=port(p,terminal,b).at(-1),x=escape[0]/step,y=escape[1]/step;
   const pickup=['humbucker','singlecoil','p90'].includes(p.type);
   const firstX=pickup?Math.ceil((p.x+p.terminals[terminal].x+5)/step):Math.ceil((b.r+5)/step);
   const blade=['blade','blade3','blade5'].includes(p.type);
   const positions=blade&&terminal==='ground'?[]:blade?Array.from({length:Math.max(0,Math.abs(y-Math.round((terminal.startsWith('A')?b.t-5:b.b+5)/step))+1)},(_,i)=>[x,Math.min(y,Math.round((terminal.startsWith('A')?b.t-5:b.b+5)/step))+i]):pickup||terminal==='case'?Array.from({length:Math.max(0,x-firstX+1)},(_,i)=>[firstX+i,y]):terminal.startsWith('switch')?[]:Array.from({length:Math.max(0,y-Math.ceil((b.b+5)/step)+1)},(_,i)=>[x,Math.ceil((b.b+5)/step)+i]);
   for(const [gx,gy] of positions){const id=gy*W+gx;if(!reserved.has(id))reserved.set(id,new Set());reserved.get(id).add(ref);}
  }
 }
 const endpoint=ref=>{const [id,k]=ref.split('.'),p=c.components.find(p=>p.id===id);return port(p,k,bounds.find(b=>b.id===id));};
 const edge=(a,b)=>a<b?a+':'+b:b+':'+a;
 const penalty=(id,dir,semantic)=>{
  let cost=0;const x=id%W,y=Math.floor(id/W);
  for(const [otherDir,other] of occupied.get(id)||[]){
   // A perpendicular intersection is a crossing, not a graph junction.
   cost+=otherDir===dir?(other.net===semantic.net?5:24):(build?3:8);
  }
  // Adjacent parallel runs need a whole clear grid lane where possible.
  for(const near of dir===0?[id-W,id+W]:[id-1,id+1])for(const [otherDir,other] of occupied.get(near)||[])
   if(otherDir===dir)cost+=other.net===semantic.net?1.5:(build?2:3);
  return cost;
 };
 for(const w of c.connections){const a=endpoint(w.from),b=endpoint(w.to),intent=physical.conductors.get(w.id);
  if(intent.kind==='pickup-hot'&&b[0][0]>a[0][0]){
   const p=a[0],q=b[0],x=q[0]-Math.min(48,Math.max(25,(q[0]-p[0])/3));
   results.set(w.id,squash([p,[x,p[1]],[x,q[1]],q]));continue;
  }
  if(intent.kind==='local-series'){const p=a[0],q=b[0],x=Math.max(p[0],q[0])+22;results.set(w.id,squash([p,[x,p[1]],[x,q[1]],q]));continue;}
  if(intent.kind==='pickup-ground'&&intent.join){
   const p=a[0],q=b[0],shield=intent.role==='shield',x=p[0]+(shield?55:35),y=q[1]+(shield?12:0);
   results.set(w.id,squash(shield?[p,[x,p[1]],[x,y],[q[0]-12,y],[q[0]-12,q[1]],q]:[p,[x,p[1]],[x,q[1]],q]));continue;
  }
  if(intent.kind==='local-casing-bond'){const p=a[0],q=b[0],x=p[0]+12;results.set(w.id,squash([p,[x,p[1]],[x,q[1]],q]));continue;}
  if(intent.kind==='ground-bus'&&a[0][1]===b[0][1]){
   results.set(w.id,[a[0],b[0]]);continue;
  }
  // A casing-to-casing run is one physical conductor. Keep its long span in
  // a clear lane outside both bodies, with each end returning to its own
  // graph-backed solder point. No off-terminal junction is implied.
  if(intent.kind==='ground-bus'&&a[0][0]===b[0][0]){
   const from=bounds.find(q=>q.id===w.from.split('.')[0]),to=bounds.find(q=>q.id===w.to.split('.')[0]);
   const lane=Math.ceil((Math.max(from.r,to.r)+32)/step)*step;
   results.set(w.id,squash([a[0],[lane,a[0][1]],[lane,b[0][1]],b[0]]));continue;
  }
  const start=a.at(-1).map(v=>v/step),end=b.at(-1).map(v=>v/step),sid=start[1]*W+start[0],eid=end[1]*W+end[0],open=new Heap(),dist=new Map([[sid,0]]),previous=new Map(),semantic=semantics.get(w.id);open.push([0,sid,-1]);let found=false;
  const protectedPort=ref=>['pot','pushpull','humbucker','singlecoil','p90','blade','blade3','blade5'].includes(c.components.find(p=>p.id===ref.split('.')[0])?.type);
  const outward=points=>[Math.sign(points.at(-1)[0]-points.at(-2)[0]),Math.sign(points.at(-1)[1]-points.at(-2)[1])];
  const departure=protectedPort(w.from)?outward(a):null,arrival=protectedPort(w.to)?outward(b):null;
  while(open.a.length){const [,id]=open.pop();if(id===eid){found=true;break;}const x=id%W,y=Math.floor(id/W),direction=previous.get(id)?.[1]??-1,run=previous.get(id)?.[2]??0;
   for(const [dx,dy,dir] of [[1,0,0],[-1,0,0],[0,1,1],[0,-1,1]]){const nx=x+dx,ny=y+dy,nid=ny*W+nx;
    if((id===sid&&departure&&(dx!==departure[0]||dy!==departure[1]))||(nid===eid&&arrival&&(dx!==-arrival[0]||dy!==-arrival[1]))||nx<2||nx>W-3||ny<6||ny>H||(occupiedEdges.has(edge(id,nid))&&occupiedEdges.get(edge(id,nid)).net!==semantic.net)||((blocked.has(nid)&&nid!==eid&&nid!==sid))||(reserved.has(nid)&&![...reserved.get(nid)].every(ref=>ref===w.from||ref===w.to)&&nid!==eid&&nid!==sid))continue;
    const turn=direction!==-1&&direction!==dir;
    const cost=dist.get(id)+2.5+(turn?3+Math.max(0,3-run)*4:0)+penalty(nid,dir,semantic)+(occupiedEdges.has(edge(id,nid))?40:0);if(cost>=(dist.get(nid)??Infinity))continue;dist.set(nid,cost);previous.set(nid,[id,dir,turn?1:Math.min(run+1,4)]);open.push([cost+2.5*(Math.abs(nx-end[0])+Math.abs(ny-end[1])),nid,dir]);
   }
  }
  let middle=[];if(found){let id=eid;while(id!==sid){middle.push([id%W*step,Math.floor(id/W)*step]);const [prior,dir]=previous.get(id);if(!occupied.has(id))occupied.set(id,[]);occupied.get(id).push([dir,semantic]);occupiedEdges.set(edge(id,prior),{net:semantic.net,wire:w.id});id=prior;}middle.push(a.at(-1));middle.reverse();}
  else { // Preserve a legible original path if a crowded legacy layout has no free grid corridor.
   const raw=[a[0],...w.route,b[0]];for(const q of raw){const p=middle.at(-1);if(p&&p[0]!==q[0]&&p[1]!==q[1])middle.push([q[0],p[1]]);middle.push(q);}
  }
  results.set(w.id,squash(found?[...a,...middle,...b.toReversed()]:middle));
 }
 if(cache.size>24)cache.clear();cache.set(key,results);return results;
}
