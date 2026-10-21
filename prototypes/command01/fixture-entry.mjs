// The sole entry point is an explicitly synthetic environment, outside dist/.
import {mountWorkbench} from './view.mjs';
import {createFixtureTransport,fixtureRecords} from './fixtures.mjs';
const transport=createFixtureTransport();
const app=mountWorkbench(document,{transport});
// Isolated acceptance handle only. No credentials, live transport, writes or URLs.
Object.defineProperty(window,'commandFixture',{value:Object.freeze({
  transport,controller:app.controller,records:()=>structuredClone(fixtureRecords),
  destroy:()=>app.destroy(),mountWithoutTransport:()=>{app.destroy();return mountWorkbench(document);}
}),writable:false,configurable:false});
