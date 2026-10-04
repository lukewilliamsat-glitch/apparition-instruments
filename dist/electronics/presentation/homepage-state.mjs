import {makeCircuit} from '../../wiring-generator/model.mjs';
import {applyInstrumentValues,instrumentFromGeneratorCircuit} from '../instrument/circuit.mjs';
import {conventionalSignalStudy} from './educational-truth.mjs';
// This bounded educational example uses the existing Modern Tele graph. It is
// independent of Forge's default configuration and technical presentation.
export const homepageConfiguration=Object.freeze({guitar:'tele',position:'3'});
export function homepageCircuit(){const circuit=makeCircuit(homepageConfiguration);applyInstrumentValues(circuit,instrumentFromGeneratorCircuit(circuit));conventionalSignalStudy(circuit);return circuit;}
export function homepageStateKey(circuit){return circuit.state.guitar+':'+circuit.state.wiring+':'+circuit.state.position;}
export function homepageSpecificationKey(circuit){return JSON.stringify({configuration:circuit.state,components:circuit.components.map(p=>[p.id,p.type,p.value])});}
