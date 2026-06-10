import { FormEvent, useState } from "react";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { UserPlus } from "lucide-react";

type PrivateAccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const PrivateAccessModal = ({ isOpen, onClose }: PrivateAccessModalProps) => {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await register(name, email, password);
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
            <span className="mb-1 block text-sm font-medium text-[#c1cad6]">Password</span>
            <input
              className="h-10 w-full rounded border border-ledger-line bg-[#11171d] px-3 text-white outline-none transition placeholder:text-[#596574] focus:border-ledger-green"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>

          {error && (
            <div className="rounded border border-[#5b3232] bg-[#2a1718] px-3 py-2 text-sm text-[#ffb5b5]">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 mt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="justify-center">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="justify-center">
              {isSubmitting ? "Creating..." : "Sign Up"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrivateAccessModal;
