# AGENTS.md

## Project

**Moshimo Box** (もしも箱 — "what-if box") is a bilingual (Traditional Chinese + English) macroeconomic dashboard combining structured market-data widgets with an agentic chat copilot. It's positioned as a research copilot for macro-curious individuals — a place to build a worldview, not a trading terminal. MVP scope: no auth, no SaaS, no broker integration.

## Key docs

- [`docs/PRD.md`](docs/PRD.md) — product requirements (written in zh-TW)
- [`docs/DESIGN.md`](docs/DESIGN.md) — design system pointer
- [`docs/design/design-system/`](docs/design/design-system/) — canonical visual source of truth (tokens, voice rules, assets, UI kit)

## Codebase status

Currently **no implementation exists** — only docs and the design system. Don't assume a framework, build tool, or directory layout that isn't visible in the tree. The dashboard click-through at `docs/design/design-system/ui_kits/app/` is React + Babel via CDN, but that's a hi-fi mock, not the chosen production stack.

## Design rules for any UI work

Mirrored from `docs/design/design-system/SKILL.md`. See `docs/DESIGN.md` for the full list and `docs/design/design-system/README.md` for deep rules.

- Always import tokens from `docs/design/design-system/colors_and_type.css`. Never re-pick colors, type sizes, or spacing by eye.
- Light + warm only. **No dark mode** in MVP.
- `Source Serif 4` for headlines/body, `Inter Tight` for UI labels, `JetBrains Mono` for tabular numbers. Numbers always use `font-feature-settings: "tnum"`.
- Quadrant tints (`--growth-*`, `--inflation-*`, `--policy-*`, `--market-*`) are labels, not alarms. Status colors are muted — never trader-terminal red/green.
- Lucide icons at 1.5px stroke. No emoji in product copy.
- Motion: 160–360ms, paper-ease (`cubic-bezier(0.2, 0, 0, 1)`). No bounces, no spinning loaders.

## Voice & content rules

- Calm, declarative, researcher-to-researcher. No hype: never "powerful", "AI-powered", "🚀", or exclamation marks.
- Sentence case for titles, buttons, headers ("Add widget" not "Add Widget"). Indicator names keep canonical capitalization (CPI, M2, 10Y-2Y).
- Always show the unit next to a number and the observation date (`as of Mar 2026` or `2026-03`). A number without a unit is a bug.
- Dates: `Mar 2026`, `Q1 2026`, `2026-03-14`. Never `3/14/26`.

## Bilingual

Primary product copy lives in Traditional Chinese; English is a first-class citizen for indicator names, data sources, and chat. The PRD is in zh-TW. Don't auto-translate either direction without checking — the voice and term choices matter, especially for finance jargon.
