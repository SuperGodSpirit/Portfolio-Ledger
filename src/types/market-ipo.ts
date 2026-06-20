export type MarketIpoStatus = "upcoming" | "active" | "closed" | "listed";

export type MarketIpo = {
  id: string; // The link or a unique slug
  name: string;
  priceBand: string;
  lotSize: string | null;
  minInvestment?: string | null;
  openDate: string | null;
  closeDate: string | null;
  listingDate: string | null;
  gmp: string | null;
  status: MarketIpoStatus;
  sourceLink?: string;
  peRatio?: number | null;
  ronw?: number | null;
  debtToEquity?: number | null;
  issueSize?: number | null;
  revenueGrowth?: number | null;
  profitGrowth?: number | null;
};

export type MarketIpoFetchMetadata = {
  lastFetchedAt: string; // ISO timestamp
  status: "success" | "error";
  errorMessage?: string;
};
