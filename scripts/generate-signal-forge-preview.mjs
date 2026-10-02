// Homepage circuit artwork comes directly from the shared graph and renderer.
import {writeFileSync} from 'node:fs';
import {forgeCircuit} from '../dist/circuit-forge/model.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
const {circuit}=forgeCircuit({position:'neck'});
const svg=drawCircuit(circuit,{filter:'signal',exporting:true})
 .replace('viewBox="0 0 1320 1275"','viewBox="0 125 1320 1030"')
 .replace('<rect width="1320" height="1275" fill="#f5f5f5"/>','<rect width="1320" height="1275" fill="#f5f5f5"/>');
writeFileSync(new URL('../dist/assets/signal-forge-circuit.svg',import.meta.url),svg);

// The full homepage demonstration also consumes current shared artwork.
writeFileSync(new URL('../dist/assets/signal-forge-full.svg',import.meta.url),drawCircuit(circuit,{exporting:true,mode:'trace'}));
