// Release gate, not a client role. Server identity, membership and RLS are still required.
// Enable only after the exact owner-operated metadata and bounded live acceptance.
export const productionReadActivation=Object.freeze({
 enabled:false,
 inventoryRead:false,
 metadataEvidenceSHA256:null,
 liveReadEvidenceSHA256:null
});
