import assert from 'node:assert/strict';
import {validatePreflightRows} from '../../scripts/catalogue-compatibility-preflight.mjs';
const columns=['option_set','option_key','label','aliases','active','sort_order'],base={option_set:'manufacturer',option_key:'pure_tone',label:'Fictional public option',aliases:[],active:true,sort_order:1};let groups=0;
for(const key of ['pure_tone','sprague_sbe','vishay_dale','reverse_audio','push_pull']){const r={...base,option_key:key};assert.deepEqual(validatePreflightRows('options',[r],columns,100),[r]);groups++;}
for(const key of [null,'path/key','space key','éxample','', 'x'.repeat(81)]){assert.throws(()=>validatePreflightRows('options',[{...base,option_key:key}],columns,100));groups++;}
assert.throws(()=>validatePreflightRows('options',[base,base],columns,100));groups++;
assert.throws(()=>validatePreflightRows('options',[{...base,aliases:null}],columns,100));groups++;
assert.throws(()=>validatePreflightRows('options',[{...base,image:'data:image/png;base64,fixture'}],columns,100));groups++;
console.log(JSON.stringify({result:'PASS',groups,requests:0,source:'Existing public option keys contain underscores; raw keys and uniqueness are retained.'}));
