// Generic metadata contracts; storage, membership and publication are adapter-owned.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateAsset(asset){
 if(!uuid.test(asset.id)||!['image/png','image/jpeg','image/webp'].includes(asset.mime_type))throw Error('Unsupported asset identity/type.');
 if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,179}$/.test(asset.filename)||!Number.isInteger(asset.byte_size)||asset.byte_size<1||asset.byte_size>10*1024*1024)throw Error('Invalid asset file metadata.');
 for(const key of ['width','height'])if(!Number.isInteger(asset[key])||asset[key]<1||asset[key]>16384)throw Error('Invalid image dimensions.');
 if(!/^[0-9a-f]{64}$/.test(asset.sha256)||typeof asset.path!=='string'||!/^\/(?!\/)[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/.test(asset.path)||asset.path.includes('..'))throw Error('Unsafe asset reference.');
 return asset;
}
export function validateMediaUsage(usage){
 if(!uuid.test(usage.asset_id)||!uuid.test(usage.article_id)||typeof usage.decorative!=='boolean')throw Error('Invalid media association.');
 if(typeof usage.alt_text!=='string'||usage.alt_text.length>300||!usage.decorative&&!usage.alt_text.trim()||usage.decorative&&usage.alt_text!=='')throw Error('Provide meaningful alt text, or mark the image decorative and leave alt text empty.');
 if(typeof usage.caption!=='string'||usage.caption.length>2000||/[\x00-\x1f\x7f]/.test(usage.alt_text+usage.caption))throw Error('Invalid media text.');
 if(typeof usage.block_ref!=='string'||!/^([a-zA-Z0-9_.:-]{1,120})?$/.test(usage.block_ref))throw Error('Invalid future block reference.');
 return usage;
}
export const mediaContract=Object.freeze({version:1,asset:['identity','filename','MIME','bytes','dimensions','content hash','adapter-approved location'],usage:['document association','future block reference','alt text','caption','decorative intent'],lifecycle:'Private association; no public rendering until an immutable publication adapter authorises it',future:['sanitised storage upload','image block','revision-bound publication projection']});
