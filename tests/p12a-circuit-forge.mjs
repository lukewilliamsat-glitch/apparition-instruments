import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {forgeCircuit,forgeChoices,terminalPath,connectionPath} from '../dist/circuit-forge/model.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';

const base=forgeCircuit();assert.equal(base.circuit.state.guitar,'les-paul');assert(base.circuit.components.length>0);assert(base.kitURL.includes('/les-paul-kits/'));
for(const part of base.circuit.components)for(const key of Object.keys(part.terminals))assert(terminalPath(base.circuit,part.id+'.'+key).includes(part.id+'.'+key));
const signal=connectionPath(base.circuit,'jackSignal');assert(signal.includes('jack.tip'));assert(!signal.includes('jack.sleeve'));
assert(!terminalPath(base.circuit,'neckCap.a').includes('neckCap.b'),'capacitance is not a wire');
const neck=forgeCircuit({position:'neck'}),bridge=forgeCircuit({position:'bridge'});assert.notDeepEqual(neck.circuit.contacts,bridge.circuit.contacts);
const modern=forgeCircuit({wiring:'modern'}),fifties=forgeCircuit({wiring:'50s'});assert.notDeepEqual(modern.circuit.connections.map(x=>[x.id,x.from,x.to]),fifties.circuit.connections.map(x=>[x.id,x.from,x.to]));
assert(forgeCircuit({wiring:'50s',bleed:'duncan'}).circuit.connections.some(w=>w.from==='neckVolume.lug3'&&w.to==='neckBleedCap.a'));assert.throws(()=>forgeCircuit({guitar:'prs'}),/Unsupported/);assert.throws(()=>forgeCircuit({position:'99'}),/Unsupported/);assert.throws(()=>forgeCircuit({wiring:'modern',price:0}),/Unsupported/);
for(const value of forgeChoices.neckCap){const c=forgeCircuit({neckCap:value});assert.equal(c.circuit.components.find(x=>x.id==='neckCap').value,value+'µF');}
const svg=drawCircuit(base.circuit);assert(svg.includes('data-terminal="jack.tip"'));assert(svg.includes('data-solder-point="neckVolume.case"'));assert(svg.includes('Separated crossings do not connect'));
const html=readFileSync('dist/circuit-forge/index.html','utf8'),hub=readFileSync('dist/interactive-tools/index.html','utf8'),contract=readFileSync('docs/signal-forge/V1_CONTRACT.md','utf8');
for(const token of ['Signal Forge','id="forge-controls"','id="forge-diagram"','id="forge-inspection"','/treble-bleed-designer/'])assert(html.includes(token),token);
assert(/href="\/circuit-forge\/(?:\?[^"]*)?"/.test(hub));assert(contract.includes('P12A support matrix'));assert(readFileSync('dist/sitemap.xml','utf8').includes('/circuit-forge/'));
console.log('P12A: supported template, graph semantics, isolated electrical paths, diagram and public route PASS');
