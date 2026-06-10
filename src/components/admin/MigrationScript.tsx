import { useState } from "react";
import { collection, doc, getDocs, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";

const MigrationScript = () => {
    const { ledgerUser, firebaseUser } = useAuth();
    const [status, setStatus] = useState<string>("Idle");
    const [loading, setLoading] = useState(false);

    if (ledgerUser?.role !== "owner") {
        return null; // Only Owner can see this
    }

    const runMigration = async () => {
        setLoading(true);
        setStatus("Starting migration...");

        try {
            // 1. Migrate Portfolios & PSR Versions
            setStatus("Migrating portfolios...");
            const alphaRef = doc(db, "portfolios", "portfolioAlpha");
            const betaRef = doc(db, "portfolios", "portfolioBeta");

            const alphaMembers = [
                { code: "P", name: "Prem", ratio: 30 },
                { code: "H", name: "Himanshu", ratio: 40 },
                { code: "Ag", name: "Angat", ratio: 30 },
            ];

            const betaMembers = [
                { code: "P", name: "Prem", ratio: 33.34 },
                { code: "H", name: "Himanshu", ratio: 33.33 },
                { code: "Ana", name: "Anamika", ratio: 33.33 },
            ];

            await setDoc(alphaRef, {
                name: "Portfolio Alpha",
                memberCodes: ["P", "H", "Ag"],
                members: alphaMembers,
                status: "active",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }, { merge: true });

            await setDoc(betaRef, {
                name: "Portfolio Beta",
                memberCodes: ["P", "H", "Ana"],
                members: betaMembers,
                status: "active",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setStatus("Creating PSR Versions...");
            await setDoc(doc(db, "portfolios", "portfolioAlpha", "psrVersions", "v1"), {
                portfolioId: "portfolioAlpha",
                members: alphaMembers,
                validFrom: serverTimestamp(),
                createdByUid: firebaseUser?.uid,
                createdAt: serverTimestamp(),
            }, { merge: true });

            await setDoc(doc(db, "portfolios", "portfolioBeta", "psrVersions", "v1"), {
                portfolioId: "portfolioBeta",
                members: betaMembers,
                validFrom: serverTimestamp(),
                createdByUid: firebaseUser?.uid,
                createdAt: serverTimestamp(),
            }, { merge: true });

            // 2. Migrate Users
            setStatus("Migrating users...");
            const usersSnap = await getDocs(collection(db, "users"));
            const batch = writeBatch(db);

            usersSnap.docs.forEach((userDoc) => {
                const data = userDoc.data();
                const portfolios: string[] = [];
                
                if (data.portfolioAlpha || data.PortfolioAlpha) portfolios.push("portfolioAlpha");
                if (data.portfolioBeta || data.PortfolioBeta) portfolios.push("portfolioBeta");

                // If user doesn't have the new status field, migrate them
                if (!data.status || !data.portfolios) {
                    batch.set(userDoc.ref, {
                        portfolios,
                        status: data.active !== false ? "active" : "deactivated",
                        createdAt: data.createdAt || serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    }, { merge: true });
                }
            });

            await batch.commit();

            setStatus("Migration completed successfully!");
        } catch (error: any) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 border border-ledger-line rounded bg-[#101418] my-4">
            <h3 className="text-white font-semibold mb-2">System Migration (One-Time)</h3>
            <p className="text-sm text-[#8793a3] mb-4">
                Migrates hardcoded Alpha/Beta portfolios into dynamic DB documents, establishes v1 PSR subcollections, and updates User objects.
            </p>
            <button
                onClick={runMigration}
                disabled={loading}
                className="px-4 py-2 bg-ledger-green text-black font-semibold rounded disabled:opacity-50"
            >
                {loading ? "Running..." : "Run Migration"}
            </button>
            <div className="mt-3 text-sm text-[#9aa6b5]">{status}</div>
        </div>
    );
};

export default MigrationScript;
