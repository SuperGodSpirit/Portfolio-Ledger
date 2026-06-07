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
  const mapDoc = (doc: any) => {
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
  };

  if (user.role === "owner" || user.role === "manager") {
    const auditQuery = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(auditQuery);
    return snapshot.docs.map(mapDoc);
  }

  const allowedPortfolios: string[] = [];
  if (user.portfolioAlpha) allowedPortfolios.push("portfolioAlpha");
  if (user.portfolioBeta) allowedPortfolios.push("portfolioBeta");

  const logs: AuditLog[] = [];

  if (allowedPortfolios.length > 0) {
    const portQuery = query(collection(db, "audit_logs"), where("portfolioId", "in", allowedPortfolios));
    const portSnap = await getDocs(portQuery);
    logs.push(...portSnap.docs.map(mapDoc));
  }

  const sysQuery = query(collection(db, "audit_logs"), where("userUid", "==", user.uid), where("entityType", "==", "system"));
  const sysSnap = await getDocs(sysQuery);
  const sysLogs = sysSnap.docs.map(mapDoc);
  logs.push(...sysLogs);

  const uniqueMap = new Map<string, AuditLog>();
  logs.forEach(l => uniqueMap.set(l.id, l));
  const uniqueLogs = Array.from(uniqueMap.values());

  return uniqueLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const getAuditLogsForIpo = async (ipoId: string, user: LedgerUser): Promise<AuditLog[]> => {
  const allLogs = await getAuditLogs(user);
  return allLogs.filter(log => log.entityId === ipoId);
};
