import { useEffect, useState } from "react";
import Button from "./Button";

type SessionTimeoutModalProps = {
  isOpen: boolean;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
};

const SessionTimeoutModal = ({ isOpen, onStayLoggedIn, onLogoutNow }: SessionTimeoutModalProps) => {
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      setCountdown(60); // Reset to 60 whenever opened
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded border border-ledger-line bg-ledger-panel p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-2">Session Expiring</h2>
        <p className="mb-6 text-sm text-[#8793a3]">
          You have been inactive and will be signed out in <strong className="text-ledger-green">{countdown} seconds</strong>.
        </p>

        <div className="flex flex-col gap-3">
          <Button variant="primary" onClick={onStayLoggedIn} className="w-full justify-center">
            Stay Logged In
          </Button>
          <Button variant="secondary" onClick={onLogoutNow} className="w-full justify-center">
            Logout Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutModal;
