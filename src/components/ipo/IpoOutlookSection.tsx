import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import type { IpoOutlook } from "../../types/ipo-outlook";
import { Loader2, AlertTriangle, Info } from "lucide-react";

type IpoOutlookSectionProps = {
  ipoId: string;
};

const IpoOutlookSection = ({ ipoId }: IpoOutlookSectionProps) => {
  const [outlook, setOutlook] = useState<IpoOutlook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOutlook = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "ipoOutlooks", ipoId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setOutlook(docSnap.data() as IpoOutlook);
        } else {
          setOutlook(null);
        }
      } catch (err) {
        console.error("Failed to fetch IPO outlook:", err);
        setError("Failed to load outlook data");
      } finally {
        setLoading(false);
      }
    };

    fetchOutlook();
  }, [ipoId]);

  if (loading) {
    return (
      <div className="flex justify-center p-6 border border-ledger-line rounded bg-ledger-panel">
        <Loader2 className="h-5 w-5 animate-spin text-ledger-primary" />
      </div>
    );
  }

  if (error || !outlook || outlook.status !== 'completed') {
    return null; // Don't show anything if no outlook is available
  }

  const isDataMissing = (
    outlook.inputSnapshot?.peRatio === null ||
    outlook.inputSnapshot?.ronw === null ||
    outlook.inputSnapshot?.revenueGrowth === null ||
    outlook.inputSnapshot?.profitGrowth === null
  );

  return (
    <div className="mt-6 border border-ledger-line rounded bg-ledger-panel overflow-hidden">
      <div className="bg-gradient-to-r from-ledger-primary/20 to-transparent p-4 border-b border-ledger-line flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Info className="h-4 w-4 text-ledger-primary" />
          AI Outlook
        </h3>
        <div className="text-right">
          <span className="block text-xs text-ledger-muted">Outlook Confidence</span>
          <span className={`font-bold ${outlook.confidenceScore > 70 ? 'text-ledger-green' : outlook.confidenceScore < 40 ? 'text-red-400' : 'text-yellow-400'}`}>
            {outlook.confidenceScore} / 100
          </span>
        </div>
      </div>
      
      <div className="p-4 space-y-5">
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-ledger-muted uppercase tracking-wider">Estimated Listing Gain</span>
            <div className="group relative">
              <Info className="h-3.5 w-3.5 text-ledger-muted/70 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-ledger-panel border border-ledger-line rounded text-[10px] text-ledger-muted opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center shadow-xl">
                Expected listing day profit/loss relative to the issue price.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "Bear Case", data: outlook.bearCase, color: "text-red-400" },
              { title: "Base Case", data: outlook.baseCase, color: "text-ledger-muted" },
              { title: "GMP Case", data: outlook.gmpCase, color: "text-ledger-primary" },
              { title: "Bull Case", data: outlook.bullCase, color: "text-ledger-green" }
            ].map(({ title, data, color }) => (
              <div key={title} className="bg-ledger-bg p-3 rounded border border-ledger-line relative overflow-hidden group hover:border-ledger-line/80 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className={`block text-xs ${color} whitespace-nowrap`}>{title}</span>
                  {data.probability !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-semibold ${
                      typeof data.probability === 'number' 
                        ? data.probability >= 50 ? 'bg-ledger-green/10 border border-ledger-green/20 text-ledger-green' 
                        : data.probability >= 20 ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400' 
                        : 'bg-red-400/10 border border-red-400/20 text-red-400'
                        : data.probability === 'High' ? 'bg-ledger-green/10 border border-ledger-green/20 text-ledger-green' 
                        : data.probability === 'Moderate' ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400' 
                        : 'bg-red-400/10 border border-red-400/20 text-red-400'
                    }`}>
                      {typeof data.probability === 'number' ? `${data.probability}% Chance` : `${data.probability} Chance`}
                    </span>
                  )}
                </div>
                <span className="font-mono text-sm text-white whitespace-nowrap">
                  {data.min}% to {data.max}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-ledger-muted mb-1 uppercase tracking-wider">Rationale</h4>
          <p className="text-sm text-ledger-text leading-relaxed">
            {outlook.rationale}
          </p>
        </div>

        {isDataMissing && (
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Limited financial data available for this IPO. Outlook confidence may be reduced.</p>
          </div>
        )}

        {outlook.actualListingGain !== null && outlook.modelAccuracyScore !== null && (
          <div className="grid grid-cols-2 gap-4 bg-ledger-bg p-3 rounded border border-ledger-line">
            <div>
              <span className="block text-xs text-ledger-muted">Actual Listing Gain</span>
              <span className="font-medium text-white">{outlook.actualListingGain}%</span>
            </div>
            <div>
              <span className="block text-xs text-ledger-muted">Model Accuracy Score</span>
              <span className="font-medium text-white">{outlook.modelAccuracyScore} / 100</span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-ledger-line border-dashed space-y-2">
          <p className="text-[10px] text-ledger-muted leading-tight">
            <strong>Disclaimer:</strong> This is an AI-generated outlook for informational purposes only. It DOES NOT represent investment advice, ratings, or guaranteed outcomes. Market conditions fluctuate rapidly.
          </p>
          <p className="text-[10px] text-ledger-muted/50 text-right">
            Generated by {outlook.modelProvider} {outlook.modelVersion} | Prompt Version: {outlook.promptVersion}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IpoOutlookSection;
