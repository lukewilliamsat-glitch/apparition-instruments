import {frequencyResponse} from './engine.mjs';
import {bleedSummary,types,topologies} from './circuits.mjs';

export function freezeReference(state){
 const configuration=Object.freeze({...state});
 const response=Object.freeze(frequencyResponse(configuration).map(point=>Object.freeze({frequency:point.frequency,db:point.current})));
 const network=configuration.type==='custom'?`Custom ${topologies[configuration.topology]}`:types[configuration.type].label;
 const summary=`${network} (${bleedSummary(configuration)}) · Volume ${configuration.volume.toFixed(1)} / 10 · Tone ${configuration.tonePosition.toFixed(1)} / 10 · ${configuration.volumePot}kΩ volume / ${configuration.tonePot}kΩ tone · ${configuration.toneCap/1000}µF tone cap · pickup ${configuration.pickupR}kΩ / ${configuration.pickupL}H / ${configuration.pickupC}pF · load ${configuration.loadR}MΩ / ${configuration.cableC}pF`;
 return Object.freeze({configuration,response,summary});
}
