import { Save } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { IpoFormValues, IpoMemberEntry, IpoStatus } from "../../types/ipo";
import type { Portfolio, PortfolioId, PortfolioMember } from "../../types/portfolio";
import Button from "../ui/Button";
import { calculateIpoSettlement } from "../../utils/calculationEngine";
import SettlementPreview from "./SettlementPreview";

type IpoFormProps = {
  portfolios: Portfolio[];
  initialValues?: IpoFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: IpoFormValues) => Promise<void>;
};

const emptyMemberFields: Partial<IpoMemberEntry> = {};

const createEntriesForPortfolio = (
  members: PortfolioMember[],
  existingEntries: Record<string, IpoMemberEntry> = {},
) => {
  if (!members || members.length === 0) {
    return {};
  }

  return Object.fromEntries(
    members.map((member) => {
      const existingEntry = existingEntries[member.code];

      return [
        member.code,
        {
          memberCode: member.code,
          memberName: member.name,
          appliedLots: existingEntry?.appliedLots ?? emptyMemberFields.appliedLots,
          allottedLots: existingEntry?.allottedLots ?? emptyMemberFields.allottedLots,
          appliedAmount: existingEntry?.appliedAmount ?? emptyMemberFields.appliedAmount,
          allottedAmount: existingEntry?.allottedAmount ?? emptyMemberFields.allottedAmount,
          finalBankCredit: existingEntry?.finalBankCredit ?? emptyMemberFields.finalBankCredit,
        },
      ];
    }),
  );
};

const IpoForm = ({
  portfolios,
  initialValues,
  submitLabel,
  isSubmitting,
  onSubmit,
}: IpoFormProps) => {
  const isLegacy = initialValues !== undefined && initialValues.lotValue === null;
  
  const defaultPortfolioId = portfolios[0]?.id ?? "portfolioAlpha";
  const [ipoName, setIpoName] = useState(initialValues?.ipoName ?? "");
  const [portfolioId, setPortfolioId] = useState<PortfolioId>(
    initialValues?.portfolioId ?? defaultPortfolioId,
  );
  const [allotmentDate, setAllotmentDate] = useState(initialValues?.allotmentDate ?? "");
  const [status] = useState<IpoStatus>(initialValues?.status ?? "active");
  const [lotValueStr, setLotValueStr] = useState<string>(
    initialValues?.lotValue !== undefined && initialValues?.lotValue !== null
      ? initialValues.lotValue.toString()
      : ""
  );
  const [memberEntries, setMemberEntries] = useState<Record<string, IpoMemberEntry>>({});

  const selectedPortfolio = useMemo(
    () => portfolios.find((portfolio) => portfolio.id === portfolioId),
    [portfolioId, portfolios],
  );

  useEffect(() => {
    const membersToUse = initialValues?.lockedPsr || selectedPortfolio?.members || [];
    setMemberEntries(createEntriesForPortfolio(membersToUse, initialValues?.memberEntries));
  }, [initialValues?.memberEntries, initialValues?.lockedPsr, selectedPortfolio]);

  const computedMemberEntries = useMemo(() => {
    const lv = isLegacy ? 0 : parseInt(lotValueStr, 10) || 0;
    return Object.fromEntries(
      Object.entries(memberEntries).map(([code, entry]) => {
        if (isLegacy) {
          return [
            code,
            {
              ...entry,
              appliedAmount: entry.appliedAmount || 0,
              allottedAmount: entry.allottedAmount || 0,
              finalBankCredit: entry.finalBankCredit || 0,
            },
          ];
        }
        return [
          code,
          {
            ...entry,
            appliedAmount: (entry.appliedLots || 0) * lv,
            allottedAmount: (entry.allottedLots || 0) * lv,
            finalBankCredit:
              (entry.allottedLots ?? 0) <= 0 && !isLegacy ? 0 : entry.finalBankCredit || 0,
          },
        ];
      }),
    );
  }, [memberEntries, lotValueStr, isLegacy]);

  const calculationSnapshot = useMemo(() => {
    if (!selectedPortfolio) return null;
    const membersToUse = initialValues?.lockedPsr || selectedPortfolio.members;
    return calculateIpoSettlement(
      computedMemberEntries, 
      membersToUse, 
      initialValues?.calculationSnapshot?.settlementInstructions
    );
  }, [computedMemberEntries, selectedPortfolio, initialValues]);

  const hasLotError = useMemo(() => {
    if (isLegacy) return false;
    return Object.values(memberEntries).some(
      (entry) => (entry.allottedLots ?? 0) > (entry.appliedLots ?? 0)
    );
  }, [memberEntries, isLegacy]);

  const updateMemberAmount = (
    memberCode: string,
    field: keyof Pick<IpoMemberEntry, "appliedAmount" | "allottedAmount" | "appliedLots" | "allottedLots" | "finalBankCredit">,
    value: string,
  ) => {
    const numericValue = field === "finalBankCredit" ? parseFloat(value) : parseInt(value, 10);
    const safeValue = Number.isNaN(numericValue) ? undefined : numericValue;

    setMemberEntries((currentEntries) => ({
      ...currentEntries,
      [memberCode]: {
        ...currentEntries[memberCode],
        [field]: value === "" ? undefined : safeValue,
      },
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedPortfolio || hasLotError) {
      return;
    }

    const finalLotValue = isLegacy ? null : (parseInt(lotValueStr, 10) || 0);

    // Sanitize undefined lots back to 0 just to be safe for saving
    const sanitizedEntries = Object.fromEntries(
      Object.entries(computedMemberEntries).map(([k, v]) => [
        k,
        { ...v, appliedLots: v.appliedLots ?? 0, allottedLots: v.allottedLots ?? 0, finalBankCredit: v.finalBankCredit ?? 0 }
      ])
    );

    await onSubmit({
      ipoName: ipoName.trim(),
      portfolioId: selectedPortfolio.id,
      portfolioName: selectedPortfolio.name,
      lockedPsr: initialValues?.lockedPsr || selectedPortfolio.members,
      allotmentDate,
      lotValue: finalLotValue,
      status,
      memberEntries: sanitizedEntries,
      calculationSnapshot: calculationSnapshot || {
        totalProfitLoss: 0,
        memberEntitlements: [],
        settlementInstructions: [],
      },
    });
  };

  const tableFields = isLegacy
    ? (["appliedAmount", "allottedAmount", "finalBankCredit"] as const)
    : (["appliedLots", "allottedLots", "finalBankCredit"] as const);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="grid gap-4 rounded border border-ledger-line bg-ledger-panel p-5 md:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#c1cad6]">IPO Name</span>
          <input
            className="h-11 w-full rounded border border-ledger-line bg-[#101418] px-3 text-white outline-none transition focus:border-ledger-green"
            value={ipoName}
            onChange={(event) => setIpoName(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#c1cad6]">Portfolio</span>
          <select
            className="h-11 w-full rounded border border-ledger-line bg-[#101418] px-3 text-white outline-none transition focus:border-ledger-green"
            value={portfolioId}
            onChange={(event) => setPortfolioId(event.target.value as PortfolioId)}
            required
          >
            {portfolios.map((portfolio) => (
              <option key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#c1cad6]">Allotment Date</span>
          <input
            className="h-11 w-full rounded border border-ledger-line bg-[#101418] px-3 text-white outline-none transition focus:border-ledger-green"
            type="date"
            value={allotmentDate}
            onChange={(event) => setAllotmentDate(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#c1cad6]">Lot Value (₹)</span>
          {isLegacy ? (
            <input
              className="h-11 w-full rounded border border-ledger-line bg-[#101418] px-3 text-[#8793a3] outline-none"
              value="Historical Record"
              disabled
            />
          ) : (
            <input
              className="hide-spin-button h-11 w-full rounded border border-ledger-line bg-[#101418] px-3 text-white outline-none transition focus:border-ledger-green"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 15000"
              value={lotValueStr}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              onChange={(event) => setLotValueStr(event.target.value)}
              required
            />
          )}
        </label>
      </section>

      {isLegacy && (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          This IPO was created before the lot-based workflow and uses direct monetary values.
        </div>
      )}

      <section className="rounded border border-ledger-line bg-ledger-panel p-5">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-white">Member Entries</h3>
          <p className="mt-1 text-sm text-[#9aa6b5]">
            Rows are generated from the selected portfolio.
          </p>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ledger-line text-left text-xs uppercase tracking-[0.16em] text-[#8793a3]">
                <th className="py-3 pr-4 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">{isLegacy ? "Applied Amount" : "Applied Lots"}</th>
                <th className="px-4 py-3 font-semibold">{isLegacy ? "Allotted Amount" : "Allotted Lots"}</th>
                <th className="px-4 py-3 font-semibold">Bank Credit</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(memberEntries).map((entry) => {
                const isInvalidLots = !isLegacy && (entry.allottedLots ?? 0) > (entry.appliedLots ?? 0);
                
                return (
                  <tr key={entry.memberCode} className="border-b border-ledger-line last:border-0 relative">
                    <td className="py-4 pr-4 align-top w-[200px] min-w-[160px]">
                      <div className="font-semibold text-white">{entry.memberName}</div>
                      {isInvalidLots && (
                        <div className="absolute bottom-1 left-0 text-[10px] leading-tight text-red-400 whitespace-nowrap">Allotted lots cannot exceed applied.</div>
                      )}
                    </td>
                    {tableFields.map((field) => (
                      <td key={field} className="px-4 py-4">
                        <input
                          className={`h-10 w-full rounded border px-3 outline-none transition ${field === "finalBankCredit" ? "hide-spin-button" : ""} ${
                            (isLegacy && field !== "finalBankCredit") || (!isLegacy && field === "finalBankCredit" && (entry.allottedLots ?? 0) <= 0)
                              ? "border-ledger-line bg-[#151a20] text-[#8793a3]" 
                              : isInvalidLots && field === "allottedLots"
                              ? "border-red-500/50 bg-[#1a1010] text-white focus:border-red-500"
                              : "border-ledger-line bg-[#101418] text-white focus:border-ledger-green"
                          }`}
                          type="number"
                          min="0"
                          step={field === "finalBankCredit" ? "0.01" : "1"}
                          placeholder="0"
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          value={
                            !isLegacy && field === "finalBankCredit" && (entry.allottedLots ?? 0) <= 0
                              ? "0"
                              : entry[field] ?? ""
                          }
                          onChange={(event) =>
                            updateMemberAmount(entry.memberCode, field, event.target.value)
                          }
                          disabled={
                            (isLegacy && field !== "finalBankCredit") ||
                            (!isLegacy && field === "finalBankCredit" && (entry.allottedLots ?? 0) <= 0)
                          }
                          required={!isLegacy || field === "finalBankCredit"}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-4">
          {Object.values(memberEntries).map((entry) => {
            const isInvalidLots = !isLegacy && (entry.allottedLots ?? 0) > (entry.appliedLots ?? 0);
            
            return (
              <div key={entry.memberCode} className="rounded border border-ledger-line p-4 bg-[#101418]">
                <div className="font-semibold text-white mb-3">
                  {entry.memberName}
                  {isInvalidLots && (
                    <div className="mt-1 text-xs text-red-400 font-normal">Allotted lots cannot exceed applied.</div>
                  )}
                </div>
                <div className="space-y-4">
                  {tableFields.map((field) => (
                    <div key={field}>
                      <label className="block text-xs text-[#8793a3] uppercase tracking-wider mb-2">
                        {field === "finalBankCredit" 
                          ? "Bank Credit" 
                          : isLegacy 
                            ? (field === "appliedAmount" ? "Applied Amount" : "Allotted Amount")
                            : (field === "appliedLots" ? "Applied Lots" : "Allotted Lots")}
                      </label>
                      <input
                        className={`h-11 w-full rounded border px-3 outline-none transition ${field === "finalBankCredit" ? "hide-spin-button" : ""} ${
                          (isLegacy && field !== "finalBankCredit") || (!isLegacy && field === "finalBankCredit" && (entry.allottedLots ?? 0) <= 0)
                            ? "border-ledger-line bg-[#151a20] text-[#8793a3]" 
                            : isInvalidLots && field === "allottedLots"
                            ? "border-red-500/50 bg-[#1a1010] text-white focus:border-red-500"
                            : "border-ledger-line bg-[#151a20] text-white focus:border-ledger-green"
                        }`}
                        type="number"
                        min="0"
                        step={field === "finalBankCredit" ? "0.01" : "1"}
                        placeholder="0"
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        value={
                          !isLegacy && field === "finalBankCredit" && (entry.allottedLots ?? 0) <= 0
                            ? "0"
                            : entry[field] ?? ""
                        }
                        onChange={(event) =>
                          updateMemberAmount(entry.memberCode, field, event.target.value)
                        }
                        disabled={
                          (isLegacy && field !== "finalBankCredit") ||
                          (!isLegacy && field === "finalBankCredit" && (entry.allottedLots ?? 0) <= 0)
                        }
                        required={!isLegacy || field === "finalBankCredit"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {!isLegacy && !hasLotError && (
          <details className="mt-6 rounded border border-ledger-line bg-[#101418] p-4 text-sm open:bg-ledger-panel">
            <summary className="cursor-pointer font-medium text-[#c1cad6] outline-none">
              Calculation Details
            </summary>
            <div className="hidden md:block mt-4 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ledger-line text-[#8793a3]">
                    <th className="py-2 pr-4 font-semibold">Member</th>
                    <th className="px-4 py-2 font-semibold text-right">Applied Value</th>
                    <th className="px-4 py-2 font-semibold text-right">Allotted Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(computedMemberEntries).map((entry) => (
                    <tr key={entry.memberCode} className="border-b border-ledger-line last:border-0 text-[#9aa6b5]">
                      <td className="py-2 pr-4 text-white">{entry.memberName}</td>
                      <td className="px-4 py-2 text-right">
                        {(entry.appliedAmount || 0).toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {(entry.allottedAmount || 0).toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden mt-4 flex flex-col gap-3">
              {Object.values(computedMemberEntries).map((entry) => (
                <div key={entry.memberCode} className="rounded border border-ledger-line p-3 bg-[#151a20]/50">
                  <div className="font-medium text-white mb-2 pb-2 border-b border-ledger-line/50">{entry.memberName}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-[#8793a3] uppercase tracking-wider mb-1">Applied Value</div>
                      <div className="text-sm text-[#9aa6b5]">
                        {(entry.appliedAmount || 0).toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#8793a3] uppercase tracking-wider mb-1">Allotted Value</div>
                      <div className="text-sm text-[#9aa6b5]">
                        {(entry.allottedAmount || 0).toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {!hasLotError && calculationSnapshot ? (
        <SettlementPreview snapshot={calculationSnapshot} />
      ) : hasLotError ? (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Please fix the validation errors above to view the Settlement Preview.
        </div>
      ) : null}

      <div className="flex flex-col items-end gap-3 mt-8">
        <p className="text-[11px] text-[#8793a3] max-w-xl text-right">
          Data entered into Portfolio Ledger is stored for record-keeping and analytical purposes only. Portfolio Ledger does not recommend, solicit, broker, or facilitate securities transactions.
        </p>
        <Button type="submit" disabled={isSubmitting || portfolios.length === 0 || hasLotError}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Saving" : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default IpoForm;
