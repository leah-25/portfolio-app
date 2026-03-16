// ── Badge — status/state indicator ──────────────────────────────────────────
// Use for: P&L sign, risk status, asset type, conviction level
// Not for: content labels/filters (use Tag for that)

export type BadgeVariant = 'default' | 'gain' | 'loss' | 'warn' | 'accent' | 'muted';
type BadgeSize    = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Show a status dot before the label */
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-surface-overlay text-text-secondary border border-surface-border',
  gain:    'bg-gain-subtle    text-gain-text  border border-gain-border/30',
  loss:    'bg-loss-subtle    text-loss-text  border border-loss-border/30',
  warn:    'bg-warn-subtle    text-warn-text  border border-warn-border/30',
  accent:  'bg-accent-subtle  text-accent     border border-accent-border/30',
  muted:   'bg-surface-overlay text-text-muted',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-text-muted',
  gain:    'bg-gain',
  loss:    'bg-loss',
  warn:    'bg-warn',
  accent:  'bg-accent',
  muted:   'bg-text-muted',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-2xs gap-1',
  md: 'px-2   py-0.5 text-xs   gap-1.5',
};

export default function Badge({
  variant = 'default',
  size = 'sm',
  dot = false,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
    >
      {dot && (
        <span className={['h-1.5 w-1.5 rounded-full flex-shrink-0', DOT_CLASSES[variant]].join(' ')} />
      )}
      {children}
    </span>
  );
}
