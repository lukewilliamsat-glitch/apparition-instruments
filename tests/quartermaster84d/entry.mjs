import { mountProduction } from './production.mjs?build=quartermaster84d';
import { productionTransport } from './workshop.mjs?build=quartermaster84d';
import { publicBackendConfig as config } from '../../backend/public-config.mjs?build=sentinel77a-c1';
import { boundedJSON } from '../command/bounded-json.mjs?build=sentinel77a-c1';

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const count = (number, limit) => Number.isSafeInteger(number) && number >= 0 && number <= limit;
const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const money = minor => minor === null ? 'Not recorded' : gbp.format(minor / 100);

function valid(payload) {
  if (payload?.schema !== 1) return false;
  if (payload.mode === 'disabled') return payload.order === null;
  if (payload.mode !== 'observe') return false;
  const order = payload.order;
  return typeof order?.reference === 'string' && order.reference.length <= 128 &&
    Array.isArray(order.picks) && order.picks.length > 0 && order.picks.length <= 100 &&
    order.picks.every(pick => typeof pick.name === 'string' && pick.name.length <= 240 &&
      count(pick.quantity, 10000) && pick.quantity > 0 && count(pick.picked, pick.quantity)) &&
    Array.isArray(order.materials) && order.materials.length <= 25 &&
    order.materials.every(material => typeof material.title === 'string' &&
      material.title.length <= 240 && count(material.available, 1000000)) &&
    ['packagingActualMinor', 'postageEstimatedMinor', 'postageActualMinor']
      .every(key => order.cost?.[key] === null || count(order.cost?.[key], 10000000)) &&
    (order.parcel === null || typeof order.parcel?.format === 'string' &&
      (order.parcel.tracking === null || typeof order.parcel.tracking === 'string') &&
      count(order.parcel.grams, 25000) && Array.isArray(order.parcel.outerMm) &&
      order.parcel.outerMm.length === 3 && order.parcel.outerMm.every(dimension => count(dimension, 1500))) &&
    typeof order.readyForReview === 'boolean';
}

export function mountAdminWorkspace({ document, auth }) {
  const root = document.querySelector('#quartermaster-workshop');
  if (!root) return;

  const orderId = new URL(document.location.href).searchParams.get('order');
  const orderSelected = uuid.test(orderId ?? '');
  const stop = new AbortController();
  const element = (tag, text) => Object.assign(document.createElement(tag), { textContent: text });
  const nav = element('a', orderSelected ? 'Back to this order' : 'Back to Orders');
  nav.href = '/admin/orders/' + (orderSelected ? '?id=' + encodeURIComponent(orderId) : '');
  const status = element('p', 'Choose an existing paid order in Orders.');
  status.setAttribute('role', 'status');
  const evidence = document.createElement('div');
  evidence.className = 'workshop-record';
  root.replaceChildren(nav, element('h1', 'Quartermaster'), status, evidence);

  function section(heading, rows) {
    const container = document.createElement('section');
    container.append(element('h2', heading), ...rows.map(row => element('p', row)));
    evidence.append(container);
  }

  let active;
  async function load() {
    status.textContent = 'Loading packing record…';
    try {
      const overlay = await mountProduction({ document, root, auth, orderId, config, boundedJSON, lifetime: stop.signal });
      if (stop.signal.aborted) { overlay?.lock(); return; }
      active = overlay;
      if (active) return;
      const readSignal = AbortSignal.any([stop.signal, AbortSignal.timeout(8000)]);
      const request = productionTransport({backend:config,auth,boundedJSON,
        fetcher:document.defaultView.fetch.bind(document.defaultView)});
      const result = await request('review',{p_order:orderId},readSignal);
      if (readSignal.aborted) return;
      if (!valid(result)) throw new Error('Unrecognised workshop evidence');
      if (result.mode === 'disabled') {
        status.textContent = 'Packing is disabled. Existing Orders and dispatch are unchanged.';
        return;
      }
      const order = result.order;
      status.textContent = 'Read-only packing review for ' + order.reference + '.';
      section('Saved order pick list', order.picks.map(pick => pick.name + ': ' + pick.picked + ' / ' + pick.quantity + ' picked'));
      section('Packaging availability', order.materials.length
        ? order.materials.map(material => material.title + ': ' + material.available + ' available')
        : ['No packaging materials registered.']);
      section('Packing and postage evidence', [
        'Actually used packaging: ' + money(order.cost.packagingActualMinor),
        'Postage estimate: ' + money(order.cost.postageEstimatedMinor),
        'Recorded postage: ' + money(order.cost.postageActualMinor)
      ]);
      const parcel = order.parcel;
      const parcelRows = parcel ? [
        parcel.outerMm.join(' × ') + ' mm · ' + parcel.grams + ' g · ' + parcel.format,
        parcel.tracking ? 'Tracking evidence: ' + parcel.tracking : 'Tracking not recorded.'
      ] : [];
      parcelRows.push(order.readyForReview ? 'Packing ready for review. Mark dispatch separately in Orders.'
        : 'Dispatch readiness has not been confirmed.');
      section('Parcel and dispatch', parcelRows);
    } catch {
      if (!stop.signal.aborted) status.textContent = 'No accessible packing record. Return to Orders or reload to try again.';
    }
  }

  function lock() {
    stop.abort();
    active?.lock();
    root.replaceChildren();
  }
  if (orderSelected) void load();
  return { lock, destroy: lock };
}
