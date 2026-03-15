// Renders the subset of markdown Claude produces: headings, bold, bullets, paragraphs.

export default function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  function renderInline(raw: string) {
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
      const content = line.replace(/^[1-9]\d*\.\s*/, '').replace(/^[-•]\s*/, '');
      elements.push(
        <li key={i} className="ml-4 text-sm text-text-secondary leading-relaxed list-disc">
          {renderInline(content)}
        </li>
      );
    } else if (line.trim() === '') {
      // skip blank lines — spacing handled by margins
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
