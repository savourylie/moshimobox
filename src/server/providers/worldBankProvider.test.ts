import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/api/errors";
import { getSeedIndicator } from "@/domain/seeds";
import {
  createWorldBankProvider,
  extractWorldBankYear,
  normalizeWorldBankDate,
  parseWorldBankValue,
  WORLD_BANK_PER_PAGE,
} from "./worldBankProvider";

const TEST_BASE_URL = "https://example.test/v2";

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

const META = {
  page: 1,
  pages: 1,
  per_page: 50,
  total: 1,
  sourceid: "2",
  lastupdated: "2025-04-15",
};

const wbObservation = (date: string, value: number | null) => ({
  indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" },
  country: { id: "US", value: "United States" },
  countryiso3code: "USA",
  date,
  value,
  unit: "",
  obs_status: "",
  decimal: 1,
});

describe("extractWorldBankYear", () => {
  it("accepts a bare YYYY", () => {
    expect(extractWorldBankYear("2024")).toBe(2024);
  });

  it("accepts YYYY-MM-DD", () => {
    expect(extractWorldBankYear("2024-04-15")).toBe(2024);
  });

  it("accepts YYYY-MM", () => {
    expect(extractWorldBankYear("2024-04")).toBe(2024);
  });

  it("accepts YYYY-Qn", () => {
    expect(extractWorldBankYear("2024-Q3")).toBe(2024);
  });

  it("throws invalid_query on garbage", () => {
    expect(() => extractWorldBankYear("not-a-date")).toThrowError(ApiError);
    expect(() => extractWorldBankYear("")).toThrowError(ApiError);
  });
});

describe("normalizeWorldBankDate", () => {
  it("normalizes annual YYYY to YYYY-12 to match the catalog convention", () => {
    expect(normalizeWorldBankDate("2024", "annual", "x")).toBe("2024-12");
  });

  it("normalizes quarterly YYYYQn to YYYY-Qn", () => {
    expect(normalizeWorldBankDate("2024Q1", "quarterly", "x")).toBe("2024-Q1");
    expect(normalizeWorldBankDate("2024Q4", "quarterly", "x")).toBe("2024-Q4");
  });

  it("normalizes monthly YYYYMnn to YYYY-MM", () => {
    expect(normalizeWorldBankDate("2024M03", "monthly", "x")).toBe("2024-03");
    expect(normalizeWorldBankDate("2024M12", "monthly", "x")).toBe("2024-12");
  });

  it("rejects mixed-frequency rows so an annual indicator does not absorb a monthly date", () => {
    expect(() => normalizeWorldBankDate("2024M03", "annual", "x")).toThrowError(ApiError);
    expect(() => normalizeWorldBankDate("2024", "quarterly", "x")).toThrowError(ApiError);
    expect(() => normalizeWorldBankDate("2024Q1", "monthly", "x")).toThrowError(ApiError);
  });

  it("throws invalid_query for daily and weekly frequencies", () => {
    expect(() => normalizeWorldBankDate("2024-04-15", "daily", "x")).toThrowError(ApiError);
    expect(() => normalizeWorldBankDate("2024-04-15", "weekly", "x")).toThrowError(ApiError);
  });

  it("throws provider_error on malformed annual input", () => {
    expect(() => normalizeWorldBankDate("", "annual", "x")).toThrowError(ApiError);
    expect(() => normalizeWorldBankDate("twenty-twenty-four", "annual", "x")).toThrowError(
      ApiError,
    );
  });
});

describe("parseWorldBankValue", () => {
  it("returns null for null and undefined", () => {
    expect(parseWorldBankValue(null)).toBeNull();
    expect(parseWorldBankValue(undefined)).toBeNull();
  });

  it("passes through finite numbers", () => {
    expect(parseWorldBankValue(2.5)).toBe(2.5);
    expect(parseWorldBankValue(0)).toBe(0);
    expect(parseWorldBankValue(-1.25)).toBe(-1.25);
  });

  it("returns null for non-finite numbers", () => {
    expect(parseWorldBankValue(Number.NaN)).toBeNull();
    expect(parseWorldBankValue(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("createWorldBankProvider.getSeries", () => {
  it("builds the World Bank URL with country, indicator, format, per_page, and the date range", async () => {
    const { fetchImpl, getUrl } = captureUrl([META, [wbObservation("2024", 2.8)]]);
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    await provider.getSeries({
      indicatorId: "us_gdp_growth_annual",
      range: { start: "2010-12", end: "2024-12" },
    });

    const parsed = new URL(getUrl());
    expect(parsed.origin).toBe("https://example.test");
    expect(parsed.pathname).toBe("/v2/country/US/indicator/NY.GDP.MKTP.KD.ZG");
    expect(parsed.searchParams.get("format")).toBe("json");
    expect(parsed.searchParams.get("per_page")).toBe(String(WORLD_BANK_PER_PAGE));
    expect(parsed.searchParams.get("date")).toBe("2010:2024");
  });

  it("omits the date param when only one bound is supplied so World Bank returns the full series", async () => {
    const { fetchImpl, getUrl } = captureUrl([META, [wbObservation("2024", 2.8)]]);
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    await provider.getSeries({
      indicatorId: "us_gdp_growth_annual",
      range: { start: "2010-12" },
    });

    expect(new URL(getUrl()).searchParams.has("date")).toBe(false);
  });

  it("trims a trailing slash on the configured base URL so the path stays well-formed", async () => {
    const { fetchImpl, getUrl } = captureUrl([META, [wbObservation("2024", 2.8)]]);
    const provider = createWorldBankProvider({
      baseUrl: `${TEST_BASE_URL}/`,
      fetch: fetchImpl,
    });

    await provider.getSeries({ indicatorId: "us_gdp_growth_annual" });

    expect(new URL(getUrl()).pathname).toBe("/v2/country/US/indicator/NY.GDP.MKTP.KD.ZG");
  });

  it("normalizes annual observations, sorts ascending, and computes the annual release date", async () => {
    const { fetchImpl } = captureUrl([
      META,
      [wbObservation("2024", 2.8), wbObservation("2023", 2.5), wbObservation("2022", 1.9)],
    ]);
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    const result = await provider.getSeries({ indicatorId: "us_gdp_growth_annual" });

    expect(result.points).toEqual([
      { date: "2022-12", value: 1.9 },
      { date: "2023-12", value: 2.5 },
      { date: "2024-12", value: 2.8 },
    ]);
    expect(result.observationDate).toBe("2024-12");
    expect(result.releaseDate).toBe("2025-04-15");
    expect(result.range).toEqual({ start: "2022-12", end: "2024-12" });
    expect(result.unit).toBe("percent");

    const seed = getSeedIndicator("us_gdp_growth_annual");
    expect(result.source).toEqual(seed!.metadata.source);
    expect(result.source.provider).toBe("world_bank");
    expect(result.source.seriesId).toBe("NY.GDP.MKTP.KD.ZG");
  });

  it("maps null values to null without coercing them to zero", async () => {
    const { fetchImpl } = captureUrl([
      META,
      [wbObservation("2024", 2.8), wbObservation("2023", null), wbObservation("2022", 1.9)],
    ]);
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    const result = await provider.getSeries({ indicatorId: "us_gdp_growth_annual" });

    expect(result.points.find((p) => p.date === "2023-12")?.value).toBeNull();
    expect(result.points.find((p) => p.date === "2024-12")?.value).toBe(2.8);
  });

  it("slices the response to the requested range", async () => {
    const { fetchImpl } = captureUrl([
      META,
      [
        wbObservation("2024", 2.8),
        wbObservation("2023", 2.5),
        wbObservation("2022", 1.9),
        wbObservation("2021", 5.7),
      ],
    ]);
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    const result = await provider.getSeries({
      indicatorId: "us_gdp_growth_annual",
      range: { start: "2022-12", end: "2023-12" },
    });

    expect(result.points.map((p) => p.date)).toEqual(["2022-12", "2023-12"]);
    expect(result.range).toEqual({ start: "2022-12", end: "2023-12" });
  });

  it("throws indicator_not_found for unknown ids without calling fetch", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    await expect(provider.getSeries({ indicatorId: "us_unknown" })).rejects.toMatchObject({
      code: "indicator_not_found",
      status: 404,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws invalid_query when the catalog source is not World Bank", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    await expect(provider.getSeries({ indicatorId: "us_headline_cpi" })).rejects.toMatchObject({
      code: "invalid_query",
      status: 400,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws unexpected_error if invoked without a base URL", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const provider = createWorldBankProvider({ baseUrl: "", fetch: fetchImpl });

    await expect(provider.getSeries({ indicatorId: "us_gdp_growth_annual" })).rejects.toMatchObject(
      { code: "unexpected_error", status: 500 },
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws invalid_query when the response body has empty observations", async () => {
    const { fetchImpl } = captureUrl([META, []]);
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    await expect(provider.getSeries({ indicatorId: "us_gdp_growth_annual" })).rejects.toMatchObject(
      { code: "invalid_query", status: 400 },
    );
  });

  it("throws invalid_query when the response body has null observations", async () => {
    const { fetchImpl } = captureUrl([META, null]);
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    await expect(provider.getSeries({ indicatorId: "us_gdp_growth_annual" })).rejects.toMatchObject(
      { code: "invalid_query", status: 400 },
    );
  });

  it("throws invalid_query and surfaces the World Bank error message on a 200-with-message envelope", async () => {
    const { fetchImpl } = captureUrl([
      { message: [{ id: "120", key: "Invalid value", value: "Bad indicator id" }] },
    ]);
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    const promise = provider.getSeries({ indicatorId: "us_gdp_growth_annual" });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ code: "invalid_query", status: 400 });
    await expect(promise).rejects.toThrow(/Bad indicator id/);
  });

  it("throws invalid_query on HTTP 400 and surfaces the World Bank message", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        [{ message: [{ id: "120", key: "Invalid value", value: "Country not found" }] }],
        { status: 400 },
      ),
    ) as unknown as typeof fetch;
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    const promise = provider.getSeries({ indicatorId: "us_gdp_growth_annual" });
    await expect(promise).rejects.toMatchObject({ code: "invalid_query", status: 400 });
    await expect(promise).rejects.toThrow(/Country not found/);
  });

  it("throws provider_error on HTTP 500", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: "boom" }, { status: 500 }),
    ) as unknown as typeof fetch;
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    await expect(provider.getSeries({ indicatorId: "us_gdp_growth_annual" })).rejects.toMatchObject(
      { code: "provider_error", status: 502 },
    );
  });

  it("throws provider_error on a network failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    await expect(provider.getSeries({ indicatorId: "us_gdp_growth_annual" })).rejects.toMatchObject(
      { code: "provider_error", status: 502 },
    );
  });

  it("throws provider_error when the response body is not JSON", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("<html>not json</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    ) as unknown as typeof fetch;
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    await expect(provider.getSeries({ indicatorId: "us_gdp_growth_annual" })).rejects.toMatchObject(
      { code: "provider_error", status: 502 },
    );
  });

  it("throws provider_error when the JSON body is not an envelope array", async () => {
    const { fetchImpl } = captureUrl({ unexpected: true });
    const provider = createWorldBankProvider({ baseUrl: TEST_BASE_URL, fetch: fetchImpl });

    await expect(provider.getSeries({ indicatorId: "us_gdp_growth_annual" })).rejects.toMatchObject(
      { code: "provider_error", status: 502 },
    );
  });
});
