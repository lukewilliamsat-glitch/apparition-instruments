// Presentation only: immutable orthogonal routes between semantic terminals.
// A coarse visibility grid avoids component bodies; penalties separate shared corridors.
const step=10,W=132,H=119;
const cache=new Map();
export function componentBounds(p){
 let b;
 if(['pot','pushpull'].includes(p.type))b=[-75,-16,78,p.type==='pushpull'?335:194];
 else if(['humbucker','singlecoil','p90'].includes(p.type))b=[-20,-30,162,240];
 else if(['capacitor','resistor','network'].includes(p.type))b=[-32,-36,32,p.productMark?45:24];
 else if(p.type==='toggle')b=[-78,-34,82,157];
 else if(p.type==='jack')b=[-83,-33,89,120];
 else if(['blade','blade3','blade5','superswitch'].includes(p.type))b=[-25,-45,195,p.type==='superswitch'?455:155];
 else b=[-24,6,24,32];
 return {id:p.id,l:p.x+b[0],t:p.y+b[1],r:p.x+b[2],b:p.y+b[3]};
}
function port(p,key,b){const t=p.terminals[key],a=[p.x+t.x,p.y+t.y];let q;
 if(['pot','pushpull'].includes(p.type))q=key==='case'?[b.r+15,a[1]]:key.startsWith('switch')?[key.includes('A')?b.l-15:b.r+15,a[1]]:[a[0],b.b+15];
 else if(['humbucker','singlecoil','p90'].includes(p.type))q=[a[0]+15,a[1]];
 else if(['capacitor','resistor','network'].includes(p.type))q=[a[0]+(key==='a'?-15:15),a[1]];
 else if(p.type==='toggle')q=key==='ground'?[a[0],b.t-15]:[a[0],b.b+15];
 else if(p.type==='jack')q=key==='tip'?[b.r+15,a[1]]:[b.l-15,a[1]];
 else if(['blade','blade3','blade5','superswitch'].includes(p.type))q=key==='ground'?[a[0]+20,a[1]]:p.type==='superswitch'?[b.l-20,a[1]-18]:[a[0],key.startsWith('A')?b.t-15:b.b+15];
 else q=[a[0],a[1]-18];
 const grid=q.map(v=>Math.round(v/step)*step);
 return [a,[a[0],q[1]],q,[grid[0],q[1]],grid].filter((v,i,all)=>!i||v[0]!==all[i-1][0]||v[1]!==all[i-1][1]);
}
class Heap{constructor(){this.a=[];}push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p][0]<=v[0])break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}pop(){const top=this.a[0],v=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let j=i*2+1;if(j+1<this.a.length&&this.a[j+1][0]<this.a[j][0])j++;if(this.a[j][0]>=v[0])break;this.a[i]=this.a[j];i=j;}this.a[i]=v;}return top;}}
const squash=points=>points.filter((p,i,a)=>!(i&&p[0]===a[i-1][0]&&p[1]===a[i-1][1])).filter((p,i,a)=>!i||i===a.length-1||!((a[i-1][0]===p[0]&&p[0]===a[i+1][0])||(a[i-1][1]===p[1]&&p[1]===a[i+1][1])));
export function routeDiagram(c){
 const key=JSON.stringify([c.components.map(p=>[p.id,p.type,p.x,p.y,p.terminals,p.productMark]),c.connections.map(w=>[w.id,w.from,w.to])]);if(cache.has(key))return cache.get(key);
 const bounds=c.components.map(componentBounds),blocked=new Set(),used=new Map(),results=new Map();
 for(const b of bounds)for(let x=Math.ceil((b.l-5)/step);x<=Math.floor((b.r+5)/step);x++)for(let y=Math.ceil((b.t-5)/step);y<=Math.floor((b.b+5)/step);y++)blocked.add(y*W+x);
 for(const p of c.components)for(const t of Object.values(p.terminals)){const x=p.x+t.x,y=p.y+t.y;for(let gx=Math.ceil((x-6)/step);gx<=Math.floor((x+6)/step);gx++)for(let gy=Math.ceil((y-6)/step);gy<=Math.floor((y+6)/step);gy++)blocked.add(gy*W+gx);}
 const endpoint=ref=>{const [id,k]=ref.split('.'),p=c.components.find(p=>p.id===id);return port(p,k,bounds.find(b=>b.id===id));};
 for(const w of c.connections){const a=endpoint(w.from),b=endpoint(w.to),start=a.at(-1).map(v=>v/step),end=b.at(-1).map(v=>v/step),sid=start[1]*W+start[0],eid=end[1]*W+end[0],open=new Heap(),dist=new Map([[sid,0]]),previous=new Map();open.push([0,sid,-1]);let found=false;
  while(open.a.length){const [,id,direction]=open.pop();if(id===eid){found=true;break;}const x=id%W,y=Math.floor(id/W);
   for(const [dx,dy,dir] of [[1,0,0],[-1,0,0],[0,1,1],[0,-1,1]]){const nx=x+dx,ny=y+dy,nid=ny*W+nx;if(nx<2||nx>W-3||ny<6||ny>H||((blocked.has(nid)&&nid!==eid&&nid!==sid)))continue;
    const cost=dist.get(id)+1+(direction!==-1&&direction!==dir?.55:0)+(used.get(nid)||0)*2.5;if(cost>=(dist.get(nid)??Infinity))continue;dist.set(nid,cost);previous.set(nid,id);open.push([cost+Math.abs(nx-end[0])+Math.abs(ny-end[1]),nid,dir]);
   }
  }
  let middle=[];if(found){let id=eid;while(id!==sid){middle.push([id%W*step,Math.floor(id/W)*step]);used.set(id,(used.get(id)||0)+1);id=previous.get(id);}middle.push(a.at(-1));middle.reverse();}
  else { // Preserve a legible original path if a crowded legacy layout has no free grid corridor.
   const raw=[a[0],...w.route,b[0]];for(const q of raw){const p=middle.at(-1);if(p&&p[0]!==q[0]&&p[1]!==q[1])middle.push([q[0],p[1]]);middle.push(q);}
  }
  results.set(w.id,squash(found?[...a,...middle,...b.toReversed()]:middle));
 }
 if(cache.size>24)cache.clear();cache.set(key,results);return results;
}
