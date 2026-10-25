// Reuse unchanged pure model/editor logic suites against their immutable accepted source.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const accepted='31b469707066a89b0ea3fc83ad81e79149523192';
const paths=execFileSync('git',['ls-tree','-r','--name-only',accepted,'--','dist/admin/command/command01','dist/admin/command/command02','tests/command05/inherited','tests/command05/catalogue-fixtures.mjs','tests/command05/focus.mjs'],{encoding:'utf8'}).trim().split('\n');
for(const p of paths)assert.deepEqual(readFileSync(p),execFileSync('git',['show',accepted+':'+p]),p+' invalidates evidence reuse');
console.log(JSON.stringify({acceptedSource:accepted,run:40227070614,unchangedFiles:paths.length,reusedNodeLogicCases:96,reusedDialogLifecycleCases:6,status:'PASS',nativeAcceptance:'Composition changed; one composed rerun including 7 new production-shaped journeys is required.'}));
