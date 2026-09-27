import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {recommend} from '../dist/wiring-kits/help-me-choose/recommend.mjs';
import {readBasket} from '../dist/commerce.mjs';

const page=name=>{const w=new Window({url:'https://apparitioninstruments.co.uk/'+name});w.document.write(readFileSync('dist/'+name+'index.html','utf8'));return w;};
const componentRoutes=['components/','components/treble-bleeds/','components/capacitors/','components/potentiometers/'];
for(const route of componentRoutes){const w=page(route),d=w.document;assert.match(d.querySelector('.catalogue-notice').textContent,/add available items to your basket.*secure checkout/i);assert.doesNotMatch(d.body.textContent,/online ordering is coming soon|when ordering opens/i);assert(d.querySelector('.component-grid'));assert(d.querySelector('button[data-add]'));assert(d.querySelector('a[href="/basket/"]'));w.close();}
const home=page(''),links=[...home.document.querySelectorAll('main a')];
for(const target of ['/components/','/wiring-kits/','/wiring-generator/','/luthier-hub/'])assert(links.some(link=>link.getAttribute('href')===target),target);
assert(links.some(link=>link.getAttribute('href')==='/components/'&&link.textContent.trim().startsWith('Browse available components')));home.close();
const basket=page('basket/');assert.match(basket.document.querySelector('.page-intro p:last-child').textContent,/components and kit configurations.*secure checkout/i);assert.match(basket.document.querySelector('meta[name="description"]').content,/secure checkout/i);assert(basket.document.querySelector('script[src*="basket.mjs"]'));basket.close();
const kit=page('wiring-kits/');assert(kit.document.querySelector('[data-kit-direct]'));assert(kit.document.querySelector('a[href="/wiring-kits/help-me-choose/"]'));assert.match(kit.document.querySelector('.guided-route').textContent,/passive, four-pot Les Paul style harness/i);kit.close();
const guide=page('wiring-kits/help-me-choose/');assert.match(guide.document.querySelector('#guide-scope').textContent,/passive, four-pot Les Paul style harnesses/i);assert(guide.document.querySelector('#guide-scope').compareDocumentPosition(guide.document.querySelector('#guide-stage'))&guide.Node.DOCUMENT_POSITION_FOLLOWING);guide.close();
assert.equal(recommend({guitar:'sg'}).supported,false);assert.equal(recommend({guitar:'les-paul',pickups:'active'}).supported,false);
assert.doesNotMatch(readFileSync('dist/les-paul-kits/config.mjs','utf8'),/online ordering coming soon/i);
assert.match(readFileSync('dist/basket-ui.mjs','utf8'),/Review checkout →/);
assert.equal(typeof readBasket,'function');
console.log('P10C: live purchasing copy, category and basket routes, upfront guided scope, honest unsupported results PASS');
