# One content decision; independent technical gates remain

The preserved public `operations/snapshot.json` contains:

`"customer_title": "Orders are temporarily paused Test"`

The repository snapshot instead contains `Orders are temporarily paused`. The
observed snapshot also contains the published workshop-closure News record; the
repository snapshot has no News. The public News index and preserved article agree
on slug, title and publication timestamp. This is a real generated-data difference,
not cache stamping. The version matrix contains exact hashes for both snapshots.

**Recommended first recovery choice:** preserve the observed snapshot exactly,
including its pause state and historical News, until a separately authorised
Operations-content change is approved. Confirm whether that exact title is intended.
Do not use a reconstruction to remove “Test”, reopen orders, change dates, drop News
or select a repository snapshot by appearance. An incorrect choice can alter a
customer notice or store-state presentation. No live state has been changed.

No 20-file approval exercise is needed: thirteen discrepancies are exact canonical
stamp transformations and six other observed content versions are preserved with
identified deltas. This does not certify the untouched historical files as current.

Technical evidence still required: complete authentic deployment inventory, module
version/import-map review, and safe functional/browser acceptance. Six public product
PNGs were recovered with exact historical fingerprints; no Supabase read is needed
to recover those bytes again. Owner sign-off cannot replace invalid/missing evidence.
