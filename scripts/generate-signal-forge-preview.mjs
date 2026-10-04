// Homepage-only full-circuit projection; technical tools remain untouched.
import {writeFileSync,readFileSync} from 'node:fs';
import {homepageEditorial} from '../dist/electronics/presentation/homepage-editorial.mjs';
writeFileSync(new URL('../dist/assets/signal-forge-full.svg',import.meta.url),homepageEditorial());
const path=new URL('../dist/index.html',import.meta.url),html=readFileSync(path,'utf8');
writeFileSync(path,html.replace(/<!-- HOME CIRCUIT COMPACT START -->[\s\S]*?<!-- HOME CIRCUIT COMPACT END -->/,()=> '<!-- HOME CIRCUIT COMPACT START -->'+homepageEditorial({compact:true}).replace(/<style>[\s\S]*?<\/style>/,'')+'<!-- HOME CIRCUIT COMPACT END -->'));
// Keep the inline fallback free of SVG style parsing differences, as in the
// accepted previous homepage. Scope its shared artwork styles to this section.
const cssPath=new URL('../dist/homepage.css',import.meta.url),css=readFileSync(cssPath,'utf8');
const style=homepageEditorial().match(/<style>([\s\S]*?)<\/style>/)[1].replaceAll(':where(svg[','.forge-reveal :where(svg[').replaceAll('[data-artwork-system=','.forge-reveal [data-artwork-system=').replaceAll('[data-artwork-mode=','.forge-reveal [data-artwork-mode=');
const block='/* HOME FULL ART START */\n'+style+'\n/* HOME FULL ART END */';
writeFileSync(cssPath,css.includes('/* HOME FULL ART START */')?css.replace(/\/\* HOME FULL ART START \*\/[\s\S]*?\/\* HOME FULL ART END \*\//,()=>block):css+'\n'+block+'\n');
