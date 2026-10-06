# Announcement hotfix

Starting HEAD: `b334ccb3e0f449e432518c5b30e79a07a3e35e85`.
Starting tree: `355a867baaf7c24128b39c87f9b6416875a505cf`.

The homepage header is an absolute overlay at top zero. Inserting the normal-flow
announcement after that header placed the notice in the same vertical region.
The notice now precedes the header, in its own full-width normal-flow region.
Only while a notice exists, its measured height offsets the homepage overlay
header and the mobile menu. The header's own measured height also locates the
menu correctly across responsive layouts. ResizeObserver and resize fallback
update offsets; dismissal/no-notice disconnect observers and remove offsets.
Header/hero markup, normal header styles and mobile menu controller are unchanged.

The banner uses title and compact excerpt/message, optional safe CTA and permitted
dismissal. It never renders the News body. Existing ID-based browser dismissal is
preserved; another announcement has a different storage key. Scoped text wrapping,
flex sizing and natural height handle narrow widths and long text.

Priority zero is valid: native range 0–100, Number(value), database integer range
and RPC coalesce all preserve zero. No falsey-zero bug was found. The reported
historical difference between 0 and 50 cannot be reproduced from the current code;
the exact invalid field or concurrent UI state during that click is unknown.
Confirmed silent paths were native validation/early checkValidity return, busy
submit return and cancelled confirmation. These now expose deterministic feedback
beside News action controls. Validation and confirmation safeguards remain.

Highest effective site-announcement priority wins; ties use latest publication,
then ascending stable slug. Future/expired/non-site/draft/archived entries are
excluded. Existing non-dismissible Operations notices remain independent order
authority; no Operations behaviour was changed.

Tests cover above-header placement and measured responsive offsets, observer
cleanup, compact content, CTA safety, dismissal persistence, normal no-notice
positioning, priority/tie/time semantics, priority-zero publish/cancel/failure,
all four actions, in-progress/double-submit feedback and exact allowed scope.
An isolated PGlite fixture exercises priority zero through the unchanged save RPC
and public projection, the range constraint and anonymous write prohibition.
Runtime refresh and the existing Operations Admin/authenticated transport tests
are retained. No browser, production test rows, backend change or migration.

Rendered layout and the original priority-zero observation remain for Luke's
manual acceptance; deterministic source/DOM checks are not a visual certification.
