# [TICKET-014] Render dashboard from layout schema

## Status
`blocked`

## Dependencies
- Requires: #012 ✅, #013

## Description
Render the full dashboard from the validated layout schema rather than hard-coded widget placement. This creates the controlled surface that later chat actions can modify.

## Acceptance Criteria
- [ ] The dashboard renders all four quadrants from the default layout schema with 2-4 widgets per quadrant.
- [ ] Widget order, type, indicator id, and config come from schema data rather than component-local hard-coding.
- [ ] Unknown widget ids or invalid widget configs fail gracefully with a factual widget-level error.
- [ ] The dashboard includes a concise macro snapshot summary without presenting it as investment advice.

## Design Reference
- **Layout**: `docs/design/design-system/README.md` section "Layout rules"
- **UI kit**: `docs/design/design-system/ui_kits/app/app.jsx` quadrant structure
- **Voice**: `docs/design/design-system/README.md` section "Voice & tone"

## Visual Reference
The page reads as a single macro dashboard: a calm snapshot heading, then Growth, Inflation, Policy / Liquidity, and Market sections in order. Widgets flow in a four-column subgrid on desktop and remain organized at smaller widths.

## Implementation Notes
- Suggested files: dashboard renderer component, layout-to-widget mapping module, renderer tests.
- Assumption: the PRD’s optional regime summary becomes a simple macro snapshot layer for MVP, not a separate analytical engine.
- Keep layout mutation hooks internal until validated action APIs are built.

## Testing
- Run renderer tests with valid, invalid, and reordered layout schemas.
- Open the dashboard and confirm every visible number includes a unit and observation date.
