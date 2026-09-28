import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Window} from 'happy-dom';
import {prepareProducts,productSchema,productPage,injectCategoryLinks} from '../scripts/generate-product-pages.mjs';
import {productURL} from '../dist/products/model.mjs';

const base={id:'Test-Pot',name:'CTS <500k>',category:'potentiometers',active:true,individually:true,sale_price:599,stock:0,sku:'TP1',manufacturer:'CTS',description:'A test pot',product_content:{}};
const [p]=prepareProducts([base,{...base,id:'private',active:false},{...base,id:'kit',individually:false},{...base,id:'free',sale_price:0},{...base,id:'unpriced',sale_price:null}]);
assert(p);assert.equal(prepareProducts([base]).length,1);
assert.equal(productURL('Test-Pot'),'/products/test-pot/');
assert.throws(()=>prepareProducts([base,{...base,id:'test-pot'}]),/collision/);
const schema=productSchema(p);assert.equal(schema.offers.price,'5.99');assert.equal(schema.offers.priceCurrency,'GBP');assert.match(schema.offers.availability,/OutOfStock$/);
assert(!schema.image&&!schema.aggregateRating&&!schema.gtin&&!schema.brand);
assert.equal(productSchema({...p,stock:3}).offers.availability,'https://schema.org/InStock');
const shell=readFileSync('dist/products/index.html','utf8'),html=productPage(p,shell);
const w=new Window({url:'https://apparitioninstruments.co.uk/products/test-pot/'});w.document.write(html);
const d=w.document;assert.equal(d.title,'CTS <500k> | Apparition Instruments');
assert.equal(d.querySelector('link[rel="canonical"]').href,'https://apparitioninstruments.co.uk/products/test-pot/');
assert(!d.querySelector('meta[name="robots"]'));assert.equal(d.querySelector('h1').textContent,'CTS <500k>');
assert(d.querySelector('#product-detail button').disabled);assert(d.querySelector('.product-price').textContent.includes('£5.99'));
assert.equal(d.querySelector('.product-breadcrumb a[href="/components/potentiometers/"]').textContent,'Potentiometers');
assert.equal(d.querySelectorAll('script[type="application/ld+json"]').length,2);
assert(!html.includes('<h1>CTS <500k></h1>'));w.close();
const template='<html><body><section class="component-section" id="potentiometers"><div class="component-grid"><article>Stale listing</article></div></section></body></html>';
const category=injectCategoryLinks(template,[p],'potentiometers');assert(category.includes('/products/test-pot/'));assert(!category.includes('Stale listing'));
const sitemap=readFileSync('dist/sitemap.xml','utf8');const pages=readdirSync('dist/products',{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name);
assert.equal(pages.length,9);for(const slug of pages){const product=readFileSync('dist/products/'+slug+'/index.html','utf8');assert(product.includes('/products/'+slug+'/'));assert(sitemap.includes('https://apparitioninstruments.co.uk/products/'+slug+'/'));assert(!product.includes('name="robots" content="noindex'));}
for(const categoryName of ['potentiometers','capacitors','treble-bleeds']){
 const html=readFileSync('dist/components/'+categoryName+'/index.html','utf8');assert(html.includes('/products/'));
 assert(!html.includes('id="Poofart"'));assert(!html.includes('id="bleed-overkill"'));
}
assert(readFileSync('dist/components/treble-bleeds/index.html','utf8').includes('href="/treble-bleed-designer/"'));
assert(readFileSync('dist/treble-bleed-designer/index.html','utf8').includes('href="/components/treble-bleeds/"'));
console.log('P11: product identity, eligibility, crawlability, SEO metadata, offers, breadcrumbs, category links and sitemap PASS');
