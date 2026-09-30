import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeCircuit,endpoint} from '../dist/wiring-generator/model.mjs';
import {workshopGuide,terminalDescription} from '../dist/wiring-generator/build-guide.mjs';
import {pickupConventions,resolveConvention,conductorRoles} from '../dist/wiring-generator/colours.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {visualCrossings,trueJunctions} from '../dist/wiring-generator/diagram-semantics.mjs';
for(const wiring of ['modern','50s','60s'])for(const bleed of wiring==='50s'?['none']:['none','prs','cap','duncan']){
 const c=makeCircuit({wiring,bleed,pickupProfiles:{neck:'duncan',bridge:'dimarzio'}}),before=JSON.stringify(c),g=workshopGuide(c);
 assert.deepEqual(g.connections.map(r=>[r.id,r.from,r.to]),c.connections.map(w=>[w.id,w.from,w.to]));assert.equal(g.groups.flatMap(x=>x.connections).length,c.connections.length);assert.equal(new Set(g.groups.flatMap(x=>x.connections).map(x=>x.id)).size,c.connections.length);
 assert.equal(g.parts.reduce((n,p)=>n+p.quantity,0),c.components.length);assert.equal(JSON.stringify(c),before,'guide never changes topology');
 for(const row of g.connections){assert(row.fromLabel.includes(endpoint(c,row.from).terminal.label));assert(row.toLabel.includes(endpoint(c,row.to).terminal.label));if(row.casings.length)assert.match(row.method,/casing solder/);for(const ref of row.shared)assert(c.connections.filter(w=>w.from===ref||w.to===ref).length>1);}
 for(const row of g.connections.filter(x=>x.kind==='local-series'))assert.match(row.method,/insulate.*not a ground/);
 assert.match(terminalDescription(c,'neckVolume.lug2').label,/wiper/);assert.match(terminalDescription(c,'jack.tip').label,/signal/);assert.match(terminalDescription(c,'jack.sleeve').label,/ground/);assert.equal(g.contacts.length,c.contacts.length);
 const exported=drawCircuit(c,{exporting:true});assert(!exported.includes('class="wire-hit"'));assert(!exported.includes('tabindex='));for(const row of g.connections)assert(exported.includes('data-wire="'+row.id+'"'));for(const j of trueJunctions(c))assert(exported.includes('data-junction="'+j.ref+'"')||exported.includes('data-solder-point="'+j.ref+'"'));
 const cross=visualCrossings(c)[0];if(cross){const svg=drawCircuit(c,{selection:{kind:'physical-wire',id:cross.wires[0]}});assert(svg.includes('data-crossing-wire="'+cross.wires[0]+'" data-view-state="selected"'));}
}
for(const [id,entry] of Object.entries(pickupConventions)){const c=makeCircuit({pickupProfiles:{neck:id,bridge:'generic'}}),g=workshopGuide(c),profile=resolveConvention(id);for(const [key,fn] of Object.entries(conductorRoles))assert(g.pickups[0].leads.find(x=>x.ref.endsWith('.'+key)).label.includes(profile.wires[key][1]));if(!entry.verified)assert.match(g.pickups[0].profile.label,/not yet verified/);assert.equal(g.pickups[1].profile.status,'generic');}
for(const guitar of ['prs','strat','tele']){const c=makeCircuit({guitar});assert.equal(workshopGuide(c).connections.length,c.connections.length);for(const p of c.components)for(const key of Object.keys(p.terminals))assert(terminalDescription(c,p.id+'.'+key).label);assert(drawCircuit(c,{exporting:true}).includes('SLEEVE / GROUND'));}
const css=readFileSync('dist/wiring-generator/generator.css','utf8');for(const token of ['size:A4 portrait','break-inside:avoid','table-layout:fixed','overflow-wrap:anywhere','touch-action:pan-x pan-y','min-height:44px'])assert(css.includes(token));
console.log('Generator V2: topology/guide/list parity, parts, all existing conductor mappings, terminal/contact identity, junction/hop/export and A4/mobile contracts PASS');
