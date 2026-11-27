import * as T from 'three';
// Rear view, shafts away. Normalised from the genuine Apparition harness photograph,
// not the former 4 × 3.6 unit rectangular layout. Unit = 10 mm.
export const layout=[{id:'pot0',role:'neck volume',p:[-2.85,0,-2.35],heading:Math.PI/2},{id:'pot1',role:'neck tone',p:[3.30,0,-1.70],heading:-Math.PI/2},{id:'pot2',role:'bridge volume',p:[-3.55,0,2.35],heading:Math.PI/2},{id:'pot3',role:'bridge tone',p:[2.60,0,3.00],heading:-Math.PI/2}];
// Numbering: rear view, lugs facing away -> 1 ground / 2 wiper / 3 input.
// Photo's older illustration calls input 'lug 1'; roles, not mirrored numerals, govern this contract.
export function terminal(pot,lug){const x=(lug-2)*.59,z=1.735,h=pot.heading;return [pot.p[0]+x*Math.cos(h)+z*Math.sin(h),-.045,pot.p[2]+x*Math.sin(h)-z*Math.cos(h)];}
export function createAssembly(lib){const rig=new T.Group(),parts=[],wires=[],anchors=[],objects={},connections=[];
 const part=(id,obj,end,rotation,lo,hi)=>{obj.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});rig.add(obj);objects[id]=obj;parts.push({id,obj,end:new T.Vector3(...end),start:new T.Vector3(end[0]*1.55,end[1]+3+(parts.length%3),end[2]*1.45),rotation:new T.Euler(...rotation),lo,hi});};
 const wire=(points,r=.04,mat=lib.materials.edge,role='lead')=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');const geo=new T.TubeGeometry(curve,144,r,12,false),mesh=new T.Mesh(geo,mat);rig.add(mesh);wires.push({mesh,curve,count:geo.index.count,role});return mesh;};
 const solder=(p,scale=1)=>{const o=lib.solder();o.position.set(...p);o.scale.multiplyScalar(scale);o.userData.restScale=o.scale.clone();rig.add(o);anchors.push(o);};
 for(const p of layout){part(p.id,lib.pot(),p.p,[Math.PI,p.heading,0],.2,.4);objects[p.id].userData.role=p.role;
 // Ground end of each track is connected to its own case; other unused tone lug stays open.
 const t=terminal(p,1),ground=[p.p[0]+(p.heading>0?.72:-.72),.04,p.p[2]-.62];
 wire([t,[t[0],.07,t[2]-.13],[ground[0]+(p.heading>0?.20:-.20),.13,ground[2]],ground],.04,lib.materials.edge,'lug-ground');solder(t,.65);solder(ground,.72);connections.push({from:p.id+':lug1-ground',to:p.id+':case'});}
 for(let row=0;row<2;row++){const v=layout[row*2],t=layout[row*2+1],vin=terminal(v,3),tw=terminal(t,2),center=[(vin[0]+tw[0])/2,.73,(vin[2]+tw[2])/2-.48];
 part('cap'+row,lib.capacitor(false),center,[-Math.PI/2,0,0],.4,.6);
 const exits=[[-.95,-.61,0],[.95,-.61,0]].map(a=>[center[0]+a[0],center[1]+a[2],center[2]-a[1]]);
 for(const [i,end] of [[0,vin],[1,tw]]){const a=exits[i],b=[a[0]+(i? .12:-.12),a[1]-.13,a[2]+.025],c=[end[0],.20,end[2]+.05];wire([a,b,c,end],.04,lib.materials.edge,'capacitor-lead');
 // Woven yellow insulating sleeve follows the same centreline, leaving ends exposed.
 const curve=wires.at(-1).curve;const pts=[.24,.36,.48,.60,.72].map(u=>curve.getPoint(u).toArray());wire(pts,.073,lib.materials.yellow,'sleeve');solder(end,.72);}
 connections.push({from:v.id+':lug3-input',via:'cap'+row,to:t.id+':lug2-wiper'});}
 // Continuous U-shaped common ground on the outside of the harness, as photographed.
 // Three spans connect all four cases; no invented signal-return paths through a capacitor.
 const grounds=layout.map(p=>[p.p[0],.065,p.p[2]-.78]);
 for(const [ai,bi,bend] of [[0,1,-1],[1,3,1],[3,2,1]]){const a=grounds[ai],b=grounds[bi];const across=ai===0||ai===3;const pts=across?[a,[a[0]+.35,.19,a[2]+bend*.5],[(a[0]+b[0])/2,.23,(a[2]+b[2])/2+bend*.6],[b[0]-.35,.18,b[2]+bend*.45],b]:[a,[a[0]+1.05,.16,a[2]+.6],[b[0]+1.07,.18,b[2]-.7],b];
 const path=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)),false,'centripetal');wire([0,.02,.05,.1,.2,.4,.6,.8,.9,.95,.98,1].map(u=>path.getPoint(u).toArray()),.036,lib.materials.edge,'ground-conductor');wire([.045,.12,.24,.4,.6,.76,.88,.955].map(u=>path.getPoint(u).toArray()),.09,lib.materials.cloth,'ground-cloth');solder(a);solder(b);connections.push({from:layout[ai].id+':case',to:layout[bi].id+':case'});}
 return {rig,parts,wires,anchors,objects,connections};}
