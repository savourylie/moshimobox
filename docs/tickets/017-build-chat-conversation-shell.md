# [TICKET-017] Build chat conversation shell

## Status
`done`

## Dependencies
- Requires: #016 ✅

## Description
Build the chat side panel as a real conversation surface, independent of the agent service. The panel should feel like a research copilot embedded in the dashboard, not a generic support chat.

## Acceptance Criteria
- [x] The right chat panel can open, close, scroll message history, and preserve dashboard layout without overlap.
- [x] The composer accepts text, sends on Enter, supports a multiline path, and prevents empty sends.
- [x] User and assistant messages render with distinct but calm styling, using the product voice rules.
- [x] Initial helper copy explains data lookup, comparison, and dashboard layout actions without hype or emoji.

## Design Reference
- **Components**: `docs/design/design-system/preview/components-chat.html`
- **UI kit**: `docs/design/design-system/ui_kits/app/chat.jsx`
- **Motion**: `docs/design/design-system/README.md` section "Animation"

## Visual Reference
The chat panel is 420px on desktop, paper-toned, with a sticky header, scrollable message list, and a blurred composer surface. Messages appear quietly with no bouncing animation.

## Implementation Notes
- Suggested files: chat panel component, chat state module, chat component tests.
- Keep the first implementation service-agnostic so #018 can connect the agent backend cleanly.
- Use "Research copilot" as the role label unless later content work changes the persona.

## Testing
- Run component tests for open, close, send, disabled send, and scroll behavior.
- Manually verify keyboard operation and narrow-width layout.
