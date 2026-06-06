import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SettlementPreview from "../components/ipo/SettlementPreview";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { getIpoById, updateSettlementStatus } from "../services/ipoService";
import type { IpoRecord } from "../types/ipo";
import { calculateIpoSettlement } from "../utils/calculationEngine";
import { fixedPortfolios } from "../services/portfolioService";
import { getAuditLogsForIpo } from "../services/auditService";
import type { AuditLog } from "../types/audit";

type IpoDetailViewPageProps = {
  basePath: "/owner" | "/manager" | "/viewer";
};

const titleByBasePath = {
  "/owner": "Owner Dashboard",
  "/manager": "Manager Dashboard",
  "/viewer": "Viewer Dashboard",
} as const;

const IpoDetailViewPage = ({ basePath }: IpoDetailViewPageProps) => {
  const { ledgerUser } = useAuth();
  const { ipoId } = useParams<{ ipoId: string }>();
  const [ipo, setIpo] = useState<IpoRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!ipoId) return;
      try {
        const data = await getIpoById(ipoId);
        setIpo(data);
        if (ledgerUser) {
          const logs = await getAuditLogsForIpo(ipoId, ledgerUser);
          setAuditLogs(logs);
        }
      } catch (err) {
        setError("Unable to load IPO details.");
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, [ipoId, ledgerUser]);

  const handleToggleSettlement = async (instructionId: string, currentStatus: "pending" | "settled") => {
    if (!ipo) return;
    const newStatus = currentStatus === "settled" ? "pending" : "settled";
    
    setIpo((prev) => {
      if (!prev) return prev;
      const updatedInstructions = (prev.calculationSnapshot.settlementInstructions || []).map(inst => {
        const matchId = inst.id || `${inst.from}-${inst.to}-${inst.amount}`;
        if (matchId === instructionId) {
          return { ...inst, status: newStatus as "pending" | "settled", settledAt: newStatus === "settled" ? new Date().toISOString() : null };
        }
        return inst;
      });
      return {
        ...prev,
        calculationSnapshot: {
          ...prev.calculationSnapshot,
          settlementInstructions: updatedInstructions
        }
      };
    });

    try {
      if (ledgerUser) {
        await updateSettlementStatus(ipo.id, instructionId, newStatus, ledgerUser, ipo.ipoName, ipo.portfolioId);
      }
    } catch (err) {
      console.error("Failed to update settlement status", err);
    }
  };

  const isLegacy = ipo?.lotValue === null || ipo?.lotValue === undefined;

  const snapshotToDisplay = useMemo(() => {
    if (!ipo) return null;
    if (ipo.calculationSnapshot) return ipo.calculationSnapshot;
    
    // Fallback for older IPOs that don't have a snapshot
    const portfolio = Object.values(fixedPortfolios).find((p) => p.id === ipo.portfolioId);
    if (!portfolio) return null;
    
    return calculateIpoSettlement(ipo.memberEntries, portfolio.members);
  }, [ipo]);

  if (isLoading) return <Spinner label="Loading details" />;

  if (error || !ipo) {
    return (
      <DashboardLayout title={titleByBasePath[basePath]} subtitle="IPO Details">
        <div className="mb-5 rounded border border-[#5b3232] bg-[#2a1718] px-4 py-3 text-sm text-[#ffb5b5]">
          {error || "IPO not found."}
        </div>
        <Link to={`${basePath}/ipos`}>
          <Button variant="secondary" type="button">Go Back</Button>
        </Link>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={titleByBasePath[basePath]} subtitle="IPO Details">
      <div className="mb-6 flex items-center justify-between">
        <Link to={`${basePath}/ipos`} className="flex items-center gap-2 text-sm text-[#8793a3] hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Link>
        <span className={`rounded border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
          ipo.status === "active" ? "border-ledger-green/40 text-ledger-green" : "border-ledger-line text-[#9aa6b5]"
        }`}>
          {ipo.status === "active" ? "Active" : "Archived"}
        </span>
      </div>

      <div className="space-y-6">
        <section className="rounded border border-ledger-line bg-ledger-panel p-5">
          <h3 className="mb-4 text-base font-semibold text-white">IPO Information</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-[#8793a3]">IPO Name</p>
              <p className="mt-1 font-medium text-white">{ipo.ipoName}</p>
            </div>
            <div>
              <p className="text-xs text-[#8793a3]">Portfolio</p>
              <p className="mt-1 font-medium text-white">{ipo.portfolioName}</p>
            </div>
            <div>
              <p className="text-xs text-[#8793a3]">Allotment Date</p>
              <p className="mt-1 font-medium text-white">{ipo.allotmentDate}</p>
            </div>
            <div>
              <p className="text-xs text-[#8793a3]">Lot Value</p>
              <p className="mt-1 font-medium text-white">
                {isLegacy ? (
                  <span className="text-[#8793a3] italic">Legacy Direct Values</span>
                ) : (
                  (Number(ipo.lotValue) || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded border border-ledger-line bg-ledger-panel p-5">
          <h3 className="mb-4 text-base font-semibold text-white">Member Entries</h3>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm text-left">
              <thead>
                <tr className="border-b border-ledger-line bg-[#151a20] text-xs uppercase tracking-[0.16em] text-[#8793a3]">
                  <th className="px-4 py-3 font-semibold">Member</th>
                  {!isLegacy && <th className="px-4 py-3 font-semibold text-right">Applied Lots</th>}
                  {!isLegacy && <th className="px-4 py-3 font-semibold text-right">Allotted Lots</th>}
                  <th className="px-4 py-3 font-semibold text-right">Applied Value</th>
                  <th className="px-4 py-3 font-semibold text-right">Allotted Value</th>
                  <th className="px-4 py-3 font-semibold text-right">Bank Credit</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(ipo.memberEntries || {}).map((entry) => {
                  if (!entry) return null;
                  return (
                    <tr key={entry.memberCode} className="border-b border-ledger-line last:border-0">
                      <td className="px-4 py-3 font-medium text-white">{entry.memberName}</td>
                      {!isLegacy && <td className="px-4 py-3 text-right text-[#9aa6b5]">{entry.appliedLots ?? 0}</td>}
                      {!isLegacy && <td className="px-4 py-3 text-right text-[#9aa6b5]">{entry.allottedLots ?? 0}</td>}
                      <td className="px-4 py-3 text-right text-[#9aa6b5]">
                        {(entry.appliedAmount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-[#9aa6b5]">
                        {(entry.allottedAmount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        {(entry.finalBankCredit || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden flex flex-col gap-4">
            {Object.values(ipo.memberEntries || {}).map((entry) => {
              if (!entry) return null;
              return (
                <div key={entry.memberCode} className="rounded border border-ledger-line p-4 bg-[#151a20]/30">
                  <div className="font-semibold text-white mb-3 pb-2 border-b border-ledger-line/50">{entry.memberName}</div>
                  
                  {!isLegacy && (
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-[#8793a3] uppercase tracking-wider mb-1">Applied Lots</div>
                        <div className="text-sm text-[#9aa6b5]">{entry.appliedLots ?? 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#8793a3] uppercase tracking-wider mb-1">Allotted Lots</div>
                        <div className="text-sm text-[#9aa6b5]">{entry.allottedLots ?? 0}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-[#8793a3] uppercase tracking-wider mb-1">Applied Value</div>
                      <div className="text-sm text-[#9aa6b5]">
                        {(entry.appliedAmount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#8793a3] uppercase tracking-wider mb-1">Allotted Value</div>
                      <div className="text-sm text-[#9aa6b5]">
                        {(entry.allottedAmount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-ledger-line/50">
                    <div className="text-xs text-[#8793a3] uppercase tracking-wider mb-1">Bank Credit</div>
                    <div className="text-sm font-semibold text-white">
                      {(entry.finalBankCredit || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {snapshotToDisplay && (
          <SettlementPreview 
            snapshot={snapshotToDisplay} 
            onToggleSettlement={basePath !== "/viewer" ? handleToggleSettlement : undefined} 
          />
        )}

        <section className="rounded border border-ledger-line bg-ledger-panel p-5">
          <h3 className="mb-4 text-base font-semibold text-white">Recent Activity</h3>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-[#8793a3]">No audit history found.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {auditLogs.map((log) => {
                const date = new Date(log.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
                return (
                  <div key={log.id} className="flex flex-col gap-1 border-l-2 border-ledger-line pl-4 py-1">
                    <span className="text-xs font-medium text-[#8793a3]">{date}</span>
                    <span className="text-sm text-white">
                      {log.description} by <span className="font-medium text-ledger-green">{log.userName}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default IpoDetailViewPage;
