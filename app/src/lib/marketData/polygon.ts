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

// Polygon snapshot response shapes
interface PolygonDay {
  c:  number;  // close
  h:  number;  // high
  l:  number;  // low
  v:  number;  // volume
  vw: number;  // VWAP
}

interface PolygonPrevDay {
  c: number;
}

interface PolygonTicker {
  ticker:    string;
  day:       PolygonDay;
  prevDay:   PolygonPrevDay;
  lastQuote: { P: number };  // ask price (used as current price for crypto)
  lastTrade: { p: number };  // last trade price (stocks)
  min:       { c: number };  // most recent minute close
}

interface PolygonSnapshotResponse {
  tickers?: PolygonTicker[];
  status:   string;
  error?:   string;
}

export const polygonProvider: MarketProvider = {
  async fetchQuotes(symbols, apiKey) {
    const polygonSymbols = symbols.map(toPolygon);

    // Separate stocks and crypto — they use different snapshot endpoints
    const stockSymbols  = polygonSymbols.filter(s => !s.startsWith('X:'));
    const cryptoSymbols = polygonSymbols.filter(s =>  s.startsWith('X:'));

    const results: Quote[] = [];
    const now = Date.now();

    async function fetchSnapshot(tickerList: string[], locale: 'stocks' | 'crypto'): Promise<void> {
      if (tickerList.length === 0) return;

      const joined = tickerList.join(',');
      const url = locale === 'stocks'
        ? `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${joined}&apiKey=${apiKey}`
        : `https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers?tickers=${joined}&apiKey=${apiKey}`;

      const res = await fetch(url);

      if (res.status === 401 || res.status === 403) {
        throw new Error('Invalid API key — check your Polygon key in Settings.');
      }
      if (!res.ok) {
        throw new Error(`Market data request failed (HTTP ${res.status}).`);
      }

      const data: PolygonSnapshotResponse = await res.json() as PolygonSnapshotResponse;

      if (data.status === 'ERROR' || data.error) {
        throw new Error(data.error ?? 'Unexpected error from Polygon.');
      }

      for (const t of data.tickers ?? []) {
        const close    = t.min?.c ?? t.lastTrade?.p ?? t.lastQuote?.P ?? t.day?.c ?? 0;
        const prevClose = t.prevDay?.c ?? 0;
        const change    = prevClose > 0 ? close - prevClose : 0;
        const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

        results.push({
          symbol:        fromPolygon(t.ticker),
          price:         close,
          change,
          changePercent: changePct,
          marketCap:     0,   // not in snapshot endpoint; would need details call
          dayHigh:       t.day?.h    ?? 0,
          dayLow:        t.day?.l    ?? 0,
          volume:        t.day?.v    ?? 0,
          previousClose: prevClose,
          updatedAt:     now,
        });
      }
    }

    await Promise.all([
      fetchSnapshot(stockSymbols,  'stocks'),
      fetchSnapshot(cryptoSymbols, 'crypto'),
    ]);

    return results;
  },
};
