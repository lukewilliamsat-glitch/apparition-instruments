export const layoutInfo={
 'les-paul':{label:'Les Paul',positions:{neck:'Neck',both:'Both',bridge:'Bridge'},description:'HH · 2 volume + 2 tone · 500kΩ audio · 3-way toggle'},
 sg:{label:'SG',positions:{neck:'Neck',both:'Both',bridge:'Bridge'},description:'HH · 2 volume + 2 tone · 500kΩ audio · 3-way toggle'},
 strat:{label:'STRATOCASTER',positions:{'1':'1 · Bridge','2':'2 · Bridge + middle','3':'3 · Middle','4':'4 · Middle + neck','5':'5 · Neck'},description:'Classic SSS · 250kΩ audio · master volume · neck and middle tones · bridge without tone · shared 0.047µF cap'},
 tele:{label:'TELECASTER',positions:{'1':'1 · Bridge','2':'2 · Both','3':'3 · Neck'},description:'Standard SS · 250kΩ audio · master volume and tone · 3-way blade · 0.047µF tone cap'},
 prs:{label:'PRS CUSTOM 24 STYLE',positions:{'1':'1 · Bridge humbucker','2':'2 · Bridge humbucker + neck single coil','3':'3 · Both humbuckers','4':'4 · Both single coils','5':'5 · Neck humbucker'},description:'HH · 500kΩ audio · master volume and tone · 4-pole superswitch conversion. Not a PRS factory switch pinout.'}
};
export function extraCircuit(state,types){
 const components=[],connections=[],contacts=[],isStrat=state.guitar==='strat',isPRS=state.guitar==='prs';
 const add=(id,type,label,x,y,extra={})=>components.push({id,type,label,x,y,terminals:types[type],...extra});
 const wire=(id,from,to,category='signal',route=[])=>connections.push({id,from,to,category,route});
 const names=isStrat?['neck','middle','bridge']:['neck','bridge'];
 for(const [i,ch] of names.entries()){
  const y=160+i*(isStrat?265:430);add(ch+'Pickup',isPRS?'humbucker':'singlecoil',ch.toUpperCase()+' PICKUP',55,y,{value:isPRS?'4-conductor humbucker':'Passive single coil',channel:ch});
 }
 add('selector',isPRS?'superswitch':'blade',isPRS?'4-POLE SUPERSWITCH':isStrat?'5-WAY BLADE':'3-WAY BLADE',580,200,{value:'Functional pole labels · verify terminal identity',position:state.position});
 add('masterVolume','pot','MASTER VOLUME',940,480,{value:(isPRS?'500':'250')+'kΩ Audio',role:'volume'});
 add('neckTone','pot',isStrat?'NECK TONE':'MASTER TONE',670,850,{value:(isPRS?'500':'250')+'kΩ Audio',role:'tone'});
 if(isStrat)add('middleTone','pot','MIDDLE TONE',940,850,{value:'250kΩ Audio',role:'tone'});
 add('toneCap','capacitor','TONE CAP',420,1020,{value:state.neckCap+'µF'});
 add('jack','jack','MONO OUTPUT JACK',1135,1030,{value:'Tip / sleeve'});
 add('bridgeGround','ground','BRIDGE / STRINGS',200,1150,{value:'Bridge / string ground'});
 if(state.shielding==='yes')add('shielding','ground','CAVITY SHIELD',500,1150,{value:'Shielding, if fitted'});
 const pos=Number(state.position);
 if(isPRS){
  // Four independent SP5T poles. Joining the coils stays external; C/D selectively shunt a coil.
  for(const pole of ['A','B','C','D'])contacts.push(['selector.'+pole+'C','selector.'+pole+pos]);
  wire('neckSelect','neckPickup.hot','selector.AC','signal',[[290,190],[290,200]]);
  wire('bridgeSelect','bridgePickup.hot','selector.BC','signal',[[310,620],[310,340]]);
  for(const [ch,pole,ys] of [['neck','C',212],['bridge','D',642]]){
   wire(ch+'Series',ch+'Pickup.linkA',ch+'Pickup.linkB','switching',[[248,ys],[248,ys+22]]);
   wire(ch+'Split',ch+'Pickup.linkA','selector.'+pole+'C','switching',[[330,ys],[330,pole==='C'?480:620]]);
  }
  for(const [pole,positions] of [['A',[2,3,4,5]],['B',[1,2,3,4]]])for(const n of positions)wire(pole+'Output'+n,'selector.'+pole+n,'masterVolume.lug3','signal',[[820,200+(pole==='B'?140:0)],[820,700],[898,700]]);
  for(const n of [2,4])wire('neckSplit'+n,'selector.C'+n,'masterVolume.case','switching',[[840,480],[840,562]]);
  wire('bridgeSplit4','selector.D4','bridgePickup.hot','switching',[[800,620],[800,750],[310,750],[310,620]]);
 }else if(isStrat){
  const throws={1:[1],2:[1,2],3:[2],4:[2,3],5:[3]}[pos];for(const pole of ['A','B'])for(const n of throws)contacts.push(['selector.'+pole+'C','selector.'+pole+n]);
  for(const [i,ch] of names.entries())wire(ch+'Select',ch+'Pickup.hot','selector.A'+(3-i),'signal',[[300+i*20,160+i*265+30],[300+i*20,300],[580+(3-i)*42,300]]);
  wire('selectorOut','selector.AC','masterVolume.lug3','signal',[[500,200],[500,700],[898,700]]);
  wire('toneCommon','selector.AC','selector.BC','tone',[[500,200],[500,400]]);
  wire('neckToneSelect','selector.B3','neckTone.lug1','tone',[[760,400],[760,1035],[712,1035]]);
  wire('middleToneSelect','selector.B2','middleTone.lug1','tone',[[780,400],[780,1070],[982,1070]]);
 }else{
  for(const pole of ['A','B'])contacts.push(['selector.'+pole+'C','selector.'+pole+pos]);
  wire('neckSelect','neckPickup.hot','selector.AC','signal',[[300,190],[300,200]]);
  wire('bridgeSelect','bridgePickup.hot','selector.BC','signal',[[320,620],[320,400]]);
  for(const [pole,positions] of [['A',[2,3]],['B',[1,2]]])for(const n of positions)wire(pole+'Out'+n,'selector.'+pole+n,'masterVolume.lug3','signal',[[800,200+(pole==='B'?200:0)],[800,700],[898,700]]);
 }
 for(const [i,ch] of names.entries()){
  const y=160+i*(isStrat?265:430);
  wire(ch+'Ground',ch+'Pickup.ground','masterVolume.case','ground',[[270,y+96],[270,800],[1010,800],[1010,562]]);
  if(isPRS)wire(ch+'Shield',ch+'Pickup.shield','masterVolume.case','ground',[[258,y+118],[258,815],[1025,815],[1025,562]]);
 }
 wire('volumeGround','masterVolume.lug1','masterVolume.case','ground',[[1035,622],[1035,562]]);
 wire('potCases','masterVolume.case','neckTone.case','ground',[[1060,562],[1060,1120],[740,1120],[740,932]]);
 if(isStrat){
  wire('toneCases','neckTone.case','middleTone.case','ground',[[740,932],[740,1100],[1030,1100],[1030,932]]);
  wire('neckToneCap','neckTone.lug2','toneCap.a','tone',[[670,1060],[330,1060],[330,1020]]);
  wire('middleToneCap','middleTone.lug2','toneCap.a','tone',[[940,1040],[350,1040],[350,1020]]);
  wire('capGround','toneCap.b','neckTone.case','ground',[[520,1020],[520,932]]);
 }else{
  wire('toneFeed','masterVolume.lug3','toneCap.a','tone',[[865,622],[865,780],[350,780],[350,1020]]);
  wire('toneCapOut','toneCap.b','neckTone.lug2','tone',[[600,1020],[600,1050],[670,1050]]);
  wire('toneGround','neckTone.lug1','neckTone.case','ground',[[750,992],[750,932]]);
 }
 wire('jackSignal','masterVolume.lug2','jack.tip','signal',[[940,725],[1240,725],[1240,1050]]);
 wire('jackGround','masterVolume.case','jack.sleeve','ground',[[1080,562],[1080,1085]]);
 wire('switchGround','selector.ground','masterVolume.case','ground',[[1120,140],[1120,562]]);
 wire('bridgeEarth','bridgeGround.ground','neckTone.case','ground',[[200,1120],[540,1120],[540,932]]);
 if(state.shielding==='yes')wire('shieldEarth','shielding.ground','neckTone.case','ground',[[560,1150],[560,932]]);
 if(state.bleed!=='none'){
  add('masterBleedCap','capacitor','TREBLE BLEED',940,360,{value:state.bleed==='prs'?'180pF':'1nF'});
  wire('bleedIn','masterVolume.lug3','masterBleedCap.a','tone',[[865,622],[865,360]]);
  wire('bleedOut','masterBleedCap.b','masterVolume.lug2','tone',[[1040,360],[1040,660],[940,660]]);
  if(state.bleed==='duncan'){
   add('masterBleedResistor','resistor','BLEED RESISTOR',940,285,{value:'150kΩ'});
   wire('bleedRIn','masterBleedCap.a','masterBleedResistor.a','tone',[[875,360],[875,285]]);
   wire('bleedROut','masterBleedCap.b','masterBleedResistor.b','tone',[[1010,360],[1010,285]]);
  }
 }
 return {state,components,connections,contacts};
}
// Versioned circuit identities keep a guitar family distinct from an actual supported wiring arrangement.
export const circuitFamilies={
 'les-paul':{variants:{'dependent-2v2t':{supported:true}},future:['coil-split','partial-split','phase','series-parallel']},
 sg:{variants:{'dependent-2v2t':{supported:true}},future:['coil-split','partial-split']},
 prs:{variants:{'custom24-fiveway-superswitch-conversion':{supported:true,reference:'2021–2025 pickup combination table, functional 4-pole conversion'},'custom24-threeway-pushpull':{supported:false},'custom24-partial-split':{supported:false}}},
 strat:{variants:{'classic-sss-neck-middle-tone':{supported:true}},future:['hss','hsh','master-tone','neck-bridge-tone','blender','series']},
 tele:{variants:{'standard-ss-threeway':{supported:true}},future:['fourway-series','humbucker-neck','nashville','pushpull']}
};
