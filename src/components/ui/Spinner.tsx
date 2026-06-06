import { Loader2 } from "lucide-react";

type SpinnerProps = {
  label?: string;
};

const Spinner = ({ label = "Loading" }: SpinnerProps) => (
  <div className="flex min-h-screen items-center justify-center bg-ledger-ink text-ledger-steel">
    <div className="flex items-center gap-3 rounded border border-ledger-line bg-ledger-panel px-5 py-4 shadow-ledger">
      <Loader2 className="h-5 w-5 animate-spin text-ledger-green" aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  </div>
);

export default Spinner;
