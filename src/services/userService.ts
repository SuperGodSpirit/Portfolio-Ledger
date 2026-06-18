import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { normalizeUserRole, type LedgerUser } from "../types/user";

type UserDocumentData = {
  name?: unknown;
  role?: unknown;
  status?: unknown;
  portfolios?: unknown;
  // Legacy fields
  active?: unknown;
  portfolioAlpha?: unknown;
  portfolioBeta?: unknown;
  PortfolioAlpha?: unknown;
  PortfolioBeta?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastReadNotificationAt?: unknown;
};

export const getLedgerUser = async (uid: string): Promise<LedgerUser | null> => {
  const userSnapshot = await getDoc(doc(db, "users", uid));

  if (!userSnapshot.exists()) {
    return null;
  }

  const data = userSnapshot.data() as UserDocumentData;
  const role = normalizeUserRole(data.role);

  // Fallback logic for migration
  const legacyActive = typeof data.active === "boolean" ? data.active : true;
  const status = typeof data.status === "string" ? (data.status as "pending" | "active" | "deactivated") : (legacyActive ? "active" : "deactivated");

  let portfolios: string[] = [];
  if (Array.isArray(data.portfolios)) {
    portfolios = data.portfolios as string[];
  } else {
    // Legacy fallback
    if (data.portfolioAlpha === true || data.PortfolioAlpha === true) portfolios.push("portfolioAlpha");
    if (data.portfolioBeta === true || data.PortfolioBeta === true) portfolios.push("portfolioBeta");
  }

  if (typeof data.name !== "string" || !role) {
    throw new Error("User profile is missing required name or role fields.");
  }

  return {
    uid,
    name: data.name,
    role,
    status,
    portfolios,
    // Keep legacy around just in case
    active: legacyActive,
    portfolioAlpha: portfolios.includes("portfolioAlpha"),
    portfolioBeta: portfolios.includes("portfolioBeta"),
    createdAt: data.createdAt as any,
    updatedAt: data.updatedAt as any,
    lastReadNotificationAt: typeof data.lastReadNotificationAt === "string" ? data.lastReadNotificationAt : null,
  };
};
