import Anthropic from '@anthropic-ai/sdk';
import type { HoldingRecord } from '../../features/holdings/types';
import type { Quote } from '../marketData';
import { buildPrompt } from './promptBuilder';

export { buildPrompt };

export interface AnalysisOptions {
  apiKey?: string;          // required when VITE_USE_SERVER_KEY is false/unset
  holdings: HoldingRecord[];
  quotes: Record<string, Quote>;
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

// ── Cache key ─────────────────────────────────────────────────────────────────
// Derived only from portfolio structure (not live prices) so the cache
// survives minor price ticks but invalidates on any real portfolio change.
export function buildCacheKey(holdings: HoldingRecord[]): string {
  return holdings
    .slice()
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .map(h =>
      [h.symbol, h.quantity, h.costBasis, h.thesisDrift ? 1 : 0,
       h.riskLevel, h.conviction ?? 0, h.lots.length,
       (h.thesisBody ?? '').slice(0, 80)].join(':')
    )
    .join('|');
}

// ── Proxy transport (server holds the API key) ────────────────────────────────
async function analyzeViaProxy(opts: AnalysisOptions): Promise<void> {
  const { holdings, quotes, onChunk, signal } = opts;

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings, quotes }),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = 'Proxy request failed';
    try {
      const body = await res.text();
      // Server may return plain text or JSON — handle both
      const parsed = JSON.parse(body) as Record<string, unknown>;
      msg = String(parsed.error ?? parsed.message ?? body);
    } catch {
      // body was plain text; already captured above if res.text() succeeded
    }
    throw new Error(msg);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as { type: string; text?: string; message?: string };
        if (event.type === 'chunk' && event.text) onChunk(event.text);
        if (event.type === 'error') throw new Error(event.message ?? 'Server error');
      } catch (e) {
        if (e instanceof SyntaxError) continue; // malformed line, skip
        throw e;
      }
    }
  }
}

// ── Direct transport (user-supplied key, browser-side SDK) ────────────────────
async function analyzeDirectly(opts: AnalysisOptions): Promise<void> {
  const { apiKey, holdings, quotes, onChunk, signal } = opts;

  if (!apiKey) throw new Error('Anthropic API key is required.');

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const stream = client.messages.stream(
    {
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildPrompt(holdings, quotes) }],
    },
    { signal },
  );

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      onChunk(event.delta.text);
    }
  }

  await stream.finalMessage();
}

// ── Public API ────────────────────────────────────────────────────────────────
// Uses the server-side proxy (/api/analyze) by default.
// Falls back to the direct browser SDK path only when a user-supplied apiKey
// is explicitly provided (e.g. local dev without a server key).
export async function analyzePortfolio(opts: AnalysisOptions): Promise<void> {
  if (opts.apiKey) {
    return analyzeDirectly(opts);
  }
  return analyzeViaProxy(opts);
}
