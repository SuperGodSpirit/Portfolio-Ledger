
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    where,
    serverTimestamp,
    setDoc,
    addDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Portfolio, PortfolioId, PortfolioMember, PsrVersion } from "../types/portfolio";

export const getPortfolios = async (): Promise<Portfolio[]> => {
    const portfoliosQuery = query(
        collection(db, "portfolios"), 
        orderBy("name", "asc")
    );
    
    const snapshot = await getDocs(portfoliosQuery);

    return snapshot.docs.map((portfolioDoc) => {
        const data = portfolioDoc.data() as Omit<Portfolio, "id">;
        return {
            ...data,
            id: portfolioDoc.id,
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
        };
    });
};

export const getPortfolioById = async (portfolioId: PortfolioId): Promise<Portfolio | null> => {
    const portfolioRef = doc(db, "portfolios", portfolioId);
    const snapshot = await getDoc(portfolioRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Omit<Portfolio, "id">;
    return {
        ...data,
        id: snapshot.id,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
    };
};

export const createPsrVersion = async (
    portfolioId: PortfolioId,
    members: PortfolioMember[],
    createdByUid: string
): Promise<string> => {
    const psrRef = collection(db, "portfolios", portfolioId, "psrVersions");
    
    // Determine the next version number
    const psrSnap = await getDocs(psrRef);
    const nextVersion = `v${psrSnap.size + 1}`;

    const newVersion: Omit<PsrVersion, "id"> = {
        portfolioId,
        members,
        validFrom: serverTimestamp() as any,
        createdByUid,
        createdAt: serverTimestamp() as any,
    };

    const docRef = await setDoc(doc(psrRef, nextVersion), newVersion);
    return nextVersion;
};
