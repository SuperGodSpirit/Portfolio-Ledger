import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { getAuditLogs } from "../services/auditService";
import type { AuditLog } from "../types/audit";
import Spinner from "../components/ui/Spinner";
import { getPortfolios } from "../services/portfolioService";
import type { Portfolio } from "../types/portfolio";

type AuditLogPageProps = {
  basePath: "/owner" | "/manager" | "/viewer";
};

const titleByBasePath = {
  "/owner": "Owner Dashboard",
  "/manager": "Manager Dashboard",
  "/viewer": "Viewer Dashboard",
} as const;

const AuditLogPage = ({ basePath }: AuditLogPageProps) => {
  const { ledgerUser } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [portfolioFilter, setPortfolioFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("all");

  useEffect(() => {
    void getPortfolios().then(setPortfolios);
    const fetchLogs = async () => {
      if (!ledgerUser) return;
      try {
        const auditData = await getAuditLogs(ledgerUser);
        setLogs(auditData);
      } catch (error) {
        console.error("Failed to load audit logs", error);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchLogs();
  }, [ledgerUser]);

  const filteredLogs = logs.filter(log => {
    if (portfolioFilter !== "all" && log.portfolioId !== portfolioFilter) return false;
    if (eventFilter !== "all" && log.eventType !== eventFilter) return false;
    if (userFilter.trim() !== "" && !log.userName.toLowerCase().includes(userFilter.toLowerCase())) return false;
    
    if (dateFrom) {
      const logDate = log.timestamp.split("T")[0];
      if (logDate < dateFrom) return false;
    }
    if (dateTo) {
      const logDate = log.timestamp.split("T")[0];
      if (logDate > dateTo) return false;
    }
    return true;
  });

  const formatEventName = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) return <Spinner label="Loading Audit Trail" />;

  return (
    <DashboardLayout title={titleByBasePath[basePath]} subtitle="Audit Logs">
      
      <div className="mb-6 grid gap-4 rounded border border-ledger-line bg-ledger-panel p-4 sm:grid-cols-2 lg:grid-cols-5">
        <select
          value={portfolioFilter}
          onChange={(e) => setPortfolioFilter(e.target.value)}
          className="h-10 w-full rounded border border-ledger-line bg-[#101418] px-3 text-sm text-white outline-none focus:border-ledger-green"
        >
          <option value="all">All Portfolios</option>
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="h-10 w-full rounded border border-ledger-line bg-[#101418] px-3 text-sm text-white outline-none focus:border-ledger-green"
        >
          <option value="all">All Events</option>
          <option value="ipo_created">IPO Created</option>
          <option value="ipo_edited">IPO Edited</option>
          <option value="ipo_archived">IPO Archived</option>
          <option value="ipo_restored">IPO Restored</option>
          <option value="settlement_settled">Settlement Settled</option>
          <option value="settlement_pending">Settlement Pending</option>
          <option value="user_login">User Login</option>
          <option value="user_logout">User Logout</option>
        </select>

        <input
          type="text"
          placeholder="Filter by user..."
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="h-10 w-full rounded border border-ledger-line bg-[#101418] px-3 text-sm text-white outline-none focus:border-ledger-green"
        />

        <div className="flex items-center gap-2 rounded border border-ledger-line bg-[#101418] px-2 focus-within:border-ledger-green">
          <span className="text-xs text-[#8793a3]">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
          />
        </div>
        <div className="flex items-center gap-2 rounded border border-ledger-line bg-[#101418] px-2 focus-within:border-ledger-green">
          <span className="text-xs text-[#8793a3]">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-ledger-panel/80 overflow-hidden backdrop-blur-md">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 opacity-80">
            <ShieldAlert className="h-12 w-12 text-ledger-gray mb-4" />
            <h3 className="text-lg font-semibold text-white">No audit records found</h3>
            <p className="mt-2 text-sm text-ledger-gray">Adjust your filters to see more history.</p>
          </div>
        ) : (
          <>
            <table className="hidden md:table w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/5 bg-[#151a20]/80 text-xs uppercase tracking-[0.16em] text-ledger-gray">
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Event Type</th>
                  <th className="px-4 py-3 font-semibold w-1/2">Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-white/5 last:border-0 hover:bg-[#1a2128]/50 transition-colors">
                    <td className="px-4 py-3 font-mono whitespace-nowrap text-ledger-gray">{formatDate(log.timestamp)}</td>
                    <td className="px-4 py-3 font-medium text-white">{log.userName}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono bg-[#101418] px-2.5 py-1 rounded text-[10px] uppercase tracking-widest border border-white/5 text-ledger-gray">
                        {formatEventName(log.eventType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#9aa6b5]">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="md:hidden flex flex-col">
              {filteredLogs.map(log => (
                <div key={log.id} className="border-b border-white/5 p-5 last:border-0 hover:bg-[#1a2128]/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="block font-medium text-white">{log.userName}</span>
                      <span className="font-mono text-xs text-ledger-gray">{formatDate(log.timestamp)}</span>
                    </div>
                    <span className="font-mono bg-[#101418] px-2 py-1 rounded text-[10px] uppercase tracking-widest border border-white/5 text-ledger-gray">
                      {formatEventName(log.eventType)}
                    </span>
                  </div>
                  <div className="text-sm text-ledger-steel mt-3">
                    {log.description}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

    </DashboardLayout>
  );
};

export default AuditLogPage;
