# [TICKET-009] Add normalized cache and freshness metadata

## Status
`blocked`

## Dependencies
- Requires: #007 ✅, #008

## Description
Add a small caching layer around normalized provider responses and expose freshness metadata to the API layer. The PRD calls out update frequency as an open question, so this ticket implements a conservative configurable cache instead of background scheduling.

## Acceptance Criteria
- [ ] Cached series are keyed by provider, series id, country where applicable, date range, frequency, and transformation.
- [ ] API responses expose observation date, release date when available, fetched-at timestamp, and source name.
- [ ] Stale, missing, and provider-error states are represented explicitly so widgets can show factual loading or error copy.
- [ ] Cache behavior is covered by tests for hits, misses, stale entries, and provider errors.

## Implementation Notes
- Suggested files: normalized cache module, freshness metadata helpers, cache tests.
- Assumption: MVP refreshes on request with a configurable TTL. No background data jobs are required yet.
- Keep cache storage simple unless the stack selected in #001 already includes a durable store.

## Testing
- Run cache tests.
- Simulate a provider failure after a successful fetch and confirm the API can report the last successful fetch time.
