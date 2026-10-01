import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {fitDiagram} from '../dist/wiring-generator/diagram-navigation.mjs';
import {makeCircuit,endpoint,net} from '../dist/wiring-generator/model.mjs';
import {forgeDiagram} from '../dist/circuit-forge/presentation.mjs';
import {pickupLayoutArtwork} from '../dist/wiring-generator/components.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {explainSelection} from '../dist/wiring-generator/explanation.mjs';
assert(pickupLayoutArtwork([{position:'bridge',type:'single'}]).includes('.pickup-layout-art text{'));
const widths=[320,390,768,1024,1400,1920],css=readFileSync('dist/wiring-generator/workbench.css','utf8'),forge=readFileSync('dist/circuit-forge/forge.css','utf8'),generator=readFileSync('dist/wiring-generator/generator.css','utf8');
for(const width of widths){const padding=width<=850?10:Math.min(48,width*.03),inner=width-padding*2,viewport=width<=850?inner:width<=1300?inner-224-16:inner-224-254-32,height=width<=850?400:620;
 const fit=fitDiagram({width:viewport,height,boxWidth:1320,boxHeight:1275});assert(fit.width<=viewport-24+1e-9);assert(fit.height<=height-24+1e-9);assert(Math.abs(fit.width/fit.height-1320/1275)<1e-9);assert(fit.width>200);if(width>=1400)assert(viewport/inner>.59);assert.equal(fitDiagram({width:0,height,boxWidth:1320,boxHeight:1275}),null);}
for(const token of ['min-height:44px','flex-wrap:wrap','--bench-paper:#f3f1eb','min-width:0','margin-inline:auto','explanation-section','@media print'])assert(css.includes(token));for(const token of ['grid-template-columns:224px minmax(0,1fr) 254px','@media(max-width:1300px)','@media(max-width:850px)','height:clamp(480px,70vh,760px)','forge-parts button[aria-pressed=true]'])assert(forge.includes(token));assert(generator.includes('height:clamp(340px,60vh,620px)'));assert(generator.includes('width:100%;max-width:1920px'));
const win=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true}});
for(const guitar of ['les-paul','sg','tele','strat'])for(const wiring of ['tele','strat'].includes(guitar)?['modern']:['modern','50s','60s'])for(const position of guitar==='tele'?['1','2','3']:guitar==='strat'?['1','2','3','4','5']:['neck','both','bridge']){
 const circuit=makeCircuit({guitar,wiring,position}),before=JSON.stringify(circuit);
 for(const mode of ['build','trace','explain']){const svg=new win.DOMParser().parseFromString(drawCircuit(circuit,{mode}),'image/svg+xml').documentElement;assert.equal(svg.querySelectorAll('.component').length,circuit.components.length);
 for(const part of circuit.components)for(const [key,t] of Object.entries(part.terminals)){const marker=svg.querySelector('circle[data-terminal="'+part.id+'.'+key+'"]');assert.equal(Number(marker.getAttribute('cx')),part.x+t.x);assert.equal(Number(marker.getAttribute('cy')),part.y+t.y);assert.equal(marker.getAttribute('tabindex'),'0');}
 for(const w of circuit.connections){assert(svg.querySelector('[data-wire="'+w.id+'"]'));assert(net(circuit,w.from).has(w.to));}
 assert.deepEqual([...svg.querySelectorAll('[data-contact-state="closed"]')].map(n=>[n.dataset.contactFrom,n.dataset.contactTo]),mode==='build'||!['tele','strat'].includes(guitar)?[]:circuit.contacts);
 if(!['tele','strat'].includes(guitar))assert.equal((forgeDiagram(circuit,{mode}).match(/class="forge-closed-contact"/g)||[]).length,mode==='build'?0:circuit.contacts.length);
 if(['tele','strat'].includes(guitar)){const part=circuit.components.find(c=>c.id==='selector'),heading=[...svg.querySelectorAll('.part-title')].find(n=>n.textContent===part.label);assert.equal(Number(heading.getAttribute('y')),-58);const labels=[...svg.querySelectorAll('.blade-terminal-label')];for(const label of labels){const t=part.terminals[label.textContent];assert(Math.abs(Number(label.getAttribute('y'))-t.y)>=16);}assert.equal(labels.length,mode==='build'?0:8);assert(svg.textContent.includes('SOLDER SIDE'));assert(svg.querySelector('.common-lug'));}
 }
 const volume=circuit.components.find(p=>p.role==='volume'),relatedPart=circuit.connections.find(w=>[w.from,w.to].some(r=>r.startsWith(volume.id+'.')));const other=[relatedPart.from,relatedPart.to].find(r=>!r.startsWith(volume.id+'.')).split('.')[0];const svg=new win.DOMParser().parseFromString(drawCircuit(circuit,{mode:'explain',selection:{kind:'component',id:volume.id}}),'image/svg+xml').documentElement;assert.equal(svg.querySelector('[data-component="'+volume.id+'"]').dataset.selected,'true');assert(svg.querySelector('[data-component="'+other+'"]').classList.contains('related'));assert(svg.querySelector('.component.muted'));const explanation=explainSelection(circuit,'component',volume.id);assert.match(explanation.changeNote,/loading/);assert(explanation.valueNote.includes(volume.value));assert.equal(JSON.stringify(circuit),before);
}
await win.happyDOM.close();console.log('V3.1 contracts: 6-width fit geometry, sidebars/canvas/control sizing, all supported positions/styles/modes, fixed anchors/contacts, blade label separation and Explain emphasis PASS');
