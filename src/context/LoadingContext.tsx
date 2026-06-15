import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Loader2 } from "lucide-react";

type LoadingContextType = {
  isLoading: boolean;
  loadingMessage: string | null;
  withLoader: <T>(asyncAction: () => Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const withLoader = useCallback(async <T,>(asyncAction: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setLoadingMessage(null);

    // Set a timeout to show the funny message if it takes longer than 5 seconds
    const timeoutId = setTimeout(() => {
      setLoadingMessage("Looks like your internet is fucked");
    }, 5000);

    try {
      return await asyncAction();
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      setLoadingMessage(null);
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, withLoader }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-ledger-green mb-4" />
          {loadingMessage && (
            <p className="text-xl font-semibold text-white animate-pulse">
              {loadingMessage}
            </p>
          )}
        </div>
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};
