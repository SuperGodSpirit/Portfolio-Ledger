import { useEffect, useState, useRef } from "react";
import { collection, doc, updateDoc, setDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import type { Portfolio, PortfolioMember } from "../../types/portfolio";
import { getPortfolios, createPsrVersion } from "../../services/portfolioService";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../ui/Spinner";
import { Briefcase, Archive, Plus, Users, Save, X, ShieldAlert } from "lucide-react";

const PortfolioManagement = () => {
    const { firebaseUser } = useAuth();
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [allUsers, setAllUsers] = useState<{uid: string, name: string, status: string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);

    const [editMembers, setEditMembers] = useState<PortfolioMember[]>([]);
    const [newMemberName, setNewMemberName] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    
    // Create new portfolio states
    const [isCreating, setIsCreating] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState("");
    const [newPortfolioId, setNewPortfolioId] = useState("");
    
    const [showArchived, setShowArchived] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ports, usersSnap] = await Promise.all([
                getPortfolios(),
                getDocs(collection(db, "users"))
            ]);
            setPortfolios(ports);
            setAllUsers(usersSnap.docs.map(d => ({ 
                uid: d.id, 
                name: d.data().name,
                status: d.data().status || (d.data().active !== false ? "active" : "deactivated")
            })));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggleArchive = async (portfolio: Portfolio) => {
        const newStatus = portfolio.status === "archived" ? "active" : "archived";
        try {
            await updateDoc(doc(db, "portfolios", portfolio.id), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
            setPortfolios(prev => prev.map(p => p.id === portfolio.id ? { ...p, status: newStatus } : p));
        } catch (error) {
            console.error(error);
            alert("Failed to archive portfolio.");
        }
    };

    const handleCreatePortfolio = async () => {
        if (!newPortfolioId || !newPortfolioName) return;
        try {
            const newPortfolio: Portfolio = {
                id: newPortfolioId,
                name: newPortfolioName,
                memberCodes: [],
                members: [],
                status: "active",
                createdAt: serverTimestamp() as any,
                updatedAt: serverTimestamp() as any
            };
            await setDoc(doc(db, "portfolios", newPortfolioId), newPortfolio);
            // Create v1 psr version
            await createPsrVersion(newPortfolioId, [], firebaseUser!.uid);
            
            setPortfolios([...portfolios, newPortfolio]);
            setIsCreating(false);
            setNewPortfolioId("");
            setNewPortfolioName("");
        } catch (error) {
            console.error(error);
            alert("Failed to create portfolio.");
        }
    };

    // --- PSR EDITOR LOGIC ---
    const startEditing = (portfolio: Portfolio) => {
        setEditingPortfolioId(portfolio.id);
        setEditMembers(JSON.parse(JSON.stringify(portfolio.members))); // Deep copy
        setNewMemberName("");
        setShowDropdown(false);
    };

    const selectUser = (user: {uid: string, name: string}) => {
        setEditMembers([...editMembers, {
            code: user.uid,
            name: user.name,
            ratio: 0
        }]);
        setNewMemberName("");
        setShowDropdown(false);
    };

    const removeMemberFromEdit = (code: string) => {
        setEditMembers(editMembers.filter(m => m.code !== code));
    };

    const updateMemberRatio = (code: string, newRatio: string) => {
        const val = parseFloat(newRatio);
        setEditMembers(editMembers.map(m => m.code === code ? { ...m, ratio: isNaN(val) ? 0 : val } : m));
    };

    const savePsrChanges = async (portfolio: Portfolio) => {
        // Validate total is between 99.9 and 100.1
        const total = editMembers.reduce((sum, m) => sum + m.ratio, 0);
        if (total < 99.9 || total > 100.1) {
            if (editMembers.length > 0) {
                alert(`Total PSR percentage must be 100%. Currently it is ${total.toFixed(2)}%`);
                return;
            }
        }

        try {
            const memberCodes = editMembers.map(m => m.code);
            
            // 1. Update Portfolio document
            await updateDoc(doc(db, "portfolios", portfolio.id), {
                members: editMembers,
                memberCodes,
                updatedAt: serverTimestamp()
            });

            // 2. Create new PSR Version
            await createPsrVersion(portfolio.id, editMembers, firebaseUser!.uid);

            setPortfolios(prev => prev.map(p => p.id === portfolio.id ? { ...p, members: editMembers, memberCodes } : p));
            setEditingPortfolioId(null);
        } catch (error) {
            console.error(error);
            alert("Failed to save changes.");
        }
    };

    const filteredUsers = allUsers.filter(u => 
        u.name.toLowerCase().includes(newMemberName.toLowerCase()) && 
        !editMembers.find(m => m.code === u.uid) &&
        u.status !== "deactivated"
    );

    const filteredPortfolios = showArchived ? portfolios : portfolios.filter(p => p.status !== "archived");

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-ledger-line pb-4">
                <h3 className="text-white font-semibold flex items-center"><Briefcase className="w-5 h-5 mr-2 text-ledger-green"/> Portfolios & PSR</h3>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-[#8793a3] hover:text-white transition-colors w-full sm:w-auto justify-end">
                        <input 
                            type="checkbox" 
                            checked={showArchived} 
                            onChange={(e) => setShowArchived(e.target.checked)}
                            className="rounded bg-[#101418] border-ledger-line text-ledger-green focus:ring-ledger-green focus:ring-offset-0"
                        />
                        Show archived portfolios
                    </label>
                    {!isCreating && (
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="text-xs bg-ledger-green text-black px-3 py-2 rounded font-semibold flex items-center justify-center w-full sm:w-auto shrink-0"
                        >
                            <Plus className="w-4 h-4 mr-1" /> New Portfolio
                        </button>
                    )}
                </div>
            </div>

            {isCreating && (
                <div className="bg-[#151a20] border border-ledger-line p-4 rounded flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs text-[#8793a3] uppercase mb-1 block">Portfolio ID (no spaces)</label>
                        <input 
                            value={newPortfolioId} 
                            onChange={e => setNewPortfolioId(e.target.value.replace(/\s/g, ''))}
                            className="w-full bg-[#101418] border border-ledger-line rounded px-3 py-2 text-white text-sm focus:border-ledger-green outline-none"
                            placeholder="e.g. portfolioGamma"
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-xs text-[#8793a3] uppercase mb-1 block">Display Name</label>
                        <input 
                            value={newPortfolioName} 
                            onChange={e => setNewPortfolioName(e.target.value)}
                            className="w-full bg-[#101418] border border-ledger-line rounded px-3 py-2 text-white text-sm focus:border-ledger-green outline-none"
                            placeholder="e.g. Portfolio Gamma"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={handleCreatePortfolio} className="px-4 py-2 bg-ledger-green text-black font-medium rounded text-sm whitespace-nowrap flex-1 md:flex-none">Create</button>
                        <button onClick={() => setIsCreating(false)} className="px-4 py-2 bg-[#2a2f36] text-white font-medium rounded text-sm whitespace-nowrap flex-1 md:flex-none">Cancel</button>
                    </div>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {filteredPortfolios.map(portfolio => (
                    <div key={portfolio.id} className={`border border-ledger-line rounded-lg bg-[#151a20] overflow-hidden ${portfolio.status === "archived" ? "opacity-60" : ""}`}>
                        <div className="p-4 border-b border-ledger-line/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-[#101418]">
                            <div>
                                <h4 className="text-white font-semibold">{portfolio.name}</h4>
                                <p className="text-xs text-[#8793a3]">ID: {portfolio.id} &bull; {portfolio.status}</p>
                            </div>
                            <button 
                                onClick={() => handleToggleArchive(portfolio)}
                                className={`text-xs px-3 py-1.5 rounded flex justify-center items-center transition-colors w-full sm:w-auto ${portfolio.status === "archived" ? "bg-ledger-line text-white hover:bg-ledger-line/80" : "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"}`}
                            >
                                <Archive className="w-3 h-3 inline mr-1" />
                                {portfolio.status === "archived" ? "Unarchive" : "Archive"}
                            </button>
                        </div>

                        <div className="p-4">
                            {editingPortfolioId === portfolio.id ? (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <span className="text-xs uppercase text-ledger-green font-semibold tracking-wider">Edit Members & PSR (%)</span>
                                        <span className="text-xs text-[#8793a3]">Total: {editMembers.reduce((s, m) => s + m.ratio, 0).toFixed(2)}%</span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {editMembers.map(member => {
                                            const globalUser = allUsers.find(u => u.uid === member.code);
                                            const isDeactivated = globalUser?.status === "deactivated";
                                            return (
                                                <div key={member.code} className="flex items-center gap-2">
                                                    <div className={`flex-1 min-w-0 flex items-center border rounded px-2 py-1.5 text-sm ${isDeactivated ? 'bg-red-500/5 border-red-500/30 text-red-400' : 'bg-[#101418] border-ledger-line text-[#8793a3] opacity-70'}`}>
                                                        {isDeactivated && <ShieldAlert className="w-3 h-3 mr-1.5 shrink-0" />}
                                                        <span className="truncate">{member.name}</span>
                                                        {isDeactivated && <span className="ml-auto pl-1 text-[10px] uppercase font-bold text-red-500/70 shrink-0">Deactivated</span>}
                                                    </div>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={member.ratio} 
                                                        onWheel={e => e.currentTarget.blur()}
                                                        onChange={e => updateMemberRatio(member.code, e.target.value)}
                                                        className="w-24 bg-[#101418] border border-ledger-line rounded px-2 py-1.5 text-sm text-white focus:border-ledger-green outline-none" 
                                                    />
                                                    <button onClick={() => removeMemberFromEdit(member.code)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="relative mt-4 pt-4 border-t border-ledger-line/50">
                                        <input 
                                            value={newMemberName} 
                                            onChange={e => {
                                                setNewMemberName(e.target.value);
                                                setShowDropdown(true);
                                            }}
                                            onFocus={() => setShowDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                            placeholder="Search & select a user..." 
                                            className="w-full bg-[#101418] border border-ledger-line rounded px-3 py-2 text-sm text-white focus:border-ledger-green outline-none" 
                                        />
                                        {showDropdown && newMemberName && filteredUsers.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-[#151a20] border border-ledger-line rounded shadow-xl z-10 max-h-40 overflow-y-auto">
                                                {filteredUsers.map(u => (
                                                    <button
                                                        key={u.uid}
                                                        onClick={() => selectUser(u)}
                                                        className="w-full text-left px-3 py-2 text-sm text-[#c1cad6] hover:bg-[#2a2f36] hover:text-white transition-colors"
                                                    >
                                                        {u.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {showDropdown && newMemberName && filteredUsers.length === 0 && (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-[#151a20] border border-ledger-line rounded shadow-xl z-10 p-3">
                                                <p className="text-sm text-[#8793a3] italic">No matching active users found.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-2 mt-4">
                                        <button onClick={() => setEditingPortfolioId(null)} className="px-4 py-2 text-sm text-[#8793a3] hover:text-white">Cancel</button>
                                        <button onClick={() => savePsrChanges(portfolio)} className="px-4 py-2 text-sm bg-ledger-green text-black font-medium rounded flex items-center">
                                            <Save className="w-4 h-4 mr-2" /> Save PSR Version
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs uppercase text-[#8793a3] font-semibold tracking-wider">Current PSR Allocation</span>
                                        <button onClick={() => startEditing(portfolio)} className="text-xs text-ledger-green hover:underline flex items-center">
                                            <Users className="w-3 h-3 mr-1" /> Edit Members
                                        </button>
                                    </div>
                                    {portfolio.members.length === 0 ? (
                                        <p className="text-sm text-[#8793a3] italic">No members assigned.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {portfolio.members.map(m => {
                                                const globalUser = allUsers.find(u => u.uid === m.code);
                                                const isDeactivated = globalUser?.status === "deactivated";
                                                
                                                if (isDeactivated) {
                                                    return (
                                                        <span key={m.code} className="text-xs bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-1 rounded flex items-center" title="User is deactivated. Rebalance PSR.">
                                                            <ShieldAlert className="w-3 h-3 mr-1" />
                                                            {m.name} <strong className="ml-1">{m.ratio}%</strong>
                                                        </span>
                                                    );
                                                }

                                                return (
                                                    <span key={m.code} className="text-xs bg-[#101418] border border-ledger-line text-[#c1cad6] px-2 py-1 rounded">
                                                        {m.name} <strong className="text-white ml-1">{m.ratio}%</strong>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PortfolioManagement;
