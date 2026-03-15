/** KPI / stat display block — used heavily on Dashboard */

interface StatProps {
  label: string;
  value: string;
  sub?: string;
  /** If true, styles value in gain green */
  positive?: boolean;
  /** If true, styles value in loss red */
  negative?: boolean;
  /** Small indicator dot color */
  indicator?: 'gain' | 'loss' | 'warn' | 'neutral';
}

export default function Stat({ label, value, sub, positive, negative, indicator }: StatProps) {
  const valueColor = positive
    ? 'text-gain-text'
    : negative
    ? 'text-loss-text'
    : 'text-text-primary';

  const indicatorColor: Record<string, string> = {
    gain:    'bg-gain',
    loss:    'bg-loss',
    warn:    'bg-warn',
    neutral: 'bg-surface-muted',
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {indicator && (
          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${indicatorColor[indicator]}`} />
        )}
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span className={`text-2xl font-semibold tabular ${valueColor}`}>{value}</span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  );
}
