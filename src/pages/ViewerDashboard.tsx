import { useState } from "react";
import DashboardShell from "../components/dashboard/DashboardShell";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import NotificationPromptCard from "../components/dashboard/NotificationPromptCard";

const ViewerDashboard = () => {
  const { ledgerUser } = useAuth();
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("all");

  const portfolios = ledgerUser?.portfolios || [];
  
  const formatPortfolioName = (id: string) => {
      return id.replace(/portfolio/i, "Portfolio ");
  };

  const showDropdown = portfolios.length > 1;

  const headerRight = showDropdown ? (
      <select 
          value={selectedPortfolio}
          onChange={e => setSelectedPortfolio(e.target.value)}
          className="bg-[#151a20] border border-ledger-line text-white rounded px-3 py-1.5 text-sm outline-none focus:border-ledger-primary"
      >
          <option value="all">All Portfolios</option>
          {portfolios.map(p => (
              <option key={p} value={p}>{formatPortfolioName(p)}</option>
          ))}
      </select>
  ) : undefined;

  const subtitle = showDropdown 
      ? (selectedPortfolio === "all" ? "All Portfolios" : formatPortfolioName(selectedPortfolio))
      : (portfolios.length > 0 ? formatPortfolioName(portfolios[0]) : "No Portfolio Assigned");

  return (
    <DashboardLayout title="Dashboard" subtitle={subtitle} headerRight={headerRight} readOnly>
      <NotificationPromptCard />
      <DashboardShell mode="viewer" basePath="/viewer" portfolioIdFilter={selectedPortfolio} readOnly />
    </DashboardLayout>
  );
};

export default ViewerDashboard;
