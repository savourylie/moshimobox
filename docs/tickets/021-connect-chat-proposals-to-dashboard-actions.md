# [TICKET-021] Connect chat proposals to dashboard actions

## Status
`done`

## Dependencies
- Requires: #018 ✅, #020 ✅

## Description
Connect the chat panel, agent responses, action proposals, and dashboard renderer into a single controlled interaction. Users should be able to ask research questions and apply validated layout changes from the chat.

## Acceptance Criteria
- [x] Chat responses can include a structured action proposal card with recommendation text, affected widgets, and apply/dismiss controls.
- [x] Applying a proposal calls the backend mutation path, updates the dashboard schema, and records the action log.
- [x] Dismissing a proposal leaves the dashboard unchanged and records no mutation.
- [x] Rejected or stale proposals display a factual error and keep the previous layout visible.
- [ ] The chat can answer at least one data lookup, one comparison, and one layout-change request in the browser flow.

## Design Reference
- **Components**: `docs/design/design-system/ui_kits/app/chat.jsx` action proposal reference
- **Voice**: `docs/design/design-system/README.md` sections "Voice & tone" and "Microcopy patterns"
- **Motion**: `docs/design/design-system/README.md` section "Animation"

## Visual Reference
Proposal cards appear inside the chat panel with an understated accent background, clear affected-widget details, and primary/secondary action buttons. Applying a change updates the dashboard without a page reload.

## Implementation Notes
- Suggested files: chat-agent integration module, proposal card component, integration tests.
- The frontend should never construct unsafe layout mutations by itself; it displays proposals and calls validation/apply endpoints.
- Keep assistant copy bilingual-ready and source-aware.

## Testing
- Run integration tests for proposal render, apply, dismiss, stale proposal, and rejected proposal flows.
- Manually ask for a comparison chart and a recession-watch style layout change; verify dashboard updates only after apply.
