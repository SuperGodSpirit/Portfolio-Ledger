import { X } from "lucide-react";
import type { ReactNode } from "react";
import Button from "./Button";

type ModalProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

const Modal = ({ title, isOpen, onClose, children }: ModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-md rounded border border-ledger-line bg-ledger-panel p-6 shadow-ledger">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-lg font-semibold text-white">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            className="min-h-9 w-9 px-0"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
