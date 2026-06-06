import { useEffect, useState } from "react";
import Button from "../ui/Button";

type PrivateAccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const PrivateAccessModal = ({ isOpen, onClose }: PrivateAccessModalProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      setIsLoading(true);
      timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    }
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded border border-ledger-line bg-ledger-panel p-6 shadow-2xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ledger-line border-t-ledger-green mb-4"></div>
            <p className="text-sm font-medium text-[#8793a3]">Checking access...</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white mb-2">Private Access Required</h2>
            <div className="mb-6 space-y-3 text-sm text-[#8793a3]">
              <p>This ledger operates as a managed private system.</p>
              <p>Access requests are reviewed manually by portfolio administrators.</p>
              <p>Please contact a manager if access is required.</p>
            </div>
            <Button variant="secondary" onClick={onClose} className="w-full justify-center">
              Understood, I'll fuck off.
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PrivateAccessModal;
