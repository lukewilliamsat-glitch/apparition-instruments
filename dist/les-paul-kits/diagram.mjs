import {normaliseKit,toneCaps,lesPaul,generatorCapValue,generatorBleedValue} from './config.mjs';
import {makeCircuit,routeClearance,validateCircuit,terminalTypes,inspectComponent,net,endpoint} from '../wiring-generator/model.mjs';
import {drawCircuit} from '../wiring-generator/render.mjs';
export function circuitForKit(value,drawing={}){
 const s=normaliseKit(value),caps=toneCaps(s),bleed=lesPaul.bleed[s.bleed],bleedCircuit=generatorBleedValue(bleed),parallel=bleedCircuit==='duncan',c=makeCircuit({...drawing,guitar:'les-paul',wiring:s.wiring,bleed:bleedCircuit,neckCap:generatorCapValue(caps.neck),bridgeCap:generatorCapValue(caps.bridge)});
 for(const p of c.components){if(['humbucker','ground'].includes(p.type))p.existing=true;if(p.type==='pot')p.value=`${s.pots} 500kΩ Audio`;if(p.id==='selector'){p.existing=s.selector==='none';p.label=s.selector==='none'?'TOGGLE · NOT INCLUDED':'3-WAY TOGGLE';p.value=lesPaul.selector[s.selector].label;}if(p.id==='jack'){p.existing=s.jack==='none';p.label=s.jack==='none'?'JACK · NOT INCLUDED':'OUTPUT JACK';p.value=lesPaul.jack[s.jack].label;}}
 for(const p of c.components){
  if(p.type==='capacitor'){
   const cap=p.id==='neckCap'?caps.neck:p.id==='bridgeCap'?caps.bridge:null;
   p.physicalStyle=cap?(cap.series==='Film'?'film':'orangeDrop'):bleedCircuit==='prs'?'disc':parallel?'orangeDrop':'film';if(cap)p.value=cap.value;
  }
  if(parallel&&p.id.includes('Bleed')){
   p.product=s.bleed;p.topology='duncanParallel';
   if(p.type==='capacitor'){p.value='Capacitor';p.productMark=bleed.component?.manufacturer||'';}
   if(p.type==='resistor')p.value='Resistor';
  }
 }
 for(const w of c.connections){const a=c.components.find(p=>p.id===w.from.split('.')[0]),b=c.components.find(p=>p.id===w.to.split('.')[0]);w.supplied=!a.existing&&!b.existing;}
 c.kitConfiguration=s;
 routeClearance(c);validateCircuit(c);return c;
}
export function diagramMarkup(value,focus='all',selected=null,drawing={},exporting=false,view='full'){const c=circuitForKit(value,drawing),selection=selected?{kind:c.connections.some(w=>w.id===selected)?'wire':'component',id:selected}:['neck','bridge'].includes(focus)?{kind:'stage',ids:c.components.filter(p=>p.channel===focus).map(p=>p.id)}:null;return drawCircuit(c,{selection,exporting,view,filter:['signal','ground','tone','switching'].includes(focus)?focus:'all'}).replace('id="generator-svg"','id="live-diagram"');}
export function componentDescription(id,value,drawing={}){const c=circuitForKit(value,drawing),info=inspectComponent(c,id);if(info)return info.label+': '+info.value+'. '+info.terminals.map(t=>t.label+' → '+(t.connections.join('; ')||'No external wire')).join(' | ');const w=c.connections.find(w=>w.id===id);if(w)return 'Connected wiring: '+[...net(c,w.from)].map(ref=>{const e=endpoint(c,ref);return e.component.label+' / '+e.terminal.label;}).join(' → ');return 'Select a component, terminal or connection to inspect the wiring. Generic hardware outlines: verify the actual terminals before soldering.';}
