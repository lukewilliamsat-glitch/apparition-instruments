// Wiring-kit selling prices only, in integer pence. Never import component retail or supplier prices here.
// Add future kit definitions to this registry; option IDs are persisted in basket specifications.
const option=(label,price=0,description='',extra={})=>({label,price,description,...extra});
export const kitDefinitions={
 'les-paul':{
  name:'Les Paul Style Wiring Kit',basePrice:5999,pricingVersion:2,builder:'/les-paul-kits/',
  included:'4 × CTS 500kΩ audio pots, two tone capacitors, internal wiring and consumables, hand assembly and electrical testing / QC.',
  defaults:{wiring:'50s',pots:'CTS',shaft:'short',matching:'standard',caps:'715p-022',neckCap:'715p-022',bridgeCap:'225p-047',bleed:'none',jack:'none',selector:'none',model:''},
  wiring:{'50s':option('50s wiring',0,'Tone circuit connects to the volume output.'),'60s':option('60s wiring',0,'Tone circuit connects to the volume input, with the tone wiper grounded.'),modern:option('Modern wiring',0,'Tone circuit connects to the volume input.')},
  pots:{CTS:option('CTS 500kΩ Audio',0,'Four audio-taper potentiometers. Each is individually electrically checked.')},
  shaft:{short:option('Short shaft',0,'Short threaded bushing. Confirm mounting depth, hole diameter and knob fit.'),long:option('Long shaft',0,'Long threaded bushing. Confirm mounting depth, hole diameter and knob fit.')},
  matching:{standard:option('Standard Tested',0,'Every potentiometer is individually electrically checked.'),precision:option('Precision Matched',999,'Your four potentiometers are selected from our individually measured stock to create the closest practical resistance match available. The achievable match depends on stock at assembly; no fixed matching tolerance is guaranteed.')},
  // Per-capacitor adjustments. The calculator adds both selected tone capacitors to the base.
  capacitors:{
   '715p-022':option('Sprague / SBE 715P · 0.022µF',0,'715P polypropylene film capacitor. 0.022µF / 22nF.',{value:'0.022',manufacturer:'Sprague / SBE',series:'715P'}),
   '225p-022':option('CDE 225P · 0.022µF',0,'225P polyester film capacitor. 0.022µF / 22nF.',{value:'0.022',manufacturer:'CDE',series:'225P'}),
   'nissei-033':option('NISSEI · 0.033µF',0,'Film capacitor. 0.033µF / 33nF.',{value:'0.033',manufacturer:'NISSEI',series:'Film'}),
   '225p-047':option('CDE 225P · 0.047µF',0,'225P polyester film capacitor. 0.047µF / 47nF.',{value:'0.047',manufacturer:'CDE',series:'225P'})
  },
  bleed:{none:option('No Treble Bleed'),prs:option('PRS-style',400,'180pF capacitor fitted across each volume input and output.',{circuit:'cap',value:'180pF'}),cap:option('Capacitor Only',400,'1nF / 0.001µF capacitor fitted across each volume input and output.',{circuit:'cap',value:'1nF'}),duncan:option('Duncan-style',500,'1nF / 0.001µF capacitor and 150kΩ resistor in parallel, on both volume controls.',{circuit:'parallel',topology:'duncanParallel',value:'1nF',resistorValue:'150kΩ'}),premium:option('Premium Sprague Duncan-style',800,'Sprague/CDE capacitor and resistor in parallel across each volume control. Upgrade covers both controls.',{circuit:'parallel',topology:'duncanParallel',physicalStyle:'orangeDrop',mark:'PREMIUM'}),overkill:option('Apparition Overkill-Pasitor',1000,'Premium Apparition capacitor and resistor construction, connected in parallel across both volume controls.',{circuit:'parallel',topology:'duncanParallel',physicalStyle:'film',mark:'OVERKILL'})},
  jack:{none:option('No Output Jack',0,'No output jack is supplied. The diagram retains an output connection for circuit context.'),epiphone:option('Epiphone Mono Output Jack',500,'Mono jack with signal-tip and ground-sleeve connections. Check mounting dimensions.'),pureTone:option('Pure Tone Multi-Contact Output Jack',800,'Multi-contact mono output jack. Check mounting dimensions and cavity clearance.'),switchcraft:option('Switchcraft Mono Output Jack',800,'Mono jack with signal-tip and ground-sleeve connections. Check mounting dimensions.')},
  selector:{none:option('No Selector Switch',0,'No selector switch is supplied. The diagram retains a selector for circuit context.'),epiphone:option('Epiphone-style 3-Way Toggle',800,'Three positions: neck, both pickups and bridge. Check mounting hole and cavity clearance.'),switchcraft:option('Switchcraft 3-Way Toggle',2300,'Three positions: neck, both pickups and bridge. Check mounting hole and cavity clearance.')}
 }
};
export const lesPaul=kitDefinitions['les-paul'];
export const formatKitPrice=pence=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100);
export const upgradeLabel=pence=>pence===0?'Included':'+'+formatKitPrice(pence);
