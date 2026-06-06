import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, Timestamp, where } from "firebase/firestore";
import { db } from "../config/firebase";
import type { AuditLog } from "../types/audit";
import type { LedgerUser } from "../types/user";

export const createAuditLog = async (
  log: Omit<AuditLog, "id" | "timestamp">
) => {
  try {
    await addDoc(collection(db, "audit_logs"), {
      ...log,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to create audit log", error);
  }
};

export const getAuditLogs = async (user: LedgerUser): Promise<AuditLog[]> => {
  const auditQuery = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(auditQuery);

  const logs = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      eventType: data.eventType,
      entityType: data.entityType,
      entityId: data.entityId,
      userUid: data.userUid,
      userName: data.userName,
      description: data.description,
      portfolioId: data.portfolioId,
      timestamp: data.timestamp ? (data.timestamp as Timestamp).toDate().toISOString() : new Date().toISOString(),
    } as AuditLog;
  });

  if (user.role === "owner" || user.role === "manager") {
    return logs;
  }

  // Viewers can only see logs for their allowed portfolios, or their own system/login logs
  return logs.filter(log => {
    if (log.entityType === "system" && log.userUid === user.uid) return true;
    if (log.portfolioId === "portfolioAlpha") return user.portfolioAlpha;
    if (log.portfolioId === "portfolioBeta") return user.portfolioBeta;
    return false;
  });
};

export const getAuditLogsForIpo = async (ipoId: string, user: LedgerUser): Promise<AuditLog[]> => {
  const allLogs = await getAuditLogs(user);
  return allLogs.filter(log => log.entityId === ipoId);
};
