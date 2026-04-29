# [TICKET-015] Build indicator detail panel

## Status
`done`

## Dependencies
- Requires: #014 ✅

## Description
Add a detail view for a user to inspect an indicator’s definition, historical trend, recent change, and source metadata. This covers the PRD story where a user clicks an indicator to understand its meaning and context.

## Acceptance Criteria
- [x] Clicking or keyboard-selecting a widget opens an indicator detail panel or drawer.
- [x] The detail view shows definition, source, unit, frequency, observation date, release date, recent change, and a historical series view.
- [x] The detail view supports closing, focus return, and keyboard navigation.
- [x] Missing metadata displays factual unavailable states without hiding the unit/date requirement for displayed values.

## Design Reference
- **Components**: `docs/design/design-system/README.md` sections "Cards", "Transparency & blur", and "Iconography"
- **Tokens**: `docs/design/design-system/colors_and_type.css`

## Visual Reference
The detail panel opens as a warm paper surface with clear metadata rows and a restrained chart. It does not cover the entire dashboard unless the viewport requires it.

## Implementation Notes
- Suggested files: indicator detail component, detail data hook/module, component tests.
- Use the existing API contracts; do not fetch directly from provider adapters in the component.
- Treat finance terms carefully. Do not auto-translate canonical indicator names.

## Testing
- Run component and accessibility tests for open, close, focus return, and missing metadata.
- Manually open details for one metric, one line chart, and one comparison chart.
