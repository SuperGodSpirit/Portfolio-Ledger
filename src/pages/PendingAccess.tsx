import React from "react";
import { Lock, Search, Users, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const PendingAccess = () => {
    const { firebaseUser, logout } = useAuth();

    if (!firebaseUser) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-[#0a0d11] text-white flex flex-col md:flex-row">
            {/* Desktop Left / Mobile Bottom: Intro Section */}
            <div className="flex-1 p-6 md:p-12 lg:p-20 order-2 md:order-1 flex flex-col justify-center border-t md:border-t-0 md:border-r border-ledger-line">
                <div className="max-w-xl mx-auto md:mx-0 w-full space-y-12">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Portfolio Ledger</h1>
                        <p className="text-[#8793a3] text-lg leading-relaxed">
                            A centralized platform for structured IPO evaluation, coordinated applications, and transparent tracking.
                        </p>
                    </div>

                    <div className="space-y-10">
                        {/* Feature 1 */}
                        <div className="flex items-start gap-5">
                            <div className="w-12 h-12 rounded-xl bg-ledger-blue/10 border border-ledger-blue/20 flex items-center justify-center shrink-0">
                                <Search className="w-6 h-6 text-ledger-blue" />
                            </div>
                            <div>
                                <h3 className="text-white text-lg font-semibold mb-2">Research & Evaluation</h3>
                                <p className="text-[#8793a3] text-sm leading-relaxed">
                                    Every IPO opportunity undergoes structured evaluation before applications are submitted.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex items-start gap-5">
                            <div className="w-12 h-12 rounded-xl bg-ledger-green/10 border border-ledger-green/20 flex items-center justify-center shrink-0">
                                <Users className="w-6 h-6 text-ledger-green" />
                            </div>
                            <div>
                                <h3 className="text-white text-lg font-semibold mb-2">Group-Based Applications</h3>
                                <p className="text-[#8793a3] text-sm leading-relaxed">
                                    Applications are coordinated across members to improve overall allocation efficiency.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex items-start gap-5">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                <Shield className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-white text-lg font-semibold mb-2">Portfolio Governance</h3>
                                <p className="text-[#8793a3] text-sm leading-relaxed">
                                    Role-based access controls ensure members only see portfolios and information they are authorized to access.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Right / Mobile Top: Access Pending Card */}
            <div className="w-full md:w-[450px] lg:w-[500px] p-6 md:p-12 lg:p-16 order-1 md:order-2 flex flex-col justify-center bg-[#101418] md:bg-transparent">
                <div className="w-full bg-[#151a20] md:bg-[#101418] border border-ledger-line rounded-xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
                    {/* Subtle top border highlight */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-orange-500/50"></div>
                    
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center ring-4 ring-orange-500/5">
                            <Lock className="w-8 h-8 text-orange-400" />
                        </div>
                    </div>
                    
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-500/10 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-4">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                            Pending Approval
                        </div>
                        <h2 className="text-xl font-bold text-white mb-3">Account Status</h2>
                        <p className="text-[#8793a3] text-sm leading-relaxed">
                            Your account has been created successfully.
                            <br />
                            An administrator must grant portfolio access before the platform becomes available.
                        </p>
                    </div>

                    <div className="pt-6 border-t border-ledger-line/50 flex flex-col gap-3">
                        <a
                            href="https://t.me/Hi403tou4"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full flex items-center justify-center px-4 py-3 bg-ledger-green text-black font-semibold rounded hover:bg-ledger-green/90 transition-colors"
                        >
                            Request Access via Telegram
                        </a>
                        <button
                            onClick={logout}
                            className="w-full px-4 py-3 text-sm text-[#8793a3] hover:text-white hover:bg-white/5 rounded transition-colors font-medium"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PendingAccess;
