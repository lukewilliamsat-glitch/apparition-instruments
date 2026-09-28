# Apparition Instruments — latest handover state

**Created:** 28 September 2026

Read this file **before** `APPARITION_CURRENT_HANDOVER.md` because it records repository activity that occurred concurrently while the master handover was being written.

## Current observed sequence

1. P11E/F application checkpoint: `9fb4f2c68e94562c5a06b6f0ab24117f48e5a626`.
2. Signal Forge planning-only commits:
   - `91c6ff9471f628c2f541bcb89d6fa88827a055c3`
   - `8e6dfbe9509ee0f1f5d097c05174ea88f023bebe`
   - `bf683434ffd85b6f5d000e642cc46e7da5ed2211`
   - `0b0681acdce0a94bc6cb1e7272f8bb238b2bd144`
3. A concurrent narrow P11 cleanup correction then appeared at `ac469fbbc507d626ad5c00d3959cb579c6e38522`, message **Clarify catalogue manufacturer dependency counts**.
4. Master chat continuity handover was then added at `6024f62279ca65b4dfe66bff38f00d569b44e1b1`.
5. This latest-state file is a subsequent documentation-only commit. Always verify `main` again in the new session.

## What `ac469...` changed

The correction was deliberately small and directly related to P11E/F guarded catalogue deletion:

- Admin Catalogue Settings changed the ambiguous column heading `In use` to `Components using`.
- Manufacturer sections now explicitly explain that the displayed Component count does **not** include Kit Definition dependencies and that permanent deletion checks both.
- `tests/p11-option-delete.mjs` gained assertions for that clarification.

This addresses a real UI ambiguity: the visible count represented Component usage only, while the guarded database deletion also checks Kit Definitions.

## Important uncertainty

The long chat reached its maximum length while Astra was working. The repository proves the focused correction commit exists, but this handover did **not** receive/record Astra's final completion report for the whole economical cleanup pass.

Therefore the fresh session must **not blindly rerun the entire cleanup pass**. Instead:

1. verify current `main`;
2. inspect the commits after `9fb4f2...`, especially `ac469...`;
3. determine whether Astra's cleanup pass completed beyond that commit and whether deployment/tests are already confirmed;
4. only perform any remaining closure work that is demonstrably outstanding;
5. avoid duplicate changes or duplicate broad auditing.

The master handover's P09/P10/P11 and Signal Forge history remains valid. Its section describing the intended economical P11 cleanup should now be interpreted as **the intended scope whose completion status must first be reconciled**, not as permission to automatically rerun it.
