// Vercel Serverless Function — POST /api/analyze
// Streams NDJSON chunks back to the client as Claude generates the analysis.
// Serverless runtime gives 60s maxDuration (vs 30s hard cap for edge on Hobby plan).

import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from '../src/lib/analysis/promptBuilder.js';
import type { PromptHolding, PromptQuote } from '../src/lib/analysis/promptBuilder.js';

export const config = { maxDuration: 60 };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ANTHROPIC_API_KEY has no VITE_ prefix → never bundled into the browser JS.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('Server is missing ANTHROPIC_API_KEY.', { status: 503 });
  }

  let holdings: PromptHolding[], quotes: Record<string, PromptQuote>;
  try {
    ({ holdings, quotes } = (await req.json()) as {
      holdings: PromptHolding[];
      quotes: Record<string, PromptQuote>;
    });
  } catch {
    return new Response(
      'Invalid request body — expected JSON with holdings and quotes.',
      { status: 400 },
    );
  }

  // ── Stream NDJSON chunks back to the client ─────────────────────────────────
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    try {
      const client = new Anthropic({ apiKey });
      const stream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: buildPrompt(holdings, quotes) }],
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          await writer.write(
            encoder.encode(JSON.stringify({ type: 'chunk', text: event.delta.text }) + '\n'),
          );
        }
      }

      await stream.finalMessage();
      await writer.write(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      await writer.write(
        encoder.encode(JSON.stringify({ type: 'error', message }) + '\n'),
      );
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
