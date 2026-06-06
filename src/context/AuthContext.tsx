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
      if (profile && (profile.role === "owner" || profile.role === "manager")) {
        await createAuditLog({
          eventType: "user_login",
          entityType: "system",
          entityId: cred.user.uid,
          userUid: cred.user.uid,
          userName: profile.name,
          description: `User logged in (Role: ${profile.role})`,
        });
      }
    } catch (e) {
      console.error("Failed to log login event", e);
    }
  }, []);

  const logout = useCallback(async () => {
    if (ledgerUser && (ledgerUser.role === "owner" || ledgerUser.role === "manager")) {
      try {
        await createAuditLog({
          eventType: "user_logout",
          entityType: "system",
          entityId: ledgerUser.uid,
          userUid: ledgerUser.uid,
          userName: ledgerUser.name,
          description: `User logged out (Role: ${ledgerUser.role})`,
        });
      } catch (e) {
        console.error("Failed to log logout event", e);
      }
    }
    await signOut(auth);
  }, [ledgerUser]);

  const value = useMemo(
    () => ({
      firebaseUser,
      ledgerUser,
      isLoading,
      error,
      login,
      logout,
    }),
    [firebaseUser, ledgerUser, isLoading, error, login, logout],
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
