import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt, type PromptHolding, type PromptQuote } from './src/lib/analysis/promptBuilder';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'anthropic-proxy',
      configureServer(server) {
        // ── /api/generate (non-streaming, used by stock detail) ───────────────
        server.middlewares.use(
          '/api/generate',
          async (req: IncomingMessage, res: ServerResponse) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method Not Allowed');
              return;
            }

            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart the dev server.' }));
              return;
            }

            let raw = '';
            for await (const chunk of req) raw += chunk;

            let prompt: string, systemPrompt: string;
            try {
              ({ prompt, systemPrompt } = JSON.parse(raw) as { prompt: string; systemPrompt: string });
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid request body.' }));
              return;
            }

            try {
              const client = new Anthropic({ apiKey });
              const msg = await client.messages.create({
                model: 'claude-opus-4-6',
                max_tokens: 2048,
                system: systemPrompt,
                messages: [{ role: 'user', content: prompt }],
              });

              const content = msg.content[0];
              if (content.type !== 'text') throw new Error('Unexpected response type');

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ text: content.text }));
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Generation failed';
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: message }));
            }
          },
        );

        // ── /api/analyze (streaming, used by portfolio analysis) ─────────────
        server.middlewares.use(
          '/api/analyze',
          async (req: IncomingMessage, res: ServerResponse) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method Not Allowed');
              return;
            }

            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
              res.statusCode = 503;
              res.end('Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart the dev server.');
              return;
            }

            // Read and parse request body
            let raw = '';
            for await (const chunk of req) raw += chunk;

            let holdings: PromptHolding[], quotes: Record<string, PromptQuote>;
            try {
              ({ holdings, quotes } = JSON.parse(raw) as { holdings: PromptHolding[]; quotes: Record<string, PromptQuote> });
            } catch {
              res.statusCode = 400;
              res.end('Invalid request body — expected JSON with holdings and quotes.');
              return;
            }

            res.setHeader('Content-Type', 'application/x-ndjson');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('X-Accel-Buffering', 'no');

            try {
              const client = new Anthropic({ apiKey });
              const stream = client.messages.stream({
                model: 'claude-opus-4-6',
                max_tokens: 2048,
                messages: [{ role: 'user', content: buildPrompt(holdings, quotes) }],
              });

              for await (const event of stream) {
                if (
                  event.type === 'content_block_delta' &&
                  event.delta.type === 'text_delta'
                ) {
                  res.write(JSON.stringify({ type: 'chunk', text: event.delta.text }) + '\n');
                }
              }

              await stream.finalMessage();
              res.write(JSON.stringify({ type: 'done' }) + '\n');
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Analysis failed';
              res.write(JSON.stringify({ type: 'error', message }) + '\n');
            }

            res.end();
          },
        );
      },
    },
  ],
});
