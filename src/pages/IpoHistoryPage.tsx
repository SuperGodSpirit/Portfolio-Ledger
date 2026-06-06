import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import IpoHistoryTable from "../components/ipo/IpoHistoryTable";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { archiveIpo, unarchiveIpo, filterIposForUser, getIpos } from "../services/ipoService";
import type { IpoRecord } from "../types/ipo";

type IpoHistoryPageProps = {
  basePath: "/owner" | "/manager" | "/viewer";
};

const titleByBasePath = {
  "/owner": "Owner Dashboard",
  "/manager": "Manager Dashboard",
  "/viewer": "Viewer Dashboard",
} as const;

type FilterMode = "active" | "archived" | "all";

const IpoHistoryPage = ({ basePath }: IpoHistoryPageProps) => {
  const { ledgerUser } = useAuth();
  const [ipos, setIpos] = useState<IpoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState("all");
  const [plFilter, setPlFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canManage = ledgerUser?.role === "owner" || ledgerUser?.role === "manager";
  
  const visibleIpos = useMemo(() => {
    if (!ledgerUser) return [];
    
    let filtered = filterIposForUser(ipos, ledgerUser);
    
    if (filterMode !== "all") {
      filtered = filtered.filter((ipo) => ipo.status === filterMode);
    }
    
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ipo => ipo.ipoName.toLowerCase().includes(q));
    }
    
    if (portfolioFilter !== "all") {
      filtered = filtered.filter(ipo => ipo.portfolioId === portfolioFilter);
    }
    
    if (plFilter === "profit") {
      filtered = filtered.filter(ipo => (ipo.calculationSnapshot?.totalProfitLoss ?? 0) > 0);
    } else if (plFilter === "loss") {
      filtered = filtered.filter(ipo => (ipo.calculationSnapshot?.totalProfitLoss ?? 0) < 0);
    }
    
    if (dateFrom) {
      filtered = filtered.filter(ipo => ipo.allotmentDate >= dateFrom);
    }
    
    if (dateTo) {
      filtered = filtered.filter(ipo => ipo.allotmentDate <= dateTo);
    }
    
    return filtered;
  }, [ipos, ledgerUser, filterMode, searchQuery, portfolioFilter, plFilter, dateFrom, dateTo]);

  useEffect(() => {
    const loadIpos = async () => {
      setIsLoading(true);
      setError(null);

      try {
        setIpos(await getIpos());
      } catch {
        setError("Unable to load IPO history.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadIpos();
  }, []);

  const handleArchive = async (ipoId: string) => {
    const targetIpo = ipos.find(i => i.id === ipoId);
    if (!ledgerUser || !targetIpo) return;
    await archiveIpo(ipoId, ledgerUser, targetIpo.ipoName, targetIpo.portfolioId);
    setIpos((currentIpos) =>
      currentIpos.map((ipo) => (ipo.id === ipoId ? { ...ipo, status: "archived" } : ipo)),
    );
  };

  const handleRestore = async (ipoId: string) => {
    const targetIpo = ipos.find(i => i.id === ipoId);
    if (!ledgerUser || !targetIpo) return;
    await unarchiveIpo(ipoId, ledgerUser, targetIpo.ipoName, targetIpo.portfolioId);
    setIpos((currentIpos) =>
      currentIpos.map((ipo) => (ipo.id === ipoId ? { ...ipo, status: "active" } : ipo)),
    );
  };

  if (isLoading) {
    return <Spinner label="Loading IPO history" />;
  }

  return (
    <DashboardLayout
      title={titleByBasePath[basePath]}
      subtitle="IPO history"
      readOnly={!canManage}
    >
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h3 className="text-xl font-semibold text-white">IPO Records</h3>
          <p className="mt-1 text-sm text-[#9aa6b5]">
            Firestore-backed IPO records for accessible portfolios.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {canManage ? (
            <Link to={`${basePath}/ipos/add`}>
              <Button type="button">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add IPO
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded border border-ledger-line bg-ledger-panel p-4 sm:grid-cols-2 lg:grid-cols-6 xl:grid-cols-7">
        <div className="sm:col-span-2 xl:col-span-2">
          <input
            type="text"
            placeholder="Search IPO Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded border border-ledger-line bg-[#101418] px-3 text-sm text-white outline-none transition focus:border-ledger-green"
          />
        </div>
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as FilterMode)}
          className="h-10 w-full rounded border border-ledger-line bg-[#101418] px-3 text-sm text-white outline-none transition focus:border-ledger-green"
        >
          <option value="active">Active Status</option>
          <option value="archived">Archived</option>
          <option value="all">All Status</option>
        </select>
        <select
          value={portfolioFilter}
          onChange={(e) => setPortfolioFilter(e.target.value)}
          className="h-10 w-full rounded border border-ledger-line bg-[#101418] px-3 text-sm text-white outline-none transition focus:border-ledger-green"
        >
          <option value="all">All Portfolios</option>
          <option value="portfolioAlpha">Portfolio Alpha</option>
          <option value="portfolioBeta">Portfolio Beta</option>
        </select>
        <select
          value={plFilter}
          onChange={(e) => setPlFilter(e.target.value)}
          className="h-10 w-full rounded border border-ledger-line bg-[#101418] px-3 text-sm text-white outline-none transition focus:border-ledger-green"
        >
          <option value="all">All P/L</option>
          <option value="profit">Profit Only</option>
          <option value="loss">Loss Only</option>
        </select>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <div className="flex w-full items-center gap-2 rounded border border-ledger-line bg-[#101418] px-2 focus-within:border-ledger-green">
            <span className="text-xs text-[#8793a3] min-w-[30px]">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
            />
          </div>
          <div className="flex w-full items-center gap-2 rounded border border-ledger-line bg-[#101418] px-2 focus-within:border-ledger-green">
            <span className="text-xs text-[#8793a3] min-w-[30px]">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded border border-[#5b3232] bg-[#2a1718] px-4 py-3 text-sm text-[#ffb5b5]">
          {error}
        </div>
      ) : null}

      <IpoHistoryTable
        ipos={visibleIpos}
        basePath={basePath}
        canManage={Boolean(canManage)}
        onArchive={handleArchive}
        onRestore={handleRestore}
      />
    </DashboardLayout>
  );
};

export default IpoHistoryPage;
