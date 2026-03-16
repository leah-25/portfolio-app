// Renders the subset of markdown Claude produces:
// headings, bold, bullets (plain + numbered), blockquotes, dividers, inline badges.

import Badge from './Badge';
import type React from 'react';

// ── Section colour by heading keyword ─────────────────────────────────────────
type SectionTheme = { border: string; text: string };

function sectionTheme(title: string): SectionTheme {
  const t = title.toLowerCase();
  if (t.includes('risk') || t.includes('snapshot'))
    return { border: 'border-loss-border', text: 'text-loss-text' };
  if (t.includes('drift') || t.includes('thesis'))
    return { border: 'border-warn-border', text: 'text-warn-text' };
  if (t.includes('opportunit') || t.includes('action'))
    return { border: 'border-gain-border', text: 'text-gain-text' };
  // Overall / Concentration / default
  return { border: 'border-accent-border', text: 'text-accent' };
}

// ── Inline content: **bold**, [RISK], [DRIFT], [OPP], [ACTION] ────────────────
function renderInline(raw: string): React.ReactNode[] {
  const parts = raw.split(/(\*\*[^*]+\*\*|\[RISK\]|\[DRIFT\]|\[OPP\]|\[ACTION\])/g);
  return parts.map((p, idx) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={idx} className="font-semibold text-text-primary">{p.slice(2, -2)}</strong>;
    if (p === '[RISK]')
      return <Badge key={idx} variant="loss" size="sm" className="mx-0.5 align-middle">Risk</Badge>;
    if (p === '[DRIFT]')
      return <Badge key={idx} variant="warn" size="sm" className="mx-0.5 align-middle">Drift</Badge>;
    if (p === '[OPP]')
      return <Badge key={idx} variant="gain" size="sm" className="mx-0.5 align-middle">Opp</Badge>;
    if (p === '[ACTION]')
      return <Badge key={idx} variant="accent" size="sm" className="mx-0.5 align-middle">Action</Badge>;
    return <span key={idx}>{p}</span>;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Horizontal rule ──────────────────────────────────────────────────────
    if (line === '---' || line === '***' || line === '___') {
      elements.push(<hr key={i} className="my-5 border-surface-border" />);

    // ── H2 — coloured left-border section header ─────────────────────────────
    } else if (line.startsWith('## ')) {
      const title = line.slice(3);
      const { border, text: textColor } = sectionTheme(title);
      elements.push(
        <div key={i} className={`mt-6 mb-3 pl-3 border-l-2 ${border}`}>
          <h2 className={`text-2xs font-semibold uppercase tracking-widest ${textColor}`}>
            {title}
          </h2>
        </div>
      );

    // ── H3 ───────────────────────────────────────────────────────────────────
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="mt-4 mb-1.5 text-sm font-semibold text-text-primary">
          {line.slice(4)}
        </h3>
      );

    // ── Blockquote — highlighted action item ─────────────────────────────────
    } else if (line.startsWith('> ')) {
      elements.push(
        <div
          key={i}
          className="flex gap-2.5 my-2 pl-3 pr-3 py-2 border-l-2 border-accent-border rounded-r-md bg-accent-subtle/30"
        >
          <p className="text-sm text-text-primary leading-relaxed">
            {renderInline(line.slice(2))}
          </p>
        </div>
      );

    // ── Numbered list item ────────────────────────────────────────────────────
    } else if (/^[1-9]\d*\./.test(line)) {
      const numMatch = line.match(/^([1-9]\d*)\.\s*/);
      const num = numMatch ? numMatch[1] : '·';
      const content = line.replace(/^[1-9]\d*\.\s*/, '');
      elements.push(
        <div key={i} className="flex items-start gap-2.5 my-1.5">
          <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent-subtle border border-accent-border/40 text-accent text-2xs font-semibold mt-0.5">
            {num}
          </span>
          <p className="text-sm text-text-secondary leading-relaxed flex-1">
            {renderInline(content)}
          </p>
        </div>
      );

    // ── Bullet list item ──────────────────────────────────────────────────────
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      const content = line.replace(/^[-•]\s*/, '');
      elements.push(
        <div key={i} className="flex items-start gap-2.5 my-1">
          <span className="flex-shrink-0 w-1 h-1 rounded-full bg-text-muted mt-[7px]" />
          <p className="text-sm text-text-secondary leading-relaxed flex-1">
            {renderInline(content)}
          </p>
        </div>
      );

    // ── Blank line ────────────────────────────────────────────────────────────
    } else if (line.trim() === '') {
      // handled by margins

    // ── Paragraph ─────────────────────────────────────────────────────────────
    } else {
      elements.push(
        <p key={i} className="text-sm text-text-secondary leading-relaxed my-1.5">
          {renderInline(line)}
        </p>
      );
    }

    i++;
  }

  return <div>{elements}</div>;
}
