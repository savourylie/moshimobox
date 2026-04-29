import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/api/errors";
import { getSeedIndicator } from "@/domain/seeds";
import {
  anchorToFredDate,
  createFredProvider,
  FRED_OBSERVATIONS_URL,
  normalizeFredDate,
  parseFredValue,
} from "./fredProvider";

const jsonResponse = (body: unknown, init: ResponseInit = { status: 200 }): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

const captureUrl = (
  responseBody: unknown,
  init: ResponseInit = { status: 200 },
): { fetchImpl: typeof fetch; getUrl: () => string } => {
  let captured = "";
  const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
    captured = typeof input === "string" ? input : (input as Request).url;
    return jsonResponse(responseBody, init);
  }) as unknown as typeof fetch;
  return { fetchImpl, getUrl: () => captured };
};

describe("anchorToFredDate", () => {
  it("passes through YYYY-MM-DD", () => {
    expect(anchorToFredDate("2025-04-15", "start")).toBe("2025-04-15");
    expect(anchorToFredDate("2025-04-15", "end")).toBe("2025-04-15");
  });

  it("anchors YYYY-MM to first/last day of the month", () => {
    expect(anchorToFredDate("2025-02", "start")).toBe("2025-02-01");
    expect(anchorToFredDate("2025-02", "end")).toBe("2025-02-28");
    expect(anchorToFredDate("2024-02", "end")).toBe("2024-02-29");
    expect(anchorToFredDate("2025-12", "end")).toBe("2025-12-31");
  });

  it("anchors YYYY-Qn to first/last day of the quarter", () => {
    expect(anchorToFredDate("2025-Q1", "start")).toBe("2025-01-01");
    expect(anchorToFredDate("2025-Q1", "end")).toBe("2025-03-31");
    expect(anchorToFredDate("2025-Q2", "start")).toBe("2025-04-01");
    expect(anchorToFredDate("2025-Q2", "end")).toBe("2025-06-30");
    expect(anchorToFredDate("2025-Q4", "end")).toBe("2025-12-31");
  });
});

describe("normalizeFredDate", () => {
  it("passes daily and weekly dates through unchanged", () => {
    expect(normalizeFredDate("2026-04-24", "daily", "x")).toBe("2026-04-24");
    expect(normalizeFredDate("2026-04-22", "weekly", "x")).toBe("2026-04-22");
  });

  it("collapses monthly FRED dates to YYYY-MM", () => {
    expect(normalizeFredDate("2026-03-01", "monthly", "x")).toBe("2026-03");
  });

  it("converts quarter-start month to YYYY-Qn", () => {
    expect(normalizeFredDate("2025-01-01", "quarterly", "x")).toBe("2025-Q1");
    expect(normalizeFredDate("2025-04-01", "quarterly", "x")).toBe("2025-Q2");
    expect(normalizeFredDate("2025-07-01", "quarterly", "x")).toBe("2025-Q3");
    expect(normalizeFredDate("2025-10-01", "quarterly", "x")).toBe("2025-Q4");
  });

  it("emits YYYY-12 for annual dates to match the fixture convention", () => {
    expect(normalizeFredDate("2024-01-01", "annual", "x")).toBe("2024-12");
  });

  it("throws provider_error on a malformed FRED date", () => {
    expect(() => normalizeFredDate("not-a-date", "daily", "us_headline_cpi")).toThrowError(
      ApiError,
    );
  });
});

describe("parseFredValue", () => {
  it("maps '.' to null", () => {
    expect(parseFredValue(".")).toBeNull();
  });

  it("parses numeric strings", () => {
    expect(parseFredValue("123.4")).toBe(123.4);
    expect(parseFredValue("-2.5")).toBe(-2.5);
    expect(parseFredValue("0")).toBe(0);
  });

  it("returns null for non-numeric or empty values", () => {
    expect(parseFredValue("")).toBeNull();
    expect(parseFredValue("abc")).toBeNull();
    expect(parseFredValue(null)).toBeNull();
    expect(parseFredValue(undefined)).toBeNull();
  });
});

describe("createFredProvider.getSeries", () => {
  it("builds the FRED URL with series_id, api_key, file_type and anchored range", async () => {
    const { fetchImpl, getUrl } = captureUrl({
      observations: [{ date: "2025-01-01", value: "300" }],
    });
    const provider = createFredProvider({ apiKey: "test-key", fetch: fetchImpl });

    await provider.getSeries({
      indicatorId: "us_headline_cpi",
      range: { start: "2025-01", end: "2025-06" },
    });

    const parsed = new URL(getUrl());
    expect(parsed.origin + parsed.pathname).toBe(FRED_OBSERVATIONS_URL);
    expect(parsed.searchParams.get("series_id")).toBe("CPIAUCSL");
    expect(parsed.searchParams.get("api_key")).toBe("test-key");
    expect(parsed.searchParams.get("file_type")).toBe("json");
    expect(parsed.searchParams.get("observation_start")).toBe("2025-01-01");
    expect(parsed.searchParams.get("observation_end")).toBe("2025-06-30");
  });

  it("normalizes a daily series and passes catalog source attribution through", async () => {
    const { fetchImpl } = captureUrl({
      observations: [
        { date: "2026-04-22", value: "2.31" },
        { date: "2026-04-23", value: "2.33" },
        { date: "2026-04-24", value: "2.35" },
      ],
    });
    const provider = createFredProvider({ apiKey: "k", fetch: fetchImpl });

    const result = await provider.getSeries({ indicatorId: "us_5y_breakeven_inflation" });

    expect(result.points).toEqual([
      { date: "2026-04-22", value: 2.31 },
      { date: "2026-04-23", value: 2.33 },
      { date: "2026-04-24", value: 2.35 },
    ]);
    expect(result.observationDate).toBe("2026-04-24");
    expect(result.releaseDate).toBe("2026-04-24");
    expect(result.range).toEqual({ start: "2026-04-22", end: "2026-04-24" });
    expect(result.unit).toBe("percent");

    const seed = getSeedIndicator("us_5y_breakeven_inflation");
    expect(result.source).toEqual(seed!.metadata.source);
    expect(result.source.provider).toBe("fred");
    expect(result.source.seriesId).toBe("T5YIE");
  });

  it("collapses monthly observations to YYYY-MM and computes the monthly release date", async () => {
    const { fetchImpl } = captureUrl({
      observations: [
        { date: "2026-01-01", value: "320.1" },
        { date: "2026-02-01", value: "321.2" },
        { date: "2026-03-01", value: "322.5" },
      ],
    });
    const provider = createFredProvider({ apiKey: "k", fetch: fetchImpl });

    const result = await provider.getSeries({ indicatorId: "us_headline_cpi" });

    expect(result.points.map((p) => p.date)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(result.observationDate).toBe("2026-03");
    expect(result.releaseDate).toBe("2026-04-15");
    expect(result.range).toEqual({ start: "2026-01", end: "2026-03" });
  });

  it("converts quarter-start FRED dates to YYYY-Qn", async () => {
    const { fetchImpl } = captureUrl({
      observations: [
        { date: "2025-01-01", value: "22500" },
        { date: "2025-04-01", value: "22600" },
        { date: "2025-07-01", value: "22700" },
        { date: "2025-10-01", value: "22800" },
      ],
    });
    const provider = createFredProvider({ apiKey: "k", fetch: fetchImpl });

    const result = await provider.getSeries({ indicatorId: "us_real_gdp" });

    expect(result.points.map((p) => p.date)).toEqual([
      "2025-Q1",
      "2025-Q2",
      "2025-Q3",
      "2025-Q4",
    ]);
    expect(result.observationDate).toBe("2025-Q4");
    expect(result.releaseDate).toBe("2026-01-30");
  });

  it("maps '.' values to null", async () => {
    const { fetchImpl } = captureUrl({
      observations: [
        { date: "2026-01-01", value: "320.1" },
        { date: "2026-02-01", value: "." },
        { date: "2026-03-01", value: "322.5" },
      ],
    });
    const provider = createFredProvider({ apiKey: "k", fetch: fetchImpl });

    const result = await provider.getSeries({ indicatorId: "us_headline_cpi" });

    expect(result.points[0].value).toBe(320.1);
    expect(result.points[1].value).toBeNull();
    expect(result.points[2].value).toBe(322.5);
  });

  it("throws indicator_not_found for unknown ids without calling fetch", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const provider = createFredProvider({ apiKey: "k", fetch: fetchImpl });

    await expect(provider.getSeries({ indicatorId: "us_unknown" })).rejects.toMatchObject({
      code: "indicator_not_found",
      status: 404,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws invalid_query when the catalog source is not FRED", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const provider = createFredProvider({ apiKey: "k", fetch: fetchImpl });

    await expect(
      provider.getSeries({ indicatorId: "us_gdp_growth_annual" }),
    ).rejects.toMatchObject({ code: "invalid_query", status: 400 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws invalid_query on FRED 400 with an error_message", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        { error_code: 400, error_message: "Bad Request. Series does not exist." },
        { status: 400 },
      ),
    ) as unknown as typeof fetch;
    const provider = createFredProvider({ apiKey: "k", fetch: fetchImpl });

    const promise = provider.getSeries({ indicatorId: "us_headline_cpi" });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      code: "invalid_query",
      status: 400,
    });
    await expect(promise).rejects.toThrow(/Series does not exist/);
  });

  it("throws provider_error on FRED 500", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error_code: 500, error_message: "boom" }, { status: 500 }),
    ) as unknown as typeof fetch;
    const provider = createFredProvider({ apiKey: "k", fetch: fetchImpl });

    await expect(
      provider.getSeries({ indicatorId: "us_headline_cpi" }),
    ).rejects.toMatchObject({ code: "provider_error", status: 502 });
  });

  it("throws provider_error on a network failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const provider = createFredProvider({ apiKey: "k", fetch: fetchImpl });

    await expect(
      provider.getSeries({ indicatorId: "us_headline_cpi" }),
    ).rejects.toMatchObject({ code: "provider_error", status: 502 });
  });

  it("throws provider_error when FRED returns a non-JSON body", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("<html>not json</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    ) as unknown as typeof fetch;
    const provider = createFredProvider({ apiKey: "k", fetch: fetchImpl });

    await expect(
      provider.getSeries({ indicatorId: "us_headline_cpi" }),
    ).rejects.toMatchObject({ code: "provider_error", status: 502 });
  });

  it("throws invalid_query when FRED returns no observations", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ observations: [] })) as unknown as typeof fetch;
    const provider = createFredProvider({ apiKey: "k", fetch: fetchImpl });

    await expect(
      provider.getSeries({ indicatorId: "us_headline_cpi" }),
    ).rejects.toMatchObject({ code: "invalid_query", status: 400 });
  });

  it("throws unexpected_error if invoked without an api key", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const provider = createFredProvider({ apiKey: "", fetch: fetchImpl });

    await expect(
      provider.getSeries({ indicatorId: "us_headline_cpi" }),
    ).rejects.toMatchObject({ code: "unexpected_error", status: 500 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
