// Build-time presentation snapshots; no public runtime graph or backend dependency.
import {readFile,writeFile} from 'node:fs/promises';
import {makeCircuit} from '../dist/wiring-generator/model.mjs';
import {makeInstrumentCircuit} from '../dist/electronics/instrument/circuit.mjs';
import {createReference} from '../dist/electronics/instrument/configuration.mjs';
import {visuals} from '../dist/electronics/presentation/component-artwork.mjs';
const lp=makeCircuit({bleed:'duncan'}),tele=makeInstrumentCircuit(createReference('tele'));
const part=(c,type)=>c.components.find(p=>p.type===type);
export function hubIllustrations(){
 const entries={pickup:[part(lp,'humbucker'),'-30 -8 235 150'],control:[part(lp,'pot'),'-70 15 140 180'],selector:[part(tele,'blade3')||part(tele,'blade'),'-30 -68 245 235'],capacitor:[part(lp,'capacitor'),'-60 -50 120 95'],output:[part(lp,'jack'),'-75 -15 150 155']};
 return Object.fromEntries(Object.entries(entries).map(([key,[source,box]])=>{if(!source)throw Error('Missing illustration source '+key);const p={...source,showState:false,displaySelectorPosition:false,closedContacts:[]};const body=visuals[p.type](p);return [key,`<svg class="hub-component-study hub-study-object" data-shared-artwork="${p.type}" viewBox="${box}" aria-hidden="true" focusable="false">${body}</svg>`];}));
}
export function generateHub(source){const illustrations=hubIllustrations();let count=0;const result=source.replace(/(<div class="hub-study-part" data-study-part="([^"]+)"[\s\S]*?)(<svg class="hub-component-study[\s\S]*?<\/svg>)/g,(all,prefix,key)=>{if(!illustrations[key])throw Error('Unknown Hub illustration '+key);count++;return prefix+illustrations[key];});if(count!==5)throw Error('Expected five existing Hub component illustrations');return result;}
if(process.argv[1]?.endsWith('generate-component-illustrations.mjs')){const path='dist/luthier-hub/index.html';await writeFile(path,generateHub(await readFile(path,'utf8')));console.log('Generated five shared Hub illustrations');}
