// Vercel Edge Function — POST /api/generate
// Non-streaming: takes { prompt, systemPrompt }, calls Claude, returns { text }

import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge', maxDuration: 60 };

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

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = msg.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    return new Response(JSON.stringify({ text: content.text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
