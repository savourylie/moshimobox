# [TICKET-023] Add session event logging

## Status
`blocked`

## Dependencies
- Requires: #022

## Description
Add lightweight event logging for the PRD’s product-validation metrics. Because MVP has no auth or SaaS layer, events should be session-scoped and privacy-conscious.

## Acceptance Criteria
- [ ] The app records session chat count, widget interaction count, executed UI action count, common query type, and common layout-change type.
- [ ] Logged events avoid personal identifiers and do not require user accounts.
- [ ] A developer-readable summary is available through a local endpoint, console view, or debug panel.
- [ ] Tests verify event creation for chat sends, widget detail opens, proposal apply, and proposal dismiss.

## Implementation Notes
- Suggested files: event schema module, event logger, event logger tests.
- Keep analytics local or self-contained until a real product analytics decision is made.
- Do not add third-party analytics SDKs unless explicitly approved later.

## Testing
- Run event logger tests.
- Complete a short browser session and confirm counts update for chat, widget detail, and UI action events.
