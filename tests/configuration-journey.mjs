import assert from 'node:assert/strict';
import {generatorURL,readGeneratorURL,installationGuideURL,updateKitFromDiagram,builderDiagramURL} from '../dist/wiring-generator/session.mjs';
import {normaliseKit,configurationFromURL,priceKit} from '../dist/les-paul-kits/config.mjs';
import {circuitForKit} from '../dist/les-paul-kits/diagram.mjs';
import {makeCircuit,net} from '../dist/wiring-generator/model.mjs';
import {colourCodes,resolveConvention} from '../dist/wiring-generator/colours.mjs';
import {explainStages} from '../dist/wiring-generator/explain.mjs';
for(const wiring of ['modern','50s','60s'])for(const bleed of ['none','prs','cap','duncan','premium','overkill']){
 const kit=normaliseKit({wiring,bleed,matching:'precision',jack:'pureTone',selector:'none',shaft:'long',caps:'mixed',neckCap:'nissei-033',bridgeCap:'225p-047',model:'Luke #1 & custom'}),drawing={colours:'duncan',position:'neck'};
 const url=generatorURL(drawing,kit),saved=readGeneratorURL(new URL(url,'https://example.org').search);assert.deepEqual(saved.kit,kit);assert.equal(saved.state.colours,'duncan');assert.equal(saved.state.wiring,wiring);
 const guide=installationGuideURL(drawing,kit);assert.deepEqual(readGeneratorURL(new URL(guide,'https://example.org').search),saved);
 const back=builderDiagramURL(saved.kit,saved.state);assert.deepEqual(configurationFromURL(new URL(back,'https://example.org').search),kit);assert.equal(readGeneratorURL(new URL(back,'https://example.org').search).state.colours,'duncan');
 const c=circuitForKit(saved.kit,saved.state);assert(c.components.find(p=>p.id==='selector').existing);assert(!c.components.find(p=>p.id==='jack').existing);assert(!net(c,'jack.tip').has('jack.sleeve'));
 for(const stage of explainStages(c)){assert(stage.ids.every(id=>c.components.some(p=>p.id===id)));assert(stage.description.includes('→'));}
 assert.equal(priceKit(saved.kit).total,priceKit(kit).total);
}
for(const colours of Object.keys(colourCodes)){const c=makeCircuit({colours}),generic=makeCircuit({colours:'generic'});assert.deepEqual(c.connections,generic.connections);if(!colourCodes[colours].verified){assert(colourCodes[colours].label.includes('not yet verified'));assert.deepEqual(colourCodes[colours].wires,colourCodes.generic.wires);}}
for(const guitar of ['strat','tele','prs'])assert.equal(makeCircuit({guitar}).state.position,'1');
assert.throws(()=>readGeneratorURL('?g=broken'));
console.log('18 kit/diagram/guide round trips passed, including premium bleeds, mixed caps, hardware contents, price preservation, conductor conventions and graph-derived explanations.');
