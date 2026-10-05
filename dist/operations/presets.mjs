// Admin presentation preset metadata only. OPEN/ORDERS_PAUSED and V1 scheduling remain the server authority.
export const operationPresets=Object.freeze({STANDARD:{label:'Orders paused',title:'Orders are temporarily paused',message:'You can browse and save your basket. Checkout will return when orders reopen.'},HOLIDAY:{label:'Holiday',title:'Workshop holiday',message:'Apparition Instruments is taking a workshop break. The Luthier Hub and interactive tools remain available. Your basket stays saved; online ordering returns when the workshop reopens.'}});
const prefix='[Apparition Operations preset v2] ';
export function readPreset(reason=''){if(reason.startsWith(prefix)){try{const value=JSON.parse(reason.slice(prefix.length));if(value.preset==='HOLIDAY'&&typeof value.reason==='string')return value;}catch{}}return {preset:'STANDARD',reason};}
export function writePreset(preset,reason=''){if(!Object.hasOwn(operationPresets,preset))throw Error('Choose a supported operational preset.');const value=preset==='STANDARD'?reason:prefix+JSON.stringify({preset,reason});if(value.length>2000)throw Error('Shorten the internal reason before saving this preset.');return value;}
export function describeOperations(store,now=Date.now()){
 const start=Date.parse(store.pause_from),end=store.resume_at?Date.parse(store.resume_at):null,active=store.desired_state==='ORDERS_PAUSED'&&now>=start&&(end===null||now<end),preset=readPreset(store.internal_reason).preset;
 return {preset,active,label:active?(preset==='HOLIDAY'?'HOLIDAY · Orders paused':'ORDERS PAUSED'):'OPEN',checkoutAvailable:!active,scheduled:store.desired_state==='ORDERS_PAUSED'&&start>now};
}
