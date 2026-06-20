import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import type { MarketIpo } from "../../types/market-ipo";
import { getPortfolios } from "../../services/portfolioService";
import type { Portfolio } from "../../types/portfolio";
import { Loader2 } from "lucide-react";
import IpoOutlookSection from "./IpoOutlookSection";

type MarketIpoDetailModalProps = {
  ipo: MarketIpo | null;
  isOpen: boolean;
  onClose: () => void;
  canApply: boolean;
  basePath: string;
};

const MarketIpoDetailModal = ({ ipo, isOpen, onClose, canApply, basePath }: MarketIpoDetailModalProps) => {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");

  useEffect(() => {
    if (isOpen && canApply) {
      setLoading(true);
      getPortfolios()
        .then((data) => {
          setPortfolios(data);
          if (data.length > 0) {
            setSelectedPortfolioId(data[0].id);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, canApply]);

  if (!ipo) return null;

  const handleApply = () => {
    if (!selectedPortfolioId) return;
    const portfolio = portfolios.find(p => p.id === selectedPortfolioId);
    if (!portfolio) return;

    navigate(`${basePath}/ipos/add`, {
      state: {
        prefillIpoName: ipo.name,
        prefillLotValue: ipo.priceBand ? parseFloat(ipo.priceBand.replace(/[^0-9.]/g, '')) : null,
        prefillPortfolioId: portfolio.id,
        prefillPortfolioName: portfolio.name,
      }
    });
    onClose();
  };

  const parsePrice = (str: string | null | undefined) => {
    if (!str || str === 'N/A' || str === '-') return null;
    const match = str.match(/(\d+(\.\d+)?)/g);
    if (match && match.length > 0) {
      return parseFloat(match[match.length - 1]); // take upper band
    }
    return null;
  };

  const priceVal = parsePrice(ipo.priceBand);
  const gmpVal = parsePrice(ipo.gmp);
  
  let estListing = 'N/A';
  let percentage = '';
  if (priceVal !== null && gmpVal !== null && priceVal > 0) {
    const total = priceVal + gmpVal;
    const pct = ((gmpVal / priceVal) * 100).toFixed(2);
    estListing = `₹${total}`;
    percentage = ` (${gmpVal >= 0 ? '+' : ''}${pct}%)`;
  }

  const isEstimated = ipo.status === 'active' || ipo.status === 'upcoming';
  const profitLabel = isEstimated ? "Est. Profit / Share" : "Profit / Share";
  const listingLabel = isEstimated ? "Est. Listing Price" : "Listing Price";

  return (
    <Modal title="IPO Details" isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-4 text-sm text-ledger-text">
        <div className="flex items-center justify-between border-b border-ledger-line pb-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">{ipo.name}</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {ipo.status === 'active' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ledger-primary opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ipo.status === 'active' ? 'bg-ledger-primary' : ipo.status === 'upcoming' ? 'bg-yellow-400' : 'bg-ledger-muted'}`}></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-ledger-muted">
                {ipo.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="bg-ledger-bg/50 p-3 rounded-lg border border-ledger-line/50 transition-colors hover:border-ledger-line hover:bg-ledger-bg group">
            <span className="block text-[10px] uppercase tracking-wider text-ledger-muted mb-1 group-hover:text-ledger-primary/80 transition-colors">Issue Price</span>
            <span className="font-mono text-sm font-semibold text-white">{ipo.priceBand !== 'N/A' && ipo.priceBand !== '-' ? `₹${ipo.priceBand.replace(/[^0-9.-]/g, '')}` : 'N/A'}</span>
          </div>
          
          <div className="bg-ledger-bg/50 p-3 rounded-lg border border-ledger-line/50 transition-colors hover:border-ledger-line hover:bg-ledger-bg group">
            <span className="block text-[10px] uppercase tracking-wider text-ledger-muted mb-1 group-hover:text-ledger-primary/80 transition-colors" title="Grey Market Premium">{profitLabel}</span>
            <span className={`font-mono text-sm font-semibold ${gmpVal !== null && gmpVal > 0 ? 'text-ledger-green' : gmpVal !== null && gmpVal < 0 ? 'text-red-400' : 'text-white'}`}>
              {ipo.gmp && ipo.gmp !== 'N/A' && ipo.gmp !== '-' ? `₹${ipo.gmp.replace(/[^0-9.-]/g, '')}` : 'N/A'}
            </span>
          </div>

          <div className="bg-ledger-bg/50 p-3 rounded-lg border border-ledger-line/50 transition-colors hover:border-ledger-line hover:bg-ledger-bg group">
            <span className="block text-[10px] uppercase tracking-wider text-ledger-muted mb-1 group-hover:text-ledger-primary/80 transition-colors">{listingLabel}</span>
            <span className="font-mono text-sm font-semibold text-white flex items-baseline gap-1.5">
              {estListing}
              {percentage && (
                <span className={`text-[11px] font-medium ${gmpVal !== null && gmpVal > 0 ? 'bg-ledger-green/10 text-ledger-green px-1.5 py-0.5 rounded' : gmpVal !== null && gmpVal < 0 ? 'bg-red-400/10 text-red-400 px-1.5 py-0.5 rounded' : 'text-ledger-muted'}`}>
                  {percentage.replace('(', '').replace(')', '')}
                </span>
              )}
            </span>
          </div>

          <div className="bg-ledger-bg/50 p-3 rounded-lg border border-ledger-line/50 transition-colors hover:border-ledger-line hover:bg-ledger-bg group">
            <span className="block text-[10px] uppercase tracking-wider text-ledger-muted mb-1 group-hover:text-ledger-primary/80 transition-colors">Lot / Min Inv.</span>
            <span className="font-mono text-sm font-semibold text-white flex flex-col sm:flex-row sm:items-baseline gap-1">
              <span>{ipo.lotSize ? `${ipo.lotSize}` : 'N/A'}</span> 
              {ipo.minInvestment && <span className="text-[11px] text-ledger-muted font-normal">{ipo.minInvestment.startsWith('₹') ? ipo.minInvestment : `₹${ipo.minInvestment}`}</span>}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pb-2">
          <div className="bg-gradient-to-br from-ledger-panel to-ledger-bg p-2.5 rounded-lg border border-ledger-line/40 text-center">
            <span className="block text-[9px] uppercase tracking-widest text-ledger-muted/70 mb-0.5">Open</span>
            <span className="font-medium text-xs text-white/90">{ipo.openDate || '-'}</span>
          </div>
          <div className="bg-gradient-to-br from-ledger-panel to-ledger-bg p-2.5 rounded-lg border border-ledger-line/40 text-center">
            <span className="block text-[9px] uppercase tracking-widest text-ledger-muted/70 mb-0.5">Close</span>
            <span className="font-medium text-xs text-white/90">{ipo.closeDate || '-'}</span>
          </div>
          <div className="bg-gradient-to-br from-ledger-panel to-ledger-bg p-2.5 rounded-lg border border-ledger-line/40 text-center">
            <span className="block text-[9px] uppercase tracking-widest text-ledger-muted/70 mb-0.5">Listing</span>
            <span className="font-medium text-xs text-white/90">{ipo.listingDate || '-'}</span>
          </div>
        </div>

        {ipo.sourceLink && (
          <div className="text-xs">
            <a 
              href={ipo.sourceLink.startsWith('http') ? ipo.sourceLink : `https://www.chittorgarh.com${ipo.sourceLink}`} 
              target="_blank" 

              rel="noopener noreferrer"
              className="text-ledger-primary hover:underline"
            >
              View detailed report on IPOWatch
            </a>
          </div>
        )}

        {canApply && ipo.status === 'active' && (
          <div className="mt-6 space-y-3 rounded bg-ledger-bg p-4 border border-ledger-line">
            <div>
              <h4 className="font-medium text-white">Record Participation</h4>
              <p className="mt-1 text-xs text-ledger-muted leading-relaxed">
                Users independently apply for IPOs through their own brokers and accounts. Portfolio Ledger only records and tracks participation information.
              </p>
            </div>
            {loading ? (
              <div className="flex min-h-[92px] items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-ledger-primary" />
              </div>
            ) : (
              <>
                <select
                  className="w-full rounded border border-ledger-line bg-ledger-panel px-3 py-2 text-sm text-white focus:border-ledger-primary focus:outline-none"
                  value={selectedPortfolioId}
                  onChange={(e) => setSelectedPortfolioId(e.target.value)}
                >
                  <option value="" disabled>Select a portfolio...</option>
                  {portfolios.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Button 
                  onClick={handleApply} 
                  disabled={!selectedPortfolioId}
                  className="w-full"
                >
                  Add to Portfolio Ledger
                </Button>
              </>
            )}
          </div>
        )}

        <IpoOutlookSection ipo={ipo} />
      </div>
    </Modal>
  );
};

export default MarketIpoDetailModal;
