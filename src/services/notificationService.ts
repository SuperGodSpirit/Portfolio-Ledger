import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { db, messaging } from "../config/firebase";
import type { NotificationPreferences } from "../types/user";

export const requestNotificationPermission = async (userId: string) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const msg = await messaging();
      if (msg) {
        const token = await getToken(msg, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });
        
        if (token) {
          // Add token to user doc
          const userRef = doc(db, "users", userId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            await updateDoc(userRef, {
              notificationTokens: arrayUnion(token),
              // Initialize default preferences if not exists
              notifications: userDoc.data()?.notifications || {
                enabled: true,
                ipoAlerts: true,
                settlementAlerts: true,
                adminAlerts: true,
              }
            });
            return true;
          }
        }
      }
    }
    return false;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

export const updateNotificationPreferences = async (
  userId: string,
  preferences: NotificationPreferences
) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      notifications: preferences,
    });
    return true;
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return false;
  }
};

export const setupForegroundMessageListener = async (callback: (payload: any) => void) => {
  const msg = await messaging();
  if (msg) {
    return onMessage(msg, (payload) => {
      callback(payload);
    });
  }
  return () => {};
};
