import React from "react";
import { Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const PendingAccess = () => {
    const { firebaseUser, logout } = useAuth();

    if (!firebaseUser) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-[#0a0d11] text-white flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#101418] border border-ledger-line rounded p-8 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center">
                        <Lock className="w-8 h-8 text-orange-400" />
                    </div>
                </div>
                
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Access Pending</h2>
                    <p className="text-[#8793a3] text-sm">
                        Your account has been created successfully, but it needs to be approved and assigned to a portfolio by an administrator.
                    </p>
                </div>

                <div className="pt-4 border-t border-ledger-line/50">
                    <a
                        href="https://t.me/Hi403tou4"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center px-4 py-3 bg-ledger-green text-black font-semibold rounded hover:bg-ledger-green/90 transition-colors"
                    >
                        Request Access via Telegram
                    </a>
                </div>

                <button
                    onClick={logout}
                    className="mt-4 text-sm text-[#8793a3] hover:text-white transition-colors"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default PendingAccess;
