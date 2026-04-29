# [TICKET-007] Build provider boundary and FRED adapter

## Status
`done`

## Dependencies
- Requires: #006 ✅

## Description
Create the data-provider boundary and first live-data adapter for FRED. FRED is a primary MVP source, and the adapter should normalize external observations into the internal series contract without coupling the rest of the app to provider-specific response shapes.

## Acceptance Criteria
- [x] A provider interface supports searching or resolving series metadata and fetching observations by series id and date range.
- [x] The FRED adapter maps observations into normalized time-series points with date, value, unit, frequency, source, and fetched-at metadata.
- [x] Missing API keys or provider failures fall back to clear errors or fixture mode without breaking the dashboard APIs.
- [x] Unit tests mock FRED responses, empty series, invalid series ids, and network errors.

## Implementation Notes
- Suggested files: provider interface, FRED adapter, adapter tests.
- Do not let frontend code call FRED directly.
- Keep source attribution from FRED visible in normalized metadata.

## Testing
- Run adapter unit tests with mocked fetch responses.
- With a local FRED key configured, run one smoke request for a seeded FRED series and inspect normalized output.
