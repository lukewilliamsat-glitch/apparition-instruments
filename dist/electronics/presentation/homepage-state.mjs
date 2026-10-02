import {forgeCircuit} from '../../circuit-forge/model.mjs';
// Build-time artwork and runtime analysis consume the same bounded demonstration.
export const homepageConfiguration=Object.freeze({position:'neck'});
export function homepageCircuit(){return forgeCircuit(homepageConfiguration).circuit;}
export function homepageStateKey(circuit){return circuit.state.guitar+':'+circuit.state.wiring+':'+circuit.state.position;}

export function homepageSpecificationKey(circuit){return JSON.stringify({configuration:circuit.state,components:circuit.components.map(p=>[p.id,p.type,p.value])});}
