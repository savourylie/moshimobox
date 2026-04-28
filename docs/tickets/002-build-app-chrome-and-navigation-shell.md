# [TICKET-002] Build app chrome and navigation shell

## Status
`blocked`

## Dependencies
- Requires: #001

## Description
Create the persistent dashboard frame: top bar, left navigation, content area, and reserved chat panel region. This unlocks later dashboard and chat work while keeping the visual language aligned with the canonical design system.

## Acceptance Criteria
- [ ] The app frame includes a 56px top bar, left sidebar with Growth, Inflation, Policy / Liquidity, and Market entries, and a content region sized for a future 420px chat panel.
- [ ] The top bar includes the logo or mark asset, global search affordance, settings affordance, and copilot toggle.
- [ ] Sidebar links scroll or route to quadrant anchors without reloading the page.
- [ ] All colors, spacing, typography, radii, shadows, and motion values come from the design tokens.

## Design Reference
- **Layout**: `docs/design/design-system/README.md` section "Layout rules"
- **Assets**: `docs/design/design-system/assets/`
- **UI kit**: `docs/design/design-system/ui_kits/app/` components `TopBar` and `Sidebar`

## Visual Reference
The app frame matches the hi-fi reference structure: paper surface, fixed top bar, quiet left sidebar, quadrant glyphs, saved-layout placeholders, and a right-side area that can later host the chat panel.

## Implementation Notes
- Suggested files: app shell route/layout, shared chrome components, shell styling module.
- Use Lucide icons at 1.5px stroke for search, settings, and copilot controls.
- Keep visible copy sentence case and avoid emoji or hype language.

## Testing
- Run the app locally and verify the chrome remains visible while scrolling dashboard content.
- Check the page at desktop width and a narrow viewport; the layout should not overlap or introduce dark styling.
- Run lint and component tests if available.
