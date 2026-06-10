import type { Timestamp } from "firebase/firestore";

export type MemberCode = string;
export type PortfolioId = string;

export type PortfolioStatus = "active" | "archived";

export type PortfolioMember = {
  uid?: string; // Canonical identifier going forward
  code: MemberCode;
  name: string;
  ratio: number;
};

export type Portfolio = {
  id: PortfolioId;
  name: string;
  memberCodes: MemberCode[];
  members: PortfolioMember[];
  status: PortfolioStatus;
  // Legacy fields
  active?: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type PsrVersion = {
  id: string; // e.g. "v1", "v2"
  portfolioId: PortfolioId;
  members: PortfolioMember[];
  validFrom: Timestamp | null;
  createdByUid: string;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
};

export const memberDisplayNames: Record<string, string> = {
  P: "Prem",
  H: "Himanshu",
  Ana: "Anamika",
  Ag: "Angat",
};
