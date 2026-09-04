import { describe, it, expect } from 'vitest';
import { calculateXIRR, calculatePortfolioXIRR } from './xirr';

describe('XIRR Calculation', () => {
  it('calculates expected return correctly for simple cash flows', () => {
    const cashFlows = [
      { amount: 10000, date: new Date('2023-01-01') }, // Deposit
      { amount: -11000, date: new Date('2024-01-01') } // Withdrawal/End value
    ];
    const rate = calculateXIRR(cashFlows);
    expect(rate).toBeDefined();
    expect(rate).toBeCloseTo(0.10, 2); // 10%
  });

  it('calculates portfolio XIRR correctly', () => {
    const netContributions = [10000];
    const dates = [new Date('2023-01-01')];
    
    // Simulate exactly 1 year later with value 11000
    const fakeCurrentDate = new Date('2024-01-01');
    const OriginalDate = global.Date;
    
    try {
      // Mock new Date() to return fakeCurrentDate
      const mockDate = class extends OriginalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(fakeCurrentDate);
          } else {
            super(...(args as any));
          }
        }
      } as any;
      global.Date = mockDate;

      const rate = calculatePortfolioXIRR(netContributions, dates, 11000);
      expect(rate).toBeCloseTo(0.10, 2);

    } finally {
      global.Date = OriginalDate;
    }
  });
});
