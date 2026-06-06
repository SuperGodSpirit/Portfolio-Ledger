import type { Timestamp } from "firebase/firestore";
import type { MemberCode, PortfolioId } from "./portfolio";

export type IpoStatus = "active" | "archived";

export type SettlementInstruction = {
  id: string;
  from: string;
  to: string;
  amount: number;
  status: "pending" | "settled";
  settledAt: string | null;
};

export type MemberEntitlement = {
  memberCode: MemberCode;
  memberName: string;
  actual: number;
  entitled: number;
  net: number;
};

export type CalculationSnapshot = {
  totalProfitLoss: number;
  memberEntitlements: MemberEntitlement[];
  settlementInstructions: SettlementInstruction[];
};

export type IpoMemberEntry = {
  memberCode: MemberCode;
  memberName: string;
  appliedLots?: number;
  allottedLots?: number;
  appliedAmount: number;
  allottedAmount: number;
  finalBankCredit: number;
};

export type IpoRecord = {
  id: string;
  ipoName: string;
  portfolioId: PortfolioId;
  portfolioName: string;
  allotmentDate: string;
  lotValue?: number | null;
  memberEntries: Record<string, IpoMemberEntry>;
  status: IpoStatus;
  createdByUid: string;
  createdByName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  calculationSnapshot: CalculationSnapshot;
};

export type IpoFormValues = {
  ipoName: string;
  portfolioId: PortfolioId;
  portfolioName: string;
  allotmentDate: string;
  lotValue: number | null;
  status: IpoStatus;
  memberEntries: Record<string, IpoMemberEntry>;
  calculationSnapshot: CalculationSnapshot;
};
