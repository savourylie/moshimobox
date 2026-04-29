import type { IndicatorMetadata, QuadrantId, WidgetType } from "@/domain/schemas";
import { getCountrySummary } from "./countries";

export interface SeedIndicator {
  metadata: IndicatorMetadata;
  category: string;
  country: {
    code: string;
    name: string;
  };
  definition: string;
  display: {
    defaultWidgetType: WidgetType;
    observationDatePlaceholder: string;
    guidance: string;
  };
  availability: {
    status: "known_provider_series" | "fixture_backed" | "deferred";
    note: string;
  };
}

export const MVP_INDICATOR_CATALOG_ASSUMPTIONS = [
  "The provisional MVP catalog is US-centered so the first dashboard can stay coherent while provider work is still shallow.",
  "FRED is the primary source for monthly, weekly, and daily US series; World Bank is included for annual cross-provider coverage.",
  "Observation dates are placeholders for fixture validation only. Live freshness rules land with the provider and cache tickets.",
  "Market indicators use FRED-hosted public market series to avoid adding a new provider in the MVP foundation phase.",
] as const;

const fredSource = (seriesId: string) => ({
  provider: "fred" as const,
  name: "Federal Reserve Economic Data",
  seriesId,
  url: `https://fred.stlouisfed.org/series/${seriesId}`,
});

const worldBankSource = (seriesId: string) => ({
  provider: "world_bank" as const,
  name: "World Bank Open Data",
  seriesId,
  url: `https://data.worldbank.org/indicator/${seriesId}`,
});

const usCountry = getCountrySummary("US");
if (!usCountry) {
  throw new Error("MVP_COUNTRY_REGISTRY is missing the United States entry required by the catalog.");
}

export const MVP_INDICATOR_CATALOG: SeedIndicator[] = [
  {
    metadata: {
      id: "us_real_gdp",
      name: "Real GDP",
      description: "Inflation-adjusted US output level.",
      quadrantId: "growth",
      countryCode: "US",
      frequency: "quarterly",
      unit: "billions of chained 2017 USD",
      source: fredSource("GDPC1"),
      tags: ["output", "national accounts"],
    },
    category: "Output",
    country: usCountry,
    definition:
      "Real gross domestic product measures the inflation-adjusted value of goods and services produced in the United States.",
    display: {
      defaultWidgetType: "line_chart",
      observationDatePlaceholder: "2025-Q4",
      guidance:
        "Use as the slow-moving anchor for the growth quadrant, with quarterly cadence made explicit.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED GDPC1 is available through the planned FRED adapter.",
    },
  },
  {
    metadata: {
      id: "us_unemployment_rate",
      name: "Unemployment rate",
      description: "Share of the US labor force that is unemployed.",
      quadrantId: "growth",
      countryCode: "US",
      frequency: "monthly",
      unit: "percent",
      source: fredSource("UNRATE"),
      tags: ["labor market", "slack"],
    },
    category: "Labor market",
    country: usCountry,
    definition:
      "The unemployment rate tracks unemployed workers as a share of the civilian labor force.",
    display: {
      defaultWidgetType: "metric_card",
      observationDatePlaceholder: "2026-03",
      guidance: "Use as the concise labor slack read beside broader output measures.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED UNRATE is available through the planned FRED adapter.",
    },
  },
  {
    metadata: {
      id: "us_gdp_growth_annual",
      name: "GDP growth",
      description: "Annual US real GDP growth from World Bank national accounts.",
      quadrantId: "growth",
      countryCode: "US",
      frequency: "annual",
      unit: "percent",
      source: worldBankSource("NY.GDP.MKTP.KD.ZG"),
      tags: ["output", "world bank"],
    },
    category: "Output",
    country: usCountry,
    definition:
      "Annual GDP growth measures the year-over-year rate of growth in inflation-adjusted gross domestic product.",
    display: {
      defaultWidgetType: "metric_card",
      observationDatePlaceholder: "2024-12",
      guidance:
        "Use as the World Bank-backed growth reference; label it annual so it is not read as a fresh monthly signal.",
    },
    availability: {
      status: "known_provider_series",
      note: "World Bank indicator NY.GDP.MKTP.KD.ZG is included to exercise the second official provider path.",
    },
  },
  {
    metadata: {
      id: "us_headline_cpi",
      name: "CPI",
      description: "US headline consumer price index for all urban consumers.",
      quadrantId: "inflation",
      countryCode: "US",
      frequency: "monthly",
      unit: "index points",
      source: fredSource("CPIAUCSL"),
      tags: ["prices", "consumer"],
    },
    category: "Consumer prices",
    country: usCountry,
    definition:
      "The consumer price index tracks the average change in prices paid by urban consumers for a broad basket of goods and services.",
    display: {
      defaultWidgetType: "metric_card",
      observationDatePlaceholder: "2026-03",
      guidance:
        "Use as the headline inflation anchor and pair with the observation month whenever a value is shown.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED CPIAUCSL is available through the planned FRED adapter.",
    },
  },
  {
    metadata: {
      id: "us_core_cpi",
      name: "Core CPI",
      description: "US CPI excluding food and energy.",
      quadrantId: "inflation",
      countryCode: "US",
      frequency: "monthly",
      unit: "index points",
      source: fredSource("CPILFESL"),
      tags: ["prices", "consumer", "core"],
    },
    category: "Consumer prices",
    country: usCountry,
    definition:
      "Core CPI excludes food and energy prices to show a less volatile read of consumer inflation pressure.",
    display: {
      defaultWidgetType: "line_chart",
      observationDatePlaceholder: "2026-03",
      guidance:
        "Use for trend context behind the headline CPI card rather than as a separate alarm.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED CPILFESL is available through the planned FRED adapter.",
    },
  },
  {
    metadata: {
      id: "us_5y_breakeven_inflation",
      name: "5-year breakeven inflation",
      description: "Market-implied average inflation over the next five years.",
      quadrantId: "inflation",
      countryCode: "US",
      frequency: "daily",
      unit: "percent",
      source: fredSource("T5YIE"),
      tags: ["inflation expectations", "market"],
    },
    category: "Inflation expectations",
    country: usCountry,
    definition:
      "The 5-year breakeven inflation rate estimates expected average inflation by comparing nominal Treasury yields with inflation-indexed Treasury yields.",
    display: {
      defaultWidgetType: "line_chart",
      observationDatePlaceholder: "2026-04-24",
      guidance:
        "Use as an expectations label, not as a trading signal; keep the muted status tone.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED T5YIE is available through the planned FRED adapter.",
    },
  },
  {
    metadata: {
      id: "us_effective_fed_funds_rate",
      name: "Effective federal funds rate",
      description: "Monthly average effective federal funds rate.",
      quadrantId: "policy",
      countryCode: "US",
      frequency: "monthly",
      unit: "percent",
      source: fredSource("FEDFUNDS"),
      tags: ["policy rate", "federal reserve"],
    },
    category: "Policy rate",
    country: usCountry,
    definition:
      "The effective federal funds rate is the volume-weighted median rate for overnight federal funds transactions.",
    display: {
      defaultWidgetType: "metric_card",
      observationDatePlaceholder: "2026-03",
      guidance: "Use as the front-door policy rate card for the Policy / Liquidity quadrant.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED FEDFUNDS is available through the planned FRED adapter.",
    },
  },
  {
    metadata: {
      id: "us_m2_money_supply",
      name: "M2",
      description: "US M2 money stock.",
      quadrantId: "policy",
      countryCode: "US",
      frequency: "monthly",
      unit: "billions of USD",
      source: fredSource("M2SL"),
      tags: ["liquidity", "money supply"],
    },
    category: "Liquidity",
    country: usCountry,
    definition:
      "M2 includes currency, checking deposits, savings deposits, small time deposits, and retail money market funds.",
    display: {
      defaultWidgetType: "line_chart",
      observationDatePlaceholder: "2026-03",
      guidance: "Use to show broad liquidity direction without implying short-term causality.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED M2SL is available through the planned FRED adapter.",
    },
  },
  {
    metadata: {
      id: "us_fed_total_assets",
      name: "Fed total assets",
      description: "Total assets held by the Federal Reserve.",
      quadrantId: "policy",
      countryCode: "US",
      frequency: "weekly",
      unit: "millions of USD",
      source: fredSource("WALCL"),
      tags: ["liquidity", "balance sheet"],
    },
    category: "Liquidity",
    country: usCountry,
    definition:
      "Federal Reserve total assets summarize the size of the central bank balance sheet across securities, loans, and other assets.",
    display: {
      defaultWidgetType: "line_chart",
      observationDatePlaceholder: "2026-04-22",
      guidance: "Use as balance-sheet context beside rates and money supply.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED WALCL is available through the planned FRED adapter.",
    },
  },
  {
    metadata: {
      id: "us_10y_treasury_yield",
      name: "10Y Treasury yield",
      description: "Daily 10-year US Treasury constant maturity rate.",
      quadrantId: "market",
      countryCode: "US",
      frequency: "daily",
      unit: "percent",
      source: fredSource("DGS10"),
      tags: ["rates", "treasury"],
    },
    category: "Rates",
    country: usCountry,
    definition:
      "The 10-year Treasury yield is the daily constant maturity rate for US Treasury securities with a 10-year tenor.",
    display: {
      defaultWidgetType: "comparison_chart",
      observationDatePlaceholder: "2026-04-24",
      guidance:
        "Use with the 2Y Treasury yield to show curve shape without declaring a regime by color alone.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED DGS10 is available through the planned FRED adapter.",
    },
  },
  {
    metadata: {
      id: "us_2y_treasury_yield",
      name: "2Y Treasury yield",
      description: "Daily 2-year US Treasury constant maturity rate.",
      quadrantId: "market",
      countryCode: "US",
      frequency: "daily",
      unit: "percent",
      source: fredSource("DGS2"),
      tags: ["rates", "treasury"],
    },
    category: "Rates",
    country: usCountry,
    definition:
      "The 2-year Treasury yield is the daily constant maturity rate for US Treasury securities with a 2-year tenor.",
    display: {
      defaultWidgetType: "comparison_chart",
      observationDatePlaceholder: "2026-04-24",
      guidance:
        "Use with the 10Y Treasury yield to show front-end policy sensitivity in the curve view.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED DGS2 is available through the planned FRED adapter.",
    },
  },
  {
    metadata: {
      id: "us_sp500",
      name: "S&P 500",
      description: "Daily S&P 500 index level.",
      quadrantId: "market",
      countryCode: "US",
      frequency: "daily",
      unit: "index points",
      source: fredSource("SP500"),
      tags: ["equities", "risk assets"],
    },
    category: "Equities",
    country: usCountry,
    definition:
      "The S&P 500 is a broad US large-cap equity index used as a reference for public equity market conditions.",
    display: {
      defaultWidgetType: "line_chart",
      observationDatePlaceholder: "2026-04-24",
      guidance: "Use as market context, not as a direct allocation instruction.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED SP500 is available through the planned FRED adapter.",
    },
  },
  {
    metadata: {
      id: "us_vix",
      name: "VIX",
      description: "CBOE volatility index level.",
      quadrantId: "market",
      countryCode: "US",
      frequency: "daily",
      unit: "index points",
      source: fredSource("VIXCLS"),
      tags: ["volatility", "risk sentiment"],
    },
    category: "Volatility",
    country: usCountry,
    definition:
      "The VIX estimates expected 30-day volatility for the S&P 500 based on option prices.",
    display: {
      defaultWidgetType: "metric_card",
      observationDatePlaceholder: "2026-04-24",
      guidance: "Use as a muted risk-sentiment context card and avoid alarm styling.",
    },
    availability: {
      status: "known_provider_series",
      note: "FRED VIXCLS is available through the planned FRED adapter.",
    },
  },
];

export const INDICATORS_BY_ID = new Map(
  MVP_INDICATOR_CATALOG.map((indicator) => [indicator.metadata.id, indicator]),
);

export const getSeedIndicator = (indicatorId: string): SeedIndicator | undefined =>
  INDICATORS_BY_ID.get(indicatorId);

export const getSeedIndicatorsByQuadrant = (quadrantId: QuadrantId): SeedIndicator[] =>
  MVP_INDICATOR_CATALOG.filter((indicator) => indicator.metadata.quadrantId === quadrantId);
