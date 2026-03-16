// ── Normalised quote — provider-agnostic ──────────────────────────────────────

export interface Quote {
  /** Internal symbol (e.g. 'BTC', not 'BTCUSD') */
  symbol: string;
  price: number;
  /** Absolute change from previous close */
  change: number;
  /** Percentage change, e.g. 1.5 for +1.5% */
  changePercent: number;
  marketCap: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  previousClose: number;
  /** Unix timestamp (ms) when this quote was fetched */
  updatedAt: number;
}

// ── Provider abstraction ──────────────────────────────────────────────────────

export interface MarketProvider {
  /** Fetch quotes for a list of internal symbols (e.g. ['NVDA', 'BTC']). */
  fetchQuotes(symbols: string[], apiKey: string): Promise<Quote[]>;
}

export type ProviderName = 'fmp' | 'polygon';
