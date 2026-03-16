// Fetches recent news headlines from Polygon.io for use as AI prompt context.
// Only used when the user has configured Polygon as their market data provider.

export interface PolygonNewsItem {
  title: string;
  published: string;   // ISO date string
  description: string;
}

interface PolygonNewsResponse {
  results?: {
    title?: string;
    published_utc?: string;
    description?: string;
  }[];
  status?: string;
  error?: string;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Fetch up to `limit` recent news articles for a single symbol. */
export async function fetchSymbolNews(
  symbol: string,
  apiKey: string,
  limit = 5,
): Promise<PolygonNewsItem[]> {
  const url =
    `https://api.polygon.io/v2/reference/news` +
    `?ticker=${encodeURIComponent(symbol)}&limit=${limit}&order=desc&sort=published_utc&apiKey=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return []; // network error — degrade gracefully
  }

  if (!res.ok) return []; // bad key or unknown ticker — degrade gracefully

  let data: PolygonNewsResponse;
  try {
    data = (await res.json()) as PolygonNewsResponse;
  } catch {
    return [];
  }

  return (data.results ?? []).map((r) => ({
    title:       r.title       ?? '',
    published:   r.published_utc ? r.published_utc.slice(0, 10) : '',
    description: r.description ?? '',
  })).filter((r) => r.title);
}

/**
 * Fetch news for multiple symbols sequentially (300 ms gap to respect
 * Polygon free-tier rate limits). Silently skips any symbol that errors.
 *
 * Returns a map of { symbol → headline strings ready to embed in a prompt }.
 */
export async function fetchNewsContext(
  symbols: string[],
  apiKey: string,
): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const items = await fetchSymbolNews(sym, apiKey);
    if (items.length > 0) {
      result[sym] = items.map(
        (n) => `[${n.published}] ${n.title}${n.description ? ` — ${n.description.slice(0, 120)}` : ''}`,
      );
    }
    if (i < symbols.length - 1) await sleep(300);
  }

  return result;
}

/** Format a news context map as a prompt-ready string block. */
export function formatNewsContext(news: Record<string, string[]>): string {
  const symbols = Object.keys(news).filter((s) => news[s].length > 0);
  if (symbols.length === 0) return '';

  const lines: string[] = ['## Recent News Context (last 5 articles per holding)'];
  for (const sym of symbols) {
    lines.push(`\n${sym}:`);
    news[sym].forEach((h) => lines.push(`  • ${h}`));
  }
  return lines.join('\n');
}
