export interface Lot {
  date: string;      // ISO date string
  quantity: number;
  price: number;     // cost per unit
}

export interface HoldingRecord {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'etf';
  sector: string;
  quantity: number;
  costBasis: number;        // per unit average cost
  currentValue: number;     // total value (quantity × current price, or quantity × costBasis)
  pnl: number;
  pnlPct: number;
  weight: number;           // % of total portfolio value
  targetWeight: number | null;
  conviction: 1 | 2 | 3 | 4 | 5 | null;
  thesisDrift: boolean;
  thesisBody: string;
  lastReviewed: string;     // ISO date string
  riskLevel: 'low' | 'medium' | 'high';
  lots: Lot[];
}
