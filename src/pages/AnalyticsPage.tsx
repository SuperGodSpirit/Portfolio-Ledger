import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LineChart, Trophy, CalendarDays, BarChart2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { getIpos, filterIposForUser } from "../services/ipoService";
import type { IpoRecord } from "../types/ipo";
import Spinner from "../components/ui/Spinner";

type AnalyticsPageProps = {
  basePath: "/owner" | "/manager" | "/viewer";
};

const titleByBasePath = {
  "/owner": "Owner Dashboard",
  "/manager": "Manager Dashboard",
  "/viewer": "Viewer Dashboard",
} as const;

const AnalyticsPage = ({ basePath }: AnalyticsPageProps) => {
  const { ledgerUser } = useAuth();
  const [ipos, setIpos] = useState<IpoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!ledgerUser) return;
        const allIpos = await getIpos(ledgerUser);
        if (ledgerUser) {
           setIpos(filterIposForUser(allIpos, ledgerUser));
        }
      } catch (error) {
        console.error("Failed to fetch IPOs for analytics", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    void fetchDashboardData();
  }, [ledgerUser]);

  const metrics = useMemo(() => {
    const activeIpos = ipos.filter((ipo) => ipo.status === "active");

    let portfolioAlphaProfit = 0;
    let portfolioBetaProfit = 0;
    let portfolioAlphaCount = 0;
    let portfolioBetaCount = 0;

    let bestIpo: { name: string; pl: number } | null = null;
    let worstIpo: { name: string; pl: number } | null = null;

    let alphaProfitableCount = 0;
    let alphaAllottedCount = 0;
    
    let betaProfitableCount = 0;
    let betaAllottedCount = 0;

    let pendingReceivable = 0;
    let pendingPayable = 0;
    let totalSettlementsCount = 0;
    let settledCount = 0;
    let pendingCount = 0;
    
    const memberPerformance: Record<string, { alpha: number; beta: number; total: number }> = {};
    const monthlyPerformance: Record<string, { month: string; alpha: number; beta: number; portfolioTotal: number; userShare: number; timestamp: number }> = {};

    activeIpos.forEach((ipo) => {
      const snap = ipo.calculationSnapshot;
      if (!snap) return;

      const pl = snap.totalProfitLoss;

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

      // Settlement Insights
      (snap.settlementInstructions || []).forEach((inst) => {
        totalSettlementsCount++;
        if (inst.status === "settled") settledCount++;
        if (inst.status === "pending" || !inst.status) {
          pendingCount++;
          if (inst.from === ledgerUser?.name) pendingPayable += inst.amount;
          if (inst.to === ledgerUser?.name) pendingReceivable += inst.amount;
        }
      });

      // Member Performance Leaderboards
      (snap.memberEntitlements || []).forEach(e => {
        if (!memberPerformance[e.memberName]) {
          memberPerformance[e.memberName] = { alpha: 0, beta: 0, total: 0 };
        }
        if (ipo.portfolioId === "portfolioAlpha") memberPerformance[e.memberName].alpha += e.entitled;
        if (ipo.portfolioId === "portfolioBeta") memberPerformance[e.memberName].beta += e.entitled;
        memberPerformance[e.memberName].total += e.entitled;
      });

      // Monthly Timeline (Portfolio Profit & User Share)
      if (ipo.allotmentDate) {
        const dateParts = ipo.allotmentDate.split("-");
        if (dateParts.length === 3) {
          const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          if (!isNaN(date.getTime())) {
            const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
            if (!monthlyPerformance[monthKey]) {
              monthlyPerformance[monthKey] = { month: monthKey, alpha: 0, beta: 0, portfolioTotal: 0, userShare: 0, timestamp: date.getTime() };
            }
            if (ipo.portfolioId === "portfolioAlpha") monthlyPerformance[monthKey].alpha += pl;
            if (ipo.portfolioId === "portfolioBeta") monthlyPerformance[monthKey].beta += pl;
            monthlyPerformance[monthKey].portfolioTotal += pl;
            if (userEntitlement) {
              monthlyPerformance[monthKey].userShare += userEntitlement.entitled;
            }
          }
        }
      }
    });
    
    const monthlyTimeline = Object.values(monthlyPerformance).sort((a, b) => b.timestamp - a.timestamp);
    const memberLeaderboard = Object.entries(memberPerformance).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.total - a.total);

    return {
      portfolioAlphaCount,
      portfolioBetaCount,
      totalCount: activeIpos.length,
      bestIpo: bestIpo as { name: string; pl: number } | null,
      worstIpo: worstIpo as { name: string; pl: number } | null,
      alphaProfitableCount,
      alphaAllottedCount,
      betaProfitableCount,
      betaAllottedCount,
      pendingReceivable,
      pendingPayable,
      netSettlementPosition: pendingReceivable - pendingPayable,
      totalSettlementsCount,
      settledCount,
      pendingCount,
      monthlyTimeline,
      memberLeaderboard,
    };
  }, [ipos, ledgerUser]);

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
    if (pl > 0) return applyGradient ? "bg-gradient-to-r from-ledger-green to-emerald-400 bg-clip-text text-transparent" : "text-ledger-green";
    if (pl < 0) return "text-ledger-red";
    return "text-white";
  };

  const glassPanelClass = "rounded-xl border border-white/5 bg-ledger-panel/80 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl";

  if (isLoading) return <Spinner label="Loading Analytics" />;

  return (
    <DashboardLayout title={titleByBasePath[basePath]} subtitle="Analytics Hub">
      <div className="mb-6 flex items-center justify-between">
        <Link to={basePath} className="flex items-center gap-2 text-sm text-ledger-gray hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Analytics */}
        <div className="flex flex-col gap-4">
          <div className={glassPanelClass}>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-ledger-gray">
              <BarChart2 className="h-4 w-4" /> Performance Overviews
            </h4>
            
            {metrics.totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 opacity-60">
                <BarChart2 className="h-10 w-10 text-ledger-gray mb-3" />
                <p className="text-sm font-medium text-ledger-gray">Not enough data to calculate performance.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-ledger-gray">Best IPO</span>
                    <div className="mt-1 flex items-center justify-between rounded bg-[#101418] px-3 py-2 border border-white/5">
                      <span className="truncate text-sm text-white max-w-[100px]" title={metrics.bestIpo?.name}>{metrics.bestIpo?.name || "--"}</span>
                      <span className={`font-mono text-sm font-semibold ${getPLColorClass(metrics.bestIpo?.pl || 0)}`}>{metrics.bestIpo ? formatPL(metrics.bestIpo.pl) : "--"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-ledger-gray">Worst IPO</span>
                    <div className="mt-1 flex items-center justify-between rounded bg-[#101418] px-3 py-2 border border-white/5">
                      <span className="truncate text-sm text-white max-w-[100px]" title={metrics.worstIpo?.name}>{metrics.worstIpo?.name || "--"}</span>
                      <span className={`font-mono text-sm font-semibold ${getPLColorClass(metrics.worstIpo?.pl || 0)}`}>{metrics.worstIpo ? formatPL(metrics.worstIpo.pl) : "--"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {ledgerUser?.portfolioAlpha && metrics.portfolioAlphaCount > 0 && (
                    <div className="rounded bg-[#101418] p-4 border border-white/5">
                      <h5 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white">Portfolio Alpha</h5>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-end justify-between">
                          <span className="text-sm text-ledger-gray">Profitability Rate</span>
                          <div className="text-right">
                            <span className="font-mono text-xs text-ledger-gray mr-2">{metrics.alphaProfitableCount} / {metrics.portfolioAlphaCount}</span>
                            <span className="font-mono text-sm font-medium text-white">
                              {metrics.portfolioAlphaCount > 0 ? `${Math.round((metrics.alphaProfitableCount / metrics.portfolioAlphaCount) * 100)}%` : "--"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-sm text-ledger-gray">Allotment Rate</span>
                          <div className="text-right">
                            <span className="font-mono text-xs text-ledger-gray mr-2">{metrics.alphaAllottedCount} / {metrics.portfolioAlphaCount}</span>
                            <span className="font-mono text-sm font-medium text-white">
                              {metrics.portfolioAlphaCount > 0 ? `${Math.round((metrics.alphaAllottedCount / metrics.portfolioAlphaCount) * 100)}%` : "--"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {ledgerUser?.portfolioBeta && metrics.portfolioBetaCount > 0 && (
                    <div className="rounded bg-[#101418] p-4 border border-white/5">
                      <h5 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white">Portfolio Beta</h5>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-end justify-between">
                          <span className="text-sm text-ledger-gray">Profitability Rate</span>
                          <div className="text-right">
                            <span className="font-mono text-xs text-ledger-gray mr-2">{metrics.betaProfitableCount} / {metrics.portfolioBetaCount}</span>
                            <span className="font-mono text-sm font-medium text-white">
                              {metrics.portfolioBetaCount > 0 ? `${Math.round((metrics.betaProfitableCount / metrics.portfolioBetaCount) * 100)}%` : "--"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-sm text-ledger-gray">Allotment Rate</span>
                          <div className="text-right">
                            <span className="font-mono text-xs text-ledger-gray mr-2">{metrics.betaAllottedCount} / {metrics.portfolioBetaCount}</span>
                            <span className="font-mono text-sm font-medium text-white">
                              {metrics.portfolioBetaCount > 0 ? `${Math.round((metrics.betaAllottedCount / metrics.portfolioBetaCount) * 100)}%` : "--"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className={glassPanelClass}>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-ledger-gray">
               <LineChart className="h-4 w-4" /> Settlement Insights
            </h4>
            {metrics.totalSettlementsCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 opacity-60">
                <LineChart className="h-10 w-10 text-ledger-gray mb-3" />
                <p className="text-sm font-medium text-ledger-gray">No settlements generated yet.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="rounded bg-[#101418] p-3 border border-white/5 text-center">
                    <p className="text-xs text-ledger-gray mb-1">Receivable</p>
                    <p className={`font-mono text-sm font-semibold ${getPLColorClass(metrics.pendingReceivable)}`}>{formatPL(metrics.pendingReceivable)}</p>
                  </div>
                  <div className="rounded bg-[#101418] p-3 border border-white/5 text-center">
                    <p className="text-xs text-ledger-gray mb-1">Payable</p>
                    <p className="font-mono text-sm font-semibold text-ledger-red">{formatPL(-metrics.pendingPayable)}</p>
                  </div>
                </div>
                <div className="rounded bg-[#101418] p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-ledger-gray">Net Position</span>
                    <span className={`font-mono text-base font-bold ${getPLColorClass(metrics.netSettlementPosition, true)}`}>
                      {formatPL(metrics.netSettlementPosition)}
                    </span>
                  </div>
                  <div className="h-px w-full bg-white/5 my-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ledger-gray">Historical Settlements</span>
                    <span className="font-mono text-xs font-medium text-white">{metrics.totalSettlementsCount} instructions</span>
                  </div>
                  <div className="mt-2 flex text-xs font-mono">
                    <div className="bg-ledger-green/20 text-ledger-green px-2 py-1 rounded-l">{metrics.settledCount} Settled</div>
                    <div className="bg-ledger-amber/20 text-ledger-amber px-2 py-1 rounded-r">{metrics.pendingCount} Pending</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Member Leaderboards & Monthly Timeline */}
        <div className="flex flex-col gap-4">
          
          <div className={glassPanelClass}>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-ledger-gray">
              <Trophy className="h-4 w-4" /> Member Rankings
            </h4>
            {metrics.memberLeaderboard.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 opacity-60">
                <Trophy className="h-10 w-10 text-ledger-gray mb-3" />
                <p className="text-sm font-medium text-ledger-gray">No member data to rank.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ledgerUser?.portfolioAlpha && (
                  <div>
                    <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white">Portfolio Alpha</h5>
                    <div className="flex flex-col gap-2">
                      {metrics.memberLeaderboard
                        .filter(m => m.alpha !== 0)
                        .sort((a, b) => b.alpha - a.alpha)
                        .map(m => (
                        <div key={`alpha-${m.name}`} className="flex items-center justify-between bg-[#101418] px-3 py-2 rounded border border-white/5">
                          <span className="text-sm font-medium text-white">{m.name}</span>
                          <span className={`font-mono text-sm font-semibold ${getPLColorClass(m.alpha)}`}>
                            {formatPL(m.alpha)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {ledgerUser?.portfolioBeta && (
                  <div>
                    <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white">Portfolio Beta</h5>
                    <div className="flex flex-col gap-2">
                      {metrics.memberLeaderboard
                        .filter(m => m.beta !== 0)
                        .sort((a, b) => b.beta - a.beta)
                        .map(m => (
                        <div key={`beta-${m.name}`} className="flex items-center justify-between bg-[#101418] px-3 py-2 rounded border border-white/5">
                          <span className="text-sm font-medium text-white">{m.name}</span>
                          <span className={`font-mono text-sm font-semibold ${getPLColorClass(m.beta)}`}>
                            {formatPL(m.beta)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={glassPanelClass}>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-ledger-gray">
              <CalendarDays className="h-4 w-4" /> Monthly Timeline
            </h4>
            <div className="flex flex-col gap-3">
              {metrics.monthlyTimeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 opacity-60">
                  <CalendarDays className="h-10 w-10 text-ledger-gray mb-3" />
                  <p className="text-sm font-medium text-ledger-gray">No monthly data mapped yet.</p>
                </div>
              ) : (
                metrics.monthlyTimeline.map(m => (
                  <div key={m.month} className="rounded border border-white/5 bg-[#101418] p-4">
                    <span className="font-mono text-xs font-semibold text-ledger-gray uppercase tracking-wider">{m.month}</span>
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#9aa6b5]">Portfolio Profit</span>
                        <span className={`font-mono text-sm font-medium ${getPLColorClass(m.portfolioTotal)}`}>
                          {formatPL(m.portfolioTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#9aa6b5]">Your Share</span>
                        <span className={`font-mono text-sm font-bold ${getPLColorClass(m.userShare)}`}>
                          {formatPL(m.userShare)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
