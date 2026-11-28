import * as T from 'three';
// Fresh metallic materials: no 105 base colour, bump, scratch normals or roughness overlays.
export function replaceCTS(rig,renderer){
 const studio=new T.Scene();studio.background=new T.Color(.035,.04,.045);
 const card=(w,h,x,y,z,power,colour)=>{const m=new T.MeshBasicMaterial({color:colour,side:T.DoubleSide});m.color.multiplyScalar(power);const o=new T.Mesh(new T.PlaneGeometry(w,h),m);o.position.set(x,y,z);o.lookAt(0,0,0);studio.add(o);};
 card(10,8,-4,9,-7,2.8,0xf0f4ff);card(3,12,7,5,1,2.2,0xffffff);card(9,3,0,6,8,1.3,0xdde5ee);card(1.8,8,-7,2,3,1.2,0xffdeb5);
 const generator=new T.PMREMGenerator(renderer),target=generator.fromScene(studio,.08);generator.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 // Planar rear faces share a normal and otherwise sample one uniform region of the
 // sidewall studio. Give only the recessed rear-face material an asymmetric field.
 const rearStudio=new T.Scene();rearStudio.background=new T.Color(.018,.022,.028);
 const gradient=document.createElement('canvas');gradient.width=512;gradient.height=128;const gx=gradient.getContext('2d'),g=gx.createLinearGradient(0,0,512,128);g.addColorStop(0,'#15191e');g.addColorStop(.28,'#b2bbc5');g.addColorStop(.52,'#ffffff');g.addColorStop(.72,'#626e7b');g.addColorStop(1,'#10151b');gx.fillStyle=g;gx.fillRect(0,0,512,128);const tex=new T.CanvasTexture(gradient);tex.colorSpace=T.SRGBColorSpace;
 const softbox=new T.Mesh(new T.PlaneGeometry(12,7),new T.MeshBasicMaterial({map:tex,color:new T.Color(2.1,2.1,2.1),side:T.DoubleSide}));softbox.position.set(-3,9,-8);softbox.lookAt(0,0,0);rearStudio.add(softbox);
 const edge=new T.Mesh(new T.PlaneGeometry(2,9),new T.MeshBasicMaterial({color:new T.Color(1.5,1.35,1.15),side:T.DoubleSide}));edge.position.set(8,5,-3);edge.lookAt(0,0,0);rearStudio.add(edge);
 const rearGenerator=new T.PMREMGenerator(renderer),rearTarget=rearGenerator.fromScene(rearStudio,.025);rearGenerator.dispose();rearStudio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});tex.dispose();
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),im=x.createImageData(512,512);let seed=106;for(let i=0;i<im.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/4294967296;const v=215+Math.round(n*12);im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}x.putImageData(im,0,0);const rough=new T.CanvasTexture(c);rough.flipY=false;rough.colorSpace=T.NoColorSpace;rough.wrapS=rough.wrapT=T.RepeatWrapping;
 const cache=new Map();rig.traverse(o=>{if(!o.isMesh)return;const old=o.material,n=old.name||'';if(!n.includes('SV001')||/phenolic/.test(n))return;
 if(!cache.has(n)){const casing=/casing|recessed/.test(n),shaft=n.includes('shaft'),bushing=n.includes('bushing'),terminals=n.includes('terminals');const m=new T.MeshPhysicalMaterial({name:'SILVERSMITH106 · '+n,color:new T.Color().setRGB(.76,.79,.81),metalness:1,roughness:casing?.30:shaft?.22:bushing?.27:terminals?.32:.38,roughnessMap:rough,envMap:target.texture,envMapIntensity:1,clearcoat:0});
 // Preserve the actual recessed identification, not the rejected 105 composite normal.
 if(n.includes('recessed')){m.envMap=rearTarget.texture;m.roughness=.18;m.envMapIntensity=1.05;m.normalMap=old.normalMap;m.normalScale.setScalar(1.25);}else if(shaft||bushing){m.normalMap=old.normalMap;m.normalScale.setScalar(.12);}cache.set(n,m);}o.material=cache.get(n);});
}
