// Homepage circuit artwork comes directly from the shared graph and renderer.
import {writeFileSync} from 'node:fs';
import {homepageCircuit,homepageSpecificationKey} from '../dist/electronics/presentation/homepage-state.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
const circuit=homepageCircuit();
const homeSVG=svg=>svg.replace('<svg ', '<svg data-homepage-specification="'+homepageSpecificationKey(circuit).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')+'" ');
// The full homepage demonstration also consumes current shared artwork.
writeFileSync(new URL('../dist/assets/signal-forge-full.svg',import.meta.url),homeSVG(drawCircuit(circuit,{exporting:true,mode:'trace',palette:'editorial',surface:'dark'})));
