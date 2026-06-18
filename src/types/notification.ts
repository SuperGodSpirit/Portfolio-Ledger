import type { Timestamp } from "firebase/firestore";

export type TargetType = "users" | "role" | "portfolio" | "broadcast";
export type NotificationCategory = "ipoAlerts" | "settlementAlerts" | "adminAlerts";

export interface NotificationHistoryItem {
  id?: string;
  title: string;
  body: string;
  sentByUid: string;
  sentByName: string;
  sentAt: Timestamp;
  targetType: TargetType;
  targets?: string[] | null;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  category: NotificationCategory;
  status: "success" | "partial" | "failed";
}
