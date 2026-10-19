// Defence in depth. Kernel seccomp is the process/child boundary, not this stub.
globalThis.fetch=async()=>{throw new Error('ATLAS_OFFLINE_FETCH_DENIED');};
globalThis.WebSocket=class {constructor(){throw new Error('ATLAS_OFFLINE_WEBSOCKET_DENIED');}};
