import {project, publishableKey} from '/config.mjs';
const expected = 'https://prwmowexhonguvtiywsy.supabase.co';
if (project !== expected || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) throw Error('Invalid staging configuration');
const el = id => document.getElementById(id);
const report = text => { el('status').textContent = text; };
let jwt, quote, requestId;
const rpc = name => '/rest/v1/rpc/' + name;
async function api(route, { method = 'GET', data, auth = false } = {}) {
  if (!/^\/(?:auth|rest|functions)\/v1\/[A-Za-z0-9_/?=.,&%-]+$/.test(route)) throw Error('Invalid staging route');
  const target = new URL(route, expected);
  if (target.origin !== expected) throw Error('Unexpected staging origin');
  const headers = { apikey: publishableKey };
  if (auth) {
    if (!jwt) throw Error('Sign in to staging first');
    headers.Authorization = 'Bearer ' + jwt;
  }
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(target, { method, headers, body: data === undefined ? undefined : JSON.stringify(data),
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (res.status === 401 && auth) reset();
  const body = res.status === 204 ? null : await res.json();
  if (!res.ok) throw Error(typeof body?.message === 'string' ? body.message.slice(0, 250) : 'Staging request failed (' + res.status + ')');
  return body;
}
function reset() {
  jwt = undefined;
  resetQuote();
  el('admin-result').textContent = '';
  el('admin').hidden = el('logout').hidden = true;
  el('auth').hidden = false;
}
function resetQuote() {
  quote = requestId = undefined;
  el('quote-result').textContent = '';
  el('pay').disabled = true;
}
function show(id, result) { el(id).textContent = JSON.stringify(result, null, 2); }
function bounded(task) { return async e => {
  e.preventDefault();
  if (e.currentTarget.dataset.busy) return;
  const control = e.currentTarget;
  control.dataset.busy = 'true';
  try { await task(); }
  catch (error) { report(error.message || 'Staging request failed.'); }
  finally { delete control.dataset.busy; }
}; }
el('auth').addEventListener('submit', bounded(async () => {
  const form = el('auth'), data = new FormData(form);
  const email = String(data.get('email')).trim();
  if (!/^[a-z0-9._+-]+@example\.invalid$/i.test(email)) throw Error('Use a synthetic example.invalid account.');
  let signed;
  try { signed = await api('/auth/v1/token?grant_type=password', { method:'POST', data:{email,password:data.get('password')} }); }
  finally { form.elements.password.value = ''; }
  jwt = signed.access_token;
  let rows;
  try {
    const actor = await api('/auth/v1/user', { auth:true });
    if (!/^[a-f0-9-]{36}$/.test(actor.id) || !/@example\.invalid$/i.test(actor.email)) throw Error('Synthetic identity not verified.');
    rows = await api('/rest/v1/admin_members?select=user_id&user_id=eq.'+actor.id+'&limit=1', { auth:true });
  } catch (error) { reset(); throw error; }
  el('logout').hidden = false;
  el('auth').hidden = true;
  el('admin').hidden = rows.length !== 1;
  report(rows.length === 1 ? 'Signed in as a staging Admin.' : 'Signed in as a staging buyer. Admin access is not available.');
}));
el('logout').addEventListener('click', bounded(async () => {
  try { await api('/auth/v1/logout', { method:'POST', auth:true }); }
  finally { reset(); }
  report('Signed out.');
}));
for (const [id,path] of [['inventory','/rest/v1/inventory?select=component_id,quantity,stock_unit&limit=20'],
 ['orders','/rest/v1/orders?select=id,reference,sales_channel,payment_status,status,total_pence&order=created_at.desc&limit=10']]) {
  el(id).addEventListener('click', bounded(async () => show('admin-result', await api(path,{auth:true}))));
}
el('commerce').addEventListener('click', bounded(async () => show('admin-result', await api(rpc('commerce67_admin_workspace'), {
  method:'POST',auth:true,data:{}
}))));
el('finance').addEventListener('click', bounded(async () => {
  const id=el('finance-id').value.trim();
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) throw Error('Enter a synthetic staging order UUID.');
  show('admin-result', await api(rpc('command63_financial_read'),{method:'POST',auth:true,data:{p_order_id:id}}));
}));
el('checkout').addEventListener('input', resetQuote);
el('checkout').addEventListener('submit', bounded(async () => {
  const data = new FormData(el('checkout'));
  const item = {kind:data.get('kind'), id:data.get('id').trim(), quantity:Number(data.get('quantity'))};
  const code = data.get('code').trim() || null;
  const addon = data.get('addon').trim();
  if (addon) item.addon = addon;
  resetQuote();
  const result = await api(rpc('commerce67_quote'),{method:'POST', data:{p_items:[item],p_code:code},auth:!!jwt});
  if (!/^[a-f0-9]{32}$/.test(result?.quoteId)) throw Error('Invalid quote returned.');
  const now = new FormData(el('checkout'));
  if ([...now.values()].some((value,i)=>value!==[...data.values()][i])) return;
  quote = { items:[item], quoteId:result.quoteId, code, commerceV2:true };
  requestId = crypto.randomUUID();
  show('quote-result',result);
  el('pay').disabled = !jwt;
  report(jwt ? 'Staging quote ready.' : 'Staging quote ready. Sign in and refresh the quote before paying.');
}));
el('pay').addEventListener('click', bounded(async () => {
  if (!quote || !requestId) throw Error('Request a staging quote first.');
  const result = await api('/functions/v1/create-checkout', {method:'POST',auth:true,data:{...quote,requestId}});
  const redirect = new URL(result.url);
  if (redirect.origin !== 'https://checkout.stripe.com' || redirect.username || redirect.password ||
      !/^\/c\/pay\/cs_test_[A-Za-z0-9]+$/.test(redirect.pathname)) throw Error('Refused checkout outside Stripe Sandbox.');
  location.assign(redirect);
}));
(async () => {
  try {
    const rows=await api('/rest/v1/catalogue_components?select=id,name,sku,sale_price&limit=20');
    for (const row of rows) {
      const li=document.createElement('li'); li.textContent=row.name+' · '+row.sku+' · '+row.id; el('catalogue').append(li);
    }
    report(rows.length ? 'Connected to the isolated staging catalogue.' : 'Connected to staging. No synthetic products are available yet.');
    const search=new URLSearchParams(location.search), session=search.get('session_id');
    if (/^cs_test_[A-Za-z0-9]{8,}$/.test(session || '')) {
      show('quote-result',await api('/functions/v1/checkout-status?session_id='+session));
    } else if (search.get('checkout') === 'cancel') {
      report('Returned from checkout. No stock release was initiated by the browser.');
    }
  } catch (error) { report(error.message); }
})();
