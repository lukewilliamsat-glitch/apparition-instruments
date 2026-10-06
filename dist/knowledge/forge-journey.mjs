import {toolURL} from './registry.mjs';
const examples={
 'reading-a-circuit-model':['signal','default','Inspect a supported model in Forge'],
 pots:['signal','250k','Compare a 250k volume assumption in Forge'],
 values:['signal','250k','Explore a 250k volume assumption in Forge'],
 tone:['signal','047','Explore the supported 0.047 µF tone circuit'],
 'capacitor-values':['signal','047','Explore the supported 0.047 µF tone circuit'],
 bleeds:['signal','duncan','Compare the supported parallel RC bleed'],
 'modern-50s':['circuit','50s','Inspect supported 50s connections in Forge'],
 'lp-controls':['circuit','default','Inspect the supported Les Paul circuit'],
 circuits:['circuit','default','Inspect a supported signal and return path'],
 lugs:['circuit','default','Inspect the modelled volume terminals'],
 'toggle-guide':['circuit','default','Inspect the supported selector contacts']
};
export function forgeJourney(key){const example=examples[key];return example?{url:toolURL(example[0],example[1]),label:example[2]}:null;}
export function appendForgeJourney(html,key){const item=forgeJourney(key);if(!item)return html;const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');const block='<aside class="hub-reference-wrap hub-reference-surface" data-forge-journey aria-label="Supported circuit experiment"><h2>Try the principle in a supported circuit</h2><p><a href="'+escape(item.url)+'">'+escape(item.label)+'</a></p><p>The starting state is a modelled reference. Read its capability messages and assumptions; physical fit and unsupported modifications remain separate.</p></aside>';return html.replace('</main>',block+'</main>');}
