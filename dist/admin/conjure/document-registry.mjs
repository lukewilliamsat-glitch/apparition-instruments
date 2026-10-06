// Universal routing is separate from editing/persistence. No business data is writable here.
export const globalRegions=Object.freeze([{id:'site:apparition:header',label:'Global header',selector:'body > header.site-header',isGlobal:true,isProtected:true},{id:'site:apparition:footer',label:'Global footer',selector:'body > footer',isGlobal:true,isProtected:true}]);
export const pageCapabilities=Object.freeze({canEditContent:true,canMove:true,canResize:true,canInsertBlocks:true,canInsertSections:true,canPublish:false,canEditBusinessData:false});
export class DocumentRegistry{
 #adapters=[];
 register(adapter){if(!adapter.id||typeof adapter.matches!=='function'||typeof adapter.load!=='function')throw Error('Invalid document adapter.');if(this.#adapters.some(a=>a.id===adapter.id))throw Error('Duplicate document adapter.');this.#adapters.push(Object.freeze(adapter));return this;}
 resolve(route,context={}){return this.#adapters.find(a=>a.matches(route,context));}
 list(){return [...this.#adapters];}
}
export const routeKey=route=>route==='/'?'home':route.slice(1,-1).replaceAll('/','.');
export function documentDescriptor({route,type,title,record,editable=true,protectedRegions=[]}){return {id:record.id,route,type,title,record,capabilities:editable?pageCapabilities:{...pageCapabilities,canEditContent:false,canMove:false,canResize:false,canInsertBlocks:false,canInsertSections:false},globalRegions,protectedRegions,persistence:editable?'versioned-private-draft':'none',publication:'disabled',responsive:true};}
