import { useMemo } from "react";
import type { CalculationSnapshot } from "../../types/ipo";
import { MoveRight } from "lucide-react";

type SettlementPreviewProps = {
  snapshot: CalculationSnapshot;
  onToggleSettlement?: (instructionId: string, currentStatus: "pending" | "settled") => void;
};

const SettlementPreview = ({ snapshot, onToggleSettlement }: SettlementPreviewProps) => {
  const isProfit = snapshot.totalProfitLoss > 0;
  const isLoss = snapshot.totalProfitLoss < 0;
  const isNeutral = snapshot.totalProfitLoss === 0;

  return (
    <section className="space-y-6 rounded border border-ledger-line bg-ledger-panel p-5">
      <div>
        <h3 className="text-base font-semibold text-white">Settlement Preview</h3>
        <p className="mt-1 text-sm text-[#9aa6b5]">
          Calculated automatically based on actual inputs and Profit Sharing Ratio (PSR).
        </p>
      </div>

      <div className="rounded border border-ledger-amber/20 bg-ledger-amber/5 p-4">
        <p className="text-xs leading-relaxed text-ledger-amber/90">
          <strong>Important:</strong> Settlement information displayed by Portfolio Ledger is generated solely from user-provided records and predefined allocation ratios. Portfolio Ledger does not process payments, facilitate transfers, collect debts, enforce obligations, or act as an intermediary. Users are solely responsible for independently verifying all figures before taking action.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* P/L Summary */}
        <div className="rounded border border-ledger-line bg-[#101418] p-4">
          <div className="text-sm font-medium text-[#c1cad6]">Total Portfolio P/L</div>
          <div className="mt-2 flex items-baseline gap-3">
            <div
              className={`text-3xl font-semibold tracking-tight ${
                isProfit ? "text-ledger-green" : isLoss ? "text-red-500" : "text-white"
              }`}
            >
              {isProfit ? "+" : ""}
              {(snapshot.totalProfitLoss || 0).toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
              })}
            </div>
            {snapshot.totalInvestment ? (
              <div
                className={`text-lg font-medium ${
                  isProfit ? "text-ledger-green/80" : isLoss ? "text-red-500/80" : "text-[#9aa6b5]"
                }`}
              >
                {isProfit ? "+" : ""}
                {((snapshot.totalProfitLoss / snapshot.totalInvestment) * 100).toFixed(2)}%
              </div>
            ) : null}
          </div>
        </div>

        {/* Member Entitlements Table */}
        <div className="rounded border border-ledger-line bg-[#101418] p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ledger-line bg-[#151a20] text-left text-xs uppercase tracking-[0.16em] text-[#8793a3]">
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold text-right">Actual</th>
                  <th className="px-4 py-3 font-semibold text-right">Entitled</th>
                  <th className="px-4 py-3 font-semibold text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {(snapshot.memberEntitlements || []).map((entitlement) => (
                  <tr key={entitlement.memberCode} className="border-b border-ledger-line last:border-0">
                    <td className="px-4 py-3 text-white font-medium">{entitlement.memberName}</td>
                    <td className="px-4 py-3 text-right text-[#9aa6b5]">
                      {entitlement.actual.toLocaleString("en-IN")}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        entitlement.entitled > 0 ? "text-ledger-green" : entitlement.entitled < 0 ? "text-red-500" : "text-white"
                      }`}
                    >
                      {entitlement.entitled > 0 ? "+" : ""}
                      {entitlement.entitled.toLocaleString("en-IN")}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        entitlement.net > 0 ? "text-red-400" : entitlement.net < 0 ? "text-ledger-green" : "text-[#9aa6b5]"
                      }`}
                    >
                      {entitlement.net > 0 ? "-" : entitlement.net < 0 ? "+" : ""}
                      {Math.abs(entitlement.net).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden flex flex-col">
            {(snapshot.memberEntitlements || []).map((entitlement) => (
              <div key={entitlement.memberCode} className="border-b border-ledger-line p-4 last:border-0">
                <div className="font-medium text-white mb-3">{entitlement.memberName}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-[#8793a3] uppercase tracking-wider mb-1">Actual</div>
                    <div className="text-sm text-[#9aa6b5]">{entitlement.actual.toLocaleString("en-IN")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#8793a3] uppercase tracking-wider mb-1">Entitled</div>
                    <div
                      className={`text-sm font-medium ${
                        entitlement.entitled > 0 ? "text-ledger-green" : entitlement.entitled < 0 ? "text-red-500" : "text-white"
                      }`}
                    >
                      {entitlement.entitled > 0 ? "+" : ""}
                      {entitlement.entitled.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-ledger-line/50">
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-[#8793a3] uppercase tracking-wider">Net</div>
                      <div
                        className={`text-sm font-medium ${
                          entitlement.net > 0 ? "text-red-400" : entitlement.net < 0 ? "text-ledger-green" : "text-[#9aa6b5]"
                        }`}
                      >
                        {entitlement.net > 0 ? "-" : entitlement.net < 0 ? "+" : ""}
                        {Math.abs(entitlement.net).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded border border-ledger-line bg-[#101418] p-4">
        <div className="mb-4 text-sm font-medium text-[#c1cad6]">Optimized Settlement Instructions</div>
        {!(snapshot.settlementInstructions?.length > 0) ? (
          <div className="text-sm text-[#9aa6b5] italic">No settlements required. All accounts are balanced.</div>
        ) : (
          <ul className="space-y-3">
            {(snapshot.settlementInstructions || []).map((instruction, index) => (
              <li key={instruction.id || index} className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm p-3 rounded bg-[#151a20] border border-ledger-line">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-medium text-white min-w-16">{instruction.from}</span>
                  <span className="text-[#8793a3]">pays</span>
                  <span className="font-semibold text-ledger-green">
                    {instruction.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                  </span>
                  <span className="text-[#8793a3]">to</span>
                  <MoveRight className="h-4 w-4 text-[#8793a3]" />
                  <span className="font-medium text-white">{instruction.to}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded ${
                    instruction.status === "settled" ? "bg-ledger-green/20 text-ledger-green" : "bg-orange-500/20 text-orange-400"
                  }`}>
                    {instruction.status || "pending"}
                  </span>
                  
                  {onToggleSettlement && instruction.id && (
                    <button
                      onClick={() => onToggleSettlement(instruction.id, instruction.status || "pending")}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        instruction.status === "settled" 
                          ? "bg-[#2a2f36] text-[#8793a3] hover:text-white" 
                          : "bg-ledger-green text-[#0a0d11] hover:bg-ledger-green/90 font-medium"
                      }`}
                    >
                      {instruction.status === "settled" ? "Mark Pending" : "Mark Settled"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SettlementPreview;
