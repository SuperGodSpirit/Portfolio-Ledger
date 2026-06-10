import type { Timestamp } from "firebase/firestore";

export type UserRole = "owner" | "manager" | "viewer" | "guest";
export type UserStatus = "pending" | "active" | "deactivated";

export type LedgerUser = {
  uid: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  portfolios: string[];
  // Legacy fields for migration fallback (optional)
  active?: boolean;
  portfolioAlpha?: boolean;
  portfolioBeta?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

export const isUserRole = (role: unknown): role is UserRole =>
  role === "owner" || role === "manager" || role === "viewer" || role === "guest";

export const normalizeUserRole = (role: unknown): UserRole | null => {
  if (typeof role !== "string") {
    return null;
  }

  const normalizedRole = role.toLowerCase();
  return isUserRole(normalizedRole) ? normalizedRole : null;
};
