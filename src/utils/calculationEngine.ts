import type { CalculationSnapshot, IpoMemberEntry, MemberEntitlement, SettlementInstruction } from "../types/ipo";
import type { PortfolioMember } from "../types/portfolio";

export const calculateIpoSettlement = (
  memberEntries: Record<string, IpoMemberEntry>,
  portfolioMembers: PortfolioMember[],
  previousInstructions?: SettlementInstruction[]
): CalculationSnapshot => {
  let totalProfitLoss = 0;
  let totalInvestment = 0;
  const actuals: Record<string, number> = {};

  // 1. Calculate Actuals and Total P/L
  // Also collect all actual P/L values even for members who might not be in the form
  portfolioMembers.forEach((member) => {
    actuals[member.code] = 0; // Default to 0
  });

  Object.values(memberEntries || {}).forEach((entry) => {
    // Only process if they actually applied/were allotted anything, though 0 is fine too.
    const allotted = entry.allottedAmount || 0;
    const finalCredit = entry.finalBankCredit || 0;
    const actual = finalCredit - allotted;
    actuals[entry.memberCode] = actual;
    totalProfitLoss += actual;
    totalInvestment += allotted;
  });

  // 2. Calculate Entitlements
  const totalRatio = portfolioMembers.reduce((sum, member) => sum + member.ratio, 0);
  const memberEntitlements: MemberEntitlement[] = [];

  portfolioMembers.forEach((member) => {
    const actual = actuals[member.code];
    const entitled = (totalProfitLoss * member.ratio) / totalRatio;
    const net = actual - entitled;

    memberEntitlements.push({
      memberCode: member.code,
      memberName: member.name,
      // Round to 2 decimal places to avoid floating point errors
      actual: Math.round(actual * 100) / 100,
      entitled: Math.round(entitled * 100) / 100,
      net: Math.round(net * 100) / 100,
    });
  });

  // 3. Settlement Optimization
  const settlementInstructions: SettlementInstruction[] = [];

  // Create mutable copies for settlement matching
  const debtors = memberEntitlements
    .filter((m) => m.net > 0)
    .map((m) => ({ ...m }))
    .sort((a, b) => b.net - a.net);

  const creditors = memberEntitlements
    .filter((m) => m.net < 0)
    .map((m) => ({ ...m }))
    .sort((a, b) => a.net - b.net); // ascending, so most negative first

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];

    const amount = Math.min(debtor.net, Math.abs(creditor.net));

    // If amount is practically zero (e.g. 0.01 and we want to ignore micro-cents, though we rounded to 2 decimals)
    if (amount <= 0.001) {
      break; 
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    const id = `${debtor.memberCode}-${creditor.memberCode}`;
    
    let status: "pending" | "settled" = "pending";
    let settledAt: string | null = null;
    
    if (previousInstructions) {
      const prev = previousInstructions.find(i => i.id === id && i.amount === roundedAmount);
      if (prev) {
        status = prev.status;
        settledAt = prev.settledAt;
      }
    }

    settlementInstructions.push({
      id,
      from: debtor.memberName,
      to: creditor.memberName,
      amount: roundedAmount,
      status,
      settledAt,
    });

    debtor.net -= amount;
    creditor.net += amount; // since creditor net is negative, we add to get closer to 0

    if (Math.abs(debtor.net) < 0.01) {
      debtors.shift(); // fully settled
    }
    if (Math.abs(creditor.net) < 0.01) {
      creditors.shift(); // fully settled
    }

    // Re-sort in case the remaining balance makes them no longer the largest
    debtors.sort((a, b) => b.net - a.net);
    creditors.sort((a, b) => a.net - b.net);
  }

  return {
    totalProfitLoss: Math.round(totalProfitLoss * 100) / 100,
    totalInvestment: Math.round(totalInvestment * 100) / 100,
    memberEntitlements,
    settlementInstructions,
  };
};
