import * as T from 'three';
// Versioned runtime material overlay. The sealed specimen geometry and embedded stamp normal remain untouched.
export function refineMaterials(rig,lib){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#919191';ctx.fillRect(0,0,512,512);let seed=104;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const im=ctx.getImageData(0,0,512,512);for(let i=0;i<im.data.length;i+=4){const v=135+random()*30;im.data[i]=im.data[i+1]=im.data[i+2]=v;}ctx.putImageData(im,0,0);
 for(let i=0;i<1800;i++){const x=random()*512,y=random()*512;ctx.strokeStyle=`rgba(${random()>.5?'220,220,220':'60,60,60'},${.03+random()*.08})`;ctx.lineWidth=.3+random()*.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4+random()*35,y+(random()-.5)*8);ctx.stroke();}
 const rough=new T.CanvasTexture(canvas);rough.wrapS=rough.wrapT=T.RepeatWrapping;rough.colorSpace=T.NoColorSpace;
 const seen=new Set();rig.traverse(o=>{if(!o.isMesh)return;for(const m of [o.material].flat()){if(seen.has(m))continue;seen.add(m);const n=m.name||'';
 if(n.includes('SV001')){if(/tin casing|recessed/.test(n)){m.color.set('#c8cccf');m.metalness=1;m.roughness=.58;m.roughnessMap=rough;m.envMapIntensity=1.25;if(m.normalScale)m.normalScale.setScalar(n.includes('recessed')?1.7:.45);}else if(n.includes('phenolic')){m.roughness=.66;m.envMapIntensity=.45;}else if(n.includes('terminals')){m.color.set('#c2c8cb');m.roughness=.26;m.envMapIntensity=1.2;}else if(/bushing|shaft/.test(n)){m.color.set('#bdc0b8');m.roughness=.31;m.envMapIntensity=1.15;}else if(n.includes('plate')){m.color.set('#b8bebc');m.roughness=.4;}m.needsUpdate=true;}
 if(n.includes('epoxy')){m.color.set('#d94316');m.roughness=.25;m.clearcoat=.32;m.clearcoatRoughness=.24;m.envMapIntensity=.8;}
 }});
 lib.materials.cloth.color.set('#24241f');lib.materials.cloth.bumpScale=.045;lib.materials.cloth.roughness=1;lib.materials.yellow.color.set('#bca14e');lib.materials.yellow.bumpScale=.018;lib.materials.solder.roughness=.28;
}
