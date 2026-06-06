import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Portfolio, PortfolioId } from "../types/portfolio";

export const fixedPortfolios: Record<PortfolioId, Omit<Portfolio, "createdAt" | "updatedAt">> = {
  portfolioAlpha: {
    id: "portfolioAlpha",
    name: "Portfolio Alpha",
    memberCodes: ["P", "H", "Ag"],
    members: [
      { code: "P", name: "Prem", ratio: 3 },
      { code: "H", name: "Himanshu", ratio: 4 },
      { code: "Ag", name: "Angat", ratio: 3 },
    ],
    active: true,
  },
  portfolioBeta: {
    id: "portfolioBeta",
    name: "Portfolio Beta",
    memberCodes: ["P", "H", "Ana"],
    members: [
      { code: "P", name: "Prem", ratio: 1 },
      { code: "H", name: "Himanshu", ratio: 1 },
      { code: "Ana", name: "Anamika", ratio: 1 },
    ],
    active: true,
  },
};

export const ensureFixedPortfolios = async () => {
  await Promise.all(
    Object.values(fixedPortfolios).map(async (portfolio) => {
      const portfolioRef = doc(db, "portfolios", portfolio.id);
      const existingPortfolio = await getDoc(portfolioRef);

      await setDoc(
        portfolioRef,
        {
          ...portfolio,
          updatedAt: serverTimestamp(),
          ...(existingPortfolio.exists() ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true },
      );
    }),
  );
};

export const getPortfolios = async (): Promise<Portfolio[]> => {
  await ensureFixedPortfolios();

  const portfoliosQuery = query(collection(db, "portfolios"), orderBy("name", "asc"));
  const snapshot = await getDocs(portfoliosQuery);

  const portfolios = snapshot.docs.map((portfolioDoc) => {
    const data = portfolioDoc.data() as Omit<Portfolio, "id">;

    return {
      ...data,
      id: portfolioDoc.id as PortfolioId,
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  });

  // Fetch all active PSRs
  const psrSnap = await getDocs(collection(db, "profit_sharing_ratios"));
  const activePsrs = new Map(psrSnap.docs.map(doc => [doc.id, doc.data()]));

  // Merge PSR into portfolios
  return portfolios.map(p => {
    const psrData = activePsrs.get(p.id) as any;
    if (psrData && Array.isArray(psrData.members)) {
      // Create a map of member ratios
      const ratioMap = new Map<string, number>(psrData.members.map((m: any) => [m.memberCode, m.ratio]));

      const updatedMembers = p.members.map(m => ({
        ...m,
        ratio: ratioMap.get(m.code) ?? m.ratio
      }));

      return {
        ...p,
        members: updatedMembers
      };
    }
    return p;
  });
};

export const getPortfolioById = (portfolioId: PortfolioId) => fixedPortfolios[portfolioId];
