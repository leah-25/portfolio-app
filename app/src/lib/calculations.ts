import type { Holding, Lot, PriceCache, Currency } from '../types';

// ── FX conversion ─────────────────────────────────────────────────────────────

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  usdKrwRate: number
): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'KRW') return amount * usdKrwRate;
  if (from === 'KRW' && to === 'USD') return amount / usdKrwRate;
  return amount;
}

// ── Cost basis ────────────────────────────────────────────────────────────────

export function costBasis(lots: Lot[], base: Currency, usdKrwRate: number): number {
  return lots.reduce((sum, lot) => {
    const inBase = convertCurrency(lot.buy_price, lot.buy_currency, base, usdKrwRate);
    return sum + lot.quantity * inBase;
  }, 0);
}

export function totalQuantity(lots: Lot[]): number {
  return lots.reduce((sum, lot) => sum + lot.quantity, 0);
}

export function avgBuyPrice(lots: Lot[], base: Currency, usdKrwRate: number): number {
  const qty = totalQuantity(lots);
  if (!qty) return 0;
  return costBasis(lots, base, usdKrwRate) / qty;
}

// ── P&L ───────────────────────────────────────────────────────────────────────

export function currentValue(
  holding: Holding,
  lots: Lot[],
  prices: PriceCache[],
  base: Currency,
  usdKrwRate: number
): number | null {
  const price = prices.find((p) => p.holding_id === holding.id);
  if (!price) return null;
  const priceInBase = convertCurrency(price.price, price.currency, base, usdKrwRate);
  return totalQuantity(lots) * priceInBase;
}

export function pnl(cost: number, value: number | null): number | null {
  if (value == null) return null;
  return value - cost;
}

export function pnlPct(cost: number, value: number | null): number | null {
  if (value == null || cost === 0) return null;
  return (value - cost) / cost;
}

// ── Portfolio weight ──────────────────────────────────────────────────────────

export function portfolioWeight(
  holdingValue: number | null,
  totalValue: number
): number | null {
  if (holdingValue == null || totalValue === 0) return null;
  return holdingValue / totalValue;
}

// ── 10x progress ─────────────────────────────────────────────────────────────

export function tenxProgress(
  currentTotal: number,
  initialInvestment: number,
  targetMultiple: number
): number {
  const target = initialInvestment * targetMultiple;
  if (target === 0) return 0;
  return Math.min(currentTotal / target, 1);
}

// ── Thesis drift ──────────────────────────────────────────────────────────────

/** Returns true if thesis has not been reviewed within the threshold (days) */
export function isDrifted(lastReviewed: string | null, thresholdDays = 90): boolean {
  if (!lastReviewed) return true;
  const daysSince = (Date.now() - new Date(lastReviewed).getTime()) / 86_400_000;
  return daysSince > thresholdDays;
}
