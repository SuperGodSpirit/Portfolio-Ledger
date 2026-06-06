import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { normalizeUserRole, type LedgerUser } from "../types/user";

type UserDocumentData = {
  name?: unknown;
  role?: unknown;
  active?: unknown;
  portfolioAlpha?: unknown;
  portfolioBeta?: unknown;
  PortfolioAlpha?: unknown;
  PortfolioBeta?: unknown;
};

export const getLedgerUser = async (uid: string): Promise<LedgerUser | null> => {
  const userSnapshot = await getDoc(doc(db, "users", uid));

  if (!userSnapshot.exists()) {
    return null;
  }

  const data = userSnapshot.data() as UserDocumentData;
  const role = normalizeUserRole(data.role);
  const portfolioAlpha = data.portfolioAlpha ?? data.PortfolioAlpha;
  const portfolioBeta = data.portfolioBeta ?? data.PortfolioBeta;

  if (
    typeof data.name !== "string" ||
    !role ||
    typeof data.active !== "boolean" ||
    typeof portfolioAlpha !== "boolean" ||
    typeof portfolioBeta !== "boolean"
  ) {
    throw new Error("User profile is missing required role or access fields.");
  }

  return {
    uid,
    name: data.name,
    role,
    active: data.active,
    portfolioAlpha,
    portfolioBeta,
  };
};
