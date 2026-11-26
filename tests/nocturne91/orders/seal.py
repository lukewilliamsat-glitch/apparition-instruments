"""Apply the narrowly scoped Orders update to the accepted production archive."""
import json
import sys
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile, ZipInfo

BASE = 'd8bd80c834da53aa0f31b2de245c45706c12380daf26e7a2217f06dc253768d0'


def digest(data):
    return sha256(data).hexdigest()


def build(base, source, out):
    if digest(base.read_bytes()) != BASE:
        raise ValueError('Requires the NOCTURNE 90 production archive')
    with ZipFile(base) as archive:
        names = archive.namelist()
        if len(names) != 500 or len(set(names)) != len(names):
            raise ValueError('Unexpected baseline archive')
        baseline = {name: archive.read(name) for name in names}
    files = baseline.copy()
    orders = 'admin/orders/'

    def replace(path, old, new):
        old, new = old.encode(), new.encode()
        if files[path].count(old) != 1:
            raise ValueError(f'Unexpected baseline {path}: {old!r}')
        files[path] = files[path].replace(old, new)

    replace(orders+'index.html','./app.mjs?build=nocturne90','./app.mjs?build=nocturne91-orders')
    replace(orders+'index.html','</head>',
        '<link rel="stylesheet" href="./fulfilment.css?build=nocturne91-orders"></head>')
    replace(orders+'app.mjs','const $=selector=>document.querySelector(selector);',
        """import {mountFulfilmentTable} from './fulfilment-table.mjs?build=nocturne91-orders';
const $=selector=>document.querySelector(selector);
let fulfilmentTable, listEpoch=0;""")
    replace(orders+'app.mjs',"  if(!financeFilter)mountFinancialControls();",
        """  if(!financeFilter)mountFinancialControls();
  if(!fulfilmentTable){
   const table=$('#order-rows').closest('.admin-table-scroll');
   fulfilmentTable=mountFulfilmentTable({document,root:table,message:$('#order-message'),getOrders:()=>records,update(changes){
    const saved=new Map(changes.map(change=>[change.id,change]));
    const left=table.scrollLeft, top=table.scrollTop;
    if(changes.length)listEpoch++;
    records=records.map(order=>{
     const change=saved.get(order.id);
     return change?{...order,status:change.status,fulfilmentStatus:change.status,updatedAt:change.updated_at}:order;
    });
    render();
    table.scrollLeft=left;
    table.scrollTop=top;
   }});
   document.addEventListener('admin:conceal',()=>{listEpoch++;fulfilmentTable.conceal();},{once:true});
  }""")
    replace(orders+'app.mjs',"if(order.externalReference)cell.append(el('small',' · '+order.externalReference));row.append",
        """if(order.externalReference)cell.append(el('small',' · '+order.externalReference));fulfilmentTable?.addSelection(cell,order);row.append""")
    replace(orders+'app.mjs',"if(index===3||index===4)cell.append(statusBadge(document,value,index===3&&['unpaid','partially_refunded'].includes(order.paymentStatus)||index===4&&['pending','ready_to_dispatch'].includes(order.fulfilmentStatus)?'warning':'neutral'));",
        """if(index===3)cell.append(statusBadge(document,value,['unpaid','partially_refunded'].includes(order.paymentStatus)?'warning':'neutral'));
 const tone=['pending','ready_to_dispatch'].includes(order.fulfilmentStatus)?'warning':'neutral';
 if(index===4){if(fulfilmentTable)fulfilmentTable.renderStatus(cell,order,value,tone);else cell.append(statusBadge(document,value,tone));}""")
    replace(orders+'app.mjs',"row.insertBefore(summaryCell,row.children[5]);$('#order-rows').append(row);}",
        """row.insertBefore(summaryCell,row.children[5]);$('#order-rows').append(row);}
 fulfilmentTable?.sync(rows);""")
    replace(orders+'app.mjs',"""async function refresh(){if(document.querySelector('.external-order-edit,.external-dispatch-dialog[open]'))return;try{const repository=currentAdminOrderRepository();aftercareUnavailable=false;[records,aftercare]=await Promise.all([repository.list(),repository.aftercare?repository.aftercare().catch(()=>{aftercareUnavailable=true;return [];}):[]]);$('#order-message').textContent='';render();if(!creating&&!aftercareView&&!attempts){financeReport||=mountFinanceReport({root:$('#order-list')});financeReport.update(records);}}catch(error){$('#order-message').textContent=error.message;financeReport?.unavailable();}}""",
        """async function refresh(){
 if(fulfilmentTable?.busy||document.querySelector('.external-order-edit,.external-dispatch-dialog[open]'))return;
 const epoch=++listEpoch;
 try{
  const repository=currentAdminOrderRepository();
  let unavailable=false;
  const [orders,care]=await Promise.all([repository.list(),repository.aftercare?repository.aftercare().catch(()=>{unavailable=true;return [];}):[]]);
  if(epoch!==listEpoch||fulfilmentTable?.busy)return;
  [records,aftercare,aftercareUnavailable]=[orders,care,unavailable];
  $('#order-message').textContent='';
  render();
  if(!creating&&!aftercareView&&!attempts){financeReport||=mountFinanceReport({root:$('#order-list')});financeReport.update(records);}
 }catch(error){if(epoch===listEpoch){$('#order-message').textContent=error.message;financeReport?.unavailable();}}
}""")
    files[orders+'fulfilment-table.mjs']=(source/'fulfilment-table.mjs').read_bytes()
    files[orders+'fulfilment.css']=(source/'fulfilment.css').read_bytes()

    changed=sorted(name for name,data in files.items() if baseline.get(name)!=data)
    if len(changed)!=4 or any(not name.startswith(orders) for name in changed):
        raise ValueError('Unexpected release scope')
    out.mkdir(parents=True,exist_ok=True)
    with ZipFile(out/'nocturne91-orders-static.zip','w') as archive:
        for name,data in sorted(files.items()):
            info=ZipInfo(name,(1980,1,1,0,0,0))
            info.external_attr=0o100644<<16
            archive.writestr(info,data,compress_type=ZIP_STORED)
    manifest={'files':len(files),'changed':changed,'inventory':{name:digest(data) for name,data in sorted(files.items())}}
    (out/'nocturne91-orders-inventory.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    print(f'{len(files)} files, {len(changed)} changed Orders files')


if __name__=='__main__':
    build(*(Path(a) for a in sys.argv[1:]))
