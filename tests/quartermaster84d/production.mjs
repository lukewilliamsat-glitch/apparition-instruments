import { mountWorkshop, productionTransport } from './workshop.mjs?build=quartermaster84d';

export async function mountProduction({document, root, auth, orderId, config, boundedJSON, lifetime}) {
  const request = productionTransport({backend:config, auth, boundedJSON,
    fetcher:document.defaultView.fetch.bind(document.defaultView)});
  // An unavailable capability check leaves the established read-only route available.
  const timeout = () => AbortSignal.any([lifetime, AbortSignal.timeout(8000)]);
  const access = await request('access', {}, timeout()).catch(() => null);
  if (!access || !['workshop','drain'].includes(access.mode) ||
      !(access.packing === true || access.finance === true)) return null;
  const suppliers = access.receive === true && access.mode === 'workshop'
    ? await request('suppliers', {}, timeout()) : [];
  if (lifetime.aborted) return null;
  let workshop;
  const element = (tag, value) => Object.assign(document.createElement(tag), {textContent:value});
  if (access.packing === true) {
    const panel = element('div', '');
    root.replaceChildren(panel);
    workshop = mountWorkshop({document, root:panel, orderId, request, suppliers});
  }
  if (access.finance === true && access.mode === 'workshop') {
    const finance = element('section', '');
    const title = element('h2', 'ECLIPSE packing costs');
    const status = element('p', 'Checking evidence…');
    status.setAttribute('role', 'status');
    finance.append(title, status);
    if (!workshop) root.querySelector('[role=status]')?.remove();
    root.append(finance);
    const money = pence => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100);
    async function review() {
      try {
        const p = await request('proposal', {p_order:orderId}, timeout());
        if (lifetime.aborted) return;
        if (p.state === 'already-recorded') {
          status.textContent = 'These costs are already recorded in ECLIPSE.';
          return;
        }
        if (p.state === 'needs-finance-review') {
          status.textContent = 'Review the current financial record or saved fulfilment snapshot in ECLIPSE first.';
          return;
        }
        if (p.state === 'needs-record') {
          status.textContent = 'Save the existing ECLIPSE order financial record first, then return here.';
          return;
        }
        if (p.state !== 'ready') {
          status.textContent = 'A completed pack, recorded postage and a current financial record are required.';
          return;
        }
        status.textContent = 'Packaging ' + money(p.packaging) + ' · actual postage ' + money(p.postage) +
          ' · saved finance revision ' + p.revision;
        const approve = element('button', 'Approve packing costs in ECLIPSE');
        approve.type = 'button';
        approve.addEventListener('click', async () => {
          approve.disabled = true;
          const id = crypto.randomUUID();
          let receipt;
          try {
            receipt = await request('financeSave', {p_order:orderId,p_revision:p.revision,p_basis:p.basis,
              p_evidence:p.evidence,p_request:id}, timeout());
          } catch {
            try { receipt = await request('financeStatus', {p_order:orderId,p_request:id}, timeout()); } catch {}
          }
          if (lifetime.aborted) return;
          status.textContent = receipt?.outcome === 'committed' ? 'Saved ECLIPSE revision ' + receipt.revision :
            receipt?.outcome ? 'Finance changed. Reload and review the current evidence.' :
            'Outcome unconfirmed. Check the ECLIPSE revision history before retrying.';
        });
        finance.append(approve);
      } catch {
        if (!lifetime.aborted) status.textContent = 'Packing costs could not be reviewed.';
      }
    }
    void review();
  }
  return {lock() { workshop?.lock(); }};
}
