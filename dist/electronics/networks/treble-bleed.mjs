// Electrical values from the existing catalogue seed and validated Generator contract.
// Commercial component grade/brand remains in the Kit Definition, not this graph.
export const trebleBleeds=Object.freeze({
 none:Object.freeze({topology:'none'}),
 prs:Object.freeze({topology:'capacitor',capacitor:'180pF',capacitancePf:180}),
 cap:Object.freeze({topology:'capacitor',capacitor:'1nF',capacitancePf:1000}),
 duncan:Object.freeze({topology:'parallel-rc',capacitor:'1nF',capacitancePf:1000,resistor:'150kΩ',resistanceK:150})
});
export function trebleBleed(id){if(!Object.hasOwn(trebleBleeds,id))throw Error('Unsupported treble-bleed topology.');return trebleBleeds[id];}
