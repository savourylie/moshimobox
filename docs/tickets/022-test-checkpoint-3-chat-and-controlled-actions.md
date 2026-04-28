# [TICKET-022] TEST: Checkpoint 3 — Chat and controlled actions

## Status
`blocked`

## Dependencies
- Requires: #021

## Description
This checkpoint verifies the core agentic product loop: ask a macro research question, receive a sourced response, review a proposed layout action, and apply it through a controlled backend path. It gates polish, analytics, and final QA work.

The test should prove the chat is useful without being unsafe. The agent may suggest dashboard changes, but validated backend actions remain the only way the layout changes.

## Acceptance Criteria
- [ ] Ask "最近美國通膨是上行還下行"; the response cites a relevant series with unit, source, and observation date.
- [ ] Ask for a US versus eurozone or country comparison; the response uses comparison tooling and exposes source metadata.
- [ ] Ask to add or move a widget; the chat shows a proposal card with affected widgets and apply/dismiss controls.
- [ ] Apply the proposal; the dashboard updates through the mutation API and an action log entry is created.
- [ ] Submit an invalid layout request; the system rejects it without changing the dashboard.

## Implementation Notes
This is a manual test execution ticket — no code changes unless bugs are found during testing.

Common failure modes: assistant answers without numeric context, frontend mutates local layout directly, proposal cards omit affected widgets, and rejected actions still update UI state.

## Testing
- Run the full automated test suite.
- Record chat prompts, observed tool calls, and action-log entries in the implementation PR.
