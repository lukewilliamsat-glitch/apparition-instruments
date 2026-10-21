import {mountWorkbench} from '../command01/view.mjs';
import {createPersistenceFixture} from './persistence.mjs';
import {createEditorView} from './editor-view.mjs';
const fixture=createPersistenceFixture();let app;
const editor=createEditorView(document,{persistence:fixture.persistence,onSaved:()=>{if(app)void app.controller.refresh({supersede:true});}});
app=mountWorkbench(document,{transport:fixture.catalogueTransport,extension:{beforeAction:editor.beforeAction,onState:editor.workbenchState}});
Object.defineProperty(window,'command02',{value:Object.freeze({fixture,editor:editor.session,workbench:app.controller,view:editor,destroy:()=>{editor.destroy();app.destroy();}}),writable:false});
