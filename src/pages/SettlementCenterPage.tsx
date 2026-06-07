import { ArrowLeft, MoveRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Spinner from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { filterIposForUser, getIpos, updateSettlementStatus } from "../services/ipoService";
import type { IpoRecord, SettlementInstruction } from "../types/ipo";
import { fixedPortfolios } from "../services/portfolioService";

type SettlementCenterPageProps = {
  basePath: "/owner" | "/manager" | "/viewer";
};

const titleByBasePath = {
  "/owner": "Owner Dashboard",
  "/manager": "Manager Dashboard",
  "/viewer": "Viewer Dashboard",
} as const;

type EnrichedSettlement = SettlementInstruction & {
  ipoId: string;
  ipoName: string;
  portfolioId: string;
};

const SettlementCenterPage = ({ basePath }: SettlementCenterPageProps) => {
  const { ledgerUser } = useAuth();
  const [ipos, setIpos] = useState<IpoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [portfolioFilter, setPortfolioFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all, pending, settled

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!ledgerUser) return;
        const allIpos = await getIpos(ledgerUser);
        const userIpos = filterIposForUser(allIpos, ledgerUser);
        setIpos(userIpos);
      } catch (err) {
        setError("Failed to load settlements.");
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, [ledgerUser]);

  const handleToggleSettlement = async (ipoId: string, instructionId: string, currentStatus: "pending" | "settled") => {
    const newStatus = currentStatus === "settled" ? "pending" : "settled";
    
    setIpos((prevIpos) => prevIpos.map((ipo) => {
      if (ipo.id !== ipoId) return ipo;
      const updatedInstructions = (ipo.calculationSnapshot.settlementInstructions || []).map(inst => {
        const matchId = inst.id || `${inst.from}-${inst.to}-${inst.amount}`;
        if (matchId === instructionId) {
          return { ...inst, status: newStatus as "pending" | "settled", settledAt: newStatus === "settled" ? new Date().toISOString() : null };
        }
        return inst;
      });
      return {
        ...ipo,
        calculationSnapshot: {
          ...ipo.calculationSnapshot,
          settlementInstructions: updatedInstructions
        }
      };
    }));

    try {
      const targetIpo = ipos.find(i => i.id === ipoId);
      if (targetIpo && ledgerUser) {
        await updateSettlementStatus(ipoId, instructionId, newStatus, ledgerUser, targetIpo.ipoName, targetIpo.portfolioId);
      }
    } catch (err) {
      console.error("Failed to update settlement status", err);
    }
  };

  const settlements = useMemo(() => {
    const all: EnrichedSettlement[] = [];
    ipos.forEach((ipo) => {
      if (ipo.status === "archived") return;
      const insts = ipo.calculationSnapshot.settlementInstructions || [];
      insts.forEach((inst) => {
        all.push({
          ...inst,
          id: inst.id || `${inst.from}-${inst.to}-${inst.amount}`,
          status: (inst.status || "pending") as "pending" | "settled",
          ipoId: ipo.id,
          ipoName: ipo.ipoName,
          portfolioId: ipo.portfolioId,
        });
      });
    });

    return all.filter((s) => {
      if (portfolioFilter !== "all" && s.portfolioId !== portfolioFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [ipos, portfolioFilter, statusFilter]);

  if (isLoading) return <Spinner label="Loading settlements" />;

  return (
    <DashboardLayout title={titleByBasePath[basePath]} subtitle="Settlement Center">
      <div className="mb-6 flex items-center justify-between">
        <Link to={basePath} className="flex items-center gap-2 text-sm text-[#8793a3] hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="mb-5 rounded border border-[#5b3232] bg-[#2a1718] px-4 py-3 text-sm text-[#ffb5b5]">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={portfolioFilter}
          onChange={(e) => setPortfolioFilter(e.target.value)}
          className="rounded border border-ledger-line bg-ledger-ink px-3 py-2 text-sm text-white focus:border-ledger-green focus:outline-none"
        >
          <option value="all">All Portfolios</option>
          {Object.values(fixedPortfolios).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-ledger-line bg-ledger-ink px-3 py-2 text-sm text-white focus:border-ledger-green focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="settled">Settled</option>
        </select>
      </div>

      <div className="space-y-4">
        {settlements.length === 0 ? (
          <div className="rounded border border-ledger-line bg-ledger-panel p-8 text-center">
            <h3 className="text-lg font-semibold text-white">No settlements found</h3>
            <p className="mt-2 text-sm text-[#8793a3]">
              Try adjusting your filters or wait for new IPO allocations.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {settlements.map((s) => (
              <li key={`${s.ipoId}-${s.id}`} className="flex flex-col md:flex-row md:items-center gap-4 rounded border border-ledger-line bg-ledger-panel p-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#8793a3] uppercase tracking-wider">{s.portfolioId === "portfolioAlpha" ? "Alpha" : "Beta"}</span>
                    <span className="text-[#4b5563]">•</span>
                    <Link to={`${basePath}/ipos/${s.ipoId}`} className="text-sm font-medium text-white hover:text-ledger-green hover:underline">
                      {s.ipoName}
                    </Link>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-white min-w-16">{s.from}</span>
                    <span className="text-[#8793a3]">pays</span>
                    <span className="font-semibold text-ledger-green">
                      {s.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                    </span>
                    <span className="text-[#8793a3]">to</span>
                    <MoveRight className="h-4 w-4 text-[#8793a3]" />
                    <span className="font-medium text-white">{s.to}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded ${
                    s.status === "settled" ? "bg-ledger-green/20 text-ledger-green" : "bg-orange-500/20 text-orange-400"
                  }`}>
                    {s.status}
                  </span>
                  
                  {basePath !== "/viewer" && (
                    <button
                      onClick={() => handleToggleSettlement(s.ipoId, s.id, s.status)}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        s.status === "settled" 
                          ? "bg-[#2a2f36] text-[#8793a3] hover:text-white" 
                          : "bg-ledger-green text-[#0a0d11] hover:bg-ledger-green/90 font-medium"
                      }`}
                    >
                      {s.status === "settled" ? "Mark Pending" : "Mark Settled"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SettlementCenterPage;
