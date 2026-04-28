---
name: moshimo-box-design
description: Use this skill to generate well-branded interfaces and assets for Moshimo Box, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation

**Moshimo Box** is a calm, editorial financial-research workspace. The aesthetic is "warm analytical minimalism" — paper-and-ink palette, serif headlines, restrained motion, no Bloomberg-terminal vibes. Bilingual (Traditional Chinese + English).

## What's in this skill

- `README.md` — full content + visual + iconography guidelines
- `colors_and_type.css` — every design token (link or copy into your work)
- `fonts/` — empty; webfonts are loaded from Google Fonts via the CSS file
- `assets/` — logo lockup, mark, four quadrant glyphs, paper-grain texture
- `preview/` — single-purpose token cards (colors, type, spacing, components)
- `ui_kits/app/` — the dashboard product as a working click-through (React + Babel)

## When designing

1. Always link `colors_and_type.css` and use its CSS variables — never re-pick colors or type sizes by eye.
2. Background defaults to `var(--paper-100)`, surfaces to `var(--paper-50)`. The whole system is light + warm. **No dark mode.**
3. Headlines/body in `Source Serif 4`. UI labels in `Inter Tight`. Numbers in serif with `font-feature-settings: "tnum"`.
4. Use the four quadrant tints (`--growth-*`, `--inflation-*`, `--policy-*`, `--market-*`) only as labels, never as alarms.
5. Status colors are muted — never trader-terminal red/green.
6. Use Lucide icons at 1.5px stroke. No emoji in product copy.
7. Motion: 160–360ms, paper-ease (`cubic-bezier(0.2, 0, 0, 1)`), no bounces.
8. Voice: calm, declarative, no hype. Always show units and observation dates next to numbers.
