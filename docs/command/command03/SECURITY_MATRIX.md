# COMMAND 03 security matrix

These are synthetic adversarial tests against an injected authority. They establish candidate behaviour, not current deployed RLS or real Auth revocation.

| Scenario | Enforced behaviour |
|---|---|
| No session | No table read; protected workspace concealed |
| Authorised session | Only granted read/write operation succeeds |
| Expired / revoked | Stop protected operation; hide data and retain local draft |
| No catalogue permission | No list data; no successful empty-list substitution |
| No detail permission | No product record exposed |
| No write permission | No save; local proposal preserved |
| Permissions change after review / during submission | Revalidate before save and at fixture commit; no unauthorised mutation |
| Forged role or handle | Client role claims ignored; independent fixture grant required |
| Malformed capabilities | Fail closed; missing/string booleans never grant access |
| Subject mismatch | Reject handle/identity mismatch |
| Session changes during read | Abort/epoch-check even if transport ignores abort |
| Session changes during save | Unknown outcome, no false success or automatic retry |
| Another identity accesses a retained editor/operation | Deny and conceal old values; original identity must restore |
| New session with cached rows | Keep concealed until fresh catalogue succeeds in that generation |
| Wrong product identity | Reject detail and cross-product mutation |
| Conflict at review or commit | Preserve local proposal, show current authority, no force-save |
| Ambiguous response / disconnect | Block resubmission until status reconciles |
| Confirmed failed write | Explicit new review may retry; never report saved early |
| HTTP 401 / 403 | Distinguish expiry/permission; no transient retry or fake empty state |
| Transient safe GET | At most one retry; real deadline and cancellation |
| Missing/malformed detail or inventory | Reject; no browser-local fallback or fabricated stock |
| Unexpected image/private fields | Reject response projection; never render or persist them |
| Stock/image/private/ID mutation | No write capability and schema rejects bypass attempts |
| UI controls bypassed | Adapter and independent fixture authority still enforce permission |
| Open discard modal loses session | Resolve as Keep editing; retain draft and later recovery |
| Teardown | Ignore/abort pending read; never assert an uncertain write could not commit |

No source-image values, private costs, customer/order data, real usernames, passwords or production tokens are in the new fixtures. Fictional handles start COMMAND03_FIXTURE_ONLY_ and cannot authenticate to a live endpoint. Logs record operation kinds/counts, not handles.

CSP, fixed fixture server allowlist, origin restriction, disposable browser context, blocked service workers and a kernel network namespace are independent layers. Negative controls execute before any application page. Interception alone is not the isolation proof.

Residual limits: the browser fixture handle can manipulate its test authority by design; it is not an application security boundary. Future production authority must be server-enforced. Database state, real revocation semantics and token/storage behaviour were not exercised. Assistive-technology, real-device, owner visual and durable screenshot review remain separate.
