# [TICKET-013] Build line and comparison chart widgets

## Status
`blocked`

## Dependencies
- Requires: #011

## Description
Implement the line chart and comparison chart widget types. These widgets support historical trends and multi-series comparison without turning the dashboard into a dense trading terminal.

## Acceptance Criteria
- [ ] A line chart widget renders one normalized series with axis labels, date range, latest value, unit, observation date, and source.
- [ ] A comparison chart widget renders two or more normalized series with distinguishable labels, shared date scale, units, and source attribution.
- [ ] Empty, sparse, and mixed-frequency data states display factual copy rather than misleading interpolated visuals.
- [ ] Chart colors use quadrant or tokenized accent colors and remain readable in the warm light theme.

## Design Reference
- **UI kit**: `docs/design/design-system/ui_kits/app/` `ChartWidget` reference
- **Tokens**: `docs/design/design-system/colors_and_type.css`
- **Rules**: `docs/design/design-system/README.md` sections "Palette", "Typography", and "Cards"

## Visual Reference
Charts sit inside the same card system as metrics. Lines are quiet and legible, grid lines are subtle, and the footer clearly names the period and latest observation.

## Implementation Notes
- Suggested files: chart widget components, chart scale helpers, chart component tests.
- Use a proven charting or visualization library if the chosen stack already supports one; otherwise keep the MVP chart layer small and testable.
- Do not add candlestick, order-book, or trading-specific chart affordances.

## Testing
- Run component tests for single-series, comparison, empty, and mixed-frequency inputs.
- Visually verify that series labels and units remain readable at desktop and narrower widths.
