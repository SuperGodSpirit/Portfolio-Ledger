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
      {visiblePortfolios.map((portfolio) => (
        <div key={portfolio.id} className="rounded border border-ledger-line bg-ledger-panel p-5">
          <div className="mb-5 flex flex-col gap-1">
            <h3 className="text-base font-semibold text-white">{portfolio.name}</h3>
          </div>
          
          <div className="rounded border border-ledger-line bg-[#101418] p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#8793a3]">
              Members & PSR
            </h4>
            <ul className="space-y-3">
              {portfolio.members.map((member) => (
                <li key={member.code} className="flex items-center justify-between text-sm">
                  <span className="text-ledger-steel">{member.name}</span>
                  <span className="font-semibold text-white">{member.ratio}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </section>
  );
};

export default PortfolioAccessPanel;
