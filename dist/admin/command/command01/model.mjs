// COMMAND 01: an explicit, image-free read model. No transport or side effects.
export const categories = Object.freeze({
  potentiometers: 'Potentiometers', capacitors: 'Capacitors',
  'treble-bleeds': 'Treble bleeds', switches: 'Switches', jacks: 'Output jacks', other: 'Other'
});
export const LOW_STOCK_DISPLAY_THRESHOLD = 3; // Prototype presentation, never a reorder rule.
export const emptyFilters = () => ({query:'',category:'',manufacturer:'',individual:'',kit:'',stock:''});
const text = (v, fallback='') => typeof v === 'string' ? v.trim().slice(0,4000) : fallback;
const integer = (v, field, optional=true) => {
  if (v == null && optional) return null;
  if (!Number.isSafeInteger(v) || v < 0) throw new Error('Invalid '+field+'.');
  return v;
};
const flag = (v, fallback=false) => {
  if (v === undefined) return fallback;
  if (typeof v !== 'boolean') throw new Error('Invalid eligibility flag.');
  return v;
};
const specKeys = ['resistance','taper','tolerance','capacitance','voltage','shaft','mounting','connection','material'];
export function summary(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid product record.');
  const id=text(record.id), name=text(record.name);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(id) || !name) throw new Error('Product identity is missing or invalid.');
  if (!Object.hasOwn(categories,record.category)) throw new Error('Unrecognised component category.');
  const technicalSpecs={};
  for (const key of specKeys) if (text(record.technicalSpecs?.[key])) technicalSpecs[key]=text(record.technicalSpecs[key]);
  const quantity=integer(record.kitPriceQuantity,'kit price quantity');
  if (quantity===0) throw new Error('Kit price quantity must be positive.');
  return Object.freeze({
    id,name,sku:text(record.sku,id),category:record.category,manufacturer:text(record.manufacturer,'Not supplied'),
    active:flag(record.active,true),individually:flag(record.individually),inKits:flag(record.inKits),
    salePrice:integer(record.salePrice,'selling price'),kitPrice:integer(record.kitPrice,'kit price'),
    kitPriceQuantity:quantity,stock:integer(record.stock,'stock'),stockUnit:text(record.stockUnit,'item'),
    technicalSpecs:Object.freeze(technicalSpecs),revision:text(record.revision,'unversioned'),
    imageState:'unloaded'
  });
}
export function catalogue(records) {
  if (!Array.isArray(records)) throw new Error('Catalogue response must be a list.');
  const ids=new Set();
  return records.map(record=>{
    const row=summary(record);
    if(ids.has(row.id)) throw new Error('Duplicate product identifier: '+row.id+'.');
    ids.add(row.id);return row;
  });
}
export function detail(record,expectedId) {
  const row=summary(record);
  if(row.id!==expectedId) throw new Error('Product detail identity does not match the selection.');
  const info=record.imageInfo;
  const kind=info?.kind??'unloaded';
  if(!['unloaded','absent','available','unavailable','removed'].includes(kind)) throw new Error('Invalid image state.');
  if(kind==='removed' && info?.provenance!=='explicit-synthetic-removal') throw new Error('Image removal requires explicit provenance.');
  const imageInfo={kind};
  if(kind==='available'){
    if(!['image/png','image/webp','image/jpeg'].includes(info.mime) || !/^[a-f0-9]{64}$/.test(info.sha256??'')) throw new Error('Invalid image identity.');
    Object.assign(imageInfo,{mime:info.mime,sha256:info.sha256,bytes:integer(info.bytes,'image byte count',false),width:integer(info.width,'image width',false),height:integer(info.height,'image height',false)});
    if(!imageInfo.width||!imageInfo.height||!imageInfo.bytes) throw new Error('Invalid image dimensions.');
  }
  return Object.freeze({...row,description:text(record.description),specs:text(record.specs),
    productSpecifications:text(record.productSpecifications),imageInfo:Object.freeze(imageInfo)});
}
export function stockState(row) {
  if(row.stock===null)return 'unknown';
  return row.stock===0?'out':row.stock<=LOW_STOCK_DISPLAY_THRESHOLD?'low':'in';
}
export const stockLabel = row => ({unknown:'Not supplied',out:'Out of stock',low:'Low stock',in:'In stock'})[stockState(row)];
export function filterCatalogue(rows,filters) {
  const terms=filters.query.trim().toLocaleLowerCase('en-GB').split(/\s+/).filter(Boolean);
  return rows.filter(row=>{
    const haystack=[row.name,row.sku,row.manufacturer,row.category,categories[row.category],...Object.values(row.technicalSpecs)].join(' ').toLocaleLowerCase('en-GB');
    return terms.every(term=>haystack.includes(term)) &&
      (!filters.category||row.category===filters.category) &&
      (!filters.manufacturer||row.manufacturer===filters.manufacturer) &&
      (!filters.individual||row.individually===(filters.individual==='yes')) &&
      (!filters.kit||row.inKits===(filters.kit==='yes')) &&
      (!filters.stock||stockState(row)===filters.stock);
  });
}
export const money = value => value===null?'Not supplied':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(value/100);
