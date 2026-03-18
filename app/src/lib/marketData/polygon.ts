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

const FETCH_TIMEOUT_MS = 12_000;

async function fetchSymbolQuote(
  symbol: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<Quote | null> {
  const polygonTicker = toPolygon(symbol);
  const now  = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 10);  // go back 10 calendar days to cover weekends/holidays

  const url = `https://api.polygon.io/v2/aggs/ticker/${polygonTicker}/range/1/day/${isoDate(from)}/${isoDate(now)}?adjusted=true&sort=desc&limit=2&apiKey=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null; // timed out — skip symbol
    throw err;
  }

  if (res.status === 429) {
    throw new Error('Polygon rate limit reached. Lower your refresh interval in Settings or upgrade your Polygon plan.');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Invalid Polygon API key — check your key in Settings.');
  }
  if (!res.ok) {
    return null; // non-fatal per-symbol error — skip rather than failing entire batch
  }

  const data: PolygonAggResponse = await res.json() as PolygonAggResponse;

  if (data.status === 'ERROR' || data.error) {
    throw new Error(data.error ?? data.message ?? 'Unexpected error from Polygon.');
  }

  const bars = data.results ?? [];
  if (bars.length === 0) return null;

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
    if (symbols.length === 0) return [];

    // Fetch all symbols in parallel under a single shared timeout.
    // The old sequential + 300 ms sleep approach took O(n × delay) time;
    // parallel cuts that to a single round-trip for the whole portfolio.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const results = await Promise.all(
        symbols.map((s) => fetchSymbolQuote(s, apiKey, controller.signal)),
      );
      return results.filter((q): q is Quote => q !== null);
    } finally {
      clearTimeout(timer);
    }
  },
};
