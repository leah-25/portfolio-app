/** KPI / stat display block — used on Dashboard and summary cards */

interface StatProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
  indicator?: 'gain' | 'loss' | 'warn' | 'neutral';
}

export function Stat({ label, value, sub, positive, negative, indicator }: StatProps) {
  const valueColor = positive
    ? 'text-gain-text'
    : negative
    ? 'text-loss-text'
    : 'text-text-primary';

  const dotColor: Record<string, string> = {
    gain:    'bg-gain',
    loss:    'bg-loss',
    warn:    'bg-warn',
    neutral: 'bg-surface-muted',
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {indicator && (
          <span className={['h-1.5 w-1.5 rounded-full flex-shrink-0', dotColor[indicator]].join(' ')} />
        )}
        <span className="text-2xs font-semibold uppercase tracking-widest text-text-muted">
          {label}
        </span>
      </div>
      <span className={['text-xl font-semibold num leading-tight', valueColor].join(' ')}>
        {value}
      </span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  );
}

export default Stat;
