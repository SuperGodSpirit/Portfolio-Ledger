import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  addDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { ProfitSharingRatio, PsrHistory, PsrMember } from "../types/psr";
import type { PortfolioId } from "../types/portfolio";
import type { LedgerUser } from "../types/user";
import { fixedPortfolios } from "./portfolioService";
import { createAuditLog } from "./auditService";

export const getPsrByPortfolio = async (portfolioId: PortfolioId): Promise<ProfitSharingRatio | null> => {
  const psrDoc = await getDoc(doc(db, "profit_sharing_ratios", portfolioId));
  if (psrDoc.exists()) {
    return { id: psrDoc.id, ...psrDoc.data() } as ProfitSharingRatio;
  }
  return null;
};

// Internal helper to get users and match them to existing codes
const fetchUsersToBootstrap = async (portfolioId: PortfolioId) => {
  const usersSnap = await getDocs(collection(db, "users"));
  const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as any));
  
  // Filter for users who actually have access to this portfolio
  // In the real app, boolean flags are used like portfolioAlpha, PortfolioAlpha, etc.
  const activeUsers = users.filter(u => {
    if (portfolioId === "portfolioAlpha") return u.portfolioAlpha === true || u.PortfolioAlpha === true;
    if (portfolioId === "portfolioBeta") return u.portfolioBeta === true || u.PortfolioBeta === true;
    return false;
  });
  
  return activeUsers;
};

export const bootstrapPsrForPortfolio = async (portfolioId: PortfolioId, currentUser: LedgerUser): Promise<ProfitSharingRatio> => {
  const existing = await getPsrByPortfolio(portfolioId);
  if (existing) return existing;

  const fixed = fixedPortfolios[portfolioId];
  const totalRatio = fixed.members.reduce((sum, m) => sum + m.ratio, 0);
  
  // Try to match users to get uid and role
  const activeUsers = await fetchUsersToBootstrap(portfolioId);

  const psrMembers: PsrMember[] = fixed.members.map(fm => {
    // Attempt to find a matching user by name (case insensitive fallback)
    const matchedUser = activeUsers.find(u => 
      u.name === fm.name || 
      (typeof u.name === 'string' && u.name.toLowerCase() === fm.name.toLowerCase())
    );

    return {
      uid: matchedUser?.uid || `legacy-${fm.code}`,
      memberCode: fm.code,
      name: fm.name,
      role: matchedUser?.role || "viewer",
      ratio: Number(((fm.ratio / totalRatio) * 100).toFixed(2)),
    };
  });

  const newPsr: ProfitSharingRatio = {
    portfolioId,
    members: psrMembers,
    updatedAt: null,
    updatedBy: currentUser.uid,
    updatedByName: currentUser.name,
  };

  // Create document in profit_sharing_ratios
  const psrRef = doc(db, "profit_sharing_ratios", portfolioId);
  await setDoc(psrRef, {
    ...newPsr,
    updatedAt: serverTimestamp(),
  });

  // Create history version 1
  await addDoc(collection(db, "psr_history"), {
    portfolioId,
    versionNumber: 1,
    members: psrMembers,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.uid,
    updatedByName: currentUser.name,
  });

  // Fetch the created doc to ensure we return exactly what's in DB (including timestamp if needed, but we'll return object)
  const created = await getPsrByPortfolio(portfolioId);
  return created || newPsr;
};

export const updatePsr = async (
  portfolioId: PortfolioId,
  members: PsrMember[],
  currentUser: LedgerUser,
  oldMembers: PsrMember[]
) => {
  // Validate total is 100
  const total = members.reduce((sum, m) => sum + m.ratio, 0);
  // Allow slight floating point variances (e.g. 100.00000000000001)
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Total ratio must be exactly 100%. Current is ${total}%`);
  }

  const psrRef = doc(db, "profit_sharing_ratios", portfolioId);
  
  // Determine next version number
  const historyQuery = query(
    collection(db, "psr_history"), 
    where("portfolioId", "==", portfolioId),
    orderBy("versionNumber", "desc")
  );
  const historySnap = await getDocs(historyQuery);
  const nextVersion = historySnap.empty ? 1 : (historySnap.docs[0].data().versionNumber + 1);

  // Update current PSR
  await setDoc(psrRef, {
    portfolioId,
    members,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.uid,
    updatedByName: currentUser.name,
  });

  // Create history record
  await addDoc(collection(db, "psr_history"), {
    portfolioId,
    versionNumber: nextVersion,
    members,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.uid,
    updatedByName: currentUser.name,
  });

  // Build audit description
  let description = `Updated Profit Sharing Ratio for ${portfolioId === "portfolioAlpha" ? "Portfolio Alpha" : "Portfolio Beta"}\n\n`;
  description += `Before:\n` + oldMembers.map(m => `${m.name} ${m.ratio}%`).join("\n") + "\n\n";
  description += `After:\n` + members.map(m => `${m.name} ${m.ratio}%`).join("\n");

  await createAuditLog({
    eventType: "psr_updated",
    entityType: "psr",
    entityId: portfolioId,
    userUid: currentUser.uid,
    userName: currentUser.name,
    description,
    portfolioId,
  });
};

export const getPsrHistory = async (portfolioId: PortfolioId): Promise<PsrHistory[]> => {
  const historyQuery = query(
    collection(db, "psr_history"),
    where("portfolioId", "==", portfolioId),
    orderBy("versionNumber", "desc")
  );
  const snapshot = await getDocs(historyQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsrHistory));
};
