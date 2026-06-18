import { auth } from "../config/firebase";

export type TargetType = "users" | "role" | "portfolio" | "broadcast";
export type NotificationCategory = "ipoAlerts" | "settlementAlerts" | "adminAlerts";

export interface SendNotificationPayload {
  title: string;
  body: string;
  targetType: TargetType;
  targets?: string[];
  notificationCategory?: NotificationCategory;
}

const dispatchCache = new Map<string, number>();

const dispatchNotification = async (payload: SendNotificationPayload) => {
  // Simple Debounce: Prevent identical notifications from being sent within 5 seconds
  const cacheKey = JSON.stringify(payload);
  const lastSent = dispatchCache.get(cacheKey);
  const now = Date.now();
  if (lastSent && now - lastSent < 5000) {
    console.warn("Notification debounced to prevent duplicate sending.");
    return { success: true, debounced: true };
  }
  dispatchCache.set(cacheKey, now);

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to send notifications.");
  }

  const token = await currentUser.getIdToken();

  const response = await fetch("/.netlify/functions/sendNotification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to send notification.");
  }

  if (data.diagnostics) {
    console.log("=== Notification Diagnostics ===");
    console.table(data.diagnostics);
  }

  return data;
};

export const notificationSender = {
  sendBroadcast: async (title: string, body: string, category: NotificationCategory = "adminAlerts") => {
    return dispatchNotification({
      title,
      body,
      targetType: "broadcast",
      notificationCategory: category,
    });
  },

  sendToRole: async (roles: string[], title: string, body: string, category: NotificationCategory = "adminAlerts") => {
    return dispatchNotification({
      title,
      body,
      targetType: "role",
      targets: roles,
      notificationCategory: category,
    });
  },

  sendToPortfolio: async (portfolios: string[], title: string, body: string, category: NotificationCategory = "adminAlerts") => {
    return dispatchNotification({
      title,
      body,
      targetType: "portfolio",
      targets: portfolios,
      notificationCategory: category,
    });
  },

  sendToUsers: async (userIds: string[], title: string, body: string, category: NotificationCategory = "adminAlerts") => {
    return dispatchNotification({
      title,
      body,
      targetType: "users",
      targets: userIds,
      notificationCategory: category,
    });
  },
};
