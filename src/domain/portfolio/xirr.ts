export interface CashFlow {
  amount: number;
  date: Date;
}

const MAX_ITERATIONS = 100;
const TOLERANCE = 1e-7;

function xnpv(rate: number, cashFlows: CashFlow[]): number {
  let total = 0;
  const d0 = cashFlows[0].date.getTime();
  for (let i = 0; i < cashFlows.length; i++) {
    const di = cashFlows[i].date.getTime();
    const days = (di - d0) / (1000 * 3600 * 24);
    total += cashFlows[i].amount / Math.pow(1 + rate, days / 365);
  }
  return total;
}

function dxnpv(rate: number, cashFlows: CashFlow[]): number {
  let total = 0;
  const d0 = cashFlows[0].date.getTime();
  for (let i = 0; i < cashFlows.length; i++) {
    const di = cashFlows[i].date.getTime();
    const days = (di - d0) / (1000 * 3600 * 24);
    if (days > 0) {
      total -= (days / 365) * cashFlows[i].amount * Math.pow(1 + rate, -(days / 365) - 1);
    }
  }
  return total;
}

export function calculateXIRR(cashFlows: CashFlow[], guess: number = 0.1): number | null {
  if (cashFlows.length < 2) return null;

  // Filter out zero amounts if they exist at the start/end
  const validFlows = cashFlows.filter(cf => cf.amount !== 0);
  if (validFlows.length < 2) return null;

  // Ensure cash flows are sorted by date
  validFlows.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Check if we have both positive and negative cash flows
  const hasPositive = validFlows.some(cf => cf.amount > 0);
  const hasNegative = validFlows.some(cf => cf.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  let rate = guess;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const fValue = xnpv(rate, validFlows);
    const fDerivative = dxnpv(rate, validFlows);

    if (Math.abs(fDerivative) < Number.EPSILON) {
      return null; // Derivative is zero, can't continue Newton-Raphson
    }

    const newRate = rate - fValue / fDerivative;

    if (Math.abs(newRate - rate) < TOLERANCE) {
      return newRate;
    }
    
    // XIRR rate cannot be <= -1 (-100%) in standard formulas because (1+r) becomes <= 0.
    rate = newRate <= -1 ? -0.99999 : newRate;
  }

  return null; // Did not converge
}

export function calculatePortfolioXIRR(
  netContributions: number[], 
  contributionDates: Date[], 
  currentPortfolioValue: number
): number | null {
  if (netContributions.length === 0 || netContributions.length !== contributionDates.length) {
    return null;
  }

  const cashFlows: CashFlow[] = netContributions.map((amount, i) => ({
    amount, // Assuming positive is deposit, so from portfolio's perspective it's positive cash flow in
    date: contributionDates[i]
  }));

  // Add the final value as a negative cash flow (as if the portfolio was liquidated today)
  cashFlows.push({
    amount: -currentPortfolioValue,
    date: new Date()
  });

  const xirr = calculateXIRR(cashFlows);
  
  if (xirr === null) return 0;
  return xirr;
}
