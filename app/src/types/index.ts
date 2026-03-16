// ─── Core domain types ────────────────────────────────────────────────────────

export type Currency = 'KRW' | 'USD';
export type AssetType = 'stock' | 'crypto' | 'etf' | 'cash';
export type NoteType = 'weekly' | 'quarterly';
export type RiskKind = 'risk' | 'catalyst';
export type RiskStatus = 'open' | 'monitoring' | 'resolved';
export type ConvictionScore = 1 | 2 | 3 | 4 | 5;
export type PriceSource = 'finnhub' | 'coingecko' | 'yahoo' | 'manual';

// ─── Holding ─────────────────────────────────────────────────────────────────

export interface Holding {
  id: string;
  symbol: string;        // e.g. "NVDA", "BTC"
  name: string;          // e.g. "NVIDIA Corporation"
  type: AssetType;
  sector: string;        // e.g. "Semiconductors"
  target_weight: number; // 0–1, e.g. 0.15 = 15%
  created_at: string;    // ISO datetime
}

// ─── Lot ─────────────────────────────────────────────────────────────────────

export interface Lot {
  id: string;
  holding_id: string;
  quantity: number;
  buy_price: number;
  buy_currency: Currency;
  date: string;          // ISO date of purchase
  notes: string;
}

// ─── Thesis ──────────────────────────────────────────────────────────────────

export interface Thesis {
  id: string;
  holding_id: string;
  body: string;
  conviction: ConvictionScore;
  last_reviewed: string; // ISO date
  drift_flag: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Research Note ────────────────────────────────────────────────────────────

export interface Note {
  id: string;
  type: NoteType;
  period_key: string;    // "2025-W12" or "2025-Q1"
  title: string;
  body: string;
  holding_tags: string[]; // holding ids referenced
  created_at: string;
  updated_at: string;
}

// ─── Rebalance Decision ───────────────────────────────────────────────────────

export interface RebalanceDecision {
  id: string;
  date: string;
  snapshot_weights: Record<string, number>; // holding_id → actual weight at time
  target_weights: Record<string, number>;   // holding_id → intended target
  actions: string;
  rationale: string;
}

// ─── Risk / Catalyst Entry ────────────────────────────────────────────────────

export interface RiskEntry {
  id: string;
  holding_id: string | null; // null = portfolio-wide
  kind: RiskKind;
  title: string;
  body: string;
  status: RiskStatus;
  expected_date: string | null; // for catalysts
  created_at: string;
  updated_at: string;
}

// ─── Price Cache ──────────────────────────────────────────────────────────────

export interface PriceCache {
  holding_id: string;
  price: number;
  currency: Currency;
  source: PriceSource;
  fetched_at: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface Settings {
  base_currency: Currency;
  finnhub_key: string;
  refresh_interval_min: number;
  target_year: number;    // e.g. 2030
  target_multiple: number; // e.g. 10
  usd_krw_rate: number;
}

// ─── Derived / computed (never persisted) ─────────────────────────────────────

export interface HoldingRow {
  holding: Holding;
  lots: Lot[];
  thesis: Thesis | null;
  total_quantity: number;
  cost_basis: number;       // in base currency
  current_value: number | null; // in base currency
  pnl: number | null;
  pnl_pct: number | null;
  weight: number | null;    // share of total portfolio
}
