import type { DashboardLayout } from "@/domain/schemas";

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  id: "main",
  version: 1,
  quadrants: {
    growth: {
      id: "growth",
      label: "Growth",
      widgets: [
        {
          id: "widget_us_unemployment_rate",
          type: "metric_card",
          title: "Unemployment rate",
          description: "Labor slack check for the current growth quadrant.",
          indicatorId: "us_unemployment_rate",
        },
        {
          id: "widget_us_real_gdp",
          type: "line_chart",
          title: "Real GDP",
          description: "Quarterly output level for the US growth base.",
          indicatorId: "us_real_gdp",
          range: {
            start: "2020-Q1",
          },
          transform: "level",
        },
        {
          id: "widget_us_gdp_growth_annual",
          type: "metric_card",
          title: "GDP growth",
          description: "Annual World Bank reference for US growth momentum.",
          indicatorId: "us_gdp_growth_annual",
        },
      ],
    },
    inflation: {
      id: "inflation",
      label: "Inflation",
      widgets: [
        {
          id: "widget_us_headline_cpi",
          type: "metric_card",
          title: "CPI",
          description: "Headline consumer prices as the inflation anchor.",
          indicatorId: "us_headline_cpi",
        },
        {
          id: "widget_us_core_cpi",
          type: "line_chart",
          title: "Core CPI",
          description: "Underlying consumer price trend excluding food and energy.",
          indicatorId: "us_core_cpi",
          range: {
            start: "2020-01",
          },
          transform: "level",
        },
        {
          id: "widget_us_5y_breakeven_inflation",
          type: "line_chart",
          title: "5-year breakeven inflation",
          description: "Market-implied inflation expectations over a five-year horizon.",
          indicatorId: "us_5y_breakeven_inflation",
          range: {
            start: "2024-01-01",
          },
          transform: "level",
        },
      ],
    },
    policy: {
      id: "policy",
      label: "Policy / Liquidity",
      widgets: [
        {
          id: "widget_us_effective_fed_funds_rate",
          type: "metric_card",
          title: "Effective federal funds rate",
          description: "Policy-rate baseline for the current liquidity setting.",
          indicatorId: "us_effective_fed_funds_rate",
        },
        {
          id: "widget_us_m2_money_supply",
          type: "line_chart",
          title: "M2",
          description: "Broad money supply direction for liquidity context.",
          indicatorId: "us_m2_money_supply",
          range: {
            start: "2020-01",
          },
          transform: "level",
        },
        {
          id: "widget_us_fed_total_assets",
          type: "line_chart",
          title: "Fed total assets",
          description: "Federal Reserve balance-sheet context beside policy rates.",
          indicatorId: "us_fed_total_assets",
          range: {
            start: "2020-01-01",
          },
          transform: "level",
        },
      ],
    },
    market: {
      id: "market",
      label: "Market",
      widgets: [
        {
          id: "widget_us_yield_curve",
          type: "comparison_chart",
          title: "Yield curve",
          description: "10Y and 2Y Treasury yields for curve-shape context.",
          indicatorIds: ["us_10y_treasury_yield", "us_2y_treasury_yield"],
          range: {
            start: "2024-01-01",
          },
          transform: "level",
        },
        {
          id: "widget_us_sp500",
          type: "line_chart",
          title: "S&P 500",
          description: "Large-cap equity level as a broad risk-asset reference.",
          indicatorId: "us_sp500",
          range: {
            start: "2024-01-01",
          },
          transform: "level",
        },
        {
          id: "widget_us_vix",
          type: "metric_card",
          title: "VIX",
          description: "Expected equity volatility as a market stress context card.",
          indicatorId: "us_vix",
        },
      ],
    },
  },
};
