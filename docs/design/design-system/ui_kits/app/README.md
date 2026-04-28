# Moshimo Box — Dashboard UI Kit

A hi-fi click-through of the Moshimo Box dashboard. Single product, single screen — the macro dashboard with side-panel chat copilot. The screen is composed from these components:

- `TopBar` — brand mark + global search + agent toggle
- `Sidebar` — collapsed nav with the four quadrant glyphs and saved layouts
- `Quadrant` — section header (Growth / Inflation / Policy / Market) with a 4-col widget subgrid
- `MetricWidget` — single number + delta + sparkline + source
- `LineWidget` — small chart widget
- `ComparisonWidget` — two-series line chart
- `ChatPanel` — agent side panel: messages, action proposals, composer

The kit is **cosmetic, not real**. Charts are inline SVG paths with hard-coded data. The chat is scripted — typing a question reveals a pre-written reply and (sometimes) an action proposal you can apply or dismiss.

Open `index.html`.
