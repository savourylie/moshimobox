# [TICKET-012] Build metric widget component

## Status
`done`

## Dependencies
- Requires: #011 ✅

## Description
Implement the metric card widget for single-value macro indicators. Metric cards are one of the PRD’s three MVP widget types and must make unit, date, source, and change legible at a glance.

## Acceptance Criteria
- [x] The metric card renders indicator title, current value, unit, signed change, comparison label, observation date, release date when available, source, and short semantic description.
- [x] Numbers use tabular numerals and never render without a display unit; index-like values use explicit labels such as `index` or `points`.
- [x] Status coloring uses muted design tokens and does not imply trading alarms.
- [x] Hover and focus states follow the tokenized border, shadow, and motion rules.

## Design Reference
- **Components**: `docs/design/design-system/preview/components-metric-widget.html`
- **Typography**: `docs/design/design-system/README.md` section "Typography"
- **Colors**: `docs/design/design-system/README.md` sections "Palette" and "Cards"

## Visual Reference
Each card appears on `paper-50` with a 1px warm border, 12px radius, soft shadow, and a small inset quadrant accent bar. The value is prominent, while source and date metadata remain visible without crowding the card.

## Implementation Notes
- Suggested files: metric widget component, widget styling module, metric widget tests.
- Reuse the loaded widget data contract from #011.
- Keep title casing sentence case unless an indicator’s canonical name requires uppercase.

## Testing
- Run component tests with positive, negative, neutral, and missing-release-date examples.
- Visually verify at least one Growth, Inflation, Policy / Liquidity, and Market metric card.
