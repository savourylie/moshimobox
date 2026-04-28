# Design

Moshimo Box uses the design system at [`docs/design/design-system/`](./design/design-system/) as the canonical source for all visual decisions. Don't re-pick colors, type sizes, or spacing by eye — link the tokens.

## Where things live

| Concern | File |
|---|---|
| Design tokens (color, type, spacing, radius, shadow, motion, layout) | [`design-system/colors_and_type.css`](./design/design-system/colors_and_type.css) |
| Full content, voice, visual, and iconography rules | [`design-system/README.md`](./design/design-system/README.md) |
| Agent-skill manifest (load when starting design work) | [`design-system/SKILL.md`](./design/design-system/SKILL.md) |
| Logo, mark, quadrant glyphs, paper-grain texture | [`design-system/assets/`](./design/design-system/assets/) |
| Per-token preview cards (HTML) | [`design-system/preview/`](./design/design-system/preview/) |
| Dashboard product click-through (React + Babel) | [`design-system/ui_kits/app/`](./design/design-system/ui_kits/app/) |

## Quick rules

Mirrored from [`design-system/SKILL.md`](./design/design-system/SKILL.md) — that file is the source if they ever drift.

1. Always link `colors_and_type.css` and use its CSS variables — never re-pick colors or type sizes by eye.
2. Background defaults to `var(--paper-100)`, surfaces to `var(--paper-50)`. The whole system is light + warm. **No dark mode.**
3. Headlines/body in `Source Serif 4`. UI labels in `Inter Tight`. Numbers in serif with `font-feature-settings: "tnum"`.
4. Use the four quadrant tints (`--growth-*`, `--inflation-*`, `--policy-*`, `--market-*`) only as labels, never as alarms.
5. Status colors are muted — never trader-terminal red/green.
6. Use Lucide icons at 1.5px stroke. No emoji in product copy.
7. Motion: 160–360ms, paper-ease (`cubic-bezier(0.2, 0, 0, 1)`), no bounces.
8. Voice: calm, declarative, no hype. Always show units and observation dates next to numbers.

## What this is not

- Not Bloomberg, not cyberpunk, not generic SaaS.
- No dark mode in MVP — the editorial paper aesthetic depends on the warm light surface.
- No stock photography, no 3D renders, no abstract gradient meshes, no "AI" iconography clichés.
- No emoji in product copy. No spinning loaders. No bouncy spring animations.

## Substitution flags

These are inferred defaults and should be replaced when the brand commissions real assets:

- **Fonts** — Source Serif 4, Inter Tight, JetBrains Mono are loaded from Google Fonts via `colors_and_type.css`. Drop custom files into `design-system/fonts/` and rewire the `@import` if the brand later commissions custom type.
- **Icons** — Lucide via CDN today; install `lucide-react` for production. Swap globally via `design-system/assets/icons/` if a custom set is commissioned.
- **Logo** — current mark is a placeholder built from the visual system, not a designed identity.

## Starting implementation

When real product code lands:

- Import `design-system/colors_and_type.css` (or copy its `:root` variables into your token layer) so every component has access to the canonical tokens.
- Reference `design-system/ui_kits/app/` as the working hi-fi for the dashboard product.
- Once components or a Figma file exist, the design system should be rebased on them — see the caveat in [`design-system/README.md`](./design/design-system/README.md#caveats).
