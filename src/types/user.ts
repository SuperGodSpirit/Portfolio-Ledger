export type UserRole = "owner" | "manager" | "viewer";

export type LedgerUser = {
  uid: string;
  name: string;
  role: UserRole;
  active: boolean;
  portfolioAlpha: boolean;
  portfolioBeta: boolean;
};

export const isUserRole = (role: unknown): role is UserRole =>
  role === "owner" || role === "manager" || role === "viewer";

export const normalizeUserRole = (role: unknown): UserRole | null => {
  if (typeof role !== "string") {
    return null;
  }

  const normalizedRole = role.toLowerCase();
  return isUserRole(normalizedRole) ? normalizedRole : null;
};
