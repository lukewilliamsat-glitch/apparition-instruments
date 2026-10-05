import {build} from 'esbuild';await build({entryPoints:['dist/admin/hub-cms/schema.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outfile:'dist/admin/hub-cms/editor-vendor.mjs'});

await build({entryPoints:['dist/admin/hub-cms/docx.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,external:['../../hub-cms/body.mjs'],outfile:'dist/admin/hub-cms/docx-vendor.mjs'});
