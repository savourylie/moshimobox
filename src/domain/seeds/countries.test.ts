import { describe, expect, it } from "vitest";
import { CountrySchema } from "@/domain/schemas";
import {
  findCountryByName,
  getCountryMetadata,
  getCountrySummary,
  MVP_COUNTRY_REGISTRY,
} from "./countries";

describe("MVP_COUNTRY_REGISTRY", () => {
  it("includes the United States entry that anchors the MVP catalog", () => {
    const us = MVP_COUNTRY_REGISTRY.find((country) => country.code === "US");

    expect(us).toBeDefined();
    expect(us?.iso3).toBe("USA");
    expect(us?.name).toBe("United States");
    expect(us?.nameZh).toBe("美國");
  });
});

describe("getCountryMetadata", () => {
  it("looks up by alpha-2 code", () => {
    expect(getCountryMetadata("US")?.iso3).toBe("USA");
  });

  it("looks up by alpha-3 code", () => {
    expect(getCountryMetadata("USA")?.code).toBe("US");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(getCountryMetadata("us")?.code).toBe("US");
    expect(getCountryMetadata(" usa ")?.code).toBe("US");
  });

  it("returns undefined for unknown codes", () => {
    expect(getCountryMetadata("ZZ")).toBeUndefined();
    expect(getCountryMetadata("")).toBeUndefined();
  });
});

describe("findCountryByName", () => {
  it("looks up by English name", () => {
    expect(findCountryByName("United States")?.code).toBe("US");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(findCountryByName(" united states ")?.code).toBe("US");
  });

  it("looks up by zh-TW name when present", () => {
    expect(findCountryByName("美國")?.code).toBe("US");
  });

  it("returns undefined for unknown names", () => {
    expect(findCountryByName("Atlantis")).toBeUndefined();
    expect(findCountryByName("")).toBeUndefined();
  });
});

describe("getCountrySummary", () => {
  it("returns the strict {code, name} shape that CountrySchema accepts", () => {
    const summary = getCountrySummary("US");

    expect(summary).toEqual({ code: "US", name: "United States" });
    expect(CountrySchema.safeParse(summary).success).toBe(true);
  });

  it("does not leak iso3 or nameZh fields that would fail the strict schema", () => {
    const summary = getCountrySummary("US");

    expect(summary && Object.keys(summary).sort()).toEqual(["code", "name"]);
  });

  it("returns undefined for unknown codes", () => {
    expect(getCountrySummary("ZZ")).toBeUndefined();
  });
});
