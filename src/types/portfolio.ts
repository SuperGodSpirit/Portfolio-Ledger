import type { Timestamp } from "firebase/firestore";

export type MemberCode = "P" | "H" | "Ana" | "Ag";

export type PortfolioId = "portfolioAlpha" | "portfolioBeta";

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
  active: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export const memberDisplayNames: Record<MemberCode, string> = {
  P: "Prem",
  H: "Himanshu",
  Ana: "Anamika",
  Ag: "Angat",
};
