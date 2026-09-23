import {configuration,defaults} from './model.mjs';
import {normaliseKit,configurationFromURL,toneCaps,builderURL} from '../les-paul-kits/config.mjs';
export function generatorURL(state={},kit=null){const q=new URLSearchParams();if(kit){q.set('kit','les-paul');q.set('config',JSON.stringify(normaliseKit(kit)));}q.set('g',JSON.stringify(state));return '/wiring-generator/?'+q;}
export function readGeneratorURL(search){const q=new URLSearchParams(search),kit=configurationFromURL(search);let input={};if(q.has('g')){try{input=JSON.parse(q.get('g'));}catch{throw new Error('This configuration isn’t available yet: the diagram link could not be read.');}}const premium=kit&&['premium','overkill'].includes(kit.bleed);if(kit){const caps=toneCaps(kit);input={...input,guitar:'les-paul',wiring:kit.wiring,bleed:premium?'none':kit.bleed,neckCap:caps.neck.value,bridgeCap:caps.bridge.value};}return {state:configuration(input),kit};}
export function updateKitFromDiagram(kit,state){if(state.guitar!=='les-paul')return null;const caps=toneCaps(kit),next={...kit,wiring:state.wiring,bleed:state.bleed};if(state.neckCap!==caps.neck.value||state.bridgeCap!==caps.bridge.value)Object.assign(next,{caps:'mixed',neckCap:state.neckCap,bridgeCap:state.bridgeCap});return normaliseKit(next);}
export function installationGuideURL(state={},kit=null){return generatorURL(state,kit).replace('/wiring-generator/','/luthier-hub/les-paul-installation/');}
export {builderURL};
export function builderDiagramURL(kit,state={}){return builderURL(kit)+'&g='+encodeURIComponent(JSON.stringify(state));}
