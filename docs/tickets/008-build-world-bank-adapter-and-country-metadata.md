# [TICKET-008] Build World Bank adapter and country metadata

## Status
`pending`

## Dependencies
- Requires: #007 ✅

## Description
Add the second MVP provider path for World Bank data and country-aware metadata. This supports the PRD’s country-comparison use cases while keeping high-frequency market data out of scope for the first provider pass.

## Acceptance Criteria
- [ ] The World Bank adapter fetches indicator observations by country, indicator id, and date range.
- [ ] Country metadata supports searchable country names and stable country codes for catalog entries and API filters.
- [ ] Annual or lower-frequency observations are normalized without pretending they are monthly or daily data.
- [ ] Tests cover missing countries, empty World Bank responses, and mixed-frequency metadata.

## Implementation Notes
- Suggested files: World Bank adapter, country metadata module, adapter tests.
- Preserve provider frequency honestly; do not interpolate values unless a requested transformation explicitly defines it.
- Keep country naming bilingual-ready, but do not auto-translate indicator names.

## Testing
- Run adapter tests with mocked World Bank responses.
- Smoke test one country-level series and confirm source, unit, frequency, and observation dates are present.
