// The Admin gate supplies the authenticated repository before loading this file.
import {currentAdminOrderRepository} from '../../../backend/order-data.mjs?v=p08b4';
import {renderInvoiceDocument} from '../../../invoice/document.mjs';

export async function loadAdminInvoice({document,location,repository=currentAdminOrderRepository()}={}){
 const root=document.querySelector('#invoice'),message=document.querySelector('#invoice-message');
 try{
  const id=new URLSearchParams(location.search).get('id');
  if(!/^[a-f\d-]{36}$/i.test(id||''))throw Error('Choose a paid Order in Admin first.');
  const record=(await repository.list()).find(order=>order.id===id);
  const invoice=renderInvoiceDocument(root,record,document);
  document.title='Invoice '+invoice.reference+' | Apparition Instruments';message.textContent='';
 }catch(error){message.textContent=error.message;root.hidden=true;}
}
if(typeof document!=='undefined')loadAdminInvoice({document,location});
