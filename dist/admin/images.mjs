// Development image adapter: a bounded data URL persists with the component record.
export const maximumImageBytes=8*1024*1024;
export function imageSource(value){return typeof value==='string'?value:value?.kind==='object'&&typeof value.url==='string'?value.url:null;}
export function validateImage(value){
 if(value===null||value===undefined||value==='')return null;
 if(typeof value==='object'&&value.kind==='object'){
  const key=String(value.key??'').trim(),url=String(value.url??'').trim(),mimeType=String(value.mimeType??'').trim();
  if(!key||key.length>1000||url&&!/^https:\/\//.test(url)||mimeType&&!['image/png','image/jpeg','image/webp'].includes(mimeType))throw new Error('Invalid stored image reference.');
  return {kind:'object',key,...url?{url}:{},...mimeType?{mimeType}:{}};
 }
 if(typeof value!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)||value.length>Math.ceil(maximumImageBytes*4/3)+100)throw new Error('Use a PNG, JPEG or WEBP image no larger than 8 MB.');return value;
}
export async function readImage(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>maximumImageBytes||file.size===0)throw new Error('Use a PNG, JPEG or WEBP image no larger than 8 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v),jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!(file.type==='image/png'&&png||file.type==='image/jpeg'&&jpg||file.type==='image/webp'&&webp))throw new Error('The file contents do not match a supported image format.');
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return validateImage('data:'+file.type+';base64,'+btoa(binary));
}
