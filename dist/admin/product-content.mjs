// Customer-facing content belongs to the existing component record.
const text=(value,max,label)=>{const result=String(value??'').replace(/\r\n?/g,'\n');if(result.length>max)throw new Error(label+' is too long.');return result;};
export function productContent(item){
 const rows=item.productSpecifications??[];
 if(!Array.isArray(rows)||rows.length>100)throw new Error('Use up to 100 product specification rows.');
 const productSpecifications=rows.map(row=>({label:text(row?.label,300,'Specification label').trim(),value:text(row?.value,1000,'Specification value').trim()})).filter(row=>row.label||row.value);
 if(productSpecifications.some(row=>!row.label||!row.value))throw new Error('Each product specification needs both a label and a value, or remove the row.');
 const technicalSpecs=item.technicalSpecs||{};
 if(typeof technicalSpecs!=='object'||Array.isArray(technicalSpecs))throw Error('Invalid structured technical specifications.');
 const pot=technicalSpecs.potentiometer;
 if(pot){if(typeof pot!=='object'||Array.isArray(pot)||pot.resistanceKohms!==undefined&&(!Number.isFinite(pot.resistanceKohms)||pot.resistanceKohms<=0||pot.resistanceKohms>10000))throw Error('Invalid structured potentiometer resistance.');}
 return {productTitle:text(item.productTitle,300,'Product title').trim(),shortDescription:text(item.shortDescription,1000,'Short description'),fullDescription:text(item.fullDescription,20000,'Full description'),productSpecifications,
  fitmentGuidance:text(item.fitmentGuidance,5000,'Fitment guidance').trim(),installationGuidance:text(item.installationGuidance,5000,'Installation guidance').trim(),included:text(item.included,3000,'Included items').trim(),technicalNotes:text(item.technicalNotes,5000,'Technical notes').trim(),
  ...(pot?{technicalSpecs:{potentiometer:structuredClone(pot)}}:{})};
}
export function moveSpecification(rows,index,direction){const target=index+direction;if(index<0||index>=rows.length||target<0||target>=rows.length)return rows;const result=[...rows];[result[index],result[target]]=[result[target],result[index]];return result;}
