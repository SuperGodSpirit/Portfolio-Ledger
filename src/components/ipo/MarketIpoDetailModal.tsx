import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import type { MarketIpo } from "../../types/market-ipo";
import { getPortfolios } from "../../services/portfolioService";
import type { Portfolio } from "../../types/portfolio";
import Spinner from "../ui/Spinner";

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

  return (
    <Modal title="IPO Details" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 text-sm text-ledger-text">
        <div>
          <h3 className="text-base font-bold text-white">{ipo.name}</h3>
          <p className="mt-1 text-xs text-ledger-muted">
            Status: <span className="uppercase text-ledger-primary">{ipo.status}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-y border-ledger-line py-3">
          <div>
            <span className="block text-xs text-ledger-muted">Issue Price</span>
            <span className="font-medium text-white">{ipo.priceBand}</span>
          </div>
          <div>
            <span className="block text-xs text-ledger-muted">GMP</span>
            <span className="font-medium text-white">{ipo.gmp || 'N/A'}</span>
          </div>
          <div>
            <span className="block text-xs text-ledger-muted">Open Date</span>
            <span className="font-medium text-white">{ipo.openDate || 'N/A'}</span>
          </div>
          <div>
            <span className="block text-xs text-ledger-muted">Close Date</span>
            <span className="font-medium text-white">{ipo.closeDate || 'N/A'}</span>
          </div>
          <div>
            <span className="block text-xs text-ledger-muted">Listing Date</span>
            <span className="font-medium text-white">{ipo.listingDate || 'N/A'}</span>
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
              View detailed report on Chittorgarh
            </a>
          </div>
        )}

        {canApply && (
          <div className="mt-6 space-y-3 rounded bg-ledger-bg p-3 border border-ledger-line">
            <h4 className="font-medium text-white">Apply to Portfolio</h4>
            {loading ? (
              <div className="flex justify-center p-2"><Spinner /></div>
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
                  Apply Now
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MarketIpoDetailModal;
