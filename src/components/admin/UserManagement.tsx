import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import type { LedgerUser } from "../../types/user";
import type { Portfolio } from "../../types/portfolio";
import { getPortfolios } from "../../services/portfolioService";
import Spinner from "../ui/Spinner";
import { ShieldAlert, UserX, CheckCircle, Clock } from "lucide-react";

const UserManagement = () => {
    const [users, setUsers] = useState<LedgerUser[]>([]);
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersSnap, ports] = await Promise.all([
                getDocs(collection(db, "users")),
                getPortfolios()
            ]);

            const usersData = usersSnap.docs.map(d => {
                const data = d.data();
                return {
                    uid: d.id,
                    name: data.name,
                    role: data.role,
                    status: data.status || (data.active !== false ? "active" : "deactivated"),
                    portfolios: data.portfolios || [],
                } as LedgerUser;
            });

            // Sort users: Owner -> Manager -> Viewer, then alphabetically by name
            usersData.sort((a, b) => {
                const roleOrder: Record<string, number> = { owner: 1, manager: 2, viewer: 3 };
                const orderA = roleOrder[a.role] || 4;
                const orderB = roleOrder[b.role] || 4;
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });
            
            setUsers(usersData);
            setPortfolios(ports.filter(p => p.status !== "archived"));
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateUser = async (uid: string, updates: Partial<LedgerUser>) => {
        try {
            await updateDoc(doc(db, "users", uid), {
                ...updates,
                updatedAt: serverTimestamp()
            });
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...updates } : u));
        } catch (error) {
            console.error("Failed to update user:", error);
            alert("Failed to update user. Please try again.");
        }
    };

    const togglePortfolio = (user: LedgerUser, portfolioId: string) => {
        const hasIt = user.portfolios.includes(portfolioId);
        const newPortfolios = hasIt 
            ? user.portfolios.filter(id => id !== portfolioId)
            : [...user.portfolios, portfolioId];
        
        handleUpdateUser(user.uid, { portfolios: newPortfolios });
    };

    const StatusBadge = ({ status }: { status: string }) => {
        if (status === "active") return <span className="flex items-center text-xs text-ledger-green bg-ledger-green/10 px-2 py-1 rounded"><CheckCircle className="w-3 h-3 mr-1"/> Active</span>;
        if (status === "pending") return <span className="flex items-center text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded"><Clock className="w-3 h-3 mr-1"/> Pending</span>;
        return <span className="flex items-center text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded"><UserX className="w-3 h-3 mr-1"/> Deactivated</span>;
    };

    if (loading) return <Spinner label="Loading users..." />;

    return (
        <div className="space-y-6">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[#8793a3] uppercase bg-[#151a20] border-b border-ledger-line">
                        <tr>
                            <th className="px-4 py-3 font-semibold">User</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Role</th>
                            <th className="px-4 py-3 font-semibold">Assigned Portfolios</th>
                            <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.uid} className="border-b border-ledger-line last:border-0 hover:bg-[#151a20]/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                                <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                                <td className="px-4 py-3 text-[#9aa6b5] capitalize">{user.role}</td>
                                <td className="px-4 py-3">
                                    {(user.role === 'owner' || user.role === 'manager') ? (
                                        <span className="text-xs text-[#8793a3] italic">All Portfolios (Full Access)</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                            {portfolios.map(p => {
                                                const isAssigned = user.portfolios.includes(p.id);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => togglePortfolio(user, p.id)}
                                                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                                                            isAssigned 
                                                                ? "bg-ledger-green/20 border-ledger-green text-ledger-green" 
                                                                : "bg-transparent border-ledger-line text-[#8793a3] hover:text-white"
                                                        }`}
                                                    >
                                                        {p.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {(user.role === 'owner' || user.role === 'manager') ? (
                                        <span className="text-xs text-[#8793a3] italic flex items-center justify-end w-full">Admin</span>
                                    ) : user.status === "pending" ? (
                                        <button 
                                            onClick={() => handleUpdateUser(user.uid, { status: "active" })}
                                            className="text-ledger-green hover:text-ledger-green/80 text-xs flex items-center justify-end w-full"
                                        >
                                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                        </button>
                                    ) : user.status === "active" ? (
                                        <button 
                                            onClick={() => handleUpdateUser(user.uid, { status: "deactivated" })}
                                            className="text-red-400 hover:text-red-300 text-xs flex items-center justify-end w-full"
                                        >
                                            <ShieldAlert className="w-3 h-3 mr-1" /> Deactivate
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleUpdateUser(user.uid, { status: "active" })}
                                            className="text-ledger-green hover:text-ledger-green/80 text-xs flex items-center justify-end w-full"
                                        >
                                            <CheckCircle className="w-3 h-3 mr-1" /> Reactivate
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
