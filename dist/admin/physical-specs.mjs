// Canonical dimensions are millimetres. Empty measurements remain unknown.
export const potentiometerDimensions=Object.freeze([
 ['bushingDiameterMm','Threaded bushing diameter'],
 ['bushingLengthMm','Threaded bushing length'],
 ['shaftDiameterMm','Control shaft diameter'],
 ['shaftLengthMm','Control shaft length'],
 ['exposedShaftLengthMm','Overall exposed shaft length'],
 ['bodyDiameterMm','Body diameter'],
 ['bodyDepthMm','Body depth']
]);
export function dimension(value,label='Dimension'){
 if(value===''||value==null)return undefined;
 if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>1000||Math.round(value*1000)/1000!==value)throw new Error(label+' must be a positive millimetre value (up to three decimal places).');
 return value;
}
export function validatePhysicalStructure(specs,category){
 if(!specs||typeof specs!=='object'||Array.isArray(specs))throw new Error('Invalid physical specifications.');
 const keys=Object.keys(specs);if(keys.some(key=>key!=='potentiometer'))throw new Error('Unknown physical specification family.');
 if(specs.potentiometer!==undefined){
  if(category!=='potentiometers')throw new Error('Potentiometer dimensions require a potentiometer category.');
  const pot=specs.potentiometer,allowed=new Map(potentiometerDimensions);
  if(!pot||typeof pot!=='object'||Array.isArray(pot)||Object.keys(pot).some(key=>!allowed.has(key)))throw new Error('Invalid potentiometer dimensions.');
  for(const [key,label] of potentiometerDimensions)if(pot[key]!==undefined)dimension(pot[key],label);
 }
 return specs;
}
export function physicalRows(product){
 if(product?.category!=='potentiometers')return [];
 const values=product.physicalSpecs?.potentiometer||{};
 return potentiometerDimensions.flatMap(([key,label])=>{
  try{const value=dimension(values[key],label);return value===undefined?[]:[{label,value:value+' mm'}];}catch{return [];}
 });
}
