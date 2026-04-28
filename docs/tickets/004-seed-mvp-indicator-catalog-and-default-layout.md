# [TICKET-004] Seed MVP indicator catalog and default layout

## Status
`done`

## Dependencies
- Requires: #003 ✅

## Description
Create the first provisional indicator catalog and default layout schema. The PRD leaves the final MVP indicator list open, so this ticket seeds a small, reviewable set that covers the four macro quadrants without over-expanding data-source scope.

## Acceptance Criteria
- [x] The seed catalog includes 2-4 indicators per quadrant with name, category, country, source, source series id when known, unit, frequency, definition, and display guidance.
- [x] The default layout schema renders one dashboard with Growth, Inflation, Policy / Liquidity, and Market sections.
- [x] Every seeded widget references a catalog indicator and includes a short semantic description for the dashboard.
- [x] Assumptions about the provisional indicator list are documented near the catalog.

## Implementation Notes
- Suggested files: seed indicator catalog, default layout seed, seed validation tests.
- Prefer FRED and World Bank sources. If a desired market or eurozone indicator lacks a selected provider, mark it as fixture-backed or deferred in the catalog rather than adding a new integration.
- Do not create multi-dashboard management or saved-layout persistence beyond the single default layout.

## Testing
- Run seed validation against the schemas from #003.
- Confirm every default widget has a unit, source, observation date placeholder, and quadrant assignment.
