# [TICKET-019] Build action proposal validation

## Status
`blocked`

## Dependencies
- Requires: #017

## Description
Implement the controlled action proposal layer that lets an agent suggest dashboard changes without directly changing UI state. This satisfies the PRD’s action-safety requirement and creates a reviewable bridge between chat intent and layout mutation.

## Acceptance Criteria
- [ ] Action proposal schemas support add widget, move widget, modify widget config, and delete widget.
- [ ] Backend validation checks proposal target widgets, indicator ids, quadrant limits, widget types, and layout schema compatibility.
- [ ] Validation returns a structured diff with affected widgets and a human-readable summary.
- [ ] Invalid proposals are rejected with factual reasons and no layout mutation.

## Implementation Notes
- Suggested files: action proposal schema module, proposal validator service, validator tests.
- Assumption: UI modifications use preview and explicit apply in MVP, not direct automatic application.
- Reuse layout and widget schemas from #003.

## Testing
- Run validator tests for valid add, move, modify, and delete actions.
- Run rejection tests for unknown widgets, unknown indicators, too many quadrant widgets, and invalid widget configs.
