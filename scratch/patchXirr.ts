import fs from 'fs';
const file = 'src/domain/portfolio/portfolioMetrics.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { calculatePortfolioXIRR }')) {
  content = content.replace(
    'import { HoldingState, Lot, ReplayState } from \'./entities/ReplayEntities\';',
    'import { HoldingState, Lot, ReplayState } from \'./entities/ReplayEntities\';\nimport { calculatePortfolioXIRR } from \'./xirr\';'
  );
}

// In calculatePortfolioMetrics, we need to gather cash flows.
const applyTxRegex = /sortedTx\.forEach\(\(tx\) => applyTransaction\(state, tx, ledgerMode\)\);/g;
if (content.match(applyTxRegex)) {
  content = content.replace(
    applyTxRegex,
    `
  const cashFlowAmounts: number[] = [];
  const cashFlowDates: Date[] = [];
  if (openingSnapshot?.settings?.initialNetContributions) {
    cashFlowAmounts.push(openingSnapshot.settings.initialNetContributions);
    cashFlowDates.push(openingSnapshot.settings.globalCutoffDate ? new Date(openingSnapshot.settings.globalCutoffDate) : new Date());
  }

  sortedTx.forEach((tx) => {
    if (!ledgerMode) {
      if (tx.type === 'BUY') {
        cashFlowAmounts.push(tx.totalValue);
        cashFlowDates.push(new Date(tx.date));
      } else if (tx.type === 'SELL') {
        cashFlowAmounts.push(-tx.totalValue);
        cashFlowDates.push(new Date(tx.date));
      }
    }
    applyTransaction(state, tx, ledgerMode);
  });`
  );
}

const applyCashRegex = /finalNetContributionsLedger = finalNetContributionsLedger\.plus\(getCashContributionDelta\(evt\)\);\n  }\);/g;
if (content.match(applyCashRegex)) {
  content = content.replace(
    applyCashRegex,
    `finalNetContributionsLedger = finalNetContributionsLedger.plus(getCashContributionDelta(evt));
    const delta = getCashContributionDelta(evt).toNumber();
    if (delta !== 0) {
      cashFlowAmounts.push(delta);
      cashFlowDates.push(new Date(evt.date));
    }
  });`
  );
}

const returnMetricsRegex = /returnOnInvestmentPercent: activeNetContributionsDec\.eq\(0\) \? 0 : decimalToNumber\(netNavDec\.div\(activeNetContributionsDec\)\.minus\(DECIMAL_ONE\)\),/g;
if (content.match(returnMetricsRegex)) {
  content = content.replace(
    returnMetricsRegex,
    `returnOnInvestmentPercent: activeNetContributionsDec.eq(0) ? 0 : decimalToNumber(netNavDec.div(activeNetContributionsDec).minus(DECIMAL_ONE)),
    xirr: calculatePortfolioXIRR(cashFlowAmounts, cashFlowDates, decimalToNumber(netNavDec)),`
  );
}

fs.writeFileSync(file, content);
