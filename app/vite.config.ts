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
                thinking: { type: 'adaptive' },
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
