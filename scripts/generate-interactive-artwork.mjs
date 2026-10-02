import {readFileSync,writeFileSync} from 'node:fs';
import {signalPathArtwork,signalPathStyles} from './generate-signal-path.mjs';
import {makeCircuit} from '../dist/wiring-generator/model.mjs';
import {drawCircuit} from '../dist/wiring-generator/render.mjs';
export function interactiveArtwork(source){
 let n=0;let result=source.replace(/<svg[^>]*class="[^"]*it-circuit[^"]*"[\s\S]*?<\/svg>/g,()=>{n++;return signalPathArtwork().replace(/<path class="signal-concept"([^>]*?) d="([^"]+)"\/>/,(_,attrs,d)=>`<path class="signal-concept it-conductor"${attrs} d="${d}"/><path class="it-signal" pathLength="100" d="${d}"/>`).replace('class="home-signal-path"','class="home-signal-path it-circuit"').replaceAll('home-path-title','it-path-title-'+n).replaceAll('home-path-description','it-path-description-'+n);});
 if(n!==2)throw Error('Expected two educational signal studies');
 // The nearby wiring preview previously copied local pot/jack geometry. Use the
 // real generated Tele circuit as an explicitly illustrative physical diagram.
 result=result.replace(/(<span class="it-assembly-title">[\s\S]*?<\/span>)(?:<svg[\s\S]*?<\/svg>|<img[^>]*data-shared-wiring-preview[^>]*>)/,'$1<img data-shared-wiring-preview src="../assets/interactive-wiring-preview.svg" width="1320" height="1275" alt="Illustrative Tele wiring from the shared circuit renderer">');
 return result;
}
if(process.argv[1]?.endsWith('generate-interactive-artwork.mjs')){
 writeFileSync('dist/assets/interactive-wiring-preview.svg',drawCircuit(makeCircuit({guitar:'tele'}),{exporting:true,mode:'build',palette:'editorial'}));
 const path='dist/interactive-tools/index.html';writeFileSync(path,interactiveArtwork(readFileSync(path,'utf8')));
 const css='dist/interactive-tools/landing.css';const p=readFileSync(css,'utf8'),start='/* SHARED SIGNAL STUDY START */',end='/* SHARED SIGNAL STUDY END */',block=start+'\n'+signalPathStyles()+'\n'+end;
 writeFileSync(css,p.includes(start)?p.replace(/\/\* SHARED SIGNAL STUDY START \*\/[\s\S]*?\/\* SHARED SIGNAL STUDY END \*\//,block):p+'\n'+block+'\n');
}
