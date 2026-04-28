# [TICKET-025] Bilingual content and accessibility QA

## Status
`blocked`

## Dependencies
- Requires: #024

## Description
Perform the final content and accessibility implementation pass before end-to-end QA. Moshimo Box is bilingual, and the interface needs to preserve Traditional Chinese product copy while treating English indicator names and sources as first-class content.

## Acceptance Criteria
- [ ] Primary product copy is Traditional Chinese where appropriate, while indicator names, source names, and canonical finance abbreviations remain in their accepted English form.
- [ ] Buttons, headings, proposal cards, errors, and empty states follow calm sentence-case voice with no hype words, emoji, or exclamation marks.
- [ ] Keyboard navigation works for dashboard widgets, indicator details, chat composer, proposal cards, and apply/dismiss controls.
- [ ] Icon-only controls have accessible names and hover/focus tooltips where needed.
- [ ] Dates use `Mar 2026`, `Q1 2026`, or `2026-03-14` formats, never ambiguous numeric dates.

## Design Reference
- **Content**: `docs/design/design-system/README.md` sections "Content Fundamentals", "Numbers, units, and dates", and "Iconography"
- **Tokens**: `docs/design/design-system/colors_and_type.css`

## Visual Reference
The app feels bilingual rather than translated: Traditional Chinese product copy sits naturally next to English indicator names like CPI, M2, FRED, and World Bank. Focus outlines and tooltips are visible without disrupting the paper-and-ink style.

## Implementation Notes
- Suggested files: copy/content map, accessibility refinements, accessibility tests.
- Do not auto-translate finance terminology without an explicit glossary decision.
- Use Lucide icons through the production icon package selected by #001.

## Testing
- Run accessibility tests available in the stack.
- Complete a keyboard-only pass through dashboard, details, chat, and proposal apply flow.
- Review visible copy for forbidden terms, emoji, exclamation marks, missing units, and ambiguous dates.
