import type { MarketProvider, Quote } from './types';

// FMP uses different symbols for crypto
const TO_FMP: Record<string, string> = {
  BTC: 'BTCUSD',
  ETH: 'ETHUSD',
};

const FROM_FMP: Record<string, string> = Object.fromEntries(
  Object.entries(TO_FMP).map(([k, v]) => [v, k])
);

function toFmp(symbol: string): string   { return TO_FMP[symbol]   ?? symbol; }
function fromFmp(symbol: string): string { return FROM_FMP[symbol] ?? symbol; }

const FETCH_TIMEOUT_MS = 12_000;

interface FmpQuote {
  symbol: string;
  price: number;
  change: number;
  changesPercentage: number;
  dayLow: number;
  dayHigh: number;
  volume: number;
  marketCap: number;
  previousClose: number;
  timestamp: number;
}

export const fmpProvider: MarketProvider = {
  async fetchQuotes(symbols, apiKey) {
    if (symbols.length === 0) return [];

    const fmpSymbols = symbols.map(toFmp).join(',');
    const url = `https://financialmodelingprep.com/api/v3/quote/${fmpSymbols}?apikey=${apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error('Market data request timed out — FMP did not respond in time.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid API key — check your FMP key in Settings.');
    }
    if (!res.ok) {
      throw new Error(`Market data request failed (HTTP ${res.status}).`);
    }

    const data: unknown = await res.json();

    // FMP returns an object with an error message when the key is wrong
    if (!Array.isArray(data)) {
      const msg = (data as Record<string, string>)?.['Error Message'] ?? 'Unexpected response from FMP.';
      throw new Error(msg);
    }

    const now = Date.now();
    return (data as FmpQuote[])
      .filter((q) => q.price != null && q.price > 0)
      .map((q): Quote => ({
        symbol:        fromFmp(q.symbol),
        price:         q.price          ?? 0,
        change:        q.change         ?? 0,
        changePercent: q.changesPercentage ?? 0,
        marketCap:     q.marketCap      ?? 0,
        dayHigh:       q.dayHigh        ?? 0,
        dayLow:        q.dayLow         ?? 0,
        volume:        q.volume         ?? 0,
        previousClose: q.previousClose  ?? 0,
        updatedAt:     q.timestamp ? q.timestamp * 1000 : now,
      }));
  },
};
