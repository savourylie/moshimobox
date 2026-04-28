export type QuadrantId = "growth" | "inflation" | "policy" | "market";

export interface QuadrantNavItem {
  id: QuadrantId;
  label: string;
  asset: string;
  anchor: string;
}

export const QUADRANTS: readonly QuadrantNavItem[] = [
  {
    id: "growth",
    label: "Growth",
    asset: "/brand/quadrant-growth.svg",
    anchor: "#growth",
  },
  {
    id: "inflation",
    label: "Inflation",
    asset: "/brand/quadrant-inflation.svg",
    anchor: "#inflation",
  },
  {
    id: "policy",
    label: "Policy / Liquidity",
    asset: "/brand/quadrant-policy.svg",
    anchor: "#policy",
  },
  {
    id: "market",
    label: "Market",
    asset: "/brand/quadrant-market.svg",
    anchor: "#market",
  },
] as const;
