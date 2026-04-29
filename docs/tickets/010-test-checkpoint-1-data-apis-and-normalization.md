# [TICKET-010] TEST: Checkpoint 1 — Data APIs and normalization

## Status
`pending`

## Dependencies
- Requires: #009 ✅

## Description
This checkpoint verifies that live-provider boundaries, normalized data responses, cache behavior, and fixture fallbacks are reliable enough for dashboard integration. It is a gate before frontend widgets depend on provider-backed API behavior.

The test should prove that FRED and World Bank data enter the system through the same internal contracts and that every response remains honest about source, frequency, unit, and dates.

## Acceptance Criteria
- [ ] Fetch at least one seeded FRED series through the API; the response includes unit, source, observation date, and fetched-at metadata.
- [ ] Fetch at least one seeded World Bank series through the API; the response preserves country and frequency metadata.
- [ ] Run comparison against two compatible fixture or provider series; dates align and sources remain visible.
- [ ] Simulate a provider error; the API returns a stable error or stale-data response with no frontend crash.

## Implementation Notes
This is a manual test execution ticket — no code changes unless bugs are found during testing.

Common failure modes: provider-specific fields leaking into API responses, unit-less values, frequency mismatch hidden from the caller, and stale cache entries with no timestamp.

## Testing
- Run the full test suite.
- Record smoke-test endpoint URLs, provider mode, and response examples in the implementation PR.
