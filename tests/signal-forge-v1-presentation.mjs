import {homepageEditorial} from '../dist/electronics/presentation/homepage-editorial.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {forgeCircuit} from '../dist/circuit-forge/model.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
import {homepageCircuit,homepageSpecificationKey} from '../dist/electronics/presentation/homepage-state.mjs';
const html=readFileSync(new URL('../dist/circuit-forge/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/circuit-forge/forge.css',import.meta.url),'utf8');
const home=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const asset=readFileSync(new URL('../dist/assets/signal-forge-full.svg',import.meta.url),'utf8');
for(const [name,values] of Object.entries({wiring:['modern','50s','60s'],position:['neck','both','bridge']})){
 for(const value of values)assert(html.includes(`type="radio" name="${name}" value="${value}"`));
}
for(const name of ['neckProfile','bridgeProfile','bleed','neckCap','bridgeCap'])assert(html.includes(`name="${name}"`));
for(const id of ['all','signal','ground','tone','auxiliary'])assert(html.includes(`data-role-view="${id}"`));
for(const ref of ['neckPickup.hot','bridgePickup.hot','jack.tip','jack.sleeve'])assert(html.includes(`data-trace="${ref}"`));
assert(css.includes('input:focus-visible+span')&&css.includes('prefers-reduced-motion:reduce'));
assert(home.includes('APPARITION / THE SIGNAL PATH')&&home.includes('KNOW YOUR <em>CIRCUIT.</em>'));
assert(home.includes('href="/circuit-forge/"')&&home.includes('href="/wiring-generator/"'));
assert(!home.includes('SEE THE CIRCUIT BEFORE YOU BUILD IT'));
const expected=homepageEditorial();
assert.equal(asset,expected,'homepage artwork is the bounded editorial projection of shared graph and geometry');
assert(asset.includes('data-main-signal=')&&asset.includes('data-tone-branch="loading"')&&asset.includes('data-home-signal-to="jack.tip"'));assert(asset.includes('data-route-net='),'Restored full circuit retains shared routing metadata');
console.log('Precision workbench controls and graph-derived homepage reveal PASS');
