import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';
const pages=['dist/admin/index.html','dist/admin/orders/index.html','dist/admin/wiring-kit-master/index.html','dist/admin/catalogue-settings/index.html','dist/admin/hub-cms/index.html','dist/admin/site-operations/index.html','dist/admin/hub-media/index.html'];
export const stripWorkspaces=html=>html.replace(/<!-- ADMIN WORKSPACES (HEAD|NAV) START -->[\s\S]*?<!-- ADMIN WORKSPACES \1 END -->/g,'');
// Compatibility entry point: the authenticated V2 shell owns primary navigation.
// Old callers may still run this command; it must never recreate the V1 menus.
export async function buildWorkspaces(){for(const path of pages){const before=await readFile(path,'utf8'),after=stripWorkspaces(before);if(after!==before)await writeFile(path,after);}}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildWorkspaces();
