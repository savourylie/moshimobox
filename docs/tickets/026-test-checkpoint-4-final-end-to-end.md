# [TICKET-026] TEST: Checkpoint 4 — Final end-to-end validation

## Status
`blocked`

## Dependencies
- Requires: #025

## Description
This final checkpoint validates the complete Moshimo Box MVP flow from dashboard load through chat-assisted research and controlled layout changes. It is the last ticket and should pass before the MVP is considered ready for product validation sessions.

The test should confirm the product remains within MVP scope: no auth, no SaaS billing, no broker integration, no report export, and no multi-dashboard management. The app should feel like a macro research workspace, not a trading terminal.

## Acceptance Criteria
- [ ] Fresh install, lint, test, build, and dashboard load complete successfully with all four quadrants visible.
- [ ] Indicator search, widget data, time-series retrieval, and comparison APIs pass smoke tests.
- [ ] Chat can answer a research question, compare series, and propose a dashboard action with source-aware responses.
- [ ] Applying a validated action changes the layout, records history, and creates an action log; dismissing or rejecting a proposal leaves layout unchanged.
- [ ] Accessibility, bilingual copy, loading/error states, and MVP product-scope checks pass.

## Implementation Notes
This is a manual test execution ticket — no code changes unless bugs are found during testing.

Common failure modes: end-to-end tests bypassing real API contracts, generated content missing units or dates, action logs missing chat-turn context, and polish changes introducing dark or hype-styled UI.

## Testing
- Run the full automated suite and a browser end-to-end pass.
- Record tested prompts, endpoint smoke checks, browser widths, and any known limitations in the release notes or PR.
