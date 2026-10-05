# Discovery and Operations V2

Preserve-by-default boundary: d4d792a083a604a8aabf4cc04f8979bcc1b59b68. No shared presentation, tool, homepage or checkout authority changes.

Holiday Mode is a named Admin preset, not a third checkout state. It saves ORDERS_PAUSED, customer title/message and V1 pause/resume times through set_store_operations. Preset identity and the human note are encoded in a versioned envelope in the existing private internal_reason field; legacy reasons remain plain text. The public projection never exposes this envelope. Resume clears it. This avoids a migration and a parallel scheduler. Only the existing membership-authorised RPC can persist it. The DB/Edge guard still rejects all effective pauses, irrespective of preset, before initiating an order or payment session.

Production was inspected read-only. It was OPEN with no schedule; this pass does not activate Holiday Mode. News is independent and no News posts are created automatically.

commercial/destinations.mjs is the sole source-controlled commercial handoff registry, keyed by canonical product/category path. Entries may provide a verified eBay item/store URL and optional EBAY preference. No URLs are configured: no authoritative listing URLs were found in inspected repository configuration. Unknown availability never enables a website order; handoffs are additive and never redirect or replace product information. Website checkout retains its live server authority.

Discovery intent mappings are editorial relationships, not search traffic claims. Search Console measurements, outreach and marketplace listing optimisation remain future work. New wiring articles explain supported connections or clearly bounded concepts; no electrical model is added. Independent-volume and phase-switching connection recipes are deferred because the inspected shared graph does not establish those alternate topologies.
