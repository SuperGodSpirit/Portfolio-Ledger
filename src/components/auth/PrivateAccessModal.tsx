import { FormEvent, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useLoading } from "../../context/LoadingContext";
import { UserPlus } from "lucide-react";

type PrivateAccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const PrivateAccessModal = ({ isOpen, onClose }: PrivateAccessModalProps) => {
  const { register } = useAuth();
  const { withLoader } = useLoading();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setPassword("");
      setTermsAccepted(false);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("You must agree to the Terms and Conditions.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      await withLoader(() => register(name, email, password, "1.0", "1.0"));
      // Success! They are now logged in but pending.
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded border border-ledger-line bg-ledger-panel p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-ledger-green/10">
            <UserPlus className="h-5 w-5 text-ledger-green" />
          </div>
          <h2 className="text-xl font-semibold text-white">Create Account</h2>
        </div>

        <p className="mb-6 text-sm text-[#8793a3]">
          This ledger operates as a managed private system. New accounts require manual approval from an administrator.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[#c1cad6]">Full Name</span>
            <input
              className="h-10 w-full rounded border border-ledger-line bg-[#11171d] px-3 text-white outline-none transition placeholder:text-[#596574] focus:border-ledger-green"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[#c1cad6]">Email</span>
            <input
              className="h-10 w-full rounded border border-ledger-line bg-[#11171d] px-3 text-white outline-none transition placeholder:text-[#596574] focus:border-ledger-green"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[#c1cad6]">Password (Min 12 characters)</span>
            <input
              className="h-10 w-full rounded border border-ledger-line bg-[#11171d] px-3 text-white outline-none transition placeholder:text-[#596574] focus:border-ledger-green"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
            />
          </label>

          <label className="flex items-center gap-2 mt-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-ledger-line bg-[#11171d] checked:border-ledger-green checked:bg-ledger-green"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
              />
              <svg
                className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-[#11171d] opacity-0 peer-checked:opacity-100"
                viewBox="0 0 14 14"
                fill="none"
              >
                <path
                  d="M3 8L6 11L11 3.5"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  stroke="currentColor"
                />
              </svg>
            </div>
            <span className="text-sm text-[#8793a3] group-hover:text-[#c1cad6] transition">
              I agree to the <Link to="/terms" target="_blank" className="text-ledger-green hover:underline">Terms and Conditions</Link>
            </span>
          </label>

          {error && (
            <div className="rounded border border-[#5b3232] bg-[#2a1718] px-3 py-2 text-sm text-[#ffb5b5]">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 mt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="justify-center">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !termsAccepted} className="justify-center">
              Sign Up
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrivateAccessModal;
