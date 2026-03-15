import { fmpProvider }     from './fmp';
import { polygonProvider } from './polygon';
import type { MarketProvider, ProviderName, Quote } from './types';

export type { Quote, MarketProvider, ProviderName };

const PROVIDERS: Record<ProviderName, MarketProvider> = {
  fmp:     fmpProvider,
  polygon: polygonProvider,
};

/**
 * Fetch quotes for the given symbols using the specified provider.
 * Symbols use internal format (e.g. 'BTC', 'NVDA') — the provider handles
 * any API-level symbol mapping internally.
 */
export function fetchQuotes(
  symbols: string[],
  apiKey: string,
  provider: ProviderName = 'fmp',
): Promise<Quote[]> {
  return PROVIDERS[provider].fetchQuotes(symbols, apiKey);
}
