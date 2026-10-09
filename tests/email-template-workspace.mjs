import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';

const html=readFileSync('dist/admin/email-templates/index.html','utf8');
const css=readFileSync('dist/admin/email-templates/studio.css','utf8');
for(const [width,outer,inner,sticky] of [
 [1440,'190px minmax(0,1fr)','minmax(0,1fr) minmax(0,1.12fr)','sticky'],
 [1024,'1fr','minmax(0,1fr) minmax(0,1.12fr)','sticky'],
 [768,'1fr','1fr','static'],[390,'1fr','1fr','static'],[320,'1fr','1fr','static']
]){
 const w=new Window({width,height:900});
 w.document.body.innerHTML=html.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,'');
 const style=w.document.createElement('style');style.textContent=css;w.document.head.append(style);
 const $=s=>w.document.querySelector(s),computed=s=>w.getComputedStyle($(s));
 assert.equal(computed('.template-layout').gridTemplateColumns,outer,width+' navigation');
 assert.equal(computed('.studio-workspace').gridTemplateColumns,inner,width+' editor/preview');
 assert.equal(computed('.studio-preview-panel').position,sticky,width+' preview positioning');
 assert.equal(parseFloat(computed('.studio-workspace').minWidth),0);
 assert.equal(computed('#template-text').overflow,'auto');
 assert.equal(computed('#template-text').whiteSpace,'pre-wrap');
 assert.equal(computed('#template-text').overflowWrap,'anywhere');
 assert.equal(computed('#template-form textarea').resize,'vertical');
 assert.equal($('#template-form').closest('section').nextElementSibling.id,'template-preview-panel');
 assert.equal($('#template-html').getAttribute('sandbox'),'');
 assert.equal($('#template-text').tabIndex,0);
 for(const id of ['template-subject','template-heading','template-body','placeholder-select'])assert($('label[for="'+id+'"]'));
 assert.equal($('#preview-html').getAttribute('aria-controls'),'template-html');
 assert.equal($('#preview-text').getAttribute('aria-controls'),'template-text');
 assert($('.studio-history summary'));assert.equal($('.studio-history').open,false);
 assert.equal(computed('#template-form textarea').minHeight,width<=600?'300px':'340px');
 await w.happyDOM.close();
}
console.log('Studio workspace PASS: computed desktop/tablet/mobile CSS at 1440/1024/768/390/320px, editor/preview sibling layout, independent text overflow, labelled keyboard controls and compact history. Browser visual acceptance remains manual.');
