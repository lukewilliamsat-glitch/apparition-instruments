import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function searchVerification(source,value=''){
 if(!value)return source;
 if(!/^[A-Za-z0-9_-]{1,200}$/.test(value))throw Error('Invalid Google site verification value.');
 // Preserve all existing owners' tokens. An added owner never replaces them.
 const tags=[...source.matchAll(/<meta\b[^>]*name=["']google-site-verification["'][^>]*>/gi)];
 if(tags.some(([tag])=>tag.includes('content="'+value+'"')||tag.includes("content='"+value+"'")))return source;
 if(!source.includes('</head>'))throw Error('Homepage head missing.');
 return source.replace('</head>','<meta name="google-site-verification" content="'+value+'">\n</head>');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const file=join(process.argv[2]||'dist','index.html'),source=await readFile(file,'utf8');const result=searchVerification(source,process.env.GOOGLE_SITE_VERIFICATION||'');if(result!==source)await writeFile(file,result);}
