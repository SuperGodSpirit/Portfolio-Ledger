import { Edit, Archive, RotateCcw } from "lucide-react";
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
      <section className="rounded border border-ledger-line bg-ledger-panel p-8 text-center">
        <h3 className="text-lg font-semibold text-white">No IPO records</h3>
        <p className="mt-2 text-sm text-[#9aa6b5]">No IPOs exist in Firestore for this view.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded border border-ledger-line bg-ledger-panel">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ledger-line bg-[#101418] text-left text-xs uppercase tracking-[0.16em] text-[#8793a3]">
              <th className="px-5 py-4 font-semibold">IPO Name</th>
              <th className="px-5 py-4 font-semibold">Portfolio</th>
              <th className="px-5 py-4 font-semibold">Allotment Date</th>
              <th className="px-5 py-4 font-semibold text-right">Profit/Loss</th>
              <th className="px-5 py-4 font-semibold">Created By</th>
              <th className="px-5 py-4 font-semibold">Last Modified</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              {canManage ? <th className="px-5 py-4 text-right font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {ipos.map((ipo) => (
              <tr key={ipo.id} className="border-b border-ledger-line last:border-0 hover:bg-[#151a20]/50 transition-colors">
                <td className="px-5 py-4 font-semibold">
                  <Link to={`${basePath}/ipos/${ipo.id}`} className="text-white hover:text-ledger-green hover:underline">
                    {ipo.ipoName}
                  </Link>
                </td>
                <td className="px-5 py-4 text-ledger-steel">{ipo.portfolioName}</td>
                <td className="px-5 py-4 text-ledger-steel">{ipo.allotmentDate}</td>
                <td className="px-5 py-4 text-right">
                  {(() => {
                    const pl = ipo.calculationSnapshot?.totalProfitLoss ?? 0;
                    return (
                      <span className={`font-semibold ${pl > 0 ? "text-ledger-green" : pl < 0 ? "text-red-400" : "text-white"}`}>
                        {formatPL(pl)}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-5 py-4 text-ledger-steel">{ipo.createdByName}</td>
                <td className="px-5 py-4 text-ledger-steel">{formatTimestamp(ipo)}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                      ipo.status === "active"
                        ? "border-ledger-green/40 text-ledger-green"
                        : "border-ledger-line text-[#9aa6b5]"
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

      <div className="md:hidden flex flex-col">
        {ipos.map((ipo) => (
          <div key={ipo.id} className="border-b border-ledger-line p-5 last:border-0 hover:bg-[#151a20]/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <Link to={`${basePath}/ipos/${ipo.id}`} className="block font-semibold text-white hover:text-ledger-green hover:underline text-lg mb-1">
                  {ipo.ipoName}
                </Link>
                <div className="text-sm text-ledger-steel">{ipo.portfolioName} &bull; {ipo.allotmentDate}</div>
              </div>
              <span
                className={`rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  ipo.status === "active"
                    ? "border-ledger-green/40 text-ledger-green"
                    : "border-ledger-line text-[#9aa6b5]"
                }`}
              >
                {ipo.status === "active" ? "Active" : "Archived"}
              </span>
            </div>
            
            <div className="flex justify-between items-end mb-4">
              <div className="text-sm">
                <div className="text-[#8793a3] text-xs uppercase tracking-wider mb-1">Profit/Loss</div>
                {(() => {
                  const pl = ipo.calculationSnapshot?.totalProfitLoss ?? 0;
                  return (
                    <span className={`font-semibold ${pl > 0 ? "text-ledger-green" : pl < 0 ? "text-red-400" : "text-white"}`}>
                      {formatPL(pl)}
                    </span>
                  );
                })()}
              </div>
              <div className="text-right text-xs text-ledger-steel">
                <div>By {ipo.createdByName}</div>
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
