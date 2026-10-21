import {createHash} from 'node:crypto';import {deflateSync} from 'node:zlib';
const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const chunk=(type,data)=>{const body=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;for(const b of body)crc=table[(crc^b)&255]^(crc>>>8);const len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([len,body,sum]);};
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function fixturePNG(size=102400,seed=1){
 const h=Buffer.alloc(13);h.writeUInt32BE(64,0);h.writeUInt32BE(48,4);h[8]=8;h[9]=6;
 const pixels=Buffer.alloc(48*(1+64*4));for(let y=0;y<48;y++)for(let x=0;x<64;x++){const i=y*(1+64*4)+1+x*4;pixels[i]=(seed*47)%255;pixels[i+1]=(seed*89)%255;pixels[i+2]=(seed*131)%255;pixels[i+3]=255;}
 const signature=Buffer.from([137,80,78,71,13,10,26,10]),head=chunk('IHDR',h),data=chunk('IDAT',deflateSync(pixels)),end=chunk('IEND',Buffer.alloc(0));
 const padding=Buffer.alloc(size-signature.length-head.length-data.length-end.length-12);let value=seed;
 for(let i=0;i<padding.length;i++){value^=value<<13;value^=value>>>17;value^=value<<5;padding[i]=value&255;}
 return Buffer.concat([signature,head,chunk('npAD',padding),data,end]);
}
export const dataURL=b=>'data:image/png;base64,'+b.toString('base64');
export function workload(count=14,size=102400,unique=Math.min(count,10)){
 const entries={},assets=new Map(),rows=[];
 for(let i=0;i<count;i++){
  const assetIndex=i%unique;let entry=[...assets.values()][assetIndex]?.entry;
  if(!entry){const bytes=fixturePNG(size,assetIndex+1),assetHash=sha(bytes),path='/assets/catalogue-images/'+assetHash+'.png';entry={assetHash,path,mime:'image/png',bytes:bytes.length,sourceHash:sha(dataURL(bytes))};assets.set(path,{entry,bytes});}
  const id='fixture-'+String(i).padStart(3,'0');entries[id]=entry;
  rows.push({id,sku:id,name:'Fixture '+i,category:'capacitors',manufacturer:'Synthetic',description:'Synthetic component only',specs:{Value:'0.022µF'},product_content:{},individually:true,in_kits:true,sale_price:500+i,kit_price:300,kit_price_quantity:1,stock:10,image_identity:entry.sourceHash,image_reference:null});
 }
 return {rows,assets,manifest:{version:1,revision:sha(JSON.stringify(entries)),entries}};
}
export const config={url:'https://catalogue.nightfall.invalid',publishableKey:'sb_publishable_fixture'};
export const delivery={enabled:true,verificationMode:'demand',assetOrigin:'https://images.nightfall.invalid',manifestPath:'/assets/catalogue-images/manifest.json'};
export function fixtureTransport(fixture,{delay=0,corrupt=false,basePath='',assetOrigin=delivery.assetOrigin}={}){
 const metrics={calls:[],bodyBytes:0,active:0,peak:0};
 const request=async(url,options={})=>{
  const u=new URL(url);metrics.calls.push({url,cache:options.cache});
  if(u.origin===config.url){if(u.pathname!=='/rest/v1/catalogue_delivery_v2'||u.searchParams.get('select').split(',').includes('image'))throw Error('Unapproved fixture catalogue read');return Response.json(fixture.rows);}
  if(u.origin!==assetOrigin||!u.pathname.startsWith(basePath+'/assets/catalogue-images/'))throw Error('Unapproved fixture image origin/path');
  if(u.pathname.endsWith('.json'))return Response.json(fixture.manifest);
  const asset=fixture.assets.get(u.pathname.slice(basePath.length));if(!asset)return new Response(null,{status:404});
  metrics.active++;metrics.peak=Math.max(metrics.peak,metrics.active);
  try{await new Promise(r=>delay?setTimeout(r,delay):setImmediate(r));if(options.signal?.aborted)throw Error('Fixture request aborted');metrics.bodyBytes+=asset.bytes.length;
   const bytes=corrupt?Buffer.from(asset.bytes):asset.bytes;if(corrupt)bytes[bytes.length-1]^=1;
   return new Response(bytes,{headers:{'content-type':'image/png','content-length':String(bytes.length)}});
  }finally{metrics.active--;}
 };
 return {request,metrics};
}
