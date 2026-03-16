export const CONVICTION_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Medium',
  4: 'High',
  5: 'Very High',
};

interface ConvictionPipsProps {
  value: number | null;
  /** 'sm' = tighter pips for dense contexts, 'md' = default */
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export default function ConvictionPips({ value, size = 'md', showLabel = false }: ConvictionPipsProps) {
  if (value == null) return <span className="text-text-muted text-xs">—</span>;

  const w = size === 'sm' ? 'w-1.5' : 'w-2';
  const h = size === 'sm' ? 'h-2.5' : 'h-3.5';

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`${w} ${h} rounded-sm ${i < value ? 'bg-accent' : 'bg-surface-border'}`}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs text-text-muted">{CONVICTION_LABELS[value]}</span>
      )}
    </div>
  );
}
