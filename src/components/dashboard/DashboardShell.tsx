import { FileClock, Plus, ShieldCheck, Users, WalletCards, Activity, Briefcase, TrendingUp, Trophy, ArrowRight } from "lucide-react";
import CountUp from "react-countup";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getIpos, filterIposForUser } from "../../services/ipoService";
import { useAuth } from "../../context/AuthContext";
import type { IpoRecord } from "../../types/ipo";
import Button from "../ui/Button";
import PortfolioAccessPanel from "./PortfolioAccessPanel";

type DashboardShellProps = {
  mode: "owner" | "manager" | "viewer";
  basePath: "/owner" | "/manager" | "/viewer";
  readOnly?: boolean;
  portfolioIdFilter?: string; // Optional filter to restrict data to a specific portfolio
};

const DashboardShell = ({ basePath, readOnly = false, portfolioIdFilter }: DashboardShellProps) => {
  const { ledgerUser } = useAuth();
  const [ipos, setIpos] = useState<IpoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!ledgerUser) return;
        const allIpos = await getIpos(ledgerUser);
        if (ledgerUser) {
           let filtered = filterIposForUser(allIpos, ledgerUser);
           if (portfolioIdFilter && portfolioIdFilter !== "all") {
             filtered = filtered.filter(i => i.portfolioId === portfolioIdFilter);
           }
           setIpos(filtered);
        }
      } catch (error) {
        console.error("Failed to fetch IPOs for dashboard", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    void fetchDashboardData();
  }, [readOnly, ledgerUser, portfolioIdFilter]);

  const metrics = useMemo(() => {
    const activeIpos = ipos.filter((ipo) => ipo.status === "active");

    const portfolioProfits: Record<string, number> = {};
    const portfolioCounts: Record<string, number> = {};
    const portfolioBestIpo: Record<string, { name: string; pl: number }> = {};
    const userPortfolioProfits: Record<string, number> = {};

    let totalProfitLoss = 0;
    let userShareTotal = 0;

    let bestIpo: { name: string; pl: number; portfolio: string } | null = null;
    let worstIpo: { name: string; pl: number } | null = null;

    let totalProfitableCount = 0;
    let totalAllottedCount = 0;

    let totalSettledCount = 0;
    let totalArchivedCount = ipos.filter(i => i.status === 'archived').length;
    let totalPendingCount = 0;

    let pendingReceivable = 0;
    let pendingPayable = 0;
    
    const memberPerformance: Record<string, { [key: string]: number; total: number }> = {};
    const monthlyPerformance: Record<string, { month: string; portfolios: Record<string, number>; userShare: number; timestamp: number }> = {};
    
    // For synthesized activity feed
    const allEvents: { id: string, type: 'created' | 'settled' | 'pending' | 'archived', title: string, dateStr: string, timestamp: number, value?: number }[] = [];

    ipos.forEach((ipo) => {
      // Build activity feed
      const createdAt = ipo.createdAt?.toDate().getTime() || 0;
      if (createdAt > 0) {
        allEvents.push({
          id: `${ipo.id}-created`,
          type: 'created',
          title: `Created: ${ipo.ipoName}`,
          dateStr: ipo.createdAt?.toDate().toLocaleDateString() || '',
          timestamp: createdAt,
        });
      }
      
      if (ipo.status === 'archived') {
        const updatedAt = ipo.updatedAt?.toDate().getTime() || createdAt;
        allEvents.push({
          id: `${ipo.id}-archived`,
          type: 'archived',
          title: `Archived: ${ipo.ipoName}`,
          dateStr: ipo.updatedAt?.toDate().toLocaleDateString() || '',
          timestamp: updatedAt,
        });
      }

      const snap = ipo.calculationSnapshot;
      if (!snap) return;

      // Add settlement events
      (snap.settlementInstructions || []).forEach(inst => {
        if (inst.status === 'settled' && inst.settledAt) {
          allEvents.push({
            id: inst.id || `${ipo.id}-settled-${inst.from}-${inst.to}`,
            type: 'settled',
            title: `Settled: ${inst.from} → ${inst.to}`,
            dateStr: new Date(inst.settledAt).toLocaleDateString(),
            timestamp: new Date(inst.settledAt).getTime(),
            value: inst.amount
          });
        } else if (inst.status === 'pending' || !inst.status) {
           totalPendingCount++;
           allEvents.push({
            id: inst.id || `${ipo.id}-pending-${inst.from}-${inst.to}`,
            type: 'pending',
            title: `Pending: ${inst.from} → ${inst.to}`,
            dateStr: ipo.allotmentDate || 'Recent',
            timestamp: createdAt + 1, // rough approximation for pending sorting
            value: inst.amount
          });
        }
      });

      if (ipo.status !== 'active') return;

      const pl = snap.totalProfitLoss;
      totalProfitLoss += pl;
      portfolioProfits[ipo.portfolioId] = (portfolioProfits[ipo.portfolioId] || 0) + pl;
      portfolioCounts[ipo.portfolioId] = (portfolioCounts[ipo.portfolioId] || 0) + 1;

      if (bestIpo === null || pl > bestIpo.pl) bestIpo = { name: ipo.ipoName, pl, portfolio: ipo.portfolioName };
      if (worstIpo === null || pl < worstIpo.pl) worstIpo = { name: ipo.ipoName, pl };

      const currentBest = portfolioBestIpo[ipo.portfolioId];
      if (!currentBest || pl > currentBest.pl) {
        portfolioBestIpo[ipo.portfolioId] = { name: ipo.ipoName, pl };
      }

      const isAllotted = Object.values(ipo.memberEntries).some(
        (m) => (m.allottedLots ?? 0) > 0 || m.allottedAmount > 0
      );

      if (pl > 0) totalProfitableCount++;
      if (isAllotted) totalAllottedCount++;

      const userEntitlement = (snap.memberEntitlements || []).find(
        (e) => e.memberName === ledgerUser?.name,
      );
      if (userEntitlement) {
         userPortfolioProfits[ipo.portfolioId] = (userPortfolioProfits[ipo.portfolioId] || 0) + userEntitlement.entitled;
         userShareTotal += userEntitlement.entitled;
      }

      // Settlement
      let hasSettled = false;
      (snap.settlementInstructions || []).forEach((inst) => {
        if (inst.status === 'settled') hasSettled = true;
        if (inst.status === "pending" || !inst.status) { // Default legacy to pending
          if (inst.from === ledgerUser?.name) pendingPayable += inst.amount;
          if (inst.to === ledgerUser?.name) pendingReceivable += inst.amount;
        }
      });
      if (hasSettled) totalSettledCount++;

      // Member Performance
      (snap.memberEntitlements || []).forEach(e => {
        if (!memberPerformance[e.memberName]) {
          memberPerformance[e.memberName] = { total: 0 };
        }
        memberPerformance[e.memberName][ipo.portfolioId] = (memberPerformance[e.memberName][ipo.portfolioId] || 0) + e.entitled;
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
              monthlyPerformance[monthKey] = { month: monthKey, portfolios: {}, userShare: 0, timestamp: date.getTime() };
            }
            monthlyPerformance[monthKey].portfolios[ipo.portfolioId] = (monthlyPerformance[monthKey].portfolios[ipo.portfolioId] || 0) + pl;
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
      totalProfitLoss,
      portfolioProfits,
      portfolioCounts,
      portfolioBestIpo,
      userPortfolioProfits,
      totalCount: activeIpos.length,
      userShareTotal,
      bestIpo: bestIpo as { name: string; pl: number; portfolio: string } | null,
      worstIpo: worstIpo as { name: string; pl: number } | null,
      totalProfitableCount,
      totalAllottedCount,
      pendingReceivable,
      pendingPayable,
      netSettlementPosition: pendingReceivable - pendingPayable,
      totalSettledCount,
      totalArchivedCount,
      totalPendingCount,
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

  const getPLColorClass = (pl: number) => {
    if (pl > 0) return "text-ledger-green";
    if (pl < 0) return "text-ledger-red";
    return "text-white";
  };

  const solidCardClass = "rounded-xl border border-ledger-line bg-[#12171c] p-5 transition-colors hover:border-[#374151]";
  const primaryCardClass = "rounded-2xl border border-ledger-line bg-[#0a0d11] p-6 sm:p-8 relative overflow-hidden";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <section className="flex flex-1 flex-col gap-6">
        
        {/* COMMAND CENTER HERO */}
        <div className={primaryCardClass}>
          
          {isLoading ? (
            <div className="animate-pulse flex flex-col gap-4">
              <div className="h-12 w-48 rounded bg-white/5"></div>
              <div className="h-8 w-32 rounded bg-white/5"></div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row justify-between gap-8 relative z-10">
              
              {/* Left Side: Massive Profit */}
              <div className="flex flex-col gap-6">
                <div>
                  <h4 className="mb-2 text-sm font-semibold uppercase tracking-widest text-ledger-gray">Financial Overview</h4>
                  <div className="flex flex-col">
                    <span className="mb-1 text-sm text-[#9aa6b5]">Total Portfolio Profit</span>
                    <span className={`font-mono text-5xl sm:text-6xl font-bold tracking-tight ${getPLColorClass(metrics.totalProfitLoss)}`}>
                      {metrics.totalProfitLoss === 0 ? "₹0" : (
                        <CountUp
                          start={0}
                          end={metrics.totalProfitLoss}
                          duration={0.7}
                          formattingFn={(val) => formatPL(val)}
                        />
                      )}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <span className="mb-1 text-sm text-[#9aa6b5]">Your Total Share</span>
                  <span className={`font-mono text-3xl sm:text-4xl font-semibold tracking-tight ${getPLColorClass(metrics.userShareTotal)}`}>
                    {metrics.userShareTotal === 0 ? "₹0" : (
                      <CountUp
                        start={0}
                        end={metrics.userShareTotal}
                        duration={0.7}
                        formattingFn={(val) => formatPL(val)}
                      />
                    )}
                  </span>
                </div>
              </div>
              
              {/* Right Side: Dense Metrics */}
              <div className="flex flex-col gap-4 lg:min-w-[280px]">
                <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                    <span className="text-sm text-ledger-gray">Active IPOs</span>
                    <span className="font-mono font-medium text-white">{metrics.totalCount}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                    <span className="text-sm text-ledger-gray">Settled IPOs</span>
                    <span className="font-mono font-medium text-white">{metrics.totalSettledCount}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                    <span className="text-sm text-ledger-gray">Top IPO Profit</span>
                    <span className={`font-mono font-medium ${getPLColorClass(metrics.bestIpo?.pl || 0)}`}>
                      {metrics.bestIpo ? formatPL(metrics.bestIpo.pl) : "₹0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ledger-gray">Top Earner</span>
                    <span className="text-sm font-medium text-white">
                      {metrics.memberLeaderboard[0]?.name || "-"}
                    </span>
                  </div>
                </div>
              </div>
              
            </div>
          )}
        </div>

        {/* TOP IPO & PORTFOLIO SUMMARIES */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          
          {/* Top Performing IPO */}
          <div className={`${solidCardClass} flex flex-col justify-between`}>
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ledger-gray flex items-center gap-2">
                <Trophy className="h-4 w-4 text-ledger-blue" />
                Top Performing IPO
              </h4>
              {isLoading ? (
                <p className="text-xl font-semibold text-ledger-gray opacity-50">...</p>
              ) : metrics.bestIpo ? (
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold text-white">{metrics.bestIpo.name}</span>
                  <span className="text-sm text-ledger-gray">{metrics.bestIpo.portfolio}</span>
                </div>
              ) : (
                <p className="text-sm font-medium text-ledger-gray">No active IPOs</p>
              )}
            </div>
            {metrics.bestIpo && (
              <div className="mt-6 border-t border-white/5 pt-4">
                <span className={`font-mono text-2xl font-bold ${getPLColorClass(metrics.bestIpo.pl)}`}>
                  {formatPL(metrics.bestIpo.pl)}
                </span>
              </div>
            )}
          </div>

          {/* Dynamic Portfolio Summaries */}
          {Object.keys(metrics.portfolioProfits).map(portId => {
            const count = metrics.portfolioCounts[portId] || 0;
            const best = metrics.portfolioBestIpo[portId];
            const portName = ipos.find(i => i.portfolioId === portId)?.portfolioName || portId;
            const isBeta = portId === 'portfolioBeta';

            return (
              <div key={portId} className={`${solidCardClass} flex flex-col justify-between`}>
                <div>
                  <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ledger-gray flex items-center gap-2">
                    <Briefcase className={`h-4 w-4 ${isBeta ? 'text-ledger-gray' : 'text-[#3b82f6]'}`} />
                    {portName}
                  </h4>
                  {isLoading ? (
                    <p className="text-xl font-semibold text-ledger-gray opacity-50">...</p>
                  ) : (
                    <div className="flex flex-col">
                      <span className={`font-mono text-3xl font-bold tracking-tight ${getPLColorClass(metrics.portfolioProfits[portId])}`}>
                        {formatPL(metrics.portfolioProfits[portId])}
                      </span>
                      <div className="mt-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-ledger-gray">Total IPOs</span>
                          <span className="font-mono text-sm text-white">{count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-ledger-gray">Best IPO</span>
                          <span className="text-sm font-medium text-white truncate max-w-[120px] text-right">
                            {best?.name || '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-ledger-gray">Best Profit</span>
                          <span className={`font-mono text-sm font-medium ${getPLColorClass(best?.pl || 0)}`}>
                            {best ? formatPL(best.pl) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* MEMBER EARNINGS LEADERBOARD */}
        <div className={solidCardClass}>
          <h4 className="mb-6 text-xs font-semibold uppercase tracking-widest text-ledger-gray flex items-center gap-2">
            <Users className="h-4 w-4 text-ledger-blue" />
            Member Earnings Leaderboard
          </h4>
          {isLoading ? (
            <div className="animate-pulse flex flex-col gap-3">
              <div className="h-8 w-full bg-white/5 rounded"></div>
              <div className="h-8 w-full bg-white/5 rounded"></div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {metrics.memberLeaderboard.length === 0 ? (
                <p className="text-sm font-medium text-ledger-gray">No earnings data available.</p>
              ) : (
                metrics.memberLeaderboard.map((member, idx) => {
                  const isTop = idx === 0;
                  return (
                    <div key={member.name} className={`flex items-center justify-between pb-3 ${idx !== metrics.memberLeaderboard.length - 1 ? 'border-b border-white/5' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center h-6 w-6 rounded-full font-mono text-xs font-bold ${isTop ? 'bg-ledger-blue/20 text-ledger-blue' : 'bg-white/5 text-ledger-gray'}`}>
                          {idx + 1}
                        </div>
                        <span className={`font-medium ${isTop ? 'text-white' : 'text-ledger-gray'}`}>{member.name}</span>
                      </div>
                      <span className={`font-mono font-semibold text-lg tracking-tight ${getPLColorClass(member.total)}`}>
                        {formatPL(member.total)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {!readOnly && (
            <Link to={`${basePath}/ipos/add`}>
              <Button type="button" className="bg-ledger-blue text-white hover:bg-ledger-blue/90 border-transparent shadow-sm">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Add IPO
              </Button>
            </Link>
          )}
          <Link to={`${basePath}/settlements`}>
            <Button type="button" variant="secondary" className="!text-white hover:!bg-white/10 !border-white/10">
              <WalletCards className="h-4 w-4 mr-2" aria-hidden="true" />
              Settlement Center
            </Button>
          </Link>
          <Link to={`${basePath}/ipos`}>
            <Button type="button" variant="secondary" className="!text-white hover:!bg-white/10 !border-white/10">
              <FileClock className="h-4 w-4 mr-2" aria-hidden="true" />
              IPO History
            </Button>
          </Link>
          {!readOnly && (
            <Link to={`${basePath}/admin`}>
              <Button type="button" variant="secondary" className="!text-white hover:!bg-white/10 !border-white/10">
                <Users className="h-4 w-4 mr-2" aria-hidden="true" />
                Admin Center
              </Button>
            </Link>
          )}
          <Link to={`${basePath}/analytics`}>
            <Button type="button" variant="secondary" className="!text-white hover:!bg-white/10 !border-white/10">
              <Activity className="h-4 w-4 mr-2" aria-hidden="true" />
              Analytics
            </Button>
          </Link>
        </div>

      </section>

      <div className="w-full lg:w-80 lg:shrink-0">
        <PortfolioAccessPanel 
          readOnly={readOnly} 
          portfolioProfits={metrics.portfolioProfits} 
          userPortfolioProfits={metrics.userPortfolioProfits} 
        />
      </div>
    </div>
  );
};

export default DashboardShell;
