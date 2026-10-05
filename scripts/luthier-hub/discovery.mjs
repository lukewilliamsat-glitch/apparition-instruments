// Intent families select one human-useful canonical guide, never duplicate keyword pages.
export const searchIntents=[
 {guide:'pots',queries:['guitar potentiometers explained']},
 {guide:'values',queries:['250k vs 500k pots']},
 {guide:'taper',queries:['audio vs linear taper guitar pots']},
 {guide:'lugs',queries:['guitar pot lug numbering','guitar volume pot wiring']},
 {guide:'tone',queries:['how guitar tone controls work','guitar tone pot wiring']},
 {guide:'capacitor-values',queries:['0.022 vs 0.047 guitar capacitor','guitar tone capacitor values']},
 {guide:'bleeds',queries:['guitar treble bleed','treble bleed explained','treble bleed capacitor resistor','treble bleed values','cap only vs resistor treble bleed']},
 {guide:'circuits',queries:['guitar wiring explained']},
 {guide:'lp-controls',queries:['Les Paul wiring','how Les Paul controls work']},
 {guide:'modern-50s',queries:['modern vs 50s wiring']},
 {guide:'toggle-guide',queries:['guitar selector wiring']},
 {guide:'grounding-guide',queries:['guitar grounding']},
 {guide:'coil-split-guide',queries:['coil split wiring'],limits:'Supported configurations only; no universal physical pinout.'},
 {guide:'series-parallel-guide',queries:['series parallel guitar wiring'],limits:'Conceptual comparison; alternate parallel connection recipes are not added.'}
];
export const relationAdditions={pots:['lp-controls'],lugs:['toggle-guide','grounding-guide'],tone:['modern-50s'],bleeds:['modern-50s'],circuits:['modern-50s','lp-controls'],pickups:['coil-split-guide','series-parallel-guide'],switches:['toggle-guide'],ground:['grounding-guide'],troubleshoot:['grounding-guide']};
