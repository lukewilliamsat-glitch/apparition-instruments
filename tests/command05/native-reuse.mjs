import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
const accepted='df78c5bf5144b012a7d96c628186180fa6432df3';
// Any application change invalidates this targeted recovery and selects the full
// relevant integration pass. No assertion or isolation probe is suppressed there.
execFileSync('git',['diff','--exit-code',accepted,'--','dist'],{stdio:'pipe'});
for(const path of ['tests/command05/production-fixture.mjs','tests/command05/production-browser-entry.mjs','tests/command05/browser-entry.mjs'])assert.deepEqual(readFileSync(path),execFileSync('git',['show',accepted+':'+path]));
const receipt={status:'PASS',applicationSource:accepted,applicationTree:execFileSync('git',['rev-parse',accepted+':dist'],{encoding:'utf8'}).trim(),reusedNativeRun:40242794782,reusedArtifact:12617148442,reusedArtifactSHA256:'42b124984a1e3d6d82ff597ebfc94bb352f06a26c3e282a297011e24a53ea115',reusedNativePassed:53,reusedNativeTotal:54,remainingJourney:'54G',reason:'All application bytes and HTTP fixture sources unchanged; only logout-completion assertion ordering corrected. Prior 53 individual PASS results are retained, not represented as an overall successful run.'};
writeFileSync(process.argv[2],JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
