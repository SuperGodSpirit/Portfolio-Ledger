import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { IpoFormValues, IpoRecord } from "../types/ipo";
import type { PortfolioId } from "../types/portfolio";
import type { LedgerUser } from "../types/user";
import { createAuditLog } from "./auditService";

const mapIpoDocument = (ipoId: string, data: Partial<IpoRecord>): IpoRecord => ({
  id: ipoId,
  ipoName: data.ipoName ?? "",
  portfolioId: data.portfolioId as PortfolioId,
  portfolioName: data.portfolioName ?? "",
  allotmentDate: data.allotmentDate ?? "",
  lotValue: data.lotValue ?? null,
  memberEntries: data.memberEntries ?? {},
  status: data.status ?? "active",
  createdByUid: data.createdByUid ?? "",
  createdByName: data.createdByName ?? "",
  createdAt: data.createdAt ?? null,
  updatedAt: data.updatedAt ?? null,
  calculationSnapshot: data.calculationSnapshot ? {
    ...data.calculationSnapshot,
    settlementInstructions: (data.calculationSnapshot.settlementInstructions || []).map(inst => ({
      ...inst,
      id: inst.id || `${inst.from}-${inst.to}-${inst.amount}`, // fallback ID
      status: inst.status || "pending",
      settledAt: inst.settledAt || null,
    }))
  } : {
    totalProfitLoss: 0,
    memberEntitlements: [],
    settlementInstructions: [],
  },
});


export const createIpo = async (values: IpoFormValues, user: LedgerUser) => {
  const docRef = await addDoc(collection(db, "ipos"), {
    ...values,
    createdByUid: user.uid,
    createdByName: user.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    eventType: "ipo_created",
    entityType: "ipo",
    entityId: docRef.id,
    userUid: user.uid,
    userName: user.name,
    description: `Created IPO: ${values.ipoName}`,
    portfolioId: values.portfolioId,
  });
};

export const updateIpo = async (ipoId: string, values: IpoFormValues, user: LedgerUser) => {
  await updateDoc(doc(db, "ipos", ipoId), {
    ...values,
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    eventType: "ipo_edited",
    entityType: "ipo",
    entityId: ipoId,
    userUid: user.uid,
    userName: user.name,
    description: `Edited IPO: ${values.ipoName}`,
    portfolioId: values.portfolioId,
  });
};

export const archiveIpo = async (ipoId: string, user: LedgerUser, ipoName: string, portfolioId: string) => {
  await updateDoc(doc(db, "ipos", ipoId), {
    status: "archived",
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    eventType: "ipo_archived",
    entityType: "ipo",
    entityId: ipoId,
    userUid: user.uid,
    userName: user.name,
    description: `Archived IPO: ${ipoName}`,
    portfolioId,
  });
};

export const unarchiveIpo = async (ipoId: string, user: LedgerUser, ipoName: string, portfolioId: string) => {
  await updateDoc(doc(db, "ipos", ipoId), {
    status: "active",
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    eventType: "ipo_restored",
    entityType: "ipo",
    entityId: ipoId,
    userUid: user.uid,
    userName: user.name,
    description: `Restored IPO: ${ipoName}`,
    portfolioId,
  });
};

export const updateSettlementStatus = async (
  ipoId: string,
  instructionId: string,
  status: "pending" | "settled",
  user: LedgerUser,
  ipoName: string,
  portfolioId: string
) => {
  const ipoRef = doc(db, "ipos", ipoId);
  const ipoSnap = await getDoc(ipoRef);
  if (!ipoSnap.exists()) return;

  const data = ipoSnap.data() as Partial<IpoRecord>;
  if (!data.calculationSnapshot) return;

  const instructions = data.calculationSnapshot.settlementInstructions || [];
  let updatedAmount = 0;
  let updatedFrom = "";
  let updatedTo = "";

  const updatedInstructions = instructions.map((inst) => {
    const matchId = inst.id || `${inst.from}-${inst.to}-${inst.amount}`;
    if (matchId === instructionId) {
      updatedAmount = inst.amount;
      updatedFrom = inst.from;
      updatedTo = inst.to;
      return {
        ...inst,
        status,
        settledAt: status === "settled" ? new Date().toISOString() : null,
      };
    }
    return inst;
  });

  await updateDoc(ipoRef, {
    "calculationSnapshot.settlementInstructions": updatedInstructions,
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    eventType: status === "settled" ? "settlement_settled" : "settlement_pending",
    entityType: "settlement",
    entityId: ipoId,
    userUid: user.uid,
    userName: user.name,
    description: `${status === "settled" ? "Marked settled" : "Reopened"} settlement: ${updatedFrom} pays ₹${updatedAmount} to ${updatedTo}`,
    portfolioId,
  });
};

export const getIpoById = async (ipoId: string): Promise<IpoRecord | null> => {
  const snapshot = await getDoc(doc(db, "ipos", ipoId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapIpoDocument(snapshot.id, snapshot.data() as Partial<IpoRecord>);
};

export const getIpos = async (): Promise<IpoRecord[]> => {
  const iposQuery = query(collection(db, "ipos"));
  const snapshot = await getDocs(iposQuery);

  const records = snapshot.docs.map((ipoDoc) =>
    mapIpoDocument(ipoDoc.id, ipoDoc.data() as Partial<IpoRecord>),
  );

  return records.sort((a, b) => {
    if (a.allotmentDate !== b.allotmentDate) {
      return b.allotmentDate.localeCompare(a.allotmentDate);
    }
    
    const timeA = a.createdAt?.toMillis() ?? 0;
    const timeB = b.createdAt?.toMillis() ?? 0;
    return timeB - timeA;
  });
};

export const filterIposForUser = (ipos: IpoRecord[], user: LedgerUser) => {
  if (user.role === "owner" || user.role === "manager") {
    return ipos;
  }

  return ipos.filter((ipo) => {
    if (ipo.portfolioId === "portfolioAlpha") {
      return user.portfolioAlpha;
    }

    if (ipo.portfolioId === "portfolioBeta") {
      return user.portfolioBeta;
    }

    return false;
  });
};
