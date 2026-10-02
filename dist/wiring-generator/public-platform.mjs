import {references} from '../electronics/instrument/configuration.mjs';
// The public tools consume the same validated architecture adapters. Historical
// superswitch conversions remain engine-only until a public contract is verified.
const platforms=new Set([...Object.values(references).map(r=>r.generator).filter(Boolean),'sg']);
export function requirePublicPlatform(state){
 if(!platforms.has(state.guitar))throw new Error('This platform is not currently available in the public Generator.');
 return state;
}
