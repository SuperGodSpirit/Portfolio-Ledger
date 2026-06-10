import { KeyRound, LogIn, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PrivateAccessModal from "../components/auth/PrivateAccessModal";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../layouts/AuthLayout";

const LoginPage = () => {
  const { firebaseUser, ledgerUser, isLoading, error, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  if (!isLoading && firebaseUser && ledgerUser?.active) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch {
      setFormError("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-9">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded border border-ledger-line bg-ledger-panel">
          <KeyRound className="h-5 w-5 text-ledger-green" aria-hidden="true" />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-ledger-green">
          Authorized access
        </p>
        <h1 className="text-3xl font-semibold text-white">Sign in</h1>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#c1cad6]">Email</span>
          <input
            className="h-12 w-full rounded border border-ledger-line bg-[#11171d] px-4 text-white outline-none transition placeholder:text-[#596574] focus:border-ledger-green"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#c1cad6]">Password</span>
          <input
            className="h-12 w-full rounded border border-ledger-line bg-[#11171d] px-4 text-white outline-none transition placeholder:text-[#596574] focus:border-ledger-green"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {formError ? (
          <div className="rounded border border-[#5b3232] bg-[#2a1718] px-4 py-3 text-sm text-[#ffb5b5]">
            {formError}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="submit" disabled={isSubmitting || isLoading}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Signing in" : "Login"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setIsModalOpen(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Create Account
          </Button>
        </div>
      </form>

      <div className="mt-12 pt-6 border-t border-ledger-line text-center">
        <p className="text-xs text-[#8793a3] font-medium tracking-wide mb-3">Version {__APP_VERSION__}</p>
        <div className="flex items-center justify-center gap-3 text-xs text-[#9aa6b5] mb-3">
          <Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-white transition">Terms & Conditions</Link>
        </div>
        <p className="text-xs text-[#596574]">© 2026 Portfolio Ledger</p>
      </div>

      <PrivateAccessModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </AuthLayout>
  );
};

export default LoginPage;
