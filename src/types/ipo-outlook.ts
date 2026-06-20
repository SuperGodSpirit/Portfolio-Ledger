import { Timestamp } from "firebase/firestore";

export type ScenarioRange = {
  min: number;
  max: number;
  probability?: "Low" | "Moderate" | "High";
};
export type IpoOutlook = {
  id: string;
  ipoId: string;

  modelProvider: string;
  modelVersion: string;
  promptVersion?: string;

  generatedAt: Timestamp | { toMillis: () => number } | any;
  gmpAtGeneration?: number;
  generationDurationMs?: number;
  triggerReason?: string;
  triggeredBy?: string;
  triggeredByRole?: string;
  triggerStatus?: {
    initial: boolean;
    preOpen: boolean;
    closeDate: boolean;
  };

  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed";

  lastError?: string;

  bearCase: ScenarioRange;
  baseCase: ScenarioRange;
  gmpCase: ScenarioRange;
  bullCase: ScenarioRange;

  confidenceScore: number;
  rationale: string;

  inputSnapshot?: {
    gmp?: number;
    peRatio?: number | null;
    ronw?: number | null;
    revenueGrowth?: number | null;
    profitGrowth?: number | null;
    debtToEquity?: number | null;
    issueSize?: number;
  };

  rawResponse?: string;

  actualListingGain: number | null;
  modelAccuracyScore: number | null;
};
