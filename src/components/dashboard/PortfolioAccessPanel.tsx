import { useAuth } from "../../context/AuthContext";
import { fixedPortfolios } from "../../services/portfolioService";

const PortfolioAccessPanel = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { ledgerUser } = useAuth();
  
  const canManage = ledgerUser?.role === "owner" || ledgerUser?.role === "manager";

  const allPortfolios = Object.values(fixedPortfolios).map((fp) => ({
    ...fp,
    enabled: fp.id === "portfolioAlpha" ? ledgerUser?.portfolioAlpha : ledgerUser?.portfolioBeta,
  }));

  const visiblePortfolios = canManage ? allPortfolios : allPortfolios.filter((p) => p.enabled);

  if (visiblePortfolios.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      {visiblePortfolios.map((portfolio) => {
        const totalRatio = portfolio.members.reduce((sum, m) => sum + m.ratio, 0);
        
        return (
          <div key={portfolio.id} className="rounded-xl border border-white/5 bg-ledger-panel/80 p-4 sm:p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="mb-5 flex flex-col gap-1">
              <h3 className="text-base font-semibold text-white">{portfolio.name}</h3>
            </div>
            
            <div className="rounded border border-white/5 bg-[#101418] p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#8793a3]">
                Members & PSR
              </h4>
              <ul className="space-y-3">
                {portfolio.members.map((member) => {
                  const percentage = totalRatio > 0 ? (member.ratio / totalRatio) * 100 : 0;
                  // If it's a whole number, show without decimals, otherwise show up to 2 decimal places
                  const displayValue = percentage % 1 === 0 ? percentage.toFixed(0) : percentage.toFixed(2);
                  
                  return (
                    <li key={member.code} className="flex items-center justify-between text-sm">
                      <span className="text-ledger-steel">{member.name}</span>
                      <span className="font-mono font-semibold text-white">{displayValue}%</span>
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
