// Static risk inventory only. URL literals are not asserted to be executed requests.
import path from 'node:path';
import {readRegular,sha256} from './core.mjs';
export async function runtimeDependencies({root,manifest,manifestSHA256}){
 const rows=[];
 for(const f of manifest.files.filter(x=>/\.(?:html?|m?js|css)$/.test(x.path))){
  const b=await readRegular(path.join(root,f.path));if(sha256(b)!==f.sha256)throw Error('Runtime dependency input changed');const text=b.toString(),signals=[];
  for(const [id,re] of [['fetch',/\bfetch\s*\(/],['websocket',/\bWebSocket\s*\(/],['event-source',/\bEventSource\s*\(/],['service-worker',/navigator\.serviceWorker/],['beacon',/sendBeacon\s*\(/],['xhr',/XMLHttpRequest/],['checkout-authority',/createSecureCheckoutRepository|create-checkout-session/]])if(re.test(text))signals.push(id);
  const origins=[];for(const m of text.matchAll(/https?:\/\/[^\s'"<>`\\)]+/g)){try{const u=new URL(m[0]);if(!origins.includes(u.origin))origins.push(u.origin);}catch{}}
  if(signals.length||origins.some(x=>x!=='https://apparitioninstruments.co.uk'))rows.push({path:f.path,sha256:f.sha256,signals,urlLiteralOrigins:origins.sort(),scope:/^(admin|account)\//.test(f.path)?'authenticated-controller-not-executed':'public-or-shared-static-analysis',execution:'not-executed-by-this-inventory',productionRequests:0});
 }
 return {schemaVersion:1,kind:'atlas-runtime-dependencies',baselineManifestSHA256:manifestSHA256,rows,networkPrimitiveFiles:rows.filter(x=>x.signals.length).length,classification:'source-level signals, not a complete dynamic request graph',browserExecution:'pending',supabaseIntegration:'not-executed; separate authority required',stripeIntegration:'not-executed; sessions prohibited',productionRequests:0};
}
