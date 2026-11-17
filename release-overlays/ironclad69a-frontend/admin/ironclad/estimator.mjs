import {allocateShared,money,pence} from './model.mjs';
const form=document.querySelector('#estimate'),lines=form.querySelector('#estimate-lines'),result=form.querySelector('#estimate-result');
let active=true;
const el=(name,text)=>{const node=document.createElement(name);if(text!=null)node.textContent=text;return node;};
function input(label,name,placeholder=''){
 const l=el('label',label),i=el('input');i.type='text';i.inputMode=name==='quantity'?'numeric':'decimal';i.name=name;i.placeholder=placeholder;i.maxLength=14;l.append(i);return l;
}
function paint(){
 if(!active)return;
 try{
  const rows=[...lines.querySelectorAll('fieldset')];
  if(rows.some(r=>!r.querySelector('[name=unit]').value.trim())){result.textContent='Enter each component unit cost to see the estimate.';return;}
  const data=rows.map(row=>{
   const q=row.querySelector('[name=quantity]').value.trim();
   if(!/^[1-9]\d{0,4}$/.test(q))throw Error('Enter a quantity from 1 to 99,999 on each line.');
   return {qty:Number(q),unit:pence(row.querySelector('[name=unit]').value)};
  });
  const shared=pence(form.elements.freight.value)+pence(form.elements.extra.value)-pence(form.elements.credit.value);
  const parts=allocateShared(shared,data.map(x=>x.qty));
  const landed=data.map((x,i)=>x.qty*x.unit+parts[i]);
  if(landed.some(n=>!Number.isSafeInteger(n)||n<0))throw Error('Review the shared costs and credits. Each landed line must be zero or more and within the calculator limit.');
  const total=landed.reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(total))throw Error('Total exceeds the calculator limit.');
  result.textContent='Estimated landed total: '+money(total)+'. Per unit: '+data.map((x,i)=>'£'+(landed[i]/x.qty/100).toFixed(4)).join(', ')+'. Nothing saved.';
 }catch(error){result.textContent=error.message;}
}
function add(){
 if(lines.childElementCount>=30)return;
 const f=el('fieldset'),grid=el('div'),quantity=input('Quantity','quantity','1'),cost=input('Unit cost (£)','unit','0.00');
 quantity.querySelector('input').value='1';grid.className='form-grid';grid.append(quantity,cost);
 const remove=el('button','Remove line');remove.type='button';remove.addEventListener('click',()=>{if(lines.childElementCount>1){f.remove();paint();}});
 f.append(el('legend','Component line'),grid,remove);lines.append(f);paint();
}
form.addEventListener('submit',e=>{e.preventDefault();paint();});
form.addEventListener('input',paint);form.querySelector('#add-estimate-line').addEventListener('click',add);
document.addEventListener('admin:conceal',()=>{active=false;form.reset();lines.replaceChildren();result.textContent='';},{once:true});
add();
