import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requirePublicPlatform} from '../dist/wiring-generator/public-platform.mjs';
import {makeCircuit} from '../dist/wiring-generator/model.mjs';
assert.equal(requirePublicPlatform({guitar:'les-paul'}).guitar,'les-paul');
for(const guitar of ['sg','strat','tele']){assert.equal(requirePublicPlatform({guitar}).guitar,guitar);assert(makeCircuit({guitar}).components.length);}assert.throws(()=>requirePublicPlatform({guitar:'prs'}));assert(makeCircuit({guitar:'prs'}).components.length);
const html=readFileSync('dist/wiring-generator/index.html','utf8');assert(html.includes('name="guitar"'));assert(html.includes('id="generator-form"'));assert(readFileSync('dist/wiring-generator/app.mjs','utf8').includes('mountStateConsole'));
console.log('Public Generator uses validated LP/SG/Strat/Tele architectures; PRS remains engine-only.');
