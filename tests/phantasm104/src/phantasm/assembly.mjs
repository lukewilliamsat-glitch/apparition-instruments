import * as T from 'three';
// Rear view, shafts away. Normalised from the genuine Apparition harness photograph,
// not the former 4 × 3.6 unit rectangular layout. Unit = 10 mm.
export const layout=[{id:'pot0',role:'neck volume',p:[-3.05,0,-2.35],heading:Math.PI/2+.095},{id:'pot1',role:'neck tone',p:[3.80,0,-1.70],heading:-Math.PI/2+.095},{id:'pot2',role:'bridge volume',p:[-3.75,0,2.35],heading:Math.PI/2+.095},{id:'pot3',role:'bridge tone',p:[3.10,0,3.00],heading:-Math.PI/2+.095}];
// Numbering: rear view, lugs facing away -> 1 ground / 2 wiper / 3 input.
// Photo's older illustration calls input 'lug 1'; roles, not mirrored numerals, govern this contract.
const terminals=[[-.587998,.158056,1.76405],[-.00002,.109,1.8372],[.605802,.158056,1.76405]];
export function terminal(pot,lug){const [x,y,z]=terminals[lug-1],h=pot.heading;return [pot.p[0]+x*Math.cos(h)+z*Math.sin(h),-y,pot.p[2]+x*Math.sin(h)-z*Math.cos(h)];}
// In the photographed rear-facing inward banks, the volume pickup-input eyelet
// is the outer eyelet towards the lower edge, the centre is the output wiper.
// The opposite outer eyelet returns to case. Tone uses its centre eyelet.
export const terminalRoles={volume:{input:3,wiper:2,ground:1},tone:{capacitor:2,ground:1}};
function terminalNormal(pot){return new T.Vector3(.9396926*Math.sin(pot.heading),-.3420201,-.9396926*Math.cos(pot.heading));}

export function createAssembly(lib){const rig=new T.Group(),parts=[],wires=[],anchors=[],objects={},connections=[];
 const part=(id,obj,end,rotation,lo,hi)=>{obj.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});rig.add(obj);objects[id]=obj;parts.push({id,obj,end:new T.Vector3(...end),start:new T.Vector3(end[0]*1.55,end[1]+3+(parts.length%3),end[2]*1.45),rotation:new T.Euler(...rotation),lo,hi});};
 const wire=(points,r=.04,mat=lib.materials.edge,role='lead')=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');const geo=new T.TubeGeometry(curve,144,r,12,false),mesh=new T.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;rig.add(mesh);wires.push({mesh,curve,count:geo.index.count,role});return mesh;};
 const solder=(p,scale=1,normal=null)=>{const o=lib.solder();o.position.set(...p);if(normal){o.position.addScaledVector(normal,-.025);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),normal);}o.scale.multiplyScalar(scale);o.userData.restScale=o.scale.clone();o.castShadow=o.receiveShadow=true;rig.add(o);anchors.push(o);};
 for(const p of layout){part(p.id,lib.pot(),p.p,[Math.PI,p.heading,0],.2,.4);objects[p.id].userData.role=p.role;
 // Ground end of each track is connected to its own case; other unused tone lug stays open.
 const t=terminal(p,p.role.includes('volume')?terminalRoles.volume.ground:terminalRoles.tone.ground),ground=[p.p[0]+(p.heading>0?.92:-.92),.04,p.p[2]-.42];
 wire([t,new T.Vector3(...t).addScaledVector(terminalNormal(p),.18).toArray(),[ground[0]+(p.heading>0?.20:-.20),.13,ground[2]],ground],.04,lib.materials.edge,'lug-ground');solder(t,.65,terminalNormal(p));solder([ground[0],.002,ground[2]],.72);connections.push({from:p.id+':lug1-ground',to:p.id+':case'});}
 for(let row=0;row<2;row++){const v=layout[row*2],t=layout[row*2+1],vin=terminal(v,terminalRoles.volume.input),tw=terminal(t,terminalRoles.tone.capacitor),center=[(vin[0]+tw[0])/2,.98,(vin[2]+tw[2])/2-.22];
 part('cap'+row,lib.capacitor(true),center,[-.60,.20,0],.4,.6);
 const capObject=objects['cap'+row],specimenScale=.94;
 // Scene specimen adjustment only: sealed GLB unchanged. Do not thin the silver leads.
 capObject.traverse(o=>{if(o.name==='SV-002_epoxy_body')o.scale.multiplyScalar(specimenScale);if(o.name.startsWith('SV-002_straight_lead_')){o.position.x*=specimenScale;o.position.y+=.00675*(1-specimenScale);o.userData.straightLead=true;o.visible=false;o.userData.fullScaleY=o.scale.y;o.userData.fullY=o.position.y;}});
 const pose=new T.Matrix4().makeRotationFromEuler(parts.at(-1).rotation);pose.setPosition(...center);const inverse=pose.clone().invert();
 const exits=capObject.userData.exits.map(a=>new T.Vector3(...a).multiplyScalar(specimenScale).applyMatrix4(pose).toArray());
 parts.at(-1).openingRotation=new T.Euler(0,-.35,0);
 capObject.userData.installedPose=pose.toArray();
 for(const [i,end] of [[0,vin],[1,tw]]){const a=exits[i],b=[a[0]+(i? .12:-.12),a[1]-.13,a[2]+.025],c=new T.Vector3(...end).addScaledVector(terminalNormal(i?t:v),.20).toArray();const points=[a,b,c,end];const lead=wire(points,.04,lib.leadMaterial,'capacitor-lead');const record=wires.at(-1);record.persistent=true;lead.userData.capLead=true;lead.geometry.applyMatrix4(inverse);lead.userData.formedLead=true;lead.userData.leadMorph=true;capObject.add(lead);
 // Woven yellow insulating sleeve follows the same centreline, leaving ends exposed.
 const curve=wires.at(-1).curve;const pts=[.24,.36,.48,.60,.72].map(u=>curve.getPoint(u).toArray());const sleeve=wire(pts,.073,lib.materials.yellow,'sleeve');wires.at(-1).persistent=true;sleeve.geometry.applyMatrix4(inverse);sleeve.userData.formedLead=true;sleeve.material=sleeve.material.clone();sleeve.material.transparent=true;sleeve.userData.sleeve=true;capObject.add(sleeve);
 const localExit=new T.Vector3(...a).applyMatrix4(inverse),straightCurve=new T.LineCurve3(localExit,localExit.clone().add(new T.Vector3(0,-3.21,0)));
 for(const [mesh,lo,hi] of [[lead,0,1],[sleeve,.24,.72]]){const curve=new T.CatmullRomCurve3([0,.25,.5,.75,1].map(u=>straightCurve.getPoint(lo+(hi-lo)*u)));const g=new T.TubeGeometry(curve,144,mesh===lead?.04:.073,12,false);mesh.userData.startPositions=g.attributes.position.array.slice();mesh.userData.endPositions=mesh.geometry.attributes.position.array.slice();mesh.userData.startNormals=g.attributes.normal.array.slice();mesh.userData.endNormals=mesh.geometry.attributes.normal.array.slice();g.dispose();}
 solder(end,.72,terminalNormal(i?t:v));}
 connections.push({from:v.id+':lug3-input',via:'cap'+row,to:t.id+':lug2-wiper'});}
 // Continuous U-shaped common ground on the outside of the harness, as photographed.
 // Three spans connect all four cases; no invented signal-return paths through a capacitor.
 const grounds=layout.map((p,i)=>[p.p[0]+(i===2?-.22:i===3?.22:0),.065,p.p[2]+(i>=2?.82:-.78)]);
 const solderedCases=new Set();
 for(const [ai,bi,bend] of [[0,1,-1],[1,3,1],[3,2,1]]){const a=grounds[ai],b=grounds[bi];const across=ai===0||ai===3;const direction=Math.sign(b[0]-a[0]);const outside=Math.max(layout[2].p[2],layout[3].p[2])+1.55;
 const pts=ai===3?[a,[a[0]-.25,.12,outside-.25],[(a[0]+b[0])/2,.16,outside],[b[0]+.35,.12,outside-.25],b]:across?[a,[a[0]+direction*.35,.19,a[2]+bend*.5],[(a[0]+b[0])/2,.23,(a[2]+b[2])/2+bend*.6],[b[0]-direction*.35,.18,b[2]+bend*.45],b]:[a,[a[0]+1.40,.16,a[2]+.6],[b[0]+1.40,.18,b[2]-.2],b];
 const path=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)),false,'centripetal');wire([0,.02,.05,.1,.2,.4,.6,.8,.9,.95,.98,1].map(u=>path.getPoint(u).toArray()),.036,lib.materials.edge,'ground-conductor');wire([.045,.12,.24,.4,.6,.76,.88,.955].map(u=>path.getPoint(u).toArray()),.09,lib.materials.cloth,'ground-cloth');for(const i of [ai,bi])if(!solderedCases.has(i)){solderedCases.add(i);const g=grounds[i];solder([g[0],.002,g[2]]);}connections.push({from:layout[ai].id+':case',to:layout[bi].id+':case'});}
 return {rig,parts,wires,anchors,objects,connections};}
