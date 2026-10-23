# Source-grounded defects and reproduction

Baseline application: LIGHTHOUSE `932f714b263775215ac091fbef362ad8b5bbc8b5`, inherited unchanged storefront from LANTERN. Native Chrome baseline run [39983839658](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39983839658), harness commit `0729b70acc480a4703f3968cdde2f7d6322eac5a`. All three reproductions passed. Original screenshots are in artifact `12514044916`; its four PNGs were independently read back and verified. Final acceptance also reruns these reproductions by serving the five exact original frontend modules in fresh browser contexts.

| Item | Verified defect | Limit of conclusion |
|---|---|---|
| RAV03 | `readBasket` filtered a syntactically valid saved component if its SKU no longer resolved. Changing a different, valid item then saved the filtered list, deleting the missing intent. | A missing catalogue record does not prove permanent discontinuation. No live customer basket was inspected. |
| RAV15 | An unchanged Operations event replaced the checkout form and disconnected its focused button. During a delayed fictional request, an event created a fresh enabled button while the first attempt remained pending. | The reproduction deliberately made no second submission. It proves control/focus instability, not duplicate sessions or payments. There are no inline customer text fields on this checkout page; those details belong to the later payment handoff. |
| RAV06 | A lost fictional response settled the controller into uncertainty, with the original message retained and duplicate guard active, but its disabled button still said Sending. | Delivery uncertainty itself was already correctly represented in the status text. The fix changes the settled control semantics, not the protocol or delivery guarantee. |

Chromium can replay a POST after a connection reset. The baseline observed multiple transport attempts for one application `fetch`, all carrying the same existing submission identity. Tests count application attempts and independently check identity across transport attempts. They do not claim one wire POST or historical duplicate emails/payments.
