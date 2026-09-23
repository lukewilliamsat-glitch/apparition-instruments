import {kitRecord} from './config.mjs';
import {circuitForKit} from './diagram.mjs';
// Explicit creation boundary: never reconstruct a saved snapshot during basket reads.
export function createKitSnapshot(value,drawing={}){
 const record=kitRecord(value);
 if(!Number.isSafeInteger(record.pricing.total)||record.pricing.total<0)throw new Error('This kit contains an unavailable or unpriced option. Review the configuration.');
 const circuit=circuitForKit(record.configuration,drawing);
 record.createdAt=new Date().toISOString();
 record.diagram={schemaVersion:1,configuration:structuredClone(circuit.state),circuit:structuredClone(circuit)};
 return structuredClone(record);
}
export function validateKitSnapshot(record){
 const p=record?.pricing;
 if(!record||![2,3].includes(record.schemaVersion)||record.kitType!=='les-paul'||!record.configuration||!record.specification||!p||p.currency!=='GBP'||!Number.isSafeInteger(p.total)||p.total<0||!Array.isArray(p.lines)||p.lines.some(l=>!Number.isSafeInteger(l.price)||l.price<0)||p.lines.reduce((n,l)=>n+l.price,0)!==p.total)throw new Error('A saved kit configuration could not be read. Its price has not been recalculated. Reset the basket or restore your saved data.');
 return structuredClone(record);
}
