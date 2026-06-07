import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { getIpos, filterIposForUser } from "../services/ipoService";
import type { IpoRecord } from "../types/ipo";
import Spinner from "../components/ui/Spinner";
import Button from "../components/ui/Button";
import { Download, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";
import {
  reportRegistry,
  type ReportFilters,
  type GeneratorMetadata
} from "../services/exportService";

type ReportsExportPageProps = {
  basePath: "/owner" | "/manager";
};

const titleByBasePath = {
  "/owner": "Owner Dashboard",
  "/manager": "Manager Dashboard",
};

const ReportsExportPage = ({ basePath }: ReportsExportPageProps) => {
  const { ledgerUser } = useAuth();
  const [ipos, setIpos] = useState<IpoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [reportType, setReportType] = useState<keyof typeof reportRegistry>("ipo_ledger");
  const [scope, setScope] = useState<"current" | "all">("current");
  const [portfolio, setPortfolio] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const fetchIpos = async () => {
      try {
        if (!ledgerUser) return;
        const allIpos = await getIpos(ledgerUser);
        if (ledgerUser) {
          setIpos(filterIposForUser(allIpos, ledgerUser));
        }
      } catch (error) {
        console.error("Failed to fetch IPOs for reports", error);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchIpos();
  }, [ledgerUser]);

  const handleGenerate = async () => {
    if (!ledgerUser) return;
    setErrorMsg(null);
    setIsGenerating(true);

    try {
      // Apply filters if scope is "current"
      let filteredIpos = [...ipos];
      
      if (scope === "current") {
        if (portfolio !== "all") {
          filteredIpos = filteredIpos.filter(i => i.portfolioId === portfolio);
        }
        if (status !== "all") {
          filteredIpos = filteredIpos.filter(i => i.status === status);
        }
        if (dateFrom) {
          filteredIpos = filteredIpos.filter(i => i.allotmentDate >= dateFrom);
        }
        if (dateTo) {
          filteredIpos = filteredIpos.filter(i => i.allotmentDate <= dateTo);
        }
      }

      if (filteredIpos.length === 0) {
        setErrorMsg("No records were found matching the selected report criteria.");
        setIsGenerating(false);
        return;
      }

      const filters: ReportFilters = {
        scope,
        portfolio,
        status,
        dateFrom,
        dateTo
      };

      const now = new Date();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dd = String(now.getDate()).padStart(2, '0');
      const mmm = months[now.getMonth()];
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      
      const generatedAt = `${dd}-${mmm}-${yyyy} ${hh}:${min}`;
      const dateStr = `${dd}-${String(now.getMonth() + 1).padStart(2, '0')}-${yyyy}`;

      const metadata: GeneratorMetadata = {
        user: ledgerUser,
        generatedAt
      };

      const reportDef = reportRegistry[reportType];
      if (reportDef) {
        await reportDef.generate(filteredIpos, filters, metadata, dateStr);
      }
      
    } catch (error) {
      console.error("Error generating report", error);
      setErrorMsg("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <Spinner label="Loading Reports Center" />;

  return (
    <DashboardLayout title={titleByBasePath[basePath]} subtitle="Reports & Export Center">
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-white/5 bg-ledger-panel/80 p-6 backdrop-blur-md shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-ledger-blue" />
              Configure Export
            </h3>

            <div className="space-y-6">
              
              {/* Report Type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#8793a3]">
                  Select Report
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(reportRegistry).map(([id, rt]) => (
                    <div 
                      key={id}
                      onClick={() => {
                        setReportType(id as keyof typeof reportRegistry);
                        setErrorMsg(null);
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition-all duration-300 ${
                        reportType === id 
                          ? "border-ledger-green bg-ledger-green/10 shadow-[0_0_15px_rgba(63,209,139,0.15)] scale-[1.02]" 
                          : "border-white/5 bg-[#101418] hover:border-white/20 hover:-translate-y-1"
                      }`}
                    >
                      <h4 className={`font-medium ${reportType === id ? "text-ledger-green" : "text-white"}`}>
                        {rt.name}
                      </h4>
                      <p className="mt-1 text-xs text-ledger-gray leading-relaxed">{rt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px w-full bg-ledger-line/50" />

              {/* Scope */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#8793a3]">
                  Report Scope
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input 
                      type="radio" 
                      name="scope" 
                      value="current" 
                      checked={scope === "current"}
                      onChange={() => {
                        setScope("current");
                        setErrorMsg(null);
                      }}
                      className="text-ledger-green bg-[#12171c] border-ledger-line focus:ring-ledger-green"
                    />
                    Current Filtered Data
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input 
                      type="radio" 
                      name="scope" 
                      value="all" 
                      checked={scope === "all"}
                      onChange={() => {
                        setScope("all");
                        setErrorMsg(null);
                      }}
                      className="text-ledger-green bg-[#12171c] border-ledger-line focus:ring-ledger-green"
                    />
                    All Historical Data
                  </label>
                </div>
              </div>

              {/* Filters */}
              <div className={`space-y-4 transition-opacity ${scope === "all" ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                <h4 className="text-sm font-medium text-[#8793a3]">Filters</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-[#8793a3]">Portfolio</label>
                    <select
                      value={portfolio}
                      onChange={(e) => {
                        setPortfolio(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full rounded border border-ledger-line bg-[#12171c] px-3 py-2 text-sm text-white focus:border-ledger-green focus:outline-none focus:ring-1 focus:ring-ledger-green"
                    >
                      <option value="all">All Portfolios</option>
                      <option value="portfolioAlpha">Portfolio Alpha</option>
                      <option value="portfolioBeta">Portfolio Beta</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8793a3]">IPO Status</label>
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full rounded border border-ledger-line bg-[#12171c] px-3 py-2 text-sm text-white focus:border-ledger-green focus:outline-none focus:ring-1 focus:ring-ledger-green"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="archived">Archived Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-[#8793a3]">Date From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full rounded border border-ledger-line bg-[#12171c] px-3 py-2 text-sm text-white focus:border-ledger-green focus:outline-none focus:ring-1 focus:ring-ledger-green [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8793a3]">Date To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full rounded border border-ledger-line bg-[#12171c] px-3 py-2 text-sm text-white focus:border-ledger-green focus:outline-none focus:ring-1 focus:ring-ledger-green [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/5 bg-ledger-panel/80 p-6 backdrop-blur-md shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Export Status</h3>
            
            <div className="rounded-xl bg-[#101418] border border-white/5 p-5 mb-6 text-center">
              <p className="text-sm text-ledger-gray mb-2">Available Records</p>
              <p className="font-mono text-3xl font-bold text-white">{ipos.length}</p>
              <p className="text-xs text-ledger-blue mt-2">Total IPOs fetched</p>
            </div>

            {errorMsg && (
              <div className="mb-6 flex items-start gap-3 rounded border border-red-500/50 bg-red-500/10 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-200">{errorMsg}</p>
              </div>
            )}

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || ipos.length === 0}
              className="w-full justify-center text-sm font-medium py-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download XLSX
                </>
              )}
            </Button>
            
            <p className="mt-4 text-xs text-center text-[#8793a3]">
              The report will be processed locally in your browser. No data leaves your device.
            </p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default ReportsExportPage;
