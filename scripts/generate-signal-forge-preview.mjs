// Homepage circuit artwork comes directly from the shared graph and renderer.
import {writeFileSync} from 'node:fs';
import {homepageCircuit,homepageSpecificationKey} from '../dist/electronics/presentation/homepage-state.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
const circuit=homepageCircuit();
const homeSVG=svg=>svg.replace('<svg ', '<svg data-homepage-specification="'+homepageSpecificationKey(circuit).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')+'" ');
const svg=homeSVG(drawCircuit(circuit,{filter:'signal',exporting:true,palette:'editorial'}))
 .replace('viewBox="0 0 1320 1275"','viewBox="0 125 1320 1030"')
 .replace('<rect width="1320" height="1275" fill="#f5f5f5"/>','<rect width="1320" height="1275" fill="#f5f5f5"/>');
writeFileSync(new URL('../dist/assets/signal-forge-circuit.svg',import.meta.url),svg);

// The full homepage demonstration also consumes current shared artwork.
writeFileSync(new URL('../dist/assets/signal-forge-full.svg',import.meta.url),homeSVG(drawCircuit(circuit,{exporting:true,mode:'trace',palette:'editorial'})));
