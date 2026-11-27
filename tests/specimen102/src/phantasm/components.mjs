import * as T from 'three';import {createOrangeDrop,orangeLeadMaterial} from './orange-drop.mjs';import {createSpecimen} from './specimen.mjs';import {tinGrain} from './tin-grain.mjs';
// CTS pots use the exact converted SV-001 CAD asset. Capacitors, leads and wiring
// retain the accepted original geometry. Scene unit = 10 mm.
export const provenance={pot:'SV-001: exact CTS 450GT36K504B2S STEP converted through OpenCascade and Blender, meshopt-compressed; owner-confirmed permission',715:'SV-002 CDE 715P22356KA3, original photo-informed dipped geometry within K-case limits; verified CDE715P600V / 223J / 1523',wire:'Genuine Apparition harness photograph: cloth common-ground return; simplified modern wiring'};
function grain(kind){const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d'),im=g.createImageData(1024,1024);let seed=100;for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/4294967296-.5;let v=128+n*32;if(kind==='cloth'){const a=Math.sin((x+y)*.22),b=Math.sin((x-y)*.22);v=95+65*a*b+n*28;}else if(kind==='metal'){const xx=Math.floor(x/4)%128,yy=Math.floor(y/4)%128;v=tinGrain[(yy<64?yy:127-yy)*64+(xx<64?xx:127-xx)]+n*8;};const i=(y*1024+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}g.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
export function library(){const micro=grain('metal'),epoxy=grain('epoxy'),weave=grain('cloth');weave.repeat.set(3,.5);const m={steel:new T.MeshStandardMaterial({color:0xc5c7c5,metalness:1,roughness:.47,bumpMap:micro,bumpScale:.003}),edge:new T.MeshStandardMaterial({color:0xd4d6d4,metalness:1,roughness:.25}),brass:new T.MeshStandardMaterial({color:0xb9a372,metalness:1,roughness:.32,bumpMap:micro,bumpScale:.0018}),phenolic:new T.MeshStandardMaterial({color:0x79532c,roughness:.73,bumpMap:epoxy,bumpScale:.003}),dark:new T.MeshStandardMaterial({color:0x211e19,roughness:.85}),orange:new T.MeshPhysicalMaterial({color:0xdb3b0b,roughness:.29,clearcoat:.28,clearcoatRoughness:.27,bumpMap:epoxy,bumpScale:.0018}),cloth:new T.MeshStandardMaterial({color:0x55554d,map:weave,roughness:.95,bumpMap:weave,bumpScale:.025}),yellow:new T.MeshStandardMaterial({color:0xb39a4c,roughness:.83,bumpMap:weave,bumpScale:.008}),solder:new T.MeshStandardMaterial({color:0xbec4c6,metalness:1,roughness:.32,bumpMap:micro,bumpScale:.003})};
 const mesh=(geo,mat,p,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 function tube(parent,points,r=.04,mat=m.edge){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');const o=mesh(new T.TubeGeometry(curve,96,r,12,false),mat,parent);return o;}
 function ring(p,r,t,y,mat=m.edge){const o=mesh(new T.TorusGeometry(r,t,10,96),mat,p,0,y);o.rotation.x=Math.PI/2;return o;}
 function cyl(p,r,h,y,mat=m.steel){return mesh(new T.CylinderGeometry(r,r,h,96),mat,p,0,y);}





 function solder(){const pts=[[0,0],[.12,0],[.19,.018],[.17,.065],[.09,.11],[0,.12]].map(p=>new T.Vector2(...p));const o=new T.Mesh(new T.LatheGeometry(pts,40),m.solder);o.scale.set(1,1,.83);return o;}
 return {pot:createSpecimen,capacitor:createOrangeDrop,leadMaterial:orangeLeadMaterial(),solder,tube,materials:m};}
