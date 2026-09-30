import {makeCircuit,configuration,endpoint,net} from '../wiring-generator/model.mjs';
import {defaultResponseAssumptions} from '../electronics/response/assumptions.mjs';
import {defaultControls,kitHandoff,applyCircuitAnalysis} from '../electronics/state/circuit-state.mjs';
export {defaultControls} from '../electronics/state/circuit-state.mjs';
import {pickupConventions} from '../wiring-generator/colours.mjs';

// P12A's first public template uses the existing terminal graph and renderer.
// Configuration is an explicit supported subset; unsupported electrical choices fail closed.
export const forgeDefaults=Object.freeze({wiring:'modern',bleed:'none',neckCap:'0.022',bridgeCap:'0.022',position:'both',neckProfile:'generic',bridgeProfile:'generic'});
export const forgeChoices=Object.freeze({
 wiring:['modern','50s','60s'],bleed:['none','prs','cap','duncan'],
 neckCap:['0.010','0.015','0.022','0.033','0.047'],bridgeCap:['0.010','0.015','0.022','0.033','0.047'],
 position:['neck','both','bridge'],neckProfile:Object.keys(pickupConventions),bridgeProfile:Object.keys(pickupConventions)
});
export function forgeCircuit(choices={},controlPositions=defaultControls,responseAssumptions=defaultResponseAssumptions(),shielding='yes'){
 if(!choices||typeof choices!=='object'||Array.isArray(choices))throw Error('Invalid circuit choices.');
 for(const [key,value] of Object.entries(choices))if(!forgeChoices[key]?.includes(value))throw Error('Unsupported Circuit Forge choice: '+key);
 const selected={...forgeDefaults,...choices};
 const {neckProfile,bridgeProfile,...electrical}=selected;
 const state=configuration({guitar:'les-paul',...electrical,colours:'generic',pickupProfiles:{neck:neckProfile,bridge:bridgeProfile},shielding});
 const circuit=makeCircuit(state);
 applyCircuitAnalysis(circuit,{configuration:state,controlPositions,responseAssumptions});
 return {circuit,kitURL:kitHandoff(circuit).url};
}
export function terminalPath(circuit,reference){
 endpoint(circuit,reference);
 // Conductive wires and closed selector contacts only. Passive component internals
 // are not treated as shorts; geometry crossings never create graph edges.
 return [...net(circuit,reference)].sort();
}
export function connectionPath(circuit,id){
 const wire=circuit.connections.find(item=>item.id===id);
 if(!wire)throw Error('Unknown connection: '+id);
 return terminalPath(circuit,wire.from);
}
