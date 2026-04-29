# [TICKET-010] TEST: Checkpoint 1 — Data APIs and normalization

## Status
`done`

## Dependencies
- Requires: #009 ✅

## Description
This checkpoint verifies that live-provider boundaries, normalized data responses, cache behavior, and fixture fallbacks are reliable enough for dashboard integration. It is a gate before frontend widgets depend on provider-backed API behavior.

The test should prove that FRED and World Bank data enter the system through the same internal contracts and that every response remains honest about source, frequency, unit, and dates.

## Acceptance Criteria
- [x] Fetch at least one seeded FRED series through the API; the response includes unit, source, observation date, and fetched-at metadata.
- [x] Fetch at least one seeded World Bank series through the API; the response preserves country and frequency metadata.
- [x] Run comparison against two compatible fixture or provider series; dates align and sources remain visible.
- [x] Simulate a provider error; the API returns a stable error or stale-data response with no frontend crash.

## Implementation Notes
This is a manual test execution ticket — no code changes unless bugs are found during testing.

Common failure modes: provider-specific fields leaking into API responses, unit-less values, frequency mismatch hidden from the caller, and stale cache entries with no timestamp.

## Testing
- Run the full test suite.
- Record smoke-test endpoint URLs, provider mode, and response examples in the implementation PR.

## Test execution log

> **Date:** 2026-04-29
> **Environment:** Node 22, pnpm 10.22.0, macOS (darwin 25.5.0). Dev server bound to port 3001 because port 3000 was held by an unrelated pre-existing process (same as TICKET-006).
> **Provider mode:** `FRED_API_KEY` not set — FRED-backed indicators served from `fixtureProvider`. `WORLD_BANK_BASE_URL` left at default — World Bank-backed indicators hit live `https://api.worldbank.org/v2`. Live FRED HTTP path is covered by 24 unit tests in `src/server/providers/fredProvider.test.ts` (mocked `fetch` exercising URL construction, date normalization, HTTP 400/500, network failure, non-JSON, missing key).

### Step 1 — Static checks

| # | Command | Result | Notes |
|---|---------|--------|-------|
| 1 | `pnpm install` | ✅ pass | Lockfile up to date. |
| 2 | `pnpm format:check` | ❌ fail (first run) | 8 source files had Prettier drift against `printWidth: 100` (`src/domain/seeds/catalog.ts`, `src/server/providers/{cacheKey,cachingProvider.test,fredProvider,fredProvider.test,worldBankProvider,worldBankProvider.test,cacheKey.test}.ts`). Diff was line-collapsing only — multi-line `ApiError(...)` calls reflowed to single lines. Fixed with `pnpm format`; re-ran and passed. Same recurring pattern as TICKET-006. |
| 3 | `pnpm lint` | ✅ pass | No findings. |
| 4 | `pnpm typecheck` | ✅ pass | `tsc --noEmit` clean under strict mode. |
| 5 | `pnpm test:run` | ✅ pass | 23 test files, 224 tests, 1.4s. |
| 6 | `pnpm build` | ✅ pass | Next 15.5.15, 8 routes (`/`, `/_not-found`, `/icon.svg`, `/api/health`, `/api/indicators`, `/api/series/[indicatorId]`, `/api/series/compare`, `/api/widgets/[widgetId]`). |

Provider unit-test coverage (relevant for AC4 + stale-fallback path that is impractical to exercise via curl because the cache is in-process and env vars bind at module load):

- `src/server/providers/fredProvider.test.ts` — 24 tests (HTTP 400/500, network TypeError, non-JSON, missing key, date normalization).
- `src/server/providers/worldBankProvider.test.ts` — 31 tests (HTTP 400/500, network failure, envelope shape mismatch, null-value parsing).
- `src/server/providers/cachingProvider.test.ts` — 11 tests (cache hit, miss, TTL expiry, stale-fallback on provider error, request keying).
- `src/server/providers/providerResolver.test.ts` — 7 tests (FRED/WB/fixture routing).

### Step 2 — Dev server smoke

`pnpm dev -p 3001` came up on `http://localhost:3001` in 3.7s. Server log clean.

| Check | Result |
|---|---|
| `curl http://localhost:3001/api/health` | ✅ `{"status":"ok"}` (200, 15 bytes) |
| `GET /` returns 200 with 21,536 bytes of HTML | ✅ |
| HTML contains `id="growth"`, `id="inflation"`, `id="policy"`, `id="market"` | ✅ all four sections (one occurrence each) |
| HTML contains `Moshimo Box` wordmark | ✅ 4 occurrences |
| HTML contains `No widgets yet.` per quadrant | ✅ 8 occurrences (4 SSR + 4 in RSC payload, matches TICKET-006) |
| Server log free of `error`, `warn`, `hydration`, `unhandled` | ✅ none |

### Step 3 — AC1: FRED series via API (fixture mode)

| Endpoint | Result | Evidence |
|---|---|---|
| `GET /api/series/us_real_gdp?start=2024-Q1&end=2025-Q4` | ✅ 200 | `unit:"billions of chained 2017 USD"`, `source.provider:"fred"`, `source.seriesId:"GDPC1"`, `source.url:"https://fred.stlouisfed.org/series/GDPC1"`, `observationDate:"2025-Q4"`, `releaseDate:"2026-01-30"`, `fetchedAt:"2026-04-29T10:18:45.431Z"` (ISO 8601), `cacheStatus:"fresh"`, 8 quarterly points 2024-Q1→2025-Q4. |
| `GET /api/widgets/widget_us_unemployment_rate` (metric_card) | ✅ 200 | `currentValue:4.01`, `previousValue:4.01`, `change:{value:0,unit:"percent",percent:0,period:"vs prior month"}`, `observationDate:"2026-03"`, `releaseDate:"2026-04-15"`, `trend.direction:"flat"`, `status.tone:"neutral"`. |
| `GET /api/series/us_headline_cpi?transform=year_over_year` | ✅ 200 | 60 monthly points; first 12 are null (expected — YoY needs 12mo prior); first non-null 2022-04 (2.51%); last 2026-03 (2.30%). All freshness fields present. |

All four required metadata fields (unit, source, observationDate, fetchedAt) appear on every response, with `releaseDate` and `cacheStatus` as bonuses. The `source` block reports the indicator's *provenance* (FRED, including `seriesId` and `url`), independent of which provider served the bytes — so the contract remains honest in fixture mode.

### Step 4 — AC2: World Bank series (live)

| Endpoint | Result | Evidence |
|---|---|---|
| `GET /api/series/us_gdp_growth_annual` | ✅ 200 | `indicator.countryCode:"US"`, `indicator.frequency:"annual"`, `indicator.unit:"percent"`, `source.provider:"world_bank"`, `source.seriesId:"NY.GDP.MKTP.KD.ZG"`, `source.url:"https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG"`, `observationDate:"2025-12"`, `fetchedAt:"2026-04-29T10:19:30.440Z"`. 66 annual points 1960-12 → 2025-12; 64 non-null. Last non-null 2024-12 = 2.79% (matches public BEA/WB record). 2025-12 is null (annual figure not yet released). |
| `GET /api/widgets/widget_us_gdp_growth_annual` (metric_card, line_chart) | ❌ 500 → ✅ 200 (after fix) | **Bug found and fixed during this checkpoint** — see Step 4a below. |

#### Step 4a — Bug fix: widget endpoint crashed on trailing-null observations

**Symptom (pre-fix):** `GET /api/widgets/widget_us_gdp_growth_annual` returned `500 unexpected_error` with message `"Widget widget_us_gdp_growth_annual has missing values in the latest observations."` because `src/server/indicators/widgetData.ts` blindly read `series.points[length-1]` and `series.points[length-2]`, and the live World Bank response includes a trailing 2025 row whose value is `null` (the World Bank publishes the row before the data is released).

**Root cause:** The widget code assumed every series ends with a non-null observation. That holds for fixture data (the generator fills every slot) but not for live World Bank data with future-dated rows.

**Fix:** Extracted a pure helper `pickLatestPair` in `src/server/indicators/widgetData.ts` that walks backward over null values to find the latest two non-null observations. The widget endpoint uses this helper, overrides `observationDate` to the chosen current point's date, and recomputes `releaseDate` via the existing `computeReleaseDate(observationDate, frequency)` helper. The series endpoint is unchanged — it still returns the full point array (with nulls) for chart consumers.

**Test coverage added:** 4 new unit tests in `src/server/indicators/widgetData.test.ts` covering the happy path (last two non-null), trailing nulls, internal null gaps, and the under-two-non-null fallback (returns `null` so the route can throw `unexpected_error`). Test count grew 224 → 228, all green.

**Post-fix payload:**
```json
{
  "widgetId": "widget_us_gdp_growth_annual",
  "currentValue": 2.79300127716779,
  "previousValue": 2.88755600749487,
  "change": { "value": -0.0946, "unit": "percent", "percent": -3.2746, "period": "vs prior year" },
  "observationDate": "2024-12",
  "releaseDate": "2025-04-15",
  "fetchedAt": "2026-04-29T10:23:35.457Z",
  "cacheStatus": "fresh",
  "source": { "provider": "world_bank", "seriesId": "NY.GDP.MKTP.KD.ZG", ... },
  "trend": { "direction": "down", "label": "Falling", "period": "vs prior year" },
  "status": { "tone": "neutral", "label": "Context only", "rationale": "..." }
}
```

The fix lands alongside this checkpoint as part of the same change.

### Step 5 — AC3: Comparison endpoint

Happy paths:

| Request | Result | Evidence |
|---|---|---|
| `compare?indicatorIds=us_10y_treasury_yield,us_2y_treasury_yield` (FRED + FRED daily) | ✅ 200 | 2 series, 1260 daily points each, both ranges `2021-06-28 → 2026-04-24`, top-level union range matches, both `source.provider:"fred"`. `fetchedAt` + `cacheStatus:"fresh"` present at top level. |
| `compare?indicatorIds=us_real_gdp,us_gdp_growth_annual` (FRED + World Bank, mixed frequency) | ✅ 200 | 2 series with their distinct sources visible: `fred`/quarterly/`billions of chained 2017 USD` (20 points) + `world_bank`/annual/`percent` (66 points). Top-level `range.start:"1960-12"`, `range.end:"2025-Q4"` (union spans both formats — by design; each series carries its own typed inner range). |

Validation guards (must return 400 `invalid_query`):

| Request | Result | Message |
|---|---|---|
| `compare?indicatorIds=us_real_gdp` (1 id) | ✅ 400 `invalid_query` | "indicatorIds must include 2 to 4 indicators." |
| `compare?indicatorIds=us_real_gdp,us_real_gdp` | ✅ 400 `invalid_query` | "indicatorIds must be unique." |
| `compare?indicatorIds=a,b,c,d,e` (5 ids) | ✅ 400 `invalid_query` | "indicatorIds must include 2 to 4 indicators." |
| `compare?indicatorIds=us_real_gdp,us_unemployment_rate&end=2025-12` (no start) | ✅ 400 `invalid_query` | "An end date requires a start date." |

### Step 6 — AC4: Simulated provider error

Restarted dev server with `WORLD_BANK_BASE_URL='http://127.0.0.1:1' CACHE_TTL_OVERRIDE_MS=0 pnpm dev -p 3001`. The `CACHE_TTL_OVERRIDE_MS=0` ensures no in-process cache from a prior run masks the failure.

| Request | Result | Evidence |
|---|---|---|
| `GET /api/series/us_gdp_growth_annual` | ✅ 502 | `{"error":{"code":"provider_error","message":"World Bank request failed for us_gdp_growth_annual: network error."},"requestId":"b67a34bd-…"}`. Status mapping per `src/server/api/errors.ts:17`. |
| `GET /api/widgets/widget_us_gdp_growth_annual` | ✅ 502 | Same `provider_error` envelope (the widget route wraps the same upstream call and surfaces the same code). |
| `GET /api/series/us_real_gdp` (FRED → fixture) | ✅ 200 | Unaffected by World Bank misconfig — provider routing is isolated by indicator. |
| `GET /api/health` | ✅ 200 `{"status":"ok"}` | Unaffected. |
| `GET /` (root HTML) | ✅ 200, ~21.5KB | Dashboard chrome renders cleanly while World Bank-backed series cannot resolve. Phase 3 widgets are not wired yet, so frontend "crash" is observed at the shell level only — shell stays up. |
| Dev server log scan for `unhandled`, `fatal`, `crash` | ✅ none | Only routine request logs (e.g. `GET /api/series/us_gdp_growth_annual 502 in 754ms`). |

Stale-fallback (cached entry + provider error → 200 with `cacheStatus:"stale"`) is verified by `src/server/providers/cachingProvider.test.ts` rather than by curl, because the cache is in-memory per process and provider env vars bind at module load — the shape of the test (warm cache → swap provider → re-fetch) is impractical without a custom test harness for the dev server. The unit test exercises exactly that code path (cachingProvider.ts:46–61).

### Outcome

All four acceptance criteria are satisfied. One real bug (widget endpoint crashing on trailing-null observations from live World Bank data) was found and fixed during testing; the fix includes 4 new unit tests and lands alongside this checkpoint as part of the same change.

Final test count: 228/228 green across 23 test files. Lint, typecheck, format, and Next.js build all clean.

**Recommendation: pass.** Phase 3 (dashboard widgets) is unblocked. One small follow-up worth tracking: the metric-card `status.rationale` is hard-coded to `"Fixture data is for contract validation, not market signals."` — that text is now slightly misleading for live World Bank widgets. Out of scope for this checkpoint; flag it during Phase 3 widget work (TICKET-012).
