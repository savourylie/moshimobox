# [TICKET-024] Run performance, resilience, and loading pass

## Status
`blocked`

## Dependencies
- Requires: #023

## Description
Tighten the dashboard’s perceived performance and failure behavior. Macro data can be slow or stale, so the app should stay usable while clearly communicating what is loading, missing, or outdated.

## Acceptance Criteria
- [ ] Initial dashboard load is measured and documented against a practical MVP threshold chosen during implementation.
- [ ] Widget loading states use skeletons or thin progress bars and name the data being fetched.
- [ ] Provider failures, empty results, stale cache, and invalid action proposals each have stable UI states.
- [ ] Layout shifts during data loading are minimized with fixed widget dimensions or responsive constraints.

## Design Reference
- **Motion**: `docs/design/design-system/README.md` section "Animation"
- **Layout**: `docs/design/design-system/README.md` section "Layout rules"
- **Microcopy**: `docs/design/design-system/README.md` section "Microcopy patterns"

## Visual Reference
The dashboard remains calm under latency: widgets hold their footprint, loading copy is specific, and errors are quiet but visible. No spinning loaders, bouncing motion, or alarming red/green terminal treatment appears.

## Implementation Notes
- Suggested files: performance measurement notes, loading state refinements, resilience tests.
- If the chosen stack has built-in performance tooling, use it rather than adding a new dependency.
- Document any provider or cache assumptions that affect freshness expectations.

## Testing
- Run automated tests for loading and error states.
- Perform a browser pass with throttled network and mocked provider failures.
- Record load measurements and any threshold exceptions.
