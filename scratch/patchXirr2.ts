import fs from 'fs';
const file = 'src/domain/portfolio/portfolioMetrics.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'xirr: calculatePortfolioXIRR(cashFlowAmounts, cashFlowDates, decimalToNumber(netNavDec)),',
  'xirr: calculatePortfolioXIRR(cashFlowAmounts, cashFlowDates, decimalToNumber(netNavDec)) ?? undefined,'
);
fs.writeFileSync(file, content);
