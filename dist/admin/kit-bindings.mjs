// Existing commercial options only. Never infer circuit compatibility from category alone.
import {lesPaul} from '../wiring-kits/kit-seed.mjs';
export const kitBindings={
 'pot-short-cts-a':{group:'shaft',option:'short',basis:'four-pot set',price:lesPaul.shaft.short.price,category:'potentiometers'},
 'pot-long-cts-a':{group:'shaft',option:'long',basis:'four-pot set',price:lesPaul.shaft.long.price,category:'potentiometers'},
 'sbe-200':{group:'capacitors',option:'715p-022',basis:'one tone capacitor (two per harness)',price:lesPaul.capacitors['715p-022'].price,category:'capacitors'},
 'cde-022':{group:'capacitors',option:'225p-022',basis:'one tone capacitor (two per harness)',price:lesPaul.capacitors['225p-022'].price,category:'capacitors'},
 'nissei-033':{group:'capacitors',option:'nissei-033',basis:'one tone capacitor (two per harness)',price:lesPaul.capacitors['nissei-033'].price,category:'capacitors'},
 'cde-047':{group:'capacitors',option:'225p-047',basis:'one tone capacitor (two per harness)',price:lesPaul.capacitors['225p-047'].price,category:'capacitors'},
 ...Object.fromEntries([['prs','prs'],['cap','cap'],['duncan','duncan'],['premium','premium'],['overkill','overkill']].map(([suffix,option])=>['bleed-'+suffix,{group:'bleed',option,basis:'pair of volume controls',price:lesPaul.bleed[option].price,category:'treble-bleeds'}])),
 ...Object.fromEntries(['epiphone','pureTone','switchcraft'].map(option=>['jack-'+option,{group:'jack',option,basis:'one output jack',price:lesPaul.jack[option].price,category:'jacks'}])),
 ...Object.fromEntries(['epiphone','switchcraft'].map(option=>['switch-'+option,{group:'selector',option,basis:'one toggle switch',price:lesPaul.selector[option].price,category:'switches'}]))
};
