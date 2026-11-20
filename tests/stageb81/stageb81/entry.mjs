import { publicBackendConfig } from '../../backend/public-config.mjs?build=sentinel77a-c1';
import { boundedJSON } from '../command/bounded-json.mjs?build=sentinel77a-c1';

const sections = [
  ['unity', 'UNITY · Stock reservations', { paused: 'Paused', accepting: 'Accepting reservations', draining: 'Completing existing reservations' },
    { holds: 'Reservation records', holdLines: 'Reserved lines', measuredAllocations: 'Measured unit allocations' }, 'No reservation records yet.'],
  ['quartermaster', 'QUARTERMASTER · Packing', { disabled: 'Disabled', observe: 'Observe only', workshop: 'Workshop' },
    { materials: 'Packaging materials', packs: 'Packing records', movements: 'Packaging movements' }, 'No packaging activity yet.']
];
const count = value => Number.isInteger(value) && value >= 0 && value <= 1001;
function valid(data) {
  return data?.schema === 1 && sections.every(([key, , modes, metrics]) => {
    const item = data[key];
    return item && Object.hasOwn(modes, item.mode) && Object.keys(metrics).every(metric => count(item[metric]));
  });
}

export function mountAdminWorkspace({document, auth}) {
  const root = document.querySelector('#dominion-workspace');
  if (!root) return;
  const stop = new AbortController();
  const e = (tag, choice, name) => {
    const node = document.createElement(tag);
    if (choice !== undefined) node.textContent = choice;
    if (name) node.className = name;
    return node;
  };
  const header = e('header'), overview = e('a', 'COMMAND Admin');
  overview.href = '/admin/';
  header.append(overview, e('p', 'DOMINION', 'eyebrow'), e('h1', 'Stock & packing status'),
    e('p', 'Read-only overview of reservations and packaging. Manage physical stock and purchases in IRONCLAD.'));
  const operations = e('p', 'Loading stock and packing status…');
  operations.setAttribute('role', 'status');
  const cards = e('div', undefined, 'dominion-grid');
  root.replaceChildren(header, operations, cards);

  async function load() {
    const signal = AbortSignal.any([stop.signal, AbortSignal.timeout(8000)]);
    try {
      const token = await auth.accessToken({ signal, bounded: true });
      if (!token) {
        if (!stop.signal.aborted) operations.textContent = 'Sign in again with an authorised Admin account.';
        return;
      }
      const response = await document.defaultView.fetch(publicBackendConfig.url + '/rest/v1/rpc/dominion81_status', {
        method: 'GET', headers: { apikey: publicBackendConfig.publishableKey, Authorization: 'Bearer ' + token },
        signal, cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer'
      });
      if (stop.signal.aborted) return;
      if ([401, 403, 404].includes(response.status)) {
        operations.textContent = response.status === 404 ? 'Status is unavailable on this deployment.'
          : 'Sign in again with an authorised Admin account.';
        return;
      }
      if (!response.ok) throw new Error('Status request failed.');
      const payload = await boundedJSON(response, 4096, { signal });
      if (stop.signal.aborted) return;
      if (!valid(payload)) throw new Error('Status response did not match the contract.');
      for (const [key, title, modes, metrics, empty] of sections) {
        const item = payload[key], section = e('section'), heading = e('h2', title);
        heading.id = 'dominion-' + key;
        section.setAttribute('aria-labelledby', heading.id);
        section.append(heading, e('p', modes[item.mode], 'dominion-mode'));
        if (Object.keys(metrics).every(metric => item[metric] === 0)) section.append(e('p', empty));
        else {
          const list = e('dl');
          for (const [metric, label] of Object.entries(metrics))
            list.append(e('dt', label), e('dd', item[metric] === 1001 ? '1,000+' : String(item[metric])));
          section.append(list);
        }
        cards.append(section);
      }
      operations.textContent = 'Status loaded.';
    } catch {
      if (!stop.signal.aborted) operations.textContent = 'Could not load status. Reload to try again.';
    }
  }
  void load();
  function lock() { stop.abort(); root.replaceChildren(); }
  return { lock, destroy: lock };
}
