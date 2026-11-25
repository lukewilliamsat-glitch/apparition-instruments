import {draftAcquisition} from '../ironclad/model.mjs?build=nocturne89-nexus';
import {action, breakdown, element, heading, metrics, statusRegion} from '../nocturne-ui.mjs?build=nocturne90';
import {commercialOrderDay} from './commercial-date.mjs?build=sentinel77a-c1';
import {financeSummary} from './eclipse-model.mjs?build=sentinel77a-c1';

const currencies = new Set(['GBP','EUR','USD']);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const cost = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e12;

export function attributableCosts(document, rows) {
 if (!Array.isArray(rows) || rows.length > 100) throw Error('Acquisition evidence is unavailable.');
 const updated = structuredClone(document);
 const candidates = new Map();
 for (const row of rows) {
  if (!Number.isInteger(row?.line_index) || row.line_index < 0 || row.line_index >= updated.lines.length) continue;
  const index = row.line_index;
  if (candidates.has(index)) {
   candidates.set(index, null);
   continue;
  }
  candidates.set(index, draftAcquisition(updated.lines[index], row));
 }
 let count = 0;
 for (const [index, line] of candidates) {
  if (!line) continue;
  updated.lines[index] = line;
  count++;
 }
 return {document:updated, count};
}

function summary(document, proposal, validBasis) {
 const shown = structuredClone(document);
 if (proposal) {
  for (const [key, value] of [['packaging',proposal.packaging],['shipping',proposal.postage]]) {
   shown.costs[key] = {minor:value,state:'confirmed',source:'QUARTERMASTER evidence awaiting approval'};
  }
 }
 const result = financeSummary(shown,validBasis);
 const c = result.calculation;
 const knownFees = c?.fees?.some(row => row.minor !== null) ? c.knownFeesMinor : null;
 const priced = c?.lines.filter(row => Number.isSafeInteger(row.cogsMinor)) ?? [];
 const partialAcquisition = c?.cogsMinor == null && !shown.returnCostCredit && priced.length > 0
  ? priced.reduce((sum,row) => sum + row.cogsMinor,0) : null;
 const values = [c?.cogsMinor ?? partialAcquisition, c?.feesMinor ?? knownFees, ...Object.values(c?.fulfilmentCosts ?? {})].filter(Number.isSafeInteger);
 return {shown, result, c, knownFees, partialAcquisition, knownCosts: values.length ? values.reduce((sum,value) => sum + value,0) : null};
}

function ready(value, record) {
 return value?.state === 'ready' && value.revision === record?.revision && value.basis === record?.orderBasisHash
  && hash(value.basis) && hash(value.evidence) && cost(value.packaging) && cost(value.postage);
}

export function mountProfitability({root, order, document:d, initialDocument, historicalCosts, workshop, persistence, details}) {
 const panel = element(d,'section',null,'nocturne-panel');
 const channel = {WEBSITE:'Website',EBAY:'eBay',DIRECT:'Direct',OTHER:'Other marketplace'}[order.channel] ?? 'Order';
 const title = heading(d,'ECLIPSE','Order profitability',order.reference+' · '+channel+' · '+commercialOrderDay(order));
 const detailsButton = action(d,'Financial details',() => details());
 const primary = action(d,'Save financial record',() => submit(),true);
 const status = statusRegion(d);
 const cards = element(d,'div');
 const columns = element(d,'div',null,'nocturne-columns');
 const review = element(d,'p',null,'nocturne-review');
 const checks = new AbortController();
 let snapshot, locked = true, disposed = false, busy = false, loading = false;
 let draft = initialDocument, acquisition = 0, acquisitionMessage = '', workshopMessage = '', message = '';
 let proposal, pendingApproval;
 title.actions.append(detailsButton,primary);
 panel.append(title.header,cards,columns,review,status);
 root.append(panel);

 function activeProposal() {
  return !snapshot?.dirty && snapshot?.record?.orderBasisMatches !== false && ready(proposal,snapshot?.record) ? proposal : null;
 }

 function paint() {
  const pending = activeProposal();
  const {shown,result,c,knownFees,partialAcquisition,knownCosts} = summary(draft,pending,snapshot?.record?.orderBasisMatches !== false);
  const currency = currencies.has(shown.currency) ? shown.currency : 'GBP';
  const money = new Intl.NumberFormat('en-GB',{style:'currency',currency});
  const amount = value => Number.isSafeInteger(value) ? money.format(value / 100) : 'Unknown';
  const estimatedAcquisition = shown.lines.some(line => line.costState === 'estimated');
  const fees = c?.feesMinor != null ? amount(c.feesMinor) : knownFees != null ? amount(knownFees)+' recorded' : 'Unknown';
  const reviewed = result.status === 'Complete' && !pending && !acquisition ? 'Complete'
   : pending || acquisition ? 'Evidence ready for review' : result.status;
  cards.replaceChildren(metrics(d,'Profitability summary',[
   ['Gross buyer payment',amount(shown.actualPaidMinor)],
   ['Contribution',amount(result.contribution), pending && result.contribution != null ? 'After workshop approval' : result.status === 'Estimated' ? 'Estimated' : ''],
   ['Contribution margin',result.margin == null ? 'Unknown' : result.margin+'%',result.margin == null ? '' : 'Based on net seller revenue']
  ]));
  const evidenceLabel = (key, state) => pending && ['shipping','packaging'].includes(key) ? 'QUARTERMASTER · awaiting approval' : state === 'estimated' ? 'Estimated' : '';
  columns.replaceChildren(
   breakdown(d,'Income',[
    ['Product income',amount(c?.productRevenueMinor)],
    ['Customer postage income',amount(shown.postageMinor)],
    ['Recorded refunds',amount(order.refundedPence ?? 0)],
    ['Net seller revenue',amount(c?.netRevenueMinor)]
   ]),
   breakdown(d,'Direct costs',[
    ['Component acquisition',amount(c?.cogsMinor ?? partialAcquisition),[
     partialAcquisition !== null ? 'Partial total' : '', estimatedAcquisition?'Includes estimates':'',acquisition?'IRONCLAD · awaiting save':''
    ].filter(Boolean).join(' · ')],
    ['Packaging',amount(c?.fulfilmentCosts.packaging),evidenceLabel('packaging',shown.costs.packaging.state)],
    ['Actual postage',amount(c?.fulfilmentCosts.shipping),evidenceLabel('shipping',shown.costs.shipping.state)],
    ['Marketplace and payment fees',fees,c?.feesMinor == null && knownFees != null ? 'Complete fee total unknown' : shown.fees.some(f => f.state === 'estimated') ? 'Includes estimates' : ''],
    ['Other direct costs',amount(c?.fulfilmentCosts.other),evidenceLabel('other',shown.costs.other.state)],
    ...(c?.fulfilmentCosts.labour != null ? [['Allocated labour',amount(c.fulfilmentCosts.labour),evidenceLabel('labour',shown.costs.labour.state)]] : []),
    ['Total known direct costs',amount(knownCosts),c?.directCostsMinor == null && knownCosts != null?'Partial total':'']
   ])
  );
  const unresolved = c?.unknown?.length ?? 0;
  const warning = c?.status === 'unreconciled' ? c.warnings?.[0] : result.error;
  review.textContent = [reviewed+(unresolved?' · '+unresolved+' items to review':''),warning,
   acquisitionMessage,workshopMessage].filter(Boolean).join(' · ');
  status.textContent = message || (loading ? 'Checking purchase and workshop evidence…' : '');
  detailsButton.disabled = locked || busy || !!pendingApproval;
  const canSave = !!c && (snapshot?.canSave || acquisition > 0 && snapshot?.record?.orderBasisMatches === true);
  primary.hidden = !pendingApproval && !pending && !canSave;
  primary.disabled = locked || busy || loading || !pendingApproval && !pending && !canSave;
  primary.textContent = pendingApproval ? 'Check workshop approval' : pending ? 'Approve workshop costs' : 'Save financial record';
 }

 const finishApproval = async receipt => {
  if (receipt?.outcome === 'committed' && receipt.orderId === order.id && receipt.requestId === pendingApproval.id && receipt.revision === pendingApproval.revision + 1) {
   pendingApproval = null;
   message = 'Workshop costs approved. Loading the saved revision…';
   await persistence.reload();
  } else if (['conflict','order-conflict'].includes(receipt?.outcome)) {
   pendingApproval = null;
   proposal = null;
   message = 'The saved order or its financial record changed. Reload before approving costs.';
  } else {
   message = 'Approval outcome is uncertain. Check the original receipt before making another change.';
  }
 };

 async function submit() {
  if (locked || busy || loading || disposed) return;
  const pending = activeProposal();
  busy = true;
  persistence.onWork(true);
  paint();
  try {
   if (pendingApproval || pending) {
    const signal = AbortSignal.any([checks.signal,AbortSignal.timeout(8000)]);
    let receipt;
    if (pendingApproval) {
     receipt = await workshop('financeStatus',{p_order:order.id,p_request:pendingApproval.id},signal);
    } else {
     pendingApproval = {id:crypto.randomUUID(),revision:pending.revision};
     receipt = await workshop('financeSave',{p_order:order.id,p_revision:pending.revision,p_basis:pending.basis,
      p_evidence:pending.evidence,p_request:pendingApproval.id},signal);
    }
    if (!disposed) await finishApproval(receipt);
   } else {
    persistence.update(draft, !!financeSummary(draft).calculation);
    await persistence.save();
   }
  } catch {
   if (!disposed) message = pendingApproval ? 'Approval outcome is uncertain. Check the original receipt before retrying.' : 'The record could not be saved. Your inputs are retained.';
  } finally {
   busy = false;
   if (!disposed) {persistence.onWork(!!pendingApproval);paint();}
  }
 }

 async function loadEvidence() {
  if (snapshot?.record?.orderBasisMatches === false || disposed || draft.currency !== 'GBP') return;
  loading = true; paint();
  const signal = AbortSignal.any([checks.signal,AbortSignal.timeout(10000)]);
  const tasks = [
   historicalCosts && draft.lines.some(line => line.costState === 'unknown') ?
    Promise.resolve().then(() => historicalCosts(signal)).then(rows => {
     if (disposed || busy || locked) return;
     const result = attributableCosts(draft,rows);
     draft = result.document;
     acquisition = result.count;
     if (acquisition) acquisitionMessage = acquisition+' line'+(acquisition===1?'':'s')+' matched to purchase evidence';
    }).catch(() => { if(!disposed) acquisitionMessage = 'Purchase evidence unavailable'; }) : null,
   workshop ? Promise.resolve().then(() => workshop('proposal',{p_order:order.id},signal)).then(value => {
    if (disposed) return;
    proposal = value;
    workshopMessage = ({
     'already-recorded':'Workshop costs are recorded',
     'needs-pack':'No completed workshop pack',
     'needs-postage':'Workshop postage has not been recorded',
     'needs-record':'Save a financial record to review workshop costs',
     'needs-finance-review':'Review saved fulfilment in Financial details before approving workshop costs'
    })[value?.state] || '';
   }).catch(() => { if(!disposed) workshopMessage = 'Workshop cost evidence unavailable to this session'; }) : null
  ];
  await Promise.all(tasks);
  loading = false;
  if(!disposed) paint();
 }

 paint();
 return {panel, setSession(value,isLocked) {
   if (disposed) return;
   const first = !snapshot;
   snapshot = value; locked = isLocked;
   paint();
   if (first && !locked) void loadEvidence();
  },
  draft:()=>structuredClone(draft),
  hasUnresolvedApproval:()=>!!pendingApproval,
  get working(){return busy||!!pendingApproval;},
  dispose(){disposed=true;checks.abort();panel.remove();}
 };
}
