// Reuse the accepted fictional Auth and existing controller fixture, never production data.
await import('/tests/command60/browser-entry.mjs');
const calls={};
if(location.pathname==='/admin/overview/'&&document.body.classList.contains('admin-authorized')){
 const root=document.getElementById('overview-content');root.id='fixture-overview';
 const {bootOverview}=await import('/admin/overview.mjs');root.id='overview-content';
 const data={inventory:[{name:'Fictional capacitor',stock:0,active:true},{name:'Fictional switch',stock:12,active:true}],catalogue:[{active:true,kind:'assembly'},{active:true,kind:'wiring-kit'}],orders:[{paymentStatus:'paid',fulfilmentStatus:'paid'},{paymentStatus:'paid',fulfilmentStatus:'ready_to_dispatch'}],articles:[],website:{store:{desired_state:'OPEN'},posts:[]}};
 const sources=Object.fromEntries(Object.keys(data).map(id=>[id,async()=>{calls[id]=(calls[id]||0)+1;if(id==='website'&&new URLSearchParams(location.search).has('fixture-failure')&&calls[id]===1)throw Error('Fictional unavailable source');return structuredClone(data[id]);}]));
 await bootOverview({document,sources});
}
window.ascendanceFixture={phase:'A',calls};
