// Preload for isolated Admin validation: fixtures must provide their own transport.
globalThis.fetch=async()=>{throw new Error('Network access prohibited during isolated Admin validation.');};
