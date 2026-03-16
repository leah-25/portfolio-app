import type { MarketProvider, Quote } from './types';

// Polygon uses X:BTCUSD format for crypto
const TO_POLYGON: Record<string, string> = {
  BTC: 'X:BTCUSD',
  ETH: 'X:ETHUSD',
};

const FROM_POLYGON: Record<string, string> = Object.fromEntries(
  Object.entries(TO_POLYGON).map(([k, v]) => [v, k])
);

function toPolygon(symbol: string): string   { return TO_POLYGON[symbol]   ?? symbol; }
function fromPolygon(symbol: string): string { return FROM_POLYGON[symbol] ?? symbol; }

// Polygon aggregates bar (free-tier compatible)
interface PolygonBar {
  T?: string;  // ticker (present in grouped results)
  o:  number;  // open
  h:  number;  // high
  l:  number;  // low
  c:  number;  // close
  v:  number;  // volume
  t:  number;  // timestamp ms
}

interface PolygonAggResponse {
  ticker?:       string;
  status:        string;
  resultsCount?: number;
  results?:      PolygonBar[];
  error?:        string;
  message?:      string;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchSymbolQuote(symbol: string, apiKey: string, attempt = 0): Promise<Quote | null> {
  const polygonTicker = toPolygon(symbol);
  const now  = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 10);  // go back 10 calendar days to cover weekends/holidays

  // Use sort=desc&limit=2 to get the 2 most recent trading-day bars.
  // Do NOT encodeURIComponent the ticker — Polygon expects the literal colon in X:BTCUSD.
  const url = `https://api.polygon.io/v2/aggs/ticker/${polygonTicker}/range/1/day/${isoDate(from)}/${isoDate(now)}?adjusted=true&sort=desc&limit=2&apiKey=${apiKey}`;

  const res = await fetch(url);

  if (res.status === 429) {
    // Rate limited — retry once after a 15 s back-off
    if (attempt < 1) {
      await sleep(15_000);
      return fetchSymbolQuote(symbol, apiKey, attempt + 1);
    }
    throw new Error('Polygon rate limit reached. Lower your refresh interval in Settings or upgrade your Polygon plan.');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Invalid Polygon API key — check your key in Settings.');
  }
  if (!res.ok) {
    throw new Error(`Polygon request failed (HTTP ${res.status}).`);
  }

  const data: PolygonAggResponse = await res.json() as PolygonAggResponse;

  if (data.status === 'ERROR' || data.error) {
    throw new Error(data.error ?? data.message ?? 'Unexpected error from Polygon.');
  }

  const bars = data.results ?? [];
  if (bars.length === 0) return null;

  // sort=desc: bars[0] = most recent day, bars[1] = previous day
  const latest   = bars[0];
  const previous = bars.length >= 2 ? bars[1] : null;

  const price      = latest.c;
  const prevClose  = previous?.c ?? 0;
  const change     = prevClose > 0 ? price - prevClose : 0;
  const changePct  = prevClose > 0 ? (change / prevClose) * 100 : 0;

  return {
    symbol:        fromPolygon(polygonTicker),
    price,
    change,
    changePercent: changePct,
    marketCap:     0,
    dayHigh:       latest.h,
    dayLow:        latest.l,
    volume:        latest.v,
    previousClose: prevClose,
    updatedAt:     Date.now(),
  };
}

export const polygonProvider: MarketProvider = {
  async fetchQuotes(symbols, apiKey) {
    const results: (Quote | null)[] = [];
    for (let i = 0; i < symbols.length; i++) {
      results.push(await fetchSymbolQuote(symbols[i], apiKey));
      // 300 ms between calls to stay within Polygon free-tier rate limits
      if (i < symbols.length - 1) await sleep(300);
    }
    return results.filter((q): q is Quote => q !== null);
  },
};
