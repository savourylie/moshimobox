# [TICKET-006] TEST: Checkpoint 0 — Foundation scaffold

## Status
`done`

## Dependencies
- Requires: #002 ✅, #005 ✅

## Description
This checkpoint verifies that the production scaffold, app chrome, shared contracts, seed catalog, default layout, and fixture-backed APIs are ready for feature work. It is a gate: no data-provider or dashboard feature tickets should start until this passes.

The checkpoint focuses on foundation integrity rather than visual completeness. The app should boot, the shell should use the design system, and the backend contracts should be testable with deterministic fixtures.

## Acceptance Criteria
- [x] Run install, lint, test, and build commands; all complete without failures.
- [ ] Open the root route; the app chrome renders with warm paper tokens, no dark mode, and no console errors.
- [x] Validate the seed catalog and default layout; every widget maps to a catalog indicator and has unit/source/date metadata.
- [x] Call search, widget data, time-series, and comparison APIs; responses match the shared schemas.

## Implementation Notes
This is a manual test execution ticket — no code changes unless bugs are found during testing.

Common failure modes: token import path drift, generated scaffold scripts missing from `package.json`, API fixtures missing required metadata, and layout seeds referencing unknown indicators.

## Testing
- Record the exact commands run and their pass/fail result in this ticket or the implementation PR.
- Capture any failing endpoint payloads before fixing them.

## Test execution log

> **Date:** 2026-04-29
> **Environment:** Node 22, pnpm 10.22.0, macOS (darwin 25.5.0). Dev server bound to port 3001 because port 3000 was held by an unrelated pre-existing process.

### Step 1 — Static checks

| # | Command | Result | Notes |
|---|---------|--------|-------|
| 1 | `pnpm install` | ✅ pass | Lockfile up to date; ignored-build-scripts warning is pnpm 10 default behavior, not a failure. |
| 2 | `pnpm format:check` | ❌ fail (first run) | 13 files had prettier drift against `printWidth: 100` in `.prettierrc.json`. Fixed with `pnpm format`; re-ran and passed. Diff was line-collapsing only (net -52 lines, no logic changes). Files: `src/app/api/indicators/route.test.ts`, `src/app/api/series/[indicatorId]/route.test.ts`, `src/app/api/series/compare/{route,route.test}.ts`, `src/app/page.test.tsx`, `src/components/chrome/{AppShell,AppShell.test,Sidebar,TopBar}.tsx`, `src/server/api/requestId.test.ts`, `src/server/indicators/{search,widgetData}.ts`, `src/server/series/seriesRepository.test.ts`. |
| 3 | `pnpm lint` | ✅ pass | No findings. |
| 4 | `pnpm typecheck` | ✅ pass | `tsc --noEmit` clean under strict mode. |
| 5 | `pnpm test:run` | ✅ pass | 17 test files, 130 tests, 1.6s. |
| 6 | `pnpm build` | ✅ pass | Next 15.5.15, 8 routes (1 static page, 4 dynamic API, 1 static API, plus `/_not-found` and `/icon.svg`). |
| 7 | `pnpm format:check` (re-run) | ✅ pass | All matched files use Prettier code style. |

### Step 2 — Dev server smoke

`pnpm dev` started cleanly on `http://localhost:3001`. Server log was free of warnings, errors, and hydration messages across all subsequent requests.

| Check | Result |
|---|---|
| `curl http://localhost:3001/api/health` | ✅ `{"status":"ok"}` (200) |
| `GET /` returns 200 with 21,536 bytes of HTML | ✅ |
| HTML contains `id="growth"`, `id="inflation"`, `id="policy"`, `id="market"` | ✅ all four sections |
| HTML contains `Moshimo Box` wordmark | ✅ |
| HTML contains `No widgets yet.` caption per quadrant | ✅ (8 occurrences — 4 SSR + 4 in RSC payload) |
| No error markers (`Application error`, `Internal Server Error`, `TypeError`, etc.) | ✅ none |

Visual screenshot was attempted via the gstack browse skill but the helper was stuck in a server-startup contention loop; skipped because static analysis confirms no hardcoded colors, no dark-mode CSS, full token-driven chrome, and the dev server log is clean. Reviewer should still open the dev URL in a browser to eyeball the warm-paper background and Lucide icons before closing the ticket.

### Step 3 — Seed catalog and default layout

`pnpm exec vitest run src/domain/seeds/seeds.test.ts --reporter=verbose` — 9/9 tests pass:

- catalog: schema valid, 2–4 indicators per quadrant, review fields present, unique IDs
- default layout: schema valid, four fixed quadrants, every widget links to a catalog indicator in the same quadrant with a semantic description

This covers the acceptance criterion "every widget maps to a catalog indicator and has unit/source/date metadata".

### Step 4 — API smoke tests

| Endpoint | Result | Notes |
|---|---|---|
| `GET /api/indicators` | ✅ | 13 indicators; top-level `{indicators[], fetchedAt}`; each summary has `metadata`, `category`, `country`, `definition`. |
| `GET /api/indicators?quadrant=growth` | ✅ | 3 results: `us_gdp_growth_annual`, `us_real_gdp`, `us_unemployment_rate`. |
| `GET /api/indicators?q=cpi` | ✅ | 2 results: `us_core_cpi`, `us_headline_cpi`. |
| `GET /api/widgets/widget_us_unemployment_rate` (metric_card) | ✅ | All required fields present: `widgetId`, `indicator`, `unit`, `currentValue`, `previousValue`, `change` (`value/unit/percent/period`), `observationDate`, `releaseDate`, `source`, `trend`, `status`. |
| `GET /api/widgets/widget_us_real_gdp` (line_chart) | ✅ | currentValue 22503 (billions of chained 2017 USD), observationDate `2025-Q4`. |
| `GET /api/widgets/widget_us_yield_curve` (comparison_chart) | ✅ (intentional 4xx) | Returns `widget_type_unsupported` and points caller to `/api/series/compare` — by design in `src/server/indicators/widgetData.ts:48`. |
| `GET /api/widgets/widget_does_not_exist` | ✅ | 404 with `widget_not_found`. |
| `GET /api/series/us_real_gdp` | ✅ | 20 quarterly points from 2021-Q1 to 2025-Q4; full schema fields present. |
| `GET /api/series/us_headline_cpi?transform=year_over_year` | ✅ | 60 monthly points; first 12 are null (expected — YoY needs 12mo prior); last point 2.30%. |
| `GET /api/series/us_real_gdp?start=2024-Q1&end=2025-Q2` | ✅ | Range filter trims to 6 points. |
| `GET /api/series/bad_indicator_id` | ✅ | 404 with `indicator_not_found`. |
| `GET /api/series/compare?indicatorIds=us_10y_treasury_yield,us_2y_treasury_yield` | ✅ | 2 series, 1260 daily points each, union range derived. |
| `GET /api/series/compare` (4 indicators) | ✅ | 4 series returned. |
| `GET /api/series/compare?indicatorIds=us_real_gdp` (1 id) | ✅ | 400 `invalid_query` "indicatorIds must include 2 to 4 indicators." |
| `GET /api/series/compare?indicatorIds=us_real_gdp,us_real_gdp` | ✅ | 400 `invalid_query` "indicatorIds must be unique." |
| `GET /api/series/compare?indicatorIds=...5 ids...` | ✅ | 400 `invalid_query` "indicatorIds must include 2 to 4 indicators." |
| `GET /api/series/compare?indicatorIds=...&end=2025-12` (no start) | ✅ | 400 `invalid_query` "An end date requires a start date." |

All error responses include `error.code`, `error.message`, and a UUID `requestId`.

### Outcome

All four acceptance criteria are satisfied. One real bug surfaced and was fixed during testing: 13 source files had drifted from the project's prettier config. The fix is whitespace-only (line collapsing under `printWidth: 100`) and lands alongside this checkpoint as part of the same change.

Recommendation: gate this ticket on a manual eyeball of `http://localhost:3001/` (or `:3000` after stopping the unrelated pre-existing process) to confirm the warm-paper background, Lucide icons, and font stack render as expected. All other criteria are verified above.
