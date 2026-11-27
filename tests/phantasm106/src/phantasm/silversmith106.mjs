import * as T from 'three';
// Fresh metallic materials: no 105 base colour, bump, scratch normals or roughness overlays.
export function replaceCTS(rig,renderer){
 const studio=new T.Scene();studio.background=new T.Color(.035,.04,.045);
 const card=(w,h,x,y,z,power,colour)=>{const m=new T.MeshBasicMaterial({color:colour,side:T.DoubleSide});m.color.multiplyScalar(power);const o=new T.Mesh(new T.PlaneGeometry(w,h),m);o.position.set(x,y,z);o.lookAt(0,0,0);studio.add(o);};
 card(10,8,-4,9,-7,2.8,0xf0f4ff);card(3,12,7,5,1,2.2,0xffffff);card(9,3,0,6,8,1.3,0xdde5ee);card(1.8,8,-7,2,3,1.2,0xffdeb5);
 const generator=new T.PMREMGenerator(renderer),target=generator.fromScene(studio,.08);generator.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),im=x.createImageData(512,512);let seed=106;for(let i=0;i<im.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/4294967296;const v=215+Math.round(n*12);im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}x.putImageData(im,0,0);const rough=new T.CanvasTexture(c);rough.flipY=false;rough.colorSpace=T.NoColorSpace;rough.wrapS=rough.wrapT=T.RepeatWrapping;
 const cache=new Map();rig.traverse(o=>{if(!o.isMesh)return;const old=o.material,n=old.name||'';if(!n.includes('SV001')||/phenolic/.test(n))return;
 if(!cache.has(n)){const casing=/casing|recessed/.test(n),shaft=n.includes('shaft'),bushing=n.includes('bushing'),terminals=n.includes('terminals');const m=new T.MeshPhysicalMaterial({name:'SILVERSMITH106 · '+n,color:new T.Color().setRGB(.76,.79,.81),metalness:1,roughness:casing?.30:shaft?.22:bushing?.27:terminals?.32:.38,roughnessMap:rough,envMap:target.texture,envMapIntensity:1,clearcoat:0});
 // Preserve the actual recessed identification, not the rejected 105 composite normal.
 if(n.includes('recessed')){m.normalMap=old.normalMap;m.normalScale.setScalar(.85);}else if(shaft||bushing){m.normalMap=old.normalMap;m.normalScale.setScalar(.12);}cache.set(n,m);}o.material=cache.get(n);});
}
