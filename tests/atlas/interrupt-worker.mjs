// Dedicated synthetic SIGKILL fixture worker; no network or external data.
import path from 'node:path';
import {loadJSON} from '../../scripts/atlas/core.mjs';
import {assembleStaticOverlay} from '../../scripts/atlas/assemble-static-overlay.mjs';
const root=process.argv[2];
const get=async name=>(await loadJSON(path.join(root,name))).value;
await assembleStaticOverlay({baselineRoot:path.join(root,'baseline'),overlayRoot:path.join(root,'overlay'),output:path.join(root,'candidate'),baselineManifest:await get('baseline-manifest.json'),overlayManifest:await get('overlay-manifest.json'),protectedManifest:await get('protection.json'),policy:await get('policy.json'),onPhase:async phase=>{if(phase==='baseline-copied'){process.stdout.write('STAGED\n');setInterval(()=>{},1000);await new Promise(()=>{});}}});
