import { FileClock, Plus, ShieldCheck, Users, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ensureFixedPortfolios } from "../../services/portfolioService";
import { getIpos, filterIposForUser } from "../../services/ipoService";
import { useAuth } from "../../context/AuthContext";
import type { IpoRecord } from "../../types/ipo";
import Button from "../ui/Button";
import PortfolioAccessPanel from "./PortfolioAccessPanel";

type DashboardShellProps = {
  mode: "owner" | "manager" | "viewer";
  basePath: "/owner" | "/manager" | "/viewer";
  readOnly?: boolean;
};

const DashboardShell = ({ basePath, readOnly = false }: DashboardShellProps) => {
  const { ledgerUser } = useAuth();
  const [ipos, setIpos] = useState<IpoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!readOnly) {
      void ensureFixedPortfolios();
    }
    
    const fetchDashboardData = async () => {
      try {
        if (!ledgerUser) return;
        const allIpos = await getIpos(ledgerUser);
        if (ledgerUser) {
           setIpos(filterIposForUser(allIpos, ledgerUser));
        }
      } catch (error) {
        console.error("Failed to fetch IPOs for dashboard", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    void fetchDashboardData();
  }, [readOnly, ledgerUser]);

  const metrics = useMemo(() => {
    const activeIpos = ipos.filter((ipo) => ipo.status === "active");

    let totalProfitLoss = 0;
    let portfolioAlphaProfit = 0;
    let portfolioBetaProfit = 0;
    let portfolioAlphaCount = 0;
    let portfolioBetaCount = 0;
    let userShareAlpha = 0;
    let userShareBeta = 0;

    let bestIpo: { name: string; pl: number } | null = null;
    let worstIpo: { name: string; pl: number } | null = null;

    let alphaProfitableCount = 0;
    let alphaAllottedCount = 0;
    
    let betaProfitableCount = 0;
    let betaAllottedCount = 0;

    let pendingReceivable = 0;
    let pendingPayable = 0;
    
    const memberPerformance: Record<string, { alpha: number; beta: number; total: number }> = {};
    const monthlyPerformance: Record<string, { month: string; alpha: number; beta: number; userShare: number; timestamp: number }> = {};

    activeIpos.forEach((ipo) => {
      const snap = ipo.calculationSnapshot;
      if (!snap) return;

      const pl = snap.totalProfitLoss;
      totalProfitLoss += pl;

      if (bestIpo === null || pl > bestIpo.pl) bestIpo = { name: ipo.ipoName, pl };
      if (worstIpo === null || pl < worstIpo.pl) worstIpo = { name: ipo.ipoName, pl };

      const isAllotted = Object.values(ipo.memberEntries).some(
        (m) => (m.allottedLots ?? 0) > 0 || m.allottedAmount > 0
      );

      if (ipo.portfolioId === "portfolioAlpha") {
        portfolioAlphaProfit += pl;
        portfolioAlphaCount += 1;
        if (pl > 0) alphaProfitableCount++;
        if (isAllotted) alphaAllottedCount++;
      } else if (ipo.portfolioId === "portfolioBeta") {
        portfolioBetaProfit += pl;
        portfolioBetaCount += 1;
        if (pl > 0) betaProfitableCount++;
        if (isAllotted) betaAllottedCount++;
      }

      const userEntitlement = (snap.memberEntitlements || []).find(
        (e) => e.memberName === ledgerUser?.name,
      );
      if (userEntitlement) {
        if (ipo.portfolioId === "portfolioAlpha") {
          userShareAlpha += userEntitlement.entitled;
        } else if (ipo.portfolioId === "portfolioBeta") {
          userShareBeta += userEntitlement.entitled;
        }
      }

      // Settlement
      (snap.settlementInstructions || []).forEach((inst) => {
        if (inst.status === "pending" || !inst.status) { // Default legacy to pending
          if (inst.from === ledgerUser?.name) pendingPayable += inst.amount;
          if (inst.to === ledgerUser?.name) pendingReceivable += inst.amount;
        }
      });

      // Member Performance
      (snap.memberEntitlements || []).forEach(e => {
        if (!memberPerformance[e.memberName]) {
          memberPerformance[e.memberName] = { alpha: 0, beta: 0, total: 0 };
        }
        if (ipo.portfolioId === "portfolioAlpha") memberPerformance[e.memberName].alpha += e.entitled;
        if (ipo.portfolioId === "portfolioBeta") memberPerformance[e.memberName].beta += e.entitled;
        memberPerformance[e.memberName].total += e.entitled;
      });

      // Monthly Timeline
      if (ipo.allotmentDate) {
        const dateParts = ipo.allotmentDate.split("-");
        if (dateParts.length === 3) {
          const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          if (!isNaN(date.getTime())) {
            const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
            if (!monthlyPerformance[monthKey]) {
              monthlyPerformance[monthKey] = { month: monthKey, alpha: 0, beta: 0, userShare: 0, timestamp: date.getTime() };
            }
            if (ipo.portfolioId === "portfolioAlpha") monthlyPerformance[monthKey].alpha += pl;
            if (ipo.portfolioId === "portfolioBeta") monthlyPerformance[monthKey].beta += pl;
            if (userEntitlement) {
              monthlyPerformance[monthKey].userShare += userEntitlement.entitled;
            }
          }
        }
      }
    });

    const userShareTotal = userShareAlpha + userShareBeta;
    const recentIposList = activeIpos.slice(0, 5);
    
    const monthlyTimeline = Object.values(monthlyPerformance).sort((a, b) => b.timestamp - a.timestamp);
    const memberLeaderboard = Object.entries(memberPerformance).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.total - a.total);

    return {
      totalProfitLoss,
      portfolioAlphaProfit,
      portfolioBetaProfit,
      portfolioAlphaCount,
      portfolioBetaCount,
      totalCount: activeIpos.length,
      userShareAlpha,
      userShareBeta,
      userShareTotal,
      recentIposList,
      bestIpo,
      worstIpo,
      alphaProfitableCount,
      alphaAllottedCount,
      betaProfitableCount,
      betaAllottedCount,
      totalProfitableCount: alphaProfitableCount + betaProfitableCount,
      totalAllottedCount: alphaAllottedCount + betaAllottedCount,
      pendingReceivable,
      pendingPayable,
      netSettlementPosition: pendingReceivable - pendingPayable,
      monthlyTimeline,
      memberLeaderboard,
    };
  }, [ipos, ledgerUser]);

  const mode = ledgerUser?.role ?? "viewer";

  const formatPL = (amount: number) => {
    const isPositive = amount > 0;
    const isNegative = amount < 0;
    const formatted = Math.abs(amount).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  
    if (isPositive) return `+${formatted}`;
    if (isNegative) return `-${formatted}`;
    return formatted;
  };

  const getPLColorClass = (pl: number, applyGradient = false) => {
    if (pl > 0) {
      return applyGradient ? "bg-gradient-to-r from-ledger-green to-emerald-400 bg-clip-text text-transparent" : "text-ledger-green";
    }
    if (pl < 0) return "text-ledger-red";
    return "text-white";
  };

  const glassPanelClass = "rounded-xl border border-white/5 bg-ledger-panel/80 p-4 sm:p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl";

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
      <section className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className={glassPanelClass}>
            <h4 className="mb-4 text-sm font-medium text-ledger-gray">Profit/Loss Overview</h4>
            {isLoading ? (
              <p className="text-xl font-semibold text-ledger-gray opacity-50">...</p>
            ) : metrics.totalCount === 0 ? (
              <p className="text-base font-medium text-ledger-gray">No records found.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {mode === "viewer" ? (
                  <>
                    <div className="flex items-end justify-between">
                      <span className="text-sm text-ledger-gray">Portfolio P/L</span>
                      <span className={`font-mono text-lg font-semibold ${getPLColorClass(metrics.totalProfitLoss, true)}`}>
                        {formatPL(metrics.totalProfitLoss)}
                      </span>
                    </div>
                    <div className="h-px w-full bg-white/5" />
                    <div className="flex items-end justify-between">
                      <span className="text-sm text-ledger-gray">Your Share</span>
                      <span className={`font-mono text-base font-medium ${getPLColorClass(metrics.userShareTotal)}`}>
                        {formatPL(metrics.userShareTotal)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {ledgerUser?.portfolioAlpha && (
                      <div className="flex items-end justify-between">
                        <span className="text-xs text-ledger-gray">Alpha Profit</span>
                        <span className={`font-mono text-sm font-medium ${getPLColorClass(metrics.portfolioAlphaProfit)}`}>
                          {formatPL(metrics.portfolioAlphaProfit)}
                        </span>
                      </div>
                    )}
                    {ledgerUser?.portfolioBeta && (
                      <div className="flex items-end justify-between">
                        <span className="text-xs text-ledger-gray">Beta Profit</span>
                        <span className={`font-mono text-sm font-medium ${getPLColorClass(metrics.portfolioBetaProfit)}`}>
                          {formatPL(metrics.portfolioBetaProfit)}
                        </span>
                      </div>
                    )}
                    {(ledgerUser?.portfolioAlpha && ledgerUser?.portfolioBeta) && (
                      <div className="flex items-end justify-between pt-1">
                        <span className="text-sm text-ledger-gray">Total Profit</span>
                        <span className={`font-mono text-base font-semibold ${getPLColorClass(metrics.totalProfitLoss, true)}`}>
                          {formatPL(metrics.totalProfitLoss)}
                        </span>
                      </div>
                    )}

                    <div className="my-1 h-px w-full bg-white/5" />

                    {ledgerUser?.portfolioAlpha && (
                      <div className="flex items-end justify-between">
                        <span className="text-xs text-ledger-gray">Your Alpha Share</span>
                        <span className={`font-mono text-sm font-medium ${getPLColorClass(metrics.userShareAlpha)}`}>
                          {formatPL(metrics.userShareAlpha)}
                        </span>
                      </div>
                    )}
                    {ledgerUser?.portfolioBeta && (
                      <div className="flex items-end justify-between">
                        <span className="text-xs text-ledger-gray">Your Beta Share</span>
                        <span className={`font-mono text-sm font-medium ${getPLColorClass(metrics.userShareBeta)}`}>
                          {formatPL(metrics.userShareBeta)}
                        </span>
                      </div>
                    )}
                    {(ledgerUser?.portfolioAlpha && ledgerUser?.portfolioBeta) && (
                      <div className="flex items-end justify-between pt-1">
                        <span className="text-sm text-ledger-gray">Your Total Share</span>
                        <span className={`font-mono text-base font-semibold ${getPLColorClass(metrics.userShareTotal)}`}>
                          {formatPL(metrics.userShareTotal)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className={glassPanelClass}>
            <h4 className="text-sm font-medium text-ledger-gray">Active IPOs</h4>
            {isLoading ? (
              <p className="mt-4 text-2xl font-semibold text-ledger-gray opacity-50">...</p>
            ) : metrics.totalCount === 0 ? (
              <p className="mt-4 text-lg font-medium text-ledger-gray">0 records</p>
            ) : (
              <p className="mt-4 font-mono text-3xl font-semibold text-white">{metrics.totalCount}</p>
            )}
          </div>
          <div className={glassPanelClass}>
            <h4 className="mb-4 text-sm font-medium text-ledger-gray">Recent Activity</h4>
            {isLoading ? (
              <p className="text-xl font-semibold text-ledger-gray opacity-50">...</p>
            ) : metrics.recentIposList.length === 0 ? (
              <p className="text-base font-medium text-ledger-gray">No recent activity.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {metrics.recentIposList.map((ipo) => {
                  const pl = ipo.calculationSnapshot?.totalProfitLoss ?? 0;
                  return (
                    <div key={ipo.id} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-white line-clamp-1">{ipo.ipoName}</p>
                        <p className="text-xs text-ledger-gray">{ipo.allotmentDate}</p>
                      </div>
                      <span className={`font-mono text-sm font-semibold ${getPLColorClass(pl)}`}>
                        {formatPL(pl)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={`grid gap-4 ${readOnly ? "" : "md:grid-cols-2"}`}>
          <div className={`flex flex-col justify-between ${glassPanelClass} hover:translate-y-0 hover:shadow-none`}>
            <div>
              <ShieldCheck className="mb-4 h-5 w-5 text-ledger-blue" aria-hidden="true" />
              <p className="text-sm font-semibold text-white">
                {readOnly ? "IPO History" : "IPO Management"}
              </p>
              {!readOnly && (
                <p className="mt-3 text-sm leading-6 text-ledger-gray">
                  Create, edit, archive, and review IPO records securely.
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={`${basePath}/ipos`}>
                <Button type="button" variant="secondary">
                  <FileClock className="h-4 w-4" aria-hidden="true" />
                  History
                </Button>
              </Link>
              <Link to={`${basePath}/settlements`}>
                <Button type="button" variant="secondary">
                  <WalletCards className="h-4 w-4" aria-hidden="true" />
                  Settlements
                </Button>
              </Link>
              {!readOnly ? (
                <Link to={`${basePath}/ipos/add`}>
                  <Button type="button">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add IPO
                  </Button>
                </Link>
              ) : null}
              <Link to={`${basePath}/analytics`}>
                <Button type="button" variant="secondary">
                  <FileClock className="h-4 w-4" aria-hidden="true" />
                  Analytics
                </Button>
              </Link>
            </div>
          </div>
          
          {!readOnly && (
            <div className="flex flex-col gap-4">
              <div className={`${glassPanelClass} hover:translate-y-0 hover:shadow-none`}>
                <h4 className="mb-4 text-sm font-medium text-ledger-gray">Portfolio Summary</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-ledger-gray">Alpha IPOs</span>
                    <span className="font-mono text-base font-semibold text-white">{metrics.portfolioAlphaCount}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-ledger-gray">Beta IPOs</span>
                    <span className="font-mono text-base font-semibold text-white">{metrics.portfolioBetaCount}</span>
                  </div>
                  <div className="my-1 h-px w-full bg-white/5" />
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-ledger-gray">Total Active IPOs</span>
                    <span className="font-mono text-base font-semibold text-white">{metrics.totalCount}</span>
                  </div>
                </div>
              </div>
              
              <Link to={`${basePath}/psr`} className={`group ${glassPanelClass}`}>
                <h4 className="mb-4 text-sm font-medium text-ledger-gray group-hover:text-white transition-colors">Profit Sharing Ratios</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">Portfolio Alpha</span>
                    <span className="text-xs font-semibold text-ledger-green flex items-center gap-1">
                      ✓ Balanced
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">Portfolio Beta</span>
                    <span className="text-xs font-semibold text-ledger-green flex items-center gap-1">
                      ✓ Balanced
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>

      </section>

      <PortfolioAccessPanel readOnly={readOnly} />
    </div>
  );
};

export default DashboardShell;
