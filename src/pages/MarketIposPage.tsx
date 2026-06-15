import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getMarketIpos, getMarketIpoMetadata } from "../services/marketIpoService";
import type { MarketIpo, MarketIpoFetchMetadata } from "../types/market-ipo";
import Spinner from "../components/ui/Spinner";
import MarketIpoDetailModal from "../components/ipo/MarketIpoDetailModal";
import DashboardLayout from "../layouts/DashboardLayout";

const titleByBasePath = {
  "/owner": "Owner Dashboard",
  "/manager": "Manager Dashboard",
  "/viewer": "Viewer Dashboard",
} as Record<string, string>;

const MarketIposPage = ({ basePath, canApply = true }: { basePath: string, canApply?: boolean }) => {
  const [ipos, setIpos] = useState<MarketIpo[]>([]);
  const [metadata, setMetadata] = useState<MarketIpoFetchMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIpo, setSelectedIpo] = useState<MarketIpo | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedIpos, fetchedMeta] = await Promise.all([
          getMarketIpos(),
          getMarketIpoMetadata()
        ]);
        setIpos(fetchedIpos);
        setMetadata(fetchedMeta);
      } catch (err) {
        console.error("Failed to fetch market IPOs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeIpos = ipos.filter(i => i.status === 'active');
  const upcomingIpos = ipos.filter(i => i.status === 'upcoming');
  const recentIpos = ipos.filter(i => i.status === 'closed' || i.status === 'listed')
                          .sort((a, b) => new Date(b.closeDate || 0).getTime() - new Date(a.closeDate || 0).getTime())
                          .slice(0, 5);

  if (loading) {
    return (
      <DashboardLayout title={titleByBasePath[basePath] || "Dashboard"} subtitle="Market IPOs">
        <div className="flex h-full items-center justify-center pt-20">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  const formatLastFetched = (iso: string) => {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const IpoCard = ({ ipo }: { ipo: MarketIpo }) => (
    <div 
      className="cursor-pointer rounded border border-ledger-line bg-ledger-panel p-4 transition-all hover:border-ledger-primary hover:shadow-lg"
      onClick={() => setSelectedIpo(ipo)}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-white">{ipo.name}</h3>
        <span className="text-sm font-medium text-white">{ipo.priceBand}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-ledger-muted">
        <div>
          <span className="block">Close: {ipo.closeDate || 'N/A'}</span>
          <span className="block text-ledger-primary">GMP: {ipo.gmp || 'N/A'}</span>
        </div>
        <div className="text-right">
          <span className="inline-block rounded bg-ledger-bg px-2 py-1 uppercase text-[10px] tracking-wider border border-ledger-line">
            {ipo.status}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout 
      title={titleByBasePath[basePath] || "Dashboard"} 
      subtitle="Market IPOs"
      headerRight={
        metadata && (
          <p className="text-xs text-ledger-muted text-right">
            Last updated: {formatLastFetched(metadata.lastFetchedAt)}
          </p>
        )
      }
    >
      <div className="space-y-8">
        <div>
          <h2 className="mb-4 text-2xl font-bold text-white border-b border-ledger-line pb-2 text-center">Active IPOs</h2>
          {activeIpos.length === 0 ? (
            <p className="text-sm text-ledger-muted text-center">No active IPOs found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeIpos.map(ipo => <IpoCard key={ipo.id} ipo={ipo} />)}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-2xl font-bold text-white border-b border-ledger-line pb-2 text-center">Upcoming IPOs</h2>
          {upcomingIpos.length === 0 ? (
            <p className="text-sm text-ledger-muted text-center">No upcoming IPOs found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingIpos.map(ipo => <IpoCard key={ipo.id} ipo={ipo} />)}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-2xl font-bold text-white border-b border-ledger-line pb-2 text-center">Recently Closed (Last 5)</h2>
          {recentIpos.length === 0 ? (
            <p className="text-sm text-ledger-muted text-center">No recent IPOs found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentIpos.map(ipo => <IpoCard key={ipo.id} ipo={ipo} />)}
            </div>
          )}
        </div>
      </div>

      <MarketIpoDetailModal 
        isOpen={!!selectedIpo}
        onClose={() => setSelectedIpo(null)}
        ipo={selectedIpo}
        canApply={canApply}
        basePath={basePath}
      />
    </DashboardLayout>
  );
};

export default MarketIposPage;
