# [TICKET-005] Implement fixture-backed data APIs

## Status
`blocked`

## Dependencies
- Requires: #004

## Description
Expose the first stable API surface using local fixtures and the seeded catalog. These endpoints let the dashboard and agent tools build against the PRD contracts before live provider adapters are complete.

## Acceptance Criteria
- [ ] Indicator search supports filtering by name, category, country, and data source.
- [ ] Widget data lookup returns indicator metadata, current value, previous value, change, observation date, release date, source, and trend/status metadata.
- [ ] Time-series retrieval supports date range, frequency, and optional transformation parameters against fixtures.
- [ ] Series comparison returns two or more normalized series with aligned dates and source attribution.
- [ ] API error responses are stable, factual, and do not leak implementation details.

## Implementation Notes
- Suggested files: API route module, fixture repository module, API contract tests.
- Keep fixtures small and deterministic. The goal is contract stability, not real-time data completeness.
- Reuse schemas from #003 for request and response validation.

## Testing
- Run API route tests for search, widget data, time series, comparison, and invalid requests.
- Manually call each endpoint and verify the response shape matches the PRD.
