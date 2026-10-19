// Explicit local frozen-source diagnostic; never run by CI without those source bytes.
// Uses synthetic routes/images. It is not a production reconstruction or browser test.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {fixture,writeFiles,BASE_FILES} from './fixture.mjs';
import {loadJSON,readRegular,sha256,stable,makeManifest} from '../../scripts/atlas/core.mjs';
import {htmlTokens} from '../../scripts/atlas/references.mjs';
import {footerInsertion,makeProtection,makePolicy,assembleStaticOverlay,verifyArtifact} from '../../scripts/atlas/assemble-static-overlay.mjs';
const [sourceRoot,output,capturedHomepage]=process.argv.slice(2);
if(!sourceRoot||!output)throw Error('Usage: node spectre-readiness.mjs FROZEN_DIST NEW_OUTPUT [CAPTURED_HOMEPAGE]');
await fs.mkdir(output);const f=await fixture(output);
const spec=(await loadJSON(fileURLToPath(new URL('../../docs/atlas/spectre-source.json',import.meta.url)))).value;
assert.equal(spec.commit,'2c85049b8583fc225d79406ba36e56b01bec9ad4');assert.equal(spec.tree,'e1136da6ba9b3b8312dfbce0f73113dd2f2a7a19');
const sourceBytes={};
for(const item of spec.files){const b=await readRegular(path.join(sourceRoot,item.path));assert.equal(b.length,item.size);assert.equal(sha256(b),item.sha256);sourceBytes[item.path]=b;}
const html=sourceBytes['landing-v02/index.html'].toString('utf8');
const stubs={};for(const t of htmlTokens(html))if(t.name==='a'&&t.attrs.href?.startsWith('/')&&t.attrs.href.endsWith('/')&&t.attrs.href!=='/')stubs[t.attrs.href.slice(1)+'index.html']='<html><head><title>Synthetic linked route</title></head><body>Synthetic only</body></html>\n';
stubs['assets/apparition-logo-email.png']=BASE_FILES['products/cde-synthetic/image.png'];
await writeFiles(f.baselineRoot,stubs);await writeFiles(f.overlayRoot,sourceBytes);
f.baselineManifest=await makeManifest(f.baselineRoot,{provenance:{type:'synthetic',description:'Synthetic routes and logo; actual frozen Spectre overlay verified independently'}});
f.overlayManifest=await makeManifest(f.overlayRoot,{criticalRoutes:['index.html','landing-v02/index.html'],provenance:{type:'supplied-artifact',description:'Exact frozen Spectre four source files plus synthetic homepage footer insertion'}});
f.protectedManifest=makeProtection(f.baselineManifest);f.policy=makePolicy(f.baselineManifest,f.overlayManifest,f.protectedManifest);
const assembled=await assembleStaticOverlay(f);const verified=await verifyArtifact(f.output,{expectedReceiptSHA256:assembled.receiptSHA256});
assert.equal(verified.valid,true);
assert.deepEqual(await fs.readFile(path.join(f.baselineRoot,'sitemap.xml')),await fs.readFile(path.join(f.output,'site/sitemap.xml')));
for(const item of spec.files)assert.equal(sha256(await readRegular(path.join(f.output,'site',item.path))),item.sha256);
assert.ok(!/fetch\(|XMLHttpRequest|WebSocket/.test(sourceBytes['landing-v02/spectre.mjs'].toString('utf8')));
let liveFooter=null;if(capturedHomepage){const b=await readRegular(capturedHomepage),changed=footerInsertion(b),link=Buffer.from('<a href="/landing-v02/">Preview Homepage V02 →</a>');assert.deepEqual(Buffer.from(changed.toString('utf8').replace(link.toString('utf8'),'')),b);liveFooter={beforeSHA256:sha256(b),afterSHA256:sha256(changed),onlyExactInsertion:true,notPublished:true};}
const report={schemaVersion:1,classification:'Synthetic baseline + authentic frozen overlay; not production-complete',source:spec,assembled,verified,liveFooter,unchangedBaselineFiles:assembled.protectedUnchanged,allFourOverlayHashesMatch:true,sitemapUnchanged:true,noNetworkAPIsInSpectreModule:true,browserAcceptance:false,publicationAuthorised:false};
await fs.writeFile(path.join(output,'spectre-readiness.json'),stable(report));process.stdout.write(stable(report));
