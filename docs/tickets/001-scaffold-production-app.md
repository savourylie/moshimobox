# [TICKET-001] Scaffold the production app

## Status
`done`

## Dependencies
- Requires: None

## Description
Create the first production implementation scaffold for Moshimo Box. The repo currently contains only documentation and a CDN React click-through, so this ticket selects and initializes a real full-stack app structure without treating the design-system mock as production code.

## Acceptance Criteria
- [x] A production app scaffold exists with runnable `dev`, `build`, `test`, and `lint` scripts.
- [x] The root route renders a minimal Moshimo Box shell and imports `docs/design/design-system/colors_and_type.css`.
- [x] A short stack decision is recorded in `README.md` or `docs/TECH_DECISIONS.md`, including why the CDN UI kit is reference-only.
- [x] The scaffold includes no authentication, billing, broker integration, or multi-dashboard assumptions.

## Design Reference
- **Tokens**: `docs/design/design-system/colors_and_type.css`
- **Rules**: `docs/DESIGN.md` and `docs/design/design-system/README.md` sections "Visual Foundations" and "Layout rules"

## Visual Reference
The root page shows a warm paper background, a small Moshimo Box application frame, and no dark-mode styling. It should feel like the empty beginning of the dashboard workspace, not a marketing page.

## Implementation Notes
- This is the scaffolding exception to the 1-3 file guideline because generated app files are expected.
- Choose a stack that supports a React UI, server-side API routes, TypeScript, and an OpenAI Agents SDK integration path.
- Do not install production dependencies for auth, subscriptions, trading, or report export.

## Testing
- Run the package manager install command selected by the scaffold.
- Run the documented `dev`, `build`, `test`, and `lint` scripts.
- Open the root route and confirm the page renders with the design-system tokens loaded.
