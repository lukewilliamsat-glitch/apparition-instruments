export const potChoices=Object.freeze({Type:['Standard','Push/Pull'],Shaft:['Short','Long'],Taper:['A / Audio','B / Linear','C / Reverse Audio']});
export function resistanceKohms(value){
 const match=typeof value==='string'?value.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*k\s*(?:Ω|ohms?)?$/i):null;
 const number=match?Number(match[1]):null;
 return number!==null&&Number.isFinite(number)&&number>0&&number<=10000?number:null;
}
export function potValues(item={}){
 const specs=item.specs||{},saved=item.technicalSpecs?.potentiometer||{};
 return {Resistance:saved.resistanceKohms??resistanceKohms(specs.Resistance),Type:saved.type??specs.Type??'',Shaft:saved.shaft??specs.Shaft??'',Taper:saved.taper??specs.Taper??''};
}
export function structuredPot(values){
 const n=values.Resistance===''||values.Resistance==null?null:Number(values.Resistance);
 if(n!==null&&(!Number.isFinite(n)||n<=0||n>10000||!/^(?:\d+)(?:\.\d{1,3})?$/.test(String(values.Resistance))))throw Error('Enter a valid resistance in kΩ (number only).');
 const result={};if(n!==null)result.resistanceKohms=n;
 for(const [key,out] of [['Type','type'],['Shaft','shaft'],['Taper','taper']])if(values[key]){if(typeof values[key]!=='string'||values[key].length>100)throw Error('Invalid '+key+' value.');result[out]=values[key];}
 return result;
}
export function applyPotValues(specs,values){
 const next={...specs},data=structuredPot(values);
 if(data.resistanceKohms!==undefined)next.Resistance=String(data.resistanceKohms)+'kΩ';
 for(const [key,prop] of [['Type','type'],['Shaft','shaft'],['Taper','taper']])if(data[prop])next[key]=data[prop];
 return {specs:next,technicalSpecs:{potentiometer:data}};
}
const simple=value=>String(value||'').toLowerCase().replace(/\./g,'').replace(/\s+corporation$/,'').replace(/\s+/g,' ').trim();
export function normaliseManufacturer(value,known=[]){
 const text=String(value||'').trim();if(!text)return '';
 const match=known.find(name=>simple(name)===simple(text));return match||text;
}
