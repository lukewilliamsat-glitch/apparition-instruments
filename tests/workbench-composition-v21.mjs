import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {makeCircuit,endpoint} from '../dist/wiring-generator/model.mjs';
import {toneSplitModifier,bridgeSplitModifier} from '../dist/electronics/switching/devices.mjs';
import {composeWorkbench} from '../dist/wiring-generator/composition.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {routeDiagram,componentBounds,protectedLabelRegions} from '../dist/wiring-generator/routing.mjs';
import {workbenchOverview} from '../dist/electronics/ui/workbench-overview.mjs';
const matrix=[];
for(const guitar of ['les-paul','sg'])for(const wiring of ['modern','50s','60s'])for(const hardware of [[],['neck'],['bridge'],['neck','bridge']])for(const n of hardware.includes('neck')?['down','up']:['down'])for(const b of hardware.includes('bridge')?['down','up']:['down'])for(const position of ['neck','both','bridge'])matrix.push({guitar,wiring,position,...hardware.length?{switching:hardware.map(p=>toneSplitModifier(p,p==='neck'?n:b))}:{}});
for(const hardware of [false,true])for(const position of ['1','2','3','4','5'])for(const state of hardware?['down','up']:['down'])matrix.push({guitar:'hss',position,...hardware?{switching:[bridgeSplitModifier(state)]}:{}});
for(const guitar of ['tele','strat'])for(const position of guitar==='tele'?['1','2','3']:['1','2','3','4','5'])matrix.push({guitar,position});
let count=0;
for(const config of matrix){
 const source=makeCircuit(config),snapshot=JSON.stringify(source),c=composeWorkbench(source);assert.deepEqual(c.contacts,source.contacts);assert.deepEqual(c.connections,source.connections);assert.deepEqual(c.elements,source.elements);for(const p of c.components)assert.deepEqual(p.terminals,source.components.find(s=>s.id===p.id).terminals);
 for(const device of c.components.filter(p=>p.type==='dpdt')){const host=c.components.find(p=>p.id===device.mechanicalHost);assert.equal(device.y-host.y,260);assert.equal(device.x,host.x);assert(device.y+componentBounds({...device,y:0}).b<1190);}
 const overview=workbenchOverview(source);assert(overview.rows.find(r=>r[0]==='Participating pickups')[1]);
 for(const mode of ['build','trace']){
  const routes=routeDiagram(c,{mode});for(const w of c.connections){const a=endpoint(c,w.from),b=endpoint(c,w.to),points=routes.get(w.id);assert.deepEqual(points[0],[a.x,a.y]);assert.deepEqual(points.at(-1),[b.x,b.y]);assert(points.slice(1).every((p,i)=>p[0]===points[i][0]||p[1]===points[i][1]),w.id+' orthogonal');
   if(!['signal','switching','tone'].includes(w.category)||w.insulate)continue;
   const ends=[w.from.split('.')[0],w.to.split('.')[0]],regions=[...c.components.filter(p=>!ends.includes(p.id)).map(componentBounds),...protectedLabelRegions(c).filter(p=>!ends.some(id=>p.id===id+'Label'))];
   for(const r of regions)for(let n=1;n<points.length;n++){const a=points[n-1],b=points[n],hit=a[0]===b[0]?a[0]>r.l&&a[0]<r.r&&Math.max(a[1],b[1])>r.t&&Math.min(a[1],b[1])<r.b:a[1]>r.t&&a[1]<r.b&&Math.max(a[0],b[0])>r.l&&Math.min(a[0],b[0])<r.r;assert(!hit,config.guitar+' '+config.wiring+' '+w.id+' crosses '+r.id);}
  }
 }
 // DOM checks representative hardware; matrix clearance and integrity stay pure.
 if(count%15===0||config.guitar==='hss'&&config.switching){const win=new Window({settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});for(const mode of ['build','trace','explain']){const svg=new win.DOMParser().parseFromString(drawCircuit(source,{mode}).replace(/<style>[\s\S]*?<\/style>/,''),'image/svg+xml');assert.equal(svg.querySelectorAll('[data-component]').length,c.components.length);assert.equal(svg.querySelectorAll('[data-wire]').length,c.connections.length);assert.equal(svg.querySelectorAll('circle[data-terminal]').length,c.components.reduce((sum,p)=>sum+Object.keys(p.terminals).length,0));assert.equal(svg.querySelectorAll('[data-contact-from]').length,mode==='build'?0:c.contacts.length);for(const [a,b] of mode==='build'?[]:c.contacts)assert(svg.querySelector(`[data-contact-from="${a}"][data-contact-to="${b}"]`));assert.equal(svg.querySelectorAll('.assembly-chassis').length,c.components.filter(p=>p.type==='dpdt').length);if(c.components.some(p=>p.type==='blade')){assert.equal(svg.querySelectorAll('.blade-contact-bank').length,2);assert.match(svg.querySelector('text.blade-terminal-label').textContent,/COM/);}for(const contact of svg.querySelectorAll('[data-contact-from^="selector."]'))if(c.components.find(p=>p.id==='selector').type==='toggle'){const lane=c.components.find(p=>p.id==='selector').y+54;assert(contact.querySelector('path').getAttribute('d').includes('V'+lane+'H'),'Toggle contact overlay belongs inside its wafer');}assert(svg.querySelector('.part-value'));}await win.happyDOM.close();}
 assert.equal(JSON.stringify(source),snapshot,'Presentation never mutates source graph');count++;
}
console.log('Workbench V2.1: '+count+' hardware/style/selector states; detached geometry, compact assemblies, all physical endpoints, authoritative contacts, Build terminal IDs and protected signal/tone/switch routing PASS');
