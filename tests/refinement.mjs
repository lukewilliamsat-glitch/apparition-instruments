import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requirePublicPlatform} from '../dist/wiring-generator/public-platform.mjs';
import {makeCircuit} from '../dist/wiring-generator/model.mjs';
assert.equal(requirePublicPlatform({guitar:'les-paul'}).guitar,'les-paul');
for(const guitar of ['sg','prs','strat','tele']){assert.throws(()=>requirePublicPlatform({guitar}));assert(makeCircuit({guitar}).components.length);}
const html=readFileSync('dist/wiring-generator/index.html','utf8');assert(html.includes('type="hidden" name="guitar" value="les-paul"'));assert(!html.includes('<select name="guitar">'));
console.log('Public Generator is Les Paul only; all other platform engines remain operational.');
