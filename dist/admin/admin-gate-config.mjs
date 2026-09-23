// TEMPORARY STATIC ADMIN ACCESS GATE
// Casual-access prevention for the static GitHub Pages build only. This digest and
// all client-side checks are inspectable and must be replaced by authenticated
// Admin access when shared/durable persistence is implemented.
export const adminSessionKey='apparition.admin.temporary-access.v1';
export const adminSessionValue='granted';
export const temporaryPasswordDigest='64c890b90db4b32dcf74cf058c6392c04317f8a647c8dda6ca7043bd0d608ebb';
