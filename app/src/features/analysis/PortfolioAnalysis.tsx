import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, RefreshCw, AlertCircle, Settings2, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { useAIStore } from '../../store/aiStore';
import { useMarketStore } from '../../store/marketStore';
import { analyzePortfolio } from '../../lib/analysis/portfolioAnalysis';
import type { HoldingRecord } from '../holdings/types';

// ── Simple markdown renderer ───────────────────────────────────────────────────
// Renders the subset of markdown Claude produces: headings, bold, bullets, paragraphs.

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  function renderInline(raw: string) {
    // Bold: **text**
    const parts = raw.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, idx) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={idx} className="font-semibold text-text-primary">{p.slice(2, -2)}</strong>
        : <span key={idx}>{p}</span>
    );
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="mt-5 mb-2 text-sm font-semibold text-text-primary tracking-wide uppercase">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="mt-4 mb-1 text-sm font-medium text-text-primary">
          {line.slice(4)}
        </h3>
      );
    } else if (/^[1-9]\d*\./.test(line) || line.startsWith('- ') || line.startsWith('• ')) {
      // List item
      const content = line.replace(/^[1-9]\d*\.\s*/, '').replace(/^[-•]\s*/, '');
      elements.push(
        <li key={i} className="ml-4 text-sm text-text-secondary leading-relaxed list-disc">
          {renderInline(content)}
        </li>
      );
    } else if (line.trim() === '') {
      // blank line — skip (spacing handled by margins)
    } else {
      elements.push(
        <p key={i} className="text-sm text-text-secondary leading-relaxed mb-2">
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface PortfolioAnalysisProps {
  open: boolean;
  onClose: () => void;
  holdings: HoldingRecord[];
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PortfolioAnalysis({ open, onClose, holdings }: PortfolioAnalysisProps) {
  const { anthropicKey } = useAIStore();
  const { quotes } = useMarketStore();

  const [status, setStatus] = useState<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const bodyRef  = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (status === 'streaming' && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [text, status]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Stop any in-flight request when closed
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  const run = useCallback(async () => {
    if (!anthropicKey) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setText('');
    setError('');
    setStatus('loading');

    try {
      let firstChunk = true;
      await analyzePortfolio({
        apiKey: anthropicKey,
        holdings,
        quotes,
        signal: ctrl.signal,
        onChunk: (chunk) => {
          if (firstChunk) { setStatus('streaming'); firstChunk = false; }
          setText(prev => prev + chunk);
        },
      });
      setStatus('done');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setStatus('error');
    }
  }, [anthropicKey, holdings, quotes]);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  const isRunning = status === 'loading' || status === 'streaming';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-surface-overlay border-l border-surface-border shadow-2xl animate-slide-in-right">

        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-surface-border px-5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">AI Portfolio Analysis</h2>
            {isRunning && (
              <span className="ml-1 inline-flex items-center gap-1.5 text-xs text-text-muted">
                <RefreshCw size={11} className="animate-spin" />
                Analyzing…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status === 'done' && text && (
              <button
                onClick={handleCopy}
                title="Copy to clipboard"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
              >
                {copied ? <Check size={12} className="text-gain-text" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
            {(status === 'done' || status === 'error') && (
              <button
                onClick={run}
                title="Re-run analysis"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            )}
            {isRunning && (
              <button
                onClick={() => { abortRef.current?.abort(); setStatus('idle'); }}
                className="px-2.5 py-1 rounded-md text-xs text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
              >
                Stop
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-raised hover:text-text-primary transition-colors"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-5">

          {/* No API key state */}
          {!anthropicKey && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle">
                <Sparkles size={22} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary mb-1">Anthropic API key required</p>
                <p className="text-xs text-text-muted max-w-xs">
                  Add your Anthropic API key in Settings to enable AI-powered portfolio analysis.
                </p>
              </div>
              <Link to="/settings" onClick={onClose}>
                <Button variant="secondary" size="sm">
                  <Settings2 size={13} className="mr-1.5" />
                  Open Settings
                </Button>
              </Link>
            </div>
          )}

          {/* Error state */}
          {anthropicKey && status === 'error' && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-loss-subtle border border-loss-border text-sm mb-4">
              <AlertCircle size={15} className="text-loss-text mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-loss-text mb-0.5">Analysis failed</p>
                <p className="text-text-secondary text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Idle state (key set, not yet run) */}
          {anthropicKey && status === 'idle' && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <Sparkles size={28} className="text-accent opacity-60" />
              <div>
                <p className="text-sm font-medium text-text-primary mb-1">Ready to analyze</p>
                <p className="text-xs text-text-muted">Click below to generate portfolio insights.</p>
              </div>
              <Button variant="primary" size="sm" onClick={run}>
                Run Analysis
              </Button>
            </div>
          )}

          {/* Loading skeleton */}
          {status === 'loading' && (
            <div className="space-y-3 animate-pulse">
              {[80, 60, 95, 70, 85, 55, 75].map((w, i) => (
                <div key={i} className="h-3 rounded-full bg-surface-border" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {/* Streamed / done content */}
          {(status === 'streaming' || status === 'done') && text && (
            <div className="pb-4">
              <MarkdownBlock text={text} />
              {status === 'streaming' && (
                <span className="inline-block w-2 h-4 bg-accent/70 ml-0.5 animate-pulse rounded-sm" />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {anthropicKey && (status === 'done' || status === 'streaming') && (
          <div className="border-t border-surface-border px-5 py-3 flex-shrink-0">
            <p className="text-xs text-text-muted">
              Powered by <strong className="text-text-secondary">Claude Opus 4.6</strong> · {holdings.length} holdings analyzed
              {Object.keys(quotes).length > 0 && ` · ${Object.keys(quotes).length} live prices`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
