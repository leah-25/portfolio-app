// Vercel Serverless Function — POST /api/analyze
// Streams NDJSON chunks back to the client as Claude generates the analysis.

import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from '../src/lib/analysis/promptBuilder.js';
import type { PromptHolding, PromptQuote } from '../src/lib/analysis/promptBuilder.js';

export const config = { maxDuration: 60 };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

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

  const encoder = new TextEncoder();

  // Use ReadableStream with start() so the async work runs inside the stream's
  // own lifecycle — not as a detached IIFE that serverless runtimes may freeze.
  const body = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic({ apiKey, timeout: 50_000 });
        const stream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          messages: [{ role: 'user', content: buildPrompt(holdings, quotes) }],
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: 'chunk', text: event.delta.text }) + '\n'),
            );
          }
        }

        controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed';
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'error', message }) + '\n'),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
