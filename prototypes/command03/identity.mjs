// A lifecycle boundary, not a login implementation. Fixture handles are not JWTs.
export function createFixtureIdentity({now=Date.now}={}){
 let current=null,generation=0;const listeners=new Set();
 const snapshot=()=>Object.freeze({generation,session:current?Object.freeze({...current}):null,status:!current?'signed-out':current.expiresAt<=now()?'expired':'present'});
 const emit=()=>{for(const fn of listeners)fn(snapshot());};
 return Object.freeze({kind:'command03-fixture-identity',snapshot,
  install(session){if(!session||typeof session.token!=='string'||!session.token.startsWith('COMMAND03_FIXTURE_ONLY_')||typeof session.subject!=='string'||!session.subject.startsWith('fixture-operator-')||!Number.isFinite(session.expiresAt))throw Error('Only explicit fictional session handles are accepted.');current={token:session.token,subject:session.subject,expiresAt:session.expiresAt};generation++;emit();},
  clear(){current=null;generation++;emit();},
  notifyExpiry(){generation++;emit();},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
 });
}
