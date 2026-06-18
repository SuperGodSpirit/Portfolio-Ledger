import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import type { NotificationHistoryItem } from "../types/notification";

export const useInAppNotifications = (maxLimit = 50) => {
  const { ledgerUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [localLastReadStr, setLocalLastReadStr] = useState<string | null | undefined>(ledgerUser?.lastReadNotificationAt);

  useEffect(() => {
    if (!ledgerUser) return;
    setLocalLastReadStr(ledgerUser.lastReadNotificationAt);

    const unsubscribeUser = onSnapshot(doc(db, "users", ledgerUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.lastReadNotificationAt) {
          setLocalLastReadStr(data.lastReadNotificationAt);
        }
      }
    });

    return () => unsubscribeUser();
  }, [ledgerUser]);

  useEffect(() => {
    if (!ledgerUser) return;

    const q = query(
      collection(db, "notifications"),
      orderBy("sentAt", "desc"),
      limit(maxLimit)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationHistoryItem[];

      // Filter based on user profile
      const userRole = (ledgerUser.role || "").toLowerCase();
      const userPortfolios = ledgerUser.portfolios || [];
      const userUid = ledgerUser.uid;

      const relevantNotifs = allNotifs.filter(notif => {
        // Exclude based on global setting
        if (ledgerUser.notifications?.enabled === false) return false;
        
        // Exclude based on category setting
        if (notif.category && ledgerUser.notifications?.[notif.category] === false) return false;

        if (notif.targetType === "broadcast") return true;
        
        if (notif.targetType === "role" && Array.isArray(notif.targets)) {
          return notif.targets.map(t => String(t).toLowerCase()).includes(userRole);
        }

        if (notif.targetType === "portfolio" && Array.isArray(notif.targets)) {
          return notif.targets.some(t => userPortfolios.includes(t));
        }

        if (notif.targetType === "users" && Array.isArray(notif.targets)) {
          return notif.targets.includes(userUid);
        }

        return false;
      });

      setNotifications(relevantNotifs);
    });

    return () => unsubscribe();
  }, [ledgerUser, maxLimit]);

  const unreadCount = (() => {
    if (!localLastReadStr) return notifications.length;
    const lastReadTime = new Date(localLastReadStr).getTime();
    return notifications.filter(n => n.sentAt && n.sentAt.toDate().getTime() > lastReadTime).length;
  })();

  const markAllAsRead = async () => {
    if (!ledgerUser || notifications.length === 0) return;
    
    // Find the latest valid sentAt timestamp
    const latestNotif = notifications.find(n => n.sentAt);
    if (!latestNotif) return;

    const latestIso = latestNotif.sentAt.toDate().toISOString();
    
    // Optimistic UI Update
    setLocalLastReadStr(latestIso);

    try {
      await updateDoc(doc(db, "users", ledgerUser.uid), {
        lastReadNotificationAt: latestIso
      });
    } catch (e) {
      console.error("Failed to mark notifications as read", e);
    }
  };

  return { notifications, unreadCount, markAllAsRead, localLastReadStr };
};
