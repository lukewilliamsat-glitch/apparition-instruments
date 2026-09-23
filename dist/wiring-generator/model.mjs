import {extraCircuit,layoutInfo} from './layouts.mjs';
export {layoutInfo};
import {builderURL} from '../les-paul-kits/config.mjs';
export const terminalTypes={
 pot:{lug1:{x:42,y:142,label:'Lug 1 · CCW end'},lug2:{x:0,y:142,label:'Lug 2 · wiper'},lug3:{x:-42,y:142,label:'Lug 3 · CW end'},case:{x:0,y:82,label:'Casing'}},
 humbucker:{hot:{x:200,y:140,label:'Hot'},linkA:{x:200,y:162,label:'Series link A'},linkB:{x:200,y:184,label:'Series link B'},ground:{x:200,y:206,label:'Coil ground'},shield:{x:200,y:228,label:'Bare shield'}},
 capacitor:{a:{x:-46,y:0,label:'Lead A'},b:{x:46,y:0,label:'Lead B'}},
 resistor:{a:{x:-46,y:0,label:'Lead A'},b:{x:46,y:0,label:'Lead B'}},
 toggle:{neck:{x:-60,y:110,label:'Neck input'},outN:{x:-20,y:110,label:'Neck output contact'},outB:{x:20,y:110,label:'Bridge output contact'},bridge:{x:60,y:110,label:'Bridge input'},ground:{x:0,y:0,label:'Frame ground'}},
 jack:{tip:{x:45,y:20,label:'Tip · signal'},sleeve:{x:-45,y:55,label:'Sleeve · ground'}},
 ground:{ground:{x:0,y:0,label:'Ground connection'}}
};
terminalTypes.pot.lug1.function='CCW';terminalTypes.pot.lug2.function='WIPER';terminalTypes.pot.lug3.function='CW';terminalTypes.pot.case.function='CASING';
// Artwork can be replaced independently: renderers implement these local-coordinate anchors.
// Future DPDT type extends pot anchors with A1/A2/A3 and B1/B2/B3; do not enable until its circuit rules are verified.
terminalTypes.singlecoil={hot:{x:200,y:140,label:'Hot'},ground:{x:200,y:176,label:'Ground'}};
terminalTypes.blade=Object.fromEntries(['A','B'].flatMap((pole,i)=>['C','1','2','3'].map((pin,j)=>[pole+pin,{x:j*42,y:i*110,label:pole+(pin==='C'?' common':' throw '+pin)}])).concat([['ground',{x:200,y:-60,label:'Frame ground'}]]));
terminalTypes.superswitch=Object.fromEntries(['A','B','C','D'].flatMap((pole,i)=>['C','1','2','3','4','5'].map((pin,j)=>[pole+pin,{x:j*35,y:i*140,label:pole+(pin==='C'?' common':' throw '+pin)}])).concat([['ground',{x:200,y:-60,label:'Frame ground'}]]));
import {colourCodes,conductorRoles} from './colours.mjs';
export {colourCodes};
for(const [role,coilFunction] of Object.entries(conductorRoles))terminalTypes.humbucker[role].coilFunction=coilFunction;
terminalTypes.pushpull={...terminalTypes.pot,...Object.fromEntries(['A','B'].flatMap((pole,i)=>[1,2,3].map((n,j)=>['switch'+pole+n,{x:-24+i*48,y:225+j*28,label:'DPDT '+pole+n}])))};
terminalTypes.p90={...terminalTypes.singlecoil};
export const defaults={guitar:'les-paul',wiring:'modern',bleed:'none',neckCap:'0.022',bridgeCap:'0.022',colours:'generic',position:'both',shielding:'yes'};
export const allowed={guitar:Object.keys(layoutInfo),wiring:['modern','50s','60s'],bleed:['none','prs','cap','duncan'],neckCap:['0.022','0.033','0.047'],bridgeCap:['0.022','0.033','0.047'],colours:Object.keys(colourCodes),position:['neck','both','bridge','1','2','3','4','5'],shielding:['yes','no']};
export function configuration(value={}){const s={...defaults};for(const [k,v] of Object.entries(value)){if(!allowed[k]||!allowed[k].includes(v))throw new Error('Unsupported generator option: '+k);s[k]=v;}if(!['les-paul','sg'].includes(s.guitar)){if(!('position' in value))s.position='1';if(!('neckCap' in value))s.neckCap=s.guitar==='prs'?'0.033':'0.047';if(!('bridgeCap' in value))s.bridgeCap=s.neckCap;}if(!layoutInfo[s.guitar].positions[s.position])throw new Error('Selector position is not available for this layout.');if(!['les-paul','sg'].includes(s.guitar)&&s.wiring!=='modern')throw new Error('This layout currently supports its standard Modern circuit only.');if(s.wiring==='50s'&&s.bleed!=='none')throw new Error('Treble bleeds are not offered with 50s wiring in this generator. Choose None, Modern or 60s wiring.');return s;}
export function makeCircuit(value={}){
 const state=configuration(value);if(!['les-paul','sg'].includes(state.guitar)){const c=extraCircuit(state,terminalTypes);routeClearance(c);validateCircuit(c);return c;}const components=[],connections=[],contacts=[];
 const add=(id,type,label,x,y,extra={})=>{components.push({id,type,label,x,y,terminals:terminalTypes[type],...extra});};
 const wire=(id,from,to,category,route=[],extra={})=>connections.push({id,from,to,category,route,...extra});
 // Each channel uses the same factory and terminal topology. Placement is separate from connectivity.
 for(const [ch,y] of [['neck',170],['bridge',650]]){
  const title=ch==='neck'?'NECK':'BRIDGE';
  add(ch+'Pickup','humbucker',title+' HUMBUCKER',55,y,{channel:ch,value:'4-conductor · series humbucking'});
  add(ch+'Volume','pot',title+' VOLUME',440,y+70,{channel:ch,value:'500kΩ Audio',role:'volume'});
  add(ch+'Tone','pot',title+' TONE',870,y+70,{channel:ch,value:'500kΩ Audio',role:'tone'});
  add(ch+'Cap','capacitor',title+' TONE CAP',670,y+212,{channel:ch,value:state[ch+'Cap']+'µF'});
  wire(ch+'Hot',ch+'Pickup.hot',ch+'Volume.lug3','signal',[[285,y+30],[285,y+212]],{conductor:'hot'});
  wire(ch+'Series',ch+'Pickup.linkA',ch+'Pickup.linkB','switching',[[248,y+52],[248,y+74]],{insulate:true});
  wire(ch+'Ground',ch+'Pickup.ground',ch+'Volume.case','ground',[[270,y+96],[270,y+152]],{conductor:'ground'});
  wire(ch+'Shield',ch+'Pickup.shield',ch+'Volume.case','ground',[[258,y+118],[258,y+164],[420,y+164],[420,y+152]],{conductor:'shield'});
  wire(ch+'VolumeGround',ch+'Volume.lug1',ch+'Volume.case','ground',[[495,y+212],[495,y+152]]);
  wire(ch+'ToneFeed',ch+'Volume.'+(state.wiring==='50s'?'lug2':'lug3'),ch+'Cap.a','tone',[[state.wiring==='50s'?440:398,y+252],[610,y+252],[610,y+212]]);
  wire(ch+'ToneCap',ch+'Cap.b',ch+'Tone.'+(state.wiring==='modern'?'lug2':'lug1'),'tone',[[760,y+212],[760,y+290],[state.wiring==='modern'?870:912,y+290]]);
  wire(ch+'ToneGround',ch+'Tone.'+(state.wiring==='modern'?'lug1':'lug2'),ch+'Tone.case','ground',[[state.wiring==='modern'?935:850,y+212],[state.wiring==='modern'?935:850,y+152]]);
  wire(ch+'Cases',ch+'Volume.case',ch+'Tone.case','ground',[[520,y+152],[520,y+320],[970,y+320],[970,y+152]]);
  if(state.bleed!=='none'){
   add(ch+'BleedCap','capacitor',title+' TREBLE BLEED',440,y-20,{channel:ch,value:state.bleed==='prs'?'180pF':'1nF'});
   wire(ch+'BleedIn',ch+'Volume.lug3',ch+'BleedCap.a','tone',[[360,y+212],[360,y-20]]);
   wire(ch+'BleedOut',ch+'BleedCap.b',ch+'Volume.lug2','tone',[[535,y-20],[535,y+230],[440,y+230]]);
   if(state.bleed==='duncan'){
    add(ch+'BleedResistor','resistor',title+' BLEED RESISTOR',440,y-80,{channel:ch,value:'150kΩ'});
    wire(ch+'ResistorIn',ch+'BleedCap.a',ch+'BleedResistor.a','tone',[[375,y-20],[375,y-80]]);
    wire(ch+'ResistorOut',ch+'BleedCap.b',ch+'BleedResistor.b','tone',[[510,y-20],[510,y-80]]);
   }
  }
 }
 add('selector','toggle','3-WAY TOGGLE',1135,420,{value:'Open-frame · 5 terminals',position:state.position});
 add('jack','jack','MONO OUTPUT JACK',1135,1030,{value:'Tip / sleeve'});
 add('bridgeGround','ground','BRIDGE / STRINGS',740,1150,{value:'Existing bridge ground wire'});
 if(state.shielding==='yes')add('shielding','ground','CAVITY SHIELD',475,1150,{value:'Conductive shielding, if fitted'});
 wire('neckOutput','neckVolume.lug2','selector.neck','signal',[[440,452],[1035,452],[1035,530]]);
 wire('bridgeOutput','bridgeVolume.lug2','selector.bridge','signal',[[440,945],[1215,945],[1215,530]]);
 wire('toggleJoin','selector.outN','selector.outB','switching',[[1115,562],[1155,562]]);
 wire('jackSignal','selector.outB','jack.tip','signal',[[1155,595],[1250,595],[1250,1050]]);
 wire('selectorGround','selector.ground','neckTone.case','ground',[[1005,420],[1005,322]]);
 wire('commonGround','neckTone.case','bridgeTone.case','ground',[[990,322],[990,802]]);
 wire('jackGround','bridgeTone.case','jack.sleeve','ground',[[990,802],[990,1085]]);
 wire('bridgeEarth','bridgeGround.ground','bridgeTone.case','ground',[[970,1150],[970,802]]);
 if(state.shielding==='yes')wire('shieldEarth','shielding.ground','bridgeVolume.case','ground',[[560,1150],[560,820],[440,820]]);
 if(state.position!=='bridge')contacts.push(['selector.neck','selector.outN']);
 if(state.position!=='neck')contacts.push(['selector.bridge','selector.outB']);
 const circuit={state,components,connections,contacts};routeClearance(circuit);validateCircuit(circuit);return circuit;
}
export function endpoint(circuit,ref){const [id,terminal]=ref.split('.'),c=circuit.components.find(x=>x.id===id),t=c?.terminals[terminal];if(!t)throw new Error('Unknown terminal '+ref);return {component:c,terminal:t,x:c.x+t.x,y:c.y+t.y};}
export function net(circuit,start){const found=new Set([start]);let changed=true;const pairs=[...circuit.connections.map(w=>[w.from,w.to]),...circuit.contacts];while(changed){changed=false;for(const [a,b] of pairs)if(found.has(a)!==found.has(b)){found.add(a);found.add(b);changed=true;}}return found;}
export function validateCircuit(c){const ids=new Set();for(const component of c.components){if(ids.has(component.id))throw new Error('Duplicate component');ids.add(component.id);}const wires=new Set();for(const w of c.connections){if(wires.has(w.id))throw new Error('Duplicate wire');wires.add(w.id);endpoint(c,w.from);endpoint(c,w.to);}for(const pair of c.contacts)pair.forEach(r=>endpoint(c,r));const ground=net(c,'jack.sleeve');if(ground.has('jack.tip'))throw new Error('Output is shorted to ground.');for(const part of c.components){if(part.type==='pot'&&!ground.has(part.id+'.case'))throw new Error('Ungrounded pot case');if(part.type==='humbucker'&&(!ground.has(part.id+'.ground')||!ground.has(part.id+'.shield')))throw new Error('Ungrounded pickup');}if(!ground.has('bridgeGround.ground')||!ground.has('selector.ground'))throw new Error('Missing hardware ground');return true;}
export function inspectComponent(c,id){const component=c.components.find(x=>x.id===id);if(!component)return null;return {label:component.label,value:component.value,terminals:Object.entries(component.terminals).map(([key,t])=>({label:t.label,ref:id+'.'+key,connections:c.connections.filter(w=>w.from===id+'.'+key||w.to===id+'.'+key).map(w=>{const other=endpoint(c,w.from===id+'.'+key?w.to:w.from);return other.component.label+' / '+other.terminal.label;})}))};}
export function kitLink(c){if(c.state.guitar!=='les-paul')return null;return builderURL({wiring:c.state.wiring,bleed:c.state.bleed,caps:c.state.neckCap===c.state.bridgeCap?c.state.neckCap:'mixed',neckCap:c.state.neckCap,bridgeCap:c.state.bridgeCap,jack:'epiphone',selector:'epiphone',model:'Les Paul style / fitment to confirm'});}

export function routeClearance(c){
 const anchors=c.components.flatMap(p=>Object.keys(p.terminals).map(k=>({ref:p.id+'.'+k,...endpoint(c,p.id+'.'+k)})));
 for(const wire of c.connections){const a=endpoint(c,wire.from),b=endpoint(c,wire.to),raw=[[a.x,a.y],...wire.route,[b.x,b.y]],points=[raw[0]];
  for(const q of raw.slice(1)){const p=points.at(-1);if(p[0]!==q[0]&&p[1]!==q[1])points.push([q[0],p[1]]);points.push(q);}
  const own=net({...c,contacts:[]},wire.from);
  for(let pass=0;pass<30;pass++){let changed=false;
   for(let i=1;i<points.length;i++){const [x1,y1]=points[i-1],[x2,y2]=points[i],hit=anchors.find(t=>!own.has(t.ref)&&((x1===x2&&t.x===x1&&t.y>=Math.min(y1,y2)&&t.y<=Math.max(y1,y2))||(y1===y2&&t.y===y1&&t.x>=Math.min(x1,x2)&&t.x<=Math.max(x1,x2))));
    if(hit){if(x1===x2){const sign=Math.sign(y2-y1)||1;points.splice(i,0,[x1,hit.y-sign*9],[x1+12,hit.y-sign*9],[x1+12,hit.y+sign*9],[x1,hit.y+sign*9]);}else{const sign=Math.sign(x2-x1)||1;points.splice(i,0,[hit.x-sign*9,y1],[hit.x-sign*9,y1+12],[hit.x+sign*9,y1+12],[hit.x+sign*9,y1]);}changed=true;break;}
   }if(!changed)break;
  }wire.route=points.slice(1,-1);
 }
}
