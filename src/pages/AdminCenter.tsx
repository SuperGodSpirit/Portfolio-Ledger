import { useState } from "react";
import { Users, Briefcase } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import UserManagement from "../components/admin/UserManagement";
import PortfolioManagement from "../components/admin/PortfolioManagement";
import { useAuth } from "../context/AuthContext";

const AdminCenter = () => {
    const [activeTab, setActiveTab] = useState<"users" | "portfolios">("users");
    const { ledgerUser } = useAuth();

    return (
        <DashboardLayout title="Dashboard" subtitle="Admin Center">

            <div className="mb-6 flex space-x-1 rounded-lg bg-[#151a20] p-1 border border-ledger-line w-full sm:w-fit">
                <button
                    onClick={() => setActiveTab("users")}
                    className={`flex-1 sm:flex-none flex justify-center items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === "users"
                            ? "bg-[#2a2f36] text-white shadow-sm"
                            : "text-[#8793a3] hover:bg-[#1a2027] hover:text-white"
                    }`}
                >
                    <Users className="h-4 w-4" />
                    <span>Users</span>
                </button>
                <button
                    onClick={() => setActiveTab("portfolios")}
                    className={`flex-1 sm:flex-none flex justify-center items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === "portfolios"
                            ? "bg-[#2a2f36] text-white shadow-sm"
                            : "text-[#8793a3] hover:bg-[#1a2027] hover:text-white"
                    }`}
                >
                    <Briefcase className="h-4 w-4" />
                    <span>Portfolios</span>
                </button>
            </div>

            <div className="bg-[#101418] border border-ledger-line rounded-lg p-6">
                {activeTab === "users" ? <UserManagement /> : <PortfolioManagement />}
            </div>
        </DashboardLayout>
    );
};

export default AdminCenter;
