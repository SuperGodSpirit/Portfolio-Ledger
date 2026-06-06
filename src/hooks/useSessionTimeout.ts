import { useEffect, useCallback, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const WARNING_TIME_MS = 14 * 60 * 1000; // 14 minutes
const LOGOUT_TIME_MS = 15 * 60 * 1000; // 15 minutes

export const useSessionTimeout = () => {
  const { ledgerUser, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  const forceLogout = useCallback(async () => {
    setShowWarning(false);
    await logout();
  }, [logout]);

  useEffect(() => {
    if (!ledgerUser) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setShowWarning(false);
      return;
    }

    const checkInactivity = () => {
      const now = Date.now();
      const inactiveTime = now - lastActivityRef.current;

      if (inactiveTime >= LOGOUT_TIME_MS) {
        void forceLogout();
      } else if (inactiveTime >= WARNING_TIME_MS) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    timerIntervalRef.current = setInterval(checkInactivity, 10000); // check every 10s

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handleUserActivity = () => {
      // Don't reset if they are already in warning mode, require them to click the button.
      // Or should any activity reset it? Requirement: "Activity during countdown resets timer."
      // So yes, any activity resets it even during warning.
      resetActivity();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [ledgerUser, forceLogout, resetActivity]);

  return {
    showWarning,
    resetTimer: resetActivity,
    forceLogout,
  };
};
