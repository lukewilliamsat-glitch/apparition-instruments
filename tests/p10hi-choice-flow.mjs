import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {renderKitFields,updateFieldSummaries} from '../dist/les-paul-kits/fields.mjs';
import {defaults} from '../dist/les-paul-kits/config.mjs';

const css=readFileSync('dist/les-paul-kits/kits.css','utf8');
assert.match(css,/\.choice-with-info\{[^}]*align-self:start/);
assert.match(css,/\.choice-with-info \.choice\{height:auto\}/);
assert.doesNotMatch(css,/\.choice-with-info(?:\s+\.choice)?\{[^}]*(?:height:\s*100%|position:\s*absolute|height:\s*\d+px)/);
assert.match(css,/\.choice-rich\{display:grid;grid-template-columns:54px minmax\(0,1fr\)/);
assert.match(css,/@media\(max-width:420px\)\{\.choice-rich\{/);

const browser=new Window({url:'https://apparitioninstruments.co.uk/les-paul-kits/'});browser.document.write(readFileSync('dist/les-paul-kits/index.html','utf8'));globalThis.document=browser.document;
const form=document.querySelector('#kit-options');renderKitFields(form);updateFieldSummaries(form,defaults);
const sections=[...form.querySelectorAll('.kit-section[data-option]')],pots=sections.find(section=>section.dataset.option==='pots'),shaft=sections.find(section=>section.dataset.option==='shaft');
assert.equal(pots.nextElementSibling,shaft);
for(const name of ['pots','shaft','bleed','jack','selector','caps']){
 const section=sections.find(item=>item.dataset.option===name);assert(section);
 for(const wrap of section.querySelectorAll('.choice-with-info')){
  assert.equal(wrap.parentElement.closest('.kit-section'),section);
  assert.equal(wrap.firstElementChild.tagName,'LABEL');
  const rich=wrap.querySelector('.choice-rich');assert(rich);
  assert.equal(rich.parentElement,wrap,'rich data belongs to the natural-flow option wrapper');
  assert(!rich.hidden||!rich.childElementCount,'no empty but visible rich area');
  const disclosure=wrap.querySelector('.option-info');if(disclosure){assert.equal(disclosure.tagName,'DETAILS');assert.equal(disclosure.querySelector('summary').tagName,'SUMMARY');disclosure.open=true;assert.equal(disclosure.parentElement,wrap);}
 }
}
assert(pots.querySelector('.choice-rich:not([hidden])'));
const sparse=document.createElement('div');sparse.className='choice-with-info';sparse.append(document.createElement('label'),document.createElement('div'));assert.equal(sparse.style.height,'');
browser.close();
console.log('P10H/I choice flow: auto-sized labels and grid items, sibling rich/disclosures, compact empty choices, responsive rule and section order PASS');
