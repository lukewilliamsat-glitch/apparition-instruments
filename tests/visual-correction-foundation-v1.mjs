import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {makeCircuit,terminalTypes} from '../dist/wiring-generator/model.mjs';
import {conventionalSignalStudy} from '../dist/electronics/presentation/educational-truth.mjs';
import {signalPathArtwork,signalPathStyles} from '../scripts/generate-signal-path.mjs';
import {componentArtwork,artworkStyle,editorialDiagramStyle} from '../dist/electronics/presentation/component-artwork.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
const win=new Window(),parse=s=>new win.DOMParser().parseFromString(s,'image/svg+xml');
const circuit=makeCircuit({guitar:'tele',position:'3'}),study=conventionalSignalStudy(circuit);
assert.equal(study.cap.value,'0.047µF');
assert.deepEqual(study.signal,['neckPickup.hot','masterVolume.lug3','masterVolume.lug2','jack.tip']);
assert.deepEqual(study.loading,['masterVolume.lug3','toneCap.a','toneCap.b','neckTone.lug2','neckTone.lug1','jack.sleeve']);
assert.equal(terminalTypes.pot.lug1.label,'Lug 1 · CCW end');assert.equal(terminalTypes.pot.lug2.label,'Lug 2 · wiper');assert.equal(terminalTypes.pot.lug3.label,'Lug 3 · CW end');
for(const [id,field,target] of [['toneFeed','from','masterVolume.lug1'],['toneFeed','from','masterVolume.lug2'],['jackSignal','to','jack.sleeve'],['volumeGround','from','masterVolume.lug3']]){const broken=makeCircuit({guitar:'tele',position:'3'});broken.connections.find(w=>w.id===id)[field]=target;assert.throws(()=>conventionalSignalStudy(broken));}
const doc=parse(signalPathArtwork()),main=doc.querySelector('[data-home-signal-to]'),tone=doc.querySelector('[data-tone-branch]');
assert.equal(main.getAttribute("data-signal-input"),study.volume.id+'.lug3');assert.equal(main.getAttribute("data-signal-output"),study.volume.id+'.lug2');assert.equal(main.getAttribute("data-home-signal-to"),study.jack.id+'.tip');assert.equal(tone.getAttribute("data-from"),study.volume.id+'.lug3');assert.equal(tone.getAttribute("data-to"),'jack.sleeve');assert.equal(tone.getAttribute("data-via"),study.loading.slice(1,-1).join(' '));
const stage=id=>{const g=doc.querySelector(`[data-signal-stage="${id}"]`),m=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/);return m.slice(1).map(Number);};
const anchor=(id,p,ref)=>{const [x,y,s]=stage(id),t=p.terminals[ref];return [x+t.x*s,y+t.y*s];};
const input=anchor('volume',study.volume,'lug3'),wiper=anchor('volume',study.volume,'lug2'),tip=anchor('output',study.jack,'tip'),sleeve=anchor('output',study.jack,'sleeve');
assert(tone.getAttribute('d').startsWith('M'+input.join(' ')), 'Tone visibly originates on authoritative input lug');assert(main.getAttribute('d').includes('M'+wiper.join(' ')), 'Output visibly starts on wiper');assert(main.getAttribute('d').endsWith('V'+tip[1]+'H'+tip[0]), 'Output visibly reaches TIP');assert.notDeepEqual(tip,sleeve);assert(!main.getAttribute('d').includes('M'+anchor('capacitor',study.cap,'a').join(' ')),'Capacitor is never a series stage');
for(const type of ['pot','jack']){const part=circuit.components.find(p=>p.type===type),technical=parse(`<svg>${componentArtwork(part)}</svg>`),editorial=parse(`<svg>${componentArtwork(part,{mode:'editorial'})}</svg>`);for(const [ref,t] of Object.entries(part.terminals).filter(([ref])=>ref!=='case'))for(const view of [technical,editorial])assert(view.querySelector(`.lug-hole[cx="${t.x}"][cy="${t.y}"]`),type+' '+ref+' anchor preserved');assert(!editorial.querySelector('text'));if(type==='pot'){assert.equal(technical.querySelectorAll('.pot-solder-lug').length,3);assert(!technical.querySelector('.case-pad'));assert(Number(technical.querySelector('.part-value').getAttribute('y'))<10);}}
assert(artworkStyle.includes('.switch-leaf{fill:none;'));assert(editorialDiagramStyle.includes('.terminal,.junction,.solder-joint'));assert(signalPathStyles().includes('--art-paper:#22251f'));
const technical=parse(drawCircuit(circuit,{exporting:true})),editorial=parse(drawCircuit(circuit,{exporting:true,palette:'editorial'}));for(const wire of technical.querySelectorAll('[data-wire]'))assert.equal(wire.querySelector('.wire-line').getAttribute('d'),editorial.querySelector(`[data-wire="${wire.dataset.wire}"] .wire-line`).getAttribute('d'));assert(technical.querySelector('.role-tone[stroke="#ad2929"]'));assert(editorial.querySelector('.role-signal[stroke="#b89a5e"]'));assert.equal(editorial.querySelectorAll('.component.muted').length,0);
for(const path of ['dist/index.html','dist/interactive-tools/index.html']){const html=readFileSync(path,'utf8');assert(html.includes('data-signal-input="masterVolume.lug3"'));assert(!html.includes('data-from="masterVolume.lug1"'));}
await win.happyDOM.close();console.log(JSON.stringify({landingTopology:'PASS',negativeTopologyFixtures:4,sharedPotJackAnchors:'PASS',editorialTechnicalSeparation:'PASS'}));
