import {drawCircuit} from '../../wiring-generator/render.mjs';
import {conventionalSignalStudy} from './educational-truth.mjs';
import {homepageCircuit,homepageStateKey,homepageSpecificationKey} from './homepage-state.mjs';
const esc=value=>String(value).replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]));
// Recover the historical full shared-renderer presentation. This adapter only
// adds the homepage palette and travelling overlays to existing routed wires.
export function homepageEditorial({compact=false,circuit=homepageCircuit()}={}){
 const s=conventionalSignalStudy(circuit);
 const lead=circuit.connections.find(w=>w.from===s.pickup.id+'.hot'&&w.to.startsWith(s.selector.id+'.'));
 const contact=circuit.contacts.find(pair=>pair.includes(lead.to));
 const out=contact?.find(ref=>ref!==lead.to);
 const input=circuit.connections.find(w=>w.from===out&&w.to===s.volume.id+'.lug3');
 const output=circuit.connections.find(w=>w.from===s.volume.id+'.lug2'&&w.to==='jack.tip');
 const tone=circuit.connections.find(w=>w.from===s.volume.id+'.lug3'&&w.to===s.cap.id+'.a');
 if(!input||!output||!tone)throw Error('Homepage signal topology unavailable');
 let svg=drawCircuit(circuit,{exporting:true,mode:'trace',palette:'editorial',surface:'paper'});
 svg=svg.replace('<svg ',`<svg class="home-editorial-path${compact?' home-editorial-compact':''}" data-home-renderer="editorial-full-v1" data-homepage-specification="${esc(homepageSpecificationKey(circuit))}" data-main-signal="${s.pickup.id}.hot selector ${s.volume.id}.lug3 ${s.volume.id}.lug2 jack.tip" `).replaceAll('data-diagram-surface="paper"','data-diagram-surface="cream"').replace('role="group"','role="img"');
 if(!svg.includes(`data-circuit-state="${homepageStateKey(circuit)}"`))throw Error('Homepage state mismatch');
 for(const [i,w] of [lead,input,output].entries()){
  const pattern=new RegExp('(<g class="wire [^>]*data-wire="'+w.id+'"[^>]*>)([\\s\\S]*?)(</g>)');
  svg=svg.replace(pattern,(_,open,body,close)=>{
   const path=body.match(/<path class="wire-line[^>]*d="([^"]+)"/);
   if(!path)throw Error('Homepage route unavailable');
   const attrs=i===1?` data-signal-input="${s.volume.id}.lug3"`:i===2?` data-signal-output="${s.volume.id}.lug2" data-home-signal-to="jack.tip" data-to="jack.tip"`:'';
   return open+body+`<path class="signal-travel" data-home-trace="${i}" data-travel-stage="${i}"${attrs} d="${path[1]}" aria-hidden="true"/>`+close;
  });
 }
 svg=svg.replace(`data-wire="${tone.id}"`,`data-wire="${tone.id}" data-tone-branch="loading" data-from="${s.volume.id}.lug3" data-to="jack.sleeve" data-via="${s.cap.id}.a ${s.cap.id}.b ${s.tone.id}.lug2 ${s.tone.id}.lug1"`);
 const style=`.home-editorial-path{--art-paper:#eee8db;--art-metal:#a3a69e}.home-editorial-path .sheet-heading,.home-editorial-path .sheet-caption{display:none}.home-editorial-path .part-title,.home-editorial-path .part-value{stroke:#eee8db}.home-editorial-path .signal-travel{fill:none;stroke:#ad8740;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:18 320;animation:home-signal-travel 7s linear infinite}.home-editorial-path .signal-travel[data-travel-stage="1"]{animation-delay:-2s}.home-editorial-path .signal-travel[data-travel-stage="2"]{animation-delay:-4s}@keyframes home-signal-travel{to{stroke-dashoffset:-338}}@media(prefers-reduced-motion:reduce){.home-editorial-path .signal-travel{animation:none;display:none}}`;
 const prefix=compact?'home-path-compact':'home-path';
 return svg.replaceAll('generator-svg',prefix).replaceAll('generator-title',prefix+'-title').replaceAll('generator-desc',prefix+'-description').replace('</style>',style+'</style>');
}
