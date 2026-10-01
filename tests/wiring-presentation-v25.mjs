import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {makeCircuit,endpoint,net} from '../dist/wiring-generator/model.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {presentationFor} from '../dist/wiring-generator/presentation.mjs';
import {routeDiagram} from '../dist/wiring-generator/routing.mjs';
import {visualCrossings,trueJunctions} from '../dist/wiring-generator/diagram-semantics.mjs';
import {explainSelection,selectorContext} from '../dist/wiring-generator/explanation.mjs';
import {generatorURL,readGeneratorURL} from '../dist/wiring-generator/session.mjs';
let cases=0,labels=0,removed=0;
for(const guitar of ['tele','strat','les-paul','sg'])for(const wiring of ['tele','strat'].includes(guitar)?['modern']:['modern','50s','60s'])for(const bleed of wiring==='50s'?['none']:['none','prs','cap','duncan']){
 let physicalRoutes,buildSVG;
 for(const position of guitar==='tele'?['1','2','3']:guitar==='strat'?['1','2','3','4','5']:['neck','both','bridge']){
  const win=new Window({settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}}),parse=s=>new win.DOMParser().parseFromString(s.replace(/<style>[\s\S]*?<\/style>/,''),'image/svg+xml');
  const c=makeCircuit({guitar,wiring,position,bleed}),before=JSON.stringify(c),truth={ground:[...net(c,'jack.sleeve')],output:[...net(c,'jack.tip')]};
  const build=parse(drawCircuit(c,{mode:'build'})),trace=parse(drawCircuit(c,{mode:'trace'}));
  assert.equal(build.querySelectorAll('[data-component]').length,c.components.length);
  assert.equal(build.querySelectorAll('[data-wire]').length,c.connections.length);
  assert.equal(build.querySelectorAll('circle[data-terminal]').length,c.components.reduce((sum,p)=>sum+Object.keys(p.terminals).length,0));
  assert.equal(build.querySelectorAll('[data-contact-state]').length,0);assert.equal(build.querySelectorAll('.blade-terminal-label').length,0);assert.equal(build.querySelectorAll('[data-pickup-profile]').length,0);
  assert(build.querySelectorAll('text').length<trace.querySelectorAll('text').length);labels+=trace.querySelectorAll('text').length;removed+=trace.querySelectorAll('text').length-build.querySelectorAll('text').length;
  for(const mode of ['build','trace','explain']){
   const policy=presentationFor(c,mode);assert.equal(policy.circuit,c);const svg=parse(drawCircuit(c,{mode})),routes=routeDiagram(c,{mode:policy.routing});
   for(const w of c.connections){const a=endpoint(c,w.from),b=endpoint(c,w.to),r=routes.get(w.id);assert.deepEqual(r[0],[a.x,a.y]);assert.deepEqual(r.at(-1),[b.x,b.y]);assert(svg.querySelector('[data-wire="'+w.id+'"]'));}
   for(const p of c.components)for(const key of Object.keys(p.terminals)){const t=svg.querySelector('circle[data-terminal="'+p.id+'.'+key+'"]');assert(t.getAttribute('aria-label').includes(key));assert.equal(t.getAttribute('tabindex'),'0');}
   for(const j of trueJunctions(c))assert(svg.querySelector('[data-junction="'+j.ref+'"],[data-solder-point="'+j.ref+'"]'));
   for(const crossing of visualCrossings(c,{mode:policy.routing}))assert(svg.querySelector('[data-crossing-wire="'+crossing.wires[0]+'"]')||svg.querySelector('[data-crossing-wire="'+crossing.wires[1]+'"]'));
   for(const p of c.components){const info=explainSelection(c,'component',p.id);assert.equal(info.value,p.value);assert(info.link.startsWith('/luthier-hub/'));assert.equal(info.connections.length,c.connections.filter(w=>w.from.startsWith(p.id+'.')||w.to.startsWith(p.id+'.')).length);}
   assert.equal(JSON.stringify(c),before);assert.deepEqual({ground:[...net(c,'jack.sleeve')],output:[...net(c,'jack.tip')]},truth);
  }
  const routes=JSON.stringify([...routeDiagram(c,{mode:'build'})]);physicalRoutes??=routes;assert.equal(routes,physicalRoutes,'Build copper geometry is independent of selector state');const stable=drawCircuit(c,{mode:'build'});buildSVG??=stable;assert.equal(stable,buildSVG,'Build diagram remains identical between positions');
  const context=selectorContext(c),expected=guitar==='tele'?{'1':['BRIDGE PICKUP'],'2':['NECK PICKUP','BRIDGE PICKUP'],'3':['NECK PICKUP']}[position]:guitar==='strat'?{'1':['BRIDGE PICKUP'],'2':['MIDDLE PICKUP','BRIDGE PICKUP'],'3':['MIDDLE PICKUP'],'4':['NECK PICKUP','MIDDLE PICKUP'],'5':['NECK PICKUP']}[position]:position==='both'?['NECK HUMBUCKER','BRIDGE HUMBUCKER']:[position.toUpperCase()+' HUMBUCKER'];assert.deepEqual(context.active,expected);assert.deepEqual(context.contacts,c.contacts);
  for(const w of c.connections.filter(w=>w.network==='auxiliary')){const part=endpoint(c,w.to).component;const component=['capacitor','resistor','network'].includes(part.type)?part:endpoint(c,w.from).component;assert.match(explainSelection(c,'component',component.id).purpose,/treble bleed/);}
  cases++;await win.happyDOM.close();
 }
}
const c=makeCircuit();for(const mode of ['build','trace','explain']){const url=generatorURL(c.state,null,mode),saved=readGeneratorURL(new URL(url,'https://fixture.test').search);assert.deepEqual(saved.state,c.state);assert.equal(saved.mode,mode);}assert.equal(readGeneratorURL('?g='+encodeURIComponent(JSON.stringify(c.state))).mode,'build');assert.equal(readGeneratorURL('?view=unknown').mode,'build');
const css=readFileSync('dist/wiring-generator/generator.css','utf8');for(const token of ['min-width:650px','overflow:auto','touch-action:pan-x pan-y','.presentation-modes button','min-height:44px','[hidden]','focus-visible'])assert(css.includes(token));
const workflow=readFileSync('.github/workflows/static.yml','utf8');assert(workflow.includes("if: github.event_name != 'push' || !contains(github.event.head_commit.message, '[static-only]')"));
console.log(`${cases} presentation cases PASS: exact components/terminals/wires/contacts/nets, selector-independent Build, crossings, Explain context, legacy URLs. Technical text reduced by ${removed}/${labels}.`);
