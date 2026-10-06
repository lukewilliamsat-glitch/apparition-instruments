// Only validated, serialisable circuit state belongs in editing history.
export function createCircuitHistory(limit=60){
 let entries=[],cursor=-1;
 const copy=value=>JSON.parse(JSON.stringify(value));
 return {
  record(state){const value=JSON.stringify(state);if(entries[cursor]===value)return false;entries=entries.slice(0,cursor+1);entries.push(value);if(entries.length>limit)entries.shift();cursor=entries.length-1;return true;},
  undo(){if(cursor<=0)return null;return copy(JSON.parse(entries[--cursor]));},
  redo(){if(cursor>=entries.length-1)return null;return copy(JSON.parse(entries[++cursor]));},
  get canUndo(){return cursor>0;},get canRedo(){return cursor<entries.length-1;},get size(){return entries.length;}
 };
}
