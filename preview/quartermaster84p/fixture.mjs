import {mountAdminWorkspace as observe} from '/admin/quartermaster/entry.mjs';
import {mountAdminWorkspace as historicalPicking} from '/admin/quartermaster/picking.mjs';

const packedId = 'aaaaaaaa-84b0-4000-8000-000000000001';
const pickId = 'aaaaaaaa-84b0-4000-8000-000000000002';
const orderPath = '/admin/orders/';
const reviewPath = '/admin/quartermaster/';
const scenarios = new Map([
  ['packed', 'Packed review'], ['pick', 'Pick rehearsal'], ['disabled', 'Disabled'],
  ['loading', 'Slow response'], ['error', 'Unavailable response']
]);
const packing = [
  {component:'fixture-pot',name:'Fixture potentiometer',quantity:5},
  {component:'fixture-cap',name:'Fixture capacitor',quantity:2}
];
const materials = [{title:'Fixture packing box',available:2}];
const recorded = {packagingActualMinor:48,postageEstimatedMinor:115,postageActualMinor:109};
const awaiting = {packagingActualMinor:null,postageEstimatedMinor:null,postageActualMinor:null};
const parcel = {format:'large-letter',grams:121,outerMm:[40,30,20],tracking:'FIXTURE-TRACK'};
const picked = new Map(packing.map(line => [line.component,0]));
const localRequests = new Map();

function node(tag, value) {
  const el = document.createElement(tag);
  el.textContent = value;
  return el;
}
function link(title, url) {
  const a = node('a', title);
  a.href = url;
  return a;
}
function previewUrl(scenario) {
  const q = new URLSearchParams({order:scenario==='pick'?pickId:packedId});
  if (scenario!=='packed') q.set('scenario',scenario);
  return reviewPath + '?' + q;
}
function orderList(screen, id) {
  const orders = document.createElement('div');
  orders.className = 'order-list';
  orders.append(link('FIXTURE-101 · Packed order',orderPath+'?id='+packedId),
    link('FIXTURE-100 · Awaiting picks',orderPath+'?id='+pickId));
  screen.append(node('h1','Orders'),orders);
  if (id!==packedId && id!==pickId) {
    screen.append(node('p','Choose a demonstration order to open its QUARTERMASTER review.'));
    return;
  }
  const scenario = id===packedId?'packed':'pick';
  screen.append(node('h2',id===packedId?'FIXTURE-101 · Packed order':'FIXTURE-100 · Awaiting picks'),
    link('Review workshop packing',previewUrl(scenario)));
}
function readOnlyResponse(scenario) {
  if (scenario==='disabled') return {schema:1,mode:'disabled',order:null};
  return {schema:1,mode:'observe',order:{reference:'FIXTURE-101',picks:packing.map(line =>
    ({name:line.name,quantity:line.quantity,picked:line.quantity})),materials,cost:recorded,parcel,readyForReview:true}};
}
function historicalResponse() {
  return {schema:1,rollout:'workshop',canPick:true,order:{id:pickId,reference:'FIXTURE-100',
    packingState:'reserved',picked:packing.map(line=>({...line,picked:picked.get(line.component),currentAvailable:12})),
    materials,cost:awaiting,readyForReview:false},parcel:null};
}
const reply = (value,status=200) => new Response(JSON.stringify(value),{status,
  headers:{'Content-Type':'application/json'}});
function fakePick(body) {
  const line = packing.find(entry=>entry.component===body.p_component);
  if (body.p_order!==pickId || typeof body.p_request!=='string' || !line ||
      !Number.isInteger(body.p_quantity) || body.p_quantity<0 || body.p_quantity>line.quantity) return reply({},400);
  const request = JSON.stringify(body);
  if (localRequests.has(body.p_request)) {
    return localRequests.get(body.p_request)===request ? reply({picked:body.p_quantity}) : reply({},409);
  }
  if (picked.get(line.component)!==body.p_expected) return reply({},409);
  picked.set(line.component,body.p_quantity);
  localRequests.set(body.p_request,request);
  return reply({picked:body.p_quantity});
}
function localTransport(scenario) {
  return async (url,{method,body})=>{
    const route = new URL(url);
    if (route.origin!=='https://quartermaster-fixture.invalid') return reply({},403);
    const path = route.pathname;
    const id = route.searchParams.get('p_order');
    if (method==='GET' && path==='/rest/v1/rpc/quartermaster84_review' && id===packedId && scenario!=='pick') {
      if (scenario==='error') return reply({},503);
      if (scenario==='loading') await new Promise(done=>setTimeout(done,2200));
      return reply(readOnlyResponse(scenario));
    }
    if (scenario==='pick' && path==='/rest/v1/rpc/quartermaster82_review' && method==='GET' && id===pickId) return reply(historicalResponse());
    if (scenario==='pick' && path==='/rest/v1/rpc/quartermaster80_pick' && method==='POST') return fakePick(JSON.parse(body));
    return reply({},403);
  };
}
const screen = document.querySelector('#screen');
const params = new URLSearchParams(location.search);
if (location.pathname===reviewPath) {
  const scenario = params.get('scenario') ?? 'packed';
  const controls = document.createElement('nav');
  controls.className = 'controls';
  controls.setAttribute('aria-label','Fixture states');
  for (const [value,title] of scenarios) {
    const anchor = link(title,previewUrl(value));
    if (value===scenario) anchor.setAttribute('aria-current','page');
    controls.append(anchor);
  }
  screen.append(controls);
  if (scenario==='pick') {
    const hint = node('p','Historical picking rehearsal. Counts reset on reload. The proposed read-only release has no pick controls.');
    hint.className = 'state-hint';
    screen.append(hint);
  }
  const workspace = document.createElement('div');
  workspace.id = 'quartermaster-workshop';
  screen.append(workspace);
  const view = {location, querySelector:document.querySelector.bind(document), createElement:document.createElement.bind(document),
    defaultView:{fetch:localTransport(scenario)}};
  const mount = scenario==='pick'?historicalPicking:observe;
  mount({document:view,auth:{accessToken:async ()=>'preview-fixture-marker'}});
} else {
  orderList(screen,params.get('id'));
}
