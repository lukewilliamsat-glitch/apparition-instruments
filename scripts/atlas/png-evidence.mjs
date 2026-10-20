// Structural PNG verification; even a valid PNG does not prove browser execution.
import {inflateSync} from 'node:zlib';
import {fail} from './core.mjs';
function crc32(b){let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
export function checkScreenshotPNG(b,width,minHeight){
 const bad=()=>fail('BROWSER_SCREENSHOT','Invalid/truncated PNG screenshot');
 if(b.length<57||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')bad();
 let pos=8,header=null,end=false;const data=[];
 while(pos<b.length){
  if(pos+12>b.length)bad();const n=b.readUInt32BE(pos),type=b.toString('ascii',pos+4,pos+8);
  if(n>64*1024*1024||pos+12+n>b.length)bad();
  if(crc32(b.subarray(pos+4,pos+8+n))!==b.readUInt32BE(pos+8+n))bad();
  const bytes=b.subarray(pos+8,pos+8+n);
  if(!header){if(type!=='IHDR'||n!==13)bad();header=bytes;}
  else if(type==='IHDR')bad();
  if(type==='IDAT')data.push(bytes);
  if(type==='IEND'){if(n!==0||pos+12!==b.length)bad();end=true;break;}
  pos+=12+n;
 }
 if(!end||!data.length||header.readUInt32BE(0)!==width||header.readUInt32BE(4)<minHeight||header.readUInt32BE(4)>30000||header[8]!==8||![0,2,4,6].includes(header[9])||header[10]||header[11]||header[12])bad();
 const height=header.readUInt32BE(4),channels={0:1,2:3,4:2,6:4}[header[9]],stride=width*channels+1,expected=stride*height;
 if(expected>200*1024*1024)bad();let pixels;try{pixels=inflateSync(Buffer.concat(data),{maxOutputLength:expected+1});}catch{bad();}
 if(pixels.length!==expected)bad();for(let y=0;y<height;y++)if(pixels[y*stride]>4)bad();
 return {width,height,structurallyValid:true,authority:'PNG structure/CRC/decompression only; independent execution witness still required'};
}
