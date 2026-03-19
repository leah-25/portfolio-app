// Vercel Serverless Function — POST /api/analyze
// Synchronous: awaits the full Claude response then returns it as NDJSON.
// Streaming async patterns (TransformStream IIFE, ReadableStream start()) are
// frozen by Lambda-based serverless after the handler returns — don't use them.

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

  try {
    const client = new Anthropic({ apiKey, timeout: 50_000 });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildPrompt(holdings, quotes) }],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const body =
      JSON.stringify({ type: 'chunk', text }) + '\n' +
      JSON.stringify({ type: 'done' }) + '\n';

    return new Response(body, {
      headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return new Response(
      JSON.stringify({ type: 'error', message }) + '\n',
      { status: 500, headers: { 'Content-Type': 'application/x-ndjson' } },
    );
  }
}
