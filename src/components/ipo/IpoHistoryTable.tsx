import { Edit, Archive, RotateCcw, FileClock } from "lucide-react";
import { Link } from "react-router-dom";
import type { IpoRecord } from "../../types/ipo";
import Button from "../ui/Button";

type IpoHistoryTableProps = {
  ipos: IpoRecord[];
  basePath: string;
  canManage: boolean;
  onArchive: (ipoId: string) => Promise<void>;
  onRestore: (ipoId: string) => Promise<void>;
};

const formatTimestamp = (ipo: IpoRecord) => {
  const timestamp = ipo.updatedAt ?? ipo.createdAt;

  if (!timestamp) {
    return "Not available";
  }

  return timestamp.toDate().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatPL = (amount: number) => {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const formatted = Math.abs(amount).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  if (isPositive) return `+${formatted}`;
  if (isNegative) return `-${formatted}`;
  return formatted;
};

const IpoHistoryTable = ({ ipos, basePath, canManage, onArchive, onRestore }: IpoHistoryTableProps) => {
  if (ipos.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-ledger-panel/80 p-12 text-center backdrop-blur-md opacity-80">
        <FileClock className="h-12 w-12 text-ledger-gray mb-4" />
        <h3 className="text-lg font-semibold text-white">No IPO records</h3>
        <p className="mt-2 text-sm text-ledger-gray">No IPOs exist in Firestore for this view.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-white/5 bg-[#0a0d11] shadow-xl">
      <div className="hidden md:block overflow-x-auto hide-scrollbar">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-[#12171c] text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[#8793a3]">
              <th className="px-5 py-4">IPO Name</th>
              <th className="px-5 py-4">Portfolio</th>
              <th className="px-5 py-4">Allotment Date</th>
              <th className="px-5 py-4 text-right">Profit/Loss</th>
              <th className="px-5 py-4">Created By</th>
              <th className="px-5 py-4">Last Modified</th>
              <th className="px-5 py-4">Status</th>
              {canManage ? <th className="px-5 py-4 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {ipos.map((ipo) => (
              <tr key={ipo.id} className="border-b border-white/5 last:border-0 hover:bg-[#12171c]/80 transition-colors">
                <td className="px-5 py-4 font-semibold whitespace-nowrap">
                  <Link to={`${basePath}/ipos/${ipo.id}`} className="text-white hover:text-ledger-green transition-colors">
                    {ipo.ipoName}
                  </Link>
                </td>
                <td className="px-5 py-4 font-mono text-ledger-steel whitespace-nowrap">{ipo.portfolioName}</td>
                <td className="px-5 py-4 font-mono text-[#8793a3] whitespace-nowrap">{ipo.allotmentDate}</td>
                <td className="px-5 py-4 text-right whitespace-nowrap">
                  {(() => {
                    const pl = ipo.calculationSnapshot?.totalProfitLoss ?? 0;
                    return (
                      <span className={`font-mono font-semibold tracking-tight ${pl > 0 ? "text-ledger-green" : pl < 0 ? "text-ledger-red" : "text-white"}`}>
                        {formatPL(pl)}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-5 py-4 text-ledger-steel whitespace-nowrap">{ipo.createdByName}</td>
                <td className="px-5 py-4 font-mono text-[#8793a3] whitespace-nowrap">{formatTimestamp(ipo)}</td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <span
                    className={`rounded px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] border ${
                      ipo.status === "active"
                        ? "bg-[#1c2c42] text-[#60a5fa] border-[#2563eb]/30"
                        : "bg-[#2a3038] text-[#9aa6b5] border-[#4b5563]/30"
                    }`}
                  >
                    {ipo.status === "active" ? "Active" : "Archived"}
                  </span>
                </td>
                {canManage ? (
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link to={`${basePath}/ipos/${ipo.id}/edit`}>
                        <Button type="button" variant="secondary" className="min-h-9 px-3">
                          <Edit className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Button>
                      </Link>
                      {ipo.status === "active" ? (
                        <Button
                          type="button"
                          variant="danger"
                          className="min-h-9 px-3"
                          onClick={() => onArchive(ipo.id)}
                        >
                          <Archive className="h-4 w-4" aria-hidden="true" />
                          Archive
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-3 !border-ledger-green/50 !text-ledger-green hover:!bg-ledger-green/10"
                          onClick={() => onRestore(ipo.id)}
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-3 p-4 bg-[#101418]">
        {ipos.map((ipo) => (
          <div key={ipo.id} className="rounded-xl border border-white/5 bg-ledger-panel p-5 transition-colors shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <Link to={`${basePath}/ipos/${ipo.id}`} className="block font-semibold text-white hover:text-ledger-green hover:underline text-lg mb-1">
                  {ipo.ipoName}
                </Link>
                <div className="text-sm font-mono text-ledger-steel">{ipo.portfolioName} &bull; {ipo.allotmentDate}</div>
              </div>
              <span
                className={`rounded px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest ${
                  ipo.status === "active"
                    ? "bg-ledger-blue/20 text-ledger-blue"
                    : "bg-ledger-gray/20 text-ledger-gray"
                }`}
              >
                {ipo.status === "active" ? "Active" : "Archived"}
              </span>
            </div>
            
            <div className="flex justify-between items-end mb-4 mt-2">
              <div className="text-sm">
                <div className="text-ledger-gray font-mono text-[10px] uppercase tracking-widest mb-1">Profit/Loss</div>
                {(() => {
                  const pl = ipo.calculationSnapshot?.totalProfitLoss ?? 0;
                  return (
                    <span className={`font-mono text-lg font-semibold ${pl > 0 ? "text-ledger-green" : pl < 0 ? "text-ledger-red" : "text-white"}`}>
                      {formatPL(pl)}
                    </span>
                  );
                })()}
              </div>
              <div className="text-right text-xs text-ledger-steel font-mono">
                <div className="mb-1">By {ipo.createdByName}</div>
                <div>{formatTimestamp(ipo)}</div>
              </div>
            </div>

            {canManage ? (
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-ledger-line/50">
                <Link to={`${basePath}/ipos/${ipo.id}/edit`} className="flex-1">
                  <Button type="button" variant="secondary" className="w-full min-h-9 px-3 justify-center">
                    <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                    Edit
                  </Button>
                </Link>
                {ipo.status === "active" ? (
                  <Button
                    type="button"
                    variant="danger"
                    className="flex-1 min-h-9 px-3 justify-center"
                    onClick={() => onArchive(ipo.id)}
                  >
                    <Archive className="h-4 w-4 mr-2" aria-hidden="true" />
                    Archive
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 min-h-9 px-3 justify-center !border-ledger-green/50 !text-ledger-green hover:!bg-ledger-green/10"
                    onClick={() => onRestore(ipo.id)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
                    Restore
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
};

export default IpoHistoryTable;
