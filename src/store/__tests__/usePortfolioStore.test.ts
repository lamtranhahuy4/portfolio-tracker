import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { usePortfolioStore } from '../usePortfolioStore';
import { Transaction, CashLedgerEvent } from '@/types/portfolio';
import { toMoney, toQuantity, toPrice } from '@/domain/portfolio/primitives';

const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: crypto.randomUUID(),
  date: new Date('2024-01-01'),
  type: 'DEPOSIT',
  assetClass: 'CASH',
  ticker: 'CASH_VND',
  quantity: toQuantity(1000000),
  price: toPrice(1),
  fee: toMoney(0),
  tax: toMoney(0),
  totalValue: toMoney(1000000),
  ...overrides,
});

const createMockCashEvent = (overrides: Partial<CashLedgerEvent> = {}): CashLedgerEvent => ({
  id: crypto.randomUUID(),
  date: new Date('2024-01-01'),
  direction: 'INFLOW',
  amount: toMoney(1000000),
  balanceAfter: toMoney(1000000),
  eventType: 'DEPOSIT',
  description: 'Test deposit',
  source: 'test',
  ...overrides,
});

describe('usePortfolioStore - Transactions Slice', () => {
  beforeEach(() => {
    act(() => {
      usePortfolioStore.setState({
        transactions: [],
        cashEvents: [],
        currentPrices: {},
        valuationDate: null,
        globalCutoffDate: null,
        initialNetContributions: 0,
        initialCashBalance: 0,
        openingPositions: [],
        feeDebt: 0,
        lastImportResult: null,
        lastCashImportSummary: null,
      });
    });
  });

  it('should add transactions via setTransactions', () => {
    const tx1 = createMockTransaction({ id: 'tx-1', date: new Date('2024-01-01') });
    const tx2 = createMockTransaction({ id: 'tx-2', date: new Date('2024-01-02') });

    act(() => {
      usePortfolioStore.getState().setTransactions([tx2, tx1]);
    });

    const transactions = usePortfolioStore.getState().transactions;
    expect(transactions).toHaveLength(2);
    expect(transactions[0].id).toBe('tx-1');
    expect(transactions[1].id).toBe('tx-2');
  });

  it('should sort transactions by date ascending', () => {
    const tx1 = createMockTransaction({ id: 'tx-late', date: new Date('2024-01-15') });
    const tx2 = createMockTransaction({ id: 'tx-early', date: new Date('2024-01-01') });
    const tx3 = createMockTransaction({ id: 'tx-mid', date: new Date('2024-01-10') });

    act(() => {
      usePortfolioStore.getState().setTransactions([tx1, tx2, tx3]);
    });

    const transactions = usePortfolioStore.getState().transactions;
    expect(transactions[0].id).toBe('tx-early');
    expect(transactions[1].id).toBe('tx-mid');
    expect(transactions[2].id).toBe('tx-late');
  });

  it('should deduplicate transactions on addTransactions', () => {
    const tx1 = createMockTransaction({ id: 'tx-1' });
    const tx2 = createMockTransaction({ id: 'tx-2' });
    const txDuplicate = createMockTransaction({ id: 'tx-1' });

    act(() => {
      usePortfolioStore.getState().setTransactions([tx1]);
      usePortfolioStore.getState().addTransactions([tx2, txDuplicate]);
    });

    const transactions = usePortfolioStore.getState().transactions;
    expect(transactions).toHaveLength(2);
    expect(transactions.find((t) => t.id === 'tx-1')).toBeDefined();
    expect(transactions.find((t) => t.id === 'tx-2')).toBeDefined();
  });

  it('should not add duplicate transactions when addTransactions called multiple times with same id', () => {
    const tx1 = createMockTransaction({ id: 'tx-dup' });

    act(() => {
      usePortfolioStore.getState().setTransactions([tx1]);
      usePortfolioStore.getState().addTransactions([tx1]);
      usePortfolioStore.getState().addTransactions([tx1]);
    });

    const transactions = usePortfolioStore.getState().transactions;
    expect(transactions).toHaveLength(1);
  });
});

describe('usePortfolioStore - Prices Slice', () => {
  beforeEach(() => {
    act(() => {
      usePortfolioStore.setState({
        transactions: [],
        cashEvents: [],
        currentPrices: {},
        valuationDate: null,
        globalCutoffDate: null,
        initialNetContributions: 0,
        initialCashBalance: 0,
        openingPositions: [],
        feeDebt: 0,
        lastImportResult: null,
        lastCashImportSummary: null,
      });
    });
  });

  it('should update price for ticker', () => {
    act(() => {
      usePortfolioStore.getState().updatePrice('HPG', 50000);
    });

    expect(usePortfolioStore.getState().currentPrices.HPG).toBe(50000);
  });

  it('should update existing ticker price', () => {
    act(() => {
      usePortfolioStore.getState().updatePrice('HPG', 50000);
      usePortfolioStore.getState().updatePrice('HPG', 52000);
    });

    expect(usePortfolioStore.getState().currentPrices.HPG).toBe(52000);
  });

  it('should support multiple ticker prices', () => {
    act(() => {
      usePortfolioStore.getState().updatePrice('HPG', 50000);
      usePortfolioStore.getState().updatePrice('FPT', 120000);
      usePortfolioStore.getState().updatePrice('VND', 35000);
    });

    const prices = usePortfolioStore.getState().currentPrices;
    expect(Object.keys(prices)).toHaveLength(3);
    expect(prices.HPG).toBe(50000);
    expect(prices.FPT).toBe(120000);
    expect(prices.VND).toBe(35000);
  });
});

describe('usePortfolioStore - Cash Events Slice', () => {
  beforeEach(() => {
    act(() => {
      usePortfolioStore.setState({
        transactions: [],
        cashEvents: [],
        currentPrices: {},
        valuationDate: null,
        globalCutoffDate: null,
        initialNetContributions: 0,
        initialCashBalance: 0,
        openingPositions: [],
        feeDebt: 0,
        lastImportResult: null,
        lastCashImportSummary: null,
      });
    });
  });

  it('should set cash events via setCashEvents', () => {
    const evt1 = createMockCashEvent({ id: 'evt-1', date: new Date('2024-01-01') });
    const evt2 = createMockCashEvent({ id: 'evt-2', date: new Date('2024-01-02') });

    act(() => {
      usePortfolioStore.getState().setCashEvents([evt2, evt1]);
    });

    const events = usePortfolioStore.getState().cashEvents;
    expect(events).toHaveLength(2);
    expect(events[0].id).toBe('evt-1');
    expect(events[1].id).toBe('evt-2');
  });

  it('should sort cash events by date ascending', () => {
    const evt1 = createMockCashEvent({ id: 'evt-late', date: new Date('2024-01-15') });
    const evt2 = createMockCashEvent({ id: 'evt-early', date: new Date('2024-01-01') });

    act(() => {
      usePortfolioStore.getState().setCashEvents([evt1, evt2]);
    });

    const events = usePortfolioStore.getState().cashEvents;
    expect(events[0].id).toBe('evt-early');
    expect(events[1].id).toBe('evt-late');
  });

  it('should deduplicate cash events on addCashEvents', () => {
    const evt1 = createMockCashEvent({ id: 'evt-1' });
    const evt2 = createMockCashEvent({ id: 'evt-2' });
    const evtDup = createMockCashEvent({ id: 'evt-1' });

    act(() => {
      usePortfolioStore.getState().setCashEvents([evt1]);
      usePortfolioStore.getState().addCashEvents([evt2, evtDup]);
    });

    const events = usePortfolioStore.getState().cashEvents;
    expect(events).toHaveLength(2);
  });
});

describe('usePortfolioStore - Portfolio Settings Slice', () => {
  beforeEach(() => {
    act(() => {
      usePortfolioStore.setState({
        transactions: [],
        cashEvents: [],
        currentPrices: {},
        valuationDate: null,
        globalCutoffDate: null,
        initialNetContributions: 0,
        initialCashBalance: 0,
        openingPositions: [],
        feeDebt: 0,
        lastImportResult: null,
        lastCashImportSummary: null,
      });
    });
  });

  it('should set valuation date', () => {
    const date = new Date('2024-06-15');

    act(() => {
      usePortfolioStore.getState().setValuationDate(date);
    });

    expect(usePortfolioStore.getState().valuationDate).toEqual(date);
  });

  it('should clear valuation date when set to null', () => {
    const date = new Date('2024-06-15');

    act(() => {
      usePortfolioStore.getState().setValuationDate(date);
      usePortfolioStore.getState().setValuationDate(null);
    });

    expect(usePortfolioStore.getState().valuationDate).toBeNull();
  });

  it('should set fee debt', () => {
    act(() => {
      usePortfolioStore.getState().setFeeDebt(500000);
    });

    expect(usePortfolioStore.getState().feeDebt).toBe(500000);
  });

  it('should set portfolio settings', () => {
    const settings = {
      globalCutoffDate: new Date('2024-01-01'),
      initialNetContributions: 10000000,
      initialCashBalance: 5000000,
    };

    act(() => {
      usePortfolioStore.getState().setPortfolioSettings(settings);
    });

    const state = usePortfolioStore.getState();
    expect(state.globalCutoffDate).toEqual(settings.globalCutoffDate);
    expect(state.initialNetContributions).toBe(settings.initialNetContributions);
    expect(state.initialCashBalance).toBe(settings.initialCashBalance);
  });
});

describe('usePortfolioStore - Import Status Slice', () => {
  beforeEach(() => {
    act(() => {
      usePortfolioStore.setState({
        transactions: [],
        cashEvents: [],
        currentPrices: {},
        valuationDate: null,
        globalCutoffDate: null,
        initialNetContributions: 0,
        initialCashBalance: 0,
        openingPositions: [],
        feeDebt: 0,
        lastImportResult: null,
        lastCashImportSummary: null,
      });
    });
  });

  it('should set last import result', () => {
    const result = {
      transactions: [],
      warnings: [],
      summary: {
        fileName: 'test.csv',
        source: 'csv',
        totalRows: 10,
        acceptedRows: 10,
        rejectedRows: 0,
      },
      importedAt: new Date(),
      summaryMeta: {
        batchId: 'batch-1',
        status: 'COMPLETED' as const,
        importedAt: new Date(),
      },
    };

    act(() => {
      usePortfolioStore.getState().setLastImportResult(result as any);
    });

    expect(usePortfolioStore.getState().lastImportResult).toBeDefined();
  });

  it('should set last cash import summary', () => {
    const summary = {
      events: [],
      summary: {
        fileName: 'cash.xlsx',
        source: 'dnse-cash-xlsx',
        totalEvents: 5,
        unclassifiedEvents: 0,
      },
    };

    act(() => {
      usePortfolioStore.getState().setLastCashImportSummary(summary as any);
    });

    expect(usePortfolioStore.getState().lastCashImportSummary).toBeDefined();
  });
});

describe('usePortfolioStore - Opening Positions Slice', () => {
  beforeEach(() => {
    act(() => {
      usePortfolioStore.setState({
        transactions: [],
        cashEvents: [],
        currentPrices: {},
        valuationDate: null,
        globalCutoffDate: null,
        initialNetContributions: 0,
        initialCashBalance: 0,
        openingPositions: [],
        feeDebt: 0,
        lastImportResult: null,
        lastCashImportSummary: null,
      });
    });
  });

  it('should set opening snapshot positions', () => {
    const positions = [
      { ticker: 'HPG', quantity: toQuantity(1000), averageCost: toPrice(20000), date: new Date('2024-01-01') },
      { ticker: 'FPT', quantity: toQuantity(500), averageCost: toPrice(100000), date: new Date('2024-01-01') },
    ];

    act(() => {
      usePortfolioStore.getState().setOpeningSnapshot(positions);
    });

    expect(usePortfolioStore.getState().openingPositions).toHaveLength(2);
    expect(usePortfolioStore.getState().openingPositions[0].ticker).toBe('HPG');
  });
});
