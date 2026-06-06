import type { Timestamp } from "firebase/firestore";
import type { MemberCode, PortfolioId } from "./portfolio";
import type { UserRole } from "./user";

export type PsrMember = {
  uid: string;
  memberCode: MemberCode;
  name: string;
  role: UserRole;
  ratio: number;
};

export type ProfitSharingRatio = {
  id?: string;
  portfolioId: PortfolioId;
  members: PsrMember[];
  updatedAt: Timestamp | null;
  updatedBy: string; // uid of the user who updated
  updatedByName: string;
};

export type PsrHistory = {
  id?: string;
  portfolioId: PortfolioId;
  versionNumber: number;
  members: PsrMember[];
  updatedAt: Timestamp | null;
  updatedBy: string;
  updatedByName: string;
};
