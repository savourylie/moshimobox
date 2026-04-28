# [TICKET-006] TEST: Checkpoint 0 — Foundation scaffold

## Status
`pending`

## Dependencies
- Requires: #002 ✅, #005 ✅

## Description
This checkpoint verifies that the production scaffold, app chrome, shared contracts, seed catalog, default layout, and fixture-backed APIs are ready for feature work. It is a gate: no data-provider or dashboard feature tickets should start until this passes.

The checkpoint focuses on foundation integrity rather than visual completeness. The app should boot, the shell should use the design system, and the backend contracts should be testable with deterministic fixtures.

## Acceptance Criteria
- [ ] Run install, lint, test, and build commands; all complete without failures.
- [ ] Open the root route; the app chrome renders with warm paper tokens, no dark mode, and no console errors.
- [ ] Validate the seed catalog and default layout; every widget maps to a catalog indicator and has unit/source/date metadata.
- [ ] Call search, widget data, time-series, and comparison APIs; responses match the shared schemas.

## Implementation Notes
This is a manual test execution ticket — no code changes unless bugs are found during testing.

Common failure modes: token import path drift, generated scaffold scripts missing from `package.json`, API fixtures missing required metadata, and layout seeds referencing unknown indicators.

## Testing
- Record the exact commands run and their pass/fail result in this ticket or the implementation PR.
- Capture any failing endpoint payloads before fixing them.
