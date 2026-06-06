import { Save, RefreshCw, AlertTriangle, ChevronDown, ChevronRight, History } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { getPortfolios } from "../services/portfolioService";
import { getPsrHistory, updatePsr, bootstrapPsrForPortfolio } from "../services/psrService";
import type { Portfolio, PortfolioId } from "../types/portfolio";
import type { ProfitSharingRatio, PsrMember, PsrHistory } from "../types/psr";

type PsrManagementPageProps = {
    basePath: "/owner" | "/manager";
};

const PsrManagementPage = ({ basePath }: PsrManagementPageProps) => {
    const { ledgerUser } = useAuth();
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<PortfolioId | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [members, setMembers] = useState<PsrMember[]>([]);
    const [originalMembers, setOriginalMembers] = useState<PsrMember[]>([]);

    const [history, setHistory] = useState<PsrHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!ledgerUser) {
                return;
            }

            setIsLoading(true);
            try {
                const ports = await getPortfolios();

                const accessiblePorts = ports.filter((p) => {
                    if (p.id === "portfolioAlpha") {
                        return ledgerUser.portfolioAlpha;
                    }

                    if (p.id === "portfolioBeta") {
                        return ledgerUser.portfolioBeta;
                    }

                    return false;
                });

                setPortfolios(accessiblePorts);
                if (accessiblePorts.length > 0) {
                    const defaultId = accessiblePorts[0].id;
                    setSelectedPortfolioId(defaultId);
                    await loadPsrForPortfolio(defaultId);
                }
            } catch (err) {
                setError("  to load portfolios.");
            } finally {
                setIsLoading(false);
            }
        };
        void loadData();
    }, [ledgerUser]);

    const loadPsrForPortfolio = async (pid: PortfolioId) => {
        if (!ledgerUser) return;
        try {
            const activePsr = await bootstrapPsrForPortfolio(pid, ledgerUser);
            setMembers(activePsr.members.map(m => ({ ...m })));
            setOriginalMembers(activePsr.members.map(m => ({ ...m })));

            const hist = await getPsrHistory(pid);
            setHistory(hist);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        }
    };

    const handlePortfolioChange = async (pid: PortfolioId) => {
        setSelectedPortfolioId(pid);
        setIsLoading(true);
        setSuccessMsg(null);
        setError(null);
        await loadPsrForPortfolio(pid);
        setIsLoading(false);
    };

    const handleRatioChange = (uid: string, value: string) => {
        setSuccessMsg(null);
        const parsed = parseFloat(value);
        setMembers(current =>
            current.map(m => m.uid === uid ? { ...m, ratio: isNaN(parsed) ? 0 : parsed } : m)
        );
    };

    const handleNormalize = () => {
        const totalCurrent = members.reduce((sum, m) => sum + m.ratio, 0);
        if (totalCurrent === 100 || totalCurrent === 0 || members.length === 0) return;

        // Scale each proportionally
        const multiplier = 100 / totalCurrent;
        setMembers(current => {
            let allocated = 0;
            const newMembers = current.map((m, idx) => {
                if (idx === current.length - 1) {
                    // Last one gets the remainder to avoid floating point precision issues
                    return { ...m, ratio: Number((100 - allocated).toFixed(2)) };
                }
                const newRatio = Number((m.ratio * multiplier).toFixed(2));
                allocated += newRatio;
                return { ...m, ratio: newRatio };
            });
            return newMembers;
        });
    };

    const handleSave = async () => {
        if (!selectedPortfolioId || !ledgerUser) return;
        setIsSaving(true);
        setError(null);
        setSuccessMsg(null);

        try {
            await updatePsr(selectedPortfolioId, members, ledgerUser, originalMembers);
            setSuccessMsg("Profit Sharing Ratio updated successfully.");
            await loadPsrForPortfolio(selectedPortfolioId);
        } catch (err: any) {
            setError(err.message || "Failed to save PSR.");
        } finally {
            setIsSaving(false);
        }
    };

    const totalAllocation = useMemo(() => {
        return members.reduce((sum, m) => sum + m.ratio, 0);
    }, [members]);

    // Use a small epsilon for floating point comparison
    const isBalanced = Math.abs(totalAllocation - 100) < 0.01;
    const hasZero = members.some(m => m.ratio === 0);

    const getStatusColor = () => {
        if (isBalanced) return "text-ledger-green";
        if (totalAllocation < 100) return "text-yellow-500";
        return "text-red-500";
    };

    const getStatusText = () => {
        if (isBalanced) return "Balanced";
        if (totalAllocation < 100) return "Incomplete";
        return "Overallocated";
    };

    // Pre-calculate Donut segments
    let accumulatedPercent = 0;
    const donutSegments = members.map((m, i) => {
        const percent = m.ratio;
        const start = accumulatedPercent;
        accumulatedPercent += percent;
        // Hue colors starting from standard blue/green around the wheel
        const color = `hsl(${(i * 137.5) % 360}, 70%, 50%)`;
        return { ...m, percent, start, color };
    });

    const donutGradient = donutSegments
        .map(s => `${s.color} ${s.start}% ${s.start + s.percent}%`)
        .join(", ");

    if (isLoading && portfolios.length === 0) {
        return <Spinner label="Loading PSR Center..." />;
    }

    const activePortfolio = portfolios.find(p => p.id === selectedPortfolioId);

    return (
        <DashboardLayout
            title={basePath === "/owner" ? "Owner Dashboard" : "Manager Dashboard"}
            subtitle="Profit Sharing Ratio Center"
            readOnly={false}
        >
            <div className="mb-6">
                <p className="text-sm text-[#9aa6b5]">
                    Manage portfolio profit distribution rules. Changes only affect future IPO calculations. Historical calculations are never modified.
                </p>
            </div>

            {portfolios.length === 0 ? (
                <div className="rounded border border-ledger-line bg-ledger-panel p-8 text-center">
                    <h3 className="text-lg font-semibold text-white">No Portfolios</h3>
                    <p className="mt-2 text-sm text-[#9aa6b5]">You don't have access to manage any portfolios.</p>
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">

                    <div className="lg:col-span-2 space-y-6">
                        <section className="flex gap-4 overflow-x-auto pb-2">
                            {portfolios.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handlePortfolioChange(p.id)}
                                    className={`px-4 py-3 rounded border font-medium whitespace-nowrap transition-colors ${p.id === selectedPortfolioId
                                        ? "bg-ledger-green/10 border-ledger-green text-ledger-green"
                                        : "bg-[#101418] border-ledger-line text-[#9aa6b5] hover:text-white"
                                        }`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </section>

                        {isLoading ? (
                            <Spinner label="Loading config..." />
                        ) : (
                            <section className="rounded border border-ledger-line bg-ledger-panel p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
                                    <h3 className="text-base font-semibold text-white">PSR Configuration</h3>
                                    <div className="flex gap-3">
                                        <Button variant="secondary" onClick={() => setShowHistory(true)} type="button">
                                            <History className="h-4 w-4 mr-2" />
                                            View History
                                        </Button>
                                        <Button variant="secondary" onClick={handleNormalize} type="button" disabled={isBalanced || totalAllocation === 0}>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Normalize
                                        </Button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                                        {error}
                                    </div>
                                )}
                                {successMsg && (
                                    <div className="mb-4 rounded border border-ledger-green/30 bg-ledger-green/10 p-3 text-sm text-ledger-green">
                                        {successMsg}
                                    </div>
                                )}
                                {hasZero && (
                                    <div className="mb-4 flex items-center gap-2 rounded border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-500">
                                        <AlertTriangle className="h-4 w-4" />
                                        One or more members currently receive 0% profit allocation.
                                    </div>
                                )}

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-ledger-line text-left text-xs uppercase tracking-wider text-[#8793a3]">
                                                <th className="py-3 pr-4 font-semibold">Member</th>
                                                <th className="px-4 py-3 font-semibold">Role</th>
                                                <th className="px-4 py-3 font-semibold text-right w-40">Current Ratio %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {members.map(member => (
                                                <tr key={member.uid} className="border-b border-ledger-line last:border-0">
                                                    <td className="py-3 pr-4 font-medium text-white">{member.name}</td>
                                                    <td className="px-4 py-3 text-[#9aa6b5] capitalize">{member.role}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                            className="h-9 w-full rounded border border-ledger-line bg-[#101418] px-3 text-right text-white outline-none focus:border-ledger-green transition-colors hide-spin-button"
                                                            value={member.ratio.toString()}
                                                            onChange={(e) => handleRatioChange(member.uid, e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t-2 border-ledger-line bg-[#151a20]">
                                            <tr>
                                                <td colSpan={2} className="py-3 px-4 font-semibold text-[#8793a3] text-right">Total Allocation</td>
                                                <td className={`py-3 px-4 font-bold text-right ${getStatusColor()}`}>
                                                    {totalAllocation.toFixed(2)}%
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <Button onClick={handleSave} disabled={isSaving || !isBalanced} type="button">
                                        <Save className="h-4 w-4 mr-2" />
                                        {isSaving ? "Saving..." : "Save PSR"}
                                    </Button>
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="space-y-6">
                        <section className="rounded border border-ledger-line bg-ledger-panel p-5">
                            <h3 className="text-base font-semibold text-white mb-4">Current Allocation</h3>

                            <div className="flex justify-center mb-6">
                                <div
                                    className="w-40 h-40 rounded-full relative"
                                    style={{
                                        background: donutGradient ? `conic-gradient(${donutGradient})` : "#151a20",
                                    }}
                                >
                                    <div className="absolute inset-2 rounded-full bg-ledger-panel flex items-center justify-center flex-col">
                                        <span className={`text-xl font-bold ${getStatusColor()}`}>{totalAllocation.toFixed(0)}%</span>
                                        <span className="text-xs font-medium text-[#8793a3] uppercase">{getStatusText()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {donutSegments.map(s => (
                                    <div key={s.uid} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                            <span className="text-[#c1cad6]">{s.name}</span>
                                        </div>
                                        <span className="font-semibold text-white">{s.ratio.toFixed(2)}%</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded border border-ledger-line bg-[#101418] p-5">
                            <h3 className="text-sm font-semibold text-[#8793a3] uppercase tracking-wider mb-4">
                                Profit Distribution Preview
                            </h3>
                            <p className="text-xs text-[#8793a3] mb-4">If Portfolio Profit = ₹100,000</p>
                            <div className="space-y-3 border-l-2 border-ledger-line pl-4">
                                {members.map(m => (
                                    <div key={m.uid} className="flex justify-between text-sm">
                                        <span className="text-[#c1cad6]">{m.name}</span>
                                        <span className="font-semibold text-ledger-green">
                                            {((100000 * m.ratio) / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded border border-ledger-line bg-ledger-panel p-6 shadow-2xl max-h-[80vh] flex flex-col">
                        <h2 className="mb-4 text-xl font-semibold text-white">PSR History - {activePortfolio?.name}</h2>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                            {history.length === 0 ? (
                                <p className="text-[#9aa6b5]">No history found.</p>
                            ) : (
                                history.map((h, i) => (
                                    <div key={h.id || i} className="rounded border border-ledger-line bg-[#101418] p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="font-semibold text-white">Version {h.versionNumber} {i === 0 ? "(Current)" : ""}</div>
                                            <div className="text-xs text-[#8793a3]">
                                                {h.updatedAt ? h.updatedAt.toDate().toLocaleString() : "Unknown date"} by {h.updatedByName}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                            {h.members.map(hm => (
                                                <div key={hm.uid} className="flex justify-between border-b border-ledger-line/50 pb-1">
                                                    <span className="text-[#9aa6b5]">{hm.name}</span>
                                                    <span className="text-white">{hm.ratio}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <Button variant="secondary" onClick={() => setShowHistory(false)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default PsrManagementPage;
