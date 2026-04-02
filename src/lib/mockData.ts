import { Transaction, CashLedgerEvent } from '@/types/portfolio';
import { Quantity, Price, Money } from '@/domain/portfolio/primitives';

export const MOCK_TRANSACTIONS: Transaction[] = [
  // FPT - Long term hold
  { id: 'mock-1', date: new Date('2024-01-05T10:00:00Z'), ticker: 'FPT', assetClass: 'STOCK', type: 'BUY', quantity: 2000 as Quantity, price: 85000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 170000000 as Money, source: 'demo' },
  { id: 'mock-2', date: new Date('2024-06-20T14:30:00Z'), ticker: 'FPT', assetClass: 'STOCK', type: 'BUY', quantity: 1000 as Quantity, price: 92000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 92000000 as Money, source: 'demo' },
  { id: 'mock-3', date: new Date('2024-11-15T09:15:00Z'), ticker: 'FPT', assetClass: 'STOCK', type: 'SELL', quantity: 500 as Quantity, price: 115000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 57500000 as Money, source: 'demo' },
  
  // MBB - Swing trading, fully realized
  { id: 'mock-4', date: new Date('2024-02-10T11:00:00Z'), ticker: 'MBB', assetClass: 'STOCK', type: 'BUY', quantity: 10000 as Quantity, price: 18500 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 185000000 as Money, source: 'demo' },
  { id: 'mock-5', date: new Date('2024-05-12T13:45:00Z'), ticker: 'MBB', assetClass: 'STOCK', type: 'SELL', quantity: 10000 as Quantity, price: 23000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 230000000 as Money, source: 'demo' },
  
  // HPG - Cost averaging
  { id: 'mock-6', date: new Date('2024-03-01T10:20:00Z'), ticker: 'HPG', assetClass: 'STOCK', type: 'BUY', quantity: 5000 as Quantity, price: 26000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 130000000 as Money, source: 'demo' },
  { id: 'mock-7', date: new Date('2024-04-15T09:30:00Z'), ticker: 'HPG', assetClass: 'STOCK', type: 'BUY', quantity: 3000 as Quantity, price: 25000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 75000000 as Money, source: 'demo' },
  { id: 'mock-8', date: new Date('2024-08-10T14:00:00Z'), ticker: 'HPG', assetClass: 'STOCK', type: 'BUY', quantity: 2000 as Quantity, price: 24500 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 49000000 as Money, source: 'demo' },
  { id: 'mock-9', date: new Date('2025-01-20T10:15:00Z'), ticker: 'HPG', assetClass: 'STOCK', type: 'SELL', quantity: 4000 as Quantity, price: 29000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 116000000 as Money, source: 'demo' },

  // MWG - Loss cut
  { id: 'mock-10', date: new Date('2024-07-05T09:00:00Z'), ticker: 'MWG', assetClass: 'STOCK', type: 'BUY', quantity: 2000 as Quantity, price: 65000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 130000000 as Money, source: 'demo' },
  { id: 'mock-11', date: new Date('2024-09-10T13:30:00Z'), ticker: 'MWG', assetClass: 'STOCK', type: 'BUY', quantity: 1000 as Quantity, price: 62000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 62000000 as Money, source: 'demo' },
  { id: 'mock-12', date: new Date('2024-10-25T14:45:00Z'), ticker: 'MWG', assetClass: 'STOCK', type: 'SELL', quantity: 3000 as Quantity, price: 58000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 174000000 as Money, source: 'demo' },

  // VND - Recent buys
  { id: 'mock-13', date: new Date('2024-11-01T10:00:00Z'), ticker: 'VND', assetClass: 'STOCK', type: 'BUY', quantity: 8000 as Quantity, price: 21000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 168000000 as Money, source: 'demo' },
  { id: 'mock-14', date: new Date('2024-12-15T09:45:00Z'), ticker: 'VND', assetClass: 'STOCK', type: 'BUY', quantity: 2000 as Quantity, price: 22500 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 45000000 as Money, source: 'demo' },

  // VCB - Stable holding
  { id: 'mock-15', date: new Date('2024-02-28T14:10:00Z'), ticker: 'VCB', assetClass: 'STOCK', type: 'BUY', quantity: 1500 as Quantity, price: 88000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 132000000 as Money, source: 'demo' },
  { id: 'mock-16', date: new Date('2024-12-10T10:20:00Z'), ticker: 'VCB', assetClass: 'STOCK', type: 'SELL', quantity: 500 as Quantity, price: 95000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 47500000 as Money, source: 'demo' },
  
  // SSI - High volatility
  { id: 'mock-17', date: new Date('2025-01-10T09:30:00Z'), ticker: 'SSI', assetClass: 'STOCK', type: 'BUY', quantity: 4000 as Quantity, price: 34000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 136000000 as Money, source: 'demo' },
  { id: 'mock-18', date: new Date('2025-02-05T13:15:00Z'), ticker: 'SSI', assetClass: 'STOCK', type: 'BUY', quantity: 2000 as Quantity, price: 31500 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 63000000 as Money, source: 'demo' },
  { id: 'mock-19', date: new Date('2025-02-28T14:45:00Z'), ticker: 'SSI', assetClass: 'STOCK', type: 'SELL', quantity: 3000 as Quantity, price: 35500 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 106500000 as Money, source: 'demo' },

  // VHM - Value play
  { id: 'mock-20', date: new Date('2025-03-01T10:00:00Z'), ticker: 'VHM', assetClass: 'STOCK', type: 'BUY', quantity: 5000 as Quantity, price: 42000 as Price, fee: 0 as Money, tax: 0 as Money, totalValue: 210000000 as Money, source: 'demo' },
];

export const MOCK_CASH_EVENTS: CashLedgerEvent[] = [
  {
    id: 'cash-1',
    date: new Date('2025-01-01T08:00:00Z'),
    amount: 300000000 as Money,
    balanceAfter: 300000000 as Money,
    eventType: 'DEPOSIT',
    direction: 'INFLOW',
    description: 'Nạp tiền ban đầu',
    source: 'demo'
  },
  {
    id: 'cash-2',
    date: new Date('2025-03-10T10:00:00Z'),
    amount: 10000000 as Money,
    balanceAfter: 290000000 as Money,
    eventType: 'WITHDRAW',
    direction: 'OUTFLOW',
    description: 'Rút tiền tiêu',
    source: 'demo'
  }
];
