// The homepage has its own editorial adapter; technical-tool output is untouched.
import {writeFileSync,readFileSync} from 'node:fs';
import {homepageEditorial} from '../dist/electronics/presentation/homepage-editorial.mjs';
writeFileSync(new URL('../dist/assets/signal-forge-full.svg',import.meta.url),homepageEditorial());
const path=new URL('../dist/index.html',import.meta.url),html=readFileSync(path,'utf8');
writeFileSync(path,html.replace(/(<div class="forge-reveal-narrow">)[\s\S]*?(<\/div><\/div><div class="forge-reveal-response")/,'$1'+homepageEditorial({compact:true}).replace(/<style>[\s\S]*?<\/style>/,'')+'$2'));
const cssPath=new URL('../dist/homepage.css',import.meta.url),css=readFileSync(cssPath,'utf8'),style=homepageEditorial().match(/<style>([\s\S]*?)<\/style>/)[1].replaceAll('[data-artwork-system=', '.forge-reveal [data-artwork-system=').replaceAll('[data-artwork-mode=', '.forge-reveal [data-artwork-mode=');
const start='/* HOME EDITORIAL ART START */',end='/* HOME EDITORIAL ART END */',block=start+'\n'+style+'\n'+end;writeFileSync(cssPath,css.includes(start)?css.replace(/\/\* HOME EDITORIAL ART START \*\/[\s\S]*?\/\* HOME EDITORIAL ART END \*\//,block):css+'\n'+block+'\n');
