import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth } from "../config/firebase";
import { getLedgerUser } from "../services/userService";
import type { LedgerUser } from "../types/user";
import { createAuditLog } from "../services/auditService";

type AuthContextValue = {
  firebaseUser: User | null;
  ledgerUser: LedgerUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [ledgerUser, setLedgerUser] = useState<LedgerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      setError(null);
      setFirebaseUser(currentUser);

      if (!currentUser) {
        setLedgerUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await getLedgerUser(currentUser.uid);
        setLedgerUser(profile);

        // Auto-sync push notification token if permissions are already granted
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          import("../services/notificationService").then(({ requestNotificationPermission }) => {
            requestNotificationPermission(currentUser.uid).catch(e => console.warn("Failed to background sync push token", e));
          });
        }
      } catch (profileError) {
        setLedgerUser(null);
        setError(
          profileError instanceof Error
            ? profileError.message
            : "Unable to load user profile.",
        );
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    try {
      const profile = await getLedgerUser(cred.user.uid);
      if (profile && (profile.status === "active" || (profile as any).active === true)) {
        createAuditLog({
          eventType: "user_login",
          entityType: "system",
          entityId: cred.user.uid,
          userUid: cred.user.uid,
          userName: profile.name,
          description: `User logged in (Role: ${profile.role})`,
        }).catch(e => console.error("Failed to log login event", e));
      }
    } catch (e) {
      console.error("Failed to fetch profile during login", e);
    }
  }, []);

  const logout = useCallback(async () => {
    if (ledgerUser && (ledgerUser.status === "active" || (ledgerUser as any).active === true)) {
      createAuditLog({
        eventType: "user_logout",
        entityType: "system",
        entityId: ledgerUser.uid,
        userUid: ledgerUser.uid,
        userName: ledgerUser.name,
        description: `User logged out (Role: ${ledgerUser.role})`,
      }).catch(e => console.error("Failed to log logout event", e));
    }
    await signOut(auth);
  }, [ledgerUser]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    try {
      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("../config/firebase");

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        role: "viewer",
        status: "pending",
        portfolios: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // We don't automatically log them into a dashboard yet since status is pending, 
      // but onAuthStateChanged will pick up the user.
    } catch (e: any) {
      console.error("Registration failed", e);
      throw new Error(e.message || "Registration failed");
    }
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      ledgerUser,
      isLoading,
      error,
      login,
      logout,
      register,
    }),
    [firebaseUser, ledgerUser, isLoading, error, login, logout, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
};
