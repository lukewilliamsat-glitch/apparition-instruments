// Native Chrome fixture entry. All HTTP is loopback; no Supabase host is contacted.
import {createProductionFixture,fixtureConfig} from './production-fixture.mjs';
import {bootAdminGate} from '../../dist/admin/admin-gate.mjs';
import {mountAdminWorkspace} from '../../dist/admin/command/entry.mjs';
const nativeFetch=globalThis.fetch.bind(globalThis),params=new URLSearchParams(location.search);
let mode=params.get('state')==='error'?'failure':params.get('role')==='nonadmin'?'denied':'ok',clockOffset=0,app;
const realNow=Date.now;Date.now=()=>realNow()+clockOffset;
const fixture=createProductionFixture({storage:localStorage,events:window,now:()=>Date.now(),requestOverride:(url,options)=>{
 const u=new URL(url);if(u.origin!==fixtureConfig.url)throw Error('Unexpected fixture origin.');
 const target=new URL('/tests/command05/backend'+u.pathname,location.origin);target.search=u.search;target.searchParams.set('__fixture_mode',mode);
 return nativeFetch(target,options);
}});
globalThis.fetch=(url,options)=>{if(new URL(url,location.href).origin!==location.origin)throw Error('External request forbidden by isolated fixture.');return nativeFetch(url,options);};
const banner=document.createElement('p');banner.textContent='FICTIONAL HTTP BACKEND · REAL READ ADAPTER UNDER TEST · NO LIVE SERVICE';banner.style.cssText='padding:.5rem 1rem;background:#272116;color:#f3d8a6;font:12px system-ui';document.querySelector('main').prepend(banner);
await bootAdminGate({document,auth:fixture.auth,workspaceServices:{commandReadAdapter:fixture.adapter},load:async()=>({mountAdminWorkspace:async options=>{app=await mountAdminWorkspace(options);return app;}})});
window.ascensionFixture=Object.freeze({app,services:fixture,structuralOnly:false,setMode:value=>mode=value,expire:()=>clockOffset=3601000});
