# Moshimo Box Design System

A calm financial intelligence workspace for understanding markets, not just watching numbers.

---

## Product Context

**Moshimo Box** (もしも箱 — "what-if box") is an interactive macroeconomic dashboard that combines structured market data visualization with an agentic chatbot. It's positioned as a *research copilot*, not a trading terminal — a place to **build a worldview**, not chase tickers.

The product is bilingual at its core (Traditional Chinese + English), so the system must handle both CJK and Latin script gracefully.

### What it does

The dashboard organizes the macro picture into four quadrants:

1. **Growth** — GDP, employment, PMI, industrial production
2. **Inflation** — CPI, PCE, wage growth, commodities
3. **Policy / Liquidity** — central bank rates, balance sheets, money supply
4. **Market** — equities, yields, FX, credit spreads

Each quadrant holds 2–4 widgets (metric cards, line charts, comparison charts). A side-panel chat agent can answer research questions ("is US inflation trending up?") and propose UI mutations ("move unemployment to the top of Growth"), which the user previews and applies.

### Audience

Individual macro-curious researchers and active investors. **Not** day traders, not institutional Bloomberg users, not casual finance-news readers. They want a framework, not a firehose.

### Design intent

> "Calm financial intelligence workspace. Warm analytical minimalism. Editorial-style financial research. Not Bloomberg. Not cyberpunk. Not generic SaaS."

The product needs to feel like a well-organized researcher's desk — paper, ink, soft daylight — rather than a trading floor.

---

## Sources

- **Codebase** (mounted, read-only): `moshimobox/`
  - `moshimobox/README.md` — placeholder, no implementation
  - `moshimobox/docs/PRD.md` — full product requirements (in zh-TW)
- **Figma**: none provided
- **Brand assets**: none provided — logo, typography, and palette are derived from the verbal brief and the PRD's product principles

> ⚠️ **No production code or visual brand assets exist yet.** This system is an inferred design language built from the PRD's tone and the user's aesthetic brief. Once real components or a Figma file land, this system should be rebased on them.

---

## Index

| File | What's in it |
|---|---|
| `README.md` | This file — context, content, visual foundations, iconography |
| `SKILL.md` | Agent-skill manifest; load this when starting design work |
| `colors_and_type.css` | All design tokens — color, type, spacing, radius, shadow |
| `fonts/` | Web font files (or Google Fonts links + flagged substitutions) |
| `assets/` | Logo, marks, sample illustrations, icon references |
| `preview/` | Per-token / per-component cards rendered in the Design System tab |
| `ui_kits/app/` | Hi-fi click-through of the dashboard product |

---

## Content Fundamentals

Moshimo Box is **bilingual** — primary product copy lives in Traditional Chinese, but English is a first-class citizen for indicator names, data sources, and chat. The voice in both languages is the same: **considered, analytical, slightly understated**. Think *Financial Times feature writer*, not *retail trading app*.

### Voice & tone

- **Calm and declarative.** Short sentences. Statements over exclamations. The product never raises its voice.
- **Researcher-to-researcher.** Assume the reader knows what CPI is. Define jargon only when it appears for the first time, in a tooltip or a one-line subtitle.
- **No hype.** Never "🚀", never "powerful", never "AI-powered". The agent is a *research copilot*, not a magic oracle.
- **Honest about uncertainty.** Macro data is noisy and lagging. Copy reflects this — "trending higher over the last 3 prints" beats "rising fast".

### Casing

- **Sentence case** for everything: titles, buttons, menu items, section headers. ("Add widget" not "Add Widget".)
- **Indicator names keep their canonical capitalization** (CPI, M2, 10Y-2Y, ISM, FOMC).
- **Data sources are capitalized as the source spells them** (FRED, World Bank, BLS, BEA).

### Pronouns

- Address the user as **you** in chat suggestions ("Want me to compare these?").
- The agent refers to itself in the **first person singular** but sparingly ("I pulled the latest 12 prints"). Never "we" — there is no team, just the copilot.
- Product-level copy avoids pronouns entirely ("Dashboard updated" not "Your dashboard was updated").

### Numbers, units, and dates

- Numbers use thousands separators and locale-appropriate decimals — `3.2%`, `4,213`, `¥1,250`, `$2.4T`.
- **Always show the unit.** A number without a unit is a bug.
- **Always show the observation date** next to a value, in the form `as of Mar 2026` or `2026-03`. Macro data has lag and the system never hides it.
- Changes are signed and colored (`+0.3%`, `−0.1%`) — not just arrows.
- Dates in UI: `Mar 2026`, `Q1 2026`, `2026-03-14`. Never `3/14/26` (ambiguous internationally).

### Emoji

**No emoji** in product copy. The aesthetic is editorial; emoji break the tone. The only exception is the Moshimo mark itself (a stylized 🜲 / glyph), which is part of the logo and never inline.

### Voice examples

**Good** ✓
- "US headline CPI ticked up to 3.2% in March, the third consecutive monthly increase."
- "I can pull the same series for the eurozone if that helps the comparison."
- "10Y-2Y spread inverted 14 months ago. Still inverted today."
- "No release this week. Next print: Apr 12."

**Bad** ✗
- "🚀 INFLATION IS BACK!"
- "We've got exciting new data for you!"
- "AI-powered macro insights at your fingertips ⚡"
- "Click here to learn more"

### Microcopy patterns

- Empty states are quiet: *"No widgets in this section yet. Ask the agent to add one, or drag from the catalog."*
- Errors are factual, not apologetic: *"FRED is not responding. Last successful fetch: 2 hours ago."*
- Loading states name what's loading: *"Fetching CPI series…"* not *"Loading…"*

---

## Visual Foundations

### Palette

The whole system runs on a **warm paper-and-ink** base. Backgrounds are off-white with a faint warm cast (think aged book paper at noon); foreground text is near-black with a hint of warmth. Accents are restrained: a single deep ink-blue for primary actions, plus muted earth tones for the four macro categories.

- **Surfaces**: `paper-50` through `paper-200` — warm off-whites, the canvas of the entire app.
- **Ink**: `ink-900` through `ink-500` — soft near-blacks for text, warmer than pure gray.
- **Primary**: `accent-ink` — a deep, slightly desaturated blue (`#2C3E64`-ish). Used for primary CTAs, the agent's voice bubble, and active nav.
- **Category tints**: muted `growth` (sage), `inflation` (terracotta), `policy` (slate), `market` (mustard). Each has a 50/100/600/800 ramp. These are *labels*, not alarms — they desaturate enough that four widgets next to each other don't fight.
- **Status**: `positive` (forest green), `negative` (brick red), `neutral` (warm gray). Both positive and negative are *muted* — never the saturated red/green of a trading terminal. A 3% inflation print should not look like a fire alarm.

Dark mode is **not** part of the MVP — the editorial aesthetic depends on the warm paper base. If a dark mode is added later, it should feel like *evening reading light* (warm, dim, low contrast), not OLED black.

### Typography

Two families do all the work:

- **Display & body serif** — `Source Serif 4` (variable). Editorial feel, excellent at small sizes, has a true italic. Used for headlines, dashboard section titles, body prose, and chat messages.
- **UI sans** — `Inter Tight` (variable). Used for labels, buttons, table headers, navigation, indicator names, and any number-heavy UI.
- **Mono** — `JetBrains Mono`. Used for tabular numbers in tables and code blocks in agent responses.

Numbers always render with **`font-feature-settings: "tnum"`** so columns align. Hierarchy comes from **size and weight**, never from color alone. Line length on prose tops out at ~68ch.

### Spacing

A **4px base grid**. The scale jumps at meaningful intervals: `4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96`. Cards have generous internal padding (24–32px) — information density is high but never *cramped*.

### Backgrounds

- The default surface is **flat paper** — `paper-50`. No gradients. No textures. No images in product chrome.
- **Marketing/landing surfaces** may use a single hand-drawn editorial illustration, monochrome, with grain. Never stock photography. Never 3D renders.
- A subtle **paper-grain texture** (`assets/paper-grain.svg`) is available as an optional overlay for landing/login surfaces only. It does not appear in the dashboard itself.

### Borders & dividers

- Hairline borders, 1px, in `ink-150` (warm light gray). Cards prefer a **border + soft shadow combo** rather than shadow alone — the line keeps things crisp on the paper background.
- Dividers between sections: 1px solid `ink-100`, full-width, no margin tricks.

### Shadows / elevation

Two-layer, very soft, warm-tinted shadows (not pure black):

- `shadow-1` — resting state for cards: `0 1px 2px rgba(40,30,20,0.04), 0 1px 1px rgba(40,30,20,0.03)`
- `shadow-2` — hover / lifted: `0 4px 12px rgba(40,30,20,0.06), 0 2px 4px rgba(40,30,20,0.04)`
- `shadow-3` — popovers, menus, the chat composer floating above content
- Modal scrims are `rgba(40, 30, 20, 0.32)` — warm, never blue-black

No glow effects. No neon. No inner shadows except on a single pressed-button state.

### Corner radii

- `radius-sm` 4px — inputs, badges, tags
- `radius-md` 8px — buttons, small cards
- `radius-lg` 12px — widgets, panels
- `radius-xl` 20px — the chat composer and large modals
- `radius-full` 999px — pills, avatars, segmented controls

The whole product favors **medium rounding** — sharp enough to feel precise, rounded enough to feel friendly. No 0px corners (too brutalist for the editorial feel), no 24px+ corners (too consumer).

### Cards

The fundamental container. A card is:
- `paper-50` background (slightly lighter than the page if the page itself is `paper-100`)
- 1px border in `ink-150`
- `radius-lg` (12px)
- `shadow-1` resting → `shadow-2` on hover
- 24px internal padding (32px for hero widgets)
- Optional 3px top accent bar in the relevant category color, inset 1px from the border (never full bleed — the border continues underneath)

### Hover states

- Buttons & links: 6% darken on the fill (or background tint appears on ghost buttons)
- Cards: lift to `shadow-2`, border color shifts to `ink-200`. **No translateY.**
- Icons: opacity 0.7 → 1.0
- Rows in a table or list: background tints to `paper-100`

### Press / active states

- Buttons: scale 0.98 + remove shadow (a 100ms feel of "pressing into paper")
- Toggles: spring-ease (no bounce overshoot — this is a research tool, not a game)

### Animation

Quiet, considered motion. The system has a clear opinion: **fades and small translates only**.

- Default duration: `160ms` for hovers, `240ms` for state changes, `360ms` for layout shifts
- Easing: `cubic-bezier(0.2, 0, 0, 1)` (custom "paper" ease — fast start, soft settle)
- **No bounces, no springs, no overshoot.** Macro data is sober.
- **No spinning loaders.** Use a thin progress bar at the top of a widget, or a pulsing skeleton.
- Chat messages fade + 4px translate-up on appear, staggered 60ms per token group
- Agent action proposals slide in from the right of the chat, never the bottom

### Transparency & blur

Used sparingly. The chat composer at the bottom of the side panel uses a `backdrop-filter: blur(12px) saturate(140%)` over a `paper-50/85` fill so content scrolls behind it without becoming illegible. Modal scrims do **not** blur — they only dim. Sidebars are opaque.

### Layout rules

- The dashboard uses a **fixed top bar (56px)** + **fixed left sidebar (240px collapsed to 64px)** + **optional right chat panel (420px)**.
- Content area is a 12-column grid with 24px gutters, max-width 1440px, centered.
- The four macro quadrants on the dashboard each get one row of the grid; widgets within a quadrant flow in a 4-column subgrid.
- Vertical rhythm: every section uses the 8px multiplier scale. Don't fight the grid.

### Imagery

- **Warm, low-contrast, slightly desaturated.** Never high-saturation stock photography.
- If photography is used (marketing only), it should feel like *Kinfolk magazine* — natural light, paper, hands, tools, plants. Never crowds, never trading floors, never screens-on-screens.
- **No 3D renders.** No abstract gradient meshes. No "AI" iconography clichés.
- Editorial line illustrations (single weight, dark ink on paper) are preferred when an image is needed.

---

## Iconography

Moshimo Box uses **`Lucide`** as its icon system — a clean, modern, line-based set with consistent 1.5px stroke weight that matches the editorial-line aesthetic. Lucide is loaded from CDN in the UI kit; for production, install `lucide-react`.

> ⚠️ **Substitution flag**: No icon system exists in the codebase yet. Lucide was chosen because its line weight and proportions sit well with a serif-led editorial aesthetic. If a custom set is later commissioned, swap globally via `assets/icons/`.

### Rules

- **Stroke weight**: 1.5px, never filled. The whole system is line-based.
- **Default size**: 16px in dense UI (table rows, buttons), 20px in nav, 24px in section headers, 32px in empty states.
- **Color**: inherits `currentColor`. Icons match the surrounding text color, never compete.
- **Pairing with text**: 8px gap between icon and label. Icons sit on the cap-height of the adjacent text, not vertically centered to the line-height.
- **Standalone icon buttons** must have an `aria-label` and a tooltip on hover.

### No emoji, no Unicode glyphs as icons

The single exception is the **Moshimo mark itself** — a stylized box glyph used in the logo lockup. It does not appear in icon contexts.

### Custom marks

A few product-specific glyphs live in `assets/icons/` as SVGs:
- `moshimo-mark.svg` — the box glyph used in the logo
- `quadrant-growth.svg`, `quadrant-inflation.svg`, `quadrant-policy.svg`, `quadrant-market.svg` — small monogrammatic glyphs (G, I, P, M in a circle) used as the visual key for the four macro quadrants

---

## Caveats

1. **No real codebase or Figma** — every visual decision below the PRD is inferred from the verbal brief. Treat this system as a strong v1, not gospel.
2. **Fonts are Google Fonts substitutions** (Source Serif 4 + Inter Tight + JetBrains Mono). All three are excellent and freely licensed; if the brand later commissions custom type, drop the new files into `fonts/` and rewire `colors_and_type.css`.
3. **Logo is a placeholder mark** built from the visual system — it is *consistent with* the brand brief but not a designed identity. Replace once a real mark exists.
4. **No dark mode tokens** — the editorial paper aesthetic depends on the warm light surface. A dark variant would be a separate design exercise.
5. **UI kit covers the dashboard product only** — there is no marketing site, mobile app, or admin panel in scope per the PRD.
