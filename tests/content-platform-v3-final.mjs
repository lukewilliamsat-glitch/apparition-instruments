import {execFileSync} from 'node:child_process';
// One integrated cycle across changed contracts; no platform/electrical/business suites.
for(const name of ['hub-cms-admin','hub-cms-data','hub-cms-ux','hub-cms-docx','content-platform-p1','content-platform-p2','content-platform-p3','content-platform-p4','content-platform-p5','content-platform-v3-db','content-platform-v3-preservation']){
 console.log('VALIDATE '+name);execFileSync(process.execPath,['tests/'+name+'.mjs'],{stdio:'inherit'});
}
console.log('CONTENT PLATFORM V3 FINAL: all 11 affected-contract checks PASS.');
