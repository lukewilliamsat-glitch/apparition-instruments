import * as fs from 'node:fs/promises';
import path from 'node:path';
import {stable,sha256,makeManifest} from '../../scripts/atlas/core.mjs';
import {footerInsertion,makeProtection,makePolicy} from '../../scripts/atlas/assemble-static-overlay.mjs';
// Every byte is synthetic. No live source, downloaded body or image is used.
export const BASE_FILES={
 'index.html':'<!doctype html><html lang="en"><head><title>Synthetic Home</title><link rel="stylesheet" href="/style.css"></head><body><h1>Synthetic instrument shop</h1><a href="/products/cde-synthetic/">Synthetic product</a><footer><div class="footer-links"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></div></footer></body></html>\n',
 'style.css':'.brand {background-image:url("assets/grid.svg")}\n',
 'assets/grid.svg':'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><path d="M0 0h1v1H0z"/></svg>\n',
 'products/cde-synthetic/index.html':'<!doctype html><html><head><title>Synthetic Product</title></head><body><img src="image.png" srcset="image.png 1x, image@2.png 2x" alt="Synthetic fixture"><a href="/">Home</a></body></html>\n',
 'products/cde-synthetic/image.png':Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63705068f80f00036401e018156a070000000049454e44ae426082','hex'),
 'products/cde-synthetic/image@2.png':null,
 'products/second-fixture/index.html':'<html><head><title>Second synthetic product</title></head><body><a href="/products/cde-synthetic/">First</a></body></html>\n',
 'news/synthetic-notice/index.html':'<html><head><title>Synthetic news</title></head><body>Fixture notice only</body></html>\n',
 'privacy/index.html':'<html><head><title>Synthetic Privacy</title></head><body>No customer data</body></html>\n',
 'terms/index.html':'<html><head><title>Synthetic Terms</title></head><body>Fixture terms</body></html>\n',
 'checkout/index.html':'<html><head><title>Synthetic Checkout</title></head><body><button disabled>Fixture only</button></body></html>\n',
 'checkout/app.mjs':'export const checkoutFixture = "no transactions";\n',
 'circuit-forge/index.html':'<html><head><title>Synthetic Forge</title></head><body>Local fixture</body></html>\n',
 'circuit-forge/app.mjs':'export const forgeFixture = "no production logic";\n',
 'sitemap.xml':'<urlset><url><loc>https://fixture.invalid/</loc></url></urlset>\n',
 'robots.txt':'User-agent: *\nDisallow: /landing-v02/\n'
};
// Portable filename policy deliberately excludes @. Responsive second image uses a dash.
BASE_FILES['products/cde-synthetic/image-2.png']=BASE_FILES['products/cde-synthetic/image.png'];delete BASE_FILES['products/cde-synthetic/image@2.png'];BASE_FILES['products/cde-synthetic/index.html']=BASE_FILES['products/cde-synthetic/index.html'].replace('image@2.png','image-2.png');
export const OVERLAY_FILES={
 'landing-v02/index.html':'<!doctype html><html><head><title>Synthetic V02</title><meta name="robots" content="noindex"><link rel="stylesheet" href="spectre.css"><script type="module" src="spectre.mjs"></script></head><body><h1>Synthetic preview only</h1><a href="/">Return to current homepage</a><img src="/products/cde-synthetic/image.png" alt="Synthetic component"></body></html>\n',
 'landing-v02/spectre.css':'.preview {background:url("../assets/grid.svg")} @media(prefers-reduced-motion:reduce){*{animation:none}}\n',
 'landing-v02/spectre.mjs':"import {fixture} from './state.mjs'; export const preview=fixture;\n",
 'landing-v02/state.mjs':'export const fixture="synthetic";\n'
};
export async function writeFiles(root,files){for(const [p,b] of Object.entries(files)){const full=path.join(root,...p.split('/'));await fs.mkdir(path.dirname(full),{recursive:true});await fs.writeFile(full,b);}}
export async function fixture(root,{reverse=false}={}){
 const baselineRoot=path.join(root,'baseline'),overlayRoot=path.join(root,'overlay');await fs.mkdir(baselineRoot,{recursive:true});await fs.mkdir(overlayRoot,{recursive:true});
 const entries=Object.entries(BASE_FILES);await writeFiles(baselineRoot,Object.fromEntries(reverse?entries.reverse():entries));
 const over={...OVERLAY_FILES,'index.html':footerInsertion(Buffer.from(BASE_FILES['index.html']))};const oe=Object.entries(over);await writeFiles(overlayRoot,Object.fromEntries(reverse?oe.reverse():oe));
 const baselineManifest=await makeManifest(baselineRoot,{criticalRoutes:['index.html','products/cde-synthetic/index.html','checkout/index.html','circuit-forge/index.html','privacy/index.html'],criticalAssets:['products/cde-synthetic/image.png','style.css'],provenance:{type:'synthetic',description:'Atlas test fixture; no live content'}});
 const overlayManifest=await makeManifest(overlayRoot,{criticalRoutes:['index.html','landing-v02/index.html'],provenance:{type:'synthetic',description:'Synthetic Spectre-style overlay, not actual Spectre source'}});
 const protectedManifest=makeProtection(baselineManifest),policy=makePolicy(baselineManifest,overlayManifest,protectedManifest);
 const configs={'baseline-manifest.json':baselineManifest,'overlay-manifest.json':overlayManifest,'protection.json':protectedManifest,'policy.json':policy};for(const [n,v]of Object.entries(configs))await fs.writeFile(path.join(root,n),stable(v));
 return {baselineRoot,overlayRoot,baselineManifest,overlayManifest,protectedManifest,policy,output:path.join(root,'candidate'),configs,root};
}
export function modeInput({event='push',ref='refs/heads/main',commitMessage='[static-only] synthetic',dispatch={},gates={}}={}){return {schemaVersion:1,event,ref,commitMessage,dispatch,gates:{sourceRevisionVerified:true,baselineComplete:true,overlayAllowlisted:true,validationPassed:true,protectedFilesPreserved:true,...gates}};}
