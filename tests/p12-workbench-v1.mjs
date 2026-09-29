import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {forgeCircuit} from '../dist/circuit-forge/model.mjs';
import {selectorReport,changeReport,inspectSelection,selectionHighlight} from '../dist/circuit-forge/workbench.mjs';
import {forgeDiagram,visualCrossings} from '../dist/circuit-forge/presentation.mjs';
import {net} from '../dist/wiring-generator/model.mjs';
const circuit=choices=>forgeCircuit(choices).circuit;
const base=circuit(),fifties=circuit({wiring:'50s'});
const differences=changeReport(base,fifties);
assert.equal(differences.heading,'What changed');assert(differences.lines.some(x=>x.includes('NECK VOLUME')&&x.includes('Lug 2')));
assert(differences.lines.some(x=>x.includes('BRIDGE VOLUME')&&x.includes('Lug 2')));
assert.equal(changeReport(base,circuit({neckCap:'0.047'})).lines.length,1);
assert.match(changeReport(base,circuit({position:'neck'})).lines.join(' '),/Selector now connects Neck/);
assert.match(changeReport(base,circuit({bleed:'duncan'})).lines.join(' '),/BLEED RESISTOR/);
assert.equal(changeReport(base,circuit()).heading,'Circuit unchanged');
for(const wiring of ['modern','50s','60s'])for(const bleed of (wiring==='50s'?['none']:['none','prs','cap','duncan']))for(const neckCap of ['0.022','0.033','0.047'])for(const bridgeCap of ['0.022','0.033','0.047'])for(const position of ['neck','both','bridge']){
 const c=circuit({wiring,bleed,neckCap,bridgeCap,position});assert(c.components.length>0);
 assert.equal(selectorReport(c).channels.filter(x=>x.active).length,position==='both'?2:1);
 assert(inspectSelection(c,{kind:'terminal',ref:'jack.tip'}).references.includes('jack.tip'));
}
assert.throws(()=>forgeCircuit({wiring:'50s',bleed:'duncan'}),/50s wiring/);
for(const [position,expected] of [['neck',[true,false]],['both',[true,true]],['bridge',[false,true]]]){
 const c=circuit({position}),report=selectorReport(c);
 assert.deepEqual(report.channels.map(x=>x.active),expected);
 assert.equal(report.closed.length,position==='both'?2:1);
 assert.equal(net(c,'jack.tip').has('neckVolume.lug2'),expected[0]);
 assert.equal(net(c,'jack.tip').has('bridgeVolume.lug2'),expected[1]);
 const info=inspectSelection(c,{kind:'terminal',ref:'jack.tip'});
 assert.equal(info.output,true);assert(info.contacts.length===report.closed.length);
 assert.deepEqual(selectionHighlight(c,{kind:'terminal',ref:'jack.tip'}).refs,info.references);
}
const part=inspectSelection(base,{kind:'component',id:'neckVolume'});
assert(part.terminals.some(t=>t.ref==='neckVolume.lug2'&&t.connected));
assert.match(part.purpose,/wiper/);
assert.equal(selectionHighlight(base,{kind:'component',id:'neckVolume'}).id,'neckVolume');
const wire=inspectSelection(base,{kind:'wire',id:'neckOutput'});
assert(wire.connections.some(x=>x.id==='neckOutput'));assert(wire.references.includes('selector.neck'));
assert.equal(inspectSelection(base,{kind:'wire',id:'missing'}),null);
assert.equal(inspectSelection(base,{kind:'terminal',ref:'missing.bad'}),null);
assert(!inspectSelection(base,{kind:'terminal',ref:'neckCap.a'}).references.includes('neckCap.b'));
assert(visualCrossings(base).length>0);assert(forgeDiagram(base,{selection:selectionHighlight(base,{kind:'wire',id:'neckOutput'})}).includes('forge-crossing'));
const html=readFileSync('dist/circuit-forge/index.html','utf8'),app=readFileSync('dist/circuit-forge/app.mjs','utf8'),css=readFileSync('dist/circuit-forge/forge.css','utf8');
for(const id of ['forge-controls','forge-diagram','forge-inspection','forge-parts','forge-change','forge-contacts','forge-viewport','forge-selector'])assert(html.includes(`id="${id}"`));
assert(app.includes('selectorReport(circuit)'));assert(app.includes('inspectSelection(circuit,selection)'));assert(app.includes('forgeDiagram(circuit'));assert(css.includes('max-width:850px'));assert(css.includes(':focus-visible'));
console.log('Circuit Forge workbench: state, selector, inspection, explanation and UI contracts PASS');
