import { collection, doc, getDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import type { MarketIpo, MarketIpoFetchMetadata } from "../types/market-ipo";

export const getMarketIpos = async (): Promise<MarketIpo[]> => {
  const q = query(
    collection(db, "market_ipos"),
    // Not using orderBy here directly to avoid requiring a composite index immediately,
    // we can sort in memory for now since the list is small.
  );
  
  const snapshot = await getDocs(q);
  const ipos: MarketIpo[] = [];
  snapshot.forEach((doc) => {
    ipos.push(doc.data() as MarketIpo);
  });
  
  return ipos;
};

export const getMarketIpoMetadata = async (): Promise<MarketIpoFetchMetadata | null> => {
  const docRef = doc(db, "market_ipos_meta", "metadata");
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data() as MarketIpoFetchMetadata;
  }
  return null;
};
