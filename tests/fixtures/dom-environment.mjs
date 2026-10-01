// Publish the same browser globals consumed by the application, never native fetch.
export function installDOMEnvironment(win){
 for(const key of ['window','document','location','history','localStorage','sessionStorage','navigator','CSS','Event','MouseEvent','KeyboardEvent','PointerEvent','Node','HTMLElement','CustomEvent'])Object.defineProperty(globalThis,key,{value:key==='window'?win:win[key],configurable:true,writable:true});
 // happy-dom has partial SVG geometry APIs; it cannot measure rendered bounds.
 win.SVGSVGElement.prototype.getCTM=undefined;
 globalThis.matchMedia=win.matchMedia.bind(win);globalThis.requestAnimationFrame=win.requestAnimationFrame.bind(win);globalThis.fetch=async()=>{throw Error('Network forbidden in DOM fixtures');};
 const proto=win.HTMLElement.prototype;let owner=proto;while(!Object.getOwnPropertyDescriptor(owner,'innerHTML'))owner=Object.getPrototypeOf(owner);const html=Object.getOwnPropertyDescriptor(owner,'innerHTML');
 Object.defineProperty(owner,'innerHTML',{...html,set(value){if(['forge-diagram','generator-mount','forge-response-graph','forge-pickup-layout-art'].includes(this.id)&&String(value).startsWith('<svg')){const svg=new win.DOMParser().parseFromString(String(value).replace(/<style>[\s\S]*?<\/style>/,''),'image/svg+xml').documentElement;this.replaceChildren(win.document.importNode(svg,true));}else html.set.call(this,value);}});
}
