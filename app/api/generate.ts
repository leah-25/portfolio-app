// Vercel Serverless Function — POST /api/generate
// Streams the Claude response as NDJSON to avoid function timeout on long generations.
// Client reads chunks and assembles the full text; same wire format as /api/analyze.

import Anthropic from '@anthropic-ai/sdk';

export const config = { maxDuration: 60 };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server is missing ANTHROPIC_API_KEY.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let prompt: string, systemPrompt: string;
  try {
    ({ prompt, systemPrompt } = (await req.json()) as {
      prompt: string;
      systemPrompt: string;
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    try {
      const client = new Anthropic({ apiKey, timeout: 50_000 });
      const stream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
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

      await writer.write(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
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
