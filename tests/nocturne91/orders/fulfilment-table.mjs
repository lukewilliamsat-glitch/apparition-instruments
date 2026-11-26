import {createAdminAuth} from '../admin-auth.mjs?build=sentinel77a-c1';
import {publicBackendConfig} from '../../backend/public-config.mjs?build=sentinel77a-c1';
import {boundedJSON} from '../command/bounded-json.mjs?build=sentinel77a-c1';
import {statusBadge} from '../application.mjs?build=unification78b-81b1';
import {fulfilmentLabels, nextFulfilment} from './lifecycle.mjs?build=sentinel77a-c1';
import {reasonDialog} from './fulfilment-corrections.mjs?build=sentinel77a-c1';

const limit = 25;
export function historicalCompletionEligible(order) {
  return ['EBAY', 'OTHER'].includes(order.channel) && !!order.externalReference?.trim() &&
    order.paymentStatus === 'paid' && !!order.paidAt && !!order.fulfilledAt && !!order.updatedAt &&
    !!nextFulfilment(order) && !order.emailDeliveries?.some(delivery =>
      ['pending', 'claimed'].includes(delivery.state) &&
      (delivery.automatic_delivery_eligible || delivery.external_requested_by));
}

async function changeOrder(operation, body) {
  const signal = AbortSignal.timeout(12000);
  const token = await createAdminAuth().accessToken({signal,bounded:true});
  if (!token) throw new Error('Sign in with a current Admin account.');
  let response;
  try {
    response = await fetch(publicBackendConfig.url+'/rest/v1/rpc/nocturne91_'+operation,{
      method:'POST', signal, redirect:'error', credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer',
      headers:{apikey:publicBackendConfig.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
  } catch {
    throw new Error('Save outcome could not be confirmed. Refresh Orders and check the current stage before trying again.');
  }
  const payload = response.ok ? response : new Response(response.body,{headers:response.headers});
  const result = await boundedJSON(payload,4000,{signal}).catch(()=>null);
  if (response.ok) return result;
  const error = result;
  if (error?.code === '40001') throw new Error('An order changed. Refresh Orders and review the current stage before trying again.');
  if (error?.code === '42501' || response.status === 401 || response.status === 403) throw new Error('Sign in with a current Admin account.');
  if (error?.code === '22023') throw new Error(error.message);
  throw new Error('Save outcome could not be confirmed. Refresh Orders and check the current stage before trying again.');
}

const identity = order => ({id:order.id, updated_at:order.updatedAt, status:order.fulfilmentStatus});

export function mountFulfilmentTable({document, root, message, update, getOrders, request=changeOrder,
  confirm=description=>document.defaultView.confirm(description), askReason=reasonDialog}) {
  const selected = new Map();
  let busy = false, bulkEnabled = false, concealed = false;
  const node = (tag,text) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const toolbar = node('div');
  toolbar.className = 'orders-fulfilment-toolbar';
  const toggle = node('button','Select historical orders');
  const apply = node('button','Mark externally fulfilled');
  const count = node('span');
  for (const button of [toggle,apply]) {
    button.type = 'button';
    button.className = 'button';
  }
  count.setAttribute('aria-live','polite');
  toolbar.append(toggle,count,apply);
  root.before(toolbar);
  const controls = () => {
    toggle.disabled = busy;
    toggle.textContent = bulkEnabled ? 'Cancel selection' : 'Select historical orders';
    toggle.setAttribute('aria-pressed', String(bulkEnabled));
    count.hidden = apply.hidden = !bulkEnabled;
    count.textContent = selected.size+' of '+limit+' selected';
    apply.disabled = busy || !selected.size;
    for (const control of root.querySelectorAll('[data-historical-order], [data-fulfilment-select]')) {
      control.disabled = busy || (control.type === 'checkbox' && selected.size === limit && !control.checked);
    }
  };

  toggle.addEventListener('click', () => {
    bulkEnabled = !bulkEnabled;
    selected.clear();
    update([]);
    controls();
  });

  apply.addEventListener('click', async () => {
    if (busy || !selected.size) return;
    const orders = [...selected.values()];
    busy = true;
    controls();
    try {
      const choice = await askReason({document,title:'Record external fulfilment?',
        description:`Confirm that these marketplace orders were already fulfilled externally: ${orders.map(order=>getOrders().find(row=>row.id===order.id)?.reference).join(', ')}. This records an audited correction without sending email or recording another dispatch, stock movement or charge. Enter how you verified fulfilment.`,
        confirmLabel:'Mark externally fulfilled'});
      if (!choice || concealed) return;
      const result = await request('complete_external_orders',{p_orders:orders,p_reason:choice.reason});
      if (concealed) return;
      if (result !== orders.length) throw new Error('Save response could not be confirmed. Refresh Orders and check the current stages.');
      selected.clear();
      bulkEnabled = false;
      update(orders.map(order=>({...order,status:'completed'})));
      message.textContent = `${result} orders marked Completed. No dispatch email or stock movement was recorded.`;
      toggle.focus();
    } catch (error) {
      if (!concealed) message.textContent = error.message;
    } finally {
      busy = false;
      controls();
    }
  });

  return {
    get busy(){return busy;},
    sync(rows) {
      const visible = new Map(rows.map(order=>[order.id,order]));
      for (const [id,value] of selected) {
        const order = visible.get(id);
        if (!order || !historicalCompletionEligible(order) ||
          order.updatedAt !== value.updated_at || order.fulfilmentStatus !== value.status) selected.delete(id);
      }
      controls();
    },
    addSelection(cell,order) {
      if (!bulkEnabled || !historicalCompletionEligible(order)) return;
      const checkbox = node('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.historicalOrder = '';
      checkbox.setAttribute('aria-label','Select '+order.reference+' for historical correction');
      checkbox.checked = selected.has(order.id);
      checkbox.addEventListener('change', () => {
        if (busy) return;
        if (checkbox.checked && selected.size < limit) selected.set(order.id,identity(order));
        if (!checkbox.checked) selected.delete(order.id);
        controls();
      });
      cell.prepend(checkbox);
    },
    renderStatus(cell,order,label,tone) {
      const target = order.paidAt && order.fulfilledAt && order.updatedAt && nextFulfilment(order);
      if (!target) {
        cell.append(statusBadge(document,label,tone));
        return;
      }
      const select = node('select');
      select.dataset.fulfilmentSelect = order.id;
      select.dataset.tone = tone;
      select.setAttribute('aria-label','Fulfilment for '+order.reference);
      const current = node('option',label);
      current.value = '';
      const next = node('option','Move to '+fulfilmentLabels[target]);
      next.value = target;
      select.append(current,next);
      select.addEventListener('change', async () => {
        if (busy || select.value !== target) return;
        select.value = '';
        const loaded = getOrders().find(row=>row.id === order.id);
        if (!loaded || loaded.updatedAt !== order.updatedAt || loaded.fulfilmentStatus !== order.fulfilmentStatus) {
          message.textContent = 'This order changed. Review the current fulfilment stage.';
          return;
        }
        const consequential = target === 'dispatched' || order.channel === 'WEBSITE' && target !== 'completed';
        if (consequential) {
          const explanation = order.channel === 'WEBSITE'
            ? 'This records the normal website fulfilment update and its notification eligibility. Customer emails follow the existing delivery rules.'
            : 'Confirm any dispatch details are already recorded. A dispatch email can be previewed separately from the order.';
          if (!confirm(`Move ${order.reference} to ${fulfilmentLabels[target]}? ${explanation}`)) return;
        }
        busy = true;
        controls();
        try {
          const changed = await request('advance_order',{p_order_id:order.id,p_expected_updated_at:order.updatedAt,
            p_previous:order.fulfilmentStatus,p_target:target});
          if (concealed) return;
          if (changed?.status !== target || !Number.isFinite(Date.parse(changed.updatedAt))) throw new Error('Save response could not be confirmed. Refresh Orders and check the current stage.');
          update([{...identity(order),status:changed.status,updated_at:changed.updatedAt}]);
          message.textContent = order.reference+' moved to '+fulfilmentLabels[changed.status]+'.';
          const focus = [...root.querySelectorAll('[data-fulfilment-select]')].find(input=>input.dataset.fulfilmentSelect === order.id);
          if (focus) {
            focus.disabled = false;
            focus.focus({preventScroll:true});
          }
        } catch (error) {
          if (!concealed) message.textContent = error.message;
        } finally {
          busy = false;
          controls();
        }
      });
      cell.append(select);
    },
    conceal() {
      concealed = true;
      selected.clear();
      bulkEnabled = false;
      toolbar.hidden = true;
      controls();
    }
  };
}
