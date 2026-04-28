# [TICKET-016] TEST: Checkpoint 2 — Dashboard exploration

## Status
`blocked`

## Dependencies
- Requires: #015

## Description
This checkpoint verifies that the dashboard can be used as a standalone macro exploration tool before chat features are added. It is a gate for chat and agent work because the agent will depend on stable dashboard data, schema-driven layout, and indicator detail behavior.

The test should cover the full dashboard path: default schema loads, APIs provide data, widgets render by type, and users can inspect indicator context from the UI.

## Acceptance Criteria
- [ ] Open the dashboard; Growth, Inflation, Policy / Liquidity, and Market render with 2-4 widgets each and no console errors.
- [ ] Verify each visible value includes a unit and an observation date in the accepted date format.
- [ ] Open indicator details from at least three widget types; metadata, source, and historical series are visible.
- [ ] Simulate an API error for one widget; the dashboard remains usable and shows a factual widget-level error.
- [ ] Confirm the dashboard uses warm light styling only and no spinning loaders.

## Implementation Notes
This is a manual test execution ticket — no code changes unless bugs are found during testing.

Common failure modes: schema-rendered widgets losing source metadata, charts hiding mixed-frequency limitations, and detail drawers trapping focus incorrectly.

## Testing
- Run the full automated test suite.
- Complete a browser pass at desktop and narrow widths and record any layout overlap or unreadable text.
