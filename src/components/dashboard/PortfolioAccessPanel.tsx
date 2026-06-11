import { useAuth } from "../../context/AuthContext";
import { getPortfolios } from "../../services/portfolioService";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { Portfolio } from "../../types/portfolio";

const getAvatarColor = (name: string) => {
  const colors = [
    "bg-blue-500/80 text-blue-100", 
    "bg-gray-500/80 text-gray-100"
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

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

const PortfolioAccessPanel = ({ 
  readOnly = false,
  portfolioProfits = {},
  userPortfolioProfits = {}
}: { 
  readOnly?: boolean,
  portfolioProfits?: Record<string, number>,
  userPortfolioProfits?: Record<string, number> 
}) => {
  const { ledgerUser } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  useEffect(() => {
    void getPortfolios().then(setPortfolios);
  }, []);
  
  const canManage = ledgerUser?.role === "owner" || ledgerUser?.role === "manager";

  const allPortfolios = portfolios.map((fp) => ({
    ...fp,
    enabled: ledgerUser?.portfolios?.includes(fp.id) || (fp.id === "portfolioAlpha" && ledgerUser?.portfolioAlpha) || (fp.id === "portfolioBeta" && ledgerUser?.portfolioBeta),
  }));

  const visiblePortfolios = (canManage ? allPortfolios : allPortfolios.filter((p) => p.enabled))
    .filter(p => p.status !== "archived");

  if (visiblePortfolios.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      {visiblePortfolios.map((portfolio) => {
        const totalRatio = portfolio.members.reduce((sum: number, m: any) => sum + m.ratio, 0);
        const profit = readOnly ? (userPortfolioProfits[portfolio.id] || 0) : (portfolioProfits[portfolio.id] || 0);
        const profitLabel = readOnly ? "Your Profit" : "Total Portfolio Profit";
        
        return (
          <div key={portfolio.id} className="rounded-lg border border-white/5 bg-[#111827] p-3 sm:p-4 shadow-sm transition-all hover:border-white/10">
            <div className="mb-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  {portfolio.name}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-ledger-gray bg-[#151c28] px-1.5 py-0.5 rounded border border-white/5">
                  <Users className="h-2.5 w-2.5" />
                  <span>{portfolio.members.length}</span>
                </div>
              </div>

              {/* Profit Prominently Displayed */}
              <div className="flex flex-col">
                <span className="text-xs text-ledger-gray mb-1">{profitLabel}</span>
                <span className={`font-mono text-2xl font-bold tracking-tight ${getPLColorClass(profit)}`}>
                  {formatPL(profit)}
                </span>
              </div>
            </div>
            
            <div className="rounded-md border border-white/5 bg-[#151c28] p-3">
              <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ledger-gray">
                Allocation
              </h4>
              <ul className="space-y-2">
                {portfolio.members.map((member: any) => {
                  const percentage = totalRatio > 0 ? (member.ratio / totalRatio) * 100 : 0;
                  const displayValue = percentage % 1 === 0 ? percentage.toFixed(0) : percentage.toFixed(2);
                  const avatarTheme = getAvatarColor(member.name);
                  
                  return (
                    <li key={member.code} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarTheme}`}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-white">{member.name}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-ledger-gray">{displayValue}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default PortfolioAccessPanel;
