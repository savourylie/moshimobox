# [TICKET-003] Define core domain schemas

## Status
`blocked`

## Dependencies
- Requires: #001

## Description
Define the shared data contracts that the dashboard, APIs, and agent tools will use. The PRD requires every visible widget to map to a backend API and every UI mutation to pass through controlled validation, so schemas need to exist before implementation fans out.

## Acceptance Criteria
- [ ] Shared schemas or types exist for indicator metadata, time-series points, widget data responses, widget configuration, layout schema, UI action proposals, and action logs.
- [ ] Widget data response validation requires unit, current value, previous value, change, observation date, release date, source, and trend/status metadata.
- [ ] Layout validation supports one dashboard with Growth, Inflation, Policy / Liquidity, and Market quadrants and only the MVP widget types: metric card, line chart, and comparison chart.
- [ ] Schema tests reject missing units, missing observation dates, unknown widget types, and unsafe action payloads.

## Implementation Notes
- Suggested files: shared schema module, domain type exports, schema tests.
- The layout freedom assumption is intentionally constrained for MVP: one dashboard, four fixed quadrants, reorderable widgets, no arbitrary canvas.
- Use stable API-facing names so the agent tools and frontend can share contracts.

## Testing
- Run unit tests for valid and invalid schema examples.
- Confirm TypeScript or runtime validation catches malformed widget and action payloads.
