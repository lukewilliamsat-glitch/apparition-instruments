// Served only by the loopback acceptance harness, never imported by dist.
import {bootAdminGate} from '../../dist/admin/admin-gate.mjs';
import {mountAdminWorkspace} from '../../dist/admin/command/entry.mjs';
import {createFixtureServices} from './fixture-services.mjs';
import {setComponentRepository} from '../../dist/admin/component-repository.mjs';
import {setAssemblyRepository} from '../../dist/admin/assembly-repository.mjs';
const params=new URLSearchParams(location.search),role=params.get('role')||'stock';
const f=createFixtureServices({role,count:Number(params.get('size')||14)});
// A real request is never substituted with synthetic data. Deny it before IO.
globalThis.fetch=async()=>{throw Error('Live/backend fetch forbidden by this synthetic harness.');};
if(params.get('state')==='empty')f.empty();
if(params.get('state')==='error')f.enqueue('list',()=>{throw Error('Fictional read failure');});
if(params.get('synthetic-write')==='yes')f.syntheticWriteTesting=true;
const path=location.pathname,isCommand=path==='/admin/command/',legacy=path==='/admin/';let app;
if(legacy){const blocked=async()=>{throw Error('Legacy writes are disabled in acceptance.');};setComponentRepository({list:async()=>f.canonicalRecords().map(r=>({...r,image:null,internalUnitCost:null})),save:blocked,changeStock:blocked,remove:blocked});setAssemblyRepository({list:async()=>[],save:blocked});}
const banner=document.createElement('p');banner.textContent='ENGINEERING ACCEPTANCE · SYNTHETIC DATA ONLY';banner.dataset.fixtureBanner='true';banner.style.cssText='margin:0;padding:.5rem 1rem;background:#272116;color:#f3d8a6;font:12px system-ui';
// Keep evidence labels inside the protected main so the existing gate still hides it.
document.querySelector('main')?.prepend(banner);
if(!path.startsWith('/circuit-forge/'))await bootAdminGate({document,auth:f.auth,workspaceServices:f,load:async specifier=>{
 if(isCommand)return {mountAdminWorkspace:async options=>{app=await mountAdminWorkspace(options);return app;}};
 if(legacy)return import(specifier);
 // Structural specialist reachability; domain implementations remain byte-identical.
 return {};
}});
window.ascensionFixture=Object.freeze({services:f,app,structuralOnly:!isCommand&&!legacy});
