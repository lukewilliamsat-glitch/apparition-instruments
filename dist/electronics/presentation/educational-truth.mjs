import {conductiveIndex} from '../circuit-connectivity.mjs';
// Bounded conventional Modern passive study. Reject a changed topology instead
// of silently publishing an educational path that contradicts the actual graph.
export function conventionalSignalStudy(circuit){
 const idx=conductiveIndex(circuit),part=type=>circuit.components.find(p=>p.type===type),volume=circuit.components.find(p=>p.role==='volume'),tone=circuit.components.find(p=>p.role==='tone'),cap=part('capacitor'),selector=circuit.components.find(p=>['blade','blade3'].includes(p.type)),jack=part('jack');
 const pickup=circuit.components.find(p=>p.type==='singlecoil'&&idx.net(p.id+'.hot').has(volume?.id+'.lug3'));
 if(circuit.state.wiring!=='modern'||!pickup||!volume||!tone||!cap||!selector||!jack||!idx.net(volume.id+'.lug2').has(jack.id+'.tip')||!idx.net(volume.id+'.lug3').has(cap.id+'.a')||!idx.net(cap.id+'.b').has(tone.id+'.lug2')||!idx.net(tone.id+'.lug1').has(jack.id+'.sleeve')||!idx.net(volume.id+'.lug1').has(jack.id+'.sleeve')||idx.net(volume.id+'.lug3').has(jack.id+'.sleeve')||!circuit.connections.some(w=>w.from===pickup.id+'.hot'&&w.to.startsWith(selector.id+'.'))||!circuit.connections.some(w=>w.from.startsWith(selector.id+'.')&&w.to===volume.id+'.lug3')||idx.net(cap.id+'.a').has(cap.id+'.b')||idx.net(jack.id+'.tip').has(jack.id+'.sleeve'))throw Error('Unsupported educational signal topology');
 return {pickup,selector,volume,tone,cap,jack,signal:[pickup.id+'.hot',volume.id+'.lug3',volume.id+'.lug2',jack.id+'.tip'],loading:[volume.id+'.lug3',cap.id+'.a',cap.id+'.b',tone.id+'.lug2',tone.id+'.lug1',jack.id+'.sleeve']};
}
