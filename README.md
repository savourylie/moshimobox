# Moshimo Box

**Moshimo Box** (もしも箱 — "what-if box") is a bilingual (Traditional Chinese + English) macroeconomic dashboard combining structured market-data widgets with an agentic chat copilot. MVP scope: no auth, no SaaS, no broker integration. See [`docs/PRD.md`](docs/PRD.md).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Vitest · pnpm. Token-driven CSS sourced from [`docs/design/design-system/colors_and_type.css`](docs/design/design-system/colors_and_type.css). Full rationale in [`docs/TECH_DECISIONS.md`](docs/TECH_DECISIONS.md).

## Prerequisites

- Node 22 (see [`.nvmrc`](.nvmrc))
- pnpm 9+

## Setup

```sh
pnpm install
```

## Scripts

| Script              | What it does                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm dev`          | Start the Next.js dev server at `http://localhost:3000`                                                 |
| `pnpm build`        | Production build                                                                                        |
| `pnpm start`        | Serve the production build                                                                              |
| `pnpm lint`         | ESLint (Next's flat config)                                                                             |
| `pnpm typecheck`    | `tsc --noEmit`                                                                                          |
| `pnpm test`         | Vitest in watch mode                                                                                    |
| `pnpm test:run`     | Vitest, single run (CI-friendly)                                                                        |
| `pnpm format`       | Prettier — write                                                                                        |
| `pnpm format:check` | Prettier — check only                                                                                   |
| `pnpm sync:tokens`  | Re-mirror design tokens from `docs/design/design-system/colors_and_type.css` to `src/styles/tokens.css` |

## Key docs

- [`docs/PRD.md`](docs/PRD.md) — product requirements (zh-TW)
- [`docs/DESIGN.md`](docs/DESIGN.md) — design system pointer
- [`docs/TECH_DECISIONS.md`](docs/TECH_DECISIONS.md) — stack rationale and out-of-scope policy
- [`docs/design/design-system/`](docs/design/design-system/) — canonical visual source of truth
- [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md) — voice and design rules for any contributor (human or agent)

## Verifying the scaffold

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm dev   # then visit http://localhost:3000
```

The root route should render the warm-paper background with the "Moshimo Box" wordmark and a "No widgets yet." caption. The route handler at `/api/health` returns `{"status":"ok"}`.
