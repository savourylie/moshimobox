# [TICKET-020] Implement layout mutation history and action log

## Status
`blocked`

## Dependencies
- Requires: #019

## Description
Apply validated layout actions through a backend-controlled mutation path and record what changed. The PRD requires layout changes to be traceable and agent actions to be recordable.

## Acceptance Criteria
- [ ] Applying a validated action updates the layout schema and returns the new layout plus a diff summary.
- [ ] Layout history stores previous versions in a way that supports at least one-step rollback for MVP.
- [ ] Action logs record timestamp, action type, affected widgets, validation result, and originating chat turn id when available.
- [ ] Mutation endpoints reject unvalidated or stale proposals.

## Implementation Notes
- Suggested files: layout mutation service, action log repository, mutation tests.
- Keep storage simple and local to the selected stack unless #001 selected a durable database.
- Do not add user accounts or multi-dashboard persistence.

## Testing
- Run mutation tests for apply, rollback, stale proposal rejection, and action-log creation.
- Manually apply one add-widget and one move-widget action through the backend path.
